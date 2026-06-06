// tests/unit/kora-contribution-pipeline.test.ts
// B72-B: KORA Contribution™ Pipeline Integration tests.
// Validates: contribution-family detection, pipeline-computed summary, privacy invariants,
// KORA Index independence, seed fallback preservation.

import { describe, it, expect } from 'vitest';
import {
  isContributionEligibleEvent,
  CONTRIBUTION_ACTION_FAMILIES,
  CONTRIBUTION_PILLARS,
} from '@/lib/kora-engine/contribution-family-detector';
import {
  KoraContributionService,
  type ContributionPipelineInput,
} from '@/services/kora-contribution/KoraContributionService';

// ── Helper: build a minimal ContributionPipelineInput ───────────────────────

function makeInput(
  overrides: Partial<ContributionPipelineInput> = {},
): ContributionPipelineInput {
  return {
    action_family:            'territorial_impact',
    primary_pillar:           'IMPACT',
    impact_units_total:       0.80,
    evidence_verification_ev: 0.90,
    computed:                 true,
    ...overrides,
  };
}

// ── 1. isContributionEligibleEvent — action_family detection ─────────────────

describe('isContributionEligibleEvent — action_family', () => {
  it('territorial_impact → true', () => {
    expect(isContributionEligibleEvent({ action_family: 'territorial_impact' })).toBe(true);
  });

  it('inclusion_and_connection → true', () => {
    expect(isContributionEligibleEvent({ action_family: 'inclusion_and_connection' })).toBe(true);
  });

  it('future_and_legacy → true', () => {
    expect(isContributionEligibleEvent({ action_family: 'future_and_legacy' })).toBe(true);
  });

  it('economic_relief → false', () => {
    expect(isContributionEligibleEvent({ action_family: 'economic_relief' })).toBe(false);
  });

  it('professional_growth → false', () => {
    expect(isContributionEligibleEvent({ action_family: 'professional_growth' })).toBe(false);
  });

  it('health_and_wellbeing → false', () => {
    expect(isContributionEligibleEvent({ action_family: 'health_and_wellbeing' })).toBe(false);
  });

  it('blocked_compliance → false', () => {
    expect(isContributionEligibleEvent({ action_family: 'blocked_compliance' })).toBe(false);
  });

  it('family_and_care → false', () => {
    expect(isContributionEligibleEvent({ action_family: 'family_and_care' })).toBe(false);
  });
});

// ── 2. isContributionEligibleEvent — pillar detection ───────────────────────

describe('isContributionEligibleEvent — pillar', () => {
  it('IMPACT pillar → true', () => {
    expect(isContributionEligibleEvent({ pillar: 'IMPACT' })).toBe(true);
  });

  it('CONNECTION pillar → true', () => {
    expect(isContributionEligibleEvent({ pillar: 'CONNECTION' })).toBe(true);
  });

  it('LEGACY pillar → true', () => {
    expect(isContributionEligibleEvent({ pillar: 'LEGACY' })).toBe(true);
  });

  it('LIFE pillar → false', () => {
    expect(isContributionEligibleEvent({ pillar: 'LIFE' })).toBe(false);
  });

  it('GROWTH pillar → false', () => {
    expect(isContributionEligibleEvent({ pillar: 'GROWTH' })).toBe(false);
  });
});

// ── 3. isContributionEligibleEvent — event_nature detection ─────────────────

describe('isContributionEligibleEvent — event_nature', () => {
  it('collective_initiative → true', () => {
    expect(isContributionEligibleEvent({ event_nature: 'collective_initiative' })).toBe(true);
  });

  it('territorial_initiative → true', () => {
    expect(isContributionEligibleEvent({ event_nature: 'territorial_initiative' })).toBe(true);
  });

  it('partner_service → true', () => {
    expect(isContributionEligibleEvent({ event_nature: 'partner_service' })).toBe(true);
  });

  it('training → false', () => {
    expect(isContributionEligibleEvent({ event_nature: 'training' })).toBe(false);
  });

  it('monetary_benefit → false', () => {
    expect(isContributionEligibleEvent({ event_nature: 'monetary_benefit' })).toBe(false);
  });

  it('policy → false', () => {
    expect(isContributionEligibleEvent({ event_nature: 'policy' })).toBe(false);
  });
});

// ── 4. CONTRIBUTION_ACTION_FAMILIES and CONTRIBUTION_PILLARS constants ───────

describe('Contribution constants', () => {
  it('CONTRIBUTION_ACTION_FAMILIES has exactly 3 entries', () => {
    expect(CONTRIBUTION_ACTION_FAMILIES).toHaveLength(3);
    expect(CONTRIBUTION_ACTION_FAMILIES).toContain('territorial_impact');
    expect(CONTRIBUTION_ACTION_FAMILIES).toContain('inclusion_and_connection');
    expect(CONTRIBUTION_ACTION_FAMILIES).toContain('future_and_legacy');
  });

  it('CONTRIBUTION_PILLARS has exactly 3 entries', () => {
    expect(CONTRIBUTION_PILLARS).toHaveLength(3);
    expect(CONTRIBUTION_PILLARS).toContain('IMPACT');
    expect(CONTRIBUTION_PILLARS).toContain('CONNECTION');
    expect(CONTRIBUTION_PILLARS).toContain('LEGACY');
  });
});

