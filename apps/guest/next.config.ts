import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@corgi/contracts'],
  typescript: { ignoreBuildErrors: true },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://testenv.corgicafe.es'
        : 'http://localhost:3000'),
  },
};

export default nextConfig;
