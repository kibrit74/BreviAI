
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;

    const { data, error } = await supabaseAdmin
        .from('templates')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        return NextResponse.json(
            { success: false, error: 'Template not found' },
            { status: 404, headers: corsHeaders }
        );
    }

    return NextResponse.json({
        success: true,
        template: data
    }, { headers: corsHeaders });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const body = await request.json();

        // Remove id from body to prevent changing primary key (unless we want to allow that? usually bad idea)
        const { id: _, ...updateData } = body;

        const { data, error } = await supabaseAdmin
            .from('templates')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating template:', error);
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
        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400, headers: corsHeaders }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;

    const { error } = await supabaseAdmin
        .from('templates')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting template:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500, headers: corsHeaders }
        );
    }

    return NextResponse.json({
        success: true,
        message: 'Template deleted'
    }, { headers: corsHeaders });
}
