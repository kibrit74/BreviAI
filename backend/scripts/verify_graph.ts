
import { SEED_TEMPLATES } from '../src/data/seed_templates';

console.log('Verifying SEED_TEMPLATES graph connectivity...');

let hasErrors = false;

SEED_TEMPLATES.forEach(template => {
    const { id, template_json } = template;
    const { nodes, edges } = template_json;

    // Check for source/target usage
    const oldFormatEdges = edges.filter((e: any) => e.source || e.target);
    if (oldFormatEdges.length > 0) {
        console.error(`[${id}] Found edges with old 'source'/'target' format!`);
        hasErrors = true;
    }

    // Check for missing sourcePort
    const missingPortEdges = edges.filter((e: any) => !e.sourcePort);
    if (missingPortEdges.length > 0) {
        console.error(`[${id}] Found edges without 'sourcePort'!`);
        hasErrors = true;
    }

    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const edgesFrom = new Map<string, string[]>();
    const edgesTo = new Map<string, string[]>();

    edges.forEach((e: any) => {
        if (!nodeIds.has(e.sourceNodeId)) {
            console.error(`[${id}] Edge ${e.id} references missing sourceNodeId: ${e.sourceNodeId}`);
            hasErrors = true;
        }
        if (!nodeIds.has(e.targetNodeId)) {
            console.error(`[${id}] Edge ${e.id} references missing targetNodeId: ${e.targetNodeId}`);
            hasErrors = true;
        }

        if (!edgesFrom.has(e.sourceNodeId)) edgesFrom.set(e.sourceNodeId, []);
        edgesFrom.get(e.sourceNodeId)!.push(e.targetNodeId);

        if (!edgesTo.has(e.targetNodeId)) edgesTo.set(e.targetNodeId, []);
        edgesTo.get(e.targetNodeId)!.push(e.sourceNodeId);
    });

    // Check connectivity
    // All nodes except triggers (usually first node) should have incoming edges
    // Or at least, verify AGENT_AI nodes have incoming edges
    nodes.forEach((n: any) => {
        if (n.type === 'AGENT_AI') {
            if (!edgesTo.has(n.id) || edgesTo.get(n.id)!.length === 0) {
                console.error(`[${id}] AGENT_AI Node ${n.id} (${n.label}) is disconnected (No incoming edges)! Prompt: "${n.data.prompt.substring(0, 20)}..."`);
                hasErrors = true;
            }
        }
    });
});

if (hasErrors) {
    console.error('FAILED: Verification found errors.');
    process.exit(1);
} else {
    console.log('SUCCESS: All templates look valid.');
}
