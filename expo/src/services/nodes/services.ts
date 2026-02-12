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
import * as AuthSession from 'expo-auth-session';
import { AgentMemoryService } from '../AgentMemoryService';

const FB_APP_ID = '1395089878474790'; // Business App with Instagram API
const FB_DISCOVERY = {
    authorizationEndpoint: 'https://www.facebook.com/v12.0/dialog/oauth',
    tokenEndpoint: 'https://graph.facebook.com/v12.0/oauth/access_token',
};
import { VariableManager } from '../VariableManager';
import { workflowEngine } from '../WorkflowEngine';

// --- Google Translate ---
export async function executeGoogleTranslate(
    config: GoogleTranslateConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const text = variableManager.resolveString(config.text);
        if (!text) return { success: false, error: 'Çevrilecek metin boş' };

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
            return { success: false, error: 'Telegram ayarları eksik (Token veya ChatID)' };
        }

        const baseUrl = `https://api.telegram.org/bot${token}`;
        let url = '';
        let body: any;
        let headers: Record<string, string> = {};

        if (operation === 'sendMessage') {
            // Support both 'message' and 'text' properties for compatibility
            let message = variableManager.resolveString(config.message || config.text);
            if (!message) return { success: false, error: 'Mesaj boş olamaz' };

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

            if (isNaN(lat) || isNaN(long)) return { success: false, error: 'Geçersiz konum (Lat/Long)' };

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

            // FormData oluştur
            const formData = new FormData();
            formData.append('chat_id', chatId);
            if (caption) {
                formData.append('caption', caption);
                formData.append('parse_mode', config.parseMode || 'Markdown');
            }

            // Dosya ekle
            const fileName = filePath.split('/').pop() || 'file';
            const fileType = operation === 'sendPhoto' ? 'image/jpeg' : 'application/octet-stream';

            // React Native'de FormData dosya formatı: { uri, name, type }
            formData.append(operation === 'sendPhoto' ? 'photo' : 'document', {
                uri: filePath,
                name: fileName,
                type: fileType,
            } as any);

            body = formData;
            // Content-Type: multipart/form-data browser/RN tarafından otomatik set edilir boundary ile birlikte.
            // Bu yüzden headers'a eklemiyoruz.
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

        if (!webhookUrl || !message) {
            return { success: false, error: 'Webhook URL veya Mesaj boş olamaz' };
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Slack API Error: ${errText}`);
        }

        return { success: true };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Slack send failed'
        };
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
            return { success: false, error: 'Webhook URL veya Mesaj boş olamaz' };
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
            return { success: false, error: 'Properties geçerli bir JSON olmalı' };
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
    const FileSystem = require('expo-file-system');

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

    const uploadRes = await fetch('https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5', {
        method: 'POST',
        body: formData
    });

    const uploadData = await uploadRes.json();

    if (uploadData.status_code !== 200 || !uploadData.image?.url) {
        // Fallback: try imgbb
        console.log('[Instagram] freeimage.host failed, trying imgbb...');
        const imgbbForm = new FormData();
        imgbbForm.append('image', base64);

        const imgbbRes = await fetch('https://api.imgbb.com/1/upload?key=3e45e975b8bf0b0e9ee12c28dae0f7e8', {
            method: 'POST',
            body: imgbbForm
        });

        const imgbbData = await imgbbRes.json();

        if (imgbbData.success && imgbbData.data?.url) {
            console.log('[Instagram] Image uploaded via imgbb:', imgbbData.data.url);
            return imgbbData.data.url;
        }

        throw new Error('Resim yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
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

        if (!rawToken) return { success: false, error: 'Facebook Access Token bulunamadı' };
        if (!imageUrl) return { success: false, error: 'Resim URL bulunamadı' };

        // Trim whitespace and ensure clean token
        const token = typeof rawToken === 'string' ? rawToken.trim() : String(rawToken).trim();
        console.log('[Instagram] Token length:', token.length, '| First 10 chars:', token.substring(0, 10));
        console.log('[Instagram] Image URL (raw):', imageUrl);

        // If image is a local file, upload it to a public host first
        // Instagram Graph API requires a publicly accessible HTTP(S) URL
        if (imageUrl.startsWith('file://') || imageUrl.startsWith('/') || imageUrl.startsWith('content://')) {
            console.log('[Instagram] Local file detected, uploading to public host...');
            imageUrl = await uploadImageToPublicHost(imageUrl);
            console.log('[Instagram] Public URL obtained:', imageUrl);
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
            return { success: false, error: 'Bağlı bir Instagram İşletme Hesabı bulunamadı. Lütfen Facebook Sayfanıza bir Instagram hesabı bağlayın.' };
        }

        console.log('[Instagram] IG User ID:', igUserId);

        // 2. Create Media Container
        const containerUrl = `https://graph.facebook.com/v18.0/${igUserId}/media`;
        const containerRes = await fetch(containerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: imageUrl,
                caption: caption,
                access_token: token
            })
        });
        const containerData = await containerRes.json();

        if (containerData.error) throw new Error(containerData.error.message);

        const creationId = containerData.id;
        console.log('[Instagram] Container Created:', creationId);

        // 3. Publish Container
        const publishUrl = `https://graph.facebook.com/v18.0/${igUserId}/media_publish`;
        const publishRes = await fetch(publishUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: creationId,
                access_token: token
            })
        });
        const publishData = await publishRes.json();

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
    variableManager: any
): Promise<any> {
    try {
        const bridgeIp = variableManager.resolveString(config.bridgeIp);
        const apiKey = variableManager.resolveString(config.apiKey);

        if (!bridgeIp || !apiKey) {
            return { success: false, error: 'Bridge IP veya API Key eksik' };
        }

        const baseUrl = `http://${bridgeIp}/api/${apiKey}`;
        let endpoint = '';
        let body: any = {};

        // Determine endpoint and body based on action
        if (config.lightId && config.lightId !== 'all') {
            // Control specific light
            endpoint = `/lights/${config.lightId}/state`;
        } else if (config.groupId) {
            // Control group (room)
            endpoint = `/groups/${config.groupId}/action`;
        } else {
            // Control all lights (group 0)
            endpoint = '/groups/0/action';
        }

        switch (config.action) {
            case 'on':
                body = { on: true };
                break;
            case 'off':
                body = { on: false };
                break;
            case 'toggle':
                // First get current state, then toggle
                const stateUrl = config.lightId
                    ? `${baseUrl}/lights/${config.lightId}`
                    : `${baseUrl}/groups/${config.groupId || '0'}`;
                const stateRes = await fetch(stateUrl);
                const stateData = await stateRes.json();
                const isOn = config.lightId
                    ? stateData?.state?.on
                    : stateData?.action?.on;
                body = { on: !isOn };
                break;
            case 'brightness':
                body = { on: true, bri: Math.min(254, Math.max(0, config.brightness || 127)) };
                break;
            case 'color':
                body = {
                    on: true,
                    hue: config.hue || 0,
                    sat: config.saturation || 254
                };
                break;
            case 'scene':
                if (!config.sceneId) {
                    return { success: false, error: 'Scene ID gerekli' };
                }
                endpoint = `/groups/${config.groupId || '0'}/action`;
                body = { scene: config.sceneId };
                break;
        }

        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        // Check for Hue API errors
        if (Array.isArray(data) && data[0]?.error) {
            throw new Error(data[0].error.description);
        }

        const result = {
            success: true,
            action: config.action,
            response: data
        };

        if (config.variableName) {
            variableManager.set(config.variableName, result);
        }

        return result;

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Philips Hue control failed'
        };
    }
}

