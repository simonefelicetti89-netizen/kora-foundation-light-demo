// tests/unit/cc002-i7-golden-iu-cases.test.ts
// CC-002 / B-INV — Constitutional Invariant I7: Golden Cases IU.
//
// This suite freezes the CURRENT canonical IU formula and Foundation Light v0.1
// factor values (services/iu-computation/IUComputationService.ts +
// lib/methodology-config/v0.1.ts) as an explicit, cent-precision regression
// contract. It exists to protect every future refactor (B-BC, B-CONF, B-TRUTH,
// B-WORKER, N1+) from silently changing IU output.
//
// FORMULA UNDER TEST (Master Plan v2.0 §10 — active formula, [VERIFIED]):
//   IU = NM × BC × CQ × EV × CF × AGF   (rounded to 4 decimals; AGF=0 ⇒ IU=0 exactly)
//   DF, EXF, SF are defined but NOT active in Foundation Light v0.1 — every case
//   below asserts the formula trace has exactly 6 factors (NM/BC/CQ/EV/CF/AGF)
//   with no DF/EXF/SF entry, guarding against accidental double-counting of the
//   historical "Context Fit" concept (folded into future SF) against the
//   current CF (Continuity Factor) or a not-yet-active SF.
//
// RULE (Master Plan §34 Failure/Rollback): "Un golden case IU che cambia dove
// non doveva è un difetto per definizione." If any expected value below needs
// to change, that is either a bug or an explicitly approved methodology change
// — never a silent update to make the suite pass.
//
// Every `expectedIU` was derived by executing the real, current
// IUComputationService.computeIUForLiveInput() once per case and freezing the
// output — not hand-derived, not invented. See CC-002 report for the
// verification method.

import { describe, it, expect } from 'vitest';
import { IUComputationService, type IULiveInput } from '@/services/iu-computation/IUComputationService';
import type { ImpactUnitComputationResult } from '@/lib/types';

const svc = new IUComputationService();

function makeInput(overrides: Partial<IULiveInput> = {}): IULiveInput {
  return {
    uef_record_id: 'golden-case',
    eligibility: 'eligible',
    review_required: false,
    approved_for_impact_units: true,
    action_family: 'professional_growth',
    event_nature: 'training',
    primary_pillar: 'GROWTH',
    pillar_distribution: {},
    missing_fields: [],
    evidence_type: 'L3',
    site_or_cluster: null,
    ...overrides,
  };
}

interface GoldenCase {
  id: string;
  description: string;
  input: IULiveInput;
  expected: {
    nm: number;
    bc: number;
    cq: number;
    ev: number;
    cf: number;
    agf: number;
    iu: number;
  };
}

