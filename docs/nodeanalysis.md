# Node Analizi (BreviAI vs n8n Referans?)

Tarih: 2026-02-19
Kapsam: `expo/src/types/workflow-types.ts`, `expo/src/services/NodeExecutorRegistry.ts`, `expo/src/services/WorkflowEngine.ts`

## Y?netici ?zeti
- NodeType say?s?: 119
- NODE_REGISTRY say?s?: 118
- ExecutorRegistry say?s?: 85
- WorkflowEngine case kapsam?: 118
- Yinelenen NodeType: `SMS_TRIGGER`

Ana a??klar:
- NODE_REGISTRY?de eksik: `WEB_HOOK_TRIGGER`
- ExecutorRegistry?de eksik: `MANUAL_TRIGGER`, `TIME_TRIGGER`, `NOTIFICATION_TRIGGER`, `EMAIL_TRIGGER`, `TELEGRAM_TRIGGER`, `GEOFENCE_TRIGGER`, `GEOFENCE_ENTER_TRIGGER`, `GEOFENCE_EXIT_TRIGGER`, `DEEP_LINK_TRIGGER`, `CHAT_INPUT_TRIGGER`, `DELAY`, `IF_ELSE`, `VARIABLE`, `LOOP`, `SPLIT_BATCHES`, `SHARE_SHEET`, `SOUND_MODE`, `SCREEN_WAKE`, `DND_CONTROL`, `BRIGHTNESS_CONTROL`, `FLASHLIGHT_CONTROL`, `BLUETOOTH_CONTROL`, `GLOBAL_ACTION`, `MEDIA_CONTROL`, `DYNAMIC_EXECUTOR`, `STEP_TRIGGER`, `CALL_TRIGGER`, `SMS_TRIGGER`, `WHATSAPP_TRIGGER`, `WEB_HOOK_TRIGGER`, `SHOW_OVERLAY`, `OVERLAY_INPUT`, `OVERLAY_CLEAR`, `REALTIME_AI`
- WorkflowEngine?de eksik: `GEOFENCE_TRIGGER`, `BLUETOOTH_CONTROL`, `DYNAMIC_EXECUTOR`

## Tam Node Taramas? (S?ral?)
K?saltma: `R` = NODE_REGISTRY, `E` = ExecutorRegistry, `W` = WorkflowEngine

