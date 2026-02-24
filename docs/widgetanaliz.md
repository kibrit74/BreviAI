# Widget Alani Derinlemesine Analiz (Statik Kod Inceleme)

Tarih: 2026-02-24

## Kapsam

Bu analiz, widget akislarini uctan uca kod seviyesinde inceleyerek hazirlandi:

- React Native UI / config ekrani
- `WidgetService` (AsyncStorage + native bridge)
- Expo native module (`brevi-settings`)
- Android `AppWidgetProvider` (`ShortcutWidgetProvider`)
- Widget tetiklemeli headless workflow zinciri

Not: Bu rapor statik kod incelemesine dayanir. Cihaz/launcher uzerinde canli test yapilmadi.

## Kisa Mimari Ozeti

- UI config verisi JS tarafinda `AsyncStorage` icinde tutuluyor (`expo/src/services/WidgetService.ts:25`).
- Ayni config native tarafa da bridge ile senkron ediliyor (`expo/src/services/WidgetService.ts:311`, `expo/modules/brevi-settings/android/src/main/java/com/breviai/brevisettings/BreviSettingsModule.kt:500`).
- Android widget provider configi `SharedPreferences("WidgetConfigs")` icinden okuyor (`expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:298`).
- Widget tiklamasi `WorkflowExecutionReceiver` uzerinden headless task calistiriyor (`expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:213`, `expo/android/app/src/main/java/com/breviai/app/WorkflowExecutionReceiver.kt:42`).

## Bulgular (Oncelik Sirali)

### 1. Kritik: `4x2` boyutu gercekte `2x4` gibi uygulanmis (etiket/davranis uyumsuz)

Kanit:

- JS layout tanimi `4x2` icin `rows: 4, columns: 2` olarak kayitli (`expo/src/types/widget.ts:80`).
- Preview grid bu degeri dogrudan kullaniyor (`expo/src/screens/WidgetConfigScreen.tsx:269`).
- Native provider da `4x2` icin `Pair(4, 2)` donduruyor; `Pair` sirasini `(rows, cols)` olarak kullaniyor (`expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:100`).
- Native layout XML de zaten sabit 2 kolonlu satirlar halinde tasarlanmis (`expo/android/app/src/main/res/layout/widget_shortcuts.xml:16`, `expo/android/app/src/main/res/layout/widget_shortcuts.xml:39`).

Etkisi:

- Kullanici "4x2" sectiginde genellikle beklenen genis widget yerine dikey 2 kolon x 4 satir duzen gorur.
- UI preview ile native render birbirine tutarli olsa da isimlendirme kullanici beklentisiyle tutarsizdir.

Oneri:

- Ya boyut adlarini gercek davranisa gore yeniden adlandirin (`2x4` gibi), ya da gercek `4x2` icin ayri native layout/RemoteViews stratejisi ekleyin.
- Mevcut kayitli configler icin migrasyon kurali tanimlayin.

### 2. Kritik: Native sync hatalari yutuluyor, UI "Kaydedildi" dese de widget guncellenmeyebilir

Kanit:

- `saveWidgetConfig` native senkronu cagiriyor (`expo/src/services/WidgetService.ts:311`).
- `syncToNativeWidget` tum hatalari `console.warn` ile yutuyor, exception firlatmiyor (`expo/src/services/WidgetService.ts:321`, `expo/src/services/WidgetService.ts:334`).
- Ekran tarafi `updateWidgetConfig` basarili donunce direkt basari alerti gosteriyor (`expo/src/screens/WidgetConfigScreen.tsx:212`, `expo/src/screens/WidgetConfigScreen.tsx:223`).

Etkisi:

- AsyncStorage kaydi basarili olup native bridge/sync basarisiz oldugunda kullaniciya yanlis "basarili" geri bildirimi verilir.
- Uygulamadaki config ile ana ekrandaki widget gorunumu sessizce ayrisabilir.

Oneri:

- Native sync sonucunu `saveWidgetConfig` seviyesine tasiyin (hard fail veya en azindan warning state/UI mesaji).
- "Kaydedildi" mesajini JS kaydi + native sync durumu ayrimi ile gosterin.

### 3. Yuksek: Varsayilan widget degisikligi/silme akisi native tarafa tam yansimiyor (stale config riski)

Kanit:

