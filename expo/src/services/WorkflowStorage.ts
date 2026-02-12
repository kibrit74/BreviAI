/**
 * Workflow Storage Service
 * AsyncStorage-based persistence for workflows
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workflow, createWorkflow } from '../types/workflow-types';

const WORKFLOWS_KEY = 'brevi_workflows';
const ACTIVE_WORKFLOW_KEY = 'brevi_active_workflow';

export class WorkflowStorage {
    /**
     * Save a workflow
     */
    static async save(workflow: Workflow): Promise<void> {
        const workflows = await this.getAll();
        const index = workflows.findIndex(w => w.id === workflow.id);

        workflow.updatedAt = new Date().toISOString();

        if (index >= 0) {
            workflows[index] = workflow;
        } else {
            workflows.push(workflow);
        }

        await AsyncStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));

        // Sync with Native Triggers (WhatsApp, Call, SMS, etc.) if active
        if (workflow.isActive) {
            try {
                const { triggerNativeService } = require('./TriggerNativeService');
                triggerNativeService.syncWorkflowTriggers(workflow);
            } catch (e) {
                console.warn('Failed to sync native triggers on save', e);
            }
        }

        // Notify sensor service (lazy load to avoid circular dependency)
        try {
            const { sensorTriggerService } = require('./SensorTriggerService');
            sensorTriggerService.refreshTriggers();
        } catch (e) { /* ignore during boot or if not ready */ }
    }

    /**
     * Get all workflows
     */
    static async getAll(): Promise<Workflow[]> {
        try {
            const data = await AsyncStorage.getItem(WORKFLOWS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading workflows:', error);
            return [];
        }
    }

    /**
     * Get a single workflow by ID
     */
    static async getById(id: string): Promise<Workflow | null> {
        const workflows = await this.getAll();
        return workflows.find(w => w.id === id) || null;
    }

    /**
     * Delete a workflow
     */
    static async delete(id: string): Promise<void> {
        const workflows = await this.getAll();
        const filtered = workflows.filter(w => w.id !== id);
        await AsyncStorage.setItem(WORKFLOWS_KEY, JSON.stringify(filtered));

        // Unregister Native Triggers
        try {
            const { triggerNativeService } = require('./TriggerNativeService');
            // We need a dummy workflow object or a direct unregister method
            // Since triggerNativeService.syncWorkflowTriggers requires a workflow object,
            // we can use the direct NativeModule call or exposes a method in TriggerNativeService.
            // Let's use the helper module directly for now or assume triggerNativeService handles it.
            // Actually, triggerNativeService has unregister logic inside sync but we don't have the workflow object anymore if we didn't fetch it.
            // But wait, the task list implies we should just call unregister.
            // Let's rely on `BreviHelperModule.unregisterTrigger(id)` which `TriggerNativeService` uses.
            const { NativeModules } = require('react-native');
            if (NativeModules.BreviHelperModule) {
                NativeModules.BreviHelperModule.unregisterTrigger(id);
            }
        } catch (e) {
            console.warn('Failed to unregister native triggers on delete', e);
        }


        // Notify sensor service
        try {
            const { sensorTriggerService } = require('./SensorTriggerService');
            sensorTriggerService.refreshTriggers();
        } catch (e) { }
    }

    /**
     * Create a new workflow with given name
     */
    static async create(name: string, description?: string): Promise<Workflow> {
        const workflow = createWorkflow(name);
        if (description) {
            workflow.description = description;
        }
        await this.save(workflow);
        return workflow;
    }

    /**
     * Duplicate a workflow
     */
    static async duplicate(id: string): Promise<Workflow | null> {
        const original = await this.getById(id);
        if (!original) return null;

        const duplicate = createWorkflow(`${original.name} (kopya)`);
        duplicate.description = original.description;
        duplicate.icon = original.icon;
        duplicate.color = original.color;
        duplicate.nodes = original.nodes.map(n => ({ ...n, id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }));
        duplicate.edges = []; // Edges would need re-mapping, simplified for now

        await this.save(duplicate);
        return duplicate;
    }

    /**
     * Update workflow run statistics
     */
    static async recordRun(id: string): Promise<void> {
        const workflow = await this.getById(id);
        if (workflow) {
            workflow.lastRun = new Date().toISOString();
            workflow.runCount++;
            await this.save(workflow);
        }
    }

    /**
     * Toggle workflow active state
     */
    static async toggleActive(id: string): Promise<boolean> {
        const workflow = await this.getById(id);
        if (workflow) {
            workflow.isActive = !workflow.isActive;
            await this.save(workflow);

            // Handle TIME_TRIGGER scheduling
            const hasTimeTrigger = workflow.nodes.some(n => n.type === 'TIME_TRIGGER');
            if (hasTimeTrigger) {
                try {
                    const { scheduleWorkflow, cancelScheduledWorkflow } = require('./WorkflowScheduler');
                    if (workflow.isActive) {
                        await scheduleWorkflow(workflow);
                        console.log(`[WorkflowStorage] TIME_TRIGGER scheduled for: ${workflow.name}`);
                    } else {
                        await cancelScheduledWorkflow(workflow.id);
                        console.log(`[WorkflowStorage] TIME_TRIGGER cancelled for: ${workflow.name}`);
                    }
                } catch (e) {
                    console.warn('[WorkflowStorage] Failed to schedule/cancel TIME_TRIGGER:', e);
                }
            }

            // Notify sensor service for GESTURE_TRIGGER, SHAKE_TRIGGER etc.
            try {
                const { sensorTriggerService } = require('./SensorTriggerService');
                sensorTriggerService.refreshTriggers();
            } catch (e) { }

            // Start/stop Telegram bot polling for TELEGRAM_TRIGGER with botToken
            try {
                const { telegramPollingService } = require('./TelegramPollingService');
                telegramPollingService.refreshPolling();
            } catch (e) { }

            // Sync with Native Triggers (WhatsApp, Call, SMS, etc.)
            try {
                const { triggerNativeService } = require('./TriggerNativeService');
                triggerNativeService.syncWorkflowTriggers(workflow);
            } catch (e) {
                console.warn('Failed to sync native triggers', e);
            }

            return workflow.isActive;
        }
        return false;
    }

    /**
     * Get active workflows (for time triggers etc.)
     */
    static async getActive(): Promise<Workflow[]> {
        const workflows = await this.getAll();
        return workflows.filter(w => w.isActive);
    }

    /**
     * Export workflow as JSON string
     */
    static async exportWorkflow(id: string): Promise<string | null> {
        const workflow = await this.getById(id);
        if (!workflow) return null;
        return JSON.stringify(workflow, null, 2);
    }

    /**
     * Import workflow from JSON string
     */
    static async importWorkflow(json: string): Promise<Workflow | null> {
        try {
            const imported = JSON.parse(json) as Workflow;
            // Generate new ID to avoid conflicts
            imported.id = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            imported.createdAt = new Date().toISOString();
            imported.updatedAt = new Date().toISOString();
            imported.runCount = 0;
            imported.lastRun = undefined;

            await this.save(imported);
            return imported;
        } catch (error) {
            console.error('Error importing workflow:', error);
            return null;
        }
    }

    /**
     * Seed test workflows for development/testing
     */
    static async seedTestWorkflows(): Promise<void> {
        const existing = await this.getAll();

        // Check each test workflow individually


        console.log('🌱 Seeding test workflows...');

        // Test Workflow 1: Bildirim Testi
        const workflow1: Workflow = {
            id: 'test_workflow_1',
            name: 'Bildirim Testi',
            description: 'Manuel tetikleyici ile bildirim gönderen basit workflow',
            icon: '🔔',
            color: '#6366F1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: false,
            runCount: 0,
            nodes: [
                {
                    id: 'node_trigger_1',
                    type: 'MANUAL_TRIGGER',
                    label: 'Başlat',
                    position: { x: 50, y: 100 },
                    config: { label: 'Workflow Başlat' },
                },
                {
                    id: 'node_delay_1',
                    type: 'DELAY',
                    label: '2 Saniye Bekle',
                    position: { x: 50, y: 250 },
                    config: { duration: 2, unit: 'sec' },
                },
                {
                    id: 'node_notification_1',
                    type: 'NOTIFICATION',
                    label: 'Bildirim Gönder',
                    position: { x: 50, y: 400 },
                    config: {
                        type: 'toast',
                        title: 'Merhaba!',
                        message: 'Workflow başarıyla çalıştı! 🎉',
                    },
                },
            ],
            edges: [
                {
                    id: 'edge_1',
                    sourceNodeId: 'node_trigger_1',
                    sourcePort: 'default',
                    targetNodeId: 'node_delay_1',
                },
                {
                    id: 'edge_2',
                    sourceNodeId: 'node_delay_1',
                    sourcePort: 'default',
                    targetNodeId: 'node_notification_1',
                },
            ],
        };

        // Test Workflow 2: Flaş Kontrolü
        const workflow2: Workflow = {
            id: 'test_workflow_2',
            name: 'Flaş Kontrolü',
            description: 'Flaşı aç, 3 saniye bekle, flaşı kapat',
            icon: '🔦',
            color: '#F59E0B',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: false,
            runCount: 0,
            nodes: [
                {
                    id: 'node_trigger_2',
                    type: 'MANUAL_TRIGGER',
                    label: 'Başlat',
                    position: { x: 50, y: 100 },
                    config: {},
                },
                {
                    id: 'node_flash_on',
                    type: 'FLASHLIGHT_CONTROL',
                    label: 'Flaşı Aç',
                    position: { x: 50, y: 250 },
                    config: { mode: 'on' },
                },
                {
                    id: 'node_delay_2',
                    type: 'DELAY',
                    label: '3 Saniye Bekle',
                    position: { x: 50, y: 400 },
                    config: { duration: 3, unit: 'sec' },
                },
                {
                    id: 'node_flash_off',
                    type: 'FLASHLIGHT_CONTROL',
                    label: 'Flaşı Kapat',
                    position: { x: 50, y: 550 },
                    config: { mode: 'off' },
                },
                {
                    id: 'node_done',
                    type: 'NOTIFICATION',
                    label: 'Tamamlandı',
                    position: { x: 50, y: 700 },
                    config: {
                        type: 'toast',
                        title: 'Flaş Testi',
                        message: 'Flaş testi tamamlandı!',
                    },
                },
            ],
            edges: [
                {
                    id: 'edge_3',
                    sourceNodeId: 'node_trigger_2',
                    sourcePort: 'default',
                    targetNodeId: 'node_flash_on',
                },
                {
                    id: 'edge_4',
                    sourceNodeId: 'node_flash_on',
                    sourcePort: 'default',
                    targetNodeId: 'node_delay_2',
                },
                {
                    id: 'edge_5',
                    sourceNodeId: 'node_delay_2',
                    sourcePort: 'default',
                    targetNodeId: 'node_flash_off',
                },
                {
                    id: 'edge_6',
                    sourceNodeId: 'node_flash_off',
                    sourcePort: 'default',
                    targetNodeId: 'node_done',
                },
            ],
        };

        // Test Workflow 3: Yeni Özellik Testi
        const workflow3: Workflow = {
            id: 'feature_test_workflow',
            name: 'Yeni Özellik Testi',
            description: 'Konum, Batarya, Takvim ve Bildirim testi',
            icon: '🧪',
            color: '#10B981',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: false,
            runCount: 0,
            nodes: [
                {
                    id: 'node_trigger_3',
                    type: 'MANUAL_TRIGGER',
                    label: 'Başlat',
                    position: { x: 50, y: 100 },
                    config: {},
                },
                {
                    id: 'node_location_1',
                    type: 'LOCATION_GET',
                    label: 'Konum Al',
                    position: { x: 50, y: 250 },
                    config: { accuracy: 'medium', variableName: 'location' },
                },
                {
                    id: 'node_battery_1',
                    type: 'BATTERY_CHECK',
                    label: 'Batarya Kontrol',
                    position: { x: 50, y: 400 },
                    config: { variableName: 'battery' },
                },
                {
                    id: 'node_calendar_1',
                    type: 'CALENDAR_CREATE',
                    label: 'Etkinlik Oluştur',
                    position: { x: 50, y: 550 },
                    config: {
                        title: 'BreviAI Test Çalıştı 🚀',
                        location: 'BreviAI Lab',
                        notes: 'Bu etkinlik otomatik oluşturuldu.'
                    },
                },
                {
                    id: 'node_notification_2',
                    type: 'NOTIFICATION',
                    label: 'Sonuç Bildirimi',
                    position: { x: 50, y: 700 },
                    config: {
                        type: 'toast',
                        title: 'Test Başarılı',
                        message: 'Konum alındı, batarya kontrol edildi, etkinlik eklendi! 🎉',
                    },
                },
            ],
            edges: [
                {
                    id: 'edge_7',
                    sourceNodeId: 'node_trigger_3',
                    sourcePort: 'default',
                    targetNodeId: 'node_location_1',
                },
                {
                    id: 'edge_8',
                    sourceNodeId: 'node_location_1',
                    sourcePort: 'default',
                    targetNodeId: 'node_battery_1',
                },
                {
                    id: 'edge_9',
                    sourceNodeId: 'node_battery_1',
                    sourcePort: 'default',
                    targetNodeId: 'node_calendar_1',
                },
                {
                    id: 'edge_10',
                    sourceNodeId: 'node_calendar_1',
                    sourcePort: 'default',
                    targetNodeId: 'node_notification_2',
                },
            ],
        };

        const smsAnalyzerWorkflow: Workflow = {
            id: 'template-clipboard-analyzer',
            name: '📋 SMS & Mesaj Analizcisi',
            description: 'Kopyaladığınız mesajı (SMS/WP) yapay zeka ile analiz eder, özetler ve randevu varsa çıkarır.',
            icon: 'clipboard',
            color: '#8B5CF6',
            isActive: false, // Manuel tetikleme
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            runCount: 0,
            nodes: [
                {
                    id: 'node_trigger_sms',
                    type: 'MANUAL_TRIGGER',
                    label: 'Başlat',
                    position: { x: 50, y: 100 },
                    config: {},
                },
                {
                    id: 'node_clipboard_read',
                    type: 'CLIPBOARD_READER',
                    label: 'Mesajı Oku',
                    position: { x: 50, y: 250 },
                    config: {
                        variableName: 'messageContent'
                    },
                },
                {
                    id: 'node_ai_analyze',
                    type: 'AGENT_AI',
                    label: 'AI Analizi',
                    position: { x: 50, y: 400 },
                    config: {
                        provider: 'gemini',
                        variableName: 'analysisResult',
                        prompt: 'Sen kişisel bir asistansın. Aşağıdaki metni analiz et. Bu bir SMS veya WhatsApp mesajı olabilir. \n' +
                            '1. Mesajın özetini çıkar.\n' +
                            '2. Eğer mesajda bir randevu, buluşma veya görev varsa tarih ve saat bilgileriyle listele.\n' +
                            '3. Gereksiz veya spam ise belirt.\n\n' +
                            'Mesaj İçeriği:\n{{messageContent}}'
                    },
                },
                {
                    id: 'node_show_result',
                    type: 'SHOW_TEXT',
                    label: 'Sonuç',
                    position: { x: 50, y: 550 },
                    config: {
                        title: '🤖 Analiz Sonucu',
                        content: '{{analysisResult}}'
                    },
                },
            ],
            edges: [
                {
                    id: 'edge_s1',
                    sourceNodeId: 'node_trigger_sms',
                    sourcePort: 'default',
                    targetNodeId: 'node_clipboard_read',
                },
                {
                    id: 'edge_s2',
                    sourceNodeId: 'node_clipboard_read',
                    sourcePort: 'default',
                    targetNodeId: 'node_ai_analyze',
                },
                {
                    id: 'edge_s3',
                    sourceNodeId: 'node_ai_analyze',
                    sourcePort: 'default',
                    targetNodeId: 'node_show_result',
                },
            ],
        };

        const seedWorkflows = [workflow1, workflow2, workflow3, smsAnalyzerWorkflow];

        const toSave = [];
        for (const wf of seedWorkflows) {
            const exists = await this.getById(wf.id);
            if (!exists) {
                toSave.push(this.save(wf));
            }
        }

        if (toSave.length > 0) {
            await Promise.all(toSave);
            console.log(`✅ Seeded ${toSave.length} test workflows`);
        } else {
            console.log('Test workflows already exist');
        }
    }
}
