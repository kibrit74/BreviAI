# 🧩 BreviAI Workflow Nodları Raporu

Bu rapor, BreviAI otomasyon sisteminde kullanabileceğiniz tüm "Node" (Düğüm) türlerini ve ne işe yaradıklarını basitçe açıklar.

---

## 🟢 Başlatıcılar (Triggers)
Workflow'u başlatan olaylardır. Her akış bir tetikleyici ile başlamalıdır.

| İkon | Node Adı | Ne İşe Yarar? |
| :---: | :--- | :--- |
| ▶️ | **Manuel Başlat** | Otomasyonu uygulama içinden veya kısayoldan elle tetiklemenizi sağlar. |
| ⏰ | **Zamanlı Başlat** | Belirlenen saatte ve günlerde otomasyonu otomatik çalıştırır (Örn: Her sabah 08:00). |
| 🔔 | **Bildirim Yakalayıcı** | Başka bir uygulamadan (WhatsApp, SMS vb.) bildirim geldiğinde çalışır. İçeriği okuyabilir. |
| 👋 | **Hareket Algıla** | Telefonu salladığınızda veya ters çevirdiğinizde çalışır. |
| 📞 | **Arama Tetikleyici** | Telefon çaldığında, açıldığında veya kapandığında devreye girer. Arayan bilgisini alır. |

---

## 🎮 Kontrol ve Mantık (Control)
Akışın nasıl ilerleyeceğini yöneten araçlardır.

| İkon | Node Adı | Ne İşe Yarar? |
| :---: | :--- | :--- |
| ⏳ | **Bekle (Delay)** | Akışı belirli bir süre (saniye/dakika) duraklatır. |
| 🔀 | **Koşul (If/Else)** | Bir duruma göre "Evet" veya "Hayır" yoluna sapar (Örn: "Saat 17:00'den büyük mü?"). |
| 📦 | **Değişken** | Veri saklamak, değiştirmek veya okumak için kullanılır. |
| 🔄 | **Döngü** | Bir işlemi belirli sayıda veya bir liste boyunca tekrar ettirir. |
| 🧬 | **Switch** | Tek bir veriyi birden fazla olasılıkla kontrol edip farklı yollara ayırır (Çoklu If/Else gibi). |

---

## ⌨️ Giriş (Input)
Kullanıcıdan veya cihazdan veri almanızı sağlar.

| İkon | Node Adı | Ne İşe Yarar? |
| :---: | :--- | :--- |
| ✏️ | **Metin Girişi** | Ekrana bir pencere açıp kullanıcıdan yazı yazmasını ister. |
| 📋 | **Pano Oku** | Kopyalanmış son metni (Copy/Paste hafızası) okur. |
| 📜 | **Menü Göster** | Kullanıcıya seçenekler sunar ve seçilen şıkka göre işlem yapar. |
| 📎 | **Dosya Seç** | Galeriden resim veya dosya yöneticisinden belge seçtirir. |

---

## 📢 Çıkış (Output)
Kullanıcıya bilgi vermek veya sonuç göstermek için kullanılır.

| İkon | Node Adı | Ne İşe Yarar? |
| :---: | :--- | :--- |
| 🔔 | **Bildirim** | Telefonun bildirim çubuğunda mesaj gösterir. |
| 📤 | **Paylaş** | Metin veya dosyayı başka uygulamalarla paylaşma menüsünü açar. |
| 📄 | **Metin Göster** | Sonucu ekranda tam sayfa veya pencere olarak gösterir. |

---

## 📱 Cihaz Kontrolü (Device)
Telefonun donanım özelliklerini yönetir.

