/**
 * BatchController - Batch işleme yönetimi
 * SPLIT_BATCHES node'ları için veri parçalama
 */

import { SplitBatchesConfig } from '../types/workflow-types';
import { VariableManager } from '../services/VariableManager';

interface BatchState {
    currentIndex: number;
    sourceArray: any[];
    batchSize: number;
}

export interface BatchResult {
    items: any[];
    remaining: number;
    total: number;
}

export class BatchController {
    private batchStates: Map<string, BatchState> = new Map();

    initBatch(nodeId: string, config: SplitBatchesConfig, variableManager: VariableManager): boolean {
        const sourceData = variableManager.resolveValue(config.sourceArray);

        let sourceArray: any[] = [];
        if (Array.isArray(sourceData)) {
            sourceArray = sourceData;
        } else if (sourceData) {
            // If single item, treat as array of 1
            sourceArray = [sourceData];
        }

        if (sourceArray.length === 0) {
            return false;
        }

        this.batchStates.set(nodeId, {
            currentIndex: 0,
            sourceArray,
            batchSize: config.batchSize || 1
        });

        return true;
    }

    nextBatch(nodeId: string): BatchResult | null {
        const state = this.batchStates.get(nodeId);
        if (!state) return null;

        if (state.currentIndex >= state.sourceArray.length) {
            this.batchStates.delete(nodeId); // Cleanup
            return null; // Done
        }

        const endIndex = Math.min(state.currentIndex + state.batchSize, state.sourceArray.length);
        const batchItems = state.sourceArray.slice(state.currentIndex, endIndex);

        // Update index for NEXT call
        state.currentIndex = endIndex;
        const remaining = state.sourceArray.length - state.currentIndex;

        return {
            items: batchItems,
            remaining,
            total: state.sourceArray.length
        };
    }

    reset(): void {
        this.batchStates.clear();
    }
}
