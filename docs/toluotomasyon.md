# Cakismayan 16 Yuksek Deger Otomasyon (JSON Dahil)

Son guncelleme: 20 Subat 2026

Not:
- Bu liste, `backend/src/data/seed_templates.ts` icindeki mevcut otomasyonlarla cakisma azaltilarak hazirlandi.
- Odak: gercek operasyonel aci noktasi (SLA, churn, risk, tahsilat, stok, uyum).

## 1) Sozlesme Yenileme Risk Skoru
```json
{
  "name": "Sozlesme Yenileme Risk Skoru",
  "nodes": [
    { "id": "1", "type": "TIME_TRIGGER", "label": "Gunluk 09:00", "config": { "hour": 9, "minute": 0, "repeat": true, "days": [1,2,3,4,5] }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "SHEETS_READ", "label": "Sozlesmeler", "config": { "spreadsheetId": "CONTRACT_SHEET_ID", "range": "Contracts!A:Z", "variableName": "contracts" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "AGENT_AI", "label": "Risk Hesapla", "config": { "prompt": "Yenilemeye 45 gunden az kalan sozlesmeler icin churn ve yenilememe riski skorla: {{contracts}}", "provider": "gemini", "variableName": "renewalRisk" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "IF_ELSE", "label": "Kritik Risk?", "config": { "left": "{{renewalRisk.maxScore}}", "operator": ">", "right": "70" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "EMAIL_SEND", "label": "CSM Uyar", "config": { "to": "csm@example.com", "subject": "Kritik yenileme riski", "body": "{{renewalRisk}}" }, "position": { "x": 250, "y": 450 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "true" }
  ]
}
```

## 2) Durusma Cakisma Dedektoru
```json
{
  "name": "Durusma Cakisma Dedektoru",
  "nodes": [
    { "id": "1", "type": "TIME_TRIGGER", "label": "Her aksam 18:00", "config": { "hour": 18, "minute": 0, "repeat": true, "days": [1,2,3,4,5] }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "CALENDAR_READ", "label": "Yarinin takvimi", "config": { "variableName": "tomorrowEvents", "maxEvents": 50 }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "AGENT_AI", "label": "Cakisma analizi", "config": { "prompt": "Durusma saatleri ve lokasyonlarina gore zaman/ulasim cakismasi tespit et: {{tomorrowEvents}}", "provider": "gemini", "variableName": "conflicts" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "IF_ELSE", "label": "Cakisma var mi?", "config": { "left": "{{conflicts.count}}", "operator": ">", "right": "0" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "WHATSAPP_SEND", "label": "Avukati bilgilendir", "config": { "phoneNumber": "90555XXXXXXX", "message": "Yarin icin durusma cakismasi tespit edildi: {{conflicts}}" }, "position": { "x": 250, "y": 450 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "true" }
  ]
}
```

## 3) Tebligat Son Tarih Emniyet Agi
```json
{
  "name": "Tebligat Son Tarih Emniyet Agi",
  "nodes": [
    { "id": "1", "type": "EMAIL_TRIGGER", "label": "Tebligat maili", "config": { "senderFilter": "", "subjectFilter": "tebligat|durusma|mahkeme" }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "AGENT_AI", "label": "Son tarih cikar", "config": { "prompt": "Bu metinden son tarih, dosya no, mahkeme ve aksiyon cikar: {{triggerMessage}}", "provider": "gemini", "variableName": "legalMeta" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "CALENDAR_CREATE", "label": "Takvime yaz", "config": { "title": "Yasal Son Tarih {{legalMeta.caseNo}}", "notes": "{{legalMeta}}", "startDate": "{{legalMeta.dueDate}}" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "NOTIFICATION", "label": "Anlik uyari", "config": { "title": "Yeni yasal son tarih", "message": "{{legalMeta.dueDate}} icin kayit olusturuldu." }, "position": { "x": 100, "y": 350 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
  ]
}
```

