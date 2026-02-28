const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const net = require('net');
const webhookService = require('./webhook');

const { GoogleGenerativeAI } = require('@google/generative-ai');

// AI GenAI Instance
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const aiModel = genAI ? genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' }) : null;

// Fake Redis In-Memory Cache (5 min TTL)
const scrapeCache = new Map();
function getCachedScrape(key) {
    const entry = scrapeCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        scrapeCache.delete(key);
        return null;
    }
    return entry.data;
}
function setCachedScrape(key, data, ttlSec = 300) {
    scrapeCache.set(key, { data, expiresAt: Date.now() + ttlSec * 1000 });
}

async function aiSummarizeText(text, maxTokens = 30000) {
    if (!aiModel || text.length <= maxTokens * 4) {
        return text.substring(0, maxTokens * 4);
    }
    console.log('[Browser] Text too long, starting AI Summarization (Chunking)...');
    
    // Split into 10k chunks
    const chunkSize = 10000;
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
    }
    
    // Limit to 5 chunks to avoid massive costs
    const limitedChunks = chunks.slice(0, 5); 
    
    const summaries = await Promise.all(limitedChunks.map(async (chunk) => {
        try {
            const prompt = `Bu web sitesi metin parçasından ÖNEMLİ BİLGİLERİ (haber başlıkları, fiyatlar, döviz kurları, tarihler, sıcaklıklar) çıkar. Çıkan sonucu net, kısa Türkçe cümlelerle yaz. Gereksiz veya spam içerikleri yoksay.\n\nMetin:\n${chunk}`;
            const result = await aiModel.generateContent(prompt);
            return result.response.text();
        } catch (e) {
            console.error('[Browser] AI Chunk error:', e.message);
            return '';
        }
    }));
    
    return summaries.filter(s => s.trim().length > 0).join('\n---\n');
}


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
const GOOGLE_DEFAULT_HL = String(process.env.GOOGLE_DEFAULT_HL || 'tr').trim() || 'tr';
const GOOGLE_DEFAULT_GL = String(process.env.GOOGLE_DEFAULT_GL || 'tr').trim() || 'tr';
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

function normalizeNumberString(raw) {
    const cleaned = String(raw || '')
        .replace(/[^\d.,-]/g, '')
        .trim();
    if (!cleaned) return '';

    let normalized = cleaned;
    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');

    if (hasComma && hasDot) {
        const commaIdx = normalized.lastIndexOf(',');
        const dotIdx = normalized.lastIndexOf('.');
        if (commaIdx > dotIdx) {
            normalized = normalized.replace(/\./g, '').replace(',', '.');
        } else {
            normalized = normalized.replace(/,/g, '');
        }
    } else if (hasComma && !hasDot) {
        const parts = normalized.split(',');
        const decimals = parts[1] || '';
        if (decimals.length > 0 && decimals.length <= 6) {
            normalized = `${parts[0].replace(/\./g, '')}.${decimals}`;
        } else {
            normalized = normalized.replace(/,/g, '');
        }
    } else {
        const dotParts = normalized.split('.');
        if (dotParts.length > 2) {
            const last = dotParts.pop();
            normalized = `${dotParts.join('')}.${last}`;
        }
    }

    return normalized;
}

