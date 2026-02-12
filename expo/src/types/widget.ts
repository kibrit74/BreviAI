/**
 * Widget System Type Definitions
 * BreviAI Widget Configuration Types
 */

export interface WidgetButton {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  shortcutId?: string;
  action?: WidgetAction;
}

export interface WidgetAction {
  type: 'workflow' | 'app' | 'system' | 'custom';
  payload: any;
}

export interface WidgetConfig {
  id: string;
  name: string;
  size: '2x2' | '2x3' | '4x2';
  buttons: WidgetButton[];
  appearance: {
    backgroundColor?: string;
    textColor?: string;
    iconSize?: number;
    fontSize?: number;
    borderRadius?: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface WidgetPreferences {
  widgets: Record<string, WidgetConfig>;
  defaultWidgetId?: string;
  autoUpdateEnabled: boolean;
}

export interface WidgetUpdateRequest {
  widgetId: string;
  config?: Partial<WidgetConfig>;
  forceUpdate?: boolean;
}

export interface WidgetExecutionResult {
  success: boolean;
  error?: string;
  executionId?: string;
}

// Widget Layout Types
export type WidgetLayoutSize = {
  rows: number;
  columns: number;
  minSize: { width: number; height: number };
  maxSize?: { width: number; height: number };
};

export const WIDGET_LAYOUTS: Record<string, WidgetLayoutSize> = {
  '2x2': {
    rows: 2,
    columns: 2,
    minSize: { width: 110, height: 110 },
    maxSize: { width: 250, height: 250 }
  },
  '2x3': {
    rows: 2,
    columns: 3,
    minSize: { width: 250, height: 110 },
    maxSize: { width: 400, height: 180 }
  },
  '4x2': {
    rows: 4,
    columns: 2,
    minSize: { width: 110, height: 250 },
    maxSize: { width: 180, height: 400 }
  }
};

// Default Widget Configuration
export const DEFAULT_WIDGET_CONFIG: Omit<WidgetConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'BreviAI Widget',
  size: '2x3',
  buttons: [
    { id: '1', label: 'Ekle', icon: '➕' },
    { id: '2', label: 'Ekle', icon: '➕' },
    { id: '3', label: 'Ekle', icon: '➕' },
    { id: '4', label: 'Ekle', icon: '➕' },
    { id: '5', label: 'Ekle', icon: '➕' },
    { id: '6', label: 'Ekle', icon: '➕' }
  ],
  appearance: {
    backgroundColor: '#2196F3',
    textColor: '#FFFFFF',
    iconSize: 24,
    fontSize: 12,
    borderRadius: 8
  }
};

// Widget Error Types
export class WidgetError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WidgetError';
  }
}

export const WIDGET_ERROR_CODES = {
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  INVALID_SHORTCUT: 'INVALID_SHORTCUT',
  WORKFLOW_EXECUTION_FAILED: 'WORKFLOW_EXECUTION_FAILED',
  NATIVE_BRIDGE_ERROR: 'NATIVE_BRIDGE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  INVALID_WIDGET_ID: 'INVALID_WIDGET_ID'
} as const;