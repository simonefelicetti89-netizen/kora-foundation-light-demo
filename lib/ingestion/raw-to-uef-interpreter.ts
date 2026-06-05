// lib/ingestion/raw-to-uef-interpreter.ts
// Raw-to-UEF Rule-Based Interpreter v0.1 — KORA Foundation Light B5/B18/B23.
//
// Transforms a personal.uploaded_record (PII-free payload from B4.2) into a
// proposed UEF candidate. Pure function — no DB, no LLM, no side effects.
// Deterministic, auditable via reason_codes, confidence-scored.
//
// Priority order: BLOCKED > LIMITED > ELIGIBLE.
// Mental health: program-level only — never individual health/diagnosis data.
// B18: taxonomy extension + ESRS reporting alignment (no compliance claim).
// B23: Structural People Policies taxonomy closure — adds reason codes
//      taxonomy:structural_people_policy and structural_policy:* for
//      organizational_flexibility, protection_future_security, care_family_support,
//      growth_infrastructure, inclusion_infrastructure families.
//      Adds welfare_wallet → limited, leadership/succession → eligible.

import { deriveReportingAlignment, type ReportingAlignment } from '@/lib/reporting/reporting-alignment';
import { deriveEvidenceGaps, type EvidenceGap } from '@/lib/reporting/evidence-gap-engine';

export type Pillar = 'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY';
export type EligibilityProposal = 'eligible' | 'limited' | 'blocked';
export type EvidenceLevel = 'L0' | 'L1' | 'L2' | 'L3';

// ── B11.3: Batch-level financial context ─────────────────────────────────────
// Stored in analytics.source_batch.payload_sample (JSONB, _b11_3: true marker).
// Bridge storage pre-Gate-2 — migrate to financial_metadata jsonb when Gate 2 opens.
// financialNotes is intentionally absent: never persisted (privacy boundary).

export type FinancialSourceType =
  | 'hr_declaration' | 'provider_export' | 'lms_export'
  | 'internal_accounting' | 'invoice_consuntivo' | 'unknown';

export type BudgetScope =
  | 'welfare' | 'fringe_benefit' | 'hr_learning'
  | 'esg_volunteering' | 'compliance_hse' | 'mixed' | 'unknown';

export interface BatchFinancialContext {
  currency:                'EUR';
  financialSourceType:     FinancialSourceType;
  defaultEvidenceLevel:    EvidenceLevel;
  budgetScope:             BudgetScope;
  containsAmounts:         'yes' | 'no' | 'unknown';
  containsEconomicRelief:  'yes' | 'no' | 'unknown';
  containsComplianceSpend: 'yes' | 'no' | 'unknown';
}
// ─────────────────────────────────────────────────────────────────────────────

// ── B11/B18: Initiative domain + budget class taxonomies ──────────────────────
export type InitiativeDomain =
  | 'welfare' | 'fringe_benefit' | 'economic_relief' | 'hr_learning'
  | 'esg_volunteering' | 'compliance_hse' | 'previdenza_future'
  | 'wellbeing_mental_health' | 'unknown'
  // B18 extensions
  | 'organizational_flexibility'   // work-life balance structural policies
  | 'protection_future_security'   // health insurance, pension
  | 'wellbeing_light'              // gym, fitness, light wellness
  | 'welfare_care'                 // caregiver, childcare, family support
  | 'inclusion_equity';            // D&I, diversity & inclusion

export type BudgetClass =
  | 'deep_activation' | 'economic_relief' | 'compliance_blocked' | 'unknown';

export type AmountParsingStatus = 'parsed' | 'missing' | 'invalid';
export type ParticipantsParsingStatus = 'parsed' | 'missing' | 'invalid' | 'approximate';

export interface UefCandidateProposal {
  rawName:                string;
  eventType:              string;
  pillar:                 Pillar | null;
  eligibility:            EligibilityProposal;
  actionFamily:           string | null;
  eventNature:            string | null;
  budgetAmount:           number | null;
  amountParsingStatus:    AmountParsingStatus;
  rawAmountValue:         string | null;   // original raw string — preserved only when status='invalid'
  participants:           number | null;
  participantsApproximate: boolean;
  evidenceLevel:          EvidenceLevel | null;
  sourceTier:             string | null;
  mappingConfidence:      number;        // 0.30–0.95
  // ── B11: enrichment classification ──────────────────────────────────────
  initiativeDomain:       InitiativeDomain;
  budgetClass:            BudgetClass;
  needsEnrichment:        boolean;
  financialConfidence:    number;        // 0.10–0.90 (budget-aware)
  enrichmentMissingFields: string[];
  // ── B18: reporting alignment — no compliance claim ───────────────────────
  reportingAlignment:     ReportingAlignment | null;
  // ── B19: evidence gaps — readiness per area, evidence-driven (not area-strength-driven) ──
  evidenceGaps:           EvidenceGap[] | null;
  // ─────────────────────────────────────────────────────────────────────────
  reasonCodes:            string[];      // machine-readable
  warnings:               string[];
  approvedForScoring:     false;         // always false — requires human approval
  approvedForBTI:         false;
  approvedForImpactUnits: false;
  interpreterVersion:     '0.1';
  generatedBy:            'rule_engine_v0_1';
}