// ── 5. computeFromPipelineResult — architecture invariants ───────────────────

describe('computeFromPipelineResult — architecture invariants', () => {
  const service = new KoraContributionService();

  it('notKoraIndexComponent is always true', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    expect(result.notKoraIndexComponent).toBe(true);
  });

  it('noRanking is always true', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    expect(result.noRanking).toBe(true);
  });

  it('noRewards is always true', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    expect(result.noRewards).toBe(true);
  });

  it('noLeaderboard is always true', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    expect(result.noLeaderboard).toBe(true);
  });

  it('methodologyStatus is pre_empirical_calibration', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    expect(result.methodologyStatus).toBe('pre_empirical_calibration');
  });

  it('synthetic_demo_data is true', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    expect(result.synthetic_demo_data).toBe(true);
  });

  it('dataSource is pipeline', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    expect(result.dataSource).toBe('pipeline');
  });
});

// ── 6. computeFromPipelineResult — score and level range ────────────────────

describe('computeFromPipelineResult — score computation', () => {
  const service = new KoraContributionService();

  it('empty input → score 0, level minimal', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', []);
    expect(result.contributionScore).toBe(0);
    expect(result.contributionLevel).toBe('minimal');
    expect(result.totalContributionIU).toBe(0);
    expect(result.initiativesCount).toBe(0);
  });

  it('score is within 0–100', () => {
    const inputs = [
      makeInput({ action_family: 'territorial_impact',    primary_pillar: 'IMPACT' }),
      makeInput({ action_family: 'inclusion_and_connection', primary_pillar: 'CONNECTION' }),
      makeInput({ action_family: 'future_and_legacy',     primary_pillar: 'LEGACY' }),
    ];
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', inputs);
    expect(result.contributionScore).toBeGreaterThanOrEqual(0);
    expect(result.contributionScore).toBeLessThanOrEqual(100);
  });

  it('territorial_impact input → territorial family detected', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [
      makeInput({ action_family: 'territorial_impact', primary_pillar: 'IMPACT' }),
    ]);
    expect(result.contributionFamilies).toContain('territorial_impact');
  });

  it('non-contribution input (economic_relief) → excluded from score', () => {
    const nonContrib = makeInput({
      action_family:  'economic_relief',
      primary_pillar: 'LIFE',
    });
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [nonContrib]);
    expect(result.initiativesCount).toBe(0);
    expect(result.totalContributionIU).toBe(0);
  });

  it('blocked event (computed=false) → excluded from score', () => {
    const blocked = makeInput({ computed: false, impact_units_total: 0 });
    const result  = service.computeFromPipelineResult('meridiana-group', 'S1', [blocked]);
    expect(result.initiativesCount).toBe(0);
    expect(result.totalContributionIU).toBe(0);
  });

  it('high verified evidence → evidenceDistribution.verified increases', () => {
    const inputs = [
      makeInput({ evidence_verification_ev: 0.90 }),  // verified
      makeInput({ evidence_verification_ev: 0.90 }),  // verified
      makeInput({ evidence_verification_ev: 0.60 }),  // self_declared
    ];
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', inputs);
    expect(result.evidenceDistribution.verified).toBe(2);
    expect(result.evidenceDistribution.self_declared).toBe(1);
  });

  it('totalContributionIU sums computed contribution records', () => {
    const inputs = [
      makeInput({ impact_units_total: 0.50 }),
      makeInput({ action_family: 'inclusion_and_connection', primary_pillar: 'CONNECTION', impact_units_total: 0.30 }),
    ];
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', inputs);
    expect(result.totalContributionIU).toBeCloseTo(0.80, 2);
  });

  it('pillarBreakdown reflects contribution pillar distribution', () => {
    const inputs = [
      makeInput({ primary_pillar: 'IMPACT', impact_units_total: 0.80 }),
      makeInput({ action_family: 'future_and_legacy', primary_pillar: 'LEGACY', impact_units_total: 0.60 }),
    ];
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', inputs);
    expect((result.pillarBreakdown['IMPACT'] ?? 0)).toBeCloseTo(0.80, 2);
    expect((result.pillarBreakdown['LEGACY'] ?? 0)).toBeCloseTo(0.60, 2);
  });
});

// ── 7. KORA Index independence ────────────────────────────────────────────────
// Contribution score does NOT alter KORA Index. These are separate computations.

describe('KORA Index independence', () => {
  const service = new KoraContributionService();

  it('Contribution summary has no koraIndex field', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    expect((result as unknown as Record<string, unknown>)['koraIndex']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['kora_index_value']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['macroblocks']).toBeUndefined();
  });

  it('changing contribution inputs does not affect koraIndex computation (no shared state)', () => {
    // computeFromPipelineResult is a pure function — no side effects on external state
    const resultA = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    const resultB = service.computeFromPipelineResult('meridiana-group', 'S1', []);
    // Both results have notKoraIndexComponent: true — Contribution never enters Index
    expect(resultA.notKoraIndexComponent).toBe(true);
    expect(resultB.notKoraIndexComponent).toBe(true);
    // Results differ in score — but neither touches KORA Index
    expect(resultA.contributionScore).not.toEqual(resultB.contributionScore);
  });
});

