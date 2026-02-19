export interface FriendlyWorkflowError {
    title: string;
    beginnerMessage: string;
    intermediateMessage: string;
    actionItems: string[];
    technicalMessage: string;
}

const DEFAULT_ACTIONS = [
    'Node ayarlarini acip zorunlu alanlarin dolu oldugunu kontrol edin.',
    'Bu nodea gelmeden once gerekli veriyi olusturan bir node baglayin.',
    'Tekrar calistirmadan once workflowu kaydedin.',
];

export function explainWorkflowError(rawError?: string, nodeLabel?: string): FriendlyWorkflowError {
    const message = (rawError || 'Bilinmeyen hata').trim();
    const lower = message.toLowerCase();
    const nodeText = nodeLabel ? `"${nodeLabel}" adiminda` : 'Bu adimda';

    if (lower.includes('cannot read property') || lower.includes('cannot read properties')) {
        if (lower.includes("'query'") || lower.includes('query')) {
            return {
                title: 'Eksik arama degeri',
                beginnerMessage: `${nodeText} arama metni bos geldigi icin islem baslatilamadi.`,
                intermediateMessage: 'Node icindeki "query" alani undefined geliyor. Genelde onceki noddan veri gelmediginde olur.',
                actionItems: [
                    'Kisi Bul gibi arama yapan node oncesine Metin Girisi nodeu ekleyin.',
                    'Arama alanina {{previous_output}} veya tanimli bir degisken yazin.',
                    'Bos degerle calismayi engellemek icin IF/ELSE kontrolu ekleyin.',
                ],
                technicalMessage: message,
            };
        }

        return {
            title: 'Eksik veri',
            beginnerMessage: `${nodeText} gereken bir bilgi gelmedigi icin hata olustu.`,
            intermediateMessage: 'Kod, undefined olan bir alan okumaya calisti. Veri akisi veya degisken adi eslesmiyor olabilir.',
            actionItems: [
                'Node girisindeki degisken adlarini kontrol edin.',
                'Bir onceki node cikisini SHOW_TEXT ile test edin.',
                'Gerekirse bos deger kontrolu icin IF/ELSE ekleyin.',
            ],
            technicalMessage: message,
        };
    }

    if (lower.includes('permission') || lower.includes('not granted') || lower.includes('denied')) {
        return {
            title: 'Izin gerekli',
            beginnerMessage: `${nodeText} telefon izni olmadan calisamaz.`,
            intermediateMessage: 'Isletim sistemi ilgili izni reddetti. Node API cagrisi izin kontrolunde duruyor.',
            actionItems: [
                'Uygulama ayarlarindan ilgili izni acin (Rehber, Konum, Mikrofon vb).',
                'Izni actiktan sonra workflowu tekrar calistirin.',
                'Ilk adima izin kontrolu veya bilgi mesaji ekleyin.',
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
            title: 'Baglanti sorunu',
            beginnerMessage: `${nodeText} internete baglanamadigi icin tamamlanamadi.`,
            intermediateMessage: 'HTTP istegi zaman asimina ugradi veya servis erisilemedi.',
            actionItems: [
                'Internet baglantisini kontrol edin.',
                'Gerekirse URL/API endpoint bilgisini tekrar dogrulayin.',
                'Ayni adimi 10-20 saniye sonra tekrar deneyin.',
            ],
            technicalMessage: message,
        };
    }

    if (lower.includes('api key') || lower.includes('unauthorized') || lower.includes('401') || lower.includes('403')) {
        return {
            title: 'Yetkilendirme hatasi',
            beginnerMessage: `${nodeText} servis kimlik dogrulamasini gecemedi.`,
            intermediateMessage: 'API anahtari eksik, gecersiz veya izin kapsaminda degil.',
            actionItems: [
                'API anahtarinin kayitli oldugunu kontrol edin.',
                'Anahtarin dogru ortam/proje icin uretildigini dogrulayin.',
                'Servis panelinden yetki kapsamlarini kontrol edin.',
            ],
            technicalMessage: message,
        };
    }

    if (lower.includes('json') || lower.includes('unexpected token')) {
        return {
            title: 'Veri formati hatasi',
            beginnerMessage: `${nodeText} beklenen veri formatini okuyamadi.`,
            intermediateMessage: 'JSON parse asamasinda format bozuklugu var veya beklenen yapiyla gelen yapi farkli.',
            actionItems: [
                'Node girisindeki JSON metnini dogrulayin.',
                'Gelen veriyi once SHOW_TEXT ile kontrol edin.',
                'Mumkunse veri donusumunu CODE_EXECUTION yerine ayri adimlarla sade tutun.',
            ],
            technicalMessage: message,
        };
    }

    if (lower.includes('not implemented') || lower.includes('not found in registry') || lower.includes('executor')) {
        return {
            title: 'Node henuz hazir degil',
            beginnerMessage: `${nodeText} uygulamada henuz tam desteklenmiyor olabilir.`,
            intermediateMessage: 'Node tipi registry/executor katmaninda bulunamadi veya implement edilmemis.',
            actionItems: [
                'Ayni sonucu veren alternatif bir node deneyin.',
                'Node tipini degistirip tekrar test edin.',
                'Gerekirse bu adimi gecici olarak devre disi birakin.',
            ],
            technicalMessage: message,
        };
    }

    return {
        title: 'Calistirma hatasi',
        beginnerMessage: `${nodeText} beklenmedik bir hata verdi.`,
        intermediateMessage: 'Teknik hata mesaji daha fazla ayrinti veriyor. Veri akisi veya node konfigurasyonu kontrol edilmeli.',
        actionItems: DEFAULT_ACTIONS,
        technicalMessage: message,
    };
}
