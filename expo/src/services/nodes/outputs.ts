/**
 * Output Node Executors
 * Notification, Share Sheet
 */

import { WorkflowNode, NotificationConfig, ShareSheetConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { Platform, ToastAndroid, Share } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';

export async function executeOutputNode(
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<any> {
    switch (node.type) {
        case 'NOTIFICATION':
            return executeNotification(node.config as NotificationConfig, variableManager);
        case 'SHARE_SHEET':
            return executeShareSheet(node.config as ShareSheetConfig, variableManager);
        default:
            throw new Error(`Unknown output type: ${node.type}`);
    }
}

export async function executeNotification(
    config: NotificationConfig,
    variableManager: VariableManager
): Promise<any> {
    // Resolve variables in message
    const message = variableManager.resolveString(config.message);
    const title = config.title ? variableManager.resolveString(config.title) : undefined;

    if (config.type === 'toast') {
        // Toast notification
        if (Platform.OS === 'android') {
            ToastAndroid.show(
                message,
                config.duration === 'long' ? ToastAndroid.LONG : ToastAndroid.SHORT
            );
        }
        // iOS doesn't have native toast - would use a custom component
        return {
            success: true,
            type: 'toast',
            message,
        };
    } else {
        // Push notification
        try {
            // Fix: If message is JSON string, unwrap it for better readability
            let cleanMessage = message;
            try {
                if (cleanMessage.trim().startsWith('{')) {
                    const parsed = JSON.parse(cleanMessage);
                    cleanMessage = parsed.message || parsed.response || parsed.reply || parsed.text || cleanMessage;
                }
            } catch (e) { }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: title || 'BreviAI Otomasyon', // Better default title
                    body: cleanMessage,
                    sound: true, // Force sound
                    priority: Notifications.AndroidNotificationPriority.MAX, // Force MAX priority for Heads-up
                    color: '#231F7C',
                    vibrate: [0, 250, 250, 250],
                    data: { nodeId: 'notification' } // Data prevents it from being treated strictly as background-hidden if OS supports data
                },
                trigger: null, // Immediate
            });
            return {
                success: true,
                type: 'push',
                title,
                message: cleanMessage,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send notification',
            };
        }
    }
}

async function executeShareSheet(
    config: ShareSheetConfig,
    variableManager: VariableManager
): Promise<any> {
    const content = variableManager.resolveString(config.content);
    const title = config.title ? variableManager.resolveString(config.title) : undefined;

    try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
            return {
                success: false,
                error: 'Sharing not available on this device',
            };
        }

        // Logic: Determine if content is a File URI or Plain Text
        // Common URI schemes: file://..., content://... 
        // Also check for absolute paths starting with / (e.g. /data/user/...)
        const isFile =
            typeof content === 'string' && (
                content.startsWith('file://') ||
                content.startsWith('content://') ||
                content.startsWith('/')
            );

        if (isFile) {
            // It's a file - use expo-sharing to share/save the file
            await Sharing.shareAsync(content, {
                dialogTitle: title || 'Dosyayı Paylaş'
            });

            return {
                success: true,
                type: 'file',
                content,
                note: 'File shared successfully'
            };
        } else {
            // It's text - use React Native Share (better for text/links)
            const result = await Share.share(
                {
                    message: content,
                    title: title,
                },
                {
                    dialogTitle: title || 'Paylaş'
                }
            );

            if (result.action === Share.sharedAction) {
                return {
                    success: true,
                    type: 'text',
                    content,
                    activityType: result.activityType,
                };
            } else if (result.action === Share.dismissedAction) {
                return {
                    success: true,
                    type: 'text',
                    content,
                    note: 'Share dismissed'
                };
            }
        }

        return { success: true }; // Fallback

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Share functionality failed',
        };
    }
}
