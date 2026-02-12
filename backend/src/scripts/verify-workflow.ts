
// import fetch from 'node-fetch'; // Native fetch in Node 18+

async function testGenerate() {
    console.log('Testing /api/generate...');

    try {
        // const apiUrl = 'http://localhost:3000/api/generate';
        const apiUrl = 'https://breviai.vercel.app/api/generate';

        console.log(`Testing ${apiUrl}...`);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-secret': 'breviai-test-secret-12345' // Using the dev secret from route.ts
            },
            body: JSON.stringify({
                prompt: 'Pil %20 altına düştüğünde tasarruf modunu aç',
                user_context: {
                    device_id: 'test-device',
                    installed_apps: ['com.whatsapp']
                }
            })
        });

        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));

        if (data.workflow && Array.isArray(data.workflow.nodes) && Array.isArray(data.workflow.edges)) {
            console.log('✅ SUCCESS: Workflow format received.');
        } else {
            console.error('❌ FAILURE: Invalid workflow format.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testGenerate();
