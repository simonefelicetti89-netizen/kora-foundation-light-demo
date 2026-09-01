// tests/unit/btruth-company-onboarding-view.test.ts
// B-TRUTH Company Onboarding canonicalization — pure-function coverage for
// lib/live/company-onboarding-view.ts, which replaced the synthetic
// CompanyOnboardingService's data/synthetic/company-onboarding.json read.

import { describe, it, expect } from 'vitest';
import {
  buildCompanyOnboardingView,
  deriveOnboardingFunnelPosition,
  PIPELINE_LINKS,
  type TenantOnboardingRow,
} from '../../lib/live/company-onboarding-view';
import { FOUNDATION_LIGHT_MINIMUM_WORKERS, type WorkforceBaselineRow } from '../../lib/live/workforce-baseline-view';

const TENANT_READY: TenantOnboardingRow = {
  id: 'tenant-1',
  tenant_code: 'ACME',
  company_name: 'Acme Corp',
  onboarding_status: 'active',
  data_readiness_status: 'intake_ready',
  decision_pack_status: 'not_ready',
};

const BASELINE_ELIGIBLE: WorkforceBaselineRow = {
  tenant_id: 'tenant-1',
  reporting_period: '2026-Q3',
  total_workers: 50,
  segment_breakdown: { department: { HR: 12, Engineering: 28, Sales: 10 } },
  minimum_group_size: 10,
  created_at: '2026-08-01T00:00:00Z',
  created_by: 'kora-admin@kora.test',
};

describe('buildCompanyOnboardingView — no workforce baseline yet', () => {
  const view = buildCompanyOnboardingView(TENANT_READY, null);

  it('hasWorkforceBaseline is false, isFoundationLightEligible is false', () => {
    expect(view.hasWorkforceBaseline).toBe(false);
    expect(view.isFoundationLightEligible).toBe(false);
  });

  it('pipelineReadiness is blocked on the workforce-threshold check', () => {
    expect(view.pipelineReadiness.status).toBe('blocked');
    expect(view.pipelineReadiness.blocking_checks.map((c) => c.check_id)).toContain('workforce-threshold');
  });

  it('nextBestAction guides toward uploading the baseline (profile_complete message — profile itself is always set by provisioning)', () => {
    expect(view.nextBestAction.action).toBe('Carica la baseline workforce');
  });

  it('privacyThresholdWarnings is empty (nothing to warn about without a baseline)', () => {
    expect(view.privacyThresholdWarnings).toEqual([]);
  });
});

describe('buildCompanyOnboardingView — eligible baseline, data not yet ready', () => {
  const tenant: TenantOnboardingRow = { ...TENANT_READY, data_readiness_status: 'incomplete' };
  const view = buildCompanyOnboardingView(tenant, BASELINE_ELIGIBLE);

  it('isFoundationLightEligible is true (50 >= 30)', () => {
    expect(view.isFoundationLightEligible).toBe(true);
  });

  it('pipelineReadiness is blocked on data-readiness (still blocking, not yet ready)', () => {
    expect(view.pipelineReadiness.status).toBe('blocked');
    expect(view.pipelineReadiness.blocking_checks.map((c) => c.check_id)).toContain('data-readiness');
    expect(view.pipelineReadiness.blocking_checks.map((c) => c.check_id)).not.toContain('workforce-threshold');
  });

  it('nextBestAction guides toward uploading program data', () => {
    expect(view.nextBestAction.action).toBe('Carica i dati programmi');
  });
});

