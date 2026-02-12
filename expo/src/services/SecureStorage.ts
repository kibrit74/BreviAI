/**
 * Secure Storage Service
 * API anahtarları ve hassas verileri güvenli şekilde saklar
 * expo-secure-store kullanarak şifrelenmiş depolama sağlar
 */

import * as SecureStore from 'expo-secure-store';

// Güvenli depolama anahtarları
const SECURE_KEYS = {
    geminiApiKey: 'secure_gemini_api_key',
    openaiApiKey: 'secure_openai_api_key',
    claudeApiKey: 'secure_claude_api_key',
    openWeatherApiKey: 'secure_openweather_api_key',
    telegramBotToken: 'secure_telegram_bot_token',
    smtpPassword: 'secure_smtp_password',
    googleAccessToken: 'secure_google_access_token',
    googleRefreshToken: 'secure_google_refresh_token',
} as const;

export type SecureKeyName = keyof typeof SECURE_KEYS;

class SecureStorageService {
    private cache: Map<string, string> = new Map();
    private isAvailable: boolean = true;

    constructor() {
        this.checkAvailability();
    }

    /**
     * Secure storage kullanılabilirlik kontrolü
     */
    private async checkAvailability(): Promise<void> {
        try {
            const available = await SecureStore.isAvailableAsync();
            this.isAvailable = available;
            if (!available) {
                console.warn('[SecureStorage] Güvenli depolama bu cihazda kullanılamıyor');
            }
        } catch (error) {
            console.error('[SecureStorage] Kullanılabilirlik kontrolü başarısız:', error);
            this.isAvailable = false;
        }
    }

    /**
     * Güvenli şekilde değer kaydet
     */
    async setSecure(key: SecureKeyName, value: string): Promise<boolean> {
        const storageKey = SECURE_KEYS[key];

        try {
            if (!this.isAvailable) {
                // Fallback: Cache'de tut (session-only)
                this.cache.set(storageKey, value);
                console.warn('[SecureStorage] Fallback: Değer sadece session\'da saklandı');
                return true;
            }

            await SecureStore.setItemAsync(storageKey, value, {
                keychainAccessible: SecureStore.WHEN_UNLOCKED,
            });

            // Cache'i de güncelle
            this.cache.set(storageKey, value);
            return true;
        } catch (error) {
            console.error('[SecureStorage] Kaydetme hatası:', error);
            // Fallback
            this.cache.set(storageKey, value);
            return false;
        }
    }

    /**
     * Güvenli şekilde değer oku
     */
    async getSecure(key: SecureKeyName): Promise<string | null> {
        const storageKey = SECURE_KEYS[key];

        // Önce cache kontrol
        if (this.cache.has(storageKey)) {
            return this.cache.get(storageKey) || null;
        }

        try {
            if (!this.isAvailable) {
                return null;
            }

            const value = await SecureStore.getItemAsync(storageKey);

            // Cache'e ekle
            if (value) {
                this.cache.set(storageKey, value);
            }

            return value;
        } catch (error) {
            console.error('[SecureStorage] Okuma hatası:', error);
            return null;
        }
    }

    /**
     * Güvenli değeri sil
     */
    async deleteSecure(key: SecureKeyName): Promise<boolean> {
        const storageKey = SECURE_KEYS[key];

        try {
            this.cache.delete(storageKey);

            if (!this.isAvailable) {
                return true;
            }

            await SecureStore.deleteItemAsync(storageKey);
            return true;
        } catch (error) {
            console.error('[SecureStorage] Silme hatası:', error);
            return false;
        }
    }

    /**
     * API anahtarı var mı kontrol et
     */
    async hasApiKey(key: SecureKeyName): Promise<boolean> {
        const value = await this.getSecure(key);
        return value !== null && value.length > 0;
    }

    /**
     * Tüm güvenli verileri temizle
     */
    async clearAll(): Promise<void> {
        this.cache.clear();

        if (!this.isAvailable) return;

        for (const key of Object.values(SECURE_KEYS)) {
            try {
                await SecureStore.deleteItemAsync(key);
            } catch (error) {
                console.error(`[SecureStorage] ${key} silinemedi:`, error);
            }
        }
    }

    /**
     * API key durumunu al
     */
    async getApiKeyStatus(): Promise<Record<SecureKeyName, boolean>> {
        const status: Partial<Record<SecureKeyName, boolean>> = {};

        for (const key of Object.keys(SECURE_KEYS) as SecureKeyName[]) {
            status[key] = await this.hasApiKey(key);
        }

        return status as Record<SecureKeyName, boolean>;
    }
}

// Singleton export
export const secureStorage = new SecureStorageService();
