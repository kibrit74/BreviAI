/**
 * Google Service - OAuth & API Integration
 * Gmail, Sheets, Drive API support
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Complete auth session for web browser
WebBrowser.maybeCompleteAuthSession();

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const GOOGLE_CONFIG = {
    clientId: '833238118432-mqj511qs6qn50u33fshl1ohkb62a1tm7.apps.googleusercontent.com',
    scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
    ],
};

const STORAGE_KEYS = {
    accessToken: '@google_access_token',
    refreshToken: '@google_refresh_token',
    userInfo: '@google_user_info',
    expiresAt: '@google_expires_at',
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface GoogleUserInfo {
    email: string;
    name: string;
    picture?: string;
}

export interface GoogleAuthState {
    isSignedIn: boolean;
    user: GoogleUserInfo | null;
    accessToken: string | null;
}

// ═══════════════════════════════════════════════════════════════
// GOOGLE SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class GoogleService {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private expiresAt: number = 0;
    private userInfo: GoogleUserInfo | null = null;

    constructor() {
        this.loadStoredAuth();
    }

    // ─────────────────────────────────────────────────────────────
    // AUTH METHODS
    // ─────────────────────────────────────────────────────────────

    private async loadStoredAuth(): Promise<void> {
        try {
            const [accessToken, refreshToken, userInfoStr, expiresAtStr] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.accessToken),
                AsyncStorage.getItem(STORAGE_KEYS.refreshToken),
                AsyncStorage.getItem(STORAGE_KEYS.userInfo),
                AsyncStorage.getItem(STORAGE_KEYS.expiresAt),
            ]);

            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
            this.expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;

            console.log('[GoogleService] Loaded auth:', {
                hasToken: !!accessToken,
                user: this.userInfo?.email
            });
        } catch (error) {
            console.error('[GoogleService] Error loading stored auth:', error);
        }
    }

    private async saveAuth(): Promise<void> {
        try {
            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.accessToken, this.accessToken || ''),
                AsyncStorage.setItem(STORAGE_KEYS.refreshToken, this.refreshToken || ''),
                AsyncStorage.setItem(STORAGE_KEYS.userInfo, JSON.stringify(this.userInfo)),
                AsyncStorage.setItem(STORAGE_KEYS.expiresAt, String(this.expiresAt)),
            ]);
        } catch (error) {
            console.error('[GoogleService] Error saving auth:', error);
        }
    }

    private async clearAuth(): Promise<void> {
        this.accessToken = null;
        this.refreshToken = null;
        this.userInfo = null;
        this.expiresAt = 0;

        try {
            await Promise.all([
                AsyncStorage.removeItem(STORAGE_KEYS.accessToken),
                AsyncStorage.removeItem(STORAGE_KEYS.refreshToken),
                AsyncStorage.removeItem(STORAGE_KEYS.userInfo),
                AsyncStorage.removeItem(STORAGE_KEYS.expiresAt),
            ]);
        } catch (error) {
            console.error('[GoogleService] Error clearing auth:', error);
        }
    }

    /**
     * Get current auth state
     */
    getAuthState(): GoogleAuthState {
        return {
            isSignedIn: !!this.accessToken && Date.now() < this.expiresAt,
            user: this.userInfo,
            accessToken: this.accessToken,
        };
    }

    /**
     * Sign in with Google OAuth via Backend
     * (Backend handles the actual OAuth flow and returns tokens via deep link)
     */
    async signIn(): Promise<GoogleAuthState> {
        try {
            // Mobile redirect URI (deep link)
            const redirectUri = AuthSession.makeRedirectUri({
                scheme: 'brevi-ai',
                path: 'oauth',
            });

            // Determine Backend URL based on environment
            // __DEV__ is true in development mode
            let backendBaseUrl = 'https://breviai.vercel.app';

            if (__DEV__) {
                // In local dev, use localhost (10.0.2.2 for Android Emulator)
                // If you are using physical device, you might need to change this to your LAN IP (e.g. 192.168.1.x)
                /* 
                   IMPORTANT: If testing on physical device, replace '10.0.2.2' with your computer's IP address.
                   Running 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) to find it.
                */
                const isAndroidEmulator = (JSON.stringify(process.env).includes('android') || true); // Simplified check
                // For now, let's try to detect or default to a safe local value
                // Note: Expo Go handles localhost differently. 
                // Best practice: Use your LAN IP if possible.
                // For Android Emulator: 10.0.2.2
                // For iOS Simulator: localhost

                // UNCOMMENT THE LINE BELOW AND ENTER YOUR IP IF USING PHYSICAL DEVICE
                // backendBaseUrl = 'http://192.168.1.35:3000'; 

                // Default for Emulator
                // backendBaseUrl = 'http://10.0.2.2:3000'; 
            }

            // FOR DEBUGGING: Force pick one or the other if auto-detect fails
            // backendBaseUrl = 'http://192.168.1.25:3000'; // Change this to your local IP!

            // Backend Auth Start URL
            const authUrl = `${backendBaseUrl}/api/auth/google/start?redirect_uri=${encodeURIComponent(redirectUri)}`;

            console.log('[GoogleService] ===== BACKEND OAUTH START =====');
            console.log('[GoogleService] Backend URL:', backendBaseUrl);
            console.log('[GoogleService] Full Auth URL:', authUrl);
            console.log('[GoogleService] Callback URI:', redirectUri);

            // Open browser to backend auth start
            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

            console.log('[GoogleService] Auth result type:', result.type);

            if (result.type === 'success' && result.url) {
                console.log('[GoogleService] Success URL:', result.url);

                // Parse tokens from deep link query params
                // Format: brevi-ai://oauth?access_token=...&refresh_token=...&expires_in=...
                const urlObj = new URL(result.url);
                const queryParams = new URLSearchParams(urlObj.search);

                const accessToken = queryParams.get('access_token');
                const refreshToken = queryParams.get('refresh_token');
                const expiresIn = queryParams.get('expires_in');
                const error = queryParams.get('error');

                if (error) {
                    console.error('[GoogleService] OAuth error from backend:', error);
                    throw new Error(`OAuth hatası: ${error}`);
                }

                if (accessToken) {
                    this.accessToken = accessToken;
                    this.refreshToken = refreshToken || null;
                    this.expiresAt = expiresIn
                        ? Date.now() + (parseInt(expiresIn, 10) * 1000)
                        : Date.now() + 3600000;

                    // Fetch user info
                    await this.fetchUserInfo();
                    await this.saveAuth();

                    console.log('[GoogleService] Sign in successful:', this.userInfo?.email);
                    return this.getAuthState();
                }

                throw new Error('Token alınamadı');
            } else if (result.type === 'cancel') {
                throw new Error('Giriş iptal edildi');
            } else {
                throw new Error('OAuth başarısız oldu');
            }
        } catch (error) {
            console.error('[GoogleService] Sign in error:', error);
            throw error;
        }
    }

    /**
     * Sign out
     */
    async signOut(): Promise<void> {
        await this.clearAuth();
        console.log('[GoogleService] Signed out');
    }

    /**
     * Fetch user info from Google
     */
    private async fetchUserInfo(): Promise<void> {
        if (!this.accessToken) return;

        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.userInfo = {
                    email: data.email,
                    name: data.name,
                    picture: data.picture,
                };
            }
        } catch (error) {
            console.error('[GoogleService] Error fetching user info:', error);
        }
    }

    /**
     * Ensure we have a valid access token
     */
    private async ensureValidToken(): Promise<string> {
        if (!this.accessToken) {
            throw new Error('Not signed in to Google');
        }

        // Check if token is expired or about to expire
        if (Date.now() >= this.expiresAt - 60000) {
            // Token expired, need to refresh or re-sign in
            if (this.refreshToken) {
                await this.refreshAccessToken();
            } else {
                throw new Error('Token expired, please sign in again');
            }
        }

        return this.accessToken;
    }

    private async refreshAccessToken(): Promise<void> {
        // Token refresh implementation would go here
        // For simplicity, we'll require re-sign-in for now
        console.warn('[GoogleService] Token refresh not implemented, user needs to sign in again');
    }

    // ─────────────────────────────────────────────────────────────
    // GMAIL API
    // ─────────────────────────────────────────────────────────────

    /**
     * Send email using Gmail API
     */
    async sendEmail(
        to: string,
        subject: string,
        body: string,
        isHtml: boolean = false
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            const token = await this.ensureValidToken();

            // Create MIME message
            const mimeMessage = this.createMimeMessage(to, subject, body, isHtml);
            const encodedMessage = this.base64UrlEncode(mimeMessage);

            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ raw: encodedMessage }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[GoogleService] Email sent successfully:', data.id);
                return { success: true, messageId: data.id };
            } else {
                const error = await response.text();
                console.error('[GoogleService] Gmail API error:', error);
                return { success: false, error };
            }
        } catch (error) {
            console.error('[GoogleService] Send email error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private createMimeMessage(to: string, subject: string, body: string, isHtml: boolean): string {
        const from = this.userInfo?.email || 'me';
        const contentType = isHtml ? 'text/html' : 'text/plain';

        return [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `Content-Type: ${contentType}; charset=utf-8`,
            '',
            body,
        ].join('\r\n');
    }

    private base64UrlEncode(str: string): string {
        // Convert string to base64 and make it URL-safe
        const base64 = btoa(unescape(encodeURIComponent(str)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    // ─────────────────────────────────────────────────────────────
    // GOOGLE SHEETS API
    // ─────────────────────────────────────────────────────────────

    /**
     * Read data from Google Sheets
     */
    async readSheet(
        spreadsheetId: string,
        range: string
    ): Promise<{ success: boolean; data?: string[][]; error?: string }> {
        try {
            const token = await this.ensureValidToken();

            const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[GoogleService] Sheet read successful');
                return { success: true, data: data.values || [] };
            } else {
                const error = await response.text();
                return { success: false, error };
            }
        } catch (error) {
            console.error('[GoogleService] Read sheet error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Write data to Google Sheets
     */
    async writeSheet(
        spreadsheetId: string,
        range: string,
        values: string[][]
    ): Promise<{ success: boolean; updatedCells?: number; error?: string }> {
        try {
            const token = await this.ensureValidToken();

            const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[GoogleService] Sheet write successful');
                return { success: true, updatedCells: data.updatedCells };
            } else {
                const error = await response.text();
                return { success: false, error };
            }
        } catch (error) {
            console.error('[GoogleService] Write sheet error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Append data to Google Sheets
     */
    async appendSheet(
        spreadsheetId: string,
        range: string,
        values: string[][]
    ): Promise<{ success: boolean; updatedCells?: number; error?: string }> {
        try {
            const token = await this.ensureValidToken();

            const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[GoogleService] Sheet append successful');
                return { success: true, updatedCells: data.updates?.updatedCells };
            } else {
                const error = await response.text();
                return { success: false, error };
            }
        } catch (error) {
            console.error('[GoogleService] Append sheet error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // ─────────────────────────────────────────────────────────────
    // GOOGLE DRIVE API
    // ─────────────────────────────────────────────────────────────

    /**
     * Upload file to Google Drive
     */
    async uploadFile(
        fileUri: string,
        fileName: string,
        mimeType: string,
        folderId?: string
    ): Promise<{ success: boolean; fileId?: string; webViewLink?: string; error?: string }> {
        try {
            const token = await this.ensureValidToken();

            console.log('[GoogleService] Uploading file:', { fileUri, fileName, mimeType });

            // Read file as base64 using new File class (SDK 54+)
            const { File } = await import('expo-file-system');
            const file = new File(fileUri);

            // Check if file exists by trying to read it
            let base64Content: string;
            try {
                const bytes = await file.bytes();
                // Convert Uint8Array to base64
                let binary = '';
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                base64Content = btoa(binary);
            } catch (readError) {
                console.error('[GoogleService] File read error:', readError);
                return { success: false, error: 'Dosya okunamadı' };
            }

            // Create metadata
            const metadata: any = {
                name: fileName,
                mimeType,
            };

            if (folderId) {
                metadata.parents = [folderId];
            }

            // Use simple upload with base64
            // For files under 5MB, we can use simple upload
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const closeDelim = "\r\n--" + boundary + "--";

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: ' + mimeType + '\r\n' +
                'Content-Transfer-Encoding: base64\r\n\r\n' +
                base64Content +
                closeDelim;

            const uploadResponse = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/related; boundary="' + boundary + '"',
                    },
                    body: multipartRequestBody,
                }
            );

            if (uploadResponse.ok) {
                const data = await uploadResponse.json();
                console.log('[GoogleService] File uploaded:', data.id);
                return {
                    success: true,
                    fileId: data.id,
                    webViewLink: data.webViewLink
                };
            } else {
                const error = await uploadResponse.text();
                console.error('[GoogleService] Upload error response:', error);
                return { success: false, error };
            }
        } catch (error) {
            console.error('[GoogleService] Upload file error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// Export singleton instance
export const googleService = new GoogleService();
