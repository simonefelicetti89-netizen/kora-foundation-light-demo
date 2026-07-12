// app/worker/kora-link/activate/page.tsx
// KORA Link — Worker activation shell (KORA-LINK-SHELL-01, Flow C).
// Pure UI/UX preview, in the LIVE authenticated /worker/* tree (distinct from the
// demo-preview /my-kora/kora-link surface). No DB. No Supabase writes. No RLS.
// No real activation — the activation action below is a disabled mock only.
//
// Access: WORKER only. requireWorkerUser enforced server-side, same pattern as
// app/worker/privacy/page.tsx. No employer-facing path to this content.

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import {
  getKoraLinkEcosystemContext,
  getKoraLinkRoleSummary,
  KORA_LINK_PRIVACY_BOUNDARIES,
} from '@/lib/kora-link/ecosystem';
import { KoraLinkRoleDashboard } from '@/components/kora-link/KoraLinkRoleDashboard';

export const metadata = { title: 'Attiva KORA Link · KORA' };

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, boxShadow: TOKENS.cardShadow, padding: 20 }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 10px' }}>
      {children}
    </p>
  );
}

export default async function WorkerKoraLinkActivatePage() {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) redirect('/login');

  const context = getKoraLinkEcosystemContext();
  const summary = getKoraLinkRoleSummary('worker', context);
  const companyBoundary = KORA_LINK_PRIVACY_BOUNDARIES.find((b) => b.id === 'company_never_sees_worker_level');

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Worker · KORA Link · Attivazione
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Attiva il tuo KORA Link — anteprima design
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 620 }}>
          Anteprima del flusso di attivazione del tuo collegamento fisico–digitale KORA.
        </p>
      </div>

      {/* Demo shell banner — explicit, non-suppressible */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — no DB, nessuna RLS, nessuna chiamata a Supabase o RPC. Non attivo.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questa pagina mostra come funzionerà l&apos;attivazione una volta chiusi i gate di readiness —
          il pulsante sottostante non esegue alcuna azione reale.
        </p>
      </div>

      {/* Activation action — disabled preview, no real activation */}
      <Panel>
        <SectionLabel>Attivazione</SectionLabel>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Avvicinando il telefono al chip fisico KORA Link assegnato dalla tua azienda, si aprirà
          automaticamente una pagina di conferma sicura con richiesta di consenso esplicita.
        </p>
        <button
          type="button"
          disabled
          title="Non attivo in questa anteprima — nessuna attivazione reale"
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            padding: '10px 18px',
            borderRadius: 10,
            border: `1px solid ${TOKENS.inkBorder}`,
            background: 'rgba(6,3,43,0.04)',
            color: TOKENS.inkHint,
            cursor: 'not-allowed',
          }}
        >
          Attiva KORA Link
        </button>
      </Panel>

      {/* Consent — placeholder pending DPO/legal review, mirrors /my-kora/kora-link */}
      <Panel>
        <SectionLabel>Consenso</SectionLabel>
        <p style={{ margin: '0 0 8px', fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Confermando l&apos;attivazione, autorizzeresti l&apos;associazione del tuo KORA Link al tuo profilo
          worker KORA. Potrai revocare in qualsiasi momento chiedendo la disattivazione al tuo KORA Admin.
        </p>
        <p style={{ margin: 0, fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Testo privacy/consenso in attesa di revisione DPO (Gate 3). Il testo definitivo del consenso non è
          ancora stato approvato — la versione qui mostrata è provvisoria e non vincolante.
        </p>
      </Panel>

      {/* Capabilities + gates + privacy boundary, via shared shell */}
      <KoraLinkRoleDashboard
        summary={summary}
        capabilitiesTitle="Cosa potrai fare con KORA Link"
      />

      {/* Cosa l'azienda non vede */}
      {companyBoundary && (
        <Panel>
          <SectionLabel>Cosa la tua azienda non vede</SectionLabel>
          <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            {companyBoundary.statement} La tua azienda vede solo conteggi aggregati di adozione — mai
            se, quando o come tu abbia usato il tuo KORA Link.
          </p>
        </Panel>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link
          href="/worker/privacy"
          style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.ink, background: TOKENS.taupe, padding: '9px 16px', borderRadius: 8, textDecoration: 'none' }}
        >
          Gestisci privacy &amp; consensi
        </Link>
      </div>

    </div>
  );
}