// ── Golden case table — 28 cases, frozen from current canonical behavior ────────
// NM | BC | CQ | EV | CF | AGF | Expected IU  (all to 4-decimal precision)
const GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'C01_nominal',
    description: 'Nominal case — no missing fields, mid-tier evidence, no site/cluster, no NM inputs (all neutral defaults)',
    input: makeInput(),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 0.99 },
  },
  {
    id: 'C02_cq1_missing',
    description: 'CQ penalty — 1 missing field',
    input: makeInput({ missing_fields: ['budget_reference'] }),
    expected: { nm: 1, bc: 1.1, cq: 0.85, ev: 0.9, cf: 1, agf: 1, iu: 0.8415 },
  },
  {
    id: 'C03_cq2_missing',
    description: 'CQ penalty — 2 missing fields',
    input: makeInput({ missing_fields: ['budget_reference', 'attendee_count'] }),
    expected: { nm: 1, bc: 1.1, cq: 0.7, ev: 0.9, cf: 1, agf: 1, iu: 0.693 },
  },
  {
    id: 'C04_cq3_missing',
    description: 'CQ penalty — 3+ missing fields (max penalty tier)',
    input: makeInput({ missing_fields: ['budget_reference', 'attendee_count', 'evidence_doc'] }),
    expected: { nm: 1, bc: 1.1, cq: 0.5, ev: 0.9, cf: 1, agf: 1, iu: 0.495 },
  },
  {
    id: 'C05_ev_L0',
    description: 'EV — L0_NO_EVIDENCE (lowest verification tier)',
    input: makeInput({ evidence_type: 'L0' }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.25, cf: 1, agf: 1, iu: 0.275 },
  },
  {
    id: 'C06_ev_L1',
    description: 'EV — L1_SELF_DECLARED',
    input: makeInput({ evidence_type: 'L1' }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.6, cf: 1, agf: 1, iu: 0.66 },
  },
  {
    id: 'C07_ev_L2',
    description: 'EV — L2_INTERNAL_DOCUMENT',
    input: makeInput({ evidence_type: 'L2' }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.75, cf: 1, agf: 1, iu: 0.825 },
  },
  {
    id: 'C08_ev_L4',
    description: 'EV — L4_VERIFIED_EVIDENCE (full weight)',
    input: makeInput({ evidence_type: 'L4' }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 1, cf: 1, agf: 1, iu: 1.1 },
  },
  {
    id: 'C09_ev_unmapped_fallback',
    description: 'EV fallback — unmapped evidence type must resolve to the documented 0.5 conservative fallback [VERIFIED, Master Plan §10]',
    input: makeInput({ evidence_type: 'totally_unmapped_type_xyz' }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.5, cf: 1, agf: 1, iu: 0.55 },
  },
  {
    id: 'C10_cf_site_present',
    description: 'CF — site_or_cluster present triggers the 1.1 continuity proxy (foundation_light_stub)',
    input: makeInput({ site_or_cluster: 'Sede Milano' }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.9, cf: 1.1, agf: 1, iu: 1.089 },
  },
  {
    id: 'C11_bc_family_and_care',
    description: 'BC — family_and_care action family (1.2)',
    input: makeInput({ action_family: 'family_and_care', primary_pillar: 'LIFE' }),
    expected: { nm: 1, bc: 1.2, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 1.08 },
  },
  {
    id: 'C12_bc_health_and_wellbeing',
    description: 'BC — health_and_wellbeing action family (1.2)',
    input: makeInput({ action_family: 'health_and_wellbeing', primary_pillar: 'LIFE' }),
    expected: { nm: 1, bc: 1.2, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 1.08 },
  },
  {
    id: 'C13_bc_inclusion_and_connection',
    description: 'BC — inclusion_and_connection action family (1.0, neutral)',
    input: makeInput({ action_family: 'inclusion_and_connection', primary_pillar: 'CONNECTION' }),
    expected: { nm: 1, bc: 1, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 0.9 },
  },
  {
    id: 'C14_bc_territorial_impact',
    description: 'BC — territorial_impact action family (1.0, neutral)',
    input: makeInput({ action_family: 'territorial_impact', primary_pillar: 'IMPACT' }),
    expected: { nm: 1, bc: 1, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 0.9 },
  },
  {
    id: 'C15_bc_future_and_legacy',
    description: 'BC — future_and_legacy action family (1.1). Also the DF-double-count guard case (see suite header).',
    input: makeInput({ action_family: 'future_and_legacy', primary_pillar: 'LEGACY' }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 0.99 },
  },
  {
    id: 'C16_bc_trust_and_flexibility_policy',
    description: 'BC — trust_and_flexibility_policy action family (1.15)',
    input: makeInput({ action_family: 'trust_and_flexibility_policy', primary_pillar: 'CONNECTION' }),
    expected: { nm: 1, bc: 1.15, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 1.035 },
  },
  {
    id: 'C17_nm_duration_only',
    description: 'NM — effort() from duration_hours=1 (60 min): 0.40 + 1.10×(60/150) = 0.84; recency/saturation default neutral',
    input: makeInput({ duration_hours: 1 }),
    expected: { nm: 0.84, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 0.8316 },
  },
  {
    id: 'C18_nm_event_date_recent',
    description: 'NM — recency() at Δt=5 days before reference_date 2026-06-30: exp(-0.023×5) ≈ 0.891366',
    input: makeInput({ event_date: '2026-06-25' }),
    expected: { nm: 0.8914, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 0.8825 },
  },
  {
    id: 'C19_nm_event_date_old_floor',
    description: 'NM boundary — event far in the past hits the recency floor exactly (0.60)',
    input: makeInput({ event_date: '2020-01-01' }),
    expected: { nm: 0.6, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 0.594 },
  },
  {
    id: 'C20_nm_repetition_saturation_floor_default',
    description: 'NM boundary — repetition_count=10 hits the default (non-therapeutic) saturation floor exactly (0.60)',
    input: makeInput({ b6_repetition_count: 10 }),
    expected: { nm: 0.6, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 0.594 },
  },
  {
    id: 'C21_nm_repetition_therapeutic_floor',
    description: 'NM — health_and_wellbeing (is_therapeutic) uses the higher 0.80 saturation floor instead of 0.60, at repetition_count=50',
    input: makeInput({ action_family: 'health_and_wellbeing', primary_pillar: 'LIFE', b6_repetition_count: 50, is_recurring: true }),
    expected: { nm: 0.8, bc: 1.2, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 0.864 },
  },
  {
    id: 'C22_nm_near_structural_ceiling',
    description:
      'NM — long duration (10h) + Δt=0 (same-day as reference) + first occurrence (no saturation penalty) pushes NM to its highest observed value in this suite. ' +
      'NOTE: the Math.min(1.50, ...) cap in deriveNM() is structurally unreachable under realistic inputs — effort() alone approaches but never reaches 1.50 ' +
      'asymptotically as duration→∞, and recency/saturation only ever multiply it down (≤1.0 each). Flagged as a remaining-risk observation, not fixed here (out of I7 scope).',
    input: makeInput({ duration_hours: 10, event_date: '2026-06-30', b6_repetition_count: 0 }),
    expected: { nm: 1.3565, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 1.343 },
  },
  {
    id: 'C23_agf_blocked',
    description: 'AGF=0 — Blocked by Design eligibility ⇒ IU=0 exactly (not merely near-zero)',
    input: makeInput({ eligibility: 'blocked', approved_for_impact_units: false, review_required: false }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 0, iu: 0 },
  },
  {
    id: 'C24_agf_limited',
    description: 'AGF=0 — Economic Relief (limited) eligibility ⇒ IU=0 exactly',
    input: makeInput({ eligibility: 'limited', approved_for_impact_units: false }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 0, iu: 0 },
  },
  {
    id: 'C25_agf_review_required',
    description: 'AGF=0 — Human Review Required ⇒ IU=0 exactly, suspended pending resolution',
    input: makeInput({ review_required: true }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 0, iu: 0 },
  },
  {
    id: 'C26_agf_not_approved',
    description: 'AGF=0 — approved_for_impact_units=false governance flag ⇒ IU=0 exactly',
    input: makeInput({ approved_for_impact_units: false }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 0, iu: 0 },
  },
  {
    id: 'C27_no_df_double_count_legacy_family',
    description:
      'DF/EXF/SF double-count guard — action_family=future_and_legacy is exactly the family Durability Factor (DF) would apply to once activated. ' +
      'The current formula must NOT apply any 7th factor for this family: IU = NM×BC×CQ×EV×CF×AGF only, trace has exactly 6 factors.',
    input: makeInput({ action_family: 'future_and_legacy', primary_pillar: 'LEGACY' }),
    expected: { nm: 1, bc: 1.1, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 0.99 },
  },
  {
    id: 'C28_no_exf_double_count_impact_family',
    description:
      'DF/EXF/SF double-count guard — action_family=territorial_impact is exactly the family Externality Factor (EXF) would apply to once activated. ' +
      'The current formula must NOT apply any 7th factor for this family: IU = NM×BC×CQ×EV×CF×AGF only, trace has exactly 6 factors.',
    input: makeInput({ action_family: 'territorial_impact', primary_pillar: 'IMPACT' }),
    expected: { nm: 1, bc: 1, cq: 1, ev: 0.9, cf: 1, agf: 1, iu: 0.9 },
  },
];

