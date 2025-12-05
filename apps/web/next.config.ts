import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // Required for Docker
  transpilePackages: ['@crucible/shared'],
  typescript: {
    // Skip type checking during build - types checked in CI
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build - linting done in CI
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Enable React 19 features
  },
};

export default nextConfig;
