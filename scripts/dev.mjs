import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Portable monorepo entrypoint. Accept both Next and generic preview CLI flags.
const require = createRequire(import.meta.url);
const args = process.argv.slice(2).flatMap(arg => arg === '--strictPort' ? [] : [arg === '--host' ? '--hostname' : arg]);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...args], {
  cwd: fileURLToPath(new URL('../apps/website', import.meta.url)), stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
