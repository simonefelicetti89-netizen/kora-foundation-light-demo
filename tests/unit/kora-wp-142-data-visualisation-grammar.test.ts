import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import rawConfig from '../../data/methodology/methodology-config.json';
import {
  ENCODED_METRICS, thresholdScaleFor, assessmentFor, macroblockScale,
  assessmentForScale, trackPosition, distanceToNextStop, type MetricCode,
} from '../../lib/design/encoding-grammar';
import { assessmentTreatment, isDangerTreatment } from '../../lib/design/surface-state-grammar';
import { SAFEGUARD_THRESHOLDS } from '../../lib/constants/kora';

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

/**
 * Source with comments removed. These assertions are about what the code DOES;
 * a rule that also reads the prose explaining why a pattern was removed will
 * fail on the very comment documenting the fix.
 */
function code(rel: string) {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
}

const ENCODING_DIR = 'components/ui/px/encoding';
const ENCODING_FILES = fs.readdirSync(path.resolve(__dirname, '../..', ENCODING_DIR))
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => `${ENCODING_DIR}/${f}`);

/** The WP142 demonstrator surface: the components that carry the six metrics. */
const ADOPTING_COMPONENTS = [
  'components/kora-index/HeroDiagnosis.tsx',
  'components/kora-index/ComponentBreakdown.tsx',
  'components/kora-index/MacroblockCard.tsx',
  'components/kora-index/ActivationSafeguardPanel.tsx',
  'components/kora-index/ConfidenceBreakdown.tsx',
  'components/charts/ComponentBreakdownChart.tsx',
];

// ═══════════════════════════════════════════════════════════════════
// A — the primitives exist
// ═══════════════════════════════════════════════════════════════════

