// lib/operations/operational-case-service.ts
// KORA-WP-007 — Operational Case Primitive.
//
// The single generic Case reused across Advisor, Admin, Company, and
// Partner domains (doc 73 §12, doc 78 §30). CASE ONLY — no Task
// persistence (see migration 061's own header for the resolved
// Case-vs-Task scope gate). No dedicated history table: every creation,
// status transition, and reassignment is recorded via the generic
// audit.governance_event substrate (KORA-WP-006) — not one of the 14
// named governed-action categories, since none matches "Case lifecycle."
//
// CREATION/READ AUTHORITY (Acceptance's own two named origins): ADVISOR
// and KORA_ADMIN only. Advisor reads/creates/updates only Cases they own;
// KORA_ADMIN reads/creates/updates all. No Company/Partner/Worker path —
// not required by this WP's own Acceptance criterion.
//
// This service does NOT import evaluateAdvisorAssignmentValidity() —
// WP-007's own Hard Deps field names only KORA-WP-005, not KORA-WP-031.
// The one integrity check for a company-scoped Advisor-created Case is a
// lightweight existence check (a real advisor_assignment row, any status)
// — deliberately lighter than the WP-033/035/036 active-Assignment
// operational gate, which this WP does not extend.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';

export const CASE_ORGANISATION_TYPES = ['company', 'partner', 'admin'] as const;
export type CaseOrganisationType = (typeof CASE_ORGANISATION_TYPES)[number];

