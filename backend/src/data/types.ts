
export interface ShortcutStep {
    step_id?: number;
    type: 'SYSTEM_ACTION' | 'APP_ACTION' | 'INTENT_ACTION' | 'MEDIA_ACTION' | 'NOTIFICATION_ACTION' | 'ACCESSIBILITY_ACTION';
    action: string;
    params: Record<string, any>;
    output_key?: string;
    requires_app_selection?: boolean;  // For AI logic-only architecture
}

export interface ShortcutTrigger {
    type: string;
    params: Record<string, any>;
}

export interface ShortcutCondition {
    type: string;
    params: Record<string, any>;
    logic?: 'AND' | 'OR';
}

export interface ShortcutTemplate {
    id: string;
    title: string;
    title_en?: string;
    description: string;
    description_en?: string;
    category: string;
    author: string;
    downloads: string;
    tags: string[];
    template_json: any;
}
