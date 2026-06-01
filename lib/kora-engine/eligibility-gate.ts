// lib/kora-engine/eligibility-gate.ts
// Rule-based Eligibility Gate Engine v0.1 — KORA Foundation Light Pilot.
//
// Classifies RawUploadedRecord | NormalizedUEFRecord as:
//   eligible | limited | blocked | review_required
//
// Design constraints:
//   - Deterministic. No Math.random. No external calls. No AI.
//   - Never throws on malformed input.
//   - Conservative: ambiguous → review_required.
//   - Precedence (strict): privacy → blocked → limited → eligible → review_required.
//   - Confidence is rule-based (match specificity), not arbitrary.

import type {
  RawUploadedRecord,
  NormalizedUEFRecord,
  EligibilityResult,
  EligibilityStatus,
  ImpactTreatment,
  BudgetTreatmentSuggestion,
  DetectedRecordType,
} from './types';

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

// ── Field extraction ──────────────────────────────────────────────────────────

interface ExtractedFields {
  combined: string;
  name: string;
  category: string;
  mandatory: boolean | null;
  hasIndividualSignal: boolean;
}

// Keys whose values are used for initiative name extraction.
const NAME_KEYS = [
  'nome iniziativa', 'initiative_name', 'nome programma', 'program_name',
  'eventname', 'event_name', 'nome', 'titolo', 'label', 'nome policy', 'nome attivita',
  'nome evento', 'denominazione',
];

// Keys whose values are used for category extraction.
const CATEGORY_KEYS = [
  'categoria', 'category', 'tipo', 'type', 'kind', 'tipologia', 'classificazione',
];

// Keys whose values indicate mandatory/voluntary status.
const MANDATORY_KEYS = [
  'obbligatorio', 'mandatory', 'required', 'obbligo', 'obbligatorio per legge',
];

// Signals suggesting the record may contain individual-level sensitive data.
// These trigger review_required at priority 1 before any other classification.
const INDIVIDUAL_SENSITIVE_SIGNALS: readonly string[] = [
  'nome dipendente', 'cognome dipendente',
  'codice fiscale', 'fiscal code',
  'email dipendente', 'email individuale', 'indirizzo email individuale',
  'sessione individuale', 'sessione terapia', 'terapia personale',
  'diagnosi individuale', 'referto medico', 'cartella clinica',
  'individuale burnout', 'individual mental health score',
  'worker ranking', 'classifica dipendenti',
  'matricola dipendente', 'badge number individuale',
];

function extractFromRaw(record: RawUploadedRecord): ExtractedFields {
  const raw = record.raw;

  // Collect all normalized string values for broad keyword search.
  const allValues: string[] = Object.values(raw).map(normalize).filter((s) => s.length > 0);
  const combined = allValues.join(' ');

  // Find name: first raw key whose normalized form contains a name key substring.
  let name = '';
  let category = '';
  let mandatory: boolean | null = null;

  for (const [k, v] of Object.entries(raw)) {
    const nk = normalize(k);

    if (name === '' && NAME_KEYS.some((nk2) => nk.includes(nk2))) {
      name = normalize(v);
    }
    if (category === '' && CATEGORY_KEYS.some((ck) => nk.includes(ck))) {
      category = normalize(v);
    }
    if (mandatory === null && MANDATORY_KEYS.some((mk) => nk.includes(mk))) {
      const nv = normalize(v);
      if (nv === 'si' || nv === 'yes' || nv === 'true' || nv === '1') {
        mandatory = true;
      } else if (nv === 'no' || nv === 'false' || nv === '0') {
        mandatory = false;
      }
    }
  }

  const hasIndividualSignal = containsAny(combined, INDIVIDUAL_SENSITIVE_SIGNALS);

  return { combined, name, category, mandatory, hasIndividualSignal };
}

function extractFromUEF(record: NormalizedUEFRecord): ExtractedFields {
  const parts: string[] = [
    normalize(record.eventName),
    normalize(record.description),
    normalize(record.category),
    normalize(record.provider ?? ''),
    normalize(record.sourceSystem),
    normalize(record.evidenceType),
  ];
  const combined = parts.join(' ');
  const name = normalize(record.eventName);
  const category = normalize(record.category);
  const hasIndividualSignal = containsAny(combined, INDIVIDUAL_SENSITIVE_SIGNALS);
  return { combined, name, category, mandatory: record.mandatory, hasIndividualSignal };
}

