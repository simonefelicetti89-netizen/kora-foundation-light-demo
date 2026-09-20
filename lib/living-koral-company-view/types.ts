// lib/living-koral-company-view/types.ts
// KORA-WP-114 — Living KORAL Company Hub (V1 core, KORAL Mark excluded —
// Founder adjudication, see .kora-audit/output/172_KORA_WP_114_CANONICAL_
// PRE_CHECK.md §31).
//
// The Company-facing view model / DTO boundary over KORA-WP-113's own
// domain tables (gov.living_koral_transformation_ledger,
// analytics.living_koral_state). Raw DB rows/enums/version strings never
// reach app/company/living-koral/page.tsx directly — only this shaped
// view, matching CLAUDE.md §12 principle 2 ("Components must consume
// service outputs, not raw sensitive... rows directly") and the same
// pattern lib/scoring-result's own ScoringResult shape already
// established.
//
// Deliberately absent (KORA-WP-115+'s own scope, per pre-check 172 §19–20
// and this WP's own Founder-authorized task): any type for a KORAL Mark
// render payload, Edition, Portrait, Review record, Expression Mode
// output, or Commons/Public KORAL page data.
//
// OBJECT-LEVEL PROVENANCE REMEDIATION (migration 084): the original
// implementation surfaced DOMAIN-level provenance only, disclosed as an
// open item — since accepted as part of the original WP-114 contract, not
// deferred debt, and now closed for the currently live initiative source
// via analytics.fn_company_living_koral_source_initiative(), a narrow
// SECURITY DEFINER bridge function (migration 015's own established
// pattern — "the ONLY permitted bridge between company users and
// personal.*"), never a raw RLS policy on gov.living_koral_material_change
// or personal.worker_initiative (both remain COMPANY_ADMIN-unreadable
// directly — no table-level RLS policy was added by migration 084).
// `sourceLabel` below is the ONLY object-level field this view ever
// carries — no raw UUID, no other worker_initiative column. `null` when
// resolution is unavailable (non-initiative domain, cross-tenant,
// resolution failure) — the view falls back to domain-level provenance
// alone in that case, never a fabricated title (this remediation's own §5
// instruction).

import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';

/** One category's Company-legible presentation — plain Italian, neutral, never evaluative (Strengthening ≠ good, Weakening ≠ bad). */
export interface LivingKoralCategoryPresentation {
  readonly categoryLabel: string;       // e.g. "Emersione" — the translated taxonomy category name
  readonly categoryDescription: string; // one neutral, structural sentence — never "improved"/"worsened"/"better"/"worse"
}

/** One structural region's Company-legible presentation (never geometric/visual — see pre-check 172 §31, no Mark). */
export interface LivingKoralCompanyRegion {
  readonly domain: 'initiative';
  readonly domainLabel: string; // e.g. "Iniziative aziendali"
  readonly elementCount: number;
}

/** The single latest RECOGNIZED transformation, Company-legible (Registry 142's own Acceptance: only the latest, no history/timeline in V1). */
export interface LivingKoralCompanyLatestTransformation {
  readonly category: MaterialChangeTaxonomyEntry['category'];
  readonly categoryLabel: string;
  readonly categoryDescription: string;
  readonly domainLabel: string;
  readonly occurredAt: string;
  readonly recognizedAt: string;
  /**
   * Object-level provenance (migration 084) — the real source object's
   * own human-legible name (e.g. an initiative's title), when resolvable.
   * `null` when not resolvable (see this file's own header comment) —
   * never a raw UUID, never fabricated, never the only source of "why
   * this changed" (the structural categoryDescription above always
   * stands on its own).
   */
  readonly sourceLabel: string | null;
}

/**
 * Three, and only three, real states (this WP's own §14 integrity
 * discipline — never silently normalized into one another):
 *   - 'no_state_yet'   — genuine pre-genesis empty state (no
 *                        analytics.living_koral_state row exists for this
 *                        tenant at all — WP-113's own genesis mechanics,
 *                        pre-check 172 §6/§11: the row is created only
 *                        alongside a tenant's FIRST recognized
 *                        transformation, never eagerly).
 *   - 'ok'             — a real state row exists and (by the Continuity
 *                        Contract's own genesis-consistency invariant,
 *                        migration 082's own CHECK) at least one Ledger
 *                        row exists and was successfully resolved.
 *   - 'integrity_error' — a state row exists (revision >= 1) but the
 *                        expected latest Ledger row could not be
 *                        resolved — a genuine data-integrity anomaly that
 *                        must never be silently converted into a fake
 *                        empty state (this WP's own §14 instruction).
 */
export type LivingKoralCompanyViewStatus = 'no_state_yet' | 'ok' | 'integrity_error';

export interface LivingKoralCompanyView {
  readonly status: LivingKoralCompanyViewStatus;
  readonly tenantId: string;
  readonly revision: number | null;
  readonly regions: readonly LivingKoralCompanyRegion[] | null;
  readonly latestTransformation: LivingKoralCompanyLatestTransformation | null;
}
