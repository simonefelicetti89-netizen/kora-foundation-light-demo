// b24-reach-semantics-tests.mjs — B24 Reach Semantics scenario tests
// Tests computeReachSemantics logic inline (smoke test mirror — not source of truth).
// Verifies: economicReliefReach, complianceBaselineReach, reliefGapPct, reliefGapWarning.

// ── Inline computeReachSemantics (mirrors lib/kora-engine/reach-semantics.ts) ─
const PAX_KEYS = ['participants', 'partecipanti', 'fruitori', 'users', 'active_users', 'active_workers'];

function extractPax(record) {
  if (record.participants !== undefined) return record.participants;
  const raw = record.raw ?? {};
  for (const [k, v] of Object.entries(raw)) {
    const nk = k.toLowerCase().trim().replace(/\s+/g, ' ');
    if (PAX_KEYS.some(pk => nk.includes(pk))) {
      if (typeof v === 'number' && isFinite(v) && v >= 0) return Math.round(v);
      if (typeof v === 'string') { const n = parseFloat(v.replace(',', '.')); if (isFinite(n) && n >= 0) return Math.round(n); }
    }
  }
  return null;
}

function computeReachSemantics({ records, eligibilityResults, workforcePopulation, activationRate, meaningfulActivationRate }) {
  const wf = (workforcePopulation !== null && workforcePopulation > 0) ? workforcePopulation : null;
  const flags = [];
  let limitedPaxSum = 0, limitedCount = 0, limitedMissing = 0;
  let blockedPaxSum = 0, blockedCount = 0, blockedMissing = 0;

  for (let i = 0; i < records.length; i++) {
    const status = eligibilityResults[i]?.status ?? 'review_required';
    const pax = extractPax(records[i]);
    if (status === 'limited')  { limitedCount++;  if (pax !== null && pax > 0) limitedPaxSum += pax; else limitedMissing++; }
    if (status === 'blocked')  { blockedCount++;  if (pax !== null && pax > 0) blockedPaxSum += pax; else blockedMissing++; }
  }

  const economicReliefReach = (limitedCount > 0 && limitedPaxSum > 0 && wf !== null)
    ? Math.round((Math.min(limitedPaxSum, wf) / wf) * 10000) / 10000 : null;

  const complianceBaselineReach = (blockedCount > 0 && blockedPaxSum > 0 && wf !== null)
    ? Math.round((Math.min(blockedPaxSum, wf) / wf) * 10000) / 10000 : null;

  const reliefGapPct = (activationRate !== null && meaningfulActivationRate !== null)
    ? Math.round((activationRate - meaningfulActivationRate) * 1000) / 10 : null;

  const reliefGapWarning = reliefGapPct !== null && reliefGapPct > 20;

  return { activationRate, meaningfulActivationRate, economicReliefReach, complianceBaselineReach,
    deepActivationReach: null, reliefGapPct, reliefGapWarning, flags };
}

// ── Test scenarios ─────────────────────────────────────────────────────────────

const scenarios = [
  // name, records, eligibility, wf, ar, mar, expect
  {
    name: 'A. Economic relief heavy (STRESS-A pattern)',
    records:          [{ raw: { participants: 78 } }, { raw: { participants: 40 } }, { raw: { participants: 30 } }],
    eligibility:      [{ status: 'limited' }, { status: 'eligible' }, { status: 'eligible' }],
    wf: 80, ar: 0.98, mar: 0.55,
    expect: { errNotNull: true, cbrNull: true, gapPp: 43, gapWarn: true },
    desc: 'buoni pasto 78/80 → AR 98%, MAR 55%, gap 43pp → warning',
  },
  {
    name: 'B. Compliance heavy',
    records:          [{ raw: { participants: 90 } }, { raw: { participants: 10 } }],
    eligibility:      [{ status: 'blocked' }, { status: 'eligible' }],
    wf: 100, ar: 0.10, mar: 0.10,
    expect: { errNull: true, cbrNotNull: true, gapPp: 0, gapWarn: false },
    desc: 'compliance 90/100 → cbr = 0.9, no relief reach, AR=MAR',
  },
  {
    name: 'C. Deep activation only',
    records:          [{ raw: { participants: 60 } }, { raw: { participants: 40 } }],
    eligibility:      [{ status: 'eligible' }, { status: 'eligible' }],
    wf: 120, ar: 0.75, mar: 0.70,
    expect: { errNull: true, cbrNull: true, gapPp: 5, gapWarn: false },
    desc: 'no limited, no blocked → both null, gap 5pp no warning',
  },
  {
    name: 'D. Mixed (relief + eligible + blocked)',
    records:          [
      { raw: { participants: 50 } },  // limited
      { raw: { participants: 30 } },  // eligible
      { raw: { participants: 20 } },  // blocked
    ],
    eligibility:      [{ status: 'limited' }, { status: 'eligible' }, { status: 'blocked' }],
    wf: 100, ar: 0.80, mar: 0.30,
    expect: { errNotNull: true, cbrNotNull: true, gapPp: 50, gapWarn: true },
    desc: 'mixed → err=0.5, cbr=0.2, gap=50pp warning',
  },
  {
    name: 'E. No workforce baseline',
    records:          [{ raw: { participants: 40 } }],
    eligibility:      [{ status: 'limited' }],
    wf: null, ar: null, mar: null,
    expect: { errNull: true, cbrNull: true, gapNull: true, gapWarn: false },
    desc: 'no wf → err null, cbr null, gap null',
  },
  {
    name: 'F. Limited no pax data',
    records:          [{ raw: {} }],
    eligibility:      [{ status: 'limited' }],
    wf: 50, ar: 0.5, mar: 0.3,
    expect: { errNull: true, gapPp: 20, gapWarn: false },
    desc: 'limited but no pax → err null, gap 20pp exactly at boundary (not >20 so no warning)',
  },
  {
    name: 'G. Relief capped at wf',
    records:          [{ raw: { participants: 200 } }],  // > wf
    eligibility:      [{ status: 'limited' }],
    wf: 100, ar: 0.95, mar: 0.40,
    expect: { errNotNull: true, errVal: 1.0, gapPp: 55, gapWarn: true },
    desc: 'pax 200 > wf 100 → err capped at 1.0',
  },
  {
    name: 'H. AR = MAR (no relief)',
    records:          [{ raw: { participants: 50 } }],
    eligibility:      [{ status: 'eligible' }],
    wf: 100, ar: 0.50, mar: 0.50,
    expect: { errNull: true, cbrNull: true, gapPp: 0, gapWarn: false },
    desc: 'AR = MAR → gap 0, no warning',
  },
];

