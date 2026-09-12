// lib/company-membership/membership-service.ts
// KORA-WP-004 — Company Membership Table: minimal server-side service.
//
// Constitutional rule (PFFD-01, doc 66; `78` §5): AUTHENTICATION ≠ COMPANY
// MEMBERSHIP ≠ EMPLOYER INTELLIGENCE. This module is the ONLY place that
// creates or ends a row in analytics.company_memberships. It is deliberately
// NOT wired into any authentication/session-resolution path (middleware.ts,
// lib/auth/kora-session.ts) and NOT wired into the existing Company
// provisioning route (app/api/admin/live-company/route.ts) — this WP builds
// the standalone primitives only; integrating them into a live route is a
// separate, later, explicitly-authorized cutover (KORA-WP-004's own spec:
// "old role-check paths kept until cutover, contracted later once
// validated"). Authentication alone must never imply membership: nothing in
// this module is ever called merely because a user is authenticated or logs
// in — every call here is an explicit, governed action by its own caller.
//
// Every create/end call also writes one row to audit.audit_log (the same
// established table and shape app/api/admin/live-company/route.ts's own
// logAuditMany() helper already uses) — the constitutional "governed,
// auditable, never a silent merge" requirement (Test C, `78` §5) is met with
// existing infrastructure, not a new governance substrate (that remains
// KORA-WP-005/006's own, later, larger scope).
//
// Full membership-keyed RLS (a COMPANY_ADMIN self-read policy on this table,
// and RLS on other tables keyed off it) is explicitly KORA-WP-010's scope —
// this service and its table are reachable only via the service-role client,
// by design, until then (see migration 050's RLS section).

import { getSupabaseServiceClient, type ServiceDb } from '@/lib/supabase/server';

export type CompanyMembershipStatus = 'active' | 'ended';

export interface CompanyMembershipRow {
  id: string;
  tenantId: string;
  authUserId: string;
  role: 'COMPANY_ADMIN';
  status: CompanyMembershipStatus;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CompanyMembershipDbRow {
  id: string;
  tenant_id: string;
  auth_user_id: string;
  role: string;
  status: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

function toRow(db: CompanyMembershipDbRow): CompanyMembershipRow {
  return {
    id: db.id,
    tenantId: db.tenant_id,
    authUserId: db.auth_user_id,
    role: db.role as 'COMPANY_ADMIN',
    status: db.status as CompanyMembershipStatus,
    endedAt: db.ended_at,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ── audit — same table/shape as app/api/admin/live-company/route.ts's
// local logAuditMany() helper; not extracted to a shared module by this WP,
// to keep this change additive and avoid touching that existing route. ────

interface AuditContext {
  actorRole: string;
  actorId: string;
}

async function logMembershipAudit(
  db: ServiceDb,
  action: 'company_membership_created' | 'company_membership_ended',
  membership: CompanyMembershipRow,
  actor: AuditContext,
): Promise<void> {
  await db.schema('audit').from('audit_log').insert({
    tenant_id: membership.tenantId,
    actor_role: actor.actorRole,
    actor_id: actor.actorId,
    action,
    resource_type: 'company_membership',
    resource_id: membership.id,
    payload: {
      auth_user_id: membership.authUserId,
      role: membership.role,
      status: membership.status,
    },
    ip_address: null,
  });
}

// ── createCompanyMembership — explicit, governed creation ───────────────────
//
// Never call this merely because a user authenticated or exists — the
// caller (e.g. a future Company provisioning/invite flow) must decide this
// explicitly. Does not read or modify auth.users, app_metadata, or any
// identity/My KORA data — it only creates the separate membership record.

export interface CreateCompanyMembershipParams {
  tenantId: string;
  authUserId: string;
  actor: AuditContext;
}

export async function createCompanyMembership(
  params: CreateCompanyMembershipParams,
): Promise<CompanyMembershipRow> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('company_memberships')
    .insert({ tenant_id: params.tenantId, auth_user_id: params.authUserId })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createCompanyMembership failed: ${error?.message ?? 'no data returned'}`);
  }

  const membership = toRow(data as CompanyMembershipDbRow);
  await logMembershipAudit(db, 'company_membership_created', membership, params.actor);
  return membership;
}

// ── endCompanyMembership — explicit, governed termination ───────────────────
//
// Sets status='ended' and ended_at=now() on the membership row only.
// Never touches auth.users, app_metadata, personal.worker_identity, or any
// My KORA data — the underlying authenticated identity is untouched by
// construction (this function has no code path that could reach it).

export interface EndCompanyMembershipParams {
  membershipId: string;
  actor: AuditContext;
}

export async function endCompanyMembership(
  params: EndCompanyMembershipParams,
): Promise<CompanyMembershipRow> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('company_memberships')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', params.membershipId)
    .eq('status', 'active') // idempotent-safe: no-op update if already ended
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] endCompanyMembership failed: ${error?.message ?? 'membership not found or already ended'}`);
  }

  const membership = toRow(data as CompanyMembershipDbRow);
  await logMembershipAudit(db, 'company_membership_ended', membership, params.actor);
  return membership;
}

// ── getActiveCompanyMembership — internal/service-use query ─────────────────

export async function getActiveCompanyMembership(
  authUserId: string,
  tenantId: string,
): Promise<CompanyMembershipRow | null> {
  const db = getSupabaseServiceClient();

  const { data } = await db
    .schema('analytics')
    .from('company_memberships')
    .select()
    .eq('auth_user_id', authUserId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();

  return data ? toRow(data as CompanyMembershipDbRow) : null;
}

// ── listCompanyMembershipsForIdentity — internal/service-use query ──────────
// All memberships (active and ended) for one identity, across every Company
// it has ever been associated with — the historical-truth read the
// reassociation invariant relies on (each row stays bound to the Company it
// actually belonged to; nothing here merges or carries data across rows).

export async function listCompanyMembershipsForIdentity(
  authUserId: string,
): Promise<CompanyMembershipRow[]> {
  const db = getSupabaseServiceClient();

  const { data } = await db
    .schema('analytics')
    .from('company_memberships')
    .select()
    .eq('auth_user_id', authUserId)
    .order('created_at', { ascending: true });

  return ((data ?? []) as CompanyMembershipDbRow[]).map(toRow);
}
