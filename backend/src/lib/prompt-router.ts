/**
 * Prompt Router - Selects optimal AI model based on command complexity
 */

export type ModelType = 'flash-25' | 'flash-30';

interface PromptAnalysis {
    model: ModelType;
    reason: string;
    complexity: 'simple' | 'moderate' | 'complex';
}

// Keywords that indicate simple commands
const SIMPLE_KEYWORDS = [
    'aç', 'kapat', 'ayarla', 'başlat', 'durdur', 'değiştir',
    'wi-fi', 'wifi', 'bluetooth', 'ses', 'parlaklık', 'mod'
];

// Keywords that indicate complex commands
const COMPLEX_KEYWORDS = [
    'eğer', 'şartıyla', 'koşulunda', 'veya', 'hem', 'hem de',
    'izlemeye başlarsa', 'açarsa', 'kapanırsa', 'geldiğinde',
    'dakika', 'saat', 'limit', 'süre', 'engelle', 'bildir',
    'rapor', 'istatistik', 'takip', 'izle'
];

// App-related keywords (usually need complex handling)
const APP_KEYWORDS = [
    'youtube', 'tiktok', 'instagram', 'snapchat', 'twitter',
    'oyun', 'game', 'uygulama', 'app', 'shorts', 'reels'
];

/**
 * Analyze prompt and determine the best model to use
 */
export function analyzePrompt(prompt: string): PromptAnalysis {
    const lowerPrompt = prompt.toLowerCase();
    const words = lowerPrompt.split(/\s+/);

    // Count indicators
    let simpleScore = 0;
    let complexScore = 0;

    // Check simple keywords
    for (const keyword of SIMPLE_KEYWORDS) {
        if (lowerPrompt.includes(keyword)) {
            simpleScore++;
        }
    }

    // Check complex keywords
    for (const keyword of COMPLEX_KEYWORDS) {
        if (lowerPrompt.includes(keyword)) {
            complexScore += 2; // Weight complex indicators more
        }
    }

    // Check app-related keywords
    for (const keyword of APP_KEYWORDS) {
        if (lowerPrompt.includes(keyword)) {
            complexScore++;
        }
    }

    // Check prompt length
    if (prompt.length < 30) {
        simpleScore += 2;
    } else if (prompt.length > 100) {
        complexScore += 2;
    }

    // Check for multiple conditions (commas, 've', 'veya')
    const conditionCount = (lowerPrompt.match(/,|ve\s|veya\s/g) || []).length;
    if (conditionCount >= 2) {
        complexScore += conditionCount;
    }

    // Determine model
    // FOR MVP STABILITY: Always return flash-25 (Gemini 1.5 Flash) which is proven to work correctly.
    // The complexity score is still calculated for logging/analytics but routing is fixed to the reliable model.
    return {
        model: 'flash-25',
        reason: complexScore > simpleScore
            ? `Karmaşık komut (skor: ${complexScore}/${simpleScore}) - Stabilite için Gemini 2.5 pro kullanılıyor`
            : `Basit komut (skor: ${simpleScore}/${complexScore}) - Stabilite için Gemini 2.5 pro kullanılıyor`,
        complexity: complexScore > simpleScore ? (complexScore > 5 ? 'complex' : 'moderate') : 'simple'
    };
}

/**
 * Get the model name string for logging
 */
export function getModelDisplayName(model: ModelType): string {
    return model === 'flash-25' ? 'Gemini 2.5 Flash' : 'Gemini 3.0 Flash';
}
