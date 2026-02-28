# BreviAI Roadmap

- Son Güncelleme: `28.02.2026`
- Durum ölçeği: `Tamamlandı`, `Devam Ediyor`, `Planlandı`

## 1) Kritik Durum Özeti

Tamamlandı:
- Backend fail-closed auth geçişi
- Route seviyesinde wildcard CORS temizliği
- Backend lint kapısının yeşile çekilmesi
- Mobilde dev seed/mock ayrımı için guardlar

Devam ediyor:
- Widget resize test matrisi
- Dokümantasyon standardizasyonu

Planlandı:
- Widget otomatik test kapsamının genişletilmesi

## 2) Fazlar

## Faz P0 - Güvenlik ve Kalite (Tamamlandı)

1. Auth fail-closed standardizasyonu
2. Route bazlı wildcard CORS temizliği
3. Backend lint iyileştirmeleri

Çıktı:
- Kritik güvenlik riskleri azaltıldı
- Backend kalite kapıları stabil hale geldi

## Faz P1 - Mobil Runtime Sertleştirme (Tamamlandı)

1. API base URL konfigürasyonunun environment tabanlı hale getirilmesi
2. Startup alert zincirinin sadeleştirilmesi
3. Debug araçlarının production’dan ayrıştırılması
4. Dev seed/mock verinin production akışından ayrılması

Çıktı:
- Üretim davranışı daha öngörülebilir
- İlk açılış UX’i daha temiz

## Faz P2 - Widget ve Dokümantasyon (Devam Ediyor)

1. Widget resize adaptasyonu
- Durum: `Tamamlandı`
- Not: Launcher seçeneklerine göre görünür satır/buton sayısı dinamik yönetiliyor.

2. Widget test matrisi
- Durum: `Devam Ediyor`
- Hedef: `2x2`, `2x3`, `4x2` senaryoları için tekrar üretilebilir test seti.

3. Doküman UTF-8 normalizasyonu ve senkronizasyon
- Durum: `Tamamlandı`
- Kapsam: `PRD`, `ROADMAP`, `DEVELOPMENT_LOG` temiz içerik ve encoding standardı.

## 3) Sonraki Sprint Hedefleri

1. Android widget için otomatik test iskeleti (unit/instrumentation)
2. Dokümanlarda “single source of truth” şeması
3. Release öncesi son güvenlik/doğrulama geçişi

## 4) Takvim (Tahmini)

1. Sprint A (1 hafta)
- Widget test altyapısı
- CI doğrulama adımları

2. Sprint B (1 hafta)
- Doküman governance
- Release readiness checklist

## 5) Başarı Kriterleri

1. Güvenlik kritik bulgular: `0`
2. Kalite kapıları: `tsc/test/lint` yeşil
3. Production akışında test/mock sızıntısı: `0`
4. Widget resize senaryolarında görsel/işlevsel regresyon: `0`

