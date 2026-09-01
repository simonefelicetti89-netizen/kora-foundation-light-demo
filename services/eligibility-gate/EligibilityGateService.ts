// services/eligibility-gate/EligibilityGateService.ts
// ══════════════════════════════════════════════════════════════════════════════
// TAXONOMY / PREPROCESSING CLASSIFIER — NOT the live scoring eligibility engine.
// ══════════════════════════════════════════════════════════════════════════════
//
// This service classifies human-readable action descriptions against the BCM
// taxonomy (action-taxonomy.json). It is used in:
//   - Admin BCM Mapping Review (AI Upload Studio)
//   - Pre-ingestion operator classification UI
//   - Taxonomy exploration and confidence preview
//
// It operates on EligibilityClassificationInput {name, description, category}
// and returns EligibilityClassificationResult with taxonomy metadata.
//
// IT DOES NOT CONTROL SCORING.
//
// The live scoring eligibility engine is:
//   lib/kora-engine/eligibility-gate.ts  ← canonical, pipeline-authoritative
//
// That engine operates on RawUploadedRecord | NormalizedUEFRecord and is the
// ONLY classifier that determines IU computation and KORA Index contribution.
// This service and the canonical engine may disagree on edge cases — the
// canonical engine always wins for scoring purposes.
//
// When to use which:
//   EligibilityGateService (this file) — taxonomy lookup, admin UI, BCM matching
//   lib/kora-engine/eligibility-gate.ts — any scoring, IU, UEF, KORA Index path

import type {
  ActionTaxonomyEntry,
  ActionFamily,
  EventNature,
  MandatoryStatus,
  PillarCode,
  PrivacySensitivity,
  DepthLevel,
  EligibilityClassificationInput,
  EligibilityClassificationResult,
} from '@/lib/types';
import { BTI_DOCTRINE, ELIGIBILITY_COPY, CCNL_IMPROVEMENT_SIGNALS } from '@/lib/constants/kora';
import rawTaxonomy from '@/data/synthetic/action-taxonomy.json';

// ── Types ─────────────────────────────────────────────────────────────────────
// EligibilityClassificationInput / EligibilityClassificationResult moved to
// @/lib/types (F-03/F-04 dependency-blocker resolution, 2026-09-02) — pure
// data contracts, no computation attached. Re-exported here for backward
// compatibility with existing importers (IngestionPipelineService.ts,
// IngestionSimulatorService.ts both import them from this module).
export type { EligibilityClassificationInput, EligibilityClassificationResult };

export interface EligibilitySummary {
  total: number;
  eligible_count: number;
  limited_count: number;
  blocked_count: number;
  review_required_count: number;
  eligible_pct: number;
  limited_pct: number;
  blocked_pct: number;
}

export interface IEligibilityGateService {
  getActionTaxonomy(): ActionTaxonomyEntry[];
  classifyAction(input: EligibilityClassificationInput): EligibilityClassificationResult;
  classifyActions(inputs: EligibilityClassificationInput[]): EligibilityClassificationResult[];
  getEligibilitySummary(results: EligibilityClassificationResult[]): EligibilitySummary;
}

// ── Seed type (raw JSON shape from action-taxonomy.json) ─────────────────────

interface SeedTaxonomyEntry {
  action_id: string;
  action_name: string;
  action_name_it: string;
  keywords: string[];
  action_family: string;
  fiscal_perimeter?: string;
  primary_pillar: string | null;
  secondary_pillars: string[];
  pillar_distribution: Record<string, number>;
  beneficiary_type: string;
  event_nature: string;
  economic_value_default?: number | null;
  duration_default?: number | null;
  frequency_default?: string | null;
  mandatory_status: string;
  kora_eligibility: string;
  evidence_required: boolean;
  verification_level: string;
  privacy_sensitivity: string;
  depth_level: string;
  additionality_level: string;
  reach_potential: string;
  continuity_potential: string;
  equity_relevance: string;
  eligible_for_worker_pib: boolean;
  eligible_for_company_index: boolean;
  eligible_for_contribution_index: boolean;
  eligible_for_value_chain_index: boolean;
  default_caps?: Record<string, number>;
  anti_gaming_rules?: string[];
  exclusion_reason?: string;
  explanation_text: string;
  explanation_text_it: string;
  // Structural policy extensions
  individual_usage_visible?: false;
  budget_mediated?: false;
  scoring_unit?: string;
}

