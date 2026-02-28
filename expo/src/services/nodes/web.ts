/**
 * Web Node Executors
 * HTTP Request
 */

import {
    WorkflowNode,
    HttpRequestConfig,
    OpenUrlConfig,
    RssReadConfig,
    WebAutomationConfig,
    BrowserScrapeConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { interactionService } from '../InteractionService';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { XMLParser } from 'fast-xml-parser';

export async function executeHttpRequest(
    config: HttpRequestConfig,
    variableManager: VariableManager,
    signal?: AbortSignal
): Promise<any> {
    const start = Date.now();
    try {
        let url = variableManager.resolveString(config.url).trim();

        console.log('[HTTP_REQUEST] Original URL:', config.url);
        console.log('[HTTP_REQUEST] Resolved URL:', url);

        if (!url) {
            return { success: false, error: 'URL boş olamaz' };
        }

        const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url);
        if (!hasScheme) {
            url = url.startsWith('//') ? `https:${url}` : `https://${url}`;
            console.log('[HTTP_REQUEST] Normalized URL with https:', url);
        }

        // --- RUNTIME PATCH: Redirect Placeholder APIs to Local DB ---
        // @deprecated Bu yama, eski workflow'lar için geçici bir çözümdür. Eski workflow'lar migrate edilince kaldırılmalıdır.
        // Fixes legacy workflows where AI generated 'myapi.com' instead of DB_WRITE
        if (url.includes('myapi.com') || url.includes('api.example.com') || url.includes('your-api.com')) {
            console.warn(`[HTTP_REQUEST] ⚠️ DEPRECATION WARNING: Placeholder API detected (${url}). Bu özellik gelecek sürümde kaldırılacak. Lütfen iş akışını DB_WRITE düğümü kullanacak şekilde güncelleyin.`);

            try {
                // Dynamic import to avoid circular dependencies
                const { executeDatabaseWrite } = await import('./database');

                return await executeDatabaseWrite({
                    id: 'redirected_request',
                    type: 'DB_WRITE',
                    desc: 'Redirected from HTTP_REQUEST',
                    position: { x: 0, y: 0 },
                    label: 'Redirected DB Write',
                    config: {
                        tableName: 'saved_requests', // Default table for redirected requests
                        operation: 'insert',
                        data: config.body || '{}',
                        variableName: config.variableName
                    }
                } as any, variableManager);

            } catch (dbError) {
                console.error('[HTTP_REQUEST] Redirect to DB failed:', dbError);
                // If DB fails, return a mock success so workflow doesn't crash
                return {
                    success: true,
                    status: 200,
                    data: { message: "Mock success (Redirected)", originalBody: config.body },
                    mocked: true
                };
            }
        }
        // -----------------------------------------------------------

        // 1. Query Parameters
        if (config.queryParameters) {
            const queryParts: string[] = [];
            for (const [key, value] of Object.entries(config.queryParameters)) {
                const resolvedValue = variableManager.resolveString(value);
                queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(resolvedValue)}`);
            }
            if (queryParts.length > 0) {
                const separator = url.includes('?') ? '&' : '?';
                url += separator + queryParts.join('&');
            }
        }

        // 2. Timeout (default 30s or custom)
        const timeoutMs = config.timeout || 30000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const options: RequestInit = {
            method: config.method || 'GET',
            signal: signal || controller.signal, // Priority to workflow signal
        };

        // 3. Headers & Authentication
        const userAgent = config.userAgent || 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36';

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': userAgent,
            'Accept': 'application/json, text/plain, */*'
        };

        // Custom Headers
        // Custom Headers
        if (config.headers) {
            if (typeof config.headers === 'object') {
                // It is already an object (from JSON template)
                for (const [key, value] of Object.entries(config.headers)) {
                    headers[key] = variableManager.resolveString(String(value));
                }
            } else {
                try {
                    const headersStr = variableManager.resolveString(config.headers);
                    // Check if it's a JSON string
                    if (headersStr.trim().startsWith('{')) {
                        const customHeaders = JSON.parse(headersStr);
                        Object.assign(headers, customHeaders);
                    } else {
                        // Maybe it's just a raw string? ambiguous. 
                        // But previous code assumed JSON parse.
                        const customHeaders = JSON.parse(headersStr);
                        Object.assign(headers, customHeaders);
                    }
                } catch (e) {
                    // Try simple key:value if not JSON, otherwise fail safely
                    console.warn("Invalid Header JSON", e);
                }
            }
        }

        // Authentication
        if (config.authentication) {
            if (config.authentication.type === 'basic') {
                const username = variableManager.resolveString(config.authentication.username || '');
                const password = variableManager.resolveString(config.authentication.password || '');
                // Basic Auth encoding
                const token = btoa(`${username}:${password}`);
                headers['Authorization'] = `Basic ${token}`; // Note: btoa is available in RN
            } else if (config.authentication.type === 'bearer') {
                const token = variableManager.resolveString(config.authentication.token || '');
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        options.headers = headers;

        // Add body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase() || '') && config.body) {
            options.body = variableManager.resolveString(config.body);
        }

        try {
            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            const contentType = response.headers.get('content-type');

            // Extract response headers
            const responseHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            let data: any;
            if (contentType?.includes('application/json')) {
                try {
                    data = await response.json();
                } catch {
                    data = await response.text();
                }
            } else if (contentType?.includes('application/pdf') || contentType?.includes('image/') || contentType?.includes('application/octet-stream')) {
                // Handle Binary Data: Convert to Base64 Data URI to preserve integrity
                try {
                    const blob = await response.blob();
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            if (typeof reader.result === 'string') resolve(reader.result);
                            else reject(new Error('FileReader result was not a string'));
                        };
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(blob);
                    });
                    data = base64; // e.g., "data:application/pdf;base64,JVBERi0..."
                    console.log(`[HTTP_REQUEST] Binary content handled: ${contentType}, length: ${data.length}`);
                } catch (e) {
                    console.warn('[HTTP_REQUEST] Failed to convert blob to base64, falling back to text', e);
                    data = await response.text();
                }
            } else {
                data = await response.text();
            }

            const duration = Date.now() - start;

            const result = {
                status: response.status,
                ok: response.ok,
                data,
                headers: responseHeaders,
                duration,
            };

            variableManager.set(config.variableName, result);

            return {
                success: response.ok,
                ...result,
            };
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            const isTimeout = fetchError.name === 'AbortError' || fetchError.message?.includes('Aborted');

            let errorMessage = isTimeout
                ? '⏳ İstek zaman aşımına uğradı (Timeout)'
                : (fetchError instanceof Error ? fetchError.message : 'Bağlantı hatası');

            if (errorMessage.includes('Network request failed')) {
                errorMessage = `Ag/DNS baglanti hatasi. URL veya alan adi gecersiz olabilir: ${url}`;
            } else if (errorMessage.includes('SSL')) {
                errorMessage = "🔒 Güvenli Bağlantı (SSL) Hatası!";
            }

            const errorResult = {
                success: false,
                error: errorMessage,
                duration: Date.now() - start,
            };
            variableManager.set(config.variableName, errorResult);
            return errorResult;
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'HTTP isteği başlatılamadı',
        };
    }
}

export async function executeOpenUrl(
    config: OpenUrlConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const rawUrl = variableManager.resolveString(config.url).trim();
        if (!rawUrl) {
            return { success: false, error: 'URL boş olamaz' };
        }

        const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawUrl);
        const normalizedUrl = hasScheme ? rawUrl : `https://${rawUrl}`;
        const addedHttpsPrefix = normalizedUrl !== rawUrl;

        const canOpen = await Linking.canOpenURL(normalizedUrl);
        if (!canOpen) {
            return { success: false, error: 'Bu URL açılamıyor: ' + normalizedUrl };
        }

        const preferInApp = !config.openExternal;
        if (preferInApp) {
            try {
                await WebBrowser.openBrowserAsync(normalizedUrl);
                return {
                    success: true,
                    url: normalizedUrl,
                    method: 'web_browser',
                    openedInApp: true,
                    note: addedHttpsPrefix ? 'Added https prefix' : undefined,
                };
            } catch (browserError) {
                console.warn('WebBrowser failed, falling back to Linking', browserError);
            }
        }

        await Linking.openURL(normalizedUrl);
        return {
            success: true,
            url: normalizedUrl,
            method: preferInApp ? 'linking_external_fallback' : 'linking_external',
            openedInApp: false,
            note: addedHttpsPrefix ? 'Added https prefix' : undefined,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Tarayıcı açılamadı',
        };
    }
}
export async function executeRssRead(
    config: RssReadConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const url = variableManager.resolveString(config.url);
        if (!url) return { success: false, error: 'URL boş' };

        // Fetch RSS
        const response = await fetch(url);
        if (!response.ok) throw new Error(`RSS alınamadı: ${response.status}`);
        const text = await response.text();

        // Parse XML
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        const jsonObj = parser.parse(text);

        let items: any[] = [];

        // Handle RSS 2.0
        if (jsonObj.rss?.channel?.item) {
            items = Array.isArray(jsonObj.rss.channel.item)
                ? jsonObj.rss.channel.item
                : [jsonObj.rss.channel.item];
        }
        // Handle Atom
        else if (jsonObj.feed?.entry) {
            items = Array.isArray(jsonObj.feed.entry)
                ? jsonObj.feed.entry
                : [jsonObj.feed.entry];
        }

        // Limit
        const limit = config.limit || 5;
        const normalizedItems = items.slice(0, limit).map(item => ({
            title: item.title,
            link: item.link || item.link?.['@_href'],
            description: item.description || item.summary,
            pubDate: item.pubDate || item.published
        }));

        if (config.variableName) {
            variableManager.set(config.variableName, normalizedItems);
        }

        return { success: true, count: normalizedItems.length, items: normalizedItems };

    } catch (error) {
        return { success: false, error: 'RSS okuma hatası: ' + error };
    }
}

