'use client';

import { PX } from '@/lib/design/kora-design-tokens';
import { NotYetAvailable } from '../states';

/**
 * KORA-WP-142 — the trend primitive, and its honest absence.
 *
 * KORA has exactly one reporting period. Historical comparison is KORA-WP-144
 * and is deliberately NOT a dependency of this package, so the trend primitive
 * must exist and must be honest about having nothing to compare.
 *
 * A `prior` of `null` is NOT a delta of zero. There is no arrow, no sparkline,
 * no "0.0%", no flat line and no greyed-out previous value — every one of those
 * asserts a comparison that was never made. The component renders the canonical
 * NOT YET AVAILABLE state instead.
 */
export type TrendInput =
  | { kind: 'no_prior_period'; expected: string }
  | { kind: 'compared'; current: number; prior: number; priorPeriodLabel: string; unit: 'ratio' | 'score100' };

export function TrendIndicator({ metricLabel, trend }: { metricLabel: string; trend: TrendInput }) {
  if (trend.kind === 'no_prior_period') {
    return (
      <div data-kora-encoding="trend" data-trend-state="no_prior_period">
        <NotYetAvailable title={`${metricLabel} — confronto di periodo`} expected={trend.expected} />
      </div>
    );
  }

  const delta = trend.current - trend.prior;
  const shown = trend.unit === 'ratio'
    ? `${delta >= 0 ? '+' : '−'}${Math.abs(Math.round(delta * 100))} p.p.`
    : `${delta >= 0 ? '+' : '−'}${Math.abs(Math.round(delta))}`;

  return (
    <div data-kora-encoding="trend" data-trend-state="compared">
      <p className="kt-caption kt-num" style={{ color: PX.ink2 }}>
        <span aria-hidden="true">{delta > 0 ? '▲' : delta < 0 ? '▼' : '■'}</span>{' '}
        {shown} vs {trend.priorPeriodLabel}
      </p>
      <p className="kt-caption" style={{ color: PX.inkMute, marginTop: 2 }}>
        Variazione osservata — correlazione ≠ causalità.
      </p>
    </div>
  );
}
