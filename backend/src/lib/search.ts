import * as cheerio from 'cheerio';
import { groundedSearch } from './gemini';

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source: string;
    timestamp?: string;
    metadata?: any;
}

export interface WeatherData {
    location: string;
    condition: string;
    temperature: string;
    wind?: string;
    humidity?: string;
    forecast?: string[];
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    console.log('[SEARCH] Query:', query);

    // 1. Hava Durumu Kontrolü (Geliştirilmiş)
    if (isWeatherQuery(lowerQuery)) {
        try {
            const weatherResult = await getWeatherInfo(query);
            if (weatherResult) {
                results.push(weatherResult);
                console.log('[SEARCH] Weather result added');
            }
        } catch (e) {
            console.error('[SEARCH] Weather failed:', e);
        }
    }

    // 2. Haber Araması (Google News RSS)
    if (isNewsQuery(lowerQuery) || results.length === 0) {
        try {
            const newsResults = await scrapeGoogleNewsRSS(query);
            results.push(...newsResults);
            console.log('[SEARCH] Google News results:', newsResults.length);
        } catch (e) {
            console.error('[SEARCH] Google News failed:', e);
        }
    }

    // 3. Genel Web Araması (DDG veya Bing)
    if (results.length < 5) {
        try {
            // Önce DDG dene
            const ddgResults = await scrapeDuckDuckGoLite(query);
            if (ddgResults.length > 0) {
                results.push(...ddgResults);
                console.log('[SEARCH] DDG results:', ddgResults.length);
            } else {
                // DDG başarısızsa Bing'e geç
                const bingResults = await scrapeBing(query);
                results.push(...bingResults);
                console.log('[SEARCH] Bing results:', bingResults.length);
            }
        } catch (e) {
            console.error('[SEARCH] Web search failed:', e);
        }
    }

    // 4. Döviz/Kripto Kontrolü
    if (isCurrencyQuery(lowerQuery)) {
        try {
            const currencyResult = await getCurrencyInfo(query);
            if (currencyResult) results.unshift(currencyResult); // En başa ekle
        } catch (e) {
            console.error('[SEARCH] Currency failed:', e);
        }
    }

    // 5. GEMINI GROUNDED SEARCH - Ana fallback ve zenginleştirme
    if (results.length < 3) {
        try {
            console.log('[SEARCH] Using Gemini grounded search as fallback...');
            const geminiResult = await groundedSearch(query);

            // Gemini yanıtını sonuçlara ekle
            results.unshift({
                title: 'AI Destekli Arama Sonucu',
                url: geminiResult.sources[0]?.url || 'https://google.com',
                snippet: geminiResult.answer.substring(0, 500),
                source: 'Gemini AI (Grounded)',
                metadata: {
                    sources: geminiResult.sources,
                    fullAnswer: geminiResult.answer
                }
            });

            // Kaynakları da ekle
            for (const src of geminiResult.sources.slice(0, 3)) {
                results.push({
                    title: src.title,
                    url: src.url,
                    snippet: 'Gemini tarafından önerilen kaynak',
                    source: 'Gemini Source'
                });
            }

            console.log('[SEARCH] Gemini grounded results added');
        } catch (e) {
            console.error('[SEARCH] Gemini grounded search failed:', e);
        }
    }

    console.log('[SEARCH] Total results:', results.length);
    return results;
}

// ============= HELPER FUNCTIONS =============

function isWeatherQuery(query: string): boolean {
    const weatherKeywords = ['hava', 'weather', 'durumu', 'sıcaklık', 'yağmur', 'kar', 'güneş'];
    return weatherKeywords.some(kw => query.includes(kw));
}

function isNewsQuery(query: string): boolean {
    const newsKeywords = ['haber', 'news', 'son dakika', 'gündem', 'olay'];
    return newsKeywords.some(kw => query.includes(kw));
}

function isCurrencyQuery(query: string): boolean {
    const currencyKeywords = ['dolar', 'euro', 'bitcoin', 'tl', 'usd', 'eur', 'btc', 'kur'];
    return currencyKeywords.some(kw => query.includes(kw));
}

function extractLocation(query: string): string {
    // "istanbul hava durumu" → "istanbul"
    // "ankara'da hava nasıl" → "ankara"
    const stopWords = ['hava', 'durumu', 'weather', 'da', 'de', 'nasıl', 'kaç', 'derece'];
    const words = query.toLowerCase().split(' ')
        .filter(w => !stopWords.includes(w))
        .filter(w => w.length > 2);

    return words[0] || 'Istanbul';
}

// ============= WEATHER API =============

async function getWeatherInfo(query: string): Promise<SearchResult | null> {
    const location = extractLocation(query);

    // Yöntem 1: wttr.in (Basit ve hızlı)
    try {
        const wttrResult = await scrapeWttrIn(location);
        if (wttrResult) return wttrResult;
    } catch (e) {
        console.warn('[WEATHER] wttr.in failed, trying OpenWeather');
    }

    // Yöntem 2: OpenWeatherMap (Daha detaylı)
    try {
        return await scrapeOpenWeather(location);
    } catch (e) {
        console.error('[WEATHER] All weather sources failed');
        return null;
    }
}

