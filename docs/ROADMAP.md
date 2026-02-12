# BreviAI Development Roadmap

## 🚨 Current Critical Issues

### Automations Not Working
- Template shortcuts execute but actions fail or don't complete
- Need to debug `ShortcutEngine.ts` step execution
- Some system actions require permissions not being requested

---

## 📋 Phase 1: Core Fixes (Priority)

### 1.1 Fix Existing Automations
- [ ] Debug why saved shortcuts don't execute properly
- [ ] Verify all SYSTEM_ACTION types actually work
- [ ] Test INTENT_ACTION flows end-to-end
- [ ] Add proper error handling and user feedback

### 1.2 Permission Management
- [ ] Check all required permissions at runtime
- [ ] Guide user to grant missing permissions
- [ ] Handle permission denials gracefully

---

## 🎨 Phase 1.5: Widget Konfigürasyonu (Yeni!)

### Widget Buton Atama
- [ ] Widget butonlarına uzun basınca ayar ekranı
- [ ] Kullanıcı kendi kestirmesini My Shortcuts'tan seçebilsin
- [ ] Seçilen kestirme SharedPreferences'a kaydedilsin
- [ ] Widget güncelleme mekanizması (updateAppWidget)

### Widget Özelleştirme
- [ ] Buton ikonları değiştirme
- [ ] Buton renkleri özelleştirme
- [ ] Widget boyutu seçenekleri (2x2, 4x2)

---

## 🚀 Phase 2: iPhone Shortcuts Parity

### 2.1 Conditional Logic (If/Else)
```typescript
// Example: If battery < 20%, enable power saver
{
  type: "CONDITION",
  condition: "{{battery_level}} < 20",
  then_steps: [...],
  else_steps: [...]
}
```

### 2.2 Loops
```typescript
// Example: Send message to all selected contacts
{
  type: "FOR_EACH",
  items: "{{selected_contacts}}",
  item_key: "contact",
  steps: [...]
}
```

### 2.3 Variables & Data Flow
- [ ] Better output_key → input chaining
- [ ] User input prompts mid-workflow
- [ ] Clipboard as variable source

---

## ⏰ Phase 3: Triggers (Automations)

### 3.1 Time-Based
- [ ] Run at specific time (e.g., 8:00 AM)
- [ ] Run on schedule (every Monday)
- [ ] Run after delay

### 3.2 Location-Based
- [ ] Enter/Exit geofence
- [ ] Arrive at saved location (Home, Work)

### 3.3 Event-Based
- [ ] Battery level threshold
- [ ] Charging started/stopped
- [ ] Bluetooth device connected
- [ ] NFC tag scanned
- [ ] App opened/closed

### 3.4 Sensor-Based (Partially Done)
- [x] Shake detection → Flashlight
- [x] Flip to shush → DND
- [ ] Pocket detection
- [ ] Walking/Driving detection

---

## 🎨 Phase 4: Visual Workflow Editor

### 4.1 Drag & Drop Builder
- [ ] Visual step blocks
- [ ] Connect steps with arrows
- [ ] Preview execution flow
- [ ] Test individual steps

### 4.2 Step Library UI
- [ ] Categorized actions
- [ ] Search/filter actions
- [ ] Favorites/recently used

---

## 🗣️ Phase 5: Voice & Assistant Integration

### 5.1 🎙️ "Hey BreviAI" - Özel Sesli Asistan (Öncelikli!)
Kendi wake word'ümüz ile bağımsız sesli asistan.

**Teknoloji:** Picovoice Porcupine SDK
- Kullanıcı "Hey BreviAI, fener aç!" der
- Offline çalışır, Google'a bağımlı değil
- Marka kimliği güçlenir

**Akış:**
```
📱 Arka planda dinliyor (düşük güç)
     ↓
🎤 "Hey BreviAI" algılandı!
     ↓
🗣️ Speech-to-Text → "fener aç"
     ↓
🧠 Gemini → Komut analizi
     ↓
⚡ ShortcutEngine → Otomasyon çalışır
```