## 4) Musteri Sessizlik (Churn) Alarmi
```json
{
  "name": "Musteri Sessizlik Churn Alarmi",
  "nodes": [
    { "id": "1", "type": "TIME_TRIGGER", "label": "Gunluk 10:00", "config": { "hour": 10, "minute": 0, "repeat": true, "days": [1,2,3,4,5] }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "SHEETS_READ", "label": "CRM aktivite export", "config": { "spreadsheetId": "CRM_ACTIVITY_SHEET_ID", "range": "Activity!A:Z", "variableName": "crmActivities" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "AGENT_AI", "label": "Churn skoru", "config": { "prompt": "Son 30 gunde sessiz kalan musterileri churn riskine gore skorla ve ilk 10 kritik hesabi sec: {{crmActivities}}", "provider": "gemini", "variableName": "churnRisk" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "IF_ELSE", "label": "Kritik var mi?", "config": { "left": "{{churnRisk.count}}", "operator": ">", "right": "0" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "EMAIL_SEND", "label": "CSM playbook", "config": { "to": "retention@example.com", "subject": "Bugunku churn risk listesi", "body": "{{churnRisk}}" }, "position": { "x": 250, "y": 450 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "true" }
  ]
}
```

## 5) Rakip Fiyat Degisim Radari
```json
{
  "name": "Rakip Fiyat Degisim Radari",
  "nodes": [
    { "id": "1", "type": "TIME_TRIGGER", "label": "Gunluk 08:00", "config": { "hour": 8, "minute": 0, "repeat": true, "days": [1,2,3,4,5,6,0] }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "WEB_AUTOMATION", "label": "Rakip fiyat cek", "config": { "url": "https://competitor.example.com/pricing", "actions": [{ "type": "wait", "value": "1500" }], "headless": true }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "SHEETS_READ", "label": "Bizim fiyatlar", "config": { "spreadsheetId": "PRICE_SHEET_ID", "range": "Prices!A:D", "variableName": "ourPrices" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "AGENT_AI", "label": "Fark analizi", "config": { "prompt": "Rakip ve bizim fiyatlari karsilastir, kritik degisimleri cikar: Rakip={{previous_output}}, Biz={{ourPrices}}", "provider": "gemini", "variableName": "priceDiff" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "NOTIFICATION", "label": "Fiyat alarmi", "config": { "title": "Rakip fiyat degisimi", "message": "{{priceDiff.summary}}" }, "position": { "x": 100, "y": 450 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
  ]
}
```

## 6) Destek Ticket Kok Neden Kumeleme
```json
{
  "name": "Destek Ticket Kok Neden Kumeleme",
  "nodes": [
    { "id": "1", "type": "WEBHOOK_TRIGGER", "label": "Ticket kapandi", "config": { "path": "support-closed", "method": "POST" }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "AGENT_AI", "label": "Kok neden bul", "config": { "prompt": "Ticket metnini kok neden etiketleriyle siniflandir: {{triggerMessage}}", "provider": "gemini", "variableName": "rca" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "SHEETS_WRITE", "label": "RCA tablosu", "config": { "spreadsheetId": "SUPPORT_RCA_ID", "range": "RCA!A:F", "values": "{{rca}}", "append": true }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "SHOW_TEXT", "label": "Kayit ozet", "config": { "title": "RCA Kaydedildi", "content": "{{rca}}" }, "position": { "x": 100, "y": 350 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
  ]
}
```

## 7) SLA Ihlali Once Eskalasyon
```json
{
  "name": "SLA Ihlali Once Eskalasyon",
  "nodes": [
    { "id": "1", "type": "TIME_TRIGGER", "label": "Saatlik", "config": { "hour": 0, "minute": 0, "repeat": true, "days": [1,2,3,4,5,6,0] }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "SHEETS_READ", "label": "Acil ticket listesi", "config": { "spreadsheetId": "HELPDESK_SLA_SHEET_ID", "range": "OpenTickets!A:Z", "variableName": "openTickets" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "AGENT_AI", "label": "SLA risk listesi", "config": { "prompt": "Acik ticketlardan SLA ihlaline 4 saatten az kalanlari cikar ve onceliklendir: {{openTickets}}", "provider": "gemini", "variableName": "slaRisk" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "IF_ELSE", "label": "Risk var mi?", "config": { "left": "{{slaRisk.count}}", "operator": ">", "right": "0" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "EMAIL_SEND", "label": "Lidere eskale et", "config": { "to": "support-lead@example.com", "subject": "SLA riski olan ticketlar", "body": "{{slaRisk}}" }, "position": { "x": 250, "y": 450 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "true" }
  ]
}
```

