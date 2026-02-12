package com.breviai.brevisettings

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Context
import android.content.SharedPreferences
import android.content.Intent
import android.app.NotificationManager
import android.os.Build
import android.provider.Settings
import android.content.ComponentName

import android.view.accessibility.AccessibilityNodeInfo
import java.util.Properties
import javax.mail.Folder
import javax.mail.Session
import javax.mail.Store
import javax.mail.search.FlagTerm
import javax.mail.Flags
import javax.mail.Message
import javax.mail.internet.MimeMultipart
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

import android.widget.Toast
import android.appwidget.AppWidgetManager
// import com.breviai.app.ShortcutWidgetProvider removed

import android.hardware.camera2.CameraManager
import org.json.JSONObject
import android.content.pm.PackageManager
import android.content.pm.ApplicationInfo
class BreviSettingsModule : Module() {
    private val appPackageMap = mapOf(
        "netflix" to "com.netflix.mediaclient",
        "youtube" to "com.google.android.youtube",
        "prime video" to "com.amazon.avod.thirdpartyclient",
        "disney+" to "com.disney.disneyplus",
        "hbo max" to "com.hbo.hbonow",
        "twitch" to "tv.twitch.android.app",
        "spotify" to "com.spotify.music",
        "instagram" to "com.instagram.android",
        "facebook" to "com.facebook.katana",
        "twitter" to "com.twitter.android",
        "x" to "com.twitter.android",
        "tiktok" to "com.zhiliaoapp.musically",
        "snapchat" to "com.snapchat.android",
        "whatsapp" to "com.whatsapp",
        "telegram" to "org.telegram.messenger",
        "discord" to "com.discord",
        "gmail" to "com.google.android.gm",
        "chrome" to "com.android.chrome",
        "maps" to "com.google.android.apps.maps",
        "haritalar" to "com.google.android.apps.maps",
        "ayarlar" to "com.android.settings",
        "settings" to "com.android.settings",
        "kamera" to "com.android.camera2",
        "camera" to "com.android.camera2",
        "galeri" to "com.google.android.apps.photos",
        "gallery" to "com.google.android.apps.photos"
    )

    private fun resolvePackageName(context: Context, identifier: String): String? {
        val lowerId = identifier.lowercase()
        // 1. Check hardcoded map
        appPackageMap[lowerId]?.let { return it }

        // 2. Check installed apps for name match
        val pm = context.packageManager
        val installedApps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
        for (app in installedApps) {
            val label = pm.getApplicationLabel(app).toString().lowercase()
            if (label == lowerId || label.contains(lowerId)) {
                return app.packageName
            }
        }
        return null
    }

