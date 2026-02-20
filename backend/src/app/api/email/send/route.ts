
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { apiError, createRequestId, createSuccessPayload } from '@/lib/api/response';
import { ValidationException, parseJsonBody } from '@/lib/api/validation';
import { buildRateLimitHeaders, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { runWithIdempotency } from '@/lib/api/idempotency';
import { recordExecution } from '@/lib/api/execution-history';
import { RetryQueue } from '@/lib/api/retry-queue';
import { verifyAppSecret as verifyAppSecretAuth } from '@/lib/api/auth';
import {
    createOutboxItem,
    markOutboxFailed,
    markOutboxProcessing,
    markOutboxSent,
} from '@/lib/api/outbox';

const sendEmailSchema = z
    .object({
        to: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
        subject: z.string().trim().min(1).max(255),
        html: z.string().optional(),
        text: z.string().optional(),
        attachments: z.any().optional(),
        smtpConfig: z.any().optional(),
    })
    .refine((data) => !!data.html || !!data.text, {
        message: 'Either html or text is required',
        path: ['html'],
    });

const emailSendQueue = new RetryQueue({ name: 'email-send', concurrency: 2 });

export async function POST(request: Request) {
    const requestId = createRequestId('email');
    const startedAt = Date.now();
    const ip = getClientIp(request);
    const auth = verifyAppSecretAuth(request);
    if (!auth.ok) {
        recordExecution({
            route: '/api/email/send',
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
        });
    }

    const rateLimit = checkRateLimit({
        key: `api:email_send:${ip}`,
        limit: 40,
        windowMs: 60_000,
    });
    const rateHeaders = buildRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
        recordExecution({
            route: '/api/email/send',
            method: 'POST',
            statusCode: 429,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'RATE_LIMITED',
            errorMessage: 'Too many email requests',
        });
        return apiError('Too many requests', {
            status: 429,
            code: 'RATE_LIMITED',
            requestId,
            headers: rateHeaders,
        });
    }

    let smtpConfig: Record<string, unknown> | undefined;
    try {
        const body = await parseJsonBody(request, sendEmailSchema);
        const { to, subject, html, text, attachments } = body;
        smtpConfig = body.smtpConfig;

        console.log('[Email Route] Received Request:', {
            to,
            subject,
            hasAttachments: !!attachments,
            hasSmtpConfig: !!smtpConfig,
            smtpUser: smtpConfig?.user ? 'HIDDEN' : 'MISSING',
            smtpHost: smtpConfig?.host
        });
        const idempotentResult = await runWithIdempotency({
            request,
            scope: 'email_send',
            ttlMs: 20 * 60 * 1000,
            handler: async () => {
                const outboxEntry = createOutboxItem({
                    channel: 'email',
                    requestId,
                    payloadMeta: {
                        to,
                        subject,
                    },
                });
                let transportConfig: any = {
                    host: process.env.SMTP_HOST,
                    port: Number(process.env.SMTP_PORT) || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                };

                // If custom SMTP config is provided (for App Passwords)
                if (smtpConfig && smtpConfig.user && smtpConfig.pass) {
                    transportConfig = {
                        host: smtpConfig.host || 'smtp.gmail.com',
                        port: Number(smtpConfig.port) || 587,
                        secure: smtpConfig.secure === true,
                        auth: {
                            user: smtpConfig.user,
                            pass: smtpConfig.pass,
                        },
                        tls: {
                            rejectUnauthorized: false,
                        },
                    };
                }

                console.log('[Email Route] Using Transport Config:', {
                    host: transportConfig.host,
                    port: transportConfig.port,
                    secure: transportConfig.secure,
                    hasAuth: !!transportConfig.auth?.user,
                });

                const transporter = nodemailer.createTransport(transportConfig);
                markOutboxProcessing(outboxEntry.id);

                let info: Awaited<ReturnType<typeof transporter.sendMail>>;
                try {
                    info = await emailSendQueue.enqueue(
                        () =>
                            transporter.sendMail({
                                from:
                                    (smtpConfig as any)?.from ||
                                    process.env.SMTP_FROM ||
                                    '"BreviAI" <no-reply@breviai.com>',
                                to,
                                subject,
                                text,
                                html,
                                attachments,
                            }),
                        {
                            retries: 2,
                            baseDelayMs: 700,
                            maxDelayMs: 5000,
                            timeoutMs: 20_000,
                        }
                    );
                } catch (sendError) {
                    markOutboxFailed(
                        outboxEntry.id,
                        sendError instanceof Error ? sendError.message : String(sendError)
                    );
                    throw sendError;
                }

                markOutboxSent(outboxEntry.id, {
                    messageId: info.messageId,
                });

                return {
                    status: 200,
                    body: createSuccessPayload(
                        {
                            messageId: info.messageId,
                            outboxId: outboxEntry.id,
                            deliveryStatus: 'sent',
                            queue: emailSendQueue.getStats(),
                        },
                        {
                            code: 'EMAIL_SENT',
                            requestId,
                            message: 'Email sent successfully',
                        }
                    ),
                };
            },
        });

        recordExecution({
            route: '/api/email/send',
            method: 'POST',
            statusCode: idempotentResult.result.status,
            success: true,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            meta: {
                idempotencyStatus: idempotentResult.status,
                queue: emailSendQueue.getStats(),
            },
        });

        return NextResponse.json(idempotentResult.result.body, {
            status: idempotentResult.result.status,
            headers: {
                ...rateHeaders,
                'x-idempotency-status': idempotentResult.status,
            },
        });
    } catch (error) {
        if (error instanceof ValidationException) {
            recordExecution({
                route: '/api/email/send',
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
                headers: rateHeaders,
            });
        }

        console.error('Email sending failed:', error);

        // Debug info about what config was attempted
        const debugInfo = {
            message: error instanceof Error ? error.message : String(error),
            configSource:
                smtpConfig && smtpConfig.user && smtpConfig.pass
                    ? 'Custom SMTP (App Password)'
                    : 'Default ENV',
            receivedSmtpConfig: !!smtpConfig,
            receivedUser: !!smtpConfig?.user,
            receivedPass: !!smtpConfig?.pass,
            queue: emailSendQueue.getStats(),
        };

        recordExecution({
            route: '/api/email/send',
            method: 'POST',
            statusCode: 500,
            success: false,
            durationMs: Date.now() - startedAt,
            requestId,
            ip,
            errorCode: 'EMAIL_SEND_FAILED',
            errorMessage: debugInfo.message,
        });

        return apiError('Email sending failed', {
            status: 500,
            code: 'EMAIL_SEND_FAILED',
            details: debugInfo,
            requestId,
            headers: rateHeaders,
        });
    }
}
