/**
 * BreviAI Workflow System - Type Definitions
 * Mini n8n benzeri node-tabanlı otomasyon sistemi
 */

// ═══════════════════════════════════════════════════════════════
// NODE TYPES
// ═══════════════════════════════════════════════════════════════

export type NodeCategory =
    | 'trigger'
    | 'control'
    | 'input'
    | 'output'
    | 'device'
    | 'processing'
    | 'ai'
    | 'state'
    | 'calendar'
    | 'location'
    | 'audio'
    | 'communication'
    | 'web'
    | 'files'
    | 'google'
    | 'microsoft'
    | 'microsoft'
    | 'social'
    | 'data'
    | 'memory'
    | 'display';

export type NodeType =
    // Triggers (6)
    | 'MANUAL_TRIGGER'
    | 'TIME_TRIGGER'
    | 'NOTIFICATION_TRIGGER'
    | 'EMAIL_TRIGGER'
    | 'TELEGRAM_TRIGGER'
    | 'GEOFENCE_TRIGGER'
    | 'GEOFENCE_ENTER_TRIGGER'
    | 'GEOFENCE_EXIT_TRIGGER'
    | 'DEEP_LINK_TRIGGER'
    | 'CHAT_INPUT_TRIGGER'  // NEW: Start workflow with user text input
    // Control (5)
    | 'DELAY'
    | 'IF_ELSE'
    | 'VARIABLE'
    | 'LOOP'
    | 'SWITCH'
    | 'CODE_EXECUTION'
    | 'SET_VALUES'
    | 'SPLIT_BATCHES'
    // Input (3)
    | 'TEXT_INPUT'
    | 'SHOW_MENU'
    | 'CLIPBOARD_READER'
    // Output (4)
    | 'NOTIFICATION'
    | 'SHARE_SHEET'
    | 'SHOW_TEXT'
    | 'SHOW_IMAGE'
    // Device (6)
    | 'SOUND_MODE'
    | 'SCREEN_WAKE'
    | 'APP_LAUNCH'
    | 'DND_CONTROL'
    | 'BRIGHTNESS_CONTROL'
    | 'FLASHLIGHT_CONTROL'
    | 'BLUETOOTH_CONTROL'
    | 'GLOBAL_ACTION'
    | 'MEDIA_CONTROL'
    // Calendar (2)
    | 'CALENDAR_READ'
    | 'CALENDAR_CREATE'
    | 'CALENDAR_UPDATE'
    | 'CALENDAR_DELETE'
    | 'CONTACTS_READ'
    | 'CONTACTS_WRITE'
    // Navigation (1)
    | 'NAVIGATE_TO'
    // Settings (1)
    | 'SETTINGS_OPEN'
    // Database (2)
    | 'DB_READ'
    | 'DB_WRITE'
    // Location (4)
    | 'LOCATION_GET'
    | 'GEOFENCE_CREATE'
    // State (2)
    | 'BATTERY_CHECK'
    | 'NETWORK_CHECK'
    // Weather
    | 'WEATHER_GET'
    // Audio (3)
    | 'VOLUME_CONTROL'
    | 'SPEAK_TEXT'
    | 'AUDIO_RECORD'
    | 'SPEECH_TO_TEXT'
    // Communication
    | 'SMS_SEND'
    | 'EMAIL_SEND'
    | 'TELEGRAM_SEND'
    | 'SLACK_SEND'
    | 'DISCORD_SEND'
    | 'WHATSAPP_SEND'
    | 'INSTAGRAM_POST'
    // Productivity
    | 'NOTION_CREATE'
    | 'NOTION_READ'
    // Web (5)
    | 'HTTP_REQUEST'
    | 'OPEN_URL'
    | 'GOOGLE_TRANSLATE'
    | 'RSS_READ'
    | 'WEB_AUTOMATION'
    | 'WEB_SEARCH'
    | 'HTML_EXTRACT'
    | 'FACEBOOK_LOGIN'
    // Control
    | 'SWITCH'
    | 'DYNAMIC_EXECUTOR'
    // Files (4)
    | 'FILE_WRITE'
    | 'FILE_READ'
    | 'PDF_CREATE'
    | 'FILE_PICK'
    // Alarm (1)
    | 'ALARM_SET'
    // AI (1)
    | 'AGENT_AI'
    | 'IMAGE_GENERATOR'
    | 'IMAGE_EDIT'
    // Backend Services
    | 'CRON_CREATE'
    | 'BROWSER_SCRAPE'
    // Google (4)
    | 'GMAIL_SEND'
    | 'GMAIL_READ'
    | 'SHEETS_READ'
    | 'SHEETS_WRITE'
    | 'DRIVE_UPLOAD'
    // Sensors (4)
    | 'LIGHT_SENSOR'
    | 'PEDOMETER'
    | 'MAGNETOMETER'
    | 'BAROMETER'
    // Gestures (1)
    // Gestures (1)
    | 'GESTURE_TRIGGER'
    | 'STEP_TRIGGER'
    // Call / Message Triggers
    | 'CALL_TRIGGER'
    | 'SMS_TRIGGER'
    | 'WHATSAPP_TRIGGER'
    // Microsoft
    | 'OUTLOOK_SEND'
    | 'OUTLOOK_READ'
    | 'EXCEL_READ'
    | 'EXCEL_WRITE'
    | 'ONEDRIVE_UPLOAD'
    | 'ONEDRIVE_DOWNLOAD'
    | 'ONEDRIVE_LIST'
    | 'VIEW_UDF'
    | 'VIEW_DOCUMENT'
    // Smart Home
    | 'PHILIPS_HUE'
    // Camera
    | 'CAMERA_CAPTURE'
    // Memory
    | 'REMEMBER_INFO'
    | 'SEARCH_MEMORY'
    | 'ADD_TO_MEMORY'
    | 'BULK_ADD_TO_MEMORY'
    | 'CLEAR_MEMORY'
    // Overlay
    | 'SHOW_OVERLAY'
    | 'OVERLAY_INPUT'
    | 'OVERLAY_CLEAR'
    // Real-time AI
    | 'REALTIME_AI';

// ═══════════════════════════════════════════════════════════════
// NODE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

export interface ManualTriggerConfig {
    label?: string;
}

export interface NotificationTriggerConfig {
    packageName?: string; // e.g. com.whatsapp
    titleFilter?: string; // Regex or exact match
    textFilter?: string;

    exactMatch?: boolean;
}

export interface EmailTriggerConfig {
    senderFilter?: string; // e.g. "Google" or specific email if title contains it
    subjectFilter?: string;
    bodyFilter?: string;
}

export interface TelegramTriggerConfig {
    chatNameFilter?: string; // The title of the notification is usually the chat name
    messageFilter?: string;
    botToken?: string; // If provided, uses Bot API (Long Polling)
    timeout?: number; // Polling timeout in seconds (default 30)
    variableName?: string; // Store message info
    triggerType?: string; // explicit trigger type (e.g. 'message')
}

// Call Trigger Setup
export interface CallTriggerConfig {
    states: ('Incoming' | 'Connected' | 'Disconnected' | 'Dialing')[];
    phoneNumber?: string; // Filter specific number
    variableName: string; // Store caller info
}

// SMS Trigger Setup
export interface SMSTriggerConfig {
    phoneNumberFilter?: string; // Filter specific sender
    messageFilter?: string; // Filter by message content
    variableName: string; // Store SMS info
}

// WhatsApp Trigger Setup
export interface WhatsAppTriggerConfig {
    senderFilter?: string; // Filter by sender name or number
    messageFilter?: string; // Filter by message content
    groupFilter?: string; // Filter by group name
    variableName: string; // Store message info
}

export interface TimeTriggerConfig {
    hour: number;
    minute: number;
    days?: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
    repeat: boolean;
}

export interface DelayConfig {
    duration: number;
    unit: 'ms' | 'sec' | 'min' | 'hour';
}

export interface ConditionItem {
    left: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty';
    right: string;
    caseSensitive?: boolean;
}

export interface IfElseConfig extends ConditionItem {
    // Legacy single condition fields inherited from ConditionItem
    // New multi-condition support:
    conditions?: ConditionItem[];
    logic?: 'AND' | 'OR';
}

export interface VariableConfig {
    operation: 'set' | 'get' | 'increment' | 'decrement' | 'append' | 'clear';
    name: string;
    value?: any;
}

export interface LoopConfig {
    type: 'count' | 'while' | 'forEach';
    count?: number;
    condition?: IfElseConfig;
    items?: string; // Variable name containing array
}

export interface TextInputConfig {
    prompt: string;
    placeholder?: string;
    defaultValue?: string;
    variableName: string; // Store result in this variable
    attachmentsVariableName?: string; // Store attachments (images/files) in this variable
}

export interface ShowMenuConfig {
    title: string;
    options: string[];
    variableName: string;
}