function isRawUploadedRecord(
  r: RawUploadedRecord | NormalizedUEFRecord,
): r is RawUploadedRecord {
  return 'raw' in r && 'batchId' in r;
}

function extractFields(record: RawUploadedRecord | NormalizedUEFRecord): ExtractedFields {
  try {
    return isRawUploadedRecord(record) ? extractFromRaw(record) : extractFromUEF(record);
  } catch {
    return { combined: '', name: '', category: '', mandatory: null, hasIndividualSignal: false };
  }
}

// ── Keyword tables ────────────────────────────────────────────────────────────
//
// Priority order: BLOCKED > LIMITED > ELIGIBLE.
// All keywords are lowercase, accent-stripped (matching the normalize() output).

// Patterns that unambiguously indicate mandatory legal/regulatory compliance.
// Any record matching these is Blocked by Design: 0 IU, 0 Index, 0 PIB, 0 Contribution.
const BLOCKED_KEYWORDS: readonly string[] = [
  // Statutory safety training — D.Lgs 81/08
  'd.lgs 81', 'dlgs 81', '81/08', 'dlgs81', 'd.lgs81',
  'corso sicurezza obbligatorio', 'formazione sicurezza obbligatoria',
  'sicurezza obbligatoria', 'hse obbligatorio',
  // Workplace safety instruments
  'dvr', 'duvri', 'dpi obbligatorio', 'ppe obbligatorio',
  // Occupational health surveillance
  'sorveglianza sanitaria', 'medico competente', 'visita medica obbligatoria',
  // Mandatory certifications
  'patentino obbligatorio', 'patentini obbligatori',
  'carrellisti obbligatorio', 'muletti obbligatorio', 'mulettisti obbligatori',
  // Fire safety / first aid — legally mandated
  'antincendio obbligatorio', 'formazione antincendio', 'corso antincendio',
  'primo soccorso obbligatorio', 'corso primo soccorso',
  // Regulatory compliance courses
  'privacy obbligatoria', 'gdpr obbligatorio', 'gdpr obbligatoria', 'gdpr mandatory',
  'modello 231', 'dlgs 231', 'd.lgs 231',
  'compliance obbligatoria', 'mandatory compliance',
  // Other legal baselines
  'rischio elettrico obbligatorio', 'carrellisti e mulettisti',
  'evacuazione obbligatoria',
];

// Category signals that, combined with mandatory=true, confirm blocked status.
const BLOCKED_MANDATORY_CATEGORY_SIGNALS: readonly string[] = [
  'sicurezza', 'safety', 'compliance', 'legale', 'legal',
  'privacy', 'gdpr', 'antincendio', 'primo soccorso',
  'dvr', 'dpi', 'hse', 'rischio', 'risk', '231',
  'sorveglianza', 'obbligatorio',
];

// Cash-like or generic economic relief patterns.
// Generates no IU. Tracked in BTI as economic_relief_spend.
const LIMITED_KEYWORDS: readonly string[] = [
  // Food vouchers
  'buoni pasto', 'buono pasto', 'meal voucher', 'meal vouchers', 'ticket restaurant',
  // Fuel
  'buoni benzina', 'buono benzina', 'fuel card', 'buoni carburante', 'buono carburante',
  // Generic gift / shopping
  'gift card', 'carta regalo',
  'buoni acquisto', 'buono acquisto', 'shopping voucher', 'voucher acquisto',
  'voucher spesa', 'voucher generalista', 'voucher generico',
  // Generic cash-like fringe
  'fringe benefit', 'flexible benefit monetario', 'benefit monetario',
  'welfare cash-like', 'welfare cashlike',
  'rimborso generico', 'bonus monetario',
  'cashback', 'premio in denaro', 'erogazione monetaria',
  'bonus spesa', 'buoni cultura',
];

