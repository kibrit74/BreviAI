import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { SEED_TEMPLATES } from '@/data/seed_templates';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-secret',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}

/**
 * POST /api/admin/reseed
 * Deletes all templates and reseeds from SEED_TEMPLATES
 * USE WITH CAUTION - This deletes all existing templates!
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Delete all existing templates
        const { error: deleteError } = await supabase
            .from('templates')
            .delete()
            .neq('id', ''); // Delete all

        if (deleteError) {
            console.error('Error deleting templates:', deleteError);
            return NextResponse.json(
                { success: false, error: `Delete failed: ${deleteError.message}` },
                { status: 500, headers: corsHeaders }
            );
        }

        console.log('All templates deleted. Reseeding...');

        // 2. Insert new templates
        const templatesForInsert = SEED_TEMPLATES.map(t => ({
            id: t.id,
            title: t.title,
            title_en: t.title_en || null,
            description: t.description,
            description_en: t.description_en || null,
            category: t.category,
            author: t.author,
            downloads: t.downloads || '0',
            tags: t.tags || [],
            template_json: t.template_json || {},
        }));

        const { data, error: insertError } = await supabase
            .from('templates')
            .insert(templatesForInsert)
            .select();

        if (insertError) {
            console.error('Error inserting templates:', insertError);
            return NextResponse.json(
                { success: false, error: `Insert failed: ${insertError.message}` },
                { status: 500, headers: corsHeaders }
            );
        }

        console.log(`Reseeded ${data?.length || 0} templates successfully`);

        return NextResponse.json({
            success: true,
            message: `Successfully reseeded ${data?.length || 0} templates`,
            count: data?.length || 0
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('Reseed error:', error);
        return NextResponse.json(
            { success: false, error: 'Reseed failed' },
            { status: 500, headers: corsHeaders }
        );
    }
}

/**
 * GET /api/admin/reseed
 * Returns current template count
 */
export async function GET() {
    const { count, error } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true });

    if (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500, headers: corsHeaders }
        );
    }

    return NextResponse.json({
        success: true,
        current_count: count,
        seed_count: SEED_TEMPLATES.length,
        message: count === 0
            ? 'Database is empty. Call POST to reseed.'
            : `Database has ${count} templates. Seed has ${SEED_TEMPLATES.length} templates.`
    }, { headers: corsHeaders });
}
