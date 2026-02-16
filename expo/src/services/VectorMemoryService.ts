import { apiService } from './ApiService';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MemoryItem {
    id: string;
    text: string;
    embedding: number[];
    metadata: Record<string, any>;
    timestamp: number;
}

export interface SearchResult extends MemoryItem {
    similarity: number;
}

class VectorMemoryServiceClass {
    private db: SQLite.SQLiteDatabase | null = null;
    private isInitialized: boolean = false;

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────

    private async getBackendUrl(): Promise<string | null> {
        try {
            const url = await AsyncStorage.getItem('whatsapp_backend_url');
            if (url && url.startsWith('http')) {
                return url.trim().replace(/\/$/, '');
            }
        } catch (e) {
            // Ignore
        }
        return null;
    }

    // ─────────────────────────────────────────────────────────────
    // DATABASE INITIALIZATION
    // ─────────────────────────────────────────────────────────────

    /**
     * Ensure the SQLite database is open and the table exists.
     */
    private async ensureInitialized(): Promise<void> {
        if (this.isInitialized && this.db) return;

        try {
            this.db = SQLite.openDatabaseSync('vector_memory.db');

            // Create table if not exists
            this.db.execSync(`
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY NOT NULL,
                    text TEXT NOT NULL,
                    embedding TEXT NOT NULL,
                    metadata TEXT NOT NULL DEFAULT '{}',
                    timestamp INTEGER NOT NULL
                );
            `);

            this.isInitialized = true;
            const countResult = this.db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM memories');
            console.log(`[VectorMemory] SQLite DB initialized. ${countResult?.count || 0} memories found.`);
        } catch (error) {
            console.error('[VectorMemory] DB initialization failed:', error);
            throw error;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CORE OPERATIONS
    // ─────────────────────────────────────────────────────────────

    /**
     * Load memories (compatibility method - now just ensures DB is initialized)
     */
    async load(): Promise<void> {
        await this.ensureInitialized();
    }

    /**
     * Add a new memory item (automatically generates embedding)
     */
    async addMemory(text: string, metadata: Record<string, any> = {}, storageType: 'auto' | 'local' | 'backend' = 'auto'): Promise<void> {
        // Determine target storage
        let useBackend = false;

        if (storageType === 'backend') {
            useBackend = true;
        } else if (storageType === 'auto') {
            const backendUrl = await this.getBackendUrl();
            useBackend = !!backendUrl;
        }

        // 1. Backend Storage
        if (useBackend) {
            const backendUrl = await this.getBackendUrl();
            if (backendUrl) {
                try {
                    console.log(`[VectorMemory] Adding to Backend (${storageType}):`, backendUrl);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);

                    const response = await fetch(`${backendUrl}/memory/add`, {
                        method: 'POST',
                        signal: controller.signal,
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-key': 'breviai-secret-password'
                        },
                        body: JSON.stringify({ text, metadata })
                    });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        console.log('[VectorMemory] Backend Add Success');
                        return;
                    } else {
                        console.warn('[VectorMemory] Backend Add Failed, falling back to local if auto.', response.status);
                        if (storageType === 'backend') throw new Error('Backend add failed');
                    }
                } catch (e) {
                    console.warn('[VectorMemory] Backend Unreachable:', e);
                    if (storageType === 'backend') throw e;
                }
            } else if (storageType === 'backend') {
                throw new Error('Backend URL not configured');
            }
        }

        // 2. Local Storage (Fallback or Explicit)
        // If we successfully used backend and didn't fall back, we return here (unless we want dual storage? likely not)
        if (useBackend && storageType !== 'auto') return; // If forced backend succeeded, done.

        // If auto and backend succeeded, we might want to skip local to avoid duplication?
        // Current logic: If backend succeeds, we return. If backend fails (and auto), we convert to local.
        // Wait, I missed the return in success block above. Yes, it returns.

        await this.ensureInitialized();

