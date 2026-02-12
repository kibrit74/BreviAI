/**
 * ExecutionLogger - Stores workflow execution history
 * Persists execution results to AsyncStorage for later review
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkflowExecutionResult, NodeExecutionResult } from '../types/workflow-types';

const STORAGE_KEY = 'execution_history';
const MAX_HISTORY_ITEMS = 50; // Keep last 50 executions

export interface ExecutionLogEntry {
    id: string;
    workflowId: string;
    workflowName: string;
    workflowEmoji: string;
    timestamp: number;
    success: boolean;
    totalDuration: number;
    nodeCount: number;
    failedNodeLabel?: string;
    error?: string;
    nodeResults: {
        nodeId: string;
        nodeLabel: string;
        success: boolean;
        duration: number;
        error?: string;
    }[];
}

class ExecutionLoggerClass {
    private initialized = false;
    private history: ExecutionLogEntry[] = [];

    async init(): Promise<void> {
        if (this.initialized) return;

        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                this.history = JSON.parse(data);
            }
            this.initialized = true;
        } catch (error) {
            console.error('[ExecutionLogger] Init error:', error);
            this.history = [];
            this.initialized = true;
        }
    }

    async logExecution(
        workflowId: string,
        workflowName: string,
        workflowEmoji: string,
        result: WorkflowExecutionResult,
        nodeLabels: Map<string, string>
    ): Promise<void> {
        await this.init();

        const entry: ExecutionLogEntry = {
            id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            workflowId,
            workflowName,
            workflowEmoji,
            timestamp: Date.now(),
            success: result.success,
            totalDuration: result.totalDuration,
            nodeCount: result.nodeResults.length,
            error: result.error,
            nodeResults: result.nodeResults.map(nr => ({
                nodeId: nr.nodeId,
                nodeLabel: nodeLabels.get(nr.nodeId) || 'Bilinmeyen Node',
                success: nr.success,
                duration: nr.duration,
                error: nr.error
            }))
        };

        // Find failed node label
        const failedNode = result.nodeResults.find(nr => !nr.success);
        if (failedNode) {
            entry.failedNodeLabel = nodeLabels.get(failedNode.nodeId) || 'Bilinmeyen';
        }

        // Add to beginning of array
        this.history.unshift(entry);

        // Trim to max size
        if (this.history.length > MAX_HISTORY_ITEMS) {
            this.history = this.history.slice(0, MAX_HISTORY_ITEMS);
        }

        // Persist
        await this.save();
    }

    async getHistory(): Promise<ExecutionLogEntry[]> {
        await this.init();
        return [...this.history];
    }

    async getHistoryByWorkflow(workflowId: string): Promise<ExecutionLogEntry[]> {
        await this.init();
        return this.history.filter(e => e.workflowId === workflowId);
    }

    async clearHistory(): Promise<void> {
        this.history = [];
        await this.save();
    }

    async deleteEntry(id: string): Promise<void> {
        this.history = this.history.filter(e => e.id !== id);
        await this.save();
    }

    private async save(): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
        } catch (error) {
            console.error('[ExecutionLogger] Save error:', error);
        }
    }
}

export const ExecutionLogger = new ExecutionLoggerClass();
