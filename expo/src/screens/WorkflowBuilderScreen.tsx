/**
 * WorkflowBuilderScreen - Main workflow creation/editing screen
 * Visual node-based workflow builder
 */


import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorderState } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    WorkflowCanvas,
    NodePalette,
    NodeConfigModal,
    WorkflowAssistantPanel,
    WorkflowFixPreviewModal,
} from '../components/workflow';
import {
    Workflow,
    WorkflowNode,
    NodeType,
    EdgePort,
    createWorkflow,
    createNode,
    createEdge,
} from '../types/workflow-types';
import { WorkflowStorage } from '../services/WorkflowStorage';
import { workflowEngine } from '../services/WorkflowEngine';
import { apiService } from '../services/ApiService';
import { TemplateMigration } from '../services/TemplateMigration';
import { useApp } from '../context/AppContext';
import { ExecutionLogger, ExecutionLogEntry } from '../services/ExecutionLogger';
import { explainWorkflowError } from '../services/WorkflowErrorExplainer';
import { AssistantFixSuggestion } from '../services/assistant/WorkflowAssistantTypes';
import { workflowPatchService } from '../services/assistant/WorkflowPatchService';

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
    WorkflowBuilder: {
        workflowId?: string;
        autoOpenAI?: boolean;
        template?: any;
        autoRun?: boolean;
        workflow?: any;
        openErrorModal?: boolean;
        openErrorLogId?: string;
    };
    WorkflowList: undefined;
};

