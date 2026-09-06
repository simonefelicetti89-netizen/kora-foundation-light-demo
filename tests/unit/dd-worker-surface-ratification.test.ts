// tests/unit/dd-worker-surface-ratification.test.ts
// D-D — Worker Surface Decision, Founder Ratification (2026-09-06).
//
// Records an already-made founder decision (Option C — converged canonical
// surface). Governance-only: no runtime, auth, or synthetic-service code is
// touched by this ratification. See docs/CC024_WORKER_ARCHITECTURE_MATRIX.md
// §0 for the full decision text, B-WORKER entry contract, and residual/debt
// inventory this ratification records.

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

function entryFor(registry: string, id: string): string {
  const idx = registry.indexOf(`id: '${id}'`);
  expect(idx, `entry ${id} not found`).toBeGreaterThan(-1);
  return registry.slice(idx, registry.indexOf('{ id:', idx + 10));
}

// ── 1. D-D is ratified ───────────────────────────────────────────────────────

describe('D-D — ratification is recorded', () => {
  const doc = read('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md');

  it('the matrix document records DD_STATUS = RATIFIED with the exact decision facts', () => {
    expect(doc).toContain('## 0. FOUNDER RATIFICATION (2026-09-06)');
    expect(doc).toContain('`DD_STATUS = RATIFIED`');
    expect(doc).toContain('`DD_OPTION = C`');
    expect(doc).toContain('`CANONICAL_TECHNICAL_FOUNDATION = /worker`');
    expect(doc).toContain('`CANONICAL_PRODUCT_BRAND = My KORA`');
    expect(doc).toContain('`MIGRATION_MODEL = CONVERGED_CANONICAL_SURFACE`');
    expect(doc).toContain('`SECOND_WORKER_RUNTIME_ALLOWED = NO`');
    expect(doc).toContain('`SALVAGE_BEFORE_RETIREMENT = REQUIRED`');
  });

  it('the decision is explicitly framed as convergence, not a unilateral win', () => {
    const section = doc.slice(doc.indexOf('## 0. FOUNDER RATIFICATION'), doc.indexOf('## 1. Scope'));
    expect(section).toContain('This is explicitly a **convergence decision**');
    expect(section).toContain('not "keep `/worker`," not "keep `/my-kora`."');
  });

  it('the original analysis and recommendation (§§1-13) are preserved verbatim, not rewritten', () => {
    expect(doc).toContain('## 5. Matrix');
    expect(doc).toContain('## 12. Recommendation');
    expect(doc).toContain('`RECOMMENDED_DD_OPTION = C`');
    expect(doc).toContain('§§1–14 below are preserved verbatim');
  });
});

// ── 2. Option C is the canonical decision ───────────────────────────────────

describe('D-D — Option C is the ratified option, matching the prior recommendation', () => {
  it('the ratified option is the same option the matrix recommended (no substitution)', () => {
    const doc = read('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md');
    const ratificationSection = doc.slice(doc.indexOf('## 0. FOUNDER RATIFICATION'), doc.indexOf('## 1. Scope'));
    expect(ratificationSection).toContain('`DD_OPTION = C`');
    expect(ratificationSection).toContain('adopts, verbatim, §12–13\'s recommendation');
  });
});

// ── 3. /worker is the technical foundation ──────────────────────────────────

describe('D-D — /worker is the canonical technical foundation', () => {
  const registry = read('lib/architecture/registry.ts');

  it('app-surface.worker is CANONICAL, decisionRef records the ratification, no longer competing', () => {
    const entry = entryFor(registry, 'app-surface.worker');
    expect(entry).toContain("status: 'CANONICAL'");
    expect(entry).toContain('D-D RATIFIED (2026-09-06)');
    expect(entry).toContain('competingWith: []');
  });

  it('app-surface.worker source (auth model) is unchanged by this ratification', () => {
    const layout = read('app/worker/layout.tsx');
    expect(layout).toContain('getCurrentWorkerUser');
  });
});

// ── 4. My KORA is the product brand ─────────────────────────────────────────

