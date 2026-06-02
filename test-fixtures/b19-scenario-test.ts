// test-fixtures/b19-scenario-test.ts
// B19 scenario tests — run from project root: npx ts-node test-fixtures/b19-scenario-test.ts

import { deriveEvidenceGaps } from '@/lib/reporting/evidence-gap-engine';
import { deriveReportingAlignment } from '@/lib/reporting/reporting-alignment';
import type { EligibilityProposal, EvidenceLevel } from '@/lib/ingestion/raw-to-uef-interpreter';

function scenario(name: string, params: {
  eventType: string;
  eligibility: EligibilityProposal;
  evidenceLevel: EvidenceLevel | null;
  budgetAmount: number | null;
  participants: number | null;
  sourceTier: string | null;
  reasonCodes?: string[];
}) {
  const ra = deriveReportingAlignment(params.eventType, params.eligibility);
  const gaps = deriveEvidenceGaps({
    reportingAlignment: ra,
    initiativeDomain: 'welfare',
    eventType: params.eventType,
    eligibility: params.eligibility,
    pillar: null,
    budgetClass: 'unknown',
    budgetAmount: params.budgetAmount,
    sourceTier: params.sourceTier,
    evidenceLevel: params.evidenceLevel,
    financialConfidence: 0.5,
    needsEnrichment: false,
    enrichmentMissingFields: [],
    participants: params.participants,
    reasonCodes: params.reasonCodes ?? [],
  });

  const readiness = gaps.length > 0 ? gaps[0].readiness : 'NO_ALIGNMENT';
  const missing   = gaps.length > 0 ? gaps[0].missingEvidence.slice(0, 3).join(' | ') : '—';
  const owner     = gaps.length > 0 ? gaps[0].ownerHint : '—';
  const strength  = gaps.length > 0 ? gaps[0].currentStrength : '—';

  console.log(`\n=== ${name} ===`);
  console.log(`  eventType:  ${params.eventType} | eligibility: ${params.eligibility}`);
  console.log(`  evidence:   ${params.evidenceLevel ?? 'L0'} | budget: ${params.budgetAmount ?? 'null'} | pax: ${params.participants ?? 'null'}`);
  console.log(`  strength(B18): ${strength}  →  READINESS(B19): ${readiness}`);
  console.log(`  missing:    ${missing}`);
  console.log(`  ownerHint:  ${owner}`);
}

// 1. Training con LMS export — expected: report_ready
scenario('1. Training con LMS export', {
  eventType: 'professional_training', eligibility: 'eligible',
  evidenceLevel: 'L3', budgetAmount: 15000, participants: 45, sourceTier: 'lms_export',
});

// 2. Ferie illimitate solo policy — expected: needs_evidence
scenario('2. Ferie illimitate solo policy', {
  eventType: 'work_life_balance_policy', eligibility: 'eligible',
  evidenceLevel: null, budgetAmount: null, participants: null, sourceTier: null,
});

// 3. 10 ore palestra senza attendance — expected: needs_evidence
scenario('3. Palestra no attendance/budget', {
  eventType: 'fitness_wellbeing_program', eligibility: 'eligible',
  evidenceLevel: null, budgetAmount: null, participants: null, sourceTier: null,
});

// 4. Buoni pasto con budget — expected: usable_with_caveat (limited)
scenario('4. Buoni pasto con budget', {
  eventType: 'economic_relief', eligibility: 'limited',
  evidenceLevel: 'L1', budgetAmount: 5000, participants: null, sourceTier: null,
});

// 5. Corso sicurezza obbligatorio — expected: NO_ALIGNMENT (blocked)
scenario('5. Corso sicurezza obbligatorio (blocked)', {
  eventType: 'compliance_baseline', eligibility: 'blocked',
  evidenceLevel: null, budgetAmount: null, participants: null, sourceTier: null,
});

// 6. Caregiver con L3 + budget + pax + source — expected: report_ready
scenario('6. Caregiver L3+budget+pax+source', {
  eventType: 'caregiver_support', eligibility: 'eligible',
  evidenceLevel: 'L3', budgetAmount: 8000, participants: 15, sourceTier: 'welfare_provider_export',
});

// 7. Nido aziendale L1 no budget no pax — expected: needs_evidence
scenario('7. Nido aziendale solo HR (L1, no budget, no pax)', {
  eventType: 'childcare_support', eligibility: 'eligible',
  evidenceLevel: 'L1', budgetAmount: null, participants: null, sourceTier: null,
});

// 8. D&I workshop generico — expected: needs_evidence
scenario('8. D&I workshop generico', {
  eventType: 'inclusion_program', eligibility: 'eligible',
  evidenceLevel: null, budgetAmount: null, participants: null, sourceTier: null,
  reasonCodes: ['taxonomy:inclusion_equity:generic_event'],
});

// EXTRA: Nido con L2 + pax (no L3 source) — expected: usable_with_caveat (NOT report_ready)
scenario('E1. Nido L2+pax (no source, no L3) — guard B18.1', {
  eventType: 'childcare_support', eligibility: 'eligible',
  evidenceLevel: 'L2', budgetAmount: 5000, participants: 12, sourceTier: null,
});

// EXTRA: Assicurazione sanitaria L2+budget — expected: usable_with_caveat
scenario('E2. Assicurazione sanitaria L2+budget', {
  eventType: 'health_insurance_support', eligibility: 'eligible',
  evidenceLevel: 'L2', budgetAmount: 12000, participants: null, sourceTier: null,
});

// EXTRA: Palestra L3+pax+budget — expected: usable_with_caveat (max, never report_ready)
scenario('E3. Palestra L3+pax+budget — max wellness light', {
  eventType: 'fitness_wellbeing_program', eligibility: 'eligible',
  evidenceLevel: 'L3', budgetAmount: 3000, participants: 80, sourceTier: 'welfare_provider_export',
});

// EXTRA: WLB policy con L2+pax+budget — expected: usable_with_caveat (NOT report_ready)
scenario('E4. Ferie illimitate L2+pax+budget — guard', {
  eventType: 'work_life_balance_policy', eligibility: 'eligible',
  evidenceLevel: 'L2', budgetAmount: 2000, participants: 100, sourceTier: null,
});
