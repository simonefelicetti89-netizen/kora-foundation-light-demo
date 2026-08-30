/**
 * CC-009 / B-BC — BC (Base Contribution) characterization, PRE-refactor baseline.
 *
 * Freezes the CURRENT BC contract of services/iu-computation/IUComputationService.ts
 * (the sole live BC authority — services/worker-iu-computation/WorkerIUComputationService.ts
 * consumes an already-computed BC from the UEF record, it does not compute its own)
 * before CC-009 moves the BC_BY_FAMILY literal into lib/methodology-config/v0.1.ts.
 *
 * Every expected value below was read directly off the CURRENT, unmodified
 * BC_BY_FAMILY table (services/iu-computation/IUComputationService.ts:16-29)
 * before any refactor — not derived from the post-refactor config. This
 * complements, and does not replace, tests/unit/cc002-i7-golden-iu-cases.test.ts
 * (the I7 golden suite), which already covers 7 of the 9 action families as
 * part of full IU golden cases. This file adds the 2 families I7 does not
 * explicitly assert (`economic_relief`, `blocked_compliance` — both AGF=0
 * regardless of BC, so I7's own AGF=0 cases use a different action_family and
 * never exercise these two BC values directly) and the unmapped-family
 * fallback, which no existing test covers.
 */

import { describe, it, expect } from 'vitest';
import { IUComputationService, type IULiveInput } from '@/services/iu-computation/IUComputationService';

const svc = new IUComputationService();

function makeInput(overrides: Partial<IULiveInput> = {}): IULiveInput {
  return {
    uef_record_id: 'cc009-bc-case',
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

// Pre-refactor BC_BY_FAMILY table, read directly off
// services/iu-computation/IUComputationService.ts:16-29 before any change.
const PRE_REFACTOR_BC_BY_FAMILY: Record<string, number> = {
  family_and_care:              1.2,
  health_and_wellbeing:         1.2,
  professional_growth:          1.1,
  future_and_legacy:            1.1,
  inclusion_and_connection:     1.0,
  territorial_impact:           1.0,
  trust_and_flexibility_policy: 1.15,
  economic_relief:              0,
  blocked_compliance:           0,
};

describe('CC-009 characterization — BC per action family, all 9 families, PRE-refactor baseline', () => {
  for (const [family, expectedBC] of Object.entries(PRE_REFACTOR_BC_BY_FAMILY)) {
    it(`"${family}" -> BC = ${expectedBC}`, () => {
      const result = svc.computeIUForLiveInput(makeInput({
        action_family: family as IULiveInput['action_family'],
        eligibility: expectedBC === 0 ? 'blocked' : 'eligible', // economic_relief/blocked_compliance are AGF=0 families in real data, but BC itself is read regardless of eligibility
        approved_for_impact_units: expectedBC === 0 ? false : true,
      }));
      expect(result.base_contribution_bc).toBe(expectedBC);
    });
  }
});

describe('CC-009 characterization — BC fallback for an unmapped action family', () => {
  it('an action_family not present in the table falls back to 1.0 (neutral)', () => {
    // Defensive case: ActionFamily is an exhaustive union in normal TS usage,
    // but deriveBC()'s `?? 1.0` fallback exists for exactly this scenario —
    // e.g. a live UEF record with a taxonomy value outside the known set.
    const result = svc.computeIUForLiveInput(makeInput({
      action_family: 'not_a_real_action_family' as unknown as IULiveInput['action_family'],
    }));
    expect(result.base_contribution_bc).toBe(1.0);
  });
});

describe('CC-009 characterization — BC value is stable/deterministic across repeated calls', () => {
  it('same input computed twice yields byte-identical BC', () => {
    const input = makeInput({ action_family: 'family_and_care', primary_pillar: 'LIFE' });
    const a = svc.computeIUForLiveInput(input);
    const b = svc.computeIUForLiveInput(input);
    expect(a.base_contribution_bc).toBe(b.base_contribution_bc);
    expect(a.base_contribution_bc).toBe(1.2);
  });
});
