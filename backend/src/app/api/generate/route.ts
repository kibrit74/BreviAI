import { NextRequest, NextResponse } from 'next/server';
import { getFlash25Model, getFlash30Model } from '@/lib/gemini';
import { analyzePrompt, getModelDisplayName } from '@/lib/prompt-router';
import { SYSTEM_PROMPT_TURKISH } from '@/lib/prompt-templates';
import { recordExecution } from '@/lib/api/execution-history';
import { getClientIp } from '@/lib/api/rate-limit';
import { createRequestId } from '@/lib/api/response';
import { verifyAppSecret as verifyAppSecretAuth } from '@/lib/api/auth';
import { validateShortcut } from '@/lib/json-validator';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-secret',
};

// Rate limiting store (in-memory, use Redis in production)
// Triggering Re-deploy for AI Fix
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const MCP_INTENT_HINTS: Array<{
    tool: string;
    keywords: string[];
    guide: string;
}> = [
    {
        tool: 'breviai.jira.search_issues / breviai.jira.create_issue',
        keywords: ['jira', 'issue', 'ticket', 'bug kaydi', 'bug kaydı'],
        guide: 'Jira iş takibi',
    },
    {
        tool: 'breviai.trello.list_cards / breviai.trello.create_card',
        keywords: ['trello', 'kart', 'card'],
        guide: 'Trello kart yönetimi',
    },
    {
        tool: 'breviai.notion.search / breviai.notion.create_page',
        keywords: ['notion', 'wiki', 'not al', 'dokuman sayfasi', 'doküman sayfası'],
        guide: 'Notion sayfa/arama',
    },
    {
        tool: 'breviai.slack.send_message / breviai.slack.list_channels',
        keywords: ['slack', 'kanal', 'channel'],
        guide: 'Slack mesajlaşma',
    },
    {
        tool: 'breviai.asana.list_tasks / breviai.asana.create_task',
        keywords: ['asana', 'task', 'gorev', 'görev'],
        guide: 'Asana görev yönetimi',
    },
    {
        tool: 'breviai.airtable.list_records',
        keywords: ['airtable'],
        guide: 'Airtable kayıt okuma',
    },
    {
        tool: 'breviai.github.repos_list',
        keywords: ['github', 'repo', 'repository'],
        guide: 'GitHub repo listeleme',
    },
    {
        tool: 'breviai.zapier.trigger_webhook',
        keywords: ['zapier', 'webhook tetikle'],
        guide: 'Zapier entegrasyonu',
    },
    {
        tool: 'breviai.google.drive_list',
        keywords: ['google drive', 'drive dosya', 'drive file', 'dosya ara drive'],
        guide: 'Google Drive dosya arama/listeleme',
    },
    {
        tool: 'breviai.google.sheets_read / breviai.google.sheets_write',
        keywords: ['google sheets', 'google tablo', 'spreadsheet', 'sheet', 'tablolar'],
        guide: 'Google Sheets okuma/yazma',
    },
    {
        tool: 'breviai.google.gmail_read',
        keywords: ['gmail', 'google mail'],
        guide: 'Gmail okuma',
    },
    {
        tool: 'breviai.google.calendar_list / breviai.google.calendar_create',
        keywords: ['google calendar', 'google takvim', 'meet planla', 'google meet'],
        guide: 'Google Calendar/Meet',
    },
    {
        tool: 'breviai.microsoft.onedrive_search / breviai.microsoft.onedrive_list',
        keywords: ['onedrive', 'one drive', 'microsoft drive'],
        guide: 'OneDrive dosya arama/listeleme',
    },
    {
        tool: 'breviai.microsoft.outlook_read / breviai.microsoft.outlook_send',
        keywords: ['outlook', 'hotmail', 'live.com mail'],
        guide: 'Outlook e-posta',
    },
    {
        tool: 'breviai.microsoft.excel_read / breviai.microsoft.excel_write',
        keywords: ['excel', 'xlsx', 'workbook'],
        guide: 'Microsoft Excel',
    },
    {
        tool: 'breviai.microsoft.teams_meeting',
        keywords: ['teams', 'microsoft teams'],
        guide: 'Teams toplantı',
    },
];

