import { useState, useMemo } from 'react';
import '../app/globals.css';
import styles from './docs.module.css';

// --- ICONS & COLORS ---
const CATEGORY_STYLES: Record<string, { color: string; icon: string; label: string }> = {
    trigger: { color: '#10B981', icon: '⚡', label: 'Tetikleyiciler (Triggers)' },
    control: { color: '#6366F1', icon: '🔀', label: 'Kontrol & Mantık' },
    ai: { color: '#EC4899', icon: '✨', label: 'Yapay Zeka (AI)' },
    web: { color: '#06B6D4', icon: '🌍', label: 'Web & API' },
    device: { color: '#EF4444', icon: '📱', label: 'Cihaz & Sensörler' },
    communication: { color: '#F97316', icon: '💬', label: 'İletişim & Sosyal' },
    google: { color: '#4285F4', icon: '🌐', label: 'Google Servisleri' },
    microsoft: { color: '#0078D4', icon: '🪟', label: 'Microsoft Office' },
    files: { color: '#F59E0B', icon: '📂', label: 'Dosya & Veri' },
    location: { color: '#8B5CF6', icon: '📍', label: 'Konum (Location)' },
    input: { color: '#8B5CF6', icon: '🖱️', label: 'Kullanıcı Girişi' },
    output: { color: '#F59E0B', icon: '📤', label: 'Çıktı & Bildirim' },
    audio: { color: '#EF4444', icon: '🔊', label: 'Ses & Konuşma' },
    calendar: { color: '#8B5CF6', icon: '📅', label: 'Takvim & Kişiler' },
    smart_home: { color: '#FCD34D', icon: '🏠', label: 'Akıllı Ev' },
    memory: { color: '#6366F1', icon: '🧠', label: 'Hafıza (RAG)' },
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
    examples: NodeExample[];
}

