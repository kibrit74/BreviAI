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

                <h3>⚡ Tetikleyiciler</h3>
                <p className={styles.content}>Manuel, Zamanlayıcı (Cron), Webhook gibi akışı başlatan düğümler.</p>

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
            </section>

            <section id="backend-altyapi" className={styles.section}>
                <h2 className={styles.sectionTitle}>4. Backend & Altyapı</h2>
                <div className={styles.content}>
                    <p>Backend servisleri, uygulamanın beyni olarak çalışır. Zamanlanmış görevler ve ağır işlemler burada yönetilir.</p>

                    <h4>Sistem Mimarisi</h4>
                    <div className={styles.mockupContainer} style={{ background: 'none', border: 'none', padding: 0 }}>
                        {/* Using a simple CSS representation for architecture instead of complex SVG for simplicity in this demo */}
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
                </div>
            </section>

            <section id="ornek-senaryolar" className={styles.section}>
                <h2 className={styles.sectionTitle}>5. Örnek Senaryolar</h2>
                <div className={styles.content}>
                    <p><strong>Senaryo: RSS Haber Özeti</strong></p>
                    <ol>
                        <li><strong>Cron:</strong> Her sabah 08:00'de tetiklenir.</li>
                        <li><strong>HTTP Request:</strong> RSS feed'ini çeker.</li>
                        <li><strong>AI Agent:</strong> Haberleri özetler.</li>
                        <li><strong>WhatsApp:</strong> Özeti size gönderir.</li>
                    </ol>
                </div>
            </section>

        </div>
    );
}
