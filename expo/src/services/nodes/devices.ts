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

const RESTORE_TIMER_SCOPE_MS = 24 * 60 * 60 * 1000; // 24h safety cap
type RestoreTimer = ReturnType<typeof setTimeout>;
const restoreTimers = new Map<string, { token: number; timerId: RestoreTimer }>();
let restoreTimerToken = 0;

function getRestoreKey(variableManager: VariableManager, feature: string): string {
    const workflowId = String(variableManager.get('_workflowId') || 'global');
    return `${workflowId}:${feature}`;
}

function cancelScheduledRestore(key: string): void {
    const existing = restoreTimers.get(key);
    if (!existing) return;
    clearTimeout(existing.timerId);
    restoreTimers.delete(key);
}

function scheduleLatestRestore(
    key: string,
    delayMs: number,
    task: () => Promise<void>
): void {
    cancelScheduledRestore(key);
    const safeDelay = Math.max(0, Math.min(delayMs, RESTORE_TIMER_SCOPE_MS));
    const token = ++restoreTimerToken;
    const timerId = setTimeout(async () => {
        const active = restoreTimers.get(key);
        if (!active || active.token !== token) return;
        restoreTimers.delete(key);
        try {
            await task();
        } catch (e) {
            console.error(`[DEVICE_RESTORE] Failed for ${key}:`, e);
        }
    }, safeDelay);
    restoreTimers.set(key, { token, timerId });
}

function toRestoreMs(minutes?: number): number {
    const numeric = Number(minutes || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    return Math.round(numeric * 60 * 1000);
}

function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function toRingerModeValue(mode: SoundModeConfig['mode']): 0 | 1 | 2 {
    if (mode === 'silent') return 0;
    if (mode === 'vibrate') return 1;
    return 2;
}

function toRingerModeLabel(value: number): SoundModeConfig['mode'] | null {
    if (value === 0) return 'silent';
    if (value === 1) return 'vibrate';
    if (value === 2) return 'normal';
    return null;
}

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

export async function executeSoundMode(
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
        if (!BreviSettings || !BreviSettings.setRingerMode) {
            return { success: false, error: 'Native module not available' };
        }

        const targetMode = toRingerModeValue(config.mode);
        const restoreAfterMs = toRestoreMs(config.restoreAfterMinutes);
        const shouldReadCurrent =
            !!BreviSettings.getRingerMode &&
            (
                config.saveCurrentMode === true ||
                (config.skipIfAlreadySet !== false) ||
                restoreAfterMs > 0
            );

        let previousMode: number | null = null;
        if (shouldReadCurrent) {
            try {
                previousMode = Number(await BreviSettings.getRingerMode());
                if (!Number.isFinite(previousMode) || previousMode < 0) {
                    previousMode = null;
                }
            } catch (e) {
                console.warn('[SOUND_MODE] Failed to read current mode:', e);
            }
        }

        const previousModeLabel = previousMode == null ? null : toRingerModeLabel(previousMode);
        if (config.saveCurrentMode && config.savedModeVariable && previousMode != null) {
            variableManager.set(config.savedModeVariable, previousModeLabel ?? previousMode);
        }

        if ((config.skipIfAlreadySet !== false) && previousMode === targetMode) {
            return {
                success: true,
                mode: config.mode,
                skipped: true,
                reason: 'already_in_requested_mode',
            };
        }

        const nativeResult = await BreviSettings.setRingerMode(targetMode);
        if (nativeResult === false) {
            return {
                success: false,
                error: 'Ses modu degistirilemedi (izin/cihaz kisiti olabilir)',
            };
        }

        const restoreKey = getRestoreKey(variableManager, 'sound_mode');
        if (restoreAfterMs > 0 && (config.restoreToPrevious !== false) && previousMode != null && previousMode !== targetMode) {
            scheduleLatestRestore(restoreKey, restoreAfterMs, async () => {
                if (!BreviSettings?.setRingerMode) return;
                await BreviSettings.setRingerMode(previousMode as number);
                console.log('[SOUND_MODE] Restored previous mode after temporary routine window');
            });
        } else {
            cancelScheduledRestore(restoreKey);
        }

        console.log('[SOUND_MODE] Success - mode:', config.mode);
        return {
            success: true,
            mode: config.mode,
            previousMode: previousModeLabel ?? previousMode,
            temporary: restoreAfterMs > 0,
        };
    } catch (error) {
        console.error('[SOUND_MODE] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to change sound mode',
        };
    }
}

