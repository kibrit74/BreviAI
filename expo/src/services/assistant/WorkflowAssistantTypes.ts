import { AIProvider } from '../UserSettingsService';
import { Workflow } from '../../types/workflow-types';
import { ExecutionLogEntry } from '../ExecutionLogger';

export interface AssistantModelInfo {
    id: string;
    label: string;
}

export interface AssistantRoutingResult {
    provider: AIProvider;
    apiKey: string;
    model: AssistantModelInfo;
}

export type AssistantPatchChangeType =
    | 'update_node_config'
    | 'update_node_type'
    | 'update_node_label'
    | 'replace_text_template'
    | 'add_edge'
    | 'remove_edge';

export interface AssistantPatchChange {
    type: AssistantPatchChangeType;
    nodeId?: string;
    edgeId?: string;
    sourceNodeId?: string;
    targetNodeId?: string;
    sourcePort?: string;
    path?: string;
    oldValue?: any;
    newValue?: any;
}

export interface AssistantFixSuggestion {
    title: string;
    why: string;
    changes: AssistantPatchChange[];
}

export interface AssistantResponse {
    beginnerExplanation: string;
    intermediateExplanation: string;
    suggestions: AssistantFixSuggestion[];
    safetyNotes: string[];
    provider: AIProvider;
    model: string;
    rawText?: string;
}

export interface WorkflowAssistantRequest {
    workflow: Workflow;
    latestError?: ExecutionLogEntry | null;
    userMessage: string;
}
