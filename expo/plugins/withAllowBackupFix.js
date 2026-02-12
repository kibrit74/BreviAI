const { withAndroidManifest } = require('@expo/config-plugins');

const withAllowBackupFix = (config) => {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;

        // Ensure the main manifest object exists
        if (!androidManifest.manifest) {
            androidManifest.manifest = {};
        }

        // 1. Add XML Namespace for tools
        if (!androidManifest.manifest.$) {
            androidManifest.manifest.$ = {};
        }
        androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

        // 2. Add tools:replace to <application>
        const mainApplication = androidManifest.manifest.application?.[0];
        if (mainApplication) {
            if (!mainApplication.$) {
                mainApplication.$ = {};
            }

            if (!mainApplication.$['tools:replace']) {
                mainApplication.$['tools:replace'] = 'android:allowBackup';
            } else {
                const existingReplace = mainApplication.$['tools:replace'];
                if (!existingReplace.includes('android:allowBackup')) {
                    mainApplication.$['tools:replace'] = `${existingReplace},android:allowBackup`;
                }
            }
        }

        return config;
    });
};

module.exports = withAllowBackupFix;
