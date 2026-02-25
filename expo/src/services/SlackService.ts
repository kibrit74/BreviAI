/**
 * Slack Service - OAuth & API Integration
 * Backend-based OAuth flow for Slack integration
 */

import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

const SLACK_OAUTH_INITIAL_WAIT_MS = 15 * 60 * 1000; // first-time install/onboarding can take a while
const SLACK_OAUTH_DISMISS_WAIT_MS = 10 * 60 * 1000;

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
            const fallbackRedirectPrefixes = [
                redirectUriPrefix,
                redirectUriPrefix.replace('://', ':///'),
                'brevi-ai:///oauth',
                'com.breviai.app://oauth',
                'com.breviai.app:///oauth',
            ];
            const isSlackOAuthCallbackUrl = (url: string | null | undefined): url is string => {
                if (!url || typeof url !== 'string') return false;
                if (fallbackRedirectPrefixes.some((prefix) => url.startsWith(prefix))) return true;
                try {
                    const parsed = Linking.parse(url);
                    const scheme = (parsed.scheme || '').toLowerCase();
                    const path = (parsed.path || '').replace(/^\/+/, '');
                    return (scheme === 'brevi-ai' || scheme === 'com.breviai.app') && path.startsWith('oauth');
                } catch {
                    return false;
                }
            };

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
            const authUrl = `${backendBaseUrl}/api/auth/slack/start/?redirect_uri=${encodeURIComponent(redirectUri)}`;

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
                if (isSlackOAuthCallbackUrl(url)) {
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
                    if (isSlackOAuthCallbackUrl(initialUrl)) {
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

            // Slack mobile often switches to the Slack app (or install flow), which causes
            // openAuthSessionAsync to dismiss early. Prefer a browser-first flow and rely on
            // deep-link callback capture via Linking.
            const browserOutcomePromise = (Platform.OS === 'android'
                ? Linking.openURL(authUrl)
                    .then(() => ({ kind: 'external_opened' as const }))
                    .catch((browserError) => ({ kind: 'browser_error' as const, browserError }))
                : WebBrowser.openBrowserAsync(authUrl)
                    .then((browserResult) => ({ kind: 'browser' as const, browserResult }))
                    .catch((browserError) => ({ kind: 'browser_error' as const, browserError })));

            let browserResult: WebBrowser.WebBrowserResult | null = null;
            let browserResultType: string | null = null;
            let externalBrowserOpened = false;
            try {
                const firstOutcome = await Promise.race([
                    browserOutcomePromise,
                    waitForSlackCallback(SLACK_OAUTH_INITIAL_WAIT_MS).then((url) => ({ kind: 'callback' as const, url })),
                ]);

                let callbackUrl: string | null = null;

                if (firstOutcome.kind === 'callback') {
                    if (firstOutcome.url) {
                        callbackUrl = firstOutcome.url;
                        console.log('[SlackService] OAuth callback arrived before browser flow resolved');
                        try {
                            await WebBrowser.dismissBrowser();
                        } catch {
                            // no-op
                        }
                    } else {
                        const browserOutcome = await browserOutcomePromise;
                        if (browserOutcome.kind === 'browser_error') {
                            throw browserOutcome.browserError;
                        }
                        if (browserOutcome.kind === 'browser') {
                            browserResult = browserOutcome.browserResult;
                            browserResultType = browserOutcome.browserResult.type;
                        } else {
                            externalBrowserOpened = true;
                            browserResultType = 'external_opened';
                        }
                    }
                } else if (firstOutcome.kind === 'browser_error') {
                    throw firstOutcome.browserError;
                } else if (firstOutcome.kind === 'browser') {
                    browserResult = firstOutcome.browserResult;
                    browserResultType = firstOutcome.browserResult.type;
                } else {
                    externalBrowserOpened = true;
                    browserResultType = 'external_opened';
                }

                if (!callbackUrl && browserResult) {
                    console.log('[SlackService] Browser result type:', browserResult.type);

                    // `openBrowserAsync` may return before the deep-link callback arrives
                    // (especially when Slack switches apps or after first-time install/login).
                    console.log('[SlackService] Waiting for Slack app/browser callback after browser result...');
                    callbackUrl = await waitForSlackCallback(SLACK_OAUTH_DISMISS_WAIT_MS);
                }
                if (!callbackUrl && externalBrowserOpened) {
                    console.log('[SlackService] Waiting for Slack callback after external browser launch...');
                    callbackUrl = await waitForSlackCallback(SLACK_OAUTH_DISMISS_WAIT_MS);
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
                } else if (browserResultType === 'cancel') {
                    throw new Error('Giris iptal edildi');
                } else if (externalBrowserOpened) {
                    throw new Error('OAuth callback alinamadi (Slack uygulama acilisi takilmis olabilir)');
                } else if (!browserResult) {
                    throw new Error('OAuth callback zaman asimina ugradi');
                } else {
                    throw new Error('OAuth ekrani kapandi (callback alinamadi)');
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
