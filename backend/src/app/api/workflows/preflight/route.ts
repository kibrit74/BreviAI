import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiSuccess, createRequestId } from '@/lib/api/response';
import { ValidationException, parseJsonBody } from '@/lib/api/validation';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { runWorkflowPreflight } from '@/lib/workflows/preflight';
import { recordExecution } from '@/lib/api/execution-history';
import { getWorkflowReliability } from '@/lib/workflows/reliability';
import { verifyAppSecret as verifyAppSecretAuth } from '@/lib/api/auth';

const preflightSchema = z.object({
    workflow: z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        nodes: z.array(z.record(z.any())).default([]),
        edges: z.array(z.record(z.any())).optional().default([]),
    }),
    variables: z.record(z.any()).optional(),
    permissions: z
        .object({
            notification: z.boolean().optional(),
            microphone: z.boolean().optional(),
            location: z.boolean().optional(),
            contacts: z.boolean().optional(),
            camera: z.boolean().optional(),
            accessibility: z.boolean().optional(),
            sms: z.boolean().optional(),
        })
        .optional(),
    integrations: z
        .object({
            googleConnected: z.boolean().optional(),
            outlookConnected: z.boolean().optional(),
            whatsappConnected: z.boolean().optional(),
            smtpConfigured: z.boolean().optional(),
        })
        .optional(),
});

export async function POST(request: NextRequest) {
    const requestId = createRequestId('preflight');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit({
        key: `api:workflow_preflight:${ip}`,
        limit: 120,
        windowMs: 60_000,
    });
    const rateHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        return apiError('Too many requests', {
            status: 429,
            code: 'RATE_LIMITED',
            requestId,
            headers: rateHeaders,
        });
    }

    const auth = verifyAppSecretAuth(request);
    if (!auth.ok) {
        return apiError(auth.message || 'Unauthorized', {
            status: auth.status || 401,
            code: auth.code || 'UNAUTHORIZED',
            requestId,
            headers: rateHeaders,
        });
    }

    try {
        const payload = await parseJsonBody(request, preflightSchema);
        const preflight = runWorkflowPreflight(payload);
        const workflowId = payload.workflow.id;
        const reliability = workflowId
            ? getWorkflowReliability({ workflowId, limit: 1 })[0] || null
            : null;

        recordExecution({
            route: '/api/workflows/preflight',
            method: 'POST',
            statusCode: 200,
            success: preflight.ready,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: preflight.ready ? undefined : 'PREFLIGHT_FAILED',
            errorMessage: preflight.ready ? undefined : preflight.summary,
            meta: {
                workflowId: payload.workflow.id,
                workflowName: payload.workflow.name,
                score: preflight.score,
                errors: preflight.errors.length,
                warnings: preflight.warnings.length,
            },
        });

        return apiSuccess(
            {
                workflowId: payload.workflow.id,
                workflowName: payload.workflow.name,
                preflight,
                reliability,
            },
            {
                requestId,
                code: 'WORKFLOW_PREFLIGHT_OK',
                headers: rateHeaders,
                message: preflight.summary,
            }
        );
    } catch (error) {
        if (error instanceof ValidationException) {
            return apiError(error.message, {
                status: error.status,
                code: error.code,
                details: error.details,
                requestId,
                headers: rateHeaders,
            });
        }
        const message = error instanceof Error ? error.message : 'Workflow preflight failed';
        recordExecution({
            route: '/api/workflows/preflight',
            method: 'POST',
            statusCode: 500,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'PREFLIGHT_EXCEPTION',
            errorMessage: message,
        });
        return apiError(message, {
            status: 500,
            code: 'PREFLIGHT_EXCEPTION',
            requestId,
            headers: rateHeaders,
        });
    }
}