- `setDefaultWidget` sadece AsyncStorage guncelliyor, native alias (`default_widget`) yeniden senkron edilmiyor (`expo/src/services/WidgetService.ts:277`).
- `deleteWidgetConfig` sadece AsyncStorage tarafinda silme yapiyor (`expo/src/services/WidgetService.ts:253`).
- Native provider calisirken `SharedPreferences("WidgetConfigs")` icinden okuyor ve `default_widget` fallback kullaniyor (`expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:296`, `expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:299`).
- Native bridge tarafinda widget config silmeye yonelik API gorunmuyor; sadece `update/get/save` var (`expo/modules/brevi-settings/index.ts:195`, `expo/modules/brevi-settings/index.ts:228`, `expo/modules/brevi-settings/index.ts:237`).

Etkisi:

- Varsayilan widget kimligi degistiginde native `default_widget` girdisi eski kalabilir.
- Silinen widget configleri native tarafta artik (orphan) kalabilir.

Oneri:

- `setDefaultWidget` icinde yeni default configi native `default_widget` anahtarina zorunlu sync edin.
- Native bridge'e `deleteWidgetConfig(widgetId)` ekleyin ve widget provider refresh yayinlayin.
- Android `ShortcutWidgetProvider` icinde `onDeleted` ile cleanup dusunun.

### 4. Yuksek: Widget boyut/resize akisi yarim; `resizeMode` var ama resize verisi kullanilmiyor

Kanit:

- Widget provider XML resize'i acik yapiyor (`expo/android/app/src/main/res/xml/widget_info.xml:7`) ama tek min boyut tanimi var (`expo/android/app/src/main/res/xml/widget_info.xml:3`, `expo/android/app/src/main/res/xml/widget_info.xml:4`).
- `onAppWidgetOptionsChanged` override edilmis ama `newOptions` okunmadan sadece redraw yapiliyor (`expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:70`, `expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:77`).
- Gercek layout secimi tamamen kayitli `size` string'ine bagli (`expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:121`).

Etkisi:

- Kullanici homescreen'de widget boyutunu degistirse bile host'un verdigi hucre/olcu bilgisi mantikta kullanilmadigi icin layout uyarlamasi yok.
- `2x3` / `4x2` senaryolari cihaz/launcher farklarinda kirpma veya bosluk sorunlari uretebilir.

Oneri:

- `newOptions` icinden min/max width/height okuyup row/column adaptasyonu yapin.
- Boyut presetleri ile native appwidget metadata'yi uyumlu hale getirin (gerekirse birden fazla provider tanimi).

### 5. Yuksek: Cift kaynakli config modeli (JS AsyncStorage + native SharedPreferences) sessiz ayrisma uretebilir

Kanit:

- JS tarafi config okuma/yazma `AsyncStorage` uzerinden ilerliyor (`expo/src/services/WidgetService.ts:53`, `expo/src/services/WidgetService.ts:291`).
- Native widget render `SharedPreferences("WidgetConfigs")` uzerinden okuyor (`expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:298`).
- Native sync basarisiz olsa bile hata yutuluyor (`expo/src/services/WidgetService.ts:334`).

Etkisi:

- Uygulama ekraninda gorunen config ile widgetin kullandigi config farkli kalabilir.
- Bu fark saptanmasi zor, cunku kullanici "Kaydedildi" mesaji alir.

Oneri:

- Tek source-of-truth secin veya iki yonlu dogrulama ekleyin.
- Native sync sonrasi read-back/ack mekanizmasi dusunun.

### 6. Orta: Native `getWidgetConfig` API sozlesmesi tutarsiz (Base64 decode yok)

Kanit:

- Native `updateWidget`/`saveWidgetConfig` veriyi Base64 encode ederek sakliyor (`expo/modules/brevi-settings/android/src/main/java/com/breviai/brevisettings/BreviSettingsModule.kt:505`, `expo/modules/brevi-settings/android/src/main/java/com/breviai/brevisettings/BreviSettingsModule.kt:596`).
- `getWidgetConfig` ayni veriyi decode etmeden raw string donduruyor (`expo/modules/brevi-settings/android/src/main/java/com/breviai/brevisettings/BreviSettingsModule.kt:585`).
- TS wrapper ismi/dokumani "config getir" diyor, Base64 detayini yuzeye cikarmiyor (`expo/modules/brevi-settings/index.ts:224`).

Etkisi:

- Bu API kullanilirsa cagirici tarafin gizli bir Base64 bilgisine sahip olmasi gerekir.
- Bridge API kullanimi kolayca hatali parse'a gider.

Oneri:

- `getWidgetConfig` native tarafta decode edilmis JSON string/obje dondursun.
- TS tiplerini `Promise<WidgetConfig | null>` gibi netlestirin.

### 7. Orta: `forceUpdate` kayitlarinda cift native update/broadcast var (gereksiz tekrar)

Kanit:

