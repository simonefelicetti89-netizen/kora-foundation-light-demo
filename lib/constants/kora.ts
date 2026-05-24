export const PILLAR_CODES = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;

export const KORA_INDEX_COMPONENTS = ['AR', 'MAR', 'NI', 'WB', 'PC', 'PB', 'EQ', 'VR', 'CO', 'CS'] as const;

// KORA Index v3 macroblock codes
export const MACROBLOCK_CODES = ['REACH', 'QUALITY', 'EQUITY', 'BTI'] as const;

// Foundation Light active product roles are intentionally simplified.
// Granular HR/ESG/Finance/Executive permissions are future permission layers, not active MVP roles.
export const KORA_ROLES = [
  'KORA_ADMIN',
  'COMPANY_ADMIN',
  'COMPANY_VIEWER',
  'WORKER',
  'PARTNER',
  'ADVISOR',
] as const;

export const SAFEGUARD_THRESHOLDS = {
  CLEAR: { AR: 0.40, MAR: 0.30 },
  WARNING: { AR_min: 0.20, AR_max: 0.40, MAR_min: 0.15, MAR_max: 0.30 },
  FLAGGED: { AR_max: 0.20, MAR_max: 0.15 },
} as const;

export const SAFE_AGGREGATION_THRESHOLD = 10;

export const CALIBRATION_STATUS = 'pre_empirical_calibration' as const;

export const COMPONENT_LABELS: Record<string, string> = {
  AR: 'Activation Rate',
  MAR: 'Meaningful Activation Rate',
  NI: 'Normalized Intensity',
  WB: 'Worker Balance',
  PC: 'Pillar Coverage',
  PB: 'Pillar Balance',
  EQ: 'Equity',
  VR: 'Verification Rate',
  CO: 'Continuity',
  CS: 'Confidence Score',
};

export const PILLAR_LABELS: Record<string, string> = {
  LIFE: 'Life',
  GROWTH: 'Growth',
  CONNECTION: 'Connection',
  IMPACT: 'Impact',
  LEGACY: 'Legacy',
};

export const EMPLOYER_ROLES = [
  'COMPANY_ADMIN',
  'COMPANY_VIEWER',
] as const;

export const WORKER_ROLES = ['WORKER'] as const;

export const ADMIN_ROLES = ['KORA_ADMIN'] as const;

// ── KORA Index v3 — Methodology versioning ─────────────────────────────────────

export const KORA_INDEX_VERSION = 'KORA Index v3' as const;
export const METHODOLOGY_CALIBRATION_VERSION = 'v0.1 pre-empirical calibration' as const;

// Updated to reflect KORA Index v3 — replaces prior 'KORA Methodology v0.1'
export const METHODOLOGY_VERSION = 'KORA Index v3 / KORA Methodology v0.1' as const;

// ── KORA Index v3 — Macroblock structure ───────────────────────────────────────
// KORA Index v3 = 25% Activation Reach + 30% Activation Quality
//               + 25% Distribution & Equity + 20% Budget-to-Human-Impact
// CS (Confidence Score) is EXTERNAL — weight = 0, shown as reliability indicator only.

export const MACROBLOCK_LABELS: Record<string, string> = {
  REACH:   'Activation Reach',
  QUALITY: 'Activation Quality',
  EQUITY:  'Distribution & Equity',
  BTI:     'Budget-to-Human-Impact',
};

export const MACROBLOCK_WEIGHTS: Record<string, number> = {
  REACH:   0.25,
  QUALITY: 0.30,
  EQUITY:  0.25,
  BTI:     0.20,
};

// Operational components that feed each macroblock.
// CS feeds no macroblock — it is external (weight = 0 in KORA Index v3).
// BTI score comes from the BudgetToHumanImpactEngine, not from component values.
export const MACROBLOCK_COMPONENTS: Record<string, string[]> = {
  REACH:   ['AR', 'MAR'],
  QUALITY: ['NI', 'VR', 'CO'],
  EQUITY:  ['WB', 'PC', 'PB', 'EQ'],
  BTI:     [],
};

// Reverse lookup: which macroblock each component belongs to.
// CS maps to 'external' — not a macroblock code.
export const COMPONENT_MACROBLOCK: Record<string, string> = {
  AR:  'REACH',
  MAR: 'REACH',
  NI:  'QUALITY',
  VR:  'QUALITY',
  CO:  'QUALITY',
  WB:  'EQUITY',
  PC:  'EQUITY',
  PB:  'EQUITY',
  EQ:  'EQUITY',
  CS:  'external',
};

// true for components excluded from KORA Index v3 computation
export const COMPONENT_EXTERNAL: Record<string, boolean> = {
  AR: false, MAR: false, NI: false, WB: false, PC: false,
  PB: false, EQ: false,  VR: false, CO: false, CS: true,
};

// ── Eligibility Gate ────────────────────────────────────────────────────────────
// Every item passes Eligible / Limited / Blocked classification before scoring.
// Blocked items generate 0 IU and 0 KORA Index contribution — not low weight, zero.

export const ELIGIBILITY_CLASSES = ['eligible', 'limited', 'blocked'] as const;

export const ELIGIBILITY_LABELS: Record<string, string> = {
  eligible: 'Eligible',
  limited:  'Limited',
  blocked:  'Blocked',
};

export const ELIGIBILITY_ITALIAN_LABELS: Record<string, string> = {
  eligible: 'Idoneo',
  limited:  'Sollievo Economico',
  blocked:  'Bloccato per Progettazione',
};

