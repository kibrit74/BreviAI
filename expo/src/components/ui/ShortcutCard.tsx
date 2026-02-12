import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS, FONTS } from '../../constants/theme';

interface ShortcutCardProps {
    title: string;
    description: string;
    downloads: string;
    rating: number;
    iconName: keyof typeof Ionicons.glyphMap;
    isDark?: boolean;
    onPress: () => void;
}

export const ShortcutCard: React.FC<ShortcutCardProps> = ({
    title,
    description,
    downloads,
    rating,
    iconName,
    isDark = false,
    onPress
}) => {
    const theme = isDark ? COLORS.dark : COLORS.light;

    return (
        <TouchableOpacity
            activeOpacity={0.98}
            onPress={onPress}
            style={[
                styles.card,
                { backgroundColor: theme.surface },
                !isDark && SHADOWS.medium,
                isDark && { borderColor: theme.border, borderWidth: 1 }
            ]}
        >
            <View style={styles.row}>
                {/* Icon Circle */}
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#e3f2fd' }]}>
                    <Ionicons name={iconName} size={24} color={theme.secondary} />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{title}</Text>
                    <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={1}>
                        {description}
                    </Text>

                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Ionicons name="download-outline" size={12} color={theme.textSecondary} />
                            <Text style={[styles.statText, { color: theme.textSecondary }]}>{downloads}</Text>
                        </View>
                        <View style={styles.stat}>
                            <Ionicons name="star" size={12} color="#FFD700" />
                            <Text style={[styles.statText, { color: theme.textSecondary }]}>{rating}</Text>
                        </View>
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.background }]}>
                    <Ionicons name="play" size={20} color={theme.primary} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        height: 110,
        borderRadius: 16,
        padding: SPACING.medium,
        marginBottom: SPACING.medium,
        justifyContent: 'center',
        marginHorizontal: SPACING.medium,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.medium,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        marginBottom: 8,
    },
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.medium,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SPACING.small,
    }
});
