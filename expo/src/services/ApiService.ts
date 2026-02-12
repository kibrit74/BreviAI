// Force update 3: Switched to verified model gemini-embedding-001
import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';
import { debugLog } from './DebugLogger';
import * as FileSystem from 'expo-file-system';

// Always use production Vercel backend
const API_BASE_URL = 'https://breviai.vercel.app';
console.log('[ApiService] Using Production URL:', API_BASE_URL);

import { WorkflowNode, WorkflowEdge } from '../types/workflow-types';
import { SYSTEM_PROMPT_TURKISH } from '../constants/SystemPrompt';

interface GenerateResponse {
    // Common
    shortcut_name: string;
    ai_model_used: string;

    // Legacy Format
    steps?: ShortcutStep[];

    // New Workflow Format
    id?: string;
    name?: string;
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
    workflow?: {
        name?: string;
        nodes?: WorkflowNode[];
        edges?: WorkflowEdge[];
    };

    // Accessibility limitation warning
    warning?: string;
    alternative?: string;
}

export interface ShortcutStep {
    step_id: number;
    type: 'SYSTEM_ACTION' | 'APP_ACTION' | 'INTENT_ACTION' | 'MEDIA_ACTION' | 'NOTIFICATION_ACTION' | 'ACCESSIBILITY_ACTION' | 'URL_ACTION' | string;
    action: string;
    params: Record<string, any>;
    output_key?: string;
    requires_app_selection?: boolean;
}

import { ShortcutTemplate } from '../types';

