// app/demo/layout.tsx — demo area layout, NO auth guard.
//
// CC-00 DEMO_VIEWER role retirement (2026-09-26): after a 4-slice route
// retirement sequence (index-registry, partner, portfolio, then advisor,
// ai-onboarding, benchmarks, gtm, guide, network) and this final role
// retirement, exactly 2 routes remain under app/demo/**: /demo (root hub)
// and /demo/future-vision. Both are public static presentation — zero
// role-specific guard anywhere, and no DEMO_VIEWER role exists anymore to
// guard against. See lib/architecture/registry.ts's app-surface.demo entry
// for the full retirement record.
//
// robots: noindex applies to both remaining /demo/* routes — we don't want
//   any demo URL indexed.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true,
            googleBot: { index: false, follow: false, noimageindex: true } },
};

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-testid="demo-boundary-marker" style={{ minHeight: '100vh', background: '#F6F4EF', fontFamily: FONT }}>
      {children}
    </div>
  );
}