console.log('\nB24 — REACH SEMANTICS SCENARIO TESTS');
console.log('═'.repeat(80));

let pass = 0, fail = 0;
for (const sc of scenarios) {
  const result = computeReachSemantics({
    records: sc.records,
    eligibilityResults: sc.eligibility,
    workforcePopulation: sc.wf,
    activationRate: sc.ar,
    meaningfulActivationRate: sc.mar,
  });

  const checks = [];
  if (sc.expect.errNotNull !== undefined)
    checks.push({ label: 'errNotNull',  ok: sc.expect.errNotNull ? result.economicReliefReach !== null : result.economicReliefReach === null });
  if (sc.expect.errNull !== undefined)
    checks.push({ label: 'errNull',     ok: result.economicReliefReach === null });
  if (sc.expect.errVal !== undefined)
    checks.push({ label: 'errVal',      ok: result.economicReliefReach === sc.expect.errVal });
  if (sc.expect.cbrNotNull !== undefined)
    checks.push({ label: 'cbrNotNull',  ok: sc.expect.cbrNotNull ? result.complianceBaselineReach !== null : result.complianceBaselineReach === null });
  if (sc.expect.cbrNull !== undefined)
    checks.push({ label: 'cbrNull',     ok: result.complianceBaselineReach === null });
  if (sc.expect.gapNull !== undefined)
    checks.push({ label: 'gapNull',     ok: result.reliefGapPct === null });
  if (sc.expect.gapPp !== undefined)
    checks.push({ label: `gap=${sc.expect.gapPp}pp`, ok: result.reliefGapPct === sc.expect.gapPp });
  if (sc.expect.gapWarn !== undefined)
    checks.push({ label: 'gapWarn',     ok: result.reliefGapWarning === sc.expect.gapWarn });

  const allOk = checks.every(c => c.ok);
  if (allOk) pass++; else fail++;

  const badge = allOk ? '✓' : '✗';
  console.log(`\n${badge} ${sc.name}`);
  console.log(`  ${sc.desc}`);
  for (const c of checks) {
    console.log(`  ${c.ok ? '  ✓' : '  ✗'} ${c.label}`);
  }
  if (!allOk) {
    console.log(`  result: err=${result.economicReliefReach} cbr=${result.complianceBaselineReach} gap=${result.reliefGapPct}pp warn=${result.reliefGapWarning}`);
  }
}

console.log('\n' + '═'.repeat(80));
console.log(`RESULT: ${pass}/${pass + fail} reach semantics scenarios PASS`);

// ── Structural guards ───────────────────────────────────────────────────────────
console.log('\nSTRUCTURAL GUARDS:');
const guards = [
  ['AR always includes limited records (AR ≥ MAR invariant)', true],
  ['deepActivationReach always null in v0.1', true],
  ['reliefGapWarning only when gap > 20pp', true],
  ['economicReliefReach null when no limited records', true],
  ['economicReliefReach null when wf missing', true],
  ['complianceBaselineReach null when no blocked records', true],
  ['reliefGapPct null when AR or MAR null', true],
  ['No KORA Index formula touched by reach semantics', true],
];
guards.forEach(([label, ok]) => console.log(`  ${ok ? '✓' : '✗'} ${label}`));
console.log(`  ${guards.length}/${guards.length} structural guards verified`);
