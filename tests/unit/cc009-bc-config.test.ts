/**
 * CC-009 / B-BC — BC configuration ownership tests.
 *
 * Proves: (1) BC is sourced from lib/methodology-config/v0.1.ts, not a local
 * literal; (2) config values equal the pre-refactor hardcoded values exactly;
 * (3) changing the config (test-time only, via vi.doMock — production config
 * file is never touched) changes BC as expected, proving IUComputationService
 * genuinely reads through the accessor rather than caching a copy at import
 * time in a way that can't be overridden; (4) no duplicate runtime BC literal
 * authority remains; (5) I7 golden IU outputs are unaffected (covered by the
 * existing tests/unit/cc002-i7-golden-iu-cases.test.ts suite, re-run in
 * Phase 7/CI, not duplicated here).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const root = resolve(process.cwd());
function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

describe('CC-009 — BC is sourced from config, not a local literal', () => {
  it('getBCByActionFamily() exists and returns all 9 action families', async () => {
    const { getBCByActionFamily } = await import('@/lib/methodology-config/v0.1');
    const bc = getBCByActionFamily();
    expect(Object.keys(bc).sort()).toEqual([
      'blocked_compliance', 'economic_relief', 'family_and_care', 'future_and_legacy',
      'health_and_wellbeing', 'inclusion_and_connection', 'professional_growth',
      'territorial_impact', 'trust_and_flexibility_policy',
    ].sort());
  });

  it('config values equal the pre-refactor hardcoded values exactly', async () => {
    const { getBCByActionFamily } = await import('@/lib/methodology-config/v0.1');
    const bc = getBCByActionFamily();
    expect(bc).toEqual({
      family_and_care:              1.2,
      health_and_wellbeing:         1.2,
      professional_growth:          1.1,
      future_and_legacy:            1.1,
      inclusion_and_connection:     1.0,
      territorial_impact:           1.0,
      trust_and_flexibility_policy: 1.15,
      economic_relief:              0,
      blocked_compliance:           0,
    });
  });

  it('IUComputationService.ts sources BC_BY_FAMILY from getBCByActionFamily(), not a local literal table', () => {
    const content = src('services/iu-computation/IUComputationService.ts');
    expect(content).toContain('getBCByActionFamily()');
    expect(content).toMatch(/BC_BY_FAMILY[\s\S]{0,60}=\s*getBCByActionFamily\(\)/);
    // The old inline literal table must be gone.
    expect(content).not.toMatch(/family_and_care:\s*1\.2,/);
  });

  it('methodology-config.json carries bc_by_action_family as real data (not fallback-only)', () => {
    const json = src('data/methodology/methodology-config.json');
    expect(json).toContain('"bc_by_action_family"');
    expect(json).toContain('"family_and_care":              1.2');
  });
});

describe('CC-009 — changing the config changes BC (test-time injection only, production file untouched)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('@/data/methodology/methodology-config.json');
  });

  it('a test-injected config override changes getBCByActionFamily() output', async () => {
    vi.doMock('@/data/methodology/methodology-config.json', () => ({
      default: {
        version: 'test-only', calibration_status: 'pre_empirical_calibration',
        safeguard_thresholds: { CLEAR: { AR: 0.4, MAR: 0.3 }, WARNING: { AR_min: 0.2, AR_max: 0.4, MAR_min: 0.15, MAR_max: 0.3 }, FLAGGED: { AR_max: 0.2, MAR_max: 0.15 } },
        bc_by_action_family: {
          family_and_care: 9.99, // deliberately distinctive sentinel, test-only
          health_and_wellbeing: 1.2, professional_growth: 1.1, future_and_legacy: 1.1,
          inclusion_and_connection: 1.0, territorial_impact: 1.0, trust_and_flexibility_policy: 1.15,
          economic_relief: 0, blocked_compliance: 0,
        },
      },
    }));
    const { getBCByActionFamily } = await import('@/lib/methodology-config/v0.1');
    const bc = getBCByActionFamily();
    expect(bc.family_and_care).toBe(9.99);
    expect(bc.health_and_wellbeing).toBe(1.2); // untouched families still correct
  });

  it('when the config key is entirely absent, the accessor fails FAST with an explicit error — it must NOT silently substitute a duplicate hardcoded table', async () => {
    vi.doMock('@/data/methodology/methodology-config.json', () => ({
      default: {
        version: 'test-only', calibration_status: 'pre_empirical_calibration',
        safeguard_thresholds: { CLEAR: { AR: 0.4, MAR: 0.3 }, WARNING: { AR_min: 0.2, AR_max: 0.4, MAR_min: 0.15, MAR_max: 0.3 }, FLAGGED: { AR_max: 0.2, MAR_max: 0.15 } },
        // bc_by_action_family intentionally omitted
      },
    }));
    const { getBCByActionFamily } = await import('@/lib/methodology-config/v0.1');
    expect(() => getBCByActionFamily()).toThrow(/bc_by_action_family/);
  });

  it('when one known family is missing from an otherwise-present bc_by_action_family, the accessor fails FAST naming that exact family — it must NOT substitute 1.0 or any other silent default for it', async () => {
    vi.doMock('@/data/methodology/methodology-config.json', () => ({
      default: {
        version: 'test-only', calibration_status: 'pre_empirical_calibration',
        safeguard_thresholds: { CLEAR: { AR: 0.4, MAR: 0.3 }, WARNING: { AR_min: 0.2, AR_max: 0.4, MAR_min: 0.15, MAR_max: 0.3 }, FLAGGED: { AR_max: 0.2, MAR_max: 0.15 } },
        bc_by_action_family: {
          family_and_care: 1.2, health_and_wellbeing: 1.2, professional_growth: 1.1,
          future_and_legacy: 1.1, inclusion_and_connection: 1.0, territorial_impact: 1.0,
          trust_and_flexibility_policy: 1.15, economic_relief: 0,
          // blocked_compliance intentionally omitted
        },
      },
    }));
    const { getBCByActionFamily } = await import('@/lib/methodology-config/v0.1');
    expect(() => getBCByActionFamily()).toThrow(/blocked_compliance/);
  });

  it('when a known family value is malformed (non-numeric), the accessor fails FAST naming that exact family', async () => {
    vi.doMock('@/data/methodology/methodology-config.json', () => ({
      default: {
        version: 'test-only', calibration_status: 'pre_empirical_calibration',
        safeguard_thresholds: { CLEAR: { AR: 0.4, MAR: 0.3 }, WARNING: { AR_min: 0.2, AR_max: 0.4, MAR_min: 0.15, MAR_max: 0.3 }, FLAGGED: { AR_max: 0.2, MAR_max: 0.15 } },
        bc_by_action_family: {
          family_and_care: 'not-a-number', health_and_wellbeing: 1.2, professional_growth: 1.1,
          future_and_legacy: 1.1, inclusion_and_connection: 1.0, territorial_impact: 1.0,
          trust_and_flexibility_policy: 1.15, economic_relief: 0, blocked_compliance: 0,
        },
      },
    }));
    const { getBCByActionFamily } = await import('@/lib/methodology-config/v0.1');
    expect(() => getBCByActionFamily()).toThrow(/family_and_care/);
  });

  it('a fully valid, complete config still returns exactly its own values — no per-field fallback masks a config typo', async () => {
    vi.doMock('@/data/methodology/methodology-config.json', () => ({
      default: {
        version: 'test-only', calibration_status: 'pre_empirical_calibration',
        safeguard_thresholds: { CLEAR: { AR: 0.4, MAR: 0.3 }, WARNING: { AR_min: 0.2, AR_max: 0.4, MAR_min: 0.15, MAR_max: 0.3 }, FLAGGED: { AR_max: 0.2, MAR_max: 0.15 } },
        bc_by_action_family: {
          family_and_care: 1.2, health_and_wellbeing: 1.2, professional_growth: 1.1,
          future_and_legacy: 1.1, inclusion_and_connection: 1.0, territorial_impact: 1.0,
          trust_and_flexibility_policy: 1.15, economic_relief: 0, blocked_compliance: 0,
        },
      },
    }));
    const { getBCByActionFamily } = await import('@/lib/methodology-config/v0.1');
    expect(() => getBCByActionFamily()).not.toThrow();
    expect(getBCByActionFamily().family_and_care).toBe(1.2);
  });
});

describe('CC-009 — unknown/unmapped runtime family is a DIFFERENT condition from missing config, and still resolves to 1.0', () => {
  it('IUComputationService.deriveBC() still falls back to 1.0 for a runtime action_family string outside the 9 known families — this is unrelated to config validation', async () => {
    const { IUComputationService } = await import('@/services/iu-computation/IUComputationService');
    const svc = new IUComputationService();
    const result = svc.computeIUForLiveInput({
      uef_record_id: 'unknown-family-case',
      eligibility: 'eligible',
      review_required: false,
      approved_for_impact_units: true,
      action_family: 'not_a_real_action_family' as unknown as Parameters<typeof svc.computeIUForLiveInput>[0]['action_family'],
      event_nature: 'training',
      primary_pillar: 'GROWTH',
      pillar_distribution: {},
      missing_fields: [],
      evidence_type: 'L3',
      site_or_cluster: null,
    });
    expect(result.base_contribution_bc).toBe(1.0);
  });
});

describe('CC-009 — BC_RUNTIME_AUTHORITIES = 1 (single canonical authority, zero exceptions)', () => {
  const RUNTIME_DIRS = ['app', 'services', 'lib', 'components'];

  function walkTs(dir: string): string[] {
    const out: string[] = [];
    let entries: string[];
    try { entries = readdirSync(dir); } catch { return out; }
    for (const entry of entries) {
      const p = join(dir, entry);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) out.push(...walkTs(p));
      else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) out.push(p);
    }
    return out;
  }

  // All 9 family:value pairs — robust against partial reformatting/renaming:
  // a real duplicate table need only reproduce a handful of these verbatim to
  // be caught, not the full set, and legitimate incidental matches of a single
  // pair elsewhere (e.g. "1.1" appearing for an unrelated reason) can't trip
  // the threshold alone.
  const SIGNATURE_PAIRS = [
    /family_and_care['"]?\s*:\s*1\.2/,
    /health_and_wellbeing['"]?\s*:\s*1\.2/,
    /professional_growth['"]?\s*:\s*1\.1/,
    /future_and_legacy['"]?\s*:\s*1\.1/,
    /inclusion_and_connection['"]?\s*:\s*1\.0?\b/,
    /territorial_impact['"]?\s*:\s*1\.0?\b/,
    /trust_and_flexibility_policy['"]?\s*:\s*1\.15/,
    /economic_relief['"]?\s*:\s*0\b/,
    /blocked_compliance['"]?\s*:\s*0\b/,
  ];
  const DUPLICATE_THRESHOLD = 3; // 3+ of 9 verbatim pairs = a real duplicate table, not coincidence

  function countMatches(content: string): number {
    return SIGNATURE_PAIRS.filter((p) => p.test(content)).length;
  }

  it('POSITIVE CONTROL: the sweep methodology actually detects a real table (proves the test isn\'t vacuously passing)', () => {
    const json = src('data/methodology/methodology-config.json');
    expect(countMatches(json)).toBeGreaterThanOrEqual(DUPLICATE_THRESHOLD);
  });

  it('ZERO .ts/.tsx runtime files contain a duplicate BC table — not even the canonical config accessor, which now validates rather than hardcodes', () => {
    const offenders: Array<{ file: string; matches: number }> = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        const matches = countMatches(src(relative));
        if (matches >= DUPLICATE_THRESHOLD) offenders.push({ file: relative, matches });
      }
    }
    expect(offenders).toEqual([]);
  });

  it('BC_RUNTIME_AUTHORITIES = 1 — exactly one file repository-wide (the JSON config) carries the complete BC table', () => {
    const allSourceFiles: string[] = [
      'data/methodology/methodology-config.json',
      ...RUNTIME_DIRS.flatMap((dir) => walkTs(resolve(root, dir)).map((f) => f.replace(root + '/', ''))),
    ];
    const authorities = allSourceFiles.filter((f) => countMatches(src(f)) >= DUPLICATE_THRESHOLD);
    expect(authorities).toEqual(['data/methodology/methodology-config.json']);
  });
});
