import { Workflow } from '../../types/workflow-types';
import { ExecutionLogEntry } from '../ExecutionLogger';

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
                    currentConfig: node.config,
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
            '          "type": "update_node_config|update_node_type|update_node_label|replace_text_template|add_edge|remove_edge",',
            '          "nodeId": "string optional",',
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

        const errorSummary = latestError
            ? {
                workflowId: latestError.workflowId,
                workflowName: latestError.workflowName,
                failedNodeLabel: latestError.failedNodeLabel,
                error: latestError.error,
                nodeErrors: latestError.nodeResults.filter(n => !!n.error).map(n => ({
                    nodeId: n.nodeId,
                    nodeLabel: n.nodeLabel,
                    error: n.error,
                })),
            }
            : null;

        const compactWorkflow = {
            id: workflow.id,
            name: workflow.name,
            nodes: workflow.nodes.map(node => ({
                id: node.id,
                type: node.type,
                label: node.label,
                config: node.config,
            })),
            edges: workflow.edges,
        };

        return [
            `Kullanici mesaji: ${userMessage || 'Bu workflow hatasini cozmeye yardim et.'}`,
            '',
            'MCP migration candidates (native -> MCP_TOOL):',
            JSON.stringify(mcpCandidates),
            '',
            'Available MCP tools snapshot:',
            JSON.stringify([
                'breviai.google.gmail_read',
                'breviai.google.sheets_read',
                'breviai.google.sheets_write',
                'breviai.google.drive_list',
                'breviai.google.calendar_list',
                'breviai.google.calendar_create',
                'breviai.google.meet_create',
                'breviai.microsoft.outlook_read',
                'breviai.microsoft.outlook_send',
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
            ]),
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
