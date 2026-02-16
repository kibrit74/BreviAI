import styles from './docs.module.css';



export default function DocsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>BreviAI İş Akışı Rehberi</h1>
                <p className={styles.subtitle}>Otomasyon sistemini kullanarak iş akışları oluşturma, yönetme ve hata ayıklama kılavuzu (Ansiklopedi Sürümü).</p>
            </header>

            <nav className={styles.toc}>
                <h3 className={styles.tocTitle}>İçindekiler</h3>
                <ul className={styles.tocList}>
                    <li className={styles.tocItem}><a href="#temel-kavramlar" className={styles.tocLink}>1. Temel Kavramlar</a></li>
                    <li className={styles.tocItem}><a href="#arayuz-tanitimi" className={styles.tocLink}>2. Arayüz Tanıtımı</a></li>
                    <li className={styles.tocItem}><a href="#dugum-referansi" className={styles.tocLink}>3. Düğüm Referansı (Ansiklopedi)</a></li>
                    <li className={styles.tocItem}><a href="#backend-altyapi" className={styles.tocLink}>4. Backend & Altyapı</a></li>
                    <li className={styles.tocItem}><a href="#ornek-senaryolar" className={styles.tocLink}>5. Örnek Senaryolar (Cookbook)</a></li>
                </ul>
            </nav>

            <section id="temel-kavramlar" className={styles.section}>
                <h2 className={styles.sectionTitle}>1. Temel Kavramlar</h2>
                <div className={styles.content}>
                    <h3>İş Akışı (Workflow) Nedir?</h3>
                    <p>Bir iş akışı, belirli bir görevi yerine getirmek için birbirine bağlanmış <strong>Düğümler (Nodes)</strong> koleksiyonudur. Her iş akışı bir <strong>Tetikleyici (Trigger)</strong> ile başlar ve ardından gelen düğümler sırayla çalışır.</p>

                    <h3>Veri Akışı ve JSON</h3>
                    <p>Düğümler arası veri alışverişi JSON formatında olur. Örnek veri:</p>
                    <pre className={styles.pre}>
                        <code className={styles.code}>
                            {`[
  {
    "id": 1,
    "name": "Örnek Müşteri",
    "email": "ornek@breviai.com"
  }
]`}
                        </code>
                    </pre>

                    <h3>İfadeler (Expressions)</h3>
                    <p>Önceki düğümlerden gelen verileri dinamik olarak kullanabilirsiniz.</p>
                    <ul>
                        <li><strong>Doğrudan Değişken:</strong> <code className={styles.code}>{'{{degiskenAdi}}'}</code></li>
                        <li><strong>JSON Yolu:</strong> <code className={styles.code}>{'{{degiskenAdi.altAlan.deger}}'}</code></li>
                    </ul>
                </div>
            </section>

            <section id="arayuz-tanitimi" className={styles.section}>
                <h2 className={styles.sectionTitle}>2. Arayüz Tanıtımı</h2>
                <div className={styles.mockupContainer}>
                    <div className={styles.connector}></div>
                    <div className={styles.workflowRow}>
                        <div className={styles.nodeCard}>
                            <div className={styles.nodeHeader}>
                                <div className={`${styles.nodeIcon} ${styles.iconTrigger}`}>⚡</div>
                                <div className={styles.nodeTitle}>Manual Trigger</div>
                            </div>
                            <div className={styles.nodeBody}>
                                <div className={styles.nodeLabel}>TRIGGER</div>
                                <div className={styles.nodeValue}>On Click</div>
                            </div>
                        </div>
                        <div className={styles.nodeCard}>
                            <div className={styles.nodeHeader}>
                                <div className={`${styles.nodeIcon} ${styles.iconAction}`}>🔄</div>
                                <div className={styles.nodeTitle}>Process Data</div>
                            </div>
                            <div className={styles.nodeBody}>
                                <div className={styles.nodeLabel}>ACTION</div>
                                <div className={styles.nodeValue}>Transform JSON</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="dugum-referansi" className={styles.section}>
                <h2 className={styles.sectionTitle}>3. Düğüm Referansı (Ansiklopedi)</h2>

                <div className={styles.content}>
                    <h3>⚡ Tetikleyiciler (Triggers)</h3>

                    <h4>1. Manual Trigger</h4>
                    <p>Kullanıcının butona basarak akışı başlatması. Gelişmiş form parametrelerini destekler.</p>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Parametre Tipi</th>
                                    <th className={styles.th}>Açıklama</th>
                                    <th className={styles.th}>Örnek Kullanım</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}>String</td><td className={styles.td}>Kısa yazı girişi.</td><td className={styles.td}>"Müşteri Adı"</td></tr>
                                <tr className={styles.tr}><td className={styles.td}>Number</td><td className={styles.td}>Sayı girişi.</td><td className={styles.td}>"Fiyat Limiti"</td></tr>
                                <tr className={styles.tr}><td className={styles.td}>Boolean</td><td className={styles.td}>Aç/Kapa anahtarı.</td><td className={styles.td}>"PDF İndir?"</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h4>2. Time Trigger (Cron)</h4>
                    <p>Zamanlanmış görevler. Backend servisi (node-cron) gerektirir.</p>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>İfade</th>
                                    <th className={styles.th}>Açıklama</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}><code className={styles.code}>* * * * *</code></td><td className={styles.td}>Her Dakika</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><code className={styles.code}>*/5 * * * *</code></td><td className={styles.td}>5 Dakikada Bir</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><code className={styles.code}>0 9 * * *</code></td><td className={styles.td}>Her Gün 09:00</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h4>3. Notification Trigger</h4>
                    <p>Bildirimleri (SMS, WhatsApp, Banka) yakalar.</p>
                    <div className={styles.blockQuote}>
                        <p><strong>Önemli:</strong> Telefonun "Bildirim Erişimi" izni verilmelidir.</p>
                    </div>

                    <hr style={{ borderColor: '#2D2D44', margin: '2rem 0' }} />

                    <h3>🛠 Eylemler (Actions)</h3>

                    <h4>1. HTTP Request</h4>
                    <p>Herhangi bir API'ye bağlanmanızı sağlar.</p>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Parametre</th>
                                    <th className={styles.th}>Açıklama</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}>Method</td><td className={styles.td}>GET, POST, PUT, DELETE</td></tr>
                                <tr className={styles.tr}><td className={styles.td}>URL</td><td className={styles.td}>API Adresi (https://...)</td></tr>
                                <tr className={styles.tr}><td className={styles.td}>Headers</td><td className={styles.td}>JSON (Auth, Content-Type)</td></tr>
                                <tr className={styles.tr}><td className={styles.td}>Body</td><td className={styles.td}>JSON (Veri paketi)</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h4>🚦 HTTP Durum Kodları</h4>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Kod</th>
                                    <th className={styles.th}>Anlamı</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}><strong>200</strong></td><td className={styles.td}>Başarılı (OK)</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><strong>401</strong></td><td className={styles.td}>Yetkisiz (Unauthorized)</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><strong>404</strong></td><td className={styles.td}>Bulunamadı (Not Found)</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><strong>500</strong></td><td className={styles.td}>Sunucu Hatası</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h4>2. Google Sheets</h4>
                    <p>E-Tabloları okuyun ve yazın. Service Account kurulumu gerektirir.</p>
                    <ul>
                        <li><strong>Action:</strong> Read / Write</li>
                        <li><strong>Spreadsheet ID:</strong> URL'deki uzun kod.</li>
                        <li><strong>Range:</strong> Örn: <code>Sayfa1!A1:C5</code></li>
                    </ul>

                    <h4>3. Code Execution (Javascript)</h4>
                    <p>Özel mantık kurmak için kullanılır. <code>input</code> ve <code>variables</code> nesnelerine erişir.</p>
                    <div className={styles.blockQuoteWarning}>
                        <strong>Kural:</strong> Mutlaka <code>{`return { ... }`}</code> ile bir JSON nesnesi döndürmelisiniz.
                    </div>
                </div>
            </section>

            <section id="ornek-senaryolar" className={styles.section}>
                <h2 className={styles.sectionTitle}>5. Örnek Senaryolar (Cookbook V2)</h2>

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
const fiyat = html.match(/price">([0-9]+)/)[1];
return { fiyat: parseInt(fiyat) };`}
                            </code>
                        </pre>
                    </div>
                </div>
            </section>
        </div>
    );
}
