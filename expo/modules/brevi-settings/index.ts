import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

// Get the native module. This will error if the module is not correctly linked.
let BreviSettings: any = null;

try {
    BreviSettings = requireNativeModule('BreviSettings');
} catch (e) {
    console.warn('BreviSettings native module not found, using mock. (This is normal on Web or in Expo Go)');
    // Mock implementation for Web or when native module is missing
    BreviSettings = {
        setShortsBlockingEnabled: (enabled: boolean) => console.log('Mock: setShortsBlockingEnabled', enabled),
        isShortsBlockingEnabled: () => false,
        hasDndAccess: () => false,
        requestDndAccess: () => console.log('Mock: requestDndAccess'),
        isDoNotDisturbEnabled: () => false,
        setDoNotDisturb: (enabled: boolean) => { console.log('Mock: setDoNotDisturb', enabled); return true; },
        isAccessibilityServiceEnabled: () => false,
        requestAccessibilityPermission: () => console.log('Mock: requestAccessibilityPermission'),
        accessibilityClick: (text: string) => { console.log('Mock: accessibilityClick', text); return true; },
        accessibilityFind: (text: string) => { console.log('Mock: accessibilityFind', text); return true; },
        accessibilityHome: () => { console.log('Mock: accessibilityHome'); return true; },
        accessibilityBack: () => { console.log('Mock: accessibilityBack'); return true; },
        toggleFlashlight: (enable: boolean) => { console.log('Mock: toggleFlashlight', enable); return true; },
        startSensorService: () => console.log('Mock: startSensorService'),
        stopSensorService: () => console.log('Mock: stopSensorService'),
        launchApp: (packageName: string) => { console.log('Mock: launchApp', packageName); return true; },
        setBluetooth: (enable: boolean) => { console.log('Mock: setBluetooth', enable); return true; },
        isBluetoothEnabled: () => { console.log('Mock: isBluetoothEnabled'); return false; },
        openBluetoothSettings: () => { console.log('Mock: openBluetoothSettings'); return true; },
        setVolume: (level: number, streamType: string) => { console.log('Mock: setVolume', level, streamType); return true; },
        getVolume: (streamType: string) => { console.log('Mock: getVolume', streamType); return 50; },
        setRingerMode: (mode: number) => { console.log('Mock: setRingerMode', mode); return true; },
        getRingerMode: () => { console.log('Mock: getRingerMode'); return 2; }, // 2 = normal

        getInstalledApps: () => { console.log('Mock: getInstalledApps'); return []; },

        // Widget Management Mock Functions
        updateWidget: (widgetId: string, configJson?: string) => { console.log('Mock: updateWidget', widgetId, configJson); return Promise.resolve(); },
        executeWidgetWorkflow: (shortcutId: string) => { console.log('Mock: executeWidgetWorkflow', shortcutId); return Promise.resolve(true); },
        openBreviAI: (payload: any) => { console.log('Mock: openBreviAI', payload); return Promise.resolve(); },
        executeSystemAction: (action: any) => { console.log('Mock: executeSystemAction', action); return Promise.resolve(); },
        getWidgetConfig: (widgetId: string) => { console.log('Mock: getWidgetConfig', widgetId); return Promise.resolve(null); },
        saveWidgetConfig: (widgetId: string, config: any) => { console.log('Mock: saveWidgetConfig', widgetId, config); return Promise.resolve(); },
        fetchEmails: (host: string, port: number, user: string, pass: string, max: number) => {
            console.log('Mock: fetchEmails', user);
            return [{
                id: '1',
                threadId: '1',
                from: 'Mock Sender <sender@example.com>',
                subject: 'Mock Email Subject',
                snippet: 'This is a mock email snippet for testing.',
                date: new Date().toISOString()
            }];
        }
    };
}

// Default export for require().default usage
export default BreviSettings;

// ==== EMAIL ====
export function fetchEmails(host: string, port: number, user: string, pass: string, max: number = 10): Promise<any[]> {
    return BreviSettings.fetchEmails(host, port, user, pass, max);
}

// ==== SHORTS BLOCKING ====
export function setShortsBlockingEnabled(enabled: boolean): void {
    BreviSettings.setShortsBlockingEnabled(enabled);
}

export function isShortsBlockingEnabled(): boolean {
    return BreviSettings.isShortsBlockingEnabled();
}

// ==== DO NOT DISTURB (DND) CONTROL ====

/**
 * Check if the app has DND access permission
 */
export function hasDndAccess(): boolean {
    return BreviSettings.hasDndAccess();
}

/**
 * Open system settings for user to grant DND access permission
 */
export function requestDndAccess(): void {
    BreviSettings.requestDndAccess();
}

/**
 * Check if DND mode is currently enabled
 */
export function isDoNotDisturbEnabled(): boolean {
    return BreviSettings.isDoNotDisturbEnabled();
}

/**
 * Set DND mode ON or OFF (requires permission)
 * @returns true if successful, false if permission not granted
 */
export function setDoNotDisturb(enabled: boolean): boolean {
    return BreviSettings.setDoNotDisturb(enabled);
}

// ==== ACCESSIBILITY SERVICE ====

export function isAccessibilityServiceEnabled(): boolean {
    return BreviSettings.isAccessibilityServiceEnabled();
}

export function requestAccessibilityPermission(): void {
    BreviSettings.requestAccessibilityPermission();
}

