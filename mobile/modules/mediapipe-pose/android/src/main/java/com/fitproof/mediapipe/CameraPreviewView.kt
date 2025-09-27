package com.fitproof.mediapipe

import android.content.Context
import android.widget.FrameLayout
import androidx.camera.view.PreviewView
import androidx.camera.view.PreviewView.ScaleType
import androidx.camera.view.PreviewView.ImplementationMode
import com.facebook.react.bridge.ReactApplicationContext

class CameraPreviewView(context: Context) : FrameLayout(context) {

    private var reactContext: ReactApplicationContext? = null
    private val previewView: PreviewView = PreviewView(context)

    init {
        previewView.scaleType = ScaleType.FILL_CENTER
        previewView.implementationMode = ImplementationMode.COMPATIBLE
        addView(previewView)
    }

    fun setReactContext(context: ReactApplicationContext) {
        this.reactContext = context
    }

    fun getPreviewView(): PreviewView = previewView
}