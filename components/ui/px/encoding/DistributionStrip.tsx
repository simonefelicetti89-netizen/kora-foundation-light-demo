'use client';

import { PX } from '@/lib/design/kora-design-tokens';
import { InsufficientData, Suppressed } from '../states';

export interface DistributionSlice {
  readonly key:   string;
  readonly label: string;
  /** Share of the whole, 0–1. */
  readonly share: number;
}

/**
 * KORA-WP-142 — "how does it compare?", but only where a genuine comparison
 * exists.
 *
 * A distribution is a real comparison ONLY when every slice is a measured value
 * from the same period and the group clears the privacy threshold. This
 * component therefore refuses rather than degrades: it renders SUPPRESSED when
 * the group is below N, INSUFFICIENT DATA when too few slices carry a value,
 * and nothing that could be mistaken for a measured distribution in either case.
 *
 * It is deliberately not a chart. Composition across a handful of named slices
 * is read better as a proportional strip than as a pie or a bar chart, and a
 * chart here would be chart-for-chart's-sake.
 */
export function DistributionStrip({
  slices, caption, groupSize, privacyThreshold = 10, minSlices = 2,
}: {
  slices: readonly DistributionSlice[];
  caption?: string;
  /** When known and below `privacyThreshold`, the strip suppresses itself. */
  groupSize?: number | null;
  privacyThreshold?: number;
  minSlices?: number;
}) {
  if (groupSize !== undefined && groupSize !== null && groupSize < privacyThreshold) {
    return <Suppressed reason="group_too_small" groupSize={groupSize} dataType={caption ?? 'Distribuzione'} />;
  }
  const real = slices.filter((s) => Number.isFinite(s.share) && s.share > 0);
  if (real.length < minSlices) {
    return <InsufficientData measure={caption ?? 'Distribuzione'} have={real.length} need={minSlices} />;
  }
  const total = real.reduce((a, s) => a + s.share, 0) || 1;

  return (
    <div data-kora-encoding="distribution-strip">
      <div
        role="img"
        aria-label={`Distribuzione: ${real.map((s) => `${s.label} ${Math.round((s.share / total) * 100)}%`).join(', ')}`}
        style={{ display: 'flex', gap: 2, height: 10 }}
      >
        {real.map((s, i) => (
          <span key={s.key} aria-hidden="true" style={{
            flex: s.share / total, borderRadius: 2,
            background: i === 0 ? PX.ink : `rgba(6,3,43,${Math.max(0.12, 0.55 - i * 0.12)})`,
          }} />
        ))}
      </div>
      <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {real.map((s) => (
          <li key={s.key} className="kt-caption kt-num" style={{ color: PX.ink3 }}>
            {s.label} {Math.round((s.share / total) * 100)}%
          </li>
        ))}
      </ul>
      {caption && <p className="kt-caption" style={{ color: PX.inkMute, marginTop: 4 }}>{caption}</p>}
    </div>
  );
}
