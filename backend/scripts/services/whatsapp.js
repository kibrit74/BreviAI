const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const webhookService = require('./webhook');

const router = express.Router();

const sessions = new Map();
const MAX_SESSIONS = Number(process.env.WA_MAX_SESSIONS || 25);
const REQUIRE_SESSION_ID = String(process.env.WA_REQUIRE_SESSION_ID || 'true').toLowerCase() !== 'false';
const DEFAULT_SESSION_ID = String(process.env.WA_DEFAULT_SESSION_ID || 'default').trim() || 'default';
const SESSION_ID_HELP = "Her cihaz için benzersiz bir sessionId gönderin (x-session-id header veya sessionId query).";

const possibleChromePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.CHROME_PATH || ''
].filter(Boolean);
const chromePath = possibleChromePaths.find(p => fs.existsSync(p));

function sanitizeSessionId(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    const safe = value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    return safe || '';
}

function resolveSessionId(req, allowDefault = true) {
    const raw = req.headers['x-session-id'] || req.query.sessionId || req.query.session || req.body?.sessionId;
    if (!raw) {
        if (allowDefault && !REQUIRE_SESSION_ID) return DEFAULT_SESSION_ID;
        throw new Error(`sessionId required. ${SESSION_ID_HELP}`);
    }
    const sessionId = sanitizeSessionId(raw);
    if (!sessionId) throw new Error(`Invalid sessionId. ${SESSION_ID_HELP}`);
    return sessionId;
}

function getAuthPathForSession(sessionId) {
    const id = sanitizeSessionId(sessionId);
    if (!id) throw new Error(`Invalid sessionId. ${SESSION_ID_HELP}`);
    return path.resolve('./.wwebjs_auth/', `session-breviai-${id}`);
}

function getOrCreateSession(sessionId) {
    const id = sanitizeSessionId(sessionId);
    if (!id) {
        throw new Error(`Invalid sessionId. ${SESSION_ID_HELP}`);
    }
    if (sessions.has(id)) return sessions.get(id);

    if (sessions.size >= MAX_SESSIONS) {
        throw new Error(`Max session limit reached (${MAX_SESSIONS})`);
    }

    const session = {
        sessionId: id,
        client: null,
        ready: false,
        qrCode: null,
        status: 'initializing',
        messagesSent: 0,
        lastError: null,
        user: null,
        initializing: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    sessions.set(id, session);
    initSessionClient(session);
    return session;
}

function initSessionClient(session) {
    if (session.initializing) return;
    session.initializing = true;
    session.status = 'initializing';
    session.ready = false;
    session.qrCode = null;
    session.lastError = null;
    session.updatedAt = Date.now();

    console.log(`[WhatsApp][${session.sessionId}] Initializing client...`);
    if (chromePath) console.log(`[WhatsApp][${session.sessionId}] Using Chrome:`, chromePath);

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: `breviai-${session.sessionId}`,
            dataPath: './.wwebjs_auth/'
        }),
        puppeteer: {
            headless: true,
            executablePath: chromePath || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--disable-gpu'
            ]
        }
    });

    session.client = client;

    client.on('qr', async (qr) => {
        try {
            session.qrCode = await qrcode.toDataURL(qr);
            session.status = 'qr_pending';
            session.updatedAt = Date.now();
            console.log(`[WhatsApp][${session.sessionId}] QR code generated`);
        } catch (err) {
            session.lastError = err.message;
            session.status = 'error';
        }
    });

    client.on('authenticated', () => {
        session.status = 'authenticated';
        session.qrCode = null;
        session.updatedAt = Date.now();
        console.log(`[WhatsApp][${session.sessionId}] Authenticated`);
    });

    client.on('auth_failure', (msg) => {
        session.ready = false;
        session.status = 'auth_failed';
        session.lastError = `Auth failed: ${msg}`;
        session.qrCode = null;
        session.updatedAt = Date.now();
        session.initializing = false;
        console.error(`[WhatsApp][${session.sessionId}] Auth failed:`, msg);
    });

    client.on('loading_screen', (percent, message) => {
        session.status = 'loading';
        session.updatedAt = Date.now();
        console.log(`[WhatsApp][${session.sessionId}] Loading ${percent}% - ${message}`);
    });

    client.on('ready', () => {
        session.ready = true;
        session.status = 'ready';
        session.qrCode = null;
        session.user = {
            name: client.info?.pushname,
            number: client.info?.wid?.user
        };
        session.initializing = false;
        session.updatedAt = Date.now();
        console.log(`[WhatsApp][${session.sessionId}] Ready (${session.user?.number || 'unknown'})`);
    });

    client.on('disconnected', (reason) => {
        session.ready = false;
        session.status = 'disconnected';
        session.lastError = String(reason || 'disconnected');
        session.updatedAt = Date.now();
        session.initializing = false;
        console.log(`[WhatsApp][${session.sessionId}] Disconnected:`, reason);

        setTimeout(() => {
            try {
                initSessionClient(session);
            } catch (e) {
                session.lastError = e.message;
                session.status = 'error';
            }
        }, 5000);
    });

    client.on('message', async (msg) => {
        try {
            await webhookService.sendWhatsAppMessage(msg, session.sessionId);
        } catch (e) {
            console.error(`[WhatsApp][${session.sessionId}] Webhook error:`, e.message);
        }
    });

    client.initialize().catch(err => {
        session.lastError = err.message;
        session.status = 'error';
        session.initializing = false;
        session.updatedAt = Date.now();
        console.error(`[WhatsApp][${session.sessionId}] Initialization failed:`, err.message);
    });
}

