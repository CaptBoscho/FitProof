#!/bin/bash

# FitProof Development Setup Script
set -e

echo "🏗️  Setting up FitProof development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }

echo "✅ Prerequisites check passed"

# Setup backend
echo "📦 Installing backend dependencies..."
cd backend
npm install

echo "🐘 Starting PostgreSQL database..."
docker-compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 5

echo "🗄️  Running database migrations..."
npm run migration:run

echo "🧪 Running backend tests..."
npm test

cd ..

# Setup mobile
echo "📱 Installing mobile dependencies..."
cd mobile
npm install

echo "🧪 Running type checks..."
npm run typecheck

cd ..

echo "✅ Development environment setup complete!"
echo ""
echo "🚀 Next steps:"
echo "  1. Start backend: cd backend && npm run dev"
echo "  2. Start mobile: cd mobile && npm run start"
echo "  3. See DEVELOPMENT.md for more details"