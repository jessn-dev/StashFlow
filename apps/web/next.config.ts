import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "stashflow",
  project: "web",
});
