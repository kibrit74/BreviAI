import * as cheerio from 'cheerio';

console.log("Testing standalone DuckDuckGo Lite Scraper...");

async function scrapeDuckDuckGoLite(query) {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    console.log('Scraping DDG Lite:', url);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
            'Referer': 'https://lite.duckduckgo.com/',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    });

    if (!response.ok) throw new Error(`DDG status: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];

    $('table tr').each((i, el) => {
        const linkEl = $(el).find('a');
        if (linkEl.length > 0) {
            const item = linkEl.first();
            const title = item.text().trim();
            const rawUrl = item.attr('href');

            if (rawUrl && title) {
                if (rawUrl.includes('lite.duckduckgo.com')) return;
                let url = rawUrl;
                try {
                    if (url.includes('uddg=')) {
                        const match = url.match(/uddg=([^&]+)/);
                        if (match && match[1]) {
                            url = decodeURIComponent(match[1]);
                        }
                    }
                } catch (e) { }

                if (url.startsWith('http')) {
                    const snippet = $(el).text().replace(title, '').trim().substring(0, 200);
                    results.push({
                        title,
                        url,
                        snippet,
                        source: 'DuckDuckGo Lite'
                    });
                }
            }
        }
    });

    if (results.length === 0) {
        console.log("DEBUG: HTML Snippet:", html.substring(0, 500));
        console.log("DEBUG: Table rows found:", $('table tr').length);
    }

    return results.slice(0, 5);
}

async function run() {
    try {
        console.log("Searching for 'React Native'...");
        const results = await scrapeDuckDuckGoLite("React Native");

        console.log("Results found:", results.length);
        if (results.length > 0) {
            console.log("First result:", results[0]);
            console.log("✅ Test Passed");
        } else {
            console.log("⚠️ No results");
        }
    } catch (e) {
        console.error("❌ Failed:", e);
    }
}

run();
