# FitProof Test-Driven Implementation Prompts

## Chunk 1: Project Foundation

### Prompt 1.1: Backend Project Setup

```
I'm building a FitProof fitness app backend with Node.js, TypeScript, GraphQL, and PostgreSQL. I need to set up the initial project structure with proper testing framework.

Create the backend project with:
1. Initialize Node.js TypeScript project with package.json
2. Add dependencies: apollo-server-express, express, typeorm, pg, graphql, type-graphql
3. Add dev dependencies: nodemon, jest, supertest, @types/* packages
4. Configure TypeScript with tsconfig.json (strict mode, ES2020 target)
5. Create folder structure: src/models, src/resolvers, src/services, src/tests
6. Add npm scripts for dev, build, test, and start
7. Create a basic server.ts with Express and Apollo Server setup
8. Add a health check endpoint at /health

Write comprehensive tests first, then implement. Include:
- Jest configuration in package.json
- Basic server startup test
- Health check endpoint test
- TypeScript compilation test

Ensure the server can start successfully and pass all tests.
```

### Prompt 1.2: Database Setup

```
Building on the previous backend setup, I need to configure PostgreSQL with Docker and set up database connectivity with health checks.

Requirements:
1. Create docker-compose.yml with PostgreSQL 14 service
2. Configure database connection using TypeORM
3. Create database configuration with environment variables
4. Set up migration system with TypeORM
5. Add database health check functionality
6. Create initial connection test

Write tests first:
- Database connection test
- Health check endpoint test
- Migration system test
- Environment configuration test

Implementation should include:
- Database connection configuration in src/config/database.ts
- Health check that verifies database connectivity
- Migration configuration and initial empty migration
- Error handling for database connection failures
- Environment variables for database credentials

All tests must pass and database must be accessible via health check.
```

### Prompt 1.3: GraphQL Foundation

```
Building on the backend setup with database, now implement GraphQL foundation with Apollo Server and basic schema.

Requirements:
1. Install and configure Apollo Server with Express
2. Create basic GraphQL schema with type definitions
3. Set up GraphQL playground for development environment
4. Add basic health check query to GraphQL schema
5. Implement proper error handling and logging
6. Configure GraphQL context for future authentication

Write tests first:
- GraphQL server startup test
- Basic query execution test
- Error handling test
- Schema validation test

Implementation should include:
- GraphQL schema definition in src/schema/
- Basic resolver for health check query
- Apollo Server configuration with context
- Error handling middleware
- GraphQL playground enabled in development

Server should start successfully and GraphQL playground should be accessible at /graphql.
```

### Prompt 1.4: Mobile Project Setup

```
Initialize the React Native mobile app for FitProof using Expo and TypeScript with proper navigation structure.

Requirements:
1. Create Expo React Native TypeScript project
2. Install React Navigation v6 with stack navigator
3. Set up folder structure: src/screens, src/components, src/services, src/types
4. Configure Apollo Client for GraphQL communication
5. Add AsyncStorage for local data persistence
6. Create placeholder screen components

Write tests first using Jest and React Native Testing Library:
- App component rendering test
- Navigation structure test
- Apollo Client configuration test
- Basic screen rendering tests

Implementation should include:
- App.tsx with navigation container
- Basic screens: Auth, Home, Workout, Profile
- Apollo Client setup with error handling
- TypeScript configuration for React Native
- Basic screen placeholder components

App should run successfully on iOS/Android simulator and pass all tests.
```

### Prompt 1.5: Development Environment

