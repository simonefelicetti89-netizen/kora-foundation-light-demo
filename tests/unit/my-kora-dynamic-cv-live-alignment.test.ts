/**
 * My KORA Dynamic CV Live Alignment Tests
 *
 * PRIOR HISTORY (accurate as of the original four-state build through
 * B-WORKER-2, preserved as a record, not verbatim given the volume):
 * this file tracked app/my-kora/dynamic-cv/page.tsx through two prior
 * evolutions — an original four-state (checking/live/empty/demo) client
 * component that fetched /api/worker/dynamic-cv to decide what to render,
 * then (B-WORKER-2, 2026-09-06) a narrower checking/redirecting/demo
 * version that redirected only a confirmed real session to the canonical
 * /worker/dynamic-cv (DynamicCVClient) while preserving full demo/persona
 * rendering (classifyForDynamicCV filter, LinkedIn "Non attivo" copy,
 * privacy reassurance, worker-workspace/PIB navigation links) for anyone
 * without a real session.
 *
 * B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): the
 * page is now a one-line, unconditional redirect() to /worker/dynamic-cv —
 * no fetch probe, no mode state, no demo/persona rendering of any kind, for
 * any visitor (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT     = resolve(process.cwd());
const PAGE_SRC = readFileSync(resolve(ROOT, 'app/my-kora/dynamic-cv/page.tsx'), 'utf-8');

const POLICY_TEST     = resolve(ROOT, 'tests/unit/dynamic-impact-cv-policy.test.ts');
const WORKER_EXP_TEST = resolve(ROOT, 'tests/unit/worker-experience-consolidation.test.ts');
const ROUTE_PRIVACY_CANDIDATES = [
  resolve(ROOT, 'tests/unit/route-privacy.test.ts'),
  resolve(ROOT, 'tests/unit/route-privacy-guard.test.ts'),
  resolve(ROOT, 'tests/unit/b81-route-privacy.test.ts'),
  resolve(ROOT, 'tests/unit/b81b-route-privacy-guard.test.ts'),
];

describe('B-WORKER preview retirement — /my-kora/dynamic-cv is a pure canonical redirect', () => {
  it('redirects unconditionally to /worker/dynamic-cv, for every visitor', () => {
    expect(PAGE_SRC).toContain("redirect('/worker/dynamic-cv')");
  });

  it('no mode state, fetch probe, demo content, or client component remains', () => {
    expect(PAGE_SRC).not.toContain('setCVMode');
    expect(PAGE_SRC).not.toContain('DynamicCVMode');
    expect(PAGE_SRC).not.toContain('fetch(');
    expect(PAGE_SRC).not.toContain('data-testid="dynamic-cv-demo"');
    expect(PAGE_SRC).not.toContain('classifyForDynamicCV');
    expect(PAGE_SRC).not.toContain("'use client'");
  });

  it('no sensitive worker-level fields are referenced (trivially true — page has no content)', () => {
    expect(PAGE_SRC).not.toContain('worker_identity_id');
    expect(PAGE_SRC).not.toContain('pseudonym_id');
    expect(PAGE_SRC).not.toContain('worker_pseudonym_map');
  });
});

// ── Regression: adjacent test files/coverage this file used to point at ────

describe('Regression: adjacent test coverage still exists', () => {
  it('dynamic-impact-cv-policy.test.ts is present', () => {
    expect(existsSync(POLICY_TEST)).toBe(true);
  });

  it('worker-experience-consolidation.test.ts is present', () => {
    expect(existsSync(WORKER_EXP_TEST)).toBe(true);
  });

  it('at least one route-privacy test file is present', () => {
    const anyExists = ROUTE_PRIVACY_CANDIDATES.some(p => existsSync(p));
    expect(anyExists).toBe(true);
  });
});