describe('I7 — Golden Cases IU (constitutional invariant, B-INV / CC-002)', () => {
  it(`defines at least 20 golden cases (has ${GOLDEN_CASES.length})`, () => {
    expect(GOLDEN_CASES.length).toBeGreaterThanOrEqual(20);
  });

  it('has no duplicate case ids', () => {
    const ids = GOLDEN_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const gc of GOLDEN_CASES) {
    it(`${gc.id}: ${gc.description}`, () => {
      const result: ImpactUnitComputationResult = svc.computeIUForLiveInput(gc.input);

      // Individual factor values — precise, not just the final IU.
      expect(result.normalized_magnitude_nm).toBeCloseTo(gc.expected.nm, 4);
      expect(result.base_contribution_bc).toBeCloseTo(gc.expected.bc, 4);
      expect(result.completeness_quality_cq).toBeCloseTo(gc.expected.cq, 4);
      expect(result.evidence_verification_ev).toBeCloseTo(gc.expected.ev, 4);
      expect(result.continuity_factor_cf).toBeCloseTo(gc.expected.cf, 4);
      expect(result.anti_gaming_factor_agf).toBeCloseTo(gc.expected.agf, 4);

      // Final IU — cent precision minimum (I7 requirement), asserted at
      // 4-decimal precision (stricter than required, matches the service's
      // own .toFixed(4) rounding exactly).
      expect(result.impact_units_total).toBeCloseTo(gc.expected.iu, 4);

      if (gc.expected.agf === 0) {
        // AGF=0 must produce IU=0 exactly, not merely "close to zero".
        expect(result.impact_units_total).toBe(0);
      }

      // Structural double-count guard: exactly NM/BC/CQ/EV/CF/AGF, never a
      // 7th (DF/EXF/SF) factor in the active formula.
      expect(result.formula_trace).toHaveLength(6);
      const codes = result.formula_trace.map((t) => t.factor_code);
      expect(codes).toEqual(['NM', 'BC', 'CQ', 'EV', 'CF', 'AGF']);
      expect(codes).not.toContain('DF');
      expect(codes).not.toContain('EXF');
      expect(codes).not.toContain('SF');
    });
  }

  // ── Adversarial check (I7 acceptance criteria) ────────────────────────────────
  // A golden expected value altered by 0.01 must fail. This is not a change to
  // the suite — it's a live demonstration that the precision assertions above
  // are actually strict enough to catch a one-cent drift, run against the same
  // real service call.
  it('ADVERSARIAL — a 0.01 deviation from the true value must fail toBeCloseTo(_, 2)', () => {
    const result = svc.computeIUForLiveInput(GOLDEN_CASES[0].input);
    const trueIU = result.impact_units_total; // 0.99
    const deliberatelyWrong = trueIU + 0.01;
    expect(() => expect(result.impact_units_total).toBeCloseTo(deliberatelyWrong, 2)).toThrow();
  });
});
