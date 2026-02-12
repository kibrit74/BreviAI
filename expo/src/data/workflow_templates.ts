import { Workflow, NodeType, EdgePort, NodeConfig } from '../types/workflow-types';
import { createWorkflow, createNode, createEdge } from '../types/workflow-types';

/**
 * BreviAI Gold Standard Workflow Templates
 * 10 Essential, 100% Working Templates
 */

// Helper to create a complete workflow structure
function buildWorkflow(
    name: string,
    description: string,
    icon: string,
    color: string,
    nodesConfig: { type: NodeType; config?: Partial<NodeConfig>; label?: string }[],
    edgesConfig: { from: number; to: number; port?: EdgePort }[]
): Workflow {
    const workflow = createWorkflow(name);
    workflow.description = description;
    workflow.icon = icon;
    workflow.color = color;

    // Create Nodes
    const createdNodes = nodesConfig.map((nc, index) => {
        const node = createNode(nc.type, { x: 100, y: 100 + (index * 150) }, nc.config);
        if (nc.label) node.label = nc.label;
        return node;
    });
    workflow.nodes = createdNodes;

    // Create Edges
    const createdEdges = edgesConfig.map(ec => {
        const sourceNode = createdNodes[ec.from];
        const targetNode = createdNodes[ec.to];
        return createEdge(sourceNode.id, targetNode.id, ec.port || 'default');
    });
    workflow.edges = createdEdges;

    return workflow;
}

