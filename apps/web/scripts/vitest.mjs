import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const upper = (p) => p.replace(/^([a-z]):/, (_, d) => d.toUpperCase() + ':');

// Project root with an uppercase Windows drive letter. Vitest 4 fails to resolve
// its config when process.cwd() uses a lowercase drive (e.g. `c:\...`), throwing
// "Cannot read properties of undefined (reading 'config')" so no tests are found.
const root = upper(fileURLToPath(new URL('..', import.meta.url)));

// chdir flips process.cwd() to the uppercase drive. We then launch the vitest
// entry with `node` directly (NOT via a shell) so the child inherits this cwd;
// going through cmd.exe would reset the drive casing back to lowercase.
try {
  process.chdir(root);
} catch {
  /* ignore — fall back to the existing cwd */
}

// Resolve the vitest entry no matter where npm placed it (local app
// node_modules OR hoisted to the workspace root).
function resolveVitestBin() {
  const require = createRequire(import.meta.url);
  try {
    return require.resolve('vitest/vitest.mjs');
  } catch {
    /* exports map may block the subpath — fall back to scanning candidates */
  }
  const candidates = [
    new URL('../node_modules/vitest/vitest.mjs', import.meta.url),
    new URL('../../../node_modules/vitest/vitest.mjs', import.meta.url),
  ].map((u) => fileURLToPath(u));
  try {
    const pkg = require.resolve('vitest/package.json');
    candidates.unshift(fileURLToPath(new URL('./vitest.mjs', `file://${pkg}`)));
  } catch {
    /* ignore */
  }
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error('Cannot locate vitest entry (vitest.mjs). Run `npm install`.');
  }
  return found;
}

const vitestBin = upper(resolveVitestBin());

const result = spawnSync(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
