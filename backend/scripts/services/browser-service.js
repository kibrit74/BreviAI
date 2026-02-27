const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const net = require('net');
const webhookService = require('./webhook');

const router = express.Router();

// ═══════════════════════════════════════════════════
// Browser Service Logic
// ═══════════════════════════════════════════════════

// Resource constraints
const MAX_CONCURRENT_PAGES = 3;
const MAX_QUEUE_LENGTH = 20;
const QUEUE_WAIT_TIMEOUT_MS = 30000;
const TIMEOUT_MS = 120000; // Increased to 2 minutes
const DNS_LOOKUP_TIMEOUT_MS = 4000;
const RATE_LIMIT_WINDOW_MS = Math.max(1000, Number(process.env.BROWSER_RATE_LIMIT_WINDOW_MS || 60000));
const SCRAPE_RATE_LIMIT_MAX = Math.max(0, Number(process.env.BROWSER_SCRAPE_RATE_LIMIT_MAX || 20));
const SCREENSHOT_RATE_LIMIT_MAX = Math.max(0, Number(process.env.BROWSER_SCREENSHOT_RATE_LIMIT_MAX || 10));
const BROWSER_ALLOWED_HOSTS = String(process.env.BROWSER_ALLOWED_HOSTS || '')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);
const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'host.docker.internal',
    'metadata.google.internal',
]);
const rateLimitStore = new Map();

function createHttpError(message, statusCode = 500, code) {
    const err = new Error(message);
    err.statusCode = statusCode;
    if (code) err.code = code;
    return err;
}

function getRequestIdentity(req) {
    const authHeader = req.headers['x-auth-key'];
    const authKey = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (typeof authKey === 'string' && authKey.trim()) {
        return `auth:${authKey.trim()}`;
    }

    const forwarded = req.headers['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const forwardedIp = typeof forwardedValue === 'string'
        ? forwardedValue.split(',')[0].trim()
        : '';
    const ip = forwardedIp || req.ip || req.socket?.remoteAddress || 'unknown';
    return `ip:${ip}`;
}

function cleanupRateLimitStore(now = Date.now()) {
    for (const [key, entry] of rateLimitStore.entries()) {
        if (!entry || now >= entry.resetAt) {
            rateLimitStore.delete(key);
        }
    }
}

function createRateLimitMiddleware(scope, maxRequests) {
    return (req, res, next) => {
        if (!Number.isFinite(maxRequests) || maxRequests <= 0) {
            return next();
        }

        const now = Date.now();
        if (rateLimitStore.size > 1000) {
            cleanupRateLimitStore(now);
        }

        const identity = getRequestIdentity(req);
        const key = `${scope}:${identity}`;
        let entry = rateLimitStore.get(key);

        if (!entry || now >= entry.resetAt) {
            entry = {
                count: 0,
                resetAt: now + RATE_LIMIT_WINDOW_MS,
            };
            rateLimitStore.set(key, entry);
        }

        entry.count += 1;
        const remaining = Math.max(0, maxRequests - entry.count);
        const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

        res.setHeader('X-RateLimit-Limit', String(maxRequests));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.floor(entry.resetAt / 1000)));

        if (entry.count > maxRequests) {
            res.setHeader('Retry-After', String(retryAfterSeconds));
            return res.status(429).json({
                error: `${scope} rate limit exceeded`,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfterSeconds,
                limit: maxRequests,
                windowMs: RATE_LIMIT_WINDOW_MS,
            });
        }

        next();
    };
}

const scrapeRateLimit = createRateLimitMiddleware('browser-scrape', SCRAPE_RATE_LIMIT_MAX);
const screenshotRateLimit = createRateLimitMiddleware('browser-screenshot', SCREENSHOT_RATE_LIMIT_MAX);

function normalizeHostname(hostname) {
    return String(hostname || '').trim().toLowerCase().replace(/\.$/, '');
}

function isPrivateIPv4(ip) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return false;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
}

function isPrivateIPv6(ip) {
    const v = ip.toLowerCase();
    if (v === '::1') return true;
    if (v.startsWith('fc') || v.startsWith('fd')) return true; // fc00::/7
    if (v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return true; // fe80::/10
    return false;
}

function isPrivateIp(ip) {
    const type = net.isIP(ip);
    if (type === 4) return isPrivateIPv4(ip);
    if (type === 6) return isPrivateIPv6(ip);
    return false;
}

function matchesAllowedHost(hostname) {
    if (BROWSER_ALLOWED_HOSTS.length === 0) return true;
    const host = normalizeHostname(hostname);
    return BROWSER_ALLOWED_HOSTS.some(pattern => {
        if (pattern.startsWith('*.')) {
            const suffix = pattern.slice(2);
            return host === suffix || host.endsWith(`.${suffix}`);
        }
        return host === pattern;
    });
}

function assertBasicHostRules(hostname) {
    const host = normalizeHostname(hostname);
    if (!host) {
        throw createHttpError('Invalid target URL hostname', 400, 'INVALID_HOST');
    }
    if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.local')) {
        throw createHttpError(`Blocked hostname: ${host}`, 403, 'SSRF_BLOCKED_HOST');
    }
    if (!matchesAllowedHost(host)) {
        throw createHttpError(`Host is not in allowlist: ${host}`, 403, 'HOST_NOT_ALLOWED');
    }
    return host;
}

