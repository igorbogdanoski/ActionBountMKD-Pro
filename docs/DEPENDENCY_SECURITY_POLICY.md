# Dependency security policy

This repository uses a local-first, compatibility-gated dependency policy. A
reported advisory is not suppressed silently: it is either upgraded safely or
kept as an explicit, testable exception until the workspace can absorb the
upstream fix.

## Current controls

- Node.js 22 or newer is required because Firebase Admin 14 no longer supports
  Node.js 20.
- Firebase Admin is pinned to the current 14.x line and server code uses only
  modular entry points.
- Expo SDK 56 packages are kept on the versions selected by `expo install`, and
  `expo-doctor` must pass.
- Web and mobile share React 19.2.3. This prevents multiple React runtimes in
  the npm workspace.
- React Router stays on 7.18.2 while the application remains a declarative SPA.
  The open high-severity advisory applies to unstable RSC APIs, which this
  repository does not import. React Router 8.3 would require React 19.2.7,
  conflicting with Expo SDK 56's React 19.2.3 compatibility pin.
- Remaining `uuid` advisories are accepted only as transitive dependencies of
  Expo tooling and optional Firebase Admin storage support. Application source
  must not import `uuid` directly.
- Root-level `overrides` and `resolutions` are prohibited. Do not force a
  transitive version that its parent package has not declared compatible.

## Verification

Run these locally before accepting dependency changes:

```powershell
npm run test:dependency-policy
npm run test:security-env
npm run audit:secure -- --omit=dev
npm exec expo-doctor@latest --workspace=mobile
```

The policy check fails if React versions drift, unstable RSC APIs or direct
`uuid` imports appear, Firebase Admin returns to legacy imports, or an override
is added. Revisit the Router exception when Expo supports React 19.2.7 or the
workspaces are installed and tested with isolated React runtimes.