function toFiniteNumber(raw) {
    const normalized = normalizeNumberString(raw);
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function getValueByPath(payload, rawPath) {
    const path = String(rawPath || '').trim();
    if (!path) return undefined;

    // Supports paths like: current.temperature_2m or results[0].name
    const tokens = path
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .map(t => t.trim())
        .filter(Boolean);

    let current = payload;
    for (const token of tokens) {
        if (current == null) return undefined;
        if (Array.isArray(current) && /^\d+$/.test(token)) {
            current = current[Number(token)];
            continue;
        }
        current = current[token];
    }
    return current;
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
        const isOptionsObject = selectorOrOptions && typeof selectorOrOptions === 'object' && !Array.isArray(selectorOrOptions);
        const selector = isOptionsObject ? selectorOrOptions.selector : selectorOrOptions;
        const waitForSelector = isOptionsObject ? (selectorOrOptions.waitForSelector || selectorOrOptions.selector) : selector;
        const extract = (isOptionsObject ? selectorOrOptions.extract : extractArg) || 'text';
        const fieldPath = isOptionsObject ? selectorOrOptions.fieldPath : null;
        const fieldMode = isOptionsObject ? (selectorOrOptions.fieldMode || 'text') : 'text';
        const attribute = isOptionsObject ? selectorOrOptions.attribute : null;
        const preWaitMsRaw = isOptionsObject ? selectorOrOptions.preWaitMs : 0;
        const scrollStepsRaw = isOptionsObject ? selectorOrOptions.scrollSteps : 0;
        const scrollDelayMsRaw = isOptionsObject ? selectorOrOptions.scrollDelayMs : 800;
        const extractMode = ['text', 'html', 'list', 'clean_text', 'smart_data', 'field', 'json_path'].includes(extract) ? extract : 'text';
        const targetSelector = selector || waitForSelector;
        const preWaitMs = Number.isFinite(Number(preWaitMsRaw))
            ? Math.max(0, Math.min(Math.round(Number(preWaitMsRaw)), 30000))
            : 0;
        const scrollSteps = Number.isFinite(Number(scrollStepsRaw))
            ? Math.max(0, Math.min(Math.round(Number(scrollStepsRaw)), 10))
            : 0;
        const scrollDelayMs = Number.isFinite(Number(scrollDelayMsRaw))
            ? Math.max(100, Math.min(Math.round(Number(scrollDelayMsRaw)), 5000))
            : 800;

        // CHECK CACHE FIRST (for clean_text and smart_data only to be safe)
        if (extractMode === 'clean_text' || extractMode === 'smart_data') {
            const cacheKey = `scrape:${url}:${extractMode}`;
            const cached = getCachedScrape(cacheKey);
            if (cached) {
                console.log(`[Browser] Cache hit for ${url}`);
                return cached;
            }
        }

        let page = null;
        try {
            await assertSafeHttpUrl(url);

            if (extractMode === 'json_path') {
                if (!fieldPath) {
                    throw createHttpError('fieldPath required for json_path extraction', 400, 'FIELD_PATH_REQUIRED');
                }

                const response = await withTimeout(
                    fetch(url, { headers: { accept: 'application/json' } }),
                    12000,
                    'JSON fetch timeout'
                );

                if (!response.ok) {
                    throw createHttpError(`JSON fetch failed: ${response.status}`, 502, 'JSON_FETCH_HTTP');
                }

                let payload;
                try {
                    payload = await response.json();
                } catch (err) {
                    throw createHttpError(`JSON parse failed: ${err.message}`, 502, 'JSON_PARSE_FAILED');
                }

                const value = getValueByPath(payload, fieldPath);
                if (typeof value === 'undefined') {
                    throw createHttpError(`fieldPath not found: ${fieldPath}`, 404, 'FIELD_PATH_NOT_FOUND');
                }

                return {
                    type: 'json_path',
                    fieldPath,
                    data: value,
                };
            }

            page = await this.getPage();
            console.log(`[Browser] Scraping ${url} (Mode: ${extractMode})...`);

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
            await assertSafeHttpUrl(page.url());

            if (waitForSelector) {
                await page.waitForSelector(waitForSelector, { timeout: 30000 });
            }

            if (preWaitMs > 0) {
                await page.waitForTimeout(preWaitMs);
            }

            if (scrollSteps > 0) {
                for (let i = 0; i < scrollSteps; i++) {
                    await page.evaluate(() => {
                        window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'instant' });
                    });
                    await page.waitForTimeout(scrollDelayMs);
                }
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
                if (targetSelector) {
                    result = await page.$$eval(targetSelector, elements => elements.map(el => el.innerText));
                } else {
                    throw new Error('Selector required for list extraction');
                }
            } else if (extractMode === 'field') {
                if (!targetSelector) {
                    throw createHttpError('selector required for field extraction', 400, 'SELECTOR_REQUIRED');
                }

                result = await page.$eval(
                    targetSelector,
                    (el, mode, attr) => {
                        const safeMode = String(mode || 'text').toLowerCase();
                        if (safeMode === 'html') return el.innerHTML;
                        if (safeMode === 'value') {
                            const hasValue = Object.prototype.hasOwnProperty.call(el, 'value') || 'value' in el;
                            return hasValue ? String(el.value ?? '') : null;
                        }
                        if (safeMode === 'attr') {
                            if (!attr) return null;
                            return el.getAttribute(attr);
                        }
                        return el.innerText;
                    },
                    fieldMode,
                    attribute
                );
            } else if (extractMode === 'clean_text' || extractMode === 'smart_data') {
                
                // SMART DATA EXTRACTION (Priority Phase)
                if (extractMode === 'smart_data') {
                    const structuredData = await page.evaluate(() => {
                        let jsonLdData = null;
                        const jsonLdElement = document.querySelector('script[type="application/ld+json"]');
                        if (jsonLdElement) {
                            try { jsonLdData = JSON.parse(jsonLdElement.textContent); } catch (e) {}
                        }
                        const ogTags = {};
                        document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
                            ogTags[meta.getAttribute('property')] = meta.getAttribute('content');
                        });
                        return { jsonLd: jsonLdData, openGraph: ogTags };
                    });

                    // If it has strong product or article info
                    if ((structuredData.jsonLd && (structuredData.jsonLd.price || structuredData.jsonLd.headline)) || 
                        structuredData.openGraph['og:price:amount'] || structuredData.openGraph['og:title']) {
                        result = { type: 'structured', data: structuredData };
                    }
                }

                // If no smart data found OR user explicitly wanted clean_text
                if (!result) {
                    // DOM Selective Stripping
                    const rawCleanText = await page.evaluate(() => {
                        const alwaysRemove = ['script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'video', 'audio'];
                        const conditionalRemove = ['nav', 'footer', 'aside', 'header'];

                        alwaysRemove.forEach(tag => document.querySelectorAll(tag).forEach(el => el.remove()));

                        conditionalRemove.forEach(tag => {
                            document.querySelectorAll(tag).forEach(el => {
                                const text = el.innerText ? el.innerText.toLowerCase() : '';
                                if (/(\d+[.,]\d+|tl|usd|eur|dolar|euro|hava|derece|°c)/i.test(text) ||
                                    el.querySelectorAll('article, .news, .price').length > 0) {
                                    return; // Koru
                                }
                                el.remove();
                            });
                        });
                        return document.body.innerText;
                    });
                    
                    // Collapse excessive newlines and whitespace
                    const collapsedText = rawCleanText.replace(/\n{3,}/g, '\n\n').trim();
                    
                    // Call AI chunk summarizer
                    const finalText = await aiSummarizeText(collapsedText, 30000);
                    
                    result = {
                        type: 'clean_text',
                        data: finalText
                    };
                }

                // Save to Cache
                const cacheKey = `scrape:${url}:${extractMode}`;
                setCachedScrape(cacheKey, result, 300);
            }

            return result;
        } catch (err) {
            console.error('[Browser] Puppeteer Scrape error:', err.message);
            // FALLBACK CHAIN: Trigger Jina AI if blocked
            if (extractMode === 'clean_text' || extractMode === 'smart_data') {
                if (err.message.includes('blocked') || err.message.includes('timeout') || err.message.includes('ERR_')) {
                    console.log('[Browser] Captcha/Block detected. Falling back to r.jina.ai proxy...');
                    try {
                        let jinaResponse = null;
                        if (typeof fetch !== 'undefined') {
                            const controller = new AbortController();
                            const id = setTimeout(() => controller.abort(), 10000);
                            jinaResponse = await fetch(`https://r.jina.ai/${url}`, { signal: controller.signal });
                            clearTimeout(id);
                        } else {
                            // node-fetch fallback if fetch is not native
                            const https = require('https');
                            jinaResponse = await new Promise((res, rej) => {
                                https.get(`https://r.jina.ai/${url}`, (response) => {
                                    let data = '';
                                    response.on('data', chunk => data += chunk);
                                    response.on('end', () => res({ ok: response.statusCode === 200, text: () => Promise.resolve(data) }));
                                }).on('error', rej);
                            });
                        }

                        if (jinaResponse && jinaResponse.ok) {
                            const textData = await jinaResponse.text();
                            const finalText = await aiSummarizeText(textData, 30000);
                            return { type: 'fallback_jina', data: finalText };
                        }
                    } catch (jinaErr) {
                         console.error('[Browser] Fallback Jina AI failed:', jinaErr.message);
                    }
                }
            }
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

    // 3. Google Finance (Currency Pair)
    async googleFinanceRate(base = 'USD', quote = 'TRY', options = {}) {
        const from = String(base || 'USD').trim().toUpperCase();
        const to = String(quote || 'TRY').trim().toUpperCase();
        const hl = String(options.hl || GOOGLE_DEFAULT_HL || 'tr').trim() || 'tr';
        const gl = String(options.gl || GOOGLE_DEFAULT_GL || 'tr').trim() || 'tr';

        const url = `https://www.google.com/finance/quote/${encodeURIComponent(from)}-${encodeURIComponent(to)}?hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}`;
        let page = null;

        try {
            await assertSafeHttpUrl(url);
            page = await this.getPage();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
            await assertSafeHttpUrl(page.url());

            await new Promise(resolve => setTimeout(resolve, 1500));

            const extracted = await page.evaluate((baseCode, quoteCode) => {
                const selectors = [
                    '[data-last-price]',
                    'div.YMlKec.fxKbKc',
                    'div.YMlKec',
                    '[class*="YMlKec"]',
                    'main [class*="fxKbKc"]',
                    '[aria-label*="price"]'
                ];

                let selectorText = '';
                let dataLastPrice = '';

                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (!el) continue;
                    if (!dataLastPrice) {
                        const attr = el.getAttribute('data-last-price');
                        if (attr && attr.trim()) dataLastPrice = attr.trim();
                    }
                    if (!selectorText) {
                        const txt = (el.textContent || '').trim();
                        if (txt) selectorText = txt;
                    }
                    if (dataLastPrice || selectorText) break;
                }

                const bodyText = (document.body?.innerText || '').replace(/\u00a0/g, ' ');
                const lines = bodyText.split('\n').map(line => line.trim()).filter(Boolean);
                const pairNeedles = [
                    `${baseCode} / ${quoteCode}`,
                    `${baseCode}/${quoteCode}`,
                    `${baseCode}-${quoteCode}`
                ].map(v => v.toUpperCase());

                const nearPairLines = [];
                for (let i = 0; i < lines.length; i++) {
                    const current = lines[i].toUpperCase();
                    if (pairNeedles.some(needle => current.includes(needle))) {
                        for (let j = i; j < Math.min(lines.length, i + 8); j++) {
                            nearPairLines.push(lines[j]);
                        }
                    }
                }

                return {
                    selectorText,
                    dataLastPrice,
                    nearPairLines,
                    pageTitle: document.title || '',
                    finalUrl: location.href || ''
                };
            }, from, to);

            const candidateTexts = [
                extracted.dataLastPrice,
                extracted.selectorText,
                ...(Array.isArray(extracted.nearPairLines) ? extracted.nearPairLines : [])
            ].filter(Boolean);

            let parsedRate = null;
            let parsedFrom = '';

            for (const text of candidateTexts) {
                const numericParts = String(text).match(/-?\d[\d.,]*/g) || [];
                for (const part of numericParts) {
                    const value = toFiniteNumber(part);
                    if (value == null) continue;
                    if (value <= 0 || value > 10000000) continue;
                    parsedRate = value;
                    parsedFrom = part;
                    break;
                }
                if (parsedRate != null) break;
            }

            if (parsedRate == null) {
                throw createHttpError('Google Finance kur verisi parse edilemedi', 502, 'GOOGLE_FINANCE_PARSE_FAILED');
            }

            return {
                source: 'google_finance',
                base: from,
                quote: to,
                rate: parsedRate,
                raw: parsedFrom || null,
                pageTitle: extracted.pageTitle || null,
                url: extracted.finalUrl || url,
                retrievedAt: new Date().toISOString()
            };
        } finally {
            if (page) await page.close();
        }
    }

    // 4. Weather (Open-Meteo backend, endpoint kept as /google/weather for compatibility)
    async googleWeather(city = 'Istanbul', options = {}) {
        const targetCity = String(city || 'Istanbul').trim() || 'Istanbul';
        const lang = String(options.hl || GOOGLE_DEFAULT_HL || 'tr').trim() || 'tr';

        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(targetCity)}&count=1&language=${encodeURIComponent(lang)}&format=json`;
        let geoResponse;
        try {
            geoResponse = await withTimeout(
                fetch(geoUrl, { headers: { accept: 'application/json' } }),
                12000,
                'Open-Meteo geocoding timeout'
            );
        } catch (err) {
            throw createHttpError(`Open-Meteo geocoding failed: ${err.message}`, 502, 'OPEN_METEO_GEOCODE_FAILED');
        }

        if (!geoResponse.ok) {
            throw createHttpError(`Open-Meteo geocoding HTTP ${geoResponse.status}`, 502, 'OPEN_METEO_GEOCODE_HTTP');
        }

        let geoPayload;
        try {
            geoPayload = await geoResponse.json();
        } catch (err) {
            throw createHttpError(`Open-Meteo geocoding parse failed: ${err.message}`, 502, 'OPEN_METEO_GEOCODE_PARSE');
        }

        const first = Array.isArray(geoPayload?.results) ? geoPayload.results[0] : null;
        if (!first || !Number.isFinite(first.latitude) || !Number.isFinite(first.longitude)) {
            throw createHttpError(`City not found: ${targetCity}`, 404, 'OPEN_METEO_CITY_NOT_FOUND');
        }

        const forecastUrl =
            `https://api.open-meteo.com/v1/forecast?latitude=${first.latitude}&longitude=${first.longitude}` +
            `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;

        let weatherResponse;
        try {
            weatherResponse = await withTimeout(
                fetch(forecastUrl, { headers: { accept: 'application/json' } }),
                12000,
                'Open-Meteo forecast timeout'
            );
        } catch (err) {
            throw createHttpError(`Open-Meteo forecast failed: ${err.message}`, 502, 'OPEN_METEO_FORECAST_FAILED');
        }

        if (!weatherResponse.ok) {
            throw createHttpError(`Open-Meteo forecast HTTP ${weatherResponse.status}`, 502, 'OPEN_METEO_FORECAST_HTTP');
        }

        let weatherPayload;
        try {
            weatherPayload = await weatherResponse.json();
        } catch (err) {
            throw createHttpError(`Open-Meteo forecast parse failed: ${err.message}`, 502, 'OPEN_METEO_FORECAST_PARSE');
        }

        const current = weatherPayload?.current || {};
        const temperatureC = toFiniteNumber(current.temperature_2m);
        if (temperatureC == null) {
            throw createHttpError('Open-Meteo temperature parse failed', 502, 'OPEN_METEO_TEMPERATURE_PARSE');
        }

        const humidityValue = toFiniteNumber(current.relative_humidity_2m);
        const windValue = toFiniteNumber(current.wind_speed_10m);
        const weatherCode = Number.isFinite(Number(current.weather_code)) ? Number(current.weather_code) : null;

        return {
            source: 'open_meteo',
            city: targetCity,
            location: [first.name, first.admin1, first.country].filter(Boolean).join(', ') || targetCity,
            temperatureC,
            condition: this.mapOpenMeteoWeatherCode(weatherCode),
            humidity: humidityValue == null ? null : `${humidityValue}%`,
            wind: windValue == null ? null : `${windValue} km/h`,
            precipitation: null,
            pageTitle: null,
            url: forecastUrl,
            retrievedAt: new Date().toISOString()
        };
    }

    mapOpenMeteoWeatherCode(code) {
        const map = {
            0: 'Acik',
            1: 'Genelde acik',
            2: 'Parcali bulutlu',
            3: 'Kapali',
            45: 'Sisli',
            48: 'Kiragi sisli',
            51: 'Hafif ciseleme',
            53: 'Orta ciseleme',
            55: 'Yogun ciseleme',
            56: 'Hafif donan ciseleme',
            57: 'Yogun donan ciseleme',
            61: 'Hafif yagmur',
            63: 'Orta yagmur',
            65: 'Yogun yagmur',
            66: 'Hafif donan yagmur',
            67: 'Yogun donan yagmur',
            71: 'Hafif kar',
            73: 'Orta kar',
            75: 'Yogun kar',
            77: 'Kar tanesi',
            80: 'Hafif saganak',
            81: 'Orta saganak',
            82: 'Siddetli saganak',
            85: 'Hafif kar saganagi',
            86: 'Yogun kar saganagi',
            95: 'Gok gurultulu firtina',
            96: 'Dolu ihtimalli firtina',
            99: 'Yogun dolulu firtina',
        };
        return code == null ? null : (map[code] || `Kod ${code}`);
    }
}
const service = new BrowserService();

// ═══════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════

router.post('/scrape', scrapeRateLimit, async (req, res) => {
    try {
        const { url, selector, waitForSelector, extract, fieldPath, fieldMode, attribute, preWaitMs, scrollSteps, scrollDelayMs } = req.body || {};
        if (!url) return res.status(400).json({ error: 'url required' });
        const extractMode = ['text', 'html', 'list', 'clean_text', 'smart_data', 'field', 'json_path'].includes(extract) ? extract : 'text';
        const startedAt = Date.now();

        const data = await service.scrape(url, {
            selector,
            waitForSelector,
            extract: extractMode,
            fieldPath,
            fieldMode,
            attribute,
            preWaitMs,
            scrollSteps,
            scrollDelayMs,
        });
        const durationMs = Date.now() - startedAt;

        res.json({
            success: true,
            data,
            meta: {
                url,
                selector: selector || null,
                waitForSelector: waitForSelector || null,
                extract: extractMode,
                fieldPath: fieldPath || null,
                fieldMode: fieldMode || null,
                attribute: attribute || null,
                preWaitMs: Number.isFinite(Number(preWaitMs)) ? Number(preWaitMs) : null,
                scrollSteps: Number.isFinite(Number(scrollSteps)) ? Number(scrollSteps) : null,
                scrollDelayMs: Number.isFinite(Number(scrollDelayMs)) ? Number(scrollDelayMs) : null,
                durationMs,
                empty: isEmptyScrapeData(data),
            },
        });
    } catch (err) {
        const status = (err && err.statusCode) || 500;
        res.status(status).json({ error: err.message, code: err.code });
    }
});

router.post('/google/finance', scrapeRateLimit, async (req, res) => {
    try {
        const { base = 'USD', quote = 'TRY', hl, gl } = req.body || {};
        const startedAt = Date.now();
        const data = await service.googleFinanceRate(base, quote, { hl, gl });

        res.json({
            success: true,
            data,
            meta: {
                base: String(base || 'USD').toUpperCase(),
                quote: String(quote || 'TRY').toUpperCase(),
                durationMs: Date.now() - startedAt,
            },
        });
    } catch (err) {
        const status = (err && err.statusCode) || 500;
        res.status(status).json({ error: err.message, code: err.code });
    }
});

router.post('/google/weather', scrapeRateLimit, async (req, res) => {
    try {
        const { city = 'Istanbul', hl, gl } = req.body || {};
        const startedAt = Date.now();
        const data = await service.googleWeather(city, { hl, gl });

        res.json({
            success: true,
            data,
            meta: {
                city: String(city || 'Istanbul'),
                durationMs: Date.now() - startedAt,
            },
        });
    } catch (err) {
        const status = (err && err.statusCode) || 500;
        res.status(status).json({ error: err.message, code: err.code });
    }
});

router.post('/google/snapshot', scrapeRateLimit, async (req, res) => {
    try {
        const {
            base = 'USD',
            quote = 'TRY',
            city = 'Istanbul',
            hl,
            gl,
        } = req.body || {};

        const startedAt = Date.now();
        const [finance, weather] = await Promise.all([
            service.googleFinanceRate(base, quote, { hl, gl }),
            service.googleWeather(city, { hl, gl }),
        ]);

        res.json({
            success: true,
            data: { finance, weather },
            meta: {
                base: String(base || 'USD').toUpperCase(),
                quote: String(quote || 'TRY').toUpperCase(),
                city: String(city || 'Istanbul'),
                durationMs: Date.now() - startedAt,
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
