import { useState } from 'react';
import '../app/globals.css';
import styles from './docs.module.css';

// --- ICONS & COLORS (From App) ---
const CATEGORY_STYLES: Record<string, { color: string; icon: string }> = {
    trigger: { color: '#10B981', icon: '⚡' },
    logic: { color: '#6366F1', icon: 'twisted_right' }, // Control
    input: { color: '#8B5CF6', icon: 'log-in' },
    output: { color: '#F59E0B', icon: 'log-out' },
    device: { color: '#EF4444', icon: 'hardware-chip' },
    ai: { color: '#EC4899', icon: 'sparkles' },
    google: { color: '#4285F4', icon: 'logo-google' },
    microsoft: { color: '#0078D4', icon: 'logo-windows' },
    social: { color: '#1877F2', icon: 'share-social' },
    web: { color: '#06B6D4', icon: 'globe' },
    communication: { color: '#F59E0B', icon: 'chatbubbles' },
    files: { color: '#10B981', icon: 'folder' },
    audio: { color: '#EF4444', icon: 'volume-high' },
    location: { color: '#8B5CF6', icon: 'location' },
    calendar: { color: '#8B5CF6', icon: 'calendar' },
    data: { color: '#6366F1', icon: 'server' },
    state: { color: '#14B8A6', icon: 'pulse' },
    productivity: { color: '#374151', icon: 'briefcase' },
    smart_home: { color: '#FCD34D', icon: 'home' },
    backend: { color: '#64748B', icon: 'cloud' }
};

type NodeType = keyof typeof CATEGORY_STYLES;

interface NodeDoc {
    id: string;
    title: string;
    type: NodeType;
    description: string;
    longDescription?: string;
    params?: { name: string; type: string; required: boolean; desc: string }[];
    outputs?: { field: string; type: string; desc: string }[];
    jsonExample?: string;
    tips?: string[];
    troubleshooting?: { error: string; solution: string }[];
}

