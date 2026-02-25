/**
 * Service Integration Nodes Execution Logic
 * Google Translate, Telegram, Slack
 */

import {
    GoogleTranslateConfig,
    TelegramSendConfig,
    SlackSendConfig,
    DiscordSendConfig,
    NotionCreateConfig,
    NotionReadConfig,
    PhilipsHueConfig,
    RememberInfoConfig,
    SwitchConfig,
    FacebookLoginConfig,
    InstagramPostConfig
} from '../../types/workflow-types';
import * as WebBrowser from 'expo-web-browser';
import { AgentMemoryService } from '../AgentMemoryService';
import { VariableManager } from '../VariableManager';
import { workflowEngine } from '../WorkflowEngine';
import { secureStorage } from '../SecureStorage';

// Fallback defaults (used when SecureStore has no saved values)
const DEFAULT_FB_APP_ID = '1395089878474790';
const FB_DISCOVERY = {
    authorizationEndpoint: 'https://www.facebook.com/v12.0/dialog/oauth',
    tokenEndpoint: 'https://graph.facebook.com/v12.0/oauth/access_token',
};

/** Facebook App ID'yi gÃ¼venli depolamadan Ã§eker */
async function getFacebookAppId(): Promise<string> {
    return await secureStorage.getSecure('facebookAppId') || DEFAULT_FB_APP_ID;
}
// Fallback defaults for image hosting services
const DEFAULT_IMAGE_HOST_KEY = '6d207e02198a847aa98d0a2a901485a5';
const DEFAULT_IMGBB_KEY = '3e45e975b8bf0b0e9ee12c28dae0f7e8';

/** Image hosting API key'lerini gÃ¼venli depolamadan Ã§eker */
async function getImageHostKeys(): Promise<{ imageHostKey: string; imgbbKey: string }> {
    const imageHostKey = await secureStorage.getSecure('imageHostApiKey') || DEFAULT_IMAGE_HOST_KEY;
    const imgbbKey = await secureStorage.getSecure('imgbbApiKey') || DEFAULT_IMGBB_KEY;
    return { imageHostKey, imgbbKey };
}

// --- Google Translate ---
export async function executeGoogleTranslate(
    config: GoogleTranslateConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const text = variableManager.resolveString(config.text);
        if (!text) return { success: false, error: 'Ã‡evrilecek metin boÅŸ' };

        const target = config.targetLanguage || 'tr';
        const source = config.sourceLanguage || 'auto';
        const apiKey = config.apiKey;

        let translatedText = '';
        let provider = 'free';

        if (apiKey) {
            // Official Google Cloud Translation API
            provider = 'official';
            const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: text,
                    target: target,
                    source: source === 'auto' ? undefined : source,
                    format: 'text'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Google Cloud Translation API Error');
            }

            if (data.data?.translations?.length > 0) {
                translatedText = data.data.translations[0].translatedText;
            } else {
                throw new Error('No translation returned');
            }

        } else {
            // Free API (Limited reliability)
            // Using Google Apps Script proxy or direct undocumented API
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Translation API failed');

            const result = await response.json();
            // Result format: [[["Translated Text", "Original Text", ...]], ...]
            translatedText = result[0][0][0];
        }

        variableManager.set(config.variableName, translatedText);

        return {
            success: true,
            original: text,
            translated: translatedText,
            language: target,
            provider
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Translation failed'
        };
    }
}

