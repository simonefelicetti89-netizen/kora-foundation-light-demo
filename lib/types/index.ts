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
  | 'economic_relief'             // meal vouchers, fuel vouchers, shopping vouchers, generic fringe
  | 'family_and_care'             // childcare, asilo nido, caregiver support, elderly assistance
  | 'health_and_wellbeing'        // preventive health, psychological support, mental health, nutrition
  | 'professional_growth'         // training, upskilling, reskilling, certifications, coaching
  | 'inclusion_and_connection'    // mentoring, peer support, inclusion programs, cross-functional
  | 'territorial_impact'          // volunteering, community projects, territorial initiatives
  | 'future_and_legacy'           // pension support, long-term employability, knowledge transfer
  | 'trust_and_flexibility_policy' // structural org policies: leave, flexibility, autonomy, solidarity
  | 'blocked_compliance';         // HSE/legal mandatory, DVR, DUVRI, DPI, mandatory safety training

export type EventNature =
  | 'monetary_benefit'         // cash-like: vouchers, fringe benefits, gift cards
  | 'consumed_service'         // welfare service actually used by worker
  | 'training'                 // learning event (may be mandatory or voluntary)
  | 'policy'                   // company policy or program enrollment
  | 'structural_policy'        // formalized organizational policy — aggregate-only, no individual usage data
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

// ── Structural Policy Activation — Trust & Flexibility ──────────────────────────
// Structural organizational policies are a third activation input class in KORA:
//   1. Event/program-based activation (consumed_service, training, etc.)
//   2. Budget/partner-mediated activation (partner_service, welfare programs)
//   3. Structural policy activation (structural_policy — this type)
// Structural policies flow into the existing IU → Aggregation → KORA Index v3 pipeline.
// KORA Index v3 macroblocks and weights remain unchanged.
// Privacy rule: individual_usage_visible = false on all structural_policy records.

export type StructuralPolicySubtype =
  | 'time_autonomy_policy'            // ferie illimitate, gestione autonoma del tempo
  | 'enhanced_leave_policy'           // congedo parentale migliorativo, congedo paternità aggiuntivo
  | 'parental_care_policy'            // politica parental care, leave per neo-genitori
  | 'caregiving_flexibility_policy'   // ROL aggiuntivi caregiver/disabilità, flessibilità cura-lavoro
  | 'hybrid_work_policy'              // smart working policy, lavoro ibrido strutturato
  | 'right_to_disconnect_policy'      // diritto alla disconnessione formalizzato
  | 'meeting_hygiene_policy'          // no meeting zone, finestre senza riunioni
  | 'work_life_campus_policy'         // Kids@Campus, Dog@Campus, campus family-friendly
  | 'solidarity_leave_policy'         // fondo solidarietà ferie, ferie solidali tra colleghi
  | 'inclusive_work_arrangement'      // accordi inclusione, ROL aggiuntivi per personale con invalidità
  | 'collective_agreement_people_policy'; // accordo integrativo migliorativo CCNL-plus people

export interface StructuralPolicyRecord {
  policy_id: string;
  company_id: string;
  policy_name: string;
  policy_name_it?: string;
  policy_subtype: StructuralPolicySubtype;
  action_family: 'trust_and_flexibility_policy';
  event_nature: 'structural_policy';
  // Formalization
  formalized_policy: boolean;
  policy_evidence_reference: string;
  // Coverage — aggregate only, never individual
  eligible_population: number;
  covered_population: number;
  coverage_rate: number; // 0–1
  applicable_roles_or_clusters: string[];
  // Validity
  start_date: string;
  end_date?: string;
  recurring_or_structural: boolean;
  // Privacy constraints — constitutional
  usage_data_available: false; // individual usage data never collected
  usage_aggregation_level: 'company_level' | 'cluster_level' | 'none';
  privacy_threshold_applied: boolean;
  individual_usage_visible: false; // non-suppressible
  budget_mediated: false;          // structural policies have no direct cost
  // Scoring inputs
  policy_depth: DepthLevel;
  accessibility_score: number; // 0–1: how easy is access across workforce segments
  duration_months: number;
  equity_review_required: boolean;
  beyond_legal_minimum: boolean; // must be true for eligible classification
  notes?: string;
}

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
  // Non-budget-mediated activation (structural policies) — separate from spend-based IUs
  // cost_per_impact_unit applies only to budget_mediated IUs; policy IUs are excluded from cost calc.
  non_budget_mediated_iu_count?: number;  // IUs generated by structural policies (no direct cost)
  structural_policy_iu_count?: number;    // subset of non_budget_mediated — trust_and_flexibility_policy IUs
  non_budget_mediated_activation_note?: string; // canonical doctrine copy — non-suppressible when present
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
  | 'company_policy_register' // structural organizational policies — aggregate-only
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
  // Structural policy metadata — only set for trust_and_flexibility_policy records
  budget_mediated?: boolean;         // false for structural policies; true or undefined for all others
  individual_usage_visible?: boolean; // false for structural policies; non-suppressible
  structural_policy_subtype?: StructuralPolicySubtype;
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
  // Legacy equal weights — removed. Not canonical for KORA Index v3.
  weights?: Record<string, number>;
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

