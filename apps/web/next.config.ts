import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Power up the build by disabling heavy features not needed for this app
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: [
    "@stashflow/theme",
    "@stashflow/core",
    "@stashflow/api",
  ],
  // Prevent heavy source maps in production
  productionBrowserSourceMaps: false,
  // Optimization: ignore linting/typechecking during the Vercel build phase 
  // (since our CI already does this in a separate job)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
