/**
 * Workflow Scheduler Service
 * Manages scheduling and canceling of time-based triggers for saved workflows
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workflow, WorkflowNode, TimeTriggerConfig } from '../types/workflow-types';
import { scheduleTimeTrigger, cancelTimeTrigger, restoreAlarms } from '../modules/TriggerScheduler';

const SCHEDULED_WORKFLOWS_KEY = '@scheduled_workflows';

interface ScheduledWorkflow {
    workflowId: string;
    workflowName: string;
    hour: number;
    minute: number;
    repeat: boolean;
    enabled: boolean;
    lastScheduled: number;
}

/**
 * Schedule a workflow's time trigger
 */
export async function scheduleWorkflow(workflow: Workflow): Promise<boolean> {
    // Find TIME_TRIGGER node in workflow
    const timeTrigger = workflow.nodes.find(n => n.type === 'TIME_TRIGGER');

    if (!timeTrigger) {
        console.log('[WorkflowScheduler] No TIME_TRIGGER found in workflow');
        return false;
    }

    const config = timeTrigger.config as TimeTriggerConfig;
    const hour = config?.hour ?? 9;
    const minute = config?.minute ?? 0;
    const repeat = config?.repeat !== false; // Default to true

    console.log(`[WorkflowScheduler] Scheduling ${workflow.name} for ${hour}:${minute} (repeat: ${repeat})`);

    // Schedule the alarm
    const success = await scheduleTimeTrigger(workflow.id, hour, minute, repeat);

    if (success) {
        // Save to AsyncStorage for tracking
        await saveScheduledWorkflow({
            workflowId: workflow.id,
            workflowName: workflow.name,
            hour,
            minute,
            repeat,
            enabled: true,
            lastScheduled: Date.now()
        });
    }

    return success;
}

/**
 * Cancel a workflow's scheduled trigger
 */
export async function cancelScheduledWorkflow(workflowId: string): Promise<boolean> {
    console.log(`[WorkflowScheduler] Canceling schedule for ${workflowId}`);

    const success = await cancelTimeTrigger(workflowId);

    if (success) {
        await removeScheduledWorkflow(workflowId);
    }

    return success;
}

/**
 * Get all scheduled workflows
 */
export async function getScheduledWorkflows(): Promise<ScheduledWorkflow[]> {
    try {
        const json = await AsyncStorage.getItem(SCHEDULED_WORKFLOWS_KEY);
        return json ? JSON.parse(json) : [];
    } catch (error) {
        console.error('[WorkflowScheduler] Failed to get scheduled workflows:', error);
        return [];
    }
}

/**
 * Check if a workflow is scheduled
 */
export async function isWorkflowScheduled(workflowId: string): Promise<boolean> {
    const scheduled = await getScheduledWorkflows();
    return scheduled.some(s => s.workflowId === workflowId && s.enabled);
}

/**
 * Toggle workflow schedule on/off
 */
export async function toggleWorkflowSchedule(workflow: Workflow): Promise<boolean> {
    const isScheduled = await isWorkflowScheduled(workflow.id);

    if (isScheduled) {
        return await cancelScheduledWorkflow(workflow.id);
    } else {
        return await scheduleWorkflow(workflow);
    }
}

/**
 * Reschedule all workflows after app restart
 * This should be called when the app starts
 */
export async function rescheduleAllWorkflows(): Promise<void> {
    console.log('[WorkflowScheduler] Rescheduling all workflows...');

    // First, try to restore from native side
    await restoreAlarms();

    // Then verify with our saved list
    const scheduled = await getScheduledWorkflows();

    for (const workflow of scheduled) {
        if (workflow.enabled) {
            console.log(`[WorkflowScheduler] Restoring schedule for ${workflow.workflowName}`);
            await scheduleTimeTrigger(
                workflow.workflowId,
                workflow.hour,
                workflow.minute,
                workflow.repeat
            );
        }
    }

    console.log(`[WorkflowScheduler] Restored ${scheduled.filter(s => s.enabled).length} scheduled workflows`);
}

// Private helpers

async function saveScheduledWorkflow(scheduled: ScheduledWorkflow): Promise<void> {
    try {
        const existing = await getScheduledWorkflows();
        const filtered = existing.filter(s => s.workflowId !== scheduled.workflowId);
        filtered.push(scheduled);
        await AsyncStorage.setItem(SCHEDULED_WORKFLOWS_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('[WorkflowScheduler] Failed to save scheduled workflow:', error);
    }
}

async function removeScheduledWorkflow(workflowId: string): Promise<void> {
    try {
        const existing = await getScheduledWorkflows();
        const filtered = existing.filter(s => s.workflowId !== workflowId);
        await AsyncStorage.setItem(SCHEDULED_WORKFLOWS_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('[WorkflowScheduler] Failed to remove scheduled workflow:', error);
    }
}

export default {
    scheduleWorkflow,
    cancelScheduledWorkflow,
    getScheduledWorkflows,
    isWorkflowScheduled,
    toggleWorkflowSchedule,
    rescheduleAllWorkflows,
};
