// lib/advisor-portal/advisor-content-service.ts
// KORA-WP-036 — Advisor Document/Note Five-Class Taxonomy.
//
// Doc 73 (DD-2 Advisor Canonical Operating Model) §14, verbatim classes:
//   1. ORGANISATION_SHAREABLE_NOTE — Company-visible.
//   2. ADVISOR_INTERNAL_NOTE — never Company-visible.
//   3. AUDIT_PROVENANCE_RECORD — KORA_ADMIN-only, immutable, created only by
//      KORA_ADMIN (a governance act, not Advisor-authored content).
//   4. CONFIDENTIAL_REFERENCE — never Company-visible, purpose-bound
//      (persisted as an accountability fact, not an enforced ABAC check —
//      see migration 060's own header).
//   5. COMMUNICATION_FOLLOWUP — its own `shared` flag determines whether it
//      behaves like Class 1 (shared=true) or Class 2 (shared=false).
//
// Every class is append-only (no update/delete function exists in this
// module, matching migration 060's own "no UPDATE/DELETE grant" design) —
// a correction is a new record, never an edit.
//
// VALID ASSIGNMENT REQUIRED for Advisor-authored classes (1/2/4/5) — same
// principle already established for WP-033 messages and WP-035
// appointments: an Assignment existing is not sufficient authorization.
// Class 3 (KORA_ADMIN-authored) is NOT gated on assignment validity — an
// administrative audit record documents what happened regardless of the
// Assignment's current validity state.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';
import { evaluateAdvisorAssignmentValidity } from '@/lib/advisor-assignment/advisor-assignment-service';

export const CONTENT_CLASSES = [
  'ORGANISATION_SHAREABLE_NOTE',
  'ADVISOR_INTERNAL_NOTE',
  'AUDIT_PROVENANCE_RECORD',
  'CONFIDENTIAL_REFERENCE',
  'COMMUNICATION_FOLLOWUP',
] as const;
export type ContentClass = (typeof CONTENT_CLASSES)[number];

// Classes an ADVISOR may create — everything except the governance-authored
// audit/provenance class.
const ADVISOR_CREATABLE_CLASSES: readonly ContentClass[] = [
  'ORGANISATION_SHAREABLE_NOTE', 'ADVISOR_INTERNAL_NOTE', 'CONFIDENTIAL_REFERENCE', 'COMMUNICATION_FOLLOWUP',
];

// KORA-WP-116 addition (migration 086, Founder Adjudication #3's
// due-diligence resolution): the one linkable object type today. NULL/NULL
// on every pre-existing (pre-WP-116) content record — see migration 086's
// own header for the full reasoning on why this is a narrow widening of
// THIS table, not a second content system.
export const CONTENT_LINKED_OBJECT_TYPES = ['material_change'] as const;
export type ContentLinkedObjectType = (typeof CONTENT_LINKED_OBJECT_TYPES)[number];

export interface AdvisorContentRecord {
  id: string;
  assignmentId: string;
  class: ContentClass;
  body: string;
  shared: boolean | null;
  purpose: string | null;
  createdByRole: 'ADVISOR' | 'KORA_ADMIN';
  linkedObjectType: ContentLinkedObjectType | null;
  linkedObjectId: string | null;
  createdAt: string;
}

interface ContentDbRow {
  id: string; assignment_id: string; class: string; body: string;
  shared: boolean | null; purpose: string | null; created_by_role: string;
  linked_object_type: string | null; linked_object_id: string | null; created_at: string;
}

function toContentRecord(row: ContentDbRow): AdvisorContentRecord {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    class: row.class as ContentClass,
    body: row.body,
    shared: row.shared,
    purpose: row.purpose,
    createdByRole: row.created_by_role as AdvisorContentRecord['createdByRole'],
    linkedObjectType: row.linked_object_type as ContentLinkedObjectType | null,
    linkedObjectId: row.linked_object_id,
    createdAt: row.created_at,
  };
}

