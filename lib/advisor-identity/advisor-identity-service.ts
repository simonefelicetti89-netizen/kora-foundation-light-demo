// lib/advisor-identity/advisor-identity-service.ts
// KORA-WP-030 — Advisor Identity/Profile + Two Role Qualifications.
//
// Implements the two of doc 76 (DD-2.1) §2-§4's three-concept model that
// belong to this WP: Advisor Identity/Profile (one per human Advisor) and
// Advisor Role Qualification (a per-role governance record — NOT a second
// identity). The third concept, Assignment Role Context, is KORA-WP-031's
// scope, not touched here.
//
// GOVERNANCE-CATEGORY NOTE (Step 33 of this WP's own authorization): WP-006's
// governed-action catalogue (lib/audit/governed-action-catalog.ts) already
// names `ADVISOR_ROLE_QUALIFICATION_CHANGE` as one of its 14 frozen
// categories — but that same module's own header comment explicitly assigns
// the real, owning workflow for that category to KORA-WP-032 ("Advisor Role
// Qualification = KORA-WP-032"), not to this WP. Using recordGovernedAction()
// here would prematurely claim WP-032's category for WP-030's own minimal
// foundation-creation events. This module therefore calls the generic
// recordGovernanceEvent() substrate directly — the same choice already made
// by KORA-WP-014/017 for their own creation events, for the identical
// reason (the action is not yet an "owned" governed workflow).
//
// NO SELF-SERVICE MUTATION: only service_role can write to either table
// (migration 056's own grants) — an Advisor can never create or mutate their
// own identity or qualification merely by holding the ADVISOR session role.
// Qualification is a governed capability (doc 76 §4), not a self-declared one.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';
import { recordGovernedAction } from '@/lib/audit/governed-action-catalog';

// Doc 76 §14 — Advisor Identity Lifecycle (one per person), independent of
// per-role qualification lifecycle.
export const ADVISOR_IDENTITY_STATUSES = [
  'candidate_onboarding', 'active', 'unavailable', 'globally_suspended', 'inactive_offboarded',
] as const;
export type AdvisorIdentityStatus = (typeof ADVISOR_IDENTITY_STATUSES)[number];

// Doc 76 §2-§3 — exactly two canonical Advisor roles, verbatim.
export const ADVISOR_ROLES = ['Company Advisor', 'Partner Advisor'] as const;
export type AdvisorRole = (typeof ADVISOR_ROLES)[number];

// Doc 76 §4 — exact 7-value qualification status vocabulary, verbatim.
export const QUALIFICATION_STATUSES = [
  'CANDIDATE', 'QUALIFICATION IN PROGRESS', 'QUALIFIED',
  'RENEWAL DUE', 'EXPIRED', 'SUSPENDED', 'REVOKED',
] as const;
export type QualificationStatus = (typeof QUALIFICATION_STATUSES)[number];

