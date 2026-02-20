/**
 * Widget System Type Definitions
 * BreviAI Widget Configuration Types
 */

export type WidgetSize = '2x2' | '2x3' | '4x2';

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
  size: WidgetSize;
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
  buttonCount: number;
  minSize: { width: number; height: number };
  maxSize?: { width: number; height: number };
};

export const WIDGET_LAYOUTS: Record<WidgetSize, WidgetLayoutSize> = {
  '2x2': {
    rows: 2,
    columns: 2,
    buttonCount: 4,
    minSize: { width: 110, height: 110 },
    maxSize: { width: 250, height: 250 }
  },
  '2x3': {
    rows: 3,
    columns: 2,
    buttonCount: 6,
    minSize: { width: 110, height: 180 },
    maxSize: { width: 250, height: 360 }
  },
  '4x2': {
    rows: 4,
    columns: 2,
    buttonCount: 8,
    minSize: { width: 110, height: 250 },
    maxSize: { width: 180, height: 400 }
  }
};

export function getButtonCountForSize(size: WidgetSize): number {
  return WIDGET_LAYOUTS[size].buttonCount;
}

export function createDefaultButtonsForSize(size: WidgetSize): WidgetButton[] {
  const buttonCount = getButtonCountForSize(size);
  return Array.from({ length: buttonCount }, (_, index) => ({
    id: String(index + 1),
    label: 'Ekle',
    icon: '+'
  }));
}

export function normalizeWidgetButtons(
  buttons: WidgetButton[] | undefined,
  size: WidgetSize
): WidgetButton[] {
  const desiredCount = getButtonCountForSize(size);
  const input = Array.isArray(buttons) ? buttons : [];
  const defaults = createDefaultButtonsForSize(size);

  return defaults.slice(0, desiredCount).map((fallbackButton, index) => {
    const candidate = input[index];
    if (!candidate) {
      return fallbackButton;
    }

    return {
      ...fallbackButton,
      ...candidate,
      id: String(index + 1)
    };
  });
}

// Default Widget Configuration
export const DEFAULT_WIDGET_CONFIG: Omit<WidgetConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'BreviAI Widget',
  size: '2x3',
  buttons: createDefaultButtonsForSize('2x3'),
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
