# FitProof Project Context

## Project Overview
**FitProof** is a mobile fitness app that uses Google's MediaPipe pose detection to verify exercises and enable social fitness competition. Users record themselves doing exercises, earn points for valid reps, and compete with friends.

## Key Project Files
- `/Users/corbin/Repos2/FitProof/FITPROOF_SPECIFICATION.md` - Complete technical specification
- `/Users/corbin/Repos2/FitProof/TODO.md` - Current progress and task checklist
- `/Users/corbin/Repos2/FitProof/DETAILED_STEPS.md` - Detailed implementation steps per chunk
- `/Users/corbin/Repos2/FitProof/IMPLEMENTATION_PROMPTS.md` - Test-driven implementation prompts

## Technology Stack
- **Mobile**: Expo React Native with TypeScript
- **Backend**: Node.js with TypeScript and GraphQL
- **Database**: PostgreSQL (main), SQLite (mobile local storage)
- **ML**: Google MediaPipe for pose detection
- **Deployment**: Railway or Render (V1)

## Current Status
- **Overall Progress**: 25% Complete (15/60 days)
- **Completed Chunks**:
  - ✅ Chunk 1: Project Foundation (5/5 days)
  - ✅ Chunk 2: Database Schema & Basic API (4/4 days)
  - ✅ Chunk 3: Authentication System (5/5 days)
- **Next Up**: Chunk 4: MediaPipe Integration (Day 15)

## Core Features (V1)
- Exercise Detection: Pushups, situps, squats with MediaPipe
- Real-time Validation: Live rep counting with form feedback
- Points System: Configurable points (Pushups/Situps: 2pts, Squats: 1pt)
- Social Features: Friends system with profile visibility
- Achievements: "First 1,000 Points" and "7-Day Streak" badges
- Offline Support: Local storage with sync queue

## Development Workflow
1. Always reference TODO.md for current progress
2. Use DETAILED_STEPS.md for implementation guidance
3. Follow IMPLEMENTATION_PROMPTS.md for test-driven development
4. Update TODO.md when completing tasks/chunks
5. Break work into 5-day chunks with daily goals

## Important Notes
- Test-driven development approach required
- MediaPipe performance target: 60fps on mid-range devices
- Exercise validation accuracy target: >90%
- No video recording - only landmark data capture
- Friend-only data visibility (no public profiles in V1)