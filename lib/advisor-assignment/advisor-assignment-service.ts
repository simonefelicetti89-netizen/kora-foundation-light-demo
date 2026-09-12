// lib/advisor-assignment/advisor-assignment-service.ts
// KORA-WP-031 — Advisor Assignment + Validity Rule + Minimum
// Prerequisite-Eligibility Data.
//
// Implements the third of doc 76 (DD-2.1) §2-§4's three-concept model:
// Assignment Role Context (doc 76 §3(3)). Advisor Identity/Qualification
// (lib/advisor-identity/advisor-identity-service.ts, KORA-WP-030) is NOT
// duplicated or re-derived here — this module reads that data, it does not
// own a second copy of it (Step 21 discipline: no second source of truth for
// qualification status).
//
// Advisor Identity ≠ Advisor Qualification ≠ Advisor Assignment. A
// qualification says what role the Advisor is qualified to perform; an
// Assignment says where/for whom that Advisor is actually assigned. See
// migration 057's own header for the full frozen-source citation (doc 73
// §3/§15, doc 76 §3(3)/§15, doc 98 §4 Errata 2).
//
// ASSIGNMENT VALIDITY IS DYNAMIC, NEVER STORED (Acceptance: "Assignment
// invalid when prerequisite evidence absent, Assignment valid once supplied
// via the underlying data model alone" — no separate re-activation action
// exists in that sentence). evaluateAdvisorAssignmentValidity() is therefore
// a pure read/compute function over live data every time it is called —
// there is no `valid` column anywhere. A qualification later expiring, or
// prerequisite-eligibility later expiring, is reflected automatically the
// next time validity is evaluated, with zero migration/caching concern.
//
// MUTATION AUTHORITY (doc 73 §3's own worked flow: "Admin creates the
// Assignment, scoping the Advisor to the Company"): every mutating function
// below checks `actorRole === 'KORA_ADMIN'` itself. This differs from
// KORA-WP-032's grantAdvisorRoleQualification(), which trusts its caller
// because a requireKoraAdmin()-guarded API route already exists upstream.
// KORA-WP-031's own registry explicitly sets `UI: N/A at this WP` — no route
// is built here — so this service IS the authorization boundary; without
// this in-service check, there would be no enforcement point to test at all
// beyond the DB's own service_role-only GRANT (which authorizes the trusted
// server process generically, not "is this specific caller KORA_ADMIN").

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';
import { recordGovernedAction } from '@/lib/audit/governed-action-catalog';
import type { AdvisorRole } from '@/lib/advisor-identity/advisor-identity-service';

// A single legal value today — see migration 057's own header for why this
// is a discriminator column, not a hardcoded assumption: KORA-WP-051/053
// (Partner delivery, Scope-Trigger-gated, not activated) would widen this,
// additively, when built. Never anticipated here.
export const ORGANISATION_TYPES = ['company'] as const;
export type OrganisationType = (typeof ORGANISATION_TYPES)[number];

