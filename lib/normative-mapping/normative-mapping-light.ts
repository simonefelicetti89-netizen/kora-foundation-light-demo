// lib/normative-mapping/normative-mapping-light.ts
// B138-B — Static Normative Mapping Light
//
// INVARIANT: This module never claims compliance, certification, or assurance.
// Every area carries is_compliance_claim: false, is_certification_claim: false,
// is_assurance_claim: false and a mandatory per-area disclaimer.
//
// Usage: import getNormativeMappingLight() in PDF template and report UI
// (B138-C, pending approval). Do not import directly into components — pass
// through the service layer when wired.

// ── Core types ────────────────────────────────────────────────────────────────

export type MappingStrength = 'direct' | 'indirect' | 'contextual';

export type MappingFramework =
  | 'ESRS_S1'
  | 'GRI'
  | 'ISO_30414'
  | 'UNI_PdR_125'
  | 'SDG';

export type KoraPillar =
  | 'LIFE'
  | 'GROWTH'
  | 'CONNECTION'
  | 'IMPACT'
  | 'LEGACY';

export type KoraComponent =
  | 'AR'
  | 'MAR'
  | 'NI'
  | 'VR'
  | 'CO'
  | 'WB'
  | 'PC'
  | 'PB'
  | 'EQ'
  | 'BTI';

export interface NormativeMappingArea {
  framework:       MappingFramework;
  framework_label: string;
  area_code:       string;
  area_label:      string;
  strength:        MappingStrength;
  kora_pillars:    KoraPillar[];
  kora_components: KoraComponent[];
  kora_event_types: string[];
  allowed_use:     string[];
  forbidden_claims: string[];
  disclaimer:      string;
  evidence_examples: string[];
}

export interface NormativeMappingLight {
  version:                string;
  calibration_status:     'pre_empirical_calibration';
  is_compliance_claim:    false;
  is_certification_claim: false;
  is_assurance_claim:     false;
  master_disclaimer:      string;
  global_allowed_use:     string[];
  global_forbidden_claims: string[];
  areas:                  NormativeMappingArea[];
}

// ── Master disclaimer — mandatory, non-suppressible ───────────────────────────

const MASTER_DISCLAIMER =
  'KORA maps organizational activation evidence against selected human capital and ' +
  'sustainability reporting references. This mapping is indicative and non-certificative: ' +
  'it does not constitute ESG compliance, audit, assurance, legal reporting, certification ' +
  'or scientific validation of any kind. It does not replace legal, ESG, tax, HR or ' +
  'assurance professional advice. KORA Foundation Light · pre_empirical_calibration.';

// ── Global allowed use — safe formulas for every output surface ───────────────

const GLOBAL_ALLOWED_USE: string[] = [
  'indicative mapping against selected reporting references',
  'orientation layer for HR, ESG and board readers',
  'decision-support for evidence organization',
  'board-readable context for human capital reporting discussion',
  'non-certificative reference for internal planning',
  'possible reporting support area — to be assessed with ESG advisor',
  'helps organize structured human capital evidence',
  'helps read organizational activation data in a reporting context',
  'evidence orientation for voluntary reporting preparation',
];

// ── Global forbidden claims — must never appear as positive statements ─────────

const GLOBAL_FORBIDDEN_CLAIMS: string[] = [
  'ESRS compliant',
  'CSRD compliant',
  'GRI compliant',
  'GRI-referenced disclosure',
  'ISO 30414 certified',
  'UNI/PdR 125 certified',
  'UNI/PdR 125 compliant',
  'ESG assurance',
  'audit-ready certification',
  'impact certified',
  'scientifically validated',
  'legal compliance guaranteed',
  'compliance guaranteed',
  'certified impact',
  'worker wellbeing certified',
  'rating ESG',
  'demonstrates compliance',
  'proves conformity',
  'replaces ESG audit',
  'replaces legal advice',
];

// ── Mapping areas ─────────────────────────────────────────────────────────────

