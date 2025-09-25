# FitProof Mobile App

React Native + Expo app with native MediaPipe pose detection for real-time fitness tracking.

## Quick Start

### Prerequisites
- Node.js 18+
- iOS: Xcode 14+, iOS 15.1+ deployment target
- Android: Android Studio, API 24+

### Initial Setup

```bash
# Install dependencies
npm install

# iOS setup
cd ios
pod install
cd ..

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## MediaPipe Integration

This app uses native MediaPipe modules for pose detection with a local `pose_landmarker_lite.task` model file.

### iOS MediaPipe Setup
- Native Swift module in `modules/mediapipe-pose/ios/`
- Model file included in iOS app bundle via Xcode
- MediaPipe iOS SDK integrated via CocoaPods

### Android MediaPipe Setup
- Native Kotlin module in `modules/mediapipe-pose/android/`
- Model file in `android/app/src/main/assets/`
- MediaPipe Android SDK via Gradle

## Development Commands

```bash
# Start development server
npm start

# Run with cache clearing
npx expo start --clear

# Build for specific platform
npx expo run:ios
npx expo run:android

# Run tests
npm test

# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

## Troubleshooting

### iOS Build Issues

**Clean build environment:**
```bash
# Clean iOS build
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npx expo run:ios
```

**MediaPipe module not found:**
- Ensure pods are installed: `cd ios && pod install`
- Clean Metro cache: `npx expo start --clear`
- Rebuild: `npx expo run:ios`

**Model loading fails:**
- Verify `pose_landmarker_lite.task` is in iOS project (via Xcode)
- Check Console.app logs for "MediaPipe" errors

### Android Build Issues

**Clean build environment:**
```bash
# Clean Android build
cd android
./gradlew clean
cd ..
npx expo run:android
```

**Backend connection issues (physical device):**
When running on a physical Android device, the app can't reach `localhost` on your development machine. Set up port forwarding:

```bash
# Forward backend ports to device
/Users/corbin/Library/Android/sdk/platform-tools/adb reverse tcp:4000 tcp:4000
/Users/corbin/Library/Android/sdk/platform-tools/adb reverse tcp:4001 tcp:4001

# Verify device connection
/Users/corbin/Library/Android/sdk/platform-tools/adb devices
```

This allows your device to access `localhost:4000` and `localhost:4001` as if they were running on the device itself.

**Metro bundler issues:**
```bash
# Reset Metro cache
npx expo start --clear

# Reset npm cache
npm start -- --reset-cache
```

### Common Issues

**Development build timeout:**
- App may have built but crashed on startup
- Check simulator/device logs
- Try launching app manually from home screen

**Native module linking:**
- Ensure `react-native.config.js` exists in project root
- Clean and rebuild after native changes

**Gesture recognizer warnings (iOS):**
- These are harmless React Navigation warnings
- Do not affect MediaPipe functionality

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # App screens
│   ├── components/       # Reusable components
│   ├── navigation/       # Navigation setup
│   └── services/         # API & auth services
├── modules/
│   └── mediapipe-pose/   # Native MediaPipe module
├── assets/
│   └── models/           # MediaPipe model files
├── ios/                  # iOS native code
└── android/              # Android native code
```

## MediaPipe Features

- **Real-time pose detection** at 30-60 FPS
- **33 landmark points** with x, y, z coordinates
- **Exercise classification** (pushups, squats, situps)
- **Form validation** with confidence scoring
- **Cross-platform** native performance

## Development Build Required

⚠️ **This app requires a development build** - it cannot run in Expo Go due to native MediaPipe integration.

Use `npx expo run:ios` or `npx expo run:android` to build and install on device/simulator.