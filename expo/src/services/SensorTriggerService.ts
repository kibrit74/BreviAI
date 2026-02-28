import { Pedometer } from 'expo-sensors';
import { workflowEngine } from './WorkflowEngine';
import { WorkflowStorage } from './WorkflowStorage';
import { Workflow, GestureTriggerConfig, StepTriggerConfig } from '../types/workflow-types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STEP_STORAGE_KEY = '@step_trigger_state';

class SensorTriggerService {
    private accelerometerSubscription: any = null;
    private pedometerSubscription: any = null;
    private activeGestureWorkflows: Workflow[] = [];
    private activeStepWorkflows: Workflow[] = [];
    private lastGestureTime: number = 0;
    private readonly GESTURE_COOLDOWN = 2000; // 2 seconds between triggers

    // Step tracking state
    private stepStartDate: Date = new Date();
    private stepStartCount: number = 0;
    private stepWatchSteps: number = 0;
    private stepWatchOffset: number = 0;
    private lastStepResetDate: string = new Date().toDateString();
    private triggeredToday: Set<string> = new Set(); // Track which workflows already triggered

    // Configurable thresholds
    private readonly SHAKE_THRESHOLD = 1.8; // G-force
    private readonly FACE_DOWN_THRESHOLD = -0.9; // Z-axis G-force (approx -1G)

    constructor() {
        this.loadStepState();
    }

    async refreshTriggers() {
        const workflows = await WorkflowStorage.getAll();

        // Gesture workflows
        this.activeGestureWorkflows = workflows.filter(w =>
            w.isActive && w.nodes.some(n => n.type === 'GESTURE_TRIGGER')
        );

        // Step workflows
        this.activeStepWorkflows = workflows.filter(w =>
            w.isActive && w.nodes.some(n => n.type === 'STEP_TRIGGER')
        );

        // Register gestures with Native Service (MotionTriggerModule)
        if (this.activeGestureWorkflows.length > 0) {
            await this.registerNativeGestures(workflows);
        } else {
            // Stop native service if no gestures
            const { MotionTrigger } = require('react-native').NativeModules;
            try {
                if (MotionTrigger?.clearAllTriggers) {
                    await MotionTrigger.clearAllTriggers();
                } else {
                    for (const workflow of workflows) {
                        await MotionTrigger?.unregisterTrigger?.(workflow.id);
                    }
                }
                await MotionTrigger?.stopService?.();
            } catch (e) {
                console.warn('[SensorTriggerService] Failed to clear native gestures:', e);
            }
        }

        // Step listener (keep as is for now, or move to native later)
        if (this.activeStepWorkflows.length > 0) {
            this.startStepListening();
        } else {
            this.stopStepListening();
        }
    }

    private async registerNativeGestures(allWorkflows: Workflow[]) {
        const { MotionTrigger } = require('react-native').NativeModules;
        if (!MotionTrigger) {
            console.warn('[SensorTriggerService] MotionTrigger native module not found');
            return;
        }

        // Hard sync: clear stale registrations first so deleted/inactive workflows won't keep firing.
        try {
            if (MotionTrigger.clearAllTriggers) {
                await MotionTrigger.clearAllTriggers();
            } else {
                for (const workflow of allWorkflows) {
                    await MotionTrigger.unregisterTrigger?.(workflow.id);
                }
            }
        } catch (e) {
            console.warn('[SensorTriggerService] Failed to clear native gesture registry, continuing:', e);
        }

        // Start the service first
        await MotionTrigger.startService();

        // Register each workflow
        for (const workflow of this.activeGestureWorkflows) {
            const triggerNode = workflow.nodes.find(n => n.type === 'GESTURE_TRIGGER');
            if (triggerNode) {
                const config = triggerNode.config as GestureTriggerConfig;
                const rawGesture = (config as any)?.gesture || (config as any)?.gestureType || 'shake';
                const gesture = this.normalizeGestureForNative(rawGesture, (config as any)?.tapCount);
                // Native registerTrigger(workflowId, gesture, sensitivity)
                if (gesture) {
                    await MotionTrigger.registerTrigger(workflow.id, gesture, config.sensitivity || 'medium');
                } else {
                    console.warn(`[SensorTriggerService] Unsupported native gesture: ${rawGesture}`);
                }
            }
        }
        console.log(`[SensorTriggerService] Registered ${this.activeGestureWorkflows.length} workflows with Native Motion Service`);
    }

