export interface ErrorInsight {
    category: string;
    rootCause: string;
    suggestion: string;
    confidence: number;
}

interface Rule {
    category: string;
    confidence: number;
    match: RegExp[];
    rootCause: string;
    suggestion: string;
}

const INSIGHT_RULES: Rule[] = [
    {
        category: 'auth',
        confidence: 0.9,
        match: [/unauthorized/i, /auth/i, /token/i, /401/, /expired/i],
        rootCause: 'Kimlik doğrulama bilgisi eksik/geçersiz veya süresi dolmuş.',
        suggestion: 'Token/anahtar yenileyin, gerekli Authorization başlıklarını doğrulayın ve tekrar deneyin.',
    },
    {
        category: 'rate_limit',
        confidence: 0.95,
        match: [/rate/i, /429/, /too many requests/i, /quota/i],
        rootCause: 'İstek limiti veya kota aşıldı.',
        suggestion: 'Retry backoff kullanın, çağrı frekansını azaltın veya limitleri yeniden yapılandırın.',
    },
    {
        category: 'network',
        confidence: 0.8,
        match: [/network/i, /fetch failed/i, /econn/i, /timeout/i, /timed out/i],
        rootCause: 'Ağ bağlantısı veya dış servis erişimi sırasında hata oluştu.',
        suggestion: 'Ağ bağlantısını kontrol edin, timeout değerini artırın ve retry ile tekrar deneyin.',
    },
    {
        category: 'validation',
        confidence: 0.92,
        match: [/validation/i, /invalid/i, /required/i, /missing/i, /bad request/i, /400/],
        rootCause: 'İstek gövdesi veya parametreler beklenen şemaya uymuyor.',
        suggestion: 'Request payload alanlarını doğrulayın, zorunlu alanları doldurun ve tipleri düzeltin.',
    },
    {
        category: 'credential',
        confidence: 0.88,
        match: [/api key/i, /credential/i, /smtp/i, /oauth/i, /forbidden/i, /403/],
        rootCause: 'Entegrasyon kimlik bilgileri eksik, yanlış veya yetkisiz.',
        suggestion: 'İlgili servis için API key/OAuth/SMTP ayarlarını doğrulayın ve bağlantıyı yeniden kurun.',
    },
    {
        category: 'not_found',
        confidence: 0.9,
        match: [/not found/i, /404/, /bulunamadı/i],
        rootCause: 'İstenen kaynak mevcut değil veya yanlış kimlik ile çağrıldı.',
        suggestion: 'Kaynak ID/path bilgisini doğrulayın ve önce kaynağın varlığını kontrol edin.',
    },
    {
        category: 'dependency',
        confidence: 0.75,
        match: [/database/i, /supabase/i, /service unavailable/i, /503/, /failed/i],
        rootCause: 'Bağımlı servis veya veritabanı çağrısı başarısız.',
        suggestion: 'Bağımlı servisin sağlık durumunu kontrol edin; circuit-breaker/retry politikasını uygulayın.',
    },
];

export function inferErrorInsight(input?: {
    code?: string;
    message?: string;
}): ErrorInsight {
    const haystack = `${input?.code || ''} ${input?.message || ''}`.trim();
    if (!haystack) {
        return {
            category: 'unknown',
            rootCause: 'Hata kaynağı belirlenemedi.',
            suggestion: 'Detaylı logları inceleyin ve istek/yanıt içeriğini doğrulayın.',
            confidence: 0.4,
        };
    }

    const lowered = haystack.toLowerCase();

    for (const rule of INSIGHT_RULES) {
        if (rule.match.some((pattern) => pattern.test(lowered))) {
            return {
                category: rule.category,
                rootCause: rule.rootCause,
                suggestion: rule.suggestion,
                confidence: rule.confidence,
            };
        }
    }

    return {
        category: 'unknown',
        rootCause: 'Hata sınıflandırılamadı.',
        suggestion: 'Execution detaylarını inceleyin ve ilgili endpoint için input doğrulamasını tekrar edin.',
        confidence: 0.45,
    };
}
