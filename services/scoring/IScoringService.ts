// services/scoring/IScoringService.ts
//
// ── Scoring Path Contract ──────────────────────────────────────────────────────
//
// TWO scoring paths exist in KORA Foundation Light:
//
//   1. DEMO (DemoScoringAdapter → ScoringSimulatorService)
//      Reads pre-computed synthetic seed from data/synthetic/kora-index-outputs.json.
//      Authoritative for demo tenants. No computation — fast, deterministic.
//      Used by: company cockpit, kora-index page, scenario comparison.
//
//   2. LIVE (LiveScoringAdapter → lib/kora-engine/run-kora-pipeline.ts)
//      Runs the full 14-stage KORA computation engine on uploaded records.
//      This is the ONLY authoritative scoring engine for real (non-demo) tenants.
//      Used by: Pilot+ tenants with uploaded data via the guided upload flow.
//
// A third path, PREVIEW (PreviewScoringAdapter → DynamicScoringPreviewService,
// proxy macroblock estimates from live IU batch data), was retired in B-TRUTH
// Preview Scoring Retirement (2026-09-03): independently re-verified zero real
// runtime callers (its only real-ish consumer, ReportGeneratorService's Decision
// Pack preview section, was itself retired earlier), never wired into
// lib/scoring-result/index.ts's actual DEMO/LIVE dispatch despite being
// documented here, and owned no unique methodology — every computation was
// either an explicitly-labelled proxy approximation or direct reuse of
// activationSafeguardService.evaluate() / scoringSimulatorService.computeKoraIndexV3()
// (both unchanged, unaffected by this retirement). See
// tests/unit/b-truth-preview-scoring-retirement.test.ts.
//
// ── CANONICAL ENTRY POINT ─────────────────────────────────────────────────────
//
//   All application pages and components MUST consume scoring via:
//     lib/scoring-result/index.ts  →  useScoringResult()
//
//   That hook routes:
//     environment === 'demo'  →  ScoringSimulatorService (Path 1)
//     environment === 'live'  →  fetchLiveScoringResult (Path 2 via Supabase mapper)
//
//   NEVER import ScoringSimulatorService or run-kora-pipeline directly in
//   app/ routes or components. Bypassing lib/scoring-result breaks the
//   demo/live boundary guarantee.

export type ScoringPathMode = 'DEMO' | 'LIVE';

export interface IScoringService {
  /** Which scoring path this adapter implements. */
  readonly mode: ScoringPathMode;
  /** Human-readable identifier of the underlying data source. */
  readonly source: string;
  /** True only for the LIVE path (run-kora-pipeline). Demo and Preview are never authoritative. */
  readonly isAuthoritative: boolean;
}
