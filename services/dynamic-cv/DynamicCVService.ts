// DynamicCVService — worker-self only.
// Canonical service interface for the Dynamic Impact CV.
//
// B86-B: Attribution gate wired. Only class A items (Verified Individual) appear
// in cv_items. Classes B–F are separated into excluded_items with Italian worker-readable
// exclusion reasons. Single source of truth: WorkerAttributionService.classify().
//
// KORA Foundation Light: returns synthetic per-persona CV items via
// MyKoraPreviewService. The attribution gate is live — it filters items correctly.
//
// Pilot+ path: this service will return items derived from verified UEF records
// stored against a real worker_kora_id, with worker-controlled sharing flags
// and cryptographic export readiness. The interface allows that swap without
// component changes.
//
// Privacy invariant: employer roles must NEVER call this service or receive its output.
// getProfile() throws on non-worker roles — this is intentional and hard.

import type { DynamicCVProfile, KoraRole, PillarCode } from '@/lib/types';
import { isWorkerRole } from '@/lib/permissions';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import {
  workerAttributionService,
  type AttributionInput,
} from '@/services/worker-attribution/WorkerAttributionService';
import type { DynamicCVItem } from '@/services/my-kora-preview/MyKoraPreviewService';

// Maps DynamicCVItem.source_category (display label) to AttributionInput.source_type
// (classification code). Matches the same mapping used in dynamic-cv/page.tsx.
function toSourceType(sourceCategory: string): string {
  const lc = sourceCategory.toLowerCase();
  if (lc.includes('lms'))      return 'lms_training';
  if (lc.includes('esg'))      return 'esg_initiatives';
  if (lc.includes('welfare'))  return 'welfare_provider';
  if (lc.includes('partner'))  return 'partner_events';
  return 'manual_upload';
}

function toAttributionInput(item: DynamicCVItem): AttributionInput {
  return {
    verification_status: item.verification_status,
    source_type: toSourceType(item.source_category),
  };
}

export interface IDynamicCVService {
  getProfile(workerId: string, role: KoraRole): DynamicCVProfile | null;
}

export class DynamicCVService implements IDynamicCVService {
  // Returns Foundation Light synthetic CV items for the given persona.
  // Attribution gate: only class A (dynamicCvEligible = true) items appear in cv_items.
  // Classes B–F appear in excluded_items with worker-readable exclusion reasons.
  getProfile(workerId: string, role: KoraRole): DynamicCVProfile | null {
    if (!isWorkerRole(role)) {
      throw new Error(
        `DynamicCVService: role ${role} is not permitted — worker-self access only. ` +
        'Employer roles have zero access to individual CV data (privacy invariant).',
      );
    }

    const preview = myKoraPreviewService.getDynamicCvPreview(workerId);

    const cvItems:       DynamicCVProfile['cv_items']        = [];
    const excludedItems: NonNullable<DynamicCVProfile['excluded_items']> = [];

    for (const item of preview.items) {
      const input = toAttributionInput(item);
      const attribution = workerAttributionService.classify(input);

      if (attribution.dynamicCvEligible) {
        cvItems.push({
          id:     item.id,
          title:  item.title,
          pillar: item.pillar as PillarCode,
          status: item.verification_status,
        });
      } else {
        const reason = workerAttributionService.getExclusionReason(attribution.code) ?? 'Attività non idonea al Dynamic CV';
        excludedItems.push({
          id:              item.id,
          title:           item.title,
          pillar:          item.pillar as PillarCode,
          status:          item.verification_status,
          excluded_reason: reason,
        });
      }
    }

    return {
      worker_id:        workerId,
      cv_items:         cvItems,
      excluded_items:   excludedItems.length > 0 ? excludedItems : undefined,
      milestones:       [],    // Pilot+: populated from verified milestone events
      sharing_settings: Object.fromEntries(
        preview.items
          .filter((item) => {
            const attr = workerAttributionService.classify(toAttributionInput(item));
            return attr.dynamicCvEligible;
          })
          .map((item) => [item.id, item.shareable]),
      ),
      export_readiness:    false, // Pilot+: true when worker confirms export intent
      synthetic_demo_data: true,
    };
  }
}

export const dynamicCVService = new DynamicCVService();