// ── Service-compatible types ─────────────────────────────────────────────────
// Structurally identical to types exported by their respective service files.
// Defined here so CompanyDecisionPack can reference them without circular imports.
// TypeScript structural typing guarantees assignment compatibility.

export interface ConfidenceRecord {
  id: string;
  company_id: string;
  scenario_id: string;
  confidence_score: number;
  confidence_level: string;
  data_completeness: number;
  evidence_quality: number;
  mapping_confidence: number;
  verification_weight: number;
  source_coverage: Record<string, string>;
  gaps_identified: string[];
  limitations: string;
  methodology_version_id: string;
  calibration_status: string;
}

export interface EligibilityGateSummary {
  blocked_count: number;
  blocked_note: string;
  limited_count: number;
  limited_note: string;
  eligible_row_count: number;
  total_row_count: number;
}

export interface ExplainabilityComponentRef {
  code: string;
  label: string;
  value: number;
  explanation: string;
}

export interface ExplainabilityAction {
  priority: number;
  action: string;
  detail: string;
  target_components: string[];
}

export interface ExplainabilityRecord {
  id: string;
  company_id: string;
  scenario_id: string;
  reporting_period: string;
  kora_index_output_id: string;
  methodology_version_id: string;
  calibration_status: string;
  kora_index_explanation: string;
  safeguard_explanation?: string;
  explanations: ExplainabilityComponentRef[];
  strong_components: ExplainabilityComponentRef[];
  weak_components: ExplainabilityComponentRef[];
  next_best_actions: ExplainabilityAction[];
  limitations_statement: string;
  individual_worker_data_present: false;
}

export interface PillarBudgetLine {
  pillar: string;
  allocated: number;
  used: number;
  utilization_rate: number;
  programs: string[];
  economic_relief_included?: boolean;
}

// ── Decision Pack types (Block 4) ─────────────────────────────────────────────

export type DecisionPackStatus =
  | 'draft'
  | 'data_review_required'
  | 'advisor_review_required'
  | 'ready'
  | 'exported'
  | 'archived'
  | 'blocked';

// Report Factory types
export type DecisionPackVersionStatus =
  | 'draft'
  | 'ready'
  | 'advisor_review_required'
  | 'data_review_required'
  | 'blocked'
  | 'archived';

export type DecisionPackGenerationMode =
  | 'synthetic_demo'
  | 'foundation_light_preview'
  | 'future_production';

export interface DecisionPackFactoryStatus {
  company_id: string;
  tenant_id: string;
  latest_version_id?: string;
  latest_status: DecisionPackStatus;
  can_generate: boolean;
  can_export_pdf: boolean;
  can_share: boolean;
  blocking_reasons: string[];
  warnings: string[];
  next_action: string;
}

export interface DecisionPackChangeSummary {
  from_version_id: string;
  to_version_id: string;
  kora_index_delta?: number;
  confidence_delta?: number;
  main_changes: string[];
  methodology_changed: boolean;
  data_sources_changed: boolean;
  limitations_changed: boolean;
}

// Semester comparison types (Block 5)
export type DecisionPackComparisonMode =
  | 'semester_over_semester'
  | 'previous_version'
  | 'not_available';

export type DecisionPackMetricTrend =
  | 'improved'
  | 'stable'
  | 'declined'
  | 'not_comparable'
  | 'not_available';

