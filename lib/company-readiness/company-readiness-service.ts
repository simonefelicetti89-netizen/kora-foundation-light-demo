// lib/company-readiness/company-readiness-service.ts
// KORA-WP-027 — Onboarding Readiness Pipeline Rebuild + KORA Ready
// Attainment/Health Split.
//
// Doc 81 §8 (DD-1.1), the sole semantic authority for the split, verbatim:
// "KORA Ready Attainment — a historical governance event: the Company
// reached enough truth to decide, at a specific point in time. Once
// legitimately attained, this fact is never deleted... Current Readiness
// Health — a current operational assessment, which may later deteriorate...
// Invariant: a later readiness problem never rewrites history."
//
// Doc 78 §7 (KORA Ready Governance) + doc 79 §5 (workflow) + §15
// (Override/Exception Model) fix the workflow this module implements:
//   automated_evaluation -> READY | NOT_READY (blocker/warning detail)
//   NOT_READY + human judgment -> override_requested -> override_recorded -> READY (override)
//   READY + later material issue -> degraded/revoked (recorded transition)
//
// EVALUATION CRITERIA REUSE: the "automated_evaluation" step reuses
// lib/live/company-onboarding-view.ts's own, already-built, already-
// PARTIAL derivation (buildCompanyOnboardingView -> pipelineReadiness) —
// confirmed by inventory to have ZERO real runtime caller before this WP.
// This module is that caller. No new scoring formula, no new baseline-
// sufficiency criteria are invented here — doc 78 §7's own words: those
// remain "methodology-config-governed," a separate, untouched concern.
//
// WP-013 REUSE: `policy_config_version_id` is a nullable provenance
// reference only (doc 81 §8's own "basis/version" field) — never a
// duplicated policy payload. No Governance Policy value is fabricated here;
// absence is genuine absence (same discipline as KORA-WP-013's own store).
//
// WP-009 REUSE: override/revoke authority is the EXISTING capability
// system (`hasAdminCapability`, domain `COMPANY_OPERATIONS`, action
// `OVERRIDE`) — doc 78 §7's own "restricted to a defined internal
// capability... never a blanket permission." No new capability value.
//
// AUDIT: attainment and override/revoke are governance-significant (doc 79
// §17's own minimum auditable-action list names "KORA Ready override") —
// every constitutive transition emits exactly one audit.governance_event,
// reusing the existing KORA-WP-006/051 substrate. This is never routed
// through KORA-WP-046's observability primitive (system/technical log) —
// the two remain distinct streams (doc 79 §17: "Audit ≠ Telemetry ≠ System
// Log").
//
// ADVISOR BOUNDARY: doc 81 §7 ("RESOLVED BY DD-1.1") — Advisor concurrence
// is never a mandatory gate and never a second authority. No Advisor role
// appears anywhere in this module's own write-authorization checks.
//
// SCOPE BOUNDARY: readiness is operational/data readiness — never KORA
// Index/IU/BTI quality, never Commercial Entitlement/billing eligibility,
// never Prime/Program Funds/Partner payable, never Living KORAL/Material
// Change. None of those is referenced anywhere in this module.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { hasAdminCapability } from '@/lib/admin-capability/capability-service';
import { recordGovernanceEvent } from '@/lib/audit/governance-event';
import { buildCompanyOnboardingView, type TenantOnboardingRow } from '@/lib/live/company-onboarding-view';
import type { WorkforceBaselineRow } from '@/lib/live/workforce-baseline-view';
import type { OnboardingReadinessCheck } from '@/lib/types';
import { getCurrentPolicyConfig } from '@/lib/policy-config/policy-config-service';

export type ReadinessHealthStatus = 'ready' | 'not_ready' | 'degraded' | 'revoked';
export type AttainmentBasis = 'automated' | 'override';

// A future Founder/Admin-configured Governance Policy value could live
// here (doc 79 §16) — genuinely absent today; never fabricated (see this
// file's own header note).
const READINESS_OVERRIDE_POLICY_KEY = 'company_readiness.override_authority';

// A rejected authorization/validation request — expected domain behavior,
// never an unexpected technical failure (mirrors CompanyIngestValidationError's
// own role in KORA-WP-028).
export class ReadinessAuthorizationError extends Error {}

