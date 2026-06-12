import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── B75-B: Live Company Workspace Completion — unit tests ─────────────────────
//
// These tests verify the contractual boundaries of the live workspace:
//   - companyName is resolved from analytics.tenant, never URL params
//   - tenantId is always from session JWT
//   - Workforce baseline form enforces N≥10
//   - Live eligibility endpoint returns aggregate counts only
//   - Intelligence layers return insufficient_data when inputs are missing
//   - Rule-based recommendations and board actions are generated correctly
//   - synthetic_demo_data is optional in lib/types (not a breaking field)
//   - No new DB schema, no new tables, no formula changes

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

// ── Task 1: companyName in CompanySessionProvider ──────────────────────────────

describe('Task 1 — Live company name from analytics.tenant', () => {

  it('CompanySessionProvider exposes companyName in context interface', () => {
    const src = read('app/company/_providers/CompanySessionProvider.tsx');
    expect(src).toContain('companyName: string | null');
    expect(src).toContain('company_name');
    // Must fetch from analytics.tenant schema using the session tenantId
    expect(src).toContain(".schema('analytics')");
    expect(src).toContain("from('tenant')");
    expect(src).toContain("select('company_name')");
    // tenantId used in the query must come from JWT (tid), never from URL
    expect(src).toContain('.eq(\'id\', tid)');
  });

  it('companyName is never sourced from URL params', () => {
    const src = read('app/company/_providers/CompanySessionProvider.tsx');
    expect(src).not.toContain("searchParams.get('company");
    expect(src).not.toContain("params.company");
    expect(src).not.toContain("query.company");
  });

  it('kora-index page uses liveCompanyName with fallback', () => {
    const src = read('app/company/kora-index/page.tsx');
    expect(src).toContain('liveCompanyName');
    // Fallback chain: liveCompanyName → tenant?.company_name → 'La tua organizzazione'
    expect(src).toContain("'La tua organizzazione'");
    expect(src).toContain('companyName: liveCompanyName');
  });

});

// ── Task 2: Workforce Baseline UI ─────────────────────────────────────────────

describe('Task 2 — Workforce Baseline UI form', () => {

  it('CompanyWorkspacePanel contains baseline form fields', () => {
    const src = read('app/admin/company-workspace/_components/CompanyWorkspacePanel.tsx');
    expect(src).toContain('baselineWorkers');
    expect(src).toContain('baselinePeriod');
    expect(src).toContain('baselineError');
    expect(src).toContain('baselineSuccess');
    expect(src).toContain('baselineLoading');
  });

  it('baseline form only renders when workforce baseline is missing', () => {
    const src = read('app/admin/company-workspace/_components/CompanyWorkspacePanel.tsx');
    expect(src).toContain('!w.workforce.exists');
    expect(src).toContain('Imposta Baseline Forza Lavoro');
  });

  it('baseline form has min=10 on worker count input', () => {
    const src = read('app/admin/company-workspace/_components/CompanyWorkspacePanel.tsx');
    expect(src).toContain('min={10}');
    expect(src).toContain('Il numero di lavoratori deve essere un intero ≥ 10.');
  });

  it('baseline form POSTs to /api/admin/workforce-baseline with tenantId from workspace', () => {
    const src = read('app/admin/company-workspace/_components/CompanyWorkspacePanel.tsx');
    expect(src).toContain("'/api/admin/workforce-baseline'");
    expect(src).toContain("method: 'POST'");
    expect(src).toContain('w.tenant.id');
  });

  it('baseline API enforces N≥10 and requires tenantId/reportingPeriod', () => {
    const src = read('app/api/admin/workforce-baseline/route.ts');
    expect(src).toContain('rawWorkers < 10');
    expect(src).toContain('status: 422');
    expect(src).toContain("'tenantId is required.'");
    expect(src).toContain("'reportingPeriod is required.'");
  });

  it('baseline API uses requireKoraAdmin — admin-only endpoint', () => {
    const src = read('app/api/admin/workforce-baseline/route.ts');
    expect(src).toContain('requireKoraAdmin');
    expect(src).not.toContain('requireCompanyUser');
  });

});

// ── Task 3: Live eligibility breakdown ────────────────────────────────────────

