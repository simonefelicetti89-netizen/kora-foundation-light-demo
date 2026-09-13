// lib/advisor-portal/advisor-appointment-service.ts
// KORA-WP-035 — Advisor Calendar & Call/Appointment Lineage.
//
// Implements doc 76 (DD-2.1) §11 "Call/Appointment Lineage" (the four
// mechanism-agnostic invariants) and §12 "Shared vs. Internal Call Context"
// (only the Shared half — see migration 059's own header for why no
// internal-context field exists). Status vocabulary is doc 73 §13,
// verbatim: `requested → confirmed → completed | rescheduled | cancelled |
// no-show` — this module wires only create/confirm/reschedule/cancel; no
// completed/no-show marking function exists (disclosed narrowing, report
// 122).
//
// VALID ASSIGNMENT REQUIRED TO BOOK: every mutating function calls
// evaluateAdvisorAssignmentValidity() and rejects if the Assignment is not
// currently valid — the same principle already established for WP-033's
// contact messages (an Assignment existing is not sufficient authorization).
//
// MUTATION AUTHORITY (doc 73 §13: "A Call is created by a Company/Partner-
// initiated booking"): creation is COMPANY-only. Confirmation is
// ADVISOR-only (the Advisor accepts the proposed time). Reschedule/cancel
// are available to either party — doc 73 §13 names these as plain "state
// transitions," not restricted to one side, matching WP-033's own symmetric
// Company/Advisor design. Every function checks the caller is genuinely a
// party to the Assignment (never trusts a client-supplied role/id alone).

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';
import { evaluateAdvisorAssignmentValidity } from '@/lib/advisor-assignment/advisor-assignment-service';

export const APPOINTMENT_STATUSES = ['requested', 'confirmed', 'completed', 'rescheduled', 'cancelled', 'no-show'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface Appointment {
  id: string;
  assignmentId: string;
  startsAt: string;
  endsAt: string;
  subject: string;
  status: AppointmentStatus;
  rescheduledFromId: string | null;
  reason: string | null;
  createdByRole: 'COMPANY_ADMIN' | 'ADVISOR';
  createdAt: string;
  updatedAt: string;
}

interface AppointmentDbRow {
  id: string; assignment_id: string; starts_at: string; ends_at: string; subject: string;
  status: string; rescheduled_from_id: string | null; reason: string | null;
  created_by_role: string; created_at: string; updated_at: string;
}

function toAppointment(row: AppointmentDbRow): Appointment {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    subject: row.subject,
    status: row.status as AppointmentStatus,
    rescheduledFromId: row.rescheduled_from_id,
    reason: row.reason,
    createdByRole: row.created_by_role as Appointment['createdByRole'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertCallerIsParty(
  db: ReturnType<typeof getSupabaseServiceClient>,
  assignmentId: string,
  callerTenantId?: string,
  callerAdvisorId?: string,
): Promise<{ companyId: string; advisorId: string }> {
  const { data: assignment, error } = await db
    .schema('advisor')
    .from('advisor_assignment')
    .select()
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] appointment operation failed: ${error.message}`);
  }
  if (!assignment) {
    throw new Error('[KORA] appointment operation rejected: no such Assignment.');
  }

  const isCompanyParty = callerTenantId && assignment.company_id === callerTenantId;
  const isAdvisorParty = callerAdvisorId && assignment.advisor_id === callerAdvisorId;
  if (!isCompanyParty && !isAdvisorParty) {
    throw new Error('[KORA] appointment operation rejected: caller is not a party to this Assignment.');
  }

  return { companyId: assignment.company_id, advisorId: assignment.advisor_id };
}

// ── createAppointment — COMPANY-only, requires a currently valid Assignment ──

export interface CreateAppointmentParams {
  assignmentId: string;
  startsAt: string;
  endsAt: string;
  subject: string;
  callerTenantId: string;
  actorId: string;
}

export async function createAppointment(params: CreateAppointmentParams): Promise<Appointment> {
  if (!params.subject || !params.subject.trim()) {
    throw new Error('[KORA] createAppointment rejected: subject is required.');
  }
  if (new Date(params.endsAt) <= new Date(params.startsAt)) {
    throw new Error('[KORA] createAppointment rejected: endsAt must be after startsAt.');
  }

  const db = getSupabaseServiceClient();

  await assertCallerIsParty(db, params.assignmentId, params.callerTenantId, undefined);

  const validity = await evaluateAdvisorAssignmentValidity(params.assignmentId);
  if (!validity.valid) {
    throw new Error(`[KORA] createAppointment rejected: Assignment is not currently valid (${validity.reasons.join(', ')}).`);
  }

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_appointment')
    .insert({
      assignment_id: params.assignmentId, starts_at: params.startsAt, ends_at: params.endsAt,
      subject: params.subject, created_by_role: 'COMPANY_ADMIN',
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createAppointment failed: ${error?.message ?? 'no data returned'}`);
  }

  const appointment = toAppointment(data as AppointmentDbRow);

  await recordGovernanceEvent({
    sourceModule: 'advisor-portal', actorRole: 'COMPANY_ADMIN', actorId: params.actorId,
    eventType: 'advisor_appointment.requested', objectType: 'advisor_appointment', objectId: appointment.id,
    payload: { assignmentId: params.assignmentId, startsAt: params.startsAt, endsAt: params.endsAt },
  });

  return appointment;
}

