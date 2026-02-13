const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const BACKEND_URL = 'http://136.117.34.89:3001';
const AUTH_KEY = 'breviai-secret-password';
// Save to Desktop for easy access
const OUTPUT_PATH = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'whatsapp-qr.png');

async function fetchQR() {
    console.log('Fetching QR code from backend...');
    try {
        const response = await fetch(`${BACKEND_URL}/whatsapp/status`, {
            headers: { 'x-auth-key': AUTH_KEY }
        });

        if (!response.ok) {
            console.error('Failed to get status:', response.status);
            return;
        }

        const data = await response.json();

        if (data.qrCode) {
            // Remove data:image/png;base64, prefix
            const base64Data = data.qrCode.replace(/^data:image\/png;base64,/, "");

            fs.writeFileSync(OUTPUT_PATH, base64Data, 'base64');
            console.log(`\n✅ QR Code saved to: ${OUTPUT_PATH}`);
            console.log('Please open this file and scan it with WhatsApp.');
        } else if (data.status === 'ready') {
            console.log('\n✅ WhatsApp is ALREADY CONNECTED!');
        } else {
            console.log('\n⏳ QR Code not yet ready (server starting?). Retrying in 2 seconds...');
            setTimeout(fetchQR, 2000);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

fetchQR();
