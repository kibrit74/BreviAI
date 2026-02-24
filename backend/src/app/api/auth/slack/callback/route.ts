import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const mobileRedirectUri = state ? decodeURIComponent(state) : 'brevi-ai://oauth';

    console.log('[Slack Auth Callback] Code received:', !!code);
    console.log('[Slack Auth Callback] Mobile Redirect:', mobileRedirectUri);

    if (error || !code) {
        console.error('[Slack Auth Callback] Error:', error);
        return NextResponse.redirect(`${mobileRedirectUri}?error=${error || 'no_code'}`);
    }

    const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
    const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
    const BACKEND_URL = process.env.BACKEND_URL || 'https://breviai.vercel.app';
    const CALLBACK_URL = `${BACKEND_URL}/api/auth/slack/callback`;

    if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
        console.error('[Slack Auth Callback] Missing SLACK_CLIENT_ID or SLACK_CLIENT_SECRET');
        return NextResponse.redirect(`${mobileRedirectUri}?error=server_configuration_error`);
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: SLACK_CLIENT_ID,
                client_secret: SLACK_CLIENT_SECRET,
                redirect_uri: CALLBACK_URL,
            }),
        });

        const data = await tokenResponse.json();

        if (!data.ok) {
            console.error('[Slack Auth Callback] Token exchange failed:', data);
            return NextResponse.redirect(`${mobileRedirectUri}?error=${encodeURIComponent(data.error || 'token_failed')}`);
        }

        console.log('[Slack Auth Callback] Tokens received successfully');

        // Note: For Slack Bot tokens, we usually get access_token (which is a bot token: xoxb-...)
        // and sometimes authed_user depending on scopes requested.
        const accessToken = data.access_token;
        const workspaceId = data.team?.id || '';
        const workspaceName = data.team?.name || '';

        // Redirect back to mobile with tokens
        // Slack tokens typically don't expire unless revoked, so they don't have refresh_token/expires_in commonly.
        const deepLink = `${mobileRedirectUri}?` +
            `slack_token=${encodeURIComponent(accessToken)}` +
            `&workspace_id=${encodeURIComponent(workspaceId)}` +
            `&workspace_name=${encodeURIComponent(workspaceName)}`;

        return NextResponse.redirect(deepLink);
    } catch (err) {
        console.error('[Slack Auth Callback] Exception:', err);
        return NextResponse.redirect(`${mobileRedirectUri}?error=server_error`);
    }
}
