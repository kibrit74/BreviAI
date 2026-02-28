# Web Node Operasyonel Analiz Raporu

Tarih: 2026-02-28
Proje: BreviAI
Kapsam: WEB_AUTOMATION ve web tarayici node analizi

## 1) Kapsam ve Node Tespiti

Kod tabaninda dogrudan `WEB_BROWSER` adinda bir node yoktur.
Web tarayici node karsiligi fiilen `OPEN_URL` ("Tarayici Ac") node'udur.

Bu raporda birlikte degerlendirilen node'lar:

1. `WEB_AUTOMATION` (web site uzerinde click/type/scrape)
2. `OPEN_URL` (URL acma, in-app browser veya dis tarayici)
3. `BROWSER_SCRAPE` (backend headless tarama, WEB_AUTOMATION fallback yolu)

Ana kanit referanslari:

1. `NodeType` ve metadata: `expo/src/types/workflow-types.ts` satir 111-120, 1917-1956, 2535-2544
2. `WEB_AUTOMATION` executor: `expo/src/services/nodes/web.ts` satir 421-476
3. `OPEN_URL` executor: `expo/src/services/nodes/web.ts` satir 242-286
4. `WEB_AUTOMATION` UI: `expo/src/components/WebAutomationView.tsx` satir 12-374
5. `WEB_AUTOMATION` config UI: `expo/src/components/workflow/NodeConfigModal.tsx` satir 5526-5601
6. Interaction bridge: `expo/src/services/InteractionService.ts` satir 118-126
7. Interaction modal rendering: `expo/src/components/InteractionModal.tsx` satir 719-737
8. Backend scrape executor: `expo/src/services/nodes/backend.ts` satir 235-307
9. Preflight zorunlu alanlar: `backend/src/lib/workflows/preflight.ts` satir 82-95

## 2) Mevcut Mimari Akis

### 2.1 WEB_AUTOMATION

Calisma yolu ikiye ayriliyor:

1. UI yolu
   - `executeWebAutomation` -> `interactionService.requestWebAutomation` -> `InteractionModal` -> `WebAutomationView`
2. Headless fallback yolu
   - `executeWebAutomation` icinde, `headless=true` ve uygun modda ise `runWebAutomationBrowserFallback` -> `executeBrowserScrape`

Mode davranislari:

1. `script`: sabit action listesi
2. `smart`: AI ile tek-adim karar dongusu (`decideWebAction`)
3. `interactive`: kullanici manuel tamamlar

### 2.2 OPEN_URL

1. URL resolve edilir
2. `Linking.canOpenURL` ile kontrol
3. `openExternal=false` ise once `WebBrowser.openBrowserAsync` denenir
4. Hata olursa `Linking.openURL` fallback

### 2.3 BROWSER_SCRAPE

1. Mobil node backend `/browser/scrape` endpointine gider
2. `extract` modlari: `text`, `html`, `list`, `clean_text`, `smart_data`
3. Backend servis tarafinda ek olarak `field` ve `json_path` da desteklenir

## 3) Kritik Bulgular

| Seviye | Bulgu | Kanit | Etki |
|---|---|---|---|
| Kritik | `WEB_AUTOMATION` headless fallback, metinde `wait/scroll` destekli diyor ama kodda yalnizca `scrape` actionlarini calistiriyor | `expo/src/services/nodes/web.ts` 369-380 ve 376-416 | Dinamik sayfalarda bekleme/kaydirma gerektiginde yanlis veya bos veri |
| Kritik | Tool schema ve executor beklentisi uyumsuz: tool `actions` alanini `STRING JSON` bekliyor, executor `Array` bekliyor | `expo/src/services/ToolRegistry.ts` 702-712 ve `expo/src/services/nodes/web.ts` 429-437 | Agent kaynakli web_automation cagrisinda actionlarin yutulmasi/boş kalmasi |
| Yuksek | Smart mode icin adim limiti/sure limiti yok, sonsuz dongu riski var | `expo/src/components/WebAutomationView.tsx` 105-217, 353-359 | Workflow kilitlenmesi, batarya ve API tuketimi |
| Yuksek | Preflight WEB_AUTOMATION icin sadece `url` zorunlu. `actions/smartGoal/mode` dogrulamasi yok. `OPEN_URL` ve `BROWSER_SCRAPE` zorunlu alan kontrolu da yok | `backend/src/lib/workflows/preflight.ts` 82-95 | Runtime hatalar preflight'ta yakalanmiyor |
| Yuksek | WEB_AUTOMATION sonucu mode'a gore farkli sekilde donuyor; standart output contract yok | `expo/src/services/nodes/web.ts` 439-446, 454-468 ve `WebAutomationView.tsx` 307-310, 120-123 | Sonraki nodelar icin deterministik entegrasyon zor |
| Orta | `OPEN_URL` icinde `https` prefix fallback akisi in-app tercihine saygi gostermiyor | `expo/src/services/nodes/web.ts` 253-261 | Kullanici beklentisi disi acilis davranisi |
| Orta | WEB_AUTOMATION ayar ekraninda mode secimi acik degil (`interactive` alanina UI yok) | `expo/src/components/workflow/NodeConfigModal.tsx` 5526-5601 | Kullanilabilirlik ve yanlis konfig riski |
| Orta | Dokumantasyon ornegi headless+wait kullaniyor, mevcut fallback ile calismiyor | `docs/toluotomasyon.md` 93 ve `expo/src/services/nodes/web.ts` 376-381 | Uygulayan ekipte konfizyon, hatali senaryo |
| Orta | Mobil tarafta web node test kapsami yok denecek kadar az | testlerde dogrudan web node testi bulunamadi | Regresyonlar gec fark edilir |
| Guvenlik | Client'ta sabit backend URL ve auth key fallback degeri var | `expo/src/services/nodes/backend.ts` 6-16 | Anahtar ifsasi ve servis kotu kullanim riski |