async function scrapeWttrIn(location: string): Promise<SearchResult | null> {
    const url = `https://wttr.in/${encodeURIComponent(location)}?format=3&lang=tr`;
    console.log('[WEATHER] Fetching wttr.in:', url);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'curl/7.68.0' // wttr.in curl için optimize
        }
    });

    if (!response.ok) {
        throw new Error(`wttr.in HTTP ${response.status}`);
    }

    const text = await response.text();

    // Validasyon: HTML değil, makul uzunlukta
    if (text.includes('<html') || text.includes('DOCTYPE')) {
        throw new Error('wttr.in returned HTML instead of text');
    }

    if (text.length < 10 || text.length > 200) {
        throw new Error(`wttr.in suspicious response length: ${text.length}`);
    }

    // Detaylı bilgi için ikinci istek
    const detailUrl = `https://wttr.in/${encodeURIComponent(location)}?format=%l:+%C+%t+(Hissedilen:+%f)+%w+Nem:+%h&lang=tr`;
    const detailResponse = await fetch(detailUrl, {
        headers: { 'User-Agent': 'curl/7.68.0' }
    });
    const detailText = await detailResponse.text();

    return {
        title: `${location} Hava Durumu`,
        url: `https://wttr.in/${location}`,
        snippet: detailText.trim(),
        source: 'wttr.in',
        metadata: {
            raw: text.trim(),
            location: location
        }
    };
}

async function scrapeOpenWeather(location: string): Promise<SearchResult | null> {
    // Not: API key gerekiyor ama browser tabanlı scraping yapabiliriz
    const url = `https://openweathermap.org/find?q=${encodeURIComponent(location)}`;

    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // OpenWeather sayfasından ilk sonuç
    const firstResult = $('.weather-widget').first();
    const temp = firstResult.find('.temperature').text();
    const condition = firstResult.find('.weather-description').text();

    if (temp && condition) {
        return {
            title: `${location} Hava Durumu`,
            url: url,
            snippet: `Sıcaklık: ${temp}, Durum: ${condition}`,
            source: 'OpenWeather'
        };
    }

    return null;
}

// ============= CURRENCY API =============

async function getCurrencyInfo(query: string): Promise<SearchResult | null> {
    try {
        // exchangerate.host - Ücretsiz API
        const response = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=TRY,EUR,GBP');
        const data = await response.json();

        if (data.rates) {
            const rates = data.rates;
            const snippet = `
💵 USD/TRY: ${rates.TRY?.toFixed(2)}
💶 EUR/TRY: ${(rates.EUR * rates.TRY).toFixed(2)}
💷 GBP/TRY: ${(rates.GBP * rates.TRY).toFixed(2)}
            `.trim();

            return {
                title: 'Güncel Döviz Kurları',
                url: 'https://api.exchangerate.host',
                snippet: snippet,
                source: 'ExchangeRate API',
                metadata: rates
            };
        }
    } catch (e) {
        console.error('[CURRENCY] Failed:', e);
    }

    return null;
}

// ============= WEB SEARCH =============

async function scrapeDuckDuckGoLite(query: string): Promise<SearchResult[]> {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    console.log('[DDG] Scraping:', url);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            'Accept': 'text/html',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8'
        }
    });

    if (!response.ok) {
        throw new Error(`DDG HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // DDG Lite yapısı: Her sonuç bir <tr> içinde
    $('table.results tr').each((i, row) => {
        // Sonuç linkleri genelde 2. td'de
        const cells = $(row).find('td');

        if (cells.length >= 2) {
            const linkCell = $(cells[1]);
            const link = linkCell.find('a.result-link').first();

            if (link.length > 0) {
                const title = link.text().trim();
                let url = link.attr('href') || '';

                // DDG redirect'i decode et
                if (url.includes('//duckduckgo.com/l/?')) {
                    const match = url.match(/uddg=([^&]+)/);
                    if (match) url = decodeURIComponent(match[1]);
                }

                // Snippet: link'ten sonraki text
                const snippet = linkCell.find('.result-snippet').text().trim()
                    || linkCell.text().replace(title, '').trim().substring(0, 200);

                if (title && url.startsWith('http')) {
                    results.push({
                        title,
                        url,
                        snippet,
                        source: 'DuckDuckGo'
                    });
                }
            }
        }
    });

    console.log('[DDG] Found results:', results.length);
    return results.slice(0, 10);
}

async function scrapeBing(query: string): Promise<SearchResult[]> {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=tr`;
    console.log('[BING] Scraping:', url);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'tr-TR,tr;q=0.9'
        }
    });

    if (!response.ok) {
        throw new Error(`Bing HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    // Bing organik sonuçlar
    $('li.b_algo').each((i, el) => {
        const titleEl = $(el).find('h2 a');
        const snippetEl = $(el).find('.b_caption p, .b_lineclamp2, .b_paractl');

        const title = titleEl.text().trim();
        const url = titleEl.attr('href');
        const snippet = snippetEl.text().trim();

        if (title && url && url.startsWith('http')) {
            results.push({
                title,
                url,
                snippet: snippet || 'Açıklama yok',
                source: 'Bing'
            });
        }
    });

    console.log('[BING] Found results:', results.length);
    return results.slice(0, 10);
}

async function scrapeGoogleNewsRSS(query: string): Promise<SearchResult[]> {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr&gl=TR&ceid=TR:tr`;
    console.log('[NEWS] Scraping Google News RSS');

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
        }
    });

    if (!response.ok) {
        throw new Error(`Google News HTTP ${response.status}`);
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const results: SearchResult[] = [];

    $('item').each((i, el) => {
        const title = $(el).find('title').text();
        const link = $(el).find('link').text();
        const pubDate = $(el).find('pubDate').text();
        const description = $(el).find('description').text()
            .replace(/<[^>]*>/g, '') // HTML taglerini temizle
            .trim();

        if (title && link) {
            results.push({
                title,
                url: link,
                snippet: description.substring(0, 200) || 'Açıklama yok',
                source: 'Google News',
                timestamp: pubDate
            });
        }
    });

    console.log('[NEWS] Found articles:', results.length);
    return results.slice(0, 10);
}