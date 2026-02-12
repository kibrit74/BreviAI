/**
 * TriggerNativeService.ts
 * 
 * Bridges JavaScript workflow configuration to Native Android Code.
 * Handles registration of triggers that need to work when app is closed.
 */

import { NativeModules, Platform } from 'react-native';
import { Workflow, NotificationTriggerConfig, CallTriggerConfig, SMSTriggerConfig } from '../types/workflow-types';

const { BreviHelperModule } = NativeModules;

class TriggerNativeService {

    /**
     * Syncs a workflow's triggers with the native layer
     */
    syncWorkflowTriggers(workflow: Workflow) {
        if (Platform.OS !== 'android' || !BreviHelperModule) return;

        // 1. Unregister everything for this workflow first (clean state)
        BreviHelperModule.unregisterTrigger(workflow.id);

        // Also cancel any scheduled alarms
        const { TriggerScheduler } = NativeModules;
        if (TriggerScheduler) {
            TriggerScheduler.cancel(workflow.id);
        }

        // If inactive, we are done
        if (!workflow.isActive) return;

        // 2. Register active triggers
        workflow.nodes.forEach(node => {
            switch (node.type) {
                case 'TIME_TRIGGER':
                    this.registerTime(workflow.id, node.config as any);
                    break;
                case 'NOTIFICATION_TRIGGER':
                    const notifConfig = node.config as NotificationTriggerConfig;
                    BreviHelperModule.registerNotificationTrigger(
                        workflow.id,
                        'notification',
                        notifConfig.packageName || null,
                        notifConfig.titleFilter || null,
                        notifConfig.textFilter || null
                    );
                    break;
                case 'WHATSAPP_TRIGGER':
                    this.registerWhatsApp(workflow.id, node.config as any);
                    break;
                case 'TELEGRAM_TRIGGER':
                    // If no botToken, it uses Notification Listener
                    const telegramConfig = node.config as any;
                    if (!telegramConfig.botToken) {
                        this.registerTelegram(workflow.id, telegramConfig);
                    }
                    break;
                case 'EMAIL_TRIGGER':
                    this.registerEmail(workflow.id, node.config as any);
                    break;
                case 'CALL_TRIGGER':
                    this.registerCall(workflow.id, node.config as any);
                    break;
                case 'SMS_TRIGGER':
                    this.registerSms(workflow.id, node.config as any);
                    break;
                case 'GEOFENCE_TRIGGER':
                case 'GEOFENCE_ENTER_TRIGGER':
                case 'GEOFENCE_EXIT_TRIGGER':
                    this.registerGeofence(workflow.id, node.type, node.config as any);
                    break;
                case 'GESTURE_TRIGGER':
                    this.registerGesture(workflow.id, node.config as any);
                    break;
            }
        });
    }

    private registerTime(workflowId: string, config: any) {
        const { TriggerScheduler } = NativeModules;
        if (!TriggerScheduler) return;

        // Basic support for Hour/Minute. 
        // Note: Native module currently focuses on Daily or Once.
        // Complex partial-week schedules might need native update later.
        if (config.repeat) {
            TriggerScheduler.scheduleRepeating(workflowId, config.hour, config.minute);
        } else {
            TriggerScheduler.scheduleOnce(workflowId, config.hour, config.minute);
        }
    }

    private registerWhatsApp(workflowId: string, config: any) {
        BreviHelperModule.registerNotificationTrigger(
            workflowId,
            'whatsapp',
            null, // appFilter handled by type
            config.senderFilter || null,
            config.messageFilter || null
        );
    }

    private registerTelegram(workflowId: string, config: any) {
        BreviHelperModule.registerNotificationTrigger(
            workflowId,
            'telegram',
            null,
            config.chatNameFilter || null,
            config.messageFilter || null
        );
    }

    private registerEmail(workflowId: string, config: any) {
        BreviHelperModule.registerNotificationTrigger(
            workflowId,
            'email',
            null,
            config.senderFilter || null,
            config.subjectFilter || null
        );
    }

    private registerCall(workflowId: string, config: any) {
        BreviHelperModule.registerCallTrigger(
            workflowId,
            config.callState || 'incoming',
            config.phoneFilter || null
        );
    }

    private registerSms(workflowId: string, config: any) {
        BreviHelperModule.registerSmsTrigger(
            workflowId,
            config.phoneNumberFilter || null,
            config.messageFilter || null
        );
    }

    private registerGeofence(workflowId: string, nodeType: string, config: any) {
        if (!config.latitude || !config.longitude || !config.radius) return;

        // 1 = Enter, 2 = Exit, 3 = Both
        let transitionType = 3;
        if (nodeType === 'GEOFENCE_ENTER_TRIGGER') transitionType = 1;
        if (nodeType === 'GEOFENCE_EXIT_TRIGGER') transitionType = 2;

        // Geofence ID is typically workflowId for 1:1 mapping, 
        // but if multiple geofences per wf were possible, we'd need unique IDs.
        // For now, assuming 1 geofence node per workflow or using workflowId as geofenceId.
        BreviHelperModule.addGeofence(
            workflowId, // Using workflowId as geofenceId simplifies mapping
            parseFloat(config.latitude),
            parseFloat(config.longitude),
            parseFloat(config.radius),
            transitionType,
            workflowId
        );
    }

    private registerGesture(workflowId: string, config: any) {
        const { MotionTrigger } = NativeModules;
        if (!MotionTrigger) return;

        MotionTrigger.registerTrigger(
            workflowId,
            config.gestureType || 'shake',
            config.sensitivity || 'medium'
        );
    }
}

export const triggerNativeService = new TriggerNativeService();
