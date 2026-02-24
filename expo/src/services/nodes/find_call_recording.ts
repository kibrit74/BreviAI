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

let FileSystem: any;
try { FileSystem = require('expo-file-system/legacy'); }
catch (e) { FileSystem = require('expo-file-system'); }

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

        if (bestFile) {
            console.log(`[FIND_CALL_RECORDING] Kayıt bulundu: ${bestFile.name} (${bestFile.folder})`);
            variableManager.set(config.variableName, bestFile.uri);

            return {
                success: true,
                uri: bestFile.uri,
                fileName: bestFile.name,
                folder: bestFile.folder,
                source: bestFile.folder.includes('Cube') ? 'Cube ACR' :
                    bestFile.folder.includes('ACR') ? 'ACR' :
                        bestFile.folder.includes('Samsung') || bestFile.folder.includes('Recordings/Call') ? 'Samsung' :
                            bestFile.folder.includes('CallRecordings') ? 'Google Pixel' :
                                bestFile.folder.includes('MIUI') ? 'Xiaomi' :
                                    bestFile.folder.includes('PhoneRecord') ? 'OnePlus' :
                                        'Diğer',
            };
        }

        // No recording found
        console.warn('[FIND_CALL_RECORDING] Hiçbir klasörde güncel kayıt bulunamadı.');
        return {
            success: false,
            error: 'Arama kaydı bulunamadı. Lütfen Cube ACR gibi bir kayıt uygulaması kurun veya telefonunuzun dahili arama kaydını etkinleştirin.',
            scannedFolders: pathsToScan.length,
        };
    } catch (error) {
        console.error('[FIND_CALL_RECORDING] Hata:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Arama kaydı aranırken beklenmeyen bir hata oluştu.',
        };
    }
}
