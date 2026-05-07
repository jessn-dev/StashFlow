import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['tesseract.js', 'pdf-parse', 'pdfjs-dist'],
  transpilePackages: [
    "@stashflow/theme",
    "@stashflow/core",
    "@stashflow/api",
  ],
};

export default nextConfig;
