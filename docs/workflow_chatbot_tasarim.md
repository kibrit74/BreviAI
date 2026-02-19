# Workflow Sorun Cozme Chatbotu - Tasarim Dokumani

Tarih: 2026-02-19
Durum: Taslak v1
Kapsam: `WorkflowBuilder` icinde hata analizi, cozum onerisi ve kontrollu uygulama

## 1. Problem

Kullanicilar workflow calistirma hatalarinda su sorunlari yasiyor:

- Hata mesaji teknik ve korkutucu geliyor.
- Hangi node ayarinin degistirilmesi gerektigi net anlasilmiyor.
- Cozum icin ekranlar arasi gecis ve deneme-sil-dener yapiliyor.

Hedef: Kullaniciya Builder icinde, ayni ekranda, "neden olmadi + nasil duzeltirim + uygula" akisi vermek.

## 2. Urun Karari

Hibrit model:

- Builder icine "Sorun Coz" chatbot paneli eklenecek.
- Model secimi hardcode olmayacak.
- Ayarlarda girilen API key'lere gore provider secilecek.
- Provider model listesi mumkunse canli cekilecek, degilse guncel fallback modeli kullanilacak.

Not: `gemini-3.0-flash` tek basina sabitlenmeyecek. Gemini varsa oncelik verilebilir ama sistem provider-agnostic olacak.

## 3. Hedefler

- Hata aninda acemi ve orta seviye anlatim.
- Node bazli net cozum adimlari.
- "Onizle" ve "Uygula" ile kontrollu duzeltme.
- 1 tikla tekrar calistir.
- Maliyet ve gecikme kontrollu model secimi.

## 4. Hedef Disi

- Tam otomatik, kullanici onaysiz degisiklik yapma.
- Tum workflowu bastan yeniden yazma.
- Prompt uzerinden key/secret gosterimi.

## 5. Kullanim Akisi (UX)

1. Kullanici workflow calistirir, hata alir.
2. Headerdaki `Sorun Coz` butonuna basar.
3. Chat paneli acilir ve otomatik context yuklenir:
- Son hata kaydi
- Hata veren node
- Ilgili node config
- Son 3 node execution sonucu
4. Chat cevabi 3 blok olarak gelir:
- Basit anlatim
- Orta seviye teknik aciklama
- Onerilen degisiklikler
5. Kullanici `Onizle` der.
6. Diff modalinda eski/yeni config gorulur.
7. Kullanici `Uygula` derse patch uygulanir.
8. Sistem `Tekrar Calistir` onerir.

## 6. Teknik Mimari

### 6.1 Frontend Bilesenleri

- `WorkflowAssistantPanel.tsx`
- `WorkflowFixPreviewModal.tsx`
- `WorkflowSuggestionCard.tsx`
- `WorkflowBuilderScreen` entegrasyonu

### 6.2 Servis Katmani

- `WorkflowAssistantService`
- `ProviderRouterService`
- `ModelCatalogService`
- `WorkflowPatchService`
- `PromptBuilderService`

### 6.3 Mevcut Sistemle Entegrasyon

- `ExecutionLogger` hata gecmisi
- `WorkflowErrorExplainer` sade anlatim fallback'i
- `UserSettingsService` provider ve API key durumu

## 7. Provider ve Model Secim Stratejisi

### 7.1 Desteklenen Providerlar

- `gemini`
- `openai`
- `claude`

### 7.2 Secim Kurali

1. Kullanici `preferredProvider` secmisse ve key varsa onu kullan.
2. Yoksa key'i olan ilk saglikli provideri sec.
3. Model listesi cekilebilirse use-case'e uygun model sec:
- Hizli cozum: dusuk gecikme, dusuk maliyet
- Derin analiz: yuksek kalite
4. Model listesi cekilemezse provider fallback modeli kullan.

### 7.3 Model Katalog Caching

- TTL: 24 saat
- Cache key: `provider + appVersion`
- Model seciminde `supports_json` ve `max_output_tokens` filtreleri

## 8. Prompt Tasarimi

Tek bir mega prompt yerine parcali prompt:

