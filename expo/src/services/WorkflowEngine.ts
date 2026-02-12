/**
 * BreviAI Workflow Engine
 * Node-tabanlı workflow çalıştırma motoru
 * n8n benzeri akış yönetimi
 */

import {
    Workflow,
    WorkflowNode,
    WorkflowEdge,
    NodeType,
    EdgePort,
    ExecutionContext,
    NodeExecutionResult,
    WorkflowExecutionResult,
    ExecutionState,
    ExecutionCallback,
    IfElseConfig,
    VariableConfig,
    LoopConfig,
    SplitBatchesConfig,
    DelayConfig,
    ClipboardReaderConfig,
    GoogleTranslateConfig,
    TelegramSendConfig,
    SlackSendConfig,
    SwitchConfig
} from '../types/workflow-types';

// Import VariableManager from separate file to avoid circular dependency
import { VariableManager } from './VariableManager';
export { VariableManager };

// Import extracted engine modules
import { ConditionEvaluator, LoopController, BatchController } from '../engine';
import { ExecutionLogger } from './ExecutionLogger';

// Node executor imports
// Node executor imports
import {
    executeTriggerNode,
    executeControlNode,
    executeInputNode,
    executeOutputNode,
    executeDeviceNode,
    executeCalendarRead,
    executeCalendarCreate,
    executeCalendarUpdate,
    executeCalendarDelete,
    executeContactsRead,
    executeContactsWrite,
    executeNavigateTo,
    executeSettingsOpen,
    executeDatabaseRead,
    executeDatabaseWrite,
    executeLocationGet,
    executeGeofenceCreate,
    executeBatteryCheck,
    executeNetworkCheck,
    executeWeatherGet,
    executeVolumeControl,
    executeSpeakText,
    executeAudioRecord,
    executeSmsSend,
    executeEmailSend,
    executeWhatsAppSend,
    executeHttpRequest,
    executeOpenUrl,
    executeWebAutomation,
    executeWebSearch,
    executeHtmlExtract,
    executeFileWrite,
    executeFileRead,
    executeFilePick,
    executePdfCreate,
    executeAlarmSet,
    executeViewUdf,
    executeViewDocument,
    executeSpeechToText,
    executeAgentAI,
    executeRealtimeAI,
    executeRssRead,
    executeGoogleSheetsRead,
    executeGoogleSheetsWrite,
    executeGoogleDriveUpload,
    executeGmailSend,
    executeGmailRead,
    executeClipboardReader,
    executeImageGenerator,
    executeImageEdit,
    executeGoogleTranslate,
    executeTelegramSend,
    executeSlackSend,
    executeDiscordSend,
    executeNotionCreate,
    executeNotionRead,
    executePhilipsHue,
    executeRememberInfo,
    executeSwitch,
    executeFacebookLogin,
    executeInstagramPost,
    executeOutlookSend,
    executeOutlookRead,
    executeExcelRead,
    executeExcelWrite,
    executeOneDriveUpload,
    executeOneDriveDownload,
    executeOneDriveList,
    // New exports for Agent tools
    executeShowText,
    executeShowImage,
    executeNotification,
    executeTextInput,
    executeShowMenu,
    executeAppLaunch,
    executeCodeExecution,
    executeSetValues,
    // Vector Memory (RAG) tools
    executeSearchMemory,
    executeAddToMemory,
    executeBulkAddToMemory,
    executeClearMemory
} from './nodes';
import {
    executeLightSensor,
    executePedometer,
    executeMagnetometer,
    executeBarometer,
    executeGestureTrigger
} from './nodes/sensors';
import { executeCameraCapture } from './nodes/camera';
import {
    executeCronCreate,
    executeBrowserScrape
} from './nodes/backend';
import { debugLog } from './DebugLogger';
import { userSettingsService } from './UserSettingsService';
import { getToolByName } from './ToolRegistry';
import { notificationController, ACTION_PAUSE, ACTION_RESUME, ACTION_STOP } from './NotificationController';

// ═══════════════════════════════════════════════════════════════
// CONDITION EVALUATOR - Extracted to src/engine/ConditionEvaluator.ts
// ═══════════════════════════════════════════════════════════════
export { ConditionEvaluator };

// ═══════════════════════════════════════════════════════════════
// LOOP CONTROLLER - Extracted to src/engine/LoopController.ts
// ═══════════════════════════════════════════════════════════════
export { LoopController };

// ═══════════════════════════════════════════════════════════════
// BATCH CONTROLLER - Extracted to src/engine/BatchController.ts
// ═══════════════════════════════════════════════════════════════
export { BatchController };

// ═══════════════════════════════════════════════════════════════
// WORKFLOW ENGINE
// ═══════════════════════════════════════════════════════════════

export class WorkflowEngine {
    private static instance: WorkflowEngine;
    private variableManager: VariableManager = new VariableManager();
    private conditionEvaluator: ConditionEvaluator = new ConditionEvaluator(this.variableManager);
    private loopController: LoopController = new LoopController();
    private batchController: BatchController = new BatchController();
    private isCancelled: boolean = false;
    private isPaused: boolean = false;
    private pausePromise: Promise<void> | null = null;
    private pauseResolver: (() => void) | null = null;
    private abortController: AbortController = new AbortController(); // Initialize default
    private executionCallback: ExecutionCallback | null = null;

    static getInstance(): WorkflowEngine {
        if (!WorkflowEngine.instance) {
            WorkflowEngine.instance = new WorkflowEngine();
        }
        return WorkflowEngine.instance;
    }

    private constructor() {
        // Initialize Notification Controller
        notificationController.setup();

        // Listen for notification actions
        notificationController.addActionListener((actionId) => {
            switch (actionId) {
                case ACTION_PAUSE:
                    this.pauseExecution();
                    break;
                case ACTION_RESUME:
                    this.resumeExecution();
                    break;
                case ACTION_STOP:
                    this.stopExecution();
                    break;
            }
        });
    }

    setExecutionCallback(callback: ExecutionCallback | null): void {
        this.executionCallback = callback;
    }

    /**
     * Stop execution completely (cannot be resumed)
     */
    stopExecution(): void {
        this.isCancelled = true;
        this.isPaused = false;
        // Unlock pause if waiting
        if (this.pauseResolver) {
            this.pauseResolver();
            this.pauseResolver = null;
            this.pausePromise = null;
        }
        this.abortController.abort();
        this.notifyState({ isExecuting: false, isPaused: false });
        notificationController.cancelExecutionNotification(); // Cancel notification
        debugLog('workflow', 'Execution stopped via stopExecution()');
    }

