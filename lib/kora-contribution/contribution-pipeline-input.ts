// lib/kora-contribution/contribution-pipeline-input.ts
// B-TRUTH Contribution protected port — canonical DB row -> ContributionPipelineInput[]
// mapping, replacing the synthetic-JSON-derived mapping previously inline in
// KoraContributionService.getSummaryV2() (retired).
//
// PROTECTED METHODOLOGY PORT — this file changes WHAT FEEDS the methodology,
// never the methodology itself. computeContributionV2() / computeProvisionalScore()
// in services/kora-contribution/KoraContributionService.ts are untouched by
// this port; this module only builds their input array from real
// commons.contribution_event + commons.post rows instead of
// data/synthetic/collective-initiatives.json.
//
// Field mapping, all sourced from already-existing real columns (migration
// 025) — no fabricated or canonical-but-nonexistent field is invented:
//   impact_units_total       <- contribution_event.impact_weight (already a
//                                real, stored, computed number)
//   primary_pillar            <- commons.post.pillar, joined on source_post_id
//                                (same join pattern getContributionPromoterView/
//                                getContributionOriginEmployerView already use)
//   evidence_verification_ev  <- EVIDENCE_STATUS_TO_EV[evidence_status] — a
//                                small, explicit, documented mapping table,
//                                the same *kind* of derivation the demo path's
//                                own VERIFICATION_TO_EV table already used
//                                (not the same values — a different live enum
//                                with 5 members vs. the demo's 4 — but the
//                                same threshold philosophy: evidenceQuality's
//                                own >=0.85 "verified" cutoff in
//                                computeContributionV2 is preserved by mapping
//                                every genuinely-verified live status to 0.90).
//   event_nature               <- deriveEventNature(), built only from
//                                contribution_kind / is_cross_company /
//                                is_kora_originated / is_kora_enabled — all
//                                real columns. isContributionEligibleEvent()
//                                accepts EITHER action_family OR event_nature;
//                                every commons.contribution_event row by
//                                definition already represents a
//                                Contribution-relevant event (the table's own
//                                purpose, per migration 025's header comment),
//                                so event_nature alone is sufficient for
//                                eligibility.
//   action_family               <- deriveActionFamily(pillar, event_nature) —
//                                ONLY populated once event_nature has already
//                                independently established the row as a
//                                genuine collective/territorial/partner event.
//                                Never derived from bare pillar alone: doing
//                                so would defeat contribution-family-detector's
//                                own documented rule ("an individual training
//                                with pillar=IMPACT is NOT a collective
//                                contribution event") by opening a second,
//                                pillar-only eligibility path. Gating on
//                                event_nature keeps eligibility semantics
//                                identical while still feeding
//                                computeContributionV2's strategicBreadth
//                                family-diversity component a real signal
//                                instead of leaving it structurally empty —
//                                confirmed by the parity test in
//                                tests/unit/kora-contribution-pipeline.test.ts.
//   computed                   <- impact_weight > 0, mirroring the demo
//                                path's own `isComputed = ... && iuEstimate > 0`
//                                guard exactly.

import type { ContributionPipelineInput } from '@/services/kora-contribution/KoraContributionService';

export interface ContributionEventRow {
  source_post_id: string;
  contribution_kind: string;
  // number: the PostgREST/Supabase JS client's real-world shape (RLS-15+
  // integration paths, and getContributionV2Live's production caller) —
  // numeric JSON columns serialize as JSON numbers.
  // string: node-postgres's real-world shape for a Postgres `numeric`
  // column (RLS-14 caught this for real, in CI, against live Postgres —
  // node-pg returns `numeric` as a string by default to avoid silent
  // precision loss). Both are legitimate forms produced by currently
  // supported DB adapters — neither is fabricated to satisfy this type.
  impact_weight: number | string;
  evidence_status: string;
  is_cross_company: boolean;
  is_kora_originated: boolean;
  is_kora_enabled: boolean;
}

/**
 * Normalizes a raw impact_weight value (as handed across the DB adapter
 * boundary — see ContributionEventRow.impact_weight) into a real, finite
 * JS number. Never silently propagates a string or a non-finite value into
 * computeContributionV2/computeProvisionalScore — those functions are the
 * protected methodology authority and must only ever see clean numbers.
 *
 * Throws (does not silently default) on anything that is not a genuinely
 * valid numeric form. commons.contribution_event.impact_weight is a
 * `numeric(8,4) NOT NULL` column (migration 025) — null is never a valid
 * value from the real DB contract, so it is rejected here too, not
 * special-cased.
 */
