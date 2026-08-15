import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.EXPORT_STATIC === 'true' ? 'export' : undefined,
  images: {
    unoptimized: process.env.EXPORT_STATIC === 'true' ? true : undefined,
  },
  transpilePackages: ['react-map-gl', 'mapbox-gl', '@corgi/contracts'],
  serverExternalPackages: ['bullmq', 'ioredis'],
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@valkey/valkey-glide': false,
    };
    return config;
  },
};

export default nextConfig;
