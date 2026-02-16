import React from 'react';
import styles from './docs.module.css';

export default function DocsPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>BreviAI İş Akışı Rehberi</h1>
                <p className={styles.subtitle}>Otomasyon sistemini kullanarak iş akışları oluşturma, yönetme ve hata ayıklama kılavuzu.</p>
            </header>

            <nav className={styles.toc}>
                <h3 className={styles.tocTitle}>İçindekiler</h3>
                <ul className={styles.tocList}>
                    <li className={styles.tocItem}><a href="#temel-kavramlar" className={styles.tocLink}>1. Temel Kavramlar</a></li>
                    <li className={styles.tocItem}><a href="#arayuz-tanitimi" className={styles.tocLink}>2. Arayüz Tanıtımı</a></li>
                    <li className={styles.tocItem}><a href="#dugum-referansi" className={styles.tocLink}>3. Düğüm Referansı</a></li>
                    <li className={styles.tocItem}><a href="#backend-altyapi" className={styles.tocLink}>4. Backend & Altyapı</a></li>
                    <li className={styles.tocItem}><a href="#ornek-senaryolar" className={styles.tocLink}>5. Örnek Senaryolar</a></li>
                </ul>
            </nav>

            <section id="temel-kavramlar" className={styles.section}>
                <h2 className={styles.sectionTitle}>1. Temel Kavramlar</h2>
                <div className={styles.content}>
                    <h3>İş Akışı (Workflow) Nedir?</h3>
                    <p>Bir iş akışı, belirli bir görevi yerine getirmek için birbirine bağlanmış <strong>Düğümler (Nodes)</strong> koleksiyonudur.</p>

                    <h3>Düğümler (Nodes)</h3>
                    <ul>
                        <li><strong>Tetikleyiciler (Triggers):</strong> Akışı başlatan olaylardır (Örn: Cron, Webhook).</li>
                        <li><strong>Eylemler (Actions):</strong> Bir iş yapan düğümlerdir (Örn: HTTP Request, Send Email).</li>
                        <li><strong>Mantık (Logic):</strong> Akışın yönünü değiştiren düğümlerdir (Örn: IF, Switch).</li>
                    </ul>

                    <h3>İfadeler (Expressions)</h3>
                    <p>Önceki düğümlerden gelen verileri dinamik olarak kullanabilirsiniz. <code>{"{{variableName}}"}</code> sözdizimi ile çalışır.</p>
                </div>
            </section>

            <section id="arayuz-tanitimi" className={styles.section}>
                <h2 className={styles.sectionTitle}>2. Arayüz Tanıtımı</h2>
                <p className={styles.content}>Aşağıda temel bir iş akışının görsel temsili bulunmaktadır:</p>

                {/* Node Mockup: Basic Workflow */}
                <div className={styles.mockupContainer}>
                    <div className={styles.connector}></div>
                    <div className={styles.workflowRow}>

                        {/* Start Node */}
                        <div className={styles.nodeCard}>
                            <div className={styles.nodeHeader}>
                                <div className={`${styles.nodeIcon} ${styles.iconTrigger}`}>⚡</div>
                                <div className={styles.nodeTitle}>Start: Manual</div>
                            </div>
                            <div className={styles.nodeBody}>
                                <div className={styles.nodeLabel}>TRIGGER</div>
                                <div className={styles.nodeValue}>On Click</div>
                            </div>
                        </div>

                        {/* Action Node */}
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

                        {/* Logic Node */}
                        <div className={styles.nodeCard}>
                            <div className={styles.nodeHeader}>
                                <div className={`${styles.nodeIcon} ${styles.iconLogic}`}>❓</div>
                                <div className={styles.nodeTitle}>Decision (IF)</div>
                            </div>
                            <div className={styles.nodeBody}>
                                <div className={styles.nodeLabel}>CONDITION</div>
                                <div className={styles.nodeValue}>value &gt; 100</div>
                            </div>
                        </div>

                    </div>
                </div>
                <p className={styles.subtitle} style={{ textAlign: 'center' }}>Mobil uyguama arayüzündeki düğümlerin görsel temsili.</p>
            </section>

            <section id="dugum-referansi" className={styles.section}>
                <h2 className={styles.sectionTitle}>3. Düğüm Referansı</h2>

                <h3>⚡ Tetikleyiciler (Triggers)</h3>
                <p className={styles.content}>Akışı başlatan olaylardır. Manuel, zamanlanmış veya dış tetikleyiciler olabilir.</p>

                <h4>⏳ Time Trigger (Cron / Zamanlayıcı)</h4>
                <p>İş akışını belirli zamanlarda, periyodik olarak veya belirli tarihlerde otomatik başlatır.</p>
                <div className={styles.content}>
                    <h5>Sık Kullanılan Cron İfadeleri</h5>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', background: '#13131A', borderRadius: '8px', overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ background: '#2D2D44', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Açıklama</th>
                                <th style={{ padding: '10px' }}>Cron İfadesi</th>
                                <th style={{ padding: '10px' }}>Anlamı</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '10px' }}>Her Dakika</td><td style={{ padding: '10px', fontFamily: 'monospace', color: '#818CF8' }}>* * * * *</td><td style={{ padding: '10px' }}>Durmaksızın her dakika.</td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '10px' }}>Her Saat Başı</td><td style={{ padding: '10px', fontFamily: 'monospace', color: '#818CF8' }}>0 * * * *</td><td style={{ padding: '10px' }}>13:00, 14:00...</td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '10px' }}>Sabah 09:00</td><td style={{ padding: '10px', fontFamily: 'monospace', color: '#818CF8' }}>0 9 * * *</td><td style={{ padding: '10px' }}>Günde bir kez.</td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '10px' }}>Hafta İçi Sabah</td><td style={{ padding: '10px', fontFamily: 'monospace', color: '#818CF8' }}>0 9 * * 1-5</td><td style={{ padding: '10px' }}>Pzt-Cum 09:00'da.</td></tr>
                        </tbody>
                    </table>
                </div>

                <h4>📩 Notification Trigger (Bildirim Yakalayıcı)</h4>
                <p>Telefonunuza gelen bildirimleri (SMS, WhatsApp vb.) okur ve filtreler.</p>
                <div className={styles.content}>
                    <h5>🔍 Regex (Düzenli İfadeler) ile Filtreleme</h5>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ marginBottom: '10px', background: '#1E1E2E', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #3B82F6' }}>
                            <strong>Tam Eşleşme:</strong> <code>^Kod$</code> <br />
                            <span style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>Sadece "Kod" yazan mesajı yakalar.</span>
                        </li>
                        <li style={{ marginBottom: '10px', background: '#1E1E2E', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #10B981' }}>
                            <strong>İçeren:</strong> <code>(?i).*banka.*</code> <br />
                            <span style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>İçinde "banka" kelimesi geçerse yakalar.</span>
                        </li>
                        <li style={{ marginBottom: '10px', background: '#1E1E2E', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #F59E0B' }}>
                            <strong>Sayı Yakalama:</strong> <code>\d{"{6}"}</code> <br />
                            <span style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>6 haneli doğrulama kodlarını yakalar.</span>
                        </li>
                    </ul>
                </div>

                <h3>🛠 Eylemler</h3>
                <p className={styles.content}>HTTP İstekleri, Veritabanı işlemleri, Yapay Zeka (AI) servisleri.</p>

                {/* Node Mockup: HTTP Request Config */}
                <h3>Düğüm Ayarları (Örnek: HTTP Request)</h3>
                <div className={styles.mockupContainer} style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className={styles.panelMockup}>
                        <div className={styles.panelHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontWeight: 'bold' }}>
                                <span>⚙️</span> HTTP Request
                            </div>
                            <div style={{ color: '#EF4444', cursor: 'pointer' }}>✖</div>
                        </div>
                        <div className={styles.panelBody}>

                            <div className={styles.formGroup}>
                                <label className={styles.inputLabel}>URL</label>
                                <input type="text" className={styles.textInput} defaultValue="https://api.example.com/v1/update" />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.inputLabel}>Method</label>
                                <div className={styles.radioGroup}>
                                    <div className={styles.radioButton}>GET</div>
                                    <div className={`${styles.radioButton} ${styles.active}`}>POST</div>
                                    <div className={styles.radioButton}>PUT</div>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.inputLabel}>Body (JSON)</label>
                                <textarea className={styles.textInput} rows={3} defaultValue='{"data": "{{userInput}}", "status": "active"}'></textarea>
                            </div>

                            <div className={styles.btnGroup}>
                                <div className={`${styles.btn} ${styles.btnCancel}`}>İptal</div>
                                <div className={`${styles.btn} ${styles.btnSave}`}>Kaydet</div>
                            </div>

                        </div>
                    </div>
                </div>

                <div className={styles.content} style={{ marginTop: '2rem', marginBottom: '3rem' }}>
                    <h4>🚦 HTTP Durum Kodları Rehberi</h4>
                    <p>İsteğinizin sonucunu anlamak için bu kodları bilmek gerekir:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '10px' }}>
                        <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10B981' }}>200 OK</div>
                            <div style={{ fontSize: '0.8rem' }}>Başarılı İşlem</div>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3B82F6', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#3B82F6' }}>201 Created</div>
                            <div style={{ fontSize: '0.8rem' }}>Kayıt Başarılı</div>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #F59E0B', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#F59E0B' }}>401 Auth</div>
                            <div style={{ fontSize: '0.8rem' }}>Yetkisiz Giriş</div>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #EF4444', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#EF4444' }}>404 Not Found</div>
                            <div style={{ fontSize: '0.8rem' }}>Bulunamadı</div>
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #EF4444', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#EF4444' }}>500 Error</div>
                            <div style={{ fontSize: '0.8rem' }}>Sunucu Hatası</div>
                        </div>
                    </div>
                </div>

                <h3>📱 App Launch (Uygulama Başlat)</h3>
                <p className={styles.content}>İş akışınızın bir parçası olarak telefonunuzdaki herhangi bir uygulamayı otomatik olarak açar. Bu özellik, "Sabah Rutini" gibi otomasyonlarda çok kullanışlıdır.</p>

                <div className={styles.content}>
                    <h4>📦 Popüler Uygulama Paket Adları Listesi</h4>
                    <p>Aşağıdaki listeden sık kullanılan uygulamaların kodlarını kopyalayabilirsiniz:</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', marginBottom: '2rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #2D2D44', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem' }}>Uygulama</th>
                                <th style={{ padding: '0.75rem' }}>Paket Adı (Package Name)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '0.75rem' }}>WhatsApp</td><td style={{ padding: '0.75rem' }}><code>com.whatsapp</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '0.75rem' }}>Instagram</td><td style={{ padding: '0.75rem' }}><code>com.instagram.android</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '0.75rem' }}>YouTube</td><td style={{ padding: '0.75rem' }}><code>com.google.android.youtube</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '0.75rem' }}>Spotify</td><td style={{ padding: '0.75rem' }}><code>com.spotify.music</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '0.75rem' }}>Twitter (X)</td><td style={{ padding: '0.75rem' }}><code>com.twitter.android</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '0.75rem' }}>Google Maps</td><td style={{ padding: '0.75rem' }}><code>com.google.android.apps.maps</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '0.75rem' }}>Gmail</td><td style={{ padding: '0.75rem' }}><code>com.google.android.gm</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '0.75rem' }}>Netflix</td><td style={{ padding: '0.75rem' }}><code>com.netflix.mediaclient</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '0.75rem' }}>Telegram</td><td style={{ padding: '0.75rem' }}><code>org.telegram.messenger</code></td></tr>
                        </tbody>
                    </table>

                    <h4>❓ Listede Olmayan Bir Uygulamanın Adını Nasıl Bulurum?</h4>
                    <p>Eğer aradığınız uygulama yukarıdaki listede yoksa, şu yöntemlerle bulabilirsiniz:</p>

                    <div style={{ background: '#13131A', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #2D2D44' }}>
                        <h5 style={{ color: '#818CF8', marginBottom: '0.5rem' }}>Yöntem 1: Play Store URL'si (En Kolay)</h5>
                        <ol style={{ paddingLeft: '1.5rem' }}>
                            <li>Bilgisayarınızdan veya telefonunuzdan <a href="https://play.google.com" target="_blank" style={{ color: '#6366F1' }}>Google Play Store</a>'a girin.</li>
                            <li>Uygulamayı aratıp sayfasına gidin.</li>
                            <li>Adres çubuğundaki (URL) <code>id=</code> kısmından sonraki yazı paket adıdır.</li>
                        </ol>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#94A3B8' }}>
                            <em>Örnek URL:</em> <code>play.google.com/store/apps/details?id=<b>com.adobe.reader</b></code><br />
                            <em>Paket Adı:</em> <code>com.adobe.reader</code>
                        </p>
                    </div>

                    <div style={{ background: '#13131A', padding: '1.5rem', borderRadius: '8px', border: '1px solid #2D2D44' }}>
                        <h5 style={{ color: '#818CF8', marginBottom: '0.5rem' }}>Yöntem 2: "Package Name Viewer" Uygulaması</h5>
                        <ol style={{ paddingLeft: '1.5rem' }}>
                            <li>Play Store'dan "Package Name Viewer" adlı ücretsiz uygulamayı indirin.</li>
                            <li>Uygulamayı açtığınızda telefonunuzdaki tüm yüklü uygulamaların yanında paket adlarını göreceksiniz.</li>
                        </ol>
                    </div>
                </div>
            </section>

            <section id="google-sheets-rehberi" className={styles.section}>
                <h2 className={styles.sectionTitle}>📊 Google Sheets Entegrasyonu</h2>
                <div className={styles.content}>
                    <p>E-Tablolarınızı bir veritabanı gibi kullanın. Otomasyonlarınız doğrudan Google Sheets'e veri yazabilir veya okuyabilir.</p>

                    <h4>Kurulum Adımları (Çok Önemli)</h4>
                    <ol style={{ background: '#13131A', padding: '1.5rem 1.5rem 1.5rem 2.5rem', borderRadius: '8px', border: '1px solid #2D2D44', marginTop: '1rem' }}>
                        <li style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#818CF8' }}>1.</strong> <a href="https://console.cloud.google.com" target="_blank" style={{ color: '#6366F1' }}>Google Cloud Console</a>'dan bir <strong>Service Account</strong> oluşturun.
                        </li>
                        <li style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#818CF8' }}>2.</strong> İndirdiğiniz JSON dosyasındaki <code>client_email</code> adresini kopyalayın.
                        </li>
                        <li style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#818CF8' }}>3.</strong> İşlem yapmak istediğiniz Google E-Tablosunu açın.
                        </li>
                        <li style={{ marginBottom: '0.75rem' }}>
                            <strong style={{ color: '#818CF8' }}>4.</strong> "Paylaş" butonuna basıp, kopyaladığınız e-posta adresine <strong>Editör</strong> yetkisi verin.
                        </li>
                    </ol>

                    <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: '#13131A', borderRadius: '8px', border: '1px solid #2D2D44' }}>
                            <h5 style={{ color: '#10B981', marginBottom: '0.5rem' }}>Spreadsheet ID Nerede?</h5>
                            <p style={{ fontSize: '0.85rem' }}>Tablonun URL'sindeki <code>/d/</code> ile <code>/edit</code> arasındaki uzun kod.</p>
                        </div>
                        <div style={{ padding: '1rem', background: '#13131A', borderRadius: '8px', border: '1px solid #2D2D44' }}>
                            <h5 style={{ color: '#F59E0B', marginBottom: '0.5rem' }}>Range Formatı</h5>
                            <p style={{ fontSize: '0.85rem' }}><code>Sayfa1!A1:C10</code> — Sayfa adı, ünlem, hücre aralığı.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="if-else-rehberi" className={styles.section}>
                <h2 className={styles.sectionTitle}>🧠 IF/ELSE Operatör Tablosu</h2>
                <div className={styles.content}>
                    <p>Koşullu dallanmalarda kullanabileceğiniz tüm karşılaştırma operatörleri:</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', background: '#13131A', borderRadius: '8px', overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ background: '#2D2D44', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Operatör</th>
                                <th style={{ padding: '10px' }}>Anlamı</th>
                                <th style={{ padding: '10px' }}>Örnek</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '10px' }}><code>==</code></td><td style={{ padding: '10px' }}>Eşittir</td><td style={{ padding: '10px' }}><code>Durum == Başarılı</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '10px' }}><code>!=</code></td><td style={{ padding: '10px' }}>Eşit Değildir</td><td style={{ padding: '10px' }}><code>Hata != Yok</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '10px' }}><code>&gt;</code> / <code>&gt;=</code></td><td style={{ padding: '10px' }}>Büyüktür</td><td style={{ padding: '10px' }}><code>Fiyat &gt; 1000</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '10px' }}><code>&lt;</code> / <code>&lt;=</code></td><td style={{ padding: '10px' }}>Küçüktür</td><td style={{ padding: '10px' }}><code>Stok &lt; 5</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '10px' }}><code>contains</code></td><td style={{ padding: '10px' }}>İçerir</td><td style={{ padding: '10px' }}><code>Mesaj contains sipariş</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '10px' }}><code>startsWith</code></td><td style={{ padding: '10px' }}>İle Başlar</td><td style={{ padding: '10px' }}><code>Telefon startsWith +90</code></td></tr>
                            <tr style={{ borderBottom: '1px solid #2D2D44' }}><td style={{ padding: '10px' }}><code>endsWith</code></td><td style={{ padding: '10px' }}>İle Biter</td><td style={{ padding: '10px' }}><code>Dosya endsWith .pdf</code></td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section id="backend-altyapi" className={styles.section}>
                <h2 className={styles.sectionTitle}>4. Backend &amp; Altyapı</h2>
                <div className={styles.content}>
                    <p>Backend servisleri, uygulamanın beyni olarak çalışır. Zamanlanmış görevler ve ağır işlemler burada yönetilir.</p>

                    <h4>Sistem Mimarisi</h4>
                    <div className={styles.mockupContainer} style={{ background: 'none', border: 'none', padding: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                            <div className={styles.nodeCard} style={{ width: 'auto', textAlign: 'center' }}>📱 Mobil Uygulama</div>
                            <div style={{ height: '30px', width: '2px', background: '#6366F1' }}></div>
                            <div className={styles.nodeCard} style={{ width: 'auto', textAlign: 'center', borderColor: '#818CF8' }}>☁️ Backend Sunucusu (Node.js)</div>
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ height: '20px', width: '2px', background: '#6366F1' }}></div>
                                    <div className={styles.nodeCard} style={{ width: 'auto', fontSize: '0.9rem' }}>WhatsApp Web</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ height: '20px', width: '2px', background: '#6366F1' }}></div>
                                    <div className={styles.nodeCard} style={{ width: 'auto', fontSize: '0.9rem' }}>Cron Service</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h4 style={{ marginTop: '2rem' }}>WhatsApp Bağlantı Rehberi</h4>
                    <ol style={{ background: '#13131A', padding: '1.5rem 1.5rem 1.5rem 2.5rem', borderRadius: '8px', border: '1px solid #2D2D44' }}>
                        <li style={{ marginBottom: '0.5rem' }}>Backend sunucusunu başlatın (<code>npm run dev</code>).</li>
                        <li style={{ marginBottom: '0.5rem' }}><code>/whatsapp/qr</code> sayfasına gidin.</li>
                        <li style={{ marginBottom: '0.5rem' }}>WhatsApp &gt; Bağlı Cihazlar &gt; Cihaz Bağla ile QR kodu okutun.</li>
                        <li>Bağlantı başarılı olduktan sonra mesaj gönderebilirsiniz.</li>
                    </ol>

                    <div style={{ marginTop: '1rem', padding: '1rem', borderLeft: '4px solid #F59E0B', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '0 8px 8px 0' }}>
                        <strong>⚠️ Önemli:</strong> Numarayı uluslararası formatta yazın ama <code>+</code> koymayın (Örn: <code>905321234567</code>).
                    </div>
                </div>
            </section>

            <section id="ipuclari" className={styles.section}>
                <h2 className={styles.sectionTitle}>6. İpuçları ve En İyi Uygulamalar (Best Practices)</h2>
                <div className={styles.content}>
                    <p>Otomasyonlarınızı profesyonel, hatasız ve yönetilebilir hale getirmek için aşağıdaki uzman tavsiyelerini uygulayın.</p>

                    <div style={{ marginTop: '2rem' }}>
                        <h3 style={{ color: '#F8FAFC' }}>1. İsimlendirme Sanatı (Naming Convention)</h3>
                        <p><strong>Sorun:</strong> 50 düğümlük bir projede, 10 tane "HTTP Request" düğümü olursa, hangisinin ne yaptığını hatırlayamazsınız.</p>
                        <p><strong>Çözüm:</strong> Her düğüme, yaptığı işi anlatan bir fiil-nesne ismi verin.</p>
                        <div style={{ display: 'flex', gap: '2rem', margin: '1rem 0' }}>
                            <div style={{ flex: 1, padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '8px' }}>
                                <strong style={{ color: '#EF4444' }}>❌ Kötü İsimlendirme</strong>
                                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>HTTP Request -&gt; IF -&gt; Google Sheets</p>
                            </div>
                            <div style={{ flex: 1, padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', borderRadius: '8px' }}>
                                <strong style={{ color: '#10B981' }}>✅ Doğru İsimlendirme</strong>
                                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Kur Bilgisini Çek -&gt; Dolar Arttı mı? -&gt; Excel'e Yaz</p>
                            </div>
                        </div>
                        <p><em><strong>Neden Önemli?</strong> Bir ay sonra projeyi açtığınızda akışın ne yaptığını tek bakışta anlayabilmek için.</em></p>
                    </div>

                    <div style={{ marginTop: '3rem' }}>
                        <h3 style={{ color: '#F8FAFC' }}>2. Hata Yönetimi (Error Handling)</h3>
                        <p><strong>Sorun:</strong> Harici servisler (API'ler) her zaman çalışmayabilir. Otomasyonunuzun "sessizce" bozulmasını istemezsiniz.</p>
                        <p><strong>Çözüm:</strong> Kritik işlemlerden sonra mutlaka kontrol koyun.</p>
                        <ul style={{ background: '#13131A', padding: '1.5rem 1.5rem 1.5rem 2.5rem', borderRadius: '8px', border: '1px solid #2D2D44' }}>
                            <li><strong>Nasıl Yapılır?</strong> Kritik işlemden sonra bir <code>IF</code> düğümü ekleyin.</li>
                            <li><strong>Koşul:</strong> <code>{"{{$json.status}} == 200"}</code></li>
                            <li><strong>False Yolu:</strong> İşlem başarısızsa size bildirim gönderecek bir "Notification" düğümü bağlayın.</li>
                        </ul>
                    </div>

                    <div style={{ marginTop: '3rem' }}>
                        <h3 style={{ color: '#F8FAFC' }}>3. Parçala ve Yönet (Modular Design)</h3>
                        <p><strong>Sorun:</strong> Tek bir sayfada 100 düğümlük devasa bir "Her Şeyi Yapan Akış" tasarlamak.</p>
                        <p><strong>Çözüm:</strong> "Execute Workflow" düğümünü kullanarak alt akışlar oluşturun (Örn: "Haberleri Getir" modülü bozulursa, sadece o parçayı tamir edersiniz).</p>
                    </div>

                    <div style={{ marginTop: '3rem' }}>
                        <h3 style={{ color: '#F8FAFC' }}>4. Güvenlik ve Gizlilik (Credentials)</h3>
                        <p><strong>Sorun:</strong> API Anahtarlarını doğrudan düğümlerin içine yazmak.</p>
                        <p><strong>Risk:</strong> Akış dosyasını birine gönderirseniz şifreniz içinde gider.</p>
                        <p><strong>Çözüm:</strong> <strong>Ayarlar &gt; Credentials</strong> menüsünü kullanın. Şifreleriniz veritabanında şifreli (encrypted) saklanır.</p>
                    </div>
                </div>
            </section>

            <section id="ornek-senaryolar" className={styles.section}>
                <h2 className={styles.sectionTitle}>5. Örnek Senaryolar (Adım Adım)</h2>
                <div className={styles.content}>

                    {/* Scenario 1 */}
                    <div style={{ marginBottom: '3rem' }}>
                        <h3 style={{ color: '#818CF8' }}>🗞️ Senaryo 1: Her Sabah AI Haber Özeti</h3>
                        <p>Her gün sabah 08:00'de haber sitesinden son dakika haberlerini çekip, yapay zeka ile özetleyip WhatsApp'tan kendinize gönderen otomasyon.</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', margin: '1.5rem 0' }}>
                            <div style={{ padding: '8px 16px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid #6366F1', borderRadius: '20px', fontSize: '0.9rem' }}>⏰ Cron: <code>0 8 * * *</code></div>
                            <div style={{ color: '#6366F1' }}>→</div>
                            <div style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3B82F6', borderRadius: '20px', fontSize: '0.9rem' }}>🌐 HTTP: RSS Çek</div>
                            <div style={{ color: '#6366F1' }}>→</div>
                            <div style={{ padding: '8px 16px', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid #8B5CF6', borderRadius: '20px', fontSize: '0.9rem' }}>🤖 AI: Özetle</div>
                            <div style={{ color: '#6366F1' }}>→</div>
                            <div style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981', borderRadius: '20px', fontSize: '0.9rem' }}>💬 WhatsApp: Gönder</div>
                        </div>
                        <ol style={{ background: '#13131A', padding: '1.5rem 1.5rem 1.5rem 2.5rem', borderRadius: '8px', border: '1px solid #2D2D44' }}>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Cron Trigger:</strong> Schedule = <code>0 8 * * *</code> (Her gün 08:00).</li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>HTTP Request:</strong> URL = RSS feed adresi, Method = GET.</li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Code Execution:</strong> RSS XML'ini parse edip ilk 5 haberin başlıklarını ayıklayın.</li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>AI Agent:</strong> Prompt = &quot;Aşağıdaki haberleri 3 cümlelik Türkçe özet yap: {'{{haberler}}'}&quot;</li>
                            <li><strong>WhatsApp Send:</strong> To = <code>905XXXXXXXXX</code>, Message = {'{{aiOzet}}'}.</li>
                        </ol>
                    </div>

                    {/* Scenario 2 */}
                    <div style={{ marginBottom: '3rem' }}>
                        <h3 style={{ color: '#10B981' }}>📊 Senaryo 2: Döviz Kuru Takip + Excel Kayıt</h3>
                        <p>5 dakikada bir döviz kurunu kontrol edip Google Sheets'e yazan, kur belirli bir seviyeyi aşarsa bildirim gönderen otomasyon.</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', margin: '1.5rem 0' }}>
                            <div style={{ padding: '8px 16px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid #6366F1', borderRadius: '20px', fontSize: '0.9rem' }}>⏰ Cron: <code>*/5 * * * *</code></div>
                            <div style={{ color: '#6366F1' }}>→</div>
                            <div style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3B82F6', borderRadius: '20px', fontSize: '0.9rem' }}>🌐 HTTP: Kur API</div>
                            <div style={{ color: '#6366F1' }}>→</div>
                            <div style={{ padding: '8px 16px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #F59E0B', borderRadius: '20px', fontSize: '0.9rem' }}>❓ IF: Kur &gt; 35?</div>
                            <div style={{ color: '#6366F1' }}>→</div>
                            <div style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981', borderRadius: '20px', fontSize: '0.9rem' }}>📊 Sheets: Yaz</div>
                        </div>
                        <ol style={{ background: '#13131A', padding: '1.5rem 1.5rem 1.5rem 2.5rem', borderRadius: '8px', border: '1px solid #2D2D44' }}>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Cron Trigger:</strong> <code>*/5 * * * *</code> (5 dakikada bir).</li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>HTTP Request:</strong> Ücretsiz bir döviz API'sinden kuru çekin.</li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Google Sheets Write:</strong> Tarih, saat ve kur değerini tabloya yazın.</li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>IF:</strong> Koşul = <code>{'{{$json.usd_try}}'} &gt; 35</code></li>
                            <li><strong>True → Notification:</strong> &quot;⚠️ Dolar 35 TL'yi aştı: {'{{$json.usd_try}}'}&quot;</li>
                        </ol>
                    </div>

                    {/* Scenario 3 */}
                    <div>
                        <h3 style={{ color: '#F59E0B' }}>📱 Senaryo 3: Banka SMS'i ile Otomatik Harcama Kaydı</h3>
                        <p>Bankadan gelen harcama bildirimini yakalayıp, tutarı ve mağaza adını otomatik olarak Google Sheets'e kaydeden otomasyon.</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', margin: '1.5rem 0' }}>
                            <div style={{ padding: '8px 16px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #F59E0B', borderRadius: '20px', fontSize: '0.9rem' }}>📩 Bildirim Yakala</div>
                            <div style={{ color: '#6366F1' }}>→</div>
                            <div style={{ padding: '8px 16px', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid #8B5CF6', borderRadius: '20px', fontSize: '0.9rem' }}>⚙️ Code: Parse Et</div>
                            <div style={{ color: '#6366F1' }}>→</div>
                            <div style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981', borderRadius: '20px', fontSize: '0.9rem' }}>📊 Sheets: Kaydet</div>
                        </div>
                        <ol style={{ background: '#13131A', padding: '1.5rem 1.5rem 1.5rem 2.5rem', borderRadius: '8px', border: '1px solid #2D2D44' }}>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Notification Trigger:</strong> Package = <code>com.garanti.cepsubesi</code>, Text Filter = <code>(?i).*harcama.*</code></li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Code Execution:</strong> Regex ile mesajdan tutarı ve mağaza adını ayıklayın.</li>
                            <li style={{ marginBottom: '0.5rem' }}><strong>Google Sheets Write:</strong> Range = <code>Harcamalar!A:D</code>, Değerler = [Tarih, Mağaza, Tutar, Kategori].</li>
                            <li><strong>(İsteğe Bağlı) AI Agent:</strong> Mağaza adına bakarak otomatik kategori tahmin edin (Market, Restoran, vb.).</li>
                        </ol>
                    </div>

                </div>
            </section>


        </div>
    );
}