- Sistem prompt: "workflow debugger"
- Context bloklari:
- `workflow_summary`
- `failed_nodes`
- `selected_node`
- `recent_outputs`
- Cikti formati JSON olacak:
- `user_explanation_beginner`
- `user_explanation_intermediate`
- `suggested_fixes[]`
- `safety_notes[]`

JSON parse edilmezse `WorkflowErrorExplainer` fallback mesaji donulecek.

## 9. Uygulama Guvenligi

- Asistan direkt state degistiremez.
- Sadece patch onerisi uretir.
- Uygulama oncesi diff preview zorunlu.
- `dangerous` alanlar icin ikinci onay:
- webhook url
- token
- api key
- script/code alanlari

## 10. Patch Formati

Onerilen yapi:

```json
{
  "workflowId": "workflow_x",
  "changes": [
    {
      "type": "update_node_config",
      "nodeId": "node_123",
      "path": "query",
      "oldValue": "",
      "newValue": "{{previous_output}}"
    }
  ]
}
```

Desteklenecek islem tipleri:

- `update_node_config`
- `update_node_label`
- `add_edge`
- `remove_edge`
- `replace_text_template`

## 11. Telemetri ve Basari Metrikleri

- `assistant_opened_count`
- `assistant_suggestion_generated_count`
- `assistant_apply_count`
- `assistant_fix_success_rate` (uygulamadan sonraki ilk calisma basarisi)
- `mean_time_to_fix`
- `token_cost_per_fix`

Hedef ilk iterasyon:

- Fix success rate >= %45
- Mean time to fix <= 90 saniye

## 12. Asamali Yayina Alma

### Asama A - MVP (1 sprint)

- Chat panel (read-only cozum onerisi)
- Provider router (key bazli secim)
- Tek patch tipi: `update_node_config`
- Diff onizleme + manuel uygula

### Asama B - Gelismis (2. sprint)

- Coklu patch tipi
- Tekrar calistir kisayolu
- Prompt kalite iyilestirme
- Telemetri dashboard

### Asama C - Akilli (3. sprint)

- Otomatik "en iyi 2 cozum" karsilastirma
- Maliyet/kalite profil secimi
- Node tipine ozel cozum playbook'lari

## 13. Riskler ve Azaltim

- Risk: Yanlis model secimi.
- Azaltim: Provider health check + fallback sirasi.

- Risk: Yanlis patch onerisi.
- Azaltim: Diff preview + geri al + tek tek patch uygula.

- Risk: Maliyet patlamasi.
- Azaltim: Token budget, cevap boyutu limiti, hizli model varsayilan.

- Risk: API baglantisi yok.
- Azaltim: Local fallback aciklama (`WorkflowErrorExplainer`) ve adim adim manuel yonlendirme.

## 14. Acik Sorular

- Kullaniciya provider secimini bu panelde degistirme izni verelim mi?
- "Derin analiz" secenegi premium mu olacak?
- Uygulama oneri adimlari turkce disinda da lokalize edilsin mi?

## 15. Implementasyon Dosya Plani

- `expo/src/components/workflow/WorkflowAssistantPanel.tsx`
- `expo/src/components/workflow/WorkflowFixPreviewModal.tsx`
- `expo/src/services/assistant/WorkflowAssistantService.ts`
- `expo/src/services/assistant/ProviderRouterService.ts`
- `expo/src/services/assistant/ModelCatalogService.ts`
- `expo/src/services/assistant/WorkflowPatchService.ts`
- `expo/src/services/assistant/PromptBuilderService.ts`
- `expo/src/screens/WorkflowBuilderScreen.tsx` entegrasyonu

## 16. Onerilen Ilk Teknik Spike

Sadece bu akisi 2-3 gunluk spike ile dogrulayalim:

1. `ExecutionLogger` dan son hatayi cek.
2. Router ile provider+model sec.
3. Tek prompt ile JSON patch onerisi al.
4. Bir node config alanina diff uygulat.
5. Tekrar calistir ve metrik kaydet.

Bu spike gecerse full implementasyona gecelim.
