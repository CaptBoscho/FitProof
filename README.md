# FitProof

Social fitness app with AI-powered exercise detection and gamification.

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Expo CLI (`npm install -g expo-cli`)
- For iOS development: Xcode (macOS only)
- For Android development: Android Studio with SDK
- Expo Go app on your phone (optional, for physical device testing)

### Backend Setup
```bash
cd backend
npm install
docker-compose up -d          # Start PostgreSQL database
npm run migration:run         # Run database migrations
npm run db:seed              # Seed with exercise data
npm run dev                  # Start GraphQL server
```

### Mobile Setup
```bash
cd mobile
npm install

# iOS setup (required for MediaPipe)
cd ios
pod install
cd ..

# Run development builds (required - won't work in Expo Go)
npx expo run:ios             # Build & run on iOS simulator/device
npx expo run:android         # Build & run on Android emulator/device
```

**⚠️ Development Build Required**: This app uses native MediaPipe modules and requires development builds. Cannot run in Expo Go.

### Web Build
```bash
cd mobile
npm run web
```

### Testing
```bash
# Backend tests
cd backend
npm test

# Run all tests
./scripts/test-all.sh

# Test authentication (examples)
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"mutation Register($input: RegisterInput!) { register(input: $input) { success message authData { accessToken user { email username } } } }", "variables":{"input":{"email":"test@example.com","username":"testuser","password":"TestPassword123!"}}}' \
  http://localhost:4001/graphql

curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"mutation Login($input: LoginInput!) { login(input: $input) { success message authData { accessToken user { email username } } } }", "variables":{"input":{"emailOrUsername":"test@example.com","password":"TestPassword123!"}}}' \
  http://localhost:4001/graphql
```

## Available Services

- **GraphQL API**: http://localhost:4001/graphql
- **GraphQL Playground**: http://localhost:4001/ (introspection enabled)
- **REST API**: http://localhost:4001/auth/* (authentication endpoints)
- **Health Check**: http://localhost:4001/health
- **Mobile App**: Scan QR code with Expo Go app, or use `npm run ios/android/web`

## Current Features (Authentication System Complete)

### ✅ Database Schema
- **Users**: Authentication, points, streaks, password reset tokens
- **Exercises**: Pushups, situps, squats with configurable points
- **Workout Sessions**: Device orientation tracking, completion status
- **Workout Reps**: Landmark data storage (JSONB), form validation

### ✅ Authentication System
- **JWT Tokens**: Access/refresh token implementation with secure secrets
- **GraphQL Mutations**: Registration, login, password reset with validation
- **REST Endpoints**: Mobile-optimized auth routes (`/auth/*`)
- **Security**: Password strength validation, bcrypt hashing, rate limiting
- **Mobile Integration**: React Native Keychain storage, Apollo Client setup

### ✅ Mobile Authentication
- **React Native Screens**: Login/registration with comprehensive form validation
- **Secure Storage**: React Native Keychain integration for token management
- **State Management**: Authentication context with React useReducer
- **Navigation**: Conditional rendering based on authentication state
- **User Experience**: Real-time validation, loading states, error handling

### ✅ GraphQL API
- **Queries**: Users, exercises, workout sessions with filtering/search
- **Mutations**: CRUD operations, authentication, session management
- **Types**: Comprehensive input validation with class-validator
- **Resolvers**: Error handling, type safety, relationship loading

### ✅ Key Capabilities
- Complete user authentication flow (backend + mobile)
- Exercise management with seed data
- Workout session tracking with rep-level detail
- Points system foundation (configurable per exercise)
- Secure token management and automatic refresh
- Mobile-optimized UI with proper form validation

## Development Commands

```bash
# Backend
npm run dev              # Start development server
npm run build            # Build for production
npm run typecheck        # Run TypeScript checking
npm run lint             # Run ESLint
npm test                 # Run test suite

# Database
npm run migration:create # Create new migration
npm run migration:run    # Run pending migrations
npm run migration:revert # Revert last migration
npm run db:seed          # Seed database with exercise data

# Mobile
npm start                # Start Expo dev server
npm run ios              # Run on iOS simulator
npm run android          # Run on Android emulator
npm run web              # Run in web browser
```

## Troubleshooting

### Mobile App Issues

**React Version Conflict (`ERESOLVE` error)**:
```bash
cd mobile
rm -rf node_modules package-lock.json
npm install
```

**Alternative if conflicts persist**:
```bash
npm install --legacy-peer-deps
```

**React Version Conflicts**:
If you encounter React version conflicts, install with legacy peer deps:
```bash
npm install --legacy-peer-deps
```

The project uses React 19.1.0 to match Expo 54 requirements.

**iOS Build Issues**:
```bash
# Clean build environment
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npx expo run:ios
```

**Android Build Issues**:
```bash
# Clean build environment
cd android
./gradlew clean
cd ..
npx expo run:android
```

**Metro bundler issues**:
```bash
# Clear Metro cache
npx expo start --clear

# Reset npm cache if needed
npm start -- --reset-cache
```

**Development build timeout**:
- App may have built but crashed on startup
- Check simulator/device logs in Console.app (iOS) or `adb logcat` (Android)
- Try launching app manually from home screen

**Native module linking issues**:
- Clean and rebuild after any native changes
- Ensure all dependencies are installed

## Project Status

**Current Progress**: 25% Complete (15/60 days)
- ✅ Chunk 1: Project Foundation (5/5 days)
- ✅ Chunk 2: Database Schema & Basic API (4/4 days)
- ✅ Chunk 3: Authentication System (5/5 days - Complete)
- ✅ **Day 15: MediaPipe Setup** - Native module integration complete
- 🔄 **Next**: Day 16: Pose Detection Foundation

See [TODO.md](./TODO.md) for detailed progress tracking and roadmap.