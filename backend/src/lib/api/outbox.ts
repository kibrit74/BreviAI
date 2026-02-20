export type OutboxChannel = 'email' | 'whatsapp' | 'webhook' | 'other';
export type OutboxStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface OutboxItem {
    id: string;
    channel: OutboxChannel;
    status: OutboxStatus;
    requestId?: string;
    attempts: number;
    createdAt: string;
    updatedAt: string;
    payloadMeta?: Record<string, unknown>;
    responseMeta?: Record<string, unknown>;
    lastError?: string;
}

export interface OutboxListFilter {
    channel?: OutboxChannel;
    status?: OutboxStatus;
    limit?: number;
}

declare global {
    var __breviaiOutbox: OutboxItem[] | undefined;
}

const MAX_OUTBOX_ITEMS = Number(process.env.OUTBOX_MAX_ITEMS || 3000);
const outbox = globalThis.__breviaiOutbox || [];
if (!globalThis.__breviaiOutbox) {
    globalThis.__breviaiOutbox = outbox;
}

function createOutboxId(channel: OutboxChannel) {
    return `out_${channel}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function touch(item: OutboxItem) {
    item.updatedAt = new Date().toISOString();
}

export function createOutboxItem(input: {
    channel: OutboxChannel;
    requestId?: string;
    payloadMeta?: Record<string, unknown>;
}) {
    const now = new Date().toISOString();
    const item: OutboxItem = {
        id: createOutboxId(input.channel),
        channel: input.channel,
        status: 'pending',
        requestId: input.requestId,
        attempts: 0,
        createdAt: now,
        updatedAt: now,
        payloadMeta: input.payloadMeta,
    };
    outbox.unshift(item);
    if (outbox.length > MAX_OUTBOX_ITEMS) {
        outbox.length = MAX_OUTBOX_ITEMS;
    }
    return item;
}

export function getOutboxItem(id: string) {
    return outbox.find((item) => item.id === id);
}

export function markOutboxProcessing(id: string) {
    const item = getOutboxItem(id);
    if (!item) return null;
    item.status = 'processing';
    item.attempts += 1;
    touch(item);
    return item;
}

export function markOutboxSent(id: string, responseMeta?: Record<string, unknown>) {
    const item = getOutboxItem(id);
    if (!item) return null;
    item.status = 'sent';
    item.lastError = undefined;
    item.responseMeta = responseMeta;
    touch(item);
    return item;
}

export function markOutboxFailed(id: string, error: string) {
    const item = getOutboxItem(id);
    if (!item) return null;
    item.status = 'failed';
    item.lastError = error;
    touch(item);
    return item;
}

export function listOutboxItems(filter: OutboxListFilter = {}) {
    const limit = Math.min(Math.max(filter.limit || 100, 1), 1000);
    return outbox
        .filter((item) => {
            if (filter.channel && item.channel !== filter.channel) return false;
            if (filter.status && item.status !== filter.status) return false;
            return true;
        })
        .slice(0, limit);
}
