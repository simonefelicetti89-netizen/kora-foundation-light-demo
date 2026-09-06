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

  it('/my-kora (Home) redirects unconditionally to /worker/workspace instead of rendering synthetic home content', () => {
    const home = read('app/my-kora/page.tsx');
    expect(home).toContain("redirect('/worker/workspace')");
  });

  // PRIOR HISTORY (accurate as of B-WORKER-4, preserved verbatim): "the
  // synthetic-only pieces of Home ... were not rebuilt as real features" —
  // still present as demo-only content at the time. B-WORKER "One Product /
  // No Demo Runtime" correction (2026-09-06) removed them entirely rather
  // than rebuilding them — no next-best-action, achievements, or
  // personalized-opportunities feature exists on this page anymore, real or
  // synthetic.
  it('the synthetic-only pieces of Home were removed entirely, not rebuilt as real features', () => {
    const home = read('app/my-kora/page.tsx');
    expect(home).not.toContain('computeNextAction');
    expect(home).not.toContain('workerAchievementService');
    expect(home).not.toContain('workerOpportunityService');
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

  it('the removed live branch used to render real PIB data from its own /api/worker/pib fetch — now redirects unconditionally instead', () => {
    expect(legacy).toContain("redirect('/worker/personal-impact-balance')");
    expect(legacy).not.toContain("setLivePIBState('live')");
  });

  // PRIOR HISTORY (accurate as of B-WORKER-4, preserved verbatim): asserted
  // dead isRealWorkerMode-gated JSX was "permanently unreachable, not
  // deleted but inert" (isRealWorkerMode fixed to false). B-WORKER "One
  // Product / No Demo Runtime" correction (2026-09-06) removed the entire
  // page body, including that inert JSX and the isRealWorkerMode constant
  // itself — nothing to gate anymore, the page is a single redirect() call.
  it('the entire page body (including the former inert isRealWorkerMode JSX) is removed, not just made unreachable', () => {
    expect(legacy).not.toContain('isRealWorkerMode');
    expect(legacy).not.toContain('livePIB.isSynthetic');
  });

  // PRIOR HISTORY (accurate as of B-WORKER-4, preserved verbatim): "demo/
  // persona content (workerPIBService.getPIB, myKoraPreviewService gate) is
  // unchanged." B-WORKER "One Product / No Demo Runtime" correction
  // (2026-09-06) removed it entirely — no demo/persona content remains.
  it('no demo/persona content remains — workerPIBService.getPIB and myKoraPreviewService are both gone', () => {
    expect(legacy).not.toContain('workerPIBService.getPIB(');
    expect(legacy).not.toContain('myKoraPreviewService');
  });
});

// ── 4. KORA Link: no unique value beyond /worker/kora-link/activate ────────

describe('B-WORKER-4 — KORA Link converges on /worker/kora-link/activate, no expansion', () => {
  // PRIOR HISTORY (accurate as of B-WORKER-4, preserved verbatim): asserted
  // the page called getSessionKoraRole() to detect a confirmed real session
  // before redirecting. B-WORKER "One Product / No Demo Runtime" correction
  // (2026-09-06) made the redirect unconditional — no session check remains.
  it('/my-kora/kora-link redirects unconditionally to the canonical shell', () => {
    const legacy = read('app/my-kora/kora-link/page.tsx');
    expect(legacy).not.toContain('getSessionKoraRole');
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

  it('redirects unconditionally to /worker/workspace — no live collective data path was built', () => {
    expect(legacy).toContain("redirect('/worker/workspace')");
    expect(legacy).not.toContain('data-testid="collective-empty-state"');
  });

  it('no KORA Contribution / collective intelligence feature was implemented this slice', () => {
    expect(legacy).not.toMatch(/contribution.*api\/worker|new.*contribution.*service/i);
  });

  // PRIOR HISTORY (accurate as of B-WORKER-4, preserved verbatim): "demo
  // content is unchanged — still clearly labelled synthetic." B-WORKER "One
  // Product / No Demo Runtime" correction (2026-09-06) removed the demo
  // content entirely — a future-only capability retired outright, not
  // preserved as a demo, per explicit founder rule.
  it('no demo content remains — the future-only capability is retired outright, not preserved as a demo', () => {
    expect(legacy).not.toContain('Dati sintetici illustrativi');
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

  // PRIOR HISTORY (accurate as of B-WORKER-4, preserved verbatim): the
  // Sidebar "KORA Space (Anteprima)" entry was framed as "legitimate
  // demo-only content for anonymous/persona visitors." B-WORKER "One
  // Product / No Demo Runtime" correction (2026-09-06): that framing no
  // longer applies — /my-kora/kora-space redirects unconditionally now, so
  // this Sidebar entry (if still present) leads only to a redirect, not to
  // demo content, for anyone.
  it('the Sidebar "KORA Space (Anteprima)" entry, if present, leads only to an unconditional redirect — no demo content behind it', () => {
    const legacy = read('app/my-kora/kora-space/page.tsx');
    expect(legacy).toContain("redirect('/worker/commons')");
    expect(legacy).not.toContain('KORA_SPACE_ITEMS');
  });

  // PRIOR HISTORY (accurate as of B-WORKER-4, preserved verbatim): asserted
  // /my-kora/opportunities had no redirect (explicitly deferred at the time
  // — no canonical recommendation engine existed to redirect to). B-WORKER-5
  // (2026-09-06) closed it anyway: no recommendation engine was built, but a
  // confirmed real session now redirects to /worker/opportunities (a
  // different, real, non-personalized product concept — the truthful
  // current opportunities capability) instead of executing the synthetic
  // personalization runtime. See tests/unit/bworker-5-opportunities-retirement.test.ts.
  // PRIOR HISTORY (accurate as of B-WORKER-5, preserved verbatim): asserted
  // opportunities redirected only confirmed real sessions, preserving
  // workerOpportunityService for the demo path. B-WORKER "One Product / No
  // Demo Runtime" correction (2026-09-06) made the redirect unconditional —
  // no demo path, no workerOpportunityService call remains in this file.
  it('/my-kora/opportunities redirects unconditionally to /worker/opportunities, no recommendation engine was built', () => {
    const opportunities = read('app/my-kora/opportunities/page.tsx');
    expect(opportunities).toContain("redirect('/worker/opportunities')");
    expect(opportunities).not.toContain('workerOpportunityService');
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
  it('/my-kora/opportunities now also redirects — no MyKoraPreviewService caller remains reachable by anyone', () => {
    const opportunities = read('app/my-kora/opportunities/page.tsx');
    expect(opportunities).toMatch(/redirect\(/);
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

// PRIOR HISTORY (accurate as of B-WORKER-4, preserved verbatim): asserted
// layout.tsx still had its realUserPermitted admission branch because
// /my-kora/opportunities still needed it (no redirect yet). B-WORKER-5
// closed that last dependency, and B-WORKER final cleanup (2026-09-06)
// retired the admission branch entirely.
describe('B-WORKER-4 — global /my-kora real-session admission (superseded — see bworker-final-cleanup)', () => {
  it('layout.tsx no longer has a realUserPermitted admission branch', () => {
    const layout = read('app/my-kora/layout.tsx');
    expect(layout).not.toContain('realUserPermitted');
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
