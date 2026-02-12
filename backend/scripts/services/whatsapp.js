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
    if (clientReady) {
        return res.send('<h1>✅ WhatsApp Bağlı!</h1>');
    }
    if (currentQR) {
        return res.send(`
            <div style="text-align:center; font-family:sans-serif;">
                <h1>WhatsApp QR Kodu</h1>
                <img src="${currentQR}" />
                <p>Yenilemek için sayfayı tazeleyin</p>
            </div>
        `);
    }
    res.send('<h1>⏳ QR Hazırlanıyor...</h1><script>setTimeout(() => location.reload(), 2000)</script>');
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
