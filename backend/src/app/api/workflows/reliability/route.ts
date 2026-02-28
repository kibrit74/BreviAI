import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, createRequestId } from '@/lib/api/response';
import { ValidationException, parseQueryParams } from '@/lib/api/validation';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { getWorkflowReliability, getWorkflowRunStats } from '@/lib/workflows/reliability';
import { recordExecution } from '@/lib/api/execution-history';
import {
    verifyAppSecret as verifyAppSecretAuth,
    verifyAdminKey,
    type AuthValidationResult,
} from '@/lib/api/auth';

const querySchema = z.object({
    workflowId: z.string().optional(),
    limit: z.string().optional(),
});

function verifyReadAccess(request: NextRequest): AuthValidationResult {
    const appSecretAuth = verifyAppSecretAuth(request);
    if (appSecretAuth.ok) return { ok: true };

    const adminAuth = verifyAdminKey(request);
    if (adminAuth.ok) return { ok: true };

    const bothNotConfigured =
        appSecretAuth.code === 'APP_SECRET_NOT_CONFIGURED' &&
        adminAuth.code === 'ADMIN_KEY_NOT_CONFIGURED';

    if (bothNotConfigured) {
        return {
            ok: false,
            status: Math.max(appSecretAuth.status || 401, adminAuth.status || 401),
            code: 'AUTH_NOT_CONFIGURED',
            message: 'Neither APP_SECRET nor ADMIN_KEY is configured.',
        };
    }

    return {
        ok: false,
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Provide valid x-app-secret or x-admin-key.',
    };
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

    const access = verifyReadAccess(request);
    if (!access.ok) {
        return apiError(access.message || 'Unauthorized', {
            status: access.status || 401,
            code: access.code || 'UNAUTHORIZED',
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
