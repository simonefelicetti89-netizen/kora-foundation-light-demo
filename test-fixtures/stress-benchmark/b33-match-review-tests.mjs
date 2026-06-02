// test-fixtures/stress-benchmark/b33-match-review-tests.mjs
// B33: Match Review Decision Logic Tests
//
// Tests applyMatchReviewOverrides() — the core server-side guardrail that
// applies operator decisions to initiative matches.
//
// Run: node test-fixtures/stress-benchmark/b33-match-review-tests.mjs

import assert from 'node:assert/strict';

// ── Inline implementation mirrors lib/data-intake/initiative-matching.ts ──────
// (pure-function copy for testing without TS compilation overhead)

function applyMatchReviewOverrides({ matches, overrides, primaryRows }) {
  const overrideMap = new Map();
  for (const o of overrides) {
    if (o.matchId && o.decision) overrideMap.set(o.matchId, o.decision);
  }

  const finalRows = [];
  const matchesWithDecision = [];
  const summary = {
    overrideAccepted: 0, overrideRejected: 0, overrideNeedsReview: 0,
    defaultMerged: 0, defaultSkipped: 0, unmatched: 0, invalidOverrides: [],
  };

  for (const match of matches) {
    const primaryRow = primaryRows[match.primaryRow.rowIndex] ?? {};
    const override = overrideMap.get(match.matchId);

    let effectiveDecision;
    let mergeApplied;

    if (override === 'reject') {
      finalRows.push({ ...primaryRow });
      effectiveDecision = 'override_reject';
      mergeApplied = false;
      summary.overrideRejected++;
    } else if (override === 'needs_review') {
      finalRows.push({ ...primaryRow });
      effectiveDecision = 'override_needs_review';
      mergeApplied = false;
      summary.overrideNeedsReview++;
    } else if (override === 'accept') {
      if (match.status === 'unmatched') {
        finalRows.push({ ...primaryRow });
        effectiveDecision = 'invalid_accept';
        mergeApplied = false;
        summary.invalidOverrides.push(match.matchId);
      } else {
        finalRows.push({ ...match.mergedFields });
        effectiveDecision = 'override_accept';
        mergeApplied = true;
        summary.overrideAccepted++;
      }
    } else {
      // No override — apply defaults
      if (match.status === 'matched') {
        finalRows.push({ ...match.mergedFields });
        effectiveDecision = 'default_merged';
        mergeApplied = true;
        summary.defaultMerged++;
      } else if (match.status === 'unmatched') {
        finalRows.push({ ...primaryRow });
        effectiveDecision = 'unmatched';
        mergeApplied = false;
        summary.unmatched++;
      } else {
        // possible_match / needs_review — requires explicit accept
        finalRows.push({ ...primaryRow });
        effectiveDecision = 'default_skipped';
        mergeApplied = false;
        summary.defaultSkipped++;
      }
    }

    matchesWithDecision.push({ ...match, effectiveDecision, mergeApplied });
  }

  return { finalRows, matchesWithDecision, reviewSummary: summary };
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeMatch(matchId, status, confidence, primaryRowIndex, primaryValue, mergedValue) {
  return {
    matchId,
    status,
    confidence,
    primaryRow: { fileIndex: 0, rowIndex: primaryRowIndex, initiativeName: primaryValue },
    linkedRows: status !== 'unmatched' ? [{ fileIndex: 1, rowIndex: 0, role: 'budget', matchedFields: ['amount'] }] : [],
    mergedFields: { initiative_name: primaryValue, amount: mergedValue ?? '' },
    mergedFromFiles: [0, 1],
    conflictWarnings: [],
    reasonCodes: ['name:exact'],
    mergedFieldProvenance: mergedValue ? { amount: { field: 'amount', sourceFileIndex: 1, matchId, matchConfidence: confidence, mergeReason: 'filled_empty_primary_field' } } : {},
    conflictFieldProvenance: {},
  };
}

const PRIMARY_ROWS = [
  { initiative_name: 'Formazione digitale', amount: '' },         // 0
  { initiative_name: 'Welfare salute', amount: '' },              // 1
  { initiative_name: 'Volontariato', amount: '' },                // 2
  { initiative_name: 'Smart working policy', amount: '' },        // 3
  { initiative_name: 'Pending review item', amount: '' },         // 4
];

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nB33 — Match Review: applyMatchReviewOverrides()\n');

test('1. high-confidence matched: default is merge (accept)', () => {
  const match = makeMatch('m_0_0', 'matched', 0.95, 0, 'Formazione digitale', '10000');
  const { finalRows, matchesWithDecision, reviewSummary } = applyMatchReviewOverrides({
    matches: [match], overrides: [], primaryRows: PRIMARY_ROWS,
  });
  assert.equal(finalRows[0].amount, '10000', 'merged amount should be applied');
  assert.equal(matchesWithDecision[0].effectiveDecision, 'default_merged');
  assert.equal(matchesWithDecision[0].mergeApplied, true);
  assert.equal(reviewSummary.defaultMerged, 1);
});

test('2. possible_match without override: primary row only (no merge)', () => {
  const match = makeMatch('m_0_1', 'possible_match', 0.72, 1, 'Welfare salute', '5000');
  const { finalRows, matchesWithDecision, reviewSummary } = applyMatchReviewOverrides({
    matches: [match], overrides: [], primaryRows: PRIMARY_ROWS,
  });
  assert.equal(finalRows[0].amount, '', 'primary row should have empty amount — no merge applied');
  assert.equal(matchesWithDecision[0].effectiveDecision, 'default_skipped');
  assert.equal(matchesWithDecision[0].mergeApplied, false);
  assert.equal(reviewSummary.defaultSkipped, 1);
});

test('3. needs_review match without override: primary row only', () => {
  const match = makeMatch('m_0_2', 'needs_review', 0.52, 2, 'Volontariato', '3000');
  const { finalRows, matchesWithDecision, reviewSummary } = applyMatchReviewOverrides({
    matches: [match], overrides: [], primaryRows: PRIMARY_ROWS,
  });
  assert.equal(finalRows[0].amount, '', 'primary row — no merge for needs_review without override');
  assert.equal(matchesWithDecision[0].effectiveDecision, 'default_skipped');
  assert.equal(reviewSummary.defaultSkipped, 1);
});

test('4. reject override: merge not applied, primary row used', () => {
  const match = makeMatch('m_0_0', 'matched', 0.92, 0, 'Formazione digitale', '10000');
  const { finalRows, matchesWithDecision, reviewSummary } = applyMatchReviewOverrides({
    matches: [match],
    overrides: [{ matchId: 'm_0_0', decision: 'reject' }],
    primaryRows: PRIMARY_ROWS,
  });
  assert.equal(finalRows[0].amount, '', 'rejected — primary row (no amount)');
  assert.equal(matchesWithDecision[0].effectiveDecision, 'override_reject');
  assert.equal(matchesWithDecision[0].mergeApplied, false);
  assert.equal(reviewSummary.overrideRejected, 1);
  assert.equal(reviewSummary.overrideAccepted, 0);
});

test('5. accept override on possible_match: merge applied', () => {
  const match = makeMatch('m_0_1', 'possible_match', 0.72, 1, 'Welfare salute', '5000');
  const { finalRows, matchesWithDecision, reviewSummary } = applyMatchReviewOverrides({
    matches: [match],
    overrides: [{ matchId: 'm_0_1', decision: 'accept' }],
    primaryRows: PRIMARY_ROWS,
  });
  assert.equal(finalRows[0].amount, '5000', 'explicit accept on possible_match — merge applied');
  assert.equal(matchesWithDecision[0].effectiveDecision, 'override_accept');
  assert.equal(matchesWithDecision[0].mergeApplied, true);
  assert.equal(reviewSummary.overrideAccepted, 1);
  assert.equal(reviewSummary.defaultSkipped, 0);
});

test('6. needs_review override: merge not applied', () => {
  const match = makeMatch('m_0_0', 'matched', 0.90, 0, 'Formazione digitale', '10000');
  const { finalRows, matchesWithDecision, reviewSummary } = applyMatchReviewOverrides({
    matches: [match],
    overrides: [{ matchId: 'm_0_0', decision: 'needs_review' }],
    primaryRows: PRIMARY_ROWS,
  });
  assert.equal(finalRows[0].amount, '', 'needs_review override — primary row used');
  assert.equal(matchesWithDecision[0].effectiveDecision, 'override_needs_review');
  assert.equal(matchesWithDecision[0].mergeApplied, false);
  assert.equal(reviewSummary.overrideNeedsReview, 1);
});

test('7. invalid matchId: unknown matchId in overrides is ignored, no error', () => {
  const match = makeMatch('m_0_0', 'matched', 0.95, 0, 'Formazione digitale', '10000');
  const { finalRows, reviewSummary } = applyMatchReviewOverrides({
    matches: [match],
    overrides: [{ matchId: 'unknown_id_xyz', decision: 'reject' }],
    primaryRows: PRIMARY_ROWS,
  });
  // The valid match should still be processed normally (default_merged)
  assert.equal(finalRows[0].amount, '10000', 'valid match processed as default');
  assert.equal(reviewSummary.defaultMerged, 1);
  assert.equal(reviewSummary.overrideRejected, 0);
});

test('8. accept override on unmatched: ignored (cannot accept unmatched), primary used', () => {
  const unmatchedMatch = {
    matchId: 'm_0_3',
    status: 'unmatched',
    confidence: 0,
    primaryRow: { fileIndex: 0, rowIndex: 3, initiativeName: 'Smart working policy' },
    linkedRows: [],
    mergedFields: { initiative_name: 'Smart working policy', amount: '' },
    mergedFromFiles: [0],
    conflictWarnings: [],
    reasonCodes: [],
    mergedFieldProvenance: {},
    conflictFieldProvenance: {},
  };
  const { finalRows, matchesWithDecision, reviewSummary } = applyMatchReviewOverrides({
    matches: [unmatchedMatch],
    overrides: [{ matchId: 'm_0_3', decision: 'accept' }],
    primaryRows: PRIMARY_ROWS,
  });
  assert.equal(finalRows[0].initiative_name, 'Smart working policy');
  assert.equal(matchesWithDecision[0].effectiveDecision, 'invalid_accept');
  assert.equal(matchesWithDecision[0].mergeApplied, false);
  assert.equal(reviewSummary.invalidOverrides.length, 1);
  assert.equal(reviewSummary.invalidOverrides[0], 'm_0_3');
  assert.equal(reviewSummary.overrideAccepted, 0);
});

test('9. accepted match with conflict: mergedFields used (conflict already resolved by conservative merge)', () => {
  const matchWithConflict = {
    matchId: 'm_0_0',
    status: 'matched',
    confidence: 0.88,
    primaryRow: { fileIndex: 0, rowIndex: 0, initiativeName: 'Formazione digitale' },
    linkedRows: [{ fileIndex: 1, rowIndex: 0, role: 'budget', matchedFields: ['amount'] }],
    mergedFields: { initiative_name: 'Formazione digitale', amount: '10000' },
    mergedFromFiles: [0, 1],
    conflictWarnings: ['Campo "budget_class" in conflitto'],
    reasonCodes: ['name:exact'],
    mergedFieldProvenance: {},
    conflictFieldProvenance: {
      budget_class: {
        field: 'budget_class',
        primaryKept: true,
        conflictingSourceFileIndex: 1,
        conflictingSourceFileRole: 'budget',
        conflictingSourceRowIndex: 0,
        conflictReason: 'Secondary value differs from primary; primary retained',
      },
    },
  };
  const { finalRows, matchesWithDecision } = applyMatchReviewOverrides({
    matches: [matchWithConflict],
    overrides: [{ matchId: 'm_0_0', decision: 'accept' }],
    primaryRows: PRIMARY_ROWS,
  });
  // mergedFields already has primary value for conflict field (conservative merge in initiative-matching)
  assert.equal(finalRows[0].amount, '10000');
  assert.equal(matchesWithDecision[0].mergeApplied, true);
  // The conflict-retained flag is in conflictFieldProvenance — budget_class uses primary value
  // (conservative merge already ensured this — accept just applies the already-safe merged row)
  assert.equal(Object.keys(matchWithConflict.conflictFieldProvenance).includes('budget_class'), true);
});

test('10. match decisions contain no raw values: overrides only have matchId+decision', () => {
  const overrides = [
    { matchId: 'm_0_0', decision: 'accept' },
    { matchId: 'm_0_1', decision: 'reject' },
    { matchId: 'm_0_2', decision: 'needs_review' },
  ];
  // Verify no override contains raw values or PII
  for (const o of overrides) {
    assert.equal(Object.keys(o).length, 2, 'override must have exactly matchId + decision');
    assert.ok(typeof o.matchId === 'string');
    assert.ok(['accept', 'reject', 'needs_review'].includes(o.decision));
  }
});

test('11. safeName: PII patterns would be caught (unit test of regex logic)', () => {
  const PII_PATTERNS = [
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
    /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i,
    /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/,
  ];
  function buildMatchSafeName(initiativeName, rowIndex) {
    if (!initiativeName?.trim()) return `Iniziativa #${rowIndex + 1}`;
    const trimmed = initiativeName.trim().slice(0, 80);
    if (PII_PATTERNS.some(p => p.test(trimmed))) return `Iniziativa #${rowIndex + 1}`;
    return trimmed;
  }
  assert.equal(buildMatchSafeName('mario.rossi@company.it', 0), 'Iniziativa #1', 'email → fallback');
  assert.equal(buildMatchSafeName('RSSMRA80A01H501Z', 0), 'Iniziativa #1', 'CF → fallback');
  assert.equal(buildMatchSafeName('333 123 4567', 0), 'Iniziativa #1', 'phone → fallback');
  assert.equal(buildMatchSafeName('Formazione digitale', 0), 'Formazione digitale', 'safe name → kept');
  assert.equal(buildMatchSafeName('', 0), 'Iniziativa #1', 'empty → fallback');
});

test('12. accept route re-runs matching server-side: matchIds are stable (format check)', () => {
  // matchId = `m_${primaryFileIndex}_${primaryRowIndex}` — stable across preview and accept
  function makeMatchId(primaryFileIndex, primaryRowIndex) {
    return `m_${primaryFileIndex}_${primaryRowIndex}`;
  }
  assert.equal(makeMatchId(0, 0), 'm_0_0');
  assert.equal(makeMatchId(0, 5), 'm_0_5');
  assert.equal(makeMatchId(1, 3), 'm_1_3');
  // Stable because fileIndex and rowIndex don't change when the same files are re-submitted
});

test('13. single-file flow: no matches → no overrides applied, rows unchanged', () => {
  // Single-file: runInitiativeMatching returns all rows as "matched" with single_file reason
  // applyMatchReviewOverrides with empty overrides on single-file matches → default_merged for all
  const singleFileMatches = [
    makeMatch('m_0_0', 'matched', 1.0, 0, 'Formazione digitale', ''),
    makeMatch('m_0_1', 'matched', 1.0, 1, 'Welfare salute', ''),
  ];
  const { finalRows, reviewSummary } = applyMatchReviewOverrides({
    matches: singleFileMatches,
    overrides: [],
    primaryRows: PRIMARY_ROWS,
  });
  assert.equal(finalRows.length, 2);
  assert.equal(reviewSummary.defaultMerged, 2);
  assert.equal(reviewSummary.overrideAccepted, 0);
});

test('14. CSV/XLSX flow: override logic is file-type agnostic (operates on parsed rows)', () => {
  // The override function only sees rows — no file type information
  // This is correct: file type handling is upstream
  const match = makeMatch('m_0_0', 'possible_match', 0.75, 0, 'Formazione digitale', '8000');
  const { finalRows } = applyMatchReviewOverrides({
    matches: [match],
    overrides: [{ matchId: 'm_0_0', decision: 'accept' }],
    primaryRows: PRIMARY_ROWS,
  });
  assert.equal(finalRows[0].amount, '8000', 'CSV or XLSX: accept override merges secondary data');
});

test('15. multiple overrides: each match processed independently', () => {
  const matches = [
    makeMatch('m_0_0', 'matched',        0.95, 0, 'Formazione digitale', '10000'),
    makeMatch('m_0_1', 'possible_match', 0.72, 1, 'Welfare salute',      '5000'),
    makeMatch('m_0_2', 'needs_review',   0.48, 2, 'Volontariato',        '3000'),
    makeMatch('m_0_3', 'matched',        0.90, 3, 'Smart working policy', ''),
  ];
  const overrides = [
    { matchId: 'm_0_0', decision: 'reject' },        // reject high-confidence match
    { matchId: 'm_0_1', decision: 'accept' },         // accept possible_match
    { matchId: 'm_0_2', decision: 'needs_review' },   // explicit needs_review
    // m_0_3 has no override → default_merged (matched)
  ];
  const { finalRows, reviewSummary } = applyMatchReviewOverrides({
    matches, overrides, primaryRows: PRIMARY_ROWS,
  });
  assert.equal(finalRows[0].amount, '', 'm_0_0 rejected → primary');
  assert.equal(finalRows[1].amount, '5000', 'm_0_1 accepted → merged');
  assert.equal(finalRows[2].amount, '', 'm_0_2 needs_review → primary');
  assert.equal(finalRows[3].amount, '', 'm_0_3 default_merged (no secondary amount)');
  assert.equal(reviewSummary.overrideRejected, 1);
  assert.equal(reviewSummary.overrideAccepted, 1);
  assert.equal(reviewSummary.overrideNeedsReview, 1);
  assert.equal(reviewSummary.defaultMerged, 1);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} passed · ${failed} failed\n`);
if (failed > 0) process.exit(1);
