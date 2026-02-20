# Backend Checklist

## 1) API contract
- Request/response semalari acik ve tutarli mi?
- Status kodlari semantik olarak dogru mu?
- Backward compatibility korunuyor mu?

## 2) Validation and security
- Input validation tum entrypoint'lerde var mi?
- Auth ve authorization check'leri atlanmiyor mu?
- Secret, token ve PII loglara sizmiyor mu?

## 3) Data model and migration
- Tablo/index/constraint kararlari sorgu paternine uygun mu?
- Migration ileri/geri uygulanabilir mi?
- Veri kaybi riski olan adimlar icin koruma var mi?

## 4) Reliability
- Timeout, retry ve idempotency stratejisi tanimli mi?
- External servis hatalarinda degrade/fallback davranisi var mi?
- Queue/caching stratejisi tutarli mi?

## 5) Observability
- Structured log (requestId, userId, route, latency) var mi?
- Kritik metrikler ve alarm esikleri tanimli mi?
- Hata kodlari izlenebilir ve aksiyon alinabilir mi?

## 6) Performance
- N+1, full-scan, gereksiz I/O ve fazla serialization var mi?
- Query plan ve index kullanimi incelendi mi?
- P95/P99 gecikme hedefleri karsilaniyor mu?

## 7) Testing and release
- Unit, integration ve kritik senaryolar test edildi mi?
- Rollback plani hazir mi?
- Release notunda risk ve degisiklik etkisi net mi?
