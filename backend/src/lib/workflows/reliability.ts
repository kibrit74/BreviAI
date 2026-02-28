import { inferErrorInsight } from '@/lib/api/error-insights';

export interface WorkflowRunEvent {
    id: string;
    workflowId: string;
    workflowName?: string;
    success: boolean;
    durationMs: number;
    timestamp: string;
    errorCode?: string;
    errorMessage?: string;
    requestId?: string;
    meta?: Record<string, unknown>;
}

export interface WebNodeRunEvent {
    nodeId?: string;
    nodeType: 'WEB_AUTOMATION' | 'BROWSER_SCRAPE';
    success: boolean;
    durationMs: number;
    stepCount?: number;
    avgStepDurationMs?: number;
    scrapeCount?: number;
    emptyScrape?: boolean;
    fallbackUsed?: boolean;
    mode?: string;
    executor?: string;
}

export interface WebNodeTelemetrySummary {
    totalWebNodeRuns: number;
    webNodeSuccessRate: number;
    avgWebNodeStepDurationMs: number;
    emptyScrapeRate: number;
    fallbackRate: number;
    webAutomationRuns: number;
    browserScrapeRuns: number;
}

export interface WorkflowReliabilitySummary {
    workflowId: string;
    workflowName?: string;
    totalRuns: number;
    successRuns: number;
    failedRuns: number;
    successRate: number;
    avgDurationMs: number;
    lastRunAt?: string;
    lastFailureAt?: string;
    lastErrorCategory?: string;
    reliabilityScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    grade: 'A' | 'B' | 'C' | 'D';
    webNodeTelemetry?: WebNodeTelemetrySummary;
}

declare global {
    // eslint-disable-next-line no-var
    var __breviaiWorkflowRunStore: WorkflowRunEvent[] | undefined;
}

const MAX_WORKFLOW_RUNS = Number(process.env.WORKFLOW_RUN_HISTORY_MAX || 20_000);
const workflowRunStore = globalThis.__breviaiWorkflowRunStore || [];
if (!globalThis.__breviaiWorkflowRunStore) {
    globalThis.__breviaiWorkflowRunStore = workflowRunStore;
}

