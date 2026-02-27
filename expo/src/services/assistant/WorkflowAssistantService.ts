import { providerRouterService } from './ProviderRouterService';
import { promptBuilderService } from './PromptBuilderService';
import { Workflow } from '../../types/workflow-types';
import {
    WorkflowAssistantRequest,
    AssistantResponse,
    AssistantFixSuggestion,
    AssistantPatchChange,
    AssistantRoutingResult,
} from './WorkflowAssistantTypes';
import { findInvalidNodes, hasTriggerNode, normalizeNodeType } from './NodeTypeResolver';

const DEFAULT_FALLBACK: Omit<AssistantResponse, 'provider' | 'model'> = {
    beginnerExplanation: 'Hatayi tam cozemedim ama node ayarlarini adim adim kontrol ederek ilerleyebiliriz.',
    intermediateExplanation: 'Model yaniti parse edilemedi. Hata kaydina gore manuel duzeltme onerileri uretilmeli.',
    suggestions: [],
    safetyNotes: ['API yaniti gecersiz formatta geldi, otomatik patch uygulanmadi.'],
};

const ALLOWED_CHANGE_TYPES = new Set([
    'update_node_config',
    'update_node_type',
    'add_node',
    'update_node_label',
    'replace_text_template',
    'add_edge',
    'remove_edge',
]);

class WorkflowAssistantService {
    private normalizeGeminiModel(model: string): string {
        const raw = String(model || '').trim();
        const fallback = 'gemini-2.5-pro';

        if (!raw) return `models/${fallback}`;

        const fromVertex = raw.includes('/models/')
            ? raw.split('/models/').pop() || ''
            : raw;

        const clean = fromVertex.replace(/^models\//, '').trim();
        return `models/${clean || fallback}`;
    }

    private normalizeChange(change: any): AssistantPatchChange | null {
        if (!change || typeof change !== 'object') return null;
        if (!ALLOWED_CHANGE_TYPES.has(change.type)) return null;

        const normalized: AssistantPatchChange = {
            type: change.type,
            nodeId: change.nodeId,
            nodeType: change.nodeType,
            position: change.position,
            edgeId: change.edgeId,
            sourceNodeId: change.sourceNodeId,
            targetNodeId: change.targetNodeId,
            sourcePort: change.sourcePort,
            path: change.path,
            oldValue: change.oldValue,
            newValue: change.newValue,
        };

        if (change.type === 'update_node_type') {
            const resolvedType = normalizeNodeType(change.newValue);
            if (!resolvedType) return null;
            normalized.newValue = resolvedType;
            return normalized;
        }

        if (change.type === 'add_node') {
            const payload =
                change.newValue && typeof change.newValue === 'object' && !Array.isArray(change.newValue)
                    ? { ...change.newValue }
                    : {};
            const resolvedType = normalizeNodeType(
                payload.type || payload.nodeType || change.nodeType || change.newValue
            );
            if (!resolvedType) return null;

            payload.type = resolvedType;
            payload.nodeType = resolvedType;
            if (
                !payload.position ||
                typeof payload.position.x !== 'number' ||
                typeof payload.position.y !== 'number'
            ) {
                payload.position = { x: 120, y: 120 };
            }

            normalized.newValue = payload;
            return normalized;
        }

        return normalized;
    }

    private normalizeSuggestion(item: any): AssistantFixSuggestion | null {
        if (!item || typeof item !== 'object') return null;
        const title = String(item.title || '').trim();
        const why = String(item.why || '').trim();
        const rawChanges = Array.isArray(item.changes) ? item.changes : [];
        const changes: AssistantPatchChange[] = rawChanges
            .map((change: any) => this.normalizeChange(change))
            .filter((change: AssistantPatchChange | null): change is AssistantPatchChange => !!change);

        if (!title || !why || !changes.length) return null;
        return { title, why, changes };
    }

    private buildLocalFallbackSuggestions(workflow: Workflow): AssistantFixSuggestion[] {
        const suggestions: AssistantFixSuggestion[] = [];

        const invalidNodes = findInvalidNodes(workflow).filter((node) => !!node.suggestedType);
        if (invalidNodes.length) {
            suggestions.push({
                title: 'Gecersiz node tiplerini duzelt',
                why: 'Workflow icinde taninmayan node tipleri bulundu. Bu tipler calisma aninda hataya neden olabilir.',
                changes: invalidNodes.slice(0, 8).map((node) => ({
                    type: 'update_node_type',
                    nodeId: node.nodeId,
                    oldValue: node.currentType,
                    newValue: node.suggestedType,
                })),
            });
        }

        if (!hasTriggerNode(workflow)) {
            const triggerId = `node_manual_trigger_${Date.now()}`;
            const firstTarget = workflow.nodes[0];
            const changes: AssistantPatchChange[] = [
                {
                    type: 'add_node',
                    nodeId: triggerId,
                    newValue: {
                        type: 'MANUAL_TRIGGER',
                        label: 'Manuel Baslat',
                        position: { x: 80, y: 80 },
                        config: { label: 'Manuel Baslat' },
                    },
                },
            ];
            if (firstTarget?.id) {
                changes.push({
                    type: 'add_edge',
                    sourceNodeId: triggerId,
                    targetNodeId: firstTarget.id,
                    sourcePort: 'default',
                });
            }

            suggestions.push({
                title: 'Eksik tetikleyici node ekle',
                why: 'Workflow baslatma nodeu bulunamadi. Trigger node olmadan akis calismaz.',
                changes,
            });
        }

        return suggestions.slice(0, 3);
    }

    private extractJsonCandidate(rawText: string): string {
        const noFence = rawText.replace(/```json|```/gi, '').trim();
        const start = noFence.indexOf('{');
        const end = noFence.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return noFence.slice(start, end + 1);
        }
        return noFence;
    }

