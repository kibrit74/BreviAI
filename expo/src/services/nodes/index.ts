/**
 * Node Executors Index
 * Re-exports all node executor functions
 */

export { executeTriggerNode } from './triggers';
export { executeControlNode, executeWorkflowNode } from './controls';
export { executeInputNode, executeClipboardReader, executeShowText, executeTextInput, executeShowMenu, executeShowImage } from './inputs';
export { executeOutputNode, executeNotification } from './outputs';
export {
    executeDeviceNode,
    executeSoundMode,
    executeScreenWake,
    executeDNDControl,
    executeBrightnessControl,
    executeFlashlightControl,
    executeGlobalAction,
    executeMediaControl,
    executeBluetoothControl
} from './devices';
export { executeShowOverlay, executeOverlayInput, executeOverlayClear } from './overlay';
export { executeCalendarRead, executeCalendarCreate, executeCalendarUpdate, executeCalendarDelete } from './calendar';
export { executeContactsRead, executeContactsWrite } from './contacts';
export { executeLocationGet, executeBatteryCheck, executeNetworkCheck, executeGeofenceCreate, executeWeatherGet } from './state';
export { executeVolumeControl, executeSpeakText, executeAudioRecord } from './audio';
export { executeFindCallRecording } from './find_call_recording';
export { executeSmsSend, executeEmailSend, executeWhatsAppSend } from './communication';
export { executeHttpRequest, executeOpenUrl, executeRssRead, executeWebAutomation, executeWebSearch } from './web';
export { executeFileWrite, executeFileRead, executeFilePick, executeViewUdf, executeViewDocument } from './files';
export { executeHtmlExtract } from './HtmlNodes';
export { executePdfCreate } from './pdf';
export { executeAlarmSet } from './alarm';
export { executeSpeechToText } from './ai';
export { executeAgentAI } from './agent';
export { executeRealtimeAI } from './realtime_ai';
export {
    executeGoogleSheetsRead,
    executeGoogleSheetsWrite,
    executeGoogleSheetsCreate,
    executeGoogleDriveUpload,
    executeGmailSend,
    executeGmailRead
} from './google';
export {
    executeOutlookSend,
    executeOutlookRead,
    executeExcelRead,
    executeExcelWrite,
    executeExcelCreate,
    executeOneDriveUpload,
    executeOneDriveDownload,
    executeOneDriveList
} from './microsoft';
export { executeImageGenerator, executeImageEdit } from './images';
export { executeAppLaunch } from './apps';
export {
    executeGoogleTranslate,
    executeTelegramSend,
    executeSlackSend,
    executeDiscordSend,
    executeNotionCreate,
    executeNotionRead,
    executePhilipsHue,
    executeRememberInfo,
    executeSwitch,
    executeSearchMemory,
    executeAddToMemory,
    executeBulkAddToMemory,
    executeClearMemory,

    executeFacebookLogin,
    executeInstagramPost
} from './services';

export { executeNavigateTo } from './navigation';
export { executeSettingsOpen } from './settings';
export { executeDatabaseRead, executeDatabaseWrite } from './database';
export { executeCodeExecution, executeSetValues, executeDynamicExecutor } from './processing';
export { executeCronCreate, executeCronDelete, executeCronList, executeBrowserScrape } from './backend';
export { executeCameraCapture } from './camera';
export {
    executeLightSensor,
    executePedometer,
    executeMagnetometer,
    executeBarometer,
    executeGestureTrigger
} from './sensors';
