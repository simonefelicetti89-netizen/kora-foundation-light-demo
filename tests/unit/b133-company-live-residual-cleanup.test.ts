// tests/unit/b133-company-live-residual-cleanup.test.ts
// B133 Step 1.5: Anti-regression guard — verifica che le 6 pagine company live critiche
// siano permanentemente pulite da qualsiasi riferimento demo/Meridiana/sintetico.
// Pure fs.readFileSync — no runtime, no DB, no Supabase.

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT    = path.resolve(__dirname, '../..');
const COMPANY = path.join(ROOT, 'app/company');
const SIDEBAR = path.join(ROOT, 'components/layout/Sidebar.tsx');

function readCompany(relPath: string): string {
  return fs.readFileSync(path.join(COMPANY, relPath), 'utf-8');
}

// B142-A: shared/page.tsx was promoted from locked shell to Foundation Light demo.
// It now carries synthetic_demo_data: true and is no longer a live shell.
// Remove it from CRITICAL_FILES — it is checked separately in B142-A test suite.
const CRITICAL_FILES = [
  'page.tsx',
  'opportunities/page.tsx',
  'contribution/page.tsx',
  'profile/page.tsx',
  'onboarding/page.tsx',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Nessun getCurrentDemoUser nei 6 file critici
// ─────────────────────────────────────────────────────────────────────────────

describe('B133 Step 1.5 — no getCurrentDemoUser in 6 critical live pages', () => {
  for (const relPath of CRITICAL_FILES) {
    it(relPath, () => {
      expect(readCompany(relPath)).not.toContain('getCurrentDemoUser');
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Nessun riferimento demo/Meridiana/sintetico nei 6 file critici
// ─────────────────────────────────────────────────────────────────────────────

describe('B133 Step 1.5 — no meridiana-group in 6 critical live pages', () => {
  for (const relPath of CRITICAL_FILES) {
    it(relPath, () => {
      expect(readCompany(relPath)).not.toContain('meridiana-group');
    });
  }
});

describe('B133 Step 1.5 — no "Meridiana" in 6 critical live pages', () => {
  for (const relPath of CRITICAL_FILES) {
    it(relPath, () => {
      expect(readCompany(relPath)).not.toContain('Meridiana');
    });
  }
});

describe('B133 Step 1.5 — no OP-001 in 6 critical live pages', () => {
  for (const relPath of CRITICAL_FILES) {
    it(relPath, () => {
      expect(readCompany(relPath)).not.toContain('OP-001');
    });
  }
});

describe('B133 Step 1.5 — no demoCompany in 6 critical live pages', () => {
  for (const relPath of CRITICAL_FILES) {
    it(relPath, () => {
      expect(readCompany(relPath)).not.toContain('demoCompany');
    });
  }
});

describe('B133 Step 1.5 — no synthetic_demo_data: true in 6 critical live pages', () => {
  for (const relPath of CRITICAL_FILES) {
    it(relPath, () => {
      expect(readCompany(relPath)).not.toContain('synthetic_demo_data: true');
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Nessun mode="DEMO" (BoundaryBadge DEMO) nei 6 file critici
// ─────────────────────────────────────────────────────────────────────────────

describe('B133 Step 1.5 — no mode="DEMO" in 6 critical live pages', () => {
  for (const relPath of CRITICAL_FILES) {
    it(relPath, () => {
      const src = readCompany(relPath);
      expect(src).not.toContain('mode="DEMO"');
      expect(src).not.toContain("mode='DEMO'");
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Locked/live shells: copy onesta e dichiarazioni di stato
// ─────────────────────────────────────────────────────────────────────────────

describe('B133 Step 1.5 — locked shell pages have honest copy', () => {
  it('opportunities: dichiara modulo non ancora attivo', () => {
    expect(readCompany('opportunities/page.tsx')).toContain('non ancora attivo');
  });

  it('commons: KORA Space funzione reale — ha requireCompanyUser e query DB (B147 rename)', () => {
    // B147: /company/shared (vetrina sintetica) rimossa. La funzione KORA Space sopravvive
    // in /company/commons con dati reali (migration 013, commons.post schema).
    const src = readCompany('commons/page.tsx');
    expect(src).toContain('requireCompanyUser');
    expect(src).toContain("schema('commons')");
    expect(src).not.toContain('synthetic_demo_data');
  });

  it('contribution: B167 dashboard server component con feature gate production_ready', () => {
    const src = readCompany('contribution/page.tsx');
    expect(src).toContain('getContributionPromoterView');
    expect(src).toContain('contribution-shell');
    expect(src).not.toContain('getCurrentDemoUser');
  });

  it('onboarding: dichiara che è gestito da KORA Admin', () => {
    expect(readCompany('onboarding/page.tsx')).toContain('gestito da KORA Admin');
  });

  it('contribution: nota metodologica — KORA Contribution non è componente KORA Index™', () => {
    const src = readCompany('contribution/page.tsx');
    expect(src).toContain('KORA Contribution');
    expect(src).toContain('KORA Index');
    expect(src).toContain('indicatore companion');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. useCompanySession presente in tutti i 6 file critici (guard live attivo)
// ─────────────────────────────────────────────────────────────────────────────

// B137: the session guard moved to app/company/layout.tsx (server-side requireCompanyUser).
// Pages no longer need to import useCompanySession just for the guard.
// Only pages that use session data (companyName, tenantId, koraRole) still import it.
describe('B137 — server layout is the session guard for /company/* pages', () => {
  it('company layout uses requireCompanyUser (server-side guard)', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app/company/layout.tsx'), 'utf-8');
    expect(layout).toContain('requireCompanyUser');
    // Must NOT start with 'use client' (server component)
    expect(layout.trimStart().startsWith("'use client'")).toBe(false);
  });

  it('pages that use session data (companyName/tenantId/koraRole) still import useCompanySession', () => {
    expect(readCompany('page.tsx')).toContain('useCompanySession');
    expect(readCompany('profile/page.tsx')).toContain('useCompanySession');
  });

  it('locked-shell pages with no session data no longer import useCompanySession', () => {
    // Guard is in the layout — these pages have no need for session data.
    // B147: /company/shared rimossa — non più nel check.
    expect(readCompany('opportunities/page.tsx')).not.toContain('useCompanySession');
    expect(readCompany('contribution/page.tsx')).not.toContain('useCompanySession');
    expect(readCompany('onboarding/page.tsx')).not.toContain('useCompanySession');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Profile: sessione/tenant live, nessun demo fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('B133 Step 1.5 — profile shows live tenant data from session', () => {
  const profile = readCompany('profile/page.tsx');

  it('ha useCompanySession', () => {
    expect(profile).toContain('useCompanySession');
  });

  it('referenzia tenantId dalla sessione', () => {
    expect(profile).toContain('tenantId');
  });

  it('referenzia companyName dalla sessione', () => {
    expect(profile).toContain('companyName');
  });

  it('nessun demo fallback o company ID sintetico', () => {
    expect(profile).not.toContain('meridiana-group');
    expect(profile).not.toContain('getCurrentDemoUser');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Sidebar — link core company presenti
// ─────────────────────────────────────────────────────────────────────────────

describe('B133 Step 1.5 — sidebar core company links presenti', () => {
  let sidebar: string;
  beforeAll(() => { sidebar = fs.readFileSync(SIDEBAR, 'utf-8'); });

  const CORE_LINKS = [
    '/company/workspace',
    '/company/status',
    '/company/kora-index',
    '/company/activation',
    '/company/pillars',
    '/company/financial',
    '/company/reports',
  ] as const;

  for (const href of CORE_LINKS) {
    it(`${href} presente`, () => {
      expect(sidebar).toContain(href);
    });
  }
});

// Decisione sidebar: /company/opportunities, /company/shared, /company/contribution,
// /company/profile sono MANTENUTI nella sidebar perché ora puntano a live shell /
// locked states onesti che dichiarano esplicitamente il modulo come "non attivo"
// o "gestito da KORA Admin". Non espongono dati demo o Meridiana. Nessuna correzione
// necessaria — i link sono informativi, non ingannevoli.

// ─────────────────────────────────────────────────────────────────────────────
// 7. Regress: pagine dual-path (fuori scope B133) ancora hanno isLive guard
// ─────────────────────────────────────────────────────────────────────────────

describe('B133 + B147 — regress: live pages boundary state', () => {
  // data: still uses isLive (if (!isLive) guard pattern)
  it('data/page.tsx has isLive guard', () => {
    expect(readCompany('data/page.tsx')).toContain('isLive');
  });
  // kora-index: still uses isLive (fetch gate: if (!isLive || !reportingPeriodForLive))
  it('kora-index/page.tsx has isLive fetch gate', () => {
    expect(readCompany('kora-index/page.tsx')).toContain('isLive');
  });
  // B147 P2: ingestion converted to live-only — no isLive guard needed.
  it('ingestion/page.tsx — live-only boundary shell (B147 P2)', () => {
    expect(readCompany('ingestion/page.tsx')).not.toContain('if (isLive)');
    expect(readCompany('ingestion/page.tsx')).not.toContain('DemoFlowBanner');
  });
  // B147 P1: activation, financial, pillars, reports had BoundaryBanner isLive={true}
  // as the only source of isLive — removed (dual-path-era signals cleaned up).
  it('activation/page.tsx — no BoundaryBanner residue (B147 P1)', () => {
    expect(readCompany('activation/page.tsx')).not.toContain('BoundaryBanner');
    expect(readCompany('activation/page.tsx')).not.toContain('isLive ?');
  });
  it('financial/page.tsx — no BoundaryBanner residue (B147 P1)', () => {
    expect(readCompany('financial/page.tsx')).not.toContain('BoundaryBanner');
    expect(readCompany('financial/page.tsx')).not.toContain('isLive ?');
  });
  it('reports/page.tsx — no BoundaryBanner residue (B147 P1)', () => {
    expect(readCompany('reports/page.tsx')).not.toContain('BoundaryBanner');
    expect(readCompany('reports/page.tsx')).not.toContain('isLive ?');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Regress B132: pagine demo non toccate da B133
// ─────────────────────────────────────────────────────────────────────────────

describe('B133 Step 1.5 — regress: B132 demo pages not touched', () => {
  const DEMO_FV  = path.join(ROOT, 'app/demo/future-vision/page.tsx');
  const DEMO_HUB = path.join(ROOT, 'app/demo/page.tsx');

  it('demo/future-vision ha data-testid="future-modules"', () => {
    expect(fs.readFileSync(DEMO_FV, 'utf-8')).toContain('data-testid="future-modules"');
  });

  it('demo/page.tsx ha force-static', () => {
    expect(fs.readFileSync(DEMO_HUB, 'utf-8')).toContain("export const dynamic = 'force-static'");
  });

  it('demo/page.tsx nessun href verso /company/ (live)', () => {
    const src = fs.readFileSync(DEMO_HUB, 'utf-8');
    expect(src).not.toMatch(/href[=:\s]*['"]\/company\//);
    expect(src).not.toMatch(/href[=:\s]*['"]\/company['"]/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Sidebar secondary links
// ─────────────────────────────────────────────────────────────────────────────

describe('B133 Step 1.5 — sidebar secondary links puntano a locked shells oneste', () => {
  let sidebar: string;
  beforeAll(() => { sidebar = fs.readFileSync(SIDEBAR, 'utf-8'); });

  it('/company/opportunities in sidebar — pagina è locked shell (non demo data)', () => {
    expect(sidebar).toContain('/company/opportunities');
    expect(readCompany('opportunities/page.tsx')).toContain('non ancora attivo');
    expect(readCompany('opportunities/page.tsx')).not.toContain('getCurrentDemoUser');
  });

  it('/company/commons in sidebar come KORA Space — funzione reale (B147 rename)', () => {
    // B147: /company/shared smantellata. La sidebar ora ha /company/commons con label KORA Space.
    expect(sidebar).toContain('/company/commons');
    expect(sidebar).not.toContain('/company/shared');
    expect(readCompany('commons/page.tsx')).toContain('requireCompanyUser');
    expect(readCompany('commons/page.tsx')).not.toContain('synthetic_demo_data');
  });

  it('/company/contribution in sidebar — pagina B167 dashboard server component (non demo data)', () => {
    expect(sidebar).toContain('/company/contribution');
    expect(readCompany('contribution/page.tsx')).toContain('getContributionPromoterView');
    expect(readCompany('contribution/page.tsx')).not.toContain('getCurrentDemoUser');
  });

  it('/company/profile in sidebar — pagina è live shell con dati tenant (non demo data)', () => {
    expect(sidebar).toContain('/company/profile');
    expect(readCompany('profile/page.tsx')).toContain('useCompanySession');
    expect(readCompany('profile/page.tsx')).not.toContain('getCurrentDemoUser');
  });
});