describe('KORA-WP-142 (A) — encoding primitives exist', () => {
  const expected = [
    'ThresholdMeter', 'ScoreBandScale', 'ConfidenceGauge',
    'SafeguardSignificance', 'ContributionBars', 'DistributionStrip', 'TrendIndicator',
  ];

  for (const name of expected) {
    it(`${name} is exported from the encoding barrel`, () => {
      expect(read(`${ENCODING_DIR}/index.ts`)).toContain(name);
    });
  }

  it('the primitives are reachable from the shared px barrel', () => {
    const barrel = read('components/ui/px/index.ts');
    for (const name of expected) expect(barrel).toContain(name);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Thresholds come from methodology config — and from nowhere else
// ═══════════════════════════════════════════════════════════════════

describe('KORA-WP-142 — thresholds are sourced from methodology config', () => {
  it('AR and MAR stops equal safeguard_thresholds, value for value', () => {
    const cfg = (rawConfig as unknown as Record<string, unknown>)['safeguard_thresholds'] as unknown as {
      CLEAR: { AR: number; MAR: number }; WARNING: { AR_min: number; MAR_min: number };
    };
    const ar = thresholdScaleFor('AR');
    expect(ar.stops.map((s) => s.at)).toEqual([0, cfg.WARNING.AR_min, cfg.CLEAR.AR]);

    const mar = thresholdScaleFor('MAR');
    expect(mar.stops.map((s) => s.at)).toEqual([0, cfg.WARNING.MAR_min, cfg.CLEAR.MAR]);
  });

  it('EVQ, CONT and BTI stops equal macroblock_status_thresholds', () => {
    const t = (rawConfig as unknown as Record<string, unknown>)['macroblock_status_thresholds'] as unknown as {
      critico: { min: number }; sviluppo: { min: number }; buono: { min: number };
    };
    expect(thresholdScaleFor('EVQ').stops.map((s) => s.at))
      .toEqual([t.critico.min / 100, t.sviluppo.min / 100, t.buono.min / 100]);
    expect(thresholdScaleFor('CONT').stops.map((s) => s.at))
      .toEqual([t.critico.min / 100, t.sviluppo.min / 100, t.buono.min / 100]);
    expect(thresholdScaleFor('BTI').stops.map((s) => s.at))
      .toEqual([t.critico.min, t.sviluppo.min, t.buono.min]);
  });

  it('KORA Index stops equal score_bands', () => {
    const bands = ((rawConfig as unknown as Record<string, unknown>)['score_bands'] as unknown as
      { bands: Array<{ min: number }> }).bands;
    expect(thresholdScaleFor('KORA_INDEX').stops.map((s) => s.at)).toEqual(bands.map((b) => b.min));
  });

  it('every stop carries the config path it was read from', () => {
    for (const m of ENCODED_METRICS) {
      for (const stop of thresholdScaleFor(m).stops) {
        expect(stop.source, `${m} stop "${stop.label}"`).toMatch(/^(safeguard_thresholds|macroblock_status_thresholds|score_bands)\./);
      }
    }
  });

  it('SAFEGUARD_THRESHOLDS is read from config, not re-declared', () => {
    const cfg = (rawConfig as unknown as Record<string, unknown>)['safeguard_thresholds'];
    expect(SAFEGUARD_THRESHOLDS).toEqual(cfg);
    // The literals survive only as a fallback, explicitly marked as such.
    expect(read('lib/constants/kora.ts')).toContain('_SAFEGUARD_FALLBACK');
  });

  it('BTI reached as a metric and as a macroblock resolves to identical stops', () => {
    expect(macroblockScale('BTI').stops.map((s) => s.at))
      .toEqual(thresholdScaleFor('BTI').stops.map((s) => s.at));
  });
});

describe('KORA-WP-142 — no threshold duplication in visual code', () => {
  // A ratio or 0-100 cutoff written into a component is a second copy of the
  // methodology that can silently disagree with the first.
  const BANNED = [
    /\b>=?\s*0\.40?\b/, /\b>=?\s*0\.30?\b/, /\b>=?\s*0\.20?\b/, /\b>=?\s*0\.15\b/,
    /\bpct\s*>=?\s*70\b/, /\bpct\s*>=?\s*50\b/,
    /\bs\s*>=?\s*70\b/, /\bs\s*>=?\s*50\b/,
    /ReferenceLine/,
  ];

  for (const file of [...ENCODING_FILES, ...ADOPTING_COMPONENTS]) {
    it(`${file} hardcodes no threshold comparison`, () => {
      const src = code(file);
      for (const re of BANNED) expect(src, `${file} matched ${re}`).not.toMatch(re);
    });
  }

  it('the encoding primitives import their numbers from the grammar only', () => {
    for (const file of ENCODING_FILES) {
      const src = read(file);
      if (!src.includes('threshold') && !src.includes('Threshold')) continue;
      expect(src).not.toMatch(/methodology-config\.json/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// B — all six metrics encode significance on the canonical surface
// ═══════════════════════════════════════════════════════════════════

describe('KORA-WP-142 (B) — the six bare metrics now encode significance', () => {
  it('exactly the six threshold-bearing metrics are declared', () => {
    expect([...ENCODED_METRICS].sort()).toEqual(['AR', 'BTI', 'CONT', 'EVQ', 'KORA_INDEX', 'MAR']);
  });

  it('every one of the six has a scale with at least two stops', () => {
    for (const m of ENCODED_METRICS) {
      expect(thresholdScaleFor(m).stops.length, m).toBeGreaterThanOrEqual(2);
    }
  });

  it('AR 100% and EVQ 10% are not visually equivalent', () => {
    const arClaim  = assessmentFor('AR', 1.0);
    const evqClaim = assessmentFor('EVQ', 0.10);
    expect(arClaim.kind).toBe('ok');
    expect(evqClaim.kind).toBe('risk');
    expect(assessmentTreatment(arClaim).fill).not.toBe(assessmentTreatment(evqClaim).fill);
    // and they sit in different places on their own tracks
    expect(trackPosition(thresholdScaleFor('AR'), 1.0))
      .toBeGreaterThan(trackPosition(thresholdScaleFor('EVQ'), 0.10));
  });

  it('the canonical surface renders an encoding for each of the six', () => {
    const adopting = ADOPTING_COMPONENTS.map(read).join('\n');
    expect(adopting).toMatch(/ScoreBandScale/);                 // KORA_INDEX
    expect(adopting).toMatch(/metric="AR"|code as MetricCode/); // AR
    expect(adopting).toMatch(/metric="MAR"|code as MetricCode/);// MAR
    expect(adopting).toMatch(/macroblockScale/);                // BTI
    expect(read('components/kora-index/ComponentBreakdown.tsx')).toContain('THRESHOLD_BEARING');
  });

  it('the component grid meters exactly the threshold-bearing codes it holds', async () => {
    const mod = await import('../../components/kora-index/ComponentBreakdown');
    expect([...mod.__WP142_METERED_CODES].sort()).toEqual(['AR', 'CONT', 'EVQ', 'MAR']);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Semantic-colour correctness survives WP140
// ═══════════════════════════════════════════════════════════════════

describe('KORA-WP-142 — significance cannot be overridden by a prop', () => {
  it('no encoding primitive accepts a colour, tone or variant prop', () => {
    for (const file of ENCODING_FILES) {
      const src = read(file);
      expect(src, file).not.toMatch(/\b(tone|variant|color)\??:\s*(string|'[a-z])/);
    }
  });

  it('a healthy value can never reach the danger treatment', () => {
    for (const m of ENCODED_METRICS) {
      const scale = thresholdScaleFor(m);
      const top   = scale.stops[scale.stops.length - 1]!;
      expect(isDangerTreatment(assessmentTreatment(assessmentFor(m, top.at))), m).toBe(false);
    }
  });

  it('a watch or risk claim always carries a stated reason', () => {
    for (const m of ENCODED_METRICS) {
      for (const stop of thresholdScaleFor(m).stops) {
        if (stop.assessment.kind === 'watch' || stop.assessment.kind === 'risk') {
          expect(stop.assessment.reason.length, `${m}/${stop.label}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// Confidence is reliability, not performance
// ═══════════════════════════════════════════════════════════════════

describe('KORA-WP-142 — Confidence Score is not rendered as performance', () => {
  const gauge = () => read(`${ENCODING_DIR}/ConfidenceGauge.tsx`);

  it('CS is not one of the threshold-bearing metrics', () => {
    expect(ENCODED_METRICS as readonly string[]).not.toContain('CS');
  });

  it('the confidence gauge uses no threshold scale and no assessment', () => {
    expect(gauge()).not.toMatch(/thresholdScaleFor|assessmentFor|ThresholdMeter/);
  });

  it('the confidence gauge uses no semantic state colour', () => {
    expect(gauge()).not.toMatch(/PX\.(ok|warn|risk)\b/);
    expect(gauge()).not.toMatch(/safeguard\.(pass|watch|cap)/);
  });

  it('it states that it is external and carries weight zero', () => {
    expect(gauge()).toContain('peso = 0');
    expect(gauge()).toContain('not_kora_index_component');
  });

  it('the confidence panel no longer paints sub-factors pass/watch/cap', () => {
    const src = read('components/kora-index/ConfidenceBreakdown.tsx');
    expect(src).not.toMatch(/barColor/);
    expect(src).not.toMatch(/safeguard\.(pass|watch|cap)\.dot/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Absent is not zero
// ═══════════════════════════════════════════════════════════════════

describe('KORA-WP-142 — absent, suppressed and insufficient are never zero', () => {
  it('no encoding primitive coerces a missing value to zero', () => {
    for (const file of ENCODING_FILES) {
      expect(code(file), file).not.toMatch(/\?\?\s*0\b/);
    }
  });

  it('the adopting components no longer coerce a missing value to zero', () => {
    for (const file of ADOPTING_COMPONENTS) {
      expect(code(file), file).not.toMatch(/\.value\s*\?\?\s*0\b/);
    }
  });

  it('ThresholdMeter routes null to NO DATA, and suppression to SUPPRESSED', () => {
    const src = read(`${ENCODING_DIR}/ThresholdMeter.tsx`);
    expect(src).toMatch(/value === null[\s\S]{0,120}NoData/);
    expect(src).toMatch(/'suppressed' in value[\s\S]{0,160}Suppressed/);
    expect(src).toMatch(/'insufficient' in value[\s\S]{0,160}InsufficientData/);
  });

  it('DistributionStrip refuses rather than degrading', () => {
    const src = read(`${ENCODING_DIR}/DistributionStrip.tsx`);
    expect(src).toMatch(/groupSize\s*<\s*privacyThreshold[\s\S]{0,160}Suppressed/);
    expect(src).toMatch(/real\.length\s*<\s*minSlices[\s\S]{0,160}InsufficientData/);
  });

  it('ContributionBars renders absence in place rather than a zero-length bar', () => {
    const src = read(`${ENCODING_DIR}/ContributionBars.tsx`);
    expect(src).toMatch(/contributed === null/);
    expect(src).toContain('InsufficientData');
  });
});

// ═══════════════════════════════════════════════════════════════════
// C — the trend primitive, and no fabricated prior period
// ═══════════════════════════════════════════════════════════════════

describe('KORA-WP-142 (C) — honest no-prior-period behaviour', () => {
  const trend = () => read(`${ENCODING_DIR}/TrendIndicator.tsx`);

  it('the trend primitive exists and does not require historical data', () => {
    expect(trend()).toContain('no_prior_period');
    expect(trend()).toContain('NotYetAvailable');
  });

  it('no sparkline, no fabricated delta and no synthesised previous value', () => {
    const src = code(`${ENCODING_DIR}/TrendIndicator.tsx`);
    expect(src).not.toMatch(/sparkline|Sparkline/);
    expect(src).not.toMatch(/prior\s*(\?\?|\|\|)\s*/);
    expect(src).not.toMatch(/previous\w*\s*(\?\?|\|\|)\s*0/);
  });

  it('a delta is only computed on the compared branch', () => {
    const src = trend();
    const deltaAt = src.indexOf('const delta');
    const guardAt = src.indexOf("trend.kind === 'no_prior_period'");
    expect(guardAt).toBeGreaterThan(-1);
    expect(deltaAt).toBeGreaterThan(guardAt);
  });

  it('MacroblockCard renders a delta only when a prior score was supplied', () => {
    const src = read('components/kora-index/MacroblockCard.tsx');
    expect(src).toMatch(/previousScore !== undefined &&/);
    expect(src).not.toMatch(/previousScore\s*\?\?\s*0/);
  });

  it('no adopting component invents a previous period', () => {
    for (const file of ADOPTING_COMPONENTS) {
      expect(read(file), file).not.toMatch(/priorPeriod\s*=\s*['"`]/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// D — accessibility and privacy
// ═══════════════════════════════════════════════════════════════════

describe('KORA-WP-142 (D) — accessibility labels', () => {
  it('every role="meter" in the primitives carries an accessible name', () => {
    for (const file of ENCODING_FILES) {
      const src = read(file);
      const meters = (src.match(/role="meter"/g) ?? []).length;
      const labels = (src.match(/aria-label=/g) ?? []).length;
      expect(labels, `${file}: ${meters} meters, ${labels} labels`).toBeGreaterThanOrEqual(meters);
    }
  });

  it('meters declare value, min and max', () => {
    for (const file of ENCODING_FILES) {
      const src = read(file);
      if (!src.includes('role="meter"')) continue;
      expect(src, file).toContain('aria-valuenow');
      expect(src, file).toContain('aria-valuemin');
      expect(src, file).toContain('aria-valuemax');
    }
  });

  it('the decorative marks are hidden from assistive technology', () => {
    const src = read(`${ENCODING_DIR}/ThresholdMeter.tsx`);
    expect(src).toContain('aria-hidden="true"');
  });
});

describe('KORA-WP-142 (D) — privacy semantics preserved', () => {
  it('suppression delegates to the WP140 state, never to a local treatment', () => {
    const strip = read(`${ENCODING_DIR}/DistributionStrip.tsx`);
    expect(strip).toContain('Suppressed');
    expect(strip).not.toMatch(/PrivacyBoundaryNotice/); // reached through the state, not re-implemented
  });

  it('the N>=10 threshold is the default, not an invented one', () => {
    const strip = read(`${ENCODING_DIR}/DistributionStrip.tsx`);
    expect(strip).toMatch(/privacyThreshold\s*=\s*10/);
  });

  it('no encoding primitive reads an individual worker seed file', () => {
    const banned = ['workers.json', 'pib-records.json', 'impact-units.json', 'dynamic-cv-items.json', 'consent-records.json'];
    for (const file of ENCODING_FILES) {
      for (const b of banned) expect(read(file), `${file}/${b}`).not.toContain(b);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// The foundations WP142 must not regress
// ═══════════════════════════════════════════════════════════════════

describe('KORA-WP-142 — WP139 typography preserved', () => {
  it('no encoding primitive writes an inline fontSize', () => {
    for (const file of ENCODING_FILES) {
      expect(code(file), file).not.toMatch(/fontSize\s*:/);
    }
  });

  it('the primitives state typographic ROLES, not sizes', () => {
    const all = ENCODING_FILES.map(read).join('\n');
    expect(all).toMatch(/kt-(label|caption|subsection|meta)/);
  });

  it('nothing drops below the 11px floor by re-declaring a size', () => {
    for (const file of [...ENCODING_FILES, ...ADOPTING_COMPONENTS]) {
      expect(code(file), file).not.toMatch(/fontSize:\s*'(9|10)px'/);
    }
  });
});

describe('KORA-WP-142 — WP140 semantics preserved', () => {
  it('the state components are reused, never re-implemented', () => {
    const all = ENCODING_FILES.map(read).join('\n');
    expect(all).toMatch(/from '\.\.\/states'/);
    expect(all).not.toMatch(/function (NoData|Suppressed|InsufficientData|NotYetAvailable)\s*\(/);
  });

  it('ZERO is still distinct from NO DATA at the encoding layer', () => {
    // A zero value is a measured value and must render as a bar at the floor;
    // a null value must not reach the bar path at all.
    const src = read(`${ENCODING_DIR}/ThresholdMeter.tsx`);
    expect(src).toMatch(/value === null \|\| Number\.isNaN\(value\)/);
    expect(src).not.toMatch(/!value\s*\)/);
  });

  it('treatment is derived through assessmentTreatment, never hand-picked', () => {
    for (const file of ENCODING_FILES) {
      const src = read(file);
      if (!src.includes('treat.')) continue;
      expect(src, file).toContain('assessmentTreatment');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// Grammar arithmetic
// ═══════════════════════════════════════════════════════════════════

describe('KORA-WP-142 — grammar arithmetic', () => {
  it('trackPosition clamps to the scale', () => {
    const s = thresholdScaleFor('AR');
    expect(trackPosition(s, -1)).toBe(0);
    expect(trackPosition(s, 99)).toBe(1);
    expect(trackPosition(s, 0.5)).toBeCloseTo(0.5, 5);
  });

  it('distanceToNextStop returns null once every stop is cleared', () => {
    expect(distanceToNextStop('AR', 1.0)).toBeNull();
    const next = distanceToNextStop('AR', 0.0);
    expect(next?.gap).toBeCloseTo(SAFEGUARD_THRESHOLDS.WARNING.AR_min, 5);
  });

  it('assessmentForScale agrees with assessmentFor for the same metric', () => {
    for (const m of ENCODED_METRICS) {
      const scale = thresholdScaleFor(m);
      for (const v of [scale.min, (scale.min + scale.max) / 2, scale.max]) {
        expect(assessmentForScale(scale, v).kind, `${m}@${v}`).toBe(assessmentFor(m as MetricCode, v).kind);
      }
    }
  });

  it('no metric produces an unlabelled claim', () => {
    for (const m of ENCODED_METRICS) {
      for (const v of [0, 0.5, 1, 50, 100]) {
        expect(assessmentFor(m, v).label.length, `${m}@${v}`).toBeGreaterThan(0);
      }
    }
  });
});