async function sendMessage(phone, message, sessionId) {
    const id = sanitizeSessionId(sessionId);
    if (!id) {
        throw new Error(`sessionId required. ${SESSION_ID_HELP}`);
    }

    const session = getOrCreateSession(id);
    if (!session.ready || !session.client) {
        throw new Error(`Session '${session.sessionId}' not ready (status: ${session.status})`);
    }

    let chatId = String(phone || '').replace(/[^\d]/g, '');
    if (chatId.length < 5) {
        throw new Error(`Invalid phone number: ${phone}`);
    }
    if (!chatId.endsWith('@c.us')) {
        chatId += '@c.us';
    }

    const response = await session.client.sendMessage(chatId, message);
    session.messagesSent += 1;
    session.updatedAt = Date.now();

    return {
        messageId: response?.id?._serialized || null,
        to: chatId,
        sessionId: session.sessionId
    };
}

async function restartSession(sessionId) {
    const id = sanitizeSessionId(sessionId);
    if (!id) {
        throw new Error(`sessionId required. ${SESSION_ID_HELP}`);
    }
    const session = getOrCreateSession(id);
    session.ready = false;
    session.status = 'initializing';
    session.qrCode = null;
    session.lastError = null;
    session.updatedAt = Date.now();
    session.initializing = false;

    try {
        if (session.client) {
            await session.client.destroy();
        }
    } catch (e) {
        console.log(`[WhatsApp][${session.sessionId}] destroy warning:`, e.message);
    }
    session.client = null;
    initSessionClient(session);
}

async function clearSession(sessionId) {
    const id = sanitizeSessionId(sessionId);
    if (!id) {
        throw new Error(`sessionId required. ${SESSION_ID_HELP}`);
    }
    const session = sessions.get(id);

    if (session?.client) {
        try {
            await session.client.destroy();
        } catch (e) {
            console.log(`[WhatsApp][${id}] destroy warning:`, e.message);
        }
    }

    const authPath = getAuthPathForSession(id);
    if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
    }

    sessions.delete(id);
    getOrCreateSession(id);
}

