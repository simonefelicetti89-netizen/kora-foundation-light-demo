// tests/unit/b119-company-wallboard.test.ts
// B119: Company Display View / KORA Wallboard -- 20 structural tests.
//
// Verifica:
//   1-3   Route esiste, server auth, rifiuta WORKER
//   4-7   Contenuto wallboard: company_name, KORA Index, empty state, privacy badge
//   8-12  Privacy boundary: no worker email, worker_id, private_note, dati sotto soglia
//  13-14  Sidebar: KORA Wallboard in company nav, non in worker nav
//  15     Admin preview: non richiede company login (requireKoraAdmin, non requireCompanyUser)
//  16     COMPANY_VIEWER non torna come opzione provisioning
//  17-18  No demo OP-001 / Meridiana fallback nel wallboard client
//  19     Privacy footer canonico
//  20     Scoring non modificato

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildNavGroups } from '../../components/layout/Sidebar';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

const wallboardPage      = readFile('app/company/wallboard/page.tsx');
const wallboardClient    = readFile('app/company/wallboard/_components/WallboardClient.tsx');
const methodologyConfig  = readFile('lib/methodology-config/v0.1.ts');

// --- 1-3: Route structure and auth ----------------------------------------

describe('B119 -- Route structure and auth', () => {
  it('/company/wallboard page file exists', () => {
    expect(fileExists('app/company/wallboard/page.tsx')).toBe(true);
  });

  it('/company/wallboard requires requireCompanyUser (blocks unauthenticated)', () => {
    expect(wallboardPage).toContain('requireCompanyUser');
    expect(wallboardPage).toContain('isKoraAuthError');
  });

  it('/company/wallboard passes only email and role to WallboardClient (no workerId, no tenantId raw)', () => {
    expect(wallboardPage).toContain('userEmail={auth.email}');
    expect(wallboardPage).toContain('userRole={auth.koraRole}');
    expect(wallboardPage).not.toContain('{auth.workerId}');
    expect(wallboardPage).not.toContain('{auth.tenantId}');
  });
});

// --- 4-7: Wallboard content ------------------------------------------------

describe('B119 -- Wallboard content', () => {
  it('WallboardClient renders company_name from workspace API', () => {
    expect(wallboardClient).toContain('data-testid="wallboard-company-name"');
    expect(wallboardClient).toContain("tenant?.companyName");
  });

  it('WallboardClient renders KORA Index value when present', () => {
    expect(wallboardClient).toContain('data-testid="wallboard-kora-index-value"');
    expect(wallboardClient).toContain('data-testid="wallboard-kora-index-section"');
  });

  it('WallboardClient renders empty state when no KORA Index scoring', () => {
    expect(wallboardClient).toContain('data-testid="wallboard-empty-state"');
    expect(wallboardClient).toContain('La vista Wallboard sarà disponibile dopo il primo calcolo KORA Index');
  });

  it('WallboardClient has privacy-safe badge visible in header', () => {
    expect(wallboardClient).toContain('data-testid="wallboard-privacy-badge"');
    expect(wallboardClient).toContain('Vista aggregata privacy-safe');
  });
});

// --- 8-12: Privacy boundary ------------------------------------------------

