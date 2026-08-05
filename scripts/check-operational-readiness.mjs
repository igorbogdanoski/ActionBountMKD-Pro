import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import process from 'node:process';
import {
  APPLICATION_ENVIRONMENT,
  findCredentialPatterns,
  referencedApplicationEnvironment,
} from './operational-readiness-lib.mjs';

const root = process.cwd();
const failures = [];
const requiredDocs = [
  'docs/OPERATIONAL_READINESS.md',
  'docs/INCIDENT_RESPONSE_RUNBOOK.md',
  'docs/RELEASE_CHECKLIST.md',
  'docs/SECRET_INVENTORY.md',
];
const ignoredEnvironment = new Set([
  'CI', 'MODE', 'PROD', 'PLAYWRIGHT_BASE_URL', 'DISABLE_HMR', 'EXPO_OS',
  'NODE_TLS_REJECT_UNAUTHORIZED', 'FIREBASE_EMULATORS_PATH',
  'FIREBASE_CLI_DISABLE_UPDATE_CHECK', 'FIRESTORE_EMULATOR_HOST',
]);
const textExtensions = new Set(['.cjs', '.js', '.json', '.jsx', '.md', '.mjs', '.ts', '.tsx', '.txt', '.yaml', '.yml']);
const gitEnvironment = {
  ...process.env,
  GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  XDG_CONFIG_HOME: resolve(root, '.firebase-local', 'config'),
};

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

for (const document of requiredDocs) {
  if (!existsSync(resolve(root, document))) failures.push(`missing required document: ${document}`);
}

const envExample = read('.env.example');
const inventory = existsSync(resolve(root, 'docs/SECRET_INVENTORY.md')) ? read('docs/SECRET_INVENTORY.md') : '';
const knownEnvironment = new Set(APPLICATION_ENVIRONMENT.map(item => item.name));
for (const item of APPLICATION_ENVIRONMENT) {
  if (!new RegExp(`^${item.name}=`, 'm').test(envExample)) {
    failures.push(`.env.example is missing ${item.name}`);
  }
  if (!inventory.includes(`\`${item.name}\``)) {
    failures.push(`SECRET_INVENTORY.md is missing ${item.name}`);
  }
}

const listedFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root,
  encoding: 'utf8',
  env: gitEnvironment,
}).split('\0').filter(Boolean);
const trackedFiles = new Set(execFileSync('git', ['ls-files', '-z'], {
  cwd: root,
  encoding: 'utf8',
  env: gitEnvironment,
}).split('\0').filter(Boolean));
const forbiddenTrackedBasenames = new Set([
  '.env', '.env.local', '.env.production', 'google-services.json',
  'GoogleService-Info.plist', 'service-account.json',
]);

for (const file of trackedFiles) {
  const normalized = file.replaceAll('\\', '/');
  const basename = normalized.split('/').at(-1);
  if (forbiddenTrackedBasenames.has(basename) && normalized !== '.env.example') {
    failures.push(`credential-bearing file must not be tracked: ${normalized}`);
  }
  if (/\.(?:pem|p12|pfx|jks|keystore)$/i.test(normalized)) {
    failures.push(`credential container must not be tracked: ${normalized}`);
  }
}

let scannedFiles = 0;
const referenced = new Set();
for (const file of listedFiles) {
  const normalized = file.replaceAll('\\', '/');
  if (normalized.startsWith('.codex/') || normalized === 'package-lock.json') continue;
  if (normalized !== '.env.example' && !textExtensions.has(extname(normalized))) continue;
  const absolute = resolve(root, file);
  if (!existsSync(absolute)) continue;
  const source = readFileSync(absolute, 'utf8');
  scannedFiles++;

  for (const finding of findCredentialPatterns(normalized, source)) {
    failures.push(`${normalized}: ${finding}`);
  }
  for (const name of referencedApplicationEnvironment(source)) referenced.add(name);
}

for (const name of referenced) {
  if (!knownEnvironment.has(name) && !ignoredEnvironment.has(name) && !name.startsWith('npm_')) {
    failures.push(`environment reference is not classified: ${name}`);
  }
}

const gitignore = read('.gitignore');
for (const requiredIgnore of ['.env*', 'apps/mobile/google-services.json', 'apps/mobile/GoogleService-Info.plist', '.firebase-local/']) {
  if (!gitignore.includes(requiredIgnore)) failures.push(`.gitignore is missing ${requiredIgnore}`);
}

if (failures.length) {
  console.error(`Operational readiness check failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`Operational readiness PASS: ${requiredDocs.length} runbooks, ${APPLICATION_ENVIRONMENT.length} environment entries, and ${scannedFiles} repository text files checked.`);
