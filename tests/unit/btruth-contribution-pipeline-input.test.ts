// tests/unit/btruth-contribution-pipeline-input.test.ts
// B-TRUTH Contribution protected port (2026-09-01) — pure-function coverage
// for lib/kora-contribution/contribution-pipeline-input.ts, which replaced
// the synthetic-JSON-derived ContributionPipelineInput[] builder previously
// inline in KoraContributionService.getSummaryV2() (retired).

import { describe, it, expect } from 'vitest';
import {
  EVIDENCE_STATUS_TO_EV,
  deriveEventNature,
  deriveActionFamily,
  buildContributionPipelineInputs,
  type ContributionEventRow,
} from '../../lib/kora-contribution/contribution-pipeline-input';

const BASE_ROW: ContributionEventRow = {
  source_post_id:     'post-1',
  contribution_kind:  'cross_company_participation',
  impact_weight:      0.80,
  evidence_status:    'verified',
  is_cross_company:   true,
  is_kora_originated: false,
  is_kora_enabled:    false,
};

describe('EVIDENCE_STATUS_TO_EV', () => {
  it('every genuinely-verified status maps at or above the 0.85 "verified" cutoff computeContributionV2 uses', () => {
    for (const status of ['verified', 'system_verified', 'advisor_verified']) {
      expect(EVIDENCE_STATUS_TO_EV[status]).toBeGreaterThanOrEqual(0.85);
    }
  });

  it('partner_verified and self_declared sit below the verified cutoff', () => {
    expect(EVIDENCE_STATUS_TO_EV.partner_verified).toBeLessThan(0.85);
    expect(EVIDENCE_STATUS_TO_EV.self_declared).toBeLessThan(0.85);
  });
});

describe('deriveEventNature', () => {
  it('cross_company_participation -> collective_initiative', () => {
    expect(deriveEventNature({ contribution_kind: 'cross_company_participation', is_cross_company: true, is_kora_originated: false, is_kora_enabled: false })).toBe('collective_initiative');
  });

  it('external_participants_event -> collective_initiative', () => {
    expect(deriveEventNature({ contribution_kind: 'external_participants_event', is_cross_company: false, is_kora_originated: false, is_kora_enabled: false })).toBe('collective_initiative');
  });

  it('is_kora_originated -> partner_service', () => {
    expect(deriveEventNature({ contribution_kind: 'kora_originated_adoption', is_cross_company: false, is_kora_originated: true, is_kora_enabled: false })).toBe('partner_service');
  });

  it('is_kora_enabled -> partner_service', () => {
    expect(deriveEventNature({ contribution_kind: 'kora_enabled_adoption', is_cross_company: false, is_kora_originated: false, is_kora_enabled: true })).toBe('partner_service');
  });

  it('initiative_replication -> territorial_initiative', () => {
    expect(deriveEventNature({ contribution_kind: 'initiative_replication', is_cross_company: false, is_kora_originated: false, is_kora_enabled: false })).toBe('territorial_initiative');
  });

  it('company_* kinds -> collective_initiative', () => {
    for (const kind of ['company_adoption', 'company_sponsorship', 'company_support', 'company_cofunding']) {
      expect(deriveEventNature({ contribution_kind: kind, is_cross_company: false, is_kora_originated: false, is_kora_enabled: false })).toBe('collective_initiative');
    }
  });

  it('aggregate_feedback / aggregate_follow_up without flags -> undefined (not guessed)', () => {
    expect(deriveEventNature({ contribution_kind: 'aggregate_feedback', is_cross_company: false, is_kora_originated: false, is_kora_enabled: false })).toBeUndefined();
    expect(deriveEventNature({ contribution_kind: 'aggregate_follow_up', is_cross_company: false, is_kora_originated: false, is_kora_enabled: false })).toBeUndefined();
  });
});

