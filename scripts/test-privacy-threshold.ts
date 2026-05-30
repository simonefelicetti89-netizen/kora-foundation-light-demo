/**
 * Unit tests for lib/privacy/group-threshold.ts
 * Run with: npx tsx scripts/test-privacy-threshold.ts
 *
 * Tests the N≥10 privacy enforcement invariant:
 *   employer-visible segment maps must not expose groups < 10 workers.
 */

import {
  suppressSmallGroups,
  suppressNestedGroupMap,
  validateNoSmallGroups,
  SUPPRESSED_BUCKET_KEY,
  DEFAULT_MIN_GROUP_SIZE,
} from '../lib/privacy/group-threshold';

// ── Minimal test runner ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function suite(name: string) {
  console.log(`\n${name}`);
}

function expect(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function eq<T>(a: T, b: T): boolean { return JSON.stringify(a) === JSON.stringify(b); }

// ── Suite 1: All groups ≥ 10 — pass unchanged ──────────────────────────────

suite('Suite 1 — all groups ≥ 10: pass unchanged');
{
  const input = { 'dept-tech': 20, 'dept-sales': 15, 'dept-ops': 10 };
  const r = suppressSmallGroups(input);
  expect('allSafe = true',          r.allSafe);
  expect('hasSuppressedBucket = false', !r.hasSuppressedBucket);
  expect('outputGroupCount = 3',    r.outputGroupCount === 3);
  expect('safe[dept-tech] = 20',    r.safe['dept-tech'] === 20);
  expect('safe[dept-sales] = 15',   r.safe['dept-sales'] === 15);
  expect('safe[dept-ops] = 10',     r.safe['dept-ops'] === 10);
  expect('no _suppressed key',      !(SUPPRESSED_BUCKET_KEY in r.safe));
  expect('suppressedGroupCount = 0', r.suppressedGroupCount === 0);

  const v = validateNoSmallGroups(input);
  expect('validateNoSmallGroups.valid = true', v.valid);
  expect('violations empty',        v.violations.length === 0);
}

// ── Suite 2: One group < 10, suppressed total < 10 — no bucket ─────────────

suite('Suite 2 — one group < 10, bucket would be < 10: full suppression');
{
  // dept-ops: 5 → suppressedTotal = 5 < 10 → no _suppressed bucket
  const input = { 'dept-tech': 20, 'dept-sales': 15, 'dept-ops': 5 };
  const r = suppressSmallGroups(input);
  expect('allSafe = false',         !r.allSafe);
  expect('hasSuppressedBucket = false', !r.hasSuppressedBucket);
  expect('suppressedGroupCount = 1', r.suppressedGroupCount === 1);
  expect('suppressedTotal = 5',     r.suppressedTotal === 5);
  expect('no _suppressed key',      !(SUPPRESSED_BUCKET_KEY in r.safe));
  expect('dept-ops absent',         !('dept-ops' in r.safe));
  expect('dept-tech present',       r.safe['dept-tech'] === 20);
  expect('outputGroupCount = 2',    r.outputGroupCount === 2);

  const v = validateNoSmallGroups(input);
  expect('validateNoSmallGroups.valid = false', !v.valid);
  expect('violation: dept-ops, count 5', v.violations[0]?.group === 'dept-ops' && v.violations[0]?.count === 5);
}

// ── Suite 3: Multiple groups < 10, combined bucket ≥ 10 — safe aggregation ─

suite('Suite 3 — multiple groups < 10, combined bucket ≥ 10: _suppressed created');
{
  // dept-a: 6, dept-b: 7 → suppressedTotal = 13 ≥ 10 → _suppressed: 13
  const input = { 'dept-tech': 20, 'dept-a': 6, 'dept-b': 7 };
  const r = suppressSmallGroups(input);
  expect('allSafe = false',         !r.allSafe);
  expect('hasSuppressedBucket = true', r.hasSuppressedBucket);
  expect('suppressedGroupCount = 2', r.suppressedGroupCount === 2);
  expect('suppressedTotal = 13',    r.suppressedTotal === 13);
  expect('_suppressed = 13',        r.safe[SUPPRESSED_BUCKET_KEY] === 13);
  expect('dept-a absent',           !('dept-a' in r.safe));
  expect('dept-b absent',           !('dept-b' in r.safe));
  expect('dept-tech present',       r.safe['dept-tech'] === 20);
  expect('outputGroupCount = 2',    r.outputGroupCount === 2);  // dept-tech + _suppressed
}

// ── Suite 4: Multiple groups < 10, combined bucket < 10 — full suppression ─

suite('Suite 4 — multiple groups < 10, combined bucket < 10: fully suppressed');
{
  // dept-a: 3, dept-b: 4 → suppressedTotal = 7 < 10 → no bucket
  const input = { 'dept-tech': 20, 'dept-a': 3, 'dept-b': 4 };
  const r = suppressSmallGroups(input);
  expect('allSafe = false',         !r.allSafe);
  expect('hasSuppressedBucket = false', !r.hasSuppressedBucket);
  expect('suppressedGroupCount = 2', r.suppressedGroupCount === 2);
  expect('suppressedTotal = 7',     r.suppressedTotal === 7);
  expect('no _suppressed key',      !(SUPPRESSED_BUCKET_KEY in r.safe));
  expect('dept-a absent',           !('dept-a' in r.safe));
  expect('dept-b absent',           !('dept-b' in r.safe));
  expect('only dept-tech remains',  Object.keys(r.safe).length === 1);
}

// ── Suite 5: Nested map — each dimension suppressed independently ───────────

suite('Suite 5 — nested map (segment_breakdown): independent per dimension');
{
  const input = {
    departments:    { 'dept-tech': 20, 'dept-sales': 15, 'dept-ops': 8 },  // ops: 8 < 10
    contract_types: { full_time: 40, part_time: 10 },                        // all safe
  };
  const r = suppressNestedGroupMap(input);
  expect('anyUnsafe = true',        r.anyUnsafe);

  const dept = r.suppressionByDimension['departments'];
  expect('departments.allSafe = false',        !dept?.allSafe);
  expect('departments.suppressedGroupCount = 1', dept?.suppressedGroupCount === 1);
  expect('departments.suppressedTotal = 8',    dept?.suppressedTotal === 8);
  expect('departments._suppressed absent',     !(SUPPRESSED_BUCKET_KEY in (r.safe['departments'] ?? {})));
  expect('departments.dept-ops absent',        !('dept-ops' in (r.safe['departments'] ?? {})));
  expect('departments.dept-tech present',      r.safe['departments']?.['dept-tech'] === 20);

  const ct = r.suppressionByDimension['contract_types'];
  expect('contract_types.allSafe = true',      ct?.allSafe);
  expect('contract_types.full_time = 40',      r.safe['contract_types']?.['full_time'] === 40);
  expect('contract_types.part_time = 10',      r.safe['contract_types']?.['part_time'] === 10);
}

// ── Suite 6: No original small-group names in employer-visible output ───────

suite('Suite 6 — original small-group names never appear in safe output');
{
  const input = { 'secret-small-dept': 3, 'another-small': 4, 'large-dept': 50 };
  const r = suppressSmallGroups(input);
  expect('secret-small-dept absent',  !('secret-small-dept' in r.safe));
  expect('another-small absent',      !('another-small' in r.safe));
  expect('large-dept present',        r.safe['large-dept'] === 50);
  // Even the bucket doesn't reveal names
  const outputKeys = Object.keys(r.safe);
  const hasOriginalName = outputKeys.some(k => k === 'secret-small-dept' || k === 'another-small');
  expect('no original small-group names in output', !hasOriginalName);
}

// ── Suite 7: Determinism — same input → same output ────────────────────────

suite('Suite 7 — deterministic: same input produces same output');
{
  const input = { 'dept-a': 20, 'dept-b': 5, 'dept-c': 15, 'dept-d': 3 };
  const r1 = suppressSmallGroups(input);
  const r2 = suppressSmallGroups(input);
  const r3 = suppressSmallGroups(input);
  expect('run 1 === run 2', eq(r1, r2));
  expect('run 2 === run 3', eq(r2, r3));
  expect('safe keys stable', eq(Object.keys(r1.safe).sort(), Object.keys(r2.safe).sort()));
}

// ── Suite 8: DEFAULT_MIN_GROUP_SIZE = 10 ────────────────────────────────────

suite('Suite 8 — DEFAULT_MIN_GROUP_SIZE is 10');
{
  expect('DEFAULT_MIN_GROUP_SIZE = 10', DEFAULT_MIN_GROUP_SIZE === 10);
  // Exactly at boundary
  const r = suppressSmallGroups({ 'exactly-10': 10, 'nine': 9 });
  expect('count=10 is safe',  r.safe['exactly-10'] === 10);
  expect('count=9 suppressed', !('nine' in r.safe));
}

// ── Final report ─────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\nFAIL — ${failed} assertion(s) failed`);
  process.exit(1);
} else {
  console.log('\nPASS — all assertions passed');
}
