import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { secureTlsEnvironment } from './secure-tls-env.mjs';

const repoRoot = process.cwd();
const localFirebaseDir = join(repoRoot, '.firebase-local');
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error('test:rules must be started through npm so the pinned Firebase CLI can be resolved.');
}

await mkdir(localFirebaseDir, { recursive: true });

const child = spawn(process.execPath, [
  npmCli,
  'exec',
  '--yes',
  '--package=firebase-tools@15.25.1',
  '--',
  'firebase',
  'emulators:exec',
  '--project', 'actionbountmkd-rules-test',
  '--config', 'firebase.rules.test.json',
  '--only', 'firestore',
  'node --test e2e/rules/firestore.rules.test.mjs',
], {
  cwd: repoRoot,
  env: {
    ...secureTlsEnvironment(process.env),
    APPDATA: localFirebaseDir,
    LOCALAPPDATA: localFirebaseDir,
    XDG_CONFIG_HOME: join(localFirebaseDir, 'config'),
    XDG_CACHE_HOME: join(localFirebaseDir, 'cache'),
    npm_config_cache: join(localFirebaseDir, 'npm-cache'),
    FIREBASE_EMULATORS_PATH: join(localFirebaseDir, 'emulators'),
    FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true',
  },
  stdio: 'inherit',
});

child.on('error', error => {
  console.error(error);
  process.exitCode = 1;
});

child.on('exit', code => {
  process.exitCode = code ?? 1;
});
