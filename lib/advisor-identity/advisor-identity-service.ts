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
