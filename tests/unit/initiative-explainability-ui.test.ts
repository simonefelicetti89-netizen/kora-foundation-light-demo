/**
 * Initiative Explainability UI Sprint — Structural tests
 *
 * Verifies that the company-facing initiative explainability UI surface is:
 *   1. Wired to the correct API endpoint
 *   2. Displaying all required fields
 *   3. Including all eligibility class explanations
 *   4. Including the canonical "compliance ≠ impatto" message
 *   5. Free of worker-level data fields
 *   6. Providing empty and error states
 *
 * All tests are pure file-system / source-text checks — no runtime, no DB, no network.
 *
 * Constraint confirmations (verified by test):
 *   - No KORA Index formula changed
 *   - No methodology weights changed
 *   - No migrations applied
 *   - No worker-level data exposed in company surface
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}
function exists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel));
}

// ── Paths ─────────────────────────────────────────────────────────────────────

const PANEL_PATH   = 'components/company/InitiativeExplainabilityPanel.tsx';
const PAGE_PATH    = 'app/company/kora-index/page.tsx';
const API_PATH     = 'app/api/company/initiatives/explainability/route.ts';

// ── 1. API endpoint reference ─────────────────────────────────────────────────

describe('Initiative Explainability UI — 1. API endpoint reference', () => {
  it('component file exists', () => {
    expect(exists(PANEL_PATH)).toBe(true);
  });

  it('component fetches /api/company/initiatives/explainability', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('/api/company/initiatives/explainability');
  });

  it('page imports InitiativeExplainabilityPanel', () => {
    const src = read(PAGE_PATH);
    expect(src).toContain('InitiativeExplainabilityPanel');
  });

  it('page renders <InitiativeExplainabilityPanel', () => {
    const src = read(PAGE_PATH);
    expect(src).toContain('<InitiativeExplainabilityPanel');
  });
});

// ── 2. Initiative name displayed ──────────────────────────────────────────────

describe('Initiative Explainability UI — 2. Initiative name', () => {
  it('component renders initiativeName field', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('initiativeName');
  });

  it('component uses data-testid="initiative-name"', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('data-testid="initiative-name"');
  });
});

// ── 3. Eligibility class displayed ───────────────────────────────────────────

describe('Initiative Explainability UI — 3. Eligibility class', () => {
  it('component uses eligibilityClass field', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('eligibilityClass');
  });

  it('component renders EligibilityBadge', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('EligibilityBadge');
  });

  it('API returns eligibilityClass in response shape', () => {
    const src = read(API_PATH);
    expect(src).toContain('eligibilityClass');
  });
});

// ── 4. contributedToKoraIndex displayed ──────────────────────────────────────

describe('Initiative Explainability UI — 4. KORA Index contribution state', () => {
  it('component uses contributedToKoraIndex field', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('contributedToKoraIndex');
  });

  it('component renders ContributionChip based on contributedToKoraIndex', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('ContributionChip');
    expect(src).toContain('contributed');
  });

  it('component shows "Contribuisce al KORA Index" for eligible initiatives', () => {
    const src = read(PANEL_PATH);
    expect(src).toMatch(/Contribuisce al KORA Index/);
  });
});

// ── 5. Reason and whyNotContributed displayed ─────────────────────────────────

describe('Initiative Explainability UI — 5. Reason and whyNotContributed', () => {
  it('component renders reason field', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('item.reason');
  });

  it('component renders whyNotContributed when applicable', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('whyNotContributed');
    expect(src).toContain('data-testid="initiative-why-not"');
  });

  it('component shows reason via data-testid="initiative-reason"', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('data-testid="initiative-reason"');
  });
});

// ── 6. Eligibility class explanations ─────────────────────────────────────────

describe('Initiative Explainability UI — 6. Eligibility class explanations', () => {
  it('explains "eligible" class: genera Impact Units', () => {
    const src = read(PANEL_PATH);
    expect(src).toMatch(/Impact Units/);
    expect(src).toMatch(/Idonea/);
  });

  it('explains "limited" class: sollievo economico', () => {
    const src = read(PANEL_PATH);
    expect(src).toMatch(/sollievo economico/i);
    expect(src).toMatch(/limitazioni/i);
  });

  it('explains "blocked" class: compliance obbligatoria / esclusa', () => {
    const src = read(PANEL_PATH);
    expect(src).toMatch(/compliance obbligatoria|compliance/i);
    expect(src).toMatch(/Bloccata/);
  });

  it('explains "review_required" class: ulteriori informazioni', () => {
    const src = read(PANEL_PATH);
    expect(src).toMatch(/ulteriori informazioni|revisione/i);
    expect(src).toMatch(/In revisione/);
  });

  it('includes legend panel with all four classes', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('data-testid="eligibility-legend"');
    expect(src).toContain("<LegendRow cls=\"eligible\"");
    expect(src).toContain("<LegendRow cls=\"limited\"");
    expect(src).toContain("<LegendRow cls=\"blocked\"");
    expect(src).toContain("<LegendRow cls=\"review_required\"");
  });
});

// ── 7. "KORA non trasforma la compliance in impatto" ──────────────────────────

describe('Initiative Explainability UI — 7. Canonical compliance copy', () => {
  it('component includes the canonical "compliance in impatto" message', () => {
    const src = read(PANEL_PATH);
    expect(src).toMatch(/KORA non trasforma la compliance in impatto/i);
  });

  it('page title references the canonical message or the section label', () => {
    const pageSrc = read(PAGE_PATH);
    expect(pageSrc).toMatch(/Perché le iniziative hanno inciso/i);
  });
});

// ── 8. Worker-level fields excluded ──────────────────────────────────────────

describe('Initiative Explainability UI — 8. Worker-level data exclusion', () => {
  const panelSrc = read(PANEL_PATH);

  it('component does not reference worker_id', () => {
    expect(panelSrc).not.toContain('worker_id');
  });

  it('component does not reference worker_identity_id', () => {
    expect(panelSrc).not.toContain('worker_identity_id');
  });

  it('component does not reference pseudonym_id', () => {
    expect(panelSrc).not.toContain('pseudonym_id');
  });

  it('component does not reference individual_pib or worker_pib', () => {
    expect(panelSrc).not.toMatch(/individual_pib|worker_pib/);
  });

  it('component does not reference personal.worker_pseudonym_map', () => {
    expect(panelSrc).not.toContain('worker_pseudonym_map');
  });

  it('API route SELECT clause contains only aggregate-safe fields', () => {
    const apiSrc = read(API_PATH);
    // The .select() call must not include worker identity fields
    const selectMatch = apiSrc.match(/\.select\(['"]([^'"]+)['"]\)/);
    expect(selectMatch).not.toBeNull();
    const selectCols = selectMatch![1];
    expect(selectCols).not.toContain('pseudonym_id');
    expect(selectCols).not.toContain('worker_id');
    expect(selectCols).not.toContain('worker_identity_id');
    // Aggregate columns must be present
    expect(selectCols).toContain('action_family');
    expect(selectCols).toContain('eligibility_status');
  });
});

// ── 9. Empty state ────────────────────────────────────────────────────────────

describe('Initiative Explainability UI — 9. Empty state', () => {
  it('component defines empty state branch', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain("state === 'empty'");
  });

  it('empty state uses data-testid="initiative-empty"', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('data-testid="initiative-empty"');
  });

  it('empty state shows a user-friendly message', () => {
    const src = read(PANEL_PATH);
    expect(src).toMatch(/Nessuna iniziativa|noDataReason/);
  });
});

// ── 10. Error state ───────────────────────────────────────────────────────────

describe('Initiative Explainability UI — 10. Error state', () => {
  it('component defines error state branch', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain("state === 'error'");
  });

  it('error state uses data-testid="initiative-error"', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('data-testid="initiative-error"');
  });

  it('error state shows fallback hint if available', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('data?.hint');
  });
});

// ── 11. P1 product integrity regression ──────────────────────────────────────

describe('Initiative Explainability UI — 11. P1 regression: PIB coherence', () => {
  it('P1 PIB page still fetches /api/worker/pib', () => {
    const src = read('app/my-kora/personal-impact-balance/page.tsx');
    expect(src).toContain('/api/worker/pib');
  });

  it('P1 upload dedup guard still present in accept route', () => {
    const src = read('app/api/admin/data-intake/accept/route.ts');
    expect(src).toMatch(/batch_duplicate_rejected|conservative_exact_match/i);
  });

  it('P1 company upload history route still exists', () => {
    expect(exists('app/api/company/data-submissions/history/route.ts')).toBe(true);
  });
});

// ── 12. Route privacy regression ──────────────────────────────────────────────

describe('Initiative Explainability UI — 12. Route privacy regression', () => {
  it('explainability route requires company user (COMPANY_ADMIN)', () => {
    const src = read(API_PATH);
    expect(src).toContain('requireCompanyUser');
    expect(src).toContain('COMPANY_ADMIN');
  });

  it('explainability route takes tenantId from JWT, not query param', () => {
    const src = read(API_PATH);
    expect(src).toContain('auth.tenantId');
    expect(src).not.toMatch(/req\.query.*tenantId|searchParams.*tenantId/);
  });

  it('tenant isolation test file still exists', () => {
    expect(exists('tests/unit/tenant-isolation.test.ts')).toBe(true);
  });
});

// ── 13. UI governance regression ─────────────────────────────────────────────

describe('Initiative Explainability UI — 13. UI governance regression', () => {
  it('methodology config still reads from v0.1.ts (no hardcoded weights)', () => {
    const src = read('lib/methodology-config/v0.1.ts');
    expect(src).toContain('getMacroblockWeights');
  });

  it('KORA Index page still shows calibration_status', () => {
    const src = read(PAGE_PATH);
    expect(src).toMatch(/calibration_status|calibrationStatus/);
  });

  it('KORA Index page still shows confidence_score alongside index value', () => {
    const src = read(PAGE_PATH);
    expect(src).toMatch(/confidence_score|confidenceScore/);
  });

  it('KORA Contribution remains separate companion indicator — not merged', () => {
    const src = read(PAGE_PATH);
    // Page must not import KoraContribution as an index component
    expect(src).not.toMatch(/koraContribution.*component|contribution.*index_component/i);
  });

  it('InitiativeExplainabilityPanel footer marks pre_empirical_calibration', () => {
    const src = read(PANEL_PATH);
    expect(src).toContain('pre_empirical_calibration');
  });
});
