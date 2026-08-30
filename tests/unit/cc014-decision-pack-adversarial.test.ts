/**
 * CC-014 / B-PACK — Adversarial validation of the CC-013 canonical Decision
 * Pack contract.
 *
 * Per the CC-014 prompt's test-quality rule, critical assertions exercise
 * real behavior: the real `fetchPdfData`, the real `buildDecisionPackHtml`,
 * and the real route `GET` handlers, with only Supabase/auth I/O boundaries
 * mocked (same technique as tests/unit/pilot-trust-04-worker-tenant-suspension.test.ts,
 * tests/unit/cc012-confidence-adversarial.test.ts, and
 * tests/unit/cc013-decision-pack-characterization.test.ts). Source-string
 * checks are kept to genuinely "did anyone add an import" questions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const root = resolve(process.cwd());
function src(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ═════════════════════════════════════════════════════════════════════════════
// Shared mock Supabase query-builder harness (same shape as CC-013's)
// ═════════════════════════════════════════════════════════════════════════════

type QueryResult = { data: unknown; error: { message: string } | null };

interface QueryBuilder {
  select: () => QueryBuilder;
  eq: () => QueryBuilder;
  order: () => QueryBuilder;
  limit: () => QueryBuilder;
  maybeSingle: () => Promise<QueryResult>;
  then: (resolve: (v: QueryResult) => void) => void;
}

function makeBuilder(result: QueryResult): QueryBuilder {
  const builder: QueryBuilder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => result,
    then: (resolve) => resolve(result),
  };
  return builder;
}

function makeMockClient(tableData: Record<string, QueryResult>) {
  return {
    schema: (_schemaName: string) => ({
      from: (table: string) => makeBuilder(tableData[table] ?? { data: null, error: null }),
    }),
  };
}

let pdfDataTables: Record<string, QueryResult> = {};
let serverClientTables: Record<string, QueryResult> = {};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => makeMockClient(pdfDataTables),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: async () => makeMockClient(serverClientTables),
  getSupabaseServiceClient: () => makeMockClient(serverClientTables),
}));

const mockRequireCompanyUser = vi.fn();
const mockRequireKoraAdmin = vi.fn();

vi.mock('@/lib/auth/kora-session', () => ({
  requireCompanyUser: (...args: unknown[]) => mockRequireCompanyUser(...args),
  requireKoraAdmin: (...args: unknown[]) => mockRequireKoraAdmin(...args),
  isKoraAuthError: (v: unknown) =>
    typeof v === 'object' && v !== null && 'status' in v && typeof (v as Record<string, unknown>).json === 'function',
}));

beforeEach(() => {
  pdfDataTables = {};
  serverClientTables = {};
  mockRequireCompanyUser.mockReset();
  mockRequireKoraAdmin.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  vi.resetModules();
});

// ── Distinctive sentinel fixture — deliberately unusual values so accidental
// recomputation, substitution, or a synthetic fallback would be detectable ──

const SENTINEL_TENANT = { id: 'tenant-sentinel-uuid', company_name: 'ZZZ Sentinel Org 9999' };

const SENTINEL_KI_ROW = {
  kora_index_value: 37.19, // deliberately non-round
  safeguard_status: 'WARNING',
  calibration_status: 'pre_empirical_calibration',
  methodology_version_id: 'SENTINEL-METHOD-9999',
  is_current: true,
  created_at: '2099-01-01T00:00:00.000Z',
  components: [{ code: 'AR', label: 'Activation Rate', value: 0.1337, weight: 0.125, macroblock: 'REACH', external: false }],
  macroblocks: [{ code: 'REACH', label: 'Reach', weight: 0.25, score: 13.37 }],
  confidence_result: { confidence_score: 0.6789 },
  activation_result: {
    activation_rate: 0.1234,
    meaningful_activation_rate: 0.0987,
    pillar_distribution: { LIFE: 111, GROWTH: 222, CONNECTION: 333, IMPACT: 444, LEGACY: 555 },
  },
};

const SENTINEL_DP_ROW = { id: 'dp-sentinel', version_id: 'v-sentinel-9999', status: 'ready', bti_result_id: 'bti-sentinel' };

const SENTINEL_BTI_ROW = {
  total_people_welfare_budget: 123456,
  deep_activation_spend: 65432,
  economic_relief_spend: 11111,
  blocked_compliance_spend: 2222,
  activation_debt_eur: 333,
  bti_score: 88.88,
  cost_per_impact_unit: 4.44,
  budget_evidence_quality: 0.9999,
};

function fullSentinelTables(): Record<string, QueryResult> {
  return {
    tenant: { data: SENTINEL_TENANT, error: null },
    kora_index_result: { data: SENTINEL_KI_ROW, error: null },
    decision_pack_version: { data: SENTINEL_DP_ROW, error: null },
    audit_log: { data: [], error: null },
    bti_result: { data: SENTINEL_BTI_ROW, error: null },
    uef_record: {
      data: [{
        review_status: 'approved', approved_for_scoring: true, data_completeness_score: 0.9,
        payload: {
          reporting_alignment: { areas: [{ code: 'SENTINEL-AREA', label: 'Sentinel Area', strength: 'strong' }] },
          evidence_gaps: [{ areaCode: 'SENTINEL-AREA', areaLabel: 'Sentinel Area', readiness: 'report_ready', missingEvidence: [], recommendedActions: [], ownerHint: 'Sentinel Owner' }],
          budget_class: 'deep_activation', budget_amount: 9999, evidence_level: 'L4', financial_confidence: 0.99,
        },
      }],
      error: null,
    },
    impact_unit: { data: [], error: null },
  };
}

async function loadFetchPdfData() {
  const mod = await import('@/lib/decision-pack/pdf-data');
  return mod.fetchPdfData;
}

async function loadBuildHtml() {
  const mod = await import('@/lib/decision-pack/html-template');
  return mod.buildDecisionPackHtml;
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 2 — CANONICAL NUMBER ATTACK
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 2 — canonical number attack: sentinel values survive builder unchanged', () => {
  it('KORA Index, Confidence, Activation, BTI, evidence all carry the exact sentinel values, no recomputation/normalization/substitution', async () => {
    pdfDataTables = fullSentinelTables();
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');

    expect(result).not.toBeNull();
    expect(result!.koraIndex.value).toBe(37.19);
    expect(result!.koraIndex.confidenceScore).toBeCloseTo(0.6789, 6);
    expect(result!.koraIndex.activationRate).toBeCloseTo(0.1234, 6);
    expect(result!.koraIndex.meaningfulActivationRate).toBeCloseTo(0.0987, 6);
    expect(result!.koraIndex.safeguardStatus).toBe('WARNING');
    expect(result!.koraIndex.methodologyVersionId).toBe('SENTINEL-METHOD-9999');
    expect(result!.bti!.btiScore).toBe(88.88);
    expect(result!.bti!.totalPeopleWelfareBudget).toBe(123456);
    expect(result!.bti!.budgetEvidenceQuality).toBeCloseTo(0.9999, 6);
    expect(result!.pillarDistribution).toEqual({ LIFE: 111, GROWTH: 222, CONNECTION: 333, IMPACT: 444, LEGACY: 555 });
    expect(result!.reportingAlignment!.areas[0].code).toBe('SENTINEL-AREA');
    expect(result!.reportingReadiness!.topEvidenceGaps[0].ownerHint).toBe('Sentinel Owner');
    expect(result!.meta.decisionPackVersionId).toBe('v-sentinel-9999');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 3 — RECOMPUTATION GUARD (behavioral + source)
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 3 — recomputation guard', () => {
  it('BEHAVIORAL: changing only the persisted kora_index_value changes output 1:1, proving no independent formula sits between DB and PdfData', async () => {
    pdfDataTables = fullSentinelTables();
    const fetchPdfData = await loadFetchPdfData();
    const a = await fetchPdfData('SENTINEL', '2099-Q9');

    pdfDataTables = { ...fullSentinelTables(), kora_index_result: { data: { ...SENTINEL_KI_ROW, kora_index_value: 71.42 }, error: null } };
    vi.resetModules();
    const fetchPdfData2 = await loadFetchPdfData();
    const b = await fetchPdfData2('SENTINEL', '2099-Q9');

    expect(a!.koraIndex.value).toBe(37.19);
    expect(b!.koraIndex.value).toBe(71.42);
    // Every OTHER field held constant — proves the change was a pure passthrough of the one changed input, not a side effect of a recomputation.
    expect(b!.koraIndex.confidenceScore).toBe(a!.koraIndex.confidenceScore);
    expect(b!.bti!.btiScore).toBe(a!.bti!.btiScore);
  });

  it('SOURCE: no recomputation engine imported by the canonical builder or renderer', () => {
    const pdfData = src('lib/decision-pack/pdf-data.ts');
    const html = src('lib/decision-pack/html-template.ts');
    for (const forbidden of [/computeKoraIndex/, /computeConfidence/, /runKoraPipeline/, /computeBTI/, /kora-index-engine/, /confidence-engine/, /bti-engine/, /run-kora-pipeline/]) {
      expect(pdfData).not.toMatch(forbidden);
      expect(html).not.toMatch(forbidden);
    }
  });

  it('SOURCE: no scoring simulator or synthetic scoring service imported by the canonical builder', () => {
    const pdfData = src('lib/decision-pack/pdf-data.ts');
    expect(pdfData).not.toMatch(/ScoringSimulatorService|scoringSimulatorService|DynamicScoringPreviewService/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 4 — RENDERER PURITY ATTACK
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 4 — renderer purity: sentinels survive builder -> renderer unchanged', () => {
  it('rendered HTML contains the sentinel KORA Index value (1-decimal display rounding, documented presentation-only), tenant code, and methodology string', async () => {
    pdfDataTables = fullSentinelTables();
    const fetchPdfData = await loadFetchPdfData();
    const data = await fetchPdfData('SENTINEL', '2099-Q9');
    expect(data).not.toBeNull();
    expect(data!.koraIndex.value).toBe(37.19); // builder's own value is exact, unrounded

    const buildDecisionPackHtml = await loadBuildHtml();
    const html = buildDecisionPackHtml(data!);

    expect(html).toContain('SENTINEL-METHOD-9999');
    expect(html).toContain('WARNING');
    // FINDING: html-template.ts applies Math.round(value*10)/10 for display —
    // 37.19 renders as 37.2. This is presentation-only rounding, not a value
    // substitution: the builder's PdfData.koraIndex.value (asserted above)
    // stays exact at 37.19; only the rendered HTML text is rounded to 1
    // decimal. Documented here, not "fixed" — CC-014 does not touch renderer output.
    expect(html).toContain('37.2');
  });

  it('html-template.ts has zero DB/scoring/synthetic imports (static, secondary guard)', () => {
    const html = src('lib/decision-pack/html-template.ts');
    expect(html).not.toMatch(/@supabase\/supabase-js|@\/lib\/supabase|data\/synthetic|ScoringSimulatorService|computeKoraIndex|computeConfidence/);
  });

  it('pdf-runtime.ts only transforms HTML string -> Buffer, touches no domain fields', () => {
    const runtime = src('lib/decision-pack/pdf-runtime.ts');
    expect(runtime).toMatch(/export async function renderHtmlToPdf\(html:\s*string\)/);
    expect(runtime).not.toMatch(/kora_index_value|confidence_score|bti_score|PdfData/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 5 — TENANT ISOLATION ATTACK (behavioral, real route handlers)
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 5 — tenant isolation: company Decision Pack route', () => {
  it('auth failure short-circuits before any data access — no DB call happens', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireCompanyUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    serverClientTables = {}; // if a query ran, it would resolve to {data:null} and be misread as 404, not 401 — we assert the actual status instead

    const { GET } = await import('@/app/api/company/decision-pack/route');
    const { NextRequest } = await import('next/server');
    const req = new NextRequest('https://kora.test/api/company/decision-pack');
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('tenant context comes ONLY from the session — a malicious tenantId in query params is never read for identity', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireCompanyUser.mockResolvedValue({ id: 'user-1', email: 'a@b.com', koraRole: 'COMPANY_ADMIN', tenantId: 'REAL-SESSION-TENANT', userStatus: 'active' });
    serverClientTables = {
      tenant: { data: { id: 'REAL-SESSION-TENANT', tenant_code: 'REALCO', is_active: true }, error: null },
      kora_index_result: { data: null, error: null }, // no current KI -> 404, but we only care that the query used the session tenant
    };
    pdfDataTables = {};

    const { GET } = await import('@/app/api/company/decision-pack/route');
    const { NextRequest } = await import('next/server');
    // Attacker attempts to inject a different tenant via query params — the route
    // doesn't even read a tenantId query param (confirmed structurally), so this
    // just proves the response reflects the SESSION tenant, not this attacker value.
    const req = new NextRequest('https://kora.test/api/company/decision-pack?tenantId=ATTACKER-TENANT&reportingPeriod=2026-Q1');
    const response = await GET(req);
    const body = await response.json();
    // No decision_pack_version row available in our fixture -> the route's own
    // 404 branch fires (reportingPeriod was supplied explicitly, so the route
    // skips its kora_index_result lookup and goes straight to decision_pack_version).
    // This proves the tenant-scoped query path executed at all with the session
    // identity; the decisive proof that it's the SESSION tenant (not the
    // attacker-supplied query param) is the source-level absence check below.
    expect(response.status).toBe(404);
    expect(body.error).toContain('Decision Pack non trovato');
  });

  it('SOURCE (decisive): the route never reads tenantId/tenantCode from searchParams — only reportingPeriod is read from the URL', () => {
    const routeSrc = src('app/api/company/decision-pack/route.ts');
    const pdfRouteSrc = src('app/api/company/decision-pack/pdf/route.ts');
    for (const s of [routeSrc, pdfRouteSrc]) {
      expect(s).not.toMatch(/searchParams\.get\(['"]tenant(Id|Code)['"]\)/);
      expect(s).toMatch(/const \{ tenantId \} = authResult/);
    }
  });
});

describe('CC-014 Phase 5 — tenant isolation: admin Decision Pack routes require KORA_ADMIN and an explicit tenantCode', () => {
  it('admin PDF route rejects non-admin auth before touching data', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireKoraAdmin.mockResolvedValue(NextResponse.json({ error: 'Forbidden — KORA_ADMIN role required' }, { status: 403 }));

    const { GET } = await import('@/app/api/admin/decision-pack/pdf/route');
    const { NextRequest } = await import('next/server');
    const req = new NextRequest('https://kora.test/api/admin/decision-pack/pdf?tenantCode=ANY');
    const response = await GET(req);
    expect(response.status).toBe(403);
  });

  it('admin preview route requires an explicit tenantCode — no silent cross-tenant default', async () => {
    mockRequireKoraAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@kora.test', koraRole: 'KORA_ADMIN' });
    const { GET } = await import('@/app/api/admin/decision-pack/preview/route');
    const { NextRequest } = await import('next/server');
    const req = new NextRequest('https://kora.test/api/admin/decision-pack/preview'); // no tenantCode
    const response = await GET(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('tenantCode is required');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 6 — PRIVACY ATTACK
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 6 — privacy: no worker-level data path exists in the canonical content model or renderer', () => {
  it('PdfData type (pdf-data.ts) has no worker-identifying field actually used as data (defensive comments declaring their ABSENCE, like "no workerPseudonymId", are expected and fine)', () => {
    const pdfData = src('lib/decision-pack/pdf-data.ts');
    // Real usage would be a field/property use: `workerId:`, `.workerEmail`,
    // etc. A bare mention inside a "no X here" comment does not count — the
    // file explicitly documents at 6 points that it excludes these.
    for (const forbidden of [/\bworker_id\s*:/, /\bworkerId\s*:/, /\.workerEmail\b/, /\bworker_email\s*:/, /\.workerName\b/, /\bworker_name\s*:/, /\bworkerPseudonymId\s*[:=]/]) {
      expect(pdfData).not.toMatch(forbidden);
    }
  });

  it('html-template.ts never renders a per-worker loop or worker identifier field', () => {
    const html = src('lib/decision-pack/html-template.ts');
    for (const forbidden of [/worker_id/, /workerId/, /workerEmail/, /worker_name/]) {
      expect(html).not.toMatch(forbidden);
    }
  });

  it('BEHAVIORAL: a UEF row with an individual-signal payload field still only surfaces in tenant-level AGGREGATE counts, never verbatim', async () => {
    pdfDataTables = {
      ...fullSentinelTables(),
      uef_record: {
        data: [{
          review_status: 'approved', approved_for_scoring: true, data_completeness_score: 0.9,
          payload: {
            budget_class: 'deep_activation', budget_amount: 100, evidence_level: 'L2', financial_confidence: 0.7,
            // Adversarial: attempt to sneak an individual-looking field into the payload.
            worker_name: 'Mario Rossi', worker_email: 'mario.rossi@example.com',
          },
        }],
        error: null,
      },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('Mario Rossi');
    expect(serialized).not.toContain('mario.rossi@example.com');
  });

  it('no department/site/segment breakdown field exists on PdfData (no small-group differencing surface)', () => {
    const pdfData = src('lib/decision-pack/pdf-data.ts');
    expect(pdfData).not.toMatch(/department_activation|site_activation|departmentGaps|siteGaps/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 7 — MISSING-DATA ATTACK
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 7 — missing-data behavior is deterministic, never a synthetic fallback', () => {
  it('no KORA Index result -> fetchPdfData returns null', async () => {
    pdfDataTables = { tenant: { data: SENTINEL_TENANT, error: null }, kora_index_result: { data: null, error: null } };
    const fetchPdfData = await loadFetchPdfData();
    expect(await fetchPdfData('SENTINEL', '2099-Q9')).toBeNull();
  });

  it('no Confidence row (join null) -> confidenceScore is exactly 0, not a fabricated value', async () => {
    pdfDataTables = {
      ...fullSentinelTables(),
      kora_index_result: { data: { ...SENTINEL_KI_ROW, confidence_result: null }, error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');
    expect(result!.koraIndex.confidenceScore).toBe(0);
  });

  it('no BTI row (decision_pack_version.bti_result_id null) -> bti is exactly null, not zeros-as-data', async () => {
    pdfDataTables = { ...fullSentinelTables(), decision_pack_version: { data: { ...SENTINEL_DP_ROW, bti_result_id: null }, error: null } };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');
    expect(result!.bti).toBeNull();
  });

  it('no evidence gaps -> reportingReadiness is exactly null', async () => {
    pdfDataTables = {
      ...fullSentinelTables(),
      uef_record: { data: [{ review_status: 'approved', approved_for_scoring: true, data_completeness_score: 0.9, payload: { budget_class: 'deep_activation', budget_amount: 1, evidence_level: 'L1' } }], error: null },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');
    expect(result!.reportingReadiness).toBeNull();
  });

  it('no Decision Pack version row -> meta fields fall back to documented sentinels ("N/A"/"draft"), not fabricated identifiers', async () => {
    pdfDataTables = { ...fullSentinelTables(), decision_pack_version: { data: null, error: null } };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');
    expect(result!.meta.decisionPackVersionId).toBe('N/A');
    expect(result!.meta.decisionPackId).toBe('N/A');
    expect(result!.meta.decisionPackStatus).toBe('draft');
    expect(result!.bti).toBeNull(); // no bti_result_id available either
  });

  it('missing methodology metadata falls back to documented defaults, never blank/undefined', async () => {
    pdfDataTables = { ...fullSentinelTables(), kora_index_result: { data: { ...SENTINEL_KI_ROW, methodology_version_id: null, calibration_status: null }, error: null } };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');
    expect(result!.koraIndex.methodologyVersionId).toBe('KORA Index v1.0');
    expect(result!.koraIndex.calibrationStatus).toBe('pre_empirical_calibration');
  });

  it('empty UEF record set -> enrichment/reportingAlignment/reportingReadiness/iuSummary all exactly null, route-level 404 not triggered by this alone', async () => {
    pdfDataTables = { ...fullSentinelTables(), uef_record: { data: [], error: null }, impact_unit: { data: [], error: null } };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');
    expect(result).not.toBeNull(); // KORA Index still exists — the document still renders
    expect(result!.enrichment).toBeNull();
    expect(result!.reportingAlignment).toBeNull();
    expect(result!.reportingReadiness).toBeNull();
    expect(result!.iuSummary).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 8 — REPORT FACTORY CONTAINMENT
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 8 — ReportFactoryService stays outside the canonical document path', () => {
  const routes = [
    'app/api/company/decision-pack/route.ts',
    'app/api/company/decision-pack/pdf/route.ts',
    'app/api/admin/decision-pack/pdf/route.ts',
    'app/api/admin/decision-pack/preview/route.ts',
  ];

  it.each(routes)('%s does not import ReportFactoryService', (route) => {
    expect(src(route)).not.toMatch(/ReportFactoryService/);
  });

  it('pdf-data.ts, html-template.ts, pdf-runtime.ts do not IMPORT ReportFactoryService or the synthetic seed (CC-013 added an explanatory doc-comment naming ReportFactoryService — that mention is expected and fine, only a real import/instantiation is checked)', () => {
    const REAL_USAGE = /import\s[^;]*ReportFactoryService[^;]*from|from\s*['"][^'"]*report-factory[^'"]*['"]|new\s+ReportFactoryService\s*\(|reportFactoryService\s*\./;
    for (const f of ['lib/decision-pack/pdf-data.ts', 'lib/decision-pack/html-template.ts', 'lib/decision-pack/pdf-runtime.ts']) {
      const content = src(f);
      expect(content).not.toMatch(REAL_USAGE);
      expect(content).not.toMatch(/decision-pack-versions\.json/);
    }
  });

  it('the known divergence (admin metadata pages -> ReportFactoryService -> synthetic seed) is still present, unfixed, and now scoped to exactly one real caller', () => {
    const factory = src('services/report-factory/ReportFactoryService.ts');
    expect(factory).toContain('data/synthetic/decision-pack-versions.json');
    const pipeline = src('app/admin/pipeline/page.tsx');
    const companies = src('app/admin/companies/[companyId]/page.tsx');
    expect(pipeline).toContain('reportFactoryService');
    // B-TRUTH Root Control Room Wave 3 Hardening (2026-08-30): root Control
    // Room was retired (now a redirect to the Gen 3 workspace tab) — it no
    // longer calls ReportFactoryService. pipeline remains the sole caller.
    expect(companies).not.toContain('reportFactoryService');
  });
});

// REPORT_FACTORY_SYNTHETIC_DIVERGENCE = OPEN / B-TRUTH — see CC-014 report.
// Narrowed by B-TRUTH Root Control Room Wave 3 Hardening (2026-08-30): the
// divergence's sole remaining runtime surface is app/admin/pipeline/page.tsx.

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 9 — REPORT GENERATOR RE-ENTRY GUARD (strengthened from CC-013)
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 9 — ReportGeneratorService production re-entry guard', () => {
  const RUNTIME_DIRS = ['app', 'services', 'lib', 'components'];
  const SELF_FILE = 'services/report-generator/ReportGeneratorService.ts';
  const EXCLUDED = new Set([SELF_FILE, 'lib/architecture/registry.ts']);
  const REAL_USAGE = /(?:^|\s)import\s[^;]*ReportGeneratorService[^;]*from|from\s*['"][^'"]*report-generator[^'"]*['"]|new\s+ReportGeneratorService\s*\(|reportGeneratorService\s*\./m;

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

  it('zero production callers, excluding comments/registry/tests/self', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED.has(relative)) continue;
        if (REAL_USAGE.test(src(relative))) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the service file itself still exists (not deleted)', () => {
    expect(() => src(SELF_FILE)).not.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 10 — EXECUTIVE NARRATIVE ATTACK
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 10 — computeExecutiveIntelligence is purely input-driven, no independent recomputation', () => {
  it('BEHAVIORAL: distinctive input values determine the narrative output deterministically; the same inputs computed twice are identical', async () => {
    const { computeExecutiveIntelligence } = await import('@/services/executive-intelligence/ExecutiveIntelligenceService');
    const inputs = {
      koraIndexValue: 8.42, safeguardStatus: 'FLAGGED' as const, confidenceScore: 0.15,
      activationRate: 0.05, meaningfulActivationRate: 0.02,
      macroblocks: [{ code: 'REACH' as const, label: 'Reach', weight: 0.25, score: 5, component_codes: [] }],
      equityAccess: null, evidenceReliability: null, lifeDiversity: null,
      limitedShare: null, economicReliefShare: null,
    };
    const a = computeExecutiveIntelligence(inputs);
    const b = computeExecutiveIntelligence(inputs);
    expect(a).toEqual(b);
    // Changing only koraIndexValue changes the narrative classification, proving it's input-derived, not fixed/hardcoded.
    const c = computeExecutiveIntelligence({ ...inputs, koraIndexValue: 92, safeguardStatus: 'CLEAR' as const });
    expect(c.organizationStatus).not.toBe(a.organizationStatus);
  });

  it('SOURCE: ExecutiveIntelligenceService imports no compute engine, no Supabase, no synthetic data', () => {
    const svc = src('services/executive-intelligence/ExecutiveIntelligenceService.ts');
    expect(svc).not.toMatch(/computeKoraIndex|computeConfidence|computeBTI|@supabase|data\/synthetic/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 11 — EVIDENCE GAP DERIVATION ATTACK
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 11 — evidence-gap local derivation edge cases', () => {
  function uefRow(payload: Record<string, unknown>) {
    return { review_status: 'approved', approved_for_scoring: true, data_completeness_score: 0.9, payload };
  }

  it('no records -> reportingAlignment and reportingReadiness both null', async () => {
    pdfDataTables = { ...fullSentinelTables(), uef_record: { data: [], error: null } };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');
    expect(result!.reportingAlignment).toBeNull();
    expect(result!.reportingReadiness).toBeNull();
  });

  it('duplicate areas across records merge deterministically (counts sum, most-conservative readiness wins)', async () => {
    pdfDataTables = {
      ...fullSentinelTables(),
      uef_record: {
        data: [
          uefRow({ evidence_gaps: [{ areaCode: 'DUP', areaLabel: 'Dup', readiness: 'report_ready', missingEvidence: ['x'], recommendedActions: ['y'] }] }),
          uefRow({ evidence_gaps: [{ areaCode: 'DUP', areaLabel: 'Dup', readiness: 'not_ready', missingEvidence: ['z'], recommendedActions: [] }] }),
        ],
        error: null,
      },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');
    const gap = result!.reportingReadiness!.topEvidenceGaps.find((g) => g.areaCode === 'DUP');
    expect(gap).toBeDefined();
    expect(gap!.readiness).toBe('not_ready'); // most conservative (lowest rank) wins
    expect(gap!.missingEvidence).toEqual(expect.arrayContaining(['x', 'z']));
  });

  it('null/unknown area code is silently skipped, not fabricated as "unknown"', async () => {
    pdfDataTables = {
      ...fullSentinelTables(),
      uef_record: {
        data: [
          uefRow({ reporting_alignment: { areas: [{ code: '', label: 'Empty', strength: 'strong' }] } }),
          uefRow({ evidence_gaps: [{ areaCode: '', areaLabel: 'Empty', readiness: 'report_ready' }] }),
        ],
        error: null,
      },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');
    expect(result!.reportingAlignment).toBeNull();
    expect(result!.reportingReadiness).toBeNull();
  });

  it('multiple distinct areas each appear with correct independent counts', async () => {
    pdfDataTables = {
      ...fullSentinelTables(),
      uef_record: {
        data: [
          uefRow({ reporting_alignment: { areas: [{ code: 'A1', label: 'A1', strength: 'strong' }] } }),
          uefRow({ reporting_alignment: { areas: [{ code: 'A2', label: 'A2', strength: 'weak' }] } }),
          uefRow({ reporting_alignment: { areas: [{ code: 'A1', label: 'A1', strength: 'medium' }] } }),
        ],
        error: null,
      },
    };
    const fetchPdfData = await loadFetchPdfData();
    const result = await fetchPdfData('SENTINEL', '2099-Q9');
    const a1 = result!.reportingAlignment!.areas.find((a) => a.code === 'A1')!;
    const a2 = result!.reportingAlignment!.areas.find((a) => a.code === 'A2')!;
    expect(a1.count).toBe(2);
    expect(a2.count).toBe(1);
  });

  it('does not leak cross-tenant data — aggregation is scoped by the tenant_id/reporting_period filter the query already applies (structural check)', () => {
    const pdfData = src('lib/decision-pack/pdf-data.ts');
    // Both uef_record queries filter by tenant_id AND reporting_period — the
    // aggregation logic itself has no cross-tenant merge path because it only
    // ever sees rows the query already scoped to one tenant+period.
    const uefQueryBlock = pdfData.slice(pdfData.indexOf("from('uef_record')"), pdfData.indexOf("from('uef_record')") + 400);
    expect(uefQueryBlock).toContain("eq('tenant_id'");
    expect(uefQueryBlock).toContain("eq('reporting_period'");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 13 — ONE PRODUCT / ONE TRUTH ATTACK
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 13 — one product / one truth: no synthetic input anywhere on the live path', () => {
  const canonicalFiles = [
    'lib/decision-pack/pdf-data.ts',
    'lib/decision-pack/html-template.ts',
    'lib/decision-pack/pdf-runtime.ts',
    'lib/decision-pack/pdf-strategy.ts',
    'app/api/company/decision-pack/route.ts',
    'app/api/company/decision-pack/pdf/route.ts',
    'app/api/admin/decision-pack/pdf/route.ts',
    'app/api/admin/decision-pack/preview/route.ts',
  ];

  it.each(canonicalFiles)('%s has zero data/synthetic import', (file) => {
    expect(src(file)).not.toMatch(/data\/synthetic/);
  });

  it.each(canonicalFiles)('%s has zero scoring-simulator/demo-adapter import', (file) => {
    expect(src(file)).not.toMatch(/ScoringSimulatorService|DemoScoringAdapter|scoringSimulatorService/);
  });

  it.each(canonicalFiles)('%s has no hardcoded KORA Index/Confidence/BTI numeric literal masquerading as data', (file) => {
    // A hardcoded number assigned directly to one of these fields (rather than
    // read off a fetched row) would look like `kora_index_value: <number>` or
    // `confidence_score: <number>` as a literal, not `.kora_index_value` /
    // `?? 0` fallback. None of the canonical files assign these fields a
    // non-zero/non-fallback literal.
    const content = src(file);
    expect(content).not.toMatch(/kora_index_value:\s*[1-9]/);
    expect(content).not.toMatch(/confidence_score:\s*0\.[1-9]/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 14 — REGISTRY TRUTH ATTACK
// ═════════════════════════════════════════════════════════════════════════════

describe('CC-014 Phase 14 — registry claims match reality', () => {
  it('lib.decision-pack is CANONICAL with D-B decisionRef', async () => {
    const { ARCHITECTURE_REGISTRY } = await import('@/lib/architecture/registry');
    const pack = ARCHITECTURE_REGISTRY.find((c) => c.id === 'lib.decision-pack');
    expect(pack?.status).toBe('CANONICAL');
    expect(pack?.decisionRef).toBe('CC-013 / D-B');
  });

  it('svc.report-factory is not CANONICAL and its notes mention the synthetic/B-TRUTH divergence', async () => {
    const { ARCHITECTURE_REGISTRY } = await import('@/lib/architecture/registry');
    const factory = ARCHITECTURE_REGISTRY.find((c) => c.id === 'svc.report-factory');
    expect(factory?.status).not.toBe('CANONICAL');
    expect(factory?.notes).toMatch(/B-TRUTH/);
    expect(factory?.notes).toMatch(/synthetic/i);
  });

  it('svc.report-generator is not CANONICAL, not DEAD, and its notes record zero real callers', async () => {
    const { ARCHITECTURE_REGISTRY } = await import('@/lib/architecture/registry');
    const generator = ARCHITECTURE_REGISTRY.find((c) => c.id === 'svc.report-generator');
    expect(generator?.status).not.toBe('CANONICAL');
    expect(generator?.status).not.toBe('DEAD');
    expect(generator?.notes).toMatch(/ZERO real callers|zero real callers/i);
  });

  it('no registry note claims B-TRUTH (the ReportFactory synthetic divergence) is resolved', async () => {
    const { ARCHITECTURE_REGISTRY } = await import('@/lib/architecture/registry');
    const factory = ARCHITECTURE_REGISTRY.find((c) => c.id === 'svc.report-factory');
    expect(factory?.notes).not.toMatch(/B-TRUTH (resolved|closed|complete)/i);
  });
});
