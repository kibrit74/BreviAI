/**
 * Node Executor Base Pattern
 * Tutarlı node çalıştırma arayüzü
 */

import { VariableManager } from '../VariableManager';
import { AppError, ErrorCode } from '../../utils';

/**
 * Node çalıştırma sonucu
 */
export interface NodeResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    code?: ErrorCode;
}

/**
 * Node çalıştırma bağlamı
 */
export interface ExecutionContext {
    variableManager: VariableManager;
    workflowId?: string;
    nodeId: string;
    abortSignal?: AbortSignal;
}

/**
 * Validasyon sonucu
 */
export interface ValidationResult {
    valid: boolean;
    errors?: string[];
}

/**
 * Node executor arayüzü
 */
export interface INodeExecutor<TConfig, TResult = any> {
    /**
     * Node'u çalıştır
     */
    execute(config: TConfig, ctx: ExecutionContext): Promise<NodeResult<TResult>>;

    /**
     * Yapılandırmayı doğrula (opsiyonel)
     */
    validate?(config: TConfig): ValidationResult;
}

/**
 * Abstract base class - ortak işlevsellik
 */
export abstract class BaseNodeExecutor<TConfig, TResult = any>
    implements INodeExecutor<TConfig, TResult> {

    protected readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Node'u çalıştır - alt sınıflar implement etmeli
     */
    abstract execute(config: TConfig, ctx: ExecutionContext): Promise<NodeResult<TResult>>;

    /**
     * Varsayılan validasyon - alt sınıflar override edebilir
     */
    validate(config: TConfig): ValidationResult {
        return { valid: true };
    }

    /**
     * Başarılı sonuç oluştur
     */
    protected success<T>(data: T): NodeResult<T> {
        return { success: true, data };
    }

    /**
     * Hata sonucu oluştur
     */
    protected failure(error: string, code?: ErrorCode): NodeResult<TResult> {
        return {
            success: false,
            error,
            code: code || ErrorCode.UNKNOWN
        };
    }

    /**
     * Exception'dan hata sonucu oluştur
     */
    protected fromError(error: unknown, context?: string): NodeResult<TResult> {
        const appError = AppError.fromUnknown(error, context || this.name);
        return {
            success: false,
            error: appError.userMessage,
            code: appError.code
        };
    }

    /**
     * İzin kontrolü yardımcısı
     */
    protected async checkPermission(
        permissionFn: () => Promise<{ status: string }>,
        permissionType: 'location' | 'microphone' | 'storage' | 'contacts' | 'calendar'
    ): Promise<{ granted: boolean; error?: string; code?: ErrorCode }> {
        try {
            const { status } = await permissionFn();
            if (status !== 'granted') {
                const error = AppError.permission(permissionType);
                return { granted: false, error: error.userMessage, code: error.code };
            }
            return { granted: true };
        } catch (error) {
            const appError = AppError.fromUnknown(error, `${permissionType}_permission`);
            return { granted: false, error: appError.userMessage, code: appError.code };
        }
    }

    /**
     * Değişken çözümle
     */
    protected resolve(ctx: ExecutionContext, value: string): any {
        return ctx.variableManager.resolveValue(value);
    }

    /**
     * Değişken ata
     */
    protected setVariable(ctx: ExecutionContext, name: string, value: any): void {
        ctx.variableManager.set(name, value);
    }
}
