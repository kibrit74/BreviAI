package com.breviai.brevisettings

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.telephony.SmsMessage
import android.telephony.TelephonyManager
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * BroadcastReceiver for detecting incoming calls and SMS messages.
 * Sends events to JavaScript layer via Expo modules.
 */
class BreviCallSmsReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "BreviCallSmsReceiver"
        
        // Event names for JS layer
        const val EVENT_CALL_STATE = "onCallStateChanged"
        const val EVENT_SMS_RECEIVED = "onSmsReceived"
        
        // Singleton event emitter reference (set by BreviSettingsModule)
        var eventEmitter: ((String, Map<String, Any?>) -> Unit)? = null
    }
    
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        
        when (intent.action) {
            TelephonyManager.ACTION_PHONE_STATE_CHANGED -> handleCallState(intent)
            "android.provider.Telephony.SMS_RECEIVED" -> handleSmsReceived(intent)
        }
    }
    
    private fun handleCallState(intent: Intent) {
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
        val phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
        
        Log.d(TAG, "[CALL] State: $state, Number: $phoneNumber")
        
        val callState = when (state) {
            TelephonyManager.EXTRA_STATE_RINGING -> "Incoming"
            TelephonyManager.EXTRA_STATE_OFFHOOK -> "Connected"
            TelephonyManager.EXTRA_STATE_IDLE -> "Disconnected"
            else -> "Unknown"
        }
        
        val eventData = mapOf(
            "state" to callState,
            "phoneNumber" to (phoneNumber ?: "Unknown"),
            "timestamp" to System.currentTimeMillis()
        )
        
        try {
            eventEmitter?.invoke(EVENT_CALL_STATE, eventData)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit call event: ${e.message}")
        }
    }
    
    private fun handleSmsReceived(intent: Intent) {
        val bundle = intent.extras ?: return
        val pdus = bundle.get("pdus") as? Array<*> ?: return
        val format = bundle.getString("format") ?: "3gpp"
        
        val messages = pdus.mapNotNull { pdu ->
            SmsMessage.createFromPdu(pdu as ByteArray, format)
        }
        
        if (messages.isEmpty()) return
        
        // Combine message parts
        val sender = messages.first().displayOriginatingAddress ?: "Unknown"
        val messageBody = messages.joinToString("") { it.messageBody ?: "" }
        val timestamp = messages.first().timestampMillis
        
        Log.d(TAG, "[SMS] From: $sender, Message: $messageBody")
        
        val eventData = mapOf(
            "sender" to sender,
            "message" to messageBody,
            "timestamp" to timestamp
        )
        
        try {
            eventEmitter?.invoke(EVENT_SMS_RECEIVED, eventData)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit SMS event: ${e.message}")
        }
    }
}
