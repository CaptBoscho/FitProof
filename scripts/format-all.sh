#!/bin/bash

# FitProof Code Formatter Script
set -e

echo "🎨 Formatting all code in FitProof..."

# Format backend
echo "📊 Formatting backend code..."
cd backend
npm run format
npm run lint:fix
cd ..

# Format mobile
echo "📱 Formatting mobile code..."
cd mobile
npm run format
npm run lint:fix
cd ..

echo "✅ All code formatted successfully!"