async function assertAdvisorIsParty(
  db: ReturnType<typeof getSupabaseServiceClient>,
  assignmentId: string,
  callerAdvisorId: string,
): Promise<{ status: string }> {
  const { data: assignment, error } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select()
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] content operation failed: ${error.message}`);
  }
  if (!assignment || assignment.advisor_id !== callerAdvisorId) {
    throw new Error('[KORA] content operation rejected: caller is not the Advisor party to this Assignment.');
  }
  return { status: assignment.status as string };
}

// ── createAdvisorContent — ADVISOR-only, classes 1/2/4/5 ────────────────────
// Requires a currently VALID Assignment. Server-side class enforcement
// (Step 35): the caller cannot request AUDIT_PROVENANCE_RECORD through this
// function — it structurally only ever writes ADVISOR-creatable classes.

export interface CreateAdvisorContentParams {
  assignmentId: string;
  class: ContentClass;
  body: string;
  shared?: boolean; // required when class === 'COMMUNICATION_FOLLOWUP', ignored otherwise
  purpose?: string;  // required when class === 'CONFIDENTIAL_REFERENCE', ignored otherwise
  /**
   * KORA-WP-116 addition. Optional; both fields must be provided together
   * or omitted together. Used by lib/living-koral-review/review-service.ts
   * to link a KORAL Review interpretation note to the one specific
   * Material Change it concerns — see migration 086's own header. No
   * other caller in the repository sets these.
   */
  linkedObjectType?: ContentLinkedObjectType;
  linkedObjectId?: string;
  callerAdvisorId: string;
  actorId: string;
}

export async function createAdvisorContent(params: CreateAdvisorContentParams): Promise<AdvisorContentRecord> {
  if (!ADVISOR_CREATABLE_CLASSES.includes(params.class)) {
    throw new Error('[KORA] createAdvisorContent rejected: this class cannot be created by an Advisor.');
  }
  if (!params.body || !params.body.trim()) {
    throw new Error('[KORA] createAdvisorContent rejected: body is required.');
  }
  if (params.class === 'COMMUNICATION_FOLLOWUP' && typeof params.shared !== 'boolean') {
    throw new Error('[KORA] createAdvisorContent rejected: shared (true/false) is required for a communication/call follow-up record.');
  }
  if (params.class === 'CONFIDENTIAL_REFERENCE' && (!params.purpose || !params.purpose.trim())) {
    throw new Error('[KORA] createAdvisorContent rejected: purpose is required for a confidential reference.');
  }
  if ((params.linkedObjectType == null) !== (params.linkedObjectId == null)) {
    throw new Error('[KORA] createAdvisorContent rejected: linkedObjectType and linkedObjectId must be provided together.');
  }
  if (params.linkedObjectType && !CONTENT_LINKED_OBJECT_TYPES.includes(params.linkedObjectType)) {
    throw new Error('[KORA] createAdvisorContent rejected: unknown linkedObjectType.');
  }

  const db = getSupabaseServiceClient();

  await assertAdvisorIsParty(db, params.assignmentId, params.callerAdvisorId);

  const validity = await evaluateAdvisorAssignmentValidity(params.assignmentId);
  if (!validity.valid) {
    throw new Error(`[KORA] createAdvisorContent rejected: Assignment is not currently valid (${validity.reasons.join(', ')}).`);
  }

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_content_record')
    .insert({
      assignment_id: params.assignmentId,
      class: params.class,
      body: params.body,
      shared: params.class === 'COMMUNICATION_FOLLOWUP' ? params.shared : null,
      purpose: params.class === 'CONFIDENTIAL_REFERENCE' ? params.purpose : null,
      created_by_role: 'ADVISOR',
      linked_object_type: params.linkedObjectType ?? null,
      linked_object_id: params.linkedObjectId ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createAdvisorContent failed: ${error?.message ?? 'no data returned'}`);
  }

  const record = toContentRecord(data as ContentDbRow);

  // Not one of WP-006's 14 named categories — generic substrate, same
  // reasoning as every other non-catalogued Advisor-domain event.
  await recordGovernanceEvent({
    sourceModule: 'advisor-portal', actorRole: 'ADVISOR', actorId: params.actorId,
    eventType: 'advisor_content_record.created', objectType: 'advisor_content_record', objectId: record.id,
    payload: { assignmentId: params.assignmentId, class: record.class },
  });

  return record;
}

// ── createAuditProvenanceRecord — KORA_ADMIN-only, Class 3 ──────────────────
// Not gated on Assignment validity (a governance record documents what
// happened regardless of the Assignment's current state).

export interface CreateAuditProvenanceRecordParams {
  assignmentId: string;
  body: string;
  actorId: string;
}

