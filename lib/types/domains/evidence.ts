// lib/types/domains/evidence.ts
//
// Foundation Light type scaffold — Evidence as a first-class domain entity.
// No persistence in Foundation Light v0.1: types only, no repository or DB schema.
//
// Context: in Foundation Light v0.1, evidence is an attribute on UEFRecord
// (evidence_level) and an EV correction factor on ImpactUnit. This file
// promotes evidence to a lifecycle-bearing entity for Pilot+ migration.
//
// Pilot+ engineer: implement EvidenceRepository consuming these interfaces.
// Gate 2 condition: production schema for EvidenceRecord pending Gate 2 closure.

export type EvidenceLifecycleStatus =
  | 'submitted'           // uploaded by company or partner — not yet reviewed
  | 'under_review'        // assigned to KORA Advisor for verification
  | 'verified'            // L4 — third-party confirmed, full EV weight
  | 'partially_verified'  // L3 — internal document, partial EV weight
  | 'rejected'            // not accepted — EV = 0; IU contribution = 0
  | 'expired'             // validity window passed — requires re-submission
  | 'archived';           // historical record, no longer active in scoring

export type EvidenceDocumentType =
  | 'contract'              // formal provider or partner contract
  | 'invoice'               // fiscal document (fattura)
  | 'participation_report'  // usage/participation report from provider
  | 'certification'         // third-party certification or assurance
  | 'internal_policy_doc'   // HR policy or company regulation document
  | 'survey_aggregate'      // aggregated worker survey results (never individual)
  | 'audit_report'          // external audit or ESG assurance document
  | 'other';

// Five-tier evidence ladder aligned with lib/kora-engine/types.ts BudgetEvidenceLevel.
// L0 and L1 never receive full EV weight; L4 = full EV weight (1.0).
export type EvidenceTier =
  | 'L0_NO_EVIDENCE'
  | 'L1_SELF_DECLARED'
  | 'L2_INTERNAL_DOCUMENT'
  | 'L3_THIRD_PARTY_DOCUMENT'
  | 'L4_VERIFIED_EVIDENCE';

// EV weight by tier — mirrors the EV correction factor in the IU formula.
// IU = NM × BC × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
export const EV_WEIGHT_BY_TIER: Record<EvidenceTier, number> = {
  L0_NO_EVIDENCE:          0.0,
  L1_SELF_DECLARED:        0.3,
  L2_INTERNAL_DOCUMENT:    0.6,
  L3_THIRD_PARTY_DOCUMENT: 0.8,
  L4_VERIFIED_EVIDENCE:    1.0,
} as const;

export interface EvidenceRecord {
  evidence_id: string;
  uef_id: string;               // links to UEFRecord (Stage 5 of 14-stage pipeline)
  company_id: string;
  tenant_id: string;
  document_type: EvidenceDocumentType;
  tier: EvidenceTier;
  status: EvidenceLifecycleStatus;
  submitted_at: string;         // ISO 8601
  reviewed_at?: string;         // set when status transitions from 'under_review'
  expires_at?: string;          // set for time-limited evidence (contracts, annual reports)
  submitted_by_role: string;    // COMPANY_ADMIN | PARTNER | KORA_ADMIN
  description: string;
  document_reference?: string;  // filename, URL, or external document ID
  advisor_notes?: string;       // set by ADVISOR; not visible to employer roles
}

export interface VerificationRecord {
  verification_id: string;
  evidence_id: string;
  advisor_pseudonym: string;    // pseudonymized — never real advisor identity in employer-facing view
  decision: ReviewDecision;
  tier_assigned: EvidenceTier;
  ev_weight_applied: number;    // 0.0–1.0 — correction factor applied to IU formula
  rationale: string;
  created_at: string;           // ISO 8601
  methodology_version_id: string;
}

export type ReviewDecisionCode =
  | 'approve_full'        // L4 — full EV weight (1.0)
  | 'approve_partial'     // L3 — partial EV weight (0.8)
  | 'reject'              // EV = 0; IU = 0 for this record
  | 'request_more_info'   // returns status to 'submitted'; evidence intact
  | 'escalate';           // requires KORA_ADMIN decision; status holds at 'under_review'

export interface ReviewDecision {
  code: ReviewDecisionCode;
  ev_weight_assigned: number;   // 0.0–1.0 applied to IU = NM × BC × CQ × EV × CF × AGF
  notes?: string;
}
