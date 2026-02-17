import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import styles from './docs.module.css';
import { NODES, CATS } from '../data/docsData';
import { ReactNode } from 'react';

// --- Types ---
type TabId = 'overview' | 'params' | 'output' | 'examples' | 'usecases';

// --- Helper Functions ---
function getColor(type: string) {
    return CATS[type]?.color || '#6366F1';
}

function getIcon(type: string) {
    return CATS[type]?.icon || '📦';
}

// --- Content Data (Extracted from WORKFLOW_GUIDE.md) ---
const STATIC_SECTIONS = {
    getting_started: {
        title: "Başlarken",
        icon: "🚀",
        content: (
            <>
                <h2>BreviAI Otomasyon Platformuna Hoş Geldiniz</h2>
                <p>Bu rehber, BreviAI otomasyon sistemini kullanarak nasıl iş akışları oluşturacağınızı, yönetebileceğinizi ve hata ayıklayabileceğinizi öğrenmeniz için hazırlanmıştır. n8n benzeri düğüm tabanlı yapısı sayesinde kod yazmadan karmaşık süreçleri otomatize edebilirsiniz.</p>

                <hr className={styles.divider} />

                <h3>1. İş Akışı (Workflow) Nedir?</h3>
                <p>Bir iş akışı, belirli bir görevi yerine getirmek için birbirine bağlanmış <strong>Düğümler (Nodes)</strong> koleksiyonudur. Her iş akışı bir <strong>Tetikleyici (Trigger)</strong> ile başlar (örneğin: bir zamanlayıcı, bir webhook veya manuel tetikleme) ve ardından gelen düğümler sırayla çalışır.</p>

                <h3>2. Düğümler (Nodes)</h3>
                <p>Düğümler, iş akışınızın yapı taşlarıdır. Her düğüm belirli bir görevi yerine getirir:</p>
                <ul>
                    <li><strong>Tetikleyiciler (Triggers):</strong> Akışı başlatan olaylardır (Örn: Cron, Webhook, App Trigger).</li>
                    <li><strong>Eylemler (Actions):</strong> Bir iş yapan düğümlerdir (Örn: HTTP Request, Send Email, Google Sheets Read).</li>
                    <li><strong>Mantık (Logic):</strong> Akışın yönünü değiştiren düğümlerdir (Örn: IF, Switch, Code).</li>
                </ul>
            </>
        )
    },
    concepts: {
        title: "Temel Kavramlar",
        icon: "📚",
        content: (
            <>
                <h2>Veri Akışı ve JSON</h2>
                <p>BreviAI'de düğümler arasındaki veri alışverişi <strong>JSON</strong> formatında olur. Bir düğümün çıktısı, kendisinden sonra gelen düğümün girdisi olur.</p>

                <div className={styles.codeBlock}>
                    <pre>{`[
  {
    "id": 1,
    "name": "Örnek Müşteri",
    "email": "ornek@breviai.com"
  }
]`}</pre>
                </div>

                <h3>İfadeler (Expressions) ve Değişkenler</h3>
                <p>Bir düğümün ayarlarında, önceki düğümlerden gelen verileri dinamik olarak kullanabilirsiniz. Bu yapı, <code>{`{{ ... }}`}</code> sözdizimi ile çalışır.</p>

                <h4>1. Temel Kullanım</h4>
                <ul>
                    <li><strong>Doğrudan Değişken:</strong> <code>{`{{degiskenAdi}}`}</code></li>
                    <li><strong>JSON Yolu:</strong> <code>{`{{degiskenAdi.altAlan.deger}}`}</code></li>
                    <li><strong>Dizi Erişimi:</strong> <code>{`{{liste[0].ad}}`}</code></li>
                </ul>

                <h4>2. Özel Değişkenler</h4>
                <ul>
                    <li><code>{`{{userInput}}`}</code>: Kullanıcının chat ekranından girdiği son mesaj.</li>
                    <li><code>{`{{$json}}`}</code>: Mevcut düğüme gelen tüm JSON verisi.</li>
                    <li><code>{`{{$now}}`}</code>: Şu anki zaman damgası (ISO formatında).</li>
                </ul>
            </>
        )
    },
    cookbook: {
        title: "Örnek Senaryolar (Cookbook)",
        icon: "🍳",
        content: (
            <>
                <h2>Popüler Otomasyon Örnekleri</h2>

                <div className={styles.exampleCard}>
                    <h3>🗞️ Senaryo 1: RSS'den Özet Çıkarıp WhatsApp'a Gönder</h3>
                    <p><strong>Akış:</strong> Cron → HTTP Request → Code (Parse) → Loop → AI Agent → WhatsApp Send</p>
                </div>

                <div className={styles.exampleCard}>
                    <h3>📊 Senaryo 2: Döviz Kuru Takip + Excel Kayıt</h3>
                    <p><strong>Akış:</strong> Cron (5dk) → HTTP (Kur API) → Sheets (Yaz) → IF (Kur &gt; 35?) → True: Bildirim</p>
                </div>

                <div className={styles.exampleCard}>
                    <h3>📱 Senaryo 3: Banka SMS'i ile Otomatik Harcama Kaydı</h3>
                    <p><strong>Akış:</strong> Bildirim Yakala → Code (Parse) → Sheets (Kaydet) → AI (Kategorize)</p>
                </div>

                <div className={styles.exampleCard}>
                    <h3>🎨 Senaryo 4: Yapay Zeka ile Görsel Üretim ve Paylaşım</h3>
                    <p><strong>Akış:</strong> Text Input → Image Generator → WhatsApp Send</p>
                </div>
            </>
        )
    },
    faq: {
        title: "SSS & Sorun Giderme",
        icon: "❓",
        content: (
            <>
                <h2>Sık Karşılaşılan Sorunlar</h2>

                <div className={styles.faqItem}>
                    <h3>1. WhatsApp Mesajı Gitmiyor</h3>
                    <p><strong>Çözüm:</strong> Ayarlar &gt; Servis Durumu menüsünden "WhatsApp Connected" yazısını gördüğünüzden emin olun. Eğer bağlı değilse QR kodu tekrar okutun.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>2. Otomasyon Tetiklenmiyor</h3>
                    <p><strong>Çözüm:</strong> Otomasyonun "AKTİF" anahtarının açık olduğundan emin olun. Zamanlayıcı trigger'ı kullanıyorsanız backend sunucusunun (Cron Service) çalıştığını kontrol edin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>3. "Client not ready" Hatası</h3>
                    <p><strong>Çözüm:</strong> Backend servisi WhatsApp'a henüz bağlanmamıştır. Birkaç saniye bekleyin veya servisi yeniden başlatın.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>4. Cron Job Çalışmıyor</h3>
                    <p><strong>Çözüm:</strong> Time Trigger kullanıyorsanız sunucu saat diliminin (Timezone) doğru ayarlandığından emin olun. Varsayılan GMT+3 (Europe/Istanbul) olmalıdır.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>5. AI Cevap Vermiyor (Timeout)</h3>
                    <p><strong>Çözüm:</strong> Çok uzun promptlar veya yavaş modeller (örn: GPT-4) zaman aşımına uğrayabilir. <code>Timeout</code> süresini artırın veya daha hızlı bir model (Gemini Flash) seçin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>6. Webhook Tetiklenmiyor</h3>
                    <p><strong>Çözüm:</strong> Webhook URL'sinin doğru kopyalandığından ve gönderilen isteğin metodunun (GET/POST) düğüm ayarlarıyla eşleştiğinden emin olun.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>7. Excel Dosyasını Okuyamıyorum</h3>
                    <p><strong>Çözüm:</strong> Dosyanın OneDrive veya Google Drive üzerinde olduğundan ve BreviAI'ye gerekli okuma izinlerinin verildiğinden emin olun. Yerel dosyalar desteklenmez.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>8. Instagram Post Hatası</h3>
                    <p><strong>Çözüm:</strong> Instagram Business hesabınızın Facebook Sayfası ile bağlantılı olması gerekir. Kişisel profiller API desteği sunmaz.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>9. Değişkenler Çalışmıyor ({{ variable }})</h3>
                    <p><strong>Çözüm:</strong> Değişken isminin tam olarak doğru yazıldığından emin olun (büyük/küçük harf duyarlı). Bir önceki düğümün çıktısını kontrol etmek için "Test Run" yapın.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>10. "ReferenceError: x is not defined"</h3>
                    <p><strong>Çözüm:</strong> Kullanmaya çalıştığınız değişken henüz tanımlanmamış. Değişkeni üreten düğümün, mevcut düğümden ÖNCE çalıştığından emin olun.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>11. Sesli Asistan Beni Duymuyor</h3>
                    <p><strong>Çözüm:</strong> Tarayıcı veya uygulama mikrofon izninin verildiğini kontrol edin. Gürültülü ortamlarda "Silence Threshold" ayarını artırın.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>12. Döngü (Loop) Sonsuza Girdi</h3>
                    <p><strong>Çözüm:</strong> Loop içinde "Wait" düğümü yoksa sistem çok hızlı çalışıp kitlenebilir. Her iterasyona en az 1 saniye bekleme ekleyin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>13. API Rate Limit Hatası (429)</h3>
                    <p><strong>Çözüm:</strong> Çok sık istek atıyorsunuz. Loop kullanıyorsanız "Batch Size" küçültün veya araya "Wait" ekleyerek istekleri yavaşlatın.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>14. PDF Oluşturma Bozuk Görünüyor</h3>
                    <p><strong>Çözüm:</strong> Kullandığınız HTML şablonunda desteklenmeyen CSS özellikleri olabilir. Flexbox yerine daha basit Table yapısı kullanmayı deneyin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>15. Konum (Geofence) Algılamıyor</h3>
                    <p><strong>Çözüm:</strong> GPS'in açık olduğundan ve uygulamanın "Arka Planda Konum Kullanımı" iznine sahip olduğundan emin olun. Radius'u 200m altına düşürmeyin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>16. Bildirim Yakalama Gecikiyor</h3>
                    <p><strong>Çözüm:</strong> Bazı telefon markaları (Xiaomi, Huawei) arka plan uygulamalarını agresif şekilde kapatır. Pil ayarlarından BreviAI için "Kısıtlama Yok" seçin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>17. "Network Error" Alıyorum</h3>
                    <p><strong>Çözüm:</strong> İnternet bağlantınızı kontrol edin. Eğer yerel bir sunucu (Localhost) kullanıyorsanız, telefondan erişmek için aynı Wi-Fi ağında olmalısınız.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>18. Image Generator Siyah Çıktı Veriyor</h3>
                    <p><strong>Çözüm:</strong> "Safety Filter"a takılmış olabilirsiniz. Prompt içeriğinde yasaklı kelimeler (şiddet, +18 vb.) olup olmadığını kontrol edin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>19. Hafıza (Memory) Hatırlamıyor</h3>
                    <p><strong>Çözüm:</strong> "Min Similarity" ayarı çok yüksek olabilir (örn: 0.9). Bunu 0.7 veya 0.6 seviyesine düşürerek daha esnek arama yapın.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>20. Pro Lisans Hatası</h3>
                    <p><strong>Çözüm:</strong> Lisans anahtarınızın süresi dolmuş veya başka bir cihazda kullanılıyor olabilir. Ayarlar &gt; Hesap sayfasından durumu kontrol edin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>21. JavaScript "Code" Düğümü Kütüphane Desteği</h3>
                    <p><strong>Soru:</strong> npm paketlerini import edebilir miyim?<br /><strong>Cevap:</strong> Güvenlik nedeniyle harici npm paketleri yüklenemez. Ancak <code>lodash</code>, <code>moment</code> ve <code>axios</code> yerleşik olarak gelir.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>22. Değişken Tipi Dönüşümü</h3>
                    <p><strong>Soru:</strong> Metin olarak gelen "100" sayısını matematikte nasıl kullanırım?<br /><strong>Cevap:</strong> Code düğümünde <code>parseInt(input)</code> kullanın veya Code düğümü olmadan matematiksel işlem yapıyorsanız sistem otomatik dener.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>23. Akışları Dışa/İçe Aktarma</h3>
                    <p><strong>Soru:</strong> Akışımı arkadaşıma nasıl gönderirim?<br /><strong>Cevap:</strong> Editörde sağ üst menüden "Export JSON" diyerek indirin. Diğer kişi "Import Workflow" ile yükleyebilir.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>24. Büyük Listeleri Bölme (Batching)</h3>
                    <p><strong>Soru:</strong> 5000 kişiye mail atınca sistem donuyor.<br /><strong>Cevap:</strong> "Split Batches" düğümü kullanın. Listenizi 50'şerli gruplara bölün ve Loop içine "Wait 5s" ekleyin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>25. Paralel Kolların Birleşmesi</h3>
                    <p><strong>Soru:</strong> İki farklı koldan gelen veriyi nasıl birleştiririm?<br /><strong>Cevap:</strong> "Merge" düğümü kullanın. "Wait for both" seçeneğini işaretleyerek iki kolun da bitmesini bekleyin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>26. OAuth vs API Key</h3>
                    <p><strong>Soru:</strong> Hangisini kullanmalıyım?<br /><strong>Cevap:</strong> Mümkünse her zaman OAuth (kullanıcı girişi) kullanın. Daha güvenlidir ve token yenilemeyi sistem otomatik yapar.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>27. Gizli Mod (Incognito)</h3>
                    <p><strong>Soru:</strong> Akış loglarının tutulmamasını sağlayabilir miyim?<br /><strong>Cevap:</strong> Akış ayarlarından "Log Level: None" seçerseniz hiçbir veri veritabanına kaydedilmez.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>28. Docker / Self-Hosted</h3>
                    <p><strong>Soru:</strong> Kendi sunucumda barındırabilir miyim?<br /><strong>Cevap:</strong> Evet, Enterprise lisans sahipleri Docker imajını kendi sunucularına (On-Premise) kurabilir.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>29. Veritabanı Bağlantısı</h3>
                    <p><strong>Soru:</strong> MySQL veya PostgreSQL'e bağlanabilir miyim?<br /><strong>Cevap:</strong> Evet, "SQL Query" düğümü ile bağlantı stringi girerek sorgu çalıştırabilirsiniz.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>30. Geçmiş Versiyona Dönüş</h3>
                    <p><strong>Soru:</strong> Yanlışlıkla akışı bozdum, geri alabilir miyim?<br /><strong>Cevap:</strong> "History" sekmesinden son 50 değişikliği görebilir ve tek tıkla geri yükleyebilirsiniz.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>31. Karanlık Mod Ayarı</h3>
                    <p><strong>Soru:</strong> Tema ayarı kayboluyor.<br /><strong>Cevap:</strong> Tema tercihi tarayıcı çerezi (cookie) olarak saklanır. Çerezleri temizlerseniz varsayılana döner.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>32. Klavye Kısayolları</h3>
                    <p><strong>Soru:</strong> Hızlı işlem menüsü var mı?<br /><strong>Cevap:</strong> Editörde <code>Ctrl + K</code> (Mac: Cmd + K) basarak komut paletini açabilirsiniz.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>33. "Wait" Düğümü Hassasiyeti</h3>
                    <p><strong>Soru:</strong> Milisaniye cinsinden bekletebilir miyim?<br /><strong>Cevap:</strong> Hayır, minimum bekleme süresi 1 saniyedir. Daha kısa süreler için Code düğümünde <code>await new Promise(...)</code> kullanabilirsiniz.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>34. Switch Büyük/Küçük Harf</h3>
                    <p><strong>Soru:</strong> "Evet" ile "evet" farklı algılanıyor.<br /><strong>Cevap:</strong> Switch düğümü varsayılan olarak harf duyarlıdır (Case Sensitive). Ayarlardan "Case Insensitive" kutusunu işaretleyin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>35. Regex Test Etme</h3>
                    <p><strong>Soru:</strong> Yazdığım Regex'in çalıştığını nasıl anlarım?<br /><strong>Cevap:</strong> Notification Trigger içindeki "Test Regex" butonunu kullanın veya regex101.com sitesinden yardım alın.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>36. Dosya Boyut Sınırı</h3>
                    <p><strong>Soru:</strong> Maksimum kaç MB dosya yükleyebilirim?<br /><strong>Cevap:</strong> Cloud sürümde 25MB, Self-Hosted sürümde sunucu ayarına bağlıdır (genellikle 100MB).</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>37. Desteklenen Görsel Formatları</h3>
                    <p><strong>Soru:</strong> HEIC dosyalarını işleyebilir miyim?<br /><strong>Cevap:</strong> Sistem JPG, PNG ve WebP destekler. HEIC formatındaki fotoğraflar otomatik olarak JPG'ye çevrilir.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>38. Hata Yakalama (Try/Catch)</h3>
                    <p><strong>Soru:</strong> Bir düğüm hata verirse akış durmasın istiyorum.<br /><strong>Cevap:</strong> Düğüm ayarlarında "Continue on Error" seçeneğini aktif edin. Hata çıktısını bir sonraki düğümde kontrol edebilirsiniz.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>39. Bildirim Kanalları</h3>
                    <p><strong>Soru:</strong> Sadece Push bildirimi gönderemez miyim?<br /><strong>Cevap:</strong> Evet, "App Push" düğümü ile sadece BreviAI mobil uygulamasına bildirim gönderebilirsiniz.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>40. Tetikleyici Çakışması (Overlap)</h3>
                    <p><strong>Soru:</strong> Akış bitmeden tekrar tetiklenirse ne olur?<br /><strong>Cevap:</strong> Varsayılan olarak yeni bir "Execution" başlar ve paralel çalışır. Bunu engellemek için akış ayarlarında "Sequential Mode" seçin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>41. Manual Trigger Form Tipleri</h3>
                    <p><strong>Soru:</strong> Formda tarih seçici var mı?<br /><strong>Cevap:</strong> Evet, Input Schema'da tip olarak <code>Date</code>, <code>Time</code>, <code>Select</code>, <code>Number</code> ve <code>Boolean</code> seçebilirsiniz.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>42. Alt Akış (Sub-workflow) Limiti</h3>
                    <p><strong>Soru:</strong> İç içe kaç akış çağırabilirim?<br /><strong>Cevap:</strong> Maksimum derinlik 5'tir. Bu, sonsuz döngüleri engellemek için konulmuş bir sınırdır.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>43. Yaz Saati Uygulaması (DST)</h3>
                    <p><strong>Soru:</strong> Saatler ileri/geri alınınca Cron bozulur mu?<br /><strong>Cevap:</strong> Timezone ayarı (Europe/Istanbul) seçiliyse sistem DST değişikliklerini otomatik yönetir.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>44. Türkçe Karakter Sorunu</h3>
                    <p><strong>Soru:</strong> CSV çıktısında Ş, İ, Ğ harfleri bozuk çıkıyor.<br /><strong>Cevap:</strong> Dosya oluştururken encoding olarak "UTF-8 with BOM" seçtiğinizden emin olun.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>45. HTML to PDF Tasarımı</h3>
                    <p><strong>Soru:</strong> CSS Grid neden çalışmıyor?<br /><strong>Cevap:</strong> PDF motoru eski web standartlarını kullanır. Modern CSS (Grid, Flexbox gap) yerine <code>table</code>, <code>block</code> ve <code>inline-block</code> kullanın.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>46. Önbellek Temizleme</h3>
                    <p><strong>Soru:</strong> Yaptığım değişiklikler görünmüyor.<br /><strong>Cevap:</strong> Tarayıcınızda <code>Ctrl + Shift + R</code> yaparak önbelleği yok sayıp yenileyin (Hard Reload).</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>47. Destek Talebi Önceliği</h3>
                    <p><strong>Soru:</strong> Acil durumlarda nasıl hızlı destek alırım?<br /><strong>Cevap:</strong> Pro ve Enterprise müşterileri "Priority Support" hakkına sahiptir. Talebinize "URGENT" etiketi ekleyin.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>48. Topluluk Forumu</h3>
                    <p><strong>Soru:</strong> Diğer kullanıcıların akışlarını görebilir miyim?<br /><strong>Cevap:</strong> community.breviai.com adresinden şablon paylaşım platformuna erişebilirsiniz.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>49. Özellik İsteği</h3>
                    <p><strong>Soru:</strong> Yeni bir düğüm eklenmesini istiyorum.<br /><strong>Cevap:</strong> GitHub repomuzda "Feature Request" açabilir veya toplulukta oylamaya sunabilirsiniz.</p>
                </div>

                <div className={styles.faqItem}>
                    <h3>50. API Dokümantasyonu</h3>
                    <p><strong>Soru:</strong> Kendi uygulamamdan BreviAI'yi nasıl kontrol ederim?<br /><strong>Cevap:</strong> developers.breviai.com adresinde REST API ve WebSocket dokümantasyonu mevcuttur.</p>
                </div>
            </>
        )
    }
};


