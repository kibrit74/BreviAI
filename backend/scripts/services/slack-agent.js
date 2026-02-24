/**
 * BreviAI Slack Agent Service
 * 
 * Slack Bot Events API handler:
 * - Receives Slack messages (app_mention / message events)
 * - Sends them to Gemini AI for processing
 * - Responds back to Slack channel
 * 
 * Setup:
 * 1. Create Slack App at https://api.slack.com/apps
 * 2. Add Bot Token Scopes: chat:write, channels:read, app_mentions:read
 * 3. Enable Event Subscriptions → Request URL: https://your-backend/slack/events
 * 4. Subscribe to bot events: app_mention, message.im
 * 5. Set env vars: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET (optional)
 */

const express = require('express');
const router = express.Router();

// Config
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Track processed event IDs to avoid duplicates (Slack retries)
const processedEvents = new Set();
const MAX_PROCESSED_CACHE = 1000;

// ═══════════════════════════════════════════════════
// Slack Events Endpoint
// ═══════════════════════════════════════════════════

router.post('/events', async (req, res) => {
    const body = req.body;

    // 1. URL Verification Challenge (Slack sends this during setup)
    if (body.type === 'url_verification') {
        console.log('[Slack] URL verification challenge received');
        return res.json({ challenge: body.challenge });
    }

    // 2. Event Callback
    if (body.type === 'event_callback') {
        const event = body.event;
        const eventId = body.event_id;

        // Deduplicate (Slack retries after 3s if no 200)
        if (processedEvents.has(eventId)) {
            return res.sendStatus(200);
        }
        processedEvents.add(eventId);
        if (processedEvents.size > MAX_PROCESSED_CACHE) {
            const first = processedEvents.values().next().value;
            processedEvents.delete(first);
        }

        // Respond 200 immediately (Slack requires <3s response)
        res.sendStatus(200);

        // Process asynchronously
        try {
            await handleSlackEvent(event);
        } catch (err) {
            console.error('[Slack] Event processing error:', err);
        }
        return;
    }

    res.sendStatus(200);
});

// ═══════════════════════════════════════════════════
// Event Handler
// ═══════════════════════════════════════════════════

async function handleSlackEvent(event) {
    // Ignore bot's own messages
    if (event.bot_id || event.subtype === 'bot_message') {
        return;
    }

    // Handle: app_mention or direct message
    const eventType = event.type;
    if (eventType !== 'app_mention' && eventType !== 'message') {
        console.log(`[Slack] Ignoring event type: ${eventType}`);
        return;
    }

    const userText = event.text || '';
    const channel = event.channel;
    const user = event.user;

    // Strip bot mention from text (e.g. "<@U123> what's up" → "what's up")
    const cleanText = userText.replace(/<@[A-Z0-9]+>/g, '').trim();

    if (!cleanText) {
        await sendSlackMessage(channel, '🤖 Merhaba! Size nasıl yardımcı olabilirim?');
        return;
    }

    console.log(`[Slack] Message from ${user} in ${channel}: "${cleanText}"`);

    // Send "typing" indicator
    await sendSlackMessage(channel, '⏳ Düşünüyorum...');

    // Call Gemini AI
    const aiResponse = await callGeminiAI(cleanText, user);

    // Send response back to Slack
    await sendSlackMessage(channel, aiResponse);
    console.log(`[Slack] Responded to ${user} in ${channel}`);
}

// ═══════════════════════════════════════════════════
// Gemini AI Call
// ═══════════════════════════════════════════════════

async function callGeminiAI(prompt, userId) {
    if (!GEMINI_API_KEY) {
        return '⚠️ Gemini API key yapılandırılmamış. Lütfen GEMINI_API_KEY env değişkenini ayarlayın.';
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const systemPrompt = `Sen BreviAI'ın Slack asistanısın. Kullanıcılara kısa, öz ve yardımcı cevaplar ver.
Türkçe konuş. Emoji kullan ama abartma. Slack markdown formatını kullan (*bold*, _italic_, \`code\`).
Eğer bir şeyi bilmiyorsan dürüstçe söyle.
Şu anki tarih/saat: ${new Date().toLocaleString('tr-TR')}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    { role: 'model', parts: [{ text: 'Anladım! Slack üzerinden yardımcı olmaya hazırım.' }] },
                    { role: 'user', parts: [{ text: prompt }] }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Slack AI] Gemini error:', response.status, errorText);
            return `⚠️ AI hatası (${response.status}). Lütfen tekrar deneyin.`;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || '🤷 Cevap üretilemedi.';

    } catch (err) {
        console.error('[Slack AI] Error:', err);
        return `❌ Hata: ${err.message}`;
    }
}

// ═══════════════════════════════════════════════════
// Slack API Helper
// ═══════════════════════════════════════════════════

async function sendSlackMessage(channel, text) {
    if (!SLACK_BOT_TOKEN) {
        console.error('[Slack] SLACK_BOT_TOKEN not configured');
        return;
    }

    try {
        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ channel, text })
        });

        const data = await response.json();
        if (!data.ok) {
            console.error('[Slack] Send failed:', data.error);
        }
    } catch (err) {
        console.error('[Slack] Send error:', err);
    }
}

// Status endpoint
router.get('/status', (req, res) => {
    res.json({
        service: 'slack-agent',
        status: SLACK_BOT_TOKEN ? 'configured' : 'no_token',
        model: GEMINI_MODEL,
        processedEvents: processedEvents.size
    });
});

module.exports = { router };
