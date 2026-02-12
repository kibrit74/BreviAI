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
