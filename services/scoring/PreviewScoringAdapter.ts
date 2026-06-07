// services/scoring/PreviewScoringAdapter.ts
//
// PREVIEW path adapter — wraps DynamicScoringPreviewService.
// Derives proxy macroblock estimates from live IU batch data.
// Outputs are approximations ("stima proxy") — not authoritative KORA Index scores.
//
// SINGLE CONSUMER: ReportGeneratorService, one method (Decision Pack preview section).
// Do not use as a substitute for the DEMO or LIVE scoring paths.
// Never call directly in app/ routes — use lib/scoring-result/index.ts.

import type { IScoringService, ScoringPathMode } from './IScoringService';
import { dynamicScoringPreviewService } from '@/services/dynamic-scoring/DynamicScoringPreviewService';

export class PreviewScoringAdapter implements IScoringService {
  readonly mode: ScoringPathMode = 'PREVIEW';
  readonly source = 'dynamic_iu_batch/proxy_estimates';
  readonly isAuthoritative = false;

  // Expose underlying service for its single consumer (ReportGeneratorService).
  // Prefer lib/scoring-result/useScoringResult() in application code.
  readonly underlying = dynamicScoringPreviewService;
}

export const previewScoringAdapter = new PreviewScoringAdapter();
