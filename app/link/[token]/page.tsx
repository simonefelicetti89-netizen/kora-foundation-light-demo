// app/link/[token]/page.tsx
// KORA Link — public NFC entry point (KL-10 skeleton, KL-19 DB lookup, KL-22 activation).
// Feature-flagged. Rate-limited. Activation is feature-flagged separately and defaults OFF.
// All route state logic lives in lib/kora-link/public-route.ts.
// All activation state logic lives in lib/kora-link/activation.ts.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { evaluateKoraLinkPublicRouteState } from '@/lib/kora-link/public-route';
import { isKoraLinkActivationEnabled } from '@/lib/kora-link/config';
import {
  buildKoraLinkActivationState,
  type KoraLinkActivationDisplayState,
  type KoraLinkActivationOutcome,
} from '@/lib/kora-link/activation';
import { getCurrentWorkerUser } from '@/lib/auth/kora-session';

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const ACTIVATION_OUTCOMES: readonly KoraLinkActivationOutcome[] = [
  'activating',
  'activated',
  'unavailable',
  'error',
  'consent_required',
];

function parseActivationOutcome(raw: string | string[] | undefined): KoraLinkActivationOutcome | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (ACTIVATION_OUTCOMES as readonly string[]).includes(value ?? '')
    ? (value as KoraLinkActivationOutcome)
    : null;
}

export default async function KoraLinkPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ activation?: string | string[] }>;
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
    const activationEnabled = isKoraLinkActivationEnabled();
    // Only resolve the worker session when activation is actually enabled —
    // avoids an unnecessary Supabase session read on the default-off path.
    const worker = activationEnabled ? await getCurrentWorkerUser() : null;
    const sp = await searchParams;
    const activationOutcome = parseActivationOutcome(sp.activation);

    const activationState = buildKoraLinkActivationState({
      activationEnabled,
      lookupReady: true,
      workerAuthenticated: worker !== null,
      activationOutcome,
    });

    return <KoraLinkReadyPage token={token} activationState={activationState} />;
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

function KoraLinkReadyPage({
  token,
  activationState,
}: {
  token: string;
  activationState: KoraLinkActivationDisplayState;
}) {
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

      <ActivationPanel token={token} activationState={activationState} />

      <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.30)', margin: '24px 0 0', lineHeight: 1.5 }}>
        KORA Foundation Light
      </p>
    </div>
  );
}

// ── Activation panel (KL-22) ────────────────────────────────────────────────
// Renders the safe worker-activation sub-state within the "ready" page.
// Activation stays OFF by default (KORA_LINK_ACTIVATION_ENABLED) — most
// deployments only ever render the 'disabled' branch below.

function ActivationPanel({
  token,
  activationState,
}: {
  token: string;
  activationState: KoraLinkActivationDisplayState;
}) {
  const boxStyle = {
    marginTop:    8,
    padding:      '16px 18px',
    borderRadius: 12,
    border:       '1px solid rgba(6,3,43,0.08)',
    background:   '#F8F6F1',
    textAlign:    'left' as const,
  };
  const noteStyle = { fontSize: 12, color: 'rgba(6,3,43,0.55)', margin: 0, lineHeight: 1.6 };

  switch (activationState) {
    case 'disabled':
    case 'lookup_not_ready':
      return (
        <div style={boxStyle} data-testid="kora-link-activation-disabled">
          <p style={noteStyle}>
            KORA Link pronto. Activation non abilitata in questo ambiente.
          </p>
        </div>
      );

    case 'unauthenticated':
      return (
        <div style={boxStyle} data-testid="kora-link-activation-unauthenticated">
          <p style={{ ...noteStyle, marginBottom: 12 }}>
            Accedi come worker per completare l&apos;attivazione.
          </p>
          <Link
            href="/worker/login"
            style={{
              display: 'inline-block',
              fontSize: 12.5,
              fontWeight: 700,
              color: '#fff',
              background: '#06032B',
              padding: '8px 14px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Accedi come worker
          </Link>
        </div>
      );

    case 'activated':
      return (
        <div style={boxStyle} data-testid="kora-link-activation-activated">
          <p style={{ ...noteStyle, fontWeight: 700, color: '#2F7D55' }}>
            KORA Link attivato con successo.
          </p>
        </div>
      );

    case 'unavailable':
      return (
        <div style={boxStyle} data-testid="kora-link-activation-unavailable">
          <p style={{ ...noteStyle, color: '#B3261E' }}>
            Servizio di attivazione temporaneamente non disponibile. Riprova più tardi.
          </p>
        </div>
      );

    case 'error':
      return (
        <div style={boxStyle} data-testid="kora-link-activation-error">
          <p style={{ ...noteStyle, color: '#B3261E' }}>
            Non è stato possibile completare l&apos;attivazione. Verifica il consenso e riprova.
          </p>
        </div>
      );

    case 'activating':
      return (
        <div style={boxStyle} data-testid="kora-link-activation-activating">
          <p style={noteStyle}>Attivazione in corso…</p>
        </div>
      );

    case 'ready':
    default:
      return (
        <form
          method="POST"
          action={`/link/${encodeURIComponent(token)}/activate`}
          style={boxStyle}
          data-testid="kora-link-activation-ready"
        >
          <p style={{ ...noteStyle, marginBottom: 10 }}>
            Confermando, autorizzi l&apos;associazione di questo KORA Link al tuo profilo worker KORA.
          </p>
          <p style={{ fontSize: 10.5, color: 'rgba(6,3,43,0.38)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Nota: il testo definitivo del consenso richiede approvazione DPO/legal.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(6,3,43,0.65)', marginBottom: 14 }}>
            <input type="checkbox" name="consent_confirmed" value="true" required />
            Ho letto e confermo il consenso
          </label>
          <button
            type="submit"
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: '#fff',
              background: '#06032B',
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Attiva KORA Link
          </button>
        </form>
      );
  }
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