## 8) 14 Gun Nakit Akisi Tahmini
```json
{
  "name": "14 Gun Nakit Akisi Tahmini",
  "nodes": [
    { "id": "1", "type": "TIME_TRIGGER", "label": "Gunluk 07:30", "config": { "hour": 7, "minute": 30, "repeat": true, "days": [1,2,3,4,5] }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "SHEETS_READ", "label": "Gelir Gider", "config": { "spreadsheetId": "FINANCE_SHEET_ID", "range": "Cashflow!A:K", "variableName": "cashRows" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "AGENT_AI", "label": "Tahmin modeli", "config": { "prompt": "14 gunluk nakit akisi tahmini, kritik gunler ve onlem onerileri uret: {{cashRows}}", "provider": "gemini", "variableName": "cashForecast" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "PDF_CREATE", "label": "Rapor PDF", "config": { "items": "{{cashForecast}}", "filename": "nakit_akisi_14gun.pdf", "variableName": "cashPdf" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "EMAIL_SEND", "label": "Finansa gonder", "config": { "to": "finance@example.com", "subject": "14 gunluk nakit akisi", "body": "{{cashForecast}}" }, "position": { "x": 100, "y": 450 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
  ]
}
```

## 9) Stokout Erken Uyari
```json
{
  "name": "Stokout Erken Uyari",
  "nodes": [
    { "id": "1", "type": "TIME_TRIGGER", "label": "Gunluk 11:00", "config": { "hour": 11, "minute": 0, "repeat": true, "days": [1,2,3,4,5,6] }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "SHEETS_READ", "label": "Stok tablosu", "config": { "spreadsheetId": "INVENTORY_SHEET_ID", "range": "Stock!A:H", "variableName": "stockRows" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "AGENT_AI", "label": "Stokout tespiti", "config": { "prompt": "7 gun icinde stokout riski olan urunleri tespit et: {{stockRows}}", "provider": "gemini", "variableName": "stockRisk" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "IF_ELSE", "label": "Risk var mi?", "config": { "left": "{{stockRisk.count}}", "operator": ">", "right": "0" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "WHATSAPP_SEND", "label": "Satin alma uyari", "config": { "phoneNumber": "90555XXXXXXX", "message": "Stokout riski: {{stockRisk}}" }, "position": { "x": 250, "y": 450 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "true" }
  ]
}
```

## 10) Iade Dolandiricilik Skoru
```json
{
  "name": "Iade Dolandiricilik Skoru",
  "nodes": [
    { "id": "1", "type": "WEBHOOK_TRIGGER", "label": "Iade talebi", "config": { "path": "returns/new", "method": "POST" }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "SHEETS_READ", "label": "Iade gecmisi", "config": { "spreadsheetId": "RETURNS_HISTORY_SHEET_ID", "range": "Returns!A:Z", "variableName": "customerHistory" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "AGENT_AI", "label": "Fraud skoru", "config": { "prompt": "Iade talebi ve musteri gecmisine gore dolandiricilik riski skorla: Talep={{triggerMessage}}, Gecmis={{customerHistory}}", "provider": "gemini", "variableName": "fraudRisk" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "IF_ELSE", "label": "Skor > 80?", "config": { "left": "{{fraudRisk.score}}", "operator": ">", "right": "80" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "NOTIFICATION", "label": "Risk ekibini uyar", "config": { "title": "Yuksek iade riski", "message": "{{fraudRisk}}" }, "position": { "x": 250, "y": 450 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "true" }
  ]
}
```

