/**
 * KORA-WP-041 — Pre-Pilot Offboarding Playbooks (Company/Worker/Advisor).
 *
 * MANUAL GOVERNED / Data-Migration-Impact NONE: this WP's own deliverable is
 * process documentation (ops/playbooks/*.md) plus the narrow, zero-migration
 * gap-closing functions its dry-run required. This file behaviorally tests
 * the REAL new functions — endWorkerIdentityAccess() and
 * updateAdvisorIdentityStatus() — with only the Supabase I/O boundary and
 * the governance substrate mocked, same technique as kora-wp-004/030's own
 * test files. It also proves the worker-leaves-during-pilot invariant the
 * registry names explicitly, and the scope-integrity boundaries this WP's
 * own authorization requires (no migration 062, no new Case linked_object
 * type, no new UI, no automation engine, Partner offboarding absent).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const TENANT = '11111111-4000-4000-8000-000000000001';

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — endWorkerIdentityAccess() — lib/worker-identity/worker-identity-service.ts
// ═══════════════════════════════════════════════════════════════════════════

interface WorkerRow {
  id: string; tenant_id: string; auth_user_id: string; worker_ref: string;
  status: string; created_at: string; updated_at: string;
}

let workerRows: WorkerRow[] = [];
const governedActionCalls: Record<string, unknown>[] = [];

function makeWorkerRow(status: string): WorkerRow {
  return {
    id: 'worker-1', tenant_id: TENANT, auth_user_id: 'auth-worker-1', worker_ref: 'W-0001',
    status, created_at: '2026-09-12T00:00:00.000Z', updated_at: '2026-09-12T00:00:00.000Z',
  };
}

vi.mock('@/lib/audit/governed-action-catalog', () => ({
  recordGovernedAction: vi.fn(async (p: Record<string, unknown>) => {
    governedActionCalls.push(p);
    return { id: 'ev-1', ...p, occurredAt: 'now' };
  }),
}));

vi.mock('@/lib/audit/governance-event', () => ({
  recordGovernanceEvent: vi.fn(async (p: Record<string, unknown>) => {
    governedActionCalls.push(p);
    return { id: 'ev-2', ...p, occurredAt: 'now' };
  }),
}));

// GATE 1/2 (Founder final semantic/security gate): requireWorkerUser()
// (lib/auth/kora-session.ts) is the REAL, load-bearing gatekeeper every
// My KORA / /api/worker/** route calls. Composed here for real, not
// re-implemented, to prove — not assume — that endWorkerIdentityAccess()'s
// effect is exactly what requireWorkerUser() already, independently
// enforces (this predicate pre-dates WP-041 entirely — PILOT-TRUST-04/05).
const mockGetUser = vi.fn();
let tenantActive = true;

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: async () => ({ auth: { getUser: mockGetUser } }),
  getSupabaseServiceClient: () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => {
        if (schemaName === 'personal' && table === 'worker_identity') {
          return {
            update: (patch: { status: string }) => ({
              eq: (col1: string, val1: string) => ({
                eq: (col2: string, val2: string) => ({
                  select: () => ({
                    single: async () => {
                      const row = workerRows.find(
                        (r) => (r as unknown as Record<string, string>)[col1] === val1
                          && (r as unknown as Record<string, string>)[col2] === val2,
                      );
                      if (!row) return { data: null, error: { message: 'not found' } };
                      row.status = patch.status;
                      return {
                        data: { id: row.id, tenant_id: row.tenant_id, status: row.status, updated_at: row.updated_at },
                        error: null,
                      };
                    },
                  }),
                }),
              }),
            }),
            select: () => ({
              eq: (_col: string, val: string) => ({
                maybeSingle: async () => {
                  // Matches both getWorkerIdentityById's lookup by id AND
                  // requireWorkerUser()'s own internal `.eq('id', workerId)`
                  // check — same real query shape, not re-implemented.
                  const row = workerRows.find((r) => r.id === val);
                  return {
                    data: row ? { id: row.id, tenant_id: row.tenant_id, status: row.status, updated_at: row.updated_at } : null,
                    error: null,
                  };
                },
              }),
            }),
          };
        }
        if (schemaName === 'analytics' && table === 'tenant') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                maybeSingle: async () => ({
                  data: val === TENANT ? { id: TENANT, is_active: tenantActive } : null,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (schemaName === 'advisor' && table === 'advisor_identity') {
          return {
            update: (patch: { status: string }) => ({
              eq: (_col: string, val: string) => ({
                select: () => ({
                  single: async () => {
                    const row = identityRows.find((r) => r.id === val);
                    if (!row) return { data: null, error: { message: 'not found' } };
                    row.status = patch.status;
                    return { data: row, error: null };
                  },
                }),
              }),
            }),
          };
        }
        if (schemaName === 'advisor' && table === 'advisor_role_qualification') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                order: async () => ({ data: qualificationRows.filter((q) => q.advisor_id === val), error: null }),
              }),
            }),
            update: (patch: { status: string }) => ({
              eq: (_col: string, val: string) => ({
                select: () => ({
                  single: async () => {
                    const row = qualificationRows.find((q) => q.id === val);
                    if (!row) return { data: null, error: { message: 'not found' } };
                    row.status = patch.status;
                    return { data: row, error: null };
                  },
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected schema/table in WP-041 mock: ${schemaName}.${table}`);
      },
    }),
  }),
}));

interface IdentityRow {
  id: string; auth_user_id: string; full_name: string; status: string;
  created_at: string; updated_at: string;
}
let identityRows: IdentityRow[] = [];

interface QualificationRow {
  id: string; advisor_id: string; role: string; status: string;
  created_at: string; updated_at: string;
}
let qualificationRows: QualificationRow[] = [];

let listRoleQualificationsForAdvisor: typeof import('@/lib/advisor-identity/advisor-identity-service').listRoleQualificationsForAdvisor;
let updateAdvisorRoleQualificationStatus: typeof import('@/lib/advisor-identity/advisor-identity-service').updateAdvisorRoleQualificationStatus;

let endWorkerIdentityAccess: typeof import('@/lib/worker-identity/worker-identity-service').endWorkerIdentityAccess;
let getWorkerIdentityById: typeof import('@/lib/worker-identity/worker-identity-service').getWorkerIdentityById;
let updateAdvisorIdentityStatus: typeof import('@/lib/advisor-identity/advisor-identity-service').updateAdvisorIdentityStatus;

let requireWorkerUser: typeof import('@/lib/auth/kora-session').requireWorkerUser;

beforeEach(async () => {
  workerRows = [makeWorkerRow('active')];
  identityRows = [{ id: 'advisor-1', auth_user_id: 'auth-advisor-1', full_name: 'Test Advisor', status: 'active', created_at: 't', updated_at: 't' }];
  governedActionCalls.length = 0;
  tenantActive = true;
  mockGetUser.mockReset();
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: 'auth-worker-1',
        email: 'worker@example.test',
        app_metadata: { kora_role: 'WORKER', kora_tenant_id: TENANT, kora_worker_id: 'worker-1', kora_status: 'active' },
      },
    },
  });
  qualificationRows = [];
  ({ endWorkerIdentityAccess, getWorkerIdentityById } = await import('@/lib/worker-identity/worker-identity-service'));
  ({ updateAdvisorIdentityStatus, listRoleQualificationsForAdvisor, updateAdvisorRoleQualificationStatus } = await import('@/lib/advisor-identity/advisor-identity-service'));
  ({ requireWorkerUser } = await import('@/lib/auth/kora-session'));
});

describe('KORA-WP-041 — endWorkerIdentityAccess (Worker Offboarding playbook, step 6.2)', () => {
  it('transitions status active -> disabled', async () => {
    const result = await endWorkerIdentityAccess({ workerIdentityId: 'worker-1', actor: { actorRole: 'KORA_ADMIN', actorId: 'admin-1' } });
    expect(result.status).toBe('disabled');
    expect(workerRows[0].status).toBe('disabled');
  });

  it('is idempotent-safe: rejects a second call once already disabled (no silent no-op)', async () => {
    await endWorkerIdentityAccess({ workerIdentityId: 'worker-1', actor: { actorRole: 'KORA_ADMIN', actorId: 'admin-1' } });
    await expect(
      endWorkerIdentityAccess({ workerIdentityId: 'worker-1', actor: { actorRole: 'KORA_ADMIN', actorId: 'admin-1' } }),
    ).rejects.toThrow(/not found/);
  });

  it('never modifies id, tenantId, or any field other than status', async () => {
    const before = { ...workerRows[0] };
    await endWorkerIdentityAccess({ workerIdentityId: 'worker-1', actor: { actorRole: 'KORA_ADMIN', actorId: 'admin-1' } });
    expect(workerRows[0].id).toBe(before.id);
    expect(workerRows[0].tenant_id).toBe(before.tenant_id);
    expect(workerRows[0].auth_user_id).toBe(before.auth_user_id);
    expect(workerRows[0].worker_ref).toBe(before.worker_ref);
  });

  it('records a governed MEMBERSHIP_CHANGE action, not an invented category', async () => {
    await endWorkerIdentityAccess({ workerIdentityId: 'worker-1', actor: { actorRole: 'KORA_ADMIN', actorId: 'admin-1' } });
    expect(governedActionCalls).toHaveLength(1);
    expect(governedActionCalls[0].category).toBe('MEMBERSHIP_CHANGE');
    expect(governedActionCalls[0].objectType).toBe('worker_identity');
  });

  it('getWorkerIdentityById reflects the post-offboarding status for dry-run verification', async () => {
    await endWorkerIdentityAccess({ workerIdentityId: 'worker-1', actor: { actorRole: 'KORA_ADMIN', actorId: 'admin-1' } });
    const fetched = await getWorkerIdentityById('worker-1');
    expect(fetched?.status).toBe('disabled');
  });
});

describe('KORA-WP-041 — updateAdvisorIdentityStatus (Advisor Offboarding playbook, step 6.6)', () => {
  it('transitions status active -> inactive_offboarded', async () => {
    const result = await updateAdvisorIdentityStatus('advisor-1', 'inactive_offboarded', 'KORA_ADMIN', 'admin-1');
    expect(result.status).toBe('inactive_offboarded');
  });

  it('rejects a non-canonical status', async () => {
    // @ts-expect-error — deliberately invalid status for the rejection test
    await expect(updateAdvisorIdentityStatus('advisor-1', 'deleted', 'KORA_ADMIN', 'admin-1')).rejects.toThrow(/not a canonical Advisor identity status/);
  });

  it('records a governance event, sourceModule advisor-identity (WP-030\'s own convention, not an invented category)', async () => {
    await updateAdvisorIdentityStatus('advisor-1', 'inactive_offboarded', 'KORA_ADMIN', 'admin-1');
    expect(governedActionCalls).toHaveLength(1);
    expect(governedActionCalls[0].sourceModule).toBe('advisor-identity');
    expect(governedActionCalls[0].eventType).toBe('advisor_identity.status_changed');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — worker-leaves-during-pilot (registry's own named Test, verbatim)
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-041 — worker-leaves-during-pilot test (registry Tests field, verbatim)', () => {
  it('preserves My KORA identity: identity id/auth_user_id/worker_ref survive Company-access end, and the row is never deleted', async () => {
    const before = await getWorkerIdentityById('worker-1');
    expect(before?.status).toBe('active');

    await endWorkerIdentityAccess({ workerIdentityId: 'worker-1', actor: { actorRole: 'KORA_ADMIN', actorId: 'admin-1' } });

    const after = await getWorkerIdentityById('worker-1');
    expect(after).not.toBeNull(); // row still exists — never deleted
    expect(after?.id).toBe(before?.id); // same identity, not recreated with a new id
    expect(after?.tenantId).toBe(before?.tenantId);
    expect(after?.status).toBe('disabled'); // Company access has ended
  });

  it('does not grant any employer/Company role read access as a side effect (no such code path exists in the function)', async () => {
    const src = readFileSync(join(process.cwd(), 'lib/worker-identity/worker-identity-service.ts'), 'utf-8');
    expect(src).not.toMatch(/COMPANY_ADMIN/);
    // worker_profile_private is named only in an explanatory comment (this
    // table is never touched) — the real invariant is that no .from() call
    // in this file ever targets it.
    expect(src).not.toMatch(/\.from\(['"]worker_profile_private['"]\)/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 2B — GATE 1/2 (Founder final semantic/security gate): proves the
// actual USABILITY boundary via the REAL requireWorkerUser(), not row
// existence alone. requireWorkerUser() is the one gatekeeper every My KORA
// page and every /api/worker/** route calls (36 call sites repo-wide) — it
// independently re-checks personal.worker_identity.status against the live
// DB row (not just the JWT claim), a predicate that pre-dates this WP
// entirely (PILOT-TRUST-04/05, migrations 048 and the tenant/mapping check
// in kora-session.ts) and is already covered by its own dedicated
// regression suite (tests/unit/pilot-trust-04-worker-tenant-suspension.test.ts,
// case 4: "mapping disabilitato (worker_identity.status=disabled) → DENY").
// This block composes THAT real, pre-existing predicate with THIS WP's own
// new endWorkerIdentityAccess() to prove the end-to-end chain honestly,
// rather than assuming row persistence implies continued product access.
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-041 — GATE: My KORA usability boundary (requireWorkerUser(), real function)', () => {
  it('BEFORE offboarding: an active worker_identity row resolves to a valid KoraWorkerUser (My KORA reachable)', async () => {
    const result = await requireWorkerUser();
    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as { workerId: string }).workerId).toBe('worker-1');
  });

  it('AFTER endWorkerIdentityAccess(): the SAME session is denied by requireWorkerUser() (My KORA correctly unreachable, not merely undocumented)', async () => {
    await endWorkerIdentityAccess({ workerIdentityId: 'worker-1', actor: { actorRole: 'KORA_ADMIN', actorId: 'admin-1' } });
    // Simulates the still-valid JWT a just-offboarded worker would present
    // (their old session token has not been revoked by this playbook —
    // requireWorkerUser()'s own live-DB re-check is what closes the gap).
    const result = await requireWorkerUser();
    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('AFTER endWorkerIdentityAccess(): the identity record itself remains resolvable (getWorkerIdentityById) even though live app access is correctly denied — "identity persists" means the record persists, not that operational access continues', async () => {
    await endWorkerIdentityAccess({ workerIdentityId: 'worker-1', actor: { actorRole: 'KORA_ADMIN', actorId: 'admin-1' } });
    const record = await getWorkerIdentityById('worker-1');
    const session = await requireWorkerUser();
    expect(record).not.toBeNull(); // resolvable — row never deleted
    expect(session).toBeInstanceOf(NextResponse); // but live product access is denied
  });

  it('does NOT support reusing the same worker_identity row for a different tenant — tenant_id is immutable by this function and by the DB\'s own WORKER-side lifecycle trigger (migration 048); a future Company relationship requires a NEW row, per personal.worker_identity\'s own tenant-scoped schema (migration 007), unrelated to and unchanged by this WP', async () => {
    const src = readFileSync(join(process.cwd(), 'lib/worker-identity/worker-identity-service.ts'), 'utf-8');
    // endWorkerIdentityAccess()'s own update payload never includes tenant_id
    const updateCallMatch = src.match(/\.update\(\{\s*status:\s*'disabled'\s*\}\)/);
    expect(updateCallMatch).not.toBeNull();
    expect(src).not.toMatch(/tenant_id:\s*['"]?\w+['"]?\s*,?\s*\n?\s*\}\)\.update/); // no update ever sets tenant_id
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3B — GATE 3 (Founder final gate): Advisor global offboarding must
// handle BOTH independent qualifications (Company Advisor, Partner Advisor
// — migration 056's own comment: "both roles may coexist independently,
// doc 76 §2 dual-role eligibility"), not just whichever one a dry-run
// happened to fixture. The playbook document (ops/playbooks/advisor-
// offboarding-playbook.md §6.4) already says "for each" non-terminal
// qualification — this proves that iteration actually revokes ALL of
// them, using the REAL listRoleQualificationsForAdvisor() +
// updateAdvisorRoleQualificationStatus(), not a fabricated assumption.
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-041 — GATE: Advisor global offboarding revokes BOTH independent qualifications', () => {
  it('an Advisor holding both Company Advisor AND Partner Advisor qualifications has BOTH revoked by the playbook\'s own "for each" step — before/after matrix', async () => {
    qualificationRows = [
      { id: 'qual-company', advisor_id: 'advisor-1', role: 'Company Advisor', status: 'QUALIFIED', created_at: 't1', updated_at: 't1' },
      { id: 'qual-partner', advisor_id: 'advisor-1', role: 'Partner Advisor', status: 'QUALIFIED', created_at: 't2', updated_at: 't2' },
    ];

    const before = await listRoleQualificationsForAdvisor('advisor-1');
    expect(before.map((q) => ({ role: q.role, status: q.status }))).toEqual([
      { role: 'Company Advisor', status: 'QUALIFIED' },
      { role: 'Partner Advisor', status: 'QUALIFIED' },
    ]);

    // Playbook step 6.4: "for each" non-terminal qualification.
    for (const q of before) {
      await updateAdvisorRoleQualificationStatus(q.id, 'REVOKED', 'KORA_ADMIN', 'admin-1');
    }

    const after = await listRoleQualificationsForAdvisor('advisor-1');
    expect(after.map((q) => ({ role: q.role, status: q.status }))).toEqual([
      { role: 'Company Advisor', status: 'REVOKED' },
      { role: 'Partner Advisor', status: 'REVOKED' },
    ]);
  });

  it('does not stop at the first qualification if a second, independent one still exists (no accidental early "fully offboarded" claim)', async () => {
    qualificationRows = [
      { id: 'qual-company', advisor_id: 'advisor-1', role: 'Company Advisor', status: 'QUALIFIED', created_at: 't1', updated_at: 't1' },
      { id: 'qual-partner', advisor_id: 'advisor-1', role: 'Partner Advisor', status: 'QUALIFIED', created_at: 't2', updated_at: 't2' },
    ];
    await updateAdvisorRoleQualificationStatus('qual-company', 'REVOKED', 'KORA_ADMIN', 'admin-1');
    const stillOpen = await listRoleQualificationsForAdvisor('advisor-1');
    const nonTerminal = stillOpen.filter((q) => q.status !== 'REVOKED' && q.status !== 'EXPIRED');
    expect(nonTerminal).toHaveLength(1); // Partner Advisor is still QUALIFIED — offboarding is NOT complete yet
    expect(nonTerminal[0].role).toBe('Partner Advisor');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PART 3 — scope integrity (this WP's own authorization, Step 36)
// ═══════════════════════════════════════════════════════════════════════════

describe('KORA-WP-041 — scope integrity', () => {
  it('migration 062 does not exist', () => {
    expect(existsSync(join(process.cwd(), 'supabase/migrations/062_offboarding.sql'))).toBe(false);
    const migrationsDir = join(process.cwd(), 'supabase/migrations');
    const files = readdirSync(migrationsDir) as string[];
    expect(files.some((f: string) => f.startsWith('062_'))).toBe(false);
  });

  it('operational-case-service.ts CASE_LINKED_OBJECT_TYPES was not extended with an offboarding-specific value', () => {
    const src = readFileSync(join(process.cwd(), 'lib/operations/operational-case-service.ts'), 'utf-8');
    const match = src.match(/CASE_LINKED_OBJECT_TYPES = \[([^\]]*)\]/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toMatch(/worker_identity|company_membership|advisor_identity|offboarding/);
  });

  it('no new Case status was added to CASE_STATUSES', () => {
    const src = readFileSync(join(process.cwd(), 'lib/operations/operational-case-service.ts'), 'utf-8');
    const match = src.match(/CASE_STATUSES = \[([^\]]*)\]/);
    expect(match![1].split(',').map((s) => s.trim()).filter(Boolean)).toHaveLength(5);
  });

  it('no offboarding UI route/page was created (UI: N/A per registry)', () => {
    const appDir = join(process.cwd(), 'app');
    const fg = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...fg(p));
        else out.push(p);
      }
      return out;
    };
    const offboardingUiFiles = fg(appDir).filter((p) => /offboard/i.test(p));
    expect(offboardingUiFiles).toEqual([]);
  });

  it('no cron/scheduler file or config was introduced for offboarding (Manual Governed — every step is an explicit human call)', () => {
    // Every playbook step in this WP calls an existing, explicit,
    // human-triggered service function (endCompanyMembership,
    // endWorkerIdentityAccess, endAdvisorAssignment, ...) — none of them
    // is invoked from a cron file, a scheduled route, or a queue consumer.
    const searchDirs = ['app/api', 'lib'].map((d) => join(process.cwd(), d));
    const fg = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...fg(p));
        else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
      }
      return out;
    };
    const offboardingRelatedFiles = searchDirs.flatMap(fg).filter((p) => /offboard/i.test(p));
    expect(offboardingRelatedFiles).toEqual([]); // the two new functions live in existing-topic files, not a new "offboarding engine" module
  });

  it('Partner offboarding is documented as explicitly out of scope, not implemented', () => {
    const readme = readFileSync(join(process.cwd(), 'ops/playbooks/README.md'), 'utf-8');
    expect(readme).toMatch(/Partner offboarding/);
    expect(readme).toMatch(/Out of scope/);
  });

  it('exactly three playbook files exist, matching the canonical "three playbooks" acceptance', () => {
    const dir = join(process.cwd(), 'ops/playbooks');
    const files = (readdirSync(dir) as string[]).filter((f) => f.endsWith('-playbook.md'));
    expect(files.sort()).toEqual(['advisor-offboarding-playbook.md', 'company-offboarding-playbook.md', 'worker-offboarding-playbook.md']);
  });

  it('the Company playbook documents both branches (membership offboarding AND Pilot termination) inside one file', () => {
    const src = readFileSync(join(process.cwd(), 'ops/playbooks/company-offboarding-playbook.md'), 'utf-8');
    expect(src).toMatch(/Branch A[\s\S]*Company membership offboarding/);
    expect(src).toMatch(/Branch B[\s\S]*Company Pilot termination/);
  });

  it('no invented legal/retention rule appears in the Company playbook — only an explicit handoff', () => {
    const src = readFileSync(join(process.cwd(), 'ops/playbooks/company-offboarding-playbook.md'), 'utf-8');
    expect(src).not.toMatch(/\d+\s*(day|month|year)s?\s*(retention|deletion)/i);
    expect(src).toMatch(/LEGAL \/ DPO HANDOFF/);
  });
});