export async function createAuditProvenanceRecord(params: CreateAuditProvenanceRecordParams): Promise<AdvisorContentRecord> {
  if (!params.body || !params.body.trim()) {
    throw new Error('[KORA] createAuditProvenanceRecord rejected: body is required.');
  }

  const db = getSupabaseServiceClient();

  const { data: assignment, error: lookupError } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select('id')
    .eq('id', params.assignmentId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`[KORA] createAuditProvenanceRecord failed: ${lookupError.message}`);
  }
  if (!assignment) {
    throw new Error('[KORA] createAuditProvenanceRecord rejected: no such Assignment.');
  }

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_content_record')
    .insert({
      assignment_id: params.assignmentId,
      class: 'AUDIT_PROVENANCE_RECORD',
      body: params.body,
      created_by_role: 'KORA_ADMIN',
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createAuditProvenanceRecord failed: ${error?.message ?? 'no data returned'}`);
  }

  const record = toContentRecord(data as ContentDbRow);

  await recordGovernanceEvent({
    sourceModule: 'advisor-portal', actorRole: 'KORA_ADMIN', actorId: params.actorId,
    eventType: 'advisor_content_record.audit_recorded', objectType: 'advisor_content_record', objectId: record.id,
    payload: { assignmentId: params.assignmentId },
  });

  return record;
}

// ── listContentForCompany — Class 1 + shared Class 5 only ───────────────────
// Scoped exclusively by the trusted, session-derived tenantId, never a
// request parameter.

export async function listContentForCompany(tenantId: string, assignmentId: string): Promise<AdvisorContentRecord[]> {
  const db = getSupabaseServiceClient();

  const { data: assignment, error: assignmentError } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select('id, company_id')
    .eq('id', assignmentId)
    .maybeSingle();

  if (assignmentError) {
    throw new Error(`[KORA] listContentForCompany failed: ${assignmentError.message}`);
  }
  if (!assignment || assignment.company_id !== tenantId) {
    throw new Error('[KORA] listContentForCompany rejected: caller is not the Company party to this Assignment.');
  }

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_content_record')
    .select()
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listContentForCompany failed: ${error.message}`);
  }

  // Defense in depth on top of RLS: never rely on RLS alone to filter what
  // this service returns to a Company-facing route.
  return ((data ?? []) as ContentDbRow[])
    .map(toContentRecord)
    .filter((r) => r.class === 'ORGANISATION_SHAREABLE_NOTE' || (r.class === 'COMMUNICATION_FOLLOWUP' && r.shared === true));
}

// ── listContentForAdvisor — classes 1/2/4/5, never Class 3 ──────────────────

export async function listContentForAdvisor(callerAdvisorId: string, assignmentId: string): Promise<AdvisorContentRecord[]> {
  const db = getSupabaseServiceClient();

  const { status } = await assertAdvisorIsParty(db, assignmentId, callerAdvisorId);

  // Founder Decision H-A (WP-036 semantic gate, doc 73 §15): the Advisor's
  // own operational read access ends when the Assignment ends. Company's
  // own visibility (listContentForCompany) is unaffected — Company
  // retention is canonical regardless of the Assignment's current status.
  if (status !== 'active') {
    throw new Error('[KORA] listContentForAdvisor rejected: Advisor Assignment has ended — operational access no longer applies.');
  }

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_content_record')
    .select()
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listContentForAdvisor failed: ${error.message}`);
  }

  // Defense in depth: never surface Class 3 through this path even if RLS
  // is ever changed — the Advisor path structurally excludes it here too.
  return ((data ?? []) as ContentDbRow[])
    .map(toContentRecord)
    .filter((r) => r.class !== 'AUDIT_PROVENANCE_RECORD');
}

// ── listContentLinkedToMaterialChange — KORA-WP-116 addition ────────────────
// The Advisor-facing read of KORAL Review interpretation for one specific
// Material Change — reuses this same Assignment-party/active-status gate,
// never a new one.

export async function listContentLinkedToMaterialChange(
  callerAdvisorId: string,
  assignmentId: string,
  materialChangeId: string,
): Promise<AdvisorContentRecord[]> {
  const db = getSupabaseServiceClient();

  const { status } = await assertAdvisorIsParty(db, assignmentId, callerAdvisorId);
  if (status !== 'active') {
    throw new Error('[KORA] listContentLinkedToMaterialChange rejected: Advisor Assignment has ended — operational access no longer applies.');
  }

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_content_record')
    .select()
    .eq('assignment_id', assignmentId)
    .eq('linked_object_type', 'material_change')
    .eq('linked_object_id', materialChangeId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listContentLinkedToMaterialChange failed: ${error.message}`);
  }

  return ((data ?? []) as ContentDbRow[]).map(toContentRecord);
}
