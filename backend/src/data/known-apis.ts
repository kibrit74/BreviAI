/**
 * Known Public APIs for AI Integration
 * The AI ignores capability if not listed here.
 * 
 * High-Utility Professional APIs for Automation
 */

export interface KnownApi {
    id: string;
    name: string;
    description: string;
    endpoints: {
        method: 'GET' | 'POST';
        url: string;
        description: string;
        params: Record<string, string>; // paramName -> description
        needsLocation?: boolean; // If true, AI should add LOCATION_GET node first
    }[];
}

export const KNOWN_APIS: KnownApi[] = [
    // ════════════════════════════════════════════════════════
    // 🛠️ UTILITIES & TOOLS (Araçlar)
    // ════════════════════════════════════════════════════════
    {
        id: 'util_tinyurl',
        name: 'URL Kısaltıcı (TinyURL)',
        description: 'Uzun linkleri kısaltır. API anahtarı gerektirmez.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://tinyurl.com/api-create.php?url={{url}}',
                description: 'Link kısalt',
                params: { 'url': 'Kısaltılacak uzun URL' }
            }
        ]
    },
    {
        id: 'util_ocr',
        name: 'OCR (Resimden Yazı)',
        description: 'Resim üzerindeki yazıları metne çevirir (OCR.space).',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.ocr.space/parse/imageurl?apikey=helloworld&url={{imageUrl}}&language=tur',
                description: 'Resimden metin oku',
                params: { 'imageUrl': 'Resmin internet adresi' }
            }
        ]
    },
    {
        id: 'util_pdf',
        name: 'PDF İşlemleri',
        description: 'HTML veya metni PDF\'e çevirir.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.html2pdf.app/v1/generate?url={{url}}&apiKey=FREE_TIER',
                description: 'Sayfayı PDF yap',
                params: { 'url': 'Web sayfası adresi' }
            }
        ]
    },
    {
        id: 'util_dns',
        name: 'DNS Sorgulama (Google)',
        description: 'Domain DNS kayıtlarını sorgular.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://dns.google/resolve?name={{domain}}',
                description: 'DNS Çözümle',
                params: { 'domain': 'Domain (google.com)' }
            }
        ]
    },
    {
        id: 'util_useragent',
        name: 'User Agent Bilgisi',
        description: 'User Agent stringini analiz eder.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://www.useragentstring.com/?uas={{ua}}&getJSON=all',
                description: 'Analiz et',
                params: { 'ua': 'User Agent string' }
            }
        ]
    },

    // ════════════════════════════════════════════════════════
    // 🌍 WEATHER & GEO (Hava & Konum)
    // ════════════════════════════════════════════════════════
    {
        id: 'weather_openmeteo',
        name: 'Hava Durumu Pro',
        description: 'Detaylı saatlik/günlük hava durumu (Sıcaklık, Rüzgar, Yağış).',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.open-meteo.com/v1/forecast?latitude={{location.latitude}}&longitude={{location.longitude}}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,rain,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto',
                description: 'Detaylı hava durumu',
                params: { 'latitude': 'Enlem', 'longitude': 'Boylam' },
                needsLocation: true
            }
        ]
    },
    {
        id: 'geo_nominatim',
        name: 'Adres Arama (Geocoding)',
        description: 'Adresi enlem/boylama çevirir veya tam tersi (OpenStreetMap).',
        endpoints: [
            {
                method: 'GET',
                url: 'https://nominatim.openstreetmap.org/search?q={{address}}&format=json&limit=1',
                description: 'Adres Ara',
                params: { 'address': 'Açık adres veya şehir' }
            }
        ]
    },
    {
        id: 'geo_ip',
        name: 'IP & Ağ Bilgisi',
        description: 'IP adresinden konum, ISP ve ağ detayları.',
        endpoints: [
            {
                method: 'GET',
                url: 'http://ip-api.com/json/',
                description: 'Ağ bilgileri',
                params: {}
            }
        ]
    },
    {
        id: 'geo_airquality',
        name: 'Hava Kalitesi',
        description: 'Bölgedeki hava kirlilik oranı (AQI).',
        endpoints: [
            {
                method: 'GET',
                url: 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude={{location.latitude}}&longitude={{location.longitude}}&current=us_aqi,pm10,pm2_5',
                description: 'Hava kalitesi indeksi',
                params: { 'latitude': 'Enlem', 'longitude': 'Boylam' },
                needsLocation: true
            }
        ]
    },

    // ════════════════════════════════════════════════════════
    // 💰 FINANCE & MARKETS (Finans)
    // ════════════════════════════════════════════════════════
    {
        id: 'fin_crypto',
        name: 'Kripto Piyasa Verileri',
        description: 'Detaylı coin verileri, grafik değişimi.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.coincap.io/v2/assets/{{coin}}',
                description: 'Coin detayı (bitcoin, ethereum)',
                params: { 'coin': 'Coin ID' }
            }
        ]
    },
    {
        id: 'fin_currency',
        name: 'Döviz Çevirici',
        description: 'Güncel paritelerle döviz hesabı.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.frankfurter.app/latest?amount={{amount}}&from={{from}}&to={{to}}',
                description: 'Döviz çevir',
                params: { 'amount': 'Miktar', 'from': 'Kaynak (USD)', 'to': 'Hedef (TRY)' }
            }
        ]
    },

    // ════════════════════════════════════════════════════════
    // 📺 MEDIA & CONTENT (Medya)
    // ════════════════════════════════════════════════════════
    {
        id: 'media_youtube',
        name: 'YouTube Video Bilgisi',
        description: 'Video başlığı, kapak resmi vb. (No Key - oEmbed).',
        endpoints: [
            {
                method: 'GET',
                url: 'https://www.youtube.com/oembed?url={{url}}&format=json',
                description: 'Video bilgileri',
                params: { 'url': 'YouTube linki' }
            }
        ]
    },
    {
        id: 'media_qr',
        name: 'Gelişmiş QR Kod',
        description: 'Özelleştirilebilir QR kod üretimi.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={{data}}&bgcolor=ffffff',
                description: 'Yüksek çözünürlüklü QR',
                params: { 'data': 'İçerik' }
            }
        ]
    },

    // ════════════════════════════════════════════════════════
    // 🧠 AI & TRANSLATE (Yapay Zeka)
    // ════════════════════════════════════════════════════════
    {
        id: 'ai_translate',
        name: 'Çeviri (MyMemory)',
        description: 'Metin çevirisi (Sınırlı ücretsiz kullanım).',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.mymemory.translated.net/get?q={{text}}&langpair={{from}}|{{to}}',
                description: 'Metni çevir',
                params: { 'text': 'Metin', 'from': 'Kaynak (en)', 'to': 'Hedef (tr)' }
            }
        ]
    },
    {
        id: 'ai_gender',
        name: 'İsim Analizi',
        description: 'İsimden cinsiyet ve köken analizi.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.genderize.io?name={{name}}',
                description: 'Cinsiyet tahmini',
                params: { 'name': 'Ad' }
            }
        ]
    },

    // ════════════════════════════════════════════════════════
    // 🚀 SCIENCE & DATA (Bilim)
    // ════════════════════════════════════════════════════════
    {
        id: 'sci_spacex',
        name: 'SpaceX Fırlatmaları',
        description: 'Son SpaceX fırlatma bilgileri.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.spacexdata.com/v4/launches/latest',
                description: 'Son fırlatma',
                params: {}
            }
        ]
    },

    // ════════════════════════════════════════════════════════
    // 🧪 EXPERIMENTAL & LOCAL (Deneysel)
    // ════════════════════════════════════════════════════════
    {
        id: 'exp_whatsapp',
        name: 'WhatsApp Otomasyonu (Web)',
        description: 'WhatsApp Web protokolü ile mesaj gönderir. (Yerel Sunucu Gerekir)',
        endpoints: [
            {
                method: 'POST',
                url: 'http://localhost:3000/api/whatsapp/send',
                description: 'Mesaj Gönder',
                params: { 'phone': 'Telefon (905...)', 'message': 'Mesaj' }
            },
            {
                method: 'GET',
                url: 'http://localhost:3000/api/whatsapp/unread',
                description: 'Okunmamış Mesajları Al',
                params: {}
            }
        ]
    },
    {
        id: 'sci_holidays',
        name: 'Resmi Tatiller',
        description: 'Yakındaki resmi tatilleri listeler.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://date.nager.at/api/v3/NextPublicHolidays/TR',
                description: 'Sıradaki tatiller',
                params: {}
            }
        ]
    },

    // ════════════════════════════════════════════════════════
    // 📚 DATA & DIRECTORIES (Rehberler)
    // ════════════════════════════════════════════════════════
    {
        id: 'dir_university',
        name: 'Üniversite Arama',
        description: 'Ülkeye veya isme göre üniversite arama.',
        endpoints: [
            {
                method: 'GET',
                url: 'http://universities.hipolabs.com/search?country=Turkey',
                description: 'Türkiye\'deki üniversiteler',
                params: { 'country': 'Ülke (Opsiyonel)', 'name': 'Ad filtresi' }
            }
        ]
    },
    {
        id: 'dir_zipcode',
        name: 'Posta Kodu (Zippopotam)',
        description: 'Posta kodundan lokasyon bilgisi.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.zippopotam.us/tr/{{zip}}',
                description: 'Posta kodu sorgula',
                params: { 'zip': 'Posta kodu (örn: 34000)' }
            }
        ]
    },
    {
        id: 'dir_user',
        name: 'Rastgele Kullanıcı (RandomUser)',
        description: 'Test için rastgele kullanıcı profili oluşturur.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://randomuser.me/api/?nat=tr',
                description: 'Rastgele Türk profil',
                params: {}
            }
        ]
    },

    // ════════════════════════════════════════════════════════
    // 🧩 MISC TOOLS (Diğer Araçlar)
    // ════════════════════════════════════════════════════════
    {
        id: 'tool_agify',
        name: 'İsimden Yaş Tahmini',
        description: 'İsme göre yaş tahmini yapar.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.agify.io?name={{name}}',
                description: 'Yaş tahmini',
                params: { 'name': 'Ad' }
            }
        ]
    },
    {
        id: 'tool_nationalize',
        name: 'İsimden Uyruk Tahmini',
        description: 'İsme göre uyruk tahmini yapar.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://api.nationalize.io?name={{name}}',
                description: 'Uyruk tahmini',
                params: { 'name': 'Ad' }
            }
        ]
    },
    {
        id: 'tool_bored',
        name: 'Can Sıkıntısı (Bored API)',
        description: 'Yapılacak aktivite önerisi.',
        endpoints: [
            {
                method: 'GET',
                url: 'https://www.boredapi.com/api/activity',
                description: 'Aktivite öner',
                params: { 'participants': 'Kişi sayısı', 'type': 'Tip (education, recreational, etc)' }
            }
        ]
    }
];

export function getApiDescriptions(): string {
    return KNOWN_APIS.map(api => {
        return `### ${api.name}\n` +
            api.description + '\n' +
            api.endpoints.map(ep =>
                `- ${ep.description}: ${ep.method} ${ep.url}\n` +
                (ep.needsLocation ? `  * NOT: Önce LOCATION_GET node'u ekle ve koordinatları url'e göm ({{location.latitude}}, {{location.longitude}}).` : '')
            ).join('\n');
    }).join('\n\n');
}
