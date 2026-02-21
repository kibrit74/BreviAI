/**
 * WhatsApp Backend Polling Service
 * Polls the backend for incoming WhatsApp messages with correct sender phone numbers.
 * Unlike Android notification listener, the backend always provides the real phone number
 * via whatsapp-web.js's msg.from field.
 */

import { WorkflowStorage } from './WorkflowStorage';
import { workflowEngine } from './WorkflowEngine';
import { Workflow } from '../types/workflow-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendConfig } from './nodes/backend';

const LAST_TIMESTAMP_KEY = '@whatsapp_polling_last_timestamp';
const POLL_INTERVAL_MS = 5000; // 5 seconds

interface PendingMessage {
    id: string;
    sessionId: string;
    senderPhone: string;
    notifyName: string;
    body: string;
    timestamp: number;
    hasMedia: boolean;
    type: string;
    isGroup: boolean;
    groupName: string;
}

class WhatsAppPollingService {
    private isPolling: boolean = false;
    private pollingInterval: NodeJS.Timeout | null = null;
    private lastTimestamp: number = 0;
    private isFetching: boolean = false;

    constructor() {
        this.loadLastTimestamp();
    }

    async start() {
        if (this.isPolling) {
            console.log('[WhatsAppPolling] Already polling');
            return;
        }

        console.log('[WhatsAppPolling] Starting service...');
        this.isPolling = true;
        await this.loadLastTimestamp();
        this.poll();
    }

    stop() {
        console.log('[WhatsAppPolling] Stopping service...');
        this.isPolling = false;
        if (this.pollingInterval) {
            clearTimeout(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /** Public method for BackgroundService to call once per heartbeat */
    async pollOnce() {
        // console.log('[WhatsAppPolling] Executing single poll (Background/Task)...');
        await this.runPollCycle();
    }

    private async poll() {
        if (!this.isPolling) return;
        await this.runPollCycle();

        if (this.isPolling) {
            this.pollingInterval = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
        }
    }

    private async runPollCycle() {
        if (this.isFetching) return;
        this.isFetching = true;

        try {
            // Check if there are active WhatsApp trigger workflows
            const workflows = await WorkflowStorage.getAll();
            const waWorkflows = workflows.filter(w => {
                if (!w.isActive) return false;
                return w.nodes.some(n => n.type === 'WHATSAPP_TRIGGER');
            });

            if (waWorkflows.length === 0) return;

            // Fetch pending messages from backend
            const { url: backendUrl, key: authKey } = await getBackendConfig();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(
                `${backendUrl}/whatsapp/messages/pending?since=${this.lastTimestamp}`,
                {
                    method: 'GET',
                    headers: {
                        'x-auth-key': authKey,
                        'Bypass-Tunnel-Reminder': 'true',
                        'ngrok-skip-browser-warning': 'true',
                    },
                    signal: controller.signal,
                }
            );
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('[WhatsAppPolling] Unauthorized. Check auth key.');
                }
                return;
            }

            const data = await response.json();
            if (!data.success || !data.messages || data.messages.length === 0) return;

            console.log(`[WhatsAppPolling] Got ${data.messages.length} new message(s)`);

            for (const msg of data.messages as PendingMessage[]) {
                // Skip group messages for now (can be enabled later)
                if (msg.isGroup) {
                    console.log(`[WhatsAppPolling] Skipping group message from ${msg.groupName}`);
                    continue;
                }

                // Update last timestamp
                if (msg.timestamp > this.lastTimestamp) {
                    this.lastTimestamp = msg.timestamp;
                }

                // Find matching workflows
                for (const wf of waWorkflows) {
                    const trigger = wf.nodes.find(n => n.type === 'WHATSAPP_TRIGGER');
                    if (!trigger) continue;

                    const config = trigger.config as any;
                    let match = true;

                    // Message filter (if configured)
                    if (config.messageFilter) {
                        try {
                            const regex = new RegExp(config.messageFilter, 'i');
                            if (!regex.test(msg.body)) match = false;
                        } catch {
                            if (!msg.body.toLowerCase().includes(config.messageFilter.toLowerCase())) {
                                match = false;
                            }
                        }
                    }

                    // Sender filter (if configured)
                    if (match && config.senderFilter) {
                        const senderMatch = msg.notifyName.toLowerCase().includes(config.senderFilter.toLowerCase())
                            || msg.senderPhone.includes(config.senderFilter.replace(/[^\d]/g, ''));
                        if (!senderMatch) match = false;
                    }

                    if (match) {
                        console.log(`[WhatsAppPolling] ✅ Match! Triggering: ${wf.name} (from: ${msg.senderPhone} / ${msg.notifyName})`);

                        const whatsappInfo = {
                            sender: msg.notifyName || msg.senderPhone,
                            senderPhone: msg.senderPhone,
                            message: msg.body,
                            group: msg.isGroup ? msg.groupName : '',
                        };

                        workflowEngine.execute(wf, {
                            _triggerType: 'whatsapp',
                            _whatsappMessage: msg.body,
                            _whatsappSender: msg.notifyName || msg.senderPhone,
                            _whatsappSenderPhone: msg.senderPhone,
                            _whatsappGroup: msg.isGroup ? msg.groupName : '',
                            _whatsappInfo: whatsappInfo,
                            _notificationTitle: msg.notifyName || msg.senderPhone,
                            _notificationText: msg.body,
                            triggerMessage: msg.body,
                        }).catch(err => {
                            console.error('[WhatsAppPolling] Workflow execution failed:', err);
                        });
                    }
                }
            }

            // Save last timestamp
            await this.saveLastTimestamp();

        } catch (e: any) {
            if (e?.name === 'AbortError' || e?.message === 'Aborted') {
                // Timeout, normal
            } else {
                // Don't spam logs for network errors
                // console.warn('[WhatsAppPolling] Poll error:', e?.message);
            }
        } finally {
            this.isFetching = false;
        }
    }

    private async loadLastTimestamp() {
        try {
            const val = await AsyncStorage.getItem(LAST_TIMESTAMP_KEY);
            this.lastTimestamp = val ? Number(val) : 0;
        } catch {
            this.lastTimestamp = 0;
        }
    }

    private async saveLastTimestamp() {
        try {
            await AsyncStorage.setItem(LAST_TIMESTAMP_KEY, String(this.lastTimestamp));
        } catch {
            // best effort
        }
    }

    /** Call this when a workflow is activated/deactivated */
    async refreshPolling() {
        const workflows = await WorkflowStorage.getAll();
        const hasWaWorkflow = workflows.some(w => {
            if (!w.isActive) return false;
            return w.nodes.some(n => n.type === 'WHATSAPP_TRIGGER');
        });

        if (hasWaWorkflow && !this.isPolling) {
            this.start();
        } else if (!hasWaWorkflow && this.isPolling) {
            this.stop();
        }
    }
}

export const whatsappPollingService = new WhatsAppPollingService();
