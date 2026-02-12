export const maxDuration = 60; // Increase timeout to 60 seconds (Hobby Max)
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import imaps from 'imap-simple';
import { XMLParser } from 'fast-xml-parser';

export async function POST(request: Request) {
    let connection: any = null;
    let imapError: any = null;

    const body = await request.json();
    const { host, port, user, pass, maxResults = 10 } = body;

    console.log('[Email Read Route] Request:', { host, port, user, pass: pass ? '***' : 'MISSING', maxResults });


    // ─────────────────────────────────────────────────────────────
    // STRATEGY 0: OAuth2 (Gmail REST API) - NEW & PREFERRED
    // ─────────────────────────────────────────────────────────────
    if (body.accessToken) {
        try {
            console.log('[Email Read Route] Using OAuth2 access token...');
            const q = body.searchQuery || 'is:unread';
            const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(q)}`;

            const listResponse = await fetch(listUrl, {
                headers: { 'Authorization': `Bearer ${body.accessToken}` }
            });

            if (!listResponse.ok) {
                const errorText = await listResponse.text();
                throw new Error(`Gmail API List Error: ${listResponse.status} ${errorText}`);
            }

            const listData = await listResponse.json();
            const messageIds = listData.messages || [];

            if (messageIds.length === 0) {
                console.log('[Email Read Route] OAuth Success: 0 emails found');
                return NextResponse.json({ success: true, emails: [] });
            }

            // Fetch details for each message
            const emails = await Promise.all(messageIds.map(async (msg: any) => {
                try {
                    const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
                    const detailResponse = await fetch(detailUrl, {
                        headers: { 'Authorization': `Bearer ${body.accessToken}` }
                    });
                    const detail = await detailResponse.json();

                    const headers = detail.payload?.headers || [];
                    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
                    const from = headers.find((h: any) => h.name === 'From')?.value || '(Unknown)';
                    const date = headers.find((h: any) => h.name === 'Date')?.value || '';

                    return {
                        id: detail.id,
                        threadId: detail.threadId,
                        from: from,
                        subject: subject,
                        snippet: detail.snippet || '',
                        body: detail.snippet || '', // Simplify for now
                        date: date,
                        _source: 'gmail_api_oauth'
                    };
                } catch (e) {
                    console.error('Failed to fetch msg details', msg.id);
                    return null;
                }
            }));

            console.log(`[Email Read Route] OAuth Success! Fetched ${emails.length} emails.`);
            return NextResponse.json({ success: true, emails: emails.filter(e => e !== null) });

        } catch (oauthError: any) {
            console.error('[Email Read Route] OAuth Failed:', oauthError.message);
            // If OAuth fails (e.g. invalid token), we might want to return 401 directly
            // But for now, let it fall through or return error
            return NextResponse.json(
                { error: 'OAuth API Error', details: oauthError.message },
                { status: 401 }
            );
        }
    }

    if (!host || !user || !pass) {
        return NextResponse.json(
            { error: 'Missing required configuration (host, user, pass) or accessToken' },
            { status: 400 }
        );
    }

    // ─────────────────────────────────────────────────────────────
    // STRATEGY 1: IMAP (Preferred, but blocked on Vercel)
    // ─────────────────────────────────────────────────────────────
    try {
        console.log('[Email Read Route] Attempting IMAP connection...');
        const config = {
            imap: {
                user: user,
                password: pass,
                host: host,
                port: Number(port) || 993,
                tls: true,
                authTimeout: 5000, // Short timeout for IMAP to fail fast on Vercel
                tlsOptions: { rejectUnauthorized: false }
            }
        };

        connection = await Promise.race([
            imaps.connect(config),
            new Promise((_, reject) => setTimeout(() => reject(new Error('IMAP Connection Timeout')), 6000))
        ]);

        await connection.openBox('INBOX');

        const searchQuery = body.searchQuery || 'is:unread'; // Default to unread if not specified

        let searchCriteria: any[] = [];

        if (host === 'imap.gmail.com') {
            // Optimization: Use standard IMAP 'UNSEEN' for basic unread check
            if (searchQuery === 'is:unread' || searchQuery === 'unread') {
                console.log('[Email Read Route] Using Standard IMAP UNSEEN search');
                searchCriteria = ['UNSEEN'];
            } else {
                // Use Gmail's powerful X-GM-RAW extension
                console.log(`[Email Read Route] Using Gmail X-GM-RAW search: "${searchQuery}"`);
                searchCriteria = [['X-GM-RAW', searchQuery]];
            }
        } else {
            // Fallback for standard IMAP
            searchCriteria = [
                ['SINCE', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()]
            ];
        }

        const fetchOptions = {
            bodies: ['HEADER'], // Fetch header only first
            markSeen: false,
            struct: true
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        const sorted = messages.sort((a: any, b: any) => b.attributes.uid - a.attributes.uid).slice(0, Number(maxResults));

        if (sorted.length === 0) {
            connection.end();
            return NextResponse.json({ success: true, emails: [] });
        }

        const results = await Promise.all(sorted.map(async (msg: any) => {
            try {
                const allParts = await connection.getParts(msg.attributes.uid);
                const headerPart = msg.parts.find((p: any) => p.which === 'HEADER');
                const subject = headerPart?.body?.subject?.[0] || '(No Subject)';
                const from = headerPart?.body?.from?.[0] || '(Unknown Sender)';
                const date = headerPart?.body?.date?.[0] || new Date().toISOString();

                // Find text body
                const textPart = allParts.find((p: any) => p.type === 'text' && p.subtype === 'plain')
                    || allParts.find((p: any) => p.type === 'text')
                    || allParts[0];

                let bodyData = '';
                if (textPart) {
                    bodyData = await connection.getPartData(msg, textPart);
                }

                return {
                    id: msg.attributes.uid,
                    threadId: msg.attributes.uid,
                    from: from,
                    subject: subject,
                    snippet: typeof bodyData === 'string' ? bodyData.substring(0, 200) : '...',
                    body: bodyData || '',
                    date: date,
                    _source: 'imap'
                };
            } catch (err) {
                console.warn(`[Email Read] Failed to parse msg ${msg.attributes.uid}`, err);
                return null;
            }
        }));

        connection.end();
        console.log('[Email Read Route] IMAP Success');
        return NextResponse.json({ success: true, emails: results.filter(r => r !== null) });

    } catch (error: any) {
        if (connection) {
            try { connection.end(); } catch (e) { }
        }
        console.warn('[Email Read Route] IMAP Failed:', error.message);
        imapError = error.message;
        // Continue to fallback...
    }

    // ─────────────────────────────────────────────────────────────
    // STRATEGY 2: Gmail Atom Feed (HTTPS Fallback) - Vercel Friendly
    // ─────────────────────────────────────────────────────────────
    try {
        // Only try this if it's Gmail
        if (host !== 'imap.gmail.com') {
            throw new Error('Fallback supported only for Gmail');
        }

        console.log('[Email Read Route] Attempting Gmail Atom Feed Fallback...');

        // Basic Auth for Atom Feed
        const auth = Buffer.from(`${user}:${pass}`).toString('base64');
        const response = await fetch('https://mail.google.com/mail/feed/atom', {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (response.status === 401) {
            throw new Error('Gmail Auth Failed (401). Check App Password.');
        }

        if (!response.ok) {
            throw new Error(`Gmail Feed HTTP ${response.status}`);
        }

        const xmlText = await response.text();
        const parser = new XMLParser();
        const feed = parser.parse(xmlText);

        // Feed structure: feed.entry is array or single object
        let entries = feed.feed?.entry || [];
        if (!Array.isArray(entries)) {
            entries = [entries];
        }

        // Slice to maxResults
        entries = entries.slice(0, Number(maxResults));

        const mappedEmails = entries.map((entry: any, index: number) => ({
            id: entry.id || String(index),
            threadId: entry.id || String(index),
            from: entry.author?.name ? `${entry.author.name} <${entry.author.email}>` : entry.author?.email || '(Unknown)',
            subject: entry.title || '(No Subject)',
            snippet: entry.summary || '', // Atom feed puts snippet in 'summary'
            body: entry.summary || '(Content available in full view)', // Atom feed doesn't give full body, use summary
            date: entry.issued || new Date().toISOString(),
            _source: 'atom_feed_fallback'
        }));

        console.log(`[Email Read Route] Atom Feed Success! Fetched ${mappedEmails.length} emails.`);
        return NextResponse.json({ success: true, emails: mappedEmails });

    } catch (feedError: any) {
        console.error('[Email Read Route] Atom Feed Failed:', feedError);

        return NextResponse.json(
            {
                error: 'Failed to fetch emails via IMAP AND Atom Feed',
                details: `IMAP Error: ${imapError}. Feed Error: ${feedError.message}`
            },
            { status: 500 }
        );
    }
}
