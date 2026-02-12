import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get('redirect_uri') || 'brevi-ai://oauth'; // Mobile deep link

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '833238118432-mqj511qs6qn50u33fshl1ohkb62a1tm7.apps.googleusercontent.com';
    // Use Vercel URL as default
    const BACKEND_URL = process.env.BACKEND_URL || 'https://breviai.vercel.app';
    const CALLBACK_URL = `${BACKEND_URL}/api/auth/google/callback`;

    const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
    ];

    // Store the mobile redirect URI in the 'state' parameter
    const state = encodeURIComponent(redirectUri);

    console.log('[Auth Start] Redirecting to Google...');
    console.log('[Auth Start] Callback URI:', CALLBACK_URL);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes.join(' '))}` +
        `&state=${state}` +
        `&access_type=offline` +
        `&prompt=consent`;

    return NextResponse.redirect(authUrl);
}
