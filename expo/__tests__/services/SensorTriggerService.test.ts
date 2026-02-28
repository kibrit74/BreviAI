import type { Workflow } from '../../src/types/workflow-types';

const mockGetAll = jest.fn();
const mockExecute = jest.fn();

let stepListener: ((result: { steps: number }) => void) | null = null;
const mockPedometerIsAvailable = jest.fn();
const mockPedometerGetStepCountAsync = jest.fn();
const mockPedometerWatchStepCount = jest.fn((listener: (result: { steps: number }) => void) => {
    stepListener = listener;
    return { remove: jest.fn() };
});

const mockMotion = {
    clearAllTriggers: jest.fn(),
    unregisterTrigger: jest.fn(),
    startService: jest.fn(),
    stopService: jest.fn(),
    registerTrigger: jest.fn(),
};

jest.mock('../../src/services/WorkflowStorage', () => ({
    WorkflowStorage: {
        getAll: (...args: any[]) => mockGetAll(...args),
    },
}));

jest.mock('../../src/services/WorkflowEngine', () => ({
    workflowEngine: {
        execute: (...args: any[]) => mockExecute(...args),
    },
}));

jest.mock('expo-sensors', () => ({
    Pedometer: {
        isAvailableAsync: (...args: any[]) => mockPedometerIsAvailable(...args),
        getStepCountAsync: (...args: any[]) => mockPedometerGetStepCountAsync(...args),
        watchStepCount: (listener: (result: { steps: number }) => void) => mockPedometerWatchStepCount(listener),
    },
}));

jest.mock('react-native', () => ({
    NativeModules: {
        MotionTrigger: {
            clearAllTriggers: (...args: any[]) => mockMotion.clearAllTriggers(...args),
            unregisterTrigger: (...args: any[]) => mockMotion.unregisterTrigger(...args),
            startService: (...args: any[]) => mockMotion.startService(...args),
            stopService: (...args: any[]) => mockMotion.stopService(...args),
            registerTrigger: (...args: any[]) => mockMotion.registerTrigger(...args),
        },
    },
}));

const flushPromises = async () => {
    await new Promise(resolve => setImmediate(resolve));
};

const buildWorkflow = (partial: Partial<Workflow>): Workflow =>
    ({
        id: partial.id || 'wf_test',
        name: partial.name || 'Test',
        description: partial.description || '',
        icon: partial.icon || 'test',
        color: partial.color || '#000000',
        nodes: partial.nodes || [],
        edges: partial.edges || [],
        isActive: partial.isActive ?? true,
        createdAt: partial.createdAt || new Date().toISOString(),
        updatedAt: partial.updatedAt || new Date().toISOString(),
        runCount: partial.runCount || 0,
        lastRun: partial.lastRun,
    } as Workflow);

describe('SensorTriggerService', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        stepListener = null;

        mockPedometerIsAvailable.mockResolvedValue(true);
        mockPedometerGetStepCountAsync.mockResolvedValue({ steps: 0 });
        mockExecute.mockResolvedValue({ success: true });

        mockMotion.clearAllTriggers.mockResolvedValue(true);
        mockMotion.unregisterTrigger.mockResolvedValue(true);
        mockMotion.startService.mockResolvedValue(true);
        mockMotion.stopService.mockResolvedValue(true);
        mockMotion.registerTrigger.mockResolvedValue(true);

        const AsyncStorage = require('@react-native-async-storage/async-storage');
        const storage = AsyncStorage.default || AsyncStorage;
        storage.getItem.mockResolvedValue(null);
        storage.setItem.mockResolvedValue(undefined);
    });

    test('coalesces concurrent refresh calls and keeps single step watcher', async () => {
        mockGetAll.mockResolvedValue([
            buildWorkflow({
                id: 'wf_step',
                nodes: [
                    {
                        id: 'n1',
                        type: 'STEP_TRIGGER',
                        label: '10K',
                        config: { targetSteps: 10000, comparison: 'gte', resetDaily: true },
                        position: { x: 0, y: 0 },
                    } as any,
                ],
            }),
        ]);

        const { sensorTriggerService } = require('../../src/services/SensorTriggerService');

        await Promise.all([
            sensorTriggerService.refreshTriggers(),
            sensorTriggerService.refreshTriggers(),
            sensorTriggerService.refreshTriggers(),
        ]);
        await flushPromises();
        await flushPromises();

        expect(mockPedometerWatchStepCount).toHaveBeenCalledTimes(1);
    });

    test('triggers step workflow from legacy stepGoal config and sets custom variable', async () => {
        mockPedometerGetStepCountAsync.mockResolvedValue({ steps: 5 });
        mockGetAll.mockResolvedValue([
            buildWorkflow({
                id: 'wf_step_legacy',
                name: 'Legacy Step Goal',
                nodes: [
                    {
                        id: 'n1',
                        type: 'STEP_TRIGGER',
                        label: 'Legacy',
                        config: { stepGoal: 12, variableName: 'adimlar' },
                        position: { x: 0, y: 0 },
                    } as any,
                ],
            }),
        ]);

        const { sensorTriggerService } = require('../../src/services/SensorTriggerService');
        await sensorTriggerService.refreshTriggers();
        await flushPromises();
        await flushPromises();

        expect(stepListener).toBeTruthy();

        stepListener!({ steps: 7 }); // 5 + 7 = 12
        await flushPromises();

        expect(mockExecute).toHaveBeenCalledTimes(1);
        const [_workflow, vars] = mockExecute.mock.calls[0];
        expect(vars._triggerType).toBe('step');
        expect(vars._targetSteps).toBe(12);
        expect(vars._currentSteps).toBe(12);
        expect(vars.adimlar).toBe(12);
    });

    test('does not trigger same step workflow repeatedly once reached', async () => {
        mockGetAll.mockResolvedValue([
            buildWorkflow({
                id: 'wf_step_once',
                nodes: [
                    {
                        id: 'n1',
                        type: 'STEP_TRIGGER',
                        label: 'Step Once',
                        config: { targetSteps: 3, comparison: 'gte', resetDaily: true },
                        position: { x: 0, y: 0 },
                    } as any,
                ],
            }),
        ]);

        const { sensorTriggerService } = require('../../src/services/SensorTriggerService');
        await sensorTriggerService.refreshTriggers();
        await flushPromises();
        await flushPromises();

        stepListener!({ steps: 3 });
        await flushPromises();
        stepListener!({ steps: 9 });
        await flushPromises();

        expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    test('maps tap gesture to native multi-tap and syncs native registry', async () => {
        mockGetAll.mockResolvedValue([
            buildWorkflow({
                id: 'wf_gesture_tap',
                nodes: [
                    {
                        id: 'n1',
                        type: 'GESTURE_TRIGGER',
                        label: 'Tap Trigger',
                        config: { gesture: 'tap', tapCount: 3, sensitivity: 'high' },
                        position: { x: 0, y: 0 },
                    } as any,
                ],
            }),
        ]);

        const { sensorTriggerService } = require('../../src/services/SensorTriggerService');
        await sensorTriggerService.refreshTriggers();
        await flushPromises();

        expect(mockMotion.clearAllTriggers).toHaveBeenCalledTimes(1);
        expect(mockMotion.startService).toHaveBeenCalledTimes(1);
        expect(mockMotion.registerTrigger).toHaveBeenCalledWith('wf_gesture_tap', 'triple_tap', 'high');
    });
});
