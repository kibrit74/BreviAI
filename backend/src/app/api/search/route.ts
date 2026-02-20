import { NextRequest, NextResponse } from 'next/server';
import { searchWeb } from '@/lib/search';
import { z } from 'zod';
import { apiError, apiSuccess, createRequestId } from '@/lib/api/response';
import { ValidationException, parseJsonBody, parseQueryParams } from '@/lib/api/validation';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { recordExecution } from '@/lib/api/execution-history';
import { verifyAppSecret as verifyAppSecretAuth } from '@/lib/api/auth';

const searchSchema = z.object({
    query: z.string().trim().min(1, 'query is required').max(300, 'query too long'),
});

export async function POST(request: NextRequest) {
    const requestId = createRequestId('search');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const auth = verifyAppSecretAuth(request);
    if (!auth.ok) {
        recordExecution({
            route: '/api/search',
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
        key: `api:search:${ip}`,
        limit: 90,
        windowMs: 60_000,
    });
    const rateHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        recordExecution({
            route: '/api/search',
            method: 'POST',
            statusCode: 429,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'RATE_LIMITED',
            errorMessage: 'Too many requests',
        });
        return apiError('Too many requests', {
            status: 429,
            code: 'RATE_LIMITED',
            requestId,
            headers: rateHeaders,
        });
    }

    try {
        const { query } = await parseJsonBody(request, searchSchema);

        console.log('[Search API] 🔍 Searching for:', query);

        const results = await searchWeb(query);

        console.log(`[Search API] ✅ Returned ${results.length} results`);

        recordExecution({
            route: '/api/search',
            method: 'POST',
            statusCode: 200,
            success: true,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            meta: { resultCount: results.length },
        });

        return apiSuccess({
            query,
            results,
            resultCount: results.length,
            message: results.length > 0
                ? `${results.length} arama sonucu bulundu.`
                : 'Sonuç bulunamadı.',
        }, {
            requestId,
            code: 'SEARCH_OK',
            headers: rateHeaders,
        });

    } catch (error) {
        if (error instanceof ValidationException) {
            recordExecution({
                route: '/api/search',
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

        console.error('[Search API] Fatal Error:', error);
        const message = error instanceof Error ? error.message : 'Search failed';
        recordExecution({
            route: '/api/search',
            method: 'POST',
            statusCode: 500,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'SEARCH_FAILED',
            errorMessage: message,
        });
        return apiError(message, {
            status: 500,
            code: 'SEARCH_FAILED',
            requestId,
            headers: rateHeaders,
        });
    }
}

export async function GET(request: NextRequest) {
    const requestId = createRequestId('search');
    const startedAt = Date.now();
    const ip = getClientIp(request);

    try {
        const parsed = parseQueryParams(new URL(request.url), z.object({
            q: z.string().trim().min(1),
        }));

        const forwardedHeaders = new Headers(request.headers);
        const fakeRequest = new Request(request.url, {
            method: 'POST',
            headers: forwardedHeaders,
            body: JSON.stringify({ query: parsed.q }),
        });

        // Reuse same logic path
        return POST(fakeRequest as unknown as NextRequest);
    } catch (error) {
        const validationError =
            error instanceof ValidationException ? error : new ValidationException('q param missing');
        recordExecution({
            route: '/api/search',
            method: 'GET',
            statusCode: validationError.status,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: validationError.code,
            errorMessage: validationError.message,
        });
        return apiError(validationError.message, {
            status: validationError.status,
            code: validationError.code,
            details: validationError.details,
            requestId,
        });
    }
}