// --- Telegram ---
// --- Telegram ---
export async function executeTelegramSend(
    config: TelegramSendConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const token = variableManager.resolveString(config.botToken);
        const chatId = variableManager.resolveString(config.chatId);
        const operation = config.operation || 'sendMessage';

        if (!token || !chatId) {
            return { success: false, error: 'Telegram ayarlarÄ± eksik (Token veya ChatID)' };
        }

        const baseUrl = `https://api.telegram.org/bot${token}`;
        let url = '';
        let body: any;
        let headers: Record<string, string> = {};

        if (operation === 'sendMessage') {
            // Support both 'message' and 'text' properties for compatibility
            let message = variableManager.resolveString(config.message || config.text);
            if (!message) return { success: false, error: 'Mesaj boÅŸ olamaz' };

            // Strip markdown code blocks that cause Telegram parsing errors
            message = message.replace(/```[\w]*\n?/g, '').replace(/```/g, '');
            // Strip inline backticks for safety
            message = message.replace(/`/g, '');

            url = `${baseUrl}/sendMessage`;
            headers['Content-Type'] = 'application/json';

            // Try with Markdown first, then fallback to plain text
            const parseMode = config.parseMode || 'Markdown';
            body = JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: parseMode
            });

            console.log(`[Telegram] Executing ${operation} to ${url}`);

            let response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: body
            });

            let data = await response.json();

            // If Markdown parsing fails, retry without parse_mode
            if (!data.ok && data.description?.includes("can't parse entities")) {
                console.warn('[Telegram] Markdown parse failed, retrying without parse_mode...');
                body = JSON.stringify({
                    chat_id: chatId,
                    text: message
                    // No parse_mode = plain text
                });
                response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: body
                });
                data = await response.json();
            }

            if (!data.ok) {
                throw new Error(data.description || `Telegram API Error (${data.error_code})`);
            }

            return {
                success: true,
                messageId: data.result.message_id,
                details: data.result
            };
        }
        else if (operation === 'sendLocation') {
            const lat = Number(variableManager.resolveString(String(config.latitude || '')));
            const long = Number(variableManager.resolveString(String(config.longitude || '')));

            if (isNaN(lat) || isNaN(long)) return { success: false, error: 'GeÃ§ersiz konum (Lat/Long)' };

            url = `${baseUrl}/sendLocation`;
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify({
                chat_id: chatId,
                latitude: lat,
                longitude: long
            });
        }
        else if (operation === 'sendPhoto' || operation === 'sendDocument') {
            const filePath = variableManager.resolveString(config.filePath);
            const caption = variableManager.resolveString(config.message);

            if (!filePath) return { success: false, error: 'Dosya yolu belirtilmedi' };

            url = `${baseUrl}/${operation}`;

            // FormData oluÅŸtur
            const formData = new FormData();
            formData.append('chat_id', chatId);
            if (caption) {
                formData.append('caption', caption);
                formData.append('parse_mode', config.parseMode || 'Markdown');
            }

            // Dosya ekle
            const fileName = filePath.split('/').pop() || 'file';
            const fileType = operation === 'sendPhoto' ? 'image/jpeg' : 'application/octet-stream';

            // React Native'de FormData dosya formatÄ±: { uri, name, type }
            formData.append(operation === 'sendPhoto' ? 'photo' : 'document', {
                uri: filePath,
                name: fileName,
                type: fileType,
            } as any);

            body = formData;
            // Content-Type: multipart/form-data browser/RN tarafÄ±ndan otomatik set edilir boundary ile birlikte.
            // Bu yÃ¼zden headers'a eklemiyoruz.
        }

        console.log(`[Telegram] Executing ${operation} to ${url}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.description || `Telegram API Error (${data.error_code})`);
        }

        return {
            success: true,
            messageId: data.result.message_id,
            details: data.result
        };

    } catch (error) {
        console.error('[Telegram] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Telegram send failed'
        };
    }
}

// --- Slack ---
export async function executeSlackSend(
    config: SlackSendConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const webhookUrl = variableManager.resolveString(config.webhookUrl);
        const message = variableManager.resolveString(config.message);
        const mode = (config.mode || (((config.apiToken || config.botToken) && config.channel) ? 'bot' : 'webhook')) as 'webhook' | 'bot';
        const token = variableManager.resolveString(config.apiToken || config.botToken);
        const channel = variableManager.resolveString(config.channel);
        const apiUrl = variableManager.resolveString(config.apiUrl) || 'https://slack.com/api/chat.postMessage';
        const blocksStr = variableManager.resolveString(config.blocks);

        let parsedBlocks: any[] | undefined;
        if (blocksStr) {
            try {
                const parsed = JSON.parse(blocksStr);
                if (!Array.isArray(parsed)) {
                    return { success: false, error: 'Slack Blocks JSON bir dizi (array) olmali' };
                }
                parsedBlocks = parsed;
            } catch {
                return { success: false, error: 'Slack Blocks JSON gecersiz' };
            }
        }

        if (mode === 'bot') {
            if (!token || !channel) {
                return { success: false, error: 'Slack API modu icin API Token ve Kanal gerekli' };
            }
            if (!message && !parsedBlocks) {
                return { success: false, error: 'Mesaj veya Blocks JSON bos olamaz' };
            }

            const payload: any = { channel };
            if (message) payload.text = message;
            if (parsedBlocks) payload.blocks = parsedBlocks;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.ok) {
                const errText = data?.error || `HTTP ${response.status}`;
                throw new Error(`Slack API Error: ${errText}`);
            }

            const botResult = {
                success: true,
                mode: 'bot',
                channel: data.channel,
                ts: data.ts,
                response: data
            };
            if (config.variableName) {
                variableManager.set(config.variableName, botResult);
            }
            return botResult;
        }

        if (!webhookUrl) {
            return { success: false, error: 'Webhook URL bos olamaz' };
        }
        if (!message && !parsedBlocks) {
            return { success: false, error: 'Mesaj veya Blocks JSON bos olamaz' };
        }

        const webhookPayload: any = {};
        if (message) webhookPayload.text = message;
        if (parsedBlocks) webhookPayload.blocks = parsedBlocks;

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Slack API Error: ${errText}`);
        }

        const webhookResult = { success: true, mode: 'webhook' };
        if (config.variableName) {
            variableManager.set(config.variableName, webhookResult);
        }
        return webhookResult;

    } catch (error) {
        const errorResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Slack send failed'
        };
        if (config.variableName) {
            variableManager.set(config.variableName, errorResult);
        }
        return errorResult;
    }
}
// --- Discord ---
export async function executeDiscordSend(
    config: DiscordSendConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const webhookUrl = variableManager.resolveString(config.webhookUrl);
        const message = variableManager.resolveString(config.message);

        if (!webhookUrl || !message) {
            return { success: false, error: 'Webhook URL veya Mesaj boÅŸ olamaz' };
        }

        const payload: any = {
            content: message
        };

        // Optional: Custom username
        if (config.username) {
            payload.username = variableManager.resolveString(config.username);
        }

        // Optional: Custom avatar
        if (config.avatarUrl) {
            payload.avatar_url = variableManager.resolveString(config.avatarUrl);
        }

        // Optional: Embeds (rich content)
        if (config.embeds) {
            try {
                const embedsStr = variableManager.resolveString(config.embeds);
                payload.embeds = JSON.parse(embedsStr);
            } catch (e) {
                console.warn('[Discord] Invalid embeds JSON:', e);
            }
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Discord API Error: ${errText}`);
        }

        return { success: true };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Discord send failed'
        };
    }
}

