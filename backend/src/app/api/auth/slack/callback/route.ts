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

function parseMobileRedirectUri(state: string | null): string {
    const fallback = 'brevi-ai://oauth';
    if (!state) return fallback;

    try {
        const decodedState = Buffer.from(state, 'base64url').toString('utf8');
        const parsed = JSON.parse(decodedState) as { redirectUri?: unknown };
        if (typeof parsed.redirectUri === 'string' && parsed.redirectUri) {
            return parsed.redirectUri;
        }
    } catch {
        // Legacy state format fallback below.
    }

    try {
        const decoded = decodeURIComponent(state);
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(decoded)) {
            return decoded;
        }
    } catch {
        // ignore
    }

    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(state)) {
        return state;
    }

    return fallback;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function redirectToClient(targetUrl: string): NextResponse {
    if (/^https?:\/\//i.test(targetUrl)) {
        return NextResponse.redirect(targetUrl);
    }

    const safeHref = escapeHtml(targetUrl);
    const jsTarget = JSON.stringify(targetUrl);
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${safeHref}" />
  <title>Returning to BreviAI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; background:#0b1220; color:#e5eefc; display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0; padding:16px; }
    .card { width:100%; max-width:420px; background:#101a2c; border:1px solid #24344d; border-radius:16px; padding:20px; }
    a { display:inline-block; margin-top:12px; background:#2563eb; color:white; text-decoration:none; padding:10px 14px; border-radius:10px; font-weight:600; }
    p { margin:8px 0; color:#b7c8e6; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="margin:0 0 8px 0;">BreviAI'ye donuluyor...</h2>
    <p>Eger uygulama otomatik acilmazsa asagidaki butona dokunun.</p>
    <a href="${safeHref}">Uygulamaya Don</a>
  </div>
  <script>
    (function () {
      var url = ${jsTarget};
      try { window.location.replace(url); } catch (_) {}
      setTimeout(function () {
        try { window.location.href = url; } catch (_) {}
      }, 250);
    })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store, no-cache, must-revalidate',
        },
    });
}

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const { searchParams } = requestUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const mobileRedirectUri = parseMobileRedirectUri(state);

    console.log('[Slack Auth Callback] Code received:', !!code);
    console.log('[Slack Auth Callback] Mobile Redirect:', mobileRedirectUri);

    if (error || !code) {
        console.error('[Slack Auth Callback] Error:', error);
        return redirectToClient(`${mobileRedirectUri}?error=${error || 'no_code'}`);
    }

    const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
    const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
    const requestOrigin = resolveRequestOrigin(request);
    const configuredBackendUrl = normalizeBaseUrl(process.env.BACKEND_URL);
    // Use the exact callback path that Slack hit (including trailing slash if present)
    // so token exchange redirect_uri matches the authorize redirect_uri precisely.
    const callbackPath = requestUrl.pathname || '/api/auth/slack/callback/';
    const CALLBACK_URL = `${requestOrigin}${callbackPath}`;

    if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
        console.error('[Slack Auth Callback] Missing SLACK_CLIENT_ID or SLACK_CLIENT_SECRET');
        return redirectToClient(`${mobileRedirectUri}?error=server_configuration_error`);
    }

    if (configuredBackendUrl && configuredBackendUrl !== requestOrigin) {
        console.warn('[Slack Auth Callback] BACKEND_URL mismatch. Using request origin for callback.', {
            configuredBackendUrl,
            requestOrigin,
        });
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
            return redirectToClient(`${mobileRedirectUri}?error=${encodeURIComponent(data.error || 'token_failed')}`);
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

        return redirectToClient(deepLink);
    } catch (err) {
        console.error('[Slack Auth Callback] Exception:', err);
        return redirectToClient(`${mobileRedirectUri}?error=server_error`);
    }
}
