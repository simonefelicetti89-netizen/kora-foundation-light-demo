// lib/advisor-portal/advisor-case-service.ts
// KORA-WP-034 — Advisor Tasks & Cases.
//
// "Tasks" in the title, verbatim registry Purpose: "reuse the shared Case
// primitive." No separate Task entity is built — WP-007's own Proposed New
// names exactly one table (`operational_cases`) and WP-034's own Acceptance
// ("Advisor creates/resolves Cases through the shared primitive") never
// names Task either. This module is a thin, Advisor-specific authorization
// layer over lib/operations/operational-case-service.ts — the single
// shared Case truth, never duplicated here.
//
// Data/Migration Impact: NONE (file 102's own field) — no new table, no
// new column, no new policy, no new migration. This file adds ONLY the
// "Auth/RLS: Assignment-scoped" contract WP-034 itself declares, which
// WP-007's own generic service does not enforce (WP-007's own Hard Deps
// names only KORA-WP-005, not KORA-WP-031 — it never claimed to enforce
// active-Assignment gating). That gate belongs here, at the Advisor
// product-surface layer, exactly where WP-034's own "Assignment-scoped"
// Auth/RLS field says it does.
//
// PARTNER SCOPE: denied structurally. advisor.advisor_assignment's own
// CHECK constraint restricts organisation_type to 'company' only — no
// Partner Advisor Assignment model exists in code truth. Every function
// here only ever operates on organisationType: 'company'. There is no
// code path by which a Partner-scoped Case becomes reachable through this
// module, regardless of Advisor qualification.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import {
  createOperationalCase,
  listOperationalCases,
  transitionOperationalCaseStatus,
  getOperationalCaseById,
  type OperationalCase,
  type CaseStatus,
} from '@/lib/operations/operational-case-service';

async function assertActiveAssignmentAndGetCompanyId(
  db: ReturnType<typeof getSupabaseServiceClient>,
  assignmentId: string,
  callerAdvisorId: string,
): Promise<string> {
  const { data: assignment, error } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select('id, advisor_id, company_id, status')
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] advisor case operation failed: ${error.message}`);
  }
  if (!assignment || assignment.advisor_id !== callerAdvisorId) {
    throw new Error('[KORA] advisor case operation rejected: caller is not the Advisor party to this Assignment.');
  }
  // Founder Decision H-A (WP-036 semantic gate) extended to WP-034's own
  // "Assignment-scoped" contract: no active Assignment, no Advisor
  // operational access — same principle, same error wording as the
  // WP-033/035/036 corrections, applied here for the first time at
  // WP-007's own Case primitive (which does not enforce this itself).
  if (assignment.status !== 'active') {
    throw new Error('[KORA] advisor case operation rejected: Advisor Assignment has ended — operational access no longer applies.');
  }
  return assignment.company_id as string;
}

// ── listAdvisorCases — the Advisor's own Cases, scoped to ONE Company
// context (one Assignment card, matching the established WP-033/035/036
// per-company UI pattern) ────────────────────────────────────────────────
// Defense-in-depth: filters to organisationType 'company' and this exact
// companyId, even though owning_advisor_id already scopes to the caller —
// an Advisor with multiple active Company Assignments must never see one
// Company's Cases while viewing another's card.

export async function listAdvisorCases(assignmentId: string, callerAdvisorId: string): Promise<OperationalCase[]> {
  const db = getSupabaseServiceClient();
  const companyId = await assertActiveAssignmentAndGetCompanyId(db, assignmentId, callerAdvisorId);

  const all = await listOperationalCases({ callerRole: 'ADVISOR', callerAdvisorId });
  return all.filter((c) => c.organisationType === 'company' && c.organisationId === companyId);
}

// ── createAdvisorCase — company-scoped only, requires active Assignment ────

export interface CreateAdvisorCaseParams {
  assignmentId: string;
  callerAdvisorId: string;
  subject: string;
  priority?: string;
  dueDate?: string;
  actorId: string;
}

export async function createAdvisorCase(params: CreateAdvisorCaseParams): Promise<OperationalCase> {
  const db = getSupabaseServiceClient();
  const companyId = await assertActiveAssignmentAndGetCompanyId(db, params.assignmentId, params.callerAdvisorId);

  // organisationType is always 'company' here — never caller-suppliable —
  // this is the structural Partner-scope denial (Gate 3): there is no
  // parameter through which a Partner or admin Case could be requested.
  return createOperationalCase({
    organisationType: 'company',
    organisationId: companyId,
    subject: params.subject,
    priority: params.priority,
    dueDate: params.dueDate,
    callerRole: 'ADVISOR',
    callerAdvisorId: params.callerAdvisorId,
    actorId: params.actorId,
  });
}

// ── transitionAdvisorCase — canonical WP-007 lifecycle only, re-verified
// company-scoped before delegating ──────────────────────────────────────

export interface TransitionAdvisorCaseParams {
  assignmentId: string;
  caseId: string;
  callerAdvisorId: string;
  newStatus: CaseStatus;
  resolutionNote?: string;
  actorId: string;
}

export async function transitionAdvisorCase(params: TransitionAdvisorCaseParams): Promise<OperationalCase> {
  const db = getSupabaseServiceClient();
  const companyId = await assertActiveAssignmentAndGetCompanyId(db, params.assignmentId, params.callerAdvisorId);

  const existing = await getOperationalCaseById(params.caseId);
  if (!existing) {
    throw new Error('[KORA] transitionAdvisorCase rejected: no such Case.');
  }
  if (existing.organisationType !== 'company' || existing.organisationId !== companyId) {
    throw new Error('[KORA] transitionAdvisorCase rejected: Case does not belong to this Assignment\'s Company.');
  }

  // Delegates to WP-007's own canonical transition guard
  // (transitionOperationalCaseStatus / CASE_ALLOWED_TRANSITIONS) — never
  // reimplemented here.
  return transitionOperationalCaseStatus({
    caseId: params.caseId,
    newStatus: params.newStatus,
    resolutionNote: params.resolutionNote,
    callerRole: 'ADVISOR',
    callerAdvisorId: params.callerAdvisorId,
    actorId: params.actorId,
  });
}
