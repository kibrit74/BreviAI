# 🔐 Gmail Okuma (BYOK) Kurulum Rehberi

BreviAI ile kendi Gmail'inizi okumak için Google'dan ücretsiz bir "Client ID" almanız gerekir. Bu işlem 5 dakika sürer ve tamamen güvenlidir.

## 🟢 Adım 1: Google Cloud Console
1.  [Google Cloud Console](https://console.cloud.google.com/) adresine gidin.
2.  Sol üstten **"Select a Project"** -> **"New Project"** diyerek yeni bir proje oluşturun (Adı: `BreviAI-MyMail` olabilir).

## 🟢 Adım 2: API Etkinleştirme
1.  Soldaki menüden **"APIs & Services"** -> **"Library"**ye tıklayın.
2.  Arama kutusuna `Gmail API` yazın ve seçin.
3.  **"Enable"** butonuna basın.

## 🟢 Adım 3: İzin Ekranı (OAuth Consent Screen)
1.  Soldan **"OAuth consent screen"** menüsüne gidin.
2.  **"External"** seçin ve **Create** deyin.
3.  Uygulama Adı: `BreviAI`, Destek Maili: `Kendi mailiniz` girin.
4.  **"Test Users"** adımına gelene kadar "Next" deyin.
5.  **"Add Users"** diyerek kendi Gmail adresinizi ekleyin. (Bu çok önemli!).

## 🟢 Adım 4: Kimlik Bilgisi (Credentials)
1.  Soldan **"Credentials"** -> **"Create Credentials"** -> **"OAuth Client ID"** seçin.
2.  Application Type: **"Android"**.
3.  Package Name: `com.breviai.app`
4.  SHA-1: *(Uygulama Ayarlarında göreceğiniz SHA-1 kodunu buraya yapıştırın)*.
5.  **"Create"** deyin. Size bir `Client ID` verecek.

## 🟢 Son Adım
1.  Verilen `Client ID`'yi kopyalayın.
2.  BreviAI uygulamasında **Ayarlar > Geliştirici > Google Client ID** kısmına yapıştırın.
3.  Artık **Gmail Oku** nodunu kullanabilirsiniz! 🎉