export interface UploadedRecordInput {
  id:                 string;
  payload:            Record<string, unknown>;
  action_family:      string | null;
  event_nature:       string | null;
  primary_pillar:     string | null;
  eligibility_status: string | null;
}

// ── Keyword tables ─────────────────────────────────────────────────────────────

const KW_BLOCKED = [
  'compliance', 'sicurezza obbligator', 'obbligatoria', 'hse', ' dpi ', 'dvr', 'duvri',
  'patentino obbligator', 'sorveglianza sanitaria', '81/08', 'dlgs 81', 'd.lgs 81',
  'gdpr obbligator', 'modello 231', 'antincendio obbligator', 'primo soccorso obbligator',
  'adempiment', 'compliance legale',
];

const KW_LIMITED = [
  'buoni pasto', 'buono pasto', 'meal voucher', 'ticket restaurant',
  'gift card', 'buoni acquisto', 'voucher generalista', 'voucher generico',
  'fringe benefit', 'benefit monetar', 'welfare cash', 'rimborso generico',
  'bonus monetar', 'cashback', 'sollievo economico', 'economic relief',
  // B23: welfare wallet / flexible benefit platform — generic economic relief distribution
  'welfare wallet', 'conto welfare', 'credito welfare', 'piattaforma welfare',
  'portafoglio welfare', 'welfare platform', 'flexible benefit wallet',
];

const KW_MENTAL_HEALTH = [
  'psicolog', 'mental health', 'supporto psicolog', 'counselling', 'counseling',
  'benessere psicolog', 'supporto emotivo', 'assistenza psicolog', 'burnout',
];

const KW_HEALTH_WELLNESS = [
  'salute', 'benessere fisico', 'prevenzione', 'nutrizione', 'attività fisica',
  'wellbeing', 'welfare salute', 'prevenzione sanitaria', 'checkup', 'fisioterapia',
];

const KW_TRAINING = [
  'formazione', 'training', 'upskilling', 'lms', 'academy', 'e-learning',
  'apprendimento', 'aggiornamento professionale', 'reskilling', 'digital skills',
  'sviluppo professionale', 'certificazione professionale', 'crescita professionale',
  // B18: reinforce professional course patterns
  'corso professionalizzante', 'corsi professionalizzanti', 'corso professionale',
  'percorso professionale', 'career path', 'piano formativo', 'learning path',
  'bootcamp', 'hackathon formativo', 'workshop professionale',
];

const KW_MENTORING = [
  'mentoring', 'mentoraggio', 'coaching', 'inter-funzional',
  'affiancamento', 'buddy program', 'peer coaching',
];

const KW_VOLUNTEERING = [
  'volontariato', 'volunteering', 'community', 'territoriale', 'impatto sociale',
  'iniziativa sociale', 'pro bono', 'territorio',
];

const KW_LEGACY = [
  'trasferimento competenze', 'senior-junior', 'legacy conoscenza',
  'knowledge transfer', 'memoria organizzativa', 'prassi aziendali',
  // B23: succession and org memory extended
  'passaggio generazionale', 'legacy aziendale', 'cultura organizzativa strutturata',
];

// ── B18: Extended keyword groups ──────────────────────────────────────────────

// Organizational flexibility: structural work-life balance policies (no direct budget)
const KW_ORG_FLEXIBILITY = [
  'ferie illimitate', 'unlimited leave', 'unlimited pto', 'ferie senza limite',
  'smart working', 'remote work', 'lavoro agile', 'lavoro da remoto', 'telelavoro strutturato',
  'diritto alla disconnessione', 'diritto disconnessione', 'right to disconnect', 'disconnessione digitale',
  'no meeting day', 'no-meeting day', 'meeting free', 'focus time',
  'settimana corta', 'four day week', '4 day week', 'settimana lavorativa corta',
  'flessibilità oraria', 'flexible working', 'flexible work', 'orario flessibile',
  'permessi extra', 'permessi aggiuntivi', 'congedo migliorativo',
  'genitorialità', 'parental leave', 'congedo parentale', 'congedo papà',
  'maternità facoltativa', 'paternità estesa',
  // B23: additional structural policy variants
  'permessi genitorialità', 'permesso genitorialità', 'congedo genitorialita',
  'rientro maternità', 'rientro paternità', 'supporto rientro',
];

