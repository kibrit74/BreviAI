export interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfterSec: number;
}

interface RateLimitRecord {
    count: number;
    resetAt: number;
}

declare global {
    var __breviaiRateLimitStore: Map<string, RateLimitRecord> | undefined;
}

const rateLimitStore = globalThis.__breviaiRateLimitStore || new Map<string, RateLimitRecord>();
if (!globalThis.__breviaiRateLimitStore) {
    globalThis.__breviaiRateLimitStore = rateLimitStore;
}

function cleanupExpired(now: number) {
    if (rateLimitStore.size < 5000) return;
    rateLimitStore.forEach((record, key) => {
        if (record.resetAt <= now) {
            rateLimitStore.delete(key);
        }
    });
}

export function getClientIp(request: Request) {
    const xForwardedFor = request.headers.get('x-forwarded-for');
    if (xForwardedFor) {
        const first = xForwardedFor.split(',')[0]?.trim();
        if (first) return first;
    }

    const xRealIp = request.headers.get('x-real-ip');
    if (xRealIp) return xRealIp.trim();

    return 'unknown';
}

export function checkRateLimit(options: {
    key: string;
    limit: number;
    windowMs: number;
    now?: number;
}): RateLimitResult {
    const now = options.now || Date.now();
    cleanupExpired(now);

    const record = rateLimitStore.get(options.key);

    if (!record || now >= record.resetAt) {
        const resetAt = now + options.windowMs;
        rateLimitStore.set(options.key, {
            count: 1,
            resetAt,
        });
        return {
            allowed: true,
            limit: options.limit,
            remaining: Math.max(0, options.limit - 1),
            resetAt,
            retryAfterSec: Math.ceil(options.windowMs / 1000),
        };
    }

    record.count += 1;
    const remaining = Math.max(0, options.limit - record.count);
    const allowed = record.count <= options.limit;

    return {
        allowed,
        limit: options.limit,
        remaining,
        resetAt: record.resetAt,
        retryAfterSec: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
}

export function buildRateLimitHeaders(result: RateLimitResult) {
    return {
        'x-ratelimit-limit': String(result.limit),
        'x-ratelimit-remaining': String(result.remaining),
        'x-ratelimit-reset': String(Math.floor(result.resetAt / 1000)),
        'retry-after': String(result.retryAfterSec),
    };
}
