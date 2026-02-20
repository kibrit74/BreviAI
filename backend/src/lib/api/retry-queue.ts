export interface RetryOptions {
    retries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    timeoutMs?: number;
}

interface RetryQueueConfig {
    name?: string;
    concurrency?: number;
}

interface PendingTask<T> {
    task: () => Promise<T>;
    options: RetryOptions;
    resolve: (value: T) => void;
    reject: (error: unknown) => void;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) return promise;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Task timed out after ${timeoutMs}ms`)), timeoutMs);
        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
    });
}

export class RetryQueue {
    private readonly queue: PendingTask<unknown>[] = [];
    private readonly concurrency: number;
    private activeCount = 0;
    private readonly name: string;

    constructor(config: RetryQueueConfig = {}) {
        this.concurrency = Math.max(1, config.concurrency || 1);
        this.name = config.name || 'retry-queue';
    }

    enqueue<T>(task: () => Promise<T>, options: RetryOptions = {}) {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({
                task,
                options,
                resolve: resolve as (value: unknown) => void,
                reject,
            });
            this.processQueue();
        });
    }

    getStats() {
        return {
            name: this.name,
            queued: this.queue.length,
            active: this.activeCount,
            concurrency: this.concurrency,
        };
    }

    private processQueue() {
        while (this.activeCount < this.concurrency && this.queue.length > 0) {
            const item = this.queue.shift();
            if (!item) break;
            this.activeCount += 1;

            this.executeWithRetry(item)
                .then(item.resolve)
                .catch(item.reject)
                .finally(() => {
                    this.activeCount -= 1;
                    this.processQueue();
                });
        }
    }

    private async executeWithRetry<T>(item: PendingTask<T>) {
        const retries = item.options.retries ?? 2;
        const baseDelayMs = item.options.baseDelayMs ?? 500;
        const maxDelayMs = item.options.maxDelayMs ?? 5000;
        const timeoutMs = item.options.timeoutMs;

        let attempt = 0;
        // attempt=0 is first try, then retries
        while (attempt <= retries) {
            try {
                return await withTimeout(item.task(), timeoutMs);
            } catch (error) {
                if (attempt >= retries) {
                    throw error;
                }
                const exponential = baseDelayMs * Math.pow(2, attempt);
                const jitter = Math.floor(Math.random() * 250);
                const delay = Math.min(maxDelayMs, exponential + jitter);
                await sleep(delay);
                attempt += 1;
            }
        }

        throw new Error('Retry queue exhausted unexpectedly');
    }
}
