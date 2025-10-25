# Local Storage Architecture

## Philosophy: Temporary Buffer Only

**IMPORTANT**: Local SQLite storage is NOT a long-term data store. It is a **temporary buffer** to hold workout data until it can be synced to the backend server.

## Data Flow

```
┌─────────────────┐
│  User Workout   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Capture ML Data        │
│  (PoseDetector iOS/And) │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Store in SQLite        │
│  (Temporary Buffer)     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Add to Sync Queue      │
│  (SyncQueueManager)     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Sync to Backend API    │
│  (SyncService)          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  DELETE Local Data      │ ✅
│  (Immediately!)         │
└─────────────────────────┘
```

## Why This Approach?

1. **Mobile Storage Constraints**: Mobile devices have limited storage
2. **Single Source of Truth**: Backend server is the authoritative data store
3. **Reduced Complexity**: No need to maintain dual sync (local ↔ server)
4. **Better Performance**: Less local data = faster queries and smaller app size
5. **Privacy**: User data doesn't persist on device longer than necessary

## Implementation Details

### When Data is Stored Locally

1. **During Workout**:
   - ML training data captured every 10th frame
   - Buffered in WorkoutSessionManager (memory)
   - Written to SQLite in batches (every 10 frames)

2. **After Workout Completes**:
   - Session summary created
   - All ML data flushed to SQLite
   - Added to sync queue

### When Data is Deleted

**IMMEDIATELY after successful sync to backend:**

```typescript
// In syncService.ts - syncItem()
if (item.entityType === 'workout_session') {
  await deleteWorkoutSession(item.entityId);  // ✅ Delete immediately
  console.log(`🗑️ Deleted local workout session after sync`);
}
```

### Safety Mechanisms

1. **Retry Logic**: Failed syncs are retried with exponential backoff
2. **Sync Queue**: Failed items remain in queue until successful
3. **Unsynced Data Protection**: Cleanup only removes UNSYNCED data after 7 days
4. **Storage Monitoring**: Warnings when storage exceeds 80MB

## Storage Limits

```typescript
MAX_TOTAL_STORAGE_MB: 100        // Low limit since data is temporary
MAX_ML_DATA_STORAGE_MB: 80
WARNING_THRESHOLD_PERCENTAGE: 80 // Warn at 80MB
```

## Retention Policies

**NOTE**: These only apply to UNSYNCED data (safety fallback)

```typescript
WORKOUT_SESSION_RETENTION_DAYS: 7  // Unsynced sessions
ML_TRAINING_DATA_RETENTION_DAYS: 7 // Unsynced ML data
SYNC_QUEUE_RETENTION_DAYS: 7       // Failed sync items
```

**Synced data is deleted immediately** - no retention period needed.

## What Stays in Local Storage?

1. **Active Sync Queue**: Items waiting to sync or retrying
2. **Recent Unsynced Data**: Sessions from last 7 days that haven't synced yet
3. **User Cache**: Minimal user profile data (exercises, settings)

## What Does NOT Stay?

1. ❌ Old workout sessions (deleted after sync)
2. ❌ ML training data (deleted after sync)
3. ❌ Synced data of any kind

## Cleanup Schedule

### Automatic Cleanup Triggers:

1. **After Successful Sync**: Immediate deletion
2. **Storage Warning (80% full)**: Cleanup old unsynced data
3. **Periodic Safety Cleanup**: Remove unsynced data older than 7 days

### Manual Cleanup Options:

```typescript
// For testing/debugging only
await dataManager.runCleanup(true);           // Force cleanup
await dataManager.deleteAllUnsyncedData();    // Nuclear option
```

## Backend Integration (Day 35+)

When implementing actual backend sync:

1. **Upload workout session** → Get confirmation → **Delete local copy**
2. **Upload ML training data** → Get confirmation → **Delete local copy**
3. **Handle conflicts** → Resolve → **Delete local copy**
4. **Handle failures** → Keep in sync queue → Retry later

## Testing Considerations

### What to Test:

- ✅ Data survives app restart (until synced)
- ✅ Failed syncs keep data locally
- ✅ Successful syncs delete data
- ✅ Unsynced data protected from cleanup
- ✅ Storage warnings trigger correctly
- ✅ Cleanup removes only old unsynced data

### What NOT to Test:

- ❌ Long-term data persistence (not a use case)
- ❌ Complex sync conflict resolution (backend handles this)
- ❌ Local data queries for analytics (backend handles this)

## Future Considerations

### If Requirements Change:

If we need local data persistence for offline access:

1. Add `keep_locally` flag to workout_sessions table
2. Modify cleanup to respect this flag
3. Implement local-only queries for viewing history
4. Increase storage limits accordingly

**Current Decision**: We don't need this. Backend is source of truth.

## Developer Notes

### When Writing New Code:

```typescript
// ✅ GOOD: Delete after sync
if (syncSuccess) {
  await deleteWorkoutSession(sessionId);
}

// ❌ BAD: Keep synced data locally
if (syncSuccess) {
  await markSessionAsSynced(sessionId); // Don't just mark, DELETE it!
}
```

### Common Pitfalls:

1. **Don't mark as synced** - delete it instead
2. **Don't add long retention** - 7 days max for unsynced
3. **Don't build features requiring local history** - fetch from backend
4. **Don't optimize local queries** - data won't be there long

## Summary

**Local storage is ephemeral. Backend is permanent. Delete aggressively after sync.**

This keeps the mobile app lean, fast, and simple.