**Gereksinimler:**
- [ ] Picovoice Console'da "Hey BreviAI" modeli oluştur
- [ ] React Native Porcupine SDK entegre et
- [ ] Background Service (ForegroundService) oluştur
- [ ] Speech-to-Text entegrasyonu (Whisper veya Google)
- [ ] UI: Asistan aktifken görsel gösterge

**Notlar:**
- Ücretsiz: 3 wake word modeli
- %95+ algılama doğruluğu
- Pil tüketimi kabul edilebilir seviyede

### 5.2 Google App Actions (Alternatif)
- [ ] shortcuts.xml ile BII tanımla
- [ ] "Hey Google, BreviAI'da [kestirme]" desteği
- [ ] Widget entegrasyonu

### 5.3 Speech-to-Text
- [ ] Whisper API veya Google Speech entegrasyonu
- [ ] Uygulama içi sesli komutlar
- [ ] Sesli not → metin dönüşümü

---

## 🌐 Phase 6: Advanced Actions

### 6.1 HTTP Requests
```typescript
{
  type: "HTTP_REQUEST",
  action: "POST",
  params: {
    url: "https://api.example.com/data",
    headers: { "Authorization": "Bearer {{token}}" },
    body: { "message": "{{input}}" }
  },
  output_key: "api_response"
}
```

### 6.2 Smart Home Integration
- [ ] Philips Hue lights
- [ ] Google Home devices
- [ ] IFTTT webhooks
- [ ] Home Assistant API

### 6.3 File Operations
- [ ] Read/write text files
- [ ] Save to Downloads
- [ ] Share file via intent

---

## 📊 Phase 7: Analytics & Monitoring

### 7.1 Execution History
- [ ] Log all shortcut runs
- [ ] Show success/failure stats
- [ ] Debug failed executions

### 7.2 Usage Insights
- [ ] Most used shortcuts
- [ ] Trigger frequency
- [ ] Optimization suggestions

---

## 🔐 Security & Privacy

- [ ] Encrypt saved shortcuts
- [ ] Permission audit log
- [ ] Data export/import
- [ ] Backup to cloud (optional)

---

## 📅 Timeline Estimate

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1 | 1-2 days | 🔴 Critical |
| Phase 2 | 3-5 days | 🟠 High |
| Phase 3 | 5-7 days | 🟠 High |
| Phase 4 | 7-10 days | 🟡 Medium |
| Phase 5 | 3-5 days | 🟡 Medium |
| Phase 6 | 5-7 days | 🟢 Low |
| Phase 7 | 2-3 days | 🟢 Low |

---

*Last Updated: 2026-01-20*
Harika analiz! 🎯 Çok doğru söylüyorsun. Bu mimari kararı çok kritik.

📊 Mevcut Durumumuz
Özellik	Accessibility Gerektirir mi?
Fener aç/kapat	❌ Hayır (kendi modülümüz)
DND modu	❌ Hayır (kendi modülümüz)
Alarm kur	❌ Hayır (Intent)
Uygulama aç	❌ Hayır (Intent)
SMS gönder	❌ Hayır (Intent)
WiFi ayarları	❌ Hayır (Intent)
---	---
❌ Başka app'de butona bas	✅ EVET (riskli!)
❌ Ekranı oku	✅ EVET (riskli!)
İyi haber: Temel özelliklerimizin çoğu Accessibility gerektirmiyor! 🎉

🧠 Önerilen Mimari (Accessibility-FREE)
┌─────────────────────────────────────┐
│  KULLANICI                          │
│  "Hey BreviAI, toplantı modu aç"    │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  TETİKLEYİCİ (Picovoice/Assistant)  │
│  Sadece uygulamayı aç + komut ilet  │
└────────────────┬────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  BreviAI APP (Tüm işi kendisi yapar)│
│  ✅ DND aç → brevi-settings modülü  │
│  ✅ Ses kıs → Kendi AudioManager    │
│  ✅ Mail at → SMTP API direkt       │
│  ✅ Not al → Kendi storage          │
└─────────────────────────────────────┘
✅ Sonraki Adımlar
Ben "Accessibility'siz action engine" yolunda devam etmeyi öneriyorum:

