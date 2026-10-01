/**
 * tests/unit/kora-wp-129-evidence-cohort.test.ts
 *
 * KORA-WP-129 — the evidence cohort validates itself.
 *
 * WHY. Before this file, "the Worker evidence is complete" was a claim a report
 * made. Nine of the eleven archived `product__` sets were not regenerable from
 * any committed specification, two surfaces carried no evidence at all, and the
 * Dynamic CV carried `diagnostic__` files in a kind the canonical
 * `EvidenceKind` cannot even express. None of that was detectable mechanically.
 *
 * This is evidence TOOLING, not Product: it reads `ROUTE_ARCHETYPE`, the
 * capture specification and the archive directory, and fails when they
 * disagree. It asserts nothing about how a surface looks — that is Founder
 * judgment and KORA-WP-126 deliberately refuses to automate it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { declaredRoutes } from '@/lib/px-acceptance/benchmark-checks';
import { CANONICAL_VIEWPORTS } from '@/lib/px-acceptance/viewport-matrix';
import { evidenceDir, evidenceName } from '@/lib/px-acceptance/evidence-protocol';

const WP = 'KORA-WP-129';
const DIR = evidenceDir(WP);
const SPEC = 'tests/e2e/kora-wp-129-worker-capture.spec.ts';

/** The real Worker surfaces, derived — never restated. */
function declaredWorkerRoutes(): string[] {
  return declaredRoutes().filter((r) => r.startsWith('/worker')).sort();
}

/** Routes the capture specification actually lists. */
function specRoutes(): string[] {
  const src = readFileSync(SPEC, 'utf8');
  return [...src.matchAll(/^\s{4}route: '([^']+)',$/gm)].map((m) => m[1]).sort();
}

describe('KORA-WP-129 — evidence cohort completeness', () => {
  it('the capture specification covers every declared Worker surface, and only those', () => {
    expect(specRoutes()).toEqual(declaredWorkerRoutes());
  });

  it('/worker/login is a redirect: it declares no archetype and carries no evidence', () => {
    expect(declaredWorkerRoutes()).not.toContain('/worker/login');
    expect(specRoutes()).not.toContain('/worker/login');
    expect(existsSync(join(DIR, 'kora-wp-129__product__worker-login__desktop.png'))).toBe(false);
  });

  it('every surface carries product evidence at every canonical viewport', () => {
    const missing: string[] = [];
    for (const route of declaredWorkerRoutes()) {
      for (const vp of CANONICAL_VIEWPORTS) {
        const file = evidenceName({ wp: WP, kind: 'product', route, viewport: vp.id });
        if (!existsSync(join(DIR, file))) missing.push(file);
      }
    }
    expect(missing, 'a surface without evidence at a canonical viewport is not accepted evidence').toEqual([]);
  });

  it('no file the cohort CLAIMS uses a kind outside the canonical EvidenceKind', () => {
    const m = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));
    const claimed: string[] = m.surfaces.flatMap((s: { captures: { file: string }[] }) =>
      s.captures.map((c) => c.file),
    );
    const offenders = claimed.filter((f) => {
      const kind = f.split('__')[1];
      return kind !== 'product' && kind !== 'mockup';
    });
    expect(offenders, 'diagnostic__ is not an EvidenceKind and cannot be acceptance evidence').toEqual([]);
  });

  /**
   * HISTORICAL ARTIFACTS, KEPT AND NAMED.
   *
   * Twelve files predate this cohort and are deliberately NOT deleted and NOT
   * renamed. Three are `diagnostic__`, a kind `EvidenceKind` cannot express, so
   * they can never be acceptance evidence. Nine carry `product__` under a slug
   * `routeSlug()` no longer generates (`activity-discovery`, not
   * `worker-activity-discovery`), which is itself the proof that the current
   * protocol did not produce them.
   *
   * They are allow-listed rather than tolerated: a NEW orphan still fails this
   * test, and nothing here is referenced by the manifest.
   */
  const HISTORICAL_ARTIFACTS = [
    'kora-wp-129__diagnostic__worker-dynamic-cv__desktop.png',
    'kora-wp-129__diagnostic__worker-dynamic-cv__mobile.png',
    'kora-wp-129__diagnostic__worker-dynamic-cv__rail.png',
    'kora-wp-129__product__activity-discovery__desktop.png',
    'kora-wp-129__product__activity-discovery__mobile.png',
    'kora-wp-129__product__activity-discovery__rail.png',
    'kora-wp-129__product__activity-discovery-detail__desktop.png',
    'kora-wp-129__product__activity-discovery-detail__mobile.png',
    'kora-wp-129__product__activity-discovery-detail__rail.png',
    'kora-wp-129__product__kora-link-activate__desktop.png',
    'kora-wp-129__product__kora-link-activate__mobile.png',
    'kora-wp-129__product__kora-link-activate__rail.png',
  ] as const;

  it('no historical artifact is referenced as acceptance evidence', () => {
    const m = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));
    const claimed = new Set<string>(
      m.surfaces.flatMap((s: { captures: { file: string }[] }) => s.captures.map((c) => c.file)),
    );
    for (const f of HISTORICAL_ARTIFACTS) {
      expect(claimed.has(f), `${f} is historical and must not be claimed`).toBe(false);
    }
  });

  it('the archive holds no evidence for a route that is not a declared surface', () => {
    const allowed = new Set<string>();
    for (const route of declaredWorkerRoutes()) {
      for (const vp of CANONICAL_VIEWPORTS) {
        allowed.add(evidenceName({ wp: WP, kind: 'product', route, viewport: vp.id }));
      }
    }
    const orphaned = readdirSync(DIR)
      .filter((f) => f.endsWith('.png') && !allowed.has(f))
      .filter((f) => !(HISTORICAL_ARTIFACTS as readonly string[]).includes(f));
    expect(orphaned, 'an orphaned capture names a surface the cohort does not claim').toEqual([]);
  });
});

describe('KORA-WP-129 — the manifest describes the archive it ships with', () => {
  const manifestPath = join(DIR, 'manifest.json');

  it('exists and cites BOTH the Product SHA and the governance authority SHA', () => {
    expect(existsSync(manifestPath)).toBe(true);
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(m.productSha).toMatch(/^[0-9a-f]{40}$/);
    expect(m.governanceAuthoritySha).toMatch(/^[0-9a-f]{40}$/);
    expect(m.productSha).not.toBe(m.governanceAuthoritySha);
  });

  it('names one entry per declared surface, each with every canonical viewport', () => {
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(m.surfaces.map((s: { route: string }) => s.route).sort()).toEqual(declaredWorkerRoutes());
    for (const s of m.surfaces) {
      expect(s.archetype, `${s.route} must carry its archetype`).toBeTruthy();
      expect(s.captures.map((c: { viewport: string }) => c.viewport).sort())
        .toEqual(CANONICAL_VIEWPORTS.map((v) => v.id).sort());
    }
  });

  it('every manifest file reference resolves on disk, with a recorded digest', () => {
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const s of m.surfaces) {
      for (const c of s.captures) {
        expect(existsSync(join(DIR, c.file)), `${c.file} is referenced but absent`).toBe(true);
        expect(c.digest).toMatch(/^[0-9a-f]{64}$/);
      }
    }
  });

  it('records the capture as evidence, never as Founder acceptance', () => {
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(m.acceptance).toMatch(/NOT ACCEPTED/);
  });
});
