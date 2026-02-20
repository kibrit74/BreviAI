import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { WidgetService } from '../services/WidgetService';
import {
    WidgetButton,
    WidgetSize,
    WIDGET_LAYOUTS,
    DEFAULT_WIDGET_CONFIG,
    normalizeWidgetButtons,
    createDefaultButtonsForSize,
} from '../types/widget';
import { SavedShortcut } from '../services/ShortcutStorage';
import { WorkflowStorage } from '../services/WorkflowStorage';
import ShortcutPickerModal from '../components/ui/ShortcutPickerModal';

interface WidgetButtonConfig extends WidgetButton {
    assignedShortcut?: SavedShortcut | null;
}

interface WidgetConfigRouteParams {
    widgetId?: string;
}

const SIZE_OPTIONS: Array<{ value: WidgetSize; title: string; subtitle: string }> = [
    { value: '2x2', title: '2x2', subtitle: '4 tus' },
    { value: '2x3', title: '2x3', subtitle: '6 tus' },
    { value: '4x2', title: '4x2', subtitle: '8 tus' },
];

function mapWorkflowToSavedShortcut(workflow: any): SavedShortcut {
    return {
        id: workflow.id,
        name: workflow.name,
        prompt: workflow.description || '',
        steps: [],
        createdAt: workflow.createdAt,
        lastUsed: new Date().toISOString(),
        usageCount: 0,
        isFavorite: false,
        icon: workflow.icon,
        color: workflow.color,
    } as SavedShortcut;
}

