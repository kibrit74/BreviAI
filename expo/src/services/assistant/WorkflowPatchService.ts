import { Workflow, WorkflowNode, createEdge, EdgePort } from '../../types/workflow-types';
import { AssistantPatchChange } from './WorkflowAssistantTypes';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const getNodeById = (workflow: Workflow, nodeId?: string): WorkflowNode | undefined => {
    if (!nodeId) return undefined;
    return workflow.nodes.find(node => node.id === nodeId);
};

const setByPath = (target: any, path: string, value: any) => {
    const parts = path.split('.').filter(Boolean);
    if (!parts.length) return;
    let cursor = target;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (typeof cursor[key] !== 'object' || cursor[key] === null) {
            cursor[key] = {};
        }
        cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = value;
};

class WorkflowPatchService {
    applyChanges(workflow: Workflow, changes: AssistantPatchChange[]): Workflow {
        const next = clone(workflow);

        for (const change of changes) {
            if (change.type === 'update_node_config') {
                const node = getNodeById(next, change.nodeId);
                if (!node) continue;
                if (!change.path) continue;
                const configObj = clone(node.config as any);
                setByPath(configObj, change.path, change.newValue);
                node.config = configObj as any;
                continue;
            }

            if (change.type === 'update_node_type') {
                const node = getNodeById(next, change.nodeId);
                if (!node) continue;
                const nextType = String(change.newValue || '').trim();
                if (!nextType) continue;
                node.type = nextType as any;
                continue;
            }

            if (change.type === 'replace_text_template') {
                const node = getNodeById(next, change.nodeId);
                if (!node || !change.path) continue;
                const configObj = clone(node.config as any);
                const oldVal = change.oldValue == null ? '' : String(change.oldValue);
                const current = String((configObj as any)[change.path] ?? '');
                const replaced = current.replace(oldVal, String(change.newValue ?? ''));
                (configObj as any)[change.path] = replaced;
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

        next.updatedAt = new Date().toISOString();
        return next;
    }
}

export const workflowPatchService = new WorkflowPatchService();
