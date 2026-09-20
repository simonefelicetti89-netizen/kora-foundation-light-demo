// lib/advisor-portal/advisor-portal-service.ts
// KORA-WP-033 — Company Advisor Action-Matrix Surface + Portal Pilot Slice.
//
// The Company-facing and Advisor-facing read/write paths for the first
// visible Company↔Advisor product surface. Consumes — never duplicates —
// the canonical foundations already built:
//   Identity/Qualification (KORA-WP-030, migration 056)
//   Governed qualification grant (KORA-WP-032)
//   Assignment + validity (KORA-WP-031, migration 057)
// This module adds no new "current Advisor" table, no duplicated FK on
// `analytics.tenant`, no app_metadata mapping — every read derives from the
// canonical `advisor.advisor_assignment` row via
// lib/advisor-assignment/advisor-assignment-service.ts.
//
// FIELD MINIMIZATION (Step 10/12/38 of this WP's own authorization): the
// Company never receives auth_user_id, prerequisite-eligibility internals,
// conflict_flag, governance actor ids, or qualification database metadata —
// only { advisorId, fullName, role, valid } is projected. No biography, no
// headshot, no rating, no skills tag, no phone/email — none of those fields
// exist anywhere in the canonical Advisor Identity model (migration 056
// deliberately does not persist them either) and none is invented here.
//
// VALID ASSIGNMENT IS THE GATE, NOT MERE EXISTENCE (Step 6/27): an
// Assignment row existing is not sufficient to treat an Advisor as
// "your Company Advisor" — `getCompanyAssignedAdvisor` always calls
// `evaluateAdvisorAssignmentValidity()` and returns the `valid` flag
// alongside the profile so the UI never silently presents an invalid
// relationship as operational.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';
import { evaluateAdvisorAssignmentValidity } from '@/lib/advisor-assignment/advisor-assignment-service';
import type { AdvisorRole } from '@/lib/advisor-identity/advisor-identity-service';

export interface CompanyAssignedAdvisor {
  assignmentId: string;
  advisorId: string;
  fullName: string;
  role: AdvisorRole;
  valid: boolean;
  invalidReasons: string[];
}

export interface AdvisorAssignedCompany {
  assignmentId: string;
  companyId: string;
  companyName: string;
  role: AdvisorRole;
  valid: boolean;
  invalidReasons: string[];
}

export interface ContactMessage {
  id: string;
  assignmentId: string;
  senderRole: 'COMPANY_ADMIN' | 'ADVISOR';
  body: string;
  createdAt: string;
}

interface ContactMessageDbRow {
  id: string; assignment_id: string; sender_role: string; body: string; created_at: string;
}

function toContactMessage(row: ContactMessageDbRow): ContactMessage {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    senderRole: row.sender_role as ContactMessage['senderRole'],
    body: row.body,
    createdAt: row.created_at,
  };
}

// ── getCompanyAssignedAdvisor — the Company's own read path ─────────────────
// Scoped exclusively by the trusted, session-derived tenantId (never a
// request parameter) — same convention as need-hypothesis-service's own
// listNeedHypothesesForTenant(tenantId).

