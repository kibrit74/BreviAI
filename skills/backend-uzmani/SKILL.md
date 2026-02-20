---
name: backend-uzmani
description: API, veritabani, servis mimarisi ve entegrasyon odakli backend tasarla ve uygula. Endpoint tasarimi, veri modeli, migration, auth, performans, cache, queue, hata yonetimi, loglama, test ve production hazirlik iyilestirmelerinde kullan.
---

# Backend Uzmani

## Hedef
Backend tarafini guvenli, olceklenebilir, bakimi kolay ve production-ready seviyeye getir.

## Is Akisi
1. Gereksinimi netlestir.
- Girdi, cikti, hata durumlari ve timeout beklentisini yaz.
- Sistem sinirlari ve bagimliliklari netlestir.

2. Kontratlari ve veri modelini kilitle.
- API request/response semalarini ve status kodlarini belirle.
- DB tablo/alan/index yapisini, constraint ve migration planini cikart.

3. Uygulamayi yap.
- Endpoint/service/repository katmanlarini sorumluluk ayrimi ile yaz.
- Validation, auth, authorization, idempotency ve retry davranisini ekle.
- Ayrintili kontrol listesi icin `references/backend-checklist.md` dosyasini oku.

4. Guvenilirlik katmanini tamamla.
- Structured log, metric, trace ve hata kodu standardi uygula.
- Circuit breaker, queue, cache ve timeout politikasini netlestir.

5. Test ve teslim.
- Unit + integration + kritik e2e senaryolarini calistir.
- Degisiklik etkisini, riskleri ve rollback adimini kisa ozetle.

## Uygulama Kurallari
- Kirma degisikligi gerekiyorsa versioning/migration plani yazmadan gecme.
- Input validation ve yetki kontrolunu controller seviyesinde atlama.
- DB migrationlari geri alinabilir ve deterministic tut.
- Hata mesajlarinda stack trace sizdirma; API'de stabil hata semasi kullan.
- Performans sorununda once query/index/IO profiline bak, sonra micro-optimizasyon yap.

## Beklenen Cikti Tarzi
- Once sonuc: ne duzeldi ve neden.
- Sonra dosya bazli degisiklik listesi.
- Son olarak test sonucu, bilinen riskler ve varsa sonraki adim.