type WebAutomationAction = WebAutomationConfig['actions'][number];
type WebAutomationMode = 'script' | 'interactive' | 'smart';
type WebAutomationStepStatus = 'ok' | 'error' | 'skipped';
type WebAutomationExecutorKind = 'interaction_modal' | 'fallback_browser_scrape';

interface WebAutomationStepResult {
    id: string;
    type: string;
    status: WebAutomationStepStatus;
    durationMs: number;
    selector?: string;
    variableName?: string;
    note?: string;
    error?: string;
}

interface NormalizedWebAutomationResult {
    success: boolean;
    data: Record<string, any>;
    steps: WebAutomationStepResult[];
    warnings: string[];
    error?: string;
    finalUrl?: string;
    executor: WebAutomationExecutorKind;
}

const WEB_AUTOMATION_FALLBACK_MAX_WAIT_MS = 30000;
const WEB_AUTOMATION_FALLBACK_SCROLL_DELAY_MS = 800;

function resolveWebAutomationMode(config: WebAutomationConfig): WebAutomationMode {
    const mode = String(config.mode || '').trim().toLowerCase();
    if (mode === 'interactive' || config.interactive) return 'interactive';
    if (mode === 'smart') return 'smart';
    return 'script';
}

function canUseBrowserScrapeFallback(config: WebAutomationConfig): boolean {
    return resolveWebAutomationMode(config) === 'script';
}

