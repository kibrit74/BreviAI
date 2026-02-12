import { NativeModules, Platform } from 'react-native';

/**
 * FloatingChat - Interface to Native Overlay
 * 
 * Native modül artık ReactContextBaseJavaModule olarak kaydedildi,
 * bu yüzden NativeModules üzerinden erişilmeli.
 */
interface FloatingChatInterface {
    /**
     * Check if overlay permission is granted
     */
    hasOverlayPermission(): Promise<boolean>;

    /**
     * Request overlay permission
     */
    requestOverlayPermission(): Promise<boolean>;

    /**
     * Show the floating chat overlay
     */
    show(): Promise<boolean>;

    /**
     * Hide the floating chat overlay
     */
    hide(): Promise<boolean>;

    /**
     * Send a message to the overlay
     * @param message Text to display
     * @param type 'bot' or 'user'
     */
    sendMessage(message: string, type: string): Promise<boolean>;

    /**
     * Request user input from overlay
     * @param placeholder Placeholder text
     * @returns Promise resolving to user input text
     */
    requestInput(placeholder: string): Promise<string>;

    /**
     * Clear all messages from overlay
     */
    clear(): Promise<boolean>;

    /**
     * Check if service is running
     */
    isRunning(): Promise<boolean>;
}

// Get the native module from NativeModules (standard React Native)
let FloatingChatModule: FloatingChatInterface | null = null;

try {
    if (Platform.OS === 'android') {
        FloatingChatModule = NativeModules.FloatingChatModule;
        if (!FloatingChatModule) {
            console.warn('FloatingChatModule is null in NativeModules');
        }
    }
} catch (e) {
    console.warn('FloatingChatModule not found or failed to load:', e);
}

export const floatingChat = {
    /**
     * Show result in overlay
     */
    async showResult(text: string): Promise<boolean> {
        if (!FloatingChatModule) {
            console.warn('[FloatingChat] Module not available');
            return false;
        }

        try {
            const hasPermission = await FloatingChatModule.hasOverlayPermission();
            if (!hasPermission) {
                await FloatingChatModule.requestOverlayPermission();
                // User needs to grant permission manually, return false
                return false;
            }

            await FloatingChatModule.show();
            return await FloatingChatModule.sendMessage(text, 'bot');
        } catch (error) {
            console.error('[FloatingChat] Error showing result:', error);
            return false;
        }
    },

    /**
     * Request input from overlay
     */
    async requestInput(placeholder: string = 'Mesaj yazın...'): Promise<string | null> {
        if (!FloatingChatModule) {
            console.warn('[FloatingChat] Module not available');
            return null;
        }

        try {
            const hasPermission = await FloatingChatModule.hasOverlayPermission();
            if (!hasPermission) {
                await FloatingChatModule.requestOverlayPermission();
                return null;
            }

            await FloatingChatModule.show();
            return await FloatingChatModule.requestInput(placeholder);
        } catch (error) {
            console.error('[FloatingChat] Error requesting input:', error);
            return null;
        }
    },

    /**
     * Clear overlay
     */
    async clear(): Promise<void> {
        try {
            await FloatingChatModule?.clear();
        } catch (error) {
            console.error('[FloatingChat] Error clearing:', error);
        }
    },

    /**
     * Hide overlay
     */
    async hide(): Promise<void> {
        try {
            await FloatingChatModule?.hide();
        } catch (error) {
            console.error('[FloatingChat] Error hiding:', error);
        }
    },

    /**
     * Check if module is available
     */
    isAvailable(): boolean {
        return FloatingChatModule !== null;
    }
};

export default floatingChat;

