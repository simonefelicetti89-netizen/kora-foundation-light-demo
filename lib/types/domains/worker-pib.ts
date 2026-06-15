// lib/types/domains/worker-pib.ts — Worker PIB + Dynamic CV consumption contract.
//
// B157 — Worker PIB/CV: predisposizione binario di consumo.
//
// Purpose: stable contract between the PIB/CV pages and their data source.
// TODAY the source is synthetic (MyKoraPreviewService, isSynthetic=true).
// FUTURE the source is the live IU pipeline (aggregated per pseudonym_id).
// Swapping the source does NOT require touching page code or layout — only
// WorkerPIBService changes (see services/worker-pib/WorkerPIBService.ts).
//
// Non-suppressible invariants:
//   not_employer_visible: true  — PIB data is worker-private; never surfaced to employer roles.
//   not_performance_score: true — PIB is an activation indicator, not a performance evaluation.
//
// Pillar codes: 'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY'
// All string fields that carry pillar codes use those canonical values.

export interface WorkerPillarData {
  pillar:      string;
  label:       string;
  score:       number;
  iu_total:    number;
  trend:       'up' | 'stable' | 'down';
  event_count: number;
}

export interface WorkerTimelineEvent {
  id:                  string;
  date:                string;
  category:            string;
  pillar:              string;
  source_type:         string;
  verification_status: 'verified' | 'partial' | 'self_declared';
  iu_contribution:     'high' | 'medium' | 'low';
  iu_value:            number;
  cv_eligible:         boolean;
  cv_eligible_reason:  string;
}

export type PIBDerivationBasis =
  | 'synthetic_iu_pre_computed'
  | 'live_scoring_pipeline';

export interface WorkerPIB {
  period:                      string;
  period_iu_total:             number;
  overall_index:               number;
  active_pillars:              number;
  total_events:                number;
  pillar_breakdown:            WorkerPillarData[];
  timeline:                    WorkerTimelineEvent[];
  activation_level:            'initial' | 'developing' | 'established' | 'advanced';
  activation_level_label:      string;
  activation_level_description: string;
  activation_profile:          string;
  activation_profile_description: string;
  pib_derivation_note:         string;
  pib_derivation_basis:        PIBDerivationBasis;
  disclaimer:                  string;
  // Non-suppressible invariants — must always be true in any source implementation
  not_employer_visible:        true;
  not_performance_score:       true;
  // Source flag — isSynthetic: true prevents export; shown as disclaimer in UI
  isSynthetic:                 boolean;
}

export interface WorkerCVItem {
  id:                  string;
  title:               string;
  pillar:              string;
  pillar_label:        string;
  date:                string;
  source_category:     string;
  verification_status: 'verified' | 'partial' | 'self_declared';
  shareable:           boolean;
  export_label:        string;
}

export interface WorkerCVData {
  items:          WorkerCVItem[];
  total_items:    number;
  verified_count: number;
  disclaimer:     string;
  // non-suppressible while isSynthetic — pages must not offer export when false
  export_available: false;
  isSynthetic:    boolean;
}