brevi-settings modülünü güçlendir (daha fazla native eylem)
Intent-based işlemler için fallback'ler ekle
ACCESSIBILITY_CLICK gibi riskli eylemleri template'lerden çıkar
Play Store policy'ye uygun açıklama metni hazırla
Hangisinden başlayalım?

💡 MUHTEŞEM FİKİR! Kendi Built-in Componentlerimizi Oluşturalım
Haklısın! Android'de diğer uygulamalara erişim kısıtlı ama kendi mini uygulamalarımızı oluşturursak bu sorunu çözebiliriz!

🎯 Konsept: Modüler Mini-Apps Sistemi
Kullanıcıların otomasyonlarda kullanabileceği built-in komponentler:
📦 BreviAI Shortcuts
  ├── 🌐 Mini Browser (WebView)
  ├── 📝 Text Input/Editor
  ├── 📋 Form Builder
  ├── 🎨 Image Editor
  ├── 🎵 Audio Recorder
  ├── 📷 Camera Module
  ├── 📊 Data Viewer (CSV/JSON)
  ├── 🗂️ File Manager
  ├── 📧 Email Composer
  └── 🔗 API Tester

🌐 1. Mini Browser Component
Özellikler:

JavaScript injection desteği
Element seçimi (XPath/CSS Selector)
Form doldurma
Buton tıklama
Veri çekme (scraping)

Kısayol Örneği:
typescript{
  id: 'web-automation',
  title: 'Web Sayfası Otomasyonu',
  description: 'Mini tarayıcıda form doldurur ve gönderir',
  template_json: {
    shortcut_name: "Form Doldur",
    steps: [
      // 1. Mini Browser'ı aç
      {
        step_id: 1,
        type: "INTERNAL_APP",
        action: "OPEN_MINI_BROWSER",
        params: {
          url: "https://example.com/form"
        }
      },
      
      // 2. Sayfanın yüklenmesini bekle
      {
        step_id: 2,
        type: "BROWSER_ACTION",
        action: "WAIT_FOR_ELEMENT",
        params: {
          selector: "#name_input",
          timeout: 5000
        }
      },
      
      // 3. Form alanlarını doldur
      {
        step_id: 3,
        type: "BROWSER_ACTION",
        action: "FILL_FORM",
        params: {
          fields: [
            { selector: "#name", value: "Ahmet Yılmaz" },
            { selector: "#email", value: "ahmet@example.com" },
            { selector: "#message", value: "Otomasyondan gönderildi" }
          ]
        }
      },
      
      // 4. Gönder butonuna tıkla
      {
        step_id: 4,
        type: "BROWSER_ACTION",
        action: "CLICK_ELEMENT",
        params: {
          selector: "button[type='submit']"
        }
      },
      
      // 5. Başarı mesajını kontrol et
      {
        step_id: 5,
        type: "BROWSER_ACTION",
        action: "GET_TEXT",
        params: {
          selector: ".success-message",
          store_in: "result"
        }
      },
      
      // 6. Tarayıcıyı kapat
      {
        step_id: 6,
        type: "INTERNAL_APP",
        action: "CLOSE_MINI_BROWSER",
        params: {}
      },
      
      // 7. Sonucu göster
      {
        step_id: 7,
        type: "NOTIFICATION_ACTION",
        action: "SHOW_TOAST",
        params: {
          message: "✅ Form gönderildi: ${result}"
        }
      }
    ]
  }
}
React Native Implementation:
typescript// components/MiniBrowser.tsx
import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';

