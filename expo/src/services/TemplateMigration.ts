/**
 * Template Migration Utility
 * Converts old ShortcutTemplate format to new Workflow format
 */

import {
    Workflow,
    WorkflowNode,
    WorkflowEdge,
    NodeType,
    createWorkflow,
    createNode,
    createEdge,
} from '../types/workflow-types';
import { ShortcutTemplate } from '../types';
import { WorkflowStorage } from './WorkflowStorage';

// Mapping from old action types to new node types
const ACTION_TO_NODE_MAP: Record<string, NodeType> = {
    // System Actions
    'TOGGLE_DND': 'DND_CONTROL',
    'SET_DND': 'DND_CONTROL',
    'SET_DND_MODE': 'DND_CONTROL',
    'SET_BRIGHTNESS': 'BRIGHTNESS_CONTROL',
    'TOGGLE_FLASHLIGHT': 'FLASHLIGHT_CONTROL',
    'SET_ALARM': 'ALARM_SET',
    'SET_TIMER': 'DELAY',
    'WAIT': 'DELAY',

    // Volume & Sound Actions
    'SET_VOLUME': 'VOLUME_CONTROL',
    'SET_RINGER_MODE': 'SOUND_MODE',
    'SET_MEDIA_VOLUME': 'VOLUME_CONTROL',
    'SPEAK': 'SPEAK_TEXT',
    'TEXT_TO_SPEECH': 'SPEAK_TEXT',

    // Screen Actions
    'KEEP_SCREEN_ON': 'SCREEN_WAKE',
    'WAKE_SCREEN': 'SCREEN_WAKE',

    // App & Intent Actions
    'OPEN_APP': 'APP_LAUNCH',
    'OPEN_URL': 'APP_LAUNCH',
    'NAVIGATE': 'APP_LAUNCH',
    'LAUNCH_ACTIVITY': 'APP_LAUNCH',

    // Communication Actions
    'SEND_SMS': 'SMS_SEND',
    'SMS': 'SMS_SEND',
    'SEND_EMAIL': 'EMAIL_SEND',
    'EMAIL': 'EMAIL_SEND',
    'CALL': 'APP_LAUNCH', // Will open phone app with number

    // Calendar & Location Actions
    'CREATE_CALENDAR_EVENT': 'CALENDAR_CREATE',
    'ADD_CALENDAR_EVENT': 'CALENDAR_CREATE',
    'GET_LOCATION': 'LOCATION_GET',

    // File & HTTP Actions
    'HTTP_REQUEST': 'HTTP_REQUEST',
    'API_CALL': 'HTTP_REQUEST',
    'WRITE_FILE': 'FILE_WRITE',
    'READ_FILE': 'FILE_READ',
    'SAVE_NOTE': 'FILE_WRITE',

    // Notification Actions
    'SHOW_TOAST': 'NOTIFICATION',
    'SHOW_NOTIFICATION': 'NOTIFICATION',
    'NOTIFY': 'NOTIFICATION',

    // State Check Actions
    'CHECK_BATTERY': 'BATTERY_CHECK',
    'CHECK_NETWORK': 'NETWORK_CHECK',
    'CHECK_WIFI': 'NETWORK_CHECK',
};

