'use client';

// components/executive-intelligence/ExecutiveIntelligencePanel.tsx
// Executive Intelligence Layer™ — "La lettura del periodo".
//
// ITS ONE JOB, per Founder ruling: name what ORGANISATIONAL PATTERN the combined
// signals imply. It is the only block on the page that can say something no
// single component produces — characteristically that budget is flowing to
// activity which leaves no verifiable trace.
//
// WHAT IT IS NOT, and the invariant that keeps it distinct:
//   · it is NOT ScoreDrivers — it names no component and no code. Drivers
//     localise WHERE the constraint is carried; this says WHAT KIND it is.
//   · it is NOT BoardActions — it issues NO imperative. Its former
//     "AZIONE PRIORITARIA" row is removed, because BoardActions is the sole
//     canonical source of actions and three versions of one recommendation is
//     what made the old page read as an accumulation.
//   · it does NOT restate the organisational state. Score bands own that
//     vocabulary; this panel leads with the insight instead.
//
// notKoraIndexComponent: true — display only, no methodology impact.

import { PX } from '@/lib/design/kora-design-tokens';
import type { ExecutiveIntelligenceSummary } from '@/services/executive-intelligence/ExecutiveIntelligenceService';

export function ExecutiveIntelligencePanel({ summary }: { summary: ExecutiveIntelligenceSummary }) {
  // The two cross-cutting readings, in prose. No label column, no chips, no
  // surface — the disclosure-free canvas is the boundary.
  // ONE synthesis paragraph at default depth. The cross-signal insight is what
  // this block is for; the per-signal reliability note is provenance and belongs
  // in the reference layer, not in the reading.
  const reading = [summary.wasteSignal].filter(Boolean);

  return (
    <section data-kora-region="reading" style={{ minWidth: 0 }}>
      <p className="kt-meta" style={{ color: PX.inkMute, marginBottom: 12 }}>La lettura del periodo</p>

      {reading.map((line, i) => (
        <p key={i} className="kt-body" style={{ color: PX.ink2, maxWidth: '74ch', marginTop: i === 0 ? 0 : 10 }}>
          {line}
        </p>
      ))}

      <p className="kt-caption" style={{ color: PX.inkMute, marginTop: 10 }}>
        not_kora_index_component
      </p>
    </section>
  );
}
