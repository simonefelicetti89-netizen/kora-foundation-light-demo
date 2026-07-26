/**
 * PILOT-TRUST-01 (F-08 discovery) — app/worker/layout.tsx must only hard-block
 * KORA_ADMIN, not every authenticated role.
 *
 * getCurrentKoraUser() returns a truthy object for ANY authenticated user
 * whose app_metadata.kora_role is set to anything (it only checks presence,
 * not equality to 'KORA_ADMIN' — see lib/auth/kora-session.ts). The bare
 * `if (koraAdmin)` previously in app/worker/layout.tsx therefore hard-blocked
 * every WORKER from their own workspace with the "Accesso negato" screen —
 * discovered while building the golden-path E2E smoke (a real WORKER session,
 * cookie-injected past the CSP restriction on local Supabase, rendered the
 * KORA_ADMIN block instead of the workspace). Fixed by checking
 * `koraAdmin?.koraRole === 'KORA_ADMIN'` explicitly, matching every other
 * caller of getCurrentKoraUser() in this codebase (app/partner/layout.tsx,
 * app/company/workspace/layout.tsx, app/admin/workers/page.tsx, etc.).
 */

import { describe, expect, it, vi } from 'vitest';

const mockGetCurrentKoraUser = vi.fn();
const mockGetCurrentWorkerUser = vi.fn();

vi.mock('@/lib/auth/kora-session', () => ({
  getCurrentKoraUser: () => mockGetCurrentKoraUser(),
  getCurrentWorkerUser: () => mockGetCurrentWorkerUser(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

describe('app/worker/layout.tsx — hard-blocks KORA_ADMIN only, not every role', () => {
  it('renders children (not the access-denied block) for a real WORKER session', async () => {
    mockGetCurrentKoraUser.mockResolvedValue({ id: 'w1', email: 'worker@e2e-local.test', koraRole: 'WORKER' });
    mockGetCurrentWorkerUser.mockResolvedValue({
      id: 'w1', email: 'worker@e2e-local.test', koraRole: 'WORKER', tenantId: 't1', workerId: 'wi1', workerStatus: 'active',
    });

    const { default: WorkerLayout } = await import('@/app/worker/layout');
    const element = await WorkerLayout({ children: 'WORKSPACE_CONTENT' as unknown as React.ReactNode });

    const rendered = JSON.stringify(element);
    expect(rendered).toContain('WORKSPACE_CONTENT');
    expect(rendered).not.toContain('Accesso negato');
    expect(rendered).not.toContain('worker_individual_pib');
  });

  it('still hard-blocks a real KORA_ADMIN session with the access-denied screen', async () => {
    mockGetCurrentKoraUser.mockResolvedValue({ id: 'a1', email: 'admin@e2e-local.test', koraRole: 'KORA_ADMIN' });
    mockGetCurrentWorkerUser.mockResolvedValue(null);

    const { default: WorkerLayout } = await import('@/app/worker/layout');
    const element = await WorkerLayout({ children: 'WORKSPACE_CONTENT' as unknown as React.ReactNode });

    const rendered = JSON.stringify(element);
    expect(rendered).toContain('Accesso negato');
    expect(rendered).toContain('worker_individual_pib');
    expect(rendered).not.toContain('WORKSPACE_CONTENT');
  });

  it('redirects to /login when there is no session at all (unchanged behavior)', async () => {
    mockGetCurrentKoraUser.mockResolvedValue(null);
    mockGetCurrentWorkerUser.mockResolvedValue(null);

    const { default: WorkerLayout } = await import('@/app/worker/layout');
    await expect(WorkerLayout({ children: 'WORKSPACE_CONTENT' as unknown as React.ReactNode })).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  // FASE 3 adversarial review (KORA-PILOT-ADVERSARIAL-01): minimum role
  // coverage explicitly requested — COMPANY_ADMIN, PARTNER, and DEMO_VIEWER
  // must all be denied (redirected to /login, never shown children, never
  // shown the KORA_ADMIN-specific block). For each of these,
  // getCurrentKoraUser() is real-world truthy (any authenticated role) but
  // getCurrentWorkerUser()/requireWorkerUser() correctly rejects a non-WORKER
  // role — this is the actual interaction between the two functions in
  // production, not a simplification.
  it.each(['COMPANY_ADMIN', 'PARTNER', 'DEMO_VIEWER'])(
    'redirects %s to /login — never children, never the KORA_ADMIN block',
    async (role) => {
      mockGetCurrentKoraUser.mockResolvedValue({ id: 'x1', email: `${role.toLowerCase()}@e2e-local.test`, koraRole: role });
      mockGetCurrentWorkerUser.mockResolvedValue(null);

      const { default: WorkerLayout } = await import('@/app/worker/layout');
      await expect(WorkerLayout({ children: 'WORKSPACE_CONTENT' as unknown as React.ReactNode })).rejects.toThrow('NEXT_REDIRECT:/login');
    },
  );

  it('redirects to /login for a WORKER whose account is disabled (requireWorkerUser rejects, getCurrentWorkerUser returns null)', async () => {
    mockGetCurrentKoraUser.mockResolvedValue({ id: 'w2', email: 'disabled-worker@e2e-local.test', koraRole: 'WORKER' });
    mockGetCurrentWorkerUser.mockResolvedValue(null); // requireWorkerUser() returns 403 for workerStatus === 'disabled'; getCurrentWorkerUser() converts any error response to null

    const { default: WorkerLayout } = await import('@/app/worker/layout');
    await expect(WorkerLayout({ children: 'WORKSPACE_CONTENT' as unknown as React.ReactNode })).rejects.toThrow('NEXT_REDIRECT:/login');
  });
});
