import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { join, resolve, sep } from 'node:path';
import process from 'node:process';
import { secureTlsEnvironment } from './secure-tls-env.mjs';

const FIREBASE_TOOLS_VERSION = '15.25.1';
const PROJECT_ID = 'demo-actionbountmkd-backup-drill';
const repoRoot = process.cwd();
const localFirebaseDir = join(repoRoot, '.firebase-local');
const drillParent = join(localFirebaseDir, 'backup-drills');
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error('test:backup-restore must be started through npm so the pinned Firebase CLI can be resolved.');
}

await mkdir(drillParent, { recursive: true });
const drillRoot = await mkdtemp(join(drillParent, 'drill-'));
const exportDirectory = join(drillRoot, 'firestore-export');
const portableExportDirectory = exportDirectory.replaceAll('\\', '/');
let completed = false;

function isPortOpen(port) {
  return new Promise(resolvePort => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const finish = value => {
      socket.destroy();
      resolvePort(value);
    };
    socket.setTimeout(500);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}

async function waitForPreviousEmulatorShutdown() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const [hubOpen, firestoreOpen] = await Promise.all([isPortOpen(4400), isPortOpen(8186)]);
    if (!hubOpen && !firestoreOpen) return;
    await new Promise(resolveWait => setTimeout(resolveWait, 200));
  }
  throw new Error('Previous emulator process did not release ports 4400/8186 within 15 seconds.');
}

function runFirebase(extraArgs, command) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [
      npmCli,
      'exec',
      '--yes',
      `--package=firebase-tools@${FIREBASE_TOOLS_VERSION}`,
      '--',
      'firebase',
      'emulators:exec',
      '--project', PROJECT_ID,
      '--config', 'firebase.backup-drill.json',
      '--only', 'firestore',
      '--log-verbosity', 'QUIET',
      ...extraArgs,
      command,
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

    child.on('error', rejectPromise);
    child.on('exit', code => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`Firebase emulator drill step failed with exit code ${code ?? 'unknown'}.`));
    });
  });
}

try {
  await runFirebase(
    [`--export-on-exit=${portableExportDirectory}`],
    'node e2e/ops/firestore-backup-seed.mjs',
  );
  await waitForPreviousEmulatorShutdown();

  const metadataPath = join(exportDirectory, 'firebase-export-metadata.json');
  await access(metadataPath);
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  if (!metadata.firestore) {
    throw new Error('Emulator export manifest does not contain Firestore metadata.');
  }

  await runFirebase(
    [`--import=${portableExportDirectory}`],
    'node e2e/ops/firestore-backup-verify.mjs',
  );

  completed = true;
  console.log('Local backup/restore drill PASS: export manifest created and a fresh emulator import matched every fixture.');
} finally {
  if (completed) {
    const resolvedParent = resolve(drillParent);
    const resolvedDrill = resolve(drillRoot);
    if (!resolvedDrill.startsWith(`${resolvedParent}${sep}`)) {
      throw new Error(`Refusing to remove unexpected drill path: ${resolvedDrill}`);
    }
    await rm(resolvedDrill, { recursive: true, force: true });
  } else {
    console.error(`Backup drill artifacts preserved for diagnosis: ${drillRoot}`);
  }
}