    /**
     * Pause execution (can be resumed)
     */
    pauseExecution(): void {
        if (!this.isPaused) {
            this.isPaused = true;
            this.pausePromise = new Promise<void>(resolve => {
                this.pauseResolver = resolve;
            });
            this.notifyState({ isPaused: true });
            debugLog('workflow', 'Execution paused');
        }
    }

    /**
     * Resume paused execution
     */
    resumeExecution(): void {
        if (this.isPaused) {
            this.isPaused = false;
            if (this.pauseResolver) {
                this.pauseResolver();
                this.pauseResolver = null;
                this.pausePromise = null;
            }
            this.notifyState({ isPaused: false });
            debugLog('workflow', 'Execution resumed');
        }
    }

    /**
     * @deprecated Use stopExecution() instead
     */
    cancelExecution(): void {
        this.stopExecution();
    }

    /**
     * Check if execution is paused
     */
    getIsPaused(): boolean {
        return this.isPaused;
    }

    /**
     * Check if execution is cancelled/stopped
     */
    getIsCancelled(): boolean {
        return this.isCancelled;
    }

    private notifyState(state: Partial<ExecutionState>): void {
        const fullState = {
            isExecuting: true,
            isPaused: this.isPaused, // Use current state as default
            currentNodeId: null,
            currentNodeLabel: '',
            progress: 0,
            canCancel: true,
            canPause: true,
            ...state,
        };

        // Update Notification
        if (fullState.isExecuting) {
            const title = fullState.isPaused ? '⏸️ Workflow Duraklatıldı' : '⚡ Workflow Çalışıyor';
            const body = fullState.isPaused
                ? 'Devam etmek için dokunun'
                : fullState.currentNodeLabel || 'İşleniyor...';

            notificationController.showExecutionNotification(title, body, fullState.isPaused);
        } else {
            notificationController.cancelExecutionNotification();
        }

        if (this.executionCallback) {
            this.executionCallback(fullState);
        }
    }

    async execute(workflow: Workflow, initialVariables?: Record<string, any>): Promise<WorkflowExecutionResult> {
        debugLog('workflow', `Starting Workflow: ${workflow.name}`, { id: workflow.id });

        const startTime = Date.now();
        const nodeResults: NodeExecutionResult[] = [];
        this.isCancelled = false;
        this.abortController = new AbortController(); // Create new controller for this run
        this.variableManager.clear();

        this.variableManager.clear();

        // 1. Load User Settings Variables (App Passwords, Custom Env Vars)
        // CRITICAL FIX: Wait for settings to load from disk!
        await userSettingsService.ensureLoaded();

        const globalVars = userSettingsService.getCustomVariables();
        Object.entries(globalVars).forEach(([key, data]) => {
            // Data is now { value, description }, extract value
            this.variableManager.set(key, data.value);
        });
        console.log('[WorkflowEngine] Loaded Variables:', Object.keys(this.variableManager.getAll())); // DEBUG LOG
        // Also inject API Keys as variables if needed (optional, but convenient)
        if (userSettingsService.getSettings().geminiApiKey) this.variableManager.set('GEMINI_API_KEY', userSettingsService.getSettings().geminiApiKey);
        if (userSettingsService.getSettings().openaiApiKey) this.variableManager.set('OPENAI_API_KEY', userSettingsService.getSettings().openaiApiKey);

        // 2. Load execution arguments
        if (initialVariables) {
            Object.entries(initialVariables).forEach(([key, value]) => {
                this.variableManager.set(key, value);
            });
        }

        try {
            // Find trigger node (entry point)
            const triggerNode = this.findTriggerNode(workflow);
            if (!triggerNode) {
                debugLog('error', `No trigger node found for workflow ${workflow.id}`, { workflowId: workflow.id });
                return {
                    workflowId: workflow.id,
                    success: false,
                    nodeResults: [],
                    totalDuration: Date.now() - startTime,
                    error: 'No trigger node found',
                };
            }
            debugLog('workflow', `Trigger node found: ${triggerNode.label} (${triggerNode.id})`, { nodeId: triggerNode.id });

            // Create node map for fast lookup
            const nodeMap = new Map<string, WorkflowNode>();
            workflow.nodes.forEach(node => nodeMap.set(node.id, node));

            // Create edge map for fast lookup
            const edgeMap = this.buildEdgeMap(workflow.edges);

            // Execute from trigger
            let currentNodes: Array<{ node: WorkflowNode; port: EdgePort }> = [{ node: triggerNode, port: 'default' }];
            const executedNodes = new Set<string>();
            const totalNodes = workflow.nodes.length;
            let executedCount = 0;

            while (currentNodes.length > 0 && !this.isCancelled) {
                // Wait if paused
                if (this.isPaused && this.pausePromise) {
                    debugLog('workflow', 'Execution paused, waiting for resume...');
                    await this.pausePromise;
                    // Check if cancelled during pause
                    if (this.isCancelled) break;
                }

                const { node, port } = currentNodes.shift()!;
                debugLog('execution', `Processing node queue: ${node.label} (port: ${port})`, { nodeId: node.id, port });

                // Prevent infinite loops (except for LOOP nodes and nodes in loop iteration)
                // Nodes that came via 'loop' port need to re-execute for each iteration
                if (executedNodes.has(node.id) && node.type !== 'LOOP' && port !== 'loop') {
                    debugLog('warning', `Skipping already executed node (non-LOOP): ${node.label}`, { nodeId: node.id });
                    continue;
                }

                // Notify UI
                this.notifyState({
                    isExecuting: true,
                    isPaused: this.isPaused,
                    currentNodeId: node.id,
                    currentNodeLabel: node.label,
                    progress: Math.round((executedCount / totalNodes) * 100),
                    canCancel: true,
                    canPause: true,
                });

                // Execute node
                const result = await this.executeNode(node, workflow);
                nodeResults.push(result);
                executedCount++;

                if (!result.success) {
                    debugLog('error', `Node execution failed: ${node.label}`, { nodeId: node.id, error: result.error });
                    // If node failed, check for error edge
                    const errorEdges = this.getNextNodes(node.id, 'error', edgeMap, nodeMap);
                    if (errorEdges.length > 0) {
                        debugLog('execution', `Following error path from node: ${node.label}`, { nodeId: node.id, nextNodes: errorEdges.map(n => n.id) });
                        currentNodes.push(...errorEdges.map(n => ({ node: n, port: 'error' as EdgePort })));
                        continue;
                    }
                    // No error handler, stop execution
                    debugLog('workflow', `Workflow stopped due to node failure and no error handler: ${node.label}`, { nodeId: node.id });
                    break;
                }

                executedNodes.add(node.id);

                // Save node output to previous_output for next nodes to use
                if (result.output !== undefined) {
                    // Extract meaningful value from output
                    let outputValue = result.output;

                    // For AI Agent, extract the response text
                    if (result.output?.response) {
                        outputValue = result.output.response;
                    } else if (result.output?.value) {
                        outputValue = result.output.value;
                    } else if (result.output?.content) {
                        outputValue = result.output.content;
                    }

                    this.variableManager.set('previous_output', outputValue);
                    debugLog('execution', `Saved previous_output`, { value: typeof outputValue === 'string' ? outputValue.substring(0, 100) : outputValue });
                }

                // Determine next nodes based on result
                const nextPort = result.nextPort || 'default';
                const nextNodes = this.getNextNodes(node.id, nextPort, edgeMap, nodeMap);
                debugLog('execution', `Node ${node.label} completed successfully. Next port: ${nextPort}. Next nodes: ${nextNodes.map(n => n.id).join(', ')}`, { nodeId: node.id, nextPort, nextNodes: nextNodes.map(n => n.id) });
                currentNodes.push(...nextNodes.map(n => ({ node: n, port: nextPort })));
            }

            if (this.isCancelled) {
                debugLog('workflow', `Workflow ${workflow.id} was cancelled.`, { workflowId: workflow.id });
            } else {
                debugLog('workflow', `Workflow ${workflow.id} completed.`, { workflowId: workflow.id, success: nodeResults.every(r => r.success) });
            }

            // Notify completion
            this.notifyState({
                isExecuting: false,
                progress: 100,
            });

            const result: WorkflowExecutionResult = {
                workflowId: workflow.id,
                success: !this.isCancelled && nodeResults.every(r => r.success),
                nodeResults,
                totalDuration: Date.now() - startTime,
            };

            // Log execution to history
            const nodeLabels = new Map<string, string>();
            workflow.nodes.forEach(n => nodeLabels.set(n.id, n.label));
            ExecutionLogger.logExecution(
                workflow.id,
                workflow.name,
                workflow.icon || '⚡',
                result,
                nodeLabels
            ).catch(err => console.warn('[WorkflowEngine] Log failed:', err));

            return result;
        } catch (error) {
            debugLog('error', `Workflow execution failed unexpectedly: ${workflow.id}`, { error: error instanceof Error ? error.message : String(error) }, error);
            this.notifyState({
                isExecuting: false,
                progress: 0,
            });

            const errorResult: WorkflowExecutionResult = {
                workflowId: workflow.id,
                success: false,
                nodeResults,
                totalDuration: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown error',
            };

            // Log failed execution to history
            const nodeLabels = new Map<string, string>();
            workflow.nodes.forEach(n => nodeLabels.set(n.id, n.label));
            ExecutionLogger.logExecution(
                workflow.id,
                workflow.name,
                workflow.icon || '⚡',
                errorResult,
                nodeLabels
            ).catch(err => console.warn('[WorkflowEngine] Log failed:', err));

            return errorResult;
        }
    }

