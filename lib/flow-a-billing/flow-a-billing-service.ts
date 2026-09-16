// lib/flow-a-billing/flow-a-billing-service.ts
// KORA-WP-062 — Platform Fee Flow / Flow A Billing.
//
// Doc 83 §10 (Flow A — Core/Platform Fee Architecture): "Company → KORA."
// Activation/onboarding fee, annual/platform recurring fee, and contracted
// Company Advisor service where commercially included or separately charged
// (PRIME-003). "Flow A is structurally, permanently separate from
// PRIME-002" (Program Funds / KORA-WP-101, Code Truth ABSENT) — never
// merged, never summed (§27, Test D). This module contains no reference of
// any kind to a Program, Funding Commitment, Partner Payable, or Program
// Funds Ledger.
//
// TWO STRUCTURALLY DIFFERENT OBJECTS, PER DOC 83 §10:
//
// 1. Commercial Entitlement (Company activation status, contract tier,
//    billing cadence, Advisor-service inclusion) — doc 78 §25 explicitly
//    ties its own versioning to "§24 versioning applies," i.e. the SAME
//    discipline as the Policy/Config Four-Tier Store (KORA-WP-013). This
//    module creates NO second config table/versioning mechanism/policy
//    store/audit trail — it is a thin, typed wrapper over the EXISTING
//    lib/policy-config/policy-config-service.ts, Tier 3 ("commercial_configuration"),
//    one config_key per Company. See migration 076's own header for the
//    full reuse rationale.
//
// 2. Fee/Charge event — a discrete, amount-bearing occurrence (doc 83 §10:
//    "a Fee/Charge record, a billing-cadence reference, an invoice/
//    payment-status reference"), genuinely new, backed by the new
//    append-only analytics.fee_charge_event table (migration 076).
//
// VERDICT-INDEPENDENCE (KORA-WP-042's guard, extended): no function in this
// module accepts, reads, or references a Review verdict, `analytics.review`,
// or `analytics.review_event` in any form. A Fee/Charge's existence and
// status are structurally independent of any Review outcome.
//
// ACTOR MODEL: writes (recordFeeChargeEvent, setFlowACommercialEntitlement)
// are KORA_ADMIN-only — matching doc 78 §24 Tier 3's "Commercial/Entitlement
// Operations" actor and this engagement's KORA_ADMIN-only implementation of
// that tier (WP-013). Reads are Company-scoped: KORA_ADMIN may read any
// Company's billing state; COMPANY_ADMIN may read only its own tenant's —
// enforced here in TypeScript (the DB grants SELECT to `authenticated`,
// restricted per-row by Pattern A RLS; this module's own check is the
// belt-and-suspenders application-layer gate used throughout this
// engagement's server-side services).

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getCurrentPolicyConfig, setPolicyConfigVersion, type PolicyConfigVersion } from '@/lib/policy-config/policy-config-service';

const KORA_ADMIN_ROLE = 'KORA_ADMIN';
const COMPANY_ADMIN_ROLE = 'COMPANY_ADMIN';

export const FEE_CHARGE_CATEGORIES = ['onboarding_fee', 'platform_fee', 'advisor_service_fee'] as const;
export type FeeChargeCategory = (typeof FEE_CHARGE_CATEGORIES)[number];

export const FEE_CHARGE_STATUSES = ['pending', 'invoiced', 'paid', 'failed', 'waived', 'cancelled'] as const;
export type FeeChargeStatus = (typeof FEE_CHARGE_STATUSES)[number];

export const BILLING_CADENCES = ['one_time', 'monthly', 'annual'] as const;
export type BillingCadence = (typeof BILLING_CADENCES)[number];

// ── Commercial Entitlement — reuses the WP-013 store, no new mechanism ─────

const FLOW_A_ENTITLEMENT_TIER = 'commercial_configuration' as const;
const FLOW_A_ENTITLEMENT_CONFIG_KEY = 'flow_a.commercial_entitlement';

// A generic, opaque container shape — no pricing values, no SLA numbers, no
// defaults (doc 78 §25: "No pricing, no SLA numbers... introduced anywhere
// in this section" — real Commercial values remain a FOUNDER/COMMERCIAL
// decision, never fabricated here, same discipline as migration 075).
export interface FlowACommercialEntitlement {
  activationStatus: 'active' | 'inactive' | 'suspended';
  contractTier?: string;
  billingCadence?: BillingCadence;
  advisorServiceIncluded?: boolean;
  [key: string]: unknown;
}

function assertActor(actorRole: string, actorId: string): void {
  if (!actorRole || !actorId) {
    throw new Error('[KORA] flow-a-billing rejected: actorRole and actorId are required — this substrate never manufactures actor attribution.');
  }
}

