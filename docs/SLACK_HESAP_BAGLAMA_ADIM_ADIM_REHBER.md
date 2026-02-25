# Slack Hesap Baglama (OAuth) ve Slack Node API Alanlari Rehberi

## Amac
Bu rehber, BreviAI uygulamasinda Slack hesabini baglamak icin:

- Hangi verilerin gerekli oldugunu
- Su an sistemimizde hangi verilerin eksik oldugunu
- Bu verilerin nereden ve nasil alinacagini
- Adim adim kurulum ve dogrulamayi

aciklar.

## Ozet (Mevcut Durum Teshisi)
Ekran goruntusundeki su hata:

`{"error":"Server configuration error"}`

Slack OAuth start endpoint'inin backend tarafinda **Slack Client ID bulamadigini** gosterir.

Yani su an **kesin eksik** olan veri:

- `SLACK_CLIENT_ID` (Vercel Production env)

Muhtemel olarak kontrol edilmesi gereken diger veriler:

- `SLACK_CLIENT_SECRET` (callback/token exchange icin gerekir)
- Slack App Redirect URL kaydi
- `BACKEND_URL` (opsiyonel ama dogru olmasi onerilir)

## Sistemimizde Su An Ne Dogru Gorunuyor?
Loglara gore bunlar calisiyor:

- Mobil uygulama backend'e gidiyor: `https://breviai.vercel.app`
- Mobil deep link callback URI dogru formatta: `brevi-ai://oauth`
- Google OAuth ayni altyapi uzerinden basariyla calisiyor

Bu nedenle ana sorun mobil taraf degil; Slack backend config/env tarafinda.

## 1. Slack Hesabini OAuth ile Baglamak Icin Gerekli Veriler

BreviAI'nin Slack girisi (Ayarlar > Slack Baglan) icin gerekenler:

### A. Slack App (Uygulama) Olusturulmus Olmali
Gerekli cunku OAuth bilgileri bu uygulamadan gelir.

Link:
- Slack Apps: `https://api.slack.com/apps`
- Yeni app olusturma: `https://api.slack.com/apps/new`

### B. `SLACK_CLIENT_ID` (Zorunlu)
Backend `start` endpoint'i bunu kullanir. Eksikse direkt:

- `Server configuration error`

doner.

Nereden alinir:
- Slack App > **Basic Information** > **App Credentials** > `Client ID`

Link:
- Slack Apps dashboard: `https://api.slack.com/apps`

### C. `SLACK_CLIENT_SECRET` (Zorunlu)
Backend callback route token exchange asamasinda kullanir.

Nereden alinir:
- Slack App > **Basic Information** > **App Credentials** > `Client Secret`

Link:
- Slack Apps dashboard: `https://api.slack.com/apps`

### D. Redirect URL (Slack App tarafinda kayitli olmali)
Slack, callback URL'yi app ayarlarinda onceden kayitli bekler.

Bu proje icin gerekli redirect URL:

- `https://breviai.vercel.app/api/auth/slack/callback`

Nereden eklenir:
- Slack App > **OAuth & Permissions** > **Redirect URLs**

Link:
- OAuth & Permissions docs: `https://api.slack.com/authentication/oauth-v2`
- Slack Apps dashboard: `https://api.slack.com/apps`

### E. OAuth Scope'lar (Slack App tarafinda)
Kod tarafinda beklenen scope'lar:

- `chat:write`
- `channels:read`

Nereden eklenir:
- Slack App > **OAuth & Permissions** > **Scopes** > **Bot Token Scopes**

### F. Vercel Environment Variables (Production)
Backend prod ortaminda Slack env degiskenlerini Vercel'den okur.

Gerekli env'ler:

- `SLACK_CLIENT_ID` (zorunlu)
- `SLACK_CLIENT_SECRET` (zorunlu)
- `BACKEND_URL` (opsiyonel ama onerilir): `https://breviai.vercel.app`

Nereden eklenir:
- Vercel Project > **Settings** > **Environment Variables**

Link:
- Vercel Dashboard: `https://vercel.com/dashboard`
- Vercel env docs: `https://vercel.com/docs/projects/environment-variables`

## 2. Sistemimizde Su An Eksik Olan Veriler (Kesin / Muhtemel)

### Kesin Eksik
- `SLACK_CLIENT_ID` (Production env)

Kaniti:
- `https://breviai.vercel.app/api/auth/slack/start?...` endpoint'i JSON olarak `{"error":"Server configuration error"}` donuyor.
- Kod bu hatayi `SLACK_CLIENT_ID` eksiginde donuyor.

