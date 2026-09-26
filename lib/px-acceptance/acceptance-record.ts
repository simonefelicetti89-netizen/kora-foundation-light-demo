// lib/px-acceptance/acceptance-record.ts
// KORA-WP-126 — the Founder visual acceptance record format.
//
// Registry 219's WP126 Acceptance requires "a recorded Founder visual
// acceptance format" and makes the record itself the audit trail (its Audit
// field: "the acceptance record itself is the audit trail").
//
// THE INVARIANT THIS FILE EXISTS FOR: a visual acceptance is an event bound to
// ONE immutable Product SHA. It is NOT inherited by descendants. The live
// example is KORA Index V2 — accepted at 467893cf…, while canonical Product has
// since moved to later SHAs for unrelated WP116 and governance-routing reasons.
// Those descendants carry no visual acceptance of their own, and this module
// refuses to imply otherwise.

export type AcceptanceCriterion =
  /** Mechanically checkable — a test can decide it. */
  | 'mechanical'
  /** Human review decides it: hierarchy, scanability, actionability, craft. */
  | 'review-enforced'
  /** Founder judgment alone: Logo-Off, premium moments, final visual acceptance. */
  | 'founder-judgment';

/**
 * Registry 219's WP126 amendment is explicit that review-enforced and
 * Founder-judgment criteria "must NOT be given fragile automated tests".
 * Declaring the classification as data lets the self-test assert that the
 * instrument never claims to mechanise the wrong ones.
 */
export const CRITERION_CLASS: Record<string, AcceptanceCriterion> = {
  typography_tokens: 'mechanical',
  typography_floor: 'mechanical',
  spacing_tokens: 'mechanical',
  route_archetype_declared: 'mechanical',
  surface_role_constraints: 'mechanical',
  seven_state_resolution: 'mechanical',
  page_length: 'mechanical',
  mobile_ratio: 'mechanical',
  navigation_budget: 'mechanical',
  no_bare_threshold_metric: 'mechanical',
  hierarchy: 'review-enforced',
  scanability: 'review-enforced',
  actionability: 'review-enforced',
  craft: 'review-enforced',
  logo_off_test: 'founder-judgment',
  premium_moments: 'founder-judgment',
  final_visual_acceptance: 'founder-judgment',
};

export interface AcceptedEvidence {
  readonly name: string;
  readonly digest: string;
  readonly route: string;
  readonly viewport: string;
}

export interface FounderVisualAcceptance {
  /** The package whose surface was accepted. */
  readonly wp: string;
  /**
   * The SHA the Founder actually looked at. Immutable identity of the
   * acceptance. Never rewritten when canonical Product advances.
   */
  readonly visualImplementationSha: string;
  /**
   * Canonical Product at the moment of recording — context only. It carries NO
   * acceptance of its own unless it equals visualImplementationSha.
   */
  readonly canonicalProductShaAtRecording: string;
  readonly acceptedOn: string;
  /** What was accepted, in the Founder's own scope terms. */
  readonly scope: readonly string[];
  /** Explicitly accepted residuals, so they are not silently re-litigated. */
  readonly acceptedResiduals?: readonly string[];
  readonly evidence: readonly AcceptedEvidence[];
  /** Exact-SHA CI evidence supporting the Product identity. */
  readonly ci?: { readonly runNumber: number; readonly runId: string; readonly conclusion: 'success' };
  readonly recordRef: string;
}

const SHA40 = /^[0-9a-f]{40}$/;
const WP_ID = /^KORA-WP-\d{3}$/;

export interface RecordValidation {
  readonly valid: boolean;
  readonly problems: readonly string[];
}

/** Fail-closed validation of a proposed acceptance record. */
export function validateAcceptanceRecord(r: FounderVisualAcceptance): RecordValidation {
  const problems: string[] = [];
  if (!WP_ID.test(r.wp)) problems.push(`wp must look like KORA-WP-NNN, got "${r.wp}"`);
  if (!SHA40.test(r.visualImplementationSha)) problems.push('visualImplementationSha must be a full 40-character SHA');
  if (!SHA40.test(r.canonicalProductShaAtRecording)) problems.push('canonicalProductShaAtRecording must be a full 40-character SHA');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.acceptedOn)) problems.push('acceptedOn must be an absolute YYYY-MM-DD date');
  if (r.scope.length === 0) problems.push('an acceptance with no declared scope accepts nothing');
  if (r.evidence.length === 0) problems.push('an acceptance must cite the evidence it was granted against');
  if (!r.recordRef.trim()) problems.push('an acceptance must name the record that carries it');
  if (r.ci && r.ci.conclusion !== 'success') problems.push('cited CI evidence must be a successful run');
  return { valid: problems.length === 0, problems };
}

/**
 * THE question this module exists to answer correctly.
 *
 * A later SHA does not inherit an acceptance, even when it is a clean
 * descendant and even when nothing visual changed — whether nothing visual
 * changed is exactly the claim an acceptance is supposed to evidence, not
 * assume. `appliesToSha` is therefore identity, never ancestry.
 */
export function appliesToSha(record: FounderVisualAcceptance, sha: string): boolean {
  return SHA40.test(sha) && record.visualImplementationSha === sha;
}

export interface CoverageAnswer {
  readonly covered: boolean;
  readonly explanation: string;
}

export function visualAcceptanceCoverage(
  record: FounderVisualAcceptance,
  candidateSha: string,
): CoverageAnswer {
  if (appliesToSha(record, candidateSha)) {
    return { covered: true, explanation: `${record.wp} visual acceptance was granted on this exact SHA (${record.recordRef})` };
  }
  return {
    covered: false,
    explanation:
      `no Founder visual acceptance exists for ${candidateSha.slice(0, 12)}. ` +
      `${record.wp} was accepted at ${record.visualImplementationSha.slice(0, 12)}; a descendant does not inherit that event. ` +
      `If this SHA changes no visual surface, say so and cite the diff — do not infer acceptance.`,
  };
}

/** Never let the instrument mechanise a criterion the contract reserves for people. */
export function assertMechanisable(criterion: string): void {
  const cls = CRITERION_CLASS[criterion];
  if (!cls) throw new Error(`[KORA-WP-126] unknown acceptance criterion "${criterion}"`);
  if (cls !== 'mechanical') {
    throw new Error(
      `[KORA-WP-126] "${criterion}" is ${cls} — Registry 219 forbids giving it a fragile automated test.`,
    );
  }
}
