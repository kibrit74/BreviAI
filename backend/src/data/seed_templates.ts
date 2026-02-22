import { ShortcutTemplate as BaseTemplate } from './types';

// ═══════════════════════════════════════════════════════════════
// BREVIAI OTOMASYON KÜTÜPHANESİ (SEED TEMPLATES)
// ═══════════════════════════════════════════════════════════════

export const SEED_TEMPLATES: BaseTemplate[] = [
    // 🏢 İŞ VE ÜRETKENLİK
    {
        id: 'work-1',
        title: 'Günlük Toplantı Hazırlığı',
        title_en: 'Daily Meeting Prep',
        description: 'Sabah 08:30\'da takvimi kontrol eder ve katılımcı özetini mail atar.',
        description_en: 'Checks calendar at 08:30 AM and emails attendee summary.',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '10k+',
        tags: ['meeting', 'calendar', 'email', 'toplantı'],
        template_json: {
            "name": "Günlük Toplantı Hazırlığı",
            "description": "Sabah 08:30'da çalışır. Takvimi kontrol eder ve katılımcı özetini mail atar.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Hafta İçi 08:30", "data": { "cron": "30 8 * * 1-5" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "CALENDAR_READ", "label": "Bugünkü Toplantılar", "data": { "range": "today", "variableName": "events" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "📝 Toplantı Analisti", "data": { "model": "gemini-pro", "prompt": "Bugünkü toplantıları incele: {{events}}. Katılımcıları listele ve her biri için kısa bir LinkedIn/Web araması özeti yapıyormuş gibi bilgi ver.", "variableName": "summary", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "EMAIL_SEND", "label": "Kendime Mail At", "data": { "to": "me", "subject": "📅 Günlük Toplantı Brifingi", "body": "{{summary}}" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'work-2',
        title: 'Kartvizit Sayısallaştırıcı',
        title_en: 'Business Card Scanner',
        description: 'Kamera ile çekilen kartviziti kişilere kaydeder ve SMS atar.',
        description_en: 'Scans business card, saves contact and sends SMS.',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '8k+',
        tags: ['ocr', 'contact', 'camera', 'kartvizit'],
        template_json: {
            "name": "Kartvizit Sayısallaştırıcı",
            "description": "Kamera ile çekilen kartviziti kişilere kaydeder.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Başlat", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "CAMERA_TAKE", "label": "Kartvizit Çek", "data": { "camera": "back", "variableName": "image" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "🔍 OCR ve Analiz", "data": { "model": "gemini-pro-vision", "prompt": "Bu kartvizit görüntüsündeki bilgileri ayrıştır: İsim, Telefon, Email, Şirket. JSON döndür: {name, phone, email, company}", "attachments": "{{image}}", "variableName": "contactInfo", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "CONTACTS_WRITE", "label": "Rehbere Kaydet", "data": { "name": "{{contactInfo.name}}", "phone": "{{contactInfo.phone}}", "email": "{{contactInfo.email}}", "company": "{{contactInfo.company}}" }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "SMS_SEND", "label": "Tanışma Mesajı", "data": { "phoneNumber": "{{contactInfo.phone}}", "message": "Merhaba {{contactInfo.name}}, tanıştığımıza memnun oldum. Kartvizitinizi kaydettim. Saygılar." }, "position": { "x": 100, "y": 500 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'work-3',
        title: 'Acil E-posta Bildirimi',
        title_en: 'Urgent Email Alert',
        description: 'Önemli mailleri analiz eder ve Telegram\'dan bildirir.',
        description_en: 'Analyzes emails and notifies via Telegram if urgent.',
        category: 'Business',
        author: 'BreviAI',
        downloads: '12k+',
        tags: ['email', 'telegram', 'filter', 'acil'],
        template_json: {
            "name": "Acil E-posta Bildirimi",
            "description": "Gmail'den gelen mailleri analiz eder ve acil olanları Telegram'a atar.",
            "nodes": [
                { "id": "1", "type": "NOTIFICATION_TRIGGER", "label": "Gmail Bildirimi", "data": { "packageName": "com.google.android.gm", "variableName": "notif" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AGENT_AI", "label": "📧 Mail Analiz", "data": { "model": "gemini-pro", "prompt": "Gelen bildirim: {{notif.text}}. Bu mail 'Acil', 'Fatura' veya 'Hata' içeriyor mu? Önemliyse 'true', değilse 'false' döndür.", "variableName": "isUrgent", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "IF_ELSE", "label": "Önemli mi?", "data": { "left": "{{isUrgent}}", "operator": "contains", "right": "true" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "TELEGRAM_SEND", "label": "Telegram'a At", "data": { "message": "🚨 ÖNEMLİ MAİL: {{notif.text}}", "botToken": "", "chatId": "" }, "position": { "x": 200, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "true" }
            ]
        }
    },
    {
        id: 'work-4',
        title: 'Sesli Görev Yöneticisi',
        title_en: 'Voice Task Manager',
        description: 'Sesli notlarınızı Google Sheets görev listesine dönüştürür.',
        description_en: 'Converts voice notes to Google Sheets tasks.',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '15k+',
        tags: ['voice', 'sheets', 'task', 'ses'],
        template_json: {
            "name": "Sesli Görev Yöneticisi",
            "description": "Sesli Nottan Görev Oluşturma (Ses -> Sheets)",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Kaydı Başlat", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AUDIO_RECORD", "label": "Ses Kaydet", "data": { "duration": 30, "variableName": "audioFile" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SPEECH_TO_TEXT", "label": "Metne Çevir", "data": { "variableName": "transcription" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "AGENT_AI", "label": "📋 Görev Çıkarıcı", "data": { "model": "gemini-pro", "prompt": "Bu metindeki görevleri (action items) JSON listesi olarak çıkar: {{transcription}}", "variableName": "tasks", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "SHEETS_WRITE", "label": "E-Tabloya Ekle", "data": { "spreadsheetId": "YOUR_SHEET_ID", "range": "Tasks!A:B", "values": "[\"{{tasks}}\"]", "append": true }, "position": { "x": 100, "y": 500 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'work-5',
        title: 'Profesyonel Yanıtlayıcı',
        title_en: 'Professional Replier',
        description: 'Panodaki metne yapay zeka ile kurumsal yanıt yazar.',
        description_en: 'Generates professional replies for clipboard text using AI.',
        category: 'Business',
        author: 'BreviAI',
        downloads: '20k+',
        tags: ['clipboard', 'ai', 'email', 'yanıt'],
        template_json: {
            "name": "Profesyonel Yanıtlayıcı",
            "description": "Panodaki metne kurumsal yanıt yazar.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Yanıtla", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "CLIPBOARD_READER", "label": "Panoyu Oku", "data": { "variableName": "clipContent" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "👔 Kurumsal Yazar", "data": { "model": "gemini-pro", "prompt": "Bu mesaja çok kibar, profesyonel ve kurumsal bir yanıt yaz: {{clipContent}}", "variableName": "response", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SHOW_TEXT", "label": "Sonuç", "data": { "text": "{{response}}" }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "NOTIFICATION", "label": "Hazır!", "data": { "title": "Yanıt Hazır", "message": "Kopyalamak için metne dokunun.", "type": "toast" }, "position": { "x": 100, "y": 500 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
            ]
        }
    },

    // 🏠 YAŞAM VE KİŞİSEL
    {
        id: 'life-1',
        title: 'Günaydın Rutini',
        title_en: 'Morning Routine',
        description: 'Işıkları açar, havayı okur ve motivasyon konuşması yapar.',
        description_en: 'Turns on lights, reads weather and gives motivation.',
        category: 'Lifestyle',
        author: 'BreviAI',
        downloads: '25k+',
        tags: ['morning', 'smart home', 'weather', 'günaydın'],
        template_json: {
            "name": "Günaydın Rutini",
            "description": "Işıkları açar, havayı okur ve motivasyon konuşması yapar.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Hafta İçi 07:00", "data": { "cron": "0 7 * * 1-5" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "PHILIPS_HUE", "label": "Işıkları Aç", "data": { "action": "on", "bridgeIp": "", "apiKey": "" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "WEATHER_GET", "label": "Hava Durumu", "data": { "variableName": "weather" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "CALENDAR_READ", "label": "Takvim", "data": { "type": "today", "variableName": "events" }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "AGENT_AI", "label": "🎙️ Günlük Brifing", "data": { "model": "gemini-pro", "prompt": "Hava: {{weather}}. Etkinlikler: {{events}}. Bana güne başlarken enerjik bir motivasyon konuşması hazırla.", "variableName": "briefing", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 500 } },
                { "id": "6", "type": "SPEAK_TEXT", "label": "Sesli Oku", "data": { "text": "{{briefing}}" }, "position": { "x": 100, "y": 600 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" },
                { "id": "e5", "sourceNodeId": "5", "targetNodeId": "6", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'life-2',
        title: 'İlaç Hatırlatıcı',
        title_en: 'Medication Reminder',
        description: 'İlaç vaktini hatırlatır ve içilmediyse tekrar uyarır.',
        description_en: 'Reminds medication and alerts again if skipped.',
        category: 'Health',
        author: 'BreviAI',
        downloads: '5k+',
        tags: ['health', 'reminder', 'sağlık', 'ilaç'],
        template_json: {
            "name": "İlaç Hatırlatıcı",
            "description": "İlaç vaktini hatırlatır ve içilmediyse tekrar uyarır.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Saat 12:00", "data": { "cron": "0 12 * * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "NOTIFICATION", "label": "İlaç Vakti", "data": { "title": "💊 İlaç", "message": "Antibiyotiğini içmeyi unutma!", "type": "push" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SHOW_MENU", "label": "Ne Yaptın?", "data": { "title": "İlacını içtin mi?", "options": ["İçtim", "Ertele"], "variableName": "status" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SWITCH", "label": "Karar", "data": { "variableName": "status", "cases": [{ "value": "İçtim", "portId": "case-0" }, { "value": "Ertele", "portId": "case-1" }] }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "FILE_WRITE", "label": "Kaydet", "data": { "filename": "med_log.txt", "content": "{{timestamp}}: İçildi", "append": true }, "position": { "x": 50, "y": 500 } },
                { "id": "6", "type": "DELAY", "label": "15 Dk Bekle", "data": { "duration": 15, "unit": "min" }, "position": { "x": 200, "y": 500 } },
                { "id": "7", "type": "NOTIFICATION", "label": "Tekrar Hatırlat", "data": { "message": "Hadi ilacını iç!", "type": "push" }, "position": { "x": 200, "y": 600 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "case-0" },
                { "id": "e5", "sourceNodeId": "4", "targetNodeId": "6", "sourcePort": "case-1" },
                { "id": "e6", "sourceNodeId": "6", "targetNodeId": "7", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'life-3',
        title: 'Akıllı Market Listesi',
        title_en: 'Smart Shopping List',
        description: 'Markete girdiğinizde listeyi açar ve tarif önerir.',
        description_en: 'Opens list and suggests recipes when entering market.',
        category: 'Lifestyle',
        author: 'BreviAI',
        downloads: '18k+',
        tags: ['shopping', 'geofence', 'food', 'market'],
        template_json: {
            "name": "Akıllı Market Listesi",
            "description": "Markete girdiğinizde listeyi açar ve tarif önerir.",
            "nodes": [
                { "id": "1", "type": "GEOFENCE_ENTER_TRIGGER", "label": "Markete Girince", "data": { "latitude": 41.0082, "longitude": 28.9784, "radius": 100, "geofenceId": "market_1" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "SHEETS_READ", "label": "Listeyi Çek", "data": { "spreadsheetId": "YOUR_SHEET_ID", "range": "ShoppingList!A:A", "variableName": "items" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "👨‍🍳 Tarif Önerici", "data": { "prompt": "Bu malzemelerle ne pişirebilirim? {{items}}", "variableName": "suggestion", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "WHATSAPP_SEND", "label": "Kendine Gönder", "data": { "phoneNumber": "ME", "message": "🛒 Liste: {{items}}\n💡 Öneri: {{suggestion}}" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'life-4',
        title: 'Harcama Takipçisi',
        title_en: 'Expense Tracker',
        description: 'Banka SMS\'lerini analiz edip Sheets\'e kaydeder.',
        description_en: 'Parses bank SMS and saves to Google Sheets.',
        category: 'Finance',
        author: 'BreviAI',
        downloads: '22k+',
        tags: ['finance', 'sms', 'budget', 'para'],
        template_json: {
            "name": "Harcama Takipçisi",
            "description": "Banka SMS'lerini analiz edip Sheets'e kaydeder.",
            "nodes": [
                { "id": "1", "type": "SMS_TRIGGER", "label": "Banka SMS", "data": { "phoneNumberFilter": "BANKA", "variableName": "sms" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AGENT_AI", "label": "💳 SMS Analiz", "data": { "prompt": "SMS: {{sms.message}}. Harcama tutarını, mağazayı ve kategoriyi JSON olarak çıkar: {amount, merchant, category}", "variableName": "expense", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SHEETS_WRITE", "label": "Bütçeye İşle", "data": { "spreadsheetId": "BUDGET_SHEET", "range": "Expenses!A:D", "values": "[\"{{timestamp}}\", \"{{expense.merchant}}\", \"{{expense.amount}}\", \"{{expense.category}}\"]", "append": true }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "NOTIFICATION", "label": "Kaydedildi", "data": { "message": "{{expense.amount}} TL harcama kaydedildi.", "type": "push" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },

    // 🚗 SEYAHAT VE ARAÇ
    {
        id: 'travel-1',
        title: 'Araç Modu',
        title_en: 'Car Mode',
        description: 'Bluetooth bağlandığında araç modunu açar.',
        description_en: 'Enables car mode when Bluetooth connects.',
        category: 'Travel',
        author: 'BreviAI',
        downloads: '30k+',
        tags: ['car', 'driving', 'spotify', 'araç'],
        template_json: {
            "name": "Araç Modu",
            "description": "Bluetooth bağlandığında araç modunu açar.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Araca Bağlanınca", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "SETTINGS_OPEN", "label": "Wi-Fi Kapat", "data": { "setting": "wifi" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "VOLUME_CONTROL", "label": "Ses %100", "data": { "level": 100, "type": "media" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "APP_LAUNCH", "label": "Spotify Başlat", "data": { "packageName": "com.spotify.music" }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "SMS_SEND", "label": "Eve Haber Ver", "data": { "phoneNumber": "HOME", "message": "Yola çıktım." }, "position": { "x": 100, "y": 500 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'travel-2',
        title: 'Park Yeri Kaydet',
        title_en: 'Save Parking Spot',
        description: 'Aracınızdan ayrıldığınızda konumu kaydeder.',
        description_en: 'Saves location when you leave your car.',
        category: 'Travel',
        author: 'BreviAI',
        downloads: '40k+',
        tags: ['parking', 'location', 'car', 'park'],
        template_json: {
            "name": "Park Yeri Kaydet",
            "description": "Aracınızdan ayrıldığınızda konumu kaydeder.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Araçtan İndim", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "LOCATION_GET", "label": "Konumu Al", "data": { "variableName": "loc", "accuracy": "high" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "TELEGRAM_SEND", "label": "Kendime Kaydet", "data": { "message": "🚗 Aracımı buraya park ettim: https://maps.google.com/?q={{loc.latitude}},{{loc.longitude}}", "chatId": "ME", "botToken": "" }, "position": { "x": 100, "y": 300 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'travel-3',
        title: 'Seyahat Çevirmeni',
        title_en: 'Travel Translator',
        description: 'Bulunduğunuz ülkeye göre rehberlik eder.',
        description_en: 'Guides you based on your current country.',
        category: 'Travel',
        author: 'BreviAI',
        downloads: '10k+',
        tags: ['travel', 'translate', 'guide', 'seyahat'],
        template_json: {
            "name": "Seyahat Çevirmeni",
            "description": "Bulunduğunuz ülkeye göre rehberlik eder.",
            "nodes": [
                { "id": "1", "type": "LOCATION_GET", "label": "Konum Al", "data": { "variableName": "loc" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AGENT_AI", "label": "🌍 Rehber", "data": { "prompt": "Şu an {{loc.address.country}} ülkesindeyim. Bana bu ülkenin para birimini, temel selamlaşma kelimelerini ve acil durum numaralarını listele.", "variableName": "guide", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "NOTIFICATION", "label": "Ülke Rehberi", "data": { "title": "Hoş Geldiniz!", "message": "{{guide}}", "type": "push" }, "position": { "x": 100, "y": 300 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'travel-4',
        title: 'Eve Varış Tahmini',
        title_en: 'ETA to Home',
        description: 'Trafik durumuna göre eve varış sürenizi paylaşır.',
        description_en: 'Shares ETA to home based on traffic.',
        category: 'Travel',
        author: 'BreviAI',
        downloads: '15k+',
        tags: ['traffic', 'eta', 'home', 'trafik'],
        template_json: {
            "name": "Eve Kaçta Varırım?",
            "description": "Trafik durumuna göre eve varış sürenizi paylaşır.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Eve Dön", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "LOCATION_GET", "label": "Konumum", "data": { "variableName": "from" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "WEB_SEARCH", "label": "Trafik Durumu", "data": { "url": "https://google.com/search?q=traffic+from+{{from.latitude}},{{from.longitude}}+to+Home", "variableName": "traffic" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "AGENT_AI", "label": "⏱️ Süre Hesapla", "data": { "prompt": "Trafik verisine göre tahmini varış süresini hesapla: {{traffic}}", "variableName": "eta", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "WHATSAPP_SEND", "label": "Haber Ver", "data": { "phoneNumber": "PARTNER", "message": "Yola çıkıyorum, tahmini varış: {{eta}}" }, "position": { "x": 100, "y": 500 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
            ]
        }
    },

    // 📱 SOSYAL MEDYA
    {
        id: 'social-1',
        title: 'Insta Caption Sihirbazı',
        title_en: 'Insta Caption Wizard',
        description: 'Fotoğrafınız için yaratıcı Instagram açıklamaları üretir.',
        description_en: 'Generates creative Instagram captions for your photo.',
        category: 'Social',
        author: 'BreviAI',
        downloads: '50k+',
        tags: ['instagram', 'caption', 'social', 'foto'],
        template_json: {
            "name": "Insta Caption Üretici",
            "description": "Fotoğrafınız için yaratıcı Instagram açıklamaları üretir.",
            "nodes": [
                { "id": "1", "type": "FILE_PICK", "label": "Foto Seç", "data": { "allowedTypes": ["image"], "variableName": "photo" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AGENT_AI", "label": "🎨 Yaratıcı Yazar", "data": { "model": "gemini-pro-vision", "prompt": "Bu fotoğrafa uygun, emojili ve popüler hashtag'li 3 farklı Instagram açıklaması yaz.", "attachments": "{{photo}}", "variableName": "captions", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SHOW_TEXT", "label": "Seç", "data": { "content": "{{captions}}" }, "position": { "x": 100, "y": 300 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'social-2',
        title: 'Tweet Zinciri Oluştur',
        title_en: 'Tweet Thread Creator',
        description: 'Bir konuyu viral olabilecek bir tweet zincirine dönüştürür.',
        description_en: 'Converts a topic into a viral tweet thread.',
        category: 'Social',
        author: 'BreviAI',
        downloads: '15k+',
        tags: ['twitter', 'thread', 'viral', 'tweet'],
        template_json: {
            "name": "Tweet Zinciri Oluştur",
            "description": "Bir konuyu viral olabilecek bir tweet zincirine dönüştürür.",
            "nodes": [
                { "id": "1", "type": "TEXT_INPUT", "label": "Konu", "data": { "prompt": "Konu nedir?", "variableName": "topic" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AGENT_AI", "label": "✍️ Flood Yazarı", "data": { "prompt": "Bu konu hakkında 5 tweetlik viral bir flood hazırla: {{topic}}", "variableName": "flood", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SHOW_TEXT", "label": "Taslak", "data": { "content": "{{flood}}" }, "position": { "x": 100, "y": 300 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'social-3',
        title: 'Sesli Haber Özeti',
        title_en: 'Audio News Summary',
        description: 'Güncel haberleri toplar ve size radyo gibi okur.',
        description_en: 'Gathers news and reads them like a radio.',
        category: 'News',
        author: 'BreviAI',
        downloads: '20k+',
        tags: ['news', 'podcast', 'tts', 'haber'],
        template_json: {
            "name": "Sesli Haber Özeti",
            "description": "Güncel haberleri toplar ve size radyo gibi okur.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Sabah 08:00", "data": { "cron": "0 8 * * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "WEB_SEARCH", "label": "Haber Ara", "data": { "url": "https://google.com/search?q=tech+news", "variableName": "results" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "🎙️ Editör", "data": { "prompt": "Haberleri bir radyo sunucusu gibi özetleyip metne dök: {{results}}", "variableName": "news", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SPEAK_TEXT", "label": "Oku", "data": { "text": "{{news}}" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },

    // 🛡️ GÜVENLİK VE SİSTEM
    {
        id: 'sec-1',
        title: 'Şarj Doldu Uyarısı',
        title_en: 'Battery Full Alert',
        description: 'Piliniz %95\'e ulaştığında sesli uyarı verir.',
        description_en: 'Alerts you when battery reaches 95%.',
        category: 'System',
        author: 'BreviAI',
        downloads: '100k+',
        tags: ['battery', 'alert', 'şarj', 'pil'],
        template_json: {
            "name": "Şarj Doldu Uyarısı",
            "description": "Piliniz %95'e ulaştığında sesli uyarı verir.",
            "nodes": [
                { "id": "1", "type": "BATTERY_CHECK", "label": "Pil Kontrol", "data": { "variableName": "bat" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "IF_ELSE", "label": "Doldu mu?", "data": { "left": "{{bat.level}}", "operator": ">=", "right": "95" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SPEAK_TEXT", "label": "Sesli Uyar", "data": { "text": "Şarjım doldu, lütfen beni prizden çıkar!" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "NOTIFICATION", "label": "🔋 Doldu", "data": { "message": "Pil seviyesi %95", "type": "push" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "true" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'sec-2',
        title: 'PANİK BUTONU',
        title_en: 'PANIC BUTTON',
        description: 'Acil durumda konumunuzu SMS atar ve fotoğraf çeker.',
        description_en: 'Sends SOS SMS with location and takes photo.',
        category: 'Security',
        author: 'BreviAI',
        downloads: '500k+',
        tags: ['sos', 'emergency', 'panic', 'güvenlik'],
        template_json: {
            "name": "ACİL DURUM",
            "description": "Acil durumda konumunuzu SMS atar ve fotoğraf çeker.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "SOS", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "LOCATION_GET", "label": "Konum", "data": { "variableName": "loc" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "CAMERA_TAKE", "label": "Foto Çek", "data": { "camera": "front", "variableName": "proof" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SMS_SEND", "label": "Yardım İste", "data": { "phoneNumber": "112", "message": "ACİL DURUM! Konumum: https://maps.google.com/?q={{loc.latitude}},{{loc.longitude}}" }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "AUDIO_RECORD", "label": "Ses Kaydet", "data": { "duration": 60, "variableName": "audio" }, "position": { "x": 100, "y": 500 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'sec-3',
        title: 'Dijital Detoks',
        title_en: 'Digital Detox',
        description: 'Uyku öncesi ekranı karartır ve DND açar.',
        description_en: 'Dims screen and enables DND before sleep.',
        category: 'Wellness',
        author: 'BreviAI',
        downloads: '15k+',
        tags: ['sleep', 'health', 'focus', 'uyku'],
        template_json: {
            "name": "Uyku Modu",
            "description": "Uyku öncesi ekranı karartır ve DND açar.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Saat 23:00", "data": { "cron": "0 23 * * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "DND_CONTROL", "label": "Rahatsız Etme", "data": { "enabled": true }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "BRIGHTNESS_CONTROL", "label": "Ekranı Kıs", "data": { "level": 0 }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "APP_LAUNCH", "label": "Meditasyon", "data": { "packageName": "com.calm.android" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'sec-4',
        title: 'Hırsız Alarmı',
        title_en: 'Anti-Theft Alarm',
        description: 'Telefon hareket ederse alarm çalar ve fotoğraf çeker.',
        description_en: 'Sounds alarm and takes photo if phone moves.',
        category: 'Security',
        author: 'BreviAI',
        downloads: '45k+',
        tags: ['security', 'theft', 'alarm', 'hırsız'],
        template_json: {
            "name": "Hareket Alarmı",
            "description": "Telefon hareket ederse alarm çalar ve fotoğraf çeker.",
            "nodes": [
                { "id": "1", "type": "GESTURE_TRIGGER", "label": "Hareket Algılandı", "data": { "gesture": "shake" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "FLASHLIGHT_CONTROL", "label": "Flaşör", "data": { "mode": "toggle" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "VOLUME_CONTROL", "label": "Sesi Aç", "data": { "type": "media", "level": 100 }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SPEAK_TEXT", "label": "HIRSIZ VAR", "data": { "text": "Telefondan uzak dur! Fotoğrafın çekiliyor!" }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "CAMERA_TAKE", "label": "Kanıt Al", "data": { "camera": "front", "variableName": "thief_face" }, "position": { "x": 100, "y": 500 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
            ]
        }
    },

    // 🎓 EĞİTİM
    {
        id: 'edu-1',
        title: 'Günün Kelimesi',
        title_en: 'Word of the Day',
        description: 'Her sabah yeni bir İngilizce kelime öğretir.',
        description_en: 'Teaches a new English word every morning.',
        category: 'Education',
        author: 'BreviAI',
        downloads: '30k+',
        tags: ['english', 'learn', 'education', 'ingilizce'],
        template_json: {
            "name": "Günün Kelimesi",
            "description": "Her sabah yeni bir İngilizce kelime öğretir.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Her Sabah", "data": { "cron": "0 9 * * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AGENT_AI", "label": "🇬🇧 Öğretmen", "data": { "prompt": "Bana B2 seviyesinde bir İngilizce kelime, Türkçe anlamı ve örnek cümle ver.", "variableName": "word", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "NOTIFICATION", "label": "Öğren", "data": { "title": "Günün Kelimesi", "message": "{{word}}", "type": "push" }, "position": { "x": 100, "y": 300 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'edu-2',
        title: 'Kitap Özeti',
        title_en: 'Book Summarizer',
        description: 'Girdiğiniz kitabın en önemli noktalarını özetler.',
        description_en: 'Summarizes key points of any book.',
        category: 'Education',
        author: 'BreviAI',
        downloads: '20k+',
        tags: ['book', 'summary', 'learn', 'kitap'],
        template_json: {
            "name": "Kitap Özeti",
            "description": "Girdiğiniz kitabın en önemli noktalarını özetler.",
            "nodes": [
                { "id": "1", "type": "TEXT_INPUT", "label": "Kitap Adı", "data": { "prompt": "Hangi kitap?", "variableName": "bookName" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AGENT_AI", "label": "📖 Kitap Kurdu", "data": { "prompt": "{{bookName}} kitabının kısa özetini ve en önemli 3 fikrini çıkar.", "variableName": "summary", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SHOW_TEXT", "label": "Özet", "data": { "text": "{{summary}}" }, "position": { "x": 100, "y": 300 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'edu-3',
        title: 'Telaffuz Koçu',
        title_en: 'Pronunciation Coach',
        description: 'İngilizce konuşmanızı dinler ve hatalarınızı düzeltir.',
        description_en: 'Listens to your speech and corrects pronunciation.',
        category: 'Education',
        author: 'BreviAI',
        downloads: '15k+',
        tags: ['english', 'speak', 'coach', 'telaffuz'],
        template_json: {
            "name": "Telaffuz Koçu",
            "description": "İngilizce konuşmanızı dinler ve hatalarınızı düzeltir.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Konuş", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AUDIO_RECORD", "label": "Kaydet", "data": { "duration": 15, "variableName": "audio" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SPEECH_TO_TEXT", "label": "Analiz Et", "data": { "language": "en-US", "variableName": "text" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "AGENT_AI", "label": "🗣️ Hata Bulucu", "data": { "prompt": "Bu cümleyi gramer ve telaffuz açısından düzelt: {{text}}", "variableName": "correction", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "SPEAK_TEXT", "label": "Doğrusunu Oku", "data": { "text": "{{correction}}" }, "position": { "x": 100, "y": 500 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'fun-1',
        title: 'Karar Çarkı',
        title_en: 'Decision Maker',
        description: 'Sizin yerinize eğlenceli ve mantıklı bir seçim yapar.',
        description_en: 'Makes a fun and logical decision for you.',
        category: 'Fun',
        author: 'BreviAI',
        downloads: '25k+',
        tags: ['decision', 'fun', 'ai', 'karar'],
        template_json: {
            "name": "Kararsızlık Giderici",
            "description": "Sizin yerinize eğlenceli ve mantıklı bir seçim yapar.",
            "nodes": [
                { "id": "1", "type": "TEXT_INPUT", "label": "Seçenekler", "data": { "prompt": "Seçenekler neler? (örn: Pizza, Hamburger)", "variableName": "options" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AGENT_AI", "label": "⚖️ Bilge Karar", "data": { "prompt": "Bu seçenekler arasından birini seç ve nedenini esprili bir dille açıkla: {{options}}", "variableName": "decision", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SHOW_TEXT", "label": "Karar", "data": { "text": "{{decision}}" }, "position": { "x": 100, "y": 300 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" }
            ]
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // YENİ FAYDALI OTOMASYONLAR (20 ADET)
    // ═══════════════════════════════════════════════════════════════

    // 📊 İŞ VE ÜRETKENLİK
    {
        id: 'new-work-1',
        title: 'Haftalık Rapor Hazırlayıcı',
        title_en: 'Weekly Report Generator',
        description: 'Haftanın notlarını toplayıp profesyonel bir rapor oluşturur.',
        description_en: 'Collects weekly notes and generates a professional report.',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '10k+',
        tags: ['report', 'weekly', 'work', 'rapor'],
        template_json: {
            "name": "Haftalık Rapor",
            "description": "Haftanın notlarını toplayıp profesyonel bir rapor oluşturur.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Rapor Oluştur", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "FILE_READ", "label": "Notları Oku", "data": { "filename": "weekly_notes.txt", "variableName": "notes" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "📊 Rapor Yazarı", "data": { "prompt": "Bu haftalık notlardan profesyonel bir iş raporu hazırla. Başlıklar, maddeler ve özet içersin: {{notes}}", "variableName": "report", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "EMAIL_SEND", "label": "Yöneticiye Gönder", "data": { "to": "", "subject": "Haftalık Rapor - {{timestamp}}", "body": "{{report}}" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-work-2',
        title: 'Fatura Hatırlatıcı',
        title_en: 'Bill Reminder',
        description: 'Ayın 1\'inde tüm faturaları hatırlatır.',
        description_en: 'Reminds all bills on the 1st of each month.',
        category: 'Finance',
        author: 'BreviAI',
        downloads: '25k+',
        tags: ['bill', 'reminder', 'fatura', 'ödeme'],
        template_json: {
            "name": "Fatura Hatırlatıcı",
            "description": "Ayın başında faturaları hatırlatır.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Ayın 1'i", "data": { "cron": "0 9 1 * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AGENT_AI", "label": "💰 Fatura Listesi", "data": { "prompt": "Aylık fatura hatırlatıcısı hazırla: Elektrik, Su, Doğalgaz, İnternet, Telefon, Kira. Her biri için ödeme tarihi ve tahmini tutarı içeren bir liste oluştur.", "variableName": "bills", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "NOTIFICATION", "label": "Hatırlat", "data": { "title": "💰 Fatura Zamanı!", "message": "{{bills}}", "type": "push" }, "position": { "x": 100, "y": 300 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-work-3',
        title: 'Müşteri Takip Asistanı',
        title_en: 'Customer Follow-up Assistant',
        description: 'Müşteri görüşmelerini takip eder ve hatırlatma yapar.',
        description_en: 'Tracks customer meetings and sends reminders.',
        category: 'Business',
        author: 'BreviAI',
        downloads: '15k+',
        tags: ['crm', 'customer', 'müşteri', 'takip'],
        template_json: {
            "name": "Müşteri Takip",
            "description": "Müşteri görüşmelerini takip eder.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Görüşme Kaydet", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "TEXT_INPUT", "label": "Müşteri Adı", "data": { "prompt": "Müşteri adı nedir?", "variableName": "customer" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "TEXT_INPUT", "label": "Görüşme Notu", "data": { "prompt": "Görüşme özeti nedir?", "variableName": "notes" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SHEETS_WRITE", "label": "Kaydet", "data": { "spreadsheetId": "CRM_SHEET", "range": "Customers!A:C", "values": "[\"{{timestamp}}\", \"{{customer}}\", \"{{notes}}\"]", "append": true }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "NOTIFICATION", "label": "Onay", "data": { "message": "{{customer}} kaydedildi!", "type": "toast" }, "position": { "x": 100, "y": 500 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-work-4',
        title: 'Günlük Stand-up Notu',
        title_en: 'Daily Standup Note',
        description: 'Her sabah dünkü işleri ve bugünkü planları sorar, ekiple paylaşır.',
        description_en: 'Asks yesterday\'s work and today\'s plans, shares with team.',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '12k+',
        tags: ['standup', 'agile', 'team', 'ekip'],
        template_json: {
            "name": "Daily Standup",
            "description": "Günlük stand-up notunu hazırlar.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Her Sabah 09:00", "data": { "cron": "0 9 * * 1-5" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "TEXT_INPUT", "label": "Dün Ne Yaptın?", "data": { "prompt": "Dün ne üzerinde çalıştın?", "variableName": "yesterday" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "TEXT_INPUT", "label": "Bugün Ne Yapacaksın?", "data": { "prompt": "Bugün ne yapacaksın?", "variableName": "today" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SLACK_SEND", "label": "Slack'e Gönder", "data": { "message": "📊 *Daily Standup*\n\n*Dün:* {{yesterday}}\n*Bugün:* {{today}}", "webhookUrl": "" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-work-5',
        title: 'Dosya Yedekleme',
        title_en: 'File Backup',
        description: 'Önemli dosyalarınızı Google Drive\'a yedekler.',
        description_en: 'Backs up important files to Google Drive.',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '20k+',
        tags: ['backup', 'drive', 'yedek', 'dosya'],
        template_json: {
            "name": "Dosya Yedekleme",
            "description": "Dosyaları Drive'a yedekler.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Her Pazar 22:00", "data": { "cron": "0 22 * * 0" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "FILE_PICK", "label": "Dosya Seç", "data": { "allowedTypes": ["*"], "variableName": "file" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "DRIVE_UPLOAD", "label": "Drive'a Yükle", "data": { "folderId": "BACKUP_FOLDER", "variableName": "uploaded" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "NOTIFICATION", "label": "Yedeklendi", "data": { "message": "✅ Dosya yedeklendi!", "type": "push" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },

    // 🏃 SAĞLIK VE YAŞAM
    {
        id: 'new-life-1',
        title: 'Su İçme Hatırlatıcı',
        title_en: 'Water Reminder',
        description: 'Her 2 saatte bir su içmeyi hatırlatır.',
        description_en: 'Reminds you to drink water every 2 hours.',
        category: 'Health',
        author: 'BreviAI',
        downloads: '50k+',
        tags: ['water', 'health', 'su', 'sağlık'],
        template_json: {
            "name": "Su İç",
            "description": "Her 2 saatte bir su içmeyi hatırlatır.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Her 2 Saat", "data": { "cron": "0 */2 9-21 * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "NOTIFICATION", "label": "Su Vakti", "data": { "title": "💧 Su Vakti!", "message": "Bir bardak su içmeyi unutma!", "type": "push" }, "position": { "x": 100, "y": 200 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-life-2',
        title: 'Egzersiz Hatırlatıcı',
        title_en: 'Exercise Reminder',
        description: 'Her gün öğle molasında kısa egzersiz önerir.',
        description_en: 'Suggests quick exercises during lunch break.',
        category: 'Health',
        author: 'BreviAI',
        downloads: '30k+',
        tags: ['exercise', 'health', 'egzersiz', 'spor'],
        template_json: {
            "name": "Egzersiz Vakti",
            "description": "Öğle molasında egzersiz önerir.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Her Gün 13:00", "data": { "cron": "0 13 * * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AGENT_AI", "label": "🏃 Egzersiz Koçu", "data": { "prompt": "Ofiste yapılabilecek 5 dakikalık basit bir egzersiz rutini öner. Adımları açıkla.", "variableName": "exercise", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "NOTIFICATION", "label": "Hareket Et", "data": { "title": "🏃 Egzersiz Vakti!", "message": "{{exercise}}", "type": "push" }, "position": { "x": 100, "y": 300 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-life-3',
        title: 'Uyku Takibi',
        title_en: 'Sleep Tracker',
        description: 'Uyumadan önce ve kalkınca kayıt alır, uyku kalitesini analiz eder.',
        description_en: 'Logs sleep time and analyzes sleep quality.',
        category: 'Health',
        author: 'BreviAI',
        downloads: '18k+',
        tags: ['sleep', 'health', 'uyku', 'sağlık'],
        template_json: {
            "name": "Uyku Takibi",
            "description": "Uyku kalitesini takip eder.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Uyuyorum", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "FILE_WRITE", "label": "Uyku Başlangıcı", "data": { "filename": "sleep_log.txt", "content": "Uyku başladı: {{timestamp}}", "append": true }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "DND_CONTROL", "label": "DND Aç", "data": { "enabled": true }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "BRIGHTNESS_CONTROL", "label": "Ekran Kapat", "data": { "level": 0 }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-life-4',
        title: 'Günlük Şükür Günlüğü',
        title_en: 'Daily Gratitude Journal',
        description: 'Her akşam minnettarlık notları alır ve kaydeder.',
        description_en: 'Takes gratitude notes every evening.',
        category: 'Wellness',
        author: 'BreviAI',
        downloads: '22k+',
        tags: ['gratitude', 'journal', 'şükür', 'günlük'],
        template_json: {
            "name": "Şükür Günlüğü",
            "description": "Günlük minnettarlık notları.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Her Akşam 21:00", "data": { "cron": "0 21 * * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "TEXT_INPUT", "label": "Bugün Neye Minnetarsin?", "data": { "prompt": "Bugün neye minnettar hissediyorsun? (3 şey yaz)", "variableName": "gratitude" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "FILE_WRITE", "label": "Kaydet", "data": { "filename": "gratitude_journal.txt", "content": "\n{{timestamp}}:\n{{gratitude}}\n---", "append": true }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "NOTIFICATION", "label": "💜 Teşekkürler", "data": { "message": "Günlük not kaydedildi. İyi geceler!", "type": "toast" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-life-5',
        title: 'Alışveriş Listesi Paylaş',
        title_en: 'Share Shopping List',
        description: 'Alışveriş listesini aileyle paylaşır.',
        description_en: 'Shares shopping list with family.',
        category: 'Lifestyle',
        author: 'BreviAI',
        downloads: '35k+',
        tags: ['shopping', 'family', 'alışveriş', 'liste'],
        template_json: {
            "name": "Alışveriş Paylaş",
            "description": "Listeyi aileyle paylaşır.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Liste Gönder", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "TEXT_INPUT", "label": "Liste", "data": { "prompt": "Alışveriş listesini yaz (her satıra bir ürün):", "variableName": "items" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "WHATSAPP_SEND", "label": "Aileye Gönder", "data": { "phoneNumber": "FAMILY_GROUP", "message": "🛒 Alışveriş Listesi:\n{{items}}" }, "position": { "x": 100, "y": 300 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" }
            ]
        }
    },

    // 📱 İLETİŞİM VE SOSYAL
    {
        id: 'new-comm-1',
        title: 'Doğum Günü Hatırlatıcı',
        title_en: 'Birthday Reminder',
        description: 'Yaklaşan doğum günlerini hatırlatır ve mesaj önerir.',
        description_en: 'Reminds upcoming birthdays and suggests messages.',
        category: 'Social',
        author: 'BreviAI',
        downloads: '40k+',
        tags: ['birthday', 'reminder', 'doğumgünü', 'kutlama'],
        template_json: {
            "name": "Doğum Günü",
            "description": "Doğum günlerini hatırlatır.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Her Sabah 08:00", "data": { "cron": "0 8 * * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "CALENDAR_READ", "label": "Takvimi Kontrol", "data": { "type": "today", "variableName": "events" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "🎂 Doğum Günü Bulucu", "data": { "prompt": "Bu etkinliklerden doğum günü olanları bul ve kişiselleştirilmiş bir kutlama mesajı öner: {{events}}", "variableName": "birthday", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "NOTIFICATION", "label": "Hatırlat", "data": { "title": "🎂 Doğum Günü!", "message": "{{birthday}}", "type": "push" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-comm-2',
        title: 'Özür Mesajı Yazıcı',
        title_en: 'Apology Message Writer',
        description: 'Duruma uygun özür mesajı hazırlar.',
        description_en: 'Prepares appropriate apology message.',
        category: 'Communication',
        author: 'BreviAI',
        downloads: '15k+',
        tags: ['apology', 'message', 'özür', 'mesaj'],
        template_json: {
            "name": "Özür Mesajı",
            "description": "Özür mesajı hazırlar.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Özür Yaz", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "TEXT_INPUT", "label": "Ne Oldu?", "data": { "prompt": "Özür dilemen gereken durum nedir?", "variableName": "situation" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "💌 Mesaj Yazarı", "data": { "prompt": "Bu durum için içten ve samimi bir özür mesajı yaz. Çok uzun olmasın ama etkili olsun: {{situation}}", "variableName": "apology", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SHOW_TEXT", "label": "Mesaj", "data": { "content": "{{apology}}" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-comm-3',
        title: 'Günlük Motivasyon',
        title_en: 'Daily Motivation',
        description: 'Her sabah motivasyon sözü gönderir.',
        description_en: 'Sends motivational quotes every morning.',
        category: 'Wellness',
        author: 'BreviAI',
        downloads: '45k+',
        tags: ['motivation', 'quote', 'motivasyon', 'söz'],
        template_json: {
            "name": "Günlük Motivasyon",
            "description": "Her sabah motivasyon sözü.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Her Sabah 07:30", "data": { "cron": "30 7 * * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "AGENT_AI", "label": "✨ Motivatör", "data": { "prompt": "Güne başlarken ilham verecek kısa ve güçlü bir motivasyon sözü yaz. Türkçe olsun ve 2-3 cümleyi geçmesin.", "variableName": "quote", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "NOTIFICATION", "label": "İlham Ver", "data": { "title": "✨ Günün İlhamı", "message": "{{quote}}", "type": "push" }, "position": { "x": 100, "y": 300 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-comm-4',
        title: 'LinkedIn Paylaşım Önerici',
        title_en: 'LinkedIn Post Suggester',
        description: 'Sektörünüze uygun LinkedIn paylaşımı önerir.',
        description_en: 'Suggests LinkedIn posts for your industry.',
        category: 'Social',
        author: 'BreviAI',
        downloads: '20k+',
        tags: ['linkedin', 'social', 'kariyer', 'iş'],
        template_json: {
            "name": "LinkedIn Post",
            "description": "LinkedIn paylaşımı önerir.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Post Öner", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "TEXT_INPUT", "label": "Sektör", "data": { "prompt": "Hangi sektördesiniz? (örn: Teknoloji, Finans, Sağlık)", "variableName": "industry" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "📝 İçerik Yazarı", "data": { "prompt": "{{industry}} sektörü için profesyonel ve dikkat çekici bir LinkedIn paylaşımı yaz. Hashtag'ler ekle. Maksimum 200 kelime.", "variableName": "post", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SHOW_TEXT", "label": "Paylaşım", "data": { "content": "{{post}}" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-comm-5',
        title: 'Acil Durum Bildirimi',
        title_en: 'Emergency Contact',
        description: 'Tek tuşla ailenize acil durum bildirimi gönderir.',
        description_en: 'Sends emergency notification to family with one tap.',
        category: 'Security',
        author: 'BreviAI',
        downloads: '60k+',
        tags: ['emergency', 'family', 'acil', 'güvenlik'],
        template_json: {
            "name": "Acil Bildirim",
            "description": "Ailenize acil durum bildirimi.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Acil Durum", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "LOCATION_GET", "label": "Konum Al", "data": { "variableName": "loc", "accuracy": "high" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SMS_SEND", "label": "Anneye Gönder", "data": { "phoneNumber": "", "message": "⚠️ ACİL! Yardıma ihtiyacım olabilir. Konumum: https://maps.google.com/?q={{loc.latitude}},{{loc.longitude}}" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SMS_SEND", "label": "Babaya Gönder", "data": { "phoneNumber": "", "message": "⚠️ ACİL! Yardıma ihtiyacım olabilir. Konumum: https://maps.google.com/?q={{loc.latitude}},{{loc.longitude}}" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },

    // 🚗 GÜNLÜK YAŞAM
    {
        id: 'new-daily-1',
        title: 'Trafik Kontrolü',
        title_en: 'Traffic Check',
        description: 'İşe gitmeden trafik durumunu kontrol eder.',
        description_en: 'Checks traffic before going to work.',
        category: 'Travel',
        author: 'BreviAI',
        downloads: '25k+',
        tags: ['traffic', 'commute', 'trafik', 'yol'],
        template_json: {
            "name": "Trafik Kontrol",
            "description": "İşe gitmeden trafik durumunu kontrol eder.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Hafta İçi 07:30", "data": { "cron": "30 7 * * 1-5" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "WEB_SEARCH", "label": "Trafik Ara", "data": { "query": "İstanbul trafik durumu", "variableName": "traffic" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "🚗 Trafik Analiz", "data": { "prompt": "Trafik durumunu özetle ve en iyi çıkış saatini öner: {{traffic}}", "variableName": "advice", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "NOTIFICATION", "label": "Bildir", "data": { "title": "🚗 Trafik Durumu", "message": "{{advice}}", "type": "push" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-daily-2',
        title: 'Yemek Önerici',
        title_en: 'Meal Suggester',
        description: 'Buzdolabındaki malzemelerle yemek tarifi önerir.',
        description_en: 'Suggests recipes based on available ingredients.',
        category: 'Lifestyle',
        author: 'BreviAI',
        downloads: '35k+',
        tags: ['food', 'recipe', 'yemek', 'tarif'],
        template_json: {
            "name": "Yemek Öner",
            "description": "Malzemelerle tarif önerir.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Ne Pişirsem?", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "TEXT_INPUT", "label": "Malzemeler", "data": { "prompt": "Buzdolabında hangi malzemeler var?", "variableName": "ingredients" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "👨‍🍳 Şef", "data": { "prompt": "Bu malzemelerle yapılabilecek 3 farklı yemek tarifi öner. Her biri için kısa yapım tarifi yaz: {{ingredients}}", "variableName": "recipes", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SHOW_TEXT", "label": "Tarifler", "data": { "content": "{{recipes}}" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-daily-3',
        title: 'Çamaşır Hatırlatıcı',
        title_en: 'Laundry Reminder',
        description: 'Çamaşır makinesini açtığınızda bittiğinde hatırlatır.',
        description_en: 'Reminds when laundry is done.',
        category: 'Lifestyle',
        author: 'BreviAI',
        downloads: '20k+',
        tags: ['laundry', 'home', 'çamaşır', 'ev'],
        template_json: {
            "name": "Çamaşır Bitti",
            "description": "Çamaşır bitince hatırlatır.",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "Makine Başladı", "data": {}, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "DELAY", "label": "1.5 Saat Bekle", "data": { "duration": 90, "unit": "min" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "NOTIFICATION", "label": "Çamaşır Bitti", "data": { "title": "🧺 Çamaşır Bitti!", "message": "Çamaşırlarını asmayı unutma!", "type": "push" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "SPEAK_TEXT", "label": "Sesli Uyar", "data": { "text": "Çamaşırlar hazır! Asmayı unutma." }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-daily-4',
        title: 'Hava Durumu Giysi Önerisi',
        title_en: 'Weather Outfit Suggestion',
        description: 'Hava durumuna göre ne giyeceğinizi önerir.',
        description_en: 'Suggests outfit based on weather.',
        category: 'Lifestyle',
        author: 'BreviAI',
        downloads: '28k+',
        tags: ['weather', 'outfit', 'hava', 'giysi'],
        template_json: {
            "name": "Ne Giyeyim?",
            "description": "Havaya göre giysi önerir.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Her Sabah 07:00", "data": { "cron": "0 7 * * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "WEATHER_GET", "label": "Hava Durumu", "data": { "variableName": "weather" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "AGENT_AI", "label": "👔 Stil Danışmanı", "data": { "prompt": "Bugünkü hava: {{weather}}. Bu havaya uygun kıyafet önerisi yap. Kısa ve pratik ol.", "variableName": "outfit", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "NOTIFICATION", "label": "Öneri", "data": { "title": "👔 Bugün Ne Giy?", "message": "{{outfit}}", "type": "push" }, "position": { "x": 100, "y": 400 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'new-daily-5',
        title: 'Günlük Özet Raporu',
        title_en: 'Daily Summary Report',
        description: 'Gün sonunda harcama, adım ve etkinlik özetini verir.',
        description_en: 'Gives daily summary of expenses, steps and activities.',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '30k+',
        tags: ['summary', 'daily', 'özet', 'günlük'],
        template_json: {
            "name": "Günlük Özet",
            "description": "Gün sonu özet raporu.",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "Her Akşam 20:00", "data": { "cron": "0 20 * * *" }, "position": { "x": 100, "y": 100 } },
                { "id": "2", "type": "PEDOMETER", "label": "Adım Sayısı", "data": { "variableName": "steps" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "CALENDAR_READ", "label": "Bugünkü Etkinlikler", "data": { "type": "today", "variableName": "events" }, "position": { "x": 100, "y": 300 } },
                { "id": "4", "type": "AGENT_AI", "label": "📊 Günlük Analist", "data": { "prompt": "Bugünün özeti: Adımlar: {{steps}}, Etkinlikler: {{events}}. Bu verileri güzel bir günlük özet formatında sun.", "variableName": "summary", "model": "gemini-pro", "apiKey": "", "provider": "gemini" }, "position": { "x": 100, "y": 400 } },
                { "id": "5", "type": "NOTIFICATION", "label": "Özet", "data": { "title": "📊 Günün Özeti", "message": "{{summary}}", "type": "push" }, "position": { "x": 100, "y": 500 } }
            ],
            "edges": [
                { "id": "e1", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" }
            ]
        }
    },
    // ═══════════════════════════════════════════════════════════════
    // 🦞 OPENCLAW-STYLE MCP ASSISTANT TEMPLATES
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'mcp-assistant-1',
        title: '🦞 MCP Kişisel Asistan (Sesli)',
        title_en: 'MCP Personal Assistant (Voice)',
        description: 'OpenClaw tarzı kişisel AI asistan. Sesli yanıt verir. Notion, Slack, Jira, Trello, Asana, Google, Microsoft ve tüm MCP araçlarını kullanabilir.',
        description_en: 'OpenClaw-style personal AI assistant with voice responses and full MCP tool access.',
        category: 'AI',
        author: 'BreviAI',
        downloads: '25k+',
        tags: ['mcp', 'assistant', 'voice', 'openclaw', 'notion', 'slack', 'jira', 'trello', 'asana', 'sesli'],
        template_json: {
            "name": "🦞 MCP Kişisel Asistan",
            "description": "OpenClaw tarzı kişisel AI asistan. Sesli yanıt verir. Tüm MCP araçlarına erişebilir.",
            "nodes": [
                { "id": "1", "type": "CHAT_INPUT_TRIGGER", "label": "💬 Ne yapmamı istersin?", "data": { "prompt": "Ne yapmamı istersin? (Örn: 'Yarınki toplantılarımı listele', 'Jira'da bug aç', 'Slack'e bildir')", "variableName": "userCommand" }, "position": { "x": 100, "y": 50 } },
                { "id": "2", "type": "AGENT_AI", "label": "🤖 MCP Asistan", "data": { "prompt": "Sen BreviAI platformundaki tam otonom kişisel asistansın — OpenClaw tarzında çalışırsın.\\n\\n## KİMLİĞİN\\nAdın: Brevi. Kullanıcının kişisel iş asistanısın. Sorulara cevap vermekle kalmaz, İŞ YAPAN bir asistansın.\\n\\n## ARAÇLARIN (MCP)\\nŞu araçları doğrudan kullanabilirsin:\\n- **Google:** Gmail oku/gönder, Calendar etkinlik listele/oluştur, Sheets oku/yaz, Drive listele, Meet oluştur\\n- **Microsoft:** Outlook oku/gönder, Calendar listele/oluştur, Excel oku/yaz, OneDrive listele/ara, Teams toplantı\\n- **İş Yönetimi:** Notion ara/sayfa oluştur, Slack mesaj gönder/kanallar, Trello kart listele/oluştur, Jira issue ara/oluştur, Asana görev listele/oluştur\\n- **Diğer:** Airtable kayıt oku, Zapier webhook tetikle, GitHub repo listele, Web arama\\n\\n## ÇALIŞMA PRENSİPLERİN\\n1. Kullanıcının isteğini analiz et\\n2. Hangi MCP aracını kullanman gerektiğine karar ver\\n3. Aracı çalıştır ve sonucu al\\n4. Sonucu kullanıcıya KISA ve NET şekilde özetle\\n5. Emin olmadığın bilgiyi 'ask_user' ile sor, UYDURMA\\n\\n## SESLİ YANIT\\nYanıtların sesli okunacak. Bu yüzden:\\n- Kısa ve doğal konuş\\n- Markdown/link kullanma\\n- Liste yerine akıcı cümleler kur\\n- 'Tamam, şunu yaptım...' gibi doğal başla\\n\\nKullanıcı isteği: {{userCommand}}", "provider": "gemini", "model": "gemini-2.0-flash-exp", "variableName": "assistantResponse" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SPEAK_TEXT", "label": "🔊 Sesli Yanıt", "data": { "text": "{{assistantResponse}}", "language": "tr-TR" }, "position": { "x": 100, "y": 400 } },
                { "id": "4", "type": "SHOW_TEXT", "label": "📝 Yazılı Yanıt", "data": { "title": "🦞 Brevi Asistan", "content": "{{assistantResponse}}" }, "position": { "x": 100, "y": 550 } }
            ],
            "edges": [
                { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'mcp-assistant-2',
        title: '🎙️ Sesli Komuta Merkezi',
        title_en: 'Voice Command Center',
        description: 'Sesle komut ver, AI iş yapsın! Ses kaydını yazıya çevirir, AI analiz eder, MCP araçlarıyla işi yapar ve sonucu sesli bildirir.',
        description_en: 'Voice-driven command center: record voice → transcribe → AI processes via MCP tools → speaks result.',
        category: 'AI',
        author: 'BreviAI',
        downloads: '18k+',
        tags: ['voice', 'mcp', 'speech', 'command', 'ses', 'komut'],
        template_json: {
            "name": "🎙️ Sesli Komuta Merkezi",
            "description": "Sesle komut ver, AI iş yapsın! Ses → Yazı → AI → MCP → Sesli Sonuç",
            "nodes": [
                { "id": "1", "type": "MANUAL_TRIGGER", "label": "🎯 Başlat", "data": {}, "position": { "x": 100, "y": 50 } },
                { "id": "2", "type": "AUDIO_RECORD", "label": "🎤 Sesini Kaydet", "data": { "duration": 15, "variableName": "audioUri" }, "position": { "x": 100, "y": 150 } },
                { "id": "3", "type": "SPEECH_TO_TEXT", "label": "📝 Yazıya Çevir", "data": { "language": "tr-TR", "variableName": "voiceCommand" }, "position": { "x": 100, "y": 280 } },
                { "id": "4", "type": "AGENT_AI", "label": "🤖 MCP Komutan", "data": { "prompt": "Sen sesli komutla çalışan bir iş asistanısın. Kullanıcı sesli komut verdi ve bu yazıya çevrildi:\\n\\nKOMUT: {{voiceCommand}}\\n\\n## ARAÇLARIN\\nGoogle (Gmail, Calendar, Sheets, Drive, Meet), Microsoft (Outlook, Calendar, Excel, OneDrive, Teams), Notion, Slack, Trello, Jira, Asana, Airtable, Zapier, GitHub entegrasyonlarını kullanabilirsin.\\n\\n## TALİMATLAR\\n1. Komutu analiz et ve en uygun MCP aracını seç\\n2. Aracı çalıştır\\n3. Sonucu 1-2 cümleyle özetle (sesli okunacak)\\n4. Emin değilsen ask_user ile sor\\n\\nYanıtını KISA tut — sesli okunacak.", "provider": "gemini", "model": "gemini-2.0-flash-exp", "variableName": "commandResult" }, "position": { "x": 100, "y": 420 } },
                { "id": "5", "type": "SPEAK_TEXT", "label": "🔊 Sonucu Söyle", "data": { "text": "{{commandResult}}", "language": "tr-TR" }, "position": { "x": 100, "y": 580 } },
                { "id": "6", "type": "NOTIFICATION", "label": "📱 Bildirim", "data": { "title": "🎙️ Sesli Komut Sonucu", "message": "{{commandResult}}", "type": "push" }, "position": { "x": 100, "y": 700 } }
            ],
            "edges": [
                { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" },
                { "id": "e4-5", "sourceNodeId": "4", "targetNodeId": "5", "sourcePort": "default" },
                { "id": "e5-6", "sourceNodeId": "5", "targetNodeId": "6", "sourcePort": "default" }
            ]
        }
    },
    {
        id: 'mcp-assistant-3',
        title: '🔄 Çok Kanallı İş Akışı',
        title_en: 'Multi-Channel Business Flow',
        description: 'Sabah 09:00\'da çalışır. Takvimi, mailleri ve Jira görevlerini kontrol eder. Özeti Slack\'e yazar ve sesli bildirir.',
        description_en: 'Runs at 09:00. Checks calendar, emails, Jira tasks. Posts summary to Slack and speaks it.',
        category: 'Business',
        author: 'BreviAI',
        downloads: '20k+',
        tags: ['multi-channel', 'slack', 'jira', 'calendar', 'voice', 'çok-kanal', 'sabah'],
        template_json: {
            "name": "🔄 Çok Kanallı Sabah Brifingi",
            "description": "Sabah 09:00'da takvim + mail + Jira kontrol → Slack özet + sesli bildirim",
            "nodes": [
                { "id": "1", "type": "TIME_TRIGGER", "label": "⏰ Her Sabah 09:00", "data": { "hour": 9, "minute": 0, "repeat": true, "days": [1, 2, 3, 4, 5] }, "position": { "x": 100, "y": 50 } },
                { "id": "2", "type": "AGENT_AI", "label": "🤖 Sabah Brifingi", "data": { "prompt": "Sen iş günü sabah brifingi hazırlayan bir asistansın. Şu adımları yap:\\n\\n1. **TAKVİM KONTROL:** Google Calendar veya Outlook Calendar'dan bugünkü etkinlikleri listele\\n2. **MAİL KONTROL:** Gmail veya Outlook'tan okunmamış önemli mailleri kontrol et\\n3. **GÖREV KONTROL:** Jira'dan bana atanmış açık issue'ları getir\\n4. **ÖZET HAZIRLA:** Hepsini güzel bir sabah brifingi olarak özetle\\n5. **SLACK'E GÖNDER:** Özeti Slack'teki #daily-standup kanalına gönder\\n\\nYanıtını sesli okunacak şekilde doğal ve kısa tut:\\n'Günaydın! Bugün 3 toplantın var, 2 okunmamış önemli mailin ve 5 açık Jira görevin var...' gibi.", "provider": "gemini", "model": "gemini-2.0-flash-exp", "variableName": "morningBrief" }, "position": { "x": 100, "y": 200 } },
                { "id": "3", "type": "SPEAK_TEXT", "label": "🔊 Brifingi Sesli Oku", "data": { "text": "{{morningBrief}}", "language": "tr-TR" }, "position": { "x": 100, "y": 400 } },
                { "id": "4", "type": "NOTIFICATION", "label": "📱 Bildirim", "data": { "title": "☀️ Sabah Brifingi", "message": "{{morningBrief}}", "type": "push" }, "position": { "x": 100, "y": 550 } }
            ],
            "edges": [
                { "id": "e1-2", "sourceNodeId": "1", "targetNodeId": "2", "sourcePort": "default" },
                { "id": "e2-3", "sourceNodeId": "2", "targetNodeId": "3", "sourcePort": "default" },
                { "id": "e3-4", "sourceNodeId": "3", "targetNodeId": "4", "sourcePort": "default" }
            ]
        }
    }
];