function assertKoraAdminWriter(actorRole: string): void {
  if (actorRole !== KORA_ADMIN_ROLE) {
    throw new Error(
      `[KORA] flow-a-billing rejected: only ${KORA_ADMIN_ROLE} may record a Fee/Charge event or set Commercial Entitlement (doc 78 §24/§25 — Commercial Configuration is Admin-governed; Flow A is Company↔KORA billing, never Company self-service).`,
    );
  }
}

// Company-scoped read gate: KORA_ADMIN may read any Company; COMPANY_ADMIN
// may read only its own tenant — never another Company's billing state.
function assertCompanyScopedRead(callerRole: string, callerTenantId: string | null, targetTenantId: string): void {
  if (callerRole === KORA_ADMIN_ROLE) return;
  if (callerRole === COMPANY_ADMIN_ROLE && callerTenantId === targetTenantId) return;
  throw new Error(
    `[KORA] flow-a-billing rejected: "${callerRole}" may not read billing state for tenant "${targetTenantId}" — Flow A billing/entitlement visibility is Company-scoped (own tenant only) or KORA_ADMIN.`,
  );
}

export async function setFlowACommercialEntitlement(params: {
  tenantId: string;
  value: FlowACommercialEntitlement;
  actorRole: string;
  actorId: string;
  reason: string;
}): Promise<PolicyConfigVersion> {
  assertActor(params.actorRole, params.actorId);
  assertKoraAdminWriter(params.actorRole);

  return setPolicyConfigVersion({
    tier: FLOW_A_ENTITLEMENT_TIER,
    configKey: FLOW_A_ENTITLEMENT_CONFIG_KEY,
    tenantId: params.tenantId,
    value: params.value,
    actorRole: params.actorRole,
    actorId: params.actorId,
    reason: params.reason,
  });
}

// Returns null when no entitlement has ever been configured for this
// Company — an explicit "no entitlement configured" state, never a
// fabricated default (same absence discipline as getCurrentPolicyConfig()).
export async function getFlowACommercialEntitlement(
  tenantId: string,
  callerRole: string,
  callerTenantId: string | null,
): Promise<FlowACommercialEntitlement | null> {
  assertCompanyScopedRead(callerRole, callerTenantId, tenantId);

  const current = await getCurrentPolicyConfig(FLOW_A_ENTITLEMENT_TIER, FLOW_A_ENTITLEMENT_CONFIG_KEY, tenantId);
  if (!current) return null;

  return current.value as FlowACommercialEntitlement;
}

// ── Fee/Charge event — genuinely new, append-only ───────────────────────────

export interface FeeChargeEvent {
  id: string;
  tenantId: string;
  chargeId: string;
  chargeCategory: FeeChargeCategory;
  amount: number;
  currency: string;
  billingCadence: BillingCadence;
  effectiveDate: string;
  invoiceReference: string | null;
  status: FeeChargeStatus;
  actorRole: string;
  actorId: string;
  reason: string | null;
  createdAt: string;
}

interface FeeChargeEventDbRow {
  id: string;
  tenant_id: string;
  charge_id: string;
  charge_category: string;
  amount: string | number;
  currency: string;
  billing_cadence: string;
  effective_date: string;
  invoice_reference: string | null;
  status: string;
  actor_role: string;
  actor_id: string;
  reason: string | null;
  created_at: string;
}

function toFeeChargeEvent(row: FeeChargeEventDbRow): FeeChargeEvent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    chargeId: row.charge_id,
    chargeCategory: row.charge_category as FeeChargeCategory,
    amount: typeof row.amount === 'string' ? Number(row.amount) : row.amount,
    currency: row.currency,
    billingCadence: row.billing_cadence as BillingCadence,
    effectiveDate: row.effective_date,
    invoiceReference: row.invoice_reference,
    status: row.status as FeeChargeStatus,
    actorRole: row.actor_role,
    actorId: row.actor_id,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export interface RecordFeeChargeEventParams {
  tenantId: string;
  chargeCategory: FeeChargeCategory;
  amount: number;
  billingCadence: BillingCadence;
  effectiveDate: string;
  status: FeeChargeStatus;
  actorRole: string;
  actorId: string;
  chargeId?: string;
  currency?: string;
  invoiceReference?: string;
  reason?: string;
}

