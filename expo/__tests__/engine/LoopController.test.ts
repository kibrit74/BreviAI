/**
 * LoopController Tests
 * Döngü yönetimi testleri
 */

import { LoopController } from '../../src/engine/LoopController';
import { ConditionEvaluator } from '../../src/engine/ConditionEvaluator';
import { VariableManager } from '../../src/services/VariableManager';
import { LoopConfig } from '../../src/types/workflow-types';

describe('LoopController', () => {
    let loopController: LoopController;
    let variableManager: VariableManager;
    let conditionEvaluator: ConditionEvaluator;

    beforeEach(() => {
        loopController = new LoopController();
        variableManager = new VariableManager();
        conditionEvaluator = new ConditionEvaluator(variableManager);
    });

    describe('Count Loop', () => {
        test('should initialize count loop correctly', () => {
            const config: LoopConfig = { type: 'count', count: 5 };
            loopController.initLoop('loop-1', config, variableManager);

            expect(loopController.shouldContinue('loop-1', config, conditionEvaluator)).toBe(true);
        });

        test('should iterate correct number of times', () => {
            const config: LoopConfig = { type: 'count', count: 3 };
            loopController.initLoop('loop-1', config, variableManager);

            const iterations: number[] = [];
            while (loopController.shouldContinue('loop-1', config, conditionEvaluator)) {
                const { iteration } = loopController.nextIteration('loop-1');
                iterations.push(iteration);
            }

            expect(iterations).toEqual([0, 1, 2]);
        });

        test('should stop after reaching count', () => {
            const config: LoopConfig = { type: 'count', count: 2 };
            loopController.initLoop('loop-1', config, variableManager);

            loopController.nextIteration('loop-1');
            loopController.nextIteration('loop-1');

            expect(loopController.shouldContinue('loop-1', config, conditionEvaluator)).toBe(false);
        });
    });

    describe('ForEach Loop', () => {
        test('should initialize forEach loop with array', () => {
            variableManager.set('items', ['a', 'b', 'c']);
            const config: LoopConfig = { type: 'forEach', items: '{{items}}' };
            loopController.initLoop('loop-1', config, variableManager);

            expect(loopController.shouldContinue('loop-1', config, conditionEvaluator)).toBe(true);
        });

        test('should provide current item in each iteration', () => {
            variableManager.set('items', ['apple', 'banana', 'cherry']);
            const config: LoopConfig = { type: 'forEach', items: '{{items}}' };
            loopController.initLoop('loop-1', config, variableManager);

            const items: any[] = [];
            while (loopController.shouldContinue('loop-1', config, conditionEvaluator)) {
                const { currentItem } = loopController.nextIteration('loop-1');
                items.push(currentItem);
            }

            expect(items).toEqual(['apple', 'banana', 'cherry']);
        });

        test('should handle empty array', () => {
            variableManager.set('empty', []);
            const config: LoopConfig = { type: 'forEach', items: '{{empty}}' };
            loopController.initLoop('loop-1', config, variableManager);

            expect(loopController.shouldContinue('loop-1', config, conditionEvaluator)).toBe(false);
        });
    });

    describe('Cleanup', () => {
        test('should cleanup loop state', () => {
            const config: LoopConfig = { type: 'count', count: 5 };
            loopController.initLoop('loop-1', config, variableManager);
            loopController.cleanupLoop('loop-1');

            expect(loopController.shouldContinue('loop-1', config, conditionEvaluator)).toBe(false);
        });

        test('should reset all loops', () => {
            const config: LoopConfig = { type: 'count', count: 5 };
            loopController.initLoop('loop-1', config, variableManager);
            loopController.initLoop('loop-2', config, variableManager);
            loopController.reset();

            expect(loopController.shouldContinue('loop-1', config, conditionEvaluator)).toBe(false);
            expect(loopController.shouldContinue('loop-2', config, conditionEvaluator)).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        test('should return default for non-existent loop', () => {
            const config: LoopConfig = { type: 'count', count: 5 };
            expect(loopController.shouldContinue('non-existent', config, conditionEvaluator)).toBe(false);
        });

        test('nextIteration on non-existent loop returns 0', () => {
            const { iteration } = loopController.nextIteration('non-existent');
            expect(iteration).toBe(0);
        });
    });
});