export interface DecisionPackMetricDelta {
  metric_id: string;
  label: string;
  current_value: number | null;
  previous_value?: number | null;
  delta_abs?: number;
  delta_pct?: number;
  trend: DecisionPackMetricTrend;
  interpretation: string;
  comparable: boolean;
}

export interface DecisionPackPeriodComparison {
  comparison_mode: DecisionPackComparisonMode;
  reporting_period: string;
  reporting_period_label: string;
  previous_version_id?: string;
  previous_period_label?: string;
  comparable_with_previous: boolean;
  methodology_version_id_current: string;
  methodology_version_id_previous?: string;
  methodology_comparable: boolean;
  comparability_notes: string;
  metric_deltas: DecisionPackMetricDelta[];
}

export type DecisionPackSectionCode =
  | 'cover'
  | 'executive_summary'
  | 'kora_index_v3'
  | 'dynamic_scoring_preview'
  | 'eligibility_gate'
  | 'budget_to_human_impact'
  | 'economic_relief'
  | 'uef_review_data_quality'
  | 'people_context_hr_kpi'
  | 'workforce_activation'
  | 'pillar_analysis'
  | 'recommendations'
  | 'ninety_day_action_plan'
  | 'methodology_boundaries';

export type DecisionPackAudience =
  | 'executive'
  | 'hr'
  | 'cfo'
  | 'esg'
  | 'advisor'
  | 'founder';

export interface DecisionPackMetric {
  code: string;
  label: string;
  value: string | number;
  unit?: string;
  scenario_value_previous?: string | number;
  delta?: number;
  interpretation: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  limitation?: string;
}

export interface DecisionPackInsight {
  id: string;
  title: string;
  body: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  audience: DecisionPackAudience[];
  related_section: DecisionPackSectionCode;
  source: string;
  limitation?: string;
}

export interface DecisionPackRecommendation {
  id: string;
  title: string;
  rationale: string;
  recommended_action: string;
  priority: 'alta' | 'media' | 'bassa';
  owner_suggestion: string;
  horizon: '0-30gg' | '30-60gg' | '60-90gg' | 'ongoing';
  related_metric?: string;
  expected_direction: string;
  caveat: string;
}

export interface DecisionPackSection {
  code: DecisionPackSectionCode;
  title: string;
  subtitle?: string;
  audience: DecisionPackAudience[];
  summary: string;
  metrics: DecisionPackMetric[];
  insights: DecisionPackInsight[];
  recommendations: DecisionPackRecommendation[];
  limitations: string[];
  methodology_notes?: string;
}

export interface DecisionPackVersion {
  version_id: string;
  company_id: string;
  company_name: string;
  period: string;
  created_at: string;
  status: DecisionPackStatus;
  methodology_version: string;
  calibration_status: CalibrationStatus;
  confidence_score: number;
  advisor_review_status: string;
  data_readiness: string;
  export_status: string;
  // V2 factory fields (optional for backwards compatibility)
  tenant_id?: string;
  title?: string;
  generated_by_role?: string;
  generation_mode?: DecisionPackGenerationMode;
  kora_index_value?: number | null;
  activation_safeguard_status?: string | null;
  decision_pack_status?: string;
  source_snapshot_ids?: string[];
  sections_included?: string[];
  limitations?: string[];
  blocking_reasons?: string[];
  change_summary?: string;
  production_ready?: false;
  synthetic_demo_data?: true;
  // Period comparison fields (Block 5)
  reporting_period_label?: string;
  previous_version_id?: string;
  previous_period_label?: string;
  comparison_mode?: DecisionPackComparisonMode;
}

export interface DecisionPackExportAction {
  label: string;
  icon: string;
  demo_only: boolean;
  disabled: boolean;
  note: string;
  // V2 factory fields
  action_id?: string;
  type?: 'pdf' | 'share_link' | 'board_summary' | 'advisor_review' | 'archive';
  enabled?: boolean;
  reason_disabled?: string;
  future_capability?: boolean;
}

export interface CompanyDecisionPack {
  // Cover / metadata
  report_id: string;
  company_id: string;
  company_name: string;
  period: string;
  generated_at: string;
  status: DecisionPackStatus;
  methodology_version: string;
  calibration_status: CalibrationStatus;
  scenario_id: ScenarioId;
  scenario_label: string;
  production_ready: false;
  synthetic_demo_data: true;

