/**
 * WorkflowClipboard - Service for copy/paste workflow nodes
 * Provides n8n style copy-paste functionality
 */

import * as ClipboardLib from 'expo-clipboard';
import { WorkflowNode, WorkflowEdge, createNode, createEdge, NodeType } from '../types/workflow-types';

// Internal clipboard for nodes (faster than system clipboard)
let internalClipboard: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
} | null = null;

// Position offset for pasted nodes
const PASTE_OFFSET = 40;

/**
 * Copy selected nodes and their connecting edges to clipboard
 */
export const copyNodes = async (
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    selectedNodeIds: string[]
): Promise<boolean> => {
    if (selectedNodeIds.length === 0) {
        return false;
    }

    // Get selected nodes
    const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));

    // Get edges between selected nodes
    const selectedEdges = edges.filter(e =>
        selectedNodeIds.includes(e.sourceNodeId) &&
        selectedNodeIds.includes(e.targetNodeId)
    );

    // Store in internal clipboard
    internalClipboard = {
        nodes: JSON.parse(JSON.stringify(selectedNodes)), // Deep copy
        edges: JSON.parse(JSON.stringify(selectedEdges))
    };

    // Also copy to system clipboard as JSON for cross-app paste
    try {
        const clipboardData = {
            type: 'breviai_workflow',
            version: 1,
            nodes: selectedNodes,
            edges: selectedEdges
        };
        await ClipboardLib.setStringAsync(JSON.stringify(clipboardData, null, 2));
    } catch (e) {
        console.warn('Failed to copy to system clipboard:', e);
    }

    console.log(`[Clipboard] Copied ${selectedNodes.length} nodes, ${selectedEdges.length} edges`);
    return true;
};

/**
 * Copy a single node
 */
export const copySingleNode = async (
    node: WorkflowNode,
    edges: WorkflowEdge[]
): Promise<boolean> => {
    return copyNodes([node], edges, [node.id]);
};

/**
 * Paste nodes from clipboard, returning new nodes and edges with fresh IDs
 */
export const pasteNodes = async (
    existingNodes: WorkflowNode[]
): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null> => {
    // Try internal clipboard first
    let clipboardData = internalClipboard;

    // If internal is empty, try system clipboard
    if (!clipboardData || clipboardData.nodes.length === 0) {
        try {
            console.log('[Clipboard] Internal clipboard empty, checking system clipboard...');
            const systemClipboard = await ClipboardLib.getStringAsync();
            console.log(`[Clipboard] System content length: ${systemClipboard?.length}`);

            if (systemClipboard) {
                try {
                    const parsed = JSON.parse(systemClipboard.trim());
                    if ((parsed.type === 'breviai_workflow' || parsed.nodes) && Array.isArray(parsed.nodes)) {
                        console.log('[Clipboard] Valid workflow data found in system clipboard');
                        clipboardData = {
                            nodes: parsed.nodes,
                            edges: parsed.edges || []
                        };
                    } else {
                        console.log('[Clipboard] Content is JSON but not a valid workflow');
                    }
                } catch (jsonError) {
                    console.log('[Clipboard] Content is not valid JSON:', systemClipboard.substring(0, 50) + '...');
                }
            }
        } catch (e) {
            console.warn('[Clipboard] Failed to read system clipboard:', e);
        }
    }

    if (!clipboardData || clipboardData.nodes.length === 0) {
        console.log('[Clipboard] Nothing to paste');
        return null;
    }

    // Calculate offset based on existing nodes to avoid overlap
    const offset = calculatePasteOffset(clipboardData.nodes, existingNodes);

    // Create ID mapping for old -> new
    const idMapping = new Map<string, string>();

    // Create new nodes with fresh IDs and adjusted positions
    const newNodes: WorkflowNode[] = clipboardData.nodes.map(node => {
        const newPosition = {
            x: node.position.x + offset.x,
            y: node.position.y + offset.y
        };
        const newNode = createNode(node.type, newPosition);
        idMapping.set(node.id, newNode.id);

        return {
            ...newNode,
            label: node.label,
            config: { ...node.config },
            // Position is already set by createNode
        };
    });

    // Create new edges with updated node references
    const newEdges: WorkflowEdge[] = clipboardData.edges
        .map(edge => {
            const newSourceId = idMapping.get(edge.sourceNodeId);
            const newTargetId = idMapping.get(edge.targetNodeId);

            if (!newSourceId || !newTargetId) return null;

            return createEdge(newSourceId, newTargetId, edge.sourcePort);
        })
        .filter((e): e is WorkflowEdge => e !== null);

    console.log(`[Clipboard] Pasted ${newNodes.length} nodes, ${newEdges.length} edges`);

    return { nodes: newNodes, edges: newEdges };
};