  override fun definition() = ModuleDefinition {
    Name("BreviSettings")

    // ==== SHORTS BLOCKING ====
    Function("setShortsBlockingEnabled") { enabled: Boolean ->
      val context = appContext.reactContext ?: return@Function null
      val prefs = context.getSharedPreferences("BreviSettings", Context.MODE_PRIVATE)
      prefs.edit().putBoolean("shorts_block_enabled", enabled).apply()
      return@Function true
    }

    Function("isShortsBlockingEnabled") {
      val context = appContext.reactContext ?: return@Function false
      val prefs = context.getSharedPreferences("BreviSettings", Context.MODE_PRIVATE)
      return@Function prefs.getBoolean("shorts_block_enabled", true)
    }

    // ==== DO NOT DISTURB (DND) CONTROL ====
    
    // Check if app has DND access permission
    Function("hasDndAccess") {
      val context = appContext.reactContext ?: return@Function false
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      return@Function notificationManager.isNotificationPolicyAccessGranted
    }

    // Open DND access settings for user to grant permission
    Function("requestDndAccess") {
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      return@Function true
    }

    // Get current DND mode status
    Function("isDoNotDisturbEnabled") {
      val context = appContext.reactContext ?: return@Function false
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      
      // Check if we have permission first
      if (!notificationManager.isNotificationPolicyAccessGranted) {
        return@Function false
      }
      
      val currentFilter = notificationManager.currentInterruptionFilter
      return@Function currentFilter != NotificationManager.INTERRUPTION_FILTER_ALL
    }

    // Set DND mode ON or OFF (requires permission)
    Function("setDoNotDisturb") { enabled: Boolean ->
      val context = appContext.reactContext ?: return@Function false
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      
      // Check if we have permission
      if (!notificationManager.isNotificationPolicyAccessGranted) {
        return@Function false
      }
      
      val filter = if (enabled) {
        NotificationManager.INTERRUPTION_FILTER_PRIORITY // DND ON - only priority notifications
      } else {
        NotificationManager.INTERRUPTION_FILTER_ALL // DND OFF - all notifications
      }
      
      notificationManager.setInterruptionFilter(filter)
      return@Function true
    }

    // ==== ACCESSIBILITY SERVICE ====
    
    Function("isAccessibilityServiceEnabled") {
      return@Function BreviAccessibilityService.isServiceEnabled()
    }
    
    Function("requestAccessibilityPermission") {
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      return@Function null
    }
    
    Function("accessibilityClick") { text: String ->
      if (!BreviAccessibilityService.isServiceEnabled()) return@Function false
      
      val service = BreviAccessibilityService.instance ?: return@Function false
      val node = service.findNodeByText(text)
      
      if (node != null) {
          return@Function service.clickNode(node)
      }
      return@Function false
    }
    
    Function("accessibilityFind") { text: String ->
      if (!BreviAccessibilityService.isServiceEnabled()) return@Function false
      
      val service = BreviAccessibilityService.instance ?: return@Function false
      val node = service.findNodeByText(text)
      return@Function node != null
    }
    
    Function("accessibilityHome") {
        if (!BreviAccessibilityService.isServiceEnabled()) return@Function false
        return@Function BreviAccessibilityService.instance?.globalHome() ?: false
    }
    
    Function("accessibilityBack") {
        if (!BreviAccessibilityService.isServiceEnabled()) return@Function false
        return@Function BreviAccessibilityService.instance?.globalBack() ?: false
    }

    // ==== FLASHLIGHT CONTROL ====
    Function("toggleFlashlight") { enable: Boolean ->
        val context = appContext.reactContext ?: return@Function false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            try {
                val cameraId = cameraManager.cameraIdList[0] // Usually back camera
                cameraManager.setTorchMode(cameraId, enable)
                return@Function true
            } catch (e: Exception) {
                e.printStackTrace()
                return@Function false
            }
        }
        return@Function false
    }

    // ==== BLUETOOTH CONTROL ====
    Function("openBluetoothSettings") {
        val context = appContext.reactContext ?: return@Function false
        try {
            val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            return@Function true
        } catch (e: Exception) {
            e.printStackTrace()
            return@Function false
        }
    }

    // Enable or disable Bluetooth
    Function("setBluetooth") { enable: Boolean ->
        val context = appContext.reactContext ?: return@Function false
        try {
            val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as android.bluetooth.BluetoothManager
            val bluetoothAdapter = bluetoothManager.adapter ?: return@Function false
            
            if (enable) {
                // Note: Direct enable/disable requires BLUETOOTH_ADMIN permission
                // On Android 12+ this opens settings instead
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // Android 12+ - open Bluetooth settings
                    val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                    return@Function true
                } else {
                    @Suppress("DEPRECATION")
                    return@Function bluetoothAdapter.enable()
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                    return@Function true
                } else {
                    @Suppress("DEPRECATION")
                    return@Function bluetoothAdapter.disable()
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("BreviSettings", "setBluetooth error: ${e.message}")
            e.printStackTrace()
            return@Function false
        }
    }

    // Check if Bluetooth is enabled
    Function("isBluetoothEnabled") {
        val context = appContext.reactContext ?: return@Function false
        try {
            val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as android.bluetooth.BluetoothManager
            val bluetoothAdapter = bluetoothManager.adapter ?: return@Function false
            return@Function bluetoothAdapter.isEnabled
        } catch (e: Exception) {
            return@Function false
        }
    }

    // ==== RINGER MODE CONTROL ====
    
    // Get current ringer mode (0=silent, 1=vibrate, 2=normal)
    Function("getRingerMode") {
        val context = appContext.reactContext ?: return@Function -1
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
            return@Function audioManager.ringerMode
        } catch (e: Exception) {
            e.printStackTrace()
            return@Function -1
        }
    }