export default function WidgetConfigScreen({ navigation }: any) {
    const { colors, t } = useApp();
    const route = useRoute();
    const routeParams = (route.params || {}) as WidgetConfigRouteParams;
    const requestedWidgetId = typeof routeParams.widgetId === 'string' ? routeParams.widgetId : undefined;

    const [buttons, setButtons] = useState<WidgetButtonConfig[]>([]);
    const [widgetSize, setWidgetSize] = useState<WidgetSize>('2x3');
    const [widgetName, setWidgetName] = useState('BreviAI Widget');
    const [currentWidgetId, setCurrentWidgetId] = useState(requestedWidgetId || 'default_widget');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedButtonIndex, setSelectedButtonIndex] = useState<number | null>(null);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadWidgetConfig();
        }, [requestedWidgetId])
    );

    const loadWidgetConfig = async () => {
        setLoading(true);
        try {
            const widgetService = WidgetService.getInstance();
            const prefs = await widgetService.getWidgetPreferences();
            const resolvedWidgetId = requestedWidgetId || prefs.defaultWidgetId || 'default_widget';

            const directConfig = prefs.widgets[resolvedWidgetId];
            const fallbackConfig = prefs.defaultWidgetId ? prefs.widgets[prefs.defaultWidgetId] : null;
            const config = directConfig || fallbackConfig || null;
            const size = (config?.size || DEFAULT_WIDGET_CONFIG.size) as WidgetSize;

            const workflows = await WorkflowStorage.getAll();
            const workflowsById = new Map(workflows.map((w: any) => [w.id, w]));

            const normalizedButtons = normalizeWidgetButtons(config?.buttons, size);
            const hydratedButtons: WidgetButtonConfig[] = normalizedButtons.map((button) => {
                const assignedWorkflow = button.shortcutId ? workflowsById.get(button.shortcutId) : null;
                const assignedShortcut = assignedWorkflow ? mapWorkflowToSavedShortcut(assignedWorkflow) : null;

                return {
                    ...button,
                    assignedShortcut,
                };
            });

            setCurrentWidgetId(resolvedWidgetId);
            setWidgetName(config?.name || 'BreviAI Widget');
            setWidgetSize(size);
            setButtons(hydratedButtons);
            setHasChanges(false);
        } catch (error) {
            console.error('Error loading widget config:', error);
            const fallbackSize: WidgetSize = '2x3';
            setWidgetSize(fallbackSize);
            setButtons(createDefaultButtonsForSize(fallbackSize).map((btn) => ({ ...btn, assignedShortcut: null })));
        } finally {
            setLoading(false);
        }
    };

    const resizeButtons = (nextSize: WidgetSize) => {
        const existing = buttons.map(({ assignedShortcut, ...btn }) => ({
            ...btn,
            shortcutId: assignedShortcut?.id || btn.shortcutId,
            action: assignedShortcut ? { type: 'workflow' as const, payload: { shortcutId: assignedShortcut.id } } : btn.action,
        }));

        const normalized = normalizeWidgetButtons(existing, nextSize);
        const previousById = new Map(buttons.map((btn) => [btn.id, btn]));

        return normalized.map((button) => ({
            ...button,
            assignedShortcut: previousById.get(button.id)?.assignedShortcut || null,
        }));
    };

    const handleSizeChange = (nextSize: WidgetSize) => {
        if (nextSize === widgetSize) return;
        setWidgetSize(nextSize);
        setButtons(resizeButtons(nextSize));
        setHasChanges(true);
    };

    const handleButtonPress = (index: number) => {
        setSelectedButtonIndex(index);
        setPickerVisible(true);
    };

    const handleShortcutSelect = (shortcut: SavedShortcut) => {
        if (selectedButtonIndex === null) return;

        const workflowItem = shortcut as any;
        const workflowIcon = workflowItem.icon;
        const workflowColor = workflowItem.color;

        const updatedButtons = [...buttons];
        updatedButtons[selectedButtonIndex] = {
            ...updatedButtons[selectedButtonIndex],
            shortcutId: shortcut.id,
            label: shortcut.name,
            assignedShortcut: shortcut,
            action: { type: 'workflow', payload: { shortcutId: shortcut.id } },
            icon: workflowIcon,
            color: workflowColor,
        };

        setButtons(updatedButtons);
        setHasChanges(true);
        setPickerVisible(false);
        setSelectedButtonIndex(null);
    };

    const handleClearButton = (index: number) => {
        const defaultButton = createDefaultButtonsForSize(widgetSize)[index];
        if (!defaultButton) return;

        const updatedButtons = [...buttons];
        updatedButtons[index] = {
            ...defaultButton,
            assignedShortcut: null,
        };

        setButtons(updatedButtons);
        setHasChanges(true);
    };

    const saveWidgetConfig = async () => {
        setSaving(true);
        try {
            const widgetService = WidgetService.getInstance();

            const normalizedButtons = normalizeWidgetButtons(
                buttons.map(({ assignedShortcut, ...btn }) => ({
                    ...btn,
                    shortcutId: assignedShortcut?.id || undefined,
                    action: assignedShortcut
                        ? { type: 'workflow' as const, payload: { shortcutId: assignedShortcut.id } }
                        : undefined,
                })),
                widgetSize
            );

            const configToSave = {
                id: currentWidgetId,
                name: widgetName,
                size: widgetSize,
                buttons: normalizedButtons,
                appearance: DEFAULT_WIDGET_CONFIG.appearance,
            };

            await widgetService.updateWidgetConfig({
                widgetId: currentWidgetId,
                config: configToSave,
                forceUpdate: true,
            });

            if (!requestedWidgetId) {
                await widgetService.setDefaultWidget(currentWidgetId);
            }

            setHasChanges(false);
            Alert.alert(t('success') || 'Basarili', 'Widget ayarlari kaydedildi.');
        } catch (error: any) {
            console.error('Error saving widget config:', error);
            Alert.alert(t('error') || 'Hata', 'Kaydedilemedi: ' + (error?.message || String(error)));
        } finally {
            setSaving(false);
        }
    };

    const getButtonIcon = (button: WidgetButtonConfig): string => {
        if (button.icon) return button.icon;
        if (button.assignedShortcut) return 'AI';
        return '+';
    };

    const renderButton = (button: WidgetButtonConfig, index: number) => {
        const hasShortcut = !!button.assignedShortcut;
        const buttonColor = button.color || colors.primary;

        return (
            <TouchableOpacity
                key={`${button.id}-${index}`}
                style={[
                    styles.widgetButton,
                    {
                        backgroundColor: hasShortcut ? `${buttonColor}1A` : '#101827',
                        borderColor: hasShortcut ? buttonColor : '#243447',
                    },
                ]}
                onPress={() => handleButtonPress(index)}
                onLongPress={() => hasShortcut && handleClearButton(index)}
                activeOpacity={0.85}
            >
                <Text style={styles.buttonIcon}>{getButtonIcon(button)}</Text>
                <Text style={styles.buttonLabel} numberOfLines={2}>
                    {button.label}
                </Text>
                {hasShortcut && (
                    <View style={[styles.assignedBadge, { backgroundColor: buttonColor }]}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderPreviewGrid = () => {
        const layout = WIDGET_LAYOUTS[widgetSize];
        const rows: WidgetButtonConfig[][] = [];

        for (let rowIndex = 0; rowIndex < layout.rows; rowIndex++) {
            const start = rowIndex * layout.columns;
            rows.push(buttons.slice(start, start + layout.columns));
        }

        return (
            <View style={styles.buttonGrid}>
                {rows.map((row, rowIndex) => (
                    <View style={styles.buttonRow} key={`row-${rowIndex}`}>
                        {row.map((button, colIndex) => renderButton(button, rowIndex * layout.columns + colIndex))}
                    </View>
                ))}
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: '#050B16' }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#050B16' }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={22} color="#E6EEF8" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Widget Studio</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <LinearGradient
                    colors={['#0EA5E9', '#2563EB', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <Text style={styles.heroTitle}>{widgetName}</Text>
                    <Text style={styles.heroSubtitle}>Widget ID: {currentWidgetId}</Text>
                    <Text style={styles.heroHint}>Kisa dokun: ata - Uzun dokun: temizle</Text>
                </LinearGradient>

                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Boyut</Text>
                    <Text style={styles.sectionSubtitle}>Aktif: {widgetSize}</Text>
                </View>

                <View style={styles.sizeSelectorRow}>
                    {SIZE_OPTIONS.map((option) => {
                        const isActive = option.value === widgetSize;
                        return (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.sizeChip, isActive && styles.sizeChipActive]}
                                onPress={() => handleSizeChange(option.value)}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.sizeChipTitle, isActive && styles.sizeChipTitleActive]}>{option.title}</Text>
                                <Text style={[styles.sizeChipSubtitle, isActive && styles.sizeChipSubtitleActive]}>{option.subtitle}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.previewCard}>
                    <View style={styles.previewHeader}>
                        <Text style={styles.previewTitle}>Canli Onizleme</Text>
                        <View style={styles.previewBadge}>
                            <Text style={styles.previewBadgeText}>{WIDGET_LAYOUTS[widgetSize].buttonCount} tus</Text>
                        </View>
                    </View>
                    {renderPreviewGrid()}
                </View>

                <Text style={styles.sectionTitle}>Tus Atamalari</Text>

                {buttons.map((button, index) => {
                    const hasShortcut = !!button.assignedShortcut;
                    return (
                        <View key={`${button.id}-detail`} style={styles.buttonDetail}>
                            <View style={styles.detailIconWrap}>
                                <Text style={styles.detailIcon}>{getButtonIcon(button)}</Text>
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Tus {index + 1}</Text>
                                <Text style={styles.detailValue} numberOfLines={1}>
                                    {hasShortcut ? button.label : 'Atama yok'}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.detailActionBtn} onPress={() => handleButtonPress(index)}>
                                <Ionicons name="pencil" size={15} color="#D5E6FF" />
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </ScrollView>

            {hasChanges && (
                <View style={styles.saveContainer}>
                    <TouchableOpacity onPress={saveWidgetConfig} disabled={saving} activeOpacity={0.85}>
                        <LinearGradient
                            colors={saving ? ['#334155', '#334155'] : ['#06B6D4', '#2563EB']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.saveButton}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="save" size={18} color="#fff" />
                                    <Text style={styles.saveButtonText}>Kaydet</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            <ShortcutPickerModal
                visible={pickerVisible}
                onSelect={handleShortcutSelect}
                onClose={() => {
                    setPickerVisible(false);
                    setSelectedButtonIndex(null);
                }}
                currentShortcutId={
                    selectedButtonIndex !== null ? buttons[selectedButtonIndex]?.shortcutId : undefined
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 120,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#101B2E',
        borderWidth: 1,
        borderColor: '#25354A',
    },
    headerTitle: {
        color: '#E8EEF8',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    headerSpacer: {
        width: 36,
    },
    heroCard: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            android: { elevation: 6 },
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 14,
            },
        }),
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    heroSubtitle: {
        color: '#E6F2FF',
        fontSize: 12,
        marginTop: 6,
    },
    heroHint: {
        color: '#F3F8FF',
        marginTop: 10,
        fontSize: 12,
        fontWeight: '500',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        color: '#E8EEF8',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 10,
    },
    sectionSubtitle: {
        color: '#A7BBD8',
        fontSize: 12,
        fontWeight: '500',
    },
    sizeSelectorRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    sizeChip: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2A3D57',
        backgroundColor: '#101827',
        paddingVertical: 10,
        alignItems: 'center',
    },
    sizeChipActive: {
        borderColor: '#60A5FA',
        backgroundColor: '#172B44',
    },
    sizeChipTitle: {
        color: '#D2DCE8',
        fontSize: 14,
        fontWeight: '700',
    },
    sizeChipTitleActive: {
        color: '#FFFFFF',
    },
    sizeChipSubtitle: {
        color: '#8FA3BC',
        fontSize: 11,
        marginTop: 2,
    },
    sizeChipSubtitleActive: {
        color: '#CFE4FF',
    },
    previewCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2A3D57',
        backgroundColor: '#0C1626',
        padding: 14,
        marginBottom: 18,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    previewTitle: {
        color: '#DDE9F8',
        fontSize: 13,
        fontWeight: '600',
    },
    previewBadge: {
        borderRadius: 999,
        backgroundColor: '#1D3758',
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    previewBadgeText: {
        color: '#BBD7FF',
        fontSize: 10,
        fontWeight: '600',
    },
    buttonGrid: {
        gap: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8,
    },
    widgetButton: {
        flex: 1,
        minHeight: 74,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        position: 'relative',
    },
    buttonIcon: {
        color: '#F2F7FF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 5,
    },
    buttonLabel: {
        color: '#E4EDF8',
        fontSize: 11,
        textAlign: 'center',
        fontWeight: '600',
    },
    assignedBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2A3D57',
        backgroundColor: '#0D1829',
        padding: 12,
        marginBottom: 9,
    },
    detailIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#1A2C45',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    detailIcon: {
        color: '#EFF6FF',
        fontSize: 14,
        fontWeight: '700',
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        color: '#E6EEF8',
        fontSize: 13,
        fontWeight: '600',
    },
    detailValue: {
        color: '#9EB3CC',
        fontSize: 12,
        marginTop: 2,
    },
    detailActionBtn: {
        width: 34,
        height: 34,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#315075',
        backgroundColor: '#172840',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 28,
        backgroundColor: 'rgba(5, 11, 22, 0.96)',
    },
    saveButton: {
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
