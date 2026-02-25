/**
 * find_call_recording.ts
 * 
 * Smart Call Recording Finder Node
 * 
 * Scans known OEM call recording folders and third-party recorder folders
 * (e.g., Cube ACR) for the most recent call recording file.
 * If found, stores the file URI in the specified variable.
 * 
 * This approach bypasses Android 10+ call recording restrictions by
 * leveraging recordings made by system-level or privileged apps.
 */

import { VariableManager } from '../VariableManager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let FileSystem: any;
try { FileSystem = require('expo-file-system/legacy'); }
catch (e) { FileSystem = require('expo-file-system'); }

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export interface FindCallRecordingConfig {
    variableName: string;       // Variable to store the found file URI
    customPath?: string;        // User-defined custom folder path
    maxAgeSeconds?: number;     // Max file age in seconds (default: 120)
}

// Known OEM and third-party call recording folder paths
const KNOWN_RECORDING_PATHS = [
    // Cube ACR (most popular third-party recorder)
    '/storage/emulated/0/CubeCallRecorder/All/',
    '/storage/emulated/0/CubeCallRecorder/',
    // Samsung
    '/storage/emulated/0/Recordings/Call/',
    '/storage/emulated/0/Call/',
    '/storage/emulated/0/Record/Call/',
    // Google Pixel
    '/storage/emulated/0/CallRecordings/',
    // Xiaomi / MIUI
    '/storage/emulated/0/MIUI/sound_recorder/call_rec/',
    // OnePlus
    '/storage/emulated/0/Record/PhoneRecord/',
    // Huawei
    '/storage/emulated/0/Sounds/CallRecord/',
    // ACR (another popular recorder)
    '/storage/emulated/0/ACRCalls/',
    '/storage/emulated/0/ACR/',
    // Generic fallback
    '/storage/emulated/0/Recordings/',
    '/storage/emulated/0/Download/',
];

// Audio file extensions to look for
const AUDIO_EXTENSIONS = ['.m4a', '.amr', '.3gp', '.ogg', '.wav', '.mp3', '.aac', '.opus'];

