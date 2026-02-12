import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../constants/theme';

interface ActiveShortcutItemProps {
    title: string;
    description: string;
    iconName: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    iconBgColor?: string;
    isEnabled: boolean;
    onToggle: (value: boolean) => void;
    isDark?: boolean;
    emoji?: string;
}

export const ActiveShortcutItem: React.FC<ActiveShortcutItemProps> = ({
    title,
    description,
    iconName,
    iconColor = '#f97316',
    iconBgColor,
    isEnabled,
    onToggle,
    isDark = true,
    emoji,
}) => {
    const theme = isDark ? COLORS.dark : COLORS.light;
    const bgColor = iconBgColor || `${iconColor}15`;

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: theme.card,
                borderColor: theme.border,
                opacity: isEnabled ? 1 : 0.7,
            }
        ]}>
            <View style={styles.leftSection}>
                <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                    {emoji ? (
                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    ) : (
                        <Ionicons name={iconName} size={24} color={iconColor} />
                    )}
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                    <Text style={[styles.description, { color: theme.textSecondary }]}>
                        {description}
                    </Text>
                </View>
            </View>

            <Switch
                value={isEnabled}
                onValueChange={onToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#ffffff"
                ios_backgroundColor={theme.border}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.medium,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: SPACING.small,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        marginLeft: SPACING.medium,
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
    },
    description: {
        fontSize: 12,
        marginTop: 2,
    },
});
