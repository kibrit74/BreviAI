import { useState, useMemo } from 'react';
import '../app/globals.css';
import styles from './docs.module.css';

// --- ICONS & COLORS ---
const CATEGORY_STYLES: Record<string, { color: string; icon: string; label: string }> = {
    trigger: { color: '#10B981', icon: '⚡', label: 'Tetikleyiciler' },
    logic: { color: '#6366F1', icon: 'twisted_right', label: 'Mantık & Kontrol' },
    ai: { color: '#EC4899', icon: 'sparkles', label: 'Yapay Zeka (AI)' },
    google: { color: '#4285F4', icon: 'logo-google', label: 'Google Servisleri' },
    microsoft: { color: '#0078D4', icon: 'logo-windows', label: 'Microsoft Office' },
    social: { color: '#1877F2', icon: 'share-social', label: 'Sosyal Medya' },
    web: { color: '#06B6D4', icon: 'globe', label: 'Web & API' },
    device: { color: '#EF4444', icon: 'hardware-chip', label: 'Cihaz Sensörleri' },
    files: { color: '#F59E0B', icon: 'folder', label: 'Dosya İşlemleri' },
    calendar: { color: '#8B5CF6', icon: 'calendar', label: 'Takvim & Ajanda' },
    productivity: { color: '#374151', icon: 'briefcase', label: 'Üretkenlik' },
    smart_home: { color: '#FCD34D', icon: 'home', label: 'Akıllı Ev' },
    communication: { color: '#F97316', icon: 'chatbubbles', label: 'İletişim' },
    location: { color: '#8B5CF6', icon: 'location', label: 'Konum & Harita' },
    data: { color: '#6366F1', icon: 'server', label: 'Veri & Hafıza' },
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

// --- MASSIVE DATA (Populating crucial ones with n8n-style depth) ---
const NODES: NodeDoc[] = [
    // --- TRIGGERS ---
    {
        id: 'MANUAL',
        title: 'Manual Trigger',
        type: 'trigger',
        summary: 'Akışı manuel olarak başlatır.',
        overviewHTML: `
            <p>Bu düğüm, bir iş akışını test etmek veya kullanıcı etkileşimiyle (buton) başlatmak için kullanılır.</p>
            <p><strong>Uygulamada Kullanımı:</strong> Akış ekranındaki "Play" ikonuna bastığınızda veya mobil uygulamada oluşturduğunuz kısayol butonuna tıkladığınızda çalışır.</p>
        `,
        params: [
            { name: 'Form Fields', type: 'Array', required: false, desc: 'Kullanıcıdan istenecek girişler (Metin, Sayı, Seçim).' },
            { name: 'Button Text', type: 'String', required: false, default: 'Run', desc: 'Buton üzerindeki yazı.' }
        ],
        outputs: [
            { field: 'formData', type: 'Object', desc: 'Kullanıcının girdiği veriler.' }
        ],
        examples: [
            {
                title: 'Kullanıcıdan İsim Alma',
                code: 'Form Fields: [{ key: "name", type: "Text", label: "Adınız?" }]',
                explanation: 'Akış başladığında kullanıcıya "Adınız?" diye sorar ve cevabı `formData.name` içine koyar.'
            }
        ]
    },
    {
        id: 'CRON',
        title: 'Cron / Interval',
        type: 'trigger',
        summary: 'Akışı belirli zamanlarda otomatik çalıştırır.',
        overviewHTML: `
            <p>Sunucu tabanlı zamanlayıcıdır. Telefonunuz kapalı olsa bile çalışır.</p>
            <ul>
                <li><strong>Interval:</strong> Belirli aralıklarla (Her 5 dk).</li>
                <li><strong>Cron:</strong> Belirli zamanda (Her Pazartesi 09:00).</li>
            </ul>
        `,
        params: [
            { name: 'Mode', type: 'Select', required: true, default: 'Interval', desc: 'Interval veya Cron Expression.' },
            { name: 'Value', type: 'String', required: true, desc: 'Örn: "0 9 * * 1" (Pzt 09:00) veya "15m" (15 Dakika).' }
        ],
        outputs: [{ field: 'timestamp', type: 'Number', desc: 'Tetiklenme saati.' }],
        examples: []
    },
    {
        id: 'WEBHOOK',
        title: 'Webhook',
        type: 'trigger',
        summary: 'HTTP isteği ile tetiklenir.',
        overviewHTML: `
            <p>BreviAI akışınızı bir API endpoint'ine dönüştürür. Dış servislerden (Zapier, IFTTT, GitHub) veri almanızı sağlar.</p>
        `,
        params: [
            { name: 'HTTP Method', type: 'Select', required: true, default: 'GET', desc: 'GET, POST, PUT, DELETE.' },
            { name: 'Path', type: 'String', required: false, desc: 'URL yolu (Otomatik atanır).' }
        ],
        outputs: [
            { field: 'body', type: 'Object', desc: 'Gelen veri gövdesi (Payload).' },
            { field: 'query', type: 'Object', desc: 'URL parametreleri.' }
        ],
        examples: [
            {
                title: 'Stripe Ödeme Bildirimi',
                code: 'Method: POST',
                explanation: 'Stripe\'tan gelen ödeme başarılı webhook\'unu karşılar ve işlem yapar.'
            }
        ]
    },

    // --- AI ---
    {
        id: 'AGENT_AI',
        title: 'AI Agent',
        type: 'ai',
        summary: 'LLM kullanarak metin işler (GPT/Gemini).',
        overviewHTML: `
            <p>BreviAI'ın en güçlü düğümüdür. Doğal dilde verilen komutları yerine getirir.</p>
            <p><strong>Kullanım Alanları:</strong></p>
            <ul>
                <li>E-posta özetleme</li>
                <li>Duygu analizi (Sentiment Analysis)</li>
                <li>Veri yapılandırma (Unstructured to JSON)</li>
                <li>Sohbet botu yanıtı üretme</li>
            </ul>
        `,
        params: [
            { name: 'Model', type: 'Select', required: true, default: 'gpt-4o', desc: 'Kullanılacak Yapay Zeka Modeli.' },
            { name: 'Prompt', type: 'Text', required: true, desc: 'AI\'a verilecek talimat. Değişken kullanılabilir: "Şunu özetle: {{$json.text}}"' },
            { name: 'System Message', type: 'Text', required: false, desc: 'AI\'ın rolü (Örn: Sen kıdemli bir avukatsın).' }
        ],
        outputs: [
            { field: 'content', type: 'String', desc: 'AI\'ın cevabı.' },
            { field: 'tokens', type: 'Object', desc: 'Harcanan token miktarı.' }
        ],
        examples: [
            {
                title: 'Makale Özetleme',
                code: 'Prompt: "Aşağıdaki metni 3 maddede özetle: {{$json.articleBody}}"',
                explanation: 'Bir önceki düğümden gelen makaleyi okur ve özet çıkarır.'
            }
        ],
        credentials: 'BreviAI sistem anahtarlarını kullanır. Kendi OpenAI anahtarınızı girmenize gerek yoktur (Limitli kota).'
    },

    // --- LOGIC ---
    {
        id: 'IF',
        title: 'IF Condition',
        type: 'logic',
        summary: 'Veriyi koşullara göre yönlendirir.',
        overviewHTML: 'Gelen veriyi analiz eder ve duruma göre <strong>True</strong> veya <strong>False</strong> çıkışına yönlendirir.',
        params: [
            { name: 'Conditions', type: 'List', required: true, desc: 'Koşul listesi (Value1 Operator Value2).' },
            { name: 'Combine Operation', type: 'Select', required: true, default: 'AND', desc: 'Tüm koşullar mı (AND) yoksa biri mi (OR) sağlanmalı?' }
        ],
        outputs: [],
        examples: []
    },
    {
        id: 'LOOP',
        title: 'Loop',
        type: 'logic',
        summary: 'Bir liste üzerinde işlem yapar.',
        overviewHTML: 'Split-In-Batches mantığıyla çalışır. Bir diziyi alır ve her eleman için akışın devamını çalıştırır.',
        params: [{ name: 'Input Array', type: 'Array', required: true, desc: 'İşlenecek liste.' }],
        outputs: [{ field: 'item', type: 'Any', desc: 'O anki liste elemanı.' }],
        examples: []
    },

    // --- INTEGRATIONS ---
    {
        id: 'SHEETS_READ',
        title: 'Google Sheets Read',
        type: 'google',
        summary: 'E-Tablodan veri okur.',
        overviewHTML: 'Google Sheets üzerindeki verileri okuyarak JSON formatına çevirir. İlk satırı başlık olarak kabul eder.',
        params: [
            { name: 'Spreadsheet ID', type: 'String', required: true, desc: 'URL\'deki ID.' },
            { name: 'Range', type: 'String', required: true, desc: 'Örn: Sheet1!A1:D20' }
        ],
        outputs: [{ field: 'data', type: 'Array', desc: 'Satırların listesi.' }],
        examples: [],
        credentials: 'Google ile giriş yap (OAuth2) gerektirir.'
    },

    // --- MISSING 100+ LIST (Simplified for brevity but representing the full catalog) ---
    ...['Light Sensor', 'Pedometer', 'Barometer', 'Magnetometer'].map(t => ({ id: t.toUpperCase().replace(' ', '_'), title: t, type: 'device' as NodeType, summary: 'Sensör verisi okur.', overviewHTML: '<p>Cihaz sensöründen anlık veri okur.</p>', params: [], outputs: [], examples: [] })),
    ...['Switch', 'Merge', 'Wait', 'Set Values', 'Execute Workflow', 'Code Execution'].map(t => ({ id: t.toUpperCase().replace(' ', '_'), title: t, type: 'logic' as NodeType, summary: 'Akış kontrolü.', overviewHTML: '<p>Akış mantığını yönetir.</p>', params: [], outputs: [], examples: [] })),
    ...['Outlook Read', 'Outlook Send', 'Excel Read', 'Excel Write', 'OneDrive List', 'OneDrive Upload'].map(t => ({ id: t.toUpperCase().replace(' ', '_'), title: t, type: 'microsoft' as NodeType, summary: 'Microsoft entegrasyonu.', overviewHTML: '<p>Office 365 servisi.</p>', params: [], outputs: [], examples: [] })),
    ...['Instagram Post', 'Facebook Login', 'WhatsApp Send', 'Telegram Send', 'Slack Send', 'Discord Send'].map(t => ({ id: t.toUpperCase().replace(' ', '_'), title: t, type: 'social' as NodeType, summary: 'Sosyal medya etkileşimi.', overviewHTML: '<p>Mesaj gönderir veya paylaşım yapar.</p>', params: [], outputs: [], examples: [] })),
    ...['File Read', 'File Write', 'File Pick', 'PDF Create'].map(t => ({ id: t.toUpperCase().replace(' ', '_'), title: t, type: 'files' as NodeType, summary: 'Dosya sistemi.', overviewHTML: '<p>Yerel dosya işlemleri.</p>', params: [], outputs: [], examples: [] })),
    ...['Location Get', 'Navigate To', 'Geofence'].map(t => ({ id: t.toUpperCase().replace(' ', '_'), title: t, type: 'location' as NodeType, summary: 'Konum servisleri.', overviewHTML: '<p>GPS ve Harita.</p>', params: [], outputs: [], examples: [] })),
    ...['App Launch', 'Notification', 'Clipboard', 'Volume Control', 'Show Text', 'Show Image'].map(t => ({ id: t.toUpperCase().replace(' ', '_'), title: t, type: 'device' as NodeType, summary: 'Cihaz aksiyonu.', overviewHTML: '<p>Cihaz üzerinde işlem yapar.</p>', params: [], outputs: [], examples: [] })),
    ...['Remember Info', 'Search Memory', 'Add To Memory', 'Clear Memory', 'Bulk Add Memory'].map(t => ({ id: t.toUpperCase().replace(' ', '_'), title: t, type: 'data' as NodeType, summary: 'Hafıza yönetimi.', overviewHTML: '<p>Vector veritabanı işlemleri.</p>', params: [], outputs: [], examples: [] })),
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
                    <div className={styles.version}>v8.0</div>
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
                                        <th>Default</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedNode.params.map((p, i) => (
                                        <tr key={i}>
                                            <td className={styles.fontMono}>{p.name}</td>
                                            <td><span className={styles.tag}>{p.type}</span></td>
                                            <td>{p.required ? '✅' : 'Optional'}</td>
                                            <td className={styles.fontMonoSmall}>{p.default || '-'}</td>
                                            <td>{p.desc}</td>
                                        </tr>
                                    ))}
                                    {selectedNode.params.length === 0 && (
                                        <tr><td colSpan={5} className={styles.emptyState}>Bu düğüm için özel parametre yoktur.</td></tr>
                                    )}
                                </tbody>
                            </table>

                            <h3 className={styles.sectionHeader}>Outputs</h3>
                            <ul className={styles.outputList}>
                                {selectedNode.outputs.map((o, i) => (
                                    <li key={i}>
                                        <code className={styles.outputField}>{o.field}</code>
                                        <span className={styles.outputType}>({o.type})</span>
                                        : {o.desc}
                                    </li>
                                ))}
                                {selectedNode.outputs.length === 0 && <li>Özel çıktı verisi yoktur (Pass-through).</li>}
                            </ul>
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