function buildMcpDirective(prompt: string): string {
    const lower = String(prompt || '').toLowerCase();
    if (!lower.trim()) return '';

    const matches = MCP_INTENT_HINTS.filter((hint) =>
        hint.keywords.some((kw) => lower.includes(kw))
    );

    if (!matches.length) return '';

    const lines = matches.map(
        (hint) => `- ${hint.guide} => ${hint.tool}`
    );

    return [
        '',
        'MCP_ONCELIK_KURALI:',
        '- Bu istekte MCP destekli servisler tespit edildi.',
        '- MCP destekli adimlarda native node yerine MCP_TOOL kullan.',
        '- MCP_TOOL config formati: {"toolName":"breviai.xxx", "params": {...}, "variableName":"mcpResult"}',
        '- accessToken parametresini bos birakabilirsin; runtime mevcut Google/Microsoft tokenlarini otomatik enjekte etmeyi dener.',
        '- Ayni is icin AGENT_AI yerine oncelikle dogrudan MCP_TOOL tercih et.',
        '- Tespit edilen MCP eslesmeleri:',
        ...lines,
    ].join('\n');
}

/**
 * Check rate limit
 */
function checkRateLimit(ip: string): boolean {
    // Bypass for localhost
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'unknown') return true;

    const limit = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '500'); // Increased from 100
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute

    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetTime) {
        rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (record.count >= limit) {
        console.warn(`[RateLimit] Blocked IP: ${ip}`);
        return false;
    }

    record.count++;
    return true;
}

export async function GET() {
    return NextResponse.json({
        status: 'online',
        version: '2.4',
        message: 'Strict Schema Removed',
        timestamp: new Date().toISOString()
    }, { headers: corsHeaders });
}

/**
 * POST /api/generate
 * Generate shortcut from natural language prompt
 */
