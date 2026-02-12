import { vectorMemoryService } from './src/services/VectorMemoryService';
import { apiService } from './src/services/ApiService';

// Mock ApiService.getEmbedding if not running in full environment
// NOTE: This test file is meant to be run manually or via a test runner that supports TS
async function runTest() {
    console.log('--- TEST START: VECTOR MEMORY ---');

    console.log('1. Clearing old memory...');
    await vectorMemoryService.clear();

    console.log('2. Adding test memories...');
    const memories = [
        "Mehmet Bey ile yarın saat 14:00'te toplantı var.",
        "Marketten süt, yumurta ve ekmek alınacak.",
        "Uçak bileti rezervasyon kodu: PNR123456, İstanbul-Ankara."
    ];

    for (const text of memories) {
        // Use a mock metadata for testing
        await vectorMemoryService.addMemory(text, { source: 'test_script' });
        // Simulating delay for async operations
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('3. Searching for "rezervasyon"...');
    const results1 = await vectorMemoryService.search("rezervasyon");
    console.log('Term: "rezervasyon"', JSON.stringify(results1, null, 2));

    console.log('4. Searching for "yiyecek"... (Should match market list semantically if embedding works)');
    const results2 = await vectorMemoryService.search("yiyecek");
    console.log('Term: "yiyecek"', JSON.stringify(results2, null, 2));

    console.log('--- TEST END ---');
}

// Check if running directly
if (require.main === module) {
    runTest().catch(console.error);
}

export default runTest;
