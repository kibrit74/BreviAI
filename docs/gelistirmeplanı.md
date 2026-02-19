# Geliştirme Planı: Acemi Kullanıcıların Kolay Otomasyon Kurması

Tarih: 2026-02-19

Bu plan, teknik bilgisi olmayan kullanıcıların **basit ve orta seviye** otomasyonları “Lego gibi” kurabilmesi için ürün/UX, içerik ve teknik iyileştirmeleri **öncelik sırası** ile listeler. Her madde, **nerede** ve **nasıl** müdahale edilmesi gerektiğini belirtir.

---

## 1) En Yüksek Öncelik (Aşama-1)

### 1.1. “Kurulumu Başlat” Akışı (Recipe + Sihirbaz)
**Amaç:** Boş ekran korkusunu kaldırmak, kullanıcıyı ilk 30 saniyede başarıya ulaştırmak.

**Nerede müdahale:**
- `WorkflowBuilderScreen`
- Yeni bir “Recipe/Sihirbaz” ekranı veya modal

**Nasıl:**
- Açılışta “Ne yapmak istiyorsun?” kartları (3–6 hazır senaryo) göster.
- Kart seçince akış **tam kurulu** gelsin, sadece 1–2 alanı kullanıcı doldursun.
- Örnek Recipes:
  - “Sabah 08:00’de hava durumu göster”
  - “Eve gelince Wi-Fi aç”
  - “Toplantıda gelen aramalara SMS at”

**Beklenen etki:** Hızlı başarı, öğrenme eğrisi düşer.

---

### 1.2. Basit/Gelişmiş Modun Yaygınlaştırılması
**Amaç:** Teknik alanları gizleyip korkuyu azaltmak.

**Nerede müdahale:**
- `NodeConfigModal`
- Tüm konfigürasyon alanları

**Nasıl:**
- Basit modda **minimum 1-2 kritik alan** göster.
- Gelişmiş modda tüm seçenekler açılır.
- Örnek:
  - HTTP Request: sadece `URL` ve `Sonuç değişkeni`
  - Web Automation: sadece `URL` ve `Ne yapılacak? (smartGoal)`
  - Slack/Discord/Telegram: sadece `Webhook/Token + Mesaj`

**Beklenen etki:** “Teknik jargon” algısı azalır, daha fazla tamamlanan akış.

---

### 1.3. “Sürükle-Bağla” + “Boşa Bırakınca Menü Aç”
**Amaç:** Mobilde bağlantıyı parmakla doğal hale getirmek.

**Nerede müdahale:**
- `WorkflowCanvas`
- Port gesture + edge çizimi

**Nasıl:**
- Porttan sürükle › kablo parmağı takip eder.
- Hedef node’a bırakınca bağlantı kurulur.
- Boş alana bırakınca otomatik **Node Palette** açılır ve seçilen node bağlanır.

**Beklenen etki:** “Lego hissi”, hatalı bağlantı azalır.

---

### 1.4. İlk Kullanım Onboarding (Kısa, Görsel)
**Amaç:** Kullanıcıya tek seferde 3 temel hareketi öğretmek.

**Nerede müdahale:**
- `WorkflowBuilderScreen` üstünde overlay

**Nasıl:**
- 3 adımlı mini kart:
  1. “+” portuna bas
  2. Boş alana bırak
  3. Node seç › otomatik bağlanır

**Beklenen etki:** İlk kullanımda sürtünme azalır.

---

## 2) Orta Öncelik (Aşama-2)

### 2.1. “Akıllı Bağlantı” ve Tip Uyumu
**Amaç:** Yanlış bağlantıları önlemek.

**Nerede müdahale:**
- `WorkflowCanvas` edge bağlama
- `workflow-types` (port veri türleri)

**Nasıl:**
- Node portlarına “data type” meta ekle (text, image, file, number vb.).
- Uyumsuz bağlanınca çizgi **kırmızı** olsun ve bağlanmasın.

**Beklenen etki:** Hatalı akışlar azalır.

---

### 2.2. “Hızlı Eylem” Node’ları
**Amaç:** Acemi kullanıcı “tek iş” için çok node eklemek zorunda kalmasın.

**Nerede müdahale:**
- Yeni node türleri

**Nasıl:**
- “Hızlı Göster” (Text + Notification birleşik)
- “Hızlı Kaydet” (File write + paylaşım)

**Beklenen etki:** Orta seviye kullanıcılar daha hızlı sonuç alır.

---

### 2.3. Inline Yardım ve Örnekler
**Amaç:** Node ayarlarını “ne yazacağım” sorusuna çevirmek.

**Nerede müdahale:**
- `NodeConfigModal` alanları

**Nasıl:**
- Alan altına tek cümle yardım.
- Örnek input önizlemesi.

**Beklenen etki:** Boş alan korkusu azalır.

---

## 3) Daha Sonra (Aşama-3)

### 3.1. “Akış Simülasyonu / Önizleme”
**Amaç:** Çalıştırmadan önce “ne olacak?” hissini vermek.

**Nerede müdahale:**
- WorkflowEngine + UI

**Nasıl:**
- Simülasyon modunda sadece adımlar listelenir.
- Hangi node’un hangi veriyi ürettiği gösterilir.

---

### 3.2. “Şablon Pazarı” ve Topluluk
**Amaç:** Kullanıcıların hazır akışlara hızla ulaşması.

**Nerede müdahale:**
- Backend templates + UI

**Nasıl:**
- Kategorize edilmiş topluluk şablonları.
- “Kullan ve düzenle” butonu.

---

### 3.3. Akış İçinde “Neden Olmadı?”
**Amaç:** Hata ayıklama korkusunu azaltmak.

**Nerede müdahale:**
- WorkflowEngine + UI

**Nasıl:**
- Hata mesajlarını sadeleştir.
- “Şu izin eksik” gibi açık yönlendirme.

---

## 4) Teknik Notlar (Uygulama Detayları)

- **Port Tipleri:** `NODE_REGISTRY` içine `inputType/outputType` gibi alanlar eklenebilir.
- **Basit Mod Alanları:** `NodeConfigModal` içinde `isAdvanced` ile filtrelenmeli.
- **Recipe:** `docs/` altında JSON şablonları tutulabilir ve UI’da listelenebilir.
- **Onboarding:** `AsyncStorage` ile tek seferlik gösterim.

---

## Önerilen Öncelik Sırası (Özet)
1. Recipes + Sihirbaz
2. Basit/Gelişmiş Mod tüm node’lar
3. Drag-to-connect (kablo sürükleme) + boş alanda menü
4. Tip uyumu ve görsel hata önleme
5. Inline yardım + örnekler
6. Simülasyon + “Neden olmadı?”

---

## Hızlı Kazanç (1 Hafta İçinde Yapılabilecekler)
- Recipe kartları ve 3 hazır akış
- Basit/Gelişmiş toggle’ı 5–10 node’a yayma
- Bağlantı sürükleme ve boş alanda quick add

---

Bu plan uygulandığında, acemi kullanıcılar bile “sadece seçim yaparak” basit ve orta seviye otomasyon kurabilecek seviyeye gelir.

