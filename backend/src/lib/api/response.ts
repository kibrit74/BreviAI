import { NextResponse } from 'next/server';
import { inferErrorInsight } from '@/lib/api/error-insights';

export interface ApiPayloadOptions {
    code?: string;
    message?: string;
    requestId?: string;
}

export interface ApiResponseOptions extends ApiPayloadOptions {
    status?: number;
    headers?: HeadersInit;
}

function fallbackRandomId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createRequestId(prefix = 'req') {
    const randomId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : fallbackRandomId();
    return `${prefix}_${randomId}`;
}

export function createSuccessPayload<T extends Record<string, unknown>>(
    data: T,
    options?: ApiPayloadOptions
) {
    return {
        success: true,
        code: options?.code || 'OK',
        message: options?.message || 'OK',
        requestId: options?.requestId || createRequestId(),
        timestamp: new Date().toISOString(),
        ...data,
    };
}

export function createErrorPayload(
    message: string,
    options: ApiPayloadOptions & {
        details?: unknown;
        extra?: Record<string, unknown>;
    } = {}
) {
    return {
        success: false,
        code: options.code || 'INTERNAL_ERROR',
        error: message,
        message,
        requestId: options.requestId || createRequestId(),
        timestamp: new Date().toISOString(),
        ...(options.details !== undefined ? { details: options.details } : {}),
        ...(options.extra || {}),
    };
}

export function apiSuccess<T extends Record<string, unknown>>(
    data: T,
    options?: ApiResponseOptions
) {
    const payload = createSuccessPayload(data, options);
    return NextResponse.json(payload, {
        status: options?.status || 200,
        headers: options?.headers,
    });
}

export function apiError(
    message: string,
    options: ApiResponseOptions & {
        details?: unknown;
        extra?: Record<string, unknown>;
    }
) {
    const insight = inferErrorInsight({
        code: options.code,
        message,
    });

    const payload = createErrorPayload(message, options);
    const enrichedPayload = {
        ...payload,
        rootCause: insight.rootCause,
        suggestedFix: insight.suggestion,
        errorCategory: insight.category,
        insightConfidence: insight.confidence,
    };
    return NextResponse.json(enrichedPayload, {
        status: options.status || 500,
        headers: options.headers,
    });
}