describe('deriveActionFamily', () => {
  it('maps IMPACT/CONNECTION/LEGACY pillars to the corresponding family, once event_nature is present', () => {
    expect(deriveActionFamily('IMPACT', 'collective_initiative')).toBe('territorial_impact');
    expect(deriveActionFamily('CONNECTION', 'collective_initiative')).toBe('inclusion_and_connection');
    expect(deriveActionFamily('LEGACY', 'collective_initiative')).toBe('future_and_legacy');
  });

  it('never derives a family from bare pillar alone — returns "" when event_nature is absent', () => {
    // This is the guard against re-opening a pillar-only eligibility path
    // that contribution-family-detector.ts explicitly forbids (an individual
    // training with pillar=IMPACT is NOT a collective contribution event).
    expect(deriveActionFamily('IMPACT', undefined)).toBe('');
  });

  it('returns "" for a null pillar', () => {
    expect(deriveActionFamily(null, 'collective_initiative')).toBe('');
  });

  it('returns "" for an unrecognized pillar (e.g. LIFE/GROWTH — outside CONTRIBUTION_PILLARS)', () => {
    expect(deriveActionFamily('LIFE', 'collective_initiative')).toBe('');
    expect(deriveActionFamily('GROWTH', 'collective_initiative')).toBe('');
  });
});

describe('buildContributionPipelineInputs', () => {
  it('maps a real-shaped row to a ContributionPipelineInput with no fabricated fields', () => {
    const inputs = buildContributionPipelineInputs([BASE_ROW], new Map([['post-1', 'IMPACT']]));
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toEqual({
      action_family:            'territorial_impact',
      primary_pillar:           'IMPACT',
      impact_units_total:       0.80,
      evidence_verification_ev: 0.90,
      computed:                 true,
      event_nature:             'collective_initiative',
    });
  });

  it('computed is false when impact_weight is 0, mirroring the demo path guard', () => {
    const inputs = buildContributionPipelineInputs([{ ...BASE_ROW, impact_weight: 0 }], new Map([['post-1', 'IMPACT']]));
    expect(inputs[0].computed).toBe(false);
  });

  it('primary_pillar is null when the post is not in the pillar map (never fabricated)', () => {
    const inputs = buildContributionPipelineInputs([BASE_ROW], new Map());
    expect(inputs[0].primary_pillar).toBeNull();
    // action_family also falls back to '' since deriveActionFamily requires a real pillar
    expect(inputs[0].action_family).toBe('');
  });

  it('unmapped evidence_status falls back to 0.50 EV, never throws', () => {
    const inputs = buildContributionPipelineInputs([{ ...BASE_ROW, evidence_status: 'unknown_status' }], new Map([['post-1', 'IMPACT']]));
    expect(inputs[0].evidence_verification_ev).toBe(0.50);
  });

  it('handles an empty rows array without error', () => {
    expect(buildContributionPipelineInputs([], new Map())).toEqual([]);
  });

  it('never emits a worker-identity field — DB rows carry no worker_id by construction', () => {
    const inputs = buildContributionPipelineInputs([BASE_ROW], new Map([['post-1', 'IMPACT']]));
    const keys = Object.keys(inputs[0]);
    expect(keys).not.toContain('worker_id');
    expect(keys).not.toContain('worker_identity_id');
  });

  it('produces byte-identical shape for a DEMO-kind tenant row and a LIVE-kind tenant row — tenant_kind is not a field this module ever reads', () => {
    const liveInputs = buildContributionPipelineInputs([{ ...BASE_ROW, source_post_id: 'post-live' }], new Map([['post-live', 'IMPACT']]));
    const demoInputs = buildContributionPipelineInputs([{ ...BASE_ROW, source_post_id: 'post-demo' }], new Map([['post-demo', 'IMPACT']]));
    expect(Object.keys(liveInputs[0]).sort()).toEqual(Object.keys(demoInputs[0]).sort());
    expect(liveInputs[0].impact_units_total).toEqual(demoInputs[0].impact_units_total);
  });
});
