package com.breviai.brevisettings

import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.hardware.camera2.CameraManager
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.widget.Toast
import kotlin.math.sqrt

class SensorAutomationService : Service(), SensorEventListener {

    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    private var proximity: Sensor? = null
    
    // Shake detection variables
    private var lastUpdate: Long = 0
    private var lastX = 0f
    private var lastY = 0f
    private var lastZ = 0f
    private val SHAKE_THRESHOLD = 800 // Sensitivity
    
    // Flip detection
    private var isFaceDown = false
    private val FLIP_HYSTERESIS = 1000L // 1 sec stable time required? No, simpler for now.
    
    // Flashlight state
    private var isFlashlightOn = false
    
    // Features Config (Static for simplicity across service restarts or shared prefs better)
    companion object {
        var SHAKE_ENABLED = true
        var FLIP_ENABLED = true
    }

    override fun onBind(intent: Intent): IBinder? {
        return null
    }

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        proximity = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY)

        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
        }
        
        Toast.makeText(this, "BreviAI Sensör: Sallama ve Çevirme Aktif", Toast.LENGTH_SHORT).show()
    }

    override fun onDestroy() {
        super.onDestroy()
        sensorManager.unregisterListener(this)
        Toast.makeText(this, "Sensör Servisi Durduruldu", Toast.LENGTH_SHORT).show()
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            if (SHAKE_ENABLED) detectShake(event)
            if (FLIP_ENABLED) detectFlip(event)
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Not used
    }

    private fun detectShake(event: SensorEvent) {
        val curTime = System.currentTimeMillis()
        if ((curTime - lastUpdate) > 100) {
            val diffTime = (curTime - lastUpdate)
            lastUpdate = curTime

            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]

            val speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000

            if (speed > SHAKE_THRESHOLD) {
                // Shake detected! 
                toggleFlashlight()
                vibrate(100)
            }

            lastX = x
            lastY = y
            lastZ = z
        }
    }
    
    private fun detectFlip(event: SensorEvent) {
        val z = event.values[2] // Z axis -9.8 when face down
        
        if (z < -9.0 && !isFaceDown) {
            isFaceDown = true
            // Action: Enable DND (Silent Mode)
            setDnd(true)
            vibrate(50) 
        } else if (z > 5.0 && isFaceDown) {
            isFaceDown = false
            // Action: Disable DND (Normal Mode)
            setDnd(false)
            vibrate(50)
        }
    }
    
    private fun setDnd(enable: Boolean) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        if (notificationManager.isNotificationPolicyAccessGranted) {
             val filter = if (enable) {
                android.app.NotificationManager.INTERRUPTION_FILTER_PRIORITY // or NONE
             } else {
                android.app.NotificationManager.INTERRUPTION_FILTER_ALL
             }
             notificationManager.setInterruptionFilter(filter)
             // Optional: Toast
             // handler.post { Toast... }
        }
    }

    private fun toggleFlashlight() {
         if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val cameraManager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
            try {
                val cameraId = cameraManager.cameraIdList[0] 
                // Toggle state
                isFlashlightOn = !isFlashlightOn
                cameraManager.setTorchMode(cameraId, isFlashlightOn)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun vibrate(duration: Long) {
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            vibrator.vibrate(duration)
        }
    }
}
