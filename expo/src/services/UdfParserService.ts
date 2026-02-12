
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

// Fix for Deprecated Expo FileSystem Methods
let FileSystem: any;
try {
    FileSystem = require('expo-file-system/legacy');
} catch (e) {
    FileSystem = require('expo-file-system');
}

interface UdfContent {
    text: string;
    metadata?: any;
}

export class UdfParserService {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
    }

    /**
     * Parses a UDF file from a local or remote URI
     * @param fileUri File URI (file://... or http://...)
     */
    async parseUdfFile(fileUri: string): Promise<UdfContent> {
        try {
            let localUri = fileUri;

            // Handle remote files
            if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
                localUri = await this.downloadRemoteFile(fileUri);
            }

            // Read file as base64
            const base64Data = await FileSystem.readAsStringAsync(localUri, {
                encoding: 'base64'
            });

            // Load zip
            const zip = await JSZip.loadAsync(base64Data, { base64: true });

            // Look for content.xml
            // UDF structure typically contains a main xml file. 
            // If not literally 'content.xml', we search for the largest XML file which is usually the content
            let contentFile = zip.file('content.xml');

            if (!contentFile) {
                // Fallback: search for any .xml file
                const xmlFiles = Object.keys(zip.files).filter(name => name.endsWith('.xml'));
                // Simple heuristic: largest XML file is likely the content
                let maxSize = 0;
                for (const name of xmlFiles) {
                    const size = (zip.files[name] as any)._data?.uncompressedSize || 0;
                    if (size > maxSize) {
                        maxSize = size;
                        contentFile = zip.file(name);
                    }
                }
            }

            if (!contentFile) {
                throw new Error('No compatible XML content found in UDF file.');
            }

            const xmlContent = await contentFile.async('string');
            const parsed = this.parser.parse(xmlContent);

            // Extract text from the parsed XML
            const text = this.extractTextFromObj(parsed);

            return {
                text: text,
                metadata: parsed
            };

        } catch (error) {
            console.error('Failed to parse UDF file:', error);
            throw new Error('Failed to parse UDF file. It might be corrupted or encrypted.');
        }
    }

    private async downloadRemoteFile(remoteUri: string): Promise<string> {
        const filename = remoteUri.split('/').pop() || 'temp.udf';
        const fileDir = FileSystem.cacheDirectory + 'udf_temp/';

        // Ensure directory exists
        const dirInfo = await FileSystem.getInfoAsync(fileDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(fileDir, { intermediates: true });
        }

        const fileUri = fileDir + filename;

        const downloadRes = await FileSystem.downloadAsync(remoteUri, fileUri);
        return downloadRes.uri;
    }

    private extractTextFromObj(obj: any): string {
        if (!obj) return '';

        if (typeof obj === 'string') {
            return obj + '\n';
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.extractTextFromObj(item)).join('');
        }

        if (typeof obj === 'object') {
            let text = '';
            // UYAP Specific: Look for typical text nodes if we find any specific keys
            // But generic traversal is safer for unknown schemas

            // Prioritize 'content', 'text', 'value' keys if they exist?
            // For now, simple deep traversal
            for (const key in obj) {
                if (key.startsWith('@_')) continue; // specific to fast-xml-parser attributes
                text += this.extractTextFromObj(obj[key]);
            }
            return text;
        }

        return String(obj) + ' '; // Numbers, booleans
    }
}

export const udfParser = new UdfParserService();