    private findTriggerNode(workflow: Workflow): WorkflowNode | undefined {
        return workflow.nodes.find(
            node => node.type === 'MANUAL_TRIGGER' ||
                node.type.endsWith('_TRIGGER')
        );
    }


    private buildEdgeMap(edges: WorkflowEdge[]): Map<string, Map<EdgePort, string[]>> {
        const edgeMap = new Map<string, Map<EdgePort, string[]>>();

        for (const edge of edges) {
            if (!edgeMap.has(edge.sourceNodeId)) {
                edgeMap.set(edge.sourceNodeId, new Map());
            }
            const portMap = edgeMap.get(edge.sourceNodeId)!;
            const sourcePort = edge.sourcePort || 'default';
            if (!portMap.has(sourcePort)) {
                portMap.set(sourcePort, []);
            }
            portMap.get(sourcePort)!.push(edge.targetNodeId);
        }

        return edgeMap;
    }

    private getNextNodes(
        nodeId: string,
        port: EdgePort,
        edgeMap: Map<string, Map<EdgePort, string[]>>,
        nodeMap: Map<string, WorkflowNode>
    ): WorkflowNode[] {
        const portMap = edgeMap.get(nodeId);
        if (!portMap) return [];

        const targetIds = portMap.get(port) || [];
        return targetIds
            .map(id => nodeMap.get(id))
            .filter((node): node is WorkflowNode => node !== undefined);
    }

