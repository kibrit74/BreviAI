/**
 * Communication Node Executors
 * SMS Send, Email Send
 */

import {
    WorkflowNode,
    SmsSendConfig,
    EmailSendConfig,
    WhatsAppSendConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import * as SMS from 'expo-sms';
import * as MailComposer from 'expo-mail-composer';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../ApiService';
import { interactionService } from '../InteractionService';

const WHATSAPP_SESSION_STORAGE_KEY = 'whatsapp_session_id';
const WHATSAPP_CONNECT_USER_STORAGE_KEY = 'whatsapp_connect_user_id';

function extractPhoneFromText(raw: string): string {
    const text = String(raw || '');
    if (!text) return '';

    const match = text.match(/(?:\+?\d[\d\s()\-]{8,}\d)/);
    if (!match) return '';

    let digits = match[0].replace(/[^\d]/g, '');
    if (digits.startsWith('0') && digits.length === 11) {
        digits = '90' + digits.substring(1);
    }
    if (digits.length === 10 && digits.startsWith('5')) {
        digits = '90' + digits;
    }
    return digits.length >= 10 ? digits : '';
}

function generateSessionId(): string {
    return `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function getOrCreateWhatsAppSessionId(explicitSessionId?: string): Promise<string> {
    const explicit = (explicitSessionId || '').trim();
    if (explicit) return explicit;

    try {
        const existing = (await AsyncStorage.getItem(WHATSAPP_SESSION_STORAGE_KEY))?.trim();
        if (existing) return existing;
    } catch {
        // continue with generation
    }

    const created = generateSessionId();
    try {
        await AsyncStorage.setItem(WHATSAPP_SESSION_STORAGE_KEY, created);
    } catch {
        // best effort
    }
    return created;
}

function normalizeWhatsAppBackendUrl(rawUrl: string): string {
    const trimmed = String(rawUrl || '').trim().replace(/\/+$/, '');
    if (!trimmed) return '';
    if (trimmed.endsWith('/whatsapp')) return trimmed;
    return `${trimmed}/whatsapp`;
}

function extractSessionStatusFromError(errorText: string): string {
    const raw = String(errorText || '');
    const match = raw.match(/status:\s*([a-z_]+)/i);
    return (match?.[1] || '').toLowerCase();
}

function getSessionNotReadyHint(sessionStatus: string): string {
    switch ((sessionStatus || '').toLowerCase()) {
        case 'qr_pending':
            return 'WhatsApp bagli degil. Ayarlar > WhatsApp ekranindan QR kodu taratin.';
        case 'initializing':
        case 'loading':
        case 'authenticated':
            return 'WhatsApp oturumu baslatiliyor. Biraz bekleyip tekrar deneyin.';
        case 'disconnected':
            return 'WhatsApp baglantisi koptu. Ayarlar > WhatsApp ekranindan yeniden baglanin.';
        case 'auth_failed':
            return 'WhatsApp kimlik dogrulamasi basarisiz. Oturumu temizleyip QR ile yeniden baglanin.';
        default:
            return 'WhatsApp oturumu hazir degil. Ayarlar > WhatsApp ekranindan durumu kontrol edin.';
    }
}

async function readJsonSafely(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

async function getStoredWhatsAppConnectUserId(): Promise<string> {
    try {
        return (await AsyncStorage.getItem(WHATSAPP_CONNECT_USER_STORAGE_KEY))?.trim() || '';
    } catch {
        return '';
    }
}

async function fetchWhatsAppSessionStatus(
    whatsappBackendUrl: string,
    authKey: string,
    sessionId: string
): Promise<any | null> {
    if (!whatsappBackendUrl || !authKey || !sessionId) return null;

    try {
        const response = await fetch(`${whatsappBackendUrl}/status?sessionId=${encodeURIComponent(sessionId)}`, {
            method: 'GET',
            headers: {
                'x-auth-key': authKey,
                'x-session-id': sessionId,
                'Bypass-Tunnel-Reminder': 'true',
                'ngrok-skip-browser-warning': 'true',
            },
        });

        const data = await readJsonSafely(response);
        if (!response.ok || data?.error) return null;
        return data;
    } catch {
        return null;
    }
}

async function fetchWhatsAppConnectInfo(
    whatsappBackendUrl: string,
    authKey: string
): Promise<{ connectUrl?: string; statusUrl?: string; sessionId?: string } | null> {
    const userId = await getStoredWhatsAppConnectUserId();
    if (!userId) return null;

    try {
        const response = await fetch(`${whatsappBackendUrl}/connect/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-key': authKey,
                'Bypass-Tunnel-Reminder': 'true',
                'ngrok-skip-browser-warning': 'true',
            },
            body: JSON.stringify({ userId }),
        });

        const data = await readJsonSafely(response);
        if (!response.ok || data?.error) return null;

        return {
            connectUrl: String(data?.connectUrl || '').trim() || undefined,
            statusUrl: String(data?.statusUrl || '').trim() || undefined,
            sessionId: String(data?.sessionId || '').trim() || undefined,
        };
    } catch {
        return null;
    }
}

