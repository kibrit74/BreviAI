/**
 * Slack Service - OAuth & Token Integration
 * Specifically designed to store Bot token for MCP tools 
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SlackAuthState {
    isSignedIn: boolean;
    workspaceName: string | null;
    workspaceId: string | null;
    botToken: string | null;
}

const STORAGE_KEYS = {
    botToken: '@slack_bot_token',
    workspaceName: '@slack_workspace_name',
    workspaceId: '@slack_workspace_id',
};

// ═══════════════════════════════════════════════════════════════
// SLACK SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class SlackService {
    private botToken: string | null = null;
    private workspaceName: string | null = null;
    private workspaceId: string | null = null;

    constructor() {
        this.loadStoredAuth();
    }

    private async loadStoredAuth(): Promise<void> {
        try {
            const [token, wsName, wsId] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.botToken),
                AsyncStorage.getItem(STORAGE_KEYS.workspaceName),
                AsyncStorage.getItem(STORAGE_KEYS.workspaceId),
            ]);

            this.botToken = token;
            this.workspaceName = wsName;
            this.workspaceId = wsId;

            console.log('[SlackService] Loaded auth:', { hasToken: !!token, workspace: wsName });
        } catch (error) {
            console.error('[SlackService] Error loading auth:', error);
        }
    }

    private async saveAuth(): Promise<void> {
        try {
            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.botToken, this.botToken || ''),
                AsyncStorage.setItem(STORAGE_KEYS.workspaceName, this.workspaceName || ''),
                AsyncStorage.setItem(STORAGE_KEYS.workspaceId, this.workspaceId || ''),
            ]);
        } catch (error) {
            console.error('[SlackService] Error saving auth:', error);
        }
    }

    public getAuthState(): SlackAuthState {
        return {
            isSignedIn: !!this.botToken,
            botToken: this.botToken,
            workspaceName: this.workspaceName,
            workspaceId: this.workspaceId,
        };
    }

    public async getAccessToken(): Promise<string | null> {
        return this.botToken;
    }

    /**
     * Sign in via Backend OAuth Flow
     */
    public async signIn(): Promise<SlackAuthState> {
        try {
            // Mobile redirect URI (deep link)
            const redirectUri = AuthSession.makeRedirectUri({
                scheme: 'brevi-ai',
                path: 'oauth',
            });

            // Determine Backend URL based on environment
            let backendBaseUrl = 'https://breviai.vercel.app';

            // IMPORTANT: If you test locally with a real device, you can set your IP:
            // if (__DEV__) { backendBaseUrl = 'http://192.168.1.x:3000'; }

            // Backend Auth Start URL
            const authUrl = `${backendBaseUrl}/api/auth/slack/start?redirect_uri=${encodeURIComponent(redirectUri)}`;

            console.log('[SlackService] ===== OAUTH START =====');
            console.log('[SlackService] Full Auth URL:', authUrl);
            console.log('[SlackService] Callback URI:', redirectUri);

            // Open browser to backend auth start
            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

            console.log('[SlackService] Auth result type:', result.type);

            if (result.type === 'success' && result.url) {
                console.log('[SlackService] Success URL:', result.url);

                const urlObj = new URL(result.url);
                const queryParams = new URLSearchParams(urlObj.search);

                const token = queryParams.get('slack_token');
                const workspaceId = queryParams.get('workspace_id');
                const workspaceName = queryParams.get('workspace_name');
                const error = queryParams.get('error');

                if (error) {
                    console.error('[SlackService] OAuth error from backend:', error);
                    throw new Error(`OAuth hatası: ${error}`);
                }

                if (token) {
                    this.botToken = token;
                    this.workspaceId = workspaceId || null;
                    this.workspaceName = workspaceName || null;

                    await this.saveAuth();

                    console.log('[SlackService] Sign in successful!');
                    return this.getAuthState();
                }

                throw new Error('Token alınamadı');
            } else if (result.type === 'cancel') {
                throw new Error('Giriş iptal edildi');
            } else {
                throw new Error('OAuth başarısız oldu');
            }
        } catch (error) {
            console.error('[SlackService] Sign in error:', error);
            throw error;
        }
    }

    public async signOut(): Promise<void> {
        this.botToken = null;
        this.workspaceName = null;
        this.workspaceId = null;

        await Promise.all([
            AsyncStorage.removeItem(STORAGE_KEYS.botToken),
            AsyncStorage.removeItem(STORAGE_KEYS.workspaceName),
            AsyncStorage.removeItem(STORAGE_KEYS.workspaceId),
        ]);
        console.log('[SlackService] Signed out');
    }
}

// Export singleton instance
export const slackService = new SlackService();