const BLOCKED_MANDATORY_STATUSES: ReadonlySet<string> = new Set([
  'legal_mandatory',
  'role_mandatory',
  'contractual_mandatory',
  'company_required_compliance',
]);

// Keyword lists for rule-based fallback when no taxonomy entry matches.
// Blocked beats all — check first.
const BLOCKED_KEYWORD_PATTERNS: ReadonlyArray<string> = [
  'dpi', 'dispositivi protezione individuale', 'epc',
  'dvr', 'documento valutazione rischi',
  'duvri', 'rischi interferenziali',
  'pos sicurezza', 'piano operativo sicurezza',
  'hse', 'health safety environment',
  'sorveglianza sanitaria', 'idoneita mansione', 'idoneita alla mansione',
  'medico competente', 'giudizio idoneita', 'visita idoneita',
  'antincendio', 'primo soccorso obbligatori',
  'formazione sicurezza generale', 'formazione sicurezza specifica',
  'd.lgs 81', 'dlgs81', 'dlgs 81',
  'preposto', 'patentino carrellista', 'carrello elevatore obbligatori',
  'gdpr obbligatori', 'privacy obbligatori', 'formazione privacy',
  '231 obbligatori', 'modello 231', 'd.lgs 231', 'dlgs 231',
  'conformita legale', 'adempimento normativo',
  'formazione obbligatoria sicurezza', 'sicurezza obbligatoria',
];

const LIMITED_KEYWORD_PATTERNS: ReadonlyArray<string> = [
  'buoni pasto', 'buono pasto', 'meal voucher', 'ticket restaurant',
  'buoni benzina', 'buono benzina', 'fuel voucher', 'ticket carburante',
  'buoni spesa', 'buono spesa', 'shopping voucher',
  'gift card', 'carta regalo', 'buono regalo',
  'fringe benefit', 'welfare card', 'welfare credit', 'credito welfare',
  'voucher generico', 'buono generico', 'voucher multiuso',
  'convenzione commerciale', 'sconto aziendale',
];

// Structural policy recognition — positive patterns triggering trust_and_flexibility_policy
// These override the generic review_required fallback when no taxonomy entry matches.
const STRUCTURAL_POLICY_KEYWORD_PATTERNS: ReadonlyArray<string> = [
  'ferie illimitate',
  'ferie solidali',
  'fondo solidarietà ferie',
  'fondo solidarieta ferie',
  'diritto alla disconnessione',
  'no meeting zone',
  'no-meeting zone',
  'smart working policy',
  'lavoro ibrido',
  'hybrid working',
  'lavoro agile policy',
  'accordo smart working',
  'congedo parentale migliorativo',
  'congedo paternità migliorativo',
  'congedo paternita migliorativo',
  'congedo parentale aggiuntivo',
  'rol aggiuntivi',
  'permessi aggiuntivi caregiver',
  'flessibilità caregiver',
  'flessibilita caregiver',
  'flessibilità cura lavoro',
  'flessibilita cura lavoro',
  'kids@campus',
  'dog@campus',
  'campus famiglie',
  'accordo integrativo migliorativo',
  'accordo integrativo people',
  'policy di fiducia',
  'politica di fiducia',
  'inclusione lavorativa',
  'accordo inclusione',
  'rol disabilità',
  'rol disabilita',
  'accommodamento ragionevole',
];

// ── Normalizer ────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsAny(haystack: string, patterns: ReadonlyArray<string>): boolean {
  return patterns.some((p) => haystack.includes(normalize(p)));
}

// ── Blocked result builder ────────────────────────────────────────────────────

