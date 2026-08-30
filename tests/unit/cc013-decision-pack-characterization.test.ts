/**
 * CC-013 / B-PACK — Decision Pack canonical builder characterization.
 *
 * SCOPE: captures CURRENT, unmodified behavior of the canonical builder
 * (lib/decision-pack/pdf-data.ts: fetchPdfData) so any future refactor can
 * be diffed against it. Mocks only the Supabase I/O boundary
 * (`@supabase/supabase-js`'s createClient, the exact import fetchPdfData
 * uses — NOT `@/lib/supabase/server`) — the real function runs unmodified.
 * Same technique as tests/unit/pilot-trust-04-worker-tenant-suspension.test.ts
 * and tests/unit/cc012-confidence-adversarial.test.ts's persistence test.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Generic Supabase query-builder mock ─────────────────────────────────────
// Supports every chain shape fetchPdfData actually uses: chainable
// select/eq/order/limit, terminated either by .maybeSingle() (async method)
// or by awaiting the chain directly (thenable, mimicking postgrest-js).

type QueryResult = { data: unknown; error: { message: string } | null };

function makeBuilder(result: QueryResult) {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => result,
    then: (resolve: (v: QueryResult) => void) => resolve(result),
  };
  return builder;
}

/** tableData maps table name -> the QueryResult every query against it returns. */
function makeMockClient(tableData: Record<string, QueryResult>) {
  return {
    schema: (_schemaName: string) => ({
      from: (table: string) => makeBuilder(tableData[table] ?? { data: null, error: null }),
    }),
  };
}

let currentTableData: Record<string, QueryResult> = {};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => makeMockClient(currentTableData),
}));