function createRunId() {
    return `wrun_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function recordWorkflowRun(input: Omit<WorkflowRunEvent, 'id' | 'timestamp'> & Partial<Pick<WorkflowRunEvent, 'id' | 'timestamp'>>) {
    const run: WorkflowRunEvent = {
        ...input,
        id: input.id || createRunId(),
        timestamp: input.timestamp || new Date().toISOString(),
        durationMs: Math.max(0, Number(input.durationMs || 0)),
    };

    workflowRunStore.unshift(run);
    if (workflowRunStore.length > MAX_WORKFLOW_RUNS) {
        workflowRunStore.length = MAX_WORKFLOW_RUNS;
    }
    return run;
}

export function listWorkflowRuns(options?: {
    workflowId?: string;
    limit?: number;
}) {
    const limit = Math.min(Math.max(options?.limit || 100, 1), 2000);
    return workflowRunStore
        .filter((run) => (options?.workflowId ? run.workflowId === options.workflowId : true))
        .slice(0, limit);
}

function computeRiskLevel(score: number): WorkflowReliabilitySummary['riskLevel'] {
    if (score < 35) return 'critical';
    if (score < 55) return 'high';
    if (score < 75) return 'medium';
    return 'low';
}

function computeGrade(score: number): WorkflowReliabilitySummary['grade'] {
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    return 'D';
}

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseWebNodeRunEvent(value: unknown): WebNodeRunEvent | null {
    const obj = asObject(value);
    if (!obj) return null;

    const nodeTypeRaw = String(obj.nodeType || '').trim().toUpperCase();
    if (nodeTypeRaw !== 'WEB_AUTOMATION' && nodeTypeRaw !== 'BROWSER_SCRAPE') {
        return null;
    }

    return {
        nodeId: obj.nodeId ? String(obj.nodeId) : undefined,
        nodeType: nodeTypeRaw as WebNodeRunEvent['nodeType'],
        success: Boolean(obj.success),
        durationMs: Math.max(0, toFiniteNumber(obj.durationMs, 0)),
        stepCount: Math.max(0, Math.round(toFiniteNumber(obj.stepCount, 0))) || undefined,
        avgStepDurationMs: Math.max(0, toFiniteNumber(obj.avgStepDurationMs, 0)) || undefined,
        scrapeCount: Math.max(0, Math.round(toFiniteNumber(obj.scrapeCount, 0))) || undefined,
        emptyScrape: obj.emptyScrape === undefined ? undefined : Boolean(obj.emptyScrape),
        fallbackUsed: obj.fallbackUsed === undefined ? undefined : Boolean(obj.fallbackUsed),
        mode: obj.mode ? String(obj.mode) : undefined,
        executor: obj.executor ? String(obj.executor) : undefined,
    };
}

function extractWebNodeRunEvents(meta?: Record<string, unknown>): WebNodeRunEvent[] {
    const metaObj = asObject(meta);
    if (!metaObj) return [];

    const rawWebNodes = metaObj.webNodes;
    if (!Array.isArray(rawWebNodes)) return [];

    return rawWebNodes
        .map(parseWebNodeRunEvent)
        .filter((item): item is WebNodeRunEvent => item !== null);
}

function summarizeWebNodeRuns(runs: WebNodeRunEvent[]): WebNodeTelemetrySummary | undefined {
    if (!runs.length) return undefined;

    const totalWebNodeRuns = runs.length;
    const successRuns = runs.filter((run) => run.success).length;
    const webAutomationRuns = runs.filter((run) => run.nodeType === 'WEB_AUTOMATION').length;
    const browserScrapeRuns = runs.filter((run) => run.nodeType === 'BROWSER_SCRAPE').length;

    const totalStepWeightedDuration = runs.reduce((acc, run) => {
        if (run.stepCount && run.avgStepDurationMs) {
            return acc + run.stepCount * run.avgStepDurationMs;
        }
        return acc + run.durationMs;
    }, 0);

    const totalStepCount = runs.reduce((acc, run) => {
        if (run.stepCount && run.stepCount > 0) return acc + run.stepCount;
        return acc + 1;
    }, 0);

    const emptyScrapeCandidates = runs.filter((run) => (run.scrapeCount || 0) > 0);
    const emptyScrapeRuns = emptyScrapeCandidates.filter((run) => run.emptyScrape === true).length;
    const fallbackRuns = runs.filter((run) => run.fallbackUsed === true).length;

    return {
        totalWebNodeRuns,
        webNodeSuccessRate: Number(((successRuns / totalWebNodeRuns) * 100).toFixed(2)),
        avgWebNodeStepDurationMs: totalStepCount > 0 ? Math.round(totalStepWeightedDuration / totalStepCount) : 0,
        emptyScrapeRate: emptyScrapeCandidates.length > 0
            ? Number(((emptyScrapeRuns / emptyScrapeCandidates.length) * 100).toFixed(2))
            : 0,
        fallbackRate: webAutomationRuns > 0
            ? Number(((fallbackRuns / webAutomationRuns) * 100).toFixed(2))
            : 0,
        webAutomationRuns,
        browserScrapeRuns,
    };
}

function computeReliabilityScore(input: {
    successRate: number;
    avgDurationMs: number;
    totalRuns: number;
    recentFailureRate: number;
}) {
    let score = 100;

    // Main reliability penalty
    score -= (100 - input.successRate) * 0.62;

    // Speed/reliability penalty (slow workflows are generally more failure-prone)
    if (input.avgDurationMs > 1500) {
        const extraDuration = input.avgDurationMs - 1500;
        score -= Math.min(18, extraDuration / 1200);
    }

    // Recent instability penalty
    score -= input.recentFailureRate * 22;

    // Confidence penalty for very low sample size
    if (input.totalRuns < 5) {
        score -= 8;
    } else if (input.totalRuns < 15) {
        score -= 4;
    }

    return Math.max(0, Math.min(100, Number(score.toFixed(2))));
}

export function getWorkflowReliability(options?: {
    workflowId?: string;
    limit?: number;
}) {
    const source = options?.workflowId
        ? workflowRunStore.filter((run) => run.workflowId === options.workflowId)
        : workflowRunStore.slice();

    const grouped = new Map<string, WorkflowRunEvent[]>();
    for (const run of source) {
        if (!grouped.has(run.workflowId)) {
            grouped.set(run.workflowId, []);
        }
        grouped.get(run.workflowId)!.push(run);
    }

    const summaries: WorkflowReliabilitySummary[] = [];
    grouped.forEach((runs, workflowId) => {
        const sortedRuns = runs.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
        const totalRuns = sortedRuns.length;
        const successRuns = sortedRuns.filter((run) => run.success).length;
        const failedRuns = totalRuns - successRuns;
        const successRate = totalRuns ? Number(((successRuns / totalRuns) * 100).toFixed(2)) : 0;
        const avgDurationMs = totalRuns
            ? Math.round(sortedRuns.reduce((acc, run) => acc + run.durationMs, 0) / totalRuns)
            : 0;

        const recentRuns = sortedRuns.slice(0, 10);
        const recentFailureRate = recentRuns.length
            ? recentRuns.filter((run) => !run.success).length / recentRuns.length
            : 0;

        const reliabilityScore = computeReliabilityScore({
            successRate,
            avgDurationMs,
            totalRuns,
            recentFailureRate,
        });
        const webNodeRuns = sortedRuns.flatMap((run) => extractWebNodeRunEvents(run.meta));
        const webNodeTelemetry = summarizeWebNodeRuns(webNodeRuns);

        const lastFailure = sortedRuns.find((run) => !run.success);
        const insight = inferErrorInsight({
            code: lastFailure?.errorCode,
            message: lastFailure?.errorMessage,
        });

        summaries.push({
            workflowId,
            workflowName: sortedRuns[0]?.workflowName,
            totalRuns,
            successRuns,
            failedRuns,
            successRate,
            avgDurationMs,
            lastRunAt: sortedRuns[0]?.timestamp,
            lastFailureAt: lastFailure?.timestamp,
            lastErrorCategory: lastFailure ? insight.category : undefined,
            reliabilityScore,
            riskLevel: computeRiskLevel(reliabilityScore),
            grade: computeGrade(reliabilityScore),
            webNodeTelemetry,
        });
    });

    const sorted = summaries.sort((a, b) => {
        if (a.reliabilityScore !== b.reliabilityScore) return a.reliabilityScore - b.reliabilityScore;
        return b.totalRuns - a.totalRuns;
    });

    if (options?.workflowId) {
        return sorted.slice(0, 1);
    }

    const limit = Math.min(Math.max(options?.limit || 100, 1), 1000);
    return sorted.slice(0, limit);
}

export function getWorkflowRunStats() {
    const totalRuns = workflowRunStore.length;
    const successRuns = workflowRunStore.filter((run) => run.success).length;
    const failedRuns = totalRuns - successRuns;
    const allWebNodeRuns = workflowRunStore.flatMap((run) => extractWebNodeRunEvents(run.meta));
    const webNodeStats = summarizeWebNodeRuns(allWebNodeRuns);

    return {
        totalRuns,
        successRuns,
        failedRuns,
        successRate: totalRuns ? Number(((successRuns / totalRuns) * 100).toFixed(2)) : 0,
        workflowsTracked: new Set(workflowRunStore.map((run) => run.workflowId)).size,
        webNodeStats,
    };
}
