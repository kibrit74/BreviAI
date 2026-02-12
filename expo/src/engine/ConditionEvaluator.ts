/**
 * ConditionEvaluator - Koşul değerlendirme motoru
 * IF/ELSE node'ları için mantık işleme
 */

import { IfElseConfig } from '../types/workflow-types';
import { VariableManager } from '../services/VariableManager';

export class ConditionEvaluator {
    constructor(private variableManager: VariableManager) { }

    evaluate(config: IfElseConfig): boolean {
        // Multi-condition logic
        if (config.conditions && config.conditions.length > 0) {
            const results = config.conditions.map(c => this.evaluateItem(c));
            if (config.logic === 'OR') {
                return results.some(r => r === true);
            } else {
                // Default AND
                return results.every(r => r === true);
            }
        }

        // Single condition (Legacy)
        return this.evaluateItem(config);
    }

    private evaluateItem(item: { left: string, operator: string, right: string, caseSensitive?: boolean }): boolean {
        let left = this.variableManager.resolveValue(item.left);
        let right = this.variableManager.resolveValue(item.right);

        // Normalize boolean/string comparisons
        left = this.normalizeValue(left);
        right = this.normalizeValue(right);

        // Case insensitivity handling
        const isCaseSensitive = item.caseSensitive !== false; // Default true
        if (!isCaseSensitive) {
            if (typeof left === 'string') left = left.toLowerCase();
            if (typeof right === 'string') right = right.toLowerCase();
        }

        switch (item.operator) {
            case '==':
                return left == right;
            case '!=':
                return left != right;
            case '>':
                return Number(left) > Number(right);
            case '<':
                return Number(left) < Number(right);
            case '>=':
                return Number(left) >= Number(right);
            case '<=':
                return Number(left) <= Number(right);
            case 'contains':
                return String(left).includes(String(right));
            case 'startsWith':
                return String(left).startsWith(String(right));
            case 'endsWith':
                return String(left).endsWith(String(right));
            case 'isEmpty':
                return left === undefined || left === null || left === '' ||
                    (Array.isArray(left) && left.length === 0);
            default:
                return false;
        }
    }

    // Normalize values for comparison - convert between boolean and string
    private normalizeValue(value: any): any {
        // Convert boolean to string for comparison with string literals
        if (value === true) return 'true';
        if (value === false) return 'false';
        // Convert string "true"/"false" to actual strings (already strings, but ensure lowercase)
        if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (lower === 'true' || lower === 'false') {
                return lower;
            }
        }
        return value;
    }
}