export interface ImageGeneratorConfig {
    provider: 'nanobana' | 'pollinations' | 'gemini';
    prompt: string;
    inputImage?: string; // For editing or reference
    variableName: string;
    width?: number;
    height?: number;
    apiKey?: string;
    model?: string;
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

export interface ImageEditConfig {
    inputImage: string; // Variable name or URI
    actions: {
        type: 'resize' | 'crop' | 'rotate' | 'flip' | 'center_crop';
        width?: number;
        height?: number;
        originX?: number; // crop start
        originY?: number; // crop start
        angle?: number;
        vertical?: boolean; // flip
        horizontal?: boolean; // flip
    }[];
    saveFormat?: 'jpeg' | 'png';
    quality?: number; // 0.0 - 1.0
    variableName: string;
}

export interface ViewUdfConfig {
    fileSource: string; // Variable name or direct path
}

export interface ViewDocumentConfig {
    fileSource: string; // Variable name or direct path
}

export interface ShowTextConfig {
    title?: string;
    content: string; // Supports {{variable}} syntax
}

export interface ShowImageConfig {
    title?: string;
    imageSource: string; // Variable name or URI, supports {{variable}} syntax
}

export interface ClipboardReaderConfig {
    variableName: string; // Store result in this variable
}

export interface NotificationConfig {
    type: 'toast' | 'push';
    title?: string;
    message: string;
    duration?: 'short' | 'long';
}

export interface ShareSheetConfig {
    content: string;
    title?: string;
}

export interface SoundModeConfig {
    mode: 'silent' | 'vibrate' | 'normal';
    saveCurrentMode?: boolean; // Save current mode to variable for restoration
    savedModeVariable?: string;
}

export interface ScreenWakeConfig {
    keepAwake: boolean;
    duration?: number; // ms, if not permanent
}

export interface AppLaunchConfig {
    packageName: string;
    appName?: string; // Display name for UI
}

export interface DNDControlConfig {
    enabled: boolean;
    duration?: number; // minutes
}

export interface BrightnessControlConfig {
    level: number; // 0-100
    saveCurrentLevel?: boolean;
    savedLevelVariable?: string;
}

export interface FlashlightControlConfig {
    mode: 'toggle' | 'on' | 'off';
}

export interface BluetoothControlConfig {
    mode: 'toggle' | 'on' | 'off';
}



export interface GlobalActionConfig {
    action: 'home' | 'back' | 'recents' | 'notifications' | 'quick_settings' | 'power_dialog' | 'lock_screen' | 'screenshot';
}

export interface MediaControlConfig {
    action: 'play_pause' | 'next' | 'previous' | 'volume_up' | 'volume_down';
}

// Calendar Configs
export interface CalendarReadConfig {
    type: 'next' | 'today' | 'week';
    variableName: string;
    maxEvents?: number;
    calendarName?: string;
    calendarSource?: string;
}

export interface CalendarCreateConfig {
    title: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
    location?: string;
    calendarName?: string; // Optional: specify calendar by name
    calendarSource?: string; // Optional: specify source (Google, iCloud, etc.)
}

// Location Config
export interface LocationGetConfig {
    variableName: string;
    accuracy?: 'low' | 'medium' | 'high';
}

export interface GeofenceCreateConfig {
    identifier: string;
    name: string; // Display name for the geofence
    latitude: number;
    longitude: number;
    radius: number; // meters
    type?: 'circular' | 'polygon'; // Future support
    coordinates?: [number, number][]; // For polygon type
    transition?: 'enter' | 'exit' | 'both'; // What to monitor
}

export interface GeofenceEnterConfig {
    geofenceId: string;
    variableName?: string; // Store location data
    debounceTime?: number; // ms to prevent multiple triggers
}

export interface GeofenceExitConfig {
    geofenceId: string;
    variableName?: string;
    debounceTime?: number;
}

export interface GeofenceTriggerConfig {
    latitude: number;
    longitude: number;
    radius: number;
    variableName?: string;
}

export interface DeepLinkTriggerConfig {
    path: string; // e.g. "run/my-workflow" -> brevi://run/my-workflow
    parameterName?: string; // e.g. "id" -> resolves ?id=123
}

// State Configs
export interface BatteryCheckConfig {
    variableName: string;
    checkCharging?: boolean;
}

export interface NetworkCheckConfig {
    variableName: string;
    checkType: 'wifi' | 'cellular' | 'any';
}

// Audio Configs
export interface VolumeControlConfig {
    level: number; // 0-100
    type: 'media' | 'ring' | 'alarm';
}

export interface SpeakTextConfig {
    text: string;
    language?: string;
    pitch?: number;
    rate?: number;
}

export interface AudioRecordConfig {
    duration: number; // Max duration in seconds
    variableName: string;
}

export interface SpeechToTextConfig {
    language?: string;
    variableName: string;
    continuous?: boolean;
    requiresOnDeviceRecognition?: boolean;
}

// Web / Translation
export interface GoogleTranslateConfig {
    text: string;
    sourceLanguage: string; // 'auto' or 'en', 'tr'
    targetLanguage: string;
    variableName: string;
    apiKey?: string; // Optional API Key for official Google Cloud Translation API
}

export interface WebAutomationConfig {
    url: string;
    userAgent?: string;
    mode?: 'script' | 'interactive' | 'smart'; // Default: 'script'
    smartGoal?: string; // Goal for 'smart' mode
    actions: {
        type: 'click' | 'type' | 'wait' | 'scrape' | 'scroll';
        selector?: string; // CSS Selector
        value?: string; // For type or wait (ms)
        variableName?: string; // For scrape result
        description?: string;
    }[];
    headless?: boolean; // Run without showing (if platform supports)
    variableName?: string; // Result summary
    interactive?: boolean; // Legacy: Maps to mode='interactive'
}

export interface FacebookLoginConfig {
    variableName: string;
    permissions?: string[];
}

export interface TelegramSendConfig {
    botToken?: string; // Optional (can use settings)
    chatId: string;
    message?: string; // Caption for media
    text?: string;    // Alternative for message (compatibility)
    operation?: 'sendMessage' | 'sendPhoto' | 'sendDocument' | 'sendLocation';
    filePath?: string; // For Photo/Document
    latitude?: number; // For Location
    longitude?: number; // For Location
    parseMode?: 'Markdown' | 'HTML';
}

export interface SlackSendConfig {
    webhookUrl: string;
    message: string;
}

export interface DiscordSendConfig {
    webhookUrl: string;
    message: string;
    username?: string; // Custom bot name
    avatarUrl?: string; // Custom avatar URL
    embeds?: string; // JSON array of embed objects
}

export interface NotionCreateConfig {
    apiKey: string;
    databaseId: string;
    properties: string; // JSON object of properties
    content?: string; // Page content (markdown)
    variableName: string;
}

export interface NotionReadConfig {
    apiKey: string;
    databaseId: string;
    filter?: string; // JSON filter object
    sorts?: string; // JSON sorts array
    pageSize?: number;
    variableName: string;
}

export interface PhilipsHueConfig {
    bridgeIp: string; // Hue Bridge IP address (e.g., "192.168.1.100")
    apiKey: string; // Hue API key (username from bridge)
    action: 'on' | 'off' | 'toggle' | 'brightness' | 'color' | 'scene';
    lightId?: string; // Specific light ID or "all" for all lights
    groupId?: string; // Group ID for room control
    brightness?: number; // 0-254
    hue?: number; // 0-65535 (color hue)
    saturation?: number; // 0-254
    sceneId?: string; // Scene ID to activate
    variableName?: string; // Store result
}

export interface RememberInfoConfig {
    key: string;
    value: string;
}

export interface InstagramPostConfig {
    imageUrl: string; // Variable or URL
    caption: string;
    accessTokenVariable: string; // Variable containing the FB Access Token
}

export interface SearchMemoryConfig {
    query: string;
    threshold?: number;
    variableName: string;
}

export interface AddToMemoryConfig {
    text: string;
    metadata?: string; // JSON string
    variableName?: string;
}

export interface BulkAddToMemoryConfig {
    data: string; // Variable name containing array of objects (from Sheets)
    contractColumn?: number;
    phoneColumn?: number;
    debtColumn?: number;
    nameColumn?: number;
    variableName?: string;
}

export interface ClearMemoryConfig {
    confirm?: boolean;
}

export interface SwitchConfig {
    variableName: string; // The variable to check
    cases: {
        value: string;
        portId: string; // e.g., 'case_1', 'case_2'
    }[];
    defaultPortId?: string;
}

export interface WhatsAppSendConfig {
    phoneNumber: string;
    message: string;
    mediaPath?: string; // URI of image/video
    variableName?: string; // Optional: output status
    mode?: 'direct' | 'cloud_api' | 'backend'; // 'direct' = accessibility, 'cloud_api' = Meta API, 'backend' = whatsapp-web.js
    cloudApiToken?: string; // Cloud API access token
    phoneNumberId?: string; // Cloud API phone number ID
    templateName?: string; // Template message name (optional, for cloud_api)
    templateLanguage?: string; // Template language code (default: tr)
    backendUrl?: string; // WhatsApp backend service URL (default: http://localhost:3001)
    backendAuthKey?: string; // Backend auth key
}

// Communication Configs
export interface SmsSendConfig {
    phoneNumber: string;
    message: string;
}

export interface EmailSendConfig {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    isAuto?: boolean;
    attachments?: string[]; // Array of file URIs
}

// Web Config
export interface HttpRequestConfig {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
    headers?: string;
    body?: string;
    variableName: string;
    userAgent?: string;
    timeout?: number;
    queryParameters?: Record<string, string>;
    authentication?: {
        type: 'basic' | 'bearer' | 'none';
        username?: string;
        password?: string;
        token?: string;
    };
    options?: {
        timeout?: number;
    };
}

export interface OpenUrlConfig {
    url: string;
    openExternal?: boolean; // Force external browser/app
}

export interface RssReadConfig {
    url: string;
    limit?: number;
    variableName: string;
}

export interface HtmlExtractConfig {
    htmlSource: string; // The HTML content to parse (e.g. {{apiResponse.data}})
    variableName: string; // The variable to store the result in
    extracts: {
        key: string; // Property name in the output object
        selector: string; // CSS selector
        valueType: 'text' | 'html' | 'attr' | 'value'; // What to extract
        attribute?: string; // If valueType is 'attr', which attribute?
        returnArray?: boolean; // If multiple matches, return array?
    }[];
}

// File Configs
export interface FileWriteConfig {
    filename: string;
    content: string;
    append?: boolean;
    saveLocation?: 'local' | 'google_drive';
}

export interface FileReadConfig {
    filename: string;
    variableName: string;
}

// PDF Config
export interface PdfCreateConfig {
    items: string; // Variable name containing text, html, or array of image URIs
    filename?: string;
    variableName: string; // Store PDF URI
}

export interface FilePickConfig {
    allowedTypes: ('image' | 'document' | 'pdf' | 'all')[];
    multiple?: boolean;
    variableName: string;
}

// Alarm Config
export interface AlarmSetConfig {
    hour: number;
    minute: number;
    message?: string;
}

// AI Config
export interface AgentAIConfig {
    prompt: string;
    provider: 'gemini' | 'openai' | 'claude' | 'custom';
    apiKey?: string; // Optional (loaded from settings)
    model: string;
    temperature?: number;
    maxTokens?: number;
    variableName: string;
    attachments?: string; // Variable name containing image URIs or base64 data
    outputFormat?: 'text' | 'json'; // Explicitly request JSON output
    memoryKey?: string; // Unique key to store chat history (e.g., 'chat_english_tutor')
    systemPrompt?: string; // Optional override for system prompt
    tools?: string[]; // Optional list of allowed tools
}

// Backend Service Configs
export interface CronCreateConfig {
    name: string;
    schedule: string; // Cron syntax or human readable
    actionType: 'log' | 'webhook' | 'workflow';
    actionPayload: string; // JSON string
    variableName?: string;
}

export interface BrowserScrapeConfig {
    url: string;
    waitForSelector?: string;
    variableName: string;
}

// Google Configs
export interface GmailSendConfig {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
    variableName: string;
    clientId?: string; // BYOK
    email?: string; // App Password Auth
    password?: string; // App Password Auth
}

export interface GmailReadConfig {
    maxResults: number;
    query?: string; // e.g. "is:unread label:work"
    variableName: string;
    clientId?: string; // BYOK
    email?: string; // App Password Auth
    password?: string; // App Password Auth
}

export interface OutlookSendConfig {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
    variableName: string;
    clientId?: string; // BYOK
    tenantId?: string; // Optional (default common)
    email?: string; // App Password Auth
    password?: string; // App Password Auth
}

export interface OutlookReadConfig {
    folderName: string; // 'Inbox', 'Drafts', etc.
    maxResults: number;
    unreadOnly?: boolean; // Filter unread
    variableName: string;
    clientId?: string; // BYOK
    tenantId?: string; // Optional (default common)
    email?: string; // App Password Auth
    password?: string; // App Password Auth
}

export interface ExcelReadConfig {
    fileId?: string; // Optional
    fileName?: string; // Name of file in OneDrive root or path
    range: string; // 'Sheet1!A1:B10'
    variableName: string;
}

export interface ExcelWriteConfig {
    fileId?: string;
    fileName?: string;
    range: string;
    values: string; // JSON array of arrays
    variableName: string;
}

export interface OneDriveUploadConfig {
    filePath: string;      // File variable or path to upload
    fileName?: string;     // Target name in OneDrive
    folderId?: string;     // Target folder ID (empty = root)
    variableName?: string;
}

export interface OneDriveDownloadConfig {
    fileId?: string;       // File ID
    fileName?: string;     // Or search by file name
    variableName?: string;
}

export interface OneDriveListConfig {
    folderId?: string;     // Folder ID (empty = root)
    maxResults?: number;
    variableName?: string;
}

export interface GoogleSheetsReadConfig {
    spreadsheetId: string;
    range: string;
    includeGridData?: boolean;
    variableName: string;
}

export interface GoogleSheetsWriteConfig {
    spreadsheetId: string;
    range: string;
    values: string;
    append?: boolean;
}

export interface GoogleDriveUploadConfig {
    filePath: string;
    fileName: string;
    mimeType?: string;
    folderId?: string;
    description?: string;
    convert?: boolean; // Convert to Google Docs format
    variableName: string;
}

// Sensor Configs
export interface LightSensorConfig {
    variableName: string;
}

export interface PedometerConfig {
    variableName: string; // returns { steps, distance }
    startDate?: 'today' | 'last24h';
}

export interface MagnetometerConfig {
    variableName: string; // returns heading in degrees (0-360)
}

export interface BarometerConfig {
    variableName: string; // returns { pressure, relativeAltitude }
}

// Gesture Config
export interface GestureTriggerConfig {
    gesture: 'shake' | 'flip' | 'chop' | 'double_tap';
    sensitivity: 'low' | 'medium' | 'high';
}

// Overlay Configs
export interface ShowOverlayConfig {
    text: string;
    showAs: 'bot' | 'user'; // Default 'bot'
}

export interface OverlayInputConfig {
    placeholder?: string;
    variableName: string;
}

// Step Trigger Config
export interface StepTriggerConfig {
    targetSteps: number;           // Target step count (e.g., 10000)
    comparison: 'gte' | 'eq';      // Greater than or equal, or exact
    resetDaily: boolean;           // Reset counter daily
    variableName?: string;         // Variable to store current steps
}

export interface NavigateToConfig {
    destination: string; // Address or coordinates (lat,lng)
    app?: 'google' | 'apple' | 'yandex' | 'waze'; // Optional app preference
    mode?: 'driving' | 'walking' | 'transit' | 'bicycling';
}

export interface SettingsOpenConfig {
    setting: 'wifi' | 'bluetooth' | 'location' | 'settings' | 'airplane_mode';
}

export interface CameraCaptureConfig {
    variableName: string; // Stores image URI
    textVariableName?: string; // Stores OCR text (if enableOcr is true)
    quality?: 'low' | 'medium' | 'high'; // Default: medium
    cameraType?: 'back' | 'front'; // Default: back
    enableOcr?: boolean; // If true, extracts text using Gemini Vision
}

export interface DatabaseReadConfig {
    tableName: string;
    filterKey?: string;
    filterValue?: string; // If empty, fetch all
    variableName: string;
}

export interface DatabaseWriteConfig {
    tableName: string;
    operation: 'insert' | 'update' | 'delete';
    filterKey?: string; // Needed for update/delete
    filterValue?: string; // Needed for update/delete
    data?: string; // JSON string for insert/update
    variableName?: string; // Returns success/id
}

export type NodeConfig =
    | ManualTriggerConfig
    | TimeTriggerConfig
    | ManualTriggerConfig
    | TimeTriggerConfig
    | NotificationTriggerConfig
    | EmailTriggerConfig
    | TelegramTriggerConfig
    | DelayConfig
    | DelayConfig
    | IfElseConfig
    | VariableConfig
    | LoopConfig
    | TextInputConfig
    | ClipboardReaderConfig
    | NotificationConfig
    | ShareSheetConfig
    | SoundModeConfig
    | ScreenWakeConfig
    | AppLaunchConfig
    | DNDControlConfig
    | BrightnessControlConfig
    | FlashlightControlConfig
    | GlobalActionConfig
    | MediaControlConfig
    | CalendarReadConfig
    | CalendarCreateConfig
    | LocationGetConfig
    | BatteryCheckConfig
    | NetworkCheckConfig
    | VolumeControlConfig
    | SpeakTextConfig
    | AudioRecordConfig
    | SpeechToTextConfig
    | SmsSendConfig
    | EmailSendConfig
    | HttpRequestConfig
    | OpenUrlConfig
    | RssReadConfig
    | FileWriteConfig
    | FileReadConfig
    | PdfCreateConfig
    | AlarmSetConfig
    | AgentAIConfig
    | ImageGeneratorConfig
    | ShowTextConfig
    | ShowImageConfig
    | ShowMenuConfig
    | FilePickConfig
    | GmailSendConfig
    | GmailReadConfig
    | OutlookSendConfig
    | OutlookReadConfig
    | ExcelReadConfig
    | ExcelWriteConfig
    | GoogleSheetsReadConfig
    | GoogleSheetsWriteConfig
    | GoogleDriveUploadConfig
    | LightSensorConfig
    | PedometerConfig
    | MagnetometerConfig
    | BarometerConfig
    | GestureTriggerConfig
    | CallTriggerConfig
    | GoogleTranslateConfig
    | TelegramSendConfig
    | SlackSendConfig
    | WhatsAppSendConfig
    | SwitchConfig
    | ContactsReadConfig
    | ContactsWriteConfig
    | CalendarUpdateConfig
    | CalendarDeleteConfig
    | NavigateToConfig
    | SettingsOpenConfig
    | DatabaseReadConfig
    | DatabaseWriteConfig
    | ImageEditConfig
    | ViewDocumentConfig
    | FacebookLoginConfig
    | InstagramPostConfig
    | GeofenceCreateConfig
    | OneDriveUploadConfig
    | OneDriveDownloadConfig
    | OneDriveListConfig
    | CodeExecutionConfig
    | WebAutomationConfig
    | SearchMemoryConfig
    | AddToMemoryConfig
    | BulkAddToMemoryConfig
    | ClearMemoryConfig
    | RememberInfoConfig
    | HtmlExtractConfig;

export interface CodeExecutionConfig {
    code: string;
    variableName: string;
}

export interface ContactsReadConfig {
    query?: string; // Search by name
    fetchAll?: boolean;
    variableName?: string;
}

export interface ContactsWriteConfig {
    firstName: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
    company?: string;
    variableName?: string; // Returns contact ID
}

export interface CalendarUpdateConfig {
    eventId: string; // ID of event to update
    title?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
    location?: string;
    calendarName?: string; // Optional calendar target
    variableName?: string;
}

export interface CalendarDeleteConfig {
    eventId: string;
    calendarName?: string;
    variableName?: string;
}



export interface SetValuesConfig {
    values: {
        name: string; // Variable name
        value: string; // Value (supports {{variables}})
        type: 'string' | 'number' | 'boolean' | 'json';
    }[];
    mode?: 'append' | 'override'; // Default override
}

export interface SplitBatchesConfig {
    sourceArray: string; // Variable name of array to split
    batchSize: number;
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW NODES & EDGES
// ═══════════════════════════════════════════════════════════════

export interface NodePosition {
    x: number;
    y: number;
}

export interface WorkflowNode {
    id: string;
    type: NodeType;
    label: string;
    config: NodeConfig;
    position: NodePosition;
}

export type EdgePort = 'default' | 'true' | 'false' | 'error' | 'loop' | 'done' | 'case_1' | 'case_2' | 'case_3' | 'case_4';

export interface WorkflowEdge {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourcePort: EdgePort;
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW
// ═══════════════════════════════════════════════════════════════

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastRun?: string;
    runCount: number;
}

// ═══════════════════════════════════════════════════════════════
// EXECUTION
// ═══════════════════════════════════════════════════════════════

export interface ExecutionContext {
    variables: Map<string, any>;
    currentNodeId: string | null;
    executionPath: string[]; // Node IDs in order of execution
    startTime: number;
    isCancelled: boolean;
}

export interface NodeExecutionResult {
    nodeId: string;
    success: boolean;
    output?: any;
    error?: string;
    duration: number; // ms
    nextPort?: EdgePort; // Which port to follow for next node
}

export interface WorkflowExecutionResult {
    workflowId: string;
    success: boolean;
    nodeResults: NodeExecutionResult[];
    totalDuration: number;
    error?: string;
}

export interface ExecutionState {
    isExecuting: boolean;
    isPaused: boolean;
    currentNodeId: string | null;
    currentNodeLabel: string;
    progress: number; // 0-100
    canCancel: boolean;
    canPause: boolean;
}

export type ExecutionCallback = (state: ExecutionState) => void;

// ═══════════════════════════════════════════════════════════════
// NODE METADATA (for UI)
// ═══════════════════════════════════════════════════════════════

export interface NodeMetadata {
    type: NodeType;
    category: NodeCategory;
    name: string;
    description: string;
    icon: string;
    color: string;
    hasInputPort: boolean;
    outputPorts: EdgePort[];
    isTrigger?: boolean;
}

export const NODE_REGISTRY: Record<NodeType, NodeMetadata> = {
    // Triggers
    MANUAL_TRIGGER: {
        type: 'MANUAL_TRIGGER',
        category: 'trigger',
        name: 'Manuel Başlat',
        description: 'Kullanıcı elle başlatır',
        icon: 'play',
        color: '#10B981',
        hasInputPort: false,
        outputPorts: ['default'],
    },
    TIME_TRIGGER: {
        type: 'TIME_TRIGGER',
        category: 'trigger',
        name: 'Zamanlı Başlat',
        description: 'Belirli saatte otomatik başlar',
        icon: 'alarm',
        color: '#10B981',
        hasInputPort: false,
        outputPorts: ['default'],
    },
    NOTIFICATION_TRIGGER: {
        type: 'NOTIFICATION_TRIGGER',
        category: 'trigger',
        name: 'Bildirim Yakalayıcı',
        description: 'Uygulama bildirimleriyle tetiklenir (WhatsApp vb.)',
        icon: 'notifications',
        color: '#10B981',
        hasInputPort: false,
        outputPorts: ['default'],
    },
    EMAIL_TRIGGER: {
        type: 'EMAIL_TRIGGER',
        category: 'trigger',
        name: 'E-posta Tetikleyici',
        description: 'Gelen e-postaları yakalar (Gmail)',
        icon: 'mail',
        color: '#EA4335',
        hasInputPort: false,
        outputPorts: ['default'],
    },
    TELEGRAM_TRIGGER: {
        type: 'TELEGRAM_TRIGGER',
        category: 'trigger',
        name: 'Telegram Tetikleyici',
        description: 'Gelen mesajları yakalar',
        icon: 'paper-plane',
        color: '#229ED9',
        hasInputPort: false,
        outputPorts: ['default'],
    },
    CHAT_INPUT_TRIGGER: {
        type: 'CHAT_INPUT_TRIGGER',
        category: 'trigger',
        name: 'Metin Girişi ile Başlat',
        description: 'Kullanıcı metin girince workflow başlar',
        icon: 'chatbox-ellipses',
        color: '#8B5CF6',
        hasInputPort: false,
        outputPorts: ['default'],
    },

    // Control
    DELAY: {
        type: 'DELAY',
        category: 'control',
        name: 'Bekle',
        description: 'Belirli süre bekler',
        icon: 'hourglass',
        color: '#6366F1',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    IF_ELSE: {
        type: 'IF_ELSE',
        category: 'control',
        name: 'Koşul',
        description: 'Koşula göre dallanır',
        icon: 'git-branch',
        color: '#6366F1',
        hasInputPort: true,
        outputPorts: ['true', 'false'],
    },
    VARIABLE: {
        type: 'VARIABLE',
        category: 'control',
        name: 'Değişken',
        description: 'Veri okur/yazar',
        icon: 'cube',
        color: '#6366F1',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    CODE_EXECUTION: {
        type: 'CODE_EXECUTION',
        category: 'processing',
        name: 'Kod Çalıştır',
        description: 'JavaScript kodu çalıştır',
        icon: 'code-slash',
        color: '#F97316', // Orange
        hasInputPort: true,
        outputPorts: ['default'],
    },
    DYNAMIC_EXECUTOR: {
        type: 'DYNAMIC_EXECUTOR',
        category: 'processing',
        name: 'Dinamik İşlemci',
        description: 'AI çıktılarını işler',
        icon: 'construct',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SET_VALUES: {
        type: 'SET_VALUES',
        category: 'processing',
        name: 'Değer Ata',
        description: 'Değişkenleri düzenle',
        icon: 'pencil',
        color: '#F97316',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SPLIT_BATCHES: {
        type: 'SPLIT_BATCHES',
        category: 'control',
        name: 'Parçalara Ayır',
        description: 'Listeyi gruplar halinde işle',
        icon: 'layers',
        color: '#6366F1', // Indigo
        hasInputPort: true,
        outputPorts: ['loop', 'done'],
    },
    LOOP: {
        type: 'LOOP',
        category: 'control',
        name: 'Döngü',
        description: 'Tekrar eder',
        icon: 'repeat',
        color: '#6366F1',
        hasInputPort: true,
        outputPorts: ['loop', 'done'],
    },
    VIEW_UDF: {
        type: 'VIEW_UDF',
        category: 'files',
        name: 'UDF Görüntüleyici (UYAP)',
        description: 'UYAP (.udf) dosyalarını görüntüler',
        icon: 'briefcase',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    VIEW_DOCUMENT: {
        type: 'VIEW_DOCUMENT',
        category: 'files',
        name: 'Belge Görüntüleyici',
        description: 'PDF, Word, Metin ve Markdown dosyalarını görüntüler',
        icon: 'document-text',
        color: '#3B82F6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Input
    TEXT_INPUT: {
        type: 'TEXT_INPUT',
        category: 'input',
        name: 'Metin Girişi',
        description: 'Kullanıcıdan metin alır',
        icon: 'create',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    CLIPBOARD_READER: {
        type: 'CLIPBOARD_READER',
        category: 'input',
        name: 'Pano Oku',
        description: 'Panodan metin okur',
        icon: 'clipboard',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SHOW_MENU: {
        type: 'SHOW_MENU',
        category: 'input',
        name: 'Menü Göster',
        description: 'Seçenekli menü açar',
        icon: 'list', // Using ionicons name
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Output
    NOTIFICATION: {
        type: 'NOTIFICATION',
        category: 'output',
        name: 'Bildirim',
        description: 'Bildirim gösterir',
        icon: 'notifications-outline',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SHARE_SHEET: {
        type: 'SHARE_SHEET',
        category: 'output',
        name: 'Paylaş',
        description: 'Paylaşım menüsü açar',
        icon: 'share-social',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SHOW_TEXT: {
        type: 'SHOW_TEXT',
        category: 'output',
        name: 'Metin Göster',
        description: 'Metni ekranda gösterir',
        icon: 'text',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SHOW_IMAGE: {
        type: 'SHOW_IMAGE',
        category: 'output',
        name: 'Resim Göster',
        description: 'Resmi ekranda gösterir',
        icon: 'image',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Device
    SOUND_MODE: {
        type: 'SOUND_MODE',
        category: 'device',
        name: 'Ses Modu',
        description: 'Sessiz/Normal mod',
        icon: 'volume-high',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SCREEN_WAKE: {
        type: 'SCREEN_WAKE',
        category: 'device',
        name: 'Ekran Kontrolü',
        description: 'Ekranı açık tutar',
        icon: 'sunny',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    APP_LAUNCH: {
        type: 'APP_LAUNCH',
        category: 'device',
        name: 'Uygulama Aç',
        description: 'Uygulama başlatır',
        icon: 'apps',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    DND_CONTROL: {
        type: 'DND_CONTROL',
        category: 'device',
        name: 'Rahatsız Etmeyin',
        description: 'DND açar/kapatır',
        icon: 'moon',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    BRIGHTNESS_CONTROL: {
        type: 'BRIGHTNESS_CONTROL',
        category: 'device',
        name: 'Parlaklık',
        description: 'Ekran parlaklığını ayarlar',
        icon: 'sunny-outline',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Contacts
    CONTACTS_READ: {
        type: 'CONTACTS_READ',
        category: 'input',
        name: 'Kişi Bul',
        description: 'Rehberden kişi arar',
        icon: 'people',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    CONTACTS_WRITE: {
        type: 'CONTACTS_WRITE',
        category: 'device',
        name: 'Kişi Ekle',
        description: 'Rehbere kişi ekler',
        icon: 'person-add',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Calendar Advanced
    CALENDAR_UPDATE: {
        type: 'CALENDAR_UPDATE',
        category: 'calendar',
        name: 'Takvim Güncelle',
        description: 'Etkinliği günceller',
        icon: 'create-outline',
        color: '#3B82F6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    CALENDAR_DELETE: {
        type: 'CALENDAR_DELETE',
        category: 'calendar',
        name: 'Etkinlik Sil',
        description: 'Takvimden etkinlik siler',
        icon: 'trash',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Navigation
    NAVIGATE_TO: {
        type: 'NAVIGATE_TO',
        category: 'location',
        name: 'Navigasyon',
        description: 'Harita/Navigasyon açar',
        icon: 'navigate',
        color: '#3B82F6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Settings
    SETTINGS_OPEN: {
        type: 'SETTINGS_OPEN',
        category: 'device',
        name: 'Ayarları Aç',
        description: 'Sistem ayarlarını açar',
        icon: 'settings',
        color: '#64748B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Database
    DB_READ: {
        type: 'DB_READ',
        category: 'data',
        name: 'Veri Oku (DB)',
        description: 'Yerel veritabanından okur',
        icon: 'server',
        color: '#10B981',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    DB_WRITE: {
        type: 'DB_WRITE',
        category: 'data',
        name: 'Veri Yaz (DB)',
        description: 'Yerel veritabanına yazar',
        icon: 'server-outline',
        color: '#059669',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    FLASHLIGHT_CONTROL: {
        type: 'FLASHLIGHT_CONTROL',
        category: 'device',
        name: 'Flaş',
        description: 'Flaşı aç/kapa',
        icon: 'flashlight',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    GLOBAL_ACTION: {
        type: 'GLOBAL_ACTION',
        category: 'device',
        name: 'Sistem Aksiyonu',
        description: 'Geri, Ana Ekran vb.',
        icon: 'phone-portrait',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    MEDIA_CONTROL: {
        type: 'MEDIA_CONTROL',
        category: 'device',
        name: 'Medya Kontrolü',
        description: 'Oynat/Durdur/Geç',
        icon: 'musical-note',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Calendar
    CALENDAR_READ: {
        type: 'CALENDAR_READ',
        category: 'calendar',
        name: 'Takvim Oku',
        description: 'Takvimden etkinlik okur',
        icon: 'calendar-number',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    CALENDAR_CREATE: {
        type: 'CALENDAR_CREATE',
        category: 'calendar',
        name: 'Etkinlik Oluştur',
        description: 'Takvime etkinlik ekler',
        icon: 'calendar',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Location
    LOCATION_GET: {
        type: 'LOCATION_GET',
        category: 'location',
        name: 'Konum Al',
        description: 'Mevcut konumu alır',
        icon: 'location',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    GEOFENCE_CREATE: {
        type: 'GEOFENCE_CREATE',
        category: 'location',
        name: 'Coğrafi Sınır Oluştur',
        description: 'Konum tabanlı tetikleme alanı oluşturur',
        icon: 'radio-outline',
        color: '#10B981',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    GEOFENCE_ENTER_TRIGGER: {
        type: 'GEOFENCE_ENTER_TRIGGER',
        category: 'trigger',
        name: 'Coğrafi Sınıra Girme',
        description: 'Belirtilen alana girildiğinde tetiklenir',
        icon: 'log-in-outline',
        color: '#10B981',
        hasInputPort: false,
        outputPorts: ['default'],
        isTrigger: true,
    },
    GEOFENCE_EXIT_TRIGGER: {
        type: 'GEOFENCE_EXIT_TRIGGER',
        category: 'trigger',
        name: 'Coğrafi Sınırdan Çıkma',
        description: 'Belirtilen alandan çıkıldığında tetiklenir',
        icon: 'log-out-outline',
        color: '#EF4444',
        hasInputPort: false,
        outputPorts: ['default'],
        isTrigger: true,
    },
    WEATHER_GET: {
        type: 'WEATHER_GET',
        category: 'location',
        name: 'Hava Durumu',
        description: 'OpenWeatherMap API ile hava durumu bilgisi alır',
        icon: 'partly-sunny',
        color: '#06B6D4',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    DEEP_LINK_TRIGGER: {
        type: 'DEEP_LINK_TRIGGER',
        category: 'trigger',
        name: 'Deep Link',
        description: 'Link ile Tetikle',
        icon: 'link',
        color: '#EF4444',
        hasInputPort: false,
        outputPorts: ['default'],
        isTrigger: true,
    },
    // State
    BATTERY_CHECK: {
        type: 'BATTERY_CHECK',
        category: 'input',
        name: 'Batarya Kontrol',
        description: 'Batarya seviyesini kontrol eder',
        icon: 'battery-charging',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    NETWORK_CHECK: {
        type: 'NETWORK_CHECK',
        category: 'input',
        name: 'Ağ Kontrol',
        description: 'İnternet bağlantısını kontrol eder',
        icon: 'wifi',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Audio
    VOLUME_CONTROL: {
        type: 'VOLUME_CONTROL',
        category: 'audio',
        name: 'Ses Seviyesi',
        description: 'Ses seviyesini ayarlar',
        icon: 'volume-medium',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SPEAK_TEXT: {
        type: 'SPEAK_TEXT',
        category: 'audio',
        name: 'Sesli Oku',
        description: 'Metni sesli okur',
        icon: 'mic-outline',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    AUDIO_RECORD: {
        type: 'AUDIO_RECORD',
        category: 'audio',
        name: 'Ses Kaydet',
        description: 'Ses kaydı alır',
        icon: 'mic',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SPEECH_TO_TEXT: {
        type: 'SPEECH_TO_TEXT',
        category: 'audio',
        name: 'Sesi Yazıya Çevir',
        description: 'Konuşmayı metne çevirir',
        icon: 'mic-circle',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Communication
    SMS_SEND: {
        type: 'SMS_SEND',
        category: 'communication',
        name: 'SMS Gönder',
        description: 'SMS mesajı gönderir',
        icon: 'chatbox',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    EMAIL_SEND: {
        type: 'EMAIL_SEND',
        category: 'communication',
        name: 'E-posta Gönder',
        description: 'E-posta gönderir',
        icon: 'mail',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },

    // Web
    // Web
    HTTP_REQUEST: {
        type: 'HTTP_REQUEST',
        category: 'web',
        name: 'HTTP İsteği',
        description: 'Web API çağrısı yapar',
        icon: 'cloud-upload',
        color: '#10B981',
        hasInputPort: true,
        outputPorts: ['default', 'error'],
    },
    OPEN_URL: {
        type: 'OPEN_URL',
        category: 'web',
        name: 'Tarayıcı Aç',
        description: 'Linki tarayıcıda açar',
        icon: 'open',
        color: '#10B981',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    RSS_READ: {
        type: 'RSS_READ',
        category: 'web',
        name: 'RSS Okuyucu',
        description: 'Haber/RSS beslemesini okur',
        icon: 'radio',
        color: '#FFA500', // Orange
        hasInputPort: true,
        outputPorts: ['default'],
    },
    WEB_SEARCH: {
        type: 'WEB_SEARCH',
        category: 'web',
        name: 'Web Araması',
        description: 'İnternette arama yapar',
        icon: 'search',
        color: '#10B981',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    WEB_AUTOMATION: {
        type: 'WEB_AUTOMATION',
        category: 'web',
        name: 'Web Otomasyon',
        description: 'Web sitesi üzerinde işlemler yapar (Tıkla, Yaz, Kaydır)',
        icon: 'globe',
        color: '#06B6D4',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    FACEBOOK_LOGIN: {
        type: 'FACEBOOK_LOGIN',
        category: 'social', // Changed to social
        name: 'Facebook Giriş',
        description: 'Facebook ile giriş yapıp Token alır',
        icon: 'logo-facebook',
        color: '#1877F2',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    INSTAGRAM_POST: {
        type: 'INSTAGRAM_POST',
        category: 'social',
        name: 'Instagram Post',
        description: 'Fotoğraf paylaş (Business)',
        icon: 'logo-instagram',
        color: '#E1306C',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Files
    FILE_WRITE: {
        type: 'FILE_WRITE',
        category: 'files',
        name: 'Dosyaya Yaz',
        description: 'Dosyaya içerik yazar',
        icon: 'save',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    FILE_READ: {
        type: 'FILE_READ',
        category: 'files',
        name: 'Dosya Oku',
        description: 'Dosyadan içerik okur',
        icon: 'document',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    PDF_CREATE: {
        type: 'PDF_CREATE',
        category: 'files',
        name: 'PDF Oluştur',
        description: 'PDF dosyası oluşturur',
        icon: 'document-attach',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    FILE_PICK: {
        type: 'FILE_PICK',
        category: 'files',
        name: 'Dosya Seç',
        description: 'Dosya veya resim seçer',
        icon: 'folder-open',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    HTML_EXTRACT: {
        type: 'HTML_EXTRACT',
        category: 'web',
        name: 'HTML Ayıklayıcı',
        description: 'HTML içeriğinden veri çeker (CSS Selector)',
        icon: 'code-slash',
        color: '#E34F26',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Alarm
    ALARM_SET: {
        type: 'ALARM_SET',
        category: 'device',
        name: 'Alarm Kur',
        description: 'Alarm kurar',
        icon: 'alarm-outline',
        color: '#EF4444',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // AI
    AGENT_AI: {
        type: 'AGENT_AI',
        category: 'ai',
        name: 'AI Agent',
        description: 'LLM ile işlem yapar',
        icon: 'sparkles',
        color: '#10B981',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    IMAGE_GENERATOR: {
        type: 'IMAGE_GENERATOR',
        category: 'ai',
        name: 'Nanobana (Resim)',
        description: 'Metinden görsel üretir',
        icon: 'color-palette',
        color: '#EC4899',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    IMAGE_EDIT: {
        type: 'IMAGE_EDIT',
        category: 'processing',
        name: 'Resim Düzenle',
        description: 'Kırp, Boyutlandır, Çevir',
        icon: 'crop',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Google
    GMAIL_SEND: {
        type: 'GMAIL_SEND',
        category: 'google',
        name: 'Gmail Gönder',
        description: 'Gmail ile e-posta gönderir',
        icon: 'mail',
        color: '#EA4335',
        hasInputPort: true,
        outputPorts: ['default'],
    },

    GMAIL_READ: {
        type: 'GMAIL_READ',
        category: 'google',
        name: 'Gmail Oku (BYOK)',
        description: '⚠️ Kendi Client ID\'niz gereklidir. E-postaları okur.',
        icon: 'mail-open',
        color: '#EA4335',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SHEETS_READ: {
        type: 'SHEETS_READ',
        category: 'google',
        name: 'Sheets Oku',
        description: 'Google Sheets\'ten veri okur',
        icon: 'grid-outline',
        color: '#34A853',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SHEETS_WRITE: {
        type: 'SHEETS_WRITE',
        category: 'google',
        name: 'Sheets Yaz',
        description: 'Google Sheets\'e veri yazar',
        icon: 'create-outline',
        color: '#34A853',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    DRIVE_UPLOAD: {
        type: 'DRIVE_UPLOAD',
        category: 'google',
        name: 'Drive Yükle',
        description: 'Google Drive\'a dosya yükler',
        icon: 'cloud-upload-outline',
        color: '#4285F4',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Microsoft
    OUTLOOK_SEND: {
        type: 'OUTLOOK_SEND',
        category: 'microsoft',
        name: 'Outlook Gönder',
        description: 'Outlook ile e-posta gönderir',
        icon: 'mail',
        color: '#0078D4',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    OUTLOOK_READ: {
        type: 'OUTLOOK_READ',
        category: 'microsoft',
        name: 'Outlook Oku',
        description: 'E-postaları okur',
        icon: 'mail-open',
        color: '#0078D4',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    EXCEL_READ: {
        type: 'EXCEL_READ',
        category: 'microsoft',
        name: 'Excel Oku',
        description: 'OneDrive üzerindeki Excel\'den okur',
        icon: 'grid',
        color: '#1D6F42',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    EXCEL_WRITE: {
        type: 'EXCEL_WRITE',
        category: 'microsoft',
        name: 'Excel Yaz',
        description: 'OneDrive üzerindeki Excel\'e yazar',
        icon: 'create',
        color: '#1D6F42',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    ONEDRIVE_UPLOAD: {
        type: 'ONEDRIVE_UPLOAD',
        category: 'microsoft',
        name: 'OneDrive Yükle',
        description: 'OneDrive\'a dosya yükler',
        icon: 'cloud-upload',
        color: '#0078D4',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    ONEDRIVE_DOWNLOAD: {
        type: 'ONEDRIVE_DOWNLOAD',
        category: 'microsoft',
        name: 'OneDrive İndir',
        description: 'OneDrive\'dan dosya indirir',
        icon: 'cloud-download',
        color: '#0078D4',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    ONEDRIVE_LIST: {
        type: 'ONEDRIVE_LIST',
        category: 'microsoft',
        name: 'OneDrive Listele',
        description: 'OneDrive klasör içeriğini listeler',
        icon: 'folder-open',
        color: '#0078D4',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Sensors
    LIGHT_SENSOR: {
        type: 'LIGHT_SENSOR',
        category: 'input',
        name: 'Işık Sensörü',
        description: 'Ortam ışık seviyesini ölçer (Sadece Android)',
        icon: 'sunny-outline',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    PEDOMETER: {
        type: 'PEDOMETER',
        category: 'input',
        name: 'Adımsayar',
        description: 'Adım sayısını ölçer',
        icon: 'walk-outline',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    MAGNETOMETER: {
        type: 'MAGNETOMETER',
        category: 'input',
        name: 'Pusula',
        description: 'Yön bilgisini alır',
        icon: 'compass-outline',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    BAROMETER: {
        type: 'BAROMETER',
        category: 'input',
        name: 'Barometre',
        description: 'Basınç ve yükseklik ölçer',
        icon: 'speedometer-outline',
        color: '#F59E0B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    // Gestures
    GESTURE_TRIGGER: {
        type: 'GESTURE_TRIGGER',
        category: 'trigger',
        name: 'Hareket Algıla',
        description: 'Salla veya çevir',
        icon: 'hand-left-outline',
        color: '#10B981',
        hasInputPort: false,
        outputPorts: ['default'],
        isTrigger: true,
    },
    STEP_TRIGGER: {
        type: 'STEP_TRIGGER',
        category: 'trigger',
        name: 'Adım Sayar Tetikleyici',
        description: 'Belirli adım sayısına ulaşınca tetikle',
        icon: 'footsteps-outline',
        color: '#10B981',
        hasInputPort: false,
        outputPorts: ['default'],
        isTrigger: true,
    },
    // Triggers
    CALL_TRIGGER: {
        type: 'CALL_TRIGGER',
        category: 'trigger',
        name: 'Arama Tetikleyici',
        description: 'Gelen/Giden aramada çalışır',
        icon: 'call-outline',
        color: '#EF4444',
        hasInputPort: false, // Trigger starts flow
        outputPorts: ['default'],
        isTrigger: true,
    },
    SMS_TRIGGER: {
        type: 'SMS_TRIGGER',
        category: 'trigger',
        name: 'SMS Tetikleyici',
        description: 'Gelen SMS mesajında çalışır',
        icon: 'chatbox-outline',
        color: '#F59E0B',
        hasInputPort: false,
        outputPorts: ['default'],
        isTrigger: true,
    },
    WHATSAPP_TRIGGER: {
        type: 'WHATSAPP_TRIGGER',
        category: 'trigger',
        name: 'WhatsApp Tetikleyici',
        description: 'Gelen WhatsApp mesajında çalışır',
        icon: 'logo-whatsapp',
        color: '#25D366',
        hasInputPort: false,
        outputPorts: ['default'],
        isTrigger: true,
    },

    GOOGLE_TRANSLATE: {
        type: 'GOOGLE_TRANSLATE',
        category: 'web',
        name: 'Google Çeviri',
        description: 'Metin çevirir',
        icon: 'language',
        color: '#3B82F6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    TELEGRAM_SEND: {
        type: 'TELEGRAM_SEND',
        category: 'communication',
        name: 'Telegram Mesaj',
        description: 'Bot mesaj atar',
        icon: 'paper-plane',
        color: '#229ED9',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    WHATSAPP_SEND: {
        type: 'WHATSAPP_SEND',
        category: 'communication',
        name: 'WhatsApp Mesaj',
        description: 'WhatsApp mesajı gönderir (Cloud API veya Direkt)',
        icon: 'logo-whatsapp',
        color: '#25D366',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SLACK_SEND: {
        type: 'SLACK_SEND',
        category: 'communication',
        name: 'Slack Mesaj',
        description: 'Webhook mesaj atar',
        icon: 'logo-slack',
        color: '#4A154B',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    DISCORD_SEND: {
        type: 'DISCORD_SEND',
        category: 'communication',
        name: 'Discord Mesaj',
        description: 'Webhook ile mesaj gönderir',
        icon: 'logo-discord',
        color: '#5865F2',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    NOTION_CREATE: {
        type: 'NOTION_CREATE',
        category: 'data',
        name: 'Notion Sayfa Oluştur',
        description: 'Notion veritabanına kayıt ekler',
        icon: 'document-text',
        color: '#000000',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    NOTION_READ: {
        type: 'NOTION_READ',
        category: 'data',
        name: 'Notion Oku',
        description: 'Notion veritabanından veri çeker',
        icon: 'cloud-download',
        color: '#000000',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    PHILIPS_HUE: {
        type: 'PHILIPS_HUE',
        category: 'device',
        name: 'Akıllı Işık (Hue)',
        description: 'Philips Hue lambaları kontrol eder',
        icon: 'bulb',
        color: '#F5A623',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    SWITCH: {
        type: 'SWITCH',
        category: 'control',
        name: 'Switch',
        description: 'Dallanma',
        icon: 'git-network',
        color: '#6366F1',
        hasInputPort: true,
        outputPorts: ['default', 'case_1', 'case_2'],
    },
    BLUETOOTH_CONTROL: {
        type: 'BLUETOOTH_CONTROL',
        category: 'device',
        name: 'Bluetooth Kontrol',
        description: 'Bluetooth açar/kapatır',
        icon: 'bluetooth',
        color: '#3B82F6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    CAMERA_CAPTURE: {
        type: 'CAMERA_CAPTURE',
        category: 'input',
        name: 'Fotoğraf Çek',
        description: 'Kamera ile fotoğraf çeker, isteğe bağlı OCR ile metin çıkarır',
        icon: 'camera',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    REMEMBER_INFO: {
        type: 'REMEMBER_INFO',
        category: 'memory',
        name: 'Bilgi Hatırla',
        description: 'Verilen bilgiyi hafızaya kaydeder',
        icon: 'hardware-chip',
        color: '#9C27B0',
        hasInputPort: true,
        outputPorts: ['default']
    },
    SEARCH_MEMORY: {
        type: 'SEARCH_MEMORY',
        category: 'memory',
        name: 'Hafızadan Ara',
        description: 'Vektör veritabanında semantik arama yapar',
        icon: 'search-circle',
        color: '#9C27B0',
        hasInputPort: true,
        outputPorts: ['default']
    },
    ADD_TO_MEMORY: {
        type: 'ADD_TO_MEMORY',
        category: 'memory',
        name: 'Hafızaya Ekle',
        description: 'Bilgiyi vektör veritabanına ekler',
        icon: 'save',
        color: '#9C27B0',
        hasInputPort: true,
        outputPorts: ['default']
    },
    BULK_ADD_TO_MEMORY: {
        type: 'BULK_ADD_TO_MEMORY',
        category: 'memory',
        name: 'Toplu Hafıza Ekle',
        description: 'Listeyi vektör veritabanına ekler',
        icon: 'layers',
        color: '#9C27B0',
        hasInputPort: true,
        outputPorts: ['default']
    },
    CLEAR_MEMORY: {
        type: 'CLEAR_MEMORY',
        category: 'memory',
        name: 'Hafızayı Temizle',
        description: 'Tüm vektör veritabanını siler',
        icon: 'trash',
        color: '#F44336',
        hasInputPort: true,
        outputPorts: ['default']
    },
    GEOFENCE_TRIGGER: {
        type: 'GEOFENCE_TRIGGER',
        category: 'trigger',
        name: 'Konum Tetikleyici',
        description: 'Belirli bir alana girince/çıkınca çalışır',
        icon: 'location',
        color: '#F44336',
        hasInputPort: false,
        outputPorts: ['default']
    },
    SHOW_OVERLAY: {
        type: 'SHOW_OVERLAY',
        category: 'display',
        name: 'Chat Göster',
        description: 'Floating chat penceresinde mesaj gösterir',
        icon: 'chatbubble',
        color: '#6C63FF',
        hasInputPort: true,
        outputPorts: ['default']
    },
    OVERLAY_INPUT: {
        type: 'OVERLAY_INPUT',
        category: 'input',
        name: 'Chat Input',
        description: 'Floating chat üzerinden kullanıcıdan bilgi ister',
        icon: 'keypad',
        color: '#6C63FF',
        hasInputPort: true,
        outputPorts: ['default']
    },
    OVERLAY_CLEAR: {
        type: 'OVERLAY_CLEAR',
        category: 'display',
        name: 'Chat Temizle',
        description: 'Floating chat geçmişini temizler',
        icon: 'trash-bin',
        color: '#FF5252',
        hasInputPort: true,
        outputPorts: ['default']
    },
    REALTIME_AI: {
        type: 'REALTIME_AI',
        category: 'ai',
        name: 'Gerçek Zamanlı AI',
        description: 'Gemini Live API ile anlık sesli konuşma ve otonom araç kullanımı',
        icon: 'mic-circle',
        color: '#00C853',
        hasInputPort: true,
        outputPorts: ['default']
    },
    // Backend nodes
    BROWSER_SCRAPE: {
        type: 'BROWSER_SCRAPE',
        category: 'web',
        name: 'Web Kazıma',
        description: 'Backend üzerinden web sitesini okur (JS destekli)',
        icon: 'globe',
        color: '#06B6D4',
        hasInputPort: true,
        outputPorts: ['default'],
    },
    CRON_CREATE: {
        type: 'CRON_CREATE',
        category: 'device',
        name: 'Zamanlanmış Görev',
        description: 'Sunucuda periyodik görev oluşturur',
        icon: 'timer',
        color: '#8B5CF6',
        hasInputPort: true,
        outputPorts: ['default'],
    }
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function createNode(type: NodeType, position: NodePosition, config?: Record<string, any>): WorkflowNode {
    const metadata = NODE_REGISTRY[type];
    const defaultConfig = getDefaultConfig(type);
    return {
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        label: metadata.name,
        config: { ...defaultConfig, ...config } as NodeConfig,
        position,
    };
}

function getDefaultConfig(type: NodeType): NodeConfig {
    switch (type) {
        case 'MANUAL_TRIGGER': return { label: '' };
        case 'TIME_TRIGGER': return { hour: 9, minute: 0, repeat: false };
        case 'DELAY': return { duration: 5, unit: 'sec' };
        case 'IF_ELSE': return { left: '', operator: '==', right: '' };
        case 'VARIABLE': return { operation: 'set', name: '', value: '' };
        case 'LOOP': return { type: 'count', count: 3 };
        case 'TEXT_INPUT': return { prompt: 'Değer girin', variableName: 'input' };
        case 'CLIPBOARD_READER': return { variableName: 'clipboard' };
        case 'NOTIFICATION': return { type: 'toast', message: '' };
        case 'SHARE_SHEET': return { content: '' };
        case 'SOUND_MODE': return { mode: 'silent' };
        case 'SCREEN_WAKE': return { keepAwake: true };
        case 'APP_LAUNCH': return { packageName: '' };
        case 'DND_CONTROL': return { enabled: true };
        case 'BRIGHTNESS_CONTROL': return { level: 50 };
        case 'FLASHLIGHT_CONTROL': return { mode: 'toggle' };
        case 'GLOBAL_ACTION': return { action: 'home' };
        case 'MEDIA_CONTROL': return { action: 'play_pause' };
        // New nodes
        case 'CALENDAR_READ': return { type: 'next', variableName: 'events', maxEvents: 5, calendarName: '', calendarSource: '' };
        case 'CALENDAR_CREATE': return { title: '' };
        case 'LOCATION_GET': return { variableName: 'location', accuracy: 'medium' };
        case 'BATTERY_CHECK': return { variableName: 'battery' };
        case 'NETWORK_CHECK': return { variableName: 'network', checkType: 'any' };
        case 'VOLUME_CONTROL': return { level: 50, type: 'media' };
        case 'SPEAK_TEXT': return { text: '' };
        case 'AUDIO_RECORD': return { duration: 10, variableName: 'audioFile' };
        case 'SPEECH_TO_TEXT': return { language: 'tr-TR', variableName: 'transcription', continuous: false };
        case 'SMS_SEND': return { phoneNumber: '', message: '' };
        case 'EMAIL_SEND': return { to: '', subject: '', body: '', isAuto: false };
        case 'HTTP_REQUEST': return { url: '', method: 'GET', variableName: 'response' };
        case 'HTML_EXTRACT': return { htmlSource: '{{response}}', variableName: 'extractedData', extracts: [] };
        case 'OPEN_URL': return { url: 'https://' };
        case 'RSS_READ': return { url: '', limit: 5, variableName: 'rssItems' };
        case 'FILE_WRITE': return { filename: 'note.txt', content: '' };
        case 'FILE_READ': return { filename: '', variableName: 'fileContent' };
        case 'PDF_CREATE': return { items: '', filename: 'document.pdf', variableName: 'pdfUri' };
        case 'FILE_PICK': return { allowedTypes: ['all'], multiple: false, variableName: 'selectedFile' };
        case 'ALARM_SET': return { hour: 8, minute: 0 };
        case 'AGENT_AI': return {
            prompt: '{{previous_output}}',
            provider: 'gemini',
            model: 'gemini-2.0-flash-exp',
            temperature: 0.7,
            maxTokens: 1000,
            variableName: 'aiResponse'
        };
        case 'IMAGE_GENERATOR': return {
            provider: 'pollinations',
            prompt: '{{previous_output}}',
            variableName: 'generatedImage',
            model: 'imagen-3.0-generate-001',
            aspectRatio: '1:1'
        };
        case 'IMAGE_EDIT': return {
            inputImage: '{{selectedFile}}',
            actions: [{ type: 'resize', width: 800 }],
            saveFormat: 'jpeg',
            variableName: 'editedImage'
        };
        case 'SHOW_TEXT': return { title: 'Sonuç', content: '{{previous_output}}' };
        case 'SHOW_MENU': return { title: 'Seçim Yapın', options: ['Seçenek 1', 'Seçenek 2'], variableName: 'selection' };
        // Google nodes
        case 'GMAIL_SEND': return { to: '', subject: '', body: '', isHtml: false, variableName: 'emailResult' };
        case 'GMAIL_READ': return { maxResults: 5, query: 'is:unread', variableName: 'emails' };
        case 'OUTLOOK_SEND': return { to: '', subject: '', body: '', isHtml: false, variableName: 'emailResult' };
        case 'OUTLOOK_READ': return { folderName: 'Inbox', maxResults: 10, unreadOnly: true, variableName: 'emails' };
        case 'EXCEL_READ': return { fileId: '', range: 'Sheet1!A1:Z10', variableName: 'excelData' };
        case 'EXCEL_WRITE': return { fileId: '', range: 'Sheet1!A1', values: '[[]]', variableName: 'result' };
        case 'SHEETS_READ': return { spreadsheetId: '', range: 'A1:D10', variableName: 'sheetData' };
        case 'SHEETS_WRITE': return { spreadsheetId: '', range: 'A1', values: '[[]]', append: false };

        case 'DRIVE_UPLOAD': return { filePath: '{{selectedFile}}', fileName: 'upload.pdf', mimeType: 'application/pdf', variableName: 'driveFile' };
        // Sensors
        case 'LIGHT_SENSOR': return { variableName: 'lightLevel' };
        case 'PEDOMETER': return { variableName: 'stepCount', startDate: 'today' };
        case 'MAGNETOMETER': return { variableName: 'heading' };
        case 'BAROMETER': return { variableName: 'pressure' };
        case 'GESTURE_TRIGGER': return { gesture: 'shake', sensitivity: 'medium' };
        case 'STEP_TRIGGER': return { targetSteps: 10000, comparison: 'gte', resetDaily: true, variableName: 'currentSteps' } as any; // Cast as any temporarily if types are out of sync
        case 'CALL_TRIGGER': return { states: ['Incoming'], variableName: 'callerInfo' };
        case 'SMS_TRIGGER': return { variableName: 'smsInfo' };
        case 'WHATSAPP_TRIGGER': return { variableName: 'whatsappInfo' };
        case 'GOOGLE_TRANSLATE': return { text: '{{previous_output}}', targetLanguage: 'tr', variableName: 'translatedText' };
        case 'TELEGRAM_SEND': return { botToken: '', chatId: '', message: '{{previous_output}}' };
        case 'SLACK_SEND': return { webhookUrl: '', message: '{{previous_output}}' };
        case 'SWITCH': return { variableName: 'checkVar', cases: [{ value: '1', portId: 'case_1' }, { value: '2', portId: 'case_2' }] };
        case 'CODE_EXECUTION': return { code: '// return { result: "ok" };', variableName: 'codeResult' };

        // Services
        case 'FACEBOOK_LOGIN': return { permissions: ['public_profile', 'email'], variableName: 'fb_token' };
        case 'INSTAGRAM_POST': return { imageUrl: '{{imageUrl}}', caption: 'Sent via BreviAI', accessTokenVariable: 'fb_token' };

        // Memory
        case 'REMEMBER_INFO': return { key: '', value: '' };
        case 'SEARCH_MEMORY': return { query: '', variableName: 'searchResults', threshold: 0.7 };
        case 'ADD_TO_MEMORY': return { text: '', metadata: '{}', variableName: 'memoryId' };
        case 'BULK_ADD_TO_MEMORY': return { data: 'sheet_data', contractColumn: 0, phoneColumn: 5, nameColumn: 6, debtColumn: 9 };
        case 'CLEAR_MEMORY': return { confirm: true };

        // Location (Missing)
        case 'GEOFENCE_CREATE': return { latitude: 0, longitude: 0, radius: 100, identifier: 'home_fence', name: 'Ev' };

        // Backend nodes
        case 'BROWSER_SCRAPE': return { url: 'https://example.com', waitForSelector: '', variableName: 'scrapedData' };
        case 'CRON_CREATE': return { name: 'My Cron', schedule: '*/5 * * * *', actionType: 'log', actionPayload: '{}' };

        default: return {} as NodeConfig;
    }
}

export function createEdge(sourceNodeId: string, targetNodeId: string, sourcePort: EdgePort = 'default'): WorkflowEdge {
    return {
        id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceNodeId,
        targetNodeId,
        sourcePort,
    };
}

export function createWorkflow(name: string): Workflow {
    return {
        id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        nodes: [],
        edges: [],
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        runCount: 0,
    };
}

export interface WorkflowTemplate {
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}