function normalizeWebAutomationActions(
    rawActions: unknown,
    variableManager: VariableManager
): { actions: WebAutomationAction[]; error?: string } {
    if (Array.isArray(rawActions)) {
        return { actions: rawActions as WebAutomationAction[] };
    }

    if (typeof rawActions === 'string') {
        const resolved = variableManager.resolveString(rawActions).trim();
        if (!resolved) {
            return { actions: [] };
        }

        try {
            const parsed = JSON.parse(resolved);
            if (!Array.isArray(parsed)) {
                return {
                    actions: [],
                    error: 'WEB_AUTOMATION actions JSON bir dizi olmalidir.',
                };
            }
            return { actions: parsed as WebAutomationAction[] };
        } catch (error) {
            return {
                actions: [],
                error: `WEB_AUTOMATION actions JSON parse hatasi: ${error instanceof Error ? error.message : 'gecersiz JSON'}`,
            };
        }
    }

    if (rawActions == null) {
        return { actions: [] };
    }

    return {
        actions: [],
        error: 'WEB_AUTOMATION actions alani dizi veya JSON string olmalidir.',
    };
}

function parseWaitMs(rawValue: string | undefined, defaultValue = 1000): number {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return defaultValue;
    return Math.max(0, Math.min(Math.round(parsed), WEB_AUTOMATION_FALLBACK_MAX_WAIT_MS));
}