export interface AdvisorIdentity {
  id: string;
  authUserId: string;
  fullName: string;
  status: AdvisorIdentityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdvisorRoleQualification {
  id: string;
  advisorId: string;
  role: AdvisorRole;
  status: QualificationStatus;
  createdAt: string;
  updatedAt: string;
}

interface AdvisorIdentityDbRow {
  id: string; auth_user_id: string; full_name: string; status: string;
  created_at: string; updated_at: string;
}

interface AdvisorRoleQualificationDbRow {
  id: string; advisor_id: string; role: string; status: string;
  created_at: string; updated_at: string;
}

function toAdvisorIdentity(row: AdvisorIdentityDbRow): AdvisorIdentity {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    fullName: row.full_name,
    status: row.status as AdvisorIdentityStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAdvisorRoleQualification(row: AdvisorRoleQualificationDbRow): AdvisorRoleQualification {
  return {
    id: row.id,
    advisorId: row.advisor_id,
    role: row.role as AdvisorRole,
    status: row.status as QualificationStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── createAdvisorIdentity — KORA_ADMIN-provisioned, service-role only ────────
// No self-signup (mirrors network.partner_identity's own "KORA_ADMIN
// provisions all partner users" convention). Not one of WP-006's 14 governed
// categories, so this uses the generic substrate directly.

export interface CreateAdvisorIdentityParams {
  authUserId: string;
  fullName: string;
  actorRole: string;
  actorId: string;
}

export async function createAdvisorIdentity(params: CreateAdvisorIdentityParams): Promise<AdvisorIdentity> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_identity')
    .insert({ auth_user_id: params.authUserId, full_name: params.fullName })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createAdvisorIdentity failed: ${error?.message ?? 'no data returned'}`);
  }

  const identity = toAdvisorIdentity(data as AdvisorIdentityDbRow);

  await recordGovernanceEvent({
    sourceModule: 'advisor-identity',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'advisor_identity.created',
    objectType: 'advisor_identity',
    objectId: identity.id,
  });

  return identity;
}

// ── getAdvisorIdentityByAuthUserId — self-resolution for the ADVISOR guard ──
// Used by the server-side page/route so an Advisor can never pass their own
// advisor_id as a client-supplied value — identity is always looked up from
// the trusted, session-verified auth_user_id (requireAdvisorUser()'s own
// `.id` field), never accepted as a request parameter.

export async function getAdvisorIdentityByAuthUserId(authUserId: string): Promise<AdvisorIdentity | null> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_identity')
    .select()
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`[KORA] getAdvisorIdentityByAuthUserId failed: ${error.message}`);
  }

  return data ? toAdvisorIdentity(data as AdvisorIdentityDbRow) : null;
}

// ── createAdvisorRoleQualification — service-role only, initial status ──────
// Every qualification this function creates starts as 'CANDIDATE' (doc 76
// §4's own first lifecycle state) — no caller may set an initial status.

export interface CreateAdvisorRoleQualificationParams {
  advisorId: string;
  role: AdvisorRole;
  actorRole: string;
  actorId: string;
}

export async function createAdvisorRoleQualification(
  params: CreateAdvisorRoleQualificationParams,
): Promise<AdvisorRoleQualification> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_role_qualification')
    .insert({ advisor_id: params.advisorId, role: params.role })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createAdvisorRoleQualification failed: ${error?.message ?? 'no data returned'}`);
  }

  const qualification = toAdvisorRoleQualification(data as AdvisorRoleQualificationDbRow);

  await recordGovernanceEvent({
    sourceModule: 'advisor-identity',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'advisor_role_qualification.created',
    objectType: 'advisor_role_qualification',
    objectId: qualification.id,
    payload: { role: params.role },
  });

  return qualification;
}

// ── listRoleQualificationsForAdvisor ─────────────────────────────────────────

export async function listRoleQualificationsForAdvisor(advisorId: string): Promise<AdvisorRoleQualification[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_role_qualification')
    .select()
    .eq('advisor_id', advisorId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listRoleQualificationsForAdvisor failed: ${error.message}`);
  }

  return ((data ?? []) as AdvisorRoleQualificationDbRow[]).map(toAdvisorRoleQualification);
}

// ── updateAdvisorRoleQualificationStatus — minimal lifecycle mutation ───────
// Proves the two qualifications are independently lifecycled (WP-030's own
// Tests requirement) without building any approval/induction workflow — no
// transition-validity is enforced beyond the DB's own vocabulary CHECK
// (doc 76 §4 explicitly defers the governance PROCESS design, not just the
// vocabulary, to a later Control-Plane-implementing WP).

export async function updateAdvisorRoleQualificationStatus(
  qualificationId: string,
  newStatus: QualificationStatus,
  actorRole: string,
  actorId: string,
): Promise<AdvisorRoleQualification> {
  if (!QUALIFICATION_STATUSES.includes(newStatus)) {
    throw new Error(`[KORA] updateAdvisorRoleQualificationStatus rejected: "${newStatus}" is not a canonical qualification status (doc 76 §4).`);
  }

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_role_qualification')
    .update({ status: newStatus })
    .eq('id', qualificationId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] updateAdvisorRoleQualificationStatus failed: ${error?.message ?? 'no data returned'}`);
  }

  const qualification = toAdvisorRoleQualification(data as AdvisorRoleQualificationDbRow);

  await recordGovernanceEvent({
    sourceModule: 'advisor-identity',
    actorRole,
    actorId,
    eventType: 'advisor_role_qualification.status_changed',
    objectType: 'advisor_role_qualification',
    objectId: qualification.id,
    payload: { role: qualification.role, newStatus },
  });

  return qualification;
}

