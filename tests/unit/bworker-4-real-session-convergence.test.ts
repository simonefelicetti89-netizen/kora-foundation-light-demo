// tests/unit/bworker-4-real-session-convergence.test.ts
// B-WORKER Slice 4 — Residual real-session dependency elimination (2026-09-06).
//
// Fresh repository-wide inventory found MORE than the three previously-known
// residuals (KORA_ADMIN Home/PIB preview, WORKER Home/KORA Link/Collettivo):
// it also found a genuine, previously-undiscovered duplicate real-session
// runtime on /my-kora/personal-impact-balance — a 'live' branch rendering
// real PIB data via its own fetch, duplicating /worker/personal-impact-balance
// (built in Slice 1). This slice closes every one of those except a single,
// deliberately deferred item: /my-kora/opportunities (personalized
// recommendation content) has no canonical replacement and none was built
// here — "Do NOT expand opportunity recommendation" is explicit scope.

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

// ── 1. KORA_ADMIN admin-preview: Home, PIB, KORA Link, Bookings all off /my-kora

describe('B-WORKER-4 — KORA_ADMIN admin-preview no longer falls back to /my-kora anywhere', () => {
  const sidebar = read('components/layout/Sidebar.tsx');
  const workerSection = sidebar.slice(sidebar.indexOf("heading: isAdminPreview ? 'Worker Preview (Admin)'"));

  it('Home, PIB, KORA Link, and Bookings admin-preview branches all point at the existing hub', () => {
    expect(workerSection).toContain("isAdminPreview ? '/admin/preview/worker' : '/worker/workspace'");
    expect(workerSection).toContain("isAdminPreview ? '/admin/preview/worker' : '/worker/personal-impact-balance'");
    expect(workerSection).toContain("isAdminPreview ? '/admin/preview/worker' : '/worker/kora-link/activate'");
    expect(workerSection).toContain("isAdminPreview ? '/admin/preview/worker' : '/worker/bookings'");
  });

  it('no isAdminPreview branch in the worker Sidebar section falls back to /my-kora', () => {
    // Scoped to the ternary-branch pattern specifically, not the whole file
    // (which legitimately still names /my-kora in the real-WORKER branches
    // of the KORA Space/Collettivo entries, addressed separately below).
    const adminPreviewBranches = workerSection.match(/isAdminPreview \? '[^']+' : '([^']+)'/g) ?? [];
    for (const branch of adminPreviewBranches) {
      expect(branch).not.toContain("'/my-kora");
    }
  });

  it('no second admin preview engine was built — the hub only links to the 3 existing pages', () => {
    const hub = read('app/admin/preview/worker/page.tsx');
    expect(hub).not.toMatch(/fetch\(|getSupabaseServiceClient|getSupabaseServerClient/);
  });
});

// ── 2. WORKER Home: canonical destination is /worker/workspace ─────────────

describe('B-WORKER-4 — WORKER Home converges on /worker/workspace, no new home built', () => {
  it('Sidebar real-worker "My KORA Home" entry points to /worker/workspace', () => {
    const sidebar = read('components/layout/Sidebar.tsx');
    const workerSection = sidebar.slice(sidebar.indexOf("heading: isAdminPreview ? 'Worker Preview (Admin)'"));
    expect(workerSection).toContain("isAdminPreview ? '/admin/preview/worker' : '/worker/workspace'");
  });

  it('/my-kora (Home) redirects a confirmed real session to /worker/workspace instead of rendering synthetic home content', () => {
    const home = read('app/my-kora/page.tsx');
    expect(home).toContain("router.replace('/worker/workspace')");
  });

  it('the synthetic-only pieces of Home (next-best-action, achievements, personalized opportunities) were not rebuilt as real features', () => {
    const home = read('app/my-kora/page.tsx');
    // Still present — as demo-only content, not migrated/rebuilt as canonical
    expect(home).toContain('computeNextAction');
    expect(home).toContain('workerAchievementService');
    expect(home).toContain('workerOpportunityService');
  });

  it('/worker/commons\' back-link no longer points at /my-kora — points at the canonical home', () => {
    const commons = read('app/worker/commons/page.tsx');
    expect(commons).toContain('href="/worker/workspace"');
    expect(commons).not.toContain('href="/my-kora"');
  });
});

// ── 3. Personal Impact Balance: previously-undiscovered duplicate closed ───

describe('B-WORKER-4 — /my-kora/personal-impact-balance duplicate real-session runtime closed', () => {
  const legacy = read('app/my-kora/personal-impact-balance/page.tsx');

  it('the removed live branch used to render real PIB data from its own /api/worker/pib fetch — now redirects instead', () => {
    expect(legacy).toContain("router.replace('/worker/personal-impact-balance')");
    expect(legacy).not.toContain("setLivePIBState('live')");
  });

  it('the dead isRealWorkerMode-gated JSX (e.g. pib-live-notice) is now permanently unreachable, not deleted but inert', () => {
    expect(legacy).toContain('const isRealWorkerMode = false;');
    // Any `isRealWorkerMode && (...)` block can never render now that the
    // constant is a fixed false — confirmed by the constant declaration
    // itself rather than by asserting the dead markup was deleted.
  });

  it('no duplicate real-PIB state remains — isRealWorkerMode is a fixed constant now, not derived from a live fetch result', () => {
    expect(legacy).toContain('const isRealWorkerMode = false;');
    expect(legacy).not.toContain('livePIB.isSynthetic');
  });

  it('demo/persona content (workerPIBService.getPIB, myKoraPreviewService gate) is unchanged', () => {
    expect(legacy).toContain('workerPIBService.getPIB(personaId, activeScenario)');
    expect(legacy).toContain('myKoraPreviewService.canAccess(activeRole)');
  });
});

// ── 4. KORA Link: no unique value beyond /worker/kora-link/activate ────────

describe('B-WORKER-4 — KORA Link converges on /worker/kora-link/activate, no expansion', () => {
  it('/my-kora/kora-link redirects a confirmed real session to the canonical shell', () => {
    const legacy = read('app/my-kora/kora-link/page.tsx');
    expect(legacy).toContain('getSessionKoraRole');
    expect(legacy).toContain("redirect('/worker/kora-link/activate')");
  });

  it('the canonical page is real-auth-gated and still a non-functional preview (no expansion)', () => {
    const canonical = read('app/worker/kora-link/activate/page.tsx');
    expect(canonical).toContain('requireWorkerUser');
    expect(canonical).toContain('disabled');
    expect(canonical).toContain('Non attivo');
  });

  it('Sidebar "My KORA Link" entry is isAdminPreview-aware, real worker points to canonical shell, no duplicate second entry remains', () => {
    const sidebar = read('components/layout/Sidebar.tsx');
    expect(sidebar).toContain("isAdminPreview ? '/admin/preview/worker' : '/worker/kora-link/activate'");
    // The old duplicate "Attiva KORA Link" entry pointing at the same page is gone
    expect(sidebar).not.toContain("label: 'Attiva KORA Link'");
  });
});

// ── 5. Collettivo: honest empty state moved off the transitional runtime ───

describe('B-WORKER-4 — Collettivo: no functionality invented, honest state moved off /my-kora', () => {
  const legacy = read('app/my-kora/collective/page.tsx');

  it('a confirmed real session redirects to /worker/workspace — no live collective data path was built', () => {
    expect(legacy).toContain("router.replace('/worker/workspace')");
    expect(legacy).not.toContain('data-testid="collective-empty-state"');
  });

  it('no KORA Contribution / collective intelligence feature was implemented this slice', () => {
    expect(legacy).not.toMatch(/contribution.*api\/worker|new.*contribution.*service/i);
  });

  it('demo content is unchanged — still clearly labelled synthetic', () => {
    expect(legacy).toContain('Dati sintetici illustrativi');
  });
});

// ── 6. Authenticated navigation convergence ─────────────────────────────────

describe('B-WORKER-4 — authenticated navigation converges on /worker, with one honestly-reported exception', () => {
  it('the Sidebar "Collettivo" entry is comingSoon (disabled, not a real navigable link)', () => {
    const sidebar = read('components/layout/Sidebar.tsx');
    const idx = sidebar.indexOf("label: 'Collettivo'");
    const collectiveLine = sidebar.slice(idx, idx + 120);
    expect(collectiveLine).toContain('comingSoon: true');
  });

  it('the Sidebar "KORA Space (Anteprima)" entry remains — legitimate demo-only content for anonymous/persona visitors, real sessions are safely redirected by the page itself (Slice 3)', () => {
    const sidebar = read('components/layout/Sidebar.tsx');
    expect(sidebar).toContain("label: 'KORA Space (Anteprima)'");
    const legacy = read('app/my-kora/kora-space/page.tsx');
    expect(legacy).toContain("router.replace('/worker/commons')");
  });

  // PRIOR HISTORY (accurate as of B-WORKER-4, preserved verbatim): asserted
  // /my-kora/opportunities had no redirect (explicitly deferred at the time
  // — no canonical recommendation engine existed to redirect to). B-WORKER-5
  // (2026-09-06) closed it anyway: no recommendation engine was built, but a
  // confirmed real session now redirects to /worker/opportunities (a
  // different, real, non-personalized product concept — the truthful
  // current opportunities capability) instead of executing the synthetic
  // personalization runtime. See tests/unit/bworker-5-opportunities-retirement.test.ts.
  it('/my-kora/opportunities no longer executes for a real session — redirects to /worker/opportunities, no recommendation engine was built', () => {
    const opportunities = read('app/my-kora/opportunities/page.tsx');
    expect(opportunities).toContain("router.replace('/worker/opportunities')");
    expect(opportunities).toContain('workerOpportunityService'); // demo path unchanged
    const sidebarStr = read('components/layout/Sidebar.tsx');
    expect(sidebarStr).not.toContain("'/my-kora/opportunities'");
  });
});

// ── 7. MyKoraPreviewService reachability — dramatically reduced, not zero ──

describe('B-WORKER-4 — MyKoraPreviewService real-session reachability reduced from ~all callers to one deferred path', () => {
  const pages = [
    'app/my-kora/page.tsx',
    'app/my-kora/dynamic-cv/page.tsx',
    'app/my-kora/privacy/page.tsx',
    'app/my-kora/collective/page.tsx',
    'app/my-kora/kora-space/page.tsx',
    'app/my-kora/personal-impact-balance/page.tsx',
  ];

  it('every page above (all real-session-reachable capabilities with a canonical replacement) redirects before reaching demo content', () => {
    for (const page of pages) {
      const src = read(page);
      expect(src).toMatch(/router\.replace\(|redirect\(/);
    }
  });

  // PRIOR HISTORY (accurate as of B-WORKER-4, preserved verbatim): asserted
  // opportunities had no redirect. B-WORKER-5 (2026-09-06) added one — see
  // tests/unit/bworker-5-opportunities-retirement.test.ts for the current
  // assertions. Zero MyKoraPreviewService callers remain real-session-reachable.
  it('/my-kora/opportunities now also redirects — no MyKoraPreviewService caller remains real-session-reachable', () => {
    const opportunities = read('app/my-kora/opportunities/page.tsx');
    expect(opportunities).toMatch(/router\.replace\(/);
  });
});

// ── 8. Admin preview boundary preserved ─────────────────────────────────────

describe('B-WORKER-4 — admin preview boundary preserved', () => {
  it('the hub and all 3 preview pages remain requireKoraAdmin-gated', () => {
    expect(read('app/admin/preview/worker/page.tsx')).toContain('requireKoraAdmin');
    expect(read('app/admin/preview/worker/dynamic-cv/page.tsx')).toContain('requireKoraAdmin');
    expect(read('app/admin/preview/worker/opportunities/page.tsx')).toContain('requireKoraAdmin');
    expect(read('app/admin/preview/worker/privacy/page.tsx')).toContain('requireKoraAdmin');
  });

  it('no admin preview page reads real worker-private data', () => {
    for (const p of [
      'app/admin/preview/worker/page.tsx',
      'app/admin/preview/worker/dynamic-cv/page.tsx',
      'app/admin/preview/worker/privacy/page.tsx',
    ]) {
      const src = read(p);
      expect(src).not.toMatch(/personal\.worker_pib|personal\.worker_identity/);
    }
  });
});

// ── 9. /my-kora/layout.tsx admission branch still present (not globally retired) ─

describe('B-WORKER-4 — global /my-kora real-session admission not yet retired', () => {
  it('layout.tsx still has its realUserPermitted admission branch — /my-kora/opportunities still needs it', () => {
    const layout = read('app/my-kora/layout.tsx');
    expect(layout).toContain('realUserPermitted');
    expect(layout).toContain('WorkerSessionProvider');
  });
});

// ── 10. Scope discipline ────────────────────────────────────────────────────

describe('B-WORKER-4 — no net-new product scope', () => {
  it('no new API route or service was introduced by this slice', () => {
    expect(exists('app/api/worker/home')).toBe(false);
    expect(exists('app/api/worker/collective')).toBe(false);
    expect(exists('services/worker-home')).toBe(false);
    expect(exists('services/collective')).toBe(false);
  });

  it('no Worker Listening, Needs Map, or new achievement/privacy model files were added', () => {
    expect(exists('services/worker-listening')).toBe(false);
    expect(exists('services/needs-map')).toBe(false);
  });

  it('requireWorkerUser / requireKoraAdmin / getSessionKoraRole unchanged (spot check)', () => {
    const session = read('lib/auth/kora-session.ts');
    expect(session).toContain('export async function requireWorkerUser');
    expect(session).toContain('export async function requireKoraAdmin');
    expect(session).toContain('export async function getSessionKoraRole');
  });
});
