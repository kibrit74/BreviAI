
import {
    OutlookSendConfig,
    OutlookReadConfig,
    ExcelReadConfig,
    ExcelWriteConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { Platform } from 'react-native';
import { apiService } from '../ApiService';
import { microsoftService } from '../MicrosoftService';

// Compatibility for Expo FileSystem
let FileSystem: any;
try { FileSystem = require('expo-file-system/legacy'); }
catch (e) { FileSystem = require('expo-file-system'); }

const UPLOAD_TYPE_BINARY = 0;

// Microsoft Graph API Base
const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';

async function getAccessToken(variableManager: VariableManager): Promise<string | null> {
    // 1. Try Microsoft Service (OAuth)
    const serviceToken = await microsoftService.getAccessToken();
    if (serviceToken) {
        return serviceToken;
    }

    // 2. Fallback to manual variable (BYOK)
    const customToken = variableManager.get('MICROSOFT_ACCESS_TOKEN');

    if (!customToken) {
        console.warn('No Microsoft Access Token found.');
        // Don't throw immediately, let caller handle or throw specific error
        return null;
    }
    return customToken;
}

export async function executeOutlookSend(
    config: OutlookSendConfig,
    variableManager: VariableManager
): Promise<any> {
    const to = variableManager.resolveString(config.to);
    const subject = variableManager.resolveString(config.subject);
    const body = variableManager.resolveString(config.body);

    const email = variableManager.get('OUTLOOK_EMAIL') || variableManager.resolveString((config as any).email || '');
    const password = variableManager.get('OUTLOOK_PASSWORD') || variableManager.resolveString((config as any).password || '');

    // Process attachments
    let attachments: any[] = [];
    const attachmentsVarName = (config as any).attachments;
    if (attachmentsVarName) {
        const attachmentData = variableManager.get(attachmentsVarName);
        if (attachmentData) {
            const items = Array.isArray(attachmentData) ? attachmentData : [attachmentData];
            for (const item of items) {
                if (item && (item.uri || typeof item === 'string')) {
                    try {
                        const uri = item.uri || item;

                        // Skip if URI doesn't look like a file path (e.g., plain text content)
                        if (typeof uri === 'string' && !uri.startsWith('file://') && !uri.startsWith('/') && !uri.startsWith('content://') && !uri.includes('/')) {
                            console.log('[OutlookNode] Skipping non-file attachment:', uri.substring(0, 30) + '...');
                            continue;
                        }

                        const filename = item.name || uri.split('/').pop() || 'file';

                        // Read file as Base64
                        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                        const mimeType = item.mimeType || 'application/octet-stream';

                        attachments.push({
                            filename: filename,
                            path: `data:${mimeType};base64,${base64}`
                        });
                    } catch (e) {
                        console.warn('[OutlookNode] Failed to read attachment:', e);
                    }
                }
            }
        }
    }

    if (email && password) {
        try {
            const result = await apiService.sendEmail(
                to,
                subject,
                body,
                body.replace(/\n/g, '<br>'),
                attachments.length > 0 ? attachments : undefined,
                undefined,
                {
                    host: 'smtp-mail.outlook.com',
                    port: 587,
                    secure: false, // StartTLS
                    user: email,
                    pass: password,
                    from: `"${variableManager.get('USER_NAME') || 'BreviAI User'}" <${email}>`
                }
            );

            if (result.success) {
                if (config.variableName) {
                    variableManager.set(config.variableName, { id: result.messageId });
                }
                return { success: true, messageId: result.messageId };
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    }

    // Fallback to Graph API
    const token = await getAccessToken(variableManager);
    if (!token) {
        return {
            success: false,
            error: 'Microsoft hesabıyla giriş yapılmadı. Lütfen ayarlardan Outlook kurulumunu tamamlayın.'
        };
    }

    const emailPayload = {
        message: {
            subject: subject,
            body: {
                contentType: config.isHtml ? "HTML" : "Text",
                content: body
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: to
                    }
                }
            ]
        },
        saveToSentItems: "true"
    };

    try {
        const response = await fetch(`${GRAPH_API_URL}/me/sendMail`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errMsg = errorData.error?.message || 'Failed to send outlook email';

            if (response.status === 401 || response.status === 403) {
                throw new Error("Oturum süresi doldu veya yetki verilmedi. Lütfen Ayarlar > Outlook Kurulumu sayfasından tekrar giriş yapın.");
            }

            throw new Error(errMsg);
        }

        const result = { success: true, status: response.status };

        if (config.variableName) {
            variableManager.set(config.variableName, result);
        }

        return result;
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}


export async function executeOutlookRead(
    config: OutlookReadConfig,
    variableManager: VariableManager
): Promise<any> {
    const folder = config.folderName || 'Inbox';
    const top = config.maxResults || 10;

    // 1. Try OAuth Token
    const token = await getAccessToken(variableManager);

    if (token) {
        // Use Graph API
        try {
            // Filter query construction
            let query = `$top=${top}&$select=id,receivedDateTime,subject,bodyPreview,from`;

            // Map common folder names to Graph API well-known names if needed, 
            // but generally 'Inbox' works implicitly for /me/mailFolders
            // Or simpler: /me/messages usually fetches from Inbox by default.

            const url = `${GRAPH_API_URL}/me/messages?${query}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'Failed to fetch emails');
            }

            const data = await response.json();
            const messages = data.value.map((msg: any) => ({
                id: msg.id,
                subject: msg.subject,
                from: msg.from?.emailAddress?.address,
                fromName: msg.from?.emailAddress?.name,
                preview: msg.bodyPreview,
                date: msg.receivedDateTime
            }));

            if (config.variableName) {
                variableManager.set(config.variableName, messages);
            }

            return { success: true, count: messages.length, emails: messages };

        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    // 2. Fallback to Native IMAP call (Original Logic) if NO token (but getAccessToken returns null cleanly now)
    // We already checked token. If missing, maybe user provided credentials in variables?
    // Let's keep Legacy IMAP support for users who prefer App Password.

    // Get credentials from variables
    const email = variableManager.get('OUTLOOK_EMAIL') || variableManager.resolveString((config as any).email || '');
    const password = variableManager.get('OUTLOOK_PASSWORD') || variableManager.resolveString((config as any).password || '');

    if (!email || !password) {
        return {
            success: false,
            error: 'Microsoft ile giriş yapılmadı (OAuth) ve Email/Şifre bulunamadı.'
        };
    }

    try {
        const BreviSettings = require('brevi-settings').default;
        const emails = await BreviSettings.fetchEmails(
            'outlook.office365.com',
            993,
            email,
            password,
            top
        );

        if (config.variableName) {
            variableManager.set(config.variableName, emails);
        }

        return { success: true, count: emails.length, emails: emails };

    } catch (error) {
        return { success: false, error: "IMAP Error: " + (error instanceof Error ? error.message : String(error)) };
    }
}


async function resolveFileId(
    config: { fileId?: string; fileName?: string },
    variableManager: VariableManager,
    token: string
): Promise<string | null> {
    const fileId = config.fileId ? variableManager.resolveString(config.fileId) : null;
    if (fileId) return fileId;

    const fileName = variableManager.resolveString(config.fileName || '');
    if (!fileName) return null;

    try {
        // Simple search in root
        const searchUrl = `${GRAPH_API_URL}/me/drive/root/search(q='${fileName}')?select=id,name,webUrl`;
        const res = await fetch(searchUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) return null;

        const data = await res.json();
        // Filter likely matches (exact name preference)
        const match = data.value?.find((f: any) => f.name.toLowerCase() === fileName.toLowerCase()) || data.value?.[0];

        return match ? match.id : null;
    } catch (e) {
        console.error('File resolution failed:', e);
        return null;
    }
}

export async function executeExcelRead(
    config: ExcelReadConfig,
    variableManager: VariableManager
): Promise<any> {
    const token = await getAccessToken(variableManager);
    if (!token) return { success: false, error: 'Microsoft account not connected' };

    const fileId = await resolveFileId(config, variableManager, token);
    if (!fileId) return { success: false, error: 'Excel file not found: ' + (config.fileName || config.fileId) };

    const range = variableManager.resolveString(config.range);

    try {
        const url = `${GRAPH_API_URL}/me/drive/items/${fileId}/workbook/worksheets('${range.split('!')[0]}')/range(address='${range}')`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Failed to read Excel file');
        }

        const data = await response.json();
        const values = data.values; // [][] array

        if (config.variableName) {
            variableManager.set(config.variableName, values);
        }

        return { success: true, rows: values?.length || 0, data: values };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function executeExcelWrite(
    config: ExcelWriteConfig,
    variableManager: VariableManager
): Promise<any> {
    const token = await getAccessToken(variableManager);
    if (!token) return { success: false, error: 'Microsoft account not connected' };

    const fileId = await resolveFileId(config, variableManager, token);
    if (!fileId) return { success: false, error: 'Excel file not found: ' + (config.fileName || config.fileId) };

    const range = variableManager.resolveString(config.range);

    let values = [];
    try {
        const rawValues = variableManager.resolveString(config.values);
        // Try parsing JSON, or if it's a simple comma list, convert to 2D array
        if (rawValues.startsWith('[') && rawValues.endsWith(']')) {
            values = JSON.parse(rawValues);
        } else {
            // Treat as single row of CSV-like values
            values = [rawValues.split(',').map(s => s.trim())];
        }
    } catch (e) {
        return { success: false, error: 'Invalid values format for Excel Write' };
    }

    try {
        // range e.g. Sheet1!A1
        const url = `${GRAPH_API_URL}/me/drive/items/${fileId}/workbook/worksheets('${range.split('!')[0]}')/range(address='${range}')`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values })
        });

        if (!response.ok) {
            const err = await response.json();
            // Try session creation if needed (mostly for large files, but good to handle)
            throw new Error(err.error?.message || 'Failed to write to Excel');
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

// ═══════════════════════════════════════════════════════════════
// ONEDRIVE NODES
// ═══════════════════════════════════════════════════════════════

import {
    OneDriveUploadConfig,
    OneDriveDownloadConfig,
    OneDriveListConfig
} from '../../types/workflow-types';

export async function executeOneDriveUpload(
    config: OneDriveUploadConfig,
    variableManager: VariableManager
): Promise<any> {
    console.log('[ONEDRIVE_UPLOAD] Starting upload...');

    const token = await getAccessToken(variableManager);
    if (!token) return { success: false, error: 'Microsoft hesabı bağlı değil' };

    // Get file path from variable or direct value
    const filePathRaw = variableManager.resolveString(config.filePath);
    const fileData = variableManager.get(config.filePath) || filePathRaw;

    // Handle both direct path and object with uri
    let filePath = typeof fileData === 'object' && fileData.uri ? fileData.uri : filePathRaw;
    const originalName = typeof fileData === 'object' && fileData.name ? fileData.name : filePath.split('/').pop() || 'file';
    const fileName = config.fileName ? variableManager.resolveString(config.fileName) : originalName;

    // Ensure scheme for absolute paths
    if (filePath && filePath.startsWith('/') && !filePath.startsWith('file://')) {
        filePath = 'file://' + filePath;
    }

    console.log('[ONEDRIVE_UPLOAD] Uploading file:', filePath);

    try {
        // Construct Upload URL
        let uploadUrl = `${GRAPH_API_URL}/me/drive/root:/${fileName}:/content`;
        if (config.folderId) {
            const folderId = variableManager.resolveString(config.folderId);
            uploadUrl = `${GRAPH_API_URL}/me/drive/items/${folderId}:/${fileName}:/content`;
        }

        // Use Native Upload (Better for memory and permissions)
        console.log('[ONEDRIVE_UPLOAD] Starting native uploadAsync...');
        const response = await FileSystem.uploadAsync(uploadUrl, filePath, {
            httpMethod: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/octet-stream'
            },
            uploadType: UPLOAD_TYPE_BINARY
        });

        console.log('[ONEDRIVE_UPLOAD] Upload status:', response.status);

        if (response.status >= 200 && response.status < 300) {
            const data = JSON.parse(response.body);
            console.log('[ONEDRIVE_UPLOAD] Success! File ID:', data.id);
            const result = {
                success: true,
                id: data.id,
                name: data.name,
                webUrl: data.webUrl,
                size: data.size
            };

            if (config.variableName) {
                variableManager.set(config.variableName, result);
            }
            return result;
        } else {
            console.error('[ONEDRIVE_UPLOAD] Error body:', response.body);
            let errorMessage = 'Dosya yüklenemedi';
            try {
                const errJson = JSON.parse(response.body);
                errorMessage = errJson.error?.message || errorMessage;
            } catch (e) { }

            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('[ONEDRIVE_UPLOAD] Exception:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function executeOneDriveDownload(
    config: OneDriveDownloadConfig,
    variableManager: VariableManager
): Promise<any> {
    const token = await getAccessToken(variableManager);
    if (!token) return { success: false, error: 'Microsoft hesabı bağlı değil' };

    const fileId = await resolveFileId(config, variableManager, token);
    if (!fileId) return { success: false, error: 'Dosya bulunamadı: ' + (config.fileName || config.fileId) };

    try {
        // Get file metadata first
        const metaResponse = await fetch(`${GRAPH_API_URL}/me/drive/items/${fileId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!metaResponse.ok) {
            throw new Error('Dosya bilgisi alınamadı');
        }

        const metadata = await metaResponse.json();
        const fileName = metadata.name;

        // Download file content
        const downloadResponse = await fetch(`${GRAPH_API_URL}/me/drive/items/${fileId}/content`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!downloadResponse.ok) {
            throw new Error('Dosya indirilemedi');
        }

        // Save to local file system
        const arrayBuffer = await downloadResponse.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        const localPath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(localPath, base64, { encoding: 'base64' });

        const result = {
            success: true,
            localPath: localPath,
            name: fileName,
            size: metadata.size,
            uri: localPath
        };

        if (config.variableName) {
            variableManager.set(config.variableName, result);
        }

        return result;
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

export async function executeOneDriveList(
    config: OneDriveListConfig,
    variableManager: VariableManager
): Promise<any> {
    const token = await getAccessToken(variableManager);
    if (!token) return { success: false, error: 'Microsoft hesabı bağlı değil' };

    try {
        let url = `${GRAPH_API_URL}/me/drive/root/children`;

        if (config.folderId) {
            const folderId = variableManager.resolveString(config.folderId);
            url = `${GRAPH_API_URL}/me/drive/items/${folderId}/children`;
        }

        const top = config.maxResults || 50;
        url += `?$top=${top}&$select=id,name,size,webUrl,file,folder,createdDateTime`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Dosya listesi alınamadı');
        }

        const data = await response.json();
        const items = data.value.map((item: any) => ({
            id: item.id,
            name: item.name,
            size: item.size,
            webUrl: item.webUrl,
            isFolder: !!item.folder,
            mimeType: item.file?.mimeType,
            createdAt: item.createdDateTime
        }));

        const result = {
            success: true,
            count: items.length,
            items: items
        };

        if (config.variableName) {
            variableManager.set(config.variableName, items);
        }

        return result;
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}