describe('buildCompanyOnboardingView — eligible baseline, data ready, decision pack not ready', () => {
  const view = buildCompanyOnboardingView(TENANT_READY, BASELINE_ELIGIBLE);

  it('pipelineReadiness is ok — all 3 real-signal checks pass', () => {
    expect(view.pipelineReadiness.status).toBe('ok');
    expect(view.pipelineReadiness.blocking_checks).toEqual([]);
  });

  it('readinessChecks has exactly 3 checks, all "ok"', () => {
    expect(view.readinessChecks).toHaveLength(3);
    expect(view.readinessChecks.every((c) => c.status === 'ok')).toBe(true);
    expect(view.readinessChecks.map((c) => c.check_id).sort()).toEqual(['data-readiness', 'privacy-clusters', 'workforce-threshold']);
  });

  it('nextBestAction guides toward starting the pipeline', () => {
    expect(view.nextBestAction.action).toBe('Avvia la pipeline KORA');
  });
});

describe('buildCompanyOnboardingView — decision pack ready', () => {
  const tenant: TenantOnboardingRow = { ...TENANT_READY, decision_pack_status: 'ready' };
  const view = buildCompanyOnboardingView(tenant, BASELINE_ELIGIBLE);

  it('nextBestAction points to the Decision Pack', () => {
    expect(view.nextBestAction.action).toBe('Consulta il Decision Pack');
  });

  it('pipelineReadiness remains ok regardless of decision_pack_status (readiness is a prerequisite gate, not a completion flag)', () => {
    expect(view.pipelineReadiness.status).toBe('ok');
  });
});

describe('buildCompanyOnboardingView — insufficient workforce', () => {
  const baseline: WorkforceBaselineRow = { ...BASELINE_ELIGIBLE, total_workers: 12, segment_breakdown: { department: { HR: 12 } } };
  const view = buildCompanyOnboardingView(TENANT_READY, baseline);

  it('isFoundationLightEligible is false (12 < 30)', () => {
    expect(view.isFoundationLightEligible).toBe(false);
  });

  it('nextBestAction is the blocked_insufficient_workforce message', () => {
    expect(view.nextBestAction.action).toBe('Aumenta l\'organico');
    expect(view.nextBestAction.detail).toContain('30 lavoratori');
  });

  it('pipelineReadiness is blocked on workforce-threshold', () => {
    expect(view.pipelineReadiness.status).toBe('blocked');
    expect(view.pipelineReadiness.blocking_checks.map((c) => c.check_id)).toContain('workforce-threshold');
  });
});

describe('buildCompanyOnboardingView — privacy threshold warnings', () => {
  const baseline: WorkforceBaselineRow = {
    ...BASELINE_ELIGIBLE,
    total_workers: 35,
    segment_breakdown: { department: { HR: 5, Engineering: 20, Sales: 10 } }, // HR below N>=10
  };
  const view = buildCompanyOnboardingView(TENANT_READY, baseline);

  it('flags the HR group as below minimum_group_size', () => {
    expect(view.privacyThresholdWarnings).toHaveLength(1);
    expect(view.privacyThresholdWarnings[0].group_label).toBe('HR');
    expect(view.privacyThresholdWarnings[0].employee_count).toBe(5);
  });

  it('privacy-clusters check itself reports "warning" status, but is a blocking check (matching the original synthetic check\'s own blocking:true) — so overall readiness is blocked', () => {
    const privacyCheck = view.readinessChecks.find((c) => c.check_id === 'privacy-clusters');
    expect(privacyCheck?.status).toBe('warning');
    expect(privacyCheck?.blocking).toBe(true);
    expect(view.pipelineReadiness.status).toBe('blocked');
    expect(view.pipelineReadiness.blocking_checks.map((c) => c.check_id)).toContain('privacy-clusters');
  });
});

