import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@hitech/ui', '@hitech/config', '@hitech/types'],
  poweredByHeader: false,
  allowedDevOrigins: ['terminal.local'],
  images: {
    localPatterns: [
      { pathname: '/images/**', search: '' },
      { pathname: '/images/**', search: '?view=lead' },
      { pathname: '/images/laboratory.webp', search: '?view=hero' },
      { pathname: '/images/laboratory.webp', search: '?view=about' },
      { pathname: '/brand/**', search: '' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
};
export default nextConfig;
