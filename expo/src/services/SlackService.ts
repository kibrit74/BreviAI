/**
 * Slack Service - OAuth & API Integration
 * Backend-based OAuth flow for Slack integration
 */

import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
    accessToken: '@slack_access_token',
    workspaceName: '@slack_workspace_name', // To display which workspace is connected
    botUserId: '@slack_bot_user_id',
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SlackAuthState {
    isSignedIn: boolean;
    workspaceName: string | null;
    accessToken: string | null;
}

// ═══════════════════════════════════════════════════════════════
// SLACK SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class SlackService {
    private accessToken: string | null = null;
    private workspaceName: string | null = null;
    private botUserId: string | null = null;

    constructor() {
        this.loadStoredAuth();
    }

    // ─────────────────────────────────────────────────────────────
    // AUTH METHODS
    // ─────────────────────────────────────────────────────────────

    private async loadStoredAuth(): Promise<void> {
        try {
            const [accessToken, workspaceName, botUserId] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.accessToken),
                AsyncStorage.getItem(STORAGE_KEYS.workspaceName),
                AsyncStorage.getItem(STORAGE_KEYS.botUserId),
            ]);

            this.accessToken = accessToken;
            this.workspaceName = workspaceName;
            this.botUserId = botUserId;

            console.log('[SlackService] Loaded auth:', {
                hasToken: !!accessToken,
                workspaceName: this.workspaceName
            });
        } catch (error) {
            console.error('[SlackService] Error loading stored auth:', error);
        }
    }

    private async saveAuth(): Promise<void> {
        try {
            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.accessToken, this.accessToken || ''),
                AsyncStorage.setItem(STORAGE_KEYS.workspaceName, this.workspaceName || ''),
                AsyncStorage.setItem(STORAGE_KEYS.botUserId, this.botUserId || ''),
            ]);
        } catch (error) {
            console.error('[SlackService] Error saving auth:', error);
        }
    }

    private async clearAuth(): Promise<void> {
        this.accessToken = null;
        this.workspaceName = null;
        this.botUserId = null;

        try {
            await Promise.all([
                AsyncStorage.removeItem(STORAGE_KEYS.accessToken),
                AsyncStorage.removeItem(STORAGE_KEYS.workspaceName),
                AsyncStorage.removeItem(STORAGE_KEYS.botUserId),
            ]);
        } catch (error) {
            console.error('[SlackService] Error clearing auth:', error);
        }
    }

    /**
     * Get current auth state
     */
    getAuthState(): SlackAuthState {
        return {
            isSignedIn: !!this.accessToken,
            workspaceName: this.workspaceName,
            accessToken: this.accessToken,
        };
    }

    /**
     * Get the stored access token for MCP tools
     */
    async getAccessToken(): Promise<string | null> {
        if (!this.accessToken) {
            await this.loadStoredAuth();
        }
        return this.accessToken;
    }

    /**
     * Sign in with Slack OAuth via Backend
     */
    async signIn(): Promise<SlackAuthState> {
        try {
            // Mobile redirect URI (deep link)
            const redirectUri = AuthSession.makeRedirectUri({
                scheme: 'brevi-ai',
                path: 'oauth',
            });
            const redirectUriPrefix = redirectUri.split('?')[0];

            // Determine Backend URL (default to production; allow explicit override)
            const configuredBackendUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
            let backendBaseUrl = configuredBackendUrl
                ? configuredBackendUrl.replace(/\/$/, '')
                : 'https://breviai.vercel.app';

            if (__DEV__) {
                // Determine if running on web, emulator or physical device.
                // In a real expo environment you'd use manifest values, but we'll try a common approach.
                // You may need to uncomment and set your LAN IP manually if using a physical device during dev.
                // Do not force 10.0.2.2 here; it breaks OAuth on physical devices / Expo Go.
                // If you need local backend for testing, set EXPO_PUBLIC_API_BASE_URL or uncomment and set your LAN IP:
                // backendBaseUrl = 'http://192.168.1.x:3000';
            }

            // Backend Auth Start URL
            const authUrl = `${backendBaseUrl}/api/auth/slack/start?redirect_uri=${encodeURIComponent(redirectUri)}`;

            console.log('[SlackService] ===== BACKEND OAUTH START =====');
            console.log('[SlackService] Backend URL:', backendBaseUrl);
            console.log('[SlackService] Full Auth URL:', authUrl);
            console.log('[SlackService] Callback URI:', redirectUri);

            let capturedRedirectUrl: string | null = null;
            let callbackPromiseResolve: ((url: string) => void) | null = null;
            let callbackPromiseSettled = false;
            const callbackPromise = new Promise<string>((resolve) => {
                callbackPromiseResolve = resolve;
            });
            const resolveCallbackUrl = (url: string) => {
                if (callbackPromiseSettled) return;
                callbackPromiseSettled = true;
                capturedRedirectUrl = url;
                callbackPromiseResolve?.(url);
            };
            const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
                if (typeof url === 'string' && url.startsWith(redirectUriPrefix)) {
                    resolveCallbackUrl(url);
                    console.log('[SlackService] Captured OAuth deep link:', url);
                }
            });

            const waitForSlackCallback = async (timeoutMs: number): Promise<string | null> => {
                if (capturedRedirectUrl) {
                    return capturedRedirectUrl;
                }

                try {
                    const initialUrl = await Linking.getInitialURL();
                    if (initialUrl && initialUrl.startsWith(redirectUriPrefix)) {
                        console.log('[SlackService] Recovered OAuth deep link from initial URL:', initialUrl);
                        resolveCallbackUrl(initialUrl);
                        return initialUrl;
                    }
                } catch {
                    // no-op
                }

                return await Promise.race([
                    callbackPromise,
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
                ]);
            };

            // Open browser to backend auth start (wrapped to avoid unhandled promise if deep link wins first)
            const authOutcomePromise = WebBrowser.openAuthSessionAsync(authUrl, redirectUri)
                .then((authResult) => ({ kind: 'auth' as const, authResult }))
                .catch((authError) => ({ kind: 'auth_error' as const, authError }));

            let result: WebBrowser.WebBrowserAuthSessionResult | null = null;
            try {
                const firstOutcome = await Promise.race([
                    authOutcomePromise,
                    waitForSlackCallback(120000).then((url) => ({ kind: 'callback' as const, url })),
                ]);

                let callbackUrl: string | null = null;

                if (firstOutcome.kind === 'callback') {
                    if (firstOutcome.url) {
                        callbackUrl = firstOutcome.url;
                        console.log('[SlackService] OAuth callback arrived before auth session resolved');
                        try {
                            await WebBrowser.dismissBrowser();
                        } catch {
                            // no-op
                        }
                    } else {
                        const authOutcome = await authOutcomePromise;
                        if (authOutcome.kind === 'auth_error') {
                            throw authOutcome.authError;
                        }
                        result = authOutcome.authResult;
                    }
                } else if (firstOutcome.kind === 'auth_error') {
                    throw firstOutcome.authError;
                } else {
                    result = firstOutcome.authResult;
                }

                if (result) {
                    console.log('[SlackService] Auth result type:', result.type);

                    if (result.type === 'success' && result.url) {
                        callbackUrl = result.url;
                    } else if (result.type === 'dismiss') {
                        console.log('[SlackService] Auth session dismissed; waiting for Slack app callback...');
                        callbackUrl = await waitForSlackCallback(90000);
                    }
                }

                if (callbackUrl) {
                    console.log('[SlackService] Success URL:', callbackUrl);

                    // Parse tokens from deep link query params
                    // Format: brevi-ai://oauth?slack_token=...&workspace_name=...
                    const urlObj = new URL(callbackUrl);
                    const queryParams = new URLSearchParams(urlObj.search);

                    const slackToken = queryParams.get('slack_token');
                    const workspaceName = queryParams.get('workspace_name') || queryParams.get('team_name');
                    const botUserId = queryParams.get('bot_user_id');
                    const error = queryParams.get('error');

                    if (error) {
                        console.error('[SlackService] OAuth error from backend:', error);
                        throw new Error(`OAuth hatasi: ${error}`);
                    }

                    if (slackToken) {
                        this.accessToken = slackToken;
                        this.workspaceName = workspaceName || 'Workspace';
                        this.botUserId = botUserId || null;

                        await this.saveAuth();

                        console.log('[SlackService] Sign in successful. Connected to:', this.workspaceName);
                        return this.getAuthState();
                    }

                    throw new Error('Token alinamadi');
                } else if (result?.type === 'cancel') {
                    throw new Error('Giris iptal edildi');
                } else if (result?.type === 'dismiss') {
                    throw new Error('OAuth ekrani kapandi (callback alinamadi)');
                } else if (!result) {
                    throw new Error('OAuth callback zaman asimina ugradi');
                } else {
                    throw new Error('OAuth basarisiz oldu');
                }
            } finally {
                linkingSubscription.remove();
            }
        } catch (error) {
            console.error('[SlackService] Sign in error:', error);
            throw error;
        }
    }

    /**
     * Sign out
     */
    async signOut(): Promise<void> {
        await this.clearAuth();
        console.log('[SlackService] Signed out');
    }
}

// Export singleton instance
export const slackService = new SlackService();