export function normalizeImpactWeight(value: number | string): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid impact_weight: non-finite number (${value})`);
    }
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      throw new Error('Invalid impact_weight: empty string');
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid impact_weight: cannot parse "${value}" as a finite number`);
    }
    return parsed;
  }
  throw new Error(
    `Invalid impact_weight: expected number or numeric string, got ${typeof value} (${JSON.stringify(value)})`,
  );
}

// Live evidence_status enum (migration 025, M025-2) -> EV (0-1).
// Threshold preserved: computeContributionV2's evidenceQuality component
// counts a row as "verified" at evidence_verification_ev >= 0.85 — every
// genuinely-verified live status (verified/system_verified/advisor_verified)
// maps at or above that line; partner_verified and self_declared sit below
// it, matching their lower certainty exactly as the demo path's own
// VERIFICATION_TO_EV table distinguished 'verified' from 'partial'/'pending'.
export const EVIDENCE_STATUS_TO_EV: Record<string, number> = {
  verified:         0.90,
  system_verified:  0.90,
  advisor_verified: 0.90,
  partner_verified: 0.75,
  self_declared:    0.50,
};

/**
 * Derives an event_nature classification from real contribution_event
 * columns only. Returns undefined (not a guess) when no real signal
 * supports a classification — isContributionEligibleEvent() then falls
 * through to the (absent) action_family check and correctly excludes the
 * row, rather than the row being force-included on a fabricated label.
 */
export function deriveEventNature(row: {
  contribution_kind: string;
  is_cross_company: boolean;
  is_kora_originated: boolean;
  is_kora_enabled: boolean;
}): string | undefined {
  // Source class A (the only kind BookingService.markAttended() currently
  // writes, per this file's own KoraContributionService.ts header comment)
  // is always a collective-participation signal by definition.
  if (row.contribution_kind === 'cross_company_participation' || row.contribution_kind === 'external_participants_event') {
    return 'collective_initiative';
  }
  if (row.is_kora_originated || row.is_kora_enabled) {
    return 'partner_service';
  }
  if (row.contribution_kind === 'initiative_replication') {
    return 'territorial_initiative';
  }
  // Source class B (company_adoption/company_sponsorship/company_support/
  // company_cofunding) is still a collective-activation signal — a company
  // adopting or sponsoring an existing initiative is participating in it.
  if (row.contribution_kind?.startsWith('company_')) {
    return 'collective_initiative';
  }
  // aggregate_feedback / aggregate_follow_up / kora_originated_adoption /
  // kora_enabled_adoption (without the flags above) — no real collective
  // signal to classify; left unclassified rather than guessed.
  return undefined;
}

// Positional 1:1 pairing already declared by contribution-family-detector.ts
// (CONTRIBUTION_ACTION_FAMILIES / CONTRIBUTION_PILLARS, same order, same
// length) — reused here, not invented.
const PILLAR_TO_ACTION_FAMILY: Record<string, string> = {
  IMPACT: 'territorial_impact',
  CONNECTION: 'inclusion_and_connection',
  LEGACY: 'future_and_legacy',
};

/**
 * Derives an action_family label, but ONLY once eventNature has already
 * independently established this row as a genuine collective event — never
 * from bare pillar alone. See module header for why.
 */
export function deriveActionFamily(pillar: string | null, eventNature: string | undefined): string {
  if (!eventNature || !pillar) return '';
  return PILLAR_TO_ACTION_FAMILY[pillar] ?? '';
}

export function buildContributionPipelineInputs(
  rows: ContributionEventRow[],
  pillarByPostId: Map<string, string | null>,
): ContributionPipelineInput[] {
  return rows.map((row) => {
    const impactWeight = normalizeImpactWeight(row.impact_weight);
    const ev = EVIDENCE_STATUS_TO_EV[row.evidence_status] ?? 0.50;
    const pillar = pillarByPostId.get(row.source_post_id) ?? null;
    const eventNature = deriveEventNature(row);
    return {
      action_family: deriveActionFamily(pillar, eventNature),
      primary_pillar: pillar,
      impact_units_total: impactWeight,
      evidence_verification_ev: ev,
      computed: impactWeight > 0,
      event_nature: eventNature,
    };
  });
}
