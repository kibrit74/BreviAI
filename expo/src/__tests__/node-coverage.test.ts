import fs from 'fs';
import path from 'path';

function readFile(relPath: string): string {
    const fullPath = path.resolve(__dirname, '..', relPath);
    return fs.readFileSync(fullPath, 'utf-8');
}

function parseNodeTypes(text: string): string[] {
    const match = text.match(/export type NodeType\s*=\s*([^;]+);/s);
    if (!match) return [];
    const block = match[1];
    const raw = Array.from(block.matchAll(/'([^']+)'/g)).map(m => m[1]);
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const n of raw) {
        if (!seen.has(n)) {
            ordered.push(n);
            seen.add(n);
        }
    }
    return ordered;
}

function parseNodeRegistryKeys(text: string): string[] {
    const start = text.indexOf('export const NODE_REGISTRY');
    const sub = start >= 0 ? text.slice(start) : text;
    const raw = Array.from(sub.matchAll(/^\s*([A-Z0-9_]+)\s*:\s*\{/gm)).map(m => m[1]);
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const k of raw) {
        if (!seen.has(k)) {
            ordered.push(k);
            seen.add(k);
        }
    }
    return ordered;
}

function parseWorkflowEngineCases(text: string): string[] {
    const raw = Array.from(text.matchAll(/case '([A-Z0-9_]+)'/g)).map(m => m[1]);
    return Array.from(new Set(raw));
}

function parseExecutorRegistryKeys(text: string): string[] {
    return Array.from(text.matchAll(/'([A-Z0-9_]+)'\s*:\s*\{\s*executor/g)).map(m => m[1]);
}

describe('Node coverage consistency', () => {
    const workflowTypes = readFile(path.join('types', 'workflow-types.ts'));
    const workflowEngine = readFile(path.join('services', 'WorkflowEngine.ts'));
    const executorRegistry = readFile(path.join('services', 'NodeExecutorRegistry.ts'));

    const nodeTypes = parseNodeTypes(workflowTypes);
    const nodeRegistry = parseNodeRegistryKeys(workflowTypes);
    const engineCases = parseWorkflowEngineCases(workflowEngine);
    const executorKeys = parseExecutorRegistryKeys(executorRegistry);

    test('NodeType list has no duplicates', () => {
        const raw = Array.from(workflowTypes.matchAll(/export type NodeType\s*=\s*([^;]+);/s));
        const block = raw[0]?.[1] || '';
        const all = Array.from(block.matchAll(/'([^']+)'/g)).map(m => m[1]);
        const seen = new Set<string>();
        const dups = new Set<string>();
        for (const n of all) {
            if (seen.has(n)) dups.add(n);
            seen.add(n);
        }
        expect(Array.from(dups)).toEqual([]);
    });

    test('All NodeTypes exist in NODE_REGISTRY', () => {
        const missing = nodeTypes.filter(n => !nodeRegistry.includes(n));
        expect(missing).toEqual([]);
    });

    test('All NodeTypes are handled in WorkflowEngine switch', () => {
        const missing = nodeTypes.filter(n => !engineCases.includes(n));
        expect(missing).toEqual([]);
    });

    test('ExecutorRegistry keys are valid NodeTypes', () => {
        const unknown = executorKeys.filter(n => !nodeTypes.includes(n));
        expect(unknown).toEqual([]);
    });

    test('NODE_REGISTRY keys are valid NodeTypes', () => {
        const unknown = nodeRegistry.filter(n => !nodeTypes.includes(n));
        expect(unknown).toEqual([]);
    });
});
