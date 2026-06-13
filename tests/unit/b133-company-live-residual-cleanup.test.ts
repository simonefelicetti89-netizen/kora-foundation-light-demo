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

const CRITICAL_FILES = [
  'page.tsx',
  'opportunities/page.tsx',
  'shared/page.tsx',
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

  it('shared: dichiara spazio non ancora attivo', () => {
    expect(readCompany('shared/page.tsx')).toContain('non ancora attivo');
  });

  it('contribution: dichiara modulo non ancora disponibile', () => {
    expect(readCompany('contribution/page.tsx')).toContain('non ancora disponibile');
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

describe('B133 Step 1.5 — useCompanySession guard present in all 6 critical live pages', () => {
  for (const relPath of CRITICAL_FILES) {
    it(relPath, () => {
      expect(readCompany(relPath)).toContain('useCompanySession');
    });
  }
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

describe('B133 Step 1.5 — regress: dual-path live pages still have isLive guard', () => {
  it('data/page.tsx', () => {
    expect(readCompany('data/page.tsx')).toContain('isLive');
  });
  it('ingestion/page.tsx', () => {
    expect(readCompany('ingestion/page.tsx')).toContain('isLive');
  });
  it('kora-index/page.tsx', () => {
    expect(readCompany('kora-index/page.tsx')).toContain('isLive');
  });
  it('activation/page.tsx', () => {
    expect(readCompany('activation/page.tsx')).toContain('isLive');
  });
  it('financial/page.tsx', () => {
    expect(readCompany('financial/page.tsx')).toContain('isLive');
  });
  it('reports/page.tsx', () => {
    expect(readCompany('reports/page.tsx')).toContain('isLive');
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

  it('/company/shared in sidebar — pagina è locked shell (non demo data)', () => {
    expect(sidebar).toContain('/company/shared');
    expect(readCompany('shared/page.tsx')).toContain('non ancora attivo');
    expect(readCompany('shared/page.tsx')).not.toContain('getCurrentDemoUser');
  });

  it('/company/contribution in sidebar — pagina è locked shell (non demo data)', () => {
    expect(sidebar).toContain('/company/contribution');
    expect(readCompany('contribution/page.tsx')).toContain('non ancora disponibile');
    expect(readCompany('contribution/page.tsx')).not.toContain('getCurrentDemoUser');
  });

  it('/company/profile in sidebar — pagina è live shell con dati tenant (non demo data)', () => {
    expect(sidebar).toContain('/company/profile');
    expect(readCompany('profile/page.tsx')).toContain('useCompanySession');
    expect(readCompany('profile/page.tsx')).not.toContain('getCurrentDemoUser');
  });
});
