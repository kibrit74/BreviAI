import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const mobileRedirectUri = state ? decodeURIComponent(state) : 'brevi-ai://oauth';

    console.log('[Auth Callback] Code received:', !!code);
    console.log('[Auth Callback] Mobile Redirect:', mobileRedirectUri);

    if (error || !code) {
        console.error('[Auth Callback] Error:', error);
        return NextResponse.redirect(`${mobileRedirectUri}?error=${error || 'no_code'}`);
    }

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '833238118432-mqj511qs6qn50u33fshl1ohkb62a1tm7.apps.googleusercontent.com';
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; // Must be set in .env
    const BACKEND_URL = process.env.BACKEND_URL || 'https://breviai.vercel.app';
    const CALLBACK_URL = `${BACKEND_URL}/api/auth/google/callback`;

    if (!GOOGLE_CLIENT_SECRET) {
        console.error('[Auth Callback] Missing GOOGLE_CLIENT_SECRET');
        return NextResponse.redirect(`${mobileRedirectUri}?error=server_configuration_error`);
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: CALLBACK_URL,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('[Auth Callback] Token exchange failed:', tokens);
            return NextResponse.redirect(`${mobileRedirectUri}?error=${encodeURIComponent(tokens.error_description || 'token_failed')}`);
        }

        console.log('[Auth Callback] Tokens received successfully');

        // Redirect back to mobile with tokens
        const deepLink = `${mobileRedirectUri}?` +
            `access_token=${tokens.access_token}` +
            `&refresh_token=${tokens.refresh_token || ''}` +
            `&expires_in=${tokens.expires_in}`;

        return NextResponse.redirect(deepLink);
    } catch (err) {
        console.error('[Auth Callback] Exception:', err);
        return NextResponse.redirect(`${mobileRedirectUri}?error=server_error`);
    }
}
