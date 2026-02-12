import { WorkflowEngine } from './WorkflowEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workflow } from '../types/workflow-types';
import * as Notifications from 'expo-notifications';

/**
 * Headless JS Task for executing workflows from widget/triggers without UI.
 * This is called by React Native when WorkflowHeadlessService starts.
 * 
 * Data passed from native layer may include:
 * - workflowId: Required workflow ID to execute
 * - _triggerType: Optional trigger type (e.g., 'gesture', 'time', 'notification')
 * - _gestureType: Optional gesture type for GESTURE_TRIGGER (e.g., 'shake', 'flip')
 */
interface HeadlessTaskData {
    workflowId?: string;
    _triggerType?: string;
    _gestureType?: string;
    [key: string]: any; // Allow additional native extras
}

const WidgetHeadlessTask = async (data: HeadlessTaskData) => {
    console.log('[WidgetHeadlessTask] Starting headless task with data:', data);

    const workflowId = data?.workflowId;
    if (!workflowId) {
        console.warn('[WidgetHeadlessTask] No workflowId provided, aborting');
        return;
    }

    try {
        // 1. Load workflow from storage (since we don't have hydrated store)
        // correct key is 'brevi_workflows', NOT 'workflows'

        // Diag: List all keys
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('[WidgetHeadlessTask] Available keys in storage:', allKeys);

        const savedWorkflows = await AsyncStorage.getItem('brevi_workflows');
        if (!savedWorkflows) {
            console.error('[WidgetHeadlessTask] No workflows found in storage');
            await showNotification('Hata', 'Kaydedilmiş otomasyon bulunamadı');
            return;
        }

        const workflows: Workflow[] = JSON.parse(savedWorkflows);
        const workflow = workflows.find(w => w.id === workflowId);

        if (!workflow) {
            console.error(`[WidgetHeadlessTask] Workflow ${workflowId} not found`);
            await showNotification('Hata', `Otomasyon bulunamadı: ${workflowId}`);
            return;
        }

        console.log(`[WidgetHeadlessTask] Executing workflow: ${workflow.name}`);

        // 2. Initialize and execute engine
        const engine = WorkflowEngine.getInstance();

        // PRIORITY 1: Use trigger variables passed directly from native layer (via Intent extras)
        // This is the fastest path - native sends _triggerType directly in the task data
        let initialVariables: Record<string, any> = {};

        if (data._triggerType) {
            initialVariables._triggerType = data._triggerType;
            console.log(`[WidgetHeadlessTask] Using native _triggerType from data: ${data._triggerType}`);
        }
        if (data._gestureType) {
            initialVariables._gestureType = data._gestureType;
            console.log(`[WidgetHeadlessTask] Using native _gestureType from data: ${data._gestureType}`);
        }

        // PRIORITY 2: Fetch trigger variables from SharedPreferences (e.g. WhatsApp message content)
        // This is for triggers that store data in SharedPreferences before triggering
        if (!initialVariables._triggerType) {
            try {
                const { NativeModules } = require('react-native');
                const { BreviSettingsManager } = NativeModules;
                const Helper = BreviSettingsManager || NativeModules.BreviHelperModule;

                if (Helper && Helper.getTriggerVariables) {
                    const nativeVars = await Helper.getTriggerVariables();
                    if (nativeVars) {
                        initialVariables = { ...nativeVars, ...initialVariables };
                        console.log('[WidgetHeadlessTask] Loaded native trigger variables:', nativeVars);
                    }
                } else {
                    console.warn('[WidgetHeadlessTask] BreviSettingsManager not found in NativeModules');
                }
            } catch (e) {
                console.warn('[WidgetHeadlessTask] Failed to load native variables:', e);
            }
        }

        // AUTO-INJECT _triggerType based on workflow's trigger node
        // This is CRITICAL for gesture/step triggers to pass through immediately
        if (!initialVariables._triggerType) {
            const triggerNode = workflow.nodes.find(n =>
                n.type.endsWith('_TRIGGER') || n.type === 'MANUAL_TRIGGER'
            );

            if (triggerNode) {
                const triggerTypeMap: Record<string, string> = {
                    'GESTURE_TRIGGER': 'gesture',
                    'STEP_TRIGGER': 'step',
                    'MANUAL_TRIGGER': 'manual',
                    'TIME_TRIGGER': 'time',
                    'NOTIFICATION_TRIGGER': 'notification',
                    'CALL_TRIGGER': 'call',
                    'SMS_TRIGGER': 'sms',
                    'WHATSAPP_TRIGGER': 'whatsapp',
                    'TELEGRAM_TRIGGER': 'telegram',
                    'EMAIL_TRIGGER': 'email',
                    'GEOFENCE_TRIGGER': 'geofence',
                    'GEOFENCE_ENTER_TRIGGER': 'geofence_enter',
                    'GEOFENCE_EXIT_TRIGGER': 'geofence_exit',
                    'DEEP_LINK_TRIGGER': 'deep_link',
                };

                const mappedType = triggerTypeMap[triggerNode.type];
                if (mappedType) {
                    initialVariables._triggerType = mappedType;
                    console.log(`[WidgetHeadlessTask] Auto-injected _triggerType: ${mappedType}`);
                }

                // For gesture triggers, also inject gesture type
                if (triggerNode.type === 'GESTURE_TRIGGER' && triggerNode.config) {
                    const gestureConfig = triggerNode.config as any;
                    initialVariables._gestureType = gestureConfig.gesture || 'shake';
                }
            }
        }

        // Execute with headless flag
        // NOTE: The engine exposes 'execute', not 'executeWorkflow'
        const result = await engine.execute(workflow, initialVariables);

        console.log('[WidgetHeadlessTask] Execution result:', result);

        // 3. Show completion notification (optional, for feedback)
        if (result.success) {
            await showNotification('✅ Tamamlandı', `"${workflow.name}" başarıyla çalıştırıldı`);
        } else {
            await showNotification('⚠️ Hata', `"${workflow.name}" tamamlanamadı: ${result.error || 'Bilinmeyen hata'}`);
        }

    } catch (error: any) {
        console.error('[WidgetHeadlessTask] Error executing workflow:', error);
        await showNotification('Hata', error.message || 'Otomasyon çalıştırılamadı');
    }
};

/**
 * Helper function to show notifications during headless execution.
 */
async function showNotification(title: string, body: string) {
    try {
        await Notifications.scheduleNotificationAsync({
            content: { title, body },
            trigger: null, // Immediate
        });
    } catch (e) {
        console.warn('[WidgetHeadlessTask] Failed to show notification:', e);
    }
}

export default WidgetHeadlessTask;