// Voluntary / additional / verifiable program patterns.
// Records matching these may generate IU through the IU engine.
const ELIGIBLE_KEYWORDS: readonly string[] = [
  // LIFE — care economy
  'asilo nido', 'nido aziendale', 'childcare', 'child care', 'contributo nido',
  'caregiver', 'eldercare', 'cura anziani', 'assistenza anziani', 'assistenza familiare',
  'centri estivi', 'campus estivo', 'summer camp',
  // LIFE — mental health (service infrastructure, aggregate)
  'mental health service', 'mental health program', 'supporto psicologico',
  'psicologia aziendale', 'benessere psicologico',
  // LIFE — prevention / wellbeing
  'check-up extra', 'prevenzione extra', 'prevenzione sanitaria extra',
  'wellbeing volontario', 'wellbeing voluntary', 'benessere volontario',
  'work-life balance', 'work life balance',
  // LIFE — formal policies beyond legal minimum
  'smart working policy', 'smart working formale', 'lavoro agile policy',
  'diritto alla disconnessione', 'right to disconnect',
  'no meeting friday', 'no riunioni venerdi', 'deep work friday',
  'ferie illimitate', 'congedo solidarieta', 'congedo aggiuntivo',
  // GROWTH — upskilling / reskilling
  'upskilling', 'reskilling', 're-skilling', 'up-skilling',
  'formazione professionalizzante', 'formazione volontaria', 'formazione addizionale',
  'academy aziendale', 'corporate academy', 'learning platform', 'learning hub',
  'coaching professionale', 'business coaching',
  'ai skills', 'intelligenza artificiale skills', 'digital skills', 'competenze digitali',
  'certificazione professionale', 'certificazioni non obbligatorie', 'certificazione volontaria',
  'transition pathway', 'percorso di transizione', 'percorso di sviluppo',
  // CONNECTION — mentoring / inclusion / community
  'mentoring', 'mentorship', 'peer support', 'buddy program',
  'inclusion program', 'programma inclusione', 'diversita e inclusione',
  'community interna', 'employee resource group', 'erg aziendale',
  'onboarding buddy', 'team cohesion', 'coesione team',
  'coaching relazionale', 'networking interno',
  // IMPACT — volunteering / territory / society
  'volontariato', 'volunteering', 'volontariato aziendale',
  'iniziativa territoriale', 'community project', 'progetto sociale', 'progetto territoriale',
  'scuola-lavoro', 'alternanza scuola', 'partnership nonprofit',
  'environmental volunteering', 'volontariato ambientale',
  'social impact', 'impatto sociale', 'ore dono',
  // LEGACY — financial future / knowledge transfer
  'pensione integrativa', 'previdenza complementare', 'fondo pensione', 'tfr aggiuntivo',
  'financial wellbeing futuro', 'pianificazione finanziaria', 'educazione finanziaria',
  'knowledge transfer', 'trasferimento competenze', 'trasferimento know-how',
  'senior junior mentoring', 'mentoring generazionale', 'passaggio generazionale',
  'legacy program', 'resilienza a lungo termine',
];

// Signals explicitly indicating voluntary / optional / additional nature.
const VOLUNTARY_SIGNALS: readonly string[] = [
  'volontario', 'voluntary', 'addizionale', 'additional', 'extra',
  'facoltativo', 'optional', 'non obbligatorio', 'not mandatory',
  'adesione libera', 'su richiesta', 'su base volontaria',
];

// Signals indicating a formal organizational policy (eligible for LIFE/CONNECTION/LEGACY).
const FORMAL_POLICY_SIGNALS: readonly string[] = [
  'policy formale', 'policy aziendale', 'accordo sindacale', 'accordo integrativo',
  'regolamento interno', 'politica aziendale', 'formalized policy',
  'accordo collettivo', 'contratto integrativo', 'accordo di secondo livello',
];

// ── Result builder ────────────────────────────────────────────────────────────

function buildResult(
  recordId: string,
  status: EligibilityStatus,
  reason: string,
  doctrineReference: string,
  confidence: number,
  impactTreatment: ImpactTreatment,
  budgetTreatmentSuggestion: BudgetTreatmentSuggestion,
): EligibilityResult {
  return {
    recordId,
    status,
    reason,
    doctrineReference,
    confidence,
    impactTreatment,
    budgetTreatmentSuggestion,
    reviewRequired: status === 'review_required',
  };
}

// ── Classification logic ──────────────────────────────────────────────────────

