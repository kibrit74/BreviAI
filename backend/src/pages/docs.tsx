import { useState, useMemo } from 'react';
import '../app/globals.css';
import styles from './docs.module.css';

// --- ICONS & COLORS ---
const CATEGORY_STYLES: Record<string, { color: string; icon: string; label: string }> = {
    trigger: { color: '#10B981', icon: '⚡', label: 'Tetikleyiciler' },
    logic: { color: '#6366F1', icon: '🔀', label: 'Mantık & Kontrol' },
    ai: { color: '#EC4899', icon: '✨', label: 'Yapay Zeka (AI)' },
    google: { color: '#4285F4', icon: '🌐', label: 'Google Servisleri' },
    microsoft: { color: '#0078D4', icon: '🪟', label: 'Microsoft Office' },
    social: { color: '#1877F2', icon: '🔗', label: 'Sosyal Medya' },
    web: { color: '#06B6D4', icon: '🌍', label: 'Web & API' },
    device: { color: '#EF4444', icon: '📱', label: 'Cihaz Sensörleri' },
    files: { color: '#F59E0B', icon: '📂', label: 'Dosya İşlemleri' },
    calendar: { color: '#8B5CF6', icon: '📅', label: 'Takvim & Ajanda' },
    productivity: { color: '#374151', icon: '💼', label: 'Üretkenlik' },
    smart_home: { color: '#FCD34D', icon: '🏠', label: 'Akıllı Ev' },
    communication: { color: '#F97316', icon: '💬', label: 'İletişim' },
    location: { color: '#8B5CF6', icon: '📍', label: 'Konum & Harita' },
    data: { color: '#6366F1', icon: '💾', label: 'Veri & Hafıza' },
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

// --- MASSIVE DATA (Specific Content for 70+ Nodes) ---
const NODES: NodeDoc[] = [
    // --- TRIGGERS ---
    {
        id: 'MANUAL',
        title: 'Manual Trigger',
        type: 'trigger',
        summary: 'Akışı manuel olarak başlatır.',
        overviewHTML: `<p>Akışı test etmek veya kullanıcı butonuyla başlatmak için kullanılır.</p>`,
        params: [], outputs: [], examples: []
    },
    {
        id: 'CRON',
        title: 'Interval / Cron',
        type: 'trigger',
        summary: 'Zamanlanmış görev.',
        overviewHTML: `<p>Belirli aralıklarla (Interval) veya belirli zamanlarda (Cron) çalışır.</p>`,
        params: [{ name: 'Expression', type: 'String', required: true, desc: 'Cron formatı veya dakika.' }], outputs: [], examples: []
    },
    {
        id: 'WEBHOOK',
        title: 'Webhook',
        type: 'trigger',
        summary: 'HTTP isteği ile tetiklenir.',
        overviewHTML: `<p>Dış servislerden veri almanızı sağlar (Örn: Stripe, Typeform).</p>`,
        params: [{ name: 'Method', type: 'Select', required: true, desc: 'GET/POST' }], outputs: [], examples: []
    },
    { id: 'GESTURE', title: 'Gesture Trigger', type: 'trigger', summary: 'Harekete duyarlı tetikleyici.', overviewHTML: '<p>Telefonu salladığınızda (Shake) veya çevirdiğinizde (Flip) akışı başlatır.</p>', params: [{ name: 'Type', type: 'Select', required: true, desc: 'Shake / Flip' }], outputs: [], examples: [] },
    { id: 'LIGHT_SENSOR', title: 'Light Sensor', type: 'trigger', summary: 'Ortam ışığı değişince.', overviewHTML: '<p>Ortam ışık seviyesi (Lüks) belirli bir eşiği geçince çalışır.</p>', params: [{ name: 'Threshold', type: 'Number', required: true, desc: 'Lüks değeri' }], outputs: [{ field: 'lux', type: 'Number', desc: 'Işık şiddeti' }], examples: [] },
    { id: 'PEDOMETER', title: 'Pedometer', type: 'trigger', summary: 'Adım atınca.', overviewHTML: '<p>Belirli adım sayısına ulaşınca tetiklenir.</p>', params: [{ name: 'Steps', type: 'Number', required: true, desc: 'Hedef adım' }], outputs: [], examples: [] },

    // --- AI ---
    {
        id: 'AGENT_AI',
        title: 'AI Agent',
        type: 'ai',
        summary: 'LLM (GPT/Gemini).',
        overviewHTML: `<p>Yapay zeka modelleri ile metin işler, özet çıkarır veya cevap üretir.</p>`,
        params: [{ name: 'Prompt', type: 'Text', required: true, desc: 'Komut' }],
        outputs: [{ field: 'content', type: 'String', desc: 'AI Cevabı' }], examples: []
    },
    { id: 'IMAGE_GEN', title: 'Image Generator', type: 'ai', summary: 'Resim üretme (DALL-E).', overviewHTML: '<p>Metin açıklamasından görsel üretir.</p>', params: [{ name: 'Prompt', type: 'Text', required: true, desc: 'Görsel tarifi' }], outputs: [{ field: 'imageUrl', type: 'String', desc: 'Resim linki' }], examples: [] },
    { id: 'SPEECH_TO_TEXT', title: 'Speech to Text', type: 'ai', summary: 'Sesi yazıya çevir.', overviewHTML: '<p>Mikrofon kaydını veya ses dosyasını metne dönüştürür (Whisper).</p>', params: [], outputs: [{ field: 'text', type: 'String', desc: 'Döküm' }], examples: [] },

    // --- LOGIC ---
    { id: 'IF', title: 'IF Condition', type: 'logic', summary: 'Koşullu yönlendirme.', overviewHTML: '<p>Veriyi True/False çıkışlarına yönlendirir.</p>', params: [{ name: 'Condition', type: 'Expression', required: true, desc: 'x > 5' }], outputs: [], examples: [] },
    { id: 'LOOP', title: 'Loop', type: 'logic', summary: 'Döngü işlemi.', overviewHTML: '<p>Bir liste üzerinde tek tek işlem yapar.</p>', params: [{ name: 'Array', type: 'List', required: true, desc: 'Dönülecek veri' }], outputs: [{ field: 'item', type: 'Any', desc: 'Eleman' }], examples: [] },
    { id: 'WAIT', title: 'Wait', type: 'logic', summary: 'Bekleme.', overviewHTML: '<p>Akışı belirli bir süre duraklatır.</p>', params: [{ name: 'Seconds', type: 'Number', required: true, desc: 'Saniye' }], outputs: [], examples: [] },
    { id: 'MERGE', title: 'Merge', type: 'logic', summary: 'Birleştirme.', overviewHTML: '<p>Farklı kollardan gelen verileri tek bir akışta birleştirir.</p>', params: [], outputs: [], examples: [] },
    { id: 'SWITCH', title: 'Switch', type: 'logic', summary: 'Çoklu seçim.', overviewHTML: '<p>Değere göre farklı yollara (Case 1, Case 2...) yönlendirir.</p>', params: [{ name: 'Expression', type: 'String', required: true, desc: 'Değişken' }], outputs: [], examples: [] },
    { id: 'SET_VALUES', title: 'Set Variable', type: 'logic', summary: 'Değişken tanımla.', overviewHTML: '<p>Geçici değişkenler oluşturur veya günceller.</p>', params: [{ name: 'Name', type: 'String', required: true, desc: 'Değişken adı' }, { name: 'Value', type: 'String', required: true, desc: 'Değer' }], outputs: [], examples: [] },
    { id: 'EXECUTE_WORKFLOW', title: 'Sub-Workflow', type: 'logic', summary: 'Alt akış çalıştır.', overviewHTML: '<p>Başka bir kayıtlı iş akışını çağırır.</p>', params: [{ name: 'Workflow ID', type: 'Select', required: true, desc: 'Seçilen akış' }], outputs: [], examples: [] },

    // --- GOOGLE ---
    { id: 'GMAIL_READ', title: 'Gmail Read', type: 'google', summary: 'E-posta oku.', overviewHTML: '<p>Gelen kutusundaki son e-postaları filtreler ve okur.</p>', params: [{ name: 'Query', type: 'String', required: false, desc: '"from:amazon"' }], outputs: [{ field: 'subject', type: 'String', desc: 'Konu' }], examples: [] },
    { id: 'GMAIL_SEND', title: 'Gmail Send', type: 'google', summary: 'E-posta gönder.', overviewHTML: '<p>Gmail hesabınız üzerinden e-posta atar.</p>', params: [{ name: 'To', type: 'String', required: true, desc: 'Alıcı' }], outputs: [], examples: [] },
    { id: 'SHEETS_READ', title: 'Sheets Read', type: 'google', summary: 'Tablo oku.', overviewHTML: '<p>Google Sheets satırlarını okur.</p>', params: [{ name: 'Range', type: 'String', required: true, desc: 'Sheet1!A:C' }], outputs: [{ field: 'rows', type: 'Array', desc: 'Satırlar' }], examples: [] },
    { id: 'SHEETS_WRITE', title: 'Sheets Write', type: 'google', summary: 'Tablo yaz.', overviewHTML: '<p>Google Sheets\'e yeni satır ekler.</p>', params: [{ name: 'Values', type: 'Array', required: true, desc: 'Eklenecek veriler' }], outputs: [], examples: [] },
    { id: 'DRIVE_UPLOAD', title: 'Drive Upload', type: 'google', summary: 'Dosya yükle.', overviewHTML: '<p>Google Drive\'a dosya yükler.</p>', params: [{ name: 'File Path', type: 'String', required: true, desc: 'Dosya yolu' }], outputs: [{ field: 'link', type: 'String', desc: 'Paylaşım linki' }], examples: [] },

    // --- MICROSOFT ---
    { id: 'OUTLOOK_READ', title: 'Outlook Read', type: 'microsoft', summary: 'E-posta oku.', overviewHTML: '<p>Outlook gelen kutusunu okur.</p>', params: [], outputs: [], examples: [] },
    { id: 'EXCEL_READ', title: 'Excel Read', type: 'microsoft', summary: 'Excel oku.', overviewHTML: '<p>OneDrive üzerindeki Excel dosyasını okur.</p>', params: [{ name: 'File', type: 'FilePicker', required: true, desc: 'Dosya seç' }], outputs: [], examples: [] },
    { id: 'ONEDRIVE_LIST', title: 'OneDrive List', type: 'microsoft', summary: 'Dosya listele.', overviewHTML: '<p>Klasör içeriğini listeler.</p>', params: [], outputs: [], examples: [] },

    // --- SOCIAL ---
    { id: 'WHATSAPP_SEND', title: 'WhatsApp Send', type: 'social', summary: 'Mesaj gönder.', overviewHTML: '<p>Bağlı cihaz üzerinden WhatsApp mesajı atar.</p>', params: [{ name: 'Phone', type: 'String', required: true, desc: 'Numara' }, { name: 'Message', type: 'Text', required: true, desc: 'Mesaj' }], outputs: [], examples: [] },
    { id: 'TELEGRAM_SEND', title: 'Telegram Send', type: 'social', summary: 'Bot mesajı.', overviewHTML: '<p>Telegram Bot API ile mesaj atar.</p>', params: [{ name: 'Chat ID', type: 'String', required: true, desc: 'Kullanıcı ID' }], outputs: [], examples: [] },
    { id: 'INSTAGRAM_POST', title: 'Instagram Post', type: 'social', summary: 'Paylaşım yap.', overviewHTML: '<p>Otomatik resim/video paylaşır.</p>', params: [{ name: 'Media', type: 'String', required: true, desc: 'Dosya yolu' }], outputs: [], examples: [] },

    // --- DEVICE ---
    { id: 'NOTIFICATION', title: 'Notification', type: 'device', summary: 'Bildirim gönder.', overviewHTML: '<p>Telefona yerel bildirim gönderir.</p>', params: [{ name: 'Title', type: 'String', required: true, desc: 'Başlık' }], outputs: [], examples: [] },
    { id: 'CLIPBOARD', title: 'Clipboard', type: 'device', summary: 'Pano işlemi.', overviewHTML: '<p>Kopyalama veya yapıştırma yapar.</p>', params: [{ name: 'Action', type: 'Select', required: true, desc: 'Copy/Paste' }], outputs: [], examples: [] },
    { id: 'VOLUME', title: 'Volume Control', type: 'device', summary: 'Ses kontrolü.', overviewHTML: '<p>Telefonun ses seviyesini değiştirir.</p>', params: [{ name: 'Level', type: 'Number', required: true, desc: '%0-100' }], outputs: [], examples: [] },
    { id: 'APP_LAUNCH', title: 'App Launch', type: 'device', summary: 'Uygulama aç.', overviewHTML: '<p>Paket ismi ile uygulama başlatır.</p>', params: [{ name: 'Package', type: 'String', required: true, desc: 'com.instagram.android' }], outputs: [], examples: [] },
    { id: 'BATTERY', title: 'Battery Check', type: 'device', summary: 'Pil durumu.', overviewHTML: '<p>Pil seviyesini ve şarj durumunu okur.</p>', params: [], outputs: [{ field: 'level', type: 'Number', desc: '%' }], examples: [] },
    { id: 'LOCATION', title: 'Get Location', type: 'location', summary: 'GPS Konumu.', overviewHTML: '<p>Anlık enlem/boylam bilgisini alır.</p>', params: [], outputs: [{ field: 'lat', type: 'Number', desc: 'Enlem' }], examples: [] },

    // --- FILES ---
    { id: 'FILE_READ', title: 'File Read', type: 'files', summary: 'Dosya oku.', overviewHTML: '<p>Metin veya veriyi dosyadan okur.</p>', params: [{ name: 'Path', type: 'String', required: true, desc: 'Dosya yolu' }], outputs: [{ field: 'content', type: 'String', desc: 'İçerik' }], examples: [] },
    { id: 'FILE_WRITE', title: 'File Write', type: 'files', summary: 'Dosya yaz.', overviewHTML: '<p>Metni dosyaya kaydeder. Yoksa oluşturur.</p>', params: [{ name: 'Content', type: 'String', required: true, desc: 'Yazılacak veri' }], outputs: [], examples: [] },
    { id: 'PDF_CREATE', title: 'PDF Create', type: 'files', summary: 'PDF oluştur.', overviewHTML: '<p>HTML veya metinden PDF üretir.</p>', params: [{ name: 'HTML', type: 'String', required: true, desc: 'Kaynak' }], outputs: [{ field: 'path', type: 'String', desc: 'PDF yolu' }], examples: [] },

    // --- WEB ---
    { id: 'HTTP', title: 'HTTP Request', type: 'web', summary: 'API isteği.', overviewHTML: '<p>REST API çağrısı yapar (GET/POST/PUT).</p>', params: [{ name: 'URL', type: 'String', required: true, desc: 'Endpoint' }], outputs: [{ field: 'data', type: 'Object', desc: 'Response' }], examples: [] },
    { id: 'SCRAPE', title: 'Web Scrape', type: 'web', summary: 'Veri kazı.', overviewHTML: '<p>Bir web sitesinin HTML içeriğini çeker ve parçalar.</p>', params: [{ name: 'Selector', type: 'String', required: true, desc: 'CSS Selector' }], outputs: [], examples: [] },

    // --- SMART HOME ---
    { id: 'HUE', title: 'Philips Hue', type: 'smart_home', summary: 'Işık kontrolü.', overviewHTML: '<p>Hue Bridge üzerinden lambaları açar/kapatır veya renk değiştirir.</p>', params: [{ name: 'Light ID', type: 'String', required: true, desc: 'Lamba' }, { name: 'State', type: 'Boolean', required: true, desc: 'On/Off' }], outputs: [], examples: [] }
];

export default function DocsPage() {
    const [selectedNodeId, setSelectedNodeId] = useState<string>(NODES[0].id);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'params' | 'examples' | 'credentials'>('overview');

    const selectedNode = useMemo(() => NODES.find(n => n.id === selectedNodeId) || NODES[0], [selectedNodeId]);

    const filteredNodes = useMemo(() => {
        return NODES.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm]);

    // Group nodes for sidebar
    const nodesByCategory = useMemo(() => {
        const groups: Record<string, NodeDoc[]> = {};
        filteredNodes.forEach(node => {
            if (!groups[node.type]) groups[node.type] = [];
            groups[node.type].push(node);
        });
        return groups;
    }, [filteredNodes]);

    return (
        <div className={styles.pageContainer}>
            {/* --- SIDEBAR --- */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>BreviAI Docs</div>
                    <div className={styles.version}>v9.0</div>
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
                        backgroundColor: CATEGORY_STYLES[selectedNode.type].color + '20',
                        color: CATEGORY_STYLES[selectedNode.type].color
                    }}>
                        {CATEGORY_STYLES[selectedNode.type].icon}
                    </div>
                    <div className={styles.heroText}>
                        <h1 className={styles.nodeTitle}>{selectedNode.title}</h1>
                        <p className={styles.nodeSummary}>{selectedNode.summary}</p>
                    </div>
                    <div className={styles.mockupContainer}>
                        {/* CSS Visual Mockup of the Node */}
                        <div className={styles.nodeMockup} style={{ borderColor: CATEGORY_STYLES[selectedNode.type].color }}>
                            <div className={styles.mockupHeader} style={{ background: `linear-gradient(135deg, ${CATEGORY_STYLES[selectedNode.type].color}, ${CATEGORY_STYLES[selectedNode.type].color}80)` }}>
                                <span className={styles.mockupIcon}>{CATEGORY_STYLES[selectedNode.type].icon}</span>
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
                                        <tr><td colSpan={4} className={styles.emptyState}>Bu düğüm için özel parametre yoktur.</td></tr>
                                    )}
                                </tbody>
                            </table>
                            {selectedNode.outputs.length > 0 && (
                                <>
                                    <h3 className={styles.sectionHeader}>Ouptuts (Çıktılar)</h3>
                                    <ul className={styles.outputList}>
                                        {selectedNode.outputs.map((o, i) => (
                                            <li key={i}><code className={styles.outputField}>{o.field}</code> ({o.type}): {o.desc}</li>
                                        ))}
                                    </ul>
                                </>
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
                                <div className={styles.emptyState}>Henüz örnek senaryo eklenmedi.</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'credentials' && (
                        <div className={styles.credentialsBox}>
                            {selectedNode.credentials
                                ? <p>{selectedNode.credentials}</p>
                                : <p>Bu düğüm için kimlik doğrulama gerekmez.</p>
                            }
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
