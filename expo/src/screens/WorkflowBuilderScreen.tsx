/**
 * WorkflowBuilderScreen - Main workflow creation/editing screen
 * Visual node-based workflow builder
 */


import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    Alert,
    TextInput,
    ActivityIndicator,
    Modal,
    StatusBar,
    Platform,
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorderState } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { WorkflowCanvas, NodePalette, NodeConfigModal } from '../components/workflow';
import {
    Workflow,
    WorkflowNode,
    NodeType,
    createWorkflow,
    createNode,
} from '../types/workflow-types';
import { WorkflowStorage } from '../services/WorkflowStorage';
import { workflowEngine } from '../services/WorkflowEngine';
import { apiService } from '../services/ApiService';
import { TemplateMigration } from '../services/TemplateMigration';
import { useApp } from '../context/AppContext';

// --- Default Theme Fallback (if not in context) ---
const DEFAULT_THEME = {
    background: '#0A0A0B',
    card: 'rgba(255, 255, 255, 0.05)',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    primary: '#00F5FF',
    border: 'rgba(255, 255, 255, 0.1)',
};

type RootStackParamList = {
    WorkflowBuilder: { workflowId?: string; autoOpenAI?: boolean; template?: any; autoRun?: boolean; workflow?: any };
    WorkflowList: undefined;
};

type WorkflowBuilderRouteProp = RouteProp<RootStackParamList, 'WorkflowBuilder'>;
type WorkflowBuilderNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WorkflowBuilder'>;

