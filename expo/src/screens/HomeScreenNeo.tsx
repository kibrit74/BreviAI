import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Platform, Image, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { WorkflowStorage } from '../services/WorkflowStorage';
import { NeoOrb } from '../components/ui/NeoOrb';



export default function HomeScreenNeo({ navigation }: any) {
    const { t, theme, colors, language } = useApp();
    const isDark = theme === 'dark';
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const commandOpacity = useRef(new Animated.Value(1)).current;
    const [commandIndex, setCommandIndex] = useState(0);
    const voiceCommandExamples = useMemo(
        () => [
            t('voiceCmdSummarizeNotes'),
            t('voiceCmdSummarizeEmails'),
            t('voiceCmdReadCalendar'),
            t('voiceCmdListEvents'),
            t('voiceCmdPlanDay'),
            t('voiceCmdCreateReminder'),
            t('voiceCmdSendDailyReport'),
            t('voiceCmdCheckWeather'),
            t('voiceCmdShowTodayTasks'),
        ],
        [language]
    );

    // State
    const [shortcuts, setShortcuts] = useState<any[]>([]);
    const [stats, setStats] = useState({
        automationsRun: 0,
        timeSaved: 0,
    });

    const loadData = useCallback(async () => {
        try {
            const workflows = await WorkflowStorage.getAll();
            const activeWf = await WorkflowStorage.getActive();

            const totalRuns = workflows.reduce((acc, curr) => acc + (curr.runCount || 0), 0);
            setStats({
                automationsRun: totalRuns,
                timeSaved: Math.round(totalRuns * 2),
            });

            if (activeWf.length > 0) {
                setShortcuts(activeWf.map(w => ({
                    id: w.id,
                    title: w.name,
                    description: w.description || t('activeAutomationFallback'),
                    icon: w.icon || 'flash',
                })));
            } else {
                setShortcuts([]);
            }

        } catch (e) {
            console.error(e);
        }
    }, [t]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    useEffect(() => {
        setCommandIndex(0);
        commandOpacity.setValue(1);
    }, [voiceCommandExamples, commandOpacity]);

    useEffect(() => {
        if (voiceCommandExamples.length <= 1) return;

        const intervalId = setInterval(() => {
            Animated.timing(commandOpacity, {
                toValue: 0,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (!finished) return;

                setCommandIndex((prev) => (prev + 1) % voiceCommandExamples.length);

                Animated.timing(commandOpacity, {
                    toValue: 1,
                    duration: 260,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }).start();
            });
        }, 2400);

        return () => clearInterval(intervalId);
    }, [voiceCommandExamples, commandOpacity]);

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />



            {/* Background Elements - Soft Fixed Ring */}
            <View style={styles.fixedSoftRing} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={styles.headerLogo}
                    />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>BreviAI</Text>
                </View>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <NeoOrb onPress={() => navigation.navigate('WorkflowBuilder', { autoOpenAI: true })} />
                    <View style={styles.heroTextContainer}>
                        <Text style={[styles.heroTitle, { color: colors.text }]}>{t('tapToSpeak')}</Text>
                        <View style={styles.heroSubtitleRow}>
                            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                                {`"Hey BreviAI, `}
                            </Text>
                            <Animated.Text style={[styles.heroSubtitle, { color: colors.textSecondary, opacity: commandOpacity }]}>
                                {voiceCommandExamples[commandIndex]}
                            </Animated.Text>
                            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                                {`"`}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <GlassPanel style={styles.statCard} onPress={() => { }} theme={theme} colors={colors}>
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(0, 245, 255, 0.1)' : colors.primary + '20' }]}>
                            <Ionicons name="flash" size={20} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.statValue, { color: colors.text }]}>{stats.automationsRun}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('automationsRun')}</Text>
                        </View>
                    </GlassPanel>

                    <GlassPanel style={styles.statCard} onPress={() => { }} theme={theme} colors={colors}>
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.05)' }]}>
                            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                        </View>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={[styles.statValue, { color: colors.text }]}>{stats.timeSaved}</Text>
                                <Text style={[styles.statUnit, { color: colors.text }]}>{t('minutesShort')}</Text>
                            </View>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('timeSaved')}</Text>
                        </View>
                    </GlassPanel>
                </View>

                {/* Active Automations */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('activeShortcuts')}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Workflows')} style={styles.seeAllBtn}>
                        <Text style={[styles.seeAllText, { color: colors.primary }]}>{t('viewAll')}</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.listContainer}>
                    {shortcuts.length > 0 ? (
                        shortcuts.map((item) => (
                            <GlassPanel key={item.id} style={styles.listItem} onPress={() => { }} theme={theme} colors={colors}>
                                <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                    <Ionicons name={item.icon.includes('-') ? item.icon : 'flash'} size={20} color={colors.textSecondary} />
                                </View>
                                <View style={styles.listItemContent}>
                                    <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                                    <Text style={[styles.listItemSub, { color: colors.textSecondary }]}>{item.description}</Text>
                                </View>
                                {/* Cyan Dot Indicator */}
                                <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                            </GlassPanel>
                        ))
                    ) : (
                        <GlassPanel style={styles.emptyShortcutState} onPress={() => navigation.navigate('Workflows')} theme={theme} colors={colors}>
                            <Text style={[styles.emptyShortcutTitle, { color: colors.text }]}>{t('noShortcutsYet')}</Text>
                            <Text style={[styles.emptyShortcutText, { color: colors.textSecondary }]}>
                                {t('activeAutomationFallback')}
                            </Text>
                        </GlassPanel>
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const GlassPanel = ({ children, style, onPress, theme, colors }: any) => (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.glassWrapper, {
        borderColor: colors.border,
        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : colors.card,
    }]}>
        <BlurView intensity={theme === 'dark' ? 20 : 0} style={[styles.glassInner, style]} tint={theme === 'dark' ? "dark" : "light"}>
            {children}
        </BlurView>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bgGlow: {
        position: 'absolute',
        top: -150,
        right: -150,
        width: 500,
        height: 500,
        borderRadius: 250,
        backgroundColor: 'rgba(0, 245, 255, 0.05)',
    },
    fixedSoftRing: {
        position: 'absolute',
        top: -100,
        right: -80,
        width: 350,
        height: 350,
        borderRadius: 175,
        backgroundColor: 'transparent',
        borderWidth: 40,
        borderColor: 'rgba(0, 245, 255, 0.03)', // Soft ring
        opacity: 0.8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    headerLogo: {
        width: 40,
        height: 40,
        borderRadius: 10,
        resizeMode: 'contain',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingTop: 0,
    },
    heroSection: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    heroTextContainer: {
        alignItems: 'center',
        marginTop: 0, // Orb has its own padding/size
        zIndex: 10,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    heroSubtitle: {
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.5,
    },
    heroSubtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 16,
        marginBottom: 32,
    },
    glassWrapper: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        // borderColor ve backgroundColor inline style olarak uygulanmalı
    },
    glassInner: {
        padding: 20,
        flex: 1,
        justifyContent: 'space-between',
        height: 140,
    },
    statCard: {
        // Handled in glassInner
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 32,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
    },
    statUnit: {
        fontSize: 18,
        marginLeft: 2,
        fontWeight: '400',
        opacity: 0.7,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: '500',
    },
    listContainer: {
        paddingHorizontal: 24,
        gap: 12,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 'auto', // override fixed height from stats
        padding: 16,
        gap: 16,
    },
    listItemContent: {
        flex: 1,
    },
    listItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    listItemSub: {
        fontSize: 12,
    },
    emptyShortcutState: {
        height: 'auto',
        padding: 16,
        gap: 6,
    },
    emptyShortcutTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    emptyShortcutText: {
        fontSize: 12,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        // backgroundColor ve shadowColor inline style olarak uygulanmalı
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 5,
    }
});
