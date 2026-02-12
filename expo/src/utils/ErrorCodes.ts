/**
 * Error Codes - Standart hata kodları
 * Tüm uygulama genelinde tutarlı hata yönetimi için
 */

export enum ErrorCode {
    // Genel hatalar (1xxx)
    UNKNOWN = 'E1000',
    INVALID_INPUT = 'E1001',
    TIMEOUT = 'E1002',
    CANCELLED = 'E1003',

    // İzin hataları (2xxx)
    PERMISSION_DENIED = 'E2000',
    LOCATION_PERMISSION = 'E2001',
    MICROPHONE_PERMISSION = 'E2002',
    STORAGE_PERMISSION = 'E2003',
    CONTACTS_PERMISSION = 'E2004',
    CALENDAR_PERMISSION = 'E2005',
    NOTIFICATION_PERMISSION = 'E2006',

    // Ağ hataları (3xxx)
    NETWORK_ERROR = 'E3000',
    API_ERROR = 'E3001',
    SERVER_ERROR = 'E3002',
    CONNECTION_TIMEOUT = 'E3003',

    // Yapılandırma hataları (4xxx)
    CONFIG_ERROR = 'E4000',
    MISSING_API_KEY = 'E4001',
    INVALID_CONFIG = 'E4002',

    // Workflow hataları (5xxx)
    WORKFLOW_ERROR = 'E5000',
    NODE_EXECUTION_FAILED = 'E5001',
    VARIABLE_NOT_FOUND = 'E5002',
    INVALID_NODE_TYPE = 'E5003',

    // Dosya hataları (6xxx)
    FILE_ERROR = 'E6000',
    FILE_NOT_FOUND = 'E6001',
    FILE_READ_ERROR = 'E6002',
    FILE_WRITE_ERROR = 'E6003',

    // Kimlik doğrulama (7xxx)
    AUTH_ERROR = 'E7000',
    AUTH_EXPIRED = 'E7001',
    AUTH_INVALID = 'E7002',
}

export const ERROR_MESSAGES: Record<ErrorCode, { tr: string; en: string }> = {
    [ErrorCode.UNKNOWN]: { tr: 'Bilinmeyen bir hata oluştu', en: 'An unknown error occurred' },
    [ErrorCode.INVALID_INPUT]: { tr: 'Geçersiz giriş', en: 'Invalid input' },
    [ErrorCode.TIMEOUT]: { tr: 'İşlem zaman aşımına uğradı', en: 'Operation timed out' },
    [ErrorCode.CANCELLED]: { tr: 'İşlem iptal edildi', en: 'Operation cancelled' },

    [ErrorCode.PERMISSION_DENIED]: { tr: 'İzin reddedildi', en: 'Permission denied' },
    [ErrorCode.LOCATION_PERMISSION]: { tr: 'Konum izni verilmedi', en: 'Location permission not granted' },
    [ErrorCode.MICROPHONE_PERMISSION]: { tr: 'Mikrofon izni verilmedi', en: 'Microphone permission not granted' },
    [ErrorCode.STORAGE_PERMISSION]: { tr: 'Depolama izni verilmedi', en: 'Storage permission not granted' },
    [ErrorCode.CONTACTS_PERMISSION]: { tr: 'Kişiler izni verilmedi', en: 'Contacts permission not granted' },
    [ErrorCode.CALENDAR_PERMISSION]: { tr: 'Takvim izni verilmedi', en: 'Calendar permission not granted' },
    [ErrorCode.NOTIFICATION_PERMISSION]: { tr: 'Bildirim izni verilmedi', en: 'Notification permission not granted' },

    [ErrorCode.NETWORK_ERROR]: { tr: 'Ağ hatası', en: 'Network error' },
    [ErrorCode.API_ERROR]: { tr: 'API hatası', en: 'API error' },
    [ErrorCode.SERVER_ERROR]: { tr: 'Sunucu hatası', en: 'Server error' },
    [ErrorCode.CONNECTION_TIMEOUT]: { tr: 'Bağlantı zaman aşımı', en: 'Connection timeout' },

    [ErrorCode.CONFIG_ERROR]: { tr: 'Yapılandırma hatası', en: 'Configuration error' },
    [ErrorCode.MISSING_API_KEY]: { tr: 'API anahtarı eksik', en: 'API key is missing' },
    [ErrorCode.INVALID_CONFIG]: { tr: 'Geçersiz yapılandırma', en: 'Invalid configuration' },

    [ErrorCode.WORKFLOW_ERROR]: { tr: 'Workflow hatası', en: 'Workflow error' },
    [ErrorCode.NODE_EXECUTION_FAILED]: { tr: 'Node çalıştırma başarısız', en: 'Node execution failed' },
    [ErrorCode.VARIABLE_NOT_FOUND]: { tr: 'Değişken bulunamadı', en: 'Variable not found' },
    [ErrorCode.INVALID_NODE_TYPE]: { tr: 'Geçersiz node tipi', en: 'Invalid node type' },

    [ErrorCode.FILE_ERROR]: { tr: 'Dosya hatası', en: 'File error' },
    [ErrorCode.FILE_NOT_FOUND]: { tr: 'Dosya bulunamadı', en: 'File not found' },
    [ErrorCode.FILE_READ_ERROR]: { tr: 'Dosya okunamadı', en: 'File read error' },
    [ErrorCode.FILE_WRITE_ERROR]: { tr: 'Dosya yazılamadı', en: 'File write error' },

    [ErrorCode.AUTH_ERROR]: { tr: 'Kimlik doğrulama hatası', en: 'Authentication error' },
    [ErrorCode.AUTH_EXPIRED]: { tr: 'Oturum süresi doldu', en: 'Session expired' },
    [ErrorCode.AUTH_INVALID]: { tr: 'Geçersiz kimlik', en: 'Invalid credentials' },
};
