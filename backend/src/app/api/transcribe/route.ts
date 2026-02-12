
import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/gemini';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-secret',
};

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('audio') as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No audio file provided' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Convert file to base64
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const mimeType = file.type || 'audio/m4a'; // Default to m4a as it's common in iOS/Expo

        // Transcribe
        const text = await transcribeAudio(base64, mimeType);

        return NextResponse.json({
            success: true,
            text: text.trim(),
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('[Transcribe] Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Transcription failed' },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}
