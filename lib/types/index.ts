import type {
  KORA_ROLES,
  PILLAR_CODES,
  KORA_INDEX_COMPONENTS,
  MACROBLOCK_CODES,
} from '@/lib/constants/kora';

export type KoraRole       = (typeof KORA_ROLES)[number];
export type PillarCode     = (typeof PILLAR_CODES)[number];
export type ComponentCode  = (typeof KORA_INDEX_COMPONENTS)[number];
export type MacroblockCode = (typeof MACROBLOCK_CODES)[number];

export type SafeguardStatus = 'CLEAR' | 'WARNING' | 'FLAGGED';
export type CalibrationStatus =
  | 'pre_empirical_calibration'
  | 'delphi_calibrated'
  | 'empirically_validated';
export type ScenarioId     = 'S1' | 'S2' | 'S3' | 'S4';
export type EvidenceLevel  = 'verified' | 'partially_verified' | 'self_declared';
export type ReviewStatus   = 'pending' | 'approved' | 'rejected' | 'flagged';
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

// ── Eligibility Gate ────────────────────────────────────────────────────────────
// Every uploaded item passes through the Eligibility Gate before any scoring.
// Blocked items generate 0 IU and 0 KORA Index contribution — not low weight, zero.

export type EligibilityClass = 'eligible' | 'limited' | 'blocked';

export type ActionFamily =
  | 'economic_relief'         // meal vouchers, fuel vouchers, shopping vouchers, generic fringe
  | 'family_and_care'         // childcare, asilo nido, caregiver support, elderly assistance
  | 'health_and_wellbeing'    // preventive health, psychological support, mental health, nutrition
  | 'professional_growth'     // training, upskilling, reskilling, certifications, coaching
  | 'inclusion_and_connection' // mentoring, peer support, inclusion programs, cross-functional
  | 'territorial_impact'      // volunteering, community projects, territorial initiatives
  | 'future_and_legacy'       // pension support, long-term employability, knowledge transfer
  | 'blocked_compliance';     // HSE/legal mandatory, DVR, DUVRI, DPI, mandatory safety training

export type EventNature =
  | 'monetary_benefit'         // cash-like: vouchers, fringe benefits, gift cards
  | 'consumed_service'         // welfare service actually used by worker
  | 'training'                 // learning event (may be mandatory or voluntary)
  | 'policy'                   // company policy or program enrollment
  | 'collective_initiative'    // group or cross-company initiative
  | 'territorial_initiative'   // local community or territorial project
  | 'long_term_benefit'        // pension, long-term employability, future programs
  | 'partner_service'          // service delivered by KORA partner
  | 'blocked_compliance';      // legal/HSE compliance record — blocked by design

export type MandatoryStatus =
  | 'legal_mandatory'              // required by law — always blocked
  | 'role_mandatory'               // required for the specific role — always blocked
  | 'contractual_mandatory'        // required by collective agreement — always blocked
  | 'company_required_compliance'  // internal compliance requirement — always blocked
  | 'company_required_development' // company-required but developmental — may be eligible
  | 'optional'                     // available but not required
  | 'voluntary'                    // fully voluntary worker choice
  | 'developmental';               // developmental, encouraged but not mandatory

export type DepthLevel = 'deep' | 'moderate' | 'surface' | 'none';

// ── KORA Index v3 — Macroblock Architecture ─────────────────────────────────────
// KORA Index v3 = 25% Activation Reach + 30% Activation Quality
//               + 25% Distribution & Equity + 20% Budget-to-Human-Impact
// Confidence Score (CS) is EXTERNAL — weight = 0, shown separately as reliability indicator.

export interface MacroblockConfig {
  label: string;
  weight: number;                    // macroblock weight in total KORA Index (0.25/0.30/0.25/0.20)
  components: Record<string, number>; // component_code → within-macroblock weight (must sum to 1.0)
  bti_engine?: boolean;              // true for BTI: score from BudgetToHumanImpactEngine, not component values
}

export interface MacroblockScore {
  code: MacroblockCode;
  label: string;
  weight: number;             // macroblock weight in total KORA Index
  score: number;              // 0–100 macroblock-level score
  component_codes: string[];  // operational components feeding this macroblock (empty for BTI)
  main_driver?: string;       // primary signal driving the macroblock score
  risk_opportunity?: string;  // key risk or opportunity for this macroblock
}

