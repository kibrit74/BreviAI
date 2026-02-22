# PillarAI (BreviAI) MCP Entegrasyonu Test Rehberi

PillarAI backend sisteminde Model Context Protocol (MCP) entegrasyonu başarıyla kurulmuş. İncelemelerime göre sistem, **HTTP üzerinden JSON formatında (http-json transport)** iletişim kuran özel bir MCP Gateway inşa etmiş.

## Mevcut Sistem Nasıl Çalışıyor?

- **Endpoint:** `/api/mcp`
- **Yetkilendirme:** İsteklerde `x-app-secret` header'ı zorunlu (`verifyAppSecretAuth` ile kontrol ediliyor).
- **Desteklenen Metotlar:**
  - `GET`: Sunucu kabiliyetlerini (capabilities) ve mevcut tüm MCP araçlarını (tools) listeler.
  - `POST`: Belirli bir aksiyonu gerçekleştirmek için kullanılır. `{ "action": "list_tools" }` veya `{ "action": "call_tool" }` JSON gövdelerini kabul eder.
- **Mevcut Araçlar:** 
  - `breviai.web_search`: Otomasyonların internette arama yapmasına olanak tanır.
  - `breviai.list_templates`: Sistemdeki iş akışı şablonlarını listeler.

## Nasıl Test Edebiliriz?

Bu yapı HTTP tabanlı olduğu için **cURL**, **Postman** veya herhangi bir HTTP test aracıyla kolayca test edilebilir. 

Aşağıdaki komutları kendi sisteminizde denerken, `.env.local` dosyanızdaki geçerli `APP_SECRET` değerini `BURAYA_APP_SECRET_YAZIN` yerine eklediğinizden emin olun. (Varsayılan olarak `localhost:3000` kullanılmıştır, URL'yi kendi ortamınıza göre değiştirebilirsiniz).

### 1. Araçları Listeleme (GET İsteği)

Bu komut, MCP sunucusunun ayakta olup olmadığını ve yetkilendirmenin çalışıp çalışmadığını test etmek için en hızlı yoldur.

```bash
curl -X GET "http://localhost:3000/api/mcp" \
     -H "x-app-secret: BURAYA_APP_SECRET_YAZIN" \
     -H "Content-Type: application/json"
```

**Beklenen Çıktı:** Sunucu `protocol`, `server` bilgileri ve `breviai.web_search` gibi araçların bulunduğu bir JSON dönecektir.

### 2. Araçları Listeleme (POST İsteği)

Sistem `POST` üzerinden de listeleme desteklemektedir.

```bash
curl -X POST "http://localhost:3000/api/mcp" \
     -H "x-app-secret: BURAYA_APP_SECRET_YAZIN" \
     -H "Content-Type: application/json" \
     -d '{"action": "list_tools"}'
```

### 3. Bir Aracı Çalıştırma: `breviai.web_search`

Bu test, MCP sunucusunun parametreleri doğru alıp arama işlemini (simüle edilmiş veya gerçek) yapıp yapamadığını kontrol eder.

```bash
curl -X POST "http://localhost:3000/api/mcp" \
     -H "x-app-secret: BURAYA_APP_SECRET_YAZIN" \
     -H "Content-Type: application/json" \
     -d '{
           "action": "call_tool",
           "toolName": "breviai.web_search",
           "arguments": {
               "query": "PillarAI nedir",
               "limit": 3
           }
         }'
```

**Beklenen Çıktı:** Arama sonuçlarını barındıran JSON verisi ve text içeriği döner. Ayrıca IP tabanlı limitlendirme (rate limiting) de test edilmiş olur.

### 4. Bir Aracı Çalıştırma: `breviai.list_templates`

```bash
curl -X POST "http://localhost:3000/api/mcp" \
     -H "x-app-secret: BURAYA_APP_SECRET_YAZIN" \
     -H "Content-Type: application/json" \
     -d '{
           "action": "call_tool",
           "toolName": "breviai.list_templates",
           "arguments": {
               "limit": 5
           }
         }'
```

## Güvenlik ve Hız Sınırları (Rate Limits)

Test ederken şunlara dikkat etmeniz gerekir:
- Hatalı bir `x-app-secret` verirseniz `401 Unauthorized` döner.
- `GET` istekleri için dakikada **120**, `POST` istekleri için dakikada **90** limit (rate limit) bulunmaktadır. Bu limiti test etmek için ardı ardına çok sayıda istek atabilirsiniz, sistemin `429 Too Many Requests` döndüğünü göreceksiniz.
- Tüm bu isteklerin tarihsel kayıtları (Execution History), veritabanına loglanır. İsterseniz admin panelinden giden/gelen istek loglarını kontrol edebilirsiniz.