## 4) Islemsel Olgunluk Degerlendirmesi

Mevcut durum "isleyen prototip + kismi fallback" seviyesindedir.
Kurumsal operasyon seviyesi icin eksik olan ana katmanlar:

1. Deterministik action engine (adim bazli state machine)
2. Guclu preflight ve schema validasyonu
3. Standardize output contract
4. Retry/timeout/idempotency politikalari
5. Node bazli telemetry ve run analytics
6. Test matrisi (unit + integration + e2e)

## 5) Hedef Mimari (Operasyonel Model)

### 5.1 Tekil Run Sozlesmesi (standard output)

Her iki node icin de standart donus:

```json
{
  "success": true,
  "runId": "webrun_...",
  "nodeType": "WEB_AUTOMATION",
  "mode": "script",
  "url": "https://...",
  "finalUrl": "https://...",
  "steps": [
    { "id": "a1", "type": "click", "status": "ok", "durationMs": 812 }
  ],
  "data": {},
  "meta": {
    "startedAt": "2026-02-28T10:00:00.000Z",
    "finishedAt": "2026-02-28T10:00:04.200Z",
    "retries": 0
  },
  "error": null
}
```

### 5.2 WEB_AUTOMATION action DSL v2

Action alanlari aciklasin:

1. `id`
2. `type`
3. `selector`
4. `value`
5. `extract` (scrape icin ayri alan, `value` icine gizlenmesin)
6. `timeoutMs`
7. `retry` (`max`, `backoffMs`)
8. `onError` (`stop`, `continue`, `fallback`)

### 5.3 Mode guardrail

1. `smart` mode icin `maxSteps`, `maxDurationMs`, `maxConsecutiveWait`
2. `headless=true` ise unsupported actionlar preflight asamasinda yakalansin
3. Smart mode sonlandirma kriteri zorunlu olsun (`finish` veya guard timeout)

## 6) Oncelikli Iyilestirme Plani

### Faz 1 (Hemen - 1 hafta)

1. `runWebAutomationBrowserFallback` icinde `wait/scroll` actionlarini gercekten uygula
2. Tool input parser ekle: `actions` string gelirse guvenli parse edip array'e cevir
3. Preflight'a su kontrolleri ekle:
   - `OPEN_URL.url` zorunlu
   - `BROWSER_SCRAPE.url` ve `variableName` zorunlu
   - `WEB_AUTOMATION` icin mode bazli alan kontrolu
4. Smart mode guardrail ekle (`maxSteps` ve timeout)
5. Dokumantasyonu mevcut davranisla hizala

### Faz 2 (Kisa vade - 2/4 hafta)

1. WEB_AUTOMATION output contract'i standardize et
2. NodeConfig UI'ya acik mode secimi ekle (`script`, `smart`, `interactive`)
3. `OPEN_URL` icin in-app/dis tercih tutarliligini duzelt
4. `extract` alanini action schema'da first-class alan yap

### Faz 3 (Orta vade - 1/2 ay)

1. Web node telemetry:
   - success rate
   - ortalama adim suresi
   - bos scrape orani
   - fallback oranlari
2. Reliability dashboard entegrasyonu
3. Node bazli test paketi:
   - unit: parser/validator/fallback
   - integration: mock backend scrape
   - e2e: smart mode step cap ve finish path

## 7) Operasyon KPI ve SLO Onerisi

1. `WEB_AUTOMATION` run success rate >= %95
2. Smart mode ortalama adim sayisi <= 8
3. Fallback bos veri orani < %10
4. Preflight'ta yakalanan web-konfig hatasi >= runtime web-hata sayisinin %60'i
5. P95 calisma suresi:
   - OPEN_URL < 2 sn
   - BROWSER_SCRAPE < 15 sn

## 8) Sonuc

Mevcut implementasyon hizli prototip ve esnek deneme icin yeterli.
Ancak "daha islemsel" hedefi icin en kritik adimlar:

1. fallback davranisini gercek kapasiteye cekmek,
2. mode/action validasyonunu preflight'a almak,
3. web node output'unu standartlastirmak,
4. smart mode icin guardrail ve telemetry eklemek.

Bu 4 adim tamamlandiginda web node'lar deneysellikten cikarak operasyonel guvenilirlik seviyesine yaklasir.