const AREAS: NormativeMappingArea[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // ESRS S1 — Own Workforce
  // ══════════════════════════════════════════════════════════════════════════

  {
    framework:       'ESRS_S1',
    framework_label: 'ESRS S1 — Own Workforce',
    area_code:       'ESRS_S1_WORKING_CONDITIONS',
    area_label:      'Own Workforce — Working conditions and social protection',
    strength:        'indirect',
    kora_pillars:    ['LIFE', 'GROWTH'],
    kora_components: ['AR', 'MAR', 'NI', 'VR'],
    kora_event_types: [
      'health_insurance_support',
      'pension_future_support',
      'long_term_protection_support',
    ],
    allowed_use: [
      'indicative evidence base for working conditions narrative',
      'supports organization of people evidence for ESRS S1 reporting discussion',
      'non-certificative context for social protection initiatives documentation',
    ],
    forbidden_claims: [
      'ESRS S1 compliant',
      'CSRD compliant',
      'proves working conditions meet ESRS standards',
      'ESG assurance for working conditions',
    ],
    disclaimer:
      'KORA provides structured evidence of working condition initiatives. This does not constitute ' +
      'CSRD/ESRS compliance or assurance. Social protection coverage assessment requires HR and ' +
      'legal review. Mandatory regulatory disclosures must follow applicable ESRS/CSRD requirements independently.',
    evidence_examples: [
      'Health insurance coverage count and employer contribution documentation',
      'Supplementary pension fund participation and contribution data',
      'Long-term protection programme beneficiaries and policy document',
    ],
  },

  {
    framework:       'ESRS_S1',
    framework_label: 'ESRS S1 — Own Workforce',
    area_code:       'ESRS_S1_TRAINING',
    area_label:      'Own Workforce — Training and skills development',
    strength:        'direct',
    kora_pillars:    ['GROWTH', 'LEGACY'],
    kora_components: ['NI', 'VR', 'CO', 'AR', 'MAR'],
    kora_event_types: [
      'professional_training',
      'reskilling_program',
      'leadership_development_program',
      'succession_planning',
    ],
    allowed_use: [
      'indicative mapping to ESRS S1-13 training evidence',
      'supports organization of training hours and participant data',
      'non-certificative training evidence orientation for ESG reporting preparation',
    ],
    forbidden_claims: [
      'ESRS S1-13 compliant',
      'proves training investment meets CSRD standards',
      'ESRS-validated training programme',
    ],
    disclaimer:
      'Training and skills evidence maps indicatively to ESRS S1-13. KORA does not certify ' +
      'CSRD/ESRS compliance. Quantitative data (hours, participants, skill category) and provider ' +
      'export (L3 evidence) are recommended for meaningful reporting support.',
    evidence_examples: [
      'Training hours per worker with LMS or provider export (L3)',
      'Reskilling programme participants count and skill category classification',
      'Leadership development programme with structured learning objectives and outcome metrics',
    ],
  },

  {
    framework:       'ESRS_S1',
    framework_label: 'ESRS S1 — Own Workforce',
    area_code:       'ESRS_S1_DEI',
    area_label:      'Own Workforce — Diversity, equity and inclusion',
    strength:        'indirect',
    kora_pillars:    ['CONNECTION', 'GROWTH'],
    kora_components: ['EQ', 'WB', 'AR', 'MAR', 'PC'],
    kora_event_types: ['inclusion_program'],
    allowed_use: [
      'indicative mapping to ESRS S1-17 DEI evidence',
      'non-certificative orientation for D&I programme documentation',
      'helps organize inclusion evidence for board-level discussion',
    ],
    forbidden_claims: [
      'ESRS S1-17 compliant',
      'proves DEI outcomes meet CSRD standards',
      'ESG-validated diversity programme',
      'UNI/PdR 125 certified',
    ],
    disclaimer:
      'D&I programme evidence maps indicatively to ESRS S1-17. Structured programmes with ' +
      'quantitative uptake and outcome metrics provide stronger mapping. Generic one-off events ' +
      'receive lower evidence classification. This does not constitute any form of DEI certification.',
    evidence_examples: [
      'Structured inclusion programme with participant count and repeat engagement data',
      'D&I training with measurable outcome metrics and HR documentation',
      'Mentoring programme for underrepresented groups with structured evidence',
    ],
  },

  {
    framework:       'ESRS_S1',
    framework_label: 'ESRS S1 — Own Workforce',
    area_code:       'ESRS_S1_WORK_LIFE',
    area_label:      'Own Workforce — Work-life balance and care-related activation',
    strength:        'direct',
    kora_pillars:    ['LIFE', 'CONNECTION'],
    kora_components: ['AR', 'MAR', 'NI', 'VR'],
    kora_event_types: [
      'work_life_balance_policy',
      'flexible_work_policy',
      'childcare_support',
      'caregiver_support',
    ],
    allowed_use: [
      'indicative mapping to ESRS S1-15 work-life balance evidence',
      'helps organize caregiver and family support programme documentation',
      'non-certificative context for flexible work policy reporting discussion',
    ],
    forbidden_claims: [
      'ESRS S1-15 compliant',
      'proves work-life balance meets CSRD standards',
      'family support certified',
    ],
    disclaimer:
      'Work-life balance policies require quantitative uptake data for meaningful reporting support. ' +
      'Policy existence alone is weak evidence. Caregiver and childcare support map more directly ' +
      'when beneficiary data is available (N≥10 aggregated). This does not constitute CSRD/ESRS compliance.',
    evidence_examples: [
      'Flexible work policy with documented uptake rate and workers covered',
      'Childcare support programme with beneficiary count and service description',
      'Caregiver leave policy with usage data and HR documentation',
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GRI Standards
  // ══════════════════════════════════════════════════════════════════════════

  {
    framework:       'GRI',
    framework_label: 'GRI Standards — Workforce',
    area_code:       'GRI_401',
    area_label:      'GRI 401 — Employment',
    strength:        'indirect',
    kora_pillars:    ['LIFE', 'GROWTH'],
    kora_components: ['AR', 'MAR', 'WB', 'NI'],
    kora_event_types: ['health_insurance_support', 'pension_future_support'],
    allowed_use: [
      'indicative mapping of employment-related benefit evidence to GRI 401 narrative context',
      'helps organize people benefit documentation for voluntary reporting preparation',
      'non-certificative evidence orientation for GRI-discussion with ESG advisor',
    ],
    forbidden_claims: [
      'GRI 401 compliant',
      'GRI-referenced disclosure',
      'GRI-aligned reporting',
      'proves employment practices meet GRI standards',
    ],
    disclaimer:
      'KORA benefit programme evidence may contextually support GRI 401 reporting narratives. ' +
      'This does not constitute GRI-referenced or GRI-compliant disclosure. GRI reporting ' +
      'requires independent assessment and must follow GRI Universal Standards.',
    evidence_examples: [
      'Employee benefits coverage data (health, pension, family support)',
      'Benefit uptake rates with eligible population documentation',
      'Total compensation context with employer contribution data',
    ],
  },

  {
    framework:       'GRI',
    framework_label: 'GRI Standards — Workforce',
    area_code:       'GRI_403',
    area_label:      'GRI 403 — Occupational Health and Safety (extra-compliance, voluntary only)',
    strength:        'contextual',
    kora_pillars:    ['LIFE'],
    kora_components: ['AR', 'MAR', 'NI', 'VR'],
    kora_event_types: [
      'mental_health_support',
      'health_wellness_program',
      'fitness_wellbeing_program',
    ],
    allowed_use: [
      'indicative context for voluntary wellness and mental health evidence',
      'helps document extra-compliance health and wellbeing initiatives',
      'non-certificative orientation for voluntary health programme reporting discussion',
    ],
    forbidden_claims: [
      'GRI 403 compliant',
      'H&S certified',
      'occupational safety certified',
      'replaces mandatory H&S regulatory reporting',
      'meets mandatory H&S legal requirements',
    ],
    disclaimer:
      'KORA classifies mandatory health and safety training as compliance baseline — no IU is generated. ' +
      'Only voluntary wellness and mental health programmes may contextually support GRI 403 reporting. ' +
      'This does not constitute H&S certification or any form of regulatory compliance evidence.',
    evidence_examples: [
      'Voluntary mental health support programme with participation data',
      'Structured wellness programme with uptake metrics and provider documentation',
      'Psychological support services with beneficiary count (N≥10 aggregated)',
    ],
  },

  {
    framework:       'GRI',
    framework_label: 'GRI Standards — Workforce',
    area_code:       'GRI_404',
    area_label:      'GRI 404 — Training and Education',
    strength:        'direct',
    kora_pillars:    ['GROWTH', 'LEGACY'],
    kora_components: ['NI', 'VR', 'CO', 'AR', 'MAR'],
    kora_event_types: [
      'professional_training',
      'reskilling_program',
      'leadership_development_program',
    ],
    allowed_use: [
      'indicative mapping of training evidence to GRI 404 narrative context',
      'helps organize training hours and participant data for reporting preparation',
      'non-certificative orientation for voluntary training disclosure discussion',
    ],
    forbidden_claims: [
      'GRI 404 compliant',
      'GRI-referenced training disclosure',
      'proves training investment meets GRI standards',
    ],
    disclaimer:
      'Training evidence may support GRI 404 reporting narratives. This does not constitute ' +
      'GRI-referenced or GRI-compliant disclosure. GRI 404 reporting requires average training ' +
      'hours per worker, skills development programmes and performance review data — independently assessed.',
    evidence_examples: [
      'Average training hours per worker from LMS or provider export (L3)',
      'Reskilling programme with skill development outcomes and provider documentation',
      'Leadership development with structured learning objectives and completion metrics',
    ],
  },

  {
    framework:       'GRI',
    framework_label: 'GRI Standards — Workforce',
    area_code:       'GRI_405',
    area_label:      'GRI 405 — Diversity and Equal Opportunity',
    strength:        'indirect',
    kora_pillars:    ['CONNECTION', 'GROWTH'],
    kora_components: ['EQ', 'WB', 'PC', 'PB'],
    kora_event_types: ['inclusion_program'],
    allowed_use: [
      'indicative context for structured D&I programme evidence',
      'helps organize diversity and inclusion evidence for reporting discussion',
      'non-certificative orientation for voluntary GRI 405 narrative preparation',
    ],
    forbidden_claims: [
      'GRI 405 compliant',
      'GRI diversity reporting',
      'proves diversity governance meets GRI standards',
    ],
    disclaimer:
      'D&I evidence may contextually support GRI 405 reporting. This does not constitute ' +
      'GRI-referenced disclosure. GRI 405 requires board and workforce diversity data by gender, ' +
      'age and protected category — independently verified beyond KORA activation evidence.',
    evidence_examples: [
      'Structured inclusion programme with demographic breakdown (N≥10 aggregated)',
      'D&I training initiatives with participant diversity documentation',
      'Equal opportunity programme with measurable outcome metrics',
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ISO 30414 — Human Capital Reporting
  // ══════════════════════════════════════════════════════════════════════════

  {
    framework:       'ISO_30414',
    framework_label: 'ISO 30414 — Human Capital Reporting',
    area_code:       'ISO30414_SKILLS',
    area_label:      'Skills and capabilities',
    strength:        'indirect',
    kora_pillars:    ['GROWTH', 'LEGACY'],
    kora_components: ['NI', 'VR', 'CO'],
    kora_event_types: [
      'professional_training',
      'reskilling_program',
      'succession_planning',
      'leadership_development_program',
    ],
    allowed_use: [
      'indicative context for skills development evidence organization',
      'helps structure training and capability data for human capital reporting discussion',
      'non-certificative orientation for ISO 30414 skills dimension narrative',
    ],
    forbidden_claims: [
      'ISO 30414 certified',
      'ISO 30414 compliant',
      'proves skills management meets ISO 30414',
      'ISO-validated skills disclosure',
    ],
    disclaimer:
      'ISO 30414 is a voluntary standard for human capital reporting — not a mandatory certification. ' +
      'KORA training and skills evidence may contextually support the skills and capabilities dimension. ' +
      'ISO 30414 reporting requires independent assessment and formal human capital audit scope.',
    evidence_examples: [
      'Training hours and skill category data from approved UEF records',
      'Reskilling programme outcomes with skill level classification',
      'Succession planning initiatives with participant and outcome documentation',
    ],
  },

  {
    framework:       'ISO_30414',
    framework_label: 'ISO 30414 — Human Capital Reporting',
    area_code:       'ISO30414_CULTURE',
    area_label:      'Culture and organizational health',
    strength:        'contextual',
    kora_pillars:    ['CONNECTION', 'LIFE', 'LEGACY'],
    kora_components: ['PC', 'PB', 'WB', 'CO'],
    kora_event_types: [
      'inclusion_program',
      'mental_health_support',
      'health_wellness_program',
    ],
    allowed_use: [
      'indicative context for organizational culture and wellbeing evidence',
      'helps organize multi-pillar activation data for culture narrative discussion',
      'non-certificative orientation for ISO 30414 culture dimension documentation',
    ],
    forbidden_claims: [
      'ISO 30414 certified',
      'proves organizational culture meets ISO 30414',
      'culture certification',
    ],
    disclaimer:
      'KORA multi-pillar activation and pillar balance data may contextually support the ' +
      'culture and organizational health dimension of ISO 30414. This is contextual and does not ' +
      'constitute ISO 30414 certification or any form of organizational culture audit.',
    evidence_examples: [
      'Pillar coverage (PC) and pillar balance (PB) across LIFE, CONNECTION, LEGACY pillars',
      'Mental health and wellbeing programme activation data with continuity metric (CO)',
      'Worker Balance (WB) across workforce segments above N≥10 threshold',
    ],
  },

  {
    framework:       'ISO_30414',
    framework_label: 'ISO 30414 — Human Capital Reporting',
    area_code:       'ISO30414_WORKFORCE',
    area_label:      'Workforce availability and participation',
    strength:        'indirect',
    kora_pillars:    ['LIFE', 'GROWTH', 'CONNECTION'],
    kora_components: ['AR', 'MAR', 'WB', 'EQ'],
    kora_event_types: [
      'professional_training',
      'health_wellness_program',
      'inclusion_program',
    ],
    allowed_use: [
      'indicative mapping of activation rate data to workforce participation narrative',
      'helps organize workforce engagement evidence for human capital reporting discussion',
      'non-certificative context for workforce availability dimension documentation',
    ],
    forbidden_claims: [
      'ISO 30414 certified',
      'proves workforce availability meets ISO 30414',
      'ISO-validated workforce reporting',
    ],
    disclaimer:
      'Activation Rate (AR), Meaningful Activation Rate (MAR) and Worker Balance (WB) may ' +
      'contextually support the workforce availability dimension of ISO 30414. Productivity metrics ' +
      'and causal claims are explicitly excluded from KORA scope. This does not constitute ' +
      'ISO 30414 certification or any human capital audit.',
    evidence_examples: [
      'AR and MAR with aggregate workforce count (N≥10)',
      'Worker Balance (WB) metric with pillar distribution data',
      'Equity component (EQ) for participation distribution across workforce segments',
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // UNI/PdR 125:2022 — Gender Equity
  // ══════════════════════════════════════════════════════════════════════════

  {
    framework:       'UNI_PdR_125',
    framework_label: 'UNI/PdR 125:2022 — Gender Equity',
    area_code:       'UNI_PDR125_EQUITY',
    area_label:      'Gender equity and inclusion — indicative mapping only',
    strength:        'contextual',
    kora_pillars:    ['CONNECTION', 'GROWTH'],
    kora_components: ['EQ', 'WB'],
    kora_event_types: ['inclusion_program'],
    allowed_use: [
      'indicative context for equity and inclusion evidence in gender parity discussion',
      'helps organize D&I activation evidence for internal gender equity review',
      'non-certificative orientation for UNI/PdR 125 equity dimension narrative',
    ],
    forbidden_claims: [
      'UNI/PdR 125 certified',
      'UNI/PdR 125 compliant',
      'gender parity certification',
      'proves gender equity meets UNI/PdR 125 requirements',
      'pathway to UNI/PdR 125 certification',
    ],
    disclaimer:
      'UNI/PdR 125:2022 certification requires independent assessment by accredited third-party bodies. ' +
      'KORA Equity (EQ) and Worker Balance (WB) data may contextually support the equity dimension ' +
      'of an internal gender parity review. This is a contextual, non-certificative mapping only. ' +
      'No pathway to certification is implied.',
    evidence_examples: [
      'Equity component (EQ) measuring activation distribution across workforce segments',
      'Structured inclusion programme participation with gender-disaggregated data where available',
      'D&I programme with documented equal opportunity outcomes and HR evidence',
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // UN Sustainable Development Goals
  // ══════════════════════════════════════════════════════════════════════════

  {
    framework:       'SDG',
    framework_label: 'UN Sustainable Development Goals',
    area_code:       'SDG_3',
    area_label:      'SDG 3 — Good Health and Well-Being (aspirational)',
    strength:        'indirect',
    kora_pillars:    ['LIFE'],
    kora_components: ['AR', 'MAR', 'NI', 'VR'],
    kora_event_types: [
      'mental_health_support',
      'health_wellness_program',
      'fitness_wellbeing_program',
    ],
    allowed_use: [
      'aspirational reference for health and wellbeing programme narrative',
      'non-certificative context for SDG 3 alignment discussion with stakeholders',
      'helps organize health activation evidence for voluntary sustainability reporting',
    ],
    forbidden_claims: [
      'SDG 3 aligned',
      'contributes to SDG 3',
      'SDG impact certified',
      'UN-validated wellbeing impact',
    ],
    disclaimer:
      'SDG references are aspirational and do not constitute SDG-alignment certification, ' +
      'SDG impact claim, or reporting toward United Nations bodies or ESG investors based on SDGs. ' +
      'KORA LIFE pillar evidence may contextually support wellbeing narrative in voluntary sustainability reports.',
    evidence_examples: [
      'Mental health support programme participation and structured evidence (L2+)',
      'Wellness programme with uptake data and health dimension classification',
      'Preventive health initiatives with beneficiary count (N≥10 aggregated)',
    ],
  },

  {
    framework:       'SDG',
    framework_label: 'UN Sustainable Development Goals',
    area_code:       'SDG_4',
    area_label:      'SDG 4 — Quality Education (aspirational)',
    strength:        'indirect',
    kora_pillars:    ['GROWTH', 'LEGACY'],
    kora_components: ['NI', 'VR', 'CO'],
    kora_event_types: ['professional_training', 'reskilling_program'],
    allowed_use: [
      'aspirational reference for education and training programme narrative',
      'non-certificative context for SDG 4 alignment discussion',
      'helps organize learning and skills evidence for voluntary sustainability reporting',
    ],
    forbidden_claims: [
      'SDG 4 aligned',
      'contributes to SDG 4',
      'SDG education impact certified',
      'UN-validated education impact',
    ],
    disclaimer:
      'SDG 4 references are aspirational. KORA GROWTH and LEGACY pillar evidence may contextually ' +
      'support quality education narratives in voluntary reporting. This does not constitute SDG ' +
      'impact certification or any form of UN-recognized alignment.',
    evidence_examples: [
      'Professional training with hours, participants and skill outcome data',
      'Reskilling programme with structured learning objectives and provider documentation',
      'Knowledge transfer initiatives with mentoring and succession evidence',
    ],
  },

  {
    framework:       'SDG',
    framework_label: 'UN Sustainable Development Goals',
    area_code:       'SDG_5',
    area_label:      'SDG 5 — Gender Equality (aspirational)',
    strength:        'indirect',
    kora_pillars:    ['CONNECTION', 'GROWTH'],
    kora_components: ['EQ', 'WB'],
    kora_event_types: ['inclusion_program'],
    allowed_use: [
      'aspirational reference for gender equality programme narrative',
      'non-certificative context for SDG 5 alignment discussion',
      'helps organize equity and inclusion evidence for voluntary reporting',
    ],
    forbidden_claims: [
      'SDG 5 aligned',
      'contributes to SDG 5',
      'gender equality certified',
      'UN-validated gender impact',
    ],
    disclaimer:
      'SDG 5 references are aspirational. KORA Equity (EQ) data may contextually support gender ' +
      'equality narrative in voluntary sustainability reports. This does not constitute SDG impact ' +
      'certification or UNI/PdR 125 compliance.',
    evidence_examples: [
      'Equity component (EQ) measuring activation distribution across workforce segments',
      'Structured inclusion and D&I programmes with outcome documentation',
    ],
  },

  {
    framework:       'SDG',
    framework_label: 'UN Sustainable Development Goals',
    area_code:       'SDG_8',
    area_label:      'SDG 8 — Decent Work and Economic Growth (aspirational)',
    strength:        'indirect',
    kora_pillars:    ['LIFE', 'GROWTH', 'CONNECTION'],
    kora_components: ['AR', 'MAR', 'NI', 'WB'],
    kora_event_types: [
      'professional_training',
      'work_life_balance_policy',
      'health_insurance_support',
    ],
    allowed_use: [
      'aspirational reference for decent work programme narrative',
      'non-certificative context for SDG 8 alignment discussion',
      'helps organize workforce wellbeing evidence for voluntary sustainability reporting',
    ],
    forbidden_claims: [
      'SDG 8 aligned',
      'contributes to SDG 8',
      'decent work certified',
      'UN-validated labour standards',
    ],
    disclaimer:
      'SDG 8 references are aspirational. KORA activation data across LIFE, GROWTH and CONNECTION ' +
      'pillars may contextually support decent work narratives in voluntary sustainability reports. ' +
      'This does not constitute ILO or UN labour standards certification.',
    evidence_examples: [
      'Activation Rate (AR) and Meaningful Activation Rate (MAR) with aggregate workforce count',
      'Work-life balance and flexibility programme evidence with uptake data',
      'Skills development and professional training data from approved UEF records',
    ],
  },

  {
    framework:       'SDG',
    framework_label: 'UN Sustainable Development Goals',
    area_code:       'SDG_10',
    area_label:      'SDG 10 — Reduced Inequalities (aspirational)',
    strength:        'indirect',
    kora_pillars:    ['CONNECTION', 'IMPACT'],
    kora_components: ['EQ', 'WB', 'PC', 'PB'],
    kora_event_types: ['inclusion_program', 'volunteering'],
    allowed_use: [
      'aspirational reference for inclusion and equality programme narrative',
      'non-certificative context for SDG 10 alignment discussion',
      'helps organize equity and community evidence for voluntary sustainability reporting',
    ],
    forbidden_claims: [
      'SDG 10 aligned',
      'contributes to SDG 10',
      'inequality reduction certified',
      'UN-validated inclusion impact',
    ],
    disclaimer:
      'SDG 10 references are aspirational. KORA Equity (EQ) and community engagement evidence ' +
      'may contextually support reduced inequalities narratives. This does not constitute SDG ' +
      'impact certification or any form of social impact assurance.',
    evidence_examples: [
      'Equity component (EQ) measuring activation distribution across workforce segments',
      'Volunteering programme with community beneficiary count and territorial impact',
      'Pillar balance metrics (PB) showing activation spread across workforce population',
    ],
  },

  {
    framework:       'SDG',
    framework_label: 'UN Sustainable Development Goals',
    area_code:       'SDG_17',
    area_label:      'SDG 17 — Partnerships for the Goals (aspirational)',
    strength:        'contextual',
    kora_pillars:    ['IMPACT', 'CONNECTION'],
    kora_components: ['AR', 'PC'],
    kora_event_types: ['volunteering'],
    allowed_use: [
      'aspirational reference for partnership and community engagement narrative',
      'non-certificative context for SDG 17 alignment discussion',
      'helps organize ecosystem and partnership evidence for voluntary sustainability reporting',
    ],
    forbidden_claims: [
      'SDG 17 aligned',
      'contributes to SDG 17',
      'partnership impact certified',
      'UN-validated partnership model',
    ],
    disclaimer:
      'SDG 17 references are aspirational. KORA IMPACT pillar evidence and partner-verified ' +
      'volunteering data may contextually support partnership narratives. This does not constitute ' +
      'SDG impact certification or any form of UN-recognized partnership model.',
    evidence_examples: [
      'Volunteering programme with NGO/partner documentation (L3 evidence)',
      'Community engagement initiatives with ecosystem partner count',
      'Territorial impact evidence with third-party verification documentation',
    ],
  },
];

// ── Canonical constant ────────────────────────────────────────────────────────

export const NORMATIVE_MAPPING_V01: NormativeMappingLight = {
  version:                'v0.1 — KORA Foundation Light',
  calibration_status:     'pre_empirical_calibration',
  is_compliance_claim:    false,
  is_certification_claim: false,
  is_assurance_claim:     false,
  master_disclaimer:      MASTER_DISCLAIMER,
  global_allowed_use:     GLOBAL_ALLOWED_USE,
  global_forbidden_claims: GLOBAL_FORBIDDEN_CLAIMS,
  areas:                  AREAS,
};

export function getNormativeMappingLight(): NormativeMappingLight {
  return NORMATIVE_MAPPING_V01;
}
