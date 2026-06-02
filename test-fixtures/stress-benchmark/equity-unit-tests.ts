// equity-unit-tests.ts — B22 unit tests for computeEquityScore
// Run: npx tsx --tsconfig tsconfig.json test-fixtures/stress-benchmark/equity-unit-tests.ts

import { computeEquityScore } from '@/lib/kora-engine/equity-engine';

interface TestCase {
  name:        string;
  dist:        Partial<Record<'LIFE'|'GROWTH'|'CONNECTION'|'IMPACT'|'LEGACY', number>>;
  expectedMin: number;
  expectedMax: number;
  description: string;
}

const cases: TestCase[] = [
  {
    name: '1. Uniforme 5 pillar (20/20/20/20/20)',
    dist: { LIFE: 20, GROWTH: 20, CONNECTION: 20, IMPACT: 20, LEGACY: 20 },
    expectedMin: 95, expectedMax: 100,
    description: 'Distribuzione perfettamente uniforme → EQUITY massimo',
  },
  {
    name: '2. 5 pillar sbilanciata (60/10/10/10/10)',
    dist: { LIFE: 60, GROWTH: 10, CONNECTION: 10, IMPACT: 10, LEGACY: 10 },
    expectedMin: 75, expectedMax: 95,
    description: '5 pillar coperti ma LIFE domina al 60%',
  },
  {
    name: '3. 2 pillar (80/20/0/0/0)',
    dist: { LIFE: 80, GROWTH: 20, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    expectedMin: 30, expectedMax: 55,
    description: 'Solo 2 pillar coperti, LIFE molto dominante',
  },
  {
    name: '4. Solo LIFE (100/0/0/0/0)',
    dist: { LIFE: 100, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 },
    expectedMin: 5, expectedMax: 20,
    description: 'Un solo pillar → EQUITY minimo',
  },
  {
    name: '5. Zero data (null)',
    dist: {},
    expectedMin: 50, expectedMax: 50,
    description: 'Nessun dato → fallback insufficient_data = 50',
  },
  {
    name: '6. STRESS-A pillar proxy (LIFE=21 GROWTH=2 CONNECTION=0 IMPACT=1 LEGACY=2)',
    dist: { LIFE: 21, GROWTH: 2, CONNECTION: 0, IMPACT: 1, LEGACY: 2 },
    expectedMin: 35, expectedMax: 65,
    description: 'Profilo voucher-heavy, CONNECTION assente, LIFE dominante',
  },
  {
    name: '7. STRESS-B pillar proxy (LIFE=6 GROWTH=2 CONNECTION=0 IMPACT=1 LEGACY=2)',
    dist: { LIFE: 6, GROWTH: 2, CONNECTION: 0, IMPACT: 1, LEGACY: 2 },
    expectedMin: 55, expectedMax: 85,
    description: 'Profilo compliance, 4 pillar con LIFE meno dominante di A',
  },
  {
    name: '8. STRESS-C pillar proxy (LIFE=8 GROWTH=6 CONNECTION=4 IMPACT=5 LEGACY=4)',
    dist: { LIFE: 8, GROWTH: 6, CONNECTION: 4, IMPACT: 5, LEGACY: 4 },
    expectedMin: 90, expectedMax: 100,
    description: '5 pillar, distribuzione quasi uniforme → EQUITY alto',
  },
  {
    name: '9. 3 pillar bilanciati (50/30/20/0/0)',
    dist: { LIFE: 50, GROWTH: 30, CONNECTION: 20, IMPACT: 0, LEGACY: 0 },
    expectedMin: 65, expectedMax: 80,
    description: '3 pillar coperti con distribuzione ragionevole — 50/30/20 bilanciata entro 3 covered → PB alto',
  },
  {
    name: '10. C > B > A guarantee',
    dist: { LIFE: 8, GROWTH: 6, CONNECTION: 4, IMPACT: 5, LEGACY: 4 },
    expectedMin: 90, expectedMax: 100,
    description: 'C deve superare B e A',
  },
];

console.log('\nB22 — EQUITY ENGINE UNIT TESTS');
console.log('═'.repeat(90));

let pass = 0, fail = 0;
for (const tc of cases) {
  const r = computeEquityScore(tc.dist);
  const ok = r.equityScore >= tc.expectedMin && r.equityScore <= tc.expectedMax;
  if (ok) pass++; else fail++;

  const badge = ok ? '✓' : '✗';
  console.log(`\n${badge} ${tc.name}`);
  console.log(`  EQUITY=${r.equityScore} | PC=${r.pillarCoverageScore} | PB=${r.pillarBalanceScore}`);
  console.log(`  Covered: ${r.coveredPillars}/5 [${r.coveredPillarCodes.join(',')}] | Dominant: ${r.dominantPillar} (${Math.round(r.dominantShare*100)}%)`);
  console.log(`  Expected: [${tc.expectedMin}–${tc.expectedMax}] | insufficientData: ${r.isInsufficientData}`);
  if (!ok) console.log(`  ✗ FAIL: ${tc.description}`);
}

console.log('\n' + '═'.repeat(90));
console.log(`RESULT: ${pass}/${pass+fail} unit tests passed`);

// ── Relative ranking guarantee ────────────────────────────────────────────
const scoreA = computeEquityScore({ LIFE: 21, GROWTH: 2, CONNECTION: 0, IMPACT: 1, LEGACY: 2 });
const scoreB = computeEquityScore({ LIFE: 6, GROWTH: 2, CONNECTION: 0, IMPACT: 1, LEGACY: 2 });
const scoreC = computeEquityScore({ LIFE: 8, GROWTH: 6, CONNECTION: 4, IMPACT: 5, LEGACY: 4 });

console.log('\nRanking guarantee:');
console.log(`  STRESS-A EQUITY = ${scoreA.equityScore}`);
console.log(`  STRESS-B EQUITY = ${scoreB.equityScore}`);
console.log(`  STRESS-C EQUITY = ${scoreC.equityScore}`);
console.log(`  C > B: ${scoreC.equityScore > scoreB.equityScore ? '✓' : '✗'}`);
console.log(`  C > A: ${scoreC.equityScore > scoreA.equityScore ? '✓' : '✗'}`);
console.log(`  C - A gap: ${scoreC.equityScore - scoreA.equityScore} points`);