// ── 8. Seed fallback — getSummaryV2 ─────────────────────────────────────────

describe('getSummaryV2 — seed fallback preserved', () => {
  const service = new KoraContributionService();

  it('returns a ContributionSummary without throwing', () => {
    const result = service.getSummaryV2('meridiana-group', 'S1');
    expect(result).toBeDefined();
    expect(result.notKoraIndexComponent).toBe(true);
    expect(result.dataSource).toBe('seed_derived');
  });

  it('returns notKoraIndexComponent: true', () => {
    expect(service.getSummaryV2('meridiana-group', 'S1').notKoraIndexComponent).toBe(true);
    expect(service.getSummaryV2('meridiana-group', 'S2').notKoraIndexComponent).toBe(true);
  });

  it('score is within 0–100', () => {
    const s1 = service.getSummaryV2('meridiana-group', 'S1');
    const s2 = service.getSummaryV2('meridiana-group', 'S2');
    expect(s1.contributionScore).toBeGreaterThanOrEqual(0);
    expect(s1.contributionScore).toBeLessThanOrEqual(100);
    expect(s2.contributionScore).toBeGreaterThanOrEqual(0);
    expect(s2.contributionScore).toBeLessThanOrEqual(100);
  });

  it('S2 has equal or higher score than S1 (more scenarios active)', () => {
    const s1 = service.getSummaryV2('meridiana-group', 'S1');
    const s2 = service.getSummaryV2('meridiana-group', 'S2');
    expect(s2.contributionScore).toBeGreaterThanOrEqual(s1.contributionScore);
  });

  it('legacy getContributionSummary still works (backwards compat)', () => {
    const legacy = service.getContributionSummary('meridiana-group', 'S1');
    expect(legacy).not.toBeNull();
    expect(legacy?.is_kora_index_component).toBe(false);
    expect(legacy?.contribution_score).toBeGreaterThanOrEqual(0);
  });

  it('legacy getContributionScore still works', () => {
    const score = service.getContributionScore('meridiana-group', 'S1');
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ── 9. Company view — aggregate only, no individual worker data ──────────────

describe('Company view — aggregate only', () => {
  const service = new KoraContributionService();

  it('ContributionSummary has no worker-level fields', () => {
    const result = service.getSummaryV2('meridiana-group', 'S1');
    // No worker IDs, no per-worker IU, no individual names
    expect((result as unknown as Record<string, unknown>)['worker_id']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['worker_pib']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['worker_iu_list']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['worker_name']).toBeUndefined();
  });

  it('evidenceDistribution is aggregate counts, not per-worker', () => {
    const result = service.getSummaryV2('meridiana-group', 'S1');
    const dist   = result.evidenceDistribution;
    expect(typeof dist.verified).toBe('number');
    expect(typeof dist.partial).toBe('number');
    expect(typeof dist.self_declared).toBe('number');
    // All counts are non-negative
    expect(dist.verified).toBeGreaterThanOrEqual(0);
    expect(dist.partial).toBeGreaterThanOrEqual(0);
    expect(dist.self_declared).toBeGreaterThanOrEqual(0);
  });
});

// ── 10. Worker collective preview — synthetic only ───────────────────────────

describe('Worker collective preview — synthetic only', () => {
  it('getSummaryV2 synthetic_demo_data is always true', () => {
    const service = new KoraContributionService();
    expect(service.getSummaryV2('meridiana-group', 'S1').synthetic_demo_data).toBe(true);
    expect(service.getSummaryV2('meridiana-group', 'S2').synthetic_demo_data).toBe(true);
  });
});

// ── 11. No DB / auth / schema changes asserted ──────────────────────────────
// These tests verify the service stays within in-memory / seed-file boundaries.

describe('Service boundaries', () => {
  const service = new KoraContributionService();

  it('computeFromPipelineResult is a pure function (no side effects)', () => {
    const inputA = [makeInput({ impact_units_total: 0.50 })];
    const inputB = [makeInput({ impact_units_total: 0.80 })];
    const r1     = service.computeFromPipelineResult('meridiana-group', 'S1', inputA);
    const r2     = service.computeFromPipelineResult('meridiana-group', 'S1', inputB);
    // Different inputs produce different IU totals
    expect(r1.totalContributionIU).not.toEqual(r2.totalContributionIU);
    // No mutation of shared state — calling again returns same result
    const r1b = service.computeFromPipelineResult('meridiana-group', 'S1', inputA);
    expect(r1b.totalContributionIU).toEqual(r1.totalContributionIU);
  });

  it('getSummaryV2 returns consistently for same inputs', () => {
    const a = service.getSummaryV2('meridiana-group', 'S1');
    const b = service.getSummaryV2('meridiana-group', 'S1');
    expect(a.contributionScore).toEqual(b.contributionScore);
    expect(a.totalContributionIU).toEqual(b.totalContributionIU);
  });
});
