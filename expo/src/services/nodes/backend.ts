import { CronCreateConfig, BrowserScrapeConfig, CronDeleteConfig, CronListConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';

const BACKEND_URL = 'http://136.109.124.154:3001';
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
    const url = variableManager.resolveString(config.url);
    const waitForSelector = config.waitForSelector ? variableManager.resolveString(config.waitForSelector) : undefined;
    const selector = config.selector ? variableManager.resolveString(config.selector) : undefined;

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
                selector,
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

