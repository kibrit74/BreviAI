
/**
 * WorkflowListScreen - List and manage all workflows
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    FlatList,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Workflow } from '../types/workflow-types';
import { WorkflowStorage } from '../services/WorkflowStorage';
import { workflowEngine } from '../services/WorkflowEngine';
import { useApp } from '../context/AppContext';

type RootStackParamList = {
    WorkflowBuilder: { workflowId?: string };
    WorkflowList: undefined;
};

type WorkflowListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WorkflowList'>;

export const WorkflowListScreen: React.FC = () => {
    const navigation = useNavigation<WorkflowListNavigationProp>();
    const { theme, colors } = useApp();
    const isDark = theme === 'dark';

    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);

    const loadWorkflows = useCallback(async () => {
        // Seed test workflows if none exist
        await WorkflowStorage.seedTestWorkflows();
        const data = await WorkflowStorage.getAll();
        setWorkflows(data);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadWorkflows();
        }, [loadWorkflows])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadWorkflows();
        setRefreshing(false);
    };

    const handleCreateNew = () => {
        navigation.navigate('WorkflowBuilder', {});
    };

    const handleEdit = (workflow: Workflow) => {
        navigation.navigate('WorkflowBuilder', { workflowId: workflow.id });
    };

    const handleRun = async (workflow: Workflow) => {
        if (runningWorkflowId) return; // Prevent multiple runs

        setRunningWorkflowId(workflow.id);
        try {
            // Short delay to show updated UI state before heavy navigation/execution
            await new Promise(resolve => setTimeout(resolve, 100));

            const result = await workflowEngine.execute(workflow);
            await WorkflowStorage.recordRun(workflow.id);
            await loadWorkflows();

            if (result.success) {
                Alert.alert('✅ Başarılı', 'Workflow tamamlandı.');
            } else {
                Alert.alert('❌ Hata', result.error || 'Çalıştırılamadı.');
            }
        } catch (error) {
            Alert.alert('❌ Hata', error instanceof Error ? error.message : 'Bilinmeyen hata');
        } finally {
            setRunningWorkflowId(null);
        }
    };

    const handleDelete = (workflow: Workflow) => {
        Alert.alert(
            'Workflow\'u Sil',
            `"${workflow.name}" silinsin mi ? `,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        await WorkflowStorage.delete(workflow.id);
                        await loadWorkflows();
                    },
                },
            ]
        );
    };

    const handleToggleActive = async (workflow: Workflow) => {
        await WorkflowStorage.toggleActive(workflow.id);
        await loadWorkflows();
    };

    const renderWorkflowItem = ({ item }: { item: Workflow }) => (
        <TouchableOpacity
            style={[styles.workflowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleEdit(item)}
            onLongPress={() => handleDelete(item)}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: item.color || '#6366F1' }]}>
                    <Text style={styles.icon}>{item.icon || '⚡'}</Text>
                </View>
                <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                        {item.nodes.length} node • {item.runCount} çalıştırma
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.activeToggle, item.isActive && styles.activeToggleOn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}
                    onPress={() => handleToggleActive(item)}
                >
                    <View style={[styles.toggleDot, item.isActive && styles.toggleDotOn]} />
                </TouchableOpacity>
            </View>

            {item.description && (
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
            )}

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.cardAction, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }, runningWorkflowId === item.id && { backgroundColor: '#3A3A5A' }]}
                    onPress={() => handleRun(item)}
                    disabled={!!runningWorkflowId}
                >
                    {runningWorkflowId === item.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <>
                            <Text style={styles.cardActionIcon}>▶️</Text>
                            <Text style={[styles.cardActionLabel, { color: colors.textSecondary }]}>Çalıştır</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cardAction, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]} onPress={() => handleEdit(item)}>
                    <Text style={styles.cardActionIcon}>✏️</Text>
                    <Text style={[styles.cardActionLabel, { color: colors.textSecondary }]}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cardAction, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]} onPress={() => handleDelete(item)}>
                    <Text style={styles.cardActionIcon}>🗑️</Text>
                    <Text style={[styles.cardActionLabel, { color: colors.textSecondary }]}>Sil</Text>
                </TouchableOpacity>
            </View>

            {item.lastRun && (
                <Text style={[styles.lastRun, { color: colors.textSecondary }]}>
                    Son: {new Date(item.lastRun).toLocaleDateString('tr-TR')}
                </Text>
            )}
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { opacity: isDark ? 0.5 : 0.8 }]}>🔧</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz Workflow Yok</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Node tabanlı otomasyonlar oluşturmak için yeni bir workflow başlatın.
            </Text>
            <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateNew}
                accessibilityLabel="İlk workflow'u oluştur"
                accessibilityRole="button"
            >
                <LinearGradient
                    colors={['#8B5CF6', '#6366F1']}
                    style={styles.createButtonGradient}
                >
                    <Text style={styles.createButtonText}>+ İlk Workflow'u Oluştur</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>🔧 Workflow'lar</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Node tabanlı otomasyonlar</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleCreateNew}
                    accessibilityLabel="Yeni workflow oluştur"
                    accessibilityRole="button"
                >
                    <LinearGradient
                        colors={['#00F5FF', '#2b8cee']}
                        style={styles.addButtonGradient}
                    >
                        <Text style={styles.addButtonText}>+</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
                data={workflows}
                renderItem={renderWorkflowItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor is set dynamically via colors.background
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 10,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.5,
        // color is set dynamically via colors.text
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
        // color is set dynamically via colors.textSecondary
    },
    addButton: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 245, 255, 0.3)',
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    addButtonGradient: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonText: {
        color: '#000',
        fontSize: 24,
        fontWeight: '300',
    },
    list: {
        padding: 16,
        paddingTop: 0,
        gap: 12,
        paddingBottom: 100, // Space for Bottom Tab Bar
    },
    workflowCard: {
        // backgroundColor is set dynamically
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        // borderColor is set dynamically
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    icon: {
        fontSize: 24,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        // color is set dynamically via colors.text
    },
    cardMeta: {
        fontSize: 12,
        marginTop: 2,
        // color is set dynamically via colors.textSecondary
    },
    activeToggle: {
        width: 44,
        height: 24,
        borderRadius: 12,
        // backgroundColor is set dynamically
        padding: 2,
        justifyContent: 'center',
        borderWidth: 1,
        // borderColor is set dynamically
    },
    activeToggleOn: {
        backgroundColor: 'rgba(0, 245, 255, 0.2)',
        borderColor: '#00F5FF',
    },
    toggleDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#64748B',
    },
    toggleDotOn: {
        backgroundColor: '#00F5FF',
        alignSelf: 'flex-end',
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    description: {
        fontSize: 13,
        marginTop: 12,
        lineHeight: 18,
        // color is set dynamically via colors.textSecondary
    },
    cardActions: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    cardAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // backgroundColor is set dynamically
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
        borderWidth: 1,
        // borderColor is set dynamically
    },
    cardActionIcon: {
        fontSize: 14,
    },
    cardActionLabel: {
        fontSize: 12,
        fontWeight: '500',
        // color is set dynamically via colors.textSecondary
    },
    lastRun: {
        fontSize: 11,
        marginTop: 12,
        textAlign: 'right' as const,
        // color is set dynamically via colors.textTertiary
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
        opacity: 0.5,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        // color is set dynamically via colors.text
    },
    emptyDesc: {
        fontSize: 14,
        textAlign: 'center' as const,
        lineHeight: 20,
        marginBottom: 24,
        // color is set dynamically via colors.textSecondary
    },
    createButton: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#00F5FF',
    },
    createButtonGradient: {
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    createButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default WorkflowListScreen;
