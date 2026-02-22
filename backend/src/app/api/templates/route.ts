
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SEED_TEMPLATES } from '@/data/seed_templates';
import { z } from 'zod';
import { apiError, apiSuccess, createRequestId } from '@/lib/api/response';
import { ValidationException, parseJsonBody } from '@/lib/api/validation';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { recordExecution } from '@/lib/api/execution-history';
import { verifyAppSecret as verifyAppSecretAuth } from '@/lib/api/auth';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-secret, idempotency-key',
};

const templateIdSchema = z.object({
    template_id: z.string().trim().min(1, 'template_id required'),
});

async function seedTemplatesIfNeeded() {
    try {
        const { count, error } = await supabase
            .from('templates')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Error checking templates count:', error);
            return;
        }

        if (count === 0) {
            console.log('Seeding templates...');
            const { error: insertError } = await supabase
                .from('templates')
                .insert(SEED_TEMPLATES.map(t => ({
                    id: t.id,
                    title: t.title,
                    title_en: t.title_en,
                    description: t.description,
                    description_en: t.description_en,
                    category: t.category,
                    author: t.author,
                    downloads: t.downloads,
                    tags: t.tags,
                    template_json: t.template_json || {},
                })));

            if (insertError) {
                console.error('Error seeding templates:', insertError);
            } else {
                console.log('Templates seeded successfully');
            }
        }
    } catch (e) {
        console.error('Unexpected error during seeding:', e);
    }
}

/**
 * GET /api/templates
 * List all available templates from Supabase
 */
export async function GET(request: NextRequest) {
    const requestId = createRequestId('tpl');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const auth = verifyAppSecretAuth(request);
    if (!auth.ok) {
        recordExecution({
            route: '/api/templates',
            method: 'GET',
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
        key: `api:templates:${ip}`,
        limit: 120,
        windowMs: 60_000,
    });
    const rateHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        recordExecution({
            route: '/api/templates',
            method: 'GET',
            statusCode: 429,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'RATE_LIMITED',
            errorMessage: 'Too many template requests',
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

    // Removed seedTemplatesIfNeeded auto-call to prevent overriding admin deletes
    // Attempt to seed if empty (non-blocking often better, but for simplicity here we await or fire-and-forget)
    // We'll await it to ensure first load works if empty

    let query = supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (category && category !== 'All') {
        query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
        recordExecution({
            route: '/api/templates',
            method: 'GET',
            statusCode: 500,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'TEMPLATE_QUERY_FAILED',
            errorMessage: error.message,
        });
        return apiError(error.message, {
            status: 500,
            code: 'TEMPLATE_QUERY_FAILED',
            requestId,
            headers: {
                ...corsHeaders,
                ...rateHeaders,
            },
        });
    }

    recordExecution({
        route: '/api/templates',
        method: 'GET',
        statusCode: 200,
        success: true,
        durationMs: Date.now() - startedAt,
        requestId,
        ip,
        meta: { total: data.length },
    });

    return apiSuccess({
        templates: data,
        total: data.length,
    }, {
        requestId,
        code: 'TEMPLATES_OK',
        headers: {
            ...corsHeaders,
            ...rateHeaders,
        },
    });
}

/**
 * POST /api/templates
 * Get specific template details
 */
export async function POST(request: NextRequest) {
    const requestId = createRequestId('tpl');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const auth = verifyAppSecretAuth(request);
    if (!auth.ok) {
        recordExecution({
            route: '/api/templates',
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
        key: `api:template_detail:${ip}`,
        limit: 120,
        windowMs: 60_000,
    });
    const rateHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        recordExecution({
            route: '/api/templates',
            method: 'POST',
            statusCode: 429,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'RATE_LIMITED',
            errorMessage: 'Too many template detail requests',
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
        const { template_id } = await parseJsonBody(request, templateIdSchema);

        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .eq('id', template_id)
            .single();

        if (error || !data) {
            recordExecution({
                route: '/api/templates',
                method: 'POST',
                statusCode: 404,
                success: false,
                durationMs: Date.now() - startedAt,
                requestId,
                ip,
                errorCode: 'TEMPLATE_NOT_FOUND',
                errorMessage: 'Şablon bulunamadı',
            });
            return apiError('Şablon bulunamadı', {
                status: 404,
                code: 'TEMPLATE_NOT_FOUND',
                requestId,
                headers: {
                    ...corsHeaders,
                    ...rateHeaders,
                },
            });
        }

        recordExecution({
            route: '/api/templates',
            method: 'POST',
            statusCode: 200,
            success: true,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            meta: { templateId: template_id },
        });

        return apiSuccess({
            template: data,
        }, {
            requestId,
            code: 'TEMPLATE_DETAIL_OK',
            headers: {
                ...corsHeaders,
                ...rateHeaders,
            },
        });

    } catch (error) {
        if (error instanceof ValidationException) {
            recordExecution({
                route: '/api/templates',
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
                headers: {
                    ...corsHeaders,
                    ...rateHeaders,
                },
            });
        }

        const message = error instanceof Error ? error.message : 'Geçersiz istek';
        recordExecution({
            route: '/api/templates',
            method: 'POST',
            statusCode: 400,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'TEMPLATE_BAD_REQUEST',
            errorMessage: message,
        });
        return apiError(message, {
            status: 400,
            code: 'TEMPLATE_BAD_REQUEST',
            requestId,
            headers: {
                ...corsHeaders,
                ...rateHeaders,
            },
        });
    }
}

/**
 * OPTIONS /api/templates
 * Handle CORS preflight
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}
