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

export type WidgetModeRoutinePresetId = 'focus' | 'sleep' | 'drive' | 'meeting';

export interface WidgetModeRoutinePreset {
  id: WidgetModeRoutinePresetId;
  title: string;
  subtitle: string;
  description: string;
  buttons: WidgetButton[];
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

function buildPresetButtons(items: Array<Partial<WidgetButton>>, size: WidgetSize): WidgetButton[] {
  const normalized = normalizeWidgetButtons(items as WidgetButton[], size);
  return normalized.map((button, index) => ({
    ...button,
    id: String(index + 1),
  }));
}

export const WIDGET_MODE_ROUTINE_PRESETS: Record<WidgetModeRoutinePresetId, WidgetModeRoutinePreset> = {
  focus: {
    id: 'focus',
    title: 'Odak',
    subtitle: 'Calisma',
    description: 'Daha az bildirim, daha net odak.',
    buttons: buildPresetButtons(
      [
        {
          label: 'Odak',
          icon: 'OD',
          color: '#2563EB',
          action: { type: 'system', payload: { action: 'quick_mode', mode: 'focus' } },
        },
        {
          label: 'Toplanti',
          icon: 'MT',
          color: '#4F46E5',
          action: { type: 'system', payload: { action: 'quick_mode', mode: 'meeting' } },
        },
        {
          label: 'DND Ac',
          icon: 'DND',
          color: '#0EA5E9',
          action: { type: 'system', payload: { action: 'dnd', enabled: true } },
        },
        {
          label: 'Sessiz',
          icon: 'SL',
          color: '#334155',
          action: { type: 'system', payload: { action: 'sound_mode', mode: 'silent' } },
        },
        {
          label: 'DND Ayar',
          icon: 'CFG',
          color: '#1D4ED8',
          action: { type: 'system', payload: { action: 'open_settings', setting: 'dnd' } },
        },
        {
          label: 'Ses Ac',
          icon: 'ON',
          color: '#0284C7',
          action: { type: 'system', payload: { action: 'sound_mode', mode: 'normal' } },
        },
      ],
      '2x3'
    ),
  },
  sleep: {
    id: 'sleep',
    title: 'Uyku',
    subtitle: 'Gece',
    description: 'Gece modu ve sessiz profil gecisleri.',
    buttons: buildPresetButtons(
      [
        {
          label: 'Uyku',
          icon: 'ZZ',
          color: '#0F172A',
          action: { type: 'system', payload: { action: 'quick_mode', mode: 'sleep' } },
        },
        {
          label: 'DND Ac',
          icon: 'DND',
          color: '#111827',
          action: { type: 'system', payload: { action: 'dnd', enabled: true } },
        },
        {
          label: 'Titresim',
          icon: 'VIB',
          color: '#1F2937',
          action: { type: 'system', payload: { action: 'sound_mode', mode: 'vibrate' } },
        },
        {
          label: 'DND Kapat',
          icon: 'OFF',
          color: '#334155',
          action: { type: 'system', payload: { action: 'dnd', enabled: false } },
        },
        {
          label: 'Saat',
          icon: 'CLK',
          color: '#475569',
          action: { type: 'app', payload: { packageName: 'com.sec.android.app.clockpackage' } },
        },
        {
          label: 'Ayarlar',
          icon: 'CFG',
          color: '#64748B',
          action: { type: 'system', payload: { action: 'open_settings', setting: 'settings' } },
        },
      ],
      '2x3'
    ),
  },
  drive: {
    id: 'drive',
    title: 'Surus',
    subtitle: 'Yolda',
    description: 'Arac icin hizli baglanti ve rota kontrolu.',
    buttons: buildPresetButtons(
      [
        {
          label: 'Surus',
          icon: 'DRV',
          color: '#0EA5E9',
          action: { type: 'system', payload: { action: 'quick_mode', mode: 'drive' } },
        },
        {
          label: 'Bluetooth',
          icon: 'BT',
          color: '#0284C7',
          action: { type: 'system', payload: { action: 'bluetooth', mode: 'toggle' } },
        },
        {
          label: 'Haritalar',
          icon: 'MAP',
          color: '#0369A1',
          action: { type: 'app', payload: { packageName: 'com.google.android.apps.maps' } },
        },
        {
          label: 'Konum',
          icon: 'LOC',
          color: '#075985',
          action: { type: 'system', payload: { action: 'open_settings', setting: 'location' } },
        },
        {
          label: 'Ses Ac',
          icon: 'ON',
          color: '#0C4A6E',
          action: { type: 'system', payload: { action: 'sound_mode', mode: 'normal' } },
        },
        {
          label: 'Ana Ekran',
          icon: 'HOME',
          color: '#164E63',
          action: { type: 'system', payload: { action: 'global', actionName: 'home' } },
        },
      ],
      '2x3'
    ),
  },
  meeting: {
    id: 'meeting',
    title: 'Toplanti',
    subtitle: 'Hizli',
    description: 'Tek dokunusla toplantiya hazir profil.',
    buttons: buildPresetButtons(
      [
        {
          label: 'Toplanti',
          icon: 'MT',
          color: '#4338CA',
          action: { type: 'system', payload: { action: 'quick_mode', mode: 'meeting' } },
        },
        {
          label: 'DND Ac',
          icon: 'DND',
          color: '#4F46E5',
          action: { type: 'system', payload: { action: 'dnd', enabled: true } },
        },
        {
          label: 'Titresim',
          icon: 'VIB',
          color: '#6366F1',
          action: { type: 'system', payload: { action: 'sound_mode', mode: 'vibrate' } },
        },
        {
          label: 'Takvim',
          icon: 'CAL',
          color: '#818CF8',
          action: { type: 'app', payload: { packageName: 'com.google.android.calendar' } },
        },
        {
          label: 'Notlar',
          icon: 'NOTE',
          color: '#A5B4FC',
          action: { type: 'app', payload: { packageName: 'com.samsung.android.app.notes' } },
        },
        {
          label: 'Normal',
          icon: 'ON',
          color: '#C7D2FE',
          action: { type: 'system', payload: { action: 'sound_mode', mode: 'normal' } },
        },
      ],
      '2x3'
    ),
  },
};

export function createButtonsFromModeRoutinePreset(
  presetId: WidgetModeRoutinePresetId,
  size: WidgetSize
): WidgetButton[] {
  const preset = WIDGET_MODE_ROUTINE_PRESETS[presetId];
  return normalizeWidgetButtons(preset.buttons, size);
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
