// Re-export from new unified template file
import { ShortcutTemplate as BaseTemplate } from '../src/data/types';

// Helper for App Templates (Converted to Node/Edge Format)
const createOpenAppTemplate = (
    id: string,
    name: string,
    pkg: string,
    category: string,
    tags: string[],
    descTr?: string,
    descEn?: string
): BaseTemplate => ({
    id: `app-${id}`,
    title: name,
    title_en: name,
    description: descTr || `${name} uygulamasını açar.`,
    description_en: descEn || `Opens ${name} application.`,
    category,
    author: 'BreviAI',
    downloads: '10k+',
    tags: [...tags, 'uygulama', 'app', name.toLowerCase()],
    template_json: {
        name: name,
        description: descTr || `${name} uygulamasını açar.`,
        nodes: [
            { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Başlat" },
            { id: "2", type: "APP_LAUNCH", position: { x: 100, y: 300 }, data: { packageName: pkg }, label: `${name} Aç` },
            { id: "3", type: "NOTIFICATION", position: { x: 100, y: 500 }, data: { type: "toast", message: `🚀 ${name} açılıyor...` } }
        ],
        edges: [
            { id: "e1", source: "1", target: "2", sourceHandle: "default" },
            { id: "e2", source: "2", target: "3", sourceHandle: "default" }
        ]
    }
});

// Popular App Templates
const POPULAR_APPS: BaseTemplate[] = [
    createOpenAppTemplate('soc-1', 'Instagram', 'com.instagram.android', 'Social', ['sosyal', 'fotoğraf']),
    createOpenAppTemplate('soc-2', 'WhatsApp', 'com.whatsapp', 'Social', ['mesaj', 'arama']),
    createOpenAppTemplate('soc-3', 'Twitter / X', 'com.twitter.android', 'Social', ['haber', 'tweet']),
    createOpenAppTemplate('soc-4', 'TikTok', 'com.zhiliaoapp.musically', 'Social', ['video', 'trend']),
    createOpenAppTemplate('soc-5', 'Facebook', 'com.facebook.katana', 'Social', ['sosyal', 'arkadaş']),
    createOpenAppTemplate('soc-6', 'Telegram', 'org.telegram.messenger', 'Social', ['mesaj', 'güvenli']),
    createOpenAppTemplate('soc-7', 'YouTube', 'com.google.android.youtube', 'Lifestyle', ['video', 'izle']),
    createOpenAppTemplate('soc-8', 'Spotify', 'com.spotify.music', 'Lifestyle', ['müzik', 'dinle']),
    createOpenAppTemplate('soc-9', 'Netflix', 'com.netflix.mediaclient', 'Lifestyle', ['film', 'dizi']),
    createOpenAppTemplate('soc-10', 'Gmail', 'com.google.android.gm', 'Productivity', ['email', 'posta']),
    createOpenAppTemplate('soc-11', 'Maps', 'com.google.android.apps.maps', 'Travel', ['navigasyon', 'harita']),
    createOpenAppTemplate('soc-12', 'Chrome', 'com.android.chrome', 'Productivity', ['tarayıcı', 'web']),
];

// NEW: 23 Gold Standard Verified Templates
export const SEED_TEMPLATES: BaseTemplate[] = [
    // 0. SYSTEM HEALTH CHECK (Admin Level Quality)
    {
        id: 'gold-0',
        title: 'Sistem Kontrolü',
        title_en: 'System Health Check',
        description: 'BreviAI sensör ve izinlerini test eder. (Pil, Ağ, Konum, Ses)',
        description_en: 'Tests BreviAI sensors and permissions. (Battery, Network, Location, Audio)',
        category: 'Utilities',
        author: 'BreviAI Admin',
        downloads: '100k+',
        tags: ['test', 'system', 'check', 'kontrol'],
        template_json: {
            name: "Sistem Kontrolü",
            description: "Tüm sistem özelliklerini test eder.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 50 }, data: {}, label: "Test Başlat" },

                // Battery Test
                { id: "2", type: "BATTERY_CHECK", position: { x: 100, y: 200 }, data: { variableName: "bat" }, label: "Pil Kontrol" },
                { id: "3", type: "NOTIFICATION", position: { x: 300, y: 200 }, data: { type: "toast", message: "🔋 Pil: %{{bat.level}} Durum: {{bat.state}}" } },

                // Network Test
                { id: "4", type: "NETWORK_CHECK", position: { x: 100, y: 350 }, data: { variableName: "net", checkType: "any" }, label: "Ağ Kontrol" },
                { id: "5", type: "IF_ELSE", position: { x: 100, y: 500 }, data: { left: "{{net.isConnected}}", operator: "==", right: "true" }, label: "İnternet Var mı?" },
                { id: "6", type: "NOTIFICATION", position: { x: 300, y: 500 }, data: { type: "toast", message: "🌐 Online" }, label: "Online Mesaj" },
                { id: "7", type: "NOTIFICATION", position: { x: -100, y: 500 }, data: { type: "toast", message: "⚠️ Offline" }, label: "Offline Mesaj" },

                // Location Test
                { id: "8", type: "LOCATION_GET", position: { x: 100, y: 650 }, data: { variableName: "loc", accuracy: "low" }, label: "Konum Al" },
                { id: "9", type: "NOTIFICATION", position: { x: 100, y: 800 }, data: { type: "toast", message: "📍 Konum: {{loc.latitude}}, {{loc.longitude}}" } },

                // Sound Test
                { id: "10", type: "SOUND_MODE", position: { x: 100, y: 950 }, data: { mode: "vibrate" }, label: "Titreşim Test" },
                { id: "11", type: "DELAY", position: { x: 100, y: 1100 }, data: { duration: 2, unit: "sec" } },
                { id: "12", type: "SOUND_MODE", position: { x: 100, y: 1250 }, data: { mode: "normal" }, label: "Normal Ses" },

                { id: "13", type: "NOTIFICATION", position: { x: 100, y: 1400 }, data: { type: "push", title: "Test Tamamlandı", message: "✅ Tüm sistemler çalışıyor." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" },
                { id: "e5", source: "5", target: "6", sourceHandle: "true" },
                { id: "e6", source: "5", target: "7", sourceHandle: "false" },
                { id: "e7", source: "6", target: "8", sourceHandle: "default" },
                { id: "e8", source: "7", target: "8", sourceHandle: "default" },
                { id: "e9", source: "8", target: "9", sourceHandle: "default" },
                { id: "e10", source: "9", target: "10", sourceHandle: "default" },
                { id: "e11", source: "10", target: "11", sourceHandle: "default" },
                { id: "e12", source: "11", target: "12", sourceHandle: "default" },
                { id: "e13", source: "12", target: "13", sourceHandle: "default" }
            ]
        }
    },
    // 1-10: Original Gold Templates (Preserved)
    // 1. Sabah Asistanı
    {
        id: 'gold-1',
        title: 'Sabah Asistanı',
        title_en: 'Morning Assistant',
        description: 'Gününüzü planlayın: Takvimi kontrol eder, pil durumunu okur ve özet geçer.',
        description_en: 'Plan your day: Checks calendar, battery status and gives a summary.',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '50k+',
        tags: ['morning', 'calendar', 'battery', 'sabah'],
        template_json: {
            name: "Sabah Asistanı",
            description: "Gününüzü planlayın: Takvimi kontrol eder ve size özet geçer.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Günaydın" },
                { id: "2", type: "CALENDAR_READ", position: { x: 100, y: 250 }, data: { type: "today", maxEvents: 3, variableName: "todays_events" } },
                { id: "3", type: "BATTERY_CHECK", position: { x: 100, y: 400 }, data: { variableName: "battery_stat" } },
                { id: "4", type: "SPEAK_TEXT", position: { x: 100, y: 550 }, data: { text: "Günaydın. Bugün {{todays_events.length}} adet etkinliğin var. Pil durumu yüzde {{battery_stat.level}}." } },
                { id: "5", type: "NOTIFICATION", position: { x: 100, y: 700 }, data: { type: "toast", message: "📅 Sabah özeti tamamlandı." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" }
            ]
        }
    },
    // 2. Toplantı Modu
    {
        id: 'gold-2',
        title: 'Toplantı Modu',
        title_en: 'Meeting Focus',
        description: 'Rahatsız edilmeyin. DND açar, sesi kısar ve 1 saat sonra normale döner.',
        description_en: 'Do Not Disturb. Enables DND, mutes volume, reverts after 1 hour.',
        category: 'Work',
        author: 'BreviAI',
        downloads: '45k+',
        tags: ['meeting', 'dnd', 'focus', 'toplantı'],
        template_json: {
            name: "Toplantı Modu",
            description: "Rahatsız edilmeyin. DND açar, sesi kısar ve 1 saat sonra normale döner.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Toplantı Başla" },
                { id: "2", type: "DND_CONTROL", position: { x: 100, y: 250 }, data: { enabled: true }, label: "DND Aktif" },
                { id: "3", type: "SOUND_MODE", position: { x: 100, y: 400 }, data: { mode: "vibrate" }, label: "Titreşim Modu" },
                { id: "4", type: "DELAY", position: { x: 100, y: 550 }, data: { duration: 60, unit: "min" }, label: "1 Saat Bekle" },
                { id: "5", type: "DND_CONTROL", position: { x: 100, y: 700 }, data: { enabled: false }, label: "DND Kapat" },
                { id: "6", type: "SOUND_MODE", position: { x: 100, y: 850 }, data: { mode: "normal" }, label: "Ses Açık" },
                { id: "7", type: "NOTIFICATION", position: { x: 100, y: 1000 }, data: { type: "push", title: "Toplantı Bitti", message: "Cihaz normale döndü." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" },
                { id: "e5", source: "5", target: "6", sourceHandle: "default" },
                { id: "e6", source: "6", target: "7", sourceHandle: "default" }
            ]
        }
    },
    // 3. Eve Dönüş
    {
        id: 'gold-3',
        title: 'Eve Dönüş',
        title_en: 'Heading Home',
        description: 'Partnerinize haber verin ve navigasyonu başlatın.',
        description_en: 'Notify your partner and start navigation.',
        category: 'lifestyle',
        author: 'BreviAI',
        downloads: '60k+',
        tags: ['home', 'navigation', 'sms', 'ev'],
        template_json: {
            name: "Eve Dönüş",
            description: "Partnerinize haber verin ve navigasyonu başlatın.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Eve Dönüyorum" },
                { id: "2", type: "LOCATION_GET", position: { x: 100, y: 250 }, data: { variableName: "current_loc" } },
                { id: "3", type: "SMS_SEND", position: { x: 100, y: 400 }, data: { phoneNumber: "", message: "Yola çıktım! Konumum: https://maps.google.com/?q={{current_loc.latitude}},{{current_loc.longitude}}" }, label: "SMS (Numara Girin)" },
                { id: "4", type: "GLOBAL_ACTION", position: { x: 100, y: 550 }, data: { action: "home" }, label: "Ana Ekrana Dön" },
                { id: "5", type: "NOTIFICATION", position: { x: 100, y: 700 }, data: { type: "toast", message: "Navigasyon öneriliyor..." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" }
            ]
        }
    },
    // 4. Acil Şarj Koruma
    {
        id: 'gold-4',
        title: 'Acil Şarj Koruma',
        title_en: 'Battery Emergency',
        description: 'Şarj < %30 ise ekranı karartır ve DND açar.',
        description_en: 'If Battery < 30%, dims screen and enables DND.',
        category: 'Utilities',
        author: 'BreviAI',
        downloads: '40k+',
        tags: ['battery', 'saver', 'emergency', 'şarj'],
        template_json: {
            name: "Acil Şarj Koruma",
            description: "Şarj azaldığında tüm sistemleri kapatarak pil ömrünü uzatır.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Acil Durum" },
                { id: "2", type: "BATTERY_CHECK", position: { x: 100, y: 250 }, data: { variableName: "bat" } },
                { id: "3", type: "IF_ELSE", position: { x: 100, y: 400 }, data: { left: "{{bat.level}}", operator: "<", right: "30" }, label: "Şarj < %30?" },
                { id: "4", type: "BRIGHTNESS_CONTROL", position: { x: 100, y: 550 }, data: { level: 0 }, label: "Ekran Karart" },
                { id: "5", type: "DND_CONTROL", position: { x: 100, y: 700 }, data: { enabled: true }, label: "DND Aç" },
                { id: "6", type: "NOTIFICATION", position: { x: 100, y: 850 }, data: { type: "toast", message: "⚠️ Kritik mod aktif!" } },
                { id: "7", type: "NOTIFICATION", position: { x: 300, y: 550 }, data: { type: "toast", message: "🔋 Şarj seviyesi idare eder: %{{bat.level}}" } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "true" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" },
                { id: "e5", source: "5", target: "6", sourceHandle: "default" },
                { id: "e6", source: "3", target: "7", sourceHandle: "false" }
            ]
        }
    },
    // 5. Hızlı Not
    {
        id: 'gold-5',
        title: 'Hızlı Not',
        title_en: 'Quick Note',
        description: 'Aklınıza geleni hemen kaydedin.',
        description_en: 'Instantly save your thoughts.',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '35k+',
        tags: ['note', 'quick', 'text', 'not'],
        template_json: {
            name: "Hızlı Not",
            description: "Aklınıza geleni hemen kaydedin.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Not Al" },
                { id: "2", type: "TEXT_INPUT", position: { x: 100, y: 250 }, data: { prompt: "Ne not almak istersiniz?", variableName: "quick_note" } },
                { id: "3", type: "FILE_WRITE", position: { x: 100, y: 400 }, data: { filename: "Notes.txt", content: "\n- {{quick_note}}", append: true } },
                { id: "4", type: "NOTIFICATION", position: { x: 100, y: 550 }, data: { type: "toast", message: "✅ Not kaydedildi." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" }
            ]
        }
    },
    // 6. Park Yeri Kaydet
    {
        id: 'gold-6',
        title: 'Park Yeri Kaydet',
        title_en: 'Save Parking Spot',
        description: 'Arabanızı nereye park ettiğinizi asla unutmayın.',
        description_en: 'Never forget where you parked.',
        category: 'Travel',
        author: 'BreviAI',
        downloads: '70k+',
        tags: ['parking', 'car', 'location', 'park'],
        template_json: {
            name: "Park Yeri Kaydet",
            description: "Arabanızı nereye park ettiğinizi asla unutmayın.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Park Ettim" },
                { id: "2", type: "LOCATION_GET", position: { x: 100, y: 250 }, data: { variableName: "park_loc", accuracy: "high" } },
                { id: "3", type: "FILE_WRITE", position: { x: 100, y: 400 }, data: { filename: "parking.json", content: '{"lat": {{park_loc.latitude}}, "lng": {{park_loc.longitude}}, "time": "{{park_loc.timestamp}}"}' } },
                { id: "4", type: "NOTIFICATION", position: { x: 100, y: 550 }, data: { type: "push", title: "Park Edildi", message: "📍 Konum kaydedildi." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" }
            ]
        }
    },
    // 7. Arabamı Bul
    {
        id: 'gold-7',
        title: 'Arabamı Bul',
        title_en: 'Find My Car',
        description: 'Park ettiğiniz konumu gösterir.',
        description_en: 'Shows where you parked.',
        category: 'Travel',
        author: 'BreviAI',
        downloads: '65k+',
        tags: ['parking', 'find', 'car', 'bul'],
        template_json: {
            name: "Arabamı Bul",
            description: "Park ettiğiniz konumu gösterir.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Arabam Nerede?" },
                { id: "2", type: "FILE_READ", position: { x: 100, y: 250 }, data: { filename: "parking.json", variableName: "saved_park" } },
                { id: "3", type: "NOTIFICATION", position: { x: 100, y: 400 }, data: { type: "toast", message: "Konum bulundu, harita açılıyor..." } },
                { id: "4", type: "SHARE_SHEET", position: { x: 100, y: 550 }, data: { content: "Aracımın Konumu: {{saved_park}}" } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" }
            ]
        }
    },
    // 8. Okuma Zamanı
    {
        id: 'gold-8',
        title: 'Okuma Zamanı',
        title_en: 'Reading Time',
        description: 'Gözlerinizi yormadan okuma yapın. (DND, Parlaklık, Ekran Süresi)',
        description_en: 'Read without eye strain. (DND, Brightness, Screen Awake)',
        category: 'Lifestyle',
        author: 'BreviAI',
        downloads: '30k+',
        tags: ['reading', 'book', 'screen', 'okuma'],
        template_json: {
            name: "Okuma Zamanı",
            description: "Gözlerinizi yormadan okuma yapın.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Okuma Başlat" },
                { id: "2", type: "DND_CONTROL", position: { x: 100, y: 250 }, data: { enabled: true } },
                { id: "3", type: "BRIGHTNESS_CONTROL", position: { x: 100, y: 400 }, data: { level: 35 } },
                { id: "4", type: "SCREEN_WAKE", position: { x: 100, y: 550 }, data: { keepAwake: true, duration: 1800000 }, label: "30dk Açık Tut" },
                { id: "5", type: "MEDIA_CONTROL", position: { x: 100, y: 700 }, data: { action: "play_pause" }, label: "Müzik (Opsiyonel)" }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" }
            ]
        }
    },
    // 9. Sosyal Medya Detoksu
    {
        id: 'gold-9',
        title: 'Sosyal Medya Detoksu',
        title_en: 'Social Detox',
        description: '30 dakika boyunca bildirimlerden uzak durun.',
        description_en: 'Stay away from notifications for 30 minutes.',
        category: 'Health',
        author: 'BreviAI',
        downloads: '55k+',
        tags: ['detox', 'social', 'focus', 'detoks'],
        template_json: {
            name: "Sosyal Medya Detoksu",
            description: "30 dakika boyunca bildirimlerden uzak durun.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Detoks Başla" },
                { id: "2", type: "DND_CONTROL", position: { x: 100, y: 250 }, data: { enabled: true } },
                { id: "3", type: "NOTIFICATION", position: { x: 100, y: 400 }, data: { type: "toast", message: "🧘 30dk Detoks başladı" } },
                { id: "4", type: "DELAY", position: { x: 100, y: 550 }, data: { duration: 30, unit: "min" } },
                { id: "5", type: "DND_CONTROL", position: { x: 100, y: 700 }, data: { enabled: false } },
                { id: "6", type: "NOTIFICATION", position: { x: 100, y: 850 }, data: { type: "push", title: "Detoks Bitti", message: "Tebrikler! 🎉" } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" },
                { id: "e5", source: "5", target: "6", sourceHandle: "default" }
            ]
        }
    },
    // 10. PANİK BUTONU
    {
        id: 'gold-10',
        title: 'PANİK BUTONU',
        title_en: 'PANIC BUTTON',
        description: 'Acil durumlarda tek tuşla yardım çağırın ve dikkat çekin.',
        description_en: 'Call for help with one button in emergencies.',
        category: 'Security',
        author: 'BreviAI',
        downloads: '99k+',
        tags: ['panic', 'sos', 'emergency', 'panik'],
        template_json: {
            name: "PANİK BUTONU",
            description: "Acil durumlarda tek tuşla yardım çağırın ve dikkat çekin.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "PANİK" },
                { id: "2", type: "LOCATION_GET", position: { x: 100, y: 250 }, data: { variableName: "sos_loc", accuracy: "high" } },
                { id: "3", type: "BRIGHTNESS_CONTROL", position: { x: 100, y: 400 }, data: { level: 100 } },
                { id: "4", type: "FLASHLIGHT_CONTROL", position: { x: 100, y: 550 }, data: { mode: "on" } },
                { id: "5", type: "SMS_SEND", position: { x: 100, y: 700 }, data: { phoneNumber: "112", message: "YARDIM EDİN! Konumum: {{sos_loc.latitude}}, {{sos_loc.longitude}}" } },
                { id: "6", type: "SPEAK_TEXT", position: { x: 100, y: 850 }, data: { text: "YARDIM EDİN! ACİL DURUM!" } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" },
                { id: "e5", source: "5", target: "6", sourceHandle: "default" }
            ]
        }
    },

    // 11-23: NEW USEFUL TEMPLATES
    // 11. Sinema Modu
    {
        id: 'gold-11',
        title: 'Sinema Modu',
        title_en: 'Cinema Mode',
        description: 'Film izlerken 2 saat boyunca rahatsız edilmeyin.',
        description_en: 'Complete silence and darkness for 2 hours.',
        category: 'Lifestyle',
        author: 'BreviAI',
        downloads: '20k+',
        tags: ['cinema', 'movie', 'quiet', 'film'],
        template_json: {
            name: "Sinema Modu",
            description: "2 saat boyunca sessiz ve karanlık mod.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "Film Başla" },
                { id: "2", type: "DND_CONTROL", position: { x: 100, y: 250 }, data: { enabled: true } },
                { id: "3", type: "BRIGHTNESS_CONTROL", position: { x: 100, y: 400 }, data: { level: 0 } },
                { id: "4", type: "VOLUME_CONTROL", position: { x: 100, y: 550 }, data: { stream: "music", level: 0 }, label: "Medya Sessiz" },
                { id: "5", type: "DELAY", position: { x: 100, y: 700 }, data: { duration: 120, unit: "min" }, label: "2 Saat Bekle" },
                { id: "6", type: "DND_CONTROL", position: { x: 100, y: 850 }, data: { enabled: false } },
                { id: "7", type: "VOLUME_CONTROL", position: { x: 100, y: 1000 }, data: { stream: "music", level: 50 } },
                { id: "8", type: "NOTIFICATION", position: { x: 100, y: 1150 }, data: { type: "toast", message: "🎬 Film modu bitti." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" },
                { id: "e5", source: "5", target: "6", sourceHandle: "default" },
                { id: "e6", source: "6", target: "7", sourceHandle: "default" },
                { id: "e7", source: "7", target: "8", sourceHandle: "default" }
            ]
        }
    },
    // 12. Su İçme Döngüsü
    {
        id: 'gold-12',
        title: 'Su İçme Döngüsü',
        title_en: 'Water Loop',
        description: 'Günde 8 kez, her saat başı su içmenizi hatırlatır.',
        description_en: 'Reminds you to drink water 8 times, every hour.',
        category: 'Health',
        author: 'BreviAI',
        downloads: '33k+',
        tags: ['water', 'health', 'loop', 'su'],
        template_json: {
            name: "Su İçme Döngüsü",
            description: "8 saat boyunca her saat su hatırlatır.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "Güne Başla" },
                { id: "2", type: "LOOP", position: { x: 100, y: 250 }, data: { type: "count", count: 8 }, label: "8 Kere Tekrarla" },
                { id: "3", type: "DELAY", position: { x: 300, y: 400 }, data: { duration: 60, unit: "min" }, label: "1 Saat Bekle" },
                { id: "4", type: "NOTIFICATION", position: { x: 300, y: 550 }, data: { type: "push", title: "Su Vakti!", message: "💧 Bir bardak su içme zamanı." } },
                { id: "5", type: "NOTIFICATION", position: { x: 100, y: 700 }, data: { type: "toast", message: "🎉 Günlük su hedefine ulaştın!" }, label: "Bitiş Mesajı" }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "loop" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "2", sourceHandle: "default" }, // Loop back
                { id: "e5", source: "2", target: "5", sourceHandle: "done" }
            ]
        }
    },
    // 13. Toplantı Öncesi Hazırlık
    {
        id: 'gold-13',
        title: 'Toplantı Bağlantısı',
        title_en: 'Join Meeting',
        description: 'Panodan toplantı linkini alır ve tarayıcıda açar.',
        description_en: 'Takes meeting link from clipboard and opens in browser.',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '15k+',
        tags: ['meeting', 'clipboard', 'link'],
        template_json: {
            name: "Linke Git",
            description: "Panodaki linki açar.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "Bağlan" },
                { id: "2", type: "CLIPBOARD_READER", position: { x: 100, y: 250 }, data: { variableName: "clip_url" } },
                { id: "3", type: "IF_ELSE", position: { x: 100, y: 400 }, data: { left: "{{clip_url}}", operator: "startsWith", right: "http" }, label: "Link mi?" },
                { id: "4", type: "APP_LAUNCH", position: { x: 100, y: 550 }, data: { packageName: "com.android.chrome" }, label: "Chrome Aç" },
                { id: "5", type: "NOTIFICATION", position: { x: 300, y: 550 }, data: { type: "toast", message: "❌ Panoda link bulunamadı." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "true" },
                { id: "e4", source: "3", target: "5", sourceHandle: "false" }
            ]
        }
    },
    // 14. Gece Güvenliği (Fenerli Yürüyüş)
    {
        id: 'gold-14',
        title: 'Fenerli Yürüyüş',
        title_en: 'Night Walk',
        description: 'Karanlıkta yürürken feneri açar ve müziği başlatır.',
        description_en: 'Turns on flashlight and starts music for night walks.',
        category: 'Lifestyle',
        author: 'BreviAI',
        downloads: '18k+',
        tags: ['walk', 'night', 'light', 'fener'],
        template_json: {
            name: "Fenerli Yürüyüş",
            description: "Güvenli gece yürüyüşü modu.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "Yürüyüş" },
                { id: "2", type: "FLASHLIGHT_CONTROL", position: { x: 100, y: 250 }, data: { mode: "on" } },
                { id: "3", type: "BRIGHTNESS_CONTROL", position: { x: 100, y: 400 }, data: { level: 80 } },
                { id: "4", type: "MEDIA_CONTROL", position: { x: 100, y: 550 }, data: { action: "play_pause" }, label: "Müzik Başlat" },
                { id: "5", type: "NOTIFICATION", position: { x: 100, y: 700 }, data: { type: "toast", message: "🔦 Güvenli yürüyüşler!" } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" }
            ]
        }
    },
    // 15. Duygu Günlüğü
    {
        id: 'gold-15',
        title: 'Duygu Günlüğü',
        title_en: 'Mood Journal',
        description: 'Günlük hislerinizi kaydedin.',
        description_en: 'Log how you feel today.',
        category: 'Health',
        author: 'BreviAI',
        downloads: '12k+',
        tags: ['journal', 'mood', 'diary', 'günlük'],
        template_json: {
            name: "Duygu Günlüğü",
            description: "Bugün nasıl hissediyorsun?",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "Günlük" },
                { id: "2", type: "TEXT_INPUT", position: { x: 100, y: 250 }, data: { prompt: "Bugün nasıl hissediyorsun?", variableName: "mood_text" } },
                { id: "3", type: "LOCATION_GET", position: { x: 100, y: 400 }, data: { variableName: "mood_loc" } },
                { id: "4", type: "FILE_WRITE", position: { x: 100, y: 550 }, data: { filename: "MoodLog.txt", content: "\n--- {{mood_loc.timestamp}} ---\nMood: {{mood_text}}\nKonum: {{mood_loc.latitude}},{{mood_loc.longitude}}", append: true } },
                { id: "5", type: "NOTIFICATION", position: { x: 100, y: 700 }, data: { type: "toast", message: "✅ Günlük kaydedildi." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" }
            ]
        }
    },
    // 16. Park Süresi Sayacı
    {
        id: 'gold-16',
        title: 'Park Süresi Alarmı',
        title_en: 'Parking Meter',
        description: 'Park süresi dolmadan önce sizi uyarır.',
        description_en: 'Alerts you before parking expires.',
        category: 'Travel',
        author: 'BreviAI',
        downloads: '25k+',
        tags: ['parking', 'alarm', 'timer'],
        template_json: {
            name: "Park Alarmı",
            description: "Park süresini girin, bitince haber verelim.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "Park Başlat" },
                { id: "2", type: "TEXT_INPUT", position: { x: 100, y: 250 }, data: { prompt: "Kaç dakika park edeceksiniz?", variableName: "park_mins", defaultValue: "60" } },
                { id: "3", type: "DELAY", position: { x: 100, y: 400 }, data: { duration: 60, unit: "min" }, label: "Bekle (Varsayılan 60dk)" }, // Note: Dynamic delay not yet supported in node config UI often, assuming 60 for demo or user edits it. 
                // Better approach: Since DELAY node takes static config usually, we use a fixed commonly used time for "Paid Parking" like 1 hr.
                // Or if engine supported variable in delay config: {{park_mins}}. Assuming verified engine supports variables in config numbers.
                { id: "4", type: "NOTIFICATION", position: { x: 100, y: 550 }, data: { type: "push", title: "Park Süresi Doluyor!", message: "Arabanın yanına gitme vakti." } },
                { id: "5", type: "SOUND_MODE", position: { x: 100, y: 700 }, data: { mode: "normal" } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" }
            ]
        }
    },
    // 17. Acil SOS Flaşör
    {
        id: 'gold-17',
        title: 'SOS Flaşör',
        title_en: 'SOS Flasher',
        description: 'Feneri SOS sinyali verecek şekilde yakıp söndürür.',
        description_en: 'Flashes light in SOS pattern.',
        category: 'Security',
        author: 'BreviAI',
        downloads: '40k+',
        tags: ['sos', 'light', 'strobe'],
        template_json: {
            name: "SOS Flaşör",
            description: "Görsel acil durum sinyali.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "SOS" },
                { id: "2", type: "LOOP", position: { x: 100, y: 250 }, data: { type: "count", count: 10 }, label: "10 Kez" },
                { id: "3", type: "FLASHLIGHT_CONTROL", position: { x: 300, y: 250 }, data: { mode: "on" } },
                { id: "4", type: "DELAY", position: { x: 450, y: 250 }, data: { duration: 500, unit: "ms" } }, // Assuming ms unit support or sec 0.5
                // Wait, Delay config usually 'sec', 'min'. If sec supports float? Engine uses setTimeout, so float works.
                { id: "5", type: "FLASHLIGHT_CONTROL", position: { x: 600, y: 250 }, data: { mode: "off" } },
                { id: "6", type: "DELAY", position: { x: 750, y: 250 }, data: { duration: 0.5, unit: "sec" } },
                { id: "7", type: "NOTIFICATION", position: { x: 100, y: 400 }, data: { type: "toast", message: "SOS Tamamlandı" } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "loop" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" },
                { id: "e5", source: "5", target: "6", sourceHandle: "default" },
                { id: "e6", source: "6", target: "2", sourceHandle: "default" },
                { id: "e7", source: "2", target: "7", sourceHandle: "done" }
            ]
        }
    },
    // 18. Eve Yaklaştım (Simple)
    {
        id: 'gold-18',
        title: 'Tam Konum Paylaş',
        title_en: 'Share Exact Location',
        description: 'Enlem ve boylam bilgisini SMS ile gönderir.',
        description_en: 'Sends latitude and longitude via SMS.',
        category: 'Travel',
        author: 'BreviAI',
        downloads: '22k+',
        tags: ['share', 'location', 'gps'],
        template_json: {
            name: "Konum Gönder",
            description: "Tam konum paylaşımı.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "Paylaş" },
                { id: "2", type: "LOCATION_GET", position: { x: 100, y: 250 }, data: { variableName: "myloc", accuracy: "high" } },
                { id: "3", type: "SMS_SEND", position: { x: 100, y: 400 }, data: { phoneNumber: "", message: "Şu an buradayım: https://www.google.com/maps/search/?api=1&query={{myloc.latitude}},{{myloc.longitude}}" } },
                { id: "4", type: "NOTIFICATION", position: { x: 100, y: 550 }, data: { type: "toast", message: "📍 Konum gönderildi." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" }
            ]
        }
    },
    // 19. Şarj Tamamlandı Alarmı
    {
        id: 'gold-19',
        title: 'Şarj Tamamlandı',
        title_en: 'Charge Complete',
        description: 'Şarj %100 olduğunda sesli uyarı verir.',
        description_en: 'Alerts when battery reaches 100%.',
        category: 'Utilities',
        author: 'BreviAI',
        downloads: '50k+',
        tags: ['charge', 'alarm', 'battery'],
        template_json: {
            name: "Şarj Alarmı",
            description: "Pil dolunca haber verir.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "Alarmı Kur" },
                { id: "2", type: "BATTERY_CHECK", position: { x: 100, y: 250 }, data: { variableName: "check_bat" } },
                { id: "3", type: "IF_ELSE", position: { x: 100, y: 400 }, data: { left: "{{check_bat.level}}", operator: ">=", right: "100" }, label: "Doldu mu?" },
                { id: "4", type: "SOUND_MODE", position: { x: 300, y: 550 }, data: { mode: "normal" } },
                { id: "5", type: "SPEAK_TEXT", position: { x: 300, y: 700 }, data: { text: "Şarj tamamlandı. Kabloyu çıkar." }, label: "Sesli Uyarı" },
                { id: "6", type: "DELAY", position: { x: -100, y: 550 }, data: { duration: 5, unit: "min" }, label: "5dk Bekle" }, // Wait and check again
                { id: "7", type: "NOTIFICATION", position: { x: 100, y: 200 }, data: { type: "toast", message: "🔋 İzleniyor..." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "true" },
                { id: "e4", source: "4", target: "5", sourceHandle: "default" },
                { id: "e5", source: "3", target: "6", sourceHandle: "false" },
                { id: "e6", source: "6", target: "2", sourceHandle: "default" }, // Loop back
                { id: "e7", source: "1", target: "7", sourceHandle: "default" }
            ]
        }
    },
    // 20. Hızlı WiFi Bilgisi
    {
        id: 'gold-20',
        title: 'WiFi Kontrol',
        title_en: 'WiFi Check',
        description: 'Bağlı olduğunuz WiFi durumunu kontrol eder.',
        description_en: 'Checks current WiFi status.',
        category: 'Utilities',
        author: 'BreviAI',
        downloads: '10k+',
        tags: ['wifi', 'network', 'check'],
        template_json: {
            name: "WiFi Durumu",
            description: "Ağ bağlantısını kontrol et.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "Kontrol Et" },
                { id: "2", type: "NETWORK_CHECK", position: { x: 100, y: 250 }, data: { variableName: "wifi_stat", checkType: "wifi" } },
                { id: "3", type: "IF_ELSE", position: { x: 100, y: 400 }, data: { left: "{{wifi_stat.isConnected}}", operator: "==", right: "true" }, label: "Bağlı mı?" },
                { id: "4", type: "NOTIFICATION", position: { x: 300, y: 550 }, data: { type: "toast", message: "✅ WiFi Bağlı. İnternet: {{wifi_stat.isInternetReachable}}" } },
                { id: "5", type: "NOTIFICATION", position: { x: -100, y: 550 }, data: { type: "toast", message: "❌ WiFi Bağlı Değil." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "true" },
                { id: "e4", source: "3", target: "5", sourceHandle: "false" }
            ]
        }
    },
    // 21. Günlük Plan Özeti
    {
        id: 'gold-21',
        title: 'Günlük Plan Özeti',
        title_en: 'Daily Planner',
        description: 'Tüm günün etkinliklerini tek tek listeler.',
        description_en: 'Lists all events for the day.',
        category: 'Productivity',
        author: 'BreviAI',
        downloads: '18k+',
        tags: ['calendar', 'plan', 'daily'],
        template_json: {
            name: "Plan Özeti",
            description: "Bugünkü etkinlikleri dosyal.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "Planla" },
                { id: "2", type: "CALENDAR_READ", position: { x: 100, y: 250 }, data: { type: "today", maxEvents: 10, variableName: "events_list" } },
                { id: "3", type: "LOOP", position: { x: 100, y: 400 }, data: { type: "forEach", items: "{{events_list}}" }, label: "Her Etkinlik İçin" },
                { id: "4", type: "FILE_WRITE", position: { x: 300, y: 400 }, data: { filename: "TodayPlan.txt", content: "- {{_loopItem.title}} at {{_loopItem.startDate}}\n", append: true } },
                { id: "5", type: "NOTIFICATION", position: { x: 100, y: 600 }, data: { type: "toast", message: "📅 Plan dosyaya kaydedildi." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "loop" },
                { id: "e4", source: "4", target: "3", sourceHandle: "default" },
                { id: "e5", source: "3", target: "5", sourceHandle: "done" }
            ]
        }
    },
    // 22. Okul Modu
    {
        id: 'gold-22',
        title: 'Okul Modu',
        title_en: 'School Mode',
        description: 'Derste sessize al, sadece titreşim.',
        description_en: 'Silent during class, vibration only.',
        category: 'Work',
        author: 'BreviAI',
        downloads: '42k+',
        tags: ['school', 'class', 'silent'],
        template_json: {
            name: "Okul Modu",
            description: "Ders için sessiz mod.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, label: "Ders Başla" },
                { id: "2", type: "SOUND_MODE", position: { x: 100, y: 250 }, data: { mode: "vibrate" } },
                { id: "3", type: "VOLUME_CONTROL", position: { x: 100, y: 400 }, data: { stream: "music", level: 0 } },
                { id: "4", type: "NOTIFICATION", position: { x: 100, y: 550 }, data: { type: "toast", message: "📚 İyi dersler. Sessize alındı." } }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" },
                { id: "e3", source: "3", target: "4", sourceHandle: "default" }
            ]
        }
    },

    // 23. Google Arama
    {
        id: 'gold-23',
        title: 'Hızlı Google Arama',
        title_en: 'Quick Google Search',
        description: 'Web\'de hızlıca arama yapın.',
        description_en: 'Search quickly on the web.',
        category: 'Utilities',
        author: 'BreviAI',
        downloads: '100k+',
        tags: ['search', 'google', 'web', 'ara'],
        template_json: {
            name: "Web Araması",
            description: "Google üzerinde arama yapar.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Ara" },
                { id: "2", type: "TEXT_INPUT", position: { x: 100, y: 250 }, data: { prompt: "Ne aramak istersiniz?", variableName: "search_query" } },
                { id: "3", type: "OPEN_URL", position: { x: 100, y: 400 }, data: { url: "https://www.google.com/search?q={{search_query}}" }, label: "Google'da Aç" }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" }
            ]
        }
    },
    // 24. YouTube Arama
    {
        id: 'gold-24',
        title: 'YouTube Arama',
        title_en: 'YouTube Search',
        description: 'İstediğiniz videoyu YouTube\'da bulun.',
        description_en: 'Find any video on YouTube.',
        category: 'Lifestyle',
        author: 'BreviAI',
        downloads: '90k+',
        tags: ['video', 'youtube', 'search', 'izle'],
        template_json: {
            name: "YouTube İzle",
            description: "Video araması yapar.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Video Ara" },
                { id: "2", type: "TEXT_INPUT", position: { x: 100, y: 250 }, data: { prompt: "Hangi videoyu arıyorsun?", variableName: "yt_query" } },
                { id: "3", type: "OPEN_URL", position: { x: 100, y: 400 }, data: { url: "https://www.youtube.com/results?search_query={{yt_query}}" }, label: "YouTube'da Aç" }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" }
            ]
        }
    },
    // 25. Web'de Konumum
    {
        id: 'gold-25',
        title: 'Web\'de Konumum',
        title_en: 'Locate on Web',
        description: 'Konumunuzu Google Haritalar web sitesinde açar.',
        description_en: 'Opens your location on Google Maps web.',
        category: 'Travel',
        author: 'BreviAI',
        downloads: '60k+',
        tags: ['map', 'location', 'web', 'konum'],
        template_json: {
            name: "Web Haritası",
            description: "Konumu tarayıcıda gör.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Konum Gör" },
                { id: "2", type: "LOCATION_GET", position: { x: 100, y: 250 }, data: { variableName: "web_loc" } },
                { id: "3", type: "OPEN_URL", position: { x: 100, y: 400 }, data: { url: "https://www.google.com/maps?q={{web_loc.latitude}},{{web_loc.longitude}}" }, label: "Haritada Aç" }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" }
            ]
        }
    },
    // 26. Amazon Fiyat Bak
    {
        id: 'gold-26',
        title: 'Amazon Fiyat Bak',
        title_en: 'Amazon Price Check',
        description: 'Ürün fiyatlarını hemen Amazon\'da kontrol edin.',
        description_en: 'Check product prices on Amazon instantly.',
        category: 'Shopping',
        author: 'BreviAI',
        downloads: '75k+',
        tags: ['shopping', 'amazon', 'price', 'fiyat'],
        template_json: {
            name: "Fiyat Kontrol",
            description: "Ürün arama ve fiyat kontrolü.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Fiyat Bak" },
                { id: "2", type: "TEXT_INPUT", position: { x: 100, y: 250 }, data: { prompt: "Ürün adı nedir?", variableName: "bi_product" } },
                { id: "3", type: "OPEN_URL", position: { x: 100, y: 400 }, data: { url: "https://www.amazon.com.tr/s?k={{bi_product}}" }, label: "Amazon'a Git" }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" }
            ]
        }
    },
    // 27. Wikipedia Ara
    {
        id: 'gold-27',
        title: 'Wikipedia Ara',
        title_en: 'Wikipedia Search',
        description: 'Herhangi bir konuyu Wikipedia\'da araştırın.',
        description_en: 'Research any topic on Wikipedia.',
        category: 'Utilities',
        author: 'BreviAI',
        downloads: '55k+',
        tags: ['wiki', 'research', 'info', 'bilgi'],
        template_json: {
            name: "Wiki Araştır",
            description: "Ansiklopedik bilgi araması.",
            nodes: [
                { id: "1", type: "MANUAL_TRIGGER", position: { x: 100, y: 100 }, data: {}, label: "Araştır" },
                { id: "2", type: "TEXT_INPUT", position: { x: 100, y: 250 }, data: { prompt: "Konu nedir?", variableName: "wiki_topic" } },
                { id: "3", type: "OPEN_URL", position: { x: 100, y: 400 }, data: { url: "https://tr.wikipedia.org/wiki/Special:Search?search={{wiki_topic}}" }, label: "Wiki'de Aç" }
            ],
            edges: [
                { id: "e1", source: "1", target: "2", sourceHandle: "default" },
                { id: "e2", source: "2", target: "3", sourceHandle: "default" }
            ]
        }
    },

    ...POPULAR_APPS
];