- `updateWidgetConfig` icinde once `saveWidgetConfig` cagriliyor (`expo/src/services/WidgetService.ts:152`).
- `saveWidgetConfig` zaten `syncToNativeWidget` ile native update yapiyor (`expo/src/services/WidgetService.ts:311`).
- Sonrasinda `forceUpdate` true ise ikinci kez `updateNativeWidget` cagriliyor (`expo/src/services/WidgetService.ts:154`).

Etkisi:

- Tek kayit aksiyonunda tekrarli `updateWidget` ve broadcast tetiklenir.
- Gereksiz redraw / I/O maliyeti olusur.

Oneri:

- `saveWidgetConfig` ve `forceUpdate` akisini tek bir native refresh noktasinda birlestirin.

### 8. Orta: `appearance` modeli tanimli ama UI/native uygulamasi yarim ve kayit sirasinda resetleniyor

Kanit:

- Tip seviyesinde `appearance` alanlari tanimli (`expo/src/types/widget.ts:27`).
- `WidgetConfigScreen` kayitta mevcut appearance'i degil `DEFAULT_WIDGET_CONFIG.appearance` degerini yazar (`expo/src/screens/WidgetConfigScreen.tsx:204`, `expo/src/screens/WidgetConfigScreen.tsx:209`).
- Native provider tarafindaki `WidgetConfig` data class `appearance` alanini hic tasimiyor (`expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:53`).
- Native layout/gorunum stilleri drawables ile hard-coded (`expo/android/app/src/main/res/layout/widget_shortcuts.xml:22`, `expo/android/app/src/main/res/layout/widget_shortcuts.xml:45`).

Etkisi:

- Veri modeli ozellestirme destekliyor gibi gorunuyor ama runtime'da uygulanmiyor.
- Ileride appearance eklenirse mevcut save akisi custom degerleri sessizce ezebilir.

Oneri:

- Ya `appearance` ozelligini gercekten uctan uca uygulayin, ya da simdilik modelden/UI'dan kaldirin.
- Save akisinda mevcut `appearance` korunmali.

### 9. Orta: Widget alaninda otomatik test kapsami gorunmuyor (regresyon riski yuksek)

Gozlem:

- Widget ile ilgili `test/spec` dosyasi taramasinda somut test bulunmadi (`rg` aramasi ile kontrol edildi).
- Roadmap'te widget maddeleri halen acik gorunuyor (`docs/ROADMAP.md:27`).

Etkisi:

- Widget config kaydetme, native sync, button execution ve deep-link akislari kolayca regress eder.

Oneri:

- En azindan JS tarafi icin unit test: `normalizeWidgetButtons`, `WidgetService.save/update`.
- Android tarafi icin instrumentation/smoke test: provider update + click -> receiver broadcast.

### 10. Dusuk/Orta: Encoding (mojibake) bozulmalari widget tetiklemeli bildirim metinlerini etkiliyor

Kanit:

- `WidgetHeadlessTask` icindeki notification stringleri bozuk karakterler iceriyor (`expo/src/services/WidgetHeadlessTask.ts:42`, `expo/src/services/WidgetHeadlessTask.ts:142`).
- `WorkflowHeadlessService` foreground notification metni de bozuk karakterli (`expo/android/app/src/main/java/com/breviai/app/WorkflowHeadlessService.java:126`).

Etkisi:

- Widget tetiklemeli otomasyonlarda kullaniciya giden bildirim metinleri kalitesiz/bozuk gorunur.
- Repo genelinde encoding standardizasyonu sorunu olduguna isaret eder.

Oneri:

- Dosyalari UTF-8 olarak normalize edin ve CI lint/check ekleyin (encoding/locale).

## Eksik Parcalar (Tamamlama Listesi)

- Gercek `4x2` native layout veya net yeniden adlandirma/migrasyon
- Native sync hata durumunun UI'ya tasinmasi
- `setDefaultWidget` ve `deleteWidgetConfig` icin native cleanup/sync
- Resize event (`onAppWidgetOptionsChanged`) bazli adaptasyon
- `getWidgetConfig` decode + tip sozlesmesi duzeltmesi
- Widget test matrisi (2x2 / 2x3 / 4x2, atama, tiklama, app kapali senaryosu)
- `appearance` ozelliginin ya tamamlanmasi ya sadelestirilmesi

## Hizli Onceliklendirme (Pragmatik)

1. P0: `4x2` davranisini duzelt / adlandirmayi netlestir.
2. P0: Native sync hatalarini yutmayi birak; kullaniciya dogru feedback ver.
3. P1: Varsayilan/silme akislari icin native cleanup ve refresh ekle.
4. P1: Resize akisini gercek host boyutlariyla bagla.
5. P2: `appearance` ve bridge API sozlesmesini toparla.
6. P2: Test kapsami ekle.

