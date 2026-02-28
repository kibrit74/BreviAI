import { Workflow, NodeType } from '../types/workflow-types';
// Simple ID generator to avoid external dependencies
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    nodes: any[];
    edges: any[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    {
        id: 'web-auto-test',
        name: 'Web Otomasyon Testi',
        description: 'Web otomasyon nodunun çalışıp çalışmadığını test eder. example.com başlığını çeker.',
        icon: '🌐',
        color: '#06B6D4',
        nodes: [
            {
                id: '1',
                type: 'MANUAL_TRIGGER',
                label: 'Başlat',
                position: { x: 250, y: 50 },
                config: {}
            },
            {
                id: '2',
                type: 'WEB_AUTOMATION',
                label: 'Example.com Ziyaret',
                position: { x: 250, y: 150 },
                config: {
                    url: 'https://example.com',
                    interactive: false,
                    variableName: 'site_data',
                    actions: [
                        { type: 'wait', value: '1000', description: 'Yüklenmesini bekle' },
                        { type: 'scrape', selector: 'h1', variableName: 'baslik', description: 'Başlığı çek' },
                        { type: 'scrape', selector: 'p', variableName: 'icerik', description: 'İçeriği çek' }
                    ]
                }
            },
            {
                id: '3',
                type: 'SHOW_TEXT',
                label: 'Sonucu Göster',
                position: { x: 250, y: 300 },
                config: {
                    title: 'Web Otomasyon Sonucu',
                    content: 'Başlık: {{site_data.baslik}}\n\nİçerik: {{site_data.icerik}}'
                }
            }
        ],
        edges: [
            { id: 'e1-2', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' },
            { id: 'e2-3', sourceNodeId: '2', targetNodeId: '3', sourcePort: 'default' }
        ]
    },
    {
        id: 'daily-briefing',
        name: '🌄 Günlük Yönetici Brifingi',
        description: 'Takviminizi ve hava durumunu analiz eder, size sesli olarak günlük planınızı anlatır.',
        icon: 'sunny',
        color: '#F59E0B',
        nodes: [
            { id: '1', type: 'TIME_TRIGGER', label: 'Her Sabah 08:00', config: { hour: 8, minute: 0, repeat: true }, position: { x: 100, y: 50 } },
            { id: '2', type: 'CALENDAR_READ', label: 'Takvimi Oku', config: { type: 'today', variableName: 'calendar' }, position: { x: 100, y: 200 } },
            { id: '3', type: 'LOCATION_GET', label: 'Konum Al', config: { variableName: 'loc' }, position: { x: 300, y: 200 } },
            {
                id: '4', type: 'AGENT_AI', label: 'AI Analiz', config: {
                    provider: 'gemini',
                    model: 'gemini-2.0-flash-exp',
                    variableName: 'briefing',
                    prompt: 'Sen benim asistanımsın. Takvimim: {{calendar}}. Konumum: {{loc}}. Bana bugünkü programımı, hava durumunu (tahmin et) ve motive edici bir sözü içeren kısa bir brifing metni hazırla. Türkçe olsun.'
                }, position: { x: 200, y: 350 }
            },
            { id: '5', type: 'SPEAK_TEXT', label: 'Sesli Oku', config: { text: '{{briefing}}' }, position: { x: 200, y: 500 } }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' },
            { id: 'e2', sourceNodeId: '2', targetNodeId: '3', sourcePort: 'default' },
            { id: 'e3', sourceNodeId: '3', targetNodeId: '4', sourcePort: 'default' },
            { id: 'e4', sourceNodeId: '4', targetNodeId: '5', sourcePort: 'default' }
        ]
    },
    {
        id: 'meeting-summary',
        name: '📝 Toplantı Özeti & Paylaşım',
        description: 'Toplantı sesini kaydeder, metne döker, özetler ve Slack/Email ile paylaşır.',
        icon: 'people',
        color: '#3B82F6',
        nodes: [
            { id: '1', type: 'MANUAL_TRIGGER', label: 'Toplantı Başlat', config: {}, position: { x: 100, y: 50 } },
            { id: '2', type: 'AUDIO_RECORD', label: 'Ses Kaydı', config: { duration: 3600, variableName: 'audio_file' }, position: { x: 100, y: 200 } },
            { id: '3', type: 'SPEECH_TO_TEXT', label: 'Deşifre Et', config: { variableName: 'transcript', language: 'tr-TR' }, position: { x: 100, y: 350 } },
            {
                id: '4', type: 'AGENT_AI', label: 'Özetle', config: {
                    provider: 'gemini',
                    variableName: 'summary',
                    prompt: 'Bu toplantı metnini analiz et: "{{transcript}}".\n1. Konuşulan ana başlıklar.\n2. Alınan kararlar.\n3. Aksiyon maddeleri (Kime ne görev verildi?)\nFormat: Profesyonel toplantı tutanağı.'
                }, position: { x: 100, y: 500 }
            },
            { id: '5', type: 'SHARE_SHEET', label: 'Paylaş', config: { content: '{{summary}}' }, position: { x: 100, y: 650 } }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' },
            { id: 'e2', sourceNodeId: '2', targetNodeId: '3', sourcePort: 'default' },
            { id: 'e3', sourceNodeId: '3', targetNodeId: '4', sourcePort: 'default' },
            { id: 'e4', sourceNodeId: '4', targetNodeId: '5', sourcePort: 'default' }
        ]
    },
    {
        id: 'receipt-scanner',
        name: '🧾 Fiş/Fatura Tarayıcı',
        description: 'Fişin fotoğrafını çeker, bilgileri okur ve Excel/Sheets\'e kaydeder.',
        icon: 'receipt',
        color: '#10B981',
        nodes: [
            { id: '1', type: 'MANUAL_TRIGGER', label: 'Fiş Tara', config: {}, position: { x: 100, y: 50 } },
            { id: '2', type: 'FILE_PICK', label: 'Kamera/Galeri', config: { allowedTypes: ['image'], variableName: 'receipt_img' }, position: { x: 100, y: 200 } },
            { id: '3', type: 'IMAGE_EDIT', label: 'Optimize Et', config: { inputImage: '{{receipt_img}}', actions: [{ type: 'resize', width: 1024 }], variableName: 'clean_img' }, position: { x: 100, y: 350 } },
            {
                id: '4', type: 'AGENT_AI', label: 'OCR & Analiz', config: {
                    provider: 'gemini',
                    attachments: 'clean_img',
                    variableName: 'data',
                    prompt: 'Bu fişteki şu bilgileri JSON olarak ver: { "merchant": "market adı", "date": "tarih", "total": number, "category": "gıda/akaryakıt/giyim" }.'
                }, position: { x: 100, y: 500 }
            },
            {
                id: '5', type: 'SHEETS_WRITE', label: 'Sheets\'e Yaz', config: {
                    spreadsheetId: 'YOUR_SHEET_ID',
                    range: 'A1',
                    values: '{{data.date}}, {{data.merchant}}, {{data.category}}, {{data.total}}',
                    append: true
                }, position: { x: 100, y: 650 }
            }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' },
            { id: 'e2', sourceNodeId: '2', targetNodeId: '3', sourcePort: 'default' },
            { id: 'e3', sourceNodeId: '3', targetNodeId: '4', sourcePort: 'default' },
            { id: 'e4', sourceNodeId: '4', targetNodeId: '5', sourcePort: 'default' }
        ]
    },
    {
        id: 'email-assistant',
        name: '📧 Akıllı Email Cevaplayıcı',
        description: 'Gelen mailleri analiz eder ve otomatik taslak cevap hazırlar.',
        icon: 'mail',
        color: '#EA4335',
        nodes: [
            { id: '1', type: 'GMAIL_READ', label: 'Mailleri Oku', config: { maxResults: 5, query: 'is:unread', variableName: 'emails' }, position: { x: 100, y: 50 } },
            { id: '2', type: 'LOOP', label: 'Her Mail İçin', config: { type: 'forEach', items: 'emails' }, position: { x: 100, y: 200 } },
            {
                id: '3', type: 'AGENT_AI', label: 'Cevap Yaz', config: {
                    provider: 'gemini',
                    variableName: 'draft',
                    prompt: 'Gelen mail: "{{loop.item.snippet}}". Buna profesyonel ve nazik bir cevap taslağı yaz. Gönderen: {{loop.item.from}}.'
                }, position: { x: 250, y: 350 }
            },
            { id: '4', type: 'NOTIFICATION', label: 'Taslak Hazır', config: { title: 'Cevap Önerisi', message: '{{draft}}' }, position: { x: 250, y: 500 } }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' },
            { id: 'e2', sourceNodeId: '2', targetNodeId: '3', sourcePort: 'loop' },
            { id: 'e3', sourceNodeId: '3', targetNodeId: '4', sourcePort: 'default' },
            { id: 'e4', sourceNodeId: '2', targetNodeId: '1', sourcePort: 'done' } // Loop back is technically wrong visually but logically flow continues
        ]
    },
    {
        id: 'insta-nanobana',
        name: '🎨 Instagram & Nano Banana',
        description: 'Resim yükleyin, AI ile düzenleyin (remix), onaylayın ve Instagram\'da paylaşın. İşlem veritabanına kaydedilir.',
        icon: 'logo-instagram',
        color: '#E1306C',
        nodes: [
            { id: '1', type: 'MANUAL_TRIGGER', label: 'Başlat', config: {}, position: { x: 250, y: 50 }, width: 280, height: 80 },
            {
                id: '2',
                type: 'FILE_PICK',
                label: 'Resim Seç',
                config: {
                    allowedTypes: ['image'],
                    variableName: 'input_img'
                },
                position: { x: 250, y: 150 },
                width: 280, height: 180
            },
            {
                id: '3',
                type: 'TEXT_INPUT',
                label: 'AI Prompt',
                config: {
                    prompt: 'Resim nasıl düzenlensin?',
                    placeholder: 'Örn: Cyberpunk stili, neon ışıklar...',
                    variableName: 'user_prompt'
                },
                position: { x: 250, y: 350 },
                width: 280, height: 200
            },
            {
                id: '4',
                type: 'IMAGE_GENERATOR',
                label: 'Nano Banana (Remix)',
                config: {
                    provider: 'nanobana',
                    prompt: '{{user_prompt}}',
                    inputImage: '{{input_img}}',
                    variableName: 'remixed_img'
                },
                position: { x: 250, y: 580 },
                width: 280, height: 250
            },
            {
                id: '5',
                type: 'SHOW_IMAGE',
                label: 'Onayla & Paylaş',
                config: {
                    title: 'Sonuç Görseli',
                    imageSource: '{{remixed_img}}'
                },
                position: { x: 250, y: 850 },
                width: 280, height: 250
            },
            {
                id: '6',
                type: 'DB_WRITE',
                label: 'Log Kaydı',
                config: {
                    tableName: 'insta_posts',
                    operation: 'insert',
                    data: '{ "image": "{{remixed_img}}", "prompt": "{{user_prompt}}", "status": "shared" }',
                    variableName: 'db_res'
                },
                position: { x: 100, y: 1150 },
                width: 280, height: 200
            },
            {
                id: '7',
                type: 'INSTAGRAM_POST',
                label: 'Instagram\'da Paylaş',
                config: {
                    imageUrl: '{{remixed_img}}',
                    caption: '{{user_prompt}} #BreviAI #NanoBanana',
                    accessTokenVariable: 'fb_token' // Kullanıcı token'ı önceden ayarlanmalı veya FB Login eklenmeli
                },
                position: { x: 100, y: 1380 },
                width: 280, height: 200
            },
            {
                id: '8',
                type: 'NOTIFICATION',
                label: 'İptal Edildi',
                config: {
                    title: 'İşlem İptal',
                    message: 'Görsel paylaşılmadı.'
                },
                position: { x: 450, y: 1150 },
                width: 280, height: 150
            },
            {
                id: '9',
                type: 'NOTIFICATION',
                label: 'Başarılı!',
                config: {
                    title: 'Paylaşıldı',
                    message: 'Görsel Instagram hesabınızda yayında!'
                },
                position: { x: 100, y: 1600 },
                width: 280, height: 150
            }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' },
            { id: 'e2', sourceNodeId: '2', targetNodeId: '3', sourcePort: 'default' },
            { id: 'e3', sourceNodeId: '3', targetNodeId: '4', sourcePort: 'default' },
            { id: 'e4', sourceNodeId: '4', targetNodeId: '5', sourcePort: 'default' },
            // Onay (True) Yolu
            { id: 'e5', sourceNodeId: '5', targetNodeId: '6', sourcePort: 'true', label: 'Onayla' },
            { id: 'e6', sourceNodeId: '6', targetNodeId: '7', sourcePort: 'default' },
            { id: 'e7', sourceNodeId: '7', targetNodeId: '9', sourcePort: 'default' },
            // İptal (False) Yolu
            { id: 'e8', sourceNodeId: '5', targetNodeId: '8', sourcePort: 'false', label: 'İptal' }
        ]
    },
    {
        id: 'camera-ocr',
        name: '📷 Kamera OCR & Metin Çıkarma',
        description: 'Kamerayla fotoğraf çeker, AI ile metin çıkarır ve panoya kopyalar.',
        icon: 'camera',
        color: '#8B5CF6',
        nodes: [
            { id: '1', type: 'MANUAL_TRIGGER', label: 'Başlat', config: {}, position: { x: 100, y: 50 } },
            { id: '2', type: 'CAMERA_CAPTURE', label: 'Fotoğraf Çek', config: { camera: 'back', variableName: 'photo' }, position: { x: 100, y: 200 } },
            {
                id: '3', type: 'AGENT_AI', label: 'OCR Analiz', config: {
                    provider: 'gemini',
                    model: 'gemini-2.0-flash-exp',
                    variableName: 'text',
                    prompt: 'Bu resimdeki tüm metinleri çıkar. Sadece metni döndür, açıklama yapma.'
                }, position: { x: 100, y: 350 }
            },
            { id: '4', type: 'CLIPBOARD_WRITE', label: 'Panoya Kopyala', config: { content: '{{text}}' }, position: { x: 100, y: 500 } },
            { id: '5', type: 'NOTIFICATION', label: 'Bildirim', config: { title: 'Metin Kopyalandı', message: '{{text}}' }, position: { x: 100, y: 650 } }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' },
            { id: 'e2', sourceNodeId: '2', targetNodeId: '3', sourcePort: 'default' },
            { id: 'e3', sourceNodeId: '3', targetNodeId: '4', sourcePort: 'default' },
            { id: 'e4', sourceNodeId: '4', targetNodeId: '5', sourcePort: 'default' }
        ]
    },
    {
        id: 'shake-flashlight',
        name: '🔦 Sallayınca Fener',
        description: 'Telefonu sallayınca feneri aç/kapat yapar.',
        icon: 'flashlight',
        color: '#FBBF24',
        nodes: [
            { id: '1', type: 'GESTURE_TRIGGER', label: 'Sallama Algıla', config: { gesture: 'shake', sensitivity: 'medium' }, position: { x: 100, y: 50 } },
            { id: '2', type: 'FLASHLIGHT_CONTROL', label: 'Fener Toggle', config: { mode: 'toggle' }, position: { x: 100, y: 200 } }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' }
        ]
    },
    {
        id: 'whatsapp-auto-reply',
        name: '💬 WhatsApp Otomatik Cevap',
        description: 'WhatsApp mesajı gelince AI ile analiz edip otomatik cevap yazar.',
        icon: 'logo-whatsapp',
        color: '#25D366',
        nodes: [
            { id: '1', type: 'WHATSAPP_TRIGGER', label: 'WhatsApp Mesaj', config: { senderFilter: '', messageFilter: '' }, position: { x: 100, y: 50 } },
            {
                id: '2', type: 'AGENT_AI', label: 'AI Cevap Yaz', config: {
                    provider: 'gemini',
                    variableName: 'reply',
                    prompt: 'Bu WhatsApp mesajına nazik ve kısa bir cevap yaz: "{{trigger.message}}". Gönderen: {{trigger.sender}}.'
                }, position: { x: 100, y: 200 }
            },
            { id: '3', type: 'NOTIFICATION', label: 'Cevap Önerisi', config: { title: 'AI Cevap Önerisi', message: '{{reply}}' }, position: { x: 100, y: 350 } }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' },
            { id: 'e2', sourceNodeId: '2', targetNodeId: '3', sourcePort: 'default' }
        ]
    },
    {
        id: 'smart-home-lights',
        name: '💡 Akıllı Ev - Işık Kontrolü',
        description: 'Philips Hue lambalarını konum veya zamana göre kontrol eder.',
        icon: 'bulb',
        color: '#F472B6',
        nodes: [
            { id: '1', type: 'TIME_TRIGGER', label: 'Her Gün 20:00', config: { hour: 20, minute: 0, repeat: true }, position: { x: 100, y: 50 } },
            { id: '2', type: 'PHILIPS_HUE', label: 'Işıkları Aç', config: { action: 'on', lightId: '1', brightness: 80 }, position: { x: 100, y: 200 } },
            { id: '3', type: 'DELAY', label: '4 Saat Bekle', config: { duration: 4, unit: 'hour' }, position: { x: 100, y: 350 } },
            { id: '4', type: 'PHILIPS_HUE', label: 'Işıkları Kapat', config: { action: 'off', lightId: '1' }, position: { x: 100, y: 500 } }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' },
            { id: 'e2', sourceNodeId: '2', targetNodeId: '3', sourcePort: 'default' },
            { id: 'e3', sourceNodeId: '3', targetNodeId: '4', sourcePort: 'default' }
        ]
    },
    {
        id: 'step-counter-goal',
        name: '🚶 Adım Hedefi',
        description: '10.000 adım hedefine ulaşınca kutlama bildirimi gösterir.',
        icon: 'walk',
        color: '#10B981',
        nodes: [
            { id: '1', type: 'STEP_TRIGGER', label: '10K Adım', config: { targetSteps: 10000, comparison: 'gte', resetDaily: true, variableName: 'adimlar' }, position: { x: 100, y: 50 } },
            { id: '2', type: 'NOTIFICATION', label: 'Kutlama!', config: { type: 'push', title: '🎉 Tebrikler!', message: '10.000 adım hedefine ulaştın! Bugün {{adimlar}} adım attın.' }, position: { x: 100, y: 200 } },
            { id: '3', type: 'SPEAK_TEXT', label: 'Sesli Kutlama', config: { text: 'Tebrikler! Bugün 10 bin adım hedefine ulaştınız!', language: 'tr-TR' }, position: { x: 100, y: 350 } }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' },
            { id: 'e2', sourceNodeId: '2', targetNodeId: '3', sourcePort: 'default' }
        ]
    },
    {
        id: 'call-auto-response',
        name: '📞 Cevapsız Arama SMS',
        description: 'Cevapsız aramada otomatik SMS gönderir.',
        icon: 'call',
        color: '#EF4444',
        nodes: [
            { id: '1', type: 'CALL_TRIGGER', label: 'Arama Geldi', config: { callState: 'missed', phoneFilter: '' }, position: { x: 100, y: 50 } },
            { id: '2', type: 'SMS_SEND', label: 'SMS Gönder', config: { phoneNumber: '{{trigger.phoneNumber}}', message: 'Şu an müsait değilim, en kısa sürede döneceğim.' }, position: { x: 100, y: 200 } }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' }
        ]
    },
    {
        id: 'backend-super-test',
        name: '🧪 Backend Süper Güç Testi',
        description: 'Browser Scrape ve Cron Create özelliklerini test eder. (Versiyon: 1.0)',
        icon: 'server',
        color: '#6366F1',
        nodes: [
            {
                id: '1',
                type: 'MANUAL_TRIGGER',
                config: {},
                position: { x: 100, y: 100 },
                label: 'Testi Başlat'
            },
            {
                id: '2',
                type: 'BROWSER_SCRAPE',
                config: {
                    url: 'https://time.is/UTC',
                    waitForSelector: '#time',
                    variableName: 'serverTime'
                },
                position: { x: 100, y: 250 },
                label: 'Web Kaynağını Oku'
            },
            {
                id: '3',
                type: 'SHOW_TEXT',
                config: {
                    title: 'Sunucudan Gelen Veri',
                    content: 'Backend Sunucusu time.is sitesine bağlandı.\n\nOkunan UTC Zamanı: {{serverTime}}\n\nŞimdi otomatik bir görev planlanıyor...'
                },
                position: { x: 100, y: 400 },
                label: 'Sonucu Göster'
            },
            {
                id: '4',
                type: 'CRON_CREATE',
                config: {
                    name: 'Otomatik Kontrol (Test)',
                    schedule: '*/5 * * * *',
                    actionType: 'log',
                    actionPayload: '{"message": "BreviAI Backend is Alive!"}'
                },
                position: { x: 100, y: 550 },
                label: '5 Dk\'da Bir Logla'
            },
            {
                id: '5',
                type: 'SHOW_TEXT',
                config: {
                    title: 'Test Başarılı!',
                    content: '1. Web Scraping: ✅ (Veri alındı)\n2. Cron Job: ✅ (Her 5 dakikada bir sunucu loguna yazacak)\n\nSüper güçlerin aktif!'
                },
                position: { x: 100, y: 700 },
                label: 'Bitiş Raporu'
            }
        ],
        edges: [
            { id: 'e1', sourceNodeId: '1', targetNodeId: '2', sourcePort: 'default' },
            { id: 'e2', sourceNodeId: '2', targetNodeId: '3', sourcePort: 'default' },
            { id: 'e3', sourceNodeId: '3', targetNodeId: '4', sourcePort: 'default' },
            { id: 'e4', sourceNodeId: '4', targetNodeId: '5', sourcePort: 'default' }
        ]
    }
];
