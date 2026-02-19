import { AIProvider } from '../UserSettingsService';
import { AssistantModelInfo } from './WorkflowAssistantTypes';

type CatalogCacheItem = {
    models: AssistantModelInfo[];
    timestamp: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const FALLBACK_MODELS: Record<AIProvider, AssistantModelInfo[]> = {
    gemini: [
        { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ],
    openai: [
        { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
        { id: 'gpt-4o', label: 'GPT-4o' },
    ],
    claude: [
        { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
        { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    ],
};

class ModelCatalogService {
    private cache = new Map<AIProvider, CatalogCacheItem>();

    private getCached(provider: AIProvider): AssistantModelInfo[] | null {
        const item = this.cache.get(provider);
        if (!item) return null;
        if (Date.now() - item.timestamp > CACHE_TTL_MS) return null;
        return item.models;
    }

    private setCached(provider: AIProvider, models: AssistantModelInfo[]) {
        this.cache.set(provider, { models, timestamp: Date.now() });
    }

    async getModels(provider: AIProvider, apiKey: string): Promise<AssistantModelInfo[]> {
        const cached = this.getCached(provider);
        if (cached && cached.length > 0) return cached;

        try {
            let models: AssistantModelInfo[] = [];

            if (provider === 'gemini') {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error?.message || 'Gemini model list error');
                const items = Array.isArray(data?.models) ? data.models : [];
                models = items
                    .filter((m: any) => String(m?.name || '').includes('gemini'))
                    .filter((m: any) => {
                        const methods: string[] = Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
                        return methods.includes('generateContent');
                    })
                    .map((m: any) => {
                        const fullName = String(m?.name || '').replace(/^models\//, '');
                        return { id: fullName, label: m?.displayName || fullName };
                    });
            } else if (provider === 'openai') {
                const response = await fetch('https://api.openai.com/v1/models', {
                    headers: { Authorization: `Bearer ${apiKey}` },
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error?.message || 'OpenAI model list error');
                const items = Array.isArray(data?.data) ? data.data : [];
                models = items
                    .map((m: any) => String(m?.id || ''))
                    .filter((id: string) => id.startsWith('gpt-4') || id.startsWith('gpt-4o') || id.startsWith('o1'))
                    .slice(0, 20)
                    .map((id: string) => ({ id, label: id }));
            } else if (provider === 'claude') {
                const response = await fetch('https://api.anthropic.com/v1/models', {
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                    },
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.error?.message || 'Claude model list error');
                const items = Array.isArray(data?.data) ? data.data : [];
                models = items
                    .map((m: any) => String(m?.id || ''))
                    .filter(Boolean)
                    .slice(0, 20)
                    .map((id: string) => ({ id, label: id }));
            }

            if (!models.length) throw new Error('No models returned');
            this.setCached(provider, models);
            return models;
        } catch (error) {
            const fallback = FALLBACK_MODELS[provider];
            this.setCached(provider, fallback);
            return fallback;
        }
    }

    pickDefaultModel(provider: AIProvider, models: AssistantModelInfo[]): AssistantModelInfo {
        if (!models.length) return FALLBACK_MODELS[provider][0];

        if (provider === 'gemini') {
            return (
                models.find(m => m.id.includes('2.0-flash')) ||
                models.find(m => m.id.includes('flash')) ||
                models[0]
            );
        }

        if (provider === 'openai') {
            return (
                models.find(m => m.id === 'gpt-4o-mini') ||
                models.find(m => m.id.includes('mini')) ||
                models[0]
            );
        }

        return (
            models.find(m => m.id.includes('haiku')) ||
            models.find(m => m.id.includes('sonnet')) ||
            models[0]
        );
    }
}

export const modelCatalogService = new ModelCatalogService();
