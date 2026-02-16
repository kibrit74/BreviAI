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

// --- V11: GRANDMASTER CONTENT (Detailed Guides, Tips, Troubleshooting) ---
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

    // ═════════════════════════════════════════
    // LOGIC & CONTROL (Beyin)
    // ═════════════════════════════════════════
    {
        id: 'IF_ELSE', title: 'IF / Else', type: 'control', summary: 'Karar verme mekanizması.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🤔 Karar Ağacı</h3>
                <p>Akışın gidişatını bir koşula göre değiştirir. Eğer koşul <strong>Doğru (True)</strong> ise üst yoldan, <strong>Yanlış (False)</strong> ise alt yoldan devam eder.</p>
            </div>
            <div class="guide-section">
                <h3>Eşittir, Büyüktür, Küçüktür...</h3>
                <p>Koşullarınızı yazarken JavaScript benzeri ifadeler veya basit karşılaştırmalar kullanabilirsiniz.</p>
                <ul>
                    <li><code>==</code> : Eşittir</li>
                    <li><code>!=</code> : Eşit Değildir</li>
                    <li><code>></code> : Büyüktür</li>
                    <li><code>includes()</code> : İçerir</li>
                </ul>
            </div>
        `,
        params: [{ name: 'Condition', type: 'Expression', required: true, desc: 'Mantıksal ifade. Örn: {{fiyat}} > 100' }],
        outputs: [],
        examples: [
            { title: 'Gelen Mail Spam mi?', code: '{{$json.subject}}.includes("Kazandınız")', explanation: 'Eğer e-posta başlığı "Kazandınız" içeriyorsa True (Spam) yoluna git.' },
            { title: 'Bakiye Yeterli mi?', code: '{{wallet.balance}} >= {{product.price}}', explanation: 'Bakiye ürün fiyatından büyük veya eşitse satın al.' }
        ]
    },
    {
        id: 'AGENT_AI', title: 'AI Agent (LLM)', type: 'ai', summary: 'Akıllı metin işleme asistanı.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🧠 Yapay Zeka Nasıl Kullanılır?</h3>
                <p>Bu düğüm, GPT-4 veya Gemini gibi büyük dil modellerini kullanarak metinleri anlar, özetler veya yeni içerik üretir.</p>
            </div>
            <div class="guide-section">
                <h3>✨ Prompt Mühendisliği (İpucu)</h3>
                <p>AI'dan iyi sonuç almak için talimatınızı (Prompt) net verin.</p>
                <ul>
                    <li>❌ Kötü: "Bunu düzelt."</li>
                    <li>✅ İyi: "Aşağıdaki metindeki imla hatalarını düzelt ve resmi bir dille yeniden yaz: {{text}}"</li>
                </ul>
            </div>
        `,
        params: [
            { name: 'Model', type: 'Select', required: true, desc: 'Hız için Gemini Flash, Kalite için GPT-4o seçin.' },
            { name: 'Prompt', type: 'Text', required: true, desc: 'Yapay zekaya vereceğiniz görev.' }
        ],
        outputs: [{ field: 'content', type: 'String', desc: 'AI\'ın cevabı.' }],
        examples: [
            { title: 'Toplantı Özeti Çıkarma', code: 'Prompt: "Aşağıdaki toplantı dökümünü oku ve alınan 3 ana kararı maddeler halinde yaz:\n{{speech.text}}"', explanation: 'Ses kaydından metne dönüştürülen dökümü analiz eder.' },
            { title: 'Duygu Analizi', code: 'Prompt: "Bu müşteri mesajı olumlu mu, olumsuz mu? Sadece tek kelime cevap ver:\n{{sms.message}}"', explanation: 'Gelen mesajın tonunu (Positive/Negative) analiz eder.' }
        ]
    },
    {
        id: 'HTTP_REQUEST', title: 'HTTP Request', type: 'web', summary: 'İnternet dünyasına açılan kapı.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🌍 API Bağlantısı</h3>
                <p>Bu düğüm ile BreviAI'yi dünyadaki neredeyse tüm servislere (Hava durumu, Döviz, Haberler, Spotify, Notion...) bağlayabilirsiniz.</p>
            </div>
            <div class="guide-section">
                <h3>🛠️ Ayarlar Rehberi</h3>
                <ul>
                    <li><strong>Method:</strong> Veri çekecekseniz <code>GET</code>, veri gönderecekseniz <code>POST</code> kullanın.</li>
                    <li><strong>Headers:</strong> Genellikle API Anahtarı (Authorization) buraya yazılır.</li>
                    <li><strong>Body:</strong> POST işlemlerinde gönderilecek veriyi JSON formatında buraya yazarsınız.</li>
                </ul>
            </div>
        `,
        params: [
            { name: 'URL', type: 'String', required: true, desc: 'İstek yapılacak adres.' },
            { name: 'Headers', type: 'JSON', required: false, desc: 'Örn: {"Authorization": "Bearer KEY"}' }
        ],
        outputs: [{ field: 'data', type: 'Object', desc: 'Sunucudan dönen yanıt.' }, { field: 'status', type: 'Number', desc: 'HTTP kodu (200, 404 vb).' }],
        examples: [
            { title: 'Bitcoin Fiyatı Çekme', code: 'GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', explanation: 'Bitcoin\'in güncel dolar kurunu çeker.' },
            { title: 'Slack Mesajı Atma', code: 'POST https://hooks.slack.com/services/...\nBody: { "text": "Mehaba Dünya!" }', explanation: 'Webhook URL\'ine JSON verisi gönderir.' }
        ]
    },

    // ═════════════════════════════════════════
    // DEVICE & TOOLS
    // ═════════════════════════════════════════
    {
        id: 'NOTIFICATION', title: 'Show Notification', type: 'device', summary: 'Kullanıcıya bildirim gösterir.',
        overviewHTML: `
            <div class="guide-section">
                <h3>📱 Yerel Bildirimler</h3>
                <p>Akış tamamlandığında veya bir hata olduğunda size haber vermek için telefon bildirimlerini kullanır.</p>
            </div>
        `,
        params: [{ name: 'Message', type: 'String', required: true, desc: 'Bildirim metni.' }],
        outputs: [],
        examples: [{ title: 'İşlem Başarılı', code: 'Message: "Rapor oluşturuldu ve mail atıldı! ✅"', explanation: 'Kullanıcıya işlemin bittiğini haber verir.' }]
    },
    {
        id: 'APP_LAUNCH', title: 'Launch App', type: 'device', summary: 'Başka bir uygulamayı açar.',
        overviewHTML: `
            <div class="guide-section">
                <h3>🚀 Uygulama Başlatma</h3>
                <p>Akışın sonunda kullanıcıyı başka bir uygulamaya yönlendirmek için kullanılır.</p>
            </div>
            <div class="guide-section">
                <h3>Paket Adı (Package Name) Nedir?</h3>
                <p>Her uygulamanın benzersiz bir kimliği vardır. Play Store URL'sinde <code>id=</code> kısmından bulabilirsiniz.</p>
                <ul>
                    <li>Instagram: <code>com.instagram.android</code></li>
                    <li>Twitter: <code>com.twitter.android</code></li>
                    <li>Spotify: <code>com.spotify.music</code></li>
                </ul>
            </div>
        `,
        params: [{ name: 'Package Name', type: 'String', required: true, desc: 'Uygulamanın teknik adı.' }],
        outputs: [],
        examples: [{ title: 'Spotify Aç', code: 'Package: com.spotify.music', explanation: 'Spor modu akışının sonunda müziği açar.' }]
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
                    <div className={styles.logo}>BreviAI Guide</div>
                    <div className={styles.version}>v11.0</div>
                </div>
                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="Düğüm ara..."
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
                            {tab === 'overview' ? 'Nasıl Kullanılır?' :
                                tab === 'params' ? 'Parametreler' :
                                    tab === 'examples' ? 'Örnek Senaryolar' : 'Kimlik & Yetki'}
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