### Muhtemel Eksik / Kontrol Edilecek
- `SLACK_CLIENT_SECRET` (yoksa callback'te hata alinir)
- Slack App Redirect URL kaydi (yanlissa Slack authorize/token exchange fail eder)
- `BACKEND_URL` (yanlis olsa callback URL mismatch yaratabilir; yeni patch request origin kullanarak bunu azaltir)

## 3. Veriler Nereden ve Nasil Alinir? (Adim Adim)

### Adim 1: Slack App'i Ac / Olustur
1. `https://api.slack.com/apps` adresine git.
2. Var olan app'i sec veya `Create New App`.
3. Workspace sec.

### Adim 2: Client ID ve Client Secret'i Al
1. Sol menuden `Basic Information`.
2. `App Credentials` bolumune git.
3. Asagidaki iki degeri kopyala:
   - `Client ID`
   - `Client Secret`

Not:
- Bunlari mobil uygulamaya koyma.
- Sadece backend (Vercel env) tarafina koy.

### Adim 3: Redirect URL Ekle
1. Sol menuden `OAuth & Permissions`.
2. `Redirect URLs` bolumunde `Add New Redirect URL`.
3. Sunu ekle:
   - `https://breviai.vercel.app/api/auth/slack/callback`
4. `Save URLs` yap.

### Adim 4: Scope'lari Ekle
1. Ayni sayfada `Bot Token Scopes`.
2. Sunlari ekle:
   - `chat:write`
   - `channels:read`

### Adim 5: (Gerekirse) App'i Workspace'e Install Et
1. `OAuth & Permissions` sayfasinda `Install to Workspace` / `Reinstall to Workspace`.
2. Yetkileri onayla.

Not:
- OAuth login akisi icin `Client ID/Secret` yeterlidir.
- Slack node API modu icin `xoxb-...` bot token da isine yarar (asagida anlattim).

### Adim 6: Vercel'e Env Degiskenlerini Ekle (Production)
1. `https://vercel.com/dashboard`
2. Projeni ac.
3. `Settings` > `Environment Variables`
4. Asagidakileri ekle:
   - `SLACK_CLIENT_ID` = Slack'ten aldigin Client ID
   - `SLACK_CLIENT_SECRET` = Slack'ten aldigin Client Secret
   - `BACKEND_URL` = `https://breviai.vercel.app` (onerilir)
5. `Environment` olarak en az `Production` sec.
6. Kaydet.

### Adim 7: Redeploy (Cok Onemli)
Env eklemek tek basina yetmez. Yeni env'nin aktif olmasi icin redeploy gerekir.

1. Vercel > `Deployments`
2. Son deployment > `Redeploy`

## 4. Kurulum Sonrasi Hemen Dogrulama (Browser + App)

### A. Browser Test (Start Endpoint)
Su URL'yi ac:

- `https://breviai.vercel.app/api/auth/slack/start?redirect_uri=brevi-ai%3A%2F%2Foauth`

Beklenen:
- JSON hata degil
- Slack authorize sayfasina yonlendirme

Eger hala `{"error":"Server configuration error"}` goruyorsan:
- `SLACK_CLIENT_ID` Production'da yok / redeploy olmamis / yanlis proje-env'e eklenmis

### B. Mobil App Test (Ayarlar > Slack Baglan)
Beklenen log akisi:
- `[SlackService] ===== BACKEND OAUTH START =====`
- Slack sayfasi acilir
- callback gelirse:
  - `[SlackService] Captured OAuth deep link: ...`
  - veya `[SlackService] OAuth callback arrived before auth session resolved`
  - veya `Sign in successful`

## 5. Hata -> Sebep Haritasi (Hizli Teshis)

### Hata: `{"error":"Server configuration error"}`
Sebep:
- `SLACK_CLIENT_ID` eksik (backend start route)

Cozum:
- Vercel Production env'e `SLACK_CLIENT_ID` ekle + redeploy

### Hata: `server_configuration_error` (callback donusu)
Sebep:
- `SLACK_CLIENT_ID` veya `SLACK_CLIENT_SECRET` callback asamasinda eksik

Cozum:
- Vercel env'leri kontrol et + redeploy

### Hata: Slack authorize aciliyor ama geri donmuyor
Muhtemel sebepler:
- Redirect URL Slack App tarafinda eksik/yanlis
- Callback endpoint prod'da eski kod
- In-app browser / app-switch davranisi (mobil taraf patch ile azaltildi)

## 6. Slack Node'da "API Alanlari" (Alternatif / Login Olmadan Mesaj Gonderme)

Sisteme Slack node icin API modu eklendi:

- Mod: `Slack API`
- Alanlar:
  - `Slack API Token / Bot Token (xoxb-...)`
  - `Kanal ID veya Adi`
  - `Slack API URL (Opsiyonel)` (varsayilan: `chat.postMessage`)

Bu mod OAuth login'den bagimsiz olarak test amacli mesaj gondermek icin kullanilabilir.

### Slack Node API Modu Icin Gerekli Veriler
- `xoxb-...` Bot Token
- Kanal ID (`C...`) veya kanal adi (`#general`) - ID daha saglamdir

### Bot Token Nereden Alinir?
1. Slack App > `OAuth & Permissions`
2. `Bot User OAuth Token` (genelde `xoxb-...`)

Link:
- `https://api.slack.com/apps`

### Kanal ID Nereden Alinir?
Yontemler:
- Slack masaustu/web istemcide kanal linkini kopyala (URL icinde ID gorunebilir)
- Slack API `conversations.list` kullan

Linkler:
- Conversations API: `https://api.slack.com/methods/conversations.list`
- Slack API docs ana sayfa: `https://api.slack.com/methods`

## 7. Guvenlik Notlari
- `SLACK_CLIENT_SECRET` ve `xoxb` tokeni asla mobil istemciye hardcode etme.
- Secret'lari sadece backend env (Vercel) tarafinda tut.
- Ekran goruntusu paylasirken token/secret kisimlarini maskele.

## 8. Son Kontrol Checklist (Kopyala-Isaretle)

- [ ] Slack App var
- [ ] `SLACK_CLIENT_ID` alindi
- [ ] `SLACK_CLIENT_SECRET` alindi
- [ ] Redirect URL eklendi: `https://breviai.vercel.app/api/auth/slack/callback`
- [ ] Scope'lar eklendi: `chat:write`, `channels:read`
- [ ] Vercel Production env'e `SLACK_CLIENT_ID` eklendi
- [ ] Vercel Production env'e `SLACK_CLIENT_SECRET` eklendi
- [ ] (Opsiyonel) `BACKEND_URL=https://breviai.vercel.app` eklendi
- [ ] Redeploy yapildi
- [ ] `/api/auth/slack/start?...` artik Slack'e redirect ediyor
- [ ] Mobil app'te Slack login test edildi

