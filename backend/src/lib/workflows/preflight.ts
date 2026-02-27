export interface PreflightIssue {
    severity: 'error' | 'warning';
    code: string;
    message: string;
    nodeId?: string;
    nodeType?: string;
    fix?: string;
}

export interface PreflightResult {
    ready: boolean;
    score: number;
    checkedAt: string;
    summary: string;
    errors: PreflightIssue[];
    warnings: PreflightIssue[];
    checks: {
        nodeCount: number;
        edgeCount: number;
        triggerPresent: boolean;
        duplicateNodeIds: number;
        invalidEdges: number;
        missingConfigFields: number;
        variableWarnings: number;
    };
}

interface PreflightInput {
    workflow: {
        id?: string;
        name?: string;
        nodes: Array<Record<string, any>>;
        edges?: Array<Record<string, any>>;
    };
    variables?: Record<string, unknown>;
    permissions?: {
        notification?: boolean;
        microphone?: boolean;
        location?: boolean;
        contacts?: boolean;
        camera?: boolean;
        accessibility?: boolean;
        sms?: boolean;
    };
    integrations?: {
        googleConnected?: boolean;
        outlookConnected?: boolean;
        whatsappConnected?: boolean;
        smtpConfigured?: boolean;
    };
}

const TRIGGER_NODE_TYPES = new Set([
    'MANUAL_TRIGGER',
    'TIME_TRIGGER',
    'NOTIFICATION_TRIGGER',
    'CALL_TRIGGER',
    'SMS_TRIGGER',
    'WHATSAPP_TRIGGER',
    'EMAIL_TRIGGER',
    'GESTURE_TRIGGER',
    'STEP_TRIGGER',
    'CHAT_INPUT_TRIGGER',
    'WEB_HOOK_TRIGGER',
    'GEOFENCE_TRIGGER',
    'GEOFENCE_ENTER_TRIGGER',
    'GEOFENCE_EXIT_TRIGGER',
]);

const BUILT_IN_VARIABLES = new Set([
    '_triggerType',
    '_triggerTime',
    '_currentDate',
    '_currentTime',
    '_currentMonth',
    '_currentYear',
    'triggerMessage',
    'previous_output',
    'senderName',
]);

const REQUIRED_FIELDS_BY_NODE: Record<string, string[]> = {
    HTTP_REQUEST: ['url'],
    SMS_SEND: ['phoneNumber', 'message'],
    WHATSAPP_SEND: ['phoneNumber', 'message'],
    EMAIL_SEND: ['to', 'subject'],
    GMAIL_SEND: ['to', 'subject'],
    OUTLOOK_SEND: ['to', 'subject'],
    WEB_AUTOMATION: ['url'],
    IMAGE_GENERATOR: ['prompt'],
    DB_READ: ['tableName'],
    DB_WRITE: ['tableName'],
    FILE_WRITE: ['filename', 'content'],
    LOCATION_GET: [],
};

const REQUIRED_ANY_FIELD_BY_NODE: Record<string, string[]> = {
    APP_LAUNCH: ['packageName', 'appName'],
};

const PERMISSION_BY_NODE: Record<string, keyof NonNullable<PreflightInput['permissions']>> = {
    NOTIFICATION_TRIGGER: 'notification',
    SMS_TRIGGER: 'sms',
    SMS_SEND: 'sms',
    CAMERA_CAPTURE: 'camera',
    LOCATION_GET: 'location',
    GEOFENCE_ENTER_TRIGGER: 'location',
    GEOFENCE_EXIT_TRIGGER: 'location',
    CONTACTS_READ: 'contacts',
    CONTACTS_WRITE: 'contacts',
    SPEECH_TO_TEXT: 'microphone',
};

const INTEGRATION_BY_NODE: Record<string, keyof NonNullable<PreflightInput['integrations']>> = {
    GMAIL_SEND: 'googleConnected',
    GMAIL_READ: 'googleConnected',
    SHEETS_READ: 'googleConnected',
    SHEETS_WRITE: 'googleConnected',
    SHEETS_CREATE: 'googleConnected',
    DRIVE_UPLOAD: 'googleConnected',
    OUTLOOK_SEND: 'outlookConnected',
    OUTLOOK_READ: 'outlookConnected',
    EXCEL_READ: 'outlookConnected',
    EXCEL_WRITE: 'outlookConnected',
    EXCEL_CREATE: 'outlookConnected',
    ONEDRIVE_UPLOAD: 'outlookConnected',
    ONEDRIVE_DOWNLOAD: 'outlookConnected',
    ONEDRIVE_LIST: 'outlookConnected',
    WHATSAPP_SEND: 'whatsappConnected',
    EMAIL_SEND: 'smtpConfigured',
};

