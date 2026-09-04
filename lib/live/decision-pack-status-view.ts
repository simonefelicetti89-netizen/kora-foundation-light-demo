// lib/live/decision-pack-status-view.ts
// B-TRUTH ReportFactoryService Canonical Decision Pack Status Migration —
// canonical live view over analytics.decision_pack_version, replacing
// services/report-factory/ReportFactoryService.ts's synthetic
// getDecisionPackFactoryStatus()/getLatestDecisionPackVersion() for its one
// real caller (app/admin/pipeline/_components/PilotLifecycleClient.tsx).
//
// Field disposition (only the field actually consumed by the real caller,
// traced by direct usage, not inferred from the legacy interface — no
// opportunistic broadening): the legacy DecisionPackFactoryStatus return
// shape had 9 fields (company_id, tenant_id, latest_version_id,
// latest_status, can_generate, can_export_pdf, can_share, blocking_reasons,
// warnings, next_action). Direct-usage trace of the sole real caller found
// exactly ONE field read: dpStatus.latest_status, compared to 'ready'. Every
// other field — including the entire blocking_reasons/warnings/next_action/
// can_generate apparatus (itself built from a private hasKoraIndex() call
// into the still-synthetic ScoringSimulatorService demo path) — was computed
// and silently discarded by the only real caller. Per this migration's own
// "map only what the canonical model actually supports, do not fake 1:1
// parity with legacy synthetic fields" rule, and "ReportFactory must NOT
// become a synthetic decision rationale source" — that entire apparatus is
// DROPPED, not migrated: it never had a real consumer, so there was nothing
// canonical to migrate it onto. This also means hasKoraIndex()'s
// ScoringSimulatorService dependency is dropped along with it, not
// reimplemented against a canonical KORA Index existence check — final
// scoring is untouched by this migration, not because a canonical
// replacement was avoided, but because nothing downstream ever needed it.
//
// KEEP/DERIVE: hasDecisionPack (does at least one analytics.decision_pack_version
// row exist for the tenant) and status (the latest version's persisted
// status column, DIRECT_CANONICAL_FIELD — the caller's own '=== ready'
// check operates on this, matching the same shape as
// lib/live/data-intake-status-view.ts's intakeStatus rather than
// pre-collapsing to a single boolean, so a future caller distinguishing
// 'draft'/'blocked'/etc. is not blocked by this projection — not new
// speculative fields, just not lossy-collapsing the one canonical field
// that already exists).
//
// Version-selection rule (multiple analytics.decision_pack_version rows can
// exist per tenant): latest by created_at — the same precedent already
// reused by lib/live/data-intake-status-view.ts and, before that, by
// app/api/admin/operator-flow route's own GET handler
// (`.order('created_at', { ascending: false }).limit(1)`) for this exact
// table. Not invented for this migration.
//
// tenant_kind is never read here — this view is identical for a
// tenant_kind='TEST' tenant (KoraTest Srl) and any tenant_kind='LIVE' tenant.

export interface CanonicalDecisionPackStatus {
  hasDecisionPack: boolean;
  status: string | null;
}

export interface DecisionPackVersionStatusRow {
  status: string;
  created_at: string;
}

export function buildDecisionPackStatusView(
  versions: DecisionPackVersionStatusRow[],
): CanonicalDecisionPackStatus {
  if (versions.length === 0) {
    return { hasDecisionPack: false, status: null };
  }

  const latest = [...versions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  return { hasDecisionPack: true, status: latest.status };
}
