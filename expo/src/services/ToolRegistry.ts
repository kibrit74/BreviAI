/**
 * Tool Registry for Agent AI
 * Maps Workflow Nodes to Gemini Function Declarations
 */

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'OBJECT';
        properties: Record<string, any>;
        required?: string[];
    };
    nodeType: string; // Map back to Workflow Node Type
    permissions?: {
        requiresConfirmation: boolean;
        isSensitive: boolean;
    };
}

export const SYSTEM_TOOLS: ToolDefinition[] = [
    // --- CALENDAR ---
    {
        name: 'read_calendar',
        description: 'Reads upcoming events from the device calendar. Use this to check schedule or availability. You can filter by calendar name (e.g., "Google", "Outlook", "Samsung") or type ("today", "next", "week").',
        parameters: {
            type: 'OBJECT',
            properties: {
                type: { type: 'STRING', description: 'Time range: "today", "next" (next 30 days), or "week" (next 7 days). Default: "next"' },
                maxEvents: { type: 'INTEGER', description: 'Number of events to retrieve (default: 5)' },
                calendarName: { type: 'STRING', description: 'Filter by calendar name (e.g., "Google", "Work", "Personal"). Leave empty to search all calendars.' },
                calendarSource: { type: 'STRING', description: 'Filter by calendar source/provider (e.g., "com.google", "com.samsung"). Leave empty to search all.' }
            },
            required: []
        },
        nodeType: 'CALENDAR_READ',
        permissions: { requiresConfirmation: false, isSensitive: false }
    },
    {
        name: 'create_event',
        description: 'Creates a new event in the default writable calendar (or specify a calendar name).',
        parameters: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING', description: 'Title of the event' },
                startDate: { type: 'STRING', description: 'Start date/time (ISO string like "2026-01-28T14:00:00" or natural language like "tomorrow at 2pm")' },
                endDate: { type: 'STRING', description: 'End date/time (optional, default 1 hour after start)' },
                notes: { type: 'STRING', description: 'Description or notes for the event' },
                location: { type: 'STRING', description: 'Location of the event' },
                calendarName: { type: 'STRING', description: 'Target calendar name (e.g., "Google", "Work"). Leave empty for default writable calendar.' }
            },
            required: ['title', 'startDate']
        },
        nodeType: 'CALENDAR_CREATE',
        permissions: { requiresConfirmation: true, isSensitive: false }
    },

    // --- CALENDAR (Advanced) ---
    {
        name: 'delete_event',
        description: 'Deletes a calendar event by ID.',
        parameters: {
            type: 'OBJECT',
            properties: {
                eventId: { type: 'STRING', description: 'ID of the event to delete' }
            },
            required: ['eventId']
        },
        nodeType: 'CALENDAR_DELETE',
        permissions: { requiresConfirmation: true, isSensitive: false }
    },
    {
        name: 'update_event',
        description: 'Updates an existing calendar event.',
        parameters: {
            type: 'OBJECT',
            properties: {
                eventId: { type: 'STRING', description: 'ID of the event to update' },
                title: { type: 'STRING', description: 'New title (optional)' },
                startDate: { type: 'STRING', description: 'New start date (optional)' },
                endDate: { type: 'STRING', description: 'New end date (optional)' },
                notes: { type: 'STRING', description: 'New notes (optional)' },
                location: { type: 'STRING', description: 'New location (optional)' }
            },
            required: ['eventId']
        },
        nodeType: 'CALENDAR_UPDATE',
        permissions: { requiresConfirmation: true, isSensitive: false }
    },

    // --- CONTACTS ---
    {
        name: 'search_contacts',
        description: 'Searches for a contact in the address book.',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: { type: 'STRING', description: 'Name to search for (e.g. "Ahmet")' },
                fetchAll: { type: 'BOOLEAN', description: 'Set true to fetch all contacts' }
            },
            required: ['query']
        },
        nodeType: 'CONTACTS_READ',
        permissions: { requiresConfirmation: true, isSensitive: true }
    },
    {
        name: 'create_contact',
        description: 'Creates a new contact in the address book.',
        parameters: {
            type: 'OBJECT',
            properties: {
                firstName: { type: 'STRING', description: 'First name' },
                lastName: { type: 'STRING', description: 'Last name' },
                phoneNumber: { type: 'STRING', description: 'Phone number' },
                email: { type: 'STRING', description: 'Email address' },
                company: { type: 'STRING', description: 'Company name' }
            },
            required: ['firstName', 'phoneNumber']
        },
        nodeType: 'CONTACTS_WRITE',
        permissions: { requiresConfirmation: true, isSensitive: true }
    },

    // --- NAVIGATION & SETTINGS ---
    {
        name: 'navigate',
        description: 'Opens map navigation to a specific destination.',
        parameters: {
            type: 'OBJECT',
            properties: {
                destination: { type: 'STRING', description: 'Address or coordinates (e.g. "Taksim", "41.0,29.0")' },
                app: { type: 'STRING', description: 'Preferred app: "google", "apple", "yandex", "waze"' },
                mode: { type: 'STRING', description: 'Mode: "driving", "walking", "transit", "bicycling"' }
            },
            required: ['destination']
        },
        nodeType: 'NAVIGATE_TO',
        permissions: { requiresConfirmation: false, isSensitive: false }
    },
    {
        name: 'open_settings',
        description: 'Opens system settings page (WiFi, Bluetooth, etc).',
        parameters: {
            type: 'OBJECT',
            properties: {
                setting: { type: 'STRING', description: '"wifi", "bluetooth", "location", "airplane_mode", "settings"' }
            },
            required: ['setting']
        },
        nodeType: 'SETTINGS_OPEN',
        permissions: { requiresConfirmation: false, isSensitive: false }
    },

    // --- DATABASE (LOCAL) ---
    {
        name: 'read_db',
        description: 'Reads data from local database (JSON store).',
        parameters: {
            type: 'OBJECT',
            properties: {
                tableName: { type: 'STRING', description: 'Name of the table/collection' },
                filterKey: { type: 'STRING', description: 'Key to filter by (optional)' },
                filterValue: { type: 'STRING', description: 'Value to match (optional)' }
            },
            required: ['tableName']
        },
        nodeType: 'DB_READ',
        permissions: { requiresConfirmation: false, isSensitive: false }
    },
    {
        name: 'write_db',
        description: 'Writes data to local database (Insert/Update/Delete).',
        parameters: {
            type: 'OBJECT',
            properties: {
                tableName: { type: 'STRING', description: 'Name of the table/collection' },
                operation: { type: 'STRING', description: '"insert", "update", "delete"' },
                data: { type: 'STRING', description: 'JSON data to insert/update (e.g. {"name":"Ali"})' },
                filterKey: { type: 'STRING', description: 'Filter key for update/delete' },
                filterValue: { type: 'STRING', description: 'Filter value for update/delete' }
            },
            required: ['tableName', 'operation']
        },
        nodeType: 'DB_WRITE',
        permissions: { requiresConfirmation: false, isSensitive: false }
    },

    // --- COMMUNICATION ---
    {
        name: 'send_email',
        description: 'Sends an email using Gmail or Outlook (whichever is configured).',
        parameters: {
            type: 'OBJECT',
            properties: {
                to: { type: 'STRING', description: 'Recipient email address' },
                subject: { type: 'STRING', description: 'Email subject' },
                body: { type: 'STRING', description: 'Email body content' }
            },
            required: ['to', 'subject', 'body']
        },
        nodeType: 'GMAIL_SEND', // Default mapping, engine can switch to Outlook
        permissions: { requiresConfirmation: true, isSensitive: true }
    },
    {
        name: 'send_whatsapp',
        description: 'Sends a WhatsApp message to a specific phone number.',
        parameters: {
            type: 'OBJECT',
            properties: {
                phoneNumber: { type: 'STRING', description: 'Recipient phone number (e.g., 905551234567)' },
                message: { type: 'STRING', description: 'Message content' }
            },
            required: ['phoneNumber', 'message']
        },
        nodeType: 'WHATSAPP_SEND',
        permissions: { requiresConfirmation: true, isSensitive: true }
    },
    {
        name: 'search_emails',
        description: 'Searches for or lists recent emails in the GMAIL inbox only. For Outlook/Hotmail, use read_outlook.',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: { type: 'STRING', description: 'Search query (e.g., "from:boss", "is:unread"). Leave empty to get recent emails.' },
                maxResults: { type: 'INTEGER', description: 'Max number of emails to return (default: 5)' }
            },
            required: []
        },
        nodeType: 'GMAIL_READ',
        permissions: { requiresConfirmation: false, isSensitive: true }
    },
    {
        name: 'send_sms',
        description: 'Sends an SMS message.',
        parameters: {
            type: 'OBJECT',
            properties: {
                phoneNumber: { type: 'STRING', description: 'Recipient phone number' },
                message: { type: 'STRING', description: 'Message content' }
            },
            required: ['phoneNumber', 'message']
        },
        nodeType: 'SMS_SEND',
        permissions: { requiresConfirmation: true, isSensitive: true }
    },
    {
        name: 'open_uyap',
        description: 'Opens the UYAP (Turkish Justice System) Portal for checking case files.',
        parameters: {
            type: 'OBJECT',
            properties: {
                portal: { type: 'STRING', description: 'Type of portal to open: "avukat" or "vatandas" (default: "avukat")' }
            },
            required: []
        },
        nodeType: 'OPEN_URL', // Reuse OPEN_URL node type but with logic in Engine to set correct URL
    },


    // --- DEVICE CONTROL ---
    {
        name: 'toggle_flashlight',
        description: 'Turns the flashlight on or off.',
        parameters: {
            type: 'OBJECT',
            properties: {
                mode: { type: 'STRING', description: 'Mode: "on", "off", or "toggle"' }
            },
            required: ['mode']
        },
        nodeType: 'FLASHLIGHT_CONTROL'
    },
    {
        name: 'set_bluetooth',
        description: 'Turns Bluetooth on or off.',
        parameters: {
            type: 'OBJECT',
            properties: {
                mode: { type: 'STRING', description: 'Mode: "on", "off", or "toggle"' }
            },
            required: ['mode']
        },
        nodeType: 'BLUETOOTH_CONTROL'
    },
    {
        name: 'set_brightness',
        description: 'Sets the screen brightness level.',
        parameters: {
            type: 'OBJECT',
            properties: {
                level: { type: 'INTEGER', description: 'Brightness level (0-100)' }
            },
            required: ['level']
        },
        nodeType: 'BRIGHTNESS_CONTROL'
    },
    {
        name: 'set_volume',
        description: 'Sets the volume level.',
        parameters: {
            type: 'OBJECT',
            properties: {
                level: { type: 'INTEGER', description: 'Volume level (0-100)' },
                type: { type: 'STRING', description: 'Stream type: "media", "ring", "alarm"' }
            },
            required: ['level']
        },
        nodeType: 'VOLUME_CONTROL'
    },
    {
        name: 'check_battery',
        description: 'Gets the current battery level and charging status.',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        },
        nodeType: 'BATTERY_CHECK'
    },
    {
        name: 'open_app',
        description: 'Launches a specific application on the device.',
        parameters: {
            type: 'OBJECT',
            properties: {
                appName: { type: 'STRING', description: 'Name of the app to open (e.g. "Spotify", "WhatsApp")' }
            },
            required: ['appName']
        },
        nodeType: 'APP_LAUNCH'
    },

    // --- WEB ---
    {
        name: 'search_web',
        description: 'Searches the web and returns actual search results. Returns an array of results with title, snippet, and url. Use this to find current information, prices, news, etc. The AI should analyze the returned results and summarize them for the user.',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: { type: 'STRING', description: 'Search query - be specific for better results' }
            },
            required: ['query']
        },
        nodeType: 'WEB_SEARCH',
    },
    {
        name: 'get_location',
        description: 'Gets the current GPS location coordinates AND readable address. Returns: latitude, longitude, address (full), displayAddress (short), mapsUrl (Google Maps link).',
        parameters: {
            type: 'OBJECT',
            properties: {
                accuracy: { type: 'STRING', description: 'Location accuracy: "low", "medium", "high". Default: "medium"' }
            },
            required: []
        },
        nodeType: 'LOCATION_GET'
    },
    {
        name: 'get_weather',
        description: 'Gets current weather information. Returns temperature, humidity, description, wind speed. Requires OpenWeatherMap API key in settings.',
        parameters: {
            type: 'OBJECT',
            properties: {
                city: { type: 'STRING', description: 'City name (e.g., "Istanbul", "Ankara"). Leave empty to use current location.' },
                latitude: { type: 'NUMBER', description: 'Latitude (optional, use with longitude)' },
                longitude: { type: 'NUMBER', description: 'Longitude (optional, use with latitude)' }
            },
            required: []
        },
        nodeType: 'WEATHER_GET'
    },
    {
        name: 'view_document',
        description: 'Views a UDF / Legal document.',
        parameters: {
            type: 'OBJECT',
            properties: {
                fileSource: { type: 'STRING', description: 'Path or URI of the file to view' }
            },
            required: ['fileSource']
        },
        nodeType: 'VIEW_UDF'
    },

    // --- OUTPUT / DISPLAY ---
    {
        name: 'speak_text',
        description: 'Reads text aloud using text-to-speech.',
        parameters: {
            type: 'OBJECT',
            properties: {
                text: { type: 'STRING', description: 'Text to speak' },
                language: { type: 'STRING', description: 'Language code (e.g., "tr-TR", "en-US"). Default: "tr-TR"' }
            },
            required: ['text']
        },
        nodeType: 'SPEAK_TEXT'
    },
    {
        name: 'show_text',
        description: 'Displays a text message on screen for the user to see.',
        parameters: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING', description: 'Title of the message' },
                content: { type: 'STRING', description: 'Content/body of the message' }
            },
            required: ['content']
        },
        nodeType: 'SHOW_TEXT'
    },
    {
        name: 'show_image',
        description: 'Displays an image on screen.',
        parameters: {
            type: 'OBJECT',
            properties: {
                imageUri: { type: 'STRING', description: 'URI or path of the image to display' },
                title: { type: 'STRING', description: 'Optional title' }
            },
            required: ['imageUri']
        },
        nodeType: 'SHOW_IMAGE'
    },
    {
        name: 'send_notification',
        description: 'Sends a local notification to the user.',
        parameters: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING', description: 'Notification title' },
                body: { type: 'STRING', description: 'Notification body/content' }
            },
            required: ['title', 'body']
        },
        nodeType: 'NOTIFICATION'
    },

    // --- DEVICE CONTROL (Extended) ---
    {
        name: 'set_alarm',
        description: 'Sets an alarm or reminder on the device.',
        parameters: {
            type: 'OBJECT',
            properties: {
                hour: { type: 'INTEGER', description: 'Hour (0-23)' },
                minute: { type: 'INTEGER', description: 'Minute (0-59)' },
                message: { type: 'STRING', description: 'Alarm message/label' }
            },
            required: ['hour', 'minute']
        },
        nodeType: 'ALARM_SET'
    },
    {
        name: 'set_dnd',
        description: 'Enables or disables Do Not Disturb mode.',
        parameters: {
            type: 'OBJECT',
            properties: {
                enabled: { type: 'BOOLEAN', description: 'true to enable DND, false to disable' }
            },
            required: ['enabled']
        },
        nodeType: 'DND_CONTROL'
    },
    {
        name: 'set_sound_mode',
        description: 'Sets the phone sound mode (silent, vibrate, normal).',
        parameters: {
            type: 'OBJECT',
            properties: {
                mode: { type: 'STRING', description: 'Mode: "silent", "vibrate", or "normal"' }
            },
            required: ['mode']
        },
        nodeType: 'SOUND_MODE'
    },
    {
        name: 'wake_screen',
        description: 'Wakes/turns on the device screen.',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        },
        nodeType: 'SCREEN_WAKE'
    },
    {
        name: 'control_media',
        description: 'Controls media playback (play, pause, next, previous).',
        parameters: {
            type: 'OBJECT',
            properties: {
                action: { type: 'STRING', description: 'Action: "play", "pause", "next", "previous", "stop"' }
            },
            required: ['action']
        },
        nodeType: 'MEDIA_CONTROL'
    },

    // --- STATE / SENSORS ---
    {
        name: 'check_network',
        description: 'Checks the current network connection status (WiFi, mobile data, etc).',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        },
        nodeType: 'NETWORK_CHECK'
    },
    {
        name: 'read_light_sensor',
        description: 'Reads ambient light level from the light sensor.',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        },
        nodeType: 'LIGHT_SENSOR'
    },
    {
        name: 'read_steps',
        description: 'Reads step count from the pedometer.',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        },
        nodeType: 'PEDOMETER'
    },

    // --- FILES ---
    {
        name: 'read_file',
        description: 'Reads contents of a text file.',
        parameters: {
            type: 'OBJECT',
            properties: {
                filePath: { type: 'STRING', description: 'Path to the file to read' }
            },
            required: ['filePath']
        },
        nodeType: 'FILE_READ'
    },
    {
        name: 'write_file',
        description: 'Writes content to a file.',
        parameters: {
            type: 'OBJECT',
            properties: {
                filePath: { type: 'STRING', description: 'Path to write the file' },
                content: { type: 'STRING', description: 'Content to write' }
            },
            required: ['filePath', 'content']
        },
        nodeType: 'FILE_WRITE'
    },
    {
        name: 'pick_file',
        description: 'Opens a file picker for the user to select a file.',
        parameters: {
            type: 'OBJECT',
            properties: {
                type: { type: 'STRING', description: 'File type filter: "all", "image", "document", "pdf"' }
            },
            required: []
        },
        nodeType: 'FILE_PICK'
    },
    {
        name: 'create_pdf',
        description: 'Creates a PDF from text or HTML content.',
        parameters: {
            type: 'OBJECT',
            properties: {
                content: { type: 'STRING', description: 'Text or HTML content for the PDF' },
                fileName: { type: 'STRING', description: 'Name of the PDF file' }
            },
            required: ['content']
        },
        nodeType: 'PDF_CREATE'
    },

    // --- CLIPBOARD ---
    {
        name: 'read_clipboard',
        description: 'Reads the current clipboard content.',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        },
        nodeType: 'CLIPBOARD_READER'
    },

    // --- WEB / TRANSLATION ---
    {
        name: 'translate_text',
        description: 'Translates text to another language using Google Translate.',
        parameters: {
            type: 'OBJECT',
            properties: {
                text: { type: 'STRING', description: 'Text to translate' },
                targetLanguage: { type: 'STRING', description: 'Target language code (e.g., "en", "tr", "de")' },
                sourceLanguage: { type: 'STRING', description: 'Source language code (optional, auto-detect if not specified)' }
            },
            required: ['text', 'targetLanguage']
        },
        nodeType: 'GOOGLE_TRANSLATE'
    },
    {
        name: 'extract_html',
        description: 'Extracts data from HTML content using CSS selectors. Useful for scraping websites or parsing email content.',
        parameters: {
            type: 'OBJECT',
            properties: {
                htmlSource: { type: 'STRING', description: 'The HTML content to parse (e.g. {{httpResponse}})' },
                extracts: {
                    type: 'ARRAY',
                    description: 'List of extraction rules',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            key: { type: 'STRING', description: 'Output variable name' },
                            selector: { type: 'STRING', description: 'CSS Selector (e.g. ".price", "#title")' },
                            valueType: { type: 'STRING', description: '"text", "html", "attr", "value"' },
                            attribute: { type: 'STRING', description: 'Attribute name if valueType is "attr" (e.g. "href", "src")' },
                            returnArray: { type: 'BOOLEAN', description: 'Return array of matches?' }
                        },
                        required: ['key', 'selector', 'valueType']
                    }
                },
                variableName: { type: 'STRING', description: 'Variable name to store result' }
            },
            required: ['htmlSource', 'extracts', 'variableName']
        },
        nodeType: 'HTML_EXTRACT'
    },
    {
        name: 'http_request',
        description: 'Makes an HTTP request to a URL and returns the response.',
        parameters: {
            type: 'OBJECT',
            properties: {
                url: { type: 'STRING', description: 'URL to request' },
                method: { type: 'STRING', description: 'HTTP method: GET, POST, PUT, DELETE (default: GET)' },
                body: { type: 'STRING', description: 'Request body (for POST/PUT)' },
                headers: { type: 'STRING', description: 'JSON string of headers' }
            },
            required: ['url']
        },
        nodeType: 'HTTP_REQUEST'
    },
    {
        name: 'share_content',
        description: 'Opens the system share sheet to share text or a file.',
        parameters: {
            type: 'OBJECT',
            properties: {
                content: { type: 'STRING', description: 'Text content to share' },
                fileUri: { type: 'STRING', description: 'Optional: URI of file to share' }
            },
            required: ['content']
        },
        nodeType: 'SHARE_SHEET'
    },
    {
        name: 'create_geofence',
        description: 'Creates a circular geofence with triggers.',
        parameters: {
            type: 'OBJECT',
            properties: {
                latitude: { type: 'NUMBER', description: 'Center latitude' },
                longitude: { type: 'NUMBER', description: 'Center longitude' },
                radius: { type: 'NUMBER', description: 'Radius in meters (default 100)' },
                identifier: { type: 'STRING', description: 'Unique ID for geofence' },
                onEnter: { type: 'BOOLEAN', description: 'Trigger on enter (default true)' },
                onExit: { type: 'BOOLEAN', description: 'Trigger on exit (default true)' }
            },
            required: ['latitude', 'longitude', 'identifier']
        },
        nodeType: 'GEOFENCE_CREATE',
        permissions: { requiresConfirmation: true, isSensitive: true }
    },
    {
        name: 'read_rss',
        description: 'Reads and parses an RSS feed.',
        parameters: {
            type: 'OBJECT',
            properties: {
                feedUrl: { type: 'STRING', description: 'URL of the RSS feed' },
                maxItems: { type: 'INTEGER', description: 'Maximum items to return (default: 10)' }
            },
            required: ['feedUrl']
        },
        nodeType: 'RSS_READ'
    },
    {
        name: 'web_automation',
        description: 'Automates web browser interactions like clicking elements, typing text, and scraping data. REQUIRED: "actions" must be a JSON string array. Examples: [{"type": "click", "selector": "#btn-id"}, {"type": "type", "selector": "input.user", "value": "johndoe"}, {"type": "scrape", "selector": ".price-tag", "variableName": "price"}]',
        parameters: {
            type: 'OBJECT',
            properties: {
                url: { type: 'STRING', description: 'Target website URL' },
                actions: { type: 'STRING', description: 'JSON string of actions. Types: "click", "type", "scrape", "wait", "scroll". For scrape, include "variableName".' },
                headless: { type: 'BOOLEAN', description: 'Run in background (default false). Use false to see the browser.' }
            },
            required: ['url', 'actions']
        },
        nodeType: 'WEB_AUTOMATION',
        permissions: { requiresConfirmation: true, isSensitive: false }
    },
    {
        name: 'open_url',
        description: 'Opens a URL in the default browser.',
        parameters: {
            type: 'OBJECT',
            properties: {
                url: { type: 'STRING', description: 'URL to open' }
            },
            required: ['url']
        },
        nodeType: 'OPEN_URL'
    },

    // --- COMMUNICATION (Extended) ---
    {
        name: 'send_telegram',
        description: 'Sends a Telegram message via bot.',
        parameters: {
            type: 'OBJECT',
            properties: {
                chatId: { type: 'STRING', description: 'Telegram chat ID' },
                message: { type: 'STRING', description: 'Message content' }
            },
            required: ['chatId', 'message']
        },
        nodeType: 'TELEGRAM_SEND'
    },
    {
        name: 'send_slack',
        description: 'Sends a Slack message via webhook.',
        parameters: {
            type: 'OBJECT',
            properties: {
                webhookUrl: { type: 'STRING', description: 'Slack webhook URL' },
                message: { type: 'STRING', description: 'Message content' }
            },
            required: ['webhookUrl', 'message']
        },
        nodeType: 'SLACK_SEND'
    },
    {
        name: 'send_discord',
        description: 'Sends a Discord message via webhook. Can include custom username, avatar, and rich embeds.',
        parameters: {
            type: 'OBJECT',
            properties: {
                webhookUrl: { type: 'STRING', description: 'Discord webhook URL' },
                message: { type: 'STRING', description: 'Message content' },
                username: { type: 'STRING', description: 'Custom bot name (optional)' },
                avatarUrl: { type: 'STRING', description: 'Custom avatar URL (optional)' },
                embeds: { type: 'STRING', description: 'JSON array of embed objects for rich content (optional)' }
            },
            required: ['webhookUrl', 'message']
        },
        nodeType: 'DISCORD_SEND'
    },
    {
        name: 'create_notion',
        description: 'Creates a new page in a Notion database. Requires Notion API key and database ID.',
        parameters: {
            type: 'OBJECT',
            properties: {
                apiKey: { type: 'STRING', description: 'Notion Integration API Key' },
                databaseId: { type: 'STRING', description: 'Target database ID' },
                properties: { type: 'STRING', description: 'JSON object of properties (e.g., {"Title": {"title": [{"text": {"content": "My Page"}}]}})' },
                content: { type: 'STRING', description: 'Page content as text (optional)' }
            },
            required: ['apiKey', 'databaseId', 'properties']
        },
        nodeType: 'NOTION_CREATE',
        permissions: { requiresConfirmation: true, isSensitive: true }
    },
    {
        name: 'read_notion',
        description: 'Reads/queries pages from a Notion database. Can apply filters and sorting.',
        parameters: {
            type: 'OBJECT',
            properties: {
                apiKey: { type: 'STRING', description: 'Notion Integration API Key' },
                databaseId: { type: 'STRING', description: 'Database ID to query' },
                filter: { type: 'STRING', description: 'JSON filter object (optional)' },
                sorts: { type: 'STRING', description: 'JSON sorts array (optional)' },
                pageSize: { type: 'INTEGER', description: 'Number of results (default: 100)' }
            },
            required: ['apiKey', 'databaseId']
        },
        nodeType: 'NOTION_READ',
        permissions: { requiresConfirmation: false, isSensitive: true }
    },
    {
        name: 'login_facebook',
        description: 'Logs in to Facebook to get an Access Token for other services (like Instagram). returns token.',
        parameters: {
            type: 'OBJECT',
            properties: {
                variableName: { type: 'STRING', description: 'Variable name to store the token (default: "fb_token")' }
            },
            required: []
        },
        nodeType: 'FACEBOOK_LOGIN',
        permissions: { requiresConfirmation: true, isSensitive: true }
    },
    {
        name: 'post_instagram',
        description: 'Posts a photo to Instagram Business account. Requires Facebook Login first.',
        parameters: {
            type: 'OBJECT',
            properties: {
                imageUrl: { type: 'STRING', description: 'URL of the image to post' },
                caption: { type: 'STRING', description: 'Caption/Text for the post' },
                accessTokenVariable: { type: 'STRING', description: 'Variable containing FB Token (default: "fb_token")' }
            },
            required: ['imageUrl', 'caption']
        },
        nodeType: 'INSTAGRAM_POST',
        permissions: { requiresConfirmation: true, isSensitive: false }
    },

    // --- SMART HOME ---
    {
        name: 'control_philips_hue',
        description: 'Controls Philips Hue smart lights. Requires local Hue Bridge IP and API key.',
        parameters: {
            type: 'OBJECT',
            properties: {
                bridgeIp: { type: 'STRING', description: 'Hue Bridge IP address (e.g., "192.168.1.100")' },
                apiKey: { type: 'STRING', description: 'Hue API key (username from bridge)' },
                action: { type: 'STRING', description: 'Action: "on", "off", "toggle", "brightness", "color", "scene"' },
                lightId: { type: 'STRING', description: 'Light ID (optional, "all" for all lights)' },
                groupId: { type: 'STRING', description: 'Group/Room ID (optional)' },
                brightness: { type: 'INTEGER', description: 'Brightness 0-254 (for brightness action)' },
                sceneId: { type: 'STRING', description: 'Scene ID (for scene action)' }
            },
            required: ['bridgeIp', 'apiKey', 'action']
        },
        nodeType: 'PHILIPS_HUE',
        permissions: { requiresConfirmation: false, isSensitive: false }
    },

    // --- CAMERA ---
    {
        name: 'take_photo',
        description: 'Opens the device camera and takes a photo. Optionally extracts text from the photo using Gemini Vision OCR.',
        parameters: {
            type: 'OBJECT',
            properties: {
                cameraType: { type: 'STRING', description: 'Camera to use: "back" or "front". Default: "back"' },
                quality: { type: 'STRING', description: 'Image quality: "low", "medium", or "high". Default: "medium"' },
                enableOcr: { type: 'BOOLEAN', description: 'If true, extracts text from photo using Gemini Vision OCR. Returns ocrText field.' }
            },
            required: []
        },
        nodeType: 'CAMERA_CAPTURE',
        permissions: { requiresConfirmation: true, isSensitive: false }
    },

    // --- GOOGLE SHEETS / DRIVE ---
    {
        name: 'read_sheet',
        description: 'Reads data from a Google Sheet. Can read specific range or whole sheet.',
        parameters: {
            type: 'OBJECT',
            properties: {
                spreadsheetId: { type: 'STRING', description: 'ID of the Google Spreadsheet' },
                range: { type: 'STRING', description: 'Range to read (e.g., "Sheet1!A1:B10")' }
            },
            required: ['spreadsheetId', 'range']
        },
        nodeType: 'SHEETS_READ',
        permissions: { requiresConfirmation: false, isSensitive: true }
    },
    {
        name: 'write_sheet',
        description: 'Writes data to a Google Sheet. Appends row or updates range.',
        parameters: {
            type: 'OBJECT',
            properties: {
                spreadsheetId: { type: 'STRING', description: 'ID of the Google Spreadsheet' },
                range: { type: 'STRING', description: 'Range to write to (e.g., "Sheet1!A1")' },
                values: { type: 'STRING', description: 'JSON string of values (array of arrays) to write' },
                operation: { type: 'STRING', description: 'Operation: "append" or "update" (default: append)' }
            },
            required: ['spreadsheetId', 'range', 'values']
        },
        nodeType: 'SHEETS_WRITE',
        permissions: { requiresConfirmation: true, isSensitive: true }
    },
    {
        name: 'upload_drive',
        description: 'Uploads a file to Google Drive.',
        parameters: {
            type: 'OBJECT',
            properties: {
                filePath: { type: 'STRING', description: 'Path of the file to upload' },
                folderId: { type: 'STRING', description: 'Optional folder ID to upload into' }
            },
            required: ['filePath']
        },
        nodeType: 'DRIVE_UPLOAD',
        permissions: { requiresConfirmation: true, isSensitive: true }
    },

    // --- OFFICE / EXCEL / OUTLOOK ---
    {
        name: 'read_excel',
        description: 'Reads data from a local Excel file (.xlsx).',
        parameters: {
            type: 'OBJECT',
            properties: {
                filePath: { type: 'STRING', description: 'Path to local Excel file' }
            },
            required: ['filePath']
        },
        nodeType: 'EXCEL_READ'
    },
    {
        name: 'write_excel',
        description: 'Writes data to a local Excel file.',
        parameters: {
            type: 'OBJECT',
            properties: {
                filePath: { type: 'STRING', description: 'Path to Excel file' },
                data: { type: 'STRING', description: 'JSON string of data to write (array of objects or arrays)' },
                sheetName: { type: 'STRING', description: 'Optional sheet name' }
            },
            required: ['filePath', 'data']
        },
        nodeType: 'EXCEL_WRITE'
    },
    {
        name: 'send_outlook',
        description: 'Sends an email specifically using Outlook.',
        parameters: {
            type: 'OBJECT',
            properties: {
                to: { type: 'STRING', description: 'Recipient email' },
                subject: { type: 'STRING', description: 'Email subject' },
                body: { type: 'STRING', description: 'Email body' }
            },
            required: ['to', 'subject', 'body']
        },
        nodeType: 'OUTLOOK_SEND',
        permissions: { requiresConfirmation: true, isSensitive: true }
    },
    {
        name: 'read_outlook',
        description: 'Searches for emails in Outlook / Hotmail / Live inbox.',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: { type: 'STRING', description: 'Search query (e.g. "from:boss")' },
                maxResults: { type: 'INTEGER', description: 'Max count (default 5)' }
            },
            required: ['query']
        },
        nodeType: 'OUTLOOK_READ',
        permissions: { requiresConfirmation: false, isSensitive: true }
    },
    {
        name: 'upload_to_onedrive',
        description: 'Uploads a file to OneDrive cloud storage. Returns webUrl link. IMPORTANT: After successful upload, always use show_text to display the webUrl to the user.',
        parameters: {
            type: 'OBJECT',
            properties: {
                filePath: { type: 'STRING', description: 'File path or variable name containing file to upload' },
                fileName: { type: 'STRING', description: 'Optional target file name in OneDrive' },
                folderId: { type: 'STRING', description: 'Optional folder ID (empty = root)' }
            },
            required: ['filePath']
        },
        nodeType: 'ONEDRIVE_UPLOAD',
        permissions: { requiresConfirmation: true, isSensitive: false }
    },
    {
        name: 'download_from_onedrive',
        description: 'Downloads a file from OneDrive to the device.',
        parameters: {
            type: 'OBJECT',
            properties: {
                fileName: { type: 'STRING', description: 'Name of file to download from OneDrive' },
                fileId: { type: 'STRING', description: 'Alternatively, file ID in OneDrive' }
            },
            required: []
        },
        nodeType: 'ONEDRIVE_DOWNLOAD',
        permissions: { requiresConfirmation: false, isSensitive: false }
    },
    {
        name: 'list_onedrive_files',
        description: 'Lists files and folders in OneDrive.',
        parameters: {
            type: 'OBJECT',
            properties: {
                folderId: { type: 'STRING', description: 'Folder ID to list (empty = root)' },
                maxResults: { type: 'INTEGER', description: 'Max files to return (default 50)' }
            },
            required: []
        },
        nodeType: 'ONEDRIVE_LIST',
        permissions: { requiresConfirmation: false, isSensitive: false }
    },

    // --- AUDIO / MEDIA ---
    {
        name: 'record_audio',
        description: 'Records audio from microphone for a specified duration.',
        parameters: {
            type: 'OBJECT',
            properties: {
                duration: { type: 'INTEGER', description: 'Duration in seconds (default: 5)' }
            },
            required: []
        },
        nodeType: 'AUDIO_RECORD',
        permissions: { requiresConfirmation: true, isSensitive: true }
    },
    {
        name: 'generate_image',
        description: 'Generates an image using AI based on a text prompt.',
        parameters: {
            type: 'OBJECT',
            properties: {
                prompt: { type: 'STRING', description: 'Description of the image to generate' },
                style: { type: 'STRING', description: 'Style (e.g. "cinematic", "cartoon")' },
                inputImage: { type: 'STRING', description: 'URI of input image for editing/refinement (supports Nanobana)' },
                provider: { type: 'STRING', description: 'AI Provider: "gemini", "nanobana", "pollinations"' },
                aspectRatio: { type: 'STRING', description: 'Aspect ratio (e.g. "1:1", "16:9")' }
            },
            required: ['prompt']
        },
        nodeType: 'IMAGE_GENERATOR',
        permissions: { requiresConfirmation: true, isSensitive: false }
    },

    // --- SENSORS ---
    {
        name: 'read_magnetometer',
        description: 'Reads magnetic field data (Compass).',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        },
        nodeType: 'MAGNETOMETER'
    },
    {
        name: 'read_barometer',
        description: 'Reads air pressure data (Barometer).',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        },
        nodeType: 'BAROMETER'
    },

    // --- MISSING NODES (LOGIC & TRIGGERS) ---
    {
        name: 'trigger_time',
        description: 'Triggers the workflow at a specific time (recurring).',
        parameters: {
            type: 'OBJECT',
            properties: {
                hour: { type: 'INTEGER', description: 'Hour (0-23)' },
                minute: { type: 'INTEGER', description: 'Minute (0-59)' },
                repeat: { type: 'BOOLEAN', description: 'Should it repeat daily?' },
                days: { type: 'STRING', description: 'Array of days [0-6] where 0 is Sunday. Pass as JSON string if possible.' }
            },
            required: ['hour', 'minute']
        },
        nodeType: 'TIME_TRIGGER'
    },
    {
        name: 'trigger_notification',
        description: 'Triggers the workflow when a specific notification is received.',
        parameters: {
            type: 'OBJECT',
            properties: {
                packageName: { type: 'STRING', description: 'Package name to filter (e.g. com.whatsapp)' },
                titleFilter: { type: 'STRING', description: 'Regex/text to match in title' },
                textFilter: { type: 'STRING', description: 'Regex/text to match in body' },
                exactMatch: { type: 'BOOLEAN', description: 'True for exact match, False for partial/regex' }
            },
            required: []
        },
        nodeType: 'NOTIFICATION_TRIGGER'
    },
    {
        name: 'trigger_gesture',
        description: 'Triggers the workflow with a specific device gesture.',
        parameters: {
            type: 'OBJECT',
            properties: {
                gesture: { type: 'STRING', description: 'Gesture type: "shake", "face_down", "face_up", "quadruple_tap"' },
                sensitivity: { type: 'STRING', description: 'Sensitivity: "low", "medium", "high"' }
            },
            required: ['gesture']
        },
        nodeType: 'GESTURE_TRIGGER'
    },
    {
        name: 'trigger_sms',
        description: 'Triggers the workflow when an SMS message is received. Can filter by sender or message content.',
        parameters: {
            type: 'OBJECT',
            properties: {
                phoneNumberFilter: { type: 'STRING', description: 'Filter by sender phone number (optional)' },
                messageFilter: { type: 'STRING', description: 'Filter by message content, e.g. "Neredesin" (optional)' },
                variableName: { type: 'STRING', description: 'Variable name to store SMS info (default: smsInfo)' }
            },
            required: []
        },
        nodeType: 'SMS_TRIGGER'
    },
    {
        name: 'trigger_call',
        description: 'Triggers the workflow when a phone call is received or made.',
        parameters: {
            type: 'OBJECT',
            properties: {
                states: { type: 'STRING', description: 'JSON array of states to trigger on: ["Incoming", "Connected", "Disconnected", "Dialing"]' },
                phoneNumber: { type: 'STRING', description: 'Filter by specific phone number (optional)' },
                variableName: { type: 'STRING', description: 'Variable name to store caller info (default: callerInfo)' }
            },
            required: []
        },
        nodeType: 'CALL_TRIGGER'
    },
    {
        name: 'trigger_whatsapp',
        description: 'Triggers the workflow when a WhatsApp message is received.',
        parameters: {
            type: 'OBJECT',
            properties: {
                senderFilter: { type: 'STRING', description: 'Filter by sender name or number (optional)' },
                messageFilter: { type: 'STRING', description: 'Filter by message content (optional)' },
                groupFilter: { type: 'STRING', description: 'Filter by group name (optional)' },
                variableName: { type: 'STRING', description: 'Variable name to store message info (default: whatsappInfo)' }
            },
            required: []
        },
        nodeType: 'WHATSAPP_TRIGGER'
    },
    {
        name: 'trigger_email',
        description: 'Triggers the workflow when a new email is received.',
        parameters: {
            type: 'OBJECT',
            properties: {
                senderFilter: { type: 'STRING', description: 'Filter by sender email address (optional)' },
                subjectFilter: { type: 'STRING', description: 'Filter by email subject (optional)' },
                variableName: { type: 'STRING', description: 'Variable name to store email info (default: emailInfo)' }
            },
            required: []
        },
        nodeType: 'EMAIL_TRIGGER'
    },
    {
        name: 'trigger_telegram',
        description: 'Triggers the workflow when a Telegram message is received.',
        parameters: {
            type: 'OBJECT',
            properties: {
                chatNameFilter: { type: 'STRING', description: 'Filter by chat/group name (optional)' },
                messageFilter: { type: 'STRING', description: 'Filter by message content (optional)' },
                variableName: { type: 'STRING', description: 'Variable name to store message info (default: telegramInfo)' }
            },
            required: []
        },
        nodeType: 'TELEGRAM_TRIGGER'
    },
    {
        name: 'trigger_geofence_enter',
        description: 'Triggers the workflow when the user enters a specific geographic area.',
        parameters: {
            type: 'OBJECT',
            properties: {
                latitude: { type: 'NUMBER', description: 'Center latitude of the geofence' },
                longitude: { type: 'NUMBER', description: 'Center longitude of the geofence' },
                radius: { type: 'NUMBER', description: 'Radius in meters (default: 100)' },
                identifier: { type: 'STRING', description: 'Unique name for this geofence (e.g. "home", "office")' }
            },
            required: ['latitude', 'longitude', 'identifier']
        },
        nodeType: 'GEOFENCE_ENTER_TRIGGER'
    },
    {
        name: 'trigger_geofence_exit',
        description: 'Triggers the workflow when the user exits a specific geographic area.',
        parameters: {
            type: 'OBJECT',
            properties: {
                latitude: { type: 'NUMBER', description: 'Center latitude of the geofence' },
                longitude: { type: 'NUMBER', description: 'Center longitude of the geofence' },
                radius: { type: 'NUMBER', description: 'Radius in meters (default: 100)' },
                identifier: { type: 'STRING', description: 'Unique name for this geofence (e.g. "home", "office")' }
            },
            required: ['latitude', 'longitude', 'identifier']
        },
        nodeType: 'GEOFENCE_EXIT_TRIGGER'
    },
    {
        name: 'trigger_deep_link',
        description: 'Triggers the workflow when a specific deep link URL is opened.',
        parameters: {
            type: 'OBJECT',
            properties: {
                path: { type: 'STRING', description: 'Deep link path to match (e.g. "workflow/start")' },
                variableName: { type: 'STRING', description: 'Variable name to store link params (default: linkParams)' }
            },
            required: ['path']
        },
        nodeType: 'DEEP_LINK_TRIGGER'
    },
    {
        name: 'control_loop',
        description: 'Loops a section of the workflow.',
        parameters: {
            type: 'OBJECT',
            properties: {
                type: { type: 'STRING', description: 'Loop type: "count", "while", "forEach"' },
                count: { type: 'INTEGER', description: 'Number of times to loop (for count type)' },
                items: { type: 'STRING', description: 'Variable name of array to iterate (for forEach type)' }
            },
            required: ['type']
        },
        nodeType: 'LOOP'
    },
    {
        name: 'control_switch',
        description: 'Branches flow based on a value (Switch-Case).',
        parameters: {
            type: 'OBJECT',
            properties: {
                variableName: { type: 'STRING', description: 'Variable to check' },
                cases: { type: 'STRING', description: 'JSON string of cases array like [{"value": "A", "portId": "case_1"}]' }
            },
            required: ['variableName']
        },
        nodeType: 'SWITCH'
    },
    {
        name: 'control_if_else',
        description: 'Conditional logic (If/Else). Checks a condition and branches accordingly.',
        parameters: {
            type: 'OBJECT',
            properties: {
                left: { type: 'STRING', description: 'Left operand (variable or value)' },
                operator: { type: 'STRING', description: 'Operator: "==", "!=", ">", "<", ">=", "<=", "contains", "startsWith", "endsWith", "isEmpty"' },
                right: { type: 'STRING', description: 'Right operand (variable or value)' },
                logic: { type: 'STRING', description: 'For multiple conditions: "AND" or "OR"' }
            },
            required: ['left', 'operator', 'right']
        },
        nodeType: 'IF_ELSE'
    },

    // --- IMAGE TOOLS ---
    {
        name: 'edit_image',
        description: 'Edits an image (crop, rotate, filter).',
        parameters: {
            type: 'OBJECT',
            properties: {
                imageUri: { type: 'STRING', description: 'URI of image to edit' },
                operations: { type: 'STRING', description: 'JSON string of operations e.g. [{"resize": {"width": 100}}]' }
            },
            required: ['imageUri']
        },
        nodeType: 'IMAGE_EDIT'
    },
    {
        name: 'image_edit',
        description: 'Alias for edit_image. Edits an image (crop, rotate, filter).',
        parameters: {
            type: 'OBJECT',
            properties: {
                imageUri: { type: 'STRING', description: 'URI of image to edit' },
                operations: { type: 'STRING', description: 'JSON string of operations e.g. [{"resize": {"width": 100}}]' }
            },
            required: ['imageUri']
        },
        nodeType: 'IMAGE_EDIT'
    },

    {
        name: 'ask_user',
        description: 'Asks the user a question and waits for text input.',
        parameters: {
            type: 'OBJECT',
            properties: {
                prompt: { type: 'STRING', description: 'Question or prompt to show the user' },
                placeholder: { type: 'STRING', description: 'Placeholder text for input field' }
            },
            required: ['prompt']
        },
        nodeType: 'TEXT_INPUT'
    },
    {
        name: 'show_menu',
        description: 'Shows a menu with options for the user to select from.',
        parameters: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING', description: 'Menu title' },
                options: { type: 'STRING', description: 'Comma-separated list of options (e.g., "Option 1, Option 2, Option 3")' }
            },
            required: ['title', 'options']
        },
        nodeType: 'SHOW_MENU'
    },
    {
        name: 'listen_speech',
        description: 'Listens for speech and converts to text (Speech-to-Text).',
        parameters: {
            type: 'OBJECT',
            properties: {
                language: { type: 'STRING', description: 'Language code for recognition (e.g., "tr-TR", "en-US")' }
            },
            required: []
        },
        nodeType: 'SPEECH_TO_TEXT'
    },

    // --- VARIABLE ---
    {
        name: 'set_variable',
        description: 'Stores a value in a workflow variable for later use.',
        parameters: {
            type: 'OBJECT',
            properties: {
                name: { type: 'STRING', description: 'Variable name' },
                value: { type: 'STRING', description: 'Value to store' }
            },
            required: ['name', 'value']
        },
        nodeType: 'VARIABLE'
    },

    // --- DELAY ---
    {
        name: 'wait',
        description: 'Waits for a specified duration before continuing.',
        parameters: {
            type: 'OBJECT',
            properties: {
                seconds: { type: 'INTEGER', description: 'Number of seconds to wait' }
            },
            required: ['seconds']
        },
        nodeType: 'DELAY'
    },

    // --- DEVICE CONTROLS ---
    {
        name: 'media_control',
        description: 'Controls media playback (play, pause, next, previous).',
        parameters: {
            type: 'OBJECT',
            properties: {
                action: { type: 'STRING', description: 'Action: "play_pause", "next", or "previous"' }
            },
            required: ['action']
        },
        nodeType: 'MEDIA_CONTROL'
    },
    {
        name: 'global_action',
        description: 'Performs a global system action (Home, Back, Recents).',
        parameters: {
            type: 'OBJECT',
            properties: {
                action: { type: 'STRING', description: 'Action: "home", "back", or "recents"' }
            },
            required: ['action']
        },
        nodeType: 'GLOBAL_ACTION'
    },
    {
        name: 'screen_wake',
        description: 'Keeps the screen awake or releases it.',
        parameters: {
            type: 'OBJECT',
            properties: {
                keepAwake: { type: 'BOOLEAN', description: 'True to keep awake, False to release' },
                duration: { type: 'INTEGER', description: 'Duration in ms to keep awake (optional)' }
            },
            required: ['keepAwake']
        },
        nodeType: 'SCREEN_WAKE'
    },
    // --- MEMORY ---
    {
        name: 'remember_info',
        description: 'Saves user information or preferences to long-term memory. Use this when user says "My name is X", "I live in Y", etc.',
        parameters: {
            type: 'OBJECT',
            properties: {
                key: { type: 'STRING', description: 'What to update: "preferredName", "homeLocation", "workLocation", "language", "greetingStyle", "timezone"' },
                value: { type: 'STRING', description: 'The value to save (JSON string for complex objects)' }
            },
            required: ['key', 'value']
        },
        nodeType: 'REMEMBER_INFO'
    },
    {
        name: 'search_memory',
        description: 'Searches the vector memory database for relevant information. Use this to retrieve stored information like debtor details, client records, or any previously saved data. Returns similar results based on semantic search.',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: { type: 'STRING', description: 'Search query - be specific about what you are looking for (e.g., "debtor John Smith", "contract 123456")' },
                limit: { type: 'INTEGER', description: 'Maximum number of results to return (default: 5)' },
                threshold: { type: 'NUMBER', description: 'Minimum similarity score 0-1 (default: 0.5)' }
            },
            required: ['query']
        },
        nodeType: 'SEARCH_MEMORY',
        permissions: { requiresConfirmation: false, isSensitive: false }
    },
    {
        name: 'add_to_memory',
        description: 'Adds new information to the vector memory database. Use this to store structured data like client records, debtor information, or any data that needs to be retrieved later.',
        parameters: {
            type: 'OBJECT',
            properties: {
                text: { type: 'STRING', description: 'The text content to store. Include all relevant details.' },
                metadata: { type: 'STRING', description: 'Optional JSON metadata (e.g., {"type": "debtor", "contractNo": "123456"})' }
            },
            required: ['text']
        },
        nodeType: 'ADD_TO_MEMORY',
        permissions: { requiresConfirmation: false, isSensitive: false }
    },
    {
        name: 'bulk_add_to_memory',
        description: 'Adds multiple records to vector memory from sheet data. Parses rows directly using column indices without AI interpretation.',
        parameters: {
            type: 'OBJECT',
            properties: {
                data: { type: 'STRING', description: 'Variable name containing the sheet data' },
                contractColumn: { type: 'INTEGER', description: 'Column index for contract number (0=A, 1=B, etc.)' },
                phoneColumn: { type: 'INTEGER', description: 'Column index for phone number' },
                debtColumn: { type: 'INTEGER', description: 'Column index for debt amount' },
                nameColumn: { type: 'INTEGER', description: 'Optional column index for name' }
            },
            required: ['data', 'contractColumn', 'phoneColumn', 'debtColumn']
        },
        nodeType: 'BULK_ADD_TO_MEMORY',
        permissions: { requiresConfirmation: false, isSensitive: false }
    },
    {
        name: 'clear_memory',
        description: 'Clears all data from vector memory. Use before re-populating with fresh data.',
        parameters: {
            type: 'OBJECT',
            properties: {},
            required: []
        },
        nodeType: 'CLEAR_MEMORY',
        permissions: { requiresConfirmation: true, isSensitive: true }
    }
];

// Helper to convert to Gemini API format
export function getGeminiTools() {
    return [{
        function_declarations: SYSTEM_TOOLS.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }))
    }];
}

// Helper to convert to OpenAI API format (Chat Completions with tools)
export function getOpenAITools() {
    return SYSTEM_TOOLS.map(tool => ({
        type: "function" as const,
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: "object",
                properties: Object.fromEntries(
                    Object.entries(tool.parameters.properties).map(([key, val]: [string, any]) => [
                        key,
                        {
                            type: val.type?.toLowerCase() || 'string',
                            description: val.description || ''
                        }
                    ])
                ),
                required: tool.parameters.required || []
            }
        }
    }));
}

// Helper to convert to Claude API format (Messages API with tools)
export function getClaudeTools() {
    return SYSTEM_TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: {
            type: "object" as const,
            properties: Object.fromEntries(
                Object.entries(tool.parameters.properties).map(([key, val]: [string, any]) => [
                    key,
                    {
                        type: val.type?.toLowerCase() || 'string',
                        description: val.description || ''
                    }
                ])
            ),
            required: tool.parameters.required || []
        }
    }));
}

export function getToolByName(name: string): ToolDefinition | undefined {
    return SYSTEM_TOOLS.find(t => t.name === name);
}

