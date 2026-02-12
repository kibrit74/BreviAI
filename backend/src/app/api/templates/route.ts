
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SEED_TEMPLATES } from '@/data/seed_templates';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-secret',
};

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
    // Attempt to seed if empty (non-blocking often better, but for simplicity here we await or fire-and-forget)
    // We'll await it to ensure first load works if empty
    await seedTemplatesIfNeeded();

    const category = request.nextUrl.searchParams.get('category');

    let query = supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (category && category !== 'All') {
        query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500, headers: corsHeaders }
        );
    }

    return NextResponse.json({
        success: true,
        templates: data,
        total: data.length
    }, { headers: corsHeaders });
}

/**
 * POST /api/templates
 * Get specific template details
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { template_id } = body;

        if (!template_id) {
            return NextResponse.json(
                { success: false, error: 'template_id gerekli' },
                { status: 400, headers: corsHeaders }
            );
        }

        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .eq('id', template_id)
            .single();

        if (error || !data) {
            return NextResponse.json(
                { success: false, error: 'Şablon bulunamadı' },
                { status: 404, headers: corsHeaders }
            );
        }

        return NextResponse.json({
            success: true,
            template: data
        }, { headers: corsHeaders });

    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Geçersiz istek' },
            { status: 400, headers: corsHeaders }
        );
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
