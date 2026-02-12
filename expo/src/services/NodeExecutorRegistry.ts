/**
 * NodeExecutorRegistry - Type-safe node executor registry
 * 
 * Centralizes node execution with proper TypeScript typing,
 * eliminating the need for 'as any' casts in WorkflowEngine.
 * 
 * @author Team Audit Fix - Technical Architect
 */

import { NodeType } from '../types/workflow-types';

// ═══════════════════════════════════════════════════════════════
// Import all config types
// ═══════════════════════════════════════════════════════════════
import {
    CalendarReadConfig,
    CalendarCreateConfig,
    LocationGetConfig,
    GeofenceCreateConfig,
    BatteryCheckConfig,
    NetworkCheckConfig,
    VolumeControlConfig,
    SpeakTextConfig,
    AudioRecordConfig,
    SpeechToTextConfig,
    SmsSendConfig,
    EmailSendConfig,
    WhatsAppSendConfig,
    TelegramSendConfig,
    SlackSendConfig,
    DiscordSendConfig,
    HttpRequestConfig,
    OpenUrlConfig,
    WebAutomationConfig,
    FileWriteConfig,
    FileReadConfig,
    FilePickConfig,
    PdfCreateConfig,
    AlarmSetConfig,
    AgentAIConfig,
    GoogleSheetsReadConfig,
    GoogleSheetsWriteConfig,
    GoogleDriveUploadConfig,
    GmailSendConfig,
    GmailReadConfig,
    ClipboardReaderConfig,
    ImageGeneratorConfig,
    ImageEditConfig,
    GoogleTranslateConfig,
    NotionCreateConfig,
    NotionReadConfig,
    PhilipsHueConfig,
    RememberInfoConfig,
    SwitchConfig,
    FacebookLoginConfig,
    InstagramPostConfig,
    OutlookSendConfig,
    OutlookReadConfig,
    ExcelReadConfig,
    ExcelWriteConfig,
    OneDriveUploadConfig,
    OneDriveDownloadConfig,
    OneDriveListConfig,
    RssReadConfig,
    NavigateToConfig,
    SettingsOpenConfig,
    ShowTextConfig,
    ShowImageConfig,
    NotificationConfig,
    TextInputConfig,
    ShowMenuConfig,
    AppLaunchConfig,
    LightSensorConfig,
    PedometerConfig,
    MagnetometerConfig,
    BarometerConfig,
    GestureTriggerConfig,
    CameraCaptureConfig,
    ViewUdfConfig,
    ViewDocumentConfig,
    DatabaseReadConfig,
    DatabaseWriteConfig,
} from '../types/workflow-types';

// ═══════════════════════════════════════════════════════════════
// Import all executor functions
// ═══════════════════════════════════════════════════════════════
import {
    executeCalendarRead,
    executeCalendarCreate,
    executeCalendarUpdate,
    executeCalendarDelete,
    executeContactsRead,
    executeContactsWrite,
    executeNavigateTo,
    executeSettingsOpen,
    executeDatabaseRead,
    executeDatabaseWrite,
    executeLocationGet,
    executeGeofenceCreate,
    executeBatteryCheck,
    executeNetworkCheck,
    executeWeatherGet,
    executeVolumeControl,
    executeSpeakText,
    executeAudioRecord,
    executeSmsSend,
    executeEmailSend,
    executeWhatsAppSend,
    executeHttpRequest,
    executeOpenUrl,
    executeWebAutomation,
    executeWebSearch,
    executeHtmlExtract,
    executeFileWrite,
    executeFileRead,
    executeFilePick,
    executePdfCreate,
    executeAlarmSet,
    executeViewUdf,
    executeViewDocument,
    executeSpeechToText,
    executeAgentAI,
    executeRssRead,
    executeGoogleSheetsRead,
    executeGoogleSheetsWrite,
    executeGoogleDriveUpload,
    executeGmailSend,
    executeGmailRead,
    executeClipboardReader,
    executeImageGenerator,
    executeImageEdit,
    executeGoogleTranslate,
    executeTelegramSend,
    executeSlackSend,
    executeDiscordSend,
    executeNotionCreate,
    executeNotionRead,
    executePhilipsHue,
    executeRememberInfo,
    executeSwitch,
    executeFacebookLogin,
    executeInstagramPost,
    executeOutlookSend,
    executeOutlookRead,
    executeExcelRead,
    executeExcelWrite,
    executeOneDriveUpload,
    executeOneDriveDownload,
    executeOneDriveList,
    executeShowText,
    executeShowImage,
    executeNotification,
    executeTextInput,
    executeShowMenu,
    executeAppLaunch,
    executeCodeExecution,
    executeSetValues,
    executeAddToMemory,
    executeSearchMemory,
    executeBulkAddToMemory,
    executeClearMemory,
} from './nodes';

