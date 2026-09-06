// tests/unit/cc024-worker-architecture-matrix.test.ts
// CC-024 — Worker Architecture Matrix (2026-09-06).
//
// Produces the 12-dimension architecture matrix the Master Plan requires
// before D-D can be founder-ratified (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md
// lines 480/482/808/869). This is an analysis + governance artifact task:
// no runtime code, auth model, or synthetic service is touched. Neither
// `/worker` nor `/my-kora` is marked canonical or retired. D-D remains OPEN.
//
// See docs/CC024_WORKER_ARCHITECTURE_MATRIX.md for the full matrix,
// migration cost/risk analysis, salvage maps, target architecture, and the
// draft (unratified) D-D decision text.

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

// ── 1. The matrix artifact exists and contains the required sections ───────

describe('CC-024 — matrix artifact exists with required sections', () => {
  const doc = read('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md');

  it('the document exists at the expected path', () => {
    expect(exists('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md')).toBe(true);
  });

  it('declares exactly 12 dimensions', () => {
    expect(doc).toContain('`DIMENSION_COUNT = 12`');
    for (let i = 1; i <= 12; i++) {
      expect(doc).toMatch(new RegExp(`^${i}\\. `, 'm'));
    }
  });

  it('contains the scored matrix, migration cost table, salvage maps, target architecture, and draft decision text', () => {
    expect(doc).toContain('## 5. Matrix');
    expect(doc).toContain('## 7. Migration cost (Options A / B / C)');
    expect(doc).toContain('## 8. Salvage map');
    expect(doc).toContain('## 9. Target end state (not implemented here)');
    expect(doc).toContain('## 10. Option scoring summary');
    expect(doc).toContain('## 11. Risk analysis');
    expect(doc).toContain('## 12. Recommendation');
    expect(doc).toContain('## 13. Proposed D-D founder decision text');
  });

  // PRIOR HISTORY (accurate as of the analysis phase, preserved verbatim):
  // "states a recommendation without claiming it is ratified" — the document
  // asserted `not.toMatch(/D-D\s+(is\s+)?ratified/i)`. D-D was RATIFIED the
  // same day (§0, added after the analysis phase) — the document now
  // legitimately contains "RATIFIED" language, in a clearly separated
  // section that says so explicitly. See tests/unit/dd-worker-surface-ratification.test.ts.
  it('records the Option C recommendation and its ratification in a clearly separated §0', () => {
    expect(doc).toContain('`RECOMMENDED_DD_OPTION = C`');
    expect(doc).toContain('## 0. FOUNDER RATIFICATION (2026-09-06)');
    expect(doc).toContain('`DD_STATUS = RATIFIED`');
    expect(doc).toContain('§§1–14 below are preserved verbatim');
  });

  it('explicitly disclaims implementation while recording ratification is done', () => {
    const section = doc.slice(doc.indexOf('## 14. Explicitly not done'));
    expect(section).toContain('No code, auth, or synthetic service was modified.');
    expect(section).toContain('This is no longer current — see §0 above');
    expect(section).toContain('B-WORKER has not started.');
    expect(section).toContain('Commercial review has not started.');
  });
});

// ── 2. Registry: both entries point to the matrix document ─────────────────
//
// PRIOR HISTORY (accurate as of the analysis phase, preserved verbatim): this
// describe block asserted "registry status unchanged, D-D remains open" —
// both surfaces shared decisionRef 'CC-024 / D-D', both competed with each
// other, neither was CANONICAL/DEAD/FROZEN. D-D was RATIFIED the same day
// (docs/CC024_WORKER_ARCHITECTURE_MATRIX.md §0) — see
// tests/unit/dd-worker-surface-ratification.test.ts for the current,
// post-ratification registry assertions (CANONICAL/CONSOLIDATE status,
// cleared competingWith, updated decisionRef). This block now only checks
// that both entries still point to the matrix document.

describe('CC-024 — registry entries point to the matrix document', () => {
  const registry = read('lib/architecture/registry.ts');

  it('both entries point to the new matrix document', () => {
    const workerIdx = registry.indexOf("id: 'app-surface.worker'");
    const myKoraIdx = registry.indexOf("id: 'app-surface.my-kora'");
    expect(workerIdx).toBeGreaterThan(-1);
    expect(myKoraIdx).toBeGreaterThan(-1);
    const workerEntry = registry.slice(workerIdx, registry.indexOf('{ id:', workerIdx + 10));
    const myKoraEntry = registry.slice(myKoraIdx, registry.indexOf('{ id:', myKoraIdx + 10));
    expect(workerEntry).toContain('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md');
    expect(myKoraEntry).toContain('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md');
  });
});