/**
 * Calculate offset to avoid overlapping with existing nodes
 */
const calculatePasteOffset = (
    clipboardNodes: WorkflowNode[],
    existingNodes: WorkflowNode[]
): { x: number; y: number } => {
    if (clipboardNodes.length === 0) return { x: PASTE_OFFSET, y: PASTE_OFFSET };

    // Get bounding box of clipboard nodes
    const minX = Math.min(...clipboardNodes.map(n => n.position.x));
    const minY = Math.min(...clipboardNodes.map(n => n.position.y));
    const maxX = Math.max(...clipboardNodes.map(n => n.position.x + 180));
    const maxY = Math.max(...clipboardNodes.map(n => n.position.y + 70));

    // Check if this position would overlap with existing nodes
    let offsetX = PASTE_OFFSET;
    let offsetY = PASTE_OFFSET;

    for (let i = 0; i < 10; i++) { // Try up to 10 offsets
        const testMinX = minX + offsetX;
        const testMinY = minY + offsetY;
        const testMaxX = maxX + offsetX;
        const testMaxY = maxY + offsetY;

        const hasOverlap = existingNodes.some(existing => {
            const eLeft = existing.position.x;
            const eTop = existing.position.y;
            const eRight = eLeft + 180;
            const eBottom = eTop + 70;

            return !(testMaxX < eLeft || testMinX > eRight || testMaxY < eTop || testMinY > eBottom);
        });

        if (!hasOverlap) break;

        offsetX += PASTE_OFFSET;
        offsetY += PASTE_OFFSET;
    }

    return { x: offsetX, y: offsetY };
};

/**
 * Check if clipboard has content
 */
export const hasClipboardContent = async (): Promise<boolean> => {
    if (internalClipboard && internalClipboard.nodes.length > 0) {
        return true;
    }

    try {
        const systemClipboard = await ClipboardLib.getStringAsync();
        if (systemClipboard) {
            try {
                const parsed = JSON.parse(systemClipboard.trim());
                // Accept if it has nodes array, even if type is missing (for flexibility)
                return (parsed.type === 'breviai_workflow' || parsed.nodes) && Array.isArray(parsed.nodes) && parsed.nodes.length > 0;
            } catch (e) {
                return false;
            }
        }
    } catch (e) {
        // Not valid
    }

    return false;
};

/**
 * Clear clipboard
 */
export const clearClipboard = (): void => {
    internalClipboard = null;
};

/**
 * Duplicate a node (copy + paste in one step)
 */
export const duplicateNode = (
    node: WorkflowNode,
    existingNodes: WorkflowNode[]
): WorkflowNode => {
    const offset = calculatePasteOffset([node], existingNodes);
    const newPosition = {
        x: node.position.x + offset.x,
        y: node.position.y + offset.y
    };
    const newNode = createNode(node.type, newPosition);

    return {
        ...newNode,
        label: node.label,
        config: { ...node.config }
    };
};

/**
 * Export workflow to JSON string (for sharing)
 */
export const exportWorkflowToJson = (
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
): string => {
    const data = {
        type: 'breviai_workflow',
        version: 1,
        exportedAt: new Date().toISOString(),
        nodes,
        edges
    };
    return JSON.stringify(data, null, 2);
};

/**
 * Import workflow from JSON string
 */
export const importWorkflowFromJson = (
    jsonString: string
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null => {
    try {
        const data = JSON.parse(jsonString);
        if (data.type !== 'breviai_workflow' || !data.nodes) {
            return null;
        }

        // Create fresh IDs for all nodes
        const idMapping = new Map<string, string>();

        const nodes: WorkflowNode[] = data.nodes.map((node: any) => {
            const position = node.position || { x: 100, y: 100 };
            const newNode = createNode(node.type as NodeType, position);
            idMapping.set(node.id, newNode.id);
            return {
                ...newNode,
                label: node.label || '',
                config: node.config || {},
            };
        });

        const edges: WorkflowEdge[] = (data.edges || [])
            .map((edge: any) => {
                const newSourceId = idMapping.get(edge.sourceNodeId);
                const newTargetId = idMapping.get(edge.targetNodeId);
                if (!newSourceId || !newTargetId) return null;
                return createEdge(newSourceId, newTargetId, edge.sourcePort || 'default');
            })
            .filter((e: any): e is WorkflowEdge => e !== null);

        return { nodes, edges };
    } catch (e) {
        console.error('[Clipboard] Failed to import workflow:', e);
        return null;
    }
};
