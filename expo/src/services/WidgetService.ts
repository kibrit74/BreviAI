import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WidgetConfig,
  WidgetPreferences,
  WidgetButton,
  WidgetUpdateRequest,
  WidgetExecutionResult,
  WidgetError,
  WIDGET_ERROR_CODES,
  DEFAULT_WIDGET_CONFIG
} from '../types/widget';
import { Platform, NativeModules } from 'react-native';
import { WorkflowEngine } from '../services/WorkflowEngine';

// Get native module directly from NativeModules
const { BreviHelperModule } = NativeModules;

const WIDGET_STORAGE_KEY = '@breviai_widget_preferences';
const WIDGET_CONFIG_PREFIX = 'widget_config_';

export class WidgetService {
  private static instance: WidgetService;
  private _workflowEngine: WorkflowEngine | null = null;
  private nativeWidgetManager = Platform.OS === 'android' ? BreviHelperModule : null;

  private constructor() {
    // Lazy initialization - WorkflowEngine loaded on first use
  }

  // Lazy getter for WorkflowEngine to avoid circular dependency
  private get workflowEngine(): WorkflowEngine {
    if (!this._workflowEngine) {
      this._workflowEngine = WorkflowEngine.getInstance();
    }
    return this._workflowEngine;
  }

  static getInstance(): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService();
    }
    return WidgetService.instance;
  }

  /**
   * Get all widget configurations
   */
  async getWidgetPreferences(): Promise<WidgetPreferences> {
    try {
      const stored = await AsyncStorage.getItem(WIDGET_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }

      // Return default preferences
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

  /**
   * Get specific widget configuration
   */
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

  /**
   * Create new widget configuration
   */
  async createWidgetConfig(name: string, size: '2x2' | '2x3' | '4x2' = '2x3'): Promise<WidgetConfig> {
    const widgetId = this.generateWidgetId();
    const now = Date.now();

    const config: WidgetConfig = {
      ...DEFAULT_WIDGET_CONFIG,
      id: widgetId,
      name,
      size,
      createdAt: now,
      updatedAt: now
    };

    await this.saveWidgetConfig(config);
    return config;
  }

  /**
   * Update widget configuration
   */
  async updateWidgetConfig(request: WidgetUpdateRequest): Promise<void> {
    try {
      // Get all preferences directly to avoid throwing if specific widget missing
      const preferences = await this.getWidgetPreferences();
      const existingConfig = preferences.widgets[request.widgetId];

      let configToSave: WidgetConfig;

      if (!existingConfig) {
        // If not found, only proceed if we can create (upsert)
        // We need a config object in the request to create
        if (request.forceUpdate && request.config) {
          configToSave = {
            ...DEFAULT_WIDGET_CONFIG,
            ...request.config,
            id: request.widgetId,
            updatedAt: Date.now(),
            createdAt: Date.now()
          } as WidgetConfig;
        } else {
          throw new WidgetError(
            `Widget ${request.widgetId} not found`,
            WIDGET_ERROR_CODES.CONFIG_NOT_FOUND
          );
        }
      } else {
        // Update existing
        configToSave = {
          ...existingConfig,
          ...request.config,
          id: request.widgetId, // Ensure ID doesn't change
          updatedAt: Date.now()
        };
      }

      await this.saveWidgetConfig(configToSave);

      // Force native widget update if requested
      if (request.forceUpdate && this.nativeWidgetManager) {
        await this.updateNativeWidget(request.widgetId);
      }
    } catch (error) {
      if (error instanceof WidgetError) throw error;

      throw new WidgetError(
        `Failed to update widget ${request.widgetId}`,
        WIDGET_ERROR_CODES.STORAGE_ERROR,
        error
      );
    }
  }

  /**
   * Assign shortcut to widget button
   */
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

      // Update the button with shortcut assignment
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

  /**
   * Execute widget action
   */
  async executeWidgetAction(
    widgetId: string,
    buttonId: string
  ): Promise<WidgetExecutionResult> {
    try {
      const config = await this.getWidgetConfig(widgetId);
      if (!config) {
        throw new WidgetError(
          `Widget ${widgetId} not found`,
          WIDGET_ERROR_CODES.CONFIG_NOT_FOUND
        );
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

      // Execute action based on type
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

  /**
   * Delete widget configuration
   */
  async deleteWidgetConfig(widgetId: string): Promise<void> {
    try {
      const preferences = await this.getWidgetPreferences();
      const { [widgetId]: removed, ...remainingWidgets } = preferences.widgets;

      const updatedPreferences: WidgetPreferences = {
        ...preferences,
        widgets: remainingWidgets
      };

      if (preferences.defaultWidgetId === widgetId) {
        delete updatedPreferences.defaultWidgetId;
      }

      await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(updatedPreferences));
    } catch (error) {
      throw new WidgetError(
        `Failed to delete widget ${widgetId}`,
        WIDGET_ERROR_CODES.STORAGE_ERROR,
        error
      );
    }
  }

  /**
   * Set default widget
   */
  async setDefaultWidget(widgetId: string): Promise<void> {
    try {
      const preferences = await this.getWidgetPreferences();
      preferences.defaultWidgetId = widgetId;
      await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      throw new WidgetError(
        'Failed to set default widget',
        WIDGET_ERROR_CODES.STORAGE_ERROR,
        error
      );
    }
  }

  // Private helper methods

  private async saveWidgetConfig(config: WidgetConfig): Promise<void> {
    try {
      const preferences = await this.getWidgetPreferences();
      preferences.widgets[config.id] = config;

      // Set as default if it's the first widget
      if (!preferences.defaultWidgetId) {
        preferences.defaultWidgetId = config.id;
      }

      await AsyncStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(preferences));

      // 🔥 CRITICAL: Sync to native SharedPreferences for widget to read
      // Without this, ShortcutWidgetProvider can't find shortcutId and opens app instead
      await this.syncToNativeWidget(config);
    } catch (error) {
      throw new WidgetError(
        'Failed to save widget configuration',
        WIDGET_ERROR_CODES.STORAGE_ERROR,
        error
      );
    }
  }

  /**
   * Sync widget config to native SharedPreferences
   * ShortcutWidgetProvider reads from SharedPreferences, not AsyncStorage
   */
  private async syncToNativeWidget(config: WidgetConfig): Promise<void> {
    try {
      if (this.nativeWidgetManager?.updateWidget) {
        await this.nativeWidgetManager.updateWidget(config.id, JSON.stringify(config));
        console.log(`[WidgetService] Synced widget ${config.id} to native`);
      }

      // Also sync to 'default_widget' key for widgets without specific ID mapping
      if (this.nativeWidgetManager?.updateWidget) {
        await this.nativeWidgetManager.updateWidget('default_widget', JSON.stringify(config));
      }
    } catch (error) {
      console.warn('[WidgetService] Native sync failed:', error);
      // Don't throw - native sync is best-effort
    }
  }

  private async executeWorkflowAction(shortcutId: string): Promise<WidgetExecutionResult> {
    try {
      // For now, we'll open the app with the shortcut ID since WorkflowEngine expects a full Workflow object
      // In the future, we could add a method to execute by shortcut ID directly
      if (this.nativeWidgetManager?.openBreviAI) {
        await this.nativeWidgetManager.openBreviAI({ shortcutId, source: 'widget' });
        return {
          success: true,
          executionId: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      } else {
        throw new Error('Native widget bridge not available');
      }
    } catch (error) {
      return {
        success: false,
        error: `Workflow execution failed: ${error.message}`
      };
    }
  }

  private async executeAppAction(payload: { packageName: string }): Promise<WidgetExecutionResult> {
    try {
      if (this.nativeWidgetManager?.launchApp) {
        await this.nativeWidgetManager.launchApp(payload.packageName);
        return { success: true };
      } else {
        throw new Error('Native app launcher not available');
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to launch app: ${error.message}`
      };
    }
  }

  private async executeSystemAction(payload: any): Promise<WidgetExecutionResult> {
    try {
      if (this.nativeWidgetManager?.executeSystemAction) {
        await this.nativeWidgetManager.executeSystemAction(payload);
        return { success: true };
      } else {
        throw new Error('Native system action not available');
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to execute system action: ${error.message}`
      };
    }
  }

  private async executeCustomAction(payload: any): Promise<WidgetExecutionResult> {
    // Custom actions - could open the app to a specific screen
    try {
      if (this.nativeWidgetManager?.openBreviAI) {
        await this.nativeWidgetManager.openBreviAI(payload);
        return { success: true };
      } else {
        throw new Error('Native custom action not available');
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to execute custom action: ${error.message}`
      };
    }
  }

  private async updateNativeWidget(widgetId: string): Promise<void> {
    if (!this.nativeWidgetManager?.updateWidget) {
      console.warn('Native widget update not available');
      return;
    }

    // Fetch latest config
    const config = await this.getWidgetConfig(widgetId);
    if (config) {
      // Send config JSON to native module
      // BreviSettingsManager.updateWidget(widgetId, configJson)
      await this.nativeWidgetManager.updateWidget(widgetId, JSON.stringify(config));
    }
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}