| Node | R | E | W | Notlar |
| --- | --- | --- | --- | --- |
| `MANUAL_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `TIME_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `NOTIFICATION_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `EMAIL_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `TELEGRAM_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `GEOFENCE_TRIGGER` | Y | N | N | no ExecutorRegistry; no WorkflowEngine |
| `GEOFENCE_ENTER_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `GEOFENCE_EXIT_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `DEEP_LINK_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `CHAT_INPUT_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `DELAY` | Y | N | Y | no ExecutorRegistry |
| `IF_ELSE` | Y | N | Y | no ExecutorRegistry |
| `VARIABLE` | Y | N | Y | no ExecutorRegistry |
| `LOOP` | Y | N | Y | no ExecutorRegistry |
| `SWITCH` | Y | Y | Y |  |
| `CODE_EXECUTION` | Y | Y | Y |  |
| `SET_VALUES` | Y | Y | Y |  |
| `SPLIT_BATCHES` | Y | N | Y | no ExecutorRegistry |
| `TEXT_INPUT` | Y | Y | Y |  |
| `SHOW_MENU` | Y | Y | Y |  |
| `CLIPBOARD_READER` | Y | Y | Y |  |
| `NOTIFICATION` | Y | Y | Y |  |
| `SHARE_SHEET` | Y | N | Y | no ExecutorRegistry |
| `SHOW_TEXT` | Y | Y | Y |  |
| `SHOW_IMAGE` | Y | Y | Y |  |
| `SOUND_MODE` | Y | N | Y | no ExecutorRegistry |
| `SCREEN_WAKE` | Y | N | Y | no ExecutorRegistry |
| `APP_LAUNCH` | Y | Y | Y |  |
| `DND_CONTROL` | Y | N | Y | no ExecutorRegistry |
| `BRIGHTNESS_CONTROL` | Y | N | Y | no ExecutorRegistry |
| `FLASHLIGHT_CONTROL` | Y | N | Y | no ExecutorRegistry |
| `BLUETOOTH_CONTROL` | Y | N | N | no ExecutorRegistry; no WorkflowEngine |
| `GLOBAL_ACTION` | Y | N | Y | no ExecutorRegistry |
| `MEDIA_CONTROL` | Y | N | Y | no ExecutorRegistry |
| `CALENDAR_READ` | Y | Y | Y |  |
| `CALENDAR_CREATE` | Y | Y | Y |  |
| `CALENDAR_UPDATE` | Y | Y | Y |  |
| `CALENDAR_DELETE` | Y | Y | Y |  |
| `CONTACTS_READ` | Y | Y | Y |  |
| `CONTACTS_WRITE` | Y | Y | Y |  |
| `NAVIGATE_TO` | Y | Y | Y |  |
| `SETTINGS_OPEN` | Y | Y | Y |  |
| `DB_READ` | Y | Y | Y |  |
| `DB_WRITE` | Y | Y | Y |  |
| `LOCATION_GET` | Y | Y | Y |  |
| `GEOFENCE_CREATE` | Y | Y | Y |  |
| `BATTERY_CHECK` | Y | Y | Y |  |
| `NETWORK_CHECK` | Y | Y | Y |  |
| `WEATHER_GET` | Y | Y | Y |  |
| `VOLUME_CONTROL` | Y | Y | Y |  |
| `SPEAK_TEXT` | Y | Y | Y |  |
| `AUDIO_RECORD` | Y | Y | Y |  |
| `SPEECH_TO_TEXT` | Y | Y | Y |  |
| `SMS_SEND` | Y | Y | Y |  |
| `EMAIL_SEND` | Y | Y | Y |  |
| `TELEGRAM_SEND` | Y | Y | Y |  |
| `SLACK_SEND` | Y | Y | Y |  |
| `DISCORD_SEND` | Y | Y | Y |  |
| `WHATSAPP_SEND` | Y | Y | Y |  |
| `INSTAGRAM_POST` | Y | Y | Y |  |
| `NOTION_CREATE` | Y | Y | Y |  |
| `NOTION_READ` | Y | Y | Y |  |
| `HTTP_REQUEST` | Y | Y | Y |  |
| `OPEN_URL` | Y | Y | Y |  |
| `GOOGLE_TRANSLATE` | Y | Y | Y |  |
| `RSS_READ` | Y | Y | Y |  |
| `WEB_AUTOMATION` | Y | Y | Y |  |
| `WEB_SEARCH` | Y | Y | Y |  |
| `HTML_EXTRACT` | Y | Y | Y |  |
| `FACEBOOK_LOGIN` | Y | Y | Y |  |
| `DYNAMIC_EXECUTOR` | Y | N | N | no ExecutorRegistry; no WorkflowEngine |
| `FILE_WRITE` | Y | Y | Y |  |
| `FILE_READ` | Y | Y | Y |  |
| `PDF_CREATE` | Y | Y | Y |  |
| `FILE_PICK` | Y | Y | Y |  |
| `ALARM_SET` | Y | Y | Y |  |
| `AGENT_AI` | Y | Y | Y |  |
| `IMAGE_GENERATOR` | Y | Y | Y |  |
| `IMAGE_EDIT` | Y | Y | Y |  |
| `CRON_CREATE` | Y | Y | Y |  |
| `CRON_DELETE` | Y | Y | Y |  |
| `CRON_LIST` | Y | Y | Y |  |
| `BROWSER_SCRAPE` | Y | Y | Y |  |
| `GMAIL_SEND` | Y | Y | Y |  |
| `GMAIL_READ` | Y | Y | Y |  |
| `SHEETS_READ` | Y | Y | Y |  |
| `SHEETS_WRITE` | Y | Y | Y |  |
| `DRIVE_UPLOAD` | Y | Y | Y |  |
| `LIGHT_SENSOR` | Y | Y | Y |  |
| `PEDOMETER` | Y | Y | Y |  |
| `MAGNETOMETER` | Y | Y | Y |  |
| `BAROMETER` | Y | Y | Y |  |
| `GESTURE_TRIGGER` | Y | Y | Y |  |
| `STEP_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `CALL_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `SMS_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `WHATSAPP_TRIGGER` | Y | N | Y | no ExecutorRegistry |
| `WEB_HOOK_TRIGGER` | N | N | Y | no NODE_REGISTRY; no ExecutorRegistry |
| `OUTLOOK_SEND` | Y | Y | Y |  |
| `OUTLOOK_READ` | Y | Y | Y |  |
| `EXCEL_READ` | Y | Y | Y |  |
| `EXCEL_WRITE` | Y | Y | Y |  |
| `ONEDRIVE_UPLOAD` | Y | Y | Y |  |
| `ONEDRIVE_DOWNLOAD` | Y | Y | Y |  |
| `ONEDRIVE_LIST` | Y | Y | Y |  |
| `VIEW_UDF` | Y | Y | Y |  |
| `VIEW_DOCUMENT` | Y | Y | Y |  |
| `PHILIPS_HUE` | Y | Y | Y |  |
| `CAMERA_CAPTURE` | Y | Y | Y |  |
| `REMEMBER_INFO` | Y | Y | Y |  |
| `SEARCH_MEMORY` | Y | Y | Y |  |
| `ADD_TO_MEMORY` | Y | Y | Y |  |
| `BULK_ADD_TO_MEMORY` | Y | Y | Y |  |
| `CLEAR_MEMORY` | Y | Y | Y |  |
| `SHOW_OVERLAY` | Y | N | Y | no ExecutorRegistry |
| `OVERLAY_INPUT` | Y | N | Y | no ExecutorRegistry |
| `OVERLAY_CLEAR` | Y | N | Y | no ExecutorRegistry |
| `REALTIME_AI` | Y | N | Y | no ExecutorRegistry |
| `EXECUTE_WORKFLOW` | Y | Y | Y |  |

