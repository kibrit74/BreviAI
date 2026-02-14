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
import { apiService } from '../ApiService';
import { interactionService } from '../InteractionService';

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
    const phoneNumber = variableManager.resolveString(config.phoneNumber);
    const message = variableManager.resolveString(config.message);
    const mode = config.mode || 'direct';

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
            const backendUrl = variableManager.resolveString(config.backendUrl || 'http://136.109.124.154:3001/whatsapp');
            const authKey = variableManager.resolveString(config.backendAuthKey || 'breviai-secret-password');

            // Format phone number: remove ALL non-digit characters (handles ÷, +, spaces, etc.)
            let cleanPhone = phoneNumber.replace(/[^\d]/g, '');

            // Auto-fix Turkish numbers: 0532... -> 90532...
            if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
                cleanPhone = '90' + cleanPhone.substring(1);
            }
            // Auto-fix if user entered 532... -> 90532...
            if (cleanPhone.length === 10 && cleanPhone.startsWith('5')) {
                cleanPhone = '90' + cleanPhone;
            }

            console.log('[WHATSAPP Backend] Sending via:', backendUrl, 'to:', cleanPhone);

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

            const response = await fetch(`${backendUrl}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-key': authKey
                },
                body: JSON.stringify({
                    phone: cleanPhone,
                    message: message
                })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                console.error('[WHATSAPP Backend] Error:', data);
                return {
                    success: false,
                    mode: 'backend',
                    error: data.error || `HTTP ${response.status}`,
                    hint: data.hint || ''
                };
            }

            console.log('[WHATSAPP Backend] Message sent:', data);

            const result = {
                success: true,
                mode: 'backend',
                messageId: data.messageId,
                to: data.to,
                totalSent: data.totalSent
            };

            if (config.variableName) {
                variableManager.set(config.variableName, result);
            }

            return result;

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

