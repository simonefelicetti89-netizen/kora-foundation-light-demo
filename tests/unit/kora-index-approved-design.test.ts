import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { resolveVerdict, buildPrecisionLine } from '../../lib/verdict/resolve';
import { deriveBindingConstraint, actionDivergesFromConstraint } from '../../lib/verdict/binding-constraint';
import { thresholdScaleFor, ENCODED_METRICS } from '../../lib/design/encoding-grammar';
import rawConfig from '../../data/methodology/methodology-config.json';
import type { KoraIndexComponent, MacroblockScore } from '../../lib/types';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
const code = (rel: string) => read(rel)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const c = (code_: string, value: number): KoraIndexComponent =>
  ({ code: code_, label: code_, value, weight: 0.1 } as KoraIndexComponent);
const mb = (code_: string, score: number, label = code_): MacroblockScore =>
  ({ code: code_, label, weight: 0.2, score, component_codes: [] } as MacroblockScore);

// ═══════════════════════════════════════════════════════════════════
// Narrative coherence — ONE binding constraint, consumed everywhere
// ═══════════════════════════════════════════════════════════════════

describe('approved design — executive narrative coherence', () => {
  // The defect: the surface derived "what is holding the score back" in four
  // places on three different bases, and told a different story in each.
  const FIXTURES = [
    { name: 'depth binds',      comps: [c('AR', 1.0), c('MAR', 0.68), c('EVQ', 0.25), c('INT', 0.0)], macro: [mb('BTI', 53)], type: 'depth',      code: 'INT' },
    { name: 'evidence binds',   comps: [c('AR', 0.9), c('MAR', 0.7),  c('EVQ', 0.10), c('INT', 0.8)], macro: [mb('BTI', 80)], type: 'evidence',   code: 'EVQ' },
    { name: 'reach binds',      comps: [c('AR', 0.08), c('MAR', 0.5), c('EVQ', 0.9)],                 macro: [mb('BTI', 90)], type: 'reach',      code: 'AR'  },
    { name: 'continuity binds', comps: [c('AR', 0.9), c('CONT', 0.05), c('EVQ', 0.8)],                macro: [mb('BTI', 75)], type: 'continuity', code: 'CONT'},
    { name: 'budget binds',     comps: [c('AR', 0.9), c('EVQ', 0.85)],                                macro: [mb('BTI', 12)], type: 'budget',     code: 'BTI' },
    { name: 'nothing binds',    comps: [c('AR', 0.9), c('EVQ', 0.85)],                                macro: [mb('BTI', 88)], type: 'none',       code: null  },
  ] as const;

  for (const f of FIXTURES) {
    it(`${f.name}: verdict, precision line and drivers all name the same constraint`, () => {
      const binding = deriveBindingConstraint([...f.comps], [...f.macro]);
      expect(binding.type, 'binding type').toBe(f.type);
      expect(binding.code, 'binding code').toBe(f.code);

      // 1. the verdict's constraint clause
      const v = resolveVerdict({ koraIndexValue: 33, safeguardStatus: 'CLEAR', components: [...f.comps], macroblocks: [...f.macro] });
      expect(v.constraint, 'verdict constraint').toBe(binding.type);
      expect(v.binding.code, 'verdict carries the binding decision').toBe(binding.code);

      // 2. the precision sub-line speaks about that same constraint
      const line = buildPrecisionLine({
        koraIndexValue: 33, safeguardStatus: 'CLEAR',
        components: [...f.comps], macroblocks: [...f.macro], activationRate: 0.8,
      });
      if (binding.type === 'none') {
        expect(line).toMatch(/Nessun vincolo/);
      } else {
        expect(line.length, 'precision line present').toBeGreaterThan(0);
      }

      // 3. ScoreDrivers ranks the same code first
      const weakest = [...f.comps]
        .filter((x) => typeof x.value === 'number')
        .sort((a, b) => a.value - b.value)[0];
      if (binding.code && binding.code !== 'BTI') {
        expect(weakest!.code, 'ScoreDrivers rank #1').toBe(binding.code);
      }
    });
  }

  it('the precision sub-line is no longer hardcoded to evidence', () => {
    const line = buildPrecisionLine({
      koraIndexValue: 33, safeguardStatus: 'CLEAR',
      components: [c('AR', 1.0), c('EVQ', 0.9), c('CONT', 0.02)],
      macroblocks: [mb('BTI', 90)], activationRate: 1.0,
    });
    expect(line).toMatch(/continuità/);
    expect(line).not.toMatch(/evidenza verificata/);
  });

  it('the constraint is decided in exactly ONE place', () => {
    const resolve = code('lib/verdict/resolve.ts');
    // resolve.ts must delegate, never re-rank
    expect(resolve).toContain('deriveBindingConstraint');
    expect(resolve).not.toMatch(/candidates\.sort/);
    const page = code('app/company/kora-index/page.tsx');
    expect(page).not.toMatch(/COMPONENT_CONSTRAINT/);
  });

  it('a diverging highest-leverage action is declared, never silent', () => {
    const binding = deriveBindingConstraint([c('AR', 1.0), c('INT', 0.0)], [mb('BTI', 53)]);
    const macros = [mb('EQUITY', 0, 'Distribution & Equity'), mb('QUALITY', 9, 'Activation Quality')];
    expect(actionDivergesFromConstraint(binding, 'EQUITY', macros)).toBe(true);
    expect(actionDivergesFromConstraint(binding, 'QUALITY', macros)).toBe(false);
    // and the surface renders the declaration
    expect(read('app/company/kora-index/page.tsx')).toMatch(/actionDiverges/);
    expect(read('app/company/kora-index/page.tsx')).toMatch(/maggiore impatto ponderato/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Responsibility boundaries
// ═══════════════════════════════════════════════════════════════════

describe('approved design — ScoreDrivers answers WHERE, never WHAT TO DO', () => {
  it('renders no imperative line', () => {
    const src = code('components/kora-index/ScoreDrivers.tsx');
    // the rendered body must not emit the action field
    const body = src.slice(src.indexOf('export function ScoreDrivers'));
    expect(body).not.toMatch(/driver\.action/);
    expect(body).not.toMatch(/→/);
  });

  it('BoardActions remains the sole imperative source on the surface', () => {
    const page = code('app/company/kora-index/page.tsx');
    expect(page).toContain('<BoardActions');
    expect(page).toContain('boardActions[0]');
  });
});

describe('approved design — the reading is a synthesis, not a report', () => {
  const src = () => code('components/executive-intelligence/ExecutiveIntelligencePanel.tsx');
  it('issues no imperative and states no competing status label', () => {
    expect(src()).not.toMatch(/primaryAction/);
    expect(src()).not.toMatch(/organizationStatus/);
  });
  it('declares it is not a KORA Index component', () => {
    expect(src()).toContain('not_kora_index_component');
  });
});

// ═══════════════════════════════════════════════════════════════════
// Disclosure grammar — the defect that inflated the comp by ~800px
// ═══════════════════════════════════════════════════════════════════

describe('approved design — disclosure layout semantics', () => {
  const css = read('app/globals.css');

  it('the disclosure grid is a DIRECT-CHILD rule, never a descendant one', () => {
    // A descendant selector also matches the title+caption wrapper and puts the
    // caption in the 24px icon column.
    expect(css).toMatch(/\.kora-disclosures\s*>\s*\.kora-drow/);
    expect(css).not.toMatch(/\.kora-disclosures\s+div\s*\{/);
    expect(css).not.toMatch(/\.disc\s+div\s*\{/);
  });

  it('closed rows sit on the canvas: no fill, no radius, no ordinal', () => {
    const block = css.slice(css.indexOf('.kora-disclosure-region .kora-chapter-band'));
    expect(block).toMatch(/background:\s*transparent/);
    expect(block).toMatch(/border-radius:\s*0/);
    expect(css).toMatch(/\.kora-disclosure-region \.kora-chapter-num\s*\{\s*display:\s*none/);
  });

  it('the page declares exactly four disclosure groups', () => {
    const page = read('app/company/kora-index/page.tsx');
    const ids = [...page.matchAll(/<Chapter\s+id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(['costruzione', 'affidabilita', 'perimetro', 'approfondimenti']);
  });

  it('the Chapter head puts the caption beneath the title, at full measure', () => {
    const src = read('components/ui/px/Chapter.tsx');
    expect(src).toMatch(/aside &&[\s\S]{0,120}marginTop/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Art direction
// ═══════════════════════════════════════════════════════════════════

describe('approved design — no persistent accent', () => {
  const SURFACES = [
    'app/company/kora-index/page.tsx',
    'components/ui/px/design/ExecutiveSurface.tsx',
    'components/ui/px/design/VerdictLine.tsx',
    'components/ui/px/design/SignalRow.tsx',
    'components/ui/px/RankedGroup.tsx',
    'components/executive-intelligence/ExecutiveIntelligencePanel.tsx',
  ];

  for (const f of SURFACES) {
    it(`${f} uses no terracotta or violet accent`, () => {
      const src = code(f);
      expect(src, f).not.toMatch(/#C76F3D|#6156F5/i);
      expect(src, f).not.toMatch(/TOKENS\.accent|PX\.violet/);
    });
  }

  it('the reference layer renders no badge component', () => {
    const page = code('app/company/kora-index/page.tsx');
    expect(page).not.toMatch(/ProvenanceFooter|MethodologyBadge/);
    // and still discloses both non-suppressible values
    expect(page).toContain('output.methodology_version_id');
    expect(page).toContain('output.calibration_status');
  });

  it('the executive verdict mobile step is component-scoped, not a global override', () => {
    const css = read('app/globals.css');
    expect(css).toMatch(/\.kora-verdict\s*\{\s*font-size:\s*34px/);
    // the WP139 canonical mobile display step is untouched
    expect(css).toMatch(/\.kt-display\s*\{\s*font-size:\s*42px/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// WP142 technical correctness, ported
// ═══════════════════════════════════════════════════════════════════

describe('approved design — ported WP142 technical correctness', () => {
  it('every threshold stop still traces to the versioned config', () => {
    for (const m of ENCODED_METRICS) {
      for (const stop of thresholdScaleFor(m).stops) {
        expect(stop.source, `${m}/${stop.label}`).toMatch(/^(safeguard_thresholds|macroblock_status_thresholds|score_bands)\./);
      }
    }
  });

  it('AR and MAR stops equal safeguard_thresholds, value for value', () => {
    const cfg = (rawConfig as unknown as Record<string, unknown>)['safeguard_thresholds'] as
      { CLEAR: { AR: number; MAR: number }; WARNING: { AR_min: number; MAR_min: number } };
    expect(thresholdScaleFor('AR').stops.map((s) => s.at)).toEqual([0, cfg.WARNING.AR_min, cfg.CLEAR.AR]);
    expect(thresholdScaleFor('MAR').stops.map((s) => s.at)).toEqual([0, cfg.WARNING.MAR_min, cfg.CLEAR.MAR]);
  });

  it('the component grid is keyed on the canonical codes', () => {
    const src = read('components/kora-index/ComponentBreakdown.tsx');
    expect(src).toMatch(/'AR', 'MAR', 'EVQ', 'INT', 'CONT', 'EQW', 'EQS', 'PC', 'PB'/);
  });

  it('an absent component is never coerced to a measured zero', () => {
    expect(code('components/charts/ComponentBreakdownChart.tsx')).not.toMatch(/\.value\s*\?\?\s*0/);
  });

  it('no threshold is invented in the visual layer', () => {
    expect(code('components/charts/ComponentBreakdownChart.tsx')).not.toMatch(/ReferenceLine/);
    expect(code('components/kora-index/ConfidenceBreakdown.tsx')).not.toMatch(/pct\s*>=?\s*(70|50)/);
  });
});
