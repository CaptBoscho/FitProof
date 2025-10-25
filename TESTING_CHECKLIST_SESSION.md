# Testing Checklist - Session Implementation

**Date**: October 21, 2025
**Session Focus**: Situp Validation, Camera Error Handling, Real-time Feedback UI
**Platforms**: iOS & Android

---

## 📋 Overview

This session implemented:
1. **Day 21**: Situp validation logic (iOS + Android)
2. **Day 25**: Camera error handling and fallbacks (iOS + Android)
3. **Day 26**: Real-time feedback UI enhancements (iOS + Android)

---

## 🏋️ Situp Validation Testing

### iOS Testing (`PoseDetector.swift`)

**Test Location**: Open situp exercise in iOS app

#### Functional Tests
- [ ] **Starting Position Detection**
  - Lie flat on back (shoulders near ground)
  - Verify status shows "down" phase
  - Torso angle should be > 150°

- [ ] **Sitting Up Detection**
  - Perform full situp (torso bent forward)
  - Verify status shows "up" phase
  - Torso angle should be < 100°

- [ ] **Rep Counting**
  - Start lying down → sit up → lie down → sit up
  - Verify rep count increments correctly
  - Check debug logs for "⭐ RECORDED UP POSITION" and "🎯 RECORDED DOWN POSITION"

- [ ] **Mid Position Detection**
  - Hold position halfway between up and down
  - Verify status shows "mid" phase
  - Angle should be between 100° and 150°

- [ ] **Landmark Visibility**
  - Partially obscure body (e.g., cover shoulders)
  - Verify status shows "unknown" when < 4 key landmarks visible
  - Verify state resets (RecordedUp and RecordedDown both reset to false)

#### Form Requirements
- [ ] **Leg Position (Lenient)**
  - Test with bent knees - should work ✓
  - Test with straight legs - should work ✓
  - Verify no leg angle validation errors

