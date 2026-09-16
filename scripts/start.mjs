import { access, cp } from 'node:fs/promises';

const website = new URL('../apps/website/', import.meta.url);
const standalone = new URL('.next/standalone/apps/website/', website);
const server = new URL('server.js', standalone);

try {
  await access(server);
} catch {
  console.error('Production build missing. Run npm run build before npm start.');
  process.exit(1);
}

// Next excludes public/static assets from standalone output by default.
await cp(new URL('public/', website), new URL('public/', standalone), { recursive: true });
await cp(new URL('.next/static/', website), new URL('.next/static/', standalone), { recursive: true });
process.env.HOSTNAME = '0.0.0.0';
await import(server.href);
