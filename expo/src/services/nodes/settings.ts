import { Linking, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import {
    WorkflowNode,
    NodeExecutionResult,
    SettingsOpenConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';

/**
 * Execute Settings Open Node
 * Opens specific system settings page
 */
export const executeSettingsOpen = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = (node.config || {}) as SettingsOpenConfig;
    const setting = config.setting || 'settings';

    if (Platform.OS === 'ios') {
        // iOS only allows opening the app's own settings page
        // or general settings (root).
        // It's not possible to deep link to Wifi/Bluetooth directly reliably in recent iOS versions.
        await Linking.openSettings();
        return { success: true, platform: 'ios', message: 'Uygulama ayarları açıldı' };
    } else {
        // Android using Expo Intent Launcher
        let activityAction = IntentLauncher.ActivityAction.SETTINGS;

        switch (setting) {
            case 'wifi':
                activityAction = IntentLauncher.ActivityAction.WIFI_SETTINGS;
                break;
            case 'bluetooth':
                activityAction = IntentLauncher.ActivityAction.BLUETOOTH_SETTINGS;
                break;
            case 'location':
                activityAction = IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS;
                break;
            case 'airplane_mode':
                activityAction = IntentLauncher.ActivityAction.AIRPLANE_MODE_SETTINGS;
                break;
            case 'settings':
            default:
                activityAction = IntentLauncher.ActivityAction.SETTINGS;
                break;
        }

        try {
            await IntentLauncher.startActivityAsync(activityAction);
            return { success: true, platform: 'android', action: activityAction };
        } catch (error) {
            // Fallback
            await Linking.openSettings();
            return { success: false, error: 'İstenen ayar sayfası açılamadı, genel ayarlar açıldı.' };
        }
    }
};