    private async executeNode(node: WorkflowNode, workflow: Workflow): Promise<NodeExecutionResult> {
        debugLog('execution', `Executing Node: ${node.label
            }(${node.type})`, { nodeId: node.id, config: node.config });

        const startTime = Date.now();
        let output: any;
        let nextPort: EdgePort = 'default';

        try {
            // Route to appropriate executor based on node type category
            switch (node.type) {
                // Triggers
                case 'MANUAL_TRIGGER':
                case 'TIME_TRIGGER':
                case 'CALL_TRIGGER':
                case 'NOTIFICATION_TRIGGER':
                case 'TELEGRAM_TRIGGER':
                case 'EMAIL_TRIGGER':
                case 'DEEP_LINK_TRIGGER':
                case 'SMS_TRIGGER':
                case 'WHATSAPP_TRIGGER':
                case 'STEP_TRIGGER':
                case 'CHAT_INPUT_TRIGGER':
                    output = await executeTriggerNode(node, this.variableManager);
                    break;

                // Control
                case 'DELAY':
                    await this.executeDelay(node.config as DelayConfig);
                    break;
                case 'IF_ELSE':
                    const conditionResult = this.conditionEvaluator.evaluate(node.config as IfElseConfig);
                    nextPort = conditionResult ? 'true' : 'false';
                    output = { result: conditionResult };
                    break;
                case 'VARIABLE':
                    output = this.executeVariable(node.config as VariableConfig);
                    break;
                case 'LOOP':
                    const loopResult = await this.executeLoop(node);
                    nextPort = loopResult.continue ? 'loop' : 'done';
                    output = loopResult;
                    break;
                case 'SWITCH':
                    const switchResult = await executeSwitch(node.config as any, this.variableManager);
                    nextPort = switchResult.nextPort || 'default';
                    output = switchResult;
                    break;
                case 'CODE_EXECUTION':
                    output = await executeCodeExecution(node.config as any, this.variableManager);
                    break;
                case 'SET_VALUES':
                    output = await executeSetValues(node.config as any, this.variableManager);
                    break;
                case 'SPLIT_BATCHES':
                    const batchResult = await this.executeSplitBatches(node);
                    nextPort = batchResult.nextPort;
                    output = batchResult;
                    break;

                // Input
                // Input
                case 'TEXT_INPUT':
                case 'SHOW_MENU':
                case 'SHOW_TEXT':
                case 'SHOW_IMAGE':
                    output = await executeInputNode(node, this.variableManager);
                    break;
                case 'CLIPBOARD_READER':
                    console.log('Test: Executing CLIPBOARD_READER');
                    output = await executeClipboardReader(node.config as ClipboardReaderConfig, this.variableManager);
                    break;

                // Output
                case 'NOTIFICATION':
                case 'SHARE_SHEET':
                    output = await executeOutputNode(node, this.variableManager);
                    break;

                // Device
                case 'SOUND_MODE':
                case 'SCREEN_WAKE':
                case 'APP_LAUNCH':
                case 'DND_CONTROL':
                case 'BRIGHTNESS_CONTROL':
                case 'FLASHLIGHT_CONTROL':
                    output = await executeDeviceNode(node, this.variableManager);
                    break;
                case 'GLOBAL_ACTION':
                    output = await executeDeviceNode(node, this.variableManager);
                    break;
                case 'MEDIA_CONTROL':
                    output = await executeDeviceNode(node, this.variableManager);
                    break;

                // Contacts
                case 'CONTACTS_READ':
                    output = await executeContactsRead(node.config as any, this.variableManager);
                    break;
                case 'CONTACTS_WRITE':
                    output = await executeContactsWrite(node.config as any, this.variableManager);
                    break;

                // Calendar
                case 'CALENDAR_READ':
                    output = await executeCalendarRead(node.config as any, this.variableManager);
                    break;
                case 'CALENDAR_CREATE':
                    output = await executeCalendarCreate(node.config as any, this.variableManager);
                    break;
                case 'CALENDAR_UPDATE':
                    output = await executeCalendarUpdate(node.config as any, this.variableManager);
                    break;
                case 'CALENDAR_DELETE':
                    output = await executeCalendarDelete(node.config as any, this.variableManager);
                    break;

                // Location
                case 'LOCATION_GET':
                    output = await executeLocationGet(node.config as any, this.variableManager);
                    break;
                case 'GEOFENCE_CREATE':
                    output = await executeGeofenceCreate(node.config as any, this.variableManager);
                    break;
                case 'GEOFENCE_ENTER_TRIGGER':
                    // This is a trigger node, handled in trigger section
                    output = { success: true, message: 'Geofence enter trigger registered' };
                    break;
                case 'GEOFENCE_EXIT_TRIGGER':
                    // This is a trigger node, handled in trigger section
                    output = { success: true, message: 'Geofence exit trigger registered' };
                    break;
                case 'WEATHER_GET':
                    output = await executeWeatherGet(node.config as any, this.variableManager);
                    break;

                // State
                case 'BATTERY_CHECK':
                    output = await executeBatteryCheck(node.config as any, this.variableManager);
                    break;
                case 'NETWORK_CHECK':
                    output = await executeNetworkCheck(node.config as any, this.variableManager);
                    break;

                // Audio
                case 'VOLUME_CONTROL':
                    output = await executeVolumeControl(node.config as any, this.variableManager);
                    break;
                case 'SPEAK_TEXT':
                    output = await executeSpeakText(node.config as any, this.variableManager);
                    break;
                case 'AUDIO_RECORD':
                    output = await executeAudioRecord(node.config as any, this.variableManager);
                    break;
                case 'SPEECH_TO_TEXT':
                    output = await executeSpeechToText(node.config as any, this.variableManager);
                    break;

                // Communication
                case 'SMS_SEND':
                    output = await executeSmsSend(node.config as any, this.variableManager);
                    break;
                case 'EMAIL_SEND':
                    output = await executeEmailSend(node.config as any, this.variableManager);
                    break;
                case 'WHATSAPP_SEND':
                    output = await executeWhatsAppSend(node.config as any, this.variableManager);
                    break;
                case 'TELEGRAM_SEND':
                    output = await executeTelegramSend(node.config as any, this.variableManager);
                    break;
                case 'SLACK_SEND':
                    output = await executeSlackSend(node.config as any, this.variableManager);
                    break;
                case 'DISCORD_SEND':
                    output = await executeDiscordSend(node.config as any, this.variableManager);
                    break;
                case 'GOOGLE_TRANSLATE':
                    output = await executeGoogleTranslate(node.config as any, this.variableManager);
                    break;

                // Productivity
                case 'NOTION_CREATE':
                    output = await executeNotionCreate(node.config as any, this.variableManager);
                    break;
                case 'NOTION_READ':
                    output = await executeNotionRead(node.config as any, this.variableManager);
                    break;

                // Smart Home
                case 'PHILIPS_HUE':
                    output = await executePhilipsHue(node.config as any, this.variableManager);
                    break;

                // Memory
                case 'REMEMBER_INFO':
                    output = await executeRememberInfo(node.config as any, this.variableManager);
                    break;

                // Navigation
                case 'NAVIGATE_TO':
                    output = await executeNavigateTo(node.config as any, this.variableManager);
                    break;
                case 'SETTINGS_OPEN':
                    output = await executeSettingsOpen(node.config as any, this.variableManager);
                    break;

                // Database
                case 'DB_READ':
                    output = await executeDatabaseRead(node.config as any, this.variableManager);
                    break;
                case 'DB_WRITE':
                    output = await executeDatabaseWrite(node.config as any, this.variableManager);
                    break;

                // Web
                // Web
                case 'HTTP_REQUEST':
                    // @ts-ignore - Pass signal
                    output = await executeHttpRequest(node.config as any, this.variableManager, this.abortController.signal);
                    break;
                case 'OPEN_URL':
                    output = await executeOpenUrl(node.config as any, this.variableManager);
                    break;
                case 'WEB_AUTOMATION':
                    output = await executeWebAutomation(node.config as any, this.variableManager);
                    break;
                case 'WEB_SEARCH':
                    output = await executeWebSearch(node.config as any, this.variableManager);
                    break;
                case 'FACEBOOK_LOGIN':
                    output = await executeFacebookLogin(node.config as any, this.variableManager);
                    break;
                case 'INSTAGRAM_POST':
                    output = await executeInstagramPost(node.config as any, this.variableManager);
                    break;
                case 'RSS_READ':
                    output = await executeRssRead(node.config as any, this.variableManager);
                    break;
                case 'HTML_EXTRACT':
                    output = await executeHtmlExtract(node, this.variableManager);
                    break;

                // Files
                case 'FILE_WRITE':
                    output = await executeFileWrite(node.config as any, this.variableManager);
                    break;
                case 'FILE_READ':
                    output = await executeFileRead(node.config as any, this.variableManager);
                    break;
                case 'PDF_CREATE':
                    output = await executePdfCreate(node.config as any, this.variableManager);
                    break;
                case 'FILE_PICK':
                    output = await executeFilePick(node.config as any, this.variableManager);
                    break;
                case 'VIEW_UDF':
                    output = await executeViewUdf(node.config as any, this.variableManager);
                    break;
                case 'VIEW_DOCUMENT':
                    output = await executeViewDocument(node.config as any, this.variableManager);
                    break;
                case 'APP_LAUNCH':
                    output = await executeAppLaunch(node, this.variableManager);
                    break;

                case 'ALARM_SET':
                    output = await executeAlarmSet(node.config as any, this.variableManager);
                    break;

                // AI
                case 'AGENT_AI':
                    // @ts-ignore - Pass signal
                    output = await executeAgentAI(
                        node.config as any,
                        this.variableManager,
                        this.abortController.signal,
                        this.executeTool.bind(this) // Pass tool executor
                    );
                    break;
                case 'REALTIME_AI':
                    output = await executeRealtimeAI(
                        node.config as any,
                        this.variableManager,
                        this.abortController.signal,
                        this.executeTool.bind(this)
                    );
                    break;
                case 'IMAGE_GENERATOR':
                    output = await executeImageGenerator(node, this.variableManager);
                    break;
                case 'IMAGE_EDIT':
                    output = await executeImageEdit(node.config as any, this.variableManager);
                    break;

                // Google
                case 'GMAIL_SEND':
                    output = await executeGmailSend(node.config as any, this.variableManager);
                    break;
                case 'GMAIL_READ':
                    output = await executeGmailRead(node.config as any, this.variableManager);
                    break;
                case 'SHEETS_READ':
                    output = await executeGoogleSheetsRead(node.config as any, this.variableManager);
                    break;
                case 'SHEETS_WRITE':
                    output = await executeGoogleSheetsWrite(node.config as any, this.variableManager);
                    break;
                case 'DRIVE_UPLOAD':
                    output = await executeGoogleDriveUpload(node.config as any, this.variableManager);
                    break;

                // Microsoft
                case 'OUTLOOK_SEND':
                    output = await executeOutlookSend(node.config as any, this.variableManager);
                    break;
                case 'OUTLOOK_READ':
                    output = await executeOutlookRead(node.config as any, this.variableManager);
                    break;
                case 'EXCEL_READ':
                    output = await executeExcelRead(node.config as any, this.variableManager);
                    break;
                case 'EXCEL_WRITE':
                    output = await executeExcelWrite(node.config as any, this.variableManager);
                    break;
                case 'ONEDRIVE_UPLOAD':
                    output = await executeOneDriveUpload(node.config as any, this.variableManager);
                    break;
                case 'ONEDRIVE_DOWNLOAD':
                    output = await executeOneDriveDownload(node.config as any, this.variableManager);
                    break;
                case 'ONEDRIVE_LIST':
                    output = await executeOneDriveList(node.config as any, this.variableManager);
                    break;

                // Sensors
                case 'LIGHT_SENSOR':
                    output = await executeLightSensor(node, this.variableManager);
                    break;
                case 'PEDOMETER':
                    output = await executePedometer(node, this.variableManager);
                    break;
                case 'MAGNETOMETER':
                    output = await executeMagnetometer(node, this.variableManager);
                    break;
                case 'BAROMETER':
                    output = await executeBarometer(node, this.variableManager);
                    break;
                case 'GESTURE_TRIGGER':
                    output = await executeGestureTrigger(node, this.variableManager);
                    break;

                // Camera
                case 'CAMERA_CAPTURE':
                    output = await executeCameraCapture(node, this.variableManager);
                    break;

                // FLOATING OVERLAY
                case 'SHOW_OVERLAY':
                    const { executeShowOverlay } = require('./nodes/overlay');
                    output = await executeShowOverlay(node, this.variableManager);
                    break;
                case 'OVERLAY_INPUT':
                    const { executeOverlayInput } = require('./nodes/overlay');
                    output = await executeOverlayInput(node, this.variableManager);
                    break;
                case 'OVERLAY_CLEAR':
                    const { executeOverlayClear } = require('./nodes/overlay');
                    output = await executeOverlayClear(node, this.variableManager);
                    break;

                // --- VECTOR MEMORY (RAG) ---
                case 'SEARCH_MEMORY':
                    output = await executeSearchMemory(node.config as any, this.variableManager);
                    break;
                case 'ADD_TO_MEMORY':
                    output = await executeAddToMemory(node.config as any, this.variableManager);
                    break;
                case 'BULK_ADD_TO_MEMORY':
                    output = await executeBulkAddToMemory(node.config as any, this.variableManager);
                    break;
                case 'CLEAR_MEMORY':
                    output = await executeClearMemory(node.config as any, this.variableManager);
                    break;
                case 'REMEMBER_INFO':
                    output = await executeRememberInfo(node.config as any, this.variableManager);
                    break;

                // Backend Services
                case 'BROWSER_SCRAPE':
                    output = await executeBrowserScrape(node.config as any, this.variableManager);
                    break;
                case 'CRON_CREATE':
                    output = await executeCronCreate(node.config as any, this.variableManager);
                    break;
                case 'CRON_DELETE':
                    const { executeCronDelete } = require('./nodes/backend');
                    output = await executeCronDelete(node.config as any, this.variableManager);
                    break;
                case 'CRON_LIST':
                    const { executeCronList } = require('./nodes/backend');
                    output = await executeCronList(node.config as any, this.variableManager);
                    break;

                default:
                    console.warn(`Unknown node type: ${node.type}`);
            }

            // Check if executor returned explicit failure (e.g. cancelled input)
            if (output && typeof output === 'object' && output.success === false) {
                const errorMsg = output.error || 'Node execution returned failure';
                debugLog('execution', `Node explicit failure: ${node.label} `, { nodeId: node.id, output, error: errorMsg });

                return {
                    nodeId: node.id,
                    success: false,
                    output,
                    error: errorMsg,
                    duration: Date.now() - startTime,
                    nextPort: 'error',
                };
            }

            debugLog('execution', `Node Complete: ${node.label} `, { nodeId: node.id, output, duration: Date.now() - startTime, nextPort });

            return {
                nodeId: node.id,
                success: true,
                output,
                duration: Date.now() - startTime,
                nextPort,
            };
        } catch (error) {
            debugLog('error', `Node Execution Failed: ${node.label} `, { nodeId: node.id, error: error instanceof Error ? error.message : String(error) }, error);

            return {
                nodeId: node.id,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime,
                nextPort: 'error',
            };
        }
    }

