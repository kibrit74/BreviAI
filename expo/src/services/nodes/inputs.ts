/**
 * Input Node Executors
 * Text Input, Clipboard Reader
 */

import { WorkflowNode, TextInputConfig, ClipboardReaderConfig, ShowMenuConfig, ShowTextConfig, ShowImageConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { interactionService } from '../InteractionService';

export async function executeInputNode(
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<any> {
    switch (node.type) {
        case 'TEXT_INPUT':
            return executeTextInput(node.config as TextInputConfig, variableManager);
        case 'CLIPBOARD_READER':
            return executeClipboardReader(node.config as ClipboardReaderConfig, variableManager);
        case 'SHOW_MENU':
            return executeShowMenu(node.config as ShowMenuConfig, variableManager);
        case 'SHOW_TEXT':
            return executeShowText(node.config as ShowTextConfig, variableManager);
        case 'SHOW_IMAGE':
            return executeShowImage(node.config as ShowImageConfig, variableManager);
        default:
            throw new Error(`Unknown input type: ${node.type}`);
    }
}

export async function executeTextInput(
    config: TextInputConfig,
    variableManager: VariableManager
): Promise<any> {
    const prompt = variableManager.resolveString(config.prompt || 'Bir değer giriniz');
    console.log('[TEXT_INPUT] Requesting input:', prompt);

    try {
        const result = await interactionService.requestInput(prompt, config.defaultValue);

        // Fix: result might be an object (attachment), so safe check before substring
        let logContent = 'empty';
        if (result) {
            if (typeof result === 'string') {
                logContent = result.substring(0, 50) + '...';
            } else {
                logContent = 'Object (Attachment)';
            }
        }
        console.log('[TEXT_INPUT] User input received:', logContent);

        let textValue = result;
        // Verify if it's an object (attachment handling)
        if (typeof result === 'object' && result !== null) {
            // If result is object, allow it to pass through so AI node can read variables
            if ((result as any).text) {
                // If there's mixed content (text + attachments), usually we want the whole object
                // But for backwards compatibility, if it has text property, maybe extracting it?
                // No, VariableManager handles objects too. Passing the object is safer for Agent AI.
                textValue = result; // Keep the whole object
            }
        }

        if (config.variableName) {
            variableManager.set(config.variableName, result); // Always save the raw result (text or object)
        }

        return {
            success: true,
            value: result
        };

        return {
            success: true,
            value: textValue
        };
    } catch (error) {
        console.error('[TEXT_INPUT] Error:', error);
        return {
            success: false,
            error: 'Giriş alınamadı'
        };
    }
}

export async function executeClipboardReader(
    config: ClipboardReaderConfig,
    variableManager: VariableManager
): Promise<any> {
    const hasString = await Clipboard.hasStringAsync();
    if (hasString) {
        const content = await Clipboard.getStringAsync();
        console.log('[CLIPBOARD] Read content length:', content.length);

        if (config.variableName) {
            variableManager.set(config.variableName, content);
        }

        return {
            success: true,
            content
        };
    }
    return {
        success: false,
        error: 'Pano boş'
    };
}

export async function executeShowMenu(
    config: ShowMenuConfig,
    variableManager: VariableManager
): Promise<any> {
    const title = variableManager.resolveString(config.title || 'Seçim Yapın');

    // Fix: Handle cases where options comes as a string (from AI Agent mis-formatting)
    let optionsRaw: any = config.options;
    if (typeof optionsRaw === 'string') {
        // Try parsing as JSON first
        try {
            optionsRaw = JSON.parse(optionsRaw);
        } catch (e) {
            // Not JSON, assume comma separated
            optionsRaw = optionsRaw.split(',').map((s: string) => s.trim());
        }
    }

    // Fallback if still not array
    if (!Array.isArray(optionsRaw)) {
        console.warn('[SHOW_MENU] Options is not an array:', optionsRaw);
        optionsRaw = ['Seçenek 1', 'Seçenek 2'];
    }

    const options = optionsRaw.map((opt: any) => variableManager.resolveString(String(opt)));

    console.log('[SHOW_MENU] Requesting selection:', title, options);

    try {
        const selection = await interactionService.showMenu(title, options);
        console.log('[SHOW_MENU] Selected:', selection);

        if (config.variableName) {
            variableManager.set(config.variableName, selection);
        }

        return {
            success: true,
            selection
        };
    } catch (error) {
        return {
            success: false,
            error: 'Seçim yapılmadı'
        };
    }
}

export async function executeShowText(
    config: ShowTextConfig,
    variableManager: VariableManager
): Promise<any> {
    const title = variableManager.resolveString(config.title || 'Sonuç');

    // If content is empty, automatically use previous_output
    let contentToShow = config.content || '{{previous_output}}';
    const content = variableManager.resolveString(contentToShow);

    console.log('[SHOW_TEXT] Displaying:', { title, content: content?.substring(0, 100) });

    // DEBUG: Check for unresolved variables
    if (content && content.includes('{{')) {
        console.log('[SHOW_TEXT] Warning: Unresolved variables in content:', content);
        // Attempt to debug the likely culprit (e.g. hearingInfo)
        const match = content.match(/\{\{([\w\.]+)\}\}/);
        if (match) {
            const fullPath = match[1];
            const rootVar = fullPath.split('.')[0];
            const rootValue = variableManager.get(rootVar);
            console.log(`[SHOW_TEXT] Debug: Root variable '${rootVar}' value:`, JSON.stringify(rootValue));
            if (rootValue && typeof rootValue === 'object') {
                console.log(`[SHOW_TEXT] Debug: Keys in '${rootVar}':`, Object.keys(rootValue));
            }
        }
    }

    if (!content || content === '{{previous_output}}') {
        console.log('[SHOW_TEXT] Warning: No content to display');
    }

    await interactionService.showResult(title, content || 'İçerik bulunamadı');

    return {
        success: true,
        title,
        content
    };
}

export async function executeShowImage(
    config: ShowImageConfig,
    variableManager: VariableManager
): Promise<any> {
    const title = variableManager.resolveString(config.title || 'Resim');

    // Resolve the image source
    let imageUri = variableManager.resolveString(config.imageSource || '{{previous_output}}');

    // Handle object formats (from TEXT_INPUT attachments or IMAGE_EDIT output)
    if (imageUri && imageUri.startsWith('{')) {
        try {
            const parsed = JSON.parse(imageUri);
            // Check for attachments format
            if (parsed.attachments && parsed.attachments.length > 0) {
                imageUri = parsed.attachments[0].uri;
            }
            // Check for editedUri (from IMAGE_EDIT)
            else if (parsed.editedUri) {
                imageUri = parsed.editedUri;
            }
            // Check for imageUrl (from IMAGE_GENERATOR)
            else if (parsed.imageUrl) {
                imageUri = parsed.imageUrl;
            }
            // Check for uri (generic)
            else if (parsed.uri) {
                imageUri = parsed.uri;
            }
        } catch (e) {
            // Not JSON, use as-is
        }
    }

    // Also check raw variable value (Direct Object resolution)
    const varName = config.imageSource?.replace(/\{\{|\}\}/g, '');
    if (varName && variableManager.has(varName)) {
        const rawValue = variableManager.get(varName);
        if (rawValue && typeof rawValue === 'object') {
            if (rawValue.attachments && rawValue.attachments.length > 0) {
                imageUri = rawValue.attachments[0].uri;
            } else if (rawValue.editedUri) {
                imageUri = rawValue.editedUri;
            } else if (rawValue.imageUrl) {
                imageUri = rawValue.imageUrl;
            } else if (rawValue.uri) {
                imageUri = rawValue.uri;
            }
        } else if (typeof rawValue === 'string' && rawValue.startsWith('file://')) {
            imageUri = rawValue;
        }
    }

    console.log('[SHOW_IMAGE] Displaying image:', { title, uri: imageUri?.substring(0, 80) });

    if (!imageUri || (!imageUri.startsWith('file://') && !imageUri.startsWith('http'))) {
        console.log('[SHOW_IMAGE] Warning: Invalid image URI:', imageUri);
        return {
            success: false,
            error: 'Geçersiz resim yolu'
        };
    }

    const confirmed = await interactionService.showImage(title, imageUri);
    console.log('[SHOW_IMAGE] User interaction result:', confirmed);

    return {
        success: confirmed !== false,
        title,
        imageUri,
        confirmed: confirmed === true,
        nextPort: confirmed === true ? 'true' : 'false'
    };
}

