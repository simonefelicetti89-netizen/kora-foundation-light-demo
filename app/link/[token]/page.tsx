// app/link/[token]/page.tsx
// KORA Link — public NFC entry point (KL-10 skeleton, KL-19 DB lookup).
// Feature-flagged. Rate-limited. No activation.
// All state logic lives in lib/kora-link/public-route.ts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { evaluateKoraLinkPublicRouteState } from '@/lib/kora-link/public-route';

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

export default async function KoraLinkPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const result = await evaluateKoraLinkPublicRouteState({ rawToken: token });

  if (result.state === 'hidden' || result.state === 'token_invalid') {
    notFound();
  }

  if (result.state === 'unavailable') {
    return <KoraLinkUnavailablePage />;
  }

  if (result.state === 'rate_limited') {
    return <KoraLinkRateLimitedPage />;
  }

  if (result.state === 'ready') {
    return <KoraLinkReadyPage />;
  }

  // state === 'skeleton'
  return <KoraLinkSkeletonPage />;
}

// ── Sub-pages ──────────────────────────────────────────────────────────────────

function KoraLinkSkeletonPage() {
  return (
    <div
      data-testid="kora-link-skeleton"
      style={{
        maxWidth:     480,
        margin:       '80px auto',
        padding:      '40px 32px',
        fontFamily:   FONT,
        border:       '1px solid rgba(6,3,43,0.08)',
        borderRadius: 16,
        textAlign:    'center',
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.30)', margin: '0 0 16px' }}>
        KORA Link
      </p>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06032B', margin: '0 0 12px', letterSpacing: '-0.025em' }}>
        Accesso sicuro KORA Link
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', margin: '0 0 24px', lineHeight: 1.6 }}>
        Questo collegamento sarà utilizzato per accedere in modo sicuro al percorso KORA Link.
      </p>
      <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.5 }}>
        La funzione è in fase di preparazione.
      </p>
    </div>
  );
}

function KoraLinkReadyPage() {
  return (
    <div
      data-testid="kora-link-ready"
      style={{
        maxWidth:     480,
        margin:       '80px auto',
        padding:      '40px 32px',
        fontFamily:   FONT,
        border:       '1px solid rgba(6,3,43,0.08)',
        borderRadius: 16,
        textAlign:    'center',
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.30)', margin: '0 0 16px' }}>
        KORA Link
      </p>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06032B', margin: '0 0 12px', letterSpacing: '-0.025em' }}>
        Collegamento KORA Link rilevato
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', margin: '0 0 24px', lineHeight: 1.6 }}>
        Il chip NFC è attivo. Per continuare, accedi al tuo account KORA.
      </p>
      <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.5 }}>
        KORA Foundation Light
      </p>
    </div>
  );
}

function KoraLinkUnavailablePage() {
  return (
    <div
      data-testid="kora-link-unavailable"
      style={{
        maxWidth:     480,
        margin:       '80px auto',
        padding:      '40px 32px',
        fontFamily:   FONT,
        border:       '1px solid rgba(6,3,43,0.08)',
        borderRadius: 16,
        textAlign:    'center',
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.30)', margin: '0 0 16px' }}>
        KORA Link
      </p>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06032B', margin: '0 0 12px', letterSpacing: '-0.025em' }}>
        Servizio temporaneamente non disponibile
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', margin: '0 0 24px', lineHeight: 1.6 }}>
        Il servizio KORA Link non è al momento raggiungibile. Riprova più tardi.
      </p>
      <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.5 }}>
        KORA Foundation Light
      </p>
    </div>
  );
}

function KoraLinkRateLimitedPage() {
  return (
    <div
      data-testid="kora-link-rate-limited"
      style={{
        maxWidth:     480,
        margin:       '80px auto',
        padding:      '40px 32px',
        fontFamily:   FONT,
        border:       '1px solid rgba(6,3,43,0.08)',
        borderRadius: 16,
        textAlign:    'center',
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.30)', margin: '0 0 16px' }}>
        KORA Link
      </p>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06032B', margin: '0 0 12px', letterSpacing: '-0.025em' }}>
        Troppe richieste
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', margin: '0 0 24px', lineHeight: 1.6 }}>
        Hai effettuato troppe richieste in poco tempo. Riprova tra qualche minuto.
      </p>
      <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.5 }}>
        KORA Foundation Light
      </p>
    </div>
  );
}
