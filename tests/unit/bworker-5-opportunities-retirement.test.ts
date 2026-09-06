// tests/unit/bworker-5-opportunities-retirement.test.ts
// B-WORKER Slice 5 — Final real-session dependency closure (2026-09-06).
//
// PRIOR HISTORY (accurate as of B-WORKER Slice 5, preserved as a record, not
// verbatim given the volume): this file recorded that /my-kora/opportunities
// probed a real session via /api/worker/partner-catalog and redirected only
// confirmed real sessions to /worker/opportunities, while anonymous/persona
// visitors kept seeing the synthetic, personalized preview
// (workerOpportunityService.compute() via MyKoraPreviewService). It asserted
// this closed REAL_SESSION_MY_KORA_DEPENDENCIES to [] but explicitly left
// /my-kora itself, MyKoraPreviewService, WorkerAchievementService, and the
// global layout admission branch untouched — deferred to "the next cleanup
// slice," reasoning (at the time) that CLAUDE.md §10 permanently protected
// the surviving anonymous/persona demo runtime.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): that
// CLAUDE.md §10 reasoning was wrong (see app-surface.my-kora and
// svc.my-kora-preview in lib/architecture/registry.ts for the full
// correction). This is the deferred slice. Every /my-kora/** page —
// including opportunities — now redirects UNCONDITIONALLY (no probe, no
// session check, no synthetic fallback) to its canonical /worker/**
// equivalent. MyKoraPreviewService.ts and WorkerAchievementService.ts are
// both deleted. The I9 allowlist has 2 B_WORKER-owned entries, not 3
// (AccountProvisioningService.ts, WorkerProvisioningService.ts —
// WorkerAchievementService.ts removed). See
// tests/unit/bworker-preview-runtime-retirement.test.ts for the full
// current-state regression guard.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

describe('B-WORKER-5 — superseded by the preview-runtime-retirement slice', () => {
  it('/my-kora/opportunities is now an unconditional redirect, not a session-probing page', () => {
    const legacy = read('app/my-kora/opportunities/page.tsx');
    expect(legacy).toContain("redirect('/worker/opportunities')");
    expect(legacy).not.toContain('workerOpportunityService.compute(');
    expect(legacy).not.toContain('myKoraPreviewService');
  });

  it('MyKoraPreviewService.ts and WorkerAchievementService.ts no longer exist', () => {
    expect(() => read('services/my-kora-preview/MyKoraPreviewService.ts')).toThrow();
    expect(() => read('services/worker-achievements/WorkerAchievementService.ts')).toThrow();
  });
});