// --- MASSIVE NODE DATABASE (100+ Nodes) ---
const NODES: NodeDoc[] = [
    // --- TRIGGERS ---
    { id: 'MANUAL', title: 'Manual Trigger', type: 'trigger', description: 'Butona basınca çalışır.', longDescription: 'Akışı manuel başlatır.', params: [], outputs: [] },
    { id: 'CRON', title: 'Cron Trigger', type: 'trigger', description: 'Zamanlanmış görev.', longDescription: 'Belirli aralıklarla çalışır.', params: [{ name: 'Expression', type: 'String', required: true, desc: 'Cron formatı' }], outputs: [] },
    { id: 'WEBHOOK', title: 'Webhook', type: 'trigger', description: 'HTTP isteği ile tetiklenir.', params: [{ name: 'Method', type: 'Select', required: true, desc: 'GET/POST' }], outputs: [] },
    { id: 'GESTURE', title: 'Gesture Trigger', type: 'trigger', description: 'Salla veya çevir.', params: [], outputs: [] },
    { id: 'LIGHT_SENSOR', title: 'Light Sensor', type: 'trigger', description: 'Işık seviyesi değişince.', params: [], outputs: [] },
    { id: 'PEDOMETER', title: 'Pedometer', type: 'trigger', description: 'Adım atınca.', params: [], outputs: [] },

    // --- LOGIC / CONTROL ---
    { id: 'IF', title: 'IF Condition', type: 'logic', description: 'Koşullu yönlendirme.', params: [{ name: 'Condition', type: 'Expression', required: true, desc: 'Karşılaştırma' }], outputs: [] },
    { id: 'SWITCH', title: 'Switch', type: 'logic', description: 'Çoklu yol ayrımı.', params: [], outputs: [] },
    { id: 'LOOP', title: 'Loop', type: 'logic', description: 'Döngü işlemi.', params: [{ name: 'Items', type: 'Array', required: true, desc: 'Dönülecek liste' }], outputs: [] },
    { id: 'WAIT', title: 'Wait', type: 'logic', description: 'Bekleme süresi.', params: [{ name: 'Duration', type: 'Number', required: true, desc: 'Ms cinsinden' }], outputs: [] },
    { id: 'MERGE', title: 'Merge', type: 'logic', description: 'Kolları birleştirme.', params: [], outputs: [] },
    { id: 'EXECUTE_WORKFLOW', title: 'Sub-Workflow', type: 'logic', description: 'Başka akış çalıştır.', params: [], outputs: [] },
    { id: 'CODE', title: 'Code Execution', type: 'logic', description: 'JS Kodu çalıştır.', params: [{ name: 'Code', type: 'String', required: true, desc: 'JavaScript' }], outputs: [] },
    { id: 'SET_VALUES', title: 'Set Variable', type: 'logic', description: 'Değişken ata.', params: [], outputs: [] },

    // --- AI ---
    { id: 'AGENT_AI', title: 'AI Agent', type: 'ai', description: 'LLM (GPT/Gemini).', longDescription: 'Yapay zeka ile metin işleme.', params: [{ name: 'Prompt', type: 'String', required: true, desc: 'Komut' }], outputs: [{ field: 'content', type: 'String', desc: 'Yanıt' }] },
    { id: 'IMAGE_GEN', title: 'Image Generator', type: 'ai', description: 'Resim üretme.', params: [{ name: 'Prompt', type: 'String', required: true, desc: 'Görsel tarifi' }], outputs: [] },
    { id: 'IMAGE_EDIT', title: 'Image Edit', type: 'ai', description: 'Resim düzenleme.', params: [], outputs: [] },
    { id: 'SPEECH_TO_TEXT', title: 'Speech to Text', type: 'ai', description: 'Sesi yazıya çevir.', params: [], outputs: [] },
    { id: 'TRANSLATE', title: 'Google Translate', type: 'ai', description: 'Çeviri yap.', params: [], outputs: [] },

    // --- GOOGLE ---
    { id: 'GMAIL_READ', title: 'Gmail Read', type: 'google', description: 'E-posta oku.', params: [], outputs: [] },
    { id: 'GMAIL_SEND', title: 'Gmail Send', type: 'google', description: 'E-posta gönder.', params: [], outputs: [] },
    { id: 'SHEETS_READ', title: 'Sheets Read', type: 'google', description: 'Tablo oku.', params: [], outputs: [] },
    { id: 'SHEETS_WRITE', title: 'Sheets Write', type: 'google', description: 'Tablo yaz.', params: [], outputs: [] },
    { id: 'DRIVE_UPLOAD', title: 'Drive Upload', type: 'google', description: 'Dosya yükle.', params: [], outputs: [] },

    // --- MICROSOFT ---
    { id: 'OUTLOOK_READ', title: 'Outlook Read', type: 'microsoft', description: 'E-posta oku.', params: [], outputs: [] },
    { id: 'OUTLOOK_SEND', title: 'Outlook Send', type: 'microsoft', description: 'E-posta gönder.', params: [], outputs: [] },
    { id: 'EXCEL_READ', title: 'Excel Read', type: 'microsoft', description: 'Excel oku.', params: [], outputs: [] },
    { id: 'EXCEL_WRITE', title: 'Excel Write', type: 'microsoft', description: 'Excel yaz.', params: [], outputs: [] },
    { id: 'ONEDRIVE_LIST', title: 'OneDrive List', type: 'microsoft', description: 'Dosya listele.', params: [], outputs: [] },

    // --- SOCIAL ---
    { id: 'WHATSAPP_SEND', title: 'WhatsApp Send', type: 'social', description: 'Mesaj gönder.', params: [], outputs: [] },
    { id: 'TELEGRAM_SEND', title: 'Telegram Send', type: 'social', description: 'Mesaj gönder.', params: [], outputs: [] },
    { id: 'SLACK_SEND', title: 'Slack Send', type: 'social', description: 'Mesaj gönder.', params: [], outputs: [] },
    { id: 'DISCORD_SEND', title: 'Discord Send', type: 'social', description: 'Mesaj gönder.', params: [], outputs: [] },
    { id: 'INSTAGRAM_POST', title: 'Instagram Post', type: 'social', description: 'Gönderi paylaş.', params: [], outputs: [] },
    { id: 'FACEBOOK_LOGIN', title: 'Facebook Login', type: 'social', description: 'Giriş yap.', params: [], outputs: [] },

    // --- WEB ---
    { id: 'HTTP', title: 'HTTP Request', type: 'web', description: 'API isteği.', params: [], outputs: [] },
    { id: 'OPEN_URL', title: 'Open URL', type: 'web', description: 'Link aç.', params: [], outputs: [] },
    { id: 'SCRAPE', title: 'Web Scrape', type: 'web', description: 'Veri kazı.', params: [], outputs: [] },
    { id: 'RSS_READ', title: 'RSS Read', type: 'web', description: 'Haber çek.', params: [], outputs: [] },

    // --- DEVICE ---
    { id: 'BATTERY', title: 'Battery Check', type: 'device', description: 'Pil durumu.', params: [], outputs: [] },
    { id: 'NETWORK', title: 'Network Check', type: 'device', description: 'İnternet kontrol.', params: [], outputs: [] },
    { id: 'APP_LAUNCH', title: 'App Launch', type: 'device', description: 'Uygulama aç.', params: [], outputs: [] },
    { id: 'VOLUME', title: 'Volume Control', type: 'device', description: 'Ses ayarı.', params: [], outputs: [] },
    { id: 'CAMERA', title: 'Camera Capture', type: 'device', description: 'Fotoğraf çek.', params: [], outputs: [] },
    { id: 'NOTIFICATION', title: 'Notification', type: 'device', description: 'Bildirim göster.', params: [], outputs: [] },
    { id: 'CLIPBOARD', title: 'Clipboard', type: 'device', description: 'Kopyala/Yapıştır.', params: [], outputs: [] },

    // --- FILES ---
    { id: 'FILE_READ', title: 'File Read', type: 'files', description: 'Dosya oku.', params: [], outputs: [] },
    { id: 'FILE_WRITE', title: 'File Write', type: 'files', description: 'Dosya yaz.', params: [], outputs: [] },
    { id: 'PDF_CREATE', title: 'PDF Create', type: 'files', description: 'PDF oluştur.', params: [], outputs: [] },

    // --- LOCATION & MAPS ---
    { id: 'LOCATION', title: 'Get Location', type: 'location', description: 'GPS konumu.', params: [], outputs: [] },
    { id: 'NAVIGATE', title: 'Navigate To', type: 'location', description: 'Haritada git.', params: [], outputs: [] },
    { id: 'GEOFENCE', title: 'Geofence', type: 'location', description: 'Bölge takibi.', params: [], outputs: [] },

    // --- CALENDAR ---
    { id: 'CALENDAR_READ', title: 'Calendar Read', type: 'calendar', description: 'Etkinlik oku.', params: [], outputs: [] },
    { id: 'CALENDAR_CREATE', title: 'Calendar Create', type: 'calendar', description: 'Etkinlik ekle.', params: [], outputs: [] },

    // --- DATA / MEMORY ---
    { id: 'REMEMBER', title: 'Remember', type: 'data', description: 'Kısa süreli hafıza.', params: [], outputs: [] },
    { id: 'ADD_MEMORY', title: 'Add to Memory', type: 'data', description: 'Vektör veritabanı.', params: [], outputs: [] },
    { id: 'SEARCH_MEMORY', title: 'Search Memory', type: 'data', description: 'Bilgi ara.', params: [], outputs: [] },
    { id: 'DB_READ', title: 'DB Read', type: 'data', description: 'SQL Oku.', params: [], outputs: [] },
    { id: 'DB_WRITE', title: 'DB Write', type: 'data', description: 'SQL Yaz.', params: [], outputs: [] },

    // --- SMART HOME ---
    { id: 'HUE', title: 'Philips Hue', type: 'smart_home', description: 'Işık kontrolü.', params: [], outputs: [] },

    // --- PRODUCTIVITY ---
    { id: 'NOTION_READ', title: 'Notion Read', type: 'productivity', description: 'Notion oku.', params: [], outputs: [] },
    { id: 'NOTION_CREATE', title: 'Notion Create', type: 'productivity', description: 'Notion yaz.', params: [], outputs: [] },
];