function classifyRecord(recordId: string, fields: ExtractedFields): EligibilityResult {
  const { combined, name, category, mandatory, hasIndividualSignal } = fields;

  // ── Priority 1: Privacy / individual-sensitive content ────────────────────
  // Checked first — individual data exposure cannot be resolved by other rules.
  if (hasIndividualSignal) {
    return buildResult(
      recordId,
      'review_required',
      'Il record sembra contenere segnali di dati individuali sensibili. Revisione privacy necessaria prima di qualsiasi classificazione.',
      'KORA_DOCTRINE §2.1 · Privacy-first principle · GDPR art. 9 · CLAUDE.md §13',
      0.42,
      'pending_review',
      'review_required',
    );
  }

  // ── Priority 2: Blocked — explicit legal/mandatory compliance ─────────────
  const hasBlockedKeyword = containsAny(combined, BLOCKED_KEYWORDS);
  const hasMandatoryCategory =
    mandatory === true && containsAny(combined, BLOCKED_MANDATORY_CATEGORY_SIGNALS);

  if (hasBlockedKeyword || hasMandatoryCategory) {
    const inName = containsAny(name, BLOCKED_KEYWORDS);
    const inCategory = containsAny(category, BLOCKED_KEYWORDS);
    const confidence = inName || inCategory ? 0.93 : hasBlockedKeyword ? 0.85 : 0.73;
    return buildResult(
      recordId,
      'blocked',
      'La conformità legale è una baseline, non impatto.',
      'KORA_DOCTRINE §2.6 · D.Lgs 81/08 · Eligibility Gate: Blocked by Design · 0 IU · 0 KORA Index · 0 PIB · 0 Contribution',
      confidence,
      'excluded',
      'exclude_from_bti',
    );
  }

  // ── Priority 3: Limited — cash-like / economic relief ─────────────────────
  const hasLimitedKeyword = containsAny(combined, LIMITED_KEYWORDS);

  if (hasLimitedKeyword) {
    const inName = containsAny(name, LIMITED_KEYWORDS);
    const inCategory = containsAny(category, LIMITED_KEYWORDS);
    const confidence = inName || inCategory ? 0.91 : 0.76;
    return buildResult(
      recordId,
      'limited',
      'Sollievo economico utile, ma a bassa profondità di attivazione.',
      'KORA_DOCTRINE §2.7 · Eligibility Gate: Limited · Economic Relief · economic_relief_spend · no IU by default',
      confidence,
      'bti_only',
      'partial_inclusion',
    );
  }

  // ── Priority 4: Eligible — voluntary / additional / verifiable ───────────
  const hasEligibleKeyword = containsAny(combined, ELIGIBLE_KEYWORDS);
  const isExplicitlyVoluntary =
    mandatory === false || containsAny(combined, VOLUNTARY_SIGNALS);
  const isFormalPolicy = containsAny(combined, FORMAL_POLICY_SIGNALS);

  if (hasEligibleKeyword) {
    if (isExplicitlyVoluntary || isFormalPolicy) {
      const inName = containsAny(name, ELIGIBLE_KEYWORDS);
      const confidence = inName ? 0.88 : 0.76;
      return buildResult(
        recordId,
        'eligible',
        'Programma volontario/addizionale/verificabile con potenziale di attivazione.',
        'KORA_DOCTRINE §2.8 · Eligibility Gate: Eligible · Pillars: LIFE/GROWTH/CONNECTION/IMPACT/LEGACY',
        confidence,
        'generates_iu',
        'include_in_bti',
      );
    }

    // Eligible keyword found but mandatory status unknown — conditional classification.
    if (mandatory === null) {
      return buildResult(
        recordId,
        'eligible',
        'Programma potenzialmente eleggibile: segnale di attivazione rilevato, ma stato obbligatorio/volontario non dichiarato. Revisione consigliata.',
        'KORA_DOCTRINE §2.8 · Eligibility Gate: Eligible (condizionale) · stato obbligatorio da verificare in revisione',
        0.62,
        'generates_iu',
        'include_in_bti',
      );
    }

    // mandatory=true and eligible keyword: could be internal mandatory training or legal baseline.
    // Cannot determine — blocked wins only if legal keyword is explicit (already checked above).
    return buildResult(
      recordId,
      'review_required',
      'Segnale eleggibile rilevato ma programma marcato come obbligatorio. Verificare se si tratta di compliance legale (blocked) o formazione obbligatoria interna aggiuntiva (potenzialmente eligible).',
      'KORA_DOCTRINE §2.6 + §2.8 · Precedenza: blocked se compliance legale esplicita · review_required se ambiguo',
      0.55,
      'pending_review',
      'review_required',
    );
  }

  // ── Priority 5: Review required — default for all ambiguous records ───────
  // No strong signal in any direction: ambiguous, category absent, insufficient text.
  const hasSomeText = combined.length >= 10;
  const confidence = hasSomeText ? 0.42 : 0.28;
  return buildResult(
    recordId,
    'review_required',
    'Classificazione automatica non possibile: segnali insufficienti o categoria assente. Revisione umana necessaria prima di qualsiasi scoring.',
    'KORA_DOCTRINE §2 · Eligibility Gate: Review Required · nessun IU generato in attesa di validazione umana',
    confidence,
    'pending_review',
    'review_required',
  );
}