beforeEach(() => {
  currentTableData = {};
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

// ── Shared canned rows ───────────────────────────────────────────────────────

const TENANT_ROW = { id: 'tenant-uuid-1', company_name: 'Meridiana SpA' };

const KI_ROW_FULL = {
  kora_index_value: 62.5,
  safeguard_status: 'CLEAR',
  calibration_status: 'pre_empirical_calibration',
  methodology_version_id: 'KORA Index v1.0',
  is_current: true,
  created_at: '2026-06-01T00:00:00.000Z',
  components: [
    { code: 'AR', label: 'Activation Rate', value: 0.6, weight: 0.125, macroblock: 'REACH', external: false },
    { code: 'CS', label: 'Confidence Score', value: 0.72, weight: 0, macroblock: null, external: true },
  ],
  macroblocks: [
    { code: 'REACH', label: 'Reach', weight: 0.25, score: 60 },
  ],
  confidence_result: { confidence_score: 0.72 },
  activation_result: {
    activation_rate: 0.60,
    meaningful_activation_rate: 0.45,
    pillar_distribution: { LIFE: 10, GROWTH: 20, CONNECTION: 5, IMPACT: 8, LEGACY: 2 },
  },
};

const DP_ROW = { id: 'dp-1', version_id: 'v1', status: 'ready', bti_result_id: 'bti-1' };

const BTI_ROW = {
  total_people_welfare_budget: 100000,
  deep_activation_spend: 60000,
  economic_relief_spend: 20000,
  blocked_compliance_spend: 0,
  activation_debt_eur: 0,
  bti_score: 70,
  cost_per_impact_unit: 12.5,
  budget_evidence_quality: 0.85,
};

const AUDIT_ROWS = [
  { action: 'decision_pack_status_ready', resource_type: 'analytics.decision_pack_version', created_at: '2026-06-01T00:00:00.000Z' },
];

function uefRow(payload: Record<string, unknown>, approved = true) {
  return { review_status: 'approved', approved_for_scoring: approved, data_completeness_score: 0.9, payload };
}

const IU_ROWS = [
  {
    computed: true, exclusion_reason: null, impact_units_total: 10,
    life_iu: 10, growth_iu: 0, connection_iu: 0, impact_iu: 0, legacy_iu: 0,
    cq: 0.9, ev: 0.8, methodology_version: 'KORA Index v1.0', calibration_status: 'pre_empirical_calibration',
  },
];

async function loadFetchPdfData() {
  vi.resetModules();
  const mod = await import('@/lib/decision-pack/pdf-data');
  return mod.fetchPdfData;
}

// ═════════════════════════════════════════════════════════════════════════════

describe('CC-013 characterization — complete tenant', () => {
  it('produces the full expected content model from persisted rows', async () => {
    currentTableData = {
      tenant: { data: TENANT_ROW, error: null },
      kora_index_result: { data: KI_ROW_FULL, error: null },
      decision_pack_version: { data: DP_ROW, error: null },
      audit_log: { data: AUDIT_ROWS, error: null },
      bti_result: { data: BTI_ROW, error: null },
      uef_record: {
        data: [
          uefRow({
            reporting_alignment: { areas: [{ code: 'GRI-401', label: 'Employment', strength: 'strong' }] },
            evidence_gaps: [{ areaCode: 'GRI-401', areaLabel: 'Employment', readiness: 'report_ready', missingEvidence: [], recommendedActions: [], ownerHint: 'HR' }],
            budget_class: 'deep_activation', budget_amount: 5000, evidence_level: 'L3', financial_confidence: 0.8,
            b11_enriched: true,
          }),
        ],
        error: null,
      },
      impact_unit: { data: IU_ROWS, error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('MERIDIANA', '2026-Q1');

    expect(result).not.toBeNull();
    expect(result!.koraIndex.value).toBe(62.5);
    expect(result!.koraIndex.confidenceScore).toBeCloseTo(0.72, 6);
    expect(result!.koraIndex.methodologyVersionId).toBe('KORA Index v1.0');
    expect(result!.koraIndex.calibrationStatus).toBe('pre_empirical_calibration');
    expect(result!.bti).not.toBeNull();
    expect(result!.bti!.btiScore).toBe(70);
    expect(result!.pillarDistribution).toEqual({ LIFE: 10, GROWTH: 20, CONNECTION: 5, IMPACT: 8, LEGACY: 2 });
    expect(result!.enrichment).not.toBeNull();
    expect(result!.enrichment!.enrichedRecords).toBe(1);
    expect(result!.reportingAlignment).not.toBeNull();
    expect(result!.reportingAlignment!.areas).toHaveLength(1);
    expect(result!.reportingReadiness).not.toBeNull();
    expect(result!.reportingReadiness!.reportReady).toBe(1);
    expect(result!.iuSummary).not.toBeNull();
    expect(result!.iuSummary!.totalImpactUnits).toBe(10);
    expect(result!.meta.isLiveData).toBe(true);
    expect(result!.meta.decisionPackStatus).toBe('ready');
    expect(result!.executiveBrief).not.toBeNull();
    expect(result!.contributionSummary).toBeNull(); // documented: never persisted in Foundation Light
    expect(result!.pibAggregation).toBeNull(); // documented: never persisted in Foundation Light
  });
});

describe('CC-013 characterization — missing BTI (no bti_result_id on decision_pack_version)', () => {
  it('bti stays null, executiveBrief still computes with economicReliefShare null', async () => {
    currentTableData = {
      tenant: { data: TENANT_ROW, error: null },
      kora_index_result: { data: KI_ROW_FULL, error: null },
      decision_pack_version: { data: { ...DP_ROW, bti_result_id: null }, error: null },
      audit_log: { data: [], error: null },
      uef_record: { data: [], error: null },
      impact_unit: { data: [], error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('MERIDIANA', '2026-Q1');

    expect(result).not.toBeNull();
    expect(result!.bti).toBeNull();
    expect(result!.executiveBrief).not.toBeNull();
  });
});

describe('CC-013 characterization — missing Confidence (confidence_result join is null)', () => {
  it('confidenceScore defaults to 0, not an error', async () => {
    currentTableData = {
      tenant: { data: TENANT_ROW, error: null },
      kora_index_result: { data: { ...KI_ROW_FULL, confidence_result: null }, error: null },
      decision_pack_version: { data: DP_ROW, error: null },
      audit_log: { data: [], error: null },
      bti_result: { data: BTI_ROW, error: null },
      uef_record: { data: [], error: null },
      impact_unit: { data: [], error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('MERIDIANA', '2026-Q1');

    expect(result).not.toBeNull();
    expect(result!.koraIndex.confidenceScore).toBe(0);
  });
});

describe('CC-013 characterization — sparse evidence (empty uef_record set)', () => {
  it('enrichment, reportingAlignment, reportingReadiness all stay null', async () => {
    currentTableData = {
      tenant: { data: TENANT_ROW, error: null },
      kora_index_result: { data: KI_ROW_FULL, error: null },
      decision_pack_version: { data: DP_ROW, error: null },
      audit_log: { data: [], error: null },
      bti_result: { data: BTI_ROW, error: null },
      uef_record: { data: [], error: null },
      impact_unit: { data: [], error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('MERIDIANA', '2026-Q1');

    expect(result!.enrichment).toBeNull();
    expect(result!.reportingAlignment).toBeNull();
    expect(result!.reportingReadiness).toBeNull();
    expect(result!.iuSummary).toBeNull();
  });
});

describe('CC-013 characterization — evidence present but no gaps array (B18 populated, B19 not)', () => {
  it('reportingAlignment populated, reportingReadiness stays null', async () => {
    currentTableData = {
      tenant: { data: TENANT_ROW, error: null },
      kora_index_result: { data: KI_ROW_FULL, error: null },
      decision_pack_version: { data: DP_ROW, error: null },
      audit_log: { data: [], error: null },
      bti_result: { data: BTI_ROW, error: null },
      uef_record: {
        data: [uefRow({ reporting_alignment: { areas: [{ code: 'GRI-401', label: 'Employment', strength: 'medium' }] } })],
        error: null,
      },
      impact_unit: { data: [], error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('MERIDIANA', '2026-Q1');

    expect(result!.reportingAlignment).not.toBeNull();
    expect(result!.reportingAlignment!.areas[0].medium).toBe(1);
    expect(result!.reportingReadiness).toBeNull();
  });
});

describe('CC-013 characterization — multiple evidence areas, sorted by count', () => {
  it('areas array is sorted descending by count', async () => {
    currentTableData = {
      tenant: { data: TENANT_ROW, error: null },
      kora_index_result: { data: KI_ROW_FULL, error: null },
      decision_pack_version: { data: DP_ROW, error: null },
      audit_log: { data: [], error: null },
      bti_result: { data: BTI_ROW, error: null },
      uef_record: {
        data: [
          uefRow({ reporting_alignment: { areas: [{ code: 'A', label: 'A', strength: 'strong' }] } }),
          uefRow({ reporting_alignment: { areas: [{ code: 'A', label: 'A', strength: 'weak' }, { code: 'B', label: 'B', strength: 'medium' }] } }),
          uefRow({ reporting_alignment: { areas: [{ code: 'A', label: 'A', strength: 'strong' }] } }),
        ],
        error: null,
      },
      impact_unit: { data: [], error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('MERIDIANA', '2026-Q1');

    expect(result!.reportingAlignment).not.toBeNull();
    const codes = result!.reportingAlignment!.areas.map((a) => a.code);
    expect(codes[0]).toBe('A'); // count=3, sorted first
    expect(result!.reportingAlignment!.areas.find((a) => a.code === 'A')!.count).toBe(3);
    expect(result!.reportingAlignment!.areas.find((a) => a.code === 'B')!.count).toBe(1);
  });
});

describe('CC-013 characterization — methodology/calibration metadata pass-through and fallback defaults', () => {
  it('uses persisted values when present', async () => {
    currentTableData = {
      tenant: { data: TENANT_ROW, error: null },
      kora_index_result: { data: KI_ROW_FULL, error: null },
      decision_pack_version: { data: DP_ROW, error: null },
      audit_log: { data: [], error: null },
      bti_result: { data: BTI_ROW, error: null },
      uef_record: { data: [], error: null },
      impact_unit: { data: [], error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('MERIDIANA', '2026-Q1');
    expect(result!.koraIndex.methodologyVersionId).toBe('KORA Index v1.0');
    expect(result!.koraIndex.calibrationStatus).toBe('pre_empirical_calibration');
  });

  it('falls back to documented defaults when persisted fields are null', async () => {
    currentTableData = {
      tenant: { data: TENANT_ROW, error: null },
      kora_index_result: { data: { ...KI_ROW_FULL, methodology_version_id: null, calibration_status: null }, error: null },
      decision_pack_version: { data: DP_ROW, error: null },
      audit_log: { data: [], error: null },
      bti_result: { data: BTI_ROW, error: null },
      uef_record: { data: [], error: null },
      impact_unit: { data: [], error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('MERIDIANA', '2026-Q1');
    expect(result!.koraIndex.methodologyVersionId).toBe('KORA Index v1.0');
    expect(result!.koraIndex.calibrationStatus).toBe('pre_empirical_calibration');
  });
});

describe('CC-013 characterization — hard null cases', () => {
  it('tenant not found -> returns null', async () => {
    currentTableData = { tenant: { data: null, error: null } };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('UNKNOWN', '2026-Q1');
    expect(result).toBeNull();
  });

  it('kora_index_result not found for tenant+period -> returns null', async () => {
    currentTableData = {
      tenant: { data: TENANT_ROW, error: null },
      kora_index_result: { data: null, error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('MERIDIANA', '2099-Q1');
    expect(result).toBeNull();
  });
});

describe('CC-013 characterization — confidence scale defensive branch (documented, not altered)', () => {
  it('confidence_score <= 1 passes through unchanged', async () => {
    currentTableData = {
      tenant: { data: TENANT_ROW, error: null },
      kora_index_result: { data: { ...KI_ROW_FULL, confidence_result: { confidence_score: 0.42 } }, error: null },
      decision_pack_version: { data: DP_ROW, error: null },
      audit_log: { data: [], error: null },
      bti_result: { data: BTI_ROW, error: null },
      uef_record: { data: [], error: null },
      impact_unit: { data: [], error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('MERIDIANA', '2026-Q1');
    expect(result!.koraIndex.confidenceScore).toBeCloseTo(0.42, 6);
  });

  it('confidence_score > 1 (legacy 0-100 row) is divided by 100 — documents the existing defensive branch, not a new one', async () => {
    currentTableData = {
      tenant: { data: TENANT_ROW, error: null },
      kora_index_result: { data: { ...KI_ROW_FULL, confidence_result: { confidence_score: 94 } }, error: null },
      decision_pack_version: { data: DP_ROW, error: null },
      audit_log: { data: [], error: null },
      bti_result: { data: BTI_ROW, error: null },
      uef_record: { data: [], error: null },
      impact_unit: { data: [], error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('MERIDIANA', '2026-Q1');
    expect(result!.koraIndex.confidenceScore).toBeCloseTo(0.94, 6);
  });
});