// --- Notion ---
export async function executeNotionCreate(
    config: NotionCreateConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const apiKey = variableManager.resolveString(config.apiKey);
        const databaseId = variableManager.resolveString(config.databaseId);
        const propertiesStr = variableManager.resolveString(config.properties);

        if (!apiKey || !databaseId) {
            return { success: false, error: 'Notion API Key veya Database ID eksik' };
        }

        let properties: any;
        try {
            properties = JSON.parse(propertiesStr);
        } catch (e) {
            return { success: false, error: 'Properties geÃ§erli bir JSON olmalÄ±' };
        }

        const payload: any = {
            parent: { database_id: databaseId },
            properties
        };

        // Optional: Page content
        if (config.content) {
            const content = variableManager.resolveString(config.content);
            payload.children = [
                {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content } }]
                    }
                }
            ];
        }

        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Notion API Error');
        }

        variableManager.set(config.variableName, {
            pageId: data.id,
            url: data.url
        });

        return {
            success: true,
            pageId: data.id,
            url: data.url
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Notion create failed'
        };
    }
}

export async function executeNotionRead(
    config: NotionReadConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const apiKey = variableManager.resolveString(config.apiKey);
        const databaseId = variableManager.resolveString(config.databaseId);

        if (!apiKey || !databaseId) {
            return { success: false, error: 'Notion API Key veya Database ID eksik' };
        }

        const payload: any = {
            page_size: config.pageSize || 100
        };

        // Optional: Filter
        if (config.filter) {
            try {
                const filterStr = variableManager.resolveString(config.filter);
                payload.filter = JSON.parse(filterStr);
            } catch (e) {
                console.warn('[Notion] Invalid filter JSON:', e);
            }
        }

        // Optional: Sorts
        if (config.sorts) {
            try {
                const sortsStr = variableManager.resolveString(config.sorts);
                payload.sorts = JSON.parse(sortsStr);
            } catch (e) {
                console.warn('[Notion] Invalid sorts JSON:', e);
            }
        }

        const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Notion API Error');
        }

        // Extract simplified results
        const results = data.results.map((page: any) => ({
            id: page.id,
            url: page.url,
            properties: page.properties,
            createdTime: page.created_time,
            lastEditedTime: page.last_edited_time
        }));

        variableManager.set(config.variableName, results);

        return {
            success: true,
            count: results.length,
            results
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Notion read failed'
        };
    }
}

// --- Switch (Logic) ---
// Switch logic is usually handled in WorkflowEngine, but we can return the target port here
export async function executeSwitch(
    config: SwitchConfig,
    variableManager: VariableManager
): Promise<any> {
    // Support dot notation (e.g. "sonuc.action_type") via resolveValue
    let actualValue: any;

    // First try resolveValue which handles dot notation and {{}} syntax
    actualValue = variableManager.resolveValue(config.variableName);

    // If resolveValue returned the same string (not found), try get() as fallback
    if (actualValue === config.variableName && !variableManager.has(config.variableName)) {
        // Try wrapping in {{}} to use resolveValue's full path
        const wrappedValue = variableManager.resolveValue(`{{${config.variableName}}}`);
        if (wrappedValue !== `{{${config.variableName}}}`) {
            actualValue = wrappedValue;
        }
    }

    const resolvedValue = String(actualValue);

    console.log('[SWITCH] Checking value:', resolvedValue);

    for (const caseItem of config.cases) {
        if (caseItem.value === resolvedValue) {
            return {
                success: true,
                match: true,
                matchedValue: caseItem.value,
                nextPort: caseItem.portId // Engine uses this
            };
        }
    }

    return {
        success: true,
        match: false,
        nextPort: config.defaultPortId || 'default'
    };
}

