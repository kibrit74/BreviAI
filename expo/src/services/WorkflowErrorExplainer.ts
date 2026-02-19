export interface FriendlyWorkflowError {
    title: string;
    beginnerMessage: string;
    intermediateMessage: string;
    actionItems: string[];
    technicalMessage: string;
}

const DEFAULT_ACTIONS = [
    'Node ayarlarını açıp zorunlu alanların dolu olduğunu kontrol edin.',
    'Bu node\'a gelmeden önce gerekli veriyi oluşturan bir node bağlayın.',
    'Tekrar çalıştırmadan önce workflow\'u kaydedin.',
];

export function explainWorkflowError(rawError?: string, nodeLabel?: string): FriendlyWorkflowError {
    const message = (rawError || 'Bilinmeyen hata').trim();
    const lower = message.toLowerCase();
    const nodeText = nodeLabel ? `"${nodeLabel}" adımında` : 'Bu adımda';

    if (lower.includes('cannot read property') || lower.includes('cannot read properties')) {
        if (lower.includes("'query'") || lower.includes('query')) {
            return {
                title: 'Eksik arama değeri',
                beginnerMessage: `${nodeText} arama metni boş geldiği için işlem başlatılamadı.`,
                intermediateMessage: 'Node içindeki "query" alanı undefined geliyor. Genelde önceki node\'dan veri gelmediğinde olur.',
                actionItems: [
                    'Kişi Bul gibi arama yapan node öncesine Metin Girişi node\'u ekleyin.',
                    'Arama alanına {{previous_output}} veya tanımlı bir değişken yazın.',
                    'Boş değerle çalışmayı engellemek için IF/ELSE kontrolü ekleyin.',
                ],
                technicalMessage: message,
            };
        }

        return {
            title: 'Eksik veri',
            beginnerMessage: `${nodeText} gereken bir bilgi gelmediği için hata oluştu.`,
            intermediateMessage: 'Kod, undefined olan bir alan okumaya çalıştı. Veri akışı veya değişken adı eşleşmiyor olabilir.',
            actionItems: [
                'Node girişindeki değişken adlarını kontrol edin.',
                'Bir önceki node çıkışını SHOW_TEXT ile test edin.',
                'Gerekirse boş değer kontrolü için IF/ELSE ekleyin.',
            ],
            technicalMessage: message,
        };
    }

    if (lower.includes('permission') || lower.includes('not granted') || lower.includes('denied')) {
        return {
            title: 'İzin gerekli',
            beginnerMessage: `${nodeText} telefon izni olmadan çalışamaz.`,
            intermediateMessage: 'İşletim sistemi ilgili izni reddetti. Node API çağrısı izin kontrolünde duruyor.',
            actionItems: [
                'Uygulama ayarlarından ilgili izni açın (Rehber, Konum, Mikrofon vb).',
                'İzni açtıktan sonra workflow\'u tekrar çalıştırın.',
                'İlk adıma izin kontrolü veya bilgi mesajı ekleyin.',
            ],
            technicalMessage: message,
        };
    }

    if (
        lower.includes('network request failed') ||
        lower.includes('timeout') ||
        lower.includes('failed to fetch') ||
        lower.includes('econn') ||
        lower.includes('internet')
    ) {
        return {
            title: 'Bağlantı sorunu',
            beginnerMessage: `${nodeText} internete bağlanamadığı için tamamlanamadı.`,
            intermediateMessage: 'HTTP isteği zaman aşımına uğradı veya servise erişilemedi.',
            actionItems: [
                'İnternet bağlantınızı kontrol edin.',
                'Gerekirse URL/API endpoint bilgisini tekrar doğrulayın.',
                'Aynı adımı 10-20 saniye sonra tekrar deneyin.',
            ],
            technicalMessage: message,
        };
    }

    if (lower.includes('api key') || lower.includes('unauthorized') || lower.includes('401') || lower.includes('403')) {
        return {
            title: 'Yetkilendirme hatası',
            beginnerMessage: `${nodeText} servis kimlik doğrulamasını geçemedi.`,
            intermediateMessage: 'API anahtarı eksik, geçersiz veya izin kapsamında değil.',
            actionItems: [
                'API anahtarının kayıtlı olduğunu kontrol edin.',
                'Anahtarın doğru ortam/proje için üretildiğini doğrulayın.',
                'Servis panelinden yetki kapsamlarını kontrol edin.',
            ],
            technicalMessage: message,
        };
    }

    if (lower.includes('json') || lower.includes('unexpected token')) {
        return {
            title: 'Veri formatı hatası',
            beginnerMessage: `${nodeText} beklenen veri formatını okuyamadı.`,
            intermediateMessage: 'JSON parse aşamasında format bozukluğu var veya beklenen yapıyla gelen yapı farklı.',
            actionItems: [
                'Node girişindeki JSON metnini doğrulayın.',
                'Gelen veriyi önce SHOW_TEXT ile kontrol edin.',
                'Mümkünse veri dönüşümünü CODE_EXECUTION yerine ayrı adımlarla sade tutun.',
            ],
            technicalMessage: message,
        };
    }

    if (lower.includes('not implemented') || lower.includes('not found in registry') || lower.includes('executor')) {
        return {
            title: 'Node henüz hazır değil',
            beginnerMessage: `${nodeText} uygulamada henüz tam desteklenmiyor olabilir.`,
            intermediateMessage: 'Node tipi registry/executor katmanında bulunamadı veya implement edilmemiş.',
            actionItems: [
                'Aynı sonucu veren alternatif bir node deneyin.',
                'Node tipini değiştirip tekrar test edin.',
                'Gerekirse bu adımı geçici olarak devre dışı bırakın.',
            ],
            technicalMessage: message,
        };
    }

    return {
        title: 'Çalıştırma hatası',
        beginnerMessage: `${nodeText} beklenmedik bir hata verdi.`,
        intermediateMessage: 'Teknik hata mesajı daha fazla ayrıntı veriyor. Veri akışı veya node konfigürasyonu kontrol edilmeli.',
        actionItems: DEFAULT_ACTIONS,
        technicalMessage: message,
    };
}
