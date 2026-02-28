# BreviAI PRD (Ürün Gereksinimleri Dokümanı)

- Sürüm: `3.0`
- Tarih: `28.02.2026`
- Mimari: `Expo React Native (mobil) + Next.js (backend/API gateway)`

## 1) Yönetici Özeti

BreviAI, kullanıcının doğal dille otomasyon iş akışları oluşturmasını ve bunları mobilde güvenli şekilde çalıştırmasını hedefleyen bir üründür.

Sistem iki ana parçadan oluşur:
- Mobil uygulama: UI, workflow builder, trigger/aksiyon yürütme.
- Backend: AI üretim endpointleri, şablon servisleri, kimlik doğrulama ve güvenlik katmanı.

Ana hedef kitle:
- Bireysel kullanıcılar
- Freelancer/profesyoneller
- Mobilde hızlı otomasyon isteyen teknik olmayan kullanıcılar

## 2) Ürün Amaçları

1. Doğal dil ile anlamlı workflow üretimini güvenilir hale getirmek.
2. Üretilen workflow’ların mobilde deterministik şekilde çalışmasını sağlamak.
3. Güvenlikte fail-closed yaklaşımı sürdürmek (secret/admin key eksikse endpoint açmama).
4. Üretim ortamında test/mock verinin kullanıcı akışına karışmasını engellemek.

## 3) Kapsam

Kapsam dahil:
- Workflow üretimi (`/api/generate`)
- Template katalogu (`/api/templates`)
- Workflow yürütme ve geçmiş
- Widget tetikleme ve resize adaptasyonu
- MCP tabanlı tool çağrıları

Kapsam dışı:
- Tam teşekküllü masaüstü uygulama
- Çok kiracılı enterprise yönetim paneli
- Tam offline LLM inference (araştırma konusudur)

## 4) Sistem Mimarisi

### 4.1 Mobil (Expo React Native)

Sorumluluklar:
- Kullanıcıdan prompt alma
- Workflow görsel düzenleme
- Node bazlı execution
- Trigger yönetimi (manuel, zaman, sensör, widget)
- Native köprüler (izinler, widget, bildirim dinleyici vb.)

### 4.2 Backend (Next.js)

Sorumluluklar:
- AI model yönlendirme ve üretim
- Template servisleri
- Güvenlik doğrulama (`x-app-secret`, admin key)
- Reliability, preflight, execution, outbox gibi workflow API’leri

## 5) Temel Kullanıcı Akışı

1. Kullanıcı doğal dilde komut verir.
2. Mobil uygulama promptu backend’e gönderir.
3. Backend promptu analiz eder, uygun modelle JSON workflow üretir.
4. Mobil uygulama workflow’u parse eder ve kullanıcıya düzenleme/çalıştırma imkanı verir.
5. Çalıştırma sonrası sonuç ve loglar kayıt altına alınır.

## 6) API Sözleşmesi (Özet)

### 6.1 Üretim Endpointleri

- `POST /api/generate`
- `GET /api/templates`
- `POST /api/feedback` (opsiyonel)

### 6.2 Workflow Operasyonları

- `GET/POST /api/workflows/*`
- `GET/POST /api/workflows/executions`
- `GET/POST /api/workflows/preflight`
- `GET/POST /api/workflows/reliability`

### 6.3 Güvenlik İlkeleri

- Uygulama sırları eksikse endpoint fail-closed davranır.
- Route seviyesinde wildcard CORS kullanılmaz; merkezi politika uygulanır.
- Giriş/çıkış payloadlarında doğrulama ve hata standardizasyonu zorunludur.

## 7) Workflow JSON Kontratı (Örnek)

```json
{
  "shortcut_name": "Toplantı Modu",
  "ai_model_used": "gemini-flash",
  "steps": [
    {
      "step_id": 1,
      "type": "SYSTEM_ACTION",
      "action": "SET_DND_MODE",
      "params": { "state": "ON" }
    },
    {
      "step_id": 2,
      "type": "INTENT_ACTION",
      "action": "SEND_EMAIL",
      "params": {
        "subject": "Toplantı Notları",
        "body": "{{note_text}}"
      }
    }
  ]
}
```

## 8) Başarı Ölçütleri

1. Workflow üretim başarı oranı
2. Çalıştırma başarı oranı
3. Ortalama yürütme süresi
4. Kullanıcı memnuniyeti (geri bildirim)
5. Kritik güvenlik bulgusu sayısı (hedef: 0)

## 9) Riskler ve Önlemler

- Risk: Üretimde test/mock verinin görünmesi
  Önlem: `__DEV__` veya açık env flag guardları

- Risk: Yanlış yapılandırma ile endpointlerin açık kalması
  Önlem: Fail-closed auth ve startup validation

- Risk: Mobil-native widget davranış farklılıkları
  Önlem: Resize options tabanlı adaptasyon + test matrisi

## 10) Notlar

Bu PRD, mevcut codebase ile uyumlu olacak şekilde güncellenmiştir. Önceki Kotlin/Jetpack odaklı tek katmanlı anlatım yerine güncel hibrit (Expo + Next.js) gerçekliği esas alınmıştır.