// ── confirmAppointment — ADVISOR-only ────────────────────────────────────────

export interface ConfirmAppointmentParams {
  appointmentId: string;
  callerAdvisorId: string;
  actorId: string;
}

export async function confirmAppointment(params: ConfirmAppointmentParams): Promise<Appointment> {
  const db = getSupabaseServiceClient();

  const { data: existing, error: lookupError } = await db
    .schema('advisor')
    .from('advisor_appointment')
    .select()
    .eq('id', params.appointmentId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`[KORA] confirmAppointment failed: ${lookupError.message}`);
  }
  if (!existing) {
    throw new Error('[KORA] confirmAppointment rejected: no such Appointment.');
  }

  await assertCallerIsParty(db, existing.assignment_id, undefined, params.callerAdvisorId);

  if (existing.status !== 'requested') {
    throw new Error(`[KORA] confirmAppointment rejected: cannot confirm from status "${existing.status}".`);
  }

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_appointment')
    .update({ status: 'confirmed' })
    .eq('id', params.appointmentId)
    .eq('status', 'requested')
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] confirmAppointment failed: ${error?.message ?? 'no data returned'}`);
  }

  const appointment = toAppointment(data as AppointmentDbRow);

  await recordGovernanceEvent({
    sourceModule: 'advisor-portal', actorRole: 'ADVISOR', actorId: params.actorId,
    eventType: 'advisor_appointment.confirmed', objectType: 'advisor_appointment', objectId: appointment.id,
  });

  return appointment;
}

// ── cancelAppointment — either party ─────────────────────────────────────────

export interface CancelAppointmentParams {
  appointmentId: string;
  reason: string;
  callerTenantId?: string;
  callerAdvisorId?: string;
  actorRole: 'COMPANY_ADMIN' | 'ADVISOR';
  actorId: string;
}

export async function cancelAppointment(params: CancelAppointmentParams): Promise<Appointment> {
  if (!params.reason || !params.reason.trim()) {
    throw new Error('[KORA] cancelAppointment rejected: reason is required.');
  }

  const db = getSupabaseServiceClient();

  const { data: existing, error: lookupError } = await db
    .schema('advisor')
    .from('advisor_appointment')
    .select()
    .eq('id', params.appointmentId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`[KORA] cancelAppointment failed: ${lookupError.message}`);
  }
  if (!existing) {
    throw new Error('[KORA] cancelAppointment rejected: no such Appointment.');
  }

  await assertCallerIsParty(db, existing.assignment_id, params.callerTenantId, params.callerAdvisorId);

  if (existing.status !== 'requested' && existing.status !== 'confirmed') {
    throw new Error(`[KORA] cancelAppointment rejected: cannot cancel from status "${existing.status}".`);
  }

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_appointment')
    .update({ status: 'cancelled', reason: params.reason })
    .eq('id', params.appointmentId)
    .in('status', ['requested', 'confirmed'])
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] cancelAppointment failed: ${error?.message ?? 'no data returned'}`);
  }

  const appointment = toAppointment(data as AppointmentDbRow);

  await recordGovernanceEvent({
    sourceModule: 'advisor-portal', actorRole: params.actorRole, actorId: params.actorId,
    eventType: 'advisor_appointment.cancelled', objectType: 'advisor_appointment', objectId: appointment.id,
    payload: { reason: params.reason },
  });

  return appointment;
}