import {
    executeCronCreate,
    executeCronDelete,
    executeCronList,
    executeBrowserScrape
} from './nodes/backend';



import {
    executeLightSensor,
    executePedometer,
    executeMagnetometer,
    executeBarometer,
    executeGestureTrigger,
} from './nodes/sensors';

import { executeCameraCapture } from './nodes/camera';
import { VariableManager as VMClass } from './VariableManager';

// ═══════════════════════════════════════════════════════════════
// Executor Type Definition
// ═══════════════════════════════════════════════════════════════

type NodeExecutor<TConfig = any> = (
    config: TConfig,
    variableManager: VMClass,
    abortSignal?: AbortSignal
) => Promise<any>;

// ═══════════════════════════════════════════════════════════════
// Registry Definition
// ═══════════════════════════════════════════════════════════════

interface ExecutorEntry<TConfig = any> {
    executor: NodeExecutor<TConfig>;
    requiresAbortSignal?: boolean;
}

const executorRegistry: Partial<Record<NodeType, ExecutorEntry>> = {
    // Calendar
    'CALENDAR_READ': { executor: executeCalendarRead },
    'CALENDAR_CREATE': { executor: executeCalendarCreate },
    'CALENDAR_UPDATE': { executor: executeCalendarUpdate },
    'CALENDAR_DELETE': { executor: executeCalendarDelete },

    // Contacts
    'CONTACTS_READ': { executor: executeContactsRead },
    'CONTACTS_WRITE': { executor: executeContactsWrite },

    // Navigation
    'NAVIGATE_TO': { executor: executeNavigateTo },
    'SETTINGS_OPEN': { executor: executeSettingsOpen },

    // Database
    'DB_READ': { executor: executeDatabaseRead },
    'DB_WRITE': { executor: executeDatabaseWrite },

    // Location
    'LOCATION_GET': { executor: executeLocationGet },
    'GEOFENCE_CREATE': { executor: executeGeofenceCreate },

    // State
    'BATTERY_CHECK': { executor: executeBatteryCheck },
    'NETWORK_CHECK': { executor: executeNetworkCheck },
    'WEATHER_GET': { executor: executeWeatherGet },

    // Audio
    'VOLUME_CONTROL': { executor: executeVolumeControl },
    'SPEAK_TEXT': { executor: executeSpeakText },
    'AUDIO_RECORD': { executor: executeAudioRecord },
    'SPEECH_TO_TEXT': { executor: executeSpeechToText },

    // Communication
    'SMS_SEND': { executor: executeSmsSend },
    'EMAIL_SEND': { executor: executeEmailSend },
    'WHATSAPP_SEND': { executor: executeWhatsAppSend },
    'TELEGRAM_SEND': { executor: executeTelegramSend },
    'SLACK_SEND': { executor: executeSlackSend },
    'DISCORD_SEND': { executor: executeDiscordSend },

    // Web
    'HTTP_REQUEST': { executor: executeHttpRequest, requiresAbortSignal: true },
    'OPEN_URL': { executor: executeOpenUrl },
    'WEB_AUTOMATION': { executor: executeWebAutomation },
    'WEB_SEARCH': { executor: executeWebSearch },
    'HTML_EXTRACT': { executor: executeHtmlExtract },
    'GOOGLE_TRANSLATE': { executor: executeGoogleTranslate },
    'RSS_READ': { executor: executeRssRead },
    'FACEBOOK_LOGIN': { executor: executeFacebookLogin },

    // Files
    'FILE_WRITE': { executor: executeFileWrite },
    'FILE_READ': { executor: executeFileRead },
    'FILE_PICK': { executor: executeFilePick },
    'PDF_CREATE': { executor: executePdfCreate },
    'VIEW_UDF': { executor: executeViewUdf },
    'VIEW_DOCUMENT': { executor: executeViewDocument },

    // Alarm
    'ALARM_SET': { executor: executeAlarmSet },

    // AI
    'AGENT_AI': { executor: executeAgentAI },
    'IMAGE_GENERATOR': { executor: executeImageGenerator },
    'IMAGE_EDIT': { executor: executeImageEdit },

    // Google
    'GMAIL_SEND': { executor: executeGmailSend },
    'GMAIL_READ': { executor: executeGmailRead },
    'SHEETS_READ': { executor: executeGoogleSheetsRead },
    'SHEETS_WRITE': { executor: executeGoogleSheetsWrite },
    'DRIVE_UPLOAD': { executor: executeGoogleDriveUpload },

    // Microsoft
    'OUTLOOK_SEND': { executor: executeOutlookSend },
    'OUTLOOK_READ': { executor: executeOutlookRead },
    'EXCEL_READ': { executor: executeExcelRead },
    'EXCEL_WRITE': { executor: executeExcelWrite },
    'ONEDRIVE_UPLOAD': { executor: executeOneDriveUpload },
    'ONEDRIVE_DOWNLOAD': { executor: executeOneDriveDownload },
    'ONEDRIVE_LIST': { executor: executeOneDriveList },

    // Productivity
    'NOTION_CREATE': { executor: executeNotionCreate },
    'NOTION_READ': { executor: executeNotionRead },

    // Smart Home
    'PHILIPS_HUE': { executor: executePhilipsHue },

    // Memory
    'REMEMBER_INFO': { executor: executeRememberInfo },
    'SEARCH_MEMORY': { executor: executeSearchMemory },
    'ADD_TO_MEMORY': { executor: executeAddToMemory },
    'BULK_ADD_TO_MEMORY': { executor: executeBulkAddToMemory },
    'CLEAR_MEMORY': { executor: executeClearMemory },

    // Control
    'SWITCH': { executor: executeSwitch },
    'CODE_EXECUTION': { executor: executeCodeExecution },
    'SET_VALUES': { executor: executeSetValues },

    // Social
    'INSTAGRAM_POST': { executor: executeInstagramPost },

    // Output
    'SHOW_TEXT': { executor: executeShowText },
    'SHOW_IMAGE': { executor: executeShowImage },
    'NOTIFICATION': { executor: executeNotification },

    // Input
    'TEXT_INPUT': { executor: executeTextInput },
    'SHOW_MENU': { executor: executeShowMenu },
    'CLIPBOARD_READER': { executor: executeClipboardReader },

    // Device
    'APP_LAUNCH': { executor: executeAppLaunch },

    // Sensors
    'LIGHT_SENSOR': { executor: executeLightSensor },
    'PEDOMETER': { executor: executePedometer },
    'MAGNETOMETER': { executor: executeMagnetometer },
    'BAROMETER': { executor: executeBarometer },
    'GESTURE_TRIGGER': { executor: executeGestureTrigger },

    // Camera
    'CAMERA_CAPTURE': { executor: executeCameraCapture },

    // Backend Services
    'CRON_CREATE': { executor: executeCronCreate },
    'CRON_DELETE': { executor: executeCronDelete },
    'CRON_LIST': { executor: executeCronList },
    'BROWSER_SCRAPE': { executor: executeBrowserScrape },
};

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a node type has a registered executor
 */