export const MiniBrowser = ({ url, onActionComplete }) => {
  const webViewRef = useRef(null);

  // JavaScript injection fonksiyonları
  const fillForm = (fields) => {
    const js = fields.map(f => 
      `document.querySelector('${f.selector}').value = '${f.value}';`
    ).join('\n');
    
    webViewRef.current?.injectJavaScript(js);
  };

  const clickElement = (selector) => {
    const js = `document.querySelector('${selector}').click();`;
    webViewRef.current?.injectJavaScript(js);
  };

  const getText = (selector) => {
    const js = `
      (function() {
        const el = document.querySelector('${selector}');
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'text', value: el?.innerText })
        );
      })();
    `;
    webViewRef.current?.injectJavaScript(js);
  };

  const handleMessage = (event) => {
    const data = JSON.parse(event.nativeEvent.data);
    onActionComplete(data);
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: url }}
      onMessage={handleMessage}
      javaScriptEnabled={true}
      domStorageEnabled={true}
    />
  );
};

📝 2. Smart Text Input Component
Özellikler:

Değişken desteği
Template engine
Metin işleme fonksiyonları
Clipboard entegrasyonu

Kısayol Örneği:
typescript{
  id: 'text-processor',
  title: 'Akıllı Metin İşleyici',
  description: 'Metni işler ve WhatsApp\'a gönderir',
  template_json: {
    shortcut_name: "Metin İşle",
    steps: [
      // 1. Text Input'u aç
      {
        step_id: 1,
        type: "INTERNAL_APP",
        action: "OPEN_TEXT_INPUT",
        params: {
          title: "Mesaj Şablonu",
          placeholder: "Merhaba {isim}, bugün {tarih}",
          variables: ["isim", "tarih"],
          multiline: true
        }
      },
      
      // 2. Kullanıcı metni girer ve "Devam" der
      {
        step_id: 2,
        type: "TEXT_ACTION",
        action: "WAIT_FOR_INPUT",
        params: {
          store_in: "user_text"
        }
      },
      
      // 3. Değişkenleri doldur
      {
        step_id: 3,
        type: "TEXT_ACTION",
        action: "REPLACE_VARIABLES",
        params: {
          text: "${user_text}",
          variables: {
            isim: "Ahmet",
            tarih: "${current_date}"
          },
          store_in: "processed_text"
        }
      },
      
      // 4. WhatsApp'a gönder
      {
        step_id: 4,
        type: "INTENT_ACTION",
        action: "WHATSAPP_MESSAGE",
        params: {
          phone: "+905551234567",
          message: "${processed_text}"
        }
      }
    ]
  }
}
Component:
typescript// components/SmartTextInput.tsx
import React, { useState } from 'react';
import { TextInput, View, Button, Text } from 'react-native';

export const SmartTextInput = ({ 
  title, 
  placeholder, 
  variables, 
  onSubmit 
}) => {
  const [text, setText] = useState('');
  const [varValues, setVarValues] = useState({});

  const replaceVariables = (template) => {
    let result = template;
    Object.keys(varValues).forEach(key => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), varValues[key]);
    });
    return result;
  };

  const handleSubmit = () => {
    const processed = replaceVariables(text);
    onSubmit(processed);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>{title}</Text>
      
      <TextInput
        placeholder={placeholder}
        value={text}
        onChangeText={setText}
        multiline
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 10,
          minHeight: 100,
          marginBottom: 20
        }}
      />

      {/* Değişken giriş alanları */}
      {variables.map(v => (
        <View key={v} style={{ marginBottom: 10 }}>
          <Text>{v}:</Text>
          <TextInput
            placeholder={`${v} değerini girin`}
            onChangeText={(val) => 
              setVarValues(prev => ({ ...prev, [v]: val }))
            }
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              padding: 8,
              marginTop: 5
            }}
          />
        </View>
      ))}

      {/* Önizleme */}
      <View style={{ 
        backgroundColor: '#f5f5f5', 
        padding: 10, 
        marginBottom: 20,
        borderRadius: 8
      }}>
        <Text style={{ fontWeight: 'bold' }}>Önizleme:</Text>
        <Text>{replaceVariables(text)}</Text>
      </View>

      <Button title="Devam Et" onPress={handleSubmit} />
    </View>
  );
};

