// lib/px-acceptance/baseline-store.ts
// KORA-WP-126 — baseline storage and the regression-comparison process.
//
// Registry 219's WP126 Acceptance requires "baseline storage and a documented
// regression-comparison process", and states plainly that **pixel-perfect
// automated diffing is explicitly NOT required** — a brittle pixel gate would
// recreate the mechanical-ratchet failure mode the registry already discloses.
//
// So comparison is by content DIGEST, not by per-pixel tolerance. A digest
// answers the only question a baseline has to answer mechanically — "is this
// byte-for-byte the evidence that was accepted?" — and leaves the judgment of
// whether a change is acceptable where the contract puts it: with review and
// with the Founder (`131` is the gate; this is only the mechanism).

export type ComparisonVerdict =
  | 'match'             // digest equals the accepted baseline
  | 'changed'           // baseline exists and differs — REVIEW REQUIRED, never auto-blessed
  | 'missing-baseline'  // nothing accepted yet — not a pass and not a failure
  | 'invalid-capture';  // the capture itself is not admissible evidence

export interface BaselineRecord {
  readonly name: string;
  readonly digest: string;
  /** Product SHA the baseline was accepted at. */
  readonly acceptedAtSha: string;
  readonly acceptedOn: string;
  /** Report or record that carries the acceptance. */
  readonly acceptanceRef: string;
}

export interface CaptureResult {
  readonly name: string;
  readonly digest: string | null;
  /** False when the capture failed its own prerequisites — see evidence-protocol. */
  readonly admissible: boolean;
  readonly problems?: readonly string[];
}

export interface ComparisonResult {
  readonly name: string;
  readonly verdict: ComparisonVerdict;
  readonly baselineDigest: string | null;
  readonly captureDigest: string | null;
  readonly detail: string;
}

/**
 * The comparison. Note the deliberate asymmetry: 'changed' and
 * 'missing-baseline' are distinct verdicts and neither is a pass. A run can
 * never turn either into an acceptance — only acceptBaseline can, and it
 * requires an explicit intent token (below).
 */
export function compareToBaseline(
  capture: CaptureResult,
  baseline: BaselineRecord | null,
): ComparisonResult {
  if (!capture.admissible || !capture.digest) {
    return {
      name: capture.name, verdict: 'invalid-capture',
      baselineDigest: baseline?.digest ?? null, captureDigest: capture.digest,
      detail: `capture is not admissible evidence${capture.problems?.length ? `: ${capture.problems.join('; ')}` : ''}`,
    };
  }
  if (!baseline) {
    return {
      name: capture.name, verdict: 'missing-baseline',
      baselineDigest: null, captureDigest: capture.digest,
      detail: 'no accepted baseline exists for this evidence name — acceptance is required before this can be a regression check',
    };
  }
  if (baseline.digest === capture.digest) {
    return {
      name: capture.name, verdict: 'match',
      baselineDigest: baseline.digest, captureDigest: capture.digest,
      detail: `reproduces the baseline accepted at ${baseline.acceptedAtSha} (${baseline.acceptanceRef})`,
    };
  }
  return {
    name: capture.name, verdict: 'changed',
    baselineDigest: baseline.digest, captureDigest: capture.digest,
    detail: `differs from the baseline accepted at ${baseline.acceptedAtSha} — review required; this is NOT automatically a regression and NOT automatically an improvement`,
  };
}

/** A verification run passes only on 'match'. Nothing else is a pass. */
export function isVerificationPass(r: ComparisonResult): boolean {
  return r.verdict === 'match';
}

/**
 * The explicit intent token required to move a baseline. Deliberately not a
 * boolean argument: a stray `true` at a call site must not be able to bless a
 * new appearance, and a normal verification run has no reason to construct this.
 */
export interface BaselineAcceptanceIntent {
  readonly intent: 'accept-new-baseline';
  /** Who authorised it — an acceptance is an event with an owner. */
  readonly authority: 'founder';
  readonly acceptanceRef: string;
  readonly productSha: string;
}

export interface AcceptOutcome {
  readonly accepted: boolean;
  readonly record?: BaselineRecord;
  readonly refusal?: string;
}

const SHA40 = /^[0-9a-f]{40}$/;

/**
 * The ONLY path by which a baseline changes. It refuses an inadmissible
 * capture, refuses a missing digest, and refuses to overwrite an existing
 * baseline unless the intent explicitly names the acceptance that authorises it.
 */
export function acceptBaseline(
  capture: CaptureResult,
  existing: BaselineRecord | null,
  intent: BaselineAcceptanceIntent,
  acceptedOn: string,
): AcceptOutcome {
  if (intent.intent !== 'accept-new-baseline' || intent.authority !== 'founder') {
    return { accepted: false, refusal: 'baseline acceptance requires an explicit Founder acceptance intent' };
  }
  if (!capture.admissible || !capture.digest) {
    return { accepted: false, refusal: 'refusing to accept an inadmissible capture as a baseline' };
  }
  if (!SHA40.test(intent.productSha)) {
    return { accepted: false, refusal: `acceptance must name a full 40-character Product SHA, got "${intent.productSha}"` };
  }
  if (!intent.acceptanceRef.trim()) {
    return { accepted: false, refusal: 'acceptance must reference the record that carries it' };
  }
  if (existing && existing.digest === capture.digest) {
    return { accepted: false, refusal: 'capture already matches the accepted baseline — nothing to accept' };
  }
  return {
    accepted: true,
    record: {
      name: capture.name, digest: capture.digest,
      acceptedAtSha: intent.productSha, acceptedOn, acceptanceRef: intent.acceptanceRef,
    },
  };
}

/**
 * Evidence-name collision guard. Two different descriptors that produce one
 * name would let unrelated evidence overwrite each other silently, so a store
 * is rejected outright if it contains a duplicate name.
 */
export function assertNoNameCollision(records: readonly { name: string }[]): void {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const r of records) {
    if (seen.has(r.name)) dupes.push(r.name);
    seen.add(r.name);
  }
  if (dupes.length) {
    throw new Error(`[KORA-WP-126] evidence name collision — unrelated evidence would overwrite: ${[...new Set(dupes)].join(', ')}`);
  }
}
