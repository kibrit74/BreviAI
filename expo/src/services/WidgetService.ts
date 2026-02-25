import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WidgetConfig,
  WidgetPreferences,
  WidgetUpdateRequest,
  WidgetExecutionResult,
  WidgetError,
  WIDGET_ERROR_CODES,
  DEFAULT_WIDGET_CONFIG,
  WidgetSize,
  normalizeWidgetButtons
} from '../types/widget';
import { Platform, NativeModules } from 'react-native';

const { BreviHelperModule } = NativeModules;

let BreviSettingsModule: any = null;
try {
  const mod = require('brevi-settings');
  BreviSettingsModule = mod?.default ?? mod;
} catch {
  BreviSettingsModule = null;
}

const WIDGET_STORAGE_KEY = '@breviai_widget_preferences';

type NativeWidgetManager = {
  updateWidget?: (widgetId: string, configJson?: string) => Promise<void> | void;
  deleteWidgetConfig?: (widgetId: string) => Promise<void> | void;
  openBreviAI?: (payload: any) => Promise<void> | void;
  executeWidgetWorkflow?: (shortcutId: string) => Promise<boolean> | boolean;
  executeSystemAction?: (action: any) => Promise<void> | void;
  launchApp?: (packageName: string) => Promise<boolean> | boolean;
};

function resolveNativeWidgetManager(): NativeWidgetManager | null {
  if (Platform.OS !== 'android') return null;
  return (BreviSettingsModule as NativeWidgetManager) ?? (BreviHelperModule as NativeWidgetManager) ?? null;
}

export class WidgetService {
  private static instance: WidgetService;
  private nativeWidgetManager: NativeWidgetManager | null = resolveNativeWidgetManager();

  private constructor() {}