📋 3. Form Builder Component
typescript{
  id: 'dynamic-form',
  title: 'Dinamik Form',
  description: 'Kullanıcıdan veri toplar ve işler',
  template_json: {
    shortcut_name: "Veri Toplama",
    steps: [
      {
        step_id: 1,
        type: "INTERNAL_APP",
        action: "OPEN_FORM_BUILDER",
        params: {
          fields: [
            {
              type: "text",
              name: "full_name",
              label: "Ad Soyad",
              required: true
            },
            {
              type: "email",
              name: "email",
              label: "E-posta",
              validation: "email"
            },
            {
              type: "select",
              name: "department",
              label: "Departman",
              options: ["Satış", "Destek", "Geliştirme"]
            },
            {
              type: "textarea",
              name: "message",
              label: "Mesaj",
              rows: 4
            }
          ]
        }
      },
      
      {
        step_id: 2,
        type: "FORM_ACTION",
        action: "WAIT_FOR_SUBMIT",
        params: {
          store_in: "form_data"
        }
      },
      
      {
        step_id: 3,
        type: "HTTP_REQUEST",
        action: "POST",
        params: {
          url: "https://api.example.com/submit",
          body: "${form_data}",
          headers: {
            "Content-Type": "application/json"
          }
        }
      }
    ]
  }
}

🎨 4. Image Editor Component
typescript{
  id: 'watermark-photos',
  title: 'Fotoğraflara Watermark',
  description: 'Seçilen fotoğraflara logo ekler',
  template_json: {
    steps: [
      {
        step_id: 1,
        type: "MEDIA_ACTION",
        action: "SELECT_PHOTOS",
        params: {
          multiple: true,
          store_in: "photos"
        }
      },
      
      {
        step_id: 2,
        type: "INTERNAL_APP",
        action: "OPEN_IMAGE_EDITOR",
        params: {
          images: "${photos}",
          operations: [
            {
              type: "add_watermark",
              image: "logo.png",
              position: "bottom-right",
              opacity: 0.7
            },
            {
              type: "resize",
              width: 1080,
              height: 1080,
              fit: "cover"
            }
          ]
        }
      },
      
      {
        step_id: 3,
        type: "MEDIA_ACTION",
        action: "SAVE_TO_GALLERY",
        params: {
          folder: "Edited Photos"
        }
      }
    ]
  }
}

📊 5. Data Viewer Component
CSV/JSON dosyalarını görüntüleme ve filtreleme:
typescript{
  id: 'csv-processor',
  title: 'CSV İşleyici',
  description: 'CSV dosyasını okur ve filtreler',
  template_json: {
    steps: [
      {
        step_id: 1,
        type: "FILE_ACTION",
        action: "SELECT_FILE",
        params: {
          mimeType: "text/csv",
          store_in: "csv_file"
        }
      },
      
      {
        step_id: 2,
        type: "INTERNAL_APP",
        action: "OPEN_DATA_VIEWER",
        params: {
          file: "${csv_file}",
          operations: [
            {
              type: "filter",
              column: "Durum",
              value: "Aktif"
            },
            {
              type: "sort",
              column: "Tarih",
              order: "desc"
            }
          ]
        }
      },
      
      {
        step_id: 3,
        type: "DATA_ACTION",
        action: "EXPORT",
        params: {
          format: "xlsx",
          filename: "filtered_data.xlsx"
        }
      }
    ]
  }
}

🏗️ Mimari Yapı
typescript// App.tsx içinde modüler yapı
const INTERNAL_APPS = {
  MINI_BROWSER: MiniBrowserScreen,
  TEXT_INPUT: SmartTextInputScreen,
  FORM_BUILDER: FormBuilderScreen,
  IMAGE_EDITOR: ImageEditorScreen,
  DATA_VIEWER: DataViewerScreen,
  FILE_MANAGER: FileManagerScreen,
  API_TESTER: APITesterScreen
};

