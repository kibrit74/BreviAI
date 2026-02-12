import { CronCreateConfig, BrowserScrapeConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';

const BACKEND_URL = 'http://136.117.34.89:3001';
const AUTH_KEY = 'breviai-secret-password';

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
 * Execute BROWSER_SCRAPE node
 * Scrapes a website using the backend headless browser
 */
export async function executeBrowserScrape(
    config: BrowserScrapeConfig,
    variableManager: VariableManager
): Promise<any> {
    const url = variableManager.resolveString(config.url);
    const waitForSelector = config.waitForSelector ? variableManager.resolveString(config.waitForSelector) : undefined;

    console.log('[BrowserScrape] Scraping URL:', url);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for scraping

        const response = await fetch(`${BACKEND_URL}/browser/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-key': AUTH_KEY,
            },
            body: JSON.stringify({
                url,
                waitForSelector,
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.data?.result || data;

        // Store result in the configured variable name
        if (config.variableName) {
            variableManager.set(config.variableName, result);
        }

        return { success: true, data: result };
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Scraping request timed out after 60 seconds');
        }
        console.error('[BrowserScrape] Error:', error);
        throw new Error(`Scraping failed: ${error.message}`);
    }
}

