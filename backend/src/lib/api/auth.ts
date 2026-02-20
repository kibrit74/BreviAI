import { timingSafeEqual } from 'crypto';

export interface AuthValidationResult {
    ok: boolean;
    status?: number;
    code?: string;
    message?: string;
}

function allowInsecureDevAuth() {
    return process.env.NODE_ENV !== 'production' && process.env.ALLOW_INSECURE_DEV_AUTH === 'true';
}

function safeEquals(a: string, b: string) {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
}

function readHeader(request: Request, key: string) {
    return request.headers.get(key)?.trim() || '';
}

export function verifyAppSecret(request: Request): AuthValidationResult {
    const configuredSecret = process.env.APP_SECRET?.trim() || '';
    if (!configuredSecret) {
        if (allowInsecureDevAuth()) return { ok: true };
        return {
            ok: false,
            status: process.env.NODE_ENV === 'production' ? 500 : 401,
            code: 'APP_SECRET_NOT_CONFIGURED',
            message:
                'APP_SECRET is not configured. Set APP_SECRET or ALLOW_INSECURE_DEV_AUTH=true for local development.',
        };
    }

    const providedSecret = readHeader(request, 'x-app-secret');
    if (!providedSecret) {
        return {
            ok: false,
            status: 401,
            code: 'MISSING_APP_SECRET',
            message: 'Missing x-app-secret header.',
        };
    }

    if (!safeEquals(providedSecret, configuredSecret)) {
        return {
            ok: false,
            status: 401,
            code: 'INVALID_APP_SECRET',
            message: 'Invalid x-app-secret.',
        };
    }

    return { ok: true };
}

export function verifyAdminKey(request: Request): AuthValidationResult {
    const configuredAdminKey = process.env.ADMIN_KEY?.trim() || '';
    if (!configuredAdminKey) {
        if (allowInsecureDevAuth()) return { ok: true };
        return {
            ok: false,
            status: process.env.NODE_ENV === 'production' ? 500 : 401,
            code: 'ADMIN_KEY_NOT_CONFIGURED',
            message:
                'ADMIN_KEY is not configured. Set ADMIN_KEY or ALLOW_INSECURE_DEV_AUTH=true for local development.',
        };
    }

    const providedAdminKey = readHeader(request, 'x-admin-key');
    if (!providedAdminKey) {
        return {
            ok: false,
            status: 401,
            code: 'MISSING_ADMIN_KEY',
            message: 'Missing x-admin-key header.',
        };
    }

    if (!safeEquals(providedAdminKey, configuredAdminKey)) {
        return {
            ok: false,
            status: 401,
            code: 'INVALID_ADMIN_KEY',
            message: 'Invalid x-admin-key.',
        };
    }

    return { ok: true };
}