| İkon | Node Adı | Ne İşe Yarar? |
| :---: | :--- | :--- |
| 🚀 | **Uygulama Aç** | Telefonunuzdaki herhangi bir uygulamayı başlatır. |
| 🔦 | **Flaş** | Arka flaşı el feneri olarak açar veya kapatır. |
| 🔊 | **Ses Modu** | Telefonu Sessiz, Titreşim veya Normal moda alır. |
| ☀️ | **Parlaklık** | Ekran parlaklığını artırır veya azaltır. |
| 🔕 | **Rahatsız Etmeyin** | DND modunu açıp kapatır. |
| 🎵 | **Medya Kontrolü** | Müziği oynatır, durdurur, sonraki şarkıya geçer. |
| 📱 | **Sistem Aksiyonu** | Ana ekrana dönme, geri gelme, son uygulamaları açma gibi tuş görevleri. |
| 🔋 | **Batarya Kontrol** | Şarj seviyesini ve şarj durumunu kontrol eder. |
| 📶 | **Ağ Kontrol** | Wi-Fi veya Hücresel veri bağlantısını kontrol eder. |
| ⏰ | **Alarm Kur** | Telefonun saatine yeni bir alarm ekler. |

---

## 🧠 Yapay Zeka (AI)
En güçlü nodlardır. LLM ve görüntü işleme yetenekleri sunar.

| İkon | Node Adı | Ne İşe Yarar? |
| :---: | :--- | :--- |
| 🧠 | **AI Agent** | Gemini, GPT veya Claude modellerini kullanarak verdiğiniz görevi yapar. Sohbet edebilir, metin özetleyebilir. |
| 🍌 | **Nanobana (Resim)** | Yazdığınız metinden yapay zeka ile resim üretir. |
| 🗣️ | **Sesi Yazıya Çevir** | Konuşulan sesi (veya ses dosyasını) metne dönüştürür. |

---

## 🌐 Web ve İnternet
İnternet üzerindeki servislerle konuşur.

| İkon | Node Adı | Ne İşe Yarar? |
| :---: | :--- | :--- |
| 🌐 | **HTTP İsteği** | Gelişmiş kullanıcılar için API çağrıları yapar. |
| 🔗 | **Tarayıcı Aç** | Bir web sitesini tarayıcıda açar. |
| 📡 | **RSS Okuyucu** | Haber sitelerinden veya bloglardan son içerikleri çeker. |
| 🇹🇷 | **Google Çeviri** | Metinleri diller arası çevirir. |

---

## 📅 Takvim ve Ofis
Verimlilik araçlarıyla entegrasyon.

| İkon | Node Adı | Ne İşe Yarar? |
| :---: | :--- | :--- |
| 📅 | **Takvim Oku** | Telefon takvimindeki etkinlikleri listeler. |
| 📆 | **Etkinlik Oluştur** | Takvime yeni bir randevu/etkinlik ekler. |
| 📊 | **Sheets Oku** | Google Tablolar'dan veri okur. |
| 📝 | **Sheets Yaz** | Google Tablolar'a veri ekler. |
| ☁️ | **Drive Yükle** | Dosyaları Google Drive'a yedekler. |
| 📧 | **Gmail/Outlook** | E-posta gönderir veya gelen kutusunu okur. |

---

## 📍 Sensörler ve Konum
Fiziksel dünyayı algılar.

| İkon | Node Adı | Ne İşe Yarar? |
| :---: | :--- | :--- |
| 📍 | **Konum Al** | GPS üzerinden mevcut enlem/boylam ve adres bilgisini alır. |
| 👣 | **Adımsayar** | Günlük atılan adım sayısını verir. |
| 🧭 | **Pusula** | Telefonun baktığı yönü (derece) verir. |
| ☀️ | **Işık Sensörü** | Ortamdaki ışık miktarını (lux) ölçer. |

---

## 📂 Dosya İşlemleri
Yerel dosya sistemi yönetimi.

| İkon | Node Adı | Ne İşe Yarar? |
| :---: | :--- | :--- |
| 📝 | **Dosyaya Yaz** | Telefonda bir metin dosyası oluşturur veya üzerine yazar. |
| 📖 | **Dosya Oku** | Bir metin dosyasının içeriğini okur. |
| 📄 | **PDF Oluştur** | Metinleri veya resimleri PDF dosyasına dönüştürür. |