    private normalizeGestureForNative(gesture?: string, tapCount?: number): string | null {
        if (!gesture) return 'shake';
        if (gesture === 'chop') return 'shake'; // legacy alias fallback
        if (gesture === 'tap') return this.tapCountToNativeGesture(tapCount);

        const supported = new Set([
            'shake',
            'flip',
            'face_down',
            'face_up',
            'double_tap',
            'triple_tap',
            'quadruple_tap',
            'quintuple_tap',
            'sextuple_tap',
        ]);

        return supported.has(gesture) ? gesture : null;
    }

    private tapCountToNativeGesture(tapCount?: number): string {
        const count = Math.max(2, Math.min(6, Number(tapCount) || 4));
        switch (count) {
            case 2: return 'double_tap';
            case 3: return 'triple_tap';
            case 4: return 'quadruple_tap';
            case 5: return 'quintuple_tap';
            case 6: return 'sextuple_tap';
            default: return 'quadruple_tap';
        }
    }

    // JS-side gesture monitoring REMOVED to prevent conflict and spam
    // The Native MotionTriggerService now handles this background & foreground.
    private startGestureListening() { /* Deprecated */ }
    private stopGestureListening() { /* Deprecated */ }
    private detectGestures(data: any) { /* Deprecated */ }
    public triggerGestureWorkflows(gesture: string) { /* Handled by native now */ }

    // ========================
    // STEP MONITORING
    // ========================
    private async startStepListening() {
        if (this.pedometerSubscription) return;

        const isAvailable = await Pedometer.isAvailableAsync();
        if (!isAvailable) {
            console.warn('[SensorTriggerService] Pedometer not available on this device');
            return;
        }

        // Check if we need to reset for new day
        await this.checkDailyReset();
        this.stepWatchSteps = 0;
        this.stepWatchOffset = 0;

        // Get initial step count for today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        try {
            const result = await Pedometer.getStepCountAsync(todayStart, new Date());
            this.stepStartCount = result.steps;
            console.log(`[SensorTriggerService] Initial step count today: ${this.stepStartCount}`);
        } catch (e) {
            console.warn('[SensorTriggerService] Failed to get initial step count:', e);
        }

        // Watch for step updates (real-time)
        this.pedometerSubscription = Pedometer.watchStepCount(result => {
            // result.steps is cumulative since watchStepCount() subscription start
            this.stepWatchSteps = Math.max(0, Number(result.steps) || 0);
            const todayWatchSteps = Math.max(0, this.stepWatchSteps - this.stepWatchOffset);
            const totalSteps = Math.max(0, this.stepStartCount + todayWatchSteps);
            void this.checkStepTriggers(totalSteps);
        });