// --- Facebook Login ---
// --- Facebook Login ---
export async function executeFacebookLogin(
    config: FacebookLoginConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        console.log('[FacebookLogin] Starting login flow (Manual WebBrowser)...');

        // 1. Determine Redirect URI
        // Use hardcoded URI to ensure exact match with Facebook Developer Console
        const redirectUri = 'https://auth.expo.io/@gulum/breviai';

        console.log('[FacebookLogin] Redirect URI:', redirectUri);

        // 2. Construct Auth URL Manually to ensure params are correct
        // User is Administrator, so all scopes should work in Development Mode
        const scopes = [
            'public_profile',
            'email',
            'pages_show_list',
            'instagram_basic',
            'instagram_content_publish'
        ].join(',');

        const FB_APP_ID = await getFacebookAppId();
        const authUrl = `https://www.facebook.com/v12.0/dialog/oauth?` +
            `client_id=${FB_APP_ID}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=token` +
            `&scope=${scopes}`;

        console.log('[FacebookLogin] Auth URL:', authUrl);

        // 3. Open Web Browser Session
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

        console.log('[FacebookLogin] Result Type:', result.type);

        if (result.type === 'success' && result.url) {
            // 4. Parse Token from URL fragment
            // URL will be like: redirect_uri#access_token=...&data_access_expiration_time=...&expires_in=...

            const url = result.url;
            let params: Record<string, string> = {};

            if (url.includes('#')) {
                const fragment = url.split('#')[1];
                const pairs = fragment.split('&');
                pairs.forEach(pair => {
                    const [key, value] = pair.split('=');
                    params[key] = decodeURIComponent(value);
                });
            } else if (url.includes('?')) {
                // Sometimes weirdly returns query
                const query = url.split('?')[1];
                const pairs = query.split('&');
                pairs.forEach(pair => {
                    const [key, value] = pair.split('=');
                    params[key] = decodeURIComponent(value);
                });
            }

            const accessToken = params['access_token'];
            const expiresIn = params['expires_in'];

            if (accessToken) {
                variableManager.set(config.variableName, accessToken);
                // Calculate actual expiry date
                const expiryDate = new Date(Date.now() + (Number(expiresIn) || 0) * 1000).toISOString();
                variableManager.set(config.variableName + '_expiry', expiryDate);

                return {
                    success: true,
                    token: accessToken,
                    expires: expiryDate
                };
            } else {
                return {
                    success: false,
                    error: 'Login successful but no access token found in URL.'
                };
            }

        } else {
            return {
                success: false,
                error: `Login failed or cancelled (Type: ${result.type})`
            };
        }
    } catch (error) {
        console.error('[FacebookLogin] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Facebook login error'
        };
    }
}

// --- Instagram Post ---

/**
 * Upload a local file to a free image hosting service and return a public URL.
 * Uses freeimage.host (no API key required for basic uploads).
 */
async function uploadImageToPublicHost(localUri: string): Promise<string> {
    const { imageHostKey, imgbbKey } = await getImageHostKeys();
    const FileSystem = require('expo-file-system/legacy');

    console.log('[Instagram] Uploading local image to public host...');

    // Read the local file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64
    });

    // Upload to freeimage.host (free, no API key needed)
    const formData = new FormData();
    formData.append('source', base64);
    formData.append('type', 'base64');
    formData.append('action', 'upload');
    formData.append('format', 'json');

    const uploadRes = await fetch(`https://freeimage.host/api/1/upload?key=${imageHostKey}`, {
        method: 'POST',
        body: formData
    });

    const uploadData = await uploadRes.json();

    if (uploadData.status_code !== 200 || !uploadData.image?.url) {
        // Fallback: try imgbb
        console.log('[Instagram] freeimage.host failed, trying imgbb...');
        const imgbbForm = new FormData();
        imgbbForm.append('image', base64);

        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
            method: 'POST',
            body: imgbbForm
        });

        const imgbbData = await imgbbRes.json();

        if (imgbbData.success && imgbbData.data?.url) {
            console.log('[Instagram] Image uploaded via imgbb:', imgbbData.data.url);
            return imgbbData.data.url;
        }

        throw new Error('Resim yÃ¼klenemedi. LÃ¼tfen internet baÄŸlantÄ±nÄ±zÄ± kontrol edin.');
    }

    console.log('[Instagram] Image uploaded:', uploadData.image.url);
    return uploadData.image.url;
}

