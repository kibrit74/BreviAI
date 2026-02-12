/**
 * AI Node Executors
 * Speech to Text (Native)
 * 
 * Note: @jamsch/expo-speech-recognition uses hooks (useSpeechRecognitionEvent)
 * which only work in React components. For workflow engine usage outside
 * component context, we return a helpful error message.
 * 
 * TODO: Implement via a React component modal for proper hook usage.
 */

import { VariableManager } from '../VariableManager';

// Simple config interface
interface SpeechToTextConfig {
    variableName?: string;
    language?: string;
}

import { interactionService } from '../InteractionService';

export async function executeSpeechToText(
    config: SpeechToTextConfig,
    variableManager: VariableManager
): Promise<any> {

    // Request speech input via InteractionModal
    const text = await interactionService.requestSpeech(
        "Dinliyorum...",
        config.language || 'tr-TR'
    );

    if (text) {
        if (config.variableName) {
            variableManager.set(config.variableName, text);
        }
        return {
            success: true,
            text: text,
            content: text,
            value: text // For compatibility
        };
    }

    return {
        success: false,
        error: 'Ses girişi iptal edildi.',
    };
}
