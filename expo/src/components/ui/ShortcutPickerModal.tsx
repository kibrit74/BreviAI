import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { WorkflowStorage } from '../../services/WorkflowStorage';
import { SavedShortcut } from '../../services/ShortcutStorage';

interface ShortcutPickerModalProps {
    visible: boolean;
    onSelect: (shortcut: SavedShortcut) => void;
    onClose: () => void;
    currentShortcutId?: string;
}

export default function ShortcutPickerModal({
    visible,
    onSelect,
    onClose,
    currentShortcutId,
}: ShortcutPickerModalProps) {
    const { colors, t } = useApp();
    const [shortcuts, setShortcuts] = useState<SavedShortcut[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible) {
            loadShortcuts();
        }
    }, [visible]);

    const loadShortcuts = async () => {
        setLoading(true);
        try {
            // Load workflows from WorkflowStorage
            console.log('[ShortcutPicker] Loading workflows...');

            // Seed test workflows if WorkflowListScreen was never visited
            await WorkflowStorage.seedTestWorkflows();

            const workflows = await WorkflowStorage.getAll();
            console.log('[ShortcutPicker] Loaded workflows:', workflows.length, workflows.map(w => w.name));

            // Map workflows to SavedShortcut interface for compatibility
            // Include icon and color for display
            const mapped = workflows.map((wf) => ({
                id: wf.id,
                name: wf.name,
                prompt: wf.description || '',
                steps: wf.nodes?.map((n: any, index: number) => ({
                    step_id: index + 1,
                    type: 'SYSTEM_ACTION' as const,
                    action: n.type || 'UNKNOWN',
                    params: n.config || n.data || {}
                })) || [],
                createdAt: typeof wf.createdAt === 'number' ? new Date(wf.createdAt).toISOString() : (wf.createdAt || new Date().toISOString()),
                lastUsed: new Date().toISOString(),
                usageCount: 0,
                isFavorite: false,
                // Extra properties for widget display
                icon: wf.icon || '⚡',
                color: wf.color || '#6366F1'
            }));

            console.log('[ShortcutPicker] Mapped shortcuts:', mapped.length);
            setShortcuts(mapped as unknown as SavedShortcut[]);
        } catch (error) {
            console.error('[ShortcutPicker] Error loading workflows:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (steps: any[]): keyof typeof Ionicons.glyphMap => {
        if (!steps || steps.length === 0) return 'flash';
        const action = steps[0]?.action || '';

        // Workflow node types
        if (action.includes('AGENT_AI') || action.includes('AI')) return 'sparkles';
        if (action.includes('TELEGRAM')) return 'send';
        if (action.includes('GMAIL') || action.includes('EMAIL') || action.includes('MAIL')) return 'mail';
        if (action.includes('CALENDAR')) return 'calendar';
        if (action.includes('PDF') || action.includes('DOCUMENT')) return 'document-text';
        if (action.includes('NOTIFICATION') || action.includes('TOAST')) return 'notifications';
        if (action.includes('SPEAK') || action.includes('TTS')) return 'volume-high';
        if (action.includes('IMAGE')) return 'image';
        if (action.includes('HTTP') || action.includes('API')) return 'globe';
        if (action.includes('PROMPT') || action.includes('INPUT')) return 'create';
        // Legacy shortcut types
        if (action.includes('DND') || action.includes('SOUND')) return 'moon';
        if (action.includes('WIFI')) return 'wifi';
        if (action.includes('BLUETOOTH')) return 'bluetooth';
        if (action.includes('SMS')) return 'chatbubble';
        if (action.includes('ALARM')) return 'alarm';
        if (action.includes('RECORD')) return 'mic';
        if (action.includes('NAVIGATION')) return 'navigate';
        if (action.includes('APP')) return 'apps';
        return 'flash';
    };

    const renderItem = ({ item }: { item: SavedShortcut }) => {
        const isSelected = item.id === currentShortcutId;
        const workflowItem = item as any; // Access extra properties
        const hasCustomIcon = !!workflowItem.icon;
        const itemColor = workflowItem.color || colors.primary;

        return (
            <TouchableOpacity
                style={[
                    styles.shortcutItem,
                    {
                        backgroundColor: isSelected ? itemColor + '20' : colors.card,
                        borderColor: isSelected ? itemColor : colors.border,
                    }
                ]}
                onPress={() => onSelect(item)}
            >
                <View style={[styles.iconContainer, { backgroundColor: itemColor + '20' }]}>
                    {hasCustomIcon ? (
                        <Text style={{ fontSize: 24 }}>{workflowItem.icon}</Text>
                    ) : (
                        <Ionicons
                            name={getActionIcon(item.steps)}
                            size={20}
                            color={itemColor}
                        />
                    )}
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.shortcutName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={[styles.shortcutPrompt, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.steps.length} adım
                    </Text>
                </View>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={itemColor} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            {t('selectShortcut') || 'Otomasyon Seç'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : shortcuts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                {t('noShortcutsYet') || 'Henüz kayıtlı otomasyon yok'}
                            </Text>
                            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                                Önce bir otomasyon oluşturun
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={shortcuts}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
        minHeight: 300,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
    },
    emptyHint: {
        fontSize: 14,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    shortcutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    shortcutName: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    shortcutPrompt: {
        fontSize: 13,
    },
});