function parseScrollSteps(rawValue: string | undefined): number {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.min(Math.round(parsed), 10));
}

function resolveBrowserExtractMode(value: string | undefined): BrowserScrapeConfig['extract'] {
    const normalized = (value || '').trim().toLowerCase();
    if (
        normalized === 'html' ||
        normalized === 'list' ||
        normalized === 'clean_text' ||
        normalized === 'smart_data'
    ) {
        return normalized as BrowserScrapeConfig['extract'];
    }
    return 'text';
}

function resolveActionExtractMode(
    action: WebAutomationAction,
    variableManager: VariableManager
): BrowserScrapeConfig['extract'] {
    const rawExtract = (action as any).extract !== undefined
        ? String((action as any).extract)
        : action.value !== undefined
            ? String(action.value)
            : undefined;
    const resolvedExtract = rawExtract ? variableManager.resolveString(rawExtract) : undefined;
    return resolveBrowserExtractMode(resolvedExtract);
}

function normalizeWebAutomationData(rawResult: any): Record<string, any> {
    if (!rawResult || typeof rawResult !== 'object') return {};

    const cloned = { ...(rawResult as Record<string, any>) };
    delete cloned.success;
    delete cloned.error;

    // Compatibility: if result payload is wrapped in `results`, merge them to top level as well.
    const resultMap = cloned.results;
    if (resultMap && typeof resultMap === 'object' && !Array.isArray(resultMap)) {
        return {
            ...(resultMap as Record<string, any>),
            ...cloned,
        };
    }

    return cloned;
}

function normalizeInteractionWebAutomationResult(
    rawResult: any,
    mode: WebAutomationMode
): NormalizedWebAutomationResult {
    const success = Boolean(rawResult?.success);
    const data = normalizeWebAutomationData(rawResult);
    const warnings = Array.isArray(rawResult?.warnings)
        ? rawResult.warnings.map((warning: unknown) => String(warning))
        : [];

    const rawSteps = Array.isArray(rawResult?.steps) ? rawResult.steps : [];
    const parsedSteps: WebAutomationStepResult[] = rawSteps
        .filter((step: any) => step && typeof step === 'object')
        .map((step: any, index: number) => ({
            id: step.id ? String(step.id) : `step_${index + 1}`,
            type: step.type ? String(step.type) : (mode === 'smart' ? 'smart' : 'interaction'),
            status: step.status === 'error' ? 'error' : (step.status === 'skipped' ? 'skipped' : 'ok'),
            durationMs: Number.isFinite(Number(step.durationMs)) ? Math.max(0, Math.round(Number(step.durationMs))) : 0,
            selector: step.selector ? String(step.selector) : undefined,
            variableName: step.variableName ? String(step.variableName) : undefined,
            note: step.note ? String(step.note) : undefined,
            error: step.error ? String(step.error) : undefined,
        }));

    const steps: WebAutomationStepResult[] = parsedSteps.length > 0
        ? parsedSteps
        : [{
            id: 'interaction_1',
            type: mode === 'smart' ? 'smart' : (mode === 'interactive' ? 'interactive' : 'script'),
            status: (success ? 'ok' : 'error') as WebAutomationStepStatus,
            durationMs: 0,
            note: mode === 'interactive' ? 'User driven interaction result.' : 'Interaction modal result.',
            error: !success && rawResult?.error ? String(rawResult.error) : undefined,
        }];

    return {
        success,
        data,
        steps,
        warnings,
        error: !success ? (rawResult?.error ? String(rawResult.error) : 'Web automation failed') : undefined,
        finalUrl: rawResult?.finalUrl ? String(rawResult.finalUrl) : undefined,
        executor: 'interaction_modal',
    };
}

