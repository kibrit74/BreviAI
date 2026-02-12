
import {
    WorkflowNode,
    GmailSendConfig,
    GmailReadConfig,
    GoogleSheetsReadConfig,
    GoogleSheetsWriteConfig,
    GoogleDriveUploadConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { Platform } from 'react-native';
import { apiService } from '../ApiService';
import { googleService } from '../GoogleService';

// Compatibility for Expo FileSystem (handling both Legacy and Modern exports)
let FileSystem: any;
try { FileSystem = require('expo-file-system/legacy'); }
catch (e) { FileSystem = require('expo-file-system'); }

const UPLOAD_TYPE_BINARY = 0; // Constants usually not exported in modern module

// Google API Base
const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

async function getAccessToken(variableManager: VariableManager): Promise<string | null> {
    // 1. Try to get user provided token from variables (BYOK)
    const customToken = variableManager.get('GOOGLE_ACCESS_TOKEN');
    if (customToken) return customToken;

    // 2. Fallback to global authenticated session (if exists)
    // Note: This requires the app to have proper scopes, which is limited in Play Store
    // For now, we rely on the user providing the token via variables or settings
    console.warn('No Google Access Token found. Please set GOOGLE_ACCESS_TOKEN variable.');
    throw new Error(
        "Google Erişim İzni Eksik! 🛑\n" +
        "Lütfen 'GMAIL_EMAIL' ve 'GMAIL_PASSWORD' (App Password) değişkenlerini tanımlayın VEYA kendi Client ID'nizi girin."
    );
    return null;
}

export async function executeGmailSend(
    config: GmailSendConfig,
    variableManager: VariableManager
): Promise<any> {
    const to = variableManager.resolveString(config.to);
    const subject = variableManager.resolveString(config.subject) || '(Konu Yok)';
    const body = variableManager.resolveString(config.body) || '(İçerik Yok)';

    // Check for App Password Credentials first
    // Allow aliases for better UX (GMAIL_MAIL is a common typo/pattern)
    const emailVar = variableManager.get('GMAIL_EMAIL') || variableManager.get('GMAIL_MAIL') || variableManager.get('GMAIL_USER');
    const passwordVar = variableManager.get('GMAIL_PASSWORD') || variableManager.get('GMAIL_PASS');

    console.log('[GmailNode] Debug Vars:', {
        emailVar: emailVar ? 'SET' : 'MISSING',
        passwordVar: passwordVar ? 'SET' : 'MISSING',
        allVars: variableManager.getAll(),
        configEmail: (config as any).email
    });

    const email = emailVar || variableManager.resolveString((config as any).email || '');
    const password = passwordVar || variableManager.resolveString((config as any).password || '');

    // Process attachments
    let attachments: any[] = [];
    const attachmentsVarName = (config as any).attachments; // Assuming config has this field
    if (attachmentsVarName) {
        const attachmentData = variableManager.get(attachmentsVarName);
        console.log('[GmailNode] Found attachment data:', attachmentData);

        if (attachmentData) {
            const items = Array.isArray(attachmentData) ? attachmentData : [attachmentData];
            for (const item of items) {
                if (item && (item.uri || typeof item === 'string')) {
                    try {
                        const uri = item.uri || item;
                        const filename = item.name || uri.split('/').pop() || 'file';

                        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                        const mimeType = item.mimeType || 'application/octet-stream';

                        attachments.push({
                            filename: filename,
                            path: `data:${mimeType};base64,${base64}`
                        });
                        console.log('[GmailNode] Processed attachment:', filename);
                    } catch (e) {
                        console.warn('[GmailNode] Failed to read attachment:', e);
                    }
                }
            }
        }
    }

    if (email && password) {
        // Use App Password via Backend Proxy
        try {
            const result = await apiService.sendEmail(
                to,
                subject,
                body,
                body.replace(/\n/g, '<br>'),
                attachments.length > 0 ? attachments : undefined, // Pass processed attachments
                undefined, // cc
                {
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    user: email,
                    pass: password.replace(/\s+/g, ''), // Remove spaces from App Password
                    from: `"${variableManager.get('USER_NAME') || 'BreviAI User'}" <${email}>`
                }
            );

            if (result.success) {
                if (config.variableName) {
                    variableManager.set(config.variableName, { id: result.messageId });
                }
                return { success: true, messageId: result.messageId };
            } else {
                const fullError = result.details ? `${result.error} (${result.details})` : result.error;
                throw new Error(fullError);
            }
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    }

    // Fallback to OAuth (Legacy)
    if (!email || !password) {
        // Check for common typos or misnamed variables (e.g. Turkish characters)
        const allKeys = Object.keys(variableManager.getAll());
        const typoEmail = allKeys.find(k => k !== 'GMAIL_EMAIL' && (
            k.includes('GMAIL') || k.includes('MAIL') || k.includes('GMAİL') || k.includes('E-MAIL')
        ));
        const typoPass = allKeys.find(k => k !== 'GMAIL_PASSWORD' && (
            k.includes('PASSWORD') || k.includes('PASS') || k.includes('SIFRE') || k.includes('ŞİFRE') || k.includes('KEY')
        ));

        if (typoEmail || typoPass) {
            const errorMsg = `GMAIL_EMAIL veya GMAIL_PASSWORD bulunamadı.\n` +
                (typoEmail ? `Bunu mu kastettiniz? "${typoEmail}" -> "GMAIL_EMAIL" olarak değiştirin.\n` : '') +
                (typoPass ? `Bunu mu kastettiniz? "${typoPass}" -> "GMAIL_PASSWORD" olarak değiştirin.` : '');

            throw new Error(errorMsg);
        }
    }

    try {
        const token = await getAccessToken(variableManager);
        if (!token) return { success: false, error: 'Authorization required' };

        const emailLines = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'Content-Type: text/plain; charset="UTF-8"',
            '',
            body
        ];

        const emailContent = emailLines.join('\r\n');
        let base64EncodedEmail = '';
        if (Platform.OS === 'web') {
            base64EncodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        } else {
            base64EncodedEmail = require('buffer').Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }

        const response = await fetch(`${GMAIL_API_URL}/messages/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                raw: base64EncodedEmail
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'Failed to send email');

        if (config.variableName) {
            variableManager.set(config.variableName, result);
        }

        return { success: true, messageId: result.id };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function executeGmailRead(
    config: GmailReadConfig,
    variableManager: VariableManager
): Promise<any> {
    // Token check removed for Native IMAP
    // const token = await getAccessToken(variableManager);
    // if (!token) return { success: false, error: 'Authorization required' };

    const maxResults = config.maxResults || 5;
    const query = variableManager.resolveString(config.query || 'is:unread');

    // 0. CHECK OAUTH (Priority 1)
    const authState = googleService.getAuthState();
    const headers = { 'Authorization': authState.accessToken ? `Bearer ${authState.accessToken}` : '' };

    if (authState.isSignedIn && authState.accessToken) {
        console.log('[GmailRead] Using OAuth2 Token from GoogleService');
        try {
            const apiResult = await apiService.readEmails({
                accessToken: authState.accessToken,
                maxResults: maxResults,
                searchQuery: query
            });

            if (apiResult.success && Array.isArray(apiResult.data)) {
                console.log(`[GmailRead] OAuth success! Fetched ${apiResult.data.length} emails.`);
                const emails = apiResult.data;
                if (emails.length > 0) (emails[0] as any)._source = 'oauth_backend';

                if (config.variableName) {
                    variableManager.set(config.variableName, emails);
                }
                return { success: true, count: emails.length, emails: emails };
            } else {
                throw new Error(apiResult.error || 'OAuth Fetch Failed');
            }
        } catch (e) {
            console.warn('[GmailRead] OAuth failed, falling back to Legacy Credentials:', e);
            // Verify if we should fallback or throw? 
            // If user logged in via OAuth, failure likely means scope issue or API error.
            // We'll let it fall through to legacy check below just in case they have App Password too.
        }
    }

    // 1. Legacy Credentials (App Password)
    // Get credentials from variables
    const email = variableManager.get('GMAIL_EMAIL') || variableManager.resolveString(config.email || '');
    const password = variableManager.get('GMAIL_PASSWORD') || variableManager.resolveString(config.password || '');

    if (!email || !password) {
        const availableKeys = Object.keys(variableManager.getAll()).join(', ');
        // If not signed in AND no credentials, give clear instruction
        if (!authState.isSignedIn) {
            return {
                success: false,
                error: `⚠️ Yetkilendirme Hatası: Lütfen yan menüden 'Ayarlar > Gmail'e Giriş Yap' seçeneğini kullanarak giriş yapın VEYA App Password değişkenlerini tanımlayın.`
            };
        }
    }

    try {
        console.log('[GmailRead] Attempting to fetch emails...');
        console.log('[GmailRead] Params:', {
            host: 'imap.gmail.com',
            user: email ? 'SET (Starts with ' + email.substring(0, 3) + ')' : 'MISSING',
            pass: password ? 'SET (Length: ' + password.length + ')' : 'MISSING',
            maxResults,
            query
        });

        let emails: any[] = [];
        let backendError: string | null = null;

        // 1. Try Backend API Proxy FIRST (Priority)
        try {
            console.log('[executeGmailRead] Trying Backend API Proxy...');
            const apiResult = await apiService.readEmails({
                host: 'imap.gmail.com',
                port: 993,
                user: email,
                pass: password,
                maxResults: maxResults,
                searchQuery: query
            });

            if (apiResult.success && Array.isArray(apiResult.data)) {
                console.log(`[executeGmailRead] Backend Proxy success! Fetched ${apiResult.data.length} emails.`);
                emails = apiResult.data;
                if (emails.length > 0) (emails[0] as any)._source = 'backend';
            } else {
                console.log('[executeGmailRead] Backend Proxy returned error:', apiResult);
                // CRITICAL: Throw DETAILED error to user
                const errorMsg = apiResult.details || apiResult.error || JSON.stringify(apiResult);
                throw new Error(`Gmail Backend Error: ${errorMsg}. (Mock Fallback Disabled)`);
            }
        } catch (e: any) {
            console.warn('[executeGmailRead] Backend Proxy exception:', e);
            // CRITICAL: Throw error to user
            throw new Error(`Gmail Connection Error: ${e.message || JSON.stringify(e)}. (Mock Fallback Disabled)`);
        }

        // 2. Fallback REMOVED

        // Final check: If success but empty, we return empty. 
        // We do NOT throw here because failures are already thrown in the catch blocks above.
        if (emails.length === 0) {
            console.log('[executeGmailRead] Completed with 0 emails found (This is valid).');
        }

        console.log('[GmailRead] Success! Count:', emails?.length);

        if (config.variableName) {
            variableManager.set(config.variableName, emails);
        }

        return { success: true, count: emails.length, emails: emails };

    } catch (error: any) {
        console.error('[GmailRead] Error:', error);

        // Final fallback attempt if main block crashed
        try {
            console.log('[executeGmailRead] Crash recovery: Trying Backend API Proxy...');
            const apiResult = await apiService.readEmails({
                host: 'imap.gmail.com',
                port: 993,
                user: variableManager.get('GMAIL_EMAIL') || '',
                pass: variableManager.get('GMAIL_PASSWORD') || '',
                maxResults: maxResults
            });
            if (apiResult.success && apiResult.data) {
                console.log(`[executeGmailRead] Crash recovery via Backend Proxy success! Fetched ${apiResult.data.length} emails.`);
                return { success: true, count: apiResult.data.length, emails: apiResult.data };
            }
        } catch (e) {
            console.warn('[executeGmailRead] Secondary crash recovery failed:', e);
        }

        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}



// Placeholder implementations for Sheets/Drive to keep file complete
export async function executeGoogleSheetsRead(
    config: GoogleSheetsReadConfig,
    vm: VariableManager
): Promise<any> {
    let spreadsheetId = vm.resolveString(config.spreadsheetId);
    const range = vm.resolveString(config.range);

    // Feature: Auto-extract ID from URL if user pasted the whole link
    if (spreadsheetId && spreadsheetId.includes('docs.google.com')) {
        const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
            console.log(`[GoogleSheets] Extracted ID from URL: ${match[1]}`);
            spreadsheetId = match[1];
        }
    }

    // Validation: Check for defaults/placeholders
    if (!spreadsheetId || spreadsheetId.includes('LÜTFEN_') || spreadsheetId.includes('ENTER_SHEET_ID')) {
        return {
            success: false,
            error: 'Google Sheets ID Girilmedi! 🛑\nLütfen nod ayarlarına girip "Spreadsheet ID" alanını doldurun.'
        };
    }

    if (!range) {
        return { success: false, error: 'Tablo aralığı (Range) belirtilmedi' };
    }

    try {
        console.log(`[GoogleSheets] Reading ${spreadsheetId} range ${range}`);

        let data: any[] | undefined;
        let source = 'backend';

        // 1. Try Client-Side OAuth FIRST (Priority)
        const authState = googleService.getAuthState();
        if (authState.isSignedIn) {
            console.log('[GoogleSheets] User is signed in. Attempting Client-Side OAuth read...');
            try {
                const clientResult = await googleService.readSheet(spreadsheetId, range);
                if (clientResult.success && clientResult.data) {
                    console.log('[GoogleSheets] Client-Side read success!');
                    data = clientResult.data;
                    source = 'client_oauth';
                } else {
                    console.warn('[GoogleSheets] Client-Side read failed:', clientResult.error);
                    // Don't throw yet, let it fall back to backend
                }
            } catch (clientError) {
                console.error('[GoogleSheets] Client-Side exception:', clientError);
            }
        }

        // 2. Fallback to Backend Proxy (Service Account)
        if (!data) {
            console.log('[GoogleSheets] Attempting Backend Proxy read...');
            const response = await apiService.readSheet(spreadsheetId, range);

            if (response.success) {
                data = response.data;
                source = 'backend_proxy';
            } else {
                // Both methods failed
                throw new Error(response.error || 'Failed to read sheet via both Client and Backend.');
            }
        }

        if (data) {
            // Keep a copy of the raw data (array of arrays) for nodes that need column indices
            const rawData = data;

            // Auto-convert to JSON array of objects if headers exist
            // Assuming first row is headers
            if (Array.isArray(data) && data.length > 1) {
                const headers = data[0];
                const rows = data.slice(1);

                const jsonData = rows.map((row: any[]) => {
                    const obj: any = {};
                    headers.forEach((header: string, index: number) => {
                        // Clean header keys (remove spaces/special chars if needed, but keeping raw is safer for now)
                        obj[header] = row[index];
                    });
                    return obj;
                });

                // Attach raw data as a non-enumerable property for nodes that need column indices
                // This preserves backward compatibility with JSON.stringify and iterations
                Object.defineProperty(jsonData, '_raw', {
                    value: rawData,
                    enumerable: false,
                    writable: false
                });

                // If converted successfully, use that as the primary data
                data = jsonData;
                console.log(`[GoogleSheets] Converted ${rows.length} rows to JSON objects using source: ${source}`);
            }

            if (config.variableName) {
                // Store as object (not stringified) to preserve _raw property for downstream nodes
                vm.set(config.variableName, data);
            }

            return { success: true, count: data.length, data: data, _source: source };
        } else {
            return { success: false, error: 'No data found' };
        }

    } catch (error) {
        console.error('[GoogleSheets] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
export async function executeGoogleSheetsWrite(config: GoogleSheetsWriteConfig, vm: VariableManager) { return { success: true }; }
export async function executeGoogleDriveUpload(
    config: GoogleDriveUploadConfig,
    variableManager: VariableManager
): Promise<any> {
    console.log('[GoogleDrive] Starting upload...');

    // 1. Get Authentication
    const authState = googleService.getAuthState();
    let token = authState.accessToken;

    if (!authState.isSignedIn || !token) {
        console.log('[GoogleDrive] Not signed in, checking variables...');
        // Fallback to manual token
        token = variableManager.get('GOOGLE_ACCESS_TOKEN') || variableManager.get('GMAIL_ACCESS_TOKEN');

        if (!token) {
            // Try to sign in if interactive context allowed (hard to do in node executor without UI trigger)
            // returning error for now
            return {
                success: false,
                error: 'Google hesabına giriş yapılmamış. Lütfen ayarlardan Google ile giriş yapın.'
            };
        }
    }

    // 2. Resolve File
    const filePathRaw = variableManager.resolveString(config.filePath);
    const fileData = variableManager.get(config.filePath) || filePathRaw;

    let filePath = typeof fileData === 'object' && fileData.uri ? fileData.uri : filePathRaw;
    const originalName = typeof fileData === 'object' && fileData.name ? fileData.name : filePath.split('/').pop() || 'file';
    const fileName = config.fileName ? variableManager.resolveString(config.fileName) : originalName;

    // Ensure scheme
    if (filePath && filePath.startsWith('/') && !filePath.startsWith('file://')) {
        filePath = 'file://' + filePath;
    }

    if (!filePath) {
        return { success: false, error: 'Dosya yolu bulunamadı.' };
    }

    try {
        console.log('[GoogleDrive] Uploading file:', filePath);

        // 3. Upload Content (Step 1 of 2: Resumable/Media upload)
        // We use "media" upload type via uploadAsync for efficiency, but it creates "Untitled" file usually
        // URL: POST https://www.googleapis.com/upload/drive/v3/files?uploadType=media

        const uploadResponse = await FileSystem.uploadAsync(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=media',
            filePath,
            {
                httpMethod: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/octet-stream' // Let Drive detect or we update later
                },
                uploadType: UPLOAD_TYPE_BINARY
            }
        );

        if (uploadResponse.status !== 200) {
            console.error('[GoogleDrive] Upload failed:', uploadResponse.body);
            throw new Error('Dosya yüklenemedi. Status: ' + uploadResponse.status);
        }

        const fileResult = JSON.parse(uploadResponse.body);
        const fileId = fileResult.id;
        console.log('[GoogleDrive] Content uploaded. ID:', fileId);

        // 4. Update Metadata (Step 2 of 2: Set Name and Parent)
        const metadata: any = {
            name: fileName
        };

        if (config.folderId) {
            const folderId = variableManager.resolveString(config.folderId);
            if (folderId) {
                // Determine if we need to remove from 'root' (Drive API default parents)
                // Actually 'addParents' query param is safer
                console.log('[GoogleDrive] Moving to folder:', folderId);
                // We use PATCH with addParents/removeParents
                // But simplest is to just Include parents in body? only on create.
                // On update, we use addParents query param.
            }
        }

        // Prepare Patch URL
        let patchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
        const queryParams = [];
        if (config.folderId) {
            const folderId = variableManager.resolveString(config.folderId);
            if (folderId) queryParams.push(`addParents=${folderId}`);
        }

        if (queryParams.length > 0) {
            patchUrl += '?' + queryParams.join('&');
        }

        const updateResponse = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });

        if (!updateResponse.ok) {
            console.warn('[GoogleDrive] Metadata update failed, but file exists:', await updateResponse.text());
            // We consider it partial success? Or fail? The file is there but might be named wrong.
            // Let's rely on the fileResult mostly, but return combined data.
        } else {
            const updateData = await updateResponse.json();
            fileResult.name = updateData.name;
            fileResult.parents = updateData.parents;
            fileResult.webViewLink = updateData.webViewLink; // Useful for user
        }

        const finalResult = {
            success: true,
            id: fileId,
            name: fileResult.name,
            webViewLink: fileResult.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
            size: fileResult.size
        };

        if (config.variableName) {
            variableManager.set(config.variableName, finalResult);
        }

        return finalResult;

    } catch (error) {
        console.error('[GoogleDrive] Exception:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
