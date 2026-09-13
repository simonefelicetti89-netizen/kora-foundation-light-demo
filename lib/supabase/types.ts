// ─── KORA Supabase Database Types ─────────────────────────────────────────────
// Hand-written TypeScript types matching supabase/migrations/ canonical state.
// Schema verified against live Supabase DB (all tables HTTP 200, 2026-05-30).
//
// Generated-type status:
//   npx supabase gen types typescript requires SUPABASE_ACCESS_TOKEN (personal
//   access token from Supabase dashboard), which is not available in this env.
//   Types are hand-maintained and verified against information_schema.
//   See docs/test-routes-removal-before-production.md for full context.
//
// Format: matches @supabase/supabase-js v2 GenericDatabase constraint so that
//   createClient<Database> enables typed .schema() → .from() → .select() chains
//   without blanket `as any` on the entire client.
//   Each schema must include: Tables, Views, Functions, Enums, CompositeTypes.
// ──────────────────────────────────────────────────────────────────────────────

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ── analytics.tenant ──────────────────────────────────────────────────────────

export interface TenantRow {
  id: string;
  tenant_code: string;
  company_name: string;
  industry_code: string | null;
  country_code: string;
  onboarding_status: string;
  data_readiness_status: string;
  decision_pack_status: string;
  methodology_version_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type TenantInsert = Omit<TenantRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// ── analytics.company_memberships (KORA-WP-004) ──────────────────────────────

export interface CompanyMembershipRow {
  id: string;
  tenant_id: string;
  auth_user_id: string;
  role: string;
  status: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CompanyMembershipInsert = Pick<CompanyMembershipRow, 'tenant_id' | 'auth_user_id'> & {
  id?: string;
  role?: string;
  status?: string;
  ended_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

// ── personal.workforce_baseline ───────────────────────────────────────────────

export interface WorkforceBaselineRow {
  id: string;
  tenant_id: string;
  reporting_period: string;
  total_workers: number;
  segment_breakdown: Json;
  privacy_threshold_applied: boolean;
  minimum_group_size: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ── personal.worker_identity ──────────────────────────────────────────────────

export interface WorkerIdentityRow {
  id: string;
  tenant_id: string;
  auth_user_id: string;
  worker_ref: string;
  status: 'invited' | 'active' | 'pending' | 'disabled';
  invited_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── personal.worker_profile_private ──────────────────────────────────────────

export interface WorkerProfilePrivateRow {
  id: string;
  worker_id: string;
  tenant_id: string;
  display_name: string | null;
  onboarding_done: boolean;
  consent_version: string | null;
  created_at: string;
  updated_at: string;
}

// ── personal.worker_initiative ────────────────────────────────────────────────
// Published by KORA_ADMIN per tenant. Workers see published initiatives only.
// Company roles have NO direct access — aggregates via service-role app layer.

export type WorkerInitiativeStatus = 'draft' | 'published' | 'closed';
export type PillarCode = 'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY';

export interface WorkerInitiativeRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  pillar: PillarCode;
  eligibility_class: 'eligible' | 'limited';
  status: WorkerInitiativeStatus;
  start_date: string | null;
  end_date: string | null;
  mode: string | null;
  location: string | null;
  provider: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkerInitiativeInsert = Omit<WorkerInitiativeRow, 'id' | 'created_at' | 'updated_at'>;

// ── personal.worker_participation ─────────────────────────────────────────────
// Worker-private. Never accessible by company roles — no RLS policy on company.
// private_note is worker-only and NEVER returned in any employer-facing response.

export type WorkerParticipationStatus = 'interested' | 'registered' | 'attended' | 'cancelled';

export interface WorkerParticipationRow {
  id: string;
  tenant_id: string;
  worker_id: string;
  initiative_id: string;
  status: WorkerParticipationStatus;
  private_note: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkerParticipationInsert = Omit<WorkerParticipationRow, 'id' | 'created_at' | 'updated_at'>;
export type WorkerParticipationUpdate = Pick<WorkerParticipationRow, 'status' | 'private_note'>;

// ── analytics.source_batch ────────────────────────────────────────────────────

export interface SourceBatchRow {
  id: string;
  tenant_id: string;
  source_type: string;
  source_name: string | null;
  reporting_period: string;
  row_count: number;
  mapped_count: number;
  rejected_count: number;
  batch_status: 'pending' | 'processing' | 'approved' | 'rejected' | 'partial';
  completeness_pct: number | null;
  mapping_confidence_avg: number | null;
  evidence_attached_pct: number | null;
  pending_review_count: number;
  source_notes: string | null;
  payload_sample: Json | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  created_by: string | null;
}

// ── personal.uploaded_record ──────────────────────────────────────────────────

export interface UploadedRecordRow {
  id: string;
  tenant_id: string;
  batch_id: string;
  pseudonym_id: string;
  raw_hash: string;
  eligibility_status: 'eligible' | 'limited' | 'blocked' | 'review_required' | null;
  primary_pillar: string | null;
  action_family: string | null;
  event_nature: string | null;
  review_status: 'pending' | 'approved' | 'rejected' | 'needs_more_data';
  payload: Json;
  privacy_redacted: boolean;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
}

// ── analytics.uef_record ──────────────────────────────────────────────────────

export interface UefRecordRow {
  id: string;
  tenant_id: string;
  batch_id: string;
  reporting_period: string;
  raw_name: string;
  eligibility: 'eligible' | 'limited' | 'blocked';
  primary_pillar: string | null;
  action_family: string | null;
  event_nature: string | null;
  approved_for_scoring: boolean;
  approved_for_bti_governance: boolean;
  approved_for_impact_units: boolean;
  data_completeness_score: number;
  missing_fields: string[];
  review_status: string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  payload: Json;
  created_at: string;
  updated_at: string;
}

// ── analytics.kora_index_result ───────────────────────────────────────────────

export interface KoraIndexResultRow {
  id: string;
  tenant_id: string;
  reporting_period: string;
  methodology_version_id: string;
  kora_index_value: number;
  safeguard_status: 'CLEAR' | 'WARNING' | 'FLAGGED';
  calibration_status: string;
  limitations_text: string | null;
  components: Json;    // KoraIndexComponent[]
  macroblocks: Json;   // MacroblockScore[]
  scoring_run_id: string | null;
  confidence_result_id: string | null;
  activation_result_id: string | null;
  is_current: boolean;
  created_at: string;
}

// ── analytics.bti_result ──────────────────────────────────────────────────────

export interface BtiResultRow {
  id: string;
  tenant_id: string;
  reporting_period: string;
  total_people_welfare_budget: number;
  deep_activation_spend: number;
  economic_relief_spend: number;
  blocked_compliance_spend: number;
  activation_debt_eur: number;
  deep_activation_share: number;
  budget_evidence_quality: number;
  bti_score: number;
  cost_per_impact_unit: number | null;
  payload: Json;
  created_at: string;
  updated_at: string;
}

// ── analytics.activation_result ───────────────────────────────────────────────

export interface ActivationResultRow {
  id: string;
  tenant_id: string;
  reporting_period: string;
  total_workers: number;
  eligible_worker_count: number;
  active_worker_count: number;
  meaningful_active_worker_count: number;
  activation_rate: number;
  meaningful_activation_rate: number;
  continuity_rate: number;
  verification_rate: number;
  pillar_distribution: Json;         // Record<PillarCode, number>
  department_activation: Json;       // Record<string, number>
  privacy_threshold_met: boolean;
  methodology_version_id: string;
  calibration_status: string;
  created_at: string;
  updated_at: string;
}

// ── analytics.confidence_result ───────────────────────────────────────────────

export interface ConfidenceResultRow {
  id: string;
  tenant_id: string;
  reporting_period: string;
  confidence_score: number;
  confidence_level: string;
  data_completeness: number;
  evidence_quality: number;
  mapping_confidence: number;
  verification_weight: number;
  source_coverage: Json;     // Record<string, string>
  gaps_identified: string[];
  limitations: string;
  methodology_version_id: string;
  calibration_status: string;
  created_at: string;
  updated_at: string;
}

// ── analytics.impact_unit ─────────────────────────────────────────────────────
// Stage 10 of the 14-stage algorithm: IU_{e,p} = NM × BC × CQ × EV × CF × AGF
// No worker identity. No PIB. Aggregate-safe record-level only.
// factor_trace is stored as JSONB — never returned to employer-facing API responses.

export interface ImpactUnitRow {
  id:                  string;
  tenant_id:           string;
  uef_record_id:       string;
  source_batch_id:     string;
  reporting_period:    string;
  nm:                  number;
  bc:                  number;
  cq:                  number;
  ev:                  number;
  cf:                  number;
  agf:                 number;
  impact_units_total:  number;
  life_iu:             number;
  growth_iu:           number;
  connection_iu:       number;
  impact_iu:           number;
  legacy_iu:           number;
  computed:            boolean;
  exclusion_reason:    string | null;
  factor_trace:        Json;           // ImpactUnitFactorTrace[] — server-side only
  methodology_version: string;
  calibration_status:  string;
  created_at:          string;
}

// ── analytics.decision_pack_version ───────────────────────────────────────────

export interface DecisionPackVersionRow {
  id: string;
  tenant_id: string;
  version_id: string;
  reporting_period: string;
  status: 'draft' | 'data_review_required' | 'advisor_review_required' | 'ready' | 'exported' | 'archived' | 'blocked';
  kora_index_result_id: string | null;
  bti_result_id: string | null;
  activation_result_id: string | null;
  confidence_result_id: string | null;
  pack_payload: Json;
  created_at: string;
  updated_at: string;
  exported_at: string | null;
  archived_at: string | null;
  created_by: string | null;
}

// ── gov.budget_governance ─────────────────────────────────────────────────────

export interface BudgetGovernanceRow {
  id: string;
  tenant_id: string;
  reporting_period: string;
  fiscal_year: string;
  total_welfare_budget_declared: number;
  budget_evidence_level: 'L0_NO_EVIDENCE' | 'L1_SELF_DECLARED' | 'L2_INTERNAL_DOCUMENT' | 'L3_THIRD_PARTY_DOCUMENT' | 'L4_VERIFIED_EVIDENCE';
  budget_source_reference: string | null;
  advisor_validated: boolean;
  payload: Json;
  created_at: string;
  updated_at: string;
}

// ── audit.audit_log ───────────────────────────────────────────────────────────

export interface AuditLogRow {
  id: string;
  tenant_id: string | null;
  actor_role: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  payload: Json;
  ip_address: string | null;
  created_at: string;
  // No updated_at — append-only by design
}

// ── audit.governance_event (KORA-WP-005) ──────────────────────────────────────

export interface GovernanceEventRow {
  id: string;
  source_module: string;
  actor_role: string;
  actor_id: string;
  event_type: string;
  object_type: string | null;
  object_id: string | null;
  tenant_id: string | null;
  payload: Json;
  occurred_at: string;
  // No updated_at — append-only by design, DB-trigger-enforced
}

export type GovernanceEventInsert = Pick<GovernanceEventRow, 'source_module' | 'actor_role' | 'actor_id' | 'event_type'> & {
  id?: string;
  object_type?: string | null;
  object_id?: string | null;
  tenant_id?: string | null;
  payload?: Json;
  occurred_at?: string;
};

// ── analytics.observed_investment_fact (KORA-WP-014) ────────────────────────────

export interface ObservedInvestmentFactRow {
  id: string;
  tenant_id: string;
  source_batch_id: string | null;
  recorded_by_role: string;
  recorded_by_id: string;
  purpose: string;
  amount: string | number | null; // numeric column — comes back as string from postgres
  provider: string | null;
  population_descriptor: string | null;
  reach_summary: string | null;
  evidence_summary: string | null;
  unknown_fields: string[];
  commitment_ref: null; // always null — DB CHECK-enforced, see migration 053
  created_at: string;
  // No updated_at — no mutation path exists for this table
}

export type ObservedInvestmentFactInsert = Pick<
  ObservedInvestmentFactRow,
  'tenant_id' | 'recorded_by_role' | 'recorded_by_id' | 'purpose'
> & {
  id?: string;
  source_batch_id?: string | null;
  amount?: number | null;
  provider?: string | null;
  population_descriptor?: string | null;
  reach_summary?: string | null;
  evidence_summary?: string | null;
  unknown_fields?: string[];
  created_at?: string;
};

// ── gov.internal_operator / gov.capability_grant (KORA-WP-009) ─────────────────

export interface InternalOperatorRow {
  id: string;
  auth_user_id: string;
  status: 'active' | 'inactive';
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type InternalOperatorInsert = Pick<InternalOperatorRow, 'auth_user_id'> & {
  id?: string;
  status?: 'active' | 'inactive';
  deactivated_at?: string | null;
};

export interface CapabilityGrantRow {
  id: string;
  operator_id: string;
  capability_domain: string;
  action: string;
  status: 'active' | 'revoked';
  revoked_at: string | null;
  granted_by_operator_id: string | null;
  granted_at: string;
}

export type CapabilityGrantInsert = Pick<CapabilityGrantRow, 'operator_id' | 'capability_domain' | 'action'> & {
  id?: string;
  status?: 'active' | 'revoked';
  revoked_at?: string | null;
  granted_by_operator_id?: string | null;
  granted_at?: string;
};

// ── advisor.advisor_identity / advisor.advisor_role_qualification (KORA-WP-030) ──

export interface AdvisorIdentityRow {
  id: string;
  auth_user_id: string;
  full_name: string;
  status: 'candidate_onboarding' | 'active' | 'unavailable' | 'globally_suspended' | 'inactive_offboarded';
  created_at: string;
  updated_at: string;
}

export type AdvisorIdentityInsert = Pick<AdvisorIdentityRow, 'auth_user_id' | 'full_name'> & {
  id?: string;
  status?: AdvisorIdentityRow['status'];
};

export interface AdvisorRoleQualificationRow {
  id: string;
  advisor_id: string;
  role: 'Company Advisor' | 'Partner Advisor';
  status: 'CANDIDATE' | 'QUALIFICATION IN PROGRESS' | 'QUALIFIED' | 'RENEWAL DUE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';
  created_at: string;
  updated_at: string;
}

export type AdvisorRoleQualificationInsert = Pick<AdvisorRoleQualificationRow, 'advisor_id' | 'role'> & {
  id?: string;
  status?: AdvisorRoleQualificationRow['status'];
};

// ── advisor.advisor_assignment / advisor.advisor_prerequisite_eligibility (KORA-WP-031) ──

export interface AdvisorAssignmentRow {
  id: string;
  advisor_id: string;
  organisation_type: 'company';
  company_id: string;
  role: 'Company Advisor' | 'Partner Advisor';
  status: 'active' | 'ended';
  effective_from: string;
  effective_to: string | null;
  reason: string | null;
  conflict_flag: boolean;
  created_at: string;
  updated_at: string;
}

export type AdvisorAssignmentInsert = Pick<AdvisorAssignmentRow, 'advisor_id' | 'company_id' | 'role'> & {
  id?: string;
  organisation_type?: AdvisorAssignmentRow['organisation_type'];
  status?: AdvisorAssignmentRow['status'];
  effective_to?: string | null;
  reason?: string | null;
  conflict_flag?: boolean;
};

export interface AdvisorPrerequisiteEligibilityRow {
  id: string;
  role_qualification_id: string;
  status: 'MET' | 'NOT_MET';
  source_reference: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  last_verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AdvisorPrerequisiteEligibilityInsert = Pick<AdvisorPrerequisiteEligibilityRow, 'role_qualification_id'> & {
  id?: string;
  status?: AdvisorPrerequisiteEligibilityRow['status'];
  source_reference?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  last_verified_at?: string | null;
  verified_by?: string | null;
};

// ── advisor.advisor_contact_message (KORA-WP-033) ───────────────────────────────

export interface AdvisorContactMessageRow {
  id: string;
  assignment_id: string;
  sender_role: 'COMPANY_ADMIN' | 'ADVISOR';
  body: string;
  created_at: string;
}

export type AdvisorContactMessageInsert = Pick<AdvisorContactMessageRow, 'assignment_id' | 'sender_role' | 'body'> & {
  id?: string;
};

// ── advisor.advisor_appointment (KORA-WP-035) ───────────────────────────────────

export interface AdvisorAppointmentRow {
  id: string;
  assignment_id: string;
  starts_at: string;
  ends_at: string;
  subject: string;
  status: 'requested' | 'confirmed' | 'completed' | 'rescheduled' | 'cancelled' | 'no-show';
  rescheduled_from_id: string | null;
  reason: string | null;
  created_by_role: 'COMPANY_ADMIN' | 'ADVISOR';
  created_at: string;
  updated_at: string;
}

export type AdvisorAppointmentInsert = Pick<AdvisorAppointmentRow, 'assignment_id' | 'starts_at' | 'ends_at' | 'subject' | 'created_by_role'> & {
  id?: string;
  status?: AdvisorAppointmentRow['status'];
  rescheduled_from_id?: string | null;
  reason?: string | null;
};

// ── advisor.advisor_content_record (KORA-WP-036) ────────────────────────────────

export interface AdvisorContentRecordRow {
  id: string;
  assignment_id: string;
  class: 'ORGANISATION_SHAREABLE_NOTE' | 'ADVISOR_INTERNAL_NOTE' | 'AUDIT_PROVENANCE_RECORD' | 'CONFIDENTIAL_REFERENCE' | 'COMMUNICATION_FOLLOWUP';
  body: string;
  shared: boolean | null;
  purpose: string | null;
  created_by_role: 'ADVISOR' | 'KORA_ADMIN';
  created_at: string;
}

export type AdvisorContentRecordInsert = Pick<AdvisorContentRecordRow, 'assignment_id' | 'class' | 'body' | 'created_by_role'> & {
  id?: string;
  shared?: boolean | null;
  purpose?: string | null;
};

// ── gov.operational_case (KORA-WP-007) ──────────────────────────────────────────

export interface OperationalCaseRow {
  id: string;
  organisation_type: 'company' | 'partner' | 'admin';
  organisation_id: string | null;
  linked_object_type: 'commitment' | 'program' | 'review' | 'certification' | 'capability_validation' | null;
  linked_object_id: string | null;
  owning_advisor_id: string | null;
  created_by_role: 'ADVISOR' | 'KORA_ADMIN';
  subject: string;
  priority: string | null;
  due_date: string | null;
  status: 'open' | 'in-progress' | 'blocked' | 'resolved' | 'escalated';
  escalation_target: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export type OperationalCaseInsert = Pick<OperationalCaseRow, 'organisation_type' | 'created_by_role' | 'subject'> & {
  id?: string;
  organisation_id?: string | null;
  linked_object_type?: OperationalCaseRow['linked_object_type'];
  linked_object_id?: string | null;
  owning_advisor_id?: string | null;
  priority?: string | null;
  due_date?: string | null;
  status?: OperationalCaseRow['status'];
  escalation_target?: string | null;
  resolution_note?: string | null;
};

// ── analytics.need_hypothesis (KORA-WP-017) ─────────────────────────────────────

export interface NeedHypothesisRow {
  id: string;
  tenant_id: string;
  statement: string;
  classification: 'Hypothesis' | 'Emerging' | 'Supported' | 'Insufficient-Evidence-Unknown';
  recorded_by_role: string;
  recorded_by_id: string;
  created_at: string;
}

export type NeedHypothesisInsert = Pick<
  NeedHypothesisRow,
  'tenant_id' | 'statement' | 'recorded_by_role' | 'recorded_by_id'
> & {
  id?: string;
  created_at?: string;
};

// ── network.partner_profile ───────────────────────────────────────────────────

export interface PartnerProfileRow {
  id:            string;
  name:          string;
  description:   string | null;
  pillar:        'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY';
  category:      string | null;
  website_url:   string | null;
  city:          string | null;
  country:       string;
  delivery_mode: 'online' | 'onsite' | 'hybrid';
  status:        'draft' | 'published' | 'archived';
  created_at:    string;
  updated_at:    string;
}

// ── Database type map ─────────────────────────────────────────────────────────
// Conforms to @supabase/supabase-js v2 GenericDatabase constraint.
// Each schema entry includes Views/Functions/Enums/CompositeTypes (required
// by GenericSchema) so .schema('analytics').from('tenant') is typed without
// blanket `as any` on the entire client.

export interface Database {
  // ── analytics schema ──────────────────────────────────────────────────────
  analytics: {
    Tables: {
      tenant:                 { Row: TenantRow;              Insert: TenantInsert;       Update: Partial<TenantInsert>; Relationships: [] };
      company_memberships:    { Row: CompanyMembershipRow;   Insert: CompanyMembershipInsert; Update: Partial<CompanyMembershipInsert>; Relationships: [] };
      source_batch:           { Row: SourceBatchRow;         Insert: Omit<SourceBatchRow,  'id'|'created_at'|'updated_at'>; Update: Partial<SourceBatchRow>; Relationships: [] };
      uef_record:             { Row: UefRecordRow;           Insert: Omit<UefRecordRow,    'id'|'created_at'|'updated_at'>; Update: Partial<UefRecordRow>; Relationships: [] };
      kora_index_result:      { Row: KoraIndexResultRow;     Insert: Omit<KoraIndexResultRow, 'id'|'created_at'>; Update: Partial<KoraIndexResultRow>; Relationships: [] };
      impact_unit:            { Row: ImpactUnitRow;          Insert: Omit<ImpactUnitRow, 'id'|'created_at'>; Update: never; Relationships: [] };
      bti_result:             { Row: BtiResultRow;           Insert: Omit<BtiResultRow,    'id'|'created_at'|'updated_at'>; Update: Partial<BtiResultRow>; Relationships: [] };
      activation_result:      { Row: ActivationResultRow;    Insert: Omit<ActivationResultRow,'id'|'created_at'|'updated_at'>; Update: Partial<ActivationResultRow>; Relationships: [] };
      confidence_result:      { Row: ConfidenceResultRow;    Insert: Omit<ConfidenceResultRow,'id'|'created_at'|'updated_at'>; Update: Partial<ConfidenceResultRow>; Relationships: [] };
      decision_pack_version:  { Row: DecisionPackVersionRow; Insert: Omit<DecisionPackVersionRow,'id'|'created_at'|'updated_at'>; Update: Partial<DecisionPackVersionRow>; Relationships: [] };
      observed_investment_fact: { Row: ObservedInvestmentFactRow; Insert: ObservedInvestmentFactInsert; Update: never; Relationships: [] };
      need_hypothesis: { Row: NeedHypothesisRow; Insert: NeedHypothesisInsert; Update: never; Relationships: [] };
    };
    Views:          Record<string, never>;
    Functions:      Record<string, never>;
    Enums:          Record<string, never>;
    CompositeTypes: Record<string, never>;
  };

  // ── personal schema ───────────────────────────────────────────────────────
  personal: {
    Tables: {
      workforce_baseline:    { Row: WorkforceBaselineRow;    Insert: Omit<WorkforceBaselineRow,    'id'|'created_at'|'updated_at'>; Update: Partial<WorkforceBaselineRow>; Relationships: [] };
      uploaded_record:       { Row: UploadedRecordRow;       Insert: Omit<UploadedRecordRow,       'id'|'created_at'|'updated_at'>; Update: Partial<UploadedRecordRow>; Relationships: [] };
      worker_identity:       { Row: WorkerIdentityRow;       Insert: Omit<WorkerIdentityRow,       'id'|'created_at'|'updated_at'>; Update: Partial<WorkerIdentityRow>; Relationships: [] };
      worker_profile_private:{ Row: WorkerProfilePrivateRow; Insert: Omit<WorkerProfilePrivateRow, 'id'|'created_at'|'updated_at'>; Update: Partial<WorkerProfilePrivateRow>; Relationships: [] };
      worker_initiative:     { Row: WorkerInitiativeRow;     Insert: WorkerInitiativeInsert;        Update: Partial<WorkerInitiativeInsert>; Relationships: [] };
      worker_participation:  { Row: WorkerParticipationRow;  Insert: WorkerParticipationInsert;     Update: WorkerParticipationUpdate; Relationships: [] };
    };
    Views:          Record<string, never>;
    Functions:      Record<string, never>;
    Enums:          Record<string, never>;
    CompositeTypes: Record<string, never>;
  };

  // ── gov schema ────────────────────────────────────────────────────────────
  gov: {
    Tables: {
      budget_governance: { Row: BudgetGovernanceRow; Insert: Omit<BudgetGovernanceRow,'id'|'created_at'|'updated_at'>; Update: Partial<BudgetGovernanceRow>; Relationships: [] };
      internal_operator: { Row: InternalOperatorRow; Insert: InternalOperatorInsert; Update: Partial<InternalOperatorInsert>; Relationships: [] };
      capability_grant:  { Row: CapabilityGrantRow;  Insert: CapabilityGrantInsert;  Update: Partial<CapabilityGrantInsert>;  Relationships: [] };
      operational_case:  { Row: OperationalCaseRow;  Insert: OperationalCaseInsert;  Update: Partial<OperationalCaseInsert>;  Relationships: [] };
    };
    Views:          Record<string, never>;
    Functions:      Record<string, never>;
    Enums:          Record<string, never>;
    CompositeTypes: Record<string, never>;
  };

  // ── audit schema ──────────────────────────────────────────────────────────
  audit: {
    Tables: {
      audit_log: { Row: AuditLogRow; Insert: Omit<AuditLogRow,'id'|'created_at'>; Update: never; Relationships: [] };
      governance_event: { Row: GovernanceEventRow; Insert: GovernanceEventInsert; Update: never; Relationships: [] };
    };
    Views:          Record<string, never>;
    Functions:      Record<string, never>;
    Enums:          Record<string, never>;
    CompositeTypes: Record<string, never>;
  };

  // ── network schema ────────────────────────────────────────────────────────
  network: {
    Tables: {
      partner_profile: {
        Row:    PartnerProfileRow;
        Insert: Omit<PartnerProfileRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PartnerProfileRow, 'id' | 'created_at'>>;
        Relationships: [];
      };
    };
    Views:          Record<string, never>;
    Functions:      Record<string, never>;
    Enums:          Record<string, never>;
    CompositeTypes: Record<string, never>;
  };

  // ── advisor schema (KORA-WP-030, extended KORA-WP-031) ────────────────────
  advisor: {
    Tables: {
      advisor_identity: { Row: AdvisorIdentityRow; Insert: AdvisorIdentityInsert; Update: Partial<AdvisorIdentityInsert>; Relationships: [] };
      advisor_role_qualification: { Row: AdvisorRoleQualificationRow; Insert: AdvisorRoleQualificationInsert; Update: Partial<AdvisorRoleQualificationInsert>; Relationships: [] };
      advisor_assignment: { Row: AdvisorAssignmentRow; Insert: AdvisorAssignmentInsert; Update: Partial<AdvisorAssignmentInsert>; Relationships: [] };
      advisor_prerequisite_eligibility: { Row: AdvisorPrerequisiteEligibilityRow; Insert: AdvisorPrerequisiteEligibilityInsert; Update: Partial<AdvisorPrerequisiteEligibilityInsert>; Relationships: [] };
      advisor_contact_message: { Row: AdvisorContactMessageRow; Insert: AdvisorContactMessageInsert; Update: Partial<AdvisorContactMessageInsert>; Relationships: [] };
      advisor_appointment: { Row: AdvisorAppointmentRow; Insert: AdvisorAppointmentInsert; Update: Partial<AdvisorAppointmentInsert>; Relationships: [] };
      advisor_content_record: { Row: AdvisorContentRecordRow; Insert: AdvisorContentRecordInsert; Update: Partial<AdvisorContentRecordInsert>; Relationships: [] };
    };
    Views:          Record<string, never>;
    Functions:      Record<string, never>;
    Enums:          Record<string, never>;
    CompositeTypes: Record<string, never>;
  };

  // ── kora schema — claim helper functions ──────────────────────────────────
  kora: {
    Tables:  Record<string, never>;
    Views:   Record<string, never>;
    Functions: {
      kora_role:  { Args: Record<string, never>; Returns: string };
      tenant_id:  { Args: Record<string, never>; Returns: string | null };
    };
    Enums:          Record<string, never>;
    CompositeTypes: Record<string, never>;
  };

  // ── commons schema — B128: KORA Commons tenant-scoped moderated posts ───────
  commons: {
    Tables: {
      post: {
        Row: {
          id:             string;
          tenant_id:      string;
          author_user_id: string | null;
          author_role:    'KORA_ADMIN' | 'COMPANY_ADMIN';
          title:          string;
          body:           string;
          category:       'announcement' | 'initiative_update' | 'opportunity' | 'event' | 'request' | 'resource';
          status:         'draft' | 'pending_review' | 'published' | 'archived' | 'rejected';
          pillar:         'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY' | null;
          published_at:   string | null;
          reviewed_by:    string | null;
          reviewed_at:    string | null;
          created_at:     string;
          updated_at:     string;
        };
        Insert: {
          id?:            string;
          tenant_id:      string;
          author_user_id?: string | null;
          author_role:    'KORA_ADMIN' | 'COMPANY_ADMIN';
          title:          string;
          body:           string;
          category:       string;
          status?:        string;
          pillar?:        string | null;
          published_at?:  string | null;
          reviewed_by?:   string | null;
          reviewed_at?:   string | null;
          created_at?:    string;
          updated_at?:    string;
        };
        Update: {
          title?:        string;
          body?:         string;
          category?:     string;
          status?:       string;
          pillar?:       string | null;
          published_at?: string | null;
          reviewed_by?:  string | null;
          reviewed_at?:  string | null;
          updated_at?:   string;
        };
        Relationships: [];
      };
    };
    Views:          Record<string, never>;
    Functions:      Record<string, never>;
    Enums:          Record<string, never>;
    CompositeTypes: Record<string, never>;
  };

  // ── public schema — required default for Supabase JS client typing ────────
  public: {
    Tables:         Record<string, never>;
    Views:          Record<string, never>;
    Functions:      Record<string, never>;
    Enums:          Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