describe('Task 3 — Live eligibility endpoint returns aggregate counts only', () => {

  it('live-eligibility route exists and uses requireCompanyUser', () => {
    const src = read('app/api/company/live-eligibility/route.ts');
    expect(src).toContain('requireCompanyUser');
    expect(src).toContain('isKoraAuthError');
  });

  it('tenantId in live-eligibility is always from session JWT', () => {
    const src = read('app/api/company/live-eligibility/route.ts');
    expect(src).toContain('const { tenantId } = authResult');
    // Must NOT accept tenantId from query params
    expect(src).not.toContain("searchParams.get('tenantId')");
    expect(src).not.toContain("body.tenantId");
  });

  it('live-eligibility returns aggregate counts, not raw worker records', () => {
    const src = read('app/api/company/live-eligibility/route.ts');
    // Counts computed server-side, not raw rows returned to client
    expect(src).toContain('eligible');
    expect(src).toContain('limited');
    expect(src).toContain('blocked');
    // The select does NOT include pseudonym_id or worker_id
    expect(src).not.toContain('pseudonym_id');
    expect(src).not.toContain('worker_id');
    expect(src).not.toContain('worker_name');
  });

  it('live-eligibility exposes only LIFE program raw_name (not worker-identifying)', () => {
    const src = read('app/api/company/live-eligibility/route.ts');
    // raw_name is a program/event name, not a worker identifier
    expect(src).toContain('life_program_names');
    expect(src).toContain("primary_pillar === 'LIFE'");
    // The returned payload includes life_program_names but no worker PII
    expect(src).toContain('life_program_names: lifeProgramNames');
  });

  it('LiveEligibilityContext type is exported and consumed in kora-index page', () => {
    const routeSrc = read('app/api/company/live-eligibility/route.ts');
    expect(routeSrc).toContain('export type LiveEligibilityContext');

    const pageSrc = read('app/company/kora-index/page.tsx');
    expect(pageSrc).toContain("from '@/app/api/company/live-eligibility/route'");
    expect(pageSrc).toContain('LiveEligibilityContext');
  });

});

// ── Task 4 & 5: Live intelligence layers ──────────────────────────────────────

describe('Task 4 & 5 — Live intelligence layers compute on demand', () => {

  it('kora-index page imports all four intelligence services', () => {
    const src = read('app/company/kora-index/page.tsx');
    expect(src).toContain('lifeDiversityService');
    expect(src).toContain('careEconomyIntelligenceService');
    expect(src).toContain('equityAccessIntelligenceService');
    expect(src).toContain('evidenceReliabilityIntelligenceService');
  });

  it('equityAccess computes from aggregate for live (no separate fetch needed)', () => {
    const src = read('app/company/kora-index/page.tsx');
    // equityAccess uses equityAccessIntelligenceService.compute with aggregate
    expect(src).toContain('equityAccessIntelligenceService.compute(aggregate');
    // B129 Fase 3: live-only page passes visibleGroups=undefined directly (no ternary)
    expect(src).toContain('equityAccessIntelligenceService.compute(aggregate ?? null, eqValue, effectiveRole, undefined)');
  });

  it('liveCtx is fetched from /api/company/live-eligibility once period is known', () => {
    const src = read('app/company/kora-index/page.tsx');
    expect(src).toContain('/api/company/live-eligibility?period=');
    expect(src).toContain('reportingPeriodForLive');
    expect(src).toContain('setLiveCtx(d)');
    expect(src).toContain('fetchLiveCtx');
  });

  it('LIFE diversity uses computeFromProgramNames for live sessions', () => {
    const src = read('app/company/kora-index/page.tsx');
    expect(src).toContain('computeFromProgramNames');
    expect(src).toContain('liveCtx.life_program_names');
  });

  it('intelligence layers fall back to null/insufficient_data when liveCtx missing', () => {
    const src = read('app/company/kora-index/page.tsx');
    // B129 Fase 3: live-only page — liveCtx ? ... : null (no isLive ternary)
    expect(src).toContain('liveCtx ?');
    // eligibilityGate shows 0 counts when liveCtx not yet loaded
    expect(src).toContain('eligible_row_count: 0');
  });

});

// ── Task 5 & 6: Live recommendations and board actions ────────────────────────

describe('Task 5 & 6 — Live recommendations and board actions', () => {

  it('live-recommendations.ts exports generateLiveRecommendations', () => {
    const src = read('lib/live/live-recommendations.ts');
    expect(src).toContain('export function generateLiveRecommendations');
    expect(src).toContain('LiveRecommendationInputs');
  });

  it('LiveRecommendation is typed as BudgetToHumanImpactRecommendation (shape-compatible)', () => {
    const src = read('lib/live/live-recommendations.ts');
    expect(src).toContain("export type LiveRecommendation = BudgetToHumanImpactRecommendation");
    expect(src).toContain("from '@/lib/types'");
  });

  it('live recommendations are rule-based: FLAGGED → REACH rec, evidence risk → QUALITY rec', () => {
    const src = read('lib/live/live-recommendations.ts');
    expect(src).toContain("safeguardStatus === 'FLAGGED'");
    expect(src).toContain("target_macroblock: 'REACH'");
    expect(src).toContain("evidenceReliability?.evidenceRiskLevel === 'alta'");
    expect(src).toContain("target_macroblock: 'QUALITY'");
    expect(src).toContain("equityAccess?.accessRiskLevel === 'alta'");
    expect(src).toContain("target_macroblock: 'EQUITY'");
  });

  it('live recommendations make no AI calls and no causal claims in output text', () => {
    const src = read('lib/live/live-recommendations.ts');
    // No LLM imports
    expect(src).not.toContain('openai');
    expect(src).not.toContain('anthropic');
    // No network calls (fetch is forbidden — recommendations are pure rule-based)
    expect(src).not.toContain("await fetch(");
    // No causal claim strings in output (Italian UI copy must not imply causation)
    expect(src).not.toContain('will cause');
    expect(src).not.toContain('garantisce che il KORA Index');
    // The header comment says "no causal claims" — that is correct metadata, not a claim
    expect(src).toContain('no causal claims');
  });

  it('live-board-actions.ts exports generateLiveBoardActions with 3 actions', () => {
    const src = read('lib/live/live-board-actions.ts');
    expect(src).toContain('export function generateLiveBoardActions');
    expect(src).toContain('actions.slice(0, 3)');
    expect(src).toContain('LiveBoardAction');
  });

  it('kora-index page uses generateLiveRecommendations for live sessions', () => {
    const src = read('app/company/kora-index/page.tsx');
    // B129 Fase 3: live-only page uses live generators exclusively
    expect(src).toContain('generateLiveRecommendations');
    expect(src).toContain('generateLiveBoardActions');
    // Demo path (budgetToHumanImpactService) now in demo page only
    const demoSrc = read('app/demo/company/kora-index/page.tsx');
    expect(demoSrc).toContain('budgetToHumanImpactService.getRecommendations');
  });

});

