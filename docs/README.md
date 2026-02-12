# BreviAI - Akıllı Kestirme Uygulaması

🚀 Doğal dil kullanarak Android otomasyonları oluşturun!

## 📋 Proje Yapısı

```
BreviAI/
├── backend/          # Next.js Backend (Vercel)
├── android/          # Android Native (Kotlin)
├── expo/             # Expo Config (EAS Build)
└── PRD.md            # Product Requirements
```

## 🛠️ Kurulum

### Backend

```bash
cd backend
npm install
cp .env.example .env
# .env dosyasına GEMINI_API_KEY ve APP_SECRET ekleyin
npm run dev
```

### Android (EAS Build)

```bash
cd expo
npm install
npx eas build --platform android --profile development
```

## 🔑 Environment Variables

### Backend (.env)
```
GEMINI_API_KEY=your-gemini-api-key
APP_SECRET=your-secure-app-secret
```

### Android (BuildConfig)
- API_BASE_URL: Vercel URL
- APP_SECRET: Backend ile aynı secret

## 📱 Özellikler

- ✅ Sesli komut ile kestirme oluşturma
- ✅ AI destekli JSON şablon üretimi (Gemini 2.5/3.0)
- ✅ Hazır şablon kütüphanesi
- ✅ Kestirme yönetimi ve istatistikler
- ✅ Ebeveyn kontrol özellikleri
- ✅ Uygulama izleme (Accessibility Service)
- ✅ Sistem aksiyonları (WiFi, Bluetooth, DND)

## 🚀 Deploy

### Backend → Vercel
```bash
cd backend
vercel
```

### Android → EAS Build
```bash
cd expo
npx eas build --platform android --profile production
```

## 📄 Lisans

© 2026 BreviAI - Tüm hakları saklıdır.
