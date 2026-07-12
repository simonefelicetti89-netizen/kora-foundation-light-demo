// app/partner/kora-link/page.tsx
// KORA Link — Partner view (KL-23). Verified event infrastructure, Track A future.
// Protected by app/partner/layout.tsx (requirePartnerUser — no new auth system here).
// No DB. No Supabase writes. No personal data exposure. No scan implemented yet.

export const dynamic = 'force-dynamic';

import { TOKENS } from '@/lib/design/kora-design-tokens';
import {
  getKoraLinkEcosystemContext,
  getKoraLinkRoleSummary,
} from '@/lib/kora-link/ecosystem';
import { KoraLinkRoleDashboard } from '@/components/kora-link/KoraLinkRoleDashboard';
import Link from 'next/link';

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

export default function PartnerKoraLinkPage() {
  const context = getKoraLinkEcosystemContext();
  const summary = getKoraLinkRoleSummary('partner', context);

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Partner · KORA Link
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          KORA Link — verified event infrastructure
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 620 }}>
          Infrastruttura futura (Track A) per eventi verificati tramite scan partner. Nessuno scan reale
          è implementato oggi — questa pagina descrive il modello, non una funzione attiva.
        </p>
      </div>

      {/* Scan readiness */}
      <Panel>
        <SectionLabel>Scan readiness</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Future track — roadmap pianificata. Nessun endpoint di scan, nessuna tabella <code>partner_scans</code>
          esiste oggi (rimossa esplicitamente da 034 in KL-16, deferred a una futura migration 036+).
        </p>
      </Panel>

      {/* Accreditation requirement */}
      <Panel>
        <SectionLabel>Requisito di accreditamento</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Ogni partner che parteciperà a Track A dovrà completare un processo di accreditamento gestito
          da KORA Admin, con verifica dell&apos;identità organizzativa — prerequisito non ancora definito
          in dettaglio, in attesa di Gate 3 (DPO/legal) e Gate 8 (Partner scan).
        </p>
      </Panel>

      {/* Privacy-safe interaction */}
      <Panel>
        <SectionLabel>Interazione privacy-safe</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Il modello Track A è progettato perché il partner non riceva mai dati identificativi non
          necessari alla verifica dell&apos;evento — nessun nome, nessun contatto, nessun profilo worker.
          Solo la conferma minima che un evento verificato è avvenuto.
        </p>
      </Panel>

      {/* Capabilities + gates + privacy boundary, via shared shell */}
      <KoraLinkRoleDashboard
        summary={summary}
        capabilitiesTitle="Capacità KORA Link per il partner"
      />

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/partner/kora-link/initiatives" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          Anteprima design — iniziative verificate →
        </Link>
      </p>

    </div>
  );
}
