import { userSettingsService, AIProvider } from '../UserSettingsService';
import { modelCatalogService } from './ModelCatalogService';
import { AssistantRoutingResult } from './WorkflowAssistantTypes';

class ProviderRouterService {
    private getAvailableProvidersInOrder(preferred: AIProvider, status: Record<AIProvider, boolean>): AIProvider[] {
        const ordered: AIProvider[] = [preferred, 'gemini', 'openai', 'claude'];
        const unique = Array.from(new Set(ordered));
        return unique.filter(provider => !!status[provider]);
    }

    async resolveProviderCandidates(): Promise<AssistantRoutingResult[]> {
        await userSettingsService.ensureLoaded();
        const settings = userSettingsService.getSettings();
        const status = userSettingsService.getApiKeyStatus() as Record<AIProvider, boolean>;
        const providerOrder = this.getAvailableProvidersInOrder(settings.preferredProvider, status);

        if (!providerOrder.length) {
            throw new Error('API anahtari bulunamadi. Ayarlar ekranindan en az bir AI provider anahtari girin.');
        }

        const candidates: AssistantRoutingResult[] = [];
        let lastError: Error | null = null;

        for (const provider of providerOrder) {
            const apiKey = userSettingsService.getApiKey(provider);
            if (!apiKey) continue;
            try {
                const models = await modelCatalogService.getModels(provider, apiKey);
                const model = modelCatalogService.pickDefaultModel(provider, models);
                candidates.push({ provider, apiKey, model });
            } catch (error: any) {
                lastError = error instanceof Error ? error : new Error(String(error));
            }
        }

        if (!candidates.length) {
            throw lastError || new Error('Uygun provider secilemedi.');
        }

        return candidates;
    }

    async resolveProviderAndModel(): Promise<AssistantRoutingResult> {
        const candidates = await this.resolveProviderCandidates();
        return candidates[0];
    }
}

export const providerRouterService = new ProviderRouterService();
