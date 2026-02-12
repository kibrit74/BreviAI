import { Linking, Platform } from 'react-native';
import { WorkflowNode, NodeExecutionResult } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';

// Safe import for native module - provides fallback when URL schemes fail
let BreviSettings: any = null;
try {
    BreviSettings = require('brevi-settings');
} catch (e) {
    console.log('[APP_LAUNCH] BreviSettings not available');
}

interface AppLaunchConfig {
    appName: string;
}

const APP_SCHEMES: Record<string, string> = {
    'youtube': 'youtube://',
    'whatsapp': 'whatsapp://',
    'spotify': 'spotify://',
    'instagram': 'instagram://',
    'twitter': 'twitter://',
    'x': 'twitter://',
    'facebook': 'fb://',
    'telegram': 'tg://',
    'google maps': 'comgooglemaps://',
    'maps': 'http://maps.google.com/',
    'chrome': 'googlechrome://',
    'gmail': 'googlegmail://',
    'phone': 'tel:',
    'sms': 'sms:',
    'email': 'mailto:',
    'settings': 'app-settings:',
    'calendar': 'content://com.android.calendar/time/', // Android specific
    'calculator': 'calculator:', // Generic attempt
    'clock': 'clock:', // Generic attempt
};

const APP_PACKAGES: Record<string, string> = {
    'youtube': 'com.google.android.youtube',
    'whatsapp': 'com.whatsapp',
    'spotify': 'com.spotify.music',
    'instagram': 'com.instagram.android',
    'twitter': 'com.twitter.android',
    'facebook': 'com.facebook.katana',
    'telegram': 'org.telegram.messenger',
    'chrome': 'com.android.chrome',
    'gmail': 'com.google.android.gm',
    'maps': 'com.google.android.apps.maps',
};

/**
 * Execute App Launch Node
 * Opens a specific app by name
 */
export const executeAppLaunch = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = node.config as AppLaunchConfig; // Or however config is passed (sometimes wrapped in logic)
    // Agent passes { appName: "YouTube" } directly as args usually in Agent logic
    // But WorkflowNode config has it too.

    // Handle both direct execution args (from Agent) and Node config
    const appNameRaw = (node as any).appName || config.appName;

    if (!appNameRaw) {
        return { success: false, error: "App name is required" };
    }

    const appName = variableManager.resolveString(appNameRaw).toLowerCase();

    console.log(`[APP_LAUNCH] Trying to launch: ${appName}`);

    // 1. Try known schemes
    let scheme = APP_SCHEMES[appName];

    // 2. Heuristic for common patterns
    if (!scheme) {
        // Try simple schemes like "name://"
        // remove spaces
        const simple = appName.replace(/\s/g, '');
        scheme = `${simple}://`;
    }

    try {
        const canOpen = await Linking.canOpenURL(scheme);
        if (canOpen) {
            await Linking.openURL(scheme);
            return { success: true, opened: appName, scheme };
        } else {
            // URL scheme failed - try native launcher as fallback (Android)
            console.warn(`[APP_LAUNCH] Cannot open scheme: ${scheme}, trying native launcher...`);

            // Try native module with package name
            if (Platform.OS === 'android' && BreviSettings?.launchApp) {
                const packageName = APP_PACKAGES[appName];
                if (packageName) {
                    console.log(`[APP_LAUNCH] Trying native launch with package: ${packageName}`);
                    const launched = await BreviSettings.launchApp(packageName);
                    if (launched) {
                        return { success: true, opened: appName, method: 'native_package' };
                    }
                }

                // Try with app name directly (native module has name resolution)
                console.log(`[APP_LAUNCH] Trying native launch with name: ${appName}`);
                const launchedByName = await BreviSettings.launchApp(appName);
                if (launchedByName) {
                    return { success: true, opened: appName, method: 'native_name' };
                }
            }

            // Try http fallback for some
            if (appName === 'google' || appName === 'search') {
                await Linking.openURL('https://google.com');
                return { success: true, opened: 'google web' };
            }

            return { success: false, error: `Cannot open app: ${appName} (scheme: ${scheme} not supported)` };
        }
    } catch (error: any) {
        console.error(`[APP_LAUNCH] Error:`, error);
        return { success: false, error: error.message };
    }
};
