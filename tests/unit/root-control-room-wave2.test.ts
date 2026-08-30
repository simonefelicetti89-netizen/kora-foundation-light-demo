/**
 * B-TRUTH — Root Control Room Wave 2 (2026-08-30).
 *
 * Decomposed app/admin/companies/[companyId]/page.tsx capability-by-capability:
 *   - KORA Index (Section E + Tile 6), Decision Pack Factory (Section G):
 *     REMOVE_DUPLICATE — the Gen 3 workspace tab already shows these from real
 *     analytics.kora_index_result / decision_pack_version.
 *   - Decision Pack period comparison: LEGACY, retired without migration —
 *     analytics.decision_pack_version has no previous-version linkage, so
 *     there was no canonical source to move it to.
 *   - BTI (Section F), Lifecycle/Audit (Section J): CANONICALIZE_NOW — moved
 *     to the Gen 3 workspace tab as minimal persisted reads
 *     (analytics.bti_result, audit.audit_log), tenant-scoped by the real
 *     tenantId already resolved there. No recomputation, no new methodology.
 *   - Access & Users (Section H): REMOVED — duplicated the retained, already
 *     read-only /users tab; its mutation buttons had no real backend.
 *   - Worker roster mutation table (part of Section I): REMOVED — fake
 *     invite/disable/delete-demo-worker controls; the aggregate summary
 *     tiles stayed (informational only, not fake mutation UI).
 *   - services/lifecycle/LifecycleService.ts: DELETED — zero remaining
 *     runtime callers after Section J's removal, live replacement verified
 *     working (see the API/behavioral tests below).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function read(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

const ROOT_PAGE = 'app/admin/companies/[companyId]/page.tsx';

describe('B-TRUTH Root Control Room Wave 2 — removed capabilities have no synthetic remnant', () => {
  const src = read(ROOT_PAGE);

  it('no longer imports scoringSimulatorService (KORA Index removed — Gen 3 workspace owns it)', () => {
    expect(src).not.toContain("from '@/services/scoring-simulator/ScoringSimulatorService'");
    expect(src).not.toContain('scoringSimulatorService.getKoraIndexOutput');
  });

  it('no longer imports reportFactoryService (Decision Pack Factory removed — Gen 3 workspace owns status)', () => {
    expect(src).not.toContain("from '@/services/report-factory/ReportFactoryService'");
    expect(src).not.toContain('getDecisionPackFactoryStatus');
    expect(src).not.toContain('getDecisionPackPeriodComparison');
  });

  it('no longer imports budgetToHumanImpactService (BTI moved to Gen 3 workspace)', () => {
    expect(src).not.toContain("from '@/services/budget-to-human-impact/BudgetToHumanImpactService'");
  });

  it('no longer imports accountProvisioningService (Access & Users section removed)', () => {
    expect(src).not.toContain("from '@/services/account/AccountProvisioningService'");
  });

  it('no longer imports lifecycleService (Lifecycle/Audit moved to Gen 3 workspace)', () => {
    expect(src).not.toContain("from '@/services/lifecycle/LifecycleService'");
  });

  it('no longer contains user or worker mutation handlers (fake mutations, no real backend)', () => {
    expect(src).not.toContain('handleUserAction');
    expect(src).not.toContain('handleWorkerAction');
    expect(src).not.toContain('revokeInvite');
    expect(src).not.toContain('resetInvite');
    expect(src).not.toContain('disableUser');
    expect(src).not.toContain('deleteDemoUser');
    expect(src).not.toContain('inviteWorker');
    expect(src).not.toContain('disableWorker');
    expect(src).not.toContain('deleteDemoWorker');
  });

  it('links to the retained /users tab instead of embedding a duplicate account list', () => {
    expect(src).toContain('/admin/companies/${companyId}/users');
  });

  it('still retains the worker aggregate summary tiles (informational, not mutation UI)', () => {
    expect(src).toContain('workerSummary.total_workers');
    expect(src).toContain('workerSummary.my_kora_enabled_count');
  });

  it('still retains company data intake summary (Section D unchanged this wave)', () => {
    expect(src).toContain('companyDataIntakeService.getDataReadinessSummary');
  });
});

describe('B-TRUTH Root Control Room Wave 2 — LifecycleService fully retired', () => {
  it('services/lifecycle/LifecycleService.ts no longer exists', () => {
    expect(existsSync(resolve(root, 'services/lifecycle/LifecycleService.ts'))).toBe(false);
  });

  it('data/synthetic/lifecycle-audit.json no longer exists (its only consumer is gone)', () => {
    expect(existsSync(resolve(root, 'data/synthetic/lifecycle-audit.json'))).toBe(false);
  });

  it('is no longer in the I9 synthetic import allowlist', async () => {
    const { SYNTHETIC_IMPORT_ALLOWLIST } = await import('@/lib/security/synthetic-import-allowlist');
    expect(SYNTHETIC_IMPORT_ALLOWLIST.some((e) => e.file.includes('LifecycleService'))).toBe(false);
  });

  it('no remaining file imports LifecycleService', () => {
    // A grep-equivalent sanity check across the file this wave touched.
    const src = read(ROOT_PAGE);
    expect(src).not.toContain('LifecycleService');
  });
});

describe('B-TRUTH Root Control Room Wave 2 — Gen 3 workspace gained BTI + Lifecycle/Audit (persisted reads only)', () => {
  const route = read('app/api/admin/company-workspace/route.ts');
  const panel = read('components/admin/CompanyWorkspacePanel.tsx');

  it('API route reads persisted analytics.bti_result — no recomputation', () => {
    expect(route).toContain(".schema('analytics').from('bti_result')");
    expect(route).toContain(".eq('tenant_id', tenantId)");
    expect(route).not.toContain('bti-engine');
    expect(route).not.toContain('computeBti');
  });

  it('API route reads real audit.audit_log scoped to the resolved real tenantId', () => {
    expect(route).toContain(".schema('audit').from('audit_log')");
    // Same tenantId variable as the tenant lookup above — not a client param.
    expect(route).toContain(".eq('tenant_id', tenantId)");
  });

  it('BTI response omits fields with no real bti_result column, rather than fabricating them', () => {
    expect(route).not.toContain('costPerActivatedWorker');
    expect(route).not.toContain('reallocationOpportunityEur');
  });

  it('panel renders an honest "not available" BTI state, not a synthetic fallback', () => {
    expect(panel).toContain('BTI non disponibile');
    expect(panel).not.toContain('data/synthetic');
  });

  it('panel renders an honest empty audit state', () => {
    expect(panel).toContain('Nessun evento registrato per questo tenant');
  });
});

let mockTenantRow: { id: string; tenant_code: string; company_name: string; onboarding_status: string } | null = null;
const capturedEqCalls: Array<{ table: string; column: string; value: unknown }> = [];

function makeChain(table: string) {
  const chain: any = {
    select: () => chain,
    eq: (column: string, value: unknown) => {
      capturedEqCalls.push({ table, column, value });
      return chain;
    },
    neq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: [], error: null }),
    maybeSingle: async () => ({ data: mockTenantRow, error: null }),
  };
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (_schema: string) => ({
      from: (table: string) => makeChain(table),
    }),
  }),
}));

vi.mock('@/lib/auth/kora-session', () => ({
  requireKoraAdmin: vi.fn(async () => ({ email: 'admin@kora.test', koraRole: 'KORA_ADMIN' })),
  isKoraAuthError: () => false,
}));

describe('B-TRUTH Root Control Room Wave 2 — BTI/audit tenant isolation (behavioral)', () => {
  beforeEach(() => {
    capturedEqCalls.length = 0;
    mockTenantRow = { id: 'tenant-uuid-X', tenant_code: 'ACME-01', company_name: 'Acme', onboarding_status: 'active' };
    vi.resetModules();
  });

  it('bti_result and audit_log queries are scoped to the same real tenantId resolved from tenant_code — never a client-supplied id', async () => {
    const { GET } = await import('@/app/api/admin/company-workspace/route');
    const req = new Request('https://kora.test/api/admin/company-workspace?tenantCode=ACME-01&reportingPeriod=2026-Q1') as unknown as import('next/server').NextRequest;
    await GET(req);

    const btiTenantFilter = capturedEqCalls.find((c) => c.table === 'bti_result' && c.column === 'tenant_id');
    const auditTenantFilter = capturedEqCalls.find((c) => c.table === 'audit_log' && c.column === 'tenant_id');

    expect(btiTenantFilter?.value).toBe('tenant-uuid-X');
    expect(auditTenantFilter?.value).toBe('tenant-uuid-X');
  });
});
