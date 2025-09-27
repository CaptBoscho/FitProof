package com.fitproof.mediapipe

import android.content.Context
import androidx.camera.view.PreviewView
import com.facebook.react.bridge.ReactApplicationContext

class CameraPreviewView(context: Context) : PreviewView(context) {

    private var reactContext: ReactApplicationContext? = null

    init {
        scaleType = ScaleType.FILL_CENTER
        implementationMode = ImplementationMode.COMPATIBLE
    }

    fun setReactContext(context: ReactApplicationContext) {
        this.reactContext = context
    }

    fun getPreviewView(): PreviewView = this
}