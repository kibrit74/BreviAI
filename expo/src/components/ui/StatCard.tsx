import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS } from '../../constants/theme';

interface StatCardProps {
    value: string | number;
    label: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    // New prop for the "+2" increase indicator
    increase?: string;
    isDark?: boolean;
    // Optional specific colors (defaults to theme)
    iconColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    value,
    label,
    iconName = 'analytics',
    increase,
    isDark = true,
    iconColor
}) => {
    const theme = isDark ? COLORS.dark : COLORS.light;
    const finalIconColor = iconColor || theme.primary;

    return (
        <View style={[
            styles.card,
            {
                backgroundColor: theme.card,
                borderColor: theme.border,
            }
        ]}>
            {/* Background Icon (Ghost) */}
            <View style={styles.iconBg}>
                <Ionicons name={iconName} size={48} color={finalIconColor} style={{ opacity: 0.1 }} />
            </View>

            <View style={styles.content}>
                {/* Top Right Icon (Small) */}
                <View style={styles.iconTopRight}>
                    <Ionicons name={iconName} size={24} color={finalIconColor} />
                </View>

                <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>

                <View style={styles.valueContainer}>
                    <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
                    {increase && (
                        <Text style={styles.increase}>{increase}</Text>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 16,
        padding: SPACING.medium,
        minHeight: 100,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    iconBg: {
        position: 'absolute',
        bottom: -10,
        right: -10,
        transform: [{ rotate: '-15deg' }],
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    iconTopRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        opacity: 0.2, // Subtle
    },
    label: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        fontWeight: '500',
        marginBottom: 8,
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    value: {
        fontSize: 28,
        fontFamily: FONTS.bold,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    increase: {
        fontSize: 12,
        fontWeight: '600',
        color: '#22c55e', // Green for increase
        marginBottom: 4,
    }
});
