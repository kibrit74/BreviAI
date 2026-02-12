import { NextRequest, NextResponse } from 'next/server';
import { searchWeb } from '@/lib/search';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query } = body;

        if (!query) {
            return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
        }

        console.log('[Search API] 🔍 Searching for:', query);

        const results = await searchWeb(query);

        console.log(`[Search API] ✅ Returned ${results.length} results`);

        return NextResponse.json({
            success: true,
            query: query,
            results: results,
            resultCount: results.length,
            message: results.length > 0
                ? `${results.length} arama sonucu bulundu.`
                : 'Sonuç bulunamadı.'
        });

    } catch (error) {
        console.error('[Search API] Fatal Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Search failed'
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    if (!query) return NextResponse.json({ error: 'q param missing' });
    const fakeRequest = { json: async () => ({ query }) } as NextRequest;
    return POST(fakeRequest);
}
