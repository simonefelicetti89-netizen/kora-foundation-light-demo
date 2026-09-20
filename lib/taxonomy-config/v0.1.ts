// lib/taxonomy-config/v0.1.ts
// KORA-WP-120 — Canonical Service/Action Taxonomy Reconciliation.
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE IS — AND IS NOT
// ═══════════════════════════════════════════════════════════════════════════
//
// This is the canonical, versioned semantic-authority DECLARATION for KORA's
// classification vocabularies — mirroring lib/methodology-config/v0.1.ts's
// own versioned-config precedent (registry 142's own instruction). It is a
// config-read helper, not a runtime engine: it declares which vocabulary is
// authoritative for which axis, documents the mapping between vocabularies
// that must stay distinct, and re-exports (never redefines) each existing
// canonical type. It introduces exactly ONE genuinely new typed vocabulary
// (FiscalBudgetPerimeter, §4 below) — everything else here is reconciliation
// and mapping over types that already exist and are already live.
//
// It does NOT: recompute IU/Pillar/KORA Index/BTI/Confidence (zero import
// of any scoring/methodology function — grep-verifiable); create a DB table
// or migration; rename any existing exported type, field, or persisted
// column; change any existing runtime consumer's behavior (every mapping
// below is new, additive documentation — nothing here is imported by
// raw-to-uef-interpreter.ts, eligibility-gate.ts, or any live ingestion
// path in this WP); or pre-select docs/04's exact conceptual list as literal
// runtime truth (see §4's own disclosed reconciliation).
//
// ═══════════════════════════════════════════════════════════════════════════
// PRE-CHECK FINDINGS — full repository inventory, performed before writing
// a single line of this file (see .kora-audit/output/1NN_KORA_WP_120_...
// for the complete inventory table; summarized here for anyone reading only
// this module).
// ═══════════════════════════════════════════════════════════════════════════
//
// 1. data/synthetic/action-taxonomy.json — registry 142's own "Existing
//    Paths" citation for this WP is STALE: the file was already retired at
//    commit 58695b8 ("refactor: retire legacy eligibility gate service"),
//    confirmed via `git log --follow`. Its own retirement test
//    (tests/unit/b-truth-ingestion-normalizer-retirement.test.ts)
//    independently re-verified zero real callers and zero type-only callers
//    at removal time. No compatibility mapping is needed — there is nothing
//    live to be compatible with. This is disclosed as a real finding, not
//    silently corrected in the registry (out of this WP's own authorized
//    scope) and not silently assumed away.
//
// 2. ActionFamily (lib/types/index.ts) is ALREADY the canonical, live,
//    single Action Family authority — not fragmented. It is the exact key
//    space of data/methodology/methodology-config.json's own
//    `bc_by_action_family` (the real Base Contribution Matrix, Stage 7 of
//    the 14-stage algorithm, read only through the versioned
//    lib/methodology-config/v0.1.ts loader — never hardcoded elsewhere),
//    and is assigned per raw record during real ingestion
//    (lib/ingestion/raw-to-uef-interpreter.ts). This WP re-exports it
//    (§2 below) rather than redeclaring it — a second declaration would
//    itself be exactly the fragmentation this WP exists to prevent.
//
// 3. Pillar (PillarCode, lib/types/index.ts, from lib/constants/kora.ts's
//    PILLAR_CODES) is the constitutional 5-pillar authority (CLAUDE.md §4).
//    Assigned independently per record (`primary_pillar`) — NOT derived
//    from ActionFamily in the general ingestion path. A reverse
//    Pillar->ActionFamily fallback map exists ONLY in two Commons/
//    Contribution files (lib/commons/cross-company-attribution.ts,
//    lib/kora-contribution/contribution-pipeline-input.ts) for
//    constructing a synthetic "virtual UEF" from a KORA Space booking,
//    which has no independently-classified action_family of its own.
//    Untouched by this WP.
//
// 4. A cosmetic, harmless DERIVED VIEW was found and is disclosed, not
//    fixed (out of scope): lib/design/kora-design-tokens.ts's own
//    `PillarColorKey` (keyof PILLAR_COLORS) is a structurally separate
//    type declaration from PillarCode with identical literal membership
//    (LIFE/GROWTH/CONNECTION/IMPACT/LEGACY) — a legitimate module-boundary
//    separation (design tokens shouldn't import domain types), not live
//    fragmentation of meaning.
//
// 5. lib/partner-activities/catalog.ts's PartnerActivityType (12 values)
//    and FiscalCategory (13 values) are a genuinely distinct semantic
//    layer — the file's own header already explains why: "A Partner
//    Activity is NOT a KORA Space initiative... inspired by the
//    classification shape of data/synthetic/action-taxonomy.json...
//    without importing or mutating it — that file classifies
//    already-uploaded company event data, not partner-offered
//    activities." That reasoning is preserved unchanged. The real,
//    previously-undocumented gap this WP closes: catalog.ts had ZERO
//    reference to ActionFamily anywhere, so a Partner Activity "packaged
//    into an initiative" (the file's own documented future path) had no
//    deterministic bridge to the canonical Action Family vocabulary. §5
//    below adds that bridge as an explicit, reviewable mapping table —
//    catalog.ts itself is NOT modified.
//
// 6. docs/04-fiscal-policy-eligibility-layer.md is an approved CONCEPTUAL
//    architecture doc defining 4 dimensions (Impact Pillar / Fiscal-Budget
//    Perimeter / Partner-Service Eligibility / Policy Rules). Its own text
//    states the Fiscal/Budget Perimeter list "must be configurable per
//    country and per company. It is not a fixed, universal list" — so its
//    exact 8-item prose list is NOT elevated verbatim into a hardcoded
//    runtime enum here (per this WP's own §22 instruction). Instead, §4
//    below formalizes the closest thing that already IS live, typed-free
//    runtime truth: the raw `budget_class` ingestion field (real column
//    name declared in lib/data-intake/column-mapping.ts's own
//    CanonicalIntakeField list; real permitted values previously
//    documented only as prose in docs/PILOT_DATA_INTAKE_READINESS.md,
//    never as a TS type anywhere) — the genuine current runtime
//    projection of doc 04's Dimension 2, disclosed as a partial, not 1:1,
//    mapping onto doc 04's own broader conceptual list.
//
// 7. A separate, DIFFERENT "budget_class"-named value exists inside
//    lib/ingestion/raw-to-uef-interpreter.ts's own deriveBudgetClass()
//    function (deep_activation / economic_relief / compliance_blocked /
//    unknown — a 4-value classification derived from EligibilityClass +
//    amount, for BTI's own spend-bucket purposes). This is a genuine
//    naming coincidence, not a live data collision: the derived value is
//    pushed only into a `reasonCodes` diagnostic string tag
//    (`budget_class:${budgetClass}`), never written into
//    `payload.budget_class` itself — confirmed directly against
//    lib/live/uef-to-scoring-records.ts, which reads `payload.budget_class`
//    as the raw uploaded value, unaffected by the derived variable.
//    Disclosed here so a future reader does not conflate the two.
//
// ═══════════════════════════════════════════════════════════════════════════