// Protection & future security: insurance, pension (structured benefit programs)
const KW_PROTECTION_INSURANCE = [
  'assicurazione sanitaria', 'sanità integrativa', 'polizza sanitaria',
  'health insurance', 'copertura sanitaria', 'welfare sanitario integrativo',
  'mutua sanitaria', 'fondo sanitario', 'rimborso spese sanitarie',
  'previdenza integrativa', 'pensione integrativa', 'fondo pensione',
  'previdenza complementare', 'piano pensionistico', 'contributo previdenziale',
  'future security', 'social protection fund',
  // B23: long-term protection / life insurance / LTC
  'polizza vita', 'life insurance', 'long-term care', 'ltc aziendale',
  'non autosufficienza', 'copertura ltc', 'copertura non autosufficienza',
  'rendita integrativa', 'capitale differito', 'protezione famiglia',
];

// Wellbeing light: gym, fitness, light wellness (not clinical, not mental health)
const KW_WELLBEING_LIGHT = [
  'palestra', 'gym', 'convenzione palestra', 'abbonamento palestra',
  'ore palestra', 'fitness', 'challenge passi', 'step challenge',
  'app mindfulness', 'app meditazione', 'webinar benessere',
  'wellness day', 'sport aziendale', 'attività sportiva', 'yoga aziendale',
  'bike to work', 'sport benefit',
];

// Caregiver & childcare: family support welfare programs
const KW_CAREGIVER_CHILDCARE = [
  'caregiver', 'assistenza familiare', 'eldercare', 'assistenza anziani',
  'nido', 'asilo nido', 'childcare', 'baby-sitting', 'babysitting',
  'nido aziendale', 'contributo nido', 'rimborso asilo',
  'supporto genitorialità', 'supporto famiglia', 'congedo cura familiare',
];

// B23: Leadership development + succession planning (GROWTH / LEGACY)
// Positioned before KW_TRAINING to capture explicit leadership programs before
// generic training keywords match.
const KW_LEADERSHIP = [
  'leadership program', 'leadership development', 'programma leadership',
  'sviluppo leadership', 'leadership aziendale', 'leadership academy',
  'manager development', 'sviluppo manageriale', 'percorso manageriale',
  'succession planning', 'succession plan', 'piano successione',
  'piano di successione', 'piani di successione', 'programma successione',
  'talent management', 'talent program', 'high potential', 'hi-po program',
];

// D&I / inclusion: diversity, equity, inclusion programs
const KW_INCLUSION_DEI = [
  'diversity', 'inclusion', 'inclusione', 'diversità e inclusione',
  'pari opportunità', 'gender equity', 'gender equality',
  'disability inclusion', 'disabilità', 'neurodiversity', 'neurodiversità',
  'workshop d&i', 'unconscious bias', 'parità di genere', 'pay equity',
  'inclusività', 'accessibilità',
];

// ── Source tier keywords ───────────────────────────────────────────────────────

const KW_SOURCE_L3 = [
  'export fornitore welfare', 'welfare provider export', 'export piattaforma lms',
  'export lms', 'lms export', 'export fornitore',
];
const KW_SOURCE_L2 = [
  'consuntivo interno', 'report interno', 'budget hr', 'report hr',
  'cost center', 'contabilita', 'documento interno',
];
const KW_SOURCE_L1 = [
  'dichiarato', 'self-declared', 'self_declared', 'stima hr',
  'autodichiarato', 'spreadsheet', 'excel aziendale', 'input manuale',
];

// ── B11.3: Batch context conversion maps ─────────────────────────────────────

const FINANCIAL_SOURCE_TO_TIER: Record<FinancialSourceType, string | null> = {
  provider_export:      'welfare_provider_export',
  lms_export:           'lms_platform_export',
  internal_accounting:  'internal_accounting',
  invoice_consuntivo:   'invoice_document',
  hr_declaration:       'hr_declaration',
  unknown:              null,
};

const BUDGET_SCOPE_TO_DOMAIN: Partial<Record<BudgetScope, InitiativeDomain>> = {
  welfare:          'welfare',
  fringe_benefit:   'fringe_benefit',
  hr_learning:      'hr_learning',
  esg_volunteering: 'esg_volunteering',
  compliance_hse:   'compliance_hse',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).toLowerCase().trim();
}

function hasAny(text: string, kws: string[]): boolean {
  return kws.some(kw => text.includes(kw));
}

function firstKw(text: string, kws: string[]): string | null {
  return kws.find(kw => text.includes(kw)) ?? null;
}

// ── B65-B1: Amount normalization — handles European (1.234,56) and US (1,234.56) formats
interface AmountParseResult {
  value: number | null;
  raw: string;
  status: AmountParsingStatus;
}

