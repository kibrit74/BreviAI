import { Workflow } from '../../src/types/workflow-types';

jest.mock('../../src/services/assistant/ProviderRouterService', () => ({
    providerRouterService: {
        resolveProviderCandidates: jest.fn(),
    },
}));

import { workflowAssistantService } from '../../src/services/assistant/WorkflowAssistantService';
import { workflowPatchService } from '../../src/services/assistant/WorkflowPatchService';
import { providerRouterService } from '../../src/services/assistant/ProviderRouterService';

const mockedProviderRouter = providerRouterService as unknown as {
    resolveProviderCandidates: jest.Mock;
};

const makeWorkflow = (nodes: any[], edges: any[] = []): Workflow => ({
    id: 'wf_test',
    name: 'Test Workflow',
    nodes: nodes as any,
    edges: edges as any,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runCount: 0,
});

describe('WorkflowAssistantService fallback suggestions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedProviderRouter.resolveProviderCandidates.mockResolvedValue([
            {
                provider: 'gemini',
                apiKey: 'test-key',
                model: { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
            },
        ]);
        (global as any).fetch = jest.fn().mockRejectedValue(new Error('network down'));
    });

    test('should suggest correcting invalid node type and patch should apply it', async () => {
        const workflow = makeWorkflow(
            [
                {
                    id: 'n_trigger',
                    type: 'MANUAL_TRIGGER',
                    label: 'Start',
                    config: { label: 'Start' },
                    position: { x: 0, y: 0 },
                },
                {
                    id: 'n_invalid',
                    type: 'google_sheets_read',
                    label: 'Broken Sheets',
                    config: { spreadsheetId: 'x' },
                    position: { x: 200, y: 0 },
                },
            ],
            [
                {
                    id: 'e_1',
                    sourceNodeId: 'n_trigger',
                    targetNodeId: 'n_invalid',
                    sourcePort: 'default',
                },
            ]
        );

        const result = await workflowAssistantService.generateFixes({
            workflow,
            latestError: null,
            userMessage: 'duzelt',
        });

        const typeFix = result.suggestions.find((suggestion) =>
            suggestion.changes.some((change) => change.type === 'update_node_type' && change.nodeId === 'n_invalid')
        );

        expect(typeFix).toBeTruthy();
        const updateTypeChange = typeFix!.changes.find((change) => change.type === 'update_node_type');
        expect(updateTypeChange?.newValue).toBe('SHEETS_READ');

        const patched = workflowPatchService.applyChanges(workflow, typeFix!.changes);
        const fixedNode = patched.nodes.find((node) => node.id === 'n_invalid');
        expect(fixedNode?.type).toBe('SHEETS_READ');
    });

    test('should suggest add_node + add_edge when trigger is missing and patch should apply', async () => {
        const workflow = makeWorkflow([
            {
                id: 'n_show',
                type: 'SHOW_TEXT',
                label: 'Show',
                config: { content: 'Hi' },
                position: { x: 200, y: 100 },
            },
        ]);

        const result = await workflowAssistantService.generateFixes({
            workflow,
            latestError: null,
            userMessage: 'eksik node var mi',
        });

        const triggerFix = result.suggestions.find((suggestion) =>
            suggestion.changes.some((change) => change.type === 'add_node')
        );

        expect(triggerFix).toBeTruthy();
        expect(triggerFix!.changes.some((change) => change.type === 'add_edge')).toBe(true);

        const patched = workflowPatchService.applyChanges(workflow, triggerFix!.changes);
        const triggerNode = patched.nodes.find((node) => node.type === 'MANUAL_TRIGGER');
        expect(triggerNode).toBeTruthy();
        expect(
            patched.edges.some(
                (edge) =>
                    edge.sourceNodeId === triggerNode!.id &&
                    edge.targetNodeId === 'n_show' &&
                    edge.sourcePort === 'default'
            )
        ).toBe(true);
    });
});
