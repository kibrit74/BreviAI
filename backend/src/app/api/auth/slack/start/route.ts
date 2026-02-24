import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get('redirect_uri') || 'brevi-ai://oauth'; // Mobile deep link

    const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
    const BACKEND_URL = process.env.BACKEND_URL || 'https://breviai.vercel.app';
    const CALLBACK_URL = `${BACKEND_URL}/api/auth/slack/callback`;

    if (!SLACK_CLIENT_ID) {
        console.error('[Slack Auth] Missing SLACK_CLIENT_ID in env');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const scopes = [
        'chat:write',
        'channels:read'
    ];

    // Store the mobile redirect URI in the 'state' parameter
    const state = encodeURIComponent(redirectUri);

    console.log('[Slack Auth Start] Redirecting to Slack...');
    console.log('[Slack Auth Start] Callback URI:', CALLBACK_URL);

    const authUrl = `https://slack.com/oauth/v2/authorize?` +
        `client_id=${SLACK_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
        `&scope=${encodeURIComponent(scopes.join(','))}` +
        `&state=${state}`;

    return NextResponse.redirect(authUrl);
}
