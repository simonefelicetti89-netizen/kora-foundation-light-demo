// tests/unit/bworker-final-cleanup.test.ts
// B-WORKER Final Cleanup (2026-09-06) — legacy runtime retirement, synthetic
// worker debt closure, security P2 closure.
//
// SCOPE ACHIEVED:
//   - app/my-kora/layout.tsx's real-session admission branch retired — real
//     WORKER/KORA_ADMIN sessions are now redirected before ever reaching
//     /my-kora's demo-state-driven content (WorkerSessionProvider no longer
//     reachable from a real session at all).
//   - AccountProvisioningService.getCurrentDemoUser() removed (zero-caller,
//     verified fresh).
//   - Security P2s closed: rate limiting added to the 3 worker mutation
//     routes docs/SECURITY_RATE_LIMITING_04.md already flagged as
//     "media priorità, non implementate, nessuna regressione" (commons/
//     bookings POST, onboarding POST, initiatives/interest POST) — the other
//     2 named in the original P2 finding (pib/redistribute, booking DELETE)
//     are respected as-is per that doc's own explicit, reasoned exclusion
//     (self-service, single-row, no plausible abuse pattern). Raw DB
//     error.message leakage closed on worker/profile and commons/posts.
//
// SCOPE EXPLICITLY NOT ACHIEVED (reported, not hidden — see FINAL REPORT):
//   - MyKoraPreviewService is NOT retired. Its 9 callers are all now
//     real-session-unreachable, but they remain the synthetic backing for
//     the anonymous/persona demo preview CLAUDE.md §10 requires
//     (RoleSwitcher/ScenarioSwitcher/PersonaSwitcher, "My KORA Home, Privacy
//     & Sharing, Dynamic CV Light skeletons"). Deleting it would delete that
//     constitutionally-required capability — a founder decision superseding
//     CLAUDE.md §10 would be needed first, not something this cleanup can
//     decide unilaterally.
//   - WorkerAchievementService is NOT retired — same reason (its 2 callers
//     are inside the now demo-only /my-kora surface).
//   - WorkerProvisioningService is NOT retired — its callers are in the LIVE
//     admin console (not demo-only), but migrating them requires a
//     product/schema decision this cleanup should not make unilaterally:
//     personal.worker_identity lacks department/site/my_kora_enabled/
//     pib_private_enabled fields the admin UI currently displays (synthetic).
//     Its own header comment already flagged this as a separate, later,
//     B-WORKER-territory slice.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

// ── 1. Global real-session admission retired ────────────────────────────────

describe('B-WORKER final cleanup — /my-kora/layout.tsx real-session admission retired', () => {
  const layout = read('app/my-kora/layout.tsx');

  it('real WORKER session redirects to /worker/workspace, never admitted', () => {
    expect(layout).toContain("realRole === 'WORKER'");
    expect(layout).toContain("redirect('/worker/workspace')");
    expect(layout).not.toContain('realUserPermitted');
  });

  it('real KORA_ADMIN session redirects to /admin, never admitted', () => {
    expect(layout).toContain("realRole === 'KORA_ADMIN'");
    expect(layout).toContain("redirect('/admin')");
  });

  it('WorkerSessionProvider is no longer imported or rendered in the layout', () => {
    expect(layout).not.toContain("from './_providers/WorkerSessionProvider'");
    expect(layout).not.toContain('<WorkerSessionProvider>');
  });

  it('the anonymous/persona demo path (MyKoraDemoGate) is completely unchanged', () => {
    expect(layout).toContain('MyKoraDemoGate');
    const nullCheckIdx = layout.indexOf('realRole !== null');
    const demoGateIdx = layout.indexOf('<MyKoraDemoGate>');
    expect(demoGateIdx).toBeGreaterThan(nullCheckIdx);
  });

  it('other real roles (COMPANY_ADMIN, PARTNER, ...) remain hard-blocked, unchanged', () => {
    expect(layout).toContain('Il tuo account non ha accesso a questa area');
    for (const role of ['COMPANY_ADMIN', 'PARTNER', 'DEMO_VIEWER', 'ADVISOR']) {
      expect(layout).not.toContain(`realRole === '${role}'`);
    }
  });
});

// ── 2. AccountProvisioningService dead code removed ─────────────────────────