- [ ] **Full Situp Required**
  - Perform partial crunch (don't reach < 100° angle)
  - Verify it does NOT count as "up"
  - Perform full situp (torso bent < 100°)
  - Verify it counts as "up"

- [ ] **No Hand Position Tracking**
  - Hands behind head - should work ✓
  - Hands crossed on chest - should work ✓
  - Verify no validation based on hand position

#### Debug Logging
- [ ] Check logs for situp angle measurements
- [ ] Verify torso angle calculations (hip → shoulder → nose)
- [ ] Confirm state machine transitions logged correctly

### Android Testing (`PoseDetector.kt`)

**Test Location**: Open situp exercise in Android app

#### Functional Tests
- [ ] Repeat all iOS functional tests above
- [ ] Verify identical behavior to iOS

#### Debug Logging
- [ ] Check Android Logcat for "Debug_Situp" tags
- [ ] Verify angle calculations match iOS values (±2°)
- [ ] Confirm state machine logs match iOS pattern

---

## 📷 Camera Error Handling Testing (Day 25)

### iOS Testing (`CameraViewController.swift`)

#### Permission Scenarios

- [ ] **First Launch (Permission Not Determined)**
  1. Fresh install or reset permissions
  2. Open exercise
  3. Verify permission dialog appears
  4. Grant permission
  5. Verify camera starts immediately

- [ ] **Permission Denied → Grant Flow**
  1. Settings → FitProof → Camera → OFF
  2. Open exercise
  3. Verify "Camera Permission Required" alert appears
  4. Tap "Open Settings"
  5. Verify Settings app opens to FitProof page
  6. Enable camera permission
  7. Return to app
  8. Verify camera works after re-opening exercise

- [ ] **Permission Denied → Cancel**
  1. Deny camera permission
  2. Open exercise
  3. Verify "Camera Permission Required" alert appears
  4. Tap "Cancel"
  5. Verify camera screen dismisses gracefully

- [ ] **Permission Restricted**
  1. If possible, set parental controls to restrict camera
  2. Open exercise
  3. Verify appropriate error message

#### Camera Hardware Errors

- [ ] **Camera Unavailable**
  - Test on simulator (no camera available)
  - Verify error alert: "Camera Unavailable - Front camera not available on this device"
  - Verify alert dismisses activity on "OK"

- [ ] **Camera Session Error**
  - Force camera session failure (if possible via testing tools)
  - Verify error handling and logging

#### Model Loading Errors

- [ ] **Model File Missing**
  1. Temporarily rename or remove `pose_landmarker_lite.task`
  2. Open exercise
  3. Verify error alert: "Error - Failed to load MediaPipe model"
  4. Verify alert dismisses activity on "OK"
  5. Check logs for error details

- [ ] **Model Loading Success**
  - Verify log: "✅ MediaPipe iOS: Model loaded successfully!"

### Android Testing (`CameraActivity.kt`)

#### Permission Scenarios

- [ ] **First Launch (Permission Not Determined)**
  1. Fresh install or reset permissions
  2. Open exercise
  3. Verify permission dialog appears
  4. Grant permission
  5. Verify camera starts immediately

- [ ] **Permission Denied → Grant Flow**
  1. Settings → Apps → FitProof → Permissions → Camera → OFF
  2. Open exercise
  3. Verify AlertDialog: "Camera Permission Required"
  4. Tap "Open Settings"
  5. Verify Settings app opens to FitProof app details
  6. Enable camera permission
  7. Return to app (it will finish, re-open exercise)
  8. Verify camera works

- [ ] **Permission Denied → Cancel**
  1. Deny camera permission
  2. Open exercise
  3. Verify "Camera Permission Required" AlertDialog
  4. Tap "Cancel"
  5. Verify activity finishes gracefully

#### Camera Hardware Errors

- [ ] **Camera Unavailable**
  - Test on emulator without camera
  - Verify error dialog: "Camera Error - Failed to start camera"
  - Verify helpful message about front camera
  - Verify activity finishes on "OK"

#### Model Loading Errors

- [ ] **Model File Missing**
  1. Remove `pose_landmarker_lite.task` from assets
  2. Open exercise
  3. Verify error dialog: "Model Loading Error - Failed to load MediaPipe model"
  4. Verify activity finishes on "OK"
  5. Check Logcat for "❌ Failed to load model"

- [ ] **Model Loading Success**
  - Verify Logcat: "✅ MediaPipe model loaded successfully"

#### Camera Startup

- [ ] **Camera Start Success**
  - Verify Logcat: "✅ Camera started successfully"

---

## 🎨 Real-time Feedback UI Testing (Day 26)

### iOS Testing (`CameraViewController.swift`)

#### UI Components Visibility

- [ ] **Rep Counter**
  - Top-right corner
  - Shows "Reps: 0" initially
  - Semi-transparent black background
  - White text, bold, 24pt

- [ ] **Pose Status Label**
  - Below rep counter (top-right)
  - Shows "Pose: --" initially
  - Updates to "up", "down", "mid", "partial", "kneeDown", "unknown"
  - Semi-transparent black background

- [ ] **Confidence Label** (NEW)
  - Below pose status (top-right)
  - Shows "Confidence: --" initially
  - Updates to "Confidence: XX%" in real-time
  - Semi-transparent black background
  - 16pt font

- [ ] **Form Feedback Border** (NEW)
  - Fullscreen overlay with colored border
  - 8pt border width
  - 16pt corner radius
  - Initially transparent (clear)

#### Form Feedback Colors

**Setup**: Start pushup exercise, wait for countdown to finish

- [ ] **Green Border - Good Form**
  1. Perform proper pushup (arms straight, legs straight)
  2. In "up" position with confidence > 50%
  3. Verify border turns GREEN (60% opacity)
  4. Border should pulse/stay green during good form

- [ ] **Red Border - Invalid Form**
  1. Perform pushup with knees on ground
  2. Verify status shows "kneeDown"
  3. Verify border turns RED (60% opacity)

- [ ] **Yellow Border - Low Confidence**
  1. Partially obscure body from camera
  2. Ensure confidence drops below 50%
  3. Verify border turns YELLOW (50% opacity)

- [ ] **Clear Border - During Countdown**
  1. Start any exercise
  2. During 5-second countdown
  3. Verify border is TRANSPARENT/CLEAR
  4. After countdown ends, verify border starts showing colors

#### Confidence Display

- [ ] **Confidence Updates in Real-time**
  1. Start exercise (after countdown)
  2. Move in and out of camera view
  3. Verify confidence percentage updates continuously
  4. Values should range 0-100%

- [ ] **Low Confidence (<50%)**
  - Partially hide body
  - Verify confidence shows < 50%
  - Verify yellow border appears

- [ ] **High Confidence (>50%)**
  - Full body visible with good lighting
  - Verify confidence shows > 50%
  - Verify green or red border (based on form)

#### Haptic Feedback

- [ ] **Rep Completion Vibration**
  1. Enable haptic feedback in device settings
  2. Perform any exercise (pushup/squat/situp)
  3. Complete valid rep (up → down → up)
  4. Verify device vibrates/haptic feedback triggered
  5. Check logs: "🎉 Haptic feedback triggered for rep #X"

- [ ] **No Vibration for Invalid Reps**
  1. Perform invalid rep (e.g., pushup with knees down)
  2. Verify NO haptic feedback

- [ ] **Vibration Only on Rep Increment**
  1. Hold "up" position
  2. Verify no continuous vibration
  3. Only vibrates once when rep count changes

### Android Testing (`CameraActivity.kt`)

#### UI Components Visibility

- [ ] **Rep Counter**
  - Top-right corner
  - Shows "Reps: 0" initially
  - Semi-transparent black background (#80000000)
  - White text, 24sp

- [ ] **Pose Status Text**
  - Below rep counter (top-right)
  - Shows "Pose: --" initially
  - Updates to phase names
  - Semi-transparent black background

- [ ] **Confidence Text** (NEW)
  - Below pose status (top-right)
  - Shows "Confidence: --" initially
  - Updates to "Confidence: XX%" in real-time
  - Semi-transparent black background
  - 16sp font

- [ ] **Form Feedback FrameLayout** (NEW)
  - Fullscreen overlay with colored border
  - Uses GradientDrawable
  - 16dp stroke width
  - 32dp corner radius

#### Form Feedback Colors

**Setup**: Start pushup exercise, wait for countdown to finish

- [ ] **Green Border - Good Form**
  1. Perform proper pushup
  2. In "up" position with confidence > 50%
  3. Verify border turns GREEN (#9900FF00)

- [ ] **Red Border - Invalid Form**
  1. Perform pushup with knees on ground
  2. Verify border turns RED (#99FF0000)

- [ ] **Yellow Border - Low Confidence**
  1. Partially obscure body
  2. Confidence < 50%
  3. Verify border turns YELLOW (#80FFFF00)

- [ ] **Transparent Border - During Countdown**
  1. Start exercise during countdown
  2. Verify border is transparent
  3. After countdown, verify colors appear

#### Confidence Display

- [ ] Repeat all iOS confidence display tests
- [ ] Verify values match iOS (±5%)

#### Haptic Feedback (Vibration)

- [ ] **Rep Completion Vibration**
  1. Ensure device vibration enabled (not silent mode)
  2. Complete valid rep
  3. Verify device vibrates (100ms)
  4. Check Logcat: "🎉 Haptic feedback triggered for rep #X"

- [ ] **API Level Compatibility**
  - Test on Android 8.0+ (API 26+): Uses VibrationEffect
  - Test on Android 7.1 or lower: Uses deprecated vibrate()
  - Both should work

- [ ] **No Vibration for Invalid Reps**
  1. Perform invalid rep
  2. Verify NO vibration

- [ ] **VIBRATE Permission**
  - Verify AndroidManifest.xml includes:
    ```xml
    <uses-permission android:name="android.permission.VIBRATE" />
    ```

---

## 🔄 Cross-Platform Consistency Testing

### Visual Consistency

- [ ] **UI Layout Match**
  - Compare iOS and Android side-by-side
  - Verify similar positioning of all UI elements
  - Verify similar sizing and spacing

- [ ] **Color Consistency**
  - Green should look similar on both platforms
  - Red should look similar on both platforms
  - Yellow should look similar on both platforms
  - Transparency levels should be comparable

### Functional Consistency

- [ ] **Situp Detection**
  - Perform same situp on both platforms
  - Verify rep counts match
  - Verify angle measurements within ±5°

- [ ] **Confidence Scores**
  - Same pose on both platforms
  - Verify confidence percentages within ±10%

- [ ] **Haptic Timing**
  - Rep completion should trigger haptic at same moment
  - Vibration duration should feel similar

---

## 📊 Performance Testing

### iOS Performance

- [ ] **Frame Rate**
  - Verify camera runs smoothly (no lag)
  - UI updates should be instant
  - No dropped frames during feedback updates

- [ ] **Memory Usage**
  - Run exercise for 5+ minutes
  - Monitor memory in Xcode Instruments
  - Verify no memory leaks

### Android Performance

- [ ] **Frame Rate**
  - Verify camera runs smoothly
  - UI updates instant
  - No ANR (Application Not Responding)

- [ ] **Memory Usage**
  - Run exercise for 5+ minutes
  - Monitor memory in Android Profiler
  - Verify no memory leaks

---

## 🐛 Edge Cases & Error Scenarios

### General

- [ ] **App Backgrounding**
  1. Start exercise
  2. Background app (home button)
  3. Return to app
  4. Verify camera restarts properly

- [ ] **Orientation Changes**
  - Rotate device during exercise
  - Verify UI adapts correctly
  - Verify camera/detection continues working

- [ ] **Low Light Conditions**
  - Test in dark room
  - Verify confidence drops appropriately
  - Verify yellow border appears

- [ ] **Multiple Rapid Reps**
  - Perform 10 reps quickly
  - Verify all reps counted
  - Verify haptic feedback for each

- [ ] **Rapid App Restarts**
  - Open/close exercise 5 times quickly
  - Verify no crashes
  - Verify camera cleanup proper

### iOS Specific

- [ ] **Device Compatibility**
  - Test on older iPhone (if available)
  - Test on iPad (if applicable)
  - Test on latest iPhone

### Android Specific

- [ ] **Device Compatibility**
  - Test on different Android versions (7.0+)
  - Test on different manufacturers (Samsung, Pixel, etc.)
  - Test on tablets

---

## ✅ Acceptance Criteria

### Situp Validation
- ✅ Detects lying down position (torso angle > 150°)
- ✅ Detects sitting up position (torso angle < 100°)
- ✅ Counts complete rep cycle: up → down → up
- ✅ Works with bent or straight legs (lenient)
- ✅ Requires full situp (not crunch)
- ✅ No hand position validation
- ✅ Identical behavior on iOS and Android

### Camera Error Handling
- ✅ Permission request on first launch
- ✅ Settings deeplink when permission denied
- ✅ Clear error messages for camera unavailable
- ✅ Clear error messages for model loading failure
- ✅ Graceful activity/view dismissal on errors
- ✅ Consistent error handling on both platforms

### Real-time Feedback UI
- ✅ Confidence percentage displays and updates in real-time
- ✅ Green border for good form + high confidence
- ✅ Red border for invalid form
- ✅ Yellow border for low confidence
- ✅ Clear border during countdown
- ✅ Haptic feedback on rep completion
- ✅ No haptic on invalid reps
- ✅ Consistent visual feedback on both platforms

---

## 📝 Notes & Observations

**Use this section to record any issues found during testing:**

### iOS Issues
-

### Android Issues
-

### Cross-Platform Issues
-

### Performance Issues
-

### Suggestions for Improvement
-

---

## 🎯 Priority Testing Order

1. **High Priority** (Must test before next development):
   - [ ] Situp rep counting on both platforms
   - [ ] Camera permission flows on both platforms
   - [ ] Haptic feedback on rep completion
   - [ ] Form feedback colors (green/red/yellow)

2. **Medium Priority** (Should test soon):
   - [ ] Confidence display accuracy
   - [ ] Error handling scenarios
   - [ ] Edge cases (backgrounding, rapid reps)

3. **Low Priority** (Can test later):
   - [ ] Performance testing
   - [ ] Device compatibility
   - [ ] Low light conditions

---

## 💾 Database Testing (Day 30)

### iOS Testing

#### Database Initialization
- [ ] **App Startup**
  1. Fresh install or reinstall app
  2. Verify "Initializing database..." loading screen appears briefly
  3. Verify app loads successfully
  4. Check Xcode console for "✅ Database opened successfully"
  5. Check console for "✅ Database tables created successfully"

- [ ] **Database Persistence**
  1. Close and reopen app multiple times
  2. Verify no errors on subsequent launches
  3. Database should not reinitialize (no table creation logs after first launch)

- [ ] **Database Error Handling**
  1. If database fails (unlikely), verify error screen appears
  2. Error message should be displayed clearly

### Android Testing

#### Database Initialization
- [ ] **App Startup**
  1. Fresh install or reinstall app
  2. Verify "Initializing database..." loading screen appears briefly
  3. Verify app loads successfully
  4. Check Logcat for "✅ Database opened successfully"
  5. Check Logcat for "✅ Database tables created successfully"

- [ ] **Database Persistence**
  1. Close and reopen app multiple times
  2. Verify no errors on subsequent launches
  3. Database should not reinitialize (no table creation logs after first launch)

- [ ] **Database Error Handling**
  1. If database fails (unlikely), verify error screen appears
  2. Error message should be displayed clearly

### General Database Tests

- [ ] **Database File Location**
  - iOS: Check Library/LocalDatabase/fitproof.db exists
  - Android: Check app data directory contains fitproof.db

- [ ] **No Performance Issues**
  - App should start within 2-3 seconds
  - Database initialization should not cause noticeable delay

---

## 🔄 Sync Queue Testing (Day 32)

### Test Utilities Location
**Files**:
- `src/services/__tests__/syncQueue.test.ts`
- Functions: `testSyncQueue()`, `testSyncService()`

### How to Run Tests

#### From React Native Debugger Console
```javascript
import { testSyncQueue, testSyncService } from './src/services/__tests__/syncQueue.test';

// Test sync queue operations
await testSyncQueue();

// Test sync service
await testSyncService();
```

#### Or from a Screen Component
Add a button to any screen that calls these test functions.

### Sync Queue Manager Tests

- [ ] **Test 1: Add Items to Queue**
  - Adds workout_session and ml_training_data items
  - Verify console shows "Added item 1" and "Added item 2"
  - Check: Items have unique IDs returned

- [ ] **Test 2: Get Pending Items**
  - Retrieves all pending items from queue
  - Verify console shows count and list of items
  - Check: Shows entityType:entityId and retry count

- [ ] **Test 3: Queue Statistics**
  - Gets total, pending, retrying, and failed counts
  - Verify console shows all 4 statistics
  - Check: Numbers are accurate

- [ ] **Test 4: Exponential Backoff**
  - Calculates retry delays for attempts 0-5
  - Verify console shows: 1s, 2s, 4s, 8s, 16s, 60s (max)
  - Check: Delays increase exponentially until max

- [ ] **Test 5: Update Retry Count**
  - Increments retry count for a failed item
  - Verify console shows updated retry count
  - Verify last error message is stored

- [ ] **Test 6: Conflict Detection**
  - Creates local and server data with different values
  - Detects conflicts based on timestamps
  - Verify console shows:
    - Has conflict: true/false
    - Conflict fields: array of field names
    - Resolution strategy: server_wins/client_wins/merge

- [ ] **Test 7: Retryable Items**
  - Gets items ready for retry based on backoff delay
  - Verify console shows retryable count
  - Check: Next retry time is calculated correctly

- [ ] **Test 8: Sync Service Status**
  - Gets current sync status (online, syncing, queue stats)
  - Verify console shows isOnline, isSyncing, queueStats
  - Check: Values reflect current state

- [ ] **Test 9: Remove from Queue**
  - Removes a completed item from queue
  - Verify console shows updated queue count
  - Check: Total decreases by 1

- [ ] **Test 10: Check Entity in Queue**
  - Checks if specific entity exists in queue
  - Verify console shows correct true/false results
  - Check: Returns true for existing, false for missing

### Sync Service Tests

- [ ] **Test 1: Manual Sync**
  - Triggers sync() manually
  - Verify console shows "Sync completed"
  - Check: No errors during sync process

- [ ] **Test 2: Event Listener**
  - Subscribes to sync events
  - Verify console shows events: sync_started, sync_progress, sync_completed
  - Check: Event data includes relevant information

- [ ] **Test 3: Auto Sync**
  - Starts auto-sync (60 second interval)
  - Verify console shows "Auto-sync started"
  - Wait 60+ seconds, verify sync runs automatically
  - Stop auto-sync, verify console shows "Auto-sync stopped"

### Network Connectivity Tests

- [ ] **Going Offline**
  1. Enable airplane mode or disable WiFi
  2. Trigger sync manually
  3. Verify console shows "No network connection, skipping sync"
  4. Check: Sync doesn't attempt when offline

- [ ] **Coming Online**
  1. Start with airplane mode ON
  2. Add items to queue
  3. Disable airplane mode (go online)
  4. Verify console shows "Network restored - triggering sync..."
  5. Check: Automatic sync occurs when network returns

- [ ] **Sync Already in Progress**
  1. Start a sync
  2. Trigger another sync immediately
  3. Verify console shows "Sync already in progress, skipping..."
  4. Check: No concurrent syncs occur

### Queue Processing Tests

- [ ] **Successful Sync**
  - Add items to queue
  - Trigger sync with good network
  - Verify console shows items being synced
  - Check: Items removed from queue after success

- [ ] **Failed Sync with Retry**
  - Simulate network error (10% failure rate built-in)
  - Verify failed items stay in queue
  - Verify retry count increments
  - Check: Exponential backoff applies

- [ ] **Max Retry Exceeded**
  - Force an item to fail 5 times
  - Verify item marked as "failed" (retry_count >= 5)
  - Verify item no longer retried automatically
  - Check: getFailedItems() returns the item

- [ ] **Conflict Handling**
  - Simulate conflict error (server data newer)
  - Verify console shows conflict detected
  - Verify conflict resolution strategy applied
  - Check: Merged data or server data wins

### Performance Tests

- [ ] **Bulk Queue Operations**
  - Add 100+ items to queue
  - Verify no performance degradation
  - Check: Queue operations complete in < 1 second

- [ ] **Sync Progress Events**
  - Sync 20+ items
  - Verify progress events fire for each item
  - Check: Event data shows current/total/synced/failed

### Edge Cases

- [ ] **Empty Queue Sync**
  - Clear all queue items
  - Trigger sync
  - Verify console shows "No items to sync"
  - Check: No errors occur

- [ ] **Duplicate Entity Detection**
  - Add same entity twice (same entityType + entityId)
  - Verify hasEntityInQueue() returns true
  - Check: Prevents duplicate queue entries

- [ ] **Queue Statistics Accuracy**
  - Add mix of items with different retry counts
  - Verify getQueueStats() shows correct breakdown
  - Check: pending + retrying + failed = total

### Manual Verification

- [ ] **Database Inspection**
  - After running tests, inspect SQLite database
  - Check sync_queue table has correct schema
  - Verify data matches expected state

- [ ] **Console Logs**
  - Review all console logs for errors
  - Verify debug logs use proper emojis (✅, ❌, 🔄, ⚠️)
  - Check: All operations logged clearly

### Acceptance Criteria

- ✅ Queue operations (add, remove, retry) work correctly
- ✅ Exponential backoff delays calculated correctly (1s → 60s max)
- ✅ Network monitoring detects online/offline transitions
- ✅ Auto-sync runs every 60 seconds when enabled
- ✅ Conflict detection identifies and resolves conflicts
- ✅ Event emitters fire for sync lifecycle events
- ✅ Failed items tracked and retried appropriately
- ✅ Max retry limit (5) enforced
- ✅ Sync service singleton pattern works correctly

---

## 💾 Data Management Testing (Day 33)

### Test Utilities Location
**Files**:
- `src/services/__tests__/dataManagement.test.ts`
- Functions: `testDataManagement()`, `testStorageMonitoring()`, `testCleanupPolicies()`

### How to Run Tests

#### From React Native Debugger Console
```javascript
import { testDataManagement, testStorageMonitoring, testCleanupPolicies } from './src/services/__tests__/dataManagement.test';

// Test data management service
await testDataManagement();

// Test storage monitoring
await testStorageMonitoring();

// Test cleanup policies
await testCleanupPolicies();
```

### Storage Statistics Tests

- [ ] **Test 1: Get Storage Statistics**
  - Retrieves current storage usage
  - Verify console shows:
    - Total size in MB
    - Workout sessions count and size
    - ML data count and size
    - Sync queue count and size
    - Percentage used
    - Is near limit (true if > 80%)
  - Check: All values are reasonable numbers

- [ ] **Test 2: Storage Monitoring**
  - Creates 5 test workout sessions with ML data
  - Monitors storage growth after each session
  - Verify console shows progressive size increase
  - Check: Storage percentage increases with each session

- [ ] **Test 3: Storage Warning Threshold**
  - Check if storage is near 80% limit
  - Verify `isNearLimit` flag is accurate
  - Check: Warning triggers at correct threshold

### Data Lifecycle Tests

- [ ] **Test 4: Lifecycle Summary**
  - Gets oldest/newest timestamps for sessions and ML data
  - Shows unsynced data counts
  - Verify console displays:
    - Oldest session date
    - Newest session date
    - Oldest ML data date
    - Newest ML data date
    - Unsynced sessions count
    - Unsynced ML data count
    - Pending sync items count
  - Check: Dates are in correct order (oldest < newest)

- [ ] **Test 5: Unsynced Data Tracking**
  - Create sessions without marking as synced
  - Verify lifecycle summary shows correct unsynced counts
  - Check: Counts match actual unsynced items

### Cleanup Tests

- [ ] **Test 6: Check if Cleanup Needed**
  - Calls `needsCleanup()`
  - Verify returns true when storage > 80%
  - Verify returns false when storage < 80%
  - Check: Threshold detection works correctly

- [ ] **Test 7: Automatic Cleanup (Dry Run)**
  - Run cleanup when storage is below threshold
  - Verify no items deleted
  - Verify console shows "No cleanup needed"
  - Check: Cleanup respects storage threshold

- [ ] **Test 8: Force Cleanup**
  - Run cleanup with `force: true`
  - Verify cleanup executes regardless of threshold
  - Check console shows:
    - Workout sessions deleted count
    - ML data deleted count
    - Sync queue cleaned count
    - Space freed in MB
  - Check: Cleanup completes without errors

- [ ] **Test 9: ML Data Retention Policy (30 days)**
  - Create ML data older than 30 days
  - Mark as synced
  - Run cleanup
  - Verify old ML data is deleted
  - Check: Only synced old data removed

- [ ] **Test 10: Workout Session Retention (90 days)**
  - Create workout sessions older than 90 days
  - Mark as synced
  - Run cleanup
  - Verify old sessions are deleted
  - Check: Only synced old sessions removed

- [ ] **Test 11: Sync Queue Retention (7 days)**
  - Add failed items to sync queue older than 7 days
  - Run cleanup
  - Verify old failed items removed
  - Check: Only items with retry_count >= 5 removed

- [ ] **Test 12: Preserve Unsynced Data**
  - Create old unsynced data
  - Run cleanup
  - Verify unsynced data is NOT deleted
  - Check: Cleanup only removes synced data

### Data Export Tests

- [ ] **Test 13: Export Data**
  - Call `exportData(true)` to include ML data sample
  - Verify export contains:
    - Timestamp
    - Version number
    - Storage stats
    - All workout sessions
    - Sample of ML data (last 100 frames)
    - Sync queue snapshot
  - Check: Export data structure is complete

- [ ] **Test 14: Export Without ML Data**
  - Call `exportData(false)`
  - Verify ML data sample is empty array
  - Verify other data is still included
  - Check: Option to exclude ML data works

- [ ] **Test 15: Export as JSON String**
  - Call `exportDataAsJSON()`
  - Verify returns valid JSON string
  - Verify can be parsed back to object
  - Check: JSON is properly formatted

- [ ] **Test 16: Export Data Size**
  - Export data with ML samples
  - Check JSON string length
  - Verify it's reasonable size (not too large)
  - Check: Sample limiting works (only 100 ML frames)

### Performance Tests

- [ ] **Test 17: Storage Stats Performance**
  - Call `getStorageStats()` multiple times
  - Verify completes in < 500ms
  - Check: No performance degradation

- [ ] **Test 18: Cleanup Performance**
  - Run cleanup on database with 100+ sessions
  - Verify cleanup completes in reasonable time
  - Check: Batch operations work efficiently

- [ ] **Test 19: Export Performance**
  - Export data with 50+ sessions
  - Verify export completes in < 2 seconds
  - Check: Large exports don't hang

### Edge Cases

- [ ] **Test 20: Empty Database**
  - Clear all data
  - Call `getStorageStats()`
  - Verify returns zero counts
  - Check: No errors on empty database

- [ ] **Test 21: Cleanup Empty Database**
  - Run cleanup on empty database
  - Verify returns zero deletions
  - Check: No errors, completes gracefully

- [ ] **Test 22: Concurrent Cleanup**
  - Trigger cleanup twice simultaneously
  - Verify second call skips (already running)
  - Verify console shows "Cleanup already in progress"
  - Check: No race conditions

- [ ] **Test 23: Delete All Unsynced Data**
  - Create unsynced sessions and ML data
  - Call `deleteAllUnsyncedData()`
  - Verify all unsynced data removed
  - Verify synced data preserved
  - Check: Dangerous operation works correctly

### Integration Tests

- [ ] **Test 24: Cleanup After Sync**
  - Create old synced sessions
  - Run sync service to mark as synced
  - Run cleanup
  - Verify old synced items removed
  - Check: Integration with sync service works

- [ ] **Test 25: Storage Growth Monitoring**
  - Create 10 workout sessions
  - Monitor storage growth
  - Verify storage increases predictably
  - Check: Size estimates are accurate

### Manual Verification

- [ ] **Database Inspection**
  - After running tests, inspect SQLite database
  - Verify cleanup removed expected records
  - Check data integrity maintained

- [ ] **Console Logs**
  - Review all console logs for errors
  - Verify cleanup logs use proper emojis (🧹, 📊, 📤, ✅, ❌)
  - Check: All operations logged clearly

### Acceptance Criteria

- ✅ Storage statistics accurately report size and counts
- ✅ Storage warning triggers at 80% threshold
- ✅ Cleanup respects retention policies (90/30/7 days)
- ✅ Cleanup preserves unsynced data
- ✅ Data export generates complete JSON output
- ✅ Lifecycle summary shows accurate data age
- ✅ Cleanup runs without errors or data loss
- ✅ Performance is acceptable for large datasets
- ✅ Edge cases handled gracefully

---

**Testing Completed By**: _________________
**Date Completed**: _________________
**Build Version**: _________________
**Issues Found**: _________________
**Overall Status**: ☐ Pass ☐ Fail ☐ Needs Fixes