export async function executeScreenWake(
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

export async function executeDNDControl(
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
        if (!BreviSettings || !BreviSettings.setDoNotDisturb) {
            console.log('[DND] BreviSettings not available or setDoNotDisturb missing');
            return {
                success: false,
                error: 'Native module not available',
            };
        }

        console.log('[DND] Checking DND access...');
        const hasAccess = BreviSettings.hasDndAccess ? await BreviSettings.hasDndAccess() : false;
        console.log('[DND] hasDndAccess:', hasAccess);

        if (!hasAccess) {
            console.log('[DND] No DND access');
            if (config.openSettingsOnPermissionMissing !== false && BreviSettings.requestDndAccess) {
                await BreviSettings.requestDndAccess();
            }
            return {
                success: false,
                error: 'DND izni gerekli. Lutfen ayarlardan izin verin.',
                requiresPermission: true,
            };
        }

        let previousEnabled: boolean | null = null;
        if (BreviSettings.isDoNotDisturbEnabled) {
            try {
                previousEnabled = !!(await BreviSettings.isDoNotDisturbEnabled());
            } catch (e) {
                console.warn('[DND] Failed to read current DND state:', e);
            }
        }

        if (config.savePreviousStateVariable && previousEnabled != null) {
            variableManager.set(config.savePreviousStateVariable, previousEnabled);
        }

        if ((config.skipIfAlreadySet !== false) && previousEnabled != null && previousEnabled === config.enabled) {
            return {
                success: true,
                enabled: config.enabled,
                skipped: true,
                reason: 'already_in_requested_state',
            };
        }

        console.log('[DND] Setting DND to:', config.enabled);
        const nativeResult = await BreviSettings.setDoNotDisturb(config.enabled);
        console.log('[DND] Native result:', nativeResult);
        if (nativeResult === false) {
            return {
                success: false,
                error: 'DND degistirilemedi (izin/cihaz kisiti olabilir)',
            };
        }

        const restoreKey = getRestoreKey(variableManager, 'dnd');
        if (config.enabled && config.duration && config.duration > 0) {
            const restoreAfterMs = toRestoreMs(config.duration);
            const restoreState = (config.restoreToPrevious !== false && previousEnabled != null)
                ? previousEnabled
                : false;
            console.log('[DND] Scheduling restore after', config.duration, 'minutes to state:', restoreState);
            scheduleLatestRestore(restoreKey, restoreAfterMs, async () => {
                if (!BreviSettings?.setDoNotDisturb) return;
                await BreviSettings.setDoNotDisturb(restoreState);
                console.log('[DND] Restored after temporary routine window');
            });
        } else {
            cancelScheduledRestore(restoreKey);
        }

        console.log('[DND] Success');
        return {
            success: true,
            enabled: config.enabled,
            duration: config.duration,
            previousEnabled,
        };
    } catch (error) {
        console.error('[DND] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to control DND',
        };
    }
}
export async function executeBrightnessControl(
    config: BrightnessControlConfig,
    variableManager: VariableManager
): Promise<any> {
    console.log('[BRIGHTNESS] Entry - level:', config.level);

    try {
        const restoreAfterMs = toRestoreMs(config.restoreAfterMinutes);
        const shouldReadCurrent =
            config.saveCurrentLevel === true ||
            (config.skipIfAlreadySet !== false) ||
            restoreAfterMs > 0;

        let previousLevel: number | null = null;
        if (shouldReadCurrent) {
            try {
                const currentBrightness = await Brightness.getBrightnessAsync();
                previousLevel = clampPercent(currentBrightness * 100);
                console.log('[BRIGHTNESS] Current brightness:', previousLevel);
            } catch (e) {
                console.warn('[BRIGHTNESS] Failed to read current brightness:', e);
            }
        }

        if (config.saveCurrentLevel && config.savedLevelVariable && previousLevel != null) {
            variableManager.set(config.savedLevelVariable, previousLevel);
        }

        const targetLevel = clampPercent(config.level);
        if ((config.skipIfAlreadySet !== false) && previousLevel != null && Math.abs(previousLevel - targetLevel) <= 1) {
            return {
                success: true,
                level: targetLevel,
                skipped: true,
                reason: 'already_in_requested_range',
            };
        }

        const brightnessValue = targetLevel / 100;
        console.log('[BRIGHTNESS] Setting to:', brightnessValue);
        await Brightness.setBrightnessAsync(brightnessValue);

        const restoreKey = getRestoreKey(variableManager, 'brightness');
        if (restoreAfterMs > 0 && (config.restoreToPrevious !== false) && previousLevel != null && Math.abs(previousLevel - targetLevel) > 1) {
            scheduleLatestRestore(restoreKey, restoreAfterMs, async () => {
                await Brightness.setBrightnessAsync(clampPercent(previousLevel as number) / 100);
                console.log('[BRIGHTNESS] Restored previous level after temporary routine window');
            });
        } else {
            cancelScheduledRestore(restoreKey);
        }

        console.log('[BRIGHTNESS] Success');
        return {
            success: true,
            level: targetLevel,
            previousLevel,
            temporary: restoreAfterMs > 0,
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

export async function executeGlobalAction(
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
                error: 'EriÅŸilebilirlik servisi gerekli',
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

export async function executeMediaControl(
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

// Fallback Bluetooth state when native read is unavailable
let bluetoothStateFallback = true;

export async function executeBluetoothControl(
    config: BluetoothControlConfig,
    variableManager: VariableManager
): Promise<any> {
    console.log('[BLUETOOTH] Executing with config:', config);

    if (Platform.OS !== 'android') {
        return { success: false, error: 'Bluetooth control only available on Android' };
    }

    try {
        if (!BreviSettings || !BreviSettings.setBluetooth) {
            return { success: false, error: 'Native module not ready' };
        }

        let currentState: boolean | null = null;
        if (BreviSettings.isBluetoothEnabled) {
            try {
                currentState = !!(await BreviSettings.isBluetoothEnabled());
                bluetoothStateFallback = currentState;
            } catch (e) {
                console.warn('[BLUETOOTH] Failed to read current state:', e);
            }
        }

        let enable: boolean;
        if (config.mode === 'toggle') {
            if (currentState != null) {
                enable = !currentState;
            } else {
                bluetoothStateFallback = !bluetoothStateFallback;
                enable = bluetoothStateFallback;
            }
        } else {
            enable = config.mode === 'on';
        }

        if ((config.skipIfAlreadySet !== false) && currentState != null && currentState === enable) {
            return {
                success: true,
                mode: config.mode,
                state: currentState,
                skipped: true,
                reason: 'already_in_requested_state',
            };
        }

        console.log('[BLUETOOTH] Setting Bluetooth to:', enable);
        const nativeResult = await BreviSettings.setBluetooth(enable);
        if (nativeResult === false) {
            return {
                success: false,
                error: 'Bluetooth degistirilemedi (Android kisiti olabilir)',
            };
        }

        let finalState: boolean = enable;
        if (BreviSettings.isBluetoothEnabled) {
            try {
                finalState = !!(await BreviSettings.isBluetoothEnabled());
                bluetoothStateFallback = finalState;
            } catch {
                finalState = enable;
            }
        }

        const restoreAfterMs = toRestoreMs(config.restoreAfterMinutes);
        const restoreKey = getRestoreKey(variableManager, 'bluetooth');
        if (restoreAfterMs > 0 && (config.restoreToPrevious !== false) && currentState != null && currentState !== enable) {
            scheduleLatestRestore(restoreKey, restoreAfterMs, async () => {
                if (!BreviSettings?.setBluetooth) return;
                await BreviSettings.setBluetooth(currentState as boolean);
                console.log('[BLUETOOTH] Restored previous state after temporary routine window');
            });
        } else {
            cancelScheduledRestore(restoreKey);
        }

        const requiresManualConfirmation = finalState !== enable;
        return {
            success: true,
            mode: config.mode,
            state: finalState,
            previousState: currentState,
            requiresManualConfirmation,
        };
    } catch (error) {
        console.error('[BLUETOOTH] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to control Bluetooth',
        };
    }
}
