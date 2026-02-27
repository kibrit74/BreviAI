import { Workflow, WorkflowNode, createEdge, EdgePort, createNode } from '../../types/workflow-types';
import { AssistantPatchChange } from './WorkflowAssistantTypes';
import { normalizeNodeType } from './NodeTypeResolver';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const FORBIDDEN_PATH_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_PATCH_PATH_DEPTH = 8;

const isPlainObject = (value: unknown): value is Record<string, any> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const getNodeById = (workflow: Workflow, nodeId?: string): WorkflowNode | undefined => {
    if (!nodeId) return undefined;
    return workflow.nodes.find(node => node.id === nodeId);
};

const splitPath = (path: string): string[] =>
    String(path || '')
        .split('.')
        .map((part) => part.trim())
        .filter(Boolean);

const isSafePath = (path: string): boolean => {
    const parts = splitPath(path);
    if (!parts.length || parts.length > MAX_PATCH_PATH_DEPTH) return false;
    return parts.every((part) => /^[A-Za-z0-9_]+$/.test(part) && !FORBIDDEN_PATH_KEYS.has(part));
};

const getByPath = (target: any, path: string): any => {
    const parts = splitPath(path);
    let cursor = target;
    for (const part of parts) {
        if (!cursor || typeof cursor !== 'object') return undefined;
        cursor = cursor[part];
    }
    return cursor;
};

const setByPath = (target: any, path: string, value: any): boolean => {
    if (!isSafePath(path)) return false;
    const parts = splitPath(path);
    if (!parts.length) return false;

    let cursor = target;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!isPlainObject(cursor[key])) {
            cursor[key] = {};
        }
        cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = value;
    return true;
};

const normalizePosition = (
    value: any,
    index: number
): { x: number; y: number } => {
    const x = Number(value?.x);
    const y = Number(value?.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x, y };
    }
    return { x: 120, y: 120 + index * 120 };
};

const ensureMcpConfig = (node: WorkflowNode, toolName?: string) => {
    const configObj: any = isPlainObject(node.config) ? clone(node.config as any) : {};
    const cleanToolName = String(toolName || configObj.toolName || '').trim();
    const params = isPlainObject(configObj.params) ? configObj.params : {};
    node.config = {
        ...configObj,
        toolName: cleanToolName,
        params,
        variableName: configObj.variableName || 'mcpResult',
    } as any;
};

class WorkflowPatchService {
    applyChanges(workflow: Workflow, changes: AssistantPatchChange[]): Workflow {
        const next = clone(workflow);

        for (const change of changes) {
            if (change.type === 'update_node_config') {
                const node = getNodeById(next, change.nodeId);
                if (!node || !change.path) continue;
                if (!isSafePath(change.path)) continue;

                const configObj = isPlainObject(node.config) ? clone(node.config) : {};
                if (!setByPath(configObj, change.path, change.newValue)) continue;
                node.config = configObj as any;
                continue;
            }

            if (change.type === 'update_node_type') {
                const node = getNodeById(next, change.nodeId);
                if (!node) continue;

                const previousType = String((node as any).type || '').trim();
                const nextType = normalizeNodeType(change.newValue);
                if (!nextType) continue;

                node.type = nextType as any;
                if (nextType === 'MCP_TOOL' && previousType.startsWith('breviai.')) {
                    ensureMcpConfig(node, previousType);
                }
                continue;
            }

            if (change.type === 'add_node') {
                const payload = isPlainObject(change.newValue) ? clone(change.newValue) : {};
                const resolvedType = normalizeNodeType(
                    payload.type || payload.nodeType || change.nodeType || change.newValue
                );
                if (!resolvedType) continue;

                const position = normalizePosition(payload.position || change.position, next.nodes.length);
                const config = isPlainObject(payload.config) ? clone(payload.config) : {};
                const node = createNode(resolvedType, position, config);

                const requestedId = String(change.nodeId || payload.id || '').trim();
                if (requestedId) {
                    if (next.nodes.some(existing => existing.id === requestedId)) continue;
                    node.id = requestedId;
                }

                const requestedLabel = String(payload.label || '').trim();
                if (requestedLabel) {
                    node.label = requestedLabel;
                }

                if (resolvedType === 'MCP_TOOL') {
                    const payloadToolName = String(payload.toolName || payload.config?.toolName || '').trim();
                    ensureMcpConfig(node, payloadToolName);
                    const currentConfig: any = isPlainObject(node.config) ? clone(node.config as any) : {};
                    if (isPlainObject(payload.params)) {
                        currentConfig.params = clone(payload.params);
                    }
                    if (payload.variableName) {
                        currentConfig.variableName = String(payload.variableName);
                    }
                    node.config = currentConfig as any;
                }

                next.nodes.push(node);
                continue;
            }

            if (change.type === 'replace_text_template') {
                const node = getNodeById(next, change.nodeId);
                if (!node || !change.path) continue;
                if (!isSafePath(change.path)) continue;

                const configObj = isPlainObject(node.config) ? clone(node.config) : {};
                const oldVal = change.oldValue == null ? '' : String(change.oldValue);
                const current = String(getByPath(configObj, change.path) ?? '');
                const replaced = current.replace(oldVal, String(change.newValue ?? ''));
                if (!setByPath(configObj, change.path, replaced)) continue;
                node.config = configObj as any;
                continue;
            }

            if (change.type === 'update_node_label') {
                const node = getNodeById(next, change.nodeId);
                if (!node) continue;
                node.label = String(change.newValue ?? node.label);
                continue;
            }

            if (change.type === 'add_edge') {
                if (!change.sourceNodeId || !change.targetNodeId) continue;
                const nodeIds = new Set(next.nodes.map(node => node.id));
                if (!nodeIds.has(change.sourceNodeId) || !nodeIds.has(change.targetNodeId)) continue;

                const sourcePort = (change.sourcePort || 'default') as EdgePort;
                const exists = next.edges.some(
                    edge =>
                        edge.sourceNodeId === change.sourceNodeId &&
                        edge.targetNodeId === change.targetNodeId &&
                        edge.sourcePort === sourcePort
                );
                if (exists) continue;
                next.edges.push(createEdge(change.sourceNodeId, change.targetNodeId, sourcePort));
                continue;
            }

            if (change.type === 'remove_edge') {
                if (change.edgeId) {
                    next.edges = next.edges.filter(edge => edge.id !== change.edgeId);
                    continue;
                }
                if (change.sourceNodeId && change.targetNodeId) {
                    next.edges = next.edges.filter(
                        edge =>
                            !(
                                edge.sourceNodeId === change.sourceNodeId &&
                                edge.targetNodeId === change.targetNodeId &&
                                (!change.sourcePort || edge.sourcePort === change.sourcePort)
                            )
                    );
                }
                continue;
            }
        }

        for (const node of next.nodes) {
            const rawType = String((node as any).type || '').trim();
            const resolvedType = normalizeNodeType(rawType);
            if (!resolvedType) continue;
            if (rawType !== resolvedType) {
                node.type = resolvedType as any;
                if (resolvedType === 'MCP_TOOL' && rawType.startsWith('breviai.')) {
                    ensureMcpConfig(node, rawType);
                }
            }
        }

        const validNodeIds = new Set(next.nodes.map(node => node.id));
        next.edges = next.edges.filter(
            edge => validNodeIds.has(edge.sourceNodeId) && validNodeIds.has(edge.targetNodeId)
        );

        next.updatedAt = new Date().toISOString();
        return next;
    }
}

export const workflowPatchService = new WorkflowPatchService();
