// tests/unit/b132a-demo-boundary.test.ts
// B132-A: Demo Area Coherence — boundary tests.
// Step 1: demo hub structure (4 sections, no live hrefs, GTM in internal footer).
// Step 2: guide/future-vision/gtm no live hrefs (tests pass after Step 2 edits).
// Step 3: financial/status no cross-link to live (tests pass after Step 3 edits).
// Pure fs.readFileSync — no runtime, no DB, no Supabase.

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DEMO_ROOT = path.resolve(__dirname, '../../app/demo');

function read(relPath: string): string {
  return fs.readFileSync(path.join(DEMO_ROOT, relPath), 'utf-8');
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Demo hub structure
// ─────────────────────────────────────────────────────────────────────────────

describe('B132-A Step 1 — demo hub structure (app/demo/page.tsx)', () => {
  let src: string;
  beforeAll(() => { src = read('page.tsx'); });

  it('has section: Intelligence Aziendale', () => {
    expect(src).toContain('demo-section-intelligence');
    expect(src).toContain('Intelligence Aziendale');
  });

  // "Ecosistema & Advisor" (demo-section-ecosystem), "Pipeline &
  // Classificazione" (demo-section-pipeline), and the internal-tools GTM
  // footer (demo-internal-tools) existed here accurately as of B132-A.
  // CC-00 Residual /demo/** controlled retirement (2026-09-26) retired
  // every route those sections linked to (advisor, network, benchmarks,
  // ai-onboarding, gtm, guide) and removed the sections themselves from
  // app/demo/page.tsx — see tests/unit/cc00-residual-demo-retirement.test.ts.
  it('Ecosistema & Advisor / Pipeline & Classificazione / internal-tools sections have since been separately retired (historical note, not a live assertion)', () => {
    expect(src).not.toContain('demo-section-ecosystem');
    expect(src).not.toContain('demo-section-pipeline');
    expect(src).not.toContain('demo-internal-tools');
    expect(src).not.toContain('/demo/gtm');
    expect(src).not.toContain('/demo/advisor');
    expect(src).not.toContain('/demo/network');
    expect(src).not.toContain('/demo/benchmarks');
    expect(src).not.toContain('/demo/ai-onboarding');
  });

  it('has section: Roadmap', () => {
    expect(src).toContain('demo-section-roadmap');
    expect(src).toContain('Roadmap');
  });

  it('scenario cards have CTA linking to /company/kora-index (B171: canonical route)', () => {
    expect(src).toContain('/company/kora-index');
  });

  it('has no href to /admin/* routes', () => {
    expect(src).not.toMatch(/href[=:]\s*['"]\/admin\//);
  });

  it('has no href to /admin/* routes', () => {
    expect(src).not.toMatch(/href[=:]\s*['"]\/admin\//);
  });

  it('has no href to /worker/* routes', () => {
    expect(src).not.toMatch(/href[=:]\s*['"]\/worker\//);
  });

  it('has no href to /partner/* routes', () => {
    expect(src).not.toMatch(/href[=:]\s*['"]\/partner['"\/]/);
  });

  it('has no href to /api/* routes', () => {
    expect(src).not.toMatch(/href[=:]\s*['"]\/api\//);
  });

  it('force-static export is preserved', () => {
    expect(src).toContain("export const dynamic = 'force-static'");
  });

  it('demo-home testid is preserved', () => {
    expect(src).toContain('data-testid="demo-home"');
  });

  it('demo-disclaimer testid is preserved', () => {
    expect(src).toContain('data-testid="demo-disclaimer"');
  });

  it('demo-scenario testid pattern is preserved', () => {
    // Source uses template literal: data-testid={`demo-scenario-${s.id}`}
    expect(src).toContain('demo-scenario-${s.id}');
  });

  it('Future Vision is labeled INATTIVO', () => {
    expect(src).toContain('INATTIVO');
    expect(src).toContain('/demo/future-vision');
  });

  it('intelligence section hrefs point to /company/* canonical routes (B171)', () => {
    // B171: /demo/company/* RIDONDANTE routes removed. Intelligence section now uses /company/*.
    expect(src).toContain('/company/kora-index');
    expect(src).toContain('/company/activation');
    expect(src).toContain('/company/pillars');
    expect(src).toContain('/company/reports');
    expect(src).toContain('/company/financial');
    expect(src).toContain('/company/status');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — guide / future-vision / gtm no live hrefs  (added after Step 2)
// ─────────────────────────────────────────────────────────────────────────────

// app/demo/guide/page.tsx existed here accurately as of B132-A Step 2.
// CC-00 Residual /demo/** controlled retirement (2026-09-26) retired the
// entire route — pure navigation/doctrine duplicate of the /demo root hub,
// which itself still asserts the same canonical /company/* hrefs above.
describe('B132-A Step 2 — guide: has since been separately retired (historical note, not a live assertion)', () => {
  it('app/demo/guide/ non esiste più', () => {
    expect(fs.existsSync(path.join(DEMO_ROOT, 'guide'))).toBe(false);
  });
});

describe('B132-A Step 2 — future-vision: Phase 01 uses /company/* canonical routes (B171)', () => {
  let src: string;
  beforeAll(() => { src = read('future-vision/page.tsx'); });

  it('Phase 01 modules use /company/* canonical hrefs (B171: demo copies removed)', () => {
    expect(src).toContain('/company/kora-index');
    expect(src).toContain('/company/activation');
    expect(src).toContain('/company/financial');
    expect(src).toContain('/company/reports');
  });

  it('does not contain href to /company/data', () => {
    expect(src).not.toContain("href: '/company/data'");
    expect(src).not.toContain('href="/company/data"');
  });

  it('has no href to /admin/* routes', () => {
    expect(src).not.toMatch(/href[=:]\s*['"]\/admin\//);
  });
});

// app/demo/gtm/page.tsx existed here accurately as of B132-A Step 2. CC-00
// Residual /demo/** controlled retirement (2026-09-26) retired the entire
// route (Scenario Presenter, Demo Script, Pilot Package, GTM Pipeline, Gate
// & Methodology Status — each a duplicate of a real canonical surface).
describe('B132-A Step 2 — gtm: has since been separately retired (historical note, not a live assertion)', () => {
  it('app/demo/gtm/page.tsx non esiste più', () => {
    expect(fs.existsSync(path.join(DEMO_ROOT, 'gtm', 'page.tsx'))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — demo/company/* pages removed by B171 (no longer exist to test)
// ─────────────────────────────────────────────────────────────────────────────

describe('B171 — demo/company/* RIDONDANTE pages removed', () => {
  const fs2 = require('fs');
  const path2 = require('path');
  const demoCompanyRoot = path2.resolve(process.cwd(), 'app/demo/company');

  it('app/demo/company/ directory no longer exists (B171 cleanup)', () => {
    expect(fs2.existsSync(demoCompanyRoot)).toBe(false);
  });
});
