import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the task first (Must be in global scope)
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('[BackgroundService] Task Error:', error);
        return;
    }
    if (data) {
        const { locations } = data as any;
        console.log('[BackgroundService] Still alive. Location update received:', locations?.length);

        // Trigger Telegram polling check
        try {
            const { telegramPollingService } = require('./TelegramPollingService');
            // Use pollOnce() and AWAIT IT to ensure task stays alive during fetch
            await telegramPollingService.pollOnce();
        } catch (e) {
            console.warn('[BackgroundService] Telegram polling error:', e);
        }

        // Trigger WhatsApp backend polling check
        try {
            const { whatsappPollingService } = require('./WhatsAppPollingService');
            await whatsappPollingService.pollOnce();
        } catch (e) {
            console.warn('[BackgroundService] WhatsApp polling error:', e);
        }
    }
});

export const backgroundService = {
    async startForegroundService() {
        try {
            console.log('[BackgroundService] ========== START FOREGROUND SERVICE ==========');
            console.log('[BackgroundService] Requesting foreground permissions...');

            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            console.log('[BackgroundService] Foreground permission status:', foregroundStatus);

            if (foregroundStatus !== 'granted') {
                console.log('[BackgroundService] Foreground permission DENIED');
                Alert.alert('İzin Reddedildi', 'Arka planda çalışmak için konum izni gereklidir.');
                return false;
            }

            console.log('[BackgroundService] Requesting background permissions...');
            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            console.log('[BackgroundService] Background permission status:', backgroundStatus);

            if (backgroundStatus !== 'granted') {
                console.log('[BackgroundService] Background permission DENIED');
                Alert.alert('Arka Plan İzni', 'Uygulamanın kapanmaması için "Her Zaman İzin Ver" seçeneğini seçmelisiniz.');
                return false;
            }

            console.log('[BackgroundService] Both permissions granted, starting location updates...');

            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 15000, // Update every 15 seconds
                distanceInterval: 0, // FORCE TRIGGER EVEN IF STATIONARY
                deferredUpdatesInterval: 15000, // Minimal interval for batching
                deferredUpdatesDistance: 0, // Minimal distance for batching
                foregroundService: {
                    notificationTitle: "BreviAI Çalışıyor 🛡️",
                    notificationBody: "Otomasyonlarınız arka planda aktif.",
                    notificationColor: "#6366F1"
                },
                showsBackgroundLocationIndicator: true,
                pausesUpdatesAutomatically: false
            });

            console.log('[BackgroundService] ========== SERVICE STARTED SUCCESSFULLY ==========');
            return true;
        } catch (error) {
            console.error('[BackgroundService] ========== START ERROR ==========');
            console.error('[BackgroundService] Error type:', error?.constructor?.name);
            console.error('[BackgroundService] Error message:', (error as Error).message);
            console.error('[BackgroundService] Full error:', JSON.stringify(error, null, 2));
            Alert.alert('Hata', 'Servis başlatılamadı: ' + (error as Error).message);
            return false;
        }
    },

    async stopForegroundService() {
        try {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (hasStarted) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                console.log('[BackgroundService] Service stopped.');
            }
        } catch (error) {
            console.error('[BackgroundService] Stop Error:', error);
        }
    }
};
