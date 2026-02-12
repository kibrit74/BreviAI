import { WORKFLOW_TEMPLATES, WorkflowTemplate } from '../constants/WorkflowTemplates';

export interface ShortcutTemplate {
    id: string;
    title: string;
    title_en?: string;
    description: string;
    description_en?: string;
    icon?: string;
    color?: string;
    bg?: string;
    category?: string;
    author?: string;
    downloads?: string;
    tags?: string[];
    template_json: Partial<WorkflowTemplate> | any;
}

export const SEED_TEMPLATES: ShortcutTemplate[] = WORKFLOW_TEMPLATES.map(t => ({
    id: t.id,
    title: t.name,
    description: t.description,
    icon: t.icon,
    color: t.color,
    category: 'System', // Default category
    author: 'BreviAI',
    downloads: '1k+',
    tags: ['featured', 'system'],
    template_json: t
}));
