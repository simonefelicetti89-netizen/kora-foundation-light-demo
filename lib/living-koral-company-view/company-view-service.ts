// lib/living-koral-company-view/company-view-service.ts
// KORA-WP-114 — Living KORAL Company Hub (V1 core, KORAL Mark excluded —
// Founder adjudication, .kora-audit/output/172_..._PRE_CHECK.md §31).
//
// The ONLY module permitted to read gov.living_koral_transformation_ledger
// or analytics.living_koral_state on behalf of a COMPANY_ADMIN session.
// Uses getSupabaseServerClient() EXCLUSIVELY — the real, cookie-forwarded
// session client, RLS-enforced — never getSupabaseServiceClient(). This is
// a deliberate, load-bearing choice, not an oversight: lib/supabase/
// server.ts's own doc comment forbids a service-role bypass for "any page
// a WORKER, COMPANY_ADMIN..., or PARTNER reaches as their own workspace/
// self-service surface" and instructs "if a query legitimately returns
// fewer rows than expected, that is RLS working — go add the missing
// policy, don't swap clients." Migration 083 adds exactly the missing
// policy this module now relies on (two tables only, per the Founder's
// own explicit migration-083 scope) — no read in this file ever needs or
// uses the service-role client.
//
// Never duplicates KORA-WP-113's own Morphogenesis/Material-Change-
// recognition logic (this WP's own §5 instruction) — this module only
// reads already-computed, already-persisted state; it computes nothing,
// mutates nothing.
//
// OBJECT-LEVEL PROVENANCE (migration 084 remediation) — see types.ts's own
// header comment for the full reasoning. This module still never reads
// gov.living_koral_material_change or personal.worker_initiative directly
// (no RLS policy exists on either, and none was added) — source-label
// resolution goes exclusively through
// analytics.fn_company_living_koral_source_initiative(), a narrow SECURITY
// DEFINER bridge function called via the SAME session-forwarding client
// used everywhere else in this file (never getSupabaseServiceClient()) —
// matching the exact RPC-call pattern already established by
// app/api/company/workers/activation-aggregate/route.ts's own
// fn_company_activation_summary() call. A resolution failure or zero-row
// result never fails the page — it falls back to domain-level provenance
// alone (this remediation's own §5 instruction).

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { captureError, logInfo } from '@/lib/observability/observability';
import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';
import type {
  LivingKoralCompanyView, LivingKoralCompanyRegion, LivingKoralCompanyLatestTransformation,
} from './types';

// ── Plain-language Italian presentation — never sourced from the raw DB
// enum or from the English doc-129-derived config text, and never
// evaluative (Strengthening ≠ good, Weakening ≠ bad, Disappearance ≠
// failure, Emergence ≠ success — this WP's own §2.B instruction). Kept
// local to this module rather than added to the shared taxonomy config,
// since it is presentation copy, not semantic model (lib/living-koral-
// config/types.ts's own file boundary — "the frozen semantic model",
// never UI strings).
const CATEGORY_LABELS: Record<MaterialChangeTaxonomyEntry['category'], { label: string; description: string }> = {
  Emergence:     { label: 'Emersione',      description: 'È stato riconosciuto un nuovo elemento organizzativo in quest’area.' },
  Disappearance: { label: 'Conclusione',     description: 'Un elemento organizzativo in quest’area si è concluso.' },
  Strengthening: { label: 'Rafforzamento',   description: 'Quest’area ha registrato un cambiamento di peso organizzativo verso l’alto.' },
  Weakening:     { label: 'Indebolimento',   description: 'Quest’area ha registrato un cambiamento di peso organizzativo verso il basso.' },
  Consolidation: { label: 'Consolidamento',  description: 'Più elementi in quest’area si sono ricomposti in una forma più definita.' },
  Reorientation: { label: 'Riorientamento',  description: 'La direzione di quest’area è cambiata, senza una semplice crescita o riduzione.' },
  Stabilization: { label: 'Stabilizzazione', description: 'Quest’area si è assestata in uno stato confermato.' },
};

const DOMAIN_LABELS: Record<'initiative', string> = {
  initiative: 'Iniziative aziendali',
};

/** Exported for direct unit testing (structural/label-mapping tests, no DB/cookies needed) — matches WP-113's own replayLivingKoralStateFromLedger() pure-export precedent. */
export function categoryPresentation(category: MaterialChangeTaxonomyEntry['category']) {
  return CATEGORY_LABELS[category] ?? { label: category, description: '' };
}

/** Exported for direct unit testing — see categoryPresentation()'s own comment. */
export function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain as 'initiative'] ?? domain;
}

interface StateRow {
  revision: number;
  regions: Record<string, { element_count?: number }> | null;
}

interface LedgerRow {
  category: MaterialChangeTaxonomyEntry['category'];
  affected_domain: string;
  occurred_at: string;
  recognized_at: string;
  material_change_id: string;
}

/** Exported for direct unit testing — pure mapping, no DB access. */
export function toRegions(raw: StateRow['regions']): LivingKoralCompanyRegion[] {
  const source = raw ?? {};
  return Object.entries(source).map(([domain, value]) => ({
    domain: domain as 'initiative',
    domainLabel: domainLabel(domain),
    elementCount: value?.element_count ?? 0,
  }));
}

