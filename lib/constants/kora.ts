export const PILLAR_CODES = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;

// Sprint 1 — IU-centric: NI→EVQ, VR→INT, CO→CONT, WB→EQW, EQ→EQS
export const KORA_INDEX_COMPONENTS = ['AR', 'MAR', 'EVQ', 'INT', 'CONT', 'EQW', 'EQS', 'PC', 'PB', 'CS'] as const;

// KORA Index v1.0 macroblock codes
export const MACROBLOCK_CODES = ['REACH', 'QUALITY', 'EQUITY', 'BTI'] as const;

// ── Canonical role model (ROLE-01, 2026-07-04) ────────────────────────────────
// Single source of truth for every role string valid anywhere in KORA's
// TypeScript layer. Before this reconciliation, lib/auth/access-matrix.ts and
// this file each maintained an independent, silently-diverging role list (one
// had DEMO_VIEWER, the other ADVISOR) — see docs/access-matrix.md's history
// note. Do not add a new role string anywhere else; extend one of the arrays
// below and let KoraRole (lib/types/index.ts) and lib/auth/access-matrix.ts's
// KoraRole both pick it up automatically (both derive from KORA_ROLES).

// Real, session-guard-enforced, RLS-backed today. See lib/auth/kora-session.ts.
export const ACTIVE_KORA_ROLES = ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER'] as const;

// Exists in the type/permission/routing layer (lib/permissions/index.ts) but
// has NO session guard in lib/auth/kora-session.ts and no live enforced route
// today (`/advisor` redirects to a static demo). Treat as unreachable in
// production until that changes — see docs/FUTURE_ROLES_AND_SURFACES.md.
export const FUTURE_KORA_ROLES = ['ADVISOR'] as const;

// Synthetic-only by design — never backed by a real Supabase Auth user or an
// RLS grant on any live table. See lib/auth/access-matrix.ts, lib/demo-state/.
export const DEMO_KORA_ROLES = ['DEMO_VIEWER'] as const;

// Historical — removed at the app layer (B143; lib/permissions/index.ts's
// isViewerRole() always returns false). Never valid in KORA_ROLES below —
// kept only so tests can assert it stays removed, not to be reintroduced casually.
export const REMOVED_KORA_ROLES = ['COMPANY_VIEWER'] as const;

// Foundation Light active product roles are intentionally simplified.
// Granular HR/ESG/Finance/Executive permissions are future permission layers, not active MVP roles.
// All role strings valid anywhere in the app — active + future + demo.
export const KORA_ROLES = [
  ...ACTIVE_KORA_ROLES,
  ...FUTURE_KORA_ROLES,
  ...DEMO_KORA_ROLES,
] as const;

// Product-facing subset of KORA_ROLES — excludes DEMO_VIEWER. Use this where
// "a role a real product user/account could have" is the intended meaning
// (e.g. account provisioning), as opposed to KoraRole/KORA_ROLES, which also
// recognizes the synthetic demo-only role for the access-matrix/privacy layer.
export const ACTIVE_PRODUCT_KORA_ROLES = [...ACTIVE_KORA_ROLES, ...FUTURE_KORA_ROLES] as const;

export const SAFEGUARD_THRESHOLDS = {
  CLEAR: { AR: 0.40, MAR: 0.30 },
  WARNING: { AR_min: 0.20, AR_max: 0.40, MAR_min: 0.15, MAR_max: 0.30 },
  FLAGGED: { AR_max: 0.20, MAR_max: 0.15 },
} as const;

export const SAFE_AGGREGATION_THRESHOLD = 10;

export const CALIBRATION_STATUS = 'pre_empirical_calibration' as const;

export const COMPONENT_LABELS: Record<string, string> = {
  AR:   'Activation Rate',
  MAR:  'Meaningful Activation Rate',
  EVQ:  'Evidence Quality',
  INT:  'Impact Intensity',
  CONT: 'Continuity',
  EQW:  'Equity (Workers)',
  EQS:  'Equity (Segments)',
  PC:   'Pillar Coverage',
  PB:   'Pillar Balance',
  CS:   'Confidence Score',
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
] as const;

export const WORKER_ROLES = ['WORKER'] as const;

export const ADMIN_ROLES = ['KORA_ADMIN'] as const;