function buildBlockedResult(
  input: EligibilityClassificationInput,
  matchedId: string | null,
  reason: string,
  confidence: 'high' | 'medium' | 'low',
): EligibilityClassificationResult {
  return {
    input,
    matched_taxonomy_id: matchedId,
    kora_eligibility: 'blocked',
    action_family: 'blocked_compliance',
    event_nature: 'blocked_compliance',
    primary_pillar: null,
    secondary_pillars: [],
    pillar_distribution: {},
    mandatory_status: 'legal_mandatory',
    privacy_sensitivity: 'low',
    depth_level: 'none',
    additionality_level: 'none',
    confidence,
    reason,
    explanation_text: `${BTI_DOCTRINE.blocked_copy} ${BTI_DOCTRINE.baseline_copy}`,
    scoring_allowed: false,
    impact_units_allowed: false,
    worker_pib_allowed: false,
    company_index_allowed: false,
    contribution_index_allowed: false,
    value_chain_allowed: false,
    blocked_reason: reason,
    review_required: false,
  };
}

// ── Limited result builder ────────────────────────────────────────────────────

function buildLimitedResult(
  input: EligibilityClassificationInput,
  matchedId: string | null,
  confidence: 'high' | 'medium' | 'low',
): EligibilityClassificationResult {
  return {
    input,
    matched_taxonomy_id: matchedId,
    kora_eligibility: 'limited',
    action_family: 'economic_relief',
    event_nature: 'monetary_benefit',
    primary_pillar: null,
    secondary_pillars: [],
    pillar_distribution: {},
    mandatory_status: 'optional',
    privacy_sensitivity: 'low',
    depth_level: 'surface',
    additionality_level: 'low',
    confidence,
    reason: 'Cash-like or generic economic benefit — routes to Economic Relief tracking, not KORA Index Core.',
    explanation_text: `${ELIGIBILITY_COPY.limited} ${BTI_DOCTRINE.relief_neq_activation}`,
    scoring_allowed: false,
    impact_units_allowed: false,
    worker_pib_allowed: false,
    company_index_allowed: false,
    contribution_index_allowed: false,
    value_chain_allowed: false,
    review_required: false,
  };
}

// ── Review-required result builder ───────────────────────────────────────────

