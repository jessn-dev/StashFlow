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
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
