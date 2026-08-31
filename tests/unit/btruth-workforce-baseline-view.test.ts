// tests/unit/btruth-workforce-baseline-view.test.ts
// B-TRUTH first canonical seed group — pure-function coverage for
// lib/live/workforce-baseline-view.ts, which replaced the synthetic
// WorkforceBaselineService's data/synthetic/workforce-baseline.json read.

import { describe, it, expect } from 'vitest';
import {
  buildWorkforceBaselineView,
  FOUNDATION_LIGHT_MINIMUM_WORKERS,
  type WorkforceBaselineRow,
} from '../../lib/live/workforce-baseline-view';

const BASE_ROW: WorkforceBaselineRow = {
  tenant_id: 'tenant-1',
  reporting_period: '2026-Q3',
  total_workers: 50,
  segment_breakdown: {
    department: { HR: 12, Engineering: 28, Sales: 10 },
    site: { Milano: 35, Roma: 15 },
  },
  minimum_group_size: 10,
  created_at: '2026-08-01T00:00:00Z',
  created_by: 'kora-admin@kora.test',
};

const TENANT = { tenant_code: 'ACME', company_name: 'Acme Corp' };

describe('buildWorkforceBaselineView', () => {
  it('flattens segment_breakdown into aggregateGroups with computed share_of_workforce', () => {
    const view = buildWorkforceBaselineView(BASE_ROW, TENANT);
    expect(view.aggregateGroups).toHaveLength(5);
    const hr = view.aggregateGroups.find((g) => g.group_id === 'department:HR');
    expect(hr).toEqual({
      group_id: 'department:HR',
      dimension_type: 'department',
      group_label: 'HR',
      employee_count: 12,
      share_of_workforce: 12 / 50,
    });
  });

  it('sets minimumCompanyThreshold to the Foundation Light constant (30)', () => {
    const view = buildWorkforceBaselineView(BASE_ROW, TENANT);
    expect(view.minimumCompanyThreshold).toBe(FOUNDATION_LIGHT_MINIMUM_WORKERS);
    expect(view.minimumCompanyThreshold).toBe(30);
  });

  it('minimumCompanyThresholdMet is derived from total_workers, not stored', () => {
    const above = buildWorkforceBaselineView({ ...BASE_ROW, total_workers: 30 }, TENANT);
    expect(above.minimumCompanyThresholdMet).toBe(true);
    const below = buildWorkforceBaselineView({ ...BASE_ROW, total_workers: 29 }, TENANT);
    expect(below.minimumCompanyThresholdMet).toBe(false);
  });

  it('passes through tenant identity and minimum_group_size unchanged', () => {
    const view = buildWorkforceBaselineView(BASE_ROW, TENANT);
    expect(view.tenantId).toBe('tenant-1');
    expect(view.tenantCode).toBe('ACME');
    expect(view.companyName).toBe('Acme Corp');
    expect(view.minimumGroupSize).toBe(10);
  });

  it('privacySafeForCompanyView is always true — the stored breakdown is already post-suppression', () => {
    const view = buildWorkforceBaselineView(BASE_ROW, TENANT);
    expect(view.privacySafeForCompanyView).toBe(true);
  });

  it('handles an empty segment_breakdown without error', () => {
    const view = buildWorkforceBaselineView({ ...BASE_ROW, segment_breakdown: {} }, TENANT);
    expect(view.aggregateGroups).toEqual([]);
  });

  it('share_of_workforce is 0, not NaN, when total_workers is 0', () => {
    const view = buildWorkforceBaselineView(
      { ...BASE_ROW, total_workers: 0, segment_breakdown: { department: { HR: 0 } } },
      TENANT,
    );
    expect(view.aggregateGroups[0].share_of_workforce).toBe(0);
  });

  it('never emits the dropped synthetic-only fields (upload_batch, warnings, limitations, completeness score, activation/equity readiness)', () => {
    const view = buildWorkforceBaselineView(BASE_ROW, TENANT);
    const keys = Object.keys(view);
    for (const dropped of [
      'upload_batch', 'uploadBatch', 'warnings', 'limitations',
      'baseline_completeness_score', 'baselineCompletenessScore',
      'activation_reach_ready', 'activationReachReady',
      'distribution_equity_ready', 'distributionEquityReady',
      'next_action', 'nextAction', 'synthetic_demo_data',
    ]) {
      expect(keys).not.toContain(dropped);
    }
  });

  it('produces byte-identical shape for a DEMO-kind tenant\'s row and a LIVE-kind tenant\'s row — tenant_kind is not a field this function ever reads', () => {
    const liveView = buildWorkforceBaselineView({ ...BASE_ROW, tenant_id: 'live-tenant' }, { tenant_code: 'LIVE-CO', company_name: 'Live Co' });
    const demoView = buildWorkforceBaselineView({ ...BASE_ROW, tenant_id: 'demo-tenant' }, { tenant_code: 'DEMO-CO', company_name: 'Demo Co' });
    expect(Object.keys(liveView).sort()).toEqual(Object.keys(demoView).sort());
    expect(liveView.aggregateGroups.map((g) => g.group_id).sort()).toEqual(demoView.aggregateGroups.map((g) => g.group_id).sort());
  });
});
