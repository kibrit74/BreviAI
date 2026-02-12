# BreviAI Düğüm (Node) Kılavuzu

Bu kılavuz, BreviAI otomasyon sisteminde kullanabileceğiniz tüm düğümleri (nodes) ve bunların ne işe yaradığını açıklar. Her düğüm, bir iş akışının (workflow) yapı taşıdır.

## 🟢 Tetikleyiciler (Triggers)
Her akış bir tetikleyici ile başlamalıdır.

### ▶️ Manuel Başlat (MANUAL_TRIGGER)
*   **Ne Yapar:** Akışı kullanıcının elle başlatmasını bekler.
*   **Kullanım:** Kısayol butonuna tıklandığında çalışacak akışlar için.

### ⏰ Zamanlı Başlat (TIME_TRIGGER)
*   **Ne Yapar:** Akışı belirli bir saatte otomatik başlatır.
*   **Kullanım:** "Her sabah 08:00'de hava durumunu kontrol et."

---

## 🟢 Kullanıcı Etkileşimi (YENİ)
Akışın kullanıcı ile konuşmasını (Input/Output) sağlar.

### ⌨️ Soru Sor (ASK_INPUT)
*   **Ne Yapar:** Kullanıcıya bir soru sorar ve cevabını bekler.
*   **Config:** `{ prompt: "Hedefiniz?", inputType: "text" | "number" | "date", variableName: "cevap" }`

### 🎤 Sesli Giriş (DICTATE_TEXT)
*   **Ne Yapar:** Kullanıcının konuşmasını dinler ve metne çevirir (Speech-to-Text).
*   **Config:** `{ prompt: "Dinliyorum...", language: "tr-TR", variableName: "söylenen" }`

### 📋 Seçim Menüsü (SHOW_MENU)
*   **Ne Yapar:** Kullanıcıya seçenekler sunar.
*   **Config:** `{ title: "Nereye?", options: ["Ev", "İş"], variableName: "secim" }`


---

## 🔵 Mantık ve Kontrol (Logic)

### 🔀 Koşul (IF_ELSE)
*   **Ne Yapar:** Verilen şarta göre akışı iki yola ayırır (Evet/Hayır).
*   **Kullanım:** "Eğer pil %20'nin altındaysa 'Evet' yolundan git, değilse 'Hayır' yolundan git."

### ⏳ Bekle (DELAY)
*   **Ne Yapar:** Akışı belirtilen süre kadar duraklatır.
*   **Kullanım:** "Wifi açıldıktan sonra IP alması için 3 saniye bekle."

### 🔄 Döngü (LOOP)
*   **Ne Yapar:** Bir işlemi belirli sayıda tekrar eder.
*   **Kullanım:** "Rehberdeki ilk 5 kişiye sırayla mesaj at."

### 📦 Değişken (VARIABLE)
*   **Ne Yapar:** Veri saklar veya saklanan veriyi değiştirir.
*   **Kullanım:** "Sayaç değerini 1 artır."

---

## 📱 Cihaz Kontrolü

### 🔦 Fener (FLASHLIGHT_CONTROL)
*   **Ne Yapar:** Telefonun flaşını açar, kapatır veya değiştirir (toggle).

### ☀️ Parlaklık (BRIGHTNESS_CONTROL)
*   **Ne Yapar:** Ekran parlaklığını ayarlar (0-100 arası).
*   **Kullanım:** "Gece modunda parlaklığı %10 yap."

### 🔕 Rahatsız Etmeyin (DND_CONTROL)
*   **Ne Yapar:** Rahatsız Etmeyin modunu açar veya kapatır.

### 🔊 Ses Modu (SOUND_MODE)
*   **Ne Yapar:** Telefonu Sessiz, Titreşim veya Normal moda alır.

### 🚀 Uygulama Aç (APP_LAUNCH)
*   **Ne Yapar:** Seçilen bir uygulamayı başlatır.
*   **Kullanım:** "Spofity uygulamasını aç."

### 📱 Ekran Kontrolü (SCREEN_WAKE)
*   **Ne Yapar:** Ekranın kapanmasını engeller (Uyanık tutar).

### 📶 Wi-Fi Kontrol (WIFI_CONTROL)
*   **Ne Yapar:** Wi-Fi'ı açar (on), kapatır (off) veya duruma göre değiştirir (toggle).

### 🔵 Bluetooth Kontrol (BLUETOOTH_CONTROL)
*   **Ne Yapar:** Bluetooth'u açar/kapatır.

---

## 🌐 Web ve İletişim

### 🌐 HTTP İsteği (HTTP_REQUEST) (🔥 YENİ)
*   **Ne Yapar:** İnternet üzerindeki herhangi bir servise istek gönderir.
*   **Kullanım:**
    *   webhook'lara veri gönder (Zapier, Make.com).
    *   Akıllı ev cihazlarını (Home Assistant) kontrol et.
    *   Borsa/Hava durumu API'sinden veri çek.
*   **Parametreler:** URL, Metod (GET/POST), Header, Body.

### 💬 SMS Gönder (SMS_SEND)
*   **Ne Yapar:** Belirtilen numaraya SMS hazırlar veya gönderir.

### 📧 E-posta Gönder (EMAIL_SEND)
*   **Ne Yapar:** E-posta taslağı oluşturur.

---

## 💾 Veri ve Dosya

### 🔋 Batarya Kontrol (BATTERY_CHECK)
*   **Ne Yapar:** Pil seviyesini ve şarj durumunu okur. Sonucu bir değişken olarak kaydeder.
*   **Çıktı:** `batteryLevel` (Seviye), `isCharging` (Şarj oluyor mu).

### 📶 Ağ Kontrol (NETWORK_CHECK)
*   **Ne Yapar:** İnternet bağlantısını (Wifi/Hücresel) kontrol eder.

### 📍 Konum Al (LOCATION_GET)
*   **Ne Yapar:** Cihazın mevcut GPS konumunu alır.
*   **Çıktı:** Enlem, Boylam.

### 📅 Takvim Oku (CALENDAR_READ)
*   **Ne Yapar:** Yaklaşan etkinlikleri takvimden okur.
*   **⚠️ Önemli:** Bu işlem **arka planda** gerçekleşir. Takvim uygulamasını **görsel olarak açmaz**, sadece veriyi okuyup bir değişkene kaydeder.
*   **Kullanım:** "Sabah ilk toplantımın saatini öğren ve bana sesli oku."

### 📝 Dosyaya Yaz (FILE_WRITE)
*   **Ne Yapar:** Cihaz hafızasına bir metin dosyası kaydeder.

---

## 📢 Çıktı ve Bildirim

### 🔔 Bildirim (NOTIFICATION)
*   **Ne Yapar:** Ekrana bildirim (Push) veya kısa mesaj (Toast) gönderir.

### 🗣️ Sesli Oku (SPEAK_TEXT)
*   **Ne Yapar:** Yazılan metni sesli olarak okur (Text-to-Speech).
*   **Kullanım:** "Sabah uyandığında hava durumunu sesli oku."
