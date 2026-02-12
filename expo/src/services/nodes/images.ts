import { Image } from 'react-native';
import { WorkflowNode, ImageGeneratorConfig, ImageEditConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { userSettingsService } from '../UserSettingsService';

// ... (existing code for executeImageGenerator remains unchanged)

export async function executeImageGenerator(
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<any> {
    const config = node.config as ImageGeneratorConfig;
    const prompt = variableManager.resolveString(config.prompt);

    if (config.provider === 'gemini' || config.provider === 'nanobana') {
        // Gemini (Imagen) Implementation
        const apiKey = config.apiKey || userSettingsService.getSettings().geminiApiKey;

        if (!apiKey) {
            return {
                success: false,
                error: 'Gemini API anahtarı bulunamadı. Lütfen ayarlardan veya node ayarlarından ekleyin.'
            };
        }

        const model = config.model || 'gemini-2.5-flash-image';
        // Note: User mentioned 'gemini-2.5-flash-image' but standard public beta often uses 2.0-flash or pro for these features.
        // We will use the config model if set, else compatible fallback.

        try {
            let contentParts: any[] = [{ text: prompt }];

            if (config.inputImage) {
                try {
                    const inputUri = variableManager.resolveString(config.inputImage);
                    if (inputUri) {
                        const base64 = await FileSystem.readAsStringAsync(inputUri, { encoding: 'base64' });
                        // Determine mime type roughly
                        const isPng = inputUri.endsWith('.png');
                        const mimeType = isPng ? 'image/png' : 'image/jpeg';

                        contentParts.push({
                            inline_data: {
                                mime_type: mimeType,
                                data: base64
                            }
                        });
                    }
                } catch (e) {
                    console.warn('[ImageGenerator] Input image resolve error:', e);
                }
            }

            // Gemini 1.5/2.0 REST API Structure
            // Endpoint: :generateContent
            // Config: response_modalities: ["IMAGE", "TEXT"]
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const body = {
                contents: [{
                    role: 'user',
                    parts: contentParts
                }],
                generationConfig: {
                    response_modalities: ["IMAGE", "TEXT"],
                    speech_config: undefined,
                }
            };

            console.log('[ImageGenerator] Sending request to:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Gemini Image Gen Error:', JSON.stringify(data, null, 2));
                throw new Error(data.error?.message || 'Gemini resim üretimi başarısız oldu.');
            }

            // Parse Response for Inline Image Data
            // Structure: candidates[0].content.parts[0].inline_data
            const candidate = data.candidates?.[0];
            const part = candidate?.content?.parts?.[0];

            if (!part?.inline_data && !part?.inlineData) {
                console.warn('[ImageGenerator] Unexpected response format:', JSON.stringify(data, null, 2));
                // Fallback: Check if it returned text (refusal or description)
                if (part?.text) {
                    throw new Error(`Gemini resim üretmedi, mesaj döndü: ${part.text}`);
                }
                throw new Error('Gemini resim verisi döndürmedi.');
            }

            const base64Image = part.inline_data?.data || part.inlineData?.data;

            // Save to cache
            const filename = `gen_gemini_${Date.now()}.png`; // Usually returns PNG or JPEG depending on request, saving as PNG is safe enough or check mime
            const localPath = `${FileSystem.documentDirectory}${filename}`;

            await FileSystem.writeAsStringAsync(localPath, base64Image, {
                encoding: 'base64'
            });

            // Save to variable
            if (config.variableName) {
                variableManager.set(config.variableName, localPath);
            }

            return {
                success: true,
                provider: 'gemini',
                model,
                prompt,
                imageUrl: localPath
            };

        } catch (error: any) {
            console.error('[ImageGenerator] Fatal Error:', error);
            return {
                success: false,
                error: error.message || 'Gemini resim üretimi hatası'
            };
        }

    } else {
        // Pollinations AI (Free, No Key, Fast)
        let imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

        // Optional params
        const width = config.width || 1024;
        const height = config.height || 1024;
        imageUrl += `?width=${width}&height=${height}&nologo=true`;

        // For Instagram/social media posting, return the direct URL
        // For local use (display in app), download to cache
        const shouldDownload = (config as any).downloadLocally !== undefined
            ? (config as any).downloadLocally
            : false; // Default: don't download (return URL for Instagram API)

        if (shouldDownload) {
            // Download to cache
            const filename = `gen_${Date.now()}.jpg`;
            // @ts-ignore
            const localPath = `${FileSystem.cacheDirectory}${filename}`;

            try {
                const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);

                // Save to variable
                if (config.variableName) {
                    variableManager.set(config.variableName, downloadResult.uri);
                }

                return {
                    success: true,
                    provider: 'pollinations',
                    prompt,
                    imageUrl: downloadResult.uri,
                    publicUrl: imageUrl // Also include the original URL
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Image generation failed'
                };
            }
        } else {
            // Return direct URL (for Instagram API, webhooks, etc.)
            if (config.variableName) {
                variableManager.set(config.variableName, imageUrl);
            }

            return {
                success: true,
                provider: 'pollinations',
                prompt,
                imageUrl: imageUrl
            };
        }
    }
}

