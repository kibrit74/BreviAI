
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyAdminAccess } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-app-secret, x-admin-key',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const adminAuth = await verifyAdminAccess(request);
    if (!adminAuth.ok) {
        return NextResponse.json(
            { success: false, code: adminAuth.code || 'UNAUTHORIZED', error: adminAuth.message || 'Unauthorized' },
            { status: adminAuth.status || 401, headers: corsHeaders }
        );
    }

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
    const adminAuth = await verifyAdminAccess(request);
    if (!adminAuth.ok) {
        return NextResponse.json(
            { success: false, code: adminAuth.code || 'UNAUTHORIZED', error: adminAuth.message || 'Unauthorized' },
            { status: adminAuth.status || 401, headers: corsHeaders }
        );
    }

    try {
        const id = params.id;
        const body = await request.json();

        // Remove id from body to prevent changing primary key.
        const updateData = { ...body };
        delete updateData.id;

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

    } catch {
        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400, headers: corsHeaders }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const adminAuth = await verifyAdminAccess(request);
    if (!adminAuth.ok) {
        return NextResponse.json(
            { success: false, code: adminAuth.code || 'UNAUTHORIZED', error: adminAuth.message || 'Unauthorized' },
            { status: adminAuth.status || 401, headers: corsHeaders }
        );
    }

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
