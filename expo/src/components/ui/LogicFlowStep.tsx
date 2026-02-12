import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS } from '../../constants/theme';

export interface LogicStep {
    id: string;
    type: 'trigger' | 'action';
    title: string;
    subtitle?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    // For specialized UI like sliders, input etc we can make this more complex later
    isSystem?: boolean;
    appName?: string;
    value?: string | number;
}

interface LogicFlowStepProps {
    step: LogicStep;
    isLast: boolean;
    isDark?: boolean;
    onPress: () => void;
}

export const LogicFlowStep: React.FC<LogicFlowStepProps> = ({
    step,
    isLast,
    isDark = true,
    onPress
}) => {
    const theme = isDark ? COLORS.dark : COLORS.light;
    const isTrigger = step.type === 'trigger';

    return (
        <View style={styles.container}>
            {/* Left Timeline Line */}
            <View style={styles.timelineContainer}>
                <View style={[
                    styles.iconCircle,
                    {
                        backgroundColor: isTrigger ? theme.surface : theme.surface,
                        borderColor: isTrigger ? theme.primary : theme.border,
                        borderWidth: isTrigger ? 2 : 1
                    }
                ]}>
                    <Ionicons
                        name={step.icon || (isTrigger ? 'flash' : 'cube')}
                        size={18}
                        color={isTrigger ? theme.primary : (step.appName === 'Spotify' ? '#1db954' : theme.textSecondary)}
                    />
                </View>
                {!isLast && (
                    <View style={[styles.line, { backgroundColor: isTrigger ? theme.primary : theme.border }]} />
                )}
            </View>

            {/* Content Card */}
            <TouchableOpacity
                style={[
                    styles.card,
                    {
                        backgroundColor: theme.surface,
                        borderColor: theme.border
                    }
                ]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <View style={styles.headerRow}>
                    <View style={styles.tagContainer}>
                        {isTrigger ? (
                            <Text style={[styles.tagText, { color: theme.primary }]}># Trigger</Text>
                        ) : (
                            <Text style={[styles.tagText, { color: '#3b82f6' }]}>THEN  <Text style={{ color: theme.textSecondary, fontWeight: 'normal' }}>{step.isSystem ? 'System Action' : 'App Action'}</Text></Text>
                        )}
                    </View>
                </View>

                <Text style={[styles.title, { color: theme.text }]}>
                    {step.title}
                </Text>

                {step.subtitle && (
                    <Text style={[styles.subtitle, { color: theme.primary, textDecorationLine: 'underline' }]}>
                        {step.subtitle}
                    </Text>
                )}

                {/* Slider visual for volume if applicable (demo purpose) */}
                {step.title.includes('Volume') && (
                    <View style={styles.sliderContainer}>
                        <View style={[styles.sliderTrack, { backgroundColor: theme.border }]}>
                            <View style={[styles.sliderFill, { width: '80%', backgroundColor: theme.primary }]} />
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        minHeight: 100,
    },
    timelineContainer: {
        alignItems: 'center',
        width: 40,
        marginRight: SPACING.small,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    line: {
        width: 2,
        flex: 1,
        marginTop: 4,
        marginBottom: 4,
    },
    card: {
        flex: 1,
        borderRadius: 12,
        padding: SPACING.medium,
        marginBottom: SPACING.medium,
        borderWidth: 1,
    },
    headerRow: {
        marginBottom: 6,
    },
    tagContainer: {
        flexDirection: 'row',
    },
    tagText: {
        fontSize: 11,
        fontWeight: 'bold',
        fontFamily: FONTS.bold,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    sliderContainer: {
        marginTop: 12,
        alignItems: 'center',
        flexDirection: 'row',
    },
    sliderTrack: {
        height: 6,
        borderRadius: 3,
        flex: 1,
        overflow: 'hidden',
    },
    sliderFill: {
        height: '100%',
    }
});
