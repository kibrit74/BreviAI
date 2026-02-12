import { WorkflowTemplate } from './types/workflow-types';

export interface LegacyTemplateJson {
    steps: any[];
    [key: string]: any;
}

export interface ShortcutTemplate {
    id: string;
    title: string;
    title_en?: string;
    description: string;
    description_en?: string;
    category: 'Battery' | 'Security' | 'Productivity' | 'Lifestyle' | 'Social' | 'Health' | 'Travel' | 'Web' | 'AI';
    author: string;
    downloads: string;
    tags: string[];
    template_json: WorkflowTemplate | LegacyTemplateJson;
    icon?: string;
    color?: string;
    bg?: string;
}
