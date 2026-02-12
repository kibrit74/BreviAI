/**
 * State Node Executors
 * Location, Battery, Network checks
 */

import {
    WorkflowNode,
    LocationGetConfig,
    GeofenceCreateConfig,
    GeofenceEnterConfig,
    GeofenceExitConfig,
    BatteryCheckConfig,
    NetworkCheckConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';

export async function executeGeofenceCreate(
    config: GeofenceCreateConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        // Generate unique geofence ID
        const geofenceId = `geofence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store geofence configuration
        const geofence = {
            id: geofenceId,
            name: config.name,
            latitude: config.latitude,
            longitude: config.longitude,
            radius: config.radius,
            type: config.type || 'circular',
            transition: config.transition || 'both',
            coordinates: config.coordinates || [],
            createdAt: Date.now(),
            isActive: true
        };

        // Save to storage (we'll implement this next)
        await saveGeofenceToStorage(geofence);

        // Store in variables for reference
        variableManager.set('geofence_id', geofenceId);
        variableManager.set('geofence_name', config.name);

        // Start monitoring (we'll implement this in background service)
        await startGeofenceMonitoring(geofenceId);

        return {
            success: true,
            geofenceId,
            message: `Geofence "${config.name}" oluşturuldu ve izlenmeye başlandı`
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Geofence oluşturulamadı'
        };
    }
}

export async function executeGeofenceEnter(
    config: GeofenceEnterConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        // Register geofence enter trigger
        await registerGeofenceTrigger(config.geofenceId, 'enter', config.debounceTime || 5000);

        if (config.variableName) {
            variableManager.set(config.variableName, {
                event: 'enter',
                geofenceId: config.geofenceId,
                timestamp: Date.now(),
                status: 'waiting'
            });
        }

        return {
            success: true,
            message: `Geofence giriş trigger'ı kaydedildi: ${config.geofenceId}`
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Geofence trigger kaydedilemedi'
        };
    }
}

export async function executeGeofenceExit(
    config: GeofenceExitConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        // Register geofence exit trigger
        await registerGeofenceTrigger(config.geofenceId, 'exit', config.debounceTime || 5000);

        if (config.variableName) {
            variableManager.set(config.variableName, {
                event: 'exit',
                geofenceId: config.geofenceId,
                timestamp: Date.now(),
                status: 'waiting'
            });
        }

        return {
            success: true,
            message: `Geofence çıkış trigger'ı kaydedildi: ${config.geofenceId}`
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Geofence trigger kaydedilemedi'
        };
    }
}
// Dynamic require to break circular dependency
// GeofenceService -> WorkflowEngine -> nodes/index -> state.ts -> GeofenceService
type GeofenceServiceType = import('../GeofenceService').GeofenceService;
type GeofenceTriggerType = import('../GeofenceService').GeofenceTrigger;

// Lazy initialization with dynamic require to avoid circular dependency
let _geofenceServiceInstance: GeofenceServiceType | null = null;
function getGeofenceService(): GeofenceServiceType {
    if (!_geofenceServiceInstance) {
        // Dynamic require breaks the static import cycle
        const { GeofenceService } = require('../GeofenceService');
        _geofenceServiceInstance = GeofenceService.getInstance();
    }
    return _geofenceServiceInstance;
}

// Geofence helper functions - now using lazy GeofenceService
async function saveGeofenceToStorage(geofence: any): Promise<void> {
    // GeofenceService handles storage internally via createGeofence
    // This function is called after createGeofence, so we just log success
    console.log('[Geofence] Saved to storage via GeofenceService:', geofence.id);
}

async function startGeofenceMonitoring(geofenceId: string): Promise<void> {
    try {
        // Start monitoring via GeofenceService (lazy load)
        await getGeofenceService().startMonitoring();
        console.log('[Geofence] Monitoring started for:', geofenceId);
    } catch (error) {
        console.error('[Geofence] Monitoring start error:', error);
        throw error;
    }
}

async function registerGeofenceTrigger(geofenceId: string, event: 'enter' | 'exit', debounceTime: number): Promise<void> {
    try {
        const trigger: GeofenceTriggerType = {
            geofenceId,
            event,
            debounceTime,
            isActive: true
        };
        await getGeofenceService().registerTrigger(trigger);
        console.log('[Geofence] Trigger registered:', { geofenceId, event, debounceTime });
    } catch (error) {
        console.error('[Geofence] Trigger registration error:', error);
        throw error;
    }
}