  // Status / readiness
  data_readiness: 'high' | 'medium' | 'low';
  advisor_review_status: 'not_required' | 'recommended' | 'required' | 'in_review' | 'reviewed';
  export_status: 'demo_only';

  // Raw service outputs (passed to existing rendering components)
  kora_index_output: KoraIndexOutput;
  s1_kora_output: KoraIndexOutput;
  s2_kora_output: KoraIndexOutput;
  s1_macroblocks: MacroblockScore[];
  s2_macroblocks: MacroblockScore[];
  activation_safeguard: ActivationSafeguardResult | null;
  confidence_record: ConfidenceRecord | null;
  confidence_score: number;
  bti_record_s1: BudgetToHumanImpactRecord | null;
  bti_record_s2: BudgetToHumanImpactRecord | null;
  bti_recommendations: BudgetToHumanImpactRecommendation[];
  eligibility_gate: EligibilityGateSummary;
  explanation: ExplainabilityRecord | null;
  pillar_budget: PillarBudgetLine[];

  // Block 3 and IU data
  dynamic_preview: DynamicScoringPreviewOutput;
  uef_review_summary: UEFReviewSummary;
  iu_summary: ImpactUnitComputationSummary;

  // Generated report structure
  sections: DecisionPackSection[];
  top_insights: DecisionPackInsight[];
  top_recommendations: DecisionPackRecommendation[];
  limitations: string[];
  privacy_boundary: string;
  export_actions: DecisionPackExportAction[];
  version_history: DecisionPackVersion[];
}

// ── Company Onboarding Studio ───────────────────────────────────────────────────

export type CompanyOnboardingStatus =
  | 'not_started'
  | 'profile_complete'
  | 'workforce_baseline_complete'
  | 'program_data_loaded'
  | 'hr_kpi_added'
  | 'readiness_check_passed'
  | 'pipeline_active'
  | 'decision_pack_ready'
  | 'blocked_insufficient_workforce';

export interface CompanySite {
  site_id: string;
  name: string;
  location: string;
  employee_count: number;
  privacy_threshold_met: boolean;
  included_in_breakdown: boolean;
}

export interface WorkforceCluster {
  cluster_id: string;
  cluster_type: 'site' | 'department' | 'role_family' | 'seniority_band' | 'contract_type' | 'other';
  label: string;
  employee_count: number;
  privacy_threshold_met: boolean;
  included_in_breakdown: boolean;
  suppression_reason?: string;
}

export interface CompanyProfile {
  company_id: string;
  company_name: string;
  legal_form: string;
  sector: string;
  location: string;
  employee_count: number;
  foundation_year: number;
  contact_role: string;
  synthetic_demo_data: true;
}

export interface WorkforceBaseline {
  company_id: string;
  total_employees: number;
  foundation_light_eligible: boolean;
  eligibility_note: string;
  sites: CompanySite[];
  clusters: WorkforceCluster[];
  privacy_threshold: number;
  suppressed_cluster_count: number;
  suppression_note: string;
}

export interface RawProgramDataSummary {
  company_id: string;
  total_programs: number;
  welfare_programs: number;
  training_programs: number;
  volunteering_programs: number;
  collective_programs: number;
  total_budget_eur: number;
  welfare_budget_eur: number;
  training_budget_eur: number;
  period: string;
  data_sources: string[];
  upload_status: 'loaded' | 'partial' | 'not_started';
  upload_note: string;
}

export interface HRKPIContextRecord {
  kpi_id: string;
  label: string;
  value: number;
  unit: string;
  period: string;
  source: string;
  used_in_kora_index: false;
  context_only: true;
  interpretation: string;
}

export interface HRKPIContextSummary {
  company_id: string;
  records: HRKPIContextRecord[];
  correlation_disclaimer: string;
  used_in_kora_index: false;
  context_only: true;
}

export type OnboardingReadinessStatus = 'ok' | 'warning' | 'blocked';

export interface OnboardingReadinessCheck {
  check_id: string;
  label: string;
  status: OnboardingReadinessStatus;
  detail: string;
  blocking: boolean;
}

export interface PipelineStageLink {
  stage: string;
  label: string;
  href: string;
  status: 'active' | 'pending' | 'not_started';
  description: string;
}