```
Complete the project foundation by setting up development tools, testing, and documentation for both backend and mobile projects.

Requirements:
1. Configure ESLint and Prettier for both projects with consistent rules
2. Set up Jest testing configuration with coverage reports
3. Create development scripts for hot reloading and testing
4. Add pre-commit hooks with husky and lint-staged
5. Create README.md with setup and development instructions
6. Configure VS Code settings for optimal development experience

Write tests first:
- Linting configuration test
- Code formatting test
- Test coverage validation
- Build process test

Implementation should include:
- .eslintrc.json and .prettierrc for both projects
- Jest configuration with coverage thresholds
- Package.json scripts for development workflow
- Pre-commit hooks for code quality
- Development documentation
- VS Code workspace settings

Both projects should have consistent code style, pass linting, and have working development workflows.
```

---

## Chunk 2: Database Schema & Basic API

### Prompt 2.1: Exercise Models

```
Building on the GraphQL foundation, implement the Exercise entity and database model for the FitProof app.

Requirements:
1. Create Exercise entity using TypeORM with proper typing
2. Define fields: id (UUID), name (string), pointsPerRep (number), createdAt (timestamp)
3. Write database migration for exercises table
4. Create repository class with CRUD operations
5. Add seed data for pushup (2 points), situp (2 points), squat (1 point)
6. Implement proper error handling and validation

Write comprehensive tests first:
- Exercise entity creation and validation tests
- Repository CRUD operation tests
- Migration execution test
- Seed data insertion test
- Database constraint tests

Implementation should include:
- src/models/Exercise.ts with TypeORM decorators
- Migration file in src/migrations/
- ExerciseRepository with typed methods
- Seed script for initial exercise data
- Input validation for exercise creation

Database should contain the three exercises after migration and seeding. All tests must pass.
```

### Prompt 2.2: User Models

```
Building on the Exercise models, implement User entity with authentication fields and proper security measures.

Requirements:
1. Create User entity with fields: id (UUID), email (unique), username (unique), passwordHash, totalPoints (default 0), currentStreak (default 0), createdAt, updatedAt
2. Write database migration for users table with proper constraints
3. Create UserRepository with authentication-focused methods
4. Implement password hashing utilities using bcrypt
5. Add email and username validation
6. Create user creation and authentication methods

Write tests first:
- User entity validation tests
- Password hashing and verification tests
- Repository method tests (create, findByEmail, findByUsername)
- Unique constraint tests
- User authentication tests

Implementation should include:
- src/models/User.ts with security best practices
- Password hashing service in src/services/
- UserRepository with typed authentication methods
- Migration with proper indexes and constraints
- Input validation and sanitization

Users should be creatable with secure password hashing. All tests must pass with proper security measures.
```

### Prompt 2.3: Workout Models

```
Building on User models, implement WorkoutSession and WorkoutRep entities with proper relationships and landmark data storage.

Requirements:
1. Create WorkoutSession entity: id (UUID), userId (FK), exerciseId (FK), totalReps (number), totalPoints (number), deviceOrientation (string), startedAt, completedAt
2. Create WorkoutRep entity: id (UUID), sessionId (FK), repNumber (number), isValid (boolean), landmarkFrames (JSONB array), poseSequence (JSONB array), calculatedAngles (JSONB), createdAt
3. Write migrations for both tables with proper foreign key relationships
4. Create repositories with relationship queries
5. Add exercise-specific tables: PushupRep, SitupRep, SquatRep with specific metrics

Write tests first:
- Entity relationship tests
- Repository query tests (with joins)
- JSONB data storage and retrieval tests
- Foreign key constraint tests
- Complex query tests (session with reps)

Implementation should include:
- WorkoutSession and WorkoutRep entities with proper relationships
- Exercise-specific rep entities extending base WorkoutRep
- Repositories with typed relationship methods
- Migrations with proper indexes and constraints
- JSONB data validation

Should be able to create workout sessions with multiple reps and store landmark data. All tests must pass.
```

### Prompt 2.4: GraphQL Types & Resolvers

