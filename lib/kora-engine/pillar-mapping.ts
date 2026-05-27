// lib/kora-engine/pillar-mapping.ts
// Pillar Mapping Engine v0.1 — KORA Foundation Light Pilot.
//
// Maps RawUploadedRecord | NormalizedUEFRecord to KORA's 5 pillars:
//   LIFE | GROWTH | CONNECTION | IMPACT | LEGACY
//
// Design constraints:
//   - Deterministic. No Math.random. No external calls. No AI.
//   - Never throws on malformed input.
//   - Conservative: ambiguous → reviewRequired = true.
//   - Respects Eligibility Gate: blocked → no score contribution.
//   - Confidence is rule-based (keyword specificity + name match).

import type {
  RawUploadedRecord,
  NormalizedUEFRecord,
  EligibilityResult,
  PillarMappingResult,
  Pillar,
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

function matchingKeywords(text: string, keywords: readonly string[]): string[] {
  return keywords.filter((kw) => text.includes(kw));
}

// ── Field extraction ──────────────────────────────────────────────────────────

interface MappingFields {
  combined: string;
  name: string;
  category: string;
  hasIndividualSignal: boolean;
}

const INDIVIDUAL_SENSITIVE_SIGNALS: readonly string[] = [
  'nome dipendente', 'cognome dipendente',
  'codice fiscale', 'fiscal code',
  'email dipendente', 'sessione individuale',
  'sessione terapia', 'terapia personale',
  'diagnosi individuale', 'referto medico', 'cartella clinica',
  'individuale burnout', 'individual mental health score',
  'worker ranking', 'matricola dipendente', 'badge number individuale',
];

const NAME_KEYS = [
  'nome iniziativa', 'initiative_name', 'nome programma', 'program_name',
  'eventname', 'event_name', 'nome', 'titolo', 'label', 'denominazione',
];

const CATEGORY_KEYS = [
  'categoria', 'category', 'tipo', 'type', 'kind', 'tipologia',
];

export function isRawUploadedRecord(
  r: RawUploadedRecord | NormalizedUEFRecord,
): r is RawUploadedRecord {
  return 'raw' in r && 'batchId' in r;
}

function extractMappingFields(record: RawUploadedRecord | NormalizedUEFRecord): MappingFields {
  try {
    if (isRawUploadedRecord(record)) {
      const raw = record.raw;
      const allValues = Object.values(raw).map(normalize).filter((s) => s.length > 0);
      const combined = allValues.join(' ');
      let name = '';
      let category = '';
      for (const [k, v] of Object.entries(raw)) {
        const nk = normalize(k);
        if (name === '' && NAME_KEYS.some((nk2) => nk.includes(nk2))) name = normalize(v);
        if (category === '' && CATEGORY_KEYS.some((ck) => nk.includes(ck))) category = normalize(v);
      }
      const hasIndividualSignal = INDIVIDUAL_SENSITIVE_SIGNALS.some((s) => combined.includes(s));
      return { combined, name, category, hasIndividualSignal };
    }

    const parts = [
      normalize(record.eventName),
      normalize(record.description),
      normalize(record.category),
      normalize(record.provider ?? ''),
      normalize(record.sourceSystem),
      normalize(record.evidenceType),
      normalize(record.department ?? ''),
      normalize(record.site ?? ''),
      normalize(record.recordType),
    ];
    const combined = parts.filter((p) => p.length > 0).join(' ');
    const name = normalize(record.eventName);
    const category = normalize(record.category);
    const hasIndividualSignal = INDIVIDUAL_SENSITIVE_SIGNALS.some((s) => combined.includes(s));
    return { combined, name, category, hasIndividualSignal };
  } catch {
    return { combined: '', name: '', category: '', hasIndividualSignal: false };
  }
}

// ── Pillar keyword tables ─────────────────────────────────────────────────────
//
// All keywords lowercase and accent-stripped (matching normalize() output).
// Do not include mandatory legal compliance keywords — those are Blocked by the Eligibility Gate.

const LIFE_KEYWORDS: readonly string[] = [
  // Care economy — childcare
  'asilo nido', 'nido aziendale', 'childcare', 'child care', 'contributo nido',
  // Care economy — caregiver / eldercare
  'caregiver', 'caregiving', 'eldercare', 'cura anziani', 'assistenza anziani', 'assistenza familiare',
  // Care economy — family / summer
  'centri estivi', 'campus estivo', 'summer camp',
  'supporto famiglia', 'family services', 'family support',
  'congedo aggiuntivo', 'congedo solidarieta',
  // Mental health — service/infrastructure level only (aggregate, not individual)
  'mental health service', 'mental health program', 'mental health platform',
  'supporto psicologico', 'psicologia aziendale', 'benessere psicologico',
  'salute mentale',
  // Prevention / health
  'check-up extra', 'prevenzione extra', 'prevenzione sanitaria extra',
  'benessere fisico', 'attivita fisica', 'sport aziendale',
  // Wellbeing
  'wellbeing volontario', 'wellbeing voluntary', 'benessere volontario',
  // Work-life balance / disconnection / smart working policy
  'work-life balance', 'work life balance', 'equilibrio vita lavoro',
  'diritto alla disconnessione', 'right to disconnect',
  'no meeting friday', 'no riunioni venerdi', 'deep work friday',
  'smart working policy', 'smart working formale', 'lavoro agile policy',
  'ferie illimitate',
];

const GROWTH_KEYWORDS: readonly string[] = [
  'upskilling', 'reskilling', 're-skilling', 'up-skilling',
  'formazione professionalizzante', 'formazione volontaria', 'formazione addizionale',
  'corso professionalizzante',
  'academy aziendale', 'corporate academy', 'learning platform', 'learning hub',
  'ai skills', 'intelligenza artificiale skills', 'digital skills', 'competenze digitali',
  'certificazione professionale', 'certificazioni non obbligatorie', 'certificazione volontaria',
  'transition pathway', 'percorso di transizione', 'percorso di sviluppo',
  'coaching professionale', 'business coaching',
  'career transition', 'transizione di carriera',
  'mobilita interna', 'internal mobility',
  'future skills', 'competenze future',
  'learning continuity', 'continuita formativa',
];

const CONNECTION_KEYWORDS: readonly string[] = [
  'mentoring', 'mentorship', 'peer mentoring',
  'peer support',
  'buddy program', 'buddy', 'onboarding buddy',
  'inclusion program', 'programma inclusione', 'diversita e inclusione', 'diversita inclusione',
  'team cohesion', 'coesione team',
  'community interna', 'employee resource group', 'erg aziendale',
  'social cohesion', 'coesione sociale',
  'networking interno',
  'coaching relazionale',
  'collaborazione interfunzionale', 'cross-functional',
];

const IMPACT_KEYWORDS: readonly string[] = [
  'volontariato', 'volunteering', 'volontariato aziendale',
  'iniziativa territoriale', 'community project', 'progetto sociale', 'progetto territoriale',
  'scuola-lavoro', 'alternanza scuola', 'alternanza scuola lavoro',
  'nonprofit', 'partnership nonprofit', 'partnership sociale',
  'environmental volunteering', 'volontariato ambientale',
  'impatto sociale', 'social impact', 'ore dono',
  'cross-company initiative', 'iniziativa cross-aziendale',
  'territorio', 'comunita locale',
];

const LEGACY_KEYWORDS: readonly string[] = [
  'pensione integrativa', 'previdenza complementare', 'fondo pensione', 'tfr aggiuntivo',
  'financial wellbeing futuro', 'pianificazione finanziaria', 'educazione finanziaria',
  'knowledge transfer', 'trasferimento competenze', 'trasferimento know-how',
  'passaggio generazionale', 'senior junior mentoring', 'mentoring generazionale',
  'legacy program', 'resilienza a lungo termine',
  'continuita futura', 'succession', 'transizione generazionale',
  'long-term resilience',
];

// Context signals used in tie-breaking logic.
const MENTORING_PROFESSIONAL_SIGNALS: readonly string[] = [
  'professionale', 'professional', 'career', 'carriera', 'sviluppo', 'development',
  'business', 'leadership', 'executive',
];

const MENTORING_PEER_SIGNALS: readonly string[] = [
  'peer', 'buddy', 'community', 'onboarding', 'inclusione', 'inclusion',
  'supporto reciproco',
];

const MENTORING_GENERATIONAL_SIGNALS: readonly string[] = [
  'senior', 'junior', 'generazionale', 'generational', 'passaggio', 'succession',
  'legacy', 'know-how', 'trasferimento',
];

const SMART_WORKING_SIGNALS: readonly string[] = [
  'smart working', 'lavoro agile', 'remote work', 'lavoro da remoto', 'lavoro flessibile',
];

const SMART_WORKING_CARE_CONTEXT: readonly string[] = [
  'cura', 'caregiver', 'childcare', 'child care', 'asilo nido', 'eldercare',
  'famiglia', 'disconnessione', 'disconnection', 'wellbeing', 'benessere',
];

const SMART_WORKING_COLLAB_CONTEXT: readonly string[] = [
  'collaborazione', 'collaboration', 'team', 'ritmo operativo', 'flessibilita organizzativa',
];

// ── Pillar scoring ────────────────────────────────────────────────────────────

interface PillarScore {
  pillar: Pillar;
  score: number;
  signals: string[];
  inName: boolean;
}

function scorePillars(fields: MappingFields): PillarScore[] {
  const { combined, name } = fields;

  const tables: [Pillar, readonly string[]][] = [
    ['LIFE', LIFE_KEYWORDS],
    ['GROWTH', GROWTH_KEYWORDS],
    ['CONNECTION', CONNECTION_KEYWORDS],
    ['IMPACT', IMPACT_KEYWORDS],
    ['LEGACY', LEGACY_KEYWORDS],
  ];

  const scores: PillarScore[] = tables.map(([pillar, keywords]) => {
    const matched = matchingKeywords(combined, keywords);
    return {
      pillar,
      score: matched.length,
      signals: matched,
      inName: matched.some((m) => name.includes(m)),
    };
  });

  // Smart working contextual boost: not in any keyword table, handled here.
  if (containsAny(combined, SMART_WORKING_SIGNALS)) {
    const hasCare = containsAny(combined, SMART_WORKING_CARE_CONTEXT);
    const hasCollab = containsAny(combined, SMART_WORKING_COLLAB_CONTEXT);
    if (hasCare) {
      const life = scores.find((s) => s.pillar === 'LIFE')!;
      life.score += 1;
      life.signals.push('smart working (care/wellbeing context)');
    }
    if (hasCollab && !hasCare) {
      const conn = scores.find((s) => s.pillar === 'CONNECTION')!;
      conn.score += 1;
      conn.signals.push('smart working (collaboration context)');
    }
  }

  return scores;
}

// ── Tie-breaking ──────────────────────────────────────────────────────────────

interface TieBreakResult {
  primary: Pillar;
  secondary: Pillar[];
  reviewRequired: boolean;
}

function applyTieBreaking(scores: PillarScore[], fields: MappingFields): TieBreakResult {
  const { combined } = fields;

  const sorted = [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.inName !== a.inName) return b.inName ? 1 : -1;
    return 0;
  });

  const nonZero = sorted.filter((s) => s.score > 0);
  if (nonZero.length === 0) {
    return { primary: 'LIFE', secondary: [], reviewRequired: true };
  }

  const top = nonZero[0];
  const runner = nonZero[1];

  // Mentoring / coaching disambiguation
  if (containsAny(combined, ['mentoring', 'mentorship', 'coaching'])) {
    const isGenerational = containsAny(combined, MENTORING_GENERATIONAL_SIGNALS);
    const isPeer = containsAny(combined, MENTORING_PEER_SIGNALS);
    const isProfessional = containsAny(combined, MENTORING_PROFESSIONAL_SIGNALS);

    if (isGenerational) return { primary: 'LEGACY', secondary: ['CONNECTION'], reviewRequired: false };
    if (isProfessional && !isPeer) return { primary: 'GROWTH', secondary: ['CONNECTION'], reviewRequired: false };
    if (isPeer && !isProfessional) return { primary: 'CONNECTION', secondary: [], reviewRequired: false };
    // Both or neither → use score
  }

  // Clear winner: top score is at least 1.5× runner
  if (!runner || top.score >= runner.score * 1.5 || (top.score > 0 && runner.score === 0)) {
    const secondary = nonZero.slice(1, 3).map((s) => s.pillar);
    return { primary: top.pillar, secondary, reviewRequired: false };
  }

  // Material tie remains
  const secondary = nonZero.slice(1, 3).map((s) => s.pillar);
  return { primary: top.pillar, secondary, reviewRequired: true };
}

