// services/scoring/DemoScoringAdapter.ts
//
// DEMO path adapter — wraps ScoringSimulatorService.
// Reads pre-computed scores from data/synthetic/kora-index-outputs.json.
//
// Use only for demo tenants (environment === 'demo').
// Never call directly in app/ routes — use lib/scoring-result/index.ts.

import type { IScoringService, ScoringPathMode } from './IScoringService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';

export class DemoScoringAdapter implements IScoringService {
  readonly mode: ScoringPathMode = 'DEMO';
  readonly source = 'synthetic_seed/kora-index-outputs.json';
  readonly isAuthoritative = false;

  // Expose underlying service for consumers that already hold a reference.
  // Prefer lib/scoring-result/useScoringResult() in application code.
  readonly underlying = scoringSimulatorService;
}

export const demoScoringAdapter = new DemoScoringAdapter();
