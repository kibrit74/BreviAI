import { useState } from 'react';
import '../app/globals.css';
import styles from './docs.module.css';

// --- DATA STRUCTURES ---

type NodeType = 'trigger' | 'action' | 'logic' | 'ai' | 'integration';

interface NodeDoc {
    id: string;
    title: string;
    type: NodeType;
    description: string; // Kısa özet
    longDescription: string; // Detaylı HTML açıklama
    params: { name: string; type: string; required: boolean; desc: string }[];
    outputs: { field: string; type: string; desc: string }[];
    jsonExample: string;
    tips: string[];
    troubleshooting: { error: string; solution: string }[];
}

const NODES: NodeDoc[] = [
    // --- TRIGGERS ---
    {
        id: 'manual-trigger',
        title: 'Manual Trigger (Elle Başlat)',
        type: 'trigger',
        description: 'İş akışını kullanıcının butona basmasıyla başlatır.',
        longDescription: `
            <p><strong>Manual Trigger</strong>, otomasyon dünyasının "Başlat" düğmesidir. Kullanıcı, BreviAI mobil uygulamasında veya web arayüzünde oluşturduğunuz akışın üzerindeki "Çalıştır" butonuna bastığında bu düğme aktif olur.</p>
            <p>Bu düğme sadece akışı başlatmakla kalmaz, aynı zamanda kullanıcıdan <strong>veri toplamanızı</strong> da sağlar. Örneğin, bir "Şikayet Yönetimi" akışı yapıyorsanız, kullanıcıdan "Konu" ve "Mesaj" bilgilerini girmesini isteyebilirsiniz. Bu veriler, akışın sonraki adımlarında kullanılmak üzere JSON formatında iletilir.</p>
            <p><strong>Kullanım Alanları:</strong></p>
            <ul>
                <li>Form verisi toplama (Anket, Başvuru).</li>
                <li>Test amaçlı akış çalıştırma.</li>
                <li>Yarı-otomatik işlemler (İnsan başlatır, robot tamamlar).</li>
            </ul>
        `,
        params: [
            { name: 'Form Fields', type: 'Array', required: false, desc: 'Kullanıcı arayüzünde gösterilecek form elemanları (Input, Select, Switch).' },
            { name: 'Button Label', type: 'String', required: false, desc: 'Buton üzerinde yazacak metin (Örn: "Raporu Gönder").' }
        ],
        outputs: [
            { field: 'formData', type: 'Object', desc: 'Kullanıcının form alanlarına girdiği veriler.' },
            { field: 'userId', type: 'String', desc: 'Akışı tetikleyen kullanıcının benzersiz kimliği.' },
            { field: 'timestamp', type: 'Number', desc: 'Tetiklenme zamanı.' }
        ],
        jsonExample: '{\n  "formData": {\n    "urun_adi": "Laptop",\n    "adet": 2\n  },\n  "userId": "user_12345",\n  "timestamp": 1715000000\n}',
        tips: [
            'Form alanlarına verdiğiniz "Key" isimleri, çıktı verisindeki JSON anahtarları olur.',
            '`Button Label` boş bırakılırsa varsayılan olarak "Run Workflow" yazar.'
        ],
        troubleshooting: [
            { error: "Form verileri boş geliyor", solution: "Form Fields tanımındaki 'Key' değerlerinin benzersiz olduğundan emin olun." }
        ]
    },
    {
        id: 'cron-trigger',
        title: 'Cron Trigger (Zamanlayıcı)',
        type: 'trigger',
        description: 'Akışı zamana bağlı olarak otomatik çalıştırır.',
        longDescription: `
            <p><strong>Cron Trigger</strong>, akışlarınızın belirli bir takvime veya zaman aralığına göre, insan müdahalesi olmadan çalışmasını sağlar. Sunucu tabanlıdır, yani telefonunuz kapalı olsa bile çalışmaya devam eder.</p>
            <p>İki farklı modda çalışabilir:</p>
            <ol>
                <li><strong>Interval (Aralık):</strong> "Her 5 dakikada bir çalış", "Her 1 saatte bir çalış" gibi basit döngüler için idealdir.</li>
                <li><strong>Cron Expression:</strong> Çok daha hassas zamanlamalar içindir. "Hafta içi her gün sabah 09:00'da çalış" veya "Ayın 1'inde çalış" gibi kurallar tanımlayabilirsiniz.</li>
            </ol>
            <p><strong>Önemli:</strong> Cron tetikleyiciler, sunucu saatini (UTC) baz alır. Yerel saatinize göre ayarlama yaparken saat farkını (Türkiye için UTC+3) göz önünde bulundurun.</p>
        `,
        params: [
            { name: 'Mode', type: 'Select', required: true, desc: 'Çalışma modu: "Interval" veya "Cron".' },
            { name: 'Value', type: 'String', required: true, desc: 'Ayar değeri. Interval için "5m", "1h". Cron için "* * * * *".' }
        ],
        outputs: [
            { field: 'timestamp', type: 'Number', desc: 'Tetiklenme zamanı (Unix).' },
            { field: 'readableTime', type: 'String', desc: 'İnsan tarafından okunabilir tarih formatı.' }
        ],
        jsonExample: '{\n  "timestamp": 1715000000,\n  "readableTime": "2024-05-06T06:00:00.000Z"\n}',
        tips: [
            'Cron ifadelerini oluşturmak için <a href="https://crontab.guru" target="_blank">crontab.guru</a> sitesini kullanabilirsiniz.',
            'Aşırı sık (örn: her saniye) çalışan akışlar sistem tarafından limitlenebilir.'
        ],
        troubleshooting: [
            { error: "Akış zamanında çalışmadı", solution: "Timezone (Saat dilimi) farkını kontrol edin. UTC saati kullanılıyor olabilir." }
        ]
    },
    {
        id: 'webhook-trigger',
        title: 'Webhook Trigger',
        type: 'trigger',
        description: 'Dış sistemlerden gelen HTTP isteklerini karşılar.',
        longDescription: `
            <p><strong>Webhook Trigger</strong>, BreviAI akışınızı bir API sunucusuna dönüştürür. Bu düğümü eklediğinizde, size özel benzersiz bir URL (Endpoint) oluşturulur.</p>
            <p>Bu URL'ye; Zapier, IFTTT, GitHub, Stripe, Typeform veya kendi yazdığınız bir koddan HTTP isteği (GET/POST) gönderildiğinde akışınız anında başlar. Gönderilen veriler (Body, Query, Headers) akış içine JSON olarak dahil edilir.</p>
            <p><strong>Güvenlik:</strong> Webhook URL'nizi gizli tutmalısınız. URL'yi bilen herkes akışınızı tetikleyebilir. Gerekirse akışın başında bir "IF" düğümü ile gelen verideki bir şifreyi (token) kontrol edebilirsiniz.</p>
        `,
        params: [
            { name: 'Method', type: 'Select', required: true, desc: 'Kabul edilecek HTTP yöntemi: GET veya POST.' },
            { name: 'Path', type: 'String', required: false, desc: 'URL\'in son kısmı (UUID). Sistem tarafından otomatik atanır.' }
        ],
        outputs: [
            { field: 'body', type: 'Object', desc: 'İsteğin gövdesi (Payload). Genelde POST isteklerinde doludur.' },
            { field: 'query', type: 'Object', desc: 'URL parametreleri (Örn: ?id=5&user=ali).' },
            { field: 'headers', type: 'Object', desc: 'İsteğin başlık bilgileri (User-Agent, Content-Type vb.).' }
        ],
        jsonExample: '{\n  "body": {\n    "event": "payment_success",\n    "amount": 500\n  },\n  "query": {\n    "source": "stripe"\n  },\n  "headers": {\n    "content-type": "application/json"\n  }\n}',
        tips: [
            'Test URL\'i ile denemeler yapın, Prod URL\'i canlı sistemlerde kullanın.',
            'POST isteklerinde `Content-Type: application/json` başlığının gönderildiğinden emin olun.'
        ],
        troubleshooting: [
            { error: "Veri gelmiyor (Empty Body)", solution: "Gönderen tarafın JSON formatında veri yolladığından ve Content-Type header'ının doğru olduğundan emin olun." }
        ]
    },

    // --- ACTIONS ---
    {
        id: 'http-request',
        title: 'HTTP Request (İnternet İsteği)',
        type: 'action',
        description: 'Herhangi bir REST API ile iletişim kurar.',
        longDescription: `
            <p><strong>HTTP Request</strong> düğümü, internetin kapılarını açan anahtardır. Bu düğüm sayesinde dünyadaki neredeyse tüm web servisleri (API) ile konuşabilirsiniz.</p>
            <p>Desteklenen işlemler:</p>
            <ul>
                <li><strong>GET:</strong> Veri çekmek için (Hava durumu, Döviz kuru, Haberler).</li>
                <li><strong>POST:</strong> Veri göndermek için (Veritabanına kayıt, Mesaj atma).</li>
                <li><strong>PUT/PATCH:</strong> Veri güncellemek için.</li>
                <li><strong>DELETE:</strong> Veri silmek için.</li>
            </ul>
            <p>Gelişmiş ayarlar bölümünde Timeout süresini, SSL sertifika kontrollerini ve Proxy ayarlarını yapılandırabilirsiniz.</p>
        `,
        params: [
            { name: 'Method', type: 'Select', required: true, desc: 'İstek türü (GET, POST vb.).' },
            { name: 'URL', type: 'String', required: true, desc: 'İstek yapılacak tam adres (https://...).' },
            { name: 'Headers', type: 'JSON', required: false, desc: 'Yetkilendirme (Authorization) ve meta bilgiler.' },
            { name: 'Body', type: 'JSON', required: false, desc: 'Karşı tarafa gönderilecek veri paketi.' }
        ],
        outputs: [
            { field: 'data', type: 'Object', desc: 'API\'den dönen yanıt (Response Body).' },
            { field: 'status', type: 'Number', desc: 'HTTP Durum Kodu (200=Başarılı, 404=Bulunamadı, 500=Hata).' },
            { field: 'headers', type: 'Object', desc: 'Yanıt başlıkları.' }
        ],
        jsonExample: '{\n  "data": {\n    "result": "success",\n    "items": [1, 2, 3]\n  },\n  "status": 200\n}',
        tips: [
            'API Anahtarlarınızı (API Key) doğrudan URL\'e yazmak yerine Header kısmında `Authorization: Bearer <TOKEN>` formatında göndermek daha güvenlidir.',
            'Yanıt JSON değilse, sistem otomatik olarak metin (String) formatına çevirir.'
        ],
        troubleshooting: [
            { error: "ECONNREFUSED", solution: "Hedef sunucuya erişilemiyor veya port kapalı." },
            { error: "401 Unauthorized", solution: "API anahtarınız eksik veya hatalı." }
        ]
    },
    {
        id: 'google-sheets',
        title: 'Google Sheets (E-Tablo)',
        type: 'action',
        description: 'Google E-Tabloları veritabanı gibi kullanır.',
        longDescription: `
            <p>Google Sheets düğümü, verilerinizi saklamak, listelemek ve raporlamak için mükemmel bir araçtır. BreviAI, Google Sheets API v4 altyapısını kullanır.</p>
            <p><strong>Operasyonlar:</strong></p>
            <ul>
                <li><strong>Read (Oku):</strong> Belirtilen aralıktaki verileri çeker. İlk satırı başlık (Header) olarak algılar ve JSON dizisine çevirir.</li>
                <li><strong>Append (Ekle):</strong> Tablonun en altındaki ilk boş satıra yeni veri yazar. Veri kaybını önler.</li>
                <li><strong>Update (Güncelle):</strong> Spesifik bir hücreyi veya aralığı değiştirir.</li>
                <li><strong>Clear (Temizle):</strong> İçeriği siler.</li>
            </ul>
        `,
        params: [
            { name: 'Operation', type: 'Select', required: true, desc: 'Yapılacak işlem.' },
            { name: 'Spreadsheet ID', type: 'String', required: true, desc: 'Tablo URL\'indeki /d/ ile /edit arasındaki kod.' },
            { name: 'Range', type: 'String', required: true, desc: 'Örn: "Sayfa1!A1:C" veya sadece "Sayfa1".' },
            { name: 'Values', type: 'Array', required: false, desc: 'Yazılacak veriler. Dizi içinde dizi formatında olmalıdır: [["Ali", 25], ["Veli", 30]].' }
        ],
        outputs: [
            { field: 'data', type: 'Array', desc: 'Okunan satırlar (Read işlemi için).' },
            { field: 'updates', type: 'Object', desc: 'Yapılan değişikliklerin özeti.' }
        ],
        jsonExample: '{\n  "data": [\n    { "Ad": "Ahmet", "Puan": "85" },\n    { "Ad": "Ayşe", "Puan": "90" }\n  ]\n}',
        tips: [
            'Erişim hatası almamak için, Google Sheet dosyanızı "Bağlantıya sahip herkes görüntüleyebilir" yapın veya Service Account e-postasına "Editör" yetkisi verin.',
            'Tarih formatları Google Sheets\'in kendi ayarlarına bağlıdır.'
        ],
        troubleshooting: [
            { error: "403 Forbidden", solution: "Tabloya erişim izni yok. Paylaşım ayarlarını kontrol edin." },
            { error: "Range Not Found", solution: "Belirtilen sayfa adı (Sheet1 vb.) dosyada mevcut değil." }
        ]
    },

    // --- LOGIC ---
    {
        id: 'if-node',
        title: 'IF (Koşul)',
        type: 'logic',
        description: 'Akışı şarta bağlı olarak yönlendirir.',
        longDescription: `
            <p><strong>IF Düğümü</strong>, akışınızın karar mekanizmasıdır. Gelen veriyi değerlendirir ve sonucun doğru (True) veya yanlış (False) olmasına göre akışı iki farklı yola ayırır.</p>
            <p><strong>Örnek Senaryolar:</strong></p>
            <ul>
                <li>"Fiyat 100 TL'den büyük mü?" &rarr; Evet ise indirim yap, Hayır ise yapma.</li>
                <li>"E-posta başlığı 'Acil' kelimesini içeriyor mu?" &rarr; Evet ise SMS at.</li>
                <li>"Gelen veri boş mu?" &rarr; Evet ise akışı durdur.</li>
            </ul>
            <p>Birden fazla koşul (Condition) ekleyebilirsiniz. Bu koşulların nasıl bağlanacağını "Logic Operator" (AND / OR) ile belirlersiniz.</p>
        `,
        params: [
            { name: 'Value 1', type: 'String', required: true, desc: 'Sol taraf değeri (Genelde bir değişken: {{$json.price}}).' },
            { name: 'Operator', type: 'Select', required: true, desc: 'Equal, NotEqual, Contains, Regex, GreaterThan, LessThan, IsEmpty, IsNotEmpty.' },
            { name: 'Value 2', type: 'String', required: true, desc: 'Sağ taraf değeri (Sabit değer veya başka bir değişken).' }
        ],
        outputs: [
            { field: '-', type: '-', desc: 'Düğüm veriyi değiştirmez, sadece yönlendirir.' }
        ],
        jsonExample: 'Veri pass-through (olduğu gibi geçer).',
        tips: [
            'Sayısal karşılaştırma yaparken verinin metin (String) değil sayı (Number) olduğundan emin olun.',
            'Regex operatörü ile karmaşık desenleri (örn: e-posta formatı, telefon numarası) kontrol edebilirsiniz.'
        ],
        troubleshooting: [
            { error: "Beklenmeyen sonuç (False yerine True)", solution: "Boşluk karakterlerine dikkat edin. 'Elma ' ile 'Elma' eşit değildir." }
        ]
    },
    {
        id: 'loop-node',
        title: 'Loop (Döngü)',
        type: 'logic',
        description: 'Dizi elemanlarını tek tek işler.',
        longDescription: `
            <p><strong>Loop (ForEach)</strong> düğümü, bir liste (Array) üzerindeki her bir eleman için akışı tekrar başlatır. "Split In Batches" mantığıyla çalışır.</p>
            <p>Örneğin, Google Sheets'ten 100 satır veri çektiniz. Her bir satır için ayrı ayrı E-posta göndermek istiyorsunuz. Loop düğümü bu 100 satırı tek tek alır, sıradaki adımları çalıştırır ve sonra başa döner.</p>
            <p><strong>İşleyiş:</strong></p>
            <ol>
                <li>Input olarak bir Dizi (Array) alır.</li>
                <li>Her seferinde diziden 1 (veya Batch Size kadar) eleman çıkartır.</li>
                <li>Çıkıştan bu elemanı verir.</li>
                <li>Döngü içindeki işlemler tamamlanınca otomatik olarak sıradaki elemana geçer.</li>
                <li>Liste bittiğinde "Done" portundan sinyal gönderir (Eğer varsa).</li>
            </ol>
        `,
        params: [
            { name: 'Input Array', type: 'Array', required: true, desc: 'Üzerinde dönülecek liste verisi.' },
            { name: 'Batch Size', type: 'Number', required: false, desc: 'Her adımda kaç eleman işleneceği. Varsayılan: 1.' }
        ],
        outputs: [
            { field: '...item', type: 'Any', desc: 'Listenin o anki elemanının içeriği.' },
            { field: 'loop', type: 'Object', desc: 'Döngü meta verisi (index, total, page).' }
        ],
        jsonExample: '{\n  "id": 1,\n  "ad": "Ürün A",\n  "loop": {\n    "index": 0,\n    "total": 5,\n    "first": true,\n    "last": false\n  }\n}',
        tips: [
            'Döngü içinde "Wait" (Bekle) düğümü kullanarak API limitlerine takılmayı önleyebilirsiniz.',
            'Döngüden çıkmak için "Break" (Kır) benzeri bir düğüm henüz yoktur, liste bitene kadar çalışır.'
        ],
        troubleshooting: [
            { error: "Döngü sadece 1 kere çalışıyor", solution: "Gelen verinin Array (Dizi) tipinde olduğundan emin olun. Tek bir nesne gelirse döngü 1 kez döner." }
        ]
    },

    // --- AI ---
    {
        id: 'ai-agent',
        title: 'AI Agent (Yapay Zeka)',
        type: 'ai',
        description: 'Akıllı metin analizi ve üretimi yapar.',
        longDescription: `
            <p><strong>AI Agent</strong>, BreviAI'ın beynidir. OpenAI (GPT) ve Google (Gemini) modellerini kullanarak metin tabanlı her türlü zihinsel görevi yerine getirebilir.</p>
            <p><strong>Neler Yapabilir?</strong></p>
            <ul>
                <li><strong>Özetleme:</strong> Uzun makaleleri veya e-postaları özetler.</li>
                <li><strong>Sınıflandırma:</strong> Gelen mesajın "Şikayet" mi "Teşekkür" mü olduğunu anlar.</li>
                <li><strong>Çeviri:</strong> Diller arası profesyonel çeviri yapar.</li>
                <li><strong>Veri Çıkarma:</strong> Karmaşık bir metinden İsim, Tarih, Fiyat gibi bilgileri ayıklar ve JSON verir.</li>
            </ul>
        `,
        params: [
            { name: 'Model', type: 'Select', required: true, desc: 'Kullanılacak LLM modeli (gpt-4o, gpt-3.5-turbo, gemini-pro).' },
            { name: 'System Prompt', type: 'Text', required: false, desc: 'Yapay zekanın rolünü ve kurallarını belirler. "Sen uzman bir avukatsın..."' },
            { name: 'User Prompt', type: 'Text', required: true, desc: 'Asıl istek. Değişken içerebilir: "Şu metni özetle: {{$json.makale}}"' },
            { name: 'Temperature', type: 'Number', required: false, desc: 'Yaratıcılık ayarı (0.0 - 1.0). 0 daha tutarlı, 1 daha rastgeledir.' }
        ],
        outputs: [
            { field: 'content', type: 'String', desc: 'Yapay zekanın yanıtı.' },
            { field: 'tokens', type: 'Object', desc: 'Harcanan token sayımı (Maliyet hesabı için).' }
        ],
        jsonExample: '{\n  "content": "Özet: Şirket kârı %20 arttı.",\n  "tokens": {\n    "prompt": 50,\n    "completion": 20,\n    "total": 70\n  }\n}',
        tips: [
            'JSON çıktısı almak istiyorsanız, System Prompt içinde "Yanıtı sadece saf JSON formatında ver" diye belirtin.',
            'GPT-4o modeli daha zeki ama daha yavaştır. Basit işler için GPT-3.5 veya Gemini-Flash kullanın.'
        ],
        troubleshooting: [
            { error: "Yanıt yarıda kesildi", solution: "Max Tokens limitine takılmış olabilirsiniz veya modelin çıkış limiti dolmuş olabilir." }
        ]
    },

    // --- INTEGRATION ---
    {
        id: 'app-launch',
        title: 'App Launch (Uygulama Aç)',
        type: 'integration',
        description: 'Yüklü bir Android uygulamasını başlatır.',
        longDescription: `
            <p>Bu düğüm, BreviAI'ın mobil uygulama entegrasyon yeteneklerinin temelidir. Cihazınızda yüklü olan herhangi bir uygulamayı, o uygulamanın "Paket Adı"nı (Package Name) kullanarak açabilirsiniz.</p>
            <p>Sadece uygulamayı açmakla kalmaz, bazı uygulamalarda belirli ekranlara (Activity) da gidebilirsiniz. Bu özellik, otomasyonun fiziksel cihaz üzerinde gerçekleşen adımları için kullanılır.</p>
        `,
        params: [
            { name: 'Package Name', type: 'String', required: true, desc: 'Uygulamanın benzersiz kimliği. Örn: com.instagram.android' },
            { name: 'Activity', type: 'String', required: false, desc: 'Spesifik bir ekran sınıfı adı. (Gelişmiş kullanıcılar için).' }
        ],
        outputs: [
            { field: 'started', type: 'Boolean', desc: 'Başlatma komutunun başarılı olup olmadığı.' }
        ],
        jsonExample: '{\n  "started": true\n}',
        tips: [
            'Paket adını bulmak için Google Play Store URL\'sine bakabilirsiniz: id=com.ornek.uygulama',
            'Popüler Paketler: com.whatsapp, com.twitter.android, com.google.android.youtube'
        ],
        troubleshooting: [
            { error: "Uygulama açılmıyor", solution: "Paket adının doğruluğunu ve uygulamanın cihazda yüklü olduğunu kontrol edin." }
        ]
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
                <h1 className={styles.title}>BreviAI Ansiklopedik Referans (V5)</h1>
                <p className={styles.subtitle}>Her detay, her parametre, her senaryo. Eksiksiz teknik rehber.</p>

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

                            {/* NEW: Massive HTML Description */}
                            <div
                                className={styles.longDescription}
                                dangerouslySetInnerHTML={{ __html: node.longDescription }}
                            />

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

                            <div className={styles.tipsBox}>
                                <strong>💡 Pro Tips:</strong>
                                <ul>
                                    {node.tips.map((t, i) => <li key={i} dangerouslySetInnerHTML={{ __html: t }} />)}
                                </ul>
                            </div>

                            {/* NEW: Troubleshooting Section */}
                            {node.troubleshooting && node.troubleshooting.length > 0 && (
                                <div className={styles.troubleBox}>
                                    <strong>🔧 Sorun Giderme:</strong>
                                    <ul>
                                        {node.troubleshooting.map((t, i) => (
                                            <li key={i}><strong>{t.error}:</strong> {t.solution}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