    private parseAssistantJson(rawText: string) {
        const candidate = this.extractJsonCandidate(rawText);
        return JSON.parse(candidate);
    }

    private async callGemini(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        try {
            const modelName = this.normalizeGeminiModel(model);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`, {
                method: 'POST',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: 0.4,
                        topP: 0.9,
                        topK: 40,
                        maxOutputTokens: 7000,
                        responseMimeType: 'application/json',
                    },
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error?.message || 'Gemini error');
            const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('\n') || '';
            return text;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private async callOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.2,
                    max_tokens: 2200,
                    response_format: { type: 'json_object' },
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error?.message || 'OpenAI error');
            return data?.choices?.[0]?.message?.content || '';
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private async callClaude(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.2,
                    max_tokens: 1400,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userPrompt }],
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error?.message || 'Claude error');
            const blocks = Array.isArray(data?.content) ? data.content : [];
            return blocks
                .filter((block: any) => block?.type === 'text')
                .map((block: any) => block?.text || '')
                .join('\n');
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private async callProvider(
        routing: AssistantRoutingResult,
        systemPrompt: string,
        userPrompt: string
    ): Promise<string> {
        if (routing.provider === 'gemini') {
            return this.callGemini(routing.apiKey, routing.model.id, systemPrompt, userPrompt);
        }
        if (routing.provider === 'openai') {
            return this.callOpenAI(routing.apiKey, routing.model.id, systemPrompt, userPrompt);
        }
        return this.callClaude(routing.apiKey, routing.model.id, systemPrompt, userPrompt);
    }

    async generateFixes(request: WorkflowAssistantRequest): Promise<AssistantResponse> {
        const candidates = await providerRouterService.resolveProviderCandidates();
        let routing = candidates[0];
        const systemPrompt = promptBuilderService.buildSystemPrompt();
        const userPrompt = promptBuilderService.buildUserPrompt(request.workflow, request.latestError, request.userMessage);

        let rawText = '';
        let callError: Error | null = null;
        for (const candidate of candidates) {
            try {
                rawText = await this.callProvider(candidate, systemPrompt, userPrompt);
                routing = candidate;
                callError = null;
                break;
            } catch (error: any) {
                callError = error instanceof Error ? error : new Error(String(error));
            }
        }

        if (callError && !rawText) {
            return {
                ...DEFAULT_FALLBACK,
                suggestions: this.buildLocalFallbackSuggestions(request.workflow),
                safetyNotes: [
                    ...DEFAULT_FALLBACK.safetyNotes,
                    `Tum provider denemeleri basarisiz oldu: ${callError.message}`,
                ].slice(0, 6),
                provider: routing.provider,
                model: routing.model.id,
                rawText: '',
            };
        }

        try {
            const parsed = this.parseAssistantJson(rawText);
            let suggestions = (Array.isArray(parsed?.suggestions) ? parsed.suggestions : [])
                .map((item: any) => this.normalizeSuggestion(item))
                .filter((item: AssistantFixSuggestion | null): item is AssistantFixSuggestion => !!item)
                .slice(0, 3);

            if (!suggestions.length) {
                suggestions = this.buildLocalFallbackSuggestions(request.workflow);
            }

            return {
                beginnerExplanation: String(parsed?.beginner_explanation || DEFAULT_FALLBACK.beginnerExplanation),
                intermediateExplanation: String(parsed?.intermediate_explanation || DEFAULT_FALLBACK.intermediateExplanation),
                suggestions,
                safetyNotes: Array.isArray(parsed?.safety_notes)
                    ? parsed.safety_notes.map((note: any) => String(note)).slice(0, 6)
                    : DEFAULT_FALLBACK.safetyNotes,
                provider: routing.provider,
                model: routing.model.id,
                rawText,
            };
        } catch (error) {
            const localSuggestions = this.buildLocalFallbackSuggestions(request.workflow);
            return {
                ...DEFAULT_FALLBACK,
                suggestions: localSuggestions,
                provider: routing.provider,
                model: routing.model.id,
                rawText,
            };
        }
    }
}

export const workflowAssistantService = new WorkflowAssistantService();
