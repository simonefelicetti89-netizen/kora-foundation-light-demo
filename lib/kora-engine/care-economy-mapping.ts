// lib/kora-engine/care-economy-mapping.ts
// Care Economy Tagging Layer v0.1 — KORA Foundation Light Pilot.
//
// Near-term premium pilot module.
// Detects care-related signals at the organizational level.
// Never infers individual family status or caregiver burden.
//
// Design constraints:
//   - Aggregate signals only — no individual family profiling.
//   - Returns null when no care signal is detected.
//   - Returns null for blocked records (legal baseline, no impact).
//   - Deterministic. No Math.random. No external calls. No AI.

import type {
  RawUploadedRecord,
  NormalizedUEFRecord,
  EligibilityResult,
  PillarMappingResult,
  CareEconomySignal,
} from './types';
import { isRawUploadedRecord } from './pillar-mapping';

// ── Text normalization ────────────────────────────────────────────────────────

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

function normalize(v: unknown): string {
  if (v === null || v === undefined) return '';
  return removeAccents(String(v).toLowerCase().trim().replace(/\s+/g, ' '));
}

function containsAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

// ── Privacy boundary ──────────────────────────────────────────────────────────

const CARE_PRIVACY_BOUNDARY =
  'Care Economy is measured only at aggregated organizational level. KORA does not infer individual family status or caregiver burden.';

// ── Care tag keyword tables ───────────────────────────────────────────────────

// Map from care tag code → detection keywords.
// Tags match the sprint spec and are returned as strings in detectedCareTags[].
const CARE_TAG_KEYWORDS: Record<string, readonly string[]> = {
  childcare: [
    'childcare', 'child care', 'asilo nido', 'nido aziendale', 'contributo nido',
    'nido', 'bambini', 'figli piccoli',
  ],
  asilo_nido: [
    'asilo nido', 'nido aziendale', 'contributo nido',
  ],
  summer_camps: [
    'centri estivi', 'campus estivo', 'summer camp', 'camp estivo',
  ],
  caregiver_support: [
    'caregiver', 'caregiving', 'supporto caregiver', 'assistenza caregiver',
    'cura familiare', 'supporto alla cura',
  ],
  eldercare: [
    'eldercare', 'cura anziani', 'assistenza anziani', 'assistenza familiare',
    'anziani', 'care anziani',
  ],
  family_support: [
    'supporto famiglia', 'family services', 'family support',
    'welfare famiglia', 'servizi familiari', 'benefit famiglia',
  ],
  parental_support: [
    'congedo aggiuntivo', 'congedo solidarieta', 'parental support',
    'congedo parentale aggiuntivo', 'maternita aggiuntiva', 'paternita aggiuntiva',
  ],
  work_life_balance: [
    'work-life balance', 'work life balance', 'equilibrio vita lavoro',
    'bilanciamento', 'flessibilita vita privata',
  ],
  flexible_work_for_care: [
    'smart working cura', 'lavoro flessibile cura', 'flexible work for care',
    'lavoro agile cura', 'flessibilita per cura', 'orario flessibile cura',
    'telelavoro cura',
  ],
  care_equity: [
    'equita cura', 'cura equa', 'accesso equo alla cura', 'equita accesso cura',
  ],
  access_equity: [
    'accesso equo', 'equita accesso', 'inclusione welfare', 'welfare inclusivo',
    'accesso universale', 'benefit equo',
  ],
  care_budget_support: [
    'contributo cura', 'rimborso cura', 'sussidio cura', 'budget cura',
    'voucher cura', 'rimborso caregiver', 'contributo asilo',
  ],
};

// Broader signals used for reach / access equity detection (not full care tags).
const REACH_SIGNALS_KEYWORDS: readonly string[] = [
  'tutta la popolazione', 'tutti i dipendenti', 'workforce', 'forza lavoro',
  'accesso universale', 'benefit aperto', 'disponibile a tutti',
  'partecipazione aperta', 'eligibilita totale',
];

const ACCESS_EQUITY_KEYWORDS: readonly string[] = [
  'equita', 'equity', 'inclusione', 'inclusion', 'accesso equo',
  'senza discriminazione', 'pari opportunita', 'accesso garantito',
  'copertura uniforme',
];

// ── Text extraction ───────────────────────────────────────────────────────────

function extractCombined(record: RawUploadedRecord | NormalizedUEFRecord): string {
  try {
    if (isRawUploadedRecord(record)) {
      return Object.values(record.raw).map(normalize).filter((s) => s.length > 0).join(' ');
    }
    return [
      normalize(record.eventName),
      normalize(record.description),
      normalize(record.category),
      normalize(record.provider ?? ''),
      normalize(record.department ?? ''),
      normalize(record.site ?? ''),
      normalize(record.recordType),
    ].filter((p) => p.length > 0).join(' ');
  } catch {
    return '';
  }
}

// ── Care tag detection ────────────────────────────────────────────────────────

