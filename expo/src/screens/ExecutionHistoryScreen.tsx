/**
 * ExecutionHistoryScreen - Shows workflow execution history
 * Displays past executions with success/failure status and details
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { ExecutionLogger, ExecutionLogEntry } from '../services/ExecutionLogger';

const ExecutionHistoryScreen: React.FC = () => {
    const { colors } = useApp();
    const navigation = useNavigation();
    const [history, setHistory] = useState<ExecutionLogEntry[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const styles = createStyles(colors);

    const loadHistory = useCallback(async () => {
        const data = await ExecutionLogger.getHistory();
        setHistory(data);
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadHistory();
        setRefreshing(false);
    };

    const handleClearHistory = () => {
        Alert.alert(
            'Geçmişi Temizle',
            'Tüm çalıştırma geçmişi silinecek. Emin misiniz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Temizle',
                    style: 'destructive',
                    onPress: async () => {
                        await ExecutionLogger.clearHistory();
                        setHistory([]);
                    }
                }
            ]
        );
    };

    const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}dk`;
    };

    const formatTime = (timestamp: number): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - timestamp;

        // Today
        if (date.toDateString() === now.toDateString()) {
            return `Bugün ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `Dün ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
        }

        // This week
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
            return days[date.getDay()];
        }

        // Older
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    };

    const renderItem = ({ item }: { item: ExecutionLogEntry }) => {
        const isExpanded = expandedId === item.id;

        return (
            <TouchableOpacity
                style={[styles.card, !item.success && styles.cardError]}
                onPress={() => setExpandedId(isExpanded ? null : item.id)}
                activeOpacity={0.7}
            >
                {/* Header Row */}
                <View style={styles.cardHeader}>
                    <Text style={styles.emoji}>{item.workflowEmoji || '⚡'}</Text>
                    <View style={styles.cardInfo}>
                        <Text style={styles.workflowName}>{item.workflowName}</Text>
                        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
                    </View>
                    <View style={[styles.statusBadge, item.success ? styles.successBadge : styles.errorBadge]}>
                        <Ionicons
                            name={item.success ? 'checkmark' : 'close'}
                            size={14}
                            color="#FFF"
                        />
                    </View>
                </View>

                {/* Summary Row */}
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryText}>
                        {item.nodeCount} adım • {formatDuration(item.totalDuration)}
                    </Text>
                    {!item.success && item.failedNodeLabel && (
                        <Text style={styles.errorText}>
                            ❌ {item.failedNodeLabel}
                        </Text>
                    )}
                </View>

                {/* Expanded Details */}
                {isExpanded && (
                    <View style={styles.details}>
                        <View style={styles.detailsDivider} />
                        <Text style={styles.detailsTitle}>Adım Detayları</Text>
                        {item.nodeResults.map((node, index) => (
                            <View key={node.nodeId} style={styles.nodeRow}>
                                <Text style={styles.nodeIndex}>{index + 1}.</Text>
                                <View style={styles.nodeInfo}>
                                    <Text style={[
                                        styles.nodeLabel,
                                        !node.success && styles.nodeLabelError
                                    ]}>
                                        {node.nodeLabel}
                                    </Text>
                                    {node.error && (
                                        <Text style={styles.nodeError}>{node.error}</Text>
                                    )}
                                </View>
                                <Text style={styles.nodeDuration}>{formatDuration(node.duration)}</Text>
                                <Ionicons
                                    name={node.success ? 'checkmark-circle' : 'close-circle'}
                                    size={16}
                                    color={node.success ? '#10B981' : '#EF4444'}
                                />
                            </View>
                        ))}
                    </View>
                )}

                {/* Expand Indicator */}
                <View style={styles.expandIndicator}>
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.textMuted}
                    />
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Henüz çalıştırma yok</Text>
            <Text style={styles.emptyText}>
                Workflow'larınızı çalıştırdığınızda geçmiş burada görünecek
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Çalıştırma Geçmişi</Text>
                {history.length > 0 && (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={handleClearHistory}
                    >
                        <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Stats Bar */}
            {history.length > 0 && (
                <View style={styles.statsBar}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{history.length}</Text>
                        <Text style={styles.statLabel}>Toplam</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#10B981' }]}>
                            {history.filter(h => h.success).length}
                        </Text>
                        <Text style={styles.statLabel}>Başarılı</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#EF4444' }]}>
                            {history.filter(h => !h.success).length}
                        </Text>
                        <Text style={styles.statLabel}>Hatalı</Text>
                    </View>
                </View>
            )}

            {/* List */}
            <FlatList
                data={history}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            />
        </SafeAreaView>
    );
};

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    clearButton: {
        padding: 8,
    },
    statsBar: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        paddingVertical: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
    },
    listContent: {
        padding: 16,
        paddingTop: 12,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#10B981',
    },
    cardError: {
        borderLeftColor: '#EF4444',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 28,
        marginRight: 12,
    },
    cardInfo: {
        flex: 1,
    },
    workflowName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    timestamp: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    statusBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successBadge: {
        backgroundColor: '#10B981',
    },
    errorBadge: {
        backgroundColor: '#EF4444',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginLeft: 40,
    },
    summaryText: {
        fontSize: 13,
        color: colors.textMuted,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginLeft: 12,
    },
    expandIndicator: {
        alignItems: 'center',
        marginTop: 8,
    },
    details: {
        marginTop: 12,
    },
    detailsDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 12,
    },
    detailsTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 8,
    },
    nodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    nodeIndex: {
        width: 20,
        fontSize: 12,
        color: colors.textMuted,
    },
    nodeInfo: {
        flex: 1,
    },
    nodeLabel: {
        fontSize: 14,
        color: colors.text,
    },
    nodeLabelError: {
        color: '#EF4444',
    },
    nodeError: {
        fontSize: 11,
        color: '#EF4444',
        marginTop: 2,
    },
    nodeDuration: {
        fontSize: 12,
        color: colors.textMuted,
        marginRight: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
});

export default ExecutionHistoryScreen;
