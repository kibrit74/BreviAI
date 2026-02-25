# Slack Giris Yaklasimi Karari

## Soru
Slack girisini mevcut sekilde (mobil -> backend OAuth -> Slack -> backend callback -> deep link) yapmak mi mantikli, yoksa dogrudan API/token ile mi yapmak daha dogru?

## Kisa Cevap
Production icin en dogru yaklasim:

`Backend aracili OAuth + Slack API`

Yani su anki mimari yon olarak dogru. Sorun mimarinin kendisi degil, mobil OAuth callback (deep link / app-switch) akisinin dayaniklilik problemi.

## Code Review Sonucu (Mevcut Hata Neden Oluyor?)
- Sorun "yanlis Slack auth URL" degil.
- Loglarda `Full Auth URL` ve `Callback URI` dogru formatta.
- Ana sorun: Slack bazen auth sirasinda Slack uygulamasina geciriyor, bu durumda `openAuthSessionAsync` erken `dismiss` donebiliyor.
- Uygulama bunu hata sayip callback gelmesini beklemeden cikiyordu.

Bu nedenle, mevcut akisin duzeltilmesi mantikli ve dogru yaklasimdir.

## "Dogrudan API kullanmak" Ne Anlama Geliyor?
Bu genelde iki seye cikiyor:

1. Mobil uygulamada dogrudan Slack token kullanmak (veya client secret tutmak)
2. OAuth'u atlayip manuel bot token / webhook girerek kullanmak

## Karsilastirma

### 1) Backend Aracili OAuth + Slack API (Onerilen)
Avantajlar:
- Guvenlik: `SLACK_CLIENT_SECRET` mobilde tutulmaz.
- Dogru yetkilendirme: Kullanici kendi workspace'ini baglar.
- Olceklenebilirlik: Coklu kullanici / coklu workspace icin uygun.
- Merkezi loglama: callback, token exchange, hata takibi backend'de gorulur.
- Ileride izin/scope degisikligi ve reconnect akislari daha rahat yonetilir.

Dezavantajlar:
- Mobil deep link + browser/app-switch davranislari nedeniyle OAuth UX daha karmaşiktir.
- Backend callback ve deploy gerektirir.

### 2) Mobilde Dogrudan API / Token (Genelde Onerilmez)
Avantajlar:
- Ilk prototipte daha hizli gorunebilir.
- OAuth akisi yazmadan bot token ile test yapilabilir.

Dezavantajlar:
- Guvenlik riski: token / secret istemcide sizabilir.
- Kullanici bazli baglanti deneyimi zayif.
- Token yenileme/revoke/reconnect zorlasir.
- Production'da denetlenebilirlik ve hata takibi zayif olur.

### 3) Manuel Webhook / Bot Token (Sadece Dar Senaryo icin)
Ne zaman mantikli:
- Tek bir sirket workspace'i icin internal kullanim
- Sadece mesaj gonderme gerekiyor (kanal listeleme / kullanici bazli baglama gerekmiyor)
- Hizli MVP/demo hedefleniyor

Ne zaman yetersiz:
- Son kullanici kendi Slack hesabini baglayacaksa
- Birden fazla workspace desteklenecekse
- OAuth tabanli baglama UX'i gerekiyorsa

## Net Oneri
Bu proje icin:

- Slack giris akisini **mevcut backend OAuth mimarisiyle** devam ettir.
- Slack islemlerini **Slack API** ile yapmaya devam et (mümkünse backend/proxy uzerinden).
- Mobil tarafta `dismiss` / deep-link callback dayanikliligini guclendir (yaptigimiz patch bu amaca hizmet ediyor).

## Teknik Olarak Daha Saglam Hale Getirmek Icin (Sonraki Adimlar)
1. Backend callback patch'ini deploy et (Vercel).
2. Mobilde `dismiss` sonrasi callback bekleme mantigini kullan (patch uygulandi).
3. `state` degerini sadece redirect URI tasimak icin degil, nonce/CSRF dogrulamasi icin de guclendir.
4. Mümkünse Slack tokenlarini backend'de sakla; mobilde ham token yerine baglanti durumu/ID tas.
5. OAuth telemetry ekle:
   - auth start
   - callback reached
   - token exchange success/fail
   - deep link delivered/delayed

## Karar Ozeti
- Mimariyi degistirme: **Hayir**
- "API kullanalim" (guvenli backend uzerinden): **Evet**
- "Mobilde dogrudan token/secret ile API" : **Hayir (production icin)**

