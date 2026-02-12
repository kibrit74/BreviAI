/**
 * Microsoft Service - OAuth & API Integration
 * Outlook, Excel, OneDrive API support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshAsync, TokenResponse } from 'expo-auth-session';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const MICROSOFT_CONFIG = {
    // Client ID must be provided by the user/developer via code or env
    // For now we use a placeholder or the user's Client ID if they have one
    // But since this is client-side, we need a Client ID. 
    // I will use a placeholder and instruct user to change it.
    clientId: '2f4b764a-ece4-4a9b-832f-e45e49ce7af1',
    scopes: [
        'User.Read',
        'Mail.ReadWrite',
        'Mail.Send', // Required for sending emails via Graph API
        'Files.ReadWrite',
        'offline_access', // Critical for refresh token
        'Calendars.ReadWrite'
    ],
    // Common endpoint for multi-tenant
    discovery: {
        authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    }
};

const STORAGE_KEYS = {
    accessToken: '@microsoft_access_token',
    refreshToken: '@microsoft_refresh_token',
    expiresAt: '@microsoft_expires_at',
    userInfo: '@microsoft_user_info',
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MicrosoftUserInfo {
    email: string;
    displayName: string;
    id: string;
}

export interface MicrosoftAuthState {
    isSignedIn: boolean;
    user: MicrosoftUserInfo | null;
    accessToken: string | null;
}

// ═══════════════════════════════════════════════════════════════
// MICROSOFT SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class MicrosoftService {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private expiresAt: number = 0;
    private userInfo: MicrosoftUserInfo | null = null;
    private clientId: string = MICROSOFT_CONFIG.clientId;

    constructor() {
        this.loadStoredAuth();
    }

    setClientId(id: string) {
        this.clientId = id;
    }

    getClientId() {
        return this.clientId;
    }

    // ─────────────────────────────────────────────────────────────
    // AUTH METHODS
    // ─────────────────────────────────────────────────────────────

    private async loadStoredAuth(): Promise<void> {
        try {
            const [accessToken, refreshToken, userInfoStr, expiresAtStr, clientId] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.accessToken),
                AsyncStorage.getItem(STORAGE_KEYS.refreshToken),
                AsyncStorage.getItem(STORAGE_KEYS.userInfo),
                AsyncStorage.getItem(STORAGE_KEYS.expiresAt),
                AsyncStorage.getItem('@microsoft_client_id'),
            ]);

            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            this.expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
            if (clientId) this.clientId = clientId;

            console.log('[MicrosoftService] Loaded auth:', { hasToken: !!accessToken, user: this.userInfo?.email });
        } catch (error) {
            console.error('[MicrosoftService] Error loading auth:', error);
        }
    }

    async saveAuth(response: TokenResponse, clientId?: string): Promise<void> {
        try {
            this.accessToken = response.accessToken;
            this.refreshToken = response.refreshToken || this.refreshToken; // Keep old refresh if new one not provided (rare for offline_access)

            // expires_in is in seconds
            const expiresIn = response.expiresIn || 3599;
            this.expiresAt = Date.now() + (expiresIn * 1000);

            if (clientId) {
                this.clientId = clientId;
                await AsyncStorage.setItem('@microsoft_client_id', clientId);
            }

            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.accessToken, this.accessToken || ''),
                AsyncStorage.setItem(STORAGE_KEYS.refreshToken, this.refreshToken || ''),
                AsyncStorage.setItem(STORAGE_KEYS.expiresAt, String(this.expiresAt)),
            ]);

            // Fetch user info
            await this.fetchUserInfo();
            await AsyncStorage.setItem(STORAGE_KEYS.userInfo, JSON.stringify(this.userInfo));

        } catch (error) {
            console.error('[MicrosoftService] Error saving auth:', error);
        }
    }

    async signOut(): Promise<void> {
        this.accessToken = null;
        this.refreshToken = null;
        this.userInfo = null;
        this.expiresAt = 0;

        await Promise.all([
            AsyncStorage.removeItem(STORAGE_KEYS.accessToken),
            AsyncStorage.removeItem(STORAGE_KEYS.refreshToken),
            AsyncStorage.removeItem(STORAGE_KEYS.userInfo),
            AsyncStorage.removeItem(STORAGE_KEYS.expiresAt),
            // Don't remove Client ID so user doesn't have to re-enter it
        ]);
        console.log('[MicrosoftService] Signed out');
    }

    getAuthState(): MicrosoftAuthState {
        // Basic check, improve with expiration check
        const isValid = !!this.accessToken && Date.now() < this.expiresAt;
        return {
            isSignedIn: isValid,
            user: this.userInfo,
            accessToken: this.accessToken,
        };
    }

    /**
     * Get a valid access token. Refreshes if expired.
     */
    async getAccessToken(): Promise<string | null> {
        if (!this.accessToken) return null;

        // Check if expired (with 5 min buffer)
        if (Date.now() >= this.expiresAt - 300000) {
            console.log('[MicrosoftService] Token expired, refreshing...');
            return await this.refreshAccessToken();
        }

        return this.accessToken;
    }

    private async refreshAccessToken(): Promise<string | null> {
        if (!this.refreshToken || !this.clientId) {
            console.warn('[MicrosoftService] Cannot refresh: missing refresh token or client ID');
            return null;
        }

        try {
            const tokenResult = await refreshAsync({
                clientId: this.clientId,
                refreshToken: this.refreshToken,
                scopes: MICROSOFT_CONFIG.scopes,
            }, MICROSOFT_CONFIG.discovery);

            await this.saveAuth(tokenResult);
            return tokenResult.accessToken;
        } catch (error) {
            console.error('[MicrosoftService] Refresh failed:', error);
            // Don't sign out automatically, let user retry or re-login explicitly
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // API HELPERS
    // ─────────────────────────────────────────────────────────────

    private async fetchUserInfo(): Promise<void> {
        if (!this.accessToken) return;

        try {
            const response = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.userInfo = {
                    displayName: data.displayName,
                    email: data.mail || data.userPrincipalName,
                    id: data.id
                };
            }
        } catch (error) {
            console.error('[MicrosoftService] Fetch user info failed:', error);
        }
    }
}

export const microsoftService = new MicrosoftService();
