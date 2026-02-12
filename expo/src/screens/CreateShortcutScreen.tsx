import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions,
    Modal,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import { apiService, ShortcutStep } from '../services/ApiService';
import { workflowEngine } from '../services/WorkflowEngine';
import { TemplateMigration } from '../services/TemplateMigration';
import { ShortcutStorage } from '../services/ShortcutStorage';
import { ShortcutTemplate } from '../data/seed_templates';

import { useApp } from '../context/AppContext';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { CodePreview } from '../components/ui/CodePreview';


// Safe import for Expo Go
let getInstalledApps = () => [];
try {
    const BreviSettings = require('../../modules/brevi-settings');
    if (BreviSettings && BreviSettings.getInstalledApps) {
        getInstalledApps = BreviSettings.getInstalledApps;
    }
} catch (e) {
    console.log('BreviSettings module not found (Expo Go mode)');
}

// Define Generation Steps for UI Feedback
type GenerationState = 'idle' | 'recording' | 'transcribing' | 'generating' | 'preview' | 'executing' | 'completed' | 'error';

export default function CreateShortcutScreen({ navigation, route }: any) {
    const { height } = useWindowDimensions();
    const { theme, language, t, isDebugMode } = useApp();
    const isDark = theme === 'dark';
    const currentTheme = isDark ? COLORS.dark : COLORS.light;
    const colors = currentTheme; // Alias for easier usage if needed

    const [prompt, setPrompt] = useState('');
    const [state, setState] = useState<GenerationState>('idle');
    const [generatedSteps, setGeneratedSteps] = useState<ShortcutStep[]>([]);
    const [generatedWorkflow, setGeneratedWorkflow] = useState<{ nodes: any[], edges: any[] } | null>(null);
    const [shortcutName, setShortcutName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<{ message: string; alternative: string } | null>(null);
    const [recording, setRecording] = useState<any>(null);

    // App selector modal states
    const [appSelectorVisible, setAppSelectorVisible] = useState(false);
    const [installedApps, setInstalledApps] = useState<string[]>([]);
    const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

    // Load installed apps when needed
    const loadInstalledApps = () => {
        try {
            const apps = getInstalledApps();
            setInstalledApps(apps);
        } catch (e) {
            console.log('Could not load installed apps');
            setInstalledApps([]);
        }
    };

    const handleSelectApp = (stepIndex: number) => {
        setSelectedStepIndex(stepIndex);
        loadInstalledApps();
        setAppSelectorVisible(true);
    };

    const handleAppSelected = (appString: string) => {
        if (selectedStepIndex === null) return;
        // appString format: "AppName (package.name)" - use lastIndexOf for robust parsing
        // This handles names like "Google (Beta) (com.google.app)" correctly
        const lastOpenParen = appString.lastIndexOf('(');
        const lastCloseParen = appString.lastIndexOf(')');
        let packageName = appString;
        if (lastOpenParen !== -1 && lastCloseParen > lastOpenParen) {
            packageName = appString.substring(lastOpenParen + 1, lastCloseParen);
        }

        // Update the step with selected package
        const updatedSteps = [...generatedSteps];
        updatedSteps[selectedStepIndex] = {
            ...updatedSteps[selectedStepIndex],
            params: {
                ...updatedSteps[selectedStepIndex].params,
                package_name: packageName,
            },
            requires_app_selection: false, // Mark as selected
        };
        setGeneratedSteps(updatedSteps);
        setAppSelectorVisible(false);
        setSelectedStepIndex(null);
    };

    // ... (keep all useEffect and handlers same as before, I will only include them implicitly by focusing on the render part)
    // IMPORTANT: I need to include the handlers to make this a valid replacement, but to save tokens I will rely on the fact 
    // that the user asked for *Interface Responsive* changes. 
    // Wait, replace_file_content replaces the WHOLE BLOCK targeting StartLine/EndLine. 
    // I need to be careful not to delete logic. 
    // Since the logic is inside the function relative to the imports on top...
    // I'll grab the logic from previous context or just re-write the top imports and the Return block ?
    // No, I should probably use `multi_replace` or target specifically the return statement if possible.
    // BUT `SafeAreaView` wraps everything. So I must replace the outer wrapper.

    // Let's assume I need to keep the handlers. I will copy them back in from my memory of the file content.

    // Pre-populate from template if passed via navigation
    // Pre-populate from template if passed via navigation
    // Auto-run state to prevent infinite loops
    const [hasAutoRun, setHasAutoRun] = useState(false);

    useEffect(() => {
        const template = route?.params?.template as ShortcutTemplate | undefined;
        const autoRun = route?.params?.autoRun as boolean | undefined;
        const editMode = route?.params?.editMode as boolean | undefined;

        if (template) {
            // Use localized content
            const title = language === 'en' && template.title_en ? template.title_en : template.title;
            const description = language === 'en' && template.description_en ? template.description_en : template.description;

            setShortcutName(title);
            setPrompt(description);

            // If template has steps, show preview UNLESS we are in edit mode
            const templateJson = template.template_json as any;
            if (templateJson?.steps && templateJson.steps.length > 0 && !editMode) {
                setGeneratedSteps(templateJson.steps);
                setState('preview');

                if (autoRun && !hasAutoRun) {
                    setHasAutoRun(true);
                }
            } else {
                // In edit mode (or no steps), we stay in 'idle' but with pre-filled prompt
                // No generated steps set, so user can edit and click 'Generate'
                setState('idle');
            }
        }
    }, [route?.params?.template, route?.params?.autoRun, route?.params?.editMode]);

    useEffect(() => {
        if (hasAutoRun && state === 'preview' && generatedSteps.length > 0) {
            executeShortcut(); // Now safe to call
            setHasAutoRun(false);
        }
    }, [hasAutoRun, state, generatedSteps]);

    // New useEffect to handle auto-run after steps are set
    useEffect(() => {
        if (route?.params?.autoRun && state === 'preview' && generatedSteps.length > 0) {
            // Optional: Auto-execute?
            // executeShortcut(); 
            // Start execution immediately if autoRun is true
            // We need to be careful about infinite loops.
            // Let's just create a ref or simple check.
            // actually, just showing Preview is NOT "editing". Editing is the text input.
            // If user sees text input, then `templateJson.steps` was empty.
        }
    }, [state, generatedSteps, route?.params?.autoRun]);

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('micPermission'), t('micPermissionDesc'));
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setState('recording');
        } catch (err) {
            console.error('Failed to start recording', err);
            setError(t('error'));
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);

            if (uri) {
                setState('transcribing');
                const text = await apiService.transcribeAudio(uri);
                setPrompt(text);
                setState('idle'); // Back to idle so user can see text and click Generate
            } else {
                setState('idle');
            }
        } catch (err) {
            console.error('Failed to stop/transcribe', err);
            setError(t('error'));
            setState('idle');
            Alert.alert(t('error'), 'Ses metne çevrilemedi. Lütfen tekrar deneyin.');
        }
    };

    const generateShortcut = async () => {
        if (!prompt.trim()) {
            Alert.alert(t('error'), t('enterPrompt'));
            return;
        }

        setState('generating');
        setError(null);
        setWarning(null);

        try {
            const response = await apiService.generateShortcut(prompt);

            // Check for Accessibility warning from AI
            if (response.warning) {
                setWarning({
                    message: response.warning,
                    alternative: response.alternative || 'Alternatif bir yöntem deneyin.'
                });
            }

            setShortcutName(response.shortcut_name || response.name || (response.workflow && response.workflow.name) || 'AI Workflow');

            // Extract workflow components from nested or root structure
            const nodes = response.nodes || (response.workflow && response.workflow.nodes);
            const edges = response.edges || (response.workflow && response.workflow.edges);

            console.log('AI DEBUG - Nodes found:', nodes ? nodes.length : 'null');

            if (nodes && nodes.length > 0) {
                // FORCE UPDATE
                const wf = { nodes, edges: edges || [] };
                setGeneratedWorkflow(wf);
                setGeneratedSteps([]);

                // Temporary Alert to confirm to user that data arrived
                // Alert.alert('Debug', `Node sayısı: ${nodes.length}`);
            } else {
                setGeneratedSteps(response.steps || []);
                setGeneratedWorkflow(null);
            }

            setState('preview');
        } catch (err) {
            console.error('Generation error:', err);
            setError(t('generationError'));
            setState('idle');
        }
    };

    const executeShortcut = async () => {
        setState('executing');
        try {
            // Convert steps to workflow and execute via WorkflowEngine
            let workflow;
            if (generatedWorkflow) {
                workflow = {
                    id: 'temp_ai_' + Date.now(),
                    name: shortcutName || 'AI Workflow',
                    nodes: generatedWorkflow.nodes,
                    edges: generatedWorkflow.edges,
                    variables: {},
                };
            } else {
                workflow = TemplateMigration.convertStepsToWorkflow(generatedSteps, shortcutName || 'AI Workflow');
            }
            const result = await workflowEngine.execute(workflow);

            if (!result.success) {
                Alert.alert(t('error'), result.error || 'Çalıştırma hatası');
            } else {
                Alert.alert(t('success'), t('executionSuccess'), [
                    { text: t('confirm'), onPress: () => navigation.goBack() }
                ]);
            }
        } catch (err) {
            Alert.alert(t('error'), t('executionError'));
        }
        setState('preview');
    };

    const saveShortcut = async () => {
        try {
            await ShortcutStorage.save({
                name: shortcutName,
                prompt: prompt,
                steps: generatedSteps || [],
                nodes: generatedWorkflow?.nodes,
                edges: generatedWorkflow?.edges,
            });
            Alert.alert(
                t('success') || 'Başarılı',
                'Kısayol kaydedildi! Kestirmelerim sayfasından erişebilirsiniz.',
                [{ text: t('confirm') || 'Tamam' }]
            );
        } catch (error) {
            Alert.alert(t('error') || 'Hata', 'Kaydedilirken hata oluştu');
        }
    };

    const handleStopExecution = () => {
        workflowEngine.cancelExecution();
        Alert.alert(t('stopped') || 'Durduruldu', t('automationStopped') || 'Otomasyon durduruldu');
        setState('preview');
    };

    const getActionIcon = (type: string, action: string): keyof typeof Ionicons.glyphMap => {
        switch (action) {
            case 'SEND_EMAIL': return 'mail';
            case 'SEND_SMS': return 'chatbubble';
            case 'RECORD_AUDIO': return 'mic';
            case 'TOGGLE_WIFI':
            case 'SET_WIFI': return 'wifi';
            case 'TOGGLE_BLUETOOTH':
            case 'SET_BLUETOOTH': return 'bluetooth';
            case 'SET_DND_MODE': return 'moon';
            case 'CREATE_NOTE': return 'document-text';
            default: return 'flash';
        }
    };

    const renderIdleState = () => (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>{t('whatToDo')}</Text>
                <TextInput
                    style={[styles.textInput, {
                        backgroundColor: colors.card,
                        color: colors.text,
                        borderColor: colors.border,
                        minHeight: height * 0.25
                    }]}
                    placeholder={t('promptPlaceholder')}
                    placeholderTextColor={colors.textTertiary}
                    value={prompt}
                    onChangeText={setPrompt}
                    multiline
                    textAlignVertical="top"
                />

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.micButton, { backgroundColor: colors.border }]}
                        onPress={recording ? stopRecording : startRecording}
                    >
                        <Ionicons
                            name={recording ? 'stop' : 'mic'}
                            size={28}
                            color={colors.text}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.generateButton, { backgroundColor: colors.primary }]}
                        onPress={generateShortcut}
                        disabled={!prompt.trim()}
                    >
                        <Ionicons name="sparkles" size={20} color="#ffffff" />
                        <Text style={styles.generateButtonText}>{t('newShortcut')}</Text>
                    </TouchableOpacity>
                </View>

                {error && (
                    <View style={[styles.errorContainer, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                        <Ionicons name="alert-circle" size={20} color={colors.error} />
                        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );

    const renderRecordingState = () => (
        <View style={styles.recordingContainer}>
            <View style={[styles.recordingAnimation, { backgroundColor: colors.card }]}>
                <Ionicons name="mic" size={64} color={colors.error} />
            </View>
            <Text style={[styles.recordingText, { color: colors.text }]}>{t('listening')}</Text>
            <Text style={[styles.recordingHint, { color: colors.textSecondary }]}>{t('sayCommand')}</Text>
            <TouchableOpacity style={[styles.stopButton, { backgroundColor: colors.error }]} onPress={stopRecording}>
                <Ionicons name="stop" size={32} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );

    const renderGeneratingState = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>{t('preparing')}</Text>
            <Text style={[styles.loadingHint, { color: colors.textSecondary }]}>{t('analyzing')}</Text>
        </View>
    );

    const renderPreviewState = () => (
        <View style={styles.previewContainer}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>{shortcutName}</Text>

            {/* Show different subtitle based on content */}
            <Text style={[styles.previewSubtitle, { color: colors.textSecondary }]}>
                {generatedWorkflow ? 'Otomasyon Hazır' : `${generatedSteps.length} ${t('stepsButtons')}`}
            </Text>

            {/* Accessibility Warning Banner */}
            {warning && (
                <View style={[styles.warningContainer, { backgroundColor: 'rgba(251, 191, 36, 0.15)', borderColor: '#fbbf24' }]}>
                    <View style={styles.warningHeader}>
                        <Ionicons name="warning" size={20} color="#fbbf24" />
                        <Text style={[styles.warningTitle, { color: '#fbbf24' }]}>Sınırlı Özellik</Text>
                    </View>
                    <Text style={[styles.warningMessage, { color: colors.text }]}>{warning.message}</Text>
                    <View style={styles.warningAlternative}>
                        <Ionicons name="bulb" size={16} color="#22c55e" />
                        <Text style={[styles.alternativeText, { color: '#22c55e' }]}>{warning.alternative}</Text>
                    </View>
                </View>
            )}

            {/* WORKFLOW CARD (New AI Format) */}
            {generatedWorkflow && (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <View style={{
                        backgroundColor: colors.card,
                        padding: 24,
                        borderRadius: 16,
                        alignItems: 'center',
                        width: '100%',
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3
                    }}>
                        <Ionicons name="git-network" size={64} color={colors.primary} style={{ marginBottom: 16 }} />
                        <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
                            {shortcutName}
                        </Text>
                        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 24, fontSize: 16 }}>
                            {generatedWorkflow.nodes.length} düğüm ve {generatedWorkflow.edges.length} bağlantı içeren akış oluşturuldu.
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning + '20', padding: 12, borderRadius: 8, width: '100%' }}>
                            <Ionicons name="construct" size={24} color={colors.warning} style={{ marginRight: 12 }} />
                            <Text style={{ color: colors.text, flex: 1, fontSize: 14 }}>
                                Detayları görmek ve düzenlemek için aşağıdaki <Text style={{ fontWeight: 'bold', color: colors.warning }}>Düzenle</Text> butonunu kullanın.
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* STEPS LIST (Legacy Format) - Only show if NO workflow */}
            {!generatedWorkflow && (
                <ScrollView style={styles.stepsContainer}>
                    {generatedSteps.map((step, index) => (
                        <View key={step.step_id} style={[styles.stepCard, { backgroundColor: colors.card }]}>
                            <View style={styles.stepHeader}>
                                <View style={[styles.stepIconContainer, { backgroundColor: colors.border }]}>
                                    <Ionicons
                                        name={getActionIcon(step.type, step.action)}
                                        size={24}
                                        color={step.requires_app_selection ? '#fbbf24' : colors.primary}
                                    />
                                </View>
                                <View style={styles.stepInfo}>
                                    <Text style={[styles.stepAction, { color: colors.text }]}>{step.action.replace(/_/g, ' ')}</Text>
                                    <Text style={[styles.stepType, { color: colors.textTertiary }]}>
                                        {step.params?.app_category || step.params?.package_name || step.type}
                                    </Text>
                                </View>
                                <Text style={[styles.stepNumber, { color: colors.textTertiary }]}>{index + 1}</Text>
                            </View>

                            {/* App Selection Button */}
                            {step.requires_app_selection && (
                                <TouchableOpacity
                                    style={[styles.appSelectButton, { backgroundColor: '#fbbf24' }]}
                                    onPress={() => handleSelectApp(index)}
                                >
                                    <Ionicons name="apps" size={16} color="#000" />
                                    <Text style={{ color: '#000', fontWeight: 'bold', marginLeft: 8 }}>
                                        {t('selectApp') || 'Uygulama Seç'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Selected App Indicator */}
                            {!step.requires_app_selection && step.params?.package_name && step.action === 'OPEN_APP' && (
                                <TouchableOpacity
                                    style={[styles.selectedAppBadge, { backgroundColor: colors.success + '20' }]}
                                    onPress={() => handleSelectApp(index)}
                                >
                                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                    <Text style={{ color: colors.success, marginLeft: 6, fontSize: 12 }}>
                                        {step.params.package_name.split('.').pop()}
                                    </Text>
                                    <Ionicons name="chevron-down" size={14} color={colors.success} style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Global Debug View */}
            {isDebugMode && (
                <View style={{ maxHeight: 100, marginBottom: 16, padding: 8, backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 8 }}>
                    <Text style={{ color: '#ff00ff', fontWeight: 'bold', marginBottom: 4 }}>DEBUG MODE: RAW JSON</Text>
                    <ScrollView nestedScrollEnabled>
                        <Text style={{ color: '#ffffff', fontSize: 10 }}>{JSON.stringify(generatedSteps, null, 2)}</Text>
                    </ScrollView>
                </View>
            )}

            <View style={styles.previewButtons}>
                <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: colors.border }]}
                    onPress={() => {
                        setState('idle');
                        setGeneratedSteps([]);
                        setGeneratedWorkflow(null);
                    }}
                >
                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>{t('cancel')}</Text>
                </TouchableOpacity>

                {generatedWorkflow && (
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.warning, marginRight: 8 }]}
                        onPress={() => {
                            navigation.navigate('WorkflowBuilder', {
                                workflow: {
                                    id: 'temp_ai_' + Date.now(),
                                    name: shortcutName || 'AI Workflow',
                                    nodes: generatedWorkflow.nodes,
                                    edges: generatedWorkflow.edges,
                                    variables: {}
                                },
                                isNew: true
                            });
                        }}
                    >
                        <Ionicons name="construct" size={18} color="#ffffff" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={saveShortcut}
                >
                    <Ionicons name="bookmark" size={18} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.executeButton, { backgroundColor: colors.success }]}
                    onPress={executeShortcut}
                >
                    <Ionicons name="play" size={20} color="#ffffff" />
                    <Text style={styles.executeButtonText}>{t('run')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderExecutingState = () => (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.success} />
            <Text style={[styles.loadingText, { color: colors.text }]}>{t('executing')}</Text>
            <TouchableOpacity
                style={[styles.stopButton, { backgroundColor: colors.error }]}
                onPress={handleStopExecution}
            >
                <Ionicons name="stop" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>
                    {t('stop') || 'Durdur'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const styles = createStyles(currentTheme);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="close" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{t('newShortcut')}</Text>
                    <View style={{ width: 28 }} />
                </View>

                {state === 'idle' && renderIdleState()}
                {state === 'recording' && renderRecordingState()}
                {(state === 'transcribing' || state === 'generating') && renderGeneratingState()}
                {state === 'preview' && renderPreviewState()}
                {state === 'executing' && renderExecutingState()}
            </KeyboardAvoidingView>

            {/* App Selector Modal */}
            <Modal
                visible={appSelectorVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAppSelectorVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                {t('selectApp') || 'Uygulama Seç'}
                            </Text>
                            <TouchableOpacity onPress={() => setAppSelectorVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={installedApps}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.appItem, { borderBottomColor: colors.border }]}
                                    onPress={() => handleAppSelected(item)}
                                >
                                    <Ionicons name="apps" size={20} color={colors.primary} />
                                    <Text style={[styles.appItemText, { color: colors.text }]}>
                                        {item.split(' (')[0]}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>
                                    {t('noAppsFound') || 'Uygulama bulunamadı'}
                                </Text>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}



const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1f2937',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
    },
    inputContainer: {
        flex: 1,
        padding: 24,
    },
    label: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 24,
    },
    textInput: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 20,
        fontSize: 16,
        color: '#ffffff',
        textAlignVertical: 'top',
        minHeight: 150,
        borderWidth: 1,
        borderColor: '#374151',
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 12,
    },
    micButton: {
        backgroundColor: '#374151',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    generateButton: {
        flex: 1,
        backgroundColor: '#6366f1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        height: 60,
        gap: 8,
    },
    generateButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        padding: 12,
        backgroundColor: '#7f1d1d',
        borderRadius: 12,
        gap: 8,
    },
    errorText: {
        color: '#fecaca',
        fontSize: 14,
    },
    recordingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    recordingAnimation: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#1f2937',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    recordingText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    recordingHint: {
        fontSize: 16,
        color: '#9ca3af',
        marginBottom: 48,
    },
    stopButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#ffffff',
        marginTop: 24,
    },
    loadingHint: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
    },
    previewContainer: {
        flex: 1,
        padding: 24,
    },
    previewTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
    },
    previewSubtitle: {
        fontSize: 16,
        color: '#9ca3af',
        marginBottom: 24,
    },
    stepsContainer: {
        flex: 1,
    },
    stepCard: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepInfo: {
        flex: 1,
        marginLeft: 16,
    },
    stepAction: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    stepType: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    stepNumber: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
    },
    previewButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#374151',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        width: 56,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
    },
    executeButton: {
        flex: 2,
        backgroundColor: '#22c55e',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
    },
    executeButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    // Warning Banner Styles
    warningContainer: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    warningMessage: {
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 12,
    },
    warningAlternative: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    alternativeText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    // App Selector Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        maxHeight: '70%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    appItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        gap: 12,
    },
    appItemText: {
        fontSize: 15,
        flex: 1,
    },
    appSelectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 10,
        marginTop: 12,
    },
    selectedAppBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        marginTop: 10,
    },
});
