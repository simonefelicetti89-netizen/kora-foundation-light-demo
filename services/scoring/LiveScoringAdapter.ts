// services/scoring/LiveScoringAdapter.ts
//
// LIVE path adapter — wraps lib/kora-engine/run-kora-pipeline.ts (KoraPipeline_v1.0).
// Runs the full 14-stage KORA computation on uploaded RawUploadedRecord[].
//
// This is the ONLY authoritative scoring engine for real (non-demo) tenants.
// Foundation Light v0.1: invoked via lib/scoring-result/index.ts when environment === 'live'.
// Pilot+ migration: replace the Supabase mapper stub in lib/live/ with calls to this adapter.
//
// Never call directly in app/ routes — use lib/scoring-result/index.ts.

import type { IScoringService, ScoringPathMode } from './IScoringService';
import { runKoraPipeline, KORA_PIPELINE_VERSION } from '@/lib/kora-engine/run-kora-pipeline';

export class LiveScoringAdapter implements IScoringService {
  readonly mode: ScoringPathMode = 'LIVE';
  readonly source: string = KORA_PIPELINE_VERSION;
  readonly isAuthoritative = true;

  // Expose the pipeline runner directly.
  // lib/scoring-result/index.ts routes to this via fetchLiveScoringResult.
  readonly run = runKoraPipeline;
}

export const liveScoringAdapter = new LiveScoringAdapter();
