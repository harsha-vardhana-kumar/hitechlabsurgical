import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone', transpilePackages: ['@hitech/config', '@hitech/types', '@hitech/ui'], allowedDevOrigins: ['terminal.local'],
  async headers() { return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'same-origin' }, { key: 'X-Frame-Options', value: 'SAMEORIGIN' }] }]; },
};
export default config;
