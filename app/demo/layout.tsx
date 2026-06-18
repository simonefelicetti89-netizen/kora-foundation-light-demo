// app/demo/layout.tsx — B168.5-P3: demo area layout, NO auth guard.
// Guard is now per-sub-route:
//   - /demo/company/* → app/demo/company/layout.tsx (requireDemoAccess)
//   - /demo/{index-registry,portfolio,network,advisor,ai-onboarding} → per-route layout
// The 5 public routes (/demo, /demo/guide, /demo/gtm, /demo/benchmarks,
//   /demo/future-vision) are intentionally unguarded — zero friction for prospects.
//
// robots: noindex applies to ALL /demo/* routes (public and gated alike) —
//   we don't want any demo URL indexed regardless of auth status.

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
