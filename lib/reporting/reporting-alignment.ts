// lib/reporting/reporting-alignment.ts
// B18 — Reporting alignment types and ESRS area mapping.
//
// CRITICAL INVARIANT: This module NEVER claims CSRD/ESRS compliance.
// Every output carries isComplianceClaim: false and a mandatory caveat.
// "Alignment" means possible reporting support — not certification, not assurance.

import type { EligibilityProposal } from '@/lib/ingestion/raw-to-uef-interpreter';

export interface ReportingAlignmentArea {
  code:           string;                               // e.g. "ESRS_S1_13"
  label:          string;
  relevance:      'direct' | 'indirect' | 'contextual';
  strength:       'strong' | 'medium' | 'weak';
  evidenceNeeded: string[];
  caveat:         string;
}

export interface ReportingAlignment {
  framework:        'ESRS';
  areas:            ReportingAlignmentArea[];
  isComplianceClaim: false;
  caveat:           string;
}

// ── Standard caveat — mandatory, non-suppressible ─────────────────────────────
export const REPORTING_CAVEAT =
  'KORA does not certify CSRD/ESRS compliance. This mapping indicates possible reporting support only. Evidence must be independently verified before use in mandatory or voluntary reporting.';

// ── ESRS area definitions ─────────────────────────────────────────────────────

const A_TRAINING: ReportingAlignmentArea = {
  code:  'ESRS_S1_13',
  label: 'Own workforce — Training and skills development',
  relevance:      'direct',
  strength:       'strong',
  evidenceNeeded: ['training hours per worker', 'participants count', 'LMS or provider export (L3)', 'skill category'],
  caveat: 'Requires quantitative data: hours, participants, skill level. Provider export (L3) or internal accounting (L2) recommended for strong alignment.',
};

const A_HEALTH_SAFETY_CONTEXTUAL: ReportingAlignmentArea = {
  code:  'ESRS_S1_14',
  label: 'Own workforce — Health and safety (contextual)',
  relevance:      'contextual',
  strength:       'medium',
  evidenceNeeded: ['programme description', 'participants', 'voluntary vs. mandatory distinction'],
  caveat: 'KORA classifies mandatory H&S training as compliance baseline (no IU). Voluntary wellness programmes may support this area contextually only.',
};

const A_WORK_LIFE_BALANCE: ReportingAlignmentArea = {
  code:  'ESRS_S1_15',
  label: 'Own workforce — Work-life balance',
  relevance:      'direct',
  strength:       'medium',
  evidenceNeeded: ['policy document', 'uptake rate', 'usage data', 'workers covered (N≥10 aggregation)'],
  caveat: 'Structural flexibility policies require quantitative uptake data for strong alignment. Policy existence alone is weak evidence.',
};

const A_SOCIAL_PROTECTION_HEALTH: ReportingAlignmentArea = {
  code:  'ESRS_S1_8',
  label: 'Own workforce — Social protection / health-related benefits',
  relevance:      'contextual',
  strength:       'medium',
  evidenceNeeded: ['coverage count', 'eligibility criteria', 'employer contribution amount', 'plan document'],
  caveat: 'Health insurance is contextual evidence for social protection. Compliance assessment requires HR and legal review.',
};

const A_SOCIAL_PROTECTION_PENSION: ReportingAlignmentArea = {
  code:  'ESRS_S1_8_PENSION',
  label: 'Own workforce — Social protection / future security',
  relevance:      'contextual',
  strength:       'medium',
  evidenceNeeded: ['coverage count', 'employer contribution', 'fund document', 'eligible population'],
  caveat: 'Pension/supplementary funds are contextual evidence. Social protection coverage assessment requires HR and actuarial review.',
};

const A_FAMILY_SUPPORT: ReportingAlignmentArea = {
  code:  'ESRS_S1_15_CARE',
  label: 'Own workforce — Family support and caregiving',
  relevance:      'direct',
  strength:       'strong',
  evidenceNeeded: ['beneficiaries count', 'service description', 'cost', 'provider or internal documentation'],
  caveat: 'Caregiver and childcare support are direct people evidence. Requires participant data and service documentation for strong alignment.',
};