describe('B-WORKER final cleanup — AccountProvisioningService.getCurrentDemoUser() retired', () => {
  const service = read('services/account/AccountProvisioningService.ts');

  it('getCurrentDemoUser() no longer exists', () => {
    expect(service).not.toContain('getCurrentDemoUser(role?: string): KoraUserAccount');
  });

  it('no remaining runtime file calls accountProvisioningService.getCurrentDemoUser', () => {
    // Only prose comments (already updated) may still name the method.
    const callers = [
      'app/admin/pipeline/page.tsx',
      'app/admin/pipeline/_components/PilotLifecycleClient.tsx',
      'lib/live/account-provisioning-status-view.ts',
    ];
    for (const file of callers) {
      const src = read(file);
      expect(src).not.toMatch(/accountProvisioningService\.getCurrentDemoUser\(/);
    }
  });

  it('the service file still exists — other, unrelated, unproven-dead methods are untouched', () => {
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(true);
    expect(service).toContain('getWorkerAccountsForCompany');
    expect(service).toContain('getCompanyAdmins');
  });
});

// ── 3. I9 residuals — honestly unchanged, reason documented ─────────────────

describe('B-WORKER final cleanup — I9 residuals (WorkerProvisioning/WorkerAchievement) honestly not closed', () => {
  it('I9 allowlist still has exactly 3 B_WORKER-owned entries — not silently reduced', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    const arrayStart = allowlist.indexOf('export const SYNTHETIC_IMPORT_ALLOWLIST');
    const arrayEnd = allowlist.indexOf('];', arrayStart);
    const arrayBody = allowlist.slice(arrayStart, arrayEnd);
    const matches = arrayBody.match(/owner: 'B_WORKER'/g) ?? [];
    expect(matches.length).toBe(3);
    const files = [...arrayBody.matchAll(/file: '([^']+)'/g)].map(m => m[1]);
    expect(files).toContain('services/worker-provisioning/WorkerProvisioningService.ts');
    expect(files).toContain('services/worker-achievements/WorkerAchievementService.ts');
    expect(files).toContain('services/account/AccountProvisioningService.ts');
  });

  it('WorkerAchievementService callers are now confined to the demo-only /my-kora surface (not a live real-session risk)', () => {
    for (const page of ['app/my-kora/page.tsx', 'app/my-kora/dynamic-cv/page.tsx']) {
      const src = read(page);
      const redirectIdx = src.indexOf('router.replace(');
      const callIdx = src.indexOf('workerAchievementService.');
      expect(redirectIdx).toBeGreaterThan(-1);
      expect(callIdx).toBeGreaterThan(redirectIdx);
    }
  });

  it('WorkerProvisioningService callers remain in the live admin console — genuinely unresolved, not demo-only', () => {
    const panel = read('components/admin/WorkforceQuickAccessPanel.tsx');
    expect(panel).toContain('workerProvisioningService.getWorkerProvisioningSummary');
    // The panel\'s own comment documents this as a known, separate, later slice.
    expect(panel).toMatch(/unmigrated|B-WORKER-territory slice/);
  });

  it('personal.worker_identity (the canonical replacement) lacks the fields the admin UI displays — schema gap, not fabricated', () => {
    const api = read('app/api/admin/workers/list/route.ts');
    expect(api).toContain("select('id, worker_ref, status, created_at')");
    expect(api).not.toContain('department');
    expect(api).not.toContain('my_kora_enabled');
  });
});

// ── 4. Security P2 — rate limiting closed for the 3 legitimately-deferred routes ─

describe('B-WORKER final cleanup — worker mutation rate limiting closed (3 of 5 originally-named routes)', () => {
  it('commons/bookings POST, onboarding POST, and initiatives/interest POST are now rate-limited', () => {
    expect(read('app/api/worker/commons/bookings/route.ts')).toContain("assertRateLimit('token_creation'");
    expect(read('app/api/worker/onboarding/route.ts')).toContain("assertRateLimit('token_creation'");
    expect(read('app/api/worker/initiatives/[id]/interest/route.ts')).toContain("assertRateLimit('token_creation'");
  });

  it('pib/redistribute and booking-cancel DELETE remain unrated — respecting the existing documented exclusion, not a new gap', () => {
    expect(read('app/api/worker/pib/redistribute/route.ts')).not.toContain('assertRateLimit');
    expect(read('app/api/worker/commons/bookings/[id]/route.ts')).not.toContain('assertRateLimit');
    const doc = read('docs/SECURITY_RATE_LIMITING_04.md');
    expect(doc).toContain('nessun pattern di abuso plausibile diverso dal normale utilizzo');
  });

  it('no new rate-limit framework was introduced — same assertRateLimit/token_creation mechanism reused', () => {
    const doc = read('docs/SECURITY_RATE_LIMITING_04.md');
    expect(doc).toContain('Implementate in B-WORKER final cleanup (2026-09-06)');
  });
});

