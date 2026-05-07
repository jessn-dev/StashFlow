import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfjs-dist'],
  transpilePackages: [
    "@stashflow/theme",
    "@stashflow/core",
    "@stashflow/api",
  ],
};

export default nextConfig;
