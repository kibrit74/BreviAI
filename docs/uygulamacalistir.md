# 🚀 BreviAI Geliştirici ve Çalıştırma Rehberi

Bu doküman, BreviAI projesini yerelde başlatmak, test etmek, derlemek (EAS Build) ve yayınlamak için ihtiyacınız olan tüm temel terminal komutlarını içermektedir.

---

## 📱 1. Uygulamayı (Expo/Mobil) Çalıştırma Komutları

Uygulamanın arayüzünü (Frontend) geliştirirken kullanılan komutlardır. İşlemleri her zaman `expo` klasörü dizinindeyken yapmalısınız.

```bash
# Klasöre giriş
cd expo

# Standart Başlatma (Expo Go ile uyumlu, en temel çalıştırma)
npx expo start

# Geliştirici İstemcisi ile Başlatma (Şu an en sık kullandığınız)
# Özel native modüller (Google Auth vb.) kullanıldığı için Dev Client zorunludur.
npx expo start --dev-client --localhost

# Önbelleği (Cache) Temizleyerek Başlatma
# Uygulama anlamsız hatalar veriyorsa veya değişiklikleri yansıtmıyorsa kullanın.
npx expo start -c
```

---

## 🛠️ 2. EAS (Expo Application Services) Build Alma Komutları

Uygulamanın APK'sını (Android) veya AAB dosyalarını bulutta derleyip telefona indirmek için kullanılır.

```bash
# EAS CLI yüklü değilse önce global yükleyin (Bir kere yapılır)
npm install -g eas-cli

# EAS Hesabınıza giriş yapın
eas login

# EAS Projesini klasörde başlatın (İlk kurulumda)
eas init

# --- DERLEME (BUILD) KOMUTLARI ---

# 1. Geliştirici (Development) Build Almak
# Hata ayıklama ve test için Expo Menüsü açık bir sürüm derler.
eas build --profile development --platform android

# 2. Önizleme (Preview) Build Almak (Ücretsiz Paylaşım)
# Doğrudan telefonda "gerçek uygulama" gibi çalışan bir APK üretir.
eas build --profile preview --platform android

# 3. Yalnızca APK Çıkartmak (Google Play Dışı Yükleme - Sideloading)
# EAS yapılandırmanızda "buildType: apk" ayarı varsa doğrudan APK verir.
eas build -p android --profile preview

# 4. Üretim (Production / Google Play) İçin Build Almak
# Mağazaya yollanacak AAB (Android App Bundle) veya IPA (iOS) dosyası üretir.
eas build --profile production --platform android
```

---

## 🌐 3. Backend (Sunucu) Çalıştırma Komutları

BreviAI'nin Node/Next.js tabanlı arka ucunu çalıştırmak ve API isteklerini test etmek için kullanılır.

```bash
# Arka uç klasörüne girin
cd backend

# Bağımlılıkları yükleyin (İlk seferde veya paket eklendiğinde)
npm install

# Yerel Sunucuyu (Localhost) başlatın
npm run dev
```

---

## 🤖 4. Ekstra / Yapay Zeka Komutları

Şu an terminalde arka planda kullandığınız destekleyici yardımcı araçlar:

```bash
# Codex Asistanını (veya custom script'inizi) ayaklandırmak için
codex
```

---

## 💡 Kurulum ve Terminal İpuçları
1. **İki Terminal Kullanın:** Projeyi çalıştırırken VSCode içinde "Split Terminal" (bölünmüş terminal) yaparak bir tarafta `expo` tarafını (Mobil), diğer tarafta `backend` tarafını (Sunucu) aynı anda çalıştırın.
2. **Bağımlılık Hataları Alırsanız:** Klasör içindeyken `rm -rf node_modules` yapıp yeniden `npm install` komutu verip sıfırdan kurulum yaparak çözebilirsiniz.
