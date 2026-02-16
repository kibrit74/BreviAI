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
    smart_home: { color: '#FCD34D', icon: '🏠', label: 'Akıllı Ev' }, // Added
    audio: { color: '#EF4444', icon: '🔊', label: 'Ses & Konuşma' }, // Added
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

// --- V10: THE COMPLETE CATALOG (Based on workflow-types.ts) ---
const NODES: NodeDoc[] = [
    // ═════════════════════════════════════════
    // TRIGGERS (15+)
    // ═════════════════════════════════════════
    {
        id: 'MANUAL', title: 'Manual Trigger', type: 'trigger', summary: 'Manuel başlatma.',
        overviewHTML: '<p>Akışı test etmek veya butona tıklayarak başlatmak için kullanılır.</p>',
        params: [{ name: 'Form Fields', type: 'Array', required: false, desc: 'Kullanıcı girdileri' }],
        outputs: [{ field: 'formData', type: 'Object', desc: 'Girilen veriler' }],
        examples: [{ title: 'Kullanıcı Girdisi', code: 'Form: [{name: "query", type: "text"}]', explanation: 'Akış başında kullanıcıdan metin ister.' }]
    },
    {
        id: 'TIME_TRIGGER', title: 'Cron / Interval', type: 'trigger', summary: 'Zamanlanmış tetikleyici.',
        overviewHTML: '<p>Belirli aralıklarla (Interval) veya belirli bir saatte (Cron) çalışır.</p>',
        params: [{ name: 'Mode', type: 'Select', required: true, desc: 'Interval / Cron' }, { name: 'Value', type: 'String', required: true, desc: 'dk veya cron ifadesi' }],
        outputs: [{ field: 'timestamp', type: 'Number', desc: 'Unix zamanı' }],
        examples: [{ title: 'Her Sabah 09:00', code: '0 9 * * *', explanation: 'Her gün sabah 9\'da tetiklenir.' }]
    },
    {
        id: 'WEBHOOK', title: 'Webhook', type: 'trigger', summary: 'HTTP isteği al.',
        overviewHTML: '<p>Dış dünyadan gelen HTTP isteklerini karşılar.</p>',
        params: [{ name: 'Path', type: 'String', required: true, desc: 'URL yolu' }, { name: 'Method', type: 'Select', required: true, desc: 'GET/POST' }],
        outputs: [{ field: 'body', type: 'Object', desc: 'Payload' }],
        examples: [{ title: 'Form Yanıtı', code: 'POST /submit-form', explanation: 'Bir web formundan gelen veriyi işler.' }]
    },
    {
        id: 'NOTIFICATION_TRIGGER', title: 'Notification Trigger', type: 'trigger', summary: 'Bildirim gelince.',
        overviewHTML: '<p>Telefonunuza belirli bir uygulamadan bildirim geldiğinde çalışır.</p>',
        params: [{ name: 'App Name', type: 'String', required: true, desc: 'Örn: WhatsApp' }, { name: 'Filter', type: 'String', required: false, desc: 'İçerik filtresi' }],
        outputs: [{ field: 'title', type: 'String', desc: 'Bildirim başlığı' }, { field: 'text', type: 'String', desc: 'İçerik' }],
        examples: [{ title: 'Banka SMS Yakalama', code: 'App: Messages, Filter: "Banka"', explanation: 'Bankadan gelen SMS bildirimlerini yakalar.' }]
    },
    {
        id: 'SMS_TRIGGER', title: 'SMS Trigger', type: 'trigger', summary: 'SMS gelince.',
        overviewHTML: '<p>Gelen SMS mesajlarını dinler.</p>',
        params: [{ name: 'Sender', type: 'String', required: false, desc: 'Gönderen numara/isim' }],
        outputs: [{ field: 'message', type: 'String', desc: 'Mesaj içeriği' }],
        examples: [{ title: 'OTP Yakalama', code: 'Sender: "Google"', explanation: 'Google doğrulama kodlarını yakalar.' }]
    },
    {
        id: 'CALL_TRIGGER', title: 'Call Trigger', type: 'trigger', summary: 'Arama gelince/bitince.',
        overviewHTML: '<p>Gelen veya giden aramaları takip eder.</p>',
        params: [{ name: 'State', type: 'Select', required: true, desc: 'Incoming / Connected / Ended' }],
        outputs: [{ field: 'number', type: 'String', desc: 'Telefon numarası' }],
        examples: [{ title: 'Arama Kaydı', code: 'State: Ended', explanation: 'Görüşme bitince süresini kaydeder.' }]
    },
    {
        id: 'WHATSAPP_TRIGGER', title: 'WhatsApp Trigger', type: 'trigger', summary: 'WhatsApp mesajı gelince.',
        overviewHTML: '<p>WhatsApp\'tan mesaj geldiğinde tetiklenir (Erişilebilirlik izni gerektirir).</p>',
        params: [{ name: 'Contact', type: 'String', required: false, desc: 'Kişi adı' }],
        outputs: [{ field: 'text', type: 'String', desc: 'Mesaj' }],
        examples: [{ title: 'Otomatik Cevap', code: 'Contact: "Müşteri"', explanation: 'Müşteriden gelen mesaja otomatik cevap verir.' }]
    },
    {
        id: 'GESTURE_TRIGGER', title: 'Gesture Trigger', type: 'trigger', summary: 'Hareket algılayınca.',
        overviewHTML: '<p>Telefonu salladığınızda veya çevirdiğinizde çalışır.</p>',
        params: [{ name: 'Type', type: 'Select', required: true, desc: 'Shake / Flip / Pocket' }],
        outputs: [],
        examples: [{ title: 'Salla-Feneri Aç', code: 'Type: Shake', explanation: 'Telefonu sallayınca feneri açar.' }]
    },
    {
        id: 'GEOFENCE_ENTER', title: 'Geofence Enter', type: 'trigger', summary: 'Bölgeye girince.',
        overviewHTML: '<p>Belirlenen harita konumuna girdiğinizde çalışır.</p>',
        params: [{ name: 'Lat/Long', type: 'Coordinates', required: true, desc: 'Merkez nokta' }, { name: 'Radius', type: 'Number', required: true, desc: 'Yarıçap (m)' }],
        outputs: [],
        examples: [{ title: 'Eve Varınca', code: 'Radius: 100m', explanation: 'Ev konumuna 100m yaklaşınca Wi-Fi açar.' }]
    },
    {
        id: 'GEOFENCE_EXIT', title: 'Geofence Exit', type: 'trigger', summary: 'Bölgeden çıkınca.',
        overviewHTML: '<p>Belirlenen harita konumundan ayrıldığınızda çalışır.</p>',
        params: [{ name: 'Lat/Long', type: 'Coordinates', required: true, desc: 'Merkez nokta' }],
        outputs: [],
        examples: [{ title: 'İşten Çıkınca', code: 'Radius: 200m', explanation: 'İş yerinden çıkınca eşinize mesaj atar.' }]
    },
    {
        id: 'CHAT_INPUT_TRIGGER', title: 'Chat / Voice Trigger', type: 'trigger', summary: 'Sohbetten başlat.',
        overviewHTML: '<p>BreviAI asistanına yazarak veya konuşarak başlattığınız akışlar.</p>',
        params: [{ name: 'Keywords', type: 'String', required: true, desc: 'Tetikleyici kelimeler' }],
        outputs: [{ field: 'input', type: 'String', desc: 'Söylenen cümle' }],
        examples: [{ title: 'Sesli Komut', code: 'Keywords: "Toplantı ayarla"', explanation: '"Toplantı ayarla" dediğinizde bu akış çalışır.' }]
    },

    // ═════════════════════════════════════════
    // CONTROL & LOGIC
    // ═════════════════════════════════════════
    {
        id: 'IF_ELSE', title: 'IF / Else', type: 'control', summary: 'Koşul kontrolü.',
        overviewHTML: '<p>Verilen koşula göre akışı <strong>True</strong> veya <strong>False</strong> yoluna saptırır.</p>',
        params: [{ name: 'Condition', type: 'Expression', required: true, desc: 'Örn: {{price}} > 100' }],
        outputs: [],
        examples: [{ title: 'Fiyat Kontrolü', code: '{{$json.price}} > 1000', explanation: 'Fiyat 1000 TL üzerindeyse yöneticiye e-posta at.' }]
    },
    {
        id: 'SWITCH', title: 'Switch', type: 'control', summary: 'Çoklu seçim.',
        overviewHTML: '<p>Bir değerin içeriğine göre birden fazla (Case 1, Case 2...) yola ayrılır.</p>',
        params: [{ name: 'Value', type: 'String', required: true, desc: 'Kontrol edilecek değişken' }],
        outputs: [],
        examples: [{ title: 'Dosya Tipi', code: 'Value: {{file.type}} -> Case "PDF", Case "IMG"', explanation: 'Dosya tipine göre farklı işlem yapar.' }]
    },
    {
        id: 'LOOP', title: 'Loop', type: 'control', summary: 'Döngü.',
        overviewHTML: '<p>Bir liste (Array) üzerindeki her eleman için akışı tekrar çalıştırır.</p>',
        params: [{ name: 'Items', type: 'Array', required: true, desc: 'Dönülecek liste' }],
        outputs: [{ field: 'item', type: 'Any', desc: 'O anki eleman' }],
        examples: [{ title: 'E-posta Listesi', code: 'Items: {{$json.users}}', explanation: 'Listetedeki her kullanıcıya tek tek e-posta atar.' }]
    },
    {
        id: 'DELAY', title: 'Delay', type: 'control', summary: 'Bekle.',
        overviewHTML: '<p>Akışı belirli bir süre duraklatır.</p>',
        params: [{ name: 'Duration', type: 'Number', required: true, desc: 'Saniye/Dakika' }],
        outputs: [],
        examples: [{ title: '5 Saniye Bekle', code: '5000ms', explanation: 'İşlemden önce 5 saniye bekler.' }]
    },
    {
        id: 'CODE_EXECUTION', title: 'Code (JS)', type: 'control', summary: 'JavaScript çalıştır.',
        overviewHTML: '<p>Özel JavaScript kodu yazarak karmaşık işlemler yapmanızı sağlar.</p>',
        params: [{ name: 'Code', type: 'Javascript', required: true, desc: 'Fonksiyon gövdesi' }],
        outputs: [{ field: 'result', type: 'Any', desc: 'Return değeri' }],
        examples: [{ title: 'Veri Dönüştürme', code: 'return items.map(i => i.name.toUpperCase());', explanation: 'İsimleri büyük harfe çevirir.' }]
    },

    // ═════════════════════════════════════════
    // AI (YAPAY ZEKA)
    // ═════════════════════════════════════════
    {
        id: 'AGENT_AI', title: 'AI Agent (LLM)', type: 'ai', summary: 'GPT/Gemini ile metin işleme.',
        overviewHTML: '<p>Yapay zeka modellerini (GPT-4, Gemini) kullanarak metin üretir, özetler veya analiz eder.</p>',
        params: [
            { name: 'Model', type: 'Select', required: true, desc: 'GPT-4o, Gemini Pro' },
            { name: 'Prompt', type: 'Text', required: true, desc: 'Talimat' }
        ],
        outputs: [{ field: 'content', type: 'String', desc: 'AI Yanıtı' }],
        examples: [
            { title: 'Özetleme', code: 'Prompt: "Şu metni özetle: {{$json.body}}"', explanation: 'Gelen e-postayı özetler.' },
            { title: 'Kod Yazma', code: 'Prompt: "Node.js ile bir HTTP server yaz."', explanation: 'İstenen kodu üretir.' }
        ]
    },
    {
        id: 'IMAGE_GENERATOR', title: 'Image Generator', type: 'ai', summary: 'Resim üret.',
        overviewHTML: '<p>DALL-E veya Stable Diffusion kullanarak metinden görsel üretir.</p>',
        params: [{ name: 'Prompt', type: 'Text', required: true, desc: 'Görsel tarifi' }],
        outputs: [{ field: 'imageUrl', type: 'String', desc: 'Resim URL' }],
        examples: [{ title: 'Logo Tasarımı', code: 'Prompt: "Minimalist coffee shop logo vector"', explanation: 'Kahve dükkanı logosu çizer.' }]
    },
    {
        id: 'SPEECH_TO_TEXT', title: 'Speech to Text', type: 'audio', summary: 'Sesi yazıya çevir.',
        overviewHTML: '<p>Ses dosyasını veya mikrofon kaydını metne dönüştürür (Whisper).</p>',
        params: [{ name: 'File', type: 'File', required: false, desc: 'Ses dosyası' }],
        outputs: [{ field: 'text', type: 'String', desc: 'Döküm' }],
        examples: [{ title: 'Toplantı Notu', code: 'Input: Kayıt.mp3', explanation: 'Ses kaydını yazıya döker.' }]
    },

    // ═════════════════════════════════════════
    // WEB & API
    // ═════════════════════════════════════════
    {
        id: 'HTTP_REQUEST', title: 'HTTP Request', type: 'web', summary: 'API isteği yap.',
        overviewHTML: '<p>Herhangi bir sunucuya REST API (GET/POST/PUT) isteği gönderir.</p>',
        params: [
            { name: 'URL', type: 'String', required: true, desc: 'https://api.example.com' },
            { name: 'Method', type: 'Select', required: true, desc: 'GET/POST' },
            { name: 'Headers', type: 'JSON', required: false, desc: 'Auth headerları' }
        ],
        outputs: [{ field: 'data', type: 'Object', desc: 'Sunucu yanıtı' }],
        examples: [{ title: 'Döviz Kuru Çekme', code: 'GET https://api.exchangerate.host/latest', explanation: 'Güncel kurları çeker.' }]
    },
    {
        id: 'BROWSER_SCRAPE', title: 'Web Scraper', type: 'web', summary: 'Site verisi kazı.',
        overviewHTML: '<p>Bir web sitesine girer ve belirtilen alanın (CSS Selector) metnini çeker.</p>',
        params: [{ name: 'URL', type: 'String', required: true, desc: 'Site adresi' }, { name: 'Selector', type: 'String', required: true, desc: '.price-tag' }],
        outputs: [{ field: 'text', type: 'String', desc: 'Bulunan metin' }],
        examples: [{ title: 'Fiyat Takibi', code: 'Selector: ".product-price"', explanation: 'E-ticaret sitesinden ürün fiyatını okur.' }]
    },

    // ═════════════════════════════════════════
    // DEVICE & PHONE
    // ═════════════════════════════════════════
    {
        id: 'NOTIFICATION', title: 'Show Notification', type: 'device', summary: 'Bildirim göster.',
        overviewHTML: '<p>Telefonda yerel bir bildirim oluşturur.</p>',
        params: [{ name: 'Title', type: 'String', required: false, desc: 'Başlık' }, { name: 'Message', type: 'String', required: true, desc: 'Mesaj' }],
        outputs: [],
        examples: [{ title: 'İşlem Tamamlandı', code: 'Message: "Dosya başarıyla yüklendi."', explanation: 'İşlem bitince kullanıcıya haber verir.' }]
    },
    {
        id: 'APP_LAUNCH', title: 'Launch App', type: 'device', summary: 'Uygulama aç.',
        overviewHTML: '<p>Yüklü bir uygulamayı paket adıyla başlatır.</p>',
        params: [{ name: 'Package Name', type: 'String', required: true, desc: 'com.instagram.android' }],
        outputs: [],
        examples: [{ title: 'Instagram\'ı Aç', code: 'Package: com.instagram.android', explanation: 'Instagram uygulamasını açar.' }]
    },
    {
        id: 'CLIPBOARD', title: 'Clipboard', type: 'device', summary: 'Pano yönetimi.',
        overviewHTML: '<p>Panoya metin kopyalar veya panodaki metni okur.</p>',
        params: [{ name: 'Action', type: 'Select', required: true, desc: 'Copy / Paste' }],
        outputs: [{ field: 'content', type: 'String', desc: 'Okunan veri' }],
        examples: [{ title: 'Link Kopyala', code: 'Action: Copy, Text: {{url}}', explanation: 'Üretilen linki panoya kopyalar.' }]
    },
    {
        id: 'VOLUME_CONTROL', title: 'Volume', type: 'audio', summary: 'Ses seviyesi.',
        overviewHTML: '<p>Medya, Zil Sesi veya Alarm seviyesini değiştirir.</p>',
        params: [{ name: 'Level', type: 'Number', required: true, desc: '0 - 100' }],
        outputs: [],
        examples: [{ title: 'Sessize Al', code: 'Level: 0', explanation: 'Toplantı modunda sesi kapatır.' }]
    },
    {
        id: 'BATTERY_CHECK', title: 'Battery Level', type: 'device', summary: 'Pil durumu.',
        overviewHTML: '<p>Cihazın şarj seviyesini ve şarjda olup olmadığını kontrol eder.</p>',
        params: [],
        outputs: [{ field: 'level', type: 'Number', desc: '%' }, { field: 'isCharging', type: 'Boolean', desc: 'Şarj oluyor mu?' }],
        examples: [{ title: 'Düşük Pil Uyarısı', code: 'If level < 20', explanation: 'Pil %20 altındaysa uyarı verir.' }]
    },

    // ═════════════════════════════════════════
    // GOOGLE & MICROSOFT & SOCIAL
    // ═════════════════════════════════════════
    {
        id: 'GMAIL_SEND', title: 'Gmail Send', type: 'google', summary: 'E-posta at.',
        overviewHTML: '<p>Gmail hesabınızdan e-posta gönderir.</p>',
        params: [{ name: 'To', type: 'String', required: true, desc: 'Alıcı' }, { name: 'Subject', type: 'String', required: true, desc: 'Konu' }],
        outputs: [],
        examples: [{ title: 'Rapor Gönder', code: 'Subject: "Günlük Rapor"', explanation: 'Hazırlanan raporu patrona e-postalar.' }]
    },
    {
        id: 'SHEETS_WRITE', title: 'Sheets Row', type: 'google', summary: 'Tabloya ekle.',
        overviewHTML: '<p>Google Sheets tablosuna yeni bir satır ekler.</p>',
        params: [{ name: 'Values', type: 'Array', required: true, desc: 'Sütun verileri' }],
        outputs: [],
        examples: [{ title: 'Harcama Kaydı', code: 'Values: ["Kahve", "50 TL", "Bugün"]', explanation: 'Harcamayı tabloya işler.' }]
    },
    {
        id: 'WHATSAPP_SEND', title: 'WhatsApp Send', type: 'communication', summary: 'Mesaj gönder.',
        overviewHTML: '<p>WhatsApp üzerinden mesaj gönderir (Otomatik veya Onaylı).</p>',
        params: [{ name: 'Phone', type: 'String', required: true, desc: '+90...' }, { name: 'Message', type: 'Text', required: true, desc: 'Mesaj' }],
        outputs: [],
        examples: [{ title: 'Konum Paylaş', code: 'Message: "Evdeyim: {{location}}"', explanation: 'Konumunuzu WhatsApp\'tan atar.' }]
    },
    {
        id: 'INSTAGRAM_POST', title: 'Instagram Post', type: 'social', summary: 'Fotoğraf paylaş.',
        overviewHTML: '<p>Instagram akışında fotoğraf veya video paylaşır.</p>',
        params: [{ name: 'Media', type: 'String', required: true, desc: 'Dosya yolu' }, { name: 'Caption', type: 'Text', required: false, desc: 'Açıklama' }],
        outputs: [],
        examples: [{ title: 'Günlük Paylaşım', code: 'Media: {{image.path}}', explanation: 'Üretilen görseli Instagram\'a yükler.' }]
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
        // Initialize all categories
        Object.keys(CATEGORY_STYLES).forEach(k => groups[k] = []);

        filteredNodes.forEach(node => {
            if (groups[node.type]) {
                groups[node.type].push(node);
            } else {
                // Fallback for types not in style map
                if (!groups['device']) groups['device'] = [];
                groups['device'].push(node);
            }
        });
        return groups;
    }, [filteredNodes]);

    return (
        <div className={styles.pageContainer}>
            {/* --- SIDEBAR --- */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>BreviAI Docs</div>
                    <div className={styles.version}>v10.0</div>
                </div>

                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="Filter nodes..."
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
                                    <span className={styles.catIcon}>{style.icon}</span>
                                    {style.label}
                                </div>
                                <div className={styles.nodeList}>
                                    {nodes.map(node => (
                                        <button
                                            key={node.id}
                                            className={`${styles.nodeItem} ${selectedNodeId === node.id ? styles.activeNode : ''}`}
                                            onClick={() => {
                                                setSelectedNodeId(node.id);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
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

            {/* --- MAIN CONTENT --- */}
            <main className={styles.mainContent}>
                {/* HERO */}
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
                    <div className={styles.mockupContainer}>
                        <div className={styles.nodeMockup} style={{ borderColor: CATEGORY_STYLES[selectedNode.type]?.color || '#555' }}>
                            <div className={styles.mockupHeader} style={{ background: `linear-gradient(135deg, ${CATEGORY_STYLES[selectedNode.type]?.color || '#555'}, ${CATEGORY_STYLES[selectedNode.type]?.color || '#555'}80)` }}>
                                <span className={styles.mockupIcon}>{CATEGORY_STYLES[selectedNode.type]?.icon || '📦'}</span>
                                <span className={styles.mockupTitle}>{selectedNode.title}</span>
                            </div>
                            <div className={styles.mockupBody}>
                                <div className={styles.mockupLine}></div>
                                <div className={styles.mockupLine} style={{ width: '60%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div className={styles.tabsContainer}>
                    {(['overview', 'params', 'examples', 'credentials'] as const).map(tab => (
                        <button
                            key={tab}
                            className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* CONTENT AREA */}
                <div className={styles.contentArea}>
                    {activeTab === 'overview' && (
                        <div className={styles.prose} dangerouslySetInnerHTML={{ __html: selectedNode.overviewHTML }} />
                    )}

                    {activeTab === 'params' && (
                        <div className={styles.paramsTableWrapper}>
                            <table className={styles.paramsTable}>
                                <thead>
                                    <tr>
                                        <th>Parameter</th>
                                        <th>Type</th>
                                        <th>Required</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedNode.params.map((p, i) => (
                                        <tr key={i}>
                                            <td className={styles.fontMono}>{p.name}</td>
                                            <td><span className={styles.tag}>{p.type}</span></td>
                                            <td>{p.required ? '✅' : 'Optional'}</td>
                                            <td>{p.desc}</td>
                                        </tr>
                                    ))}
                                    {selectedNode.params.length === 0 && (
                                        <tr><td colSpan={4} className={styles.emptyState}>Bu düğüm için parametre gerekmez.</td></tr>
                                    )}
                                </tbody>
                            </table>
                            {selectedNode.outputs.length > 0 && (
                                <div className={styles.outputSection}>
                                    <h3 className={styles.sectionHeader}>Ouptuts (Çıktılar)</h3>
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
                                    <h4>{ex.title}</h4>
                                    <p>{ex.explanation}</p>
                                    <div className={styles.codeBlock}>
                                        <pre>{ex.code}</pre>
                                    </div>
                                </div>
                            ))}
                            {selectedNode.examples.length === 0 && (
                                <div className={styles.emptyState}>Bu düğüm için henüz örnek senaryo eklenmedi.</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'credentials' && (
                        <div className={styles.credentialsBox}>
                            {selectedNode.credentials
                                ? <p>{selectedNode.credentials}</p>
                                : <p>Bu düğüm için özel kimlik doğrulama gerekmez.</p>
                            }
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
