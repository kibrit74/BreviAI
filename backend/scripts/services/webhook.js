// BreviAI Webhook Service
// Sends notifications/data back to the mobile app or other endpoints

const fetch = require('node-fetch'); // Ensure node-fetch is available (built-in in Node 18+)

class WebhookService {
    constructor() {
        this.webhookUrl = process.env.WA_WEBHOOK_URL;
    }

    async send(event, data) {
        if (!this.webhookUrl) {
            console.log(`[Webhook] No webhook URL configured. Event '${event}' skipped.`);
            return false;
        }

        try {
            console.log(`[Webhook] Sending '${event}' to ${this.webhookUrl}`);
            const payload = {
                event,
                timestamp: Date.now(),
                data
            };

            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return true;
        } catch (error) {
            console.error('[Webhook] Failed to send webhook:', error.message);
            return false;
        }
    }

    // Specialized method for WhatsApp messages
    async sendWhatsAppMessage(msg) {
        return this.send('whatsapp_message', {
            from: msg.from,
            body: msg.body,
            timestamp: msg.timestamp,
            hasMedia: msg.hasMedia,
            type: msg.type,
            notifyName: msg._data?.notifyName
        });
    }

    // Notify about Cron Job completion
    async sendCronResult(jobId, result) {
        return this.send('cron_result', {
            jobId,
            result
        });
    }
}

module.exports = new WebhookService();
