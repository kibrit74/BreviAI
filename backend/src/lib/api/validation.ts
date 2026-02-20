import { z } from 'zod';

export class ValidationException extends Error {
    readonly code = 'VALIDATION_ERROR';
    readonly details?: unknown;
    readonly status: number;

    constructor(message: string, details?: unknown, status = 400) {
        super(message);
        this.name = 'ValidationException';
        this.details = details;
        this.status = status;
    }
}

export async function parseJsonBody<T extends z.ZodTypeAny>(
    request: Request,
    schema: T
): Promise<z.infer<T>> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new ValidationException('Invalid JSON body');
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationException('Request validation failed', parsed.error.flatten());
    }
    return parsed.data;
}

export function parseQueryParams<T extends z.ZodTypeAny>(
    url: URL | string,
    schema: T
): z.infer<T> {
    const targetUrl = typeof url === 'string' ? new URL(url) : url;
    const raw: Record<string, unknown> = {};

    targetUrl.searchParams.forEach((value, key) => {
        if (raw[key] === undefined) {
            raw[key] = value;
            return;
        }
        if (Array.isArray(raw[key])) {
            (raw[key] as string[]).push(value);
            return;
        }
        raw[key] = [raw[key], value];
    });

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
        throw new ValidationException('Query validation failed', parsed.error.flatten());
    }
    return parsed.data;
}