export interface CompanyOnboardingRecord {
  company_id: string;
  company_name: string;
  onboarding_status: CompanyOnboardingStatus;
  profile: CompanyProfile;
  workforce_baseline: WorkforceBaseline;
  program_data_summary: RawProgramDataSummary;
  hr_kpi_context: HRKPIContextSummary;
  readiness_checks: OnboardingReadinessCheck[];
  pipeline_links: PipelineStageLink[];
  synthetic_demo_data: true;
  production_ready: false;
}

// ── Company Setup (Block 7) ─────────────────────────────────────────────────────

export type CompanySetupStatus =
  | 'not_started'
  | 'draft'
  | 'validated'
  | 'pipeline_ready'
  | 'blocked_below_threshold';

export type CompanySizeBand =
  | 'small_30_49'
  | 'mid_50_249'
  | 'large_250_999'
  | 'enterprise_1000_plus';

export interface CompanySetupTemplate {
  template_id: string;
  label: string;
  size_band: CompanySizeBand;
  description: string;
  suggested_pillars: string[];
  activation_benchmark_note: string;
  recommended_for: string[];
}

export interface CompanySetupInput {
  company_name: string;
  legal_name: string;
  sector: string;
  size_band: CompanySizeBand;
  headcount: number;
  headquarters_city: string;
  multi_site: boolean;
  site_count?: number;
  primary_contact_name: string;
  primary_contact_role: string;
  reporting_year: string;
  preferred_template_id?: string;
  notes?: string;
}

export interface CompanySetupValidationResult {
  is_valid: boolean;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
  headcount_eligible: boolean;
  min_headcount_required: 30;
}

export interface WorkforceBaselinePreview {
  headcount: number;
  size_band: CompanySizeBand;
  multi_site: boolean;
  site_count: number;
  eligible_for_pipeline: boolean;
  cluster_note: string;
  privacy_threshold_note: string;
}

export interface CompanySetupDraft {
  draft_id: string;
  created_at: string;
  status: CompanySetupStatus;
  input: CompanySetupInput;
  validation: CompanySetupValidationResult;
  workforce_preview: WorkforceBaselinePreview;
  template: CompanySetupTemplate | null;
  pipeline_handoff: CompanySetupPipelineLink[];
  demo_session_only: true;
  production_ready: false;
  synthetic_demo_data: true;
}

export interface CompanySetupOption {
  value: string;
  label: string;
  description?: string;
}

export interface CompanySetupPipelineLink {
  stage: string;
  label: string;
  href: string;
  available: boolean;
  note: string;
}

// ── Workforce Baseline Upload ───────────────────────────────────────────────────

export type WorkforceBaselineUploadStatus =
  | 'not_started'
  | 'uploaded'
  | 'validated'
  | 'needs_review'
  | 'below_company_threshold'
  | 'privacy_suppression_required'
  | 'ready_for_aggregation';

export type WorkforceBaselineSourceType =
  | 'csv_upload_demo'
  | 'hris_export_demo'
  | 'manual_aggregate_entry'
  | 'synthetic_seed'
  | 'future_api';

export type WorkforceDimensionType =
  | 'site'
  | 'department'
  | 'role_family'
  | 'seniority_band'
  | 'contract_type'
  | 'employment_status'
  | 'other';

export interface WorkforceBaselineUploadBatch {
  batch_id: string;
  company_id: string;
  company_name: string;
  source_type: WorkforceBaselineSourceType;
  source_file_name: string;
  uploaded_at: string;
  uploaded_by: string;
  upload_status: WorkforceBaselineUploadStatus;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  missing_fields: string[];
  validation_warnings: string[];
  synthetic_demo_data: true;
  production_ready: false;
}

export interface WorkforceAggregateGroup {
  group_id: string;
  company_id: string;
  dimension_type: WorkforceDimensionType;
  dimension_label: string;
  employee_count: number;
  share_of_workforce: number;
  privacy_threshold: number;
  privacy_threshold_met: boolean;
  included_in_breakdown: boolean;
  suppression_reason?: string;
  merged_into_group_id?: string;
  data_completeness: number;
  notes?: string;
}

