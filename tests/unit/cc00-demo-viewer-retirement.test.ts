// tests/unit/cc00-demo-viewer-retirement.test.ts
// CC-00 — DEMO_VIEWER role and auth-surface consolidation (2026-09-26).
//
// Goal: retire the DEMO_VIEWER role completely from KORA's runtime and
// authorization model, while preserving any legitimate remaining
// static/public presentation surfaces without a special demo identity.
// Founder decision: DEMO_VIEWER = RETIRE. Not replaced by another role with
// a different name; no new tenant-scoped demo role; no second
// commercial-runtime access mode.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

function stripComments(src: string): string {
  return src
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

// ── 1. DEMO_VIEWER no longer exists as a valid runtime role ──────────────────

describe('CC-00 DEMO_VIEWER retirement — role type removed', () => {
  it('DEMO_KORA_ROLES no longer exists in lib/constants/kora.ts', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).not.toContain('DEMO_KORA_ROLES');
  });

  it('KORA_ROLES no longer includes DEMO_VIEWER', () => {
    const constants = read('lib/constants/kora.ts');
    const start = constants.indexOf('export const KORA_ROLES');
    const block = constants.slice(start, constants.indexOf('as const;', start));
    expect(block).not.toContain('DEMO_VIEWER');
    expect(block).toContain('ACTIVE_KORA_ROLES');
    expect(block).toContain('FUTURE_KORA_ROLES');
  });

  it('DEMO_VIEWER is recorded in REMOVED_KORA_ROLES alongside COMPANY_VIEWER, not silently erased', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).toContain("export const REMOVED_KORA_ROLES = ['COMPANY_VIEWER', 'DEMO_VIEWER']");
  });

  it('lib/types/index.ts KoraDemoUser (persona-switcher registry type, unrelated to the auth role) is untouched — different concept, out of scope', () => {
    // This is a DIFFERENT KoraDemoUser than the one retired from
    // kora-session.ts — a persona-switcher registry type (user_id,
    // display_name, role: KoraUserRole, access_scope, ...) used by
    // services/access-control/AccessControlService.ts, a pre-existing,
    // already zero-caller, Master-Plan-tracked orphan unrelated to the
    // DEMO_VIEWER runtime auth role. Not touched by this slice.
    expect(read('lib/types/index.ts')).toContain('export interface KoraDemoUser');
  });
});

// ── 2. requireDemoAccess() removed ────────────────────────────────────────────

describe('CC-00 DEMO_VIEWER retirement — requireDemoAccess() and supporting helpers removed', () => {
  it('KoraDemoUser, requireDemoUser, requireDemoAccess, getCurrentDemoUser, isDemoUser no longer exist in lib/auth/kora-session.ts', () => {
    const session = stripComments(read('lib/auth/kora-session.ts'));
    for (const name of ['KoraDemoUser', 'requireDemoUser', 'requireDemoAccess', 'getCurrentDemoUser', 'isDemoUser']) {
      expect(session).not.toContain(name);
    }
  });

  it('lib/auth/demo-guard.tsx (requireDemoGate, zero real callers) no longer exists', () => {
    expect(exists('lib/auth/demo-guard.tsx')).toBe(false);
  });

  it('isKoraAuthError/isKoraAdmin/isCompanyUser/isWorkerUser/isPartnerUser union signatures no longer mention KoraDemoUser', () => {
    const session = read('lib/auth/kora-session.ts');
    for (const guard of ['isKoraAuthError', 'isKoraAdmin', 'isCompanyUser', 'isWorkerUser', 'isPartnerUser']) {
      const idx = session.indexOf(`export function ${guard}`);
      expect(idx).toBeGreaterThan(-1);
      const sig = session.slice(idx, session.indexOf(')', idx) + 1);
      expect(sig).not.toContain('KoraDemoUser');
    }
  });
});

// ── 3. No demo-viewer provisioning endpoint remains ──────────────────────────

describe('CC-00 DEMO_VIEWER retirement — provisioning path retired', () => {
  it('app/api/admin/demo/provision-viewer/route.ts no longer exists', () => {
    expect(exists('app/api/admin/demo/provision-viewer/route.ts')).toBe(false);
    expect(exists('app/api/admin/demo')).toBe(false);
  });

  it('no admin UI action links to the retired provisioning endpoint', () => {
    expect(read('app/admin/page.tsx')).not.toContain('provision-viewer');
  });
});

