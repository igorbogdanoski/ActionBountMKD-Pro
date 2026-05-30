import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Project root with an uppercase Windows drive letter. Vitest 4 fails to resolve
// its config when process.cwd() uses a lowercase drive (e.g. `c:\...`), throwing
// "Cannot read properties of undefined (reading 'config')" so no tests are found.
const root = fileURLToPath(new URL('..', import.meta.url)).replace(
  /^([a-z]):/,
  (_, d) => d.toUpperCase() + ':',
);

// chdir flips process.cwd() to the uppercase drive. We then launch the vitest
// entry with `node` directly (NOT via a shell) so the child inherits this cwd;
// going through cmd.exe would reset the drive casing back to lowercase.
try {
  process.chdir(root);
} catch {
  /* ignore — fall back to the existing cwd */
}

const vitestBin = fileURLToPath(
  new URL('../node_modules/vitest/vitest.mjs', import.meta.url),
).replace(/^([a-z]):/, (_, d) => d.toUpperCase() + ':');

const result = spawnSync(process.execPath, [vitestBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
