const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const webhookService = require('./webhook');

const router = express.Router();

// ═══════════════════════════════════════════════════
// WhatsApp Service Logic
// ═══════════════════════════════════════════════════

let client;
let clientReady = false;
let currentQR = null;
let connectionStatus = 'initializing';
let messagesSent = 0;
let lastError = null;

// Auto-detect Chrome
const possibleChromePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.CHROME_PATH || ''
].filter(Boolean);

const chromePath = possibleChromePaths.find(p => fs.existsSync(p));

function initClient() {
    console.log('[WhatsApp] Initializing client...');
    if (chromePath) console.log('[WhatsApp] Using Chrome:', chromePath);

    client = new Client({
        authStrategy: new LocalAuth({
            clientId: 'breviai-bot',
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

    setupEvents();
    client.initialize().catch(err => {
        console.error('[WhatsApp] Initialization failed:', err);
        lastError = err.message;
        connectionStatus = 'error';
    });
}

function setupEvents() {
    client.on('qr', async (qr) => {
        console.log('[WhatsApp] QR Code received');
        try {
            currentQR = await qrcode.toDataURL(qr);
            connectionStatus = 'qr_pending';
        } catch (err) {
            console.error('[WhatsApp] QR generation error:', err);
        }
    });

    client.on('authenticated', () => {
        console.log('[WhatsApp] ✅ Authenticated successfully!');
        connectionStatus = 'authenticated';
        currentQR = null;
    });

    client.on('auth_failure', (msg) => {
        console.error('[WhatsApp] ❌ Auth FAILED:', msg);
        clientReady = false;
        connectionStatus = 'auth_failed';
        lastError = 'Auth failed: ' + msg;
        currentQR = null;
    });

    client.on('loading_screen', (percent, message) => {
        console.log(`[WhatsApp] Loading: ${percent}% - ${message}`);
        connectionStatus = 'loading';
    });

    client.on('ready', () => {
        console.log('[WhatsApp] 🟢 Ready! Client is fully connected.');
        clientReady = true;
        connectionStatus = 'ready';
        currentQR = null;
        try {
            console.log('[WhatsApp] User:', client.info?.pushname, '| Number:', client.info?.wid?.user);
        } catch (e) { }
    });

    client.on('disconnected', (reason) => {
        console.log('[WhatsApp] 🔴 Disconnected:', reason);
        clientReady = false;
        connectionStatus = 'disconnected';
        lastError = reason;
        // Auto re-init after disconnect
        console.log('[WhatsApp] Will attempt to re-initialize in 5 seconds...');
        setTimeout(() => {
            console.log('[WhatsApp] Re-initializing after disconnect...');
            initClient();
        }, 5000);
    });

    client.on('message', async (msg) => {
        console.log(`[WhatsApp] Message from ${msg.from}`);
        try {
            await webhookService.sendWhatsAppMessage(msg);
        } catch (e) {
            console.error('[WhatsApp] Webhook error:', e.message);
        }
    });
}

// Initialize on load
initClient();

// ═══════════════════════════════════════════════════
// Helper Methods
// ═══════════════════════════════════════════════════

async function sendMessage(phone, message) {
    console.log(`[WhatsApp] sendMessage called for phone: ${phone}`);
    if (!clientReady) throw new Error('Client not ready');

    // Format phone number
    let chatId = phone.replace(/[^\d]/g, '');
    console.log(`[WhatsApp] Parsed chatId: ${chatId}`);

    if (chatId.length < 5) {
        throw new Error(`Invalid phone number: ${phone} (parsed: ${chatId})`);
    }

    if (!chatId.endsWith('@c.us')) {
        chatId += '@c.us';
    }

    const response = await client.sendMessage(chatId, message);
    messagesSent++;
    return response;
}

// ═══════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════

router.get('/status', (req, res) => {
    res.json({
        status: connectionStatus,
        ready: clientReady,
        qrCode: currentQR,
        messagesSent,
        user: clientReady ? {
            name: client.info?.pushname,
            number: client.info?.wid?.user
        } : null,
        lastError,
        uptime: process.uptime()
    });
});

router.get('/qr', (req, res) => {
    // 1. WhatsApp Bağlıysa
    if (clientReady) {
        const userName = client.info?.pushname || 'Kullanıcı';
        const userPhone = client.info?.wid?.user || 'Bilinmiyor';

        return res.send(`
            <html>
                <head>
                    <title>WhatsApp Bağlandı</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #e5ddd5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                        .card { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; }
                        h1 { color: #075e54; margin-bottom: 0.5rem; font-size: 1.8rem; }
                        .icon { font-size: 5rem; display: block; margin-bottom: 1.5rem; color: #25D366; }
                        .user-info { background: #f0f2f5; padding: 1rem; border-radius: 8px; margin: 1.5rem 0; text-align: left; }
                        .user-info p { margin: 0.5rem 0; color: #333; font-size: 1.1rem; }
                        .label { font-weight: bold; color: #555; display: inline-block; width: 80px; }
                        .status { display: inline-block; padding: 0.25rem 0.75rem; background: #dcf8c6; color: #075e54; border-radius: 15px; font-weight: bold; font-size: 0.9rem; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <span class="icon">✅</span>
                        <h1>Bağlantı Başarılı!</h1>
                        <div class="user-info">
                            <p><span class="label">İsim:</span> ${userName}</p>
                            <p><span class="label">Numara:</span> +${userPhone}</p>
                            <p><span class="label">Durum:</span> <span class="status">Aktif</span></p>
                        </div>
                        <p style="color: #666;">BreviAI servisi şu anda bu hesaba bağlı ve mesaj göndermeye hazırdır.</p>
                    </div>
                </body>
            </html>
        `);
    }

    // 2. QR Kod Mevcutsa
    if (currentQR) {
        return res.send(`
            <html>
                <head>
                    <title>WhatsApp Bağla</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <meta http-equiv="refresh" content="15"> <!-- Auto refresh every 15s -->
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                        .container { background: white; padding: 0; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 90%; max-width: 850px; display: flex; flex-wrap: wrap; overflow: hidden; }
                        .info-section { flex: 1; padding: 3rem; min-width: 300px; display: flex; flex-direction: column; justify-content: center; background: #fff; }
                        .qr-section { flex: 0 0 350px; background: #fff; padding: 3rem; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 1px solid #f0f0f0; }
                        
                        h1 { color: #41525d; margin: 0 0 1.5rem 0; font-size: 1.8rem; font-weight: 300; }
                        .steps { list-style: none; padding: 0; margin: 0; }
                        .steps li { margin-bottom: 20px; display: flex; align-items: center; font-size: 1.1rem; color: #3b4a54; line-height: 1.5; }
                        .step-num { font-weight: bold; color: #00a884; margin-right: 12px; font-size: 1.1rem; }
                        
                        .qr-wrapper { position: relative; padding: 10px; border: 1px solid #e9edef; border-radius: 8px; }
                        .qr-img { width: 264px; height: 264px; display: block; }
                        .logo-area { text-align: left; margin-bottom: 2rem; }
                        .logo-img { height: 40px; width: auto; }
                        
                        .refresh-hint { color: #8696a0; font-size: 0.9rem; margin-top: 1.5rem; display: flex; align-items: center; gap: 6px; }
                        
                        @media (max-width: 750px) {
                            .container { flex-direction: column-reverse; max-width: 400px; }
                            .qr-section { border-left: none; border-bottom: 1px solid #f0f0f0; padding: 2rem; flex: 0 0 auto; }
                            .info-section { padding: 2rem; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="info-section">
                            <div class="logo-area">
                                <img src="/public/logo.png" alt="BreviAI" class="logo-img" />
                            </div>
                            <h1>WhatsApp'ı Bağlayın</h1>
                            <ol class="steps">
                                <li><span class="step-num">1.</span> Telefonunuzda WhatsApp'ı açın</li>
                                <li><span class="step-num">2.</span> <strong>Ayarlar</strong> (iPhone) veya <strong>Menü</strong> (Android) simgesine dokunun</li>
                                <li><span class="step-num">3.</span> <strong>Bağlı Cihazlar</strong> seçeneğine girin</li>
                                <li><span class="step-num">4.</span> <strong>Cihaz Bağla</strong> butonuna dokunun</li>
                                <li><span class="step-num">5.</span> Telefonunuzun kamerasını yandaki ekrana doğrultarak QR kodu tarayın</li>
                            </ol>
                        </div>
                        <div class="qr-section">
                            <div class="qr-wrapper">
                                <img src="${currentQR}" class="qr-img" alt="WhatsApp QR Code" />
                            </div>
                            <div class="refresh-hint">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                                Kod otomatik güncelleniyor
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `);
    }

    // 3. Yükleniyor
    res.send(`
        <html>
            <head>
                <title>Yükleniyor...</title>
                <meta http-equiv="refresh" content="2">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #e5ddd5; margin: 0; }
                    .loader { text-align: center; background: white; padding: 3rem; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #00a884; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 1.5rem auto; }
                    h2 { color: #41525d; font-weight: 300; margin: 0 0 0.5rem 0; }
                    p { color: #8696a0; margin: 0; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="loader">
                    <div class="spinner"></div>
                    <h2>Hazırlanıyor...</h2>
                    <p>Bağlantı kontrol ediliyor</p>
                </div>
            </body>
        </html>
    `);
});

router.post('/send', async (req, res) => {
    const { phone, message } = req.body;
    console.log('[WhatsApp] /send request:', { phone, message });

    if (!phone || !message) {
        return res.status(400).json({ error: 'phone and message required' });
    }

    try {
        await sendMessage(phone, message);
        res.json({ success: true, to: phone });
    } catch (err) {
        console.error('[WhatsApp] Send error details:', err);
        const errorMessage = (err && err.message) ? err.message : String(err);
        res.status(500).json({ error: errorMessage, stack: err.stack });
    }
});

// POST /restart — Restart the WhatsApp client (useful when stuck)
router.post('/restart', async (req, res) => {
    console.log('[WhatsApp] 🔄 Restart requested...');
    try {
        clientReady = false;
        connectionStatus = 'initializing';
        currentQR = null;
        lastError = null;

        try {
            if (client) await client.destroy();
        } catch (e) {
            console.log('[WhatsApp] Destroy warning (safe to ignore):', e.message);
        }

        // Small delay then re-init
        setTimeout(() => initClient(), 2000);

        res.json({ success: true, message: 'Client restarting. Check /status in a few seconds.' });
    } catch (err) {
        console.error('[WhatsApp] Restart error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /clear-session — Clear auth data and restart (nuclear option)
router.post('/clear-session', async (req, res) => {
    console.log('[WhatsApp] 🗑️ Clear session requested...');
    try {
        clientReady = false;
        connectionStatus = 'initializing';
        currentQR = null;
        lastError = null;

        try {
            if (client) await client.destroy();
        } catch (e) {
            console.log('[WhatsApp] Destroy warning:', e.message);
        }

        // Remove auth data
        const authPath = path.resolve('./.wwebjs_auth/');
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('[WhatsApp] Auth data cleared:', authPath);
        }

        // Re-init after cleanup
        setTimeout(() => initClient(), 3000);

        res.json({ success: true, message: 'Session cleared and client restarting. A new QR will appear.' });
    } catch (err) {
        console.error('[WhatsApp] Clear session error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = {
    router,
    sendMessage, // Export for use by other services (Cron, Browser)
    getClient: () => client
};
