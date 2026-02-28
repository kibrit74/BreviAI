import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAppSecret as verifyAppSecretAuth } from '@/lib/api/auth';
import { recordExecution } from '@/lib/api/execution-history';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { apiError, apiSuccess, createRequestId } from '@/lib/api/response';
import { ValidationException, parseJsonBody } from '@/lib/api/validation';
import { executeMcpTool, listMcpTools } from '@/lib/mcp/registry';

const corsHeaders = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-secret, idempotency-key',
};

const listToolsSchema = z.object({
    action: z.literal('list_tools'),
});

const callToolSchema = z.object({
    action: z.literal('call_tool'),
    toolName: z.string().trim().min(1),
    arguments: z.record(z.unknown()).optional().default({}),
});

const mcpActionSchema = z.union([listToolsSchema, callToolSchema]);

function buildHeaders(rateHeaders: Record<string, string>) {
    return {
        ...corsHeaders,
        ...rateHeaders,
    };
}

function buildCapabilities() {
    return {
        protocol: 'breviai-mcp-pilot-v1',
        server: {
            name: 'BreviAI MCP Gateway',
            version: '0.1.0',
        },
        capabilities: {
            tools: {
                listChanged: false,
            },
            transport: ['http-json'],
        },
    };
}

export async function GET(request: NextRequest) {
    const requestId = createRequestId('mcp');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const auth = verifyAppSecretAuth(request);
    if (!auth.ok) {
        recordExecution({
            route: '/api/mcp',
            method: 'GET',
            statusCode: auth.status || 401,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: auth.code || 'UNAUTHORIZED',
            errorMessage: auth.message || 'Unauthorized',
        });
        return apiError(auth.message || 'Unauthorized', {
            status: auth.status || 401,
            code: auth.code || 'UNAUTHORIZED',
            requestId,
            headers: corsHeaders,
        });
    }

    const rateLimit = checkRateLimit({
        key: `api:mcp:get:${ip}`,
        limit: 120,
        windowMs: 60_000,
    });
    const rateHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        recordExecution({
            route: '/api/mcp',
            method: 'GET',
            statusCode: 429,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'RATE_LIMITED',
            errorMessage: 'Too many MCP requests',
        });
        return apiError('Too many requests', {
            status: 429,
            code: 'RATE_LIMITED',
            requestId,
            headers: buildHeaders(rateHeaders),
        });
    }

    const tools = listMcpTools();

    recordExecution({
        route: '/api/mcp',
        method: 'GET',
        statusCode: 200,
        success: true,
        durationMs: Date.now() - startedAt,
        requestId,
        ip,
        meta: { action: 'list_tools', count: tools.length },
    });

    return apiSuccess(
        {
            ...buildCapabilities(),
            tools,
        },
        {
            requestId,
            code: 'MCP_READY',
            headers: buildHeaders(rateHeaders),
        }
    );
}

export async function POST(request: NextRequest) {
    const requestId = createRequestId('mcp');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const auth = verifyAppSecretAuth(request);
    if (!auth.ok) {
        recordExecution({
            route: '/api/mcp',
            method: 'POST',
            statusCode: auth.status || 401,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: auth.code || 'UNAUTHORIZED',
            errorMessage: auth.message || 'Unauthorized',
        });
        return apiError(auth.message || 'Unauthorized', {
            status: auth.status || 401,
            code: auth.code || 'UNAUTHORIZED',
            requestId,
            headers: corsHeaders,
        });
    }

    const rateLimit = checkRateLimit({
        key: `api:mcp:post:${ip}`,
        limit: 90,
        windowMs: 60_000,
    });
    const rateHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        recordExecution({
            route: '/api/mcp',
            method: 'POST',
            statusCode: 429,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'RATE_LIMITED',
            errorMessage: 'Too many MCP tool calls',
        });
        return apiError('Too many requests', {
            status: 429,
            code: 'RATE_LIMITED',
            requestId,
            headers: buildHeaders(rateHeaders),
        });
    }

    try {
        const action = await parseJsonBody(request, mcpActionSchema);

        if (action.action === 'list_tools') {
            const tools = listMcpTools();
            recordExecution({
                route: '/api/mcp',
                method: 'POST',
                statusCode: 200,
                success: true,
                durationMs: Date.now() - startedAt,
                requestId,
                ip,
                meta: { action: 'list_tools', count: tools.length },
            });
            return apiSuccess(
                {
                    ...buildCapabilities(),
                    tools,
                },
                {
                    requestId,
                    code: 'MCP_TOOLS_LISTED',
                    headers: buildHeaders(rateHeaders),
                }
            );
        }

        const result = await executeMcpTool(action.toolName, action.arguments || {}, {
            requestId,
            ip,
        });

        if (result.isError) {
            const textContent = result.content.find(
                (item): item is { type: 'text'; text: string } => item.type === 'text'
            );
            const errorText = textContent?.text || 'MCP tool execution failed';
            recordExecution({
                route: '/api/mcp',
                method: 'POST',
                statusCode: 400,
                success: false,
                durationMs: Date.now() - startedAt,
                requestId,
                ip,
                errorCode: 'MCP_TOOL_ERROR',
                errorMessage: errorText,
                meta: { action: 'call_tool', toolName: action.toolName },
            });
            return apiError(errorText, {
                status: 400,
                code: 'MCP_TOOL_ERROR',
                requestId,
                details: result,
                headers: buildHeaders(rateHeaders),
            });
        }

        recordExecution({
            route: '/api/mcp',
            method: 'POST',
            statusCode: 200,
            success: true,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            meta: { action: 'call_tool', toolName: action.toolName },
        });
        return apiSuccess(
            {
                ...buildCapabilities(),
                toolName: action.toolName,
                result,
            },
            {
                requestId,
                code: 'MCP_TOOL_EXECUTED',
                headers: buildHeaders(rateHeaders),
            }
        );
    } catch (error) {
        if (error instanceof ValidationException) {
            recordExecution({
                route: '/api/mcp',
                method: 'POST',
                statusCode: error.status,
                success: false,
                durationMs: Date.now() - startedAt,
                requestId,
                ip,
                errorCode: error.code,
                errorMessage: error.message,
            });
            return apiError(error.message, {
                status: error.status,
                code: error.code,
                details: error.details,
                requestId,
                headers: buildHeaders(rateHeaders),
            });
        }

        const message = error instanceof Error ? error.message : 'MCP request failed';
        recordExecution({
            route: '/api/mcp',
            method: 'POST',
            statusCode: 500,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'MCP_INTERNAL_ERROR',
            errorMessage: message,
        });
        return apiError(message, {
            status: 500,
            code: 'MCP_INTERNAL_ERROR',
            requestId,
            headers: buildHeaders(rateHeaders),
        });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}