```
Building on the complete database models, implement GraphQL types and resolvers with proper typing and error handling.

Requirements:
1. Define GraphQL types for Exercise, User, WorkoutSession, WorkoutRep using type-graphql
2. Create input types for mutations and query filters
3. Implement basic queries: exercises, users (admin), userWorkouts
4. Add proper GraphQL resolvers with dependency injection
5. Implement error handling with custom GraphQL errors
6. Add input validation using class-validator

Write tests first:
- GraphQL schema generation tests
- Resolver execution tests for each query
- Input validation tests
- Error handling tests
- Integration tests with database

Implementation should include:
- GraphQL types in src/types/ using type-graphql decorators
- Resolvers in src/resolvers/ with proper typing
- Input validation classes with class-validator
- Custom error classes for GraphQL
- Integration with TypeORM repositories

GraphQL playground should show all types and queries. All resolvers should work with proper error handling. Tests must pass.
```

---

## Chunk 3: Authentication System

### Prompt 3.1: JWT Implementation

```
Building on the GraphQL foundation, implement JWT token generation and validation system for secure authentication.

Requirements:
1. Install and configure jsonwebtoken and related dependencies
2. Create JWT service with token generation, validation, and refresh logic
3. Implement secure token configuration with environment variables
4. Create JWT middleware for GraphQL context authentication
5. Add token expiration and refresh token mechanism
6. Implement proper error handling for invalid/expired tokens

Write comprehensive tests first:
- Token generation and validation tests
- Token expiration tests
- Refresh token flow tests
- JWT middleware tests
- Invalid token handling tests

Implementation should include:
- JWTService in src/services/auth/ with typed methods
- JWT middleware for GraphQL context
- Token configuration with secure secrets
- Refresh token storage strategy
- Custom authentication errors

JWT tokens should be generated securely and validation should work properly. All tests must pass with proper security measures.
```

### Prompt 3.2: Registration & Login Mutations

```
Building on JWT implementation, create GraphQL mutations for user registration and login with proper validation and security.

Requirements:
1. Create RegisterInput and LoginInput types with validation
2. Implement register mutation with email/password validation
3. Create login mutation with authentication and token generation
4. Add email uniqueness checking and proper error messages
5. Implement user context for authenticated GraphQL requests
6. Add rate limiting considerations for auth endpoints

Write tests first:
- Registration mutation tests (success and failure cases)
- Login mutation tests with various scenarios
- Input validation tests
- Duplicate email handling tests
- Authentication context tests

Implementation should include:
- AuthResolver with register and login mutations
- Input validation with proper error messages
- Integration with UserRepository and JWTService
- GraphQL context with authenticated user
- Proper password hashing during registration

Users should be able to register and login successfully. GraphQL context should contain authenticated user info. All tests must pass.
```

### Prompt 3.3: Mobile Authentication Screens

```
Create the mobile authentication UI with secure token storage and form validation for the FitProof app.

Requirements:
1. Create LoginScreen with email/password form and validation
2. Implement RegisterScreen with form validation and user feedback
3. Set up secure token storage using Expo SecureStore
4. Create AuthContext provider for app-wide authentication state
5. Add form validation with proper error messages
6. Implement loading states and user feedback

Write tests first:
- Screen rendering tests
- Form validation tests
- Authentication state management tests
- Secure storage tests
- Navigation flow tests

Implementation should include:
- LoginScreen and RegisterScreen components
- Form validation using react-hook-form or similar
- AuthContext with login/logout/register methods
- Secure token storage and retrieval
- Error handling and user feedback

Authentication screens should work with proper validation and secure token storage. All tests must pass.
```

### Prompt 3.4: Protected Navigation

```
Building on mobile authentication screens, implement protected route system and authentication state management throughout the app.

Requirements:
1. Create authentication state management with React Context
2. Implement protected route wrapper components
3. Add automatic token refresh handling
4. Create logout functionality with token cleanup
5. Handle authentication state persistence across app restarts
6. Add authentication loading states and transitions

Write tests first:
- Authentication state management tests
- Protected route access tests
- Token refresh flow tests
- Logout functionality tests
- State persistence tests

Implementation should include:
- AuthProvider with comprehensive state management
- ProtectedRoute component wrapper
- Automatic token refresh service
- Logout with secure token cleanup
- Authentication state persistence

App navigation should respect authentication state. Protected screens should be inaccessible without authentication. All tests must pass.
```

