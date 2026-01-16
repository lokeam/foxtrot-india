# Heave Fleet Inspector - Mobile App

React Native mobile application for heavy equipment fleet inspections.

## Tech Stack

- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Navigation**: React Navigation (Native Stack)
- **API Client**: tRPC with React Query
- **State Management**: React Query

## Project Structure

```
src/
├── config/          # App configuration and constants
├── navigation/      # Navigation setup
├── screens/         # Screen components
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and tRPC client
└── App.tsx          # Main app component
```

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser
- `npm run typecheck` - Run TypeScript type checking

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure the backend API is running on `http://localhost:3001`

3. Start the Expo development server:
   ```bash
   npm start
   ```

4. Scan the QR code with Expo Go app (iOS/Android) or press:
   - `i` for iOS simulator
   - `a` for Android emulator
   - `w` for web browser

## API Configuration

The app connects to the backend API at `http://localhost:3001/trpc` by default.
To change this, update `API_URL` in `src/config/constants.ts`.

## Features (Phase 2)

- ✅ Equipment list view with status badges
- ✅ Equipment detail view with inspection history
- ✅ Navigation between screens
- ✅ Pull-to-refresh functionality
- ✅ Loading and error states
- 🚧 Inspection form (Phase 3)
- 🚧 Camera integration (Phase 3)
- 🚧 Photo upload (Phase 3)

## Inspector

Hardcoded inspector name: **Jake Morrison**
