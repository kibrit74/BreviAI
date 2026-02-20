/**
 * Prompt Router - Selects optimal AI model based on command complexity.
 */

export type ModelType = 'flash-25' | 'flash-30';

interface PromptAnalysis {
    model: ModelType;
    reason: string;
    complexity: 'simple' | 'moderate' | 'complex';
}

const SIMPLE_KEYWORDS = [
    'ac', 'kapat', 'ayarla', 'baslat', 'durdur', 'degistir',
    'wi-fi', 'wifi', 'bluetooth', 'ses', 'parlaklik', 'mod',
];

const COMPLEX_KEYWORDS = [
    'eger', 'sartiyla', 'kosulunda', 'veya', 'hem', 'hem de',
    'izlemeye baslarsa', 'acarsa', 'kapanirsa', 'geldiginde',
    'dakika', 'saat', 'limit', 'sure', 'engelle', 'bildir',
    'rapor', 'istatistik', 'takip', 'izle',
];

const APP_KEYWORDS = [
    'youtube', 'tiktok', 'instagram', 'snapchat', 'twitter',
    'oyun', 'game', 'uygulama', 'app', 'shorts', 'reels',
];

function normalizeForMatch(input: string): string {
    return input
        .toLowerCase()
        .replace(/\u00e7/g, 'c')
        .replace(/\u011f/g, 'g')
        .replace(/\u0131/g, 'i')
        .replace(/\u00f6/g, 'o')
        .replace(/\u015f/g, 's')
        .replace(/\u00fc/g, 'u');
}

/**
 * Analyze prompt and determine the best model to use.
 */
export function analyzePrompt(prompt: string): PromptAnalysis {
    const normalizedPrompt = normalizeForMatch(prompt);
    let simpleScore = 0;
    let complexScore = 0;

    for (const keyword of SIMPLE_KEYWORDS) {
        if (normalizedPrompt.includes(keyword)) {
            simpleScore += 1;
        }
    }

    for (const keyword of COMPLEX_KEYWORDS) {
        if (normalizedPrompt.includes(keyword)) {
            complexScore += 2;
        }
    }

    for (const keyword of APP_KEYWORDS) {
        if (normalizedPrompt.includes(keyword)) {
            complexScore += 1;
        }
    }

    if (prompt.length < 30) {
        simpleScore += 2;
    } else if (prompt.length > 100) {
        complexScore += 2;
    }

    const conditionCount = (normalizedPrompt.match(/,|ve\s|veya\s/g) || []).length;
    if (conditionCount >= 2) {
        complexScore += conditionCount;
    }

    if (/\b(her gun|every day|saat|dakika|hafta|ay|schedule|cron)\b/.test(normalizedPrompt)) {
        complexScore += 2;
    }

    const likelyComplex =
        complexScore > simpleScore || (complexScore === simpleScore && prompt.length > 90);
    const complexity: PromptAnalysis['complexity'] = likelyComplex
        ? (complexScore >= 6 ? 'complex' : 'moderate')
        : 'simple';

    const model: ModelType = complexity === 'simple' ? 'flash-25' : 'flash-30';
    const reason = model === 'flash-30'
        ? `Karmasik komut (skor: ${complexScore}/${simpleScore}) - Gemini 3.0 Flash secildi`
        : `Basit komut (skor: ${simpleScore}/${complexScore}) - Gemini 2.5 Flash secildi`;

    return {
        model,
        reason,
        complexity,
    };
}

export function getModelDisplayName(model: ModelType): string {
    return model === 'flash-25' ? 'Gemini 2.5 Flash' : 'Gemini 3.0 Flash';
}
