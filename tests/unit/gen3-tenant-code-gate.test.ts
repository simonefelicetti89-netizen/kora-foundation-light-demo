/**
 * B-TRUTH — Gen 3 admin route identity activation, behavioral proof.
 *
 * app/admin/companies/[companyId]/{workspace,preview,evidence,submissions}
 * replaced their TenantService/tenants.json existence gate with a real
 * analytics.tenant lookup by tenant_code. This file proves the gate actually
 * behaves correctly under adversarial conditions, not just that the source
 * text mentions the right table/column (see tenant-identity-read-path-audit
 * .test.ts for the static-analysis coverage of these same four routes).
 *
 * Covered per route: valid live tenant_code, unknown tenant_code, a
 * synthetic-only legacy id ("meridiana-group") that is NOT in analytics.tenant,
 * DB error (no synthetic substitution), auth failure, and tenant A vs
 * tenant B isolation (the query is scoped to exactly the requested code).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockRow: { id: string } | null = null;
let mockError: { message: string } | null = null;
const capturedFilters: Array<{ column: string; value: unknown }> = [];

interface MockChain {
  eq: (column: string, value: unknown) => MockChain;
  maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
}

function makeChain(): MockChain {
  const chain: MockChain = {
    eq: (column: string, value: unknown) => {
      capturedFilters.push({ column, value });
      return chain;
    },
    maybeSingle: async () => ({ data: mockRow, error: mockError }),
  };
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceClient: () => ({
    schema: (_schema: string) => ({
      from: (_table: string) => ({
        select: (_cols: string) => makeChain(),
      }),
    }),
  }),
}));

const NOT_FOUND_SENTINEL = new Error('__NEXT_NOT_FOUND__');
const REDIRECT_SENTINEL = (path: string) => new Error(`__NEXT_REDIRECT__:${path}`);

vi.mock('next/navigation', () => ({
  notFound: () => { throw NOT_FOUND_SENTINEL; },
  redirect: (path: string) => { throw REDIRECT_SENTINEL(path); },
}));

const ADMIN_USER = { email: 'admin@kora.test', koraRole: 'KORA_ADMIN', id: 'admin-1' };

vi.mock('@/lib/auth/kora-session', () => ({
  requireKoraAdmin: vi.fn(async () => ADMIN_USER),
  isKoraAuthError: (v: unknown) => v !== ADMIN_USER,
}));

// Mock the panel components — JSX creation doesn't execute them, but importing
// the real files would pull in unrelated client-only browser code.
vi.mock('@/components/admin/CompanyWorkspacePanel', () => ({ CompanyWorkspacePanel: () => null }));
vi.mock('@/components/admin/CompanyLivePreviewPanel', () => ({ CompanyLivePreviewPanel: () => null }));
vi.mock('@/components/admin/CompanyEvidenceArchivePanel', () => ({ CompanyEvidenceArchivePanel: () => null }));
vi.mock('@/components/admin/AdminSubmissionQueue', () => ({ AdminSubmissionQueue: () => null }));

const ROUTES: Array<{ name: string; modulePath: string; exportName: string }> = [
  { name: 'workspace',   modulePath: '@/app/admin/companies/[companyId]/workspace/page',   exportName: 'default' },
  { name: 'preview',     modulePath: '@/app/admin/companies/[companyId]/preview/page',     exportName: 'default' },
  { name: 'evidence',    modulePath: '@/app/admin/companies/[companyId]/evidence/page',    exportName: 'default' },
  { name: 'submissions', modulePath: '@/app/admin/companies/[companyId]/submissions/page', exportName: 'default' },
];

for (const route of ROUTES) {
  describe(`B-TRUTH Gen 3 — ${route.name}/page.tsx tenant_code gate`, () => {
    beforeEach(() => {
      mockRow = null;
      mockError = null;
      capturedFilters.length = 0;
      vi.resetModules();
    });

    it('renders (does not throw notFound) for a real, active tenant_code', async () => {
      mockRow = { id: 'tenant-uuid-1' };
      const mod = await import(/* @vite-ignore */ route.modulePath);
      const Page = mod[route.exportName];
      const result = await Page({ params: Promise.resolve({ companyId: 'ACME-01' }) });
      expect(result).toBeTruthy();
    });

    it('throws notFound() for an unknown tenant_code (no synthetic substitution)', async () => {
      mockRow = null;
      const mod = await import(/* @vite-ignore */ route.modulePath);
      const Page = mod[route.exportName];
      await expect(Page({ params: Promise.resolve({ companyId: 'DOES-NOT-EXIST' }) }))
        .rejects.toThrow('__NEXT_NOT_FOUND__');
    });

    it('throws notFound() for the synthetic-only legacy id "meridiana-group" (not a real tenant_code)', async () => {
      mockRow = null; // meridiana-group is not seeded in analytics.tenant
      const mod = await import(/* @vite-ignore */ route.modulePath);
      const Page = mod[route.exportName];
      await expect(Page({ params: Promise.resolve({ companyId: 'meridiana-group' }) }))
        .rejects.toThrow('__NEXT_NOT_FOUND__');
      // Proves the lookup was actually attempted against the real table with
      // this exact string, not silently short-circuited to a demo fixture.
      expect(capturedFilters).toContainEqual({ column: 'tenant_code', value: 'meridiana-group' });
    });

    it('does not substitute a tenant on a DB error — throws instead of notFound or a fabricated render', async () => {
      mockRow = null;
      mockError = { message: 'connection refused' };
      const mod = await import(/* @vite-ignore */ route.modulePath);
      const Page = mod[route.exportName];
      await expect(Page({ params: Promise.resolve({ companyId: 'ACME-01' }) }))
        .rejects.toThrow(/connection refused/);
    });

    it('redirects to /admin/login when auth fails, before any tenant lookup', async () => {
      const kora = await import('@/lib/auth/kora-session');
      (kora.requireKoraAdmin as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ notAdmin: true });
      const mod = await import(/* @vite-ignore */ route.modulePath);
      const Page = mod[route.exportName];
      await expect(Page({ params: Promise.resolve({ companyId: 'ACME-01' }) }))
        .rejects.toThrow('__NEXT_REDIRECT__:/admin/login');
      expect(capturedFilters).toHaveLength(0);
    });

    it('tenant A vs tenant B: the query is scoped to exactly the requested tenant_code, never a different one', async () => {
      mockRow = { id: 'tenant-uuid-A' };
      const mod = await import(/* @vite-ignore */ route.modulePath);
      const Page = mod[route.exportName];
      await Page({ params: Promise.resolve({ companyId: 'TENANT-A' }) });
      expect(capturedFilters).toContainEqual({ column: 'tenant_code', value: 'TENANT-A' });
      expect(capturedFilters.some((f) => f.column === 'tenant_code' && f.value === 'TENANT-B')).toBe(false);

      capturedFilters.length = 0;
      await Page({ params: Promise.resolve({ companyId: 'TENANT-B' }) });
      expect(capturedFilters).toContainEqual({ column: 'tenant_code', value: 'TENANT-B' });
      expect(capturedFilters.some((f) => f.column === 'tenant_code' && f.value === 'TENANT-A')).toBe(false);
    });

    it('only matches active tenants (eq is_active=true), consistent with /api/admin/company-workspace', async () => {
      mockRow = { id: 'tenant-uuid-1' };
      const mod = await import(/* @vite-ignore */ route.modulePath);
      const Page = mod[route.exportName];
      await Page({ params: Promise.resolve({ companyId: 'ACME-01' }) });
      expect(capturedFilters).toContainEqual({ column: 'is_active', value: true });
    });
  });
}
