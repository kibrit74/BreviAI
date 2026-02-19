import { Workflow } from '../../types/workflow-types';
import { ExecutionLogEntry } from '../ExecutionLogger';

class PromptBuilderService {
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
            '          "type": "update_node_config|update_node_label|replace_text_template|add_edge|remove_edge",',
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
        ].join('\n');
    }

    buildUserPrompt(workflow: Workflow, latestError: ExecutionLogEntry | null | undefined, userMessage: string): string {
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
            `Kullanıcı mesajı: ${userMessage || 'Bu workflow hatasını çözmeye yardım et.'}`,
            '',
            'Workflow JSON:',
            JSON.stringify(compactWorkflow),
            '',
            'Son hata özeti:',
            JSON.stringify(errorSummary),
            '',
            'Yalnızca belirtilen JSON formatında yanıt ver.',
        ].join('\n');
    }
}

export const promptBuilderService = new PromptBuilderService();
