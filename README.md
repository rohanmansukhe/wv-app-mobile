# Workverge Mobile

React Native + Tamagui mobile app for Workverge employee panel. Targets iOS and Android.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure API URL**
   - Copy `.env.example` to `.env`
   - Set `EXPO_PUBLIC_API_URL` to your webapp backend (e.g. `http://localhost:3001` for dev)

3. **Run**
   ```bash
   npm start
   ```
   Then press `i` for iOS simulator or `a` for Android emulator.

## Auth Flow

Same as desktop: initiate → open browser → user signs in on webapp → poll for token → store in SecureStore.

- Uses `POST /api/atx/v1/desktop/auth/initiate/`
- Opens auth URL via `Linking.openURL()`
- Polls `GET /api/atx/v1/desktop/auth/poll/?sessionId=xxx`
- Verifies with `GET /api/atx/v1/mobile/auth/verify`

## Structure

- `src/lib/auth.js` - Auth service
- `src/lib/api.js` - API client
- `src/context/AuthContext.js` - Auth state
- `src/screens/` - Login, Dashboard, Profile
- `src/navigation/AppNavigator.js` - Stack + bottom tabs
- `tamagui.config.js` - Theme (desktop colors: indigo accent, light/dark)

## Requirements

- Webapp backend running (e.g. `npm run dev` in atx-app)
- Expo Go app or simulator for testing