function buildWebAutomationContract(params: {
    success: boolean;
    runId: string;
    mode: WebAutomationMode;
    url: string;
    startedAtMs: number;
    normalized: NormalizedWebAutomationResult;
}) {
    const finishedAtMs = Date.now();
    const reservedTopLevel = new Set([
        'success',
        'runId',
        'nodeType',
        'mode',
        'url',
        'finalUrl',
        'steps',
        'data',
        'meta',
        'warnings',
        'error',
    ]);

    const compatibilityData = Object.entries(params.normalized.data || {}).reduce<Record<string, any>>((acc, [key, value]) => {
        if (!reservedTopLevel.has(key)) {
            acc[key] = value;
        }
        return acc;
    }, {});

    return {
        success: params.success,
        runId: params.runId,
        nodeType: 'WEB_AUTOMATION',
        mode: params.mode,
        url: params.url,
        finalUrl: params.normalized.finalUrl || params.url,
        steps: params.normalized.steps,
        data: params.normalized.data,
        meta: {
            startedAt: new Date(params.startedAtMs).toISOString(),
            finishedAt: new Date(finishedAtMs).toISOString(),
            durationMs: Math.max(0, finishedAtMs - params.startedAtMs),
            retries: 0,
            executor: params.normalized.executor,
            warningCount: params.normalized.warnings.length,
        },
        warnings: params.normalized.warnings.length > 0 ? params.normalized.warnings : undefined,
        error: params.success ? null : (params.normalized.error || 'Web automation failed'),
        ...compatibilityData,
    };
}

async function runWebAutomationBrowserFallback(
    config: WebAutomationConfig,
    variableManager: VariableManager
): Promise<NormalizedWebAutomationResult> {
    const actions: WebAutomationAction[] = Array.isArray(config.actions) ? config.actions : [];
    const steps: WebAutomationStepResult[] = [];
    const warnings: string[] = [];

    const hasUnsupportedActions = actions.some(action => action?.type === 'click' || action?.type === 'type');
    if (hasUnsupportedActions) {
        return {
            success: false,
            data: {},
            steps,
            warnings,
            error: 'Backend scrape fallback sadece scrape/wait/scroll aksiyonlarini destekliyor. Click/Type icin interactive WEB_AUTOMATION kullanin.',
            finalUrl: config.url,
            executor: 'fallback_browser_scrape',
        };
    }

    if (actions.length === 0) {
        return {
            success: false,
            data: {},
            steps,
            warnings,
            error: 'Backend scrape fallback icin actions zorunludur.',
            finalUrl: config.url,
            executor: 'fallback_browser_scrape',
        };
    }

    const { executeBrowserScrape } = await import('./backend');
    const output: Record<string, any> = {};
    const fallbackRunId = Date.now();
    let scrapeCount = 0;
    let pendingWaitMs = 0;
    let pendingScrollSteps = 0;

    for (let index = 0; index < actions.length; index++) {
        const action = actions[index];
        const stepStartedAt = Date.now();
        const actionId = (action as any)?.id ? String((action as any).id) : `a${index + 1}`;

        if (!action?.type) {
            warnings.push(`Action #${index + 1} gecersiz, atlandi.`);
            steps.push({
                id: actionId,
                type: 'unknown',
                status: 'skipped',
                durationMs: Date.now() - stepStartedAt,
                note: 'Action type gecersiz oldugu icin atlandi.',
            });
            continue;
        }

        if (action.type === 'wait') {
            const waitValue = action.value ? variableManager.resolveString(String(action.value)) : undefined;
            const waitMs = parseWaitMs(waitValue);
            pendingWaitMs += waitMs;
            steps.push({
                id: actionId,
                type: 'wait',
                status: 'ok',
                durationMs: Date.now() - stepStartedAt,
                note: `Bekleme birikti: +${waitMs}ms`,
            });
            continue;
        }

        if (action.type === 'scroll') {
            const scrollValue = action.value ? variableManager.resolveString(String(action.value)) : undefined;
            const scrollStepCount = parseScrollSteps(scrollValue);
            pendingScrollSteps += scrollStepCount;
            steps.push({
                id: actionId,
                type: 'scroll',
                status: 'ok',
                durationMs: Date.now() - stepStartedAt,
                note: `Kaydirma birikti: +${scrollStepCount} adim`,
            });
            continue;
        }

        if (action.type !== 'scrape') {
            warnings.push(`Action #${index + 1} (${action.type}) fallback modunda desteklenmiyor, atlandi.`);
            steps.push({
                id: actionId,
                type: String(action.type),
                status: 'skipped',
                durationMs: Date.now() - stepStartedAt,
                note: 'Fallback modunda desteklenmeyen action.',
            });
            continue;
        }

        scrapeCount += 1;
        const resolvedVariableName = action.variableName
            ? variableManager.resolveString(String(action.variableName)).trim()
            : '';
        const outputKey = resolvedVariableName || `scrape_${scrapeCount}`;
        const selector = action.selector ? variableManager.resolveString(String(action.selector)) : undefined;
        const extract = resolveActionExtractMode(action, variableManager);
        const tempVariableName = `__web_automation_fallback_${fallbackRunId}_${index}`;

        const scrapeResult = await executeBrowserScrape({
            url: config.url,
            waitForSelector: selector,
            selector,
            extract,
            preWaitMs: pendingWaitMs > 0 ? pendingWaitMs : undefined,
            scrollSteps: pendingScrollSteps > 0 ? pendingScrollSteps : undefined,
            scrollDelayMs: pendingScrollSteps > 0 ? WEB_AUTOMATION_FALLBACK_SCROLL_DELAY_MS : undefined,
            variableName: tempVariableName,
        }, variableManager);

        variableManager.delete(tempVariableName);

        if (!scrapeResult?.success) {
            const stepError = scrapeResult?.error || `Scrape fallback failed at action #${index + 1}`;
            steps.push({
                id: actionId,
                type: 'scrape',
                status: 'error',
                durationMs: Date.now() - stepStartedAt,
                selector,
                variableName: outputKey,
                error: stepError,
            });
            return {
                success: false,
                data: output,
                steps,
                warnings,
                error: stepError,
                finalUrl: config.url,
                executor: 'fallback_browser_scrape',
            };
        }

        output[outputKey] = scrapeResult.data;
        steps.push({
            id: actionId,
            type: 'scrape',
            status: 'ok',
            durationMs: Date.now() - stepStartedAt,
            selector,
            variableName: outputKey,
            note: `extract=${extract}`,
        });

        pendingWaitMs = 0;
        pendingScrollSteps = 0;
    }

    if (scrapeCount === 0) {
        return {
            success: false,
            data: output,
            steps,
            warnings,
            error: 'Backend scrape fallback icin en az bir scrape aksiyonu gerekli.',
            finalUrl: config.url,
            executor: 'fallback_browser_scrape',
        };
    }

    if (pendingWaitMs > 0 || pendingScrollSteps > 0) {
        warnings.push('Sondaki wait/scroll aksiyonlari scrape olmadigi icin etkisiz kaldi.');
    }

    return {
        success: true,
        data: output,
        steps,
        warnings,
        finalUrl: config.url,
        executor: 'fallback_browser_scrape',
    };
}