describe('D-D — My KORA is the permanent product brand', () => {
  it('the ratification names My KORA as the canonical product brand, independent of the surviving codebase', () => {
    const doc = read('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md');
    const section = doc.slice(doc.indexOf('## 0. FOUNDER RATIFICATION'), doc.indexOf('## 1. Scope'));
    expect(section).toContain('The canonical product experience and permanent worker-facing brand is **My KORA**');
  });

  it('CLAUDE.md still protects "My KORA" as a permanent proprietary name (unchanged by this ratification)', () => {
    const claude = read('CLAUDE.md');
    expect(claude).toContain('My KORA');
  });
});

// ── 5. /my-kora is transitional, not a final competing runtime ─────────────

describe('D-D — /my-kora is transitional, salvage required before retirement', () => {
  const registry = read('lib/architecture/registry.ts');

  // PRIOR HISTORY (accurate as of the ratification itself, preserved
  // verbatim): asserted the entry recorded "SALVAGE_BEFORE_RETIREMENT =
  // REQUIRED" — true before migration started. B-WORKER final cleanup
  // (2026-09-06) completed that salvage; the entry recorded completion
  // instead of a pending requirement. B-WORKER "One Product / No Demo
  // Runtime" correction (2026-09-06, same day, later slice) went further:
  // the surviving anonymous/persona runtime that final-cleanup preserved is
  // itself retired — app-surface.my-kora is now DEAD (pure redirect shell,
  // dependencies: []), not CONSOLIDATE.
  it('app-surface.my-kora is DEAD, no longer competing, decisionRef records both the ratification and the full retirement', () => {
    const entry = entryFor(registry, 'app-surface.my-kora');
    expect(entry).toContain("status: 'DEAD'");
    expect(entry).toContain('D-D RATIFIED');
    expect(entry).toContain('competingWith: []');
    expect(entry).toContain('dependencies: []');
  });

  // PRIOR HISTORY (accurate as of the ratification itself, preserved
  // verbatim): "svc.my-kora-preview is CONSOLIDATE, recorded as B-WORKER
  // convergence debt." B-WORKER "One Product / No Demo Runtime" correction
  // (2026-09-06) deleted the file entirely (zero real callers) — status DEAD.
  it('svc.my-kora-preview is DEAD (deleted), not an undecided competitor', () => {
    const entry = entryFor(registry, 'svc.my-kora-preview');
    expect(entry).toContain("status: 'DEAD'");
    expect(entry).toContain('DELETED');
  });

  // PRIOR HISTORY (accurate as of the ratification itself, preserved
  // verbatim): "/my-kora route tree is unchanged — no migration has happened
  // yet." B-WORKER slices 1-5, final cleanup, and this later correction
  // migrated and then fully retired the route tree to pure redirects — the
  // files still exist (kept as redirect shells), but their content changed.
  it('/my-kora route tree still exists as files, now as pure canonical redirects (not "unchanged")', () => {
    for (const route of ['app/my-kora/page.tsx', 'app/my-kora/bookings/page.tsx', 'app/my-kora/opportunities/page.tsx']) {
      expect(exists(route)).toBe(true);
      expect(read(route)).toContain('redirect(');
    }
  });
});

// ── 6. B-WORKER has not started/completed ───────────────────────────────────

describe('D-D — B-WORKER has not started', () => {
  it('registry still records B-WORKER as not started', () => {
    const registry = read('lib/architecture/registry.ts');
    expect(registry).toContain('B-WORKER has NOT started; no N1/NB work started; no');
  });

  it('the B-WORKER entry contract is recorded but not executed — no capability has been migrated', () => {
    const doc = read('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md');
    const section = doc.slice(doc.indexOf('## 0. FOUNDER RATIFICATION'), doc.indexOf('## 1. Scope'));
    expect(section).toContain('### B-WORKER Entry Contract (frozen by this ratification)');
    expect(section).toContain('Does not migrate any `/my-kora` capability yet.');
    expect(section).toContain('Does not retire');
  });
});

// ── 7. Synthetic B-WORKER residual ownership is unchanged ──────────────────

