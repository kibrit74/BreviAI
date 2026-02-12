/**
 * Geofence Service - Background Location Monitoring
 * n8n-inspired geofence implementation with React Native/Expo
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkflowEngine } from './WorkflowEngine';
import { WorkflowStorage } from './WorkflowStorage';

// Background task name for geofencing
export const GEOFENCE_TASK_NAME = 'breviai-geofence-task';

export interface GeofenceConfig {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number; // meters
    type: 'circular' | 'polygon';
    coordinates?: [number, number][];
    transition: 'enter' | 'exit' | 'both';
    isActive: boolean;
    createdAt: number;
    workflowId?: string; // Workflow to trigger
}

export interface GeofenceEvent {
    geofenceId: string;
    event: 'enter' | 'exit';
    latitude: number;
    longitude: number;
    timestamp: number;
    distance?: number; // Distance from center
}

export interface GeofenceTrigger {
    geofenceId: string;
    event: 'enter' | 'exit';
    workflowId?: string;
    debounceTime: number;
    variableName?: string;
    isActive: boolean;
}

export class GeofenceService {
    private static instance: GeofenceService;
    private isMonitoring: boolean = false;
    private locationSubscription: Location.LocationSubscription | null = null;
    private geofences: Map<string, GeofenceConfig> = new Map();
    private triggers: Map<string, GeofenceTrigger> = new Map();
    private lastTriggeredEvents: Map<string, number> = new Map(); // For debouncing
    private _workflowEngine: WorkflowEngine | null = null;
    private watchPositionId: string | null = null;

    private constructor() {
        // Lazy load in constructor to avoid circular dependency
        // WorkflowEngine will be initialized on first use
        this.loadStoredData();
    }

    // Lazy getter for WorkflowEngine
    private get workflowEngine(): WorkflowEngine {
        if (!this._workflowEngine) {
            this._workflowEngine = WorkflowEngine.getInstance();
        }
        return this._workflowEngine;
    }

    static getInstance(): GeofenceService {
        if (!GeofenceService.instance) {
            GeofenceService.instance = new GeofenceService();
        }
        return GeofenceService.instance;
    }

    /**
     * Create a new geofence
     */
    async createGeofence(config: Omit<GeofenceConfig, 'id' | 'isActive' | 'createdAt'>): Promise<GeofenceConfig> {
        const geofence: GeofenceConfig = {
            ...config,
            id: `geofence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isActive: true,
            createdAt: Date.now()
        };

        this.geofences.set(geofence.id, geofence);
        await this.saveGeofence(geofence);

        // Start monitoring if not already running
        if (!this.isMonitoring) {
            await this.startMonitoring();
        }

        return geofence;
    }

    /**
     * Register a geofence trigger for workflow execution
     */
    async registerTrigger(trigger: GeofenceTrigger): Promise<void> {
        this.triggers.set(trigger.geofenceId, trigger);
        await this.saveTrigger(trigger);
    }

    /**
     * Start background geofence monitoring
     */
    async startMonitoring(): Promise<void> {
        try {
            // Request location permissions
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Konum izni verilmedi');
            }

            // Request background location permissions
            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
            if (bgStatus !== 'granted') {
                console.warn('[Geofence] Background konum izni verilmedi - sadece foreground çalışacak');
            }

            // Start location updates
            this.locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 5000, // 5 seconds
                    distanceInterval: 10, // 10 meters
                },
                (location) => this.handleLocationUpdate(location)
            );

            this.isMonitoring = true;
            console.log('[Geofence] Monitoring started');

        } catch (error) {
            console.error('[Geofence] Failed to start monitoring:', error);
            throw error;
        }
    }

    /**
     * Stop geofence monitoring
     */
    async stopMonitoring(): Promise<void> {
        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }

        this.isMonitoring = false;
        console.log('[Geofence] Monitoring stopped');
    }

    /**
     * Handle location updates and check geofence transitions
     */
    private async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
        const { latitude, longitude } = location.coords;
        const timestamp = Date.now();

        // Check all active geofences
        for (const [geofenceId, geofence] of this.geofences) {
            if (!geofence.isActive) continue;

            const distance = this.calculateDistance(
                latitude, longitude,
                geofence.latitude, geofence.longitude
            );

            const isInside = distance <= geofence.radius;
            const wasInside = this.isLocationInsideGeofence(geofenceId);

            // Detect transition
            if (isInside && !wasInside) {
                // ENTER event
                await this.handleGeofenceEvent({
                    geofenceId,
                    event: 'enter',
                    latitude,
                    longitude,
                    timestamp,
                    distance
                });
            } else if (!isInside && wasInside) {
                // EXIT event
                await this.handleGeofenceEvent({
                    geofenceId,
                    event: 'exit',
                    latitude,
                    longitude,
                    timestamp,
                    distance
                });
            }
        }
    }

    /**
     * Handle geofence transition events
     */
    private async handleGeofenceEvent(event: GeofenceEvent): Promise<void> {
        const triggerKey = `${event.geofenceId}_${event.event}`;
        const now = Date.now();

        // Debounce check
        const trigger = this.triggers.get(event.geofenceId);
        if (trigger) {
            const lastTriggered = this.lastTriggeredEvents.get(triggerKey) || 0;
            if (now - lastTriggered < trigger.debounceTime) {
                console.log(`[Geofence] Debounced ${event.event} for ${event.geofenceId}`);
                return;
            }
        }

        // Update last triggered time
        this.lastTriggeredEvents.set(triggerKey, now);

        console.log(`[Geofence] ${event.event.toUpperCase()} event:`, {
            geofenceId: event.geofenceId,
            location: { lat: event.latitude, lng: event.longitude },
            distance: event.distance
        });

        // Update geofence state
        this.updateGeofenceState(event.geofenceId, event.event === 'enter');

        // Execute associated workflow if configured
        if (trigger?.workflowId) {
            await this.executeWorkflow(trigger.workflowId, event);
        }

        // Emit event for other parts of the app
        this.emitGeofenceEvent(event);
    }

    /**
     * Execute workflow when geofence is triggered
     */
    private async executeWorkflow(workflowId: string, event: GeofenceEvent): Promise<void> {
        try {
            console.log(`[Geofence] Executing workflow ${workflowId} for ${event.event}`);

            // Get geofence details
            const geofence = this.geofences.get(event.geofenceId);

            // Load workflow from storage
            const workflow = await WorkflowStorage.getById(workflowId);
            if (!workflow) {
                console.error('[Geofence] Workflow not found:', workflowId);
                return;
            }

            // Prepare trigger variables
            const triggerVariables = {
                _triggerType: `geofence_${event.event}`,
                _geofenceEvent: event.event,
                _geofenceId: event.geofenceId,
                _geofenceName: geofence?.name || 'Unknown',
                _latitude: event.latitude,
                _longitude: event.longitude,
                _distance: event.distance,
                _eventTime: new Date(event.timestamp).toISOString()
            };

            // Execute workflow with trigger variables
            await this.workflowEngine.execute(workflow, triggerVariables);
            console.log('[Geofence] Workflow executed successfully');

        } catch (error) {
            console.error('[Geofence] Workflow execution failed:', error);
        }
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371000; // Earth's radius in meters
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Check if current location is inside a geofence
     */
    private isLocationInsideGeofence(geofenceId: string): boolean {
        const stateKey = `${geofenceId}_state`;
        return this.lastTriggeredEvents.has(stateKey);
    }

    /**
     * Update geofence state storage
     */
    private updateGeofenceState(geofenceId: string, isInside: boolean): void {
        const stateKey = `${geofenceId}_state`;
        if (isInside) {
            this.lastTriggeredEvents.set(stateKey, Date.now());
        } else {
            this.lastTriggeredEvents.delete(stateKey);
        }
    }

    /**
     * Emit geofence event for global listeners
     */
    private emitGeofenceEvent(event: GeofenceEvent): void {
        // This could emit to a global event bus or React Native event emitter
        console.log('[Geofence] Emitting event:', event);
        // In a real implementation, you might use:
        // DeviceEventEmitter.emit('geofenceEvent', event);
    }

    /**
     * Storage operations
     */
    private async saveGeofence(geofence: GeofenceConfig): Promise<void> {
        try {
            const key = `geofence_${geofence.id}`;
            await AsyncStorage.setItem(key, JSON.stringify(geofence));
        } catch (error) {
            console.error('[Geofence] Failed to save geofence:', error);
        }
    }

    private async saveTrigger(trigger: GeofenceTrigger): Promise<void> {
        try {
            const key = `trigger_${trigger.geofenceId}`;
            await AsyncStorage.setItem(key, JSON.stringify(trigger));
        } catch (error) {
            console.error('[Geofence] Failed to save trigger:', error);
        }
    }

    private async loadStoredData(): Promise<void> {
        try {
            // Load all keys from AsyncStorage
            const keys = await AsyncStorage.getAllKeys();
            const geofenceKeys = keys.filter(key => key.startsWith('geofence_'));
            const triggerKeys = keys.filter(key => key.startsWith('trigger_'));

            // Load geofences
            for (const key of geofenceKeys) {
                const data = await AsyncStorage.getItem(key);
                if (data) {
                    const geofence = JSON.parse(data);
                    this.geofences.set(geofence.id, geofence);
                }
            }

            // Load triggers
            for (const key of triggerKeys) {
                const data = await AsyncStorage.getItem(key);
                if (data) {
                    const trigger = JSON.parse(data);
                    this.triggers.set(trigger.geofenceId, trigger);
                }
            }

            console.log(`[Geofence] Loaded ${this.geofences.size} geofences and ${this.triggers.size} triggers`);

        } catch (error) {
            console.error('[Geofence] Failed to load stored data:', error);
        }
    }

    /**
     * Get all geofences
     */
    getGeofences(): GeofenceConfig[] {
        return Array.from(this.geofences.values());
    }

    /**
     * Get geofence by ID
     */
    getGeofence(id: string): GeofenceConfig | undefined {
        return this.geofences.get(id);
    }

    /**
     * Delete geofence
     */
    async deleteGeofence(id: string): Promise<void> {
        this.geofences.delete(id);
        this.triggers.delete(id);

        try {
            await AsyncStorage.removeItem(`geofence_${id}`);
            await AsyncStorage.removeItem(`trigger_${id}`);
            console.log(`[Geofence] Deleted geofence ${id}`);
        } catch (error) {
            console.error('[Geofence] Failed to delete geofence:', error);
        }
    }

    /**
     * Get monitoring status
     */
    isActive(): boolean {
        return this.isMonitoring;
    }
}