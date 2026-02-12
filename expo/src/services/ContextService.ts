import { Platform } from 'react-native';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import { LightSensor, Barometer, Magnetometer, Pedometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { debugLog } from './DebugLogger';

export interface DeviceContext {
    timestamp: string;
    battery: {
        level: number | null;
        state: Battery.BatteryState | null;
        lowPowerMode: boolean;
    };
    network: {
        type: Network.NetworkStateType | null;
        isConnected: boolean | null;
        isInternetReachable: boolean | null;
    };
    location?: {
        latitude: number;
        longitude: number;
        accuracy: number | null;
    } | null;
    sensors: {
        light?: number;
        pressure?: number;
        altitude?: number;
        heading?: number;
        steps?: number;
    };
}

class ContextService {

    /**
     * Captures a full snapshot of the device context
     * (Battery, Network, Location, Sensors)
     */
    async getContext(): Promise<DeviceContext> {
        console.log('[ContextService] Gathering context...');
        const timestamp = new Date().toISOString();

        // Parallelize independent checks
        const [battery, network, sensors, location] = await Promise.all([
            this.getBatteryContext(),
            this.getNetworkContext(),
            this.getSensorSnapshot(),
            this.getLocationSnapshot() // This might be slow, consider timeout
        ]);

        const context = {
            timestamp,
            battery,
            network,
            location,
            sensors
        };

        debugLog('info', 'Context Gathered', context);
        return context;
    }

    private async getBatteryContext() {
        try {
            const level = await Battery.getBatteryLevelAsync();
            const state = await Battery.getBatteryStateAsync();
            const powerState = await Battery.getPowerStateAsync();
            return {
                level: Math.round(level * 100),
                state,
                lowPowerMode: powerState.lowPowerMode
            };
        } catch (e) {
            return { level: null, state: null, lowPowerMode: false };
        }
    }

    private async getNetworkContext() {
        try {
            const state = await Network.getNetworkStateAsync();
            return {
                type: state.type || null,
                isConnected: state.isConnected || false,
                isInternetReachable: state.isInternetReachable || false
            };
        } catch (e) {
            return { type: null, isConnected: false, isInternetReachable: false };
        }
    }

    private async getLocationSnapshot() {
        try {
            // Only get location if permission is already granted to avoid popup spam
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.LocationAccuracy.Low });
                return {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    accuracy: loc.coords.accuracy
                };
            }
        } catch (e) {
            // ignore location error
        }
        return null;
    }

    private async getSensorSnapshot() {
        // We need to subscribe briefly to get a value, then unsubscribe
        // Promise.race or manual timeout

        const getSensorValue = (sensor: any, key: string): Promise<any> => {
            return new Promise(resolve => {
                let sub: any = null;
                const timeout = setTimeout(() => {
                    if (sub) sub.remove();
                    resolve(null);
                }, 500); // 500ms max wait per sensor

                sub = sensor.addListener((data: any) => {
                    clearTimeout(timeout);
                    sub.remove();
                    resolve(key === 'light' ? data.illuminance :
                        key === 'barometer' ? { pressure: data.pressure, altitude: data.relativeAltitude } :
                            key === 'magnetometer' ? data : null);
                });
            });
        };

        // Pedometer is different (query based)
        const getSteps = async () => {
            try {
                if (await Pedometer.isAvailableAsync()) {
                    const end = new Date();
                    const start = new Date();
                    start.setHours(0, 0, 0, 0);
                    const result = await Pedometer.getStepCountAsync(start, end);
                    return result.steps;
                }
            } catch (e) { }
            return null;
        };

        const [light, baro, mag, steps] = await Promise.all([
            getSensorValue(LightSensor, 'light'),
            getSensorValue(Barometer, 'barometer'),
            getSensorValue(Magnetometer, 'magnetometer'),
            getSteps()
        ]);

        // Process Magnetometer to Heading
        let heading = undefined;
        if (mag) {
            let { x, y } = mag;
            if (Math.atan2(y, x) >= 0) {
                heading = Math.atan2(y, x) * (180 / Math.PI);
            } else {
                heading = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
            }
            heading = Math.round((heading - 90 + 360) % 360);
        }

        return {
            light: light ?? undefined,
            pressure: baro?.pressure,
            altitude: baro?.altitude,
            heading,
            steps: steps ?? undefined
        };
    }
}

export const contextService = new ContextService();