export interface WorkforceBaselineValidationResult {
  company_id: string;
  company_name: string;
  total_workers: number;
  minimum_company_threshold: number;
  minimum_company_threshold_met: boolean;
  privacy_threshold: number;
  total_groups: number;
  visible_groups: number;
  suppressed_groups: number;
  aggregate_only_groups: number;
  missing_required_fields: string[];
  duplicate_rate: number;
  invalid_row_rate: number;
  baseline_completeness_score: number;
  readiness_status: WorkforceBaselineUploadStatus;
  warnings: string[];
  limitations: string[];
}

export interface WorkforceBaselineReadiness {
  activation_reach_ready: boolean;
  distribution_equity_ready: boolean;
  site_breakdown_ready: boolean;
  department_breakdown_ready: boolean;
  role_family_breakdown_ready: boolean;
  privacy_safe_for_company_view: boolean;
  confidence_contribution: 'high' | 'medium' | 'low';
  next_action: string;
}

export interface WorkforceBaselineRecord {
  company_id: string;
  company_name: string;
  upload_batch: WorkforceBaselineUploadBatch;
  validation_result: WorkforceBaselineValidationResult;
  aggregate_groups: WorkforceAggregateGroup[];
  readiness: WorkforceBaselineReadiness;
  privacy_boundary: string;
  methodology_notes: string;
  pipeline_links: PipelineStageLink[];
}

// ── Access Control Foundation ───────────────────────────────────────────────────
// Foundation Light active product roles are intentionally simplified.
// Granular HR/ESG/Finance/Executive permissions are future permission layers, not active MVP roles.

export type ActiveProductRole =
  | 'KORA_ADMIN'
  | 'COMPANY_ADMIN'
  | 'COMPANY_VIEWER'
  | 'WORKER'
  | 'PARTNER'
  | 'ADVISOR';

// KoraUserRole — canonical 6-role union for Foundation Light.
// Broader internal roles (KORA_ANALYST, FOUNDER_INTERNAL, COMPANY_HR, COMPANY_FINANCE, etc.)
// are future/internal permission layers and are not active product roles.
export type KoraUserRole = ActiveProductRole;

export type KoraAccessScope =
  | 'global_admin'
  | 'company_scoped'
  | 'partner_scoped'
  | 'worker_private';

export interface KoraDemoUser {
  user_id: string;
  display_name: string;
  role: KoraUserRole;
  access_scope: KoraAccessScope;
  company_id?: string;
  partner_id?: string;
  can_access_admin: boolean;
  can_access_company_portal: boolean;
  allowed_routes: string[];
  notes: string;
}

export interface CompanyAccessProfile {
  company_id: string;
  company_name: string;
  allowed_company_roles: KoraUserRole[];
  default_company_route: string;
  visible_company_sections: string[];
  hidden_operational_sections: string[];
  admin_managed_sections: string[];
}

// ── Enterprise SaaS Backbone — Tenant & Account Lifecycle ──────────────────────

export type KoraTenantStatus =
  | 'draft'
  | 'active'
  | 'suspended'
  | 'archived'
  | 'deleted_demo';

export type KoraAccountStatus =
  | 'draft'
  | 'invited'
  | 'active_demo'
  | 'suspended'
  | 'disabled'
  | 'revoked'
  | 'deleted_demo';

export type KoraInvitationStatus =
  | 'not_sent'
  | 'pending'
  | 'accepted'
  | 'revoked'
  | 'expired';

export interface KoraTenant {
  tenant_id: string;
  company_id: string;
  company_name: string;
  legal_name: string;
  vat_number?: string;
  fiscal_code?: string;
  sector: string;
  territory: string;
  headquarters_location: string;
  employee_count: number;
  size_band: CompanySizeBand;
  kora_plan: string;
  analysis_period: string;
  tenant_status: KoraTenantStatus;
  onboarding_status: string;
  data_readiness_status: string;
  decision_pack_status: string;
  assigned_advisor?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  deleted_demo_at?: string;
  production_ready: false;
  synthetic_demo_data: true;
}

export interface KoraUserAccount {
  user_id: string;
  tenant_id?: string;
  company_id?: string;
  worker_id?: string;
  display_name: string;
  email: string;
  role: KoraUserRole;
  access_scope: KoraAccessScope;
  account_status: KoraAccountStatus;
  default_route: string;
  visible_sections: string[];
  hidden_sections: string[];
  invitation_status: KoraInvitationStatus;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  disabled_at?: string;
  revoked_at?: string;
  deleted_demo_at?: string;
  notes?: string;
}