export class TemplateMigration {
    /**
     * Migrate a single ShortcutTemplate to Workflow format
     */
    static migrateTemplate(template: ShortcutTemplate): Workflow {
        const workflow = createWorkflow(template.title);
        workflow.description = template.description;
        workflow.color = this.getCategoryColor(template.category);
        workflow.icon = this.getCategoryIcon(template.category);

        const templateJson = template.template_json;

        // Check if it's already in new format (WorkflowTemplate)
        if ('nodes' in templateJson && Array.isArray(templateJson.nodes)) {
            // It's already a workflow, just copy nodes and edges
            workflow.nodes = templateJson.nodes;
            workflow.edges = templateJson.edges;
            return workflow;
        }

        // Legacy format (LegacyTemplateJson)
        const steps = (templateJson as any).steps || [];

        // Create trigger node first
        const triggerNode = createNode('MANUAL_TRIGGER', { x: 100, y: 50 });
        workflow.nodes.push(triggerNode);

        let previousNodeId = triggerNode.id;
        let yPosition = 150;

        // Convert each step to a node
        for (const step of steps) {
            const nodeType = this.mapActionToNodeType(step.type, step.action);
            const node = createNode(nodeType, { x: 100, y: yPosition });

            // Configure node based on step
            node.label = this.getNodeLabel(step);
            node.config = this.convertConfig(step, nodeType);

            workflow.nodes.push(node);

            // Create edge from previous node
            workflow.edges.push(createEdge(previousNodeId, node.id, 'default'));

            previousNodeId = node.id;
            yPosition += 100;
        }

        return workflow;
    }

    /**
     * Map old action type to new node type
     */
    private static mapActionToNodeType(type: string, action: string): NodeType {
        const key = action || type;
        return ACTION_TO_NODE_MAP[key] || 'NOTIFICATION';
    }

    /**
     * Get node label from step
     */
    private static getNodeLabel(step: any): string {
        const params = step.params || {};

        if (step.action === 'OPEN_APP') {
            return params.appName || params.packageName || 'Uygulama Aç';
        }
        if (step.action === 'SHOW_TOAST' || step.action === 'SHOW_NOTIFICATION') {
            return params.message?.substring(0, 20) || 'Bildirim';
        }
        if (step.action === 'SET_DND' || step.action === 'TOGGLE_DND') {
            return params.enabled ? 'DND Aç' : 'DND Kapat';
        }
        if (step.action === 'SET_BRIGHTNESS') {
            return `Parlaklık: ${params.level || params.brightness}%`;
        }
        if (step.action === 'SET_TIMER') {
            return `${params.minutes || 5} dk Bekle`;
        }

        return step.action || step.type || 'Eylem';
    }

    /**
     * Convert old params to new config format
     */
    private static convertConfig(step: any, nodeType: NodeType): any {
        const params = step.params || {};

        switch (nodeType) {
            case 'DND_CONTROL':
                return {
                    enabled: params.state === 'ON' || params.enabled !== false,
                    duration: params.duration || 0,
                };

            case 'BRIGHTNESS_CONTROL':
                return {
                    level: params.level || params.brightness || 50,
                };

            case 'NOTIFICATION':
                return {
                    type: params.title ? 'notification' : 'toast',
                    message: params.message || params.body || 'Bildirim',
                    title: params.title || '',
                };

            case 'DELAY':
                // Convert from timer length (seconds) to delay config
                const lengthSec = params.length || 0;
                if (lengthSec >= 60) {
                    return { duration: Math.floor(lengthSec / 60), unit: 'min' };
                }
                return { duration: lengthSec || params.seconds || 5, unit: 'sec' };

            case 'SOUND_MODE':
                let mode: 'silent' | 'vibrate' | 'normal' = 'normal';
                if (params.mode === 'silent' || params.ringerMode === 0) mode = 'silent';
                else if (params.mode === 'vibrate' || params.ringerMode === 1) mode = 'vibrate';
                return { mode };

            case 'VOLUME_CONTROL':
                return {
                    stream: params.stream || 'media',
                    level: params.level || 50,
                };

            case 'SPEAK_TEXT':
                return {
                    text: params.text || params.message || '',
                    language: params.language || 'tr-TR',
                };

            case 'SCREEN_WAKE':
                return {
                    keepAwake: params.enabled !== false,
                    duration: params.duration,
                };

            case 'APP_LAUNCH':
                return {
                    packageName: params.packageName || '',
                    appName: params.appName || params.app_category || '',
                };

            case 'FLASHLIGHT_CONTROL':
                return {
                    mode: params.state === 'OFF' ? 'off' : 'toggle',
                };

            case 'SMS_SEND':
                return {
                    phoneNumber: params.phone || params.to || '',
                    message: params.message || '',
                };

            case 'EMAIL_SEND':
                return {
                    to: params.to || params.email || '',
                    subject: params.subject || '',
                    body: params.body || params.message || '',
                };

            case 'CALENDAR_CREATE':
                return {
                    title: params.title || 'Etkinlik',
                    startTime: params.startTime || '',
                    endTime: params.endTime || '',
                    notes: params.notes || '',
                };

            case 'HTTP_REQUEST':
                return {
                    url: params.url || '',
                    method: params.method || 'GET',
                    headers: params.headers || {},
                    body: params.body || '',
                    variableName: params.output_key || 'response',
                };

            case 'FILE_WRITE':
                return {
                    filename: params.filename || 'note.txt',
                    content: params.content || '',
                    append: params.append || false,
                };

            case 'FILE_READ':
                return {
                    filename: params.filename || '',
                    variableName: params.output_key || 'fileContent',
                };

            case 'ALARM_SET':
                return {
                    hour: params.hour || 7,
                    minute: params.minutes || 0,
                    label: params.message || 'Alarm',
                };

            case 'BATTERY_CHECK':
            case 'NETWORK_CHECK':
                return {
                    variableName: params.output_key || 'status',
                };

            case 'LOCATION_GET':
                return {
                    variableName: params.output_key || 'location',
                };

            default:
                return params;
        }
    }

