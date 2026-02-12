/**
 * Telegram Bot Polling Service
 * Continuously polls Telegram Bot API for messages when workflow is active
 */

import { WorkflowStorage } from './WorkflowStorage';
import { workflowEngine } from './WorkflowEngine';
import { TelegramTriggerConfig, Workflow } from '../types/workflow-types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFSET_STORAGE_KEY = '@telegram_bot_offsets';

class TelegramPollingService {
    private isPolling: boolean = false;
    private pollingInterval: NodeJS.Timeout | null = null;
    private offsets: Record<string, number> = {};

    constructor() {
        this.loadOffsets();
    }

    async start() {
        if (this.isPolling) {
            console.log('[TelegramPolling] Already polling');
            return;
        }

        console.log('[TelegramPolling] Starting service...');
        this.isPolling = true;
        await this.loadOffsets();
        this.poll();
    }

    stop() {
        console.log('[TelegramPolling] Stopping service...');
        this.isPolling = false;
        if (this.pollingInterval) {
            clearTimeout(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    private currentController: AbortController | null = null;
    private isFetching = false;
    private lastFetchStart = 0;

    // Public method for Background Service to call once per heartbeat
    async pollOnce() {
        console.log('[TelegramPolling] Executing single poll (Background/Task)...');

        // Background tasks are time-sensitive.
        // If a long-poll is hanging from the Foreground session, ABORT IT.
        if (this.isFetching && this.currentController) {
            console.log('[TelegramPolling] Aborting stuck Long Poll for Background Priority...');
            this.currentController.abort();
            this.isFetching = false;
        }

        // Force a "Short Poll" (no timeout) to quickly check for messages and return
        await this.runPollCycle(true);
    }

    private async runPollCycle(isShortPoll: boolean = false) {
        // Staleness check
        if (this.isFetching) {
            if (Date.now() - this.lastFetchStart > 45000) {
                console.warn('[TelegramPolling] Fetch stuck for > 45s, forcing reset.');
                this.isFetching = false;
            } else {

                // Verbose log removed to prevent spam
                // console.log('[TelegramPolling] Fetch already in progress, skipping...');
                return;
            }
        }

        this.isFetching = true;
        this.lastFetchStart = Date.now();
        this.currentController = new AbortController();

        try {
            // Get active workflows with TELEGRAM_TRIGGER + botToken
            const workflows = await WorkflowStorage.getAll();
            const botWorkflows = workflows.filter(w => {
                if (!w.isActive) return false;
                const trigger = w.nodes.find(n => n.type === 'TELEGRAM_TRIGGER');
                if (!trigger) return false;
                const config = trigger.config as TelegramTriggerConfig;
                return !!config.botToken;
            });

            if (botWorkflows.length === 0) return;

            // Group workflows by botToken
            const tokenWorkflows: Record<string, Workflow[]> = {};
            for (const wf of botWorkflows) {
                const trigger = wf.nodes.find(n => n.type === 'TELEGRAM_TRIGGER')!;
                const config = trigger.config as TelegramTriggerConfig;
                const token = config.botToken!;
                if (!tokenWorkflows[token]) tokenWorkflows[token] = [];
                tokenWorkflows[token].push(wf);
            }

            // Poll each bot
            for (const [token, wfs] of Object.entries(tokenWorkflows)) {
                await this.pollBot(token, wfs, isShortPoll);
            }

        } catch (e: any) {
            // Check for AbortError (can manifest as name='AbortError' or message='Aborted')
            if (e?.name === 'AbortError' || e?.message === 'Aborted') {
                console.log('[TelegramPolling] Poll aborted (valid context switch).');
            } else {
                console.error('[TelegramPolling] Poll error:', e);
            }
        } finally {
            this.isFetching = false;
            this.currentController = null;
        }
    }

    private async poll() {
        if (!this.isPolling) return;
        await this.runPollCycle(false); // Normal Long Poll (30s)

        // Schedule next poll
        if (this.isPolling) {
            this.pollingInterval = setTimeout(() => this.poll(), 5000); // Increased to 5s to reduce overlap chance
        }
    }

    private async pollBot(botToken: string, workflows: Workflow[], isShortPoll: boolean) {
        const offset = this.offsets[botToken] || 0;

        // Long Poll = 30s timeout (Foreground)
        // Short Poll = 10s timeout (Background) - 0 is sometimes too aggressive
        const timeoutParam = isShortPoll ? 10 : 30;

        try {
            const signal = this.currentController?.signal;
            // 40s fetch timeout for 30s long-poll, or 15s for short poll
            const fetchLimit = isShortPoll ? 15000 : 40000;
            const timeoutId = setTimeout(() => this.currentController?.abort(), fetchLimit);

            const response = await fetch(
                `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=${timeoutParam}&limit=10`,
                { signal }
            );
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 409) {
                    // Conflict: Another instance is polling. Just ignore.
                    return;
                }
                console.error(`[TelegramPolling] API Error for bot: ${response.status}`);
                return;
            }

            const data = await response.json();

            if (isShortPoll) {
                console.log(`[TelegramPolling] Background Poll for ${botToken.substring(0, 5)}... result: ${data.result?.length || 0} msgs`);
            }

            if (!data.ok || !data.result || data.result.length === 0) {
                return; // No updates
            }

            console.log(`[TelegramPolling] Got ${data.result.length} updates`);

            for (const update of data.result) {
                // Update offset
                this.offsets[botToken] = update.update_id + 1;

                const msg = update.message;
                if (!msg || !msg.text) continue;

                const text = msg.text;
                const chatId = msg.chat.id;
                const chatName = msg.chat.title || msg.chat.first_name || 'Unknown';
                const sender = msg.from?.first_name || 'Unknown';

                console.log(`[TelegramPolling] Message: "${text}" from ${sender}`);

                // Check each workflow for match
                for (const wf of workflows) {
                    const trigger = wf.nodes.find(n => n.type === 'TELEGRAM_TRIGGER')!;
                    const config = trigger.config as TelegramTriggerConfig;

                    let match = true;

                    // Chat name filter
                    if (config.chatNameFilter) {
                        if (!chatName.toLowerCase().includes(config.chatNameFilter.toLowerCase())) {
                            match = false;
                        }
                    }

                    // Message filter
                    if (match && config.messageFilter) {
                        try {
                            const regex = new RegExp(config.messageFilter, 'i');
                            if (!regex.test(text)) match = false;
                        } catch {
                            if (!text.toLowerCase().includes(config.messageFilter.toLowerCase())) {
                                match = false;
                            }
                        }
                    }

                    if (match) {
                        console.log(`[TelegramPolling] ✅ Match! Triggering: ${wf.name}`);

                        // Execute workflow with variables
                        workflowEngine.execute(wf, {
                            _triggerType: 'telegram_bot',
                            triggerMessage: text,
                            chatId: String(chatId),
                            chatName: chatName,
                            senderName: sender,
                            _telegramMessage: text,
                            _telegramChatId: String(chatId)
                        }).catch(err => {
                            console.error('[TelegramPolling] Workflow execution failed:', err);
                        });
                    }
                }
            }

            // Save offsets
            await this.saveOffsets();

        } catch (e) {
            console.error(`[TelegramPolling] Error polling bot:`, e);
        }
    }

    private async loadOffsets() {
        try {
            const json = await AsyncStorage.getItem(OFFSET_STORAGE_KEY);
            this.offsets = json ? JSON.parse(json) : {};
        } catch {
            this.offsets = {};
        }
    }

    private async saveOffsets() {
        try {
            await AsyncStorage.setItem(OFFSET_STORAGE_KEY, JSON.stringify(this.offsets));
        } catch (e) {
            console.warn('[TelegramPolling] Failed to save offsets:', e);
        }
    }

    // Call this when a workflow is activated
    async refreshPolling() {
        const workflows = await WorkflowStorage.getAll();
        const hasBotWorkflow = workflows.some(w => {
            if (!w.isActive) return false;
            const trigger = w.nodes.find(n => n.type === 'TELEGRAM_TRIGGER');
            if (!trigger) return false;
            const config = trigger.config as TelegramTriggerConfig;
            return !!config.botToken;
        });

        if (hasBotWorkflow && !this.isPolling) {
            this.start();
        } else if (!hasBotWorkflow && this.isPolling) {
            this.stop();
        }
    }
}

export const telegramPollingService = new TelegramPollingService();
