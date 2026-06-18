// tests/integration/b168-5-p3-demo-gating.test.ts
// B168.5-P3 — Verifica struttura del demo gating differenziato.
// Test statici: legge source files per verificare la struttura di guard,
// layout, e DemoAccessBanner. I test live (401/403 effettivi) richiedono
// un server running — verifica manuale tramite curl post-push.

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

// ── 5 route pubbliche — NESSUN guard diretto ──────────────────────────────────

describe('Route pubbliche (5) — nessun guard diretto', () => {
  const PUBLIC_ROUTES = [
    'app/demo/page.tsx',
    'app/demo/guide/page.tsx',
    'app/demo/gtm/page.tsx',
    'app/demo/benchmarks/page.tsx',
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

// ── Layout /demo/company — gata tutte le 6 company ────────────────────────────

describe('app/demo/company/layout.tsx — gate per 6 company pages', () => {
  it('esiste', () => {
    expect(exists('app/demo/company/layout.tsx')).toBe(true);
  });

  it('importa requireDemoGate', () => {
    const src = read('app/demo/company/layout.tsx');
    expect(src).toContain('requireDemoGate');
  });

  it('chiama await requireDemoGate() (server-side, non bypassabile)', () => {
    const src = read('app/demo/company/layout.tsx');
    expect(src).toContain('await requireDemoGate()');
    expect(src).not.toContain("'use client'");
  });
});

// ── 5 layout standalone gated ─────────────────────────────────────────────────

describe('Layout standalone gated (5) — requireDemoGate', () => {
  const GATED_LAYOUTS = [
    'app/demo/index-registry/layout.tsx',
    'app/demo/portfolio/layout.tsx',
    'app/demo/network/layout.tsx',
    'app/demo/advisor/layout.tsx',
    'app/demo/ai-onboarding/layout.tsx',
  ];

  it('tutti i layout standalone gated esistono', () => {
    for (const layout of GATED_LAYOUTS) {
      expect(exists(layout), `${layout} deve esistere`).toBe(true);
    }
  });

  it('tutti chiamano await requireDemoGate()', () => {
    for (const layout of GATED_LAYOUTS) {
      const src = read(layout);
      expect(src, `${layout} deve chiamare requireDemoGate`).toContain('await requireDemoGate()');
    }
  });

  it('nessuno è un client component (guard deve essere server-side)', () => {
    for (const layout of GATED_LAYOUTS) {
      const src = read(layout);
      expect(src, `${layout} non deve essere 'use client'`).not.toContain("'use client'");
    }
  });
});

// ── requireDemoGate helper ─────────────────────────────────────────────────────

describe('lib/auth/demo-guard.tsx — helper condiviso', () => {
  const src = read('lib/auth/demo-guard.tsx');

  it('esporta requireDemoGate()', () => {
    expect(src).toContain('export async function requireDemoGate');
  });

  it('usa requireDemoAccess + isKoraAuthError da kora-session', () => {
    expect(src).toContain('requireDemoAccess');
    expect(src).toContain('isKoraAuthError');
  });

  it('su 401 redirige a /request-access con parametro next', () => {
    expect(src).toContain('/request-access?next=');
    expect(src).toContain('encodeURIComponent');
    expect(src).toContain("auth.status === 401");
  });

  it('su 403 redirige a / (ruolo live sbagliato)', () => {
    expect(src).toContain("redirect('/')");
  });

  it('legge x-pathname dall\'header (impostato dal middleware)', () => {
    expect(src).toContain('x-pathname');
    expect(src).toContain('await headers()');
  });

  it('NON usa localStorage', () => {
    expect(src).not.toContain('localStorage');
  });
});

// ── Middleware — x-pathname header ────────────────────────────────────────────

describe('middleware.ts — x-pathname header (B168.5-P3)', () => {
  const mw = read('middleware.ts');

  it('imposta x-pathname sul response prima del return finale', () => {
    expect(mw).toContain("set('x-pathname'");
    expect(mw).toContain('pathname');
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

// ── CTA in /demo/guide ────────────────────────────────────────────────────────

describe('/demo/guide — CTA verso route gated (B168.5-P3)', () => {
  const src = read('app/demo/guide/page.tsx');

  it('ha CTA verso /demo/company/kora-index con data-testid', () => {
    expect(src).toContain('data-testid="guide-cta-kora-index"');
    expect(src).toContain('/demo/company/kora-index');
  });

  it('il CTA ha testo che invita al dettaglio metodologico', () => {
    expect(src).toContain('Vedi il dettaglio metodologico');
  });
});

// ── Coerenza: link sidebar admin verso route gated non è bloccato ─────────────

describe('Coerenza B169/B168.5-P3: sidebar admin verso route gated', () => {
  it('ADMIN_NAV_GROUPS contiene link a route gated (devono passare per KORA_ADMIN)', () => {
    const navSrc = read('lib/navigation/admin-nav-groups.ts');
    // Links to gated demo routes from Demo Lab group — OK for KORA_ADMIN
    expect(navSrc).toContain('/demo/index-registry');
    expect(navSrc).toContain('/demo/portfolio');
    expect(navSrc).toContain('/demo/network');
    expect(navSrc).toContain('/demo/ai-onboarding');
  });

  it('requireDemoGate accetta KORA_ADMIN (requireDemoAccess accetta KORA_ADMIN)', () => {
    const sessionSrc = read('lib/auth/kora-session.ts');
    expect(sessionSrc).toContain("koraRole === 'KORA_ADMIN'");
    // Returns user object (not error) for KORA_ADMIN
    const koraAdminBlock = sessionSrc.split("koraRole === 'KORA_ADMIN'")[1];
    expect(koraAdminBlock).toContain("koraRole: 'KORA_ADMIN'");
  });
});

// ── 11 route gated — pagine gated mantengono il file page.tsx ─────────────────

describe('11 route gated — page.tsx ancora presenti', () => {
  const GATED_PAGES = [
    'app/demo/company/kora-index/page.tsx',
    'app/demo/company/financial/page.tsx',
    'app/demo/company/pillars/page.tsx',
    'app/demo/company/status/page.tsx',
    'app/demo/company/activation/page.tsx',
    'app/demo/company/reports/page.tsx',
    'app/demo/index-registry/page.tsx',
    'app/demo/portfolio/page.tsx',
    'app/demo/network/page.tsx',
    'app/demo/advisor/page.tsx',
    'app/demo/ai-onboarding/page.tsx',
  ];

  it('tutte le 11 page.tsx esistono ancora', () => {
    for (const page of GATED_PAGES) {
      expect(exists(page), `${page} deve esistere`).toBe(true);
    }
  });
});
