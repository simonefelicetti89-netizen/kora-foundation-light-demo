// LIFE Diversity Intelligence™ — rule-based intelligence layer, no LLM.
// Surfaces within-LIFE subcategory diversity without modifying KORA Index™.
//
// Architecture: purely additive explainability/recommendation layer.
// Does NOT modify: KORA Index, PB, PC, CQ, IU formula, PIB, BTI formula, AGF, Eligibility Gate.
// Privacy: aggregate-only. No individual worker data. D-04 compliant.
// methodologyStatus: pre_empirical_calibration — not yet Delphi-calibrated.
// not_kora_index_component: true — this indicator is KORA Intelligence, not KORA Index.

import type { BudgetToHumanImpactRecord, KoraRole } from '@/lib/types';

// ── Allowed roles ──────────────────────────────────────────────────────────────

const ALLOWED_ROLES: ReadonlySet<KoraRole> = new Set<KoraRole>([
  'KORA_ADMIN',
  'COMPANY_ADMIN',
]);

// ── LIFE Subcategory Taxonomy v0.1 ─────────────────────────────────────────────
// 10 subcategories, pre-empirical calibration, equal weight = 1.0.
// Weights may be differentiated post-Delphi Study — do not add weights now.

export type LifeSubcategoryCode =
  | 'childcare'
  | 'eldercare_caregiving'
  | 'family_parental_support'
  | 'mental_health'
  | 'physical_prevention_screening'
  | 'physical_activity_fitness'
  | 'health_insurance_supplementary'
  | 'work_life_balance'
  | 'disconnection_meeting_free'
  | 'flexible_work_policies';

export type ConcentrationStatus =
  | 'diverse'
  | 'moderately_concentrated'
  | 'highly_concentrated'
  | 'single_category_dominant'
  | 'no_life_data';

export type LifePrivacyWarningLevel = 'none' | 'soft' | 'hard';

export interface LifeDiversityRecommendation {
  id: string;
  text: string;
  priority: 'alta' | 'media';
  targetSubcategory?: LifeSubcategoryCode;
}

export interface LifeSubcategoryMeta {
  label: string;
  description: string;
  keywords: readonly string[];     // lowercase, accent-stripped
  privacySensitivity: 'low' | 'medium' | 'high';
}

export interface LifeDiversitySummary {
  lifeShare: number;
  lifeTotalIU: number;
  activeSubcategories: LifeSubcategoryCode[];
  dominantSubcategory: LifeSubcategoryCode | null;
  dominantSubcategoryShare: number;
  diversityScore: number;            // 0–1: activeSubcategories / 10
  concentrationStatus: ConcentrationStatus;
  privacyWarningLevel: LifePrivacyWarningLevel;
  privacyWarningMessage: string | null;
  missingSubcategories: LifeSubcategoryCode[];
  recommendations: LifeDiversityRecommendation[];
  methodologyStatus: 'pre_empirical_calibration';
  not_kora_index_component: true;
}

// ── Text normalization ──────────────────────────────────────────────────────────

function removeAccents(s: string): string {
  return s
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n');
}

function normalize(v: string): string {
  return removeAccents(v.toLowerCase().trim().replace(/\s+/g, ' '));
}

// ── LIFE Subcategory Taxonomy ───────────────────────────────────────────────────