function assertActor(actorRole: string, actorId: string): void {
  if (!actorRole || !actorId) {
    throw new Error('[KORA] company-readiness rejected: actorRole and actorId are required — this substrate never manufactures actor attribution.');
  }
}

export interface CurrentReadinessHealth {
  tenantId: string;
  status: ReadinessHealthStatus;
  blockers: OnboardingReadinessCheck[];
  warnings: OnboardingReadinessCheck[];
  evaluatedAt: string;
}

interface HealthDbRow {
  tenant_id: string;
  status: string;
  blockers: OnboardingReadinessCheck[];
  warnings: OnboardingReadinessCheck[];
  evaluated_at: string;
}

function toHealth(row: HealthDbRow): CurrentReadinessHealth {
  return {
    tenantId: row.tenant_id,
    status: row.status as ReadinessHealthStatus,
    blockers: row.blockers ?? [],
    warnings: row.warnings ?? [],
    evaluatedAt: row.evaluated_at,
  };
}

export interface ReadinessAttainmentEvent {
  id: string;
  tenantId: string;
  achievedAt: string;
  basis: AttainmentBasis;
  policyConfigVersionId: string | null;
  overrideReason: string | null;
  overrideAuthority: string | null;
  actorRole: string;
  actorId: string;
}

interface AttainmentDbRow {
  id: string;
  tenant_id: string;
  achieved_at: string;
  basis: string;
  policy_config_version_id: string | null;
  override_reason: string | null;
  override_authority: string | null;
  actor_role: string;
  actor_id: string;
}

function toAttainment(row: AttainmentDbRow): ReadinessAttainmentEvent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    achievedAt: row.achieved_at,
    basis: row.basis as AttainmentBasis,
    policyConfigVersionId: row.policy_config_version_id,
    overrideReason: row.override_reason,
    overrideAuthority: row.override_authority,
    actorRole: row.actor_role,
    actorId: row.actor_id,
  };
}

// ── Read paths ───────────────────────────────────────────────────────────

export async function getCurrentReadinessHealth(tenantId: string): Promise<CurrentReadinessHealth | null> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .schema('analytics').from('current_readiness_health')
    .select().eq('tenant_id', tenantId).maybeSingle();
  if (error) throw new Error(`[KORA] getCurrentReadinessHealth failed: ${error.message}`);
  if (!data) return null;
  return toHealth(data as HealthDbRow);
}

export async function getReadinessAttainmentHistory(tenantId: string): Promise<ReadinessAttainmentEvent[]> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .schema('analytics').from('kora_ready_attainment')
    .select().eq('tenant_id', tenantId).order('achieved_at', { ascending: false });
  if (error) throw new Error(`[KORA] getReadinessAttainmentHistory failed: ${error.message}`);
  return ((data ?? []) as AttainmentDbRow[]).map(toAttainment);
}

// ── Automated evaluation (the "AUTOMATED NORMAL PATH", doc 78 §7) ─────────
//
// Reuses lib/live/company-onboarding-view.ts's own pipelineReadiness
// derivation. Records a NEW attainment event only on a genuine
// not-ready-or-absent -> ready TRANSITION (doc 81 §8's own "at a specific
// point in time" framing) — re-evaluating an already-ready Company is a
// safe no-op on the attainment history, never a repeated fact. A
// previously-ready Company whose evaluation now finds blocking issues
// transitions health to 'degraded' — the attainment history is never
// touched.

export interface EvaluateReadinessParams {
  tenantId: string;
  actorRole: string;
  actorId: string;
}

