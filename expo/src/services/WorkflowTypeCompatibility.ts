import { EdgePort, WorkflowNode, NodeType } from '../types/workflow-types';

export type WorkflowDataType =
    | 'any'
    | 'flow'
    | 'text'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array'
    | 'image'
    | 'audio'
    | 'file'
    | 'location';

interface NodeTypeSignature {
    input?: WorkflowDataType[];
    output?: Partial<Record<EdgePort, WorkflowDataType[]>>;
}

const NODE_TYPE_SIGNATURES: Partial<Record<NodeType, NodeTypeSignature>> = {
    TEXT_INPUT: { output: { default: ['text'] } },
    AUDIO_RECORD: { output: { default: ['audio'] } },
    SPEECH_TO_TEXT: { input: ['audio', 'file'], output: { default: ['text'] } },
    GOOGLE_TRANSLATE: { input: ['text'], output: { default: ['text'] } },
    SPEAK_TEXT: { input: ['text'] },
    IMAGE_GENERATOR: { input: ['text'], output: { default: ['image'] } },
    IMAGE_EDIT: { input: ['image', 'file'], output: { default: ['image'] } },
    SHOW_IMAGE: { input: ['image', 'file'] },
    FILE_PICK: { output: { default: ['file', 'image', 'audio'] } },
    CAMERA_CAPTURE: { output: { default: ['image'] } },
    LOCATION_GET: { output: { default: ['location', 'object'] } },
    WEATHER_GET: { output: { default: ['object', 'text'] } },
    CONTACTS_READ: { output: { default: ['array', 'object'] } },
    CALENDAR_READ: { output: { default: ['array', 'object'] } },
    RSS_READ: { output: { default: ['array', 'object'] } },
    HTTP_REQUEST: { output: { default: ['object', 'array', 'text'] } },
    HTML_EXTRACT: { input: ['text', 'object'], output: { default: ['object', 'array', 'text'] } },
    AGENT_AI: { input: ['text', 'object', 'array'], output: { default: ['text', 'object'] } },
};

const FLOW_PORTS: EdgePort[] = ['true', 'false', 'error', 'loop', 'done', 'case_1', 'case_2', 'case_3', 'case_4'];

const toUnique = (types?: WorkflowDataType[]) => Array.from(new Set(types || ['any']));

const getInputTypes = (nodeType: NodeType): WorkflowDataType[] => {
    return toUnique(NODE_TYPE_SIGNATURES[nodeType]?.input || ['any']);
};

const getOutputTypes = (nodeType: NodeType, port: EdgePort): WorkflowDataType[] => {
    if (FLOW_PORTS.includes(port)) {
        return ['flow'];
    }
    const signature = NODE_TYPE_SIGNATURES[nodeType];
    return toUnique(signature?.output?.[port] || signature?.output?.default || ['any']);
};

const hasIntersection = (a: WorkflowDataType[], b: WorkflowDataType[]) => {
    return a.some(type => b.includes(type));
};

const formatTypeLabel = (types: WorkflowDataType[]) => {
    return types.join(', ');
};

export interface ConnectionCompatibilityResult {
    compatible: boolean;
    sourceTypes: WorkflowDataType[];
    targetTypes: WorkflowDataType[];
    reason?: string;
}

export const evaluateConnectionCompatibility = (
    sourceNode: WorkflowNode,
    sourcePort: EdgePort,
    targetNode: WorkflowNode
): ConnectionCompatibilityResult => {
    const sourceTypes = getOutputTypes(sourceNode.type, sourcePort);
    const targetTypes = getInputTypes(targetNode.type);

    if (sourceTypes.includes('flow')) {
        return { compatible: true, sourceTypes, targetTypes };
    }

    if (sourceTypes.includes('any') || targetTypes.includes('any')) {
        return { compatible: true, sourceTypes, targetTypes };
    }

    const compatible = hasIntersection(sourceTypes, targetTypes);
    if (compatible) {
        return { compatible: true, sourceTypes, targetTypes };
    }

    return {
        compatible: false,
        sourceTypes,
        targetTypes,
        reason: `Kaynak: ${formatTypeLabel(sourceTypes)} | Hedef: ${formatTypeLabel(targetTypes)}`,
    };
};
