import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { secureTlsEnvironment } from './secure-tls-env.mjs';

const repoRoot = process.cwd();
const localFirebaseDir = join(repoRoot, '.firebase-local');
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error('test:quest-migration must be started through npm so the pinned Firebase CLI can be resolved.');
}

await mkdir(localFirebaseDir, { recursive: true });

function run(command, args, environment = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: environment,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Child process exited with code ${code ?? 1}`)));
  });
}

await run(process.execPath, ['--test', 'scripts/migrate-quest-stages.test.mjs']);

const environment = {
  ...secureTlsEnvironment(process.env),
  APPDATA: localFirebaseDir,
  LOCALAPPDATA: localFirebaseDir,
  XDG_CONFIG_HOME: join(localFirebaseDir, 'config'),
  XDG_CACHE_HOME: join(localFirebaseDir, 'cache'),
  npm_config_cache: join(localFirebaseDir, 'npm-cache'),
  FIREBASE_EMULATORS_PATH: join(localFirebaseDir, 'emulators'),
  FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true',
};

await run(process.execPath, [
  npmCli,
  'exec',
  '--yes',
  '--package=firebase-tools@15.25.1',
  '--',
  'firebase',
  'emulators:exec',
  '--project', 'demo-actionbountmkd-quest-migration',
  '--config', 'firebase.rules.test.json',
  '--only', 'firestore',
  'node e2e/ops/quest-stage-migration-drill.mjs',
], environment);
