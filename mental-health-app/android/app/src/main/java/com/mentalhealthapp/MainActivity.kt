package com.mentalhealthapp

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "MentalHealthApp"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    processShareIntent(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    processShareIntent(intent)
  }

  private fun processShareIntent(intent: Intent?) {
    if (intent == null) return
    val action = intent.action ?: return

    when (action) {
      Intent.ACTION_SEND -> {
        @Suppress("DEPRECATION")
        val fileUri: Uri? = intent.getParcelableExtra(Intent.EXTRA_STREAM)
        val sharedText: String? = intent.getStringExtra(Intent.EXTRA_TEXT)
        if (fileUri != null) {
          pendingSharedUri = fileUri.toString()
          pendingSharedText = null
        } else if (sharedText != null) {
          pendingSharedText = sharedText
          pendingSharedUri = null
        }
      }
      Intent.ACTION_VIEW -> {
        intent.data?.let { uri ->
          pendingSharedUri = uri.toString()
          pendingSharedText = null
        }
      }
    }
  }

  companion object {
    var pendingSharedUri: String? = null
    var pendingSharedText: String? = null
  }
}
