export type McpJsonSchema = {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
};

export interface McpToolDescriptor {
    name: string;
    title: string;
    description: string;
    readOnly: boolean;
    inputSchema: McpJsonSchema;
}

export interface McpCallContext {
    requestId: string;
    ip: string;
}

export interface McpToolResult {
    isError?: boolean;
    content: Array<
        | { type: 'text'; text: string }
        | { type: 'json'; json: unknown }
    >;
    metadata?: Record<string, unknown>;
}

export type McpToolHandler = (
    args: Record<string, unknown>,
    context: McpCallContext
) => Promise<McpToolResult>;

export interface McpToolRegistration {
    descriptor: McpToolDescriptor;
    handler: McpToolHandler;
}