export function hasExecutor(nodeType: NodeType): boolean {
    return nodeType in executorRegistry;
}

/**
 * Get executor entry for a node type
 */
export function getExecutor(nodeType: NodeType): ExecutorEntry | undefined {
    return executorRegistry[nodeType];
}

/**
 * Execute a node using the registry
 * Returns undefined if no executor is registered (fallback to legacy switch)
 */
export async function executeFromRegistry(
    nodeType: NodeType,
    config: any,
    variableManager: VMClass,
    abortSignal?: AbortSignal
): Promise<{ handled: boolean; result?: any }> {
    const entry = executorRegistry[nodeType];

    if (!entry) {
        return { handled: false };
    }

    try {
        const result = entry.requiresAbortSignal
            ? await entry.executor(config, variableManager, abortSignal)
            : await entry.executor(config, variableManager);

        return { handled: true, result };
    } catch (error) {
        console.error(`[NodeExecutorRegistry] Error executing ${nodeType}:`, error);
        throw error;
    }
}

/**
 * Get all registered node types
 */
export function getRegisteredNodeTypes(): NodeType[] {
    return Object.keys(executorRegistry) as NodeType[];
}

/**
 * Get count of registered executors
 */
export function getExecutorCount(): number {
    return Object.keys(executorRegistry).length;
}

export default {
    hasExecutor,
    getExecutor,
    executeFromRegistry,
    getRegisteredNodeTypes,
    getExecutorCount,
};
