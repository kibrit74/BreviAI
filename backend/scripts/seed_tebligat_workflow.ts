
import { ShortcutTemplate } from '../src/data/types';
import * as fs from 'fs';
import * as path from 'path';

// User specific configuration
const SPREADSHEET_ID = '1DaEVAG1W3E60Oyr_2JTZkitlhg9WeZR8eHEN91TqbFo';
const SHEET_RANGE = 'Tebligatlar!A:J'; // Expanded range for new fields

const tebligatWorkflow: ShortcutTemplate = {
    id: 'workflow_tebligat_v2',
    title: 'Evrak Tarayıcı & Takip',
    title_en: 'Document Scanner & Tracker',
    description: 'Tebligat fotoğrafını tarar, duruşma gününü ve cevap süresini takvime işler, Drive\'a yedekler.',
    description_en: 'Scans document, extracts hearing date, adds to calendar and uploads to Drive.',
    category: 'Productivity',
    author: 'BreviAI',
    downloads: '1k+',
    tags: ['ocr', 'law', 'tebligat', 'durusma'],
    template_json: {
        name: "Evrak Tarayıcı",
        description: "Tebligat fotoğrafını AI ile okur, süre hesaplar, takvime ekler ve Google Drive'a yükler",
        nodes: [
            {
                "id": "1",
                "type": "MANUAL_TRIGGER",
                "label": "Başlat",
                "config": {},
                "position": { "x": 200, "y": 50 }
            },
            {
                "id": "2",
                "type": "FILE_PICK",
                "label": "Evrak Fotoğrafı Seç",
                "config": {
                    "multiple": false,
                    "allowedTypes": ["image"],
                    "variableName": "evrak_foto"
                },
                "position": { "x": 200, "y": 130 }
            },
            {
                "id": "3",
                "type": "AGENT_AI",
                "label": "Evrak Kontrol & Analiz",
                "config": {
                    "model": "gemini-2.0-flash-exp",
                    "prompt": "Bu görsel bir resmi evrak/tebligat mı? Eğer evetse, OCR yaparak metni oku ve şu bilgileri çıkar:\n\n{\n  \"is_document\": true/false,\n  \"mahkeme\": \"mahkeme adı\",\n  \"esas_no\": \"dosya numarası\",\n  \"durusma_tarihi\": \"YYYY-MM-DD (eğer varsa, yoksa null)\",\n  \"durusma_saati\": \"HH:MM (eğer varsa, yoksa null)\",\n  \"teblig_tarihi\": \"YYYY-MM-DD\",\n  \"cevap_suresi_gun\": sayı,\n  \"dava_turu\": \"kısa açıklama\",\n  \"taraflar\": \"davacı ve davalı isimleri\",\n  \"son_gun\": \"YYYY-MM-DD (tebliğ tarihi + cevap süresi, hafta sonu ve resmi tatiller hariç)\"\n}\n\nSadece JSON döndür.",
                    "provider": "gemini",
                    "attachments": "evrak_foto",
                    "variableName": "evrak_bilgi"
                },
                "position": { "x": 200, "y": 210 }
            },
            {
                "id": "4",
                "type": "IF_ELSE",
                "label": "Evrak mı?",
                "config": {
                    "left": "{{evrak_bilgi.is_document}}",
                    "right": "true",
                    "operator": "=="
                },
                "position": { "x": 200, "y": 310 }
            },
            {
                "id": "5",
                "type": "NOTIFICATION",
                "label": "Bilgilendirme",
                "config": {
                    "type": "push",
                    "title": "📄 Evrak Analiz Edildi",
                    "message": "Mahkeme: {{evrak_bilgi.mahkeme}}\nEsas: {{evrak_bilgi.esas_no}}\nDuruşma: {{evrak_bilgi.durusma_tarihi}} {{evrak_bilgi.durusma_saati}}"
                },
                "position": { "x": 300, "y": 410 }
            },
            {
                "id": "6",
                "type": "CALENDAR_CREATE",
                "label": "Duruşmayı Takvime Ekle",
                "config": {
                    "notes": "Dosya: {{evrak_bilgi.esas_no}}\nMahkeme: {{evrak_bilgi.mahkeme}}\nTaraflar: {{evrak_bilgi.taraflar}}\nDrive Linki: {{drive_link.webViewLink}}",
                    "title": "⚖️ DURUŞMA - {{evrak_bilgi.esas_no}}",
                    "startDate": "{{evrak_bilgi.durusma_tarihi}}T{{evrak_bilgi.durusma_saati}}:00"
                },
                "position": { "x": 300, "y": 510 }
            },
            {
                "id": "7",
                "type": "DRIVE_UPLOAD",
                "label": "Drive'a Yükle",
                "config": {
                    "fileName": "{{evrak_bilgi.esas_no}}_{{evrak_bilgi.teblig_tarihi}}.jpg",
                    "filePath": "{{evrak_foto}}",
                    "variableName": "drive_link"
                },
                "position": { "x": 300, "y": 610 }
            },
            {
                "id": "8",
                "type": "SHEETS_WRITE",
                "label": "Tabloya Kaydet",
                "config": {
                    "spreadsheetId": SPREADSHEET_ID,
                    "range": SHEET_RANGE,
                    "append": true,
                    "values": "[[\"{{evrak_bilgi.teblig_tarihi}}\",\"{{evrak_bilgi.mahkeme}}\",\"{{evrak_bilgi.esas_no}}\",\"{{evrak_bilgi.dava_turu}}\",\"{{evrak_bilgi.taraflar}}\",\"{{evrak_bilgi.cevap_suresi_gun}}\",\"{{evrak_bilgi.son_gun}}\",\"{{evrak_bilgi.durusma_tarihi}}\",\"{{evrak_bilgi.durusma_saati}}\",\"{{drive_link.webViewLink}}\"]]"
                },
                "position": { "x": 300, "y": 710 }
            },
            {
                "id": "9",
                "type": "NOTIFICATION",
                "label": "Başarılı",
                "config": {
                    "type": "push",
                    "title": "✅ İşlem Tamamlandı",
                    "message": "Duruşma: {{evrak_bilgi.durusma_tarihi}}\nDrive'a yüklendi.\nTabloya işlendi."
                },
                "position": { "x": 300, "y": 810 }
            },
            {
                "id": "10",
                "type": "NOTIFICATION",
                "label": "Evrak Değil",
                "config": {
                    "type": "push",
                    "title": "❌ Evrak Tanınamadı",
                    "message": "Yüklenen fotoğraf bir tebligat veya duruşma tutanağına benzemiyor."
                },
                "position": { "x": 100, "y": 410 }
            }
        ],
        edges: [
            { "id": "e1", "sourcePort": "default", "sourceNodeId": "1", "targetNodeId": "2" },
            { "id": "e2", "sourcePort": "default", "sourceNodeId": "2", "targetNodeId": "3" },
            { "id": "e3", "sourcePort": "default", "sourceNodeId": "3", "targetNodeId": "4" },
            { "id": "e4t", "sourcePort": "true", "sourceNodeId": "4", "targetNodeId": "5" },
            { "id": "e4f", "sourcePort": "false", "sourceNodeId": "4", "targetNodeId": "10" },
            { "id": "e5", "sourcePort": "default", "sourceNodeId": "5", "targetNodeId": "6" },
            { "id": "e6", "sourcePort": "default", "sourceNodeId": "6", "targetNodeId": "7" },
            { "id": "e7", "sourcePort": "default", "sourceNodeId": "7", "targetNodeId": "8" },
            { "id": "e8", "sourcePort": "default", "sourceNodeId": "8", "targetNodeId": "9" }
        ]
    }
};

// Function to save or output the workflow
function saveWorkflow() {
    const outputPath = path.join(__dirname, 'tebligat_workflow.json');
    fs.writeFileSync(outputPath, JSON.stringify(tebligatWorkflow, null, 2));
    console.log(`✅ Workflow JSON created at: ${outputPath}`);
    console.log('You can now import this JSON into the application or seed it to the database.');

    // Print for copy-paste convenience
    console.log('\n--- TEMPLATE JSON ---\n');
    console.log(JSON.stringify(tebligatWorkflow, null, 2));
}

saveWorkflow();