// ── Core KORA Index types ───────────────────────────────────────────────────────

export interface KoraIndexComponent {
  code: ComponentCode;
  label: string;
  value: number;               // 0–1
  weight: number;              // effective weight in KORA Index; CS = 0 in v3 (external)
  external?: boolean;          // true for CS — not included in KORA Index v3 computation
  macroblock?: MacroblockCode; // which macroblock this component feeds (undefined for CS)
}

export interface KoraIndexOutput {
  id: string;
  company_id: string;
  scenario_id: ScenarioId;
  reporting_period: string;
  kora_index_value: number;         // 0–100
  components: KoraIndexComponent[]; // always exactly 10 for display continuity (CS weight = 0)
  macroblocks?: MacroblockScore[];  // v3: 4 macroblock scores (REACH, QUALITY, EQUITY, BTI)
  methodology_version_id: string;
  calibration_status: CalibrationStatus;
  confidence_score: number;         // 0–1, external to KORA Index v3 computation
  safeguard_status: SafeguardStatus;
  generated_at: string;
  synthetic_demo_data: true;
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

// ── Action Taxonomy ─────────────────────────────────────────────────────────────

export interface ActionTaxonomyEntry {
  action_id: string;
  action_name: string;
  action_name_it: string;
  keywords: string[];                                          // for rule-based classifier matching
  action_family: ActionFamily;
  fiscal_perimeter?: string;
  primary_pillar?: PillarCode;
  secondary_pillars?: PillarCode[];
  pillar_distribution?: Partial<Record<PillarCode, number>>;  // multi-pillar IU split weights, must sum to 1.0
  beneficiary_type: string;
  event_nature: EventNature;
  economic_value_default?: number | null;                      // default EUR value reference for BTI
  duration_default?: number | null;                            // hours
  frequency_default?: string | null;                           // 'once' | 'monthly' | 'annual' | 'per_event'
  mandatory_status: MandatoryStatus;
  kora_eligibility: EligibilityClass;
  evidence_required: boolean;
  verification_level: string;
  privacy_sensitivity: PrivacySensitivity;
  depth_level: DepthLevel;
  additionality_level: 'high' | 'moderate' | 'low' | 'none';
  reach_potential: 'universal' | 'broad' | 'targeted' | 'individual';
  continuity_potential: 'high' | 'moderate' | 'low';
  equity_relevance: 'high' | 'moderate' | 'low';
  eligible_for_worker_pib: boolean;
  eligible_for_company_index: boolean;
  eligible_for_contribution_index: boolean;
  eligible_for_value_chain_index: boolean;                     // KORA Value Chain (future/mock only in Foundation Light)
  default_caps?: Record<string, number>;                       // e.g. { monthly_eur: 200 }
  anti_gaming_rules?: string[];                                // AGF-relevant constraints for this action type
  exclusion_reason?: string;                                   // required for blocked and limited items
  explanation_text: string;                                    // English — explainability layer
  explanation_text_it: string;                                 // Italian — dashboard copy
}

// ── Budget-to-Human-Impact Engine ───────────────────────────────────────────────
// Connects people/welfare spend to verified human activation.
// "KORA misura ciò che accade dopo la spesa."
// "Budget allocated ≠ Budget activated. Budget spent ≠ Human impact."

export interface BudgetToHumanImpactRecommendation {
  priority: 'alta' | 'media' | 'bassa';
  action_it: string;              // Italian — displayed in dashboard
  expected_signal_it: string;     // Italian — expected KORA signal
  budget_note?: string;           // optional budget indication
  target_macroblock?: MacroblockCode; // which macroblock this recommendation targets
}

export interface BudgetToHumanImpactRecord {
  id: string;
  company_id: string;
  scenario_id: ScenarioId;
  reporting_period: string;
  // Total budget
  total_people_welfare_budget: number;
  // Spend classification (Eligible / Limited / Blocked)
  economic_relief_spend: number;         // Limited items spend (vouchers, fringe, gift cards)
  deep_activation_spend: number;         // Eligible items spend (care, training, wellbeing, impact)
  blocked_excluded_attempts: number;     // count of Blocked upload attempts (not spend)
  unused_budget: number;
  // Shares (0–1)
  economic_relief_share: number;         // economic_relief_spend / total
  deep_activation_share: number;         // deep_activation_spend / total
  // Per-worker efficiency metrics
  cost_per_activated_worker: number;
  cost_per_deep_activated_worker: number;
  cost_per_impact_unit: number;
  // Activation Debt — budget/potential not converted into verified activation
  activation_debt_eur: number;
  activation_debt_description_it: string;
  // Reallocation Opportunity — directional, not a guarantee
  reallocation_opportunity_eur: number;
  reallocation_opportunity_description_it: string;
  // Distribution quality (0–1)
  equity_of_spend: number;           // how evenly spend is distributed across workforce segments
  pillar_investment_balance: number; // how evenly spend is distributed across pillars
  // BTI macroblock score (0–100) — feeds the BTI macroblock of KORA Index v3
  bti_score: number;
  // Spend breakdown
  spend_by_pillar: Partial<Record<PillarCode, number>>;
  deep_activation_by_pillar: Partial<Record<PillarCode, number>>;
  // Recommendations (3–5 directional, not guaranteed)
  recommendations: BudgetToHumanImpactRecommendation[];
  // Meta — non-suppressible
  currency: string;
  disclaimer: string;
  informational_only: true;
  synthetic_demo_data: true;
}

// ── AI Ingestion Pipeline ────────────────────────────────────────────────────────
// Stage 1–2 of the 14-stage algorithm.
// Pipeline: RawIngestionRow → NormalizedIngestionRow → EligibilityGate → KoraReadyRecord

export type IngestionSourceType =
  | 'hr_system'
  | 'welfare_provider'
  | 'lms_training'
  | 'esg_initiatives'
  | 'partner_events'
  | 'manual'
  | 'unknown';

export interface RawIngestionRow {
  id: string;
  raw_name: string;
  raw_description?: string;
  source_file?: string;
  source_system?: string;
  source_type?: string;
  amount?: number | null;
  date_or_period?: string;
  provider?: string | null;
  site_or_cluster?: string | null;
  mandatory_status?: string | null;
  evidence_type?: string;
  missing_fields?: string[];
  [key: string]: unknown;
}

export interface NormalizedIngestionRow {
  id: string;
  raw_name: string;
  normalized_name: string;
  raw_description: string;
  source_file: string;
  source_type: IngestionSourceType;
  inferred_source_type: boolean;
  amount: number | null;
  date_or_period: string;
  provider: string | null;
  site_or_cluster: string | null;
  mandatory_status: string | null;
  inferred_mandatory_status: boolean;
  evidence_type: string;
  missing_fields: string[];
  data_completeness_score: number;
}

export type IngestionDestination =
  | 'KORA Activation Core'
  | 'Economic Relief & Activation Opportunity'
  | 'Blocked by Design'
  | 'Human Review Required';

export type IngestionReviewStatus = 'ready' | 'pending_review' | 'limited_gate' | 'blocked_gate';

export interface KoraReadyRecord {
  id: string;
  normalized_row: NormalizedIngestionRow;
  destination: IngestionDestination;
  review_status: IngestionReviewStatus;
  // Governance flags — strict rules per doc 10:
  // Blocked → all false. Limited → bti_governance only.
  // Eligible + review_required → all false until resolved.
  // Eligible + !review_required → scoring/IU may be true.
  approved_for_scoring: boolean;
  approved_for_bti_governance: boolean;
  approved_for_impact_units: boolean;
  missing_data_questions: string[];
  human_review_completed: boolean;
  human_review_notes?: string;
}

export type IngestionAuditEventType =
  | 'row_normalized'
  | 'row_classified'
  | 'mandatory_inferred'
  | 'source_type_inferred'
  | 'missing_fields_detected'
  | 'review_required_flagged'
  | 'human_review_completed'
  | 'governance_flag_set'
  | 'blocked_by_design';

export interface IngestionAuditEvent {
  timestamp: string;
  actor: 'pipeline' | 'human_reviewer' | 'system';
  event_type: IngestionAuditEventType;
  row_id: string;
  previous_value?: unknown;
  new_value?: unknown;
  reason: string;
}

// ── IU Computation Foundation ───────────────────────────────────────────────────
// Foundation Light stub: IU = NM × BC × CQ × EV × CF × AGF
// Structurally correct and typed. Factor values are deterministic stubs for v0.1.
// Full empirical calibration post Delphi Study.

export interface ImpactUnitEligibilityDecision {
  produces_iu: boolean;
  eligibility: EligibilityClass;
  review_required: boolean;
  approved_for_impact_units: boolean;
  exclusion_reason: string | null;
}

export interface ImpactUnitFactorTrace {
  factor_code: string;
  label: string;
  value: number;
  reason: string;
  data_source: string;
  foundation_light_stub: boolean;
}

export interface ImpactUnitComputationInput {
  record_id: string;
  source_row_id: string;
  action_family: ActionFamily;
  event_nature: EventNature;
  eligibility: EligibilityClass;
  primary_pillar: PillarCode | null;
  pillar_distribution: Partial<Record<PillarCode, number>>;
  evidence_type: string;
  missing_fields: string[];
  data_completeness_score: number;
  amount: number | null;
  site_or_cluster: string | null;
  review_required: boolean;
  approved_for_impact_units: boolean;
}

export interface ImpactUnitComputationResult {
  record_id: string;
  source_row_id: string;
  action_family: ActionFamily;
  event_nature: EventNature;
  eligibility: EligibilityClass;
  primary_pillar: PillarCode | null;
  pillar_distribution: Partial<Record<PillarCode, number>>;
  normalized_magnitude_nm: number;
  base_contribution_bc: number;
  completeness_quality_cq: number;
  evidence_verification_ev: number;
  contextual_factor_cf: number;
  anti_gaming_factor_agf: number;
  impact_units_total: number;
  impact_units_by_pillar: Partial<Record<PillarCode, number>>;
  computed: boolean;
  blocked: boolean;
  limited: boolean;
  review_required: boolean;
  exclusion_reason: string | null;
  explanation: string;
  formula_trace: ImpactUnitFactorTrace[];
  methodology_version: string;
  calibration_status: CalibrationStatus;
}

export interface ImpactUnitComputationSummary {
  total_records: number;
  computed_records: number;
  blocked_records: number;
  limited_records: number;
  review_required_records: number;
  total_impact_units: number;
  impact_units_by_pillar: Partial<Record<PillarCode, number>>;
  records_without_iu: number;
  average_cq: number;
  average_ev: number;
  average_cf: number;
  average_agf: number;
  methodology_version: string;
  calibration_status: CalibrationStatus;
}

// ── UEF Review & Human Validation ───────────────────────────────────────────────
// Stage 4 of the 14-stage algorithm: sits between Eligibility Gate and IU Computation.
// "L'AI propone. La metodologia governa. La revisione umana valida."

export type UEFReviewStatus =
  | 'pending'                      // awaiting human review decision
  | 'approved_for_scoring'         // eligible, confirmed for IU computation
  | 'approved_for_bti_governance'  // limited, confirmed for BTI tracking only
  | 'blocked_by_design'            // blocked, confirmed — 0 IU per design
  | 'needs_more_data'              // review paused — additional information required
  | 'rejected'                     // reviewer explicitly rejected record
  | 'override_to_eligible'         // reviewer upgraded eligibility to eligible
  | 'override_to_limited';         // reviewer downgraded eligibility to limited

export type UEFReviewDecision =
  | 'approve_scoring'
  | 'approve_bti_governance'
  | 'mark_blocked'
  | 'request_more_data'
  | 'reject'
  | 'override_to_eligible'
  | 'override_to_limited';

export type UEFAuditEventType =
  | 'review_assigned'
  | 'review_decision_made'
  | 'more_data_requested'
  | 'record_approved'
  | 'record_rejected'
  | 'record_blocked'
  | 'eligibility_overridden'
  | 'kora_ready_set';

export interface UEFReviewRecord {
  id: string;
  pipeline_row_id: string;
  raw_name: string;
  action_family: ActionFamily;
  event_nature: EventNature;
  eligibility: EligibilityClass;
  primary_pillar: PillarCode | null;
  review_status: UEFReviewStatus;
  original_pipeline_status: IngestionReviewStatus;
  approved_for_scoring: boolean;
  approved_for_bti_governance: boolean;
  approved_for_impact_units: boolean;
  review_decision: UEFReviewDecision | null;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  data_completeness_score: number;
  missing_fields: string[];
  additional_questions: string[];
  kora_ready: KoraReadyRecord;
  foundation_light_stub: boolean;
}

export interface UEFReviewSummary {
  total_records: number;
  pending_count: number;
  approved_for_scoring_count: number;
  approved_for_bti_governance_count: number;
  blocked_count: number;
  needs_more_data_count: number;
  rejected_count: number;
  override_count: number;
  kora_ready_for_iu_count: number;
  kora_ready_for_bti_count: number;
  review_completion_rate: number;
  methodology_version: string;
  calibration_status: CalibrationStatus;
}

export interface UEFAuditEvent {
  id: string;
  timestamp: string;
  actor: 'pipeline' | 'human_reviewer' | 'system';
  event_type: UEFAuditEventType;
  record_id: string;
  raw_name: string;
  decision?: UEFReviewDecision;
  previous_review_status?: UEFReviewStatus;
  new_review_status: UEFReviewStatus;
  previous_eligibility?: EligibilityClass;
  new_eligibility?: EligibilityClass;
  notes?: string;
  governance_flags?: {
    approved_for_scoring: boolean;
    approved_for_bti_governance: boolean;
    approved_for_impact_units: boolean;
  };
}

// ── Methodology Config ──────────────────────────────────────────────────────────

export interface MethodologyConfig {
  version: string;
  calibration_status: CalibrationStatus;
  // Legacy equal weights — retained for backwards compatibility only.
  // Not canonical for KORA Index v3. Use kora_index_v3.macroblocks for v3 computation.
  weights: Record<string, number>;
  // KORA Index v3 macroblock structure — canonical for v3 computation
  kora_index_v3?: {
    macroblocks: Partial<Record<MacroblockCode, MacroblockConfig>>;
    cs_external: true;
    note: string;
  };
  safeguard_thresholds: {
    CLEAR: { AR: number; MAR: number };
    WARNING: { AR_min: number; AR_max: number; MAR_min: number; MAR_max: number };
    FLAGGED: { AR_max: number; MAR_max: number };
  };
}

// ── Dynamic Scoring Preview (Block 3) ───────────────────────────────────────────
// Foundation Light experimental bridge: live IU results → proxy macroblock scores → preview KORA Index.
// calculation_mode: "foundation_light_dynamic_preview" — NOT the official KORA Index.

export type DynamicScoringMode = 'foundation_light_dynamic_preview';

export interface DynamicAggregationInput {
  total_records: number;
  computed_records: number;
  blocked_records: number;
  limited_records: number;
  review_required_records: number;
  total_impact_units: number;
  impact_units_by_pillar: Partial<Record<PillarCode, number>>;
  average_cq: number;
  average_ev: number;
  average_agf: number;
  review_completion_rate: number;
}

export interface DynamicCompanyAggregationPreview {
  proxy_ar: number;
  proxy_mar: number;
  proxy_quality_ratio: number;
  proxy_pc: number;
  proxy_pb: number;
  proxy_wb: number;
  proxy_eq: number;
  active_pillars_count: number;
  dominant_pillar: PillarCode | null;
  dominant_pillar_share: number;
}

export interface DynamicMacroblockPreview {
  code: MacroblockCode;
  label: string;
  weight: number;
  preview_score: number;
  proxy_basis: string;
  canonical_seed_score: number;
  delta: number;
  foundation_light_stub: boolean;
}

export interface DynamicScoringTrace {
  step: string;
  input: string;
  output: string;
  note: string;
}

export interface DynamicScoringPreviewOutput {
  calculation_mode: DynamicScoringMode;
  official_index_source: 'canonical_seed_output';
  production_ready: false;
  company_id: string;
  scenario_id: string;
  canonical_kora_index: number;
  dynamic_preview_score: number;
  delta_vs_canonical: number;
  aggregation: DynamicCompanyAggregationPreview;
  macroblocks: DynamicMacroblockPreview[];
  safeguard_preview: ActivationSafeguardResult;
  confidence_score_proxy: number;
  trace: DynamicScoringTrace[];
  limitations: string[];
  methodology_version: string;
  calibration_status: CalibrationStatus;
}
