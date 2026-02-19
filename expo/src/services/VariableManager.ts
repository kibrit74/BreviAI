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
    // Supports: {{var}}, {{var.prop}}, {{var["key"]}}, {{var['key']}}
    resolveString(template: string): string {
        // Guard against undefined/null template
        if (template === undefined || template === null) {
            return '';
        }
        return String(template).replace(/\{\{([^}]+)\}\}/g, (match, varPath) => {
            const trimmed = varPath.trim();
            // Built-in system variables (resolved dynamically)
            if (trimmed === '_date') {
                const now = new Date();
                return `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
            }
            if (trimmed === '_time') {
                const now = new Date();
                return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            }
            if (trimmed === '_datetime') {
                const now = new Date();
                return `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            }
            if (trimmed === '_timestamp') {
                return Date.now().toString();
            }

            const value = this.resolveValue(match); // Use resolveValue to handle dot/bracket notation
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

    // Parse a variable path into segments
    // e.g., 'obj.prop' -> ['obj', 'prop']
    // e.g., 'obj["key with space"]' -> ['obj', 'key with space']
    // e.g., 'obj["key"].sub' -> ['obj', 'key', 'sub']
    // e.g., 'list[0].name' -> ['list', '0', 'name']
    private parsePath(path: string): string[] {
        const segments: string[] = [];
        let current = '';
        let i = 0;
        while (i < path.length) {
            const ch = path[i];
            if (ch === '.') {
                if (current) { segments.push(current); current = ''; }
                i++;
            } else if (ch === '[') {
                if (current) { segments.push(current); current = ''; }
                // Find closing bracket
                const closeIdx = path.indexOf(']', i);
                if (closeIdx === -1) { current += path.substring(i); break; }
                let key = path.substring(i + 1, closeIdx);
                // Remove surrounding quotes
                if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
                    key = key.slice(1, -1);
                }
                // key is now either a string key or a numeric index (both stored as string)
                segments.push(key);
                i = closeIdx + 1;
                // Skip dot after bracket if present
                if (i < path.length && path[i] === '.') i++;
            } else {
                current += ch;
                i++;
            }
        }
        if (current) segments.push(current);
        return segments;
    }

    // Get variable name from reference (supports nested properties like {{obj.prop}} and
    // bracket notation like {{obj["key"]}})
    getVariableName(ref: string): string | null {
        const match = ref.match(/^\{\{([^}]+)\}\}$/);
        return match ? match[1].trim() : null;
    }

    // Resolve a value (could be literal or variable reference)
    resolveValue(value: any): any {
        if (typeof value === 'string' && this.isVariableRef(value)) {
            const varPath = this.getVariableName(value);
            if (varPath) {
                const segments = this.parsePath(varPath);
                if (segments.length === 0) return undefined;

                const rootValue = this.variables.get(segments[0]);
                if (rootValue === undefined) return undefined;
                if (segments.length === 1) return rootValue;

                // Walk nested path
                return segments.slice(1).reduce(
                    (obj, key) => (obj && typeof obj === 'object' && obj[key] !== undefined) ? obj[key] : undefined,
                    rootValue
                );
            }
        } else if (typeof value === 'string') {
            // Support raw string variable names (without {{}})
            if (this.variables.has(value)) {
                return this.variables.get(value);
            }
            // Support dot/bracket notation for raw strings too
            const segments = this.parsePath(value);
            if (segments.length > 1 && this.variables.has(segments[0])) {
                const rootValue = this.variables.get(segments[0]);
                if (rootValue && typeof rootValue === 'object') {
                    return segments.slice(1).reduce(
                        (obj, key) => (obj && typeof obj === 'object' && obj[key] !== undefined) ? obj[key] : undefined,
                        rootValue
                    );
                }
            }
        }
        return value;
    }
}