// ── Task 7: Type contract — synthetic_demo_data optional ──────────────────────

describe('Task 7 — synthetic_demo_data is optional in lib/types', () => {

  it('synthetic_demo_data is optional in KoraIndexOutput and CompanyAggregateExtended', () => {
    const src = read('lib/types/index.ts');
    // The primary output types must have synthetic_demo_data as optional
    expect(src).toContain('synthetic_demo_data?: true');
    // At least two interfaces should have the optional form (KoraIndexOutput, CompanyAggregateExtended)
    const optionalCount = (src.match(/synthetic_demo_data\?:/g) ?? []).length;
    expect(optionalCount).toBeGreaterThanOrEqual(2);
  });

  it('lib/scoring-result no longer has stale Phase 2B migration comments', () => {
    const src = read('lib/scoring-result/index.ts');
    // These specific stale strings should be gone
    expect(src).not.toContain('Phase 2B task: make that field optional');
    expect(src).not.toContain('Phase 2B will return a properly mapped');
    expect(src).not.toContain('Phase 2B: implement full mapping after lib/types');
    expect(src).not.toContain('The live path currently returns null');
  });

  it('mapDbRowToScoringResult is implemented (not a stub)', () => {
    const src = read('lib/scoring-result/index.ts');
    expect(src).toContain('function mapDbRowToScoringResult');
    expect(src).toContain('mapDbRow(row, tenantId, scenarioId)');
    // Full implementation calls mapDbRow — not a comment-only stub
    expect(src).toContain("environment: 'live'");
  });

});

// ── Architectural invariants ───────────────────────────────────────────────────

describe('Architectural invariants — no schema changes, no formula changes', () => {

  it('live-recommendations.ts does not write to any DB or persist data', () => {
    const src = read('lib/live/live-recommendations.ts');
    expect(src).not.toContain('supabase');
    expect(src).not.toContain('getSupabase');
    expect(src).not.toContain('insert(');
    expect(src).not.toContain('update(');
    expect(src).not.toContain('upsert(');
  });

  it('live-board-actions.ts does not write to any DB or persist data', () => {
    const src = read('lib/live/live-board-actions.ts');
    expect(src).not.toContain('supabase');
    expect(src).not.toContain('insert(');
    expect(src).not.toContain('update(');
  });

  it('live-eligibility route does not expose PIB, worker_id, or individual IU records', () => {
    const src = read('app/api/company/live-eligibility/route.ts');
    expect(src).not.toContain('pib');
    expect(src).not.toContain('worker_id');
    expect(src).not.toContain('pseudonym_id');
    expect(src).not.toContain('personal_impact_balance');
  });

  it('IU formula invariant is documented in lib/types — formula shape is unchanged', () => {
    const src = read('lib/types/index.ts');
    // IU formula canonical comment: IU = NM × BC × CQ × EV × CF × AGF
    expect(src).toContain('IU = NM × BC × CQ × EV × CF × AGF');
    // AGF field is present in impact unit computation summary type
    expect(src).toContain('anti_gaming_factor_agf');
    expect(src).toContain('average_agf');
  });

  it('methodology-config v0.1 macroblock weights are still read from config, not hardcoded', () => {
    const src = read('lib/methodology-config/v0.1.ts');
    expect(src).toContain('getMacroblockWeights');
    expect(src).toContain('REACH');
    expect(src).toContain('QUALITY');
    expect(src).toContain('EQUITY');
    expect(src).toContain('BTI');
  });

  it('no new tables are created by B75-B (no CREATE TABLE or new schema files)', () => {
    // Verify that no B75-B specific migration files exist
    const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
    if (!fs.existsSync(migrationsDir)) return; // no migrations dir = Gate 2 not yet passed
    const files = fs.readdirSync(migrationsDir);
    const b75bFiles = files.filter((f) => f.includes('b75b') || f.includes('live_workspace'));
    expect(b75bFiles).toHaveLength(0);
  });

  it('KORA Contribution is not merged into KORA Index computation', () => {
    const src = read('app/company/kora-index/page.tsx');
    // Contribution must remain a companion indicator, not a component
    expect(src).not.toContain('koraContribution.value * weight');
    expect(src).not.toContain('koraContribution.score * weight');
  });

});
