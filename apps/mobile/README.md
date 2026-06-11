# FreshTrack Mobile (Expo)

Expo/React Native app untuk academic MVP FreshTrack. Runtime aktif adalah backend Go + PostgreSQL lokal melalui `EXPO_PUBLIC_API_URL`.

## Demo Commands

Install/check mobile dependencies:

```bash
npm install
npx tsc --noEmit
npm test -- --runInBand
npm run lint
```

Run on Android emulator against local backend:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 npx expo run:android
```

Use `http://10.0.2.2:8080` from the emulator because the backend runs on the host machine.

## MVP Scope

- Add, edit, delete inventory items.
- Require item name and expiry date; reject negative quantity.
- Sort inventory by expiry date.
- Mark items consumed or wasted with amount validation.
- Load item detail and activity history from backend APIs.
- Show in-app expiry labels: `EXPIRED`, `H-1`, `H-3`, `H-7`, `FRESH`.
- Display household invite suffix/full code according to backend support.

## Post-MVP

- Real OS push notifications via `expo-notifications`.
- Photo upload/storage.
- Real camera barcode verification on physical devices.
- Production email and hosted beta environment.