export async function executeWebAutomation(
    config: WebAutomationConfig,
    variableManager: VariableManager
): Promise<any> {
    const startedAtMs = Date.now();
    const runId = `webrun_${startedAtMs}_${Math.random().toString(36).slice(2, 8)}`;
    const mode = resolveWebAutomationMode(config);

    const persistResultVariable = (result: any) => {
        if (!result?.success || !config.variableName) return;
        const { success, ...data } = result;
        variableManager.set(config.variableName, data);
    };

    const failWithContract = (message: string, executor: WebAutomationExecutorKind = 'interaction_modal') => {
        const failureResult = buildWebAutomationContract({
            success: false,
            runId,
            mode,
            url: config.url,
            startedAtMs,
            normalized: {
                success: false,
                data: {},
                steps: [],
                warnings: [],
                error: message,
                finalUrl: config.url,
                executor,
            },
        });
        return failureResult;
    };

    try {
        const rawUrl = variableManager.resolveString(config.url).trim();
        if (!rawUrl) return failWithContract('URL boş olamaz');

        const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(rawUrl);
        const url = hasScheme
            ? rawUrl
            : (rawUrl.startsWith('//') ? `https:${rawUrl}` : `https://${rawUrl}`);
        if (url !== rawUrl) {
            console.log('[WEB_AUTOMATION] Normalized URL with https:', url);
        }

        const normalizedActionsResult = normalizeWebAutomationActions((config as any).actions, variableManager);
        if (normalizedActionsResult.error) {
            return failWithContract(normalizedActionsResult.error);
        }

        const resolvedActions = normalizedActionsResult.actions
            .filter((action: any) => !!action && typeof action === 'object' && typeof action.type === 'string')
            .map((action: any) => ({
                ...action,
                selector: action.selector !== undefined ? variableManager.resolveString(String(action.selector)) : action.selector,
                value: action.value !== undefined ? variableManager.resolveString(String(action.value)) : action.value,
                extract: action.extract !== undefined ? variableManager.resolveString(String(action.extract)) : action.extract,
                variableName: action.variableName !== undefined ? variableManager.resolveString(String(action.variableName)) : action.variableName,
            })) as WebAutomationAction[];

        const resolvedConfig: WebAutomationConfig = {
            ...config,
            url,
            mode,
            interactive: mode === 'interactive',
            smartGoal: config.smartGoal ? variableManager.resolveString(config.smartGoal) : config.smartGoal,
            actions: resolvedActions,
        };

        if (resolvedConfig.headless && canUseBrowserScrapeFallback(resolvedConfig)) {
            const fallbackResult = await runWebAutomationBrowserFallback(resolvedConfig, variableManager);
            const contractResult = buildWebAutomationContract({
                success: fallbackResult.success,
                runId,
                mode,
                url,
                startedAtMs,
                normalized: fallbackResult,
            });
            persistResultVariable(contractResult);
            return contractResult;
        }

        const result = await interactionService.requestWebAutomation(resolvedConfig);

        // requestWebAutomation returns undefined when no UI interaction handler is registered.
        if (result === undefined && canUseBrowserScrapeFallback(resolvedConfig)) {
            const fallbackResult = await runWebAutomationBrowserFallback(resolvedConfig, variableManager);
            const contractResult = buildWebAutomationContract({
                success: fallbackResult.success,
                runId,
                mode,
                url,
                startedAtMs,
                normalized: fallbackResult,
            });
            persistResultVariable(contractResult);
            return contractResult;
        }

        if (!result) {
            return failWithContract('Kullanıcı işlemi iptal etti veya görünüm kapandı.');
        }

        const normalizedInteractionResult = normalizeInteractionWebAutomationResult(result, mode);
        const contractResult = buildWebAutomationContract({
            success: normalizedInteractionResult.success,
            runId,
            mode,
            url,
            startedAtMs,
            normalized: normalizedInteractionResult,
        });

        persistResultVariable(contractResult);
        return contractResult;

    } catch (error) {
        return failWithContract(error instanceof Error ? error.message : 'Web otomasyon hatası');
    }
}
export async function executeWebSearch(
    config: { query: string; variableName?: string },
    variableManager: VariableManager
): Promise<any> {
    const query = variableManager.resolveString(config.query);
    const variableName = variableManager.resolveString(config.variableName || 'searchResults') || 'searchResults';
    if (!query) return { success: false, error: 'Arama sorgusu boş olamaz' };

    console.log('[WebSearch] Searching via MCP-backed API:', query);

    try {
        // Import apiService dynamically to avoid circular dependency
        const { apiService } = await import('../ApiService');

        const result = await apiService.searchWeb(query);

        if (result.success && result.results) {
            // Store results in variable for AI to access
            variableManager.set(variableName, result.results);

            // Format results as readable text for AI
            const formattedResults = result.results
                .slice(0, 10)
                .map((r, i) => `${i + 1}. ${r.title}${r.snippet ? ` - ${r.snippet}` : ''}\n   URL: ${r.url}`)
                .join('\n\n');

            console.log('[WebSearch] Found', result.resultCount, 'results');

            return {
                success: true,
                query: query,
                variableName,
                resultCount: result.resultCount,
                results: result.results,
                formattedResults: formattedResults,
                message: `${result.resultCount} arama sonucu bulundu.`
            };
        } else {
            return {
                success: false,
                error: result.error || 'Arama başarısız',
                query: query
            };
        }

    } catch (error) {
        console.error('[WebSearch] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Arama yapılırken hata oluştu',
            query: query
        };
    }
}



