/**
 * Device Node Executors
 * Sound Mode, Screen Wake, App Launch, DND Control, Brightness Control
 */

import {
    WorkflowNode,
    SoundModeConfig,
    ScreenWakeConfig,
    AppLaunchConfig,
    DNDControlConfig,
    BrightnessControlConfig,
    FlashlightControlConfig,
    BluetoothControlConfig,
    GlobalActionConfig,
    MediaControlConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// Safe import for native module
let BreviSettings: any = null;
try {
    BreviSettings = require('brevi-settings');
} catch (e) {
    console.log('BreviSettings not available');
}
import { Camera } from 'expo-camera';

export async function executeDeviceNode(
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<any> {
    switch (node.type) {
        case 'SOUND_MODE':
            return executeSoundMode(node.config as SoundModeConfig, variableManager);
        case 'SCREEN_WAKE':
            return executeScreenWake(node.config as ScreenWakeConfig, variableManager);
        case 'APP_LAUNCH':
            return executeAppLaunch(node.config as AppLaunchConfig, variableManager);
        case 'DND_CONTROL':
            return executeDNDControl(node.config as DNDControlConfig, variableManager);
        case 'BRIGHTNESS_CONTROL':
            return executeBrightnessControl(node.config as BrightnessControlConfig, variableManager);
        case 'FLASHLIGHT_CONTROL':
            return executeFlashlightControl(node.config as FlashlightControlConfig, variableManager);
        case 'GLOBAL_ACTION':
            return executeGlobalAction(node.config as GlobalActionConfig, variableManager);
        case 'MEDIA_CONTROL':
            return executeMediaControl(node.config as MediaControlConfig, variableManager);
        case 'BLUETOOTH_CONTROL':
            return executeBluetoothControl(node.config as BluetoothControlConfig, variableManager);
        default:
            throw new Error(`Unknown device type: ${node.type}`);
    }
}

async function executeSoundMode(
    config: SoundModeConfig,
    variableManager: VariableManager
): Promise<any> {
    console.log('[SOUND_MODE] Entry - config:', JSON.stringify(config));

    if (Platform.OS !== 'android') {
        console.log('[SOUND_MODE] Not Android, skipping');
        return {
            success: false,
            error: 'Sound mode control only available on Android',
        };
    }

    try {
        // Save current mode if requested
        if (config.saveCurrentMode && config.savedModeVariable && BreviSettings) {
            try {
                const currentMode = await BreviSettings.getRingerMode();
                variableManager.set(config.savedModeVariable, currentMode);
            } catch (e) {
                console.log('Failed to save current ringer mode');
            }
        }

        // Set new mode
        if (BreviSettings) {
            switch (config.mode) {
                case 'silent':
                    await BreviSettings.setRingerMode(0); // RINGER_MODE_SILENT
                    break;
                case 'vibrate':
                    await BreviSettings.setRingerMode(1); // RINGER_MODE_VIBRATE
                    break;
                case 'normal':
                    await BreviSettings.setRingerMode(2); // RINGER_MODE_NORMAL
                    break;
            }
        }

        console.log('[SOUND_MODE] Success - mode:', config.mode);
        return {
            success: true,
            mode: config.mode,
        };
    } catch (error) {
        console.error('[SOUND_MODE] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to change sound mode',
        };
    }
}

async function executeScreenWake(
    config: ScreenWakeConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        if (config.keepAwake) {
            await activateKeepAwakeAsync('workflow');

            // If duration specified, schedule deactivation
            if (config.duration) {
                setTimeout(() => {
                    deactivateKeepAwake('workflow');
                }, config.duration);
            }
        } else {
            deactivateKeepAwake('workflow');
        }

        return {
            success: true,
            keepAwake: config.keepAwake,
            duration: config.duration,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to control screen wake',
        };
    }
}

async function executeAppLaunch(
    config: AppLaunchConfig,
    variableManager: VariableManager
): Promise<any> {
    console.log('[APP_LAUNCH] Entry - packageName:', config.packageName, 'appName:', config.appName);

    if (Platform.OS !== 'android') {
        console.log('[APP_LAUNCH] Not Android, skipping');
        return {
            success: false,
            error: 'App launch only available on Android',
        };
    }

    try {
        // Use native module if available
        if (BreviSettings && BreviSettings.launchApp) {
            console.log('[APP_LAUNCH] Using BreviSettings.launchApp');
            const result = await BreviSettings.launchApp(config.packageName);
            console.log('[APP_LAUNCH] Native result:', result);
        } else {
            console.log('[APP_LAUNCH] Using IntentLauncher fallback');
            // Fallback to intent launcher
            await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
                packageName: config.packageName,
                className: undefined,
                flags: 0x10000000, // FLAG_ACTIVITY_NEW_TASK
            });
        }

        console.log('[APP_LAUNCH] Success');
        return {
            success: true,
            packageName: config.packageName,
            appName: config.appName,
        };
    } catch (error) {
        console.error('[APP_LAUNCH] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to launch app',
        };
    }
}