/**
 * Update Agent Memory
 */
export async function executeRememberInfo(
    config: RememberInfoConfig,
    variableManager: any
): Promise<any> {
    try {
        const key = variableManager.resolveString(config.key);
        let valueStr = variableManager.resolveString(config.value);

        if (!key || !valueStr) {
            return { success: false, error: 'Key veya Value eksik' };
        }

        // Try to parse value if it's JSON
        let value = valueStr;
        try {
            value = JSON.parse(valueStr);
        } catch (e) {
            // Keep as string
        }

        await AgentMemoryService.ensureLoaded();

        // Handle specific keys that map to typed preferences
        const prefs = AgentMemoryService.getPreferences();
        if (key in prefs) {
            await AgentMemoryService.setPreference(key as any, value);
        } else {
            console.warn(`[RememberInfo] Unknown preference key: ${key}`);
        }

        return {
            success: true,
            updated: key,
            newValue: value
        };

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
    config: { query: string; limit?: number; threshold?: number; variableName?: string },
    variableManager: any
): Promise<any> {
    try {
        const { vectorMemoryService } = require('../VectorMemoryService');

        const query = variableManager.resolveString(config.query);
        const limit = config.limit || 5;
        const threshold = config.threshold || 0.5;

        if (!query) {
            return { success: false, error: 'Arama sorgusu boş olamaz' };
        }

        console.log(`[SearchMemory] Searching for: "${query}" (limit: ${limit}, threshold: ${threshold})`);

        const results = await vectorMemoryService.search(query, limit, threshold);

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
    config: { text: string; metadata?: string; variableName?: string },
    variableManager: any
): Promise<any> {
    try {
        const { vectorMemoryService } = require('../VectorMemoryService');

        const text = variableManager.resolveString(config.text);

        if (!text) {
            return { success: false, error: 'Eklenecek metin boş olamaz' };
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

        console.log(`[AddToMemory] Adding: "${text.substring(0, 50)}..." with metadata:`, metadata);

        await vectorMemoryService.addMemory(text, metadata);

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
 * Bulk Add to Vector Memory (RAG) - Direct data population without AI
 * Parses sheet data directly using column indices
 */
export async function executeBulkAddToMemory(
    config: {
        data: string;  // Variable name containing sheet data
        contractColumn: number;  // 0-indexed column for contract number (A=0)
        phoneColumn: number;     // Column for phone
        debtColumn: number;      // Column for debt amount
        nameColumn?: number;     // Column for name (optional)
        muhatabColumn?: number;  // Column for muhatap tanımı (optional)
        durumColumn?: number;    // Column for durum tanıtıcısı (optional)
        variableName?: string;
    },
    variableManager: any
): Promise<any> {
    try {
        const { vectorMemoryService } = require('../VectorMemoryService');

        // Get sheet data from variable
        const dataVar = variableManager.get(config.data);

        if (!dataVar) {
            return { success: false, error: `Veri bulunamadı: ${config.data}` };
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
            // Check if dataVar.data has _raw
            if ((dataVar.data as any)._raw) {
                console.log('[BulkAddToMemory] Using _raw from dataVar.data');
                rows = (dataVar.data as any)._raw;
            } else {
                rows = dataVar.data;
            }
        }

        console.log(`[BulkAddToMemory] Processing ${rows.length} rows`);

        let addedCount = 0;
        let skippedCount = 0;
        let errors: string[] = [];

        // Skip header row (index 0)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];

            if (!row || !Array.isArray(row) || row.length === 0) {
                skippedCount++;
                continue;
            }

            // Extract values using column indices
            const contract = String(row[config.contractColumn] || '').trim();
            const phone = String(row[config.phoneColumn] || '').trim();
            const debt = String(row[config.debtColumn] || '').trim();
            const name = config.nameColumn !== undefined ? String(row[config.nameColumn] || '').trim() : '';
            const muhatap = config.muhatabColumn !== undefined ? String(row[config.muhatabColumn] || '').trim() : '';
            const durum = config.durumColumn !== undefined ? String(row[config.durumColumn] || '').trim() : '';

            if (!contract) {
                // Debug log for first few skips to help user identify why
                if (skippedCount < 3) {
                    console.log(`[BulkAddToMemory] Row ${i} skipped: Contract column (${config.contractColumn}) is empty.`);
                }
                skippedCount++;
                continue;  // Skip rows without contract number
            }

            // Format the text for memory storage - include all searchable fields
            let text = `Sözleşme: ${contract}, Telefon: ${phone}, Borç: ${debt} TL`;
            if (name) text += `, Ad: ${name}`;
            if (muhatap) text += `, Muhatap: ${muhatap}`;
            if (durum) text += `, Durum: ${durum}`;

            // Create metadata
            const metadata = {
                type: 'debtor',
                contract: contract,
                phone: phone,
                debt: debt,
                name: name,
                muhatap: muhatap,
                durum: durum,
                rowIndex: i
            };

            try {
                await vectorMemoryService.addMemory(text, metadata);
                addedCount++;

                if (addedCount % 10 === 0) {
                    console.log(`[BulkAddToMemory] Added ${addedCount} records...`);
                }
            } catch (err) {
                errors.push(`Row ${i}: ${err}`);
            }
        }

        console.log(`[BulkAddToMemory] Completed: ${addedCount} records added, ${skippedCount} skipped (empty contract), ${errors.length} errors`);

        const result = {
            success: true,
            addedCount: addedCount,
            skippedCount: skippedCount,
            totalRows: rows.length - 1,
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
    config: { variableName?: string },
    variableManager: any
): Promise<any> {
    try {
        const { vectorMemoryService } = require('../VectorMemoryService');

        await vectorMemoryService.clear();

        console.log('[ClearMemory] All memories cleared');

        const result = { success: true, message: 'Tüm hafıza temizlendi' };

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