export const LIFE_SUBCATEGORY_META: Record<LifeSubcategoryCode, LifeSubcategoryMeta> = {
  childcare: {
    label: 'Childcare & Nido',
    description: 'Servizi per la cura dei figli: asilo nido, contributi, centri estivi',
    keywords: [
      'asilo nido', 'nido aziendale', 'childcare', 'child care', 'contributo nido',
      'centri estivi', 'campus estivo', 'summer camp', 'kids campus', 'nido convenzionato',
    ],
    privacySensitivity: 'medium',
  },
  eldercare_caregiving: {
    label: 'Eldercare & Caregiving',
    description: 'Supporto ai lavoratori con responsabilità di cura familiare',
    keywords: [
      'caregiver', 'caregiving', 'eldercare', 'cura anziani', 'assistenza anziani',
      'assistenza familiare', 'supporto caregiver', 'assistenza care',
    ],
    privacySensitivity: 'medium',
  },
  family_parental_support: {
    label: 'Supporto Familiare & Genitorialità',
    description: 'Congedi aggiuntivi, permessi genitorialità, rientro maternità/paternità',
    keywords: [
      'congedo aggiuntivo', 'congedo solidarieta', 'supporto famiglia', 'family support',
      'family services', 'permessi genitorialita', 'congedo parentale aggiuntivo',
      'rientro maternita', 'rientro paternita', 'parental care',
    ],
    privacySensitivity: 'medium',
  },
  mental_health: {
    label: 'Salute Mentale & Supporto Psicologico',
    description: 'Servizi di supporto psicologico aggregato — mai dati individuali',
    keywords: [
      'mental health service', 'mental health program', 'mental health platform',
      'supporto psicologico', 'psicologia aziendale', 'benessere psicologico',
      'salute mentale', 'servizio psicologico', 'counseling aziendale', 'psicologico',
    ],
    privacySensitivity: 'high',
  },
  physical_prevention_screening: {
    label: 'Prevenzione & Screening Sanitario',
    description: 'Check-up extra-LEA, screening preventivi, prevenzione sanitaria aggiuntiva',
    keywords: [
      'check-up extra', 'prevenzione extra', 'prevenzione sanitaria extra',
      'screening sanitario', 'check up medico', 'visita preventiva',
      'check-up aziendale', 'prevenzione sanitaria',
    ],
    privacySensitivity: 'medium',
  },
  physical_activity_fitness: {
    label: 'Attività Fisica & Fitness',
    description: 'Palestre, convenzioni sportive, rimborsi fitness',
    keywords: [
      'benessere fisico', 'attivita fisica', 'sport aziendale', 'palestra aziendale',
      'convenzione palestra', 'gym aziendale', 'fitness aziendale', 'sport benefit',
      'palestra', 'gym', 'fitness benefit', 'attivita sportiva', 'rimborso fitness',
      'sport rimborso', 'convenzione gym',
    ],
    privacySensitivity: 'low',
  },
  health_insurance_supplementary: {
    label: 'Assicurazione Sanitaria Integrativa',
    description: 'Polizze sanitarie integrative, fondi sanitari, copertura aggiuntiva',
    keywords: [
      'assicurazione sanitaria', 'polizza sanitaria', 'sanita integrativa',
      'mutua sanitaria', 'copertura sanitaria', 'welfare sanitario integrativo',
      'fondo sanitario', 'piano sanitario', 'sanita complementare',
    ],
    privacySensitivity: 'medium',
  },
  work_life_balance: {
    label: 'Work-Life Balance',
    description: 'Iniziative generali di equilibrio vita-lavoro e benessere volontario',
    keywords: [
      'work-life balance', 'work life balance', 'equilibrio vita lavoro',
      'wellbeing volontario', 'wellbeing voluntary', 'benessere volontario',
    ],
    privacySensitivity: 'low',
  },
  disconnection_meeting_free: {
    label: 'Disconnessione & No-Meeting Zones',
    description: 'Diritto alla disconnessione, giornate senza riunioni, deep work',
    keywords: [
      'diritto alla disconnessione', 'right to disconnect', 'no meeting friday',
      'no riunioni venerdi', 'deep work friday', 'no meeting day',
      'meeting free day', 'giornata senza riunioni', 'diritto disconnessione',
    ],
    privacySensitivity: 'low',
  },
  flexible_work_policies: {
    label: 'Politiche di Lavoro Flessibile',
    description: 'Smart working policy, settimana corta, ferie illimitate',
    keywords: [
      'smart working policy', 'smart working formale', 'lavoro agile policy',
      'ferie illimitate', 'settimana corta', 'four day week', 'lavoro flessibile',
      'remote work policy', 'lavoro agile', 'smart working',
    ],
    privacySensitivity: 'low',
  },
};

const ALL_SUBCATEGORY_CODES = Object.keys(LIFE_SUBCATEGORY_META) as LifeSubcategoryCode[];

// ── Demo program profiles per scenario (Foundation Light synthetic data) ─────────
// Represents the program portfolio that exists in each scenario's seed data.
// Consistent with doc 25 synthetic data blueprint and the S1/S2 contrast.

const DEMO_LIFE_PROGRAMS: Record<string, string[]> = {
  S1: [
    'Palestra aziendale convenzione abbonamento',
    'Gym benefit mensile dipendenti welfare platform',
    'Sport aziendale rimborso fitness mensile',
    'Convenzione palestra external provider',
    'Fitness benefit welfare aziendale',
    'Attivita fisica sport rimborso welfare',
  ],
  S2: [
    'Palestra aziendale convenzione abbonamento',
    'Supporto psicologico aziendale piattaforma benessere',
    'Prevenzione sanitaria extra check-up',
    'Smart working policy formale lavoro agile',
    'Contributo nido aziendale centri estivi',
    'Assicurazione sanitaria integrativa fondo',
  ],
  S3: [
    'Wellbeing volontario benessere programma',
    'Smart working policy formale lavoro agile',
    'Mental health platform salute mentale aziendale',
  ],
  S4: [
    'Palestra aziendale convenzione',
    'Palestra convenzione fitness benefit',
    'Sport benefit gym rimborso',
  ],
  default: [
    'Palestra aziendale convenzione abbonamento',
    'Wellbeing volontario',
    'Smart working policy',
  ],
};