// ── 4. No role-home mapping exists for DEMO_VIEWER ───────────────────────────

describe('CC-00 DEMO_VIEWER retirement — role-home mapping removed', () => {
  it('getRoleHome no longer maps DEMO_VIEWER to /demo', () => {
    const roleHome = stripComments(read('lib/auth/role-home.ts'));
    expect(roleHome).not.toContain('DEMO_VIEWER');
    expect(roleHome).toContain("return '/login';");
  });

  it('auth/callback no longer routes DEMO_VIEWER invites to /demo', () => {
    const callback = stripComments(read('app/auth/callback/route.ts'));
    expect(callback).not.toContain('DEMO_VIEWER');
  });

  it('middleware.ts no longer defines DEMO_VIEWER_ALLOWED_PREFIXES or an isDemoViewer redirect block', () => {
    const mw = stripComments(read('middleware.ts'));
    expect(mw).not.toContain('DEMO_VIEWER_ALLOWED_PREFIXES');
    expect(mw).not.toContain('isDemoViewer');
  });

  it('middleware.ts no longer sets the x-pathname header (its sole consumer, requireDemoGate, is retired)', () => {
    const mw = read('middleware.ts');
    expect(mw).not.toContain("set('x-pathname'");
  });
});

// ── 5. No access-matrix rule grants DEMO_VIEWER access ───────────────────────

describe('CC-00 DEMO_VIEWER retirement — access matrix rows removed', () => {
  it('lib/auth/access-matrix.ts MATRIX no longer has any DEMO_VIEWER row', () => {
    const accessMatrix = read('lib/auth/access-matrix.ts');
    const matrixStart = accessMatrix.indexOf('const MATRIX');
    const matrixBody = accessMatrix.slice(matrixStart, accessMatrix.indexOf('\n};', matrixStart));
    expect(matrixBody).not.toContain('DEMO_VIEWER');
  });

  it('KoraRole (derived from KORA_ROLES) no longer includes DEMO_VIEWER, so a DEMO_VIEWER row would not even type-check', () => {
    const accessMatrix = read('lib/auth/access-matrix.ts');
    expect(accessMatrix).toContain('export type KoraRole = (typeof KORA_ROLES)[number];');
  });

  it('docs/access-matrix.md table header no longer lists a DEMO_VIEWER column (doc/code parity)', () => {
    const doc = read('docs/access-matrix.md');
    const headerLine = doc.split('\n').find((line) => line.trim().startsWith('| Risorsa'));
    expect(headerLine).toBeDefined();
    expect(headerLine).not.toContain('DEMO_VIEWER');
  });
});

// ── 6. Retired role metadata fails closed ────────────────────────────────────

describe('CC-00 DEMO_VIEWER retirement — retired role fails closed', () => {
  it('getRoleHome falls through to /login for any unrecognized/retired role, never a privileged default', () => {
    const roleHome = read('lib/auth/role-home.ts');
    expect(roleHome).toContain("return '/login';");
    expect(roleHome).not.toContain("return '/admin'; }\n  return");
  });

  it('every require*User() guard uses strict equality against its own role, not a fallback default', () => {
    const session = read('lib/auth/kora-session.ts');
    for (const check of ["koraRole !== 'KORA_ADMIN'", "koraRole !== 'COMPANY_ADMIN'", "koraRole !== 'WORKER'", "koraRole !== 'PARTNER'"]) {
      expect(session).toContain(check);
    }
  });

  it('canAccess() fails closed for any role/resource pair not explicitly in MATRIX', () => {
    const accessMatrix = read('lib/auth/access-matrix.ts');
    expect(accessMatrix).toContain('No access rule defined for role=');
    expect(accessMatrix).toContain('allowed: false');
  });
});

// ── 7-11. Real role access unchanged ─────────────────────────────────────────