### Prompt 3.5: User Profile Management

```
Building on protected navigation, create user profile screens and profile management functionality.

Requirements:
1. Create UserProfileScreen displaying user information
2. Implement EditProfileScreen with form validation
3. Add profile picture handling (placeholder for now)
4. Create UserSettingsScreen for app preferences
5. Implement profile update mutations in GraphQL
6. Add proper error handling and user feedback

Write tests first:
- Profile screen rendering tests
- Profile update form tests
- GraphQL mutation tests for profile updates
- Settings screen functionality tests
- Error handling tests

Implementation should include:
- UserProfileScreen with user data display
- EditProfileScreen with form validation
- Profile update GraphQL mutations
- UserSettingsScreen with app preferences
- Integration with authentication context

User profile should be viewable and editable. Profile updates should sync with backend. All tests must pass.
```

---

## Chunk 4: MediaPipe Integration

### Prompt 4.1: MediaPipe Setup

```
Set up MediaPipe pose detection for React Native with proper error handling and device compatibility.

Requirements:
1. Install @mediapipe/pose and react-native-mediapipe packages
2. Configure platform-specific dependencies for iOS and Android
3. Create basic CameraComponent with MediaPipe initialization
4. Implement pose detection initialization with error handling
5. Add device capability checking and fallback options
6. Configure proper camera permissions handling

Write tests first:
- MediaPipe initialization tests
- Camera permission tests
- Device compatibility tests
- Error handling tests
- Component mounting tests

Implementation should include:
- MediaPipe configuration and setup
- CameraComponent with pose detection initialization
- Permission handling for camera access
- Device capability detection
- Error boundaries for MediaPipe failures

MediaPipe should initialize successfully on device. Camera should be accessible with pose detection ready. All tests must pass.
```

### Prompt 4.2: Pose Detection Foundation

```
Building on MediaPipe setup, implement real-time pose landmark extraction with confidence scoring and performance optimization.

Requirements:
1. Implement real-time pose landmark extraction from camera frames
2. Create TypeScript types for landmark data structures
3. Add pose detection confidence scoring and filtering
4. Implement frame rate optimization (target 30-60fps)
5. Create landmark data validation and error handling
6. Add performance monitoring for pose detection

Write tests first:
- Landmark extraction tests with mock data
- Confidence scoring tests
- Performance benchmarking tests
- Data validation tests
- Error handling tests

Implementation should include:
- Real-time pose detection processing
- Landmark data types and interfaces
- Confidence scoring and filtering logic
- Frame rate optimization strategies
- Performance monitoring utilities

Pose detection should run smoothly at 30+ fps on device. Landmark data should be extracted reliably. All tests must pass.
```

### Prompt 4.3: Landmark Processing

```
Building on pose detection foundation, create utilities for processing and working with 3D landmark coordinates.

Requirements:
1. Create utilities for landmark coordinate processing and normalization
2. Implement 3D to 2D projection helpers for display
3. Add landmark smoothing and filtering algorithms
4. Create landmark visualization components for debugging
5. Implement coordinate system conversions
6. Add landmark data compression for storage

Write tests first:
- Coordinate processing tests
- 3D to 2D projection tests
- Smoothing algorithm tests
- Visualization component tests
- Data compression tests

Implementation should include:
- LandmarkProcessor utility class
- Coordinate conversion and projection methods
- Smoothing and filtering algorithms
- Debug visualization overlays
- Data compression utilities

Landmark processing should be accurate and performant. Visualization should help with debugging. All tests must pass.
```

### Prompt 4.4: Angle Calculation

