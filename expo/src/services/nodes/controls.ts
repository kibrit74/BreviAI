/**
 * Control Node Executors
 * Delay, If/Else, Variable, Loop - handled in WorkflowEngine
 * This file exports placeholder for consistency
 */

import { WorkflowNode } from '../../types/workflow-types';
import { VariableManager } from '../WorkflowEngine';

// Note: Control nodes (DELAY, IF_ELSE, VARIABLE, LOOP) are handled
// directly in WorkflowEngine because they need access to internal state.
// This file is kept for consistency and potential future expansion.

export async function executeControlNode(
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<any> {
    // Control nodes are handled directly in WorkflowEngine
    // This is a placeholder for future expansion
    throw new Error(`Control node ${node.type} should be handled by WorkflowEngine directly`);
}

/**
 * Executes another workflow from within the current workflow.
 * Supports finding by ID or Name, passing variables, and waiting for completion.
 */
export async function executeWorkflowNode(
    config: any,
    variableManager: VariableManager
): Promise<any> {
    const { workflowId, waitForCompletion, passVariables, variableName } = config;

    if (!workflowId) {
        throw new Error('Workflow ID or Name is required');
    }

    console.log(`[EXECUTE_WORKFLOW] Requesting execution of: ${workflowId}`);

    // Lazy load dependencies to avoid circular imports
    const { WorkflowStorage } = require('../WorkflowStorage');
    const { WorkflowEngine } = require('../WorkflowEngine');

    // 1. Find the target workflow
    // Try distinct ID first
    let targetWorkflow = await WorkflowStorage.getById(workflowId);

    // If not found, try searching by name or ID in all workflows
    if (!targetWorkflow) {
        const allWorkflows = await WorkflowStorage.getAll();
        console.log(`[EXECUTE_WORKFLOW] Searching for '${workflowId}' in:`, allWorkflows.map((w: any) => w.name));
        targetWorkflow = allWorkflows.find((w: any) =>
            w.id === workflowId ||
            w.name.trim().toLowerCase() === workflowId.trim().toLowerCase()
        );
    }

    if (!targetWorkflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
    }

    // 2. Prepare variables
    let childVariables: any = {};
    if (passVariables) {
        // Pass a copy of current variables
        childVariables = { ...variableManager.getAll() };
    }

    // Add metadata
    childVariables._parentWorkflowId = variableManager.get('_workflowId');
    childVariables._triggeredBy = 'EXECUTE_WORKFLOW';

    // 3. Execute
    const engine = WorkflowEngine.getInstance();
    console.log(`[EXECUTE_WORKFLOW] Starting child workflow: ${targetWorkflow.name} (${targetWorkflow.id})`);

    if (waitForCompletion !== false) { // Default true
        // Await execution
        const result = await engine.execute(targetWorkflow, childVariables);

        // Store result if variableName provided
        if (variableName) {
            variableManager.set(variableName, result);
        }

        return result;
    } else {
        // Fire and forget - run in background
        engine.execute(targetWorkflow, childVariables).catch((err: any) => {
            console.error(`[EXECUTE_WORKFLOW] Background child workflow failed:`, err);
        });

        return {
            success: true,
            status: 'started_in_background',
            childWorkflowId: targetWorkflow.id
        };
    }
}