        console.log('[SensorTriggerService] Step listening started');
    }

    private stopStepListening() {
        if (this.pedometerSubscription) {
            this.pedometerSubscription.remove();
            this.pedometerSubscription = null;
            console.log('[SensorTriggerService] Step listening stopped');
        }
    }

    private normalizeStepConfig(rawConfig: any): StepTriggerConfig {
        const target = Number(rawConfig?.targetSteps ?? rawConfig?.stepGoal ?? 10000);
        return {
            targetSteps: Number.isFinite(target) && target > 0 ? Math.round(target) : 10000,
            comparison: rawConfig?.comparison === 'eq' ? 'eq' : 'gte',
            resetDaily: rawConfig?.resetDaily !== false,
            variableName: rawConfig?.variableName || 'currentSteps',
        };
    }

    private async maybeHandleDailyReset(): Promise<void> {
        const today = new Date().toDateString();
        if (today === this.lastStepResetDate) return;

        const keepTriggered = new Set<string>();
        for (const workflowId of this.triggeredToday) {
            const workflow = this.activeStepWorkflows.find(w => w.id === workflowId);
            if (!workflow) continue;
            const triggerNode = workflow.nodes.find(n => n.type === 'STEP_TRIGGER');
            if (!triggerNode) continue;
            const config = this.normalizeStepConfig(triggerNode.config);
            if (config.resetDaily === false) {
                keepTriggered.add(workflowId);
            }
        }

        this.triggeredToday = keepTriggered;
        this.stepStartDate = new Date();
        this.lastStepResetDate = today;
        // Keep listener alive; just move day boundary to current watch sample.
        this.stepStartCount = 0;
        this.stepWatchOffset = this.stepWatchSteps;
        await this.saveStepState();
        console.log('[SensorTriggerService] New day detected, step trigger state reset');
    }

    private async checkStepTriggers(currentSteps: number) {
        await this.maybeHandleDailyReset();

        for (const workflow of this.activeStepWorkflows) {
            const triggerNode = workflow.nodes.find(n => n.type === 'STEP_TRIGGER');
            if (!triggerNode) continue;

            const config = this.normalizeStepConfig(triggerNode.config);
            const alreadyTriggered = this.triggeredToday.has(workflow.id);
            if (alreadyTriggered) continue;

            let shouldTrigger = false;

            if (config.comparison === 'gte' && currentSteps >= config.targetSteps) {
                shouldTrigger = true;
            } else if (config.comparison === 'eq' && currentSteps === config.targetSteps) {
                shouldTrigger = true;
            }

            if (shouldTrigger) {
                console.log(`[SensorTriggerService] Step target reached! ${currentSteps} steps. Triggering: ${workflow.name}`);
                this.triggeredToday.add(workflow.id);
                await this.saveStepState();

                workflowEngine.execute(workflow, {
                    _triggerType: 'step',
                    _currentSteps: currentSteps,
                    _targetSteps: config.targetSteps,
                    _triggerTime: new Date().toISOString(),
                    [config.variableName || 'currentSteps']: currentSteps,
                }).catch(err => console.error("Step workflow trigger failed", err));
            }
        }
    }

    private async checkDailyReset() {
        const today = new Date().toDateString();
        const state = await this.loadStepState();
        this.lastStepResetDate = state.lastResetDate || today;

        if ((state.lastResetDate || '') !== today) {
            // Startup reset: preserve non-daily goals only
            const keepTriggered = new Set<string>();
            for (const workflowId of state.triggeredWorkflows || []) {
                const workflow = this.activeStepWorkflows.find(w => w.id === workflowId);
                if (!workflow) continue;
                const triggerNode = workflow.nodes.find(n => n.type === 'STEP_TRIGGER');
                if (!triggerNode) continue;
                const config = this.normalizeStepConfig(triggerNode.config);
                if (config.resetDaily === false) {
                    keepTriggered.add(workflowId);
                }
            }
            this.triggeredToday = keepTriggered;
            this.stepStartDate = new Date();
            this.lastStepResetDate = today;
            await this.saveStepState();
        } else {
            this.triggeredToday = new Set(state.triggeredWorkflows || []);
        }
    }

    private async loadStepState(): Promise<{ lastResetDate: string; triggeredWorkflows: string[] }> {
        try {
            const json = await AsyncStorage.getItem(STEP_STORAGE_KEY);
            return json ? JSON.parse(json) : { lastResetDate: '', triggeredWorkflows: [] };
        } catch (e) {
            return { lastResetDate: '', triggeredWorkflows: [] };
        }
    }

    private async saveStepState() {
        try {
            const state = {
                lastResetDate: this.lastStepResetDate || new Date().toDateString(),
                triggeredWorkflows: Array.from(this.triggeredToday)
            };
            await AsyncStorage.setItem(STEP_STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[SensorTriggerService] Failed to save step state:', e);
        }
    }
}

export const sensorTriggerService = new SensorTriggerService();

