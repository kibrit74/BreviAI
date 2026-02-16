import { useState } from 'react';
import '../app/globals.css';
import styles from './docs.module.css';

// --- DATA STRUCTURES ---

type NodeType = 'trigger' | 'action' | 'logic' | 'ai' | 'integration';

interface NodeDoc {
    id: string;
    title: string;
    type: NodeType;
    description: string;
    params: { name: string; type: string; required: boolean; desc: string }[];
    outputs: { field: string; type: string; desc: string }[];
    jsonExample: string;
    tips: string[];
}

const NODES: NodeDoc[] = [
    // --- TRIGGERS ---
    {
        id: 'manual-trigger',
        title: 'Manual Trigger (Elle Başlat)',
        type: 'trigger',
        description: 'İş akışını kullanıcının butona basmasıyla başlatır. Form verileri alabilir.',
        params: [
            { name: 'Form Fields', type: 'Array', required: false, desc: 'Kullanıcıdan istenecek giriş alanları (Metin, Sayı, Seçim).' },
            { name: 'Button Label', type: 'String', required: false, desc: 'Başlat butonunun üzerindeki yazı.' }
        ],
        outputs: [
            { field: 'formData', type: 'Object', desc: 'Kullanıcının girdiği değerler.' },
            { field: 'userId', type: 'String', desc: 'Akışı başlatan kullanıcının ID\'si.' }
        ],
        jsonExample: '{\n  "formData": {\n    "konu": "Şikayet",\n    "email": "test@test.com"\n  }\n}',
        tips: ['Form verilerini sonraki adımlarda `{{$json.formData.konu}}` şeklinde kullanabilirsiniz.']
    },
    {
        id: 'cron-trigger',
        title: 'Cron Trigger (Zamanlayıcı)',
        type: 'trigger',
        description: 'Akışı belirli zamanlarda otomatik tetikler.',
        params: [
            { name: 'Mode', type: 'Select', required: true, desc: '"Interval" (Aralık) veya "Cron" (Takvim).' },
            { name: 'Value', type: 'String', required: true, desc: 'Örn: "5m" veya "0 9 * * 1".' }
        ],
        outputs: [
            { field: 'timestamp', type: 'Number', desc: 'Çalışma zamanı (Unix Epoch).' },
            { field: 'readableTime', type: 'String', desc: 'Okunabilir tarih saati.' }
        ],
        jsonExample: '{\n  "timestamp": 1715000000,\n  "readableTime": "2024-05-06 09:00:00"\n}',
        tips: ['Cron formatı için https://crontab.guru sitesini kullanabilirsiniz.']
    },
    {
        id: 'webhook-trigger',
        title: 'Webhook Trigger',
        type: 'trigger',
        description: 'Dış dünyadan HTTP isteği ile tetiklenir.',
        params: [
            { name: 'Method', type: 'Select', required: true, desc: 'GET veya POST.' },
            { name: 'Path', type: 'String', required: false, desc: 'Otomatik üretilen UUID yolu.' }
        ],
        outputs: [
            { field: 'body', type: 'Object', desc: 'Gelen isteğin gövdesi (JSON).' },
            { field: 'query', type: 'Object', desc: 'URL parametreleri (?id=123).' },
            { field: 'headers', type: 'Object', desc: 'HTTP başlıkları.' }
        ],
        jsonExample: '{\n  "body": { "event": "order_created", "id": 99 },\n  "query": { "source": "web" }\n}',
        tips: ['POST isteklerinde "Content-Type: application/json" başlığı olduğundan emin olun.']
    },
    {
        id: 'notification-trigger',
        title: 'Notification Trigger (Bildirim)',
        type: 'trigger',
        description: 'Telefona gelen bildirimleri yakalar.',
        params: [
            { name: 'App Filter', type: 'String', required: false, desc: 'Sadece bu paketten gelenleri al (örn: com.whatsapp).' },
            { name: 'Title/Text Filter', type: 'Regex', required: false, desc: 'Başlık veya içerikte geçen kelimeye göre filtrele.' }
        ],
        outputs: [
            { field: 'packageName', type: 'String', desc: 'Bildirimi gönderen uygulama.' },
            { field: 'title', type: 'String', desc: 'Bildirim başlığı.' },
            { field: 'text', type: 'String', desc: 'Bildirim içeriği.' }
        ],
        jsonExample: '{\n  "packageName": "com.whatsapp",\n  "title": "Ahmet",\n  "text": "Yarın geliyor musun?"\n}',
        tips: ['SMS yakalamak için paket adı: `com.google.android.apps.messaging` (Telefon modeline göre değişebilir).']
    },

    // --- ACTIONS ---
    {
        id: 'http-request',
        title: 'HTTP Request (İnternet İsteği)',
        type: 'action',
        description: 'Herhangi bir API\'ye veri gönderir veya veri çeker.',
        params: [
            { name: 'Method', type: 'Select', required: true, desc: 'GET, POST, PUT, DELETE, PATCH.' },
            { name: 'URL', type: 'String', required: true, desc: 'Hedef adres.' },
            { name: 'Headers', type: 'JSON', required: false, desc: 'Yetkilendirme ve format bilgileri.' },
            { name: 'Body', type: 'JSON', required: false, desc: 'Gönderilecek veri (Sadece POST/PUT).' }
        ],
        outputs: [
            { field: 'data', type: 'Object', desc: 'Sunucudan gelen yanıt.' },
            { field: 'status', type: 'Number', desc: 'HTTP durum kodu (200, 404 vb.).' }
        ],
        jsonExample: '{\n  "data": { "success": true, "id": 55 },\n  "status": 200\n}',
        tips: ['API anahtarlarını şifrelemek için BreviAI Credentials (Yakında) özelliğini bekleyin. Şimdilik Header içine yazın.']
    },
    {
        id: 'google-sheets',
        title: 'Google Sheets (E-Tablo)',
        type: 'action',
        description: 'Google E-Tablolar üzerinde okuma/yazma yapar.',
        params: [
            { name: 'Operation', type: 'Select', required: true, desc: 'Read (Oku), Append (Ekle), Update (Güncelle), Clear (Temizle).' },
            { name: 'Spreadsheet ID', type: 'String', required: true, desc: 'Tarayıcı adres çubuğundaki uzun ID.' },
            { name: 'Range', type: 'String', required: true, desc: 'Hücre aralığı (Sayfa1!A1:C10).' },
            { name: 'Values', type: 'Array', required: false, desc: 'Yazılacak veriler (Append/Update için).' }
        ],
        outputs: [
            { field: 'data', type: 'Array', desc: 'Okunan satırlar.' },
            { field: 'updatedCells', type: 'Number', desc: 'Güncellenen hücre sayısı.' }
        ],
        jsonExample: '{\n  "data": [\n    ["Ad", "Soyad", "No"],\n    ["Ali", "Yılmaz", "123"]\n  ]\n}',
        tips: ['Servis hesabı (Service Account) e-posta adresine, tablonuzda "Düzenleyici" yetkisi vermeyi unutmayın.']
    },
    {
        id: 'code-execution',
        title: 'Code Execution (JS Kodu)',
        type: 'action',
        description: 'Verileri işlemek için Saf JavaScript (ES6) çalıştırır.',
        params: [
            { name: 'Code', type: 'Editor', required: true, desc: 'Çalıştırılacak kod. `return` ile değer döndürmelidir.' }
        ],
        outputs: [
            { field: '*', type: 'Any', desc: 'Kodun return ettiği her şey.' }
        ],
        jsonExample: '// Kod:\nreturn { toplam: input.fiyat * 1.18 };\n\n// Çıktı:\n{\n  "toplam": 118\n}',
        tips: ['`input` değişkeni ile önceki düğümün verisine ulaşabilirsiniz. `console.log` desteklenmez.']
    },

    // --- LOGIC ---
    {
        id: 'if-node',
        title: 'IF (Koşul)',
        type: 'logic',
        description: 'Mantıksal kontrol yapar.',
        params: [
            { name: 'Value 1', type: 'String', required: true, desc: 'Karşılaştırılacak ilk değer.' },
            { name: 'Operator', type: 'Select', required: true, desc: 'Equal, Not Equal, Contains, Regex, >, <.' },
            { name: 'Value 2', type: 'String', required: true, desc: 'Karşılaştırılacak ikinci değer.' }
        ],
        outputs: [
            { field: '-', type: '-', desc: 'Veri değişmez, sadece akış yönü değişir (True/False).' }
        ],
        jsonExample: '-',
        tips: ['Birden fazla koşul ekleyebilirsiniz (AND/OR mantığı).']
    },
    {
        id: 'switch-node',
        title: 'Switch (Çoklu Yol)',
        type: 'logic',
        description: 'Veriyi kurallara göre N farklı yola ayırır.',
        params: [
            { name: 'Rules', type: 'List', required: true, desc: 'Her kural için bir çıktı portu (0, 1, 2...) oluşur.' }
        ],
        outputs: [
            { field: '-', type: '-', desc: 'Veri değişmez.' }
        ],
        jsonExample: '-',
        tips: ['Varsayılan (Fallback) yol tanımlamak için her zaman koşulsuz bir son çıkış ekleyin.']
    },
    {
        id: 'loop-node',
        title: 'Loop (Döngü)',
        type: 'logic',
        description: 'Dizi (Array) üzerinde döner.',
        params: [
            { name: 'Input Array', type: 'Array', required: true, desc: 'Dönülecek liste.' }
        ],
        outputs: [
            { field: '...item', type: 'Any', desc: 'Listenin o anki elemanı.' },
            { field: 'loop.index', type: 'Number', desc: 'Döngü sırası (0, 1, 2...).' }
        ],
        jsonExample: '{\n  "ad": "Ürün 1",\n  "fiyat": 100,\n  "loop": { "index": 0, "total": 5 }\n}',
        tips: ['Döngü içindeki işlemler bittiğinde, akışı tekrar Loop düğümüne bağlamanıza gerek yoktur. BreviAI bunu otomatik yönetir.']
    },

    // --- AI ---
    {
        id: 'ai-agent',
        title: 'AI Agent (Yapay Zeka)',
        type: 'ai',
        description: 'LLM kullanarak metin üretir.',
        params: [
            { name: 'Model', type: 'Select', required: true, desc: 'GPT-4o, GPT-3.5-Turbo, Gemini 1.5 Pro.' },
            { name: 'System Prompt', type: 'Text', required: false, desc: 'AI\'nın kişiliği.' },
            { name: 'User Prompt', type: 'Text', required: true, desc: 'Kullanıcının isteği.' }
        ],
        outputs: [
            { field: 'content', type: 'String', desc: 'AI yanıtı.' },
            { field: 'tokens', type: 'Object', desc: 'Harcanan token bilgisi.' }
        ],
        jsonExample: '{\n  "content": "Merhaba! Size nasıl yardımcı olabilirim?",\n  "tokens": { "total": 50 }\n}',
        tips: ['Prompt içinde `{{$json.input}}` kullanarak dinamik veri besleyebilirsiniz.']
    },
    {
        id: 'image-gen',
        title: 'Image Generator (Resim Üretme)',
        type: 'ai',
        description: 'Prompt\'tan görsel oluşturur.',
        params: [
            { name: 'Provider', type: 'Select', required: true, desc: 'DALL-E 3 veya Stable Diffusion (Nanobana).' },
            { name: 'Prompt', type: 'Text', required: true, desc: 'Görsel tarifi.' },
            { name: 'Size', type: 'Select', required: false, desc: '1024x1024 varsayılan.' }
        ],
        outputs: [
            { field: 'url', type: 'String', desc: 'Üretilen resmin URL adresi.' }
        ],
        jsonExample: '{\n  "url": "https://oaidalleapiprodscus.blob.core.windows.net/..."\n}',
        tips: ['URL geçicidir (genelde 1 saat). Kalıcı olması için resmi indirin veya bir yere (Drive, Telegram) gönderin.']
    },

    // --- APPS ---
    {
        id: 'app-launch',
        title: 'App Launch (Uygulama Aç)',
        type: 'integration',
        description: 'Android uygulamasını ön planda başlatır.',
        params: [
            { name: 'Package Name', type: 'String', required: true, desc: 'Uygulamanın ID\'si.' }
        ],
        outputs: [
            { field: 'started', type: 'Boolean', desc: 'Başlatma başarılı mı?' }
        ],
        jsonExample: '{\n  "started": true\n}',
        tips: ['WhatsApp: com.whatsapp', 'Instagram: com.instagram.android', 'YouTube: com.google.android.youtube', 'Spotify: com.spotify.music']
    }
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
                <h1 className={styles.title}>BreviAI Moleküler Referans (V4)</h1>
                <p className={styles.subtitle}>En derinlemesine, en ayrıntılı teknik rehber.</p>

                <div className={styles.searchBox}>
                    <input
                        type="text"
                        placeholder="Düğüm ara (Örn: HTTP, Cron, Loop)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                    <div className={styles.filterButtons}>
                        <button onClick={() => setSelectedType('all')} className={`${styles.filterBtn} ${selectedType === 'all' ? styles.active : ''}`}>Tümü</button>
                        <button onClick={() => setSelectedType('trigger')} className={`${styles.filterBtn} ${selectedType === 'trigger' ? styles.active : ''}`}>Triggers</button>
                        <button onClick={() => setSelectedType('action')} className={`${styles.filterBtn} ${selectedType === 'action' ? styles.active : ''}`}>Actions</button>
                        <button onClick={() => setSelectedType('logic')} className={`${styles.filterBtn} ${selectedType === 'logic' ? styles.active : ''}`}>Logic</button>
                        <button onClick={() => setSelectedType('ai')} className={`${styles.filterBtn} ${selectedType === 'ai' ? styles.active : ''}`}>AI</button>
                    </div>
                </div>
            </header>

            <div className={styles.nodeGrid}>
                {filteredNodes.length === 0 && (
                    <div className={styles.noResult}>Sonuç bulunamadı. Lütfen başka bir terim deneyin.</div>
                )}

                {filteredNodes.map(node => (
                    <div key={node.id} className={styles.nodeDetailCard}>
                        <div className={`${styles.cardHeader} ${styles[node.type]}`}>
                            <span className={styles.cardTypeBadge}>{node.type.toUpperCase()}</span>
                            <h3>{node.title}</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <p className={styles.cardDesc}>{node.description}</p>

                            <h4 className={styles.subHeader}>⚙️ Parametreler</h4>
                            <table className={styles.miniTable}>
                                <thead>
                                    <tr><th>İsim</th><th>Tip</th><th>Zorunlu</th><th>Açıklama</th></tr>
                                </thead>
                                <tbody>
                                    {node.params.map((p, i) => (
                                        <tr key={i}>
                                            <td className={styles.fontMono}>{p.name}</td>
                                            <td><span className={styles.typeTag}>{p.type}</span></td>
                                            <td>{p.required ? '✅' : '❌'}</td>
                                            <td>{p.desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <h4 className={styles.subHeader}>📤 Çıktı Verisi (Output)</h4>
                            <div className={styles.jsonPreview}>
                                <pre>{node.jsonExample}</pre>
                            </div>
                            <ul className={styles.outputList}>
                                {node.outputs.map((o, i) => (
                                    <li key={i}><code>{o.field}</code>: {o.desc} <span className={styles.typeTagSmall}>{o.type}</span></li>
                                ))}
                            </ul>

                            < div className={styles.tipsBox}>
                                <strong>💡 Pro Tips:</strong>
                                <ul>
                                    {node.tips.map((t, i) => <li key={i}>{t}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
