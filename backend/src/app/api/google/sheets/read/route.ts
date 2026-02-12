
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { spreadsheetId, range, accessToken } = body;

        if (!spreadsheetId || !range) {
            return NextResponse.json(
                { error: 'Spreadsheet ID and Range are required' },
                { status: 400 }
            );
        }

        // Strategy: Use API Key (Public Sheets) OR Access Token (Private Sheets)
        // For now, we rely on the implementation where the user might provide a token OR the sheet is public.
        // If the sheet is private and no token is provided, this will fail.

        let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
        const headers: any = {};

        // If we have an access token (e.g. from client authentication), use it
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        } else {
            // Fallback to Server-Side API Key if available
            // Priority: GOOGLE_SHEETS_API_KEY -> GOOGLE_API_KEY -> GEMINI_API_KEY
            const apiKey = process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

            if (apiKey) {
                url += `?key=${apiKey}`;
            } else {
                console.warn('[Google Sheets] No Access Token or API Key provided.');
                return NextResponse.json(
                    { error: 'Server Configuration Error: Missing GOOGLE_API_KEY in backend .env' },
                    { status: 500 }
                );
            }
        }

        console.log('[Google Sheets] Fetching:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Google Sheets] API Error:', data);
            return NextResponse.json(
                { error: data.error?.message || 'Google Sheets API Error', details: data },
                { status: response.status }
            );
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('[Google Sheets] Server Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 }
        );
    }
}
