import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShortcutStep } from './ApiService';

const STORAGE_KEY = 'brevi_saved_shortcuts';

export interface SavedShortcut {
    id: string;
    name: string;
    prompt: string;
    steps: ShortcutStep[];
    nodes?: any[];
    edges?: any[];
    createdAt: string;
    lastUsed: string;
    usageCount: number;
    isFavorite: boolean;
}

export class ShortcutStorage {
    /**
     * Generate unique ID for shortcut
     */
    private static generateId(): string {
        return `shortcut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Save a new shortcut
     */
    static async save(shortcut: Omit<SavedShortcut, 'id' | 'createdAt' | 'lastUsed' | 'usageCount' | 'isFavorite'>): Promise<SavedShortcut> {
        const shortcuts = await this.getAll();

        const newShortcut: SavedShortcut = {
            id: this.generateId(),
            name: shortcut.name,
            prompt: shortcut.prompt,
            steps: shortcut.steps || [],
            nodes: shortcut.nodes,
            edges: shortcut.edges,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            usageCount: 0,
            isFavorite: false,
        };

        shortcuts.unshift(newShortcut); // Add to beginning
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));

        return newShortcut;
    }

    /**
     * Get all saved shortcuts
     */
    static async getAll(): Promise<SavedShortcut[]> {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading shortcuts:', error);
            return [];
        }
    }

    /**
     * Get a single shortcut by ID
     */
    static async getById(id: string): Promise<SavedShortcut | null> {
        const shortcuts = await this.getAll();
        return shortcuts.find(s => s.id === id) || null;
    }

    /**
     * Update shortcut usage stats
     */
    static async incrementUsage(id: string): Promise<void> {
        const shortcuts = await this.getAll();
        const index = shortcuts.findIndex(s => s.id === id);

        if (index !== -1) {
            shortcuts[index].usageCount++;
            shortcuts[index].lastUsed = new Date().toISOString();
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
        }
    }

    /**
     * Toggle favorite status
     */
    static async toggleFavorite(id: string): Promise<boolean> {
        const shortcuts = await this.getAll();
        const index = shortcuts.findIndex(s => s.id === id);

        if (index !== -1) {
            shortcuts[index].isFavorite = !shortcuts[index].isFavorite;
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
            return shortcuts[index].isFavorite;
        }
        return false;
    }

    /**
     * Delete a shortcut
     */
    static async delete(id: string): Promise<void> {
        const shortcuts = await this.getAll();
        const filtered = shortcuts.filter(s => s.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }

    /**
     * Delete all shortcuts
     */
    static async deleteAll(): Promise<void> {
        await AsyncStorage.removeItem(STORAGE_KEY);
    }

    /**
     * Get shortcuts sorted by usage
     */
    static async getMostUsed(limit: number = 5): Promise<SavedShortcut[]> {
        const shortcuts = await this.getAll();
        return shortcuts
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, limit);
    }

    /**
     * Get favorite shortcuts
     */
    static async getFavorites(): Promise<SavedShortcut[]> {
        const shortcuts = await this.getAll();
        return shortcuts.filter(s => s.isFavorite);
    }

    /**
     * Get stats for dashboard (total runs, estimated time saved)
     */
    static async getStats(): Promise<{ automationsRun: number; timeSaved: number }> {
        const shortcuts = await this.getAll();

        // Calculate total runs from all shortcuts
        const totalRuns = shortcuts.reduce((sum, s) => sum + s.usageCount, 0);

        // Estimate time saved: ~2 minutes per automation run on average
        const timeSaved = totalRuns * 2;

        return {
            automationsRun: totalRuns,
            timeSaved: timeSaved
        };
    }
}
