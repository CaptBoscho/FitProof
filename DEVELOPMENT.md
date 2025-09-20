# FitProof Development Guide

## 🏗️ Project Structure

```
FitProof/
├── backend/          # Node.js TypeScript backend
├── mobile/           # Expo React Native app
├── .gitignore        # Root-level gitignore
├── TODO.md           # Development progress tracker
└── DEVELOPMENT.md    # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (recommended: 20 LTS)
- Docker and Docker Compose
- iOS Simulator (Mac) or Android Studio
- PostgreSQL (via Docker)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd FitProof
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure your environment
docker-compose up -d  # Start PostgreSQL
npm run migration:run # Run database migrations
npm run dev          # Start development server
```

Backend will be available at: http://localhost:4000

### 3. Mobile Setup
```bash
cd mobile
npm install
npm run start        # Start Expo dev server
```

Then choose your platform:
- `i` for iOS Simulator
- `a` for Android Emulator
- `w` for Web browser

## 🛠️ Development Scripts

### Backend Scripts
```bash
# Development
npm run dev                 # Start dev server with hot reload
npm run build              # Build for production
npm run start              # Start production server

# Testing
npm test                   # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run format             # Format code with Prettier
npm run typecheck          # Check TypeScript types

# Database
npm run migration:generate # Generate new migration
npm run migration:run      # Run pending migrations
npm run migration:revert   # Revert last migration
```

### Mobile Scripts
```bash
# Development
npm run start              # Start Expo dev server
npm run ios                # Start on iOS simulator
npm run android            # Start on Android emulator
npm run web                # Start web version

# Testing
npm test                   # Run Jest tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run format             # Format code with Prettier
npm run typecheck          # Check TypeScript types
```

## 🗄️ Database

### Setup
PostgreSQL runs on port 5433 (to avoid conflicts) via Docker Compose.

```bash
cd backend
docker-compose up -d       # Start database
npm run migration:run      # Apply schema
```

### Access Database
```bash
# Via Docker
docker exec -it fitproof-db psql -U fitproof -d fitproof

# Or connect directly
psql -h localhost -p 5433 -U fitproof -d fitproof
```

## 🔄 Development Workflow

### Hot Reloading
- **Backend**: Nodemon watches for changes and restarts server
- **Mobile**: Expo provides hot reloading for React Native

### Code Quality
Both projects have ESLint + Prettier configured:
```bash
npm run lint:fix && npm run format
```

### Testing
```bash
# Backend
cd backend && npm test

# Mobile
cd mobile && npm test
```

## 🧪 Testing Strategy

### Backend Tests
- **Unit Tests**: Individual functions and classes
- **Integration Tests**: GraphQL resolvers and database
- **E2E Tests**: Full API workflows

### Mobile Tests
- **Unit Tests**: Component logic and utilities
- **Component Tests**: React Native components
- **Integration Tests**: Navigation and API integration

## 📱 Mobile Development

### Expo Configuration
- SDK 54 with TypeScript
- React Navigation for routing
- Apollo Client for GraphQL
- AsyncStorage for persistence

### Testing on Devices
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Physical Device (scan QR code)
npm run start
```

## 🚨 Troubleshooting

### Common Issues

**Port Conflicts**
- Backend: Change `PORT` in `.env`
- Database: Change port in `docker-compose.yml`

**Database Connection Failed**
```bash
docker-compose down
docker-compose up -d
npm run migration:run
```

**Mobile Build Issues**
```bash
npx expo install --fix
npm run start --clear
```

**TypeScript Errors**
```bash
npm run typecheck
npm run lint:fix
```

### Database Reset
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d
npm run migration:run
```

## 📚 Useful Commands

### Git Workflow
```bash
git status                 # Check changes
npm run lint:fix          # Fix code issues
npm run format            # Format code
npm test                  # Run tests
git add .
git commit -m "message"
```

### Health Checks
```bash
# Backend API health
curl http://localhost:4000/health

# Database connection
npm run typeorm -- query "SELECT NOW()"

# Mobile app status
expo doctor
```

## 🔗 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Apollo GraphQL](https://www.apollographql.com/docs/)
- [React Navigation](https://reactnavigation.org/)
- [TypeORM](https://typeorm.io/)
- [Jest Testing](https://jestjs.io/)

## 🎯 Next Steps

1. Complete backend authentication system
2. Implement MediaPipe pose detection
3. Add real-time workout tracking
4. Build social features (friends, leaderboards)
5. Integrate offline sync capabilities

---

For project status and detailed tasks, see [TODO.md](./TODO.md)