// lib/kora-engine/contribution-family-detector.ts
// Downstream classifier — identifies contribution-eligible events from IU pipeline output.
// NOT the Eligibility Gate. Operates after eligibility has already been determined.
// Used by KoraContributionService.computeFromPipelineResult() to filter IU results.
//
// Contribution-eligible ≠ KORA-Index-eligible.
// These events generate IU through the normal pipeline AND feed the Contribution companion indicator.
// They do NOT become KORA Index components because of this classification.
// The companion indicator is always: is_kora_index_component = false.

import type { ActionFamily } from '@/lib/types';

// ── Canonical contribution families ──────────────────────────────────────────

export const CONTRIBUTION_ACTION_FAMILIES: readonly ActionFamily[] = [
  'territorial_impact',
  'inclusion_and_connection',
  'future_and_legacy',
];

export const CONTRIBUTION_PILLARS = ['IMPACT', 'CONNECTION', 'LEGACY'] as const;
export type ContributionPillar = typeof CONTRIBUTION_PILLARS[number];

// event_nature values that signal a collective/territorial contribution event
const CONTRIBUTION_EVENT_NATURES = new Set([
  'collective_initiative',
  'territorial_initiative',
  'partner_service',
]);

// ── Detection input — compatible with ImpactUnitComputationResult shape ─────

export interface ContributionEventInput {
  action_family?: string;
  event_nature?: string;
  pillar?: string;
}

/**
 * Returns true if this event is contribution-eligible.
 *
 * A contribution-eligible event must have at least one of:
 *   1. action_family in CONTRIBUTION_ACTION_FAMILIES (territorial_impact, inclusion_and_connection, future_and_legacy)
 *   2. event_nature in CONTRIBUTION_EVENT_NATURES (collective_initiative, territorial_initiative, partner_service)
 *
 * Bare pillar match alone (IMPACT/CONNECTION/LEGACY) is NOT sufficient.
 * Rationale: an individual training with pillar=IMPACT is NOT a collective contribution event.
 * Pillar is used only for breakdown computation — not as an eligibility signal.
 * CONTRIBUTION_PILLARS remains exported for breakdown aggregation in KoraContributionService.
 *
 * This is a downstream classifier — it does NOT re-run eligibility.
 * AGF=0 (disqualified) records are already filtered by the IU engine before reaching here.
 */
export function isContributionEligibleEvent(input: ContributionEventInput): boolean {
  // action_family is the strongest signal — event was explicitly classified as collective by taxonomy
  if (
    input.action_family &&
    CONTRIBUTION_ACTION_FAMILIES.includes(input.action_family as ActionFamily)
  ) {
    return true;
  }
  // event_nature signals an explicitly collective/territorial/partner event
  if (input.event_nature && CONTRIBUTION_EVENT_NATURES.has(input.event_nature)) {
    return true;
  }
  // Bare pillar match alone (IMPACT/CONNECTION/LEGACY) is intentionally NOT sufficient.
  // An event must have action_family or event_nature to be contribution-eligible.
  return false;
}