function normalizeAmount(v: unknown): AmountParseResult {
  if (v === null || v === undefined) return { value: null, raw: '', status: 'missing' };
  const raw = String(v).trim();
  if (!raw) return { value: null, raw, status: 'missing' };

  if (typeof v === 'number') {
    if (isFinite(v) && v >= 0) return { value: v, raw, status: 'parsed' };
    return { value: null, raw, status: 'invalid' };
  }

  // Strip currency symbols and keyword prefixes/suffixes
  let s = raw
    .replace(/^(EUR|USD|GBP|CHF)\s*/i, '')
    .replace(/\s*(EUR|USD|GBP|CHF)$/i, '')
    .replace(/^[€$£]\s*/, '')
    .replace(/\s*[€$£]$/, '')
    .replace(/\s+/g, '');  // also handles space-as-thousands-separator (1 234,56)

  if (!s) return { value: null, raw, status: 'missing' };

  const hasDot   = s.includes('.');
  const hasComma = s.includes(',');

  let normalized: string;

  if (hasDot && hasComma) {
    // Both present — determine which is decimal by position of last occurrence
    if (s.lastIndexOf('.') > s.lastIndexOf(',')) {
      // US format: 1,234.56 → strip commas, keep dot
      normalized = s.replace(/,/g, '');
    } else {
      // European format: 1.234,56 → strip dots, comma → dot
      normalized = s.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma && !hasDot) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal comma: 1234,56 or 12,5
      normalized = parts[0] + '.' + parts[1];
    } else {
      // Thousands comma(s): 1,234 or 1,234,567 → strip all
      normalized = s.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Decimal dot: 1234.56 or 1234.5
      normalized = s;
    } else {
      // Thousands dot(s): 1.234 or 1.234.567 → strip all
      normalized = s.replace(/\./g, '');
    }
  } else {
    normalized = s;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return { value: null, raw, status: 'invalid' };
  const n = parseFloat(normalized);
  if (!isFinite(n) || n < 0) return { value: null, raw, status: 'invalid' };
  return { value: n, raw, status: 'parsed' };
}

// ── B65-B1: Participants normalization — handles text like "~30", "circa 30 persone"
interface ParticipantsParseResult {
  value: number | null;
  raw: string;
  status: ParticipantsParsingStatus;
  approximate: boolean;
}

function normalizeParticipants(v: unknown): ParticipantsParseResult {
  if (v === null || v === undefined) return { value: null, raw: '', status: 'missing', approximate: false };
  const raw = String(v).trim();
  if (!raw) return { value: null, raw, status: 'missing', approximate: false };

  if (typeof v === 'number') {
    if (isFinite(v) && v >= 0) return { value: Math.round(v), raw, status: 'parsed', approximate: false };
    return { value: null, raw, status: 'invalid', approximate: false };
  }

  const lower = raw.toLowerCase();
  const isApproximate = /^~/.test(lower) || /\bcirca\b/.test(lower) || /\bapprox\b/.test(lower) || /\bca\.?\b/.test(lower);

  const match = lower.match(/\d+/);
  if (!match) return { value: null, raw, status: 'invalid', approximate: false };

  const n = parseInt(match[0], 10);
  if (!isFinite(n) || n < 0) return { value: null, raw, status: 'invalid', approximate: false };

  if (isApproximate) return { value: n, raw, status: 'approximate', approximate: true };
  return { value: n, raw, status: 'parsed', approximate: false };
}

function detectEvidence(payload: Record<string, unknown>): {
  level: EvidenceLevel; sourceTier: string | null; code: string;
} {
  const raw = [
    str(payload['source']), str(payload['fonte']),
    str(payload['budget_source']), str(payload['evidence_type']),
  ].join(' ');

  if (hasAny(raw, KW_SOURCE_L3)) {
    return { level: 'L3', sourceTier: firstKw(raw, KW_SOURCE_L3), code: 'source_rule:external_provider_export_L3' };
  }
  if (hasAny(raw, KW_SOURCE_L2)) {
    return { level: 'L2', sourceTier: firstKw(raw, KW_SOURCE_L2), code: 'source_rule:internal_document_L2' };
  }
  if (hasAny(raw, KW_SOURCE_L1)) {
    return { level: 'L1', sourceTier: firstKw(raw, KW_SOURCE_L1), code: 'source_rule:self_declared_L1' };
  }
  return { level: 'L0', sourceTier: null, code: 'source_rule:missing_source_L0' };
}

function computeConfidence(p: {
  strongKeyword: boolean; pillarClear: boolean; ambiguous: boolean;
  eligClear: boolean; evidence: EvidenceLevel | null;
  hasBudget: boolean; hasParticipants: boolean; noMatch: boolean;
}): number {
  let c = 0.40;
  if (p.strongKeyword)  c += 0.25;
  if (p.pillarClear)    c += 0.15;
  if (p.eligClear)      c += 0.10;
  if (p.evidence === 'L3')      c += 0.12;
  else if (p.evidence === 'L2') c += 0.08;
  else if (p.evidence === 'L1') c += 0.04;
  if (p.hasBudget)       c += 0.05;
  if (p.hasParticipants) c += 0.04;
  if (p.ambiguous)      c -= 0.18;
  if (p.noMatch)        c -= 0.15;
  if (!p.evidence || p.evidence === 'L0') c -= 0.08;
  return Math.max(0.30, Math.min(0.95, Math.round(c * 100) / 100));
}

