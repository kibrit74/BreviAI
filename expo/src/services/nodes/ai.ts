/**
 * AI Node Executors
 * Speech to Text (Native + File-based via Gemini)
 * 
 * Supports two modes:
 * 1. Microphone mode: Opens the microphone for live speech recognition
 * 2. File mode: When audioUri is provided, reads the audio file and
 *    sends it to Gemini API for transcription
 */

import { VariableManager } from '../VariableManager';
import { userSettingsService } from '../UserSettingsService';

let FileSystem: any;
try { FileSystem = require('expo-file-system/legacy'); }
catch (e) { FileSystem = require('expo-file-system'); }

// Simple config interface
interface SpeechToTextConfig {
    variableName?: string;
    language?: string;
    audioUri?: string;      // Audio file URI (from FIND_CALL_RECORDING)
    continuous?: boolean;
}

import { interactionService } from '../InteractionService';

export async function executeSpeechToText(
    config: SpeechToTextConfig,
    variableManager: VariableManager
): Promise<any> {

    // --- Mode 1: File-based transcription via Gemini ---
    const audioUri = config.audioUri
        ? variableManager.resolveString(config.audioUri)
        : null;

    if (audioUri && audioUri.trim() !== '') {
        console.log(`[SPEECH_TO_TEXT] Dosya modu: ${audioUri}`);
        try {
            // Read audio file as base64
            const base64Audio = await FileSystem.readAsStringAsync(audioUri, { encoding: 'base64' });

            if (!base64Audio || base64Audio.length === 0) {
                return { success: false, error: 'Ses dosyası okunamadı veya boş.' };
            }

            console.log(`[SPEECH_TO_TEXT] Dosya okundu, boyut: ${Math.round(base64Audio.length / 1024)} KB`);

            // Determine MIME type from URI
            const decodedUri = decodeURIComponent(audioUri);
            const ext = decodedUri.substring(decodedUri.lastIndexOf('.')).toLowerCase();
            const mimeMap: Record<string, string> = {
                '.m4a': 'audio/mp4',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.amr': 'audio/amr',
                '.3gp': 'audio/3gpp',
                '.aac': 'audio/aac',
                '.opus': 'audio/opus',
            };
            const mimeType = mimeMap[ext] || 'audio/mp4';

            // Get Gemini API key
            const settings = await userSettingsService.getSettings();
            const apiKey = settings.geminiApiKey;
            if (!apiKey) {
                return { success: false, error: 'Gemini API anahtarı bulunamadı. Lütfen Ayarlar\'dan ekleyin.' };
            }

            const lang = config.language || 'tr';

            // Call Gemini API with audio
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: mimeType,
                                        data: base64Audio,
                                    }
                                },
                                {
                                    text: `Bu ses dosyasını ${lang === 'tr' ? 'Türkçe' : lang} olarak tamamen metne dök. Sadece konuşmanın tam transkriptini yaz, başka hiçbir yorum veya açıklama ekleme. Konuşmacıları belirtebilirsen belirt (Kişi 1, Kişi 2 gibi).`
                                }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 8192,
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[SPEECH_TO_TEXT] Gemini API Hatası: ${response.status}`, errorText);
                return { success: false, error: `Gemini API hatası: ${response.status}` };
            }

            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Check if Gemini just echoed back our prompt (happens when audio is silent/empty)
            // It might add "Kişi 1: " or newlines, so we check a core normalized substring
            const normalizedText = text.replace(/[\s\n\r]/g, '').toLowerCase();
            const corePrompt = 'busesdosyasınıtürkçeolaraktamamenmetnedöksadecekonuşmanıntamtranskriptiniyaz';

            if (normalizedText.includes(corePrompt) || text.length < 10) {
                return { success: false, error: 'Ses dosyası boş veya anlaşılamadı (kayıt programı sesi alamamış olabilir).' };
            }

            if (text) {
                console.log(`[SPEECH_TO_TEXT] Transkripsiyon başarılı (${text.length} karakter)`);
                if (config.variableName) {
                    variableManager.set(config.variableName, text);
                }
                return {
                    success: true,
                    text: text,
                    content: text,
                    value: text,
                    source: 'gemini_file'
                };
            }

            return { success: false, error: 'Gemini API boş yanıt döndü.' };
        } catch (fileErr: any) {
            console.error('[SPEECH_TO_TEXT] Dosya transkripsiyon hatası:', fileErr.message || fileErr);
            return { success: false, error: 'Dosya transkripsiyon hatası: ' + (fileErr.message || fileErr) };
        }
    }

    // --- Mode 2: Microphone-based speech recognition ---
    const text = await interactionService.requestSpeech(
        "Dinliyorum...",
        config.language || 'tr-TR'
    );

    if (text) {
        if (config.variableName) {
            variableManager.set(config.variableName, text);
        }
        return {
            success: true,
            text: text,
            content: text,
            value: text
        };
    }

    return {
        success: false,
        error: 'Ses girişi iptal edildi.',
    };
}

