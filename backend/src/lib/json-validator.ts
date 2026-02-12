import { z } from 'zod';

/**
 * Zod schemas for validating AI-generated JSON
 */

// Workflow Schemas
const PositionSchema = z.object({
    x: z.number(),
    y: z.number()
});

const NodeSchema = z.object({
    id: z.string(),
    type: z.string(), // e.g. "MANUAL_TRIGGER", "HTTP_REQUEST"
    label: z.string().optional(),
    data: z.record(z.unknown()).optional(), // Config data
    position: PositionSchema.optional()
});

const EdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional()
});

// Main workflow schema
export const ShortcutSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    nodes: z.array(NodeSchema).min(1),
    edges: z.array(EdgeSchema).optional()
});

export type Shortcut = z.infer<typeof ShortcutSchema>;

/**
 * Validate AI-generated JSON
 */
export function validateShortcut(data: unknown): {
    valid: boolean;
    shortcut?: Shortcut;
    error?: string
} {
    try {
        const shortcut = ShortcutSchema.parse(data);
        return { valid: true, shortcut };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
            return { valid: false, error: issues.join('; ') };
        }
        return { valid: false, error: 'Geçersiz JSON formatı' };
    }
}

/**
 * Try to fix common JSON issues from AI output
 */
export function sanitizeJsonString(text: string): string {
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();

    // Try to find JSON object boundaries
    const startIndex = cleaned.indexOf('{');
    const endIndex = cleaned.lastIndexOf('}');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        cleaned = cleaned.substring(startIndex, endIndex + 1);
    }

    return cleaned;
}

/**
 * Parse and validate AI response
 */
export function parseAIResponse(responseText: string): {
    valid: boolean;
    shortcut?: Shortcut;
    error?: string;
    rawJson?: unknown;
} {
    try {
        const sanitized = sanitizeJsonString(responseText);
        const parsed = JSON.parse(sanitized);

        const validation = validateShortcut(parsed);
        return {
            ...validation,
            rawJson: parsed
        };
    } catch (error) {
        return {
            valid: false,
            error: `JSON parse hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
        };
    }
}
