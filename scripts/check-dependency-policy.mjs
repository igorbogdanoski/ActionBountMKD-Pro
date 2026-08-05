import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const readJson = relativePath => JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
const rootPackage = readJson('package.json');
const webPackage = readJson('apps/web/package.json');
const mobilePackage = readJson('apps/mobile/package.json');
const mobileExpoConfig = readJson('apps/mobile/app.base.json');
const lock = readJson('package-lock.json');
const failures = [];

function expectEqual(actual, expected, label) {
  if (actual !== expected) failures.push(`${label}: expected ${expected}, received ${String(actual)}`);
}

function expectAbsent(value, label) {
  if (value !== undefined) failures.push(`${label}: must remain absent`);
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.(?:[cm]?[jt]sx?)$/.test(entry.name) ? [absolute] : [];
  });
}

expectEqual(rootPackage.engines?.node, '>=22.0.0', 'root Node engine');
expectAbsent(rootPackage.overrides, 'root overrides');
expectAbsent(rootPackage.resolutions, 'root resolutions');

expectEqual(webPackage.dependencies?.react, '19.2.3', 'web React');
expectEqual(webPackage.dependencies?.['react-dom'], '19.2.3', 'web React DOM');
expectEqual(webPackage.dependencies?.['react-router-dom'], '^7.18.2', 'web React Router DOM');
expectEqual(webPackage.dependencies?.['firebase-admin'], '^14.2.0', 'web Firebase Admin');
expectAbsent(webPackage.dependencies?.['react-router'], 'direct web react-router');

// Expo SDK 56 targets React 19.2.3. Keep one React runtime across this shared
// workspace; Router 8 requires React 19.2.7 and is intentionally deferred.
expectEqual(mobilePackage.dependencies?.react, '19.2.3', 'mobile Expo React');
expectEqual(mobilePackage.dependencies?.['react-dom'], '19.2.3', 'mobile Expo React DOM');
expectEqual(mobilePackage.dependencies?.expo, '~56.0.18', 'mobile Expo SDK');
expectEqual(mobilePackage.dependencies?.['expo-router'], '~56.2.17', 'mobile Expo Router');
expectEqual(mobilePackage.dependencies?.['react-native-screens'], '~4.26.0', 'mobile screens compatibility');
if (!mobileExpoConfig.expo?.plugins?.includes('expo-image')) {
  failures.push('mobile Expo config: expo-image plugin is required');
}

const locked = lock.packages ?? {};
expectEqual(locked['node_modules/react']?.version, '19.2.3', 'locked shared React');
expectEqual(locked['node_modules/react-dom']?.version, '19.2.3', 'locked shared React DOM');
expectEqual(locked['node_modules/react-router']?.version, '7.18.2', 'locked React Router');
expectEqual(locked['node_modules/react-router-dom']?.version, '7.18.2', 'locked React Router DOM');
expectEqual(locked['node_modules/firebase-admin']?.version, '14.2.0', 'locked Firebase Admin');

const webSources = [
  ...sourceFiles(path.join(root, 'apps/web/src')),
  path.join(root, 'apps/web/vite.config.ts'),
  path.join(root, 'e2e/vite.auth.config.ts'),
  path.join(root, 'e2e/vite.public.config.ts'),
];
for (const file of webSources) {
  const source = readFileSync(file, 'utf8');
  if (/from\s+['"]react-router['"]/.test(source)) {
    failures.push(`${path.relative(root, file)}: import routing APIs through react-router-dom`);
  }
  if (/\b(?:RSCHydratedRouter|RSCStaticRouter|createCallServer|getRSCStream|matchRSCServerRequest|routeRSCServerRequest)\b/.test(source)) {
    failures.push(`${path.relative(root, file)}: unstable RSC API is outside the approved SPA threat model`);
  }
}

const applicationSources = [
  ...sourceFiles(path.join(root, 'apps/web/src')),
  ...sourceFiles(path.join(root, 'apps/mobile/src')),
];
for (const file of applicationSources) {
  const source = readFileSync(file, 'utf8');
  if (/from\s+['"]uuid['"]|require\(['"]uuid['"]\)/.test(source)) {
    failures.push(`${path.relative(root, file)}: direct uuid usage is outside the controlled transitive exception`);
  }
}

const apiSources = [
  ...sourceFiles(path.join(root, 'api')),
  path.join(root, 'apps/web/scripts/set-admin-claim.mjs'),
];
for (const file of apiSources) {
  const source = readFileSync(file, 'utf8');
  if (/from\s+['"]firebase-admin['"]|require\(['"]firebase-admin['"]\)/.test(source)) {
    failures.push(`${path.relative(root, file)}: use Firebase Admin modular entry points`);
  }
}

if (failures.length > 0) {
  console.error('Dependency policy failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log('Dependency policy PASS: one React runtime, controlled Router/uuid exposure, Firebase Admin 14, and Expo SDK 56 compatibility are intact.');
