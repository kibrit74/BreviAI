import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { useApp } from '../../context/AppContext';
import { SPACING } from '../../constants/theme';

interface VoiceCommandHeroProps {
    isDark?: boolean;
    onPress?: () => void;
    isRecording?: boolean;
}

export const VoiceCommandHero: React.FC<VoiceCommandHeroProps> = ({
    isDark = true,
    onPress,
    isRecording = false
}) => {
    const { t } = useApp();

    const pulse = useSharedValue(0);
    const wave = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    useEffect(() => {
        if (isRecording) {
            wave.value = withRepeat(
                withTiming(1, { duration: 1000, easing: Easing.linear }),
                -1,
                false
            );
        } else {
            wave.value = 0;
        }
    }, [isRecording]);

    // 7 Glow Rings
    const ring1Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.15]) }],
        opacity: interpolate(pulse.value, [0, 1], [0.6, 0.2]),
    }));

    const ring2Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1.1, 1.3]) }],
        opacity: interpolate(pulse.value, [0, 1], [0.5, 0.15]),
    }));

    const ring3Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1.2, 1.45]) }],
        opacity: interpolate(pulse.value, [0, 1], [0.4, 0.1]),
    }));

    const ring4Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1.3, 1.6]) }],
        opacity: interpolate(pulse.value, [0, 1], [0.3, 0.08]),
    }));

    const ring5Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1.4, 1.75]) }],
        opacity: interpolate(pulse.value, [0, 1], [0.25, 0.05]),
    }));

    const ring6Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1.5, 1.9]) }],
        opacity: interpolate(pulse.value, [0, 1], [0.2, 0.03]),
    }));

    const ring7Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pulse.value, [0, 1], [1.6, 2.1]) }],
        opacity: interpolate(pulse.value, [0, 1], [0.15, 0.01]),
    }));

    // Waveform bars
    const waveStyles = Array.from({ length: 20 }).map((_, i) =>
        useAnimatedStyle(() => {
            const offset = i * 0.1;
            const height = interpolate(
                wave.value,
                [0, 1],
                [2, 40 - Math.abs(10 - i) * 2]
            );
            return {
                height: isRecording ? height : 2,
                opacity: isRecording ? 0.6 : 0,
            };
        })
    );

    return (
        <View style={styles.container}>
            {/* Ambient Background Glow */}
            <View style={styles.ambientContainer}>
                <LinearGradient
                    colors={['rgba(0, 150, 255, 0.3)', 'rgba(79, 136, 252, 0.2)', 'transparent']}
                    style={styles.ambientGlow}
                />
            </View>

            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.9}
                style={styles.buttonWrapper}
                accessibilityLabel={isRecording ? "Kaydı durdur" : "Sesli komut vermek için dokunun"}
                accessibilityRole="button"
                accessibilityState={{ selected: isRecording }}
            >
                {/* 7 Glow Rings */}
                <Animated.View style={[styles.ring, styles.ring7, ring7Style]} />
                <Animated.View style={[styles.ring, styles.ring6, ring6Style]} />
                <Animated.View style={[styles.ring, styles.ring5, ring5Style]} />
                <Animated.View style={[styles.ring, styles.ring4, ring4Style]} />
                <Animated.View style={[styles.ring, styles.ring3, ring3Style]} />
                <Animated.View style={[styles.ring, styles.ring2, ring2Style]} />
                <Animated.View style={[styles.ring, styles.ring1, ring1Style]} />

                {/* Waveform Left */}
                <View style={[styles.waveformContainer, styles.waveformLeft]}>
                    {waveStyles.slice(0, 10).map((style, i) => (
                        <Animated.View key={`left-${i}`} style={[styles.waveBar, style]} />
                    ))}
                </View>

                {/* Waveform Right */}
                <View style={[styles.waveformContainer, styles.waveformRight]}>
                    {waveStyles.slice(10).map((style, i) => (
                        <Animated.View key={`right-${i}`} style={[styles.waveBar, style]} />
                    ))}
                </View>

                {/* Main Button */}
                <View style={styles.mainButtonContainer}>
                    <LinearGradient
                        colors={['#172554', '#2563EB', '#60A5FA', '#2563EB', '#172554']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        locations={[0, 0.2, 0.5, 0.8, 1]}
                        style={styles.mainButton}
                    >
                        <View style={styles.innerGlow} />
                        <Ionicons
                            name={isRecording ? "square" : "mic"}
                            size={36}
                            color="#FFF"
                        />
                    </LinearGradient>
                </View>
            </TouchableOpacity>

            <View style={styles.textContainer}>
                <Text style={styles.tapText}>{t('tapToSpeak')}</Text>
                <Text style={styles.exampleText}>{t('voiceExample')}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        overflow: 'visible',
    },
    ambientContainer: {
        position: 'absolute',
        width: 400,
        height: 400,
    },
    ambientGlow: {
        width: 400,
        height: 400,
        borderRadius: 200,
    },
    buttonWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 200,
        height: 200,
    },
    ring: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 2,
    },
    ring1: {
        width: 100,
        height: 100,
        borderColor: 'rgba(29, 78, 216, 0.6)', // Darker Blue
    },
    ring2: {
        width: 120,
        height: 120,
        borderColor: 'rgba(29, 78, 216, 0.5)',
    },
    ring3: {
        width: 140,
        height: 140,
        borderColor: 'rgba(29, 78, 216, 0.4)',
    },
    ring4: {
        width: 160,
        height: 160,
        borderColor: 'rgba(29, 78, 216, 0.3)',
    },
    ring5: {
        width: 180,
        height: 180,
        borderColor: 'rgba(29, 78, 216, 0.25)',
    },
    ring6: {
        width: 200,
        height: 200,
        borderColor: 'rgba(29, 78, 216, 0.2)',
    },
    ring7: {
        width: 220,
        height: 220,
        borderColor: 'rgba(29, 78, 216, 0.15)',
    },
    waveformContainer: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    waveformLeft: {
        right: 110,
    },
    waveformRight: {
        left: 110,
    },
    waveBar: {
        width: 2,
        backgroundColor: 'rgba(96, 165, 250, 0.8)',
        borderRadius: 1,
    },
    mainButtonContainer: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
        borderRadius: 45,
    },
    mainButton: {
        width: 90,
        height: 90,
        borderRadius: 45,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    innerGlow: {
        position: 'absolute',
        top: 5,
        width: 80,
        height: 40,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    textContainer: {
        marginTop: SPACING.xlarge,
        alignItems: 'center',
    },
    tapText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
        textShadowColor: 'rgba(0, 191, 255, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    exampleText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '400',
    },
});