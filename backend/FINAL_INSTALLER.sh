# =================================================================
# BREVIAI FINAL INSTALLER SCRIPT
# COPY THE CONTENT OF THIS FILE AND PASTE IT INTO CLOUD SHELL EDITOR
# FILE NAME: deploy.sh
# =================================================================

#!/bin/bash
set -e

echo "🚀 Starting Deployment on VM..."

# 1. Clean up & Prepare Directories
sudo rm -rf /opt/breviai/backend
sudo mkdir -p /opt/breviai/backend/scripts/services
sudo chown -R $USER:$USER /opt/breviai

# 2. Write Files Directly (No scp needed for inner files)

# --- package.json ---
cat << 'EOF' > /opt/breviai/backend/package.json
{
  "name": "breviai-backend",
  "version": "1.0.1",
  "description": "BreviAI Backend",
  "private": true,
  "scripts": {
    "start": "node scripts/breviai-hub.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "whatsapp-web.js": "^1.23.0",
    "qrcode": "^1.5.3",
    "node-cron": "^3.0.3",
    "puppeteer": "^21.5.0",
    "node-fetch": "^2.7.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# --- Dockerfile.whatsapp ---
cat << 'EOF' > /opt/breviai/backend/Dockerfile.whatsapp
FROM node:18-slim

RUN apt-get update && apt-get install -y \
    wget gnupg procps \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY scripts/ ./scripts/

ENV PORT=3001
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/google-chrome-stable

RUN mkdir -p .wwebjs_auth && chmod 777 .wwebjs_auth

EXPOSE 3001
CMD [ "node", "scripts/breviai-hub.js" ]
EOF

# --- scripts/breviai-hub.js ---
cat << 'EOF' > /opt/breviai/backend/scripts/breviai-hub.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const AUTH_KEY = process.env.WA_AUTH_KEY || 'breviai-whatsapp-2024';

app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
    const key = req.headers['x-auth-key'] || req.query.key;
    if (req.path === '/' || req.path === '/whatsapp/qr') return next();
    if (key !== AUTH_KEY) return res.status(401).json({ error: 'Unauthorized' });
    next();
}
app.use(authMiddleware);

console.log('🚀 Starting BreviAI Hub...');

const whatsappService = require('./services/whatsapp');
app.use('/whatsapp', whatsappService.router);

const cronService = require('./services/cron-manager');
app.use('/cron', cronService.router);

const browserService = require('./services/browser-service');
app.use('/browser', browserService.router);

app.get('/', (req, res) => {
    res.json({
        service: 'BreviAI Hub',
        version: '2.0.0',
        services: { whatsapp: 'active', cron: 'active', browser: 'active' }
    });
});
app.listen(PORT, () => console.log(`✅ BreviAI Hub listening on port ${PORT}`));
EOF

# --- scripts/services/webhook.js ---
cat << 'EOF' > /opt/breviai/backend/scripts/services/webhook.js
const fetch = require('node-fetch');

class WebhookService {
    constructor() { this.webhookUrl = process.env.WA_WEBHOOK_URL; }

    async send(event, data) {
        if (!this.webhookUrl) return false;
        try {
            console.log(`[Webhook] Sending '${event}'`);
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event, timestamp: Date.now(), data })
            });
            return true;
        } catch (error) {
            console.error('[Webhook] Error:', error.message);
            return false;
        }
    }
    async sendWhatsAppMessage(msg) {
        return this.send('whatsapp_message', {
            from: msg.from, body: msg.body, timestamp: msg.timestamp, hasMedia: msg.hasMedia, type: msg.type
        });
    }
    async sendCronResult(jobId, result) { return this.send('cron_result', { jobId, result }); }
}
module.exports = new WebhookService();
EOF

# --- scripts/services/whatsapp.js ---
cat << 'EOF' > /opt/breviai/backend/scripts/services/whatsapp.js
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const webhookService = require('./webhook');
const router = express.Router();

let client;
let clientReady = false;
let currentQR = null;
let connectionStatus = 'initializing';
let messagesSent = 0;

const possibleChromePaths = ['/usr/bin/google-chrome-stable', process.env.CHROME_PATH || ''].filter(Boolean);
const chromePath = possibleChromePaths.find(p => fs.existsSync(p));

