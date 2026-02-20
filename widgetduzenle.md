# Widget Duzenleme Notlari

Tarih: 2026-02-19
Kapsam: `expo/src` + `expo/android` + `expo/modules/brevi-settings`

## Kritik

1. Native bridge uyumsuz: `WidgetService` yanlis modulu kullaniyor
- Kanit: `expo/src/services/WidgetService.ts:24` (`BreviHelperModule` kullaniliyor)
- Kanit: `expo/src/services/WidgetService.ts:358` (`openBreviAI` object payload ile cagriliyor)
- Kanit: `expo/android/app/src/main/java/com/breviai/app/BreviHelperModule.kt:53` (`openBreviAI(payload: String)` placeholder)
- Etki: Widget aksiyonlari "basarili" gorunup gercekte no-op olabilir.
- Duzeltme: Widget aksiyonlari icin `brevi-settings` modulu (`BreviSettings`) tek kaynak yapilsin veya `BreviHelperModule` ayni imzalarla tamamlanip promise donsun.

2. `openBreviAI` parametre tipi uyusmuyor
- Kanit: `expo/src/services/WidgetService.ts:359` (object gonderiliyor)
- Kanit: `expo/android/app/src/main/java/com/breviai/app/BreviHelperModule.kt:53` (String bekleniyor)
- Etki: Bridge cagrisi hatali calisabilir ya da hic calismayabilir.
- Duzeltme: Iki tarafta da tek tip kullan (tercihen `Map`/object).

3. Widget custom/system action payload parse bug
- Kanit: `expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:336` (`payload` `JSONObject` olarak map'e konuyor)
- Kanit: `expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:174`
- Kanit: `expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:181` (`payload` `Map` cast ediliyor)
- Etki: `app/system/custom` tipindeki action'lar config'ten gelse bile calismayabilir.
- Duzeltme: `JSONObject` -> `Map<String, Any>` donusumu recursive yapilsin veya `JSONObject` olarak okunup branch'lerde o tip kullanilsin.

## Yuksek

4. Deep link scheme tutarsiz
- Kanit: `expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:429` (`brevi-ai://widget-config`)
- Kanit: `expo/src/navigation/AppNavigator.tsx:202` (`brevi-ai://` prefix var)
- Kanit: `expo/android/app/src/main/AndroidManifest.xml:57`
- Kanit: `expo/android/app/src/main/AndroidManifest.xml:58` (manifestte `brevi-ai` yok)
- Etki: Widget'tan config ekrani acma davranisi cihaz/intent durumuna gore tutarsiz olabilir.
- Duzeltme: Manifest + navigation + native URI tek scheme'e alinmali.

5. Coklu widget instance destegi eksik
- Kanit: `expo/src/screens/WidgetConfigScreen.tsx:146` (hep `default_widget`/tek config akisi)
- Kanit: `expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:300` (instance ID yoksa `default_widget` fallback)
- Etki: Birden fazla widget eklenince hepsi ayni konfigu kullanir, ayri ayar yapilamaz.
- Duzeltme: `appWidgetId -> configId` esleme katmani eklenmeli, config UI'da instance secimi olmali.

6. Security hardening eksik (widget receiver)
- Kanit: `expo/android/app/src/main/AndroidManifest.xml:65` (`exported=true`)
- Kanit: `expo/android/app/src/main/AndroidManifest.xml:68` (custom action filter acik)
- Etki: Dis uygulamalar custom broadcast denemesiyle workflow tetiklemeye calisabilir.
- Duzeltme: `SHORTCUT_CLICK` action filter'i kaldir (explicit pending intent yeterli), ek olarak intent dogrulama/izin sertlestirmesi yap.

## Orta

7. Layout esnekligi kagit ustunde var, pratikte sabit 6 buton
- Kanit: `expo/src/types/widget.ts:23` (`2x2 | 2x3 | 4x2` tanimli)
- Kanit: `expo/src/types/widget.ts:62` (`WIDGET_LAYOUTS` var)
- Kanit: `expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:81`
- Kanit: `expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt:82` (native taraf 6 butona sabit)
- Kanit: `expo/src/screens/WidgetConfigScreen.tsx:262`
- Kanit: `expo/src/screens/WidgetConfigScreen.tsx:266` (UI da 3+3 sabit)
- Etki: Tiplerdeki layout secenekleri gercekte kullanilmiyor.
- Duzeltme: Boyuta gore buton sayisi ve layout render'i dinamik hale getirilmeli.

8. `widget_info.xml` resize acik ama provider resize event handling yok
- Kanit: `expo/android/app/src/main/res/xml/widget_info.xml:7` (`resizeMode` acik)
- Kanit: `expo/android/app/src/main/java/com/breviai/app/ShortcutWidgetProvider.kt` icinde `onAppWidgetOptionsChanged` yok
- Etki: Kullanici widget boyutunu degistirse de icerik buna gore optimize edilmiyor.
- Duzeltme: `onAppWidgetOptionsChanged` override edilip boyuta gore render senaryosu eklenmeli.

9. AsyncFunction context null senaryosunda promise resolve/reject edilmiyor
- Kanit: `expo/modules/brevi-settings/android/src/main/java/com/breviai/brevisettings/BreviSettingsModule.kt:538`
- Kanit: `expo/modules/brevi-settings/android/src/main/java/com/breviai/brevisettings/BreviSettingsModule.kt:573`
- Kanit: `expo/modules/brevi-settings/android/src/main/java/com/breviai/brevisettings/BreviSettingsModule.kt:594`
- Etki: JS tarafi beklemede kalabilir (silent hang).
- Duzeltme: `reactContext == null` durumunda tum AsyncFunction'larda net `promise.reject(...)` don.

10. Widget shortcut secicide test verisi zorla ekleniyor
- Kanit: `expo/src/components/ui/ShortcutPickerModal.tsx:46` (`seedTestWorkflows()` her acilista)
- Etki: Gercek kullanicida test workflow'lar listeyi kirletir.
- Duzeltme: Sadece development modunda calistir veya tamamen kaldir.

## Hemen Yapilacaklar (kisa liste)

1. `WidgetService` bridge'i tek modulde standardize et (`BreviSettings` veya tam `BreviHelperModule`).
2. `openBreviAI` imzasini iki tarafta ayni yap.
3. `payload` JSON parse/cast bug'ini duzelt.
4. Deep link scheme'i teklestir.
5. `SHORTCUT_CLICK` broadcast yolunu sertlestir.

## Uygulama Durumu

- [x] Bridge standardizasyonu yapildi (`WidgetService` -> `BreviSettings` once, legacy fallback).
- [x] `openBreviAI` uyumlulugu eklendi (object + legacy string fallback).
- [x] Native payload parse duzeltildi (`ShortcutWidgetProvider` action parsing).
- [x] Deep link hizalandi (`com.breviai.app://widget-config?widgetId=...` + manifest/prefix guncellemesi).
- [x] Widget tiklama action'i sertlestirildi (manifest filter sadeleştirme + `widgetId` doğrulama).
- [x] Dinamik boyut/buton destegi eklendi (4/6/8 buton akisi + 8 buton native layout).
- [x] Resize callback eklendi (`onAppWidgetOptionsChanged`).
- [x] AsyncFunction context-null promise asılı kalma sorunu duzeltildi (`CONTEXT_ERROR` reject).
- [x] Test verisi seed islemi sadece development moduna cekildi.
