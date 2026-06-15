// services/worker-pib/WorkerPIBService.ts
//
// B157 — Worker PIB/CV: binario di consumo.
// Single source for PIB and Dynamic CV data behind the canonical contract.
//
// TODAY:  returns synthetic data from MyKoraPreviewService (isSynthetic: true).
// FUTURE: replace the synthetic source with live aggregation per pseudonym_id
//         from the IU pipeline. See docs/worker-pib-activation-guide.md.
//
// Privacy invariants (non-negotiable):
//   - not_employer_visible: true — never called from employer-facing code paths.
//   - not_performance_score: true — PIB is activation measurement, not evaluation.
//   - export_available: false — while isSynthetic, export must be blocked by the page.
//
// Usage:
//   import { workerPIBService } from '@/services/worker-pib/WorkerPIBService';
//   const pib   = workerPIBService.getPIB(personaId, scenarioId);
//   const cvData = workerPIBService.getCVData(personaId);

import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import type { ScenarioId } from '@/lib/types';
import type { WorkerPIB, WorkerCVData, WorkerPillarData, WorkerTimelineEvent, WorkerCVItem } from '@/lib/types/domains/worker-pib';

const VALID_SCENARIOS: ScenarioId[] = ['S1', 'S2', 'S3', 'S4'];

function toScenarioId(s: string): ScenarioId {
  return (VALID_SCENARIOS.includes(s as ScenarioId) ? s : 'S1') as ScenarioId;
}

export class WorkerPIBService {

  // Returns the worker's Personal Impact Balance for the given persona/scenario.
  //
  // LIVE SOURCE HOOK (post-Gate-2): sostituire la sorgente sintetica con
  // l'aggregazione IU per pseudonym_id dalla pipeline reale.
  // Vedi docs/worker-pib-activation-guide.md — sezione "Attivazione sorgente reale".
  getPIB(personaId: string, scenarioId: string): WorkerPIB {
    const preview = myKoraPreviewService.getMyKoraHomePreview(personaId, toScenarioId(scenarioId));
    if (!preview) {
      return this.getPIB('A', 'S1');
    }
    const pib = preview.pib_light;

    const pillarBreakdown: WorkerPillarData[] = pib.pillar_breakdown.map((p) => ({
      pillar:      p.pillar,
      label:       p.label,
      score:       p.score,
      iu_total:    p.iu_total,
      trend:       p.trend,
      event_count: p.event_count,
    }));

    const timeline: WorkerTimelineEvent[] = (preview.timeline ?? []).map((t) => ({
      id:                  t.id,
      date:                t.date,
      category:            t.category,
      pillar:              t.pillar,
      source_type:         t.source_type,
      verification_status: t.verification_status,
      iu_contribution:     t.iu_contribution,
      iu_value:            t.iu_value,
      cv_eligible:         t.cv_eligible,
      cv_eligible_reason:  t.cv_eligible_reason,
    }));

    return {
      period:                       pib.period,
      period_iu_total:              pib.period_iu_total,
      overall_index:                pib.overall_index,
      active_pillars:               pib.active_pillars,
      total_events:                 pib.total_events,
      pillar_breakdown:             pillarBreakdown,
      timeline,
      activation_level:             pib.activation_level,
      activation_level_label:       pib.activation_level_label,
      activation_level_description: pib.activation_level_description,
      activation_profile:           pib.activation_profile,
      activation_profile_description: pib.activation_profile_description,
      pib_derivation_note:          pib.pib_derivation_note,
      pib_derivation_basis:         'synthetic_iu_pre_computed',
      disclaimer:                   pib.disclaimer,
      not_employer_visible:         true,
      not_performance_score:        true,
      isSynthetic:                  true,
    };
  }

  // Returns the worker's IU-based Dynamic CV (distinct from participation-count CV).
  //
  // LIVE SOURCE HOOK (post-Gate-2): sostituire la sorgente sintetica con
  // record UEF individuali verificati (analytics.uef_record filtrati per pseudonym_id).
  // Vedi docs/worker-pib-activation-guide.md — sezione "Attivazione Dynamic CV reale".
  getCVData(personaId: string): WorkerCVData {
    const cvPreview = myKoraPreviewService.getDynamicCvPreview(personaId);

    const items: WorkerCVItem[] = cvPreview.items.map((item) => ({
      id:                  item.id,
      title:               item.title,
      pillar:              item.pillar,
      pillar_label:        item.pillar_label,
      date:                item.date,
      source_category:     item.source_category,
      verification_status: item.verification_status,
      shareable:           item.shareable,
      export_label:        item.export_label,
    }));

    const verifiedCount = items.filter((i) => i.verification_status === 'verified').length;

    return {
      items,
      total_items:      items.length,
      verified_count:   verifiedCount,
      disclaimer:       cvPreview.disclaimer,
      export_available: false,
      isSynthetic:      true,
    };
  }
}

export const workerPIBService = new WorkerPIBService();
