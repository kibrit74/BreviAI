import { Workflow } from '../../types/workflow-types';
import { ExecutionLogEntry } from '../ExecutionLogger';
import { findInvalidNodes, getNodeTypeSnapshot, hasTriggerNode } from './NodeTypeResolver';

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|token|password|secret|webhook|authorization|cookie|client[_-]?secret)/i;
const TOKEN_VALUE_PATTERN = /^(sk-[A-Za-z0-9_\-]+|AIza[0-9A-Za-z_\-]+|xox[baprs]-[A-Za-z0-9-]+)$/;
const MAX_STRING_LENGTH = 600;

const MCP_TOOLS_SNAPSHOT = [
    'breviai.google.gmail_read',
    'breviai.google.sheets_read',
    'breviai.google.sheets_write',
    'breviai.google.drive_list',
    'breviai.google.calendar_list',
    'breviai.google.calendar_create',
    'breviai.google.meet_create',
    'breviai.microsoft.outlook_read',
    'breviai.microsoft.outlook_send',
    'breviai.microsoft.calendar_list',
    'breviai.microsoft.calendar_create',
    'breviai.microsoft.onedrive_list',
    'breviai.microsoft.onedrive_search',
    'breviai.microsoft.excel_read',
    'breviai.microsoft.excel_write',
    'breviai.microsoft.teams_meeting',
    'breviai.notion.search',
    'breviai.notion.create_page',
    'breviai.slack.send_message',
    'breviai.slack.list_channels',
    'breviai.trello.list_cards',
    'breviai.trello.create_card',
    'breviai.jira.search_issues',
    'breviai.jira.create_issue',
    'breviai.asana.list_tasks',
    'breviai.asana.create_task',
    'breviai.airtable.list_records',
    'breviai.zapier.trigger_webhook',
    'breviai.github.repos_list',
    'breviai.web_search',
    'breviai.list_templates',
];

const MCP_MIGRATION_HINTS: Record<string, { tool: string; exampleParams: Record<string, any> }> = {
    GMAIL_READ: {
        tool: 'breviai.google.gmail_read',
        exampleParams: { accessToken: '{{GOOGLE_ACCESS_TOKEN}}', searchQuery: 'is:unread', maxResults: 10 },
    },
    SHEETS_READ: {
        tool: 'breviai.google.sheets_read',
        exampleParams: { accessToken: '{{GOOGLE_ACCESS_TOKEN}}', spreadsheetId: '...', range: 'Sheet1!A1:D50' },
    },
    SHEETS_WRITE: {
        tool: 'breviai.google.sheets_write',
        exampleParams: { accessToken: '{{GOOGLE_ACCESS_TOKEN}}', spreadsheetId: '...', range: 'Sheet1!A1', values: '[["a","b"]]' },
    },
    OUTLOOK_READ: {
        tool: 'breviai.microsoft.outlook_read',
        exampleParams: { accessToken: '{{MICROSOFT_ACCESS_TOKEN}}', folder: 'inbox', maxResults: 10 },
    },
    OUTLOOK_SEND: {
        tool: 'breviai.microsoft.outlook_send',
        exampleParams: { accessToken: '{{MICROSOFT_ACCESS_TOKEN}}', to: 'user@company.com', subject: 'Konu', body: 'Icerik' },
    },
    ONEDRIVE_LIST: {
        tool: 'breviai.microsoft.onedrive_list',
        exampleParams: { accessToken: '{{MICROSOFT_ACCESS_TOKEN}}', limit: 20 },
    },
    EXCEL_READ: {
        tool: 'breviai.microsoft.excel_read',
        exampleParams: {
            accessToken: '{{MICROSOFT_ACCESS_TOKEN}}',
            itemId: '...',
            worksheetName: 'Sheet1',
            range: 'A1:D50',
        },
    },
    EXCEL_WRITE: {
        tool: 'breviai.microsoft.excel_write',
        exampleParams: {
            accessToken: '{{MICROSOFT_ACCESS_TOKEN}}',
            itemId: '...',
            worksheetName: 'Sheet1',
            range: 'A1',
            values: '[["a","b"]]',
        },
    },
};

class PromptBuilderService {
    private sanitizeString(value: string): string {
        const raw = String(value || '');
        const trimmed = raw.trim();
        if (TOKEN_VALUE_PATTERN.test(trimmed)) return '[REDACTED]';
        if (raw.length <= MAX_STRING_LENGTH) return raw;
        return `${raw.slice(0, MAX_STRING_LENGTH)}...[truncated]`;
    }

    private redactSensitive(value: any, parentKey = ''): any {
        if (value == null) return value;

        if (typeof value === 'string') {
            return this.sanitizeString(value);
        }

        if (Array.isArray(value)) {
            return value.map((item) => this.redactSensitive(item, parentKey));
        }

        if (typeof value === 'object') {
            const result: Record<string, any> = {};
            for (const [key, item] of Object.entries(value)) {
                if (SENSITIVE_KEY_PATTERN.test(key) || SENSITIVE_KEY_PATTERN.test(parentKey)) {
                    result[key] = '[REDACTED]';
                } else {
                    result[key] = this.redactSensitive(item, key);
                }
            }
            return result;
        }

        return value;
    }