```
Building on landmark processing, implement joint angle calculations essential for exercise validation.

Requirements:
1. Implement joint angle calculation utilities using vector math
2. Create angle calculations for key exercise joints (shoulder, elbow, hip, knee)
3. Add 3D vector math helpers for angle calculations
4. Implement angle smoothing and validation logic
5. Create angle visualization for debugging
6. Add unit tests with known angle calculations

Write tests first:
- Vector math utility tests with known values
- Joint angle calculation tests
- Angle smoothing tests
- Validation logic tests
- Visualization component tests

Implementation should include:
- AngleCalculator utility with vector math
- Joint-specific angle calculation methods
- Angle smoothing and filtering
- Debug visualization for angles
- Comprehensive test cases with known angles

Angle calculations should be mathematically correct and stable. Visualization should show angles in real-time. All tests must pass.
```

### Prompt 4.5: Performance Optimization

```
Building on angle calculation, optimize MediaPipe processing for consistent 60fps performance across devices.

Requirements:
1. Optimize MediaPipe processing pipeline for 60fps target
2. Implement frame skipping strategies if performance drops
3. Add memory management for landmark data processing
4. Create performance monitoring and metrics collection
5. Test performance across different device tiers
6. Implement adaptive quality settings based on device performance

Write tests first:
- Performance benchmark tests
- Frame rate consistency tests
- Memory usage tests
- Adaptive quality tests
- Device compatibility tests

Implementation should include:
- Performance optimization strategies
- Frame skipping logic when needed
- Memory management best practices
- Performance monitoring dashboard
- Adaptive settings based on device capabilities

MediaPipe should maintain 60fps on mid-range devices and gracefully degrade on low-end devices. All tests must pass.
```

---

## Chunk 5: Exercise Validation Logic

### Prompt 5.1: Pushup Validation

```
Building on angle calculation, implement pushup detection and validation using joint angles and pose states.

Requirements:
1. Define pushup pose states: TopOfPushup, MidPushup, BottomOfPushup
2. Implement angle thresholds for pushup detection (shoulder, elbow angles)
3. Create state machine for pushup rep counting with transitions
4. Add validation rules for proper pushup form
5. Implement confidence scoring for pushup detection
6. Test with real pushup movement data

Write tests first:
- Pose state detection tests with known angles
- State machine transition tests
- Rep counting accuracy tests
- Form validation tests
- Confidence scoring tests

Implementation should include:
- PushupValidator class with state machine
- Angle threshold configuration
- Rep counting logic with proper state transitions
- Form validation rules
- Comprehensive test cases with real movement data

Pushup detection should accurately count reps and validate form. Should work with various pushup styles. All tests must pass.
```

### Prompt 5.2: Situp Validation

```
Building on pushup validation, implement situp detection and validation using core movement angles and pose transitions.

Requirements:
1. Define situp pose states and movement transitions
2. Implement core angle calculations (torso to thigh angle)
3. Create situp rep counting state machine
4. Add form validation for proper situp technique
5. Handle variations in situp styles (hands position, etc.)
6. Test with real situp movement patterns

Write tests first:
- Situp pose detection tests
- Core angle calculation tests
- Rep counting state machine tests
- Form validation tests
- Style variation handling tests

Implementation should include:
- SitupValidator class with movement analysis
- Core-specific angle calculations
- State machine for situp transitions
- Form validation rules for situps
- Support for common situp variations

Situp detection should accurately count reps across different styles. Form validation should catch poor technique. All tests must pass.
```

### Prompt 5.3: Squat Validation

