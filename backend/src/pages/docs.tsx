import { useState, useMemo } from 'react';
import '../app/globals.css';
import styles from './docs.module.css';

// --- ICONS & COLORS ---
const CATEGORY_STYLES: Record<string, { color: string; icon: string; label: string }> = {
    trigger: { color: '#10B981', icon: '⚡', label: 'Tetikleyiciler' },
    control: { color: '#6366F1', icon: '🔀', label: 'Mantık & Kontrol' },
    input: { color: '#8B5CF6', icon: '🖱️', label: 'Giriş (Input)' },
    output: { color: '#F59E0B', icon: '📤', label: 'Çıktı (Output)' },
    ai: { color: '#EC4899', icon: '✨', label: 'Yapay Zeka (AI)' },
    web: { color: '#06B6D4', icon: '🌍', label: 'Web & API' },
    device: { color: '#EF4444', icon: '📱', label: 'Cihaz Yönetimi' },
    files: { color: '#F59E0B', icon: '📂', label: 'Dosya Sistemi' },
    google: { color: '#4285F4', icon: '🌐', label: 'Google Servisleri' },
    microsoft: { color: '#0078D4', icon: '🪟', label: 'Microsoft Office' },
    social: { color: '#1877F2', icon: '🔗', label: 'Sosyal Medya' },
    location: { color: '#8B5CF6', icon: '📍', label: 'Konum' },
    calendar: { color: '#8B5CF6', icon: '📅', label: 'Takvim' },
    communication: { color: '#F97316', icon: '💬', label: 'İletişim' },
    data: { color: '#6366F1', icon: '💾', label: 'Veri & Hafıza' },
    smart_home: { color: '#FCD34D', icon: '🏠', label: 'Akıllı Ev' },
    audio: { color: '#EF4444', icon: '🔊', label: 'Ses & Konuşma' },
};

type NodeType = keyof typeof CATEGORY_STYLES;

interface NodeParam {
    name: string;
    type: string;
    required: boolean;
    default?: string;
    desc: string;
}

interface NodeExample {
    title: string;
    code: string;
    explanation: string;
    image?: string; // Optional image for example
}

interface NodeDoc {
    id: string;
    title: string;
    type: NodeType;
    summary: string;
    overviewHTML: string;
    params: NodeParam[];
    outputs: { field: string; type: string; desc: string }[];
    examples: NodeExample[];
    credentials?: string;
}

