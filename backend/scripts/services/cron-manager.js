const fs = require('fs');
const path = require('path');
const express = require('express');
const cron = require('node-cron');
const whatsappService = require('./whatsapp');
const webhookService = require('./webhook');
const { service: browserService } = require('./browser-service');

const router = express.Router();
const DATA_DIR = path.join(__dirname, '../../.data');
const JOBS_FILE = path.join(DATA_DIR, 'cron-jobs.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════
// Cron Manager Logic
// ═══════════════════════════════════════════════════

class CronManager {
    constructor() {
        this.jobs = new Map(); // id -> { task, config }
        this.loadJobs();
    }

    loadJobs() {
        if (!fs.existsSync(JOBS_FILE)) {
            // Create default file if not exists
            fs.writeFileSync(JOBS_FILE, JSON.stringify([], null, 2));
        }

        try {
            const data = fs.readFileSync(JOBS_FILE, 'utf8');
            const jobConfigs = JSON.parse(data);

            console.log(`[Cron] Loading ${jobConfigs.length} jobs from cron-jobs.json...`);
            jobConfigs.forEach(config => this.scheduleJob(config, false));
        } catch (err) {
            console.error('[Cron] Failed to load jobs:', err);
        }

        // Also auto-load JSON automation files from automations/ folder
        this.loadAutomations();
    }

    loadAutomations() {
        const AUTOMATIONS_DIR = path.join(__dirname, '../../automations');
        if (!fs.existsSync(AUTOMATIONS_DIR)) {
            console.log('[Cron] No automations/ folder found, skipping.');
            return;
        }

        try {
            const files = fs.readdirSync(AUTOMATIONS_DIR).filter(f => f.endsWith('.json'));
            console.log(`[Cron] Found ${files.length} automation files in automations/`);

            for (const file of files) {
                try {
                    const filePath = path.join(AUTOMATIONS_DIR, file);
                    const raw = fs.readFileSync(filePath, 'utf8');
                    const config = JSON.parse(raw);

                    // Skip if already loaded or disabled
                    if (this.jobs.has(config.id)) {
                        console.log(`[Cron] Automation '${config.id}' already loaded, skipping.`);
                        continue;
                    }
                    if (config.enabled === false) {
                        console.log(`[Cron] Automation '${config.id}' is disabled, skipping.`);
                        continue;
                    }
                    if (!config.schedule || !config.action) {
                        console.log(`[Cron] Automation '${config.id}' missing schedule/action, skipping.`);
                        continue;
                    }

                    console.log(`[Cron] Loading automation: ${config.name || config.id} (${file})`);
                    this.scheduleJob(config, false); // false = don't save to cron-jobs.json
                } catch (fileErr) {
                    console.error(`[Cron] Failed to load automation ${file}:`, fileErr.message);
                }
            }
        } catch (err) {
            console.error('[Cron] Failed to read automations folder:', err);
        }
    }

    saveJobs() {
        const configs = [];
        for (const [id, job] of this.jobs) {
            configs.push(job.config);
        }
        fs.writeFileSync(JOBS_FILE, JSON.stringify(configs, null, 2));
    }

    scheduleJob(config, save = true) {
        // Cancel existing if valid
        if (this.jobs.has(config.id)) {
            this.jobs.get(config.id).task.stop();
        }

        console.log(`[Cron] Scheduling job '${config.id}' at '${config.schedule}'`);

        // Create Cron Task
        const task = cron.schedule(config.schedule, async () => {
            console.log(`[Cron] Executing job '${config.id}'...`);
            try {
                const result = await this.executeAction(config.action);
                console.log(`[Cron] Job '${config.id}' success:`, result);

                // Notify via Webhook
                webhookService.sendCronResult(config.id, { success: true, ...result });

            } catch (err) {
                console.error(`[Cron] Job '${config.id}' failed:`, err);
                webhookService.sendCronResult(config.id, { success: false, error: err.message });
            }
        });

        this.jobs.set(config.id, { task, config });
        if (save) this.saveJobs();
        return { success: true, message: `Job '${config.id}' scheduled` };
    }

    deleteJob(id) {
        if (this.jobs.has(id)) {
            this.jobs.get(id).task.stop();
            this.jobs.delete(id);
            this.saveJobs();
            return true;
        }
        return false;
    }

    async executeAction(action) {
        if (!action) throw new Error('No action defined');
        const resolvedSessionId = action.sessionId || process.env.WA_DEFAULT_SESSION_ID;

        switch (action.type) {
            case 'whatsapp_send':
                // { type: 'whatsapp_send', phone: 'number', message: 'text', sessionId?: '...' }
                if (!resolvedSessionId) {
                    throw new Error("sessionId required for whatsapp_send action");
                }
                return await whatsappService.sendMessage(
                    action.phone,
                    action.message,
                    resolvedSessionId
                );

            case 'browser_scrape':
                return await browserService.scrape(action.url, action.selector);

            case 'webhook_trigger':
                // Just triggers the completion webhook, effectively
                return { triggered: true };

            case 'workflow':
                // Virtual action for mobile app triggers
                // The app should listen to the 'cron_result' webhook or poll logs
                return { triggered: true, payload: action };

            case 'scrape_and_whatsapp':
                // { type: 'scrape_and_whatsapp', url: '...', selector: '...', phone: '...', message: '...' }
                try {
                    if (!resolvedSessionId) {
                        throw new Error("sessionId required for scrape_and_whatsapp action");
                    }
                    console.log(`[Cron] Scrape & Send: ${action.url} -> ${action.phone}`);
                    const scrapeResult = await browserService.scrape(action.url, action.selector);

                    // Simple template replacement
                    let msg = action.message || 'Scraped Data: {{data}}';
                    // Limit data length to avoid giant messages
                    const cleanData = (typeof scrapeResult === 'string' ? scrapeResult : JSON.stringify(scrapeResult)).substring(0, 2000);
                    msg = msg.replace('{{data}}', cleanData);

                    // Resolve date/time templates
                    const now = new Date();
                    msg = msg.replace(/\{\{_date\}\}/g, now.toLocaleDateString('tr-TR'));
                    msg = msg.replace(/\{\{_time\}\}/g, now.toLocaleTimeString('tr-TR'));

                    return await whatsappService.sendMessage(
                        action.phone,
                        msg,
                        resolvedSessionId
                    );
                } catch (err) {
                    console.error('[Cron] Scrape & Send failed:', err);
                    throw err;
                }

            // ═══════════════════════════════════════════════════
            // MCP Tool Actions (Model Context Protocol)
            // ═══════════════════════════════════════════════════

            case 'mcp_call': {
                // { type: 'mcp_call', tool: 'breviai.slack.send_message', args: { token: '...', channel: '...', text: '...' } }
                const fetchMcp = require('node-fetch');
                const MCP_URL = process.env.BACKEND_URL || 'http://localhost:3000';
                const MCP_SECRET = process.env.APP_SECRET || '';
                console.log(`[Cron] MCP call: ${action.tool}`);
                const mcpResp = await fetchMcp(`${MCP_URL}/api/mcp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-app-secret': MCP_SECRET,
                    },
                    body: JSON.stringify({
                        action: 'call_tool',
                        toolName: action.tool,
                        args: action.args || {},
                    }),
                });
                const mcpData = await mcpResp.json();
                return { tool: action.tool, result: mcpData };
            }

            case 'multi_mcp': {
                // { type: 'multi_mcp', steps: [ { tool: '...', args: {...} }, ... ] }
                const fetchMulti = require('node-fetch');
                const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';
                const SECRET = process.env.APP_SECRET || '';
                const results = [];
                const variables = {};

                function replaceVars(obj, vars) {
                    if (typeof obj === 'string') {
                        let str = obj;
                        const now = new Date();
                        str = str.replace(/\{\{_date\}\}/g, now.toLocaleDateString('tr-TR'));
                        str = str.replace(/\{\{_time\}\}/g, now.toLocaleTimeString('tr-TR'));

                        return str.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
                            const keys = varName.split('.');
                            let val = vars;
                            for (const k of keys) {
                                if (val && typeof val === 'object') { val = val[k]; }
                                else { val = undefined; break; }
                            }
                            if (val !== undefined) {
                                return typeof val === 'object' ? JSON.stringify(val) : String(val);
                            }
                            return match;
                        });
                    } else if (Array.isArray(obj)) {
                        return obj.map(item => replaceVars(item, vars));
                    } else if (obj !== null && typeof obj === 'object') {
                        const newObj = {};
                        for (const [k, v] of Object.entries(obj)) {
                            newObj[k] = replaceVars(v, vars);
                        }
                        return newObj;
                    }
                    return obj;
                }

                for (const step of (action.steps || [])) {
                    console.log(`[Cron] Multi-MCP step: ${step.tool}`);
                    const resolvedArgs = replaceVars(step.args || {}, variables);

                    const stepResp = await fetchMulti(`${BASE_URL}/api/mcp`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-app-secret': SECRET,
                        },
                        body: JSON.stringify({
                            action: 'call_tool',
                            toolName: step.tool,
                            args: resolvedArgs,
                        }),
                    });

                    const stepResult = await stepResp.json();
                    results.push({ tool: step.tool, result: stepResult });

                    let textValue = '';
                    if (stepResult.content && stepResult.content.length > 0) {
                        const textContent = stepResult.content.find(c => c.type === 'text');
                        if (textContent) textValue = textContent.text;
                        else {
                            const jsonContent = stepResult.content.find(c => c.type === 'json');
                            if (jsonContent) textValue = JSON.stringify(jsonContent.json);
                        }
                    } else if (stepResult.result && stepResult.result.content) {
                        const contentArr = stepResult.result.content;
                        const textContent = contentArr.find(c => c.type === 'text');
                        if (textContent) textValue = textContent.text;
                    } else if (typeof stepResult.result === 'string') {
                        textValue = stepResult.result;
                    }

                    const varName = resolvedArgs.variableName || step.id;
                    if (varName) {
                        variables[varName] = textValue;
                    }
                    if (step.tool === 'breviai.google.calendar_list') {
                        variables['events'] = textValue || 'Etkinlik yok';
                    }
                    if (step.tool === 'breviai.google.gmail_read') {
                        variables['emails'] = textValue || 'Mail yok';
                    }
                }
                return { steps: results, variables };
            }

            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }
}

const manager = new CronManager();

// ═══════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════

router.get('/list', (req, res) => {
    const jobs = [];
    for (const [id, job] of manager.jobs) {
        jobs.push(job.config);
    }
    res.json({ jobs });
});

router.post('/create', (req, res) => {
    const config = req.body;
    // Basic validation
    if (!config.id || !config.schedule || !config.action) {
        return res.status(400).json({ error: 'Missing id, schedule, or action' });
    }

    // Validate cron syntax
    if (!cron.validate(config.schedule)) {
        return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const result = manager.scheduleJob(config);
    res.json(result);
});

router.delete('/delete/:id', (req, res) => {
    const success = manager.deleteJob(req.params.id);
    if (success) {
        res.json({ success: true, id: req.params.id });
    } else {
        res.status(404).json({ error: 'Job not found' });
    }
});

router.post('/trigger/:id', async (req, res) => {
    const job = manager.jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    try {
        console.log(`[Cron] Manually triggering job '${req.params.id}'...`);
        const result = await manager.executeAction(job.config.action);
        res.json({ success: true, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = {
    router,
    manager
};
