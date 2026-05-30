// app/api/test/privacy-threshold/route.ts
// DEV/TEST ONLY — remove or isolate before production.
// Uses service_role server-side. Never expose in production.
// SERVER-SIDE TEST ROUTE — validates N≥10 enforcement in lib/privacy/group-threshold.ts.
//
// Protection: same secret header as other test routes.
// Returns 404 in production.
//
// Runs 5 deterministic test cases against pure functions — no DB writes.
// Each case reports PASS / FAIL with actual vs expected values.

import { NextRequest, NextResponse } from 'next/server';
import {
  suppressSmallGroups,
  suppressNestedGroupMap,
  validateNoSmallGroups,
  SUPPRESSED_BUCKET_KEY,
  DEFAULT_MIN_GROUP_SIZE,
} from '@/lib/privacy/group-threshold';

interface CaseResult {
  name: string;
  description: string;
  pass: boolean;
  assertions: Array<{ check: string; expected: unknown; actual: unknown; pass: boolean }>;
}

function assert(check: string, expected: unknown, actual: unknown): CaseResult['assertions'][number] {
  return { check, expected, actual, pass: JSON.stringify(actual) === JSON.stringify(expected) };
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const clientSecret = request.headers.get('x-kora-test-secret');
  if (!clientSecret || clientSecret !== process.env.KORA_TEST_SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cases: CaseResult[] = [];

  // ── Case 1: All groups ≥ 10 — pass unchanged ─────────────────────────────────

  {
    const input = { 'dept-tech': 20, 'dept-sales': 15, 'dept-ops': 15 };
    const result = suppressSmallGroups(input, DEFAULT_MIN_GROUP_SIZE);
    const validation = validateNoSmallGroups(input, DEFAULT_MIN_GROUP_SIZE);

    const assertions = [
      assert('allSafe', true, result.allSafe),
      assert('hasSuppressedBucket', false, result.hasSuppressedBucket),
      assert('outputGroupCount', 3, result.outputGroupCount),
      assert('safe[dept-tech]', 20, result.safe['dept-tech']),
      assert('safe[dept-sales]', 15, result.safe['dept-sales']),
      assert('safe[dept-ops]', 15, result.safe['dept-ops']),
      assert('_suppressed absent', undefined, result.safe[SUPPRESSED_BUCKET_KEY]),
      assert('validation.valid', true, validation.valid),
      assert('violations.length', 0, validation.violations.length),
    ];

    cases.push({ name: 'all_safe', description: 'All groups ≥ 10 — pass unchanged', pass: assertions.every(a => a.pass), assertions });
  }

  // ── Case 2: One group < 10 — suppressed; bucket < 10 → no _suppressed key ───

  {
    // dept-ops: 5 < 10. suppressedTotal = 5 < 10 → no _suppressed bucket.
    const input = { 'dept-tech': 20, 'dept-sales': 15, 'dept-ops': 5 };
    const result = suppressSmallGroups(input, DEFAULT_MIN_GROUP_SIZE);
    const validation = validateNoSmallGroups(input, DEFAULT_MIN_GROUP_SIZE);

    const assertions = [
      assert('allSafe', false, result.allSafe),
      assert('hasSuppressedBucket', false, result.hasSuppressedBucket),
      assert('suppressedGroupCount', 1, result.suppressedGroupCount),
      assert('suppressedTotal', 5, result.suppressedTotal),
      assert('_suppressed absent', undefined, result.safe[SUPPRESSED_BUCKET_KEY]),
      assert('safe[dept-tech]', 20, result.safe['dept-tech']),
      assert('safe[dept-sales]', 15, result.safe['dept-sales']),
      assert('dept-ops absent from safe', undefined, result.safe['dept-ops']),
      assert('validation.valid', false, validation.valid),
      assert('violations[0].group', 'dept-ops', validation.violations[0]?.group),
      assert('violations[0].count', 5, validation.violations[0]?.count),
    ];

    cases.push({ name: 'one_small_bucket_unsafe', description: 'One group < 10 — suppressed; bucket < 10 so _suppressed omitted', pass: assertions.every(a => a.pass), assertions });
  }

  // ── Case 3: Multiple small groups; combined bucket ≥ 10 → safe aggregation ──

  {
    // dept-a: 6, dept-b: 7 → suppressedTotal = 13 ≥ 10 → _suppressed: 13
    const input = { 'dept-tech': 20, 'dept-a': 6, 'dept-b': 7 };
    const result = suppressSmallGroups(input, DEFAULT_MIN_GROUP_SIZE);

    const assertions = [
      assert('allSafe', false, result.allSafe),
      assert('hasSuppressedBucket', true, result.hasSuppressedBucket),
      assert('suppressedGroupCount', 2, result.suppressedGroupCount),
      assert('suppressedTotal', 13, result.suppressedTotal),
      assert('safe[_suppressed]', 13, result.safe[SUPPRESSED_BUCKET_KEY]),
      assert('safe[dept-tech]', 20, result.safe['dept-tech']),
      assert('dept-a absent from safe', undefined, result.safe['dept-a']),
      assert('dept-b absent from safe', undefined, result.safe['dept-b']),
      assert('outputGroupCount', 2, result.outputGroupCount), // dept-tech + _suppressed
    ];

    cases.push({ name: 'multiple_small_bucket_safe', description: 'Multiple small groups; combined bucket ≥ 10 → _suppressed created', pass: assertions.every(a => a.pass), assertions });
  }

  // ── Case 4: Multiple small groups; combined bucket < 10 → fully suppressed ──

  {
    // dept-a: 3, dept-b: 4 → suppressedTotal = 7 < 10 → no bucket at all
    const input = { 'dept-tech': 20, 'dept-a': 3, 'dept-b': 4 };
    const result = suppressSmallGroups(input, DEFAULT_MIN_GROUP_SIZE);

    const assertions = [
      assert('allSafe', false, result.allSafe),
      assert('hasSuppressedBucket', false, result.hasSuppressedBucket),
      assert('suppressedGroupCount', 2, result.suppressedGroupCount),
      assert('suppressedTotal', 7, result.suppressedTotal),
      assert('_suppressed absent', undefined, result.safe[SUPPRESSED_BUCKET_KEY]),
      assert('dept-a absent from safe', undefined, result.safe['dept-a']),
      assert('dept-b absent from safe', undefined, result.safe['dept-b']),
      assert('only safe group is dept-tech', 1, Object.keys(result.safe).length),
    ];

    cases.push({ name: 'multiple_small_bucket_unsafe', description: 'Multiple small groups; combined bucket < 10 → fully suppressed, no bucket', pass: assertions.every(a => a.pass), assertions });
  }

  // ── Case 5: Nested map (segment_breakdown) — each dimension handled ──────────

  {
    // departments: dept-ops: 8 < 10 → suppressed; bucket=8 < 10 → no bucket
    // contract_types: all ≥ 10 → all safe
    const inputNested = {
      departments:    { 'dept-tech': 20, 'dept-sales': 15, 'dept-ops': 8 },
      contract_types: { full_time: 40, part_time: 10 },
    };
    const result = suppressNestedGroupMap(inputNested, DEFAULT_MIN_GROUP_SIZE);

    const deptResult = result.suppressionByDimension['departments'];
    const ctResult   = result.suppressionByDimension['contract_types'];

    const assertions = [
      assert('anyUnsafe', true, result.anyUnsafe),
      assert('departments.allSafe', false, deptResult?.allSafe),
      assert('departments.suppressedGroupCount', 1, deptResult?.suppressedGroupCount),
      assert('departments.suppressedTotal', 8, deptResult?.suppressedTotal),
      assert('departments._suppressed absent', undefined, result.safe['departments']?.[SUPPRESSED_BUCKET_KEY]),
      assert('departments.dept-ops absent', undefined, result.safe['departments']?.['dept-ops']),
      assert('departments.dept-tech present', 20, result.safe['departments']?.['dept-tech']),
      assert('contract_types.allSafe', true, ctResult?.allSafe),
      assert('contract_types.full_time', 40, result.safe['contract_types']?.['full_time']),
      assert('contract_types.part_time', 10, result.safe['contract_types']?.['part_time']),
    ];

    cases.push({ name: 'nested_map', description: 'Nested segment_breakdown: each dimension suppressed independently', pass: assertions.every(a => a.pass), assertions });
  }

  const totalPass = cases.filter(c => c.pass).length;
  const totalFail = cases.filter(c => !c.pass).length;
  const overallPass = totalFail === 0;

  return NextResponse.json({
    ok: overallPass,
    verdict: overallPass ? 'PASS' : 'FAIL',
    summary: { total: cases.length, pass: totalPass, fail: totalFail },
    min_group_size: DEFAULT_MIN_GROUP_SIZE,
    cases,
  }, { status: overallPass ? 200 : 422 });
}