async function resolveCanonicalWhatsAppSessionId(
    whatsappBackendUrl: string,
    authKey: string,
    localSessionId: string
): Promise<string> {
    const localId = String(localSessionId || '').trim();
    const connectInfo = await fetchWhatsAppConnectInfo(whatsappBackendUrl, authKey);
    const canonicalId = String(connectInfo?.sessionId || '').trim();

    if (!canonicalId || canonicalId === localId) return localId;

    try {
        await AsyncStorage.setItem(WHATSAPP_SESSION_STORAGE_KEY, canonicalId);
    } catch {
        // best effort
    }

    console.log('[WHATSAPP Backend] Canonical sessionId override:', localId, '->', canonicalId);
    return canonicalId;
}

async function findReadyWhatsAppSessionId(
    whatsappBackendUrl: string,
    authKey: string
): Promise<string | null> {
    try {
        const response = await fetch(`${whatsappBackendUrl}/sessions`, {
            method: 'GET',
            headers: {
                'x-auth-key': authKey,
                'Bypass-Tunnel-Reminder': 'true',
                'ngrok-skip-browser-warning': 'true',
            },
        });

        const data = await readJsonSafely(response);
        if (!response.ok || data?.error) return null;

        const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
        const readySessions = sessions.filter((s: any) => !!s?.ready && String(s?.status || '').toLowerCase() === 'ready');
        if (readySessions.length === 0) return null;

        const connectUserId = await getStoredWhatsAppConnectUserId();
        if (connectUserId) {
            const userMatched = readySessions.find((s: any) => String(s?.userId || '').trim() === connectUserId);
            if (userMatched?.sessionId) return String(userMatched.sessionId);
        }

        readySessions.sort((a: any, b: any) => Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0));
        const best = readySessions[0];
        return best?.sessionId ? String(best.sessionId) : null;
    } catch {
        return null;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function resolvePhoneFromContactsByName(rawName: string): Promise<string | null> {
    const name = (rawName || '').trim();
    if (!name) return null;

    try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') return null;

        const { data } = await Contacts.getContactsAsync({
            name,
            fields: [Contacts.Fields.PhoneNumbers],
        });

        for (const contact of data || []) {
            const firstNumber = contact.phoneNumbers?.[0]?.number || '';
            if (!firstNumber) continue;

            let digits = firstNumber.replace(/[^\d]/g, '');
            if (digits.startsWith('0') && digits.length === 11) {
                digits = '90' + digits.substring(1);
            }
            if (digits.length === 10 && digits.startsWith('5')) {
                digits = '90' + digits;
            }
            if (digits.length >= 10) return digits;
        }
    } catch (e) {
        console.warn('[WHATSAPP Backend] Contact phone resolve failed:', e);
    }

    return null;
}

export async function executeSmsSend(
    config: SmsSendConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const isAvailable = await SMS.isAvailableAsync();
        if (!isAvailable) {
            return { success: false, error: 'SMS bu cihazda kullanılamıyor' };
        }

        const phoneNumber = variableManager.resolveString(config.phoneNumber);
        const message = variableManager.resolveString(config.message);

        const { result } = await SMS.sendSMSAsync([phoneNumber], message);

        return {
            success: result === 'sent' || result === 'unknown',
            result,
            phoneNumber,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'SMS gönderilemedi',
        };
    }
}

