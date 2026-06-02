// lib/kora-engine/index.ts
// Barrel export for KORA Engine v0.1 — safe public API.
//
// Exports the full pipeline entry point and individual engine functions.
// Identity-scoped internals (reach-quality helpers, union-find) are NOT re-exported.
// Example runners are exported for demo UI and testing only.

// ── Pipeline entry point ──────────────────────────────────────────────────────
export { runKoraPipeline, KORA_PIPELINE_VERSION } from './run-kora-pipeline';

// ── Individual engines ────────────────────────────────────────────────────────
export { computeKoraIndex, KORA_INDEX_ENGINE_VERSION } from './kora-index-engine';
export { computeConfidence, CONFIDENCE_ENGINE_VERSION } from './confidence-engine';
export { buildExplainabilityTrace, EXPLAINABILITY_ENGINE_VERSION } from './explainability';
export { computeActivation, computeActivationFromRecords, ACTIVATION_ENGINE_VERSION } from './activation-engine';
export { computeBTI, computeBTIFromRecords, BTI_ENGINE_VERSION } from './bti-engine';
export { classifyEligibility, classifyEligibilityBatch } from './eligibility-gate';
export { mapPillar, mapPillarBatch, isRawUploadedRecord } from './pillar-mapping';
export { mapCareEconomySignal, mapCareEconomyBatch } from './care-economy-mapping';
export { assessBudgetEvidence, assessBudgetEvidenceBatch } from './budget-evidence';
export { computeReachQuality } from './reach-quality';

// ── B22: EQUITY Engine ───────────────────────────────────────────────────────
export { computeEquityScore, EQUITY_ENGINE_VERSION } from './equity-engine';

// ── B24: Reach Semantics ──────────────────────────────────────────────────────
export { computeReachSemantics, REACH_SEMANTICS_CAVEAT } from './reach-semantics';
export type { ReachSemanticsResult } from './reach-semantics';

// ── Examples (demo / testing only) ───────────────────────────────────────────
export {
  runKoraPipelineExamples,
  type KoraPipelineExampleResult,
  type PipelineAssertion,
} from './kora-pipeline-examples';
