// lib/policy-config/policy-config-service.ts
// KORA-WP-013 — Policy/Config Four-Tier Store.
//
// Registry 142's own framing: "Proposed New: versioned config table, four
// tiers (Constitutional/Governance Policy/Commercial Configuration/
// Implementation Configuration)... Service/API: config-read/write helper,
// versioned." Doc 78 §24 is the sole semantic authority for the four tiers
// — see supabase/migrations/075_policy_config_four_tier_store.sql's own
// header for the full citation and design rationale.
//
// This file is a thin, typed wrapper over the real persistence (a Postgres
// table + one atomic RPC, migration 075) — it introduces no business
// values, no domain vocabulary, no default policy of its own. The actual
// Commercial Configuration values for Company Operating Mode, and the
// actual Governance Policy values for Certification grant-authority (doc
// 78 §11, owned by KORA-WP-054), are both explicitly Out of Scope here —
// this module only makes the store itself real, typed, versioned, and
// safely concurrent.
//
// TIER 1 (Constitutional) IS STRUCTURALLY UNREACHABLE — not merely
// unexposed by this module. `PolicyConfigTier` below has exactly the three
// writable tiers; there is no fourth literal to accidentally widen into.
// Constitutional truth continues to live in CLAUDE.md's own Red Lines and
// the frozen canonical docs — never in this or any table.
//
// ABSENCE = EXPLICIT "NO POLICY CONFIGURED", NEVER A FABRICATED DEFAULT.
// getCurrentPolicyConfig() returns null when no active version exists for
// a (tier, key, tenant) triple. This module never chooses fail-open or
// fail-closed on a caller's behalf — each future consumer decides that for
// its own domain (registry's own "Do not choose implicitly" instruction).

import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const POLICY_CONFIG_TIERS = [
  'governance_policy',
  'commercial_configuration',
  'implementation_configuration',
] as const;

export type PolicyConfigTier = (typeof POLICY_CONFIG_TIERS)[number];

export type PolicyConfigStatus = 'active' | 'superseded';

export interface PolicyConfigVersion {
  id: string;
  tier: PolicyConfigTier;
  configKey: string;
  tenantId: string | null;
  value: unknown;
  status: PolicyConfigStatus;
  effectiveFrom: string;
  supersedesVersionId: string | null;
  actorRole: string;
  actorId: string;
  reason: string;
  createdAt: string;
}

interface PolicyConfigVersionDbRow {
  id: string;
  tier: string;
  config_key: string;
  tenant_id: string | null;
  value: unknown;
  status: string;
  effective_from: string;
  supersedes_version_id: string | null;
  actor_role: string;
  actor_id: string;
  reason: string;
  created_at: string;
}

