import { CronCreateConfig, BrowserScrapeConfig, CronDeleteConfig, CronListConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { secureStorage } from '../SecureStorage';

// Fallback defaults (used when SecureStore has no saved values)
const DEFAULT_BACKEND_URL = 'http://136.109.124.154:3001';
const DEFAULT_AUTH_KEY = 'breviai-secret-password';

function normalizeBackendBaseUrl(rawUrl?: string | null): string {
    const candidate = String(rawUrl || '').trim();
    if (!candidate) return DEFAULT_BACKEND_URL;

    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate);
    const withScheme = hasScheme ? candidate : `http://${candidate}`;
    return withScheme.replace(/\/+$/, '');
}

function normalizeTargetUrl(rawUrl?: string | null): string {
    const candidate = String(rawUrl || '').trim();
    if (!candidate) return '';

    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate);
    if (hasScheme) return candidate;
    return candidate.startsWith('//') ? `https:${candidate}` : `https://${candidate}`;
}

function isLikelyNetworkError(error: any): boolean {
    const message = String(error?.message || '').toLowerCase();
    return (
        message.includes('network request failed') ||
        message.includes('failed to fetch') ||
        message.includes('econnrefused') ||
        message.includes('connection refused') ||
        message.includes('networkerror')
    );
}

/**
 * Backend yapılandırmasını güvenli depolamadan çeker.
 * SecureStore'da değer yoksa fallback kullanır.
 */
export async function getBackendConfig() {
    const storedUrl = await secureStorage.getSecure('backendUrl');
    const url = normalizeBackendBaseUrl(storedUrl || DEFAULT_BACKEND_URL);
    const key = await secureStorage.getSecure('backendAuthKey') || DEFAULT_AUTH_KEY;
    return { url, key };
}

function hasOwnKey<T extends object>(obj: T, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function unwrapScrapeEnvelope(payload: any): any {
    let current = payload;

    for (let i = 0; i < 3; i++) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
            return current;
        }

        const hasData = hasOwnKey(current, 'data');
        const hasResult = hasOwnKey(current, 'result');
        const hasSuccess = hasOwnKey(current, 'success');
        const hasMeta = hasOwnKey(current, 'meta');

        if (hasData && (hasSuccess || hasMeta)) {
            current = current.data;
            continue;
        }

        if (hasResult && (hasSuccess || hasMeta)) {
            current = current.result;
            continue;
        }

        return current;
    }

    return current;
}

function isEmptyScrapeValue(value: any): boolean {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) {
        return value.length === 0 || value.every(item =>
            item == null || (typeof item === 'string' && item.trim().length === 0)
        );
    }
    return false;
}

/**
 * Execute CRON_CREATE node
 * Creates a scheduled task on the backend
 */