export async function executeImageEdit(
    config: ImageEditConfig,
    variableManager: VariableManager
): Promise<any> {
    // ---------------------------------------------------------
    // ADAPTER: Handle Agent Tool Arguments
    // ---------------------------------------------------------
    if ((config as any).imageUri && !config.inputImage) {
        config.inputImage = (config as any).imageUri;
    }

    if ((config as any).operations && !config.actions) {
        try {
            const ops = typeof (config as any).operations === 'string'
                ? JSON.parse((config as any).operations)
                : (config as any).operations;
            config.actions = Array.isArray(ops) ? ops : [];
        } catch (e) {
            console.warn('[IMAGE_EDIT] Failed to parse operations JSON:', e);
            config.actions = [];
        }
    }

    // Default actions if undefined
    if (!config.actions) config.actions = [];

    // ---------------------------------------------------------
    // RESOLVE INPUT URI
    // ---------------------------------------------------------
    let inputUri = '';

    // Resolve variable if inputImage is set
    if (config.inputImage) {
        inputUri = variableManager.resolveString(config.inputImage);

        // Handle attachment objects from TEXT_INPUT node
        if (inputUri && inputUri.startsWith('{') && inputUri.includes('attachments')) {
            try {
                const parsed = JSON.parse(inputUri);
                if (parsed.attachments && parsed.attachments.length > 0) {
                    inputUri = parsed.attachments[0].uri;
                }
            } catch (e) {
                // Not valid JSON, use as-is
            }
        }

        // Also check if the variable itself is an object (not stringified)
        // Clean up brackets for safe variable lookup
        const cleanVarName = config.inputImage.replace(/\{\{|\}\}/g, '').trim();
        const rawValue = variableManager.get(cleanVarName);

        if (rawValue && typeof rawValue === 'object') {
            if ((rawValue as any).attachments && (rawValue as any).attachments.length > 0) {
                inputUri = (rawValue as any).attachments[0].uri;
            } else if ((rawValue as any).uri) {
                inputUri = (rawValue as any).uri;
            }
        }
    }

    if (!inputUri) {
        return { success: false, error: 'Input image URI is required' };
    }

    try {
        const actions: ImageManipulator.Action[] = [];

        // Pre-process actions to handle logic like 'center_crop'
        // Pre-process actions to handle logic like 'center_crop' or direct passthrough
        for (const action of config.actions) {
            // 1. Node Config Format (Typed)
            if (action.type === 'resize') {
                actions.push({ resize: { width: action.width, height: action.height } });
            }
            else if (action.type === 'crop' && action.width && action.height) {
                actions.push({
                    crop: {
                        originX: action.originX || 0,
                        originY: action.originY || 0,
                        width: action.width,
                        height: action.height
                    }
                });
            }
            else if (action.type === 'center_crop' && action.width && action.height) {
                // Determine image size first
                const size: { width: number, height: number } = await new Promise((resolve, reject) => {
                    Image.getSize(inputUri, (width, height) => resolve({ width, height }), (err) => reject(err));
                });

                // Calculate centered crop
                const targetW = action.width;
                const targetH = action.height;

                // Ensure crop doesn't exceed image
                const cropW = Math.min(targetW, size.width);
                const cropH = Math.min(targetH, size.height);

                const originX = Math.round((size.width - cropW) / 2);
                const originY = Math.round((size.height - cropH) / 2);

                actions.push({
                    crop: {
                        originX: Math.max(0, originX),
                        originY: Math.max(0, originY),
                        width: cropW,
                        height: cropH
                    }
                });
            }
            else if (action.type === 'rotate' && action.angle) {
                actions.push({ rotate: action.angle });
            }
            else if (action.type === 'flip') {
                actions.push({ flip: action.vertical ? ImageManipulator.FlipType.Vertical : ImageManipulator.FlipType.Horizontal });
            }

            // 2. Direct ImageManipulator Format (from Agent)
            // e.g. { resize: { width: 100 } } or { flip: "Vertical" }
            else if ((action as any).resize) actions.push({ resize: (action as any).resize });
            else if ((action as any).rotate !== undefined) actions.push({ rotate: (action as any).rotate });
            else if ((action as any).flip !== undefined) actions.push({ flip: (action as any).flip });
            else if ((action as any).crop) actions.push({ crop: (action as any).crop });

            // 3. Filters (Not supported by basic ImageManipulator but prevent crash)
            else if ((action as any).filter) {
                console.warn('[IMAGE_EDIT] Filter not natively supported:', (action as any).filter);
            }
        }

        const manipResult = await ImageManipulator.manipulateAsync(
            inputUri,
            actions,
            {
                compress: config.quality !== undefined ? parseFloat(String(config.quality)) : 0.9,
                format: config.saveFormat === 'png' ? ImageManipulator.SaveFormat.PNG : ImageManipulator.SaveFormat.JPEG
            }
        );

        if (config.variableName) {
            variableManager.set(config.variableName, manipResult.uri);
        }

        return {
            success: true,
            originalUri: inputUri,
            editedUri: manipResult.uri,
            width: manipResult.width,
            height: manipResult.height
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Image manipulation failed'
        };
    }
}