export async function getCompanyAssignedAdvisor(tenantId: string): Promise<CompanyAssignedAdvisor | null> {
  const db = getSupabaseServiceClient();

  const { data: assignment, error: assignmentError } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select()
    .eq('company_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();

  if (assignmentError) {
    throw new Error(`[KORA] getCompanyAssignedAdvisor failed: ${assignmentError.message}`);
  }
  if (!assignment) {
    return null;
  }

  const { data: identity, error: identityError } = await db
    .schema('advisor')
    .from('advisor_identity')
    .select('id, full_name')
    .eq('id', assignment.advisor_id)
    .maybeSingle();

  if (identityError || !identity) {
    throw new Error(`[KORA] getCompanyAssignedAdvisor failed: ${identityError?.message ?? 'advisor identity not found'}`);
  }

  const validity = await evaluateAdvisorAssignmentValidity(assignment.id);

  return {
    assignmentId: assignment.id,
    advisorId: identity.id,
    fullName: identity.full_name,
    role: assignment.role as AdvisorRole,
    valid: validity.valid,
    invalidReasons: validity.reasons,
  };
}

// ── getCompanyAssignmentForHistoricalRead — Founder Decision 4 ──────────────
// Founder Decision 4 (WP-036 semantic gate): "Company retains read-only
// access to its canonically Company-visible history after the Advisor
// Assignment ends" — retention is a different question from the current
// operational relationship. Deliberately NOT status-filtered.
//
// This function answers ONLY "what is the most recent Assignment this
// Company has ever had, so its historical records can be read" — it must
// NEVER be used to authorize a new write (createAppointment,
// sendContactMessage, createAdvisorContent all correctly continue to use
// getCompanyAssignedAdvisor above, which stays active-only). Pilot-minimum
// scope: resolves the single most recent Assignment (any status), matching
// the first-pilot "one active Company Advisor at a time" cardinality
// (doc 73 §3) — a Company with more than one *ended* Assignment over time
// (e.g. two different past Advisors) will see history from only the most
// recent one through this path; a full multi-Advisor history browser is
// out of this narrow scope (no new History Center — Founder instruction).
//
// Field-minimized identically to getCompanyAssignedAdvisor: no
// qualification/eligibility internals, no auth_user_id — plus `status` so
// the caller can render "past" rather than implying a current relationship
// (a former Advisor must never be displayed as the Company's CURRENT
// Advisor).

export interface CompanyHistoricalAssignment {
  assignmentId: string;
  advisorId: string;
  fullName: string;
  status: 'active' | 'ended';
}

export async function getCompanyAssignmentForHistoricalRead(tenantId: string): Promise<CompanyHistoricalAssignment | null> {
  const db = getSupabaseServiceClient();

  const { data: assignment, error: assignmentError } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select()
    .eq('company_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignmentError) {
    throw new Error(`[KORA] getCompanyAssignmentForHistoricalRead failed: ${assignmentError.message}`);
  }
  if (!assignment) {
    return null;
  }

  const { data: identity, error: identityError } = await db
    .schema('advisor')
    .from('advisor_identity')
    .select('id, full_name')
    .eq('id', assignment.advisor_id)
    .maybeSingle();

  if (identityError || !identity) {
    throw new Error(`[KORA] getCompanyAssignmentForHistoricalRead failed: ${identityError?.message ?? 'advisor identity not found'}`);
  }

  return {
    assignmentId: assignment.id,
    advisorId: identity.id,
    fullName: identity.full_name,
    status: assignment.status as 'active' | 'ended',
  };
}

// ── getAdvisorAssignedCompanies — the Advisor's own read path ───────────────
// Scoped exclusively by the trusted, session-derived advisorId (resolved via
// getAdvisorIdentityByAuthUserId(auth.id), never a request parameter).

export async function getAdvisorAssignedCompanies(advisorId: string): Promise<AdvisorAssignedCompany[]> {
  const db = getSupabaseServiceClient();

  const { data: assignments, error: assignmentsError } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select()
    .eq('advisor_id', advisorId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (assignmentsError) {
    throw new Error(`[KORA] getAdvisorAssignedCompanies failed: ${assignmentsError.message}`);
  }

  const rows = assignments ?? [];
  const result: AdvisorAssignedCompany[] = [];

  for (const assignment of rows) {
    const { data: tenant, error: tenantError } = await db
      .schema('analytics')
      .from('tenant')
      .select('id, company_name')
      .eq('id', assignment.company_id)
      .maybeSingle();

    if (tenantError || !tenant) {
      throw new Error(`[KORA] getAdvisorAssignedCompanies failed: ${tenantError?.message ?? 'company not found'}`);
    }

    const validity = await evaluateAdvisorAssignmentValidity(assignment.id);

    result.push({
      assignmentId: assignment.id,
      companyId: tenant.id,
      companyName: tenant.company_name,
      role: assignment.role as AdvisorRole,
      valid: validity.valid,
      invalidReasons: validity.reasons,
    });
  }

  return result;
}

// ── sendContactMessage — the minimum non-calendar contact/message surface ──
// Requires a currently VALID assignment (Step 6/27 discipline: existence
// alone never grants operational authority) and that the caller's trusted,
// server-resolved identity actually matches a party to that Assignment.

export interface SendContactMessageParams {
  assignmentId: string;
  senderRole: 'COMPANY_ADMIN' | 'ADVISOR';
  body: string;
  callerTenantId?: string; // required and checked when senderRole is COMPANY_ADMIN
  callerAdvisorId?: string; // required and checked when senderRole is ADVISOR
}

export async function sendContactMessage(params: SendContactMessageParams): Promise<ContactMessage> {
  if (!params.body || !params.body.trim()) {
    throw new Error('[KORA] sendContactMessage rejected: message body is required.');
  }
  if (params.body.length > 4000) {
    throw new Error('[KORA] sendContactMessage rejected: message body exceeds the maximum length.');
  }

  const db = getSupabaseServiceClient();

  const { data: assignment, error: assignmentError } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select()
    .eq('id', params.assignmentId)
    .maybeSingle();

  if (assignmentError) {
    throw new Error(`[KORA] sendContactMessage failed: ${assignmentError.message}`);
  }
  if (!assignment) {
    throw new Error('[KORA] sendContactMessage rejected: no such Assignment.');
  }

  // The caller must genuinely be a party to THIS Assignment — a
  // browser-supplied assignmentId alone never grants authority.
  if (params.senderRole === 'COMPANY_ADMIN') {
    if (!params.callerTenantId || assignment.company_id !== params.callerTenantId) {
      throw new Error('[KORA] sendContactMessage rejected: caller is not the Company party to this Assignment.');
    }
  } else if (params.senderRole === 'ADVISOR') {
    if (!params.callerAdvisorId || assignment.advisor_id !== params.callerAdvisorId) {
      throw new Error('[KORA] sendContactMessage rejected: caller is not the Advisor party to this Assignment.');
    }
  } else {
    throw new Error('[KORA] sendContactMessage rejected: unsupported sender role.');
  }

  const validity = await evaluateAdvisorAssignmentValidity(params.assignmentId);
  if (!validity.valid) {
    throw new Error(`[KORA] sendContactMessage rejected: Assignment is not currently valid (${validity.reasons.join(', ')}).`);
  }

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_contact_message')
    .insert({ assignment_id: params.assignmentId, sender_role: params.senderRole, body: params.body })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] sendContactMessage failed: ${error?.message ?? 'no data returned'}`);
  }

  const message = toContactMessage(data as ContactMessageDbRow);

  // Not one of WP-006's 14 named categories (contact messages are not
  // "Assignment changes") — generic substrate, same reasoning as every
  // prior non-catalogued Advisor-domain event.
  await recordGovernanceEvent({
    sourceModule: 'advisor-portal',
    actorRole: params.senderRole,
    actorId: params.senderRole === 'COMPANY_ADMIN' ? (params.callerTenantId as string) : (params.callerAdvisorId as string),
    eventType: 'advisor_contact_message.sent',
    objectType: 'advisor_contact_message',
    objectId: message.id,
    payload: { assignmentId: params.assignmentId, senderRole: params.senderRole },
  });

  return message;
}

// ── listContactMessages — read path for one Assignment's thread ────────────
// Same caller-must-be-a-party discipline as sendContactMessage.

export interface ListContactMessagesParams {
  assignmentId: string;
  callerTenantId?: string;
  callerAdvisorId?: string;
}

export async function listContactMessages(params: ListContactMessagesParams): Promise<ContactMessage[]> {
  const db = getSupabaseServiceClient();

  const { data: assignment, error: assignmentError } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select()
    .eq('id', params.assignmentId)
    .maybeSingle();

  if (assignmentError) {
    throw new Error(`[KORA] listContactMessages failed: ${assignmentError.message}`);
  }
  if (!assignment) {
    throw new Error('[KORA] listContactMessages rejected: no such Assignment.');
  }

  const isCompanyParty = params.callerTenantId && assignment.company_id === params.callerTenantId;
  const isAdvisorParty = params.callerAdvisorId && assignment.advisor_id === params.callerAdvisorId;
  if (!isCompanyParty && !isAdvisorParty) {
    throw new Error('[KORA] listContactMessages rejected: caller is not a party to this Assignment.');
  }

  // Founder Decision H-A (WP-036 semantic gate, doc 73 §15: "no active
  // Assignment, no access — this is the single access-granting condition").
  // The Advisor's own operational access ends when the Assignment ends.
  // The Company's own retained visibility is unaffected — Company history
  // is canonical regardless of the Assignment's current status.
  if (isAdvisorParty && assignment.status !== 'active') {
    throw new Error('[KORA] listContactMessages rejected: Advisor Assignment has ended — operational access no longer applies.');
  }

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_contact_message')
    .select()
    .eq('assignment_id', params.assignmentId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listContactMessages failed: ${error.message}`);
  }

  return ((data ?? []) as ContactMessageDbRow[]).map(toContactMessage);
}
