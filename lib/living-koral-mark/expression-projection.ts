// lib/living-koral-mark/expression-projection.ts
// KORA-WP-117 — Expression Mode Runtime + KORAL Mark Export.
//
// Expression Mode V1 (report 178 §0.7, Founder Engineering Adjudication
// §18-19): "a server-side positive allow-list projection from an
// authorized Edition/replay into the minimum structural payload accepted
// by the KORAL Mark renderer." NOT a visual theme picker, Company
// customization system, 3D mode, publication mode, or print mode —
// exactly one canonical V1 grammar.
//
// This module is the SINGLE, explicit, testable enforcement point for the
// positive allow-list. Even though lib/living-koral-mark/edition-lineage-
// service.ts already returns a minimal, UUID-free shape, this function
// exists as its own dedicated concern (never collapsed into the replay
// service or the morphology engine — Founder Engineering Adjudication
// §9's own explicit separation-of-concerns requirement) so the allow-list
// itself has one, permanent, independently-testable definition: ONLY
// { grammarVersion, domain, slotIndex, present, extentStep,
// directionOrdinal, stabilityState } may ever cross this boundary — the
// last three widened additively by KORAL Morphology Package A (report 182
// §3/§4/§5, report 183), still neutral, structural, non-evaluative
// morphology facts, never richer. Every other field this codebase's
// Living KORAL/Advisor
// domain ever carries — worker identity, worker responses, Advisor
// identity, Advisor Review text, Operational Case text, initiative
// title, source label, Decision Pack prose, raw provenance, evidence
// below the aggregation threshold, Company narrative/branding content —
// is structurally absent from the INPUT type this function accepts
// (EditionLineageReconstruction, types.ts), not merely filtered out here
// — there is no code path by which any of it could ever reach this
// function in the first place.

import { CANONICAL_DOMAIN_ORDER, KORAL_MARK_GRAMMAR_VERSION, type EditionLineageReconstruction, type ExpressionModeMarkPayload, type CanonicalDomain } from './types';

interface ProjectedElement {
  readonly slotIndex: number;
  readonly present: boolean;
  readonly extentStep: number;
  readonly directionOrdinal: number;
  readonly stabilityState: 'unsettled' | 'settled';
}

export function projectEditionLineageToExpressionMode(lineage: EditionLineageReconstruction): ExpressionModeMarkPayload {
  const byDomain = new Map<CanonicalDomain, ProjectedElement[]>();

  for (const el of lineage.elements) {
    const arr = byDomain.get(el.domain) ?? [];
    // Defaults match each dimension's own Emergence baseline (report 182
    // §3/§4/§5) — always fully populated in the OUTPUT, even when a
    // caller's own input (e.g. a pre-Package-A synthetic test payload)
    // omitted them.
    arr.push({
      slotIndex: el.slotIndex,
      present: el.present,
      extentStep: el.extentStep ?? 0,
      directionOrdinal: el.directionOrdinal ?? 0,
      stabilityState: el.stabilityState ?? 'unsettled',
    });
    byDomain.set(el.domain, arr);
  }

  // Canonical, fixed, versioned iteration order — never Map insertion
  // order (Founder Engineering Adjudication §12).
  const domains = CANONICAL_DOMAIN_ORDER
    .filter((domain) => byDomain.has(domain))
    .map((domain) => ({
      domain,
      elements: [...(byDomain.get(domain) ?? [])].sort((a, b) => a.slotIndex - b.slotIndex),
    }));

  return { grammarVersion: KORAL_MARK_GRAMMAR_VERSION, domains };
}
