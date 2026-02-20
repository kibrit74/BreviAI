package com.breviai.brevisettings

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Context
import android.content.Intent
import android.app.NotificationManager
import android.os.Build
import android.provider.Settings

import java.util.Properties
import javax.mail.Folder
import javax.mail.Session
import javax.mail.Message
import javax.mail.internet.MimeMultipart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

import android.appwidget.AppWidgetManager

import android.hardware.camera2.CameraManager
import org.json.JSONObject
import android.content.pm.PackageManager

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
        appPackageMap[lowerId]?.let { return it }

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
    
    Function("hasDndAccess") {
      val context = appContext.reactContext ?: return@Function false
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      return@Function notificationManager.isNotificationPolicyAccessGranted
    }

    Function("requestDndAccess") {
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      return@Function true
    }

    Function("isDoNotDisturbEnabled") {
      val context = appContext.reactContext ?: return@Function false
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      
      if (!notificationManager.isNotificationPolicyAccessGranted) {
        return@Function false
      }
      
      val currentFilter = notificationManager.currentInterruptionFilter
      return@Function currentFilter != NotificationManager.INTERRUPTION_FILTER_ALL
    }

    Function("setDoNotDisturb") { enabled: Boolean ->
      val context = appContext.reactContext ?: return@Function false
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      
      if (!notificationManager.isNotificationPolicyAccessGranted) {
        return@Function false
      }
      
      val filter = if (enabled) {
        NotificationManager.INTERRUPTION_FILTER_PRIORITY
      } else {
        NotificationManager.INTERRUPTION_FILTER_ALL
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
                val cameraId = cameraManager.cameraIdList[0]
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

    Function("setBluetooth") { enable: Boolean ->
        val context = appContext.reactContext ?: return@Function false
        try {
            val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as android.bluetooth.BluetoothManager
            val bluetoothAdapter = bluetoothManager.adapter ?: return@Function false
            
            if (enable) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
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

    Function("setRingerMode") { mode: Int ->
        val context = appContext.reactContext ?: return@Function false
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
            
            if (mode == android.media.AudioManager.RINGER_MODE_SILENT && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                if (!notificationManager.isNotificationPolicyAccessGranted) {
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
        val apps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
            .filter { app -> 
                packageManager.getLaunchIntentForPackage(app.packageName) != null
            }
            .map { app ->
                val label = packageManager.getApplicationLabel(app).toString()
                "$label (${app.packageName})"
            }
            .sortedBy { it.lowercase() }
            .take(150)
        
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
    
    AsyncFunction("updateWidget") { widgetId: String, configJson: String ->
        val context = appContext.reactContext
            ?: throw Exception("React context is not available")
        
        val prefs = context.getSharedPreferences("WidgetConfigs", Context.MODE_PRIVATE)
        val encodedConfig = android.util.Base64.encodeToString(
            configJson.toByteArray(),
            android.util.Base64.DEFAULT
        )
        prefs.edit().putString(widgetId, encodedConfig).apply()
        
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = android.content.ComponentName(context, "com.breviai.app.ShortcutWidgetProvider")
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
        
        val intent = Intent().setClassName(context, "com.breviai.app.ShortcutWidgetProvider").apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
        }
        context.sendBroadcast(intent)
        return@AsyncFunction true
    }

    AsyncFunction("executeWidgetWorkflow") { shortcutId: String ->
        val context = appContext.reactContext
            ?: throw Exception("React context is not available")

        val executeIntent = Intent().setClassName(
            context,
            "com.breviai.app.WorkflowExecutionReceiver"
        ).apply {
            action = "com.breviai.app.EXECUTE_WORKFLOW"
            putExtra("workflowId", shortcutId)
            putExtra("_triggerType", "widget")
        }
        context.sendBroadcast(executeIntent)
        return@AsyncFunction true
    }

    AsyncFunction("openBreviAI") { payload: Map<String, Any?> ->
        val context = appContext.reactContext
            ?: throw Exception("React context is not available")
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: throw Exception("Launch intent not found for package ${context.packageName}")

        launchIntent.apply {
            putExtra("widget_payload", java.util.HashMap(payload))
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        context.startActivity(launchIntent)
        return@AsyncFunction true
    }

    AsyncFunction("executeSystemAction") { action: Map<String, Any?> ->
        val mode = action["mode"] as? String
        val context = appContext.reactContext
            ?: throw Exception("React context is not available")
        
        when (mode) {
            "cinema" -> {
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
        
        return@AsyncFunction true
    }

    AsyncFunction("getWidgetConfig") { widgetId: String ->
        val context = appContext.reactContext
            ?: throw Exception("React context is not available")
        val prefs = context.getSharedPreferences("WidgetConfigs", Context.MODE_PRIVATE)
        return@AsyncFunction prefs.getString(widgetId, null)
    }

    AsyncFunction("saveWidgetConfig") { widgetId: String, config: Map<String, Any?> ->
        val context = appContext.reactContext
            ?: throw Exception("React context is not available")
        val prefs = context.getSharedPreferences("WidgetConfigs", Context.MODE_PRIVATE)
        val configJson = android.util.Base64.encodeToString(
            JSONObject(config).toString().toByteArray(), 
            android.util.Base64.DEFAULT
        )
        prefs.edit().putString(widgetId, configJson).apply()
        return@AsyncFunction true
    }

    // ==== IMAP EMAIL FETCHING ====
    AsyncFunction("fetchEmails") { host: String, port: Int, user: String, pass: String, maxCount: Int ->
      withContext(Dispatchers.IO) {
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
              "body" to content.take(500)
            ))
          }

          inbox.close(false)
          store.close()

          results
      }
    }

    } // end of ModuleDefinition

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
        
        for (i in 0 until count) {
            val bodyPart = mimeMultipart.getBodyPart(i)
            if (bodyPart.isMimeType("text/plain")) {
                return bodyPart.content.toString()
            }
        }
        
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
