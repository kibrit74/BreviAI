import { NativeModules, Platform } from 'react-native';

/**
 * TriggerScheduler - Native module for scheduling time-based triggers
 * Uses Android AlarmManager for background execution
 */
interface TriggerSchedulerInterface {
    /**
     * Schedule a one-time alarm
     * @param workflowId The workflow ID to execute
     * @param hour Hour of day (0-23)
     * @param minute Minute (0-59)
     * @returns Promise<boolean> Success status
     */
    scheduleOnce(workflowId: string, hour: number, minute: number): Promise<boolean>;

    /**
     * Schedule a repeating daily alarm
     * @param workflowId The workflow ID to execute
     * @param hour Hour of day (0-23)
     * @param minute Minute (0-59)
     * @returns Promise<boolean> Success status
     */
    scheduleRepeating(workflowId: string, hour: number, minute: number): Promise<boolean>;

    /**
     * Cancel a scheduled alarm
     * @param workflowId The workflow ID to cancel
     * @returns Promise<boolean> Success status
     */
    cancel(workflowId: string): Promise<boolean>;

    /**
     * Schedule with custom alarm ID (for multiple alarms per workflow)
     * @param workflowId The workflow ID to execute
     * @param alarmId Custom alarm ID
     * @param hour Hour of day (0-23)
     * @param minute Minute (0-59)
     * @param repeat Whether to repeat daily
     * @returns Promise<boolean> Success status
     */
    scheduleWithId(
        workflowId: string,
        alarmId: number,
        hour: number,
        minute: number,
        repeat: boolean
    ): Promise<boolean>;

    /**
     * Cancel a specific alarm by ID
     */
    cancelById(workflowId: string, alarmId: number): Promise<boolean>;

    /**
     * Restore all alarms (after app update)
     */
    restoreAlarms(): Promise<boolean>;
}

// Get the native module
const TriggerSchedulerModule = NativeModules.TriggerScheduler as TriggerSchedulerInterface | undefined;

/**
 * Schedule a time trigger for a workflow
 */
export async function scheduleTimeTrigger(
    workflowId: string,
    hour: number,
    minute: number,
    repeat: boolean = false
): Promise<boolean> {
    if (Platform.OS !== 'android') {
        console.warn('[TriggerScheduler] Only supported on Android');
        return false;
    }

    if (!TriggerSchedulerModule) {
        console.error('[TriggerScheduler] Native module not available');
        return false;
    }

    try {
        if (repeat) {
            return await TriggerSchedulerModule.scheduleRepeating(workflowId, hour, minute);
        } else {
            return await TriggerSchedulerModule.scheduleOnce(workflowId, hour, minute);
        }
    } catch (error) {
        console.error('[TriggerScheduler] Failed to schedule:', error);
        return false;
    }
}

/**
 * Cancel a scheduled time trigger
 */
export async function cancelTimeTrigger(workflowId: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !TriggerSchedulerModule) {
        return false;
    }

    try {
        return await TriggerSchedulerModule.cancel(workflowId);
    } catch (error) {
        console.error('[TriggerScheduler] Failed to cancel:', error);
        return false;
    }
}

/**
 * Restore all alarms after app reinstall/update
 */
export async function restoreAlarms(): Promise<boolean> {
    if (Platform.OS !== 'android' || !TriggerSchedulerModule) {
        return false;
    }

    try {
        return await TriggerSchedulerModule.restoreAlarms();
    } catch (error) {
        console.error('[TriggerScheduler] Failed to restore alarms:', error);
        return false;
    }
}

export default {
    scheduleTimeTrigger,
    cancelTimeTrigger,
    restoreAlarms,
};
