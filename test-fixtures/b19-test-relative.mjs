// B19 scenario tests — pure logic trace (no imports, logic inlined for verification)
// This script manually traces the computeReadiness logic to verify scenario correctness.

function computeReadiness({ eventType, eligibility, evidenceLevel, budgetAmount, participants, sourceTier, reasonCodes = [] }) {
  if (eligibility === 'blocked') return 'not_ready';
  if (eligibility === 'limited') return budgetAmount !== null ? 'usable_with_caveat' : 'needs_evidence';

  const hasL3     = evidenceLevel === 'L3';
  const hasL2plus = evidenceLevel === 'L2' || evidenceLevel === 'L3';
  const hasL1plus = evidenceLevel === 'L1' || hasL2plus;
  const hasBudget = budgetAmount !== null;
  const hasPax    = participants !== null;
  const hasSrc    = sourceTier !== null;

  switch (eventType) {
    case 'professional_training':
    case 'reskilling_program':
      if (hasL3 && hasPax && hasBudget) return 'report_ready';
      if (hasL2plus && hasPax)          return 'usable_with_caveat';
      if (hasL1plus)                    return 'needs_evidence';
      return 'needs_evidence';

    case 'work_life_balance_policy':
    case 'flexible_work_policy':
      if (hasL2plus && hasPax && hasBudget) return 'usable_with_caveat';
      return 'needs_evidence';

    case 'fitness_wellbeing_program':
    case 'light_wellbeing_event':
      if (hasL3 && hasPax && hasBudget) return 'usable_with_caveat';
      return 'needs_evidence';

    case 'caregiver_support':
    case 'childcare_support':
      if (hasL3 && hasPax && hasBudget && hasSrc) return 'report_ready';
      if (hasL2plus && (hasPax || hasBudget))      return 'usable_with_caveat';
      return 'needs_evidence';

    case 'health_insurance_support':
      if (hasL2plus && hasBudget) return 'usable_with_caveat';
      return 'needs_evidence';

    case 'pension_future_support':
      if (hasL2plus && hasBudget) return 'usable_with_caveat';
      return 'needs_evidence';

    case 'inclusion_program': {
      const isGeneric = reasonCodes.includes('taxonomy:inclusion_equity:generic_event');
      if (isGeneric)           return 'needs_evidence';
      if (hasL2plus && hasPax) return 'usable_with_caveat';
      return 'needs_evidence';
    }

    case 'volunteering':
      if (hasL3 && hasPax)                    return 'report_ready';
      if (hasL2plus || (hasL1plus && hasPax)) return 'usable_with_caveat';
      return 'needs_evidence';

    case 'economic_relief':
      return hasBudget ? 'usable_with_caveat' : 'needs_evidence';

    default:
      if (hasL2plus && hasPax && hasBudget) return 'usable_with_caveat';
      return 'needs_evidence';
  }
}

const tests = [
  // name, params, expectedReadiness, isBlocker
  ['1. Training LMS L3+pax+budget',
    { eventType: 'professional_training', eligibility: 'eligible', evidenceLevel: 'L3', budgetAmount: 15000, participants: 45, sourceTier: 'lms_export' },
    'report_ready', true],

  ['2. Ferie illimitate solo policy (no evidence)',
    { eventType: 'work_life_balance_policy', eligibility: 'eligible', evidenceLevel: null, budgetAmount: null, participants: null, sourceTier: null },
    'needs_evidence', true],

  ['3. Palestra no attendance/budget',
    { eventType: 'fitness_wellbeing_program', eligibility: 'eligible', evidenceLevel: null, budgetAmount: null, participants: null, sourceTier: null },
    'needs_evidence', true],

  ['4. Buoni pasto con budget (limited)',
    { eventType: 'economic_relief', eligibility: 'limited', evidenceLevel: 'L1', budgetAmount: 5000, participants: null, sourceTier: null },
    'usable_with_caveat', true],

  ['5. Corso sicurezza obbligatorio (blocked)',
    { eventType: 'compliance_baseline', eligibility: 'blocked', evidenceLevel: null, budgetAmount: null, participants: null, sourceTier: null },
    'not_ready', true],

  ['6. Caregiver L3+budget+pax+source',
    { eventType: 'caregiver_support', eligibility: 'eligible', evidenceLevel: 'L3', budgetAmount: 8000, participants: 15, sourceTier: 'welfare_provider_export' },
    'report_ready', true],

  ['7. Nido L1 no budget no pax (only HR declaration)',
    { eventType: 'childcare_support', eligibility: 'eligible', evidenceLevel: 'L1', budgetAmount: null, participants: null, sourceTier: null },
    'needs_evidence', true],

  ['8. D&I workshop generico',
    { eventType: 'inclusion_program', eligibility: 'eligible', evidenceLevel: null, budgetAmount: null, participants: null, sourceTier: null, reasonCodes: ['taxonomy:inclusion_equity:generic_event'] },
    'needs_evidence', true],

  // B18.1 guard: family support NOT auto report_ready
  ['E1. Nido L2+pax (no source, not L3) — must NOT be report_ready',
    { eventType: 'childcare_support', eligibility: 'eligible', evidenceLevel: 'L2', budgetAmount: 5000, participants: 12, sourceTier: null },
    'usable_with_caveat', true],

  // Assicurazione = contextual only
  ['E2. Assicurazione sanitaria L2+budget — usable (not health outcome)',
    { eventType: 'health_insurance_support', eligibility: 'eligible', evidenceLevel: 'L2', budgetAmount: 12000, participants: null, sourceTier: null },
    'usable_with_caveat', true],

  // Wellness light max = usable_with_caveat (never report_ready)
  ['E3. Palestra L3+pax+budget — max is usable_with_caveat, not report_ready',
    { eventType: 'fitness_wellbeing_program', eligibility: 'eligible', evidenceLevel: 'L3', budgetAmount: 3000, participants: 80, sourceTier: 'welfare_provider_export' },
    'usable_with_caveat', true],

  // WLB policy max = usable_with_caveat (never report_ready)
  ['E4. Ferie illimitate L2+pax+budget — max is usable_with_caveat, not report_ready',
    { eventType: 'work_life_balance_policy', eligibility: 'eligible', evidenceLevel: 'L2', budgetAmount: 2000, participants: 100, sourceTier: null },
    'usable_with_caveat', true],

  // Previdenza = contextual
  ['E5. Previdenza integrativa L2+budget',
    { eventType: 'pension_future_support', eligibility: 'eligible', evidenceLevel: 'L2', budgetAmount: 5000, participants: null, sourceTier: null },
    'usable_with_caveat', false],

  // D&I structured (not generic)
  ['E6. D&I programma strutturato L2+pax',
    { eventType: 'inclusion_program', eligibility: 'eligible', evidenceLevel: 'L2', budgetAmount: null, participants: 30, sourceTier: null, reasonCodes: [] },
    'usable_with_caveat', false],
];

let passed = 0, failed = 0;
for (const [name, params, expected] of tests) {
  const actual = computeReadiness(params);
  const ok = actual === expected;
  if (ok) { passed++; process.stdout.write(`  ✓ ${name}\n    readiness: ${actual}\n\n`); }
  else    { failed++; process.stdout.write(`  ✗ ${name}\n    expected: ${expected}  got: ${actual}\n\n`); }
}

console.log(`\n--- Results: ${passed} PASS  ${failed} FAIL ---`);
if (failed > 0) process.exit(1);
