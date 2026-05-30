// lib/privacy/group-threshold.ts
// Pure N≥10 privacy enforcement for employer-visible aggregate segment maps.
//
// Constitutional rule (CLAUDE.md §13):
//   Employer roles must never see segment data for groups smaller than 10 workers.
//   safe_aggregation_threshold = 10 (doc 10 §Privacy Rules).
//
// Design:
//   - All functions are pure and side-effect-free — fully unit-testable.
//   - Small groups are suppressed, not silently zeroed.
//   - The _suppressed bucket is only created if the combined small-group total >= minGroupSize.
//     If even the bucket would reveal a small population, the bucket is omitted entirely.
//   - Original small-group names are never returned in any output.
//   - Applies to flat maps (department_activation) and nested maps (segment_breakdown).
//
// No migration 003 created:
//   DB-level JSONB CHECK constraints for per-value threshold inspection are fragile and
//   cannot express the suppression/bucketing logic needed here. App-level enforcement
//   (this module) is the correct layer. The DB schema already has privacy_threshold_applied
//   and minimum_group_size columns to document the intent. A DB trigger would duplicate
//   this logic without adding meaningful safety given service_role bypass semantics.

export const DEFAULT_MIN_GROUP_SIZE = 10;

// Key used for the safe aggregation bucket — never a real group name.
export const SUPPRESSED_BUCKET_KEY = '_suppressed';

// ── Flat map: suppressSmallGroups ─────────────────────────────────────────────
//
// Input:  { groupName: count, ... }
// Output: groups with count >= minGroupSize, plus optional _suppressed bucket.

export interface SuppressionResult {
  safe: Record<string, number>;
  suppressedTotal: number;
  suppressedGroupCount: number;
  // true only if the _suppressed bucket itself was >= minGroupSize and was included.
  hasSuppressedBucket: boolean;
  allSafe: boolean;
  inputGroupCount: number;
  outputGroupCount: number;
}

export function suppressSmallGroups(
  input: Record<string, number>,
  minGroupSize: number = DEFAULT_MIN_GROUP_SIZE,
): SuppressionResult {
  const safe: Record<string, number> = {};
  let suppressedTotal = 0;
  let suppressedGroupCount = 0;
  const inputGroupCount = Object.keys(input).length;

  for (const [key, count] of Object.entries(input)) {
    if (key === SUPPRESSED_BUCKET_KEY) continue;
    if (count >= minGroupSize) {
      safe[key] = count;
    } else {
      suppressedTotal += count;
      suppressedGroupCount++;
    }
  }

  const allSafe = suppressedGroupCount === 0;

  // Only expose the _suppressed bucket if the combined total is itself >= minGroupSize.
  // If the bucket would still reveal a population < minGroupSize, omit it entirely.
  let hasSuppressedBucket = false;
  if (!allSafe && suppressedTotal >= minGroupSize) {
    safe[SUPPRESSED_BUCKET_KEY] = suppressedTotal;
    hasSuppressedBucket = true;
  }

  return {
    safe,
    suppressedTotal,
    suppressedGroupCount,
    hasSuppressedBucket,
    allSafe,
    inputGroupCount,
    outputGroupCount: Object.keys(safe).length,
  };
}

// ── Flat map: validateNoSmallGroups ───────────────────────────────────────────
//
// Returns whether any group is below the threshold.
// violations includes the group name and count — use only server-side / in audit logs,
// never expose violation group names in employer-visible output.

export interface ValidationResult {
  valid: boolean;
  violations: Array<{ group: string; count: number }>;
}

export function validateNoSmallGroups(
  input: Record<string, number>,
  minGroupSize: number = DEFAULT_MIN_GROUP_SIZE,
): ValidationResult {
  const violations: Array<{ group: string; count: number }> = [];
  for (const [group, count] of Object.entries(input)) {
    if (group === SUPPRESSED_BUCKET_KEY) continue;
    if (count < minGroupSize) violations.push({ group, count });
  }
  return { valid: violations.length === 0, violations };
}

// ── Nested map: suppressNestedGroupMap ────────────────────────────────────────
//
// Handles workforce_baseline.segment_breakdown which is a map of dimensions:
//   { departments: { ... }, contract_types: { ... }, seniority: { ... }, ... }
//
// Each dimension is suppressed independently.

export interface NestedSuppressionResult {
  safe: Record<string, Record<string, number>>;
  suppressionByDimension: Record<string, SuppressionResult>;
  anyUnsafe: boolean;
}

export function suppressNestedGroupMap(
  input: Record<string, Record<string, number>>,
  minGroupSize: number = DEFAULT_MIN_GROUP_SIZE,
): NestedSuppressionResult {
  const safe: Record<string, Record<string, number>> = {};
  const suppressionByDimension: Record<string, SuppressionResult> = {};

  for (const [dimension, groups] of Object.entries(input)) {
    const result = suppressSmallGroups(groups, minGroupSize);
    safe[dimension] = result.safe;
    suppressionByDimension[dimension] = result;
  }

  const anyUnsafe = Object.values(suppressionByDimension).some(r => !r.allSafe);
  return { safe, suppressionByDimension, anyUnsafe };
}

// ── Audit summary — safe for logging (no suppressed names) ───────────────────

export interface SuppressionSummary {
  hadSuppression: boolean;
  suppressedGroupCount: number;
  suppressedTotal: number;
  hasSuppressedBucket: boolean;
  minGroupSize: number;
}

export function summarizeSuppression(
  result: SuppressionResult,
  minGroupSize: number = DEFAULT_MIN_GROUP_SIZE,
): SuppressionSummary {
  return {
    hadSuppression: !result.allSafe,
    suppressedGroupCount: result.suppressedGroupCount,
    suppressedTotal: result.suppressedTotal,
    hasSuppressedBucket: result.hasSuppressedBucket,
    minGroupSize,
  };
}
