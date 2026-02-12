/**
 * Agent Memory Service
 * Kullanıcı tercihlerini ve son işlemleri hatırlama sistemi
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MEMORY_KEY = '@agent_memory';
const MAX_RECENT_ACTIONS = 10;
const MAX_PATTERNS = 20;

export interface RecentAction {
    action: string;
    toolName: string;
    params?: Record<string, any>;
    result?: string;
    success: boolean;
    timestamp: number;
}

export interface LearnedPattern {
    trigger: string; // "sabah hava durumu"
    preferredAction: string; // "speak_weather"
    frequency: number;
    lastUsed: number;
}

export interface AgentMemory {
    // Kullanıcı Tercihleri
    preferences: {
        language: string;
        preferredName?: string; // "Bana Ali de"
        timezone: string;
        greetingStyle: 'formal' | 'casual';
        defaultCalendar?: string;
        favoriteContacts: string[];
        homeLocation?: { lat: number; lng: number; name: string };
        workLocation?: { lat: number; lng: number; name: string };
    };

    // Son İşlemler
    recentActions: RecentAction[];

    // Öğrenilen Kalıplar
    learnedPatterns: LearnedPattern[];

    // İstatistikler
    stats: {
        totalInteractions: number;
        firstInteraction: number;
        lastInteraction: number;
        mostUsedTools: Record<string, number>;
    };
}

const DEFAULT_MEMORY: AgentMemory = {
    preferences: {
        language: 'tr',
        timezone: 'Europe/Istanbul',
        greetingStyle: 'casual',
        favoriteContacts: [],
    },
    recentActions: [],
    learnedPatterns: [],
    stats: {
        totalInteractions: 0,
        firstInteraction: 0,
        lastInteraction: 0,
        mostUsedTools: {},
    },
};

class AgentMemoryServiceClass {
    private memory: AgentMemory = DEFAULT_MEMORY;
    private isLoaded: boolean = false;

    /**
     * Memory'yi AsyncStorage'dan yükle
     */
    async load(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem(MEMORY_KEY);
            if (stored) {
                this.memory = { ...DEFAULT_MEMORY, ...JSON.parse(stored) };
            }
            this.isLoaded = true;
            console.log('[AgentMemory] Loaded:', this.memory.stats.totalInteractions, 'interactions');
        } catch (error) {
            console.error('[AgentMemory] Load failed:', error);
            this.memory = DEFAULT_MEMORY;
            this.isLoaded = true;
        }
    }

    /**
     * Memory'yi AsyncStorage'a kaydet
     */
    private async save(): Promise<void> {
        try {
            await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(this.memory));
        } catch (error) {
            console.error('[AgentMemory] Save failed:', error);
        }
    }

    /**
     * Yüklü olduğundan emin ol
     */
    async ensureLoaded(): Promise<void> {
        if (!this.isLoaded) {
            await this.load();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TERCIHLER
    // ═══════════════════════════════════════════════════════════════

    getPreferences(): AgentMemory['preferences'] {
        return this.memory.preferences;
    }

    async setPreference<K extends keyof AgentMemory['preferences']>(
        key: K,
        value: AgentMemory['preferences'][K]
    ): Promise<void> {
        this.memory.preferences[key] = value;
        await this.save();
    }

    // ═══════════════════════════════════════════════════════════════
    // SON İŞLEMLER
    // ═══════════════════════════════════════════════════════════════

    getRecentActions(limit: number = 5): RecentAction[] {
        return this.memory.recentActions.slice(0, limit);
    }

    async logAction(action: Omit<RecentAction, 'timestamp'>): Promise<void> {
        await this.ensureLoaded();

        const newAction: RecentAction = {
            ...action,
            timestamp: Date.now(),
        };

        // Başa ekle
        this.memory.recentActions.unshift(newAction);

        // Limiti aşan kayıtları sil
        if (this.memory.recentActions.length > MAX_RECENT_ACTIONS) {
            this.memory.recentActions = this.memory.recentActions.slice(0, MAX_RECENT_ACTIONS);
        }

        // Tool kullanım sayısını güncelle
        this.memory.stats.mostUsedTools[action.toolName] =
            (this.memory.stats.mostUsedTools[action.toolName] || 0) + 1;

        // İstatistikleri güncelle
        this.memory.stats.totalInteractions++;
        this.memory.stats.lastInteraction = Date.now();
        if (!this.memory.stats.firstInteraction) {
            this.memory.stats.firstInteraction = Date.now();
        }

        await this.save();
    }

    // ═══════════════════════════════════════════════════════════════
    // KALIPLAR
    // ═══════════════════════════════════════════════════════════════

    getPatterns(): LearnedPattern[] {
        return this.memory.learnedPatterns;
    }

    async learnPattern(trigger: string, preferredAction: string): Promise<void> {
        await this.ensureLoaded();

        const existing = this.memory.learnedPatterns.find(
            p => p.trigger.toLowerCase() === trigger.toLowerCase()
        );

        if (existing) {
            existing.frequency++;
            existing.lastUsed = Date.now();
        } else {
            this.memory.learnedPatterns.push({
                trigger: trigger.toLowerCase(),
                preferredAction,
                frequency: 1,
                lastUsed: Date.now(),
            });

            // Limiti aşan kalıpları sil (en az kullanılanları)
            if (this.memory.learnedPatterns.length > MAX_PATTERNS) {
                this.memory.learnedPatterns.sort((a, b) => b.frequency - a.frequency);
                this.memory.learnedPatterns = this.memory.learnedPatterns.slice(0, MAX_PATTERNS);
            }
        }

        await this.save();
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTEXT OLUŞTURMA (AI için)
    // ═══════════════════════════════════════════════════════════════

    /**
     * AI System Prompt'a eklenecek kullanıcı context'i oluştur
     */
    generateUserContext(): string {
        const prefs = this.memory.preferences;
        const recent = this.getRecentActions(5);
        const stats = this.memory.stats;

        let context = '\n\n--- KULLANICI HAFIZASI ---\n';

        // Tercihler
        if (prefs.preferredName) {
            context += `Kullanıcının adı: ${prefs.preferredName}\n`;
        }
        context += `Dil: ${prefs.language === 'tr' ? 'Türkçe' : 'English'}\n`;
        context += `İletişim tarzı: ${prefs.greetingStyle === 'formal' ? 'Resmi' : 'Samimi'}\n`;

        // Favori kişiler
        if (prefs.favoriteContacts.length > 0) {
            context += `Sık iletişim: ${prefs.favoriteContacts.slice(0, 3).join(', ')}\n`;
        }

        // Konumlar
        if (prefs.homeLocation) {
            context += `Ev: ${prefs.homeLocation.name}\n`;
        }
        if (prefs.workLocation) {
            context += `İş: ${prefs.workLocation.name}\n`;
        }

        // Son işlemler
        if (recent.length > 0) {
            context += '\nSon işlemler:\n';
            recent.forEach((action, i) => {
                const timeAgo = this.formatTimeAgo(action.timestamp);
                context += `${i + 1}. ${action.action} (${timeAgo})\n`;
            });
        }

        // İstatistikler
        if (stats.totalInteractions > 0) {
            context += `\nToplam etkileşim: ${stats.totalInteractions}\n`;

            // En çok kullanılan 3 tool
            const topTools = Object.entries(stats.mostUsedTools)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([tool]) => tool);

            if (topTools.length > 0) {
                context += `Sık kullanılan: ${topTools.join(', ')}\n`;
            }
        }

        context += '--- HAFIZA SONU ---\n';

        return context;
    }

    /**
     * Saat bazlı selamlaşma
     */
    getGreeting(): string {
        const hour = new Date().getHours();
        const name = this.memory.preferences.preferredName;
        const style = this.memory.preferences.greetingStyle;

        let greeting = '';

        if (hour >= 5 && hour < 12) {
            greeting = style === 'formal' ? 'Günaydın' : 'Günaydın';
        } else if (hour >= 12 && hour < 18) {
            greeting = style === 'formal' ? 'İyi günler' : 'Selam';
        } else if (hour >= 18 && hour < 22) {
            greeting = style === 'formal' ? 'İyi akşamlar' : 'İyi akşamlar';
        } else {
            greeting = style === 'formal' ? 'İyi geceler' : 'Geç saatlerde';
        }

        return name ? `${greeting} ${name}!` : `${greeting}!`;
    }

    private formatTimeAgo(timestamp: number): string {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'az önce';
        if (minutes < 60) return `${minutes} dk önce`;
        if (hours < 24) return `${hours} saat önce`;
        return `${days} gün önce`;
    }

    // ═══════════════════════════════════════════════════════════════
    // RESET
    // ═══════════════════════════════════════════════════════════════

    async reset(): Promise<void> {
        this.memory = DEFAULT_MEMORY;
        await AsyncStorage.removeItem(MEMORY_KEY);
        console.log('[AgentMemory] Reset complete');
    }

    // ... (Existing code)
    /**
     * Debug için mevcut memory'yi döndür
     */
    getDebugInfo(): AgentMemory {
        return this.memory;
    }

    // ═══════════════════════════════════════════════════════════════
    // VEKTÖR HAFIZA (SEMANTIC SEARCH) - NEW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Konumsal (Semantic) Arama yap
     * Hem son işlemleri hem de vektör hafızasını tarar.
     */
    async searchMemories(query: string): Promise<string[]> {
        await this.ensureLoaded();

        try {
            // Lazy load vector service to avoid circular dependency issues at import time
            const { vectorMemoryService } = require('./VectorMemoryService');

            // 1. Search Vector Memory
            const vectorResults = await vectorMemoryService.search(query);
            const vectorTexts = vectorResults.map((r: any) => `[Hafıza] ${r.text}`);

            // 2. Search Recent Actions (Simple keyword match as fallback/boost)
            const recentTexts = this.memory.recentActions
                .filter(a => a.action.toLowerCase().includes(query.toLowerCase()) ||
                    (a.result && a.result.toLowerCase().includes(query.toLowerCase())))
                .map(a => `[Son İşlem] ${a.action}: ${a.result || 'Başarılı'}`);

            return [...vectorTexts, ...recentTexts];
        } catch (error) {
            console.error('[AgentMemory] Search failed:', error);
            return [];
        }
    }

    /**
     * Önemli bir anı kaydet (Vektör olarak)
     */
    async saveSemanticMemory(text: string, metadata: Record<string, any> = {}): Promise<void> {
        try {
            const { vectorMemoryService } = require('./VectorMemoryService');
            await vectorMemoryService.addMemory(text, metadata);
        } catch (error) {
            console.error('[AgentMemory] Save semantic memory failed:', error);
        }
    }
}

export const AgentMemoryService = new AgentMemoryServiceClass();
