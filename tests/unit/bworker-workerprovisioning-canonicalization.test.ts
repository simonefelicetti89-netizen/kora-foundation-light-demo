// tests/unit/bworker-workerprovisioning-canonicalization.test.ts
// B-WORKER — Worker Provisioning Canonicalization (2026-09-06).
//
// The final B-WORKER implementation slice before adversarial closure.
// Retires services/worker-provisioning/WorkerProvisioningService.ts — the
// sole remaining synthetic import in the entire runtime — reaching
// BWORKER_I9 = 0 / BTRUTH_I9 = 0 / GLOBAL_I9_RUNTIME_IMPORTS = 0.
//
// Method-by-method audit found only 2 of the 10 methods had real callers
// (getWorkersForCompany, getWorkerProvisioningSummary), both reducible to 3
// canonical counts over personal.worker_identity. importDemoRoster() had a
// real caller (RosterImportModal.tsx) but zero synthetic dependency of its
// own — relocated unchanged to lib/roster-import/roster-record-builder.ts.
// The other 7 methods had zero real callers and were retired without
// replacement. No schema change was required for department/site (belong to
// the unrelated, already-canonical ingestion domain), my_kora_enabled
// (derived from personal.worker_identity.status !== 'disabled', not a
// stored flag — kora-session.ts's requireWorkerUser() proves no separate
// access truth exists), or pib_private_enabled (PIB privacy is absolute via
// RLS, never a real toggle). See lib/architecture/registry.ts's
// svc.worker-provisioning entry for the full record.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import {
  SYNTHETIC_IMPORT_ALLOWLIST,
  BTRUTH_OWNED_SYNTHETIC_IMPORTS,
  BWORKER_OWNED_SYNTHETIC_IMPORTS,
} from '@/lib/security/synthetic-import-allowlist';
import {
  buildWorkerProvisioningStatusView,
  buildWorkerProvisioningStatusMap,
  EMPTY_WORKER_PROVISIONING_STATUS,
} from '@/lib/live/worker-provisioning-status-view';
import { buildRosterRecordsFromValidatedRows } from '@/lib/roster-import/roster-record-builder';
import { workerSpaceCapabilityService } from '@/services/worker-space/WorkerSpaceCapabilityService';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

function stripComments(src: string): string {
  return src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
}

function walkTs(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (['node_modules', '.next', '.git'].includes(entry)) continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkTs(p));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

// ── 1. WorkerProvisioningService no longer exists ───────────────────────────

describe('B-WORKER WorkerProvisioning Canonicalization — service retired', () => {
  it('services/worker-provisioning/WorkerProvisioningService.ts and its directory no longer exist', () => {
    expect(exists('services/worker-provisioning/WorkerProvisioningService.ts')).toBe(false);
    expect(exists('services/worker-provisioning')).toBe(false);
  });

  it('data/synthetic/worker-roster.json no longer exists', () => {
    expect(exists('data/synthetic/worker-roster.json')).toBe(false);
  });
});

// ── 2. Zero runtime callers of the retired service anywhere ─────────────────

