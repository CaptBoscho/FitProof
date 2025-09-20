# FitProof App Specification

## Overview
FitProof is a mobile app that uses Google's MediaPipe pose detection to verify exercises and enable social fitness competition. Users record themselves doing exercises, earn points for valid reps, and compete with friends.

## Technology Stack
- **Mobile**: Expo React Native with TypeScript
- **Backend**: Node.js with TypeScript and GraphQL
- **Database**: PostgreSQL (main), SQLite (mobile local storage)
- **ML**: Google MediaPipe for pose detection
- **Deployment**: Railway or Render (V1), scalable cloud later

## Core Features - V1

### Exercise Detection & Validation
**Supported Exercises:**
- Pushups (2 points per rep)
- Situps (2 points per rep)
- Squats (1 point per rep)

**Pose Detection:**
- Use MediaPipe to capture 3D landmark coordinates for every frame
- Store selected landmark data as JSON arrays (not all landmarks)
- Real-time pose classification: TopOfPushup, MidPushup, BottomOfPushup, Standing, Plank, MidSquat, BottomOfSquat, Unknown
- Include confidence scores for pose detection
- Validation logic hardcoded in app (angle thresholds, form rules)

**Recording Flow:**
1. User selects exercise type before starting camera
2. 10-second countdown before recording begins
3. No video recording - only landmark data capture per frame
4. Live rep counter with immediate validation feedback
5. Green/red overlay/border for form feedback
6. Text instructions when rep fails validation
7. Pause workout ends the session (no resume)

### User Interface
**Portrait Mode:**
- Camera view on top
- Pause button center-right below camera
- Rep counter and other controls below

**Landscape Mode:**
- Full-screen camera view
- Overlay with pause button and rep counter in top-right

### Points & Achievements System
**Points:**
- Configurable point values stored in database
- Initial values: Pushups/Situps = 2pts, Squats = 1pt
- Points displayed immediately, queued for server sync
- Bonus points for achievements

**Streaks:**
- 1 rest day allowed per 6 workout days
- Weekly bonus (7 days), monthly bonus (30 days)
- Future: Tiered daily bonuses (100pts = +15, 200pts = +40)

**V1 Achievements:**
- "First 1,000 Points" - unlock + bonus points + badge
- "7-Day Streak" - unlock + bonus points + badge
- Weekly challenges (rotating goals)

### Social Features
**Authentication:**
- Email/password, Google, or Apple login
- Username-based accounts

**Friends System:**
- Search by username/email
- Invite codes/links for adding friends
- Stats only visible to friends (no privacy controls in V1)

**Friend Profiles Show:**
- Total points
- Current streak
- Last week's points
- Badges/achievements

### Data Management
**Offline Support:**
- SQLite local database for queued sync operations
- Continue workouts offline, queue all data locally
- Sync indicator (pending upload icon/text)
- Retry failed uploads 3 times before discarding
- Timestamp-based conflict resolution for multi-device usage

**Database Schema:**

```sql
-- Exercises table (configurable)
exercises {
  id: uuid PRIMARY KEY
  name: varchar (pushup, situp, squat)
  points_per_rep: integer
  created_at: timestamp
}

-- Users table
users {
  id: uuid PRIMARY KEY
  email: varchar UNIQUE
  username: varchar UNIQUE
  google_id: varchar UNIQUE
  apple_id: varchar UNIQUE
  total_points: integer DEFAULT 0
  current_streak: integer DEFAULT 0
  created_at: timestamp
}

-- Workout sessions
workout_sessions {
  id: uuid PRIMARY KEY
  user_id: uuid REFERENCES users(id)
  exercise_id: uuid REFERENCES exercises(id)
  total_reps: integer
  total_points: integer
  device_orientation: varchar
  started_at: timestamp
  completed_at: timestamp
}

-- Individual reps with landmark data
workout_reps {
  id: uuid PRIMARY KEY
  session_id: uuid REFERENCES workout_sessions(id)
  rep_number: integer
  is_valid: boolean
  landmark_frames: jsonb[] -- Array of landmark data per frame
  pose_sequence: jsonb[] -- Array of detected poses with confidence
  calculated_angles: jsonb -- Key angles for validation
  created_at: timestamp
}

-- Separate tables per exercise type for specific metrics
pushup_reps {
  rep_id: uuid REFERENCES workout_reps(id)
  shoulder_angle_min: float
  elbow_angle_min: float
  hip_angle_avg: float
  -- Additional pushup-specific metrics
}

-- Similar tables for situp_reps, squat_reps...

-- Friendships
friendships {
  id: uuid PRIMARY KEY
  user_id: uuid REFERENCES users(id)
  friend_id: uuid REFERENCES users(id)
  status: varchar (pending, accepted)
  created_at: timestamp
}

-- Achievements
achievements {
  id: uuid PRIMARY KEY
  name: varchar
  description: text
  badge_icon: varchar
  bonus_points: integer
  criteria: jsonb
}

-- User achievements
user_achievements {
  user_id: uuid REFERENCES users(id)
  achievement_id: uuid REFERENCES achievements(id)
  earned_at: timestamp
  PRIMARY KEY (user_id, achievement_id)
}

-- Weekly challenges
weekly_challenges {
  id: uuid PRIMARY KEY
  name: varchar
  description: text
  start_date: date
  end_date: date
  criteria: jsonb
  reward_points: integer
}
```

### User Onboarding
1. Account creation with email/password or social login
2. Tutorial workout to calibrate pose detection
3. Teach proper form expectations through guided exercise
4. Set baseline for user's exercise capability

## Future Versions

### V2 Features
- Subscription plan for competition events
- ML model training using collected landmark data
- Advanced exercise validation using trained models
- Competition events: "Most pushups this week"

### V3 Features
- Large-scale group competitions (Group A vs Group B)
- Team badges and group rewards
- Advanced analytics and form improvement suggestions

### Store Integration
- Point redemption system
- Physical merchandise (branded shirts, etc.)
- Digital rewards and premium features

## Technical Implementation Notes

### MediaPipe Integration
- Capture pose landmarks in real-time
- Store relevant landmarks only (TBD during development)
- Calculate key angles for exercise validation
- Implement pose classification pipeline

### GraphQL API Design
- Type-safe mutations for workout data sync
- Subscriptions for push notifications
- Optimistic updates on mobile
- Batch operations for landmark data

### Performance Considerations
- Efficient landmark processing (60fps target)
- Background sync queue management
- Battery optimization for camera usage
- Memory management for large JSON arrays

### Security & Privacy
- Friend-only data visibility
- Secure authentication flows
- Data encryption for sensitive information
- GDPR compliance for user data

## Development Priorities
1. Core pose detection and validation logic
2. Basic workout recording and rep counting
3. Local data storage and sync queue
4. User authentication and basic social features
5. Points system and achievements
6. Weekly challenges
7. Polish and performance optimization