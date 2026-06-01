// lib/ingestion/raw-to-uef-interpreter.ts
// Raw-to-UEF Rule-Based Interpreter v0.1 — KORA Foundation Light B5.
//
// Transforms a personal.uploaded_record (PII-free payload from B4.2) into a
// proposed UEF candidate. Pure function — no DB, no LLM, no side effects.
// Deterministic, auditable via reason_codes, confidence-scored.
//
// Priority order: BLOCKED > LIMITED > ELIGIBLE.
// Mental health: program-level only — never individual health/diagnosis data.

export type Pillar = 'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY';
export type EligibilityProposal = 'eligible' | 'limited' | 'blocked';
export type EvidenceLevel = 'L0' | 'L1' | 'L2' | 'L3';

export interface UefCandidateProposal {
  rawName:                string;
  eventType:              string;
  pillar:                 Pillar | null;
  eligibility:            EligibilityProposal;
  actionFamily:           string | null;
  eventNature:            string | null;
  budgetAmount:           number | null;
  participants:           number | null;
  evidenceLevel:          EvidenceLevel | null;
  sourceTier:             string | null;
  mappingConfidence:      number;        // 0.30–0.95
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
];

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

function extractNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return isFinite(v) && v >= 0 ? v : null;
  const s = String(v).replace(/[€$£\s]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) && n >= 0 ? n : null;
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

// ── Public API ────────────────────────────────────────────────────────────────

export function interpretUploadedRecord(
  record: UploadedRecordInput,
  // methodologyVersion retained for future versioned config reads
  _methodologyVersion = 'KORA Methodology v0.1',
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

  const budgetAmount = extractNumber(p['amount'] ?? p['importo'] ?? p['budget_amount'] ?? p['cost']);
  const participants = extractNumber(p['participants'] ?? p['partecipanti']);
  if (budgetAmount   !== null) reasonCodes.push('budget_amount_detected');
  if (participants   !== null) reasonCodes.push('participants_detected');
  if (budgetAmount   === null) warnings.push('warning:missing_budget_amount');
  if (participants   === null) warnings.push('warning:missing_participants');

  const { level: evidenceLevel, sourceTier, code: evidRC } = detectEvidence(p);
  reasonCodes.push(evidRC);
  if (evidenceLevel === 'L0') warnings.push('warning:missing_source');

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

  } else if (hasAny(combined, KW_HEALTH_WELLNESS)) {
    eventType = 'health_wellness_program'; pillar = 'LIFE'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push('keyword:health_wellness', 'pillar_rule:wellness_to_LIFE');

  } else if (hasAny(combined, KW_LEGACY)) {
    eventType = 'knowledge_transfer'; pillar = 'LEGACY'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push('keyword:knowledge_transfer', 'pillar_rule:legacy_to_LEGACY');

  } else if (hasAny(combined, KW_VOLUNTEERING)) {
    eventType = 'volunteering'; pillar = 'IMPACT'; eligibility = 'eligible';
    strongKw = true; pillarClear = true;
    reasonCodes.push('keyword:volunteering', 'pillar_rule:volunteering_to_IMPACT');

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

  return {
    rawName,
    eventType,
    pillar,
    eligibility,
    actionFamily,
    eventNature,
    budgetAmount,
    participants,
    evidenceLevel,
    sourceTier,
    mappingConfidence,
    reasonCodes:            [...new Set(reasonCodes)],
    warnings,
    approvedForScoring:     false,
    approvedForBTI:         false,
    approvedForImpactUnits: false,
    interpreterVersion:     '0.1',
    generatedBy:            'rule_engine_v0_1',
  };
}