export const CASE_STATUSES = ['open', 'in-progress', 'blocked', 'resolved', 'escalated'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_LINKED_OBJECT_TYPES = ['commitment', 'program', 'review', 'certification', 'capability_validation'] as const;
export type CaseLinkedObjectType = (typeof CASE_LINKED_OBJECT_TYPES)[number];

export interface OperationalCase {
  id: string;
  organisationType: CaseOrganisationType;
  organisationId: string | null;
  linkedObjectType: CaseLinkedObjectType | null;
  linkedObjectId: string | null;
  owningAdvisorId: string | null;
  createdByRole: 'ADVISOR' | 'KORA_ADMIN';
  subject: string;
  priority: string | null;
  dueDate: string | null;
  status: CaseStatus;
  escalationTarget: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CaseDbRow {
  id: string; organisation_type: string; organisation_id: string | null;
  linked_object_type: string | null; linked_object_id: string | null;
  owning_advisor_id: string | null; created_by_role: string; subject: string;
  priority: string | null; due_date: string | null; status: string;
  escalation_target: string | null; resolution_note: string | null;
  created_at: string; updated_at: string;
}

function toCase(row: CaseDbRow): OperationalCase {
  return {
    id: row.id,
    organisationType: row.organisation_type as CaseOrganisationType,
    organisationId: row.organisation_id,
    linkedObjectType: row.linked_object_type as CaseLinkedObjectType | null,
    linkedObjectId: row.linked_object_id,
    owningAdvisorId: row.owning_advisor_id,
    createdByRole: row.created_by_role as OperationalCase['createdByRole'],
    subject: row.subject,
    priority: row.priority,
    dueDate: row.due_date,
    status: row.status as CaseStatus,
    escalationTarget: row.escalation_target,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertAdvisorTiedToCompany(
  db: ReturnType<typeof getSupabaseServiceClient>,
  advisorId: string,
  companyId: string,
): Promise<void> {
  const { data, error } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select('id')
    .eq('advisor_id', advisorId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] createOperationalCase failed: ${error.message}`);
  }
  if (!data) {
    throw new Error('[KORA] createOperationalCase rejected: Advisor has no Assignment tying them to this Company — a Case must be tied to a genuine relationship.');
  }
}

// Founder Gate A (polymorphic organisation-scope integrity, pre-push
// review): organisation_id cannot carry a native FK (it targets a
// different table depending on organisation_type — see migration 061's
// own header), so referential integrity for a *company*/*partner*-scoped
// Case is enforced here, at the service layer, by resolving organisation_id
// against the correct canonical table for that exact organisation_type
// before any insert — for EVERY caller, not only Advisor. For the
// Advisor-origin path this is transitively already guaranteed
// (advisor_assignment.company_id itself carries a real FK to
// analytics.tenant — an Assignment cannot exist against a fake company),
// but the KORA_ADMIN-origin path had no such transitive guarantee at all
// prior to this check: nothing previously stopped a KORA_ADMIN-origin
// Case from being created with an organisation_id that names no real
// Company or Partner, or a Company's id claimed as a Partner's (or vice
// versa) — this function closes exactly that gap, uniformly, for both
// callers. `admin` needs no check — organisation_id is NULL by contract
// (`operational_case_org_id_required_unless_admin`).
async function assertOrganisationExists(
  db: ReturnType<typeof getSupabaseServiceClient>,
  organisationType: CaseOrganisationType,
  organisationId: string,
): Promise<void> {
  if (organisationType === 'company') {
    const { data, error } = await db.schema('analytics').from('tenant').select('id').eq('id', organisationId).maybeSingle();
    if (error) {
      throw new Error(`[KORA] createOperationalCase failed: ${error.message}`);
    }
    if (!data) {
      throw new Error('[KORA] createOperationalCase rejected: organisationId does not identify a real Company.');
    }
  } else if (organisationType === 'partner') {
    const { data, error } = await db.schema('network').from('partner_profile').select('id').eq('id', organisationId).maybeSingle();
    if (error) {
      throw new Error(`[KORA] createOperationalCase failed: ${error.message}`);
    }
    if (!data) {
      throw new Error('[KORA] createOperationalCase rejected: organisationId does not identify a real Partner.');
    }
  }
  // 'admin': no organisationId to check (NULL by contract).
}

// ── createOperationalCase — ADVISOR or KORA_ADMIN only ──────────────────────

export interface CreateOperationalCaseParams {
  organisationType: CaseOrganisationType;
  organisationId?: string;
  linkedObjectType?: CaseLinkedObjectType;
  linkedObjectId?: string;
  subject: string;
  priority?: string;
  dueDate?: string;
  callerRole: 'ADVISOR' | 'KORA_ADMIN';
  callerAdvisorId?: string; // required when callerRole === 'ADVISOR'
  actorId: string;
}

export async function createOperationalCase(params: CreateOperationalCaseParams): Promise<OperationalCase> {
  if (!params.subject || !params.subject.trim()) {
    throw new Error('[KORA] createOperationalCase rejected: subject is required.');
  }
  if (!CASE_ORGANISATION_TYPES.includes(params.organisationType)) {
    throw new Error('[KORA] createOperationalCase rejected: unknown organisationType.');
  }
  if (params.organisationType !== 'admin' && !params.organisationId) {
    throw new Error('[KORA] createOperationalCase rejected: organisationId is required unless organisationType is "admin".');
  }
  if ((params.linkedObjectType == null) !== (params.linkedObjectId == null)) {
    throw new Error('[KORA] createOperationalCase rejected: linkedObjectType and linkedObjectId must be provided together.');
  }
  if (params.linkedObjectType && !CASE_LINKED_OBJECT_TYPES.includes(params.linkedObjectType)) {
    throw new Error('[KORA] createOperationalCase rejected: unknown linkedObjectType.');
  }

  const db = getSupabaseServiceClient();

  let owningAdvisorId: string | null = null;

  if (params.callerRole === 'ADVISOR') {
    if (!params.callerAdvisorId) {
      throw new Error('[KORA] createOperationalCase rejected: callerAdvisorId is required for an Advisor-origin Case.');
    }
    // advisor.advisor_assignment's own CHECK constraint restricts
    // organisation_type to 'company' only (Partner Advisor assignments do
    // not exist in code truth yet) — an Advisor-origin Case can only ever
    // be tied to a real relationship for 'company'. 'partner'/'admin'
    // Advisor-origin Cases would have no integrity check to perform
    // against, so they are rejected here rather than left ungated.
    if (params.organisationType !== 'company') {
      throw new Error('[KORA] createOperationalCase rejected: an Advisor-origin Case must be organisationType "company" — no Partner Advisor assignment model exists yet.');
    }
    await assertAdvisorTiedToCompany(db, params.callerAdvisorId, params.organisationId as string);
    owningAdvisorId = params.callerAdvisorId;
  } else if (params.callerRole !== 'KORA_ADMIN') {
    throw new Error('[KORA] createOperationalCase rejected: unsupported caller role.');
  }

  if (params.organisationType !== 'admin') {
    await assertOrganisationExists(db, params.organisationType, params.organisationId as string);
  }

  const { data, error } = await db
    .schema('gov')
    .from('operational_case')
    .insert({
      organisation_type: params.organisationType,
      organisation_id: params.organisationType === 'admin' ? null : params.organisationId,
      linked_object_type: params.linkedObjectType ?? null,
      linked_object_id: params.linkedObjectId ?? null,
      owning_advisor_id: owningAdvisorId,
      created_by_role: params.callerRole,
      subject: params.subject,
      priority: params.priority ?? null,
      due_date: params.dueDate ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createOperationalCase failed: ${error?.message ?? 'no data returned'}`);
  }

  const record = toCase(data as CaseDbRow);

  // Not one of WP-006's 14 named categories — generic substrate, same
  // reasoning as every other non-catalogued domain event this session.
  await recordGovernanceEvent({
    sourceModule: 'operational-case', actorRole: params.callerRole, actorId: params.actorId,
    eventType: 'operational_case.created', objectType: 'operational_case', objectId: record.id,
    payload: { organisationType: record.organisationType, organisationId: record.organisationId, status: record.status },
  });

  return record;
}

// ── getOperationalCaseById ───────────────────────────────────────────────────
// Defense-in-depth party check applied by the caller (listOperationalCases /
// transitionOperationalCaseStatus) — this raw getter does not itself
// authorize; every caller of it must independently verify ownership.

export async function getOperationalCaseById(caseId: string): Promise<OperationalCase | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('gov')
    .from('operational_case')
    .select()
    .eq('id', caseId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getOperationalCaseById failed: ${error.message}`);
  }
  return data ? toCase(data as CaseDbRow) : null;
}

// ── listOperationalCases — ADVISOR sees only their own; KORA_ADMIN sees all ──

export interface ListOperationalCasesParams {
  callerRole: 'ADVISOR' | 'KORA_ADMIN';
  callerAdvisorId?: string; // required when callerRole === 'ADVISOR'
}

export async function listOperationalCases(params: ListOperationalCasesParams): Promise<OperationalCase[]> {
  const db = getSupabaseServiceClient();

  let query = db.schema('gov').from('operational_case').select().order('created_at', { ascending: false });

  if (params.callerRole === 'ADVISOR') {
    if (!params.callerAdvisorId) {
      throw new Error('[KORA] listOperationalCases rejected: callerAdvisorId is required for an Advisor caller.');
    }
    query = query.eq('owning_advisor_id', params.callerAdvisorId);
  } else if (params.callerRole !== 'KORA_ADMIN') {
    throw new Error('[KORA] listOperationalCases rejected: unsupported caller role.');
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`[KORA] listOperationalCases failed: ${error.message}`);
  }
  return ((data ?? []) as CaseDbRow[]).map(toCase);
}

// Founder Gate B (canonical lifecycle transitions, pre-push review): doc 73
// §12 names only the five-word status vocabulary, with no transition graph
// — but doc 79 §13 ("Operational Case State Model," explicitly the same
// model, "Identical to DD-2's Case primitive") gives the exact frozen
// graph, verbatim:
//
//   open → in-progress → resolved
//      \-> blocked -> in-progress
//      \-> escalated -> (higher-authority handling) -> in-progress | resolved
//
// Read literally (both branches drawn from `open`, not `in-progress`):
// OPEN can go to in-progress, blocked, or escalated. IN-PROGRESS can only
// go to resolved. BLOCKED can only return to in-progress. ESCALATED can
// go to in-progress or resolved. RESOLVED is terminal (no outgoing edge
// drawn anywhere). This was NOT enforced in the first version of this
// service (any target status was accepted from any current status) —
// found and fixed before any push, per the same discipline as Gate A.
export const CASE_ALLOWED_TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  open: ['in-progress', 'blocked', 'escalated'],
  'in-progress': ['resolved'],
  blocked: ['in-progress'],
  escalated: ['in-progress', 'resolved'],
  resolved: [],
};

// ── transitionOperationalCaseStatus — the required status-transition op ─────
// ADVISOR may transition only a Case they own; KORA_ADMIN may transition
// any Case (including reassignment via newOwningAdvisorId — the "handoff
// record on reassignment" doc 73 §12 names, recorded as a governance_event,
// not a dedicated table — see migration 061's own header).

export interface TransitionOperationalCaseStatusParams {
  caseId: string;
  newStatus: CaseStatus;
  resolutionNote?: string;
  newOwningAdvisorId?: string; // KORA_ADMIN only — reassignment
  callerRole: 'ADVISOR' | 'KORA_ADMIN';
  callerAdvisorId?: string;
  actorId: string;
}

export async function transitionOperationalCaseStatus(params: TransitionOperationalCaseStatusParams): Promise<OperationalCase> {
  if (!CASE_STATUSES.includes(params.newStatus)) {
    throw new Error('[KORA] transitionOperationalCaseStatus rejected: unknown status.');
  }

  const db = getSupabaseServiceClient();

  const existing = await getOperationalCaseById(params.caseId);
  if (!existing) {
    throw new Error('[KORA] transitionOperationalCaseStatus rejected: no such Case.');
  }

  if (params.callerRole === 'ADVISOR') {
    if (!params.callerAdvisorId || existing.owningAdvisorId !== params.callerAdvisorId) {
      throw new Error('[KORA] transitionOperationalCaseStatus rejected: caller does not own this Case.');
    }
    if (params.newOwningAdvisorId) {
      throw new Error('[KORA] transitionOperationalCaseStatus rejected: only KORA_ADMIN may reassign a Case.');
    }
  } else if (params.callerRole !== 'KORA_ADMIN') {
    throw new Error('[KORA] transitionOperationalCaseStatus rejected: unsupported caller role.');
  }

  // A "transition" that leaves status unchanged (e.g. a pure reassignment
  // or resolution-note update) is not a graph edge at all — only an
  // actual status change is checked against CASE_ALLOWED_TRANSITIONS.
  if (params.newStatus !== existing.status) {
    const allowed = CASE_ALLOWED_TRANSITIONS[existing.status];
    if (!allowed.includes(params.newStatus)) {
      throw new Error(`[KORA] transitionOperationalCaseStatus rejected: cannot transition from "${existing.status}" to "${params.newStatus}" (doc 79 §13's canonical Case state model).`);
    }
  }

  const update: Record<string, unknown> = { status: params.newStatus };
  if (params.resolutionNote !== undefined) update.resolution_note = params.resolutionNote;
  if (params.callerRole === 'KORA_ADMIN' && params.newOwningAdvisorId !== undefined) {
    update.owning_advisor_id = params.newOwningAdvisorId;
  }

  const { data, error } = await db
    .schema('gov')
    .from('operational_case')
    .update(update)
    .eq('id', params.caseId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] transitionOperationalCaseStatus failed: ${error?.message ?? 'no data returned'}`);
  }

  const record = toCase(data as CaseDbRow);

  await recordGovernanceEvent({
    sourceModule: 'operational-case', actorRole: params.callerRole, actorId: params.actorId,
    eventType: params.newOwningAdvisorId ? 'operational_case.reassigned' : 'operational_case.status_changed',
    objectType: 'operational_case', objectId: record.id,
    payload: { fromStatus: existing.status, toStatus: record.status, reassignedTo: params.newOwningAdvisorId ?? null },
  });

  return record;
}
