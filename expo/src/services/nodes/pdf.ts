/**
 * PDF Node Executor
 * Creates PDF from HTML, Images, or Text using expo-print
 */

import { PdfCreateConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import * as Print from 'expo-print';
import { Platform } from 'react-native';

export async function executePdfCreate(
    config: PdfCreateConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const inputData = variableManager.get(config.items);
        let htmlContent = '';

        if (!inputData) {
            return { success: false, error: 'PDF içeriği boş (Değişken bulunamadı)' };
        }

        // --- Logic: Determine input type and convert to HTML ---

        if (Array.isArray(inputData)) {
            // Case 1: Array of Strings (Images or Text)
            if (inputData.length > 0) {
                const firstItem = String(inputData[0]);
                const isImage = firstItem.startsWith('file://') || firstItem.startsWith('http') || firstItem.startsWith('data:image');

                if (isImage) {
                    // Array of Images -> Create gallery layout
                    htmlContent = `
                        <html>
                        <head>
                            <style>
                                body { font-family: sans-serif; padding: 20px; }
                                .image-container { margin-bottom: 20px; text-align: center; }
                                img { max-width: 100%; max-height: 800px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                            </style>
                        </head>
                        <body>
                            <h1 style="text-align: center;">${config.filename || 'PDF Dosyası'}</h1>
                            ${inputData.map((uri: string) => `
                                <div class="image-container">
                                    <img src="${uri}" />
                                </div>
                            `).join('')}
                        </body>
                        </html>
                    `;
                } else {
                    // Array of Text -> List
                    htmlContent = `
                        <html>
                        <body style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
                            <h1>${config.filename || 'Liste'}</h1>
                            <ul>
                                ${inputData.map((text: string) => `<li>${text}</li>`).join('')}
                            </ul>
                        </body>
                        </html>
                    `;
                }
            }
        } else if (typeof inputData === 'string') {
            // Case 2: Direct String
            const trimmed = inputData.trim();
            if (trimmed.startsWith('<html') || trimmed.startsWith('<!DOCTYPE html')) {
                // Already HTML
                htmlContent = inputData;
            } else {
                // Plain Text -> Wrap in HTML
                htmlContent = `
                    <html>
                    <body style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
                        <pre style="white-space: pre-wrap;">${inputData}</pre>
                    </body>
                    </html>
                `;
            }
        } else if (typeof inputData === 'object') {
            // Case 3: JSON Object -> Pretty Print
            htmlContent = `
                <html>
                <body style="font-family: monospace; padding: 20px;">
                    <pre>${JSON.stringify(inputData, null, 2)}</pre>
                </body>
                </html>
            `;
        }

        // --- Execute Print ---

        try {
            const { uri } = await Print.printToFileAsync({
                html: htmlContent,
                base64: false
            });

            // Store result URI
            variableManager.set(config.variableName, uri);

            console.log('[PDF_CREATE] PDF created successfully at:', uri);

            return {
                success: true,
                uri,
                pages: -1 // expo-print doesn't return page count easily, dummy value
            };

        } catch (printError) {
            console.error('Expo Print Error:', printError);
            return {
                success: false,
                error: printError instanceof Error ? printError.message : 'PDF oluşturma motoru hatası'
            };
        }

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'PDF oluşturulamadı',
        };
    }
}
