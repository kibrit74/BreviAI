import { supabase } from '@/lib/supabase';

type HeaderMap = Record<string, string>;

export async function withAdminAuthHeaders(baseHeaders: HeaderMap = {}): Promise<HeaderMap> {
    try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) return { ...baseHeaders };

        return {
            ...baseHeaders,
            Authorization: `Bearer ${token}`,
        };
    } catch (error) {
        console.error('Failed to read admin session token:', error);
        return { ...baseHeaders };
    }
}

