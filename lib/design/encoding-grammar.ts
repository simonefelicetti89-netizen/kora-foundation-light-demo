// KORA-WP-142 — Data Visualisation Grammar: the numeric authority.
//
// THE DEFECT THIS EXISTS FOR: the Product renders six threshold-bearing metrics
// — KORA Index, AR, MAR, CONT, EVQ, BTI — as plain numbers, so `AR 100%` and
// `EVQ 10%` are visually equivalent despite every one of them having a defined
// methodology threshold. Significance is invisible.
//
// THIS FILE DEFINES NO THRESHOLD. Every stop below is READ from the versioned
// methodology configuration and carries the config path it came from, so a
// reader — and a test — can trace any tick on any scale back to its source.
// Inventing a threshold here would be the same class of error as hardcoding a
// weight in a component.

import {
  getThresholds,
  getMacroblockStatusThresholds,
  SCORE_BANDS,
  getScoreBand,
} from '@/lib/methodology-config/v0.1';
import type { MacroblockCode } from '@/lib/types';
import type { Assessment } from './surface-state-grammar';

/** The six metrics the Product currently renders bare. */
export const ENCODED_METRICS = ['KORA_INDEX', 'AR', 'MAR', 'CONT', 'EVQ', 'BTI'] as const;
export type MetricCode = (typeof ENCODED_METRICS)[number];

/**
 * The scale a metric's own values live on.
 * `ratio` is 0–1 as the scoring engine emits component values; `score100` is the
 * 0–100 scale of the KORA Index and of a macroblock score. They are NOT
 * interchangeable, and a scale mismatch is what makes two percentages look alike.
 */
export type MetricUnit = 'ratio' | 'score100';

export interface ThresholdStop {
  /** Position on the metric's own scale — never renormalised here. */
  readonly at: number;
  readonly label: string;
  /** The claim that holds AT OR ABOVE this stop, until the next one. */
  readonly assessment: Assessment;
  /** Config path this stop was read from. */
  readonly source: string;
}

export interface ThresholdScale {
  /** The metric or macroblock this scale belongs to. */
  readonly metric: string;
  readonly unit: MetricUnit;
  readonly min: number;
  readonly max: number;
  /** Ascending by `at`. The first stop is the floor of the scale. */
  readonly stops: readonly ThresholdStop[];
  /** Human-readable provenance, shown to the reader, not only to a test. */
  readonly sourceLabel: string;
}

/**
 * A metric whose only methodology-backed scale is the shared 0–100 status scale
 * says so, rather than implying a component-specific calibrated threshold that
 * does not exist pre-Delphi.
 */
const STATUS_SCALE_LABEL = 'macroblock_status_thresholds (scala di stato 0–100)';

function statusStops(unit: MetricUnit): ThresholdStop[] {
  const t = getMacroblockStatusThresholds();
  const scale = (n: number) => (unit === 'ratio' ? n / 100 : n);
  return [
    {
      at: scale(t.critico.min),
      label: t.critico.label,
      assessment: { kind: 'risk', label: t.critico.label, reason: `Sotto la soglia "${t.sviluppo.label}" (${t.sviluppo.min}/100).` },
      source: 'macroblock_status_thresholds.critico.min',
    },
    {
      at: scale(t.sviluppo.min),
      label: t.sviluppo.label,
      assessment: { kind: 'watch', label: t.sviluppo.label, reason: `Sotto la soglia "${t.buono.label}" (${t.buono.min}/100).` },
      source: 'macroblock_status_thresholds.sviluppo.min',
    },
    {
      at: scale(t.buono.min),
      label: t.buono.label,
      assessment: { kind: 'ok', label: t.buono.label },
      source: 'macroblock_status_thresholds.buono.min',
    },
  ];
}

/** AR and MAR are the two inputs the Activation Safeguard is defined on. */
function safeguardStops(metric: 'AR' | 'MAR'): ThresholdStop[] {
  const t = getThresholds();
  const clear = metric === 'AR' ? t.CLEAR.AR : t.CLEAR.MAR;
  const warn  = metric === 'AR' ? t.WARNING.AR_min : t.WARNING.MAR_min;
  const pct   = (n: number) => `${Math.round(n * 100)}%`;
  return [
    {
      at: 0,
      label: 'Flagged',
      assessment: { kind: 'risk', label: 'Flagged', reason: `${metric} sotto ${pct(warn)} — soglia minima di Activation Safeguard™.` },
      source: `safeguard_thresholds.FLAGGED.${metric}_max`,
    },
    {
      at: warn,
      label: 'Warning',
      assessment: { kind: 'watch', label: 'Warning', reason: `${metric} sotto ${pct(clear)} — soglia CLEAR di Activation Safeguard™.` },
      source: `safeguard_thresholds.WARNING.${metric}_min`,
    },
    {
      at: clear,
      label: 'Clear',
      assessment: { kind: 'ok', label: 'Clear' },
      source: `safeguard_thresholds.CLEAR.${metric}`,
    },
  ];
}

