/**
 * CC-018 — B-TRUTH SEED GROUP #1: Company Pillar Adoption Distribution.
 *
 * Master Plan §19/§28 "One Truth per gruppo di seed": WorkerPillarAdoptionService
 * used to read data/synthetic/company-aggregates.json (pillar_distribution) for a
 * demo-only companyId. CC-018 migrates it onto analytics.activation_result.pillar_distribution
 * — the same canonical column already used by the Decision Pack (B-PACK,
 * lib/decision-pack/pdf-data.ts) — via a new session-authenticated API route,
 * since the panel is a client component and can no longer call the service
 * (now DB-backed) synchronously.
 *
 * CHARACTERIZATION (pre-migration behavior being preserved):
 *   - Exactly 5 pillar rows (LIFE, GROWTH, CONNECTION, IMPACT, LEGACY), each
 *     either { share: 0..1, suppressed: false } or { share: null, suppressed: true }.
 *   - Suppressed entirely (all 5 rows null) when: no record found, OR
 *     privacy_threshold_met = false, OR active_worker_count < SAFE_AGGREGATION_THRESHOLD.
 *   - suppressionReason is a human-readable Italian string.
 *   - No individual worker data at any path (no worker_id/display_name/PIB).
 *
 * WHAT CHANGED (the migration itself):
 *   - Source: data/synthetic/company-aggregates.json → analytics.activation_result
 *     (tenant-scoped, RLS-isolated, live pipeline output).
 *   - Signature: (companyId: string, scenarioId?: string) synchronous →
 *     (db: ServiceDb, tenantId: string) async.
 *   - scenarioId (a demo A/B artifact with no live equivalent) → reportingPeriod
 *     (the real activation_result.reporting_period column).
 *   - Caller: WorkerAdoptionPanel now fetches GET /api/company/pillar-adoption
 *     (tenant from session, never client-supplied) instead of importing the
 *     service singleton directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function read(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), 'utf-8');
}

// ── Mock chain builder for analytics.activation_result reads ─────────────────

let mockRow: Record<string, unknown> | null = null;
let mockError: { message: string } | null = null;
const capturedFilters: Array<{ column: string; value: unknown }> = [];

function makeChain() {
  const chain: any = {
    eq: (column: string, value: unknown) => {
      capturedFilters.push({ column, value });
      return chain;
    },
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: mockRow, error: mockError }),
  };
  return chain;
}

function makeMockDb() {
  return {
    schema: (_schemaName: string) => ({
      from: (_table: string) => ({
        select: (_cols: string) => makeChain(),
      }),
    }),
  } as never;
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: async () => ({
    schema: (_schemaName: string) => ({
      from: (_table: string) => ({
        select: (_cols: string) => makeChain(),
      }),
    }),
  }),
}));

vi.mock('@/lib/auth/kora-session', () => ({
  requireCompanyUser: vi.fn(),
  isKoraAuthError: (v: unknown) => v && typeof v === 'object' && 'isAuthError' in (v as object),
}));

describe('CC-018 — WorkerPillarAdoptionService (canonical, DB-backed)', () => {
  beforeEach(() => {
    mockRow = null;
    mockError = null;
    capturedFilters.length = 0;
    vi.resetModules();
  });

  it('normalizes activation_result.pillar_distribution (raw IU sums) into 0.0–1.0 shares', async () => {
    mockRow = {
      reporting_period: '2026-Q3',
      active_worker_count: 40,
      total_workers: 60,
      privacy_threshold_met: true,
      pillar_distribution: { LIFE: 30, GROWTH: 30, CONNECTION: 20, IMPACT: 10, LEGACY: 10 },
    };
    const { workerPillarAdoptionService } = await import('@/services/worker-pillar-adoption/WorkerPillarAdoptionService');
    const result = await workerPillarAdoptionService.getCompanyPillarAdoption(makeMockDb(), 'tenant-abc');

    expect(result.suppressed).toBe(false);
    expect(result.data).toHaveLength(5);
    const life = result.data.find((r) => r.pillar === 'LIFE');
    expect(life!.suppressed).toBe(false);
    expect((life as { share: number }).share).toBeCloseTo(0.3, 5);
    const sumShares = result.data.reduce((s, r) => s + (r.suppressed ? 0 : r.share), 0);
    expect(sumShares).toBeCloseTo(1.0, 5);
    expect(result.reportingPeriod).toBe('2026-Q3');
    expect(result.activeWorkerCount).toBe(40);
  });

  it('filters by tenant_id — the same tenantId the caller passes, never a client-supplied companyId', async () => {
    mockRow = {
      reporting_period: '2026-Q3', active_worker_count: 20, total_workers: 20,
      privacy_threshold_met: true, pillar_distribution: { LIFE: 10, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    };
    const { workerPillarAdoptionService } = await import('@/services/worker-pillar-adoption/WorkerPillarAdoptionService');
    await workerPillarAdoptionService.getCompanyPillarAdoption(makeMockDb(), 'real-tenant-uuid');
    expect(capturedFilters).toContainEqual({ column: 'tenant_id', value: 'real-tenant-uuid' });
  });

  it('suppresses entirely when no activation_result row exists for the tenant', async () => {
    mockRow = null;
    const { workerPillarAdoptionService } = await import('@/services/worker-pillar-adoption/WorkerPillarAdoptionService');
    const result = await workerPillarAdoptionService.getCompanyPillarAdoption(makeMockDb(), 'tenant-none');
    expect(result.suppressed).toBe(true);
    expect(result.data.every((r) => r.suppressed && r.share === null)).toBe(true);
    expect(result.suppressionReason).toBeTruthy();
  });

  it('suppresses when privacy_threshold_met = false, even if active_worker_count looks high', async () => {
    mockRow = {
      reporting_period: '2026-Q3', active_worker_count: 50, total_workers: 50,
      privacy_threshold_met: false, pillar_distribution: { LIFE: 10, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    };
    const { workerPillarAdoptionService } = await import('@/services/worker-pillar-adoption/WorkerPillarAdoptionService');
    const result = await workerPillarAdoptionService.getCompanyPillarAdoption(makeMockDb(), 'tenant-x');
    expect(result.suppressed).toBe(true);
    expect(result.suppressionReason).toContain('privacy');
  });

  it('suppresses when active_worker_count < SAFE_AGGREGATION_THRESHOLD (N≥10), independent of privacy_threshold_met', async () => {
    mockRow = {
      reporting_period: '2026-Q3', active_worker_count: 4, total_workers: 4,
      privacy_threshold_met: true, pillar_distribution: { LIFE: 10, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    };
    const { workerPillarAdoptionService } = await import('@/services/worker-pillar-adoption/WorkerPillarAdoptionService');
    const result = await workerPillarAdoptionService.getCompanyPillarAdoption(makeMockDb(), 'tenant-y');
    expect(result.suppressed).toBe(true);
  });

  it('propagates a real query error rather than silently returning empty data', async () => {
    mockRow = null;
    mockError = { message: 'connection refused' };
    const { workerPillarAdoptionService } = await import('@/services/worker-pillar-adoption/WorkerPillarAdoptionService');
    await expect(workerPillarAdoptionService.getCompanyPillarAdoption(makeMockDb(), 'tenant-z')).rejects.toThrow(/connection refused/);
  });
});

describe('CC-018 — GET /api/company/pillar-adoption (live, session-authenticated)', () => {
  beforeEach(() => {
    mockRow = null;
    mockError = null;
    capturedFilters.length = 0;
    vi.resetModules();
  });

  it('resolves tenantId from the session, never from a request param', async () => {
    mockRow = {
      reporting_period: '2026-Q3', active_worker_count: 15, total_workers: 15,
      privacy_threshold_met: true, pillar_distribution: { LIFE: 5, GROWTH: 5, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    };
    const { requireCompanyUser } = await import('@/lib/auth/kora-session');
    (requireCompanyUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenantId: 'session-tenant-42', koraRole: 'COMPANY_ADMIN', email: 'a@b.com',
    });

    const { GET } = await import('@/app/api/company/pillar-adoption/route');
    const req = new Request('https://kora.test/api/company/pillar-adoption?tenantId=attacker-supplied') as unknown as import('next/server').NextRequest;
    const res = await GET(req);
    const body = await (res as Response).json();

    expect(body.ok).toBe(true);
    expect(capturedFilters).toContainEqual({ column: 'tenant_id', value: 'session-tenant-42' });
    expect(capturedFilters.some((f) => f.value === 'attacker-supplied')).toBe(false);
  });

  it('returns the auth error unchanged when the session is invalid (fail closed)', async () => {
    const { requireCompanyUser } = await import('@/lib/auth/kora-session');
    const authError = { isAuthError: true, status: 401 };
    (requireCompanyUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(authError);

    const { GET } = await import('@/app/api/company/pillar-adoption/route');
    const req = new Request('https://kora.test/api/company/pillar-adoption') as unknown as import('next/server').NextRequest;
    const res = await GET(req);

    expect(res).toBe(authError);
  });
});

describe('CC-018 — no live/demo scoring divergence', () => {
  it('the route never imports data/synthetic — canonical DB path only', () => {
    const route = read('app/api/company/pillar-adoption/route.ts');
    expect(route).not.toContain('data/synthetic');
  });

  it('the service file never imports data/synthetic anymore', () => {
    const svc = read('services/worker-pillar-adoption/WorkerPillarAdoptionService.ts');
    expect(svc).not.toMatch(/^\s*import\s+.+\s+from\s+['"][^'"]*\/data\/synthetic\//m);
  });

  it('WorkerAdoptionPanel no longer holds a synchronous demo companyId->JSON lookup for pillar data', () => {
    const panel = read('components/company/cockpit/WorkerAdoptionPanel.tsx');
    expect(panel).not.toContain('workerPillarAdoptionService.getCompanyPillarAdoption(companyId');
  });
});

describe('CC-018 — I9 delta: allowlist shrank by exactly this group', () => {
  it('WorkerPillarAdoptionService is no longer in the synthetic import allowlist', async () => {
    const { SYNTHETIC_IMPORT_ALLOWLIST } = await import('@/lib/security/synthetic-import-allowlist');
    expect(SYNTHETIC_IMPORT_ALLOWLIST.some((e) => e.file.includes('worker-pillar-adoption'))).toBe(false);
  });
});