// ── B11: Domain + budget class derivation ────────────────────────────────────

function deriveInitiativeDomain(eventType: string, eligibility: EligibilityProposal): InitiativeDomain {
  if (eligibility === 'blocked') return 'compliance_hse';
  if (eligibility === 'limited') return 'fringe_benefit';
  switch (eventType) {
    case 'mental_health_support':       return 'wellbeing_mental_health';
    case 'health_wellness_program':     return 'welfare';
    case 'professional_training':       return 'hr_learning';
    case 'mentoring_program':           return 'hr_learning';
    case 'knowledge_transfer':          return 'hr_learning';
    case 'volunteering':                return 'esg_volunteering';
    case 'economic_relief':             return 'fringe_benefit';
    case 'compliance_baseline':         return 'compliance_hse';
    // B18 extensions
    case 'work_life_balance_policy':
    case 'flexible_work_policy':        return 'organizational_flexibility';
    case 'health_insurance_support':
    case 'pension_future_support':
    case 'long_term_protection_support': return 'protection_future_security';
    case 'fitness_wellbeing_program':
    case 'light_wellbeing_event':       return 'wellbeing_light';
    case 'caregiver_support':
    case 'childcare_support':           return 'welfare_care';
    case 'inclusion_program':           return 'inclusion_equity';
    // B23 extensions
    case 'leadership_development_program':
    case 'succession_planning':         return 'hr_learning';
    default:                            return 'unknown';
  }
}

function deriveBudgetClass(eligibility: EligibilityProposal, budgetAmount: number | null): BudgetClass {
  if (eligibility === 'blocked')                            return 'compliance_blocked';
  if (eligibility === 'limited')                            return 'economic_relief';
  if (eligibility === 'eligible' && budgetAmount !== null)  return 'deep_activation';
  return 'unknown';
}

function computeEnrichmentStatus(params: {
  eligibility:       EligibilityProposal;
  budgetAmount:      number | null;
  amountParsingStatus: AmountParsingStatus;
  sourceTier:        string | null;
  evidenceLevel:     EvidenceLevel | null;
  initiativeDomain:  InitiativeDomain;
  eventType:         string;
  pillar:            Pillar | null;
}): { needsEnrichment: boolean; missingFields: string[] } {
  const { eligibility, budgetAmount, amountParsingStatus, sourceTier, evidenceLevel, initiativeDomain, eventType, pillar } = params;
  const missing: string[] = [];

  // Invalid amount format requires human correction — treat same as missing for enrichment
  if (eligibility !== 'blocked' && amountParsingStatus === 'invalid') missing.push('budget_amount_invalid_format');
  // Non-compliance records need a budget amount for BTI contribution
  if (eligibility !== 'blocked' && budgetAmount === null && amountParsingStatus !== 'invalid') missing.push('budget_amount');
  // Source/evidence needed for credible financial reporting
  if (eligibility !== 'blocked' && (!sourceTier || !evidenceLevel || evidenceLevel === 'L0')) {
    missing.push('budget_source');
  }
  if (initiativeDomain === 'unknown') missing.push('initiative_domain');
  if (eventType === 'unclassified')   missing.push('event_type');
  if (!pillar && eligibility !== 'blocked') missing.push('pillar');

  return { needsEnrichment: missing.length > 0, missingFields: missing };
}

