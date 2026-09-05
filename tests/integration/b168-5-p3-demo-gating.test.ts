// tests/integration/b168-5-p3-demo-gating.test.ts
// B168.5-P3 — Verifica struttura del demo gating differenziato.
// Test statici: legge source files per verificare la struttura di guard,
// layout, e DemoAccessBanner. I test live (401/403 effettivi) richiedono
// un server running — verifica manuale tramite curl post-push.
//
// CC-00 — Residual /demo/** controlled retirement (2026-09-26): every
// gated /demo/** layout/page this file originally tested (network, advisor,
// ai-onboarding) is retired this same slice, along with 3 of the original
// 5 public routes (guide, gtm, benchmarks) — see
// lib/architecture/registry.ts's app-surface.demo entry for the full
// route-by-route disposition, and
// tests/unit/cc00-residual-demo-retirement.test.ts for the current, correct
// state. Only /demo and /demo/future-vision remain public.
//
// CC-00 — DEMO_VIEWER role retirement (2026-09-26, a later, separate
// slice): lib/auth/demo-guard.tsx (requireDemoGate) and its dependency
// lib/auth/kora-session.ts's requireDemoAccess() are both retired — DEMO_VIEWER
// no longer exists as a runtime role. app/demo/layout.tsx and
// DemoAccessBanner are unrelated to the role and remain fully asserted
// below. See tests/unit/cc00-demo-viewer-retirement.test.ts for the current,
// correct state.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd());
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}
function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

// ── Route pubbliche rimanenti — NESSUN guard diretto ─────────────────────────
// guide, gtm, e benchmarks erano accuratamente route pubbliche al momento
// della scrittura di questo test (originariamente "5 route pubbliche").
// CC-00 Residual /demo/** controlled retirement (2026-09-26) le ha ritirate
// — rimosse da questa lista, non sostituite.

describe('Route pubbliche rimanenti (2) — nessun guard diretto', () => {
  const PUBLIC_ROUTES = [
    'app/demo/page.tsx',
    'app/demo/future-vision/page.tsx',
  ];

  it('nessuna route pubblica chiama requireDemoAccess() direttamente', () => {
    for (const route of PUBLIC_ROUTES) {
      const src = read(route);
      expect(src, `${route} non deve chiamare requireDemoAccess`).not.toContain('requireDemoAccess');
    }
  });

  it('nessuna route pubblica chiama requireKoraAdmin()', () => {
    for (const route of PUBLIC_ROUTES) {
      const src = read(route);
      expect(src, `${route} non deve chiamare requireKoraAdmin`).not.toContain('requireKoraAdmin');
    }
  });

  it('tutte le route pubbliche montano DemoAccessBanner', () => {
    for (const route of PUBLIC_ROUTES) {
      const src = read(route);
      expect(src, `${route} deve importare DemoAccessBanner`).toContain('DemoAccessBanner');
    }
  });

  it('guide, gtm, e benchmarks sono stati separatamente ritirati da CC-00 (nota storica, non asserzione live)', () => {
    expect(exists('app/demo/guide/page.tsx')).toBe(false);
    expect(exists('app/demo/gtm/page.tsx')).toBe(false);
    expect(exists('app/demo/benchmarks/page.tsx')).toBe(false);
  });
});

// ── Layout /demo — rimosso il guard globale ────────────────────────────────────

describe('app/demo/layout.tsx — NON gata più tutte le route', () => {
  const layout = read('app/demo/layout.tsx');

  it('NON importa o chiama requireDemoAccess() (guard rimosso — B168.5-P3)', () => {
    // Check absence of import statement and function call — comments may reference the name
    expect(layout).not.toContain("import { requireDemoAccess");
    expect(layout).not.toContain('await requireDemoAccess()');
  });

  it('mantiene i metadata robots noindex', () => {
    expect(layout).toContain('index: false');
    expect(layout).toContain('nocache: true');
  });

  it('mantiene data-testid demo-boundary-marker', () => {
    expect(layout).toContain('data-testid="demo-boundary-marker"');
  });
});

// ── Layout /demo/company — rimosso con B171 ────────────────────────────────────

describe('app/demo/company/ — rimosso da B171 (route RIDONDANTI cancellate)', () => {
  it('app/demo/company/ directory non esiste più (B171 cleanup)', () => {
    expect(exists('app/demo/company/layout.tsx')).toBe(false);
    expect(exists('app/demo/company/kora-index/page.tsx')).toBe(false);
  });
});

// ── Layout standalone gated — tutti ritirati ─────────────────────────────────
// app/demo/index-registry/layout.tsx and app/demo/portfolio/layout.tsx were
// accurately in this list as of an earlier test's writing (originally "5
// layout standalone gated", then "3"). CC-00 Index Registry canonicalization
// (2026-09-06), CC-00 Company Portfolio capability salvage +
// canonicalization (2026-09-12), and CC-00 Residual /demo/** controlled
// retirement (2026-09-26) retired all 5 original gated layouts — none
// remain.

describe('Layout standalone gated — tutti ritirati (historical note, not a live assertion)', () => {
  it('nessun layout standalone gated rimane sotto app/demo/**', () => {
    for (const layout of [
      'app/demo/index-registry/layout.tsx',
      'app/demo/portfolio/layout.tsx',
      'app/demo/network/layout.tsx',
      'app/demo/advisor/layout.tsx',
      'app/demo/ai-onboarding/layout.tsx',
    ]) {
      expect(exists(layout), `${layout} deve essere stato rimosso`).toBe(false);
    }
  });
});

