// lib/live/admin-cross-company-view.ts
// CC-00 — B-TRUTH / ONE PRODUCT, ONE TRUTH — AdminPreview Cross-Company
// Canonicalization.
//
// Canonical live view over analytics.tenant + analytics.kora_index_result +
// analytics.confidence_result + analytics.source_batch, replacing
// services/admin-preview/AdminPreviewService.ts's synthetic
// getPlatformAnalyticsPreview() and getIndexRegistryPreview() for their real
// caller (app/admin/page.tsx).
//
// Phase 1 (2026-09-06): Platform Analytics only. getIndexRegistryPreview()
// was deliberately NOT migrated at that time — its second real caller,
// app/demo/index-registry/page.tsx, was reachable by the DEMO_VIEWER role,
// which lib/auth/kora-session.ts's own requireDemoAccess() documents as
// safe only because /demo pages are synth-only, and introducing a live
// cross-company query there required a founder-level security decision.
//
// Index Registry canonicalization (2026-09-06, later the same day, CC-00):
// the founder has since ratified DEMO_VIEWER's retirement (superseding the
// prior D-C decision that had kept /demo/** as permanent DEMO_RUNTIME —
// see lib/architecture/registry.ts's app-surface.demo entry for the
// preserved historical record of both decisions). With DEMO_VIEWER's
// authorization no longer the operative constraint, app/demo/index-registry
// is retired outright rather than made canonical for two audiences — its
// real value (the compact "top companies by KORA Index" panel) already
// lived, and continues to live, in app/admin/page.tsx's own Intelligence
// Grid panel (KORA_ADMIN-only, unchanged auth model). buildIndexRegistryView()
// below adds that projection, reusing the SAME already-fetched
// kora_index_result rows app/admin/page.tsx already queries for Platform
// Analytics — no second query, no duplicated business logic.
//
// Field disposition (only fields actually consumed by the real caller,
// traced by direct usage in app/admin/page.tsx, not inferred from the
// legacy PlatformAnalytics interface): the legacy shape had 8 fields.
// `active_scenarios` was confirmed to have ZERO real callers anywhere —
// dropped, not migrated. The other 7 (companies_in_portfolio, avg_kora_index,
// avg_confidence_score, avg_data_completeness, safeguard_distribution,
// source_batches_total, source_batches_approved) are all real and kept.
//
// avg_data_completeness: the prior architecture assumed this had no
// canonical source (tracing it to analytics.source_batch.completeness_pct,
// which is genuinely null/unpopulated everywhere in the current canonical
// write path). Re-verification for this PR found the CORRECT canonical
// source is a different column entirely: analytics.confidence_result.data_completeness
// — a real, methodology-computed component of the Confidence Score formula
// (lib/kora-engine/confidence-engine.ts, weighted 25%), persisted for real
// by lib/live/persistence.ts's persistKoraComputationResult() for every
// tenant that has run the canonical scoring pipeline (both KoraTest Srl and
// Bosco Verde Cooperativa Sociale do). This is not a fabrication — it is
// recognizing that a real canonical field for this exact concept already
// existed, just not where first assumed.
//
// Averages are computed only over tenants that actually have a current
// result — a tenant with no scoring run yet does not corrupt or zero out
// the portfolio average, and companies_in_portfolio (a census of all
// tenants) is intentionally independent of how many have been scored.
//
// tenant_kind is never read here — this view is identical for a
// tenant_kind='TEST' tenant and any tenant_kind='LIVE' tenant, and
// companies_in_portfolio counts every tenant regardless of kind, matching
// the existing app/admin/companies/page.tsx precedent ("every tenant_kind
// included — no hidden test tenants").

export interface CanonicalPlatformAnalytics {
  companies_in_portfolio: number;
  avg_kora_index: number | null;
  avg_confidence_score: number | null;
  avg_data_completeness: number | null;
  safeguard_distribution: { CLEAR: number; WARNING: number; FLAGGED: number };
  source_batches_total: number;
  source_batches_approved: number;
}

