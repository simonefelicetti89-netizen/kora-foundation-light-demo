/**
 * Gate 2 — CTO Close Review assertions.
 *
 * Verifies that docs/GATE2_CTO_CLOSE_REVIEW.md correctly documents the
 * CTO architecture review: evidence reviewed, assessment matrix, Gate 2
 * decision, 027/029 status, residual risks, and production/secret safety.
 *
 * No SQL executed. No DB touched. No migration applied. No secrets read.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const DOC_PATH = 'docs/GATE2_CTO_CLOSE_REVIEW.md';

function doc(): string {
  return readFileSync(resolve(process.cwd(), DOC_PATH), 'utf-8');
}

// ── 1. Document identity ──────────────────────────────────────────────────────

describe('gate2-cto-close-review — document identity', () => {
  it('doc contains Gate 2 CTO close review title', () => {
    expect(doc()).toMatch(/Gate 2.*CTO.*Review|CTO.*Architecture.*Review/i);
  });

  it('doc references staging project ref haqflkurpmeaxpikozjl', () => {
    expect(doc()).toMatch(/haqflkurpmeaxpikozjl/);
  });

  it('doc confirms production NOT touched', () => {
    expect(doc()).toMatch(/Production.*NOT touched|NOT touched.*Production/i);
  });
});

// ── 2. Migration state ────────────────────────────────────────────────────────

describe('gate2-cto-close-review — migration state', () => {
  it('doc confirms migrations 001–026 and 028 applied', () => {
    expect(doc()).toMatch(/001.*026.*028|001[–-]026.*028/i);
  });

  it('doc confirms migration 027 NOT applied', () => {
    expect(doc()).toMatch(/027.*NOT applied|NOT applied.*027/i);
  });

  it('doc confirms migration 029 NOT applied', () => {
    expect(doc()).toMatch(/029.*NOT applied|NOT applied.*029/i);
  });

  it('doc references 029 as emergency safety net', () => {
    expect(doc()).toMatch(/029.*safety net|emergency.*029/i);
  });
});

// ── 3. Auth users ─────────────────────────────────────────────────────────────

describe('gate2-cto-close-review — auth users', () => {
  it('doc confirms Auth users are valid', () => {
    expect(doc()).toMatch(/Auth.*valid|valid.*Auth|4 valid.*users/i);
  });

  it('doc confirms password reset via Auth Admin API', () => {
    expect(doc()).toMatch(/Auth Admin API/i);
  });

  it('doc confirms no ghost users', () => {
    expect(doc()).toMatch(/ghost user|no ghost/i);
  });
});

// ── 4. Browser smoke ──────────────────────────────────────────────────────────

describe('gate2-cto-close-review — browser smoke', () => {
  it('doc records browser smoke as PASS', () => {
    expect(doc()).toMatch(/[Bb]rowser smoke.*PASS|PASS.*[Bb]rowser smoke/);
  });

  it('doc records expected onboarding empty state', () => {
    expect(doc()).toMatch(/EMPTY BY DESIGN|onboarding.*empty|empty.*onboarding/i);
  });

  it('doc confirms no fake fallback was used', () => {
    expect(doc()).toMatch(/[Ff]ake fallback|no.*fake|NOT.*fake/i);
  });
});

// ── 5. Privacy boundary ───────────────────────────────────────────────────────

describe('gate2-cto-close-review — privacy boundary', () => {
  it('doc records no individual worker data visible to company', () => {
    expect(doc()).toMatch(/individual worker data|personal data boundary/i);
  });

  it('doc records C-11 PASS', () => {
    expect(doc()).toMatch(/C-11.*PASS|PASS.*C-11/);
  });

  it('doc records C-12 PASS', () => {
    expect(doc()).toMatch(/C-12.*PASS|PASS.*C-12/);
  });

  it('doc records W-04 PASS', () => {
    expect(doc()).toMatch(/W-04.*PASS|PASS.*W-04/);
  });
});

// ── 6. Test suite and build ───────────────────────────────────────────────────

describe('gate2-cto-close-review — test suite and build', () => {
  it('doc confirms full test suite pass', () => {
    expect(doc()).toMatch(/7047.*tests|tests.*7047|full.*suite.*PASS/i);
  });

  it('doc confirms tsc --noEmit clean', () => {
    expect(doc()).toMatch(/tsc.*noEmit|noEmit.*clean|TypeScript.*PASS/i);
  });
});

// ── 7. Gate 2 decision ────────────────────────────────────────────────────────

describe('gate2-cto-close-review — gate 2 decision', () => {
  it('doc contains a Gate 2 decision', () => {
    expect(doc()).toMatch(/Gate 2.*[Dd]ecision|[Dd]ecision.*Gate 2/i);
  });

  it('doc contains CLOSE GATE 2 verdict', () => {
    expect(doc()).toMatch(/CLOSE GATE 2/i);
  });
});

// ── 8. Migration 027 recommendation ──────────────────────────────────────────

describe('gate2-cto-close-review — 027 recommendation', () => {
  it('doc contains a recommendation for migration 027', () => {
    expect(doc()).toMatch(/027.*[Rr]ecommendation|[Rr]ecommendation.*027/i);
  });

  it('doc recommends 027 remain suspended', () => {
    expect(doc()).toMatch(/027.*suspend|suspend.*027|027.*remain/i);
  });

  it('doc links 027 to Gate 3 requirement', () => {
    expect(doc()).toMatch(/027.*Gate 3|Gate 3.*027/i);
  });
});

// ── 9. Residual risks and next gate ──────────────────────────────────────────

describe('gate2-cto-close-review — residual risks', () => {
  it('doc lists residual risks', () => {
    expect(doc()).toMatch(/[Rr]esidual [Rr]isk|[Rr]emaining [Rr]isk/i);
  });

  it('doc mentions Gate 3 as required before real worker data', () => {
    expect(doc()).toMatch(/Gate 3.*real.*worker|Gate 3.*[Ll]egal|[Ll]egal.*Gate 3/i);
  });

  it('doc mentions Gate 5 as required before fiscal outputs', () => {
    expect(doc()).toMatch(/Gate 5.*fiscal|Gate 5.*[Tt]ax/i);
  });
});

// ── 10. Secrets hygiene ───────────────────────────────────────────────────────

describe('gate2-cto-close-review — secrets hygiene', () => {
  it('doc contains no JWT/access token literals', () => {
    expect(doc()).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('doc contains no service role key patterns', () => {
    expect(doc()).not.toMatch(/service_role[^:]*:[^:]*[A-Za-z0-9]{40,}/i);
  });

  it('doc contains no connection string literals', () => {
    expect(doc()).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('doc contains no password-like assignments', () => {
    expect(doc()).not.toMatch(/password\s*=\s*[^\s]{8,}/i);
  });
});