```
Building on situp validation, implement squat detection and validation using knee and hip angles with depth requirements.

Requirements:
1. Define squat pose states with depth requirements
2. Implement knee and hip angle calculations for squat depth
3. Create squat rep counting with depth validation
4. Add balance and form validation (knee tracking, back position)
5. Handle different squat styles (bodyweight, sumo, etc.)
6. Test with real squat movement data

Write tests first:
- Squat depth detection tests
- Knee and hip angle tests
- Balance validation tests
- Form checking tests
- Style variation tests

Implementation should include:
- SquatValidator class with depth analysis
- Knee and hip angle calculations
- Depth requirement validation
- Balance and form checking
- Support for squat variations

Squat detection should accurately measure depth and count reps. Form validation should ensure proper technique. All tests must pass.
```

### Prompt 5.4: Pose Classification System

```
Building on individual exercise validators, create unified pose classification system with confidence scoring.

Requirements:
1. Create unified pose classification interface for all exercises
2. Implement confidence scoring system for pose detection
3. Add pose transition validation and smoothing
4. Create pose sequence tracking and analysis
5. Implement "Unknown" pose classification for unclear poses
6. Add cross-exercise pose classification accuracy

Write tests first:
- Unified interface tests
- Confidence scoring tests
- Pose transition tests
- Sequence tracking tests
- Cross-exercise classification tests

Implementation should include:
- IPoseClassifier interface for all validators
- Confidence scoring algorithms
- Pose transition smoothing
- Sequence analysis utilities
- Unknown pose handling

Pose classification should work consistently across exercises. Confidence scores should reflect detection accuracy. All tests must pass.
```

### Prompt 5.5: Validation Testing & Tuning

```
Building on the complete pose classification system, create comprehensive testing and tuning framework for exercise validation accuracy.

Requirements:
1. Create comprehensive test suite for all exercise validation
2. Implement accuracy metrics and validation scoring
3. Fine-tune angle thresholds based on test data
4. Add edge case handling for poor poses and lighting
5. Create validation accuracy dashboard
6. Test with multiple users for consistency across body types

Write tests first:
- Accuracy measurement tests
- Edge case handling tests
- Threshold tuning tests
- Multi-user consistency tests
- Performance regression tests

Implementation should include:
- Validation accuracy test suite
- Automatic threshold tuning system
- Edge case detection and handling
- Accuracy metrics dashboard
- Multi-user testing framework

Exercise validation should achieve >90% accuracy across test cases. System should handle edge cases gracefully. All tests must pass.
```

---

## Chunk 6: Workout Recording UI

### Prompt 6.1: Camera Integration

```
Building on MediaPipe pose detection, create camera screen with integrated pose detection overlay and proper error handling.

Requirements:
1. Create WorkoutCameraScreen with MediaPipe overlay integration
2. Implement camera permissions handling with user-friendly messages
3. Add camera orientation and resolution configuration
4. Create camera error handling and fallback options
5. Implement proper camera lifecycle management
6. Add camera preview with pose landmark overlay

Write tests first:
- Camera component rendering tests
- Permission handling tests
- Error boundary tests
- Lifecycle management tests
- Overlay integration tests

Implementation should include:
- WorkoutCameraScreen component
- Camera permission flow
- Error handling for camera failures
- MediaPipe overlay integration
- Camera configuration options

Camera should work reliably with pose detection overlay. Error handling should be user-friendly. All tests must pass.
```

### Prompt 6.2: Real-time Feedback UI

```
Building on camera integration, create real-time feedback UI for rep counting and form validation during workouts.

Requirements:
1. Create rep counter display component with animation
2. Implement green/red feedback overlay for form validation
3. Add pose confidence indicators and visual feedback
4. Create real-time angle displays for debugging/coaching
5. Implement haptic feedback for rep completion
6. Add audio feedback options for rep counting

Write tests first:
- Rep counter component tests
- Visual feedback tests
- Confidence indicator tests
- Haptic feedback tests
- Audio feedback tests

Implementation should include:
- RepCounterDisplay component with animations
- FormFeedbackOverlay with color-coded feedback
- ConfidenceIndicator component
- Haptic and audio feedback services
- Real-time angle visualization

Real-time feedback should be responsive and clear. Visual indicators should help users improve form. All tests must pass.
```