export async function executeEmailSend(
    config: EmailSendConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const isAvailable = await MailComposer.isAvailableAsync();
        if (!isAvailable) {
            return { success: false, error: 'E-posta bu cihazda kullanılamıyor' };
        }

        const to = variableManager.resolveString(config.to);
        const subject = variableManager.resolveString(config.subject);
        const body = variableManager.resolveString(config.body);
        const cc = config.cc ? variableManager.resolveString(config.cc) : undefined;

        // Resolve attachments
        let attachments: string[] | undefined;
        if (config.attachments && config.attachments.length > 0) {
            const varName = config.attachments[0];
            const resolved = variableManager.get(varName); // Try direct get first

            if (resolved) {
                if (Array.isArray(resolved)) {
                    attachments = resolved.map(item => String(item));
                } else {
                    attachments = [String(resolved)];
                }
            } else {
                // If not a variable, maybe it's a direct path (less likely for workflow but possible)
                // or user entered variable name via resolveString if it was text input
                // But here we treat it as variable name mostly
                // Let's fallback to resolveString just in case
                const fallback = variableManager.resolveString(varName);
                if (fallback && fallback !== varName) {
                    attachments = [fallback];
                } else if (fallback) {
                    // treating input as direct path
                    attachments = [fallback];
                }
            }
        }

        // Automatic sending via Backend
        if (config.isAuto) {
            try {
                const response = await apiService.sendEmail(
                    to,
                    subject,
                    body, // Fallback text
                    body.replace(/\n/g, '<br>'), // Simple HTML
                    attachments,
                    cc
                );

                if (response.success) {
                    return {
                        success: true,
                        sentVia: 'backend',
                        to,
                        messageId: response.messageId
                    };
                } else {
                    throw new Error(response.error || 'Server returned error');
                }
            } catch (err) {
                // Return error to let flow know it failed
                return {
                    success: false,
                    error: 'Otomatik gönderim başarısız: ' + (err instanceof Error ? err.message : String(err)),
                    sentVia: 'backend'
                };
            }
        }

        // Interactive sending via MailComposer
        const result = await MailComposer.composeAsync({
            recipients: [to],
            subject,
            body,
            ccRecipients: cc ? [cc] : undefined,
            attachments: attachments
        });

        return {
            success: result.status === 'sent',
            status: result.status,
            to,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'E-posta gönderilemedi',
        };
    }
}

