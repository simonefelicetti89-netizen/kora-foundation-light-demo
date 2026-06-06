// DynamicCVService — worker-self only.
// Canonical service interface for the Dynamic Impact CV.
//
// Foundation Light v0.1: returns synthetic per-persona CV items via
// MyKoraPreviewService. This is not a stub — it is the correct Foundation
// Light implementation of the service contract.
//
// Pilot+ path: this service will return items derived from verified UEF records
// stored against a real worker_kora_id, with worker-controlled sharing flags
// and cryptographic export readiness. The interface is designed to allow that
// swap without component changes.
//
// Privacy invariant: employer roles must NEVER call this service or receive its output.
// getProfile() throws on non-worker roles — this is intentional and hard.

import type { DynamicCVProfile, KoraRole, PillarCode } from '@/lib/types';
import { isWorkerRole } from '@/lib/permissions';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';

export interface IDynamicCVService {
  getProfile(workerId: string, role: KoraRole): DynamicCVProfile | null;
}

export class DynamicCVService implements IDynamicCVService {
  // Returns Foundation Light synthetic CV items for the given persona.
  // Maps from the richer DynamicCVItem format (MyKoraPreviewService) to the
  // canonical DynamicCVProfile type for the worker experience layer.
  getProfile(workerId: string, role: KoraRole): DynamicCVProfile | null {
    if (!isWorkerRole(role)) {
      throw new Error(
        `DynamicCVService: role ${role} is not permitted — worker-self access only. ` +
        'Employer roles have zero access to individual CV data (privacy invariant).',
      );
    }

    const preview = myKoraPreviewService.getDynamicCvPreview(workerId);

    const cvItems = preview.items.map((item) => ({
      id:     item.id,
      title:  item.title,
      pillar: item.pillar as PillarCode,
      status: item.verification_status,
    }));

    return {
      worker_id:        workerId,
      cv_items:         cvItems,
      milestones:       [],    // Pilot+: populated from verified milestone events
      sharing_settings: Object.fromEntries(
        preview.items.map((item) => [item.id, item.shareable]),
      ),
      export_readiness:    false, // Pilot+: true when worker confirms export intent
      synthetic_demo_data: true,
    };
  }
}

export const dynamicCVService = new DynamicCVService();
