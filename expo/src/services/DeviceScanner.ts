import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Network from 'expo-network';
import * as Battery from 'expo-battery';
// Safe import for native module
let BreviSettings: any = null;
try {
    BreviSettings = require('../../modules/brevi-settings');
} catch (e) {
    console.log('BreviSettings not available');
}
import { debugLog } from './DebugLogger';

export interface DeviceProfile {
    os: 'android' | 'ios' | 'web' | 'windows' | 'macos' | null;
    osVersion: string | null;
    model: string | null;
    brand: string | null;
    isRooted: boolean;
    hasNfc: boolean;
    hasTelephony: boolean;
    hasFlashlight: boolean;
    hasVibrator: boolean;
    batteryLevel: number | null;
    isLowPowerMode: boolean;
    appVersion: string | null;
    installedApps?: string[];
}

class DeviceScanner {
    private profile: DeviceProfile | null = null;

    async scan(): Promise<DeviceProfile> {
        console.log("DeviceScanner: Starting scan...");
        debugLog('info', 'Device Scan Started', { platform: Platform.OS });

        let batteryLevel = null;
        let isLowPowerMode = false;
        let installedApps: string[] = [];

        try {
            // Check battery with timeout or safety
            batteryLevel = await Battery.getBatteryLevelAsync().catch(e => {
                console.warn("Battery level fail", e);
                return null;
            });
            const powerState = await Battery.getPowerStateAsync().catch(e => ({ lowPowerMode: false }));
            isLowPowerMode = powerState.lowPowerMode;
        } catch (e) {
            console.warn("Battery check general failure", e);
        }

        try {
            // Only try native app fetch if BreviSettings is REAL, not a mock or missing
            if (Platform.OS === 'android' && BreviSettings && typeof BreviSettings.getInstalledApps === 'function') {
                console.log("DeviceScanner: Fetching apps via native module...");
                installedApps = await BreviSettings.getInstalledApps() || [];
                debugLog('info', 'Installed Apps Fetched', { count: installedApps.length });
            }
        } catch (e) {
            console.warn("Installed apps check failed", e);
        }

        const profile: DeviceProfile = {
            os: Platform.OS,
            osVersion: Device.osVersion,
            model: Device.modelName,
            brand: Device.brand,
            isRooted: false,
            hasNfc: Platform.OS === 'android',
            hasTelephony: true,
            hasFlashlight: true,
            hasVibrator: true,
            batteryLevel,
            isLowPowerMode,
            appVersion: Application.nativeApplicationVersion,
            installedApps,
        };

        this.profile = profile;
        console.log("DeviceScanner: Scan complete", { ...profile, installedApps: `[${installedApps.length} apps]` });
        debugLog('info', 'Device Scan Complete', { profile: { ...profile, installedApps: `[${installedApps.length} apps]` } });
        return profile;
    }

    getProfile(): DeviceProfile | null {
        return this.profile;
    }

    isFeatureSupported(feature: keyof DeviceProfile): boolean {
        if (!this.profile) return false;
        return !!this.profile[feature];
    }
}

export const deviceScanner = new DeviceScanner();
