# BreviAI Development Log

## 2026-02-01

Tamamlananlar:
- Multi-provider AI desteği (OpenAI, Claude, Gemini)
- OpenAI ve Claude çağırıcıları
- WhatsApp automation view

Araştırma Notu (Gemini Nano):
- Cihaz üstü model araştırması yapıldı.
- Offline AI mode için ileri faza bırakıldı.

## 2026-02-19

WhatsApp ve runtime düzeltmeleri:
- `send_whatsapp` hata çıktıları daha ayrıntılı hale getirildi.
- Uygun koşulda backend mode -> direct mode fallback eklendi.
- Headless çalışmada direct mode engellendi.
- Trigger tarafında telefon numarası çıkarımı sıkılaştırıldı.
- `send_whatsapp` için opsiyonel `mode` parametresi tanımlandı.

Mimari not:
- New Architecture zorunluluğu için ilgili Expo ayarları güncellendi.

## 2026-02-28

P0/P1 uygulama çıktıları:
- Backend fail-closed auth geçişi tamamlandı.
- Route seviyesinde wildcard CORS temizliği tamamlandı.
- Backend lint kapısı yeşile çekildi.
- Mobilde environment tabanlı API URL çözümü uygulandı.
- Startup alert zinciri sadeleştirildi.
- Dev seed/mock ayrımı production akışından ayrıştırıldı.

P2 ilerleme:
- Widget resize adaptasyonu eklendi (`onAppWidgetOptionsChanged` + seçenek bazlı satır hesaplama).
- Doküman encoding/format normalizasyonu başlatıldı ve çekirdek dosyalar güncellendi.

## Açık Konular

1. Widget otomatik test kapsamı genişletilecek.
2. Android compile doğrulaması CI ortamında sürekli hale getirilecek.
3. Doküman yönetim standardı (tek kaynak yaklaşımı) netleştirilecek.

