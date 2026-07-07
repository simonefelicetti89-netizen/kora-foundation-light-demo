// tests/unit/company-decision-pack-regression-guards-01.test.ts
// COMPANY-DECISION-PACK-REGRESSION-GUARDS-01 — minimal static/string regression guards.
//
// Same rationale as component-test-foundation-01-ui-regression-guards.test.ts:
// vitest.config.ts uses environment: 'node' (no jsdom) and include: ['tests/**/*.test.ts']
// (not .test.tsx) — no @testing-library/react is installed. These tests read raw source
// text instead, matching the existing static-test pattern used throughout tests/unit/.
//
// Scope: locks in the fixes made in COMPANY-REPORTS-DECISION-PACK-UX-01 —
// (1) the misleading "struttura demo" no-data link on /company/reports was removed;
// (2) PrivacyBoundaryNote (used only on that live-only page) no longer mislabels
//     itself as synthetic_demo_data / not_live_data.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function readSrc(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

const reportsSrc = readSrc('app/company/reports/page.tsx');
const privacyNoteSrc = readSrc('components/reports/PrivacyBoundaryNote.tsx');

// ── 1. Reports no-data guard ──────────────────────────────────────────────────

describe('COMPANY-DECISION-PACK-REGRESSION-GUARDS-01 — Reports no-data state guard', () => {
  it('does not contain "struttura demo"', () => {
    expect(reportsSrc).not.toContain('struttura demo');
  });

  it('the no-data branch does not link to /api/company/decision-pack as if it returns a demo/preview structure', () => {
    // Isolate the no-data branch specifically: from `if (!hasKoraData)` to the
    // next `const output` (start of the has-data branch), so a legitimate live
    // link to the same API elsewhere on the page (which IS correct once data
    // exists) does not make this assertion brittle.
    const noDataBranchStart = reportsSrc.indexOf('if (!hasKoraData)');
    const noDataBranchEnd = reportsSrc.indexOf('const output', noDataBranchStart);
    expect(noDataBranchStart).toBeGreaterThan(-1);
    expect(noDataBranchEnd).toBeGreaterThan(noDataBranchStart);
    const noDataBranch = reportsSrc.slice(noDataBranchStart, noDataBranchEnd);
    expect(noDataBranch).not.toContain('/api/company/decision-pack');
  });

  it('preserves clear "not yet available" copy with an operator follow-up note', () => {
    expect(reportsSrc).toContain('Decision Pack non ancora disponibile');
    expect(reportsSrc).toContain('Completa il processo di intake e scoring per generare il Decision Pack');
    expect(reportsSrc).toContain('Il tuo KORA Admin ti aggiornerà quando i dati saranno pronti');
  });
});

// ── 2. PrivacyBoundaryNote live-only label guard ──────────────────────────────

describe('COMPANY-DECISION-PACK-REGRESSION-GUARDS-01 — PrivacyBoundaryNote live-only label guard', () => {
  it('is used exclusively on the live-only company reports page (contract this guard depends on)', () => {
    // If PrivacyBoundaryNote ever gets reused on a genuinely synthetic/demo page,
    // the "no synthetic_demo_data / not_live_data" assertions below would need
    // re-evaluating for that new call site — this test documents the assumption.
    expect(reportsSrc).toContain('PrivacyBoundaryNote');
  });

  it('does not include "synthetic_demo_data"', () => {
    expect(privacyNoteSrc).not.toContain('synthetic_demo_data');
  });

  it('does not include "not_live_data"', () => {
    expect(privacyNoteSrc).not.toContain('not_live_data');
  });

  it('includes the cautious labels expected for a live report: pre_empirical_calibration, production_ready: false, KORA Foundation Light, informational_only', () => {
    expect(privacyNoteSrc).toContain('pre_empirical_calibration');
    expect(privacyNoteSrc).toContain('production_ready: false');
    expect(privacyNoteSrc).toContain('KORA Foundation Light');
    expect(privacyNoteSrc).toContain('informational_only');
  });
});

// ── 3. Overclaim guard ────────────────────────────────────────────────────────
// Targeted forbidden-phrase checks, not blanket keyword bans — this page
// legitimately discusses GDPR-adjacent/certification topics as disclaimers
// ("non una certificazione ESG", "non garantisce conformità normativa"), so a
// blunt /GDPR|conforme|certificaz/i ban would be brittle and fail on the
// correct, existing cautious language. Only forbidden *positive* claims are checked.

describe('COMPANY-DECISION-PACK-REGRESSION-GUARDS-01 — overclaim guard', () => {
  it('does not mention GDPR at all (no legitimate positive or negative GDPR claim exists on this page today)', () => {
    expect(reportsSrc).not.toContain('GDPR');
    expect(privacyNoteSrc).not.toContain('GDPR');
  });

  it('does not claim production readiness (production_ready: false must never flip to true, and no prose readiness claim)', () => {
    expect(reportsSrc).not.toMatch(/production_ready:\s*true/i);
    expect(privacyNoteSrc).not.toMatch(/production_ready:\s*true/i);
    expect(reportsSrc).not.toMatch(/pronto per la produzione/i);
    expect(privacyNoteSrc).not.toMatch(/pronto per la produzione/i);
  });

  it('does not mention GD01 or claim live golden-path proof', () => {
    expect(reportsSrc).not.toContain('GD01');
    expect(privacyNoteSrc).not.toContain('GD01');
  });

  it('does not mention two-tenant proof', () => {
    expect(reportsSrc).not.toMatch(/two.tenant/i);
    expect(privacyNoteSrc).not.toMatch(/two.tenant/i);
  });

  it('still preserves the existing certification/regulatory disclaimers (negative claims are fine and expected)', () => {
    expect(reportsSrc).toContain('non una certificazione ESG');
    expect(privacyNoteSrc).toContain('Non garantisce conformità normativa');
  });
});

// ── 4. Methodology wording guard ──────────────────────────────────────────────

describe('COMPANY-DECISION-PACK-REGRESSION-GUARDS-01 — methodology wording guard', () => {
  it('uses "KORA Index v1.0" as the public version label', () => {
    expect(reportsSrc).toContain('KORA Index v1.0');
  });

  it('does not use "Methodology Architecture v3" as a public-facing label on this company page', () => {
    // Internal-only per CLAUDE.md §5/§8 — never a public product version label.
    expect(reportsSrc).not.toContain('Methodology Architecture v3');
    expect(privacyNoteSrc).not.toContain('Methodology Architecture v3');
  });

  it('preserves cautious "pre_empirical_calibration" / "pre-empirical calibration" wording', () => {
    expect(reportsSrc).toContain('pre_empirical_calibration');
    expect(privacyNoteSrc).toMatch(/pre_empirical_calibration|pre-empirical calibration/);
  });
});