export async function evaluateAndRecordReadiness(params: EvaluateReadinessParams): Promise<CurrentReadinessHealth> {
  assertActor(params.actorRole, params.actorId);

  const db = getSupabaseServiceClient();

  const { data: tenantRow, error: tenantErr } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, onboarding_status, data_readiness_status, decision_pack_status')
    .eq('id', params.tenantId)
    .is('deleted_at', null)
    .maybeSingle();
  if (tenantErr || !tenantRow) {
    throw new Error(`[KORA] evaluateAndRecordReadiness rejected: tenant "${params.tenantId}" not found.`);
  }

  const { data: baselineRow, error: baselineErr } = await db
    .schema('personal').from('workforce_baseline')
    .select('tenant_id, reporting_period, total_workers, segment_breakdown, minimum_group_size, created_at, created_by')
    .eq('tenant_id', params.tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (baselineErr) {
    throw new Error(`[KORA] evaluateAndRecordReadiness failed reading workforce baseline: ${baselineErr.message}`);
  }

  const view = buildCompanyOnboardingView(
    tenantRow as unknown as TenantOnboardingRow,
    (baselineRow as WorkforceBaselineRow | null) ?? null,
  );

  const newStatus: ReadinessHealthStatus = view.pipelineReadiness.status === 'ok' ? 'ready' : 'not_ready';
  const blockers = view.readinessChecks.filter((c) => c.status !== 'ok' && c.blocking);
  const warnings = view.readinessChecks.filter((c) => c.status !== 'ok' && !c.blocking);

  const existing = await getCurrentReadinessHealth(params.tenantId);
  const wasReady = existing?.status === 'ready';

  // Genuine not-ready-or-absent -> ready transition: record a new
  // historical attainment event (doc 81 §8) — never on repeated 'ok' evaluations.
  if (newStatus === 'ready' && !wasReady) {
    const policyRef = await getCurrentPolicyConfig('governance_policy', READINESS_OVERRIDE_POLICY_KEY, null);
    const { error: attainErr } = await db
      .schema('analytics').from('kora_ready_attainment')
      .insert({
        tenant_id: params.tenantId,
        basis: 'automated',
        policy_config_version_id: policyRef?.id ?? null,
        evidence_context: { readinessChecks: view.readinessChecks },
        actor_role: params.actorRole,
        actor_id: params.actorId,
      });
    if (attainErr) {
      throw new Error(`[KORA] evaluateAndRecordReadiness failed to record attainment: ${attainErr.message}`);
    }
    await recordGovernanceEvent({
      sourceModule: 'company-readiness',
      actorRole: params.actorRole,
      actorId: params.actorId,
      eventType: 'kora_ready.attained',
      objectType: 'analytics.kora_ready_attainment',
      objectId: params.tenantId,
      tenantId: params.tenantId,
      payload: { basis: 'automated' },
    });
  }

  // READY -> a later material issue reappears: a recorded transition (doc
  // 78 §7) — health only, attainment history is never touched.
  if (wasReady && newStatus !== 'ready') {
    await recordGovernanceEvent({
      sourceModule: 'company-readiness',
      actorRole: params.actorRole,
      actorId: params.actorId,
      eventType: 'kora_ready.degraded',
      objectType: 'analytics.current_readiness_health',
      objectId: params.tenantId,
      tenantId: params.tenantId,
      payload: { blockerCount: blockers.length },
    });
  }

  const finalStatus: ReadinessHealthStatus = wasReady && newStatus !== 'ready' ? 'degraded' : newStatus;

  const { data: upserted, error: upsertErr } = await db
    .schema('analytics').from('current_readiness_health')
    .upsert({
      tenant_id: params.tenantId,
      status: finalStatus,
      blockers,
      warnings,
      evaluated_at: new Date().toISOString(),
      actor_role: params.actorRole,
      actor_id: params.actorId,
    }, { onConflict: 'tenant_id' })
    .select()
    .single();

  if (upsertErr || !upserted) {
    throw new Error(`[KORA] evaluateAndRecordReadiness failed to record health: ${upsertErr?.message ?? 'no data returned'}`);
  }

  return toHealth(upserted as HealthDbRow);
}

// ── Override — doc 78 §7 / doc 79 §15, capability-gated (WP-009 reuse) ────

export interface OverrideReadinessParams {
  tenantId: string;
  authUserId: string; // the internal operator's own auth user id — checked against hasAdminCapability
  reason: string;
  evidence?: string;
  actorRole: string;
  actorId: string;
}

export async function overrideReadiness(params: OverrideReadinessParams): Promise<ReadinessAttainmentEvent> {
  assertActor(params.actorRole, params.actorId);
  if (!params.reason || params.reason.trim() === '') {
    throw new ReadinessAuthorizationError('[KORA] overrideReadiness rejected: reason is required (doc 79 §15 — every override requires a reason).');
  }

  const authorized = await hasAdminCapability(params.authUserId, 'COMPANY_OPERATIONS', 'OVERRIDE');
  if (!authorized) {
    throw new ReadinessAuthorizationError('[KORA] overrideReadiness rejected: caller lacks the COMPANY_OPERATIONS:OVERRIDE capability (doc 78 §7 — never a blanket permission).');
  }

  const db = getSupabaseServiceClient();
  const policyRef = await getCurrentPolicyConfig('governance_policy', READINESS_OVERRIDE_POLICY_KEY, null);

  const { data: inserted, error: insertErr } = await db
    .schema('analytics').from('kora_ready_attainment')
    .insert({
      tenant_id: params.tenantId,
      basis: 'override',
      policy_config_version_id: policyRef?.id ?? null,
      evidence_context: params.evidence ? { evidence: params.evidence } : null,
      override_reason: params.reason,
      override_authority: 'COMPANY_OPERATIONS:OVERRIDE',
      actor_role: params.actorRole,
      actor_id: params.actorId,
    })
    .select()
    .single();

  if (insertErr || !inserted) {
    throw new Error(`[KORA] overrideReadiness failed: ${insertErr?.message ?? 'no data returned'}`);
  }

  await recordGovernanceEvent({
    sourceModule: 'company-readiness',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'kora_ready.override',
    objectType: 'analytics.kora_ready_attainment',
    objectId: (inserted as AttainmentDbRow).id,
    tenantId: params.tenantId,
    payload: { reason: params.reason },
  });

  const { error: healthErr } = await db
    .schema('analytics').from('current_readiness_health')
    .upsert({
      tenant_id: params.tenantId,
      status: 'ready',
      blockers: [],
      warnings: [],
      evaluated_at: new Date().toISOString(),
      actor_role: params.actorRole,
      actor_id: params.actorId,
    }, { onConflict: 'tenant_id' });

  if (healthErr) {
    throw new Error(`[KORA] overrideReadiness failed to update health: ${healthErr.message}`);
  }

  return toAttainment(inserted as AttainmentDbRow);
}

// ── Revoke — an explicit Admin action, distinct from automatic degradation ──

export interface RevokeReadinessParams {
  tenantId: string;
  authUserId: string;
  reason: string;
  actorRole: string;
  actorId: string;
}

export async function revokeReadiness(params: RevokeReadinessParams): Promise<CurrentReadinessHealth> {
  assertActor(params.actorRole, params.actorId);
  if (!params.reason || params.reason.trim() === '') {
    throw new ReadinessAuthorizationError('[KORA] revokeReadiness rejected: reason is required.');
  }

  const authorized = await hasAdminCapability(params.authUserId, 'COMPANY_OPERATIONS', 'OVERRIDE');
  if (!authorized) {
    throw new ReadinessAuthorizationError('[KORA] revokeReadiness rejected: caller lacks the COMPANY_OPERATIONS:OVERRIDE capability.');
  }

  const db = getSupabaseServiceClient();

  await recordGovernanceEvent({
    sourceModule: 'company-readiness',
    actorRole: params.actorRole,
    actorId: params.actorId,
    eventType: 'kora_ready.revoked',
    objectType: 'analytics.current_readiness_health',
    objectId: params.tenantId,
    tenantId: params.tenantId,
    payload: { reason: params.reason },
  });

  const { data: upserted, error } = await db
    .schema('analytics').from('current_readiness_health')
    .upsert({
      tenant_id: params.tenantId,
      status: 'revoked',
      blockers: [],
      warnings: [],
      evaluated_at: new Date().toISOString(),
      actor_role: params.actorRole,
      actor_id: params.actorId,
    }, { onConflict: 'tenant_id' })
    .select()
    .single();

  if (error || !upserted) {
    throw new Error(`[KORA] revokeReadiness failed: ${error?.message ?? 'no data returned'}`);
  }

  return toHealth(upserted as HealthDbRow);
}
