// app/company/kora-link/page.tsx
// KORA Link — Company governance view (KL-23). Aggregate-only rollout readiness.
// Protected by app/company/layout.tsx (requireCompanyUser — no new auth system here).
// No DB. No Supabase writes. No individual worker visibility, ever.

export const dynamic = 'force-dynamic';

import { TOKENS } from '@/lib/design/kora-design-tokens';
import {
  getKoraLinkEcosystemContext,
  getKoraLinkRoleSummary,
  KORA_LINK_CAPABILITY_STATE_LABEL,
  type KoraLinkCapabilityState,
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

function MetricCard({ label, state, note }: { label: string; state: KoraLinkCapabilityState; note: string }) {
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11.5, fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: TOKENS.ink }}>{KORA_LINK_CAPABILITY_STATE_LABEL[state]}</p>
      <p style={{ margin: 0, fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{note}</p>
    </div>
  );
}

export default function CompanyKoraLinkPage() {
  const context = getKoraLinkEcosystemContext();
  const summary = getKoraLinkRoleSummary('company', context);
  const aggregateVisibility = summary.capabilities.find((c) => c.id === 'company_aggregate_visibility');
  const rolloutState = aggregateVisibility?.state ?? 'requires_gate';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Company · KORA Link
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          KORA Link — governance aggregata
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>
          Adozione infrastrutturale del collegamento fisico–digitale KORA nella tua organizzazione.
          Solo dati aggregati — mai attività individuale del singolo worker.
        </p>
      </div>

      {/* Rollout readiness */}
      <Panel>
        <SectionLabel>Rollout readiness</SectionLabel>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          {KORA_LINK_CAPABILITY_STATE_LABEL[rolloutState]} — la vista aggregata company (conteggi per stato,
          nessun dato individuale) è in draft come RPC <code>fn_company_link_status_aggregate</code> (036),
          in attesa di Gate 2 (schema), Gate 4 (RLS) e Gate 5 (staging).
        </p>

        {/* Coverage / activation / replacement / revocation aggregates — future dashboard, no fake numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          <MetricCard
            label="Coverage aggregate"
            state={rolloutState}
            note="Percentuale di workforce coperta da un chip KORA Link consegnato."
          />
          <MetricCard
            label="Activation aggregate"
            state={rolloutState}
            note="Percentuale di chip consegnati effettivamente attivati dai worker."
          />
          <MetricCard
            label="Replacement aggregate"
            state={summary.capabilities.find((c) => c.id === 'company_aggregate_visibility')?.state ?? 'requires_gate'}
            note="Conteggio sostituzioni per chip persi o danneggiati."
          />
          <MetricCard
            label="Revocation aggregate"
            state={rolloutState}
            note="Conteggio revoche per chip compromessi o non più validi."
          />
        </div>
      </Panel>

      {/* No individual visibility — explicit, prominent */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Nessuna visibilità individuale</SectionLabel>
        <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Questa pagina non mostrerà mai, nemmeno in futuro con i gate chiusi: nomi dei worker, identificativi
          worker (worker_id), stato di attivazione del singolo chip, o cronologia individuale. Solo aggregati
          a livello organizzativo, coerenti con il confine di privacy costituzionale di KORA.
        </p>
      </div>

      {/* Capabilities + gates + privacy boundary, via shared shell */}
      <KoraLinkRoleDashboard
        summary={summary}
        capabilitiesTitle="Capacità KORA Link per l'azienda"
      >
        <Panel>
          <SectionLabel>Future operational dashboard</SectionLabel>
          <p style={{ margin: 0, fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            Una volta chiusi Gate 2/4/5, questa sezione mostrerà un cruscotto operativo con andamento
            temporale di coverage e attivazione — sempre e solo in forma aggregata, mai per singolo worker.
          </p>
        </Panel>
      </KoraLinkRoleDashboard>

      <p style={{ fontSize: 12, color: TOKENS.inkHint, margin: 0 }}>
        <Link href="/company/kora-link/campaigns" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>
          Anteprima design — campagne di distribuzione →
        </Link>
      </p>

    </div>
  );
}