export const WORKFLOW_TEMPLATES: Workflow[] = [
    // 1. Morning Assistant
    buildWorkflow(
        "Sabah Asistanı",
        "Gününüzü planlayın: Takvimi kontrol eder ve size özet geçer.",
        "🌅",
        "#F59E0B",
        [
            { type: 'MANUAL_TRIGGER', label: 'Günaydın' },
            { type: 'CALENDAR_READ', config: { type: 'today', maxEvents: 3, variableName: 'todays_events' } },
            { type: 'BATTERY_CHECK', config: { variableName: 'battery_stat' } },
            { type: 'SPEAK_TEXT', config: { text: 'Günaydın. Bugün {{todays_events.length}} etkinliğin var. Pil durumu yüzde {{battery_stat.level}}.' } },
            { type: 'NOTIFICATION', config: { type: 'toast', message: '📅 Sabah özeti tamamlandı.' } }
        ],
        [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3 },
            { from: 3, to: 4 }
        ]
    ),

    // 2. Meeting Focus
    buildWorkflow(
        "Toplantı Modu",
        "Rahatsız edilmeyin. DND açar, sesi kısar ve 1 saat sonra normale döner.",
        "💼",
        "#6366F1",
        [
            { type: 'MANUAL_TRIGGER', label: 'Toplantı Başla' },
            { type: 'DND_CONTROL', config: { enabled: true }, label: 'DND Aktif' },
            { type: 'SOUND_MODE', config: { mode: 'vibrate' }, label: 'Titreşim Modu' },
            { type: 'DELAY', config: { duration: 60, unit: 'min' }, label: '1 Saat Bekle' },
            { type: 'DND_CONTROL', config: { enabled: false }, label: 'DND Kapat' },
            { type: 'SOUND_MODE', config: { mode: 'normal' }, label: 'Ses Açık' },
            { type: 'NOTIFICATION', config: { type: 'push', title: 'Toplantı Bitti', message: 'Cihaz normale döndü.' } }
        ],
        [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3 },
            { from: 3, to: 4 },
            { from: 4, to: 5 },
            { from: 5, to: 6 }
        ]
    ),

    // 3. Heading Home
    buildWorkflow(
        "Eve Dönüş",
        "Partnerinize haber verin ve navigasyonu başlatın.",
        "🚗",
        "#3B82F6",
        [
            { type: 'MANUAL_TRIGGER', label: 'Eve Dönüyorum' },
            { type: 'LOCATION_GET', config: { variableName: 'current_loc' } },
            { type: 'SMS_SEND', config: { phoneNumber: '', message: 'Yola çıktım! Konumum: https://maps.google.com/?q={{current_loc.latitude}},{{current_loc.longitude}}' }, label: 'SMS Gönder (Numara Girin)' },
            { type: 'GLOBAL_ACTION', config: { action: 'home' }, label: 'Ana Ekrana Dön' },
            { type: 'NOTIFICATION', config: { type: 'toast', message: 'Navigasyon öneriliyor...' } }
        ],
        [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3 },
            { from: 3, to: 4 }
        ]
    ),

    // 4. Battery Emergency
    buildWorkflow(
        "Acil Şarj Koruma",
        "Şarj azaldığında tüm sistemleri kapatarak pil ömrünü uzatır.",
        "🪫",
        "#EF4444",
        [
            { type: 'MANUAL_TRIGGER', label: 'Acil Durum' },
            { type: 'BATTERY_CHECK', config: { variableName: 'bat' } },
            {
                type: 'IF_ELSE',
                config: { left: '{{bat.level}}', operator: '<', right: '30' },
                label: 'Şarj < %30?'
            },
            // True: Critical
            { type: 'BRIGHTNESS_CONTROL', config: { level: 0 }, label: 'Ekran Karart' },
            { type: 'DND_CONTROL', config: { enabled: true }, label: 'DND Aç' },
            { type: 'NOTIFICATION', config: { type: 'toast', message: '⚠️ Kritik mod aktif!' } },
            // False: Warning
            { type: 'NOTIFICATION', config: { type: 'toast', message: '🔋 Şarj seviyesi idare eder: %{{bat.level}}' } }
        ],
        [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3, port: 'true' },
            { from: 3, to: 4 },
            { from: 4, to: 5 },
            { from: 2, to: 6, port: 'false' }
        ]
    ),

    // 5. Quick Note
    buildWorkflow(
        "Hızlı Not",
        "Aklınıza geleni hemen kaydedin.",
        "📝",
        "#EC4899",
        [
            { type: 'MANUAL_TRIGGER', label: 'Not Al' },
            { type: 'TEXT_INPUT', config: { prompt: 'Ne not almak istersiniz?', variableName: 'quick_note' } },
            { type: 'FILE_WRITE', config: { filename: 'Notes.txt', content: '\n- {{quick_note}}', append: true } },
            { type: 'NOTIFICATION', config: { type: 'toast', message: '✅ Not kaydedildi.' } }
        ],
        [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3 }
        ]
    ),

    // 6. Park & Remember
    buildWorkflow(
        "Park Yeri Kaydet",
        "Arabanızı nereye park ettiğinizi asla unutmayın.",
        "🅿️",
        "#10B981",
        [
            { type: 'MANUAL_TRIGGER', label: 'Park Ettim' },
            { type: 'LOCATION_GET', config: { variableName: 'park_loc', accuracy: 'high' } },
            { type: 'FILE_WRITE', config: { filename: 'parking.json', content: '{"lat": {{park_loc.latitude}}, "lng": {{park_loc.longitude}}, "time": "{{park_loc.timestamp}}"}' } },
            { type: 'NOTIFICATION', config: { type: 'push', title: 'Park Edildi', message: '📍 Konum kaydedildi.' } }
        ],
        [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3 }
        ]
    ),

    // 7. Find My Car
    buildWorkflow(
        "Arabamı Bul",
        "Park ettiğiniz konumu gösterir.",
        "🧭",
        "#10B981",
        [
            { type: 'MANUAL_TRIGGER', label: 'Arabam Nerede?' },
            { type: 'FILE_READ', config: { filename: 'parking.json', variableName: 'saved_park' } },
            { type: 'NOTIFICATION', config: { type: 'toast', message: 'Konum bulundu, harita açılıyor...' } },
            // In a real app we'd parse JSON, for now we assume we display or share it
            { type: 'SHARE_SHEET', config: { content: 'Aracımın Konumu: {{saved_park}}' } }
        ],
        [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3 }
        ]
    ),

    // 8. Reading Mode
    buildWorkflow(
        "Okuma Zamanı",
        "Gözlerinizi yormadan okuma yapın.",
        "📖",
        "#8B5CF6",
        [
            { type: 'MANUAL_TRIGGER', label: 'Okuma Başlat' },
            { type: 'DND_CONTROL', config: { enabled: true } },
            { type: 'BRIGHTNESS_CONTROL', config: { level: 35 } },
            { type: 'SCREEN_WAKE', config: { keepAwake: true, duration: 1800000 }, label: '30dk Açık Tut' },
            { type: 'MEDIA_CONTROL', config: { action: 'play_pause' }, label: 'Müzik (Opsiyonel)' } // Toggle music if playing
        ],
        [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3 },
            { from: 3, to: 4 }
        ]
    ),

    // 9. Social Detox
    buildWorkflow(
        "Sosyal Medya Detoksu",
        "30 dakika boyunca bildirimlerden uzak durun.",
        "🧘",
        "#059669",
        [
            { type: 'MANUAL_TRIGGER', label: 'Detoks Başla' },
            { type: 'DND_CONTROL', config: { enabled: true } },
            { type: 'NOTIFICATION', config: { type: 'toast', message: '🧘 30dk Detoks başladı' } },
            { type: 'DELAY', config: { duration: 30, unit: 'min' } },
            { type: 'DND_CONTROL', config: { enabled: false } },
            { type: 'NOTIFICATION', config: { type: 'push', title: 'Detoks Bitti', message: 'Tebrikler! 🎉' } }
        ],
        [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3 },
            { from: 3, to: 4 },
            { from: 4, to: 5 }
        ]
    ),

    // 10. SOS Panic
    buildWorkflow(
        "PANİK BUTONU",
        "Acil durumlarda tek tuşla yardım çağırın ve dikkat çekin.",
        "🚨",
        "#FF0000",
        [
            { type: 'MANUAL_TRIGGER', label: 'PANİK' },
            { type: 'LOCATION_GET', config: { variableName: 'sos_loc', accuracy: 'high' } },
            { type: 'BRIGHTNESS_CONTROL', config: { level: 100 } },
            { type: 'FLASHLIGHT_CONTROL', config: { mode: 'on' } },
            { type: 'SMS_SEND', config: { phoneNumber: '112', message: 'YARDIM EDİN! Konumum: {{sos_loc.latitude}}, {{sos_loc.longitude}}' } },
            { type: 'SPEAK_TEXT', config: { text: 'YARDIM EDİN! ACİL DURUM!' } }
        ],
        [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3 },
            { from: 3, to: 4 },
            { from: 4, to: 5 }
        ]
    )
];
