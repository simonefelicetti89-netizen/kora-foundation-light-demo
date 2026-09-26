'use client';

import type { ReactNode } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';
import { assessmentTreatment } from '@/lib/design/surface-state-grammar';
import {
  thresholdScaleFor, assessmentFor, trackPosition, distanceToNextStop,
  type MetricCode,
} from '@/lib/design/encoding-grammar';
import { NoData, InsufficientData, Suppressed } from '../states';

/**
 * KORA-WP-142 — the core significance encoding.
 *
 * ANSWERS TWO QUESTIONS AT ONCE: how large, and where relative to threshold.
 * That second question is the whole point. `AR 100%` and `EVQ 10%` are both
 * percentages and read identically as bare numbers; on their own scales one sits
 * far above its CLEAR stop and the other far below its first, and the meter
 * makes that difference the loudest thing about them.
 *
 * The caller may not pass a colour, a tone or an assessment. It states the
 * metric and the value; the claim is derived from the methodology config, so a
 * healthy value cannot be painted as dangerous and a failing one cannot be
 * painted as healthy.
 */
export function ThresholdMeter({
  metric, value, label, unitSuffix, note, compact,
}: {
  metric: MetricCode;
  /**
   * The value on the METRIC'S OWN scale, or a non-numeric state. `null` is NOT
   * zero: a metric with no value renders NO DATA, never a bar at the floor.
   */
  value: number | null | { suppressed: { groupSize: number } } | { insufficient: { have: number; need: number } };
  label: string;
  unitSuffix?: string;
  note?: ReactNode;
  compact?: boolean;
}) {
  if (value !== null && typeof value === 'object' && 'suppressed' in value) {
    return <Suppressed reason="group_too_small" groupSize={value.suppressed.groupSize} dataType={label} />;
  }
  if (value !== null && typeof value === 'object' && 'insufficient' in value) {
    return <InsufficientData measure={label} have={value.insufficient.have} need={value.insufficient.need} />;
  }
  if (value === null || Number.isNaN(value)) {
    return <NoData missing={label} />;
  }

  const scale = thresholdScaleFor(metric);
  const claim = assessmentFor(metric, value);
  const treat = assessmentTreatment(claim);
  const pos   = trackPosition(scale, value);
  const next  = distanceToNextStop(metric, value);

  const asPercent = scale.unit === 'ratio';
  const shown = asPercent ? `${Math.round(value * 100)}%` : `${Math.round(value)}`;
  const stopText = (n: number) => (asPercent ? `${Math.round(n * 100)}%` : `${Math.round(n)}`);

  return (
    <div data-kora-encoding="threshold-meter" data-metric={metric}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <p className="kt-label" style={{ color: PX.ink, minWidth: 0 }}>{label}</p>
        <p className="kt-subsection kt-num" style={{ color: treat.text, flexShrink: 0 }}>
          {shown}{unitSuffix}
        </p>
      </div>

      {/* The track. Threshold stops are drawn ON it, so position is read against
          the methodology rather than against the other metrics on the page. */}
      <div
        role="meter"
        aria-label={`${label}: ${shown}${unitSuffix ?? ''} — ${claim.label}`}
        aria-valuenow={value}
        aria-valuemin={scale.min}
        aria-valuemax={scale.max}
        aria-valuetext={`${shown}${unitSuffix ?? ''}, ${claim.label}`}
        style={{
          position: 'relative', height: 8, marginTop: 8,
          background: PX.inkWash, borderRadius: 999, overflow: 'visible',
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, width: `${pos * 100}%`,
          background: treat.fill, borderRadius: 999,
        }} />
        {scale.stops.filter((s) => s.at > scale.min).map((s) => (
          <span
            key={s.source}
            aria-hidden="true"
            title={`${s.label} — ${stopText(s.at)} (${s.source})`}
            style={{
              position: 'absolute', top: -3, bottom: -3,
              left: `${trackPosition(scale, s.at) * 100}%`,
              width: 2, background: PX.ink, opacity: 0.45, borderRadius: 1,
            }}
          />
        ))}
      </div>

      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <p className="kt-caption" style={{ color: treat.text }}>
            {claim.label}
            {'reason' in claim && <span style={{ color: PX.ink3 }}>{' — '}{claim.reason}</span>}
          </p>
          <p className="kt-caption kt-num" style={{ color: PX.ink3, flexShrink: 0 }}>
            {next
              ? `${stopText(next.gap)} a "${next.stop.label}"`
              : 'Tutte le soglie superate'}
          </p>
        </div>
      )}
      {note && <div style={{ marginTop: 4 }}>{note}</div>}

      {/* Provenance: a tick the reader cannot trace is a tick they cannot trust. */}
      <p className="kt-caption" style={{ color: PX.inkMute, marginTop: 4 }}>
        Soglie: {scale.sourceLabel}
      </p>
    </div>
  );
}