function withTimeout(promise, timeoutMs, message) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(createHttpError(message, 504, 'TIMEOUT')), timeoutMs);
        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

async function assertSafeHttpUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw createHttpError('Invalid URL', 400, 'INVALID_URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw createHttpError(`Unsupported protocol: ${parsed.protocol}`, 400, 'INVALID_PROTOCOL');
    }
    if (parsed.username || parsed.password) {
        throw createHttpError('Credentials in URL are not allowed', 400, 'URL_CREDENTIALS_BLOCKED');
    }

    const host = assertBasicHostRules(parsed.hostname);
    const ipType = net.isIP(host);
    if (ipType && isPrivateIp(host)) {
        throw createHttpError(`Blocked private IP: ${host}`, 403, 'SSRF_PRIVATE_IP');
    }

    if (!ipType) {
        let records = [];
        try {
            records = await withTimeout(
                dns.promises.lookup(host, { all: true, verbatim: true }),
                DNS_LOOKUP_TIMEOUT_MS,
                'DNS lookup timed out'
            );
        } catch (err) {
            if (err && err.statusCode) throw err;
            throw createHttpError(`DNS lookup failed for host: ${host}`, 502, 'DNS_LOOKUP_FAILED');
        }

        if (!Array.isArray(records) || records.length === 0) {
            throw createHttpError(`DNS lookup returned no records for host: ${host}`, 502, 'DNS_NO_RECORDS');
        }

        const blockedIp = records.find(r => r && r.address && isPrivateIp(r.address));
        if (blockedIp) {
            throw createHttpError(`Blocked private IP resolution: ${host} -> ${blockedIp.address}`, 403, 'SSRF_PRIVATE_DNS');
        }
    }

    return parsed;
}

function shouldBlockRequestByUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        if (!['http:', 'https:', 'data:', 'about:', 'blob:'].includes(parsed.protocol)) {
            return `Blocked protocol: ${parsed.protocol}`;
        }
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }

        const host = normalizeHostname(parsed.hostname);
        if (!host) return 'Invalid request hostname';
        if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.local')) {
            return `Blocked hostname: ${host}`;
        }
        if (!matchesAllowedHost(host)) {
            return `Host not in allowlist: ${host}`;
        }
        if (net.isIP(host) && isPrivateIp(host)) {
            return `Blocked private IP request: ${host}`;
        }
        return null;
    } catch {
        return 'Invalid request URL';
    }
}

function isEmptyScrapeData(value) {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0 || value.every(v => typeof v === 'string' ? v.trim().length === 0 : v == null);
    return false;
}

class BrowserService {
    constructor() {
        this.browser = null;
        this.activePages = 0;
        this.waitQueue = [];
        this.browserInitPromise = null;
        this.initBrowser();
    }

