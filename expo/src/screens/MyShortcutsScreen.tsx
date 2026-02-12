import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { ShortcutStorage, SavedShortcut } from '../services/ShortcutStorage';
import { workflowEngine } from '../services/WorkflowEngine';
import { TemplateMigration } from '../services/TemplateMigration';

export default function MyShortcutsScreen({ navigation }: any) {
    const { colors, t } = useApp();
    const [shortcuts, setShortcuts] = useState<SavedShortcut[]>([]);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState<string | null>(null);

    // Load shortcuts when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadShortcuts();
        }, [])
    );

    const loadShortcuts = async () => {
        setLoading(true);
        try {
            const saved = await ShortcutStorage.getAll();
            setShortcuts(saved);
        } catch (error) {
            console.error('Error loading shortcuts:', error);
        } finally {
            setLoading(false);
        }
    };

    const executeShortcut = async (shortcut: SavedShortcut) => {
        setExecuting(shortcut.id);
        try {
            await ShortcutStorage.incrementUsage(shortcut.id);
            // Convert steps to workflow and execute via WorkflowEngine
            const workflow = TemplateMigration.convertStepsToWorkflow(shortcut.steps, shortcut.name);
            const result = await workflowEngine.execute(workflow);

            if (!result.success) {
                Alert.alert(t('error') || 'Hata', result.error || 'Çalıştırma hatası');
            } else {
                Alert.alert(t('success') || 'Başarılı', `"${shortcut.name}" çalıştırıldı!`);
            }
        } catch (error) {
            Alert.alert(t('error') || 'Hata', t('executionError') || 'Çalıştırma hatası');
        } finally {
            setExecuting(null);
            loadShortcuts(); // Refresh to update usage count
        }
    };

    const deleteShortcut = (shortcut: SavedShortcut) => {
        Alert.alert(
            'Sil',
            `"${shortcut.name}" silinsin mi?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        await ShortcutStorage.delete(shortcut.id);
                        loadShortcuts();
                    }
                }
            ]
        );
    };

    const toggleFavorite = async (shortcut: SavedShortcut) => {
        await ShortcutStorage.toggleFavorite(shortcut.id);
        loadShortcuts();
    };

    const getActionIcon = (steps: any[]): keyof typeof Ionicons.glyphMap => {
        if (!steps || steps.length === 0) return 'flash';
        const action = steps[0]?.action || '';

        if (action.includes('DND') || action.includes('SOUND')) return 'moon';
        if (action.includes('WIFI')) return 'wifi';
        if (action.includes('BLUETOOTH')) return 'bluetooth';
        if (action.includes('EMAIL') || action.includes('MAIL')) return 'mail';
        if (action.includes('SMS')) return 'chatbubble';
        if (action.includes('ALARM')) return 'alarm';
        if (action.includes('RECORD')) return 'mic';
        if (action.includes('NAVIGATION')) return 'navigate';
        if (action.includes('APP')) return 'apps';
        return 'flash';
    };

    const formatDate = (isoDate: string) => {
        const date = new Date(isoDate);
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    };

    const renderItem = ({ item }: { item: SavedShortcut }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => executeShortcut(item)}
            onLongPress={() => deleteShortcut(item)}
            disabled={executing !== null}
        >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                {executing === item.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <Ionicons
                        name={getActionIcon(item.steps)}
                        size={24}
                        color={colors.primary}
                    />
                )}
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <TouchableOpacity onPress={() => toggleFavorite(item)}>
                        <Ionicons
                            name={item.isFavorite ? 'star' : 'star-outline'}
                            size={18}
                            color={item.isFavorite ? '#fbbf24' : colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.prompt}
                </Text>

                <View style={styles.statsContainer}>
                    <View style={styles.stat}>
                        <Ionicons name="play-circle-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            {item.usageCount}x
                        </Text>
                    </View>
                    <View style={styles.stat}>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            {formatDate(item.lastUsed)}
                        </Text>
                    </View>
                    <View style={styles.stat}>
                        <Ionicons name="layers-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            {item.steps.length} adım
                        </Text>
                    </View>
                </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {t('myShortcuts') || 'Kestirmelerim'}
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={shortcuts}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>
                                {t('noShortcutsYet')}
                            </Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                {t('createShortcutHint')}
                            </Text>
                            <TouchableOpacity
                                style={[styles.createButton, { backgroundColor: colors.primary }]}
                                onPress={() => navigation.navigate('WorkflowBuilder')}
                            >
                                <Ionicons name="add" size={20} color="#ffffff" />
                                <Text style={styles.createButtonText}>{t('shortcutCreate')}</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 24,
        paddingTop: 8,
        paddingBottom: 100, // Space for bottom tab bar
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    contentContainer: {
        flex: 1,
        marginRight: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    description: {
        fontSize: 13,
        marginBottom: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 16,
        gap: 8,
    },
    createButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
