module.exports = {
  dependencies: {
    'mediapipe-pose': {
      root: './modules/mediapipe-pose',
      platforms: {
        android: {
          sourceDir: './modules/mediapipe-pose/android',
          packageImportPath: 'import com.fitproof.mediapipe.MediaPipePosePackage;'
        },
        ios: {
          podspecPath: './modules/mediapipe-pose/MediaPipePose.podspec'
        }
      }
    }
  }
};