### Prompt 6.3: Exercise Session Management

```
Building on real-time feedback UI, create exercise session management with state tracking and controls.

Requirements:
1. Create ExerciseSelectionScreen for choosing workout type
2. Implement workout session state management with Redux or Context
3. Add countdown timer for session start (10 seconds)
4. Create session pause/stop functionality with proper state transitions
5. Implement session data tracking and persistence
6. Add session recovery for app backgrounding

Write tests first:
- Exercise selection tests
- Session state management tests
- Countdown timer tests
- Pause/stop functionality tests
- Data persistence tests

Implementation should include:
- ExerciseSelectionScreen with exercise options
- WorkoutSessionProvider for state management
- CountdownTimer component
- Session control buttons and logic
- Local session data persistence

Session management should be reliable and handle app lifecycle events. Data should persist during session interruptions. All tests must pass.
```

### Prompt 6.4: User Instructions & Feedback

```
Building on session management, create comprehensive user instruction system for failed reps and form improvement.

Requirements:
1. Create text instruction system for failed rep feedback
2. Implement form feedback messages based on validation errors
3. Add audio feedback options (beeps, voice instructions)
4. Create help overlay with exercise demonstration animations
5. Implement progressive coaching based on common mistakes
6. Add accessibility features for feedback

Write tests first:
- Instruction system tests
- Form feedback tests
- Audio feedback tests
- Help overlay tests
- Accessibility tests

Implementation should include:
- InstructionSystem with contextual feedback
- FormFeedbackMessages component
- AudioFeedback service with options
- ExerciseHelpOverlay with demonstrations
- Accessibility-compliant feedback

User instructions should be clear and helpful. Feedback should guide users to improve form. All tests must pass.
```

### Prompt 6.5: Session Summary

```
Building on user instructions, create workout completion screen with session statistics and analysis.

Requirements:
1. Create WorkoutSummaryScreen displaying session statistics
2. Display rep breakdown with valid/invalid counts
3. Add exercise form analysis summary with improvement suggestions
4. Create session sharing capabilities (basic social sharing)
5. Implement session data visualization (charts/graphs)
6. Add option to save session notes

Write tests first:
- Summary screen rendering tests
- Statistics calculation tests
- Form analysis tests
- Sharing functionality tests
- Visualization component tests

Implementation should include:
- WorkoutSummaryScreen with comprehensive stats
- RepBredownChart component
- FormAnalysisSummary with suggestions
- Social sharing integration
- Session notes functionality

Summary should provide valuable insights into workout performance. Sharing should work across platforms. All tests must pass.
```

---

## Additional Chunks (7-12) Continue Similarly...

Each subsequent chunk follows the same pattern:
- Clear requirements building on previous work
- Test-first approach with comprehensive coverage
- Specific implementation guidelines
- Integration with existing components
- Success criteria and validation

The prompts ensure:
1. **Incremental progress** - each step builds on previous work
2. **Test-driven development** - tests written before implementation
3. **No orphaned code** - everything integrates with existing system
4. **Proper error handling** - comprehensive error scenarios covered
5. **Performance considerations** - optimization built into each step
6. **User experience focus** - UI/UX considerations in every prompt

This approach guarantees a robust, well-tested, and maintainable codebase that can be safely developed by following each prompt in sequence.
```

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Create detailed project blueprint", "status": "completed", "activeForm": "Creating detailed project blueprint"}, {"content": "Break down into iterative chunks", "status": "completed", "activeForm": "Breaking down into iterative chunks"}, {"content": "Further decompose into small steps", "status": "completed", "activeForm": "Further decomposing into small steps"}, {"content": "Review and right-size steps", "status": "completed", "activeForm": "Reviewing and right-sizing steps"}, {"content": "Generate test-driven implementation prompts", "status": "completed", "activeForm": "Generating test-driven implementation prompts"}]