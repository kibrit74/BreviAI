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
const MCP_WEB_SEARCH_TIMEOUT_MS = 20_000;

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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
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
            try {
                const rawResults = await withTimeout(
                    searchWeb(query),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'web_search'
                );
                const results = rawResults.slice(0, limit).map((item) => ({
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
            } catch (error) {
                const message = error instanceof Error ? error.message : 'web_search failed';
                return toolError('web_search failed', {
                    requestId: context.requestId,
                    details: message,
                    query,
                });
            }
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
    'breviai.google.sheets_read': {
        descriptor: {
            name: 'breviai.google.sheets_read',
            title: 'Google Sheets Read',
            description:
                'Read data from a Google Sheets spreadsheet. Supports both public sheets (via API key) and private sheets (via OAuth access token).',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    spreadsheetId: {
                        type: 'string',
                        description: 'The ID of the Google Spreadsheet',
                    },
                    range: {
                        type: 'string',
                        description:
                            'The A1 notation range to read, e.g. "Sheet1!A1:D10"',
                    },
                    accessToken: {
                        type: 'string',
                        description:
                            'Optional OAuth2 access token for private sheets',
                    },
                },
                required: ['spreadsheetId', 'range'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const spreadsheetId = String(args.spreadsheetId || '').trim();
            const range = String(args.range || '').trim();
            const accessToken = args.accessToken
                ? String(args.accessToken).trim()
                : '';

            if (!spreadsheetId || !range) {
                return toolError('spreadsheetId and range are required', {
                    requestId: context.requestId,
                });
            }

            try {
                let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
                const headers: Record<string, string> = {};

                if (accessToken) {
                    headers['Authorization'] = `Bearer ${accessToken}`;
                } else {
                    const apiKey =
                        process.env.GOOGLE_SHEETS_API_KEY ||
                        process.env.GOOGLE_API_KEY ||
                        process.env.GEMINI_API_KEY;
                    if (apiKey) {
                        url += `?key=${apiKey}`;
                    } else {
                        return toolError(
                            'No access token or API key configured for Google Sheets',
                            { requestId: context.requestId }
                        );
                    }
                }

                const response = await withTimeout(
                    fetch(url, { method: 'GET', headers }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'google_sheets_read'
                );
                const data = await response.json();

                if (!response.ok) {
                    return toolError(
                        data.error?.message || 'Google Sheets API error',
                        {
                            requestId: context.requestId,
                            status: response.status,
                            details: data,
                        }
                    );
                }

                const rows = data.values || [];
                return {
                    content: [
                        {
                            type: 'json',
                            json: {
                                spreadsheetId,
                                range: data.range || range,
                                rowCount: rows.length,
                                values: rows,
                            },
                        },
                        {
                            type: 'text',
                            text: `Read ${rows.length} rows from spreadsheet "${spreadsheetId}" range "${range}".`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: true,
                        tool: 'breviai.google.sheets_read',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'google_sheets_read failed';
                return toolError('google_sheets_read failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.google.gmail_read': {
        descriptor: {
            name: 'breviai.google.gmail_read',
            title: 'Gmail Read',
            description:
                'Read emails from a Gmail account using an OAuth2 access token. Supports search queries like "is:unread", "from:someone@example.com", etc.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'OAuth2 access token for Gmail',
                    },
                    searchQuery: {
                        type: 'string',
                        description:
                            'Gmail search query, e.g. "is:unread" or "from:boss@company.com"',
                    },
                    maxResults: {
                        type: 'number',
                        minimum: 1,
                        maximum: 20,
                        default: 5,
                        description: 'Maximum number of emails to return',
                    },
                },
                required: ['accessToken'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            if (!accessToken) {
                return toolError('accessToken is required for Gmail', {
                    requestId: context.requestId,
                });
            }

            const searchQuery = String(args.searchQuery || 'is:unread').trim();
            const maxResults = normalizeLimit(args.maxResults, 5, 20);

            try {
                const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}`;

                const listResponse = await withTimeout(
                    fetch(listUrl, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'gmail_list'
                );

                if (!listResponse.ok) {
                    const errorText = await listResponse.text();
                    return toolError(
                        `Gmail API error: ${listResponse.status}`,
                        {
                            requestId: context.requestId,
                            details: errorText,
                        }
                    );
                }

                const listData = await listResponse.json();
                const messageIds = listData.messages || [];

                if (messageIds.length === 0) {
                    return {
                        content: [
                            {
                                type: 'json',
                                json: {
                                    query: searchQuery,
                                    count: 0,
                                    emails: [],
                                },
                            },
                            {
                                type: 'text',
                                text: `No emails found for query "${searchQuery}".`,
                            },
                        ],
                        metadata: {
                            requestId: context.requestId,
                            readOnly: true,
                            tool: 'breviai.google.gmail_read',
                        },
                    };
                }

                const emails = (
                    await Promise.all(
                        messageIds.map(async (msg: { id: string }) => {
                            try {
                                const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`;
                                const detailResponse = await fetch(detailUrl, {
                                    headers: {
                                        Authorization: `Bearer ${accessToken}`,
                                    },
                                });
                                const detail = await detailResponse.json();
                                const hdrs = detail.payload?.headers || [];
                                const subject =
                                    hdrs.find(
                                        (h: { name: string; value: string }) =>
                                            h.name === 'Subject'
                                    )?.value || '(No Subject)';
                                const from =
                                    hdrs.find(
                                        (h: { name: string; value: string }) =>
                                            h.name === 'From'
                                    )?.value || '(Unknown)';
                                const date =
                                    hdrs.find(
                                        (h: { name: string; value: string }) =>
                                            h.name === 'Date'
                                    )?.value || '';

                                return {
                                    id: detail.id,
                                    threadId: detail.threadId,
                                    from,
                                    subject,
                                    snippet: detail.snippet || '',
                                    date,
                                };
                            } catch {
                                return null;
                            }
                        })
                    )
                ).filter(Boolean);

                return {
                    content: [
                        {
                            type: 'json',
                            json: {
                                query: searchQuery,
                                count: emails.length,
                                emails,
                            },
                        },
                        {
                            type: 'text',
                            text: `Found ${emails.length} emails for query "${searchQuery}".`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: true,
                        tool: 'breviai.google.gmail_read',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'gmail_read failed';
                return toolError('gmail_read failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.google.drive_list': {
        descriptor: {
            name: 'breviai.google.drive_list',
            title: 'Google Drive List Files',
            description:
                'List files from Google Drive. Supports search queries to filter by name, type, or folder.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'OAuth2 access token for Google Drive',
                    },
                    query: {
                        type: 'string',
                        description:
                            "Optional Drive search query, e.g. \"name contains 'report'\" or \"mimeType='application/vnd.google-apps.spreadsheet'\"",
                    },
                    limit: {
                        type: 'number',
                        minimum: 1,
                        maximum: 50,
                        default: 10,
                        description: 'Maximum number of files to return',
                    },
                },
                required: ['accessToken'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            if (!accessToken) {
                return toolError('accessToken is required for Google Drive', {
                    requestId: context.requestId,
                });
            }

            const query = String(args.query || '').trim();
            const limit = normalizeLimit(args.limit, 10, 50);

            try {
                let url = `https://www.googleapis.com/drive/v3/files?pageSize=${limit}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,owners)`;
                if (query) {
                    url += `&q=${encodeURIComponent(query)}`;
                }

                const response = await withTimeout(
                    fetch(url, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'drive_list'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Google Drive API error: ${response.status}`,
                        {
                            requestId: context.requestId,
                            details: errorText,
                        }
                    );
                }

                const data = await response.json();
                const files = (data.files || []).map(
                    (f: {
                        id: string;
                        name: string;
                        mimeType: string;
                        size?: string;
                        modifiedTime?: string;
                        webViewLink?: string;
                    }) => ({
                        id: f.id,
                        name: f.name,
                        mimeType: f.mimeType,
                        size: f.size,
                        modifiedTime: f.modifiedTime,
                        webViewLink: f.webViewLink,
                    })
                );

                return {
                    content: [
                        {
                            type: 'json',
                            json: {
                                query: query || '(all files)',
                                count: files.length,
                                files,
                            },
                        },
                        {
                            type: 'text',
                            text: `Listed ${files.length} files from Google Drive.`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: true,
                        tool: 'breviai.google.drive_list',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'drive_list failed';
                return toolError('drive_list failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.google.calendar_list': {
        descriptor: {
            name: 'breviai.google.calendar_list',
            title: 'Google Calendar List Events',
            description:
                'List upcoming events from Google Calendar. Returns event titles, times, locations, and attendees.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'OAuth2 access token for Google Calendar',
                    },
                    calendarId: {
                        type: 'string',
                        description:
                            'Calendar ID to query. Defaults to "primary".',
                    },
                    maxResults: {
                        type: 'number',
                        minimum: 1,
                        maximum: 50,
                        default: 10,
                        description: 'Maximum number of events to return',
                    },
                    timeMin: {
                        type: 'string',
                        description:
                            'Lower bound (inclusive) for event start time in RFC3339 format, e.g. "2024-01-01T00:00:00Z". Defaults to now.',
                    },
                    query: {
                        type: 'string',
                        description:
                            'Free text search query to filter events',
                    },
                },
                required: ['accessToken'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            if (!accessToken) {
                return toolError('accessToken is required for Google Calendar', {
                    requestId: context.requestId,
                });
            }

            const calendarId = String(args.calendarId || 'primary').trim();
            const maxResults = normalizeLimit(args.maxResults, 10, 50);
            const timeMin = String(
                args.timeMin || new Date().toISOString()
            ).trim();
            const query = args.query ? String(args.query).trim() : '';

            try {
                let url =
                    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
                    `?maxResults=${maxResults}&timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`;
                if (query) {
                    url += `&q=${encodeURIComponent(query)}`;
                }

                const response = await withTimeout(
                    fetch(url, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'calendar_list'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Google Calendar API error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const data = await response.json();
                const events = (data.items || []).map(
                    (e: {
                        id: string;
                        summary?: string;
                        start?: { dateTime?: string; date?: string };
                        end?: { dateTime?: string; date?: string };
                        location?: string;
                        description?: string;
                        hangoutLink?: string;
                        attendees?: Array<{ email: string; responseStatus?: string }>;
                    }) => ({
                        id: e.id,
                        title: e.summary || '(No title)',
                        start: e.start?.dateTime || e.start?.date || '',
                        end: e.end?.dateTime || e.end?.date || '',
                        location: e.location || '',
                        description: e.description
                            ? e.description.substring(0, 200)
                            : '',
                        meetLink: e.hangoutLink || '',
                        attendees: (e.attendees || []).map((a) => a.email),
                    })
                );

                return {
                    content: [
                        {
                            type: 'json',
                            json: { calendarId, count: events.length, events },
                        },
                        {
                            type: 'text',
                            text: `Listed ${events.length} upcoming events from calendar "${calendarId}".`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: true,
                        tool: 'breviai.google.calendar_list',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'calendar_list failed';
                return toolError('calendar_list failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.google.calendar_create': {
        descriptor: {
            name: 'breviai.google.calendar_create',
            title: 'Google Calendar Create Event',
            description:
                'Create a new event on Google Calendar. Optionally add attendees and location.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'OAuth2 access token for Google Calendar',
                    },
                    summary: {
                        type: 'string',
                        description: 'Title of the event',
                    },
                    description: {
                        type: 'string',
                        description: 'Description or notes for the event',
                    },
                    startDateTime: {
                        type: 'string',
                        description:
                            'Event start time in RFC3339, e.g. "2024-06-15T10:00:00+03:00"',
                    },
                    endDateTime: {
                        type: 'string',
                        description:
                            'Event end time in RFC3339, e.g. "2024-06-15T11:00:00+03:00"',
                    },
                    location: {
                        type: 'string',
                        description: 'Event location (optional)',
                    },
                    attendees: {
                        type: 'string',
                        description:
                            'Comma-separated attendee email addresses (optional)',
                    },
                    calendarId: {
                        type: 'string',
                        description: 'Calendar ID. Defaults to "primary".',
                    },
                },
                required: ['accessToken', 'summary', 'startDateTime', 'endDateTime'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            if (!accessToken) {
                return toolError('accessToken is required', {
                    requestId: context.requestId,
                });
            }

            const summary = String(args.summary || '').trim();
            const startDateTime = String(args.startDateTime || '').trim();
            const endDateTime = String(args.endDateTime || '').trim();

            if (!summary || !startDateTime || !endDateTime) {
                return toolError(
                    'summary, startDateTime, and endDateTime are required',
                    { requestId: context.requestId }
                );
            }

            const calendarId = String(args.calendarId || 'primary').trim();
            const description = args.description
                ? String(args.description).trim()
                : '';
            const location = args.location
                ? String(args.location).trim()
                : '';
            const attendeesRaw = args.attendees
                ? String(args.attendees).trim()
                : '';

            const eventBody: Record<string, unknown> = {
                summary,
                start: { dateTime: startDateTime },
                end: { dateTime: endDateTime },
            };
            if (description) eventBody.description = description;
            if (location) eventBody.location = location;
            if (attendeesRaw) {
                eventBody.attendees = attendeesRaw
                    .split(',')
                    .map((email: string) => ({ email: email.trim() }))
                    .filter(
                        (a: { email: string }) => a.email.length > 0
                    );
            }

            try {
                const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
                const response = await withTimeout(
                    fetch(url, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(eventBody),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'calendar_create'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Google Calendar create error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const created = await response.json();
                return {
                    content: [
                        {
                            type: 'json',
                            json: {
                                id: created.id,
                                htmlLink: created.htmlLink,
                                summary: created.summary,
                                start: created.start,
                                end: created.end,
                            },
                        },
                        {
                            type: 'text',
                            text: `Created event "${created.summary}" — ${created.htmlLink}`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: false,
                        tool: 'breviai.google.calendar_create',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'calendar_create failed';
                return toolError('calendar_create failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.google.sheets_write': {
        descriptor: {
            name: 'breviai.google.sheets_write',
            title: 'Google Sheets Write',
            description:
                'Write or append data to a Google Sheets spreadsheet. Uses OAuth2 access token.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'OAuth2 access token for Google Sheets',
                    },
                    spreadsheetId: {
                        type: 'string',
                        description: 'The ID of the Google Spreadsheet',
                    },
                    range: {
                        type: 'string',
                        description:
                            'The A1 notation range to write, e.g. "Sheet1!A1:C3"',
                    },
                    values: {
                        type: 'string',
                        description:
                            'JSON stringified 2D array, e.g. \'[["Name","Age"],["Ali",25]]\'',
                    },
                    mode: {
                        type: 'string',
                        description:
                            '"update" to overwrite the range, "append" to add rows after existing data. Defaults to "append".',
                    },
                },
                required: ['accessToken', 'spreadsheetId', 'range', 'values'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            const spreadsheetId = String(args.spreadsheetId || '').trim();
            const range = String(args.range || '').trim();
            const valuesRaw = String(args.values || '').trim();
            const mode = String(args.mode || 'append').trim().toLowerCase();

            if (!accessToken || !spreadsheetId || !range || !valuesRaw) {
                return toolError(
                    'accessToken, spreadsheetId, range, and values are required',
                    { requestId: context.requestId }
                );
            }

            let values: unknown[][];
            try {
                values = JSON.parse(valuesRaw);
                if (!Array.isArray(values)) throw new Error('not an array');
            } catch {
                return toolError(
                    'values must be a valid JSON 2D array, e.g. [["a","b"],[1,2]]',
                    { requestId: context.requestId }
                );
            }

            try {
                let url: string;
                let method: string;

                if (mode === 'update') {
                    url =
                        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}` +
                        `?valueInputOption=USER_ENTERED`;
                    method = 'PUT';
                } else {
                    url =
                        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append` +
                        `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
                    method = 'POST';
                }

                const response = await withTimeout(
                    fetch(url, {
                        method,
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ values }),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'sheets_write'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Google Sheets write error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const result = await response.json();
                const updatedRange =
                    result.updatedRange || result.updates?.updatedRange || range;
                const updatedRows =
                    result.updatedRows ??
                    result.updates?.updatedRows ??
                    values.length;

                return {
                    content: [
                        {
                            type: 'json',
                            json: {
                                spreadsheetId,
                                updatedRange,
                                updatedRows,
                                mode,
                            },
                        },
                        {
                            type: 'text',
                            text: `Successfully ${mode === 'update' ? 'updated' : 'appended'} ${updatedRows} rows to "${updatedRange}".`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: false,
                        tool: 'breviai.google.sheets_write',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'sheets_write failed';
                return toolError('sheets_write failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.google.meet_create': {
        descriptor: {
            name: 'breviai.google.meet_create',
            title: 'Google Meet Create',
            description:
                'Create a Google Meet video conference link by creating a Calendar event with conference data.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'OAuth2 access token (needs Calendar scope)',
                    },
                    summary: {
                        type: 'string',
                        description: 'Meeting title',
                    },
                    startDateTime: {
                        type: 'string',
                        description:
                            'Meeting start in RFC3339, e.g. "2024-06-15T14:00:00+03:00"',
                    },
                    endDateTime: {
                        type: 'string',
                        description:
                            'Meeting end in RFC3339, e.g. "2024-06-15T15:00:00+03:00"',
                    },
                    attendees: {
                        type: 'string',
                        description:
                            'Comma-separated attendee emails (optional)',
                    },
                },
                required: ['accessToken', 'summary', 'startDateTime', 'endDateTime'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            if (!accessToken) {
                return toolError('accessToken is required', {
                    requestId: context.requestId,
                });
            }

            const summary = String(args.summary || '').trim();
            const startDateTime = String(args.startDateTime || '').trim();
            const endDateTime = String(args.endDateTime || '').trim();

            if (!summary || !startDateTime || !endDateTime) {
                return toolError(
                    'summary, startDateTime, and endDateTime are required',
                    { requestId: context.requestId }
                );
            }

            const attendeesRaw = args.attendees
                ? String(args.attendees).trim()
                : '';

            const eventBody: Record<string, unknown> = {
                summary,
                start: { dateTime: startDateTime },
                end: { dateTime: endDateTime },
                conferenceData: {
                    createRequest: {
                        requestId: `meet-${context.requestId}-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                },
            };

            if (attendeesRaw) {
                eventBody.attendees = attendeesRaw
                    .split(',')
                    .map((email: string) => ({ email: email.trim() }))
                    .filter((a: { email: string }) => a.email.length > 0);
            }

            try {
                const url =
                    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1';
                const response = await withTimeout(
                    fetch(url, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(eventBody),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'meet_create'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Google Meet create error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const created = await response.json();
                const meetLink =
                    created.hangoutLink ||
                    created.conferenceData?.entryPoints?.find(
                        (ep: { entryPointType: string; uri: string }) =>
                            ep.entryPointType === 'video'
                    )?.uri ||
                    '';

                return {
                    content: [
                        {
                            type: 'json',
                            json: {
                                eventId: created.id,
                                htmlLink: created.htmlLink,
                                meetLink,
                                summary: created.summary,
                                start: created.start,
                                end: created.end,
                            },
                        },
                        {
                            type: 'text',
                            text: meetLink
                                ? `Google Meet created: ${meetLink}`
                                : `Event created but no Meet link returned: ${created.htmlLink}`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: false,
                        tool: 'breviai.google.meet_create',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'meet_create failed';
                return toolError('meet_create failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    // ─── Microsoft Graph API Tools ───────────────────────────────
    'breviai.microsoft.outlook_read': {
        descriptor: {
            name: 'breviai.microsoft.outlook_read',
            title: 'Microsoft Outlook Read Mail',
            description:
                'Read emails from Microsoft Outlook / Microsoft 365 mailbox using Microsoft Graph API.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'Microsoft Graph OAuth2 access token',
                    },
                    maxResults: {
                        type: 'number',
                        minimum: 1,
                        maximum: 50,
                        default: 10,
                        description: 'Maximum number of emails to return',
                    },
                    filter: {
                        type: 'string',
                        description:
                            'OData $filter query, e.g. "isRead eq false" for unread emails',
                    },
                    search: {
                        type: 'string',
                        description:
                            'Free-text search query across subject, body, sender',
                    },
                },
                required: ['accessToken'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            if (!accessToken) {
                return toolError('accessToken is required for Outlook', {
                    requestId: context.requestId,
                });
            }

            const maxResults = normalizeLimit(args.maxResults, 10, 50);
            const filter = args.filter ? String(args.filter).trim() : '';
            const search = args.search ? String(args.search).trim() : '';

            try {
                let url = `https://graph.microsoft.com/v1.0/me/messages?$top=${maxResults}&$select=id,subject,from,receivedDateTime,bodyPreview,isRead&$orderby=receivedDateTime desc`;
                if (filter) url += `&$filter=${encodeURIComponent(filter)}`;
                if (search) url += `&$search="${encodeURIComponent(search)}"`;

                const response = await withTimeout(
                    fetch(url, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'outlook_read'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Outlook API error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const data = await response.json();
                const emails = (data.value || []).map(
                    (m: {
                        id: string;
                        subject?: string;
                        from?: { emailAddress?: { name?: string; address?: string } };
                        receivedDateTime?: string;
                        bodyPreview?: string;
                        isRead?: boolean;
                    }) => ({
                        id: m.id,
                        subject: m.subject || '(No Subject)',
                        from: m.from?.emailAddress?.address || '(Unknown)',
                        fromName: m.from?.emailAddress?.name || '',
                        date: m.receivedDateTime || '',
                        preview: (m.bodyPreview || '').substring(0, 200),
                        isRead: m.isRead ?? true,
                    })
                );

                return {
                    content: [
                        {
                            type: 'json',
                            json: { count: emails.length, emails },
                        },
                        {
                            type: 'text',
                            text: `Found ${emails.length} emails from Outlook.`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: true,
                        tool: 'breviai.microsoft.outlook_read',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'outlook_read failed';
                return toolError('outlook_read failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.microsoft.outlook_send': {
        descriptor: {
            name: 'breviai.microsoft.outlook_send',
            title: 'Microsoft Outlook Send Mail',
            description:
                'Send an email via Microsoft Outlook / Microsoft 365 using Microsoft Graph API.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'Microsoft Graph OAuth2 access token',
                    },
                    to: {
                        type: 'string',
                        description: 'Comma-separated recipient email addresses',
                    },
                    subject: {
                        type: 'string',
                        description: 'Email subject',
                    },
                    body: {
                        type: 'string',
                        description: 'Email body content (HTML supported)',
                    },
                    cc: {
                        type: 'string',
                        description: 'Comma-separated CC email addresses (optional)',
                    },
                },
                required: ['accessToken', 'to', 'subject', 'body'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            const to = String(args.to || '').trim();
            const subject = String(args.subject || '').trim();
            const body = String(args.body || '').trim();
            const cc = args.cc ? String(args.cc).trim() : '';

            if (!accessToken || !to || !subject || !body) {
                return toolError(
                    'accessToken, to, subject, and body are required',
                    { requestId: context.requestId }
                );
            }

            const toRecipients = to
                .split(',')
                .map((email: string) => ({
                    emailAddress: { address: email.trim() },
                }))
                .filter((r: { emailAddress: { address: string } }) => r.emailAddress.address.length > 0);

            const mailBody: Record<string, unknown> = {
                message: {
                    subject,
                    body: { contentType: 'HTML', content: body },
                    toRecipients,
                },
            };

            if (cc) {
                (mailBody.message as Record<string, unknown>).ccRecipients = cc
                    .split(',')
                    .map((email: string) => ({
                        emailAddress: { address: email.trim() },
                    }))
                    .filter((r: { emailAddress: { address: string } }) => r.emailAddress.address.length > 0);
            }

            try {
                const response = await withTimeout(
                    fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(mailBody),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'outlook_send'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Outlook send error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                return {
                    content: [
                        {
                            type: 'json',
                            json: { sent: true, to, subject },
                        },
                        {
                            type: 'text',
                            text: `Email sent successfully to ${to}.`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: false,
                        tool: 'breviai.microsoft.outlook_send',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'outlook_send failed';
                return toolError('outlook_send failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.microsoft.onedrive_list': {
        descriptor: {
            name: 'breviai.microsoft.onedrive_list',
            title: 'Microsoft OneDrive List Files',
            description:
                'List files and folders from the root of the user\'s OneDrive via Microsoft Graph API.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'Microsoft Graph OAuth2 access token',
                    },
                    folderId: {
                        type: 'string',
                        description:
                            'Folder item ID to list children of. Leave empty to list root.',
                    },
                    limit: {
                        type: 'number',
                        minimum: 1,
                        maximum: 50,
                        default: 20,
                        description: 'Maximum number of items to return',
                    },
                },
                required: ['accessToken'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            if (!accessToken) {
                return toolError('accessToken is required for OneDrive', {
                    requestId: context.requestId,
                });
            }

            const folderId = args.folderId
                ? String(args.folderId).trim()
                : '';
            const limit = normalizeLimit(args.limit, 20, 50);

            try {
                const path = folderId
                    ? `me/drive/items/${folderId}/children`
                    : 'me/drive/root/children';
                const url = `https://graph.microsoft.com/v1.0/${path}?$top=${limit}&$select=id,name,size,lastModifiedDateTime,webUrl,file,folder`;

                const response = await withTimeout(
                    fetch(url, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'onedrive_list'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `OneDrive API error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const data = await response.json();
                const items = (data.value || []).map(
                    (item: {
                        id: string;
                        name: string;
                        size?: number;
                        lastModifiedDateTime?: string;
                        webUrl?: string;
                        file?: { mimeType?: string };
                        folder?: { childCount?: number };
                    }) => ({
                        id: item.id,
                        name: item.name,
                        type: item.folder ? 'folder' : 'file',
                        mimeType: item.file?.mimeType || '',
                        size: item.size || 0,
                        modified: item.lastModifiedDateTime || '',
                        webUrl: item.webUrl || '',
                        childCount: item.folder?.childCount,
                    })
                );

                return {
                    content: [
                        {
                            type: 'json',
                            json: { count: items.length, items },
                        },
                        {
                            type: 'text',
                            text: `Listed ${items.length} items from OneDrive.`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: true,
                        tool: 'breviai.microsoft.onedrive_list',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'onedrive_list failed';
                return toolError('onedrive_list failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.microsoft.onedrive_search': {
        descriptor: {
            name: 'breviai.microsoft.onedrive_search',
            title: 'Microsoft OneDrive Search',
            description:
                'Search for files in OneDrive by name or content using Microsoft Graph API.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'Microsoft Graph OAuth2 access token',
                    },
                    query: {
                        type: 'string',
                        description: 'Search query text',
                    },
                    limit: {
                        type: 'number',
                        minimum: 1,
                        maximum: 25,
                        default: 10,
                    },
                },
                required: ['accessToken', 'query'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            const query = String(args.query || '').trim();
            if (!accessToken || !query) {
                return toolError('accessToken and query are required', {
                    requestId: context.requestId,
                });
            }

            const limit = normalizeLimit(args.limit, 10, 25);

            try {
                const url = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(query)}')?$top=${limit}&$select=id,name,size,lastModifiedDateTime,webUrl,file`;

                const response = await withTimeout(
                    fetch(url, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'onedrive_search'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `OneDrive search error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const data = await response.json();
                const files = (data.value || []).map(
                    (f: {
                        id: string;
                        name: string;
                        size?: number;
                        lastModifiedDateTime?: string;
                        webUrl?: string;
                        file?: { mimeType?: string };
                    }) => ({
                        id: f.id,
                        name: f.name,
                        mimeType: f.file?.mimeType || '',
                        size: f.size || 0,
                        modified: f.lastModifiedDateTime || '',
                        webUrl: f.webUrl || '',
                    })
                );

                return {
                    content: [
                        {
                            type: 'json',
                            json: { query, count: files.length, files },
                        },
                        {
                            type: 'text',
                            text: `Found ${files.length} files matching "${query}" in OneDrive.`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: true,
                        tool: 'breviai.microsoft.onedrive_search',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'onedrive_search failed';
                return toolError('onedrive_search failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.microsoft.teams_meeting': {
        descriptor: {
            name: 'breviai.microsoft.teams_meeting',
            title: 'Microsoft Teams Create Meeting',
            description:
                'Create a Microsoft Teams online meeting and get the join URL via Microsoft Graph API.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'Microsoft Graph OAuth2 access token',
                    },
                    subject: {
                        type: 'string',
                        description: 'Meeting subject/title',
                    },
                    startDateTime: {
                        type: 'string',
                        description:
                            'Meeting start in ISO 8601, e.g. "2024-06-15T14:00:00Z"',
                    },
                    endDateTime: {
                        type: 'string',
                        description:
                            'Meeting end in ISO 8601, e.g. "2024-06-15T15:00:00Z"',
                    },
                },
                required: ['accessToken', 'subject', 'startDateTime', 'endDateTime'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            const subject = String(args.subject || '').trim();
            const startDateTime = String(args.startDateTime || '').trim();
            const endDateTime = String(args.endDateTime || '').trim();

            if (!accessToken || !subject || !startDateTime || !endDateTime) {
                return toolError(
                    'accessToken, subject, startDateTime, and endDateTime are required',
                    { requestId: context.requestId }
                );
            }

            try {
                const response = await withTimeout(
                    fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            subject,
                            startDateTime,
                            endDateTime,
                        }),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'teams_meeting'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Teams meeting error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const meeting = await response.json();

                return {
                    content: [
                        {
                            type: 'json',
                            json: {
                                id: meeting.id,
                                joinUrl: meeting.joinWebUrl,
                                subject: meeting.subject,
                                startDateTime: meeting.startDateTime,
                                endDateTime: meeting.endDateTime,
                            },
                        },
                        {
                            type: 'text',
                            text: `Teams meeting created: ${meeting.joinWebUrl}`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: false,
                        tool: 'breviai.microsoft.teams_meeting',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'teams_meeting failed';
                return toolError('teams_meeting failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    // ─── Additional Utility Tools ────────────────────────────────
    'breviai.github.repos_list': {
        descriptor: {
            name: 'breviai.github.repos_list',
            title: 'GitHub List Repositories',
            description:
                'List repositories for the authenticated user or a specified user via GitHub REST API.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    token: {
                        type: 'string',
                        description:
                            'GitHub personal access token or OAuth token',
                    },
                    username: {
                        type: 'string',
                        description: 'GitHub username. Omit to list authenticated user\'s repos.',
                    },
                    limit: {
                        type: 'number',
                        minimum: 1,
                        maximum: 30,
                        default: 10,
                    },
                    sort: {
                        type: 'string',
                        description: '"updated", "created", "pushed", or "full_name". Defaults to "updated".',
                    },
                },
                required: ['token'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const token = String(args.token || '').trim();
            if (!token) {
                return toolError('GitHub token is required', {
                    requestId: context.requestId,
                });
            }

            const username = args.username
                ? String(args.username).trim()
                : '';
            const limit = normalizeLimit(args.limit, 10, 30);
            const sort = String(args.sort || 'updated').trim();

            try {
                const path = username
                    ? `users/${username}/repos`
                    : 'user/repos';
                const url = `https://api.github.com/${path}?per_page=${limit}&sort=${sort}`;

                const response = await withTimeout(
                    fetch(url, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: 'application/vnd.github+json',
                            'X-GitHub-Api-Version': '2022-11-28',
                        },
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'github_repos'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `GitHub API error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const repos = (await response.json()).map(
                    (r: {
                        id: number;
                        full_name: string;
                        description?: string;
                        html_url: string;
                        language?: string;
                        stargazers_count: number;
                        updated_at: string;
                        private: boolean;
                    }) => ({
                        id: r.id,
                        name: r.full_name,
                        description: (r.description || '').substring(0, 120),
                        url: r.html_url,
                        language: r.language || '',
                        stars: r.stargazers_count,
                        updated: r.updated_at,
                        isPrivate: r.private,
                    })
                );

                return {
                    content: [
                        {
                            type: 'json',
                            json: { count: repos.length, repos },
                        },
                        {
                            type: 'text',
                            text: `Listed ${repos.length} GitHub repositories.`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: true,
                        tool: 'breviai.github.repos_list',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'github_repos failed';
                return toolError('github_repos failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    // ─── Microsoft Outlook Calendar & Excel Tools ────────────────
    'breviai.microsoft.calendar_list': {
        descriptor: {
            name: 'breviai.microsoft.calendar_list',
            title: 'Microsoft Outlook Calendar List',
            description:
                'List upcoming events from Microsoft Outlook / M365 Calendar via Microsoft Graph API.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'Microsoft Graph OAuth2 access token',
                    },
                    maxResults: {
                        type: 'number',
                        minimum: 1,
                        maximum: 50,
                        default: 10,
                        description: 'Maximum number of events to return',
                    },
                    startDateTime: {
                        type: 'string',
                        description:
                            'Start of the time range in ISO 8601, e.g. "2024-06-01T00:00:00Z". Defaults to now.',
                    },
                    endDateTime: {
                        type: 'string',
                        description:
                            'End of the time range in ISO 8601. Defaults to 7 days from now.',
                    },
                },
                required: ['accessToken'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            if (!accessToken) {
                return toolError('accessToken is required for Outlook Calendar', {
                    requestId: context.requestId,
                });
            }

            const maxResults = normalizeLimit(args.maxResults, 10, 50);
            const now = new Date();
            const startDateTime = String(
                args.startDateTime || now.toISOString()
            ).trim();
            const defaultEnd = new Date(
                now.getTime() + 7 * 24 * 60 * 60 * 1000
            ).toISOString();
            const endDateTime = String(
                args.endDateTime || defaultEnd
            ).trim();

            try {
                const url =
                    `https://graph.microsoft.com/v1.0/me/calendarView` +
                    `?startDateTime=${encodeURIComponent(startDateTime)}` +
                    `&endDateTime=${encodeURIComponent(endDateTime)}` +
                    `&$top=${maxResults}` +
                    `&$select=id,subject,start,end,location,organizer,attendees,isOnlineMeeting,onlineMeetingUrl` +
                    `&$orderby=start/dateTime`;

                const response = await withTimeout(
                    fetch(url, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Prefer: 'outlook.timezone="UTC"',
                        },
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'outlook_calendar_list'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Outlook Calendar error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const data = await response.json();
                const events = (data.value || []).map(
                    (e: {
                        id: string;
                        subject?: string;
                        start?: { dateTime?: string };
                        end?: { dateTime?: string };
                        location?: { displayName?: string };
                        organizer?: { emailAddress?: { name?: string; address?: string } };
                        attendees?: Array<{ emailAddress?: { address?: string } }>;
                        isOnlineMeeting?: boolean;
                        onlineMeetingUrl?: string;
                    }) => ({
                        id: e.id,
                        subject: e.subject || '(No Subject)',
                        start: e.start?.dateTime || '',
                        end: e.end?.dateTime || '',
                        location: e.location?.displayName || '',
                        organizer: e.organizer?.emailAddress?.address || '',
                        attendees: (e.attendees || [])
                            .map((a) => a.emailAddress?.address || '')
                            .filter(Boolean),
                        isOnlineMeeting: e.isOnlineMeeting || false,
                        meetingUrl: e.onlineMeetingUrl || '',
                    })
                );

                return {
                    content: [
                        {
                            type: 'json',
                            json: { count: events.length, events },
                        },
                        {
                            type: 'text',
                            text: `Listed ${events.length} Outlook calendar events.`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: true,
                        tool: 'breviai.microsoft.calendar_list',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'outlook_calendar_list failed';
                return toolError('outlook_calendar_list failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.microsoft.calendar_create': {
        descriptor: {
            name: 'breviai.microsoft.calendar_create',
            title: 'Microsoft Outlook Calendar Create Event',
            description:
                'Create a new event on Microsoft Outlook / M365 Calendar via Microsoft Graph API.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'Microsoft Graph OAuth2 access token',
                    },
                    subject: {
                        type: 'string',
                        description: 'Event title / subject',
                    },
                    body: {
                        type: 'string',
                        description: 'Event body / notes (HTML supported, optional)',
                    },
                    startDateTime: {
                        type: 'string',
                        description:
                            'Event start in ISO 8601, e.g. "2024-06-15T10:00:00"',
                    },
                    endDateTime: {
                        type: 'string',
                        description:
                            'Event end in ISO 8601, e.g. "2024-06-15T11:00:00"',
                    },
                    timeZone: {
                        type: 'string',
                        description: 'Time zone, e.g. "Europe/Istanbul". Defaults to "UTC".',
                    },
                    location: {
                        type: 'string',
                        description: 'Event location (optional)',
                    },
                    attendees: {
                        type: 'string',
                        description:
                            'Comma-separated attendee email addresses (optional)',
                    },
                    isOnlineMeeting: {
                        type: 'boolean',
                        description: 'If true, creates a Teams meeting for this event',
                    },
                },
                required: ['accessToken', 'subject', 'startDateTime', 'endDateTime'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            const subject = String(args.subject || '').trim();
            const startDateTime = String(args.startDateTime || '').trim();
            const endDateTime = String(args.endDateTime || '').trim();

            if (!accessToken || !subject || !startDateTime || !endDateTime) {
                return toolError(
                    'accessToken, subject, startDateTime, and endDateTime are required',
                    { requestId: context.requestId }
                );
            }

            const timeZone = String(args.timeZone || 'UTC').trim();
            const location = args.location ? String(args.location).trim() : '';
            const bodyContent = args.body ? String(args.body).trim() : '';
            const attendeesRaw = args.attendees ? String(args.attendees).trim() : '';
            const isOnlineMeeting = args.isOnlineMeeting === true;

            const eventPayload: Record<string, unknown> = {
                subject,
                start: { dateTime: startDateTime, timeZone },
                end: { dateTime: endDateTime, timeZone },
            };

            if (bodyContent) {
                eventPayload.body = { contentType: 'HTML', content: bodyContent };
            }
            if (location) {
                eventPayload.location = { displayName: location };
            }
            if (attendeesRaw) {
                eventPayload.attendees = attendeesRaw
                    .split(',')
                    .map((email: string) => ({
                        emailAddress: { address: email.trim() },
                        type: 'required',
                    }))
                    .filter(
                        (a: { emailAddress: { address: string } }) =>
                            a.emailAddress.address.length > 0
                    );
            }
            if (isOnlineMeeting) {
                eventPayload.isOnlineMeeting = true;
                eventPayload.onlineMeetingProvider = 'teamsForBusiness';
            }

            try {
                const response = await withTimeout(
                    fetch('https://graph.microsoft.com/v1.0/me/events', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(eventPayload),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'outlook_calendar_create'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Outlook Calendar create error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const created = await response.json();
                return {
                    content: [
                        {
                            type: 'json',
                            json: {
                                id: created.id,
                                webLink: created.webLink,
                                subject: created.subject,
                                start: created.start,
                                end: created.end,
                                onlineMeetingUrl: created.onlineMeeting?.joinUrl || '',
                            },
                        },
                        {
                            type: 'text',
                            text: `Created Outlook event "${created.subject}" — ${created.webLink || 'link pending'}`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: false,
                        tool: 'breviai.microsoft.calendar_create',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'outlook_calendar_create failed';
                return toolError('outlook_calendar_create failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.microsoft.excel_read': {
        descriptor: {
            name: 'breviai.microsoft.excel_read',
            title: 'Microsoft Excel Read',
            description:
                'Read a range of cells from an Excel workbook stored in OneDrive via Microsoft Graph API.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'Microsoft Graph OAuth2 access token',
                    },
                    itemId: {
                        type: 'string',
                        description: 'OneDrive item ID of the Excel file',
                    },
                    worksheetName: {
                        type: 'string',
                        description: 'Worksheet (tab) name, e.g. "Sheet1"',
                    },
                    range: {
                        type: 'string',
                        description:
                            'Cell range in A1 notation, e.g. "A1:D10"',
                    },
                },
                required: ['accessToken', 'itemId', 'worksheetName', 'range'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            const itemId = String(args.itemId || '').trim();
            const worksheetName = String(args.worksheetName || '').trim();
            const range = String(args.range || '').trim();

            if (!accessToken || !itemId || !worksheetName || !range) {
                return toolError(
                    'accessToken, itemId, worksheetName, and range are required',
                    { requestId: context.requestId }
                );
            }

            try {
                const url =
                    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}` +
                    `/workbook/worksheets/${encodeURIComponent(worksheetName)}` +
                    `/range(address='${encodeURIComponent(range)}')`;

                const response = await withTimeout(
                    fetch(url, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'excel_read'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Excel read error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const data = await response.json();
                const values = data.values || [];
                const rowCount = values.length;
                const colCount = rowCount > 0 ? values[0].length : 0;

                return {
                    content: [
                        {
                            type: 'json',
                            json: {
                                itemId,
                                worksheet: worksheetName,
                                range: data.address || range,
                                rowCount,
                                colCount,
                                values,
                            },
                        },
                        {
                            type: 'text',
                            text: `Read ${rowCount} rows × ${colCount} columns from Excel "${worksheetName}!${range}".`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: true,
                        tool: 'breviai.microsoft.excel_read',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'excel_read failed';
                return toolError('excel_read failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    'breviai.microsoft.excel_write': {
        descriptor: {
            name: 'breviai.microsoft.excel_write',
            title: 'Microsoft Excel Write',
            description:
                'Write data to a range of cells in an Excel workbook stored in OneDrive via Microsoft Graph API.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'Microsoft Graph OAuth2 access token',
                    },
                    itemId: {
                        type: 'string',
                        description: 'OneDrive item ID of the Excel file',
                    },
                    worksheetName: {
                        type: 'string',
                        description: 'Worksheet (tab) name, e.g. "Sheet1"',
                    },
                    range: {
                        type: 'string',
                        description:
                            'Cell range in A1 notation, e.g. "A1:C3"',
                    },
                    values: {
                        type: 'string',
                        description:
                            'JSON stringified 2D array, e.g. \'[["Name","Age"],["Ali",25]]\'',
                    },
                },
                required: ['accessToken', 'itemId', 'worksheetName', 'range', 'values'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const accessToken = String(args.accessToken || '').trim();
            const itemId = String(args.itemId || '').trim();
            const worksheetName = String(args.worksheetName || '').trim();
            const range = String(args.range || '').trim();
            const valuesRaw = String(args.values || '').trim();

            if (!accessToken || !itemId || !worksheetName || !range || !valuesRaw) {
                return toolError(
                    'accessToken, itemId, worksheetName, range, and values are required',
                    { requestId: context.requestId }
                );
            }

            let values: unknown[][];
            try {
                values = JSON.parse(valuesRaw);
                if (!Array.isArray(values)) throw new Error('not an array');
            } catch {
                return toolError(
                    'values must be a valid JSON 2D array, e.g. [["a","b"],[1,2]]',
                    { requestId: context.requestId }
                );
            }

            try {
                const url =
                    `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}` +
                    `/workbook/worksheets/${encodeURIComponent(worksheetName)}` +
                    `/range(address='${encodeURIComponent(range)}')`;

                const response = await withTimeout(
                    fetch(url, {
                        method: 'PATCH',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ values }),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS,
                    'excel_write'
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    return toolError(
                        `Excel write error: ${response.status}`,
                        { requestId: context.requestId, details: errorText }
                    );
                }

                const result = await response.json();
                return {
                    content: [
                        {
                            type: 'json',
                            json: {
                                itemId,
                                worksheet: worksheetName,
                                range: result.address || range,
                                rowCount: values.length,
                            },
                        },
                        {
                            type: 'text',
                            text: `Written ${values.length} rows to Excel "${worksheetName}!${range}".`,
                        },
                    ],
                    metadata: {
                        requestId: context.requestId,
                        readOnly: false,
                        tool: 'breviai.microsoft.excel_write',
                    },
                };
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'excel_write failed';
                return toolError('excel_write failed', {
                    requestId: context.requestId,
                    details: message,
                });
            }
        },
    },
    // ─── Notion Tools ────────────────────────────────────────────
    'breviai.notion.search': {
        descriptor: {
            name: 'breviai.notion.search',
            title: 'Notion Search',
            description:
                'Search pages and databases in Notion workspace.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    token: { type: 'string', description: 'Notion integration token' },
                    query: { type: 'string', description: 'Search query text' },
                    limit: { type: 'number', minimum: 1, maximum: 20, default: 10 },
                },
                required: ['token', 'query'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const token = String(args.token || '').trim();
            const query = String(args.query || '').trim();
            if (!token || !query) return toolError('token and query are required', { requestId: context.requestId });
            const limit = normalizeLimit(args.limit, 10, 20);
            try {
                const response = await withTimeout(
                    fetch('https://api.notion.com/v1/search', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
                        body: JSON.stringify({ query, page_size: limit }),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS, 'notion_search'
                );
                if (!response.ok) { const e = await response.text(); return toolError(`Notion error: ${response.status}`, { requestId: context.requestId, details: e }); }
                const data = await response.json();
                const results = (data.results || []).map((r: { id: string; object: string; url?: string; properties?: Record<string, { title?: Array<{ plain_text?: string }> }> }) => ({
                    id: r.id, type: r.object, url: r.url || '',
                    title: r.properties?.Name?.title?.[0]?.plain_text || r.properties?.title?.title?.[0]?.plain_text || '',
                }));
                return { content: [{ type: 'json', json: { count: results.length, results } }, { type: 'text', text: `Found ${results.length} Notion results for "${query}".` }], metadata: { requestId: context.requestId, readOnly: true, tool: 'breviai.notion.search' } };
            } catch (error) { return toolError('notion_search failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
        },
    },
    'breviai.notion.create_page': {
        descriptor: {
            name: 'breviai.notion.create_page',
            title: 'Notion Create Page',
            description: 'Create a new page in Notion under a specified parent page.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    token: { type: 'string', description: 'Notion integration token' },
                    parentPageId: { type: 'string', description: 'Parent page ID' },
                    title: { type: 'string', description: 'Page title' },
                    content: { type: 'string', description: 'Plain text content for the page body (optional)' },
                },
                required: ['token', 'parentPageId', 'title'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const token = String(args.token || '').trim();
            const parentPageId = String(args.parentPageId || '').trim();
            const title = String(args.title || '').trim();
            const content = args.content ? String(args.content).trim() : '';
            if (!token || !parentPageId || !title) return toolError('token, parentPageId, and title are required', { requestId: context.requestId });
            const body: Record<string, unknown> = {
                parent: { page_id: parentPageId },
                properties: { title: { title: [{ text: { content: title } }] } },
            };
            if (content) { body.children = [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content } }] } }]; }
            try {
                const response = await withTimeout(
                    fetch('https://api.notion.com/v1/pages', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
                        body: JSON.stringify(body),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS, 'notion_create_page'
                );
                if (!response.ok) { const e = await response.text(); return toolError(`Notion error: ${response.status}`, { requestId: context.requestId, details: e }); }
                const page = await response.json();
                return { content: [{ type: 'json', json: { id: page.id, url: page.url } }, { type: 'text', text: `Created Notion page: ${page.url}` }], metadata: { requestId: context.requestId, readOnly: false, tool: 'breviai.notion.create_page' } };
            } catch (error) { return toolError('notion_create_page failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
        },
    },
    // ─── Slack Tools ─────────────────────────────────────────────
    'breviai.slack.send_message': {
        descriptor: {
            name: 'breviai.slack.send_message',
            title: 'Slack Send Message',
            description: 'Send a message to a Slack channel using chat.postMessage.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    token: { type: 'string', description: 'Slack Bot OAuth token (xoxb-...)' },
                    channel: { type: 'string', description: 'Channel ID (e.g. C01234567)' },
                    text: { type: 'string', description: 'Message text' },
                },
                required: ['token', 'channel', 'text'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const token = String(args.token || '').trim();
            const channel = String(args.channel || '').trim();
            const text = String(args.text || '').trim();
            if (!token || !channel || !text) return toolError('token, channel, and text are required', { requestId: context.requestId });
            try {
                const response = await withTimeout(
                    fetch('https://slack.com/api/chat.postMessage', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ channel, text }),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS, 'slack_send'
                );
                const data = await response.json();
                if (!data.ok) return toolError(`Slack error: ${data.error}`, { requestId: context.requestId });
                return { content: [{ type: 'json', json: { ok: true, channel, ts: data.ts } }, { type: 'text', text: `Message sent to Slack channel ${channel}.` }], metadata: { requestId: context.requestId, readOnly: false, tool: 'breviai.slack.send_message' } };
            } catch (error) { return toolError('slack_send failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
        },
    },
    'breviai.slack.list_channels': {
        descriptor: {
            name: 'breviai.slack.list_channels',
            title: 'Slack List Channels',
            description: 'List public channels in a Slack workspace.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    token: { type: 'string', description: 'Slack Bot OAuth token' },
                    limit: { type: 'number', minimum: 1, maximum: 50, default: 20 },
                },
                required: ['token'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const token = String(args.token || '').trim();
            if (!token) return toolError('token is required', { requestId: context.requestId });
            const limit = normalizeLimit(args.limit, 20, 50);
            try {
                const response = await withTimeout(
                    fetch(`https://slack.com/api/conversations.list?types=public_channel&limit=${limit}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS, 'slack_channels'
                );
                const data = await response.json();
                if (!data.ok) return toolError(`Slack error: ${data.error}`, { requestId: context.requestId });
                const channels = (data.channels || []).map((c: { id: string; name: string; num_members?: number; purpose?: { value?: string } }) => ({
                    id: c.id, name: c.name, members: c.num_members || 0, purpose: (c.purpose?.value || '').substring(0, 100),
                }));
                return { content: [{ type: 'json', json: { count: channels.length, channels } }, { type: 'text', text: `Listed ${channels.length} Slack channels.` }], metadata: { requestId: context.requestId, readOnly: true, tool: 'breviai.slack.list_channels' } };
            } catch (error) { return toolError('slack_channels failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
        },
    },
    // ─── Trello Tools ────────────────────────────────────────────
    'breviai.trello.list_cards': {
        descriptor: {
            name: 'breviai.trello.list_cards',
            title: 'Trello List Cards',
            description: 'List cards on a Trello board or list.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    apiKey: { type: 'string', description: 'Trello API key' },
                    token: { type: 'string', description: 'Trello API token' },
                    boardId: { type: 'string', description: 'Board ID to list cards from' },
                    listId: { type: 'string', description: 'List ID to filter cards (optional)' },
                },
                required: ['apiKey', 'token', 'boardId'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const apiKey = String(args.apiKey || '').trim();
            const token = String(args.token || '').trim();
            const boardId = String(args.boardId || '').trim();
            const listId = args.listId ? String(args.listId).trim() : '';
            if (!apiKey || !token || !boardId) return toolError('apiKey, token, and boardId are required', { requestId: context.requestId });
            try {
                const path = listId ? `lists/${listId}/cards` : `boards/${boardId}/cards`;
                const url = `https://api.trello.com/1/${path}?key=${apiKey}&token=${token}&fields=id,name,desc,due,labels,url`;
                const response = await withTimeout(fetch(url), MCP_WEB_SEARCH_TIMEOUT_MS, 'trello_cards');
                if (!response.ok) { const e = await response.text(); return toolError(`Trello error: ${response.status}`, { requestId: context.requestId, details: e }); }
                const cards = (await response.json()).map((c: { id: string; name: string; desc?: string; due?: string; url?: string; labels?: Array<{ name?: string }> }) => ({
                    id: c.id, name: c.name, description: (c.desc || '').substring(0, 100), due: c.due || '', url: c.url || '',
                    labels: (c.labels || []).map((l) => l.name).filter(Boolean),
                }));
                return { content: [{ type: 'json', json: { count: cards.length, cards } }, { type: 'text', text: `Listed ${cards.length} Trello cards.` }], metadata: { requestId: context.requestId, readOnly: true, tool: 'breviai.trello.list_cards' } };
            } catch (error) { return toolError('trello_cards failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
        },
    },
    'breviai.trello.create_card': {
        descriptor: {
            name: 'breviai.trello.create_card',
            title: 'Trello Create Card',
            description: 'Create a new card in a Trello list.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    apiKey: { type: 'string', description: 'Trello API key' },
                    token: { type: 'string', description: 'Trello API token' },
                    listId: { type: 'string', description: 'List ID to add card to' },
                    name: { type: 'string', description: 'Card name/title' },
                    desc: { type: 'string', description: 'Card description (optional)' },
                    due: { type: 'string', description: 'Due date in ISO format (optional)' },
                },
                required: ['apiKey', 'token', 'listId', 'name'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const apiKey = String(args.apiKey || '').trim();
            const token = String(args.token || '').trim();
            const listId = String(args.listId || '').trim();
            const name = String(args.name || '').trim();
            if (!apiKey || !token || !listId || !name) return toolError('apiKey, token, listId, and name are required', { requestId: context.requestId });
            const params = new URLSearchParams({ key: apiKey, token, idList: listId, name });
            if (args.desc) params.set('desc', String(args.desc));
            if (args.due) params.set('due', String(args.due));
            try {
                const response = await withTimeout(
                    fetch(`https://api.trello.com/1/cards?${params.toString()}`, { method: 'POST' }),
                    MCP_WEB_SEARCH_TIMEOUT_MS, 'trello_create'
                );
                if (!response.ok) { const e = await response.text(); return toolError(`Trello error: ${response.status}`, { requestId: context.requestId, details: e }); }
                const card = await response.json();
                return { content: [{ type: 'json', json: { id: card.id, name: card.name, url: card.url } }, { type: 'text', text: `Created Trello card: ${card.url}` }], metadata: { requestId: context.requestId, readOnly: false, tool: 'breviai.trello.create_card' } };
            } catch (error) { return toolError('trello_create failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
        },
    },
    // ─── Jira Tools ──────────────────────────────────────────────
    'breviai.jira.search_issues': {
        descriptor: {
            name: 'breviai.jira.search_issues',
            title: 'Jira Search Issues',
            description: 'Search for issues in Jira using JQL.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    domain: { type: 'string', description: 'Jira domain, e.g. "mycompany.atlassian.net"' },
                    email: { type: 'string', description: 'Jira user email' },
                    apiToken: { type: 'string', description: 'Jira API token' },
                    jql: { type: 'string', description: 'JQL query, e.g. "project = DEV AND status = Open"' },
                    maxResults: { type: 'number', minimum: 1, maximum: 50, default: 10 },
                },
                required: ['domain', 'email', 'apiToken', 'jql'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const domain = String(args.domain || '').trim();
            const email = String(args.email || '').trim();
            const apiToken = String(args.apiToken || '').trim();
            const jql = String(args.jql || '').trim();
            if (!domain || !email || !apiToken || !jql) return toolError('domain, email, apiToken, and jql are required', { requestId: context.requestId });
            const maxResults = normalizeLimit(args.maxResults, 10, 50);
            const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
            try {
                const url = `https://${domain}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,assignee,priority,created`;
                const response = await withTimeout(
                    fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } }),
                    MCP_WEB_SEARCH_TIMEOUT_MS, 'jira_search'
                );
                if (!response.ok) { const e = await response.text(); return toolError(`Jira error: ${response.status}`, { requestId: context.requestId, details: e }); }
                const data = await response.json();
                const issues = (data.issues || []).map((i: { key: string; fields: { summary?: string; status?: { name?: string }; assignee?: { displayName?: string }; priority?: { name?: string }; created?: string } }) => ({
                    key: i.key, summary: i.fields.summary || '', status: i.fields.status?.name || '', assignee: i.fields.assignee?.displayName || 'Unassigned', priority: i.fields.priority?.name || '', created: i.fields.created || '',
                }));
                return { content: [{ type: 'json', json: { total: data.total, count: issues.length, issues } }, { type: 'text', text: `Found ${data.total} Jira issues (showing ${issues.length}).` }], metadata: { requestId: context.requestId, readOnly: true, tool: 'breviai.jira.search_issues' } };
            } catch (error) { return toolError('jira_search failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
        },
    },
    'breviai.jira.create_issue': {
        descriptor: {
            name: 'breviai.jira.create_issue',
            title: 'Jira Create Issue',
            description: 'Create a new issue in Jira.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    domain: { type: 'string', description: 'Jira domain' },
                    email: { type: 'string', description: 'Jira user email' },
                    apiToken: { type: 'string', description: 'Jira API token' },
                    projectKey: { type: 'string', description: 'Project key, e.g. "DEV"' },
                    summary: { type: 'string', description: 'Issue summary/title' },
                    issueType: { type: 'string', description: 'Issue type: "Task", "Bug", "Story". Defaults to "Task".' },
                    description: { type: 'string', description: 'Issue description (optional)' },
                },
                required: ['domain', 'email', 'apiToken', 'projectKey', 'summary'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const domain = String(args.domain || '').trim();
            const email = String(args.email || '').trim();
            const apiToken = String(args.apiToken || '').trim();
            const projectKey = String(args.projectKey || '').trim();
            const summary = String(args.summary || '').trim();
            if (!domain || !email || !apiToken || !projectKey || !summary) return toolError('domain, email, apiToken, projectKey, and summary are required', { requestId: context.requestId });
            const issueType = String(args.issueType || 'Task').trim();
            const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
            const issueBody: Record<string, unknown> = {
                fields: { project: { key: projectKey }, summary, issuetype: { name: issueType } },
            };
            if (args.description) {
                (issueBody.fields as Record<string, unknown>).description = {
                    type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: String(args.description) }] }],
                };
            }
            try {
                const response = await withTimeout(
                    fetch(`https://${domain}/rest/api/3/issue`, {
                        method: 'POST',
                        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
                        body: JSON.stringify(issueBody),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS, 'jira_create'
                );
                if (!response.ok) { const e = await response.text(); return toolError(`Jira error: ${response.status}`, { requestId: context.requestId, details: e }); }
                const created = await response.json();
                return { content: [{ type: 'json', json: { id: created.id, key: created.key, self: created.self } }, { type: 'text', text: `Created Jira issue ${created.key}.` }], metadata: { requestId: context.requestId, readOnly: false, tool: 'breviai.jira.create_issue' } };
            } catch (error) { return toolError('jira_create failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
        },
    },
    // ─── Asana Tools ─────────────────────────────────────────────
    'breviai.asana.list_tasks': {
        descriptor: {
            name: 'breviai.asana.list_tasks',
            title: 'Asana List Tasks',
            description: 'List tasks in an Asana project.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    token: { type: 'string', description: 'Asana personal access token' },
                    projectId: { type: 'string', description: 'Asana project GID' },
                    limit: { type: 'number', minimum: 1, maximum: 50, default: 20 },
                },
                required: ['token', 'projectId'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const token = String(args.token || '').trim();
            const projectId = String(args.projectId || '').trim();
            if (!token || !projectId) return toolError('token and projectId are required', { requestId: context.requestId });
            const limit = normalizeLimit(args.limit, 20, 50);
            try {
                const url = `https://app.asana.com/api/1.0/projects/${projectId}/tasks?limit=${limit}&opt_fields=name,completed,due_on,assignee.name`;
                const response = await withTimeout(
                    fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
                    MCP_WEB_SEARCH_TIMEOUT_MS, 'asana_tasks'
                );
                if (!response.ok) { const e = await response.text(); return toolError(`Asana error: ${response.status}`, { requestId: context.requestId, details: e }); }
                const data = await response.json();
                const tasks = (data.data || []).map((t: { gid: string; name: string; completed?: boolean; due_on?: string; assignee?: { name?: string } }) => ({
                    id: t.gid, name: t.name, completed: t.completed || false, dueOn: t.due_on || '', assignee: t.assignee?.name || '',
                }));
                return { content: [{ type: 'json', json: { count: tasks.length, tasks } }, { type: 'text', text: `Listed ${tasks.length} Asana tasks.` }], metadata: { requestId: context.requestId, readOnly: true, tool: 'breviai.asana.list_tasks' } };
            } catch (error) { return toolError('asana_tasks failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
        },
    },
    'breviai.asana.create_task': {
        descriptor: {
            name: 'breviai.asana.create_task',
            title: 'Asana Create Task',
            description: 'Create a new task in an Asana project.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    token: { type: 'string', description: 'Asana personal access token' },
                    projectId: { type: 'string', description: 'Asana project GID' },
                    name: { type: 'string', description: 'Task name' },
                    notes: { type: 'string', description: 'Task notes/description (optional)' },
                    dueOn: { type: 'string', description: 'Due date in YYYY-MM-DD format (optional)' },
                },
                required: ['token', 'projectId', 'name'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const token = String(args.token || '').trim();
            const projectId = String(args.projectId || '').trim();
            const name = String(args.name || '').trim();
            if (!token || !projectId || !name) return toolError('token, projectId, and name are required', { requestId: context.requestId });
            const taskData: Record<string, unknown> = { name, projects: [projectId] };
            if (args.notes) taskData.notes = String(args.notes);
            if (args.dueOn) taskData.due_on = String(args.dueOn);
            try {
                const response = await withTimeout(
                    fetch('https://app.asana.com/api/1.0/tasks', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data: taskData }),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS, 'asana_create'
                );
                if (!response.ok) { const e = await response.text(); return toolError(`Asana error: ${response.status}`, { requestId: context.requestId, details: e }); }
                const result = await response.json();
                const t = result.data;
                return { content: [{ type: 'json', json: { id: t.gid, name: t.name, url: t.permalink_url } }, { type: 'text', text: `Created Asana task: ${t.name}` }], metadata: { requestId: context.requestId, readOnly: false, tool: 'breviai.asana.create_task' } };
            } catch (error) { return toolError('asana_create failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
        },
    },
    // ─── Airtable Tools ──────────────────────────────────────────
    'breviai.airtable.list_records': {
        descriptor: {
            name: 'breviai.airtable.list_records',
            title: 'Airtable List Records',
            description: 'List records from an Airtable base table.',
            readOnly: true,
            inputSchema: {
                type: 'object',
                properties: {
                    token: { type: 'string', description: 'Airtable personal access token' },
                    baseId: { type: 'string', description: 'Airtable base ID (e.g. appXXXXX)' },
                    tableName: { type: 'string', description: 'Table name' },
                    maxRecords: { type: 'number', minimum: 1, maximum: 100, default: 20 },
                    filterFormula: { type: 'string', description: 'Airtable formula filter (optional), e.g. "{Status}=\'Active\'"' },
                },
                required: ['token', 'baseId', 'tableName'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const token = String(args.token || '').trim();
            const baseId = String(args.baseId || '').trim();
            const tableName = String(args.tableName || '').trim();
            if (!token || !baseId || !tableName) return toolError('token, baseId, and tableName are required', { requestId: context.requestId });
            const maxRecords = normalizeLimit(args.maxRecords, 20, 100);
            let url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?maxRecords=${maxRecords}`;
            if (args.filterFormula) url += `&filterByFormula=${encodeURIComponent(String(args.filterFormula))}`;
            try {
                const response = await withTimeout(
                    fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
                    MCP_WEB_SEARCH_TIMEOUT_MS, 'airtable_list'
                );
                if (!response.ok) { const e = await response.text(); return toolError(`Airtable error: ${response.status}`, { requestId: context.requestId, details: e }); }
                const data = await response.json();
                const records = (data.records || []).map((r: { id: string; fields: Record<string, unknown>; createdTime?: string }) => ({
                    id: r.id, fields: r.fields, createdTime: r.createdTime || '',
                }));
                return { content: [{ type: 'json', json: { count: records.length, records } }, { type: 'text', text: `Listed ${records.length} Airtable records from "${tableName}".` }], metadata: { requestId: context.requestId, readOnly: true, tool: 'breviai.airtable.list_records' } };
            } catch (error) { return toolError('airtable_list failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
        },
    },
    // ─── Zapier Tools ────────────────────────────────────────────
    'breviai.zapier.trigger_webhook': {
        descriptor: {
            name: 'breviai.zapier.trigger_webhook',
            title: 'Zapier Trigger Webhook',
            description: 'Trigger a Zapier webhook (Catch Hook) by sending JSON data to a Zapier webhook URL.',
            readOnly: false,
            inputSchema: {
                type: 'object',
                properties: {
                    webhookUrl: { type: 'string', description: 'Zapier Catch Hook webhook URL' },
                    data: { type: 'string', description: 'JSON stringified payload to send' },
                },
                required: ['webhookUrl', 'data'],
                additionalProperties: false,
            },
        },
        handler: async (args, context) => {
            const webhookUrl = String(args.webhookUrl || '').trim();
            const dataRaw = String(args.data || '').trim();
            if (!webhookUrl || !dataRaw) return toolError('webhookUrl and data are required', { requestId: context.requestId });
            if (!webhookUrl.includes('hooks.zapier.com')) return toolError('Invalid Zapier webhook URL', { requestId: context.requestId });
            let payload: unknown;
            try { payload = JSON.parse(dataRaw); } catch { return toolError('data must be valid JSON', { requestId: context.requestId }); }
            try {
                const response = await withTimeout(
                    fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    }),
                    MCP_WEB_SEARCH_TIMEOUT_MS, 'zapier_webhook'
                );
                const responseText = await response.text();
                return { content: [{ type: 'json', json: { triggered: true, status: response.status, response: responseText.substring(0, 200) } }, { type: 'text', text: `Zapier webhook triggered successfully (${response.status}).` }], metadata: { requestId: context.requestId, readOnly: false, tool: 'breviai.zapier.trigger_webhook' } };
            } catch (error) { return toolError('zapier_webhook failed', { requestId: context.requestId, details: error instanceof Error ? error.message : 'unknown' }); }
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
