/**
 * BreviAI WhatsApp Mesaj Servisi
 * 
 * whatsapp-web.js ile çalışan standalone servis.
 * QR kodu bir kez tarat, sonra mesajlar otomatik gider.
 * 
 * Kurulum:
 *   npm install whatsapp-web.js qrcode express cors
 * 
 * Çalıştırma:
 *   node scripts/whatsapp-service.js
 * 
 * Endpoints:
 *   GET  /status  — Bağlantı durumu
 *   GET  /qr      — QR kodu (ilk kurulumda)
 *   POST /send    — Mesaj gönder { phone, message }
 *   POST /pair    — Pairing code ile bağlan { phoneNumber }
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.WA_PORT || 3001;
const AUTH_KEY = process.env.WA_AUTH_KEY || 'breviai-whatsapp-2024';

// ═══════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════
let clientReady = false;
let currentQR = null;
let connectionStatus = 'initializing'; // initializing | qr_pending | ready | disconnected
let messagesSent = 0;
let lastError = null;

// ═══════════════════════════════════════════════════
// WhatsApp Client
// ═══════════════════════════════════════════════════

// Auto-detect Chrome path on Windows
const fs = require('fs');
const possibleChromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.CHROME_PATH || ''
].filter(Boolean);

const chromePath = possibleChromePaths.find(p => fs.existsSync(p));
if (chromePath) {
    console.log('🌐 Chrome bulundu:', chromePath);
} else {
    console.warn('⚠️ Chrome bulunamadı! Puppeteer bundled Chromium kullanılacak.');
}

const client = new Client({
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

// QR Code event
client.on('qr', async (qr) => {
    console.log('\n📱 QR Kodu hazır! Tarayıcıda aç: http://localhost:' + PORT + '/qr\n');
    try {
        currentQR = await qrcode.toDataURL(qr);
        connectionStatus = 'qr_pending';
    } catch (err) {
        console.error('QR oluşturma hatası:', err);
    }
});

// Authenticated
client.on('authenticated', () => {
    console.log('✅ WhatsApp doğrulandı (session kaydedildi)');
    currentQR = null;
});

// Ready
client.on('ready', () => {
    clientReady = true;
    connectionStatus = 'ready';
    currentQR = null;
    console.log('🟢 WhatsApp HAZIR! Mesaj gönderilebilir.');
    console.log('   Kullanıcı:', client.info.pushname);
    console.log('   Numara:', client.info.wid.user);
});

// Disconnected
client.on('disconnected', (reason) => {
    clientReady = false;
    connectionStatus = 'disconnected';
    lastError = reason;
    console.log('🔴 WhatsApp bağlantısı kesildi:', reason);
});

// Auth failure
client.on('auth_failure', (msg) => {
    clientReady = false;
    connectionStatus = 'disconnected';
    lastError = 'Auth failed: ' + msg;
    console.error('❌ Doğrulama hatası:', msg);
});

// Incoming Message Webhook
client.on('message', async (msg) => {
    const webhookUrl = process.env.WA_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        console.log(`📩 Yeni mesaj: ${msg.from} -> ${webhookUrl}`);

        // Sadece text veya basit medya (şimdilik)
        const payload = {
            from: msg.from,
            body: msg.body,
            timestamp: msg.timestamp,
            hasMedia: msg.hasMedia,
            type: msg.type,
            notifyName: msg._data?.notifyName
        };

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error('❌ Webhook hatası:', err.message);
    }
});

// ═══════════════════════════════════════════════════
// Auth Middleware
// ═══════════════════════════════════════════════════
function authMiddleware(req, res, next) {
    const key = req.headers['x-auth-key'] || req.query.key;
    if (key !== AUTH_KEY) {
        return res.status(401).json({ error: 'Yetkisiz erişim. x-auth-key header gerekli.' });
    }
    next();
}

// ═══════════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════════

// GET /status — Bağlantı durumu
app.get('/status', authMiddleware, (req, res) => {
    res.json({
        status: connectionStatus,
        ready: clientReady,
        qrCode: currentQR, // QR Code data URI (if pending)
        messagesSent,
        user: clientReady ? {
            name: client.info?.pushname,
            number: client.info?.wid?.user
        } : null,
        lastError,
        uptime: process.uptime()
    });
});

// GET /qr — QR kodu sayfası
app.get('/qr', (req, res) => {
    if (clientReady) {
        return res.send(`
            <html>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#111;color:#25D366;font-family:sans-serif;flex-direction:column">
                <h1>✅ WhatsApp Bağlı!</h1>
                <p>Kullanıcı: ${client.info?.pushname || 'N/A'}</p>
                <p>Numara: ${client.info?.wid?.user || 'N/A'}</p>
                <p style="color:#888">Gönderilen mesaj: ${messagesSent}</p>
            </body>
            </html>
        `);
    }

    if (!currentQR) {
        return res.send(`
            <html>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#111;color:#ffa500;font-family:sans-serif;flex-direction:column">
                <h1>⏳ QR Kodu Hazırlanıyor...</h1>
                <p>Birkaç saniye bekleyin ve sayfayı yenileyin.</p>
                <script>setTimeout(() => location.reload(), 3000)</script>
            </body>
            </html>
        `);
    }

    res.send(`
        <html>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#111;color:white;font-family:sans-serif;flex-direction:column">
            <h1 style="color:#25D366">📱 WhatsApp QR Kodu</h1>
            <p>Telefonunuzda WhatsApp → Bağlı Cihazlar → Cihaz Bağla</p>
            <img src="${currentQR}" style="width:300px;height:300px;border-radius:16px;margin:20px" />
            <p style="color:#888">Taradıktan sonra bu sayfa otomatik güncellenecek</p>
            <script>setInterval(() => fetch('/status?key=${AUTH_KEY}').then(r=>r.json()).then(d=>{if(d.ready)location.reload()}), 3000)</script>
        </body>
        </html>
    `);
});

// POST /send — Mesaj gönder
app.post('/send', authMiddleware, async (req, res) => {
    try {
        const { phone, message, mediaUrl } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ error: 'phone ve message alanları gerekli' });
        }

        if (!clientReady) {
            return res.status(503).json({
                error: 'WhatsApp bağlı değil',
                status: connectionStatus,
                hint: currentQR ? 'QR kodu taratılmayı bekliyor: /qr' : 'Servis başlatılıyor...'
            });
        }

        // Format phone number: remove +, spaces, dashes, then add @c.us
        let cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
        // Remove leading 0 for Turkish numbers (0532 → 90532)
        if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
            cleanPhone = '90' + cleanPhone.substring(1);
        }
        // Ensure country code for Turkish numbers
        if (cleanPhone.length === 10 && cleanPhone.startsWith('5')) {
            cleanPhone = '90' + cleanPhone;
        }

        const chatId = cleanPhone + '@c.us';
        console.log(`📤 Mesaj gönderiliyor: ${chatId}`);

        // Check if number exists on WhatsApp
        const isRegistered = await client.isRegisteredUser(chatId);
        if (!isRegistered) {
            return res.status(404).json({
                error: 'Bu numara WhatsApp\'ta kayıtlı değil',
                phone: cleanPhone
            });
        }

        // Send message
        const result = await client.sendMessage(chatId, message);
        messagesSent++;

        console.log(`✅ Mesaj gönderildi: ${chatId} (toplam: ${messagesSent})`);

        res.json({
            success: true,
            messageId: result.id?.id,
            to: cleanPhone,
            timestamp: result.timestamp,
            totalSent: messagesSent
        });

    } catch (error) {
        console.error('❌ Mesaj gönderilemedi:', error);
        lastError = error.message;
        res.status(500).json({
            error: 'Mesaj gönderilemedi',
            details: error.message
        });
    }
});

// POST /pair — Pairing code ile bağlan (QR yerine)
app.post('/pair', authMiddleware, async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: 'phoneNumber gerekli (ör: 905551234567)' });
        }

        if (clientReady) {
            return res.json({ success: true, message: 'Zaten bağlı', status: 'ready' });
        }

        const code = await client.requestPairingCode(phoneNumber);
        console.log(`🔑 Pairing kodu: ${code} (telefonda girin)`);

        res.json({
            success: true,
            pairingCode: code,
            message: `Bu kodu WhatsApp'ta girin: ${code}`
        });

    } catch (error) {
        console.error('❌ Pairing hatası:', error);
        res.status(500).json({
            error: 'Pairing başarısız',
            details: error.message
        });
    }
});

// POST /bulk-send — Toplu mesaj gönder
app.post('/bulk-send', authMiddleware, async (req, res) => {
    try {
        const { recipients } = req.body;
        // recipients: [{ phone: '...', message: '...' }, ...]

        if (!Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: 'recipients dizisi gerekli' });
        }

        if (!clientReady) {
            return res.status(503).json({ error: 'WhatsApp bağlı değil' });
        }

        // Günlük limit kontrolü (varsayılan 50)
        const DAILY_LIMIT = parseInt(process.env.WA_DAILY_LIMIT) || 50;
        if (recipients.length > DAILY_LIMIT) {
            return res.status(429).json({
                error: `Günlük limit: ${DAILY_LIMIT} mesaj. ${recipients.length} mesaj istendi.`
            });
        }

        const results = [];
        const DELAY_MS = 3000; // Mesajlar arası 3 saniye bekleme (ban riski azaltır)

        for (let i = 0; i < recipients.length; i++) {
            const { phone, message } = recipients[i];

            try {
                let cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
                if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
                    cleanPhone = '90' + cleanPhone.substring(1);
                }
                if (cleanPhone.length === 10 && cleanPhone.startsWith('5')) {
                    cleanPhone = '90' + cleanPhone;
                }

                const chatId = cleanPhone + '@c.us';
                const isRegistered = await client.isRegisteredUser(chatId);

                if (!isRegistered) {
                    results.push({ phone: cleanPhone, success: false, error: 'WhatsApp\'ta kayıtlı değil' });
                    continue;
                }

                const result = await client.sendMessage(chatId, message);
                messagesSent++;

                results.push({
                    phone: cleanPhone,
                    success: true,
                    messageId: result.id?.id
                });

                console.log(`✅ [${i + 1}/${recipients.length}] ${cleanPhone} gönderildi`);

                // Mesajlar arası bekleme
                if (i < recipients.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }

            } catch (err) {
                results.push({ phone, success: false, error: err.message });
                console.error(`❌ [${i + 1}/${recipients.length}] ${phone} başarısız:`, err.message);
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`\n📊 Toplu gönderim: ${successCount}/${recipients.length} başarılı\n`);

        res.json({
            success: true,
            total: recipients.length,
            sent: successCount,
            failed: recipients.length - successCount,
            results,
            totalSent: messagesSent
        });

    } catch (error) {
        console.error('❌ Toplu gönderim hatası:', error);
        res.status(500).json({ error: 'Toplu gönderim başarısız', details: error.message });
    }
});

// ═══════════════════════════════════════════════════
// Başlat
// ═══════════════════════════════════════════════════
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   🤖 BreviAI WhatsApp Servisi               ║
║   Port: ${PORT}                                ║
║   Auth Key: ${AUTH_KEY.substring(0, 8)}...                   ║
║                                              ║
║   QR Kodu: http://localhost:${PORT}/qr          ║
║   Durum:   http://localhost:${PORT}/status       ║
╚══════════════════════════════════════════════╝
    `);
    console.log('⏳ WhatsApp başlatılıyor...\n');
    client.initialize();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔴 Servis kapatılıyor...');
    if (clientReady) {
        await client.destroy();
    }
    process.exit(0);
});
