import {
    WorkflowNode,
    VolumeControlConfig,
    SpeakTextConfig,
    AudioRecordConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av'; // Use expo-av for service-level recording
import { Platform } from 'react-native';

// Safe import for native module
let BreviSettings: any = null;
try {
    const { NativeModules } = require('react-native');
    BreviSettings = NativeModules.BreviHelperModule || require('brevi-settings');
} catch (e) {
    console.log('BreviSettings not available for volume control');
}

export async function executeVolumeControl(
    config: VolumeControlConfig,
    variableManager: VariableManager
): Promise<any> {
    // Note: Volume control requires native implementation
    // expo-av only controls media playback volume, not system volume
    // For full volume control, we would need a native module

    if (Platform.OS !== 'android') {
        return {
            success: false,
            error: 'Ses kontrolü sadece Android\'de destekleniyor',
        };
    }

    // Check for native module availability
    if (!BreviSettings || !BreviSettings.setVolume) {
        return {
            success: false,
            error: 'Ses kontrolü için "brevi-settings" native modülü gerekli (Development build kullanın)',
        };
    }

    try {
        // Special handling for 'call' type - enable speakerphone + max volume
        if (config.type === 'call' && BreviSettings?.maximizeCallVolume) {
            await BreviSettings.maximizeCallVolume();
            return {
                success: true,
                level: 100,
                type: 'call',
                speakerphone: true,
            };
        }

        await BreviSettings.setVolume(config.level, config.type || 'media');

        // Also enable speakerphone if level is high and we might be in a call
        if (config.level >= 80 && BreviSettings?.setSpeakerphone) {
            await BreviSettings.setSpeakerphone(true);
        }

        return {
            success: true,
            level: config.level,
            type: config.type,
        };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Ses ayarlanırken hata oluştu'
        };
    }
}

