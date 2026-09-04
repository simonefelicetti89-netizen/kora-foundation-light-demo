// lib/live/admin-cross-company-view.ts
// CC-00 — B-TRUTH / ONE PRODUCT, ONE TRUTH — AdminPreview Cross-Company
// Canonicalization, Phase 1.
//
// Canonical live view over analytics.tenant + analytics.kora_index_result +
// analytics.confidence_result + analytics.source_batch, replacing
// services/admin-preview/AdminPreviewService.ts's synthetic
// getPlatformAnalyticsPreview() for its one real caller (app/admin/page.tsx).
//
// SCOPE: Platform Analytics ONLY. getIndexRegistryPreview() is explicitly
// NOT migrated by this file or this PR — see the header of app/admin/page.tsx
// for why (a security-architecture conflict: one of its two real callers,
// app/demo/index-registry/page.tsx, is reachable by the DEMO_VIEWER role,
// which lib/auth/kora-session.ts's own requireDemoAccess() documents as
// safe only because /demo pages are synth-only; introducing a live
// cross-company query there requires a founder-level security decision this
// PR does not make). This file therefore builds its own internal, private
// aggregation directly from canonical rows — it does not call, wrap, or
// duplicate the still-synthetic, still-public getIndexRegistryPreview().
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
