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

// ── 2. P1 FIX — /company/ingestion: live path shows boundary state ────────────

describe('B106 P1 — ingestion page: live users see operator boundary, not Meridiana data', () => {
  const ingestion = read('app/company/ingestion/page.tsx');

  it('ingestion page imports useCompanySession', () => {
    const imports = ingestion.split('\n').filter((l) => l.trim().startsWith('import ')).join('\n');
    expect(imports).toContain('useCompanySession');
  });

  it('ingestion page uses isLive flag', () => {
    expect(ingestion).toContain('isLive');
    expect(ingestion).toContain('const { isLive');
  });

  it('live branch returns early without demo data', () => {
    // isLive block must return before the demo data rows render
    expect(ingestion).toContain('if (isLive)');
    // Live branch renders OperatorToolBoundary, not the data rows
    const liveGuardIndex = ingestion.indexOf('if (isLive)');
    const liveBlock = ingestion.slice(liveGuardIndex).split('return (')[1]?.split('};')[0] ?? '';
    expect(liveBlock).toContain('OperatorToolBoundary');
    expect(liveBlock).toContain('Torna al Workspace');
  });

  it('demo flow banner JSX is only rendered in the demo branch (after isLive guard)', () => {
    // The JSX tag <DemoFlowBanner must appear after the if (isLive) { return ... } block
    const liveGuardIndex  = ingestion.indexOf('if (isLive)');
    const demoFlowJsxIndex = ingestion.indexOf('<DemoFlowBanner');
    expect(demoFlowJsxIndex).toBeGreaterThan(liveGuardIndex);
  });

  it('live branch link points to /company/workspace (not /admin)', () => {
    const liveGuardIndex = ingestion.indexOf('if (isLive)');
    const liveBlock = ingestion.slice(liveGuardIndex).split('return (')[1]?.split('};')[0] ?? '';
    expect(liveBlock).toContain('/company/workspace');
    expect(liveBlock).not.toContain('/admin');
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
    it(`${relPath} — live-only: forceEnvironment hardcoded (no isLive ternary)`, () => {
      const src = read(relPath);
      expect(src).toContain("forceEnvironment: 'live'");
      expect(src).not.toContain('isLive ?');
    });
  }
});

// ── 7. Pure demo pages — labeled synthetic_demo_data: true ─────────────────────
// B133: opportunities and shared were converted from demo-labeled pages to live shells.
// Only uef-review remains as a pure demo page in /company/*.

describe('B106 — pure demo pages are correctly labeled', () => {
  it('app/company/uef-review/page.tsx — carries demo label', () => {
    if (!exists('app/company/uef-review/page.tsx')) return;
    expect(read('app/company/uef-review/page.tsx')).toContain('synthetic_demo_data');
  });
});

describe('B106 + B133 — opportunities and shared are now live shells (no synthetic_demo_data)', () => {
  it('app/company/opportunities/page.tsx — no synthetic_demo_data (B133 converted to live shell)', () => {
    if (!exists('app/company/opportunities/page.tsx')) return;
    expect(read('app/company/opportunities/page.tsx')).not.toContain('synthetic_demo_data');
    // B137: useCompanySession no longer needed in locked shells — guard is in server layout.
    expect(read('app/company/opportunities/page.tsx')).not.toContain('getCurrentDemoUser');
    expect(read('app/company/opportunities/page.tsx')).toContain('non ancora attivo');
  });

  it('app/company/shared/page.tsx — B142-A Foundation Light demo (has synthetic_demo_data)', () => {
    // B142-A promoted shared from locked shell to Foundation Light demo.
    // It now carries synthetic_demo_data: true and KORA Space content.
    if (!exists('app/company/shared/page.tsx')) return;
    expect(read('app/company/shared/page.tsx')).toContain('synthetic_demo_data: true');
    expect(read('app/company/shared/page.tsx')).toContain('KORA Space');
    expect(read('app/company/shared/page.tsx')).not.toContain('getCurrentDemoUser');
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
