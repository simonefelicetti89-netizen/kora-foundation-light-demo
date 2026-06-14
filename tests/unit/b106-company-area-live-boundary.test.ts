/**
 * B106 — Company Area Live Boundary Audit & Maturity
 *
 * Verifica che tutte le route company abbiano un boundary chiaro tra live e demo.
 * Legge file sorgente — nessuna chiamata live a Supabase.
 *
 * Invarianti:
 * - nessuna route company mostra dati sintetici demo a un utente live senza label
 * - il feedback demo di Meridiana non è esposto agli utenti live in /company/status
 * - /company/ingestion e /company/data distinguono live da demo
 * - il fallback 'meridiana-group' non appare nel branch live di kora-index
 * - le route live API usano tenant da sessione, mai da query params
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

// ── 1. B130: /company/status is now live-only; demo moved to /demo/company/status ─

describe('B130 — status: live page has no demo services, demo page has getDemoFeedback', () => {
  const livePage  = read('app/company/status/page.tsx');
  const demoPage  = read('app/demo/company/status/page.tsx');

  it('live page does not call getDemoFeedback', () => {
    expect(livePage).not.toContain('getDemoFeedback');
  });

  it('live page does not import SubmissionFeedbackPanel', () => {
    expect(livePage).not.toContain('SubmissionFeedbackPanel');
  });

  it('live page does not import workerProvisioningService', () => {
    expect(livePage).not.toContain('workerProvisioningService');
  });

  it('live page does not contain meridiana (case-insensitive)', () => {
    expect(livePage.toLowerCase()).not.toContain('meridiana');
  });

  it('live page does not contain isLive ? (dual-path ternary)', () => {
    expect(livePage).not.toContain('isLive ?');
  });

  it('live users see submission count without demo company feedback', () => {
    expect(livePage).toContain('submissions.length > 0');
    expect(livePage).toContain('submissions.length === 0');
  });

  it('live page imports useCompanySession (still needs session state)', () => {
    expect(livePage).toContain('useCompanySession');
  });

  it('demo page has getDemoFeedback (moved here from live page)', () => {
    expect(demoPage).toContain('getDemoFeedback');
  });

  it('demo page has workerProvisioningService (demo workforce data)', () => {
    expect(demoPage).toContain('workerProvisioningService');
  });

  it('demo page has meridiana-group as fallback', () => {
    expect(demoPage).toContain("'meridiana-group'");
  });

  it('demo page does not import useCompanySession', () => {
    expect(demoPage).not.toContain('useCompanySession');
  });

  it('demo page does not contain isLive ? ternary', () => {
    expect(demoPage).not.toContain('isLive ?');
  });
});

// ── 2. B147 P2 — /company/ingestion: live-only boundary notice (demo branch removed) ─

describe('B147 P2 — ingestion page: live-only boundary notice, no demo branch', () => {
  const ingestion = read('app/company/ingestion/page.tsx');

  it('ingestion page imports useCompanySession', () => {
    const imports = ingestion.split('\n').filter((l) => l.trim().startsWith('import ')).join('\n');
    expect(imports).toContain('useCompanySession');
  });

  it('ingestion page does NOT use isLive flag (demo branch removed — page is live-only)', () => {
    // B147 P2: demo branch eliminated. No isLive ternary needed — the page always shows
    // the live boundary notice. The server layout's requireCompanyUser is the only guard.
    expect(ingestion).not.toContain('isLive');
    expect(ingestion).not.toContain('if (isLive)');
  });

  it('ingestion page has no DemoFlowBanner (demo branch removed)', () => {
    expect(ingestion).not.toContain('DemoFlowBanner');
    expect(ingestion).not.toContain('ingestionPipelineService');
  });

  it('ingestion page has no synthetic_demo_data label (live-only page)', () => {
    expect(ingestion).not.toContain('synthetic_demo_data');
  });

  it('ingestion renders OperatorToolBoundary and links to /company/workspace', () => {
    expect(ingestion).toContain('OperatorToolBoundary');
    expect(ingestion).toContain('/company/workspace');
    expect(ingestion).not.toContain('/admin');
  });
});

// ── 3. P1 FIX — /company/data: live path shows operator boundary state ─────────

describe('B106 P1 — data page: live users see operator boundary, not Meridiana data', () => {
  const data = read('app/company/data/page.tsx');

  it('data page imports useCompanySession', () => {
    const imports = data.split('\n').filter((l) => l.trim().startsWith('import ')).join('\n');
    expect(imports).toContain('useCompanySession');
  });

  it('data page uses isLive flag', () => {
    expect(data).toContain('isLive');
    expect(data).toContain('const { isLive');
  });

  it('live-only page: no demo branch, live content contains operator boundary', () => {
    // B144: page is fully live-only — demo branch removed. Guard is now if (!isLive).
    expect(data).not.toContain('getCurrentDemoUser');
    expect(data.toLowerCase()).not.toContain('meridiana');
    expect(data).not.toContain('if (isLive)');
    expect(data).toContain('if (!isLive)');
    expect(data).toContain('Elaborazione gestita da KORA Operator');
    expect(data).toContain('Torna al Workspace');
  });

  it('file does not show synthetic_demo_data badge', () => {
    // B144: demo branch removed entirely — no synthetic_demo_data anywhere in file.
    expect(data).not.toContain('synthetic_demo_data');
  });
});

// ── 4. P2 FIX — /company/kora-index: meridiana hardcoded removed from live branch ─

describe('B106 P2 — kora-index: no meridiana-group hardcoded in live branch', () => {
  const koraIndex = read('app/company/kora-index/page.tsx');

  it('live branch uses liveId ?? empty string (not meridiana-group)', () => {
    // The live fallback must be '' or undefined, never 'meridiana-group'
    expect(koraIndex).toContain("liveId ?? ''");
    expect(koraIndex).not.toContain("liveId ?? 'meridiana-group'");
  });

  it('demo branch still has meridiana-group as fallback (correct)', () => {
    // B129 Fase 3: meridiana-group fallback now lives exclusively in the demo page.
    const demoPage = read('app/demo/company/kora-index/page.tsx');
    expect(demoPage).toContain("'meridiana-group'");
    // Live page must not contain it
    expect(koraIndex).not.toContain("'meridiana-group'");
  });
});

// ── 5. Live API routes — tenant isolation invariants ──────────────────────────

describe('B106 — live API routes tenant isolation', () => {
  it('/api/company/workspace never queries OP-001', () => {
    const api = read('app/api/company/workspace/route.ts');
    expect(api).not.toContain("'OP-001'");
    expect(api).not.toContain('meridiana');
  });

  it('/api/company/workspace tenantId from session, not URL', () => {
    const api = read('app/api/company/workspace/route.ts');
    expect(api).toContain('const { tenantId, koraRole } = authResult;');
    expect(api).not.toContain('searchParams.get(');
  });

  it('/api/company/workers/aggregate tenantId from session, not URL', () => {
    const api = read('app/api/company/workers/aggregate/route.ts');
    expect(api).toContain('const { tenantId } = auth;');
    expect(api).not.toContain('searchParams.get(');
  });

  it('/api/company/workers/aggregate returns only counts', () => {
    const api = read('app/api/company/workers/aggregate/route.ts');
    const returnBlock = api.split('return NextResponse.json').slice(-1)[0];
    expect(returnBlock).not.toContain('worker_ref:');
    expect(returnBlock).not.toContain('pseudonym_id:');
    expect(returnBlock).not.toContain('auth_user_id:');
  });

  it('/api/company/decision-pack requires company auth', () => {
    const dp = read('app/api/company/decision-pack/route.ts');
    expect(dp).toContain('requireCompanyUser');
    expect(dp).not.toContain("'OP-001'");
  });
});

// ── 6. Dual-path pages — live branch does not confuse synthetic company ────────

describe('B106 — all company intelligence pages are now live-only (B130 complete)', () => {
  // B130: all five pages migrated — no remaining dual-path pages

  const liveOnlyPages = [
    'app/company/activation/page.tsx',
    'app/company/pillars/page.tsx',
    'app/company/reports/page.tsx',
    'app/company/financial/page.tsx',
  ];

  for (const relPath of liveOnlyPages) {
    it(`${relPath} — live-only: no isLive ternary, no BoundaryBanner residue (B147 P1)`, () => {
      // B147 P1: BoundaryBanner, BoundaryBadge mode="LIVE", and forceEnvironment: 'live'
      // were dual-path-era signals. Server layout requireCompanyUser is the only guard needed.
      const src = read(relPath);
      expect(src).not.toContain('isLive ?');
      expect(src).not.toContain('BoundaryBanner');
      expect(src).not.toContain('isLive={true}');
    });
  }
});

// ── 7. Pure demo pages — labeled synthetic_demo_data: true ─────────────────────
// B133: opportunities and shared were converted from demo-labeled pages to live shells.
// Only uef-review remains as a pure demo page in /company/*.

describe('B106 — uef-review is a locked shell (B147 P2: demo queue removed)', () => {
  it('app/company/uef-review/page.tsx — locked shell: no synthetic_demo_data, no uefReviewService', () => {
    // B147 P2: UEF Review transformed from demo queue to a locked boundary shell.
    // The complex queue UI (uefReviewService, filters, DataLineagePreview) was an admin tool
    // incorrectly exposed to COMPANY_ADMIN. Now it is a clean boundary notice.
    if (!exists('app/company/uef-review/page.tsx')) return;
    const src = read('app/company/uef-review/page.tsx');
    expect(src).not.toContain('synthetic_demo_data');
    expect(src).not.toContain('uefReviewService');
    expect(src).not.toContain('DataLineagePreview');
    expect(src).toContain('Torna al Workspace');
    expect(src).toContain('UEF Review = KORA Admin only');
  });
});

describe('B106 + B133 — opportunities is a live shell (no synthetic_demo_data)', () => {
  it('app/company/opportunities/page.tsx — no synthetic_demo_data (B133 converted to live shell)', () => {
    if (!exists('app/company/opportunities/page.tsx')) return;
    expect(read('app/company/opportunities/page.tsx')).not.toContain('synthetic_demo_data');
    // B137: useCompanySession no longer needed in locked shells — guard is in server layout.
    expect(read('app/company/opportunities/page.tsx')).not.toContain('getCurrentDemoUser');
    expect(read('app/company/opportunities/page.tsx')).toContain('non ancora attivo');
  });

  it('app/company/shared does NOT exist (B147: vetrina sintetica rimossa)', () => {
    // B147: /company/shared (KORA_SPACE_ITEMS array hardcoded, synthetic_demo_data: true) smantellata.
    // La funzione KORA Space sopravvive in /company/commons (dati reali, migration 013).
    expect(exists('app/company/shared/page.tsx')).toBe(false);
  });

  it('app/company/commons is the live KORA Space function (has requireCompanyUser)', () => {
    const src = read('app/company/commons/page.tsx');
    expect(src).toContain('requireCompanyUser');
    expect(src).toContain("schema('commons')");
    expect(src).not.toContain('synthetic_demo_data');
  });
});

// ── 8. Static / retired pages — no data shown ────────────────────────────────────

describe('B106 — retired pages show boundary notice only', () => {
  it('/company/setup is a redirect/notice page (no data services)', () => {
    const setup = read('app/company/setup/page.tsx');
    expect(setup).not.toContain('ingestionSimulatorService');
    expect(setup).not.toContain('scoringSimulatorService');
    expect(setup).not.toContain('useCompanySession');
  });

  it('/company/workforce-baseline is a redirect/notice page (no data services)', () => {
    const wb = read('app/company/workforce-baseline/page.tsx');
    expect(wb).not.toContain('ingestionSimulatorService');
    expect(wb).not.toContain('scoringSimulatorService');
  });

  it('/company/scoring is a boundary notice page (no live data calls)', () => {
    const scoring = read('app/company/scoring/page.tsx');
    expect(scoring).not.toContain('useCompanySession');
    expect(scoring).not.toContain("from('kora_index_result')");
    expect(scoring).not.toContain('supabase');
  });
});

// ── 9. Workspace — correct live binding (B105 regression) ─────────────────────

describe('B106 — workspace live binding regression (B105)', () => {
  const view = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');

  it('workspace does not import FL_COMPANY_ID or meridiana', () => {
    expect(view).not.toContain('FL_COMPANY_ID');
    expect(view).not.toContain('meridiana-group');
  });

  it('workspace uses dynamic company name from tenant', () => {
    expect(view).toContain('tenant.companyName');
  });

  it('workspace shows tenantCode', () => {
    expect(view).toContain('tenant.tenantCode');
  });
});
