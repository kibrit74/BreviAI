import { apiService } from './ApiService';
import * as SQLite from 'expo-sqlite';

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
    async addMemory(text: string, metadata: Record<string, any> = {}): Promise<void> {
        await this.ensureInitialized();

        try {
            // 1. Get Embedding from API
            const embedding = await apiService.getEmbedding(text);

            if (!embedding || embedding.length === 0) {
                console.warn('[VectorMemory] Failed to generate embedding for:', text.substring(0, 50));
                return;
            }

            // 2. Create Memory Item
            const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
            const timestamp = Date.now();

            // 3. Insert into SQLite
            this.db!.runSync(
                'INSERT OR REPLACE INTO memories (id, text, embedding, metadata, timestamp) VALUES (?, ?, ?, ?, ?)',
                id,
                text,
                JSON.stringify(embedding),
                JSON.stringify(metadata),
                timestamp
            );

            console.log('[VectorMemory] Added memory:', text.substring(0, 30) + '...');
        } catch (error) {
            console.error('[VectorMemory] Failed to add memory:', error);
        }
    }

    /**
     * Search for similar memories - HYBRID: Exact match first, then semantic
     */
    async search(query: string, limit: number = 3, threshold: number = 0.7): Promise<SearchResult[]> {
        await this.ensureInitialized();

        try {
            const queryLower = query.toLowerCase().trim();

            // 1. EXACT MATCH: Check text and metadata for exact substring match via SQL LIKE
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

            // 2. SEMANTIC SEARCH: Fall back to embedding similarity
            console.log('[VectorMemory] No exact matches, falling back to semantic search...');

            const queryEmbedding = await apiService.getEmbedding(query);

            if (!queryEmbedding || queryEmbedding.length === 0) {
                return [];
            }

            // Fetch all embeddings for cosine similarity comparison
            const allRows = this.db!.getAllSync<{
                id: string; text: string; embedding: string; metadata: string; timestamp: number;
            }>('SELECT * FROM memories');

            // Calculate Cosine Similarities
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

            // Filter and Sort
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
    async clear(): Promise<void> {
        await this.ensureInitialized();
        this.db!.runSync('DELETE FROM memories');
        console.log('[VectorMemory] Cleared all memories');
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
