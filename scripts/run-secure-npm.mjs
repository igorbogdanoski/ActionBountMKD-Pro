import { spawn } from 'node:child_process';
import { secureTlsEnvironment } from './secure-tls-env.mjs';

const npmCli = process.env.npm_execpath;
const args = process.argv.slice(2);

if (!npmCli) {
  throw new Error('run-secure-npm must be started through npm.');
}
if (args.length === 0) {
  throw new Error('Provide an npm command, for example: audit --omit=dev.');
}

const child = spawn(process.execPath, [npmCli, ...args], {
  cwd: process.cwd(),
  env: secureTlsEnvironment(process.env),
  stdio: 'inherit',
});

child.on('error', error => {
  console.error(error);
  process.exitCode = 1;
});

child.on('exit', code => {
  process.exitCode = code ?? 1;
});
