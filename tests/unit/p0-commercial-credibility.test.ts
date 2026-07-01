/**
 * P0 Commercial Credibility Sprint — Structural tests
 *
 * Verifies that the four P0 commercial gaps identified in the Founder Audit are addressed:
 *   P0-1  KORA Contribution Foundation Light fallback (not empty shell)
 *   P0-2  KORA Index historical trend API + panel
 *   P0-3  KORA Index naming alignment (v3 canonical, EQW/EQS not EQ)
 *   P0-4  KORA Space commercial credibility (no embarrassing synthetic labels)
 *
 * All tests are pure file-system checks — no runtime, no DB, no network.
 *
 * Constraint reminders (verified by test):
 *   - No KORA Index formula or weight changes
 *   - No methodology-config.json formula changes
 *   - No migrations applied
 *   - No tenant output values changed intentionally
 *   - Contribution remains companion indicator (not KORA Index component)
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

// ── P0-1: KORA Contribution Foundation Light fallback ─────────────────────────

describe('P0-1 — Contribution Foundation Light fallback', () => {
  const contribPage = read('app/company/contribution/page.tsx');

  it('Foundation Light path uses getSummaryV2 (not just empty shell)', () => {
    expect(contribPage).toContain('getSummaryV2');
    expect(contribPage).toContain('koraContributionService');
  });

  it('FL preview has a testid (not hidden or dead)', () => {
    expect(contribPage).toContain('contribution-foundation-light-preview');
  });

  it('FL preview does NOT say "modulo non ancora disponibile" (old dead shell)', () => {
    // The old shell had this text — it must be gone
    expect(contribPage).not.toContain('modulo non ancora disponibile per questo tenant');
  });

  it('FL preview does NOT say "Disponibile per tenant Pilot+ (production_ready = true)"', () => {
    // The old dead shell had this text — it should no longer appear standalone
    expect(contribPage).not.toContain('Disponibile per tenant Pilot+ (production_ready = true)');
  });

  it('FL preview is labeled PRE-PILOT PREVIEW', () => {
    expect(contribPage).toContain('PRE-PILOT PREVIEW');
  });

  it('FL preview declares synthetic/demo data', () => {
    // Must be honest about data source
    expect(contribPage).toContain('sintetici');
  });

  it('Pilot+ live path remains intact (isPilot conditional)', () => {
    expect(contribPage).toContain('isPilot');
    expect(contribPage).toContain('contribution-live-data');
    expect(contribPage).toContain('contribution-section-promoter');
    expect(contribPage).toContain('contribution-section-origin');
  });

  it('Contribution is labeled as companion indicator (not KORA Index component)', () => {
    expect(contribPage).toContain('Indicatore Companion');
    expect(contribPage).toContain('Non componente KORA Index');
  });

  it('Contribution methodology notice is non-suppressible', () => {
    expect(contribPage).toContain('contribution-methodology-notice');
  });

  it('KoraContributionService getSummaryV2 exists', () => {
    const svc = read('services/kora-contribution/KoraContributionService.ts');
    expect(svc).toContain('getSummaryV2');
  });

  it('getSummaryV2 uses collective initiatives seed (not empty)', () => {
    const svc = read('services/kora-contribution/KoraContributionService.ts');
    expect(svc).toContain('filterInitiativesByScenario');
    expect(svc).toContain('kora_contribution_relevant');
    expect(svc).toContain('computeProvisionalScore');
  });

  it('FL preview shows next steps for activating live path', () => {
    expect(contribPage).toContain('Prossimi passi');
  });

  it('Contribution is never merged into KORA Index (no is_kora_index_component: true)', () => {
    const svc = read('services/kora-contribution/KoraContributionService.ts');
    expect(svc).toContain('is_kora_index_component: false');
    expect(svc).not.toContain('is_kora_index_component: true');
  });
});

// ── P0-2: KORA Index historical trend ─────────────────────────────────────────

describe('P0-2 — KORA Index historical trend', () => {
  it('history API route exists', () => {
    expect(exists('app/api/company/kora-index/history/route.ts')).toBe(true);
  });

  const historyRoute = read('app/api/company/kora-index/history/route.ts');

  it('history API reads tenant from authenticated session (never from query params)', () => {
    expect(historyRoute).toContain('requireCompanyUser');
    // Tenant derived from session destructuring: const { tenantId } = auth
    expect(historyRoute).toContain('const { tenantId } = auth');
    // Must NOT accept tenantId from query/body
    expect(historyRoute).not.toContain('searchParams.get(\'tenantId\')');
    expect(historyRoute).not.toContain('body.tenantId');
  });

  it('history API queries kora_index_result table', () => {
    expect(historyRoute).toContain('kora_index_result');
  });

  it('history API orders by reporting_period', () => {
    expect(historyRoute).toContain('reporting_period');
    expect(historyRoute).toContain('ascending');
  });

  it('history API returns period_count field', () => {
    expect(historyRoute).toContain('period_count');
  });

  it('history API returns has_trend flag', () => {
    expect(historyRoute).toContain('has_trend');
  });

  it('history API returns first_period flag', () => {
    expect(historyRoute).toContain('first_period');
  });

  it('history API response includes delta vs previous period', () => {
    expect(historyRoute).toContain('delta');
  });

  it('history API uses analytics schema (Supabase multi-schema)', () => {
    expect(historyRoute).toContain('.schema(\'analytics\')');
  });

  it('history panel is integrated in company workspace', () => {
    const workspace = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');
    expect(workspace).toContain('kora-index/history');
    expect(workspace).toContain('Storico KORA Index');
    expect(workspace).toContain('kora-history-no-data');
    expect(workspace).toContain('kora-history-first-period');
    expect(workspace).toContain('kora-history-trend');
  });

  it('history panel does not invent fake live data (fetches from API, not hardcoded)', () => {
    const workspace = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');
    expect(workspace).toContain("fetch('/api/company/kora-index/history'");
    // Must not hard-code period values
    expect(workspace).not.toContain('reporting_period: \'2025');
    expect(workspace).not.toContain('kora_index_value: 65');
  });

  it('history panel shows "first period" message when only one period exists', () => {
    const workspace = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');
    expect(workspace).toContain('Primo periodo misurato');
  });

  it('history panel methodology note references v3', () => {
    const route = read('app/api/company/kora-index/history/route.ts');
    expect(route).toContain('KORA Index v3');
  });

  // Regression test for the KL-24 bugfix: safeguard_status lives on
  // analytics.kora_index_result itself, never on analytics.activation_result.
  // Selecting it inside the activation_result embed caused a real Postgres
  // "column does not exist" error → the route's own `if (error)` branch
  // returned 500 for every request, even with valid auth and existing data.
  it('history API selects safeguard_status as a top-level kora_index_result column, not nested under the activation_result embed', () => {
    const selectStart = historyRoute.indexOf('.select(`');
    const selectBlock = historyRoute.slice(selectStart, historyRoute.indexOf('`)', selectStart));
    expect(selectBlock).toMatch(/^\s*safeguard_status,/m);

    const activationEmbedMatch = selectBlock.match(/activation_result:activation_result_id\s*\(([^)]*)\)/);
    expect(activationEmbedMatch).not.toBeNull();
    expect(activationEmbedMatch?.[1] ?? '').not.toContain('safeguard_status');
  });

  it('history API maps safeguard_status from the row itself, not from the activation_result embed', () => {
    expect(historyRoute).toContain('row.safeguard_status');
    expect(historyRoute).not.toContain('actResult?.safeguard_status');
  });
});

// ── P0-3: Naming alignment ────────────────────────────────────────────────────

describe('P0-3 — KORA Index naming alignment', () => {
  it('CLAUDE.md §5 component table uses EVQ (not NI) for Normalized Intensity', () => {
    const claude = read('CLAUDE.md');
    expect(claude).toContain('`EVQ`');
    expect(claude).toContain('`INT`');
    expect(claude).toContain('`CONT`');
  });

  it('CLAUDE.md §5 component table uses EQW and EQS (not generic EQ alone)', () => {
    const claude = read('CLAUDE.md');
    expect(claude).toContain('`EQW`');
    expect(claude).toContain('`EQS`');
  });

  it('CLAUDE.md §5 macroblock weights use EVQ/INT/CONT (not NI/VR/CO)', () => {
    const claude = read('CLAUDE.md');
    // New macroblock list should use canonical names
    expect(claude).toContain('EVQ');
    expect(claude).toContain('INT');
    expect(claude).toContain('CONT');
  });

  it('CLAUDE.md §5 macroblock list uses EQW/EQS (not EQ as aggregate)', () => {
    const claude = read('CLAUDE.md');
    expect(claude).toContain('EQW');
    expect(claude).toContain('EQS');
  });

  it('Workspace macroblock summary uses EVQ/INT/CONT for Quality (not NI/VR/CO)', () => {
    const workspace = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');
    expect(workspace).toContain('EVQ + INT + CONT');
    expect(workspace).not.toContain('NI + VR + CO');
  });

  it('Workspace macroblock summary uses EQW/EQS for Equity (not generic EQ)', () => {
    const workspace = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');
    expect(workspace).toContain('EQW + EQS + PC + PB');
    expect(workspace).not.toContain('WB + PC + PB + EQ');
  });

  it('Contribution page methodology notice uses KORA Index v3 label', () => {
    const contrib = read('app/company/contribution/page.tsx');
    expect(contrib).toContain('KORA Index™ v3');
  });

  it('Contribution page does not show "KORA Index v2.0" in public-facing text', () => {
    const contrib = read('app/company/contribution/page.tsx');
    // Check that the methodology notice doesn't output "KORA Index v2.0" directly
    expect(contrib).not.toContain('"KORA Index v2.0"');
    expect(contrib).not.toContain("'KORA Index v2.0'");
  });

  it('History panel references KORA Index v3 in methodology note', () => {
    const route = read('app/api/company/kora-index/history/route.ts');
    expect(route).toContain('KORA Index v3');
  });

  it('KORA Index formula macroblock structure remains unchanged', () => {
    const engine = read('lib/kora-engine/kora-index-engine.ts');
    // KORA Index v3 macroblock names must still be present
    expect(engine).toContain('REACH');
    expect(engine).toContain('QUALITY');
    expect(engine).toContain('EQUITY');
    expect(engine).toContain('BTI');
    // IU formula factors are in the pipeline, verified by regression test above
  });

  it('Methodology config formula weights remain unchanged', () => {
    const config = JSON.parse(read('data/methodology/methodology-config.json'));
    // Core macroblock weights must not have changed
    expect(config.kora_index_v3.macroblocks.REACH.weight).toBe(0.25);
    expect(config.kora_index_v3.macroblocks.QUALITY.weight).toBe(0.30);
    expect(config.kora_index_v3.macroblocks.EQUITY.weight).toBe(0.25);
    expect(config.kora_index_v3.macroblocks.BTI.weight).toBe(0.20);
  });
});

// ── P0-4: KORA Space commercial credibility ───────────────────────────────────

describe('P0-4 — KORA Space commercial credibility', () => {
  const commonsPage = read('app/commons/page.tsx');

  it('Public commons page has pilot preview banner (not "COMMONS PREVIEW")', () => {
    expect(commonsPage).toContain('commons-pilot-preview-banner');
    // Old embarrassing label must be gone
    expect(commonsPage).not.toContain('>COMMONS PREVIEW<');
  });

  it('Public commons page uses "KORA Space · Pilot Preview" not "COMMONS PREVIEW"', () => {
    expect(commonsPage).toContain('KORA Space · Pilot Preview');
  });

  it('Network stats no longer says "NETWORK PREVIEW"', () => {
    expect(commonsPage).not.toContain('NETWORK PREVIEW');
  });

  it('Commons page is honest about synthetic data (Italian label)', () => {
    expect(commonsPage).toContain('sintetici');
  });

  it('Commons page does not claim real booking/scoring integration', () => {
    // The page must not claim live scoring without the "Nessun" (no) qualifier
    // A header comment saying "Nessun IU generato" is fine — a claim that IU ARE generated is not
    expect(commonsPage).not.toContain('IU vengono generati da questa pagina');
    // Must not claim live HRIS/LMS integration on the public page
    expect(commonsPage).not.toContain('integrazione live');
    expect(commonsPage).not.toContain('live_integration');
  });

  it('CTA on commons page redirects to /company/commons (real KORA Space) not /commons/publish', () => {
    expect(commonsPage).toContain('/company/commons');
  });

  it('Commons "next activation layer" panel exists', () => {
    expect(commonsPage).toContain('commons-next-activation-layer');
  });

  it('Commons page no longer has "nessuna persistenza in Foundation Light" as CTA text', () => {
    // This was in the old bottom CTA — it should not be in the main CTA text
    expect(commonsPage).not.toContain('PREVIEW — nessuna persistenza in Foundation Light');
  });

  it('Company KORA Space (/company/commons) reads from real DB (not synthetic)', () => {
    const companyCommons = read('app/company/commons/page.tsx');
    expect(companyCommons).toContain("schema('commons')");
    expect(companyCommons).toContain("from('post')");
    expect(companyCommons).not.toContain('commonsService');
  });

  it('Worker KORA Commons (/worker/commons) reads from real DB (not synthetic)', () => {
    const workerCommons = read('app/worker/commons/page.tsx');
    expect(workerCommons).toContain("schema('commons')");
    expect(workerCommons).toContain("from('post')");
    expect(workerCommons).not.toContain('commonsService');
  });
});

// ── Regression guards ─────────────────────────────────────────────────────────

describe('Regression — constraints from sprint', () => {
  it('Migration directory contains expected files (001–028 + 030 + 031; 029 quarantined)', () => {
    // Gate 2.3: migration 030 (UEF admin access hardening) + 031 (PUBLIC EXECUTE hardening) added.
    // 029 remains quarantined in supabase/rollback/ — not in migrations/.
    const { readdirSync } = require('fs');
    const migFiles = readdirSync(resolve(ROOT, 'supabase/migrations'))
      .filter((f: string) => f.endsWith('.sql'))
      .sort();
    const lastMig = migFiles[migFiles.length - 1];
    const migNumber = parseInt(lastMig.split('_')[0], 10);
    expect(migNumber).toBeLessThanOrEqual(31);
    expect(migFiles.length).toBe(30); // 001–028 + 030 + 031 (029 quarantined)
  });

  it('Existing Gate 2 external review doc still exists', () => {
    expect(exists('docs/27-gate-2-cto-architecture-review-pack.md')).toBe(true);
  });

  it('Methodology config calibration_status is unchanged', () => {
    const config = JSON.parse(read('data/methodology/methodology-config.json'));
    expect(config.calibration_status).toBe('pre_empirical_calibration');
  });

  it('Methodology config safeguard thresholds are unchanged', () => {
    const config = JSON.parse(read('data/methodology/methodology-config.json'));
    expect(config.safeguard_thresholds.CLEAR.AR).toBe(0.40);
    expect(config.safeguard_thresholds.CLEAR.MAR).toBe(0.30);
  });

  it('IU formula factors (NM, BC, CQ, EV, CF, AGF) still present in run-kora-pipeline', () => {
    const pipeline = read('lib/kora-engine/run-kora-pipeline.ts');
    expect(pipeline).toContain('AGF');
    expect(pipeline).toContain('NM');
  });

  it('Contribution service still exports koraContributionService singleton', () => {
    const svc = read('services/kora-contribution/KoraContributionService.ts');
    expect(svc).toContain('export const koraContributionService');
  });

  it('Company workspace still imports DataSubmissionSection', () => {
    const ws = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');
    expect(ws).toContain('DataSubmissionSection');
  });

  it('Privacy boundary intact: company contribution page requires company user auth', () => {
    const contrib = read('app/company/contribution/page.tsx');
    expect(contrib).toContain('requireCompanyUser');
  });

  it('History route never exposes individual worker data', () => {
    const historyRoute = read('app/api/company/kora-index/history/route.ts');
    // Must not SELECT individual worker columns (comments mentioning them for exclusion are fine)
    expect(historyRoute).not.toContain("'worker_id'");
    expect(historyRoute).not.toContain("'pseudonym_id'");
    expect(historyRoute).not.toContain("'worker_pib'");
    // Must not join into worker-level tables
    expect(historyRoute).not.toContain('from(\'worker_');
    expect(historyRoute).not.toContain('from(\'pib_');
  });
});