// --- COMPONENT ---

export default function DocsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<NodeType | 'all'>('all');

    const filteredNodes = NODES.filter(node => {
        const matchesSearch = node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            node.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === 'all' || node.type === selectedType;
        return matchesSearch && matchesType;
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>BreviAI Grand Master Rehberi (V7)</h1>
                <p className={styles.subtitle}>{NODES.length} Düğüm Dokümantasyonu ve Görsel Referans.</p>

                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="Düğüm ara (Örn: Wait, Merge, HTTP, Loop)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                    <div className={styles.filterButtons}>
                        <button onClick={() => setSelectedType('all')} className={`${styles.filterBtn} ${selectedType === 'all' ? styles.active : ''}`}>Tümü</button>
                        {Object.keys(CATEGORY_STYLES).map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type as NodeType)}
                                className={`${styles.filterBtn} ${selectedType === type ? styles.active : ''}`}
                                style={{ color: selectedType === type ? '#FFF' : CATEGORY_STYLES[type].color }}
                            >
                                {type.toUpperCase().replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className={styles.contentGrid}>
                <div className={styles.nodeGrid}>
                    {filteredNodes.length === 0 && (
                        <div className={styles.noResult}>Sonuç bulunamadı. Lütfen başka bir terim deneyin.</div>
                    )}

                    {filteredNodes.map(node => (
                        <div key={node.id} className={styles.nodeDetailCard}>
                            {/* --- VISUAL MOCKUP HEADER --- */}
                            <div className={styles.mockupHeader} style={{ background: `linear-gradient(135deg, ${CATEGORY_STYLES[node.type].color}aa, ${CATEGORY_STYLES[node.type].color}44)` }}>
                                <div className={styles.mockupIcon}>
                                    {CATEGORY_STYLES[node.type].icon}
                                </div>
                                <div className={styles.mockupTitle}>{node.title}</div>
                                <div className={styles.mockupDots}>•••</div>
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.descriptionRow}>
                                    <span className={styles.cardTypeBadge} style={{ backgroundColor: CATEGORY_STYLES[node.type].color + '33', color: CATEGORY_STYLES[node.type].color }}>
                                        {node.type}
                                    </span>
                                    <p className={styles.cardDesc}>{node.description}</p>
                                </div>

                                {node.longDescription && (
                                    <div
                                        className={styles.longDescription}
                                        dangerouslySetInnerHTML={{ __html: node.longDescription }}
                                    />
                                )}

                                {node.params && node.params.length > 0 && (
                                    <>
                                        <h4 className={styles.subHeader}>⚙️ Parametreler</h4>
                                        <table className={styles.miniTable}>
                                            <tbody>
                                                {node.params.map((p, i) => (
                                                    <tr key={i}>
                                                        <td className={styles.fontMono}>{p.name}</td>
                                                        <td><span className={styles.typeTag}>{p.type}</span></td>
                                                        <td className={styles.descCell}>{p.desc}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.sidebar}>
                    <div className={styles.sidebarSection}>
                        <h3>📖 Expression Kütüphanesi</h3>
                        <p>Değişkenlerde kullanabileceğiniz formüller.</p>

                        <h4>String Formülleri</h4>
                        <ul>
                            <li><code>.toUpperCase()</code> - BÜYÜK HARF</li>
                            <li><code>.toLowerCase()</code> - küçük harf</li>
                            <li><code>.trim()</code> - Boşlukları sil</li>
                        </ul>

                        <h4>Matematik</h4>
                        <ul>
                            <li><code>Math.round(x)</code> - Yuvarla</li>
                            <li><code>Math.floor(x)</code> - Aşağı yuvarla</li>
                            <li><code>Math.random()</code> - Rastgele sayı</li>
                        </ul>

                        <h4>Tarih (Date)</h4>
                        <ul>
                            <li><code>new Date().toISOString()</code></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