export interface CompanyAdminProvisioningDraft {
  provisioning_id: string;
  tenant_id: string;
  company_id: string;
  admin_name: string;
  admin_email: string;
  admin_role: KoraUserRole;
  access_scope: 'company_scoped';
  invitation_status: KoraInvitationStatus;
  default_route: string;
  visible_sections: string[];
  hidden_sections: string[];
  password_setup_mode: 'invite_link' | 'temporary_password_manual_demo' | 'external_auth_pending';
  security_notes: string;
  production_ready: false;
  demo_only: true;
}

export interface WorkerRosterRecord {
  worker_id: string;
  tenant_id: string;
  company_id: string;
  display_name?: string;
  email?: string;
  role_family: string;
  site: string;
  department: string;
  cluster?: string;
  worker_account_status: KoraAccountStatus;
  consent_status: 'not_collected' | 'pending' | 'granted' | 'revoked';
  my_kora_enabled: boolean;
  pib_private_enabled: boolean;
  employer_can_view_individual_pib: false;
  included_in_aggregates: boolean;
  privacy_threshold_cluster: boolean;
  created_at: string;
}

export interface WorkerProvisioningSummary {
  company_id: string;
  total_workers: number;
  invited_workers: number;
  active_worker_accounts: number;
  my_kora_enabled_count: number;
  pib_private_enabled_count: number;
  suppressed_clusters_count: number;
  privacy_notes: string;
  next_action: string;
}

export type TenantLifecycleAction =
  | 'create_draft'
  | 'activate'
  | 'suspend'
  | 'archive'
  | 'restore'
  | 'delete_demo';

export type UserLifecycleAction =
  | 'invite'
  | 'activate_demo'
  | 'suspend'
  | 'disable'
  | 'revoke_invite'
  | 'reset_invite'
  | 'delete_demo';

export interface LifecycleAuditEvent {
  event_id: string;
  actor_role: KoraUserRole;
  actor_id: string;
  target_type: 'tenant' | 'user' | 'worker';
  target_id: string;
  action: TenantLifecycleAction | UserLifecycleAction;
  reason?: string;
  timestamp: string;
  reversible: boolean;
  notes?: string;
}

export interface TenantReadiness {
  company_identity: string;
  operating_scope: string;
  budget_fiscal_perimeter: string;
  data_sources: string;
  structural_policies: string;
  first_company_admin: string;
  worker_roster: string;
  privacy_boundary: string;
  portal_activation: string;
  pipeline_readiness: string;
}

export type ReadinessItemStatus =
  | 'blocked'
  | 'draft'
  | 'data_required'
  | 'access_required'
  | 'privacy_review_required'
  | 'ready_for_pipeline'
  | 'ready_for_company_portal';

// ── Tenant-Scoped Admin Data Intake ─────────────────────────────────────────────

export type CompanyDataIntakeStatus =
  | 'not_started'
  | 'draft'
  | 'partial'
  | 'validation_required'
  | 'ready_for_ingestion'
  | 'blocked_missing_required_fields';

export type FiscalPerimeterCode =
  | 'welfare'
  | 'fringe_benefit'
  | 'people_esg'
  | 'training'
  | 'territorial_community'
  | 'pension_future'
  | 'compliance_excluded'
  | 'unknown';

export type FiscalDefaultEligibility = 'eligible' | 'limited' | 'blocked' | 'review_required';
export type FiscalActivationDepth = 'high' | 'medium' | 'low' | 'none';

export interface FiscalPerimeterAllocation {
  perimeter_code: FiscalPerimeterCode;
  label: string;
  description: string;
  allocated_budget_eur: number;
  committed_budget_eur: number;
  spent_budget_eur: number;
  available_budget_eur: number;
  default_eligibility: FiscalDefaultEligibility;
  activation_depth: FiscalActivationDepth;
  compatible_pillars: PillarCode[];
  compatible_partner_categories: string[];
  compatible_action_families: ActionFamily[];
  fiscal_notes: string;
  methodology_notes: string;
  risk_flags: string[];
}

