import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { ShortcutTemplate } from '../data/seed_templates';

interface TemplateCardProps {
    template: ShortcutTemplate;
    onPress: () => void;
    isDark?: boolean;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
    template,
    onPress,
    isDark = true
}) => {
    const theme = isDark ? COLORS.dark : COLORS.light;

    // Get colors/icon based on category or random
    const getMeta = () => {
        // Priority 1: Direct template metadata
        if (template.icon) {
            return {
                icon: template.icon,
                color: template.color || theme.primary,
                bg: template.bg || (template.color ? `${template.color}15` : `${theme.primary}15`)
            };
        }

        const title = template.title.toLowerCase();
        if (title.includes('battery')) return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', icon: 'battery-charging' };
        if (title.includes('morning')) return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', icon: 'sunny' };
        if (title.includes('insta')) return { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', icon: 'logo-instagram' };
        if (title.includes('wifi')) return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', icon: 'wifi' };
        if (title.includes('movie')) return { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', icon: 'film' };
        if (title.includes('email') || title.includes('summar')) return { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)', icon: 'mail-open' };

        return { color: theme.primary, bg: `${theme.primary}15`, icon: 'flash' };
    };

    const meta = getMeta();
    const isAI = template.tags?.includes('ai') || template.title.toLowerCase().includes('summary') || template.title.toLowerCase().includes('generate');

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon as any} size={24} color={meta.color} />
                </View>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add" size={20} color={theme.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                    {template.title}
                </Text>

                {isAI && (
                    <View style={styles.aiBadge}>
                        <Ionicons name="sparkles" size={12} color="#a855f7" style={{ marginRight: 4 }} />
                        <Text style={styles.aiText}>AI</Text>
                    </View>
                )}

                <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={3}>
                    {template.description}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 20,
        padding: SPACING.medium,
        margin: SPACING.small / 2,
        borderWidth: 1,
        minHeight: 160,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.medium,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24, // Circle
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(43, 140, 238, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        fontFamily: FONTS.bold,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    aiText: {
        fontSize: 12,
        color: '#a855f7',
        fontWeight: 'bold',
    },
    description: {
        fontSize: 12,
        lineHeight: 18,
    }
});
