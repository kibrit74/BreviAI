export interface IdempotentApiResult {
    status: number;
    body: Record<string, unknown>;
    headers?: HeadersInit;
}

type IdempotencyEntry =
    | {
        state: 'pending';
        expiresAt: number;
        promise: Promise<IdempotentApiResult>;
    }
    | {
        state: 'completed';
        expiresAt: number;
        result: IdempotentApiResult;
    };

export interface IdempotencyRunResult {
    result: IdempotentApiResult;
    key: string | null;
    status: 'miss' | 'created' | 'replay' | 'inflight_replay';
}

declare global {
    var __breviaiIdempotencyStore: Map<string, IdempotencyEntry> | undefined;
}

const idempotencyStore = globalThis.__breviaiIdempotencyStore || new Map<string, IdempotencyEntry>();
if (!globalThis.__breviaiIdempotencyStore) {
    globalThis.__breviaiIdempotencyStore = idempotencyStore;
}

function deepCloneResult(result: IdempotentApiResult): IdempotentApiResult {
    return {
        status: result.status,
        body: JSON.parse(JSON.stringify(result.body)),
        headers: result.headers,
    };
}

function cleanupExpired(now: number) {
    if (idempotencyStore.size < 5000) return;
    idempotencyStore.forEach((value, key) => {
        if (value.expiresAt <= now) {
            idempotencyStore.delete(key);
        }
    });
}

export function getIdempotencyKey(request: Request) {
    const raw = request.headers.get('idempotency-key') || request.headers.get('Idempotency-Key');
    const key = raw?.trim() || '';
    return key ? key : null;
}

export async function runWithIdempotency(params: {
    request: Request;
    scope: string;
    handler: () => Promise<IdempotentApiResult>;
    ttlMs?: number;
}): Promise<IdempotencyRunResult> {
    const key = getIdempotencyKey(params.request);
    if (!key) {
        return {
            result: await params.handler(),
            key: null,
            status: 'miss',
        };
    }

    const now = Date.now();
    const ttlMs = params.ttlMs || 10 * 60 * 1000;
    cleanupExpired(now);

    const scopedKey = `${params.scope}:${key}`;
    const existing = idempotencyStore.get(scopedKey);

    if (existing && existing.expiresAt > now) {
        if (existing.state === 'completed') {
            return {
                result: deepCloneResult(existing.result),
                key: scopedKey,
                status: 'replay',
            };
        }
        const pendingResult = await existing.promise;
        return {
            result: deepCloneResult(pendingResult),
            key: scopedKey,
            status: 'inflight_replay',
        };
    }

    const pendingPromise = params
        .handler()
        .then((result) => {
            const clonedResult = deepCloneResult(result);
            idempotencyStore.set(scopedKey, {
                state: 'completed',
                result: clonedResult,
                expiresAt: Date.now() + ttlMs,
            });
            return deepCloneResult(clonedResult);
        })
        .catch((error) => {
            idempotencyStore.delete(scopedKey);
            throw error;
        });

    idempotencyStore.set(scopedKey, {
        state: 'pending',
        promise: pendingPromise,
        expiresAt: now + ttlMs,
    });

    const result = await pendingPromise;
    return {
        result: deepCloneResult(result),
        key: scopedKey,
        status: 'created',
    };
}