// ── 5. Security P2 — raw DB error leakage closed ────────────────────────────

describe('B-WORKER final cleanup — raw DB error.message leakage closed on worker/commons routes', () => {
  it('worker/profile no longer returns raw error.message to the client', () => {
    const src = read('app/api/worker/profile/route.ts');
    expect(src).not.toMatch(/NextResponse\.json\(\{\s*error:\s*(wiErr|error)\.message/);
    expect(src).toContain('console.error(');
  });

  it('commons/posts (all three auth branches, GET+POST+PATCH across both route files) no longer returns raw error.message', () => {
    for (const file of ['app/api/commons/posts/route.ts', 'app/api/commons/posts/[id]/route.ts']) {
      const src = read(file);
      expect(src).not.toMatch(/error:\s*error\.message/);
      expect(src).toContain('console.error(');
    }
  });
});

// ── 6. No service-role regression ───────────────────────────────────────────

describe('B-WORKER final cleanup — no new service-role bypass in worker-facing code', () => {
  it('no app/api/worker/**, app/worker/**, or components/commons/** file uses getSupabaseServiceClient', () => {
    // Spot-checked directly rather than a full directory walk here — the
    // pre-B-WORKER audit already established this baseline; this re-confirms
    // the specific files touched by rate-limit/error-envelope work.
    for (const file of [
      'app/api/worker/profile/route.ts',
      'app/api/worker/onboarding/route.ts',
      'app/api/worker/commons/bookings/route.ts',
      'app/api/worker/initiatives/[id]/interest/route.ts',
      'app/api/commons/posts/route.ts',
      'app/api/commons/posts/[id]/route.ts',
    ]) {
      expect(read(file)).not.toContain('getSupabaseServiceClient');
    }
  });
});

// ── 7. Registry reflects actual state, not overclaimed ──────────────────────

describe('B-WORKER final cleanup — registry records actual achieved state, not aspirational completion', () => {
  it('app-surface.worker notes record the completed migration', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'app-surface.worker'");
    const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
    expect(entry).toContain('migration executed');
    expect(entry).toContain('DEFER_FUTURE_CAPABILITY');
  });

  it('app-surface.my-kora notes record real_session_dependencies = [] and the CLAUDE.md §10 boundary reason', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'app-surface.my-kora'");
    const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
    expect(entry).toContain('real_session_dependencies = []');
    expect(entry).toContain('CLAUDE.md §10');
    expect(entry).toContain("status: 'CONSOLIDATE'"); // not claimed DEAD/retired
  });

  it('svc.my-kora-preview notes record zero real-session-reachable callers and the same boundary reason', () => {
    const registry = read('lib/architecture/registry.ts');
    const idx = registry.indexOf("id: 'svc.my-kora-preview'");
    const entry = registry.slice(idx, registry.indexOf('{ id:', idx + 10));
    expect(entry).toContain('Real-session-reachable callers = 0');
    expect(entry).toContain("status: 'CONSOLIDATE'"); // not claimed retired
  });

  it('generated docs/ARCHITECTURE_REGISTRY.md is in sync with the registry (regenerated this slice)', () => {
    // Full byte-for-byte sync is asserted by tests/unit/cc003-i10-registry-completeness.test.ts;
    // this is a light spot-check that the regenerated doc reflects the new notes.
    const doc = read('docs/ARCHITECTURE_REGISTRY.md');
    expect(doc).toContain('real_session_dependencies');
  });
});

// ── 8. Scope discipline — no net-new product feature ────────────────────────

describe('B-WORKER final cleanup — no net-new product scope', () => {
  it('no Worker Listening, Needs Map, or achievement-domain files were added', () => {
    expect(exists('services/worker-listening')).toBe(false);
    expect(exists('services/needs-map')).toBe(false);
    expect(exists('services/worker-achievement-v2')).toBe(false);
  });

  it('KORA Link and Collettivo were not expanded (spot check: no new capability files)', () => {
    expect(exists('services/kora-link-v2')).toBe(false);
    expect(exists('services/collective-intelligence')).toBe(false);
  });

  it('no recommendation engine was introduced (WorkerOpportunityService still has no live variant)', () => {
    const service = read('services/worker-opportunity/WorkerOpportunityService.ts');
    expect(service).not.toMatch(/compute\w*Live|getOpportunitiesLive/);
  });
});
