import { Linking, Platform } from 'react-native';
import {
    WorkflowNode,
    NodeExecutionResult,
    NavigateToConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';

/**
 * Execute Navigation Node
 * Opens map/navigation app with destination
 */
export const executeNavigateTo = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = node.config as NavigateToConfig;
    const rawDestination = variableManager.resolveString(config.destination || '');
    const destination = encodeURIComponent(rawDestination);

    // Default to Google Maps if not specified
    const app = config.app || 'google';
    const mode = config.mode || 'driving';

    let url = '';

    if (app === 'google') {
        // Universal link for Google Maps
        // iOS: comgooglemaps://?daddr=...
        // Android/Web: https://www.google.com/maps/dir/?api=1&destination=...

        const modeMap: Record<string, string> = {
            driving: 'driving',
            walking: 'walking',
            bicycling: 'bicycling',
            transit: 'transit'
        };

        const travelMode = modeMap[mode] || 'driving';

        if (Platform.OS === 'ios') {
            // Fallback to Apple Maps if Google Maps app not installed? -> No, let's try direct google maps url Scheme
            // Actually, universal link is safer: https://www.google.com/maps/dir/?api=1&destination=...
            // But user might want App specifically.
            // Let's force intent for Android, universal/scheme for iOS
            url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${travelMode}`;
        } else {
            // Android Intent
            url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${travelMode}`;
        }
    } else if (app === 'apple') {
        // Apple Maps
        // http://maps.apple.com/?daddr=...&dirflg=...
        // dirflg: d (driving), w (walking), r (public transit)
        const modeMap: Record<string, string> = {
            driving: 'd',
            walking: 'w',
            transit: 'r',
            bicycling: '' // not supported explicitly
        };
        const dirflg = modeMap[mode] || 'd';
        url = `http://maps.apple.com/?daddr=${destination}&dirflg=${dirflg}`;
    } else if (app === 'yandex') {
        // Yandex Maps
        // yandexmaps://build_route_on_map?lat_to=...&lon_to=... 
        // OR generic search: yandexmaps://maps.yandex.com/?text=...
        url = `yandexmaps://maps.yandex.com/?text=${destination}`;
    } else if (app === 'waze') {
        // Waze
        // https://waze.com/ul?q=...
        url = `https://waze.com/ul?q=${destination}&navigate=yes`;
    }

    const supported = await Linking.canOpenURL(url);
    if (supported || app === 'google' /* Google universal links might return false on canOpen but still work in browser */) {
        await Linking.openURL(url);
        return { success: true, url };
    } else {
        // Fallback to browser Google Maps
        const fallback = `https://www.google.com/maps/search/?api=1&query=${destination}`;
        await Linking.openURL(fallback);
        return { success: true, url: fallback, fallback: true };
    }
};