export async function executeFindCallRecording(
    config: FindCallRecordingConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        if (Platform.OS !== 'android') {
            return {
                success: false,
                error: 'Arama kaydı tarayıcı şu an sadece Android\'de destekleniyor.',
            };
        }

        const maxAge = (config.maxAgeSeconds || 120) * 1000; // Convert to ms
        const now = Date.now();

        // Build the list of paths to scan
        const pathsToScan = [...KNOWN_RECORDING_PATHS];
        if (config.customPath) {
            // Add user-defined path at the beginning (highest priority)
            let customPath = variableManager.resolveString(config.customPath);
            if (!customPath.endsWith('/')) customPath += '/';
            pathsToScan.unshift(customPath);
        }

        let bestFile: { uri: string; modTime: number; name: string; folder: string } | null = null;

        for (const folderPath of pathsToScan) {
            try {
                // Check if directory exists
                const dirInfo = await FileSystem.getInfoAsync('file://' + folderPath);
                if (!dirInfo.exists || !dirInfo.isDirectory) continue;

                // Read directory contents
                const files = await FileSystem.readDirectoryAsync('file://' + folderPath);
                if (!files || files.length === 0) continue;

                // Filter audio files and find the most recent one
                for (const fileName of files) {
                    // Check extension
                    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
                    if (!AUDIO_EXTENSIONS.includes(ext)) continue;

                    // Get file info
                    const fileUri = 'file://' + folderPath + fileName;
                    const fileInfo = await FileSystem.getInfoAsync(fileUri);

                    if (!fileInfo.exists || fileInfo.isDirectory) continue;

                    const modTime = fileInfo.modificationTime ? fileInfo.modificationTime * 1000 : 0;
                    const age = now - modTime;

                    // Check if file is recent enough
                    if (age > maxAge) continue;

                    // Pick the most recent file
                    if (!bestFile || modTime > bestFile.modTime) {
                        bestFile = {
                            uri: fileUri,
                            modTime: modTime,
                            name: fileName,
                            folder: folderPath,
                        };
                    }
                }
            } catch (folderError) {
                // Folder doesn't exist or no permission, skip silently
                continue;
            }
        }

        // --- SAF (Storage Access Framework) Fallback ---
        // If no file found via direct paths (likely due to Android 11+ Scoped Storage),
        // try to use the SAF URI picked by the user, if available.
        if (!bestFile) {
            try {
                const safUri = await AsyncStorage.getItem('cube_acr_saf_uri');

                if (safUri && typeof safUri === 'string' && safUri.trim() !== '') {
                    console.log(`[FIND_CALL_RECORDING] SAF URI denenecek: ${safUri}`);
                    const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(safUri);
                    console.log(`[FIND_CALL_RECORDING] SAF klasöründe ${files ? files.length : 0} dosya bulundu`);

                    if (files && files.length > 0) {
                        // Log first 5 files for debugging
                        for (let i = 0; i < Math.min(5, files.length); i++) {
                            console.log(`[FIND_CALL_RECORDING] SAF dosya[${i}]: ${files[i]}`);
                        }

                        for (const fileUri of files) {
                            // Decode URI for extension checking (SAF URIs are URL-encoded)
                            const decodedUri = decodeURIComponent(fileUri);
                            const ext = decodedUri.substring(decodedUri.lastIndexOf('.')).toLowerCase();

                            if (!AUDIO_EXTENSIONS.includes(ext)) {
                                continue;
                            }

                            try {
                                const fileInfo = await FileSystem.getInfoAsync(fileUri);

                                if (!fileInfo.exists || fileInfo.isDirectory) continue;

                                // Try to get modificationTime from filesystem
                                let modTime = (fileInfo as any).modificationTime ? (fileInfo as any).modificationTime * 1000 : 0;

                                // If modificationTime is unavailable, parse date from filename
                                // Cube ACR format: phone_YYYYMMDD-HHMMSS_number.amr
                                if (!modTime) {
                                    const dateMatch = decodedUri.match(/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
                                    if (dateMatch) {
                                        const [, year, month, day, hour, min, sec] = dateMatch;
                                        modTime = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).getTime();
                                        console.log(`[FIND_CALL_RECORDING] Dosya adından tarih çıkarıldı: ${year}-${month}-${day} ${hour}:${min}:${sec} -> ${modTime}`);
                                    }
                                }

                                // Apply age check if we have a valid time
                                if (modTime > 0) {
                                    const age = now - modTime;
                                    if (age > maxAge) continue;
                                }

                                const fileSize = (fileInfo as any).size || 0;
                                const fileName = decodeURIComponent(fileUri.split('%2F').pop() || fileUri.split('/').pop() || 'kayit.m4a');
                                console.log(`[FIND_CALL_RECORDING] Aday dosya: ${fileName}, modTime=${modTime}, size=${fileSize}`);

                                // Pick the most recent file; if same time, prefer larger file
                                if (!bestFile || modTime > bestFile.modTime || (modTime === bestFile.modTime && fileSize > (bestFile as any).size)) {
                                    bestFile = {
                                        uri: fileUri,
                                        modTime: modTime,
                                        name: fileName,
                                        folder: 'SAF: Cube ACR',
                                        size: fileSize,
                                    } as any;
                                }
                            } catch (fileErr: any) {
                                console.warn(`[FIND_CALL_RECORDING] SAF dosya bilgi hatası: ${fileErr.message}`);
                            }
                        }
                    } else {
                        console.warn('[FIND_CALL_RECORDING] SAF klasörü boş veya okunamadı');
                    }
                } else {
                    // We need the user to pick the folder
                    return {
                        success: false,
                        error: 'Android kısıtlamaları nedeniyle klasöre erişilemiyor. Lütfen "Cube ACR Klasörünü Seç" düğmesini kullanarak yetki verin.',
                        needsSafPermission: true
                    };
                }
            } catch (safError: any) {
                console.error('[FIND_CALL_RECORDING] SAF Hatası:', safError.message || safError);
            }
        }

        if (bestFile) {
            console.log(`[FIND_CALL_RECORDING] Kayıt bulundu: ${bestFile.name} (${bestFile.folder}) - İlk Boyut: ${(bestFile as any).size}`);

            // Wait for the file to finish writing if it's currently very small (Cube ACR takes time to flush)
            let currentSize = (bestFile as any).size || 0;
            if (currentSize < 10000) { // If it's less than 10KB, it might still be writing
                console.log(`[FIND_CALL_RECORDING] Dosya boyutu küçük (${currentSize} bytes), yazmanın bitmesi bekleniyor...`);
                let stableCount = 0;
                let checks = 0;

                while (checks < 10) { // Max 10 checks (approx 10 seconds)
                    await delay(1000);
                    checks++;
                    try {
                        const latestInfo = await FileSystem.getInfoAsync(bestFile.uri);
                        const newSize = (latestInfo as any).size || 0;

                        if (newSize > currentSize) {
                            console.log(`[FIND_CALL_RECORDING] Dosya büyüyor: ${currentSize} -> ${newSize} bytes`);
                            currentSize = newSize;
                            stableCount = 0; // Reset stability counter
                        } else if (newSize === currentSize && newSize > 0) {
                            stableCount++;
                            if (stableCount >= 2) { // Size stable for 2 seconds
                                console.log(`[FIND_CALL_RECORDING] Dosya boyutu sabitlendi: ${newSize} bytes`);
                                break;
                            }
                        }
                    } catch (e) {
                        console.warn(`[FIND_CALL_RECORDING] Dosya boyutu kontrol edilemedi: ${e}`);
                    }
                }
            }

            variableManager.set(config.variableName, bestFile.uri);

            return {
                success: true,
                uri: bestFile.uri,
                fileName: bestFile.name,
                folder: bestFile.folder,
                source: bestFile.folder.startsWith('SAF') ? 'Cube ACR' : 'Unknown'
            };
        } else {
            console.warn('[FIND_CALL_RECORDING] Hiçbir klasörde güncel kayıt bulunamadı.');
            return {
                success: false,
                error: 'Arama kaydı bulunamadı. Lütfen Cube ACR gibi bir kayıt uygulaması kurun veya telefonunuzun dahili arama kaydını etkinleştirin.',
                scannedFolders: pathsToScan.length + 1 // +1 for SAF
            };
        }
    } catch (error) {
        console.error('[FIND_CALL_RECORDING] Hata:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Arama kaydı aranırken beklenmeyen bir hata oluştu.',
        };
    }
}
