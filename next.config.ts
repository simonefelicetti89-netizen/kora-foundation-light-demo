import type { NextConfig }      from "next";
import { withSentryConfig }     from "@sentry/nextjs";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co",
  // *.sentry.io required for Sentry error reporting in production.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Content-Security-Policy',   value: CSP },
];

// X-Robots-Tag for authenticated/private app sections.
// Belt-and-suspenders alongside robots.txt and layout-level metadata.robots.
// my-kora uses 'use client' layout so can't export metadata — header is the only mechanism.
const NOINDEX_PATHS = [
  '/admin/:path*', '/demo/:path*', '/company/:path*', '/worker/:path*',
  '/my-kora/:path*', '/partner/:path*', '/api/:path*', '/auth/:path*',
  '/account/:path*', '/login', '/request-access', '/cv/:path*',
];

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

  async headers() {
    return [
      // Security headers on every response
      { source: '/(.*)', headers: SECURITY_HEADERS },
      // X-Robots-Tag: noindex on all private/app sections
      ...NOINDEX_PATHS.map(source => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, nocache' }],
      })),
    ];
  },

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

export default withSentryConfig(nextConfig, {
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent:  true,
  sourcemaps: {
    // Skip source map upload if SENTRY_AUTH_TOKEN is not set (local dev, CI without secrets).
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Disable auto-instrumentation of API routes — we instrument errors via error.tsx only.
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware:      false,
});
