import '../app/globals.css';
import styles from './docs.module.css';

export default function DocsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>BreviAI Otomasyon Ansiklopedisi (V3)</h1>
                <p className={styles.subtitle}>En kapsamlı, en detaylı ve nihai başvuru kaynağı. Tüm teknik detaylar buradadır.</p>
            </header>

            <nav className={styles.toc}>
                <h3 className={styles.tocTitle}>İÇİNDEKİLER</h3>
                <ul className={styles.tocList}>
                    <li className={styles.tocItem}><a href="#bolum-1" className={styles.tocLink}>1. Sistem Mimarisi ve Veri Akışı</a></li>
                    <li className={styles.tocItem}><a href="#bolum-2" className={styles.tocLink}>2. Değişkenler ve İfadeler (Expressions)</a></li>
                    <li className={styles.tocItem}><a href="#bolum-3" className={styles.tocLink}>3. Düğüm Referansı: Tetikleyiciler</a></li>
                    <li className={styles.tocItem}><a href="#bolum-4" className={styles.tocLink}>4. Düğüm Referansı: Eylemler (Actions)</a></li>
                    <li className={styles.tocItem}><a href="#bolum-5" className={styles.tocLink}>5. Düğüm Referansı: Mantık (Logic)</a></li>
                    <li className={styles.tocItem}><a href="#bolum-6" className={styles.tocLink}>6. Düğüm Referansı: Yapay Zeka (AI)</a></li>
                    <li className={styles.tocItem}><a href="#bolum-7" className={styles.tocLink}>7. Sorun Giderme ve Hata Kodları</a></li>
                </ul>
            </nav>

            {/* BÖLÜM 1 */}
            <section id="bolum-1" className={styles.section}>
                <h2 className={styles.sectionTitle}>1. Sistem Mimarisi ve Veri Akışı</h2>
                <div className={styles.content}>
                    <p>BreviAI, düğüm tabanlı (node-based) bir otomasyon motorudur. Her düğüm bir "girdi" (input) alır, işlem yapar ve bir "çıktı" (output) üretir.</p>

                    <h4>JSON Veri Yapısı</h4>
                    <p>Sistemdeki tüm veriler JSON formatında taşınır. Bir düğümün çıktısı, kendisinden sonra gelen tüm düğümler tarafından okunabilir.</p>
                    <pre className={styles.pre}>
                        <code className={styles.code}>
                            {`[
  {
    "status": "success",
    "data": {
      "id": 101,
      "message": "İşlem başarılı",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  }
]`}
                        </code>
                    </pre>
                    <div className={styles.blockQuote}>
                        <strong>İpucu:</strong> Düğümler her zaman bir <strong>Dizi (Array)</strong> döndürür. Eğer tek bir nesne dönse bile, bu nesne <code>[{...}]</code> şeklinde bir dizinin ilk elemanıdır.
                    </div>
                </div>
            </section>

            {/* BÖLÜM 2 */}
            <section id="bolum-2" className={styles.section}>
                <h2 className={styles.sectionTitle}>2. Değişkenler ve İfadeler</h2>
                <div className={styles.content}>
                    <p>Herhangi bir metin alanına çift süslü parantez <code>{'{{...}}'}</code> yazarak dinamik verileri kullanabilirsiniz.</p>

                    <h4>Sistem Değişkenleri</h4>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Değişken</th>
                                    <th className={styles.th}>Veri Tipi</th>
                                    <th className={styles.th}>Açıklama</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}><code>{'{{$json}}'}</code></td><td className={styles.td}>Object</td><td className={styles.td}>O anki işlenen verinin tamamı.</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><code>{'{{$json.fieldname}}'}</code></td><td className={styles.td}>Any</td><td className={styles.td}>Belirli bir alanı okur (Örn: <code>email</code>).</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><code>{'{{$now}}'}</code></td><td className={styles.td}>String</td><td className={styles.td}>Geçerli zaman (ISO 8601 formatı).</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><code>{'{{$node["Node İsmi"].json}}'}</code></td><td className={styles.td}>Object</td><td className={styles.td}>Başka bir düğümün çıktısına erişir.</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h4>JavaScript Fonksiyonları</h4>
                    <p>Expression içinde basit JS kodları çalıştırabilirsiniz:</p>
                    <ul>
                        <li><code>{'{{$json.ad.toUpperCase()}}'}</code> &rarr; "AHMET"</li>
                        <li><code>{'{{$json.fiyat * 1.20}}'}</code> &rarr; KDV Dahil Fiyat</li>
                        <li><code>{'{{$json.liste.length}}'}</code> &rarr; Liste eleman sayısı</li>
                    </ul>
                </div>
            </section>

            {/* BÖLÜM 3 */}
            <section id="bolum-3" className={styles.section}>
                <h2 className={styles.sectionTitle}>3. Düğüm Referansı: Tetikleyiciler</h2>
                <div className={styles.content}>

                    <h3>📌 Cron Trigger (Zamanlayıcı)</h3>
                    <p>Akışı belirli zaman aralıklarında veya belirli saatlerde otomatik başlatır.</p>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Parametre</th>
                                    <th className={styles.th}>Örnekler</th>
                                    <th className={styles.th}>Detay</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}><strong>Interval</strong></td><td className={styles.td}><code>30s</code>, <code>5m</code>, <code>1h</code></td><td className={styles.td}>Saniye (s), Dakika (m), Saat (h) cinsinden tekrar sıklığı.</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><strong>Cron Expression</strong></td><td className={styles.td}><code>0 9 * * 1-5</code></td><td className={styles.td}>Hafta içi her gün saat 09:00'da.</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>📌 Webhook Trigger</h3>
                    <p>Dış sistemlerden (Zapier, Postman, Custom Code) veri almak için kullanılır.</p>
                    <ul>
                        <li><strong>Method:</strong> GET veya POST.</li>
                        <li><strong>Test URL:</strong> <code>https://api.breviai.com/webhook/test/UUID</code></li>
                        <li><strong>Prod URL:</strong> <code>https://api.breviai.com/webhook/UUID</code></li>
                    </ul>
                    <div className={styles.blockQuoteWarning}>
                        <strong>Güvenlik Uyarısı:</strong> Webhook URL'sini gizli tutun. Herhangi biri bu URL'ye istek atarak akışınızı tetikleyebilir.
                    </div>

                </div>
            </section>

            {/* BÖLÜM 4 */}
            <section id="bolum-4" className={styles.section}>
                <h2 className={styles.sectionTitle}>4. Düğüm Referansı: Eylemler (Actions)</h2>
                <div className={styles.content}>

                    <h3>🌐 HTTP Request</h3>
                    <p>Rest API çağrıları yapar. Tüm internet işlemlerinin kalbidir.</p>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Ayar</th>
                                    <th className={styles.th}>Açıklama</th>
                                    <th className={styles.th}>Örnek</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}><strong>Authentication</strong></td><td className={styles.td}>API Key veya Bearer Token.</td><td className={styles.td}>Header: <code>Authorization: Bearer xyz...</code></td></tr>
                                <tr className={styles.tr}><td className={styles.td}><strong>Body Content Type</strong></td><td className={styles.td}>Gönderilen verinin formatı.</td><td className={styles.td}>JSON, Form-UrlEncoded, Multipart-Form (Dosya).</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><strong>Timeout</strong></td><td className={styles.td}>Maksimum bekleme süresi.</td><td className={styles.td}>Varsayılan: 30000ms (30 saniye).</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h3>📊 Google Sheets</h3>
                    <p>E-Tablo okuma ve yazma. Servis hesabı (Service Account) gerektirebilir.</p>
                    <ul>
                        <li><strong>Read:</strong> Veriyi okur ve JSON dizisine çevirir. İlk satırı başlık (Header) olarak kabul eder.</li>
                        <li><strong>Append:</strong> En son dolu satırın altına ekleme yapar.</li>
                        <li><strong>Clear:</strong> Belirtilen aralığı temizler.</li>
                    </ul>

                    <h3>📱 App Launch (Uygulama Başlat)</h3>
                    <p>Android cihazınızdaki yüklü uygulamaları açar.</p>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Uygulama</th>
                                    <th className={styles.th}>Paket İsmi (Package Name)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}>Instagram</td><td className={styles.td}><code>com.instagram.android</code></td></tr>
                                <tr className={styles.tr}><td className={styles.td}>WhatsApp</td><td className={styles.td}><code>com.whatsapp</code></td></tr>
                                <tr className={styles.tr}><td className={styles.td}>Twitter (X)</td><td className={styles.td}><code>com.twitter.android</code></td></tr>
                                <tr className={styles.tr}><td className={styles.td}>Spotify</td><td className={styles.td}><code>com.spotify.music</code></td></tr>
                                <tr className={styles.tr}><td className={styles.td}>YouTube</td><td className={styles.td}><code>com.google.android.youtube</code></td></tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </section>

            {/* BÖLÜM 5 */}
            <section id="bolum-5" className={styles.section}>
                <h2 className={styles.sectionTitle}>5. Düğüm Referansı: Mantık (Logic)</h2>
                <div className={styles.content}>
                    <h3>🔀 IF (Koşul)</h3>
                    <p>Verilen koşula göre veriyi "True" veya "False" yoluna saptırır.</p>
                    <p><strong>Desteklenen Operatörler:</strong></p>
                    <ul>
                        <li><code>Equal</code> (Eşittir): Sayısal veya metinsel eşitlik.</li>
                        <li><code>Contain</code> (İçerir): "Merhaba Dünya" içinde "Merhaba" var mı?</li>
                        <li><code>Regex</code> (Düzenli İfade): Karmaşık desen eşleştirme (Örn: E-posta formatı).</li>
                        <li><code>Is Empty</code> (Boş Mu): Değerin null veya "" olup olmadığını kontrol eder.</li>
                    </ul>

                    <h3>🔄 Loop (Döngü)</h3>
                    <p>Eleman listesi üzerinde döner. "Split in Batches" mantığıyla çalışır.</p>
                    <div className={styles.blockQuote}>
                        <strong>Önemli:</strong> Döngü bittiğinde akışın devam etmesi için, Loop düğümünün "Done" çıkışını bir sonraki adıma bağlamayı unutmayın.
                    </div>
                </div>
            </section>

            {/* BÖLÜM 6 */}
            <section id="bolum-6" className={styles.section}>
                <h2 className={styles.sectionTitle}>6. Düğüm Referansı: Yapay Zeka (AI)</h2>
                <div className={styles.content}>
                    <h3>🤖 AI Agent</h3>
                    <p>Doğal dil işleme motoru. Metinleri özetler, çevirir veya analiz eder.</p>
                    <ul>
                        <li><strong>System Prompt:</strong> Yapay zekanın rolünü belirler. (Örn: "Sen yardımsever bir asistansın").</li>
                        <li><strong>User Message:</strong> İşlenecek veri. Genelde <code>{'{{$json.text}}'}</code> şeklinde gelir.</li>
                        <li><strong>Temperature:</strong> Yaratıcılık seviyesi. 0 (Robotik) - 1 (Yaratıcı).</li>
                    </ul>

                    <h3>🎨 Image Generator</h3>
                    <p>DALL-E 3 veya Stable Diffusion kullanarak görsel üretir.</p>
                    <p><strong>Çıktı Formatı:</strong> Genelde bir resim URL'si döner. Bu URL'yi <code>HTTP Request</code> ile indirebilir veya <code>WhatsApp</code> ile paylaşabilirsiniz.</p>
                </div>
            </section>

            {/* BÖLÜM 7 */}
            <section id="bolum-7" className={styles.section}>
                <h2 className={styles.sectionTitle}>7. Sorun Giderme ve Hata Kodları</h2>
                <div className={styles.content}>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Hata Kodu</th>
                                    <th className={styles.th}>Anlamı</th>
                                    <th className={styles.th}>Çözüm</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className={styles.tr}><td className={styles.td}><code>ECONNREFUSED</code></td><td className={styles.td}>Bağlantı Reddedildi</td><td className={styles.td}>Hedef sunucu kapalı veya URL yanlış. Port numarasını kontrol edin.</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><code>401 Unauthorized</code></td><td className={styles.td}>Yetkisiz Erişim</td><td className={styles.td}>API Key yanlış veya süresi dolmuş. Headers kısmını kontrol edin.</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><code>404 Not Found</code></td><td className={styles.td}>Bulunamadı</td><td className={styles.td}>İstek yapılan URL veya Kaynak (Resource) mevcut değil.</td></tr>
                                <tr className={styles.tr}><td className={styles.td}><code>JSON Parse Error</code></td><td className={styles.td}>Veri Hatası</td><td className={styles.td}>Gelen veri geçerli bir JSON değil. "Expression" yazımını kontrol edin (tırnak işaretleri vb).</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

        </div>
    );
}