function htmlPage(body) {
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsApp Session</title><style>body{font-family:Segoe UI,Arial,sans-serif;background:#f6f7f8;margin:0;padding:24px}.card{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,.08)}h1{margin:0 0 12px 0;font-size:22px}p{margin:8px 0;color:#334155}.meta{font-size:13px;color:#64748b}.qr{max-width:280px;border-radius:8px;border:1px solid #e2e8f0}</style></head><body>${body}</body></html>`;
}

router.get('/sessions', (req, res) => {
    const items = [];
    for (const session of sessions.values()) {
        items.push({
            sessionId: session.sessionId,
            status: session.status,
            ready: session.ready,
            user: session.ready ? session.user : null,
            messagesSent: session.messagesSent,
            updatedAt: session.updatedAt,
            createdAt: session.createdAt,
            hasQr: Boolean(session.qrCode),
            hasError: Boolean(session.lastError),
        });
    }

    res.json({
        requireSessionId: REQUIRE_SESSION_ID,
        defaultSessionId: DEFAULT_SESSION_ID,
        total: items.length,
        sessions: items,
    });
});

router.get('/status', (req, res) => {
    try {
        const sessionId = resolveSessionId(req, true);
        const session = getOrCreateSession(sessionId);
        res.json({
            sessionId: session.sessionId,
            status: session.status,
            ready: session.ready,
            qrCode: session.qrCode,
            user: session.ready ? session.user : null,
            messagesSent: session.messagesSent,
            lastError: session.lastError,
            uptime: process.uptime(),
            updatedAt: session.updatedAt,
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/qr', (req, res) => {
    try {
        const sessionId = resolveSessionId(req, true);
        const session = getOrCreateSession(sessionId);

        if (session.ready) {
            return res.send(htmlPage(`
                <div class="card">
                    <h1>Baglanti Hazir</h1>
                    <p><strong>Session:</strong> ${session.sessionId}</p>
                    <p><strong>Hesap:</strong> ${session.user?.name || 'Kullanici'} (+${session.user?.number || '-'})</p>
                    <p class="meta">Bu session'a bagli mesajlar sadece bu hesapla gonderilir.</p>
                </div>
            `));
        }

        if (session.qrCode) {
            return res.send(htmlPage(`
                <div class="card">
                    <h1>WhatsApp QR</h1>
                    <p><strong>Session:</strong> ${session.sessionId}</p>
                    <img class="qr" src="${session.qrCode}" alt="QR Code" />
                    <p class="meta">Telefonunuzdan Bagli Cihazlar > Cihaz Bagla ile taratin.</p>
                    <p class="meta">Sayfa 10 saniyede bir yenileniyor.</p>
                    <script>setTimeout(()=>location.reload(),10000)</script>
                </div>
            `));
        }

        return res.send(htmlPage(`
            <div class="card">
                <h1>Hazirlaniyor...</h1>
                <p><strong>Session:</strong> ${session.sessionId}</p>
                <p class="meta">Durum: ${session.status}</p>
                <script>setTimeout(()=>location.reload(),2500)</script>
            </div>
        `));
    } catch (err) {
        res.status(400).send(htmlPage(`<div class="card"><h1>Hata</h1><p>${err.message}</p></div>`));
    }
});

router.post('/send', async (req, res) => {
    const { phone, message } = req.body || {};
    if (!phone || !message) {
        return res.status(400).json({ error: 'phone and message required' });
    }

    try {
        const sessionId = resolveSessionId(req, true);
        const result = await sendMessage(phone, message, sessionId);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/restart', async (req, res) => {
    try {
        const sessionId = resolveSessionId(req, true);
        await restartSession(sessionId);
        res.json({ success: true, sessionId, message: 'Session restarting' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/clear-session', async (req, res) => {
    try {
        const sessionId = resolveSessionId(req, true);
        await clearSession(sessionId);
        res.json({ success: true, sessionId, message: 'Session cleared' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = {
    router,
    sendMessage,
    getClient: (sessionId) => {
        const id = sanitizeSessionId(sessionId);
        if (!id) {
            throw new Error(`sessionId required. ${SESSION_ID_HELP}`);
        }
        const session = getOrCreateSession(id);
        return session.client;
    }
};