export function accessibilityClick(text: string): boolean {
    return BreviSettings.accessibilityClick(text);
}

export function accessibilityFind(text: string): boolean {
    return BreviSettings.accessibilityFind(text);
}

export function accessibilityHome(): boolean {
    return BreviSettings.accessibilityHome();
}

export function accessibilityBack(): boolean {
    return BreviSettings.accessibilityBack();
}

export function toggleFlashlight(enable: boolean): boolean {
    return BreviSettings.toggleFlashlight(enable);
}

export function startSensorService(): void {
    BreviSettings.startSensorService();
}

export function stopSensorService(): void {
    BreviSettings.stopSensorService();
}

// ==== APP LAUNCHER & INFO ====

/**
 * Launch an app by its package name
 * @param packageName The package name (e.g. com.netflix.mediaclient)
 * @returns true if successful, false if app not found/cannot be opened
 */
export function launchApp(packageName: string): boolean {
    return BreviSettings.launchApp(packageName);
}

/**
 * Get list of installed apps
 * @returns Array of strings in "AppName (package.name)" format
 */
export function getInstalledApps(): string[] {
    return BreviSettings.getInstalledApps();
}

// ==== AUTOMATION SERVICE CONTROL ====

/**
 * Start the background automation service
 * This keeps automations running even when app is closed
 */
export function startAutomationService(): boolean {
    return BreviSettings.startAutomationService?.() ?? false;
}

/**
 * Stop the background automation service
 */
export function stopAutomationService(): boolean {
    return BreviSettings.stopAutomationService?.() ?? false;
}

/**
 * Check if automation service is running
 */
export function isAutomationServiceRunning(): boolean {
    return BreviSettings.isAutomationServiceRunning?.() ?? false;
}

// ==== WIDGET MANAGEMENT ====

/**
 * @param widgetId The widget ID to update
 * @param configJson Optional JSON configuration string
 */
export function updateWidget(widgetId: string, configJson?: string): Promise<void> {
    return BreviSettings.updateWidget?.(widgetId, configJson) ?? Promise.resolve();
}

/**
 * Execute workflow from widget
 * @param shortcutId The shortcut/workflow ID to execute
 * @returns Promise that resolves when execution completes
 */
export function executeWidgetWorkflow(shortcutId: string): Promise<boolean> {
    return BreviSettings.executeWidgetWorkflow?.(shortcutId) ?? Promise.resolve(false);
}

/**
 * Open BreviAI app with custom intent
 * @param payload Custom payload data
 */
export function openBreviAI(payload: any): Promise<void> {
    return BreviSettings.openBreviAI?.(payload) ?? Promise.resolve();
}

/**
 * Execute system action from widget
 * @param action Action payload (mode, settings, etc.)
 */
export function executeSystemAction(action: any): Promise<void> {
    return BreviSettings.executeSystemAction?.(action) ?? Promise.resolve();
}

/**
 * Get widget configuration from native storage
 * @param widgetId Widget ID to retrieve config for
 */
export function getWidgetConfig(widgetId: string): Promise<any> {
    return BreviSettings.getWidgetConfig?.(widgetId) ?? Promise.resolve(null);
}

/**
 * Save widget configuration to native storage
 * @param widgetId Widget ID
 * @param config Widget configuration object
 */
export function saveWidgetConfig(widgetId: string, config: any): Promise<void> {
    return BreviSettings.saveWidgetConfig?.(widgetId, config) ?? Promise.resolve();
}


/**
 * Set Bluetooth state (requires permissions)
 * @param enable true for ON, false for OFF
 */
/**
 * Launch Bluetooth settings
 */
export function openBluetoothSettings(): Promise<boolean> {
    return BreviSettings.openBluetoothSettings?.() ?? Promise.resolve(false);
}

/**
 * Set system volume
 * @param level Volume level (0-100)
 * @param streamType Stream type (media, ringtone, alarm, notification, system, call)
 */
export function setVolume(level: number, streamType: string = 'media'): boolean {
    return BreviSettings.setVolume?.(level, streamType) ?? false;
}

/**
 * Get system volume
 * @param streamType Stream type
 * @returns Volume level (0-100) or -1 if failed
 */
export function getVolume(streamType: string = 'media'): number {
    return BreviSettings.getVolume?.(streamType) ?? -1;
}

// ==== BLUETOOTH CONTROL ====

/**
 * Set Bluetooth state (on/off)
 * @param enable true for ON, false for OFF
 * @returns true if successful
 * Note: On Android 12+, this opens Bluetooth settings instead of directly toggling
 */
export function setBluetooth(enable: boolean): boolean {
    return BreviSettings.setBluetooth?.(enable) ?? false;
}

/**
 * Check if Bluetooth is currently enabled
 * @returns true if Bluetooth is on
 */
export function isBluetoothEnabled(): boolean {
    return BreviSettings.isBluetoothEnabled?.() ?? false;
}

// ==== RINGER MODE CONTROL ====

/**
 * Set ringer mode
 * @param mode 0=silent, 1=vibrate, 2=normal
 * @returns true if successful
 */
export function setRingerMode(mode: number): boolean {
    return BreviSettings.setRingerMode?.(mode) ?? false;
}

/**
 * Get current ringer mode
 * @returns 0=silent, 1=vibrate, 2=normal, -1 if failed
 */
export function getRingerMode(): number {
    return BreviSettings.getRingerMode?.() ?? -1;
}