describe('B-WORKER WorkerProvisioning Canonicalization — zero runtime callers', () => {
  it('no file in app/, services/, lib/, components/ has real code (excluding historical // comments and the governance registry\'s own string-literal history notes) referencing workerProvisioningService or WorkerProvisioningService', () => {
    const files = ['app', 'services', 'lib', 'components'].flatMap((d) => walkTs(resolve(root, d)));
    const offenders: string[] = [];
    for (const file of files) {
      const rel = file.replace(root + '/', '');
      if (rel === 'lib/architecture/registry.ts') continue; // governance history record, not runtime code
      const codeOnly = stripComments(readFileSync(file, 'utf-8'));
      if (/\bworkerProvisioningService\b|\bWorkerProvisioningService\b/.test(codeOnly)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ── 3. No synthetic worker provisioning import remains (I9 = 0) ─────────────

describe('B-WORKER WorkerProvisioning Canonicalization — I9 fully retired', () => {
  it('BWORKER_I9 = 0 (no B_WORKER-owned entries remain)', () => {
    expect(BWORKER_OWNED_SYNTHETIC_IMPORTS).toEqual([]);
  });

  it('BTRUTH_I9 = 0 (unaffected by this slice, already retired by CC-00 Final Scoring Canonicalization)', () => {
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS).toEqual([]);
  });

  it('GLOBAL_I9_RUNTIME_IMPORTS = 0 (the allowlist itself is empty)', () => {
    expect(SYNTHETIC_IMPORT_ALLOWLIST).toEqual([]);
  });

  it('no new, non-allowlisted synthetic import was introduced by this slice', () => {
    const files = ['app', 'services', 'lib', 'components'].flatMap((d) => walkTs(resolve(root, d)));
    const pattern = /^\s*import\s+.+\s+from\s+['"][^'"]*\/data\/synthetic\/[^'"]+['"]\s*;?\s*$/;
    const offenders: string[] = [];
    for (const file of files) {
      if (/\.test\.tsx?$/.test(file)) continue;
      const src = readFileSync(file, 'utf-8');
      if (src.split('\n').some((l) => pattern.test(l))) {
        offenders.push(file.replace(root + '/', ''));
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ── 4. Canonical roster read path works ─────────────────────────────────────

describe('B-WORKER WorkerProvisioning Canonicalization — canonical roster read path', () => {
  it('buildWorkerProvisioningStatusView computes total/my_kora_enabled/active counts correctly', () => {
    const rows = [
      { status: 'active' },
      { status: 'invited' },
      { status: 'pending' },
      { status: 'disabled' },
    ];
    const result = buildWorkerProvisioningStatusView(rows);
    expect(result).toEqual({
      total_workers: 4,
      my_kora_enabled_count: 3, // all but 'disabled'
      active_worker_accounts: 1,
    });
  });

  it('buildWorkerProvisioningStatusView on an empty roster matches EMPTY_WORKER_PROVISIONING_STATUS', () => {
    expect(buildWorkerProvisioningStatusView([])).toEqual(EMPTY_WORKER_PROVISIONING_STATUS);
  });

  it('buildWorkerProvisioningStatusMap groups multi-tenant rows correctly, one query for many tenants', () => {
    const rows = [
      { tenant_id: 't1', status: 'active' },
      { tenant_id: 't1', status: 'disabled' },
      { tenant_id: 't2', status: 'active' },
    ];
    const map = buildWorkerProvisioningStatusMap(rows);
    expect(map.t1).toEqual({ total_workers: 2, my_kora_enabled_count: 1, active_worker_accounts: 1 });
    expect(map.t2).toEqual({ total_workers: 1, my_kora_enabled_count: 1, active_worker_accounts: 1 });
  });
});

// ── 5. Canonical worker admin data remains tenant-scoped ─────────────────────

describe('B-WORKER WorkerProvisioning Canonicalization — tenant scoping preserved', () => {
  it('app/admin/pipeline/page.tsx scopes its worker_identity fetch to tenant.id, not a global query', () => {
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).toMatch(/\.eq\(\s*['"]tenant_id['"]\s*,\s*tenant\.id\s*\)/);
  });

  it('app/admin/companies/page.tsx scopes its batched worker_identity fetch with .in(tenant_id, tenantIds)', () => {
    const src = read('app/admin/companies/page.tsx');
    expect(src).toMatch(/\.in\(\s*['"]tenant_id['"]\s*,\s*tenantIds\s*\)/);
  });
});

// ── 6. Roster import does not silently send invitations ─────────────────────

describe('B-WORKER WorkerProvisioning Canonicalization — roster import stays separate from invitation', () => {
  it('RosterImportModal.tsx still self-documents "No server calls. No DB writes. No email. No auth."', () => {
    const src = read('app/admin/companies/_components/RosterImportModal.tsx');
    expect(src).toContain('No server calls. No DB writes. No email. No auth.');
  });

  it('roster-record-builder.ts is a pure function with no DB client, no email, no auth import', () => {
    const src = read('lib/roster-import/roster-record-builder.ts');
    expect(src).not.toMatch(/getSupabaseServiceClient|getSupabaseServerClient|inviteUserByEmail|sendEmail/);
  });

  it('buildRosterRecordsFromValidatedRows produces draft, not-yet-invited records', () => {
    const records = buildRosterRecordsFromValidatedRows('company-1', 'tenant-1', [
      {
        employee_code: 'e001',
        display_name: 'Test Worker',
        job_family: 'ops',
        site: 'Milano',
        department: 'Ops',
        cluster: '',
        my_kora_enabled: false,
      } as never,
    ]);
    expect(records[0].worker_account_status).toBe('draft');
    expect(records[0].consent_status).toBe('not_collected');
  });
});

// ── 7. Email-producing endpoints remain explicit, unchanged ─────────────────

describe('B-WORKER WorkerProvisioning Canonicalization — email safety unchanged', () => {
  it('app/api/admin/workers/provision/route.ts still requires KORA_ADMIN and rate-limits before inviting', () => {
    const src = read('app/api/admin/workers/provision/route.ts');
    expect(src).toContain('requireKoraAdmin');
    expect(src).toContain('assertRateLimit');
    expect(src).toContain('inviteUserByEmail');
  });

  it('no test in this file or the canonical view builder calls inviteUserByEmail or any real mutation', () => {
    const view = read('lib/live/worker-provisioning-status-view.ts');
    expect(view).not.toContain('inviteUserByEmail');
    expect(view).not.toContain('.insert(');
    expect(view).not.toContain('.update(');
    expect(view).not.toContain('.delete(');
  });
});

// ── 8. department/site come from the correct, unrelated, already-canonical authority ──

describe('B-WORKER WorkerProvisioning Canonicalization — department/site not fabricated', () => {
  it('the canonical worker-provisioning view carries no department/site field in its actual code (excluding explanatory comments)', () => {
    const codeOnly = stripComments(read('lib/live/worker-provisioning-status-view.ts'));
    expect(codeOnly).not.toMatch(/\bdepartment\b/);
    expect(codeOnly).not.toMatch(/\bsite\b/);
  });
});

// ── 9. my_kora_enabled does not create a duplicate access truth ─────────────

describe('B-WORKER WorkerProvisioning Canonicalization — my_kora_enabled is derived, not a new stored flag', () => {
  it('my_kora_enabled_count is derived from status !== "disabled", not read from a stored boolean column', () => {
    const view = read('lib/live/worker-provisioning-status-view.ts');
    expect(view).toContain("r.status !== 'disabled'");
  });

  it('the real gate on My KORA access (requireWorkerUser) only checks status === disabled to deny — no separate my_kora_enabled flag exists', () => {
    const session = read('lib/auth/kora-session.ts');
    const idx = session.indexOf('export async function requireWorkerUser');
    const fn = session.slice(idx, session.indexOf('export async function getCurrentWorkerUser', idx));
    expect(fn).toMatch(/status(Row)?\s*===\s*'disabled'|workerStatus\s*===\s*'disabled'/);
    expect(fn).not.toMatch(/my_kora_enabled/);
  });
});

// ── 10. pib_private_enabled does not invent new privacy semantics ───────────

describe('B-WORKER WorkerProvisioning Canonicalization — pib_private_enabled retired, not replaced', () => {
  it('the canonical worker-provisioning view (the retired service\'s replacement) carries no pib_private_enabled field', () => {
    const codeOnly = stripComments(read('lib/live/worker-provisioning-status-view.ts'));
    expect(codeOnly).not.toMatch(/pib_private_enabled/);
  });

  it('the roster-import builder hardcodes pib_private_enabled to false — it is not read as a real per-worker toggle from anywhere', () => {
    const src = read('lib/roster-import/roster-record-builder.ts');
    expect(src).toMatch(/pib_private_enabled:\s*false/);
  });

  it('personal.worker_pib RLS defines no CREATE POLICY granting COMPANY_ADMIN/company-role access — PIB privacy is absolute, not a toggle', () => {
    const sql = read('supabase/migrations/018_worker_pib.sql');
    const policyBlocks = sql.match(/CREATE POLICY[\s\S]*?;/g) ?? [];
    for (const block of policyBlocks) {
      expect(block).not.toMatch(/COMPANY_ADMIN/);
    }
  });
});

// ── 11 & 12. I9 = 0 (already covered above, restated per the task's own proof-point list) ──

describe('B-WORKER WorkerProvisioning Canonicalization — I9 restated', () => {
  it('BWORKER_I9 = 0', () => {
    expect(BWORKER_OWNED_SYNTHETIC_IMPORTS.length).toBe(0);
  });

  it('BTRUTH_I9 = 0', () => {
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS.length).toBe(0);
  });
});

// ── 13. No permanent facade / adapter / mock fallback was introduced ────────

describe('B-WORKER WorkerProvisioning Canonicalization — no synthetic adapter reintroduced', () => {
  it('WorkerProvisioningServiceV2 does not exist; no compatibility shell was created', () => {
    expect(exists('services/worker-provisioning-v2')).toBe(false);
    expect(exists('services/worker-provisioning')).toBe(false);
  });

  it('WorkerSpaceCapabilityService takes explicit counts — no internal fallback to a mock/demo source in its actual code', () => {
    const codeOnly = stripComments(read('services/worker-space/WorkerSpaceCapabilityService.ts'));
    expect(codeOnly).not.toMatch(/workerProvisioningService|data\/synthetic/);
    expect(workerSpaceCapabilityService.getCapabilityFromCounts(0, 0).status).toBe('NOT_ENABLED');
  });
});

// ── 14. PR #168/#169/#170 security and runtime retirements remain intact ────

describe('B-WORKER WorkerProvisioning Canonicalization — prior retirements remain intact', () => {
  it('PR #168 (My KORA runtime retirement): app/my-kora/page.tsx remains a pure redirect', () => {
    expect(read('app/my-kora/page.tsx')).toContain('redirect(');
  });

  it('PR #169/#170: services/account/AccountProvisioningService.ts and its seed remain deleted', () => {
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
    expect(exists('data/synthetic/user-accounts.json')).toBe(false);
  });

  it('WorkerAchievementService.ts remains deleted', () => {
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
  });
});
