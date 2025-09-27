package com.fitproof.mediapipe

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

class CameraPreviewViewManager(private val reactContext: ReactApplicationContext) : SimpleViewManager<CameraPreviewView>() {

    override fun getName(): String = "CameraPreviewView"

    override fun createViewInstance(reactContext: ThemedReactContext): CameraPreviewView {
        val view = CameraPreviewView(reactContext)
        view.setReactContext(this.reactContext)

        // Note: This view manager is no longer used since we moved to native activity
        // Keeping for backward compatibility but without module registration

        return view
    }
}