describe('deriveOnboardingFunnelPosition', () => {
  it('no baseline -> profile_complete', () => {
    expect(deriveOnboardingFunnelPosition({ hasWorkforceBaseline: false, isFoundationLightEligible: false, dataReadinessStatus: 'incomplete', decisionPackStatus: 'not_ready' })).toBe('profile_complete');
  });

  it('baseline but ineligible -> blocked_insufficient_workforce', () => {
    expect(deriveOnboardingFunnelPosition({ hasWorkforceBaseline: true, isFoundationLightEligible: false, dataReadinessStatus: 'incomplete', decisionPackStatus: 'not_ready' })).toBe('blocked_insufficient_workforce');
  });

  it('eligible, data not ready -> workforce_baseline_complete', () => {
    expect(deriveOnboardingFunnelPosition({ hasWorkforceBaseline: true, isFoundationLightEligible: true, dataReadinessStatus: 'incomplete', decisionPackStatus: 'not_ready' })).toBe('workforce_baseline_complete');
  });

  it('eligible, data ready -> readiness_check_passed', () => {
    expect(deriveOnboardingFunnelPosition({ hasWorkforceBaseline: true, isFoundationLightEligible: true, dataReadinessStatus: 'intake_ready', decisionPackStatus: 'not_ready' })).toBe('readiness_check_passed');
  });

  it('decision pack ready -> decision_pack_ready (takes priority over data-readiness)', () => {
    expect(deriveOnboardingFunnelPosition({ hasWorkforceBaseline: true, isFoundationLightEligible: true, dataReadinessStatus: 'incomplete', decisionPackStatus: 'ready' })).toBe('decision_pack_ready');
  });
});

describe('pipelineLinks — static navigation metadata', () => {
  it('PIPELINE_LINKS has exactly 5 fixed stages', () => {
    expect(PIPELINE_LINKS).toHaveLength(5);
    expect(PIPELINE_LINKS.map((l) => l.stage)).toEqual(['1-ingestion', '2-uef-review', '3-scoring', '4-decision-pack', '5-kora-index']);
  });

  it('is identical across two different buildCompanyOnboardingView calls (not per-company data)', () => {
    const viewA = buildCompanyOnboardingView(TENANT_READY, null);
    const viewB = buildCompanyOnboardingView({ ...TENANT_READY, tenant_code: 'OTHER', id: 'tenant-2' }, BASELINE_ELIGIBLE);
    expect(viewA.pipelineLinks).toEqual(viewB.pipelineLinks);
  });
});

describe('produces byte-identical shape for a DEMO-kind tenant row and a LIVE-kind tenant row — tenant_kind is not a field this module ever reads', () => {
  it('same output keys and same derived values, given identical underlying data', () => {
    const liveView = buildCompanyOnboardingView({ ...TENANT_READY, id: 'live-tenant', tenant_code: 'LIVE-CO' }, BASELINE_ELIGIBLE);
    const demoView = buildCompanyOnboardingView({ ...TENANT_READY, id: 'demo-tenant', tenant_code: 'DEMO-CO' }, BASELINE_ELIGIBLE);
    expect(Object.keys(liveView).sort()).toEqual(Object.keys(demoView).sort());
    expect(liveView.isFoundationLightEligible).toEqual(demoView.isFoundationLightEligible);
    expect(liveView.pipelineReadiness).toEqual(demoView.pipelineReadiness);
    expect(liveView.nextBestAction).toEqual(demoView.nextBestAction);
  });
});

describe('never emits the dropped synthetic-only fields', () => {
  it('view has no legal_form, foundation_year, contact_role, hr_kpi_context, program_data_summary, synthetic_demo_data', () => {
    const view = buildCompanyOnboardingView(TENANT_READY, BASELINE_ELIGIBLE);
    const keys = Object.keys(view);
    for (const dropped of [
      'legal_form', 'foundation_year', 'contact_role', 'hr_kpi_context',
      'program_data_summary', 'synthetic_demo_data', 'production_ready',
    ]) {
      expect(keys).not.toContain(dropped);
    }
  });
});

describe('reuses FOUNDATION_LIGHT_MINIMUM_WORKERS from workforce-baseline-view.ts, not a second constant', () => {
  it('minimumCompanyThreshold on the view equals the shared constant', () => {
    const view = buildCompanyOnboardingView(TENANT_READY, BASELINE_ELIGIBLE);
    expect(view.minimumCompanyThreshold).toBe(FOUNDATION_LIGHT_MINIMUM_WORKERS);
    expect(view.minimumCompanyThreshold).toBe(30);
  });
});