    private getMcpMigrationCandidates(workflow: Workflow) {
        return workflow.nodes
            .map((node) => {
                const hint = MCP_MIGRATION_HINTS[node.type];
                if (!hint) return null;
                return {
                    nodeId: node.id,
                    nodeType: node.type,
                    label: node.label,
                    suggestedTool: hint.tool,
                    currentConfig: this.redactSensitive(node.config),
                    exampleParams: hint.exampleParams,
                };
            })
            .filter(Boolean);
    }

    buildSystemPrompt(): string {
        return [
            'You are a workflow debugging assistant for a mobile node-based automation app.',
            'You must respond ONLY as valid JSON.',
            'Do not include markdown.',
            'Output schema:',
            '{',
            '  "beginner_explanation": "string",',
            '  "intermediate_explanation": "string",',
            '  "suggestions": [',
            '    {',
            '      "title": "string",',
            '      "why": "string",',
            '      "changes": [',
            '        {',
            '          "type": "update_node_config|update_node_type|add_node|update_node_label|replace_text_template|add_edge|remove_edge",',
            '          "nodeId": "string optional",',
            '          "nodeType": "string optional (for add_node)",',
            '          "position": {"x":number,"y":number} optional (for add_node),',
            '          "edgeId": "string optional",',
            '          "sourceNodeId": "string optional",',
            '          "targetNodeId": "string optional",',
            '          "sourcePort": "default|true|false|error|loop|done|case_1|case_2|case_3|case_4 optional",',
            '          "path": "config key path optional",',
            '          "oldValue": "any optional",',
            '          "newValue": "any optional"',
            '        }',
            '      ]',
            '    }',
            '  ],',
            '  "safety_notes": ["string"]',
            '}',
            'Rules:',
            '- Keep beginner explanation very simple Turkish.',
            '- Keep intermediate explanation practical Turkish.',
            '- Suggest at most 3 fixes.',
            '- Never output secrets.',
            '- Never delete whole workflow.',
            '- Use only node types provided in user context snapshot.',
            '- If invalid node types are detected, prioritize a fix with update_node_type.',
            '- If trigger node is missing, add one with add_node and connect using add_edge.',
            '- If MCP migration candidates exist, prefer at least one MCP-focused fix suggestion.',
            '- MCP migration can be expressed with sequential changes:',
            '  1) update_node_type -> MCP_TOOL',
            '  2) update_node_config path=toolName',
            '  3) update_node_config path=params',
            '- Do not invent unavailable MCP tools. Use only tools listed in user context.',
        ].join('\n');
    }

    buildUserPrompt(workflow: Workflow, latestError: ExecutionLogEntry | null | undefined, userMessage: string): string {
        const mcpCandidates = this.getMcpMigrationCandidates(workflow);
        const invalidNodes = findInvalidNodes(workflow);
        const missingTrigger = !hasTriggerNode(workflow);

        const errorSummary = latestError
            ? this.redactSensitive({
                workflowId: latestError.workflowId,
                workflowName: latestError.workflowName,
                failedNodeLabel: latestError.failedNodeLabel,
                error: latestError.error,
                nodeErrors: latestError.nodeResults.filter(n => !!n.error).map(n => ({
                    nodeId: n.nodeId,
                    nodeLabel: n.nodeLabel,
                    error: n.error,
                })),
            })
            : null;

        const compactWorkflow = this.redactSensitive({
            id: workflow.id,
            name: workflow.name,
            nodes: workflow.nodes.map(node => ({
                id: node.id,
                type: node.type,
                label: node.label,
                config: node.config,
            })),
            edges: workflow.edges,
        });

        return [
            `Kullanici mesaji: ${userMessage || 'Bu workflow hatasini cozmeye yardim et.'}`,
            '',
            'Invalid node types detected:',
            JSON.stringify(invalidNodes),
            '',
            'Missing trigger node:',
            JSON.stringify({ missingTrigger }),
            '',
            'MCP migration candidates (native -> MCP_TOOL):',
            JSON.stringify(mcpCandidates),
            '',
            'Available MCP tools snapshot:',
            JSON.stringify(MCP_TOOLS_SNAPSHOT),
            '',
            'Available node types snapshot:',
            JSON.stringify(getNodeTypeSnapshot()),
            '',
            'Workflow JSON:',
            JSON.stringify(compactWorkflow),
            '',
            'Son hata ozeti:',
            JSON.stringify(errorSummary),
            '',
            'Yalnizca belirtilen JSON formatinda yanit ver.',
        ].join('\n');
    }
}

export const promptBuilderService = new PromptBuilderService();
