// ─── KORA Supabase Database Types ─────────────────────────────────────────────
// Hand-written TypeScript types matching supabase/migrations/001_live_v1_foundation.sql.
// In Phase 2B: replace with `npx supabase gen types typescript` output.
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

// ── Database type map (used by createBrowserClient<Database>) ─────────────────

export interface Database {
  analytics: {
    Tables: {
      tenant:                 { Row: TenantRow;              Insert: TenantInsert;       Update: Partial<TenantInsert> };
      source_batch:           { Row: SourceBatchRow;         Insert: Omit<SourceBatchRow,  'id'|'created_at'|'updated_at'>; Update: Partial<SourceBatchRow> };
      uef_record:             { Row: UefRecordRow;           Insert: Omit<UefRecordRow,    'id'|'created_at'|'updated_at'>; Update: Partial<UefRecordRow> };
      kora_index_result:      { Row: KoraIndexResultRow;     Insert: Omit<KoraIndexResultRow, 'id'|'created_at'>; Update: Partial<KoraIndexResultRow> };
      bti_result:             { Row: BtiResultRow;           Insert: Omit<BtiResultRow,    'id'|'created_at'|'updated_at'>; Update: Partial<BtiResultRow> };
      activation_result:      { Row: ActivationResultRow;    Insert: Omit<ActivationResultRow,'id'|'created_at'|'updated_at'>; Update: Partial<ActivationResultRow> };
      confidence_result:      { Row: ConfidenceResultRow;    Insert: Omit<ConfidenceResultRow,'id'|'created_at'|'updated_at'>; Update: Partial<ConfidenceResultRow> };
      decision_pack_version:  { Row: DecisionPackVersionRow; Insert: Omit<DecisionPackVersionRow,'id'|'created_at'|'updated_at'>; Update: Partial<DecisionPackVersionRow> };
    };
  };
  personal: {
    Tables: {
      workforce_baseline: { Row: WorkforceBaselineRow; Insert: Omit<WorkforceBaselineRow,'id'|'created_at'|'updated_at'>; Update: Partial<WorkforceBaselineRow> };
      uploaded_record:    { Row: UploadedRecordRow;    Insert: Omit<UploadedRecordRow,   'id'|'created_at'|'updated_at'>; Update: Partial<UploadedRecordRow> };
    };
  };
  gov: {
    Tables: {
      budget_governance: { Row: BudgetGovernanceRow; Insert: Omit<BudgetGovernanceRow,'id'|'created_at'|'updated_at'>; Update: Partial<BudgetGovernanceRow> };
    };
  };
  audit: {
    Tables: {
      audit_log: { Row: AuditLogRow; Insert: Omit<AuditLogRow,'id'|'created_at'>; Update: never };
    };
  };
}
