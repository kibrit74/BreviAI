/**
 * Alarm Node Executor
 */

import {
    WorkflowNode,
    AlarmSetConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function executeAlarmSet(
    config: AlarmSetConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        // Request notification permissions
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            return { success: false, error: 'Bildirim izni verilmedi' };
        }

        // Calculate trigger time
        const now = new Date();
        const triggerDate = new Date();
        triggerDate.setHours(config.hour, config.minute, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (triggerDate <= now) {
            triggerDate.setDate(triggerDate.getDate() + 1);
        }

        const message = config.message
            ? variableManager.resolveString(config.message)
            : 'BreviAI Alarm';

        // Schedule notification as alarm
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Alarm',
                body: message,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate,
            },
        });

        return {
            success: true,
            notificationId,
            scheduledTime: triggerDate.toISOString(),
            hour: config.hour,
            minute: config.minute,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Alarm kurulamadı',
        };
    }
}
