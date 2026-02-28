/**
 * BreviAI Unified Backend Hub
 * 
 * Central hub for:
 * 1. WhatsApp Automation (whatsapp-web.js)
 * 2. Cron Jobs (node-cron)
 * 3. Headless Browser (Puppeteer)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;
const AUTH_KEY = process.env.WA_AUTH_KEY || 'breviai-secret-password';
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || '';

app.use(cors());
app.use(express.json());

// Serve static files (public) - Allow access without auth
app.use('/public', express.static(path.join(__dirname, 'public')));

// 🔌 Slack Agent (must be BEFORE /api proxy — Slack events need direct handling)
const slackAgent = require('./services/slack-agent');
app.use('/slack', slackAgent.router);

// Proxy /api requests to Next.js on localhost:3000 (By-passing authMiddleware because Next.js has its own app-secret auth)
app.use('/api', async (req, res) => {
    try {
        const url = `http://localhost:3000/api${req.url}`;
        const options = {
            method: req.method,
            headers: { ...req.headers, host: 'localhost:3000' }
        };
        if (!['GET', 'HEAD'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
            options.body = JSON.stringify(req.body);
            options.headers['content-type'] = 'application/json';
        }

        const response = await fetch(url, options);
        const data = await response.text();

        response.headers.forEach((value, name) => {
            res.setHeader(name, value);
        });

        res.status(response.status).send(data);
    } catch (e) {
        console.error('[Hub Proxy] Failed to proxy to Next.js API:', e.message);
        res.status(502).json({ error: 'Bad Gateway - Is the Next.js server running on port 3000?' });
    }
});

// Auth Middleware
function authMiddleware(req, res, next) {
    const key = req.headers['x-auth-key'] || req.query.key;
    // Allow public access only to root
    if (req.path === '/') return next();
    if (req.path === '/whatsapp/qr') return next();
    if (req.path === '/whatsapp/connect/status') return next();
    if (req.path.startsWith('/slack/')) return next(); // Slack handles its own auth

    if (key !== AUTH_KEY) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }
    next();
}

app.use(authMiddleware);

// ═══════════════════════════════════════════════════
// Load Services
// ═══════════════════════════════════════════════════

console.log('🚀 Starting BreviAI Hub...');

// 1. WhatsApp Service
const whatsappService = require('./services/whatsapp');
app.use('/whatsapp', whatsappService.router);

// 2. Cron Service
const cronService = require('./services/cron-manager');
app.use('/cron', cronService.router);

// 3. Browser Service
const browserService = require('./services/browser-service');
app.use('/browser', browserService.router);


// ═══════════════════════════════════════════════════
// Root Endpoints
// ═══════════════════════════════════════════════════

app.get('/', (req, res) => {
    res.json({
        service: 'BreviAI Hub',
        version: '2.0.0',
        services: {
            whatsapp: 'active',
            cron: 'pending',
            browser: 'pending',
            slack: SLACK_BOT_TOKEN ? 'active' : 'no_token'
        }
    });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ BreviAI Hub listening on port ${PORT}`);
    console.log(`   http://0.0.0.0:${PORT}`);
});