const API_KEY_REQUIREMENTS: Record<string, string[]> = {
    AGENT_AI: ['GEMINI_API_KEY|OPENAI_API_KEY|CLAUDE_API_KEY'],
    AI_PROCESSOR: ['GEMINI_API_KEY|OPENAI_API_KEY|CLAUDE_API_KEY'],
    IMAGE_GENERATOR: ['GEMINI_API_KEY|OPENAI_API_KEY'],
    WEATHER_GET: ['OPENWEATHER_API_KEY'],
};

function getNodeConfig(node: Record<string, any>) {
    if (node.config && typeof node.config === 'object') return node.config;
    if (node.data && typeof node.data === 'object') return node.data;
    return {};
}

function extractVariableRefs(value: unknown, collector: Set<string>) {
    if (typeof value === 'string') {
        const regex = /{{\s*([A-Za-z0-9_.$-]+)\s*}}/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(value)) !== null) {
            const raw = match[1] || '';
            const key = raw.split('.')[0];
            if (key) collector.add(key);
        }
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item) => extractVariableRefs(item, collector));
        return;
    }

    if (value && typeof value === 'object') {
        Object.values(value as Record<string, unknown>).forEach((nested) =>
            extractVariableRefs(nested, collector)
        );
    }
}

function issue(params: PreflightIssue): PreflightIssue {
    return params;
}

