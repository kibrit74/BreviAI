const { withAndroidManifest } = require('@expo/config-plugins');

const withNotificationListener = (config) => {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;

        // 1. Add BIND_NOTIFICATION_LISTENER_SERVICE permission to the service
        // This library typically requires defining a service that extends NotificationListenerService
        // The library handles the service definition internally via its own AndroidManifest,
        // but we might need to ensure the permission is requested by the app.

        // Actually, react-native-android-notification-listener's documentation says:
        // "You need to add the service to your AndroidManifest.xml"

        const mainApplication = androidManifest.manifest.application[0];

        // Check if service already exists to avoid duplicates
        let serviceExists = false;
        if (mainApplication.service) {
            serviceExists = mainApplication.service.some(
                (service) => service.$['android:name'] === 'com.leandrosimonato.reactnativeandroidnotificationlistener.RNAndroidNotificationListenerHeadlessJsTaskService'
            );
        }

        if (!serviceExists) {
            if (!mainApplication.service) mainApplication.service = [];

            // Headless JS Task Service (For background execution)
            mainApplication.service.push({
                $: {
                    'android:name': 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListenerHeadlessJsTaskService',
                    'android:enabled': 'true',
                    'android:exported': 'true',
                },
            });

            // The actual Notification Listener Service
            mainApplication.service.push({
                $: {
                    'android:name': 'com.lesimoes.androidnotificationlistener.RNAndroidNotificationListenerService',
                    'android:label': 'RNAndroidNotificationListener',
                    'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
                    'android:exported': 'true'
                },
                'intent-filter': [
                    {
                        action: [
                            {
                                $: {
                                    'android:name': 'android.service.notification.NotificationListenerService',
                                },
                            },
                        ],
                    },
                ],
            });
        }

        return config;
    });
};

module.exports = withNotificationListener;
