# Sesli AI Sekreter Otomasyonu Analiz Raporu

**Dosya:** `voice_ai_assistant.json`
**Genel Durum:** Mevcut haliyle **ÇALIŞMAZ**.

Yaptığım kod incelemelerinde uygulamanın yapıtaşlarına (Node tanımlamalarına) kıyasla bu JSON dosyasında birkaç kritik uyumsuzluk (schema hatası) tespit ettim. Düzeltildiği takdirde sorunsuz çalışacaktır. 

Aşağıda detaylı analizi ve çözüm adımlarını bulabilirsiniz:

---

## 1. CALL_TRIGGER (Arama Geldi) Düğümündeki Hata
* **Mevcut JSON:** `"config": { "callState": "Incoming", "variableName": "callerInfo" }`
* **Sorun:** BreviAI'nın `CallTriggerConfig` arayüzü `callState` adında tekil bir metin değil, `states` adında bir Dizi (Array) beklemektedir.
* **Beklenen:** `states: ('Incoming' | 'Connected' | 'Disconnected' | 'Dialing')[]`
* **Çözüm:** Bu kısım `"states": ["Incoming"]` olarak değiştirilmeli. 

*(Ayrıca kod bazında (`triggers.ts`) `CALL_TRIGGER` şimdilik gelen numarayı `triggerMessage` (ve `_callerNumber`) sistem değişkenlerine atmaktadır, bu yüzden `callerInfo` değişkenine atama kodu şimdilik eksik görünse de arka planda global değişkenlerle çalışacağı için sorun yaratmayacaktır).*

## 2. REALTIME_AI (Sesli AI) Düğümündeki Potansiyel Sorun
* **Mevcut JSON:** `"model": "gemini-2.5-flash-live-001"`
* **Sorun:** Sisteminizdeki `GeminiLiveService` ve `realtime_ai.ts` varsayılan olarak API versiyonunu `gemini-2.0-flash-live-001` olarak kullanıyor. `2.5` versiyonu Live API için henüz stabil bir karşılığa sahip değil veya API tarafında reddedilebilir (Bağlantı kopması yaşatabilir).
* **Çözüm:** `model` parametresini tamamen JSON'dan silmek en sağlıklısıdır. Böylece sistem `realtime_ai.ts` içerisindeki (89. satır) varsayılan `gemini-2.0-flash-live-001` kodunu kullanarak güvenli bağlanır.

## 3. NOTIFICATION (Görüşme Bitti) Düğümündeki Hata
* **Mevcut JSON:** `"type": "notification"`
* **Sorun:** BreviAI'nın `NotificationConfig` tanımında sadece iki adet geçerli `type` değeri vardır:
   - Başarısız: `"type": "notification"`
   - Geçerli değerler: `'toast' | 'push'`
* **Çözüm:** Mobil bildirim olarak yukarıdan düşmesi için bu ayar `"type": "push"` olarak değiştirilmelidir.

---

## Düzeltilmiş Çalışır JSON Kodu:

```json
{
    "name": "📞 Sesli AI Sekreter",
    "description": "Arama geldiğinde hoparlörü açıp Gemini ile gerçek zamanlı karşılık veren AI asistan",
    "category": "communication",
    "icon": "call-outline",
    "color": "#EF4444",
    "nodes": [
        {
            "id": "trigger-call",
            "type": "CALL_TRIGGER",
            "label": "Arama Geldi",
            "config": {
                "states": ["Incoming"],
                "variableName": "callerInfo"
            },
            "position": { "x": 100, "y": 50 }
        },
        {
            "id": "realtime-ai",
            "type": "REALTIME_AI",
            "label": "Sesli AI (Hoparlör)",
            "config": {
                "systemPrompt": "Sen bir AI telefon sekretersin. Arayan kişiyle Türkçe konuşuyorsun.\n\nKurallar:\n- Kısa ve profesyonel cevaplar ver (1-2 cümle)\n- Aramayı karşıla: 'Merhaba, BreviAI asistanı, size nasıl yardımcı olabilirim?'\n- Arayan kişinin ismini ve mesajını not al\n- Gerektiğinde bilgi sor\n- Arayan: {{_callerNumber}}",
                "voice": "Kore",
                "tools": true,
                "speakerMode": true,
                "maxDuration": 120,
                "variableName": "konusmaMetni"
            },
            "position": { "x": 100, "y": 200 }
        },
        {
            "id": "notify-end",
            "type": "NOTIFICATION",
            "label": "Görüşme Bitti",
            "config": {
                "type": "push",
                "title": "📞 Arama Tamamlandı",
                "message": "Arayan: {{_callerNumber}}\n{{konusmaMetni}}"
            },
            "position": { "x": 100, "y": 400 }
        }
    ],
    "edges": [
        { "id": "e1", "sourceNodeId": "trigger-call", "targetNodeId": "realtime-ai", "sourcePort": "default" },
        { "id": "e2", "sourceNodeId": "realtime-ai", "targetNodeId": "notify-end", "sourcePort": "default" }
    ]
}
```
