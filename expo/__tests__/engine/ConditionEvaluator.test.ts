/**
 * ConditionEvaluator Tests
 * IF/ELSE koşul değerlendirme testleri
 */

import { ConditionEvaluator } from '../../src/engine/ConditionEvaluator';
import { VariableManager } from '../../src/services/VariableManager';

describe('ConditionEvaluator', () => {
    let variableManager: VariableManager;
    let evaluator: ConditionEvaluator;

    beforeEach(() => {
        variableManager = new VariableManager();
        evaluator = new ConditionEvaluator(variableManager);
    });

    describe('Basic Comparisons', () => {
        test('should evaluate == correctly', () => {
            variableManager.set('a', 5);
            variableManager.set('b', 5);

            const result = evaluator.evaluate({
                left: '{{a}}',
                operator: '==',
                right: '{{b}}'
            });

            expect(result).toBe(true);
        });

        test('should evaluate != correctly', () => {
            variableManager.set('a', 5);
            variableManager.set('b', 10);

            const result = evaluator.evaluate({
                left: '{{a}}',
                operator: '!=',
                right: '{{b}}'
            });

            expect(result).toBe(true);
        });

        test('should evaluate > correctly', () => {
            variableManager.set('num', 10);

            const result = evaluator.evaluate({
                left: '{{num}}',
                operator: '>',
                right: '5'
            });

            expect(result).toBe(true);
        });

        test('should evaluate < correctly', () => {
            variableManager.set('num', 3);

            const result = evaluator.evaluate({
                left: '{{num}}',
                operator: '<',
                right: '5'
            });

            expect(result).toBe(true);
        });
    });

    describe('String Comparisons', () => {
        test('should evaluate contains correctly', () => {
            variableManager.set('text', 'Hello World');

            const result = evaluator.evaluate({
                left: '{{text}}',
                operator: 'contains',
                right: 'World'
            });

            expect(result).toBe(true);
        });

        test('should evaluate startsWith correctly', () => {
            variableManager.set('text', 'Hello World');

            const result = evaluator.evaluate({
                left: '{{text}}',
                operator: 'startsWith',
                right: 'Hello'
            });

            expect(result).toBe(true);
        });

        test('should evaluate endsWith correctly', () => {
            variableManager.set('text', 'Hello World');

            const result = evaluator.evaluate({
                left: '{{text}}',
                operator: 'endsWith',
                right: 'World'
            });

            expect(result).toBe(true);
        });
    });

    describe('isEmpty', () => {
        test('should return true for empty string', () => {
            variableManager.set('empty', '');

            const result = evaluator.evaluate({
                left: '{{empty}}',
                operator: 'isEmpty',
                right: ''
            });

            expect(result).toBe(true);
        });

        test('should return true for empty array', () => {
            variableManager.set('arr', []);

            const result = evaluator.evaluate({
                left: '{{arr}}',
                operator: 'isEmpty',
                right: ''
            });

            expect(result).toBe(true);
        });

        test('should return false for non-empty string', () => {
            variableManager.set('text', 'hello');

            const result = evaluator.evaluate({
                left: '{{text}}',
                operator: 'isEmpty',
                right: ''
            });

            expect(result).toBe(false);
        });
    });

    describe('Multi-condition Logic', () => {
        test('should evaluate AND conditions', () => {
            variableManager.set('a', 5);
            variableManager.set('b', 10);

            const result = evaluator.evaluate({
                conditions: [
                    { left: '{{a}}', operator: '>', right: '0' },
                    { left: '{{b}}', operator: '>', right: '0' }
                ],
                logic: 'AND',
                left: '{{a}}',
                operator: '==',
                right: '{{a}}'
            });

            expect(result).toBe(true);
        });

        test('should evaluate OR conditions', () => {
            variableManager.set('a', -5);
            variableManager.set('b', 10);

            const result = evaluator.evaluate({
                conditions: [
                    { left: '{{a}}', operator: '>', right: '0' },
                    { left: '{{b}}', operator: '>', right: '0' }
                ],
                logic: 'OR',
                left: '{{a}}',
                operator: '==',
                right: '{{a}}'
            });

            expect(result).toBe(true);
        });

        test('should return false when all OR conditions fail', () => {
            variableManager.set('a', -5);
            variableManager.set('b', -10);

            const result = evaluator.evaluate({
                conditions: [
                    { left: '{{a}}', operator: '>', right: '0' },
                    { left: '{{b}}', operator: '>', right: '0' }
                ],
                logic: 'OR',
                left: '{{a}}',
                operator: '==',
                right: '{{a}}'
            });

            expect(result).toBe(false);
        });
    });

    describe('Boolean Normalization', () => {
        test('should compare boolean true with string "true"', () => {
            variableManager.set('flag', true);

            const result = evaluator.evaluate({
                left: '{{flag}}',
                operator: '==',
                right: 'true'
            });

            expect(result).toBe(true);
        });

        test('should compare boolean false with string "false"', () => {
            variableManager.set('flag', false);

            const result = evaluator.evaluate({
                left: '{{flag}}',
                operator: '==',
                right: 'false'
            });

            expect(result).toBe(true);
        });
    });
});
