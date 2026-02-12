/**
 * User Settings Service
 * Manages API keys and user preferences stored locally
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
    // AI Provider API Keys
    geminiApiKey: '@user_gemini_api_key',
    openaiApiKey: '@user_openai_api_key',
    claudeApiKey: '@user_claude_api_key',
    // Service API Keys
    openWeatherApiKey: '@user_openweather_api_key',
    // Preferred AI Provider
    preferredProvider: '@user_preferred_provider',
    // Other settings
    theme: '@user_theme',
    language: '@user_language',
    // TTS Settings
    ttsLanguage: '@user_tts_language',
    ttsRate: '@user_tts_rate',
    ttsPitch: '@user_tts_pitch',
    customVariables: '@user_custom_variables',
} as const;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type AIProvider = 'gemini' | 'openai' | 'claude';

export interface UserSettings {
    // API Keys
    geminiApiKey: string;
    openaiApiKey: string;
    claudeApiKey: string;
    // Service API Keys
    openWeatherApiKey: string;
    // Preferences
    preferredProvider: AIProvider;
    theme: 'dark' | 'light' | 'system';
    language: string;
    // TTS Settings
    ttsLanguage: string;
    ttsRate: number;
    ttsPitch: number;
    // Custom Variables
    customVariables: Record<string, { value: string; description: string; }>;
}

export interface APIKeyStatus {
    gemini: boolean;
    openai: boolean;
    claude: boolean;
}

// ═══════════════════════════════════════════════════════════════
// USER SETTINGS SERVICE
// ═══════════════════════════════════════════════════════════════

class UserSettingsService {
    private settings: UserSettings = {
        geminiApiKey: '',
        openaiApiKey: '',
        claudeApiKey: '',
        openWeatherApiKey: '',
        preferredProvider: 'gemini',
        theme: 'dark',
        language: 'tr',
        // TTS defaults
        ttsLanguage: 'tr-TR',
        ttsRate: 1.0,
        ttsPitch: 1.0,
        customVariables: {},
    };

    private loaded: boolean = false;
    private initPromise: Promise<UserSettings> | null = null;

    constructor() {
        // Don't auto-start in constructor to avoid side-effects during import.
        // Let App.tsx or first access trigger it.
        // But if nothing calls it, ensureLoaded key check handles it.
    }

    async ensureLoaded(): Promise<void> {
        if (this.loaded) {
            return;
        }
        if (!this.initPromise) {
            console.log('[UserSettings] ensureLoaded: triggering initial load');
            this.initPromise = this.loadSettings();
        } else {
            console.log('[UserSettings] ensureLoaded: waiting for existing promise');
        }
        await this.initPromise;
    }

    // ─────────────────────────────────────────────────────────────
    // LOAD / SAVE
    // ─────────────────────────────────────────────────────────────

    async loadSettings(): Promise<UserSettings> {
        // If already loading, return existing promise
        if (this.initPromise && !this.loaded) {
            return this.initPromise;
        }

        console.log('[UserSettings] loadSettings: START');
        try {
            const [
                geminiKey, openaiKey, claudeKey, openWeatherKey, provider, theme, language,
                ttsLanguage, ttsRate, ttsPitch, customVars
            ] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.geminiApiKey),
                AsyncStorage.getItem(STORAGE_KEYS.openaiApiKey),
                AsyncStorage.getItem(STORAGE_KEYS.claudeApiKey),
                AsyncStorage.getItem(STORAGE_KEYS.openWeatherApiKey),
                AsyncStorage.getItem(STORAGE_KEYS.preferredProvider),
                AsyncStorage.getItem(STORAGE_KEYS.theme),
                AsyncStorage.getItem(STORAGE_KEYS.language),
                AsyncStorage.getItem(STORAGE_KEYS.ttsLanguage),
                AsyncStorage.getItem(STORAGE_KEYS.ttsRate),
                AsyncStorage.getItem(STORAGE_KEYS.ttsPitch),
                AsyncStorage.getItem(STORAGE_KEYS.customVariables),
            ]);

            console.log('[UserSettings] Raw vars from disk:', customVars); // DEBUG LOG

            let parsedCustomVars: Record<string, { value: string; description: string; }> = {};
            try {
                const rawVars = customVars ? JSON.parse(customVars) : {};
                // Migration: Check if values are strings or objects
                Object.entries(rawVars).forEach(([key, val]) => {
                    if (typeof val === 'string') {
                        // Legacy format: Convert to object
                        parsedCustomVars[key] = { value: val, description: '' };
                    } else if (typeof val === 'object' && val !== null) {
                        // New format
                        parsedCustomVars[key] = {
                            value: (val as any).value || '',
                            description: (val as any).description || ''
                        };
                    }
                });
            } catch (e) {
                console.warn('Failed to parse custom variables', e);
            }

            this.settings = {
                geminiApiKey: geminiKey || '',
                openaiApiKey: openaiKey || '',
                claudeApiKey: claudeKey || '',
                openWeatherApiKey: openWeatherKey || '',
                preferredProvider: (provider as AIProvider) || 'gemini',
                theme: (theme as 'dark' | 'light' | 'system') || 'dark',
                language: language || 'tr',
                ttsLanguage: ttsLanguage || 'tr-TR',
                ttsRate: ttsRate ? parseFloat(ttsRate) : 1.0,
                ttsPitch: ttsPitch ? parseFloat(ttsPitch) : 1.0,
                customVariables: parsedCustomVars,
            };

            this.loaded = true;
            console.log('[UserSettings] loadSettings: SUCCESS', { variableCount: Object.keys(this.settings.customVariables).length });
            return this.settings;
        } catch (error) {
            console.error('[UserSettings] Error loading settings:', error);
            this.loaded = true; // Mark as loaded even if failed (empty settings) prevents infinite wait
            return this.settings;
        }
    }

    async saveSettings(updates: Partial<UserSettings>): Promise<void> {
        try {
            const promises: Promise<void>[] = [];

            if (updates.geminiApiKey !== undefined) {
                this.settings.geminiApiKey = updates.geminiApiKey;
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.geminiApiKey, updates.geminiApiKey));
            }

            if (updates.openaiApiKey !== undefined) {
                this.settings.openaiApiKey = updates.openaiApiKey;
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.openaiApiKey, updates.openaiApiKey));
            }

            if (updates.claudeApiKey !== undefined) {
                this.settings.claudeApiKey = updates.claudeApiKey;
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.claudeApiKey, updates.claudeApiKey));
            }

            if (updates.openWeatherApiKey !== undefined) {
                this.settings.openWeatherApiKey = updates.openWeatherApiKey;
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.openWeatherApiKey, updates.openWeatherApiKey));
            }

            if (updates.preferredProvider !== undefined) {
                this.settings.preferredProvider = updates.preferredProvider;
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.preferredProvider, updates.preferredProvider));
            }

            if (updates.theme !== undefined) {
                this.settings.theme = updates.theme;
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.theme, updates.theme));
            }

            if (updates.language !== undefined) {
                this.settings.language = updates.language;
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.language, updates.language));
            }

            // TTS Settings
            if (updates.ttsLanguage !== undefined) {
                this.settings.ttsLanguage = updates.ttsLanguage;
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.ttsLanguage, updates.ttsLanguage));
            }

            if (updates.ttsRate !== undefined) {
                this.settings.ttsRate = updates.ttsRate;
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.ttsRate, updates.ttsRate.toString()));
            }

            if (updates.ttsPitch !== undefined) {
                this.settings.ttsPitch = updates.ttsPitch;
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.ttsPitch, updates.ttsPitch.toString()));
            }

            // Custom Variables
            if (updates.customVariables !== undefined) {
                this.settings.customVariables = updates.customVariables;
                promises.push(AsyncStorage.setItem(STORAGE_KEYS.customVariables, JSON.stringify(updates.customVariables)));
            }

            await Promise.all(promises);
            console.log('[UserSettings] Settings saved');
        } catch (error) {
            console.error('[UserSettings] Error saving settings:', error);
            throw error;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // GETTERS
    // ─────────────────────────────────────────────────────────────

    getSettings(): UserSettings {
        return { ...this.settings };
    }

    /**
     * Get TTS settings for speech synthesis
     */
    getTTSSettings(): { language: string; rate: number; pitch: number } {
        return {
            language: this.settings.ttsLanguage,
            rate: this.settings.ttsRate,
            pitch: this.settings.ttsPitch,
        };
    }

    // Custom Variables Helpers
    getCustomVariables(): Record<string, { value: string; description: string; }> {
        return { ...this.settings.customVariables };
    }

    getCustomVariable(key: string): string | undefined {
        return this.settings.customVariables[key]?.value;
    }

    // Helper to get raw object including description
    getCustomVariableDetails(key: string): { value: string; description: string; } | undefined {
        return this.settings.customVariables[key];
    }

    /**
     * Get API key for a specific provider
     */
    getApiKey(provider: AIProvider): string {
        switch (provider) {
            case 'gemini':
                return this.settings.geminiApiKey;
            case 'openai':
                return this.settings.openaiApiKey;
            case 'claude':
                return this.settings.claudeApiKey;
            default:
                return '';
        }
    }

    /**
     * Get the best available API key based on preference
     * Returns the preferred provider's key, or first available
     */
    getBestApiKey(): { provider: AIProvider; apiKey: string } | null {
        // First try preferred provider
        const preferredKey = this.getApiKey(this.settings.preferredProvider);
        if (preferredKey) {
            return { provider: this.settings.preferredProvider, apiKey: preferredKey };
        }

        // Fallback to any available
        if (this.settings.geminiApiKey) {
            return { provider: 'gemini', apiKey: this.settings.geminiApiKey };
        }
        if (this.settings.openaiApiKey) {
            return { provider: 'openai', apiKey: this.settings.openaiApiKey };
        }
        if (this.settings.claudeApiKey) {
            return { provider: 'claude', apiKey: this.settings.claudeApiKey };
        }

        return null;
    }

    /**
     * Check which API keys are configured
     */
    getApiKeyStatus(): APIKeyStatus {
        return {
            gemini: !!this.settings.geminiApiKey,
            openai: !!this.settings.openaiApiKey,
            claude: !!this.settings.claudeApiKey,
        };
    }

    /**
     * Check if any API key is configured
     */
    hasAnyApiKey(): boolean {
        return !!(
            this.settings.geminiApiKey ||
            this.settings.openaiApiKey ||
            this.settings.claudeApiKey
        );
    }

    // ─────────────────────────────────────────────────────────────
    // SETTERS
    // ─────────────────────────────────────────────────────────────

    async setApiKey(provider: AIProvider, apiKey: string): Promise<void> {
        switch (provider) {
            case 'gemini':
                await this.saveSettings({ geminiApiKey: apiKey });
                break;
            case 'openai':
                await this.saveSettings({ openaiApiKey: apiKey });
                break;
            case 'claude':
                await this.saveSettings({ claudeApiKey: apiKey });
                break;
        }
    }

    async setCustomVariable(key: string, value: string, description: string = ''): Promise<void> {
        const newVars = {
            ...this.settings.customVariables,
            [key]: { value, description }
        };
        await this.saveSettings({ customVariables: newVars });
    }

    async deleteCustomVariable(key: string): Promise<void> {
        const newVars = { ...this.settings.customVariables };
        delete newVars[key];
        await this.saveSettings({ customVariables: newVars });
    }

    async setPreferredProvider(provider: AIProvider): Promise<void> {
        await this.saveSettings({ preferredProvider: provider });
    }

    /**
     * Clear all API keys
     */
    async clearApiKeys(): Promise<void> {
        await this.saveSettings({
            geminiApiKey: '',
            openaiApiKey: '',
            claudeApiKey: '',
        });
    }

    /**
     * Clear all settings
     */
    async resetAllSettings(): Promise<void> {
        try {
            await Promise.all(
                Object.values(STORAGE_KEYS).map(key => AsyncStorage.removeItem(key))
            );
            this.settings = {
                geminiApiKey: '',
                openaiApiKey: '',
                claudeApiKey: '',
                openWeatherApiKey: '',
                preferredProvider: 'gemini',
                theme: 'dark',
                language: 'tr',
                ttsLanguage: 'tr-TR',
                ttsRate: 1.0,
                ttsPitch: 1.0,
                customVariables: {},
            };
            console.log('[UserSettings] All settings cleared');
        } catch (error) {
            console.error('[UserSettings] Error clearing settings:', error);
        }
    }
}

// Export singleton
export const userSettingsService = new UserSettingsService();
