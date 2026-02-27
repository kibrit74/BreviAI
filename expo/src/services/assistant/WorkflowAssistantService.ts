import { providerRouterService } from './ProviderRouterService';
import { promptBuilderService } from './PromptBuilderService';
import {
    WorkflowAssistantRequest,
    AssistantResponse,
    AssistantFixSuggestion,
    AssistantPatchChange,
} from './WorkflowAssistantTypes';

const DEFAULT_FALLBACK: Omit<AssistantResponse, 'provider' | 'model'> = {
    beginnerExplanation: 'Hatayı tam çözemedim ama node ayarlarını adım adım kontrol ederek ilerleyebiliriz.',
    intermediateExplanation: 'Model yanıtı parse edilemedi. Hata kaydına göre manuel düzeltme önerileri üretilmeli.',
    suggestions: [],
    safetyNotes: ['API yanıtı geçersiz formatta geldi, otomatik patch uygulanmadı.'],
};

const ALLOWED_CHANGE_TYPES = new Set([
    'update_node_config',
    'update_node_type',
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

        // Support accidental Vertex-style references by extracting the final model id.
        const fromVertex = raw.includes('/models/')
            ? raw.split('/models/').pop() || ''
            : raw;

        const clean = fromVertex.replace(/^models\//, '').trim();
        return `models/${clean || fallback}`;
    }

    private normalizeSuggestion(item: any): AssistantFixSuggestion | null {
        if (!item || typeof item !== 'object') return null;
        const title = String(item.title || '').trim();
        const why = String(item.why || '').trim();
        const rawChanges = Array.isArray(item.changes) ? item.changes : [];
        const changes: AssistantPatchChange[] = rawChanges
            .filter((change: any) => change && ALLOWED_CHANGE_TYPES.has(change.type))
            .map((change: any) => ({
                type: change.type,
                nodeId: change.nodeId,
                edgeId: change.edgeId,
                sourceNodeId: change.sourceNodeId,
                targetNodeId: change.targetNodeId,
                sourcePort: change.sourcePort,
                path: change.path,
                oldValue: change.oldValue,
                newValue: change.newValue,
            }));

        if (!title || !why || !changes.length) return null;
        return { title, why, changes };
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

    async generateFixes(request: WorkflowAssistantRequest): Promise<AssistantResponse> {
        const routing = await providerRouterService.resolveProviderAndModel();
        const systemPrompt = promptBuilderService.buildSystemPrompt();
        const userPrompt = promptBuilderService.buildUserPrompt(request.workflow, request.latestError, request.userMessage);

        let rawText = '';
        if (routing.provider === 'gemini') {
            rawText = await this.callGemini(routing.apiKey, routing.model.id, systemPrompt, userPrompt);
        } else if (routing.provider === 'openai') {
            rawText = await this.callOpenAI(routing.apiKey, routing.model.id, systemPrompt, userPrompt);
        } else {
            rawText = await this.callClaude(routing.apiKey, routing.model.id, systemPrompt, userPrompt);
        }

        try {
            const parsed = this.parseAssistantJson(rawText);
            const suggestions = (Array.isArray(parsed?.suggestions) ? parsed.suggestions : [])
                .map((item: any) => this.normalizeSuggestion(item))
                .filter((item: AssistantFixSuggestion | null): item is AssistantFixSuggestion => !!item)
                .slice(0, 3);

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
            return {
                ...DEFAULT_FALLBACK,
                provider: routing.provider,
                model: routing.model.id,
                rawText,
            };
        }
    }
}

export const workflowAssistantService = new WorkflowAssistantService();