    private async executeDelay(config: DelayConfig): Promise<void> {
        let durationMs = config.duration;

        switch (config.unit) {
            case 'sec':
                durationMs *= 1000;
                break;
            case 'min':
                durationMs *= 60 * 1000;
                break;
            case 'hour':
                durationMs *= 60 * 60 * 1000;
                break;
        }

        // Check cancellation periodically during long delays
        const checkInterval = 100; // Check every 100ms
        let elapsed = 0;

        while (elapsed < durationMs && !this.isCancelled) {
            const sleepTime = Math.min(checkInterval, durationMs - elapsed);
            await new Promise(resolve => setTimeout(resolve, sleepTime));
            elapsed += sleepTime;
        }
    }

    private executeVariable(config: VariableConfig): any {
        switch (config.operation) {
            case 'set':
                this.variableManager.set(config.name, config.value);
                return { name: config.name, value: config.value };
            case 'get':
                return { name: config.name, value: this.variableManager.get(config.name) };
            case 'increment':
                const incValue = this.variableManager.increment(config.name, Number(config.value) || 1);
                return { name: config.name, value: incValue };
            case 'decrement':
                const decValue = this.variableManager.decrement(config.name, Number(config.value) || 1);
                return { name: config.name, value: decValue };
            case 'append':
                const appendValue = this.variableManager.append(config.name, String(config.value));
                return { name: config.name, value: appendValue };
            case 'clear':
                this.variableManager.delete(config.name);
                return { name: config.name, cleared: true };
            default:
                return null;
        }
    }

