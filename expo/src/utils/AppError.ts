/**
 * AppError - Özel uygulama hata sınıfı
 * Tutarlı hata yönetimi ve kullanıcı dostu mesajlar
 */

import { ErrorCode, ERROR_MESSAGES } from './ErrorCodes';

export interface AppErrorContext {
    nodeId?: string;
    nodeType?: string;
    workflowId?: string;
    [key: string]: any;
}

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly userMessage: string;
    public readonly technicalMessage: string;
    public readonly context?: AppErrorContext;
    public readonly timestamp: number;
    public readonly originalError?: Error;

    constructor(
        code: ErrorCode,
        options?: {
            userMessage?: string;
            technicalMessage?: string;
            context?: AppErrorContext;
            originalError?: Error;
        }
    ) {
        const defaultMessage = ERROR_MESSAGES[code]?.tr || 'Bir hata oluştu';
        const userMessage = options?.userMessage || defaultMessage;

        super(userMessage);

        this.name = 'AppError';
        this.code = code;
        this.userMessage = userMessage;
        this.technicalMessage = options?.technicalMessage || userMessage;
        this.context = options?.context;
        this.timestamp = Date.now();
        this.originalError = options?.originalError;

        // Prototype chain fix for extending Error
        Object.setPrototypeOf(this, AppError.prototype);
    }

    /**
     * Bilinmeyen hatadan AppError oluştur
     */
    static fromUnknown(error: unknown, context?: string): AppError {
        if (error instanceof AppError) {
            return error;
        }

        if (error instanceof Error) {
            // Ağ hatası kontrolü
            if (error.message.includes('network') || error.message.includes('fetch')) {
                return new AppError(ErrorCode.NETWORK_ERROR, {
                    technicalMessage: error.message,
                    originalError: error,
                    context: context ? { operation: context } : undefined
                });
            }

            // Timeout kontrolü
            if (error.message.includes('timeout') || error.message.includes('Timeout')) {
                return new AppError(ErrorCode.TIMEOUT, {
                    technicalMessage: error.message,
                    originalError: error,
                    context: context ? { operation: context } : undefined
                });
            }

            // Genel hata
            return new AppError(ErrorCode.UNKNOWN, {
                userMessage: error.message,
                technicalMessage: error.stack || error.message,
                originalError: error,
                context: context ? { operation: context } : undefined
            });
        }

        // String hata
        if (typeof error === 'string') {
            return new AppError(ErrorCode.UNKNOWN, {
                userMessage: error,
                technicalMessage: error,
                context: context ? { operation: context } : undefined
            });
        }

        // Bilinmeyen tip
        return new AppError(ErrorCode.UNKNOWN, {
            technicalMessage: String(error),
            context: context ? { operation: context } : undefined
        });
    }

    /**
     * İzin hatası oluştur
     */
    static permission(type: 'location' | 'microphone' | 'storage' | 'contacts' | 'calendar' | 'notification'): AppError {
        const codeMap: Record<string, ErrorCode> = {
            location: ErrorCode.LOCATION_PERMISSION,
            microphone: ErrorCode.MICROPHONE_PERMISSION,
            storage: ErrorCode.STORAGE_PERMISSION,
            contacts: ErrorCode.CONTACTS_PERMISSION,
            calendar: ErrorCode.CALENDAR_PERMISSION,
            notification: ErrorCode.NOTIFICATION_PERMISSION,
        };
        return new AppError(codeMap[type] || ErrorCode.PERMISSION_DENIED);
    }

    /**
     * Node execution hatası oluştur
     */
    static nodeExecution(nodeId: string, nodeType: string, message: string): AppError {
        return new AppError(ErrorCode.NODE_EXECUTION_FAILED, {
            userMessage: message,
            context: { nodeId, nodeType }
        });
    }

    /**
     * API hatası oluştur
     */
    static api(message: string, statusCode?: number): AppError {
        return new AppError(ErrorCode.API_ERROR, {
            userMessage: message,
            context: { statusCode }
        });
    }

    /**
     * Loglanabilir format
     */
    toLogObject(): Record<string, any> {
        return {
            name: this.name,
            code: this.code,
            message: this.userMessage,
            technical: this.technicalMessage,
            context: this.context,
            timestamp: new Date(this.timestamp).toISOString(),
            stack: this.stack
        };
    }

    /**
     * Kullanıcı dostu hata sonucu
     */
    toResult(): { success: false; error: string; code: string } {
        return {
            success: false,
            error: this.userMessage,
            code: this.code
        };
    }
}