export const TAXONOMY_CONFIG_VERSION = 'v0.1';

// ── §1. Canonical Action Family authority — RE-EXPORT, never redeclared ───
// The one and only Action Family vocabulary. Declaring a second one here
// would itself be the fragmentation this WP exists to prevent.

import type { ActionFamily, PillarCode } from '@/lib/types';
export type { ActionFamily, PillarCode };

export const ACTION_FAMILIES: readonly ActionFamily[] = [
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

// ── §2. Canonical Pillar authority — RE-EXPORT, never redeclared ─────────

export const PILLARS: readonly PillarCode[] = [
  'LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY',
] as const;

// ── §3. Retired vocabularies — closed, documented, no live adoption work ──

export interface RetiredVocabulary {
  path: string;
  retiredAtCommit: string;
  reason: string;
  liveConsumersAtRetirement: number;
  compatibilityMappingRequired: false;
}

export const RETIRED_VOCABULARIES: readonly RetiredVocabulary[] = [
  {
    path: 'data/synthetic/action-taxonomy.json',
    retiredAtCommit: '58695b8',
    reason: 'Orphan of an already-retired ingestion pipeline (IngestionPipelineService); zero real or type-only callers at removal time, independently re-verified.',
    liveConsumersAtRetirement: 0,
    compatibilityMappingRequired: false,
  },
] as const;

// ── §4. Fiscal / Budget Perimeter — the ONE genuinely new typed vocabulary ──
// Formalizes what is already live, untyped runtime truth: the raw
// `budget_class` ingestion column (lib/data-intake/column-mapping.ts's own
// CanonicalIntakeField). Its permitted values previously existed only as
// prose in docs/PILOT_DATA_INTAKE_READINESS.md — never as a TS type. This
// is the current runtime PROJECTION of doc 04's own conceptual Dimension 2
// ("Fiscal/Budget Perimeter"), disclosed as partial, not a 1:1 restatement
// of doc 04's broader prose list (doc 04 names two categories — "Non-Tax-
// Advantaged Corporate Budget" and "Custom internal policy budget" — that
// have no live runtime column value yet; not fabricated here).
//
// Distinct axis from ActionFamily, Pillar, and PartnerActivityType/
// FiscalCategory (lib/partner-activities/catalog.ts) — never collapsed
// into any of them (doc 04's own constitutional rule, preserved).

export type FiscalBudgetPerimeter =
  | 'welfare'            // Italian welfare aziendale / fringe benefit — doc 04 Dim.2 "Welfare Aziendale / Fringe Benefit"
  | 'fringe_benefit'     // tax-advantaged flexible benefits — doc 04 Dim.2 "Welfare Aziendale / Fringe Benefit"
  | 'hr_learning'        // L&D / professional development spend — doc 04 Dim.2 "Training & Professional Development Budget"
  | 'esg_volunteering'   // CSR/ESG/volunteering spend — doc 04 Dim.2 "ESG / CSR Budget"
  | 'compliance_hse'     // mandatory HSE/safety spend — outside doc 04's benefit-oriented list; blocked-compliance adjacent
  | 'compliance_legal'   // mandatory legal/contractual spend — outside doc 04's benefit-oriented list; blocked-compliance adjacent
  | 'mixed'              // spans more than one perimeter — no doc 04 analog, a real ingestion-time occurrence
  | 'unknown';           // not yet classified at ingestion time

export const FISCAL_BUDGET_PERIMETERS: readonly FiscalBudgetPerimeter[] = [
  'welfare', 'fringe_benefit', 'hr_learning', 'esg_volunteering',
  'compliance_hse', 'compliance_legal', 'mixed', 'unknown',
] as const;

export const FISCAL_BUDGET_PERIMETER_LABELS: Record<FiscalBudgetPerimeter, string> = {
  welfare:          'Welfare aziendale',
  fringe_benefit:   'Fringe benefit',
  hr_learning:      'Formazione / sviluppo HR',
  esg_volunteering: 'ESG / volontariato',
  compliance_hse:   'Compliance salute e sicurezza',
  compliance_legal: 'Compliance legale/contrattuale',
  mixed:            'Misto (più perimetri)',
  unknown:          'Non classificato',
};

// ── §5. Partner Activity reconciliation — MAPPING, catalog.ts untouched ───
// lib/partner-activities/catalog.ts's own PartnerActivityType/FiscalCategory
// remain the canonical vocabulary for that layer (concrete Partner
// Offering classification) — this is a bridge TO the canonical Action
// Family / Fiscal Budget Perimeter axes, not a replacement of either side.
// Best-effort, deterministic, one entry per real PartnerActivityType value
// (12/12) and real FiscalCategory value (13/13) — reviewed, not guessed at
// call time. Used only if/when a Partner Activity is ever "packaged into
// an initiative" (catalog.ts's own documented future path) or referenced
// by a future Prime intervention perimeter — never invoked by any current
// runtime path (catalog.ts remains pure static/mock data, unmodified).

import type { PartnerActivityType, FiscalCategory } from '@/lib/partner-activities/catalog';

export const PARTNER_ACTIVITY_TYPE_TO_ACTION_FAMILY: Record<PartnerActivityType, ActionFamily> = {
  course:                 'professional_growth',
  coaching:                'professional_growth',
  counselling:             'health_and_wellbeing',
  healthcare_prevention:   'health_and_wellbeing',
  sport_wellbeing:         'health_and_wellbeing',
  voucher:                 'economic_relief',
  mobility:                'economic_relief',
  family_education:        'family_and_care',
  culture:                 'inclusion_and_connection',
  volunteering_service:    'territorial_impact',
  financial_guidance:      'future_and_legacy',
  other:                   'economic_relief', // no canonical signal available — safest, most conservative default; never 'blocked_compliance' (that would misclassify a legitimate offering as non-eligible)
};

export const FISCAL_CATEGORY_TO_BUDGET_PERIMETER: Record<FiscalCategory, FiscalBudgetPerimeter> = {
  fringe_benefit:           'fringe_benefit',
  welfare_aziendale:        'welfare',
  formazione:               'hr_learning',
  salute_prevenzione:       'welfare',
  sport_benessere:          'welfare',
  famiglia_istruzione:      'welfare',
  mobilita_trasporti:       'fringe_benefit',
  cultura_tempo_libero:     'welfare',
  previdenza_assistenza:    'welfare',
  servizi_persona:          'welfare',
  convenzione_commerciale:  'mixed',    // spans multiple perimeters depending on the specific convention — no single deterministic bucket
  esg_volontariato:         'esg_volunteering',
  da_classificare:          'unknown',
};

// ── §6. Read-only accessors — the config-read helper this WP's own registry
// entry calls for ("Service/API: a config-read helper only"). No mutation,
// no recomputation, no side effect. ──────────────────────────────────────

export function getTaxonomyConfigVersion(): string {
  return TAXONOMY_CONFIG_VERSION;
}

export function getActionFamilyForPartnerActivityType(type: PartnerActivityType): ActionFamily {
  return PARTNER_ACTIVITY_TYPE_TO_ACTION_FAMILY[type];
}

export function getBudgetPerimeterForFiscalCategory(category: FiscalCategory): FiscalBudgetPerimeter {
  return FISCAL_CATEGORY_TO_BUDGET_PERIMETER[category];
}

export function isRetiredVocabularyPath(path: string): boolean {
  return RETIRED_VOCABULARIES.some((v) => v.path === path);
}
