// tests/unit/bworker-accountprovisioning-retirement.test.ts
// B-WORKER AccountProvisioning dead-code retirement (2026-09-06).
//
// PR #169's final-correction pass discovered — but did not act on, per its
// own explicit instruction — that services/account/AccountProvisioningService.ts
// had zero real callers across all 18 remaining methods (getCurrentDemoUser,
// its 19th method, was already removed by PR #168). This slice re-confirms
// that finding exhaustively and retires the file, its sole seed
// (data/synthetic/user-accounts.json), and its I9 allowlist entry.
//
// No canonical replacement was built: real account/user functionality
// already exists via Supabase Auth (lib/live/account-provisioning-status-view.ts,
// app/admin/company-users-live). WorkerProvisioningService is untouched and
// is now the sole remaining B-WORKER I9 blocker.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTs(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// ── 1. AccountProvisioningService no longer exists ──────────────────────────

describe('B-WORKER AccountProvisioning retirement — service fully deleted', () => {
  it('services/account/AccountProvisioningService.ts no longer exists', () => {
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
  });

  it('the services/account/ directory no longer exists', () => {
    expect(exists('services/account')).toBe(false);
  });
});

// ── 2. Zero runtime imports remain anywhere ─────────────────────────────────

describe('B-WORKER AccountProvisioning retirement — zero runtime references remain', () => {
  const RUNTIME_DIRS = ['app', 'services', 'lib', 'components'];
  const EXCLUDED_DOCS = new Set(['lib/architecture/registry.ts', 'lib/security/synthetic-import-allowlist.ts']);

  function stripComments(src: string): string {
    return src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  }

  it('no file (excluding governance docs) imports or calls accountProvisioningService', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        const codeOnly = stripComments(read(relative));
        if (/accountProvisioningService\s*\./.test(codeOnly)) offenders.push(relative);
        if (/from\s+['"][^'"]*AccountProvisioningService['"]/.test(codeOnly)) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('no dynamic import() references the deleted service', () => {
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (/import\(\s*['"][^'"]*AccountProvisioningService['"]/.test(read(relative))) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ── 3. Synthetic seed retired (zero-consumer) ───────────────────────────────

describe('B-WORKER AccountProvisioning retirement — synthetic seed retired', () => {
  it('data/synthetic/user-accounts.json no longer exists', () => {
    expect(exists('data/synthetic/user-accounts.json')).toBe(false);
  });

  it('no runtime file imports data/synthetic/user-accounts.json (governance-doc comment mentions excepted)', () => {
    const RUNTIME_DIRS = ['app', 'services', 'lib', 'components'];
    const EXCLUDED_DOCS = new Set(['lib/architecture/registry.ts', 'lib/security/synthetic-import-allowlist.ts']);
    const offenders: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (EXCLUDED_DOCS.has(relative)) continue;
        const codeOnly = read(relative).split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
        if (codeOnly.includes("from '@/data/synthetic/user-accounts.json'")) offenders.push(relative);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ── 4. Canonical account paths remain untouched ─────────────────────────────

describe('B-WORKER AccountProvisioning retirement — canonical account authority untouched', () => {
  it('lib/live/account-provisioning-status-view.ts still exists and reads Supabase Auth, not synthetic data', () => {
    const src = read('lib/live/account-provisioning-status-view.ts');
    expect(src).toContain('export function buildAccountProvisioningStatusView(');
    expect(src).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('app/admin/company-users-live remains untouched and independent of the deleted service', () => {
    expect(exists('app/admin/company-users-live/page.tsx')).toBe(true);
    expect(exists('app/admin/company-users-live/_components/CompanyUsersPanel.tsx')).toBe(true);
  });

  it('app/admin/pipeline/page.tsx still fetches auth.users directly, unaffected by the deletion', () => {
    const src = read('app/admin/pipeline/page.tsx');
    expect(src).toContain('db.auth.admin.listUsers(');
    expect(src).toContain('buildAccountProvisioningStatusView(');
  });
});

// ── 5. I9 reduced by exactly one ────────────────────────────────────────────

// PRIOR HISTORY (accurate as of this file's first version, preserved
// verbatim): "the allowlist has exactly 1 entry, owner B_WORKER,
// WorkerProvisioningService only" — this slice's own target state. B-WORKER
// WorkerProvisioning Canonicalization (2026-09-06, the very next slice)
// retired that last entry too — its 2 real callers migrated to canonical
// personal.worker_identity reads. The allowlist is now empty.
describe('B-WORKER AccountProvisioning retirement — I9 allowlist later reduced to zero', () => {
  it('the allowlist is now empty — WorkerProvisioningService was the last entry, since retired', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    const arrayStart = allowlist.indexOf('export const SYNTHETIC_IMPORT_ALLOWLIST');
    const arrayEnd = allowlist.indexOf('];', arrayStart);
    const arrayBody = allowlist.slice(arrayStart, arrayEnd);
    const files = [...arrayBody.matchAll(/file: '([^']+)'/g)].map((m) => m[1]);
    expect(files).toEqual([]);
  });

  it('the allowlist header count reflects 0 files / 0 import statements', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    expect(allowlist).toContain('CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 0 files / 0 import statements');
  });
});

// ── 6. WorkerProvisioningService — later retired (superseded section) ──────

// PRIOR HISTORY (accurate as of this file's first version, preserved as a
// record): this section asserted WorkerProvisioningService.ts still
// existed, still imported its synthetic seed, and was still called by name
// from PilotLifecycleClient.tsx, RosterImportModal.tsx,
// WorkforceQuickAccessPanel.tsx, WorkerAdoptionPanel.tsx, and
// WorkerSpaceCapabilityService.ts — this slice's own explicit boundary was
// NOT to canonicalize it. B-WORKER WorkerProvisioning Canonicalization
// (2026-09-06, the very next slice) did canonicalize it: the file and its
// seed are deleted; all 5 real callers migrated to
// lib/live/worker-provisioning-status-view.ts (2 real methods) or
// lib/roster-import/roster-record-builder.ts (the pure, already-synthetic-
// independent importDemoRoster, relocated unchanged). The schema-gap and
// email-safety findings below remained accurate right up until that slice
// re-traced them to their real consumers and found no schema change was
// actually needed — see tests/unit/bworker-workerprovisioning-canonicalization.test.ts.
describe('B-WORKER AccountProvisioning retirement — WorkerProvisioningService later retired, not touched here', () => {
  it('WorkerProvisioningService.ts no longer exists', () => {
    expect(exists('services/worker-provisioning/WorkerProvisioningService.ts')).toBe(false);
  });

  it('no worker schema was modified by THIS slice — the department/site/my_kora_enabled/pib_private_enabled gap this slice found was later resolved without a schema change', () => {
    const src = read('app/api/admin/workers/list/route.ts');
    expect(src).toContain("select('id, worker_ref, status, created_at')");
  });
});

// ── 7. No new synthetic import was introduced ───────────────────────────────

describe('B-WORKER AccountProvisioning retirement — no new synthetic import introduced', () => {
  it('no new file under services/account/ or lib/live/ imports data/synthetic/**', () => {
    for (const dir of ['services', 'lib']) {
      for (const file of walkTs(resolve(root, dir))) {
        const relative = file.replace(root + '/', '');
        if (relative.startsWith('services/account/') || relative === 'lib/live/account-provisioning-status-view.ts') {
          expect(read(relative)).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
        }
      }
    }
  });
});

// ── 8. Registry reflects the retirement ─────────────────────────────────────

describe('B-WORKER AccountProvisioning retirement — registry corrected', () => {
  it('svc.account is DEAD, with decisionRef and deletableWhen set', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.account'");
    expect(idx).toBeGreaterThan(-1);
    const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
    expect(entry).toContain("status: 'DEAD'");
    expect(entry).toContain('decisionRef:');
    expect(entry).not.toContain('decisionRef: null');
    expect(entry).toMatch(/deletableWhen:\s*'Already deleted/);
  });

  // PRIOR HISTORY (accurate as of this retirement, preserved verbatim):
  // asserted svc.worker-provisioning remained CONSOLIDATE, unchanged by this
  // slice — true at the time (only AccountProvisioning was retired here).
  // B-WORKER WorkerProvisioning Canonicalization (2026-09-06, the next and
  // final B-WORKER implementation slice) retired it too — now DEAD.
  it('svc.worker-provisioning is now DEAD (retired by the next B-WORKER slice)', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.worker-provisioning'");
    expect(idx).toBeGreaterThan(-1);
    const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
    expect(entry).toContain("status: 'DEAD'");
  });

  it('docs/ARCHITECTURE_REGISTRY.md is regenerated and reflects the retirement', () => {
    const doc = read('docs/ARCHITECTURE_REGISTRY.md');
    expect(doc).toContain('svc.account');
  });
});

// ── 9. Safety boundaries ─────────────────────────────────────────────────────

describe('B-WORKER AccountProvisioning retirement — safety boundaries respected', () => {
  it('no worker schema migration file was added by this retirement', () => {
    const migrationsDir = resolve(root, 'supabase/migrations');
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    for (const f of files) {
      expect(f).not.toMatch(/account-?provisioning-?retirement/i);
    }
  });

  it('no auth.admin invite call was added anywhere in this retirement (grep spot-check on the deleted service dir)', () => {
    expect(exists('services/account')).toBe(false);
  });
});
