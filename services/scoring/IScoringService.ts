// services/scoring/IScoringService.ts
//
// ── Scoring Path Contract ──────────────────────────────────────────────────────
//
// ONE scoring path exists in KORA Foundation Light:
//
//   LIVE (LiveScoringAdapter → lib/kora-engine/run-kora-pipeline.ts)
//   Runs the full 14-stage KORA computation engine on uploaded records.
//   This is the ONLY authoritative scoring engine — for real tenants and for
//   the environment === 'demo' preview toggle alike.
//   Used by: Pilot+ tenants with uploaded data via the guided upload flow.
//
// A second path, DEMO (DemoScoringAdapter → ScoringSimulatorService, reading
// pre-computed synthetic seed from data/synthetic/kora-index-outputs.json),
// was retired in CC-00 Final Scoring Canonicalization (2026-09-05) — the
// last B-TRUTH-owned synthetic scoring dependency (Master Plan §32:
// "DemoScoringAdapter · ScoringSimulatorService · demo-data · access-control
// | fine B-TRUTH | I9 = 0"). lib/scoring-result/index.ts's environment ===
// 'demo' branch now returns the same honest 'insufficient_data' status a
// real tenant sees before its first scoring run — no replacement simulator,
// no second scoring path. See tests/unit/cc00-final-scoring-canonicalization.test.ts.
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
// (both retired or unaffected — see this file's own DEMO retirement note above
// for computeKoraIndexV3's fate). See
// tests/unit/b-truth-preview-scoring-retirement.test.ts.
//
// ── CANONICAL ENTRY POINT ─────────────────────────────────────────────────────
//
//   All application pages and components MUST consume scoring via:
//     lib/scoring-result/index.ts  →  useScoringResult()
//
//   That hook routes:
//     environment === 'demo'  →  honest 'insufficient_data' (no computation)
//     environment === 'live'  →  fetchLiveScoringResult (via Supabase mapper)
//
//   NEVER import run-kora-pipeline directly in app/ routes or components.
//   Bypassing lib/scoring-result breaks the live boundary guarantee.

export type ScoringPathMode = 'DEMO' | 'LIVE';

export interface IScoringService {
  /** Which scoring path this adapter implements. */
  readonly mode: ScoringPathMode;
  /** Human-readable identifier of the underlying data source. */
  readonly source: string;
  /** True only for the LIVE path (run-kora-pipeline). Demo and Preview are never authoritative. */
  readonly isAuthoritative: boolean;
}