// ═══════════════════════════════════════════════════════════════════════════
// KORA-WP-032 — Advisor Governance: Qualification Grant, Manual First-Pilot.
//
// Doc 81 (DD-1.1) §11 — "Advisor Role Qualification Grant Authority
// Strengthened": authority belongs to KORA Advisor Governance; Academy
// completion does not grant the qualification; the Advisor cannot self-grant;
// the candidate cannot approve their own qualification. "First controlled
// pilot rule: an explicit, authorized KORA governance decision is required
// to grant or renew each Advisor Role Qualification." No auto-grant, no
// policy engine, no batch — one explicit decision per qualification.
//
// This is deliberately a NARROW wrapper, not a new lifecycle mechanism: it
// reuses migration 056's existing physical model and service_role-only
// grants unchanged (no new migration — see report 119, Data/Migration
// Impact). What it adds beyond WP-030's already-existing
// updateAdvisorRoleQualificationStatus() is (a) a function named and scoped
// exactly to the governed "grant/renew" decision, not generic status CRUD,
// and (b) — unlike WP-030's own events — this is finally the real owning
// workflow WP-006's governed-action catalogue named for
// ADVISOR_ROLE_QUALIFICATION_CHANGE ("Advisor Role Qualification =
// KORA-WP-032", governed-action-catalog.ts's own header comment), so this
// function calls recordGovernedAction() with that exact category, not the
// generic substrate.
//
// GRANT/RENEW SCOPE (this WP's own reasoned boundary, disclosed in report
// 119 — doc 81 does not enumerate exact from-states): allowed from
// CANDIDATE, QUALIFICATION IN PROGRESS, RENEWAL DUE, or EXPIRED (the last
// two both being what "renew" means) — i.e. any non-terminal, non-QUALIFIED
// state. Rejected from an already-QUALIFIED state (duplicate-grant guard)
// and from SUSPENDED/REVOKED (reinstatement is a distinct, unbuilt governed
// action, not a "grant"). Revocation/suspension themselves are explicitly
// out of this WP's scope (registry Out of Scope: "automated/policy-based
// grant"; no revoke/suspend acceptance criterion exists for WP-032).

const GRANT_ELIGIBLE_STATUSES: readonly QualificationStatus[] = [
  'CANDIDATE', 'QUALIFICATION IN PROGRESS', 'RENEWAL DUE', 'EXPIRED',
];

export interface GrantAdvisorRoleQualificationParams {
  qualificationId: string;
  grantedByOperatorId: string;
}

export async function grantAdvisorRoleQualification(
  params: GrantAdvisorRoleQualificationParams,
): Promise<AdvisorRoleQualification> {
  const db = getSupabaseServiceClient();

  // Look up the existing row first — grant never creates one (Step 26 of
  // this WP's authorization: "Grant to nonexistent [qualification record]
  // must fail safely" — creation remains WP-030's createAdvisorRoleQualification,
  // called separately, before any grant decision can be made).
  const { data: existing, error: lookupError } = await db
    .schema('advisor')
    .from('advisor_role_qualification')
    .select()
    .eq('id', params.qualificationId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`[KORA] grantAdvisorRoleQualification failed: ${lookupError.message}`);
  }
  if (!existing) {
    throw new Error('[KORA] grantAdvisorRoleQualification rejected: no qualification record exists for this id — create one first.');
  }

  const current = toAdvisorRoleQualification(existing as AdvisorRoleQualificationDbRow);

  if (current.status === 'QUALIFIED') {
    throw new Error('[KORA] grantAdvisorRoleQualification rejected: this qualification is already QUALIFIED — duplicate grant.');
  }
  if (!GRANT_ELIGIBLE_STATUSES.includes(current.status)) {
    throw new Error(`[KORA] grantAdvisorRoleQualification rejected: cannot grant from status "${current.status}" — not eligible for grant/renew.`);
  }

  const previousStatus = current.status;

  const { data: updated, error: updateError } = await db
    .schema('advisor')
    .from('advisor_role_qualification')
    .update({ status: 'QUALIFIED' })
    .eq('id', params.qualificationId)
    .select()
    .single();

  if (updateError || !updated) {
    throw new Error(`[KORA] grantAdvisorRoleQualification failed: ${updateError?.message ?? 'no data returned'}`);
  }

  const granted = toAdvisorRoleQualification(updated as AdvisorRoleQualificationDbRow);

  // The real owning workflow for ADVISOR_ROLE_QUALIFICATION_CHANGE (WP-006's
  // own catalogue comment names this exact WP) — not the generic substrate.
  await recordGovernedAction({
    category: 'ADVISOR_ROLE_QUALIFICATION_CHANGE',
    actorRole: 'KORA_ADMIN',
    actorId: params.grantedByOperatorId,
    objectType: 'advisor_role_qualification',
    objectId: granted.id,
    payload: {
      verb: previousStatus === 'EXPIRED' || previousStatus === 'RENEWAL DUE' ? 'renew' : 'grant',
      advisorId: granted.advisorId,
      role: granted.role,
      previousStatus,
      newStatus: 'QUALIFIED',
    },
  });

  return granted;
}

// ── listAllAdvisorIdentities — minimal Admin grant-UI support ───────────────
// Lets the Admin grant surface show which Advisors exist to grant a
// qualification to. Read-only; no filtering/search logic beyond what the
// minimal Admin UI (file 102: "UI: Admin grant UI (minimal)") requires.

export async function listAllAdvisorIdentities(): Promise<AdvisorIdentity[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('advisor')
    .from('advisor_identity')
    .select()
    .order('full_name', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listAllAdvisorIdentities failed: ${error.message}`);
  }

  return ((data ?? []) as AdvisorIdentityDbRow[]).map(toAdvisorIdentity);
}