export function runWorkflowPreflight(input: PreflightInput): PreflightResult {
    const errors: PreflightIssue[] = [];
    const warnings: PreflightIssue[] = [];
    const workflow = input.workflow;
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];
    const variableSet = new Set(Object.keys(input.variables || {}));

    if (!nodes.length) {
        errors.push(
            issue({
                severity: 'error',
                code: 'WORKFLOW_EMPTY',
                message: 'Workflow içinde en az bir node olmalı.',
                fix: 'En az bir trigger ve bir aksiyon node ekleyin.',
            })
        );
    }

    const triggerPresent = nodes.some((node) => TRIGGER_NODE_TYPES.has(String(node.type || '')));
    if (!triggerPresent) {
        errors.push(
            issue({
                severity: 'error',
                code: 'TRIGGER_MISSING',
                message: 'Workflow içinde trigger node bulunamadı.',
                fix: 'MANUAL_TRIGGER veya diğer tetikleyici node’lardan birini ekleyin.',
            })
        );
    }

    const nodeIdSet = new Set<string>();
    let duplicateNodeIds = 0;
    for (const node of nodes) {
        const nodeId = String(node.id || '').trim();
        if (!nodeId) {
            errors.push(
                issue({
                    severity: 'error',
                    code: 'NODE_ID_MISSING',
                    message: 'Node id boş olamaz.',
                    nodeType: String(node.type || ''),
                    fix: 'Her node için benzersiz bir id üretin.',
                })
            );
            continue;
        }
        if (nodeIdSet.has(nodeId)) {
            duplicateNodeIds += 1;
            errors.push(
                issue({
                    severity: 'error',
                    code: 'NODE_ID_DUPLICATE',
                    message: `Tekrarlanan node id: ${nodeId}`,
                    nodeId,
                    nodeType: String(node.type || ''),
                    fix: 'Node id değerlerini benzersiz yapın.',
                })
            );
            continue;
        }
        nodeIdSet.add(nodeId);
    }

    let invalidEdges = 0;
    for (const edge of edges) {
        const sourceId = String(edge.sourceNodeId || edge.source || '');
        const targetId = String(edge.targetNodeId || edge.target || '');
        if (!sourceId || !targetId || !nodeIdSet.has(sourceId) || !nodeIdSet.has(targetId)) {
            invalidEdges += 1;
            errors.push(
                issue({
                    severity: 'error',
                    code: 'EDGE_INVALID',
                    message: `Geçersiz edge bağlantısı: ${sourceId || '(boş)'} -> ${targetId || '(boş)'}`,
                    fix: 'Edge source/target node id değerlerinin workflow içindeki node id’lerle eşleştiğini doğrulayın.',
                })
            );
        }
    }

    let missingConfigFields = 0;
    let variableWarnings = 0;

    for (const node of nodes) {
        const nodeType = String(node.type || '');
        const nodeId = String(node.id || '');
        const config = getNodeConfig(node);

        const requiredFields = REQUIRED_FIELDS_BY_NODE[nodeType] || [];
        for (const field of requiredFields) {
            const value = config[field];
            const missing =
                value === undefined ||
                value === null ||
                (typeof value === 'string' && value.trim().length === 0);
            if (missing) {
                missingConfigFields += 1;
                errors.push(
                    issue({
                        severity: 'error',
                        code: 'CONFIG_FIELD_MISSING',
                        message: `${nodeType} için '${field}' alanı zorunlu.`,
                        nodeId,
                        nodeType,
                        fix: `${field} alanını doldurun.`,
                    })
                );
            }
        }

        const requiredAnyFields = REQUIRED_ANY_FIELD_BY_NODE[nodeType] || [];
        if (requiredAnyFields.length > 0) {
            const hasAnyField = requiredAnyFields.some((field) => {
                const value = config[field];
                return !(
                    value === undefined ||
                    value === null ||
                    (typeof value === 'string' && value.trim().length === 0)
                );
            });

            if (!hasAnyField) {
                missingConfigFields += 1;
                errors.push(
                    issue({
                        severity: 'error',
                        code: 'CONFIG_FIELD_MISSING',
                        message: `${nodeType} iÃ§in en az bir alan zorunlu: ${requiredAnyFields.join(' | ')}.`,
                        nodeId,
                        nodeType,
                        fix: `${requiredAnyFields.join(' veya ')} alanlarÄ±ndan birini doldurun.`,
                    })
                );
            }
        }

        const permissionKey = PERMISSION_BY_NODE[nodeType];
        if (permissionKey) {
            const permissionValue = input.permissions?.[permissionKey];
            if (permissionValue === false) {
                errors.push(
                    issue({
                        severity: 'error',
                        code: 'PERMISSION_MISSING',
                        message: `${nodeType} için '${permissionKey}' izni kapalı.`,
                        nodeId,
                        nodeType,
                        fix: `${permissionKey} iznini aktif edin.`,
                    })
                );
            } else if (permissionValue === undefined) {
                warnings.push(
                    issue({
                        severity: 'warning',
                        code: 'PERMISSION_UNKNOWN',
                        message: `${nodeType} için '${permissionKey}' izin durumu bilinmiyor.`,
                        nodeId,
                        nodeType,
                        fix: 'Çalıştırma öncesi cihaz izin durumunu doğrulayın.',
                    })
                );
            }
        }

        let integrationKey: keyof NonNullable<PreflightInput['integrations']> | undefined =
            INTEGRATION_BY_NODE[nodeType];

        if (!integrationKey && nodeType === 'MCP_TOOL') {
            const toolName = String(config.toolName || '').trim().toLowerCase();
            if (toolName.startsWith('breviai.google.')) {
                integrationKey = 'googleConnected';
            } else if (toolName.startsWith('breviai.microsoft.')) {
                integrationKey = 'outlookConnected';
            }
        }

        if (integrationKey) {
            const integrationValue = input.integrations?.[integrationKey];
            if (integrationValue === false) {
                errors.push(
                    issue({
                        severity: 'error',
                        code: 'INTEGRATION_NOT_CONNECTED',
                        message: `${nodeType} için '${integrationKey}' bağlantısı aktif değil.`,
                        nodeId,
                        nodeType,
                        fix: 'İlgili entegrasyon hesabını yeniden bağlayın.',
                    })
                );
            } else if (integrationValue === undefined) {
                warnings.push(
                    issue({
                        severity: 'warning',
                        code: 'INTEGRATION_UNKNOWN',
                        message: `${nodeType} için '${integrationKey}' bağlantı durumu bilinmiyor.`,
                        nodeId,
                        nodeType,
                        fix: 'Çalıştırmadan önce entegrasyon bağlantısını test edin.',
                    })
                );
            }
        }

        const keyRequirements = API_KEY_REQUIREMENTS[nodeType] || [];
        for (const requirement of keyRequirements) {
            const keyGroup = requirement.split('|').map((item) => item.trim()).filter(Boolean);
            const hasAny = keyGroup.some((key) => !!process.env[key] || variableSet.has(key));
            if (!hasAny) {
                warnings.push(
                    issue({
                        severity: 'warning',
                        code: 'API_KEY_MISSING',
                        message: `${nodeType} için API key bulunamadı (${requirement}).`,
                        nodeId,
                        nodeType,
                        fix: `Ayarlara '${requirement}' anahtarlarından en az birini ekleyin.`,
                    })
                );
            }
        }

        const variableRefs = new Set<string>();
        extractVariableRefs(config, variableRefs);
        variableRefs.forEach((variableRef) => {
            if (BUILT_IN_VARIABLES.has(variableRef)) return;
            if (!variableSet.has(variableRef)) {
                variableWarnings += 1;
                warnings.push(
                    issue({
                        severity: 'warning',
                        code: 'VARIABLE_UNRESOLVED',
                        message: `${nodeType} içinde '${variableRef}' değişkeni tanımlı değil.`,
                        nodeId,
                        nodeType,
                        fix: `Workflow variable set içine '${variableRef}' değişkenini ekleyin.`,
                    })
                );
            }
        });
    }

    const score = Math.max(0, Math.min(100, 100 - errors.length * 12 - warnings.length * 4));
    const ready = errors.length === 0;
    const summary = ready
        ? 'Workflow preflight kontrolünden geçti.'
        : `Workflow preflight başarısız: ${errors.length} hata, ${warnings.length} uyarı.`;

    return {
        ready,
        score,
        checkedAt: new Date().toISOString(),
        summary,
        errors,
        warnings,
        checks: {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            triggerPresent,
            duplicateNodeIds,
            invalidEdges,
            missingConfigFields,
            variableWarnings,
        },
    };
}
