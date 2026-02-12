/**
 * File Node Executors
 * File Write, File Read, File Pick
 * 
 * Modernized to use Expo SDK 54 Object-based File System API
 * Now supports Google Drive integration
 */

import {
    FileWriteConfig,
    FileReadConfig,
    FilePickConfig,
    ClipboardReaderConfig,
    ViewUdfConfig,
    ViewDocumentConfig,
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { File, Directory, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { googleService } from '../GoogleService';
import { interactionService } from '../InteractionService';
import { udfParser } from '../UdfParserService';

// Notes directory using object-based API
const getNotesDir = () => new Directory(Paths.document, 'brevi_notes');

// BreviAI folder ID cache for Google Drive
let breviAiFolderId: string | null = null;

export async function executeClipboardRead(
    config: ClipboardReaderConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const hasString = await Clipboard.hasStringAsync();
        if (!hasString) {
            return {
                success: false,
                error: 'Pano boş veya metin içermiyor',
            };
        }

        const text = await Clipboard.getStringAsync();
        variableManager.set(config.variableName, text);

        return {
            success: true,
            content: text,
            length: text.length,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Pano okunamadı',
        };
    }
}

async function ensureNotesDir(): Promise<Directory> {
    const notesDir = getNotesDir();
    if (!notesDir.exists) {
        notesDir.create();
    }
    return notesDir;
}

/**
 * Find or create BreviAI folder in Google Drive
 */
async function ensureBreviAIFolder(): Promise<string | null> {
    // Return cached ID if available
    if (breviAiFolderId) return breviAiFolderId;

    try {
        const authState = googleService.getAuthState();
        if (!authState.isSignedIn || !authState.accessToken) {
            console.log('[FileWrite] Not signed in to Google, attempting sign in...');
            await googleService.signIn();
        }

        const token = googleService.getAuthState().accessToken;
        if (!token) return null;

        // Search for existing BreviAI folder
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='BreviAI' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (searchResponse.ok) {
            const data = await searchResponse.json();
            if (data.files && data.files.length > 0) {
                breviAiFolderId = data.files[0].id;
                console.log('[FileWrite] Found existing BreviAI folder:', breviAiFolderId);
                return breviAiFolderId;
            }
        }

        // Create BreviAI folder if not exists
        const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'BreviAI',
                mimeType: 'application/vnd.google-apps.folder',
            }),
        });

        if (createResponse.ok) {
            const folder = await createResponse.json();
            breviAiFolderId = folder.id;
            console.log('[FileWrite] Created BreviAI folder:', breviAiFolderId);
            return breviAiFolderId;
        }

        return null;
    } catch (error) {
        console.error('[FileWrite] Error ensuring BreviAI folder:', error);
        return null;
    }
}