export async function executeCronCreate(
    config: CronCreateConfig,
    variableManager: VariableManager
): Promise<any> {
    const name = variableManager.resolveString(config.name);
    const schedule = variableManager.resolveString(config.schedule);
    const actionType = variableManager.resolveString(config.actionType || 'log');
    const actionPayload = config.actionPayload || {};
    let resolvedPayload: any = {};

    if (typeof actionPayload === 'string') {
        try {
            const resolvedString = variableManager.resolveString(actionPayload);
            resolvedPayload = JSON.parse(resolvedString);
        } catch (e) {
            console.error('[CronCreate] Failed to parse actionPayload string:', e);
            resolvedPayload = {};
        }
    } else {
        // Recursively resolve values in the object
        resolvedPayload = Object.entries(actionPayload).reduce((acc, [key, value]) => {
            acc[key] = typeof value === 'string' ? variableManager.resolveString(value) : value;
            return acc;
        }, {} as Record<string, any>);
    }

    console.log('[CronCreate] Creating job:', { name, schedule, actionType });

    try {
        const { url: BACKEND_URL, key: AUTH_KEY } = await getBackendConfig();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(`${BACKEND_URL}/cron/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-key': AUTH_KEY,
            },
            body: JSON.stringify({
                id: name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40) + '_' + Date.now(),
                name,
                schedule,
                action: {
                    type: actionType,
                    ...resolvedPayload,
                },
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after 10 seconds');
        }
        console.error('[CronCreate] Error:', error);
        throw new Error(`Cron creation failed: ${error.message}`);
    }
}

/**
 * Execute CRON_DELETE node
 * Deletes a scheduled task from the backend
 */
export async function executeCronDelete(
    config: CronDeleteConfig,
    variableManager: VariableManager
): Promise<any> {
    const jobId = variableManager.resolveString(config.jobId);

    if (!jobId) {
        throw new Error('Job ID is required to delete a cron job');
    }

    console.log('[CronDelete] Deleting job:', jobId);

    try {
        const { url: BACKEND_URL, key: AUTH_KEY } = await getBackendConfig();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${BACKEND_URL}/cron/delete/${encodeURIComponent(jobId)}`, {
            method: 'DELETE',
            headers: {
                'x-auth-key': AUTH_KEY,
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Backend error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (config.variableName) {
            variableManager.set(config.variableName, data);
        }

        return { success: true, deletedJobId: jobId, data };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after 10 seconds');
        }
        console.error('[CronDelete] Error:', error);
        throw new Error(`Cron deletion failed: ${error.message}`);
    }
}

/**
 * Execute CRON_LIST node
 * Lists all active scheduled tasks from the backend
 */
export async function executeCronList(
    config: CronListConfig,
    variableManager: VariableManager
): Promise<any> {
    console.log('[CronList] Fetching active jobs...');

    try {
        const { url: BACKEND_URL, key: AUTH_KEY } = await getBackendConfig();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${BACKEND_URL}/cron/list`, {
            method: 'GET',
            headers: {
                'x-auth-key': AUTH_KEY,
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const jobs = data.jobs || [];

        if (config.variableName) {
            variableManager.set(config.variableName, jobs);
        }

        console.log(`[CronList] Found ${jobs.length} active jobs`);
        return { success: true, jobs, count: jobs.length };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out after 10 seconds');
        }
        console.error('[CronList] Error:', error);
        throw new Error(`Cron list failed: ${error.message}`);
    }
}

/**
 * Execute BROWSER_SCRAPE node
 * Scrapes a website using the backend headless browser
 */
export async function executeBrowserScrape(
    config: BrowserScrapeConfig,
    variableManager: VariableManager
): Promise<any> {
    const rawUrl = variableManager.resolveString(config.url);
    const url = normalizeTargetUrl(rawUrl);
    const waitForSelector = config.waitForSelector ? variableManager.resolveString(config.waitForSelector) : undefined;
    const selector = config.selector ? variableManager.resolveString(config.selector) : undefined;
    const extract = (config.extract || 'text') as 'text' | 'html' | 'list' | 'clean_text' | 'smart_data';
    const preWaitMs = Number.isFinite(Number(config.preWaitMs))
        ? Math.max(0, Math.min(Math.round(Number(config.preWaitMs)), 30000))
        : undefined;
    const scrollSteps = Number.isFinite(Number(config.scrollSteps))
        ? Math.max(0, Math.min(Math.round(Number(config.scrollSteps)), 10))
        : undefined;
    const scrollDelayMs = Number.isFinite(Number(config.scrollDelayMs))
        ? Math.max(100, Math.min(Math.round(Number(config.scrollDelayMs)), 5000))
        : undefined;

    if (!url) {
        throw new Error('Scraping URL bos olamaz');
    }
    if (String(rawUrl || '').trim() !== url) {
        console.log('[BrowserScrape] Normalized URL with https:', url);
    }
    console.log('[BrowserScrape] Scraping URL:', url);

    try {
        const { url: configuredBackendUrl, key: AUTH_KEY } = await getBackendConfig();
        const fallbackBackendUrl = normalizeBackendBaseUrl(DEFAULT_BACKEND_URL);
        const backendCandidates =
            configuredBackendUrl === fallbackBackendUrl
                ? [configuredBackendUrl]
                : [configuredBackendUrl, fallbackBackendUrl];

        let response: any = null;
        let usedBackendUrl = configuredBackendUrl;

        for (let i = 0; i < backendCandidates.length; i++) {
            const backendUrl = backendCandidates[i];
            const canFallback = i === 0 && backendCandidates.length > 1;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for scraping

            try {
                const candidateResponse = await fetch(`${backendUrl}/browser/scrape`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-key': AUTH_KEY,
                    },
                    body: JSON.stringify({
                        url,
                        waitForSelector,
                        selector,
                        extract,
                        preWaitMs,
                        scrollSteps,
                        scrollDelayMs,
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!candidateResponse.ok) {
                    let backendError = `Backend error: ${candidateResponse.status} ${candidateResponse.statusText}`;
                    try {
                        const errorPayload = await candidateResponse.json();
                        if (errorPayload?.error) {
                            backendError = `Backend error: ${candidateResponse.status} ${errorPayload.error}`;
                        }
                    } catch {
                        // keep default error string
                    }
                    throw new Error(backendError);
                }

                response = candidateResponse;
                usedBackendUrl = backendUrl;

                if (backendUrl !== configuredBackendUrl) {
                    console.warn(`[BrowserScrape] Primary backend failed, fallback used: ${backendUrl}`);
                }
                break;
            } catch (requestError: any) {
                clearTimeout(timeoutId);

                if (requestError?.name === 'AbortError') {
                    throw requestError;
                }

                if (canFallback && isLikelyNetworkError(requestError)) {
                    console.warn(`[BrowserScrape] Backend unreachable (${backendUrl}), retrying fallback ${fallbackBackendUrl}`);
                    continue;
                }

                throw requestError;
            }
        }

        if (!response) {
            throw new Error('Backend scrape request failed');
        }

        const payload = await response.json();
        const result = unwrapScrapeEnvelope(payload);
        const empty = isEmptyScrapeValue(result);
        const payloadMeta =
            payload && typeof payload === 'object' && !Array.isArray(payload) && hasOwnKey(payload, 'meta')
                ? payload.meta
                : undefined;
        const meta =
            payloadMeta && typeof payloadMeta === 'object'
                ? { ...payloadMeta, backendUrl: usedBackendUrl }
                : { backendUrl: usedBackendUrl };

        if (empty) {
            console.warn('[BrowserScrape] Scrape completed but returned empty data', {
                url,
                waitForSelector,
                selector,
                extract,
            });
        }

        // Store result in the configured variable name
        if (config.variableName) {
            variableManager.set(config.variableName, result);
        }

        return {
            success: true,
            data: result,
            empty,
            warning: empty ? 'Scrape completed but returned empty data' : undefined,
            meta,
        };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Scraping request timed out after 60 seconds');
        }
        console.error('[BrowserScrape] Error:', error);
        throw new Error(`Scraping failed: ${error.message}`);
    }
}

