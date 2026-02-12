🚀 PRD: Uygulama Adı : BreviAI Kestirme + AI Motoru (Hybrid Architecture)Versiyon: 2.0 (Backend Entegreli)Tarih: 24.05.2024Mimari: Android (Client) + Next.js (Server/AI Gateway)1. Yönetici ÖzetiBu proje, Android kullanıcılarının doğal dil kullanarak karmaşık otomasyon senaryoları (kestirmeler) oluşturmasını sağlayan hibrit bir sistemdir.Uygulama, Android tarafında donanım erişimini (Mikrofon, Bluetooth, Wi-Fi) yönetirken, Next.js Backend tarafında Gemini 2.5/3.0 modellerini kullanarak kullanıcının niyetini çalıştırılabilir bir JSON şablonuna dönüştürür. Amaç, teknik bilgisi olmayan kullanıcılara "No-Code" otomasyon sunmaktır.2. Sistem Mimarisi ve SorumluluklarSistem iki ana bloktan oluşur: Android Client ve Next.js Server.2.1. Android Client (The Executer)Görevi: Kullanıcı arayüzünü sunmak, ses/girdi toplamak ve gelen JSON emrini uygulamak.Teknoloji: Kotlin, Jetpack Compose, WorkManager.Yetenekler:Donanım kontrolü (BT, Wi-Fi).Android Intent yönetimi (Mail, Not, SMS).Speech-to-Text (Offline/Online).2.2. Next.js Backend (The Brain)Görevi: Android'den gelen doğal dil isteğini işlemek, uygun AI modelini seçmek ve JSON üretmek.Teknoloji: Next.js (API Routes), Vercel/Node.js, Google Gemini API.Yetenekler:Prompt Router: İsteğin karmaşıklığına göre Gemini 2.5 Flash veya 3.0 Flash seçimi.JSON Validation: AI'ın ürettiği JSON'un bozuk olup olmadığını kontrol etme.Template Library: Hazır şablonları sunma.3. Kullanıcı Akışı ve API EntegrasyonuSenaryo: Kullanıcı "Toplantıdayım, not al ve yöneticime mail at" der.Input (Android): Kullanıcı butona basar ve konuşur. Android STT (Speech-to-Text) bunu metne çevirir.Request (Android -> Next.js): Uygulama, metni API'ye gönderir.POST /api/generate-shortcutBody: { "prompt": "Toplantıdayım, not al ve...", "user_context": "..." }Processing (Next.js):Backend isteği analiz eder (Uzun/Zincirleme emir mi?).Karar: Karmaşık emir -> Gemini 3.0 Flash kullanılır.AI, sistem promptuna göre bir JSON üretir.Response (Next.js -> Android):Backend, 200 OK ile JSON şablonunu döner.Execution (Android):Android motoru JSON'u parse eder.Sırasıyla: Ses kaydı başlat -> Metni al -> Mail Intent'ini hazırla -> Kullanıcıya onaylat/gönder.4. Teknik Gereksinimler & API Kontratı4.1. JSON Şablon Yapısı (Ortak Dil)Android ve Backend'in anlaşacağı standart veri yapısıdır.JSON{
  "shortcut_name": "Toplantı Modu",
  "ai_model_used": "gemini-3.0-flash",
  "steps": [
    {
      "step_id": 1,
      "type": "SYSTEM_ACTION",
      "action": "SET_DND_MODE",
      "params": { "state": "ON" }
    },
    {
      "step_id": 2,
      "type": "APP_ACTION",
      "action": "RECORD_AUDIO",
      "params": { "duration": "auto_stop_silence" },
      "output_key": "audio_transcript"
    },
    {
      "step_id": 3,
      "type": "INTENT_ACTION",
      "action": "SEND_EMAIL",
      "params": {
        "subject": "Toplantı Notları",
        "body": "{audio_transcript}",
        "recipient": "auto"
      }
    }
  ]
}
4.2. Backend API EndpointleriMethodEndpointAçıklamaGET/api/templatesAnasayfada gösterilecek hazır (curated) şablonları listeler.POST/api/generateKullanıcı promptunu alır, AI ile işler ve çalıştırılabilir JSON döner.POST/api/feedback(Opsiyonel) Başarısız/Hatalı şablonları raporlar.4.3. AI Model Stratejisi (Backend Logic)Backend içindeki PromptRouter servisi şu mantıkla çalışır:Logic: if (prompt.length < 50 && keywords.include(['aç', 'kapat', 'ayarla'])) -> Gemini 2.5 Flash (Hızlı, Ucuz).Logic: else (Çok adımlı, özetleme gerektiren, içerik üretimi) -> Gemini 3.0 Flash (Yetenekli).5. Android Uygulama Özellikleri (Frontend)5.1. Kestirme Motoru (Execution Engine)Motor, backend'den gelen JSON'daki action tiplerini şu native fonksiyonlarla eşleştirir:TOGGLE_SETTING:Wi-Fi (Android sürümüne göre panel açma veya direkt işlem).Bluetooth (BluetoothAdapter kullanımı).SEND_INTENT:Mail (Intent.ACTION_SENDTO).Not (Intent.ACTION_CREATE_DOCUMENT veya Keep entegrasyonu).MEDIA_ACTION:Ses Kaydı (MediaRecorder).NOTIFICATION_ACTION:Bildirim okuma (NotificationListenerService).5.2. UI TasarımıAna Sayfa:Hazır Şablonlar (Grid yapıda, Next.js'den fetch edilir)."Sihirli Buton": Mikrofon ikonu ile AI input ekranını açar.İşlem Ekranı (Loading State):Next.js yanıt verirken "Kestirme hazırlanıyor..." animasyonu.Manuel Düzenleme:Gelen JSON parametrelerini (örneğin mail adresi yanlışsa) kullanıcı UI üzerinden düzeltebilmeli.6. Güvenlik ve İzinler6.1. Android İzinleri (Manifest)INTERNET: Backend ile iletişim.RECORD_AUDIO: Sesli komut ve kayıt aksiyonları.BLUETOOTH_CONNECT / ADMIN: Sistem ayarları.QUERY_ALL_PACKAGES: Yüklü mail/not uygulamalarını bulmak için (Play Store'da gerekçelendirilmelidir).6.2. Backend GüvenliğiAPI Key / Auth: Uygulamanın API'yi sömürmemesi için basit bir x-app-secret başlığı veya Firebase App Check entegrasyonu.Rate Limiting: IP başına istek sınırlaması (Next.js Middleware ile).7. MVP (Minimum Viable Product) Özellik SetiFaz 1 (İlk Sürüm - Hedef):Frontend: Android Native (Kotlin).Backend: Next.js (Vercel).Aksiyonlar:Ses -> Metin (STT).Metni Mail uygulamasına aktar (Taslak olarak aç).Metni Panoya kopyala / Paylaş menüsü.Temel Bluetooth/Wi-Fi paneli açma.AI: Sadece Gemini 2.5 Flash (Maliyet ve hız optimizasyonu için başlangıçta tek model).Faz 2 (Sonraki Sürüm):AI: Gemini 3.0 Flash entegrasyonu ve otomatik model seçimi.Otomasyon: Maili kullanıcı onayı olmadan arka planda gönderme (Gmail API).Kütüphane: Kullanıcıların oluşturduğu şablonları "Topluluk" sekmesinde paylaşabilmesi.Geliştirici İçin Önerilen Klasör Yapısı (Next.js)Bash/my-ai-shortcuts-backend
  /src
    /app
      /api
        /generate
          route.ts       # AI Şablon Üretim Endpoint'i
        /templates
          route.ts       # Hazır Şablon Listesi
    /lib
      gemini.ts          # Google AI SDK Kurulumu
      prompt-templates.ts # Sistem Promtları (System Instructions)
      json-validator.ts  # AI çıktısını kontrol eden fonksiyon
Bu doküman, hem Android geliştiricisi hem de Backend geliştiricisi (veya Full-stack geliştirici) için projenin sınırlarını net bir şekilde çizer. Başlamak için onayını bekliyor! 🚀