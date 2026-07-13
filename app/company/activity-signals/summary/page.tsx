// app/company/activity-signals/summary/page.tsx
// Company — Activity Signals executive summary (COMPANY-ACTIVITY-SIGNAL-PREVIEW-01).
//
// Compact executive version of /company/activity-signals — same aggregate-only
// Phase 2 preview, condensed for a fast read. Reuses the same static
// ActivationSignalPreview model (lib/partner-activities/activation-signals.ts).
// No DB. No Supabase. No RPC. No fetch. No server action. No status mutation.
// No individual worker data, no sourceBookingIds, ever.
// Protected by app/company/layout.tsx (requireCompanyUser — no new auth system here).

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { PILLAR_CODES } from '@/lib/constants/kora';
import {
  getActivationSignalPreviews,
  getActivationSignalSummary,
  groupActivationSignalsByPillar,
  INDEX_COMPONENT_PREVIEW_LABELS,
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

function MiniBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 11.5, color: TOKENS.inkSecondary, fontWeight: 700, width: 110, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: TOKENS.inkTrack, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: TOKENS.accent, borderRadius: 999 }} />
      </div>
      <span style={{ fontSize: 11, color: TOKENS.inkHint, width: 28, textAlign: 'right' }}>{count}</span>
    </div>
  );
}

export default function CompanyActivitySignalsSummaryPage() {
  const signals = getActivationSignalPreviews();
  const summary = getActivationSignalSummary();
  const byPillar = groupActivationSignalsByPillar();

  const suppressedOrReview =
    (summary.byPrivacyThresholdStatus['suppressed_preview'] ?? 0) +
    (summary.byPrivacyThresholdStatus['needs_threshold_review'] ?? 0);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Intro */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 8px' }}>
          Azienda · Fase 2 Activation Intelligence · Sintesi esecutiva
        </p>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: TOKENS.ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Segnali di attivazione — sintesi
        </h1>
        <p style={{ fontSize: 13, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6 }}>
          Versione compatta dell&apos;anteprima aggregata Fase 2. Solo aggregati — mai dati individuali. Il
          calcolo live del KORA Index non è modificato.
        </p>
      </div>

      {/* Preview banner */}
      <div style={{ background: 'rgba(97,86,245,0.06)', border: `1px dashed rgba(97,86,245,0.35)`, borderRadius: TOKENS.cardRadiusSm, padding: '12px 16px' }}>
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#6156F5' }}>
          Anteprima design — dati mock aggregati, nessuna connessione a database o servizi esterni.
        </p>
      </div>

      {/* Executive summary cards */}
      <Panel>
        <SectionLabel>Riepilogo esecutivo</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          <MetricCard label="Segnali totali" value={summary.totalSignals} note="Anteprima statica." />
          <MetricCard label="Richiedono revisione" value={summary.byEligibility['needs_review'] ?? 0} note="Nessuna eleggibilità finale." />
          <MetricCard label="Soppressi/in revisione" value={suppressedOrReview} note="Soglia privacy non finale." />
          <MetricCard label="Pilastri coinvolti" value={Object.keys(byPillar).length} note="Solo aggregato." />
        </div>
      </Panel>

      {/* Pillar mini distribution */}
      <Panel>
        <SectionLabel>Distribuzione per pilastro (sintesi)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PILLAR_CODES.map((pillar) => (
            <MiniBar key={pillar} label={pillar} count={byPillar[pillar]?.length ?? 0} total={summary.totalSignals} />
          ))}
        </div>
      </Panel>

      {/* Index component mini preview */}
      <Panel>
        <SectionLabel>Anteprima componenti KORA Index (sintesi)</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(['reach', 'quality', 'equity', 'activation', 'continuity', 'pillar_balance'] as const).map((c) => (
            <span key={c} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'rgba(97,86,245,0.10)', color: '#6156F5' }}>
              {INDEX_COMPONENT_PREVIEW_LABELS[c]}
            </span>
          ))}
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 11, color: TOKENS.inkHint, lineHeight: 1.5 }}>
          Anteprima soltanto — nessun punteggio KORA Index reale è calcolato. Segnali analizzati: {signals.length}.
        </p>
      </Panel>

      {/* Privacy note */}
      <div style={{ background: '#fffaf5', border: `1px dashed ${TOKENS.inkBorder}`, borderRadius: TOKENS.cardRadiusSm, padding: '14px 16px' }}>
        <p style={{ margin: 0, fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
          Le soglie di privacy non sono decise in questo sprint. L&apos;azienda resta sempre aggregate-only —
          nessun nominativo, email, ID lavoratore, o prenotazione individuale è mai mostrata qui.
        </p>
      </div>

      {/* Cross-link back to full page */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/company/activity-signals" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Vista completa dei segnali →
        </Link>
        <Link href="/admin/activation-signal-pipeline" style={{ fontSize: 12.5, fontWeight: 700, color: TOKENS.accent, textDecoration: 'none' }}>
          Modello completo (Admin) →
        </Link>
      </div>

    </div>
  );
}
