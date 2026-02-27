package com.breviai.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.widget.Toast
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Background service for motion/gesture trigger detection.
 * Runs as a foreground service to detect shake, flip, tap gestures even when app is closed.
 */
class MotionTriggerService : Service(), SensorEventListener {

    companion object {
        const val TAG = "MotionTriggerService"
        const val CHANNEL_ID = "breviai_motion_channel"
        const val NOTIFICATION_ID = 1002
        const val PREFS_NAME = "MotionTriggerPrefs"
        
        // Gesture types
        const val GESTURE_SHAKE = "shake"
        const val GESTURE_FLIP = "flip"
        const val GESTURE_FACE_DOWN = "face_down"
        const val GESTURE_FACE_UP = "face_up"
        const val GESTURE_DOUBLE_TAP = "double_tap"
        const val GESTURE_TRIPLE_TAP = "triple_tap"
        const val GESTURE_QUADRUPLE_TAP = "quadruple_tap"
        const val GESTURE_QUINTUPLE_TAP = "quintuple_tap"
        const val GESTURE_SEXTUPLE_TAP = "sextuple_tap"
        
        // Sensitivity thresholds
        private const val SHAKE_THRESHOLD_LOW = 600
        private const val SHAKE_THRESHOLD_MEDIUM = 800
        private const val SHAKE_THRESHOLD_HIGH = 1000
        
        fun start(context: Context) {
            val intent = Intent(context, MotionTriggerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stop(context: Context) {
            val intent = Intent(context, MotionTriggerService::class.java)
            context.stopService(intent)
        }
        
        /**
         * Register a workflow to be triggered by a gesture
         */
        fun registerGestureTrigger(
            context: Context,
            workflowId: String,
            gesture: String,
            sensitivity: String = "medium"
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val triggersJson = prefs.getString("triggers", "[]") ?: "[]"
            val triggers = JSONArray(triggersJson)
            
            // Check if already registered
            for (i in 0 until triggers.length()) {
                val t = triggers.getJSONObject(i)
                if (t.getString("workflowId") == workflowId) {
                    // Update existing
                    t.put("gesture", gesture)
                    t.put("sensitivity", sensitivity)
                    prefs.edit().putString("triggers", triggers.toString()).apply()
                    return
                }
            }
            
            // Add new
            val trigger = JSONObject().apply {
                put("workflowId", workflowId)
                put("gesture", gesture)
                put("sensitivity", sensitivity)
            }
            triggers.put(trigger)
            prefs.edit().putString("triggers", triggers.toString()).apply()
            
            Log.d(TAG, "Registered gesture trigger: $gesture -> $workflowId")
        }
        
        /**
         * Unregister a gesture trigger
         */
        fun unregisterGestureTrigger(context: Context, workflowId: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val triggersJson = prefs.getString("triggers", "[]") ?: "[]"
            val triggers = JSONArray(triggersJson)
            val newTriggers = JSONArray()
            
            for (i in 0 until triggers.length()) {
                val t = triggers.getJSONObject(i)
                if (t.getString("workflowId") != workflowId) {
                    newTriggers.put(t)
                }
            }
            
            prefs.edit().putString("triggers", newTriggers.toString()).apply()
            Log.d(TAG, "Unregistered gesture trigger for: $workflowId")
        }
    }
    
    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    
    // Shake detection
    private var lastUpdate: Long = 0
    private var lastX = 0f
    private var lastY = 0f
    private var lastZ = 0f
    private var currentShakeThreshold = SHAKE_THRESHOLD_MEDIUM
    
    // Flip detection
    private var isFaceDown = false
    private var lastFlipTime: Long = 0
    
    // Tap detection
    private var tapTimes = mutableListOf<Long>()
    private val TAP_THRESHOLD_G = 1.5f // Rest is ~1G, taps are typically >1.5G
    private val TAP_WINDOW = 1600L // Time window for grouping 2-6 taps
    private val TAP_SETTLE_MS = 400L // Quiet period before resolving tap count
    private val TAP_SAMPLE_DEBOUNCE_MS = 80L // Prevent one tap from counting multiple times
    private var lastTapDetectedAt: Long = 0
    
    // Debounce
    private val lastGestureTriggerTimes = mutableMapOf<String, Long>()
    private val DEBOUNCE_TIME = 2000L // 2 seconds between triggers
    
    // Registered triggers
    private var registeredTriggers = mutableListOf<GestureTriggerConfig>()
    
    data class GestureTriggerConfig(
        val workflowId: String,
        val gesture: String,
        val sensitivity: String
    )

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        
        loadRegisteredTriggers()
        
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
            Log.d(TAG, "Motion trigger service started with ${registeredTriggers.size} triggers")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        sensorManager.unregisterListener(this)
        Log.d(TAG, "Motion trigger service stopped")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        loadRegisteredTriggers()
        return START_STICKY
    }


    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ACCELEROMETER || registeredTriggers.isEmpty()) {
            return
        }

