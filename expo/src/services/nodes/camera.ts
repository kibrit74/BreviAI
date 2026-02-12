/**
 * Camera Node Executor
 * Takes photo using device camera and optionally extracts text using Gemini Vision OCR
 */

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { WorkflowNode, CameraCaptureConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { userSettingsService } from '../UserSettingsService';

export async function executeCameraCapture(
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<any> {
    const config = (node.config || {}) as CameraCaptureConfig;

    if (!config.variableName) {
        throw new Error('Değişken adı (variableName) zorunludur');
    }

    try {
        // Request camera permission
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            return {
                success: false,
                error: 'Kamera izni verilmedi'
            };
        }

        // Determine quality
        const qualityMap: Record<string, number> = {
            'low': 0.3,
            'medium': 0.7,
            'high': 1.0
        };
        const quality = qualityMap[config.quality || 'medium'] || 0.7;

        // Launch camera
        console.log('[CAMERA_CAPTURE] Opening camera...');
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            allowsEditing: false,
            quality: quality,
            cameraType: config.cameraType === 'front' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
            base64: config.enableOcr ? true : false, // Get base64 if OCR is needed
        });

        if (result.canceled) {
            return {
                success: true,
                cancelled: true
            };
        }

        const asset = result.assets[0];
        const imageUri = asset.uri;

        // Save image URI to variable
        variableManager.set(config.variableName, imageUri);
        console.log('[CAMERA_CAPTURE] Photo taken:', imageUri);

        let ocrText = '';

        // OCR with Gemini Vision if enabled
        if (config.enableOcr) {
            console.log('[CAMERA_CAPTURE] OCR enabled, sending to Gemini Vision...');
            try {
                const apiKey = userSettingsService.getSettings().geminiApiKey;
                if (!apiKey) {
                    console.warn('[CAMERA_CAPTURE] No Gemini API key found, skipping OCR');
                } else {
                    // Get base64 from result or read from file
                    let base64Data = asset.base64;
                    if (!base64Data) {
                        base64Data = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
                    }

                    // Determine mime type
                    const mimeType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

                    // Call Gemini Vision API
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

                    const body = {
                        contents: [{
                            role: 'user',
                            parts: [
                                { text: 'Bu fotoğraftaki tüm metni oku ve aynen yaz. Sadece metni döndür, başka bir şey yazma.' },
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: base64Data
                                    }
                                }
                            ]
                        }]
                    };

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });

                    const data = await response.json();

                    if (response.ok) {
                        const textPart = data.candidates?.[0]?.content?.parts?.[0];
                        if (textPart?.text) {
                            ocrText = textPart.text;
                            console.log('[CAMERA_CAPTURE] OCR result length:', ocrText.length);

                            // Save OCR text to variable
                            if (config.textVariableName) {
                                variableManager.set(config.textVariableName, ocrText);
                            }
                        }
                    } else {
                        console.error('[CAMERA_CAPTURE] Gemini OCR error:', data.error?.message);
                    }
                }
            } catch (ocrError) {
                console.error('[CAMERA_CAPTURE] OCR failed:', ocrError);
            }
        }

        return {
            success: true,
            cancelled: false,
            uri: imageUri,  // For AGENT_AI attachment detection
            imageUri,       // Legacy compatibility
            ocrText: ocrText || undefined,
            width: asset.width,
            height: asset.height,
            mimeType: imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
        };

    } catch (error) {
        console.error('[CAMERA_CAPTURE] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Fotoğraf çekilemedi'
        };
    }
}