function buildReviewResult(
  input: EligibilityClassificationInput,
  reason: string,
  actionFamily: ActionFamily = 'professional_growth',
): EligibilityClassificationResult {
  const isStructuralPolicy = actionFamily === 'trust_and_flexibility_policy';
  return {
    input,
    matched_taxonomy_id: null,
    kora_eligibility: 'eligible',   // tentatively eligible pending review
    action_family: actionFamily,
    event_nature: isStructuralPolicy ? 'structural_policy' : 'training',
    primary_pillar: null,
    secondary_pillars: [],
    pillar_distribution: {},
    mandatory_status: 'optional',
    privacy_sensitivity: 'low',
    depth_level: 'surface',
    additionality_level: 'low',
    confidence: 'low',
    reason,
    explanation_text: 'Classificazione in attesa di revisione. Non è possibile assegnare Impact Units senza chiarire natura obbligatoria o volontaria e profondità di attivazione.',
    scoring_allowed: false,
    impact_units_allowed: false,
    worker_pib_allowed: false,
    company_index_allowed: false,
    contribution_index_allowed: false,
    value_chain_allowed: false,
    review_required: true,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export class EligibilityGateService implements IEligibilityGateService {
  private readonly entries: SeedTaxonomyEntry[];

  constructor() {
    const raw = rawTaxonomy as unknown as { data: SeedTaxonomyEntry[] };
    this.entries = raw.data;
  }

  getActionTaxonomy(): ActionTaxonomyEntry[] {
    return this.entries as unknown as ActionTaxonomyEntry[];
  }

  classifyAction(input: EligibilityClassificationInput): EligibilityClassificationResult {
    const searchText = normalize(
      [input.name, input.description ?? '', input.category ?? '', input.notes ?? ''].join(' '),
    );
    const inputMandatory = input.mandatory_status ?? '';

    // Rule 1 — Mandatory status override: hard-blocked statuses always produce BLOCKED.
    // Exception: contractual_mandatory with CCNL improvement signals → tentatively eligible
    // (CCNL improvement beyond minimum is voluntary, not contractual obligation).
    if (BLOCKED_MANDATORY_STATUSES.has(inputMandatory)) {
      const hasCcnlImprovementSignal =
        inputMandatory === 'contractual_mandatory' &&
        CCNL_IMPROVEMENT_SIGNALS.some((s) => searchText.includes(s));
      if (!hasCcnlImprovementSignal) {
        return buildBlockedResult(
          input,
          null,
          `Input mandatory_status "${inputMandatory}" — legal/role/contractual compliance items are blocked by design.`,
          'high',
        );
      }
      // Fall through: CCNL improvement override — treat as voluntary structural policy candidate
    }

    // Rule 2 — Try taxonomy keyword match (exact keyword hit against normalized text).
    const match = this.findBestTaxonomyMatch(searchText);

    if (match) {
      // Rule 2a — Taxonomy match is BLOCKED: return immediately, no override possible.
      if (match.kora_eligibility === 'blocked') {
        return buildBlockedResult(
          input,
          match.action_id,
          match.exclusion_reason ?? `Matched blocked taxonomy entry: ${match.action_id}.`,
          'high',
        );
      }

      // Rule 2b — Taxonomy match is LIMITED.
      if (match.kora_eligibility === 'limited') {
        return {
          ...buildLimitedResult(input, match.action_id, 'high'),
          explanation_text: match.explanation_text_it,
          blocked_reason: match.exclusion_reason,
        };
      }

      // Rule 2c — Taxonomy match is ELIGIBLE.
      // Secondary check: if the input text contains ambiguity signals despite the match,
      // downgrade to review_required (e.g. "Academy Operations" — could be role-mandatory).
      if (this.hasAmbiguitySignal(searchText, match)) {
        return buildReviewResult(
          input,
          `Taxonomy match (${match.action_id}) found but input contains ambiguity signal (e.g. "operations", "obbligatorio", or unclear mandatory/voluntary context). Review required.`,
        );
      }
      return this.buildEligibleFromTaxonomy(input, match, 'high');
    }

    // Rule 3 — No taxonomy match: apply rule-based keyword fallback.
    // Blocked beats all — if blocked keywords appear, classify blocked even without a match.
    if (containsAny(searchText, BLOCKED_KEYWORD_PATTERNS)) {
      return buildBlockedResult(
        input,
        null,
        'Blocked keywords detected (safety/compliance terms). Review to confirm.',
        'medium',
      );
    }

    // Limited beats generic eligible for cash-like items.
    if (containsAny(searchText, LIMITED_KEYWORD_PATTERNS)) {
      return buildLimitedResult(input, null, 'medium');
    }

    // Rule 4 — Ambiguous: require review.
    // If "obbligatorio" / "obbligatoria" / "mandatory" appears without clear eligible context,
    // prefer conservative classification with review_required.
    if (
      searchText.includes('obbligatori') ||
      searchText.includes('mandatory') ||
      searchText.includes('compliance')
    ) {
      return buildReviewResult(
        input,
        'Term "obbligatorio/mandatory/compliance" detected without clear eligibility signal. Conservative classification pending review.',
      );
    }

    // Rule 5 — Training term present but no mandatory flag → review (Academy case).
    if (
      (searchText.includes('academy') || searchText.includes('operations')) &&
      !searchText.includes('volontar') &&
      !searchText.includes('optional') &&
      !searchText.includes('sviluppo')
    ) {
      return buildReviewResult(
        input,
        'Academy/operations context without voluntary signal — classification pending review to confirm developmental vs. role-mandatory nature.',
      );
    }

    // Rule 6 — Structural policy signal detected but no taxonomy match.
    // Use trust_and_flexibility_policy as the review default instead of professional_growth.
    // The policy is tentatively eligible pending formal documentation review.
    if (containsAny(searchText, STRUCTURAL_POLICY_KEYWORD_PATTERNS)) {
      return buildReviewResult(
        input,
        'Structural organizational policy signal detected — pending verification of formalization, coverage data, and beyond-legal-minimum status. Tentatively eligible as trust_and_flexibility_policy.',
        'trust_and_flexibility_policy',
      );
    }

    // Rule 7 — No signal → review required with low confidence.
    return buildReviewResult(
      input,
      'Insufficient information to classify. Human review required before scoring.',
    );
  }

  classifyActions(inputs: EligibilityClassificationInput[]): EligibilityClassificationResult[] {
    return inputs.map((i) => this.classifyAction(i));
  }

  getEligibilitySummary(results: EligibilityClassificationResult[]): EligibilitySummary {
    const total = results.length;
    if (total === 0) {
      return { total: 0, eligible_count: 0, limited_count: 0, blocked_count: 0, review_required_count: 0, eligible_pct: 0, limited_pct: 0, blocked_pct: 0 };
    }

    const eligible_count = results.filter((r) => r.kora_eligibility === 'eligible' && !r.review_required).length;
    const limited_count  = results.filter((r) => r.kora_eligibility === 'limited').length;
    const blocked_count  = results.filter((r) => r.kora_eligibility === 'blocked').length;
    const review_required_count = results.filter((r) => r.review_required).length;

    return {
      total,
      eligible_count,
      limited_count,
      blocked_count,
      review_required_count,
      eligible_pct: eligible_count / total,
      limited_pct:  limited_count  / total,
      blocked_pct:  blocked_count  / total,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private findBestTaxonomyMatch(normalizedText: string): SeedTaxonomyEntry | null {
    let bestMatch: SeedTaxonomyEntry | null = null;
    let bestScore = 0;

    for (const entry of this.entries) {
      const score = entry.keywords.reduce((s, kw) => {
        return normalizedText.includes(normalize(kw)) ? s + kw.split(' ').length : s;
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    // Require at least one keyword token matched to avoid false positives.
    return bestScore > 0 ? bestMatch : null;
  }

  // Returns true when the matched taxonomy entry is eligible but the raw input text
  // contains signals that cast doubt on whether the item is truly voluntary/developmental.
  // Conservative: prefers review over premature scoring of ambiguous items.
  private hasAmbiguitySignal(normalizedText: string, match: SeedTaxonomyEntry): boolean {
    // "operations" adjacent to "academy" or "training" without a voluntary qualifier
    const hasOperationsFlag =
      normalizedText.includes('operations') &&
      !normalizedText.includes('volontar') &&
      !normalizedText.includes('optional') &&
      !normalizedText.includes('sviluppo') &&
      !normalizedText.includes('developmental');

    // Any "mandatory" signal on an otherwise eligible match
    const hasMandatoryFlag =
      normalizedText.includes('obbligatori') && match.kora_eligibility === 'eligible';

    return hasOperationsFlag || hasMandatoryFlag;
  }

  private buildEligibleFromTaxonomy(
    input: EligibilityClassificationInput,
    entry: SeedTaxonomyEntry,
    confidence: 'high' | 'medium' | 'low',
  ): EligibilityClassificationResult {
    return {
      input,
      matched_taxonomy_id: entry.action_id,
      kora_eligibility: 'eligible',
      action_family:    entry.action_family as ActionFamily,
      event_nature:     entry.event_nature  as EventNature,
      primary_pillar:   (entry.primary_pillar ?? null) as PillarCode | null,
      secondary_pillars: entry.secondary_pillars as PillarCode[],
      pillar_distribution: entry.pillar_distribution as Partial<Record<PillarCode, number>>,
      mandatory_status:    (entry.mandatory_status ?? 'optional') as MandatoryStatus,
      privacy_sensitivity: entry.privacy_sensitivity as PrivacySensitivity,
      depth_level:         entry.depth_level as DepthLevel,
      additionality_level: entry.additionality_level as 'high' | 'moderate' | 'low' | 'none',
      confidence,
      reason: `Matched taxonomy entry: ${entry.action_id} — ${entry.action_name_it}.`,
      explanation_text: entry.explanation_text_it,
      scoring_allowed:          true,
      impact_units_allowed:     entry.eligible_for_company_index,
      worker_pib_allowed:       entry.eligible_for_worker_pib,
      company_index_allowed:    entry.eligible_for_company_index,
      contribution_index_allowed: entry.eligible_for_contribution_index,
      value_chain_allowed:      entry.eligible_for_value_chain_index,
      review_required:          false,
    };
  }
}

export const eligibilityGateService = new EligibilityGateService();
