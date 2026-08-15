import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@corgi/contracts'],
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