export interface CurrentKoraIndexResultRow {
  tenant_id: string;
  kora_index_value: number;
  safeguard_status: string;
  confidence_result: { confidence_score: number; data_completeness: number } | null;
}

export interface SourceBatchStatusRowForAnalytics {
  batch_status: string;
}

export function buildAdminPlatformAnalyticsView(
  tenantCount: number,
  currentResults: CurrentKoraIndexResultRow[],
  batches: SourceBatchStatusRowForAnalytics[],
): CanonicalPlatformAnalytics {
  const avgKoraIndex = currentResults.length
    ? Math.round(currentResults.reduce((s, r) => s + r.kora_index_value, 0) / currentResults.length)
    : null;

  const withConfidence = currentResults.filter(
    (r): r is CurrentKoraIndexResultRow & { confidence_result: { confidence_score: number; data_completeness: number } } =>
      r.confidence_result != null,
  );

  const avgConfidenceScore = withConfidence.length
    ? Math.round((withConfidence.reduce((s, r) => s + r.confidence_result.confidence_score, 0) / withConfidence.length) * 100) / 100
    : null;

  const avgDataCompleteness = withConfidence.length
    ? Math.round((withConfidence.reduce((s, r) => s + r.confidence_result.data_completeness, 0) / withConfidence.length) * 100) / 100
    : null;

  const safeguardDistribution = { CLEAR: 0, WARNING: 0, FLAGGED: 0 };
  for (const r of currentResults) {
    if (r.safeguard_status === 'CLEAR') safeguardDistribution.CLEAR++;
    else if (r.safeguard_status === 'WARNING') safeguardDistribution.WARNING++;
    else if (r.safeguard_status === 'FLAGGED') safeguardDistribution.FLAGGED++;
  }

  return {
    companies_in_portfolio: tenantCount,
    avg_kora_index: avgKoraIndex,
    avg_confidence_score: avgConfidenceScore,
    avg_data_completeness: avgDataCompleteness,
    safeguard_distribution: safeguardDistribution,
    source_batches_total: batches.length,
    source_batches_approved: batches.filter((b) => b.batch_status === 'approved').length,
  };
}

// ─── Index Registry ─────────────────────────────────────────────────────────
// Field disposition (only fields actually consumed by the real caller,
// traced by direct usage — not inferred from the legacy IndexRegistryEntry
// return shape): app/admin/page.tsx's Intelligence Grid panel read exactly
// company_name, kora_index_value, and safeguard_status (the last only for a
// color lookup) off the legacy 9-field IndexRegistryEntry. scenario_id (the
// only field with no canonical equivalent — canonical scoring is keyed by
// tenant_id/reporting_period/is_current, not a "scenario" axis) was rendered
// as a column but is dropped here, not replaced by an invented substitute.
// reporting_period, confidence_score, methodology_version_id,
// calibration_status, and is_synthetic were consumed only by
// app/demo/index-registry/page.tsx, which is retired in this same change —
// nothing else needs them, so they are not carried forward. This is a
// deliberate field-count reduction to what the surviving real caller
// actually uses, not a parity gap.
//
// Entries are returned in natural query order — the original callers never
// ordered them by kora_index_value either; imposing a value-based ordering
// now would introduce an unrequested leaderboard/comparison semantic this
// migration does not authorize.

export interface CanonicalIndexRegistryEntry {
  tenantId: string;
  companyName: string;
  koraIndexValue: number;
  safeguardStatus: string;
}

export interface TenantIdentityRow {
  id: string;
  company_name: string;
}

export function buildIndexRegistryView(
  tenants: TenantIdentityRow[],
  currentResults: CurrentKoraIndexResultRow[],
): CanonicalIndexRegistryEntry[] {
  const nameById = new Map(tenants.map((t) => [t.id, t.company_name]));
  return currentResults.map((r) => ({
    tenantId: r.tenant_id,
    companyName: nameById.get(r.tenant_id) ?? r.tenant_id,
    koraIndexValue: r.kora_index_value,
    safeguardStatus: r.safeguard_status,
  }));
}