// doc 73 §3, verbatim: 'active' / 'ended' only.
export const ASSIGNMENT_STATUSES = ['active', 'ended'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

// Minimal vocabulary matching the registry's own "prerequisite-eligibility-
// present" phrase (doc 98 §4 Errata 2) — no invented richer scale.
export const PREREQUISITE_ELIGIBILITY_STATUSES = ['MET', 'NOT_MET'] as const;
export type PrerequisiteEligibilityStatus = (typeof PREREQUISITE_ELIGIBILITY_STATUSES)[number];

export interface AdvisorAssignment {
  id: string;
  advisorId: string;
  organisationType: OrganisationType;
  companyId: string;
  role: AdvisorRole;
  status: AssignmentStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  reason: string | null;
  conflictFlag: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdvisorPrerequisiteEligibility {
  id: string;
  roleQualificationId: string;
  status: PrerequisiteEligibilityStatus;
  sourceReference: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  lastVerifiedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentValidityResult {
  valid: boolean;
  // Populated only when invalid — one machine-readable code per unmet
  // condition of doc 76 §15's rule, scoped to what this WP owns (identity,
  // qualification, assignment-active, prerequisite, conflict — NOT the
  // Academy/per-workflow gate or the full recusal workflow, both explicitly
  // Out of Scope).
  reasons: string[];
}

interface AdvisorAssignmentDbRow {
  id: string; advisor_id: string; organisation_type: string; company_id: string;
  role: string; status: string; effective_from: string; effective_to: string | null;
  reason: string | null; conflict_flag: boolean; created_at: string; updated_at: string;
}

interface AdvisorPrerequisiteEligibilityDbRow {
  id: string; role_qualification_id: string; status: string; source_reference: string | null;
  effective_date: string | null; expiry_date: string | null; last_verified_at: string | null;
  verified_by: string | null; created_at: string; updated_at: string;
}

function toAdvisorAssignment(row: AdvisorAssignmentDbRow): AdvisorAssignment {
  return {
    id: row.id,
    advisorId: row.advisor_id,
    organisationType: row.organisation_type as OrganisationType,
    companyId: row.company_id,
    role: row.role as AdvisorRole,
    status: row.status as AssignmentStatus,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    reason: row.reason,
    conflictFlag: row.conflict_flag,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAdvisorPrerequisiteEligibility(row: AdvisorPrerequisiteEligibilityDbRow): AdvisorPrerequisiteEligibility {
  return {
    id: row.id,
    roleQualificationId: row.role_qualification_id,
    status: row.status as PrerequisiteEligibilityStatus,
    sourceReference: row.source_reference,
    effectiveDate: row.effective_date,
    expiryDate: row.expiry_date,
    lastVerifiedAt: row.last_verified_at,
    verifiedBy: row.verified_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireKoraAdminActor(actorRole: string, action: string): void {
  if (actorRole !== 'KORA_ADMIN') {
    throw new Error(`[KORA] ${action} rejected: only KORA_ADMIN may perform this action — Advisor self-assignment and Company self-selection are not authorized (doc 73 §3: "Admin creates the Assignment").`);
  }
}

// ── createAdvisorAssignment — KORA_ADMIN-only, "Admin creates the
//    Assignment" (doc 73 §3) ─────────────────────────────────────────────────
// Creation does NOT require the corresponding Role Qualification to already
// be QUALIFIED, nor the prerequisite-eligibility to already be MET — the
// Acceptance criterion is explicit that an Assignment persists even when not
// yet valid, becoming valid once the underlying data supplies it (Step 31).
// Validity is a separate, dynamic read (evaluateAdvisorAssignmentValidity),
// never a creation-time gate.

export interface CreateAdvisorAssignmentParams {
  advisorId: string;
  companyId: string;
  role: AdvisorRole;
  actorRole: string;
  actorId: string;
}

export async function createAdvisorAssignment(params: CreateAdvisorAssignmentParams): Promise<AdvisorAssignment> {
  requireKoraAdminActor(params.actorRole, 'createAdvisorAssignment');

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .insert({ advisor_id: params.advisorId, company_id: params.companyId, role: params.role })
    .select()
    .single();

  if (error || !data) {
    const msg = error?.message ?? 'no data returned';
    if (/uq_advisor_assignment_one_active_company_advisor/.test(msg)) {
      throw new Error('[KORA] createAdvisorAssignment rejected: this Company already has an active Company Advisor assignment (doc 73 §3: one active Company Advisor per Company at a time).');
    }
    if (/advisor_assignment_role_matches_target/.test(msg)) {
      throw new Error('[KORA] createAdvisorAssignment rejected: role does not match the assignment target — a Company target requires the "Company Advisor" role.');
    }
    if (/foreign key/i.test(msg)) {
      throw new Error('[KORA] createAdvisorAssignment rejected: advisor or company does not exist.');
    }
    throw new Error(`[KORA] createAdvisorAssignment failed: ${msg}`);
  }

  const assignment = toAdvisorAssignment(data as AdvisorAssignmentDbRow);

  await recordGovernedAction({
    category: 'ASSIGNMENT_CHANGE',
    actorRole: params.actorRole,
    actorId: params.actorId,
    objectType: 'advisor_assignment',
    objectId: assignment.id,
    payload: { verb: 'create', advisorId: assignment.advisorId, companyId: assignment.companyId, role: assignment.role },
  });

  return assignment;
}

// ── endAdvisorAssignment — KORA_ADMIN-only, reason required ─────────────────
// History is never deleted (doc 73 §3) — this is the only mutation path
// besides creation; there is no UPDATE of role/target in place (a
// reassignment ends one Assignment and creates a new one, preserving both).

export interface EndAdvisorAssignmentParams {
  assignmentId: string;
  reason: string;
  actorRole: string;
  actorId: string;
}

export async function endAdvisorAssignment(params: EndAdvisorAssignmentParams): Promise<AdvisorAssignment> {
  requireKoraAdminActor(params.actorRole, 'endAdvisorAssignment');

  if (!params.reason || !params.reason.trim()) {
    throw new Error('[KORA] endAdvisorAssignment rejected: reason is required when ending an Assignment (doc 73 §3).');
  }

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .update({ status: 'ended', effective_to: new Date().toISOString(), reason: params.reason })
    .eq('id', params.assignmentId)
    .eq('status', 'active')
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] endAdvisorAssignment rejected: ${error?.message ?? 'no active Assignment found for this id'}`);
  }

  const assignment = toAdvisorAssignment(data as AdvisorAssignmentDbRow);

  await recordGovernedAction({
    category: 'ASSIGNMENT_CHANGE',
    actorRole: params.actorRole,
    actorId: params.actorId,
    objectType: 'advisor_assignment',
    objectId: assignment.id,
    payload: { verb: 'end', advisorId: assignment.advisorId, companyId: assignment.companyId, role: assignment.role, reason: params.reason },
  });

  return assignment;
}

// ── getAdvisorAssignmentById ─────────────────────────────────────────────────

export async function getAdvisorAssignmentById(assignmentId: string): Promise<AdvisorAssignment | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select()
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getAdvisorAssignmentById failed: ${error.message}`);
  }

  return data ? toAdvisorAssignment(data as AdvisorAssignmentDbRow) : null;
}

// ── listAssignmentsForAdvisor — self-scope read ─────────────────────────────

export async function listAssignmentsForAdvisor(advisorId: string): Promise<AdvisorAssignment[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select()
    .eq('advisor_id', advisorId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listAssignmentsForAdvisor failed: ${error.message}`);
  }

  return ((data ?? []) as AdvisorAssignmentDbRow[]).map(toAdvisorAssignment);
}

// ── setAdvisorPrerequisiteEligibility — KORA_ADMIN-only, service-level only ──
// No route/UI exists over this function (KORA-WP-039's explicit scope, Out
// of Scope here). Tests and any future WP-039 route call this function
// directly — it is the minimal, canonical write path for the prerequisite-
// eligibility data this WP owns (doc 98 §4 Errata 2).

export interface SetAdvisorPrerequisiteEligibilityParams {
  roleQualificationId: string;
  status: PrerequisiteEligibilityStatus;
  sourceReference?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
  actorRole: string;
  actorId: string;
}

export async function setAdvisorPrerequisiteEligibility(
  params: SetAdvisorPrerequisiteEligibilityParams,
): Promise<AdvisorPrerequisiteEligibility> {
  requireKoraAdminActor(params.actorRole, 'setAdvisorPrerequisiteEligibility');

  if (!PREREQUISITE_ELIGIBILITY_STATUSES.includes(params.status)) {
    throw new Error(`[KORA] setAdvisorPrerequisiteEligibility rejected: "${params.status}" is not a canonical prerequisite-eligibility status.`);
  }

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_prerequisite_eligibility')
    .upsert(
      {
        role_qualification_id: params.roleQualificationId,
        status: params.status,
        source_reference: params.sourceReference ?? null,
        effective_date: params.effectiveDate ?? null,
        expiry_date: params.expiryDate ?? null,
        last_verified_at: new Date().toISOString(),
        verified_by: params.actorId,
      },
      { onConflict: 'role_qualification_id' },
    )
    .select()
    .single();

  if (error || !data) {
    const msg = error?.message ?? 'no data returned';
    if (/foreign key/i.test(msg)) {
      throw new Error('[KORA] setAdvisorPrerequisiteEligibility rejected: no such Advisor Role Qualification.');
    }
    throw new Error(`[KORA] setAdvisorPrerequisiteEligibility failed: ${msg}`);
  }

  const eligibility = toAdvisorPrerequisiteEligibility(data as AdvisorPrerequisiteEligibilityDbRow);

  // Not one of WP-006's 14 governed categories by name — same reasoning as
  // WP-030's own creation events — uses the generic substrate directly.
  await recordGovernanceEvent({
    sourceModule: 'advisor-assignment',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'advisor_prerequisite_eligibility.set',
    objectType: 'advisor_prerequisite_eligibility',
    objectId: eligibility.id,
    payload: { roleQualificationId: eligibility.roleQualificationId, status: eligibility.status },
  });

  return eligibility;
}

// ── getPrerequisiteEligibilityForQualification ──────────────────────────────

export async function getPrerequisiteEligibilityForQualification(
  roleQualificationId: string,
): Promise<AdvisorPrerequisiteEligibility | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_prerequisite_eligibility')
    .select()
    .eq('role_qualification_id', roleQualificationId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getPrerequisiteEligibilityForQualification failed: ${error.message}`);
  }

  return data ? toAdvisorPrerequisiteEligibility(data as AdvisorPrerequisiteEligibilityDbRow) : null;
}

// ── evaluateAdvisorAssignmentValidity — doc 76 §15's rule, scoped to what
//    this WP owns ────────────────────────────────────────────────────────────
// Pure read/compute — no stored `valid` column exists anywhere (see this
// module's own header). Re-evaluating after a qualification expires, or
// after prerequisite-eligibility changes, reflects the new state
// automatically with zero additional write.
//
// "Qualification-active" is interpreted strictly as status === 'QUALIFIED'
// (see migration 057's header for the disclosed, narrowly-evidenced reading
// — 'RENEWAL DUE' is NOT treated as active).

export async function evaluateAdvisorAssignmentValidity(assignmentId: string): Promise<AssignmentValidityResult> {
  const db = getSupabaseServiceClient();
  const reasons: string[] = [];

  const { data: assignmentRow, error: assignmentError } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select()
    .eq('id', assignmentId)
    .maybeSingle();

  if (assignmentError) {
    throw new Error(`[KORA] evaluateAdvisorAssignmentValidity failed: ${assignmentError.message}`);
  }
  if (!assignmentRow) {
    throw new Error('[KORA] evaluateAdvisorAssignmentValidity rejected: no such Assignment.');
  }

  const assignment = toAdvisorAssignment(assignmentRow as AdvisorAssignmentDbRow);

  // (3) The Assignment itself is active.
  if (assignment.status !== 'active') {
    reasons.push('assignment_not_active');
  }

  // (5) No instance-level conflict (the minimal data point this WP owns —
  // full recusal workflow is KORA-WP-037, not built here).
  if (assignment.conflictFlag) {
    reasons.push('conflict_flag_set');
  }

  // (1) The Advisor identity is active/eligible.
  const { data: identityRow, error: identityError } = await db
    .schema('advisor')
    .from('advisor_identity')
    .select()
    .eq('id', assignment.advisorId)
    .maybeSingle();

  if (identityError) {
    throw new Error(`[KORA] evaluateAdvisorAssignmentValidity failed: ${identityError.message}`);
  }
  if (!identityRow || identityRow.status !== 'active') {
    reasons.push('advisor_identity_not_active');
  }

  // (2) The corresponding Role Qualification (per Assignment Role Context)
  // is active.
  const { data: qualificationRow, error: qualificationError } = await db
    .schema('advisor')
    .from('advisor_role_qualification')
    .select()
    .eq('advisor_id', assignment.advisorId)
    .eq('role', assignment.role)
    .maybeSingle();

  if (qualificationError) {
    throw new Error(`[KORA] evaluateAdvisorAssignmentValidity failed: ${qualificationError.message}`);
  }
  if (!qualificationRow || qualificationRow.status !== 'QUALIFIED') {
    reasons.push('role_qualification_not_active');
  }

  // (4) Prerequisite-eligibility present (this WP's own narrowed slice of
  // "Academy/prerequisite gates required... satisfied" — Errata 2).
  let prerequisitePresent = false;
  if (qualificationRow) {
    const { data: eligibilityRow, error: eligibilityError } = await db
      .schema('advisor')
      .from('advisor_prerequisite_eligibility')
      .select()
      .eq('role_qualification_id', qualificationRow.id)
      .maybeSingle();

    if (eligibilityError) {
      throw new Error(`[KORA] evaluateAdvisorAssignmentValidity failed: ${eligibilityError.message}`);
    }

    if (eligibilityRow && eligibilityRow.status === 'MET') {
      const expiryDate = eligibilityRow.expiry_date as string | null;
      prerequisitePresent = !expiryDate || new Date(expiryDate) > new Date();
    }
  }
  if (!prerequisitePresent) {
    reasons.push('prerequisite_eligibility_not_present');
  }

  return { valid: reasons.length === 0, reasons };
}
