
import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/gemini';
import { apiError, createRequestId, createSuccessPayload } from '@/lib/api/response';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { runWithIdempotency } from '@/lib/api/idempotency';
import { recordExecution } from '@/lib/api/execution-history';
import { verifyAppSecret as verifyAppSecretAuth } from '@/lib/api/auth';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-secret, idempotency-key',
};

export async function POST(request: NextRequest) {
    const requestId = createRequestId('transcribe');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const auth = verifyAppSecretAuth(request);
    if (!auth.ok) {
        recordExecution({
            route: '/api/transcribe',
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
            headers: corsHeaders,
        });
    }

    const rateLimit = checkRateLimit({
        key: `api:transcribe:${ip}`,
        limit: 40,
        windowMs: 60_000,
    });
    const rateHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        recordExecution({
            route: '/api/transcribe',
            method: 'POST',
            statusCode: 429,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'RATE_LIMITED',
            errorMessage: 'Too many transcription requests',
        });
        return apiError('Too many requests', {
            status: 429,
            code: 'RATE_LIMITED',
            requestId,
            headers: {
                ...corsHeaders,
                ...rateHeaders,
            },
        });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('audio') as File;

        if (!file) {
            recordExecution({
                route: '/api/transcribe',
                method: 'POST',
                statusCode: 400,
                success: false,
                durationMs: Date.now() - startedAt,
                requestId,
                ip,
                errorCode: 'MISSING_AUDIO_FILE',
                errorMessage: 'No audio file provided',
            });
            return apiError('No audio file provided', {
                status: 400,
                code: 'MISSING_AUDIO_FILE',
                requestId,
                headers: {
                    ...corsHeaders,
                    ...rateHeaders,
                },
            });
        }

        // Convert file to base64
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const mimeType = file.type || 'audio/m4a'; // Default to m4a as it's common in iOS/Expo

        const idempotentResult = await runWithIdempotency({
            request,
            scope: 'audio_transcribe',
            ttlMs: 15 * 60 * 1000,
            handler: async () => {
                const text = await transcribeAudio(base64, mimeType);
                return {
                    status: 200,
                    body: createSuccessPayload(
                        { text: text.trim() },
                        {
                            code: 'TRANSCRIBE_OK',
                            message: 'Transcription completed',
                            requestId,
                        }
                    ),
                };
            },
        });

        recordExecution({
            route: '/api/transcribe',
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
            headers: {
                ...corsHeaders,
                ...rateHeaders,
                'x-idempotency-status': idempotentResult.status,
            },
        });

    } catch (error) {
        console.error('[Transcribe] Error:', error);
        const message = error instanceof Error ? error.message : 'Transcription failed';
        recordExecution({
            route: '/api/transcribe',
            method: 'POST',
            statusCode: 500,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'TRANSCRIBE_FAILED',
            errorMessage: message,
        });
        return apiError(message, {
            status: 500,
            code: 'TRANSCRIBE_FAILED',
            requestId,
            headers: {
                ...corsHeaders,
                ...rateHeaders,
            },
        });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}
