// app/company/activity-signals/page.tsx
// Company — Activity Signals aggregate preview (ACTIVATION-SIGNAL-PIPELINE-01).
//
// Aggregate-only preview of future Phase 2 Activation Intelligence signals
// (see docs/KORA_ACTIVATION_LAYER_01.md and docs/ACTIVATION_SIGNAL_PIPELINE_01.md).
// Reuses the static ActivationSignalPreview model
// (lib/partner-activities/activation-signals.ts) — every value shown here is
// already aggregate-shaped (counts, distributions, ratios). This page never
// renders a worker name, email, worker ID, individual booking, individual
// status, or individual partner-worker relationship. Live KORA Index
// computation (lib/kora-engine/kora-index-engine.ts) is unchanged.
//
// No DB. No Supabase. No RPC. No fetch. No server action. No status mutation.
// Protected by app/company/layout.tsx (requireCompanyUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS, PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import {
  getActivationSignalPreviews,
  getActivationSignalSummary,
  groupActivationSignalsByPillar,
  groupActivationSignalsByFiscalCategory,
  groupActivationSignalsByIndexComponentPreview,
  SIGNAL_TYPE_LABELS,
  AGGREGATION_LEVEL_LABELS,
  INDEX_COMPONENT_PREVIEW_LABELS,
  PRIVACY_THRESHOLD_STATUS_LABELS,
  type ActivationSignalPreview,
} from '@/lib/partner-activities/activation-signals';

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

function MetricCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11.5, fontWeight: 700, color: TOKENS.inkHint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: TOKENS.ink }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11.5, color: TOKENS.inkSecondary, lineHeight: 1.5 }}>{note}</p>
    </div>
  );
}

function PillarTag({ pillar }: { pillar: string }) {
  const color = (PILLAR_COLORS as Record<string, string>)[pillar] ?? TOKENS.inkHint;
  return (
    <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: `${color}1A`, color, border: `1px solid ${color}45` }}>
      {pillar === 'multiple' ? 'Più pilastri' : pillar}
    </span>
  );
}

function PrivacyStatusBadge({ status }: { status: ActivationSignalPreview['privacyThresholdStatus'] }) {
  const tone =
    status === 'passed_preview' ? TOKENS.safeguard.pass
    : status === 'suppressed_preview' ? TOKENS.safeguard.cap
    : TOKENS.safeguard.watch;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: tone.bg, color: tone.text, whiteSpace: 'nowrap' }}>
      {PRIVACY_THRESHOLD_STATUS_LABELS[status]}
    </span>
  );
}

function SignalCard({ s }: { s: ActivationSignalPreview }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderRadius: TOKENS.cardRadiusSm, border: TOKENS.cardBorder, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TOKENS.ink }}>{SIGNAL_TYPE_LABELS[s.signalType]}</p>
        <PrivacyStatusBadge status={s.privacyThresholdStatus} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <PillarTag pillar={s.primaryPillar} />
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(6,3,43,0.05)', color: TOKENS.inkSecondary, border: `1px solid ${TOKENS.inkBorder}` }}>
          {AGGREGATION_LEVEL_LABELS[s.aggregationLevel]}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(97,86,245,0.10)', color: '#6156F5' }}>
          {INDEX_COMPONENT_PREVIEW_LABELS[s.indexComponentPreview]}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: TOKENS.ink }}>
        {s.metricPreview.value} <span style={{ fontSize: 11.5, fontWeight: 600, color: TOKENS.inkSecondary }}>{s.metricPreview.unit}</span>
      </p>
      <p style={{ margin: 0, fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>{s.metricPreview.label}</p>
    </div>
  );
}

export default function CompanyActivitySignalsPage() {
  const signals = getActivationSignalPreviews();
  const summary = getActivationSignalSummary();
  const byPillar = groupActivationSignalsByPillar();
  const byFiscalCategory = groupActivationSignalsByFiscalCategory();
  const byIndexComponent = groupActivationSignalsByIndexComponentPreview();

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Intro */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Azienda · Fase 2 Activation Intelligence
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Segnali di Attivazione
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 740 }}>
          Anteprima aggregata di come gli engagement Attività Partner completati potranno in futuro
          diventare segnali di attivazione per il KORA Index. Solo aggregati — mai dati individuali.
          Nessun calcolo reale, nessuna persistenza.
        </p>
      </div>

      {/* Preview banner */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — dati mock aggregati, nessuna connessione a database o servizi esterni.
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Nessun nominativo, nessuna email, nessun ID lavoratore, nessuna prenotazione individuale è mai
          mostrata in questa pagina o in alcuna pagina aziendale. Il calcolo live del KORA Index non è
          modificato.
        </p>
      </div>

      {/* Summary */}
      <Panel>
        <SectionLabel>Riepilogo aggregato</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <MetricCard label="Segnali in anteprima" value={summary.totalSignals} note="Segnali aggregati di esempio nel modello statico." />
          <MetricCard label="Pilastri rappresentati" value={Object.keys(byPillar).length} note="Inclusa la categoria 'più pilastri' per segnali multi-pilastro." />
          <MetricCard label="Categorie fiscali rappresentate" value={Object.keys(byFiscalCategory).length} note="Distribuzione fiscale/welfare aggregata." />
          <MetricCard label="Componenti KORA Index in anteprima" value={Object.keys(byIndexComponent).length} note="Nessun calcolo reale di componente in questo sprint." />
        </div>
      </Panel>

      {/* Aggregate signal cards */}
      <Panel>
        <SectionLabel>Segnali aggregati (anteprima)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {signals.map((s) => <SignalCard key={s.signalId} s={s} />)}
        </div>
      </Panel>

      {/* Privacy threshold panel */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Soglie di privacy</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Le soglie di privacy non sono decise in questo sprint — nessuna regola finale DPO/legale è risolta qui.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>I gruppi con conteggio basso possono richiedere soppressione.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>L&apos;azienda resta sempre aggregate-only — nessun dato individuale, in nessuna condizione.</li>
        </ul>
      </div>

      {/* Cross-links */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/admin/activation-signal-pipeline" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Modello completo (Admin) →
        </Link>
        <Link href="/company/activity-selection" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Selezione Attività →
        </Link>
        <Link href="/company/kora-index" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Index™ →
        </Link>
      </div>

    </div>
  );
}
