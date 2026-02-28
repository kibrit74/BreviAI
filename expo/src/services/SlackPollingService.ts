/**
 * Slack Trigger Polling Service
 * Polls Slack channels for active SLACK_TRIGGER workflows and starts matching workflows.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkflowStorage } from './WorkflowStorage';
import { workflowEngine } from './WorkflowEngine';
import { SlackTriggerConfig, Workflow } from '../types/workflow-types';
import { userSettingsService } from './UserSettingsService';

const OFFSETS_STORAGE_KEY = '@slack_trigger_offsets';
const POLL_INTERVAL_MS = 5000;

function isSlackTsAfter(currentTs: string, referenceTs: string): boolean {
    if (!currentTs) return false;
    if (!referenceTs) return true;
    const current = Number(currentTs);
    const reference = Number(referenceTs);
    if (!Number.isFinite(current) || !Number.isFinite(reference)) {
        return currentTs > referenceTs;
    }
    return current > reference;
}

class SlackPollingService {
    private isPolling: boolean = false;
    private pollingInterval: NodeJS.Timeout | null = null;
    private isFetching: boolean = false;
    private offsets: Record<string, string> = {};
    private senderCache: Record<string, string> = {};

    constructor() {
        this.loadOffsets();
    }

    async start() {
        if (this.isPolling) {
            console.log('[SlackPolling] Already polling');
            return;
        }

        this.isPolling = true;
        await this.loadOffsets();
        this.poll();
    }

    stop() {
        this.isPolling = false;
        if (this.pollingInterval) {
            clearTimeout(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    async pollOnce() {
        await this.runPollCycle();
    }

    private async poll() {
        if (!this.isPolling) return;
        await this.runPollCycle();
        if (this.isPolling) {
            this.pollingInterval = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
        }
    }

    private async resolveSenderName(token: string, userId: string): Promise<string> {
        if (!userId) return '';
        const cacheKey = `${token}:${userId}`;
        if (this.senderCache[cacheKey]) return this.senderCache[cacheKey];

        try {
            const response = await fetch(`https://slack.com/api/users.info?user=${encodeURIComponent(userId)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.ok) return userId;

            const profile = data.user?.profile || {};
            const name = (
                String(profile.display_name || '').trim() ||
                String(profile.real_name || '').trim() ||
                String(data.user?.real_name || '').trim() ||
                String(data.user?.name || '').trim() ||
                userId
            );
            this.senderCache[cacheKey] = name;
            return name;
        } catch {
            return userId;
        }
    }

    private async runPollCycle() {
        if (this.isFetching) return;
        this.isFetching = true;

        try {
            await userSettingsService.ensureLoaded();
            const defaults = userSettingsService.getSlackConfig();

            const workflows = await WorkflowStorage.getAll();
            const activeSlackWorkflows = workflows.filter(w => {
                if (!w.isActive) return false;
                return w.nodes.some(n => n.type === 'SLACK_TRIGGER');
            });

            if (activeSlackWorkflows.length === 0) return;

            const groups: Record<string, {
                token: string;
                channel: string;
                items: Array<{ workflow: Workflow; config: SlackTriggerConfig }>;
            }> = {};

            for (const workflow of activeSlackWorkflows) {
                const triggerNode = workflow.nodes.find(n => n.type === 'SLACK_TRIGGER');
                if (!triggerNode) continue;
                const config = triggerNode.config as SlackTriggerConfig;

                const token = String(config.botToken || defaults.apiToken || '').trim();
                const channel = String(config.channel || defaults.channelId || '').trim();
                if (!token || !channel) continue;

                const key = `${token}::${channel}`;
                if (!groups[key]) {
                    groups[key] = { token, channel, items: [] };
                }
                groups[key].items.push({ workflow, config });
            }

            for (const [key, group] of Object.entries(groups)) {
                await this.pollChannel(key, group.token, group.channel, group.items);
            }
        } catch (error) {
            console.warn('[SlackPolling] Poll cycle failed:', error);
        } finally {
            this.isFetching = false;
        }
    }

    private async pollChannel(
        key: string,
        token: string,
        channel: string,
        items: Array<{ workflow: Workflow; config: SlackTriggerConfig }>
    ) {
        const lastTs = String(this.offsets[key] || '');
        let newestSeenTs = lastTs;

        try {
            const params = new URLSearchParams();
            params.set('channel', channel);
            params.set('limit', '30');
            if (lastTs) params.set('oldest', lastTs);

            const response = await fetch(`https://slack.com/api/conversations.history?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.ok) {
                const err = data?.error || `HTTP ${response.status}`;
                console.warn(`[SlackPolling] conversations.history failed for ${channel}:`, err);
                return;
            }

            const messages: any[] = Array.isArray(data.messages) ? [...data.messages].reverse() : [];
            for (const msg of messages) {
                const ts = String(msg?.ts || '').trim();
                if (!ts || !isSlackTsAfter(ts, lastTs)) continue;
                if (!newestSeenTs || isSlackTsAfter(ts, newestSeenTs)) newestSeenTs = ts;

                const text = String(msg?.text || '').trim();
                if (!text) continue;

                const subtype = String(msg?.subtype || '').trim();
                const isBotMessage = subtype === 'bot_message' || !!msg?.bot_id;
                const userId = String(msg?.user || '').trim();
                let senderName = String(msg?.username || '').trim() || userId || 'unknown';

                for (const item of items) {
                    const config = item.config;

                    if (isBotMessage && config.includeBotMessages !== true) {
                        continue;
                    }

                    if (config.messageFilter) {
                        let textMatch = false;
                        try {
                            textMatch = new RegExp(config.messageFilter, 'i').test(text);
                        } catch {
                            textMatch = text.toLowerCase().includes(config.messageFilter.toLowerCase());
                        }
                        if (!textMatch) continue;
                    }

                    if (config.senderFilter) {
                        const senderFilter = config.senderFilter.toLowerCase();
                        let senderMatch = false;

                        if (userId && userId.toLowerCase().includes(senderFilter)) {
                            senderMatch = true;
                        }
                        if (!senderMatch && senderName.toLowerCase().includes(senderFilter)) {
                            senderMatch = true;
                        }
                        if (!senderMatch && userId) {
                            senderName = await this.resolveSenderName(token, userId);
                            if (senderName.toLowerCase().includes(senderFilter)) {
                                senderMatch = true;
                            }
                        }

                        if (!senderMatch) continue;
                    }

                    const slackInfo = {
                        sender: senderName,
                        senderUserId: userId,
                        message: text,
                        channel,
                        ts,
                    };

                    const initialVars: Record<string, any> = {
                        _triggerType: 'slack_bot',
                        triggerMessage: text,
                        senderName,
                        slackMessage: text,
                        slackChannel: channel,
                        slackTs: ts,
                        slackUserId: userId,
                        _slackMessage: text,
                        _slackChannel: channel,
                        _slackTs: ts,
                        _slackUserId: userId,
                        _slackSender: senderName,
                    };
                    if (config.variableName) {
                        initialVars[config.variableName] = slackInfo;
                    }

                    workflowEngine.execute(item.workflow, initialVars).catch((error) => {
                        console.error('[SlackPolling] Workflow execution failed:', error);
                    });
                }
            }
        } catch (error) {
            console.warn('[SlackPolling] Channel poll failed:', error);
        } finally {
            if (newestSeenTs && (!lastTs || isSlackTsAfter(newestSeenTs, lastTs))) {
                this.offsets[key] = newestSeenTs;
                await this.saveOffsets();
            }
        }
    }

    private async loadOffsets() {
        try {
            const raw = await AsyncStorage.getItem(OFFSETS_STORAGE_KEY);
            this.offsets = raw ? JSON.parse(raw) : {};
        } catch {
            this.offsets = {};
        }
    }

    private async saveOffsets() {
        try {
            await AsyncStorage.setItem(OFFSETS_STORAGE_KEY, JSON.stringify(this.offsets));
        } catch {
            // best effort
        }
    }

    async refreshPolling() {
        await userSettingsService.ensureLoaded();
        const defaults = userSettingsService.getSlackConfig();

        const workflows = await WorkflowStorage.getAll();
        const hasSlackPollingWorkflow = workflows.some(w => {
            if (!w.isActive) return false;
            const triggerNode = w.nodes.find(n => n.type === 'SLACK_TRIGGER');
            if (!triggerNode) return false;
            const config = triggerNode.config as SlackTriggerConfig;
            const token = String(config.botToken || defaults.apiToken || '').trim();
            const channel = String(config.channel || defaults.channelId || '').trim();
            return !!token && !!channel;
        });

        if (hasSlackPollingWorkflow && !this.isPolling) {
            this.start();
        } else if (!hasSlackPollingWorkflow && this.isPolling) {
            this.stop();
        }
    }
}

export const slackPollingService = new SlackPollingService();