async function executeDNDControl(
    config: DNDControlConfig,
    variableManager: VariableManager
): Promise<any> {
    console.log('[DND] Entry - enabled:', config.enabled, 'duration:', config.duration);

    if (Platform.OS !== 'android') {
        console.log('[DND] Not Android, skipping');
        return {
            success: false,
            error: 'DND control only available on Android',
        };
    }

    try {
        if (BreviSettings && BreviSettings.setDoNotDisturb) {
            console.log('[DND] Checking DND access...');
            const hasAccess = await BreviSettings.hasDndAccess();
            console.log('[DND] hasDndAccess:', hasAccess);

            if (!hasAccess) {
                console.log('[DND] No DND access, requesting...');
                await BreviSettings.requestDndAccess();
                return {
                    success: false,
                    error: 'DND izni gerekli. Lütfen ayarlardan izin verin.',
                    requiresPermission: true
                };
            }

            console.log('[DND] Setting DND to:', config.enabled);
            const result = await BreviSettings.setDoNotDisturb(config.enabled);
            console.log('[DND] Native result:', result);

            // If duration specified, schedule disable
            if (config.enabled && config.duration) {
                console.log('[DND] Scheduling disable after', config.duration, 'minutes');
                setTimeout(async () => {
                    try {
                        await BreviSettings.setDoNotDisturb(false);
                        console.log('[DND] Auto-disabled after duration');
                    } catch (e) {
                        console.error('[DND] Failed to disable after duration:', e);
                    }
                }, config.duration * 60 * 1000);
            }
        } else {
            console.log('[DND] BreviSettings not available or setDoNotDisturb missing');
            return {
                success: false,
                error: 'Native module not available',
            };
        }

        console.log('[DND] Success');
        return {
            success: true,
            enabled: config.enabled,
            duration: config.duration,
        };
    } catch (error) {
        console.error('[DND] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to control DND',
        };
    }
}

async function executeBrightnessControl(
    config: BrightnessControlConfig,
    variableManager: VariableManager
): Promise<any> {
    console.log('[BRIGHTNESS] Entry - level:', config.level);

    try {
        // Save current brightness if requested
        if (config.saveCurrentLevel && config.savedLevelVariable) {
            try {
                const currentBrightness = await Brightness.getBrightnessAsync();
                console.log('[BRIGHTNESS] Current brightness:', currentBrightness);
                variableManager.set(config.savedLevelVariable, Math.round(currentBrightness * 100));
            } catch (e) {
                console.error('[BRIGHTNESS] Failed to save current brightness:', e);
            }
        }

        // Set new brightness (0-1 range)
        const brightnessValue = Math.max(0, Math.min(1, config.level / 100));
        console.log('[BRIGHTNESS] Setting to:', brightnessValue);
        await Brightness.setBrightnessAsync(brightnessValue);

        console.log('[BRIGHTNESS] Success');
        return {
            success: true,
            level: config.level,
        };
    } catch (error) {
        console.error('[BRIGHTNESS] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to control brightness',
        };
    }
}

/**
 * Execute flashlight control
 * Exported for use by both WorkflowEngine and ShortcutEngine
 */

// Track flashlight state for toggle
let flashlightState = false;

export async function executeFlashlightControl(
    config: FlashlightControlConfig,
    _variableManager?: VariableManager
): Promise<any> {
    console.log('[FLASHLIGHT] Executing with config:', config);

    if (Platform.OS !== 'android') {
        console.log('[FLASHLIGHT] Not Android, simulating...');
        // For web/iOS testing, just simulate
        if (config.mode === 'toggle') {
            flashlightState = !flashlightState;
        } else if (config.mode === 'on') {
            flashlightState = true;
        } else if (config.mode === 'off') {
            flashlightState = false;
        }
        return {
            success: true,
            mode: config.mode,
            state: flashlightState,
            simulated: true
        };
    }

    try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            console.log('[FLASHLIGHT] Camera permission denied');
            return {
                success: false,
                error: 'Camera permission denied (required for flashlight)',
            };
        }

        if (BreviSettings && BreviSettings.toggleFlashlight) {
            let enable: boolean;

            // Handle all three modes properly
            if (config.mode === 'toggle') {
                flashlightState = !flashlightState;
                enable = flashlightState;
                console.log('[FLASHLIGHT] Toggle mode, new state:', enable);
            } else if (config.mode === 'on') {
                enable = true;
                flashlightState = true;
                console.log('[FLASHLIGHT] On mode');
            } else {
                enable = false;
                flashlightState = false;
                console.log('[FLASHLIGHT] Off mode');
            }

            const result = await BreviSettings.toggleFlashlight(enable);
            console.log('[FLASHLIGHT] Native result:', result);

            return {
                success: true,
                mode: config.mode,
                state: flashlightState,
                result
            };
        }

        console.log('[FLASHLIGHT] BreviSettings not available');
        return {
            success: false,
            error: 'Native BreviSettings not available',
        };
    } catch (error) {
        console.error('[FLASHLIGHT] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to control flashlight',
        };
    }
}

