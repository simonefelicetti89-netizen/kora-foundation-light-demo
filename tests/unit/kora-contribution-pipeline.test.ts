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

// ── 2. isContributionEligibleEvent — pillar alone is not sufficient (C-5) ───
// Bare pillar match was removed in C-5 hardening.
// A training event with pillar=IMPACT that is not collective must NOT be eligible.
// Pillar is used only for breakdown aggregation — not as an eligibility signal.

describe('isContributionEligibleEvent — pillar alone is not sufficient (C-5)', () => {
  it('IMPACT pillar alone (no action_family, no event_nature) → false', () => {
    expect(isContributionEligibleEvent({ pillar: 'IMPACT' })).toBe(false);
  });

  it('CONNECTION pillar alone → false', () => {
    expect(isContributionEligibleEvent({ pillar: 'CONNECTION' })).toBe(false);
  });

  it('LEGACY pillar alone → false', () => {
    expect(isContributionEligibleEvent({ pillar: 'LEGACY' })).toBe(false);
  });

  it('LIFE pillar → false (non-contribution pillar)', () => {
    expect(isContributionEligibleEvent({ pillar: 'LIFE' })).toBe(false);
  });

  it('GROWTH pillar → false (non-contribution pillar)', () => {
    expect(isContributionEligibleEvent({ pillar: 'GROWTH' })).toBe(false);
  });

  it('IMPACT pillar + collective_initiative event_nature → true (event_nature signal sufficient)', () => {
    expect(isContributionEligibleEvent({ pillar: 'IMPACT', event_nature: 'collective_initiative' })).toBe(true);
  });

  it('IMPACT pillar + territorial_impact action_family → true (action_family signal sufficient)', () => {
    expect(isContributionEligibleEvent({ pillar: 'IMPACT', action_family: 'territorial_impact' })).toBe(true);
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

  it('synthetic_demo_data is not stamped by computeFromPipelineResult (B-TRUTH port, 2026-09-01) — provenance is caller-agnostic, not assumed synthetic', () => {
    // computeFromPipelineResult had zero real callers before this port other
    // than the retired synthetic getSummaryV2(); its real caller now is the
    // DB-backed getContributionV2Live(), so it must not force this label true.
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    expect(result.synthetic_demo_data).toBeUndefined();
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

// ── 8. DB-backed pipeline input construction (B-TRUTH Contribution port, 2026-09-01) ──
// getSummaryV2() (synthetic JSON seed fallback, synthesizing ContributionPipelineInput[]
// from data/synthetic/collective-initiatives.json) was retired in favor of
// getContributionV2Live() — an async function reading real commons.contribution_event
// + commons.post rows. getContributionV2Live itself takes a live Supabase client and
// cannot be unit-tested directly; these tests exercise the same two building blocks it
// composes — buildContributionPipelineInputs() (lib/kora-contribution/
// contribution-pipeline-input.ts) feeding the SAME, unmodified computeFromPipelineResult()
// authority every other path (pipeline, live views) already uses. See also
// tests/unit/btruth-contribution-pipeline-input.test.ts for the mapper's own unit coverage.

describe('DB-backed pipeline input (buildContributionPipelineInputs) feeding computeFromPipelineResult', () => {
  const service = new KoraContributionService();

  function dbInputFromRow(overrides: {
    contribution_kind?: string;
    impact_weight?: number;
    evidence_status?: string;
    is_cross_company?: boolean;
    is_kora_originated?: boolean;
    is_kora_enabled?: boolean;
    pillar?: string | null;
  } = {}) {
    const row = {
      source_post_id:     'post-x',
      contribution_kind:  overrides.contribution_kind  ?? 'cross_company_participation',
      impact_weight:      overrides.impact_weight      ?? 0.80,
      evidence_status:    overrides.evidence_status    ?? 'verified',
      is_cross_company:   overrides.is_cross_company   ?? true,
      is_kora_originated: overrides.is_kora_originated ?? false,
      is_kora_enabled:    overrides.is_kora_enabled    ?? false,
    };
    const pillarByPostId = new Map([['post-x', overrides.pillar ?? 'IMPACT']]);
    return { row, pillarByPostId };
  }

  it('a DB row shaped like a real commons.contribution_event produces a ContributionSummary without throwing', async () => {
    const { buildContributionPipelineInputs } = await import('@/lib/kora-contribution/contribution-pipeline-input');
    const { row, pillarByPostId } = dbInputFromRow();
    const inputs = buildContributionPipelineInputs([row], pillarByPostId);
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', inputs);
    expect(result).toBeDefined();
    expect(result.notKoraIndexComponent).toBe(true);
    expect(result.dataSource).toBe('pipeline');
  });

  it('score is within 0–100', async () => {
    const { buildContributionPipelineInputs } = await import('@/lib/kora-contribution/contribution-pipeline-input');
    const { row, pillarByPostId } = dbInputFromRow();
    const inputs = buildContributionPipelineInputs([row], pillarByPostId);
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', inputs);
    expect(result.contributionScore).toBeGreaterThanOrEqual(0);
    expect(result.contributionScore).toBeLessThanOrEqual(100);
  });

  it('more eligible DB rows yield equal-or-higher score than fewer', async () => {
    const { buildContributionPipelineInputs } = await import('@/lib/kora-contribution/contribution-pipeline-input');
    const { row, pillarByPostId } = dbInputFromRow();
    const one = service.computeFromPipelineResult('meridiana-group', 'S1', buildContributionPipelineInputs([row], pillarByPostId));
    const two = service.computeFromPipelineResult('meridiana-group', 'S1', buildContributionPipelineInputs([row, { ...row, source_post_id: 'post-y' }], new Map([['post-x', 'IMPACT'], ['post-y', 'CONNECTION']])));
    expect(two.contributionScore).toBeGreaterThanOrEqual(one.contributionScore);
  });

  it('PARITY: a DB-derived input and a JSON-equivalent-scenario input, carrying the same effective signal, produce identical v2 output through the unchanged computeContributionV2/computeFromPipelineResult authority', async () => {
    const { buildContributionPipelineInputs } = await import('@/lib/kora-contribution/contribution-pipeline-input');

    // JSON-equivalent-scenario input, shaped the way the retired synthetic
    // builder used to construct it: action_family present, PLUS event_nature
    // (the old getSummaryV2 builder derived this too, via its own
    // hand-rolled switch, for a cross-company collective initiative).
    const jsonEquivalentInput: ContributionPipelineInput = makeInput({ event_nature: 'collective_initiative' });

    // DB-derived-equivalent input for the SAME underlying event: action_family
    // absent by design (see contribution-pipeline-input.ts header), relying on
    // event_nature alone for eligibility — 'verified' evidence_status maps to
    // the same 0.90 EV the JSON builder used for a verified record.
    const { row, pillarByPostId } = dbInputFromRow({
      impact_weight:   jsonEquivalentInput.impact_units_total,
      evidence_status: 'verified',
      pillar:          jsonEquivalentInput.primary_pillar,
    });
    const dbEquivalentInput = buildContributionPipelineInputs([row], pillarByPostId)[0];

    const jsonResult = service.computeFromPipelineResult('parity-co', 'S1', [jsonEquivalentInput]);
    const dbResult   = service.computeFromPipelineResult('parity-co', 'S1', [dbEquivalentInput]);

    // Same methodology authority, same effective signal → identical v2 output.
    expect(dbResult.v2).toEqual(jsonResult.v2);
    expect(dbResult.contributionScore).toEqual(jsonResult.contributionScore);
    expect(dbResult.totalContributionIU).toEqual(jsonResult.totalContributionIU);
  });
});

// ── 9. Company view — aggregate only, no individual worker data ──────────────

describe('Company view — aggregate only', () => {
  const service = new KoraContributionService();

  it('ContributionSummary has no worker-level fields', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    // No worker IDs, no per-worker IU, no individual names
    expect((result as unknown as Record<string, unknown>)['worker_id']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['worker_pib']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['worker_iu_list']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['worker_name']).toBeUndefined();
  });

  it('evidenceDistribution is aggregate counts, not per-worker', () => {
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
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

// ── 10. Pre-pilot preview data provenance (B-TRUTH port, 2026-09-01) ─────────
// getSummaryV2's retired synthetic seed path always stamped synthetic_demo_data:
// true. The DB-backed replacement (getContributionV2Live) reads real
// commons.contribution_event rows, so computeFromPipelineResult correctly never
// sets this flag — asserting its absence, not weakening the field's meaning.

describe('Pre-pilot preview data provenance', () => {
  it('computeFromPipelineResult does not stamp synthetic_demo_data — Contribution preview is DB-backed real data, not synthetic', () => {
    const service = new KoraContributionService();
    const result = service.computeFromPipelineResult('meridiana-group', 'S1', [makeInput()]);
    expect(result.synthetic_demo_data).toBeUndefined();
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

  it('buildContributionPipelineInputs + computeFromPipelineResult returns consistently for the same DB rows', async () => {
    const { buildContributionPipelineInputs } = await import('@/lib/kora-contribution/contribution-pipeline-input');
    const rows = [{
      source_post_id: 'post-consist',
      contribution_kind: 'cross_company_participation',
      impact_weight: 0.80,
      evidence_status: 'verified',
      is_cross_company: true,
      is_kora_originated: false,
      is_kora_enabled: false,
    }];
    const pillarByPostId = new Map([['post-consist', 'IMPACT']]);
    const a = service.computeFromPipelineResult('meridiana-group', 'S1', buildContributionPipelineInputs(rows, pillarByPostId));
    const b = service.computeFromPipelineResult('meridiana-group', 'S1', buildContributionPipelineInputs(rows, pillarByPostId));
    expect(a.contributionScore).toEqual(b.contributionScore);
    expect(a.totalContributionIU).toEqual(b.totalContributionIU);
  });
});