export const ELIGIBILITY_COPY: Record<string, string> = {
  eligible: 'Azioni idonee: possono generare Impact Units e contribuire al KORA Index.',
  limited:  'Non è spesa sbagliata. È spesa che può diventare più intelligente.',
  blocked:  'KORA non trasforma la compliance in impatto. La conformità legale è una baseline, non impatto.',
};

// ── Action taxonomy ─────────────────────────────────────────────────────────────

export const ACTION_FAMILIES = [
  'economic_relief',
  'family_and_care',
  'health_and_wellbeing',
  'professional_growth',
  'inclusion_and_connection',
  'territorial_impact',
  'future_and_legacy',
  'trust_and_flexibility_policy',
  'blocked_compliance',
] as const;

export const ACTION_FAMILY_LABELS: Record<string, string> = {
  economic_relief:              'Economic Relief',
  family_and_care:              'Famiglia e Cura',
  health_and_wellbeing:         'Salute e Benessere',
  professional_growth:          'Crescita Professionale',
  inclusion_and_connection:     'Inclusione e Connessione',
  territorial_impact:           'Impatto Territoriale',
  future_and_legacy:            'Futuro e Legacy',
  trust_and_flexibility_policy: 'Fiducia & Flessibilità Organizzativa',
  blocked_compliance:           'Compliance Obbligatoria',
};

export const EVENT_NATURES = [
  'monetary_benefit',
  'consumed_service',
  'training',
  'policy',
  'structural_policy',
  'collective_initiative',
  'territorial_initiative',
  'long_term_benefit',
  'partner_service',
  'blocked_compliance',
] as const;

// ── Structural Policy Taxonomy ─────────────────────────────────────────────────

export const STRUCTURAL_POLICY_SUBTYPES = [
  'time_autonomy_policy',
  'enhanced_leave_policy',
  'parental_care_policy',
  'caregiving_flexibility_policy',
  'hybrid_work_policy',
  'right_to_disconnect_policy',
  'meeting_hygiene_policy',
  'work_life_campus_policy',
  'solidarity_leave_policy',
  'inclusive_work_arrangement',
  'collective_agreement_people_policy',
] as const;

export const STRUCTURAL_POLICY_SUBTYPE_LABELS: Record<string, string> = {
  time_autonomy_policy:               'Autonomia del Tempo / Ferie Illimitate',
  enhanced_leave_policy:              'Congedo Migliorativo',
  parental_care_policy:               'Parental Care Policy',
  caregiving_flexibility_policy:      'Flessibilità Cura e Lavoro',
  hybrid_work_policy:                 'Smart Working / Lavoro Ibrido',
  right_to_disconnect_policy:         'Diritto alla Disconnessione',
  meeting_hygiene_policy:             'No Meeting Zone',
  work_life_campus_policy:            'Campus Work-Life (Kids@Campus / Dog@Campus)',
  solidarity_leave_policy:            'Fondo Solidarietà Ferie',
  inclusive_work_arrangement:         'Accordi di Inclusione Lavorativa',
  collective_agreement_people_policy: 'Accordo Integrativo People Migliorativo',
};

export const MANDATORY_STATUSES = [
  'legal_mandatory',
  'role_mandatory',
  'contractual_mandatory',
  'company_required_compliance',
  'company_required_development',
  'optional',
  'voluntary',
  'developmental',
] as const;

// ── Budget-to-Human-Impact — canonical doctrine copy ────────────────────────────
// These strings are canonical and must not be paraphrased in dashboard copy.

// CCNL improvement signals — when these co-occur with ccnl/accordo keywords,
// the item is a voluntary improvement beyond the contractual minimum → eligible.
export const CCNL_IMPROVEMENT_SIGNALS: ReadonlyArray<string> = [
  'migliorativo', 'aggiuntivo', 'aggiuntiva', 'oltre il minimo', 'superiore al minimo',
  'accordo integrativo', 'integrativo', 'incrementale',
  'eccedente', 'supplementare', 'rafforzato', 'potenziato',
  'beyond legal', 'additional leave', 'enhanced leave',
] as const;

export const BTI_DOCTRINE = {
  core:          'KORA misura ciò che accade dopo la spesa.',
  budget_neq_activation: 'Budget allocated ≠ Budget activated.',
  spend_neq_impact:      'Budget spent ≠ Human impact.',
  relief_neq_activation: 'Economic relief ≠ human activation.',
  limited_reframe:       'Non è spesa sbagliata. È spesa che può diventare più intelligente.',
  blocked_copy:          'KORA non trasforma la compliance in impatto.',
  baseline_copy:         'La conformità legale è una baseline, non impatto.',
  // Structural policy doctrine — non-suppressible when trust_and_flexibility_policy IUs are present
  policy_neq_partner:      'Non tutte le azioni KORA passano da un partner o da una fattura.',
  structural_recognizable: 'KORA riconosce anche policy organizzative strutturali, se formalizzate, verificabili, aggregate e privacy-safe.',
  trust_collective:        'La fiducia organizzativa è misurabile solo come capacità collettiva, non come controllo individuale.',
  non_budget_mediated_note: 'Alcune policy strutturali generano Impact Units senza un costo diretto associato. Il BTI Engine separa le IU non budget-mediated dal calcolo di cost efficiency: la metrica di costo si applica solo alle attivazioni budget-mediated.',
} as const;
