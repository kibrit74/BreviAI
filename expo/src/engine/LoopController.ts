/**
 * LoopController - Döngü yönetimi
 * LOOP node'ları için iterasyon kontrolü
 */

import { LoopConfig } from '../types/workflow-types';
import { VariableManager } from '../services/VariableManager';
import { ConditionEvaluator } from './ConditionEvaluator';

interface LoopState {
    iteration: number;
    maxIterations: number;
    items?: any[];
}

export class LoopController {
    private loopStates: Map<string, LoopState> = new Map();

    initLoop(nodeId: string, config: LoopConfig, variableManager: VariableManager): void {
        let maxIterations = 1;
        let items: any[] | undefined;

        if (config.type === 'count' && config.count) {
            maxIterations = config.count;
        } else if (config.type === 'forEach' && config.items) {
            items = variableManager.resolveValue(config.items);
            maxIterations = Array.isArray(items) ? items.length : 0;
        } else if (config.type === 'while') {
            maxIterations = 1000; // Safety limit
        }

        this.loopStates.set(nodeId, { iteration: 0, maxIterations, items });
    }

    shouldContinue(nodeId: string, config: LoopConfig, conditionEvaluator: ConditionEvaluator): boolean {
        const state = this.loopStates.get(nodeId);
        if (!state) return false;

        if (state.iteration >= state.maxIterations) {
            return false;
        }

        if (config.type === 'while' && config.condition) {
            return conditionEvaluator.evaluate(config.condition);
        }

        return true;
    }

    nextIteration(nodeId: string): { iteration: number; currentItem?: any } {
        const state = this.loopStates.get(nodeId);
        if (!state) return { iteration: 0 };

        const iteration = state.iteration;
        const currentItem = state.items ? state.items[iteration] : undefined;
        state.iteration++;

        return { iteration, currentItem };
    }

    cleanupLoop(nodeId: string): void {
        this.loopStates.delete(nodeId);
    }

    reset(): void {
        this.loopStates.clear();
    }
}
