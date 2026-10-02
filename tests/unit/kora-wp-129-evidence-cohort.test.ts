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

  it('covers every declared surface, each entry with every canonical viewport', () => {
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    // One entry PER STATE, not per route: a surface evidenced in more than one
    // legitimate Product state appears once for each. The set of routes must
    // still be exactly the declared surfaces, and each must carry a minimal
    // entry — the data-bearing state supplements it, never replaces it.
    const routes: string[] = m.surfaces.map((s: { route: string }) => s.route);
    expect([...new Set(routes)].sort()).toEqual(declaredWorkerRoutes());
    const minimal = m.surfaces
      .filter((s: { state: string }) => /minimal/.test(s.state))
      .map((s: { route: string }) => s.route)
      .sort();
    expect(minimal, 'every declared surface needs its minimal-state entry').toEqual(declaredWorkerRoutes());
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

/**
 * The data-bearing state. `/worker/dynamic-cv` is a RECORD_DETAIL whose whole
 * W3B remediation concerns long-content behaviour, so a zero-experience
 * capture cannot stand alone. The populated state lives under a `data-bearing/`
 * root with the SAME canonical filenames — one naming convention, two states —
 * and the manifest must say which is which.
 */
describe('KORA-WP-129 — the data-bearing state is present and distinguished', () => {
  const DATA_BEARING_ROUTES = ['/worker/dynamic-cv', '/worker/dynamic-cv/print'] as const;
  const DB_DIR = join(DIR, 'data-bearing');

  it('both Dynamic CV surfaces carry populated evidence at every canonical viewport', () => {
    const missing: string[] = [];
    for (const route of DATA_BEARING_ROUTES) {
      for (const vp of CANONICAL_VIEWPORTS) {
        const file = evidenceName({ wp: WP, kind: 'product', route, viewport: vp.id });
        if (!existsSync(join(DB_DIR, file))) missing.push(file);
      }
    }
    expect(missing).toEqual([]);
  });

  it('the data-bearing archive holds nothing but those two surfaces', () => {
    const allowed = new Set<string>();
    for (const route of DATA_BEARING_ROUTES) {
      for (const vp of CANONICAL_VIEWPORTS) {
        allowed.add(evidenceName({ wp: WP, kind: 'product', route, viewport: vp.id }));
      }
    }
    const extra = readdirSync(DB_DIR).filter((f) => f.endsWith('.png') && !allowed.has(f));
    expect(extra, 'a populated capture of a surface the state does not claim').toEqual([]);
  });

  it('the minimal state is NOT overwritten — both states coexist with distinct digests', () => {
    const m = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));
    for (const route of DATA_BEARING_ROUTES) {
      for (const vp of CANONICAL_VIEWPORTS) {
        const file = evidenceName({ wp: WP, kind: 'product', route, viewport: vp.id });
        expect(existsSync(join(DIR, file)), `${file} minimal state must survive`).toBe(true);
        expect(existsSync(join(DB_DIR, file))).toBe(true);
      }
      const entries = m.surfaces.filter((s: { route: string }) => s.route === route);
      const states = entries.map((s: { state: string }) => s.state).sort();
      expect(states.length, `${route} must appear once per state`).toBe(2);
      expect(states.some((x: string) => /data-bearing/.test(x))).toBe(true);
      expect(states.some((x: string) => /minimal/.test(x))).toBe(true);
    }
  });

  it('the manifest records the fixture provenance and the capture runtime of the populated state', () => {
    const m = JSON.parse(readFileSync(join(DIR, 'manifest.json'), 'utf8'));
    const db = m.surfaces.filter((s: { state: string }) => /data-bearing/.test(s.state));
    expect(db.length).toBe(DATA_BEARING_ROUTES.length);
    for (const s of db) {
      expect(s.fixtureSourceCommit).toMatch(/^[0-9a-f]{7,40}$/);
      expect(s.fixtureSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(s.captureRuntime).toBe('production');
    }
  });
});