## n8n Referans?na G?re Eksik/Yetersiz Alanlar
Bu b?l?m, BreviAI?nin mevcut node y?zeyini n8n?in yayg?n ?ekirdek kabiliyetleriyle kar??la?t?r?r ve i?levsel eksikleri/uyumsuzluklar? belirtir.

### Kontrol/Orkestrasyon Eksikleri
- Merge/Combine: n8n `Merge` benzeri ?oklu giri?leri bekleyip birle?tiren node yok.
- Item List / Aggregate: n8n?deki item bazl? i?lem, toplula?t?rma, d?n??t?rme node?lar?na denk d??en yap? yok.
- Error Trigger / Error Workflow: hata ak??lar?n? ayr? workflow?a y?nlendiren resmi bir tetikleyici yok.
- Wait/Resume: webhook bekleyip ak??? devam ettirme gibi bir ?wait? deseni yok.

### Tetikleyiciler ve Webhook Kapsam?
- `WEB_HOOK_TRIGGER` NodeType?da var ama NODE_REGISTRY?de yok ve ExecutorRegistry?de yok. UI ve runtime?da g?r?nm?yor/?al??m?yor.
- `GEOFENCE_TRIGGER` NodeType ve NODE_REGISTRY?de var ama WorkflowEngine?da i?lenmiyor.

### Cihaz/OS Aksiyonlar?
- `BLUETOOTH_CONTROL` NodeType ve NODE_REGISTRY?de var ama WorkflowEngine ve ExecutorRegistry?de yok.
- `SOUND_MODE`, `SCREEN_WAKE`, `DND_CONTROL`, `BRIGHTNESS_CONTROL`, `FLASHLIGHT_CONTROL`, `GLOBAL_ACTION`, `MEDIA_CONTROL` WorkflowEngine?da var ancak ExecutorRegistry?de yok (registry taraf? eksik).

### ?al??t?rma/Tooling Eksikleri
- `DYNAMIC_EXECUTOR` tan?ml? ama hi?bir yerde ?al??t?r?lm?yor.
- `REALTIME_AI` WorkflowEngine?da var, ExecutorRegistry?de yok.
- Overlay node?lar? (`SHOW_OVERLAY`, `OVERLAY_INPUT`, `OVERLAY_CLEAR`) WorkflowEngine?da var, ExecutorRegistry?de yok.

### Veri ??leme K?s?tlar? (n8n?e g?re)
- Parametre/?ema do?rulamas? standardize de?il.
- n8n?deki `items/binary` veri modeli ve d?n???mler yok.
- Node bazl? retry/backoff, hata y?netimi se?enekleri s?n?rl?.

## ?nerilen D?zeltmeler (?ncelik S?ras?)
1. `WEB_HOOK_TRIGGER`?? ya tamamen kald?r?n ya da NODE_REGISTRY + ExecutorRegistry + runtime deste?i ekleyin.
2. `GEOFENCE_TRIGGER` i?in WorkflowEngine?e y?r?tme deste?i ekleyin veya NodeType?dan ??kar?n.
3. `BLUETOOTH_CONTROL` i?in y?r?tme deste?i ekleyin.
4. ExecutorRegistry?yi WorkflowEngine ile hizalay?n: `SOUND_MODE`, `SCREEN_WAKE`, `DND_CONTROL`, `BRIGHTNESS_CONTROL`, `FLASHLIGHT_CONTROL`, `GLOBAL_ACTION`, `MEDIA_CONTROL`, `REALTIME_AI`, overlay node?lar?, `DELAY`, `IF_ELSE`, `VARIABLE`, `LOOP`, `SPLIT_BATCHES`.
5. `DYNAMIC_EXECUTOR`??n kaderini netle?tirin (uygula ya da kald?r).