// ── B15: UEF-reviewed classification passthrough ─────────────────────────────
//
// Records arriving from the approved UEF pipeline carry reviewed_by_uef=true
// and reviewed_eligibility set by buildScoringRecordsFromApprovedUef.
// These records have already been classified by the Raw-to-UEF Interpreter
// and validated by a human operator in UEF Review — the gate must not
// re-classify them via keyword matching.
//
// Only the uef-to-scoring-records adapter can set reviewed_by_uef=true.
// Raw CSV uploads never carry this flag, so spoofing is structurally impossible.

const REVIEWED_TREATMENT: Record<string, { impact: ImpactTreatment; budget: BudgetTreatmentSuggestion; reason: string }> = {
  eligible: { impact: 'generates_iu',  budget: 'include_in_bti',   reason: 'UEF Review human-approved as eligible — generates Impact Units.' },
  limited:  { impact: 'bti_only',      budget: 'partial_inclusion', reason: 'UEF Review human-approved as limited (economic relief) — BTI only, no IU.' },
  blocked:  { impact: 'excluded',      budget: 'exclude_from_bti',  reason: 'UEF Review human-approved as blocked (compliance baseline) — 0 IU, excluded from BTI.' },
};

function buildReviewedResult(recordId: string, eligibility: 'eligible' | 'limited' | 'blocked'): EligibilityResult {
  const t = REVIEWED_TREATMENT[eligibility];
  return {
    recordId,
    status:                   eligibility,
    reason:                   t.reason,
    doctrineReference:        'KORA_DOCTRINE §2 · B15: UEF Review governs scoring · reviewed_uef:eligibility_authoritative',
    confidence:               0.95,
    impactTreatment:          t.impact,
    budgetTreatmentSuggestion: t.budget,
    reviewRequired:           false,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function classifyEligibility(
  record: RawUploadedRecord | NormalizedUEFRecord,
): EligibilityResult {
  const recordId = isRawUploadedRecord(record) ? record.recordId : record.uefId;

  // B15: UEF-approved records bypass keyword re-classification.
  // reviewed_by_uef can only be set by the approved UEF scoring adapter.
  if (isRawUploadedRecord(record)) {
    const raw = record.raw;
    if (raw['reviewed_by_uef'] === true) {
      const reviewedElig = String(raw['reviewed_eligibility'] ?? '');
      if (reviewedElig === 'eligible' || reviewedElig === 'limited' || reviewedElig === 'blocked') {
        return buildReviewedResult(recordId, reviewedElig);
      }
    }
  }

  const fields = extractFields(record);
  return classifyRecord(recordId, fields);
}

export function classifyEligibilityBatch(
  records: Array<RawUploadedRecord | NormalizedUEFRecord>,
): EligibilityResult[] {
  return records.map(classifyEligibility);
}

// ── Exported helpers (for testing / UI explainability) ────────────────────────

export {
  normalize as _normalizeForTest,
  containsAny as _containsAnyForTest,
  BLOCKED_KEYWORDS as BLOCKED_KEYWORD_TABLE,
  LIMITED_KEYWORDS as LIMITED_KEYWORD_TABLE,
  ELIGIBLE_KEYWORDS as ELIGIBLE_KEYWORD_TABLE,
};

// Re-export DetectedRecordType so examples file can use it without importing types directly.
export type { DetectedRecordType };
