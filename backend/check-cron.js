const fetch = require('node-fetch');

const BACKEND_URL = 'http://136.117.34.89:3001';
const AUTH_KEY = 'breviai-secret-password';
const SESSION_ID = process.env.WA_SESSION_ID || '';

async function checkStatus() {
    if (!SESSION_ID) {
        console.error('Missing WA_SESSION_ID env var. Example: WA_SESSION_ID=device_abc123');
        return;
    }

    try {
        console.log('Fetching WhatsApp status from:', BACKEND_URL);
        const response = await fetch(`${BACKEND_URL}/whatsapp/status`, {
            headers: {
                'x-auth-key': AUTH_KEY,
                'x-session-id': SESSION_ID,
            }
        });

        if (!response.ok) {
            console.error('Failed to get status:', response.status);
            return;
        }

        const data = await response.json();
        console.log('WhatsApp Status:', JSON.stringify(data, null, 2));

        if (data.status === 'qr_pending') {
            console.log('\nQR Code is ready. Please scan it.');
        } else if (data.status === 'ready') {
            console.log('\nWhatsApp is connected!');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkStatus();
