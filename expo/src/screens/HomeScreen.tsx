import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING } from '../constants/theme';
import { WorkflowStorage } from '../services/WorkflowStorage';
import { useFocusEffect } from '@react-navigation/native';
import { NativeModules } from 'react-native';

// Components
import { VoiceCommandHero } from '../components/ui/VoiceCommandHero';
import { ActiveShortcutItem } from '../components/ui/ActiveShortcutItem';
import { Header } from '../components/ui/Header';

interface Shortcut {
    id: string;
    title: string;
    description: string;
    icon?: string;
    isEnabled?: boolean;
    iconColor?: string;
}

export default function HomeScreen({ navigation }: any) {
    const { theme, t } = useApp();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? COLORS.dark : COLORS.light;
    const insets = useSafeAreaInsets();

    const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        automationsRun: 0,
        timeSaved: 0,
    });

    const loadData = useCallback(async () => {
        await Promise.all([loadShortcuts(), loadStats()]);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
            checkPermissions();
        }, [loadData])
    );

    const [permissionMissing, setPermissionMissing] = useState(false);

    const checkPermissions = () => {
        try {
            const { BreviSettingsManager } = NativeModules;
            if (BreviSettingsManager && BreviSettingsManager.hasNotificationListenerAccess) {
                const hasAccess = BreviSettingsManager.hasNotificationListenerAccess();
                setPermissionMissing(hasAccess === false);
            }
        } catch (e) {
            console.warn('Permission check failed', e);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const loadStats = async () => {
        try {
            const workflows = await WorkflowStorage.getAll();
            const totalRuns = workflows.reduce((acc, curr) => acc + (curr.runCount || 0), 0);

            setStats({
                automationsRun: totalRuns,
                timeSaved: Math.round(totalRuns * 2),
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const loadShortcuts = async () => {
        try {
            const activeWorkflows = await WorkflowStorage.getActive();

            if (activeWorkflows.length > 0) {
                setShortcuts(activeWorkflows.map(w => ({
                    id: w.id,
                    title: w.name,
                    description: w.description || 'Aktif otomasyon',
                    isEnabled: w.isActive,
                    icon: w.icon || 'flash',
                    iconColor: w.color || '#6366F1'
                })));
            } else {
                setShortcuts([]);
            }
        } catch (error) {
            console.error('Failed to load workflows:', error);
        }
    };

    const toggleShortcut = async (id: string, value: boolean) => {
        await WorkflowStorage.toggleActive(id);
        await loadShortcuts();
    };

    const getIconName = (icon?: string): keyof typeof Ionicons.glyphMap => {
        // If it looks like an ionicon, use it, else default
        if (icon && /^[a-z0-9-]+$/.test(icon)) {
            return icon as keyof typeof Ionicons.glyphMap;
        }
        return 'flash-outline';
    };

    // Helper for Emoji support in ActiveShortcutItem if needed
    const getEmoji = (icon?: string) => {
        if (icon && !/^[a-z0-9-]+$/.test(icon)) return icon;
        return undefined;
    };

    return (
        <View style={styles.container}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Background Gradient */}
            <LinearGradient
                colors={isDark ? ['#020617', '#172554'] : ['#F8FAFC', '#E2E8F0']} // Deep Midnight Blue for Dark Mode
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header */}
            <View style={{ paddingTop: insets.top }}>
                <Header
                    title="BreviAI"
                    showLogo={true}
                    showSettings={false}
                    isDark={isDark}
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primary} />
                }
            >
                {/* Permission Warning */}
                {permissionMissing && (
                    <TouchableOpacity
                        onPress={() => {
                            NativeModules.BreviSettingsManager?.requestNotificationListenerAccess();
                        }}
                        style={{
                            marginHorizontal: SPACING.medium,
                            marginTop: SPACING.medium,
                            padding: 12,
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 1,
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12
                        }}
                        accessibilityLabel="Bildirim erişimi izni vermek için dokunun"
                        accessibilityRole="button"
                    >
                        <Ionicons name="warning" size={24} color="#EF4444" />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: currentTheme.text, fontWeight: '700', fontSize: 14 }}>
                                Bildirim Erişimi Gerekli
                            </Text>
                            <Text style={{ color: currentTheme.textSecondary, fontSize: 12 }}>
                                WhatsApp ve Telegram tetikleyicileri için izin verin.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={currentTheme.textSecondary} />
                    </TouchableOpacity>
                )}

                {/* Voice Command Hero */}
                <VoiceCommandHero
                    isDark={isDark}
                    onPress={() => navigation.navigate('WorkflowBuilder', { autoOpenAI: true })}
                />

                {/* Stats Section - Glassmorphism */}
                <View style={styles.statsContainer}>
                    <GlassCard isDark={isDark} style={styles.statCard}>
                        <View style={styles.statIconContainer}>
                            <Ionicons name="flash" size={20} color="#4F88FC" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.statValue, { color: currentTheme.text }]}>
                                {stats.automationsRun}
                            </Text>
                            <Text
                                style={[styles.statLabel, { color: currentTheme.textSecondary }]}
                                numberOfLines={2}
                                adjustsFontSizeToFit
                            >
                                {t('automationsRun')}
                            </Text>
                        </View>
                    </GlassCard>

                    <GlassCard isDark={isDark} style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                            <Ionicons name="time" size={20} color="#A855F7" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={[styles.statValue, { color: currentTheme.text }]}>
                                    {stats.timeSaved}
                                </Text>
                                <Text style={[styles.statUnit, { color: currentTheme.textSecondary }]}>dk</Text>
                            </View>
                            <Text
                                style={[styles.statLabel, { color: currentTheme.textSecondary }]}
                                numberOfLines={2}
                                adjustsFontSizeToFit
                            >
                                {t('timeSaved')}
                            </Text>
                        </View>
                    </GlassCard>
                </View>

                {/* Active Shortcuts Section */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
                        Aktif Otomasyonlar
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Workflows')}
                        style={styles.viewAllButton}
                    >
                        <Text style={[styles.viewAll, { color: '#4F88FC' }]}>{t('viewAll')}</Text>
                        <Ionicons name="chevron-forward" size={14} color="#4F88FC" />
                    </TouchableOpacity>
                </View>

                {shortcuts.length > 0 ? (
                    <View style={styles.shortcutsList}>
                        {shortcuts.map((shortcut) => (
                            <ActiveShortcutItem
                                key={shortcut.id}
                                title={shortcut.title}
                                description={shortcut.description}
                                iconName={getIconName(shortcut.icon)}
                                iconColor={shortcut.iconColor}
                                isEnabled={shortcut.isEnabled || false}
                                onToggle={(value) => toggleShortcut(shortcut.id, value)}
                                isDark={isDark}
                                emoji={getEmoji(shortcut.icon)}
                            />
                        ))}
                    </View>
                ) : (
                    <GlassCard isDark={isDark} style={styles.emptyState}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>🧘‍♂️</Text>
                        <Text style={{ color: currentTheme.text, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>
                            Sakinsiniz
                        </Text>
                        <Text style={{ color: currentTheme.textSecondary, textAlign: 'center', fontSize: 13, paddingHorizontal: 20 }}>
                            Aktif çalışan bir otomasyonunuz yok. Workflow kütüphanesini keşfedin.
                        </Text>
                    </GlassCard>
                )}

                {/* Bottom Padding */}
                <View style={{ height: 140 }} />
            </ScrollView>
        </View>
    );
}

// Glassmorphism Card Component
const GlassCard = ({ children, style, isDark }: { children: React.ReactNode, style?: any, isDark: boolean }) => (
    <View style={[
        style,
        {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
            borderWidth: 1,
        }
    ]}>
        {children}
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.medium,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: SPACING.medium,
        marginTop: SPACING.medium,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        // Shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(79, 136, 252, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
        lineHeight: 28,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.8,
    },
    statUnit: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 2,
        marginBottom: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.large + 8,
        marginBottom: SPACING.medium,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
    },
    viewAll: {
        fontSize: 13,
        fontWeight: '600',
        marginRight: 2,
    },
    shortcutsList: {
        gap: SPACING.small,
    },
    emptyState: {
        marginTop: SPACING.medium,
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
