import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { sensorTriggerService } from '../services/SensorTriggerService';

interface GlobalGestureHandlerProps {
    children: React.ReactNode;
}

export const GlobalGestureHandler: React.FC<GlobalGestureHandlerProps> = ({ children }) => {
    const quadTap = Gesture.Tap()
        .numberOfTaps(4)
        .maxDuration(1000) // 1 second to complete 4 taps
        .runOnJS(true)
        .onEnd(() => {
            console.log('Global gesture: 4 taps detected');
            sensorTriggerService.triggerGestureWorkflows('quadruple_tap');
        });

    return (
        <GestureDetector gesture={quadTap}>
            <View style={{ flex: 1 }}>
                {children}
            </View>
        </GestureDetector>
    );
};
