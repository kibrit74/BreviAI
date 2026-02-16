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
    // 1. TRIGGERS (TETİKLEYİCİLER)
    // ═════════════════════════════════════════
    {
        id: 'MANUAL_TRIGGER', title: 'Manual Trigger', type: 'trigger', summary: 'Tek dokunuşla otomasyon başlatma.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🚀 Sahneye Giriş</h3>
                <p>Manual Trigger, otomasyonun "Play" butonudur. Genellikle test aşamasında veya bir görevi o an hemen yapmak istediğinizde kullanılır.</p>
            </div>
            <div class="tip-box">
                <strong>Pro Tip:</strong> Dashboard üzerinden bu düğmeye bir isim vererek widget oalrak ana ekranınıza ekleyebilirsiniz.
            </div>
            <div class="guide-section">
                <h3>🛠️ Form Parametreleri</h3>
                <p>Akış başladığında kullanıcıdan bilgi almak istiyorsanız, düğüm ayarlarına tıklayıp "Input Schema" ekleyebilirsiniz. Örn: "Hedef Fiyat", "Mesaj Metni" gibi.</p>
            </div>
        `,
        params: [],
        examples: [{ title: 'Hızlı Test', code: 'Play butonu -> Başlat', explanation: 'Ekranın sağ altındaki play butonu bu düğümü tetikler.' }]
    },
    {
        id: 'TIME_TRIGGER', title: 'Time / Cron Trigger', type: 'trigger', summary: 'Zamanlanmış, periyodik görevler.',
        overviewHTML: `
            <div class="guide-section">
                <h3>⏰ Zamanlama Sihirbazı</h3>
                <p>BreviAI, zamanı atomik hassasiyette yönetir. Üç farklı mod sunar:</p>
                <ul>
                    <li><strong>Interval:</strong> Her X dakika/saatte bir (Örn: Her 15 dakikada kur kontrolü).</li>
                    <li><strong>Specific Date:</strong> Tek seferlik, ileri bir tarih (Örn: Doğum günü kutlaması).</li>
                    <li><strong>Cron:</strong> Karmaşık takvim planları (Örn: Hafta içi her gün 09:00 - 18:00 arası).</li>
                </ul>
            </div>
            <div class="warning-box">
                <strong>Dikkat:</strong> Cron modunu kullanabilmek için Cihaz Ayarları > Pil > Kısıtlama Yok seçeneğinin aktif olması önerilir.
            </div>
        `,
        params: [
            { name: 'Mode', type: 'Select', required: true, desc: 'Interval, Date, Cron' },
            { name: 'Value', type: 'String', required: true, desc: 'Zaman değeri veya cron ifadesi.' }
        ],
        examples: [{ title: 'Sabah Raporu', code: '0 8 * * 1-5', explanation: 'Hafta içi her sabah 08:00\'de çalışır.' }]
    },
    {
        id: 'NOTIFICATION_TRIGGER', title: 'Notification received', type: 'trigger', summary: 'Diğer uygulamaların bildirimlerini yakalar.',
        overviewHTML: `
            <div class="guide-section">
                <h3>📥 Pasif Dinleme</h3>
                <p>WhatsApp, Instagram, Banka vb. uygulamalardan gelen bildirimleri okuyarak akışı başlatır. Bu sayede "API desteği olmayan" uygulamalarla bile entegrasyon sağlayabilirsiniz.</p>
            </div>
            <div class="guide-section">
                <h3>🔍 Regex Filtreleme</h3>
                <p>Sadece belirli anahtar kelimeler içeren bildirimleri ayıklayabilirsiniz.</p>
                <ul>
                    <li><code>(?i).*harcama.*</code>: Harcama bildirimlerini yakalar.</li>
                    <li><code>\d{4,6}</code>: Gelen SMS şifrelerini yakalar.</li>
                </ul>
            </div>
        `,
        params: [
            { name: 'App Name', type: 'String', required: true, desc: 'Uygulama adı (örn: WhatsApp)' },
            { name: 'Filter', type: 'String', required: false, desc: 'Regex veya anahtar kelime.' }
        ],
        examples: [{ title: 'Banka Takip', code: 'App: Garanti, Filter: "Harcama"', explanation: 'Banka harcama bildirimini Sheet\'e yazar.' }]
    },
    {
        id: 'GEOFENCE_TRIGGER', title: 'Geofence Trigger', type: 'trigger', summary: 'Harita üzerinde alan koruması.',
        overviewHTML: `
            <div class="guide-section">
                <h3>📍 Konumsal Tetikleme</h3>
                <p>Cihazınız belirlenen bir koordinata girdiğinde veya oradan ayrıldığında çalışır.</p>
            </div>
            <div class="tip-box">
                <strong>Hassasiyet:</strong> Radius (Yarıçap) değerini en az 200m tutmanız GPS sapmalarını önlemek için idealdir.
            </div>
        `,
        params: [
            { name: 'Latitude', type: 'Number', required: true, desc: 'Enlem' },
            { name: 'Longitude', type: 'Number', required: true, desc: 'Boylam' },
            { name: 'Type', type: 'Select', required: true, desc: 'Enter / Exit' }
        ],
        examples: [{ title: 'Eve Varınca', code: 'Enter (Ev Konumu)', explanation: 'Eve varınca ışıkları açar.' }]
    },

    // ═════════════════════════════════════════
    // 2. YAPAY ZEKA (AI) - DEFINITIONS RESTORED
    // ═════════════════════════════════════════
    {
        id: 'AGENT_AI', title: 'AI Agent (LLM)', type: 'ai', summary: 'Süper zeka entegrasyonu (2026).',
        overviewHTML: `
            <div class="guide-section">
                <h3>🧠 Agent AI: BreviAI'nin Beyni</h3>
                <p>En güçlü dil modellerini (LLM) kullanarak kararlar verir, metin analiz eder ve içerik üretir.</p>
            </div>
            <div class="guide-section">
                <h3>🤖 2026 Model Listesi (Bleeding Edge)</h3>
                <ul>
                    <li><strong>GPT-5 (OpenAI):</strong> Akıl yürütme ve çoklu görevde rakipsiz.</li>
                    <li><strong>Gemini 3 (Google):</strong> "Deep Think" modu ve sonsuz hafıza desteği.</li>
                    <li><strong>Claude 4.5 Opus:</strong> Kodlama ve otonom görev lideri.</li>
                </ul>
            </div>
            <div class="tip-box">
                <strong>Prompt Hint:</strong> "Sadece JSON formatında cevap ver" derseniz, çıktıyı sonraki düğümlerde kolayca işleyebilirsiniz.
            </div>
        `,
        params: [
            { name: 'Model', type: 'Select', required: true, desc: 'GPT-5, Gemini 3, etc.' },
            { name: 'Prompt', type: 'Text', required: true, desc: 'Modele gidecek talimat.' },
            { name: 'Temperature', type: 'Slider', required: false, desc: '0: Mantıksal, 1: Yaratıcı' }
        ],
        examples: [{ title: 'Review Summarizer', code: 'Prompt: "Şu yorumu özetle: {{input}}"', explanation: 'Müşteri yorumlarını analiz eder.' }]
    },
    {
        id: 'REALTIME_AI', title: 'Realtime AI (Live Voice)', type: 'ai', summary: 'Gecikmesiz, canlı sesli asistan.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🎙️ Canlı Sohbet (Millisecond Latency)</h3>
                <p>Gemini 3 Multimodal altyapısı ile asistanınızla sanki bir insanla konuşuyormuş gibi canlı sohbet edebilirsiniz. Yazmak yerine konuşarak komut verin.</p>
            </div>
            <div class="guide-section">
                <h3>🌟 Kullanım Alanları</h3>
                <ul>
                    <li>Yabancı dil pratiği.</li>
                    <li>Eller serbest mutfakta asistanlık.</li>
                    <li>Duyguları anlayan empati modu.</li>
                </ul>
            </div>
        `,
        params: [{ name: 'Persona', type: 'Text', required: true, desc: 'Asistanın kişiliği.' }],
        examples: [{ title: 'İngilizce Pratik', code: 'Persona: "Zorlayıcı bir İngilizce öğretmeni ol."', explanation: 'Sesli konuşarak pratik yapın.' }]
    },
    {
        id: 'IMAGE_GENERATOR', title: 'Image Gen (Nanobana Pro)', type: 'ai', summary: 'Sanatsal ve gerçekçi görseller üretir.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🎨 Görsel Sanatın Zirvesi</h3>
                <p>2026 standartlarında 4K çözünürlükte görseller üretin. Nanobana Pro özellikle "Metin Yazma" (Text inside image) konusunda kusursuzdur.</p>
            </div>
            <div class="guide-section">
                <h3>🚀 Motorlar</h3>
                <ul>
                    <li><strong>Nanobana Pro:</strong> Fotorealizm ve metin renderlama.</li>
                    <li><strong>Flux.1 Ultra:</strong> Sanatsal derinlik ve stil transferi.</li>
                </ul>
            </div>
        `,
        params: [{ name: 'Prompt', type: 'Text', required: true, desc: 'Görsel tarifi (İngilizce önerilir).' }],
        examples: [{ title: 'Logo Design', code: 'Prompt: "Minimalist futuristic logo for a space agency"', explanation: 'Profesyonel logo üretir.' }]
    },

    // ═════════════════════════════════════════
    // 3. KONTROL & MANTIK (LOGIC)
    // ═════════════════════════════════════════
    {
        id: 'IF_ELSE', title: 'IF / Else (Decision)', type: 'control', summary: 'Mantıksal dallanma noktası.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔀 Karar Verme</h3>
                <p>Düğüm, gelen veriyi kontrol eder. Koşul doğruysa (True) üst çıkıştan, yanlışsa (False) alt çıkıştan devam eder.</p>
            </div>
            <div class="guide-section">
                <h3>🔢 Operatör Rehberi</h3>
                <ul>
                    <li><code>Equal (==)</code>: Tam eşleşme.</li>
                    <li><code>Contains</code>: Metin parçasını arama.</li>
                    <li><code>Exists</code>: Değişken tanımlı mı kontrolü.</li>
                </ul>
            </div>
        `,
        params: [{ name: 'Condition', type: 'UI_Builder', required: true, desc: 'Mantık kurallarını oluşturun.' }],
        examples: [{ title: 'Bakiye Kontrolü', code: 'IF {{balance}} < 0 THEN "Uyarı Bildirimi"', explanation: 'Bakiye eksiye düşerse uyarır.' }]
    },
    {
        id: 'LOOP', title: 'Loop / For Each', type: 'control', summary: 'Liste elemanlarını tek tek işleme.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔄 Tekrarlayan İşlemler</h3>
                <p>Bir veri listesi (Array) aldığınız her durumda Loop kullanmalısınız. Örneğin: 10 kişiye mail atmak, 20 görseli yedeklemek.</p>
            </div>
            <div class="tip-box">
                <strong>Batch Mode:</strong> Liste çok büyükse (1000+) Split Batches düğümü ile Loop'u yönetebilirsiniz.
            </div>
        `,
        params: [{ name: 'Items', type: 'Array', required: true, desc: 'Dönülecek veri listesi.' }],
        examples: [{ title: 'Toplu Mail', code: 'Loop {{users}} -> SendMail', explanation: 'Her kullanıcıya mail gönderir.' }]
    },
    {
        id: 'EXECUTE_WORKFLOW', title: 'Run Sub-Workflow', type: 'control', summary: 'Başka bir akışı fonksiyon olarak çalıştırır.',
        overviewHTML: `
            <div class="guide-section">
                <h3>📦 Modüler Tasarım</h3>
                <p>Devasa akışlar yerine, küçük ve özelleşmiş akışlar oluşturun. Bu düğümle o akışları birleştirin.</p>
            </div>
            <div class="guide-section">
                <h3>↔️ Veri Aktarımı</h3>
                <p>Alt akışa "Input" gönderebilir ve alt akışın bitmesini bekleyerek sonucunu (Output) ana akışta kullanabilirsiniz.</p>
            </div>
        `,
        params: [{ name: 'Workflow', type: 'Select', required: true, desc: 'Hedef otomasyon.' }, { name: 'Wait', type: 'Boolean', required: true, desc: 'Bitmesini beklesin mi?' }],
        examples: [{ title: 'Hizmet Çağrısı', code: 'Run "Currency Converter"', explanation: 'Kuru çevirip sonucu ana akışa getirir.' }]
    },

    // ═════════════════════════════════════════
    // 4. MICROSOFT & OFFICE 365
    // ═════════════════════════════════════════
    {
        id: 'OUTLOOK_SEND', title: 'Outlook Email', type: 'microsoft', summary: 'Resmi Microsoft hesabınızla mail gönderin.',
        overviewHTML: `
            <div class="guide-section">
                <h3>📧 Kurumsal E-Posta</h3>
                <p>Office 365 veya Outlook hesabınızı kullanarak profesyonel e-postalar gönderir. SMTP yerine API kullandığı için "Spam" kutusuna düşme riski çok düşüktür.</p>
            </div>
            <div class="guide-section">
                <h3>📎 Ekler (Attachments)</h3>
                <p>İş akışında üretilen PDF, Excel veya resimleri maile ek olarak ekleyebilirsiniz.</p>
            </div>
        `,
        params: [{ name: 'To', type: 'String', required: true, desc: 'Alıcı adresi.' }, { name: 'Subject', type: 'String', required: true, desc: 'Konu.' }],
        examples: [{ title: 'Rapor Gönder', code: 'To: boss@corp.com, Body: {{ai_summary}}', explanation: 'AI özetini rapor olarak atar.' }]
    },
    {
        id: 'EXCEL_WRITE', title: 'Excel Write (OneDrive)', type: 'microsoft', summary: 'Excel dosyalarına veri işler.',
        overviewHTML: `
            <div class="guide-section">
                <h3>📊 Dinamik Tablo Yönetimi</h3>
                <p>OneDrive üzerindeki .xlsx dosyalarını hedef alır. Satır ekleme, hücre güncelleme veya tablo formatlama yapabilir.</p>
            </div>
            <div class="warning-box">
                <strong>Dosya Formatı:</strong> Sadece OneDrive üzerinde bulunan Cloud-Excel dosyalarıyla çalışır.
            </div>
        `,
        params: [{ name: 'File ID', type: 'String', required: true, desc: 'Dosya seçici.' }, { name: 'Table', type: 'String', required: true, desc: 'Sayfa/Tablo adı.' }],
        examples: [{ title: 'Log Kaydı', code: 'Row: [{{$now}}, "Success", {{data}}]', explanation: 'Her başarılı işlemi Excel\'e yazar.' }]
    },

    // ═════════════════════════════════════════
    // 5. AUDIO & VOICE
    // ═════════════════════════════════════════
    {
        id: 'SPEAK_TEXT', title: 'Speak Text (TTS)', type: 'audio', summary: 'Metni doğal bir insan sesiyle okur.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔊 Sesli Geri Bildirim</h3>
                <p>Otomasyonun sonucunu veya gelen bir bildirimi telefonunuzun hoparlöründen sesli olarak duyun.</p>
            </div>
            <div class="guide-section">
                <h3>🎭 Ses Seçenekleri</h3>
                <p>Erkek, Kadın, Çocuk ve farklı vurgu (Türkçe, İngilizce) seçenekleri mevcuttur.</p>
            </div>
        `,
        params: [{ name: 'Text', type: 'String', required: true, desc: 'Okunacak metin.' }, { name: 'Voice', type: 'Select', required: false, desc: 'Ses tonu.' }],
        examples: [{ title: 'Karşılama', code: 'Speak "Hoş geldin Ahmet."', explanation: 'Uygulama açılınca sesli karşılama.' }]
    },
    {
        id: 'SPEECH_TO_TEXT', title: 'Speech-to-Text (Listen)', type: 'audio', summary: 'Söylenenleri metne dönüştürür.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🎙️ Dinle ve Anla</h3>
                <p>Asistanın dinleme modunu açar. Sizin söylediğiniz cümleleri dijital metne çevirerek AI Agent düğümüne girdi sağlar.</p>
            </div>
            <div class="tip-box">
                <strong>Hassasiyet:</strong> Arka plan gürültü engelleme özelliği sayesinde gürültülü ortamlarda bile başarılı sonuç verir.
            </div>
        `,
        params: [{ name: 'Language', type: 'String', required: true, desc: 'Örn: tr-TR' }],
        examples: [{ title: 'Sesli Not', code: 'Speak -> Listen -> SaveNotion', explanation: 'Sesinizi Notion sayfasına çevirir.' }]
    },

    // ═════════════════════════════════════════
    // 6. HAFIZA & RAG (MEMORY)
    // ═════════════════════════════════════════
    {
        id: 'ADD_TO_MEMORY', title: 'Remember (Memory)', type: 'memory', summary: 'Veriyi uzun süreli hafızaya kaydeder.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🧠 Kalıcı Öğrenme</h3>
                <p>Yapay zekanın sizi daha iyi tanıması için önemli bilgileri buraya kaydedin. (Örn: "En sevdiğim renk mavidir", "Önemli projelerim şunlar...")</p>
            </div>
            <div class="guide-section">
                <h3>🛡️ Gizlilik</h3>
                <p>Bu veriler sadece sizin cihazınızda (Edge Memory) şifreli olarak saklanır ve sadece sizin workflowlarınız erişebilir.</p>
            </div>
        `,
        params: [{ name: 'Context', type: 'Text', required: true, desc: 'Unutulmaması gereken bilgi.' }],
        examples: [{ title: 'Bilgi Depolama', code: 'Context: "Yarın saat 10:00\'da dişçi randevum var."', explanation: 'AI bu bilgiyi daha sonra cevaplarken kullanır.' }]
    },
    {
        id: 'SEARCH_MEMORY', title: 'Recall (Search Context)', type: 'memory', summary: 'Hafızadan ilgili bilgiyi geri getirir.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🔍 Hatırlama Süreci</h3>
                <p>Hafızaya atılmış binlerce sayfalık veri içinden, o anki sorunuzla en alakalı olanları bulur ve AI Agent'ın önüne "bağlam" olarak koyar.</p>
            </div>
        `,
        params: [{ name: 'Query', type: 'String', required: true, desc: 'Aranacak anahtar kelime veya soru.' }],
        examples: [{ title: 'Bilgi Geri Çağır', code: 'Query: "Dişçi randevusu ne zaman?"', explanation: 'Hafızadan ilgili saat bilgisini getirir.' }]
    },

    // ═════════════════════════════════════════
    // 7. SENSÖRLER & DONANIM (DEVICE)
    // ═════════════════════════════════════════
    {
        id: 'LIGHT_SENSOR', title: 'Light Sensor', type: 'device', summary: 'Ortam ışığına (LUX) duyarlı işlemler.',
        overviewHTML: `
            <div class="guide-section">
                <h3>💡 Işık Duyarlılığı</h3>
                <p>Cihazınızın üzerindeki ışık sensörünü kullanarak ortamın ne kadar aydınlık/karanlık olduğunu ölçer.</p>
            </div>
            <div class="guide-section">
                <h3>📊 LUX Değerleri</h3>
                <ul>
                    <li><strong>0 - 10:</strong> Zifiri karanlık.</li>
                    <li><strong>100 - 500:</strong> Normal iç mekan.</li>
                    <li><strong>1000+:</strong> Güneş ışığı.</li>
                </ul>
            </div>
        `,
        params: [],
        examples: [{ title: 'Gece Modu', code: 'IF lux < 10 THEN "Işıkları Aç"', explanation: 'Hava kararınca akıllı lambaları kontrol eder.' }]
    },
    {
        id: 'PEDOMETER', title: 'Pedometer (Adım Sayar)', type: 'device', summary: 'Günlük aktivite ve adım takibi.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🏃 Hareket Takibi</h3>
                <p>Telefonun akselerometresini kullanarak attığınız adımları sayar. Google Fit veya Apple Health gerektirmez, doğrudan donanımdan okur.</p>
            </div>
        `,
        params: [],
        examples: [{ title: 'Zayıflama Takibi', code: 'IF steps > 10000 THEN "Tebrik Mesajı"', explanation: 'Hedefe ulaşınca kutlar.' }]
    },
    {
        id: 'FLASHLIGHT_CONTROL', title: 'Flashlight Control', type: 'device', summary: 'Kamera flaşını yönetir.',
        overviewHTML: `<p>Fflaşı "On", "Off" veya "Toggle" (Durum Değiştir) modunda çalıştırır. Karanlık ortamlarda görsel uyarıcı olarak kullanılabilir.</p>`,
        params: [{ name: 'Mode', type: 'Select', required: true, desc: 'On / Off / Toggle' }],
        examples: [{ title: 'Blink Alert', code: 'Loop 5x -> Toggle Flash -> Wait 0.5s', explanation: 'Flaş patlatarak uyarı verir.' }]
    },

    // ═════════════════════════════════════════
    // 8. İLETİŞİM & SOSYAL (COMMUNICATION)
    // ═════════════════════════════════════════
    {
        id: 'WHATSAPP_SEND', title: 'WhatsApp Send', type: 'communication', summary: 'WhatsApp mesajı ve görsel gönderir.',
        overviewHTML: `
            <div class="guide-section">
                <h3>💬 Otomatik Mesajlaşma</h3>
                <p>BreviAI backend servisini kullanarak rehberdeki birine veya doğrudan numaraya mesaj atar.</p>
            </div>
            <div class="warning-box">
                <strong>Format:</strong> Telefon numarası ülke koduyla başlamalıdır (905...).
            </div>
        `,
        params: [
            { name: 'Phone', type: 'String', required: true, desc: 'Hedef numara.' },
            { name: 'Message', type: 'Text', required: true, desc: 'Metin.' }
        ],
        examples: [{ title: 'Günaydın', code: 'To: 905..., Msg: "Günaydın sevgilim!"', explanation: 'Kişiye otomatik mesaj atar.' }]
    },
    {
        id: 'INSTAGRAM_POST', title: 'Instagram Post', type: 'communication', summary: 'Otomatik gönderi paylaşımı.',
        overviewHTML: `
            <div class="guide-section">
                <h3>📸 Feed Paylaşımı</h3>
                <p>Oluşturulan veya telefonda bulunan bir resmi, açıklama yazısıyla birlikte Instagram hesabınızda paylaşır. AI Image Generator ile birleştirerek otonom sanat hesapları kurabilirsiniz.</p>
            </div>
        `,
        params: [{ name: 'Image', type: 'Image', required: true, desc: 'Paylaşılacak görsel.' }, { name: 'Caption', type: 'Text', required: true, desc: 'Görsel açıklaması.' }],
        examples: [{ title: 'Auto Post', code: 'Image: {{gen_img}}, Caption: "Made by AI"', explanation: 'AI görselini direkt paylaşır.' }]
    },
    {
        id: 'SLACK_SEND', title: 'Slack Message (Webhooks)', type: 'communication', summary: 'Slack kanalına profesyonel duyurular yapar.',
        overviewHTML: `<p>Incoming Webhook URL kullanarak ekibinize bildirimler gönderir. Özel "Block Kit" formatıyla butonlu/resimli mailler oluşturabilir.</p>`,
        params: [{ name: 'Webhook URL', type: 'String', required: true, desc: 'Slack bot URLsi.' }, { name: 'Message', type: 'Text', required: true, desc: 'Duyuru metni.' }],
        examples: [{ title: 'Project Update', code: 'Msg: "V16 Deploy edildi! 🚀"', explanation: 'Ekibe canlı bildirim.' }]
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
                    <div className={styles.logo}>BreviAI Grand Encyclopedia</div>
                    <div className={styles.version}>v16.0 MASTER</div>
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
                        backgroundColor: (CATEGORY_STYLES[selectedNode.type]?.color || '#333') + '20',
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
                            {tab === 'overview' ? '📜 Ansiklopedi Rehberi' :
                                tab === 'params' ? '⚙️ Teknik Parametreler' :
                                    '💡 Örnek Senaryolar'}
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
                                    {selectedNode.params.length === 0 && (
                                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Bu düğüm için özel parametre ayarı gerekmez.</td></tr>
                                    )}
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
                                        <div className={styles.codeHeader}>Master Configuration</div>
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