describe('CC-00 DEMO_VIEWER retirement — real role access unchanged', () => {
  it('KORA_ADMIN access unchanged — requireKoraAdmin still exists, strict equality check intact', () => {
    const session = read('lib/auth/kora-session.ts');
    expect(session).toContain('export async function requireKoraAdmin');
    expect(session).toContain("koraRole !== 'KORA_ADMIN'");
  });

  it('COMPANY access unchanged — requireCompanyUser still exists, strict equality check intact', () => {
    const session = read('lib/auth/kora-session.ts');
    expect(session).toContain('export async function requireCompanyUser');
    expect(session).toContain("koraRole !== 'COMPANY_ADMIN'");
  });

  it('WORKER access unchanged — requireWorkerUser still exists, strict equality check intact', () => {
    const session = read('lib/auth/kora-session.ts');
    expect(session).toContain('export async function requireWorkerUser');
    expect(session).toContain("koraRole !== 'WORKER'");
  });

  it('PARTNER access unchanged — requirePartnerUser still exists, strict equality check intact', () => {
    const session = read('lib/auth/kora-session.ts');
    expect(session).toContain('export async function requirePartnerUser');
    expect(session).toContain("koraRole !== 'PARTNER'");
  });

  it('ADVISOR remains unenforced (no session guard) exactly as before — this slice does not touch ADVISOR', () => {
    const session = read('lib/auth/kora-session.ts');
    const exportNames = session.match(/export (?:async )?function (\w+)/g) ?? [];
    expect(exportNames.some((n) => n.includes('AdvisorUser'))).toBe(false);
  });

  it('middleware.ts role-redirect blocks for COMPANY_ADMIN/WORKER/PARTNER/KORA_ADMIN are unchanged', () => {
    const mw = read('middleware.ts');
    expect(mw).toContain('COMPANY_ALLOWED_PREFIXES');
    expect(mw).toContain('WORKER_ALLOWED_PREFIXES');
    expect(mw).toContain('PARTNER_ALLOWED_PREFIXES');
    expect(mw).toContain("const isKoraAdmin = sessionKoraRole === 'KORA_ADMIN'");
  });
});

// ── 12-13. /demo and /demo/future-vision classification ──────────────────────

