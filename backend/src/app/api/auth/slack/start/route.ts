import { NextResponse } from 'next/server';

function normalizeBaseUrl(value?: string | null): string | null {
    const v = value?.trim();
    if (!v) return null;
    return v.replace(/\/+$/, '');
}

function resolveRequestOrigin(request: Request): string {
    const url = new URL(request.url);
    const xfHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const xfProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    if (xfHost) {
        return `${xfProto || url.protocol.replace(':', '')}://${xfHost}`;
    }
    return url.origin;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get('redirect_uri') || 'brevi-ai://oauth'; // Mobile deep link

    const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
    const requestOrigin = resolveRequestOrigin(request);
    const configuredBackendUrl = normalizeBaseUrl(process.env.BACKEND_URL);
    const callbackBaseUrl = requestOrigin;
    const CALLBACK_URL = `${callbackBaseUrl}/api/auth/slack/callback`;

    if (!SLACK_CLIENT_ID) {
        console.error('[Slack Auth] Missing SLACK_CLIENT_ID in env');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const scopes = [
        'chat:write',
        'channels:read'
    ];

    // Store the mobile redirect URI in the state parameter (base64url JSON to avoid encoding edge cases)
    const state = Buffer.from(JSON.stringify({ redirectUri }), 'utf8').toString('base64url');

    console.log('[Slack Auth Start] Redirecting to Slack...');
    if (configuredBackendUrl && configuredBackendUrl !== requestOrigin) {
        console.warn('[Slack Auth Start] BACKEND_URL mismatch. Using request origin for callback.', {
            configuredBackendUrl,
            requestOrigin,
        });
    }
    console.log('[Slack Auth Start] Request Origin:', requestOrigin);
    console.log('[Slack Auth Start] Callback URI:', CALLBACK_URL);

    const authUrl = `https://slack.com/oauth/v2/authorize?` +
        `client_id=${SLACK_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
        `&scope=${encodeURIComponent(scopes.join(','))}` +
        `&state=${encodeURIComponent(state)}`;

    return NextResponse.redirect(authUrl);
}