  static getInstance(): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService();
    }
    return WidgetService.instance;
  }

  async getWidgetPreferences(): Promise<WidgetPreferences> {
    try {
      const stored = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WidgetPreferences;
        return {
          widgets: parsed.widgets || {},
          defaultWidgetId: parsed.defaultWidgetId,
          autoUpdateEnabled: parsed.autoUpdateEnabled !== false
        };
      }

      return {
        widgets: {},
        autoUpdateEnabled: true
      };
    } catch (error) {
      throw new WidgetError(
        'Failed to load widget preferences',
        WIDGET_ERROR_CODES.STORAGE_ERROR,
        error
      );
    }
  }

  async getWidgetConfig(widgetId: string): Promise<WidgetConfig | null> {
    try {
      const preferences = await this.getWidgetPreferences();
      return preferences.widgets[widgetId] || null;
    } catch (error) {
      throw new WidgetError(
        `Failed to get widget config for ${widgetId}`,
        WIDGET_ERROR_CODES.CONFIG_NOT_FOUND,
        error
      );
    }
  }

  async createWidgetConfig(name: string, size: WidgetSize = '2x3'): Promise<WidgetConfig> {
    const widgetId = this.generateWidgetId();
    const now = Date.now();

    const config: WidgetConfig = {
      ...DEFAULT_WIDGET_CONFIG,
      id: widgetId,
      name,
      size,
      buttons: normalizeWidgetButtons(DEFAULT_WIDGET_CONFIG.buttons, size),
      createdAt: now,
      updatedAt: now
    };

    await this.saveWidgetConfig(config);
    return config;
  }

  async updateWidgetConfig(request: WidgetUpdateRequest): Promise<void> {
    try {
      const preferences = await this.getWidgetPreferences();
      const existingConfig = preferences.widgets[request.widgetId];
      const now = Date.now();

      let configToSave: WidgetConfig;

      if (!existingConfig) {
        if (request.forceUpdate && request.config) {
          const targetSize = (request.config.size || DEFAULT_WIDGET_CONFIG.size) as WidgetSize;
          configToSave = {
            ...DEFAULT_WIDGET_CONFIG,
            ...request.config,
            id: request.widgetId,
            size: targetSize,
            buttons: normalizeWidgetButtons(request.config.buttons, targetSize),
            createdAt: now,
            updatedAt: now
          } as WidgetConfig;
        } else {
          throw new WidgetError(
            `Widget ${request.widgetId} not found`,
            WIDGET_ERROR_CODES.CONFIG_NOT_FOUND
          );
        }
      } else {
        const mergedConfig = {
          ...existingConfig,
          ...request.config
        };
        const targetSize = (mergedConfig.size || existingConfig.size) as WidgetSize;

        configToSave = {
          ...mergedConfig,
          id: request.widgetId,
          size: targetSize,
          buttons: normalizeWidgetButtons(mergedConfig.buttons, targetSize),
          createdAt: existingConfig.createdAt || now,
          updatedAt: now
        };
      }

      await this.saveWidgetConfig(configToSave);
    } catch (error) {
      if (error instanceof WidgetError) throw error;

      throw new WidgetError(
        `Failed to update widget ${request.widgetId}`,
        WIDGET_ERROR_CODES.STORAGE_ERROR,
        error
      );
    }
  }

  async assignShortcutToWidget(
    widgetId: string,
    buttonId: string,
    shortcutId: string
  ): Promise<void> {
    try {
      const config = await this.getWidgetConfig(widgetId);
      if (!config) {
        throw new WidgetError(
          `Widget ${widgetId} not found`,
          WIDGET_ERROR_CODES.CONFIG_NOT_FOUND
        );
      }

      const updatedButtons = config.buttons.map(button =>
        button.id === buttonId
          ? { ...button, shortcutId, action: { type: 'workflow' as const, payload: { shortcutId } } }
          : button
      );

      await this.updateWidgetConfig({
        widgetId,
        config: { buttons: updatedButtons },
        forceUpdate: true
      });
    } catch (error) {
      if (error instanceof WidgetError) throw error;

      throw new WidgetError(
        `Failed to assign shortcut to widget ${widgetId}`,
        WIDGET_ERROR_CODES.STORAGE_ERROR,
        error
      );
    }
  }

  async executeWidgetAction(widgetId: string, buttonId: string): Promise<WidgetExecutionResult> {
    try {
      const config = await this.getWidgetConfig(widgetId);
      if (!config) {
        throw new WidgetError(`Widget ${widgetId} not found`, WIDGET_ERROR_CODES.CONFIG_NOT_FOUND);
      }

      const button = config.buttons.find(b => b.id === buttonId);
      if (!button) {
        throw new WidgetError(
          `Button ${buttonId} not found in widget ${widgetId}`,
          WIDGET_ERROR_CODES.CONFIG_NOT_FOUND
        );
      }

      if (!button.action) {
        throw new WidgetError(
          `No action configured for button ${buttonId}`,
          WIDGET_ERROR_CODES.INVALID_SHORTCUT
        );
      }

      switch (button.action.type) {
        case 'workflow':
          return await this.executeWorkflowAction(button.action.payload.shortcutId);
        case 'app':
          return await this.executeAppAction(button.action.payload);
        case 'system':
          return await this.executeSystemAction(button.action.payload);
        case 'custom':
          return await this.executeCustomAction(button.action.payload);
        default:
          throw new WidgetError(
            `Unknown action type: ${button.action.type}`,
            WIDGET_ERROR_CODES.INVALID_SHORTCUT
          );
      }
    } catch (error) {
      if (error instanceof WidgetError) {
        return { success: false, error: error.message };
      }

      return {
        success: false,
        error: 'Unknown error executing widget action'
      };
    }
  }

  async deleteWidgetConfig(widgetId: string): Promise<void> {
    try {
      const preferences = await this.getWidgetPreferences();
      const hadConfig = !!preferences.widgets[widgetId];
      const { [widgetId]: removed, ...remainingWidgets } = preferences.widgets;
      if (!hadConfig) {
        return;
      }

      const remainingIds = Object.keys(remainingWidgets);
      const wasDefault = preferences.defaultWidgetId === widgetId;

      const updatedPreferences: WidgetPreferences = {
        ...preferences,
        widgets: remainingWidgets
      };

      if (wasDefault) {
        const nextDefaultId = remainingIds[0];
        if (nextDefaultId) {
          updatedPreferences.defaultWidgetId = nextDefaultId;
        } else {
          delete updatedPreferences.defaultWidgetId;
        }
      } else if (!updatedPreferences.defaultWidgetId || !remainingWidgets[updatedPreferences.defaultWidgetId]) {
        delete updatedPreferences.defaultWidgetId;
      }

      await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(updatedPreferences));

      await this.clearNativeWidgetConfig(widgetId);

      if (!wasDefault && !updatedPreferences.defaultWidgetId && preferences.defaultWidgetId) {
        await this.clearNativeWidgetConfig('default_widget');
      }

      if (wasDefault) {
        if (updatedPreferences.defaultWidgetId) {
          await this.syncDefaultWidgetAlias(updatedPreferences);
        } else {
          await this.clearNativeWidgetConfig('default_widget');
        }
      }
    } catch (error) {
      if (error instanceof WidgetError) throw error;

      throw new WidgetError(
        `Failed to delete widget ${widgetId}`,
        WIDGET_ERROR_CODES.STORAGE_ERROR,
        error
      );
    }
  }

  async setDefaultWidget(widgetId: string): Promise<void> {
    try {
      const preferences = await this.getWidgetPreferences();
      if (!preferences.widgets[widgetId]) {
        throw new WidgetError(
          `Widget ${widgetId} not found`,
          WIDGET_ERROR_CODES.CONFIG_NOT_FOUND
        );
      }
      preferences.defaultWidgetId = widgetId;
      await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(preferences));
      await this.syncDefaultWidgetAlias(preferences);
    } catch (error) {
      if (error instanceof WidgetError) throw error;

      throw new WidgetError(
        'Failed to set default widget',
        WIDGET_ERROR_CODES.STORAGE_ERROR,
        error
      );
    }
  }

  private async saveWidgetConfig(config: WidgetConfig): Promise<void> {
    try {
      const now = Date.now();
      const normalizedSize = (config.size || DEFAULT_WIDGET_CONFIG.size) as WidgetSize;
      const normalizedConfig: WidgetConfig = {
        ...config,
        size: normalizedSize,
        buttons: normalizeWidgetButtons(config.buttons, normalizedSize),
        createdAt: config.createdAt || now,
        updatedAt: config.updatedAt || now
      };

      const preferences = await this.getWidgetPreferences();
      preferences.widgets[normalizedConfig.id] = normalizedConfig;

      if (!preferences.defaultWidgetId) {
        preferences.defaultWidgetId = normalizedConfig.id;
      }

      await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(preferences));
      await this.syncToNativeWidget(normalizedConfig);
      if (
        preferences.defaultWidgetId === normalizedConfig.id &&
        normalizedConfig.id !== 'default_widget'
      ) {
        await this.syncDefaultWidgetAlias(preferences, normalizedConfig);
      }
    } catch (error) {
      if (error instanceof WidgetError) throw error;

      throw new WidgetError(
        'Failed to save widget configuration',
        WIDGET_ERROR_CODES.STORAGE_ERROR,
        error
      );
    }
  }

  private async syncToNativeWidget(config: WidgetConfig): Promise<void> {
    if (!this.nativeWidgetManager?.updateWidget) {
      return;
    }

    try {
      await this.nativeWidgetManager.updateWidget(config.id, JSON.stringify(config));
    } catch (error) {
      throw new WidgetError(
        `Failed to sync widget ${config.id} to native storage`,
        WIDGET_ERROR_CODES.NATIVE_BRIDGE_ERROR,
        error
      );
    }
  }

  private async syncDefaultWidgetAlias(
    preferences: WidgetPreferences,
    knownDefaultConfig?: WidgetConfig
  ): Promise<void> {
    const defaultWidgetId = preferences.defaultWidgetId;
    if (!defaultWidgetId || !this.nativeWidgetManager?.updateWidget) {
      return;
    }

    const defaultConfig =
      knownDefaultConfig?.id === defaultWidgetId
        ? knownDefaultConfig
        : preferences.widgets[defaultWidgetId];

    if (!defaultConfig) {
      throw new WidgetError(
        `Default widget ${defaultWidgetId} not found`,
        WIDGET_ERROR_CODES.CONFIG_NOT_FOUND
      );
    }

    try {
      await this.nativeWidgetManager.updateWidget('default_widget', JSON.stringify(defaultConfig));
    } catch (error) {
      throw new WidgetError(
        'Failed to sync default widget alias to native storage',
        WIDGET_ERROR_CODES.NATIVE_BRIDGE_ERROR,
        error
      );
    }
  }

  private async clearNativeWidgetConfig(widgetId: string): Promise<void> {
    if (!this.nativeWidgetManager?.deleteWidgetConfig) {
      return;
    }

    try {
      await this.nativeWidgetManager.deleteWidgetConfig(widgetId);
    } catch (error) {
      throw new WidgetError(
        `Failed to delete native widget config ${widgetId}`,
        WIDGET_ERROR_CODES.NATIVE_BRIDGE_ERROR,
        error
      );
    }
  }

  private async executeWorkflowAction(shortcutId: string): Promise<WidgetExecutionResult> {
    try {
      if (this.nativeWidgetManager?.executeWidgetWorkflow) {
        const result = await this.nativeWidgetManager.executeWidgetWorkflow(shortcutId);
        if (result) {
          return {
            success: true,
            executionId: `widget_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
          };
        }
        throw new Error('Native widget workflow execution returned false');
      }

      throw new Error('Native widget workflow bridge is not available');
    } catch (error: any) {
      return {
        success: false,
        error: `Workflow execution failed: ${error?.message || String(error)}`
      };
    }
  }

  private async executeAppAction(payload: { packageName: string }): Promise<WidgetExecutionResult> {
    try {
      if (this.nativeWidgetManager?.launchApp) {
        const launched = await this.nativeWidgetManager.launchApp(payload.packageName);
        return launched === false ? { success: false, error: 'App could not be launched' } : { success: true };
      }

      throw new Error('Native app launcher not available');
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to launch app: ${error?.message || String(error)}`
      };
    }
  }

  private async executeSystemAction(payload: any): Promise<WidgetExecutionResult> {
    try {
      if (this.nativeWidgetManager?.executeSystemAction) {
        await this.nativeWidgetManager.executeSystemAction(payload);
        return { success: true };
      }

      throw new Error('Native system action not available');
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to execute system action: ${error?.message || String(error)}`
      };
    }
  }

  private async executeCustomAction(payload: any): Promise<WidgetExecutionResult> {
    try {
      if (this.nativeWidgetManager?.openBreviAI) {
        await this.invokeOpenBreviAI(payload);
        return { success: true };
      }

      throw new Error('Native custom action not available');
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to execute custom action: ${error?.message || String(error)}`
      };
    }
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private async invokeOpenBreviAI(payload: any): Promise<void> {
    if (!this.nativeWidgetManager?.openBreviAI) {
      throw new Error('Native openBreviAI is not available');
    }

    try {
      await this.nativeWidgetManager.openBreviAI(payload);
    } catch (error) {
      // Legacy bridge fallback: some RN modules accept only string payload.
      if (typeof payload === 'string') {
        throw error;
      }
      await this.nativeWidgetManager.openBreviAI(JSON.stringify(payload));
    }
  }
}