function toPolicyConfigVersion(row: PolicyConfigVersionDbRow): PolicyConfigVersion {
  return {
    id: row.id,
    tier: row.tier as PolicyConfigTier,
    configKey: row.config_key,
    tenantId: row.tenant_id,
    value: row.value,
    status: row.status as PolicyConfigStatus,
    effectiveFrom: row.effective_from,
    supersedesVersionId: row.supersedes_version_id,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function assertActor(actorRole: string, actorId: string): void {
  if (!actorRole || !actorId) {
    throw new Error('[KORA] policy-config rejected: actorRole and actorId are required — this substrate never manufactures actor attribution.');
  }
}

function assertKoraAdmin(actorRole: string): void {
  if (actorRole !== 'KORA_ADMIN') {
    throw new Error(
      `[KORA] policy-config rejected: only KORA_ADMIN may write a Policy/Config version (doc 78 §24 — Governance Policy/Commercial/Implementation Configuration are all Admin-governed; this Control Plane is KORA-internal, never Company-facing).`,
    );
  }
}

// ── setPolicyConfigVersion — the ONLY write path, via the atomic RPC ───────

export interface SetPolicyConfigVersionParams {
  tier: PolicyConfigTier;
  configKey: string;
  tenantId?: string | null;
  value: unknown;
  actorRole: string;
  actorId: string;
  reason: string;
}

export async function setPolicyConfigVersion(params: SetPolicyConfigVersionParams): Promise<PolicyConfigVersion> {
  const { tier, configKey, tenantId = null, value, actorRole, actorId, reason } = params;

  assertActor(actorRole, actorId);
  assertKoraAdmin(actorRole);

  if (!POLICY_CONFIG_TIERS.includes(tier)) {
    throw new Error(`[KORA] policy-config rejected: "${tier}" is not a legal Policy/Config tier — the Constitutional tier is structurally unreachable (doc 78 §24).`);
  }
  if (!configKey) {
    throw new Error('[KORA] policy-config rejected: configKey is required.');
  }
  if (!reason) {
    throw new Error('[KORA] policy-config rejected: reason is required (doc 78 §24 versioning discipline).');
  }

  const db = getSupabaseServiceClient();

  // `set_policy_config_version` is not in the generated Database type, so
  // the client's own generic signature is bypassed here — same documented
  // real-DB-validated pattern as commitCommitment()/concludeReview(): the
  // postgrest-js `.rpc(name, args, { schema })` third-argument form does
  // NOT route to a non-public schema in this pinned client version, only
  // `db.schema('gov').rpc(...)` does.
  const { data, error } = await (
    db.schema('gov') as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc('set_policy_config_version', {
    p_tier: tier,
    p_config_key: configKey,
    p_tenant_id: tenantId,
    p_value: value,
    p_actor_role: actorRole,
    p_actor_id: actorId,
    p_reason: reason,
  });

  if (error || !data) {
    throw new Error(`[KORA] setPolicyConfigVersion failed: ${error?.message ?? 'no data returned'}`);
  }

  // Postgres table-returning functions come back as an array of one row via PostgREST.
  const row = (Array.isArray(data) ? data[0] : data) as PolicyConfigVersionDbRow;
  return toPolicyConfigVersion(row);
}

// ── getCurrentPolicyConfig — the current active version, or null ───────────
// Absence is an explicit "no policy configured" state — never a fabricated
// default. tenantId: pass null (or omit) for a KORA-global key; pass a real
// tenant id for a Company-scoped Commercial Configuration override.

export async function getCurrentPolicyConfig(
  tier: PolicyConfigTier,
  configKey: string,
  tenantId: string | null = null,
): Promise<PolicyConfigVersion | null> {
  const db = getSupabaseServiceClient();

  let query = db
    .schema('gov')
    .from('policy_config_version')
    .select()
    .eq('tier', tier)
    .eq('config_key', configKey)
    .eq('status', 'active');

  query = tenantId === null ? query.is('tenant_id', null) : query.eq('tenant_id', tenantId);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`[KORA] getCurrentPolicyConfig failed: ${error.message}`);
  }
  if (!data) return null;

  return toPolicyConfigVersion(data as PolicyConfigVersionDbRow);
}

// ── listPolicyConfigHistory — full version history for a key, newest first ──
// Historical reproducibility: a superseded version is never deleted or
// rewritten — "which policy version was effective when this happened?" is
// always answerable by filtering this list on effective_from.

export async function listPolicyConfigHistory(
  tier: PolicyConfigTier,
  configKey: string,
  tenantId: string | null = null,
): Promise<PolicyConfigVersion[]> {
  const db = getSupabaseServiceClient();

  let query = db
    .schema('gov')
    .from('policy_config_version')
    .select()
    .eq('tier', tier)
    .eq('config_key', configKey)
    .order('created_at', { ascending: false });

  query = tenantId === null ? query.is('tenant_id', null) : query.eq('tenant_id', tenantId);

  const { data, error } = await query;

  if (error) {
    throw new Error(`[KORA] listPolicyConfigHistory failed: ${error.message}`);
  }

  return ((data ?? []) as PolicyConfigVersionDbRow[]).map(toPolicyConfigVersion);
}