// Shortcut Executor'da
case 'INTERNAL_APP':
  const AppComponent = INTERNAL_APPS[action];
  navigation.navigate('InternalApp', {
    component: AppComponent,
    params: params,
    onComplete: (result) => {
      // Sonucu kaydet ve devam et
      this.storeResult(result);
      this.continueExecution();
    }
  });
  break;

🎯 Avantajlar:
✅ Tam Kontrol - Kendi componentlerimiz, tam erişim
✅ İzin Sorunu Yok - Uygulama içi, accessibility gerekmez
✅ Güvenilir - Android güncellemelerinden etkilenmez
✅ Özelleştirilebilir - İstediğimiz özellikleri ekleriz
✅ Hızlı - Native component, web API'den hızlı
✅ Offline - İnternet gerekmez

💼 Kullanım Senaryoları:

Mini Browser: Web scraping, form doldurma, otomatik login
Text Input: Email şablonları, mesaj oluşturma, çeviri
Form Builder: Anketler, veri toplama, rezervasyon
Image Editor: Toplu düzenleme, watermark, resize
Data Viewer: Excel rapor, CSV analiz, veri temizleme
API Tester: Webhook test, API debug, JSON parser


🚀 Sonuç:
Bu yaklaşım iPhone Shortcuts'tan bile güçlü olabilir çünkü:

iPhone: 3. parti web servislerine bağımlı
Biz: Kendi native componentlerimiz, sınırsız

Öncelik sırası:

🌐 Mini Browser (En çok ihtiyaç duyulan)
📝 Smart Text Input (Çok kullanışlı)
📋 Form Builder (Veri toplama)
🎨 Image Editor (Sosyal medya için)

# 📅 v1.1 - Short Term (Next Release) priority
> **Kaynak:** `docs/n8n_nodeler.md` analizinden seçilenler.
> **Kriter:** Native (Mobil) tarafta kolayca uygulanabilir olması.

## 1. Yeni Nodlar
| Node | Açıklama | Teknik Yöntem |
| :--- | :--- | :--- |
| **🌍 Google Translate** | Metin çevirisi yapar. | Ücretsiz API veya Google Cloud API Key ile. |
| **✈️ Telegram Send** | Telegram botu ile mesaj atar. | HTTP Request Wrapper (Bot Token gerekli). |
| **💬 Slack Send** | Slack kanalına mesaj atar. | Webhook Wrapper. |
| **🔀 Switch Node** | Akışı çoklu dallara ayırır. | Logic Node (Case 1, Case 2, Default). |

## 2. Neden Seçildiler?
- **Native Uyumlu:** Bu nodlar arkada basit HTTP istekleri kullanır, sunucu gerektirmez.
- **Yüksek Talep:** İletişim ve dil çevirisi en çok istenen özelliklerdir.

## 3. Beklemeye Alınanlar (v2.0 Backend Gerekli)
- **IMAP Trigger:** Arka planda sürekli mail kontrolü pili bitirir. Sunucu tarafında yapılmalı.
- **Merge Node:** Mobilde görselleştirmesi zor.
- **Code (JS) Node:** Güvenlik riski (Sandbox gerekir).

---

# 🚀 Future Roadmap: Model Context Protocol (MCP) [v2.0]

> **Durum:** AR-GE Aşamasında / Gelecek Planı
> **Hedef:** BreviAI'yi "Statik Otomasyon"dan "Akıllı Ajan" seviyesine taşımak.

