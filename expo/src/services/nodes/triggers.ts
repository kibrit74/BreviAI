/**
 * Trigger Node Executors
 * Manual Trigger, Time Trigger
 */

import { WorkflowNode, ManualTriggerConfig, TimeTriggerConfig, NotificationTriggerConfig, CallTriggerConfig, EmailTriggerConfig, TelegramTriggerConfig, DeepLinkTriggerConfig, SMSTriggerConfig, WhatsAppTriggerConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';

export async function executeTriggerNode(
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<any> {
    switch (node.type) {
        case 'MANUAL_TRIGGER':
            return executeManualTrigger(node.config as ManualTriggerConfig, variableManager);
        case 'TIME_TRIGGER':
            return executeTimeTrigger(node.config as TimeTriggerConfig, variableManager);
        case 'NOTIFICATION_TRIGGER':
            return executeNotificationTrigger(node.config as NotificationTriggerConfig, variableManager);
        case 'CALL_TRIGGER':
            return executeCallTrigger(node.config as CallTriggerConfig, variableManager);
        case 'EMAIL_TRIGGER':
            return executeEmailTrigger(node.config as EmailTriggerConfig, variableManager);
        case 'TELEGRAM_TRIGGER':
            return executeTelegramTrigger(node.config as TelegramTriggerConfig, variableManager);
        case 'DEEP_LINK_TRIGGER':
            return executeDeepLinkTrigger(node.config as DeepLinkTriggerConfig, variableManager);
        case 'GESTURE_TRIGGER':
            // Gesture triggers are handled by SensorTriggerService, but we still return success
            console.log('[GESTURE_TRIGGER] Trigger executed via sensor service');
            return { triggered: true, type: 'gesture', timestamp: Date.now() };
        case 'STEP_TRIGGER':
            // Step triggers are handled by SensorTriggerService
            console.log('[STEP_TRIGGER] Trigger executed via sensor service');
            variableManager.set('_triggerType', 'step');
            variableManager.set('_triggerTime', new Date().toISOString());
            return { triggered: true, type: 'step', timestamp: Date.now() };
        case 'SMS_TRIGGER':
            return executeSMSTrigger(node.config as SMSTriggerConfig, variableManager);
        case 'WHATSAPP_TRIGGER':
            return executeWhatsAppTrigger(node.config as WhatsAppTriggerConfig, variableManager);
        case 'GEOFENCE_TRIGGER':
        case 'GEOFENCE_ENTER_TRIGGER':
        case 'GEOFENCE_EXIT_TRIGGER':
            return executeGeofenceTrigger(node.type, node.config as any, variableManager);
        case 'CHAT_INPUT_TRIGGER':
            return executeChatInputTrigger(node.config as any, variableManager);
        default:
            throw new Error(`Unknown trigger type: ${node.type}`);
    }
}

async function executeManualTrigger(
    config: ManualTriggerConfig,
    variableManager: VariableManager
): Promise<any> {
    const now = new Date();

    // Set trigger time variable (ISO format for precision)
    variableManager.set('_triggerTime', now.toISOString());
    variableManager.set('_triggerType', 'manual');

    // Human-readable date/time for AI prompts (Turkish locale)
    variableManager.set('_currentDate', now.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }));
    // Example: "Cumartesi, 25 Ocak 2025"

    variableManager.set('_currentTime', now.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    }));
    // Example: "01:05"

    variableManager.set('_currentYear', now.getFullYear().toString());
    variableManager.set('_currentMonth', now.toLocaleDateString('tr-TR', { month: 'long' }));

    return {
        triggered: true,
        type: 'manual',
        timestamp: Date.now(),
    };
}

async function executeTimeTrigger(
    config: TimeTriggerConfig,
    variableManager: VariableManager
): Promise<any> {
    const now = new Date();

    // Get hour/minute from config or use current time as fallback
    const hour = config?.hour ?? now.getHours();
    const minute = config?.minute ?? now.getMinutes();

    // Set trigger time variable (ISO format for precision)
    variableManager.set('_triggerTime', now.toISOString());
    variableManager.set('_triggerType', 'time');
    variableManager.set('_scheduledHour', hour);
    variableManager.set('_scheduledMinute', minute);

    // Human-readable date/time for AI prompts (Turkish locale)
    variableManager.set('_currentDate', now.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }));

    variableManager.set('_currentTime', now.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    }));

    variableManager.set('_currentYear', now.getFullYear().toString());
    variableManager.set('_currentMonth', now.toLocaleDateString('tr-TR', { month: 'long' }));

    return {
        triggered: true,
        type: 'time',
        scheduledTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        timestamp: Date.now(),
    };
}