function initClient() {
    console.log('[WhatsApp] Initializing...');
    client = new Client({
        authStrategy: new LocalAuth({ clientId: 'breviai-bot', dataPath: './.wwebjs_auth/' }),
        puppeteer: {
            headless: true,
            executablePath: chromePath || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
    });

    client.on('qr', async (qr) => {
        console.log('[WhatsApp] QR received');
        currentQR = await qrcode.toDataURL(qr);
        connectionStatus = 'qr_pending';
    });

    client.on('ready', () => {
        console.log('[WhatsApp] Ready');
        clientReady = true;
        connectionStatus = 'ready';
        currentQR = null;
    });

    client.on('message', async (msg) => { await webhookService.sendWhatsAppMessage(msg); });
    client.initialize().catch(err => console.error(err));
}
initClient();

async function sendMessage(phone, message) {
    if (!clientReady) throw new Error('Client not ready');
    let chatId = phone.replace(/[^\d]/g, '') + '@c.us';
    const response = await client.sendMessage(chatId, message);
    messagesSent++;
    return response;
}

router.get('/status', (req, res) => res.json({ status: connectionStatus, ready: clientReady, messagesSent }));
router.get('/qr', (req, res) => {
    if (clientReady) return res.send('<h1>✅ WhatsApp Bağlı!</h1>');
    if (currentQR) return res.send(`<img src="${currentQR}" />`);
    res.send('QR Hazırlanıyor...');
});
router.post('/send', async (req, res) => {
    try {
        await sendMessage(req.body.phone, req.body.message);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = { router, sendMessage };
EOF

# --- scripts/services/cron-manager.js ---
cat << 'EOF' > /opt/breviai/backend/scripts/services/cron-manager.js
const fs = require('fs');
const path = require('path');
const express = require('express');
const cron = require('node-cron');
const whatsappService = require('./whatsapp');
const webhookService = require('./webhook');
const { service: browserService } = require('./browser-service');
const router = express.Router();

const DATA_DIR = path.join(__dirname, '../../.data');
const JOBS_FILE = path.join(DATA_DIR, 'cron-jobs.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class CronManager {
    constructor() { this.jobs = new Map(); this.loadJobs(); }

    loadJobs() {
        if (!fs.existsSync(JOBS_FILE)) { fs.writeFileSync(JOBS_FILE, JSON.stringify([], null, 2)); return; }
        const data = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
        data.forEach(config => this.scheduleJob(config, false));
    }
    saveJobs() {
        const configs = Array.from(this.jobs.values()).map(j => j.config);
        fs.writeFileSync(JOBS_FILE, JSON.stringify(configs, null, 2));
    }
    scheduleJob(config, save = true) {
        if (this.jobs.has(config.id)) this.jobs.get(config.id).task.stop();
        console.log(`[Cron] Scheduled ${config.id} (${config.schedule})`);
        
        const task = cron.schedule(config.schedule, async () => {
            try {
                const result = await this.executeAction(config.action);
                webhookService.sendCronResult(config.id, { success: true, ...result });
            } catch (err) {
                webhookService.sendCronResult(config.id, { success: false, error: err.message });
            }
        });
        this.jobs.set(config.id, { task, config });
        if (save) this.saveJobs();
        return { success: true };
    }
    async executeAction(action) {
        if (action.type === 'whatsapp_send') return whatsappService.sendMessage(action.phone, action.message);
        if (action.type === 'browser_scrape') return browserService.scrape(action.url, action.selector);
        return { triggered: true };
    }
}
const manager = new CronManager();
router.get('/list', (req, res) => res.json({ jobs: Array.from(manager.jobs.values()).map(j => j.config) }));
router.post('/create', (req, res) => { manager.scheduleJob(req.body); res.json({ success: true }); });
module.exports = { router, manager };
EOF

# --- scripts/services/browser-service.js ---
cat << 'EOF' > /opt/breviai/backend/scripts/services/browser-service.js
const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const router = express.Router();

const MAX_PAGES = 3;
class BrowserService {
    constructor() { this.browser = null; this.activePages = 0; }
    async initBrowser() {
        if (this.browser) return;
        const chromePath = '/usr/bin/google-chrome-stable';
        this.browser = await puppeteer.launch({
            headless: 'new',
            executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
            args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        });
        this.browser.on('disconnected', () => this.browser = null);
    }
    async getPage() {
        if (!this.browser) await this.initBrowser();
        if (this.activePages >= MAX_PAGES) throw new Error('Busy');
        this.activePages++;
        const page = await this.browser.newPage();
        page.on('close', () => this.activePages--);
        return page;
    }
    async scrape(url, selector) {
        let page = null;
        try {
            page = await this.getPage();
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            if (selector) await page.waitForSelector(selector, { timeout: 10000 });
            const result = selector ? await page.$eval(selector, el => el.innerText) : await page.evaluate(() => document.body.innerText);
            return { result };
        } finally { if (page) await page.close(); }
    }
}
const service = new BrowserService();
router.post('/scrape', async (req, res) => {
    try {
        const data = await service.scrape(req.body.url, req.body.selector);
        res.json({ success: true, data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = { router, service };
EOF

# 3. Docker Build & Run
echo "🐳 Building Docker Image..."
cd /opt/breviai/backend
docker build -t whatsapp-service -f Dockerfile.whatsapp .
docker stop whatsapp-service || true
docker rm whatsapp-service || true

echo "🚀 Starting Container..."
docker run -d \
  --name whatsapp-service \
  --restart unless-stopped \
  -p 3001:3001 \
  -v /opt/breviai/.wwebjs_auth:/usr/src/app/.wwebjs_auth \
  -e WA_AUTH_KEY=breviai-secret-password \
  whatsapp-service

echo "✅ FINAL SETUP COMPLETE!"
