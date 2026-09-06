// app/my-kora/kora-link/page.tsx
// My KORA Link (KL-23) — worker-facing wallet/identity view of KORA Link.
// Protected by app/my-kora/layout.tsx (WORKER / KORA_ADMIN preview / demo visitor gate).
// No DB. No Supabase writes. No automatic activation. No Impact Units.
//
// B-WORKER-4 (2026-09-06): this page had no unique value over
// /worker/kora-link/activate — both are non-functional preview shells built
// from the same lib/kora-link/ecosystem.ts config, but the /worker version
// is real-auth-gated (requireWorkerUser) and already has richer content
// (pilot-status cards, full privacy-boundary list). A confirmed real session
// now redirects there instead of duplicating a lighter subset of the same
// shell. The demo/persona preview path (no real session) is unchanged.

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionKoraRole } from '@/lib/auth/kora-session';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import {
  getKoraLinkEcosystemContext,
  getKoraLinkRoleSummary,
  KORA_LINK_PRIVACY_BOUNDARIES,
} from '@/lib/kora-link/ecosystem';
import { KoraLinkRoleDashboard } from '@/components/kora-link/KoraLinkRoleDashboard';

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

export default async function MyKoraLinkPage() {
  const realRole = await getSessionKoraRole();
  if (realRole === 'WORKER' || realRole === 'KORA_ADMIN') {
    redirect('/worker/kora-link/activate');
  }

  const context = getKoraLinkEcosystemContext();
  const summary = getKoraLinkRoleSummary('worker', context);
  const activationCapability = summary.capabilities.find((c) => c.id === 'worker_activation');
  const companyBoundary = KORA_LINK_PRIVACY_BOUNDARIES.find((b) => b.id === 'company_never_sees_worker_level');

  const activationReady = activationCapability?.state === 'available';
  const activationLabel =
    activationCapability?.state === 'available'   ? 'Pronto per l\'attivazione' :
    activationCapability?.state === 'configured'   ? 'Configurato in ambiente demo — non ancora produzione' :
    'Non ancora disponibile in questo ambiente';

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          My KORA · KORA Link
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          My KORA Link
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 620 }}>
          Il tuo collegamento fisico–digitale KORA. Un chip NFC che, una volta attivato con il tuo consenso,
          ti collega in modo sicuro al tuo profilo worker — senza mai esporre la tua attività individuale
          alla tua azienda.
        </p>
      </div>

      {/* Activation readiness — the wallet's "status" strip */}
      <Panel>
        <SectionLabel>Stato KORA Link</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: 999,
              background: activationReady ? TOKENS.safeguard.pass.dot : TOKENS.safeguard.watch.dot,
            }}
          />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TOKENS.ink }}>{activationLabel}</p>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          L&apos;attivazione richiede una sessione worker autenticata, un chip KORA Link valido e la tua conferma
          di consenso esplicita — nessuna attivazione avviene automaticamente.
        </p>
      </Panel>

      {/* Cosa può fare + activation readiness + gates, via shared dashboard shell */}
      <KoraLinkRoleDashboard
        summary={summary}
        capabilitiesTitle="Cosa puoi fare con KORA Link"
      >
        {/* Consent explanation */}
        <Panel>
          <SectionLabel>Consenso</SectionLabel>
          <p style={{ margin: '0 0 8px', fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            Confermando l&apos;attivazione, autorizzi l&apos;associazione del tuo KORA Link al tuo profilo worker KORA.
            Puoi revocare in qualsiasi momento chiedendo la disattivazione al tuo KORA Admin.
          </p>
          <p style={{ margin: 0, fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
            Nota: il testo definitivo del consenso è in attesa di approvazione DPO/legal (Gate 3).
            La versione attuale è provvisoria.
          </p>
        </Panel>

        {/* Scan / activation entry point */}
        <Panel>
          <SectionLabel>Come attivare</SectionLabel>
          <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            Avvicina il telefono al chip fisico KORA Link assegnato dalla tua azienda: si aprirà
            automaticamente la pagina <code>/link/&lt;token&gt;</code> con il pulsante di attivazione,
            se la funzione è abilitata nel tuo ambiente.
          </p>
        </Panel>
      </KoraLinkRoleDashboard>

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

      {/* Future verified experiences */}
      <Panel>
        <SectionLabel>Esperienze verificate future</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          In futuro, KORA Link potrà collegarsi a iniziative KORA Space ed eventi partner verificati.
          Nessuna di queste esperienze è attiva oggi — sono roadmap, non funzionalità disponibili.
        </p>
      </Panel>

      {/* Scan / activation route */}
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
