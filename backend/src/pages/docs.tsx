import '../app/globals.css';
import styles from './docs.module.css';

export default function DocsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>BreviAI İş Akışı (Workflow) Ansiklopedisi</h1>
                <p className={styles.subtitle}>Tüm düğümler, parametreler ve senaryolar için en kapsamlı referans kaynağı.</p>
            </header>

            <nav className={styles.toc}>
                <h3 className={styles.tocTitle}>İçindekiler</h3>
                <ul className={styles.tocList}>
                    <li className={styles.tocItem}><a href="#temel-kavramlar" className={styles.tocLink}>1. Temel Kavramlar</a></li>
                    <li className={styles.tocItem}><a href="#tetikleyiciler" className={styles.tocLink}>2. Tetikleyiciler (Triggers)</a></li>
                    <li className={styles.tocItem}><a href="#eylemler" className={styles.tocLink}>3. Eylemler (Actions)</a></li>
                    <li className={styles.tocItem}><a href="#mantik" className={styles.tocLink}>4. Mantık ve Kontrol (Logic)</a></li>
                    <li className={styles.tocItem}><a href="#yapay-zeka" className={styles.tocLink}>5. Yapay Zeka (AI)</a></li>
                    <li className={styles.tocItem}><a href="#uygulama-entegrasyonlari" className={styles.tocLink}>6. Uygulama Entegrasyonları</a></li>
                    <li className={styles.tocItem}><a href="#ornek-senaryolar" className={styles.tocLink}>7. Örnek Senaryolar (Cookbook)</a></li>
                </ul>
            </nav>

            <section id="temel-kavramlar" className={styles.section}>
                <h2 className={styles.sectionTitle}>1. Temel Kavramlar</h2>
                <div className={styles.content}>
                    <h3>İş Akışı (Workflow) Mimarisi</h3>
                    <p>Bir iş akışı, belirli bir görevi otomatize etmek için tasarlanmış bir algoritmadır. Düğümler (Nodes) birbirine bağlanarak bir veri işleme hattı (pipeline) oluşturur.</p>

                    <h3>Veri Yapısı (JSON)</h3>
                    <p>Her düğüm bir JSON nesnesi alır ve bir JSON nesnesi üretir. Bu yapı sayesinde veriler akış boyunca taşınır.</p>
                    <pre className={styles.pre}>
                        <code className={styles.code}>
                            {`// Örnek Node Çıktısı
{
  "status": "success",
  "data": {
    "price": 1500,
    "currency": "USD",
    "timestamp": "2024-05-20T10:00:00Z"
  }
}`}
                        </code>
                    </pre>

                    <h3>İfadeler (Expressions) Rehberi</h3>
                    <p>Dinamik veri kullanımı için çift süslü parantez <code>{'{{...}}'}</code> kullanılır.</p>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>İfade</th>
                                    <th className={styles.th}>Açıklama</th>
                                    <th className={styles.th}>Örnek Çıktı</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}><code className={styles.code}>{'{{$json.field}}'}</code></td><td className={styles.td}>Gelen veriden alan okur.</td><td className={styles.td}>"Ahmet"</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><code className={styles.code}>{'{{$now}}'}</code></td><td className={styles.td}>Şu anki tarih/saat (ISO).</td><td className={styles.td}>"2024-05-20..."</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><code className={styles.code}>{'{{$randomInt(1,100)}}'}</code></td><td className={styles.td}>Rastgele sayı (min, max).</td><td className={styles.td}>42</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><code className={styles.code}>{'{{input.http.data}}'}</code></td><td className={styles.td}>Önceki HTTP düğümünün verisi.</td><td className={styles.td}>{"{...}"}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section id="tetikleyiciler" className={styles.section}>
                <h2 className={styles.sectionTitle}>2. Tetikleyiciler (Triggers)</h2>
                <div className={styles.content}>
                    <p>Akışı başlatan olaylardır. Bir akışta sadece <strong>bir adet</strong> trigger aktif olabilir.</p>

                    <h4>Manual Trigger</h4>
                    <p>Kullanıcının butona basmasıyla çalışır. Test ve yarı-otomasyon için idealdir.</p>
                    <ul>
                        <li><strong>Parameters:</strong> Kullanıcıdan istenir (Form girişi).</li>
                        <li><strong>Response:</strong> Akış tamamlandığında kullanıcıya yanıt dönebilir.</li>
                    </ul>

                    <h4>Time Trigger (Cron)</h4>
                    <p>Zamanlanmış görevler. Arka planda çalışır.</p>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Mod</th>
                                    <th className={styles.th}>Değer</th>
                                    <th className={styles.th}>Açıklama</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}>Interval</td><td className={styles.td}><code>5m</code></td><td className={styles.td}>5 dakikada bir çalıştır.</td></tr>
                                <tr className={styles.tr}><td className={styles.td}>Cron</td><td className={styles.td}><code>0 9 * * 1</code></td><td className={styles.td}>Her Pazartesi saat 09:00'da.</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h4>Notification Trigger</h4>
                    <p>Telefona gelen bildirimleri yakalar (Android).</p>
                    <div className={styles.blockQuote}>
                        <strong>Filtreleme:</strong> Tüm bildirimleri almamak için <code>Application Name</code> (örn: com.whatsapp) veya <code>Title Filter</code> (Regex) kullanın.
                    </div>

                    <h4>Webhook Trigger</h4>
                    <p>Dış dünyadan (Zapier, IFTTT, GitHub) tetiklenmek için benzersiz bir URL sağlar.</p>
                    <ul>
                        <li><strong>Method:</strong> POST tercih edilir.</li>
                        <li><strong>URL:</strong> <code>https://api.breviai.com/webhook/UUID</code></li>
                    </ul>
                </div>
            </section>

            <section id="eylemler" className={styles.section}>
                <h2 className={styles.sectionTitle}>3. Eylemler (Actions)</h2>
                <div className={styles.content}>

                    <h4>HTTP Request (İnternet İstekleri)</h4>
                    <p>REST API entegrasyonu için temel yapı taşıdır.</p>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Parametre</th>
                                    <th className={styles.th}>Zorunlu?</th>
                                    <th className={styles.th}>Açıklama</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}>GET/POST</td><td className={styles.td}>Evet</td><td className={styles.td}>İstek tipi. Veri göndermek için POST kullanın.</td></tr>
                                <tr className={styles.tr}><td className={styles.td}>URL</td><td className={styles.td}>Evet</td><td className={styles.td}>Hedef adres. Query parametreleri eklenebilir.</td></tr>
                                <tr className={styles.tr}><td className={styles.td}>Headers</td><td className={styles.td}>Hayır</td><td className={styles.td}>Yetkilendirme (Authorization: Bearer token).</td></tr>
                                <tr className={styles.tr}><td className={styles.td}>Body</td><td className={styles.td}>Hayır</td><td className={styles.td}>JSON verisi (Sadece POST/PUT).</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h4>Google Sheets (E-Tablolar)</h4>
                    <p>Veri okuma ve yazma işlemleri.</p>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>İşlem</th>
                                    <th className={styles.th}>Parametreler</th>
                                    <th className={styles.th}>Kullanım</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}><strong>Read</strong></td><td className={styles.td}>Spreadsheet ID, Range</td><td className={styles.td}>Belirtilen hücre aralığını (A1:B10) JSON dizisi olarak okur.</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><strong>Append</strong></td><td className={styles.td}>Spreadsheet ID, Values</td><td className={styles.td}>En alt satıra yeni veri ekler. Values bir dizi olmalıdır: <code>["Ad", "Soyad"]</code>.</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><strong>Update</strong></td><td className={styles.td}>Spreadsheet ID, Range, Values</td><td className={styles.td}>Belirli bir hücreyi değiştirir.</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h4>Code Execution (Javascript)</h4>
                    <p>Karmaşık veri dönüşümleri ve matematiksel işlemler için güvenli kum havuzu (sandbox).</p>
                    <pre className={styles.pre}>
                        <code className={styles.code}>
                            {`// Örnek: Tarih formatlama
const date = new Date();
const formatted = date.toLocaleDateString('tr-TR');
return { tarih: formatted, ham_veri: input.data };`}
                        </code>
                    </pre>

                </div>
            </section>

            <section id="mantik" className={styles.section}>
                <h2 className={styles.sectionTitle}>4. Mantık ve Kontrol (Logic)</h2>
                <div className={styles.content}>
                    <p>Akışın yönünü değiştiren düğümlerdir.</p>

                    <h4>IF (Koşul)</h4>
                    <p>Veriyi kontrol eder ve akışı <strong>True</strong> veya <strong>False</strong> koluna yönlendirir.</p>
                    <ul>
                        <li><strong>Condition:</strong> Karşılaştırma ifadesi. (Örn: <code>{'{{price}} > 100'}</code>)</li>
                        <li><strong>Operator:</strong> Tümü, Herhangi biri.</li>
                    </ul>

                    <h4>Switch (Çoklu Seçim)</h4>
                    <p>Veriyi birden fazla yola ayırır.</p>
                    <div className={styles.blockQuote}>
                        Örnek: Gelen e-postanın konusuna göre ("Fatura", "Destek", "Sipariş") 3 farklı kola ayırabilirsiniz. Her <code>Case</code> için bir çıktı portu oluşturulur.
                    </div>

                    <h4>Loop (Döngü)</h4>
                    <p>Bir liste (Array) üzerindeki her öğe için işlemleri tekrarlar.</p>
                    <ul>
                        <li><strong>Input:</strong> Bir JSON dizisi olmalıdır.</li>
                        <li><strong>Batch Size:</strong> Aynı anda kaç öğe işleneceği (Genelde 1).</li>
                    </ul>
                </div>
            </section>

            <section id="yapay-zeka" className={styles.section}>
                <h2 className={styles.sectionTitle}>5. Yapay Zeka (AI)</h2>
                <div className={styles.content}>
                    <h4>AI Agent (LLM)</h4>
                    <p>OpenAI (GPT-4) veya Google Gemini modelleri ile metin işleme.</p>
                    <ul>
                        <li><strong>Prompt:</strong> Yapay zekaya talimat verin. Değişken kullanabilirsiniz.</li>
                        <li><strong>Model:</strong> <code>gpt-4o</code>, <code>gemini-pro</code> vb.</li>
                    </ul>

                    <h4>Image Generator</h4>
                    <p>Metinden görsel oluşturma (DALL-E 3, Stable Diffusion).</p>
                    <ul>
                        <li><strong>Prompt:</strong> Görselin tarifi. "A futuristic city in cyberpunk style..."</li>
                        <li><strong>Size:</strong> 1024x1024, 512x512.</li>
                    </ul>
                </div>
            </section>

            <section id="uygulama-entegrasyonlari" className={styles.section}>
                <h2 className={styles.sectionTitle}>6. Uygulama Entegrasyonları</h2>
                <div className={styles.content}>
                    <h4>App Launch</h4>
                    <p>Telefondaki yüklü bir uygulamayı açar.</p>
                    <ul>
                        <li><strong>Package Name:</strong> Uygulamanın Android paket adı (<code>com.instagram.android</code>).</li>
                        <li><strong>Activity:</strong> (Opsiyonel) Belirli bir ekranı açmak için.</li>
                    </ul>
                </div>
            </section>

            <section id="ornek-senaryolar" className={styles.section}>
                <h2 className={styles.sectionTitle}>7. Örnek Senaryolar (Cookbook)</h2>
                <div className={styles.content}>

                    <div className={styles.mockupContainer}>
                        <h4>🗞️ Senaryo 1: RSS Haber Özeti</h4>
                        <p>Haberleri çek &rarr; Yapay Zeka ile Özetle &rarr; WhatsApp'tan Gönder</p>
                    </div>

                    <div className={styles.mockupContainer}>
                        <h4>📊 Senaryo 2: Döviz & Excel</h4>
                        <p>Kur API çek &rarr; E-Tabloya Yaz &rarr; (Eğer &gt; 35) &rarr; Bildirim Gönder</p>
                    </div>

                    <div className={styles.mockupContainer}>
                        <h4>🎨 Senaryo 4: AI Görsel Üretimi</h4>
                        <p>Prompt Gir &rarr; Nanobana ile Görsel Üret &rarr; WhatsApp'tan Paylaş</p>
                    </div>

                    <div className={styles.mockupContainer}>
                        <h4>🕵️ Senaryo 5: Web Scraper (Masterclass)</h4>
                        <p>Rakip Siteyi Çek &rarr; Fiyatı Ayıkla (Regex/Cheerio) &rarr; Ucuzsa Mail At</p>
                        <pre className={styles.pre}>
                            <code className={styles.code}>
                                {`// Fiyat ayıklama örneği
const html = input.http.data;
const fiyatMatch = html.match(/price">([0-9]+)/);
const fiyat = fiyatMatch ? parseInt(fiyatMatch[1]) : 0;
return { rakipFiyat: fiyat };`}
                            </code>
                        </pre>
                    </div>
                </div>
            </section>
        </div>
    );
}
