
import { ShowOverlayConfig, OverlayInputConfig, WorkflowNode } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { floatingChat } from '../../modules/FloatingChat';
import { AgentMemoryService } from '../AgentMemoryService';

/**
 * SHOW_OVERLAY Executor
 * Floating chat overlay üzerinde mesaj gösterir
 */
export const executeShowOverlay = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<any> => {
    const config = node.config as ShowOverlayConfig;

    // Text can be in 'text' or 'message' property - check both for compatibility
    const rawText = config.text || (config as any).message || '';
    const text = rawText ? variableManager.resolveString(rawText) : '';

    try {
        // Check if module is available
        if (!floatingChat.isAvailable()) {
            console.warn('[SHOW_OVERLAY] FloatingChat module not available');
            return {
                success: false,
                shown: false,
                message: text,
                error: 'FloatingChat module not available - rebuild required'
            };
        }

        // If text provided, show with message. Otherwise just show overlay.
        if (text) {
            const success = await floatingChat.showResult(text);

            // Log to Agent Memory
            if (success) {
                await AgentMemoryService.logAction({
                    action: `Görüntülenen Mesaj: ${text}`,
                    toolName: 'show_overlay',
                    params: { text },
                    success: true
                });
            }

            return {
                success,
                shown: true,
                message: text
            };
        } else {
            // Just show the overlay without a message
            // This is useful for interactive input workflows
            const { FloatingChatModule } = require('react-native').NativeModules;
            if (FloatingChatModule) {
                const hasPermission = await FloatingChatModule.hasOverlayPermission();
                if (!hasPermission) {
                    await FloatingChatModule.requestOverlayPermission();
                    return {
                        success: false,
                        shown: false,
                        message: '',
                        error: 'Overlay permission required'
                    };
                }
                await FloatingChatModule.show();
                return {
                    success: true,
                    shown: true,
                    message: ''
                };
            }
            return {
                success: false,
                shown: false,
                error: 'Module not available'
            };
        }
    } catch (error: any) {
        console.error('[SHOW_OVERLAY] Error:', error);
        return {
            success: false,
            shown: false,
            message: text,
            error: error?.message || 'Unknown error'
        };
    }
};

/**
 * OVERLAY_INPUT Executor
 * Floating chat üzerinden kullanıcıdan input alır
 */
export const executeOverlayInput = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<any> => {
    const config = node.config as OverlayInputConfig;
    const placeholder = variableManager.resolveString(config.placeholder || 'Mesaj yazın...');

    try {
        // Check if module is available
        if (!floatingChat.isAvailable()) {
            console.warn('[OVERLAY_INPUT] FloatingChat module not available');
            return {
                success: false,
                input: null,
                error: 'FloatingChat module not available'
            };
        }

        // Request input from overlay
        const userInput = await floatingChat.requestInput(placeholder);

        if (userInput && config.variableName) {
            variableManager.set(config.variableName, userInput);
        }

        // Log to Agent Memory
        if (userInput) {
            await AgentMemoryService.logAction({
                action: `Kullanıcı Girişi: ${userInput}`,
                toolName: 'overlay_input',
                params: { placeholder },
                success: true
            });
        }

        return {
            success: !!userInput,
            input: userInput,
            variableName: config.variableName
        };
    } catch (error: any) {
        console.error('[OVERLAY_INPUT] Error:', error);
        return {
            success: false,
            input: null,
            error: error?.message || 'Unknown error'
        };
    }
};

/**
 * OVERLAY_CLEAR Executor
 * Floating chat mesaj geçmişini temizler
 */
export const executeOverlayClear = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<any> => {
    try {
        await floatingChat.clear();
        return { success: true };
    } catch (error: any) {
        console.error('[OVERLAY_CLEAR] Error:', error);
        return {
            success: false,
            error: error?.message || 'Unknown error'
        };
    }
};
