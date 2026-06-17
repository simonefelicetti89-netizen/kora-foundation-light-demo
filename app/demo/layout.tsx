// app/demo/layout.tsx — B129: Demo area layout.
// Guard: requireDemoAccess() — accepts DEMO_VIEWER or KORA_ADMIN.
//   KORA_ADMIN is admitted for preview purposes only. This is safe because
//   /demo pages are synth-only (no live DB queries, no tenant association).
//   If Fase 3 introduces a live-data demo tenant, requireDemoAccess must be
//   revisited to prevent live data leakage into the /demo surface.
//   COMPANY_ADMIN, WORKER, PARTNER → 403.
// Layout: BoundaryBadge mode="DEMO" is rendered in this layout and cannot be
//   suppressed by any child page.

import type { Metadata } from 'next';
import { requireDemoAccess, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true,
            googleBot: { index: false, follow: false, noimageindex: true } },
};

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireDemoAccess();

  if (isKoraAuthError(auth)) {
    const is403 = auth.status === 403;

    if (!is403) {
      redirect('/login?role_hint=demo');
    }

    return (
      <div
        style={{
          maxWidth:   480,
          margin:     '80px auto',
          padding:    '32px 28px',
          border:     '1px solid rgba(6,3,43,0.10)',
          borderRadius: 16,
          background: '#F8F6F1',
          textAlign:  'center',
          fontFamily: FONT,
        }}
      >
        <p
          style={{ fontWeight: 700, fontSize: '10px', letterSpacing: '0.10em', textTransform: 'uppercase', color: '#B5512E', marginBottom: 12 }}
        >
          Accesso negato
        </p>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06032B', marginBottom: 10 }}>
          Area Dimostrativa
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', lineHeight: 1.6, marginBottom: 20 }}>
          Quest&apos;area è riservata agli utenti con accesso demo provisionato da KORA.
          Contatta il tuo referente KORA per ricevere un invito.
        </p>
        <a
          href="/login"
          style={{ fontSize: 13, color: '#B5512E', textDecoration: 'none', fontWeight: 600 }}
        >
          ← Torna al login
        </a>
      </div>
    );
  }

  return (
    <div data-testid="demo-boundary-marker" style={{ minHeight: '100vh', background: '#F6F4EF', fontFamily: FONT }}>
      {/* Persistent DEMO badge — non-suppressible by child pages */}
      <div
        style={{
          position:       'sticky',
          top:            0,
          zIndex:         50,
          background:     'rgba(181,81,46,0.08)',
          borderBottom:   '1px solid rgba(181,81,46,0.20)',
          padding:        '6px 20px',
          display:        'flex',
          alignItems:     'center',
          gap:            10,
        }}
      >
        <BoundaryBadge mode="DEMO" variant="light" />
        <span style={{ fontSize: 11, color: 'rgba(181,81,46,0.80)', fontFamily: FONT }}>
          Area dimostrativa · Dati sintetici · Nessun dato aziendale reale
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(6,3,43,0.35)', fontFamily: FONT }}>
          {auth.koraRole === 'KORA_ADMIN' ? `Admin preview · ${auth.email}` : auth.email}
        </span>
      </div>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
        {children}
      </main>
    </div>
  );
}
