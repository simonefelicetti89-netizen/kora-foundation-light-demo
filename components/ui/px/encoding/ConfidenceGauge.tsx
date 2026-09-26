'use client';

import { PX } from '@/lib/design/kora-design-tokens';
import { NoData } from '../states';

/**
 * KORA-WP-142 — Confidence Score is NOT performance.
 *
 * It is deliberately built from a DIFFERENT visual vocabulary than every scored
 * metric on the page: no threshold track, no score band, no pass/fail colour, no
 * assessment. Giving it a meter would make it the eleventh component of a
 * ten-component index, which is exactly the misreading doc 21b exists to prevent
 * — CS carries weight = 0 and says how much to trust the reading, not how well
 * the organisation performed.
 *
 * The encoding is therefore a RELIABILITY register: a segmented bar read as
 * "how much of the picture is solid", in ink, never in a semantic state colour.
 */
export function ConfidenceGauge({
  value, segments = 10, caption,
}: {
  /** 0–1. `null` renders NO DATA — never a bar at zero. */
  value: number | null;
  segments?: number;
  caption?: string;
}) {
  if (value === null || Number.isNaN(value)) {
    return <NoData missing="Confidence Score" />;
  }
  const pct  = Math.round(value * 100);
  const lit  = Math.round(value * segments);

  return (
    <div data-kora-encoding="confidence-gauge">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <p className="kt-label" style={{ color: PX.ink }}>Confidence Score™</p>
        <p className="kt-subsection kt-num" style={{ color: PX.ink }}>{pct}%</p>
      </div>

      <div
        role="meter"
        aria-label={`Confidence Score: ${pct}% — affidabilità dell'interpretazione, non performance`}
        aria-valuenow={value} aria-valuemin={0} aria-valuemax={1}
        aria-valuetext={`${pct} percento di affidabilità`}
        style={{ display: 'flex', gap: 3, marginTop: 8 }}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} aria-hidden="true" style={{
            flex: 1, height: 8, borderRadius: 2,
            // Ink, never a semantic state colour: reliability is not a verdict.
            background: i < lit ? PX.ink2 : PX.inkWash,
          }} />
        ))}
      </div>

      <p className="kt-caption" style={{ color: PX.ink3, marginTop: 6 }}>
        {caption ?? 'Affidabilità dell’interpretazione — non è una misura di performance.'}
      </p>
      <p className="kt-caption" style={{ color: PX.inkMute, marginTop: 2 }}>
        Esterno al KORA Index™ · peso = 0 · not_kora_index_component
      </p>
    </div>
  );
}
