import nodemailer from 'nodemailer';

export type CredentialStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface CredentialCheckResult {
    id: string;
    name: string;
    status: CredentialStatus;
    message: string;
    details?: Record<string, unknown>;
}

export interface CredentialHealthSnapshot {
    id: string;
    timestamp: string;
    overallStatus: CredentialStatus;
    checks: CredentialCheckResult[];
}

declare global {
    var __breviaiCredentialHealthHistory: CredentialHealthSnapshot[] | undefined;
}

const healthHistory = globalThis.__breviaiCredentialHealthHistory || [];
if (!globalThis.__breviaiCredentialHealthHistory) {
    globalThis.__breviaiCredentialHealthHistory = healthHistory;
}

function createSnapshotId() {
    return `cred_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toBool(value?: string) {
    if (!value) return false;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function evaluateOverallStatus(checks: CredentialCheckResult[]): CredentialStatus {
    if (checks.some((check) => check.status === 'critical')) return 'critical';
    if (checks.some((check) => check.status === 'warning')) return 'warning';
    if (checks.some((check) => check.status === 'healthy')) return 'healthy';
    return 'unknown';
}

async function runSmtpProbe() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = toBool(process.env.SMTP_SECURE);

    if (!host || !user || !pass) {
        return {
            status: 'warning' as const,
            message: 'SMTP probe atlandı: host/user/pass eksik.',
        };
    }

    try {
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            connectionTimeout: 7000,
            greetingTimeout: 7000,
            socketTimeout: 7000,
        });
        await transporter.verify();
        return {
            status: 'healthy' as const,
            message: 'SMTP canlı doğrulama başarılı.',
        };
    } catch (error) {
        return {
            status: 'critical' as const,
            message: error instanceof Error ? error.message : 'SMTP probe başarısız',
        };
    }
}

async function runWhatsAppProbe(url: string) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${url.replace(/\/$/, '')}/status`, {
            signal: controller.signal,
            headers: {
                'Bypass-Tunnel-Reminder': 'true',
                'ngrok-skip-browser-warning': 'true',
            },
        });
        clearTimeout(timeout);

        if (!response.ok) {
            return {
                status: 'warning' as const,
                message: `WhatsApp backend status HTTP ${response.status}`,
            };
        }

        return {
            status: 'healthy' as const,
            message: 'WhatsApp backend probe başarılı.',
        };
    } catch (error) {
        return {
            status: 'warning' as const,
            message: error instanceof Error ? error.message : 'WhatsApp probe başarısız',
        };
    }
}

export async function runCredentialHealthCheck(options?: {
    probe?: boolean;
}) {
    const probe = !!options?.probe;
    const checks: CredentialCheckResult[] = [];

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    checks.push({
        id: 'gemini_api_key',
        name: 'Gemini API',
        status: geminiKey ? 'healthy' : 'warning',
        message: geminiKey ? 'Gemini API key bulundu.' : 'Gemini API key eksik.',
    });

    const hasGoogleOAuth = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
    checks.push({
        id: 'google_oauth',
        name: 'Google OAuth',
        status: hasGoogleOAuth ? 'healthy' : 'warning',
        message: hasGoogleOAuth
            ? 'Google OAuth yapılandırması hazır.'
            : 'Google OAuth client bilgileri eksik.',
    });

    const hasOutlookOAuth = !!process.env.MICROSOFT_CLIENT_ID && !!process.env.MICROSOFT_CLIENT_SECRET;
    checks.push({
        id: 'outlook_oauth',
        name: 'Outlook OAuth',
        status: hasOutlookOAuth ? 'healthy' : 'warning',
        message: hasOutlookOAuth
            ? 'Outlook OAuth yapılandırması hazır.'
            : 'Outlook OAuth client bilgileri eksik.',
    });

    const hasSmtpConfig = !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
    checks.push({
        id: 'smtp_config',
        name: 'SMTP Config',
        status: hasSmtpConfig ? 'healthy' : 'warning',
        message: hasSmtpConfig ? 'SMTP konfigürasyonu mevcut.' : 'SMTP konfigürasyonu eksik.',
    });

    const whatsappBackendUrl = process.env.WHATSAPP_BACKEND_URL || process.env.WHATSAPP_SERVER_URL;
    checks.push({
        id: 'whatsapp_backend',
        name: 'WhatsApp Backend URL',
        status: whatsappBackendUrl ? 'healthy' : 'warning',
        message: whatsappBackendUrl
            ? 'WhatsApp backend URL bulundu.'
            : 'WhatsApp backend URL tanımlı değil.',
        details: whatsappBackendUrl ? { url: whatsappBackendUrl } : undefined,
    });

    if (probe) {
        const smtpProbe = await runSmtpProbe();
        checks.push({
            id: 'smtp_probe',
            name: 'SMTP Probe',
            status: smtpProbe.status,
            message: smtpProbe.message,
        });

        if (whatsappBackendUrl) {
            const waProbe = await runWhatsAppProbe(whatsappBackendUrl);
            checks.push({
                id: 'whatsapp_probe',
                name: 'WhatsApp Probe',
                status: waProbe.status,
                message: waProbe.message,
            });
        } else {
            checks.push({
                id: 'whatsapp_probe',
                name: 'WhatsApp Probe',
                status: 'unknown',
                message: 'WhatsApp probe atlandı: URL yok.',
            });
        }
    }

    const snapshot: CredentialHealthSnapshot = {
        id: createSnapshotId(),
        timestamp: new Date().toISOString(),
        overallStatus: evaluateOverallStatus(checks),
        checks,
    };

    healthHistory.unshift(snapshot);
    if (healthHistory.length > 200) {
        healthHistory.length = 200;
    }

    return snapshot;
}

export function getCredentialHealthHistory(limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    return healthHistory.slice(0, safeLimit);
}
