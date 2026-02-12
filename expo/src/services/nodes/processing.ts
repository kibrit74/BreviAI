import { CodeExecutionConfig, SetValuesConfig } from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
import { debugLog } from '../DebugLogger';

/**
 * Execute custom JavaScript code
 * This is a powerful node that allows users to run arbitrary JS to manipulate variables.
 */
export const executeCodeExecution = async (
    config: CodeExecutionConfig,
    variableManager: VariableManager
): Promise<any> => {
    try {
        const { code, variableName } = config;

        // Context to be passed to the function
        const variables = variableManager.getAll();

        // Helper function to update variables from within code
        const setVariable = (key: string, value: any) => {
            variableManager.set(key, value);
        };

        // Create a safe-ish execution environment
        // We pass 'variables' (read-only copy effectively unless we provide setter)
        // and 'setVariable' to allow updates.
        // We also pass 'context' for future extensibility
        const context = {
            log: (msg: any) => console.log('[Code Node]', msg),
        };

        // Wrap code in an async function
        // The user code can return a value or an object of variables to update
        const userFunction = new Function(
            'variables',
            'setVariable',
            'context',
            `return (async () => { 
                ${code} 
            })();`
        );

        const result = await userFunction(variables, setVariable, context);

        // If variableName is provided, store the result there
        if (variableName) {
            variableManager.set(variableName, result);
        }

        // If result is an object, we MIGHT want to support bulk update?
        // For now, let's keep it simple: relying on setVariable() inside code is clearer.
        // But n8n convention: return JSON to be passed to next node.

        return result;

    } catch (error) {
        debugLog('error', 'Code Execution Failed', { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};

/**
 * Execute Set Values (Edit Fields)
 * Batch processing of variable assignment and type conversion
 */
export const executeSetValues = async (
    config: SetValuesConfig,
    variableManager: VariableManager
): Promise<any> => {
    try {
        const { values, mode = 'override' } = config;

        // In 'append' mode, we might want to check existing array?
        // But usually Set Node just overwrites matching keys.
        // Let's implement standard assignment loop.

        const results: Record<string, any> = {};

        for (const item of values) {
            let processedValue: any = item.value;

            // 1. Resolve variable substitution
            if (typeof item.value === 'string' && item.value.includes('{{')) {
                processedValue = variableManager.resolveValue(item.value);
            }

            // 2. Type Conversion
            switch (item.type) {
                case 'number':
                    processedValue = Number(processedValue);
                    if (isNaN(processedValue)) processedValue = 0; // Fallback? or keep null?
                    break;
                case 'boolean':
                    if (typeof processedValue === 'string') {
                        processedValue = processedValue.toLowerCase() === 'true';
                    } else {
                        processedValue = Boolean(processedValue);
                    }
                    break;
                case 'json':
                    if (typeof processedValue === 'string') {
                        try {
                            processedValue = JSON.parse(processedValue);
                        } catch (e) {
                            console.warn('[SetValues] Failed to parse JSON', item.value);
                            // Keep as string if parse fails
                        }
                    }
                    break;
                case 'string':
                default:
                    processedValue = String(processedValue);
                    break;
            }

            // 3. Set Variable
            variableManager.set(item.name, processedValue);
            results[item.name] = processedValue;
        }

        return { success: true, updated: results };

    } catch (error) {
        debugLog('error', 'Set Values Failed', { error });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
};
