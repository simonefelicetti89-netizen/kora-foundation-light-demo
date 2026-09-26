import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  STATE_CLAUSE, CONSTRAINT_CLAUSE, BAND_KEYS, SAFEGUARD_KEYS, CONSTRAINT_TYPES,
  VERDICT_CHAR_BUDGET, VERDICT_LIBRARY_VERSION,
} from '../../lib/verdict/fragments';
import { resolveVerdict, deriveConstraintType } from '../../lib/verdict/resolve';
import type { KoraIndexComponent, MacroblockScore } from '../../lib/types';

const comp = (code: string, value: number): KoraIndexComponent =>
  ({ code, label: code, value, weight: 0.1 } as KoraIndexComponent);
const mb = (code: string, score: number): MacroblockScore =>
  ({ code, label: code, weight: 0.2, score, component_codes: [] } as MacroblockScore);

const BAND_VALUE: Record<string, number> = { weak: 15, early: 35, developing: 52, solid: 67, leading: 85 };

describe('verdict library — full key-space coverage', () => {
  it('every band x safeguard has an authored state clause', () => {
    for (const s of SAFEGUARD_KEYS) for (const b of BAND_KEYS) {
      expect(STATE_CLAUSE[s]?.[b], `${s}/${b}`).toBeTruthy();
    }
  });

  it('every constraint type has an authored clause', () => {
    for (const c of CONSTRAINT_TYPES) expect(CONSTRAINT_CLAUSE[c], c).toBeTruthy();
  });

  it('no fragment is a placeholder', () => {
    const all = [...Object.values(STATE_CLAUSE).flatMap(Object.values), ...Object.values(CONSTRAINT_CLAUSE)];
    for (const f of all) {
      expect(f.length, f).toBeGreaterThanOrEqual(12);
      expect(f, f).not.toMatch(/TODO|TBD|xxx|lorem/i);
      expect(f.trim().endsWith('.'), f).toBe(true);
    }
  });
});

describe('verdict library — character budget (the binding layout constraint)', () => {
  it('every composed verdict fits the measured 45-character budget', () => {
    const over: string[] = [];
    for (const s of SAFEGUARD_KEYS) for (const b of BAND_KEYS) for (const c of CONSTRAINT_TYPES) {
      const text = `${STATE_CLAUSE[s][b]} ${CONSTRAINT_CLAUSE[c]}`;
      if (text.length > VERDICT_CHAR_BUDGET) over.push(`${s}/${b}/${c} (${text.length}): ${text}`);
    }
    expect(over, `over budget:\n${over.join('\n')}`).toEqual([]);
  });
});

describe('verdict library — determinism', () => {
  const inputs = {
    koraIndexValue: 33,
    safeguardStatus: 'CLEAR' as const,
    components: [comp('AR', 1.0), comp('MAR', 0.68), comp('EVQ', 0.25), comp('CONT', 0.0)],
    macroblocks: [mb('BTI', 53)],
  };

  it('the same inputs always produce the same words', () => {
    const runs = Array.from({ length: 25 }, () => resolveVerdict(inputs).text);
    expect(new Set(runs).size).toBe(1);
  });

  it('nothing in the resolver reads the clock or a random source', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/verdict/resolve.ts'), 'utf-8');
    expect(src).not.toMatch(/Math\.random|Date\.now|new Date|fetch\(|localStorage/);
  });

  it('the library is versioned and the version travels with the verdict', () => {
    expect(VERDICT_LIBRARY_VERSION).toMatch(/^v\d+\.\d+$/);
    expect(resolveVerdict(inputs).libraryVersion).toBe(VERDICT_LIBRARY_VERSION);
  });
});

describe('verdict library — constraint derivation is evidenced, never invented', () => {
  it('attributes the constraint to the weakest scored family', () => {
    expect(deriveConstraintType([comp('AR', 1.0), comp('EVQ', 0.25), comp('CONT', 0.40)])).toBe('evidence');
    expect(deriveConstraintType([comp('AR', 0.10), comp('EVQ', 0.80)])).toBe('reach');
    expect(deriveConstraintType([comp('CONT', 0.05), comp('EVQ', 0.80)])).toBe('continuity');
    expect(deriveConstraintType([comp('EQW', 0.02), comp('EVQ', 0.80)])).toBe('equity');
    expect(deriveConstraintType([comp('INT', 0.11), comp('EVQ', 0.80)])).toBe('depth');
  });

  it('attributes to budget when BTI is weaker than every component', () => {
    expect(deriveConstraintType([comp('AR', 0.9), comp('EVQ', 0.8)], [mb('BTI', 20)])).toBe('budget');
  });

  it('claims no constraint only when nothing is below its own midpoint', () => {
    expect(deriveConstraintType([comp('AR', 0.9), comp('EVQ', 0.8)], [mb('BTI', 80)])).toBe('none');
  });

  it('with no scored component and no BTI it claims nothing rather than guessing', () => {
    expect(deriveConstraintType([])).toBe('none');
  });
});

describe('verdict library — unreachable combinations', () => {
  // AR and MAR feed both the band and the safeguard, so a top band cannot hold
  // a FLAGGED safeguard. Authored anyway: an unexpected reachability must show
  // a sentence, not a blank.
  it('the implausible pairs are still authored', () => {
    expect(STATE_CLAUSE.FLAGGED.solid).toBeTruthy();
    expect(STATE_CLAUSE.FLAGGED.leading).toBeTruthy();
  });

  it('they are unreachable from real band thresholds and safeguard rules', () => {
    for (const band of ['solid', 'leading']) {
      const v = resolveVerdict({
        koraIndexValue: BAND_VALUE[band],
        safeguardStatus: 'FLAGGED',
        components: [comp('AR', 0.05), comp('MAR', 0.02)],
      });
      // If this ever renders in the Product it means an upstream invariant
      // broke; the sentence exists so the failure is visible rather than
      // silent. Asserted as a PROPERTY, not as an exact string, so editorial
      // revision of a fragment does not break an invariant test.
      expect(v.safeguard).toBe('FLAGGED');
      expect(v.text).toMatch(/soglia minima/i);
      expect(v.text.length).toBeLessThanOrEqual(45);
    }
  });
});

describe('verdict library — no unsupported claim', () => {
  it('a verdict never contains a numeral (numbers belong to the precision line)', () => {
    for (const s of SAFEGUARD_KEYS) for (const b of BAND_KEYS) for (const c of CONSTRAINT_TYPES) {
      const text = `${STATE_CLAUSE[s][b]} ${CONSTRAINT_CLAUSE[c]}`;
      expect(text, text).not.toMatch(/\d/);
    }
  });

  it('a FLAGGED safeguard always states the breach, whatever the band', () => {
    for (const b of BAND_KEYS) expect(STATE_CLAUSE.FLAGGED[b]).toMatch(/soglia minima/i);
  });
});
