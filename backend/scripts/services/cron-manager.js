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
            return;
        }

        try {
            const data = fs.readFileSync(JOBS_FILE, 'utf8');
            const jobConfigs = JSON.parse(data);

            console.log(`[Cron] Loading ${jobConfigs.length} jobs...`);
            jobConfigs.forEach(config => this.scheduleJob(config, false));
        } catch (err) {
            console.error('[Cron] Failed to load jobs:', err);
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

        switch (action.type) {
            case 'whatsapp_send':
                // { type: 'whatsapp_send', phone: 'number', message: 'text' }
                return await whatsappService.sendMessage(action.phone, action.message);

            case 'browser_scrape':
                return await browserService.scrape(action.url, action.selector);

            case 'webhook_trigger':
                // Just triggers the completion webhook, effectively
                return { triggered: true };

            case 'workflow':
                // Virtual action for mobile app triggers
                // The app should listen to the 'cron_result' webhook or poll logs
                return { triggered: true, payload: action };

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
