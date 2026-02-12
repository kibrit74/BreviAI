
import { WorkflowNode, ViewUdfConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { interactionService } from '../InteractionService';

export async function executeViewUdf(
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<any> {
    const config = node.config as ViewUdfConfig;
    const fileSource = variableManager.resolveString(config.fileSource);

    if (!fileSource) {
        throw new Error('No file source provided for UDF Viewer');
    }

    // Pass the file URI to the UI via InteractionService
    await interactionService.showUdf(node.label || 'UDF Viewer', fileSource);

    return {
        success: true,
        file: fileSource
    };
}
