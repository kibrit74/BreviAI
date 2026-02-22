
export const CATS: Record<string, { color: string; icon: string; label: string }> = {
  trigger: { color: '#10B981', icon: '⚡', label: 'Tetikleyiciler' },
  ai: { color: '#EC4899', icon: '✨', label: 'Yapay Zeka (AI)' },
  control: { color: '#6366F1', icon: '🔀', label: 'Kontrol & Mantık' },
  web: { color: '#06B6D4', icon: '🌍', label: 'Web & API' },
  communication: { color: '#F97316', icon: '💬', label: 'İletişim & Sosyal' },
  microsoft: { color: '#0078D4', icon: '🪟', label: 'Microsoft Office' },
  google: { color: '#4285F4', icon: '🌐', label: 'Google Servisleri' },
  audio: { color: '#EF4444', icon: '🔊', label: 'Ses & Konuşma' },
  device: { color: '#EF4444', icon: '📱', label: 'Cihaz & Sensörler' },
  memory: { color: '#6366F1', icon: '🧠', label: 'Hafıza (RAG)' },
  files: { color: '#F59E0B', icon: '📂', label: 'Dosya & Veri' },
  mcp: { color: '#8B5CF6', icon: '🔌', label: 'MCP Araçları' },
};

export const NODES = [
  // ─── TRIGGERS ───
  {
    id: 'MANUAL_TRIGGER',
    title: 'Manual Trigger',
    type: 'trigger',
    summary: 'Tek dokunuşla otomasyon başlatma — test ve on-demand işler için.',
    tags: ['trigger', 'manual', 'start', 'test'],
    overview: [
      { type: 'section', title: '🚀 Ne Yapar?', body: 'Manual Trigger, otomasyonun "Play" butonudur. Ekranın sağ altındaki ▶ düğmesine basıldığında akışı anında başlatır. Herhangi bir harici olay, zamanlama veya koşul gerektirmez.' },
      { type: 'tip', title: 'Dashboard Widget', body: 'Bu tetikleyiciye bir <strong>isim</strong> ve <strong>ikon</strong> vererek ana ekrana widget olarak sabitleyebilirsiniz. "Günaydın Rutini" butonu gibi.' },
      { type: 'section', title: '🛠️ Form Parametreleri (Input Schema)', body: 'Akış başlatılırken kullanıcıdan veri toplamak istiyorsanız <em>Input Schema</em> ekleyebilirsiniz. Örn: "Hedef Fiyat", "Mesaj Metni", "Kaç gün?" gibi alanlar oluşturun.<br><br>Bu alanlara erişmek için: <code>{{input.parametreAdi}}</code>' },
      { type: 'warn', title: 'Canlı Ortamda', body: 'Production akışlarında genellikle Time Trigger veya Webhook Trigger tercih edilir. Manual Trigger ağırlıklı olarak <strong>test</strong> için uygundur.' },
    ],
    params: [],
    output: {
      schema: `{
  "executionId": "exec_aZ9xQ1",
  "timestamp": "2026-01-15T08:00:00.000Z",
  "input": {
    "hedefFiyat": 150,
    "mesaj": "Günaydın!"
  }
}`,
      desc: 'Input Schema tanımlandıysa kullanıcıdan alınan değerler <code>input</code> objesi içinde gelir.'
    },
    examples: [
      { title: 'Hızlı Test', code: 'Play ▶ → Başlat', explanation: 'Ekranın sağ altındaki play butonuna basarak akışı anında çalıştırır.' },
      { title: 'Dashboard Butonu', code: 'İsim: "Sabah Rutinini Başlat"\nİkon: 🌅\nWidget: Ana Ekran\'a Sabitle', explanation: 'Ana ekranda bir buton olarak görünür, dokununca tüm sabah rutinini çalıştırır.' },
      { title: 'Formlu Başlatma', code: 'Input Schema:\n  - hedefKur: Number\n  - sesliMod: Boolean\n\nErişim: {{input.hedefKur}}', explanation: 'Akış başlatılırken kullanıcıya bir form gösterir, girilen değerleri akış boyunca kullanır.' },
    ],
    usecases: [
      { title: 'Test & Debug', flow: ['Manual Trigger', 'HTTP Request', 'IF Kontrol', 'Notification'], desc: 'Geliştirme aşamasında adım adım akışı test etmek için.' },
      { title: 'On-Demand İşler', flow: ['Manual Trigger', 'Input Form', 'AI Agent', 'WhatsApp Send'], desc: 'İstediğinizde tek dokunuşla çalıştırılan kişisel asistan akışları.' },
    ]
  },
  {
    id: 'TIME_TRIGGER',
    title: 'Time / Cron Trigger',
    type: 'trigger',
    summary: 'Zamanlanmış, periyodik görevler. Cron desteğiyle saniyeden yıla kadar hassas planlama.',
    tags: ['trigger', 'cron', 'schedule', 'time', 'periyodik'],
    overview: [
      {
        type: 'section', title: '⏰ Üç Mod', body: '<strong>Interval:</strong> Her X dakika/saatte bir. "Her 15 dakikada döviz kuru çek."<br><br><strong>Specific Date:</strong> Tek seferlik ileri tarih. "1 Ocak 2027 saat 00:00\'da çalış."<br><br><strong>Cron Expression:</strong> Tam güçte zamanlama. "Hafta içi her gün 09:00 - 18:00 arası, saat başı."'
      },
      { type: 'section', title: '📋 Cron Formatı', body: '<code>Dakika Saat Gün Ay HaftanınGünü</code><br><br>Örnekler:<br>• <code>0 8 * * 1-5</code> → Hafta içi sabah 08:00<br>• <code>*/5 * * * *</code> → 5 dakikada bir<br>• <code>0 0 1 * *</code> → Her ayın ilk günü gece 00:00<br>• <code>30 18 * * 5</code> → Cuma 18:30' },
      { type: 'warn', title: 'Backend Zorunluluğu', body: 'Cron modunun uygulamanız kapalıyken çalışması için backend\'de <strong>cron-service</strong> modülünün aktif olması gerekir. <em>Ayarlar → Servis Durumu → Cron Service: Active</em> olduğunu doğrulayın.' },
      { type: 'tip', title: 'Pil Tasarrufu', body: 'Mobilde çok sık Cron kullanacaksanız <strong>Cihaz Ayarları → Pil → BreviAI → Kısıtlama Yok</strong> seçeneğini aktif edin. Aksi hâlde Android pil optimizasyonu akışı durdurabilir.' },
    ],
    params: [
      { name: 'Mode', type: 'Select', required: true, desc: 'Interval (Her X birimde bir) • Date (Belirli tarih) • Cron (İfade)' },
      { name: 'Value', type: 'String', required: true, desc: 'Cron ifadesi, dakika sayısı veya ISO tarih. Örn: "0 9 * * *" veya "15" (dakika)' },
      { name: 'Timezone', type: 'String', required: false, default: 'Europe/Istanbul', desc: 'Saat dilimi. Sunucu farklı bölgedeyse mutlaka belirtin.' },
    ],
    output: {
      schema: `{
  "scheduledTime": "2026-01-15T08:00:00.000Z",
  "executionId": "cron_xK7mR3",
  "timezone": "Europe/Istanbul"
}`,
      desc: 'Çalıştırma zamanı ve execution ID döner.'
    },
    examples: [
      { title: 'Sabah Haber Özeti', code: 'Mode: Cron\nValue: 0 8 * * 1-5\nTimezone: Europe/Istanbul', explanation: 'Hafta içi her sabah 08:00\'de çalışır. RSS → AI Özetle → WhatsApp.' },
      { title: 'Döviz Takibi (5dk)', code: 'Mode: Interval\nValue: 5 (dakika)', explanation: 'Her 5 dakikada bir döviz kurunu çekip Google Sheets\'e yazar.' },
      { title: 'Yıl Sonu Raporu', code: 'Mode: Date\nValue: 2026-12-31T23:59:00.000Z', explanation: 'Yılın son dakikasında özet rapor oluşturup mail gönderir.' },
    ],
    usecases: [
      { title: 'Sabah Rutini', flow: ['Cron 08:00', 'Hava Durumu API', 'AI Özetle', 'Speak Text'], desc: 'Her sabah 08:00\'de hava durumunu sesli olarak okur.' },
      { title: 'Fiyat Alarm Sistemi', flow: ['Cron 5dk', 'HTTP (Fiyat API)', 'IF Kontrol', 'WhatsApp Bildir'], desc: 'Kripto veya döviz kuru eşiği aşınca anında bildirim.' },
    ]
  },
  {
    id: 'NOTIFICATION_TRIGGER',
    title: 'Notification Trigger',
    type: 'trigger',
    summary: 'WhatsApp, Banka, Instagram — API\'si olmayan uygulamaları bile otomatize et.',
    tags: ['trigger', 'bildirim', 'notification', 'sms', 'whatsapp', 'banka'],
    overview: [
      { type: 'section', title: '📥 Pasif Dinleme', body: 'Sistem bildirimlerini arka planda dinler. WhatsApp mesajı, banka SMS\'i, kargo bildirimi — herhangi bir uygulama bildirimini yakaladığında akışı başlatır.' },
      { type: 'section', title: '🔍 Regex Filtreleme', body: 'Binlerce bildirim arasından sadece istediğinizi seçin:<br><br>• <code>(?i).*harcama.*</code> → "harcama" geçen mesajlar (büyük/küçük harf duyarsız)<br>• <code>\\d{4,6}</code> → 4-6 haneli OTP kodları<br>• <code>(sipariş|kargo|teslim)</code> → E-ticaret bildirimleri<br>• <code>^Onay$</code> → Tam olarak "Onay" yazan mesaj' },
      { type: 'warn', title: 'İzin Ayarı', body: 'Telefonun <strong>Bildirim Erişimi</strong> listesinde BreviAI\'nin işaretli olduğundan emin olun. <em>Ayarlar → Uygulamalar → Özel Erişim → Bildirim Erişimi</em>' },
    ],
    params: [
      { name: 'App Name', type: 'String', required: true, desc: 'Uygulama görünen adı. Örn: "WhatsApp", "Garanti BBVA"' },
      { name: 'Package Name', type: 'String', required: false, desc: 'Uygulama paket adı (daha güvenilir). Örn: com.whatsapp, com.garanti.cepsubesi' },
      { name: 'Text Filter', type: 'Regex', required: false, desc: 'Bildirim metninde aranacak regex kalıbı. Boş bırakılırsa tüm bildirimler tetikler.' },
      { name: 'Title Filter', type: 'Regex', required: false, desc: 'Bildirim başlığında (gönderen) aranacak regex.' },
    ],
    output: {
      schema: `{
  "packageName": "com.whatsapp",
  "appName": "WhatsApp",
  "title": "Ahmet",
  "text": "Yarın buluşuyor muyuz?",
  "postTime": 1708934000000,
  "matched": true
}`,
      desc: 'Yakalanan bildirim verisi. <code>title</code> gönderen kişi, <code>text</code> mesaj içeriğidir.'
    },
    examples: [
      { title: 'Banka Harcama Takibi', code: 'App: Garanti BBVA\nPackage: com.garanti.cepsubesi\nText Filter: (?i).*harcama.*', explanation: 'Her banka harcama bildirimi geldiğinde tetiklenir. Tutar ve mağaza AI ile ayıklanıp Sheets\'e kaydedilir.' },
      { title: 'OTP Kodu Oto-Doldur', code: 'App: Mesajlar\nText Filter: \\d{4,6}', explanation: 'SMS ile gelen doğrulama kodunu yakalar.' },
    ],
    usecases: [
      { title: 'Otomatik Harcama Muhasebesi', flow: ['Notif. Trigger (Banka)', 'Code (Parse Tutar)', 'AI Kategorize', 'Sheets Kaydet'], desc: 'Banka bildirimleri geldiğinde tutarı ve kategoriyi otomatik Google Sheets\'e yazar.' },
    ]
  },
  {
    id: 'WEBHOOK_TRIGGER',
    title: 'Webhook Trigger',
    type: 'trigger',
    summary: 'Dış dünyadan gelen HTTP istekleriyle tetikleme — IFTTT, Zapier ve custom entegrasyonlar.',
    tags: ['trigger', 'webhook', 'http', 'api', 'dış'],
    overview: [
      { type: 'section', title: '🔗 Dış Bağlantı Noktası', body: 'Her akışa özel bir Webhook URL atanır. Bu URL\'ye GET veya POST isteği gönderen herkes (diğer uygulamalar, scriptler, başka servisler) akışınızı tetikleyebilir.' },
      { type: 'section', title: '🌐 URL Formatı', body: '<code>https://breviai.vercel.app/webhook/{webhookId}</code><br><br>• <code>{{body.email}}</code> → POST gövdesindeki veri<br>• <code>{{query.source}}</code> → URL parametresi (?source=...)<br>• <code>{{headers.authorization}}</code> → HTTP header' },
      { type: 'warn', title: 'Güvenlik', body: 'Webhook URL\'nizi gizli tutun. Ekstra güvenlik için <strong>Secret Token</strong> ekleyebilirsiniz. Header\'da <code>X-BreviAI-Secret: TOKEN</code> kontrol edin.' },
    ],
    params: [
      { name: 'Method', type: 'Select', required: true, desc: 'GET • POST (POST önerilir, body gönderebilirsiniz)' },
      { name: 'Response Mode', type: 'Select', required: false, desc: 'Immediately: Anında 200 dön • Wait: İşlem bitince yanıt ver' },
      { name: 'Secret Token', type: 'String', required: false, desc: 'İsteği doğrulamak için gizli anahtar.' },
    ],
    output: {
      schema: `{
  "body": { "email": "ali@test.com", "action": "new_order" },
  "query": { "source": "shopify" },
  "headers": { "content-type": "application/json" },
  "webhookId": "wh_7xKmP2"
}`,
      desc: 'Gelen HTTP isteğinin tamamı yapılandırılmış olarak sunulur.'
    },
    examples: [
      { title: 'Shopify Sipariş Bildirimi', code: 'Method: POST\nShopify Webhook URL → BreviAI URL\nTetikle: Yeni sipariş gelince', explanation: 'Shopify\'da yeni sipariş oluştuğunda WhatsApp\'tan bildirim alır.' },
    ],
    usecases: [
      { title: 'Shopify → WhatsApp', flow: ['Webhook (POST)', 'IF (Sipariş?)', 'Format Mesaj', 'WhatsApp Send'], desc: 'E-ticaret siparişlerini anında WhatsApp\'tan bildir.' },
    ]
  },
  {
    id: 'GEOFENCE_TRIGGER',
    title: 'Geofence Trigger',
    type: 'trigger',
    summary: 'Harita üzerinde sanal sınır — cihaz girince veya çıkınca tetikle.',
    tags: ['trigger', 'konum', 'harita', 'gps', 'geofence'],
    overview: [
      { type: 'section', title: '📍 Sanal Çit (Virtual Fence)', body: 'Bir koordinat etrafında dairesel bir sınır çizersiniz. Cihaz bu sınıra girdiğinde (Enter) veya ayrıldığında (Exit) akış başlar.' },
      { type: 'tip', title: 'Hassasiyet Önerisi', body: 'Radius değerini en az <strong>200 metre</strong> tutun. GPS sapması 50-100m olabilir, daha küçük değerler yanlış tetiklemelere yol açar.' },
    ],
    params: [
      { name: 'Latitude', type: 'Number', required: true, desc: 'Merkez noktanın enlemi. Örn: 41.0082' },
      { name: 'Longitude', type: 'Number', required: true, desc: 'Merkez noktanın boylamı. Örn: 28.9784' },
      { name: 'Radius', type: 'Number', required: true, desc: 'Yarıçap (metre). Minimum 200m önerilir.' },
      { name: 'Event Type', type: 'Select', required: true, desc: 'Enter (İçeri giriş) • Exit (Çıkış) • Both (Her ikisi)' },
    ],
    output: {
      schema: `{
  "event": "enter",
  "latitude": 41.0082,
  "longitude": 28.9784,
  "accuracy": 12.5,
  "timestamp": "2026-01-15T17:32:00.000Z"
}`,
      desc: '<code>event</code> alanı "enter" veya "exit" değeri taşır.'
    },
    examples: [
      { title: 'Eve Varınca', code: 'Lat: 41.0082, Lng: 28.9784\nRadius: 250m\nEvent: Enter', explanation: 'Ev koordinatına yaklaşınca akıllı ampulleri açar, çaydanlığı çalıştırır.' },
      { title: 'İşten Çıkınca', code: 'Lat: [Ofis Koordinatı]\nRadius: 300m\nEvent: Exit', explanation: 'Ofisten ayrılınca "Akşam yemeği ne yiyelim?" önerileri WhatsApp\'a gelir.' },
    ],
    usecases: [
      { title: 'Ev Otomasyonu', flow: ['Geofence (Enter)', 'Smart Home API', 'Speak "Hoş geldin"'], desc: 'Eve varınca ışıklar, ısıtma ve sesli karşılama.' },
    ]
  },
  {
    id: 'SMS_TRIGGER',
    title: 'SMS Trigger',
    type: 'trigger',
    summary: 'Gelen SMS mesajlarını yakala ve içeriğine göre otomasyon başlat.',
    tags: ['trigger', 'sms', 'mesaj', 'text', 'gelen kutusu'],
    overview: [
      { type: 'section', title: '📩 Mesaj Yakalama', body: 'Telefonunuza gelen SMS\'leri anlık olarak dinler. Banka OTP kodları, kargo bildirimleri veya özel mesajlar için tetikleyici olarak kullanabilirsiniz.' },
      { type: 'warn', title: 'İzin Gerekli', body: 'Android SMS okuma izni gerektirir. Uygulama ilk açılışta bu izni isteyecektir.' },
    ],
    params: [
      { name: 'Sender Filter', type: 'String', required: false, desc: 'Gönderen adı veya numarası. Örn: "Bank", "Kargo"' },
      { name: 'Message Filter', type: 'Regex', required: false, desc: 'Mesaj içeriği filtresi. Regex destekler.' },
    ],
    output: {
      schema: `{
  "sender": "+90532...",
  "message": "Kodunuz: 1234",
  "timestamp": 1708934000000
}`,
      desc: 'Mesaj içeriği ve gönderen bilgisi.'
    },
    examples: [
      { title: 'OTP Yakalayıcı', code: 'Sender: "Banka"\nMessage Filter: "\\d{6}"', explanation: 'Bankadan gelen 6 haneli kodları yakalar.' },
    ],
    usecases: [
      { title: 'OTP Oto-Kopyala', flow: ['SMS Trigger', 'Regex Extract', 'Notification'], desc: 'Gelen doğrulama kodunu bildirim olarak göster.' },
    ]
  },
  {
    id: 'MOTION_TRIGGER',
    title: 'Motion Trigger',
    type: 'trigger',
    summary: 'Cihaz hareketini ve sarsıntıyı algıla (İvmeölçer).',
    tags: ['trigger', 'hareket', 'motion', 'shake', 'sarsıntı', 'hırsız'],
    overview: [
      { type: 'section', title: '👋 Hareket Algılama', body: 'Cihazın ivmeölçer sensörünü kullanır. Telefon masadan alındığında, sallandığında veya düştüğünde tetiklenir.' },
      { type: 'tip', title: 'Hırsız Alarmı', body: 'Telefonunuzu bir yere bırakıp bu modu açarsanız, biri telefonu eline aldığında alarm çalabilir veya fotoğraf çekip size atabilir.' },
    ],
    params: [
      { name: 'Sensitivity', type: 'Slider', required: true, default: 'Medium', desc: 'Hassasiyet seviyesi. Düşük: Sadece sert sarsıntı. Yüksek: Hafif dokunuş.' },
    ],
    output: {
      schema: `{ "event": "shake", "force": 1.5 }`,
      desc: 'Hareket türü ve şiddeti.'
    },
    examples: [
      { title: 'Salla-Çalıştır', code: 'Sensitivity: Medium\nAction: Feneri Aç', explanation: 'Telefonu sallayınca feneri açar.' },
    ],
    usecases: [
      { title: 'Hırsız Alarmı', flow: ['Motion Trigger', 'Speak "Bırak telefonu!"', 'Camera Photo', 'Email Send'], desc: 'İzinsiz kullanımda fotoğraf çekip uyarı verir.' },
    ]
  },

  // ─── AI ───
  {
    id: 'AGENT_AI',
    title: 'AI Agent (LLM)',
    type: 'ai',
    summary: 'GPT-5, Gemini 3, Claude 4.5 — doğal dil anlama, üretme ve karar verme.',
    tags: ['ai', 'llm', 'gpt', 'gemini', 'claude', 'prompt', 'özetleme'],
    overview: [
      { type: 'section', title: '🧠 Ne Yapabilir?', body: '• Metin özetleme ve analiz<br>• JSON formatlı yapılandırılmış çıktı üretme<br>• Sınıflandırma (evet/hayır, kategori belirleme)<br>• Dil çevirisi<br>• Kod üretme ve düzeltme<br>• Duygu analizi (sentiment)<br>• Konuşma ve soru-cevap' },
      { type: 'section', title: '🤖 2026 Model Listesi', body: '<strong>GPT-5 (OpenAI):</strong> Çok adımlı akıl yürütme, kod, matematik.<br><br><strong>Gemini 3 Flash:</strong> Hızlı ve ücretsiz kota. Çoğu senaryo için yeterli.<br><br><strong>Gemini 3 Pro:</strong> Karmaşık görevler, 1M token bağlam.<br><br><strong>Claude 4.5 Opus:</strong> Kodlama, otonom görev, detaylı analiz.' },
      { type: 'tip', title: 'Prompt İpuçları', body: '• <strong>Rol ver:</strong> "Sen uzman bir finans analistsin."<br>• <strong>Format belirt:</strong> "Sadece JSON formatında, başka hiçbir şey yazma."<br>• <strong>Örnek ver:</strong> Birkaç input-output örneği ekleyin (few-shot).<br>• <strong>Adım adım düşün:</strong> Zor sorularda "Adım adım düşünerek cevap ver." diyebilirsiniz.' },
    ],
    params: [
      { name: 'Model', type: 'Select', required: true, desc: 'GPT-5 • Gemini 3 Flash • Gemini 3 Pro • Claude 4.5 Opus' },
      { name: 'Prompt', type: 'Text', required: true, desc: 'Modele gidecek talimat. {{değişken}} kullanabilirsiniz.' },
      { name: 'System Prompt', type: 'Text', required: false, desc: 'Modelin genel kişiliği ve davranışı için sabit talimat.' },
      { name: 'Temperature', type: 'Slider (0-1)', required: false, default: '0.7', desc: '0: Deterministik ve mantıksal • 1: Yaratıcı ve çeşitli' },
      { name: 'Max Tokens', type: 'Number', required: false, default: '1024', desc: 'Cevap uzunluğu sınırı. 1 token ≈ 0.75 kelime.' },
      { name: 'Memory', type: 'Select', required: false, desc: 'Conversation history tutulsun mu? On • Off' },
    ],
    output: {
      schema: `{
  "content": "Özet: Bu çeyrekte gelirler %15 arttı...",
  "model": "gemini-3-flash",
  "usage": {
    "promptTokens": 245,
    "completionTokens": 87,
    "totalTokens": 332
  },
  "finishReason": "stop"
}`,
      desc: 'Ana yanıt <code>content</code> alanındadır. JSON istenirse parse etmeyi unutmayın.'
    },
    examples: [
      { title: 'Haber Özetleyici', code: 'Model: Gemini 3 Flash\nSystem: "Türkçe, kısa ve öz yaz."\nPrompt: "Şu haberi 2 cümlede özetle:\\n{{haber_metni}}"', explanation: 'RSS\'ten çekilen haberi WhatsApp\'a göndermek için özetler.' },
      { title: 'JSON Kategorilendirici', code: 'Prompt: "{{magaza}} mağazası hangi kategoride? Seçenekler: [Market, Restoran, Giyim, Ulaşım, Diğer]. Sadece JSON: {\'kategori\': \'...\'}"\nTemperature: 0', explanation: 'Banka harcamasını otomatik kategorize eder. Temperature 0 ile tutarlı sonuç alınır.' },
      { title: 'Duygu Analizi', code: 'Prompt: "Yorum: {{yorum}}\\nBu yorum Pozitif mi Negatif mi Nötr mü? Sadece tek kelime yaz."', explanation: 'Müşteri yorumlarını sınıflandırır.' },
    ],
    usecases: [
      { title: 'Müşteri Desteği Botu', flow: ['Webhook (Mesaj)', 'AI Agent (Analiz)', 'IF (Kategori)', 'Otomatik Yanıt'], desc: 'Gelen destek mesajını kategorize edip otomatik yanıt üretir.' },
      { title: 'Sabah Bülteni', flow: ['Cron 08:00', 'HTTP (RSS)', 'AI Özetle', 'WhatsApp/Speak'], desc: 'Günün haberlerini özetleyip WhatsApp\'a veya sesli okur.' },
    ]
  },
  {
    id: 'IMAGE_GENERATOR',
    title: 'Image Generator',
    type: 'ai',
    summary: 'Metin → Görsel. 4K fotorealizm ve sanatsal içerik üretimi.',
    tags: ['ai', 'görsel', 'image', 'sdxl', 'text-to-image', 'prompt'],
    overview: [
      { type: 'section', title: '🎨 Kullanabileceğiniz Motorlar', body: '<strong>Nanobana Pro:</strong> Fotorealizm şampiyonu. Özellikle görsel içinde metin renderlama konusunda kusursuz. 4K çözünürlük.<br><br><strong>Flux.1 Ultra:</strong> Sanatsal derinlik ve stil transferi. İllüstrasyon ve konsept art için ideal.<br><br><strong>Pollinations:</strong> Hızlı, ücretsiz, çeşitli modeller sunar.' },
      { type: 'tip', title: 'Prompt Dili', body: 'Prompt\'u <strong>İngilizce</strong> yazın — modeller büyük çoğunluğu İngilizce eğitilmiştir. "Gerçekçi" için <code>photorealistic, 8K, professional photography</code>, sanatsal için <code>digital art, concept art, dramatic lighting</code> ekleyebilirsiniz.' },
      { type: 'tip', title: 'Negatif Prompt', body: '<code>Negative Prompt</code> alanında istemediğiniz unsurları belirtin: <code>blurry, low quality, text errors, watermark</code>' },
    ],
    params: [
      { name: 'Provider', type: 'Select', required: true, desc: 'Nanobana Pro • Flux.1 Ultra • Pollinations' },
      { name: 'Prompt', type: 'Text', required: true, desc: 'Görsel tanımı. İngilizce önerilir.' },
      { name: 'Negative Prompt', type: 'Text', required: false, desc: 'İstenmeyen unsurlar. Örn: blurry, watermark, low quality' },
      { name: 'Resolution', type: 'Select', required: false, default: '1024x1024', desc: '512x512 • 1024x1024 • 1920x1080 • 4K' },
      { name: 'Style', type: 'Select', required: false, desc: 'Photorealistic • Anime • Digital Art • Oil Painting • Watercolor' },
    ],
    output: {
      schema: `{
  "url": "https://cdn.breviai.com/gen/img_9xKmP2.png",
  "width": 1024,
  "height": 1024,
  "model": "nanobana-pro",
  "seed": 4829174
}`,
      desc: '<code>url</code> alanını WhatsApp Media URL, Instagram Post veya Sheets\'e yazabilirsiniz.'
    },
    examples: [
      { title: 'Ürün Görseli', code: 'Provider: Nanobana Pro\nPrompt: "Minimalist product shot of a black coffee mug on marble surface, studio lighting, 8K"\nResolution: 1920x1080', explanation: 'E-ticaret ürün görseli üretir.' },
      { title: 'Otonom Instagram Hesabı', code: 'System Prompt: Günlük doğa fotoğrafı temaları üret\nPrompt: "{{bugunun_temasi}}, golden hour, photorealistic"\nProvider: Flux.1 Ultra', explanation: 'Her gün farklı bir doğa görseli üretip Instagram\'a paylaşır.' },
    ],
    usecases: [
      { title: 'AI Sanat Hesabı', flow: ['Cron (Günlük)', 'AI Agent (Tema)', 'Image Gen', 'Instagram Post'], desc: 'Her gün farklı tema ile görsel üretip Instagram\'a paylaşır.' },
    ]
  },
  {
    id: 'REALTIME_AI',
    title: 'Realtime AI (Live Voice)',
    type: 'ai',
    summary: 'Milisaniye gecikme ile canlı sesli asistan konuşması.',
    tags: ['ai', 'voice', 'realtime', 'sesli', 'asistan', 'gemini'],
    overview: [
      { type: 'section', title: '🎙️ Canlı Sohbet', body: 'Gemini 3 Multimodal altyapısıyla neredeyse sıfır gecikme ile konuşun. Söyledikleriniz anlık transkript olur, AI cevabı sesle döner.' },
      { type: 'section', title: '🌟 Kullanım Alanları', body: '• Yabancı dil pratiği — asistan sizi düzeltir<br>• Eller serbest mutfak asistanı<br>• Sesli görev oluşturma<br>• Duyguları anlayan empati modu<br>• Sesli arama ve not alma' },
      { type: 'tip', title: 'Kişilik Tasarımı', body: 'Persona alanına detaylı kişilik tanımı yazın. Örn: "Sen Dr. Ayşe, deneyimli bir psikolog. Yargılamadan dinle, kısa sorular sor, Türkçe cevapla."' },
    ],
    params: [
      { name: 'Persona', type: 'Text', required: true, desc: 'Asistanın kişiliği ve rolü. Ne kadar detaylı, o kadar iyi.' },
      { name: 'Language', type: 'String', required: false, default: 'tr-TR', desc: 'Konuşma dili. Örn: tr-TR, en-US, de-DE' },
      { name: 'Voice', type: 'Select', required: false, desc: 'Ses tonu: Friendly • Professional • Calm • Energetic' },
    ],
    output: { schema: `{ "transcript": "...", "response": "...", "duration": 3.2 }`, desc: 'Konuşma transkribi ve AI cevabı.' },
    examples: [
      { title: 'İngilizce Öğretmen', code: 'Persona: "You are Alex, a strict English teacher. Correct every grammar mistake immediately. Ask follow-up questions."', explanation: 'Her konuşmayı düzelten kişisel İngilizce öğretmeni.' },
    ],
    usecases: [
      { title: 'Dil Pratiği', flow: ['Realtime AI (Öğretmen)', 'Speech Log', 'Hata Raporu'], desc: 'Konuşma pratiği yapıp hatalarınızı takip edin.' },
    ]
  },

  // ─── CONTROL ───
  {
    id: 'IF_ELSE',
    title: 'IF / Else (Decision)',
    type: 'control',
    summary: 'Koşula göre akışı True veya False koluna yönlendir.',
    tags: ['control', 'if', 'koşul', 'mantık', 'dallanma', 'karar'],
    overview: [
      { type: 'section', title: '🔀 Nasıl Çalışır?', body: 'Gelen veriyi belirlediğiniz koşula göre değerlendirir. Koşul doğruysa üst çıkıştan (✅ True), yanlışsa alt çıkıştan (❌ False) devam eder. Birden fazla koşul AND/OR mantığıyla kombinleyebilirsiniz.' },
      { type: 'section', title: '🔢 Operatör Rehberi', body: '<code>Equal (==)</code> Tam eşleşme<br><code>Not Equal (!=)</code> Eşit değilse<br><code>> / >=</code> Büyüktür<br><code>< / <=</code> Küçüktür<br><code>Contains</code> Metin içeriyorsa<br><code>Starts/Ends With</code> Başlıyor/bitiyor mu<br><code>Exists</code> Değişken tanımlı mı<br><code>Matches Regex</code> Regex uyuyorsa<br><code>Is Empty</code> Boş mu' },
      { type: 'tip', title: 'Tip Uyarısı', body: 'Sayısal karşılaştırmalarda <code>1</code> (sayı) ile <code>"1"</code> (metin) eşit değildir. Değişkenin tipine dikkat edin.' },
    ],
    params: [
      { name: 'Conditions', type: 'UI Builder', required: true, desc: 'Karşılaştırma kuralları. AND/OR kombinasyonu desteklenir.' },
      { name: 'Combine Mode', type: 'Select', required: false, default: 'AND', desc: 'AND: Tüm koşullar doğru olmalı • OR: En az bir doğru yeterli' },
    ],
    output: {
      schema: `{
  "result": true,
  "evaluatedConditions": [
    { "condition": "balance < 0", "result": false }
  ]
}`,
      desc: 'True çıkışı: orijinal veri geçer. False çıkışı: orijinal veri geçer.'
    },
    examples: [
      { title: 'Bakiye Kontrolü', code: 'IF {{balance}} < 0\n→ True: "⚠️ Bakiye uyarısı gönder"\n→ False: Hiçbir şey yapma', explanation: 'Banka hesabı eksiye düşünce WhatsApp bildirimi.' },
      { title: 'API Başarı Kontrolü', code: 'IF {{http.statusCode}} == 200\n→ True: Veriyi işle\n→ False: Hata log\'u at, tekrar dene', explanation: 'HTTP isteğinin başarılı olup olmadığını kontrol eder.' },
    ],
    usecases: [
      { title: 'Hata Yönetimi', flow: ['HTTP Request', 'IF (200?)', 'True→ İşle', 'False→ Hata Bildir'], desc: 'API hataları sessizce geçmesin, her başarısız istek loglanıp bildirilsin.' },
    ]
  },
  {
    id: 'LOOP',
    title: 'Loop / For Each',
    type: 'control',
    summary: 'Bir liste üzerindeki her eleman için aynı işlemi sırayla çalıştır.',
    tags: ['control', 'döngü', 'loop', 'liste', 'array', 'for each'],
    overview: [
      { type: 'section', title: '🔄 Çalışma Mantığı', body: 'Liste (Array) aldığınız her durumda Loop kullanın. Liste elemanları sırayla "Loop Body" çıkışına gönderilir, her biri için bağlı işlemler çalışır. Liste bitince akış "Completed" çıkışından devam eder.' },
      { type: 'tip', title: 'Batch Mode', body: 'Liste 1000+ elemandan oluşuyorsa <strong>Split Batches</strong> düğümüyle gruplara bölün. Örn: 1000 maili 50\'şerli 20 batch\'e bölerek gönderin. API rate limit\'e takılmazsınız.' },
      { type: 'warn', title: 'Hız Sınırı', body: 'Dış API\'lere çok hızlı istek atmamak için Loop içine <strong>Wait (Bekle)</strong> düğümü ekleyin. Örn: Her iterasyon arasında 1 saniye bekle.' },
    ],
    params: [
      { name: 'Items', type: 'Array', required: true, desc: 'Üzerinde dönülecek veri listesi. Örn: {{http.data.users}}' },
      { name: 'Batch Size', type: 'Number', required: false, default: '1', desc: 'Kaç elemanın birlikte işleneceği. Genellikle 1.' },
    ],
    output: {
      schema: `// Her iterasyon'da Loop Body çıkışına:
{
  "item": { "id": 1, "name": "Ali", "email": "ali@..." },
  "index": 0,
  "total": 25
}

// Liste bittiğinde Completed çıkışına:
{ "processedCount": 25 }`,
      desc: '<code>item</code> mevcut eleman, <code>index</code> sıra numarası.'
    },
    examples: [
      { title: 'Toplu E-posta', code: 'Items: {{sheets.rows}}\n→ Loop Body → Send Email\n  To: {{item.email}}\n  Body: "Merhaba {{item.name}}"', explanation: 'Sheets\'teki her satır için kişiselleştirilmiş mail gönderir.' },
      { title: 'AI ile Toplu Analiz', code: 'Items: {{yorumlar}}\n→ AI Agent → Duygu Analizi\n→ Sheets\'e Kaydet {{item.yorum}}, {{ai.kategori}}', explanation: '100 müşteri yorumunu tek tek AI\'a gönderip analiz sonuçlarını Sheets\'e yazar.' },
    ],
    usecases: [
      { title: 'Bulk E-posta Kampanyası', flow: ['Sheets (Liste Çek)', 'Loop', 'AI (Kişiselleştir)', 'Email Gönder'], desc: 'Her abone için kişiselleştirilmiş içerikle mail kampanyası.' },
    ]
  },
  {
    id: 'EXECUTE_WORKFLOW',
    title: 'Run Sub-Workflow',
    type: 'control',
    summary: 'Başka bir akışı fonksiyon olarak çağır — modüler ve yönetilebilir tasarım.',
    tags: ['control', 'sub-workflow', 'modül', 'fonksiyon', 'alt akış'],
    overview: [
      { type: 'section', title: '📦 Neden Modüler Tasarım?', body: '100 düğümlük devasa bir akış yerine, küçük ve özelleşmiş akışlar oluşturun. Bu düğüm onları birleştirir. Bir alt akış bozulursa sadece onu düzeltirsiniz, ana akış devam eder.' },
      { type: 'section', title: '↔️ Veri Aktarımı', body: 'Alt akışa <strong>Input</strong> gönderebilirsiniz: <code>{{currency: "USD", amount: 100}}</code><br><br>Alt akıştan <strong>Output</strong> alabilirsiniz: <code>{{subflow.result.convertedAmount}}</code><br><br><strong>Wait</strong> seçeneği açıksa alt akış bitene kadar ana akış bekler.' },
    ],
    params: [
      { name: 'Workflow', type: 'Select', required: true, desc: 'Çağrılacak alt akış. Dropdown\'dan seçin.' },
      { name: 'Wait for Completion', type: 'Boolean', required: true, desc: 'True: Alt akış bitince devam et • False: Paralel çalıştır' },
      { name: 'Input Data', type: 'JSON', required: false, desc: 'Alt akışa gönderilecek veri. {{değişken}} kullanılabilir.' },
    ],
    output: {
      schema: `{
  "subflowId": "wf_kur_cevirici",
  "result": { "convertedAmount": 142.5, "rate": 32.5 },
  "executionTime": 1240
}`,
      desc: 'Alt akışın son düğümünün çıktısı <code>result</code> altında döner.'
    },
    examples: [
      { title: 'Döviz Çevirici Servis', code: 'Workflow: "Kur Çevirici"\nInput: {currency: "USD", amount: {{fiyat}}}\nWait: true\n\n→ Sonuç: {{subflow.result.try_amount}} TL', explanation: 'Ana akıştan döviz çevirici alt akışını çağırır, sonucu kullanır.' },
    ],
    usecases: [
      { title: 'Sabah Paketi', flow: ['Manual Trigger', 'Run: Hava Dur.', 'Run: Haberler', 'Run: Takvim', 'Speak Özet'], desc: '3 ayrı alt akıştan veri toplayıp sesli özet sunar.' },
    ]
  },

  // ─── WEB ───
  {
    id: 'HTTP_REQUEST',
    title: 'HTTP Request',
    type: 'web',
    summary: 'İnternetin bel kemiği — her API\'ye bağlanın, veri çekin veya gönderin.',
    tags: ['web', 'api', 'http', 'get', 'post', 'rest', 'webhook'],
    overview: [
      { type: 'section', title: '🌐 Evrensel Bağlantı', body: 'Döviz kuru, hava durumu, AI API, özel backend — internette adres bulunan her şeye bağlanabilirsiniz. REST API\'leri için temel araçtır.' },
      { type: 'section', title: '🚦 HTTP Durum Kodları', body: '<code>200</code> ✅ Başarılı — veriyi işle<br><code>201</code> ✅ Oluşturuldu<br><code>400</code> ❌ Hatalı istek — JSON\'ı kontrol et<br><code>401</code> 🔑 API Key yanlış/eksik<br><code>403</code> 🚫 Yetki yok<br><code>404</code> 🔍 URL yanlış<br><code>429</code> ⏱️ Rate limit aşıldı<br><code>500</code> 💥 Sunucu hatası' },
      { type: 'tip', title: 'Authentication', body: 'API Key\'leri Header\'a ekleyin: <code>Authorization: Bearer API_KEY</code><br>Bunu Credentials bölümünde saklayın, düğüme açık yazmayın.' },
    ],
    params: [
      { name: 'Method', type: 'Select', required: true, desc: 'GET (Veri oku) • POST (Veri gönder/oluştur) • PUT (Güncelle) • PATCH (Kısmi güncelle) • DELETE (Sil)' },
      { name: 'URL', type: 'String', required: true, desc: 'Tam adres. Örn: https://api.exchangerate.host/latest?base=USD' },
      { name: 'Headers', type: 'JSON', required: false, desc: '{"Authorization": "Bearer TOKEN", "Content-Type": "application/json"}' },
      { name: 'Body', type: 'JSON', required: false, desc: 'POST/PUT/PATCH için gönderilecek veri.' },
      { name: 'Timeout', type: 'Number', required: false, default: '10000', desc: 'Maksimum bekleme süresi (ms). 0 = sınırsız.' },
    ],
    output: {
      schema: `{
  "statusCode": 200,
  "data": { "USD": { "TRY": 32.45, "EUR": 0.91 } },
  "headers": { "content-type": "application/json" },
  "responseTime": 342
}`,
      desc: 'Ham yanıt verisi <code>data</code> altında. Tip: JSON, Text veya Binary.'
    },
    examples: [
      { title: 'Döviz Kuru Çek', code: 'Method: GET\nURL: https://api.exchangerate.host/latest?base=USD\nHeaders: {} (API key gerektirmiyor)', explanation: 'USD/TRY kurunu çeker. {{data.USD.TRY}} ile değere erişilir.' },
      { title: 'OpenAI API Çağrısı', code: 'Method: POST\nURL: https://api.openai.com/v1/chat/completions\nHeaders: {Authorization: Bearer {{creds.openai}}}\nBody: {model: "gpt-4", messages: [...]}', explanation: 'Doğrudan OpenAI API\'sini çağırır. AI Agent düğümü yerine daha fazla kontrol için.' },
    ],
    usecases: [
      { title: 'Döviz Alarm', flow: ['Cron 5dk', 'HTTP (Kur API)', 'IF (Eşik Aşıldı?)', 'WhatsApp Bildir'], desc: 'Dolar/Euro belirli seviyeyi geçince anında bildirim.' },
    ]
  },

  // ─── COMMUNICATION ───
  {
    id: 'WHATSAPP_SEND',
    title: 'WhatsApp Send',
    type: 'communication',
    summary: 'Otomatik WhatsApp mesajı, görsel ve belge gönderimi.',
    tags: ['communication', 'whatsapp', 'mesaj', 'bildirim', 'sosyal'],
    overview: [
      { type: 'section', title: '💬 İki Bağlantı Modu', body: '<strong>Backend (WWebJS):</strong> Kendi kişisel numaranızı kullanır. QR kod ile bağlanır. Ücretsiz. Günlük kullanım için ideal.<br><br><strong>Cloud API (Meta):</strong> Meta\'nın resmi Business API\'si. Şablon onayı gerektirir. Yüksek hacimli gönderimler için.' },
      { type: 'tip', title: 'Numara Formatı', body: 'Numara ülke koduyla ve "+" olmadan yazılmalıdır: <code>905321234567</code> ✅<br><code>0532...</code> ❌ — <code>+905...</code> ❌' },
      { type: 'tip', title: 'Metin Formatı', body: 'WhatsApp formatlaması kullanabilirsiniz:<br><code>*kalın*</code> → <strong>kalın</strong><br><code>_italik_</code> → <em>italik</em><br><code>\\n</code> → Yeni satır' },
    ],
    params: [
      { name: 'To', type: 'String', required: true, desc: 'Alıcı numarası. Ülke koduyla, + olmadan. Örn: 905321234567' },
      { name: 'Message', type: 'Text', required: true, desc: 'Gönderilecek metin. {{değişken}} kullanılabilir.' },
      { name: 'Media URL', type: 'String', required: false, desc: 'Görsel, PDF veya ses dosyası URL\'si.' },
      { name: 'Connection', type: 'Select', required: true, desc: 'WWebJS (Kişisel) • Cloud API (Business)' },
    ],
    output: {
      schema: `{
  "messageId": "msg_3BA2A4AB...",
  "status": "sent",
  "timestamp": "2026-01-15T08:05:22.000Z"
}`,
      desc: 'Gönderim başarılıysa <code>status: "sent"</code> döner.'
    },
    examples: [
      { title: 'Kur Alarmı', code: 'To: 905321234567\nMessage: "⚠️ Dolar alarmı!\\nMevcut kur: {{kur}} TL\\nHedef: 35 TL aşıldı."', explanation: 'Döviz eşiği aşıldığında otomatik bildirim.' },
      { title: 'AI Görsel Gönder', code: 'To: 905321234567\nMessage: "İşte üretilen görsel 🎨"\nMedia URL: {{imageGen.url}}', explanation: 'Image Generator\'ın ürettiği görseli WhatsApp\'tan gönderir.' },
    ],
    usecases: [
      { title: 'Günlük Özet', flow: ['Cron 08:00', 'Haber API', 'AI Özetle', 'WhatsApp'], desc: 'Sabah gazetesini WhatsApp\'tan al.' },
    ]
  },
  {
    id: 'INSTAGRAM_POST',
    title: 'Instagram Post',
    type: 'communication',
    summary: 'Feed, Story ve Reel paylaşımını otomatize et.',
    tags: ['communication', 'instagram', 'sosyal medya', 'paylaşım', 'post'],
    overview: [
      { type: 'section', title: '📸 Paylaşım Tipleri', body: '<strong>Feed Post:</strong> Ana sayfada kalıcı paylaşım.<br><strong>Story:</strong> 24 saat görünür.<br><strong>Reel:</strong> Kısa video içeriği.' },
      { type: 'tip', title: 'AI ile Kombine', body: 'Image Generator + AI Agent + Instagram Post = Otonom içerik hesabı. Her gün farklı tema, AI üretimi görsel ve açıklama yazısı ile tamamen otomatik hesap yönetimi.' },
      { type: 'warn', title: 'Meta İzinleri', body: 'Instagram Business hesabı gerektirir. BreviAI OAuth ile bağlanır. <em>Ayarlar → Hesaplar → Instagram → Bağla</em>' },
    ],
    params: [
      { name: 'Image', type: 'Image/URL', required: true, desc: 'Paylaşılacak görsel. URL veya dosya yolu.' },
      { name: 'Caption', type: 'Text', required: true, desc: 'Açıklama metni. #hashtag ve @mention desteklenir.' },
      { name: 'Type', type: 'Select', required: false, default: 'Feed', desc: 'Feed • Story • Reel' },
      { name: 'Location', type: 'String', required: false, desc: 'Konum etiketi.' },
    ],
    output: { schema: `{ "postId": "17846368219941196", "url": "https://instagram.com/p/...", "status": "published" }`, desc: 'Yayınlanan postun ID ve URL\'si.' },
    examples: [
      { title: 'Günlük AI Sanat', code: 'Image: {{imageGen.url}}\nCaption: "{{ai.caption}}\\n\\n#aiart #dailyart"\nType: Feed', explanation: 'Her gün AI üretimi görsel ve AI yazılan caption ile otomatik post.' },
    ],
    usecases: [
      { title: 'Otonom Sanat Hesabı', flow: ['Cron Günlük', 'AI (Tema Üret)', 'Image Gen', 'AI (Caption Yaz)', 'Instagram Post'], desc: 'Tamamen otonom Instagram sanat hesabı.' },
    ]
  },
  {
    id: 'SMS_SEND',
    title: 'SMS Send',
    type: 'communication',
    summary: 'Yerel SMS gönderimi yap.',
    tags: ['communication', 'sms', 'mesaj', 'gönder'],
    overview: [
      { type: 'section', title: '📤 Yerel Gönderim', body: 'Cihazın kendi SIM kartını kullanarak SMS gönderir. Operatör tarifenizden düşer.' },
    ],
    params: [
      { name: 'Phone Number', type: 'String', required: true, desc: 'Alıcı numarası.' },
      { name: 'Message', type: 'Text', required: true, desc: 'Mesaj metni.' },
    ],
    output: { schema: `{ "status": "sent" }`, desc: 'Gönderim durumu.' },
    examples: [
      { title: 'Acil Durum Mesajı', code: 'To: Anne\nMessage: "Ben iyiyim, konumum: {{loc}}"', explanation: 'Tek tıkla güvendeyim mesajı.' },
    ],
    usecases: [
      { title: 'SOS', flow: ['Manual Trigger', 'Location', 'SMS Send'], desc: 'Acil durumda konum paylaşır.' },
    ]
  },
  {
    id: 'GMAIL_READ',
    title: 'Gmail Read',
    type: 'communication',
    summary: 'Gmail hesabınızdaki e-postaları okuyun ve arayın.',
    tags: ['communication', 'email', 'gmail', 'oku', 'google'],
    overview: [
      { type: 'section', title: '🔍 E-posta Arama', body: 'Gmail arama operatörlerini (from:, is:unread, subject:) destekler.' },
      { type: 'tip', title: 'OAuth', body: 'Güvenli Google girişi kullanır. Şifrenizi paylaşmazsınız.' },
    ],
    params: [
      { name: 'Query', type: 'String', required: false, default: 'is:unread', desc: 'Gmail arama sorgusu.' },
      { name: 'Limit', type: 'Number', required: false, default: '5', desc: 'Maksimum e-posta sayısı.' },
    ],
    output: { schema: `{ "emails": [{ "subject": "...", "from": "...", "snippet": "..." }] }`, desc: 'E-posta listesi.' },
    examples: [
      { title: 'Faturaları Bul', code: 'Query: "subject:fatura is:unread"', explanation: 'Okunmamış fatura maillerini bulur.' },
    ],
    usecases: [
      { title: 'Mail Özeti', flow: ['Cron 09:00', 'Gmail Read', 'AI Summary', 'Speak'], desc: 'Sabah önemli mailleri özetle.' },
    ]
  },
  {
    id: 'GMAIL_SEND',
    title: 'Gmail Send',
    type: 'communication',
    summary: 'Gmail hesabınız üzerinden e-posta gönderin.',
    tags: ['communication', 'email', 'gmail', 'gönder', 'google'],
    overview: [
      { type: 'section', title: '📧 Güvenli Gönderim', body: 'Kendi Gmail hesabınızı kullanarak mail atar. Ek dosya destekler.' },
    ],
    params: [
      { name: 'To', type: 'String', required: true, desc: 'Alıcı adresi.' },
      { name: 'Subject', type: 'String', required: true, desc: 'Konu.' },
      { name: 'Body', type: 'HTML', required: true, desc: 'Mesaj içeriği.' },
    ],
    output: { schema: `{ "id": "msg_123", "status": "sent" }`, desc: 'Gönderilen mail ID.' },
    examples: [
      { title: 'Rapor Gönder', code: 'To: boss@sirket.com\nSubject: Rapor\nBody: "Ektedir."', explanation: 'Hazırlanan raporu mail atar.' },
    ],
    usecases: [
      { title: 'Otomatik Yanıt', flow: ['Gmail Read', 'AI Generate Reply', 'Gmail Send'], desc: 'Maillere otomatik cevap taslağı hazırlar.' },
    ]
  },

  // ─── MICROSOFT ───
  {
    id: 'OUTLOOK_SEND',
    title: 'Outlook Email',
    type: 'microsoft',
    summary: 'Office 365 hesabıyla kurumsal e-posta — SMTP\'den daha güvenilir.',
    tags: ['microsoft', 'outlook', 'email', 'mail', 'office365', 'kurumsal'],
    overview: [
      { type: 'section', title: '📧 Neden API, SMTP değil?', body: 'Microsoft\'un Graph API\'si kullanılır. Spam kutusuna düşme riski neredeyse sıfırdır. SMTP\'ye kıyasla çok daha güvenilir teslimiyat oranı sunar.' },
      { type: 'section', title: '📎 Ekler (Attachments)', body: 'Workflow\'da üretilen PDF, Excel, görsel veya herhangi bir dosyayı ek olarak gönderebilirsiniz. Maksimum boyut: 25MB.' },
    ],
    params: [
      { name: 'To', type: 'String', required: true, desc: 'Alıcı e-posta. Birden fazla için virgülle ayırın.' },
      { name: 'CC', type: 'String', required: false, desc: 'CC alıcıları.' },
      { name: 'Subject', type: 'String', required: true, desc: 'Konu satırı.' },
      { name: 'Body', type: 'HTML/Text', required: true, desc: 'İçerik. HTML desteklenir.' },
      { name: 'Attachments', type: 'File[]', required: false, desc: 'Eklenecek dosyalar.' },
    ],
    output: { schema: `{ "messageId": "AAMkAGI2...", "status": "sent", "timestamp": "..." }`, desc: 'Gönderilen mailin ID\'si.' },
    examples: [
      { title: 'Haftalık Rapor', code: 'To: manager@corp.com\nSubject: "Haftalık Performans Raporu - {{$now}}"\nBody: {{ai_summary}}\nAttachments: [{{excel_dosyası}}]', explanation: 'Her Cuma AI özeti ve Excel dosyasıyla haftalık rapor gönderir.' },
    ],
    usecases: [
      { title: 'Otomatik Raporlama', flow: ['Cron Cuma', 'Sheets (Veri)', 'AI Özetle', 'Outlook Email'], desc: 'Haftalık veri raporunu yöneticiye otomatik gönder.' },
    ]
  },
  {
    id: 'EXCEL_WRITE',
    title: 'Excel Write/Read',
    type: 'microsoft',
    summary: 'OneDrive\'daki Excel dosyalarına veri yaz, oku, güncelle.',
    tags: ['microsoft', 'excel', 'onedrive', 'tablo', 'spreadsheet'],
    overview: [
      { type: 'section', title: '📊 CRUD Operasyonları', body: '<strong>Read:</strong> Belirli bir aralıktan veri oku.<br><strong>Write:</strong> Yeni satır ekle veya hücre güncelle.<br><strong>Update:</strong> Mevcut değeri değiştir.<br><strong>Clear:</strong> Belirli aralığı temizle.' },
      { type: 'warn', title: 'Cloud Dosyası Gerekli', body: 'Sadece <strong>OneDrive</strong> üzerinde bulunan .xlsx dosyalarıyla çalışır. Bilgisayarınızdaki yerel Excel dosyaları desteklenmez.' },
    ],
    params: [
      { name: 'Action', type: 'Select', required: true, desc: 'Read • Write • Update • Clear' },
      { name: 'File ID', type: 'String', required: true, desc: 'OneDrive dosya ID\'si veya seçici.' },
      { name: 'Sheet', type: 'String', required: true, desc: 'Sayfa adı. Örn: "Sayfa1", "Harcamalar"' },
      { name: 'Range', type: 'String', required: true, desc: 'Hücre aralığı. Örn: A1:D5 veya A:A (tüm sütun)' },
      { name: 'Values (Write)', type: 'Array', required: false, desc: '[[satır1_col1, satır1_col2], [satır2_col1, ...]]' },
    ],
    output: { schema: `{ "updatedRange": "Harcamalar!A5:D5", "updatedRows": 1, "data": [["2026-01-15", "Market", "245.50"]] }`, desc: 'Yazılan aralık ve güncellenen satır sayısı.' },
    examples: [
      { title: 'Harcama Log', code: 'Action: Write\nSheet: Harcamalar\nRange: A:D (Append)\nValues: [[{{tarih}}, {{magaza}}, {{tutar}}, {{kategori}}]]', explanation: 'Her harcamayı Excel\'e yeni satır olarak ekler.' },
    ],
    usecases: [
      { title: 'Kişisel Muhasebe', flow: ['Notif. Trigger', 'Code (Parse)', 'Excel Write', 'Monthly Summary'], desc: 'Banka bildirimlerini otomatik Excel muhasebe defterine kaydet.' },
    ]
  },
  {
    id: 'ONEDRIVE_UPLOAD',
    title: 'OneDrive Upload',
    type: 'microsoft',
    summary: 'Dosyalarınızı OneDrive bulutuna yükleyin.',
    tags: ['microsoft', 'onedrive', 'upload', 'yükle', 'bulut'],
    overview: [
      { type: 'section', title: '☁️ Bulut Yedekleme', body: 'Oluşturulan PDF, görsel veya raporları OneDrive klasörüne kaydeder.' },
    ],
    params: [
      { name: 'File', type: 'File', required: true, desc: 'Yüklenecek dosya.' },
      { name: 'Path', type: 'String', required: false, default: '/', desc: 'Hedef klasör yolu.' },
    ],
    output: { schema: `{ "id": "file_123", "webUrl": "https://1drv.ms/..." }`, desc: 'Yüklenen dosya bağlantısı.' },
    examples: [
      { title: 'Fotoğraf Yedekle', code: 'File: {{camera.photo}}\nPath: /CameraUploads', explanation: 'Çekilen fotoğrafı buluta yükler.' },
    ],
    usecases: [
      { title: 'Belge Arşivi', flow: ['Scanner', 'PDF Create', 'OneDrive Upload'], desc: 'Taranan belgeleri arşivler.' },
    ]
  },
  {
    id: 'ONEDRIVE_LIST',
    title: 'OneDrive List',
    type: 'microsoft',
    summary: 'OneDrive klasöründeki dosyaları listele.',
    tags: ['microsoft', 'onedrive', 'list', 'dosya', 'oku'],
    overview: [
      { type: 'section', title: '📂 Dosya Yönetimi', body: 'Belirli bir klasördeki dosyaları listeler, filtreler ve indirme linklerini alır.' },
    ],
    params: [
      { name: 'Path', type: 'String', required: true, desc: 'Klasör yolu.' },
    ],
    output: { schema: `{ "files": [{ "name": "...", "id": "..." }] }`, desc: 'Dosya listesi.' },
    examples: [
      { title: 'Son Dosyalar', code: 'Path: /Projects', explanation: 'Proje klasöründeki dosyaları listeler.' },
    ],
    usecases: [
      { title: 'Rapor Kontrolü', flow: ['OneDrive List', 'Loop', 'Check Name'], desc: 'Klasörde yeni rapor var mı kontrol et.' },
    ]
  },

  // ─── GOOGLE ───
  {
    id: 'GOOGLE_SHEETS',
    title: 'Google Sheets',
    type: 'google',
    summary: 'E-Tabloları gerçek zamanlı veritabanı olarak kullan — oku, yaz, güncelle.',
    tags: ['google', 'sheets', 'spreadsheet', 'tablo', 'veri', 'csv'],
    overview: [
      { type: 'section', title: '🔧 Service Account Kurulumu', body: '1. Google Cloud Console → Yeni Proje<br>2. APIs → Google Sheets API Etkinleştir<br>3. Credentials → Service Account Oluştur<br>4. JSON Key indir<br>5. <code>client_email</code>\'i kopyala<br>6. E-Tabloya → Paylaş → Bu email\'e Editör yetkisi ver' },
      { type: 'tip', title: 'Append vs Overwrite', body: '<code>USER_ENTERED</code> modunda veriler Excel formülü olarak işlenir (=TOPLA(...)).<br><code>RAW</code> modunda metin olarak kaydedilir. Formül yazılmayacaksa RAW tercih edin.' },
    ],
    params: [
      { name: 'Action', type: 'Select', required: true, desc: 'Read • Append Row • Update Cell • Clear Range' },
      { name: 'Spreadsheet ID', type: 'String', required: true, desc: 'URL\'deki /spreadsheets/d/XXX/edit kısmındaki XXX' },
      { name: 'Range', type: 'String', required: true, desc: 'Sayfa1!A1:C10 formatında. Append için sadece Sayfa1!A:A' },
      { name: 'Credentials', type: 'Credential', required: true, desc: 'Service Account JSON credential.' },
    ],
    output: { schema: `{ "updatedCells": 4, "updatedRange": "Kurlar!A5:D5", "data": [["2026-01-15", "32.45", "36.21"]] }`, desc: 'Read işleminde <code>data</code> 2D array döner. Write\'da güncelleme bilgisi.' },
    examples: [
      { title: 'Döviz Kuru Kaydı', code: 'Action: Append Row\nSpreadsheet ID: 1BxiMVs0...\nRange: Kurlar!A:D\nValues: [[{{$now}}, {{usd}}, {{eur}}, {{gbp}}]]', explanation: '5 dakikada bir döviz kurunu Sheets\'e kaydeder.' },
    ],
    usecases: [
      { title: 'Kur Takip Dashboard', flow: ['Cron 5dk', 'HTTP (Kur API)', 'Sheets (Yaz)', 'IF (Alarm?)', 'WhatsApp'], desc: 'Döviz kurunu takip et, belirli seviyeye gelince bildir.' },
    ]
  },
  {
    id: 'DRIVE_UPLOAD',
    title: 'Google Drive Upload',
    type: 'google',
    summary: 'Dosyaları Google Drive\'a yükle.',
    tags: ['google', 'drive', 'upload', 'yedek', 'bulut'],
    overview: [
      { type: 'section', title: '☁️ Google Drive', body: 'Dosyalarınızı güvenle Google Drive hesabınıza yükleyin.' },
    ],
    params: [
      { name: 'File', type: 'File', required: true, desc: 'Yüklenecek dosya.' },
      { name: 'Folder', type: 'String', required: false, desc: 'Hedef klasör ID veya adı.' },
    ],
    output: { schema: `{ "fileId": "1AbCd...", "webViewLink": "..." }`, desc: 'Dosya linki.' },
    examples: [
      { title: 'Yedekle', code: 'File: {{pdf}}\nFolder: Backups', explanation: 'PDF\'i yedekler.' },
    ],
    usecases: [
      { title: 'Otomatik Arşiv', flow: ['Gen PDF', 'Drive Upload', 'Email Send'], desc: 'Raporu oluştur, yükle ve linkini mail at.' },
    ]
  },
  {
    id: 'CALENDAR_READ',
    title: 'Google Calendar Read',
    type: 'google',
    summary: 'Yaklaşan etkinlikleri ve toplantıları listele.',
    tags: ['google', 'calendar', 'takvim', 'etkinlik', 'ajanda'],
    overview: [
      { type: 'section', title: '📅 Günlük Plan', body: 'Bugünkü veya belirli bir tarih aralığındaki etkinlikleri çeker.' },
    ],
    params: [
      { name: 'Time Range', type: 'Select', required: true, default: 'Today', desc: 'Today • Tomorrow • Week' },
      { name: 'Calendar ID', type: 'String', required: false, default: 'primary', desc: 'Takvim ID.' },
    ],
    output: { schema: `{ "events": [{ "summary": "Toplantı", "start": "..." }] }`, desc: 'Etkinlik listesi.' },
    examples: [
      { title: 'Sabah Ajandası', code: 'Time: Today', explanation: 'Bugünkü toplantıları getir.' },
    ],
    usecases: [
      { title: 'Toplantı Hatırlatıcı', flow: ['Calendar Read', 'Loop', 'WhatsApp Send'], desc: 'Günün toplantılarını sabah özet geç.' },
    ]
  },
  {
    id: 'CALENDAR_CREATE',
    title: 'Google Calendar Create',
    type: 'google',
    summary: 'Takvime yeni etkinlik ekle.',
    tags: ['google', 'calendar', 'oluştur', 'randevu', 'plan'],
    overview: [
      { type: 'section', title: '➕ Etkinlik Ekleme', body: 'Hızlıca takvime yeni bir etkinlik veya hatırlatıcı ekleyin.' },
    ],
    params: [
      { name: 'Summary', type: 'String', required: true, desc: 'Etkinlik başlığı.' },
      { name: 'Start Time', type: 'Date', required: true, desc: 'Başlangıç zamanı.' },
      { name: 'Duration', type: 'Number', required: false, default: '60', desc: 'Süre (dakika).' },
    ],
    output: { schema: `{ "eventId": "...", "status": "confirmed" }`, desc: 'Oluşturulan etkinlik.' },
    examples: [
      { title: 'Randevu Al', code: 'Summary: "Dişçi"\nStart: "2026-02-20T14:00:00"', explanation: 'Randevuyu kaydeder.' },
    ],
    usecases: [
      { title: 'Otomatik Planlama', flow: ['Email Read', 'AI Extract Date', 'Calendar Create'], desc: 'Maildeki randevu tarihini takvime işler.' },
    ]
  },

  // ─── AUDIO ───
  {
    id: 'SPEAK_TEXT',
    title: 'Speak Text (TTS)',
    type: 'audio',
    summary: 'Metni doğal insan sesiyle cihaz hoparlöründen oku.',
    tags: ['audio', 'tts', 'sesli', 'konuşma', 'hoparlör', 'bildirim'],
    overview: [
      { type: 'section', title: '🔊 Kullanım Senaryoları', body: '• Sabah rutini: Hava durumu, haberler, takvim sesli okunur<br>• Alarm: Kur alarmı yerine sesli uyarı<br>• Yemek tarifi: Eller serbest adım adım yönlendirme<br>• Çocuklar için: Uyku vakti hikayesi' },
      { type: 'section', title: '🎭 Ses Seçenekleri', body: 'Türkçe Erkek, Türkçe Kadın, İngilizce US/UK, Almanca ve daha fazlası. Her ses farklı vurgu ve ritim özelliğine sahip.' },
    ],
    params: [
      { name: 'Text', type: 'String', required: true, desc: 'Okunacak metin. {{değişken}} kullanılabilir. Maks 5000 karakter.' },
      { name: 'Voice', type: 'Select', required: false, default: 'tr-TR-EmelNeural', desc: 'Ses tonu ve dil seçimi.' },
      { name: 'Rate', type: 'Slider', required: false, default: '1.0', desc: 'Konuşma hızı. 0.5 (yavaş) → 2.0 (hızlı)' },
      { name: 'Volume', type: 'Slider', required: false, default: '0.8', desc: 'Ses seviyesi. 0.0 → 1.0' },
    ],
    output: { schema: `{ "duration": 4.2, "charactersSpoken": 87, "status": "completed" }`, desc: 'Konuşma süresi saniye cinsinden.' },
    examples: [
      { title: 'Sabah Bülteni', code: 'Text: "Günaydın! Bugün {{tarih}}. Hava: {{hava_desc}}. Dolar: {{kur}} TL. {{haber_ozet}}"\nVoice: tr-TR-EmelNeural\nRate: 1.1', explanation: 'Sabah rutininin sonunda tüm bilgileri sesli özetler.' },
    ],
    usecases: [
      { title: 'Sesli Sabah Gazetesi', flow: ['Cron 07:30', 'Paralel: Hava+Haberler+Takvim', 'AI (Birleştir)', 'Speak'], desc: 'Sabah bilgilerini sesli olarak oku.' },
    ]
  },
  {
    id: 'SPEECH_TO_TEXT',
    title: 'Speech-to-Text (Listen)',
    type: 'audio',
    summary: 'Mikrofonu aç, söylenenleri metne çevir — eller serbest komut verme.',
    tags: ['audio', 'stt', 'speech', 'dinle', 'transkript', 'komut'],
    overview: [
      { type: 'section', title: '🎙️ Nasıl Çalışır?', body: 'Düğüm çalıştığında cihaz mikrofonu açılır ve dinleme modu başlar. Konuşma bittiğini algılayınca (sessizlik eşiği) metne çevirir ve bir sonraki düğüme gönderir.' },
      { type: 'tip', title: 'Gürültü Engelleme', body: 'Arka plan gürültüsü engelleme aktif. Mutfakta pişirme yaparsanız bile ses komutlarınızı algılar.' },
    ],
    params: [
      { name: 'Language', type: 'String', required: true, desc: 'Konuşma dili. tr-TR, en-US, de-DE vb.' },
      { name: 'Silence Threshold', type: 'Number', required: false, default: '1500', desc: 'Sessizlik eşiği (ms). Bu süre sessizlik sonrası kayıt durur.' },
      { name: 'Prompt', type: 'String', required: false, desc: 'Kullanıcıya gösterilecek yönerge.' },
    ],
    output: { schema: `{ "transcript": "Bugünkü hava nasıl olacak?", "confidence": 0.97, "duration": 2.3 }`, desc: '<code>transcript</code> metne çevrilmiş konuşmadır.' },
    examples: [
      { title: 'Sesli Not Alma', code: 'Language: tr-TR\nPrompt: "Ne not almak istersiniz?"\n→ AI Agent: "Bunu Notion formatına çevir"\n→ Notion Sayfa Oluştur', explanation: 'Sesle not söyleyin, AI düzenlesin, Notion\'a kaydedin.' },
    ],
    usecases: [
      { title: 'Sesli Asistan', flow: ['Speak (Soru)', 'Speech-to-Text', 'AI Agent', 'Speak (Cevap)'], desc: 'Sor-dinle-cevapla döngüsüyle konuşan asistan.' },
    ]
  },

  // ─── MEMORY ───
  {
    id: 'ADD_TO_MEMORY',
    title: 'Remember (Memory)',
    type: 'memory',
    summary: 'AI\'nın sizi tanıması için önemli bilgileri kalıcı hafızaya yaz.',
    tags: ['memory', 'hafıza', 'rag', 'vektör', 'kişiselleştirme'],
    overview: [
      { type: 'section', title: '🧠 Kalıcı Öğrenme', body: 'Normal konuşmalarda AI her sohbette sıfırdan başlar. Memory düğümü ile önemli bilgileri kalıcı olarak saklar. Sonraki sorularda bu bilgiler "bağlam" olarak AI\'a verilir.' },
      { type: 'section', title: '🛡️ Gizlilik', body: 'Hafıza verileri sadece sizin cihazınızda (Edge Memory) şifreli olarak saklanır. Sunucuya yüklenmez. Sadece sizin akışlarınız erişebilir.' },
      { type: 'tip', title: 'Ne Kaydetmeli?', body: 'Tercihler, alışkanlıklar, önemli tarihler, proje detayları. Örn: "En sevdiğim müzik türü jazz", "Köpeğimin adı Pamuk", "Diyet: Glütensiz"' },
    ],
    params: [
      { name: 'Context', type: 'Text', required: true, desc: 'Hafızaya alınacak bilgi. Net ve özlü yazın.' },
      { name: 'Tags', type: 'String[]', required: false, desc: 'Arama için etiketler. Örn: ["tercih", "diyet", "aile"]' },
      { name: 'Expiry', type: 'Date', required: false, desc: 'Hafıza silme tarihi. Belirtilmezse kalıcıdır.' },
    ],
    output: { schema: `{ "memoryId": "mem_9xK2", "stored": true, "vectorized": true }`, desc: 'Vektör veritabanına kaydedildi.' },
    examples: [
      { title: 'Kullanıcı Tercihi', code: 'Context: "Kullanıcı sabah özetleri için saat 07:30\'u tercih ediyor. Haber: teknoloji ve finans. Sesli okuma hızı: 1.2x."\nTags: ["tercih", "sabah-rutini"]', explanation: 'Sabah rutini tercihleri kalıcı olarak hatırlanır.' },
    ],
    usecases: [
      { title: 'Kişiselleşen Asistan', flow: ['Chat (Tercih Öğren)', 'Remember (Kaydet)', '... sonraki sohbet ...', 'Recall (Hatırla)', 'Kişisel Cevap'], desc: 'AI her sohbette daha iyi tanır.' },
    ]
  },
  {
    id: 'SEARCH_MEMORY',
    title: 'Recall (Search Memory)',
    type: 'memory',
    summary: 'Hafızadan anlama en yakın bilgiyi anında bul (vektör arama).',
    tags: ['memory', 'hafıza', 'rag', 'arama', 'vektör', 'bağlam'],
    overview: [
      { type: 'section', title: '🔍 Semantik Arama', body: 'Anahtar kelime araması değil, anlam araması yapar. "Diş doktoru" sorusuna "dişçi randevusu" yazan kaydı bulur.' },
      { type: 'tip', title: 'AI ile Kombine', body: 'Recall → AI Agent kombinasyonu güçlü bir RAG sistemi oluşturur. Çekilen bağlamı Prompt\'a ekleyin: <code>Bağlam: {{recall.results}}\\nSoru: {{userInput}}</code>' },
    ],
    params: [
      { name: 'Query', type: 'String', required: true, desc: 'Aranacak soru veya anahtar kelime.' },
      { name: 'Top K', type: 'Number', required: false, default: '5', desc: 'Kaç sonuç getirilsin? 1-20 arası.' },
      { name: 'Min Similarity', type: 'Number', required: false, default: '0.7', desc: 'Minimum benzerlik skoru (0-1). Düşükse alakasız sonuç gelir.' },
    ],
    output: { schema: `{ "results": [ { "content": "Dişçi randevusu: 16 Ocak saat 10:00", "similarity": 0.94, "tags": ["randevu"] } ], "count": 3 }`, desc: 'En ilgili kayıtlar benzerlik skoru ile döner.' },
    examples: [
      { title: 'Kişisel Asistan Sorusu', code: 'Query: "{{userInput}}"\nTop K: 5\n→ AI Agent:\n  Prompt: "Bağlam: {{recall.results}}\\nSoru: {{userInput}}\\nCevapla."', explanation: 'Kullanıcı sorusuna hafızadan bağlam çekilerek kişisel cevap verilir.' },
    ],
    usecases: [
      { title: 'RAG Sohbet Botu', flow: ['Chat Input', 'Recall (Bağlam)', 'AI Agent (Cevap)', 'Speak/Reply'], desc: 'Hafızaya dayalı kişisel bilgi asistanı.' },
    ]
  },

  // ─── DEVICE ───
  {
    id: 'LIGHT_SENSOR',
    title: 'Light Sensor',
    type: 'device',
    summary: 'Cihazın ışık sensöründen ortam parlaklığı (LUX) oku.',
    tags: ['device', 'sensör', 'lux', 'ışık', 'gece modu', 'ortam'],
    overview: [
      { type: 'section', title: '💡 LUX Değer Rehberi', body: '<code>0–10 LUX</code> Zifiri karanlık (gece)<br><code>50–150 LUX</code> Alacakaranlık<br><code>150–500 LUX</code> Normal iç mekan<br><code>500–1000 LUX</code> Aydınlık ofis<br><code>10000+ LUX</code> Güneş ışığı' },
      { type: 'tip', title: 'Histeresis', body: 'Sürekli değişen ışık için IF koşuluna histeresis ekleyin. Örn: Açma için <code>lux < 50</code>, kapatma için <code>lux > 200</code>. Böylece sürekli aç-kapa olmaz.' },
    ],
    params: [],
    output: { schema: `{ "lux": 45.2, "condition": "dim", "timestamp": "2026-01-15T19:30:00.000Z" }`, desc: '<code>lux</code> anlık parlaklık değeri.' },
    examples: [
      { title: 'Otomatik Gece Modu', code: 'IF {{lux}} < 30\n→ True: Telefon ekranı parlaklığını azalt + Akıllı lamba aç\n→ False: Normal mod', explanation: 'Hava kararınca telefon ve ev otomasyonu birlikte devreye girer.' },
    ],
    usecases: [
      { title: 'Akıllı Ev Bütünleşik', flow: ['Cron (30dk)', 'Light Sensor', 'IF (Karanlık?)', 'Smart Home API (Lamba)'], desc: 'Günün ışık durumuna göre ev aydınlatmasını otomatik yönet.' },
    ]
  },
  {
    id: 'PEDOMETER',
    title: 'Pedometer (Adım Sayar)',
    type: 'device',
    summary: 'Akselerometreden direkt adım sayısını oku — Google Fit gerektirmez.',
    tags: ['device', 'adım', 'sağlık', 'fitness', 'akselerometri'],
    overview: [
      { type: 'section', title: '🏃 Donanım Tabanlı Okuma', body: 'Google Fit veya Apple Health API\'sine bağımlı değil. Cihaz donanımından direkt adım verisi okur. Daha hızlı ve gizlilik odaklı.' },
    ],
    params: [{ name: 'Reset Mode', type: 'Select', required: false, desc: 'Daily: Her gün sıfırla • Session: Akış başlayınca sıfırla • Cumulative: Sıfırlama yok' }],
    output: { schema: `{ "steps": 8432, "date": "2026-01-15", "calories": 312, "distanceKm": 5.8 }`, desc: 'Adım sayısı, kalori ve mesafe.' },
    examples: [
      { title: 'Motivasyon Bildirimi', code: 'Cron: Saat 20:00\n→ Pedometer\n→ IF steps > 10000\n   True: "🎉 Hedefi tamamladın! {{steps}} adım"\n   False: "Eksik: {{10000-steps}} adım kaldı!"', explanation: 'Akşam adım kontrolü ile motivasyon mesajı.' },
    ],
    usecases: [
      { title: 'Fitness Takip', flow: ['Cron 21:00', 'Pedometer', 'Sheets (Günlük Log)', 'IF (Hedef)', 'WhatsApp Tebrik'], desc: 'Günlük adım hedefini takip et, ulaşınca tebrik gönder.' },
    ]
  },
  {
    id: 'BATTERY_LEVEL',
    title: 'Battery Level',
    type: 'device',
    summary: 'Cihazın pil durumunu ve şarj bilgisini oku.',
    tags: ['device', 'pil', 'şarj', 'battery', 'güç'],
    overview: [
      { type: 'section', title: '🔋 Güç Yönetimi', body: 'Pil seviyesini (%) ve şarj durumunu (Şarj oluyor/olmuyor) kontrol eder. Düşük pil otomasyonları için idealdir.' },
    ],
    params: [],
    output: { schema: `{ "level": 85, "isCharging": true }`, desc: 'Pil yüzdesi ve durumu.' },
    examples: [
      { title: 'Düşük Pil Uyarısı', code: 'IF level < 20 AND isCharging == false\n→ Speak "Şarja tak!"', explanation: 'Pil %20 altına inince sesli uyarır.' },
    ],
    usecases: [
      { title: 'Şarj Dolunca Uyar', flow: ['Cron 5dk', 'Battery Level', 'IF level > 90', 'Speak "Şarj doldu"'], desc: 'Pil sağlığı için tam dolmadan uyar.' },
    ]
  },

  // ─── MCP (Model Context Protocol) ───
  {
    id: 'MCP_OVERVIEW',
    title: 'MCP Araçları (Genel Bakış)',
    type: 'mcp',
    summary: '31 MCP aracıyla Google, Microsoft, Notion, Slack, Jira, Trello, Asana, Airtable, Zapier ve GitHub entegrasyonu.',
    tags: ['mcp', 'entegrasyon', 'api', 'google', 'microsoft', 'notion', 'slack', 'jira', 'trello'],
    overview: [
      { type: 'section', title: '🔌 MCP Nedir?', body: 'Model Context Protocol (MCP), AI asistanların dış servislerle doğrudan etkileşim kurmasını sağlayan standart bir protokoldür. BreviAI\'daki AGENT_AI node\'u bu araçları otomatik olarak kullanabilir.' },
      { type: 'section', title: '📦 Mevcut Entegrasyonlar', body: '<strong>Google (7 araç):</strong> Sheets oku/yaz, Gmail oku, Drive listele, Calendar listele/oluştur, Meet oluştur<br><br><strong>Microsoft (9 araç):</strong> Outlook oku/gönder, Calendar listele/oluştur, OneDrive listele/ara, Excel oku/yaz, Teams toplantı<br><br><strong>İş Yönetimi (12 araç):</strong> Notion ara/sayfa oluştur, Slack mesaj/kanallar, Trello kart listele/oluştur, Jira issue ara/oluştur, Asana görev listele/oluştur, Airtable kayıt oku, Zapier webhook<br><br><strong>Diğer (3 araç):</strong> GitHub repo listele, Web arama, Şablon listele' },
      { type: 'tip', title: 'Nasıl Kullanılır?', body: 'MCP araçları AGENT_AI node\'u tarafından otomatik çağrılır. Kullanıcı "Jira\'da issue oluştur" veya "Slack\'e mesaj at" dediğinde agent ilgili MCP aracını kendisi seçer ve çalıştırır.' },
      { type: 'warn', title: 'Kimlik Doğrulama', body: 'Her MCP aracı bir access token veya API key gerektirir. Google ve Microsoft araçları için <strong>Ayarlar → Hesaplar</strong> üzerinden OAuth ile giriş yapın. Diğer servisler için API anahtarlarınızı girin.' },
    ],
    params: [],
    output: { schema: `{ "tool": "breviai.google.calendar_list", "result": { "events": [...] } }`, desc: 'Her MCP aracının çıktısı araç tipine göre değişir.' },
    examples: [
      { title: 'Takvim Sorgula', code: 'AGENT_AI Prompt:\n"Yarınki toplantılarımı listele"\n\n→ Agent otomatik çağırır:\nbreviai.google.calendar_list', explanation: 'Agent kullanıcı isteğini analiz edip doğru MCP aracını seçer.' },
      { title: 'Slack Bildirim', code: 'AGENT_AI Prompt:\n"Slack\'teki #general kanalına proje durumunu bildir"\n\n→ Agent çağırır:\nbreviai.slack.send_message', explanation: 'Agent mesajı oluşturup Slack kanalına gönderir.' },
    ],
    usecases: [
      { title: 'Sabah Brifingi', flow: ['Cron 09:00', 'Agent (Calendar+Mail+Hava)', 'Speak Text', 'WhatsApp'], desc: 'Her sabah takvim, mail ve hava durumunu MCP ile çekip sesli bildirir.' },
      { title: 'Proje Yönetimi', flow: ['Manual Trigger', 'Agent (Jira+Notion+Slack)', 'Show Text'], desc: 'Jira görevlerini çek, Notion\'a kaydet, Slack\'e bildir.' },
    ]
  },
  {
    id: 'MCP_BUSINESS',
    title: 'MCP İş Yönetimi Araçları',
    type: 'mcp',
    summary: 'Notion, Slack, Trello, Jira, Asana, Airtable ve Zapier MCP entegrasyonları.',
    tags: ['mcp', 'notion', 'slack', 'trello', 'jira', 'asana', 'airtable', 'zapier'],
    overview: [
      { type: 'section', title: '🏢 İş Araçları', body: '<strong>Notion:</strong> Sayfa/DB arama, yeni sayfa oluşturma<br><strong>Slack:</strong> Kanal mesajı gönderme, kanal listesi<br><strong>Trello:</strong> Board kartlarını listeleme, kart oluşturma<br><strong>Jira:</strong> JQL ile issue arama, yeni issue oluşturma<br><strong>Asana:</strong> Proje görevlerini listeleme, görev oluşturma<br><strong>Airtable:</strong> Base tablodan kayıt okuma<br><strong>Zapier:</strong> Catch Hook tetikleme (JSON payload)' },
      { type: 'tip', title: 'API Anahtarları', body: 'Her servisin kendi API anahtarı gerektirir:<br>• <strong>Notion:</strong> Internal Integration Token<br>• <strong>Slack:</strong> Bot User OAuth Token (xoxb-...)<br>• <strong>Trello:</strong> API Key + Token<br>• <strong>Jira:</strong> Email + API Token<br>• <strong>Asana:</strong> Personal Access Token<br>• <strong>Airtable:</strong> Personal Access Token' },
    ],
    params: [
      { name: 'Tool Name', type: 'String', required: true, desc: 'Çağrılacak MCP aracı. Örn: breviai.jira.create_issue' },
      { name: 'Args', type: 'JSON', required: true, desc: 'Araca gönderilecek parametreler.' },
    ],
    output: { schema: `{ "tool": "breviai.jira.create_issue", "result": { "key": "PROJ-123", "url": "..." } }`, desc: 'Oluşturulan kayıt bilgisi.' },
    examples: [
      { title: 'Jira Issue Oluştur', code: 'Tool: breviai.jira.create_issue\nArgs: {\n  domain: "sirket.atlassian.net",\n  project: "PROJ",\n  summary: "Login butonu çalışmıyor",\n  issueType: "Bug"\n}', explanation: 'Jira\'da yeni bir bug kaydı açar.' },
      { title: 'Notion Sayfa Oluştur', code: 'Tool: breviai.notion.create_page\nArgs: {\n  parentPageId: "abc123",\n  title: "Toplantı Notları",\n  content: "{{ai_summary}}"\n}', explanation: 'Notion\'da yeni sayfa oluşturup içerik yazar.' },
    ],
    usecases: [
      { title: 'Bug Takip', flow: ['WhatsApp Trigger', 'AI Analiz', 'Jira Create Issue', 'Slack Bildir'], desc: 'WhatsApp\'tan gelen bug raporunu Jira\'ya yaz, Slack\'ten bildir.' },
    ]
  },
  {
    id: 'MCP_SCHEDULED',
    title: 'MCP Zamanlanmış Görevler',
    type: 'mcp',
    summary: 'Backend cron ile MCP araçlarını zamanlanmış olarak çalıştır — sunucu kapanmadıkça çalışır.',
    tags: ['mcp', 'cron', 'zamanlanmış', 'schedule', 'backend', 'otomasyon'],
    overview: [
      { type: 'section', title: '⏰ Sunucu Tarafı Zamanlama', body: 'Backend cron-manager ile MCP araçlarını zamanlanmış olarak çalıştırabilirsiniz. Telefon kapalı olsa bile sunucu üzerinde çalışmaya devam eder. <code>mcp_call</code> (tek araç) ve <code>multi_mcp</code> (çoklu araç zinciri) action tipleri desteklenir.' },
      { type: 'section', title: '📂 JSON Formatı', body: 'Otomasyon tanımları <code>automations/</code> klasörüne JSON olarak kayıt edilir. <code>schedule</code> alanında standart cron ifadesi kullanılır: <code>0 9 * * 1-5</code> (Hafta içi 09:00).' },
      { type: 'tip', title: 'Cron İfade Örnekleri', body: '• <code>0 9 * * 1-5</code> → Hafta içi sabah 09:00<br>• <code>*/30 * * * *</code> → Her 30 dakikada bir<br>• <code>0 0 1 * *</code> → Her ayın ilk günü gece yarısı<br>• <code>0 18 * * 5</code> → Her Cuma 18:00' },
    ],
    params: [
      { name: 'Schedule', type: 'Cron', required: true, desc: 'Cron ifadesi. Örn: 0 9 * * 1-5' },
      { name: 'Action Type', type: 'Select', required: true, desc: 'mcp_call (tek araç) veya multi_mcp (zincir)' },
      { name: 'Steps', type: 'JSON', required: true, desc: 'Çalıştırılacak MCP araç adımları.' },
    ],
    output: { schema: `{ "steps": [{ "tool": "breviai.google.calendar_list", "result": {...} }, { "tool": "whatsapp_send", "result": {...} }] }`, desc: 'Her adımın sonucu sırayla döner.' },
    examples: [
      { title: 'Sabah Brifingi', code: 'Schedule: 0 9 * * 1-5\nSteps:\n  1. Calendar List → Etkinlikleri çek\n  2. Gmail Read → Okunmamış mailler\n  3. Web Search → Hava durumu\n  4. WhatsApp Send → Özet gönder\n  5. Speak Text → Sesli brifing', explanation: 'Her sabah 09:00\'da çalışır, takvim+mail+hava durumu çekip WhatsApp\'tan ve sesli bildirir.' },
    ],
    usecases: [
      { title: 'Akıllı Sabah Brifingi', flow: ['Cron 09:00', 'MCP Calendar', 'MCP Gmail', 'MCP Web Search', 'WhatsApp + Speak'], desc: 'Tam otomatik sabah brifingi: takvim, mail, hava durumu, döviz — sesli ve yazılı.' },
    ]
  },
];

