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

const VOLUME_RESTORE_SCOPE_MS = 24 * 60 * 60 * 1000; // 24h safety cap
type VolumeRestoreTimer = ReturnType<typeof setTimeout>;
const volumeRestoreTimers = new Map<string, { token: number; timerId: VolumeRestoreTimer }>();
let volumeRestoreToken = 0;

function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function toRestoreMs(minutes?: number): number {
    const numeric = Number(minutes || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    return Math.round(numeric * 60 * 1000);
}

function getVolumeRestoreKey(variableManager: VariableManager, streamType: string): string {
    const workflowId = String(variableManager.get('_workflowId') || 'global');
    return `${workflowId}:volume:${streamType || 'media'}`;
}

function cancelVolumeRestore(key: string): void {
    const existing = volumeRestoreTimers.get(key);
    if (!existing) return;
    clearTimeout(existing.timerId);
    volumeRestoreTimers.delete(key);
}

function scheduleVolumeRestore(
    key: string,
    delayMs: number,
    task: () => Promise<void>
): void {
    cancelVolumeRestore(key);
    const safeDelay = Math.max(0, Math.min(delayMs, VOLUME_RESTORE_SCOPE_MS));
    const token = ++volumeRestoreToken;
    const timerId = setTimeout(async () => {
        const active = volumeRestoreTimers.get(key);
        if (!active || active.token !== token) return;
        volumeRestoreTimers.delete(key);
        try {
            await task();
        } catch (e) {
            console.error(`[VOLUME_CONTROL] Restore failed for ${key}:`, e);
        }
    }, safeDelay);
    volumeRestoreTimers.set(key, { token, timerId });
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
            error: 'Ses kontrolu sadece Android\'de destekleniyor',
        };
    }

    // Check for native module availability
    if (!BreviSettings || !BreviSettings.setVolume) {
        return {
            success: false,
            error: 'Ses kontrolu icin "brevi-settings" native modul gerekli (Development build kullanin)',
        };
    }

    try {
        const streamType = config.type || 'media';
        const requestedLevel = clampPercent(config.level);
        const restoreAfterMs = toRestoreMs(config.restoreAfterMinutes);
        const shouldReadCurrent =
            !!BreviSettings?.getVolume &&
            (
                config.saveCurrentLevel === true ||
                (config.skipIfAlreadySet !== false) ||
                restoreAfterMs > 0
            );

        let previousLevel: number | null = null;
        if (shouldReadCurrent) {
            try {
                previousLevel = clampPercent(await BreviSettings.getVolume(streamType));
            } catch (e) {
                console.warn('[VOLUME_CONTROL] Failed to read current volume:', e);
            }
        }

        if (config.saveCurrentLevel && config.savedLevelVariable && previousLevel != null) {
            variableManager.set(config.savedLevelVariable, previousLevel);
        }

        let appliedLevel = requestedLevel;
        if (streamType === 'call' && BreviSettings?.maximizeCallVolume) {
            appliedLevel = 100;
            if ((config.skipIfAlreadySet !== false) && previousLevel != null && previousLevel >= 99) {
                return {
                    success: true,
                    level: previousLevel,
                    type: streamType,
                    skipped: true,
                    reason: 'already_max_call_volume',
                };
            }
            await BreviSettings.maximizeCallVolume();
        } else {
            if ((config.skipIfAlreadySet !== false) && previousLevel != null && Math.abs(previousLevel - requestedLevel) <= 1) {
                return {
                    success: true,
                    level: previousLevel,
                    type: streamType,
                    skipped: true,
                    reason: 'already_in_requested_range',
                };
            }
            await BreviSettings.setVolume(requestedLevel, streamType);
        }

        // Also enable speakerphone if level is high and stream is call
        if (appliedLevel >= 80 && BreviSettings?.setSpeakerphone && streamType === 'call') {
            await BreviSettings.setSpeakerphone(true);
        }

        const restoreKey = getVolumeRestoreKey(variableManager, streamType);
        if (restoreAfterMs > 0 && (config.restoreToPrevious !== false) && previousLevel != null && Math.abs(previousLevel - appliedLevel) > 1) {
            scheduleVolumeRestore(restoreKey, restoreAfterMs, async () => {
                if (!BreviSettings?.setVolume) return;
                await BreviSettings.setVolume(clampPercent(previousLevel as number), streamType);
                console.log('[VOLUME_CONTROL] Restored previous volume after temporary routine window');
            });
        } else {
            cancelVolumeRestore(restoreKey);
        }

        return {
            success: true,
            level: appliedLevel,
            type: streamType,
            previousLevel,
            temporary: restoreAfterMs > 0,
        };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Ses ayarlanirken hata olustu'
        };
    }
}
export async function executeSpeakText(
    config: SpeakTextConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        // DEBUG: Check placeholder resolution (supports nested paths like {{obj.prop}})
        const exactPlaceholderMatch = (config.text || '').match(/^\s*\{\{([^}]+)\}\}\s*$/);
        const rawVarName = exactPlaceholderMatch?.[1]?.trim() || '';
        if (rawVarName) {
            const resolvedPreview = variableManager.resolveValue(`{{${rawVarName}}}`);
            if (resolvedPreview !== undefined) {
                console.log(`[SPEAK_TEXT] DeÄŸiÅŸken '${rawVarName}' bulundu. Tipi:`, typeof resolvedPreview);
            } else {
                console.log(`[SPEAK_TEXT] DeÄŸiÅŸken '${rawVarName}' BULUNAMADI. Mevcut anahtarlar:`, Object.keys(variableManager.getAll()));
            }
        }

        // AUTO-SPEAKERPHONE: If triggered by a call, enable speakerphone + max volume
        const triggerType = variableManager.get('_triggerType');
        if (triggerType === 'call' && BreviSettings) {
            try {
                if (BreviSettings.maximizeCallVolume) {
                    await BreviSettings.maximizeCallVolume();
                    console.log('[SPEAK_TEXT] Arama modu: HoparlÃ¶r aÃ§Ä±ldÄ± + ses maximize edildi');
                } else if (BreviSettings.setSpeakerphone) {
                    await BreviSettings.setSpeakerphone(true);
                    await BreviSettings.setVolume(100, 'media');
                    await BreviSettings.setVolume(100, 'call');
                    console.log('[SPEAK_TEXT] Arama modu: HoparlÃ¶r aÃ§Ä±ldÄ±');
                }
            } catch (spkErr) {
                console.warn('[SPEAK_TEXT] HoparlÃ¶r aÃ§Ä±lamadÄ±:', spkErr);
            }
        }

        let text = variableManager.resolveString(config.text);

        // DEBUG: JSON Handling
        if (text && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
            try {
                const parsed = JSON.parse(text);
                console.log('[SPEAK_TEXT] JSON iÃ§eriÄŸi algÄ±landÄ±. Okunabilir metne dÃ¶nÃ¼ÅŸtÃ¼rÃ¼lÃ¼yor.');

                if (Array.isArray(parsed)) {
                    text = `Liste ÅŸunlarÄ± iÃ§eriyor: ${parsed.map(item => typeof item === 'object' ? Object.values(item).join(' ') : item).join(', ')}`;
                } else if (typeof parsed === 'object') {
                    // Smart conversion: Only read meaningful keys (skip huge raw data)
                    const keys = Object.keys(parsed);

                    // Specific handling for Court Info (common use case)
                    if (keys.includes('mahkemeAdi') || keys.includes('mahkeme_adi')) {
                        const mahkeme = parsed.mahkemeAdi || parsed.mahkeme_adi;
                        const dosya = parsed.dosyaNo || parsed.dosya_no;
                        const tarih = parsed.durusmaTarihi || parsed.durusma_tarihi;
                        const saat = parsed.durusmaSaati || parsed.durusma_saati;
                        text = `Mahkeme Bilgileri ÅÃ¶yle: ${mahkeme}, Dosya NumarasÄ±: ${dosya}. DuruÅŸma Tarihi: ${tarih}, Saat: ${saat}`;
                    } else {
                        // Generic Fallback: Read up to 5 keys
                        text = keys.slice(0, 5).map(k => `${k}: ${parsed[k]}`).join('. ');
                    }
                }
            } catch (e) {
                // Not valid JSON, ignore
                console.log('[SPEAK_TEXT] JSON ayrÄ±ÅŸtÄ±rma baÅŸarÄ±sÄ±z, ham metin olarak okunuyor.');
            }
        }

        if (!text || text.includes('{{')) {
            console.warn('[SPEAK_TEXT] UyarÄ±: DeÄŸiÅŸken Ã§Ã¶zÃ¼mÃ¼ baÅŸarÄ±sÄ±z olmuÅŸ olabilir. SonuÃ§:', text);
        }

        if (!text) {
            return { success: false, error: 'Okunacak metin boÅŸ' };
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
                console.warn('[SPEAK_TEXT] Cihazda hiÃ§ ses paketi bulunamadÄ±!');
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
                console.log('[SPEAK_TEXT] Dil kodu ile bulunamadÄ±, isimlerde "Turkish/Turk" aranÄ±yor...');
                targetVoice = voices.find(v =>
                    v.name.toLowerCase().includes('turkish') ||
                    v.name.toLowerCase().includes('tÃ¼rk') ||
                    v.identifier.toLowerCase().includes('tr_') ||
                    v.identifier.toLowerCase().includes('tur')
                );
            }

            if (targetVoice) {
                voiceId = targetVoice.identifier;
                finalLang = targetVoice.language; // Update lang to match the actual voice
                console.log(`[SPEAK_TEXT] Ses Bulundu: ${targetVoice.name} (${targetVoice.language}) - ID: ${voiceId}`);
            } else {
                console.warn(`[SPEAK_TEXT] DIKKAT: '${requestedLang}' iÃ§in uygun ses bulunamadÄ±.`);

                // Critical Error for Turkish users instead of silent fail
                if (requestedLang.startsWith('tr')) {
                    return {
                        success: false,
                        error: 'Cihazda TÃ¼rkÃ§e Ses Paketi (TTS) bulunamadÄ±. LÃ¼tfen "Ayarlar > EriÅŸilebilirlik > Metin Okuma (TTS)" menÃ¼sÃ¼nden TÃ¼rkÃ§e dilini indirin/seÃ§in.'
                    };
                }
            }

        } catch (e) {
            console.warn('[SPEAK_TEXT] Ses listesi alÄ±namadÄ±:', e);
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
            error: error instanceof Error ? error.message : 'Metin okunamadÄ±',
        };
    }
}