## 11) PII Sizinti Onleyici Mail Gate
```json
{
  "name": "PII Sizinti Onleyici Mail Gate",
  "nodes": [
    { "id": "1", "type": "MANUAL_TRIGGER", "label": "Mail kontrol", "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "TEXT_INPUT", "label": "Mail metni", "config": { "prompt": "Gonderilecek mail icerigini gir", "variableName": "draftBody" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "AGENT_AI", "label": "PII tarama", "config": { "prompt": "Bu metinde KVKK kapsaminda hassas veri var mi? Varsa alanlari listele: {{draftBody}}", "provider": "gemini", "variableName": "piiScan" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "IF_ELSE", "label": "Hassas veri var mi?", "config": { "left": "{{piiScan.containsPII}}", "operator": "==", "right": "true" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "SHOW_TEXT", "label": "Gonderimi durdur", "config": { "title": "PII Uyarisi", "content": "{{piiScan}}" }, "position": { "x": 250, "y": 450 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "true" }
  ]
}
```

## 12) Toplanti Sonrasi CRM Auto-Update
```json
{
  "name": "Toplanti Sonrasi CRM Auto-Update",
  "nodes": [
    { "id": "1", "type": "MANUAL_TRIGGER", "label": "Baslat", "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "FILE_PICK", "label": "Toplanti kaydi", "config": { "allowedTypes": ["audio", "text"], "multiple": false, "variableName": "meetingFile" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "SPEECH_TO_TEXT", "label": "Transkript", "config": { "language": "tr-TR", "variableName": "meetingText" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "AGENT_AI", "label": "CRM alanlarini cikar", "config": { "prompt": "Toplanti metninden opportunity stage, next step, owner ve due date cikar: {{meetingText}}", "provider": "gemini", "variableName": "crmPatch" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "SHEETS_WRITE", "label": "CRM Sync Kuyrugu", "config": { "spreadsheetId": "CRM_SYNC_QUEUE_ID", "range": "Queue!A:F", "values": "{{crmPatch}}", "append": true }, "position": { "x": 100, "y": 450 } },
    { "id": "6", "type": "NOTIFICATION", "label": "Sync kaydi olustu", "config": { "title": "CRM Guncelleme", "message": "Kayit CRM sync kuyruguna eklendi." }, "position": { "x": 100, "y": 550 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" },
    { "id": "e5-6", "sourceNodeId": "5", "targetNodeId": "6", "sourcePort": "default" }
  ]
}
```

## 13) Aday On Eleme ve Interview Slot
```json
{
  "name": "Aday On Eleme ve Interview Slot",
  "nodes": [
    { "id": "1", "type": "WEBHOOK_TRIGGER", "label": "Yeni basvuru", "config": { "path": "hr/new-candidate", "method": "POST" }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "AGENT_AI", "label": "CV skorlama", "config": { "prompt": "Basvuruyu JD'ye gore 100 uzerinden skorla: {{triggerMessage}}", "provider": "gemini", "variableName": "candidateScore" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "IF_ELSE", "label": "Skor >= 75?", "config": { "left": "{{candidateScore.score}}", "operator": ">=", "right": "75" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "CALENDAR_CREATE", "label": "Interview slot", "config": { "title": "Interview - {{triggerMessage.name}}", "notes": "{{candidateScore}}", "startDate": "{{candidateScore.suggestedDate}}" }, "position": { "x": 250, "y": 350 } },
    { "id": "5", "type": "EMAIL_SEND", "label": "Adaya mail", "config": { "to": "{{triggerMessage.email}}", "subject": "Interview daveti", "body": "Sizi interview'a davet ediyoruz. Detay: {{candidateScore.suggestedDate}}" }, "position": { "x": 250, "y": 450 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "true" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
  ]
}
```