function detectCareTags(combined: string): string[] {
  return Object.entries(CARE_TAG_KEYWORDS)
    .filter(([, keywords]) => containsAny(combined, keywords))
    .map(([tag]) => tag);
}

// ── Budget evidence quality inference ────────────────────────────────────────
// Returns a rough quality signal (0–1) from the eligibility confidence and
// record metadata. This is a structural estimate — precise BTI computation
// is performed by the BTI engine in a later pipeline stage.

function inferBudgetEvidenceQuality(
  eligibilityResult: EligibilityResult,
  combined: string,
): number {
  const hasEvidenceSignal = containsAny(combined, [
    'fattura', 'invoice', 'contratto', 'contract', 'lms export', 'welfare export',
    'report budget', 'spesa documentata', 'l4', 'l3',
  ]);
  const hasWeakSignal = containsAny(combined, [
    'autodichiarato', 'self declared', 'stima', 'estimated', 'l1', 'l2',
  ]);

  if (hasEvidenceSignal) return Math.min(0.80, eligibilityResult.confidence);
  if (hasWeakSignal) return Math.min(0.45, eligibilityResult.confidence);
  return Math.min(0.35, eligibilityResult.confidence);
}

// ── Care Economy signal factory ───────────────────────────────────────────────

function buildCareEconomySignal(
  detectedCareTags: string[],
  combined: string,
  eligibilityResult: EligibilityResult,
  pillarMapping: PillarMappingResult,
  warnings: string[],
): CareEconomySignal {
  const tags = new Set(detectedCareTags);

  const reachSignals = REACH_SIGNALS_KEYWORDS.filter((kw) => combined.includes(kw));
  const accessEquitySignals = ACCESS_EQUITY_KEYWORDS.filter((kw) => combined.includes(kw));

  const budgetEvidenceQuality = inferBudgetEvidenceQuality(eligibilityResult, combined);

  // careActivationScorePreview: null at record level — requires batch aggregation.
  // Computed from aggregate pillar scores across the full batch in production.
  const careActivationScorePreview: number | null = null;

  return {
    childcareSupport: tags.has('childcare') || tags.has('asilo_nido'),
    caregiverSupport: tags.has('caregiver_support'),
    eldercareSupport: tags.has('eldercare'),
    familySupport: tags.has('family_support') || tags.has('parental_support'),
    summerCampSupport: tags.has('summer_camps'),
    flexibleWorkForCare: tags.has('flexible_work_for_care') || tags.has('work_life_balance'),
    accessEquity: accessEquitySignals.length > 0 ? Math.min(0.65, eligibilityResult.confidence) : null,
    actualUsage: null,   // requires aggregate participant data — not available at record level
    budgetEvidenceQuality,
    careActivationScorePreview,
    detectedCareTags,
    reachSignals,
    accessEquitySignals,
    privacyBoundary: CARE_PRIVACY_BOUNDARY,
    warnings,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function mapCareEconomySignal(
  record: RawUploadedRecord | NormalizedUEFRecord,
  eligibilityResult: EligibilityResult,
  pillarMapping: PillarMappingResult,
): CareEconomySignal | null {
  const combined = extractCombined(record);
  const warnings: string[] = [];

  // Blocked records do not generate Care Economy impact.
  if (eligibilityResult.status === 'blocked') return null;

  const detectedCareTags = detectCareTags(combined);

  // No care signal — not a care economy record.
  if (detectedCareTags.length === 0) return null;

  // Limited records: economic relief only — limited care contribution.
  if (eligibilityResult.status === 'limited') {
    warnings.push(
      'Segnale care rilevato ma il record è classificato Limited (sollievo economico). ' +
      'Il contributo Care Economy è limitato — i rimborsi generici non equivalgono a servizi care strutturati.',
    );
  }

  // Review required: tentative care signal.
  if (eligibilityResult.status === 'review_required') {
    warnings.push(
      'Segnale care tentativo — il record richiede revisione eligibility prima di confermare il contributo Care Economy.',
    );
  }

  // Pillar mismatch warning: care tags detected but primary pillar is not LIFE.
  if (pillarMapping.primaryPillar !== null && pillarMapping.primaryPillar !== 'LIFE') {
    warnings.push(
      `Segnale care rilevato ma il pilastro primario è ${pillarMapping.primaryPillar}. ` +
      'Verificare se il record è correttamente classificato come LIFE.',
    );
  }

  return buildCareEconomySignal(detectedCareTags, combined, eligibilityResult, pillarMapping, warnings);
}

export function mapCareEconomyBatch(
  records: Array<RawUploadedRecord | NormalizedUEFRecord>,
  eligibilityResults: EligibilityResult[],
  pillarMappings: PillarMappingResult[],
): Array<CareEconomySignal | null> {
  return records.map((r, i) =>
    mapCareEconomySignal(r, eligibilityResults[i], pillarMappings[i]),
  );
}

export { CARE_PRIVACY_BOUNDARY, CARE_TAG_KEYWORDS as CARE_TAG_KEYWORD_TABLE };
