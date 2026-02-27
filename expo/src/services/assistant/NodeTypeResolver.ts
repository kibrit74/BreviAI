import { NodeType, NODE_REGISTRY, Workflow } from '../../types/workflow-types';

const NODE_TYPE_ALIASES: Record<string, NodeType> = {
    MCP_CALL: 'MCP_TOOL',
    MCP: 'MCP_TOOL',
    GOOGLE_SHEET_READ: 'SHEETS_READ',
    GOOGLE_SHEET_WRITE: 'SHEETS_WRITE',
    GOOGLE_SHEETS_READ: 'SHEETS_READ',
    GOOGLE_SHEETS_WRITE: 'SHEETS_WRITE',
    SHEET_READ: 'SHEETS_READ',
    SHEET_WRITE: 'SHEETS_WRITE',
    GOOGLE_DRIVE_SEARCH: 'MCP_TOOL',
    ONEDRIVE_SEARCH: 'MCP_TOOL',
    MICROSOFT_ONEDRIVE_SEARCH: 'MCP_TOOL',
    JIRA_CREATE: 'MCP_TOOL',
    JIRA_SEARCH: 'MCP_TOOL',
    TRELLO_CREATE: 'MCP_TOOL',
    TRELLO_LIST: 'MCP_TOOL',
};

function toCanonical(value: string): string {
    return String(value || '')
        .trim()
        .replace(/[.\s-]+/g, '_')
        .toUpperCase();
}

export function isValidNodeType(value: unknown): value is NodeType {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(NODE_REGISTRY, value);
}

export function normalizeNodeType(value: unknown): NodeType | null {
    if (typeof value !== 'string') return null;
    const raw = value.trim();
    if (!raw) return null;

    if (isValidNodeType(raw)) return raw;
    if (raw.startsWith('breviai.')) return 'MCP_TOOL';

    const canonical = toCanonical(raw);
    if (isValidNodeType(canonical)) return canonical;
    if (canonical.startsWith('BREVIAI_')) return 'MCP_TOOL';

    const aliased = NODE_TYPE_ALIASES[canonical];
    return aliased || null;
}

export function hasTriggerNode(workflow: Workflow): boolean {
    return workflow.nodes.some((node) => {
        const type = String((node as any)?.type || '');
        return type === 'MANUAL_TRIGGER' || type.endsWith('_TRIGGER');
    });
}

export function findInvalidNodes(workflow: Workflow): Array<{
    nodeId: string;
    label: string;
    currentType: string;
    suggestedType: NodeType | null;
}> {
    return workflow.nodes
        .filter((node) => !isValidNodeType((node as any).type))
        .map((node) => {
            const currentType = String((node as any).type || '');
            return {
                nodeId: node.id,
                label: node.label,
                currentType,
                suggestedType: normalizeNodeType(currentType),
            };
        });
}

export function getNodeTypeSnapshot(): NodeType[] {
    return Object.keys(NODE_REGISTRY) as NodeType[];
}