/** Exported for direct unit testing — pure mapping, no DB access. `sourceLabel` is resolved separately (async, RPC-backed) and passed in — kept out of this pure function on purpose. */
export function toLatestTransformation(row: LedgerRow, sourceLabel: string | null): LivingKoralCompanyLatestTransformation {
  const presentation = categoryPresentation(row.category);
  return {
    category: row.category,
    categoryLabel: presentation.label,
    categoryDescription: presentation.description,
    domainLabel: domainLabel(row.affected_domain),
    occurredAt: row.occurred_at,
    recognizedAt: row.recognized_at,
    sourceLabel,
  };
}

type CompanyDb = Awaited<ReturnType<typeof getSupabaseServerClient>>;

/**
 * Object-level provenance resolution (migration 084) — calls
 * analytics.fn_company_living_koral_source_initiative() through the same
 * session-forwarding client used for every other read in this file. Only
 * called for `affected_domain === 'initiative'` (the only live source
 * domain, pre-check 172/this remediation's own §5 — no speculative
 * future-domain branch). Never throws: a resolution failure or a
 * legitimate zero-row result (non-initiative source, cross-tenant, or the
 * referenced initiative no longer exists) both return `null` — the caller
 * falls back to domain-level provenance alone, never a fabricated title.
 */
async function resolveSourceLabel(db: CompanyDb, materialChangeId: string, tenantId: string): Promise<string | null> {
  try {
    const { data, error } = await (
      db.schema('analytics') as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc('fn_company_living_koral_source_initiative', { p_material_change_id: materialChangeId });

    if (error) {
      captureError(error, { correlationId: 'living-koral-company-view', operation: 'living_koral_company_view.resolve_source_label', tenantId }, 'fn_company_living_koral_source_initiative failed');
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const title = (row as { title?: string | null } | null)?.title;
    return typeof title === 'string' && title.length > 0 ? title : null;
  } catch (err) {
    captureError(err, { correlationId: 'living-koral-company-view', operation: 'living_koral_company_view.resolve_source_label', tenantId }, 'fn_company_living_koral_source_initiative threw');
    return null;
  }
}

/**
 * The Company Hub Overview's sole read entry point. `tenantId` must
 * already be session-derived by the caller (requireCompanyUser()'s own
 * auth.tenantId, or the existing KORA_ADMIN service-access
 * `kora-service-tenant-id` cookie path — app/company/layout.tsx, both
 * unchanged by this WP) — this function never accepts a client-supplied
 * tenant id, and RLS (migration 083) is the real, structural gate either
 * way: a wrong/foreign tenantId here simply yields zero rows, never
 * another tenant's data (defense in depth, this WP's own §8 instruction).
 */
export async function getLivingKoralCompanyView(tenantId: string): Promise<LivingKoralCompanyView> {
  const db = await getSupabaseServerClient();

  const { data: stateRow, error: stateError } = await db
    .schema('analytics').from('living_koral_state')
    .select('revision, regions')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (stateError) {
    captureError(stateError, { correlationId: 'living-koral-company-view', operation: 'living_koral_company_view.read_state', tenantId }, 'living_koral_state read failed');
    return { status: 'integrity_error', tenantId, revision: null, regions: null, latestTransformation: null };
  }

  if (!stateRow) {
    // Genuine pre-genesis empty state — no fabricated history, no fake
    // counts (this WP's own §4 instruction). Not an error.
    logInfo('living_koral_company_view: no state row yet (pre-genesis)', { correlationId: 'living-koral-company-view', operation: 'living_koral_company_view.read_state', tenantId });
    return { status: 'no_state_yet', tenantId, revision: null, regions: null, latestTransformation: null };
  }

  const row = stateRow as unknown as StateRow;

  const { data: ledgerRow, error: ledgerError } = await db
    .schema('gov').from('living_koral_transformation_ledger')
    .select('category, affected_domain, occurred_at, recognized_at, material_change_id')
    .eq('tenant_id', tenantId)
    .order('recognized_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ledgerError) {
    captureError(ledgerError, { correlationId: 'living-koral-company-view', operation: 'living_koral_company_view.read_ledger', tenantId }, 'living_koral_transformation_ledger read failed');
    return { status: 'integrity_error', tenantId, revision: row.revision, regions: toRegions(row.regions), latestTransformation: null };
  }

  if (!ledgerRow) {
    // A state row with revision >= 1 but no Ledger row is a real
    // integrity anomaly (migration 082's own genesis-consistency CHECK
    // makes this structurally impossible under normal operation) — never
    // silently treated as "no change yet" (this WP's own §14 instruction).
    captureError(
      new Error('analytics.living_koral_state row exists but no gov.living_koral_transformation_ledger row was found for this tenant'),
      { correlationId: 'living-koral-company-view', operation: 'living_koral_company_view.read_ledger', tenantId, errorCode: 'living_koral_state_without_ledger' },
      'Living KORAL integrity anomaly',
    );
    return { status: 'integrity_error', tenantId, revision: row.revision, regions: toRegions(row.regions), latestTransformation: null };
  }

  const ledger = ledgerRow as unknown as LedgerRow;

  // Object-level resolution only for the one currently live source domain
  // (this remediation's own §5 — no speculative future-domain adapter).
  // A future, unsupported domain value simply falls back to null here,
  // never pretending resolution exists for a domain this function was
  // never taught about.
  const sourceLabel = ledger.affected_domain === 'initiative'
    ? await resolveSourceLabel(db, ledger.material_change_id, tenantId)
    : null;

  return {
    status: 'ok',
    tenantId,
    revision: row.revision,
    regions: toRegions(row.regions),
    latestTransformation: toLatestTransformation(ledger, sourceLabel),
  };
}
