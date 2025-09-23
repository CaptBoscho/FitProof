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

# Run on specific platforms:
npm run ios                  # Run on iOS simulator (requires Xcode)
npm run android              # Run on Android emulator (requires Android Studio)
npm run web                  # Run in web browser
```

**Important**: After running `npm install`, if you encounter React version conflicts, the dependencies should resolve automatically. The project uses React 19.1.0 to match Expo 54 requirements.

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

**Metro bundler issues**:
```bash
npx expo start -c
# or if that doesn't work:
watchman watch-del '/Users/corbin/Repos2/FitProof' ; watchman watch-project '/Users/corbin/Repos2/FitProof'
npx expo start -c
```

**"App entry not found" error**:
This usually indicates an uncaught error in module loading:
```bash
# Clear all caches and restart
rm -rf node_modules/.cache
npx expo start -c
# Check iOS Simulator console for specific error details
```

**iOS Simulator Not Opening**:
- Ensure Xcode is installed and updated
- Open Xcode → Preferences → Locations → Command Line Tools is set
- Run `npx expo run:ios` instead of `npm run ios`

**Android Emulator Issues**:
- Ensure Android Studio is installed with SDK
- Create an AVD (Android Virtual Device) in Android Studio
- Start emulator manually, then run `npm run android`

**Physical Device Testing**:
1. Install Expo Go app from App/Play Store
2. Scan QR code displayed in terminal after `npm start`
3. Ensure phone and computer are on same WiFi network

## Project Status

**Current Progress**: 23% Complete (14/60 days)
- ✅ Chunk 1: Project Foundation (5/5 days)
- ✅ Chunk 2: Database Schema & Basic API (4/4 days)
- ✅ Chunk 3: Authentication System (4/5 days - Complete)
- 🔄 **Next**: Day 14: User Profile Management or Chunk 4: MediaPipe Integration

See [TODO.md](./TODO.md) for detailed progress tracking and roadmap.