const NODES: NodeDoc[] = [
    // ═════════════════════════════════════════
    // AI (YAPAY ZEKA) - V13 UPDATED
    // ═════════════════════════════════════════
    {
        id: 'REALTIME_AI', title: 'Realtime AI (Live)', type: 'ai', summary: 'Gemini Live ile anlık sesli sohbet.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🎙️ Gerçek Zamanlı AI (Realtime)</h3>
                <p>Bu düğüm, <strong>Gemini Live</strong> teknolojisini kullanarak yapay zeka ile <u>gecikmesiz</u> (milisayine hızında) sesli sohbet etmenizi sağlar.</p>
                <div class="tip-box">💡 <strong>Kullanım Alanı:</strong> Telefonla konuşur gibi AI ile konuşmak, anlık çeviri yapmak veya eller serbest asistan oluşturmak için kullanın.</div>
            </div>
            <div class="guide-section">
                <h3>🚀 Özellikler</h3>
                <ul>
                    <li><strong>Kesintisiz Sohbet:</strong> Siz sözünüzü bitirmeden araya girebilir.</li>
                    <li><strong>Duygu Analizi:</strong> Ses tonunuzdan sinirli veya mutlu olduğunuzu anlar.</li>
                    <li><strong>Araç Kullanımı:</strong> Sohbet sırasında "Işığı aç" derseniz diğer düğümleri tetikler.</li>
                </ul>
            </div>
        `,
        params: [
            { name: 'Model', type: 'Select', required: true, desc: 'Gemini 1.5 Pro (Sesli)' },
            { name: 'Voice', type: 'Select', required: true, desc: 'Ses Tonu (Nova, Alloy, Echo)' },
            { name: 'System Prompt', type: 'Text', required: false, desc: 'AI\'ın kişiliği (Örn: Sen benim İngilizce öğretmenimsin).' }
        ],
        outputs: [{ field: 'transcript', type: 'String', desc: 'Konuşma metni.' }, { field: 'audio', type: 'File', desc: 'Ses kaydı.' }],
        examples: [
            {
                title: '🇬🇧 İngilizce Pratik Arkadaşı',
                code: 'System Prompt: "Sen benim İngilizce öğretmenimsin. Hatalarımı düzelt ve benimle sohbet et."',
                explanation: 'Sizinle sesli olarak İngilizce konuşur ve telaffuz hatalarınızı anlık düzeltir.'
            },
            {
                title: '🚗 Araç İçi Asistan',
                code: `System Prompt: "Sen bir araç asistanısın. Kısa cevaplar ver."\nTools: [Spotify, Maps, Call]`,
                explanation: 'Araba kullanırken "Eve git", "Müzik aç" gibi komutları sesli algılar ve yapar.'
            }
        ]
    },
    {
        id: 'AGENT_AI', title: 'AI Agent (LLM)', type: 'ai', summary: 'Akıllı metin işleme ve üretme asistanı.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🧠 Agent AI: Geleceğin Beyni (2026)</h3>
                <p>BreviAI, sektörün en yeni ve en güçlü modellerini (State-of-the-Art) anında entegre eder. Eski modellerle vakit kaybetmeyin.</p>
            </div>
            
            <div class="guide-section">
                <h3>🤖 2026 Model Listesi (Bleeding Edge)</h3>
                <ul>
                    <li><strong>GPT-5 (OpenAI):</strong> Ağustos 2025 çıkışlı en son model. Akıl yürütme ve çoklu görevde rakipsiz.</li>
                    <li><strong>Gemini 3 (Google):</strong> "Deep Think" modu ile en karmaşık problemleri çözer. Sonsuz hafıza (Infinite Context) desteği.</li>
                    <li><strong>Claude 4.5 Opus (Anthropic):</strong> Kodlama, yaratıcı yazarlık ve ajan (agentic) görevlerde dünya lideri.</li>
                    <li><strong>o3-Pro (OpenAI):</strong> Matematik ve Bilimsel analizler için özel "Düşünen" model.</li>
                </ul>
            </div>

            <div class="guide-section">
                <h3>✨ Prompt Mühendisliği 2.0</h3>
                <div class="tip-box">Yeni nesil modeller "niyet okuma" özelliğine sahiptir, ancak netlik her zaman kazandırır.</div>
                <p><strong>Agentic Prompt:</strong> "Şu dosyayı analiz et, hataları bul, kendi kendine düzelt ve bana sadece bitmiş halini ver." (GPT-5 ve Claude 4.5 bunu yapabilir.)</p>
            </div>
        `,
        params: [
            { name: 'Model', type: 'Select', required: true, desc: 'GPT-5, Gemini 3, Claude 4.5 Opus, o3-Pro' },
            { name: 'Prompt', type: 'Text', required: true, desc: 'Görev tanımı.' },
            { name: 'System Prompt', type: 'Text', required: false, desc: 'Rol atama (Örn: Senior Software Engineer).' }
        ],
        outputs: [{ field: 'content', type: 'String', desc: 'AI yanıtı.' }],
        examples: [
            {
                title: 'Otonom Kod Düzeltme',
                code: `Model: Claude 4.5 Opus
Prompt: "Ekteki React projesini analiz et, performans sorunlarını bul ve optimize edilmiş kodları ver."`,
                explanation: 'Claude 4.5, tüm projeyi hafızasında tutup mimari öneriler sunabilir.'
            },
            {
                title: 'Derin Analiz (Deep Think)',
                code: `Model: Gemini 3
Prompt: "Şirketin son 5 yıllık finansal verilerini analiz et ve 2027 projeksiyonu çıkar."`,
                explanation: 'Gemini 3, milyonlarca veriyi saniyeler içinde işleyip grafik çizdirebilir.'
            }
        ]
    },
    {
        id: 'IMAGE_GENERATOR', title: 'Image Gen (Nanobana)', type: 'ai', summary: 'Gelişmiş görsel üretimi (2026).',
        overviewHTML: `
            <div class="guide-section">
                <h3>🎨 Nanobana Pro & Flux.1 (Next-Gen)</h3>
                <p>2026 standartlarında, 4K çözünürlükte ve "Photorealism" odaklı görsel üretim motorları.</p>
            </div>
             <div class="guide-section">
                <h3>🚀 Motor Seçenekleri</h3>
                <ul>
                    <li><strong>Nanobana Pro (Gemini 3 Image):</strong> 4K çözünürlük, metinleri (Text rendering) kusursuz yazar.</li>
                    <li><strong>Flux.1 Ultra:</strong> İnsan yüzlerinde ve ellerde %99 başarı oranı. Fotogerçekçilikte lider.</li>
                    <li><strong>Midjourney v7:</strong> Sanatsal ve kreatif işler için en iyisi.</li>
                </ul>
            </div>
        `,
        params: [
            { name: 'Provider', type: 'Select', required: true, desc: 'Nanobana Pro / Flux.1 Ultra / MJ v7' },
            { name: 'Prompt', type: 'Text', required: true, desc: 'Görsel tarifi.' },
            { name: 'Size', type: 'Select', required: false, desc: '4K / 1080p / Instagram Story' }
        ],
        outputs: [{ field: 'imageUrl', type: 'String', desc: 'Yüksek çözünürlüklü resim URL\'i.' }],
        examples: [
            { title: 'E-Ticaret Ürün Çekimi', code: 'Prompt: "Studio shot of a perfume bottle, 4k, Flux.1"', explanation: 'Stüdyo kalitesinde ürün fotoğrafı üretir.' }
        ]
    },

    // ═════════════════════════════════════════
    // WEB AUTOMATION & SCRAPING - V13
    // ═════════════════════════════════════════
    {
        id: 'WEB_AUTOMATION', title: 'Web Automation', type: 'web', summary: 'Web sitesi otomasyonu (Tıkla/Yaz).',
        overviewHTML: `
            <div class="guide-section">
                <h3>🌍 Tarayıcıyı Kontrol Edin (RPA)</h3>
                <p>Bu düğüm, sanki siz tıklıyormuşsunuz gibi bir web sitesine girer, butonlara basar, form doldurur ve veri çeker.</p>
                <div class="tip-box">🔍 <strong>Selector Nedir?</strong> Hangi butona basılacağını belirtmek için CSS Selector kullanılır (Örn: <code>#login-button</code>).</div>
            </div>
            <div class="guide-section">
                <h3>🛠️ Aksiyonlar</h3>
                <ol>
                    <li><strong>Go to URL:</strong> Siteye git.</li>
                    <li><strong>Type:</strong> Metin kutusuna yazı yaz.</li>
                    <li><strong>Click:</strong> Butona veya linke tıkla.</li>
                    <li><strong>Wait:</strong> Yüklenmesini bekle.</li>
                    <li><strong>Scrape:</strong> Metni veya resmi kaydet.</li>
                </ol>
            </div>
        `,
        params: [
            { name: 'URL', type: 'String', required: true, desc: 'Başlangıç adresi.' },
            { name: 'Mode', type: 'Select', required: true, desc: 'Headless (Arkaplanda) / Visible (Ekranda görerek).' },
            { name: 'Actions', type: 'List', required: true, desc: 'Sırasıyla yapılacak işlemler.' }
        ],
        outputs: [{ field: 'scrapedData', type: 'Object', desc: 'Toplanan veriler.' }],
        examples: [
            {
                title: 'E-Ticaret Fiyat Takibi',
                code: `1. Go to URL (amazon.com/product...)
2. Scrape (Selector: #price-block, Variable: "fiyat")`,
                explanation: 'Ürün sayfasına gider ve fiyatı okuyup değişkene kaydeder.'
            }
        ]
    },
    {
        id: 'HTTP_REQUEST', title: 'HTTP Request', type: 'web', summary: 'API isteği yap.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🌍 HTTP Request: Evrensel Kumanda</h3>
                <p>Bu düğüm ile internete bağlı herhangi bir servisle konuşabilirsiniz. Hava durumu API'si, Spotify API'si, kendi sunucunuz... Sınır yok.</p>
            </div>
            <div class="guide-section">
                <h3>🛠️ Temel Kavramlar</h3>
                <ul>
                    <li><strong>GET:</strong> Bilgi okumak için (Örn: Hava durumu sor).</li>
                    <li><strong>POST:</strong> Bilgi göndermek için (Örn: Tweet at).</li>
                    <li><strong>Headers:</strong> "Kimlik Kartı" gibidir. API anahtarları buraya yazılır.</li>
                    <li><strong>Body:</strong> Gönderilecek paketin içidir (JSON).</li>
                </ul>
            </div>
        `,
        params: [
            { name: 'URL', type: 'String', required: true, desc: 'İstek yapılacak adres.' },
            { name: 'Method', type: 'Select', required: true, desc: 'GET, POST, PUT, DELETE.' },
            { name: 'Headers', type: 'JSON', required: false, desc: 'Örn: {"Authorization": "Bearer KEY"}' }
        ],
        outputs: [{ field: 'data', type: 'Object', desc: 'Sunucudan dönen yanıt.' }, { field: 'status', type: 'Number', desc: 'Sonuç kodu (200=OK, 401=Yetkisiz).' }],
        examples: [
            { title: 'Döviz Kuru Çekme', code: 'GET https://api.exchangerate.host/latest?base=USD', explanation: 'Güncel Dolar kurunu çeker.' },
            { title: 'Discord Webhook', code: 'POST https://discord.com/api/webhooks/...\nBody: { "content": "Merhaba Discord!" }', explanation: 'Discord kanalına mesaj atar.' }
        ]
    },

    // ═════════════════════════════════════════
    // WORKFLOW CHAINING - V13
    // ═════════════════════════════════════════
    {
        id: 'EXECUTE_WORKFLOW', title: 'Sub-Workflow', type: 'control', summary: 'Başka bir akışı çalıştırır.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔗 Otomasyonları Birleştirme</h3>
                <p>Bir akışın içinden başka bir akışı (Sub-Workflow) çağırmanıza yarar. Tekrar eden işler için "Fonksiyon" gibi kullanabilirsiniz.</p>
            </div>
            <div class="guide-section">
                <h3>⚙️ Ayarlar</h3>
                <ul>
                    <li><strong>Wait for Completion:</strong> Çağırdığınız akış bitene kadar beklesin mi? (Evet derseniz sonucunu alabilirsiniz).</li>
                    <li><strong>Pass Variables:</strong> Mevcut değişkenleri (Örn: Gelen SMS) alt akışa gönder.</li>
                </ul>
            </div>
        `,
        params: [
            { name: 'Workflow', type: 'Select', required: true, desc: 'Çalıştırılacak otomasyon.' },
            { name: 'Wait', type: 'Boolean', required: true, desc: 'Bitmesini bekle?' }
        ],
        outputs: [{ field: 'result', type: 'Any', desc: 'Alt akıştan dönen sonuç.' }],
        examples: [
            { title: 'Hata Bildirim Modülü', code: 'Select Workflow: "Yöneticiye Mesaj At"', explanation: 'Herhangi bir akışta hata olursa, bu hazır modülü çağırarak yöneticiye mesaj atar.' }
        ]
    },

    // ═════════════════════════════════════════
    // SENSORS - V13
    // ═════════════════════════════════════════
    {
        id: 'LIGHT_SENSOR', title: 'Light Sensor', type: 'input', summary: 'Ortam ışığını ölçer.',
        overviewHTML: `
            <div class="guide-section">
                <h3>💡 Işık Sensörü (Lux)</h3>
                <p>Telefonun önündeki ışık sensörünü kullanarak ortamın aydınlık seviyesini (Lux) ölçer.</p>
            </div>
        `,
        params: [{ name: 'Variable', type: 'String', required: true, desc: 'Sonucu kaydetmek için değişken adı.' }],
        outputs: [{ field: 'lux', type: 'Number', desc: '0 (Karanlık) - 10000 (Güneşli)' }],
        examples: [{ title: 'Gece Okuma Modu', code: 'IF {{lux}} < 10 THEN Ekran Parlaklığını Kıs', explanation: 'Ortam karanıksa ekranı otomatik karartır.' }]
    },
    {
        id: 'PEDOMETER', title: 'Pedometer', type: 'input', summary: 'Adım sayar.',
        overviewHTML: `
            <div class="guide-section">
                <h3>👣 Adımsayar</h3>
                <p>Bugün attığınız adım sayısını verir.</p>
            </div>
        `,
        params: [],
        outputs: [{ field: 'steps', type: 'Number', desc: 'Günlük adım sayısı.' }],
        examples: [{ title: 'Hedef Takibi', code: 'IF {{steps}} >= 10000 THEN Bildirim: "Hedefe Ulaştın!"', explanation: '10 bin adıma ulaşınca kutlama mesajı atar.' }]
    },
    {
        id: 'MAGNETOMETER', title: 'Compass', type: 'input', summary: 'Pusula ve yön bilgisi.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🧭 Manyetometre</h3>
                <p>Telefonun hangi yöne (Kuzey, Güney vb.) baktığını derece cinsinden verir.</p>
            </div>
        `,
        params: [],
        outputs: [{ field: 'azimuth', type: 'Number', desc: '0-360 derece (0=Kuzey).' }],
        examples: [{ title: 'Kıble Bulucu', code: 'Yönü göster', explanation: 'Basit yön bulma uygulaması.' }]
    },

    // ═════════════════════════════════════════
    // TRIGGERS (Tetikleyiciler) - EXISTING
    // ═════════════════════════════════════════
    {
        id: 'MANUAL', title: 'Manual Trigger', type: 'trigger', summary: 'Akışı elle veya butonla başlatır.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔍 Nasıl Çalışır?</h3>
                <p>Bu düğüm, akışın başlangıç noktasıdır. Genellikle test amaçlı veya kullanıcının bir butona basarak başlattığı senaryolarda kullanılır.</p>
                <div class="tip-box">💡 <strong>İpucu:</strong> Akışınızı test ederken her zaman bu düğümü kullanın. "Play" butonuna bastığınızda bu düğüm tetiklenir.</div>
            </div>
        `,
        params: [{ name: 'Form Fields', type: 'Array', required: false, desc: 'Kullanıcıdan istenecek verilerin listesi (JSON formatında).' }],
        outputs: [{ field: 'formData', type: 'Object', desc: 'Kullanıcının girdiği veriler. Örn: {{formData.query}}' }],
        examples: [{ title: 'Test Başlatma', code: 'Play butonuna bas', explanation: 'Akışı çalıştırır.' }]
    },
    {
        id: 'TIME_TRIGGER', title: 'Cron / Interval', type: 'trigger', summary: 'Zamanlanmış görevler oluşturur.',
        overviewHTML: `
            <div class="guide-section">
                <h3>⏰ Zamanlayıcı</h3>
                <p>Bu düğüm, akışın sizin müdahaleniz olmadan, belirli zamanlarda otomatik çalışmasını sağlar.</p>
            </div>
        `,
        params: [
            { name: 'Mode', type: 'Select', required: true, desc: 'Interval (Basit) veya Cron (Gelişmiş).' },
            { name: 'Value', type: 'String', required: true, desc: 'Dakika sayısı veya Cron ifadesi.' }
        ],
        outputs: [{ field: 'timestamp', type: 'Number', desc: 'Tetiklenme zamanı.' }],
        examples: [{ title: 'Her Sabah 08:30 (Cron)', code: '30 8 * * *', explanation: 'Sabah 08:30\'da çalışır.' }]
    },
    {
        id: 'NOTIFICATION_TRIGGER', title: 'Notification Trigger', type: 'trigger', summary: 'Gelen bildirimleri yakalar.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔔 Bildirim Yakalama</h3>
                <p>Telefonunuza gelen herhangi bir bildirimi (WhatsApp, Banka, SMS) okuyarak tetiklenir.</p>
            </div>
        `,
        params: [
            { name: 'App Name', type: 'String', required: true, desc: 'Uygulamanın adı (Örn: WhatsApp).' },
            { name: 'Filter', type: 'String', required: false, desc: 'Filtre kelimesi.' }
        ],
        outputs: [{ field: 'text', type: 'String', desc: 'Bildirim içeriği.' }],
        examples: [{ title: 'Banka SMS Takibi', code: 'App: Mesajlar\nFilter: Harcama', explanation: 'SMS gelince harcamayı kaydeder.' }]
    },

    // ═════════════════════════════════════════
    // LOGIC & CONTROL
    // ═════════════════════════════════════════
    {
        id: 'IF_ELSE', title: 'IF / Else', type: 'control', summary: 'Karar verme mekanizması.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🤔 Karar Ağacı</h3>
                <p>Akışın gidişatını bir koşula göre değiştirir.</p>
            </div>
        `,
        params: [{ name: 'Condition', type: 'Expression', required: true, desc: 'JavaScript mantıksal ifadesi.' }],
        outputs: [],
        examples: [{ title: 'Koşullu Çalışma', code: '{{fiyat}} > 100', explanation: 'Fiyat 100\'den büyükse çalışır.' }]
    },
    {
        id: 'LOOP', title: 'Loop (Döngü)', type: 'control', summary: 'Liste üzerinde işlem yapar.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔄 Döngü</h3>
                <p>Elinizde bir liste varsa, bu düğüm her biri için akışı tekrar çalıştırır.</p>
            </div>
        `,
        params: [{ name: 'Items', type: 'Array', required: true, desc: 'İşlenecek liste.' }],
        outputs: [{ field: 'item', type: 'Any', desc: 'Tekil eleman.' }],
        examples: [{ title: 'Toplu İşlem', code: 'Items: {{emails}}', explanation: 'Her e-posta için işlem yapar.' }]
    },

    // ═════════════════════════════════════════
    // DEVICE & PHONE
    // ═════════════════════════════════════════
    {
        id: 'NOTIFICATION', title: 'Notification', type: 'device', summary: 'Bildirim göster.',
        overviewHTML: '<p>Kullanıcıya bildirim gösterir.</p>',
        params: [{ name: 'Message', type: 'String', required: true, desc: 'Mesaj.' }],
        outputs: [],
        examples: [{ title: 'Bilgi Ver', code: 'Message: "İşlem Tamam!"', explanation: 'Bittiğinde haber verir.' }]
    },
    {
        id: 'BATTERY_CHECK', title: 'Battery Check', type: 'device', summary: 'Pil durumunu sorgular.',
        overviewHTML: '<p>Pil seviyesini kontrol eder.</p>',
        params: [],
        outputs: [{ field: 'level', type: 'Number', desc: 'Pil yüzdesi.' }],
        examples: [{ title: 'Pil Kontrolü', code: 'IF {{level}} < 20', explanation: 'Pil azsa uyarır.' }]
    },
    {
        id: 'APP_LAUNCH', title: 'Launch App', type: 'device', summary: 'Uygulama aç.',
        overviewHTML: '<p>Telefondaki bir uygulamayı başlatır.</p>',
        params: [{ name: 'Package Name', type: 'String', required: true, desc: 'Örn: com.whatsapp' }],
        outputs: [],
        examples: [{ title: 'Spotify Aç', code: 'com.spotify.music', explanation: 'Müzik uygulamasını açar.' }]
    },

    // ═════════════════════════════════════════
    // GOOGLE & SOCIAL
    // ═════════════════════════════════════════
    {
        id: 'GMAIL_SEND', title: 'Gmail Send', type: 'google', summary: 'E-posta gönder.',
        overviewHTML: '<p>Gmail üzerinden e-posta atar.</p>',
        params: [{ name: 'To', type: 'String', required: true, desc: 'Alıcı.' }, { name: 'Subject', type: 'String', required: true, desc: 'Konu.' }],
        outputs: [],
        examples: [{ title: 'Mail At', code: 'To: me@test.com', explanation: 'Mail gönderir.' }]
    },
    {
        id: 'SHEETS_WRITE', title: 'Sheets Row', type: 'google', summary: 'Satır ekle.',
        overviewHTML: '<p>Google Sheets\'e satır ekler.</p>',
        params: [{ name: 'Spreadsheet ID', type: 'String', required: true, desc: 'ID.' }, { name: 'Values', type: 'Array', required: true, desc: '["A", "B"]' }],
        outputs: [],
        examples: [{ title: 'Veri Kaydet', code: 'Values: ["Test", 123]', explanation: 'Veriyi kaydeder.' }]
    }
];

export default function DocsPage() {
    const [selectedNodeId, setSelectedNodeId] = useState<string>(NODES[0].id);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'params' | 'examples' | 'credentials'>('overview');

    const selectedNode = useMemo(() => NODES.find(n => n.id === selectedNodeId) || NODES[0], [selectedNodeId]);

    const filteredNodes = useMemo(() => {
        return NODES.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm]);

    const nodesByCategory = useMemo(() => {
        const groups: Record<string, NodeDoc[]> = {};
        Object.keys(CATEGORY_STYLES).forEach(k => groups[k] = []);
        filteredNodes.forEach(node => {
            if (groups[node.type]) {
                groups[node.type].push(node);
            } else {
                if (!groups['device']) groups['device'] = [];
                groups['device'].push(node);
            }
        });
        return groups;
    }, [filteredNodes]);

    return (
        <div className={styles.pageContainer}>
            {/* SIDEBAR */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>BreviAI Encyclopedia</div>
                    <div className={styles.version}>v13.0</div>
                </div>
                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="Ara (Realtime, Web...)"
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.nodeTree}>
                    {Object.entries(CATEGORY_STYLES).map(([type, style]) => {
                        const nodes = nodesByCategory[type];
                        if (!nodes || nodes.length === 0) return null;
                        return (
                            <div key={type} className={styles.categoryGroup}>
                                <div className={styles.categoryTitle} style={{ color: style.color }}>
                                    <span className={styles.catIcon}>{style.icon}</span> {style.label}
                                </div>
                                <div className={styles.nodeList}>
                                    {nodes.map(node => (
                                        <button
                                            key={node.id}
                                            className={`${styles.nodeItem} ${selectedNodeId === node.id ? styles.activeNode : ''}`}
                                            onClick={() => { setSelectedNodeId(node.id); setActiveTab('overview'); }}
                                        >
                                            {node.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className={styles.mainContent}>
                <div className={styles.heroSection}>
                    <div className={styles.heroIcon} style={{
                        backgroundColor: CATEGORY_STYLES[selectedNode.type]?.color + '20' || '#333',
                        color: CATEGORY_STYLES[selectedNode.type]?.color || '#fff'
                    }}>
                        {CATEGORY_STYLES[selectedNode.type]?.icon || '📦'}
                    </div>
                    <div className={styles.heroText}>
                        <h1 className={styles.nodeTitle}>{selectedNode.title}</h1>
                        <p className={styles.nodeSummary}>{selectedNode.summary}</p>
                    </div>
                </div>

                <div className={styles.tabsContainer}>
                    {(['overview', 'params', 'examples', 'credentials'] as const).map(tab => (
                        <button
                            key={tab}
                            className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'overview' ? 'Nasıl Çalışır?' :
                                tab === 'params' ? 'Parametreler' :
                                    tab === 'examples' ? 'Örnek Senaryolar' : 'Yetkiler'}
                        </button>
                    ))}
                </div>

                <div className={styles.contentArea}>
                    {activeTab === 'overview' && (
                        <div className={styles.prose} dangerouslySetInnerHTML={{ __html: selectedNode.overviewHTML }} />
                    )}

                    {activeTab === 'params' && (
                        <div className={styles.paramsTableWrapper}>
                            <table className={styles.paramsTable}>
                                <thead>
                                    <tr><th>Parametre</th><th>Tip</th><th>Zorunlu</th><th>Açıklama</th></tr>
                                </thead>
                                <tbody>
                                    {selectedNode.params.map((p, i) => (
                                        <tr key={i}>
                                            <td className={styles.fontMono}>{p.name}</td>
                                            <td><span className={styles.tag}>{p.type}</span></td>
                                            <td>{p.required ? '✅' : '-'}</td>
                                            <td>{p.desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {selectedNode.outputs.length > 0 && (
                                <div className={styles.outputSection}>
                                    <h3 className={styles.sectionHeader}>Çıktılar (Outputs)</h3>
                                    <ul className={styles.outputList}>
                                        {selectedNode.outputs.map((o, i) => (
                                            <li key={i}><code className={styles.outputField}>{o.field}</code> ({o.type}): {o.desc}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'examples' && (
                        <div className={styles.examplesList}>
                            {selectedNode.examples.map((ex, i) => (
                                <div key={i} className={styles.exampleCard}>
                                    <h4 className={styles.exampleTitle}>{ex.title}</h4>
                                    <p className={styles.exampleDesc}>{ex.explanation}</p>
                                    <div className={styles.codeBlock}>
                                        <div className={styles.codeHeader}>Örnek Ayarlar</div>
                                        <pre>{ex.code}</pre>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'credentials' && (
                        <div className={styles.credentialsBox}>
                            <h3 className={styles.sectionHeader}>🔑 Yetkilendirme</h3>
                            {selectedNode.credentials
                                ? <p>{selectedNode.credentials}</p>
                                : <p>Bu işlem için özel bir API anahtarı veya giriş yapmanız gerekmez. Açık sistemleri kullanır.</p>
                            }
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
