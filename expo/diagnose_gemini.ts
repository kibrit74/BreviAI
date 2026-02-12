import { userSettingsService } from './src/services/UserSettingsService';

async function diagnose() {
    console.log('--- Gemini API Diagnostics ---');

    // 1. Get API Key
    await userSettingsService.ensureLoaded();
    const apiKey = userSettingsService.getApiKey('gemini');

    if (!apiKey) {
        console.error('❌ No Gemini API Key found in settings.');
        return;
    }
    console.log('✅ API Key found (masked):', apiKey.substring(0, 4) + '...');

    // 2. List Models
    const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    console.log('🔍 Querying ListModels endpoint...');

    try {
        const response = await fetch(listModelsUrl);
        const data = await response.json();

        if (!response.ok) {
            console.error('❌ API Error calling ListModels:', data);
            return;
        }

        console.log('✅ Models List Retrieved successfully.');

        const models = data.models || [];
        console.log(`ℹ️ Found ${models.length} modles.`);

        console.log('\n--- Text Embedding Models ---');
        const embeddingModels = models.filter((m: any) =>
            m.name.includes('embedding') ||
            (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('embedContent'))
        );

        if (embeddingModels.length === 0) {
            console.warn('⚠️ No specific "embedding" models found.');
            console.log('All available models:', models.map((m: any) => m.name));
        } else {
            embeddingModels.forEach((m: any) => {
                console.log(`\nName: ${m.name}`);
                console.log(`Version: ${m.version}`);
                console.log(`Supported Methods: ${m.supportedGenerationMethods?.join(', ')}`);
            });
        }

    } catch (error) {
        console.error('❌ Network/Script Error:', error);
    }
}

diagnose();