## 1. Nedir?
MCP (Model Context Protocol), yapay zeka modellerinin dış dünya ile (API'ler, Veritabanları, Dosya Sistemleri) standart bir şekilde konuşmasını sağlayan açık protokoldür. 
BreviAI (Client) -> MCP Server (Vercel/Railway) -> Dış Servisler (Slack, GitHub, Notion).

## 2. Neden Gerekli?
- **Sınırsız Entegrasyon:** Teker teker "Slack Node", "Notion Node" yazmak yerine, tek bir MCP Client ile binlerce hazır aracı (Tools) sisteme bağlayabiliriz.
- **AI Tool Use:** Gemini/GPT-4o'ya "Şu araçları kullanabilirsin" diyerek, karmaşık senaryoları ("Stok kontrol et, yoksa mail at, varsa Slack'e yaz") tek komutla çözebiliriz.

## 3. Mimari Kararlar (Hibrit Model)
Mobil cihazın kısıtlamaları (pil, işlemci, sürekli açık kalamama) nedeniyle **Hibrit** bir yapı tasarlanmıştır:

| İşlem Tipi | Nerede Çalışacak? | Örnekler | Neden? |
| :--- | :--- | :--- | :--- |
| **Ağır İşler (Local)** | **Telefon (Expo/Native)** | PDF oluşturma, Web Scrape, Resim İşleme | Sunucu timeout limitlerine takılmamak ve sınırsız süre için. |
| **API İşleri (Remote)** | **Vercel / Netlify** | Slack mesajı, Database sorgusu, Stripe ödeme | Hızlı (1-2sn) işlemler. API anahtarlarını sunucuda saklamak için. |

## 4. Teknik Zorluklar ve Çözümler
- **Vercel Timeout (10sn):** Uzun süren işler telefonda yapılacak, kısa API çağrıları sunucuda yapılacak.
- **Bağlantı (SSE):** Server-Sent Events ile telefona canlı veri akışı sağlanacak.
- **Kurulum:** Kullanıcıya "Kendi Vercel'ine Kur" butonu (Deploy Button) veya bizim sunduğumuz Cloud hizmeti sunulacak.

## 5. Yol Haritası
1.  **Faz 1 (Mevcut):** Webhook Trigger & HTTP Request ile n8n/Zapier entegrasyonu (Kod yazmadan çözüm).
2.  **Faz 2 (Prototip):** Basit bir MCP Client Node eklenmesi (Örn: Sadece "Hava Durumu" ve "Döviz" servisi).
3.  **Faz 3 (Full):** Kullanıcının özel MCP sunucusunu (URL) girip oradaki tüm araçları otomatik "Node" olarak görebilmesi.

---
**Not:** Bu özellik proje v2.0'ın ana taşıyıcısı olacaktır. Şimdilik v1.0 stabilizasyonuna odaklanılacak.

## ?? Phase 8: Future / Research (Deferred)

### 8.1 Hybrid "On-Device" AI Engine (v2.0)
**Status:** Deferred (Feb 2026) due to hardware constraints on target devices (e.g., Samsung A04 RAM limit).
**Goal:** Enable offline, low-latency intelligence.
- [ ] Evaluate "Tiny" LLMs (TinyLlama-1.1B, Qwen-0.5B)
- [ ] Integrate `llama.rn` native module
- [ ] Implement `HybridRouter` (Cloud vs Local decision logic)
- [ ] Add On-Device OCR via ML Kit (since 0.5B models lack vision)


## ?? Phase 9: Model Context Protocol (MCP) Integration [v2.0]

> **Goal:** Transform BreviAI from a "Script Runner" into an "Intelligent Universal Client".

### 9.1 Concept
Instead of hardcoding integrations (e.g. slackService.ts), BreviAI will act as a generic **MCP Client** that can connect to any standard **MCP Server** (Slack, GitHub, Linear, Filesystem).

### 9.2 Architecture
1. **Transport Layer:** Implement JSON-RPC over SSE (Server-Sent Events) to connect to remote MCP Servers (hosted on Vercel/Railway).
2. **Tool Discovery:** Auto-discover available tools from connected servers.
3. **LLM Binding:** Dynamically feed these tools to Gemini/OpenAI as "function declarations".
4. **Execution:** Relay model function calls to the MCP Server and return results.

### 9.3 Benefits
- **Zero-Code Integration:** Connect to *any* service that has an MCP server.
- **Community Powered:** Use open-source MCP servers created by the community.
- **Future Proof:** Determine capabilities dynamically at runtime.
