# QueueLess Mobile (React Native)

QueueLess Mobile is an Expo + React Native client that reuses the same backend APIs as your web app.

## Features

- Customer flow: login/register, scan or enter QR code, select services, join queue, track status
- Business flow: dashboard, active queue actions, service management
- Shared account flow: profile update + logout
- Modern dark-blue mobile UI aligned with QueueLess web branding

## Stack

- Expo SDK 52
- React Native + TypeScript
- React Navigation (stack + tabs)
- Axios API client with JWT auth header
- AsyncStorage session persistence
- Expo Camera QR scanner

## Project Structure

- `App.tsx`: app root
- `src/context/AuthContext.tsx`: auth state and API session
- `src/lib/api.ts`: axios client for backend routes
- `src/navigation/AppNavigator.tsx`: role-based navigation
- `src/screens/auth/*`: auth screens
- `src/screens/customer/*`: customer screens
- `src/screens/business/*`: business dashboard
- `src/screens/shared/*`: profile and queue status

## Setup

1. Install dependencies:

```bash
cd mobile
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Set API URL inside `.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

4. Start Expo:

```bash
npm run start
```

5. Run on device/emulator:

- Press `a` for Android emulator
- Press `i` for iOS simulator (macOS)
- Scan QR with Expo Go on a real phone

## API Notes

The app is wired to your existing backend routes:

- `POST /auth/register`
- `POST /auth/login`
- `PUT /auth/profile`
- `GET /business/me`
- `GET /business/queue`
- `PUT /business/services`
- `PUT /business/queue/:id/status`
- `GET /queue/my-queues`
- `GET /queue/history`
- `GET /queue/store/:qrCode`
- `POST /queue/join`
- `GET /queue/status/:id`

## Device Networking Tips

For physical device testing, `localhost` usually points to the phone itself, not your PC.
Use your machine LAN IP instead, for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.25:5000/api
```