// ── rescheduleAppointment — either party; INSERT new row + mark old row ─────
// Never UPDATEs starts_at/ends_at in place (doc 76 §11's own invariant).

export interface RescheduleAppointmentParams {
  appointmentId: string;
  newStartsAt: string;
  newEndsAt: string;
  reason: string;
  newSubject?: string;
  callerTenantId?: string;
  callerAdvisorId?: string;
  actorRole: 'COMPANY_ADMIN' | 'ADVISOR';
  actorId: string;
}

export async function rescheduleAppointment(params: RescheduleAppointmentParams): Promise<Appointment> {
  if (!params.reason || !params.reason.trim()) {
    throw new Error('[KORA] rescheduleAppointment rejected: reason is required.');
  }
  if (new Date(params.newEndsAt) <= new Date(params.newStartsAt)) {
    throw new Error('[KORA] rescheduleAppointment rejected: newEndsAt must be after newStartsAt.');
  }

  const db = getSupabaseServiceClient();

  const { data: existing, error: lookupError } = await db
    .schema('advisor')
    .from('advisor_appointment')
    .select()
    .eq('id', params.appointmentId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`[KORA] rescheduleAppointment failed: ${lookupError.message}`);
  }
  if (!existing) {
    throw new Error('[KORA] rescheduleAppointment rejected: no such Appointment.');
  }

  await assertCallerIsParty(db, existing.assignment_id, params.callerTenantId, params.callerAdvisorId);

  if (existing.status !== 'requested' && existing.status !== 'confirmed') {
    throw new Error(`[KORA] rescheduleAppointment rejected: cannot reschedule from status "${existing.status}".`);
  }

  const validity = await evaluateAdvisorAssignmentValidity(existing.assignment_id);
  if (!validity.valid) {
    throw new Error(`[KORA] rescheduleAppointment rejected: Assignment is not currently valid (${validity.reasons.join(', ')}).`);
  }

  const { data: oldRow, error: updateError } = await db
    .schema('advisor')
    .from('advisor_appointment')
    .update({ status: 'rescheduled', reason: params.reason })
    .eq('id', params.appointmentId)
    .in('status', ['requested', 'confirmed'])
    .select()
    .single();

  if (updateError || !oldRow) {
    throw new Error(`[KORA] rescheduleAppointment failed: ${updateError?.message ?? 'no data returned'}`);
  }

  const { data: newRow, error: insertError } = await db
    .schema('advisor')
    .from('advisor_appointment')
    .insert({
      assignment_id: existing.assignment_id,
      starts_at: params.newStartsAt,
      ends_at: params.newEndsAt,
      subject: params.newSubject ?? existing.subject,
      rescheduled_from_id: existing.id,
      created_by_role: params.actorRole,
    })
    .select()
    .single();

  if (insertError || !newRow) {
    throw new Error(`[KORA] rescheduleAppointment failed: ${insertError?.message ?? 'no data returned'}`);
  }

  const replacement = toAppointment(newRow as AppointmentDbRow);

  await recordGovernanceEvent({
    sourceModule: 'advisor-portal', actorRole: params.actorRole, actorId: params.actorId,
    eventType: 'advisor_appointment.rescheduled', objectType: 'advisor_appointment', objectId: replacement.id,
    payload: { rescheduledFromId: existing.id, reason: params.reason },
  });

  return replacement;
}

// ── listAppointmentsForAssignment — caller-must-be-party read path ─────────

export interface ListAppointmentsParams {
  assignmentId: string;
  callerTenantId?: string;
  callerAdvisorId?: string;
}

export async function listAppointmentsForAssignment(params: ListAppointmentsParams): Promise<Appointment[]> {
  const db = getSupabaseServiceClient();

  await assertCallerIsParty(db, params.assignmentId, params.callerTenantId, params.callerAdvisorId);

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_appointment')
    .select()
    .eq('assignment_id', params.assignmentId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listAppointmentsForAssignment failed: ${error.message}`);
  }

  return ((data ?? []) as AppointmentDbRow[]).map(toAppointment);
}

// ── getAppointmentById ───────────────────────────────────────────────────────

export async function getAppointmentById(appointmentId: string): Promise<Appointment | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_appointment')
    .select()
    .eq('id', appointmentId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getAppointmentById failed: ${error.message}`);
  }

  return data ? toAppointment(data as AppointmentDbRow) : null;
}
