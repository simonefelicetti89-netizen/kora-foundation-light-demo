// tests/unit/my-kora-foundation.test.ts
// B70-B: My KORA Foundation Cleanup — unit tests
//
// PRIOR HISTORY (accurate as of B70-B, preserved as a record, not verbatim
// given the volume): this file extensively tested MyKoraPreviewService's
// persona-fixture dispatch (getMyKoraHomePreview, getDynamicCvPreview,
// getOpportunitiesForPersona, canAccess) and DynamicCVService.getProfile's
// synthetic population (cv_items derived per persona via the attribution
// gate) across 4 personas and 2 scenarios.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
// MyKoraPreviewService.ts is deleted (zero real callers, verified fresh —
// docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md). It is
// preserved as future-core scaffolding per Master Plan §33 — its getProfile()
// now returns null (role guard only, no fabricated data) rather than being
// wired to a live source, which this slice does not invent. See
// lib/architecture/registry.ts svc.my-kora-preview / svc.dynamic-cv and
// tests/unit/bworker-preview-runtime-retirement.test.ts for the regression
// guard proving the retirement.
//
// Two describe blocks below are NOT retired: DynamicCVService's
// privacy-invariant tests (getProfile still throws for non-worker roles —
// that guard is unaffected by the data-source retirement) and
// PIBAggregationService's regression guard (an unrelated service, never
// touched by B70-B or this correction).

import { describe, it, expect } from 'vitest';
import { DynamicCVService } from '@/services/dynamic-cv/DynamicCVService';
import { PIBAggregationService } from '@/services/pib-aggregation/PIBAggregationService';

// ── DynamicCVService — privacy invariant (unaffected by the data-source retirement) ──

describe('DynamicCVService.getProfile — role guard survives synthetic retirement', () => {
  const service = new DynamicCVService();

  it('returns null for WORKER role (no live source wired — not fabricated)', () => {
    const profile = service.getProfile('persona-elena-m', 'WORKER');
    expect(profile).toBeNull();
  });

  it('throws on COMPANY_ADMIN role — privacy invariant', () => {
    expect(() => service.getProfile('any-worker', 'COMPANY_ADMIN')).toThrow();
  });

  it('throws on ADVISOR role — privacy invariant', () => {
    expect(() => service.getProfile('any-worker', 'ADVISOR')).toThrow();
  });

  it('throws on PARTNER role — privacy invariant', () => {
    expect(() => service.getProfile('any-worker', 'PARTNER')).toThrow();
  });
});

// ── PIBAggregationService — unchanged after B70-B ────────────────────────────

describe('PIBAggregationService — unchanged by B70-B (regression guard)', () => {
  const service = new PIBAggregationService();

  it('aggregateForBatch still returns pibSnapshotsAvailable=false', () => {
    const result = service.aggregateForBatch([], 100);
    expect(result.pibSnapshotsAvailable).toBe(false);
    expect(result.snapshots).toHaveLength(0);
  });

  it('getWorkerPIBSummary returns available=false for COMPANY_ADMIN', () => {
    const result = service.getWorkerPIBSummary('any-id', 'COMPANY_ADMIN') as { available: false; reason: string };
    expect(result.available).toBe(false);
  });

  it('getWorkerPIBSummary returns available=false even for WORKER (aggregate model)', () => {
    const result = service.getWorkerPIBSummary('any-id', 'WORKER') as { available: false; reason: string };
    expect(result.available).toBe(false);
  });
});
