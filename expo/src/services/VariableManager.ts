/**
 * VariableManager - Workflow variable storage and resolution
 * Extracted to avoid circular dependencies
 */

export class VariableManager {
    private variables: Map<string, any> = new Map();

    set(name: string, value: any): void {
        this.variables.set(name, value);
    }

    get(name: string): any {
        return this.variables.get(name);
    }

    has(name: string): boolean {
        return this.variables.has(name);
    }

    delete(name: string): boolean {
        return this.variables.delete(name);
    }

    increment(name: string, amount: number = 1): number {
        const current = this.variables.get(name) || 0;
        const newValue = Number(current) + amount;
        this.variables.set(name, newValue);
        return newValue;
    }

    decrement(name: string, amount: number = 1): number {
        return this.increment(name, -amount);
    }

    append(name: string, value: string): string {
        const current = this.variables.get(name) || '';
        const newValue = String(current) + String(value);
        this.variables.set(name, newValue);
        return newValue;
    }

    clear(): void {
        this.variables.clear();
    }

    getAll(): Record<string, any> {
        const result: Record<string, any> = {};
        this.variables.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    // Resolve variable references in a string
    // e.g., "Hello {{name}}" -> "Hello John"
    resolveString(template: string): string {
        // Guard against undefined/null template
        if (template === undefined || template === null) {
            return '';
        }
        return String(template).replace(/\{\{([\w\.]+)\}\}/g, (match, varPath) => {
            // Built-in system variables (resolved dynamically)
            if (varPath === '_date') {
                const now = new Date();
                return `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
            }
            if (varPath === '_time') {
                const now = new Date();
                return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            }
            if (varPath === '_datetime') {
                const now = new Date();
                return `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            }
            if (varPath === '_timestamp') {
                return Date.now().toString();
            }

            const value = this.resolveValue(match); // Use resolveValue to handle dot notation
            if (value === undefined) {
                return match; // Keep original if not found
            }
            // Handle objects - convert to JSON string
            if (typeof value === 'object' && value !== null) {
                return JSON.stringify(value);
            }
            return String(value);
        });
    }

    // Check if a value is a variable reference
    isVariableRef(value: string): boolean {
        return typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}');
    }

    // Get variable name from reference (supports nested properties like {{obj.prop}})
    getVariableName(ref: string): string | null {
        const match = ref.match(/^\{\{([\w\.]+)\}\}$/);
        return match ? match[1] : null;
    }

    // Resolve a value (could be literal or variable reference)
    resolveValue(value: any): any {
        if (typeof value === 'string' && this.isVariableRef(value)) {
            const varName = this.getVariableName(value);
            if (varName) {
                // Check if it's a nested property access (e.g. "battery.level")
                if (varName.includes('.')) {
                    const [root, ...path] = varName.split('.');
                    const rootValue = this.variables.get(root);
                    if (rootValue && typeof rootValue === 'object') {
                        // Simple nested lookup
                        return path.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, rootValue);
                    }
                    return undefined;
                }
                return this.variables.get(varName);
            }
        } else if (typeof value === 'string') {
            // Also support direct string references without {{}} if they match a known variable logic?
            // Existing logic seemed to rely on isVariableRef ({{...}}).
            // However, config.left usually comes as "batteryLevel" (no braces) in ConditionEvaluator?
            // Let's check ConditionEvaluator again.
            // ConditionEvaluator calls resolveValue(config.left).
            // If config.left is "batteryLevel", isVariableRef returns false.
            // So it returns "batteryLevel" string literal?
            // WAIT. ConditionEvaluator line 60: `this.variableManager.resolveValue(config.left)`.
            // If VariableManager.resolveValue returns `value` as is when it's not {{...}}, then `evaluate` is comparing "batteryLevel" < 20.
            // "batteryLevel" < 20 is false (NaN).
            // ConditionEvaluator DOES NOT seem to resolve plain strings as variable names automatically unless VariableManager handles it.
            // Let's look at `VariableManager` behavior again.
            // It only resolves if `isVariableRef` matches `{{...}}`.
            // BUT `prompt-templates.ts` says: `left: "batteryLevel", operator: "<", right: "20"`.
            // It does NOT say `left: "{{batteryLevel}}"`.
            // THIS IS A HUGE BUG. Either Prompt must change to `{{batteryLevel}}` OR `ConditionEvaluator` must try to resolve raw strings as variables.

            // I will update ConditionEvaluator to try resolving string as variable if it exists.
            // OR update VariableManager.resolveValue to check if string exists as key.
            if (this.variables.has(value)) {
                return this.variables.get(value);
            }
            // Support dot notation for raw strings too
            if (value.includes('.')) {
                const [root, ...path] = value.split('.');
                if (this.variables.has(root)) {
                    const rootValue = this.variables.get(root);
                    if (rootValue && typeof rootValue === 'object') {
                        return path.reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, rootValue);
                    }
                }
            }
        }
        return value;
    }
}