// ── Subcategory classification ─────────────────────────────────────────────────

export function classifyLifeSubcategory(descriptor: string): LifeSubcategoryCode | null {
  const norm = normalize(descriptor);
  // Ordered from most specific to least specific to reduce false positives
  const priority: LifeSubcategoryCode[] = [
    'mental_health',
    'physical_prevention_screening',
    'health_insurance_supplementary',
    'childcare',
    'eldercare_caregiving',
    'family_parental_support',
    'disconnection_meeting_free',
    'flexible_work_policies',
    'work_life_balance',
    'physical_activity_fitness',
  ];
  for (const code of priority) {
    const meta = LIFE_SUBCATEGORY_META[code];
    if (meta.keywords.some((kw) => norm.includes(kw))) return code;
  }
  return null;
}

// ── Concentration status from active subcategory count ─────────────────────────

function toConcentrationStatus(activeCount: number): ConcentrationStatus {
  if (activeCount === 0) return 'no_life_data';
  if (activeCount === 1) return 'single_category_dominant';
  if (activeCount <= 3) return 'highly_concentrated';
  if (activeCount <= 5) return 'moderately_concentrated';
  return 'diverse';
}

// ── Privacy warning ────────────────────────────────────────────────────────────

function computePrivacyWarning(
  lifeShare: number,
  dominantSubcategory: LifeSubcategoryCode | null,
): { level: LifePrivacyWarningLevel; message: string | null } {
  const dominantSensitivity = dominantSubcategory
    ? LIFE_SUBCATEGORY_META[dominantSubcategory].privacySensitivity
    : 'low';

  // Determine base level from share thresholds
  let level: LifePrivacyWarningLevel = 'none';
  if (lifeShare >= 0.70) level = 'hard';
  else if (lifeShare >= 0.55) level = 'soft';

  // Escalate if dominant subcategory has high privacy sensitivity
  if (dominantSensitivity === 'high') {
    if (level === 'none') level = 'soft';
    else if (level === 'soft') level = 'hard';
  }

  if (level === 'hard') {
    return {
      level,
      message: 'Concentrazione LIFE superiore al 70%. Rischio di inferenza statistica su segmenti sensibili. Revisione advisor raccomandata.',
    };
  }
  if (level === 'soft') {
    return {
      level,
      message: 'Concentrazione elevata nel pillar LIFE. Verificare che i dati aggregati non consentano inferenze su segmenti sensibili.',
    };
  }
  return { level: 'none', message: null };
}

// ── Recommendations ────────────────────────────────────────────────────────────

function buildRecommendations(
  activeSubcategories: LifeSubcategoryCode[],
  dominantSubcategory: LifeSubcategoryCode | null,
  diversityScore: number,
  lifeShare: number,
  concentrationStatus: ConcentrationStatus,
  privacyWarningLevel: LifePrivacyWarningLevel,
): LifeDiversityRecommendation[] {
  const recs: LifeDiversityRecommendation[] = [];
  const active = new Set(activeSubcategories);

  // Gym-heavy concentration
  if (
    dominantSubcategory === 'physical_activity_fitness' &&
    diversityScore < 0.30
  ) {
    recs.push({
      id: 'rec_diversify_from_fitness',
      text: 'Il portfolio LIFE è concentrato su attività fisica/fitness. Valuta di ampliare verso prevenzione sanitaria, caregiving o supporto psicologico per una copertura più profonda.',
      priority: 'alta',
      targetSubcategory: 'physical_prevention_screening',
    });
  }

  // No mental health when LIFE share is significant
  if (!active.has('mental_health') && lifeShare >= 0.20) {
    recs.push({
      id: 'rec_add_mental_health',
      text: 'Il portfolio LIFE non mostra segnali di supporto psicologico o salute mentale a livello aggregato. I programmi di supporto psicologico hanno alto impatto sull\'attivazione LIFE.',
      priority: 'alta',
      targetSubcategory: 'mental_health',
    });
  }

  // No care economy coverage
  const hasCare =
    active.has('childcare') ||
    active.has('eldercare_caregiving') ||
    active.has('family_parental_support');
  if (!hasCare) {
    recs.push({
      id: 'rec_add_care_economy',
      text: 'Nessuna iniziativa LIFE orientata a caregiver, genitorialità o supporto familiare rilevata. Questo segmento raggiunge popolazioni con bassa propensione alla partecipazione.',
      priority: 'media',
      targetSubcategory: 'family_parental_support',
    });
  }

  // General concentration
  if (
    (concentrationStatus === 'single_category_dominant' ||
      concentrationStatus === 'highly_concentrated') &&
    recs.length < 3
  ) {
    recs.push({
      id: 'rec_diversify_life_portfolio',
      text: 'Diversificare il portfolio LIFE aumenta la copertura su popolazioni diverse: chi ha figli, chi si prende cura di anziani, chi necessita di supporto psicologico hanno bisogni differenti.',
      priority: 'media',
    });
  }

  // Privacy warning present
  if (privacyWarningLevel === 'hard') {
    recs.push({
      id: 'rec_privacy_review',
      text: 'Concentrazione LIFE elevata. Valuta una revisione del portfolio con un advisor KORA per verificare che la composizione non produca inferenze su segmenti demografici sensibili.',
      priority: 'alta',
    });
  }

  return recs;
}

