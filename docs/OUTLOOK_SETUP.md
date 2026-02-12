# 📧 Outlook (Microsoft) Kurulum Rehberi (BYOK)

Outlook hesabınızı bağlamak için Microsoft'tan geçici veya kalıcı bir "Erişim Anahtarı" (Access Token) almanız gerekir.

## 🚀 Yöntem: Graph Explorer (Hızlı & Kolay)
Bu yöntemle 1 saat geçerli bir token alabilirsiniz. Test ve acil durumlar için idealdir.

1.  [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) adresine gidin.
2.  Sağ üstten **"Sign In"** diyerek Outlook hesabınızla giriş yapın.
3.  Sol üstteki **"Access Token"** sekmesine tıklayın.
4.  Çıkan karmaşık kodu kopyalayın.
5.  BreviAI'de **Ayarlar > Değişkenler** kısmına gidin.
6.  Yeni Değişken: `MICROSOFT_ACCESS_TOKEN` oluşturun ve kodu yapıştırın.

## ⚠️ Önemli Not
Bu token 1 saat sonra geçersiz olur. Kalıcı entegrasyon için Kurumsal Azure AD kaydı gerekir (v1.2'de gelecek).
Şu anki sürümde sadece "Görev Bazlı" (Task-Based) token girişi desteklenmektedir.
