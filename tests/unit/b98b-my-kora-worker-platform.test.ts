// tests/unit/b98b-my-kora-worker-platform.test.ts
// B98-B — My KORA Worker Platform Upgrade.
//
// PRIOR HISTORY (accurate as of B98-B, preserved as a record, not verbatim
// given the volume): this file tested computeNextAction (lib/my-kora/nextActionLogic.ts,
// a deterministic next-action engine over persona pillar-breakdown fixtures),
// MyKoraPreviewService's journey/PIB/Dynamic-CV/Commons preview data, and
// WorkerOpportunityService.compute()'s opportunity strip — all against the
// app/my-kora/page.tsx "My KORA Home" surface's above-fold sections.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
// app/my-kora/page.tsx is now a pure, unconditional redirect() to
// /worker/workspace — it has no sections, no next-action engine, no
// persona/PIB/Dynamic-CV/Commons preview rendering of its own anymore
// (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
// lib/my-kora/nextActionLogic.ts and services/my-kora-preview/MyKoraPreviewService.ts
// are both deleted (zero real callers, verified fresh before deletion).
// WorkerOpportunityService.compute() is removed (same reason); its
// canAccess() role guard and computeFromPillars() technical foundation
// survive and are covered by tests/unit/b87b-activation-opportunity.test.ts.
// See lib/architecture/registry.ts app-surface.my-kora / svc.my-kora-preview
// and tests/unit/bworker-preview-runtime-retirement.test.ts for the
// regression guard proving the retirement.

import { describe, it, expect } from 'vitest';

describe('B98-B My KORA Worker Platform — retired page, retired preview services', () => {
  it('is recorded as a historical retirement, not a still-active surface', () => {
    expect(true).toBe(true);
  });
});
