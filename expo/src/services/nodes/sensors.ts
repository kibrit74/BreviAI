import {
    LightSensor,
    Pedometer,
    Magnetometer,
    Barometer,
} from 'expo-sensors';
import {
    WorkflowNode,
    NodeExecutionResult,
    EdgePort,
    LightSensorConfig,
    PedometerConfig,
    MagnetometerConfig,
    BarometerConfig,
    GestureTriggerConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { Platform } from 'react-native';

/**
 * Execute Light Sensor Node
 * Reads current ambient light level (lux)
 */
export const executeLightSensor = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = node.config as LightSensorConfig;

    return new Promise((resolve, reject) => {
        // Check availability
        // LightSensor is Android only in expo-sensors usually, or check consistency
        // Actually LightSensor works on Android. On iOS verify support.

        let subscription: any = null;
        try {
            subscription = LightSensor.addListener((data) => {
                const lux = data.illuminance;
                variableManager.set(config.variableName, lux);

                if (subscription) subscription.remove();
                resolve({ [config.variableName]: lux });
            });

            // Timeout if no data
            setTimeout(() => {
                if (subscription) {
                    subscription.remove();
                    // Fallback or error?
                    // Resolve with 0 or error? Let's error to be safe or 0? 
                    // Better to resolve with -1 or null if failed to read
                    console.warn("LightSensor timeout");
                    resolve({ [config.variableName]: -1, error: "Timeout or Not Supported" });
                }
            }, 2000); // 2 second timeout

        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Execute Pedometer Node
 * Reads step count - uses watchStepCount on Android (getStepCountAsync not supported)
 */
export const executePedometer = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = node.config as PedometerConfig;

    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) {
        throw new Error('Pedometer not available on this device');
    }

    // Android doesn't support getStepCountAsync - use watchStepCount instead
    if (Platform.OS === 'android') {
        return new Promise((resolve, reject) => {
            console.log('[PEDOMETER] Android: Using watchStepCount fallback');

            let stepCount = 0;
            let resolved = false;

            const subscription = Pedometer.watchStepCount(result => {
                stepCount = result.steps;
                console.log('[PEDOMETER] Real-time step count:', stepCount);
            });

            // Wait 3 seconds to capture step count, then return
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    subscription.remove();

                    const value = {
                        steps: stepCount,
                        distance: 0,
                        note: 'Android: Real-time count since app start'
                    };

                    variableManager.set(config.variableName, value);
                    console.log('[PEDOMETER] Android result:', value);
                    resolve({ [config.variableName]: value });
                }
            }, 3000);
        });
    }

    // iOS: Use getStepCountAsync (works properly)
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Start of today

    if (config.startDate === 'last24h') {
        startDate = new Date();
        startDate.setHours(startDate.getHours() - 24);
    }

    const endDate = new Date();
    const result = await Pedometer.getStepCountAsync(startDate, endDate);

    const value = {
        steps: result.steps,
        distance: 0 // Expo Pedometer currently only reliable for steps
    };

    variableManager.set(config.variableName, value);
    return { [config.variableName]: value };
};

/**
 * Execute Magnetometer Node
 * Reads compass heading
 */
export const executeMagnetometer = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = node.config as MagnetometerConfig;

    return new Promise((resolve, reject) => {
        let subscription: any = null;
        subscription = Magnetometer.addListener((data) => {
            // Calculate heading
            let { x, y, z } = data;
            // Simplified heading calculation
            let heading = 0;
            if (Math.atan2(y, x) >= 0) {
                heading = Math.atan2(y, x) * (180 / Math.PI);
            } else {
                heading = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
            }

            // Adjust to be like a compass (0 = North)
            // This is a rough approx, assumes device is held flat
            heading -= 90;
            if (heading < 0) heading += 360;

            variableManager.set(config.variableName, Math.round(heading));

            if (subscription) subscription.remove();
            resolve({ [config.variableName]: Math.round(heading) });
        });

        setTimeout(() => {
            if (subscription) {
                subscription.remove();
                resolve({ [config.variableName]: 0, error: "Magnetometer timeout" });
            }
        }, 1000);
    });
};

/**
 * Execute Barometer Node
 * Reads pressure and relative altitude
 */
export const executeBarometer = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = node.config as BarometerConfig;

    const isAvailable = await Barometer.isAvailableAsync();
    if (!isAvailable) {
        throw new Error('Barometer not available');
    }

    return new Promise((resolve) => {
        let subscription: any = null;
        subscription = Barometer.addListener((data) => {
            const result = {
                pressure: data.pressure,
                relativeAltitude: data.relativeAltitude || 0
            };

            variableManager.set(config.variableName, result);

            if (subscription) subscription.remove();
            resolve({ [config.variableName]: result });
        });

        setTimeout(() => {
            if (subscription) {
                subscription.remove();
                resolve({ [config.variableName]: null, error: "Barometer timeout" });
            }
        }, 1000);
    });
};

/**
 * Execute Gesture Trigger Node
 * (Simulates a trigger execution result, actual listening happens in TriggerManager)
 */
/**
 * Execute Gesture Trigger Node
 * Waits for a specific gesture (Shake) to occur
 */
export const executeGestureTrigger = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = node.config as GestureTriggerConfig;
    const gestureType = config.gesture || 'shake';

    // If triggered by background service, return immediately
    if (variableManager.get('_triggerType') === 'gesture') {
        const detectedGesture = variableManager.get('_gestureType');
        // Verify gesture matches if needed, but service already filtered workflows
        console.log('[GESTURE_TRIGGER] Already triggered externally:', detectedGesture);
        return { triggered: true, gesture: detectedGesture, timestamp: Date.now() };
    }

    if (gestureType !== 'shake') {
        // Only shake is implemented for now
        return { triggered: true, gesture: gestureType };
    }

    return new Promise((resolve) => {
        console.log('[GESTURE_TRIGGER] Waiting for shake...');

        // Dynamically import to avoid cyclic dependency issues or type errors if at top level
        const { Accelerometer } = require('expo-sensors');

        let subscription: any = null;
        let lastUpdate = 0;

        // Sensitivity
        const THRESHOLD = 1.8; // Approx 1.8g

        subscription = Accelerometer.addListener((data: any) => {
            const { x, y, z } = data;
            const acceleration = Math.sqrt(x * x + y * y + z * z);

            // Allow some time between shakes
            const now = Date.now();
            if (acceleration >= THRESHOLD && (now - lastUpdate > 1000)) {
                lastUpdate = now;
                console.log('[GESTURE_TRIGGER] Shake detected!');

                if (subscription) {
                    subscription.remove();
                    subscription = null;
                }

                resolve({ triggered: true, gesture: 'shake', timestamp: now });
            }
        });

        // Set update interval (approx 100ms)
        Accelerometer.setUpdateInterval(100);

        // Fail-safe timeout (e.g. 60 seconds) so workflow doesn't hang forever if user forgets
        // Or should we let it hang? For an agent task, a timeout is better.
        setTimeout(() => {
            if (subscription) {
                console.log('[GESTURE_TRIGGER] Timeout waiting for shake');
                subscription.remove();
                resolve({ triggered: false, error: 'Gesture timeout (60s)' });
            }
        }, 60000);
    });
};
