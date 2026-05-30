import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack/Turbopack from bundling native/binary packages.
  // @sparticuz/chromium (67MB binary) and puppeteer-core must stay in node_modules
  // and be resolved at runtime — not inlined into JS chunks.
  // playwright and playwright-core are also excluded to avoid bundling the browser layer.
  serverExternalPackages: [
    '@sparticuz/chromium',
    'puppeteer-core',
    'playwright',
    'playwright-core',
  ],
};

export default nextConfig;
