const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
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
        console.log('[WhatsApp] Authenticated');
        currentQR = null;
    });

    client.on('ready', () => {
        console.log('[WhatsApp] Ready!');
        clientReady = true;
        connectionStatus = 'ready';
        currentQR = null;
    });

    client.on('disconnected', (reason) => {
        console.log('[WhatsApp] Disconnected:', reason);
        clientReady = false;
        connectionStatus = 'disconnected';
        lastError = reason;
        // Re-init handled by LocalAuth usually, but sometimes needs manual
    });

    client.on('message', async (msg) => {
        console.log(`[WhatsApp] Message from ${msg.from}`);
        await webhookService.sendWhatsAppMessage(msg);
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
        return res.send(`
            <html>
                <head>
                    <title>WhatsApp Bağlandı</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #dcf8c6; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                        .card { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
                        h1 { color: #075e54; margin-bottom: 0.5rem; }
                        .icon { font-size: 4rem; display: block; margin-bottom: 1rem; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <span class="icon">✅</span>
                        <h1>WhatsApp Bağlandı!</h1>
                        <p>Servis aktif ve mesaj gönderimine hazır.</p>
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
                        .container { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 90%; max-width: 800px; display: flex; flex-wrap: wrap; gap: 2rem; }
                        .qr-section { flex: 1; text-align: center; min-width: 300px; border-right: 1px solid #eee; padding-right: 2rem; display: flex; flex-direction: column; justify-content: center; }
                        .info-section { flex: 1; min-width: 300px; display: flex; flex-direction: column; justify-content: center; }
                        h1 { color: #128c7e; margin: 0 0 1rem 0; font-size: 1.5rem; }
                        .steps { list-style: none; padding: 0; margin: 0; }
                        .steps li { margin-bottom: 1.5rem; display: flex; align-items: center; }
                        .step-num { background: #128c7e; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 1rem; flex-shrink: 0; }
                        .step-text { font-size: 1rem; color: #333; }
                        .qr-img { width: 264px; height: 264px; border: 1px solid #ddd; border-radius: 8px; }
                        .refresh-hint { color: #666; font-size: 0.8rem; margin-top: 1rem; }
                        @media (max-width: 700px) {
                            .qr-section { border-right: none; padding-right: 0; border-bottom: 1px solid #eee; padding-bottom: 2rem; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="info-section">
                            <h1>Nasıl Bağlanır?</h1>
                            <ul class="steps">
                                <li>
                                    <span class="step-num">1</span>
                                    <span class="step-text">Telefonunuzda <strong>WhatsApp</strong> uygulamasını açın</span>
                                </li>
                                <li>
                                    <span class="step-num">2</span>
                                    <span class="step-text"><strong>Ayarlar</strong> veya <strong>Menü</strong>'ye dokunun</span>
                                </li>
                                <li>
                                    <span class="step-num">3</span>
                                    <span class="step-text"><strong>Bağlı Cihazlar</strong> seçeneğini seçin</span>
                                </li>
                                <li>
                                    <span class="step-num">4</span>
                                    <span class="step-text"><strong>Cihaz Bağla</strong> butonuna basın</span>
                                </li>
                                <li>
                                    <span class="step-num">5</span>
                                    <span class="step-text">Yandaki QR kodu kameraya okutun</span>
                                </li>
                            </ul>
                        </div>
                        <div class="qr-section">
                            <h1>QR Kodu Taratın</h1>
                            <img src="${currentQR}" class="qr-img" alt="WhatsApp QR Code" />
                            <p class="refresh-hint">Kod otomatik yenilenir (Her 15sn)</p>
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
                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5; }
                    .loader { text-align: center; color: #555; }
                    .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #128c7e; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 1rem auto; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="loader">
                    <div class="spinner"></div>
                    <h2>QR Kod Hazırlanıyor...</h2>
                    <p>Lütfen bekleyin</p>
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

module.exports = {
    router,
    sendMessage, // Export for use by other services (Cron, Browser)
    getClient: () => client
};