## 14) Tahsilat Arama Penceresi Optimizasyonu
```json
{
  "name": "Tahsilat Arama Penceresi Optimizasyonu",
  "nodes": [
    { "id": "1", "type": "TIME_TRIGGER", "label": "Gunluk 09:30", "config": { "hour": 9, "minute": 30, "repeat": true, "days": [1,2,3,4,5] }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "SHEETS_READ", "label": "Odeme ve arama gecmisi", "config": { "spreadsheetId": "COLLECTIONS_SHEET_ID", "range": "Calls!A:K", "variableName": "collectionData" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "AGENT_AI", "label": "En iyi saat onerisi", "config": { "prompt": "Musteri bazli ulasilabilirlik ve odeme olasiligina gore en iyi arama saatini cikar: {{collectionData}}", "provider": "gemini", "variableName": "callWindowPlan" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "WHATSAPP_SEND", "label": "Tahsilat ekibine gonder", "config": { "phoneNumber": "90555XXXXXXX", "message": "Bugunku en iyi arama pencereleri: {{callWindowPlan}}" }, "position": { "x": 100, "y": 350 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
  ]
}
```

## 15) Operasyon Anomali Nobetcisi
```json
{
  "name": "Operasyon Anomali Nobetcisi",
  "nodes": [
    { "id": "1", "type": "TIME_TRIGGER", "label": "Her saat basi", "config": { "hour": 0, "minute": 0, "repeat": true, "days": [1,2,3,4,5,6,0] }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "SHEETS_READ", "label": "Canli KPI export", "config": { "spreadsheetId": "OPS_KPI_SHEET_ID", "range": "Live!A:Z", "variableName": "opsMetrics" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "AGENT_AI", "label": "Anomali tespiti", "config": { "prompt": "Bu KPI akisinda anomali var mi? varsa etki ve acil aksiyon yaz: {{opsMetrics}}", "provider": "gemini", "variableName": "opsAlert" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "IF_ELSE", "label": "Anomali var mi?", "config": { "left": "{{opsAlert.hasAnomaly}}", "operator": "==", "right": "true" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "EMAIL_SEND", "label": "Nobet ekibi", "config": { "to": "oncall@example.com", "subject": "Operasyon anomali alarmi", "body": "{{opsAlert}}" }, "position": { "x": 250, "y": 450 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "true" }
  ]
}
```

## 16) Gunluk Piyasa Trafik Hava Haber Brifingi (Web Scrape)
```json
{
  "name": "Gunluk Piyasa Trafik Hava Haber Brifingi",
  "nodes": [
    { "id": "1", "type": "TIME_TRIGGER", "label": "Hafta ici 07:45", "config": { "hour": 7, "minute": 45, "repeat": true, "days": [1,2,3,4,5] }, "position": { "x": 100, "y": 50 } },
    { "id": "2", "type": "BROWSER_SCRAPE", "label": "Dolar kurunu cek", "config": { "url": "https://www.doviz.com/dolar", "waitForSelector": "body", "selector": "body", "variableName": "usdRaw" }, "position": { "x": 100, "y": 150 } },
    { "id": "3", "type": "BROWSER_SCRAPE", "label": "IBB trafik durumunu cek", "config": { "url": "https://uym.ibb.gov.tr/traffic/index/", "waitForSelector": "body", "selector": "body", "variableName": "ibbTrafficRaw" }, "position": { "x": 100, "y": 250 } },
    { "id": "4", "type": "BROWSER_SCRAPE", "label": "Istanbul hava durumunu cek", "config": { "url": "https://www.mgm.gov.tr/tahmin/il-ve-ilceler.aspx?il=Istanbul", "waitForSelector": "body", "selector": "body", "variableName": "weatherRaw" }, "position": { "x": 100, "y": 350 } },
    { "id": "5", "type": "BROWSER_SCRAPE", "label": "Gunluk haber mansetlerini cek", "config": { "url": "https://www.aa.com.tr/tr", "waitForSelector": "body", "selector": "body", "variableName": "newsRaw" }, "position": { "x": 100, "y": 450 } },
    { "id": "6", "type": "AGENT_AI", "label": "Brifing ozetini uret", "config": { "prompt": "Asagidaki web scraping verilerinden tek bir sabah brifingi cikart. Mutlaka su alanlari doldur: 1) USDTRY anlik kur (tek sayi ve kaynak), 2) IBB trafik ozeti (oran/yogunluk ve kisa yorum), 3) Istanbul hava ozeti (durum + sicaklik), 4) ilk 5 haber manseti. Ciktiyi kisa ve yonetime uygun ver.\n\nDOLAR VERISI:\n{{usdRaw}}\n\nTRAFIK VERISI:\n{{ibbTrafficRaw}}\n\nHAVA VERISI:\n{{weatherRaw}}\n\nHABER VERISI:\n{{newsRaw}}", "provider": "gemini", "model": "gemini-2.0-flash-exp", "outputFormat": "text", "variableName": "dailyBrief" }, "position": { "x": 100, "y": 550 } },
    { "id": "7", "type": "SHOW_TEXT", "label": "Brifingi goster", "config": { "title": "Gunluk Piyasa-Trafik-Hava-Haber Brifingi", "content": "{{dailyBrief}}" }, "position": { "x": 100, "y": 650 } },
    { "id": "8", "type": "WHATSAPP_SEND", "label": "Takima gonder", "config": { "phoneNumber": "90555XXXXXXX", "message": "Gunluk brifing:\n{{dailyBrief}}" }, "position": { "x": 250, "y": 650 } }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" },
    { "id": "e5-6", "sourceNodeId": "5", "targetNodeId": "6", "sourcePort": "default" },
    { "id": "e6-7", "sourceNodeId": "6", "targetNodeId": "7", "sourcePort": "default" },
    { "id": "e6-8", "sourceNodeId": "6", "targetNodeId": "8", "sourcePort": "default" }
  ]
}
```

