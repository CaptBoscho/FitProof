#!/bin/bash

# Generic Project Setup Script for LearnPath-like projects
# This script sets up a basic TypeScript Node.js + React Native project structure

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_NAME="${1:-LearnPath}"
MOBILE_APP_NAME="${PROJECT_NAME}-mobile"
SERVER_NAME="${PROJECT_NAME}-server"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}🚀 Setting up ${PROJECT_NAME} Development Environment (Generic)${NC}"
echo -e "${BLUE}============================================================================${NC}"

# Helper Functions
log_step() {
    echo -e "\n${BLUE}📋 $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check basic requirements
log_step "Checking basic requirements..."

if ! command_exists node; then
    log_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

if ! command_exists npm; then
    log_error "npm is not installed. Please install npm first."
    exit 1
fi

log_success "Node.js and npm are available"

# Create project structure
log_step "Creating project structure..."

mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

log_success "Created project directory: $PROJECT_NAME"

# Server Setup (Node.js + TypeScript)
log_step "Setting up Node.js TypeScript server..."

mkdir "$SERVER_NAME"
cd "$SERVER_NAME"

# Initialize package.json
npm init -y

# Install server dependencies
log_step "Installing server dependencies..."
npm install express cors helmet morgan compression
npm install jsonwebtoken bcryptjs
npm install prisma @prisma/client
npm install zod
npm install winston
npm install dotenv
npm install axios

# Install development dependencies including tsconfig-paths
npm install -D typescript @types/node @types/express @types/cors @types/jsonwebtoken @types/bcryptjs @types/morgan
npm install -D nodemon ts-node tsconfig-paths
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
npm install -D jest @types/jest supertest @types/supertest

# Create TypeScript configuration with path mapping
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/controllers/*": ["src/controllers/*"],
      "@/services/*": ["src/services/*"],
      "@/middleware/*": ["src/middleware/*"],
      "@/types/*": ["src/types/*"],
      "@/utils/*": ["src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "ts-node": {
    "require": ["tsconfig-paths/register"]
  }
}
EOF

# Update package.json with scripts
cat > package.json << EOF
{
  "name": "${SERVER_NAME,,}",
  "version": "1.0.0",
  "description": "TypeScript Node.js Server",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon src/index.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "ts-node prisma/seed.ts"
  },
  "keywords": ["nodejs", "typescript", "express", "api"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "compression": "^1.7.4",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "prisma": "^5.7.1",
    "@prisma/client": "^5.7.1",
    "zod": "^3.22.2",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1",
    "axios": "^1.5.0"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "@types/node": "^20.5.9",
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/bcryptjs": "^2.4.2",
    "@types/morgan": "^1.9.4",
    "nodemon": "^3.0.1",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "eslint": "^8.48.0",
    "@typescript-eslint/eslint-plugin": "^6.5.0",
    "@typescript-eslint/parser": "^6.5.0",
    "prettier": "^3.0.3",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "jest": "^29.6.4",
    "@types/jest": "^29.5.5",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12"
  }
}
EOF

# Create basic folder structure
mkdir -p src/{controllers,middleware,routes,services,types,utils,config}
mkdir -p tests/{unit,integration}
mkdir -p prisma

# Create environment file template
cat > .env.example << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/app_dev"
TEST_DATABASE_URL="postgresql://username:password@localhost:5433/app_test"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# API Keys (if needed)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
EOF

# Create actual .env file
cp .env.example .env

# Create basic server entry point
cat > src/index.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Basic API endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'API v1',
    status: 'Ready'
  });
});

// TODO: Add route imports when implementing features
// Example:
// import authRoutes from './routes/auth';
// app.use('/api/v1/auth', authRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

export default app;
EOF

cd ..

log_success "Server setup complete!"

# Mobile App Setup (if Expo CLI is available)
if command_exists expo; then
    log_step "Setting up React Native Expo mobile app..."

    # Create Expo app with TypeScript template
    npx create-expo-app "$MOBILE_APP_NAME" --template blank-typescript

    cd "$MOBILE_APP_NAME"

    # Install basic navigation and utilities
    npx expo install @react-navigation/native @react-navigation/stack
    npx expo install react-native-screens react-native-safe-area-context
    npx expo install @react-native-async-storage/async-storage
    npm install axios

    # Create basic folder structure
    mkdir -p src/{components,screens,services,types,utils}

    # Create basic API service
    cat > src/services/api.ts << 'EOF'
import axios from 'axios';

const BASE_URL = __DEV__ ? 'http://localhost:3000' : 'https://your-api-domain.com';

const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { apiClient };
export default apiClient;
EOF

    cd ..

    log_success "Mobile app setup complete!"
else
    log_warning "Expo CLI not found. Skipping mobile app setup."
    log_warning "To set up the mobile app later, install Expo CLI: npm install -g @expo/cli"
fi

# Create basic README
cat > README.md << EOF
# $PROJECT_NAME

A TypeScript project with Node.js backend and optional React Native mobile app.

## Setup

### Backend Server
\`\`\`bash
cd $SERVER_NAME
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
\`\`\`

### Mobile App (if created)
\`\`\`bash
cd $MOBILE_APP_NAME
npm install
npx expo start
\`\`\`

## Development Commands

### Server
- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run test\` - Run tests
- \`npm run lint\` - Check code style

### Database (if using Prisma)
- \`npm run db:generate\` - Generate Prisma client
- \`npm run db:migrate\` - Run migrations
- \`npm run db:studio\` - Open database browser
- \`npm run db:seed\` - Seed database

## Environment Variables

See \`$SERVER_NAME/.env.example\` for required environment variables.

## Key Features

- ✅ TypeScript configuration with path mapping
- ✅ Express.js server with security middleware
- ✅ ESLint and Prettier configuration
- ✅ Jest testing setup
- ✅ Prisma ORM ready for database operations
- ✅ Development and production scripts

## Troubleshooting

### tsconfig-paths Error
If you see errors about missing 'tsconfig-paths/register', it's already included in devDependencies and configured in tsconfig.json.

### Port Conflicts
Update the PORT in \`.env\` if port 3000 is already in use.
EOF

# Initialize git repository
log_step "Initializing Git repository..."

git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.test
.env.local
.env.production

# Build outputs
dist/
build/
*.tsbuildinfo

# Logs
logs/
*.log

# Database
*.sqlite
*.sqlite3
*.db

# OS generated files
.DS_Store
.DS_Store?
._*
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Expo
.expo/
web-build/

# Testing
coverage/
EOF

git add .
git commit -m "Initial project setup with TypeScript Node.js server

- Express.js server with TypeScript
- tsconfig-paths for path mapping
- ESLint and Prettier configuration
- Basic project structure and dependencies
- Environment configuration
- Testing setup with Jest"

log_success "Git repository initialized!"

# Summary
echo -e "\n${GREEN}============================================================================${NC}"
echo -e "${GREEN}🎉 Generic Project Setup Complete!${NC}"
echo -e "${GREEN}============================================================================${NC}"

echo -e "\n${BLUE}📦 Created:${NC}"
echo -e "  ✅ Node.js TypeScript server: ${YELLOW}$SERVER_NAME${NC}"
if command_exists expo; then
    echo -e "  ✅ React Native Expo app: ${YELLOW}$MOBILE_APP_NAME${NC}"
fi
echo -e "  ✅ Git repository with initial commit"

echo -e "\n${BLUE}🔧 Key Features:${NC}"
echo -e "  ✅ TypeScript with path mapping support"
echo -e "  ✅ tsconfig-paths dependency included"
echo -e "  ✅ Express.js server with security middleware"
echo -e "  ✅ ESLint and Prettier configuration"
echo -e "  ✅ Jest testing framework"
echo -e "  ✅ Environment configuration"

echo -e "\n${BLUE}🚀 Quick Start:${NC}"
echo -e "  ${YELLOW}# Start the server${NC}"
echo -e "  cd $SERVER_NAME && npm run dev"

if command_exists expo; then
    echo -e ""
    echo -e "  ${YELLOW}# Start the mobile app (in another terminal)${NC}"
    echo -e "  cd $MOBILE_APP_NAME && npx expo start"
fi

echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo -e "  1. Update ${YELLOW}$SERVER_NAME/.env${NC} with your configuration"
echo -e "  2. Add your API routes and business logic"
echo -e "  3. Set up database with Prisma (if needed)"
echo -e "  4. Write tests for your features"

echo -e "\n${GREEN}Happy coding! 🚀${NC}"

log_success "Generic setup script completed successfully!"