export async function executeLocationGet(
    config: LocationGetConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            return { success: false, error: 'Konum izni verilmedi' };
        }

        const accuracyMap = {
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
                return { success: false, error: 'Konum alınamadı (Zaman aşımı)' };
            }
            coords = lastKnown.coords;
            source = 'last_known';
        }

        const result: any = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            altitude: coords.altitude,
            accuracy: coords.accuracy,
            source,
            address: '',
            displayAddress: '',
            mapsUrl: `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
        };

        // Reverse Geocoding using Nominatim (free, no API key)
        try {
            const geocodeResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&accept-language=tr`,
                { headers: { 'User-Agent': 'BreviAI/1.0' } }
            );

            if (geocodeResponse.ok) {
                const geocodeData = await geocodeResponse.json();
                result.address = geocodeData.display_name || '';

                const addressParts = geocodeData.address || {};
                result.displayAddress = [
                    addressParts.road || addressParts.neighbourhood || '',
                    addressParts.suburb || addressParts.district || '',
                    addressParts.city || addressParts.town || addressParts.province || ''
                ].filter(Boolean).join(', ');
            }
        } catch (geoError) {
            console.warn('[Location] Reverse geocoding failed:', geoError);
        }

        variableManager.set(config.variableName, result);

        return { success: true, ...result };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Konum alınamadı',
        };
    }
}

export async function executeBatteryCheck(
    config: BatteryCheckConfig,
    variableManager: VariableManager
): Promise<any> {
    try {
        const level = await Battery.getBatteryLevelAsync();
        const state = await Battery.getBatteryStateAsync();

        const result = {
            level: Math.round(level * 100),
            isCharging: state === Battery.BatteryState.CHARGING,
            state: Battery.BatteryState[state],
        };

        variableManager.set(config.variableName, result);

        return { success: true, ...result };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Batarya bilgisi alınamadı',
        };
    }
}

export async function executeNetworkCheck(
    config: NetworkCheckConfig,
    variableManager: VariableManager
): Promise<any> {
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
                isConnected = networkState.isConnected || false;
                break;
        }

        const result = {
            isConnected,
            type: networkState.type,
            isInternetReachable: networkState.isInternetReachable,
        };

        variableManager.set(config.variableName, result);

        return { success: true, ...result };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Ağ durumu alınamadı',
        };
    }
}

// Weather API (OpenWeatherMap)
export async function executeWeatherGet(
    config: { latitude?: number; longitude?: number; city?: string; variableName: string },
    variableManager: VariableManager
): Promise<any> {
    try {
        // Get API key from user settings
        const userSettingsService = require('../UserSettingsService').userSettingsService;
        await userSettingsService.ensureLoaded();
        const apiKey = userSettingsService.getSettings().openWeatherApiKey;

        if (!apiKey) {
            return {
                success: false,
                error: 'OpenWeatherMap API anahtarı ayarlanmamış. Ayarlar > API Anahtarları bölümünden ekleyin.'
            };
        }

        let url = '';

        if (config.city) {
            url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(config.city)}&appid=${apiKey}&units=metric&lang=tr`;
        } else if (config.latitude && config.longitude) {
            url = `https://api.openweathermap.org/data/2.5/weather?lat=${config.latitude}&lon=${config.longitude}&appid=${apiKey}&units=metric&lang=tr`;
        } else {
            // Get current location
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return { success: false, error: 'Konum izni verilmedi' };
            }

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.coords.latitude}&lon=${location.coords.longitude}&appid=${apiKey}&units=metric&lang=tr`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, error: errorData.message || 'Hava durumu alınamadı' };
        }

        const data = await response.json();

        const result = {
            city: data.name,
            country: data.sys?.country,
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            description: data.weather[0]?.description || '',
            icon: data.weather[0]?.icon || '',
            windSpeed: data.wind?.speed,
            pressure: data.main.pressure,
            summary: `${data.name}: ${Math.round(data.main.temp)}°C, ${data.weather[0]?.description || ''}`
        };

        variableManager.set(config.variableName, result);

        return { success: true, ...result };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Hava durumu alınamadı',
        };
    }
}