export async function executeWhatsAppSend(
    config: WhatsAppSendConfig,
    variableManager: VariableManager
): Promise<any> {
    let phoneNumber = variableManager.resolveString(config.phoneNumber);
    const message = variableManager.resolveString(config.message);
    const mode = config.mode || 'backend';

    console.log('[WHATSAPP] Mode:', mode, '| Phone:', phoneNumber);

    // ═══════════════════════════════════════════════════════════
    // MODE: WhatsApp Cloud API (Official Meta API — fully automated)
    // ═══════════════════════════════════════════════════════════
    if (mode === 'cloud_api') {
        try {
            const token = variableManager.resolveString(config.cloudApiToken || '');
            const phoneNumberId = variableManager.resolveString(config.phoneNumberId || '');

            if (!token) return { success: false, error: 'WhatsApp Cloud API token gerekli. Meta Developer hesabınızdan alabilirsiniz.' };
            if (!phoneNumberId) return { success: false, error: 'Phone Number ID gerekli. Meta Developer Dashboard → WhatsApp → API Setup kısmından alabilirsiniz.' };

            // Format phone number: remove ALL non-digit characters
            const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
            console.log('[WHATSAPP Cloud] Sending to:', cleanPhone);

            const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

            let body: any;

            // Check if using a template message
            if (config.templateName) {
                const templateName = variableManager.resolveString(config.templateName);
                const templateLang = variableManager.resolveString(config.templateLanguage || 'tr');

                console.log('[WHATSAPP Cloud] Sending template:', templateName, 'lang:', templateLang);

                body = {
                    messaging_product: 'whatsapp',
                    to: cleanPhone,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: templateLang }
                    }
                };
            } else {
                // Free-form text message (only within 24h customer service window)
                console.log('[WHATSAPP Cloud] Sending text message');

                body = {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanPhone,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: message
                    }
                };
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.error) {
                console.error('[WHATSAPP Cloud] API Error:', data.error);
                return {
                    success: false,
                    error: `WhatsApp Cloud API: ${data.error.message || JSON.stringify(data.error)}`,
                    errorCode: data.error.code,
                    errorType: data.error.type
                };
            }

            console.log('[WHATSAPP Cloud] Message sent:', data);

            const result = {
                success: true,
                mode: 'cloud_api',
                messageId: data.messages?.[0]?.id,
                waId: data.contacts?.[0]?.wa_id,
                phoneNumber: cleanPhone
            };

            if (config.variableName) {
                variableManager.set(config.variableName, result);
            }

            return result;

        } catch (error) {
            console.error('[WHATSAPP Cloud] Error:', error);
            return {
                success: false,
                mode: 'cloud_api',
                error: error instanceof Error ? error.message : 'WhatsApp Cloud API hatası'
            };
        }
    }
    // ═══════════════════════════════════════════════════════════
    // MODE: Backend (whatsapp-web.js service — fully automated)
    // ═══════════════════════════════════════════════════════════
    if (mode === 'backend') {
        try {
            // Use config values if provided, otherwise fall back to centralized backend config
            let backendUrl = config.backendUrl;
            let authKey = config.backendAuthKey;
            if (!backendUrl || !authKey) {
                const { getBackendConfig } = require('./backend');
                const centralConfig = await getBackendConfig();
                backendUrl = backendUrl || `${centralConfig.url}/whatsapp`;
                authKey = authKey || centralConfig.key;
            }
            backendUrl = variableManager.resolveString(backendUrl);
            authKey = variableManager.resolveString(authKey);
            backendUrl = normalizeWhatsAppBackendUrl(backendUrl);
            const explicitSessionId = variableManager.resolveString(config.backendSessionId || '');
            let sessionId = await getOrCreateWhatsAppSessionId(explicitSessionId);
            sessionId = await resolveCanonicalWhatsAppSessionId(backendUrl, authKey, sessionId);
            const waInfo = variableManager.get('_whatsappInfo') || variableManager.get('whatsappInfo') || {};
            const fallbackSenderPhone = String(variableManager.get('_whatsappSenderPhone') || waInfo?.senderPhone || '').trim();
            const fallbackSender = String(variableManager.get('_whatsappSender') || waInfo?.sender || '').trim();
            const fallbackTitle = String(variableManager.get('_notificationTitle') || '').trim();

            if (!phoneNumber || !phoneNumber.trim()) {
                phoneNumber = fallbackSenderPhone || fallbackSender || fallbackTitle || '';
                console.warn('[WHATSAPP Backend] phoneNumber empty, fallback used:', phoneNumber);
            }

            // Format phone number: remove ALL non-digit characters (handles ÷, +, spaces, etc.)
            let cleanPhone = phoneNumber.replace(/[^\d]/g, '');
            if (!cleanPhone || cleanPhone.length < 10) {
                cleanPhone = extractPhoneFromText(`${phoneNumber} ${fallbackSender} ${fallbackTitle}`);
            }

            // Auto-fix Turkish numbers: 0532... -> 90532...
            if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
                cleanPhone = '90' + cleanPhone.substring(1);
            }
            // Auto-fix if user entered 532... -> 90532...
            if (cleanPhone.length === 10 && cleanPhone.startsWith('5')) {
                cleanPhone = '90' + cleanPhone;
            }

            // Fallback: WhatsApp notification title can be a contact name (not number).
            if (!cleanPhone || cleanPhone.length < 10) {
                const contactCandidate = fallbackSender || fallbackTitle || phoneNumber;
                const resolvedFromContacts = await resolvePhoneFromContactsByName(contactCandidate);
                if (resolvedFromContacts) {
                    cleanPhone = resolvedFromContacts;
                    console.log('[WHATSAPP Backend] Resolved phone from contacts:', cleanPhone);
                }
            }

            console.log('[WHATSAPP Backend] Sending via:', backendUrl, 'to:', cleanPhone, '| session:', sessionId);

            // Validate phone number is not empty
            if (!cleanPhone || cleanPhone.length < 10) {
                console.error('[WHATSAPP Backend] Invalid phone number:', phoneNumber, '→', cleanPhone);
                return {
                    success: false,
                    mode: 'backend',
                    error: 'Telefon numarası boş veya geçersiz',
                    hint: `Orijinal: "${phoneNumber}" → Temizlenmiş: "${cleanPhone}"`
                };
            }

            const RETRYABLE_SESSION_STATUSES = new Set(['initializing', 'loading', 'authenticated']);
            const maxAttempts = 3;
            let lastFailure: any = null;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const response = await fetch(`${backendUrl}/send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-key': authKey,
                        'x-session-id': sessionId,
                    },
                    body: JSON.stringify({
                        phone: cleanPhone,
                        message: message,
                        sessionId,
                    })
                });

                const data = await readJsonSafely(response);

                if (response.ok && !data?.error) {
                    console.log('[WHATSAPP Backend] Message sent:', data);

                    const result = {
                        success: true,
                        mode: 'backend',
                        messageId: data.messageId,
                        to: data.to,
                        totalSent: data.totalSent,
                        sessionId: data.sessionId || sessionId,
                    };

                    if (config.variableName) {
                        variableManager.set(config.variableName, result);
                    }

                    return result;
                }

                const rawError = String(data?.error || `HTTP ${response.status}`);
                const statusFromError = extractSessionStatusFromError(rawError);
                const looksLikeNotReady = /not ready/i.test(rawError) || !!statusFromError;

                if (!looksLikeNotReady) {
                    lastFailure = {
                        success: false,
                        mode: 'backend',
                        error: rawError,
                        hint: String(data?.hint || ''),
                    };
                    break;
                }

                const liveStatus = await fetchWhatsAppSessionStatus(backendUrl, authKey, sessionId);
                const sessionStatus = String(liveStatus?.status || statusFromError || 'unknown').toLowerCase();

                if (RETRYABLE_SESSION_STATUSES.has(sessionStatus) && attempt < maxAttempts) {
                    const delayMs = attempt * 1500;
                    console.log(`[WHATSAPP Backend] Session not ready (${sessionStatus}), retrying in ${delayMs}ms...`);
                    await sleep(delayMs);
                    continue;
                }

                if (
                    (sessionStatus === 'qr_pending' || sessionStatus === 'not_started' || sessionStatus === 'disconnected' || sessionStatus === 'auth_failed' || sessionStatus === 'unknown') &&
                    attempt < maxAttempts
                ) {
                    const readySessionId = await findReadyWhatsAppSessionId(backendUrl, authKey);
                    if (readySessionId && readySessionId !== sessionId) {
                        console.log('[WHATSAPP Backend] Switching to ready session:', readySessionId);
                        sessionId = readySessionId;
                        try {
                            await AsyncStorage.setItem(WHATSAPP_SESSION_STORAGE_KEY, sessionId);
                        } catch {
                            // best effort
                        }
                        continue;
                    }
                }

                let connectInfo: { connectUrl?: string; statusUrl?: string; sessionId?: string } | null = null;
                if (sessionStatus === 'qr_pending' || sessionStatus === 'not_started' || sessionStatus === 'disconnected' || sessionStatus === 'auth_failed') {
                    connectInfo = await fetchWhatsAppConnectInfo(backendUrl, authKey);
                }

                lastFailure = {
                    success: false,
                    mode: 'backend',
                    code: 'WHATSAPP_SESSION_NOT_READY',
                    error: rawError,
                    sessionStatus,
                    sessionId,
                    recoverable: true,
                    recommendedMode: 'direct',
                    connectUrl: connectInfo?.connectUrl,
                    statusUrl: connectInfo?.statusUrl,
                    qrCode: liveStatus?.qrCode,
                    hint: getSessionNotReadyHint(sessionStatus),
                };
                break;
            }

            if (lastFailure) {
                console.error('[WHATSAPP Backend] Error:', lastFailure);
                return lastFailure;
            }

            return {
                success: false,
                mode: 'backend',
                error: 'WhatsApp backend send failed',
            };

        } catch (error) {
            console.error('[WHATSAPP Backend] Error:', error);
            return {
                success: false,
                mode: 'backend',
                error: error instanceof Error ? error.message : 'WhatsApp backend hatası',
                hint: 'Backend servisi çalışıyor mu? node scripts/whatsapp-service.js'
            };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // MODE: Direct (Accessibility-based automation — existing)
    // ═══════════════════════════════════════════════════════════
    try {
        if (variableManager.get('_isHeadless')) {
            return {
                success: false,
                mode: 'direct',
                code: 'WHATSAPP_DIRECT_UNAVAILABLE_HEADLESS',
                error: 'Direct mode headless calismada kullanilamaz',
                hint: 'Headless tetikleyicide backend modu kullanin.',
            };
        }

        let mediaPath = variableManager.resolveString(config.mediaPath || '');
        let finalMessage = message;

        // Auto-detect if message is actually a file path (Agent mistake fix)
        if (!mediaPath && (
            message.startsWith('file://') ||
            message.startsWith('content://') ||
            message.startsWith('/') ||
            message.match(/\.(pdf|jpg|jpeg|png|mp4|doc|docx|xls|xlsx|txt)$/i)
        )) {
            console.log('[WHATSAPP Direct] Detected file path in message field, moving to mediaPath:', message);
            mediaPath = message;
            finalMessage = '';
        }

        // This triggers the InteractionModal with WhatsAppAutomationView
        const result = await interactionService.requestWhatsApp(phoneNumber, finalMessage, mediaPath);

        if (result && result.success) {
            const output = { success: true, mode: 'direct', ...result };
            if (config.variableName) {
                variableManager.set(config.variableName, output);
            }
            return output;
        } else {
            return {
                success: false,
                mode: 'direct',
                error: result?.error || 'WhatsApp gönderimi iptal edildi'
            };
        }
    } catch (error) {
        return {
            success: false,
            mode: 'direct',
            error: error instanceof Error ? error.message : 'WhatsApp hatası'
        };
    }
}