// ── requireDemoGate helper — ritirato ────────────────────────────────────────
// lib/auth/demo-guard.tsx's requireDemoGate() (and the middleware x-pathname
// header it was the sole consumer of) were accurately tested here, kept
// alive for DEMO_VIEWER's own end-state readiness, at the time this test was
// written. CC-00 DEMO_VIEWER role retirement (2026-09-26) retired the role
// entirely — requireDemoGate(), requireDemoAccess(), and the x-pathname
// header are all removed, not replaced. See
// tests/unit/cc00-demo-viewer-retirement.test.ts for the current, correct
// state.

describe('lib/auth/demo-guard.tsx and middleware x-pathname have since been separately retired (historical note, not a live assertion)', () => {
  it('lib/auth/demo-guard.tsx no longer exists', () => {
    expect(exists('lib/auth/demo-guard.tsx')).toBe(false);
  });

  it('middleware.ts no longer sets an x-pathname header', () => {
    const mw = read('middleware.ts');
    expect(mw).not.toContain("set('x-pathname'");
  });
});

// ── DemoAccessBanner ──────────────────────────────────────────────────────────

describe('DemoAccessBanner — componente client dismissibile', () => {
  const src = read('components/demo/DemoAccessBanner.tsx');

  it("è 'use client'", () => {
    expect(src).toContain("'use client'");
  });

  it('usa useState per dismissed (NON localStorage)', () => {
    expect(src).toContain('useState');
    expect(src).toContain('dismissed');
    expect(src).not.toContain('localStorage');
  });

  it('ha data-testid demo-access-banner', () => {
    expect(src).toContain('data-testid="demo-access-banner"');
  });

  it('ha CTA verso /request-access con data-testid', () => {
    expect(src).toContain('data-testid="demo-access-banner-cta"');
    expect(src).toContain('/request-access');
  });

  it('ha pulsante dismiss con data-testid', () => {
    expect(src).toContain('data-testid="demo-access-banner-dismiss"');
    expect(src).toContain("setDismissed(true)");
  });

  it('ritorna null quando dismissed', () => {
    expect(src).toContain('if (dismissed) return null');
  });

  it('usa accento terracotta #C76F3D', () => {
    expect(src).toContain('#C76F3D');
  });
});

// ── /demo/guide — ritirato ────────────────────────────────────────────────────
// /demo/guide's CTA verso /company/kora-index was accurately tested here.
// CC-00 Residual /demo/** controlled retirement (2026-09-26) retired the
// entire route — pure navigation/doctrine duplicate of /demo root +
// CLAUDE.md, with zero unique value.

describe('/demo/guide — ritirato da CC-00 (historical note, not a live assertion)', () => {
  it('app/demo/guide/ non esiste più', () => {
    expect(exists('app/demo/guide')).toBe(false);
  });
});

// ── Coerenza: nav admin non punta più a route gated ritirate ─────────────────

describe('Coerenza B169/B168.5-P3: sidebar admin non punta a route ritirate', () => {
  // index-registry, portfolio, network, and ai-onboarding were accurately
  // linked from ADMIN_NAV_GROUPS at various earlier points. CC-00 slices
  // removed each link along with the route it pointed to.
  it('ADMIN_NAV_GROUPS non contiene più link a route demo ritirate', () => {
    const navSrc = read('lib/navigation/admin-nav-groups.ts');
    for (const retired of ['/demo/index-registry', '/demo/portfolio', '/demo/network', '/demo/ai-onboarding', '/demo/advisor', '/demo/benchmarks', '/demo/gtm', '/demo/guide']) {
      expect(navSrc).not.toContain(retired);
    }
  });

  // This test's premise (requireDemoGate/requireDemoAccess admitting
  // KORA_ADMIN for /demo preview purposes) was accurate at the time it was
  // written. CC-00 DEMO_VIEWER role retirement (2026-09-26) retired both
  // functions entirely — there is no KORA_ADMIN /demo preview exception left
  // to check. See tests/unit/rls06-kora-admin-access-control.test.ts for the
  // live, still-relevant KORA_ADMIN-exception regression guard.
  it('requireDemoGate/requireDemoAccess have since been separately retired (historical note, not a live assertion)', () => {
    const sessionSrc = read('lib/auth/kora-session.ts')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(sessionSrc).not.toContain('requireDemoAccess');
    expect(exists('lib/auth/demo-guard.tsx')).toBe(false);
  });
});

// ── Route gated — tutte ritirate (B171: 6 demo/company/* RIDONDANTI ─────────
//    rimosse; CC-00 slices di 2026-09-06/09-12/09-26: index-registry,
//    portfolio, network, advisor, e ai-onboarding tutte separatamente
//    ritirate) ──────────────────────────────────────────────────────────────

describe('Route gated — tutte ritirate (historical note, not a live assertion)', () => {
  it('nessuna delle route gated originali rimane', () => {
    for (const page of [
      'app/demo/index-registry/page.tsx',
      'app/demo/portfolio/page.tsx',
      'app/demo/network/page.tsx',
      'app/demo/advisor/page.tsx',
      'app/demo/ai-onboarding/page.tsx',
    ]) {
      expect(exists(page), `${page} deve essere stato rimosso`).toBe(false);
    }
  });

  it('le 6 /demo/company/* RIDONDANTI non esistono più (B171)', () => {
    const ridondanti = [
      'app/demo/company/kora-index/page.tsx',
      'app/demo/company/financial/page.tsx',
      'app/demo/company/pillars/page.tsx',
      'app/demo/company/status/page.tsx',
      'app/demo/company/activation/page.tsx',
      'app/demo/company/reports/page.tsx',
    ];
    for (const page of ridondanti) {
      expect(exists(page), `${page} deve essere stato rimosso`).toBe(false);
    }
  });
});
