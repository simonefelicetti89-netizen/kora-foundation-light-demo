// lib/admin-capability/capability-service.ts
// KORA-WP-009 — Internal Admin Operator Identity + Capability/RBAC Grants.
//
// Resolves doc 78 §4's "Internal Role/Capability" and "Action Permission"
// layers: the coarse KORA_ADMIN platform role never manufactures a specific
// capability. An internal operator has zero capabilities until an explicit,
// per-(domain, action) grant exists. Absence of a matching ACTIVE grant is
// DENY by construction (migration 054's schema makes an "implicit allow"
// row shape impossible — there is no wildcard/blanket row).
//
// FOUNDATION ONLY (KORA-WP-009's own scope, not a route-enforcement
// cutover): this module provides the capability-check primitive. It does
// not modify any existing app/admin/** route — those remain on the coarse
// requireKoraAdmin() role gate until a later, separately-authorized WP
// adopts this primitive. See migration 054's own header comment for the
// full reasoning.
//
// hasAdminCapability() is a SECURITY CHECK, not a data read — it fails
// closed: any DB/lookup error returns false (deny), never throws and never
// defaults to allow. This is a deliberate departure from this session's
// other services (createObservedInvestmentFact, recordGovernanceEvent),
// which correctly throw on DB failure — those are data-write operations
// where silent failure would be dangerous; this is an authorization
// decision where silent ALLOW-on-error would be dangerous instead.
//
// Capability domains (11, from doc 78 §3) and actions (12, from doc 78 §4 /
// doc 79 §1) are frozen, cited vocabularies — not invented here, and this
// module does not encode doc 79 §1's full domain×action authority matrix
// (who specifically gets APPROVE vs. OVERRIDE for a given workflow) — that
// is later, domain-specific WPs' own scope to consult when they need it.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';

export const CAPABILITY_DOMAINS = [
  'COMPANY_OPERATIONS',
  'DATA_ONBOARDING_OPERATIONS',
  'PARTNER_NETWORK_GOVERNANCE',
  'ADVISOR_GOVERNANCE',
  'ACADEMY_GOVERNANCE',
  'PRIVACY_TRUST',
  'FINANCE_OPERATIONS',
  'COMMERCIAL_ENTITLEMENT_OPERATIONS',
  'SUPPORT_EXCEPTION_OPERATIONS',
  'AUDIT_GOVERNANCE',
  'PLATFORM_SYSTEM_OPERATIONS',
] as const;
export type CapabilityDomain = (typeof CAPABILITY_DOMAINS)[number];

export const CAPABILITY_ACTIONS = [
  'VIEW', 'SUPPORT', 'CREATE', 'PROPOSE', 'EDIT_DRAFT', 'ASSIGN',
  'APPROVE', 'GRANT', 'SUSPEND', 'REVOKE', 'OVERRIDE', 'AUDIT',
] as const;
export type CapabilityAction = (typeof CAPABILITY_ACTIONS)[number];

export interface InternalOperator {
  id: string;
  authUserId: string;
  status: 'active' | 'inactive';
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InternalOperatorDbRow {
  id: string;
  auth_user_id: string;
  status: string;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
}

function toOperator(row: InternalOperatorDbRow): InternalOperator {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    status: row.status as 'active' | 'inactive',
    deactivatedAt: row.deactivated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface AuditContext {
  actorRole: string;
  actorId: string;
}

// ── createInternalOperator — explicit, governed recognition ─────────────────
// Never call this merely because a user authenticated with role KORA_ADMIN —
// the caller decides this explicitly, mirroring KORA-WP-004's own discipline
// for company memberships.

export interface CreateInternalOperatorParams {
  authUserId: string;
  actor: AuditContext;
}

export async function createInternalOperator(
  params: CreateInternalOperatorParams,
): Promise<InternalOperator> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('gov')
    .from('internal_operator')
    .insert({ auth_user_id: params.authUserId })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] createInternalOperator failed: ${error?.message ?? 'no data returned'}`);
  }

  const operator = toOperator(data as InternalOperatorDbRow);

  await recordGovernanceEvent({
    sourceModule: 'admin-capability',
    actorRole: params.actor.actorRole,
    actorId: params.actor.actorId,
    eventType: 'internal_operator.created',
    objectType: 'internal_operator',
    objectId: operator.id,
    payload: { auth_user_id: operator.authUserId },
  });

  return operator;
}

// ── deactivateInternalOperator — explicit, governed termination ─────────────

export interface DeactivateInternalOperatorParams {
  operatorId: string;
  actor: AuditContext;
}

export async function deactivateInternalOperator(
  params: DeactivateInternalOperatorParams,
): Promise<InternalOperator> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('gov')
    .from('internal_operator')
    .update({ status: 'inactive', deactivated_at: new Date().toISOString() })
    .eq('id', params.operatorId)
    .eq('status', 'active') // idempotent-safe: no-op if already inactive
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[KORA] deactivateInternalOperator failed: ${error?.message ?? 'operator not found or already inactive'}`);
  }

  const operator = toOperator(data as InternalOperatorDbRow);

  await recordGovernanceEvent({
    sourceModule: 'admin-capability',
    actorRole: params.actor.actorRole,
    actorId: params.actor.actorId,
    eventType: 'internal_operator.deactivated',
    objectType: 'internal_operator',
    objectId: operator.id,
  });

  return operator;
}

