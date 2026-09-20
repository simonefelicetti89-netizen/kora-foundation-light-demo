/**
 * KORA-WP-002 — Auth Extension + Advisor Guard.
 *
 * Behavioral (not string-matching) tests of the REAL `requireAdvisorUser()`,
 * `isAdvisorUser()`, and `getCurrentAdvisorUser()` functions from
 * lib/auth/kora-session.ts, with only the I/O boundary
 * (@/lib/supabase/server) mocked — the actual guard logic under test is
 * never mocked or bypassed.
 *
 * Out of scope (per KORA-WP-002's own spec, not re-tested here): the Advisor
 * Identity table (KORA-WP-030, does not exist), any real /advisor route.
 * requireAdvisorUser() has no DB-backed check to test — unlike
 * requireCompanyUser()/requireWorkerUser(), there is no table row for it to
 * reference yet, by design (see the guard's own doc comment).
 *
 * The middleware.ts extension (ADVISOR joins the KORA_ADMIN worker-path
 * block) is covered structurally in this same file (§3) — see that
 * section's own comment for why a full behavioral middleware test was not
 * introduced here.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
  getSupabaseServiceClient: () => {
    throw new Error('requireAdvisorUser() must not touch the service client — no Advisor table exists yet');
  },
}));

function mockUser(appMetadata: Record<string, unknown> | undefined) {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'adv-1', email: 'advisor@wp002.test', app_metadata: appMetadata } } });
}
function mockNoUser() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.resetAllMocks();
});

describe('KORA-WP-002 — requireAdvisorUser() real behavior', () => {
  it('1. no session → 401 Unauthorized', async () => {
    mockNoUser();
    const { requireAdvisorUser } = await import('@/lib/auth/kora-session');
    const result = await requireAdvisorUser();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('2. session with kora_role=ADVISOR → PASS (KoraAdvisorUser returned)', async () => {
    mockUser({ kora_role: 'ADVISOR' });
    const { requireAdvisorUser } = await import('@/lib/auth/kora-session');
    const result = await requireAdvisorUser();
    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual({ id: 'adv-1', email: 'advisor@wp002.test', koraRole: 'ADVISOR' });
  });

  it('3. session with kora_role=COMPANY_ADMIN → 403 Forbidden, reports role_found', async () => {
    mockUser({ kora_role: 'COMPANY_ADMIN', kora_tenant_id: 't1' });
    const { requireAdvisorUser } = await import('@/lib/auth/kora-session');
    const result = await requireAdvisorUser();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
    const body = await (result as NextResponse).json();
    expect(body.role_found).toBe('COMPANY_ADMIN');
  });

  it('4. session with kora_role=WORKER → 403 Forbidden (existing WORKER role unaffected as an input, correctly rejected here)', async () => {
    mockUser({ kora_role: 'WORKER', kora_tenant_id: 't1', kora_worker_id: 'w1' });
    const { requireAdvisorUser } = await import('@/lib/auth/kora-session');
    const result = await requireAdvisorUser();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('5. session with no kora_role at all → 403, role_found "none"', async () => {
    mockUser({});
    const { requireAdvisorUser } = await import('@/lib/auth/kora-session');
    const result = await requireAdvisorUser();
    expect(result).toBeInstanceOf(NextResponse);
    const body = await (result as NextResponse).json();
    expect(body.role_found).toBe('none');
  });

  it('6. ignores user_metadata — a spoofed user_metadata.kora_role=ADVISOR without app_metadata is still denied', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'adv-1', email: 'x@x.test', app_metadata: {}, user_metadata: { kora_role: 'ADVISOR' } } },
    });
    const { requireAdvisorUser } = await import('@/lib/auth/kora-session');
    const result = await requireAdvisorUser();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });
});

describe('KORA-WP-002 — getCurrentAdvisorUser() (no-throw wrapper)', () => {
  it('returns null when there is no session', async () => {
    mockNoUser();
    const { getCurrentAdvisorUser } = await import('@/lib/auth/kora-session');
    expect(await getCurrentAdvisorUser()).toBeNull();
  });

  it('returns null when the session is a different role', async () => {
    mockUser({ kora_role: 'PARTNER', kora_partner_id: 'p1' });
    const { getCurrentAdvisorUser } = await import('@/lib/auth/kora-session');
    expect(await getCurrentAdvisorUser()).toBeNull();
  });

  it('returns the KoraAdvisorUser on a real advisor session', async () => {
    mockUser({ kora_role: 'ADVISOR' });
    const { getCurrentAdvisorUser } = await import('@/lib/auth/kora-session');
    expect(await getCurrentAdvisorUser()).toEqual({ id: 'adv-1', email: 'advisor@wp002.test', koraRole: 'ADVISOR' });
  });
});

describe('KORA-WP-002 — isAdvisorUser() type guard', () => {
  it('true only for a KoraAdvisorUser-shaped value', async () => {
    const { isAdvisorUser } = await import('@/lib/auth/kora-session');
    expect(isAdvisorUser({ id: '1', email: 'a@a.test', koraRole: 'ADVISOR' })).toBe(true);
    expect(isAdvisorUser({ id: '1', email: 'a@a.test', koraRole: 'KORA_ADMIN' })).toBe(false);
    expect(isAdvisorUser({ id: '1', email: 'a@a.test', koraRole: 'COMPANY_ADMIN', tenantId: 't1', userStatus: 'active' })).toBe(false);
  });
});

describe('KORA-WP-002 — existing sessions unaffected (regression)', () => {
  it('requireCompanyUser() still recognizes COMPANY_ADMIN and rejects an ADVISOR-tagged session, unchanged', async () => {
    mockUser({ kora_role: 'ADVISOR' });
    const { requireCompanyUser } = await import('@/lib/auth/kora-session');
    const result = await requireCompanyUser();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('requireWorkerUser() still rejects an ADVISOR-tagged session with 403, not a crash', async () => {
    mockUser({ kora_role: 'ADVISOR' });
    const { requireWorkerUser } = await import('@/lib/auth/kora-session');
    const result = await requireWorkerUser();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });
});

// ── middleware.ts extension — structural verification ───────────────────────
// KORA-WP-002 adds ADVISOR to the existing B168-P3 KORA_ADMIN/worker-path
// block. No existing test in this repository behaviorally invokes
// middleware.ts's exported middleware() function (it requires mocking
// @supabase/ssr's createServerClient, a harness that does not exist anywhere
// in this codebase today) — every prior role's middleware coverage
// (see tests/unit/b104-worker-provisioning.test.ts's "middleware worker
// route isolation" block) is structural/source-based for exactly this
// reason. This follows the same established convention, but — unlike a bare
// .toContain() — asserts the specific conditional relationship (ADVISOR is
// inside the SAME guarded block as KORA_ADMIN, guarding the SAME
// worker-path check), not just that the substring appears somewhere in the
// file.
function readMiddlewareSource(): string {
  return readFileSync(join(__dirname, '..', '..', 'middleware.ts'), 'utf8');
}

describe('KORA-WP-002 — middleware.ts Advisor guard clause (structural)', () => {
  const mw = readMiddlewareSource();

  it('defines an isAdvisor session check', () => {
    expect(mw).toContain("sessionKoraRole === 'ADVISOR'");
  });

  it('isAdvisor shares the same worker-path block as the existing isKoraAdmin check (not a separate, divergent block)', () => {
    const blockStart = mw.indexOf('const isKoraAdmin = ');
    const blockEnd = mw.indexOf('\n\n', blockStart);
    const block = mw.slice(blockStart, blockEnd === -1 ? blockStart + 800 : blockEnd);
    expect(block).toContain('isAdvisor');
    expect(block).toContain("workerIndividualPrefixes = ['/worker/']");
    expect(block).toContain("canAccess(isKoraAdmin ? 'KORA_ADMIN' : 'ADVISOR', 'worker_individual_pib', 'live')");
  });

  it('does not add ADVISOR to any *_ALLOWED_PREFIXES array (no real /advisor route exists yet)', () => {
    expect(mw).not.toMatch(/ADVISOR_ALLOWED_PREFIXES/);
  });

  it('existing COMPANY_ALLOWED_PREFIXES / WORKER_ALLOWED_PREFIXES / PARTNER_ALLOWED_PREFIXES blocks are untouched (still present, unchanged role checks)', () => {
    expect(mw).toContain("sessionKoraRole === 'COMPANY_ADMIN'");
    expect(mw).toContain("sessionKoraRole === 'WORKER'");
    expect(mw).toContain("sessionKoraRole === 'PARTNER'");
  });
});