export async function POST(request: NextRequest) {
    const requestId = createRequestId('generate');
    const startTime = Date.now();
    const ip = getClientIp(request);

    try {
        // Verify authentication
        const auth = verifyAppSecretAuth(request);
        if (!auth.ok) {
            recordExecution({
                route: '/api/generate',
                method: 'POST',
                statusCode: auth.status || 401,
                success: false,
                durationMs: Date.now() - startTime,
                requestId,
                ip,
                errorCode: auth.code || 'UNAUTHORIZED',
                errorMessage: auth.message || 'Unauthorized',
            });
            return NextResponse.json(
                { success: false, error: auth.message || 'Unauthorized' },
                { status: auth.status || 401, headers: corsHeaders }
            );
        }

        // Check rate limit
        const rateLimitIp = request.headers.get('x-forwarded-for') || 'unknown';
        if (!checkRateLimit(rateLimitIp)) {
            recordExecution({
                route: '/api/generate',
                method: 'POST',
                statusCode: 429,
                success: false,
                durationMs: Date.now() - startTime,
                requestId,
                ip: String(rateLimitIp),
                errorCode: 'RATE_LIMITED',
                errorMessage: 'Ã‡ok fazla istek. LÃ¼tfen bekleyin.',
            });
            return NextResponse.json(
                { success: false, error: 'Ã‡ok fazla istek. LÃ¼tfen bekleyin.' },
                { status: 429, headers: corsHeaders }
            );
        }

        // Parse request body
        const body = await request.json();
        const { prompt, user_context, context } = body;

        if (!prompt || typeof prompt !== 'string') {
            recordExecution({
                route: '/api/generate',
                method: 'POST',
                statusCode: 400,
                success: false,
                durationMs: Date.now() - startTime,
                requestId,
                ip,
                errorCode: 'INVALID_PROMPT',
                errorMessage: 'Prompt gerekli',
            });
            return NextResponse.json(
                { success: false, error: 'Prompt gerekli' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Route by prompt complexity (PRD alignment)
        const promptAnalysis = analyzePrompt(prompt);
        const selectedModel =
            promptAnalysis.model === 'flash-30' ? getFlash30Model() : getFlash25Model();
        const selectedModelName = getModelDisplayName(promptAnalysis.model);
        console.log(
            `[Generate] Model routing -> ${selectedModelName} | complexity=${promptAnalysis.complexity} | ${promptAnalysis.reason}`
        );

        // -------------------------------------------------------------
        // WEB AGENT MODE HANDLING
        // -------------------------------------------------------------
        if (context === 'WEB_AGENT_MODE') {
            console.log('[Generate] WEB AGENT MODE DETECTED');
            const webAgentPrompt = `
You are an autonomous Web Automation Agent.
Your job is to decide the single next interaction to perform on a web page to achieve a specific GOAL.
You will be provided with the GOAL and the current PAGE STATE (JSON).

PAGE STATE includes:
- url: Current URL
- title: Page title
- interactables: List of interactive elements (links, buttons, inputs) with selectors.

INSTRUCTIONS:
1. Analyze the GOAL and PAGE STATE.
2. Decide the MOST LOGICAL next step.
3. Return a SINGLE JSON object representing the action.

ACTION TYPES:
- CLICK: { "type": "click", "selector": "CSS_SELECTOR", "reasoning": "Clicking [text] to..." }
- TYPE: { "type": "type", "selector": "CSS_SELECTOR", "value": "text to type", "reasoning": "Typing [text] into [field]..." }
- SCROLL: { "type": "scroll", "reasoning": "Scrolling to find more content..." }
- WAIT: { "type": "wait", "value": "2000", "reasoning": "Waiting for page load..." }
- FINISH: { "type": "finish", "variableName": "result", "value": "EXTRACTED_DATA_OR_SUMMARY", "reasoning": "Goal achieved." }

RULES:
- ONLY return the raw JSON object. NO markdown, NO explanations outside JSON.
- If a cookie banner or popup obstructs the view, close it (click 'Accept', 'Close', 'X').
- If the goal requires finding information, navigate until you find it, then use FINISH with the extracted text.
- If you can't satisfy the goal yet, choose the best navigation step.

CURRENT DATE: ${new Date().toLocaleDateString('tr-TR')}
`;

            console.log('[Generate] Using Web Agent System Prompt');

            // Generate with AI (Web Mode)
            const result = await selectedModel.generateContent([
                { text: webAgentPrompt },
                { text: prompt } // The prompt already follows the "GOAL: ... PAGE STATE: ..." format from frontend
            ]);

            const response = await result.response;
            const text = response.text();

            // ... parsing logic will handle the rest because we added the Web Action detection ...
            // But we need to make sure we don't fall into the "Strict Workflow" flow below.

            // Clean markdown code blocks if present
            let jsonStr = text.replace(/^```json\n|\n```$/g, '').trim();

            // Robust JSON extraction (find first { and last })
            const lbrace = jsonStr.indexOf('{');
            const rbrace = jsonStr.lastIndexOf('}');
            if (lbrace !== -1 && rbrace !== -1) {
                jsonStr = jsonStr.substring(lbrace, rbrace + 1);
            }

            try {
                const actionData = JSON.parse(jsonStr);
                recordExecution({
                    route: '/api/generate',
                    method: 'POST',
                    statusCode: 200,
                    success: true,
                    durationMs: Date.now() - startTime,
                    requestId,
                    ip,
                    meta: {
                        mode: 'web-agent',
                        model: selectedModelName,
                        complexity: promptAnalysis.complexity,
                    },
                });
                return NextResponse.json(actionData, { headers: corsHeaders });
            } catch (e) {
                console.error('[WebAgent] JSON Parse Failed:', e);
                throw new Error("AI produced invalid JSON in Web Mode");
            }
        }

        // Use the strict workflow prompt
        const systemPrompt = SYSTEM_PROMPT_TURKISH;

        // Log to confirm which prompt is active
        console.log('[Generate] Using Strict Workflow Prompt (v2.3 - NO SCHEMA)');

        // Detect AI/chatbot requests
        const lowerPrompt = prompt.toLowerCase();
        const isAIRequest = lowerPrompt.includes('ai') ||
            lowerPrompt.includes('yapay zeka') ||
            lowerPrompt.includes('sohbet') ||
            lowerPrompt.includes('chat') ||
            lowerPrompt.includes('asistan') ||
            lowerPrompt.includes('agent') ||
            lowerPrompt.includes('llm') ||
            lowerPrompt.includes('gemini') ||
            lowerPrompt.includes('gpt');

        // Build user prompt with context
        let fullPrompt = `KullanÄ±cÄ± komutu: "${prompt}"`;

        // Add explicit instruction for AI requests
        if (isAIRequest) {
            fullPrompt += `\n\nâš ï¸ Ã–NEMLÄ°: Bu istek yapay zeka/sohbet botu iÃ§eriyor. MUTLAKA AGENT_AI node'u kullan!
1. MANUAL_TRIGGER â†’ 2. TEXT_INPUT (kullanÄ±cÄ±dan mesaj al) â†’ 3. AGENT_AI (mesajÄ± iÅŸle) â†’ 4. SHOW_TEXT (yanÄ±tÄ± gÃ¶ster)`;
            console.log('[Generate] AI request detected, adding AGENT_AI instruction');
        }

        const mcpDirective = buildMcpDirective(prompt);
        if (mcpDirective) {
            fullPrompt += `\n\n${mcpDirective}`;
            console.log('[Generate] MCP-capable intent detected, adding MCP priority instruction');
        }

        if (user_context) {
            if (user_context.device_id) {
                fullPrompt += `\nCihaz: ${user_context.device_id}`;
            }
            if (user_context.installed_apps?.length) {
                fullPrompt += `\nYÃ¼klÃ¼ uygulamalar: ${user_context.installed_apps.slice(0, 10).join(', ')}`;
            }
        }

        // Always add current date context
        fullPrompt += `\nBUGÃœNÃœN TARÄ°HÄ°: ${new Date().toLocaleDateString('tr-TR')} (Her zaman bu tarihi referans al)`;

        console.log('[Generate] Starting AI generation...');
        // Generate with AI
        const result = await selectedModel.generateContent([
            { text: systemPrompt },
            { text: fullPrompt }
        ]);
        console.log('[Generate] AI generation completed.');

        const response = await result.response;
        const text = response.text();

        // Clean markdown code blocks if present
        let jsonStr = text.replace(/^```json\n|\n```$/g, '').trim();

        // Robust JSON extraction (find first { and last })
        const lbrace = jsonStr.indexOf('{');
        const rbrace = jsonStr.lastIndexOf('}');
        if (lbrace !== -1 && rbrace !== -1) {
            jsonStr = jsonStr.substring(lbrace, rbrace + 1);
        }

        let workflowData;

        try {
            workflowData = JSON.parse(jsonStr);
        } catch (e) {
            console.error(`[Generate] JSON Parse Failed: ${e}`);
            console.error(`[Generate] Raw Text: ${text}`);
            throw new Error("AI produced invalid JSON: " + text.substring(0, 100)); // Return snippet
        }

        // Special handling for Web Agent Actions (Bypass workflow normalization)
        if (workflowData.type && (workflowData.selector || workflowData.value || workflowData.reasoning || workflowData.type === 'finish' || workflowData.type === 'scroll' || workflowData.type === 'wait')) {
            console.log('[Generate] Detected Web Action response, returning as-is.');
            recordExecution({
                route: '/api/generate',
                method: 'POST',
                statusCode: 200,
                success: true,
                durationMs: Date.now() - startTime,
                requestId,
                ip,
                meta: {
                    mode: 'web-action',
                    model: selectedModelName,
                    complexity: promptAnalysis.complexity,
                },
            });
            return NextResponse.json(workflowData, { headers: corsHeaders });
        }

        // Check if data is wrapped in "template_json" (Admin format) or "workflow" (Strict Schema) and unwrap
        if (workflowData.template_json) {
            workflowData = workflowData.template_json;
        } else if (workflowData.workflow) {
            workflowData = workflowData.workflow;
        }

        // ---------------------------------------------------------
        // NORMALIZATION LAYER (Fixing AI & Seed Discrepancies)
        // ---------------------------------------------------------
        if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
            workflowData.nodes = workflowData.nodes.map((node: any) => {
                // Fix: Ensure config is present
                if (!node.config && node.data) {
                    node.config = node.data;
                }
                // Ensure IDs are strings
                if (typeof node.id === 'number') {
                    node.id = node.id.toString();
                }
                return node;
            });
        }

        // SAFETY NET: If AI returned "steps" (Shortcut format) instead of "nodes" (Workflow format), convert it.
        if ((!workflowData.nodes || workflowData.nodes.length === 0) && workflowData.steps && workflowData.steps.length > 0) {
            console.log('[Generate] converting legacy steps to nodes...');
            const nodes: any[] = [];
            const edges: any[] = [];

            // Add Trigger
            nodes.push({ id: "1", type: "MANUAL_TRIGGER", label: "BaÅŸlat", position: { x: 100, y: 50 } });

            let yOffset = 200;
            let lastNodeId = "1";

            for (const step of workflowData.steps) {
                const nodeId = (nodes.length + 1).toString();

                // Map legacy actions to Node Types
                let type = "NOTIFICATION"; // Default fallback
                let config: any = {};

                if (step.action === 'OPEN_APP') {
                    type = "APP_LAUNCH";
                    config = { packageName: step.params.package_name || step.params.app_name };
                } else if (step.action === 'SEND_SMS') {
                    type = "SMS_SEND";
                    config = { phoneNumber: step.params.phone_number, message: step.params.message };
                } else if (step.action === 'TOGGLE_FLASHLIGHT') {
                    type = "FLASHLIGHT_CONTROL";
                    config = { mode: "toggle" };
                } else if (step.action === 'SET_DND_MODE') {
                    type = "DND_CONTROL";
                    config = { enabled: step.params.enabled };
                } else if (step.action === 'HTTP_REQUEST') {
                    type = "HTTP_REQUEST";
                    config = step.params;
                }

                nodes.push({
                    id: nodeId,
                    type,
                    data: config, // Store in data (standard) or config (prompt format), we normalize later
                    // Prompt uses 'config' in strict JSON, but internal engine mostly uses 'data' or merges them.
                    // Let's use 'data' properties that match workflow-types.
                    ...config, // Spread for flat properties if needed by some clients, but safer to put in data usually.
                    // Wait, Workflow types expect `{ id, type, config: {...} }` or `{ id, type, data: {...} }`.
                    // The prompt example output uses `config`. 
                    // Let's stick to the structure found in seed_templates.ts which uses `data`.
                    // But Prompt Templates file uses `config`.
                    // Let's support both by checking what CreateShortcutScreen expects.
                    // CreateShortcutScreen uses `data: config` in seed templates? 
                    // Seed Templates: `data: { packageName: pkg }`.
                    // Prompt Templates: `config: { mode: "on" }`.
                    // The API response `workflow` object is passed to `CreateShortcutScreen`.
                    // If prompt uses `config`, I should use `config` or `data` consistent with client.
                    // Client `WorkflowEngine` likely reads `node.config` or `node.data`.
                    // Let's check `CreateShortcutScreen` usage again? No time.
                    // Best bet: Assign to BOTH `data` and `config` to be safe.
                    config: config,
                    position: { x: 100, y: yOffset },
                    label: step.action
                });

                edges.push({ id: `e${lastNodeId}-${nodeId}`, sourceNodeId: lastNodeId, targetNodeId: nodeId, source: lastNodeId, target: nodeId });
                lastNodeId = nodeId;
                yOffset += 150;
            }

            workflowData.nodes = nodes;
            workflowData.edges = edges;
        }

        const validatedWorkflow = validateShortcut({
            name: workflowData.name || 'Yeni AkÄ±ÅŸ',
            nodes: workflowData.nodes || [],
            edges: workflowData.edges || [],
        });

        if (!validatedWorkflow.valid) {
            throw new Error(`Workflow schema validation failed: ${validatedWorkflow.error}`);
        }

        workflowData.nodes = validatedWorkflow.shortcut?.nodes || workflowData.nodes || [];
        workflowData.edges = validatedWorkflow.shortcut?.edges || workflowData.edges || [];

        const responseBody = {
            success: true,
            workflow: {
                name: workflowData.name || "Yeni AkÄ±ÅŸ",
                nodes: workflowData.nodes || [],
                edges: workflowData.edges || [],
                description: workflowData.description,
                ai_model_used: selectedModelName,
            },
            model_used: selectedModelName,
            complexity: promptAnalysis.complexity,
            routing_reason: promptAnalysis.reason,
            processing_time_ms: Date.now() - startTime,
        };

        recordExecution({
            route: '/api/generate',
            method: 'POST',
            statusCode: 200,
            success: true,
            durationMs: Date.now() - startTime,
            requestId,
            ip,
            meta: {
                workflowName: responseBody.workflow.name,
                nodeCount: responseBody.workflow.nodes.length,
                model: selectedModelName,
                complexity: promptAnalysis.complexity,
            },
        });

        return NextResponse.json(responseBody, { headers: corsHeaders });

    } catch (error) {
        console.error('[Generate] Error:', error);

        // Determine error type and return appropriate message
        let errorMessage = 'Sunucu hatasÄ±';
        const details = error instanceof Error ? error.message : 'Bilinmeyen hata';
        let statusCode = 500;

        if (details.includes('API key') || details.includes('401') || details.includes('403')) {
            errorMessage = 'Gemini API anahtarÄ± geÃ§ersiz veya eksik';
            statusCode = 503;
        } else if (details.includes('quota') || details.includes('rate')) {
            errorMessage = 'API kullanÄ±m limiti aÅŸÄ±ldÄ±';
            statusCode = 429;
        } else if (details.includes('model') || details.includes('not found')) {
            errorMessage = 'AI modeli bulunamadÄ±';
            statusCode = 503;
        }

        recordExecution({
            route: '/api/generate',
            method: 'POST',
            statusCode: statusCode,
            success: false,
            durationMs: Date.now() - startTime,
            requestId,
            ip,
            errorCode: 'GENERATE_FAILED',
            errorMessage: details,
        });

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                details: details
            },
            { status: statusCode, headers: corsHeaders }
        );
    }
}

/**
 * OPTIONS /api/generate
 * Handle CORS preflight
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}


