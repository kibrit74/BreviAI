import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useApp } from '../context/AppContext';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { LogicFlowStep, LogicStep } from '../components/ui/LogicFlowStep';
import { apiService } from '../services/ApiService';
import { ShortcutStorage } from '../services/ShortcutStorage';

export default function ShortcutDetailScreen({ route, navigation }: any) {
    const { theme, t } = useApp();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? COLORS.dark : COLORS.light;
    const insets = useSafeAreaInsets();

    // Get shortcut from route params
    const shortcut = route.params?.shortcut || {
        name: 'Unnamed Automation',
        title: 'Unnamed Automation',
        template_json: { steps: [] }
    };

    const [name, setName] = useState(shortcut.name || shortcut.title || 'Unnamed');
    const [editNameModalVisible, setEditNameModalVisible] = useState(false);
    const [tempName, setTempName] = useState(name);
    const [magicEditModalVisible, setMagicEditModalVisible] = useState(false);
    const [magicEditPrompt, setMagicEditPrompt] = useState('');
    const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Convert actual shortcut steps to LogicStep format for display
    const convertStepsToLogicSteps = (templateSteps: any[]): LogicStep[] => {
        if (!templateSteps || templateSteps.length === 0) {
            // Return demo data if no steps provided
            return [
                {
                    id: '1',
                    type: 'trigger',
                    title: t('noShortcutsYet'),
                    subtitle: t('createShortcutHint'),
                    icon: 'help-circle-outline',
                }
            ];
        }

        return templateSteps.map((step, index) => {
            const actionName = step.action || step.type || 'Unknown';
            const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
                'SET_WIFI': 'wifi-outline',
                'TOGGLE_WIFI': 'wifi-outline',
                'SET_BLUETOOTH': 'bluetooth-outline',
                'TOGGLE_BLUETOOTH': 'bluetooth-outline',
                'SET_DND_MODE': 'moon-outline',
                'SEND_SMS': 'chatbubble-outline',
                'SEND_EMAIL': 'mail-outline',
                'OPEN_APP': 'apps-outline',
                'CREATE_NOTE': 'document-text-outline',
                'SET_ALARM': 'alarm-outline',
                'RECORD_AUDIO': 'mic-outline',
                'SET_VOLUME': 'volume-high-outline',
                'TOGGLE_FLASHLIGHT': 'flashlight-outline',
            };

            return {
                id: String(index + 1),
                type: index === 0 ? 'trigger' : 'action',
                title: actionName.replace(/_/g, ' '),
                subtitle: step.params ? JSON.stringify(step.params).slice(0, 50) : '',
                icon: iconMap[actionName] || 'flash-outline',
                isSystem: true,
            };
        });
    };

    const templateJson = shortcut.template_json as any;
    const templateSteps = templateJson?.steps || [];
    const [steps, setSteps] = useState<LogicStep[]>(convertStepsToLogicSteps(templateSteps));

    const handleSave = () => {
        Alert.alert(t('success'), t('automationSaved'));
        navigation.goBack();
    };

    const handleAddToMyShortcuts = async () => {
        try {
            await ShortcutStorage.save({
                name: name,
                prompt: name,
                steps: templateSteps,
            });
            Alert.alert(t('success'), t('addedToMyShortcuts') || 'Kestirmelerime eklendi!');
        } catch (error) {
            console.error('Save shortcut error:', error);
            Alert.alert(t('error'), t('saveFailed') || 'Kaydedilemedi');
        }
    };

    const handleEditName = () => {
        setTempName(name);
        setEditNameModalVisible(true);
    };

    const handleSaveName = () => {
        setName(tempName);
        setEditNameModalVisible(false);
        Alert.alert(t('success'), t('nameUpdated') || 'İsim güncellendi!');
    };

    const handleGenerateWithGemini = () => {
        // Navigate to WorkflowBuilder with edit mode
        navigation.navigate('WorkflowBuilder', {
            template: {
                title: name,
                description: name,
                template_json: { steps: steps.map(s => ({ action: s.title, type: s.type })) }
            },
            autoOpenAI: true // Open AI modal in builder
        });
    };

    const handleMagicEdit = () => {
        setSelectedStepIndex(null); // null = edit all
        setMagicEditPrompt('');
        setMagicEditModalVisible(true);
    };

    const handleStepEdit = (stepIndex: number) => {
        setSelectedStepIndex(stepIndex);
        setMagicEditPrompt('');
        setMagicEditModalVisible(true);
    };

    const handleApplyMagicEdit = async () => {
        if (!magicEditPrompt.trim()) {
            Alert.alert(t('error'), t('enterPrompt'));
            return;
        }

        setMagicEditModalVisible(false);
        setIsProcessing(true); // Show loading

        try {
            const editContext = selectedStepIndex !== null
                ? `Sadece şu adımı düzenle: ${steps[selectedStepIndex]?.title}. İstek: `
                : `Tüm otomasyonu düzenle. Mevcut adımlar: ${steps.map(s => s.title).join(', ')}. İstek: `;

            const result = await apiService.generateShortcut(editContext + magicEditPrompt, 'tr');

            if (result && result.steps && result.steps.length > 0) {
                if (selectedStepIndex !== null) {
                    // Only update the selected step, keep others
                    const newStep = convertStepsToLogicSteps(result.steps)[0];
                    if (newStep) {
                        const updatedSteps = [...steps];
                        updatedSteps[selectedStepIndex] = {
                            ...newStep,
                            id: steps[selectedStepIndex].id, // Keep original ID
                        };
                        setSteps(updatedSteps);
                    }
                } else {
                    // Update all steps (full edit mode)
                    const newSteps = convertStepsToLogicSteps(result.steps);
                    setSteps(newSteps);
                }

                Alert.alert(t('success'), t('automationSaved') || 'Otomasyon güncellendi!');
            } else {
                Alert.alert(t('error'), t('generationError') || 'Düzenleme yapılamadı');
            }
        } catch (error) {
            console.error('Magic edit error:', error);
            Alert.alert(t('error'), t('generationError') || 'Bir hata oluştu');
        } finally {
            setIsProcessing(false); // Hide loading
        }
    };

    const handleRunAutomation = () => {
        Alert.alert(t('run'), t('executingAutomation'));
    };

    return (
        <View style={[styles.container, { backgroundColor: currentTheme.background, paddingTop: insets.top }]}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={24} color={currentTheme.text} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.runButton, { backgroundColor: currentTheme.primary, marginTop: 4 }]}
                    onPress={handleRunAutomation}
                >
                    <Ionicons name="play" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.runButtonText}>{t('run')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={[styles.label, { color: currentTheme.textSecondary }]}>{t('automationName')}</Text>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: currentTheme.text }]}>{name}</Text>
                        <TouchableOpacity onPress={handleEditName}>
                            <Ionicons name="pencil" size={20} color={currentTheme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* AI Actions */}
                <View style={styles.aiActions}>
                    <TouchableOpacity style={styles.aiButton} onPress={handleGenerateWithGemini}>
                        <LinearGradient
                            colors={['#4f46e5', '#7c3aed']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.aiGradient}
                        >
                            <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.aiButtonText}>{t('generateWithGemini')}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.magicButton, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]} onPress={handleMagicEdit}>
                        <Ionicons name="build-outline" size={18} color={currentTheme.text} style={{ marginRight: 6 }} />
                        <Text style={[styles.magicButtonText, { color: currentTheme.text }]}>{t('magicEdit')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Accessibility Warning (like in screenshot) */}
                <View style={[styles.warningCard, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                    <View style={styles.warningIcon}>
                        <Ionicons name="accessibility" size={24} color="#f59e0b" />
                    </View>
                    <View style={styles.warningContent}>
                        <Text style={[styles.warningTitle, { color: currentTheme.text }]}>{t('accessibilityPermissions')}</Text>
                        <Text style={styles.warningText}>{t('accessibilityDesc')}</Text>
                        <TouchableOpacity style={[styles.grantButton, { backgroundColor: '#f59e0b' }]}>
                            <Text style={styles.grantButtonText}>{t('grantAccess')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logic Flow */}
                <Text style={[styles.label, { color: currentTheme.textSecondary, marginTop: SPACING.medium }]}>{t('logicFlow')}</Text>

                <View style={styles.flowContainer}>
                    {steps.map((step, index) => (
                        <LogicFlowStep
                            key={step.id}
                            step={step}
                            isLast={index === steps.length - 1}
                            isDark={isDark}
                            onPress={() => handleStepEdit(index)}
                        />
                    ))}

                    {/* Add Step Button */}
                    <TouchableOpacity
                        style={styles.addStepButton}
                        onPress={() => Alert.alert(t('addNextStep'), t('stepLibraryDesc'))}
                    >
                        <View style={[styles.addIconCircle, { backgroundColor: currentTheme.surface }]}>
                            <Ionicons name="add" size={20} color={currentTheme.textSecondary} />
                        </View>
                        <Text style={[styles.addStepText, { color: currentTheme.textSecondary }]}>{t('addNextStep')}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: currentTheme.background, paddingBottom: insets.bottom + SPACING.small }]}>
                <TouchableOpacity style={[styles.footerIcon, { backgroundColor: currentTheme.primary }]} onPress={handleAddToMyShortcuts}>
                    <Ionicons name="bookmark" size={20} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.saveMainButton, { backgroundColor: currentTheme.surface }]} onPress={handleSave}>
                    <Text style={[styles.saveText, { color: currentTheme.text }]}>{t('saveAutomation')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.footerIcon, { backgroundColor: currentTheme.surface }]}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={currentTheme.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Edit Name Modal */}
            <Modal
                visible={editNameModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setEditNameModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: currentTheme.card }]}>
                        <Text style={[styles.modalTitle, { color: currentTheme.text }]}>{t('edit')} {t('automationName')}</Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border }]}
                            value={tempName}
                            onChangeText={setTempName}
                            placeholder={t('automationName')}
                            placeholderTextColor={currentTheme.textSecondary}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: currentTheme.surface }]} onPress={() => setEditNameModalVisible(false)}>
                                <Text style={{ color: currentTheme.text }}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: currentTheme.primary }]} onPress={handleSaveName}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Magic Edit Modal */}
            <Modal
                visible={magicEditModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setMagicEditModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: currentTheme.card }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Ionicons name="build" size={24} color={currentTheme.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.modalTitle, { color: currentTheme.text, marginBottom: 0 }]}>{t('magicEdit')}</Text>
                        </View>
                        <Text style={{ color: currentTheme.textSecondary, marginBottom: 12, textAlign: 'center' }}>
                            {selectedStepIndex !== null
                                ? `${selectedStepIndex + 1}. adımı düzenle: ${steps[selectedStepIndex]?.title}`
                                : 'Tüm otomasyonu AI ile düzenle'
                            }
                        </Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border, minHeight: 80 }]}
                            value={magicEditPrompt}
                            onChangeText={setMagicEditPrompt}
                            placeholder="Örn: Ses seviyesini %50'ye düşür, DND modunu ekle..."
                            placeholderTextColor={currentTheme.textSecondary}
                            multiline
                            textAlignVertical="top"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: currentTheme.surface }]} onPress={() => setMagicEditModalVisible(false)}>
                                <Text style={{ color: currentTheme.text }}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: currentTheme.primary }]} onPress={handleApplyMagicEdit}>
                                <Ionicons name="sparkles" size={16} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('generateWithGemini')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Processing Overlay */}
            {isProcessing && (
                <View style={styles.processingOverlay}>
                    <View style={[styles.processingContent, { backgroundColor: currentTheme.card }]}>
                        <ActivityIndicator size="large" color={currentTheme.primary} />
                        <Text style={[styles.processingText, { color: currentTheme.text }]}>
                            {t('analyzing') || 'AI düzenliyor...'}
                        </Text>
                        <Text style={{ color: currentTheme.textSecondary, fontSize: 12, textAlign: 'center' }}>
                            Bu işlem birkaç saniye sürebilir
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.medium,
        paddingBottom: SPACING.medium,
    },
    iconButton: {
        padding: 4,
    },
    runButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    runButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    content: {
        paddingHorizontal: SPACING.medium,
        paddingBottom: 120,
    },
    titleSection: {
        marginBottom: SPACING.medium,
    },
    label: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        // fontFamily removed - system font with fontWeight is sufficient
    },
    aiActions: {
        flexDirection: 'row',
        gap: SPACING.medium,
        marginBottom: SPACING.large,
        marginTop: SPACING.small, // Add top margin to separate from title
    },
    aiButton: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
    },
    aiGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    aiButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    magicButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        borderWidth: 1,
        paddingVertical: 10,
    },
    magicButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    warningCard: {
        borderRadius: 16,
        padding: SPACING.medium,
        borderWidth: 1,
        flexDirection: 'row',
        marginBottom: SPACING.large,
    },
    warningIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.medium,
    },
    warningContent: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    warningText: {
        fontSize: 12,
        color: '#9ca3af', // Gray 400
        marginBottom: 12,
    },
    grantButton: {
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
    },
    grantButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
    },
    flowContainer: {
        marginTop: SPACING.small,
    },
    addStepButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    addIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.medium,
        marginLeft: 4, // Align with logic flow timeline
    },
    addStepText: {
        fontSize: 14,
        fontWeight: '500',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: SPACING.medium,
    },
    footerIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveMainButton: {
        flex: 1,
        marginHorizontal: SPACING.medium,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    processingContent: {
        padding: 32,
        borderRadius: 20,
        alignItems: 'center',
        gap: 16,
    },
    processingText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
    },
});