export interface CompanyBudgetFiscalPlan {
  company_id: string;
  tenant_id: string;
  period: string;
  total_people_welfare_budget_eur: number;
  fiscal_perimeters: FiscalPerimeterAllocation[];
  economic_relief_budget_eur: number;
  deep_activation_budget_eur: number;
  structural_policy_non_budget_mediated_count: number;
  compliance_excluded_budget_eur: number;
  unallocated_budget_eur: number;
  reallocation_opportunity_eur: number;
  allocation_quality_score: number;
  status: CompanyDataIntakeStatus;
  next_action: string;
  limitations: string[];
  synthetic_demo_data: true;
}

export type RawDataSourceType =
  | 'welfare_provider_export'
  | 'lms_training_export'
  | 'finance_budget_export'
  | 'hr_people_program_file'
  | 'esg_community_file'
  | 'company_policy_register'
  | 'collective_agreement_file'
  | 'manual_admin_entry'
  | 'synthetic_demo_file'
  | 'future_api';

export type RawDataRowCategory =
  | 'welfare_program'
  | 'training_program'
  | 'people_program'
  | 'budget_allocation'
  | 'economic_relief'
  | 'hse_compliance'
  | 'legal_compliance'
  | 'esg_community'
  | 'provider_evidence'
  | 'organizational_policy'
  | 'structural_policy'
  | 'unknown';

export type RawDataMandatoryStatus =
  | 'voluntary'
  | 'mandatory_legal'
  | 'mandatory_role'
  | 'mandatory_company_policy'
  | 'unknown';

export type RawDataEvidenceStatus =
  | 'formal_policy_document'
  | 'collective_agreement_signed'
  | 'board_approval_record'
  | 'hr_policy_register'
  | 'certified_partner'
  | 'provider_report'
  | 'invoice_or_budget_record'
  | 'internal_admin_record'
  | 'self_declared'
  | 'missing'
  | 'unknown';

export type RawDataUploadStatus =
  | 'draft'
  | 'uploaded'
  | 'validated'
  | 'review_required'
  | 'approved'
  | 'rejected';

export interface CompanyRawDataBatch {
  batch_id: string;
  tenant_id: string;
  company_id: string;
  company_name: string;
  source_name: string;
  source_type: RawDataSourceType;
  source_file_name: string;
  uploaded_at: string;
  uploaded_by: string;
  upload_status: RawDataUploadStatus;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  missing_required_fields_count: number;
  ready_for_ingestion_count: number;
  blocked_candidate_count: number;
  limited_candidate_count: number;
  structural_policy_count: number;
  review_required_candidate_count: number;
  synthetic_demo_data: true;
  production_ready: false;
}

export interface CompanyRawDataRow {
  row_id: string;
  tenant_id: string;
  company_id: string;
  batch_id: string;
  raw_name: string;
  raw_description: string;
  source_type: RawDataSourceType;
  row_category: RawDataRowCategory;
  fiscal_perimeter: FiscalPerimeterCode;
  mandatory_status: RawDataMandatoryStatus;
  provider_name?: string;
  amount_eur?: number;
  period: string;
  target_population: string;
  site_or_cluster: string;
  evidence_status: RawDataEvidenceStatus;
  evidence_reference: string;
  action_family_hint: ActionFamily;
  event_nature_hint: EventNature;
  expected_eligibility_hint: 'eligible' | 'limited' | 'blocked' | 'review_required';
  budget_mediated: boolean;
  individual_usage_visible: boolean;
  missing_fields: string[];
  validation_warnings: string[];
  ready_for_ingestion: boolean;
  notes: string;
}

export interface CompanyDataReadinessSummary {
  tenant_id: string;
  company_id: string;
  intake_status: CompanyDataIntakeStatus;
  fiscal_plan_status: 'not_started' | 'draft' | 'partial' | 'complete';
  batch_count: number;
  total_rows: number;
  ready_for_ingestion_rows: number;
  eligible_candidate_rows: number;
  limited_candidate_rows: number;
  blocked_candidate_rows: number;
  structural_policy_rows: number;
  review_required_rows: number;
  missing_fields_count: number;
  data_quality_score: number;
  ingestion_ready: boolean;
  kora_index_available: boolean;
  decision_pack_available: boolean;
  next_action: string;
  limitations: string[];
}