    private async executeLoop(node: WorkflowNode): Promise<{ continue: boolean; iteration?: number; currentItem?: any }> {
        const config = node.config as LoopConfig;

        // Initialize loop if first time
        if (!this.loopController['loopStates'].has(node.id)) {
            this.loopController.initLoop(node.id, config, this.variableManager);
        }

        // Check if should continue
        if (!this.loopController.shouldContinue(node.id, config, this.conditionEvaluator)) {
            this.loopController.cleanupLoop(node.id);
            return { continue: false };
        }

        // Get next iteration
        const { iteration, currentItem } = this.loopController.nextIteration(node.id);

        // Set loop variables
        this.variableManager.set('_loopIndex', iteration);
        if (currentItem !== undefined) {
            this.variableManager.set('_loopItem', currentItem);
        }

        return { continue: true, iteration, currentItem };
    }

    private async executeSplitBatches(node: WorkflowNode): Promise<any> {
        const config = node.config as SplitBatchesConfig;

        // Check if we need to initialize or get next batch
        // We can check if batch state exists for this node
        let result = this.batchController.nextBatch(node.id);

        if (!result) {
            // If no active batch, try to init
            const initialized = this.batchController.initBatch(node.id, config, this.variableManager);
            if (!initialized) {
                // Empty array or invalid input, finish immediately
                return { nextPort: 'done', success: true };
            }
            // Get first batch
            result = this.batchController.nextBatch(node.id);
        }

        if (result) {
            // Set variables for usage in loop
            // n8n standard: return items
            // We set a specific variable for easy access

            // Set current batch items
            this.variableManager.set('currentBatch', result.items);

            // Set metadata
            this.variableManager.set('batchIndex', result.total - result.remaining);
            this.variableManager.set('batchTotal', result.total);
            this.variableManager.set('batchRemaining', result.remaining);

            return {
                success: true,
                nextPort: 'loop',
                output: {
                    items: result.items,
                    remaining: result.remaining
                }
            };
        } else {
            // Finished
            return { nextPort: 'done', success: true };
        }
    }

    getVariableManager(): VariableManager {
        return this.variableManager;
    }

    // ═══════════════════════════════════════════════════════════════
    // TOOL EXECUTOR FOR AGENT
    // ═══════════════════════════════════════════════════════════════

