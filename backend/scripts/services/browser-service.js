const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const webhookService = require('./webhook');

const router = express.Router();

// ═══════════════════════════════════════════════════
// Browser Service Logic
// ═══════════════════════════════════════════════════

// Resource constraints
const MAX_CONCURRENT_PAGES = 3;
const TIMEOUT_MS = 120000; // Increased to 2 minutes

class BrowserService {
    constructor() {
        this.browser = null;
        this.activePages = 0;
        this.initBrowser();
    }

    async initBrowser() {
        if (this.browser) return this.browser;

        console.log('[Browser] Initializing Puppeteer...');

        // Auto-detect Chrome
        const possibleChromePaths = [
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            process.env.CHROME_PATH || ''
        ].filter(Boolean);

        const chromePath = possibleChromePaths.find(p => fs.existsSync(p));

        try {
            this.browser = await puppeteer.launch({
                headless: 'new', // Use new headless mode
                executablePath: chromePath || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage', // Critical for Docker/VMs
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--disable-gpu',
                    '--disable-speech-api'
                ]
            });

            console.log('[Browser] Puppeteer launched successfully');

            this.browser.on('disconnected', () => {
                console.log('[Browser] Browser disconnected, cleaning up...');
                this.browser = null;
            });

            return this.browser;
        } catch (err) {
            console.error('[Browser] Launch failed:', err);
            throw err;
        }
    }

    async getPage() {
        if (this.activePages >= MAX_CONCURRENT_PAGES) {
            throw new Error('Browser busy: max concurrent pages reached');
        }

        if (!this.browser) await this.initBrowser();

        this.activePages++;
        const page = await this.browser.newPage();

        // Set standard User Agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Optimize page
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Cleanup handler
        const originalClose = page.close.bind(page);
        page.close = async () => {
            this.activePages--;
            await originalClose();
        };

        return page;
    }

    // 1. Scrape Text/HTML
    async scrape(url, selector, extract = 'text') {
        let page = null;
        try {
            page = await this.getPage();
            console.log(`[Browser] Scraping ${url}...`);

            // Use 'domcontentloaded' for faster response, 'networkidle2' is too slow for dynamic sites
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });

            if (selector) {
                // Wait for selector (explicitly required for dynamic content)
                await page.waitForSelector(selector, { timeout: 30000 });
            }

            let result;
            if (extract === 'text') {
                if (selector) {
                    result = await page.$eval(selector, el => el.innerText);
                } else {
                    result = await page.evaluate(() => document.body.innerText);
                }
            } else if (extract === 'html') {
                if (selector) {
                    result = await page.$eval(selector, el => el.innerHTML);
                } else {
                    result = await page.content();
                }
            } else if (extract === 'list') {
                // Return array of text items
                if (selector) {
                    result = await page.$$eval(selector, elements => elements.map(el => el.innerText));
                } else {
                    throw new Error('Selector required for list extraction');
                }
            }

            return result;
        } catch (err) {
            console.error('[Browser] Scrape error:', err);
            throw err;
        } finally {
            if (page) await page.close();
        }
    }

    // 2. Screenshot
    async screenshot(url, fullPage = false) {
        let page = null;
        try {
            page = await this.getPage();
            console.log(`[Browser] Screenshotting ${url}...`);

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });

            const buffer = await page.screenshot({
                fullPage,
                encoding: 'base64',
                type: 'jpeg',
                quality: 80
            });

            return buffer; // Base64 string
        } finally {
            if (page) await page.close();
        }
    }
}

const service = new BrowserService();

// ═══════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════

router.post('/scrape', async (req, res) => {
    try {
        const { url, selector, extract } = req.body;
        if (!url) return res.status(400).json({ error: 'url required' });

        const data = await service.scrape(url, selector, extract);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/screenshot', async (req, res) => {
    try {
        const { url, fullPage } = req.body;
        if (!url) return res.status(400).json({ error: 'url required' });

        const base64 = await service.screenshot(url, fullPage);
        res.json({ success: true, image: base64 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = {
    router,
    service
};
