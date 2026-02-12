/**
 * AppError Tests
 * Hata yönetimi sınıfı testleri
 */

import { AppError } from '../../src/utils/AppError';
import { ErrorCode } from '../../src/utils/ErrorCodes';

describe('AppError', () => {
    describe('Constructor', () => {
        test('should create error with code and default message', () => {
            const error = new AppError(ErrorCode.NETWORK_ERROR);

            expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
            expect(error.userMessage).toBe('Ağ hatası');
            expect(error.name).toBe('AppError');
        });

        test('should allow custom user message', () => {
            const error = new AppError(ErrorCode.API_ERROR, {
                userMessage: 'Custom message'
            });

            expect(error.userMessage).toBe('Custom message');
        });

        test('should store context', () => {
            const error = new AppError(ErrorCode.NODE_EXECUTION_FAILED, {
                context: { nodeId: 'node-1', nodeType: 'IF_ELSE' }
            });

            expect(error.context?.nodeId).toBe('node-1');
            expect(error.context?.nodeType).toBe('IF_ELSE');
        });
    });

    describe('fromUnknown', () => {
        test('should return same AppError if already AppError', () => {
            const original = new AppError(ErrorCode.TIMEOUT);
            const result = AppError.fromUnknown(original);

            expect(result).toBe(original);
        });

        test('should convert Error to AppError', () => {
            const error = new Error('Something went wrong');
            const result = AppError.fromUnknown(error);

            expect(result).toBeInstanceOf(AppError);
            expect(result.userMessage).toBe('Something went wrong');
        });

        test('should detect network errors', () => {
            const error = new Error('network request failed');
            const result = AppError.fromUnknown(error);

            expect(result.code).toBe(ErrorCode.NETWORK_ERROR);
        });

        test('should detect timeout errors', () => {
            const error = new Error('Timeout exceeded');
            const result = AppError.fromUnknown(error);

            expect(result.code).toBe(ErrorCode.TIMEOUT);
        });

        test('should handle string errors', () => {
            const result = AppError.fromUnknown('String error message');

            expect(result.userMessage).toBe('String error message');
        });
    });

    describe('Factory Methods', () => {
        test('permission should create correct error', () => {
            const error = AppError.permission('location');

            expect(error.code).toBe(ErrorCode.LOCATION_PERMISSION);
        });

        test('nodeExecution should include context', () => {
            const error = AppError.nodeExecution('node-1', 'DELAY', 'Failed');

            expect(error.code).toBe(ErrorCode.NODE_EXECUTION_FAILED);
            expect(error.context?.nodeId).toBe('node-1');
            expect(error.context?.nodeType).toBe('DELAY');
        });

        test('api should include status code in context', () => {
            const error = AppError.api('Not Found', 404);

            expect(error.code).toBe(ErrorCode.API_ERROR);
            expect(error.context?.statusCode).toBe(404);
        });
    });

    describe('toResult', () => {
        test('should return standardized error result', () => {
            const error = new AppError(ErrorCode.FILE_NOT_FOUND, {
                userMessage: 'File missing'
            });

            const result = error.toResult();

            expect(result.success).toBe(false);
            expect(result.error).toBe('File missing');
            expect(result.code).toBe(ErrorCode.FILE_NOT_FOUND);
        });
    });

    describe('toLogObject', () => {
        test('should return complete log structure', () => {
            const error = new AppError(ErrorCode.WORKFLOW_ERROR, {
                context: { workflowId: 'wf-123' }
            });

            const log = error.toLogObject();

            expect(log.name).toBe('AppError');
            expect(log.code).toBe(ErrorCode.WORKFLOW_ERROR);
            expect(log.context?.workflowId).toBe('wf-123');
            expect(log.timestamp).toBeDefined();
        });
    });
});
