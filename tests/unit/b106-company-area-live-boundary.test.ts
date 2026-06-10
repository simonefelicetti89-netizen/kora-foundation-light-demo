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

// ── 1. P0 FIX — /company/status: demo feedback gated behind !isLive ──────────

describe('B106 P0 — status page: demo feedback never shown to live users', () => {
  const status = read('app/company/status/page.tsx');

  it('getDemoFeedback is called inside !isLive branch', () => {
    // The ternary must gate the call: isLive ? <live notice> : <SubmissionFeedbackPanel>
    // Verify that getDemoFeedback is NOT in the live branch
    const lines = status.split('\n');
    const demoFeedbackLine = lines.findIndex((l) => l.includes('getDemoFeedback'));
    // The line must be inside an else/!isLive block, not unconditional
    // We verify by checking that 'isLive ?' appears in the surrounding block
    const surroundingLines = lines.slice(Math.max(0, demoFeedbackLine - 10), demoFeedbackLine + 5).join('\n');
    expect(surroundingLines).toContain('isLive ?');
    // The live branch must NOT call getDemoFeedback
    const beforeFeedbackLine = lines.slice(0, demoFeedbackLine).join('\n');
    const afterOpeningTernary = beforeFeedbackLine.split('isLive ?').pop() ?? '';
    // After 'isLive ?', the first alternative (true branch) must not include getDemoFeedback
    expect(afterOpeningTernary).not.toContain('getDemoFeedback');
  });

  it('SubmissionFeedbackPanel is rendered conditionally (not unconditionally)', () => {
    const lines = status.split('\n');
    const panelLine = lines.findIndex((l) => l.includes('<SubmissionFeedbackPanel'));
    expect(panelLine).toBeGreaterThan(-1);
    // It must be inside an isLive ternary block (surrounded by isLive conditional)
    const surroundingLines = lines.slice(Math.max(0, panelLine - 15), panelLine + 3).join('\n');
    expect(surroundingLines).toContain('isLive ?');
  });

  it('live users see submission count without demo company feedback', () => {
    // The live branch shows a plain message with submissions.length
    expect(status).toContain('submissions.length > 0');
    expect(status).toContain('submissions.length === 0');
  });

  it('status page uses useCompanySession for isLive detection', () => {
    expect(status).toContain('useCompanySession');
    expect(status).toContain('isLive');
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

  it('live branch returns before rendering synthetic demo data', () => {
    expect(data).toContain('if (isLive)');
    const liveGuardIndex = data.indexOf('if (isLive)');
    const liveBlock = data.slice(liveGuardIndex).split('return (')[1]?.split('};')[0] ?? '';
    expect(liveBlock).toContain('Elaborazione gestita da KORA Operator');
    expect(liveBlock).toContain('Torna al Workspace');
  });

  it('live block does not show synthetic_demo_data badge', () => {
    const liveGuardIndex = data.indexOf('if (isLive)');
    const liveBlock = data.slice(liveGuardIndex).split('return (')[1]?.split('};')[0] ?? '';
    expect(liveBlock).not.toContain('synthetic_demo_data');
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
    // Demo branch fallback is expected — meridiana is the canonical demo company
    expect(koraIndex).toContain("'meridiana-group'");
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

describe('B106 — dual-path pages do not show synthetic Meridiana data in live mode', () => {
  const pages = [
    'app/company/activation/page.tsx',
    'app/company/financial/page.tsx',
    'app/company/pillars/page.tsx',
    'app/company/reports/page.tsx',
  ];

  for (const relPath of pages) {
    it(`${relPath} — live path uses forceEnvironment:'live'`, () => {
      const src = read(relPath);
      expect(src).toContain("forceEnvironment: isLive ? 'live' : undefined");
    });

    it(`${relPath} — live path shows LIVE badge`, () => {
      const src = read(relPath);
      expect(src).toContain("isLive ? 'LIVE' : 'DEMO'");
    });
  }
});

// ── 7. Pure demo pages — labeled synthetic_demo_data: true ─────────────────────

describe('B106 — pure demo pages are correctly labeled', () => {
  const demoPages = [
    { path: 'app/company/uef-review/page.tsx',   label: 'synthetic_demo_data' },
    { path: 'app/company/opportunities/page.tsx', label: 'synthetic_demo_data' },
    { path: 'app/company/shared/page.tsx',        label: 'synthetic_demo_data' },
  ];

  for (const { path, label } of demoPages) {
    it(`${path} — carries demo label`, () => {
      if (!exists(path)) return; // skip if not yet built
      const src = read(path);
      expect(src).toContain(label);
    });
  }
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