// ── Confidence calculation ────────────────────────────────────────────────────

function computeConfidence(
  primaryScore: PillarScore,
  eligibilityConfidence: number,
  reviewRequired: boolean,
): number {
  let base: number;
  if (primaryScore.inName && primaryScore.signals.length >= 2) base = 0.88;
  else if (primaryScore.inName) base = 0.82;
  else if (primaryScore.signals.length >= 3) base = 0.76;
  else if (primaryScore.signals.length >= 2) base = 0.70;
  else base = 0.60;

  const blended = base * 0.70 + eligibilityConfidence * 0.30;
  if (reviewRequired) return Math.min(blended, 0.58);
  return Math.min(blended, 0.92);
}

// ── Classification ────────────────────────────────────────────────────────────

function classifyPillar(
  recordId: string,
  fields: MappingFields,
  eligibilityResult: EligibilityResult,
): PillarMappingResult {
  const { hasIndividualSignal } = fields;

  if (hasIndividualSignal) {
    return {
      recordId,
      primaryPillar: null,
      secondaryPillars: [],
      confidence: 0.30,
      rationale:
        'Segnali di dati individuali sensibili rilevati. Classificazione pilastro sospesa in attesa di revisione privacy. KORA misura organizzazioni, non individui.',
      mappingSignals: ['individual_sensitive_signal'],
      reviewRequired: true,
    };
  }

  const { status, confidence: eligConf } = eligibilityResult;

  // Blocked records: contextual label only, never contributes to scoring
  if (status === 'blocked') {
    return {
      recordId,
      primaryPillar: null,
      secondaryPillars: [],
      confidence: eligConf,
      rationale:
        'Blocked records can be contextualized but do not contribute to KORA Index, IU, PIB or Contribution. Classificato come compliance legale obbligatoria — nessun contributo al punteggio.',
      mappingSignals: ['blocked_by_design', 'legal_compliance_baseline'],
      reviewRequired: false,
    };
  }

  const scores = scorePillars(fields);

  // Limited records: economic relief context, no IU
  if (status === 'limited') {
    const nonZero = scores.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
    const contextPillar: Pillar =
      nonZero.length > 0 ? nonZero[0].pillar : 'LIFE';
    const signals = nonZero[0]?.signals.slice(0, 3) ?? [];
    return {
      recordId,
      primaryPillar: contextPillar,
      secondaryPillars: [],
      confidence: Math.min(eligConf * 0.75, 0.62),
      rationale:
        'Limited records are tracked as economic relief with limited contribution. Nessuna generazione IU per default. Contesto: sollievo economico aggregato.',
      mappingSignals: ['limited_economic_relief', ...signals],
      reviewRequired: false,
    };
  }

  const { primary, secondary, reviewRequired } = applyTieBreaking(scores, fields);
  const primaryScore = scores.find((s) => s.pillar === primary)!;

  // No keyword signal found
  if (primaryScore.score === 0) {
    return {
      recordId,
      primaryPillar: null,
      secondaryPillars: [],
      confidence: 0.28,
      rationale:
        'Segnali insufficienti per la classificazione automatica del pilastro. Revisione umana necessaria prima di qualsiasi assegnazione.',
      mappingSignals: [],
      reviewRequired: true,
    };
  }

  const confidence = computeConfidence(primaryScore, eligConf, reviewRequired);
  const allSignals = [...new Set(primaryScore.signals)].slice(0, 6);

  const rationale =
    status === 'review_required'
      ? `Classificazione pilastro tentativa: ${primary}. L'eligibility richiede ancora revisione — confidenza limitata.`
      : `Programma classificato nel pilastro ${primary}. Programma volontario/addizionale/verificabile con potenziale di attivazione nel pilastro ${primary}.`;

  return {
    recordId,
    primaryPillar: primary,
    secondaryPillars: secondary,
    confidence: reviewRequired || status === 'review_required' ? Math.min(confidence, 0.58) : confidence,
    rationale,
    mappingSignals: allSignals,
    reviewRequired: reviewRequired || status === 'review_required',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function mapPillar(
  record: RawUploadedRecord | NormalizedUEFRecord,
  eligibilityResult: EligibilityResult,
): PillarMappingResult {
  const recordId = isRawUploadedRecord(record) ? record.recordId : record.uefId;
  const fields = extractMappingFields(record);
  return classifyPillar(recordId, fields, eligibilityResult);
}

export function mapPillarBatch(
  records: Array<RawUploadedRecord | NormalizedUEFRecord>,
  eligibilityResults: EligibilityResult[],
): PillarMappingResult[] {
  return records.map((r, i) => mapPillar(r, eligibilityResults[i]));
}

// ── Exported helpers (for testing / UI explainability) ───────────────────────

export {
  normalize as _normalizeForTest,
  containsAny as _containsAnyForTest,
  LIFE_KEYWORDS as LIFE_KEYWORD_TABLE,
  GROWTH_KEYWORDS as GROWTH_KEYWORD_TABLE,
  CONNECTION_KEYWORDS as CONNECTION_KEYWORD_TABLE,
  IMPACT_KEYWORDS as IMPACT_KEYWORD_TABLE,
  LEGACY_KEYWORDS as LEGACY_KEYWORD_TABLE,
};
