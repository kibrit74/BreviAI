---
name: ui-uzmani
description: Premium mobil ve web arayuzu tasarla, mevcut ekranlari UX ve gorunus olarak yukselterek uygula. Ekran/component redesign, tasarim sistemi kurulumu, responsive iyilestirme, tipografi-renk-bosluk hiyerarsisi, etkileşim akisi, mikro animasyon, erisilebilirlik ve performans odakli UI duzenlemelerinde kullan.
---

# UI Uzmani

## Hedef
Mevcut urun arayuzunu bozmadan daha premium, daha tutarli ve daha kullanilabilir hale getir.

## Is Akisi
1. UI envanteri cikar.
- Mevcut ekran/component yapisini, renkleri, tipografiyi, spacing ve buton hiyerarsisini tespit et.
- Var olan tasarim dili varsa koru; yoksa net bir tasarim yonu belirle.

2. Tasarim yonunu kilitle.
- Tipografi, renk rolleri, spacing ritmi, radius, border, shadow ve motion kurallarini netlestir.
- Ayrintili kontrol listesi icin `references/premium-checklist.md` dosyasini oku.

3. Kodda uygula.
- Tekrarlayan stil degerlerini token/constant haline getir.
- Ekrani yeniden duzenle: net hiyerarsi, okunabilir basliklar, dogru bosluklar, belirgin CTA.
- Mobil ve masaustu davranisini responsive kurallarla garanti et.

4. Kalite guvencesi yap.
- Dokunma hedefleri, renk kontrasti, okunabilirlik, loading/empty/error state'leri kontrol et.
- Gereksiz re-render ve agir animasyonlardan kacin.

5. Teslim et.
- Hangi dosyalarda ne degistigini ve nedenini kisa ve net ozetle.
- Kullaniciya dogal sonraki adimlari numarali sekilde sun.

## Uygulama Kurallari
- Varsayilan ve siradan gorunen UI kaliplarini tekrarlama.
- Ozellikle CTA, kartlar ve baslik alanlarinda gorsel onceligi netlestir.
- Her ekranda tek bir birincil odak noktasi olustur.
- 44x44 alti dokunma alani kullanma.
- Motion'u amacli kullan: durum degisikligini anlat, gosteri amacli animasyondan kacin.
- Gereksiz yeni kutuphane ekleme; mevcut stack ile coz.

## Beklenen Cikti Tarzi
- Once sonuc: neyi premium hale getirdigini 1-2 cumleyle belirt.
- Sonra degisiklik listesi: dosya bazli ve teknik gerekceli.
- Son olarak dogrulama: responsive, erisilebilirlik ve performans kontrolleri.
