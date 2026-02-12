/**
 * State Node Executors - BaseNodeExecutor Pattern
 * Location, Battery, Network node'ları
 */

import { BaseNodeExecutor, ExecutionContext, NodeResult } from './BaseNodeExecutor';
import { LocationGetConfig, BatteryCheckConfig, NetworkCheckConfig } from '../../types/workflow-types';
import { ErrorCode } from '../../utils';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';

/**
 * Location Get Executor
 */
export class LocationGetExecutor extends BaseNodeExecutor<LocationGetConfig> {
    constructor() {
        super('LocationGet');
    }

    async execute(config: LocationGetConfig, ctx: ExecutionContext): Promise<NodeResult> {
        try {
            // İzin kontrolü
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return this.failure('Konum izni verilmedi', ErrorCode.LOCATION_PERMISSION);
            }

            const accuracyMap: Record<string, Location.Accuracy> = {
                low: Location.Accuracy.Low,
                medium: Location.Accuracy.Balanced,
                high: Location.Accuracy.High,
            };

            const timeout = 5000;
            const locationPromise = Location.getCurrentPositionAsync({
                accuracy: accuracyMap[config.accuracy || 'medium'],
            });

            const location = await Promise.race([
                locationPromise,
                new Promise<null>((resolve) => setTimeout(() => resolve(null), timeout))
            ]) as Location.LocationObject | null;

            let coords = location?.coords;
            let source = 'gps';

            if (!coords) {
                const lastKnown = await Location.getLastKnownPositionAsync();
                if (!lastKnown) {
                    return this.failure('Konum alınamadı (Zaman aşımı)', ErrorCode.TIMEOUT);
                }
                coords = lastKnown.coords;
                source = 'last_known';
            }

            const result = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                altitude: coords.altitude,
                accuracy: coords.accuracy,
                source,
                mapsUrl: `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
            };

            this.setVariable(ctx, config.variableName, result);
            return this.success(result);
        } catch (error) {
            return this.fromError(error, 'location_get');
        }
    }
}

/**
 * Battery Check Executor
 */
export class BatteryCheckExecutor extends BaseNodeExecutor<BatteryCheckConfig> {
    constructor() {
        super('BatteryCheck');
    }

    async execute(config: BatteryCheckConfig, ctx: ExecutionContext): Promise<NodeResult> {
        try {
            const level = await Battery.getBatteryLevelAsync();
            const state = await Battery.getBatteryStateAsync();

            const result = {
                level: Math.round(level * 100),
                isCharging: state === Battery.BatteryState.CHARGING,
                state: Battery.BatteryState[state],
            };

            this.setVariable(ctx, config.variableName, result);
            return this.success(result);
        } catch (error) {
            return this.fromError(error, 'battery_check');
        }
    }
}

/**
 * Network Check Executor
 */
export class NetworkCheckExecutor extends BaseNodeExecutor<NetworkCheckConfig> {
    constructor() {
        super('NetworkCheck');
    }

    async execute(config: NetworkCheckConfig, ctx: ExecutionContext): Promise<NodeResult> {
        try {
            const networkState = await Network.getNetworkStateAsync();

            let isConnected = false;
            switch (config.checkType) {
                case 'wifi':
                    isConnected = networkState.type === Network.NetworkStateType.WIFI;
                    break;
                case 'cellular':
                    isConnected = networkState.type === Network.NetworkStateType.CELLULAR;
                    break;
                case 'any':
                default:
                    isConnected = networkState.isConnected === true;
                    break;
            }

            const result = {
                isConnected,
                type: networkState.type,
                isInternetReachable: networkState.isInternetReachable,
            };

            this.setVariable(ctx, config.variableName, result);
            return this.success(result);
        } catch (error) {
            return this.fromError(error, 'network_check');
        }
    }
}

// Singleton instances
export const locationGetExecutor = new LocationGetExecutor();
export const batteryCheckExecutor = new BatteryCheckExecutor();
export const networkCheckExecutor = new NetworkCheckExecutor();
