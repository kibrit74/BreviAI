import { PermissionsAndroid, Platform, Alert } from 'react-native';

/**
 * SMS izinlerini kontrol eder ve ister.
 * @returns {Promise<boolean>} İzin verildiyse true, aksi halde false.
 */
export const requestSmsPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
        const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
            PermissionsAndroid.PERMISSIONS.READ_SMS
        ]);

        const receiveSms = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
        const readSms = granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;

        if (receiveSms && readSms) {
            console.log('[PermissionUtils] SMS permissions granted');
            return true;
        } else {
            console.log('[PermissionUtils] SMS permissions denied');
            Alert.alert(
                'İzin Gerekli',
                'SMS tetikleyicisinin çalışması için SMS okuma ve alma izinlerine ihtiyacımız var.',
                [{ text: 'Tamam' }]
            );
            return false;
        }
    } catch (err) {
        console.warn('[PermissionUtils] Error requesting SMS permissions:', err);
        return false;
    }
};

/**
 * SMS izinlerinin durumunu kontrol eder (isteme yapmaz).
 */
export const checkSmsPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;

    try {
        const receiveSms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
        const readSms = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
        return receiveSms && readSms;
    } catch (err) {
        console.warn('[PermissionUtils] Error checking SMS permissions:', err);
        return false;
    }
};