export async function executeNotificationTrigger(
    config: NotificationTriggerConfig,
    variableManager: VariableManager
): Promise<any> {
    // Check trigger type
    const triggerType = variableManager.get('_triggerType');
    if (triggerType && triggerType !== 'notification') {
        return { triggered: false };
    }

    const injectedTitle = variableManager.get('_notificationTitle');
    const injectedText = variableManager.get('_notificationText');

    if (injectedTitle || injectedText) {
        // ... (existing logic)
        const now = new Date();
        variableManager.set('_triggerTime', now.toISOString());
        variableManager.set('_triggerType', 'notification');
        variableManager.set('_currentDate', now.toLocaleDateString('tr-TR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }));
        variableManager.set('_currentTime', now.toLocaleTimeString('tr-TR', {
            hour: '2-digit', minute: '2-digit'
        }));
        variableManager.set('triggerMessage', injectedText || injectedTitle);

        console.log('[NOTIFICATION_TRIGGER] Triggered by notification:', injectedTitle);
        return {
            triggered: true,
            type: 'notification',
            timestamp: Date.now()
        };
    }
    // ...
    return { success: false, triggered: false, error: 'Manual execution...' };
}

export async function executeCallTrigger(
    config: CallTriggerConfig,
    variableManager: VariableManager
): Promise<any> {
    const triggerType = variableManager.get('_triggerType');
    if (triggerType && triggerType !== 'call') {
        return { triggered: false };
    }

    const injectedNumber = variableManager.get('_callerNumber');
    // ...
    if (injectedNumber) {
        // ... set variables ...
        const now = new Date();
        variableManager.set('_triggerTime', now.toISOString());
        variableManager.set('_triggerType', 'call');
        variableManager.set('_currentDate', now.toLocaleDateString('tr-TR'));
        variableManager.set('_currentTime', now.toLocaleTimeString('tr-TR'));
        variableManager.set('triggerMessage', injectedNumber);

        console.log('[CALL_TRIGGER] Triggered by call from:', injectedNumber);
        return {
            triggered: true,
            type: 'call',
            timestamp: Date.now()
        };
    }
    return { success: false, triggered: false, error: 'Manual execution...' };
}

export async function executeEmailTrigger(
    config: EmailTriggerConfig,
    variableManager: VariableManager
): Promise<any> {
    const triggerType = variableManager.get('_triggerType');
    if (triggerType && triggerType !== 'email') {
        return { triggered: false };
    }

    const injectedSubject = variableManager.get('_emailSubject');
    if (injectedSubject) {
        // ...
        const now = new Date();
        variableManager.set('_triggerTime', now.toISOString());
        variableManager.set('_triggerType', 'email');
        variableManager.set('_currentDate', now.toLocaleDateString('tr-TR'));
        variableManager.set('_currentTime', now.toLocaleTimeString('tr-TR'));
        variableManager.set('triggerMessage', injectedSubject);

        return { triggered: true, type: 'email', timestamp: Date.now() };
    }
    return { success: false, triggered: false, error: 'Manual execution...' };
}

// Duplicate removed

// ... Skipping to SMSTrigger and WhatsAppTrigger replacements ...

export async function executeSMSTrigger(
    config: SMSTriggerConfig,
    variableManager: VariableManager
): Promise<any> {
    const triggerType = variableManager.get('_triggerType');
    if (triggerType && triggerType !== 'sms') {
        return { triggered: false };
    }

    const injectedMessage = variableManager.get('_smsMessage');
    if (injectedMessage) {
        // ...
        const now = new Date();
        variableManager.set('_triggerTime', now.toISOString());
        variableManager.set('_triggerType', 'sms');
        variableManager.set('_currentDate', now.toLocaleDateString('tr-TR'));
        variableManager.set('_currentTime', now.toLocaleTimeString('tr-TR'));
        variableManager.set('triggerMessage', injectedMessage);

        if (config.variableName) {
            const smsInfo = variableManager.get('_smsInfo') || { sender: 'Unknown', message: injectedMessage };
            variableManager.set(config.variableName, smsInfo);
        }

        return { triggered: true, type: 'sms', timestamp: Date.now() };
    }
    return {
        success: false,
        triggered: false,
        type: 'sms',
        error: 'Bu workflow SMS dinleyici modunda çalışıyor.\n\n📩 Kullanım:\n1. Workflow\'u AKTİF edin (toggle)\n2. "Çalıştır" butonuna BASMAYIN\n3. Telefonunuza SMS geldiğinde otomatik çalışır.\n\n⚠️ Not: SMS izinlerinin verildiğinden emin olun.'
    };
}

export async function executeWhatsAppTrigger(
    config: WhatsAppTriggerConfig,
    variableManager: VariableManager
): Promise<any> {
    const triggerType = variableManager.get('_triggerType');
    if (triggerType && triggerType !== 'whatsapp') {
        // Stale data or different trigger type
        return { triggered: false };
    }

    const injectedMessage = variableManager.get('_whatsappMessage');

    if (injectedMessage) {
        const now = new Date();
        variableManager.set('_triggerTime', now.toISOString());
        // ...
        variableManager.set('_triggerType', 'whatsapp');
        variableManager.set('_currentDate', now.toLocaleDateString('tr-TR'));
        variableManager.set('_currentTime', now.toLocaleTimeString('tr-TR'));
        variableManager.set('triggerMessage', injectedMessage);

        if (config.variableName) {
            const whatsappInfo = variableManager.get('_whatsappInfo') || { sender: 'Unknown', message: injectedMessage, group: '' };
            variableManager.set(config.variableName, whatsappInfo);
        }

        console.log('[WHATSAPP_TRIGGER] Triggered by notification. Message:', injectedMessage);
        return {
            triggered: true,
            type: 'whatsapp',
            timestamp: Date.now()
        };
    }

    console.warn('[WHATSAPP_TRIGGER] Manual execution without notification context.');
    return {
        success: false,
        triggered: false,
        type: 'whatsapp',
        error: 'Bu workflow WhatsApp dinleyici modunda çalışıyor.\n\n📱 Kullanım:\n1. Workflow\'u AKTİF edin (toggle)\n2. "Çalıştır" butonuna BASMAYIN\n3. WhatsApp mesajı geldiğinde otomatik çalışır'
    };
}

// Duplicate removed

// Duplicate removed

export async function executeTelegramTrigger(
    config: TelegramTriggerConfig,
    variableManager: VariableManager
): Promise<any> {
    // 0. Check if triggered by Polling Service (Pass-through)
    const triggerType = variableManager.get('_triggerType');
    const passedThroughMessage = variableManager.get('triggerMessage'); // PollingService sets this

    if (triggerType === 'telegram_bot' && passedThroughMessage) {
        console.log('[TelegramTrigger] Pass-through execution (Triggered by Service)');
        return {
            triggered: true,
            type: 'telegram_bot',
            timestamp: Date.now(),
            data: {
                text: passedThroughMessage,
                chatId: variableManager.get('chatId'),
                sender: variableManager.get('senderName')
            }
        };
    }

    // 1. Long Polling Mode (if botToken is present)
    if (config.botToken) {
        // ... (rest of the polling logic) ...
        // Start foreground service to keep app alive during polling
        try {
            const { backgroundService } = require('../BackgroundService');
            await backgroundService.startForegroundService();
            console.log('[TelegramTrigger] Background service started for polling');
        } catch (e) {
            console.warn('[TelegramTrigger] Could not start background service:', e);
        }

        let offset = variableManager.get('_telegram_offset') || 0;
        // ... (rest of loop) ...
        const timeoutSeconds = config.timeout || 30;

        console.log(`[TelegramTrigger] Starting polling. Offset: ${offset}`);

        while (true) {
            // ... (keep existing loop content) ...
            try {
                // Telegram API: getUpdates
                // timeout parameter in API enables long-polling on server side (e.g. 10s)
                const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getUpdates?offset=${offset}&timeout=10`);

                if (!response.ok) {
                    console.error('[TelegramTrigger] API Error:', response.status);
                    await new Promise(r => setTimeout(r, 5000)); // Wait on error
                    continue;
                }

                const data = await response.json();

                if (!data.ok) {
                    console.error('[TelegramTrigger] Data Error:', data);
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }

                const updates = data.result || [];

                if (updates.length === 0) {
                    // No updates, continue polling
                    continue;
                }

                // Process updates
                for (const update of updates) {
                    // Update offset to consume this message provided we processed it (or decided to skip it)
                    // We must increment offset so we don't fetch this again.
                    offset = update.update_id + 1;
                    variableManager.set('_telegram_offset', offset);

                    const msg = update.message;
                    if (!msg || !msg.text) continue; // Only process text messages for now

                    const text = msg.text;
                    const chatName = msg.chat.title || msg.chat.first_name || 'Unknown';
                    const sender = msg.from?.first_name || 'Unknown';

                    // Check Filters
                    let match = true;

                    // 1. Chat Name Filter
                    if (config.chatNameFilter) {
                        if (!chatName.toLowerCase().includes(config.chatNameFilter.toLowerCase())) {
                            match = false;
                        }
                    }

                    // 2. Message Filter (Regex or Simple Includes)
                    if (match && config.messageFilter) {
                        try {
                            const regex = new RegExp(config.messageFilter, 'i');
                            if (!regex.test(text)) match = false;
                        } catch (e) {
                            // Fallback to simple includes if regex fails
                            if (!text.toLowerCase().includes(config.messageFilter.toLowerCase())) {
                                match = false;
                            }
                        }
                    }

                    if (match) {
                        console.log(`[TelegramTrigger] Match found! Msg: ${text}`);

                        // Set Variables
                        variableManager.set('triggerMessage', text);
                        variableManager.set('chatId', msg.chat.id);
                        variableManager.set('messageId', msg.message_id);
                        variableManager.set('senderName', sender);
                        variableManager.set('chatName', chatName);

                        // Return Triggered State
                        return {
                            triggered: true,
                            type: 'telegram_bot',
                            timestamp: Date.now(),
                            data: { text, chatId: msg.chat.id, sender }
                        };
                    }
                }

            } catch (error) {
                console.error('[TelegramTrigger] Network error:', error);
                await new Promise(r => setTimeout(r, 5000)); // Wait before retry
            }
        }
    }

    // 2. Passive Mode (Phone Notification Listener)
    // Check if this was triggered by NotificationListener (variables should be injected)
    const injectedMessage = variableManager.get('_telegramMessage');

    if (injectedMessage) {
        // Workflow was triggered by NotificationListener - variables are already set
        console.log('[TelegramTrigger] Passive mode: Triggered by notification. Message:', injectedMessage);

        const now = new Date();
        variableManager.set('_triggerTime', now.toISOString());
        variableManager.set('_triggerType', 'telegram');
        variableManager.set('_currentDate', now.toLocaleDateString('tr-TR'));
        variableManager.set('_currentTime', now.toLocaleTimeString('tr-TR'));

        // Also set triggerMessage for compatibility
        variableManager.set('triggerMessage', injectedMessage);

        return {
            triggered: true,
            type: 'telegram',
            timestamp: Date.now()
        };
    }

    // Manual execution without botToken - return error with usage instructions
    console.warn('[TelegramTrigger] Manual execution without botToken. No notification context.');
    return {
        success: false,
        triggered: false,
        type: 'telegram',
        error: 'Bu workflow bildirim dinleyici modunda çalışıyor.\n\n📱 Kullanım:\n1. Workflow\'u AKTİF edin (toggle)\n2. "Çalıştır" butonuna BASMAYIN\n3. Telegram\'dan mesaj gönderin\n4. Bildirim geldiğinde otomatik çalışır\n\n💡 İpucu: Bot token eklerseniz polling modunda çalışır.'
    };
}

export async function executeDeepLinkTrigger(
    config: DeepLinkTriggerConfig,
    variableManager: VariableManager
): Promise<any> {
    const now = new Date();
    variableManager.set('_triggerTime', now.toISOString());
    variableManager.set('_triggerType', 'deep_link');

    // Params from the link (e.g. ?id=123) should be injected by the Engine before calling this
    // We just set standard metadata
    variableManager.set('_currentDate', now.toLocaleDateString('tr-TR'));
    variableManager.set('_currentTime', now.toLocaleTimeString('tr-TR'));

    return {
        triggered: true,
        type: 'deep_link',
        path: config.path,
        timestamp: Date.now()
    };
}

/**
 * Geofence Trigger Executor
 * Handles GEOFENCE_TRIGGER, GEOFENCE_ENTER_TRIGGER, and GEOFENCE_EXIT_TRIGGER
 * These are typically triggered by the native GeofenceReceiver when user enters/exits a region
 */
export async function executeGeofenceTrigger(
    triggerType: string,
    config: any,
    variableManager: VariableManager
): Promise<any> {
    // Check if triggered by native geofence service
    const injectedEvent = variableManager.get('_geofenceEvent');
    const injectedTriggerType = variableManager.get('_triggerType');

    if (injectedEvent || (injectedTriggerType && injectedTriggerType.startsWith('geofence'))) {
        const now = new Date();
        variableManager.set('_triggerTime', now.toISOString());
        variableManager.set('_currentDate', now.toLocaleDateString('tr-TR'));
        variableManager.set('_currentTime', now.toLocaleTimeString('tr-TR'));

        // Location data should already be set by native layer
        const location = variableManager.get('_geofenceLocation') || {
            latitude: config.latitude,
            longitude: config.longitude
        };

        if (config.variableName) {
            variableManager.set(config.variableName, {
                event: injectedEvent || (triggerType.includes('EXIT') ? 'exit' : 'enter'),
                location,
                geofenceId: config.identifier || config.geofenceId,
                timestamp: Date.now()
            });
        }

        console.log(`[${triggerType}] Triggered by geofence event:`, injectedEvent);
        return {
            triggered: true,
            type: triggerType.toLowerCase(),
            event: injectedEvent,
            timestamp: Date.now()
        };
    }

    // Manual execution - return error with usage instructions
    console.warn(`[${triggerType}] Manual execution without geofence event context.`);
    return {
        success: false,
        triggered: false,
        type: triggerType.toLowerCase(),
        error: 'Bu workflow konum tabanlı tetikleyici modunda çalışıyor.\n\n📍 Kullanım:\n1. Workflow\'u AKTİF edin (toggle)\n2. "Çalıştır" butonuna BASMAYIN\n3. Belirtilen konuma girdiğinizde/çıktığınızda otomatik çalışır\n\n💡 Not: Konum izni ve arka plan konum izni gerekir.'
    };
}

// End of file


/**
 * Chat Input Trigger Executor
 * Allows workflow to start with user-provided text input
 * The input should be provided via variableManager before execution (e.g., from UI prompt)
 */
export async function executeChatInputTrigger(
    config: { prompt?: string; variableName?: string },
    variableManager: VariableManager
): Promise<any> {
    const now = new Date();

    // Set standard trigger metadata
    variableManager.set('_triggerTime', now.toISOString());
    variableManager.set('_triggerType', 'chat_input');
    variableManager.set('_currentDate', now.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }));
    variableManager.set('_currentTime', now.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    }));

    // Check if user input was already provided (e.g., via ExecutionModal or widget)
    const existingInput = variableManager.get('userInput') || variableManager.get(config.variableName || 'userInput');

    if (existingInput) {
        // Input already provided, use it
        const varName = config.variableName || 'userInput';
        variableManager.set(varName, existingInput);
        variableManager.set('triggerMessage', existingInput);

        console.log(`[CHAT_INPUT_TRIGGER] Using provided input: ${existingInput}`);
        return {
            triggered: true,
            type: 'chat_input',
            input: existingInput,
            timestamp: Date.now()
        };
    }

    // No input provided - this trigger requires UI interaction
    // The ExecutionModal should prompt for input before starting
    console.warn('[CHAT_INPUT_TRIGGER] No input provided. ExecutionModal should prompt user first.');
    return {
        triggered: true, // Allow workflow to proceed (input will come from next TEXT_INPUT node if needed)
        type: 'chat_input',
        prompt: config.prompt || 'Ne yapmamı istersiniz?',
        requiresInput: true,
        timestamp: Date.now()
    };
}
// End of file

