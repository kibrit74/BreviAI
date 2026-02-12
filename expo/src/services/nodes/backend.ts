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
    const name = variableManager.resolve(config.name);
    const schedule = variableManager.resolve(config.schedule);
    const actionType = variableManager.resolve(config.actionType || 'log');
    const actionPayload = variableManager.resolve(config.actionPayload || '{}');

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
                name,
                schedule,
                action: {
                    type: actionType,
                    ...JSON.parse(typeof actionPayload === 'string' ? actionPayload : JSON.stringify(actionPayload)),
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
    const url = variableManager.resolve(config.url);
    const waitForSelector = config.waitForSelector ? variableManager.resolve(config.waitForSelector) : undefined;

    console.log('[BrowserScrape] Scraping URL:', url);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for scraping

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

        // Return the text content as the result
        return data.data?.result || data;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Scraping request timed out after 30 seconds');
        }
        console.error('[BrowserScrape] Error:', error);
        throw new Error(`Scraping failed: ${error.message}`);
    }
}
