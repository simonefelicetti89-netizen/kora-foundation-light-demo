// lib/kora-engine/budget-evidence.ts
// Budget Evidence Engine v0.1 — KORA Foundation Light Pilot.
//
// Assesses economic evidence quality for uploaded/normalized records.
// Determines: amount, source, evidence level, BTI treatment, confidence.
//
// Core doctrine: "Il budget non è un dato valido se non ha una fonte."
//
// Design constraints:
//   - Deterministic. No Math.random. No external calls. No AI.
//   - Never throws on malformed input.
//   - Conservative: ambiguous → lower evidence level + tighter confidence caps.
//   - Policy/non-monetary records: status = not_applicable, amount never invented.
//   - L0/L1 never receive full_weight BTI treatment.

import type {
  RawUploadedRecord,
  NormalizedUEFRecord,
  BudgetEvidence,
  BudgetEvidenceLevel,
  BudgetEvidenceType,
  BudgetStatus,
  BTITreatment,
} from './types';
import { isRawUploadedRecord } from './pillar-mapping';

// ── Text utilities ────────────────────────────────────────────────────────────

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

// ── Amount parsing ────────────────────────────────────────────────────────────
// Handles: raw number, plain string, Italian "1.234,56 €", US "1,234.56".

export function parseAmount(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? v : null;

  const raw = String(v).trim();
  if (!raw || raw === '-' || raw.toLowerCase() === 'n/a' || raw.toLowerCase() === 'nd') return null;

  // Strip currency symbols and non-breaking spaces.
  let s = raw.replace(/[€$£¥₹ ]/g, '').trim();
  if (!s) return null;

  // Italian thousands + decimal: "1.234,56" or "1.234" (pure thousands) → 1234 / 1234.56
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+(,\d{1,2})$/.test(s)) {
    // "1234,56" — Italian decimal without thousands sep
    s = s.replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) {
    // US "1,234.56"
    s = s.replace(/,/g, '');
  } else {
    // Fallback: strip remaining commas
    s = s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ── Keyword tables ────────────────────────────────────────────────────────────

// Keys in RawUploadedRecord.raw that may carry a monetary amount.
// Checked in priority order (most specific first).
const AMOUNT_KEY_SIGNALS: readonly string[] = [
  'budget_amount', 'amount_allocated', 'amount_used',
  'importo', 'budget', 'costo', 'valore', 'amount', 'cost',
  'totale', 'spesa',
];

// Keys that carry the source / evidence description.
const SOURCE_KEY_SIGNALS: readonly string[] = [
  'budget_source', 'fonte_budget', 'fonte', 'source',
  'budget_evidence_type', 'evidence_type', 'prova_budget', 'evidenza_budget',
  'tipo_evidenza', 'tipo evidenza',
];

// Source/type disambiguation: skip keys that are clearly amounts when searching for source.
const SOURCE_KEY_EXCLUSIONS: readonly string[] = ['importo', 'amount', 'costo', 'valore', 'totale'];

// ── Evidence level keyword tables ─────────────────────────────────────────────
// All lowercase, accent-stripped.

const L4_SIGNALS: readonly string[] = [
  'advisor reviewed', 'kora reviewed', 'audit trail', 'verified evidence',
  'evidenza verificata', 'certificato da', 'terza parte verificata', 'certified advisor',
  'l4', 'l4_verified',
];

const L3_SIGNALS: readonly string[] = [
  'invoice', 'fattura', 'contratto', 'contract',
  'purchase order', 'purchase_order', 'ordine d acquisto', 'ordine acquisto',
  'welfare provider export', 'welfare_provider_export', 'export fornitore welfare',
  'lms export', 'lms_export', 'export lms', 'export piattaforma lms',
  'partner report', 'third-party report', 'report fornitore', 'export fornitore',
  'fornitore verificato', 'provider export',
  'l3', 'l3_third',
];

const L2_SIGNALS: readonly string[] = [
  'internal budget report', 'internal_budget_report',
  'consuntivo interno', 'contabilita analitica', 'contabilità analitica',
  'accounting export', 'cost center', 'centro di costo',
  'payroll aggregate', 'payroll_aggregate', 'aggregato payroll',
  'hr report', 'report hr', 'report interno', 'budget hr',
  'budget interno', 'rendiconto interno', 'documento interno',
  'l2', 'l2_internal',
];

const L1_SIGNALS: readonly string[] = [
  'self declared', 'self_declared', 'dichiarato', 'autodichiarato',
  'hr estimate', 'hr_estimate', 'stima hr',
  'spreadsheet aziendale', 'excel aziendale',
  'manual entry', 'input manuale', 'inserimento manuale',
  'stima interna', 'budget stimato', 'valore stimato',
  'l1', 'l1_self',
];

// Signals indicating a derived/calculated estimate (triggers status = 'estimated').
const ESTIMATION_SIGNALS: readonly string[] = [
  'partecipanti x', 'participants x', 'partecipanti ×', '× costo unitario',
  'x costo', 'per partecipante', 'per dipendente', 'per worker',
  'ore x', 'hours x', '× ora', 'costo orario', 'hourly cost',
  'valore voucher x', 'voucher x utenti', 'voucher × utenti',
  'stima', 'stimato', 'estimated', 'estimate',
];

// Policy / non-monetary structural record signals.
const POLICY_NON_MONETARY_SIGNALS: readonly string[] = [
  'smart working policy', 'smart working formale', 'lavoro agile policy',
  'diritto alla disconnessione', 'right to disconnect',
  'no meeting friday', 'no riunioni venerdi', 'deep work friday',
  'ferie illimitate', 'unlimited leave',
  'flexible working policy', 'remote work policy', 'policy flessibilita',
  'congedo policy',
];

// Compliance / blocked record signals (subset for BTI exclusion purposes).
const COMPLIANCE_BLOCKED_SIGNALS: readonly string[] = [
  'd.lgs 81', 'dlgs 81', '81/08', 'sicurezza obbligatoria',
  'sorveglianza sanitaria', 'medico competente', 'visita medica obbligatoria',
  'antincendio', 'primo soccorso obbligatorio', 'gdpr obbligatorio',
  'privacy obbligatoria', 'dvr', 'duvri', 'modello 231', 'dlgs 231',
  'compliance obbligatoria', 'patentino obbligatorio',
];

// Mandatory category signals used with mandatory=true to confirm compliance.
const MANDATORY_CATEGORY_SIGNALS: readonly string[] = [
  'sicurezza', 'safety', 'compliance', 'legale', 'legal',
  'privacy', 'gdpr', 'antincendio', 'primo soccorso', 'dvr', 'dpi', 'hse',
];

// Cash-like / limited economic relief signals.
const CASH_LIKE_SIGNALS: readonly string[] = [
  'buoni pasto', 'buono pasto', 'meal voucher', 'meal vouchers', 'ticket restaurant',
  'buoni benzina', 'buono benzina', 'fuel card', 'buoni carburante',
  'gift card', 'carta regalo',
  'buoni acquisto', 'buono acquisto', 'shopping voucher', 'voucher acquisto',
  'voucher spesa', 'voucher generalista', 'voucher generico',
  'fringe benefit', 'flexible benefit monetario', 'benefit monetario',
  'welfare cash-like', 'rimborso generico', 'bonus monetario',
  'cashback', 'premio in denaro', 'buoni cultura',
];

// Individual-sensitive signals (budget engine must not process individual data).
const INDIVIDUAL_SENSITIVE_SIGNALS: readonly string[] = [
  'nome dipendente', 'cognome dipendente', 'codice fiscale', 'fiscal code',
  'email dipendente', 'sessione individuale', 'sessione terapia',
  'diagnosi individuale', 'referto medico', 'cartella clinica',
  'individuale burnout', 'individual mental health score',
  'worker ranking', 'matricola dipendente',
];

// ── Evidence type map ─────────────────────────────────────────────────────────
// Ordered: most specific first. First match wins.

interface EvidenceTypeRule {
  signals: readonly string[];
  type: BudgetEvidenceType;
}

const EVIDENCE_TYPE_RULES: EvidenceTypeRule[] = [
  { signals: ['welfare provider export', 'welfare_provider_export', 'export fornitore welfare'], type: 'welfare_provider_export' },
  { signals: ['lms export', 'lms_export', 'export lms', 'export piattaforma lms'], type: 'lms_export' },
  { signals: ['purchase order', 'purchase_order', 'ordine d acquisto', 'ordine acquisto'], type: 'purchase_order' },
  { signals: ['invoice', 'fattura'], type: 'invoice' },
  { signals: ['contratto', 'contract'], type: 'contract' },
  { signals: ['payroll aggregate', 'payroll_aggregate', 'aggregato payroll'], type: 'payroll_aggregate' },
  { signals: ['internal budget report', 'internal_budget_report', 'consuntivo interno', 'contabilita analitica', 'cost center', 'centro di costo', 'report interno', 'budget hr', 'report hr', 'accounting export'], type: 'internal_budget_report' },
  { signals: ['hr estimate', 'hr_estimate', 'stima hr'], type: 'hr_estimate' },
  { signals: ['self declared', 'self_declared', 'dichiarato', 'autodichiarato', 'spreadsheet aziendale', 'excel aziendale', 'manual entry', 'input manuale'], type: 'self_declared' },
  { signals: ['not applicable', 'not_applicable', 'non applicabile'], type: 'not_applicable' },
];

// ── Extracted fields ──────────────────────────────────────────────────────────

interface BudgetExtractedFields {
  recordId: string;
  combined: string;
  amount: number | null;
  sourceText: string;
  evidenceHint: string;    // raw evidence type text for level/type detection
  currency: string;
  isPolicy: boolean;
  isComplianceBlocked: boolean;
  isCashLike: boolean;
  hasPrivacySignal: boolean;
  hasEstimationSignal: boolean;
  estimationMethod: string;
  detectedRecordType: string;
  mandatory: boolean | null;
}

function extractKeyValue(
  raw: Record<string, unknown>,
  keySignals: readonly string[],
  excludeSignals: readonly string[] = [],
): string {
  for (const [k, v] of Object.entries(raw)) {
    const nk = normalize(k);
    const excluded = containsAny(nk, excludeSignals);
    if (!excluded && keySignals.some((sig) => nk.includes(sig))) {
      const val = normalize(v);
      if (val) return val;
    }
  }
  return '';
}

function extractAmountFromRaw(raw: Record<string, unknown>): { amount: number | null; currency: string } {
  for (const [k, v] of Object.entries(raw)) {
    const nk = normalize(k);
    if (AMOUNT_KEY_SIGNALS.some((sig) => nk.includes(sig))) {
      // Exclude keys that are clearly source/type identifiers
      if (containsAny(nk, ['source', 'tipo', 'type', 'fonte', 'evidence', 'evidenza'])) continue;
      const parsed = parseAmount(v);
      if (parsed !== null) {
        const rawStr = String(v);
        const currency = rawStr.includes('$') ? 'USD'
          : rawStr.includes('£') ? 'GBP'
          : 'EUR';
        return { amount: parsed, currency };
      }
    }
  }
  return { amount: null, currency: 'EUR' };
}

function detectMandatory(raw: Record<string, unknown>): boolean | null {
  const MANDATORY_KEYS = ['obbligatorio', 'mandatory', 'required'];
  for (const [k, v] of Object.entries(raw)) {
    const nk = normalize(k);
    if (MANDATORY_KEYS.some((mk) => nk.includes(mk))) {
      const nv = normalize(v);
      if (nv === 'si' || nv === 'yes' || nv === 'true' || nv === '1') return true;
      if (nv === 'no' || nv === 'false' || nv === '0') return false;
    }
  }
  return null;
}

function extractFromRaw(record: RawUploadedRecord): BudgetExtractedFields {
  const raw = record.raw;
  const allValues = Object.values(raw).map(normalize).filter((s) => s.length > 0);
  const combined = allValues.join(' ');

  const { amount, currency } = extractAmountFromRaw(raw);
  const sourceText = extractKeyValue(raw, SOURCE_KEY_SIGNALS, SOURCE_KEY_EXCLUSIONS);
  const evidenceHint = sourceText || extractKeyValue(raw, ['tipo evidenza', 'evidence_type', 'evidenza', 'evidence']);
  const mandatory = detectMandatory(raw);

  const hasMandatoryBlock = mandatory === true && containsAny(combined, MANDATORY_CATEGORY_SIGNALS);
  const isComplianceBlocked = containsAny(combined, COMPLIANCE_BLOCKED_SIGNALS) || hasMandatoryBlock;
  const isCashLike = containsAny(combined, CASH_LIKE_SIGNALS);
  const isPolicy = containsAny(combined, POLICY_NON_MONETARY_SIGNALS);
  const hasPrivacySignal = containsAny(combined, INDIVIDUAL_SENSITIVE_SIGNALS);
  const hasEstimationSignal = containsAny(combined, ESTIMATION_SIGNALS);
  const estimationMethod = hasEstimationSignal
    ? (ESTIMATION_SIGNALS.find((s) => combined.includes(s)) ?? '')
    : '';

  return {
    recordId: record.recordId,
    combined,
    amount,
    sourceText: sourceText || 'non specificata',
    evidenceHint,
    currency,
    isPolicy,
    isComplianceBlocked,
    isCashLike,
    hasPrivacySignal,
    hasEstimationSignal,
    estimationMethod,
    detectedRecordType: record.detectedRecordType,
    mandatory,
  };
}

function extractFromUEF(record: NormalizedUEFRecord): BudgetExtractedFields {
  const parts = [
    normalize(record.eventName),
    normalize(record.description),
    normalize(record.category),
    normalize(record.provider ?? ''),
    normalize(record.evidenceType),
    normalize(record.sourceSystem),
  ];
  const combined = parts.filter((p) => p.length > 0).join(' ');

  // Use pre-structured amount if available and valid.
  const preAmount = record.budgetEvidence?.amount ?? null;
  const amount = preAmount !== null && preAmount >= 0 ? preAmount : null;
  const currency = record.budgetEvidence?.currency ?? 'EUR';

  const evidenceHint = normalize(record.evidenceType);
  const sourceText = evidenceHint || record.provider ? `${record.provider ?? ''} / ${record.evidenceType}`.replace(/^\s*\/\s*/, '') : '';

  const hasMandatoryBlock = record.mandatory && containsAny(combined, MANDATORY_CATEGORY_SIGNALS);
  const isComplianceBlocked = containsAny(combined, COMPLIANCE_BLOCKED_SIGNALS) || hasMandatoryBlock;
  const isCashLike = containsAny(combined, CASH_LIKE_SIGNALS);
  const isPolicy = containsAny(combined, POLICY_NON_MONETARY_SIGNALS);
  const hasPrivacySignal = containsAny(combined, INDIVIDUAL_SENSITIVE_SIGNALS);
  const hasEstimationSignal = containsAny(combined, ESTIMATION_SIGNALS);
  const estimationMethod = hasEstimationSignal
    ? (ESTIMATION_SIGNALS.find((s) => combined.includes(s)) ?? '')
    : '';

  return {
    recordId: record.uefId,
    combined,
    amount,
    sourceText: sourceText || 'non specificata',
    evidenceHint,
    currency,
    isPolicy,
    isComplianceBlocked,
    isCashLike,
    hasPrivacySignal,
    hasEstimationSignal,
    estimationMethod,
    detectedRecordType: record.recordType,
    mandatory: record.mandatory,
  };
}

function extractBudgetFields(record: RawUploadedRecord | NormalizedUEFRecord): BudgetExtractedFields {
  try {
    return isRawUploadedRecord(record) ? extractFromRaw(record) : extractFromUEF(record);
  } catch {
    return {
      recordId: '',
      combined: '',
      amount: null,
      sourceText: 'non specificata',
      evidenceHint: '',
      currency: 'EUR',
      isPolicy: false,
      isComplianceBlocked: false,
      isCashLike: false,
      hasPrivacySignal: false,
      hasEstimationSignal: false,
      estimationMethod: '',
      detectedRecordType: 'unknown',
      mandatory: null,
    };
  }
}

// ── Evidence level detection ──────────────────────────────────────────────────

function detectEvidenceLevel(evidenceHint: string, combined: string): BudgetEvidenceLevel {
  const text = evidenceHint + ' ' + combined;
  if (containsAny(text, L4_SIGNALS)) return 'L4_VERIFIED_EVIDENCE';
  if (containsAny(text, L3_SIGNALS)) return 'L3_THIRD_PARTY_DOCUMENT';
  if (containsAny(text, L2_SIGNALS)) return 'L2_INTERNAL_DOCUMENT';
  if (containsAny(text, L1_SIGNALS)) return 'L1_SELF_DECLARED';
  return 'L0_NO_EVIDENCE';
}

// ── Evidence type detection ───────────────────────────────────────────────────

function detectEvidenceType(
  evidenceHint: string,
  combined: string,
  isPolicy: boolean,
  level: BudgetEvidenceLevel,
): BudgetEvidenceType {
  if (isPolicy) return 'not_applicable';
  const text = evidenceHint + ' ' + combined;
  for (const rule of EVIDENCE_TYPE_RULES) {
    if (containsAny(text, rule.signals)) return rule.type;
  }
  // Derive from level when no explicit type keyword found.
  if (level === 'L0_NO_EVIDENCE') return 'not_available';
  if (level === 'L1_SELF_DECLARED') return 'self_declared';
  if (level === 'L2_INTERNAL_DOCUMENT') return 'internal_budget_report';
  return 'not_available';
}

// ── Budget status determination ───────────────────────────────────────────────

function determineBudgetStatus(
  fields: BudgetExtractedFields,
  level: BudgetEvidenceLevel,
): BudgetStatus {
  const { amount, isPolicy, hasEstimationSignal, estimationMethod } = fields;

  if (isPolicy && amount === null) return 'not_applicable';

  if (amount === null) return 'not_available';

  // Estimation takes precedence over level-based documented/declared split.
  if (hasEstimationSignal || containsAny(estimationMethod, ['stima', 'estimated', 'estimate'])) {
    return 'estimated';
  }

  if (level === 'L4_VERIFIED_EVIDENCE' || level === 'L3_THIRD_PARTY_DOCUMENT' || level === 'L2_INTERNAL_DOCUMENT') {
    return 'documented';
  }
  if (level === 'L1_SELF_DECLARED') return 'declared';

  // L0 with amount: treat as declared (amount present but unsourced).
  return 'declared';
}

// ── BTI treatment determination ───────────────────────────────────────────────

function determineBtiTreatment(
  fields: BudgetExtractedFields,
  level: BudgetEvidenceLevel,
): BTITreatment {
  const { isPolicy, isComplianceBlocked, isCashLike, hasPrivacySignal, amount } = fields;

  if (isPolicy) return 'not_applicable';
  if (isComplianceBlocked || hasPrivacySignal) return 'excluded_from_bti';
  if (isCashLike) return 'tracked_only';
  if (level === 'L0_NO_EVIDENCE') return 'excluded_from_bti';
  if (amount === null) return 'excluded_from_bti';
  if (level === 'L3_THIRD_PARTY_DOCUMENT' || level === 'L4_VERIFIED_EVIDENCE') return 'full_weight';
  // L1, L2, or estimated: enter BTI with confidence discount.
  return 'confidence_weighted';
}

// ── Confidence computation ────────────────────────────────────────────────────

const LEVEL_BASE_CONFIDENCE: Record<BudgetEvidenceLevel, number> = {
  L4_VERIFIED_EVIDENCE: 0.95,
  L3_THIRD_PARTY_DOCUMENT: 0.88,
  L2_INTERNAL_DOCUMENT: 0.72,
  L1_SELF_DECLARED: 0.48,
  L0_NO_EVIDENCE: 0.10,
};

function computeConfidence(
  fields: BudgetExtractedFields,
  level: BudgetEvidenceLevel,
  status: BudgetStatus,
): number {
  const { amount, sourceText, hasPrivacySignal, estimationMethod } = fields;

  if (hasPrivacySignal) return 0.15;

  if (status === 'not_applicable') return 0.80;

  let conf = LEVEL_BASE_CONFIDENCE[level];

  // Amount missing: cap hard at 0.20 (no economic value to assess).
  if (amount === null) {
    conf = Math.min(conf, 0.20);
  }

  // Source missing: cap at 0.35.
  if (!sourceText || sourceText === 'non specificata') {
    conf = Math.min(conf, 0.35);
  }

  // Estimated: cap at 0.55 unless a non-trivial estimation method is documented.
  if (status === 'estimated') {
    const hasDetailedMethod = estimationMethod.length > 12;
    conf = Math.min(conf, hasDetailedMethod ? 0.65 : 0.55);
  }

  return Math.round(conf * 1000) / 1000;
}

// ── Notes builder ─────────────────────────────────────────────────────────────

function buildNotes(
  fields: BudgetExtractedFields,
  level: BudgetEvidenceLevel,
  status: BudgetStatus,
  treatment: BTITreatment,
): string {
  const parts: string[] = [];

  if (fields.isPolicy && status === 'not_applicable') {
    parts.push(
      'Policy/non-monetary record: no direct budget invented. ' +
      'Can be analyzed for activation signals, not economic BTI unless evidence is provided.',
    );
    return parts.join(' ');
  }

  if (fields.hasPrivacySignal) {
    parts.push('Segnale di dati individuali sensibili rilevato — budget non elaborato. Revisione privacy necessaria prima di qualsiasi elaborazione economica.');
    return parts.join(' ');
  }

  if (fields.isComplianceBlocked) {
    parts.push('Record di compliance obbligatoria — escluso da BTI per design (Blocked by Design). Non genera IU né contributo al KORA Index.');
  } else if (fields.isCashLike) {
    parts.push('Record cash-like / sollievo economico — tracciato come economic_relief_spend nel BTI. Non genera IU di attivazione.');
  } else if (level === 'L0_NO_EVIDENCE') {
    parts.push('Nessuna fonte di evidenza rilevata — il budget dichiarato senza fonte non è valido per BTI. Evidence Debt accumulato.');
  } else if (status === 'not_available') {
    parts.push('Importo non presente o non estraibile — record non utilizzabile per BTI senza evidenza economica. Evidence Debt accumulato.');
  } else if (status === 'estimated') {
    const method = fields.estimationMethod || 'non specificato';
    parts.push(`Importo stimato — inserito in BTI con confidenza ridotta. Metodo di stima: ${method}.`);
  } else if (level === 'L1_SELF_DECLARED') {
    parts.push('Evidenza autodichiarata — inserita in BTI con penalità di confidenza. Aggiungere documento di supporto per migliorare il livello evidenza.');
  } else if (level === 'L2_INTERNAL_DOCUMENT') {
    parts.push('Documento interno — inserito in BTI con confidenza media. Raccomandato: integrare con evidenza di terza parte.');
  } else if (level === 'L3_THIRD_PARTY_DOCUMENT') {
    parts.push('Documento di terza parte — alta affidabilità per BTI. Confidenza standard applicata.');
  } else if (level === 'L4_VERIFIED_EVIDENCE') {
    parts.push('Evidenza verificata da terza parte indipendente — massima affidabilità BTI.');
  }

  if (treatment === 'excluded_from_bti' && !fields.isComplianceBlocked && !fields.hasPrivacySignal) {
    parts.push('Escluso da BTI: nessun valore economico utilizzabile.');
  }

  return parts.join(' ');
}

// ── Core assessment ───────────────────────────────────────────────────────────

function assessRecord(fields: BudgetExtractedFields): BudgetEvidence {
  const level = detectEvidenceLevel(fields.evidenceHint, fields.combined);
  const evidenceType = detectEvidenceType(fields.evidenceHint, fields.combined, fields.isPolicy, level);
  const status = determineBudgetStatus(fields, level);
  const treatment = determineBtiTreatment(fields, level);
  const confidence = computeConfidence(fields, level, status);
  const usedInBTI = treatment === 'full_weight' || treatment === 'confidence_weighted';
  const notes = buildNotes(fields, level, status, treatment);

  const result: BudgetEvidence = {
    amount: fields.amount,
    currency: fields.currency,
    status,
    evidenceLevel: level,
    evidenceType,
    source: fields.sourceText,
    confidence,
    usedInBTI,
    btiTreatment: treatment,
    notes,
  };

  if (fields.hasEstimationSignal && fields.estimationMethod) {
    result.estimationMethod = fields.estimationMethod;
  }

  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function assessBudgetEvidence(
  record: RawUploadedRecord | NormalizedUEFRecord,
): BudgetEvidence {
  const fields = extractBudgetFields(record);
  return assessRecord(fields);
}

export function assessBudgetEvidenceBatch(
  records: Array<RawUploadedRecord | NormalizedUEFRecord>,
): BudgetEvidence[] {
  return records.map(assessBudgetEvidence);
}

// ── Exported helpers (for testing / explainability) ───────────────────────────

export {
  detectEvidenceLevel as _detectEvidenceLevelForTest,
  detectEvidenceType as _detectEvidenceTypeForTest,
  parseAmount as _parseAmountForTest,
  LEVEL_BASE_CONFIDENCE as EVIDENCE_LEVEL_BASE_CONFIDENCE,
};
