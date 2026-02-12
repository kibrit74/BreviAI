import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { WidgetService } from '../services/WidgetService';
import { WidgetButton, DEFAULT_WIDGET_CONFIG } from '../types/widget';
import { SavedShortcut } from '../services/ShortcutStorage';
import { WorkflowStorage } from '../services/WorkflowStorage';
import ShortcutPickerModal from '../components/ui/ShortcutPickerModal';

// Import native module properly
let BreviSettings: any = null;
try {
    BreviSettings = require('brevi-settings');
} catch (e) {
    console.log('BreviSettings not available for WidgetConfigScreen');
}

interface WidgetButtonConfig extends WidgetButton {
    assignedShortcut?: SavedShortcut | null;
}

export default function WidgetConfigScreen({ navigation }: any) {
    const { colors, t } = useApp();
    const [buttons, setButtons] = useState<WidgetButtonConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedButtonIndex, setSelectedButtonIndex] = useState<number | null>(null);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadWidgetConfig();
        }, [])
    );

    const loadWidgetConfig = async () => {
        setLoading(true);
        try {
            const widgetService = WidgetService.getInstance();
            const prefs = await widgetService.getWidgetPreferences();

            // Get default widget or create one
            let config = prefs.defaultWidgetId
                ? prefs.widgets[prefs.defaultWidgetId]
                : null;

            // Use default buttons if no config exists
            const configButtons = config?.buttons || DEFAULT_WIDGET_CONFIG.buttons;

            // Load workflow details for each button (from WorkflowStorage, not ShortcutStorage)
            const workflows = await WorkflowStorage.getAll();
            const buttonsWithShortcuts: WidgetButtonConfig[] = configButtons.map(btn => {
                const assignedWorkflow = btn.shortcutId
                    ? workflows.find(w => w.id === btn.shortcutId) || null
                    : null;
                // Map workflow to SavedShortcut interface for compatibility
                const assignedShortcut = assignedWorkflow ? {
                    id: assignedWorkflow.id,
                    name: assignedWorkflow.name,
                    prompt: assignedWorkflow.description || '',
                    steps: [],
                    createdAt: assignedWorkflow.createdAt,
                    lastUsed: new Date().toISOString(),
                    usageCount: 0,
                    isFavorite: false,
                    icon: (assignedWorkflow as any).icon,
                    color: (assignedWorkflow as any).color
                } as SavedShortcut : null;
                return { ...btn, assignedShortcut };
            });

            setButtons(buttonsWithShortcuts);
        } catch (error) {
            console.error('Error loading widget config:', error);
            // Fallback to default
            setButtons(DEFAULT_WIDGET_CONFIG.buttons.map(btn => ({ ...btn, assignedShortcut: null })));
        } finally {
            setLoading(false);
        }
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
            // Save visual properties
            icon: workflowIcon,
            color: workflowColor
        };

        setButtons(updatedButtons);
        setHasChanges(true);
        setPickerVisible(false);
        setSelectedButtonIndex(null);
    };

    const handleClearButton = (index: number) => {
        const button = buttons[index];
        const defaultButton = DEFAULT_WIDGET_CONFIG.buttons[index];

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
            const prefs = await widgetService.getWidgetPreferences();

            // Create or update default widget config
            const widgetId = prefs.defaultWidgetId || 'default_widget';

            const configToSave = {
                id: widgetId,
                name: 'BreviAI Widget',
                size: '2x3' as const,
                // 🔥 FIXED: Pass only the ID string, not the entire object
                buttons: buttons.map(({ assignedShortcut, ...btn }) => ({
                    ...btn,
                    shortcutId: assignedShortcut?.id || undefined, // Pass ID string only!
                    action: assignedShortcut ? { type: 'workflow' as const, payload: { shortcutId: assignedShortcut.id } } : undefined,
                })),
                appearance: DEFAULT_WIDGET_CONFIG.appearance,
            };

            // Save to AsyncStorage via WidgetService
            // Save to AsyncStorage via WidgetService
            await widgetService.updateWidgetConfig({
                widgetId,
                config: configToSave,
                forceUpdate: true,
            });

            setHasChanges(false);
            Alert.alert(
                t('success') || 'Başarılı',
                'Widget konfigürasyonu kaydedildi. Widget\'ı güncellemek için ana ekrana gidin.'
            );
        } catch (error: any) {
            console.error('Error saving widget config:', error);
            Alert.alert(t('error') || 'Hata', 'Konfigürasyon kaydedilemedi: ' + (error.message || String(error)));
        } finally {
            setSaving(false);
        }
    };

    const getButtonIcon = (button: WidgetButtonConfig): string => {
        if (button.icon) return button.icon;
        if (button.assignedShortcut) return '⚡';
        return '➕';
    };

    const renderButton = (button: WidgetButtonConfig, index: number) => {
        const hasShortcut = !!button.assignedShortcut;
        const buttonColor = button.color || colors.primary;

        return (
            <TouchableOpacity
                key={button.id}
                style={[
                    styles.widgetButton,
                    {
                        backgroundColor: hasShortcut ? buttonColor + '15' : colors.card,
                        borderColor: hasShortcut ? buttonColor : colors.border,
                    }
                ]}
                onPress={() => handleButtonPress(index)}
                onLongPress={() => hasShortcut && handleClearButton(index)}
            >
                <Text style={styles.buttonIcon}>{getButtonIcon(button)}</Text>
                <Text
                    style={[styles.buttonLabel, { color: colors.text }]}
                    numberOfLines={2}
                >
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

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    Widget Ayarları
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Instructions */}
                <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="information-circle" size={20} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Butona dokunarak otomasyon atayın. Silmek için uzun basın.
                    </Text>
                </View>

                {/* Widget Preview */}
                <View style={[styles.widgetPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>
                        Widget Önizleme
                    </Text>

                    <View style={styles.buttonGrid}>
                        {/* Row 1 */}
                        <View style={styles.buttonRow}>
                            {buttons.slice(0, 3).map((btn, idx) => renderButton(btn, idx))}
                        </View>
                        {/* Row 2 */}
                        <View style={styles.buttonRow}>
                            {buttons.slice(3, 6).map((btn, idx) => renderButton(btn, idx + 3))}
                        </View>
                    </View>
                </View>

                {/* Button List */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Buton Detayları
                </Text>

                {buttons.map((button, index) => (
                    <View
                        key={button.id}
                        style={[styles.buttonDetail, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                        <Text style={styles.detailIcon}>{getButtonIcon(button)}</Text>
                        <View style={styles.detailContent}>
                            <Text style={[styles.detailLabel, { color: colors.text }]}>
                                Buton {index + 1}
                            </Text>
                            <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                                {button.assignedShortcut ? button.label : 'Varsayılan: ' + button.label}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.editButton, { backgroundColor: colors.primary + '20' }]}
                            onPress={() => handleButtonPress(index)}
                        >
                            <Ionicons name="pencil" size={16} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>

            {/* Save Button */}
            {hasChanges && (
                <View style={[styles.saveContainer, { backgroundColor: colors.background }]}>
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.primary }]}
                        onPress={saveWidgetConfig}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="save" size={20} color="#fff" />
                                <Text style={styles.saveButtonText}>Kaydet</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Shortcut Picker Modal */}
            <ShortcutPickerModal
                visible={pickerVisible}
                onSelect={handleShortcutSelect}
                onClose={() => {
                    setPickerVisible(false);
                    setSelectedButtonIndex(null);
                }}
                currentShortcutId={
                    selectedButtonIndex !== null
                        ? buttons[selectedButtonIndex]?.shortcutId
                        : undefined
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 8,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
    },
    widgetPreview: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    previewTitle: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 12,
        textAlign: 'center',
    },
    buttonGrid: {
        gap: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    widgetButton: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        position: 'relative',
    },
    buttonIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    buttonLabel: {
        fontSize: 11,
        textAlign: 'center',
        fontWeight: '500',
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    buttonDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
    },
    detailIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 13,
    },
    editButton: {
        padding: 8,
        borderRadius: 8,
    },
    saveContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 32,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
