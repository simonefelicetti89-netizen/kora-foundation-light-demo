// services/scoring/IScoringService.ts
//
// ── Scoring Path Contract ──────────────────────────────────────────────────────
//
// THREE scoring paths exist in Foundation Light v0.1:
//
//   1. DEMO (DemoScoringAdapter → ScoringSimulatorService)
//      Reads pre-computed synthetic seed from data/synthetic/kora-index-outputs.json.
//      Authoritative for demo tenants. No computation — fast, deterministic.
//      Used by: company cockpit, kora-index page, scenario comparison.
//
//   2. PREVIEW (PreviewScoringAdapter → DynamicScoringPreviewService)
//      Derives proxy macroblock estimates from live IU batch data.
//      NOT a full scoring run — approximations only, labelled "stima proxy".
//      Used by: ReportGeneratorService (one method, Decision Pack preview section).
//      Do NOT use as a replacement for DEMO or LIVE paths.
//
//   3. LIVE (LiveScoringAdapter → lib/kora-engine/run-kora-pipeline.ts)
//      Runs the full 14-stage KORA computation engine on uploaded records.
//      This is the ONLY authoritative scoring engine for real (non-demo) tenants.
//      Used by: Pilot+ tenants with uploaded data via the guided upload flow.
//
// ── CANONICAL ENTRY POINT ─────────────────────────────────────────────────────
//
//   All application pages and components MUST consume scoring via:
//     lib/scoring-result/index.ts  →  useScoringResult()
//
//   That hook routes:
//     environment === 'demo'  →  ScoringSimulatorService (Path 1)
//     environment === 'live'  →  fetchLiveScoringResult (Path 3 via Supabase mapper)
//
//   NEVER import ScoringSimulatorService, DynamicScoringPreviewService,
//   or run-kora-pipeline directly in app/ routes or components.
//   Bypassing lib/scoring-result breaks the demo/live boundary guarantee.

export type ScoringPathMode = 'DEMO' | 'PREVIEW' | 'LIVE';

export interface IScoringService {
  /** Which scoring path this adapter implements. */
  readonly mode: ScoringPathMode;
  /** Human-readable identifier of the underlying data source. */
  readonly source: string;
  /** True only for the LIVE path (run-kora-pipeline). Demo and Preview are never authoritative. */
  readonly isAuthoritative: boolean;
}
