import { Accelerometer, Pedometer } from 'expo-sensors';
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
            this.registerNativeGestures();
        } else {
            // Stop native service if no gestures
            const { MotionTrigger } = require('react-native').NativeModules;
            MotionTrigger?.stopService();
        }

        // Step listener (keep as is for now, or move to native later)
        if (this.activeStepWorkflows.length > 0) {
            this.startStepListening();
        } else {
            this.stopStepListening();
        }
    }

    private async registerNativeGestures() {
        const { MotionTrigger } = require('react-native').NativeModules;
        if (!MotionTrigger) {
            console.warn('[SensorTriggerService] MotionTrigger native module not found');
            return;
        }

        // Start the service first
        await MotionTrigger.startService();

        // Register each workflow
        for (const workflow of this.activeGestureWorkflows) {
            const triggerNode = workflow.nodes.find(n => n.type === 'GESTURE_TRIGGER');
            if (triggerNode) {
                const config = triggerNode.config as GestureTriggerConfig;
                // Native registerTrigger(workflowId, gesture, sensitivity)
                // Note: Native supports 'shake', 'flip', 'double_tap', 'triple_tap'
                if (['shake', 'flip', 'double_tap', 'triple_tap'].includes(config.gesture)) {
                    await MotionTrigger.registerTrigger(workflow.id, config.gesture, config.sensitivity || 'medium');
                } else {
                    console.warn(`[SensorTriggerService] Unsupported native gesture: ${config.gesture}`);
                }
            }
        }
        console.log(`[SensorTriggerService] Registered ${this.activeGestureWorkflows.length} workflows with Native Motion Service`);
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
            // result.steps is the count since watchStepCount was called
            const totalSteps = this.stepStartCount + result.steps;
            this.checkStepTriggers(totalSteps);
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

    private async checkStepTriggers(currentSteps: number) {
        for (const workflow of this.activeStepWorkflows) {
            // Skip if already triggered today
            if (this.triggeredToday.has(workflow.id)) continue;

            const triggerNode = workflow.nodes.find(n => n.type === 'STEP_TRIGGER');
            if (!triggerNode) continue;

            const config = triggerNode.config as StepTriggerConfig;
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
                    _triggerTime: new Date().toISOString()
                }).catch(err => console.error("Step workflow trigger failed", err));
            }
        }
    }

    private async checkDailyReset() {
        const today = new Date().toDateString();
        const state = await this.loadStepState();

        if (state.lastResetDate !== today) {
            console.log('[SensorTriggerService] New day detected, resetting step triggers');
            this.triggeredToday.clear();
            this.stepStartDate = new Date();
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
                lastResetDate: new Date().toDateString(),
                triggeredWorkflows: Array.from(this.triggeredToday)
            };
            await AsyncStorage.setItem(STEP_STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('[SensorTriggerService] Failed to save step state:', e);
        }
    }
}

export const sensorTriggerService = new SensorTriggerService();

