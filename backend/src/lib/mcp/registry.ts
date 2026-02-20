import { supabase } from '@/lib/supabase';
import { searchWeb } from '@/lib/search';
import type {
    McpCallContext,
    McpToolDescriptor,
    McpToolRegistration,
    McpToolResult,
} from '@/lib/mcp/types';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

function normalizeLimit(raw: unknown, fallback = DEFAULT_LIMIT, max = MAX_LIMIT) {
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value)) return fallback;
    return Math.max(1, Math.min(max, Math.floor(value)));
}

function toolError(message: string, details?: Record<string, unknown>): McpToolResult {
    return {
        isError: true,
        content: [
            { type: 'text', text: message },
            { type: 'json', json: { error: message, ...(details || {}) } },
        ],
    };
}

const TOOL_REGISTRY: Record<string, McpToolRegistration> = {
    'breviai.web_search': {
        descriptor: {
            name: 'breviai.web_search',
            title: 'Web Search',
            description: 'Search the web and return concise result objects.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query' },
                    limit: { type: 'number', minimum: 1, maximum: 20, default: 5 },
                },
                required: ['query'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const query = String(args.query || '').trim();
            if (!query) {
                return toolError('query is required', { requestId: context.requestId });
            }

            const limit = normalizeLimit(args.limit, DEFAULT_LIMIT, MAX_LIMIT);
            const results = (await searchWeb(query)).slice(0, limit).map((item) => ({
                title: item.title,
                url: item.url,
                snippet: item.snippet,
                source: item.source,
            }));

            return {
                content: [
                    {
                        type: 'json',
                        json: {
                            query,
                            count: results.length,
                            results,
                        },
                    },
                    {
                        type: 'text',
                        text: `Found ${results.length} web results for "${query}".`,
                    },
                ],
                metadata: {
                    requestId: context.requestId,
                    readOnly: true,
                    tool: 'breviai.web_search',
                },
            };
        },
    },
    'breviai.list_templates': {
        descriptor: {
            name: 'breviai.list_templates',
            title: 'List Templates',
            description: 'List BreviAI workflow templates with optional category filter.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    category: { type: 'string', description: 'Optional category filter' },
                    limit: { type: 'number', minimum: 1, maximum: 50, default: 10 },
                },
                required: [],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const categoryRaw = String(args.category || '').trim();
            const category = categoryRaw.toLowerCase() === 'all' ? '' : categoryRaw;
            const limit = normalizeLimit(args.limit, 10, 50);

            let query = supabase
                .from('templates')
                .select('id,title,description,category,author,downloads,tags,created_at')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (category) {
                query = query.eq('category', category);
            }

            const { data, error } = await query;
            if (error) {
                return toolError('Template query failed', {
                    requestId: context.requestId,
                    details: error.message,
                });
            }

            const templates = (data || []).map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                category: item.category,
                author: item.author,
                downloads: item.downloads,
                tags: item.tags,
                created_at: item.created_at,
            }));

            return {
                content: [
                    {
                        type: 'json',
                        json: {
                            count: templates.length,
                            category: category || 'all',
                            templates,
                        },
                    },
                    {
                        type: 'text',
                        text: `Listed ${templates.length} templates.`,
                    },
                ],
                metadata: {
                    requestId: context.requestId,
                    readOnly: true,
                    tool: 'breviai.list_templates',
                },
            };
        },
    },
};

export function listMcpTools(): McpToolDescriptor[] {
    return Object.values(TOOL_REGISTRY)
        .map((entry) => entry.descriptor)
        .sort((a, b) => a.name.localeCompare(b.name));
}

export async function executeMcpTool(
    toolName: string,
    args: Record<string, unknown>,
    context: McpCallContext
): Promise<McpToolResult> {
    const registration = TOOL_REGISTRY[toolName];
    if (!registration) {
        return toolError(`Unknown tool: ${toolName}`, { requestId: context.requestId });
    }
    return registration.handler(args, context);
}
