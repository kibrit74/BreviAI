# BreviAI Geliştirme Önerileri Günlüğü

## 📅 2026-02-01

### ✅ Bugün Tamamlananlar
- [x] Multi-Provider AI Support (OpenAI, Claude, Gemini)
- [x] OpenAI & Claude API Callers implementation
- [x] WhatsApp Automation View

---

## 🔬 Ar-Ge ve Araştırma (Gemini Nano)
**Durum:** Samsung S24+ üzerinde test edildi / Araştırıldı.
**Bulgular:**
- **Gemini Nano** cihazda mevcut ve ücretsiz.
- **Performans:** 3.25B parametre, 32k context window. Basit özetleme ve text işlemleri için ideal.
- **Entegrasyon:** Android AICore erişimi için Native Module (Kotlin) yazılması gerekiyor.
- **Karar:** İleride "Offline AI Mode" özelliği olarak eklenecek. Şimdilik cloud API ile devam.

---

## 🔬 Ar-Ge ve Araştırma (Voice AI)
**Konu:** AI'ın telefonla arama yapıp konuşması (Vapi.ai)
**Durum:** Araştırıldı ve Planlandı.
**Bulgular:**
- **GSM Kısıtlaması:** Android, uygulamaların telefon görüşmesine ses enjekte etmesine izin vermez.
- **Çözüm:** Vapi.ai (Cloud Voice API).
- **Maliyet:** ~$0.15 - $0.30 / dakika.
- **Plan:** `VAPI_CALL` nodu ile PDF okuyup ilgili kişiyi arayan ve konuşan agent entegrasyonu.
  - Plan dosyası: `implementation_plan_vapi.md` oluşturuldu.

---

## 📋 Gelecek Özellikler (Öncelik Sırasına Göre)

### 🔴 Yüksek Öncelik

#### 1. Agent Memory Sistemi ✅ (Tamamlandı)
- Son işlemleri kaydetme (Otomatik)
- System Prompt'a context injection
- `remember_info` tool ile aktif öğrenme (Yeni)

### 🟡 Orta Öncelik

#### 2. Proactive Agent
- Sabah selamlaşması + günlük özet
- Konum bazlı öneriler
- Takvim hatırlatmaları

#### 3. User Auth + Cloud Sync (Ertelendi)
- Supabase Auth entegrasyonu
- Workflow'ların bulut yedeklemesi
- Cihazlar arası senkronizasyon

#### 3. Proactive Agent
- Sabah selamlaşması + günlük özet
- Konum bazlı öneriler
- Takvim hatırlatmaları

#### 4. Workflow Marketplace
- Kullanıcıların şablon paylaşması
- Puan ve yorum sistemi
- Kategoriler ve arama
- API: POST /api/workflows/publish, GET /api/workflows/featured

### 🟢 Düşük Öncelik

#### 5. Multi-Step Planning
- Karmaşık görevleri parçalama
- Otomatik tool zincirleme

#### 6. Backend Proxy Servisleri
- Web Scraping Proxy
- SMTP Email Gönderim
- Push Notification Server

---

## 🧪 Test Edilecekler (Önce Bu!)
- [ ] Yeni node'ların çalışması (Discord, Notion, Hue)
- [ ] ExecutionHistory log kaydı
- [ ] Widget çalışması
- [ ] Trigger'lar (Time, Geofence, Notification)
- [ ] AI Agent tool calling

---

## 💡 Hızlı Kazanımlar (Quick Wins)
- Agent saat bazlı selamlaşma (30 dk)
- Son 5 işlemi hafızada tutma (1 saat)
- Kullanıcı tercihleri AsyncStorage (2 saat)

---

## 2026-02-19 - WhatsApp ve Runtime Duzeltmeleri

### Tamamlananlar
- `send_whatsapp` backend hatalarinda session durumu daha detayli raporlaniyor (`WHATSAPP_SESSION_NOT_READY`, `sessionStatus`, `connectUrl`, `statusUrl`).
- Backend mode basarisiz olursa uygun durumda `mode: "direct"` fallback akisi eklendi.
- Headless calismada direct mode engellendi (`_isHeadless=true`), yanlis fallback denemeleri azaltildi.
- WhatsApp trigger tarafinda telefon numarasi cikarma daha guvenli hale getirildi; mesaj govdesinden rastgele numara yakalama kisitlandi.
- Agent prompt kurallarina WhatsApp fallback davranisi eklendi.
- Tool schema tarafinda `send_whatsapp` icin opsiyonel `mode` parametresi tanimlandi.
- Reanimated 4 icin New Architecture zorlamasi eklendi:
  - `expo/app.json` -> `newArchEnabled: true`
  - `expo/eas.json` -> `EXPO_NEW_ARCH_ENABLED=1` (development/preview/production)

### Tespit Edilen Sorunlar
- Bazi isteklerde backend hala `qr_pending` donebiliyor, UI'da bagli gorunse bile aktif session id farkli olabiliyor.
- Dogrudan `http://136.109.124.154:3001/whatsapp/qr` cagrisinda `Unauthorized` hatasi alinabiliyor.

### Notlar / Aksiyon
- QR endpoint token veya `x-auth-key` ister; dogru akis:
  1. `POST /whatsapp/connect/start` (`x-auth-key` + `userId`)
  2. Donen `connectUrl` ve `statusUrl` ile devam et
- Reanimated hatasi icin sadece kod degisikligi yetmez; uygulama binary yeniden build/install edilmeli.