function scoreBandStops(): ThresholdStop[] {
  return SCORE_BANDS.map((b) => ({
    at: b.min,
    label: b.labelIt,
    assessment:
      b.key === 'weak'
        ? ({ kind: 'risk', label: b.labelIt, reason: 'Sotto la banda "Attivazione iniziale" (30/100).' } as Assessment)
        : b.key === 'early' || b.key === 'developing'
          ? ({ kind: 'watch', label: b.labelIt, reason: 'Sotto la banda "Solida" (60/100).' } as Assessment)
          : ({ kind: 'ok', label: b.labelIt } as Assessment),
    source: `score_bands.bands[${b.key}].min`,
  }));
}

export function thresholdScaleFor(metric: MetricCode): ThresholdScale {
  switch (metric) {
    case 'KORA_INDEX':
      return { metric, unit: 'score100', min: 0, max: 100, stops: scoreBandStops(), sourceLabel: 'score_bands' };
    case 'AR':
    case 'MAR':
      return { metric, unit: 'ratio', min: 0, max: 1, stops: safeguardStops(metric), sourceLabel: 'safeguard_thresholds' };
    case 'CONT':
    case 'EVQ':
      return { metric, unit: 'ratio', min: 0, max: 1, stops: statusStops('ratio'), sourceLabel: STATUS_SCALE_LABEL };
    case 'BTI':
      return { metric, unit: 'score100', min: 0, max: 100, stops: statusStops('score100'), sourceLabel: STATUS_SCALE_LABEL };
  }
}

/**
 * The four macroblocks share ONE 0-100 status scale, because the config declares
 * exactly one and inventing a per-macroblock scale would be inventing thresholds.
 * BTI is one of the six required metrics and also a macroblock; both entry points
 * resolve to the same stops, so they cannot drift apart.
 */
export function macroblockScale(code: MacroblockCode | string): ThresholdScale {
  return { metric: code, unit: 'score100', min: 0, max: 100, stops: statusStops('score100'), sourceLabel: STATUS_SCALE_LABEL };
}

/** The claim a value holds on any scale — the same rule the six metrics use. */
export function assessmentForScale(scale: ThresholdScale, value: number): Assessment {
  let held = scale.stops[0]!;
  for (const s of scale.stops) if (value >= s.at) held = s;
  return held.assessment;
}

/**
 * The claim that holds for a value, derived from config alone.
 *
 * There is deliberately no way for a caller to pass an assessment in: a metric's
 * significance is a property of the methodology, not of the component rendering
 * it, which is what stops a healthy value from being painted as dangerous.
 */
export function assessmentFor(metric: MetricCode, value: number): Assessment {
  if (metric === 'KORA_INDEX') {
    const band = getScoreBand(value);
    return scoreBandStops().find((s) => s.label === band.labelIt)?.assessment
      ?? { kind: 'neutral', label: band.labelIt };
  }
  const { stops } = thresholdScaleFor(metric);
  let held = stops[0]!;
  for (const s of stops) if (value >= s.at) held = s;
  return held.assessment;
}

/** Where a value sits on its own scale, as a 0–1 fraction of the track. */
export function trackPosition(scale: ThresholdScale, value: number): number {
  const span = scale.max - scale.min;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (value - scale.min) / span));
}

/**
 * A value's distance from the nearest threshold it has not yet cleared.
 * `null` once every stop is cleared — there is nothing left to reach, and
 * inventing a target beyond the top band would be fabricating a benchmark.
 */
export function distanceToNextStop(
  metric: MetricCode,
  value: number,
): { stop: ThresholdStop; gap: number } | null {
  const { stops } = thresholdScaleFor(metric);
  const next = stops.find((s) => value < s.at);
  return next ? { stop: next, gap: next.at - value } : null;
}
