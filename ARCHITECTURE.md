# 🏗️ BreviAI Codebase Mimari ve Geliştirme Rehberi

Bu doküman, projenin mimari yapısını, kurallarını ve sık yapılan hataları önlemek için gereken standartları içerir. Özellikle **Native Modül (Kotlin/Swift)** geliştirmeleri ve **Dependency Yönetimi** konularına odaklanır.

---

## 1. 📂 Proje Yapısı (Directory Structure)

```text
BreviAI/
├── expo/                       # React Native / Expo Frontend
│   ├── modules/                # ⚠️ CUSTOM NATIVE CİHAZ MODÜLLERİ
│   │   └── brevi-settings/     # Ana sistem kontrol modülü
│   │       ├── android/        # Android Native Kod (Kotlin)
│   │       ├── ios/            # iOS Native Kod (Swift)
│   │       └── index.ts        # JS Köprüsü (Export)
│   ├── src/
│   │   ├── services/           # İş mantığı (Business Logic)
│   │   │   ├── nodes/          # Workflow Nodları
│   │   │   └── WorkflowEngine.ts # Ana Motor
│   │   └── screens/            # UI Ekranları
└── backend/                    # Node.js Backend (Vercel)
```

---

## 2. 🤖 Native Modül Geliştirme Kuralları (Android/Kotlin)

Son yaşanan hataları (`ModuleDefinition` scope hatası ve eksik dependency) önlemek için bu kurallara **kesinlikle** uyulmalıdır.

### 2.1. Expo Module Yapısı
Expo modülleri standart Android sınıflarından farklıdır.

**YANLIŞ ❌**
```kotlin
class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    
    // HATA: definition() bloğu içinde private fonksiyon TANIMLANAMAZ
    private fun helper() { ... } 
    
    Function("test") {
       helper()
    }
  }
}
```

**DOĞRU ✅**
```kotlin
class MyModule : Module() {
  // 1. Helper fonksiyonlar ModuleDefinition DIŞINDA olmalı
  private fun helper() { ... }

  override fun definition() = ModuleDefinition {
    Name("MyModule")

    // 2. Fonksiyonlar burada tanımlanır ve dışarıdaki helper'ı çağırır
    Function("test") {
       helper()
       return@Function true
    }
  }
}
```

### 2.2. Yeni Kütüphane Ekleme (Dependencies)
Eğer Kotlin kodunda yeni bir `import` (örn: `org.jsoup.*`) kullanıyorsanız, build dosyasını güncellemek **ZORUNLUDUR**.

*   **Dosya:** `expo/modules/brevi-settings/android/build.gradle`
*   **Kural:** `dependencies { ... }` bloğuna ekleme yapılmalı.

```gradle
dependencies {
    implementation project(':expo-modules-core')
    // Yeni eklenen kütüphaneler buraya:
    implementation 'org.jsoup:jsoup:1.15.3' 
}
```

---

## 3. 🧩 Workflow Node Mimarisi

Her yeni özellik (Feature) sisteme bir "Node" olarak eklenmelidir.

### 3.1. Node Ekleme Adımları
1.  **Tip Tanımı:** `src/types/workflow-types.ts` içine `NodeType` ve `NodeConfig` ekle.
2.  **UI Tanımı:** `NODE_REGISTRY` içine ikon, renk ve açıklama ekle.
3.  **Logic (Mantık):** `src/services/nodes/` altına ilgili dosyayı (örn: `email.ts`) oluştur ve `execute...` fonksiyonunu yaz.
4.  **Export:** `src/services/nodes/index.ts` dosyasına yeni fonksiyonu ekle.

---

## 4. 🛠️ Sık Karşılaşılan Hatalar ve Çözümleri

| Hata | Sebep | Çözüm |
| :--- | :--- | :--- |
| **Unresolved reference** (Kotlin) | Eksik import veya eksik `build.gradle` dependency. | Kütüphaneyi `build.gradle`'a ekle ve projeyi senkronize et. |
| **Modifier 'private' not applicable** | Fonksiyon `ModuleDefinition` scope'u içinde tanımlanmış. | Fonksiyonu `definition() { ... }` bloğunun **dışına** taşı. |
| **SDK location not found** | `local.properties` dosyası eksik. | Android SDK yolunu gösteren dosyayı oluştur. |
| **Worklets require new architecture** | `app.json` ayarı eksik. | `newArchEnabled: true` yapılmalı. |

---

## 5. 🚀 Deployment Kontrol Listesi

Kod pushlamadan önce şunları kontrol edin:
- [ ] `.npmrc` dosyasında `legacy-peer-deps=true` var mı? (React sürüm farkı için)
- [ ] Native modül değiştirdiyseniz `build.gradle` güncel mi?
- [ ] Yeni bir Node türü eklediyseniz `WorkflowEngine` switch-case yapısına kılıf (handler) eklendi mi?
