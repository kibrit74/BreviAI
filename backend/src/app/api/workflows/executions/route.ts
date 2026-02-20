import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, createRequestId } from '@/lib/api/response';
import { ValidationException, parseJsonBody, parseQueryParams } from '@/lib/api/validation';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import {
    getWorkflowRunStats,
    listWorkflowRuns,
    recordWorkflowRun,
} from '@/lib/workflows/reliability';
import { recordExecution } from '@/lib/api/execution-history';

const workflowExecutionSchema = z.object({
    workflowId: z.string().trim().min(1).max(120),
    workflowName: z.string().trim().max(200).optional(),
    success: z.boolean(),
    durationMs: z.number().min(0).max(60 * 60 * 1000).optional().default(0),
    errorCode: z.string().trim().max(120).optional(),
    errorMessage: z.string().trim().max(4000).optional(),
    meta: z.record(z.any()).optional(),
});

const querySchema = z.object({
    workflowId: z.string().optional(),
    limit: z.string().optional(),
});

function verifyAppSecret(request: NextRequest): boolean {
    const secret = request.headers.get('x-app-secret');
    if (!process.env.APP_SECRET || process.env.NODE_ENV === 'development') return true;
    return secret === process.env.APP_SECRET;
}

function hasReadAccess(request: NextRequest) {
    if (verifyAppSecret(request)) return true;
    if (!process.env.ADMIN_KEY) return true;
    return request.headers.get('x-admin-key') === process.env.ADMIN_KEY;
}

export async function POST(request: NextRequest) {
    const requestId = createRequestId('wexec');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
        key: `api:workflow_execution_post:${ip}`,
        limit: 120,
        windowMs: 60_000,
    });
    const rateHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        return apiError('Too many requests', {
            status: 429,
            code: 'RATE_LIMITED',
            requestId,
            headers: rateHeaders,
        });
    }

    if (!verifyAppSecret(request)) {
        return apiError('Unauthorized', {
            status: 401,
            code: 'UNAUTHORIZED',
            requestId,
            headers: rateHeaders,
        });
    }

    try {
        const payload = await parseJsonBody(request, workflowExecutionSchema);
        const run = recordWorkflowRun({
            workflowId: payload.workflowId,
            workflowName: payload.workflowName,
            success: payload.success,
            durationMs: payload.durationMs,
            errorCode: payload.errorCode,
            errorMessage: payload.errorMessage,
            requestId,
            meta: payload.meta,
        });

        recordExecution({
            route: '/api/workflows/executions',
            method: 'POST',
            statusCode: 200,
            success: true,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            meta: {
                workflowId: payload.workflowId,
                workflowSuccess: payload.success,
            },
        });

        return apiSuccess(
            {
                run,
                stats: getWorkflowRunStats(),
            },
            {
                requestId,
                code: 'WORKFLOW_EXECUTION_RECORDED',
                headers: rateHeaders,
            }
        );
    } catch (error) {
        if (error instanceof ValidationException) {
            return apiError(error.message, {
                status: error.status,
                code: error.code,
                details: error.details,
                requestId,
                headers: rateHeaders,
            });
        }
        const message = error instanceof Error ? error.message : 'Failed to record workflow execution';
        recordExecution({
            route: '/api/workflows/executions',
            method: 'POST',
            statusCode: 500,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'WORKFLOW_EXECUTION_RECORD_FAILED',
            errorMessage: message,
        });
        return apiError(message, {
            status: 500,
            code: 'WORKFLOW_EXECUTION_RECORD_FAILED',
            requestId,
            headers: rateHeaders,
        });
    }
}

export async function GET(request: NextRequest) {
    const requestId = createRequestId('wexec');
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
        key: `api:workflow_execution_get:${ip}`,
        limit: 60,
        windowMs: 60_000,
    });
    const rateHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        return apiError('Too many requests', {
            status: 429,
            code: 'RATE_LIMITED',
            requestId,
            headers: rateHeaders,
        });
    }

    if (!hasReadAccess(request)) {
        return apiError('Unauthorized', {
            status: 401,
            code: 'UNAUTHORIZED',
            requestId,
            headers: rateHeaders,
        });
    }

    try {
        const query = parseQueryParams(new URL(request.url), querySchema);
        const limit = Math.min(Math.max(Number(query.limit || '100') || 100, 1), 1000);
        const items = listWorkflowRuns({
            workflowId: query.workflowId,
            limit,
        });

        return apiSuccess(
            {
                items,
                totalReturned: items.length,
                stats: getWorkflowRunStats(),
            },
            {
                requestId,
                code: 'WORKFLOW_EXECUTION_LIST_OK',
                headers: rateHeaders,
            }
        );
    } catch (error) {
        if (error instanceof ValidationException) {
            return apiError(error.message, {
                status: error.status,
                code: error.code,
                details: error.details,
                requestId,
                headers: rateHeaders,
            });
        }
        const message = error instanceof Error ? error.message : 'Failed to list workflow executions';
        return apiError(message, {
            status: 500,
            code: 'WORKFLOW_EXECUTION_LIST_FAILED',
            requestId,
            headers: rateHeaders,
        });
    }
}
