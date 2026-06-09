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
      source_batch:           { Row: SourceBatchRow;         Insert: Omit<SourceBatchRow,  'id'|'created_at'|'updated_at'>; Update: Partial<SourceBatchRow>; Relationships: [] };
      uef_record:             { Row: UefRecordRow;           Insert: Omit<UefRecordRow,    'id'|'created_at'|'updated_at'>; Update: Partial<UefRecordRow>; Relationships: [] };
      kora_index_result:      { Row: KoraIndexResultRow;     Insert: Omit<KoraIndexResultRow, 'id'|'created_at'>; Update: Partial<KoraIndexResultRow>; Relationships: [] };
      impact_unit:            { Row: ImpactUnitRow;          Insert: Omit<ImpactUnitRow, 'id'|'created_at'>; Update: never; Relationships: [] };
      bti_result:             { Row: BtiResultRow;           Insert: Omit<BtiResultRow,    'id'|'created_at'|'updated_at'>; Update: Partial<BtiResultRow>; Relationships: [] };
      activation_result:      { Row: ActivationResultRow;    Insert: Omit<ActivationResultRow,'id'|'created_at'|'updated_at'>; Update: Partial<ActivationResultRow>; Relationships: [] };
      confidence_result:      { Row: ConfidenceResultRow;    Insert: Omit<ConfidenceResultRow,'id'|'created_at'|'updated_at'>; Update: Partial<ConfidenceResultRow>; Relationships: [] };
      decision_pack_version:  { Row: DecisionPackVersionRow; Insert: Omit<DecisionPackVersionRow,'id'|'created_at'|'updated_at'>; Update: Partial<DecisionPackVersionRow>; Relationships: [] };
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

  // ── public schema — required default for Supabase JS client typing ────────
  public: {
    Tables:         Record<string, never>;
    Views:          Record<string, never>;
    Functions:      Record<string, never>;
    Enums:          Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