describe('CC-00 DEMO_VIEWER retirement — remaining /demo surfaces are public static presentation', () => {
  it('app/demo/page.tsx calls neither requireDemoAccess nor requireKoraAdmin (already public before this slice)', () => {
    const src = read('app/demo/page.tsx');
    expect(src).not.toContain('requireDemoAccess');
    expect(src).not.toContain('requireKoraAdmin');
  });

  it('app/demo/future-vision/page.tsx calls neither requireDemoAccess nor requireKoraAdmin, and has no session/role logic at all', () => {
    const src = read('app/demo/future-vision/page.tsx');
    expect(src).not.toContain('requireDemoAccess');
    expect(src).not.toContain('requireKoraAdmin');
    expect(src).not.toContain('koraRole');
  });

  it('app/demo/layout.tsx has no auth guard for either remaining route', () => {
    const layout = stripComments(read('app/demo/layout.tsx'));
    expect(layout).not.toContain('requireDemoAccess');
    expect(layout).not.toContain('requireKoraAdmin');
  });

  it('neither remaining /demo route queries live tenant/company data', () => {
    for (const page of ['app/demo/page.tsx', 'app/demo/future-vision/page.tsx']) {
      const src = stripComments(read(page));
      expect(src).not.toContain('getSupabaseServiceClient');
      expect(src).not.toContain('getSupabaseServerClient');
      expect(src).not.toMatch(/from\(['"]analytics/);
    }
  });
});

// ── 14. No live canonical data exposed publicly ──────────────────────────────

describe('CC-00 DEMO_VIEWER retirement — no live data newly exposed', () => {
  it('AdminPreviewService.ts (the /demo surfaces\' only remaining service dependency) is untouched by this slice — still zero synthetic imports, still one method', () => {
    const src = stripComments(read('services/admin-preview/AdminPreviewService.ts'));
    expect(src).toContain('getGateStatusPreview(');
    expect(src).not.toMatch(/from ['"][^'"]*data\/synthetic\//);
  });

  it('no new database query was introduced into app/demo/page.tsx or app/demo/future-vision/page.tsx', () => {
    for (const page of ['app/demo/page.tsx', 'app/demo/future-vision/page.tsx']) {
      const src = read(page);
      expect(src).not.toMatch(/\.schema\(['"]/);
    }
  });
});

// ── 15-17. Untouched surfaces ─────────────────────────────────────────────────

describe('CC-00 DEMO_VIEWER retirement — B-WORKER, My KORA, final scoring untouched', () => {
  it('B-WORKER services are untouched — still exist', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      // PRIOR HISTORY: 'services/worker-achievements/WorkerAchievementService.ts'
      // was asserted to exist here (unmodified by this PR, at the time). B-WORKER
      // "One Product / No Demo Runtime" correction (2026-09-06) deleted it entirely
      // (zero real callers once its 2 callers, app/my-kora/page.tsx and
      // app/my-kora/dynamic-cv/page.tsx, became pure canonical redirects) — removed
      // from this list; this is that later, separately-authorized retirement, not an
      // unrelated-PR regression of this PR's own scope boundary.
      'services/worker-space/WorkerSpaceCapabilityService.ts',
    ]) {
      expect(exists(file)).toBe(true);
    }
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): also
  // asserted app/my-kora/page.tsx contained 'accountProvisioningService.getCurrentDemoUser'.
  // CC-00 Final Scoring Canonicalization (2026-09-05) removed that call —
  // it only ever fed the now-retired scoringSimulatorService.getCompanyAggregate().
  // AccountProvisioningService.ts itself (this test's actual subject) is untouched.
  // PRIOR HISTORY (accurate as of CC-00 DEMO_VIEWER retirement, preserved
  // verbatim): asserted this different, unrelated concept was untouched by
  // that retirement. It was later found zero-caller and removed by
  // B-WORKER final cleanup (2026-09-06) — an unrelated, separate cleanup.
  it('AccountProvisioningService.ts (the file) still exists; getCurrentDemoUser() was removed separately once zero-caller', () => {
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(true);
    const src = read('services/account/AccountProvisioningService.ts');
    expect(src).not.toContain('getCurrentDemoUser(role?: string): KoraUserAccount');
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): "final
  // scoring is untouched" — asserted ScoringSimulatorService.ts existed.
  // CC-00 Final Scoring Canonicalization (2026-09-05) — a later, separate,
  // unrelated-to-this-PR slice — deleted it (zero real callers, last
  // B-TRUTH-owned synthetic scoring dependency). ActivationSafeguardService.ts
  // still exists (only its synthetic evaluateFromSeed() method was removed).
  it('ActivationSafeguardService.ts still exists; ScoringSimulatorService.ts was later retired by CC-00 Final Scoring Canonicalization, unrelated to this PR', () => {
    expect(exists('services/activation-safeguard/ActivationSafeguardService.ts')).toBe(true);
    expect(exists('services/scoring-simulator/ScoringSimulatorService.ts')).toBe(false);
  });
});

// ── 18. CC-00 remains open ────────────────────────────────────────────────────

describe('CC-00 DEMO_VIEWER retirement — CC-00 status', () => {
  it('registry does not claim CC-00 is closed', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'app-surface.demo'");
    const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
    expect(entry).not.toMatch(/CC-00 (closed|resolved|complete)/i);
    expect(entry).toContain('CC-00 remains OPEN');
  });

  it('lib.auth registry entry does not claim CC-00 is closed', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'lib.auth'");
    const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
    expect(entry).not.toMatch(/CC-00 (closed|resolved|complete)/i);
    expect(entry).toContain('CC-00 remains OPEN');
  });
});

// ── Security gate — no auth DB mutation, no privilege expansion ─────────────

describe('CC-00 DEMO_VIEWER retirement — security gate', () => {
  it('no Supabase Auth admin.updateUserById/createUser/deleteUser call was added anywhere by this slice', () => {
    // The only file that ever called admin.updateUserById for DEMO_VIEWER
    // provisioning is deleted; no replacement was added.
    expect(exists('app/api/admin/demo/provision-viewer/route.ts')).toBe(false);
  });

  it('no new role string was introduced anywhere in lib/constants/kora.ts', () => {
    const constants = read('lib/constants/kora.ts');
    const koraRolesBlock = constants.slice(
      constants.indexOf('export const KORA_ROLES'),
      constants.indexOf('as const;', constants.indexOf('export const KORA_ROLES')),
    );
    for (const role of ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR']) {
      // every role present is one of the 5 pre-existing real roles
      expect(['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR']).toContain(role);
    }
    expect(koraRolesBlock).not.toMatch(/'[A-Z_]+_PREVIEW'|'[A-Z_]+_DEMO'/);
  });
});
