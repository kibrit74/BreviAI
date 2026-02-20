import { inferErrorInsight } from '@/lib/api/error-insights';

export interface ExecutionHistoryItem {
    id: string;
    route: string;
    method: string;
    statusCode: number;
    success: boolean;
    durationMs: number;
    timestamp: string;
    requestId?: string;
    ip?: string;
    errorCode?: string;
    errorMessage?: string;
    errorCategory?: string;
    rootCause?: string;
    suggestedFix?: string;
    insightConfidence?: number;
    meta?: Record<string, unknown>;
}

export interface ExecutionFilter {
    route?: string;
    method?: string;
    success?: boolean;
    limit?: number;
}

declare global {
    var __breviaiExecutionHistory: ExecutionHistoryItem[] | undefined;
}

const MAX_HISTORY_ITEMS = Number(process.env.EXECUTION_HISTORY_MAX || 2000);

const executionHistory = globalThis.__breviaiExecutionHistory || [];
if (!globalThis.__breviaiExecutionHistory) {
    globalThis.__breviaiExecutionHistory = executionHistory;
}

function buildRecordId() {
    return `exec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function recordExecution(
    entry: Omit<ExecutionHistoryItem, 'id' | 'timestamp'> &
    Partial<Pick<ExecutionHistoryItem, 'id' | 'timestamp'>>
) {
    let insight: ReturnType<typeof inferErrorInsight> | null = null;
    if (!entry.success && (entry.errorCode || entry.errorMessage)) {
        insight = inferErrorInsight({
            code: entry.errorCode,
            message: entry.errorMessage,
        });
    }

    const item: ExecutionHistoryItem = {
        ...entry,
        id: entry.id || buildRecordId(),
        timestamp: entry.timestamp || new Date().toISOString(),
        ...(insight
            ? {
                errorCategory: entry.errorCategory || insight.category,
                rootCause: entry.rootCause || insight.rootCause,
                suggestedFix: entry.suggestedFix || insight.suggestion,
                insightConfidence: entry.insightConfidence ?? insight.confidence,
            }
            : {}),
    };

    executionHistory.unshift(item);
    if (executionHistory.length > MAX_HISTORY_ITEMS) {
        executionHistory.length = MAX_HISTORY_ITEMS;
    }
    return item;
}

export function listExecutions(filter: ExecutionFilter = {}) {
    const method = filter.method?.toUpperCase();
    const limit = Math.min(Math.max(filter.limit || 100, 1), 1000);

    return executionHistory
        .filter((item) => {
            if (filter.route && item.route !== filter.route) return false;
            if (method && item.method.toUpperCase() !== method) return false;
            if (typeof filter.success === 'boolean' && item.success !== filter.success) return false;
            return true;
        })
        .slice(0, limit);
}

export function getExecutionStats() {
    const total = executionHistory.length;
    const success = executionHistory.filter((item) => item.success).length;
    const failed = total - success;
    const avgDurationMs = total
        ? Math.round(executionHistory.reduce((acc, item) => acc + item.durationMs, 0) / total)
        : 0;

    return {
        total,
        success,
        failed,
        successRate: total ? Number(((success / total) * 100).toFixed(2)) : 0,
        avgDurationMs,
    };
}

export function clearExecutions() {
    executionHistory.length = 0;
}