describe('B119 -- Privacy boundary (no individual worker data)', () => {
  it('WallboardClient never renders worker email', () => {
    expect(wallboardClient).not.toContain('workerEmail');
    expect(wallboardClient).not.toContain('worker.email');
    expect(wallboardClient).not.toContain('worker_email');
  });

  it('WallboardClient never renders worker_id in JSX template expressions', () => {
    expect(wallboardClient).not.toContain('{worker_id}');
    expect(wallboardClient).not.toContain('{workerId}');
    expect(wallboardClient).not.toContain('.worker_id}');
    expect(wallboardClient).not.toContain('.workerId}');
  });

  it('WallboardClient never renders private_note in JSX template expressions', () => {
    expect(wallboardClient).not.toContain('{private_note}');
    expect(wallboardClient).not.toContain('{privateNote}');
    expect(wallboardClient).not.toContain('.private_note}');
    expect(wallboardClient).not.toContain('.privateNote}');
  });

  it('WallboardClient shows suppressed state when pillar is below privacy threshold', () => {
    expect(wallboardClient).toContain('pillarRow.suppressed');
    expect(wallboardClient).toContain('data-testid={`wallboard-pillar-${pillarCode.toLowerCase()}-suppressed`}');
    expect(wallboardClient).toContain('sotto soglia privacy');
  });

  it('WallboardClient suppressed block shows threshold, not raw count', () => {
    // Suppressed branch shows N< suppression_threshold, not a participation count.
    // The section between the suppressed check and the !suppressed check must not
    // reference total_participations.
    expect(wallboardClient).toContain('pillarRow.suppression_threshold');
    const suppressedBlock = wallboardClient.slice(
      wallboardClient.indexOf('pillarRow && pillarRow.suppressed'),
      wallboardClient.indexOf('pillarRow && !pillarRow.suppressed'),
    );
    expect(suppressedBlock).not.toContain('total_participations');
  });
});

// --- 13-14: Sidebar navigation ---------------------------------------------

describe('B119 -- Sidebar navigation', () => {
  it('COMPANY_ADMIN sidebar contains KORA Wallboard link', () => {
    const groups = buildNavGroups('COMPANY_ADMIN');
    const allHrefs = groups.flatMap(g => g.items.map(i => i.href));
    expect(allHrefs).toContain('/company/wallboard');
  });

  it('COMPANY_VIEWER sidebar removed (B143) — no dedicated nav block', () => {
    // B143: COMPANY_VIEWER rimosso — buildNavGroups falls through to no company nav for this role.
    const groups = buildNavGroups('COMPANY_VIEWER');
    const allHrefs = groups.flatMap(g => g.items.map(i => i.href));
    expect(allHrefs).not.toContain('/company/wallboard');
  });

  it('WORKER sidebar does NOT contain KORA Wallboard', () => {
    const groups = buildNavGroups('WORKER');
    const allHrefs = groups.flatMap(g => g.items.map(i => i.href));
    expect(allHrefs).not.toContain('/company/wallboard');
  });

  it('KORA_ADMIN admin sidebar does NOT contain /company/wallboard', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const allHrefs = groups.flatMap(g => g.items.map(i => i.href));
    expect(allHrefs).not.toContain('/company/wallboard');
  });
});

// --- 16: COMPANY_VIEWER not reintroduced in provisioning -------------------

describe('B143 -- COMPANY_VIEWER rimosso, B171 -- CompanyUserProvisioningPanel eliminato', () => {
  it('B171 — app/admin/company-users/_components/CompanyUserProvisioningPanel.tsx rimosso', () => {
    // B171: company-users Gen 1 folder deleted (0 external uses).
    expect(fileExists('app/admin/company-users/_components/CompanyUserProvisioningPanel.tsx')).toBe(false);
  });

  it('wallboard page does not render COMPANY_VIEWER as active select option', () => {
    const activeOptionIdx = wallboardPage.indexOf('value="COMPANY_VIEWER"');
    expect(activeOptionIdx).toBe(-1);
  });
});

// --- 17-18: No synthetic demo data fallback --------------------------------

describe('B119 -- No synthetic demo data fallback', () => {
  it('WallboardClient does not hardcode OP-001 (Meridiana tenant code)', () => {
    expect(wallboardClient).not.toContain('OP-001');
  });

  it('WallboardClient does not hardcode Meridiana as fallback company name', () => {
    expect(wallboardClient).not.toContain('Meridiana');
  });
});

// --- 19: Canonical privacy footer ------------------------------------------