export async function executeInstagramPost(
    config: InstagramPostConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const rawToken = variableManager.get(config.accessTokenVariable);
        let imageUrl = variableManager.resolveString(config.imageUrl);
        const caption = variableManager.resolveString(config.caption);

        if (!rawToken) return { success: false, error: 'Facebook Access Token bulunamadÄ±' };
        if (!imageUrl) return { success: false, error: 'Resim URL bulunamadÄ±' };

        // Trim whitespace and ensure clean token
        const token = typeof rawToken === 'string' ? rawToken.trim() : String(rawToken).trim();
        console.log('[Instagram] Token length:', token.length, '| First 10 chars:', token.substring(0, 10));
        // Check if imageUrl is a JSON string (from FILE_PICK or similar)
        if (imageUrl.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(imageUrl);
                if (parsed.uri) {
                    imageUrl = parsed.uri;
                    console.log('[Instagram] Parsed URI from JSON:', imageUrl);
                } else if (parsed.assets && parsed.assets[0] && parsed.assets[0].uri) {
                    imageUrl = parsed.assets[0].uri;
                    console.log('[Instagram] Parsed URI from Assets JSON:', imageUrl);
                }
            } catch (e) {
                console.warn('[Instagram] Failed to parse JSON image URL:', e);
            }
        }

        console.log('[Instagram] Image URL (processed):', imageUrl);

        // If image is a local file, upload it to a public host first
        // Instagram Graph API requires a publicly accessible HTTP(S) URL with direct image content
        if (imageUrl.startsWith('file://') || imageUrl.startsWith('/') || imageUrl.startsWith('content://')) {
            console.log('[Instagram] Local file detected, uploading to public host...');
            imageUrl = await uploadImageToPublicHost(imageUrl);
            console.log('[Instagram] Public URL obtained:', imageUrl);
        } else if (imageUrl.match(/pollinations\.ai|image\.pollinations/i) || !imageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
            // Dynamic image generator URLs (e.g. Pollinations) or URLs without image extensions
            // need to be downloaded and re-uploaded as Instagram can't resolve them
            console.log('[Instagram] Dynamic/non-direct image URL detected, downloading via fetch and re-uploading...');
            try {
                // Download image using plain fetch (no expo-file-system dependency)
                const imgResponse = await fetch(imageUrl);
                if (!imgResponse.ok) throw new Error(`Download failed: ${imgResponse.status}`);
                const blob = await imgResponse.blob();
                console.log('[Instagram] Downloaded blob, size:', blob.size, 'type:', blob.type);

                // Convert blob to base64
                const base64: string = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        // Remove data:image/...;base64, prefix
                        const base64Data = result.split(',')[1] || result;
                        resolve(base64Data);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });

                console.log('[Instagram] Base64 length:', base64.length);

                // Upload base64 to freeimage.host
                const formData = new FormData();
                formData.append('source', base64);
                formData.append('type', 'base64');
                formData.append('action', 'upload');
                formData.append('format', 'json');

                const { imageHostKey: ihKey, imgbbKey: ibKey } = await getImageHostKeys();
                const uploadRes = await fetch(`https://freeimage.host/api/1/upload?key=${ihKey}`, {
                    method: 'POST',
                    body: formData
                });
                const uploadData = await uploadRes.json();

                if (uploadData.status_code === 200 && uploadData.image?.url) {
                    imageUrl = uploadData.image.url;
                    console.log('[Instagram] Re-uploaded to freeimage.host:', imageUrl);
                } else {
                    // Fallback to imgbb
                    console.log('[Instagram] freeimage.host failed, trying imgbb...');
                    const imgbbForm = new FormData();
                    imgbbForm.append('image', base64);
                    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${ibKey}`, {
                        method: 'POST',
                        body: imgbbForm
                    });
                    const imgbbData = await imgbbRes.json();
                    if (imgbbData.success && imgbbData.data?.url) {
                        imageUrl = imgbbData.data.url;
                        console.log('[Instagram] Re-uploaded to imgbb:', imageUrl);
                    } else {
                        console.warn('[Instagram] Both upload services failed, using original URL');
                    }
                }
            } catch (downloadErr) {
                console.warn('[Instagram] Could not download/reupload dynamic URL, trying original:', downloadErr);
            }
        }

        console.log('[Instagram] Final Image URL:', imageUrl);
        console.log('[Instagram] Fetching connected accounts...');

        // Use businessAccountId from config if available, otherwise fetch from API
        let igUserId = (config as any).businessAccountId || null;

        if (!igUserId) {
            // 1. Get User's Pages and find the one with IG Business Account
            const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account&access_token=${encodeURIComponent(token)}`;
            const pagesRes = await fetch(pagesUrl);
            const pagesData = await pagesRes.json();

            if (pagesData.error) throw new Error(pagesData.error.message);

            if (pagesData.data && pagesData.data.length > 0) {
                for (const page of pagesData.data) {
                    if (page.instagram_business_account) {
                        igUserId = page.instagram_business_account.id;
                        break;
                    }
                }
            }
        }

        if (!igUserId) {
            return { success: false, error: 'BaÄŸlÄ± bir Instagram Ä°ÅŸletme HesabÄ± bulunamadÄ±. LÃ¼tfen Facebook SayfanÄ±za bir Instagram hesabÄ± baÄŸlayÄ±n.' };
        }

        console.log('[Instagram] IG User ID:', igUserId);

        // 2. Create Media Container (use URL params, not JSON body â€” Facebook Graph API standard)
        const containerParams = new URLSearchParams({
            image_url: imageUrl,
            caption: caption || '',
            media_type: 'IMAGE',
            access_token: token
        });
        const containerUrl = `https://graph.facebook.com/v21.0/${igUserId}/media`;
        console.log('[Instagram] Creating container with image_url:', imageUrl);

        const containerRes = await fetch(containerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: containerParams.toString()
        });
        const containerData = await containerRes.json();
        console.log('[Instagram] Container response:', JSON.stringify(containerData));

        if (containerData.error) throw new Error(containerData.error.message);

        const creationId = containerData.id;
        console.log('[Instagram] Container Created:', creationId);

        // 3. Publish Container
        const publishParams = new URLSearchParams({
            creation_id: creationId,
            access_token: token
        });
        const publishUrl = `https://graph.facebook.com/v21.0/${igUserId}/media_publish`;
        const publishRes = await fetch(publishUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: publishParams.toString()
        });
        const publishData = await publishRes.json();
        console.log('[Instagram] Publish response:', JSON.stringify(publishData));

        if (publishData.error) throw new Error(publishData.error.message);

        return {
            success: true,
            postId: publishData.id,
            igUserId
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Instagram post error'
        };
    }
}

