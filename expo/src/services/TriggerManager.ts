import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';

const STORAGE_KEY = 'brevi_automation_triggers';
const BACKGROUND_FETCH_TASK = 'background-fetch-task';

export type TriggerType = 'TIME' | 'BATTERY' | 'LOCATION';

export interface Trigger {
    id: string;
    name: string;
    type: TriggerType;
    isActive: boolean;
    shortcutId: string;
    conditions: {
        // TIME
        time?: string; // "22:00"
        days?: number[]; // [1, 2, 3, 4, 5] (Mon-Fri)

        // BATTERY
        batteryLevel?: number; // 20
        batteryState?: Battery.BatteryState;
        operator?: '<' | '>' | '==';

        // LOCATION
        latitude?: number;
        longitude?: number;
        radius?: number;
    };
    lastExecuted?: string;
}

export class TriggerManager {
    /**
     * Initialize background tasks
     */
    static async init() {
        try {
            await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
                minimumInterval: 15 * 60, // 15 minutes
                stopOnTerminate: false,
                startOnBoot: true,
            });
            console.log("Background fetch task registered");
        } catch (err) {
            console.log("Task Register failed:", err);
        }
    }

    /**
     * Save a new trigger
     */
    static async save(trigger: Omit<Trigger, 'id' | 'isActive'>): Promise<Trigger> {
        const triggers = await this.getAll();

        const newTrigger: Trigger = {
            id: `trig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isActive: true,
            ...trigger
        };

        triggers.push(newTrigger);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(triggers));

        await this.registerSystemTrigger(newTrigger);

        return newTrigger;
    }

    /**
     * Get all triggers
     */
    static async getAll(): Promise<Trigger[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading triggers:', error);
            return [];
        }
    }

    /**
     * Toggle trigger active state
     */
    static async toggle(id: string): Promise<boolean> {
        const triggers = await this.getAll();
        const index = triggers.findIndex(t => t.id === id);

        if (index !== -1) {
            triggers[index].isActive = !triggers[index].isActive;
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(triggers));

            if (triggers[index].isActive) {
                await this.registerSystemTrigger(triggers[index]);
            } else {
                await this.unregisterSystemTrigger(triggers[index]);
            }

            return triggers[index].isActive;
        }
        return false;
    }

    /**
     * Delete a trigger
     */
    static async delete(id: string): Promise<void> {
        const triggers = await this.getAll();
        const trigger = triggers.find(t => t.id === id);
        if (trigger) {
            await this.unregisterSystemTrigger(trigger);
        }

        const filtered = triggers.filter(t => t.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }

    // ==== EVALUATION LOGIC ====

    /**
     * Evaluate battery triggers
     */
    static async checkBatteryTriggers(): Promise<string[]> {
        try {
            const triggers = await this.getAll();
            const batteryTriggers = triggers.filter(t => t.isActive && t.type === 'BATTERY');

            const executableTriggerIds: string[] = [];

            if (batteryTriggers.length > 0) {
                const level = await Battery.getBatteryLevelAsync();
                const batteryPercent = Math.round(level * 100);

                for (const trig of batteryTriggers) {
                    if (trig.conditions.operator === '<' && batteryPercent < (trig.conditions.batteryLevel || 0)) {
                        executableTriggerIds.push(trig.id);
                    }
                }
            }

            // Also check location triggers piggybacking on this fetch
            const locationTriggers = triggers.filter(t => t.isActive && t.type === 'LOCATION');
            if (locationTriggers.length > 0) {
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        for (const trig of locationTriggers) {
                            if (trig.conditions.latitude && trig.conditions.longitude && trig.conditions.radius) {
                                // Simple distance calc (Haversine not implemented here, using simple delta for now or assuming close enough)
                                // To be robust this needs a distance function
                                // Placeholder logic for now to prevent compiling errors if we tried to do math
                            }
                        }
                    }
                } catch (e) {
                    // ignore location errors in background fetch
                }
            }

            return executableTriggerIds;
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    // ==== SYSTEM REGISTRATION ====

    private static async registerSystemTrigger(trigger: Trigger) {
        if (trigger.type === 'TIME' && trigger.conditions.time) {
            const [hour, minute] = trigger.conditions.time.split(':').map(Number);

            try {
                await Notifications.scheduleNotificationAsync({
                    identifier: trigger.id,
                    content: {
                        title: "Otomasyon Zamanı",
                        body: `"${trigger.name}" kısayolu çalıştırılıyor...`,
                        data: { shortcutId: trigger.shortcutId }
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                        hour,
                        minute,
                        repeats: true,
                    },
                });
                console.log('Scheduled notification for:', trigger.id);
            } catch (e) {
                console.error('Failed to schedule:', e);
            }
        }
    }

    private static async unregisterSystemTrigger(trigger: Trigger) {
        if (trigger.type === 'TIME') {
            try {
                await Notifications.cancelScheduledNotificationAsync(trigger.id);
                console.log('Cancelled notification for:', trigger.id);
            } catch (e) {
                console.error('Failed to cancel:', e);
            }
        }
    }
}

// Define the task for background fetch AFTER the class is defined
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    try {
        const triggers = await TriggerManager.checkBatteryTriggers();
        if (triggers.length > 0) {
            // In a real app, we would execute the shortcut here
            // For now, we will just send a notification
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Otomasyon Tetiklendi",
                    body: `${triggers.length} adet pil otomasyonu çalıştırıldı.`,
                },
                trigger: null,
            });
            return BackgroundFetch.BackgroundFetchResult.NewData;
        }
        return BackgroundFetch.BackgroundFetchResult.NoData;
    } catch (error) {
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});
