// app/company/activity-signals/page.tsx
// Company — Activity Signals aggregate preview (COMPANY-ACTIVITY-SIGNAL-PREVIEW-01).
// Originally introduced as a minimal shell in ACTIVATION-SIGNAL-PIPELINE-01;
// strengthened here into a full company-facing aggregate reporting surface.
//
// Aggregate-only preview of future Phase 2 Activation Intelligence signals
// (see docs/KORA_ACTIVATION_LAYER_01.md, docs/ACTIVATION_SIGNAL_PIPELINE_01.md,
// docs/COMPANY_ACTIVITY_SIGNAL_PREVIEW_01.md). Signals originate from Partner
// Activities (lib/partner-activities/catalog.ts), company enablement
// (/company/activity-selection), worker voluntary choice
// (/worker/activity-discovery), and partner fulfilment
// (lib/partner-activities/bookings.ts) — a Phase 2 signal stream distinct
// from Phase 1 uploaded/classified organizational data
// (/company/kora-index, /company/activation) and distinct from KORA Space /
// Contribution Initiatives (/company/contribution, commons.post pipeline,
// both untouched).
//
// Reuses the static ActivationSignalPreview model
// (lib/partner-activities/activation-signals.ts) — every value shown here is
// already aggregate-shaped (counts, distributions, ratios). This page never
// renders a worker name, email, worker ID, tag UID, individual booking,
// individual status, individual choice, individual voucher redemption, or
// individual partner-worker relationship — and never renders
// `sourceBookingIds`. Live KORA Index computation
// (lib/kora-engine/kora-index-engine.ts) is unchanged; no KORA Index score is
// computed or displayed here.
//
// No DB. No Supabase. No RPC. No fetch. No server action. No status mutation.
// Protected by app/company/layout.tsx (requireCompanyUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS, PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import { PILLAR_CODES } from '@/lib/constants/kora';
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
  ELIGIBILITY_LABELS,
  type ActivationSignalPreview,
} from '@/lib/partner-activities/activation-signals';
import { FISCAL_CATEGORY_LABELS } from '@/lib/partner-activities/catalog';

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

function Tag({ children, tone }: { children: React.ReactNode; tone?: 'default' | 'accent' }) {
  const isAccent = tone === 'accent';
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
        background: isAccent ? 'rgba(97,86,245,0.10)' : 'rgba(6,3,43,0.05)',
        color: isAccent ? '#6156F5' : TOKENS.inkSecondary,
        border: `1px solid ${isAccent ? 'rgba(97,86,245,0.30)' : TOKENS.inkBorder}`,
      }}
    >
      {children}
    </span>
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

function GroupBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
        <span style={{ color: TOKENS.inkSecondary, fontWeight: 700 }}>{label}</span>
        <span style={{ color: TOKENS.inkHint }}>{count} segnal{count === 1 ? 'e' : 'i'} ({pct}%)</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: TOKENS.inkTrack, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: TOKENS.accent, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function SignalRow({ s }: { s: ActivationSignalPreview }) {
  return (
    <tr style={{ borderTop: `1px solid ${TOKENS.inkBorder}` }}>
      <td style={{ padding: '8px 10px', color: TOKENS.ink, fontWeight: 700, whiteSpace: 'nowrap' }}>{SIGNAL_TYPE_LABELS[s.signalType]}</td>
      <td style={{ padding: '8px 10px' }}><Tag>{AGGREGATION_LEVEL_LABELS[s.aggregationLevel]}</Tag></td>
      <td style={{ padding: '8px 10px' }}><PillarTag pillar={s.primaryPillar} /></td>
      <td style={{ padding: '8px 10px' }}>{s.fiscalCategory === 'multiple' ? <Tag>Più categorie</Tag> : <Tag>{FISCAL_CATEGORY_LABELS[s.fiscalCategory]}</Tag>}</td>
      <td style={{ padding: '8px 10px' }}><Tag tone="accent">{INDEX_COMPONENT_PREVIEW_LABELS[s.indexComponentPreview]}</Tag></td>
      <td style={{ padding: '8px 10px', color: TOKENS.ink, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.metricPreview.value} {s.metricPreview.unit}</td>
      <td style={{ padding: '8px 10px' }}><PrivacyStatusBadge status={s.privacyThresholdStatus} /></td>
      <td style={{ padding: '8px 10px', color: TOKENS.inkSecondary }}>{ELIGIBILITY_LABELS[s.eligibleForKoraIndexPreview]}</td>
      <td style={{ padding: '8px 10px', color: TOKENS.inkHint, fontSize: 11 }}>Non è fonte di Contribution</td>
    </tr>
  );
}

export default function CompanyActivitySignalsPage() {
  const signals = getActivationSignalPreviews();
  const summary = getActivationSignalSummary();
  const byPillar = groupActivationSignalsByPillar();
  const byFiscalCategory = groupActivationSignalsByFiscalCategory();
  const byIndexComponent = groupActivationSignalsByIndexComponentPreview();

  const suppressedOrReview =
    (summary.byPrivacyThresholdStatus['suppressed_preview'] ?? 0) +
    (summary.byPrivacyThresholdStatus['needs_threshold_review'] ?? 0);

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* 1. Intro panel */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Azienda · Fase 2 Activation Intelligence
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Segnali di attivazione
        </h1>
        <p style={{ fontSize: 13.5, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6, maxWidth: 780 }}>
          Anteprima aggregata dei segnali di attivazione Fase 2 generati da Attività Partner, abilitazione
          aziendale, scelta volontaria dei lavoratori ed erogazione partner. Questo flusso è distinto dai
          segnali Fase 1 (dati aziendali caricati e classificati — <Link href="/company/kora-index" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>KORA Index™</Link>,{' '}
          <Link href="/company/activation" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>Activation Intelligence™</Link>) ed è distinto da{' '}
          <Link href="/company/contribution" style={{ color: TOKENS.accent, fontWeight: 700, textDecoration: 'none' }}>KORA Contribution™</Link> / iniziative KORA Space.
          Il calcolo live del KORA Index non è modificato. Nessun dato individuale del lavoratore è mai
          visibile in questa pagina.
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

      {/* 2. Executive summary cards */}
      <Panel>
        <SectionLabel>Riepilogo esecutivo</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
          <MetricCard label="Segnali in anteprima" value={summary.totalSignals} note="Segnali aggregati di esempio nel modello statico." />
          <MetricCard label="Eleggibili (anteprima)" value={summary.byEligibility['yes'] ?? 0} note="Potenzialmente idonei a un futuro input KORA Index." />
          <MetricCard label="Richiedono revisione" value={summary.byEligibility['needs_review'] ?? 0} note="Nessuna decisione di eleggibilità è finale." />
          <MetricCard label="Soppressi o in revisione soglia" value={suppressedOrReview} note="Gruppi troppo piccoli o soglia privacy non ancora verificata." />
          <MetricCard label="Pilastri rappresentati" value={Object.keys(byPillar).length} note="Include 'più pilastri' per segnali multi-pilastro." />
          <MetricCard label="Categorie fiscali rappresentate" value={Object.keys(byFiscalCategory).length} note="Distribuzione fiscale/welfare aggregata." />
        </div>
      </Panel>

      {/* 3. Signal distribution by KORA pillar */}
      <Panel>
        <SectionLabel>Distribuzione per pilastro KORA</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PILLAR_CODES.map((pillar) => (
            <GroupBar key={pillar} label={pillar} count={byPillar[pillar]?.length ?? 0} total={summary.totalSignals} />
          ))}
          {byPillar['multiple'] && (
            <GroupBar label="Più pilastri (segnale aggregato multi-pilastro)" count={byPillar['multiple'].length} total={summary.totalSignals} />
          )}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Distribuzione aggregata per pilastro — mai a livello di singolo lavoratore.
        </p>
      </Panel>

      {/* 4. Signal distribution by fiscal/welfare category */}
      <Panel>
        <SectionLabel>Distribuzione per categoria fiscale/welfare</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(byFiscalCategory).map(([category, group]) => (
            <GroupBar
              key={category}
              label={category === 'multiple' ? 'Più categorie (segnale aggregato)' : (FISCAL_CATEGORY_LABELS[category as keyof typeof FISCAL_CATEGORY_LABELS] ?? category)}
              count={group.length}
              total={summary.totalSignals}
            />
          ))}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Le categorie fiscali/welfare sono metadati proposti — non costituiscono un&apos;approvazione fiscale o legale.
        </p>
      </Panel>

      {/* 5. KORA Index component preview */}
      <Panel>
        <SectionLabel>Anteprima componenti KORA Index</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(['reach', 'quality', 'equity', 'activation', 'continuity', 'pillar_balance'] as const).map((component) => (
            <GroupBar
              key={component}
              label={INDEX_COMPONENT_PREVIEW_LABELS[component]}
              count={byIndexComponent[component]?.length ?? 0}
              total={summary.totalSignals}
            />
          ))}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Questa è solo un&apos;anteprima — nessun punteggio KORA Index reale è calcolato qui.{' '}
          <strong style={{ color: TOKENS.ink }}>KORA-INDEX-ACTIVATION-INTEGRATION-01</strong> è uno sviluppo
          futuro e richiede revisione CTO prima di qualunque integrazione reale.
        </p>
      </Panel>

      {/* 6. Privacy threshold panel */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Soglie di privacy</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Le soglie di privacy non sono decise in questo sprint — nessuna regola finale DPO/legale è risolta qui.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>I gruppi con conteggio basso possono richiedere soppressione.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Alcuni segnali richiedono revisione della soglia di privacy prima di poter essere considerati stabili.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>L&apos;azienda resta sempre aggregate-only — nessun dato individuale, in nessuna condizione.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Il partner vede nominativi solo dopo un&apos;azione volontaria del lavoratore — la visibilità nominativa del partner resta sempre worker-initiated, invariato rispetto a PARTNER-ACTIVITY-BOOKINGS-01.</li>
        </ul>
      </div>

      {/* 7. Company can/cannot see panel */}
      <Panel>
        <SectionLabel>Cosa può e non può vedere l&apos;azienda</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: TOKENS.safeguard.pass.text }}>Può vedere</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Adozione (uptake) aggregata</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Completamento aggregato</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Distribuzione per pilastro/categoria</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Fasce di valore</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Anteprima di continuità</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Stato della soglia di privacy</li>
            </ul>
          </div>
          <div style={{ background: '#fff', border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: TOKENS.safeguard.cap.text }}>Non può mai vedere</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Nominativi dei lavoratori</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Email dei lavoratori</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>ID dei lavoratori</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Prenotazioni individuali</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Stati individuali</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Scelte individuali di attività</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Riscatti voucher individuali</li>
              <li style={{ fontSize: 12, color: TOKENS.inkSecondary }}>Dettagli della relazione partner-lavoratore</li>
            </ul>
          </div>
        </div>
      </Panel>

      {/* 8. Signal table */}
      <Panel>
        <SectionLabel>Tabella segnali aggregati</SectionLabel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11.5, minWidth: 860 }}>
            <thead>
              <tr>
                {['Tipo di segnale', 'Aggregazione', 'Pilastro', 'Categoria fiscale', 'Componente KORA Index (anteprima)', 'Metrica (anteprima)', 'Soglia privacy', 'Eleggibilità', 'Confine Contribution'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: TOKENS.inkHint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => <SignalRow key={s.signalId} s={s} />)}
            </tbody>
          </table>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Ogni riga è già aggregata: nessun identificativo di prenotazione, nessun nominativo, nessuno stato
          individuale è mai mostrato in questa tabella.
        </p>
      </Panel>

      {/* Aggregate signal cards (compact view) */}
      <Panel>
        <SectionLabel>Segnali aggregati (vista card)</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {signals.map((s) => <SignalCard key={s.signalId} s={s} />)}
        </div>
      </Panel>

      {/* 9. Relationship to KORA Index */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Relazione con il KORA Index</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>I segnali Fase 2 potranno in futuro diventare input aggregati per il KORA Index.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Il calcolo live del KORA Index non è modificato da questa pagina.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>Nessun punteggio KORA Index viene ricalcolato qui.</li>
        </ul>
      </div>

      {/* 10. Relationship to KORA Contribution */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px' }}>
        <SectionLabel>Relazione con KORA Contribution</SectionLabel>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>I segnali di Attività Partner non alimentano mai direttamente KORA Contribution.</li>
          <li style={{ fontSize: 12.5, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>KORA Space / Iniziative Contribution restano una pipeline separata.</li>
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
        <Link href="/company/activation" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Activation Intelligence™ (Fase 1) →
        </Link>
        <Link href="/company/contribution" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          KORA Contribution™ (pipeline separata) →
        </Link>
      </div>

    </div>
  );
}