export async function executeFileWrite(
    config: FileWriteConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const filename = variableManager.resolveString(config.filename);
        let content = variableManager.resolveString(config.content);

        // Auto-convert to CSV string if filename is .csv and content is array/object
        if (filename.endsWith('.csv') && typeof content !== 'string') {
            try {
                const data = Array.isArray(content) ? content : [content];
                if (data.length > 0) {
                    const headers = Object.keys(data[0]).join(',');
                    const rows = data.map((row: any) => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
                    content = `${headers}\n${rows}`;
                }
            } catch (e) {
                console.warn('CSV conversion failed', e);
            }
        }

        // Auto-convert to JSON string if needed (and not CSV)
        if (typeof content !== 'string') {
            content = JSON.stringify(content, null, 2);
        }

        // Check save location
        if (config.saveLocation === 'google_drive') {
            // Google Drive Save
            console.log('[FileWrite] Saving to Google Drive:', filename);

            const folderId = await ensureBreviAIFolder();
            if (!folderId) {
                return {
                    success: false,
                    error: 'Google Drive\'a bağlanılamadı. Lütfen giriş yapın.',
                };
            }

            const token = googleService.getAuthState().accessToken;
            if (!token) {
                return {
                    success: false,
                    error: 'Google oturumu bulunamadı.',
                };
            }

            // Determine MIME type
            const ext = filename.split('.').pop()?.toLowerCase() || 'txt';
            const mimeTypes: Record<string, string> = {
                'txt': 'text/plain',
                'json': 'application/json',
                'html': 'text/html',
                'csv': 'text/csv',
                'md': 'text/markdown',
            };
            const mimeType = mimeTypes[ext] || 'text/plain';

            // Upload to Drive using Resumable Upload Protocol (Memory Efficient for Large Files)
            // Step 1: Initiate Resumable Session (POST metadata)
            const metadata = {
                name: filename,
                parents: [folderId],
                mimeType: mimeType
            };

            console.log('[FileWrite] Initiating Resumable Upload...');
            const initResponse = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(metadata),
                }
            );

            if (!initResponse.ok) {
                const error = await initResponse.text();
                throw new Error('Google Drive upload initiation failed: ' + error);
            }

            const uploadUrl = initResponse.headers.get('Location');
            if (!uploadUrl) throw new Error('Google Drive did not return upload location');

            // Step 2: Prepare Content File
            // Robust FileSystem Require Pattern
            let FileSystem: any;
            try { FileSystem = require('expo-file-system/legacy'); }
            catch (e) { FileSystem = require('expo-file-system'); }

            let uriToUpload = '';
            let tempFileCreated = false;

            // Check if content is already a valid file URI
            if (typeof content === 'string' && (content.startsWith('file://') || content.startsWith('content://'))) {
                const info = await FileSystem.getInfoAsync(content);
                if (info.exists && !info.isDirectory) {
                    console.log('[FileWrite] Content is a file URI, uploading directly:', content);
                    uriToUpload = content;
                }
            }

            // If not a file URI, write content to a temporary file
            if (!uriToUpload) {
                console.log('[FileWrite] Writing content to temp file for upload...');
                const tempUri = `${FileSystem.cacheDirectory}upload_${Date.now()}_${filename.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                await FileSystem.writeAsStringAsync(tempUri, content);
                uriToUpload = tempUri;
                tempFileCreated = true;
            }

            // Step 3: Upload Content (PUT to Location)
            console.log('[FileWrite] Uploading content to:', uriToUpload);

            // FileSystem.uploadAsync automatically streams the file
            const uploadResult = await FileSystem.uploadAsync(uploadUrl, uriToUpload, {
                httpMethod: 'PUT',
                headers: {
                    // Content-Length is set automatically by uploadAsync
                    // Content-Type might be needed if uploadAsync doesn't guess, but Drive usually trusts metadata or detects
                }
            });

            // Clean up temp file
            if (tempFileCreated) {
                try { await FileSystem.deleteAsync(uriToUpload, { idempotent: true }); } catch (e) { }
            }

            if (uploadResult.status >= 200 && uploadResult.status < 300) {
                const fileData = JSON.parse(uploadResult.body);
                console.log('[FileWrite] File uploaded to Drive:', fileData.id);
                return {
                    success: true,
                    filename,
                    fileId: fileData.id,
                    webViewLink: fileData.webViewLink,
                    location: 'google_drive',
                };
            } else {
                console.error('[FileWrite] Drive upload error:', uploadResult.body);
                return {
                    success: false,
                    error: 'Google Drive content upload failed: ' + uploadResult.body,
                };
            }
        }

        // Default: Local Save
        const notesDir = await ensureNotesDir();
        const file = new File(notesDir, filename);

        // Check if a directory exists with the same name
        if (file.exists) {
            // Use legacy API to check if it's a directory
            let FileSystem;
            try { FileSystem = require('expo-file-system/legacy'); }
            catch (e) { FileSystem = require('expo-file-system'); }

            try {
                const info = await FileSystem.getInfoAsync(file.uri);
                if (info.exists && info.isDirectory) {
                    return {
                        success: false,
                        error: `Bu isimde bir KLASÖR mevcut: ${filename}. Dosya oluşturulamaz.`,
                    };
                }
            } catch (e) {
                console.warn('[FILE_WRITE] Directory check failed:', e);
            }
        }

        if (file.exists) {
            if (config.append) {
                console.log('[FILE_WRITE] Appending to existing file:', filename);
                const existingContent = await file.text();
                file.write(existingContent + '\n' + content);
            } else {
                console.log('[FILE_WRITE] Overwriting existing file:', filename);
                file.write(content);
            }
        } else {
            console.log('[FILE_WRITE] Creating new file:', filename);
            file.write(content);
        }

        return {
            success: true,
            filename,
            path: file.uri,
            location: 'local',
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Dosyaya yazılamadı',
        };
    }
}

export async function executeFileRead(
    config: FileReadConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const notesDir = await ensureNotesDir();
        // Agent often sends 'filePath' instead of 'filename', so we handle both
        const filename = variableManager.resolveString(config.filename || (config as any).filePath);

        let uriToRead = '';

        // Check if filename is actually an absolute URI (e.g. from FILE_PICK)
        // OR standard path starting with /
        if (filename.startsWith('file://') || filename.startsWith('content://') || filename.startsWith('/')) {
            console.log('[FILE_READ] Using absolute path directly:', filename);
            uriToRead = filename;
        } else {
            // Relative path in notes dir
            const f = new File(notesDir, filename);
            uriToRead = f.uri;
        }

        // Verify existence using primitive check
        // Fix for Deprecated getInfoAsync: Use legacy API if available
        let FileSystem;
        try { FileSystem = require('expo-file-system/legacy'); }
        catch (e) { FileSystem = require('expo-file-system'); }

        const info = await FileSystem.getInfoAsync(uriToRead);

        if (!info.exists) {
            console.warn('[FILE_READ] File does not exist:', uriToRead);
            variableManager.set(config.variableName, '');
            return {
                success: false,
                error: 'Dosya bulunamadı: ' + filename,
                filename,
            };
        }

        let content = '';

        // SPECIAL HANDLING FOR UDF (UYAP) FILES
        if (filename.toLowerCase().endsWith('.udf')) {
            console.log('[FILE_READ] Detected UDF file, parsing with UdfParserService...', uriToRead);
            try {
                // Use the centralized parser service which handles XML parsing and text extraction correctly
                const result = await udfParser.parseUdfFile(uriToRead);
                content = result.text;

                if (content && content.length > 0) {
                    console.log('[FILE_READ] Successfully parsed UDF. Text Length:', content.length);
                } else {
                    console.warn('[FILE_READ] UDF parsed but returned empty text.');
                }
            } catch (udfErr) {
                console.warn('[FILE_READ] UDF parsing failed:', udfErr);
                // Fallback to plain text read (likely garbage if binary, but good for debug)
                content = await FileSystem.readAsStringAsync(uriToRead);
            }
        } else {
            content = await FileSystem.readAsStringAsync(uriToRead);
        }

        let parsedContent: any = content;

        if (filename.endsWith('.json')) {
            try { parsedContent = JSON.parse(content); } catch (e) { }
        } else if (filename.endsWith('.csv')) {
            try {
                const lines = content.split('\n').filter(l => l.trim());
                if (lines.length > 0) {
                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                    parsedContent = lines.slice(1).map(line => {
                        const values = line.split(',');
                        const obj: any = {};
                        headers.forEach((h, i) => obj[h] = (values[i] || '').trim().replace(/"/g, ''));
                        return obj;
                    });
                }
            } catch (e) { console.warn('CSV parse error', e); }
        }

        variableManager.set(config.variableName, parsedContent);

        return {
            success: true,
            content,
            filename,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Dosya okunamadı',
        };
    }
}

export async function executeFilePick(
    config: FilePickConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        console.log('[FILE_PICK] Starting file picker with config:', config);

        // Build type filter based on config
        const typeFilters: string[] = [];
        const allowedTypes = config.allowedTypes || ['all'];

        if (allowedTypes.includes('all')) {
            typeFilters.push('*/*');
        } else {
            // Backward compatibility for 'type' field
            if (allowedTypes.length === 0 && (config as any).type) {
                const legacyType = (config as any).type;
                if (legacyType === 'image') allowedTypes.push('image');
                else if (legacyType === 'pdf') allowedTypes.push('pdf');
            }

            if (allowedTypes.includes('image')) {
                typeFilters.push('image/*');
            }
            if (allowedTypes.includes('pdf')) {
                typeFilters.push('application/pdf');
            }
            if (allowedTypes.includes('document')) {
                typeFilters.push('application/pdf');
                typeFilters.push('application/msword');
                typeFilters.push('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                typeFilters.push('text/plain');
            }
        }

        const result = await DocumentPicker.getDocumentAsync({
            type: typeFilters.length > 0 ? typeFilters : ['*/*'],
            multiple: config.multiple || false,
            copyToCacheDirectory: true,
        });

        console.log('[FILE_PICK] Result:', result);

        if (result.canceled) {
            return {
                success: true,
                cancelled: true,
            };
        }

        // Store picked files info in variable
        const files = result.assets.map(asset => ({
            uri: asset.uri,
            name: asset.name,
            size: asset.size,
            mimeType: asset.mimeType,
        }));

        const value = config.multiple ? files : files[0];
        variableManager.set(config.variableName, value);

        return {
            success: true,
            cancelled: false,
            files,
            count: files.length,
        };
    } catch (error) {
        console.error('[FILE_PICK] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Dosya seçilemedi',
        };
    }
}

export async function executeViewUdf(
    config: ViewUdfConfig,
    variableManager: VariableManager
): Promise<any> {
    let fileSource = variableManager.resolveString(config.fileSource);
    const logSource = typeof fileSource === 'string' && fileSource.length > 200 ? fileSource.substring(0, 50) + '... (truncated)' : fileSource;
    console.log('[VIEW_UDF] Displaying UDF:', logSource);

    // AUTO-DETECT INPUT: 
    // If no config, OR if resolution failed (still has {{...}}), try previous_output
    const isUnresolved = typeof fileSource === 'string' && fileSource.startsWith('{{');

    if (!fileSource || isUnresolved) {
        if (isUnresolved) console.warn('[VIEW_UDF] Variable resolution failed for:', fileSource, '- attempting fallback to previous_output');
        else console.log('[VIEW_UDF] No fileSource config, checking previous_output...');

        const prev = variableManager.get('previous_output');
        if (prev) {
            if (typeof prev === 'string') {
                fileSource = prev;
            } else if (typeof prev === 'object') {
                // Handle FilePicker result structure: { files: [{ uri: ... }] }
                if (prev.files && Array.isArray(prev.files) && prev.files.length > 0) {
                    fileSource = prev.files[0].uri;
                } else if (prev.uri) {
                    fileSource = prev.uri;
                } else if (prev.content) {
                    if (prev.path) fileSource = prev.path;
                }
            }
        }
    }

    const logFinalSource = typeof fileSource === 'string' && fileSource.length > 200 ? fileSource.substring(0, 50) + '... (truncated)' : fileSource;
    console.log('[VIEW_UDF] Final Source:', logFinalSource);

    if (!fileSource || (typeof fileSource === 'string' && fileSource.startsWith('{{'))) {
        return {
            success: false,
            error: 'Dosya kaynağı belirtilmedi veya değişken çözülemedi: ' + config.fileSource,
        };
    }

    // Handle object input (like from FILE_PICK direct variable)
    let uri = fileSource;
    if (typeof fileSource === 'object' && (fileSource as any).uri) {
        uri = (fileSource as any).uri;
    } else if (typeof fileSource === 'string' && fileSource.startsWith('{')) {
        try {
            const parsed = JSON.parse(fileSource);
            if (parsed.uri) uri = parsed.uri;
            else if (parsed.files && parsed.files[0]) uri = parsed.files[0].uri;
        } catch (e) { }
    }

    // Unified PDF Handling
    // We ensure the content is saved as a physical file so it can be opened by external apps (Android) or WebView (iOS).

    if (!fileSource || typeof fileSource !== 'string' || !fileSource.toLowerCase().endsWith('.udf')) {
        console.log('[VIEW_UDF] Warning: Source might not be a UDF file', fileSource);
    }

    // For UDF, we just show it.
    await interactionService.showUdf('UDF Görüntüleyici', uri);

    // Initial simple Extraction for fallback or preview
    let extractedText = '';
    try {
        if (uri.toLowerCase().endsWith('.udf')) {
            console.log('[VIEW_UDF] Parsing content with UdfParserService...');
            const result = await udfParser.parseUdfFile(uri);
            extractedText = result.text;
            console.log('[VIEW_UDF] Extracted text length:', extractedText.length);
        }
    } catch (e) {
        console.warn('[VIEW_UDF] Failed to extract text for AI:', e);
    }

    return {
        success: true,
        fileSource,
        uri,
        content: extractedText // Return content so Agent can read it!
    };
}


export async function executeViewDocument(
    config: ViewDocumentConfig,
    variableManager: VariableManager
): Promise<any> {
    let fileSource = variableManager.resolveString(config.fileSource);
    const logSource = typeof fileSource === 'string' && fileSource.length > 200 ? fileSource.substring(0, 50) + '... (truncated)' : fileSource;
    console.log('[VIEW_DOCUMENT] Displaying Document:', logSource);

    // AUTO-DETECT INPUT: 
    const isUnresolved = typeof fileSource === 'string' && fileSource.startsWith('{{');

    if (!fileSource || isUnresolved) {
        if (isUnresolved) console.warn('[VIEW_DOCUMENT] Variable resolution failed for:', fileSource, '- attempting fallback to previous_output');
        else console.log('[VIEW_DOCUMENT] No fileSource config, checking previous_output...');

        const prev = variableManager.get('previous_output');
        if (prev) {
            if (typeof prev === 'string') {
                fileSource = prev;
            } else if (typeof prev === 'object') {
                if (prev.files && Array.isArray(prev.files) && prev.files.length > 0) {
                    fileSource = prev.files[0].uri;
                } else if (prev.uri) {
                    fileSource = prev.uri;
                } else if (prev.content) {
                    if (prev.path) fileSource = prev.path;
                }
            }
        }
    }

    // Handle object input
    let uri = typeof fileSource === 'string' ? fileSource : '';
    if (typeof fileSource === 'object' && (fileSource as any).uri) {
        uri = (fileSource as any).uri;
    }

    let finalPdfUri = uri;

    // Save Data URI / Raw PDF to file if needed
    if (typeof fileSource === 'string' && (fileSource.startsWith('data:application/pdf;base64,') || fileSource.startsWith('%PDF-'))) {
        try {
            // Robust FileSystem Require Pattern
            let FileSystem: any;
            try { FileSystem = require('expo-file-system/legacy'); }
            catch (e) { FileSystem = require('expo-file-system'); }

            let base64Data = '';
            if (fileSource.startsWith('data:application/pdf;base64,')) {
                base64Data = fileSource.split(',')[1];
            } else {
                const toBase64 = (str: string) => {
                    const binary = str.split('').map(c => String.fromCharCode(c.charCodeAt(0) & 0xff)).join('');
                    return btoa(binary);
                };
                base64Data = toBase64(fileSource);
            }

            const tempUri = `${FileSystem.cacheDirectory}temp_doc_${Date.now()}.pdf`;
            await FileSystem.writeAsStringAsync(tempUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64
            });
            finalPdfUri = tempUri;
            uri = tempUri;
        } catch (e) {
            console.error('[VIEW_DOCUMENT] Failed to save binary PDF:', e);
        }
    }

    // Determine type
    const lowerUri = uri.toLowerCase();

    try {
        if (lowerUri.endsWith('.pdf')) {
            console.log('[VIEW_DOCUMENT] Showing PDF:', finalPdfUri);
            await interactionService.showPdf('Belge Görüntüleyici', finalPdfUri);
        } else if (lowerUri.endsWith('.txt') || lowerUri.endsWith('.md') || lowerUri.endsWith('.json') || lowerUri.endsWith('.xml') || lowerUri.endsWith('.js') || lowerUri.endsWith('.ts')) {
            console.log('[VIEW_DOCUMENT] Reading text file to show...');

            // Robust FileSystem Require Pattern
            let FileSystem: any;
            try { FileSystem = require('expo-file-system/legacy'); }
            catch (e) { FileSystem = require('expo-file-system'); }

            const content = await FileSystem.readAsStringAsync(uri);
            await interactionService.showText('Belge İçeriği', content);
        } else {
            // Fallback for Word/Excel/Etc -> Try generic UDF viewer or External
            // For now, let's try opening as generic document via showUdf logic which might handle it or just fail gracefully?
            // Better: Use Expo Sharing for unknown types if we can't view them inline
            console.log('[VIEW_DOCUMENT] Unknown type, trying generic viewer or sharing:', uri);

            // If it's a docx, user wants to view it. 
            // Currently we don't have a DOCX viewer component. 
            // We will try showPdf as it *might* work on iOS for some docs, or fail.
            // But valid approach requested is "View". 
            // Let's fallback to Sharing API if not PDF/Text

            /* 
               const Sharing = require('expo-sharing');
               if (await Sharing.isAvailableAsync()) {
                   await Sharing.shareAsync(uri);
               } 
            */
            // User specific request: "Word text belgeleri" -> Maybe they mean just text? 
            // If it is docx, we can't easily extract text without a library.
            // For now, let's just attempt to show it using the generic viewer hook (which uses WebView). 
            // WebView on iOS supports DOCX. Android does NOT (needs google docs wrapper).

            await interactionService.showUdf('Belge Görüntüleyici', uri);
        }

        return {
            success: true,
            fileSource,
            uri
        };
    } catch (error) {
        console.error('[VIEW_DOCUMENT] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Belge görüntülenemedi',
        };
    }
}
