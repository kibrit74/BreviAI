import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    SharedValue,
    withRepeat,
    withTiming,
    withDelay,
    Easing,
    interpolate,
} from 'react-native-reanimated';

interface NeoOrbProps {
    onPress?: () => void;
    isRecording?: boolean;
}

export const NeoOrb: React.FC<NeoOrbProps> = ({ onPress, isRecording }) => {
    const pulse = useSharedValue(0);
    const ripple1 = useSharedValue(0);
    const ripple2 = useSharedValue(0);
    const ripple3 = useSharedValue(0);

    useEffect(() => {
        // Breathing animation
        pulse.value = withRepeat(
            withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );

        // Ripple animations
        const duration = 3000;
        ripple1.value = withRepeat(
            withTiming(1, { duration, easing: Easing.linear }),
            -1,
            false
        );
        ripple2.value = withDelay(
            1000,
            withRepeat(
                withTiming(1, { duration, easing: Easing.linear }),
                -1,
                false
            )
        );
        ripple3.value = withDelay(
            2000,
            withRepeat(
                withTiming(1, { duration, easing: Easing.linear }),
                -1,
                false
            )
        );
    }, []);

    const orbStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.05]) }],
        shadowOpacity: interpolate(pulse.value, [0, 1], [0.3, 0.6]),
        shadowRadius: interpolate(pulse.value, [0, 1], [20, 35]),
    }));

    const createRippleStyle = (sharedVal: SharedValue<number>) => {
        return useAnimatedStyle(() => ({
            width: interpolate(sharedVal.value, [0, 1], [160, 350]),
            height: interpolate(sharedVal.value, [0, 1], [160, 350]),
            opacity: interpolate(sharedVal.value, [0, 1], [0.6, 0]),
            borderWidth: 1,
            borderColor: 'rgba(0, 245, 255, 0.15)',
        }));
    };

    return (
        <View style={styles.container}>
            {/* Ripples */}
            <Animated.View style={[styles.ripple, createRippleStyle(ripple1)]} />
            <Animated.View style={[styles.ripple, createRippleStyle(ripple2)]} />
            <Animated.View style={[styles.ripple, createRippleStyle(ripple3)]} />

            {/* Main Orb */}
            <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
                <Animated.View style={[styles.orbContainer, orbStyle]}>
                    <View style={styles.orbCore}>
                        <Ionicons name="mic" size={32} color="#000" />
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 350,
        height: 350,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ripple: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(0, 245, 255, 0.1)',
    },
    orbContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(0, 245, 255, 0.15)', // Reduced opacity for transparency effect
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 0 },
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    orbCore: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#00F5FF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 10,
    }
});