type WorkflowBuilderRouteProp = RouteProp<RootStackParamList, 'WorkflowBuilder'>;
type WorkflowBuilderNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WorkflowBuilder'>;
type RecipeId =
    | 'morning_weather'
    | 'arrive_home_wifi'
    | 'news_rss'
    | 'daily_reminder'
    | 'contact_search'
    | 'quick_translate'
    | 'business_card_to_contact'
    | 'receipt_to_expense_json'
    | 'note_to_summary'
    | 'whatsapp_ai_reply_confirm';

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
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [pendingQuickAdd, setPendingQuickAdd] = useState<{ sourceNodeId: string; port: EdgePort; position: { x: number; y: number } } | null>(null);
    const [hideRecipes, setHideRecipes] = useState(false);
    const [recipeWizard, setRecipeWizard] = useState<{
        id: RecipeId;
        config: {
            hour: string;
            minute: string;
            geofenceId: string;
            rssUrl: string;
            reminderText: string;
        };
    } | null>(null);
    const [workflowErrorEntries, setWorkflowErrorEntries] = useState<ExecutionLogEntry[]>([]);
    const [selectedErrorEntryId, setSelectedErrorEntryId] = useState<string | null>(null);
    const [showErrorGuideModal, setShowErrorGuideModal] = useState(false);
    const [didAutoOpenErrorModal, setDidAutoOpenErrorModal] = useState(false);
    const [showAssistantModal, setShowAssistantModal] = useState(false);
    const [showFixPreviewModal, setShowFixPreviewModal] = useState(false);
    const [selectedFixSuggestion, setSelectedFixSuggestion] = useState<AssistantFixSuggestion | null>(null);

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
                    } else if (template.template_json?.action?.steps) {
                        // MCP automation format: convert action.steps to workflow nodes
                        console.log('[DEBUG] Converting MCP automation steps to workflow nodes');
                        const mcpSteps = template.template_json.action.steps;

                        // MCP tool name → native node type mapping
                        const toolToNodeType: Record<string, string> = {
                            // Google
                            'breviai.google.calendar_list': 'CALENDAR_READ',
                            'breviai.google.calendar_create': 'CALENDAR_CREATE',
                            'breviai.google.gmail_read': 'GMAIL_READ',
                            'breviai.google.gmail_send': 'GMAIL_SEND',
                            'breviai.google.sheets_read': 'SHEETS_READ',
                            'breviai.google.sheets_write': 'SHEETS_WRITE',
                            'breviai.google.drive_list': 'DRIVE_UPLOAD',
                            'breviai.google.meet_create': 'CALENDAR_CREATE',
                            // Web & Search
                            'breviai.web_search': 'WEB_SEARCH',
                            'http_request': 'HTTP_REQUEST',
                            'agent_ai': 'AGENT_AI',
                            // Communication
                            'whatsapp_send': 'WHATSAPP_SEND',
                            'telegram_send': 'TELEGRAM_SEND',
                            'slack_send': 'SLACK_SEND',
                            'email_send': 'EMAIL_SEND',
                            // Audio
                            'speak_text': 'SPEAK_TEXT',
                            // Weather
                            'weather_get': 'WEATHER_GET',
                            // Browser
                            'browser_scrape': 'BROWSER_SCRAPE',
                        };

                        // Build MCP step → node config mappers
                        const toolConfigMapper: Record<string, (args: any) => any> = {
                            'breviai.google.calendar_list': (args: any) => ({
                                type: args.type || 'today',
                                maxEvents: args.maxResults || 5,
                                variableName: args.variableName || 'events',
                                // Mobile CALENDAR_READ node filters by calendarName/calendarSource (not calendarId).
                                // If MCP automation uses an email as calendarId, map it to calendarName for import.
                                calendarName: args.calendarName || args.calendarId || '',
                                calendarSource: args.calendarSource || (args.calendarId ? 'google' : ''),
                            }),
                            'breviai.google.gmail_read': (args: any) => ({
                                variableName: args.variableName || 'emails',
                                maxResults: args.maxResults || 5,
                                query: args.query || 'is:unread',
                            }),
                            'breviai.web_search': (args: any) => ({
                                query: args.query || '', variableName: args.variableName || 'searchResults',
                            }),
                            'http_request': (args: any) => ({
                                url: args.url || '',
                                method: args.method || 'GET',
                                headers: args.headers,
                                body: args.body,
                                variableName: args.variableName || 'response',
                            }),
                            'agent_ai': (args: any) => ({
                                prompt: args.prompt || '',
                                provider: args.provider || 'gemini',
                                model: args.model || 'gemini-2.0-flash-exp',
                                outputFormat: args.outputFormat || 'text',
                                variableName: args.variableName || 'aiResponse',
                            }),
                            'whatsapp_send': (args: any) => ({
                                phoneNumber: args.phoneNumber || args.phone || '', message: args.message || '',
                                mode: 'backend' as const,
                            }),
                            'speak_text': (args: any) => ({
                                text: args.text || '', language: args.language || 'tr-TR',
                            }),
                        };

                        const convertedNodes: WorkflowNode[] = mcpSteps.map((step: any, idx: number) => {
                            const isBackendMcpTool = typeof step.tool === 'string' && step.tool.startsWith('breviai.');
                            const nodeType = (
                                isBackendMcpTool
                                    ? 'MCP_TOOL'
                                    : (toolToNodeType[step.tool] || 'AGENT_AI')
                            ) as NodeType;
                            const node = createNode(nodeType, { x: 100, y: 120 + idx * 130 });
                            node.label = step.name || step.id || `Step ${idx + 1}`;

                            if (isBackendMcpTool) {
                                const rawArgs = step.args && typeof step.args === 'object' ? step.args : {};
                                const { variableName, ...params } = rawArgs as any;
                                node.config = {
                                    ...(node.config || {}),
                                    toolName: step.tool,
                                    params,
                                    variableName: variableName || `${step.id || `mcp_${idx + 1}`}_result`,
                                } as any;
                                return node;
                            }

                            // Use specific config mapper if available, else merge args
                            const mapper = toolConfigMapper[step.tool];
                            if (mapper) {
                                node.config = { ...node.config, ...mapper(step.args || {}) } as any;
                            } else {
                                node.config = { ...node.config, ...(step.args || {}) } as any;
                            }
                            return node;
                        });

                        // Add TIME_TRIGGER if schedule exists
                        if (template.template_json.schedule) {
                            const trigger = createNode('TIME_TRIGGER' as NodeType, { x: 100, y: 0 });
                            trigger.label = '⏰ Zamanlayıcı';
                            // Parse cron: "0 9 * * 1-5" → hour=9, minute=0, days=[1,2,3,4,5]
                            const cronParts = (template.template_json.schedule || '').split(' ');
                            const minute = parseInt(cronParts[0], 10) || 0;
                            const hour = parseInt(cronParts[1], 10) || 9;
                            let days: number[] | undefined;
                            if (cronParts[4] && cronParts[4] !== '*') {
                                // Parse "1-5" or "0,1,2"
                                const dayStr = cronParts[4];
                                if (dayStr.includes('-')) {
                                    const [start, end] = dayStr.split('-').map(Number);
                                    days = [];
                                    for (let d = start; d <= end; d++) days.push(d);
                                } else {
                                    days = dayStr.split(',').map(Number);
                                }
                            }
                            trigger.config = {
                                hour, minute, repeat: true,
                                ...(days ? { days } : {}),
                            } as any;
                            convertedNodes.unshift(trigger);
                            convertedNodes.forEach((n: WorkflowNode, i: number) => {
                                n.position = { x: 100, y: i * 130 };
                            });
                        }

                        const convertedEdges = convertedNodes.slice(0, -1).map((n: WorkflowNode, i: number) =>
                            createEdge(n.id, convertedNodes[i + 1].id, 'default')
                        );
                        setWorkflow({
                            ...createWorkflow(template.title || template.template_json.name || 'MCP Otomasyon'),
                            description: template.description || template.template_json.description || '',
                            nodes: convertedNodes,
                            edges: convertedEdges,
                        });
                        console.log('[DEBUG] MCP workflow created with', convertedNodes.length, 'nodes');
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

    useEffect(() => {
        const loadOnboarding = async () => {
            try {
                const seen = await AsyncStorage.getItem('workflow_builder_onboarding_v1');
                if (!seen) setShowOnboarding(true);
            } catch (e) {
                // If storage fails, still avoid blocking UI
            }
        };
        loadOnboarding();
    }, []);

    const loadWorkflowErrors = useCallback(async (workflowId: string) => {
        if (!workflowId) {
            setWorkflowErrorEntries([]);
            setSelectedErrorEntryId(null);
            return;
        }

        const history = await ExecutionLogger.getHistoryByWorkflow(workflowId);
        const failedOnly = history.filter(
            entry => !entry.success && (!!entry.error || entry.nodeResults.some(node => !!node.error))
        );

        setWorkflowErrorEntries(failedOnly);

        if (failedOnly.length === 0) {
            setSelectedErrorEntryId(null);
            return;
        }

        setSelectedErrorEntryId(prevId => {
            if (prevId && failedOnly.some(entry => entry.id === prevId)) return prevId;
            return failedOnly[0].id;
        });

        const shouldAutoOpen = !!route.params?.openErrorModal || !!route.params?.openErrorLogId;
        if (!didAutoOpenErrorModal && shouldAutoOpen) {
            const requestedId = route.params?.openErrorLogId;
            if (requestedId && failedOnly.some(entry => entry.id === requestedId)) {
                setSelectedErrorEntryId(requestedId);
            }
            setShowErrorGuideModal(true);
            setDidAutoOpenErrorModal(true);
        }
    }, [didAutoOpenErrorModal, route.params?.openErrorLogId, route.params?.openErrorModal]);

    useEffect(() => {
        loadWorkflowErrors(workflow.id);
    }, [workflow.id, loadWorkflowErrors]);

    useFocusEffect(
        useCallback(() => {
            loadWorkflowErrors(workflow.id);
        }, [workflow.id, loadWorkflowErrors])
    );

    const selectedErrorEntry = useMemo(() => {
        if (workflowErrorEntries.length === 0) return null;
        return workflowErrorEntries.find(entry => entry.id === selectedErrorEntryId) || workflowErrorEntries[0];
    }, [workflowErrorEntries, selectedErrorEntryId]);

    const handlePreviewSuggestion = useCallback((suggestion: AssistantFixSuggestion) => {
        setSelectedFixSuggestion(suggestion);
        setShowFixPreviewModal(true);
    }, []);

    const handleApplySuggestion = useCallback((suggestion: AssistantFixSuggestion) => {
        const updatedWorkflow = workflowPatchService.applyChanges(workflow, suggestion.changes);
        setWorkflow(updatedWorkflow);
        setHasChanges(true);
        setShowFixPreviewModal(false);
        setShowAssistantModal(false);
        setSelectedFixSuggestion(null);
        Alert.alert('Başarılı', 'Asistan önerisi workflow\'a uygulandı.');
    }, [workflow]);

    const formatErrorTimestamp = useCallback((timestamp: number) => {
        return new Date(timestamp).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }, []);

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

    useEffect(() => {
        if (workflow.nodes.length > 0) {
            setHideRecipes(true);
        }
    }, [workflow.nodes.length]);

    // Add new node with optional connection
    const handleAddNode = useCallback((
        type: NodeType,
        options?: { position?: { x: number; y: number }; connectFrom?: { sourceNodeId: string; port: EdgePort } }
    ) => {
        const position = options?.position || { x: 100, y: 100 + workflow.nodes.length * 100 };
        const newNode = createNode(type, position);

        let newEdges = workflow.edges;
        if (options?.connectFrom) {
            const edge = createEdge(options.connectFrom.sourceNodeId, newNode.id, options.connectFrom.port);
            newEdges = [...workflow.edges, edge];
        } else if (workflow.nodes.length > 0) {
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
            await loadWorkflowErrors(workflow.id);
        }
    }, [workflow, loadWorkflowErrors]);

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
        } catch (error: any) {
            const msg = error?.message || 'AI yanıt vermedi veya bir hata oluştu.';
            Alert.alert('❌ Hata', msg);
        } finally {
            setIsGenerating(false);
        }
    };

    const applyRecipe = useCallback((recipeId: RecipeId, configOverride?: {
        hour?: string;
        minute?: string;
        geofenceId?: string;
        rssUrl?: string;
        reminderText?: string;
    }) => {
        let newWorkflow: Workflow | null = null;
        const config = {
            hour: '08',
            minute: '00',
            geofenceId: 'home',
            rssUrl: 'https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr',
            reminderText: 'Hatırlatma: bugünkü öncelikli işini tamamla.',
            ...(configOverride || {}),
        };

        const normalizeNumber = (value: string, fallback: number, max: number) => {
            const parsed = parseInt(value, 10);
            if (Number.isNaN(parsed)) return fallback;
            return Math.max(0, Math.min(max, parsed));
        };

        if (recipeId === 'morning_weather') {
            const trigger = createNode('TIME_TRIGGER', { x: 80, y: 120 });
            const weather = createNode('WEATHER_GET', { x: 320, y: 120 });
            const show = createNode('SHOW_TEXT', { x: 560, y: 120 });
            const hour = normalizeNumber(config.hour, 8, 23);
            const minute = normalizeNumber(config.minute, 0, 59);
            trigger.config = { ...(trigger.config || {}), hour, minute, repeat: true } as any;
            weather.config = { ...(weather.config || {}), variableName: 'weather' } as any;
            show.config = { ...(show.config || {}), content: '{{weather}}', title: 'Hava Durumu' } as any;
            newWorkflow = {
                ...createWorkflow('Sabah Hava Durumu'),
                nodes: [trigger, weather, show],
                edges: [
                    createEdge(trigger.id, weather.id, 'default'),
                    createEdge(weather.id, show.id, 'default'),
                ],
            };
        }

        if (recipeId === 'arrive_home_wifi') {
            const trigger = createNode('GEOFENCE_ENTER_TRIGGER', { x: 80, y: 120 });
            const settings = createNode('SETTINGS_OPEN', { x: 320, y: 120 });
            trigger.config = { ...(trigger.config || {}), geofenceId: config.geofenceId || 'home' } as any;
            settings.config = { ...(settings.config || {}), setting: 'wifi' } as any;
            newWorkflow = {
                ...createWorkflow('Eve Gelince Wi‑Fi Aç'),
                nodes: [trigger, settings],
                edges: [createEdge(trigger.id, settings.id, 'default')],
            };
        }

        if (recipeId === 'news_rss') {
            const trigger = createNode('MANUAL_TRIGGER', { x: 80, y: 120 });
            const rss = createNode('RSS_READ', { x: 320, y: 120 });
            const show = createNode('SHOW_TEXT', { x: 560, y: 120 });
            rss.config = { ...(rss.config || {}), url: config.rssUrl || 'https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr', variableName: 'rssItems' } as any;
            show.config = { ...(show.config || {}), content: '{{rssItems}}', title: 'Haberler' } as any;
            newWorkflow = {
                ...createWorkflow('Haberleri Oku'),
                nodes: [trigger, rss, show],
                edges: [
                    createEdge(trigger.id, rss.id, 'default'),
                    createEdge(rss.id, show.id, 'default'),
                ],
            };
        }

        if (recipeId === 'daily_reminder') {
            const trigger = createNode('TIME_TRIGGER', { x: 80, y: 120 });
            const notification = createNode('NOTIFICATION', { x: 320, y: 120 });
            const hour = normalizeNumber(config.hour, 9, 23);
            const minute = normalizeNumber(config.minute, 0, 59);
            trigger.config = { ...(trigger.config || {}), hour, minute, repeat: true } as any;
            notification.config = {
                ...(notification.config || {}),
                title: 'Günlük Hatırlatma',
                message: config.reminderText || 'Hatırlatma: bugünkü öncelikli işini tamamla.',
            } as any;
            newWorkflow = {
                ...createWorkflow('Günlük Hatırlatma'),
                nodes: [trigger, notification],
                edges: [createEdge(trigger.id, notification.id, 'default')],
            };
        }

        if (recipeId === 'contact_search') {
            const trigger = createNode('MANUAL_TRIGGER', { x: 80, y: 120 });
            const input = createNode('TEXT_INPUT', { x: 320, y: 120 });
            const contactsRead = createNode('CONTACTS_READ', { x: 560, y: 120 });
            const show = createNode('SHOW_TEXT', { x: 800, y: 120 });
            input.config = {
                ...(input.config || {}),
                prompt: 'Aramak istediğiniz kişi adı',
                variableName: 'contact_query',
            } as any;
            contactsRead.config = {
                ...(contactsRead.config || {}),
                query: '{{contact_query}}',
                variableName: 'contact_results',
            } as any;
            show.config = {
                ...(show.config || {}),
                title: 'Kişi Sonuçları',
                content: '{{contact_results}}',
            } as any;
            newWorkflow = {
                ...createWorkflow('Kişi Bul ve Göster'),
                nodes: [trigger, input, contactsRead, show],
                edges: [
                    createEdge(trigger.id, input.id, 'default'),
                    createEdge(input.id, contactsRead.id, 'default'),
                    createEdge(contactsRead.id, show.id, 'default'),
                ],
            };
        }

        if (recipeId === 'quick_translate') {
            const trigger = createNode('MANUAL_TRIGGER', { x: 80, y: 120 });
            const input = createNode('TEXT_INPUT', { x: 320, y: 120 });
            const translate = createNode('GOOGLE_TRANSLATE', { x: 560, y: 120 });
            const show = createNode('SHOW_TEXT', { x: 800, y: 120 });
            input.config = {
                ...(input.config || {}),
                prompt: 'Çevrilecek metni yazın',
                variableName: 'translation_input',
            } as any;
            translate.config = {
                ...(translate.config || {}),
                text: '{{translation_input}}',
                targetLanguage: 'en',
                variableName: 'translated_text',
            } as any;
            show.config = {
                ...(show.config || {}),
                title: 'Çeviri Sonucu',
                content: '{{translated_text}}',
            } as any;
            newWorkflow = {
                ...createWorkflow('Hızlı Çeviri'),
                nodes: [trigger, input, translate, show],
                edges: [
                    createEdge(trigger.id, input.id, 'default'),
                    createEdge(input.id, translate.id, 'default'),
                    createEdge(translate.id, show.id, 'default'),
                ],
            };
        }

        if (recipeId === 'business_card_to_contact') {
            const trigger = createNode('MANUAL_TRIGGER', { x: 80, y: 120 });
            const camera = createNode('CAMERA_CAPTURE', { x: 320, y: 120 });
            const parseCard = createNode('AGENT_AI', { x: 560, y: 120 });
            const saveContact = createNode('CONTACTS_WRITE', { x: 800, y: 120 });
            const show = createNode('SHOW_TEXT', { x: 1040, y: 120 });

            camera.config = {
                ...(camera.config || {}),
                cameraType: 'back',
                quality: 'high',
                enableOcr: true,
                variableName: 'business_card_image',
                textVariableName: 'business_card_text',
            } as any;

            parseCard.config = {
                ...(parseCard.config || {}),
                provider: 'gemini',
                model: 'gemini-2.0-flash',
                outputFormat: 'json',
                temperature: 0.1,
                variableName: 'card_contact',
                prompt: [
                    'Aşağıdaki kartvizit OCR metninden kişi bilgisini JSON olarak çıkar.',
                    'Sadece JSON döndür.',
                    'Alanlar: {"firstName":"","lastName":"","phoneNumber":"","email":"","company":""}',
                    'Metin: {{business_card_text}}'
                ].join('\n'),
            } as any;

            saveContact.config = {
                ...(saveContact.config || {}),
                firstName: '{{card_contact.firstName}}',
                lastName: '{{card_contact.lastName}}',
                phoneNumber: '{{card_contact.phoneNumber}}',
                email: '{{card_contact.email}}',
                company: '{{card_contact.company}}',
                variableName: 'saved_contact_id',
            } as any;

            show.config = {
                ...(show.config || {}),
                title: 'Kartvizit Kaydedildi',
                content: [
                    'Kişi: {{card_contact.firstName}} {{card_contact.lastName}}',
                    'Telefon: {{card_contact.phoneNumber}}',
                    'E-posta: {{card_contact.email}}',
                    'Şirket: {{card_contact.company}}'
                ].join('\n'),
            } as any;

            newWorkflow = {
                ...createWorkflow('Kartvizitten Rehbere Ekle'),
                nodes: [trigger, camera, parseCard, saveContact, show],
                edges: [
                    createEdge(trigger.id, camera.id, 'default'),
                    createEdge(camera.id, parseCard.id, 'default'),
                    createEdge(parseCard.id, saveContact.id, 'default'),
                    createEdge(saveContact.id, show.id, 'default'),
                ],
            };
        }

        if (recipeId === 'receipt_to_expense_json') {
            const trigger = createNode('MANUAL_TRIGGER', { x: 80, y: 120 });
            const camera = createNode('CAMERA_CAPTURE', { x: 320, y: 120 });
            const parseReceipt = createNode('AGENT_AI', { x: 560, y: 120 });
            const show = createNode('SHOW_TEXT', { x: 800, y: 120 });

            camera.config = {
                ...(camera.config || {}),
                cameraType: 'back',
                quality: 'high',
                enableOcr: true,
                variableName: 'receipt_image',
                textVariableName: 'receipt_text',
            } as any;

            parseReceipt.config = {
                ...(parseReceipt.config || {}),
                provider: 'gemini',
                model: 'gemini-2.0-flash',
                outputFormat: 'json',
                temperature: 0.1,
                variableName: 'expense_info',
                prompt: [
                    'Aşağıdaki fiş metninden harcama bilgisini çıkar.',
                    'Sadece JSON döndür.',
                    'Alanlar: {"merchant":"","date":"","total":0,"category":""}',
                    'Metin: {{receipt_text}}'
                ].join('\n'),
            } as any;

            show.config = {
                ...(show.config || {}),
                title: 'Fiş Özeti',
                content: '{{expense_info}}',
            } as any;

            newWorkflow = {
                ...createWorkflow('Fişten Harcama Özeti'),
                nodes: [trigger, camera, parseReceipt, show],
                edges: [
                    createEdge(trigger.id, camera.id, 'default'),
                    createEdge(camera.id, parseReceipt.id, 'default'),
                    createEdge(parseReceipt.id, show.id, 'default'),
                ],
            };
        }

        if (recipeId === 'note_to_summary') {
            const trigger = createNode('MANUAL_TRIGGER', { x: 80, y: 120 });
            const input = createNode('TEXT_INPUT', { x: 320, y: 120 });
            const summarize = createNode('AGENT_AI', { x: 560, y: 120 });
            const show = createNode('SHOW_TEXT', { x: 800, y: 120 });

            input.config = {
                ...(input.config || {}),
                prompt: 'Toplantı/not metnini yazın',
                variableName: 'note_text',
            } as any;

            summarize.config = {
                ...(summarize.config || {}),
                provider: 'gemini',
                model: 'gemini-2.0-flash',
                temperature: 0.2,
                variableName: 'note_summary',
                prompt: [
                    'Aşağıdaki metni kısa ve net şekilde özetle.',
                    '3 bölüm kullan: "Özet", "Aksiyonlar", "Riskler".',
                    'Metin: {{note_text}}'
                ].join('\n'),
            } as any;

            show.config = {
                ...(show.config || {}),
                title: 'Özet',
                content: '{{note_summary}}',
            } as any;

            newWorkflow = {
                ...createWorkflow('Notu Özetle'),
                nodes: [trigger, input, summarize, show],
                edges: [
                    createEdge(trigger.id, input.id, 'default'),
                    createEdge(input.id, summarize.id, 'default'),
                    createEdge(summarize.id, show.id, 'default'),
                ],
            };
        }

        if (recipeId === 'whatsapp_ai_reply_confirm') {
            const trigger = createNode('WHATSAPP_TRIGGER', { x: 80, y: 140 });
            const ai = createNode('AGENT_AI', { x: 320, y: 140 });
            const menu = createNode('SHOW_MENU', { x: 560, y: 140 });
            const condition = createNode('IF_ELSE', { x: 800, y: 140 });
            const send = createNode('WHATSAPP_SEND', { x: 1040, y: 80 });
            const sentNotification = createNode('NOTIFICATION', { x: 1280, y: 80 });
            const cancelNotification = createNode('NOTIFICATION', { x: 1040, y: 240 });

            trigger.config = {
                ...(trigger.config || {}),
                variableName: 'whatsappInfo',
            } as any;

            ai.config = {
                ...(ai.config || {}),
                provider: 'gemini',
                model: 'gemini-2.0-flash',
                temperature: 0.3,
                variableName: 'reply_draft',
                prompt: [
                    'Asagidaki WhatsApp mesajina kisa, nazik ve net bir yanit taslagi uret.',
                    'Sadece gonderilecek metni dondur. Aciklama ekleme.',
                    'Gonderen: {{whatsappInfo.sender}}',
                    'Mesaj: {{whatsappInfo.message}}',
                ].join('\n'),
            } as any;

            menu.config = {
                ...(menu.config || {}),
                title: 'Taslak yanit: {{reply_draft}}\nMesaji gondermek istiyor musun?',
                options: ['Gonder', 'Iptal'],
                variableName: 'reply_action',
            } as any;

            condition.config = {
                ...(condition.config || {}),
                left: 'reply_action',
                operator: '==',
                right: 'Gonder',
            } as any;

            send.config = {
                ...(send.config || {}),
                mode: 'backend',
                phoneNumber: '{{whatsappInfo.senderPhone}}',
                message: '{{reply_draft}}',
                variableName: 'whatsapp_send_result',
            } as any;

            sentNotification.config = {
                ...(sentNotification.config || {}),
                title: 'WhatsApp',
                message: 'Yanit gonderildi.',
                type: 'toast',
            } as any;

            cancelNotification.config = {
                ...(cancelNotification.config || {}),
                title: 'WhatsApp',
                message: 'Yanit iptal edildi.',
                type: 'toast',
            } as any;

            newWorkflow = {
                ...createWorkflow('WhatsApp AI Yanit (Onayli)'),
                nodes: [trigger, ai, menu, condition, send, sentNotification, cancelNotification],
                edges: [
                    createEdge(trigger.id, ai.id, 'default'),
                    createEdge(ai.id, menu.id, 'default'),
                    createEdge(menu.id, condition.id, 'default'),
                    createEdge(condition.id, send.id, 'true'),
                    createEdge(send.id, sentNotification.id, 'default'),
                    createEdge(condition.id, cancelNotification.id, 'false'),
                ],
            };
        }

        if (newWorkflow) {
            setWorkflow(newWorkflow);
            setHasChanges(true);
            setHideRecipes(true);
            setRecipeWizard(null);
        }
    }, []);

    const dismissOnboarding = useCallback(async () => {
        setShowOnboarding(false);
        try {
            await AsyncStorage.setItem('workflow_builder_onboarding_v1', '1');
        } catch (e) {
            // ignore
        }
    }, []);

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
                    <TouchableOpacity
                        style={[styles.actionButton, {
                            borderColor: workflowErrorEntries.length > 0 ? 'rgba(239, 68, 68, 0.4)' : colors.border,
                            backgroundColor: workflowErrorEntries.length > 0
                                ? 'rgba(239, 68, 68, 0.12)'
                                : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0')
                        }]}
                        onPress={() => {
                            if (workflowErrorEntries.length === 0) {
                                Alert.alert('Bilgi', 'Bu workflow için kayıtlı bir hata yok.');
                                return;
                            }
                            setShowErrorGuideModal(true);
                        }}
                    >
                        <Ionicons
                            name="alert-circle-outline"
                            size={20}
                            color={workflowErrorEntries.length > 0 ? '#EF4444' : colors.text}
                        />
                        {workflowErrorEntries.length > 0 && (
                            <View style={styles.errorCountBadge}>
                                <Text style={styles.errorCountBadgeText}>
                                    {workflowErrorEntries.length > 9 ? '9+' : String(workflowErrorEntries.length)}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, {
                            borderColor: 'rgba(37, 99, 235, 0.45)',
                            backgroundColor: 'rgba(37, 99, 235, 0.12)',
                        }]}
                        onPress={() => setShowAssistantModal(true)}
                    >
                        <Ionicons name="chatbubbles-outline" size={20} color="#2563EB" />
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
                onQuickAddRequested={(req) => {
                    setPendingQuickAdd(req);
                    setShowNodePalette(true);
                }}
            />

            {!hideRecipes && workflow.nodes.length === 0 && (
                <View style={styles.recipesOverlay} pointerEvents="box-none">
                    <View style={styles.recipesCard}>
                        <Text style={styles.recipesTitle}>Ne yapmak istersin?</Text>
                        <ScrollView style={styles.recipesScroll} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                style={styles.recipeItem}
                                onPress={() => setRecipeWizard({
                                    id: 'morning_weather',
                                    config: {
                                        hour: '08',
                                        minute: '00',
                                        geofenceId: 'home',
                                        rssUrl: 'https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr',
                                        reminderText: 'Hatırlatma: bugünkü öncelikli işini tamamla.',
                                    },
                                })}
                            >
                                <Text style={styles.recipeItemTitle}>Sabah Hava Durumu</Text>
                                <Text style={styles.recipeItemDesc}>Her gün 08:00'de hava durumunu göster.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.recipeItem}
                                onPress={() => setRecipeWizard({
                                    id: 'arrive_home_wifi',
                                    config: {
                                        hour: '08',
                                        minute: '00',
                                        geofenceId: 'home',
                                        rssUrl: 'https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr',
                                        reminderText: 'Hatırlatma: bugünkü öncelikli işini tamamla.',
                                    },
                                })}
                            >
                                <Text style={styles.recipeItemTitle}>Eve Gelince Wi-Fi Aç</Text>
                                <Text style={styles.recipeItemDesc}>Eve girişte Wi-Fi ayarını açar.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.recipeItem}
                                onPress={() => setRecipeWizard({
                                    id: 'news_rss',
                                    config: {
                                        hour: '08',
                                        minute: '00',
                                        geofenceId: 'home',
                                        rssUrl: 'https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr',
                                        reminderText: 'Hatırlatma: bugünkü öncelikli işini tamamla.',
                                    },
                                })}
                            >
                                <Text style={styles.recipeItemTitle}>Haberleri Oku</Text>
                                <Text style={styles.recipeItemDesc}>Güncel haberleri tek ekranda göster.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.recipeItem}
                                onPress={() => setRecipeWizard({
                                    id: 'daily_reminder',
                                    config: {
                                        hour: '09',
                                        minute: '00',
                                        geofenceId: 'home',
                                        rssUrl: 'https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr',
                                        reminderText: 'Hatırlatma: bugünkü öncelikli işini tamamla.',
                                    },
                                })}
                            >
                                <Text style={styles.recipeItemTitle}>Günlük Hatırlatma</Text>
                                <Text style={styles.recipeItemDesc}>Her gün belirlediğin saatte bildirim göndersin.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.recipeItem}
                                onPress={() => applyRecipe('contact_search')}
                            >
                                <Text style={styles.recipeItemTitle}>Kişi Bul ve Göster</Text>
                                <Text style={styles.recipeItemDesc}>İsim gir, rehberde ara, sonucu ekranda göster.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.recipeItem}
                                onPress={() => applyRecipe('quick_translate')}
                            >
                                <Text style={styles.recipeItemTitle}>Hızlı Çeviri</Text>
                                <Text style={styles.recipeItemDesc}>Metni yaz, otomatik çevir, sonucu göster.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.recipeItem}
                                onPress={() => applyRecipe('business_card_to_contact')}
                            >
                                <Text style={styles.recipeItemTitle}>Kartviziti Rehbere Ekle</Text>
                                <Text style={styles.recipeItemDesc}>Kartvizit fotoğrafı çek, Gemini ile oku, kişiyi kaydet.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.recipeItem}
                                onPress={() => applyRecipe('receipt_to_expense_json')}
                            >
                                <Text style={styles.recipeItemTitle}>Fişten Harcama Çıkar</Text>
                                <Text style={styles.recipeItemDesc}>Fişi çek, tutar/tarih/işyeri bilgisini JSON olarak çıkar.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.recipeItem}
                                onPress={() => applyRecipe('note_to_summary')}
                            >
                                <Text style={styles.recipeItemTitle}>Notu Özetle</Text>
                                <Text style={styles.recipeItemDesc}>Uzun metni özet, aksiyon ve risk başlıklarıyla toparla.</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.recipeItem}
                                onPress={() => applyRecipe('whatsapp_ai_reply_confirm')}
                            >
                                <Text style={styles.recipeItemTitle}>WhatsApp AI Yanit (Onayli)</Text>
                                <Text style={styles.recipeItemDesc}>Mesaji oku, AI yanit taslagi uretsin, gonder onayini sen ver.</Text>
                            </TouchableOpacity>
                            <View style={styles.recipesActions}>
                                <TouchableOpacity style={styles.recipeSecondary} onPress={() => setHideRecipes(true)}>
                                    <Text style={styles.recipeSecondaryText}>Boş Başla</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.recipePrimary} onPress={() => setShowAIModal(true)}>
                                    <Text style={styles.recipePrimaryText}>AI ile Oluştur</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            )}

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
                onClose={() => {
                    setShowNodePalette(false);
                    setPendingQuickAdd(null);
                }}
                onSelectNode={(type) => {
                    if (pendingQuickAdd) {
                        handleAddNode(type, {
                            position: pendingQuickAdd.position,
                            connectFrom: {
                                sourceNodeId: pendingQuickAdd.sourceNodeId,
                                port: pendingQuickAdd.port,
                            }
                        });
                        setPendingQuickAdd(null);
                    } else {
                        handleAddNode(type);
                    }
                    setShowNodePalette(false);
                }}
            />

            <NodeConfigModal
                visible={showNodeConfig}
                node={selectedNode}
                allNodes={workflow.nodes}
                onClose={() => setShowNodeConfig(false)}
                onSave={handleUpdateNode}
                onDelete={handleDeleteNode}
            />

            {/* Onboarding Overlay */}
            <Modal
                visible={showOnboarding}
                transparent
                animationType="fade"
                onRequestClose={dismissOnboarding}
            >
                <View style={styles.onboardingOverlay}>
                    <View style={styles.onboardingCard}>
                        <Text style={styles.onboardingTitle}>Lego Gibi Kur!</Text>
                        <Text style={styles.onboardingText}>
                            1. Bir node’un sağındaki + butonuna dokun.
                        </Text>
                        <Text style={styles.onboardingText}>
                            2. Boş alana dokununca node menüsü açılır.
                        </Text>
                        <Text style={styles.onboardingText}>
                            3. Seçtiğin node otomatik bağlanır.
                        </Text>
                        <TouchableOpacity style={styles.onboardingButton} onPress={dismissOnboarding}>
                            <Text style={styles.onboardingButtonText}>Anladım</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Recipe Wizard Modal */}
            <Modal
                visible={!!recipeWizard}
                transparent
                animationType="slide"
                onRequestClose={() => setRecipeWizard(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.aiModalContent, { backgroundColor: isDark ? '#121214' : colors.card }]}>
                        <View style={styles.aiHeader}>
                            <Text style={[styles.aiTitle, { color: colors.text }]}>🧙 Tarif Sihirbazı</Text>
                            <TouchableOpacity onPress={() => setRecipeWizard(null)}>
                                <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {recipeWizard && (recipeWizard.id === 'morning_weather' || recipeWizard.id === 'daily_reminder') && (
                            <>
                                <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
                                    Her gün kaçta çalışsın?
                                </Text>
                                <View style={styles.recipeTimeRow}>
                                    <TextInput
                                        style={[styles.recipeTimeInput, { color: colors.text, borderColor: colors.border }]}
                                        value={recipeWizard.config.hour}
                                        onChangeText={(t) => setRecipeWizard(prev => prev ? { ...prev, config: { ...prev.config, hour: t.replace(/[^0-9]/g, '').slice(0, 2) } } : prev)}
                                        placeholder="08"
                                        placeholderTextColor={colors.textTertiary}
                                        keyboardType="number-pad"
                                    />
                                    <Text style={[styles.recipeTimeSeparator, { color: colors.textSecondary }]}>:</Text>
                                    <TextInput
                                        style={[styles.recipeTimeInput, { color: colors.text, borderColor: colors.border }]}
                                        value={recipeWizard.config.minute}
                                        onChangeText={(t) => setRecipeWizard(prev => prev ? { ...prev, config: { ...prev.config, minute: t.replace(/[^0-9]/g, '').slice(0, 2) } } : prev)}
                                        placeholder="00"
                                        placeholderTextColor={colors.textTertiary}
                                        keyboardType="number-pad"
                                    />
                                </View>
                                {recipeWizard.id === 'daily_reminder' && (
                                    <>
                                        <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
                                            Bildirim metni
                                        </Text>
                                        <TextInput
                                            style={[styles.aiInput, {
                                                minHeight: 50,
                                                height: 50,
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                                color: colors.text,
                                                borderColor: colors.border
                                            }]}
                                            value={recipeWizard.config.reminderText}
                                            onChangeText={(t) => setRecipeWizard(prev => prev ? { ...prev, config: { ...prev.config, reminderText: t } } : prev)}
                                            placeholder="Hatırlatma metnini yazın"
                                            placeholderTextColor={colors.textTertiary}
                                        />
                                    </>
                                )}
                            </>
                        )}

                        {recipeWizard && recipeWizard.id === 'arrive_home_wifi' && (
                            <>
                                <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
                                    Ev bölgesi (geofence) ID’sini yazın.
                                </Text>
                                <TextInput
                                    style={[styles.aiInput, {
                                        minHeight: 50,
                                        height: 50,
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                        color: colors.text,
                                        borderColor: colors.border
                                    }]}
                                    value={recipeWizard.config.geofenceId}
                                    onChangeText={(t) => setRecipeWizard(prev => prev ? { ...prev, config: { ...prev.config, geofenceId: t } } : prev)}
                                    placeholder="home"
                                    placeholderTextColor={colors.textTertiary}
                                />
                                <Text style={[styles.recipeHint, { color: colors.textSecondary }]}>
                                    Örn: home, office
                                </Text>
                            </>
                        )}

                        {recipeWizard && recipeWizard.id === 'news_rss' && (
                            <>
                                <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
                                    RSS adresini girin.
                                </Text>
                                <TextInput
                                    style={[styles.aiInput, {
                                        minHeight: 50,
                                        height: 50,
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                        color: colors.text,
                                        borderColor: colors.border
                                    }]}
                                    value={recipeWizard.config.rssUrl}
                                    onChangeText={(t) => setRecipeWizard(prev => prev ? { ...prev, config: { ...prev.config, rssUrl: t } } : prev)}
                                    placeholder="https://example.com/rss"
                                    placeholderTextColor={colors.textTertiary}
                                    autoCapitalize="none"
                                />
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.generateButton}
                            onPress={() => {
                                if (!recipeWizard) return;
                                applyRecipe(recipeWizard.id, recipeWizard.config);
                            }}
                        >
                            <Text style={styles.generateButtonText}>Oluştur</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Workflow Error Guide Modal */}
            <Modal
                visible={showErrorGuideModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowErrorGuideModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.aiModalContent, { backgroundColor: isDark ? '#121214' : colors.card }]}>
                        <View style={styles.aiHeader}>
                            <Text style={[styles.aiTitle, { color: colors.text }]}>Workflow Hata Rehberi</Text>
                            <TouchableOpacity onPress={() => setShowErrorGuideModal(false)}>
                                <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>x</Text>
                            </TouchableOpacity>
                        </View>

                        {workflowErrorEntries.length === 0 && (
                            <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
                                Bu workflow için kayıtlı hata bulunmuyor.
                            </Text>
                        )}

                        {workflowErrorEntries.length > 0 && (
                            <>
                                <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
                                    Son hatalar arasından birini seçin ve kolay anlatımla düzeltin.
                                </Text>

                                <View style={styles.errorEntryList}>
                                    {workflowErrorEntries.slice(0, 5).map((entry) => (
                                        <TouchableOpacity
                                            key={entry.id}
                                            style={[
                                                styles.errorEntryChip,
                                                selectedErrorEntry?.id === entry.id && styles.errorEntryChipActive,
                                            ]}
                                            onPress={() => setSelectedErrorEntryId(entry.id)}
                                        >
                                            <Text
                                                style={[
                                                    styles.errorEntryChipText,
                                                    selectedErrorEntry?.id === entry.id && styles.errorEntryChipTextActive,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {entry.failedNodeLabel || 'Workflow'}
                                            </Text>
                                            <Text style={styles.errorEntryChipTime}>
                                                {formatErrorTimestamp(entry.timestamp)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {selectedErrorEntry && selectedErrorEntry.nodeResults
                                    .filter(node => !!node.error)
                                    .slice(0, 3)
                                    .map((nodeResult) => {
                                        const explanation = explainWorkflowError(nodeResult.error, nodeResult.nodeLabel);
                                        return (
                                            <View key={`${selectedErrorEntry.id}_${nodeResult.nodeId}`} style={styles.errorGuideCard}>
                                                <Text style={[styles.errorGuideTitle, { color: colors.text }]}>
                                                    {nodeResult.nodeLabel} - {explanation.title}
                                                </Text>
                                                <Text style={[styles.errorGuideLevel, { color: colors.textSecondary }]}>
                                                    Basit: {explanation.beginnerMessage}
                                                </Text>
                                                <Text style={[styles.errorGuideLevel, { color: colors.textSecondary }]}>
                                                    Orta: {explanation.intermediateMessage}
                                                </Text>
                                                {explanation.actionItems.map((item, index) => (
                                                    <Text key={`${nodeResult.nodeId}_tip_${index}`} style={[styles.errorGuideTip, { color: colors.textSecondary }]}>
                                                        - {item}
                                                    </Text>
                                                ))}
                                                <Text style={[styles.errorGuideTech, { color: colors.textTertiary || colors.textSecondary }]}>
                                                    Teknik: {explanation.technicalMessage}
                                                </Text>
                                            </View>
                                        );
                                    })}
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            <WorkflowAssistantPanel
                visible={showAssistantModal}
                workflow={workflow}
                latestError={selectedErrorEntry}
                onClose={() => setShowAssistantModal(false)}
                onPreviewSuggestion={handlePreviewSuggestion}
                colors={colors}
                isDark={isDark}
            />

            <WorkflowFixPreviewModal
                visible={showFixPreviewModal}
                suggestion={selectedFixSuggestion}
                onClose={() => {
                    setShowFixPreviewModal(false);
                    setSelectedFixSuggestion(null);
                }}
                onApply={handleApplySuggestion}
                colors={colors}
                isDark={isDark}
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
    errorCountBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
    },
    errorCountBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    errorEntryList: {
        marginBottom: 12,
        gap: 8,
    },
    errorEntryChip: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.35)',
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    errorEntryChipActive: {
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
        borderColor: 'rgba(239, 68, 68, 0.65)',
    },
    errorEntryChipText: {
        color: '#FCA5A5',
        fontSize: 12,
        fontWeight: '700',
    },
    errorEntryChipTextActive: {
        color: '#FFFFFF',
    },
    errorEntryChipTime: {
        color: '#FECACA',
        fontSize: 11,
        marginTop: 2,
    },
    errorGuideCard: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 12,
        marginBottom: 10,
    },
    errorGuideTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 6,
    },
    errorGuideLevel: {
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 6,
    },
    errorGuideTip: {
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 4,
    },
    errorGuideTech: {
        fontSize: 11,
        marginTop: 6,
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
    onboardingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    onboardingCard: {
        backgroundColor: '#10131A',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        width: '100%',
        maxWidth: 360,
    },
    onboardingTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    onboardingText: {
        color: '#C7D2FE',
        fontSize: 14,
        marginBottom: 8,
    },
    onboardingButton: {
        backgroundColor: '#00F5FF',
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 12,
    },
    onboardingButtonText: {
        color: '#000',
        fontWeight: '700',
        textAlign: 'center',
    },
    recipesOverlay: {
        position: 'absolute',
        top: 120,
        left: 16,
        right: 16,
        zIndex: 10,
    },
    recipesCard: {
        backgroundColor: '#0F1117',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    recipesScroll: {
        maxHeight: 460,
    },
    recipesTitle: {
        color: '#E2E8F0',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 10,
    },
    recipeItem: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    recipeItemTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    recipeItemDesc: {
        color: '#94A3B8',
        fontSize: 12,
    },
    recipesActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    recipeSecondary: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    recipeSecondaryText: {
        color: '#E2E8F0',
        fontWeight: '600',
        fontSize: 12,
    },
    recipePrimary: {
        flex: 1,
        backgroundColor: '#00F5FF',
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    recipePrimaryText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 12,
    },
    recipeTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 16,
    },
    recipeTimeInput: {
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        minWidth: 64,
        textAlign: 'center',
        fontSize: 18,
        borderWidth: 1,
    },
    recipeTimeSeparator: {
        fontSize: 20,
        fontWeight: '700',
    },
    recipeHint: {
        fontSize: 12,
        marginTop: -8,
        marginBottom: 12,
    },
});

export default WorkflowBuilderScreen;
// Fixed syntax error
