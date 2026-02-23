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
        const automationDirs = [
            path.join(__dirname, '../../automations'),
            path.join(__dirname, '../../../otomasyonlar'),
        ];

        let foundAnyDir = false;

        for (const automationDir of automationDirs) {
            if (!fs.existsSync(automationDir)) {
                continue;
            }
            foundAnyDir = true;

            try {
                const files = fs.readdirSync(automationDir).filter(f => f.endsWith('.json'));
                console.log(`[Cron] Found ${files.length} automation files in ${automationDir}`);

                for (const file of files) {
                    try {
                        const filePath = path.join(automationDir, file);
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
                console.error(`[Cron] Failed to read automations folder ${automationDir}:`, err);
            }
        }

        if (!foundAnyDir) {
            console.log('[Cron] No automation folders found, skipping.');
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
                        arguments: action.args || {},
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

                const localStepTools = new Set([
                    'agent_ai',
                    'browser_scrape',
                    'whatsapp_send',
                    'speak_text',
                    'webhook_trigger',
                ]);

                function extractJsonFromText(text) {
                    if (typeof text !== 'string') return null;
                    const trimmed = text.trim();
                    const start = trimmed.indexOf('{');
                    const end = trimmed.lastIndexOf('}');
                    if (start === -1 || end === -1 || end <= start) return null;
                    try {
                        return JSON.parse(trimmed.slice(start, end + 1));
                    } catch {
                        return null;
                    }
                }

                async function executeLocalMultiStep(toolName, args) {
                    switch (toolName) {
                        case 'browser_scrape':
                            return await browserService.scrape(args.url, args.selector);

                        case 'whatsapp_send': {
                            const phone = args.phone || args.phoneNumber;
                            const message = args.message || '';
                            const sessionId = args.sessionId || resolvedSessionId;
                            if (!phone) throw new Error('whatsapp_send step requires phone/phoneNumber');
                            if (!sessionId) throw new Error('sessionId required for whatsapp_send step');
                            return await whatsappService.sendMessage(phone, message, sessionId);
                        }

                        case 'speak_text':
                            // Server-side cron runner has no device speaker. Keep the step non-fatal and expose text.
                            return {
                                simulated: true,
                                text: args.text || '',
                                language: args.language || 'tr-TR',
                                note: 'speak_text is not available on backend cron runner',
                            };

                        case 'webhook_trigger':
                            return { triggered: true, payload: args || {} };

                        case 'agent_ai': {
                            const provider = String(args.provider || 'gemini').toLowerCase();
                            if (provider !== 'gemini') {
                                throw new Error(`agent_ai local step only supports provider=gemini (got: ${provider})`);
                            }

                            const prompt = String(args.prompt || '').trim();
                            if (!prompt) {
                                throw new Error('agent_ai step requires prompt');
                            }

                            const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
                            if (!apiKey) {
                                throw new Error('GEMINI_API_KEY (or GOOGLE_API_KEY) is required for agent_ai step');
                            }

                            const { GoogleGenerativeAI } = require('@google/generative-ai');
                            const genAI = new GoogleGenerativeAI(apiKey);
                            const preferredModel = String(args.model || 'gemini-2.5-flash');
                            const fallbackModel = 'gemini-2.0-flash';
                            const outputFormat = String(args.outputFormat || 'text').toLowerCase();
                            const generationConfig = {
                                temperature: Number.isFinite(Number(args.temperature))
                                    ? Number(args.temperature)
                                    : 0.3,
                                maxOutputTokens: Number.isFinite(Number(args.maxTokens))
                                    ? Number(args.maxTokens)
                                    : 2048,
                            };

                            async function runModel(modelName) {
                                const model = genAI.getGenerativeModel({
                                    model: modelName,
                                    generationConfig: outputFormat === 'json'
                                        ? { ...generationConfig, responseMimeType: 'application/json' }
                                        : generationConfig,
                                });
                                const response = await model.generateContent(prompt);
                                return response.response.text();
                            }

                            let text;
                            try {
                                text = await runModel(preferredModel);
                            } catch (primaryErr) {
                                if (preferredModel !== fallbackModel) {
                                    console.warn(`[Cron] agent_ai fallback to ${fallbackModel}:`, primaryErr.message);
                                    text = await runModel(fallbackModel);
                                } else {
                                    throw primaryErr;
                                }
                            }

                            if (outputFormat === 'json') {
                                const parsed = extractJsonFromText(text);
                                if (parsed !== null) {
                                    return parsed;
                                }
                            }

                            return text;
                        }

                        default:
                            throw new Error(`Unsupported local multi_mcp step tool: ${toolName}`);
                    }
                }

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
                    let stepResult;

                    if (localStepTools.has(step.tool)) {
                        const localResult = await executeLocalMultiStep(step.tool, resolvedArgs);
                        stepResult = { result: localResult };
                    } else {
                        const stepResp = await fetchMulti(`${BASE_URL}/api/mcp`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-app-secret': SECRET,
                            },
                            body: JSON.stringify({
                                action: 'call_tool',
                                toolName: step.tool,
                                arguments: resolvedArgs,
                            }),
                        });

                        stepResult = await stepResp.json();
                    }
                    results.push({ tool: step.tool, result: stepResult });

                    let storedValue;
                    let textValue = '';

                    if (stepResult.content && stepResult.content.length > 0) {
                        const jsonContent = stepResult.content.find(c => c.type === 'json');
                        if (jsonContent && jsonContent.json !== undefined) {
                            storedValue = jsonContent.json;
                            textValue = JSON.stringify(jsonContent.json);
                        } else {
                            const textContent = stepResult.content.find(c => c.type === 'text');
                            if (textContent) {
                                storedValue = textContent.text;
                                textValue = textContent.text;
                            }
                        }
                    } else if (stepResult.result && stepResult.result.content) {
                        const contentArr = stepResult.result.content;
                        const jsonContent = contentArr.find(c => c.type === 'json');
                        if (jsonContent && jsonContent.json !== undefined) {
                            storedValue = jsonContent.json;
                            textValue = JSON.stringify(jsonContent.json);
                        } else {
                            const textContent = contentArr.find(c => c.type === 'text');
                            if (textContent) {
                                storedValue = textContent.text;
                                textValue = textContent.text;
                            }
                        }
                    } else if (typeof stepResult.result === 'string') {
                        storedValue = stepResult.result;
                        textValue = stepResult.result;
                    } else if (stepResult.result !== undefined) {
                        storedValue = stepResult.result;
                        textValue = typeof stepResult.result === 'object'
                            ? JSON.stringify(stepResult.result)
                            : String(stepResult.result);
                    }

                    // If the step explicitly requested JSON but returned JSON text, parse it so dot-access works.
                    if (resolvedArgs.outputFormat === 'json' && typeof storedValue === 'string') {
                        const trimmed = storedValue.trim();
                        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                            try {
                                storedValue = JSON.parse(trimmed);
                            } catch (e) {
                                // Keep original string if parsing fails
                            }
                        }
                    }

                    const finalValue = storedValue !== undefined ? storedValue : textValue;
                    const varName = resolvedArgs.variableName || step.id;
                    if (varName) {
                        variables[varName] = finalValue;
                    }
                    if (step.tool === 'breviai.google.calendar_list') {
                        variables['events'] = finalValue || 'Etkinlik yok';
                    }
                    if (step.tool === 'breviai.google.gmail_read') {
                        variables['emails'] = finalValue || 'Mail yok';
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