export async function executeSpeakText(
    config: SpeakTextConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        // DEBUG: Check if variable exists
        const rawVarName = config.text ? config.text.replace(/\{\{|\}\}/g, '') : '';
        if (rawVarName && variableManager.has(rawVarName)) {
            console.log(`[SPEAK_TEXT] Değişken '${rawVarName}' bulundu. Tipi:`, typeof variableManager.get(rawVarName));
        } else {
            console.log(`[SPEAK_TEXT] Değişken '${rawVarName}' BULUNAMADI. Mevcut anahtarlar:`, Object.keys(variableManager.getAll()));
        }

        // AUTO-SPEAKERPHONE: If triggered by a call, enable speakerphone + max volume
        const triggerType = variableManager.get('_triggerType');
        if (triggerType === 'call' && BreviSettings) {
            try {
                if (BreviSettings.maximizeCallVolume) {
                    await BreviSettings.maximizeCallVolume();
                    console.log('[SPEAK_TEXT] Arama modu: Hoparlör açıldı + ses maximize edildi');
                } else if (BreviSettings.setSpeakerphone) {
                    await BreviSettings.setSpeakerphone(true);
                    await BreviSettings.setVolume(100, 'media');
                    await BreviSettings.setVolume(100, 'call');
                    console.log('[SPEAK_TEXT] Arama modu: Hoparlör açıldı');
                }
            } catch (spkErr) {
                console.warn('[SPEAK_TEXT] Hoparlör açılamadı:', spkErr);
            }
        }

        let text = variableManager.resolveString(config.text);

        // DEBUG: JSON Handling
        if (text && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
            try {
                const parsed = JSON.parse(text);
                console.log('[SPEAK_TEXT] JSON içeriği algılandı. Okunabilir metne dönüştürülüyor.');

                if (Array.isArray(parsed)) {
                    text = `Liste şunları içeriyor: ${parsed.map(item => typeof item === 'object' ? Object.values(item).join(' ') : item).join(', ')}`;
                } else if (typeof parsed === 'object') {
                    // Smart conversion: Only read meaningful keys (skip huge raw data)
                    const keys = Object.keys(parsed);

                    // Specific handling for Court Info (common use case)
                    if (keys.includes('mahkemeAdi') || keys.includes('mahkeme_adi')) {
                        const mahkeme = parsed.mahkemeAdi || parsed.mahkeme_adi;
                        const dosya = parsed.dosyaNo || parsed.dosya_no;
                        const tarih = parsed.durusmaTarihi || parsed.durusma_tarihi;
                        const saat = parsed.durusmaSaati || parsed.durusma_saati;
                        text = `Mahkeme Bilgileri Şöyle: ${mahkeme}, Dosya Numarası: ${dosya}. Duruşma Tarihi: ${tarih}, Saat: ${saat}`;
                    } else {
                        // Generic Fallback: Read up to 5 keys
                        text = keys.slice(0, 5).map(k => `${k}: ${parsed[k]}`).join('. ');
                    }
                }
            } catch (e) {
                // Not valid JSON, ignore
                console.log('[SPEAK_TEXT] JSON ayrıştırma başarısız, ham metin olarak okunuyor.');
            }
        }

        if (!text || text.includes('{{')) {
            console.warn('[SPEAK_TEXT] Uyarı: Değişken çözümü başarısız olmuş olabilir. Sonuç:', text);
        }

        if (!text) {
            return { success: false, error: 'Okunacak metin boş' };
        }

        // Get saved TTS settings as defaults
        const { userSettingsService } = await import('../UserSettingsService');
        const savedTTS = userSettingsService.getTTSSettings();

        // Node config overrides saved settings if provided
        const requestedLang = config.language || savedTTS.language || 'tr-TR';

        let voiceId: string | undefined;
        let finalLang = requestedLang;

        try {
            const voices = await Speech.getAvailableVoicesAsync();

            // Log available voices for debugging (Samsung specific debugging)
            if (voices.length > 0) {
                const voiceList = voices.map(v => `${v.name} (${v.language})`).join(', ');
                console.log('[SPEAK_TEXT] Cihazdaki Mevcut Sesler:', voiceList.substring(0, 200) + '...');
            } else {
                console.warn('[SPEAK_TEXT] Cihazda hiç ses paketi bulunamadı!');
            }

            // ROBUST VOICE SELECTION STRATEGY
            // 1. Exact Match (e.g. 'tr-TR')
            let targetVoice = voices.find(v => v.language === requestedLang);

            // 2. Loose Match (e.g. 'tr_TR' vs 'tr-TR')
            if (!targetVoice) {
                targetVoice = voices.find(v => v.language.replace('_', '-') === requestedLang.replace('_', '-'));
            }

            // 3. Short Code Match (e.g. 'tr' match for 'tr-TR')
            if (!targetVoice) {
                const shortLang = requestedLang.split('-')[0];
                targetVoice = voices.find(v => v.language.startsWith(shortLang));
            }

            // 4. Name/Identifier Match (Samsung devices sometimes use names like "Turkish Female")
            if (!targetVoice && requestedLang.startsWith('tr')) {
                console.log('[SPEAK_TEXT] Dil kodu ile bulunamadı, isimlerde "Turkish/Turk" aranıyor...');
                targetVoice = voices.find(v =>
                    v.name.toLowerCase().includes('turkish') ||
                    v.name.toLowerCase().includes('türk') ||
                    v.identifier.toLowerCase().includes('tr_') ||
                    v.identifier.toLowerCase().includes('tur')
                );
            }

            if (targetVoice) {
                voiceId = targetVoice.identifier;
                finalLang = targetVoice.language; // Update lang to match the actual voice
                console.log(`[SPEAK_TEXT] Ses Bulundu: ${targetVoice.name} (${targetVoice.language}) - ID: ${voiceId}`);
            } else {
                console.warn(`[SPEAK_TEXT] DIKKAT: '${requestedLang}' için uygun ses bulunamadı.`);

                // Critical Error for Turkish users instead of silent fail
                if (requestedLang.startsWith('tr')) {
                    return {
                        success: false,
                        error: 'Cihazda Türkçe Ses Paketi (TTS) bulunamadı. Lütfen "Ayarlar > Erişilebilirlik > Metin Okuma (TTS)" menüsünden Türkçe dilini indirin/seçin.'
                    };
                }
            }

        } catch (e) {
            console.warn('[SPEAK_TEXT] Ses listesi alınamadı:', e);
        }

        const options: Speech.SpeechOptions = {
            language: finalLang,
            voice: voiceId, // Explicitly set voice ID
            pitch: config.pitch || savedTTS.pitch || 1.0,
            rate: config.rate || savedTTS.rate || 1.0,
        };

        console.log('[SPEAK_TEXT] Okunuyor:', text.substring(0, 50) + '...', 'Dil (Lang):', options.language, 'Ses (Voice):', options.voice);
        await Speech.speak(text, options);

        return {
            success: true,
            text,
            language: options.language,
            rate: options.rate,
            pitch: options.pitch,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Metin okunamadı',
        };
    }
}


export async function executeAudioRecord(
    config: AudioRecordConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== 'granted') {
            return {
                success: false,
                error: 'Mikrofon izni verilmedi',
            };
        }

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();

        // Wait for duration
        const duration = (config.duration || 5) * 1000;
        await new Promise(resolve => setTimeout(resolve, duration));

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        if (!uri) {
            return { success: false, error: 'Ses kaydedilemedi (URI yok)' };
        }

        variableManager.set(config.variableName, uri);

        return {
            success: true,
            uri,
            duration: config.duration,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Ses kaydı başlatılamadı',
        };
    }
}
