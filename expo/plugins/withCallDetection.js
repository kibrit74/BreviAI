const { withAndroidManifest } = require('@expo/config-plugins');

const withCallDetection = (config) => {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;

        // Add permissions
        const permissionsToAdd = [
            'android.permission.READ_PHONE_STATE',
            'android.permission.ANSWER_PHONE_CALLS' // Optional, for future use
        ];

        if (!androidManifest.manifest['uses-permission']) {
            androidManifest.manifest['uses-permission'] = [];
        }

        permissionsToAdd.forEach(permission => {
            // Check if permission already exists
            const exists = androidManifest.manifest['uses-permission'].some(
                (perm) => perm.$['android:name'] === permission
            );

            if (!exists) {
                androidManifest.manifest['uses-permission'].push({
                    $: {
                        'android:name': permission,
                    },
                });
            }
        });

        return config;
    });
};

module.exports = withCallDetection;