// ── 3. No runtime code was changed by this slice ────────────────────────────

describe('CC-024 — no runtime/auth/service code was touched', () => {
  // PRIOR HISTORY (accurate as of CC-024, preserved verbatim): asserted
  // app/my-kora/layout.tsx's combined admission condition
  // `realRole === 'WORKER' || realRole === 'KORA_ADMIN'` was unchanged — true
  // at analysis time (CC-024 was read-only). B-WORKER final cleanup
  // (2026-09-06) later retired that admission branch entirely (redirects
  // instead) — this test file's own scope was "no runtime code touched
  // during CC-024 itself," not a permanent invariant.
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): asserted
  // app/my-kora/layout.tsx still contained getSessionKoraRole (server-side
  // admission check), unchanged at CC-024 analysis time. B-WORKER "One
  // Product / No Demo Runtime" correction (2026-09-06) removed that
  // admission logic entirely — layout.tsx is now a trivial pass-through.
  it('worker auth files were unchanged during CC-024 itself (governing invariants); my-kora layout admission was later fully retired (superseding the B-WORKER final cleanup PRIOR HISTORY note above)', () => {
    const workerLayout = read('app/worker/layout.tsx');
    expect(workerLayout).toContain('getCurrentWorkerUser');
    const myKoraLayout = read('app/my-kora/layout.tsx');
    expect(myKoraLayout).not.toContain('getSessionKoraRole');
  });

  // PRIOR HISTORY (accurate as of CC-024, preserved verbatim): asserted all
  // 3 B-WORKER-owned residuals were untouched. B-WORKER "One Product / No
  // Demo Runtime" correction (2026-09-06) retired WorkerAchievementService.ts
  // (zero real callers) — 2 remained. B-WORKER AccountProvisioning dead-code
  // retirement (2026-09-06, the next slice) retired AccountProvisioningService.ts
  // too — 1 remains.
  it('the 1 remaining B-WORKER-owned synthetic residual is untouched; WorkerAchievementService and AccountProvisioningService both retired since', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
    ]) {
      expect(exists(file)).toBe(true);
    }
    expect(exists('services/worker-achievements/WorkerAchievementService.ts')).toBe(false);
    expect(exists('services/account/AccountProvisioningService.ts')).toBe(false);
  });

  // PRIOR HISTORY (accurate as of CC-024, preserved verbatim): "MyKoraPreviewService
  // is untouched, still exists." B-WORKER "One Product / No Demo Runtime"
  // correction (2026-09-06) deleted it entirely — zero real callers once
  // every /my-kora/** page became a pure canonical redirect.
  it('MyKoraPreviewService is retired, no longer exists', () => {
    expect(exists('services/my-kora-preview/MyKoraPreviewService.ts')).toBe(false);
  });
});

// ── 4. Worker governance tests still pass (sanity — run separately too) ────

describe('CC-024 — pre-existing worker-surface governance guard still intact and updated', () => {
  // PRIOR HISTORY (accurate as of D-D ratification, preserved verbatim):
  // "cc003 registry completeness now asserts the ratified CANONICAL/CONSOLIDATE
  // split." B-WORKER "One Product / No Demo Runtime" correction (2026-09-06)
  // moved app-surface.my-kora from CONSOLIDATE to DEAD.
  it('cc003 registry completeness now asserts /worker CANONICAL and /my-kora DEAD', () => {
    const guard = read('tests/unit/cc003-i10-registry-completeness.test.ts');
    expect(guard).toContain('/worker is CANONICAL and /my-kora is DEAD');
  });
});

// ── 5. CC-00 remains closed, B-WORKER/commercial review not started ────────

describe('CC-024 — CC-00 closure and downstream-not-started status unaffected', () => {
  it('registry still records CC-00 fully closed and B-WORKER/commercial review not started', () => {
    const registry = read('lib/architecture/registry.ts');
    expect(registry).toContain('CC-00 (B-TRUTH / ONE PRODUCT, ONE TRUTH) is FULLY CLOSED.');
    expect(registry).toContain('B-WORKER has NOT started; no N1/NB work started; no');
  });
});
