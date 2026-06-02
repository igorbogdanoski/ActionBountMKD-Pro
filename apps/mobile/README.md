# Mobile App

Expo mobile client for ActionBountMKD Pro.

## Local Development

1. Install dependencies.

```bash
npm install
```

2. Start Expo.

```bash
npx expo start
```

3. For native Google Sign-In and push notifications, use a development build instead of Expo Go.

```bash
npx expo run:android
```

## Validation

- TypeScript: `npx tsc --noEmit`
- Expo config resolution: `npx expo config --type public`

## Environment

The app expects the Firebase and Google public env vars already referenced in `eas.json`.

Required for Google auth runtime:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

## Native Credentials

### Google Sign-In

To fully enable native Google login, place these files in this folder:

- `google-services.json`
- `GoogleService-Info.plist`

They are ignored by git and picked up automatically by `app.config.js` when present.

Without them:

- the JavaScript Google sign-in flow is wired,
- TypeScript passes,
- but native Android/iOS verification is not complete.

### Push Notifications

The app already includes `expo-notifications` client scaffolding, permission UI, token sync, and a local test notification flow.

To complete remote push delivery you still need:

- a dev/EAS build on a physical device,
- valid platform notification credentials,
- a sender flow or backend endpoint that sends Expo push messages.

## Production Checklist

1. Add `google-services.json` and `GoogleService-Info.plist`.
2. Run `npx expo config --type public` and verify the native files are injected.
3. Build a dev client with EAS or `expo run`.
4. Verify Google sign-in on a physical Android device.
5. Enable notifications from Settings and confirm token registration.
6. Send a test push and verify tap deep-link routing.
