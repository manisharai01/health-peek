package com.mentalhealthapp

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ShareIntentModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ShareIntentModule"

    /**
     * Called from JS to retrieve any pending shared file/text.
     * Returns a map with { uri: String?, text: String? } or resolves null if nothing pending.
     * Clears the pending data after returning so it is only consumed once.
     */
    @ReactMethod
    fun getSharedFile(promise: Promise) {
        val uri = MainActivity.pendingSharedUri
        val text = MainActivity.pendingSharedText

        if (uri != null || text != null) {
            MainActivity.pendingSharedUri = null
            MainActivity.pendingSharedText = null

            val map = Arguments.createMap()
            map.putString("uri", uri)
            map.putString("text", text)
            promise.resolve(map)
        } else {
            promise.resolve(null)
        }
    }
}
