import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, createRequestId } from '@/lib/api/response';
import { ValidationException, parseQueryParams } from '@/lib/api/validation';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { getOutboxItem, listOutboxItems } from '@/lib/api/outbox';
import { verifyAdminKey } from '@/lib/api/auth';

const outboxQuerySchema = z.object({
    id: z.string().optional(),
    channel: z.enum(['email', 'whatsapp', 'webhook', 'other']).optional(),
    status: z.enum(['pending', 'processing', 'sent', 'failed']).optional(),
    limit: z.string().optional(),
});

export async function GET(request: NextRequest) {
    const requestId = createRequestId('outbox');
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
        key: `api:outbox:${ip}`,
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
        const query = parseQueryParams(new URL(request.url), outboxQuerySchema);
        if (query.id) {
            const item = getOutboxItem(query.id);
            if (!item) {
                return apiError('Outbox item not found', {
                    status: 404,
                    code: 'OUTBOX_NOT_FOUND',
                    requestId,
                    headers: rateHeaders,
                });
            }

            return apiSuccess(
                {
                    item,
                },
                {
                    requestId,
                    code: 'OUTBOX_ITEM_OK',
                    headers: rateHeaders,
                }
            );
        }

        const limit = Math.min(Math.max(Number(query.limit || '100') || 100, 1), 1000);
        const items = listOutboxItems({
            channel: query.channel,
            status: query.status,
            limit,
        });

        return apiSuccess(
            {
                items,
                totalReturned: items.length,
            },
            {
                requestId,
                code: 'OUTBOX_LIST_OK',
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
        const message = error instanceof Error ? error.message : 'Outbox query failed';
        return apiError(message, {
            status: 500,
            code: 'OUTBOX_QUERY_FAILED',
            requestId,
            headers: rateHeaders,
        });
    }
}