// Pass chargeId to record a further status event for an EXISTING Fee/Charge
// (invoiced/paid/failed/waived/cancelled); omit it to start a new Fee/Charge
// (the RPC generates a fresh charge_id). category/amount/currency/
// billing_cadence/effective_date must exactly match the charge's first
// event when continuing an existing charge_id — enforced at the DB level
// (migration 076's own trigger), not merely by this service.
export async function recordFeeChargeEvent(params: RecordFeeChargeEventParams): Promise<FeeChargeEvent> {
  assertActor(params.actorRole, params.actorId);
  assertKoraAdminWriter(params.actorRole);

  if (!FEE_CHARGE_CATEGORIES.includes(params.chargeCategory)) {
    throw new Error(`[KORA] flow-a-billing rejected: "${params.chargeCategory}" is not a canonical Fee/Charge category (doc 83 §10).`);
  }
  if (!FEE_CHARGE_STATUSES.includes(params.status)) {
    throw new Error(`[KORA] flow-a-billing rejected: "${params.status}" is not a canonical Fee/Charge status.`);
  }
  if (!BILLING_CADENCES.includes(params.billingCadence)) {
    throw new Error(`[KORA] flow-a-billing rejected: "${params.billingCadence}" is not a canonical billing cadence.`);
  }
  if (typeof params.amount !== 'number' || Number.isNaN(params.amount) || params.amount < 0) {
    throw new Error('[KORA] flow-a-billing rejected: amount must be a non-negative number.');
  }

  const db = getSupabaseServiceClient();

  const { data, error } = await (
    db.schema('analytics') as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc('record_fee_charge_event', {
    p_tenant_id: params.tenantId,
    p_charge_category: params.chargeCategory,
    p_amount: params.amount,
    p_billing_cadence: params.billingCadence,
    p_effective_date: params.effectiveDate,
    p_status: params.status,
    p_actor_role: params.actorRole,
    p_actor_id: params.actorId,
    p_charge_id: params.chargeId ?? null,
    p_currency: params.currency ?? 'EUR',
    p_invoice_reference: params.invoiceReference ?? null,
    p_reason: params.reason ?? null,
  });

  if (error || !data) {
    throw new Error(`[KORA] recordFeeChargeEvent failed: ${error?.message ?? 'no data returned'}`);
  }

  const row = (Array.isArray(data) ? data[0] : data) as FeeChargeEventDbRow;
  return toFeeChargeEvent(row);
}

// Full event history for one Fee/Charge, oldest first.
export async function getFeeChargeEventHistory(
  chargeId: string,
  tenantId: string,
  callerRole: string,
  callerTenantId: string | null,
): Promise<FeeChargeEvent[]> {
  assertCompanyScopedRead(callerRole, callerTenantId, tenantId);

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('fee_charge_event')
    .select()
    .eq('charge_id', chargeId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] getFeeChargeEventHistory failed: ${error.message}`);
  }

  return ((data ?? []) as FeeChargeEventDbRow[]).map(toFeeChargeEvent);
}

export interface FeeChargeCurrentStatus {
  chargeId: string;
  chargeCategory: FeeChargeCategory;
  amount: number;
  currency: string;
  billingCadence: BillingCadence;
  effectiveDate: string;
  status: FeeChargeStatus;
  invoiceReference: string | null;
  lastUpdatedAt: string;
}

// Every Fee/Charge for a Company, each reduced to its own latest event
// (current status is always derived from the event stream — never stored
// as an independent "truth" of its own, doc 83 §9's discipline applied at
// Flow A's smaller scale).
export async function listCurrentFeeCharges(
  tenantId: string,
  callerRole: string,
  callerTenantId: string | null,
): Promise<FeeChargeCurrentStatus[]> {
  assertCompanyScopedRead(callerRole, callerTenantId, tenantId);

  const db = getSupabaseServiceClient();

  const { data, error } = await db
    .schema('analytics')
    .from('fee_charge_event')
    .select()
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[KORA] listCurrentFeeCharges failed: ${error.message}`);
  }

  const events = ((data ?? []) as FeeChargeEventDbRow[]).map(toFeeChargeEvent);

  const latestByChargeId = new Map<string, FeeChargeEvent>();
  for (const event of events) {
    latestByChargeId.set(event.chargeId, event); // ascending order — last write per chargeId wins, i.e. the latest.
  }

  return Array.from(latestByChargeId.values()).map((event) => ({
    chargeId: event.chargeId,
    chargeCategory: event.chargeCategory,
    amount: event.amount,
    currency: event.currency,
    billingCadence: event.billingCadence,
    effectiveDate: event.effectiveDate,
    status: event.status,
    invoiceReference: event.invoiceReference,
    lastUpdatedAt: event.createdAt,
  }));
}

// ── composed read: "Company sees billing status" (registry's own Acceptance) ──

export interface CompanyBillingStatus {
  tenantId: string;
  entitlement: FlowACommercialEntitlement | null;
  charges: FeeChargeCurrentStatus[];
}

export async function getCompanyBillingStatus(
  tenantId: string,
  callerRole: string,
  callerTenantId: string | null,
): Promise<CompanyBillingStatus> {
  assertCompanyScopedRead(callerRole, callerTenantId, tenantId);

  const [entitlement, charges] = await Promise.all([
    getFlowACommercialEntitlement(tenantId, callerRole, callerTenantId),
    listCurrentFeeCharges(tenantId, callerRole, callerTenantId),
  ]);

  return { tenantId, entitlement, charges };
}
