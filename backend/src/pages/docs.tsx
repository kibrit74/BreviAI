import { useState } from 'react';
import '../app/globals.css';
import styles from './docs.module.css';

// --- DATA STRUCTURES ---

type NodeType = 'trigger' | 'action' | 'logic' | 'ai' | 'integration' | 'core';

interface NodeDoc {
    id: string;
    title: string;
    type: NodeType;
    description: string;
    longDescription: string;
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
                <li><strong>GET:</strong> Veri çekmek için.</li>
                <li><strong>POST:</strong> Veri göndermek için.</li>
                <li><strong>PUT/PATCH:</strong> Veri güncellemek için.</li>
                <li><strong>DELETE:</strong> Veri silmek için.</li>
            </ul>
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
            <ul>
                <li><strong>Read (Oku):</strong> Belirtilen aralıktaki verileri çeker. İlk satırı başlık (Header) olarak algılar ve JSON dizisine çevirir.</li>
                <li><strong>Append (Ekle):</strong> Tablonun en altındaki ilk boş satıra yeni veri yazar. Veri kaybını önler.</li>
                <li><strong>Update (Güncelle):</strong> Spesifik bir hücreyi veya aralığı değiştirir.</li>
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
            'Erişim hatası almamak için, Google Sheet dosyanızı "Bağlantıya sahip herkes görüntüleyebilir" yapın veya Service Account e-postasına "Editör" yetkisi verin.'
        ],
        troubleshooting: [
            { error: "403 Forbidden", solution: "Tabloya erişim izni yok. Paylaşım ayarlarını kontrol edin." },
            { error: "Range Not Found", solution: "Belirtilen sayfa adı (Sheet1 vb.) dosyada mevcut değil." }
        ]
    },
    {
        id: 'wait-node',
        title: 'Wait (Bekle)',
        type: 'action',
        description: 'Akışı belirli bir süre duraklatır.',
        longDescription: `
            <p><strong>Wait (Bekle)</strong> düğümü, akışınızın çalışmasını geçici olarak askıya alır. Bu, özellikle hız limiti olan API'lerle çalışırken veya insan tepkisi (örn: SMS onayı) beklerken gereklidir.</p>
            <p><strong>Modlar:</strong></p>
            <ul>
                <li><strong>Duration:</strong> "5 dakika bekle", "10 saniye bekle".</li>
                <li><strong>Specific Time:</strong> "Yarın saat 14:00'e kadar bekle".</li>
            </ul>
        `,
        params: [
            { name: 'Resume', type: 'Select', required: true, desc: 'After Interval (Süre) veya At Specific Time (Tarih).' },
            { name: 'Wait Amount', type: 'Number', required: true, desc: 'Beklenecek miktar (Örn: 5000).' },
            { name: 'Unit', type: 'Select', required: false, desc: 'Milisaniye, Saniye, Dakika, Saat.' }
        ],
        outputs: [
            { field: 'resumedAt', type: 'Number', desc: 'Devam ettiği zaman damgası.' }
        ],
        jsonExample: '{\n  "resumedAt": 1715000500\n}',
        tips: ['API Rate Limit aşımlarını önlemek için döngüler içinde kısa beklemeler (örn: 1000ms) kullanın.'],
        troubleshooting: [
            { error: "Beklemiyor, hemen geçiyor", solution: "Birim (Unit) ayarını kontrol edin. Milisaniye seçiliyse 5 değeri çok kısa gelir." }
        ]
    },

    // --- CORE & LOGIC ---
    {
        id: 'set-variable',
        title: 'Set Variable (Değişken Ata)',
        type: 'core',
        description: 'Verileri saklamak ve dönüştürmek için kullanılır.',
        longDescription: `
            <p><strong>Set Variable</strong> düğümü, akışın herhangi bir noktasında yeni veri üretmenizi veya mevcut veriyi değiştirmenizi sağlar. Karmaşık hesaplamalar, metin birleştirmeleri veya JSON yapılandırmaları için kullanılır.</p>
            <p>Sadece tek bir değişken değil, birden fazla değişkeni aynı anda tanımlayabilirsiniz.</p>
        `,
        params: [
            { name: 'Name', type: 'String', required: true, desc: 'Değişken adı (Örn: "toplamFiyat").' },
            { name: 'Value', type: 'String/Expression', required: true, desc: 'Değer. {{$json.fiyat}} * 1.20 gibi formüller kullanabilirsiniz.' }
        ],
        outputs: [
            { field: '<Name>', type: 'Any', desc: 'Tanımladığınız değişkenler.' }
        ],
        jsonExample: '{\n  "toplamFiyat": 120,\n  "musteriAdi": "AHMET"\n}',
        tips: ['Sonraki düğümlerde bu değişkene `{{$json.toplamFiyat}}` şeklinde erişebilirsiniz.'],
        troubleshooting: []
    },
    {
        id: 'if-node',
        title: 'IF (Koşul)',
        type: 'logic',
        description: 'Akışı şarta bağlı olarak yönlendirir.',
        longDescription: `
            <p><strong>IF Düğümü</strong>, akışınızın karar mekanizmasıdır. Gelen veriyi değerlendirir ve sonucun doğru (True) veya yanlış (False) olmasına göre akışı iki farklı yola ayırır.</p>
            <p>Birden fazla koşul (Condition) ekleyebilirsiniz. Bu koşulların nasıl bağlanacağını "Logic Operator" (AND / OR) ile belirlersiniz.</p>
        `,
        params: [
            { name: 'Value 1', type: 'String', required: true, desc: 'Sol taraf değeri (Genelde bir değişken: {{$json.price}}).' },
            { name: 'Operator', type: 'Select', required: true, desc: 'Equal, NotEqual, Contains, Regex, GreaterThan, LessThan, IsEmpty, IsNotEmpty.' },
            { name: 'Value 2', type: 'String', required: true, desc: 'Sağ taraf değeri.' }
        ],
        outputs: [
            { field: '-', type: '-', desc: 'Düğüm veriyi değiştirmez, sadece yönlendirir.' }
        ],
        jsonExample: '-',
        tips: [
            'Sayısal karşılaştırma yaparken verinin metin (String) değil sayı (Number) olduğundan emin olun.'
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
        `,
        params: [
            { name: 'Input Array', type: 'Array', required: true, desc: 'Üzerinde dönülecek liste verisi.' },
            { name: 'Batch Size', type: 'Number', required: false, desc: 'Her adımda kaç eleman işleneceği. Varsayılan: 1.' }
        ],
        outputs: [
            { field: '...item', type: 'Any', desc: 'Listenin o anki elemanının içeriği.' },
            { field: 'loop', type: 'Object', desc: 'Döngü meta verisi (index, total, page).' }
        ],
        jsonExample: '{\n  "id": 1,\n  "ad": "Ürün A",\n  "loop": {\n    "index": 0,\n    "total": 5\n  }\n}',
        tips: [
            'Döngüden çıkmak için "Break" benzeri bir düğüm yoktur, liste bitene kadar çalışır.'
        ],
        troubleshooting: [
            { error: "Döngü sadece 1 kere çalışıyor", solution: "Gelen verinin Array (Dizi) tipinde olduğundan emin olun." }
        ]
    },
    {
        id: 'merge-node',
        title: 'Merge (Birleştir)',
        type: 'logic',
        description: 'Farklı kollardan gelen verileri birleştirir.',
        longDescription: `
            <p><strong>Merge</strong> düğümü, paralel çalışan iki veya daha fazla akış kolunu tekrar tek bir noktada toplar. "Wait for all inputs" (Tüm girdileri bekle) mantığıyla çalışır.</p>
            <p><strong>Modlar:</strong></p>
            <ul>
                <li><strong>Append:</strong> Gelen verileri alt alta ekler (Uzun bir liste oluşturur).</li>
                <li><strong>Merge by Key:</strong> Ortak bir anahtara (örn: ID) göre verileri birleştirir (SQL JOIN gibi).</li>
            </ul>
        `,
        params: [
            { name: 'Mode', type: 'Select', required: true, desc: 'Append, Merge by Key, Pass-through.' }
        ],
        outputs: [
            { field: 'mergedData', type: 'Array', desc: 'Birleştirilmiş veri seti.' }
        ],
        jsonExample: '{\n  "id": 1,\n  "ad": "Ürün A",\n  "stok": 50\n}',
        tips: ['Paralel işlemlerin (örn: hem resim yükle hem veritabanına yaz) sonucunu tek bir rapor haline getirmek için kullanın.'],
        troubleshooting: []
    },

    // --- AI ---
    {
        id: 'ai-agent',
        title: 'AI Agent (Yapay Zeka)',
        type: 'ai',
        description: 'Akıllı metin analizi ve üretimi yapar.',
        longDescription: `
            <p><strong>AI Agent</strong>, BreviAI'ın beynidir. OpenAI (GPT) ve Google (Gemini) modellerini kullanarak metin tabanlı her türlü zihinsel görevi yerine getirebilir.</p>
            <ul>
                <li><strong>Özetleme:</strong> Uzun makaleleri veya e-postaları özetler.</li>
                <li><strong>Sınıflandırma:</strong> Gelen mesajın konusunu anlar.</li>
                <li><strong>Çeviri:</strong> Diller arası profesyonel çeviri yapar.</li>
            </ul>
        `,
        params: [
            { name: 'Model', type: 'Select', required: true, desc: 'Kullanılacak LLM modeli (gpt-4o, gpt-3.5-turbo, gemini-pro).' },
            { name: 'System Prompt', type: 'Text', required: false, desc: 'Yapay zekanın rolünü ve kurallarını belirler.' },
            { name: 'User Prompt', type: 'Text', required: true, desc: 'Asıl istek.' }
        ],
        outputs: [
            { field: 'content', type: 'String', desc: 'Yapay zekanın yanıtı.' },
            { field: 'tokens', type: 'Object', desc: 'Harcanan token sayımı.' }
        ],
        jsonExample: '{\n  "content": "Özet: Şirket kârı %20 arttı.",\n  "tokens": { "total": 70 }\n}',
        tips: [
            'JSON çıktısı almak istiyorsanız, System Prompt içinde "Yanıtı sadece saf JSON formatında ver" diye belirtin.'
        ],
        troubleshooting: [
            { error: "Yanıt yarıda kesildi", solution: "Max Tokens limitine takılmış olabilirsiniz." }
        ]
    },
    {
        id: 'image-gen',
        title: 'Image Generator (Resim Üretme)',
        type: 'ai',
        description: 'Prompt\'tan görsel oluşturur.',
        longDescription: `
            <p>Yapay zeka modelleri (DALL-E 3 veya Stable Diffusion) kullanarak metinsel tariften (Prompt) yüksek kaliteli görseller üretir.</p>
        `,
        params: [
            { name: 'Provider', type: 'Select', required: true, desc: 'DALL-E 3 veya Stable Diffusion.' },
            { name: 'Prompt', type: 'Text', required: true, desc: 'Görsel tarifi.' }
        ],
        outputs: [
            { field: 'url', type: 'String', desc: 'Üretilen resmin URL adresi.' }
        ],
        jsonExample: '{\n  "url": "https://..."\n}',
        tips: ['URL geçicidir (genelde 1 saat). Kalıcı olması için resmi indirin.'],
        troubleshooting: []
    },

    // --- APPS ---
    {
        id: 'app-launch',
        title: 'App Launch (Uygulama Aç)',
        type: 'integration',
        description: 'Android uygulamasını ön planda başlatır.',
        longDescription: `
            <p>Bu düğüm, BreviAI'ın mobil uygulama entegrasyon yeteneklerinin temelidir. Cihazınızda yüklü olan herhangi bir uygulamayı, o uygulamanın "Paket Adı"nı (Package Name) kullanarak açabilirsiniz.</p>
        `,
        params: [
            { name: 'Package Name', type: 'String', required: true, desc: 'Uygulamanın benzersiz kimliği. Örn: com.instagram.android' }
        ],
        outputs: [
            { field: 'started', type: 'Boolean', desc: 'Başlatma başarılı mı?' }
        ],
        jsonExample: '{\n  "started": true\n}',
        tips: [
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
                <h1 className={styles.title}>BreviAI Grand Master Rehberi (V6)</h1>
                <p className={styles.subtitle}>En kapsamlı otomasyon kütüphanesi. Tüm düğümler, tüm formüller.</p>

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
                        <button onClick={() => setSelectedType('trigger')} className={`${styles.filterBtn} ${selectedType === 'trigger' ? styles.active : ''}`}>Triggers</button>
                        <button onClick={() => setSelectedType('action')} className={`${styles.filterBtn} ${selectedType === 'action' ? styles.active : ''}`}>Actions</button>
                        <button onClick={() => setSelectedType('logic')} className={`${styles.filterBtn} ${selectedType === 'logic' ? styles.active : ''}`}>Logic</button>
                        <button onClick={() => setSelectedType('core')} className={`${styles.filterBtn} ${selectedType === 'core' ? styles.active : ''}`}>Core</button>
                        <button onClick={() => setSelectedType('ai')} className={`${styles.filterBtn} ${selectedType === 'ai' ? styles.active : ''}`}>AI</button>
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
                            <div className={`${styles.cardHeader} ${styles[node.type]}`}>
                                <span className={styles.cardTypeBadge}>{node.type.toUpperCase()}</span>
                                <h3>{node.title}</h3>
                            </div>
                            <div className={styles.cardBody}>
                                <p className={styles.cardDesc}>{node.description}</p>

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

                <div className={styles.sidebar}>
                    <div className={styles.sidebarSection}>
                        <h3>📖 Expression Kütüphanesi</h3>
                        <p>Değişkenlerde kullanabileceğiniz formüller.</p>

                        <h4>String Formülleri</h4>
                        <ul>
                            <li><code>.toUpperCase()</code> - BÜYÜK HARF</li>
                            <li><code>.toLowerCase()</code> - küçük harf</li>
                            <li><code>.trim()</code> - Boşlukları sil</li>
                            <li><code>.slice(0, 5)</code> - İlk 5 harf</li>
                            <li><code>.replace('a', 'b')</code> - Harf değiştir</li>
                        </ul>

                        <h4>Matematik</h4>
                        <ul>
                            <li><code>Math.round(x)</code> - Yuvarla</li>
                            <li><code>Math.floor(x)</code> - Aşağı yuvarla</li>
                            <li><code>Math.random()</code> - Rastgele sayı</li>
                            <li><code>parseInt('5')</code> - Sayıya çevir</li>
                        </ul>

                        <h4>Tarih (Date)</h4>
                        <ul>
                            <li><code>new Date().toISOString()</code></li>
                            <li><code>new Date().getUTCHours()</code></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