// ── Versioning canonico (public/client-facing product label) ──────────────────────
// Product version:     KORA Foundation Light
// Methodology version: KORA Index v1.0 — public/client-facing label for all UI,
//                       reports, Decision Pack, and newly generated output metadata.
//                       The internal 10-component macroblock architecture generation
//                       (see CLAUDE.md §5, "KORA Methodology Architecture v3") is a
//                       separate axis — never used as the public product version label.
// Calibration status:  pre_empirical_calibration (non è una versione prodotto)

export const PRODUCT_VERSION              = 'KORA Foundation Light' as const;
export const KORA_INDEX_VERSION           = 'KORA Index v1.0' as const;
export const METHODOLOGY_VERSION          = 'KORA Index v1.0' as const;
export const METHODOLOGY_CALIBRATION_VERSION = 'pre_empirical_calibration' as const;

// ── KORA Index v1.0 — Macroblock structure ───────────────────────────────────────
// Sprint 1: IU-centric. QUALITY = EVQ+INT+CONT. EQUITY = EQW+EQS+PC+PB.
// CS (Confidence Score) is EXTERNAL — weight = 0, shown as reliability indicator only.
// Componenti insufficient_data contribuiscono 0, nessuna redistribuzione pesi.

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
// CS feeds no macroblock — it is external (weight = 0 in KORA Index v1.0).
// BTI score comes from the BudgetToHumanImpactEngine, not from component values.
export const MACROBLOCK_COMPONENTS: Record<string, string[]> = {
  REACH:   ['AR', 'MAR'],
  QUALITY: ['EVQ', 'INT', 'CONT'],
  EQUITY:  ['EQW', 'EQS', 'PC', 'PB'],
  BTI:     [],
};

// Reverse lookup: which macroblock each component belongs to.
// CS maps to 'external' — not a macroblock code.
export const COMPONENT_MACROBLOCK: Record<string, string> = {
  AR:   'REACH',
  MAR:  'REACH',
  EVQ:  'QUALITY',
  INT:  'QUALITY',
  CONT: 'QUALITY',
  EQW:  'EQUITY',
  EQS:  'EQUITY',
  PC:   'EQUITY',
  PB:   'EQUITY',
  CS:   'external',
};

// true for components excluded from KORA Index v1.0 computation
export const COMPONENT_EXTERNAL: Record<string, boolean> = {
  AR: false, MAR: false, EVQ: false, INT: false, CONT: false,
  EQW: false, EQS: false, PC: false, PB: false, CS: true,
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

// ── B108: Score interpretation bands ─────────────────────────────────────────────
// Score bands — leggono da methodology-config.json (import diretto per evitare dipendenza ciclica
// con lib/methodology-config/v0.1.ts che importa già da questo file).
// Unica fonte di verità: data/methodology/methodology-config.json["score_bands"].
// NON modificare i valori qui — aggiornare il JSON.
// pre_empirical_calibration — soglie provvisorie, da calibrare post-Delphi Study.

import rawConfig from '@/data/methodology/methodology-config.json';

export interface ScoreBand {
  min: number; max: number; key: string; labelIt: string; labelEn: string;
}

const _rawBands = (rawConfig as unknown as { score_bands?: { bands: ScoreBand[] } }).score_bands?.bands;

export const SCORE_BANDS: ScoreBand[] = _rawBands ?? [
  { min:  0, max:  30, key: 'weak',       labelIt: 'Attivazione debole',   labelEn: 'Weak Activation'  },
  { min: 30, max:  45, key: 'early',      labelIt: 'Attivazione iniziale', labelEn: 'Early Activation' },
  { min: 45, max:  60, key: 'developing', labelIt: 'In sviluppo',          labelEn: 'Developing'       },
  { min: 60, max:  75, key: 'solid',      labelIt: 'Solida',               labelEn: 'Solid'            },
  { min: 75, max: 101, key: 'leading',    labelIt: 'Matura / leader',      labelEn: 'Leading Maturity' },
];

export function getScoreBand(score: number): ScoreBand {
  return SCORE_BANDS.find(b => score >= b.min && score < b.max) ?? SCORE_BANDS[SCORE_BANDS.length - 1]!;
}

export const SCORE_BAND_DISCLAIMER =
  'Le bande di punteggio sono indicative e pre_empirical_calibration. Non rappresentano benchmark validati.' as const;
