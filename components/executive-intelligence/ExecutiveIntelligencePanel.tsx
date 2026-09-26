'use client';

// components/executive-intelligence/ExecutiveIntelligencePanel.tsx
// B77-B — Executive Intelligence Layer™ above-the-fold panel.
//
// Answers four questions before any chart, number, or technical breakdown:
//   COME STIAMO · PERCHÉ · OPPORTUNITÀ PRINCIPALE · AZIONE PRIORITARIA
//
// This is a synthesis display — it does NOT compute scores.
// It renders already-computed ExecutiveIntelligenceSummary from the service.
// notKoraIndexComponent: true — display only, no methodology impact.
//
// KORA-WP-141 simplification: the per-status colour family (six tinted header
// grounds, six borders, six text colours, a status dot) is removed. This panel is
// a SUPPORTING signal under the T1 judgment, and tinting its whole header made it
// read as a second verdict in the same viewport. The status label still says what
// the status is — in ink, at one tier below the hero.

import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { ExecutiveIntelligenceSummary } from '@/services/executive-intelligence/ExecutiveIntelligenceService';

// ── Row component ─────────────────────────────────────────────────────────────

function Row({ label, content, accent }: { label: string; content: string; accent?: boolean }) {
  return (
    <div style={{
      display:       'grid',
      gridTemplateColumns: '168px 1fr',
      gap:           '0 20px',
      padding:       '14px 0',
      borderBottom:  `1px solid ${TOKENS.inkBorder}`,
    }}>
      <p className="kt-meta" style={{ color: TOKENS.inkTertiary, marginTop: 3, fontWeight: 600 }}>
        {label}
      </p>
      <p className="kt-secondary" style={{
        fontWeight: accent ? 600 : 400,
        color:      accent ? TOKENS.ink : TOKENS.inkSecondary,
      }}>
        {content}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  summary: ExecutiveIntelligenceSummary;
}

export function ExecutiveIntelligencePanel({ summary }: Props) {
  return (
    <div style={{
      background:   TOKENS.surface,
      border:       TOKENS.cardBorder,
      borderRadius: TOKENS.cardRadius,
      padding:      '24px 26px',
    }}>

      {/* Peer of "Cosa limita il punteggio" in the executive split — same tier. */}
      <p className="kt-section" style={{ color: TOKENS.ink, marginBottom: 4 }}>
        {summary.organizationStatus}
      </p>
      <p className="kt-caption" style={{ color: TOKENS.inkTertiary, marginBottom: 6 }}>
        Lettura direzionale del periodo
      </p>

      <div>
        <Row label="Perché"                content={summary.primaryConstraint} />
        <Row label="Opportunità"           content={summary.wasteSignal} />
        <Row label="Azione prioritaria"    content={summary.primaryAction} accent />
      </div>

      {/* Methodology footer — non-suppressible disclosures, quiet metadata grammar */}
      <p className="kt-caption" style={{ color: TOKENS.inkTertiary, marginTop: 14 }}>
        {summary.confidenceNote}
      </p>
      <p className="kt-caption" style={{ color: TOKENS.inkMeta, marginTop: 6 }}>
        pre_empirical_calibration · not_kora_index_component
      </p>

    </div>
  );
}