// Global variable to keep track of the active recording
let activeRecording: Audio.Recording | null = null;

export async function executeAudioRecord(
    config: AudioRecordConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        // Platform check
        if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
            return {
                success: false,
                error: 'Ses kaydÄ± sadece Android ve iOS\'ta destekleniyor',
            };
        }

        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== 'granted') {
            return {
                success: false,
                error: 'Mikrofon izni verilmedi',
            };
        }

        // Clean up any existing active recording to prevent the
        // "Only one Recording object can be prepared at a given time" error
        if (activeRecording) {
            try {
                const status = await activeRecording.getStatusAsync();
                if (status.isRecording) {
                    await activeRecording.stopAndUnloadAsync();
                } else {
                    // Try to unload anyway if it's in a dangling state
                    await activeRecording.stopAndUnloadAsync();
                }
            } catch (cleanupError) {
                console.warn('[AUDIO_RECORD] Mevcut kayÄ±t temizlenirken hata oluÅŸtu:', cleanupError);
            } finally {
                activeRecording = null;
            }
        }

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        const recording = new Audio.Recording();
        activeRecording = recording;

        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();

        // Wait for duration
        const duration = (config.duration || 5) * 1000;
        await new Promise(resolve => setTimeout(resolve, duration));

        // Wait is over, stop recording
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        // Clean global ref if it's still this one
        if (activeRecording === recording) {
            activeRecording = null;
        }

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
        if (activeRecording) {
            try {
                await activeRecording.stopAndUnloadAsync();
            } catch (e) { }
            activeRecording = null;
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Ses kaydÄ± baÅŸlatÄ±lamadÄ±',
        };
    }
}

