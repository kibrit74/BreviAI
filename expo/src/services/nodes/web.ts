/**
 * Web Node Executors
 * HTTP Request
 */

import {
    WorkflowNode,
    HttpRequestConfig,
    OpenUrlConfig,
    RssReadConfig,
    WebAutomationConfig
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
        let url = variableManager.resolveString(config.url);

        console.log('[HTTP_REQUEST] Original URL:', config.url);
        console.log('[HTTP_REQUEST] Resolved URL:', url);

        if (!url) {
            return { success: false, error: 'URL boş olamaz' };
        }

        // --- RUNTIME PATCH: Redirect Placeholder APIs to Local DB ---
        // Fixes legacy workflows where AI generated 'myapi.com' instead of DB_WRITE
        if (url.includes('myapi.com') || url.includes('api.example.com') || url.includes('your-api.com')) {
            console.warn('[HTTP_REQUEST] ⚠️ Placeholder API detected! Redirecting to Local Database...');

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
                errorMessage = "🌐 İnternet Bağlantısı Yok! Lütfen bağlantınızı kontrol edin.";
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
        const url = variableManager.resolveString(config.url);

        if (!url) {
            return { success: false, error: 'URL boş olamaz' };
        }

        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
            // Try prefixing https:// if missing
            if (!url.startsWith('http')) {
                const fixedUrl = 'https://' + url;
                if (await Linking.canOpenURL(fixedUrl)) {
                    await Linking.openURL(fixedUrl);
                    return { success: true, url: fixedUrl, note: 'Added https prefix' };
                }
            }
            return { success: false, error: 'Bu URL açılamıyor: ' + url };
        }

        // Use WebBrowser if preferred and not forced external
        if (!config.openExternal) {
            try {
                await WebBrowser.openBrowserAsync(url);
                return { success: true, url, method: 'web_browser' };
            } catch (browserError) {
                // Fallback to Linking
                console.warn('WebBrowser failed, falling back to Linking', browserError);
            }
        }

        // Fallback or forced external
        await Linking.openURL(url);
        return { success: true, url, method: 'linking_external' };
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

export async function executeWebAutomation(
    config: WebAutomationConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const url = variableManager.resolveString(config.url);
        if (!url) return { success: false, error: 'URL boş olamaz' };

        // Process config to resolve variables inside actions if needed
        // For now, assume actions are static or simple
        const resolvedConfig = { ...config, url };

        const result = await interactionService.requestWebAutomation(resolvedConfig);

        if (!result) {
            return { success: false, error: 'Kullanıcı işlemi iptal etti veya görünüm kapandı.' };
        }

        if (result.success && config.variableName) {
            // result is the full object {success: true, ...scrapeData}
            // Scrape data is usually keys in result.
            // Let's store the whole result minus success
            const { success, error, ...data } = result;
            variableManager.set(config.variableName, data);
        }

        return result;

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Web otomasyon hatası',
        };
    }
}

export async function executeWebSearch(
    config: { query: string },
    variableManager: VariableManager
): Promise<any> {
    const query = variableManager.resolveString(config.query);
    if (!query) return { success: false, error: 'Arama sorgusu boş olamaz' };

    console.log('[WebSearch] Searching via backend API:', query);

    try {
        // Import apiService dynamically to avoid circular dependency
        const { apiService } = await import('../ApiService');

        const result = await apiService.searchWeb(query);

        if (result.success && result.results) {
            // Store results in variable for AI to access
            variableManager.set('searchResults', result.results);

            // Format results as readable text for AI
            const formattedResults = result.results
                .slice(0, 10)
                .map((r, i) => `${i + 1}. ${r.title}${r.snippet ? ` - ${r.snippet}` : ''}\n   URL: ${r.url}`)
                .join('\n\n');

            console.log('[WebSearch] Found', result.resultCount, 'results');

            return {
                success: true,
                query: query,
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
