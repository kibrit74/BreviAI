
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-secret',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Basic validation
        if (!body.title || !body.description || !body.category || !body.author) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Generate ID if not provided (simple slugification or UUID)
        // Ideally user provides it or we auto-generate. Let's auto-generate a slug if missing.
        let id = body.id;
        if (!id) {
            id = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);
        }

        const newTemplate = {
            id: id,
            title: body.title,
            title_en: body.title_en || null,
            description: body.description,
            description_en: body.description_en || null,
            category: body.category,
            author: body.author,
            downloads: body.downloads || '0',
            tags: body.tags || [],
            template_json: body.template_json || {},
        };

        const { data, error } = await supabase
            .from('templates')
            .insert(newTemplate)
            .select()
            .single();

        if (error) {
            console.error('Error creating template:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500, headers: corsHeaders }
            );
        }

        return NextResponse.json({
            success: true,
            template: data
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('Create template error:', error);
        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400, headers: corsHeaders }
        );
    }
}