/**
 * Execute Philips Hue Smart Light Control
 * Uses local Hue Bridge HTTP API
 */
export async function executePhilipsHue(
    config: PhilipsHueConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const bridgeIp = variableManager.resolveString(config.bridgeIp);
        const apiKey = variableManager.resolveString(config.apiKey);
        const lightId = config.lightId ? Number(variableManager.resolveString(String(config.lightId))) : 1;
        const action = config.action; // 'on' | 'off' | 'toggle' | 'brightness' | 'color' | 'scene'

        if (!bridgeIp || !apiKey || isNaN(lightId)) {
            return { success: false, error: 'Hue AyarlarÄ± eksik (Bridge IP, API Key, Light ID)' };
        }

        const url = `http://${bridgeIp}/api/${apiKey}/lights/${lightId}/state`;
        const isOn = action === 'on' || action === 'brightness' || action === 'color';
        const body = {
            on: isOn,
            ...(isOn && config.brightness ? { bri: Number(config.brightness) } : {}),
            ...(isOn && config.hue ? { hue: Number(config.hue) } : {}),
            ...(isOn && config.saturation ? { sat: Number(config.saturation) } : {})
        };

        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (Array.isArray(data) && data[0].error) {
            throw new Error(data[0].error.description);
        }

        return {
            success: true,
            lightId,
            action,
            details: data
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Philips Hue failed'
        };
    }
}

/**
 * Remember Information (Deprecated - Use ADD_TO_MEMORY instead)
 */
export async function executeRememberInfo(
    config: RememberInfoConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const text = variableManager.resolveString(config.value || config.key);
        if (!text) return { success: false, error: 'Kaydedilecek bilgi boÅŸ' };

        console.log('[RememberInfo] Adding to agent memory:', text);
        await AgentMemoryService.saveSemanticMemory(text, { key: config.key });

        return { success: true, stored: text };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Memory update failed'
        };
    }
}

/**
 * Search Vector Memory (RAG)
 */
