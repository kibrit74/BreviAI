import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'workflow-execution';
const NOTIFICATION_ID = 'workflow-execution-notification';
const CATEGORY_ID = 'execution-control';

export const ACTION_PAUSE = 'PAUSE_ACTION';
export const ACTION_RESUME = 'RESUME_ACTION';
export const ACTION_STOP = 'STOP_ACTION';

type ActionListener = (actionId: string) => void;

class NotificationController {
    private static instance: NotificationController;
    private listeners: ActionListener[] = [];

    private constructor() { }

    static getInstance(): NotificationController {
        if (!NotificationController.instance) {
            NotificationController.instance = new NotificationController();
        }
        return NotificationController.instance;
    }

    async setup() {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
                name: 'Workflow Execution',
                importance: Notifications.AndroidImportance.LOW, // Low importance to avoid sound/vibration on updates
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
            {
                identifier: ACTION_PAUSE,
                buttonTitle: '⏸️ Duraklat',
                options: {
                    isDestructive: false,
                    isAuthenticationRequired: false,
                },
            },
            {
                identifier: ACTION_RESUME,
                buttonTitle: '▶️ Devam Et',
                options: {
                    isDestructive: false,
                    isAuthenticationRequired: false,
                },
            },
            {
                identifier: ACTION_STOP,
                buttonTitle: '⏹️ Durdur',
                options: {
                    isDestructive: true,
                    isAuthenticationRequired: false,
                },
            },
        ]);

        // Global response listener
        Notifications.addNotificationResponseReceivedListener(response => {
            const actionId = response.actionIdentifier;
            if (
                actionId === ACTION_PAUSE ||
                actionId === ACTION_RESUME ||
                actionId === ACTION_STOP
            ) {
                this.notifyListeners(actionId);
            }
        });
    }

    async showExecutionNotification(title: string, message: string, isPaused: boolean) {
        // Adjust actions based on state
        // Note: Expo Notifications category actions are static definition. 
        // We can't dynamically change actions for the same category easily per notification instance 
        // without defining multiple categories.
        // Or we can just show all 3, but that's cluttered.
        // Let's try defining two categories: 'execution-running' and 'execution-paused'

        const categoryId = isPaused ? 'execution-paused' : 'execution-running';

        await this.ensureCategories(); // Ensure categories exist

        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body: message,
                data: { isExecutionNotification: true },
                categoryIdentifier: categoryId,
                sticky: true, // Android specific: persistent
                autoDismiss: false,
            },
            trigger: null, // Immediate
            identifier: NOTIFICATION_ID // Use fixed ID to update existing
        });
    }

    async cancelExecutionNotification() {
        await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
    }

    addActionListener(listener: ActionListener) {
        this.listeners.push(listener);
    }

    removeActionListener(listener: ActionListener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private notifyListeners(actionId: string) {
        this.listeners.forEach(listener => listener(actionId));
    }

    // Helper to define dynamic categories properly
    private async ensureCategories() {
        await Notifications.setNotificationCategoryAsync('execution-running', [
            {
                identifier: ACTION_PAUSE,
                buttonTitle: '⏸️ Duraklat',
                options: { isDestructive: false, isAuthenticationRequired: false },
            },
            {
                identifier: ACTION_STOP,
                buttonTitle: '⏹️ Durdur',
                options: { isDestructive: true, isAuthenticationRequired: false },
            },
        ]);

        await Notifications.setNotificationCategoryAsync('execution-paused', [
            {
                identifier: ACTION_RESUME,
                buttonTitle: '▶️ Devam Et',
                options: { isDestructive: false, isAuthenticationRequired: false },
            },
            {
                identifier: ACTION_STOP,
                buttonTitle: '⏹️ Durdur',
                options: { isDestructive: true, isAuthenticationRequired: false },
            },
        ]);
    }
}

export const notificationController = NotificationController.getInstance();