    /**
     * Get category color
     */
    private static getCategoryColor(category: string): string {
        const colors: Record<string, string> = {
            'Battery': '#10B981',
            'Security': '#EF4444',
            'Productivity': '#6366F1',
            'Lifestyle': '#F59E0B',
            'Social': '#EC4899',
            'Health': '#14B8A6',
            'Travel': '#8B5CF6',
        };
        return colors[category] || '#6366F1';
    }

    /**
     * Get category icon
     */
    private static getCategoryIcon(category: string): string {
        const icons: Record<string, string> = {
            'Battery': '🔋',
            'Security': '🔒',
            'Productivity': '⚡',
            'Lifestyle': '🌟',
            'Social': '💬',
            'Health': '❤️',
            'Travel': '✈️',
        };
        return icons[category] || '⚡';
    }

    /**
     * Migrate all templates to workflows
     */
    static async migrateAll(templates: ShortcutTemplate[]): Promise<number> {
        let count = 0;

        for (const template of templates) {
            try {
                const workflow = this.migrateTemplate(template);
                await WorkflowStorage.save(workflow);
                count++;
            } catch (error) {
                console.error(`Failed to migrate template ${template.id}:`, error);
            }
        }

        return count;
    }

    /**
     * Convert raw steps array to Workflow object (for AI generation)
     */
    static convertStepsToWorkflow(steps: any[], name: string = 'AI Workflow'): Workflow {
        const workflow = createWorkflow(name);
        workflow.description = 'AI tarafından oluşturuldu';
        workflow.color = '#8B5CF6';
        workflow.icon = '✨';

        // Create trigger node first
        const triggerNode = createNode('MANUAL_TRIGGER', { x: 100, y: 50 });
        workflow.nodes.push(triggerNode);

        let previousNodeId = triggerNode.id;
        let yPosition = 150;

        // Convert each step to a node
        for (const step of steps) {
            const nodeType = this.mapActionToNodeType(step.type, step.action);
            const node = createNode(nodeType, { x: 100, y: yPosition });

            // Configure node based on step
            node.label = this.getNodeLabel(step);
            node.config = this.convertConfig(step, nodeType);

            workflow.nodes.push(node);

            // Create edge from previous node
            workflow.edges.push(createEdge(previousNodeId, node.id, 'default'));

            previousNodeId = node.id;
            yPosition += 150;
        }

        return workflow;
    }
}