export async function executeSearchMemory(
    config: { query: string; limit?: number; threshold?: number; variableName?: string; storageType?: 'auto' | 'local' | 'backend' },
    variableManager: any
): Promise<any> {
    try {
        const { vectorMemoryService } = require('../VectorMemoryService');

        const query = variableManager.resolveString(config.query);
        const limit = config.limit || 5;
        const threshold = config.threshold || 0.5;
        const storageType = config.storageType || 'auto';

        if (!query) {
            return { success: false, error: 'Arama sorgusu boÅŸ olamaz' };
        }

        console.log(`[SearchMemory] Searching for: "${query}" (limit: ${limit}, threshold: ${threshold}, storage: ${storageType})`);

        const results = await vectorMemoryService.search(query, limit, threshold, storageType);

        console.log(`[SearchMemory] Found ${results.length} results`);

        // Debug: Log first 3 results with their content
        results.slice(0, 3).forEach((r: any, i: number) => {
            console.log(`[SearchMemory] Result ${i + 1}: similarity=${Math.round(r.similarity * 100)}%, text=${r.text?.substring(0, 100)}...`);
        });

        // Format results for AI consumption
        const formattedResults = results.map((r: any) => ({
            text: r.text,
            similarity: Math.round(r.similarity * 100) + '%',
            metadata: r.metadata,
            timestamp: new Date(r.timestamp).toISOString()
        }));

        if (config.variableName) {
            variableManager.set(config.variableName, formattedResults);
        }

        return {
            success: true,
            count: results.length,
            results: formattedResults,
            query: query
        };

    } catch (error) {
        console.error('[SearchMemory] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Memory search failed'
        };
    }
}

/**
 * Add to Vector Memory (RAG)
 */
export async function executeAddToMemory(
    config: { text: string; metadata?: string; variableName?: string; storageType?: 'auto' | 'local' | 'backend' },
    variableManager: any
): Promise<any> {
    try {
        const { vectorMemoryService } = require('../VectorMemoryService');

        const text = variableManager.resolveString(config.text);
        const storageType = config.storageType || 'auto';

        if (!text) {
            return { success: false, error: 'Eklenecek metin boÅŸ olamaz' };
        }

        // Parse metadata if provided
        let metadata: Record<string, any> = {};
        if (config.metadata) {
            try {
                const metadataStr = variableManager.resolveString(config.metadata);
                metadata = JSON.parse(metadataStr);
            } catch (e) {
                console.warn('[AddToMemory] Invalid metadata JSON, using empty object');
            }
        }

        console.log(`[AddToMemory] Adding: "${text.substring(0, 50)}..." with metadata:`, metadata, `Storage: ${storageType}`);

        await vectorMemoryService.addMemory(text, metadata, storageType);

        if (config.variableName) {
            variableManager.set(config.variableName, { added: true, text: text.substring(0, 100) });
        }

        return {
            success: true,
            added: true,
            textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            metadata: metadata
        };

    } catch (error) {
        console.error('[AddToMemory] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Memory add failed'
        };
    }
}

/**
 * Bulk Add to Vector Memory (RAG) - Generic data population
 * Supports any tabular data format, auto-detects column headers
 */
