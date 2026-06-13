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

  it('has section: Ecosistema & Advisor', () => {
    expect(src).toContain('demo-section-ecosystem');
    expect(src).toContain('Ecosistema');
  });

  it('has section: Pipeline & Classificazione', () => {
    expect(src).toContain('demo-section-pipeline');
    expect(src).toContain('Pipeline');
  });

  it('has section: Roadmap', () => {
    expect(src).toContain('demo-section-roadmap');
    expect(src).toContain('Roadmap');
  });

  it('GTM Console appears in internal-tools footer, not in prospect sections', () => {
    expect(src).toContain('demo-internal-tools');
    expect(src).toContain('/demo/gtm');
    // GTM href should appear only once (in the internal-tools block)
    const matches = src.match(/\/demo\/gtm/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('scenario cards have CTA linking to /demo/company/kora-index', () => {
    expect(src).toContain('/demo/company/kora-index');
  });

  it('has no href to /company/* live routes', () => {
    // Must not contain href="  /company/ or href: '/company
    expect(src).not.toMatch(/href[=:]\s*['"]\/company\//);
    expect(src).not.toMatch(/href[=:]\s*['"]\/company['"]/);
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

  it('all demo surface hrefs point to /demo/* only', () => {
    // Extract all href values in the file
    const hrefPattern = /href=["']([^"']+)["']/g;
    let match: RegExpExecArray | null;
    const hrefs: string[] = [];
    while ((match = hrefPattern.exec(src)) !== null) {
      hrefs.push(match[1]);
    }
    const nonDemo = hrefs.filter(h =>
      !h.startsWith('/demo/') &&
      !h.startsWith('#') &&
      h !== '/demo'
    );
    expect(nonDemo).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — guide / future-vision / gtm no live hrefs  (added after Step 2)
// ─────────────────────────────────────────────────────────────────────────────

describe('B132-A Step 2 — guide: no live /company/* hrefs', () => {
  let src: string;
  beforeAll(() => { src = read('guide/page.tsx'); });

  it('does not contain href to /company (live Executive Cockpit)', () => {
    expect(src).not.toMatch(/href[:\s=]*['"]\/company['"]/);
  });

  it('does not contain href to /company/kora-index (live)', () => {
    expect(src).not.toContain("href: '/company/kora-index'");
    expect(src).not.toContain('href="/company/kora-index"');
  });

  it('does not contain href to /company/activation (live)', () => {
    expect(src).not.toContain("href: '/company/activation'");
    expect(src).not.toContain('href="/company/activation"');
  });

  it('does not contain href to /company/financial (live)', () => {
    expect(src).not.toContain("href: '/company/financial'");
    expect(src).not.toContain('href="/company/financial"');
  });

  it('does not contain href to /company/reports (live)', () => {
    expect(src).not.toContain("href: '/company/reports'");
    expect(src).not.toContain('href="/company/reports"');
  });

  it('does not contain href to /company/data (live — no demo equivalent)', () => {
    expect(src).not.toContain("href: '/company/data'");
    expect(src).not.toContain('href="/company/data"');
  });

  it('does not contain href to /company/contribution (live — no demo equivalent)', () => {
    expect(src).not.toContain("href: '/company/contribution'");
    expect(src).not.toContain('href="/company/contribution"');
  });

  it('routes without demo equivalent use locked text (no href)', () => {
    // /company/data and /company/contribution must be locked — check presence of locked label
    expect(src).toMatch(/Stato Dati|Dati & Evidenze|dati.*live|non disponibile/i);
    expect(src).toMatch(/KORA Contribution|Contribution.*live|non disponibile/i);
  });
});

describe('B132-A Step 2 — future-vision: no live /company/* hrefs', () => {
  let src: string;
  beforeAll(() => { src = read('future-vision/page.tsx'); });

  it('does not contain href to /company/kora-index', () => {
    expect(src).not.toContain("href: '/company/kora-index'");
    expect(src).not.toContain('href="/company/kora-index"');
  });

  it('does not contain href to /company/activation', () => {
    expect(src).not.toContain("href: '/company/activation'");
    expect(src).not.toContain('href="/company/activation"');
  });

  it('does not contain href to /company/financial', () => {
    expect(src).not.toContain("href: '/company/financial'");
    expect(src).not.toContain('href="/company/financial"');
  });

  it('does not contain href to /company/reports', () => {
    expect(src).not.toContain("href: '/company/reports'");
    expect(src).not.toContain('href="/company/reports"');
  });

  it('does not contain href to /company/data', () => {
    expect(src).not.toContain("href: '/company/data'");
    expect(src).not.toContain('href="/company/data"');
  });

  it('Phase 01 modules use /demo/company/* hrefs', () => {
    expect(src).toContain('/demo/company/kora-index');
    expect(src).toContain('/demo/company/activation');
    expect(src).toContain('/demo/company/financial');
    expect(src).toContain('/demo/company/reports');
  });
});

describe('B132-A Step 2 — gtm: no live /company/* or /partner hrefs', () => {
  let src: string;
  beforeAll(() => { src = read('gtm/page.tsx'); });

  it('does not contain isLive-tagged href to /company', () => {
    expect(src).not.toMatch(/href[:\s=]*['"]\/company['"]/);
    expect(src).not.toMatch(/href[:\s=]*['"]\/company\//);
  });

  it('does not contain href to /partner (live — no demo equivalent)', () => {
    expect(src).not.toContain("href: '/partner'");
    expect(src).not.toContain('href="/partner"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — financial / status cross-link to live reports (added after Step 3)
// ─────────────────────────────────────────────────────────────────────────────

describe('B132-A Step 3 — demo/company/financial: no cross-link to live /company/reports', () => {
  let src: string;
  beforeAll(() => { src = read('company/financial/page.tsx'); });

  it('does not contain href="/company/reports" (live cross-link)', () => {
    expect(src).not.toContain('href="/company/reports"');
    expect(src).not.toContain("href='/company/reports'");
  });

  it('cross-link to reports uses /demo/company/reports', () => {
    expect(src).toContain('/demo/company/reports');
  });
});

describe('B132-A Step 3 — demo/company/status: no cross-link to live /company/reports', () => {
  let src: string;
  beforeAll(() => { src = read('company/status/page.tsx'); });

  it('does not contain href to /company/reports (live)', () => {
    expect(src).not.toContain("href:  '/company/reports'");
    expect(src).not.toContain("href: '/company/reports'");
    expect(src).not.toContain('href="/company/reports"');
  });

  it('does not contain href to /company/reports/board-pack (live)', () => {
    expect(src).not.toContain('/company/reports/board-pack');
  });

  it('cross-link to reports uses /demo/company/reports', () => {
    expect(src).toContain('/demo/company/reports');
  });
});