    async initBrowser() {
        if (this.browser) return this.browser;
        if (this.browserInitPromise) return this.browserInitPromise;

        console.log('[Browser] Initializing Puppeteer...');

        // Auto-detect Chrome
        const possibleChromePaths = [
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            process.env.CHROME_PATH || ''
        ].filter(Boolean);

        const chromePath = possibleChromePaths.find(p => fs.existsSync(p));

        this.browserInitPromise = (async () => {
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
                this.browserInitPromise = null;
            });

            return this.browser;
        })();

        try {
            return await this.browserInitPromise;
        } catch (err) {
            console.error('[Browser] Launch failed:', err);
            this.browser = null;
            this.browserInitPromise = null;
            throw err;
        }
    }

    _removeQueueItem(item) {
        const idx = this.waitQueue.indexOf(item);
        if (idx >= 0) this.waitQueue.splice(idx, 1);
    }

    _drainQueue() {
        while (this.activePages < MAX_CONCURRENT_PAGES && this.waitQueue.length > 0) {
            const item = this.waitQueue.shift();
            if (!item) continue;
            clearTimeout(item.timer);
            if (item.cancelled) continue;
            this.activePages++;
            item.resolve(Date.now() - item.enqueuedAt);
        }
    }

    _releasePageSlot() {
        if (this.activePages > 0) {
            this.activePages--;
        } else {
            this.activePages = 0;
        }
        this._drainQueue();
    }

    async _acquirePageSlot() {
        if (this.activePages < MAX_CONCURRENT_PAGES) {
            this.activePages++;
            return 0;
        }

        if (this.waitQueue.length >= MAX_QUEUE_LENGTH) {
            throw createHttpError('Browser queue full', 503, 'BROWSER_QUEUE_FULL');
        }

        return new Promise((resolve, reject) => {
            const item = {
                enqueuedAt: Date.now(),
                cancelled: false,
                timer: null,
                resolve,
                reject,
            };

            item.timer = setTimeout(() => {
                item.cancelled = true;
                this._removeQueueItem(item);
                reject(createHttpError('Browser queue wait timed out', 503, 'BROWSER_QUEUE_TIMEOUT'));
            }, QUEUE_WAIT_TIMEOUT_MS);

            this.waitQueue.push(item);
        });
    }

    async getPage() {
        const queueWaitMs = await this._acquirePageSlot();

        if (!this.browser) await this.initBrowser();

        let page;
        try {
            page = await this.browser.newPage();
        } catch (err) {
            this._releasePageSlot();
            throw err;
        }

        // Set standard User Agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Optimize page
        await page.setRequestInterception(true);
        page.on('request', async (req) => {
            try {
                if (typeof req.isInterceptResolutionHandled === 'function' && req.isInterceptResolutionHandled()) {
                    return;
                }

                const blockReason = shouldBlockRequestByUrl(req.url());
                if (blockReason) {
                    console.warn('[Browser] Blocked request:', blockReason, req.url());
                    await req.abort('blockedbyclient');
                    return;
                }

                if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                    await req.abort();
                } else {
                    await req.continue();
                }
            } catch (handlerErr) {
                try {
                    if (!(typeof req.isInterceptResolutionHandled === 'function' && req.isInterceptResolutionHandled())) {
                        await req.abort();
                    }
                } catch (_) {
                    // Ignore double-resolution errors.
                }
            }
        });

        // Cleanup handler
        const originalClose = page.close.bind(page);
        let released = false;
        page.close = async () => {
            if (!released) {
                released = true;
                this._releasePageSlot();
            }
            return originalClose();
        };
        page.__queueWaitMs = queueWaitMs;

        return page;
    }

    // 1. Scrape Text/HTML
    async scrape(url, selectorOrOptions, extractArg = 'text') {
        let page = null;
        try {
            await assertSafeHttpUrl(url);
            page = await this.getPage();
            console.log(`[Browser] Scraping ${url}...`);

            const isOptionsObject = selectorOrOptions && typeof selectorOrOptions === 'object' && !Array.isArray(selectorOrOptions);
            const selector = isOptionsObject ? selectorOrOptions.selector : selectorOrOptions;
            const waitForSelector = isOptionsObject ? (selectorOrOptions.waitForSelector || selectorOrOptions.selector) : selector;
            const extract = (isOptionsObject ? selectorOrOptions.extract : extractArg) || 'text';
            const extractMode = ['text', 'html', 'list'].includes(extract) ? extract : 'text';
            const targetSelector = selector || waitForSelector;

            // Use 'domcontentloaded' for faster response, 'networkidle2' is too slow for dynamic sites
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
            await assertSafeHttpUrl(page.url());

            if (waitForSelector) {
                // Wait for a specific selector before extracting (dynamic pages)
                await page.waitForSelector(waitForSelector, { timeout: 30000 });
            }

            let result;
            if (extractMode === 'text') {
                if (targetSelector) {
                    result = await page.$eval(targetSelector, el => el.innerText);
                } else {
                    result = await page.evaluate(() => document.body.innerText);
                }
            } else if (extractMode === 'html') {
                if (targetSelector) {
                    result = await page.$eval(targetSelector, el => el.innerHTML);
                } else {
                    result = await page.content();
                }
            } else if (extractMode === 'list') {
                // Return array of text items
                if (targetSelector) {
                    result = await page.$$eval(targetSelector, elements => elements.map(el => el.innerText));
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
            await assertSafeHttpUrl(url);
            page = await this.getPage();
            console.log(`[Browser] Screenshotting ${url}...`);

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
            await assertSafeHttpUrl(page.url());

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

router.post('/scrape', scrapeRateLimit, async (req, res) => {
    try {
        const { url, selector, waitForSelector, extract } = req.body || {};
        if (!url) return res.status(400).json({ error: 'url required' });
        const extractMode = ['text', 'html', 'list'].includes(extract) ? extract : 'text';
        const startedAt = Date.now();

        const data = await service.scrape(url, { selector, waitForSelector, extract: extractMode });
        const durationMs = Date.now() - startedAt;

        res.json({
            success: true,
            data,
            meta: {
                url,
                selector: selector || null,
                waitForSelector: waitForSelector || null,
                extract: extractMode,
                durationMs,
                empty: isEmptyScrapeData(data),
            },
        });
    } catch (err) {
        const status = (err && err.statusCode) || 500;
        res.status(status).json({ error: err.message, code: err.code });
    }
});

router.post('/screenshot', screenshotRateLimit, async (req, res) => {
    try {
        const { url, fullPage } = req.body;
        if (!url) return res.status(400).json({ error: 'url required' });

        const base64 = await service.screenshot(url, fullPage);
        res.json({ success: true, image: base64 });
    } catch (err) {
        const status = (err && err.statusCode) || 500;
        res.status(status).json({ error: err.message, code: err.code });
    }
});

module.exports = {
    router,
    service
};
