import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, createRequestId, createSuccessPayload, apiSuccess } from '@/lib/api/response';
import { ValidationException, parseJsonBody } from '@/lib/api/validation';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { runWithIdempotency } from '@/lib/api/idempotency';
import { recordExecution } from '@/lib/api/execution-history';
import { verifyAppSecret as verifyAppSecretAuth, verifyAdminKey } from '@/lib/api/auth';

// Feedback store (in production, use a database)
const feedbackStore: Array<{
    id: string;
    prompt: string;
    shortcut_id?: string;
    type: 'error' | 'improvement' | 'success';
    message: string;
    timestamp: Date;
}> = [];

const feedbackSchema = z.object({
    prompt: z.string().max(2000).optional().default(''),
    shortcut_id: z.string().max(120).optional(),
    type: z.enum(['error', 'improvement', 'success']),
    message: z.string().max(5000).optional().default(''),
});

/**
 * POST /api/feedback
 * Submit feedback for failed or improved shortcuts
 */
export async function POST(request: NextRequest) {
    const requestId = createRequestId('fb');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const auth = verifyAppSecretAuth(request);
    if (!auth.ok) {
        recordExecution({
            route: '/api/feedback',
            method: 'POST',
            statusCode: auth.status || 401,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: auth.code || 'UNAUTHORIZED',
            errorMessage: auth.message || 'Unauthorized',
        });
        return apiError(auth.message || 'Unauthorized', {
            status: auth.status || 401,
            code: auth.code || 'UNAUTHORIZED',
            requestId,
        });
    }

    const rateLimit = checkRateLimit({
        key: `api:feedback:${ip}`,
        limit: 60,
        windowMs: 60_000,
    });
    const rateHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        recordExecution({
            route: '/api/feedback',
            method: 'POST',
            statusCode: 429,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'RATE_LIMITED',
            errorMessage: 'Too many feedback requests',
        });
        return apiError('Too many requests', {
            status: 429,
            code: 'RATE_LIMITED',
            requestId,
            headers: rateHeaders,
        });
    }

    try {
        const data = await parseJsonBody(request, feedbackSchema);

        const idempotentResult = await runWithIdempotency({
            request,
            scope: 'feedback_post',
            ttlMs: 15 * 60 * 1000,
            handler: async () => {
                const feedback = {
                    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                    prompt: data.prompt,
                    shortcut_id: data.shortcut_id,
                    type: data.type,
                    message: data.message,
                    timestamp: new Date(),
                };

                feedbackStore.push(feedback);
                console.log(`[Feedback] New ${data.type} feedback:`, feedback);

                return {
                    status: 200,
                    body: createSuccessPayload(
                        {
                            feedback_id: feedback.id,
                            message: 'Geri bildiriminiz alındı. Teşekkürler!',
                        },
                        { code: 'FEEDBACK_ACCEPTED', requestId }
                    ),
                };
            },
        });

        const headers = {
            ...rateHeaders,
            'x-idempotency-status': idempotentResult.status,
        };

        recordExecution({
            route: '/api/feedback',
            method: 'POST',
            statusCode: idempotentResult.result.status,
            success: true,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            meta: {
                idempotencyStatus: idempotentResult.status,
            },
        });

        return NextResponse.json(idempotentResult.result.body, {
            status: idempotentResult.result.status,
            headers,
        });

    } catch (error) {
        if (error instanceof ValidationException) {
            recordExecution({
                route: '/api/feedback',
                method: 'POST',
                statusCode: error.status,
                success: false,
                durationMs: Date.now() - startedAt,
                requestId,
                ip,
                errorCode: error.code,
                errorMessage: error.message,
            });
            return apiError(error.message, {
                status: error.status,
                code: error.code,
                details: error.details,
                requestId,
                headers: rateHeaders,
            });
        }

        const message = error instanceof Error ? error.message : 'Geçersiz istek';
        recordExecution({
            route: '/api/feedback',
            method: 'POST',
            statusCode: 400,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'FEEDBACK_BAD_REQUEST',
            errorMessage: message,
        });
        return apiError(message, {
            status: 400,
            code: 'FEEDBACK_BAD_REQUEST',
            requestId,
            headers: rateHeaders,
        });
    }
}

/**
 * GET /api/feedback
 * Get feedback statistics (admin only)
 */
export async function GET(request: NextRequest) {
    const requestId = createRequestId('fb');
    const startedAt = Date.now();
    const ip = getClientIp(request);

    const adminAuth = verifyAdminKey(request);
    if (!adminAuth.ok) {
        recordExecution({
            route: '/api/feedback',
            method: 'GET',
            statusCode: adminAuth.status || 401,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: adminAuth.code || 'UNAUTHORIZED',
            errorMessage: adminAuth.message || 'Invalid admin key',
        });
        return apiError(adminAuth.message || 'Unauthorized', {
            status: adminAuth.status || 401,
            code: adminAuth.code || 'UNAUTHORIZED',
            requestId,
        });
    }

    const stats = {
        total: feedbackStore.length,
        by_type: {
            error: feedbackStore.filter(f => f.type === 'error').length,
            improvement: feedbackStore.filter(f => f.type === 'improvement').length,
            success: feedbackStore.filter(f => f.type === 'success').length
        },
        recent: feedbackStore.slice(-10)
    };

    recordExecution({
        route: '/api/feedback',
        method: 'GET',
        statusCode: 200,
        success: true,
        durationMs: Date.now() - startedAt,
        requestId,
        ip,
    });

    return apiSuccess({
        stats,
    }, {
        requestId,
        code: 'FEEDBACK_STATS_OK',
    });
}
