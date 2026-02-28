import { WorkflowEngine } from './WorkflowEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workflow, NotificationTriggerConfig } from '../types/workflow-types';

const SELF_PACKAGES = new Set(['com.breviai.app', 'com.breviai.expo', 'host.exp.exponent']);
const NOTIFICATION_DEBOUNCE_MS = 2500;
const recentNotificationKeys = new Map<string, number>();

function normalizeNotificationPayload(raw: any): { packageName: string; title: string; text: string } | null {
    if (!raw) return null;

    let payload: any = raw;
    if (typeof raw.notification === 'string') {
        try {
            payload = JSON.parse(raw.notification);
        } catch {
            payload = raw;
        }
    } else if (raw.notification && typeof raw.notification === 'object') {
        payload = raw.notification;
    }

    const packageName = String(
        payload?.app ??
        payload?.packageName ??
        payload?.package ??
        raw?.app ??
        raw?.packageName ??
        raw?.package ??
        ''
    ).trim();

    const title = String(payload?.title ?? raw?.title ?? '').trim();
    const text = String(payload?.text ?? payload?.bigText ?? raw?.text ?? raw?.bigText ?? '').trim();

    return { packageName, title, text };
}

function shouldProcessNotificationKey(key: string): boolean {
    const now = Date.now();
    const last = recentNotificationKeys.get(key) || 0;
    if (now - last < NOTIFICATION_DEBOUNCE_MS) {
        return false;
    }
    recentNotificationKeys.set(key, now);

    // Keep memory bounded
    if (recentNotificationKeys.size > 200) {
        for (const [k, t] of recentNotificationKeys) {
            if (now - t > 30000) {
                recentNotificationKeys.delete(k);
            }
        }
    }
    return true;
}

/**
 * Headless JS Task for handling incoming notifications from Android Notification Listener.
 * This runs in the background even if the app is killed.
 */
const NotificationHeadlessTask = async (notification: any) => {
    console.log('[NotificationHeadlessTask] Received notification:', notification);

    if (!notification) return;

    const normalized = normalizeNotificationPayload(notification);
    if (!normalized) return;
    const { packageName, title, text } = normalized;
    if (!packageName) return;

    // Ignore internal notifications to prevent loops
    if (SELF_PACKAGES.has(packageName)) {
        return;
    }

    // Ignore duplicates in a very short window
    const dedupeKey = `${packageName}|${title}|${text}`;
    if (!shouldProcessNotificationKey(dedupeKey)) {
        return;
    }

    try {
        // 1. Load workflows from storage
        const savedWorkflows = await AsyncStorage.getItem('brevi_workflows');
        if (!savedWorkflows) {
            console.log('[NotificationHeadlessTask] No workflows found in storage');
            return;
        }

        const workflows: Workflow[] = JSON.parse(savedWorkflows);

        // 2. Filter workflows with ACTIVE Notification Trigger
        const matchedWorkflows = workflows.filter(workflow => {
            if (!workflow.isActive) return false;

            const triggerNode = workflow.nodes.find(n => n.type === 'NOTIFICATION_TRIGGER');
            if (!triggerNode) return false;

            const config = triggerNode.config as NotificationTriggerConfig;

            // 3. Match Filters
            // Package Name Filter
            if (config.packageName && config.packageName !== packageName) {
                return false;
            }

            // Title Filter (Regex or Includes)
            if (config.titleFilter) {
                if (config.exactMatch) {
                    if (title !== config.titleFilter) return false;
                } else {
                    try {
                        const regex = new RegExp(config.titleFilter, 'i');
                        if (!regex.test(title)) return false;
                    } catch (e) {
                        if (!title?.toLowerCase().includes(config.titleFilter.toLowerCase())) return false;
                    }
                }
            }

            // Text Filter
            if (config.textFilter) {
                if (config.exactMatch) {
                    if (text !== config.textFilter) return false;
                } else {
                    try {
                        const regex = new RegExp(config.textFilter, 'i');
                        if (!regex.test(text)) return false;
                    } catch (e) {
                        if (!text?.toLowerCase().includes(config.textFilter.toLowerCase())) return false;
                    }
                }
            }

            return true;
        });

        if (matchedWorkflows.length === 0) {
            // console.log('[NotificationHeadlessTask] No matching workflows found');
            return;
        }

        console.log(`[NotificationHeadlessTask] Found ${matchedWorkflows.length} matching workflows`);

        // 3. Execute matched workflows
        const engine = WorkflowEngine.getInstance();

        for (const workflow of matchedWorkflows) {
            console.log(`[NotificationHeadlessTask] Executing workflow: ${workflow.name}`);

            // Inject notification data as variables
            const initialVariables = {
                _triggerType: 'notification',
                _notificationPackage: packageName,
                _notificationTitle: title || '',
                _notificationText: text || '',
                // For compatibility with legacy triggers
                triggerMessage: text || title || '',
            };

            // Execute (fire and forget, or await?)
            // Await to prevent resource contention
            try {
                const result = await engine.execute(workflow, initialVariables);
                if (result.success) {
                    console.log(`[NotificationHeadlessTask] Workflow ${workflow.name} completed successfully`);
                } else {
                    console.warn(`[NotificationHeadlessTask] Workflow ${workflow.name} failed:`, result.error);
                }
            } catch (execError) {
                console.error(`[NotificationHeadlessTask] Error executing ${workflow.name}:`, execError);
            }
        }

    } catch (error: any) {
        console.error('[NotificationHeadlessTask] Error processing notification:', error);
    }
};

export default NotificationHeadlessTask;
