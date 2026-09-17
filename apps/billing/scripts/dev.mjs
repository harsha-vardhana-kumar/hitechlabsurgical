import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const args = process.argv.slice(2).flatMap(arg => arg === '--strictPort' ? [] : [arg === '--host' ? '--hostname' : arg]);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '0.0.0.0', ...args], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
