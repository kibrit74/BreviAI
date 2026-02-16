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

// --- V12: ENCYCLOPEDIA CONTENT (EVERY NODE DETAILED) ---
const NODES: NodeDoc[] = [
    // ═════════════════════════════════════════
    // TRIGGERS (Tetikleyiciler)
    // ═════════════════════════════════════════
    {
        id: 'MANUAL', title: 'Manual Trigger', type: 'trigger', summary: 'Akışı elle veya butonla başlatır.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔍 Nasıl Çalışır?</h3>
                <p>Bu düğüm, akışın başlangıç noktasıdır. Genellikle test amaçlı veya kullanıcının bir butona basarak başlattığı senaryolarda kullanılır.</p>
                <div class="tip-box">💡 <strong>İpucu:</strong> Akışınızı test ederken her zaman bu düğümü kullanın. "Play" butonuna bastığınızda bu düğüm tetiklenir.</div>
            </div>
            <div class="guide-section">
                <h3>📝 Form Alanları (Form Fields)</h3>
                <p>Eğer akış başladığında kullanıcıdan bilgi istemek istiyorsanız (örn: "Hangi e-postayı özetleyeyim?"), <code>Form Fields</code> parametresini kullanın.</p>
                <ul>
                    <li><strong>Text:</strong> Metin girişi.</li>
                    <li><strong>Number:</strong> Sayı girişi.</li>
                    <li><strong>Select:</strong> Seçim listesi.</li>
                </ul>
            </div>
        `,
        params: [{ name: 'Form Fields', type: 'Array', required: false, desc: 'Kullanıcıdan istenecek verilerin listesi (JSON formatında).' }],
        outputs: [{ field: 'formData', type: 'Object', desc: 'Kullanıcının girdiği veriler. Örn: {{formData.query}}' }],
        examples: [
            {
                title: 'Basit Kullanıcı Girişi',
                code: `// Form Fields Parametresi:
[
  { "name": "konu", "type": "text", "label": "Ne hakkında şiir yazayım?" },
  { "name": "uzunluk", "type": "number", "label": "Kaç kıta olsun?" }
]`,
                explanation: 'Bu ayar ile akış başladığında kullanıcıya iki soru sorulur. Girilen cevaplar sonraki düğümlerde {{formData.konu}} olarak kullanılabilir.'
            }
        ]
    },
    {
        id: 'TIME_TRIGGER', title: 'Cron / Interval', type: 'trigger', summary: 'Zamanlanmış görevler oluşturur.',
        overviewHTML: `
            <div class="guide-section">
                <h3>⏰ Zamanlayıcı Nedir?</h3>
                <p>Bu düğüm, akışın sizin müdahaleniz olmadan, belirli zamanlarda otomatik çalışmasını sağlar. İki modu vardır:</p>
                <ul>
                    <li><strong>Interval (Aralık):</strong> "Her 15 dakikada bir çalış", "Her 2 saatte bir çalış" gibi tekrarlı işlemler.</li>
                    <li><strong>Cron (Takvim):</strong> "Her Pazartesi sabah 09:00'da çalış" gibi hassas zamanlamalar.</li>
                </ul>
            </div>
            <div class="guide-section">
                <h3>⚠️ Önemli Uyarılar</h3>
                <div class="alert-box">Android kısıtlamaları nedeniyle, zamanlayıcılar bazen "Doze Mode" (Pil Tasarrufu) yüzünden birkaç dakika gecikebilir. Kesin saniye hassasiyeti beklemeyin.</div>
            </div>
        `,
        params: [
            { name: 'Mode', type: 'Select', required: true, desc: 'Interval (Basit) veya Cron (Gelişmiş).' },
            { name: 'Value', type: 'String', required: true, desc: 'Dakika sayısı veya Cron ifadesi.' }
        ],
        outputs: [{ field: 'timestamp', type: 'Number', desc: 'Tetiklenme zamanı (Unix Time).' }],
        examples: [
            { title: 'Her Sabah 08:30 (Cron)', code: '30 8 * * *', explanation: 'Cron formatı: Dakika(30) Saat(8) Gün(*) Ay(*) HaftanınGünü(*)' },
            { title: 'Hafta İçi Her Gün (Cron)', code: '0 9 * * 1-5', explanation: 'Sadece Pazartesi(1) - Cuma(5) arası sabah 09:00.' }
        ]
    },
    {
        id: 'WEBHOOK', title: 'Webhook', type: 'trigger', summary: 'Dış dünyadan gelen verileri yakalar.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🌐 Webhook Nedir?</h3>
                <p>Webhook, BreviAI'ye dışarıdan (IFTTT, Zapier, kendi sunucunuz veya bir web formu) veri göndermenin yoludur. Size özel bir URL üretilir.</p>
            </div>
            <div class="guide-section">
                <h3>🚀 Nasıl Kullanılır?</h3>
                <ol>
                    <li>Bu düğümü ekleyin ve bir <code>Path</code> (örn: <code>/form-submit</code>) belirleyin.</li>
                    <li>Size verilen URL'i kopyalayın: <code>https://api.breviai.com/webhook/form-submit</code></li>
                    <li>Bu URL'e POST isteği atıldığında akış çalışır.</li>
                </ol>
            </div>
        `,
        params: [
            { name: 'Path', type: 'String', required: true, desc: 'URL\'in son kısmı. Benzersiz olmalı.' },
            { name: 'Method', type: 'Select', required: true, desc: 'HTTP Metodu (Genellikle POST).' }
        ],
        outputs: [{ field: 'body', type: 'Object', desc: 'Gelen JSON verisi.' }, { field: 'query', type: 'Object', desc: 'URL parametreleri.' }],
        examples: [
            { title: 'Google Forms Entegrasyonu', code: 'Path: /basvuru-al', explanation: 'Google Forms\'tan bu adrese veri gönderildiğinde akış başlar ve gelen veriyi işler.' }
        ]
    },
    {
        id: 'NOTIFICATION_TRIGGER', title: 'Notification Trigger', type: 'trigger', summary: 'Gelen bildirimleri yakalar.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔔 Bildirim Yakalama</h3>
                <p>Telefonunuza gelen herhangi bir bildirimi (WhatsApp, Banka, SMS) okuyarak tetiklenir. Bu sayede API'si olmayan uygulamaları bile otomatize edebilirsiniz.</p>
            </div>
             <div class="guide-section">
                <h3>🔒 İzinler Hakkında</h3>
                <div class="alert-box">Bu özelliğin çalışması için Android ayarlarından BreviAI'ye "Bildirimlere Erişim İzni" vermeniz gerekir. İlk kurulumda size sorulacaktır.</div>
            </div>
        `,
        params: [
            { name: 'App Name', type: 'String', required: true, desc: 'Uygulamanın adı (Örn: WhatsApp, Mesajlar).' },
            { name: 'Filter', type: 'String', required: false, desc: 'Sadece bu kelimeyi içeren bildirimleri yakala.' }
        ],
        outputs: [{ field: 'title', type: 'String', desc: 'Bildirimi gönderen (Kişi/Kurum).' }, { field: 'text', type: 'String', desc: 'Bildirim içeriği.' }],
        examples: [
            { title: 'Banka Harcama Takibi', code: 'App: Mesajlar\nFilter: "Harcama"', explanation: 'Bankadan "Harcama" kelimesi içeren bir SMS geldiğinde çalışır ve harcamayı Excel\'e kaydeder.' },
            { title: 'OTP (Şifre) Yakalama', code: 'App: Mesajlar\nFilter: "Doğrulama kodu"', explanation: 'SMS ile gelen doğrulama kodunu yakalar ve panoya kopyalar.' }
        ]
    },
    {
        id: 'CALL_TRIGGER', title: 'Call Trigger', type: 'trigger', summary: 'Telefon aramalarını takip eder.',
        overviewHTML: `
            <div class="guide-section">
                <h3>📞 Arama Yönetimi</h3>
                <p>Gelen, giden veya sonlanan aramaları algılar. Sekreterya otomasyonları veya CRM kayıtları için idealdir.</p>
            </div>
            <div class="guide-section">
                <h3>🎛️ Durumlar (States)</h3>
                <ul>
                    <li><strong>Incoming:</strong> Telefon çalmaya başladığında (Henüz açılmadı).</li>
                    <li><strong>Connected:</strong> Görüşme başladığında.</li>
                    <li><strong>Ended:</strong> Görüşme bittiğinde (Kapadığında).</li>
                </ul>
            </div>
        `,
        params: [
            { name: 'State', type: 'Select', required: true, desc: 'Hangi durumda çalışsın?' },
            { name: 'Phone Number', type: 'String', required: false, desc: 'Sadece bu numara ararsa çalış.' }
        ],
        outputs: [{ field: 'number', type: 'String', desc: 'Arayan/Aranan numara.' }, { field: 'name', type: 'String', desc: 'Rehberdeki adı (varsa).' }],
        examples: [
            { title: 'Meşgulken SMS At', code: 'State: Incoming\nPhone: (Boş)', explanation: 'Telefon çaldığında arayan kişiye "Şu an toplantıdayım" mesajı atar.' },
            { title: 'Görüşme Kaydı', code: 'State: Ended', explanation: 'Görüşme bitince kiminle ne zaman konuştuğunuzu Google Sheets\'e yazar.' }
        ]
    },
    {
        id: 'GEOFENCE_ENTER', title: 'Geofence Enter', type: 'trigger', summary: 'Bir konuma girince çalışır.',
        overviewHTML: `
            <div class="guide-section">
                <h3>📍 Coğrafi Çit (Geofence) Nedir?</h3>
                <p>Haritada sanal bir daire çizersiniz (Ev, İş, Okul). Telefonunuz bu dairenin içine girdiğinde akış otomatik başlar.</p>
            </div>
             <div class="guide-section">
                <h3>🔋 Pil Tüketimi</h3>
                <p>BreviAI, pil tasarrufu için GPS'i sürekli kullanmaz. Baz istasyonu ve Wi-Fi verilerini kullanır. Bu yüzden algılama 1-2 dakika gecikmeli olabilir.</p>
            </div>
        `,
        params: [
            { name: 'Lat/Long', type: 'Coordinates', required: true, desc: 'Merkez koordinat.' },
            { name: 'Radius', type: 'Number', required: true, desc: 'Dairenin yarıçapı (Metre cinsinden). En az 100m önerilir.' }
        ],
        outputs: [],
        examples: [
            { title: 'Eve Geldim Modu', code: 'Konum: Evim\nRadius: 150m', explanation: 'Eve 150m yaklaştığınızda Wi-Fi\'yi açar ve eşinize "Geldim" mesajı atar.' }
        ]
    },

    // ═════════════════════════════════════════
    // AI (YAPAY ZEKA) - EXPANDED
    // ═════════════════════════════════════════
    {
        id: 'AGENT_AI', title: 'AI Agent (LLM)', type: 'ai', summary: 'Akıllı metin işleme ve üretme asistanı.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🧠 Agent AI: BreviAI'nin Beyni</h3>
                <p>Bu düğüm, dünyanın en gelişmiş yapay zeka modellerine (GPT-4o, Gemini 1.5 Pro) doğrudan erişim sağlar. Sadece "sohbet etmek" için değil, karmaşık verileri analiz etmek, karar vermek ve içerik üretmek için kullanılır.</p>
            </div>
            
            <div class="guide-section">
                <h3>🤖 Modeller Arasındaki Farklar</h3>
                <ul>
                    <li><strong>Gemini 1.5 Flash:</strong> Çok hızlı ve ucuz. Basit işlemler (Özetleme, Sınıflandırma) için ideal.</li>
                    <li><strong>GPT-4o:</strong> En zeki model. Karmaşık mantık, kod yazma ve yaratıcı içerik için en iyisi.</li>
                    <li><strong>Claude 3.5 Sonnet:</strong> Kodlama ve doğal dilde çok başarılı.</li>
                </ul>
            </div>

            <div class="guide-section">
                <h3>✨ Prompt Mühendisliği 101 (Nasıl Emir Verilir?)</h3>
                <div class="tip-box">Yapay zeka bir stajyer gibidir. Ne kadar net olursanız o kadar iyi sonuç alırsınız.</div>
                <p><strong>Kötü Prompt:</strong> "Bunu özetle." (Neyi? Ne kadar kısa? Hangi dilde?)</p>
                <p><strong>Mükemmel Prompt:</strong> "Aşağıdaki müşteri şikayet mailini oku. 1. Müşterinin ana sorunu ne? 2. Duygu durumu ne (Sinirli/Üzgün)? 3. Ona kibar bir cevap taslağı hazırla. Metin: {{mail_body}}"</p>
            </div>

             <div class="guide-section">
                 <h3>📄 Output Format (Çıktı Formatı)</h3>
                 <p>Genellikle AI size düz yazı (String) döner. Ama bir sonraki düğümde kullanmak için <strong>JSON</strong> isteyebilirsiniz.</p>
                 <p>Promptunuza şunu ekleyin: <em>"Cevabı sadece geçerli bir JSON formatında ver. Örn: { 'ozet': '...', 'duygu': '...' }"</em></p>
             </div>
        `,
        params: [
            { name: 'Model', type: 'Select', required: true, desc: 'İşin zorluğuna göre model seçin.' },
            { name: 'Prompt', type: 'Text', required: true, desc: 'AI\'a verilecek detaylı talimat.' },
            { name: 'System Prompt', type: 'Text', required: false, desc: 'AI\'ın rolü (Örn: "Sen uzman bir avukatsın").' }
        ],
        outputs: [{ field: 'content', type: 'String', desc: 'AI\'ın ürettiği cevap (Text veya JSON).' }],
        examples: [
            {
                title: '📧 E-posta Sınıflandırma & Yanıtlama',
                code: `Prompt:
"Aşağıdaki e-postayı analiz et ve kategorisini bul (Fatura / Destek / Reklam).
Eğer Destek ise, kullanıcıya çözüm öneren kısa bir cevap yaz.
Değilse 'İşlem Gerekmiyor' yaz.
E-posta: {{gmail.body}}"`,
                explanation: 'Gelen mailleri otomatik olarak okur, anlar ve sadece gerekli olanlara cevap taslağı hazırlar.'
            },
            {
                title: '📊 Veri Çıkarma (Extraction)',
                code: `Prompt:
"Aşağıdaki metinden tarih, saat ve yer bilgilerini çıkarıp JSON olarak ver.
Metin: 'Yarın akşam 8'de Kadıköy Starbucks'ta buluşalım.'
Beklenen Çıktı: { 'date': '...', 'time': '...', 'location': '...' }"`,
                explanation: 'Doğal dildeki mesajlardan yapılandırılmış veri (Tarih, Yer) çıkarır. Bu veriyi Takvim düğümüne gönderebilirsiniz.'
            },
            {
                title: '💻 Kod / Script Yazma',
                code: `Prompt: "Bana Python ile bir PDF birleştirme scripti yaz. Kodun içine yorum satırları ekle."`,
                explanation: 'Teknik işleriniz için kod parçacıkları üretir.'
            }
        ]
    },

    // ═════════════════════════════════════════
    // LOGIC & CONTROL (Karar Mekanizması)
    // ═════════════════════════════════════════
    {
        id: 'IF_ELSE', title: 'IF / Else', type: 'control', summary: 'Karar verme mekanizması.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🤔 Karar Ağacı</h3>
                <p>Akışın gidişatını bir koşula göre değiştirir. Otomasyonun "Zekası" buradadır.</p>
                <ul>
                    <li><strong>True (Doğru):</strong> Koşul sağlanırsa (Örn: Fiyat > 100) üstteki yeşil porttan devam eder.</li>
                    <li><strong>False (Yanlış):</strong> Koşul sağlanmazsa alttaki kırmızı porttan devam eder.</li>
                </ul>
            </div>
            <div class="guide-section">
                <h3>📝 Operatörler Rehberi</h3>
                <table class="simple-table">
                    <tr><td>==</td><td>Eşittir</td><td>{{age}} == 18</td></tr>
                    <tr><td>!=</td><td>Eşit Değil</td><td>{{status}} != "Active"</td></tr>
                    <tr><td>></td><td>Büyüktür</td><td>{{price}} > 5000</td></tr>
                    <tr><td>includes</td><td>İçerir</td><td>{{text}}.includes("Hata")</td></tr>
                </table>
            </div>
        `,
        params: [{ name: 'Condition', type: 'Expression', required: true, desc: 'JavaScript mantıksal ifadesi.' }],
        outputs: [],
        examples: [
            { title: 'Mesai Saati Kontrolü', code: 'new Date().getHours() >= 9 && new Date().getHours() <= 18', explanation: 'Sadece sabah 9 ile akşam 6 arasında çalışır.' },
            { title: 'Anahtar Kelime Filtresi', code: '{{sms.message}}.toLowerCase().includes("acil")', explanation: 'Mesajda "acil" kelimesi geçiyorsa True yoluna gider.' }
        ]
    },
    {
        id: 'LOOP', title: 'Loop (Döngü)', type: 'control', summary: 'Bir liste üzerinde tek tek işlem yapar.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔄 Döngü Nedir?</h3>
                <p>Elinizde bir liste varsa (Örn: 50 tane e-posta, 10 tane fotoğraf), bu düğüm her biri için akışı tekrar çalıştırır.</p>
            </div>
            <div class="guide-section">
                <h3>⚙️ Çalışma Mantığı</h3>
                <ol>
                    <li><strong>Giriş (Array):</strong> Listeyi alır (Örn: <code>{{gmail.emails}}</code>).</li>
                    <li><strong>İşlem (Loop Body):</strong> Listedeki 1. elemanı alır, işlem yapar. Sonra 2. elemanı alır...</li>
                    <li><strong>Bitiş (Done):</strong> Liste bitince "Loop End" portundan çıkar.</li>
                </ol>
            </div>
        `,
        params: [{ name: 'Items', type: 'Array', required: true, desc: 'İşlenecek liste verisi.' }],
        outputs: [{ field: 'item', type: 'Any', desc: 'O an işlenen tekil eleman.' }, { field: 'index', type: 'Number', desc: 'Sıra numarası (0, 1, 2...)' }],
        examples: [
            { title: 'Toplu SMS Gönderimi', code: 'Items: {{google_sheets.rows}}\nAction: SMS Send (To: {{loop.item.phone}})', explanation: 'Excel listesindeki herkese sırayla SMS atar.' }
        ]
    },

    // ═════════════════════════════════════════
    // WEB & API
    // ═════════════════════════════════════════
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
    // DEVICE & PHONE (Cihaz Kontrolü)
    // ═════════════════════════════════════════
    {
        id: 'NOTIFICATION', title: 'Notification', type: 'device', summary: 'Bildirim göster.',
        overviewHTML: `
            <div class="guide-section">
                <h3>📱 Bildirim Gösterme</h3>
                <p>Kullanıcıya bilgi vermek için telefonun kendi bildirim sistemini kullanır. Sesli uyarı veya titreşim de verebilir.</p>
            </div>
        `,
        params: [
            { name: 'Title', type: 'String', required: false, desc: 'Bildirim başlığı (Kalın yazı).' },
            { name: 'Message', type: 'String', required: true, desc: 'Bildirim metni.' }
        ],
        outputs: [],
        examples: [{ title: 'Akış Bitti Bilgisi', code: 'Title: BreviAI\nMessage: "Rapor başarıyla gönderildi! ✅"', explanation: 'İşlem tamamlanınca kullanıcıyı uyarır.' }]
    },
    {
        id: 'APP_LAUNCH', title: 'Launch App', type: 'device', summary: 'Uygulama aç.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🚀 Uygulama Başlatıcı</h3>
                <p>Telefondaki yüklü bir uygulamayı açar. Rutinlerin sonunda kullanıcıyı yönlendirmek için harikadır.</p>
            </div>
             <div class="guide-section">
                <h3>📦 Paket Adı (Package Name) Bulma</h3>
                <p>Uygulamaların kimlik numarasıdır. Google Play linkine bakarak bulabilirsiniz: <code>id=com.whatsapp</code></p>
                <ul>
                    <li>WhatsApp: <code>com.whatsapp</code></li>
                    <li>Youtube: <code>com.google.android.youtube</code></li>
                    <li>Maps: <code>com.google.android.apps.maps</code></li>
                </ul>
            </div>
        `,
        params: [{ name: 'Package Name', type: 'String', required: true, desc: 'Örn: com.instagram.android' }],
        outputs: [],
        examples: [{ title: 'Sabah Rutini', code: 'Package: com.spotify.music', explanation: 'Günaydın mesajı okunduktan sonra müziği açar.' }]
    },
    {
        id: 'BATTERY_CHECK', title: 'Battery Level', type: 'device', summary: 'Pil durumunu kontrol eder.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔋 Güç Yönetimi</h3>
                <p>Şarj seviyesini (%) veya şarjda olup olmadığını (Charging) kontrol eder. "Pil azsa parlaklığı kıs" gibi senaryolarda kullanılır.</p>
            </div>
        `,
        params: [],
        outputs: [{ field: 'level', type: 'Number', desc: '0 ile 100 arası pil yüzdesi.' }, { field: 'isCharging', type: 'Boolean', desc: 'Şarj oluyor mu?' }],
        examples: [{ title: 'Düşük Pil Uyarısı', code: 'IF {{battery.level}} < 20', explanation: 'Pil %20 altına düştüyse tasarruf modunu aç.' }]
    },

    // ═════════════════════════════════════════
    // GOOGLE & SOCIAL
    // ═════════════════════════════════════════
    {
        id: 'GMAIL_SEND', title: 'Gmail Send', type: 'google', summary: 'E-posta gönderir.',
        overviewHTML: `
            <div class="guide-section">
                <h3>✉️ Gmail Otomasyonu</h3>
                <p>Sizin adınıza (connected account) e-posta gönderir. Dosya eki (Attachment) ve HTML formatını destekler.</p>
            </div>
            <div class="guide-section">
                <h3>🔑 Yetkilendirme</h3>
                <p>Bu düğümü kullanmak için BreviAI'ye Google hesabınızla giriş yapıp izin vermeniz (Sign in with Google) yeterlidir.</p>
            </div>
        `,
        params: [
            { name: 'To', type: 'String', required: true, desc: 'Alıcı e-posta adresi.' },
            { name: 'Subject', type: 'String', required: true, desc: 'Konu.' },
            { name: 'Body', type: 'Text', required: true, desc: 'Mesaj içeriği (HTML olabilir).' }
        ],
        outputs: [],
        examples: [{ title: 'Günlük Rapor', code: 'To: patron@sirket.com\nSubject: Günlük Satışlar\nBody: {{report.text}}', explanation: 'Hazırlanan raporu yöneticiye mail atar.' }]
    },
    {
        id: 'SHEETS_WRITE', title: 'Sheets Row', type: 'google', summary: 'Google tablosuna satır ekler.',
        overviewHTML: `
            <div class="guide-section">
                <h3>📊 Veri Kaydı</h3>
                <p>Google Sheets dosyanıza yeni bir satır ekler. En çok form verilerini, harcamaları veya müşteri kayıtlarını saklamak için kullanılır.</p>
            </div>
        `,
        params: [
            { name: 'Spreadsheet ID', type: 'String', required: true, desc: 'Dosya URL\'sindeki uzun kod.' },
            { name: 'Values', type: 'Array', required: true, desc: 'Sırasıyla sütunlara yazılacak veriler: ["Ali", "500 TL", "Onaylandı"]' }
        ],
        outputs: [],
        examples: [{ title: 'Harcama Ekleme', code: 'Values: ["Kahve", "80 TL", "{{date}}"]', explanation: 'Harcamayı tarihle birlikte tabloya kaydeder.' }]
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
                    <div className={styles.version}>v12.0</div>
                </div>
                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="Rehberde ara..."
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
                                    <p className={styles.textMuted}>Bu düğüm çalıştıktan sonra elinizde şu veriler olur:</p>
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