async function executeGlobalAction(
    config: GlobalActionConfig,
    variableManager: VariableManager
): Promise<any> {
    console.log('[GLOBAL_ACTION] Entry - action:', config.action);

    if (Platform.OS !== 'android') {
        console.log('[GLOBAL_ACTION] Not Android, skipping');
        return { success: false, error: 'Android required' };
    }

    try {
        if (!BreviSettings) {
            console.log('[GLOBAL_ACTION] BreviSettings not available');
            return { success: false, error: 'Module missing' };
        }

        // Ensure accessibility service is enabled
        console.log('[GLOBAL_ACTION] Checking accessibility service...');
        const isEnabled = await BreviSettings.isAccessibilityServiceEnabled();
        console.log('[GLOBAL_ACTION] Accessibility enabled:', isEnabled);

        if (!isEnabled) {
            console.log('[GLOBAL_ACTION] Requesting accessibility permission');
            await BreviSettings.requestAccessibilityPermission();
            return {
                success: false,
                error: 'Erişilebilirlik servisi gerekli',
                requiresPermission: true
            };
        }

        let result = false;
        switch (config.action) {
            case 'home':
                console.log('[GLOBAL_ACTION] Executing HOME');
                result = await BreviSettings.accessibilityHome();
                break;
            case 'back':
                console.log('[GLOBAL_ACTION] Executing BACK');
                result = await BreviSettings.accessibilityBack();
                break;
            case 'recents':
                console.log('[GLOBAL_ACTION] RECENTS not implemented');
                return { success: false, error: 'Recents action not yet implemented in native module' };
            default:
                console.log('[GLOBAL_ACTION] Unknown action:', config.action);
                return { success: false, error: `Action ${config.action} not supported` };
        }

        console.log('[GLOBAL_ACTION] Result:', result);
        return { success: result, action: config.action };
    } catch (error) {
        console.error('[GLOBAL_ACTION] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Global action failed' };
    }
}

async function executeMediaControl(
    config: MediaControlConfig,
    variableManager: VariableManager
): Promise<any> {
    console.log('[MEDIA] Entry - action:', config.action);

    if (Platform.OS !== 'android') {
        console.log('[MEDIA] Not Android, skipping');
        return { success: false, error: 'Android required' };
    }

    try {
        if (!BreviSettings) {
            console.log('[MEDIA] BreviSettings not available');
            return { success: false, error: 'Module missing' };
        }

        console.log('[MEDIA] Executing action:', config.action);
        switch (config.action) {
            case 'play_pause':
                await BreviSettings.mediaPlayPause();
                console.log('[MEDIA] Play/Pause executed');
                break;
            case 'next':
                await BreviSettings.mediaNext();
                console.log('[MEDIA] Next executed');
                break;
            case 'previous':
                await BreviSettings.mediaPrevious();
                console.log('[MEDIA] Previous executed');
                break;
            case 'volume_up':
                console.log('[MEDIA] Volume control not implemented here');
                return { success: false, error: 'Volume control should use VOLUME_CONTROL node' };
            default:
                console.log('[MEDIA] Unknown action:', config.action);
                return { success: false, error: `Media action ${config.action} not supported` };
        }

        console.log('[MEDIA] Success');
        return { success: true, action: config.action };
    } catch (error) {
        console.error('[MEDIA] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Media control failed' };
    }
}

// Helper to get installed apps
export async function getAppList(): Promise<{ label: string; packageName: string }[]> {
    if (!BreviSettings?.getInstalledApps) return [];

    try {
        const apps: string[] = await BreviSettings.getInstalledApps();
        return apps.map(appStr => {
            // Format: "Label (package.name)"
            const match = appStr.match(/^(.*) \((.*)\)$/);
            if (match) {
                return { label: match[1], packageName: match[2] };
            }
            return { label: appStr, packageName: appStr };
        });
    } catch (e) {
        console.error('Error getting app list:', e);
        return [];
    }
}

// Track Bluetooth state for toggle (approximate, since we can't always read it instantly)
let bluetoothState = true;

async function executeBluetoothControl(
    config: BluetoothControlConfig,
    _variableManager: VariableManager
): Promise<any> {
    console.log('[BLUETOOTH] Executing with config:', config);

    if (Platform.OS !== 'android') {
        return { success: false, error: 'Bluetooth control only available on Android' };
    }

    try {
        if (!BreviSettings || !BreviSettings.setBluetooth) {
            return { success: false, error: 'Native module not ready' };
        }

        let enable: boolean;

        if (config.mode === 'toggle') {
            bluetoothState = !bluetoothState;
            enable = bluetoothState;
        } else {
            enable = (config.mode === 'on');
            bluetoothState = enable;
        }

        console.log('[BLUETOOTH] Setting Bluetooth to:', enable);
        await BreviSettings.setBluetooth(enable);

        return { success: true, mode: config.mode, state: enable };
    } catch (error) {
        console.error('[BLUETOOTH] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to control Bluetooth',
        };
    }
}
