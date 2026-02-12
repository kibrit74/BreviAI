import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    WorkflowNode,
    NodeExecutionResult,
    DatabaseReadConfig,
    DatabaseWriteConfig
} from '../../types/workflow-types';
import { VariableManager } from '../VariableManager';
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Key prefix to avoid collisions with other app data
const DB_PREFIX = 'BREVI_DB_';

/**
 * Execute Database Read Node
 * Reads JSON array from AsyncStorage and filters it
 */
export const executeDatabaseRead = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = node.config as DatabaseReadConfig;
    const tableName = variableManager.resolveString(config.tableName);
    const filterKey = config.filterKey ? variableManager.resolveString(config.filterKey) : null;
    const filterValue = config.filterValue ? variableManager.resolveString(config.filterValue) : null;

    if (!tableName) throw new Error('Table name is required');

    const key = `${DB_PREFIX}${tableName}`;

    try {
        const jsonStr = await AsyncStorage.getItem(key);
        let data: any[] = jsonStr ? JSON.parse(jsonStr) : [];

        if (!Array.isArray(data)) {
            // Migration or corruption handling: if singular object, wrap in array
            data = data ? [data] : [];
        }

        // Filter
        if (filterKey && filterValue) {
            data = data.filter(item => {
                // Simple equality check (convert both to string for safety)
                return String(item[filterKey]) === String(filterValue);
            });
        }

        if (config.variableName) {
            variableManager.set(config.variableName, data);
        }

        return { success: true, count: data.length, data };
    } catch (error) {
        throw new Error(`Database Read Error: ${error instanceof Error ? error.message : String(error)}`);
    }
};

/**
 * Execute Database Write Node
 * Insert, Update, Delete operations on JSON array
 */
export const executeDatabaseWrite = async (
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<NodeExecutionResult['output']> => {
    const config = node.config as DatabaseWriteConfig;
    const tableName = variableManager.resolveString(config.tableName);
    const operation = config.operation || 'insert';

    if (!tableName) throw new Error('Table name is required');

    const key = `${DB_PREFIX}${tableName}`;

    try {
        const jsonStr = await AsyncStorage.getItem(key);
        let data: any[] = jsonStr ? JSON.parse(jsonStr) : [];
        if (!Array.isArray(data)) data = data ? [data] : [];

        let result: any = null;

        if (operation === 'insert') {
            const rawData = config.data ? variableManager.resolveString(config.data) : '{}';
            let newItem: any;
            try {
                newItem = JSON.parse(rawData);
            } catch (e) {
                // FALLBACK: If not valid JSON, insert as raw text wrapper
                console.warn('[DB_WRITE] Invalid JSON data for insert, wrapping as raw object:', rawData);
                newItem = {
                    content: rawData, // Store the raw string (which might be the error message from prev node)
                    error: 'Invalid JSON format',
                    originalError: e instanceof Error ? e.message : String(e),
                    timestamp: new Date().toISOString()
                };
            }

            // Add ID if missing
            if (!newItem.id) {
                newItem.id = generateId();
            }
            if (!newItem.createdAt) {
                newItem.createdAt = new Date().toISOString();
            }

            data.push(newItem);
            result = { id: newItem.id };

        } else if (operation === 'update') {
            const filterKey = variableManager.resolveString(config.filterKey || '');
            const filterValue = variableManager.resolveString(config.filterValue || '');
            const rawData = config.data ? variableManager.resolveString(config.data) : '{}';

            if (!filterKey || !filterValue) throw new Error('Update requires Filter Key and Value');

            let updateData: any;
            try {
                updateData = JSON.parse(rawData);
            } catch (e) {
                throw new Error('Data must be valid JSON object for Update');
            }

            let updatedCount = 0;
            data = data.map(item => {
                if (String(item[filterKey]) === String(filterValue)) {
                    updatedCount++;
                    return { ...item, ...updateData, updatedAt: new Date().toISOString() };
                }
                return item;
            });
            result = { updatedCount };

        } else if (operation === 'delete') {
            const filterKey = variableManager.resolveString(config.filterKey || '');
            const filterValue = variableManager.resolveString(config.filterValue || '');

            if (!filterKey || !filterValue) throw new Error('Delete requires Filter Key and Value');

            const initialLen = data.length;
            data = data.filter(item => String(item[filterKey]) !== String(filterValue));
            result = { deletedCount: initialLen - data.length };
        }

        await AsyncStorage.setItem(key, JSON.stringify(data));

        if (config.variableName) {
            variableManager.set(config.variableName, result);
        }

        return { success: true, operation, ...result };
    } catch (error) {
        throw new Error(`Database Write Error: ${error instanceof Error ? error.message : String(error)}`);
    }
};
