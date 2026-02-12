/**
 * Curated list of Free APIs for BreviAI
 * Focus: Turkey-specific and general utility
 */

export interface ApiDefinition {
    id: string;
    name: string;
    description: string;
    category: 'Turkey' | 'Finance' | 'Weather' | 'Utility' | 'Entertainment' | 'Religion' | 'News';
    url: string;
    method: 'GET' | 'POST';
    headers?: string;
    body?: string;
    variableName?: string;
}

export const FREE_APIS: ApiDefinition[] = [
    // ---------------------------------------------------------
    // TURKEY SPECIFIC & RELIGION
    // ---------------------------------------------------------
    {
        id: 'tr_prayer',
        name: 'Ezan Vakitleri (TR)',
        description: 'Türkiye için namaz vakitleri (İlçe bazlı)',
        category: 'Religion',
        url: 'https://api.aladhan.com/v1/timingsByCity?city={{sehir}}&country=Turkey&method=13',
        method: 'GET',
        variableName: 'ezanVakitleri'
    },
    {
        id: 'tr_earthquake',
        name: 'Son Depremler (Kandilli)',
        description: 'Türkiye\'deki son depremler listesi',
        category: 'Turkey',
        url: 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live',
        method: 'GET',
        variableName: 'depremler'
    },
    {
        id: 'tr_tcmb_kurlar',
        name: 'TCMB Döviz Kurları',
        description: 'Merkez Bankası günlük kurlar (XML/JSON wrapper)',
        category: 'Finance',
        url: 'https://api.genelpara.com/embed/doviz.json',
        method: 'GET',
        variableName: 'doviz'
    },
    {
        id: 'tr_holidays',
        name: 'Resmi Tatiller (TR)',
        description: 'Türkiye resmi tatil günleri',
        category: 'Turkey',
        url: 'https://date.nager.at/api/v3/PublicHolidays/2025/TR',
        method: 'GET',
        variableName: 'tatiller'
    },
    {
        id: 'tr_pharmacy',
        name: 'Nöbetçi Eczaneler',
        description: 'İl/İlçe bazlı nöbetçi eczaneler (CollectAPI - API Key Gerekir, örnek URL)',
        category: 'Turkey',
        url: 'https://api.collectapi.com/health/dutyPharmacy?il={{sehir}}',
        method: 'GET',
        headers: '{"authorization": "apikey your_token_here", "content-type": "application/json"}',
        variableName: 'eczaneler'
    },

    // ---------------------------------------------------------
    // WEATHER & GEO
    // ---------------------------------------------------------
    {
        id: 'weather_openmeteo',
        name: 'Hava Durumu (Detaylı)',
        description: 'Konuma göre detaylı hava durumu (API Key gerekmez)',
        category: 'Weather',
        url: 'https://api.open-meteo.com/v1/forecast?latitude={{location.latitude}}&longitude={{location.longitude}}&current_weather=true&hourly=temperature_2m,rain',
        method: 'GET',
        variableName: 'havaDurumu'
    },
    {
        id: 'weather_wttr',
        name: 'Hava Durumu (Basit)',
        description: 'Alternatif hava durumu (wttr.in) - JSON',
        category: 'Weather',
        url: 'https://wttr.in/{{location.latitude}},{{location.longitude}}?format=j1',
        method: 'GET',
        variableName: 'havaDurumuSimple'
    },
    {
        id: 'geo_ip',
        name: 'IP Konum Bilgisi',
        description: 'IP adresinden konum bulma',
        category: 'Utility',
        url: 'https://ipapi.co/json/',
        method: 'GET',
        variableName: 'ipBilgi'
    },
    {
        id: 'sun_times',
        name: 'Güneş Doğuş/Batış',
        description: 'Koordinata göre güneş saatleri',
        category: 'Weather',
        url: 'https://api.sunrise-sunset.org/json?lat={{location.latitude}}&lng={{location.longitude}}&formatted=0',
        method: 'GET',
        variableName: 'gunes'
    },

    // ---------------------------------------------------------
    // FINANCE (General)
    // ---------------------------------------------------------
    {
        id: 'crypto_coingecko',
        name: 'Kripto Fiyatları',
        description: 'Bitcoin ve altcoin fiyatları (CoinGecko)',
        category: 'Finance',
        url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,avalanche-2&vs_currencies=usd,try',
        method: 'GET',
        variableName: 'kripto'
    },
    {
        id: 'currency_free',
        name: 'Döviz Çevirici (Global)',
        description: 'USD bazlı güncel kurlar',
        category: 'Finance',
        url: 'https://open.er-api.com/v6/latest/USD',
        method: 'GET',
        variableName: 'globalKurlar'
    },

    // ---------------------------------------------------------
    // NEWS & RSS (Converted to JSON)
    // ---------------------------------------------------------
    {
        id: 'rss_hurriyet',
        name: 'Hürriyet Haberler',
        description: 'Hürriyet Gazetesi RSS akışı (JSON)',
        category: 'News',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.hurriyet.com.tr/rss/anasayfa',
        method: 'GET',
        variableName: 'haberlerHurriyet'
    },
    {
        id: 'rss_bbc_tr',
        name: 'BBC Türkçe Haberler',
        description: 'BBC Türkçe RSS akışı (JSON)',
        category: 'News',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=http://feeds.bbci.co.uk/turkce/rss.xml',
        method: 'GET',
        variableName: 'haberlerBBC'
    },
    {
        id: 'rss_shiftdelete',
        name: 'Teknoloji Haberleri (SDN)',
        description: 'ShiftDelete.Net RSS akışı',
        category: 'News',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://shiftdelete.net/feed',
        method: 'GET',
        variableName: 'haberlerTekno'
    },

    // ---------------------------------------------------------
    // UTILITY & TOOLS
    // ---------------------------------------------------------
    {
        id: 'util_uuid',
        name: 'UUID Oluşturucu',
        description: 'Rastgele UUID üretir',
        category: 'Utility',
        url: 'https://httpbin.org/uuid',
        method: 'GET',
        variableName: 'uuid'
    },
    {
        id: 'util_httpbin',
        name: 'HTTP Test (Echo)',
        description: 'Gönderilen isteği geri döndürür (Debug)',
        category: 'Utility',
        url: 'https://httpbin.org/post',
        method: 'POST',
        body: '{"test": "veri"}',
        variableName: 'echo'
    },
    {
        id: 'util_qrcode',
        name: 'QR Kod Oluşturucu',
        description: 'Metin/Link için QR kod resim URL\'i',
        category: 'Utility',
        url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={{veri}}',
        method: 'GET',
        variableName: 'qrCodeUrl'
    },

    // ---------------------------------------------------------
    // ENTERTAINMENT & RANDOM
    // ---------------------------------------------------------
    {
        id: 'fun_cat_fact',
        name: 'Rastgele Kedi Bilgisi',
        description: 'Kediler hakkında ilginç bilgiler',
        category: 'Entertainment',
        url: 'https://catfact.ninja/fact',
        method: 'GET',
        variableName: 'kediBilgi'
    },
    {
        id: 'fun_joke',
        name: 'Rastgele Şaka (İng)',
        description: 'Yazılım/Genel şakalar',
        category: 'Entertainment',
        url: 'https://official-joke-api.appspot.com/random_joke',
        method: 'GET',
        variableName: 'saka'
    },
    {
        id: 'fun_dog_image',
        name: 'Rastgele Köpek Resmi',
        description: 'Rastgele köpek fotoğrafı URL\'i',
        category: 'Entertainment',
        url: 'https://dog.ceo/api/breeds/image/random',
        method: 'GET',
        variableName: 'kopekResmi'
    },
    {
        id: 'fun_activity',
        name: 'Aktivite Önerisi',
        description: 'Can sıkıntısı için aktivite tavsiyesi',
        category: 'Entertainment',
        url: 'https://www.boredapi.com/api/activity',
        method: 'GET',
        variableName: 'aktivite'
    },
    {
        id: 'fun_number',
        name: 'Sayı Gerçeği',
        description: 'Bir sayı hakkında ilginç bilgi',
        category: 'Entertainment',
        url: 'http://numbersapi.com/random/math',
        method: 'GET',
        variableName: 'sayiBilgi'
    }
];
