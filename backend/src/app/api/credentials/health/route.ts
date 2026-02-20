import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, createRequestId } from '@/lib/api/response';
import { ValidationException, parseQueryParams } from '@/lib/api/validation';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { getCredentialHealthHistory, runCredentialHealthCheck } from '@/lib/api/credential-health';
import { recordExecution } from '@/lib/api/execution-history';

const querySchema = z.object({
    probe: z.enum(['true', 'false']).optional(),
    historyLimit: z.string().optional(),
});

function hasAdminAccess(request: NextRequest) {
    if (!process.env.ADMIN_KEY) return true;
    return request.headers.get('x-admin-key') === process.env.ADMIN_KEY;
}

export async function GET(request: NextRequest) {
    const requestId = createRequestId('cred');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
        key: `api:credentials_health:${ip}`,
        limit: 30,
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

    if (!hasAdminAccess(request)) {
        return apiError('Unauthorized', {
            status: 401,
            code: 'UNAUTHORIZED',
            requestId,
            headers: rateHeaders,
        });
    }

    try {
        const query = parseQueryParams(new URL(request.url), querySchema);
        const probe = query.probe === 'true';
        const historyLimit = Math.min(Math.max(Number(query.historyLimit || '20') || 20, 1), 200);

        const snapshot = await runCredentialHealthCheck({ probe });
        const history = getCredentialHealthHistory(historyLimit);

        recordExecution({
            route: '/api/credentials/health',
            method: 'GET',
            statusCode: 200,
            success: true,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            meta: {
                overallStatus: snapshot.overallStatus,
                probe,
            },
        });

        return apiSuccess(
            {
                snapshot,
                history,
                historyCount: history.length,
            },
            {
                requestId,
                code: 'CREDENTIAL_HEALTH_OK',
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
        const message = error instanceof Error ? error.message : 'Credential health check failed';
        recordExecution({
            route: '/api/credentials/health',
            method: 'GET',
            statusCode: 500,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'CREDENTIAL_HEALTH_FAILED',
            errorMessage: message,
        });
        return apiError(message, {
            status: 500,
            code: 'CREDENTIAL_HEALTH_FAILED',
            requestId,
            headers: rateHeaders,
        });
    }
}