function computeFinancialConfidence(
  mappingConfidence: number,
  budgetAmount:  number | null,
  evidenceLevel: EvidenceLevel | null,
): number {
  let fc = mappingConfidence;
  if (budgetAmount === null)                          fc -= 0.20;
  if (!evidenceLevel || evidenceLevel === 'L0')       fc -= 0.15;
  else if (evidenceLevel === 'L1')                    fc -= 0.05;
  return Math.max(0.10, Math.min(0.90, Math.round(fc * 100) / 100));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function interpretUploadedRecord(
  record: UploadedRecordInput,
  // methodologyVersion retained for future versioned config reads
  _methodologyVersion = 'KORA Methodology v0.1',
  batchContext?: BatchFinancialContext,
): UefCandidateProposal {
  const p = record.payload;

  // Combined text for keyword matching — lowercase, no PII fields
  const rawNameRaw = str(p['initiative_name'] ?? p['nome_iniziativa'] ?? '');
  const combined   = [
    rawNameRaw,
    str(record.action_family),    str(record.event_nature),
    str(record.primary_pillar),   str(p['category']),
    str(p['categoria']),          str(p['type']),
    str(p['tipo']),               str(p['initiative_type']),
  ].join(' ');

  const reasonCodes: string[] = [];
  const warnings:    string[] = [];

  const rawName = rawNameRaw || record.action_family || 'Unknown initiative';
  if (!rawNameRaw) warnings.push('warning:missing_initiative_name');

  const amountParse = normalizeAmount(p['amount'] ?? p['importo'] ?? p['budget_amount'] ?? p['cost']);
  const participantsParse = normalizeParticipants(p['participants'] ?? p['partecipanti']);

  const budgetAmount = amountParse.value;
  const amountParsingStatus = amountParse.status;
  const participants = participantsParse.value;
  const participantsApproximate = participantsParse.approximate;

  if (budgetAmount !== null) reasonCodes.push('budget_amount_detected');
  if (participants !== null) reasonCodes.push('participants_detected');
  if (participantsApproximate) reasonCodes.push('participants_approximate');

  if (amountParsingStatus === 'invalid') {
    warnings.push('warning:amount_parse_failed');
    reasonCodes.push('amount_parse:invalid_format');
  } else if (budgetAmount === null) {
    warnings.push('warning:missing_budget_amount');
    // B11.3: batch context never invents amounts — budget_amount stays null
    if (batchContext) reasonCodes.push('batch_financial_metadata:amount_not_provided');
  }
  if (participantsParse.status === 'invalid') warnings.push('warning:participants_parse_failed');
  else if (participants === null) warnings.push('warning:missing_participants');

  // B11.3: evidence level and source tier — record-level data takes priority.
  // Batch context is used only as fallback when record has no source (L0).
  const detectedEvidence = detectEvidence(p);
  let evidenceLevel = detectedEvidence.level;
  let sourceTier    = detectedEvidence.sourceTier;
  reasonCodes.push(detectedEvidence.code);

  if (batchContext) {
    if (evidenceLevel === 'L0' && batchContext.defaultEvidenceLevel !== 'L0') {
      // Record has no source — use batch default evidence level as fallback
      evidenceLevel = batchContext.defaultEvidenceLevel;
      sourceTier    = FINANCIAL_SOURCE_TO_TIER[batchContext.financialSourceType] ?? sourceTier;
      reasonCodes.push('batch_financial_metadata:evidence_level');
    } else {
      if (evidenceLevel === 'L0') warnings.push('warning:missing_source');
      // Source tier fallback: record has no tier but batch identifies a source
      if (!sourceTier && batchContext.financialSourceType !== 'unknown') {
        sourceTier = FINANCIAL_SOURCE_TO_TIER[batchContext.financialSourceType] ?? null;
        if (sourceTier) reasonCodes.push('batch_financial_metadata:source_type');
      }
    }
  } else {
    if (evidenceLevel === 'L0') warnings.push('warning:missing_source');
  }

  // ── Rule matching — BLOCKED > LIMITED > ELIGIBLE ─────────────────────────

  let eventType:     string             = 'unclassified';
  let pillar:        Pillar | null      = null;
  let eligibility:   EligibilityProposal = 'eligible';
  let strongKw = false, pillarClear = false, ambiguous = false, noMatch = false;

  if (hasAny(combined, KW_BLOCKED)) {
    eventType = 'compliance_baseline'; pillar = null; eligibility = 'blocked';
    strongKw = true; pillarClear = false; noMatch = false;
    reasonCodes.push('keyword:compliance_blocked', 'blocked_by_design:legal_compliance', 'eligibility_rule:compliance_blocked');

  } else if (hasAny(combined, KW_LIMITED)) {
    eventType = 'economic_relief'; pillar = 'LIFE'; eligibility = 'limited';
    strongKw = true; pillarClear = true;
    reasonCodes.push('keyword:economic_relief_voucher', 'pillar_rule:economic_relief_to_LIFE', 'eligibility_rule:economic_relief_limited');

  } else if (hasAny(combined, KW_MENTAL_HEALTH)) {
    eventType = 'mental_health_support'; pillar = 'LIFE'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push('keyword:mental_health_support', 'pillar_rule:mental_health_to_LIFE');

  // B18/B23: protection/insurance before generic health_wellness to avoid false matches
  } else if (hasAny(combined, KW_PROTECTION_INSURANCE)) {
    // Distinguish health insurance vs pension/previdenza vs long-term care
    const isPrevidenza = hasAny(combined, [
      'previdenza', 'pensione', 'fondo pensione', 'piano pensionistico', 'previdenza complementare',
    ]);
    const isLongTermCare = hasAny(combined, [
      'long-term care', 'ltc', 'non autosufficienza', 'copertura ltc', 'polizza vita',
    ]);
    if (isLongTermCare) {
      eventType = 'long_term_protection_support'; pillar = 'LEGACY'; eligibility = 'eligible';
    } else {
      eventType = isPrevidenza ? 'pension_future_support' : 'health_insurance_support';
      pillar    = isPrevidenza ? 'LEGACY' : 'LIFE';
    }
    eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push(
      'keyword:protection_insurance',
      'taxonomy:protection_future_security',
      'taxonomy:structural_people_policy',
      'structural_policy:protection_future_security',
    );

  } else if (hasAny(combined, KW_HEALTH_WELLNESS)) {
    eventType = 'health_wellness_program'; pillar = 'LIFE'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push('keyword:health_wellness', 'pillar_rule:wellness_to_LIFE');

  // B18/B23: organizational flexibility — structural policies (non-monetary, need usage evidence)
  } else if (hasAny(combined, KW_ORG_FLEXIBILITY)) {
    eventType = 'work_life_balance_policy'; pillar = 'LIFE'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push(
      'keyword:org_flexibility',
      'taxonomy:organizational_flexibility',
      'taxonomy:structural_people_policy',
      'structural_policy:organizational_flexibility',
    );

  // B18: wellbeing light — gym, fitness (eligible but low auto-confidence without budget/participants)
  } else if (hasAny(combined, KW_WELLBEING_LIGHT)) {
    eventType = 'fitness_wellbeing_program'; pillar = 'LIFE'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push('keyword:wellbeing_light', 'taxonomy:wellbeing_light');

  } else if (hasAny(combined, KW_LEGACY)) {
    eventType = 'knowledge_transfer'; pillar = 'LEGACY'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push('keyword:knowledge_transfer', 'pillar_rule:legacy_to_LEGACY');

  } else if (hasAny(combined, KW_VOLUNTEERING)) {
    eventType = 'volunteering'; pillar = 'IMPACT'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push('keyword:volunteering', 'pillar_rule:volunteering_to_IMPACT');

  // B18/B23: caregiver / childcare — welfare care (deep activation with provider evidence)
  } else if (hasAny(combined, KW_CAREGIVER_CHILDCARE)) {
    const isChildcare = hasAny(combined, ['nido', 'asilo', 'childcare', 'baby', 'babysitting']);
    eventType = isChildcare ? 'childcare_support' : 'caregiver_support';
    pillar = 'LIFE'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push(
      'keyword:caregiver_childcare',
      'taxonomy:welfare_care',
      'taxonomy:structural_people_policy',
      'structural_policy:care_family_support',
    );

  // B23: Leadership development + succession planning — before mentoring/training
  } else if (hasAny(combined, KW_LEADERSHIP)) {
    const isSuccession = hasAny(combined, ['succession', 'successione', 'passaggio generazionale', 'talent management']);
    if (isSuccession) {
      eventType = 'succession_planning'; pillar = 'LEGACY'; eligibility = 'eligible';
      reasonCodes.push('keyword:succession_planning', 'taxonomy:growth_infrastructure');
    } else {
      eventType = 'leadership_development_program'; pillar = 'GROWTH'; eligibility = 'eligible';
      reasonCodes.push('keyword:leadership_development', 'taxonomy:growth_infrastructure');
    }
    strongKw = true; pillarClear = true;
    reasonCodes.push('taxonomy:structural_people_policy', 'structural_policy:growth_infrastructure');

  // B18/B23: D&I / inclusion — eligible, lower confidence if generic single event
  } else if (hasAny(combined, KW_INCLUSION_DEI)) {
    eventType = 'inclusion_program'; pillar = 'CONNECTION'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    // Generic one-off workshop → flag as ambiguous to reduce confidence
    const isGenericWorkshop = hasAny(combined, ['workshop']) && !hasAny(combined, ['programma', 'percorso', 'piano', 'strutturato', 'annuale']);
    if (isGenericWorkshop) {
      ambiguous = true;
      reasonCodes.push('taxonomy:inclusion_equity:generic_event', 'taxonomy:structural_people_policy', 'structural_policy:inclusion_infrastructure');
    } else {
      reasonCodes.push('taxonomy:inclusion_equity', 'taxonomy:structural_people_policy', 'structural_policy:inclusion_infrastructure');
    }

  } else if (hasAny(combined, KW_MENTORING)) {
    eventType = 'mentoring_program'; pillar = 'CONNECTION'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push('keyword:mentoring_program', 'pillar_rule:mentoring_to_CONNECTION');

  } else if (hasAny(combined, KW_TRAINING)) {
    eventType = 'professional_training'; pillar = 'GROWTH'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push('keyword:professional_training', 'pillar_rule:training_to_GROWTH');

  } else {
    // No keyword match — fall back to upstream data from uploaded_record
    noMatch = true;
    warnings.push('warning:no_keyword_match');
    reasonCodes.push('fallback:upstream_data_used');

    if (record.primary_pillar) {
      pillar      = record.primary_pillar.toUpperCase() as Pillar;
      pillarClear = true;
    } else {
      ambiguous = true;
      warnings.push('warning:ambiguous_pillar');
    }

    const up = record.eligibility_status;
    eligibility = up === 'blocked' ? 'blocked' : up === 'limited' ? 'limited' : 'eligible';
    eventType   = record.event_nature ?? record.action_family ?? 'unclassified';
  }

  if (eligibility === 'eligible') reasonCodes.push('eligibility_rule:eligible_program');

  const mappingConfidence = computeConfidence({
    strongKeyword: strongKw, pillarClear, ambiguous, eligClear: !noMatch,
    evidence: evidenceLevel, hasBudget: budgetAmount !== null,
    hasParticipants: participants !== null, noMatch,
  });

  const actionFamily = record.action_family || str(p['category'] ?? p['categoria']) || null;
  const eventNature  = record.event_nature  || str(p['type'] ?? p['tipo']) || null;

  // ── B11: derive domain, budget class, enrichment status ──────────────────
  let initiativeDomain = deriveInitiativeDomain(eventType, eligibility);
  // B11.3: budget scope fallback — only if domain is still unknown after rule derivation
  if (initiativeDomain === 'unknown' && batchContext?.budgetScope) {
    const scopeDomain = BUDGET_SCOPE_TO_DOMAIN[batchContext.budgetScope];
    if (scopeDomain) {
      initiativeDomain = scopeDomain;
      reasonCodes.push('batch_financial_metadata:budget_scope');
    }
  }
  const budgetClass = deriveBudgetClass(eligibility, budgetAmount);

  const { needsEnrichment, missingFields } = computeEnrichmentStatus({
    eligibility, budgetAmount, amountParsingStatus, sourceTier, evidenceLevel,
    initiativeDomain, eventType, pillar,
  });

  const financialConfidence = computeFinancialConfidence(mappingConfidence, budgetAmount, evidenceLevel);

  if (needsEnrichment) {
    reasonCodes.push('needs_enrichment:manual_review_required');
    warnings.push(`needs_enrichment:missing_fields:${missingFields.join(',')}`);
  }
  if (initiativeDomain !== 'unknown') {
    reasonCodes.push(`domain_rule:${initiativeDomain}`);
  }
  if (budgetClass !== 'unknown') {
    reasonCodes.push(`budget_class:${budgetClass}`);
  }
  // ── B18: derive reporting alignment — no compliance claim ─────────────────
  const reportingAlignment = deriveReportingAlignment(eventType, eligibility);
  if (reportingAlignment) {
    reasonCodes.push(`reporting_alignment:${reportingAlignment.areas.map(a => a.code).join(',')}`);
  }
  // ── B19: derive evidence gaps — readiness depends on evidence, not area strength ──
  const evidenceGaps = deriveEvidenceGaps({
    reportingAlignment,
    initiativeDomain,
    eventType,
    eligibility,
    pillar,
    budgetClass,
    budgetAmount,
    sourceTier,
    evidenceLevel,
    financialConfidence,
    needsEnrichment,
    enrichmentMissingFields: missingFields,
    participants,
    reasonCodes: [...new Set(reasonCodes)],
  });
  if (evidenceGaps.length > 0) {
    const worstReadiness = evidenceGaps.reduce(
      (worst, g) => {
        const rank = { not_ready: 0, needs_evidence: 1, usable_with_caveat: 2, report_ready: 3 };
        return rank[g.readiness] < rank[worst] ? g.readiness : worst;
      },
      evidenceGaps[0].readiness,
    );
    reasonCodes.push(`evidence_gap:readiness:${worstReadiness}`);
  }
  // ────────────────────────────────────────────────────────────────────────

  return {
    rawName,
    eventType,
    pillar,
    eligibility,
    actionFamily,
    eventNature,
    budgetAmount,
    amountParsingStatus,
    rawAmountValue: amountParse.status === 'invalid' ? amountParse.raw : null,
    participants,
    participantsApproximate,
    evidenceLevel,
    sourceTier,
    mappingConfidence,
    // ── B11 fields ──────────────────────────────────────────────────────────
    initiativeDomain,
    budgetClass,
    needsEnrichment,
    financialConfidence,
    enrichmentMissingFields: missingFields,
    // ── B18: reporting alignment ─────────────────────────────────────────────
    reportingAlignment,
    // ── B19: evidence gaps ───────────────────────────────────────────────────
    evidenceGaps: evidenceGaps.length > 0 ? evidenceGaps : null,
    // ────────────────────────────────────────────────────────────────────────
    reasonCodes:            [...new Set(reasonCodes)],
    warnings,
    approvedForScoring:     false,
    approvedForBTI:         false,
    approvedForImpactUnits: false,
    interpreterVersion:     '0.1',
    generatedBy:            'rule_engine_v0_1',
  };
}
