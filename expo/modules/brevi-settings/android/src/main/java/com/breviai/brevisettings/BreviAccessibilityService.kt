package com.breviai.brevisettings

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.util.Log

class BreviAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "onServiceConnected")
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Listening for events if needed in the future
    }

    override fun onInterrupt() {
        Log.d(TAG, "onInterrupt")
        instance = null
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
    }

    fun findNodeByText(text: String): AccessibilityNodeInfo? {
        val root = rootInActiveWindow ?: return null
        val ignoreCase = true
        
        // Exact match first
        var nodes = root.findAccessibilityNodeInfosByText(text)
        if (nodes != null && nodes.isNotEmpty()) {
             // Return finding visible node
             for (node in nodes) {
                 if (node.isVisibleToUser) return node
             }
             return nodes[0]
        }
        
        // Manual recursive search for partial/case-insensitive match if needed
        // For now rely on standard API
        return null
    }
    
    fun findNodeById(viewId: String): AccessibilityNodeInfo? {
        val root = rootInActiveWindow ?: return null
        val nodes = root.findAccessibilityNodeInfosByViewId(viewId)
        if (nodes != null && nodes.isNotEmpty()) {
            return nodes[0]
        }
        return null
    }

    fun clickNode(node: AccessibilityNodeInfo): Boolean {
        if (node.isClickable) {
            return node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        }
        
        // Try clicking parent
        var parent = node.parent
        while (parent != null) {
            if (parent.isClickable) {
                return parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
            parent = parent.parent
        }
        
        return false
    }
    
    fun globalBack(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_BACK)
    }
    
    fun globalHome(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_HOME)
    }

    companion object {
        const val TAG = "BreviAccessibility"
        var instance: BreviAccessibilityService? = null
        
        fun isServiceEnabled(): Boolean {
            return instance != null
        }
    }
}