    // Set ringer mode (0=silent, 1=vibrate, 2=normal)
    Function("setRingerMode") { mode: Int ->
        val context = appContext.reactContext ?: return@Function false
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
            
            // Check DND permission for silent mode on Android N+
            if (mode == android.media.AudioManager.RINGER_MODE_SILENT && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                if (!notificationManager.isNotificationPolicyAccessGranted) {
                    // Request DND access
                    val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(intent)
                    return@Function false
                }
            }
            
            audioManager.ringerMode = mode
            android.util.Log.d("BreviSettings", "Ringer mode set to: $mode")
            return@Function true
        } catch (e: Exception) {
            android.util.Log.e("BreviSettings", "setRingerMode error: ${e.message}")
            e.printStackTrace()
            return@Function false
        }
    }

    // ==== VOLUME CONTROL ====
    Function("setVolume") { level: Int, streamType: String ->
        val context = appContext.reactContext ?: return@Function false
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
            
            val stream = when (streamType.lowercase()) {
                "media", "music" -> android.media.AudioManager.STREAM_MUSIC
                "ringtone", "ring" -> android.media.AudioManager.STREAM_RING
                "alarm" -> android.media.AudioManager.STREAM_ALARM
                "notification" -> android.media.AudioManager.STREAM_NOTIFICATION
                "system" -> android.media.AudioManager.STREAM_SYSTEM
                "voice", "call" -> android.media.AudioManager.STREAM_VOICE_CALL
                else -> android.media.AudioManager.STREAM_MUSIC
            }
            
            val maxVolume = audioManager.getStreamMaxVolume(stream)
            val targetVolume = (level * maxVolume / 100).coerceIn(0, maxVolume)
            
            audioManager.setStreamVolume(stream, targetVolume, 0)
            return@Function true
        } catch (e: Exception) {
            e.printStackTrace()
            return@Function false
        }
    }

    Function("getVolume") { streamType: String ->
        val context = appContext.reactContext ?: return@Function -1
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
            
            val stream = when (streamType.lowercase()) {
                "media", "music" -> android.media.AudioManager.STREAM_MUSIC
                "ringtone", "ring" -> android.media.AudioManager.STREAM_RING
                "alarm" -> android.media.AudioManager.STREAM_ALARM
                "notification" -> android.media.AudioManager.STREAM_NOTIFICATION
                "system" -> android.media.AudioManager.STREAM_SYSTEM
                "voice", "call" -> android.media.AudioManager.STREAM_VOICE_CALL
                else -> android.media.AudioManager.STREAM_MUSIC
            }
            
            val current = audioManager.getStreamVolume(stream)
            val max = audioManager.getStreamMaxVolume(stream)
            return@Function (current * 100 / max)
        } catch (e: Exception) {
            e.printStackTrace()
            return@Function -1
        }
    }

    // ==== SENSOR SERVICE CONTROL ====
    Function("startSensorService") {
        val context = appContext.reactContext ?: return@Function null
        val intent = Intent(context, SensorAutomationService::class.java)
        context.startService(intent)
        return@Function null
    }

    // ==== APP LAUNCHER & INFO ====
    Function("launchApp") { identifier: String ->
        val context = appContext.reactContext ?: return@Function false
        val packageManager = context.packageManager
        
        android.util.Log.d("BreviSettings", "launchApp called with: $identifier")
        
        // Try to resolve the package name from the identifier (e.g. "Netflix" -> "com.netflix.mediaclient")
        // If it looks like a package name (contains dot), try it directly first, otherwise resolve.
        var packageName = identifier
        if (!identifier.contains(".")) {
            val resolved = resolvePackageName(context, identifier)
            if (resolved != null) {
                packageName = resolved
                android.util.Log.d("BreviSettings", "Resolved '$identifier' to '$packageName'")
            }
        }

        try {
            android.util.Log.d("BreviSettings", "Getting launch intent for: $packageName")
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                android.util.Log.d("BreviSettings", "Found launch intent, starting activity")
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launchIntent)
                return@Function true
            } else {
                android.util.Log.d("BreviSettings", "No launch intent found for: $packageName")
                 // Try one more time with resolution if we assumed it was a package name but failed
                 if (identifier.contains(".")) {
                    val resolved = resolvePackageName(context, identifier)
                    if (resolved != null) {
                         android.util.Log.d("BreviSettings", "Retry with resolved: $resolved")
                         val retryIntent = packageManager.getLaunchIntentForPackage(resolved)
                         if (retryIntent != null) {
                            retryIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            context.startActivity(retryIntent)
                            return@Function true
                         }
                    }
                 }
            }
        } catch (e: Exception) {
            android.util.Log.e("BreviSettings", "Exception in launchApp: ${e.message}")
            e.printStackTrace()
        }
        android.util.Log.d("BreviSettings", "launchApp returning false for: $identifier")
        return@Function false
    }

    Function("getInstalledApps") {
        val context = appContext.reactContext ?: return@Function emptyList<String>()
        val packageManager = context.packageManager
        // Get all installed apps that can be launched (formatted as "AppName (package.name)")
        val apps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
            .filter { app -> 
                // ONLY include apps that have a launch intent (can actually be opened)
                packageManager.getLaunchIntentForPackage(app.packageName) != null
            }
            .map { app ->
                val label = packageManager.getApplicationLabel(app).toString()
                "$label (${app.packageName})"
            }
            .sortedBy { it.lowercase() } // Sort alphabetically
            .take(150) // Increased limit to 150
        
        return@Function apps
    }

    Function("stopSensorService") {
        val context = appContext.reactContext ?: return@Function null
        val intent = Intent(context, SensorAutomationService::class.java)
        context.stopService(intent)
        return@Function null
    }

    // ==== AUTOMATION SERVICE CONTROL ====
    Function("startAutomationService") {
        val context = appContext.reactContext ?: return@Function false
        try {
            val intent = Intent()
            intent.setClassName(context.packageName, "com.breviai.app.AutomationService")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            return@Function true
        } catch (e: Exception) {
            e.printStackTrace()
            return@Function false
        }
    }

    Function("stopAutomationService") {
        val context = appContext.reactContext ?: return@Function false
        try {
            val intent = Intent()
            intent.setClassName(context.packageName, "com.breviai.app.AutomationService")
            context.stopService(intent)
            return@Function true
        } catch (e: Exception) {
            e.printStackTrace()
            return@Function false
        }
    }

    Function("isAutomationServiceRunning") {
        // Note: Checking if a service is running is tricky on newer Android versions
        // For simplicity, we'll return true if the service was started
        return@Function true
    }

    // ==== MEDIA CONTROL ====
    Function("mediaPlayPause") {
        val context = appContext.reactContext ?: return@Function false
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
        val eventTime = android.os.SystemClock.uptimeMillis()
        
        val downEvent = android.view.KeyEvent(eventTime, eventTime, android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, 0)
        audioManager.dispatchMediaKeyEvent(downEvent)
        
        val upEvent = android.view.KeyEvent(eventTime, eventTime, android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, 0)
        audioManager.dispatchMediaKeyEvent(upEvent)
        
        return@Function true
    }

    Function("mediaNext") {
        val context = appContext.reactContext ?: return@Function false
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
        val eventTime = android.os.SystemClock.uptimeMillis()
        
        val downEvent = android.view.KeyEvent(eventTime, eventTime, android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_NEXT, 0)
        audioManager.dispatchMediaKeyEvent(downEvent)
        
        val upEvent = android.view.KeyEvent(eventTime, eventTime, android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_MEDIA_NEXT, 0)
        audioManager.dispatchMediaKeyEvent(upEvent)
        
        return@Function true
    }

    Function("mediaPrevious") {
        val context = appContext.reactContext ?: return@Function false
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
        val eventTime = android.os.SystemClock.uptimeMillis()
        
        val downEvent = android.view.KeyEvent(eventTime, eventTime, android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_PREVIOUS, 0)
        audioManager.dispatchMediaKeyEvent(downEvent)
        
        val upEvent = android.view.KeyEvent(eventTime, eventTime, android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_MEDIA_PREVIOUS, 0)
        audioManager.dispatchMediaKeyEvent(upEvent)
        
        return@Function true
    }

    // ==== WIDGET MANAGEMENT ====
    
    AsyncFunction("updateWidget") { widgetId: String, configJson: String, promise: expo.modules.kotlin.Promise ->
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val context = appContext.reactContext ?: return@launch
                
                // Save config to SharedPreferences for native widget to read
                val prefs = context.getSharedPreferences("WidgetConfigs", Context.MODE_PRIVATE)
                val encodedConfig = android.util.Base64.encodeToString(
                    configJson.toByteArray(),
                    android.util.Base64.DEFAULT
                )
                prefs.edit().putString(widgetId, encodedConfig).apply()
                
                // Trigger widget update for ALL instances
                // Since our RN app primarily manages a 'default' config used by most widgets,
                // or specific configs that might be mapped via fallback mechanisms,
                // we should ensure ALL widgets refresh their view.
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = android.content.ComponentName(context, "com.breviai.app.ShortcutWidgetProvider")
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                
                val intent = Intent().setClassName(context, "com.breviai.app.ShortcutWidgetProvider").apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
                }
                context.sendBroadcast(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("WIDGET_UPDATE_ERROR", "Failed to update widget: ${e.message}", e)
            }
        }
    }

    AsyncFunction("executeWidgetWorkflow") { shortcutId: String, promise: expo.modules.kotlin.Promise ->
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // This should integrate with WorkflowEngine
                // For now, we'll open the app with the shortcut ID
                val context = appContext.reactContext ?: return@launch
                val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                intent?.apply {
                    putExtra("shortcut_id", shortcutId)
                    putExtra("source", "widget")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                context.startActivity(intent)
                
                withContext(Dispatchers.Main) {
                    promise.resolve(true)
                }
            } catch (e: Exception) {
                promise.reject("WORKFLOW_EXECUTION_ERROR", "Failed to execute workflow: ${e.message}", e)
            }
        }
    }

    AsyncFunction("openBreviAI") { payload: Map<String, Any>, promise: expo.modules.kotlin.Promise ->
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val context = appContext.reactContext ?: return@launch
                val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                intent?.apply {
                    putExtra("widget_payload", java.util.HashMap(payload))
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                }
                context.startActivity(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("APP_LAUNCH_ERROR", "Failed to open BreviAI: ${e.message}", e)
            }
        }
    }

    AsyncFunction("executeSystemAction") { action: Map<String, Any>, promise: expo.modules.kotlin.Promise ->
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val mode = action["mode"] as? String
                val context = appContext.reactContext ?: return@launch
                
                when (mode) {
                    "cinema" -> {
                        // Enable DND, launch Netflix, set volume
                        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                        if (notificationManager.isNotificationPolicyAccessGranted) {
                            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
                        }
                        
                        val netflixIntent = context.packageManager.getLaunchIntentForPackage("com.netflix.mediaclient")
                        netflixIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        netflixIntent?.let { context.startActivity(it) }
                    }
                    "night" -> {
                        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                        if (notificationManager.isNotificationPolicyAccessGranted) {
                            notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
                        }
                    }
                    "power_saver" -> {
                        val batteryIntent = Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS)
                        batteryIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        context.startActivity(batteryIntent)
                    }
                }
                
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SYSTEM_ACTION_ERROR", "Failed to execute system action: ${e.message}", e)
            }
        }
    }

    AsyncFunction("getWidgetConfig") { widgetId: String, promise: expo.modules.kotlin.Promise ->
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val context = appContext.reactContext ?: return@launch
                val prefs = context.getSharedPreferences("WidgetConfigs", Context.MODE_PRIVATE)
                val configJson = prefs.getString(widgetId, null)
                promise.resolve(configJson)
            } catch (e: Exception) {
                promise.reject("STORAGE_ERROR", "Failed to get widget config: ${e.message}", e)
            }
        }
    }

    AsyncFunction("saveWidgetConfig") { widgetId: String, config: Map<String, Any>, promise: expo.modules.kotlin.Promise ->
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val context = appContext.reactContext ?: return@launch
                val prefs = context.getSharedPreferences("WidgetConfigs", Context.MODE_PRIVATE)
                val configJson = android.util.Base64.encodeToString(
                    JSONObject(config).toString().toByteArray(), 
                    android.util.Base64.DEFAULT
                )
                prefs.edit().putString(widgetId, configJson).apply()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("STORAGE_ERROR", "Failed to save widget config: ${e.message}", e)
            }
        }
    }
    // ==== IMAP EMAIL FETCHING ====
    AsyncFunction("fetchEmails") { host: String, port: Int, user: String, pass: String, maxCount: Int, promise: expo.modules.kotlin.Promise ->
      CoroutineScope(Dispatchers.IO).launch {
        try {
          val props = Properties()
          props["mail.store.protocol"] = "imaps"
          props["mail.imaps.host"] = host
          props["mail.imaps.port"] = port.toString()
          props["mail.imaps.ssl.enable"] = "true"

          val session = Session.getDefaultInstance(props)
          val store = session.getStore("imaps")
          store.connect(host, user, pass)

          val inbox = store.getFolder("INBOX")
          inbox.open(Folder.READ_ONLY)

          val messages = inbox.messages
          val total = messages.size
          val start = Math.max(0, total - maxCount)
          val recentMessages = inbox.getMessages(start + 1, total)

          val results = mutableListOf<Map<String, String>>()

          for (i in recentMessages.indices.reversed()) {
            val msg = recentMessages[i]
            val subject = msg.subject ?: "(No Subject)"
            val from = msg.from?.joinToString { it.toString() } ?: "(Unknown)"
            var content = "Content not available"
            
            try {
                content = getTextFromMessage(msg)
            } catch (e: Exception) {
                content = "Could not read content: ${e.message}"
            }

            results.add(mapOf(
              "subject" to subject,
              "from" to from,
              "body" to content.take(500) // Limit body length
            ))
          }

          inbox.close(false)
          store.close()

          promise.resolve(results)
        } catch (e: Exception) {
          promise.reject("IMAP_ERROR", "Failed to fetch emails: ${e.message}", e)
        }
      }
    }

    }

    private fun getTextFromMessage(message: Message): String {
        return when (val content = message.content) {
            is String -> content
            is MimeMultipart -> getTextFromMimeMultipart(content)
            else -> content.toString()
        }
    }

    private fun getTextFromMimeMultipart(mimeMultipart: MimeMultipart): String {
        val count = mimeMultipart.count
        if (count == 0) return ""
        
        // Try to find plain text first
        for (i in 0 until count) {
            val bodyPart = mimeMultipart.getBodyPart(i)
            if (bodyPart.isMimeType("text/plain")) {
                return bodyPart.content.toString()
            }
        }
        
        // Fallback to HTML or other
        for (i in 0 until count) {
            val bodyPart = mimeMultipart.getBodyPart(i)
            if (bodyPart.isMimeType("text/html")) {
                 return org.jsoup.Jsoup.parse(bodyPart.content.toString()).text() 
            } else if (bodyPart.content is MimeMultipart) {
                return getTextFromMimeMultipart(bodyPart.content as MimeMultipart)
            }
        }
        return ""
    }
}

