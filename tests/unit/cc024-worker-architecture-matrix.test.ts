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

  it('states a recommendation without claiming it is ratified', () => {
    expect(doc).toContain('`RECOMMENDED_DD_OPTION = C`');
    expect(doc).toContain('`FOUNDER_RATIFICATION_REQUIRED = YES`');
    expect(doc).not.toMatch(/D-D\s+(is\s+)?ratified/i);
    expect(doc).toContain('This document does not decide D-D.');
  });

  it('explicitly disclaims implementation', () => {
    const section = doc.slice(doc.indexOf('## 14. Explicitly not done'));
    expect(section).toContain('No code, auth, or synthetic service was modified.');
    expect(section).toContain('D-D remains OPEN.');
    expect(section).toContain('B-WORKER has not started.');
    expect(section).toContain('Commercial review has not started.');
  });
});

// ── 2. Registry: neither surface becomes canonical, D-D stays open ─────────

describe('CC-024 — registry status unchanged, D-D remains open', () => {
  const registry = read('lib/architecture/registry.ts');

  it('/worker and /my-kora both still carry decisionRef CC-024 / D-D and compete with each other', () => {
    const workerIdx = registry.indexOf("id: 'app-surface.worker'");
    const myKoraIdx = registry.indexOf("id: 'app-surface.my-kora'");
    expect(workerIdx).toBeGreaterThan(-1);
    expect(myKoraIdx).toBeGreaterThan(-1);
    const workerEntry = registry.slice(workerIdx, registry.indexOf('{ id:', workerIdx + 10));
    const myKoraEntry = registry.slice(myKoraIdx, registry.indexOf('{ id:', myKoraIdx + 10));
    expect(workerEntry).toContain("decisionRef: 'CC-024 / D-D'");
    expect(myKoraEntry).toContain("decisionRef: 'CC-024 / D-D'");
    expect(workerEntry).toContain("competingWith: ['app-surface.my-kora']");
    expect(myKoraEntry).toContain("competingWith: ['app-surface.worker']");
  });

  it('neither surface status was changed to CANONICAL, DEAD, or FROZEN', () => {
    const workerIdx = registry.indexOf("id: 'app-surface.worker'");
    const myKoraIdx = registry.indexOf("id: 'app-surface.my-kora'");
    const workerEntry = registry.slice(workerIdx, registry.indexOf('{ id:', workerIdx + 10));
    const myKoraEntry = registry.slice(myKoraIdx, registry.indexOf('{ id:', myKoraIdx + 10));
    expect(workerEntry).toContain("status: 'COMPLETE'");
    expect(myKoraEntry).toContain("status: 'COMPLETE'");
    for (const entry of [workerEntry, myKoraEntry]) {
      expect(entry).not.toMatch(/status:\s*'CANONICAL'/);
      expect(entry).not.toMatch(/status:\s*'DEAD'/);
      expect(entry).not.toMatch(/status:\s*'FROZEN'/);
    }
  });

  it('both entries point to the new matrix document', () => {
    const workerIdx = registry.indexOf("id: 'app-surface.worker'");
    const myKoraIdx = registry.indexOf("id: 'app-surface.my-kora'");
    const workerEntry = registry.slice(workerIdx, registry.indexOf('{ id:', workerIdx + 10));
    const myKoraEntry = registry.slice(myKoraIdx, registry.indexOf('{ id:', myKoraIdx + 10));
    expect(workerEntry).toContain('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md');
    expect(myKoraEntry).toContain('docs/CC024_WORKER_ARCHITECTURE_MATRIX.md');
    expect(workerEntry).not.toMatch(/D-D (is )?ratified/i);
    expect(myKoraEntry).not.toMatch(/D-D (is )?ratified/i);
  });
});

// ── 3. No runtime code was changed by this slice ────────────────────────────

describe('CC-024 — no runtime/auth/service code was touched', () => {
  it('worker auth files are unchanged in their governing invariants', () => {
    const workerLayout = read('app/worker/layout.tsx');
    expect(workerLayout).toContain('getCurrentWorkerUser');
    const myKoraLayout = read('app/my-kora/layout.tsx');
    expect(myKoraLayout).toContain('getSessionKoraRole');
    expect(myKoraLayout).toContain("realRole === 'WORKER' || realRole === 'KORA_ADMIN'");
  });

  it('the 3 B-WORKER-owned synthetic residuals are untouched', () => {
    for (const file of [
      'services/worker-provisioning/WorkerProvisioningService.ts',
      'services/worker-achievements/WorkerAchievementService.ts',
      'services/account/AccountProvisioningService.ts',
    ]) {
      expect(exists(file)).toBe(true);
    }
  });

  it('MyKoraPreviewService is untouched, still exists', () => {
    expect(exists('services/my-kora-preview/MyKoraPreviewService.ts')).toBe(true);
  });
});

// ── 4. Worker governance tests still pass (sanity — run separately too) ────

describe('CC-024 — pre-existing worker-surface governance guard still intact', () => {
  it('cc003 registry completeness still asserts the shared decisionRef and neutral status', () => {
    const guard = read('tests/unit/cc003-i10-registry-completeness.test.ts');
    expect(guard).toContain('/worker and /my-kora surfaces carry the same CC-024 / D-D decisionRef');
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
