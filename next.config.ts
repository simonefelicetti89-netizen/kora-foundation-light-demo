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

  // B129 Fase 2: 9 synth-only demo surfaces moved under /demo/*
  // 308 (permanent) so browser caches the new location and bookmarks update.
  async redirects() {
    return [
      { source: '/advisor',              destination: '/demo/advisor',        permanent: true },
      { source: '/advisor/:path*',       destination: '/demo/advisor/:path*', permanent: true },
      { source: '/demo-guide',           destination: '/demo/guide',          permanent: true },
      { source: '/future-vision',        destination: '/demo/future-vision',  permanent: true },
      { source: '/future-vision/:path*', destination: '/demo/future-vision/:path*', permanent: true },
      { source: '/admin/portfolio',      destination: '/demo/portfolio',      permanent: true },
      { source: '/admin/benchmarks',     destination: '/demo/benchmarks',     permanent: true },
      { source: '/admin/network',        destination: '/demo/network',        permanent: true },
      { source: '/admin/gtm',            destination: '/demo/gtm',            permanent: true },
      { source: '/admin/index-registry', destination: '/demo/index-registry', permanent: true },
      { source: '/admin/ai-onboarding',  destination: '/demo/ai-onboarding',  permanent: true },
    ];
  },
};

export default nextConfig;