export default function DocsPage() {
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(NODES[0].id);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentSection, setCurrentSection] = useState<string>('nodes'); // 'nodes', 'getting_started', etc.

    // --- Computed ---
    const selectedNode = useMemo(() =>
        NODES.find(n => n.id === selectedNodeId),
        [selectedNodeId]);

    const filteredNodes = useMemo(() => {
        return NODES.filter(n =>
            !searchTerm ||
            n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (n.tags || []).some(t => t.includes(searchTerm.toLowerCase()))
        );
    }, [searchTerm]);

    const groupedNodes = useMemo(() => {
        const groups: Record<string, typeof NODES> = {};
        Object.keys(CATS).forEach(k => groups[k] = []);
        filteredNodes.forEach(n => {
            if (groups[n.type]) groups[n.type].push(n);
        });
        return groups;
    }, [filteredNodes]);

    const totalCount = filteredNodes.length;

    // --- Render Functions ---

    const renderSidebar = () => (
        <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <div className={styles.logo}>BreviAI Docs</div>
                <div className={styles.version}>v2.4</div>
            </div>

            <div className={styles.searchContainer}>
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Düğüm ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className={styles.nodeTree}>
                {/* Static Sections Navigation */}
                <div className={styles.categoryGroup}>
                    <div className={styles.categoryTitle}>KILAVUZ</div>
                    <div className={styles.nodeList}>
                        <button className={`${styles.nodeItem} ${currentSection === 'getting_started' ? styles.activeNode : ''}`}
                            onClick={() => setCurrentSection('getting_started')}>
                            Rocket Start
                        </button>
                        <button className={`${styles.nodeItem} ${currentSection === 'concepts' ? styles.activeNode : ''}`}
                            onClick={() => setCurrentSection('concepts')}>
                            Kavramlar
                        </button>
                        <button className={`${styles.nodeItem} ${currentSection === 'cookbook' ? styles.activeNode : ''}`}
                            onClick={() => setCurrentSection('cookbook')}>
                            Cookbook (Örnekler)
                        </button>
                        <button className={`${styles.nodeItem} ${currentSection === 'faq' ? styles.activeNode : ''}`}
                            onClick={() => setCurrentSection('faq')}>
                            SSS & Hata
                        </button>
                    </div>
                </div>

                {/* Dynamic Nodes Navigation */}
                <div className={styles.categoryTitle} style={{ marginTop: '1.5rem' }}>DÜĞÜMLER ({totalCount})</div>

                {Object.entries(CATS).map(([type, cat]) => {
                    const nodes = groupedNodes[type];
                    if (!nodes || nodes.length === 0) return null;

                    return (
                        <div key={type} className={styles.categoryGroup} id={`cat-${type}`}>
                            <div className={styles.categoryTitle} style={{ color: cat.color }}>
                                <span className={styles.catIcon}>{cat.icon}</span>
                                {cat.label}
                            </div>
                            <div className={styles.nodeList}>
                                {nodes.map(n => (
                                    <button
                                        key={n.id}
                                        className={`${styles.nodeItem} ${currentSection === 'nodes' && n.id === selectedNodeId ? styles.activeNode : ''}`}
                                        onClick={() => {
                                            setSelectedNodeId(n.id);
                                            setCurrentSection('nodes');
                                            setActiveTab('overview');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                    >
                                        {n.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {totalCount === 0 && (
                    <div className={styles.emptySearch}>
                        <div style={{ fontSize: 32 }}>🔍</div>
                        <p>"{searchTerm}" için sonuç bulunamadı.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderStaticSection = () => {
        const sectionData = STATIC_SECTIONS[currentSection as keyof typeof STATIC_SECTIONS];
        if (!sectionData) return null;

        return (
            <div className={styles.mainContent}>
                <div className={styles.heroSection}>
                    <div className={styles.heroIcon} style={{ background: '#2D313A', color: '#fff' }}>
                        {sectionData.icon}
                    </div>
                    <div className={styles.heroText}>
                        <h1 className={styles.nodeTitle}>{sectionData.title}</h1>
                    </div>
                </div>
                <div className={styles.contentArea}>
                    <div className={styles.prose}>
                        {sectionData.content}
                    </div>
                </div>
            </div>
        );
    };

    const renderNodeDetail = () => {
        if (!selectedNode) return null;
        const color = getColor(selectedNode.type);
        const cat = CATS[selectedNode.type];

        return (
            <div className={styles.mainContent}>
                {/* Node Hero */}
                <div className={styles.heroSection}>
                    <div
                        id="hero-badge"
                        className={styles.heroIcon}
                        style={{
                            background: `${color}20`,
                            color: color,
                            boxShadow: `0 0 20px ${color}20`
                        }}
                    >
                        <span style={{ fontSize: 22 }}>{getIcon(selectedNode.type)}</span>
                    </div>
                    <div className={styles.heroText}>
                        <h1 id="hero-title" className={styles.nodeTitle}>{selectedNode.title}</h1>
                        <p id="hero-summary" className={styles.nodeSummary}>{selectedNode.summary}</p>
                        <div id="hero-tags" className={styles.tagsContainer}>
                            <span className={styles.heroTag} style={{ color: color, borderColor: `${color}40` }}>
                                {cat.label}
                            </span>
                            {selectedNode.tags?.slice(0, 5).map(t => (
                                <span key={t} className={styles.heroTag}>#{t}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabsContainer}>
                    <button className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('overview')}>
                        Genel Bakış
                    </button>
                    <button className={`${styles.tabBtn} ${activeTab === 'params' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('params')}>
                        Parametreler ({selectedNode.params.length})
                    </button>
                    <button className={`${styles.tabBtn} ${activeTab === 'output' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('output')}>
                        Çıktı & Sonuç
                    </button>
                    <button className={`${styles.tabBtn} ${activeTab === 'examples' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('examples')}>
                        Örnekler ({selectedNode.examples.length})
                    </button>
                    <button className={`${styles.tabBtn} ${activeTab === 'usecases' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('usecases')}>
                        Senaryolar ({selectedNode.usecases.length})
                    </button>
                </div>

                {/* Tab Content */}
                <div className={styles.contentArea}>
                    {activeTab === 'overview' && (
                        <div className={styles.prose}>
                            {selectedNode.overview.map((item: any, idx) => (
                                <div key={idx}>
                                    {item.type === 'section' && (
                                        <>
                                            <h3>{item.title}</h3>
                                            <p dangerouslySetInnerHTML={{ __html: item.body }} />
                                            <hr className={styles.divider} />
                                        </>
                                    )}
                                    {item.type === 'tip' && (
                                        <div className={`${styles.alert} ${styles.alertTip}`}>
                                            <strong>💡 İpucu:</strong> <span dangerouslySetInnerHTML={{ __html: item.body }} />
                                        </div>
                                    )}
                                    {item.type === 'warn' && (
                                        <div className={`${styles.alert} ${styles.alertWarn}`}>
                                            <strong>⚠️ Dikkat:</strong> <span dangerouslySetInnerHTML={{ __html: item.body }} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'params' && (
                        <>
                            {selectedNode.params.length === 0 ? (
                                <div className={styles.emptyMessage}>Bu düğüm için ayar gerekmiyor.</div>
                            ) : (
                                <div className={styles.paramsTableWrapper}>
                                    <table className={styles.paramsTable}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '25%' }}>Parametre</th>
                                                <th style={{ width: '15%' }}>Tip</th>
                                                <th>Açıklama</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedNode.params.map((p: any) => (
                                                <tr key={p.name}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, color: '#fff' }}>{p.name}</div>
                                                        {p.required ? <span className={styles.requiredBadge}>Zorunlu</span> : <span className={styles.optionalBadge}>Opsiyonel</span>}
                                                    </td>
                                                    <td><span className={styles.tag}>{p.type}</span></td>
                                                    <td className={styles.descCell}>
                                                        {p.desc}
                                                        {p.default && (
                                                            <div className={styles.defaultVal}>
                                                                Varsayılan: <code>{p.default}</code>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'output' && (
                        <div className={styles.prose}>
                            <h3>Çıktı Şeması (JSON)</h3>
                            <p dangerouslySetInnerHTML={{ __html: selectedNode.output.desc }} />
                            <pre className={styles.codeBlock}>
                                <code className="language-json">{selectedNode.output.schema}</code>
                            </pre>
                        </div>
                    )}

                    {activeTab === 'examples' && (
                        <div>
                            {selectedNode.examples.map((ex: any, idx) => (
                                <div key={idx} className={styles.exampleCard}>
                                    <h4>{ex.title}</h4>
                                    <p style={{ color: '#9CA3AF', marginBottom: '1rem' }}>{ex.explanation}</p>
                                    <pre className={styles.codeBlock} style={{ borderLeft: `3px solid ${color}` }}>
                                        {ex.code}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'usecases' && (
                        <div>
                            {selectedNode.usecases.map((uc: any, idx) => (
                                <div key={idx} className={styles.exampleCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4>{uc.title}</h4>
                                        <span style={{ fontSize: '0.8rem', color: color, border: `1px solid ${color}`, padding: '2px 8px', borderRadius: 12 }}>Flow</span>
                                    </div>
                                    <p style={{ margin: '1rem 0', color: '#D1D5DB' }}>{uc.desc}</p>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {uc.flow.map((step: string, i: number) => (
                                            <React.Fragment key={i}>
                                                <div className={styles.flowStep}>{step}</div>
                                                {i < uc.flow.length - 1 && <span style={{ color: '#6B7280' }}>→</span>}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.pageContainer}>
            <Head>
                <title>BreviAI Documentation</title>
            </Head>

            {renderSidebar()}

            {currentSection === 'nodes' ? renderNodeDetail() : renderStaticSection()}

        </div>
    );
}