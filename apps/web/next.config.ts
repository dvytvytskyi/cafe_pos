import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.EXPORT_STATIC === 'true' ? 'export' : undefined,
  images: {
    unoptimized: process.env.EXPORT_STATIC === 'true' ? true : undefined,
  },
  transpilePackages: ['react-map-gl', 'mapbox-gl'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