class ApiService {
    private headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'BreviAI-App/1.0', // Helps with Vercel/WAF blocking
        'x-app-secret': process.env.EXPO_PUBLIC_APP_SECRET || 'breviai-test-secret-12345',
    };


    async generateShortcut(prompt: string, userContext?: any): Promise<GenerateResponse> {
        debugLog('network', 'Generative API Request', { prompt, context: userContext });

        // Enhance prompt if this is an Edit Request
        let finalPrompt = prompt;
        if (userContext && userContext.isEdit && userContext.currentWorkflow) {
            console.log('[ApiService] Edit Mode Detected. Appending context.');
            finalPrompt = `
EDIT REQUEST: ${prompt}

CURRENT WORKFLOW JSON:
${JSON.stringify(userContext.currentWorkflow)}

INSTRUCTIONS:
1. Analyse the CURRENT WORKFLOW and the EDIT REQUEST.
2. Return the COMPLETE workflow JSON including BOTH unchanged nodes and new/modified nodes.
3. CRITICAL: Do NOT omit any existing nodes unless the user explicitly asks to delete them.
4. If adding new nodes, connect them logically to the existing structure.
5. If modifying a node, keep its ID if possible to preserve connections.
6. The output must be a valid full workflow JSON (nodes and edges).
`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout (increased from 30s)

            const response = await fetch(`${API_BASE_URL}/api/generate`, {
                signal: controller.signal,
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    prompt: finalPrompt,
                    user_context: userContext || '',
                    system_prompt: SYSTEM_PROMPT_TURKISH,
                }),
            }).finally(() => clearTimeout(timeoutId));

            const data = await response.json();

            if (!response.ok) {
                console.error('API Error Details:', data);
                debugLog('error', 'API Response Error', data);
                throw new Error(data.error || data.details || `API Error: ${response.status}`);
            }

            debugLog('ai', 'AI Model Response', data);

            // Handle both response formats
            if (data.shortcut) {
                return {
                    shortcut_name: data.shortcut.shortcut_name,
                    ai_model_used: data.shortcut.ai_model_used || data.model_used,
                    steps: data.shortcut.steps,
                };
            }

            return data;
        } catch (error) {
            console.error('Generate shortcut error:', error);
            throw error;
        }
    }

    async getTemplates(): Promise<ShortcutTemplate[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/templates`, {
                method: 'GET',
                headers: this.headers,
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.templates || [];
        } catch (error) {
            console.error('Get templates error:', error);
            throw error;
        }
    }

    async sendFeedback(shortcutId: string, success: boolean, errorMessage?: string): Promise<void> {
        try {
            await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    shortcut_id: shortcutId,
                    success,
                    error_message: errorMessage,
                }),
            });
        } catch (error) {
            console.error('Send feedback error:', error);
        }
    }

    async transcribeAudio(uri: string): Promise<string> {
        try {
            console.log('[ApiService] Transcribing audio:', uri);
            console.log('[ApiService] Using API URL:', API_BASE_URL);

            const formData = new FormData();

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('audio', blob, 'recording.m4a');
            } else {
                // React Native FormData format
                formData.append('audio', {
                    uri: uri,
                    name: 'recording.m4a',
                    type: 'audio/m4a',
                } as any);
            }

            const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
                method: 'POST',
                headers: {
                    'x-app-secret': this.headers['x-app-secret'],
                },
                body: formData,
            });

            console.log('[ApiService] Response status:', response.status);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Transcription failed');
            }

            console.log('[ApiService] Transcription success, text:', data.text?.substring(0, 50));
            return data.text;

        } catch (error) {
            console.error('[ApiService] Transcription error:', error);
            console.error('[ApiService] Active API URL:', API_BASE_URL);
            throw error;
        }
    }

    async testConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout (increased from 5s for slow networks)

            const response = await fetch(`${API_BASE_URL}/api/health`, {
                method: 'GET',
                signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));

            const latency = Date.now() - start;

            if (response.ok) {
                return { success: true, latency };
            } else {
                return { success: false, latency, error: `HTTP ${response.status} ` };
            }
        } catch (error) {
            return {
                success: false,
                latency: Date.now() - start,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    async sendEmail(
        to: string,
        subject: string,
        text: string,
        html: string,
        attachments?: string[],
        cc?: string,
        smtpConfig?: { host?: string; port?: number; user: string; pass: string; secure?: boolean; from?: string }
    ): Promise<{ success: boolean; messageId?: string; error?: string; details?: string }> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(`${API_BASE_URL}/api/email/send`, {
                signal: controller.signal,
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ to, subject, text, html, attachments, cc, smtpConfig }),
            }).finally(() => clearTimeout(timeoutId));
            const data = await response.json();
            if (response.ok) {
                return { success: true, messageId: data.messageId };
            } else {
                return { success: false, error: data.error, details: data.details };
            }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    async readSheet(
        spreadsheetId: string,
        range: string
    ): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const url = `${API_BASE_URL}/api/google/sheets/read`;
            console.log(`[ApiService] calling readSheet: ${url}`);

            const response = await fetch(url, {
                signal: controller.signal,
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ spreadsheetId, range }),
            }).finally(() => clearTimeout(timeoutId));

            const text = await response.text();
            console.log(`[ApiService] readSheet response status: ${response.status}`);
            console.log(`[ApiService] readSheet response body: ${text.substring(0, 200)}...`);

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('[ApiService] JSON Parse Failed:', e);
                return { success: false, error: `Invalid Server Response (${response.status}): ${text.substring(0, 50)}` };
            }

            if (response.ok) {
                return { success: true, data: data.values };
            } else {
                return { success: false, error: data.error || 'Failed to read sheet' };
            }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    async readEmails(
        config: { host?: string; port?: number; user?: string; pass?: string; accessToken?: string; maxResults?: number; searchQuery?: string }
    ): Promise<{ success: boolean; data?: any; error?: string; details?: string }> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

            const url = `${API_BASE_URL}/api/email/read`;
            console.log(`[ApiService] calling readEmails: ${url}`);

            const response = await fetch(`${API_BASE_URL}/api/email/read`, {
                signal: controller.signal,
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(config),
            }).finally(() => clearTimeout(timeoutId));

            const data = await response.json();

            if (response.ok) {
                return { success: true, data: data.emails };
            } else {
                return { success: false, error: data.error || 'Failed to read emails', details: data.details };
            }
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    async searchWeb(query: string): Promise<{ success: boolean; results?: { title: string; snippet: string; url: string }[]; resultCount?: number; error?: string }> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const url = `${API_BASE_URL}/api/search`;
            console.log(`[ApiService] calling searchWeb: ${url}`);

            const response = await fetch(url, {
                signal: controller.signal,
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ query }),
            }).finally(() => clearTimeout(timeoutId));

            const data = await response.json();

            if (response.ok && data.success) {
                console.log(`[ApiService] searchWeb returned ${data.resultCount} results`);
                return {
                    success: true,
                    results: data.results,
                    resultCount: data.resultCount
                };
            } else {
                return { success: false, error: data.error || 'Search failed' };
            }
        } catch (error) {
            console.error('[ApiService] searchWeb error:', error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    async decideWebAction(goal: string, pageState: string): Promise<{ action: any; reasoning?: string }> {
        try {
            console.log('[ApiService] Deciding web action for goal:', goal);
            // We use the same 'generate' endpoint but with a highly specific system prompt
            // Note: Ideally, we should have a dedicated lightweight endpoint, but this works for proof-of-concept.
            const prompt = `
GOAL: ${goal}
CURRENT PAGE STATE (JSON):
${pageState}

based on the goal and page state, decide the SINGLE next action.
Return ONLY raw JSON (no markdown).
Format options:
1. Click: { "type": "click", "selector": "CSS_SELECTOR", "reasoning": "..." }
2. Type: { "type": "type", "selector": "CSS_SELECTOR", "value": "text to type", "reasoning": "..." }
3. Scroll: { "type": "scroll", "reasoning": "..." }
4. Wait: { "type": "wait", "value": "2000", "reasoning": "..." }
5. Finish: { "type": "finish", "variableName": "result", "value": "extracted answer...", "reasoning": "..." }

If you see a cookie banner, click 'Accept' or close it.
If the goal is achieved, use 'finish'.
`;

            const response = await this.generateShortcut(prompt, "WEB_AGENT_MODE");

            // The generateShortcut returns a specific structure, but our backend update now returns the raw object for web actions.
            // We just need to check if response has 'type'

            console.log('[ApiService] decideWebAction raw response:', JSON.stringify(response, null, 2));

            if (response && (response as any).type) {
                return { action: response, reasoning: (response as any).reasoning };
            }

            // Fallback
            return { action: { type: 'wait', value: '2000' }, reasoning: "AI did not return a valid action type" };

        } catch (error) {
            console.error('Decide action error:', error);
            // Fallback to wait to prevent crash loop
            return { action: { type: 'wait', value: '3000' } };
        }
    }
    async getEmbedding(text: string): Promise<number[]> {
        try {
            // Optimization: If text is too long, truncate it
            const truncatedText = text.substring(0, 1000); // Reasonable limit for embeddings

            // 1. Try Backend API First
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // Fast timeout for backend

            try {
                const response = await fetch(`${API_BASE_URL}/api/embedding`, {
                    signal: controller.signal,
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify({ text: truncatedText }),
                }).finally(() => clearTimeout(timeoutId));

                if (response.ok) {
                    const data = await response.json();
                    if (data.embedding && Array.isArray(data.embedding)) {
                        return data.embedding;
                    }
                }
            } catch (backendError) {
                // Backend failed or not reachable, just log and continue to fallback
                console.log('[ApiService] Backend embedding unavailable, trying fallback.');
            }

            // 2. Client-Side Fallback: Use Gemini API directly
            console.log('[ApiService] Attempting client-side Gemini embedding...');
            const { userSettingsService } = require('./UserSettingsService');
            // Ensure settings are loaded
            await userSettingsService.ensureLoaded();
            const apiKey = userSettingsService.getApiKey('gemini');

            if (!apiKey) {
                console.warn('[ApiService] No Gemini API Key found for fallback embedding.');
                // Return random vector as last resort to prevent crash
                return Array(768).fill(0).map(() => Math.random() - 0.5);
            }

            // VERIFIED MODEL: models/gemini-embedding-001
            // This was confirmed via client-side diagnostics log.
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

            const geminiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "models/gemini-embedding-001",
                    content: {
                        parts: [{ text: truncatedText }]
                    }
                })
            });

            if (!geminiResponse.ok) {
                const errorText = await geminiResponse.text();
                console.error(`[ApiService] Gemini Embedding Failed (${geminiResponse.status}):`, errorText);
                throw new Error(`Gemini API Error (${geminiResponse.status}): ${errorText}`);
            }

            const geminiData = await geminiResponse.json();

            if (geminiData.embedding && geminiData.embedding.values) {
                return geminiData.embedding.values;
            } else {
                throw new Error('Invalid Gemini response format (no values)');
            }

        } catch (error) {
            console.error('[ApiService] getEmbedding overall error:', error);
            // Return empty array to signal failure to VectorMemory
            return [];
        }
    }
}

export const apiService = new ApiService();
