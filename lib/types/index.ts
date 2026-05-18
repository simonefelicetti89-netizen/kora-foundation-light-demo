import type { KORA_ROLES, PILLAR_CODES, KORA_INDEX_COMPONENTS } from '@/lib/constants/kora';

export type KoraRole = (typeof KORA_ROLES)[number];
export type PillarCode = (typeof PILLAR_CODES)[number];
export type ComponentCode = (typeof KORA_INDEX_COMPONENTS)[number];
export type SafeguardStatus = 'CLEAR' | 'WARNING' | 'FLAGGED';
export type CalibrationStatus =
  | 'pre_empirical_calibration'
  | 'delphi_calibrated'
  | 'empirically_validated';
export type ScenarioId = 'S1' | 'S2' | 'S3' | 'S4';
export type EvidenceLevel = 'verified' | 'partially_verified' | 'self_declared';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type PrivacySensitivity = 'low' | 'medium' | 'high';
export type PrivacyDataType =
  | 'pib'
  | 'uef'
  | 'impact_units'
  | 'worker_profiles'
  | 'my_kora'
  | 'booking'
  | 'dynamic_cv'
  | 'consent';
export type PrivacySuppressReason =
  | 'employer_role'
  | 'group_too_small'
  | 'insufficient_permission'
  | 'worker_consent_required';

export interface KoraIndexComponent {
  code: ComponentCode;
  label: string;
  value: number; // 0–1
  weight: number; // 0–1, all 10 must sum to 1.00
}

export interface KoraIndexOutput {
  id: string;
  company_id: string;
  scenario_id: ScenarioId;
  reporting_period: string;
  kora_index_value: number; // 0–100
  components: KoraIndexComponent[]; // always exactly 10
  methodology_version_id: string;
  calibration_status: CalibrationStatus;
  confidence_score: number; // 0–1
  safeguard_status: SafeguardStatus;
  generated_at: string;
  synthetic_demo_data: true;
  // Cross-references populated from seed data
  confidence_score_id?: string;
  activation_safeguard_result_id?: string;
  scoring_run_id?: string;
  limitations_text?: string;
}

export interface CompanyAggregateExtended {
  id: string;
  company_id: string;
  scenario_id: ScenarioId;
  reporting_period: string;
  total_workers: number;
  eligible_worker_count: number;
  active_worker_count: number;
  meaningful_active_worker_count: number;
  activation_rate: number;
  meaningful_activation_rate: number;
  continuity_rate: number;
  verification_rate: number;
  pillar_distribution: Record<PillarCode, number>;
  department_activation: Record<string, number>;
  privacy_threshold_met: boolean;
  methodology_version_id: string;
  calibration_status: CalibrationStatus;
  synthetic_demo_data: true;
  generated_for: string;
  not_live_data: true;
}

export interface UEFRecord {
  id: string;
  worker_pseudonym_id: string;
  company_id: string;
  scenario_id: ScenarioId;
  pillar_primary: PillarCode;
  event_type_code: string;
  source_type: string;
  evidence_level: EvidenceLevel;
  privacy_sensitivity: PrivacySensitivity;
  mapping_confidence: number;
  review_status: ReviewStatus;
  eligible_for_scoring: boolean;
  event_date: string;
  synthetic_demo_data: true;
}

export interface ImpactUnit {
  id: string;
  uef_id: string;
  worker_pseudonym_id: string;
  company_id: string;
  scenario_id: ScenarioId;
  pillar: PillarCode;
  iu_value: number;
  nm: number;
  bc: number;
  cq: number;
  ev: number;
  cf: number;
  agf: number;
  methodology_version_id: string;
  calibration_status: CalibrationStatus;
  synthetic_demo_data: true;
}

export interface PIBRecord {
  id: string;
  worker_pseudonym_id: string;
  company_id: string;
  scenario_id: ScenarioId;
  reporting_period: string;
  pib_by_pillar: Record<PillarCode, number>;
  pib_total: number;
  methodology_version_id: string;
  calibration_status: CalibrationStatus;
  synthetic_demo_data: true;
}

export interface CompanyAggregate {
  id: string;
  company_id: string;
  scenario_id: ScenarioId;
  reporting_period: string;
  total_workers: number;
  active_workers: number;
  activation_rate: number;
  meaningful_activation_rate: number;
  pillar_distribution: Record<PillarCode, number>;
  synthetic_demo_data: true;
}

export interface ScenarioConfig {
  id: ScenarioId;
  label: string;
  company_id: string;
  reporting_period: string;
  narrative: string;
  safeguard_status: SafeguardStatus;
  kora_index_value: number;
  demo_activation_summary?: string;
  demo_confidence_score?: number;
}

export interface WorkerPersona {
  id: string;
  display_name: string;
  department: string;
  site: string;
  scenario_id: ScenarioId;
  synthetic_demo_data: true;
}

export interface PartnerProfile {
  id: string;
  name: string;
  service_type: string;
  pillar_primary: PillarCode;
  eligibility_confidence: number;
  verification_status: 'verified' | 'pending' | 'unverified';
  synthetic_demo_data: true;
}

export interface AdvisorReview {
  id: string;
  uef_id: string;
  advisor_id: string;
  status: 'pending' | 'in_review' | 'completed';
  eligibility_confidence: number | null;
  recommendation_notes: string | null;
  synthetic_demo_data: true;
}

export interface ReportData {
  report_type: string;
  company_id: string;
  scenario_id: ScenarioId;
  sections: Array<{ title: string; content: string }>;
  synthetic_demo_data: true;
}

export interface BookingRequest {
  id: string;
  worker_id: string;
  service_id: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  requested_at: string;
  synthetic_demo_data: true;
}

export interface DynamicCVProfile {
  worker_id: string;
  cv_items: Array<{ id: string; title: string; pillar: PillarCode; status: string }>;
  milestones: Array<{ id: string; label: string; achieved_at: string }>;
  sharing_settings: Record<string, boolean>;
  export_readiness: boolean;
  synthetic_demo_data: true;
}

export interface FounderValidationContact {
  id: string;
  company_name: string;
  contact_role: string;
  pipeline_stage: string;
  pilot_interest: 'yes' | 'no' | 'exploring';
  synthetic_demo_data: true;
}

export interface PrivacyVisibilityResult {
  suppressed: boolean;
  reason?: PrivacySuppressReason;
  threshold?: number;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

export interface ActivationSafeguardResult {
  status: SafeguardStatus;
  ar_value: number;
  mar_value: number;
}

export interface MethodologyConfig {
  version: string;
  calibration_status: CalibrationStatus;
  weights: Record<string, number>;
  safeguard_thresholds: {
    CLEAR: { AR: number; MAR: number };
    WARNING: { AR_min: number; AR_max: number; MAR_min: number; MAR_max: number };
    FLAGGED: { AR_max: number; MAR_max: number };
  };
}
