// DynamicCVService — worker-self only.
// Canonical service interface for the Dynamic Impact CV.
//
// Master Plan §33 DO-NOT-DELETE / FUTURE CORE.
//
// B86-B (superseded): this service used to return synthetic per-persona CV
// items via MyKoraPreviewService, gated through
// WorkerAttributionService.classify(). B-WORKER "One Product / No Demo
// Runtime" correction (2026-09-06): that synthetic path is retired — it was
// verified fresh to have zero real callers anywhere in the repository (the
// live Dynamic Impact CV surface, /worker/dynamic-cv, is served instead by
// WorkerPIBService.getCVDataLive() against personal.worker_pib). This class
// is preserved as future-core scaffolding per Master Plan §33 — a dedicated
// slice wiring getProfile() to real per-worker UEF records (not fabricated
// here) can reuse WorkerAttributionService.classify() the same way B86-B did.
//
// Privacy invariant: employer roles must NEVER call this service or receive its output.
// getProfile() throws on non-worker roles — this is intentional and hard.

import type { DynamicCVProfile, KoraRole } from '@/lib/types';
import { isWorkerRole } from '@/lib/permissions';

export interface IDynamicCVService {
  getProfile(workerId: string, role: KoraRole): DynamicCVProfile | null;
}

export class DynamicCVService implements IDynamicCVService {
  // Not yet wired to a live data source (see class comment above) — returns
  // null rather than fabricating data. Only the role guard is live.
  getProfile(workerId: string, role: KoraRole): DynamicCVProfile | null {
    if (!isWorkerRole(role)) {
      throw new Error(
        `DynamicCVService: role ${role} is not permitted — worker-self access only. ` +
        'Employer roles have zero access to individual CV data (privacy invariant).',
      );
    }

    return null;
  }
}

export const dynamicCVService = new DynamicCVService();
