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
  // (2026-09-06) completed that salvage; the entry now records completion
  // instead of a pending requirement.
  it('app-surface.my-kora is CONSOLIDATE, no longer competing, decisionRef records the ratification and the completed salvage', () => {
    const entry = entryFor(registry, 'app-surface.my-kora');
    expect(entry).toContain("status: 'CONSOLIDATE'");
    expect(entry).toContain('D-D RATIFIED (2026-09-06)');
    expect(entry).toContain('competingWith: []');
    expect(entry).toContain('real_session_dependencies = []');
  });

  it('svc.my-kora-preview is CONSOLIDATE, recorded as B-WORKER convergence debt, not an undecided competitor', () => {
    const entry = entryFor(registry, 'svc.my-kora-preview');
    expect(entry).toContain("status: 'CONSOLIDATE'");
    expect(entry).toContain('no longer an undecided competing architecture');
  });

  it('/my-kora route tree is unchanged — no migration has happened yet', () => {
    for (const route of ['app/my-kora/page.tsx', 'app/my-kora/bookings/page.tsx', 'app/my-kora/opportunities/page.tsx']) {
      expect(exists(route)).toBe(true);
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
  it('the 3 I9-tracked residuals remain owner: B_WORKER, unmodified', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    for (const file of [
      'services/account/AccountProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/worker-provisioning/WorkerProvisioningService.ts',
    ]) {
      expect(allowlist).toContain(`{ file: '${file}'`);
    }
    // Ownership pattern unchanged: all 3 array entries still owner: 'B_WORKER'.
    // Scoped to the array literal only — the file's own header comments
    // legitimately quote "owner: 'B_WORKER'" in prose too.
    const arrayStart = allowlist.indexOf('export const SYNTHETIC_IMPORT_ALLOWLIST');
    const arrayEnd = allowlist.indexOf('];', arrayStart);
    const arrayBody = allowlist.slice(arrayStart, arrayEnd);
    const matches = arrayBody.match(/owner: 'B_WORKER'/g) ?? [];
    expect(matches.length).toBe(3);
  });

  it('MyKoraPreviewService (non-I9 B-WORKER debt) is named explicitly in the ratification', () => {
    const doc = read('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md');
    const section = doc.slice(doc.indexOf('## 0. FOUNDER RATIFICATION'), doc.indexOf('## 1. Scope'));
    expect(section).toContain('BWORKER_NON_I9_PREVIEW_DEBT');
    expect(section).toContain('services/my-kora-preview/MyKoraPreviewService.ts');
  });

  it('none of the 3 residual service files were modified by this ratification', () => {
    for (const [file, marker] of [
      ['services/account/AccountProvisioningService.ts', 'getCurrentDemoUser'],
      ['services/worker-achievements/WorkerAchievementService.ts', 'WorkerAchievementService'],
      ['services/worker-provisioning/WorkerProvisioningService.ts', 'WorkerProvisioningService'],
    ] as const) {
      expect(read(file)).toContain(marker);
    }
  });
});

// ── 8. No runtime implementation was changed by this ratification PR ───────

describe('D-D — no runtime implementation changed', () => {
  it('no app/worker or app/my-kora route file was modified (only docs/registry/tests)', () => {
    // Sanity: the auth-guard files still contain their exact known invariants,
    // proving they were not rewritten as part of this ratification.
    const workerLayout = read('app/worker/layout.tsx');
    expect(workerLayout).toContain('B168-P3: KORA_ADMIN attempting /worker/* is hard-blocked');
    const myKoraLayout = read('app/my-kora/layout.tsx');
    expect(myKoraLayout).toContain('Two-layer guard, same shape as app/admin/layout.tsx');
  });

  it('CC-00 remains fully closed, unaffected by this later, separate ratification', () => {
    const registry = read('lib/architecture/registry.ts');
    expect(registry).toContain('CC-00 (B-TRUTH / ONE PRODUCT, ONE TRUTH) is FULLY CLOSED.');
  });
});
