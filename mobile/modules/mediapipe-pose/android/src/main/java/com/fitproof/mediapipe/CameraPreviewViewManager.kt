package com.fitproof.mediapipe

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

class CameraPreviewViewManager(private val reactContext: ReactApplicationContext) : SimpleViewManager<CameraPreviewView>() {

    override fun getName(): String = "CameraPreviewView"

    override fun createViewInstance(reactContext: ThemedReactContext): CameraPreviewView {
        val view = CameraPreviewView(reactContext)
        view.setReactContext(this.reactContext)

        // Register this view with the MediaPipe module so it can bind the camera preview
        val mediaPipeModule = this.reactContext.getNativeModule(MediaPipePoseModule::class.java)
        mediaPipeModule?.setCameraPreviewView(view)

        return view
    }
}