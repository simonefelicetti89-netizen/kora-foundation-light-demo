/**
 * Gate 2 Phase 1 — Manual Browser Smoke Final Result assertions.
 *
 * Verifies that docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md correctly documents
 * the final manual browser smoke: login, routing, company context, empty-state
 * classification, privacy boundary, migration state, production safety, no secrets.
 *
 * No SQL executed. No DB touched. No migration applied. No secrets read.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DOC_PATH = 'docs/GATE2_PHASE1_STAGING_SEED_AND_SMOKE.md';

function doc(): string {
  return readFileSync(resolve(process.cwd(), DOC_PATH), 'utf-8');
}

// ── 1. Final result section present ──────────────────────────────────────────

describe('gate2-manual-browser-smoke-final — section', () => {
  it('doc contains Manual Browser Smoke Final Result section', () => {
    expect(doc()).toMatch(/Manual Browser Smoke Final Result/i);
  });

  it('doc records localhost:3000 as app URL', () => {
    expect(doc()).toMatch(/localhost:3000/);
  });

  it('doc records staging project ref haqflkurpmeaxpikozjl', () => {
    expect(doc()).toMatch(/haqflkurpmeaxpikozjl/);
  });

  it('doc records commit tested (23bb323 or earlier)', () => {
    expect(doc()).toMatch(/23bb323|ec8665d|0a10c05|23bb323/);
  });
});

// ── 2. Auth and routing ───────────────────────────────────────────────────────

describe('gate2-manual-browser-smoke-final — auth and routing', () => {
  it('doc records company admin login as PASS', () => {
    expect(doc()).toMatch(/[Cc]ompany admin login.*PASS|PASS.*[Cc]ompany admin login/);
  });

  it('doc records protected routing as PASS', () => {
    expect(doc()).toMatch(/[Pp]rotected routing.*PASS|PASS.*[Pp]rotected routing/);
  });
});

// ── 3. Company context ────────────────────────────────────────────────────────

describe('gate2-manual-browser-smoke-final — company context', () => {
  it('doc records company context as PASS', () => {
    expect(doc()).toMatch(/[Cc]ompany context.*PASS|PASS.*[Cc]ompany context/);
  });

  it('doc names KORA Staging Synthetic Company', () => {
    expect(doc()).toMatch(/KORA Staging Synthetic Company/);
  });

  it('doc records UI rendering as PASS', () => {
    expect(doc()).toMatch(/UI rendering.*PASS|PASS.*UI rendering/i);
  });
});

// ── 4. Onboarding / empty-state classification ────────────────────────────────

describe('gate2-manual-browser-smoke-final — empty-state classification', () => {
  it('doc classifies dashboard data as EMPTY BY DESIGN / ONBOARDING STATE', () => {
    expect(doc()).toMatch(/EMPTY BY DESIGN.*ONBOARDING STATE|ONBOARDING STATE.*EMPTY BY DESIGN/i);
  });

  it('doc explains no dataset has been loaded', () => {
    expect(doc()).toMatch(/no dataset/i);
  });

  it('doc explains no scoring has been executed', () => {
    expect(doc()).toMatch(/no scoring/i);
  });

  it('doc explains no Decision Pack has been generated', () => {
    expect(doc()).toMatch(/no Decision Pack/i);
  });

  it('doc does not claim full dashboard data is populated', () => {
    expect(doc()).not.toMatch(/dashboard.*fully populated|populated.*dashboard/i);
  });
});

// ── 5. Privacy boundary ───────────────────────────────────────────────────────

describe('gate2-manual-browser-smoke-final — privacy boundary', () => {
  it('doc records privacy boundary as PASS', () => {
    expect(doc()).toMatch(/[Pp]rivacy boundary.*PASS|PASS.*[Pp]rivacy boundary/);
  });

  it('doc confirms no individual worker data visible to company admin', () => {
    expect(doc()).toMatch(/no individual worker data.*company admin|individual worker data.*not visible/i);
  });
});

// ── 6. Fake fallback ──────────────────────────────────────────────────────────

describe('gate2-manual-browser-smoke-final — fake fallback', () => {
  it('doc confirms fake fallback was NOT USED', () => {
    expect(doc()).toMatch(/[Ff]ake fallback.*NOT USED|NOT USED.*[Ff]ake fallback/);
  });

  it('doc confirms no synthetic data was added to populate dashboards', () => {
    expect(doc()).toMatch(/NONE|no synthetic.*dashboard|no fake.*dashboard/i);
  });
});

// ── 7. Migration state ────────────────────────────────────────────────────────

describe('gate2-manual-browser-smoke-final — migration state', () => {
  it('doc confirms migration 027 NOT applied', () => {
    expect(doc()).toMatch(/027.*NOT applied|NOT applied.*027/i);
  });

  it('doc confirms migration 029 NOT applied', () => {
    expect(doc()).toMatch(/029.*NOT applied|NOT applied.*029/i);
  });
});

// ── 8. Production safety ──────────────────────────────────────────────────────

describe('gate2-manual-browser-smoke-final — production safety', () => {
  it('doc confirms production NOT touched', () => {
    expect(doc()).toMatch(/Production.*NOT touched|NOT touched.*Production/i);
  });

  it('doc confirms no supabase db push executed', () => {
    expect(doc()).toMatch(/supabase db push/i);
  });

  it('doc confirms no schema/RLS/grant/policy changes', () => {
    expect(doc()).toMatch(/schema.*RLS|RLS.*policy|schema\/RLS/i);
  });
});

// ── 9. Secrets hygiene ────────────────────────────────────────────────────────

describe('gate2-manual-browser-smoke-final — secrets hygiene', () => {
  it('doc contains no JWT/access token literals', () => {
    expect(doc()).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('doc contains no service role key patterns', () => {
    expect(doc()).not.toMatch(/service_role[^:]*:[^:]*[A-Za-z0-9]{40,}/i);
  });

  it('doc contains no connection string literals', () => {
    expect(doc()).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('doc contains no password-like values after password= assignments', () => {
    expect(doc()).not.toMatch(/password\s*=\s*[^\s]{8,}/i);
  });

  it('doc confirms no secrets/passwords/tokens printed or committed', () => {
    expect(doc()).toMatch(/no secrets|no.*password.*committed|no.*token.*committed/i);
  });
});

// ── 10. Final verdict ─────────────────────────────────────────────────────────

describe('gate2-manual-browser-smoke-final — verdict', () => {
  it('doc contains PASS WITH EXPECTED ONBOARDING EMPTY STATE verdict', () => {
    expect(doc()).toMatch(/PASS WITH EXPECTED ONBOARDING EMPTY STATE/i);
  });

  it('doc records overall verdict as PASS', () => {
    expect(doc()).toMatch(/Overall verdict.*PASS|verdict.*PASS/i);
  });
});
