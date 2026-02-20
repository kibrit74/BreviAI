import { verifyAdminKey } from '@/lib/api/auth';
import type { AuthValidationResult } from '@/lib/api/auth';
import { supabase } from '@/lib/supabase';

export interface AdminAccessResult extends AuthValidationResult {
    source?: 'admin_key' | 'supabase_bearer';
    userId?: string;
}

function readBearerToken(request: Request) {
    const authHeader = request.headers.get('authorization')?.trim() || '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) return '';
    return authHeader.slice(7).trim();
}

/**
 * Admin access can come from:
 * 1) x-admin-key header (automation/server clients)
 * 2) Supabase user session bearer token (web admin panel)
 */
export async function verifyAdminAccess(request: Request): Promise<AdminAccessResult> {
    const hasAdminKeyHeader = Boolean(request.headers.get('x-admin-key')?.trim());
    let adminKeyResult: AuthValidationResult = { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'Unauthorized' };

    if (hasAdminKeyHeader) {
        adminKeyResult = verifyAdminKey(request);
        if (adminKeyResult.ok) {
            return { ok: true, source: 'admin_key' };
        }
    }

    const bearerToken = readBearerToken(request);
    if (bearerToken) {
        try {
            const { data, error } = await supabase.auth.getUser(bearerToken);
            if (!error && data?.user) {
                return {
                    ok: true,
                    source: 'supabase_bearer',
                    userId: data.user.id,
                };
            }
        } catch (error) {
            console.error('Supabase bearer verification failed:', error);
        }
    }

    if (hasAdminKeyHeader) {
        return {
            ok: false,
            status: adminKeyResult.status || 401,
            code: adminKeyResult.code || 'UNAUTHORIZED',
            message: adminKeyResult.message || 'Unauthorized',
        };
    }

    return {
        ok: false,
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Admin authentication required.',
    };
}