    private async executeTool(toolName: string, args: any): Promise<any> {
        debugLog('execution', `Agent requested tool: ${toolName} `, { args });

        // 1. Find Tool Definition
        const toolDef = getToolByName(toolName);
        if (!toolDef) {
            throw new Error(`Tool '${toolName}' not found in registry.`);
        }

        // 2. Map to Node Type and Executor
        // We create a "Virtual Node" config to reuse existing node executors
        const nodeType = toolDef.nodeType;
        let result: any;

        try {
            switch (nodeType) {
                case 'CALENDAR_READ':
                    // Map Agent's parameters to CalendarReadConfig
                    const calendarReadConfig = {
                        type: args.type || 'next', // 'today', 'next', 'week'
                        maxEvents: args.maxEvents || 5,
                        calendarName: args.calendarName || undefined,
                        calendarSource: args.calendarSource || undefined,
                        variableName: 'calendar_events' // Temp variable
                    };
                    result = await executeCalendarRead(calendarReadConfig, this.variableManager);
                    break;
                case 'CALENDAR_CREATE':
                    const calendarCreateConfig = {
                        title: args.title,
                        startDate: args.startDate,
                        endDate: args.endDate,
                        notes: args.notes,
                        location: args.location,
                        calendarName: args.calendarName || undefined,
                        variableName: 'created_event' // Temp variable
                    };
                    result = await executeCalendarCreate(calendarCreateConfig, this.variableManager);
                    break;
                case 'GMAIL_SEND':
                    // Check if user prefers Outlook? For now specific tool.
                    result = await executeGmailSend(args, this.variableManager);
                    break;
                case 'GMAIL_READ':
                    result = await executeGmailRead(args, this.variableManager);
                    break;
                case 'SMS_SEND':
                    result = await executeSmsSend(args, this.variableManager);
                    break;
                case 'FLASHLIGHT_CONTROL':
                    result = await executeDeviceNode({ type: 'FLASHLIGHT_CONTROL', config: args } as any, this.variableManager);
                    break;
                case 'BRIGHTNESS_CONTROL':
                    result = await executeDeviceNode({ type: 'BRIGHTNESS_CONTROL', config: args } as any, this.variableManager);
                    break;
                case 'VOLUME_CONTROL':
                    result = await executeVolumeControl(args, this.variableManager);
                    break;
                case 'BATTERY_CHECK':
                    result = await executeBatteryCheck(args, this.variableManager);
                    break;
                case 'APP_LAUNCH':
                    // Use apps.ts executeAppLaunch which uses URL schemes (youtube://) 
                    // Not devices.ts version which requires packageName
                    result = await executeAppLaunch({ config: args } as any, this.variableManager);
                    break;
                case 'LOCATION_GET':
                    result = await executeLocationGet(args, this.variableManager);
                    break;
                case 'WEATHER_GET':
                    result = await executeWeatherGet(args, this.variableManager);
                    break;
                case 'OPEN_URL':
                    // Special case for 'search_web' tool which maps to OPEN_URL but might need query handling
                    let url = args.url;
                    if (!url && args.query) {
                        url = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
                    }
                    // Special case for 'open_uyap' tool
                    if (toolName === 'open_uyap') {
                        if (args.portal === 'vatandas') {
                            url = 'https://vatandas.uyap.gov.tr/main/vatandas/giris.jsp';
                        } else {
                            url = 'https://avukat.uyap.gov.tr/';
                        }
                    }
                    result = await executeOpenUrl({ url }, this.variableManager);
                    break;
                case 'WHATSAPP_SEND':
                    // Implement WhatsApp send using Linking
                    // We don't have a separate executeWhatsAppSend yet, so we'll inline it or reuse OPEN_URL/Linking
                    // Actually, let's use a dynamic import or assuming an executor exists (we will create one or use Linking here)
                    const { Linking } = require('react-native');
                    const whatsappUrl = `whatsapp://send?phone=${args.phoneNumber}&text=${encodeURIComponent(args.message || '')}`;
                    await Linking.openURL(whatsappUrl);
                    result = { success: true, sent: true };
                    break;
                case 'VIEW_UDF':
                    result = await executeViewUdf(args, this.variableManager);
                    break;

                case 'DB_WRITE':
                    result = await executeDatabaseWrite({ config: args } as any, this.variableManager);
                    break;
                case 'DB_READ':
                    result = await executeDatabaseRead({ config: args } as any, this.variableManager);
                    break;

                // --- VECTOR MEMORY (RAG) ---
                case 'SEARCH_MEMORY':
                    result = await executeSearchMemory(args, this.variableManager);
                    break;
                case 'ADD_TO_MEMORY':
                    result = await executeAddToMemory(args, this.variableManager);
                    break;
                case 'BULK_ADD_TO_MEMORY':
                    result = await executeBulkAddToMemory(args, this.variableManager);
                    break;
                case 'CLEAR_MEMORY':
                    result = await executeClearMemory(args, this.variableManager);
                    break;
                case 'REMEMBER_INFO':
                    result = await executeRememberInfo(args, this.variableManager);
                    break;

                // --- OUTPUT / DISPLAY ---
                case 'SPEAK_TEXT':
                    result = await executeSpeakText(args, this.variableManager);
                    break;
                case 'SHOW_TEXT':
                    result = await executeShowText(args, this.variableManager);
                    break;
                case 'SHOW_IMAGE':
                    // Map Agent's 'imageUri' to 'imageSource' expected by config
                    result = await executeShowImage({
                        title: args.title,
                        imageSource: args.imageUri || args.imageSource
                    } as any, this.variableManager);
                    break;
                case 'NOTIFICATION':
                    result = await executeNotification(args, this.variableManager);
                    break;
                case 'SHARE_SHEET':
                    result = await executeOutputNode({ type: 'SHARE_SHEET', config: args } as any, this.variableManager);
                    break;

                // --- DEVICE CONTROL (Extended) ---
                case 'ALARM_SET':
                    result = await executeAlarmSet(args, this.variableManager);
                    break;
                case 'DND_CONTROL':
                    result = await executeDeviceNode({ type: 'DND_CONTROL', config: args } as any, this.variableManager);
                    break;
                case 'SOUND_MODE':
                    result = await executeDeviceNode({ type: 'SOUND_MODE', config: args } as any, this.variableManager);
                    break;
                case 'SCREEN_WAKE':
                    result = await executeDeviceNode({ type: 'SCREEN_WAKE', config: args } as any, this.variableManager);
                    break;
                case 'MEDIA_CONTROL':
                    result = await executeDeviceNode({ type: 'MEDIA_CONTROL', config: args } as any, this.variableManager);
                    break;

                // --- STATE / SENSORS ---
                case 'NETWORK_CHECK':
                    result = await executeNetworkCheck(args, this.variableManager);
                    break;
                case 'LIGHT_SENSOR':
                case 'PEDOMETER':
                case 'BAROMETER':
                case 'MAGNETOMETER':
                    // Generic sensor reading (returns context data)
                    const contextService = require('./ContextService').contextService;
                    const context = await contextService.getContext();
                    result = { success: true, sensors: context.sensors };
                    break;
                case 'GEOFENCE_CREATE':
                    result = await executeGeofenceCreate(args as any, this.variableManager);
                    break;

                // --- FILES ---
                case 'FILE_READ':
                    result = await executeFileRead(args, this.variableManager);
                    break;
                case 'FILE_WRITE':
                    result = await executeFileWrite(args, this.variableManager);
                    break;
                case 'FILE_PICK':
                    result = await executeFilePick(args, this.variableManager);
                    break;
                case 'PDF_CREATE':
                    result = await executePdfCreate(args, this.variableManager);
                    break;

                // --- CLIPBOARD ---
                case 'CLIPBOARD_READER':
                    const Clipboard = require('expo-clipboard');
                    const clipboardContent = await Clipboard.getStringAsync();
                    result = { success: true, content: clipboardContent };
                    break;

                // --- WEB / TRANSLATION ---
                case 'GOOGLE_TRANSLATE':
                    result = await executeGoogleTranslate(args, this.variableManager);
                    break;
                case 'HTTP_REQUEST':
                    result = await executeHttpRequest(args, this.variableManager);
                    break;
                case 'RSS_READ':
                    result = await executeRssRead(args, this.variableManager);
                    break;
                case 'WEB_AUTOMATION':
                    result = await executeWebAutomation({ config: args } as any, this.variableManager);
                    break;
                case 'WEB_SEARCH':
                    result = await executeWebSearch({ query: args.query } as any, this.variableManager);
                    break;

                // --- COMMUNICATION (Extended) ---
                case 'TELEGRAM_SEND':
                    result = await executeTelegramSend(args, this.variableManager);
                    break;
                case 'SLACK_SEND':
                    result = await executeSlackSend(args, this.variableManager);
                    break;
                case 'DISCORD_SEND':
                    result = await executeDiscordSend(args, this.variableManager);
                    break;
                case 'NOTION_CREATE':
                    result = await executeNotionCreate(args, this.variableManager);
                    break;
                case 'NOTION_READ':
                    result = await executeNotionRead(args, this.variableManager);
                    break;
                case 'FACEBOOK_LOGIN':
                    result = await executeFacebookLogin(args as any, this.variableManager);
                    break;
                case 'INSTAGRAM_POST':
                    result = await executeInstagramPost(args as any, this.variableManager);
                    break;

                // --- INPUT (Interactive) ---
                case 'TEXT_INPUT':
                    result = await executeTextInput(args, this.variableManager);
                    break;
                case 'SHOW_MENU':
                    result = await executeShowMenu(args, this.variableManager);
                    break;
                case 'SPEECH_TO_TEXT':
                    result = await executeSpeechToText(args, this.variableManager);
                    break;

                // --- VARIABLE ---
                case 'VARIABLE':
                    this.variableManager.set(args.name, args.value);
                    result = { success: true, variableName: args.name, value: args.value };
                    break;

                // --- DELAY ---
                case 'DELAY':
                    const delayMs = (args.seconds || 1) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    result = { success: true, delayed: args.seconds };
                    break;

                // --- GOOGLE SHEETS / DRIVE ---
                case 'SHEETS_READ':
                    result = await executeGoogleSheetsRead(args as any, this.variableManager);
                    break;
                case 'SHEETS_WRITE':
                    result = await executeGoogleSheetsWrite(args as any, this.variableManager);
                    break;
                case 'DRIVE_UPLOAD':
                    result = await executeGoogleDriveUpload(args as any, this.variableManager);
                    break;

                // --- OFFICE / OUTLOOK / EXCEL ---
                case 'OUTLOOK_SEND':
                    result = await executeOutlookSend(args as any, this.variableManager);
                    break;
                case 'OUTLOOK_READ':
                    result = await executeOutlookRead(args as any, this.variableManager);
                    break;
                case 'EXCEL_READ':
                    result = await executeExcelRead(args as any, this.variableManager);
                    break;
                case 'EXCEL_WRITE':
                    result = await executeExcelWrite(args as any, this.variableManager);
                    break;

                // --- ONEDRIVE ---
                case 'ONEDRIVE_UPLOAD':
                    result = await executeOneDriveUpload(args as any, this.variableManager);
                    break;
                case 'ONEDRIVE_DOWNLOAD':
                    result = await executeOneDriveDownload(args as any, this.variableManager);
                    break;
                case 'ONEDRIVE_LIST':
                    result = await executeOneDriveList(args as any, this.variableManager);
                    break;

                // --- CALENDAR ---
                case 'CALENDAR_DELETE':
                    result = await executeCalendarDelete(args as any, this.variableManager);
                    break;
                case 'CALENDAR_UPDATE':
                    result = await executeCalendarUpdate(args as any, this.variableManager);
                    break;

                // --- CONTACTS ---
                case 'CONTACTS_READ':
                    result = await executeContactsRead({ config: args } as any, this.variableManager);
                    break;
                case 'CONTACTS_WRITE':
                    result = await executeContactsWrite({ config: args } as any, this.variableManager);
                    break;

                // --- AUDIO / RECORDING ---
                case 'AUDIO_RECORD':
                    result = await executeAudioRecord(args as any, this.variableManager);
                    break;

                // --- IMAGE ---
                case 'IMAGE_GENERATOR':
                    result = await executeImageGenerator({ config: args } as any, this.variableManager);
                    break;
                case 'IMAGE_EDIT':
                    // Need to construct a pseudo-node config because executeImageEdit expects full node config structure usually?
                    // Let's check imports. executeImageEdit matches node.config signature usually.
                    result = await executeImageEdit(args as any, this.variableManager);
                    break;

                // --- APPS ---
                case 'APP_LAUNCH':
                    result = await executeAppLaunch({ config: args } as any, this.variableManager);
                    break;

                // --- SENSORS ---
                case 'GESTURE_TRIGGER':
                    result = await executeGestureTrigger({ config: args } as any, this.variableManager);
                    break;
                case 'LIGHT_SENSOR':
                    result = await executeLightSensor({ config: args } as any, this.variableManager);
                    break;
                case 'PEDOMETER':
                    result = await executePedometer({ config: args } as any, this.variableManager);
                    break;
                case 'MAGNETOMETER':
                    result = await executeMagnetometer({ config: args } as any, this.variableManager);
                    break;
                case 'BAROMETER':
                    result = await executeBarometer({ config: args } as any, this.variableManager);
                    break;

                // --- VECTOR MEMORY (RAG) ---
                case 'SEARCH_MEMORY':
                    result = await executeSearchMemory(args, this.variableManager);
                    break;
                case 'ADD_TO_MEMORY':
                    result = await executeAddToMemory(args, this.variableManager);
                    break;
                case 'BULK_ADD_TO_MEMORY':
                    result = await executeBulkAddToMemory(args, this.variableManager);
                    break;
                case 'CLEAR_MEMORY':
                    result = await executeClearMemory(args, this.variableManager);
                    break;

                default:
                    throw new Error(`Executor for tool type '${nodeType}' not implemented yet.`);
            }

            return result;

        } catch (err: any) {
            console.error(`Tool execution failed (${toolName}):`, err);
            throw new Error(`Action failed: ${err.message}`);
        }
    }
}

// Singleton instance
export const workflowEngine = WorkflowEngine.getInstance();