const NODES: NodeDoc[] = [
    // ═════════════════════════════════════════
    // 1. TRIGGERS (TETİKLEYİCİLER) - COMPLETE
    // ═════════════════════════════════════════
    {
        id: 'MANUAL_TRIGGER', title: 'Manual Trigger', type: 'trigger', summary: 'Butona basınca çalışır.',
        overviewHTML: `<p>Otomasyonu test etmek veya manuel başlatmak için kullanılır. "Play" ikonuna bastığınızda bu tetiklenir.</p>`,
        params: [],
        examples: [{ title: 'Test', code: 'Play butonuna bas.', explanation: 'Manuel başlatma.' }]
    },
    {
        id: 'TIME_TRIGGER', title: 'Cron / Interval', type: 'trigger', summary: 'Zamanlanmış görevler.',
        overviewHTML: `<p>Belirli saatlerde veya aralıklarla (örn: her 5 dakikada bir) çalışır.</p>`,
        params: [{ name: 'Mode', type: 'Select', required: true, desc: 'Interval / Cron' }, { name: 'Value', type: 'String', required: true, desc: 'Dakika veya Cron ifadesi (* * * * *)' }],
        examples: [{ title: 'Sabah Alarmı', code: 'Cron: 0 8 * * *', explanation: 'Her sabah 08:00.' }]
    },
    {
        id: 'NOTIFICATION_TRIGGER', title: 'Notification Received', type: 'trigger', summary: 'Bildirim gelince çalışır.',
        overviewHTML: `<p>WhatsApp, Instagram veya Banka uygulamasından bildirim geldiğinde tetiklenir.</p>`,
        params: [{ name: 'App Name', type: 'String', required: true, desc: 'Uygulama adı (örn: WhatsApp)' }, { name: 'Filter', type: 'String', required: false, desc: 'İçerik filtresi.' }],
        examples: [{ title: 'SMS Okuma', code: 'App: Mesajlar\nFilter: "Şifreniz"', explanation: 'SMS şifrelerini yakalar.' }]
    },
    {
        id: 'GEOFENCE_TRIGGER', title: 'Geofence Trigger', type: 'trigger', summary: 'Konum bazlı tetikleme.',
        overviewHTML: `<p>Belirlenen bir alana girince (Enter) veya çıkınca (Exit) çalışır.</p>`,
        params: [{ name: 'Latitude', type: 'Number', required: true, desc: 'Enlem' }, { name: 'Longitude', type: 'Number', required: true, desc: 'Boylam' }, { name: 'Radius', type: 'Number', required: true, desc: 'Metre (Örn: 100)' }],
        examples: [{ title: 'Eve Dönüş', code: 'Lat: 41.00, Lon: 29.00, Radius: 200m', explanation: 'Eve yaklaşınca Wi-Fi aç.' }]
    },
    {
        id: 'CHAT_INPUT_TRIGGER', title: 'Chat Input', type: 'trigger', summary: 'Sohbetten yazınca çalışır.',
        overviewHTML: `<p>AI Asistan ile sohbet ederken yazdığınız mesaja göre tetiklenir.</p>`,
        params: [{ name: 'Keyword', type: 'String', required: false, desc: 'Özel komut (örn: "/hava")' }],
        examples: [{ title: 'Hava Durumu Sor', code: 'User: "Hava nasıl?"', explanation: 'Chat penceresinden tetiklenir.' }]
    },
    {
        id: 'DEEP_LINK_TRIGGER', title: 'Deep Link / Webhook', type: 'trigger', summary: 'URL veya Kısayol ile.',
        overviewHTML: `<p>Dışarıdan bir linke tıklayarak (brevi://run/...) otomasyonu başlatır. iPhone Kestirmeler ile uyumludur.</p>`,
        params: [{ name: 'Path', type: 'String', required: true, desc: 'Link yolu.' }],
        examples: [{ title: 'NFC Etiketi', code: 'Path: "kapiyi-ac"', explanation: 'NFC etiketine bu linki yazın.' }]
    },
    {
        id: 'EMAIL_TRIGGER', title: 'Email Received', type: 'trigger', summary: 'E-posta gelince çalışır.',
        overviewHTML: `<p>Gmail veya Outlook hesabınıza yeni e-posta düştüğünde tetiklenir.</p>`,
        params: [{ name: 'Sender', type: 'String', required: false, desc: 'Kimden (örn: banka.com)' }, { name: 'Subject', type: 'String', required: false, desc: 'Konu filtresi.' }],
        examples: [{ title: 'Fatura Takibi', code: 'Subject: "Fatura"', explanation: 'Faturaları otomatik kaydeder.' }]
    },
    {
        id: 'TELEGRAM_TRIGGER', title: 'Telegram Message', type: 'trigger', summary: 'Telegram botuna mesaj gelince.',
        overviewHTML: `<p>Telegram botunuza birisi yazdığında veya gruba mesaj atıldığında çalışır.</p>`,
        params: [{ name: 'Bot Token', type: 'String', required: true, desc: 'BotFather token.' }],
        examples: [{ title: 'Bot Komutu', code: 'Msg: "/start"', explanation: 'Botu başlatır.' }]
    },

    // ═════════════════════════════════════════
    // 2. AI & INTELLIGENCE
    // ═════════════════════════════════════════
    {
        id: 'AGENT_AI', title: 'AI Agent (LLM)', type: 'ai', summary: 'GPT-5, Gemini 3, Claude 4.5.',
        overviewHTML: `<div class="guide-section"><h3>🧠 2026 Model Desteği</h3><p>En son teknoloji yapay zeka modelleri.</p><ul><li><strong>GPT-5:</strong> Akıl yürütme.</li><li><strong>Gemini 3:</strong> Sonsuz hafıza.</li><li><strong>Claude 4.5:</strong> Kodlama uzmanı.</li></ul></div>`,
        params: [
            { name: 'Model', type: 'Select', required: true, desc: 'GPT-5, Gemini 3, etc.' },
            { name: 'Prompt', type: 'Text', required: true, desc: 'Talimat.' }
        ],
        examples: [{ title: 'Makale Yaz', code: 'Prompt: "Yapay zeka hakkında blog yazısı yaz."', explanation: 'İçerik üretir.' }]
    },
    {
        id: 'REALTIME_AI', title: 'Realtime AI (Live)', type: 'ai', summary: 'Sesli ve Görüntülü Canlı Sohbet.',
        overviewHTML: `<p>Gemini Live altyapısı ile anlık, kesintisiz sesli sohbet.</p>`,
        params: [{ name: 'Persona', type: 'Text', required: false, desc: 'Sistem rolü (Örn: Öğretmen).' }],
        examples: [{ title: 'İngilizce Pratik', code: 'Persona: "I am your English tutor."', explanation: 'Sesli pratik yapın.' }]
    },
    {
        id: 'IMAGE_GENERATOR', title: 'Image Gen 2026', type: 'ai', summary: 'Nanobana Pro / Flux.1.',
        overviewHTML: `<p>4K çözünürlükte görsel üretimi.</p>`,
        params: [{ name: 'Prompt', type: 'Text', required: true, desc: 'Görsel tarifi.' }, { name: 'Model', type: 'Select', required: true, desc: 'Flux.1, Nanobana Pro' }],
        examples: [{ title: 'Logo Tasarımı', code: 'Prompt: "Minimalist tech logo"', explanation: 'Logo üretir.' }]
    },
    {
        id: 'IMAGE_EDIT', title: 'Image Edit', type: 'ai', summary: 'Resim düzenle (Crop, Resize).',
        overviewHTML: `<p>Bir resmi yeniden boyutlandırır, kırpar veya filtre uygular.</p>`,
        params: [{ name: 'Actions', type: 'List', required: true, desc: 'Resize, Crop, Rotate' }],
        examples: [{ title: 'Thumbnail Yap', code: 'Resize: 1280x720', explanation: 'YouTube kapak resmi boyutu.' }]
    },

    // ═════════════════════════════════════════
    // 3. WEB & AUTOMATION
    // ═════════════════════════════════════════
    {
        id: 'HTTP_REQUEST', title: 'HTTP Request', type: 'web', summary: 'API İsteği at.',
        overviewHTML: `<p>REST API çağrıları yapar (GET, POST, PUT, DELETE).</p>`,
        params: [{ name: 'URL', type: 'String', required: true, desc: 'https://api.site.com' }, { name: 'Body', type: 'JSON', required: false, desc: 'Veri paketi.' }],
        examples: [{ title: 'Webhook', code: 'POST https://webhook.site/...', explanation: 'Veri gönderir.' }]
    },
    {
        id: 'WEB_AUTOMATION', title: 'Web Automation', type: 'web', summary: 'Siteyi gez (RPA).',
        overviewHTML: `<p>Bir siteye girip, butonlara tıklayıp, form doldurup veri çeker.</p>`,
        params: [{ name: 'Actions', type: 'List', required: true, desc: 'GoTo -> Click -> Type -> Scrape' }],
        examples: [{ title: 'Fiyat Takibi', code: 'GoTo Amazon -> Scrape Price', explanation: 'Fiyatı çeker.' }]
    },
    {
        id: 'RSS_READ', title: 'RSS Reader', type: 'web', summary: 'Haberleri çek.',
        overviewHTML: `<p>Web sitelerinin RSS akışlarını okur.</p>`,
        params: [{ name: 'URL', type: 'String', required: true, desc: 'rss.xml adresi.' }],
        examples: [{ title: 'Son Dakika', code: 'URL: bbcturkce.com/rss', explanation: 'Haberleri getirir.' }]
    },
    {
        id: 'GOOGLE_TRANSLATE', title: 'Translate', type: 'web', summary: 'Çeviri yap.',
        overviewHTML: `<p>Metni bir dilden diğerine çevirir.</p>`,
        params: [{ name: 'Text', type: 'String', required: true, desc: 'Metin.' }, { name: 'Target', type: 'Select', required: true, desc: 'Hedef Dil (TR).' }],
        examples: [{ title: 'Çevir', code: 'Hello -> Merhaba', explanation: 'Otomatik çeviri.' }]
    },
    {
        id: 'FACEBOOK_LOGIN', title: 'Facebook Login', type: 'web', summary: 'FB ile giriş yap.',
        overviewHTML: `<p>Otomasyon içinde Facebook yetkilendirmesi alır (Token).</p>`,
        params: [{ name: 'Permissions', type: 'List', required: false, desc: 'public_profile, email' }],
        examples: [{ title: 'Token Al', code: 'Login', explanation: 'Access Token döner.' }]
    },

    // ═════════════════════════════════════════
    // 4. MICROSOFT OFFICE
    // ═════════════════════════════════════════
    {
        id: 'OUTLOOK_SEND', title: 'Outlook Send', type: 'microsoft', summary: 'Mail gönder (Outlook).',
        overviewHTML: `<p>Microsoft hesabınızdan e-posta atar.</p>`,
        params: [{ name: 'To', type: 'String', required: true, desc: 'Alıcı' }, { name: 'Subject', type: 'String', required: true, desc: 'Konu' }],
        examples: [{ title: 'Şirket Maili', code: 'To: mudur@sirket.com', explanation: 'Resmi mail atar.' }]
    },
    {
        id: 'EXCEL_WRITE', title: 'Excel Write', type: 'microsoft', summary: 'Excel dosyasına yaz.',
        overviewHTML: `<p>OneDrive üzerindeki Excel dosyasına satır ekler.</p>`,
        params: [{ name: 'File', type: 'String', required: true, desc: 'Dosya adı.' }, { name: 'Data', type: 'Array', required: true, desc: 'Satır verisi.' }],
        examples: [{ title: 'Rapor', code: 'Row: [Tarih, Gelir]', explanation: 'Excel\'e işler.' }]
    },
    {
        id: 'ONEDRIVE_UPLOAD', title: 'OneDrive Upload', type: 'microsoft', summary: 'Dosya yükle.',
        overviewHTML: `<p>Dosyaları OneDrive bulutuna yükler.</p>`,
        params: [{ name: 'File', type: 'File', required: true, desc: 'Dosya.' }],
        examples: [{ title: 'Yedekleme', code: 'Upload log.txt', explanation: 'Buluta yedekler.' }]
    },

    // ═════════════════════════════════════════
    // 5. GOOGLE SERVICES
    // ═════════════════════════════════════════
    {
        id: 'GMAIL_SEND', title: 'Gmail Send', type: 'google', summary: 'Gmail API ile gönder.',
        overviewHTML: `<p>Resmi Gmail entegrasyonu.</p>`,
        params: [{ name: 'To', type: 'String', required: true, desc: 'Alıcı' }],
        examples: [{ title: 'Resmi Yazışma', code: 'To: boss@corp.com', explanation: 'Gmail hesabınızdan atar.' }]
    },
    {
        id: 'SHEETS_WRITE', title: 'Sheets Add Row', type: 'google', summary: 'Tabloya satır ekle.',
        overviewHTML: `<p>Google E-Tablolar'a veri kaydeder.</p>`,
        params: [{ name: 'Spreadsheet ID', type: 'String', required: true, desc: 'ID' }, { name: 'Row Data', type: 'Array', required: true, desc: '["A", "B"]' }],
        examples: [{ title: 'Harcama Takibi', code: 'Row: [Tarih, Tutar, Kategori]', explanation: 'Harcamayı kaydeder.' }]
    },
    {
        id: 'DRIVE_UPLOAD', title: 'Drive Upload', type: 'google', summary: 'Dosya yükle.',
        overviewHTML: `<p>Google Drive'a dosya yedekler.</p>`,
        params: [{ name: 'File', type: 'File', required: true, desc: 'Dosya yolu.' }],
        examples: [{ title: 'Fotoğraf Yedekle', code: 'File: {{lastPhoto}}', explanation: 'Son fotoğrafı yükler.' }]
    },

    // ═════════════════════════════════════════
    // 6. CONTROLS (MANTIK)
    // ═════════════════════════════════════════
    {
        id: 'IF_ELSE', title: 'IF / Else', type: 'control', summary: 'Karar verme.',
        overviewHTML: `<p>Koşula göre akışı yönlendirir.</p>`,
        params: [{ name: 'Condition', type: 'Expression', required: true, desc: 'x > 5' }],
        examples: [{ title: 'Kontrol', code: 'IF saat > 18 THEN "İyi akşamlar"', explanation: 'Zamana göre mesaj.' }]
    },
    {
        id: 'LOOP', title: 'Loop', type: 'control', summary: 'Döngü.',
        overviewHTML: `<p>Liste elemanlarını tek tek işler.</p>`,
        params: [{ name: 'Items', type: 'Array', required: true, desc: 'Liste.' }],
        examples: [{ title: 'Toplu İşlem', code: 'Loop {{contacts}}', explanation: 'Her kişiye işlem yap.' }]
    },
    {
        id: 'DELAY', title: 'Delay', type: 'control', summary: 'Bekle.',
        overviewHTML: `<p>Belirli süre bekler.</p>`,
        params: [{ name: 'Duration', type: 'Number', required: true, desc: 'Saniye.' }],
        examples: [{ title: 'Bekle', code: '5 saniye', explanation: 'Duraklatır.' }]
    },
    {
        id: 'SWITCH', title: 'Switch', type: 'control', summary: 'Seçenekli yol.',
        overviewHTML: `<p>Değere göre (Case 1, Case 2) yönlendirir.</p>`,
        params: [{ name: 'Variable', type: 'String', required: true, desc: 'Değişken.' }],
        examples: [{ title: 'Menü', code: '1->Bakiye, 2->Destek', explanation: 'Seçime göre git.' }]
    },
    {
        id: 'EXECUTE_WORKFLOW', title: 'Sub-Workflow', type: 'control', summary: 'Alt akış çalıştır.',
        overviewHTML: `<p>Başka bir otomasyonu çağırır.</p>`,
        params: [{ name: 'Workflow', type: 'Select', required: true, desc: 'Akış adı.' }],
        examples: [{ title: 'Modül', code: 'Run "Hata Bildir"', explanation: 'Hazır akışı çalıştırır.' }]
    },
    {
        id: 'VARIABLE', title: 'Set Variable', type: 'control', summary: 'Değişken ata.',
        overviewHTML: `<p>Veri sakla veya güncelle.</p>`,
        params: [{ name: 'Name', type: 'String', required: true, desc: 'İsim' }, { name: 'Value', type: 'Any', required: true, desc: 'Değer' }],
        examples: [{ title: 'Sayaç', code: 'count = count + 1', explanation: 'Sayacı artır.' }]
    },

    // ═════════════════════════════════════════
    // 7. DEVICE & SENSORS
    // ═════════════════════════════════════════
    {
        id: 'LIGHT_SENSOR', title: 'Light Sensor', type: 'device', summary: 'Işık seviyesi.',
        overviewHTML: `<p>Ortam aydınlığını (Lux) ölçer.</p>`,
        params: [],
        examples: [{ title: 'Otomatik Işık', code: 'IF lux < 10', explanation: 'Karanlıkta çalışır.' }]
    },
    {
        id: 'PEDOMETER', title: 'Pedometer', type: 'device', summary: 'Adım sayar.',
        overviewHTML: `<p>Günlük adım sayısını verir.</p>`,
        params: [],
        examples: [{ title: 'Spor Takibi', code: 'Get Steps', explanation: 'Adımları alır.' }]
    },
    {
        id: 'MAGNETOMETER', title: 'Compass', type: 'device', summary: 'Pusula.',
        overviewHTML: `<p>Yön bilgisi (Azimuth) verir.</p>`,
        params: [],
        examples: [{ title: 'Kıble', code: 'Get Direction', explanation: 'Yönü bulur.' }]
    },
    {
        id: 'BATTERY_CHECK', title: 'Battery Check', type: 'device', summary: 'Pil durumu.',
        overviewHTML: `<p>Pil yüzdesini kontrol eder.</p>`,
        params: [],
        examples: [{ title: 'Pil Az', code: 'IF level < 20', explanation: 'Uyarı verir.' }]
    },
    {
        id: 'FLASHLIGHT_CONTROL', title: 'Flashlight', type: 'device', summary: 'Fener.',
        overviewHTML: `<p>Kamera flaşını açıp kapatır.</p>`,
        params: [{ name: 'Mode', type: 'Select', required: true, desc: 'On/Off' }],
        examples: [{ title: 'Fener Aç', code: 'Turn On', explanation: 'Aydınlatır.' }]
    },
    {
        id: 'BRIGHTNESS_CONTROL', title: 'Brightness', type: 'device', summary: 'Ekran parlaklığı.',
        overviewHTML: `<p>Ekran parlaklığını ayarlar.</p>`,
        params: [{ name: 'Level', type: 'Number', required: true, desc: '0-100' }],
        examples: [{ title: 'Gece Modu', code: 'Set 10%', explanation: 'Ekranı kısar.' }]
    },
    {
        id: 'DND_CONTROL', title: 'DND Mode', type: 'device', summary: 'Rahatsız Etmeyin.',
        overviewHTML: `<p>DND modunu açar/kapatır.</p>`,
        params: [{ name: 'Enabled', type: 'Boolean', required: true, desc: 'Aç/Kapa' }],
        examples: [{ title: 'Toplantı', code: 'DND On', explanation: 'Sessize alır.' }]
    },
    {
        id: 'BLUETOOTH_CONTROL', title: 'Bluetooth', type: 'device', summary: 'BT Aç/Kapa.',
        overviewHTML: `<p>Bluetooth bağlantısını kontrol eder.</p>`,
        params: [{ name: 'Mode', type: 'Select', required: true, desc: 'On/Off' }],
        examples: [{ title: 'Araba Modu', code: 'BT On', explanation: 'Bağlantıyı açar.' }]
    },
    {
        id: 'MEDIA_CONTROL', title: 'Media Control', type: 'device', summary: 'Müzik kontrolü.',
        overviewHTML: `<p>Oynat, Durdur, Sonraki Parça.</p>`,
        params: [{ name: 'Action', type: 'Select', required: true, desc: 'Play/Pause/Next' }],
        examples: [{ title: 'Müzik Başlat', code: 'Play', explanation: 'Müziği başlatır.' }]
    },
    {
        id: 'APP_LAUNCH', title: 'Launch App', type: 'device', summary: 'Uygulama aç.',
        overviewHTML: `<p>Telefonda yüklü uygulamayı başlatır.</p>`,
        params: [{ name: 'Package', type: 'String', required: true, desc: 'Paket adı.' }],
        examples: [{ title: 'Instagram', code: 'Open Instagram', explanation: 'Uygulamayı açar.' }]
    },

    // ═════════════════════════════════════════
    // 8. AUDIO & VOICE
    // ═════════════════════════════════════════
    {
        id: 'SPEAK_TEXT', title: 'Speak Text (TTS)', type: 'audio', summary: 'Metni oku.',
        overviewHTML: `<p>Yazıyı sesli olarak okur.</p>`,
        params: [{ name: 'Text', type: 'String', required: true, desc: 'Okunacak metin.' }],
        examples: [{ title: 'Hoşgeldin', code: 'Speak "Merhaba"', explanation: 'Sesli karşılama.' }]
    },
    {
        id: 'SPEECH_TO_TEXT', title: 'Listen (STT)', type: 'audio', summary: 'Sesi yazıya dök.',
        overviewHTML: `<p>Ortamı dinler ve söylenenleri yazıya çevirir.</p>`,
        params: [{ name: 'Language', type: 'String', required: false, desc: 'TR/EN' }],
        examples: [{ title: 'Not Al', code: 'Listen -> Save to Notes', explanation: 'Sesli not alır.' }]
    },
    {
        id: 'AUDIO_RECORD', title: 'Record Audio', type: 'audio', summary: 'Ses kaydet.',
        overviewHTML: `<p>Ortam sesini dosyaya kaydeder.</p>`,
        params: [{ name: 'Duration', type: 'Number', required: true, desc: 'Saniye.' }],
        examples: [{ title: 'Gizlice Kaydet', code: 'Record 10s', explanation: 'Kısa kayıt alır.' }]
    },
    {
        id: 'VOLUME_CONTROL', title: 'Set Volume', type: 'audio', summary: 'Ses seviyesi.',
        overviewHTML: `<p>Medya veya Zil sesi seviyesini ayarlar.</p>`,
        params: [{ name: 'Level', type: 'Number', required: true, desc: '0-100' }],
        examples: [{ title: 'Sessiz', code: 'Set 0%', explanation: 'Sesi kapatır.' }]
    },

    // ═════════════════════════════════════════
    // 9. COMMUNICATION
    // ═════════════════════════════════════════
    {
        id: 'WHATSAPP_SEND', title: 'WhatsApp Send', type: 'communication', summary: 'Mesaj at.',
        overviewHTML: `<p>WhatsApp üzerinden mesaj gönderir.</p>`,
        params: [{ name: 'Phone', type: 'String', required: true, desc: 'Tel No' }, { name: 'Message', type: 'Text', required: true, desc: 'Mesaj' }],
        examples: [{ title: 'Mesaj', code: 'Msg: "Geliyorum"', explanation: 'Haber verir.' }]
    },
    {
        id: 'SMS_SEND', title: 'SMS Send', type: 'communication', summary: 'SMS at.',
        overviewHTML: `<p>SMS gönderir.</p>`,
        params: [{ name: 'Phone', type: 'String', required: true, desc: 'Tel No' }],
        examples: [{ title: 'Bilgi', code: 'Msg: "Kod: 123"', explanation: 'SMS atar.' }]
    },
    {
        id: 'TELEGRAM_SEND', title: 'Telegram Send', type: 'communication', summary: 'Telegram mesajı.',
        overviewHTML: `<p>Telegram botu ile mesaj atar.</p>`,
        params: [{ name: 'Chat ID', type: 'String', required: true, desc: 'ID' }],
        examples: [{ title: 'Log', code: 'Msg: "Sistem Aktif"', explanation: 'Bildirim atar.' }]
    },
    {
        id: 'DISCORD_SEND', title: 'Discord Webhook', type: 'communication', summary: 'Discord mesajı.',
        overviewHTML: `<p>Discord kanalına yazar.</p>`,
        params: [{ name: 'Webhook', type: 'String', required: true, desc: 'URL' }],
        examples: [{ title: 'Duyuru', code: 'Msg: "Yayındayız!"', explanation: 'Kanalda paylaşır.' }]
    },
    {
        id: 'SLACK_SEND', title: 'Slack Message', type: 'communication', summary: 'Slack mesajı.',
        overviewHTML: `<p>Slack kanalına mesaj atar.</p>`,
        params: [{ name: 'Webhook', type: 'String', required: true, desc: 'URL' }],
        examples: [{ title: 'İş Bildirimi', code: 'Msg: "Rapor hazır"', explanation: 'Ekibe yazar.' }]
    },
    {
        id: 'INSTAGRAM_POST', title: 'Instagram Post', type: 'communication', summary: 'Post paylaş.',
        overviewHTML: `<p>Instagramda gönderi paylaşır.</p>`,
        params: [{ name: 'Image', type: 'Image', required: true, desc: 'Resim' }, { name: 'Caption', type: 'Text', required: true, desc: 'Açıklama' }],
        examples: [{ title: 'Otomatik Post', code: 'Share Image', explanation: 'Paylaşım yapar.' }]
    },

    // ═════════════════════════════════════════
    // 10. CALENDAR & CONTACTS
    // ═════════════════════════════════════════
    {
        id: 'CALENDAR_Read', title: 'Read Calendar', type: 'calendar', summary: 'Etkinlikleri oku.',
        overviewHTML: `<p>Takvimdeki yaklaşan olayları listeler.</p>`,
        params: [{ name: 'Span', type: 'Select', required: true, desc: 'Today / Week' }],
        examples: [{ title: 'Bugünkü Plan', code: 'Get Today', explanation: 'Ajandayı okur.' }]
    },
    {
        id: 'CALENDAR_CREATE', title: 'Create Event', type: 'calendar', summary: 'Etkinlik oluştur.',
        overviewHTML: `<p>Takvime yeni etkinlik ekler.</p>`,
        params: [{ name: 'Title', type: 'String', required: true, desc: 'Başlık' }],
        examples: [{ title: 'Randevu', code: 'Add "Dişçi"', explanation: 'Takvime işler.' }]
    },
    {
        id: 'CONTACTS_READ', title: 'Read Contacts', type: 'calendar', summary: 'Kişi ara.',
        overviewHTML: `<p>Rehberden kişi bilgisi çeker.</p>`,
        params: [{ name: 'Name', type: 'String', required: true, desc: 'İsim' }],
        examples: [{ title: 'Numara Bul', code: 'Find "Ahmet"', explanation: 'Numarasını getirir.' }]
    },

    // ═════════════════════════════════════════
    // 11. FILES & PRODUCTIVITY
    // ═════════════════════════════════════════
    {
        id: 'FILE_WRITE', title: 'Write File', type: 'files', summary: 'Dosya kaydet.',
        overviewHTML: `<p>Telefona dosya yazar.</p>`,
        params: [{ name: 'Content', type: 'Text', required: true, desc: 'İçerik' }],
        examples: [{ title: 'Log', code: 'Save "test.txt"', explanation: 'Kaydeder.' }]
    },
    {
        id: 'FILE_READ', title: 'Read File', type: 'files', summary: 'Dosya oku.',
        overviewHTML: `<p>Dosyadan metin okur.</p>`,
        params: [{ name: 'Filename', type: 'String', required: true, desc: 'Adı' }],
        examples: [{ title: 'Config Oku', code: 'Read "conf.json"', explanation: 'Ayarları yükler.' }]
    },
    {
        id: 'PDF_CREATE', title: 'Create PDF', type: 'files', summary: 'PDF oluştur.',
        overviewHTML: `<p>Metni veya resimleri PDF yapar.</p>`,
        params: [{ name: 'Content', type: 'Text', required: true, desc: 'İçerik' }],
        examples: [{ title: 'Raporla', code: 'To PDF', explanation: 'PDF çıktısı alır.' }]
    },
    {
        id: 'NOTION_CREATE', title: 'Notion Page', type: 'files', summary: 'Notion sayfası.',
        overviewHTML: `<p>Notion veritabanına ekler.</p>`,
        params: [{ name: 'Properties', type: 'JSON', required: true, desc: 'Data' }],
        examples: [{ title: 'Not', code: 'Add Page', explanation: 'Notion\'a atar.' }]
    },

    // ═════════════════════════════════════════
    // 12. LOCATION & MAPS
    // ═════════════════════════════════════════
    {
        id: 'LOCATION_GET', title: 'Get Location', type: 'location', summary: 'GPS Konumu.',
        overviewHTML: `<p>Enlem, Boylam ve Adres bilgisini çeker.</p>`,
        params: [{ name: 'Accuracy', type: 'Select', required: false, desc: 'High / Low' }],
        examples: [{ title: 'Konum Paylaş', code: 'SMS: "Buradayım: {{mapsUrl}}"', explanation: 'Konum atar.' }]
    },
    {
        id: 'NAVIGATE_TO', title: 'Navigate', type: 'location', summary: 'Yol tarifi.',
        overviewHTML: `<p>Haritaları açıp adrese yol tarifi başlatır.</p>`,
        params: [{ name: 'Address', type: 'String', required: true, desc: 'Varış Yeri' }],
        examples: [{ title: 'Eve Git', code: 'Nav to "Home"', explanation: 'Haritayı açar.' }]
    },

    // ═════════════════════════════════════════
    // 13. SMART HOME & IOT
    // ═════════════════════════════════════════
    {
        id: 'PHILIPS_HUE', title: 'Philips Hue', type: 'smart_home', summary: 'Işıkları yönet.',
        overviewHTML: `<p>Hue ışıklarını açar, kapatır veya renk değiştirir.</p>`,
        params: [{ name: 'Action', type: 'Select', required: true, desc: 'On / Off' }],
        examples: [{ title: 'Sinema Modu', code: 'Lights Off', explanation: 'Işıkları kapatır.' }]
    },

    // ═════════════════════════════════════════
    // 14. MEMORY (RAG)
    // ═════════════════════════════════════════
    {
        id: 'ADD_TO_MEMORY', title: 'Remember', type: 'memory', summary: 'Hafızaya at.',
        overviewHTML: `<p>Bilgiyi kalıcı hafızaya (Vector DB) kaydeder.</p>`,
        params: [{ name: 'Text', type: 'String', required: true, desc: 'Bilgi' }],
        examples: [{ title: 'Öğren', code: 'Remember "Patronun adı Ali"', explanation: 'Unutmaz.' }]
    },
    {
        id: 'SEARCH_MEMORY', title: 'Recall', type: 'memory', summary: 'Hatırla.',
        overviewHTML: `<p>Hafızadan bilgi sorar.</p>`,
        params: [{ name: 'Query', type: 'String', required: true, desc: 'Soru' }],
        examples: [{ title: 'Soru', code: 'Recall "Patron kim?" -> "Ali"', explanation: 'Cevap verir.' }]
    }
];

export default function DocsPage() {
    const [selectedNodeId, setSelectedNodeId] = useState<string>(NODES[0].id);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'params' | 'examples'>('overview');

    const selectedNode = useMemo(() => NODES.find(n => n.id === selectedNodeId) || NODES[0], [selectedNodeId]);

    const filteredNodes = useMemo(() => {
        return NODES.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.summary.toLowerCase().includes(searchTerm.toLowerCase()));
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
                    <div className={styles.version}>v15.0</div>
                </div>
                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="Ara (Trigger, AI, Web...)"
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
                    {(['overview', 'params', 'examples'] as const).map(tab => (
                        <button
                            key={tab}
                            className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'overview' ? 'Rehber' :
                                tab === 'params' ? 'Parametreler' :
                                    'Örnekler'}
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
                </div>
            </main>
        </div>
    );
}