export async function executeBulkAddToMemory(
    config: {
        data: string;  // Variable name containing sheet data
        columns?: Record<string, number>;  // Optional: custom column mapping { fieldName: columnIndex }
        textTemplate?: string; // Optional: custom text template e.g. "Ad: {{Ad}}, Tel: {{Telefon}}"
        // Legacy column index support (backward compatibility)
        contractColumn?: number;
        phoneColumn?: number;
        debtColumn?: number;
        nameColumn?: number;
        muhatabColumn?: number;
        durumColumn?: number;
        variableName?: string;
        storageType?: 'auto' | 'local' | 'backend';
    },
    variableManager: any
): Promise<any> {
    try {
        const { vectorMemoryService } = require('../VectorMemoryService');
        const storageType = config.storageType || 'auto';

        // Get sheet data from variable
        const dataVar = variableManager.get(config.data);

        if (!dataVar) {
            return { success: false, error: `Veri bulunamadÄ±: ${config.data}` };
        }

        // Parse the data - it should be an array of rows
        let rows: any[] = [];

        // Check if data has _raw property (attached by SHEETS_READ for column indexing)
        if (dataVar && typeof dataVar === 'object' && (dataVar as any)._raw) {
            console.log('[BulkAddToMemory] Using _raw data from SHEETS_READ');
            rows = (dataVar as any)._raw;
        } else if (typeof dataVar === 'string') {
            try {
                rows = JSON.parse(dataVar);
            } catch {
                // Try to parse as CSV-like format
                rows = dataVar.split('\n').map(line => line.split('\t'));
            }
        } else if (Array.isArray(dataVar)) {
            rows = dataVar;
        } else if (dataVar.data && Array.isArray(dataVar.data)) {
            if ((dataVar.data as any)._raw) {
                console.log('[BulkAddToMemory] Using _raw from dataVar.data');
                rows = (dataVar.data as any)._raw;
            } else {
                rows = dataVar.data;
            }
        }

        if (rows.length === 0) {
            return { success: false, error: 'Veri dizisi boÅŸ' };
        }

        console.log(`[BulkAddToMemory] Processing ${rows.length} rows. Storage: ${storageType}`);

        let addedCount = 0;
        let skippedCount = 0;
        let errors: string[] = [];

        // Determine if rows are objects (JSON) or arrays (raw sheet data)
        const firstDataRow = rows.length > 1 ? rows[1] : rows[0];
        const isObjectFormat = firstDataRow && !Array.isArray(firstDataRow) && typeof firstDataRow === 'object';
        console.log(`[BulkAddToMemory] Data format: ${isObjectFormat ? 'OBJECT' : 'ARRAY'}, firstRow type: ${typeof firstDataRow}, isArray: ${Array.isArray(firstDataRow)}, sample: ${JSON.stringify(firstDataRow)?.substring(0, 200)}`);

        if (isObjectFormat) {
            // --- OBJECT FORMAT (e.g., from SHEETS_READ JSON conversion) ---
            // Each row is already { "Column Name": "value", ... }
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row || typeof row !== 'object') { skippedCount++; continue; }

                const keys = Object.keys(row);
                const values = Object.values(row).map(v => String(v ?? '').trim());

                // Skip completely empty rows
                if (values.every(v => !v)) { skippedCount++; continue; }

                // Build text from all fields
                const textParts = keys.map(key => `${key}: ${String(row[key] ?? '')}`);
                const text = textParts.join(', ');

                // Create metadata from all fields
                const metadata: Record<string, any> = { type: 'bulk_import', rowIndex: i };
                keys.forEach(key => { metadata[key] = row[key]; });

                try {
                    await vectorMemoryService.addMemory(text, metadata, storageType);
                    addedCount++;
                    if (addedCount % 10 === 0) {
                        console.log(`[BulkAddToMemory] Added ${addedCount} records...`);
                    }
                } catch (err) {
                    errors.push(`Row ${i}: ${err}`);
                }
            }
        } else {
            // --- ARRAY FORMAT (raw 2D array, first row = headers) ---
            const headers: string[] = (rows[0] || []).map((h: any) => String(h || '').trim());
            console.log(`[BulkAddToMemory] Detected headers: ${headers.join(', ')}`);

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];

                if (!row || !Array.isArray(row) || row.length === 0) {
                    skippedCount++;
                    continue;
                }

                // Skip completely empty rows
                const rowValues = row.map((v: any) => String(v ?? '').trim());
                if (rowValues.every((v: string) => !v)) {
                    skippedCount++;
                    continue;
                }

                const metadata: Record<string, any> = { type: 'bulk_import', rowIndex: i };

                // Generic mode: use all columns with their headers
                const parts: string[] = [];
                for (let j = 0; j < row.length; j++) {
                    const header = headers[j] || `Col${j}`;
                    const value = String(row[j] ?? '').trim();
                    if (value) {
                        parts.push(`${header}: ${value}`);
                        metadata[header] = value;
                    }
                }
                const text = parts.join(', ');

                if (!text) { skippedCount++; continue; }

                try {
                    await vectorMemoryService.addMemory(text, metadata, storageType);
                    addedCount++;
                    if (addedCount % 10 === 0) {
                        console.log(`[BulkAddToMemory] Added ${addedCount} records...`);
                    }
                } catch (err) {
                    errors.push(`Row ${i}: ${err}`);
                }
            }
        }

        console.log(`[BulkAddToMemory] Completed: ${addedCount} records added, ${skippedCount} skipped, ${errors.length} errors`);

        const result = {
            success: true,
            addedCount: addedCount,
            skippedCount: skippedCount,
            totalRows: rows.length - (isObjectFormat ? 0 : 1),
            errors: errors.length > 0 ? errors.slice(0, 5) : undefined
        };

        if (config.variableName) {
            variableManager.set(config.variableName, result);
        }

        return result;

    } catch (error) {
        console.error('[BulkAddToMemory] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Bulk memory add failed'
        };
    }
}

/**
 * Clear Vector Memory
 */
export async function executeClearMemory(
    config: { variableName?: string; storageType?: 'auto' | 'local' | 'backend' },
    variableManager: any
): Promise<any> {
    try {
        const { vectorMemoryService } = require('../VectorMemoryService');
        const storageType = config.storageType || 'auto';

        await vectorMemoryService.clear(storageType);

        console.log(`[ClearMemory] All memories cleared (Storage: ${storageType})`);

        const result = { success: true, message: 'TÃ¼m hafÄ±za temizlendi' };

        if (config.variableName) {
            variableManager.set(config.variableName, result);
        }

        return result;

    } catch (error) {
        console.error('[ClearMemory] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Memory clear failed'
        };
    }
}
