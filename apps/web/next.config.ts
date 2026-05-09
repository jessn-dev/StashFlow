import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@stashflow/theme",
    "@stashflow/core",
    "@stashflow/api",
  ],
};

export default nextConfig;
