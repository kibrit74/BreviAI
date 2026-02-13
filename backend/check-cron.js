const fetch = require('node-fetch');

const JOBS_TO_DELETE = [
    'undefined',
    'null'
];

const BACKEND_URL = 'http://136.117.34.89:3001';
const AUTH_KEY = 'breviai-secret-password';

async function checkCron() {
    try {
        console.log('Fetching cron jobs from:', BACKEND_URL);
        const response = await fetch(`${BACKEND_URL}/cron/list`, {
            headers: { 'x-auth-key': AUTH_KEY }
        });

        const data = await response.json();
        console.log('Active Cron Jobs:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkCron();