// ── Core computation ──────────────────────────────────────────────────────────

export class LifeDiversityService {
  canAccess(role: KoraRole): boolean {
    return ALLOWED_ROLES.has(role);
  }

  // Primary public method — derives LIFE programs from BTI record demo scenario.
  // Returns null when role has no access or LIFE share is 0.
  computeFromBTI(
    btiRecord: BudgetToHumanImpactRecord,
    role: KoraRole,
  ): LifeDiversitySummary | null {
    if (!this.canAccess(role)) return null;

    const lifeSpend = (btiRecord.spend_by_pillar as Record<string, number>)['LIFE'] ?? 0;
    const lifeShare =
      btiRecord.total_people_welfare_budget > 0
        ? lifeSpend / btiRecord.total_people_welfare_budget
        : 0;

    // lifeTotalIU: use deep_activation_by_pillar.LIFE as spend-proxy (EUR, not IU count)
    const lifeTotalIU =
      (btiRecord.deep_activation_by_pillar as Record<string, number>)['LIFE'] ?? 0;

    // Load synthetic demo programs for the scenario
    const programNames =
      DEMO_LIFE_PROGRAMS[btiRecord.scenario_id] ?? DEMO_LIFE_PROGRAMS.default;

    return this.computeFromProgramNames(programNames, lifeShare, lifeTotalIU);
  }

  // Test-friendly and general-purpose method — classifies from raw program descriptors.
  // No role check — caller is responsible for access control upstream.
  computeFromProgramNames(
    programNames: string[],
    lifeShare: number,
    lifeTotalIU: number,
  ): LifeDiversitySummary {
    // Classify each program name to a subcategory
    const subcategoryHits = new Map<LifeSubcategoryCode, number>();
    for (const name of programNames) {
      const code = classifyLifeSubcategory(name);
      if (code) {
        subcategoryHits.set(code, (subcategoryHits.get(code) ?? 0) + 1);
      }
    }

    const activeSubcategories = [...subcategoryHits.keys()];
    const totalHits = [...subcategoryHits.values()].reduce((a, b) => a + b, 0);

    // Dominant subcategory: most hits
    let dominantSubcategory: LifeSubcategoryCode | null = null;
    let dominantHits = 0;
    for (const [code, hits] of subcategoryHits.entries()) {
      if (hits > dominantHits) {
        dominantHits = hits;
        dominantSubcategory = code;
      }
    }
    const dominantSubcategoryShare =
      totalHits > 0 && dominantHits > 0 ? dominantHits / totalHits : 0;

    const diversityScore = activeSubcategories.length / ALL_SUBCATEGORY_CODES.length;
    const concentrationStatus = toConcentrationStatus(activeSubcategories.length);

    const missingSubcategories = ALL_SUBCATEGORY_CODES.filter(
      (c) => !subcategoryHits.has(c),
    );

    const { level: privacyWarningLevel, message: privacyWarningMessage } =
      computePrivacyWarning(lifeShare, dominantSubcategory);

    const recommendations = buildRecommendations(
      activeSubcategories,
      dominantSubcategory,
      diversityScore,
      lifeShare,
      concentrationStatus,
      privacyWarningLevel,
    );

    return {
      lifeShare,
      lifeTotalIU,
      activeSubcategories,
      dominantSubcategory,
      dominantSubcategoryShare,
      diversityScore,
      concentrationStatus,
      privacyWarningLevel,
      privacyWarningMessage,
      missingSubcategories,
      recommendations,
      methodologyStatus: 'pre_empirical_calibration',
      not_kora_index_component: true,
    };
  }
}

export const lifeDiversityService = new LifeDiversityService();
