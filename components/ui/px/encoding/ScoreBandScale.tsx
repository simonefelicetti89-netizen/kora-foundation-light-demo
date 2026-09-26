'use client';

import { PX } from '@/lib/design/kora-design-tokens';
import { assessmentTreatment } from '@/lib/design/surface-state-grammar';
import { thresholdScaleFor, assessmentFor, trackPosition } from '@/lib/design/encoding-grammar';
import { NoData } from '../states';

/**
 * KORA-WP-142 — the KORA Index against its own named bands.
 *
 * A bare `33/100` tells a reader nothing about what 33 means in KORA's
 * methodology. The band scale shows the five configured bands by name, in
 * proportion, with the value placed in one of them — so the number stops being
 * a score out of a hundred and becomes a position in a calibrated vocabulary.
 *
 * The bands are read from `score_bands` in the versioned config. This component
 * defines none of them and cannot be told which band a value is in.
 */
export function ScoreBandScale({ value, caption, onDark }: {
  value: number | null;
  caption?: string;
  /**
   * Swaps only the NEUTRAL ink tokens for their dark-ground equivalents. The
   * semantic treatment is still derived from the methodology and is NOT
   * overridable here — a caller cannot recolour a band by claiming a ground.
   */
  onDark?: boolean;
}) {
  if (value === null || Number.isNaN(value)) return <NoData missing="KORA Index™" />;

  const scale = thresholdScaleFor('KORA_INDEX');
  const claim = assessmentFor('KORA_INDEX', value);
  const treat = assessmentTreatment(claim);
  const pos   = trackPosition(scale, value);

  const quiet = onDark ? 'rgba(255,255,255,0.45)' : PX.inkMute;
  const body  = onDark ? 'rgba(255,255,255,0.68)' : PX.ink3;
  const track = onDark ? 'rgba(255,255,255,0.13)' : PX.inkWash;
  const mark  = onDark ? '#FFFFFF' : PX.ink;

  const bands = scale.stops.map((s, i) => {
    const next = scale.stops[i + 1];
    const to = next ? next.at : scale.max;
    return { ...s, from: s.at, to, span: (to - s.at) / (scale.max - scale.min) };
  });
  const active = bands.find((b) => value >= b.from && value < b.to) ?? bands[bands.length - 1]!;

  return (
    <div data-kora-encoding="score-band-scale">
      <div
        role="meter"
        aria-label={`KORA Index: ${Math.round(value)} su 100 — banda ${active.label}`}
        aria-valuenow={value} aria-valuemin={scale.min} aria-valuemax={scale.max}
        aria-valuetext={`${Math.round(value)} su 100, banda ${active.label}`}
        style={{ display: 'flex', gap: 2, position: 'relative' }}
      >
        {bands.map((b) => (
          <span key={b.source} aria-hidden="true" style={{
            flex: b.span, height: 10, borderRadius: 2,
            background: b.label === active.label ? treat.fill : track,
          }} />
        ))}
        {/* The value marker, placed on the true scale rather than on the band. */}
        <span aria-hidden="true" style={{
          position: 'absolute', top: -4, bottom: -4, left: `${pos * 100}%`,
          width: 2, background: mark, borderRadius: 1,
        }} />
      </div>

      <div style={{ display: 'flex', gap: 2, marginTop: 5 }}>
        {bands.map((b) => (
          <span key={b.source} className="kt-caption" style={{
            flex: b.span, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: b.label === active.label ? (onDark ? '#FFFFFF' : treat.text) : quiet,
          }}>
            {b.label}
          </span>
        ))}
      </div>

      <p className="kt-caption" style={{ color: body, marginTop: 6 }}>
        {caption ?? `Banda "${active.label}" — da ${Math.round(active.from)} a ${Math.round(active.to)} su 100.`}
      </p>
      <p className="kt-caption" style={{ color: quiet, marginTop: 2 }}>
        Bande: {scale.sourceLabel} · pre_empirical_calibration
      </p>
    </div>
  );
}
