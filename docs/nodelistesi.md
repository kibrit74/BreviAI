# BreviAI Workflow Node Listesi

Bu liste, BreviAI otomasyon sisteminde bulunan tüm yapı taşlarını (node) içerir.

## 📋 Node Listesi

| Node Tipi (ID) | İsim | Açıklama | Kategori |
|----------------|------|----------|----------|
| **MANUAL_TRIGGER** | Manuel Başlat | Kullanıcı elle başlatır | trigger |
| **TIME_TRIGGER** | Zamanlı Başlat | Belirli saatte otomatik başlar | trigger |
| **NOTIFICATION_TRIGGER** | Bildirim Yakalayıcı | Uygulama bildirimleriyle tetiklenir (WhatsApp vb.) | trigger |
| **EMAIL_TRIGGER** | E-posta Tetikleyici | Gelen e-postaları yakalar (Gmail) | trigger |
| **TELEGRAM_TRIGGER** | Telegram Tetikleyici | Gelen mesajları yakalar | trigger |
| **GEOFENCE_ENTER_TRIGGER** | Coğrafi Sınıra Girme | Belirtilen alana girildiğinde tetiklenir | trigger |
| **GEOFENCE_EXIT_TRIGGER** | Coğrafi Sınırdan Çıkma | Belirtilen alandan çıkıldığında tetiklenir | trigger |
| **DEEP_LINK_TRIGGER** | Deep Link | Link ile Tetikle | trigger |
| **GESTURE_TRIGGER** | Hareket Algıla | Salla veya çevir | trigger |
| **CALL_TRIGGER** | Arama Tetikleyici | Gelen/Giden aramada çalışır | trigger |
| **SMS_TRIGGER** | SMS Tetikleyici | Gelen SMS mesajında çalışır | trigger |
| **WHATSAPP_TRIGGER** | WhatsApp Tetikleyici | Gelen WhatsApp mesajında çalışır | trigger |
| **DELAY** | Bekle | Belirli süre bekler | control |
| **IF_ELSE** | Koşul | Koşula göre dallanır | control |
| **VARIABLE** | Değişken | Veri okur/yazar | control |
| **SPLIT_BATCHES** | Parçalara Ayır | Listeyi gruplar halinde işle | control |
| **LOOP** | Döngü | Tekrar eder | control |
| **SWITCH** | Switch | Çoklu dallanma | control |
| **CODE_EXECUTION** | Kod Çalıştır | JavaScript kodu çalıştır | processing |
| **SET_VALUES** | Değer Ata | Değişkenleri düzenle | processing |
| **IMAGE_EDIT** | Resim Düzenle | Kırp, Boyutlandır, Çevir | processing |
| **VIEW_UDF** | UDF Görüntüleyici (UYAP) | UYAP (.udf) dosyalarını görüntüler | files |
| **VIEW_DOCUMENT** | Belge Görüntüleyici | PDF, Word, Metin ve Markdown dosyalarını görüntüler | files |
| **FILE_WRITE** | Dosyaya Yaz | Dosyaya içerik yazar | files |
| **FILE_READ** | Dosya Oku | Dosyadan içerik okur | files |
| **PDF_CREATE** | PDF Oluştur | PDF dosyası oluşturur | files |
| **FILE_PICK** | Dosya Seç | Dosya veya resim seçer | files |
| **TEXT_INPUT** | Metin Girişi | Kullanıcıdan metin alır | input |
| **CLIPBOARD_READER** | Pano Oku | Panodan metin okur | input |
| **SHOW_MENU** | Menü Göster | Seçenekli menü açar | input |
| **CONTACTS_READ** | Kişi Bul | Rehberden kişi arar | input |
| **BATTERY_CHECK** | Batarya Kontrol | Batarya seviyesini kontrol eder | input |
| **NETWORK_CHECK** | Ağ Kontrol | İnternet bağlantısını kontrol eder | input |
| **LIGHT_SENSOR** | Işık Sensörü | Ortam ışık seviyesini ölçer | input |
| **PEDOMETER** | Adımsayar | Adım sayısını ölçer | input |
| **MAGNETOMETER** | Pusula | Yön bilgisini alır | input |
| **BAROMETER** | Barometre | Basınç ve yükseklik ölçer | input |
| **CAMERA_CAPTURE** | Fotoğraf Çek | Kamera ile fotoğraf çeker, (+OCR) | input |
| **NOTIFICATION** | Bildirim | Bildirim gösterir | output |
| **SHARE_SHEET** | Paylaş | Paylaşım menüsü açar | output |
| **SHOW_TEXT** | Metin Göster | Metni ekranda gösterir | output |
| **SHOW_IMAGE** | Resim Göster | Resmi ekranda gösterir | output |
| **SOUND_MODE** | Ses Modu | Sessiz/Normal mod | device |
| **SCREEN_WAKE** | Ekran Kontrolü | Ekranı açık tutar | device |
| **APP_LAUNCH** | Uygulama Aç | Uygulama başlatır | device |
| **DND_CONTROL** | Rahatsız Etmeyin | DND açar/kapatır | device |
| **BRIGHTNESS_CONTROL** | Parlaklık | Ekran parlaklığını ayarlar | device |
| **CONTACTS_WRITE** | Kişi Ekle | Rehbere kişi ekler | device |
| **FLASHLIGHT_CONTROL** | Flaş | Flaşı aç/kapa | device |
| **GLOBAL_ACTION** | Sistem Aksiyonu | Geri, Ana Ekran vb. | device |
| **MEDIA_CONTROL** | Medya Kontrolü | Oynat/Durdur/Geç | device |
| **ALARM_SET** | Alarm Kur | Alarm kurar | device |
| **PHILIPS_HUE** | Akıllı Işık (Hue) | Philips Hue lambaları kontrol eder | device |
| **BLUETOOTH_CONTROL** | Bluetooth Kontrol | Bluetooth açar/kapatır | device |
| **SETTINGS_OPEN** | Ayarları Aç | Sistem ayarlarını açar | device |
| **CALENDAR_UPDATE** | Takvim Güncelle | Etkinliği günceller | calendar |
| **CALENDAR_DELETE** | Etkinlik Sil | Takvimden etkinlik siler | calendar |
| **CALENDAR_READ** | Takvim Oku | Takvimden etkinlik okur | calendar |
| **CALENDAR_CREATE** | Etkinlik Oluştur | Takvime etkinlik ekler | calendar |
| **NAVIGATE_TO** | Navigasyon | Harita/Navigasyon açar | location |
| **GEOFENCE_CREATE** | Coğrafi Sınıra Gir | Konum tabanlı tetikleme alanı oluşturur | location |
| **LOCATION_GET** | Konum Al | Mevcut konumu alır | location |
| **WEATHER_GET** | Hava Durumu | Hava durumu bilgisi alır | location |
| **VOLUME_CONTROL** | Ses Seviyesi | Ses seviyesini ayarlar | audio |
| **SPEAK_TEXT** | Sesli Oku | Metni sesli okur | audio |
| **AUDIO_RECORD** | Ses Kaydet | Ses kaydı alır | audio |
| **SPEECH_TO_TEXT** | Sesi Yazıya Çevir | Konuşmayı metne çevirir | audio |
| **SMS_SEND** | SMS Gönder | SMS mesajı gönderir | communication |
| **EMAIL_SEND** | E-posta Gönder | E-posta gönderir | communication |
| **TELEGRAM_SEND** | Telegram Mesaj | Bot mesaj atar | communication |
| **WHATSAPP_SEND** | WhatsApp Mesaj | WhatsApp mesajı gönderir | communication |
| **SLACK_SEND** | Slack Mesaj | Webhook mesaj atar | communication |
| **DISCORD_SEND** | Discord Mesaj | Webhook mesaj atar | communication |
| **HTTP_REQUEST** | HTTP İsteği | Web API çağrısı yapar | web |
| **OPEN_URL** | Tarayıcı Aç | Linki tarayıcıda açar | web |
| **RSS_READ** | RSS Okuyucu | Haber/RSS beslemesini okur | web |
| **WEB_SEARCH** | Web Araması | İnternette arama yapar | web |
| **WEB_AUTOMATION** | Web Otomasyon | Web sitesi üzerinde işlemler yapar | web |
| **GOOGLE_TRANSLATE** | Google Çeviri | Metin çevirir | web |
| **FACEBOOK_LOGIN** | Facebook Giriş | Facebook ile giriş yapıp Token alır | social |
| **INSTAGRAM_POST** | Instagram Post | Fotoğraf paylaş (Business) | social |
| **GMAIL_SEND** | Gmail Gönder | Gmail ile e-posta gönderir | google |
| **GMAIL_READ** | Gmail Oku (BYOK) | E-postaları okur | google |
| **SHEETS_READ** | Sheets Oku | Google Sheets'ten veri okur | google |
| **SHEETS_WRITE** | Sheets Yaz | Google Sheets'e veri yazar | google |
| **DRIVE_UPLOAD** | Drive Yükle | Google Drive'a dosya yükler | google |
| **OUTLOOK_SEND** | Outlook Gönder | Outlook ile e-posta gönderir | microsoft |
| **OUTLOOK_READ** | Outlook Oku | E-postaları okur | microsoft |
| **EXCEL_READ** | Excel Oku | OneDrive üzerindeki Excel'den okur | microsoft |
| **EXCEL_WRITE** | Excel Yaz | OneDrive üzerindeki Excel'e yazar | microsoft |
| **ONEDRIVE_UPLOAD** | OneDrive Yükle | OneDrive'a dosya yükler | microsoft |
| **ONEDRIVE_DOWNLOAD** | OneDrive İndir | OneDrive'dan dosya indirir | microsoft |
| **ONEDRIVE_LIST** | OneDrive Listele | OneDrive klasör içeriğini listeler | microsoft |
| **AGENT_AI** | AI Agent | LLM ile işlem yapar | ai |
| **IMAGE_GENERATOR** | Nanobana (Resim) | Metinden görsel üretir | ai |
| **REMEMBER_INFO** | Bilgi Hatırla | Agent hafızasına bilgi kaydeder | ai |
| **DB_READ** | Veri Oku (DB) | Yerel veritabanından okur | data |
| **DB_WRITE** | Veri Yaz (DB) | Yerel veritabanına yazar | data |
| **NOTION_CREATE** | Notion Sayfa Oluştur | Notion veritabanına kayıt ekler | data |
| **NOTION_READ** | Notion Oku | Notion veritabanından veri çeker | data |

_Son Güncelleme: 03.02.2026_