## Kaynaklar (Web)
- Microsoft Work Trend Index (2025): https://www.microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday
- Asana State of Work Innovation: https://asana.com/resources/state-of-work-innovation
- McKinsey automation research: https://www.mckinsey.com/featured-insights/future-of-work
- WHO medication adherence: https://www.who.int/news/item/01-07-2003-failure-to-take-prescribed-medicine-for-chronic-diseases-is-a-massive-world-wide-problem
- DOE energy efficiency: https://www.energy.gov/energysaver

## 17) MCP Destekli Gunluk Haber Arastirma ve Ozet
Not:
- Bu senaryodaki `WEB_SEARCH` node'u artik MCP `breviai.web_search` araci uzerinden calisir.
- MCP tarafinda sorun olursa istemci otomatik olarak eski `/api/search` fallback yoluna gecer.

```json
{
  "name": "MCP Destekli Gunluk Haber Arastirma ve Ozet",
  "nodes": [
    {
      "id": "1",
      "type": "TIME_TRIGGER",
      "label": "Hafta ici 08:30",
      "config": { "hour": 8, "minute": 30, "repeat": true, "days": [1,2,3,4,5] },
      "position": { "x": 100, "y": 50 }
    },
    {
      "id": "2",
      "type": "WEB_SEARCH",
      "label": "MCP ile web ara",
      "config": { "query": "Turkiye ekonomi ve teknoloji son dakika haberleri" },
      "position": { "x": 100, "y": 170 }
    },
    {
      "id": "3",
      "type": "AGENT_AI",
      "label": "Yonetici ozeti uret",
      "config": {
        "provider": "gemini",
        "variableName": "briefing",
        "prompt": "Asagidaki arama sonuclarini ({{searchResults}}) en fazla 6 maddede ozetle. Her maddede neden onemli oldugunu tek cumle ile belirt."
      },
      "position": { "x": 100, "y": 290 }
    },
    {
      "id": "4",
      "type": "SHOW_TEXT",
      "label": "Ozeti goster",
      "config": {
        "title": "Gunluk Haber Ozeti",
        "content": "{{briefing}}"
      },
      "position": { "x": 100, "y": 410 }
    },
    {
      "id": "5",
      "type": "WHATSAPP_SEND",
      "label": "Takima gonder",
      "config": {
        "phoneNumber": "90555XXXXXXX",
        "message": "Gunluk MCP haber ozeti:\n{{briefing}}"
      },
      "position": { "x": 260, "y": 410 }
    }
  ],
  "edges": [
    { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
    { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
    { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
    { "id": "e3-5", "sourceNodeId": "3", "targetNodeId": "5", "sourcePort": "default" }
  ]
}
```
