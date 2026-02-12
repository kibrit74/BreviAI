/**
 * Workflow Store - Zustand-based global state management
 * Replaces prop drilling for workflow state
 */

import { create } from 'zustand';
import {
    Workflow,
    WorkflowNode,
    WorkflowEdge,
    NodeType,
    EdgePort,
    createWorkflow,
    createNode,
    createEdge,
} from '../types/workflow-types';
import { WorkflowStorage } from './WorkflowStorage';

interface WorkflowState {
    // State
    workflow: Workflow;
    selectedNodeId: string | null;
    isExecuting: boolean;
    hasChanges: boolean;

    // Actions - Workflow
    setWorkflow: (workflow: Workflow) => void;
    resetWorkflow: (name?: string) => void;
    loadWorkflow: (id: string) => Promise<boolean>;
    saveWorkflow: () => Promise<void>;

    // Actions - Nodes
    addNode: (type: NodeType, position?: { x: number; y: number }) => WorkflowNode;
    updateNode: (node: WorkflowNode) => void;
    deleteNode: (nodeId: string) => void;
    selectNode: (nodeId: string | null) => void;
    moveNode: (nodeId: string, dx: number, dy: number) => void;

    // Actions - Edges
    addEdge: (sourceNodeId: string, targetNodeId: string, sourcePort: EdgePort) => void;
    deleteEdge: (edgeId: string) => void;

    // Actions - Execution
    setExecuting: (executing: boolean) => void;
}

const GRID_SIZE = 20;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
    // Initial State
    workflow: createWorkflow('Yeni Workflow'),
    selectedNodeId: null,
    isExecuting: false,
    hasChanges: false,

    // Actions - Workflow
    setWorkflow: (workflow) => set({ workflow, hasChanges: true }),

    resetWorkflow: (name = 'Yeni Workflow') => set({
        workflow: createWorkflow(name),
        selectedNodeId: null,
        hasChanges: false,
    }),

    loadWorkflow: async (id) => {
        const existing = await WorkflowStorage.getById(id);
        if (existing) {
            set({ workflow: existing, selectedNodeId: null, hasChanges: false });
            return true;
        }
        return false;
    },

    saveWorkflow: async () => {
        const { workflow } = get();
        await WorkflowStorage.save(workflow);
        set({ hasChanges: false });
    },

    // Actions - Nodes
    addNode: (type, position) => {
        const { workflow } = get();
        const defaultPos = position || {
            x: 100,
            y: 100 + workflow.nodes.length * 100
        };
        const newNode = createNode(type, defaultPos);
        set({
            workflow: {
                ...workflow,
                nodes: [...workflow.nodes, newNode],
            },
            hasChanges: true,
        });
        return newNode;
    },

    updateNode: (updatedNode) => {
        const { workflow } = get();
        set({
            workflow: {
                ...workflow,
                nodes: workflow.nodes.map(n =>
                    n.id === updatedNode.id ? updatedNode : n
                ),
            },
            selectedNodeId: null,
            hasChanges: true,
        });
    },

    deleteNode: (nodeId) => {
        const { workflow, selectedNodeId } = get();
        set({
            workflow: {
                ...workflow,
                nodes: workflow.nodes.filter(n => n.id !== nodeId),
                edges: workflow.edges.filter(
                    e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
                ),
            },
            selectedNodeId: selectedNodeId === nodeId ? null : selectedNodeId,
            hasChanges: true,
        });
    },

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

    moveNode: (nodeId, dx, dy) => {
        const { workflow } = get();
        set({
            workflow: {
                ...workflow,
                nodes: workflow.nodes.map(node => {
                    if (node.id === nodeId) {
                        return {
                            ...node,
                            position: {
                                x: Math.round((node.position.x + dx) / GRID_SIZE) * GRID_SIZE,
                                y: Math.round((node.position.y + dy) / GRID_SIZE) * GRID_SIZE,
                            },
                        };
                    }
                    return node;
                }),
            },
            hasChanges: true,
        });
    },

    // Actions - Edges
    addEdge: (sourceNodeId, targetNodeId, sourcePort) => {
        const { workflow } = get();
        const exists = workflow.edges.some(
            e => e.sourceNodeId === sourceNodeId &&
                e.targetNodeId === targetNodeId &&
                e.sourcePort === sourcePort
        );
        if (exists) return;

        const newEdge = createEdge(sourceNodeId, targetNodeId, sourcePort);
        set({
            workflow: {
                ...workflow,
                edges: [...workflow.edges, newEdge],
            },
            hasChanges: true,
        });
    },

    deleteEdge: (edgeId) => {
        const { workflow } = get();
        set({
            workflow: {
                ...workflow,
                edges: workflow.edges.filter(e => e.id !== edgeId),
            },
            hasChanges: true,
        });
    },

    // Actions - Execution
    setExecuting: (executing) => set({ isExecuting: executing }),
}));

// Selector hooks for optimized re-renders
export const useWorkflow = () => useWorkflowStore(state => state.workflow);
export const useSelectedNodeId = () => useWorkflowStore(state => state.selectedNodeId);
export const useSelectedNode = () => useWorkflowStore(state =>
    state.workflow.nodes.find(n => n.id === state.selectedNodeId) || null
);
export const useIsExecuting = () => useWorkflowStore(state => state.isExecuting);
export const useHasChanges = () => useWorkflowStore(state => state.hasChanges);