describe('B119 -- Canonical privacy footer', () => {
  it('WallboardClient has data-testid="wallboard-privacy-footer"', () => {
    expect(wallboardClient).toContain('data-testid="wallboard-privacy-footer"');
  });

  it('wallboard privacy footer contains canonical KORA privacy statement', () => {
    expect(wallboardClient).toContain('KORA misura');
    expect(wallboardClient).toContain('non valuta i singoli lavoratori');
    expect(wallboardClient).toContain('organizzazione');
  });

  it('wallboard privacy footer states only aggregate data is shown', () => {
    expect(wallboardClient).toContain('solo dati aggregati');
  });
});

// --- B120: Macroblocchi section -------------------------------------------
// B120 adds macroblocchi (REACH, QUALITY, EQUITY, BTI) to the wallboard.

describe('B120 -- Macroblocchi section', () => {
  it('WallboardClient has data-testid="wallboard-macroblocks-section"', () => {
    expect(wallboardClient).toContain('data-testid="wallboard-macroblocks-section"');
  });

  it('WallboardClient renders all 4 macroblock cards with testids', () => {
    expect(wallboardClient).toContain('data-testid={`wallboard-macroblock-${code.toLowerCase()}`}');
  });

  it('WallboardClient MACROBLOCK_ORDER contains all 4 codes', () => {
    expect(wallboardClient).toContain("'REACH'");
    expect(wallboardClient).toContain("'QUALITY'");
    expect(wallboardClient).toContain("'EQUITY'");
    expect(wallboardClient).toContain("'BTI'");
  });

  it('WallboardClient macroblocchi section shows weight for each macroblock', () => {
    expect(wallboardClient).toContain('Peso:');
  });

  it('WallboardClient macroblocchi section shows score from API if available', () => {
    expect(wallboardClient).toContain('mbRow?.score');
  });

  it('WallboardClient macroblocchi section shows honest empty state when score not available', () => {
    expect(wallboardClient).toContain('Dato disponibile dopo scoring');
  });

  it('workspace API SELECT now includes macroblocks column', () => {
    const workspaceRoute = readFile('app/api/company/workspace/route.ts');
    expect(workspaceRoute).toContain('macroblocks');
  });

  it('workspace API koraIndexSummary includes macroblocks field', () => {
    const workspaceRoute = readFile('app/api/company/workspace/route.ts');
    // Must be in the summary object, not just the select
    const summaryBlock = workspaceRoute.slice(
      workspaceRoute.indexOf('koraIndexSummary = ki ?'),
      workspaceRoute.indexOf('} : null;'),
    );
    expect(summaryBlock).toContain('macroblocks');
  });

  it('WallboardClient WorkspaceData type includes macroblocks field', () => {
    expect(wallboardClient).toContain('macroblocks');
    expect(wallboardClient).toContain('WallboardMacroblock');
  });

  it('macroblocchi section does not expose individual worker data', () => {
    const macroblockSection = wallboardClient.slice(
      wallboardClient.indexOf('wallboard-macroblocks-section'),
      wallboardClient.indexOf('wallboard-pillars-section'),
    );
    expect(macroblockSection).not.toContain('worker_id');
    expect(macroblockSection).not.toContain('workerEmail');
    expect(macroblockSection).not.toContain('private_note');
  });
});

// --- 20: Scoring not modified ----------------------------------------------

describe('B119 -- Scoring not modified', () => {
  it('methodology-config still has getMacroblockWeights (not removed)', () => {
    expect(methodologyConfig).toContain('getMacroblockWeights');
  });

  it('KORA Index still has exactly 10 components', () => {
    const koraConstants = readFile('lib/constants/kora.ts');
    expect(koraConstants).toContain("KORA_INDEX_COMPONENTS = ['AR', 'MAR', 'NI', 'WB', 'PC', 'PB', 'EQ', 'VR', 'CO', 'CS']");
  });

  it('WallboardClient does not reference scoring formula internals', () => {
    expect(wallboardClient).not.toContain('computeScore');
    expect(wallboardClient).not.toContain('IU_formula');
    expect(wallboardClient).not.toContain('AGF');
  });
});
