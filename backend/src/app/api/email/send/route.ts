
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    let smtpConfig: any;
    try {
        const body = await request.json();
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

        if (!to || !subject || (!html && !text)) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

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
                host: smtpConfig.host || 'smtp.gmail.com', // Default to Gmail if not specified, but should be
                port: Number(smtpConfig.port) || 587,
                secure: smtpConfig.secure === true, // Explicit check
                auth: {
                    user: smtpConfig.user,
                    pass: smtpConfig.pass,
                },
                tls: {
                    rejectUnauthorized: false // Often needed for some SMTP servers/localhost testing
                }
            };
        }

        console.log('[Email Route] Using Transport Config:', {
            host: transportConfig.host,
            port: transportConfig.port,
            secure: transportConfig.secure,
            hasAuth: !!transportConfig.auth?.user
        });

        const transposter = nodemailer.createTransport(transportConfig);

        const info = await transposter.sendMail({
            from: smtpConfig?.from || process.env.SMTP_FROM || '"BreviAI" <no-reply@breviai.com>',
            to,
            subject,
            text,
            html,
            attachments,
        });

        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Email sending failed:', error);

        // Debug info about what config was attempted
        const debugInfo = {
            message: error instanceof Error ? error.message : String(error),
            configSource: (smtpConfig && smtpConfig.user && smtpConfig.pass) ? 'Custom SMTP (App Password)' : 'Default ENV',
            receivedSmtpConfig: !!smtpConfig,
            receivedUser: !!smtpConfig?.user,
            receivedPass: !!smtpConfig?.pass
        };

        return NextResponse.json(
            { error: 'Email sending failed', details: JSON.stringify(debugInfo) },
            { status: 500 }
        );
    }
}