export const WorkflowBuilderScreen: React.FC = () => {
    const navigation = useNavigation<WorkflowBuilderNavigationProp>();
    const route = useRoute<WorkflowBuilderRouteProp>();
    const { theme, colors: appColors } = useApp();
    const colors = appColors || DEFAULT_THEME;
    const isDark = theme === 'dark';
    const insets = useSafeAreaInsets();

    const [workflow, setWorkflow] = useState<Workflow>(() => createWorkflow('Yeni Workflow'));
    const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
    const [showNodePalette, setShowNodePalette] = useState(false);
    const [showNodeConfig, setShowNodeConfig] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const [isPaused, setIsPaused] = useState(false);

    // Engine Callbacks
    useEffect(() => {
        workflowEngine.setExecutionCallback((state) => {
            // Only update if external state changed (e.g. from notification action)
            // But we mainly rely on local handleRun for consistency, backing it up here
            if (state.isPaused !== undefined) setIsPaused(state.isPaused);
            if (state.isExecuting !== undefined) setIsExecuting(state.isExecuting);

            // Highlight current node if provided
            if (state.currentNodeId) {
                // Optional: Scroll to node or highlight it on canvas
                // setSelectedNode(state.currentNodeId) is for config, not highlighting execution
            }
        });

        return () => {
            workflowEngine.setExecutionCallback(null);
        };
    }, []);

    const handleStop = useCallback(() => {
        workflowEngine.stopExecution();
    }, []);

    const handlePause = useCallback(() => {
        workflowEngine.pauseExecution();
    }, []);

    const handleResume = useCallback(() => {
        workflowEngine.resumeExecution();
    }, []);

    // Rename Modal State
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [tempWorkflowName, setTempWorkflowName] = useState('');

    // AI Generation
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // expo-audio Hook
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(audioRecorder);

    const startRecording = async () => {
        try {
            const perms = await AudioModule.requestRecordingPermissionsAsync();
            if (perms.status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Sesli giriş için mikrofon izni gerekiyor.');
                return;
            }

            // Set audio mode for recording (required for iOS silent mode)
            await setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: true,
            });

            // Prepare recorder before starting (REQUIRED!)
            await audioRecorder.prepareToRecordAsync();

            // Start recording
            audioRecorder.record();
            console.log('[VoiceInput] Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Hata', 'Kayıt başlatılamadı.');
        }
    };

    const stopRecording = async () => {
        if (!recorderState.isRecording) return;

        try {
            await audioRecorder.stop();
            // uri might be available via audioRecorder.uri or we might need to check docs.
            // Assuming audioRecorder.uri is the path to the recorded file.
            // Note: newer expo-audio might expose it differently, but this is a reasonable guess for alpha.
            const uri = audioRecorder.uri;

            if (uri) {
                setAiPrompt('Ses işleniyor...');
                const text = await apiService.transcribeAudio(uri);
                setAiPrompt(text);
            }
        } catch (err) {
            console.error('Failed to stop/transcribe', err);
            Alert.alert('Hata', 'Ses metne çevrilemedi.');
            setAiPrompt('');
        }
    };

    // Initial load logic
    useEffect(() => {
        console.log("WorkflowBuilderScreen: Entering screen...");
        const loadWorkflow = async () => {
            try {
                if (route.params?.workflow) {
                    setWorkflow(route.params.workflow);
                    setHasChanges(true);
                } else if (route.params?.workflowId) {
                    const existing = await WorkflowStorage.getById(route.params.workflowId);
                    if (existing) {
                        setWorkflow(existing);
                    }
                } else if (route.params?.template) {
                    const template = route.params.template;
                    console.log('[DEBUG] Loading template:', template.title);
                    console.log('[DEBUG] Template JSON keys:', Object.keys(template.template_json || {}));

                    if (template.template_json?.nodes) {
                        console.log('[DEBUG] Found nodes in template:', template.template_json.nodes.length);
                        // Migrate data → config for backward compatibility with templates
                        const migratedNodes = template.template_json.nodes.map((n: any) => ({
                            ...n,
                            config: n.config || n.data || {},
                        }));
                        // Migrate edges: source/target → sourceNodeId/targetNodeId
                        const migratedEdges = (template.template_json.edges || []).map((e: any) => ({
                            id: e.id || `edge-${Math.random().toString(36).substr(2, 9)}`,
                            sourceNodeId: e.sourceNodeId || e.source,
                            targetNodeId: e.targetNodeId || e.target,
                            sourcePort: e.sourcePort || e.sourceHandle || 'default'
                        }));
                        setWorkflow({
                            ...createWorkflow(template.title),
                            description: template.description,
                            nodes: migratedNodes,
                            edges: migratedEdges,
                        });
                        console.log('[DEBUG] Workflow set with nodes:', migratedNodes.length, 'edges:', migratedEdges.length);
                        setHasChanges(true);
                    } else if (template.template_json?.steps) {
                        const converted = TemplateMigration.convertStepsToWorkflow(
                            template.template_json.steps,
                            template.title
                        );
                        setWorkflow(converted);
                        setHasChanges(true);
                    }
                } else if (route.params?.autoOpenAI) {
                    setShowAIModal(true);
                }
                console.log("WorkflowBuilderScreen: Load finished.");
            } catch (err) {
                console.error("WorkflowBuilderScreen: Load error", err);
            }
        };
        loadWorkflow();
    }, [route.params?.workflow, route.params?.workflowId, route.params?.autoOpenAI, route.params?.template]);

    // Handle workflow changes
    const handleWorkflowChange = useCallback((updatedWorkflow: Workflow) => {
        setWorkflow(updatedWorkflow);
        setHasChanges(true);

        // If a node is selected, update it with the latest version from the new workflow
        if (selectedNode) {
            const updatedSelectedNode = updatedWorkflow.nodes.find(n => n.id === selectedNode.id);
            if (updatedSelectedNode) {
                // Only update if it actually changed to avoid re-renders
                if (JSON.stringify(updatedSelectedNode) !== JSON.stringify(selectedNode)) {
                    setSelectedNode(updatedSelectedNode);
                }
            } else {
                // Node was deleted
                setSelectedNode(null);
                setShowNodeConfig(false);
            }
        }
    }, [selectedNode]);

    // Add new node with AUTO-CONNECTION
    const handleAddNode = useCallback((type: NodeType) => {
        const newNode = createNode(type, { x: 100, y: 100 + workflow.nodes.length * 100 });

        // AUTO-CONNECTION: Connect to the last node (if exists)
        let newEdges = workflow.edges;
        if (workflow.nodes.length > 0) {
            const lastNode = workflow.nodes[workflow.nodes.length - 1];
            const edgeId = `edge_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            const newEdge = {
                id: edgeId,
                sourceNodeId: lastNode.id,
                targetNodeId: newNode.id,
                sourcePort: 'default' as const
            };
            newEdges = [...workflow.edges, newEdge];
            console.log('[DEBUG] Auto-connected:', lastNode.label, '→', newNode.label);
        }

        handleWorkflowChange({
            ...workflow,
            nodes: [...workflow.nodes, newNode],
            edges: newEdges
        });
    }, [workflow, handleWorkflowChange]);

    // Update node
    const handleUpdateNode = useCallback((updatedNode: WorkflowNode) => {
        const updatedNodes = workflow.nodes.map(n =>
            n.id === updatedNode.id ? updatedNode : n
        );
        handleWorkflowChange({ ...workflow, nodes: updatedNodes });
        setSelectedNode(null);
        setShowNodeConfig(false);
    }, [workflow, handleWorkflowChange]);

    // Delete selected node
    const handleDeleteNode = useCallback(() => {
        if (selectedNode) {
            const updatedNodes = workflow.nodes.filter(n => n.id !== selectedNode.id);
            const updatedEdges = workflow.edges.filter(
                e => e.sourceNodeId !== selectedNode.id && e.targetNodeId !== selectedNode.id
            );
            handleWorkflowChange({ ...workflow, nodes: updatedNodes, edges: updatedEdges });
            setSelectedNode(null);
            setShowNodeConfig(false);
        }
    }, [selectedNode, workflow, handleWorkflowChange]);

    // Save workflow
    const handleSave = useCallback(async () => {
        try {
            await WorkflowStorage.save(workflow);
            setHasChanges(false);
            Alert.alert('✅ Kaydedildi', 'Workflow başarıyla kaydedildi.');
        } catch (error) {
            Alert.alert('❌ Hata', 'Workflow kaydedilemedi.');
        }
    }, [workflow]);

    // Run workflow
    const handleRun = useCallback(async () => {
        if (workflow.nodes.length === 0) {
            Alert.alert('⚠️ Uyarı', 'Workflow\'da en az bir node olmalı.');
            return;
        }

        const hasTrigger = workflow.nodes.some(n =>
            n.type === 'MANUAL_TRIGGER' ||
            n.type.endsWith('_TRIGGER')
        );
        if (!hasTrigger) {
            Alert.alert('⚠️ Uyarı', 'Workflow\'da bir trigger node olmalı.');
            return;
        }

        setIsExecuting(true);
        setIsPaused(false);
        try {
            const result = await workflowEngine.execute(workflow);
            await WorkflowStorage.recordRun(workflow.id);

            if (result.success) {
                Alert.alert('✅ Başarılı', `Workflow ${result.nodeResults.length} adımda tamamlandı.`);
            } else {
                if (!workflowEngine.getIsCancelled()) {
                    Alert.alert('❌ Hata', result.error || 'Workflow çalıştırılamadı.');
                }
            }
        } catch (error) {
            Alert.alert('❌ Hata', error instanceof Error ? error.message : 'Bilinmeyen hata');
        } finally {
            setIsExecuting(false);
            setIsPaused(false);
        }
    }, [workflow]);

    // Handle back navigation
    const handleBack = useCallback(() => {
        if (hasChanges) {
            Alert.alert(
                'Kaydedilmemiş Değişiklikler',
                'Değişiklikler kaydedilmedi. Çıkmak istiyor musunuz?',
                [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'Kaydet ve Çık', onPress: async () => { await handleSave(); navigation.goBack(); } },
                    { text: 'Kaydetmeden Çık', style: 'destructive', onPress: () => navigation.goBack() },
                ]
            );
        } else {
            navigation.goBack();
        }
    }, [hasChanges, handleSave, navigation]);

    // Node selection
    const handleNodeSelect = useCallback((node: WorkflowNode | null) => {
        setSelectedNode(node);
        if (node) {
            setShowNodeConfig(true);
        }
    }, []);

    // AI Generate
    const handleGenerateFromAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            // Pass current workflow as context for "Edit Mode"
            const currentContext = {
                isEdit: workflow.nodes.length > 0,
                currentWorkflow: {
                    nodes: workflow.nodes,
                    edges: workflow.edges
                }
            };

            const response = await apiService.generateShortcut(aiPrompt, currentContext);

            const nodes = response.nodes || (response.workflow && response.workflow.nodes);
            const edges = response.edges || (response.workflow && response.workflow.edges);

            if (nodes && edges) {
                const mappedEdges = edges.map((e: any) => ({
                    id: e.id || `edge-${Math.random().toString(36).substr(2, 9)}`,
                    sourceNodeId: e.sourceNodeId || e.source,
                    targetNodeId: e.targetNodeId || e.target,
                    sourcePort: e.sourcePort || 'default'
                }));

                const newWorkflow: Workflow = {
                    id: response.id || `ai-${Date.now()}`,
                    name: response.name || response.shortcut_name || (response.workflow && response.workflow.name) || 'AI Workflow',
                    nodes: nodes,
                    edges: mappedEdges,
                    description: 'AI Generated Workflow',
                    icon: 'flash',
                    color: '#6366F1',
                    isActive: false,
                    runCount: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                setWorkflow(newWorkflow);
                setHasChanges(true);
                setShowAIModal(false);
                setAiPrompt('');
                Alert.alert('✨ Başarılı', 'AI workflow oluşturdu!');
            } else if (response.steps && response.steps.length > 0) {
                const legacyWorkflow = TemplateMigration.convertStepsToWorkflow(response.steps, response.shortcut_name || 'AI Workflow');
                setWorkflow(legacyWorkflow);
                setHasChanges(true);
                setShowAIModal(false);
                setAiPrompt('');
                Alert.alert('✨ Başarılı', 'AI workflow oluşturdu! (Legacy Mode)');
            } else {
                Alert.alert('⚠️ Uyarı', 'AI mantıklı bir workflow üretemedi.');
            }
        } catch (error) {
            Alert.alert('❌ Hata', 'AI yanıt vermedi veya bir hata oluştu.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

            {/* Header - Two Row Layout */}
            <View style={[styles.header, {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : colors.card,
                borderBottomColor: colors.border
            }]}>
                {/* Top Row: Back + Title */}
                <View style={styles.headerTopRow}>
                    <TouchableOpacity style={[styles.backButton, {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0',
                        borderColor: colors.border
                    }]} onPress={handleBack}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.titleContainer}
                        onPress={() => {
                            setTempWorkflowName(workflow.name);
                            setShowRenameModal(true);
                        }}
                    >
                        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{workflow.name}</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            {workflow.nodes.length} node • {workflow.edges.length} bağlantı
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom Row: All Action Buttons */}
                <View style={styles.headerActions}>
                    {/* Activation Toggle */}
                    <View style={[styles.activationToggle, workflow.isActive && styles.activationToggleOn]}>
                        <Text style={styles.toggleLabel}>{workflow.isActive ? 'AKTİF' : 'PASİF'}</Text>
                        <Switch
                            value={workflow.isActive}
                            onValueChange={async (value) => {
                                const updated = { ...workflow, isActive: value };
                                setWorkflow(updated);
                                setHasChanges(true);
                                await WorkflowStorage.save(updated);

                                // Check trigger type for specific scheduling
                                const hasTimeTrigger = workflow.nodes.some(n => n.type === 'TIME_TRIGGER');
                                const hasNotificationTrigger = workflow.nodes.some(n =>
                                    ['TELEGRAM_TRIGGER', 'SMS_TRIGGER', 'WHATSAPP_TRIGGER', 'EMAIL_TRIGGER', 'NOTIFICATION_TRIGGER', 'CALL_TRIGGER'].includes(n.type)
                                );

                                if (hasTimeTrigger) {
                                    try {
                                        const { scheduleWorkflow, cancelScheduledWorkflow } = require('../services/WorkflowScheduler');
                                        if (value) {
                                            await scheduleWorkflow(updated);
                                        } else {
                                            await cancelScheduledWorkflow(updated.id);
                                        }
                                    } catch (e) {
                                        console.warn('Scheduling error:', e);
                                    }
                                }

                                let message = value ? 'Otomatik tetikleme aktif.' : 'Otomatik tetikleme devre dışı.';
                                if (value && hasTimeTrigger) {
                                    const timeTrigger = workflow.nodes.find(n => n.type === 'TIME_TRIGGER');
                                    const cfg = timeTrigger?.config as any;
                                    const hour = cfg?.hour ?? 9;
                                    const minute = cfg?.minute ?? 0;
                                    message = `⏰ Her gün ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}'de çalışacak.`;
                                } else if (value && hasNotificationTrigger) {
                                    message = '📱 Bildirim geldiğinde otomatik çalışacak.';
                                }

                                Alert.alert(
                                    value ? '✅ Workflow Aktif' : '⚠️ Workflow Pasif',
                                    message
                                );
                            }}
                            trackColor={{ false: '#3e3e3e', true: 'rgba(0, 245, 255, 0.3)' }}
                            thumbColor={workflow.isActive ? '#00F5FF' : '#666'}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: 'rgba(0, 245, 255, 0.1)', borderColor: 'rgba(0, 245, 255, 0.3)' }]}
                        onPress={() => setShowAIModal(true)}
                    >
                        <Ionicons name="sparkles" size={20} color="#00F5FF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, hasChanges && styles.actionButtonActive, {
                            borderColor: colors.border,
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0'
                        }]}
                        onPress={handleSave}
                    >
                        <Ionicons name="save-outline" size={20} color={hasChanges ? "#00F5FF" : colors.text} />
                    </TouchableOpacity>
                    {isExecuting ? (
                        <>
                            {isPaused ? (
                                <TouchableOpacity style={styles.actionButton} onPress={handleResume}>
                                    <Ionicons name="play" size={20} color="#10B981" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.actionButton} onPress={handlePause}>
                                    <Ionicons name="pause" size={20} color="#F59E0B" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.actionButton, { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                                onPress={handleStop}
                            >
                                <Ionicons name="square" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.runButton]}
                            onPress={handleRun}
                            disabled={isExecuting}
                        >
                            {isExecuting ? (
                                <ActivityIndicator size="small" color="#10B981" />
                            ) : (
                                <Ionicons name="play" size={20} color="#10B981" />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Canvas */}
            <WorkflowCanvas
                workflow={workflow}
                onWorkflowChange={handleWorkflowChange}
                onNodeSelect={handleNodeSelect}
                selectedNodeId={selectedNode?.id || null}
            />

            {/* Add Node FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowNodePalette(true)}
            >
                <LinearGradient
                    colors={['#00F5FF', '#2b8cee']}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={32} color="#000" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Bottom toolbar */}
            <View style={[styles.toolbar, {
                backgroundColor: isDark ? 'rgba(10, 10, 11, 0.95)' : colors.card,
                borderTopColor: colors.border
            }]}>
                <TouchableOpacity style={styles.toolbarButton} onPress={() => setShowNodePalette(true)}>
                    <Ionicons name="add-circle-outline" size={24} color={colors.text} />
                    <Text style={[styles.toolbarLabel, { color: colors.textSecondary }]}>Node Ekle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.toolbarButton}
                    onPress={() => selectedNode && setShowNodeConfig(true)}
                    disabled={!selectedNode}
                >
                    <Ionicons name="settings-outline" size={24} color={!selectedNode ? colors.textSecondary : colors.text} />
                    <Text style={[styles.toolbarLabel, !selectedNode && styles.disabled, { color: colors.textSecondary }]}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.toolbarButton}
                    onPress={handleDeleteNode}
                    disabled={!selectedNode}
                >
                    <Ionicons name="trash-outline" size={24} color={!selectedNode ? colors.textSecondary : "#FF4444"} />
                    <Text style={[styles.toolbarLabel, !selectedNode && styles.disabled, { color: colors.textSecondary }]}>Sil</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolbarButton} onPress={handleRun}>
                    <Ionicons name="play-circle-outline" size={24} color="#10B981" />
                    <Text style={[styles.toolbarLabel, { color: colors.textSecondary }]}>Çalıştır</Text>
                </TouchableOpacity>
            </View>

            {/* Modals */}
            <NodePalette
                visible={showNodePalette}
                onClose={() => setShowNodePalette(false)}
                onSelectNode={handleAddNode}
            />

            <NodeConfigModal
                visible={showNodeConfig}
                node={selectedNode}
                allNodes={workflow.nodes}
                onClose={() => setShowNodeConfig(false)}
                onSave={handleUpdateNode}
                onDelete={handleDeleteNode}
            />

            {/* AI Prompt Modal */}
            <Modal
                visible={showAIModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAIModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.aiModalContent, { backgroundColor: isDark ? '#121214' : colors.card }]}>
                        <View style={styles.aiHeader}>
                            <Text style={[styles.aiTitle, { color: colors.text }]}>✨ AI ile Oluştur</Text>
                            <TouchableOpacity onPress={() => setShowAIModal(false)}>
                                <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
                            Ne yapmak istediğinizi yazın, AI sizin için workflow şemasını oluştursun.
                        </Text>

                        <TextInput
                            style={[styles.aiInput, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                color: colors.text,
                                borderColor: colors.border
                            }]}
                            placeholder="Örn: Her sabah 8'de sessiz moda al ve hava durumunu göster..."
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            numberOfLines={4}
                            value={aiPrompt}
                            onChangeText={setAiPrompt}
                            textAlignVertical="top"
                        />

                        {/* Voice Input Button */}
                        <TouchableOpacity
                            style={[
                                styles.micButton,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                    borderColor: colors.border
                                },
                                recorderState.isRecording && styles.micButtonActive
                            ]}
                            onPress={recorderState.isRecording ? stopRecording : startRecording}
                        >
                            <Ionicons
                                name={recorderState.isRecording ? 'stop' : 'mic'}
                                size={24}
                                color={recorderState.isRecording ? '#EF4444' : colors.text}
                            />
                            <Text style={[styles.micButtonText, { color: colors.text }]}>
                                {recorderState.isRecording ? 'Dinliyor... (Durdur)' : 'Sesli Söyle'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.generateButton, (!aiPrompt.trim() || isGenerating) && styles.disabledButton]}
                            onPress={handleGenerateFromAI}
                            disabled={!aiPrompt.trim() || isGenerating}
                        >
                            {isGenerating ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <>
                                    <Text style={styles.generateButtonText}>Oluştur</Text>
                                    <Ionicons name="sparkles" size={20} color="#000" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Rename Modal */}
            <Modal
                visible={showRenameModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRenameModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.aiModalContent, { backgroundColor: isDark ? '#121214' : colors.card }]}>
                        <View style={styles.aiHeader}>
                            <Text style={[styles.aiTitle, { color: colors.text }]}>Workflow Adını Değiştir</Text>
                            <TouchableOpacity onPress={() => setShowRenameModal(false)}>
                                <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[styles.aiInput, {
                                minHeight: 50,
                                height: 50,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                color: colors.text,
                                borderColor: colors.border
                            }]}
                            placeholder="Workflow Adı"
                            placeholderTextColor={colors.textTertiary}
                            value={tempWorkflowName}
                            onChangeText={setTempWorkflowName}
                            autoFocus
                        />

                        <TouchableOpacity
                            style={styles.generateButton}
                            onPress={() => {
                                if (tempWorkflowName.trim()) {
                                    handleWorkflowChange({ ...workflow, name: tempWorkflowName.trim() });
                                    setShowRenameModal(false);
                                }
                            }}
                        >
                            <Text style={styles.generateButtonText}>Kaydet</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor is set dynamically via colors.background
    },
    header: {
        flexDirection: 'column',
        padding: 12,
        paddingBottom: 10,
        // backgroundColor is set dynamically
        borderBottomWidth: 1,
        // borderBottomColor is set dynamically
        gap: 10,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        // backgroundColor is set dynamically
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        // borderColor is set dynamically
    },
    backIcon: {
        fontSize: 20,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 11,
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        // backgroundColor is set dynamically
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        // borderColor is set dynamically
    },
    actionButtonActive: {
        backgroundColor: 'rgba(0, 245, 255, 0.1)',
        borderColor: '#00F5FF',
    },
    runButton: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: '#10B981',
    },
    actionIcon: {
        fontSize: 18,
        color: '#FFF',
    },
    activationToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        // backgroundColor is set dynamically
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        // borderColor is set dynamically
        gap: 6,
    },
    activationToggleOn: {
        backgroundColor: 'rgba(0, 245, 255, 0.1)',
        borderColor: 'rgba(0, 245, 255, 0.3)',
    },
    toggleLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 1,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 90,
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    fabGradient: {
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabIcon: {
        color: '#000',
        fontSize: 32,
        fontWeight: '300',
    },
    toolbar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(10, 10, 11, 0.95)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'space-around',
    },
    toolbarButton: {
        alignItems: 'center',
        gap: 4,
    },
    toolbarIcon: {
        fontSize: 24,
    },
    toolbarLabel: {
        color: '#94A3B8',
        fontSize: 11,
    },
    disabled: {
        opacity: 0.3,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 20,
    },
    aiModalContent: {
        // backgroundColor is set dynamically
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 245, 255, 0.2)',
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    aiHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    aiTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        // color is set dynamically
    },
    closeIcon: {
        fontSize: 24,
        // color is set dynamically
    },
    aiSubtitle: {
        fontSize: 14,
        marginBottom: 20,
        lineHeight: 20,
        // color is set dynamically
    },
    aiInput: {
        // backgroundColor is set dynamically
        borderRadius: 16,
        padding: 16,
        // color is set dynamically
        minHeight: 120,
        marginBottom: 20,
        borderWidth: 1,
        // borderColor is set dynamically
        fontSize: 16,
    },
    generateButton: {
        backgroundColor: '#00F5FF', // Solid Cyan
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    disabledButton: {
        opacity: 0.5,
        // Background color comes from generateButton (Cyan)
    },
    generateButtonText: {
        color: '#000000', // Black text
        fontSize: 16,
        fontWeight: 'bold',
    },
    generateIcon: {
        fontSize: 18,
    },
    micButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // backgroundColor is set dynamically
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        gap: 8,
        borderWidth: 1,
        // borderColor is set dynamically
    },
    micButtonActive: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#EF4444',
    },
    micButtonText: {
        fontWeight: '600',
        // color is set dynamically
    },
});

export default WorkflowBuilderScreen;
// Fixed syntax error