// ── grantCapability — explicit, governed authorization ───────────────────────
// Never manufactures its own grantor — grantedByOperatorId is optional ONLY
// for the documented bootstrap case (doc 78 §4), never a default.

export interface GrantCapabilityParams {
  operatorId: string;
  capabilityDomain: CapabilityDomain;
  action: CapabilityAction;
  grantedByOperatorId?: string;
  actor: AuditContext;
}

export async function grantCapability(params: GrantCapabilityParams): Promise<void> {
  const db = getSupabaseServiceClient();

  const { error } = await db
    .schema('gov')
    .from('capability_grant')
    .insert({
      operator_id: params.operatorId,
      capability_domain: params.capabilityDomain,
      action: params.action,
      granted_by_operator_id: params.grantedByOperatorId ?? null,
    });

  if (error) {
    throw new Error(`[KORA] grantCapability failed: ${error.message}`);
  }

  await recordGovernanceEvent({
    sourceModule: 'admin-capability',
    actorRole: params.actor.actorRole,
    actorId: params.actor.actorId,
    eventType: 'capability_grant.granted',
    objectType: 'internal_operator',
    objectId: params.operatorId,
    payload: { capability_domain: params.capabilityDomain, action: params.action },
  });
}

// ── revokeCapability — explicit, governed termination ────────────────────────

export interface RevokeCapabilityParams {
  operatorId: string;
  capabilityDomain: CapabilityDomain;
  action: CapabilityAction;
  actor: AuditContext;
}

export async function revokeCapability(params: RevokeCapabilityParams): Promise<void> {
  const db = getSupabaseServiceClient();

  const { error, count } = await db
    .schema('gov')
    .from('capability_grant')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('operator_id', params.operatorId)
    .eq('capability_domain', params.capabilityDomain)
    .eq('action', params.action)
    .eq('status', 'active');

  if (error) {
    throw new Error(`[KORA] revokeCapability failed: ${error.message}`);
  }
  if (count === 0) {
    throw new Error('[KORA] revokeCapability failed: no matching active grant found');
  }

  await recordGovernanceEvent({
    sourceModule: 'admin-capability',
    actorRole: params.actor.actorRole,
    actorId: params.actor.actorId,
    eventType: 'capability_grant.revoked',
    objectType: 'internal_operator',
    objectId: params.operatorId,
    payload: { capability_domain: params.capabilityDomain, action: params.action },
  });
}

// ── hasAdminCapability — THE authorization decision, fail-closed ────────────
//
// Takes authUserId, never an operatorId supplied by request input — the
// caller must obtain authUserId from a genuine, already-verified session
// (e.g. requireKoraAdmin()'s resolved user.id), never from a client-supplied
// body/query parameter. This function resolves authUserId -> operator
// internally; it never trusts a caller's claim about which operator they are.
//
// Returns false (DENY) on: no operator record for this identity, an
// inactive operator, no matching ACTIVE grant, or ANY error — this function
// never throws. A caller must never interpret a thrown exception as "allow."

export async function hasAdminCapability(
  authUserId: string,
  capabilityDomain: CapabilityDomain,
  action: CapabilityAction,
): Promise<boolean> {
  try {
    const db = getSupabaseServiceClient();

    const { data: operatorRow, error: operatorError } = await db
      .schema('gov')
      .from('internal_operator')
      .select()
      .eq('auth_user_id', authUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (operatorError || !operatorRow) return false; // no recognized active operator -> deny

    const { data: grantRow, error: grantError } = await db
      .schema('gov')
      .from('capability_grant')
      .select()
      .eq('operator_id', (operatorRow as InternalOperatorDbRow).id)
      .eq('capability_domain', capabilityDomain)
      .eq('action', action)
      .eq('status', 'active')
      .maybeSingle();

    if (grantError || !grantRow) return false; // no matching active grant -> deny

    return true;
  } catch {
    return false; // any unexpected failure -> deny, never throw, never allow
  }
}

// ── listCapabilitiesForOperator — internal/service-use query ────────────────

export interface CapabilityGrant {
  id: string;
  operatorId: string;
  capabilityDomain: CapabilityDomain;
  action: CapabilityAction;
  status: 'active' | 'revoked';
  revokedAt: string | null;
  grantedByOperatorId: string | null;
  grantedAt: string;
}

interface CapabilityGrantDbRow {
  id: string;
  operator_id: string;
  capability_domain: string;
  action: string;
  status: string;
  revoked_at: string | null;
  granted_by_operator_id: string | null;
  granted_at: string;
}

export async function listCapabilitiesForOperator(operatorId: string): Promise<CapabilityGrant[]> {
  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('gov')
    .from('capability_grant')
    .select()
    .eq('operator_id', operatorId)
    .order('granted_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listCapabilitiesForOperator failed: ${error.message}`);
  }

  return ((data ?? []) as CapabilityGrantDbRow[]).map((row) => ({
    id: row.id,
    operatorId: row.operator_id,
    capabilityDomain: row.capability_domain as CapabilityDomain,
    action: row.action as CapabilityAction,
    status: row.status as 'active' | 'revoked',
    revokedAt: row.revoked_at,
    grantedByOperatorId: row.granted_by_operator_id,
    grantedAt: row.granted_at,
  }));
}
