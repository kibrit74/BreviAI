
import { searchWeb } from '../src/lib/search';

async function run() {
    const query = "İstanbul güncel hava durumu";
    console.log(`🔍 Testing ACTUAL searchWeb for: "${query}"`);

    try {
        const results = await searchWeb(query);
        console.log(`\n✅ Total Results: ${results.length}`);

        results.forEach((r, i) => {
            console.log(`\n[${i + 1}] ${r.source}: ${r.title}`);
            console.log(`   ${r.snippet.substring(0, 100)}...`);
            console.log(`   URL: ${r.url}`);
        });

    } catch (e) {
        console.error('❌ Search Failed:', e);
    }
}

run();
