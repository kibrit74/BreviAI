import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, createRequestId } from '@/lib/api/response';
import { ValidationException, parseQueryParams } from '@/lib/api/validation';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { clearExecutions, getExecutionStats, listExecutions, recordExecution } from '@/lib/api/execution-history';
import { verifyAdminKey } from '@/lib/api/auth';

const executionQuerySchema = z.object({
    route: z.string().optional(),
    method: z.string().optional(),
    success: z.enum(['true', 'false']).optional(),
    limit: z.string().optional(),
});

export async function GET(request: NextRequest) {
    const requestId = createRequestId('exec');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
        key: `api:executions:${ip}`,
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

    const adminAuth = verifyAdminKey(request);
    if (!adminAuth.ok) {
        return apiError(adminAuth.message || 'Unauthorized', {
            status: adminAuth.status || 401,
            code: adminAuth.code || 'UNAUTHORIZED',
            requestId,
            headers: rateHeaders,
        });
    }

    try {
        const query = parseQueryParams(new URL(request.url), executionQuerySchema);
        const limit = Math.min(Math.max(Number(query.limit || '100') || 100, 1), 1000);
        const success =
            query.success === undefined ? undefined : query.success === 'true';

        const items = listExecutions({
            route: query.route,
            method: query.method,
            success,
            limit,
        });

        const stats = getExecutionStats();
        recordExecution({
            route: '/api/executions',
            method: 'GET',
            statusCode: 200,
            success: true,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            meta: { returned: items.length },
        });

        return apiSuccess(
            {
                items,
                stats,
                totalReturned: items.length,
            },
            {
                requestId,
                code: 'EXECUTION_LIST_OK',
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
        const message = error instanceof Error ? error.message : 'Failed to list executions';
        return apiError(message, {
            status: 500,
            code: 'EXECUTION_LIST_FAILED',
            requestId,
            headers: rateHeaders,
        });
    }
}

export async function DELETE(request: NextRequest) {
    const requestId = createRequestId('exec');
    const ip = getClientIp(request);

    const adminAuth = verifyAdminKey(request);
    if (!adminAuth.ok) {
        return apiError(adminAuth.message || 'Unauthorized', {
            status: adminAuth.status || 401,
            code: adminAuth.code || 'UNAUTHORIZED',
            requestId,
        });
    }

    clearExecutions();
    recordExecution({
        route: '/api/executions',
        method: 'DELETE',
        statusCode: 200,
        success: true,
        durationMs: 0,
        requestId,
        ip,
    });

    return apiSuccess(
        {
            cleared: true,
        },
        {
            requestId,
            code: 'EXECUTION_HISTORY_CLEARED',
        }
    );
}