const A_EQUAL_OPPORTUNITIES: ReportingAlignmentArea = {
  code:  'ESRS_S1_17',
  label: 'Own workforce — Equal opportunities and inclusion',
  relevance:      'direct',
  strength:       'medium',
  evidenceNeeded: ['participants count', 'programme structure', 'outcome metrics', 'repeat engagement data'],
  caveat: 'D&I programmes are eligible for KORA activation only when structured and evidenced. Generic one-off events receive lower confidence.',
};

const A_COMMUNITY: ReportingAlignmentArea = {
  code:  'ESRS_S3',
  label: 'Affected communities — Community engagement',
  relevance:      'indirect',
  strength:       'medium',
  evidenceNeeded: ['beneficiaries count', 'volunteer hours', 'partner/NGO documentation (L3)', 'territorial impact'],
  caveat: 'Volunteering is indirect evidence for community impact. Partner documentation strongly recommended for meaningful alignment.',
};

const A_REMUNERATION_CONTEXTUAL: ReportingAlignmentArea = {
  code:  'ESRS_S1_16',
  label: 'Own workforce — Remuneration / benefits context',
  relevance:      'contextual',
  strength:       'weak',
  evidenceNeeded: ['benefit value per worker', 'eligible population', 'policy document'],
  caveat: 'Economic relief benefits (vouchers, generic fringe) are contextual. Not treated as people activation by KORA.',
};

const A_WELLNESS_CONTEXTUAL: ReportingAlignmentArea = {
  code:  'ESRS_S1_14_WELLNESS',
  label: 'Own workforce — Health and safety / light wellness (contextual)',
  relevance:      'contextual',
  strength:       'weak',
  evidenceNeeded: ['participation data', 'structured programme evidence', 'uptake metrics'],
  caveat: 'Light wellness (gym access, fitness apps) is weak contextual evidence. Structured programme with uptake data and budget documentation strengthens alignment to strong.',
};

// ── Mapping: eventType → ReportingAlignment ───────────────────────────────────

export function deriveReportingAlignment(
  eventType: string,
  eligibility: EligibilityProposal,
): ReportingAlignment | null {
  // Blocked compliance records: not eligible for reporting alignment
  if (eligibility === 'blocked') return null;

  let areas: ReportingAlignmentArea[] = [];

  switch (eventType) {
    case 'professional_training':
    case 'reskilling_program':
      areas = [A_TRAINING];
      break;

    case 'mental_health_support':
      areas = [{ ...A_HEALTH_SAFETY_CONTEXTUAL, strength: 'medium' }];
      break;

    case 'health_wellness_program':
      areas = [{ ...A_HEALTH_SAFETY_CONTEXTUAL, strength: 'medium' }];
      break;

    case 'work_life_balance_policy':
    case 'flexible_work_policy':
      areas = [A_WORK_LIFE_BALANCE];
      break;

    case 'health_insurance_support':
      areas = [A_SOCIAL_PROTECTION_HEALTH];
      break;

    case 'pension_future_support':
      areas = [A_SOCIAL_PROTECTION_PENSION];
      break;

    case 'fitness_wellbeing_program':
    case 'light_wellbeing_event':
      areas = [A_WELLNESS_CONTEXTUAL];
      break;

    case 'caregiver_support':
    case 'childcare_support':
      areas = [A_FAMILY_SUPPORT, { ...A_WORK_LIFE_BALANCE, relevance: 'indirect', strength: 'medium' }];
      break;

    case 'inclusion_program':
      areas = [A_EQUAL_OPPORTUNITIES];
      break;

    case 'volunteering':
      areas = [A_COMMUNITY];
      break;

    case 'economic_relief':
      areas = [A_REMUNERATION_CONTEXTUAL];
      break;

    // B23: new event types
    case 'leadership_development_program':
    case 'succession_planning':
      areas = [A_TRAINING];
      break;

    case 'long_term_protection_support':
      areas = [A_SOCIAL_PROTECTION_PENSION];
      break;

    default:
      return null;
  }

  if (areas.length === 0) return null;

  return {
    framework:        'ESRS',
    areas,
    isComplianceClaim: false,
    caveat:           REPORTING_CAVEAT,
  };
}
