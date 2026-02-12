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
const AUTH_KEY = process.env.WA_AUTH_KEY || 'breviai-whatsapp-2024';

app.use(cors());
app.use(express.json());

// Auth Middleware
function authMiddleware(req, res, next) {
    const key = req.headers['x-auth-key'] || req.query.key;
    // Allow public access to QR page or root
    if (req.path === '/' || req.path === '/whatsapp/qr') return next();

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
            browser: 'pending'
        }
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n✅ BreviAI Hub listening on port ${PORT}`);
    console.log(`   http://localhost:${PORT}`);
});