        try {
            // Get Embedding from API (Client-side)
            const embedding = await apiService.getEmbedding(text);

            if (!embedding || embedding.length === 0) {
                console.warn('[VectorMemory] Failed to generate embedding for:', text.substring(0, 50));
                return;
            }

            const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
            const timestamp = Date.now();

            this.db!.runSync(
                'INSERT OR REPLACE INTO memories (id, text, embedding, metadata, timestamp) VALUES (?, ?, ?, ?, ?)',
                id,
                text,
                JSON.stringify(embedding),
                JSON.stringify(metadata),
                timestamp
            );

            console.log(`[VectorMemory] Added local memory (storage: ${storageType}):`, text.substring(0, 30) + '...');
        } catch (error) {
            console.error('[VectorMemory] Failed to add local memory:', error);
            throw error;
        }
    }

    /**
     * Search for similar memories - HYBRID: Exact match first, then semantic
     */
    async search(query: string, limit: number = 3, threshold: number = 0.7, storageType: 'auto' | 'local' | 'backend' = 'auto'): Promise<SearchResult[]> {
        // Determine target storage
        let useBackend = false;

        if (storageType === 'backend') {
            useBackend = true;
        } else if (storageType === 'auto') {
            const backendUrl = await this.getBackendUrl();
            useBackend = !!backendUrl;
        }

        // 1. Backend Search
        if (useBackend) {
            const backendUrl = await this.getBackendUrl();
            if (backendUrl) {
                try {
                    console.log(`[VectorMemory] Searching Backend (${storageType}):`, backendUrl);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);

                    const response = await fetch(`${backendUrl}/memory/search`, {
                        method: 'POST',
                        signal: controller.signal,
                        headers: { 'Content-Type': 'application/json', 'x-auth-key': 'breviai-secret-password' },
                        body: JSON.stringify({ query, limit, threshold })
                    });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && Array.isArray(data.results)) {
                            console.log(`[VectorMemory] Backend returned ${data.results.length} results`);
                            return data.results;
                        }
                    }
                } catch (e) {
                    console.warn('[VectorMemory] Backend Search Failed:', e);
                    if (storageType === 'backend') return []; // Don't fallback if explicitly backend
                }
            } else if (storageType === 'backend') {
                return [];
            }
        }

        // 2. Local Search
        await this.ensureInitialized();

        try {
            const queryLower = query.toLowerCase().trim();

            const likePattern = `%${queryLower}%`;
            const exactRows = this.db!.getAllSync<{
                id: string; text: string; embedding: string; metadata: string; timestamp: number;
            }>(
                'SELECT * FROM memories WHERE LOWER(text) LIKE ? OR LOWER(metadata) LIKE ? ORDER BY timestamp DESC LIMIT ?',
                likePattern,
                likePattern,
                limit
            );

            if (exactRows.length > 0) {
                console.log(`[VectorMemory] Exact matches found: ${exactRows.length}`);
                return exactRows.map(row => ({
                    id: row.id,
                    text: row.text,
                    embedding: JSON.parse(row.embedding),
                    metadata: JSON.parse(row.metadata),
                    timestamp: row.timestamp,
                    similarity: 1.0
                }));
            }

            console.log('[VectorMemory] No exact matches, falling back to semantic search...');

            const queryEmbedding = await apiService.getEmbedding(query);

            if (!queryEmbedding || queryEmbedding.length === 0) {
                return [];
            }

            const allRows = this.db!.getAllSync<{
                id: string; text: string; embedding: string; metadata: string; timestamp: number;
            }>('SELECT * FROM memories');

            const results: SearchResult[] = allRows.map(row => {
                const itemEmbedding = JSON.parse(row.embedding);
                return {
                    id: row.id,
                    text: row.text,
                    embedding: itemEmbedding,
                    metadata: JSON.parse(row.metadata),
                    timestamp: row.timestamp,
                    similarity: this.cosineSimilarity(queryEmbedding, itemEmbedding)
                };
            });

            return results
                .filter(item => item.similarity >= threshold)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);

        } catch (error) {
            console.error('[VectorMemory] Search failed:', error);
            return [];
        }
    }

    /**
     * Clear all memories (for debugging/reset)
     */
    async clear(storageType: 'auto' | 'local' | 'backend' = 'auto'): Promise<void> {
        let cleared = false;
        const backendUrl = await this.getBackendUrl();

        // Backend Clear
        if (storageType !== 'local' && backendUrl) {
            try {
                await fetch(`${backendUrl}/memory/clear`, { method: 'DELETE', headers: { 'x-auth-key': 'breviai-secret-password' } });
                console.log('[VectorMemory] Backend memory cleared');
                cleared = true;
            } catch (e) { console.error(e); }
        }

        // Local Clear
        if (storageType !== 'backend') {
            await this.ensureInitialized();
            this.db!.runSync('DELETE FROM memories');
            console.log('[VectorMemory] Local memories cleared');
            cleared = true;
        }

        if (!cleared) {
            console.warn('[VectorMemory] Clear called but nothing happened or failed (Storage: ' + storageType + ')');
        }
    }

    /**
     * Get all memories (for debugging/listing)
     */
    async getAll(): Promise<MemoryItem[]> {
        await this.ensureInitialized();

        const rows = this.db!.getAllSync<{
            id: string; text: string; embedding: string; metadata: string; timestamp: number;
        }>('SELECT * FROM memories ORDER BY timestamp DESC');

        console.log(`[VectorMemory] Listing ${rows.length} memories`);

        return rows.map(row => ({
            id: row.id,
            text: row.text,
            embedding: JSON.parse(row.embedding),
            metadata: JSON.parse(row.metadata),
            timestamp: row.timestamp
        }));
    }

    /**
     * Get memory count
     */
    async getCount(): Promise<number> {
        await this.ensureInitialized();
        const result = this.db!.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM memories');
        return result?.count || 0;
    }

    // ─────────────────────────────────────────────────────────────
    // MATH HELPERS
    // ─────────────────────────────────────────────────────────────

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

export const vectorMemoryService = new VectorMemoryServiceClass();