        detectShake(event)
        detectFlip(event)
        detectTaps(event)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // no-op
    }

    private fun detectShake(event: SensorEvent) {
        // Tap dizisi sırasında shake algılamayı bastır
        if (tapTimes.isNotEmpty()) return

        val curTime = System.currentTimeMillis()
        if ((curTime - lastUpdate) > 100) {
            val diffTime = (curTime - lastUpdate)
            lastUpdate = curTime

            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]

            val speed = abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000

            if (speed > currentShakeThreshold) {
                triggerGesture(GESTURE_SHAKE)
            }

            lastX = x
            lastY = y
            lastZ = z
        }
    }
    
    private fun detectFlip(event: SensorEvent) {
        val z = event.values[2]
        val curTime = System.currentTimeMillis()
        
        if (z < -8.0f && !isFaceDown) {
            isFaceDown = true
            lastFlipTime = curTime
            triggerGesture(GESTURE_FACE_DOWN)
        } else if (z > 8.0f && isFaceDown) {
            // Face-up after face-down (and stable for a short time)
            if (curTime - lastFlipTime > 300) {
                isFaceDown = false
                triggerGesture(GESTURE_FACE_UP)
                triggerGesture(GESTURE_FLIP)
            }
        }
    }
    
    private fun detectTaps(event: SensorEvent) {
        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        
        val gForce = sqrt(x * x + y * y + z * z) / 9.81f
        val curTime = System.currentTimeMillis()
        
        // Detect sharp tap
        if (gForce > TAP_THRESHOLD_G && (curTime - lastTapDetectedAt) > TAP_SAMPLE_DEBOUNCE_MS) {
            lastTapDetectedAt = curTime
            tapTimes.add(curTime)
            
            // Clean old taps
            tapTimes.removeAll { curTime - it > TAP_WINDOW }
        }

        // Resolve tap sequence after a short quiet period
        if (tapTimes.isNotEmpty() && (curTime - tapTimes.last()) > TAP_SETTLE_MS) {
            val count = tapTimes.size
            tapTimes.clear()

            when {
                count >= 6 -> triggerGesture(GESTURE_SEXTUPLE_TAP)
                count == 5 -> triggerGesture(GESTURE_QUINTUPLE_TAP)
                count == 4 -> triggerGesture(GESTURE_QUADRUPLE_TAP)
                count == 3 -> triggerGesture(GESTURE_TRIPLE_TAP)
                count == 2 -> triggerGesture(GESTURE_DOUBLE_TAP)
            }
        }
    }
    
    private fun triggerGesture(gesture: String) {
        val curTime = System.currentTimeMillis()
        val lastGestureTriggerTime = lastGestureTriggerTimes[gesture] ?: 0L
        
        // Debounce
        if (curTime - lastGestureTriggerTime < DEBOUNCE_TIME) {
            Log.d(TAG, "Gesture debounced: $gesture")
            return
        }
        lastGestureTriggerTimes[gesture] = curTime
        
        Log.d(TAG, "Gesture detected: $gesture")
        
        // Find matching triggers
        for (trigger in registeredTriggers) {
            if (trigger.gesture == gesture) {
                Log.d(TAG, "Triggering workflow: ${trigger.workflowId}")
                
                // Vibrate feedback
                vibrate(100)
                
                // Show toast
                val message = when (gesture) {
                    GESTURE_SHAKE -> "Sallama algilandi!"
                    GESTURE_FLIP -> "Cevirme algilandi!"
                    GESTURE_DOUBLE_TAP -> "Cift dokunus!"
                    GESTURE_TRIPLE_TAP -> "Uclu dokunus!"
                    else -> "Hareket algilandi!"
                }
                Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
                
                // Execute workflow in background with gesture context
                val executeIntent = WorkflowExecutionReceiver.createIntent(
                    this, 
                    trigger.workflowId,
                    triggerType = "gesture",
                    gestureType = gesture
                )
                sendBroadcast(executeIntent)
            }
        }
    }
    
    private fun loadRegisteredTriggers() {
        registeredTriggers.clear()
        
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val triggersJson = prefs.getString("triggers", "[]") ?: "[]"
        
        try {
            val triggers = JSONArray(triggersJson)
            for (i in 0 until triggers.length()) {
                val t = triggers.getJSONObject(i)
                registeredTriggers.add(GestureTriggerConfig(
                    workflowId = t.getString("workflowId"),
                    gesture = t.getString("gesture"),
                    sensitivity = t.optString("sensitivity", "medium")
                ))
            }
            
            // Update shake threshold based on sensitivity
            updateShakeThreshold()
            
            Log.d(TAG, "Loaded ${registeredTriggers.size} gesture triggers")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load triggers: ${e.message}")
        }
    }
    
    private fun updateShakeThreshold() {
        // Use the lowest sensitivity among all shake triggers
        val shakeTriggers = registeredTriggers.filter { it.gesture == GESTURE_SHAKE }
        
        currentShakeThreshold = when {
            shakeTriggers.any { it.sensitivity == "high" } -> SHAKE_THRESHOLD_HIGH
            shakeTriggers.any { it.sensitivity == "low" } -> SHAKE_THRESHOLD_LOW
            else -> SHAKE_THRESHOLD_MEDIUM
        }
    }
    
    private fun vibrate(duration: Long) {
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(duration)
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Hareket Algılama",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Hareket tetikleyicileri arka planda çalışıyor"
                setShowBadge(false)
            }
            
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Hareket Algılama Aktif")
            .setContentText("Sallama, çevirme algılanıyor")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