describe('D-D — B-WORKER synthetic residual ownership unchanged', () => {
  // PRIOR HISTORY (accurate as of the ratification itself, preserved
  // verbatim): "the 3 I9-tracked residuals remain owner: B_WORKER,
  // unmodified" (including WorkerAchievementService.ts). B-WORKER "One
  // Product / No Demo Runtime" correction (2026-09-06) retired
  // WorkerAchievementService.ts entirely (zero real callers) — 2 remained.
  // B-WORKER AccountProvisioning dead-code retirement (2026-09-06, the next
  // slice) retired AccountProvisioningService.ts too — 1 remained. B-WORKER
  // WorkerProvisioning Canonicalization (2026-09-06, the final B-WORKER
  // implementation slice, a later PR than this ratification) retired the
  // last one too — 0 I9-tracked residuals remain.
  it('zero I9-tracked B_WORKER residuals remain — all 3 named residuals have since been retired by later, separately-authorized slices', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    const arrayStart = allowlist.indexOf('export const SYNTHETIC_IMPORT_ALLOWLIST');
    const arrayEnd = allowlist.indexOf('];', arrayStart);
    const arrayBody = allowlist.slice(arrayStart, arrayEnd);
    expect(arrayBody).not.toContain(`{ file: 'services/worker-provisioning/WorkerProvisioningService.ts'`);
    expect(arrayBody).not.toContain(`{ file: 'services/worker-achievements/WorkerAchievementService.ts'`);
    expect(arrayBody).not.toContain(`{ file: 'services/account/AccountProvisioningService.ts'`);
    const matches = arrayBody.match(/owner: 'B_WORKER'/g) ?? [];
    expect(matches.length).toBe(0);
  });

  it('MyKoraPreviewService (non-I9 B-WORKER debt) is named explicitly in the ratification', () => {
    const doc = read('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md');
    const section = doc.slice(doc.indexOf('## 0. FOUNDER RATIFICATION'), doc.indexOf('## 1. Scope'));
    expect(section).toContain('BWORKER_NON_I9_PREVIEW_DEBT');
    expect(section).toContain('services/my-kora-preview/MyKoraPreviewService.ts');
  });

  // PRIOR HISTORY (accurate as of the ratification itself, preserved
  // verbatim): asserted all 3 residual service files, including
  // WorkerAchievementService.ts, were unmodified by this ratification (a
  // fact about THIS PR, at the time). B-WORKER "One Product / No Demo
  // Runtime" correction (2026-09-06) and B-WORKER AccountProvisioning
  // dead-code retirement (2026-09-06) are later, separately-authorized PRs
  // that did modify (retire) WorkerAchievementService.ts and
  // AccountProvisioningService.ts respectively — not a regression of this
  // ratification's own scope boundary. B-WORKER WorkerProvisioning
  // Canonicalization (2026-09-06, the final B-WORKER implementation slice,
  // also a later PR than this ratification) retired the last one too.
  it('all 3 residual service files, unmodified by this ratification itself, have since been retired by later, separately-authorized B-WORKER slices', () => {
    expect(exists('services/worker-provisioning/WorkerProvisioningService.ts')).toBe(false);
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
  });
});

// ── 8. No runtime implementation was changed by this ratification PR ───────

describe('D-D — no runtime implementation changed', () => {
  // PRIOR HISTORY (accurate as of the ratification itself, preserved
  // verbatim): asserted app/my-kora/layout.tsx still contained "Two-layer
  // guard, same shape as app/admin/layout.tsx" — true at ratification time
  // (a fact about THIS PR). B-WORKER "One Product / No Demo Runtime"
  // correction (2026-09-06) is a later, separately-authorized PR that did
  // rewrite app/my-kora/layout.tsx to a trivial pass-through — not a
  // regression of this ratification's own scope boundary.
  it('no app/worker or app/my-kora route file was modified BY THIS RATIFICATION PR (later, separately-authorized PRs did retire /my-kora)', () => {
    const workerLayout = read('app/worker/layout.tsx');
    expect(workerLayout).toContain('B168-P3: KORA_ADMIN attempting /worker/* is hard-blocked');
    const myKoraLayout = read('app/my-kora/layout.tsx');
    expect(myKoraLayout).not.toContain('getSessionKoraRole');
  });

  it('CC-00 remains fully closed, unaffected by this later, separate ratification', () => {
    const registry = read('lib/architecture/registry.ts');
    expect(registry).toContain('CC-00 (B-TRUTH / ONE PRODUCT, ONE TRUTH) is FULLY CLOSED.');
  });
});
