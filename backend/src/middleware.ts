import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

const BASE_CORS_HEADERS = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-app-secret, x-admin-key, idempotency-key',
    'Access-Control-Max-Age': '86400',
};

function resolveAllowedOrigin(request: NextRequest) {
    const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);

    if (configuredOrigins.length === 0) {
        return '*';
    }

    const requestOrigin = request.headers.get('origin')?.trim();
    if (requestOrigin && configuredOrigins.includes(requestOrigin)) {
        return requestOrigin;
    }

    return configuredOrigins[0];
}

function buildCorsHeaders(request: NextRequest) {
    return {
        ...BASE_CORS_HEADERS,
        'Access-Control-Allow-Origin': resolveAllowedOrigin(request),
        'Vary': 'Origin',
    };
}

function getRateLimitConfig(pathname: string) {
    // Heavier endpoints get stricter caps
    if (
        pathname.startsWith('/api/generate') ||
        pathname.startsWith('/api/transcribe') ||
        pathname.startsWith('/api/email/send')
    ) {
        return { limit: 60, windowMs: 60_000 };
    }

    if (pathname.startsWith('/api/search') || pathname.startsWith('/api/feedback')) {
        return { limit: 120, windowMs: 60_000 };
    }

    // Default API bucket
    return { limit: 240, windowMs: 60_000 };
}

export function middleware(request: NextRequest) {
    const corsHeaders = buildCorsHeaders(request);

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: corsHeaders,
        });
    }

    // Skip rate-limit for health checks
    if (!request.nextUrl.pathname.startsWith('/api/health')) {
        const ip = getClientIp(request);
        const cfg = getRateLimitConfig(request.nextUrl.pathname);
        const key = `mw:${request.nextUrl.pathname}:${ip}`;
        const result = checkRateLimit({
            key,
            limit: cfg.limit,
            windowMs: cfg.windowMs,
        });

        if (!result.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    code: 'RATE_LIMITED',
                    error: 'Too many requests',
                    message: 'Too many requests',
                    timestamp: new Date().toISOString(),
                },
                {
                    status: 429,
                    headers: {
                        ...corsHeaders,
                        ...buildRateLimitHeaders(result),
                    },
                }
            );
        }
    }

    // Add CORS headers to all responses
    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
