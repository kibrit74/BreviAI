import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, createRequestId } from '@/lib/api/response';
import { ValidationException, parseQueryParams } from '@/lib/api/validation';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { getWorkflowReliability, getWorkflowRunStats } from '@/lib/workflows/reliability';
import { recordExecution } from '@/lib/api/execution-history';

const querySchema = z.object({
    workflowId: z.string().optional(),
    limit: z.string().optional(),
});

function hasReadAccess(request: NextRequest) {
    if (!process.env.APP_SECRET || process.env.NODE_ENV === 'development') return true;
    const appSecret = request.headers.get('x-app-secret');
    const adminKey = request.headers.get('x-admin-key');
    return appSecret === process.env.APP_SECRET || (!!process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY);
}

export async function GET(request: NextRequest) {
    const requestId = createRequestId('wrel');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
        key: `api:workflow_reliability:${ip}`,
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
        const items = getWorkflowReliability({
            workflowId: query.workflowId,
            limit,
        });
        const globalStats = getWorkflowRunStats();

        recordExecution({
            route: '/api/workflows/reliability',
            method: 'GET',
            statusCode: 200,
            success: true,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            meta: {
                workflowId: query.workflowId,
                returned: items.length,
            },
        });

        return apiSuccess(
            {
                items,
                totalReturned: items.length,
                globalStats,
            },
            {
                requestId,
                code: 'WORKFLOW_RELIABILITY_OK',
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
        const message = error instanceof Error ? error.message : 'Failed to compute reliability';
        recordExecution({
            route: '/api/workflows/reliability',
            method: 'GET',
            statusCode: 500,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'WORKFLOW_RELIABILITY_FAILED',
            errorMessage: message,
        });
        return apiError(message, {
            status: 500,
            code: 'WORKFLOW_RELIABILITY_FAILED',
            requestId,
            headers: rateHeaders,
        });
    }
}
