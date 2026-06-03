'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { OperatorToolBoundary } from '@/components/demo/OperatorToolBoundary';
import { parseUploadedFile } from '@/lib/upload/file-parser';
import type { ParsedUploadResult } from '@/lib/upload/file-parser';
import { detectColumnMappings } from '@/lib/upload/column-detection';
import { detectSensitiveColumns } from '@/lib/upload/sensitive-column-detection';
import { ALL_TEMPLATES } from '@/lib/upload/sample-templates';
import type { SampleTemplate } from '@/lib/upload/sample-templates';
import type {
  ColumnMapping,
  SensitiveColumnFlag,
  KoraComputationResult,
  RawUploadedRecord,
  ExplainabilityTraceItem,
  EligibilityStatus,
  BTITreatment,
  BudgetEvidenceLevel,
} from '@/lib/kora-engine/types';
import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
import { classifyEligibilityBatch } from '@/lib/kora-engine/eligibility-gate';
import { mapPillarBatch } from '@/lib/kora-engine/pillar-mapping';
import { assessBudgetEvidenceBatch } from '@/lib/kora-engine/budget-evidence';
import { cn } from '@/lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────────

const CRITICAL_BTI_FIELDS = ['budget_amount', 'budget_source', 'budget_evidence_type'];
const CRITICAL_BTI_LABELS: Record<string, string> = {
  budget_amount: 'Importo Budget',
  budget_source: 'Fonte Budget',
  budget_evidence_type: 'Tipo Evidenza Budget',
};

const ACCEPTED_TYPES = '.csv,.xlsx,.xls';
const MAX_FILE_MB = 10;

// ── Existing helpers ───────────────────────────────────────────────────────────

function confidenceBadge(confidence: number): { label: string; cls: string } {
  if (confidence >= 0.90) return { label: `${Math.round(confidence * 100)}%`, cls: 'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border border-[rgba(47,125,85,0.22)]' };
  if (confidence >= 0.70) return { label: `${Math.round(confidence * 100)}%`, cls: 'bg-[rgba(217,154,43,0.12)] text-amber-700 border border-[rgba(217,154,43,0.25)]' };
  return { label: `${Math.round(confidence * 100)}% — revisione`, cls: 'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border border-[rgba(158,59,47,0.22)]' };
}

function severityBadgeCls(severity: string): string {
  if (severity === 'high') return 'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border border-[rgba(158,59,47,0.22)]';
  if (severity === 'medium') return 'bg-[rgba(217,154,43,0.12)] text-amber-700 border border-[rgba(217,154,43,0.25)]';
  return 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border border-[rgba(6,3,43,0.08)]';
}

function recordTypeLabel(type: string): string {
  const map: Record<string, string> = {
    welfare_program: 'Programmi Welfare',
    budget: 'Registrazioni Budget',
    hr_aggregate: 'Aggregati HR',
    structural_policy: 'Policy Strutturali',
    unknown: 'Tipo non rilevato',
  };
  return map[type] ?? type;
}

function btiStatusConfig(criticalMapped: number): { label: string; sublabel: string; cls: string; barCls: string } {
  if (criticalMapped === 3) return {
    label: 'Forte',
    sublabel: 'Le colonne necessarie per la valutazione BTI sono presenti. Il livello di evidenza (L0–L4) verrà determinato in revisione e influenzerà il peso nel macroblocco Budget-to-Human-Impact (20%).',
    cls: 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)]',
    barCls: 'bg-[rgba(47,125,85,0.08)]0',
  };
  if (criticalMapped >= 1) return {
    label: 'Parziale',
    sublabel: `${criticalMapped}/3 colonne critiche per BTI presenti. Il peso BTI sarà ridotto in base all'evidenza disponibile.`,
    cls: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]',
    barCls: 'bg-[#D99A2B]',
  };
  return {
    label: 'Assente',
    sublabel: 'Nessuna colonna budget rilevata. Il macroblocco BTI (20%) non può essere calcolato. Budget = dato non valido senza fonte.',
    cls: 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)]',
    barCls: 'bg-[rgba(6,3,43,0.18)]',
  };
}

// ── KORA Preview helpers ───────────────────────────────────────────────────────

function formatEur(n: number): string {
  if (n === 0) return '€ 0';
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function inferWorkforcePopulation(rows: RawUploadedRecord[], mappings: ColumnMapping[]): number | undefined {
  const wfMapping = mappings.find((m) => m.targetField === 'workforce_population');
  if (!wfMapping) return undefined;
  const col = wfMapping.sourceColumn;
  const values = rows
    .map((r) => r.raw[col])
    .filter((v): v is number => typeof v === 'number' && v > 0 && v < 1_000_000);
  if (values.length === 0) return undefined;
  return Math.max(...values);
}

function safeguardCls(status: string): { bg: string; text: string; border: string } {
  if (status === 'CLEAR')   return { bg: 'bg-[rgba(47,125,85,0.10)]', text: 'text-[#2F7D55]', border: 'border-[rgba(47,125,85,0.22)]' };
  if (status === 'FLAGGED') return { bg: 'bg-[rgba(158,59,47,0.10)]',     text: 'text-[#9E3B2F]',     border: 'border-[rgba(158,59,47,0.22)]'     };
  return                           { bg: 'bg-[rgba(217,154,43,0.12)]',   text: 'text-amber-700',   border: 'border-[rgba(217,154,43,0.25)]'   };
}

function koraIndexTextCls(value: number): string {
  if (value >= 60) return 'text-[rgba(47,125,85,0.90)]';
  if (value >= 35) return 'text-amber-600';
  return 'text-[rgba(6,3,43,0.62)]';
}

function barCls(value: number, max: number = 100): string {
  const pct = max > 0 ? value / max : 0;
  if (pct >= 0.6) return 'bg-[rgba(47,125,85,0.08)]0';
  if (pct >= 0.35) return 'bg-[#D99A2B]';
  return 'bg-[#9E3B2F]';
}

function barW(value: number, max: number = 100): string {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return `${Math.round(pct)}%`;
}

const PILLAR_CONFIG: Record<string, { label: string; color: string; barColor: string }> = {
  LIFE:       { label: 'LIFE',       color: 'text-blue-700',   barColor: 'bg-blue-500' },
  GROWTH:     { label: 'GROWTH',     color: 'text-[#2F7D55]', barColor: 'bg-[rgba(47,125,85,0.08)]0' },
  CONNECTION: { label: 'CONNECTION', color: 'text-purple-700', barColor: 'bg-purple-500' },
  IMPACT:     { label: 'IMPACT',     color: 'text-[#8A5A00]', barColor: 'bg-[rgba(217,154,43,0.08)]0' },
  LEGACY:     { label: 'LEGACY',     color: 'text-[rgba(6,3,43,0.62)]',  barColor: 'bg-[rgba(6,3,43,0.35)]' },
};

// ── Sprint 15: Eligibility & Evidence Review helpers ──────────────────────────

function isIdentityLikeColumn(key: string): boolean {
  const k = key.toLowerCase().replace(/[\s_\-.]/g, '');
  return [
    'name', 'nome', 'surname', 'cognome', 'email', 'matricola',
    'employeeid', 'workerid', 'codicefiscale', 'taxcode', 'codfisc',
    'phone', 'telefono', 'participanthash', 'anonymousworkerid',
    'firstname', 'lastname', 'badge',
  ].some((s) => k.includes(s));
}

const CARE_ECONOMY_REVIEW_KEYS = [
  'asilo nido', 'childcare', 'child care', 'caregiver', 'eldercare',
  'assistenza anziani', 'centri estivi', 'campus estivo', 'summer camp',
  'supporto famiglia', 'family support', 'congedo solidarieta',
  'congedo aggiuntivo', 'mental health service', 'supporto psicologico',
];

function isCareEconomyRow(row: RawUploadedRecord): boolean {
  const combined = Object.values(row.raw)
    .map((v) => String(v ?? '').toLowerCase())
    .join(' ');
  return CARE_ECONOMY_REVIEW_KEYS.some((k) => combined.includes(k));
}

function eligibilityStatusConfig(status: EligibilityStatus | 'mixed'): { label: string; cls: string; dot: string } {
  switch (status) {
    case 'eligible':        return { label: 'Eligible',        cls: 'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]', dot: 'bg-[rgba(47,125,85,0.08)]0' };
    case 'limited':         return { label: 'Limited',         cls: 'bg-[rgba(217,154,43,0.12)] text-amber-700 border-[rgba(217,154,43,0.25)]',       dot: 'bg-[#D99A2B]'   };
    case 'blocked':         return { label: 'Blocked',         cls: 'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border-[rgba(158,59,47,0.22)]',             dot: 'bg-[rgba(158,59,47,0.06)]0'     };
    case 'review_required': return { label: 'Review Required', cls: 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',       dot: 'bg-[rgba(6,3,43,0.35)]'   };
    case 'mixed':           return { label: 'Mixed — Review',  cls: 'bg-purple-100 text-purple-700 border-purple-200',    dot: 'bg-purple-400'  };
  }
}

function btiTreatmentLabel(t: BTITreatment | 'mixed'): string {
  if (t === 'mixed') return 'mixed';
  const map: Record<BTITreatment, string> = {
    full_weight: 'full_weight',
    confidence_weighted: 'confidence_weighted',
    tracked_only: 'tracked_only',
    excluded_from_bti: 'excluded_from_bti',
    not_applicable: 'not_applicable',
  };
  return map[t] ?? t;
}

function btiTreatmentCls(t: BTITreatment | 'mixed'): string {
  if (t === 'mixed') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (t === 'full_weight' || t === 'confidence_weighted') return 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]';
  if (t === 'tracked_only') return 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]';
  if (t === 'not_applicable') return 'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]';
  return 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]';
}

function evidenceLevelLabel(level: BudgetEvidenceLevel): string {
  const map: Record<BudgetEvidenceLevel, string> = {
    L4_VERIFIED_EVIDENCE:    'L4 verificata',
    L3_THIRD_PARTY_DOCUMENT: 'L3 terza parte',
    L2_INTERNAL_DOCUMENT:    'L2 doc. interno',
    L1_SELF_DECLARED:        'L1 dichiarato',
    L0_NO_EVIDENCE:          'L0 nessuna evidenza',
  };
  return map[level] ?? level;
}

function evidenceLevelCls(level: BudgetEvidenceLevel): string {
  if (level === 'L4_VERIFIED_EVIDENCE' || level === 'L3_THIRD_PARTY_DOCUMENT') return 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]';
  if (level === 'L2_INTERNAL_DOCUMENT') return 'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]';
  if (level === 'L1_SELF_DECLARED') return 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]';
  return 'bg-[rgba(158,59,47,0.08)] text-[rgba(158,59,47,0.85)] border-[rgba(158,59,47,0.22)]';
}

// ── Sprint 15B: Initiative-level grouping ────────────────────────────────────

const EVIDENCE_LEVEL_ORDER: Record<BudgetEvidenceLevel, number> = {
  L0_NO_EVIDENCE: 0,
  L1_SELF_DECLARED: 1,
  L2_INTERNAL_DOCUMENT: 2,
  L3_THIRD_PARTY_DOCUMENT: 3,
  L4_VERIFIED_EVIDENCE: 4,
};

interface InitiativeReviewGroup {
  groupKey: string;
  groupLabel: string;
  recordCount: number;
  participationCount: number | null;
  uniqueWorkerEstimate: number | null;
  hasIdentityFields: boolean;
  provider: string | null;
  period: string | null;
  primaryEligibility: EligibilityStatus | 'mixed';
  eligibilityMix: Record<string, number>;
  primaryPillar: string | null;
  isMixedPillar: boolean;
  strongestEvidence: BudgetEvidenceLevel;
  weakestEvidence: BudgetEvidenceLevel;
  hasWeakEvidence: boolean;
  primaryBtiTreatment: BTITreatment | 'mixed';
  reviewRequired: boolean;
  isMixedStatus: boolean;
  confidence: number;
  isCareEconomy: boolean;
  missingBudgetSource: boolean;
  isLowConfidence: boolean;
  recommendedAction: string;
}

const GROUP_KEY_SIGNALS_NORMALIZED = [
  'initiativeid', 'idiniziativa', 'codiceiniziativa',
  'initiativename', 'nomeiniziativa',
  'programname', 'nomeprogramma',
  'eventname', 'nomeevento',
  'denominazione',
];

function extractGroupKey(row: RawUploadedRecord): string {
  const raw = row.raw;
  for (const [k, v] of Object.entries(raw)) {
    if (isIdentityLikeColumn(k)) continue;
    const nk = k.toLowerCase().replace(/[\s_\-.]/g, '');
    if (GROUP_KEY_SIGNALS_NORMALIZED.some((sig) => nk === sig || nk.includes(sig))) {
      const val = String(v ?? '').trim();
      if (val && val.length > 1 && val.length < 120 && isNaN(Number(val))) return val;
    }
  }
  let catVal = '';
  let provVal = '';
  for (const [k, v] of Object.entries(raw)) {
    if (isIdentityLikeColumn(k)) continue;
    const nk = k.toLowerCase().replace(/[\s_\-.]/g, '');
    if (!catVal && (nk.includes('categ') || nk.includes('tipoiniz') || nk.includes('kind'))) {
      const val = String(v ?? '').trim();
      if (val && val.length > 1 && isNaN(Number(val))) catVal = val;
    }
    if (!provVal && (nk.includes('provider') || nk.includes('fornitore') || nk.includes('erogatore') || nk.includes('vendor'))) {
      const val = String(v ?? '').trim();
      if (val && val.length > 1 && isNaN(Number(val))) provVal = val;
    }
  }
  if (catVal) return [catVal, provVal].filter(Boolean).join(' · ');
  return '__ungrouped__';
}

function extractParticipationCount(row: RawUploadedRecord): number | null {
  const PAX = ['participants', 'partecipanti', 'fruitori', 'users', 'activeworkers', 'attivi', 'usage'];
  for (const [k, v] of Object.entries(row.raw)) {
    if (isIdentityLikeColumn(k)) continue;
    const nk = k.toLowerCase().replace(/[\s_\-.]/g, '');
    if (PAX.some((pk) => nk.includes(pk))) {
      const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
      if (Number.isFinite(n) && n > 0 && n < 1_000_000) return Math.round(n);
    }
  }
  return null;
}

function extractSafeMetaValue(row: RawUploadedRecord, type: 'provider' | 'period'): string | null {
  const SIGS: Record<string, string[]> = {
    provider: ['provider', 'fornitore', 'vendor', 'erogatore', 'supplier'],
    period:   ['period', 'periodo', 'anno', 'year', 'mese', 'month', 'trimestre'],
  };
  for (const [k, v] of Object.entries(row.raw)) {
    if (isIdentityLikeColumn(k)) continue;
    const nk = k.toLowerCase().replace(/[\s_\-.]/g, '');
    if (SIGS[type].some((sig) => nk.includes(sig))) {
      const val = String(v ?? '').trim();
      if (val && val.length > 0) return val.slice(0, 40);
    }
  }
  return null;
}

function countUniqueWorkersInGroup(rows: RawUploadedRecord[]): number | null {
  // Uses identity fields only for counting — count returned, values never exposed.
  const WID_KEYS   = ['workerid', 'wid', 'idlavoratore', 'matricola', 'employeeid', 'badge'];
  const EMAIL_KEYS = ['email', 'emaildipendente'];
  const NOME_KEYS  = ['nomelavoratore', 'nomeworker'];
  const COGN_KEYS  = ['cognome', 'surname', 'lastname'];

  const seen = new Set<string>();

  for (const row of rows) {
    const raw = row.raw;
    let found = false;

    for (const [k, v] of Object.entries(raw)) {
      const nk = k.toLowerCase().replace(/[\s_\-.]/g, '');
      if (WID_KEYS.some((wk) => nk.includes(wk))) {
        const val = String(v ?? '').trim();
        if (val && val !== 'null' && val !== '') { seen.add(`w:${val}`); found = true; break; }
      }
    }
    if (found) continue;

    for (const [k, v] of Object.entries(raw)) {
      const nk = k.toLowerCase().replace(/[\s_\-.]/g, '');
      if (EMAIL_KEYS.some((ek) => nk.includes(ek))) {
        const val = String(v ?? '').trim().toLowerCase();
        if (val && val.includes('@')) { seen.add(`e:${val}`); found = true; break; }
      }
    }
    if (found) continue;

    let nome = '';
    let cogn = '';
    for (const [k, v] of Object.entries(raw)) {
      const nk = k.toLowerCase().replace(/[\s_\-.]/g, '');
      if (!nome && NOME_KEYS.some((nk2) => nk.includes(nk2))) nome = String(v ?? '').trim().toLowerCase();
      if (!cogn && COGN_KEYS.some((ck)  => nk.includes(ck)))  cogn = String(v ?? '').trim().toLowerCase();
    }
    if (nome && cogn) seen.add(`nc:${nome}:${cogn}`);
  }

  return seen.size > 0 ? seen.size : null;
}

function deriveGroupRecommendedAction(
  primaryEligibility: EligibilityStatus | 'mixed',
  primaryBtiTreatment: BTITreatment | 'mixed',
  weakestEvidence: BudgetEvidenceLevel,
  missingBudgetSource: boolean,
  hasWeakEvidence: boolean,
  isMixedStatus: boolean,
  confidence: number,
): string {
  if (isMixedStatus)                                return 'Validare classificazione mista prima del Board Pack.';
  if (primaryEligibility === 'blocked')             return 'Esclusa by design: compliance/baseline legale.';
  if (primaryEligibility === 'limited')             return 'Tracciare come economic relief; valutare riallocazione verso deep activation.';
  if (primaryEligibility === 'review_required')     return 'Validare categoria, volontarietà e perimetro company-enabled.';
  if (primaryBtiTreatment === 'not_applicable')     return 'Analizzare come segnale di attivazione, non come budget economico diretto.';
  if (missingBudgetSource)                          return 'Aggiungere fonte budget per questa iniziativa.';
  if (hasWeakEvidence)                              return 'Evidenza debole: migliorare con export provider o documento L2–L4.';
  if (confidence < 0.55)                            return 'Aumentare la copertura dati prima del Board Pack.';
  return 'Nessuna azione critica.';
}

function buildInitiativeReviewGroups(rows: RawUploadedRecord[]): InitiativeReviewGroup[] {
  if (rows.length === 0) return [];

  const eligibilityResults = classifyEligibilityBatch(rows);
  const pillarResults      = mapPillarBatch(rows, eligibilityResults);
  const budgetResults      = assessBudgetEvidenceBatch(rows);

  const groupMap = new Map<string, { rows: RawUploadedRecord[]; rowIdxs: number[] }>();
  let soloSeq = 0;

  rows.forEach((row, idx) => {
    let key = extractGroupKey(row);
    if (key === '__ungrouped__') key = `__solo_${soloSeq++}__`;
    if (!groupMap.has(key)) groupMap.set(key, { rows: [], rowIdxs: [] });
    groupMap.get(key)!.rows.push(row);
    groupMap.get(key)!.rowIdxs.push(idx);
  });

  const result: InitiativeReviewGroup[] = [];
  let gIdx = 0;

  for (const [rawKey, { rows: gRows, rowIdxs }] of groupMap) {
    const isUngrouped = rawKey.startsWith('__solo_');
    const groupLabel  = isUngrouped ? 'Iniziativa non nominata' : rawKey;

    const eligStatuses = rowIdxs.map((i) => eligibilityResults[i].status);
    const allSameElig  = eligStatuses.every((s) => s === eligStatuses[0]);
    const primaryEligibility: EligibilityStatus | 'mixed' = allSameElig ? eligStatuses[0] : 'mixed';
    const eligibilityMix: Record<string, number> = {};
    for (const s of eligStatuses) eligibilityMix[s] = (eligibilityMix[s] ?? 0) + 1;
    const isMixedStatus  = !allSameElig;
    const reviewRequired = primaryEligibility === 'review_required' || primaryEligibility === 'mixed';

    const pillarCounts: Record<string, number> = {};
    for (const i of rowIdxs) {
      const p = pillarResults[i].primaryPillar;
      if (p) pillarCounts[p] = (pillarCounts[p] ?? 0) + 1;
    }
    const pillarEntries = Object.entries(pillarCounts).sort(([, a], [, b]) => b - a);
    const primaryPillar = pillarEntries[0]?.[0] ?? null;
    const isMixedPillar = pillarEntries.length >= 2 &&
      pillarEntries[1][1] >= Math.max(1, pillarEntries[0][1] * 0.5);

    const evLevels = rowIdxs.map((i) => budgetResults[i].evidenceLevel);
    const orderOf  = (l: BudgetEvidenceLevel) => EVIDENCE_LEVEL_ORDER[l];
    const strongestEvidence = evLevels.reduce((b, l) => orderOf(l) > orderOf(b) ? l : b, 'L0_NO_EVIDENCE' as BudgetEvidenceLevel);
    const weakestEvidence   = evLevels.reduce((w, l) => orderOf(l) < orderOf(w) ? l : w, 'L4_VERIFIED_EVIDENCE' as BudgetEvidenceLevel);
    const hasWeakEvidence   = evLevels.some((l) => l === 'L0_NO_EVIDENCE' || l === 'L1_SELF_DECLARED');

    const btiTreatments     = rowIdxs.map((i) => budgetResults[i].btiTreatment);
    const allSameBTI        = btiTreatments.every((t) => t === btiTreatments[0]);
    const primaryBtiTreatment: BTITreatment | 'mixed' = allSameBTI ? btiTreatments[0] : 'mixed';

    const eligConfs  = rowIdxs.map((i) => eligibilityResults[i].confidence);
    const budgConfs  = rowIdxs.map((i) => budgetResults[i].confidence);
    const allConfs   = [...eligConfs, ...budgConfs];
    const avgConf    = allConfs.reduce((s, c) => s + c, 0) / allConfs.length;
    const minConf    = Math.min(...allConfs);
    const confidence = isMixedStatus ? Math.min(avgConf, 0.65) : minConf;
    const isLowConfidence = confidence < 0.50;

    const missingBudgetSource = rowIdxs.some((i) =>
      budgetResults[i].btiTreatment === 'excluded_from_bti' ||
      budgetResults[i].evidenceLevel === 'L0_NO_EVIDENCE' ||
      budgetResults[i].amount === null,
    );

    const isCareEconomy = gRows.some((r) => isCareEconomyRow(r));

    const paxCounts = gRows.map((r) => extractParticipationCount(r)).filter((n): n is number => n !== null);
    const participationCount = paxCounts.length > 0 ? paxCounts.reduce((s, n) => s + n, 0) : null;

    const uniqueWorkerEstimate = countUniqueWorkersInGroup(gRows);
    const hasIdentityFields    = gRows.some((r) => Object.keys(r.raw).some((k) => isIdentityLikeColumn(k)));

    const provider = gRows.map((r) => extractSafeMetaValue(r, 'provider')).find((v) => v !== null) ?? null;
    const period   = gRows.map((r) => extractSafeMetaValue(r, 'period')).find((v) => v !== null) ?? null;

    const recommendedAction = deriveGroupRecommendedAction(
      primaryEligibility, primaryBtiTreatment, weakestEvidence,
      missingBudgetSource, hasWeakEvidence, isMixedStatus, confidence,
    );

    result.push({
      groupKey: `g_${gIdx++}`,
      groupLabel,
      recordCount: gRows.length,
      participationCount,
      uniqueWorkerEstimate,
      hasIdentityFields,
      provider,
      period,
      primaryEligibility,
      eligibilityMix,
      primaryPillar,
      isMixedPillar,
      strongestEvidence,
      weakestEvidence,
      hasWeakEvidence,
      primaryBtiTreatment,
      reviewRequired,
      isMixedStatus,
      confidence,
      isCareEconomy,
      missingBudgetSource,
      isLowConfidence,
      recommendedAction,
    });
  }

  return result;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'parsed' | 'error'>('idle');
  const [parseResult, setParseResult] = useState<ParsedUploadResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string>(ALL_TEMPLATES[0].id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [koraStatus, setKoraStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [koraResult, setKoraResult] = useState<KoraComputationResult | null>(null);
  const [koraError, setKoraError] = useState<string | null>(null);
  const [showBoardPack, setShowBoardPack] = useState(false);

  // Collapsible section state — template, preview table and mapping default collapsed
  const [collapsed, setCollapsed] = useState<Set<string>>(
    new Set(['template', 'preview', 'mapping']),
  );
  const toggleSection = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });

  // ── Derived state ────────────────────────────────────────────────────────────

  const columnMappings: ColumnMapping[] = useMemo(
    () => (parseResult ? detectColumnMappings(parseResult.headers) : []),
    [parseResult],
  );

  const sensitiveFlags: SensitiveColumnFlag[] = useMemo(
    () => (parseResult ? detectSensitiveColumns(parseResult.headers) : []),
    [parseResult],
  );

  const sensitiveColNames = new Set(sensitiveFlags.map((f) => f.columnName));

  const mappedCount = columnMappings.length;
  const reviewCount = columnMappings.filter((m) => m.requiresReview).length;
  const unmappedCount = parseResult ? parseResult.headers.length - mappedCount : 0;
  const highSensitiveCount = sensitiveFlags.filter((f) => f.severity === 'high').length;

  const mappedTargetFields = new Set(columnMappings.map((m) => m.targetField));
  const criticalMapped = CRITICAL_BTI_FIELDS.filter((f) => mappedTargetFields.has(f)).length;
  const btiStatus = btiStatusConfig(criticalMapped);

  const canRunKora = status === 'parsed' && parseResult !== null && parseResult.rows.length > 0;

  // ── File handling ────────────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setParseError(`File troppo grande: ${(file.size / 1024 / 1024).toFixed(1)} MB (max ${MAX_FILE_MB} MB).`);
      setStatus('error');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setParseError(`Formato non supportato: .${ext}. Accettati: CSV, XLSX, XLS.`);
      setStatus('error');
      return;
    }
    setStatus('parsing');
    setParseError(null);
    setKoraStatus('idle');
    setKoraResult(null);
    setKoraError(null);
    try {
      const result = await parseUploadedFile(file);
      setParseResult(result);
      setStatus('parsed');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Errore di parsing sconosciuto.');
      setStatus('error');
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setParseResult(null);
    setParseError(null);
    setKoraStatus('idle');
    setKoraResult(null);
    setKoraError(null);
    setShowBoardPack(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleRunKoraPreview = useCallback(() => {
    if (!parseResult || parseResult.rows.length === 0) return;
    setKoraStatus('running');
    setKoraError(null);
    setKoraResult(null);
    // Defer to allow the 'running' state to paint before synchronous computation.
    setTimeout(() => {
      try {
        const workforcePopulation = inferWorkforcePopulation(parseResult.rows, columnMappings);
        const result = runKoraPipeline({
          tenantId: 'preview-tenant',
          batchId: parseResult.fileName.replace(/[^a-z0-9]/gi, '_').slice(0, 60),
          records: parseResult.rows,
          workforcePopulation,
        });
        setKoraResult(result);
        setKoraStatus('done');
      } catch (err) {
        setKoraError(err instanceof Error ? err.message : 'Errore interno pipeline.');
        setKoraStatus('error');
      }
    }, 0);
  }, [parseResult, columnMappings]);

  const selectedTemplate = ALL_TEMPLATES.find((t) => t.id === activeTemplate) ?? ALL_TEMPLATES[0];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[rgba(6,3,43,0.03)]">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Operator boundary banner ───────────────────────────────────────── */}
        <OperatorToolBoundary />

        {/* ── Workflow Stepper ──────────────────────────────────────────────── */}
        <WorkflowStepper
          uploadStatus={status}
          koraStatus={koraStatus}
          showBoardPack={showBoardPack}
        />

        {/* ── Section 1: Header ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[rgba(6,3,43,0.52)]">
            <Link href="/admin/companies/data-intake" className="hover:text-[rgba(6,3,43,0.78)] transition-colors">
              Data Intake
            </Link>
            <span>/</span>
            <span className="text-[rgba(6,3,43,0.78)] font-medium">KORA Operator Studio</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#06032B] tracking-tight">
                KORA Operator Data Intake Studio
              </h1>
              <p className="mt-1 text-[rgba(6,3,43,0.52)] text-sm leading-relaxed max-w-xl">
                Carica i file ricevuti dall&apos;azienda, verifica qualità e privacy, lancia la preview metodologica e prepara il Decision Pack.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#06032B] text-white border border-[rgba(6,3,43,0.35)]">
                KORA Operator
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border border-[rgba(6,3,43,0.08)]">
                Client-side v0
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--env-soft)] text-[var(--env-text)] border border-[var(--env-border)]">
                Foundation Light
              </span>
            </div>
          </div>

          {/* Data Pack Guidance */}
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)]">Foundation Light Data Pack — input minimo</p>
            </div>
            <div className="grid grid-cols-2 gap-0 sm:grid-cols-4">
              {[
                { label: 'Workers (aggregato)', note: 'Headcount per dipartimento e sede. Nessun nominativo. N ≥ 10.', required: true },
                { label: 'Initiatives', note: 'Lista iniziative/programmi aziendali con tipologia e pillar indicativo.', required: true },
                { label: 'Participation', note: 'Utilizzo aggregato per iniziativa, dipartimento, sede. N ≥ 10.', required: true },
                { label: 'Budget / Evidenze', note: 'Budget allocato per categoria. Anche dichiarato — classificato nella Budget Evidence review.', required: true },
              ].map((item, i) => (
                <div key={item.label} className={`px-3.5 py-3 space-y-0.5 ${i < 3 ? 'border-b sm:border-b-0 sm:border-r border-[rgba(6,3,43,0.05)]' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap border-[rgba(6,3,43,0.85)] bg-[#06032B] text-white">
                      Richiesto
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[rgba(6,3,43,0.78)]">{item.label}</p>
                  <p className="text-[10px] text-[rgba(6,3,43,0.52)] leading-relaxed">{item.note}</p>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]/60 text-[10px] text-[rgba(6,3,43,0.52)]">
              Opzionali: HR KPI aggregati (turnover, engagement) · export provider welfare/LMS come supplemento.
              Foundation Light non richiede self-service cliente. L&apos;azienda invia il Data Pack a KORA; KORA Operator lo normalizza e lo processa.
            </div>
          </div>
        </div>

        {/* ── Section 2: Upload zone ─────────────────────────────────────────── */}
        <div className="rounded-xl border-2 bg-[#F8F6F1] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(6,3,43,0.05)]">
            <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">
              1 — Carica file
            </h2>
          </div>

          {status === 'idle' || status === 'error' ? (
            <div className="p-6 space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-3 py-14 px-8
                  rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150
                  ${isDragging
                    ? 'border-[rgba(199,111,61,0.40)] bg-[rgba(199,111,61,0.08)]'
                    : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] hover:border-[rgba(6,3,43,0.14)] hover:bg-[rgba(199,111,61,0.08)]/50'
                  }
                `}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDragging ? 'bg-[rgba(6,3,43,0.06)]' : 'bg-[#F8F6F1] border border-[rgba(6,3,43,0.08)]'}`}>
                  <svg className={`w-6 h-6 ${isDragging ? 'text-[#C76F3D]' : 'text-[rgba(6,3,43,0.40)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[rgba(6,3,43,0.78)]">
                    {isDragging ? 'Rilascia il file qui' : 'Carica file ricevuto dal cliente'}
                  </p>
                  <p className="text-xs text-[rgba(6,3,43,0.40)] mt-1">CSV, XLSX, XLS — max {MAX_FILE_MB} MB · trascina o clicca per selezionare</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileInput}
                  className="sr-only"
                />
              </div>

              {status === 'error' && parseError && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] text-sm text-red-800">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          ) : status === 'parsing' ? (
            <div className="p-12 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-[rgba(6,3,43,0.14)] border-t-[#C76F3D] rounded-full animate-spin" />
              <p className="text-sm text-[rgba(6,3,43,0.52)]">Analisi del file in corso…</p>
            </div>
          ) : parseResult && (
            <div className="p-6 space-y-4">
              {/* File info bar */}
              <div className="flex items-center gap-3 p-4 rounded-lg border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)]">
                <div className="w-10 h-10 rounded-lg bg-[rgba(47,125,85,0.10)] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[rgba(47,125,85,0.90)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)] truncate">{parseResult.fileName}</p>
                  <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">
                    {parseResult.fileType.toUpperCase()} · {parseResult.rowCount} righe · {parseResult.columnCount} colonne
                    {parseResult.detectedRecordTypes.length > 0 && (
                      <> · <span className="text-[#C76F3D] font-medium">{parseResult.detectedRecordTypes.map(recordTypeLabel).join(', ')}</span></>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.78)] underline underline-offset-2 shrink-0"
                >
                  Cambia file
                </button>
              </div>

              {/* Multi-sheet notice */}
              {parseResult.availableSheets && parseResult.availableSheets.length > 1 && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-xs text-[#8A5A00]">
                  <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>
                    Excel multi-foglio rilevato. Analizzato: <strong>{parseResult.availableSheets[0]}</strong>.
                    Fogli disponibili: {parseResult.availableSheets.join(', ')}.
                  </span>
                </div>
              )}

              {/* Parsing warnings */}
              {parseResult.parsingWarnings.length > 0 && (
                <div className="space-y-2">
                  {parseResult.parsingWarnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-xs text-[#8A5A00]">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Validation issues */}
              {parseResult.validationIssues.length > 0 && (
                <div className="space-y-1.5">
                  {parseResult.validationIssues.map((issue, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                        issue.severity === 'error'
                          ? 'border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] text-red-800'
                          : 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-[#8A5A00]'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Colonne mappate', value: mappedCount, total: parseResult.columnCount, cls: 'text-[rgba(47,125,85,0.90)]' },
                  { label: 'Richiedono revisione', value: reviewCount, total: null, cls: reviewCount > 0 ? 'text-amber-600' : 'text-[rgba(6,3,43,0.40)]' },
                  { label: 'Non mappate', value: unmappedCount, total: null, cls: unmappedCount > 0 ? 'text-[rgba(6,3,43,0.52)]' : 'text-[rgba(6,3,43,0.40)]' },
                  { label: 'Colonne sensibili', value: sensitiveFlags.length, total: null, cls: sensitiveFlags.length > 0 ? 'text-red-600' : 'text-[rgba(6,3,43,0.40)]' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
                    <p className={`text-xl font-bold font-mono ${stat.cls}`}>
                      {stat.value}{stat.total !== null && <span className="text-[rgba(6,3,43,0.40)] font-normal text-sm">/{stat.total}</span>}
                    </p>
                    <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5 leading-tight">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Operator Decision Board ────────────────────────────────────────── */}
        {status === 'parsed' && parseResult && (
          <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
            <div className="px-6 py-3 border-b border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)]">Operator Decision Board</p>
              <button
                onClick={handleRunKoraPreview}
                disabled={koraStatus === 'running'}
                className={cn(
                  'px-4 py-1.5 rounded-md text-xs font-semibold transition-colors',
                  koraStatus === 'running'
                    ? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.40)] cursor-not-allowed'
                    : koraStatus === 'done'
                    ? 'bg-[rgba(6,3,43,0.65)] text-white hover:bg-[rgba(6,3,43,0.55)]'
                    : 'bg-[#06032B] text-white hover:bg-[rgba(6,3,43,0.88)]',
                )}
              >
                {koraStatus === 'running' ? 'Elaborazione…' : koraStatus === 'done' ? 'Riesegui Preview' : 'Run KORA Preview →'}
              </button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                {
                  label: 'File analizzato',
                  value: 'Sì',
                  sub: `${parseResult.rowCount} righe · ${parseResult.columnCount} colonne`,
                  ok: true,
                },
                {
                  label: 'Campi richiesti (BTI)',
                  value: criticalMapped === 3 ? 'Forte' : criticalMapped >= 1 ? 'Parziale' : 'Assente',
                  sub: `${criticalMapped}/3 colonne critiche budget`,
                  ok: criticalMapped >= 2,
                },
                {
                  label: 'Campi identità',
                  value: sensitiveFlags.filter((f) => f.recommendedAction === 'pseudonymize').length > 0
                    ? `${sensitiveFlags.filter((f) => f.recommendedAction === 'pseudonymize').length} rilevati`
                    : 'Nessuno',
                  sub: 'Ammessi per deduplica — non in output employer',
                  ok: true,
                },
                {
                  label: 'Campi alto rischio',
                  value: highSensitiveCount > 0 ? `${highSensitiveCount} da escludere` : 'Nessuno',
                  sub: highSensitiveCount > 0 ? 'Rimuovere dal file prima di procedere' : 'Pronto',
                  ok: highSensitiveCount === 0,
                },
                {
                  label: 'Budget Evidence',
                  value: btiStatus.label,
                  sub: `${criticalMapped}/3 colonne BTI presenti`,
                  ok: criticalMapped >= 2,
                },
                {
                  label: 'Pronto per Preview',
                  value: canRunKora ? 'Sì' : 'No',
                  sub: canRunKora ? 'Clicca Run KORA Preview →' : 'Dati insufficienti',
                  ok: canRunKora,
                },
              ].map((item) => (
                <div key={item.label} className={cn(
                  'rounded-lg border p-3',
                  item.ok ? 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]' : 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]',
                )}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">{item.label}</p>
                  <p className={cn('text-sm font-bold mt-0.5 font-mono', item.ok ? 'text-[rgba(6,3,43,0.90)]' : 'text-amber-700')}>
                    {item.value}
                  </p>
                  <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5 leading-snug">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 3: Template guidance ──────────────────────────────────── */}
        <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('template')}
            className="w-full px-6 py-4 border-b border-[rgba(6,3,43,0.05)] flex items-center justify-between text-left"
          >
            <div>
              <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">
                Template di riferimento
              </h2>
              <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
                Struttura attesa per ogni tipo di file. Usa come guida per la preparazione dei dati.
              </p>
            </div>
            <span className="text-[rgba(6,3,43,0.40)] text-xs font-mono shrink-0 ml-4">
              {collapsed.has('template') ? '▶ espandi' : '▼ comprimi'}
            </span>
          </button>

          {!collapsed.has('template') && (
          <>
          {/* Template tabs */}
          <div className="border-b border-[rgba(6,3,43,0.05)] overflow-x-auto">
            <div className="flex gap-0 px-4">
              {ALL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTemplate(t.id)}
                  className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTemplate === t.id
                      ? 'border-[rgba(199,111,61,0.50)] text-[rgba(6,3,43,0.72)]'
                      : 'border-transparent text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.78)]'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <TemplatePanel template={selectedTemplate} />
          </>
          )}
        </div>

        {/* ── Sections 4-10: Only shown after parsing ───────────────────────── */}
        {status === 'parsed' && parseResult && (
          <>
            {/* ── Section 4: Data preview ──────────────────────────────────── */}
            <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('preview')}
                className="w-full px-6 py-4 border-b border-[rgba(6,3,43,0.05)] flex items-center justify-between text-left"
              >
                <div>
                  <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">
                    2 — Anteprima dati raw
                  </h2>
                  <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
                    Prime {parseResult.previewRows.length} righe non vuote.
                    {sensitiveFlags.length > 0 && (
                      <span className="text-red-500 ml-1">
                        Colonne sensibili evidenziate in rosso.
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[rgba(6,3,43,0.40)] font-mono">{parseResult.rowCount} righe</span>
                  <span className="text-[rgba(6,3,43,0.40)] text-xs font-mono">
                    {collapsed.has('preview') ? '▶ espandi' : '▼ comprimi'}
                  </span>
                </div>
              </button>
              {!collapsed.has('preview') && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]">
                      {parseResult.headers.map((h) => (
                        <th
                          key={h}
                          className={`px-3 py-2.5 text-left font-medium whitespace-nowrap ${
                            sensitiveColNames.has(h)
                              ? 'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]'
                              : 'text-[rgba(6,3,43,0.62)]'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {sensitiveColNames.has(h) && (
                              <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                              </svg>
                            )}
                            {h}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.previewRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-[rgba(6,3,43,0.04)] hover:bg-[rgba(6,3,43,0.03)]/50">
                        {parseResult.headers.map((h) => (
                          <td
                            key={h}
                            className={`px-3 py-2 whitespace-nowrap max-w-[180px] truncate ${
                              sensitiveColNames.has(h)
                                ? 'bg-[rgba(158,59,47,0.06)]/60 text-[#9E3B2F]'
                                : 'text-[rgba(6,3,43,0.62)]'
                            }`}
                          >
                            {String(row.raw[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>

            {/* ── Section 5: Column mapping ─────────────────────────────────── */}
            <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('mapping')}
                className="w-full px-6 py-4 border-b border-[rgba(6,3,43,0.05)] flex items-center justify-between text-left"
              >
                <div>
                  <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">
                    3 — Mappatura colonne
                  </h2>
                  <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
                    Intestazioni mappate automaticamente ai campi UEF canonici di KORA.
                    {reviewCount > 0 && <span className="text-amber-600 ml-1">{reviewCount} colonne richiedono revisione.</span>}
                  </p>
                </div>
                <span className="text-[rgba(6,3,43,0.40)] text-xs font-mono shrink-0 ml-4">
                  {collapsed.has('mapping') ? '▶ espandi' : '▼ comprimi'}
                </span>
              </button>
              {!collapsed.has('mapping') && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]">
                      <th className="px-4 py-2.5 text-left font-medium text-[rgba(6,3,43,0.62)]">Colonna nel file</th>
                      <th className="px-4 py-2.5 text-left font-medium text-[rgba(6,3,43,0.62)]">Campo UEF</th>
                      <th className="px-4 py-2.5 text-left font-medium text-[rgba(6,3,43,0.62)]">Confidenza</th>
                      <th className="px-4 py-2.5 text-left font-medium text-[rgba(6,3,43,0.62)]">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.headers.map((h) => {
                      const mapping = columnMappings.find((m) => m.sourceColumn === h);
                      const isSensitive = sensitiveColNames.has(h);
                      if (!mapping) {
                        return (
                          <tr key={h} className="border-b border-[rgba(6,3,43,0.04)]">
                            <td className={`px-4 py-2.5 font-mono ${isSensitive ? 'text-red-600' : 'text-[rgba(6,3,43,0.52)]'}`}>
                              {isSensitive && <span className="mr-1">⚠</span>}{h}
                            </td>
                            <td className="px-4 py-2.5 text-[rgba(6,3,43,0.40)] italic">— non mappata</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded text-xs bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.40)] border border-[rgba(6,3,43,0.08)]">—</span>
                            </td>
                            <td className="px-4 py-2.5 text-[rgba(6,3,43,0.40)] text-xs">
                              Rinomina la colonna usando un alias dal template per il mapping automatico.
                            </td>
                          </tr>
                        );
                      }
                      const badge = confidenceBadge(mapping.confidence);
                      return (
                        <tr key={h} className="border-b border-[rgba(6,3,43,0.04)] hover:bg-[rgba(6,3,43,0.03)]/50">
                          <td className={`px-4 py-2.5 font-mono ${isSensitive ? 'text-red-600' : 'text-[rgba(6,3,43,0.78)]'}`}>
                            {isSensitive && <span className="mr-1">⚠</span>}{h}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-[rgba(6,3,43,0.72)]">{mapping.targetField}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-[rgba(6,3,43,0.52)] max-w-[260px] truncate">{mapping.mappingReason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </div>

            {/* ── Section 6: Sensitive columns ─────────────────────────────── */}
            {sensitiveFlags.length > 0 && (
              <div className="rounded-xl border-2 border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[rgba(158,59,47,0.22)] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[rgba(158,59,47,0.10)] flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-red-800">
                      4 — Colonne sensibili rilevate ({sensitiveFlags.length})
                    </h2>
                    <p className="text-xs text-red-600 mt-0.5">
                      {highSensitiveCount > 0
                        ? `${highSensitiveCount} colonne ad alto rischio da escludere · campi identità non ammessi in output employer.`
                        : 'Campi identità rilevati — non ammessi in output employer.'}
                    </p>
                  </div>
                </div>

                {sensitiveFlags.some((f) => f.recommendedAction === 'pseudonymize') && (
                  <div className="px-6 pt-5 pb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mb-2">Campi identità — non esporre in output employer</p>
                    <p className="text-xs text-[rgba(6,3,43,0.62)] mb-3 leading-relaxed">
                      I campi nome, cognome, email, matricola sono ammessi nel Data Pack per la <strong>deduplicazione dei record</strong>.
                      Non devono apparire in nessun output employer.
                      La pseudonimizzazione tecnica è un requisito di implementazione futura — non ancora attiva in Foundation Light v0.
                    </p>
                    <div className="space-y-2">
                      {sensitiveFlags.filter((f) => f.recommendedAction === 'pseudonymize').map((flag) => (
                        <div key={flag.columnName} className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[#F8F6F1] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-[rgba(6,3,43,0.90)]">{flag.columnName}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityBadgeCls(flag.severity)}`}>
                                  Campo identità
                                </span>
                              </div>
                              <p className="text-xs text-[rgba(6,3,43,0.52)]">{flag.reason}</p>
                            </div>
                            <span className="text-xs text-amber-700 shrink-0 font-medium">Non in output employer</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sensitiveFlags.some((f) => f.excludedByDefault) && (
                  <div className="px-6 pt-3 pb-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-red-600 mb-2">Dati ad alto rischio — da escludere</p>
                    <p className="text-xs text-[rgba(6,3,43,0.62)] mb-3 leading-relaxed">
                      Le colonne seguenti non sono necessarie in Foundation Light Pilot e rappresentano rischio GDPR elevato.
                      Rimuoverle dal file originale prima del caricamento.
                    </p>
                    <div className="space-y-2">
                      {sensitiveFlags.filter((f) => f.excludedByDefault).map((flag) => (
                        <div key={flag.columnName} className="rounded-lg border border-[rgba(158,59,47,0.25)] bg-[#F8F6F1] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-[rgba(6,3,43,0.90)]">{flag.columnName}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityBadgeCls(flag.severity)}`}>
                                  Alto rischio
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border border-[rgba(158,59,47,0.22)]">
                                  Escludi
                                </span>
                              </div>
                              <p className="text-xs text-[rgba(6,3,43,0.52)]">{flag.reason}</p>
                            </div>
                            <span className="text-xs text-[#9E3B2F] shrink-0 font-medium">Rimuovi dal file</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-3.5 rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.10)]/60 text-xs text-red-800">
                      <strong>Azione richiesta:</strong> Rimuovi le colonne ad alto rischio dal file originale
                      e ricarica. KORA misura le organizzazioni, non gli individui — nessun dato
                      identificativo ad alto rischio deve entrare nella pipeline.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Section 7: BTI readiness ──────────────────────────────────── */}
            <div className={`rounded-xl border-2 bg-[#F8F6F1] shadow-sm overflow-hidden ${btiStatus.cls}`}>
              <div className="px-6 py-4 border-b border-[rgba(6,3,43,0.05)] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">
                    5 — Budget Evidence Readiness
                  </h2>
                  <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
                    Qualità dell&apos;evidenza economica per il macroblocco BTI (20% del KORA Index).
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                  criticalMapped === 3
                    ? 'border-[rgba(47,125,85,0.28)] bg-[rgba(47,125,85,0.10)] text-[#2F7D55]'
                    : criticalMapped >= 1
                    ? 'border-amber-300 bg-[rgba(217,154,43,0.12)] text-amber-700'
                    : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)]'
                }`}>
                  {btiStatus.label}
                </span>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-sm text-[rgba(6,3,43,0.62)]">{btiStatus.sublabel}</p>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[rgba(6,3,43,0.52)]">
                    <span>Colonne critiche BTI</span>
                    <span>{criticalMapped}/3</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(6,3,43,0.05)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${btiStatus.barCls}`}
                      style={{ width: `${(criticalMapped / 3) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {CRITICAL_BTI_FIELDS.map((field) => {
                    const found = mappedTargetFields.has(field);
                    return (
                      <div key={field} className={`flex items-center gap-3 p-3 rounded-lg border ${found ? 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)]' : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)]'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${found ? 'bg-[rgba(47,125,85,0.10)]' : 'bg-[rgba(6,3,43,0.05)]'}`}>
                          {found ? (
                            <svg className="w-3 h-3 text-[rgba(47,125,85,0.90)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-[rgba(6,3,43,0.40)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <span className={`text-xs font-medium ${found ? 'text-[#2F7D55]' : 'text-[rgba(6,3,43,0.52)]'}`}>
                            {CRITICAL_BTI_LABELS[field]}
                          </span>
                          {!found && (
                            <span className="text-xs text-[rgba(6,3,43,0.40)] ml-2 italic">non rilevata nel file</span>
                          )}
                        </div>
                        <span className="font-mono text-xs text-[rgba(6,3,43,0.40)]">{field}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-xs text-[rgba(6,3,43,0.52)]">
                  <strong className="text-[rgba(6,3,43,0.78)]">Dottrina §4:</strong>{' '}
                  Il budget non è un dato valido se non ha una fonte documentabile.
                  Senza <code className="font-mono">budget_source</code> e <code className="font-mono">budget_evidence_type</code>,
                  l&apos;importo viene escluso dal calcolo BTI.
                </div>
              </div>
            </div>

            {/* ── Section 8: Run KORA Preview ───────────────────────────────── */}
            <div className="rounded-xl border-2 border-[rgba(199,111,61,0.22)] bg-[#F8F6F1] shadow-sm overflow-hidden">
              <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-[#06032B]">
                    6 — KORA Computation Preview
                  </h2>
                  <p className="text-xs text-[rgba(6,3,43,0.52)]">
                    Elaborazione locale nel browser · nessun dato salvato · output azienda aggregato
                  </p>
                  {koraStatus === 'done' && koraResult && (
                    <p className="text-xs text-[rgba(47,125,85,0.90)] font-medium">
                      Preview completata · {koraResult.bti.totalBudget > 0 ? `${parseResult.rowCount} record elaborati` : `${parseResult.rowCount} record — nessun importo budget rilevato`}
                    </p>
                  )}
                  {koraStatus === 'error' && koraError && (
                    <p className="text-xs text-red-600">{koraError}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <button
                    onClick={handleRunKoraPreview}
                    disabled={!canRunKora || koraStatus === 'running'}
                    className={`
                      px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150
                      ${!canRunKora || koraStatus === 'running'
                        ? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.40)] border border-[rgba(6,3,43,0.08)] cursor-not-allowed'
                        : koraStatus === 'done'
                        ? 'bg-[#C76F3D] text-white hover:bg-[rgba(6,3,43,0.75)] shadow-sm'
                        : 'bg-[#C76F3D] text-white hover:bg-[rgba(6,3,43,0.75)] shadow-sm'
                      }
                    `}
                  >
                    {koraStatus === 'running' ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-[rgba(6,3,43,0.14)] border-t-slate-500 rounded-full animate-spin" />
                        Elaborazione…
                      </span>
                    ) : koraStatus === 'done' ? (
                      'Riesegui KORA Preview'
                    ) : (
                      'Run KORA Preview'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Section 9: KORA Computation Preview ──────────────────────── */}
            {koraStatus === 'done' && koraResult && (
              <KoraPreviewSection result={koraResult} />
            )}

            {/* ── Section 11: Eligibility & Evidence Review ────────────────── */}
            {koraStatus === 'done' && koraResult && parseResult.rows.length > 0 && (
              <EligibilityReviewSection rows={parseResult.rows} result={koraResult} />
            )}

            {/* ── Board Pack CTA ────────────────────────────────────────────── */}
            {koraStatus === 'done' && koraResult && (
              <div className="rounded-xl border-2 border-[#06032B] bg-[#F8F6F1] shadow-sm overflow-hidden">
                <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-[#06032B]">
                      Prepara Board Pack Preview
                    </h2>
                    <p className="text-xs text-[rgba(6,3,43,0.52)]">
                      Documento stampabile generato localmente dal dataset caricato · nessun dato salvato
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBoardPack((v) => !v)}
                    className="shrink-0 px-6 py-2.5 rounded-lg text-sm font-semibold bg-[#06032B] text-white hover:bg-[rgba(6,3,43,0.88)] transition-colors shadow-sm"
                  >
                    {showBoardPack ? 'Chiudi Preview' : 'Prepara Board Pack Preview'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Board Pack Preview ────────────────────────────────────────── */}
            {koraStatus === 'done' && koraResult && showBoardPack && parseResult && (
              <UploadedBoardPackPreview
                result={koraResult}
                fileName={parseResult.fileName}
                totalRecords={parseResult.rowCount}
                rows={parseResult.rows}
              />
            )}

            {/* ── Operator flow link ────────────────────────────────────────── */}
            {koraStatus === 'done' && koraResult && (
              <div className="rounded-xl border border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.03)] p-5 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)] mb-1">
                    Flusso KORA Operator
                  </p>
                  <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">
                    Data Intake produce la coda di review. La Review Queue prepara Scoring e Decision Pack.
                  </p>
                </div>
                <Link
                  href="/company/uef-review"
                  className="inline-flex items-center gap-2 rounded-lg border border-[rgba(6,3,43,0.35)] bg-[#06032B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[rgba(6,3,43,0.88)] transition-colors"
                >
                  Vai a Operator Review Queue →
                </Link>
              </div>
            )}

            {/* ── Section 10: Next steps ────────────────────────────────────── */}
            <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm p-6">
              <div className="space-y-1 mb-5">
                <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Prossimi passi</h2>
                <p className="text-xs text-[rgba(6,3,43,0.40)] max-w-lg">
                  Il salvataggio della review, la cronologia e il Board Pack generato da dataset caricato richiedono backend/SaaS o export locale dedicato.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  disabled
                  className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-left cursor-not-allowed"
                >
                  <div>
                    <p className="text-sm font-medium text-[rgba(6,3,43,0.40)]">Conferma review e genera Board Pack</p>
                    <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Salva le classificazioni e genera report esecutivo aggregato</p>
                  </div>
                  <span className="text-xs text-[rgba(6,3,43,0.40)] border border-[rgba(6,3,43,0.08)] rounded px-2 py-0.5 shrink-0 ml-3">Prossimo sprint</span>
                </button>
                <button
                  disabled
                  className="flex-1 flex items-center justify-between px-4 py-3 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-left cursor-not-allowed"
                >
                  <div>
                    <p className="text-sm font-medium text-[rgba(6,3,43,0.40)]">Esporta checklist Advisor</p>
                    <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Lista record da revisionare con classificazioni KORA per il team Advisor</p>
                  </div>
                  <span className="text-xs text-[rgba(6,3,43,0.40)] border border-[rgba(6,3,43,0.08)] rounded px-2 py-0.5 shrink-0 ml-3">Prossimo sprint</span>
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-[rgba(6,3,43,0.05)] flex items-center gap-2 text-xs text-[rgba(6,3,43,0.40)]">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <span>
                  Foundation Light · Modalità pilot · Nessun dato viene trasmesso a server.
                  Il parsing e il calcolo avvengono interamente nel browser.
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── Idle state: quick guidance ────────────────────────────────────── */}
        {status === 'idle' && (
          <div className="rounded-xl border border-dashed border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-6">
            <h3 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] mb-3">Come funziona</h3>
            <ol className="space-y-2">
              {[
                'Carica un file CSV o Excel con dati welfare, budget o HR aggregati',
                'Il sistema rileva le intestazioni e le mappa ai campi UEF di KORA',
                'Le colonne sensibili vengono segnalate prima di qualsiasi elaborazione',
                'La qualità dell\'evidenza budget determina il peso nel macroblocco BTI (20%)',
                'Esegui il KORA Preview nel browser — KORA Index, Confidence, BTI, Attivazione e Pillar calcolati localmente',
                'Salvataggio, report history e Board Pack: disponibili dalla fase SaaS/pilot operativo',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[rgba(6,3,43,0.62)]">
                  <span className="w-5 h-5 rounded-full bg-[rgba(6,3,43,0.06)] text-[rgba(6,3,43,0.72)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

      </div>
    </div>
  );
}

// ── WorkflowStepper ────────────────────────────────────────────────────────────

type StepState = 'pending' | 'active' | 'done' | 'blocked';

interface WorkflowStep { label: string; state: StepState }

function WorkflowStepper({
  uploadStatus,
  koraStatus,
  showBoardPack,
}: {
  uploadStatus: 'idle' | 'parsing' | 'parsed' | 'error';
  koraStatus: 'idle' | 'running' | 'done' | 'error';
  showBoardPack: boolean;
}) {
  const steps: WorkflowStep[] = [
    {
      label: 'Upload file',
      state: uploadStatus === 'parsing' ? 'active'
           : uploadStatus === 'parsed'  ? 'done'
           : uploadStatus === 'error'   ? 'blocked'
           : 'pending',
    },
    {
      label: 'Parse & rileva',
      state: uploadStatus === 'parsing' ? 'active'
           : uploadStatus === 'parsed'  ? 'done'
           : uploadStatus === 'error'   ? 'blocked'
           : 'pending',
    },
    {
      label: 'Privacy scan',
      state: uploadStatus === 'parsed' ? 'done' : 'pending',
    },
    {
      label: 'KORA Preview',
      state: koraStatus === 'running' ? 'active'
           : koraStatus === 'done'    ? 'done'
           : koraStatus === 'error'   ? 'blocked'
           : uploadStatus === 'parsed' ? 'pending'
           : 'pending',
    },
    {
      label: 'Eligibility Review',
      state: koraStatus === 'done' ? 'done' : 'pending',
    },
    {
      label: 'Board Pack',
      state: showBoardPack       ? 'done'
           : koraStatus === 'done' ? 'pending'
           : 'pending',
    },
  ];

  const DOT: Record<StepState, string> = {
    done:    'bg-[#06032B] text-white',
    active:  'bg-[#C76F3D] text-white animate-pulse',
    pending: 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.40)] border border-[rgba(6,3,43,0.08)]',
    blocked: 'bg-[rgba(158,59,47,0.10)] text-red-600 border border-[rgba(158,59,47,0.22)]',
  };
  const TEXT: Record<StepState, string> = {
    done:    'text-[#06032B] font-semibold',
    active:  'text-[rgba(6,3,43,0.72)] font-semibold',
    pending: 'text-[rgba(6,3,43,0.40)]',
    blocked: 'text-red-600',
  };

  return (
    <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-3 flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1.5">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${DOT[step.state]}`}>
            {step.state === 'done' ? '✓' : step.state === 'blocked' ? '✕' : String(i + 1)}
          </span>
          <span className={`text-xs whitespace-nowrap ${TEXT[step.state]}`}>{step.label}</span>
          {i < steps.length - 1 && <span className="text-[rgba(6,3,43,0.16)] text-sm ml-1">→</span>}
        </div>
      ))}
    </div>
  );
}

// ── TemplatePanel ──────────────────────────────────────────────────────────────

function TemplatePanel({ template }: { template: SampleTemplate }) {
  return (
    <div className="p-6 space-y-5">
      <div>
        <p className="text-sm text-[rgba(6,3,43,0.62)]">{template.description}</p>
        <p className="text-xs text-[rgba(6,3,43,0.40)] mt-1">
          <span className="font-medium text-[#C76F3D]">Supporta:</span> {template.helpsWith}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide mb-2">Colonne obbligatorie</h4>
          <ul className="space-y-1">
            {template.requiredColumns.map((col) => (
              <li key={col} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[rgba(47,125,85,0.08)]0 shrink-0" />
                <span className="font-mono text-[rgba(6,3,43,0.78)]">{col}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide mb-2">Colonne opzionali</h4>
          <ul className="space-y-1">
            {template.optionalColumns.map((col) => (
              <li key={col} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[rgba(6,3,43,0.18)] shrink-0" />
                <span className="font-mono text-[rgba(6,3,43,0.52)]">{col}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-3 rounded-lg border border-blue-100 bg-blue-50 text-xs text-blue-800">
        <span className="font-semibold">Nota privacy: </span>
        {template.privacyNotes}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide mb-2">Intestazioni del template</h4>
        <div className="overflow-x-auto">
          <div className="inline-flex gap-1.5 pb-1">
            {template.headers.map((h) => (
              <span
                key={h}
                className={`px-2.5 py-1 rounded text-xs whitespace-nowrap border ${
                  template.requiredColumns.includes(h)
                    ? 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)] font-medium'
                    : 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]'
                }`}
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KoraPreviewSection ─────────────────────────────────────────────────────────

function KoraPreviewSection({ result }: { result: KoraComputationResult }) {
  const isInsufficient = result.scoringMode === 'insufficient_data';

  // Extract care signal count from explainability trace
  const careStage = result.explainabilityTrace.find((t) => t.id === 'stage_03_care_economy');
  const careSignalCount = careStage
    ? parseInt(careStage.output.replace('careSignals=', '').trim(), 10) || 0
    : 0;

  return (
    <div className="space-y-6">
      {/* Boundary note */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] text-sm">
        <svg className="w-4 h-4 text-[rgba(6,3,43,0.52)] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <div className="text-[rgba(6,3,43,0.88)] space-y-1">
          <p className="font-semibold">KORA Computation Preview — output aggregato aziendale</p>
          <p className="text-xs text-[rgba(6,3,43,0.72)]">
            Preview calcolata localmente su dati caricati in sessione. Non è un report certificato e non salva dati.
            Metodologia: <span className="font-mono">{result.koraIndex.methodologyVersion}</span> ·{' '}
            <span className="font-medium">{result.koraIndex.calibrationStatus}</span> · produzione_ready=false
          </p>
        </div>
      </div>

      {isInsufficient ? (
        <div className="rounded-xl border-2 border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] p-6 text-center space-y-2">
          <p className="text-lg font-semibold text-[#8A5A00]">Dataset insufficiente</p>
          <p className="text-sm text-amber-700">
            I dati caricati non sono sufficienti per calcolare il KORA Index.
            Assicurarsi che il file contenga iniziative aziendali con nome, categoria e possibilmente importo.
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-amber-700 text-left max-w-lg mx-auto">
              {result.warnings.map((w, i) => <li key={i} className="flex gap-2"><span>·</span><span>{w}</span></li>)}
            </ul>
          )}
        </div>
      ) : (
        <>
          <KoraSummaryCards result={result} />
          <KoraEligibilityPanel result={result} />
          <KoraPillarPanel result={result} />
          <KoraBTIPanel result={result} />
          <KoraActivationPanel result={result} />
          <KoraCarePanel careSignalCount={careSignalCount} />
          <KoraWarningsPanel result={result} />
          <KoraExplainPanel trace={result.explainabilityTrace} />
        </>
      )}
    </div>
  );
}

// ── KoraSummaryCards ───────────────────────────────────────────────────────────

function KoraSummaryCards({ result }: { result: KoraComputationResult }) {
  const sg = safeguardCls(result.activation.safeguardStatus);
  const cards = [
    {
      label: 'KORA Index Preview',
      value: `${result.koraIndex.value}`,
      unit: '/100',
      sublabel: result.koraIndex.calibrationStatus,
      cls: koraIndexTextCls(result.koraIndex.value),
      note: 'pre_empirical_calibration',
    },
    {
      label: 'Confidence Score',
      value: `${result.confidence.score}`,
      unit: '/100',
      sublabel: 'Esterno al KORA Index · peso=0',
      cls: koraIndexTextCls(result.confidence.score),
      note: 'externalToIndex=true',
    },
    {
      label: 'BTI Score',
      value: `${result.bti.btiScore}`,
      unit: '/100',
      sublabel: 'Budget-to-Human-Impact',
      cls: koraIndexTextCls(result.bti.btiScore),
      note: '20% macroblocco',
    },
    {
      label: 'Activation Reach',
      value: formatPct(result.activation.activationReach),
      unit: '',
      sublabel: `${result.activation.activeWorkers} lavoratori attivi`,
      cls: result.activation.activationReach >= 0.40 ? 'text-[rgba(47,125,85,0.90)]' : result.activation.activationReach >= 0.20 ? 'text-amber-600' : 'text-red-600',
      note: 'AR · soglia CLEAR ≥ 40%',
    },
    {
      label: 'Meaningful AR',
      value: formatPct(result.activation.meaningfulActivationReach),
      unit: '',
      sublabel: `${result.activation.meaningfullyActiveWorkers} lavoratori`,
      cls: result.activation.meaningfulActivationReach >= 0.30 ? 'text-[rgba(47,125,85,0.90)]' : result.activation.meaningfulActivationReach >= 0.15 ? 'text-amber-600' : 'text-red-600',
      note: 'MAR · soglia CLEAR ≥ 30%',
    },
    {
      label: 'Activation Debt',
      value: formatEur(result.bti.activationDebt),
      unit: '',
      sublabel: 'Budget non convertito in attivazione',
      cls: result.bti.activationDebt > 0 ? 'text-amber-700 text-base' : 'text-[rgba(6,3,43,0.52)] text-base',
      note: result.bti.activationDebt > 0 ? 'Ottimizzazione consigliata' : 'Nessun debito rilevato',
    },
  ];

  return (
    <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(6,3,43,0.05)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Sintesi risultati</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${sg.bg} ${sg.text} ${sg.border}`}>
          Safeguard: {result.activation.safeguardStatus}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 divide-y divide-x divide-[rgba(6,3,43,0.05)]">
        {cards.map((card) => (
          <div key={card.label} className="p-4 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">{card.label}</p>
            <p className={`text-2xl font-bold leading-none ${card.cls}`}>
              {card.value}
              {card.unit && <span className="text-sm font-normal text-[rgba(6,3,43,0.40)] ml-0.5">{card.unit}</span>}
            </p>
            <p className="text-xs text-[rgba(6,3,43,0.52)]">{card.sublabel}</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)] font-mono">{card.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KoraEligibilityPanel ───────────────────────────────────────────────────────

function KoraEligibilityPanel({ result }: { result: KoraComputationResult }) {
  const { eligibilitySummary: es } = result;
  const total = es.totalCount || 1;
  const buckets = [
    {
      label: 'Eligible',
      count: es.eligibleCount,
      desc: 'Può contribuire al KORA Index se l\'evidenza lo supporta',
      cls: 'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
      barCls: 'bg-[rgba(47,125,85,0.08)]0',
    },
    {
      label: 'Limited',
      count: es.limitedCount,
      desc: 'Sollievo economico — tracciato in BTI, 0 Impact Unit',
      cls: 'bg-[rgba(217,154,43,0.12)] text-amber-700 border-[rgba(217,154,43,0.25)]',
      barCls: 'bg-[#D99A2B]',
    },
    {
      label: 'Blocked',
      count: es.blockedCount,
      desc: 'Baseline normativa obbligatoria — escluso per design',
      cls: 'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border-[rgba(158,59,47,0.22)]',
      barCls: 'bg-[#9E3B2F]',
    },
    {
      label: 'Review Required',
      count: es.reviewRequiredCount,
      desc: 'Classificazione ambigua — validazione umana necessaria',
      cls: 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
      barCls: 'bg-[rgba(6,3,43,0.35)]',
    },
  ];

  return (
    <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(6,3,43,0.05)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Eligibility Gate</h3>
        <span className="text-xs text-[rgba(6,3,43,0.40)]">{es.totalCount} record totali</span>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {buckets.map((b) => (
          <div key={b.label} className={`rounded-lg border p-3 space-y-2 ${b.cls}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{b.label}</span>
              <span className="text-lg font-bold">{b.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#F8F6F1]/50 overflow-hidden">
              <div className={`h-full rounded-full ${b.barCls}`} style={{ width: barW(b.count, total) }} />
            </div>
            <p className="text-[10px] leading-relaxed opacity-80">{b.desc}</p>
          </div>
        ))}
      </div>
      {es.reviewRequiredCount > es.totalCount * 0.25 && (
        <div className="px-6 py-3 border-t border-[rgba(6,3,43,0.05)] bg-[rgba(217,154,43,0.08)] text-xs text-amber-700">
          <strong>{Math.round((es.reviewRequiredCount / es.totalCount) * 100)}% di record in review_required</strong> — la classificazione è incompleta.
          Il KORA Index sottostima il potenziale reale fino alla revisione umana.
        </div>
      )}
    </div>
  );
}

// ── KoraPillarPanel ────────────────────────────────────────────────────────────

function KoraPillarPanel({ result }: { result: KoraComputationResult }) {
  const dist = result.pillarDistribution;
  const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1;
  const pillars = Object.entries(dist) as [string, number][];

  return (
    <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(6,3,43,0.05)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Distribuzione Pillar</h3>
        <span className="text-xs text-[rgba(6,3,43,0.40)]">{total} record classificati</span>
      </div>
      <div className="p-4 space-y-3">
        {pillars.map(([pillar, count]) => {
          const cfg = PILLAR_CONFIG[pillar] ?? { label: pillar, color: 'text-[rgba(6,3,43,0.62)]', barColor: 'bg-[rgba(6,3,43,0.35)]' };
          return (
            <div key={pillar} className="flex items-center gap-3">
              <span className={`text-xs font-bold w-24 shrink-0 ${cfg.color}`}>{cfg.label}</span>
              <div className="flex-1 h-2 rounded-full bg-[rgba(6,3,43,0.05)] overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${cfg.barColor}`} style={{ width: barW(count, total) }} />
              </div>
              <span className="text-xs text-[rgba(6,3,43,0.52)] w-8 text-right shrink-0">{count}</span>
              <span className="text-xs text-[rgba(6,3,43,0.40)] w-8 text-right shrink-0">{formatPct(count / total)}</span>
            </div>
          );
        })}
        {total === 0 && (
          <p className="text-xs text-[rgba(6,3,43,0.40)] text-center py-2">Nessun segnale pillar rilevato nel dataset.</p>
        )}
      </div>
    </div>
  );
}

// ── KoraBTIPanel ───────────────────────────────────────────────────────────────

function KoraBTIPanel({ result }: { result: KoraComputationResult }) {
  const { bti } = result;
  const rows = [
    { label: 'Budget totale', value: formatEur(bti.totalBudget), note: '' },
    { label: 'Deep Activation Spend', value: formatEur(bti.deepActivationSpend), note: 'Attivazione profonda' },
    { label: 'Economic Relief Spend', value: formatEur(bti.economicReliefSpend), note: 'Sollievo economico — 0 IU' },
    { label: 'Blocked Compliance Spend', value: formatEur(bti.blockedComplianceSpend), note: 'Obbligatorio legale — 0 IU' },
    { label: 'Activation Debt', value: formatEur(bti.activationDebt), note: 'Budget non convertito in attivazione', highlight: bti.activationDebt > 0 },
  ];

  return (
    <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(6,3,43,0.05)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Budget-to-Human-Impact (BTI)</h3>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Macroblocco 4 · peso 20% nel KORA Index v3</p>
        </div>
        <span className={`text-2xl font-bold ${koraIndexTextCls(bti.btiScore)}`}>
          {bti.btiScore}<span className="text-sm font-normal text-[rgba(6,3,43,0.40)]">/100</span>
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${row.highlight ? 'bg-[rgba(217,154,43,0.08)] border border-[rgba(217,154,43,0.25)]' : 'bg-[rgba(6,3,43,0.03)]'}`}>
              <div>
                <span className={`font-medium ${row.highlight ? 'text-[#8A5A00]' : 'text-[rgba(6,3,43,0.78)]'}`}>{row.label}</span>
                {row.note && <span className="text-xs text-[rgba(6,3,43,0.40)] ml-2">{row.note}</span>}
              </div>
              <span className={`font-mono text-sm ${row.highlight && row.label === 'Activation Debt' && bti.activationDebt > 0 ? 'text-amber-700 font-semibold' : 'text-[rgba(6,3,43,0.62)]'}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[rgba(6,3,43,0.52)]">
            <span>Budget Evidence Quality</span>
            <span>{Math.round(bti.budgetEvidenceQuality * 100)}/100</span>
          </div>
          <div className="h-2 rounded-full bg-[rgba(6,3,43,0.05)] overflow-hidden">
            <div className={`h-full rounded-full ${barCls(bti.budgetEvidenceQuality * 100)}`} style={{ width: barW(bti.budgetEvidenceQuality * 100) }} />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-xs text-[rgba(6,3,43,0.52)]">
          <strong className="text-[rgba(6,3,43,0.62)]">Dottrina:</strong>{' '}
          Il budget non è trattato come impatto. Entra nel BTI solo in base a evidenza, eleggibilità e attivazione.
        </div>
      </div>
    </div>
  );
}

// ── KoraActivationPanel ────────────────────────────────────────────────────────

function KoraActivationPanel({ result }: { result: KoraComputationResult }) {
  const { activation } = result;
  const sg = safeguardCls(activation.safeguardStatus);
  const hasBoundedWarning = activation.warnings.some((w) =>
    w.includes('bounded') || w.includes('overlap') || w.includes('deduplicat') || w.includes('stima'),
  );

  return (
    <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(6,3,43,0.05)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Activation & Reach Quality</h3>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Output aggregato — nessun valore identità restituito</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${sg.bg} ${sg.text} ${sg.border}`}>
          {activation.safeguardStatus}
        </span>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Lavoratori attivi', value: activation.activeWorkers },
            { label: 'Attivazione significativa', value: activation.meaningfullyActiveWorkers },
            { label: 'Mai attivati', value: activation.neverActivatedWorkers },
            { label: 'Concentrazione top', value: `${formatPct(activation.concentrationTopShare)}`, raw: true },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-3 text-center">
              <p className="text-lg font-bold text-[rgba(6,3,43,0.78)]">{m.value}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-0.5 leading-tight">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {[
            { label: 'Activation Reach (AR)', value: activation.activationReach, threshold: 0.40, thresholdLabel: 'CLEAR ≥ 40%' },
            { label: 'Meaningful AR (MAR)', value: activation.meaningfulActivationReach, threshold: 0.30, thresholdLabel: 'CLEAR ≥ 30%' },
          ].map((metric) => (
            <div key={metric.label} className="space-y-1">
              <div className="flex justify-between text-xs text-[rgba(6,3,43,0.52)]">
                <span>{metric.label}</span>
                <span className="font-medium">{formatPct(metric.value)} <span className="font-normal opacity-60">({metric.thresholdLabel})</span></span>
              </div>
              <div className="relative h-2 rounded-full bg-[rgba(6,3,43,0.05)] overflow-visible">
                <div className={`h-full rounded-full ${barCls(metric.value * 100)}`} style={{ width: barW(metric.value * 100) }} />
                {/* Threshold marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[rgba(6,3,43,0.35)] opacity-60"
                  style={{ left: `${metric.threshold * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {hasBoundedWarning && (
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-800">
            KORA distingue partecipazioni lorde, reach deduplicata e stima conservativa quando l&apos;identità non è sufficiente
            o i conteggi unici si sovrappongono.
          </div>
        )}

        {activation.safeguardStatus !== 'CLEAR' && (
          <div className="p-3 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-xs text-[rgba(6,3,43,0.52)]">
            <strong className="text-[rgba(6,3,43,0.62)]">D-21 Activation Safeguard:</strong>{' '}
            CLEAR = AR ≥ 40% AND MAR ≥ 30% · WARNING = sotto soglia · FLAGGED = AR &lt; 20% OR MAR &lt; 15%.
            CLEAR è bloccato anche se review_required &gt; 25% o concentrazione top &gt; 60%.
          </div>
        )}
      </div>
    </div>
  );
}

// ── KoraCarePanel ──────────────────────────────────────────────────────────────

function KoraCarePanel({ careSignalCount }: { careSignalCount: number }) {
  return (
    <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(6,3,43,0.05)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Care Economy</h3>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">Modulo premium — segnali informativi, non nel KORA Index v3</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          careSignalCount > 0
            ? 'bg-blue-100 text-blue-700 border-blue-200'
            : 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]'
        }`}>
          {careSignalCount} segnali
        </span>
      </div>
      <div className="p-4">
        {careSignalCount > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[rgba(6,3,43,0.78)]">
              <strong>{careSignalCount} segnali care economy</strong> rilevati nel dataset.
              Childcare, eldercare, caregiver, family support, flessibilità, accesso equo.
            </p>
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-800">
              Care Economy misura solo segnali aggregati nel perimetro aziendale/KORA-enabled.
              Non inferisce stato familiare o carichi di cura individuali.
            </div>
          </div>
        ) : (
          <p className="text-sm text-[rgba(6,3,43,0.40)] text-center py-2">
            Nessun segnale Care Economy rilevato in questo dataset.
          </p>
        )}
      </div>
    </div>
  );
}

// ── KoraWarningsPanel ──────────────────────────────────────────────────────────

function KoraWarningsPanel({ result }: { result: KoraComputationResult }) {
  const allWarnings = [
    ...result.warnings,
    ...result.bti.warnings,
    ...result.activation.warnings,
    ...result.koraIndex.warnings,
    ...result.confidence.warnings,
  ].filter((w) =>
    !w.startsWith('Fonte:') &&
    !w.includes('KORA-METHOD-v0.1.0') &&
    !w.includes('calibration_status=') &&
    !w.includes('CS è ESTERNO') &&
    !w.includes('production_ready=false'),
  );

  const { confidence: cs } = result;
  const subscores = [
    { label: 'Budget Evidence', value: cs.budgetEvidenceConfidence },
    { label: 'Data Completeness', value: cs.dataCompleteness },
    { label: 'Mapping Quality', value: cs.mappingConfidence },
    { label: 'Verification', value: cs.verificationConfidence },
    { label: 'Review (Advisor)', value: cs.reviewConfidence },
  ];

  return (
    <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(6,3,43,0.05)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Confidence & Avvertenze</h3>
          <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
            KORA espone i limiti del dataset invece di nasconderli.
          </p>
        </div>
        <span className={`text-xl font-bold ${koraIndexTextCls(cs.score)}`}>
          CS {cs.score}<span className="text-sm font-normal text-[rgba(6,3,43,0.40)]">/100</span>
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Confidence sub-scores */}
        <div className="space-y-2">
          {subscores.map((s) => (
            <div key={s.label} className="space-y-0.5">
              <div className="flex justify-between text-xs text-[rgba(6,3,43,0.52)]">
                <span>{s.label}</span>
                <span className="font-medium">{Math.round(s.value * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[rgba(6,3,43,0.05)] overflow-hidden">
                <div className={`h-full rounded-full ${barCls(s.value * 100)}`} style={{ width: barW(s.value * 100) }} />
              </div>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {allWarnings.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Avvertenze diagnostiche</p>
            <ul className="space-y-1.5">
              {allWarnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[rgba(6,3,43,0.62)]">
                  <span className="w-1 h-1 rounded-full bg-[#D99A2B] shrink-0 mt-1.5" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="p-3 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-xs text-[rgba(6,3,43,0.52)]">
          Confidence Score è <strong>esterno al KORA Index</strong> — peso=0 nel calcolo.
          Indica l&apos;affidabilità del dato, non il livello di attivazione.
          CS basso non annulla il KORA Index ma segnala che i risultati devono essere interpretati con cautela.
        </div>
      </div>
    </div>
  );
}

// ── EligibilityReviewSection ───────────────────────────────────────────────────

function EligibilityReviewSection({
  rows,
  result,
}: {
  rows: RawUploadedRecord[];
  result: KoraComputationResult;
}) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [secondaryFilters, setSecondaryFilters] = useState<Set<string>>(new Set());

  const groups = useMemo(() => buildInitiativeReviewGroups(rows), [rows]);

  const identityColCount = useMemo(
    () => rows.filter((r) => Object.keys(r.raw).some((k) => isIdentityLikeColumn(k))).length,
    [rows],
  );

  const counts = useMemo(() => ({
    eligible:        groups.filter((g) => g.primaryEligibility === 'eligible').length,
    limited:         groups.filter((g) => g.primaryEligibility === 'limited').length,
    blocked:         groups.filter((g) => g.primaryEligibility === 'blocked').length,
    review_required: groups.filter((g) => g.primaryEligibility === 'review_required').length,
    mixed:           groups.filter((g) => g.primaryEligibility === 'mixed').length,
    missingBudget:   groups.filter((g) => g.missingBudgetSource).length,
    lowConfidence:   groups.filter((g) => g.isLowConfidence).length,
    careEconomy:     groups.filter((g) => g.isCareEconomy).length,
    l0l1:            groups.filter((g) => g.weakestEvidence === 'L0_NO_EVIDENCE' || g.weakestEvidence === 'L1_SELF_DECLARED').length,
    totalRecords:    rows.length,
  }), [groups, rows]);

  const filtered = useMemo(() => {
    let g = groups;
    if (activeFilter === 'eligible')        g = g.filter((gr) => gr.primaryEligibility === 'eligible');
    else if (activeFilter === 'limited')    g = g.filter((gr) => gr.primaryEligibility === 'limited');
    else if (activeFilter === 'blocked')    g = g.filter((gr) => gr.primaryEligibility === 'blocked');
    else if (activeFilter === 'review_required') g = g.filter((gr) => gr.primaryEligibility === 'review_required');
    else if (activeFilter === 'mixed')      g = g.filter((gr) => gr.primaryEligibility === 'mixed');
    if (secondaryFilters.has('missing_budget'))     g = g.filter((gr) => gr.missingBudgetSource);
    if (secondaryFilters.has('low_confidence'))     g = g.filter((gr) => gr.isLowConfidence);
    if (secondaryFilters.has('care_economy'))       g = g.filter((gr) => gr.isCareEconomy);
    if (secondaryFilters.has('high_risk_excluded')) g = g.filter((gr) => gr.primaryEligibility === 'blocked');
    return g;
  }, [groups, activeFilter, secondaryFilters]);

  function toggleSecondary(key: string) {
    setSecondaryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const REVIEW_MAX_DISPLAY = 100;
  const displayGroups = filtered.slice(0, REVIEW_MAX_DISPLAY);
  const isTruncated = filtered.length > REVIEW_MAX_DISPLAY;

  return (
    <div className="rounded-xl border-2 border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]/80">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#06032B]">
              7 — Eligibility &amp; Evidence Review per Iniziativa
            </h2>
            <p className="text-xs text-[rgba(6,3,43,0.52)] max-w-2xl leading-relaxed">
              Rilettura metodologica raggruppata per iniziativa: eleggibilità, pillar, evidenza budget,
              trattamento BTI e punti che richiedono revisione. I record raw vengono aggregati per iniziativa.
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border border-[rgba(6,3,43,0.08)]">
              {groups.length} iniziative
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)] border border-[rgba(6,3,43,0.08)]">
              {counts.totalRecords} record raw
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-800">
          <svg className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span>
            Questa vista non espone dati individuali del lavoratore.
            I segnali identità sono usati solo per stimare lavoratori unici — il conteggio è restituito, mai i valori.
            Le etichette si riferiscono a iniziative/programmi, non a singoli lavoratori.
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Data Quality Board */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">
            Data Quality Board
          </p>
          <p className="text-xs text-[rgba(6,3,43,0.52)] mb-3">
            KORA espone i punti deboli del dataset prima di produrre un Decision Pack. I conteggi si riferiscono a iniziative, non a record raw.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { label: 'Iniziative in review',  value: counts.review_required + counts.mixed, dotCls: 'bg-[#D99A2B]', valCls: 'text-amber-700', sub: 'Classificazione mista o incompleta' },
              { label: 'Budget mancante',        value: counts.missingBudget,                  dotCls: 'bg-[#9E3B2F]',   valCls: 'text-red-600',   sub: 'Fonte budget assente o L0' },
              { label: 'Escluse per design',     value: counts.blocked,                        dotCls: 'bg-[rgba(6,3,43,0.18)]', valCls: 'text-[rgba(6,3,43,0.52)]', sub: 'Compliance obbligatoria baseline' },
              { label: 'Evidenza debole (L0/L1)',value: counts.l0l1,                           dotCls: 'bg-amber-300', valCls: 'text-amber-600', sub: 'Qualità evidenza budget bassa' },
              { label: 'Campi identità',         value: identityColCount,                      dotCls: 'bg-blue-300',  valCls: 'text-blue-600',  sub: "Record con campi identità — esclusi dall'output" },
              { label: 'Bassa confidence',       value: counts.lowConfidence,                  dotCls: 'bg-[rgba(6,3,43,0.35)]', valCls: 'text-[rgba(6,3,43,0.62)]', sub: 'Confidence aggregata < 50%' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2.5 p-3 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)]">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.dotCls}`} />
                <div>
                  <p className={`text-lg font-bold leading-none ${item.valCls}`}>{item.value}</p>
                  <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.62)] mt-1 leading-tight">{item.label}</p>
                  <p className="text-[10px] text-[rgba(6,3,43,0.40)] leading-relaxed">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Primary filter tabs */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Filtra per status iniziativa</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'all',             label: `Tutte (${groups.length})` },
              { key: 'eligible',        label: `Eligible (${counts.eligible})` },
              { key: 'limited',         label: `Limited (${counts.limited})` },
              { key: 'blocked',         label: `Blocked (${counts.blocked})` },
              { key: 'review_required', label: `Review Required (${counts.review_required})` },
              { key: 'mixed',           label: `Mixed (${counts.mixed})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeFilter === f.key
                    ? 'bg-[#06032B] text-white shadow-sm'
                    : 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] hover:bg-[rgba(6,3,43,0.12)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary filters */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Filtri secondari</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'missing_budget',     label: `Budget mancante (${counts.missingBudget})` },
              { key: 'low_confidence',     label: `Bassa confidence (${counts.lowConfidence})` },
              { key: 'care_economy',       label: `Care Economy (${counts.careEconomy})` },
              { key: 'high_risk_excluded', label: `Escluse high-risk (${counts.blocked})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => toggleSecondary(f.key)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                  secondaryFilters.has(f.key)
                    ? 'bg-[rgba(6,3,43,0.06)] text-[rgba(6,3,43,0.72)] border-[rgba(199,111,61,0.22)]'
                    : 'bg-[#F8F6F1] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)] hover:bg-[rgba(6,3,43,0.03)]'
                }`}
              >
                {secondaryFilters.has(f.key) ? '✕ ' : ''}{f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Review table — grouped by initiative */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[rgba(6,3,43,0.03)] border-b border-[rgba(6,3,43,0.08)] flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)]">
              Review per iniziativa · output aggregato · nessun dato identità individuale
            </p>
            {isTruncated && (
              <p className="text-[10px] text-amber-600 font-medium">
                Mostrando {REVIEW_MAX_DISPLAY} di {filtered.length} iniziative
              </p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)]/60">
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)] min-w-[160px]">Iniziativa</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)] min-w-[100px]">Records / Part.</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)] min-w-[80px]">Lavoratori</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)] min-w-[120px]">Eligibility</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)] min-w-[70px]">Pillar</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)] min-w-[130px]">Budget Evidence</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)] min-w-[130px]">BTI Treatment</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)] min-w-[70px]">Review</th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.52)] min-w-[180px]">Azione consigliata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(6,3,43,0.05)]">
                {displayGroups.map((grp) => {
                  const eligCfg   = eligibilityStatusConfig(grp.primaryEligibility);
                  const pillarCfg = grp.primaryPillar ? PILLAR_CONFIG[grp.primaryPillar] : null;
                  const confBadge = confidenceBadge(grp.confidence);
                  return (
                    <tr key={grp.groupKey} className="hover:bg-[rgba(6,3,43,0.03)]/60 align-top">
                      {/* Iniziativa */}
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-[rgba(6,3,43,0.78)] max-w-[200px] break-words leading-snug">{grp.groupLabel}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {grp.isCareEconomy && (
                            <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              care economy
                            </span>
                          )}
                          {grp.provider && (
                            <span className="text-[9px] text-[rgba(6,3,43,0.40)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 rounded border border-[rgba(6,3,43,0.08)] max-w-[120px] truncate">
                              {grp.provider}
                            </span>
                          )}
                          {grp.period && (
                            <span className="text-[9px] text-[rgba(6,3,43,0.40)] font-mono bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 rounded border border-[rgba(6,3,43,0.08)]">
                              {grp.period}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Records / Partecipazioni */}
                      <td className="px-3 py-2.5">
                        <p className="font-mono text-[rgba(6,3,43,0.78)]">{grp.recordCount}</p>
                        {grp.participationCount !== null && (
                          <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">{grp.participationCount} part.</p>
                        )}
                      </td>
                      {/* Lavoratori unici */}
                      <td className="px-3 py-2.5">
                        {grp.uniqueWorkerEstimate !== null ? (
                          <>
                            <p className="font-mono text-[rgba(6,3,43,0.78)]">~{grp.uniqueWorkerEstimate}</p>
                            {grp.hasIdentityFields && (
                              <p className="text-[9px] text-blue-500 mt-0.5">da campi id</p>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-[rgba(6,3,43,0.40)]">—</span>
                        )}
                      </td>
                      {/* Eligibility */}
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${eligCfg.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${eligCfg.dot}`} />
                          {eligCfg.label}
                        </span>
                        {grp.isMixedStatus && (
                          <div className="mt-1 flex flex-wrap gap-0.5">
                            {Object.entries(grp.eligibilityMix).map(([s, n]) => (
                              <span key={s} className="text-[9px] text-[rgba(6,3,43,0.40)] font-mono">{s.replace('_', ' ')}: {n}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5 font-mono">
                          <span className={confBadge.cls + ' px-1 py-0.5 rounded text-[9px]'}>{confBadge.label}</span>
                        </p>
                      </td>
                      {/* Pillar */}
                      <td className="px-3 py-2.5">
                        {pillarCfg ? (
                          <>
                            <span className={`text-xs font-bold ${pillarCfg.color}`}>{pillarCfg.label}</span>
                            {grp.isMixedPillar && (
                              <p className="text-[9px] text-purple-500 mt-0.5">mixed</p>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-[rgba(6,3,43,0.40)]">—</span>
                        )}
                      </td>
                      {/* Budget Evidence */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-0.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${evidenceLevelCls(grp.strongestEvidence)}`}>
                            ↑ {evidenceLevelLabel(grp.strongestEvidence)}
                          </span>
                          {grp.weakestEvidence !== grp.strongestEvidence && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${evidenceLevelCls(grp.weakestEvidence)}`}>
                              ↓ {evidenceLevelLabel(grp.weakestEvidence)}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* BTI Treatment */}
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${btiTreatmentCls(grp.primaryBtiTreatment)}`}>
                          {btiTreatmentLabel(grp.primaryBtiTreatment)}
                        </span>
                      </td>
                      {/* Review */}
                      <td className="px-3 py-2.5">
                        {grp.reviewRequired ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]">
                            Sì
                          </span>
                        ) : (
                          <span className="text-[10px] text-[rgba(6,3,43,0.40)]">No</span>
                        )}
                      </td>
                      {/* Azione consigliata */}
                      <td className="px-3 py-2.5">
                        <p className="text-[11px] text-[rgba(6,3,43,0.62)] leading-relaxed max-w-[230px]">{grp.recommendedAction}</p>
                      </td>
                    </tr>
                  );
                })}
                {displayGroups.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-xs text-[rgba(6,3,43,0.40)]">
                      Nessuna iniziativa corrisponde ai filtri selezionati.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Status legend */}
          <div className="px-4 py-3 bg-[rgba(6,3,43,0.03)] border-t border-[rgba(6,3,43,0.08)] flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[rgba(6,3,43,0.52)]">
            <span><strong className="text-[#2F7D55]">Eligible</strong> — può contribuire se evidenza e attivazione sono sufficienti</span>
            <span><strong className="text-amber-700">Limited</strong> — sollievo economico / bassa profondità di attivazione</span>
            <span><strong className="text-red-600">Blocked</strong> — baseline legale/compliance, 0 impatto per design</span>
            <span><strong className="text-[rgba(6,3,43,0.62)]">Review Required</strong> — revisione umana/advisor necessaria</span>
            <span><strong className="text-purple-700">Mixed</strong> — record con classificazioni eterogenee — richiede validazione</span>
          </div>
        </div>

        {/* Advisor-ready framing */}
        <div className="p-4 rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">Framing Advisor — pre-empirical</p>
          <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed">
            Questa vista prepara il futuro Advisor Review: le classificazioni sono rule-based e pre-empirical,
            raggruppate per iniziativa per facilitare la validazione umana prima del Board Pack finale.
            Le iniziative con evidenza L0/L1 o BTI mixed devono essere validate e aggiornate con export provider (L3+).
          </p>
          <p className="text-[10px] text-[rgba(6,3,43,0.40)] font-mono">
            Engine: deterministic · no LLM · no external calls ·
            {result.koraIndex.methodologyVersion} · {result.koraIndex.calibrationStatus}
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Sprint 16: Board Pack helpers ─────────────────────────────────────────────

interface UploadRec { priority: 'Alta' | 'Media' | 'Bassa'; title: string; body: string; }

function generateUploadRecommendations(result: KoraComputationResult): UploadRec[] {
  const { bti, activation, eligibilitySummary, confidence } = result;
  const recs: UploadRec[] = [];

  if (bti.totalBudget === 0 || bti.budgetEvidenceQuality < 0.25) {
    recs.push({ priority: 'Alta', title: 'Fonte budget assente o insufficiente', body: 'Nessuna evidenza economica rilevata. Aggiungere budget_amount, budget_source, budget_evidence_type per abilitare il macroblocco BTI (peso 20%).' });
  }
  if (bti.totalBudget > 0 && bti.economicReliefSpend / bti.totalBudget > 0.35) {
    const pct = Math.round((bti.economicReliefSpend / bti.totalBudget) * 100);
    recs.push({ priority: 'Alta', title: `${pct}% del budget classificato Economic Relief (0 IU)`, body: 'Buoni pasto e voucher generici non generano Impact Units. Riallocare verso programmi Eligible per incrementare il KORA Index.' });
  }
  if (eligibilitySummary.totalCount > 0 && eligibilitySummary.reviewRequiredCount / eligibilitySummary.totalCount > 0.2) {
    const pct = Math.round((eligibilitySummary.reviewRequiredCount / eligibilitySummary.totalCount) * 100);
    recs.push({ priority: 'Alta', title: `${pct}% di iniziative in Review Required`, body: 'Classificazione incompleta. Validare con Advisor KORA prima di distribuire il Board Pack. Il KORA Index attuale potrebbe sottostimare il potenziale.' });
  }
  if (eligibilitySummary.totalCount > 0 && eligibilitySummary.blockedCount / eligibilitySummary.totalCount > 0.15) {
    const pct = Math.round((eligibilitySummary.blockedCount / eligibilitySummary.totalCount) * 100);
    recs.push({ priority: 'Media', title: `${pct}% Blocked — verificare classificazione compliance`, body: 'Assicurarsi che nessun programma Eligible sia classificato erroneamente come compliance obbligatoria. La baseline legale è esclusa per design — non penalizzata.' });
  }
  if (confidence.score < 50) {
    recs.push({ priority: 'Alta', title: `Confidence Score ${confidence.score}/100 — migliorare qualità evidenza`, body: 'Sostituire stime (L0/L1) con export provider (L3) o documentazione interna (L2+). Board Pack non distribuibile formalmente con CS < 50%.' });
  }
  if (bti.activationDebt > 0) {
    recs.push({ priority: 'Media', title: `Activation Debt: ${formatEur(bti.activationDebt)}`, body: 'Budget non convertito in attivazione profonda. Ottimizzare verso programmi Eligible ad alta partecipazione per ridurre il debito e migliorare il BTI Score.' });
  }
  if (result.warnings.some((w) => w.toLowerCase().includes('care economy'))) {
    recs.push({ priority: 'Bassa', title: 'Opportunità Care Economy rilevata', body: 'Segnali childcare, eldercare o family support presenti. Classificare come Eligible (pillar LIFE + LEGACY) per contribuire al KORA Index.' });
  }
  if (activation.activeWorkers > 0 && activation.activeWorkers + activation.neverActivatedWorkers < 10) {
    recs.push({ priority: 'Media', title: 'Baseline forza lavoro mancante', body: 'Workforce totale non rilevata. Aggiungere workforce_population per calcolare correttamente Activation Rate e Meaningful Activation Rate.' });
  }

  return recs.slice(0, 5);
}

// ── BpDocFooter / BpSectionTitle / BpExhibit ──────────────────────────────────

function BpDocFooter({ fileName }: { fileName: string }) {
  return (
    <div className="mt-8 pt-3 border-t border-[rgba(6,3,43,0.08)] flex items-center justify-between text-[9px] text-[rgba(6,3,43,0.40)] font-mono">
      <span>KORA Foundation Light · Board Pack Preview · {fileName.slice(0, 48)}</span>
      <span className="text-[rgba(6,3,43,0.28)] italic">Preview locale — non distribuire come report certificato</span>
    </div>
  );
}

function BpSectionTitle({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <div className="border-t-2 border-[#06032B] pt-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[9px] font-mono text-[rgba(6,3,43,0.40)] uppercase tracking-widest">{n}</span>
          <h2 className="text-[15px] font-bold tracking-tight text-[#06032B] leading-tight">{title}</h2>
        </div>
        {sub && <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-0.5 ml-7">{sub}</p>}
      </div>
    </div>
  );
}

function BpExhibit({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-3">
      <p className="text-[9px] uppercase tracking-[0.12em] text-[rgba(6,3,43,0.40)] font-semibold">Exhibit {n}</p>
      <p className="text-[11px] font-bold text-[rgba(6,3,43,0.78)] mt-0.5">{title}</p>
    </div>
  );
}

// ── UploadedBoardPackPreview ───────────────────────────────────────────────────

interface UploadedBoardPackPreviewProps {
  result: KoraComputationResult;
  fileName: string;
  totalRecords: number;
  rows: RawUploadedRecord[];
}

function UploadedBoardPackPreview({ result, fileName, totalRecords, rows }: UploadedBoardPackPreviewProps) {
  const groups = useMemo(() => buildInitiativeReviewGroups(rows), [rows]);
  const generatedAt = useMemo(() => new Date().toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'short' }), []);
  const recs = useMemo(() => generateUploadRecommendations(result), [result]);

  const { bti, activation, eligibilitySummary, confidence, koraIndex } = result;
  const METHOD_ID = koraIndex.methodologyVersion;
  const CALIB = koraIndex.calibrationStatus;
  const sg = safeguardCls(activation.safeguardStatus);
  const isInsufficient = result.scoringMode === 'insufficient_data';

  const boardPackGroups = useMemo(() => {
    const score = (g: InitiativeReviewGroup) => {
      let s = 0;
      if (g.reviewRequired || g.isMixedStatus) s += 30;
      if (g.missingBudgetSource) s += 20;
      if (g.isLowConfidence) s += 10;
      if (g.primaryEligibility === 'blocked') s -= 10;
      return s;
    };
    return [...groups].sort((a, b) => score(b) - score(a)).slice(0, 15);
  }, [groups]);

  const isTruncated = groups.length > 15;

  const csSubscores = [
    { label: 'Budget Evidence',  pct: Math.round(confidence.budgetEvidenceConfidence * 100) },
    { label: 'Data Completeness', pct: Math.round(confidence.dataCompleteness * 100) },
    { label: 'Mapping Quality',  pct: Math.round(confidence.mappingConfidence * 100) },
    { label: 'Verification',     pct: Math.round(confidence.verificationConfidence * 100) },
    { label: 'Advisor Review',   pct: Math.round(confidence.reviewConfidence * 100) },
  ];

  return (
    <>
      {/* Print isolation CSS */}
      <style>{`
        @media print {
          [role="banner"], header, aside { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; height: auto !important; }
          body, html { background: white !important; height: auto !important; overflow: visible !important; }
          body * { visibility: hidden; }
          .bp-upload-print, .bp-upload-print * { visibility: visible; }
          .bp-upload-print { position: absolute; top: 0; left: 0; width: 100%; }
          .bp-upload-no-print { display: none !important; }
          .bp-page-break { page-break-before: always; break-before: page; }
          .bp-avoid-break { page-break-inside: avoid; break-inside: avoid; }
          table { border-collapse: collapse; }
          td, th { padding: 3px 7px !important; }
        }
        @page { size: A4 portrait; margin: 14mm 18mm; }
      `}</style>

      {/* Screen-only bar */}
      <div className="bp-upload-no-print flex items-center justify-between gap-4 rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">KORA Board Pack Preview — Dataset caricato</p>
          <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">
            Preview locale, pre-empirical, non certificata. Nessun dato viene salvato.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="shrink-0 px-4 py-2 rounded-lg border border-[#06032B] bg-[#06032B] text-xs font-semibold text-white hover:bg-[rgba(6,3,43,0.88)] transition-colors"
        >
          Stampa / salva PDF
        </button>
      </div>

      {/* ── Document body ── */}
      <div className="bp-upload-print max-w-[794px] mx-auto bg-[#F8F6F1] text-[#06032B] pb-8">

        {/* ═══ PAGE 1 — COVER ═══ */}
        <div className="bp-avoid-break px-1 pt-6 min-h-[820px] flex flex-col">
          <div className="border-t-4 border-[#06032B] pt-5 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.15em] text-[rgba(6,3,43,0.40)] font-semibold mb-0.5">
                  KORA Foundation Light · Board Pack Preview · Dataset caricato
                </p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-[rgba(6,3,43,0.40)]">
                  Preparato per: Executive / HR / Finance / ESG
                </p>
              </div>
              <div className="text-right text-[9px] text-[rgba(6,3,43,0.40)] font-mono space-y-0.5">
                <p>{generatedAt}</p>
                <p>{METHOD_ID}</p>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <h1 className="text-[38px] font-bold tracking-tight text-[#06032B] leading-none mb-2">
              Board Pack Preview
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-[rgba(6,3,43,0.52)] border border-[rgba(6,3,43,0.08)] rounded px-2 py-0.5 bg-[rgba(6,3,43,0.03)] max-w-xs truncate">{fileName}</span>
              <span className="text-[10px] font-semibold text-amber-700 border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] rounded px-2 py-0.5">{CALIB}</span>
              <span className="text-[10px] text-[rgba(6,3,43,0.52)] border border-[rgba(6,3,43,0.08)] rounded px-2 py-0.5">production_ready: false</span>
              <span className="text-[10px] text-[rgba(6,3,43,0.52)] border border-[rgba(6,3,43,0.08)] rounded px-2 py-0.5">Uploaded dataset preview</span>
            </div>
          </div>

          <div className="border-t border-[rgba(6,3,43,0.08)] mb-8" />

          <div className="mb-10">
            <p className="text-[9px] uppercase tracking-[0.12em] text-[rgba(6,3,43,0.40)] font-semibold mb-2">Diagnosi principale</p>
            <p className="text-[20px] font-light text-[rgba(6,3,43,0.90)] leading-snug tracking-tight">
              {isInsufficient
                ? 'Dataset insufficiente — KORA Index non calcolabile.'
                : activation.safeguardStatus === 'CLEAR'
                  ? 'Attivazione sufficiente. Budget-to-Human-Impact verificabile.'
                  : activation.safeguardStatus === 'FLAGGED'
                    ? 'Attivazione critica. Intervento prioritario richiesto.'
                    : 'Attivazione parziale. Potenziale non ancora convertito.'}
            </p>
          </div>

          {!isInsufficient && (
            <div className="grid grid-cols-4 gap-5 mb-10 bp-avoid-break">
              <div className="space-y-1">
                <p className="text-[9px] uppercase tracking-[0.1em] text-[rgba(6,3,43,0.40)] font-semibold">KORA Index Preview</p>
                <p className="text-[44px] font-bold text-[#06032B] leading-none">{koraIndex.value}</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.52)]">/ 100 · pre-calibration</p>
              </div>
              <div className="space-y-1 border-l border-[rgba(6,3,43,0.08)] pl-5">
                <p className="text-[9px] uppercase tracking-[0.1em] text-[rgba(6,3,43,0.40)] font-semibold">Confidence Score</p>
                <p className="text-[36px] font-bold text-[rgba(6,3,43,0.78)] leading-none">{confidence.score}</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.52)]">/ 100 · esterno · peso 0</p>
              </div>
              <div className="space-y-1 border-l border-[rgba(6,3,43,0.08)] pl-5">
                <p className={`text-[9px] uppercase tracking-[0.1em] font-semibold ${activation.safeguardStatus !== 'CLEAR' ? 'text-amber-600' : 'text-[rgba(6,3,43,0.40)]'}`}>Activation Safeguard</p>
                <p className={`text-[24px] font-bold leading-none mt-1 ${sg.text}`}>{activation.safeguardStatus}</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.52)]">AR {formatPct(activation.activationReach)} · MAR {formatPct(activation.meaningfulActivationReach)}</p>
              </div>
              <div className="space-y-1 border-l border-[rgba(6,3,43,0.08)] pl-5">
                <p className="text-[9px] uppercase tracking-[0.1em] text-[rgba(6,3,43,0.40)] font-semibold">BTI Score</p>
                <p className="text-[24px] font-bold text-[#06032B] leading-none mt-1">{bti.btiScore}</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.52)]">/ 100 · macroblocco 20%</p>
              </div>
            </div>
          )}

          <div className="mt-auto border-t border-[rgba(6,3,43,0.08)] pt-5">
            <div className="grid grid-cols-3 gap-6 text-[10px] text-[rgba(6,3,43,0.52)]">
              <div className="space-y-1">
                <p className="font-semibold text-[rgba(6,3,43,0.78)]">Sorgente dati</p>
                <p>File caricato in sessione<br />Nessun dato trasmesso a server<br />{totalRecords} record analizzati</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[rgba(6,3,43,0.78)]">Generato da</p>
                <p>KORA Foundation Light<br />Human Impact Intelligence Platform</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[rgba(6,3,43,0.78)]">Metodologia</p>
                <p className="font-mono">{METHOD_ID}<br />{CALIB}</p>
              </div>
            </div>
          </div>

          <BpDocFooter fileName={fileName} />
        </div>

        {/* ═══ PAGE 2 — EXECUTIVE SUMMARY ═══ */}
        <div className="bp-page-break bp-avoid-break px-1 pt-6">
          <BpSectionTitle n="01" title="Executive Summary" sub={`Dataset: ${fileName} · ${totalRecords} record · ${groups.length} iniziative`} />

          {isInsufficient ? (
            <div className="border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] rounded p-4 text-[12px] text-[#8A5A00]">
              <p className="font-bold mb-1">Dataset insufficiente — KORA Index non calcolabile</p>
              <p>I dati caricati non contengono iniziative sufficienti per il calcolo del KORA Index. Assicurarsi che il file includa nome iniziativa, categoria e almeno un importo budget.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4 mb-5 bp-avoid-break">
                <div className="border-t-2 border-[rgba(6,3,43,0.85)] pt-3 space-y-1">
                  <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">KORA Index</p>
                  <p className="text-[28px] font-bold text-[#06032B] leading-none">{koraIndex.value}<span className="text-[12px] font-normal text-[rgba(6,3,43,0.40)]">/100</span></p>
                  <p className="text-[10px] text-[rgba(6,3,43,0.62)]">{CALIB}</p>
                </div>
                <div className="border-t-2 border-[rgba(6,3,43,0.14)] pt-3 space-y-1">
                  <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Confidence</p>
                  <p className="text-[28px] font-bold text-[rgba(6,3,43,0.78)] leading-none">{confidence.score}<span className="text-[12px] font-normal text-[rgba(6,3,43,0.40)]">/100</span></p>
                  <p className="text-[10px] text-[rgba(6,3,43,0.62)]">Esterno · peso 0</p>
                </div>
                <div className={`border-t-2 pt-3 space-y-1 ${activation.safeguardStatus === 'CLEAR' ? 'border-[#2F7D55]' : activation.safeguardStatus === 'FLAGGED' ? 'border-[#9E3B2F]' : 'border-[#D99A2B]'}`}>
                  <p className={`text-[9px] uppercase tracking-wider font-semibold ${activation.safeguardStatus === 'CLEAR' ? 'text-[rgba(47,125,85,0.90)]' : activation.safeguardStatus === 'FLAGGED' ? 'text-red-600' : 'text-amber-600'}`}>Safeguard</p>
                  <p className={`text-[24px] font-bold leading-none ${sg.text}`}>{activation.safeguardStatus}</p>
                  <p className="text-[10px] text-[rgba(6,3,43,0.62)]">AR {formatPct(activation.activationReach)} · MAR {formatPct(activation.meaningfulActivationReach)}</p>
                </div>
                <div className="border-t-2 border-[rgba(6,3,43,0.08)] pt-3 space-y-1">
                  <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Activation Debt</p>
                  <p className="text-[22px] font-bold text-[#06032B] leading-none mt-1">{formatEur(bti.activationDebt)}</p>
                  <p className="text-[10px] text-[rgba(6,3,43,0.62)]">Budget non convertito</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5 bp-avoid-break">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-2 border-b border-[rgba(6,3,43,0.08)] pb-1">Macroblocks</p>
                  <ul className="space-y-1.5 text-[11px] text-[rgba(6,3,43,0.78)]">
                    <li className="flex justify-between"><span>Activation Reach (25%)</span><span className="font-mono font-bold">{koraIndex.macroblocks.activationReach}</span></li>
                    <li className="flex justify-between"><span>Activation Quality (30%)</span><span className="font-mono font-bold">{koraIndex.macroblocks.activationQuality}</span></li>
                    <li className="flex justify-between"><span>Distribution & Equity (25%)</span><span className="font-mono font-bold">{koraIndex.macroblocks.distributionEquity}</span></li>
                    <li className="flex justify-between"><span>Budget-to-Human-Impact (20%)</span><span className="font-mono font-bold">{koraIndex.macroblocks.budgetToHumanImpact}</span></li>
                  </ul>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-2 border-b border-[rgba(6,3,43,0.08)] pb-1">Eligibility Gate</p>
                  <ul className="space-y-1.5 text-[11px] text-[rgba(6,3,43,0.78)]">
                    <li className="flex justify-between"><span>Eligible</span><span className="font-mono font-bold text-[#2F7D55]">{eligibilitySummary.eligibleCount}</span></li>
                    <li className="flex justify-between"><span>Limited (0 IU)</span><span className="font-mono font-bold text-amber-600">{eligibilitySummary.limitedCount}</span></li>
                    <li className="flex justify-between"><span>Blocked</span><span className="font-mono font-bold text-[rgba(6,3,43,0.40)]">{eligibilitySummary.blockedCount}</span></li>
                    <li className="flex justify-between"><span>Review Required</span><span className="font-mono font-bold text-[rgba(6,3,43,0.62)]">{eligibilitySummary.reviewRequiredCount}</span></li>
                  </ul>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold mb-2 border-b border-[rgba(6,3,43,0.08)] pb-1">Segnali chiave</p>
                  <ul className="space-y-1.5 text-[11px] text-[rgba(6,3,43,0.78)]">
                    {recs.slice(0, 3).map((r, i) => (
                      <li key={i} className="flex gap-2"><span className="text-[rgba(6,3,43,0.28)] shrink-0">{i + 1}.</span><span className="leading-tight">{r.title}</span></li>
                    ))}
                    {recs.length === 0 && <li className="text-[rgba(6,3,43,0.40)]">Nessun segnale critico rilevato.</li>}
                  </ul>
                </div>
              </div>
            </>
          )}

          <BpDocFooter fileName={fileName} />
        </div>

        {/* ═══ PAGE 3 — DATASET READINESS ═══ */}
        <div className="bp-page-break px-1 pt-6">
          <BpSectionTitle n="02" title="Dataset Readiness" sub="Qualità del dataset caricato · nessun dato individuale esposto" />

          <div className="grid grid-cols-3 gap-6 mb-5 bp-avoid-break">
            <div className="border-t-2 border-[rgba(6,3,43,0.85)] pt-3 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Record totali</p>
              <p className="text-[32px] font-bold text-[#06032B] leading-none">{totalRecords}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">righe nel file caricato</p>
            </div>
            <div className="border-t-2 border-[rgba(6,3,43,0.14)] pt-3 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Iniziative rilevate</p>
              <p className="text-[32px] font-bold text-[rgba(6,3,43,0.78)] leading-none">{groups.length}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">gruppi per nome/categoria</p>
            </div>
            <div className="border-t-2 border-[rgba(6,3,43,0.08)] pt-3 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">In Review Required</p>
              <p className="text-[32px] font-bold text-[rgba(6,3,43,0.78)] leading-none">{groups.filter((g) => g.reviewRequired || g.isMixedStatus).length}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">iniziative da validare</p>
            </div>
          </div>

          <BpExhibit n="2.1" title="Indicatori di qualità dataset" />
          <div className="bp-avoid-break mb-5">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-4 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Indicatore</th>
                  <th className="py-1.5 pr-4 text-right text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Conteggio</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Nota</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['Record totali', `${totalRecords}`, 'Righe nel file caricato'],
                  ['Iniziative rilevate', `${groups.length}`, 'Gruppi per nome/categoria iniziativa'],
                  ['In Review Required', `${groups.filter((g) => g.reviewRequired || g.isMixedStatus).length}`, 'Classificazione ambigua o mista'],
                  ['Budget mancante (L0)', `${groups.filter((g) => g.missingBudgetSource).length}`, 'Nessuna fonte budget documentata'],
                  ['Evidenza debole (L0/L1)', `${groups.filter((g) => g.weakestEvidence === 'L0_NO_EVIDENCE' || g.weakestEvidence === 'L1_SELF_DECLARED').length}`, 'Abbassa il Confidence Score'],
                  ['Blocked (compliance)', `${groups.filter((g) => g.primaryEligibility === 'blocked').length}`, 'Escluse per design — non penalizzate'],
                  ['Campi identità rilevati', `${groups.filter((g) => g.hasIdentityFields).length}`, 'Usati solo per stima unici — mai in output employer'],
                ] as [string, string, string][]).map(([label, val, note]) => (
                  <tr key={label} className="border-b border-[rgba(6,3,43,0.05)]">
                    <td className="py-1.5 pr-4 font-semibold text-[rgba(6,3,43,0.78)]">{label}</td>
                    <td className="py-1.5 pr-4 text-right font-mono font-bold text-[#06032B]">{val}</td>
                    <td className="py-1.5 text-[rgba(6,3,43,0.52)] text-[10px]">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <BpExhibit n="2.2" title="Confidence sub-scores" />
          <div className="space-y-2 bp-avoid-break mb-4">
            {csSubscores.map((s) => (
              <div key={s.label} className="flex items-center gap-4">
                <span className="w-36 text-[10px] text-[rgba(6,3,43,0.62)] shrink-0">{s.label}</span>
                <div className="flex-1 h-1.5 bg-[rgba(6,3,43,0.05)] rounded-full">
                  <div className={`h-1.5 rounded-full ${s.pct >= 60 ? 'bg-[rgba(6,3,43,0.65)]' : s.pct >= 35 ? 'bg-[#D99A2B]' : 'bg-[#9E3B2F]'}`} style={{ width: `${s.pct}%` }} />
                </div>
                <span className="w-10 text-right text-[10px] font-mono text-[rgba(6,3,43,0.52)]">{s.pct}%</span>
              </div>
            ))}
          </div>

          <div className="border border-[rgba(6,3,43,0.08)] rounded px-4 py-3 text-[11px] text-[rgba(6,3,43,0.62)]">
            <strong className="text-[rgba(6,3,43,0.90)]">Nota privacy:</strong> I campi identità (nome, cognome, email, matricola) sono usati esclusivamente per stimare il conteggio di lavoratori unici. I valori non sono mai restituiti né visualizzati in questo Board Pack. Output employer: solo conteggi aggregati.
          </div>

          <BpDocFooter fileName={fileName} />
        </div>

        {/* ═══ PAGE 4 — ELIGIBILITY & EVIDENCE ═══ */}
        <div className="bp-page-break px-1 pt-6">
          <BpSectionTitle n="03" title="Eligibility & Evidence Review" sub="Per iniziativa · output aggregato · nessun dato individuale" />

          <div className="grid grid-cols-4 gap-4 mb-5 bp-avoid-break">
            {([
              { label: 'Eligible', count: eligibilitySummary.eligibleCount, note: 'Genera IU → KORA Index', border: 'border-[rgba(6,3,43,0.85)]' },
              { label: 'Limited', count: eligibilitySummary.limitedCount, note: '0 IU · solo BTI engine', border: 'border-[rgba(6,3,43,0.14)]' },
              { label: 'Blocked', count: eligibilitySummary.blockedCount, note: 'Compliance · escluso per design', border: 'border-[rgba(6,3,43,0.08)]' },
              { label: 'Review Required', count: eligibilitySummary.reviewRequiredCount, note: 'Validazione advisor necessaria', border: 'border-amber-300' },
            ] as { label: string; count: number; note: string; border: string }[]).map((b) => (
              <div key={b.label} className={`border-t-2 pt-3 space-y-0.5 ${b.border}`}>
                <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">{b.label}</p>
                <p className="text-[28px] font-bold text-[#06032B] leading-none">{b.count}</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.52)]">{b.note}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 border-l-4 border-[rgba(6,3,43,0.85)] pl-4 py-1">
            <p className="text-[11px] text-[rgba(6,3,43,0.78)] leading-relaxed">
              <strong>KORA non trasforma compliance o budget non documentato in impatto.</strong>{' '}
              La conformità legale obbligatoria è esclusa per design. Il budget non documentato entra nel BTI solo come dichiarato o stimato, con confidence esplicita.
            </p>
          </div>

          <BpExhibit n="3.1" title={`Iniziative per eleggibilità ed evidenza${isTruncated ? ` — top 15 di ${groups.length}` : ` — ${groups.length} totali`}`} />
          <div className="bp-avoid-break overflow-x-auto mb-3">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-3 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Iniziativa</th>
                  <th className="py-1.5 pr-2 text-right text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Rec.</th>
                  <th className="py-1.5 pr-2 text-right text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Lav. unici</th>
                  <th className="py-1.5 pr-2 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Eligibility</th>
                  <th className="py-1.5 pr-2 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Pillar</th>
                  <th className="py-1.5 pr-2 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Evidenza</th>
                  <th className="py-1.5 pr-2 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">BTI</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Azione</th>
                </tr>
              </thead>
              <tbody>
                {boardPackGroups.map((grp) => (
                  <tr key={grp.groupKey} className="border-b border-[rgba(6,3,43,0.05)]">
                    <td className="py-1.5 pr-3 align-top">
                      <p className="font-semibold text-[rgba(6,3,43,0.90)] max-w-[150px] leading-tight">{grp.groupLabel}</p>
                      {grp.isCareEconomy && <span className="text-[9px] text-blue-600">care economy</span>}
                    </td>
                    <td className="py-1.5 pr-2 text-right font-mono text-[rgba(6,3,43,0.62)] align-top">{grp.recordCount}</td>
                    <td className="py-1.5 pr-2 text-right font-mono text-[rgba(6,3,43,0.62)] align-top">
                      {grp.uniqueWorkerEstimate !== null ? `~${grp.uniqueWorkerEstimate}` : '—'}
                    </td>
                    <td className="py-1.5 pr-2 align-top">
                      <span className={`text-[9px] font-bold rounded px-1 py-0.5 ${
                        grp.primaryEligibility === 'eligible' ? 'bg-[#06032B] text-white' :
                        grp.primaryEligibility === 'limited' ? 'bg-[rgba(6,3,43,0.12)] text-[rgba(6,3,43,0.78)]' :
                        grp.primaryEligibility === 'blocked' ? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.40)]' :
                        'bg-[rgba(217,154,43,0.12)] text-amber-700'
                      }`}>{grp.primaryEligibility}</span>
                    </td>
                    <td className="py-1.5 pr-2 align-top text-[10px] font-semibold text-[rgba(6,3,43,0.62)]">{grp.primaryPillar ?? '—'}</td>
                    <td className="py-1.5 pr-2 align-top text-[9px] font-mono text-[rgba(6,3,43,0.52)]">{evidenceLevelLabel(grp.strongestEvidence)}</td>
                    <td className="py-1.5 pr-2 align-top text-[9px] font-mono text-[rgba(6,3,43,0.52)]">{btiTreatmentLabel(grp.primaryBtiTreatment)}</td>
                    <td className="py-1.5 align-top text-[9px] text-[rgba(6,3,43,0.62)] max-w-[120px] leading-tight">{grp.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isTruncated && (
            <p className="text-[9px] text-[rgba(6,3,43,0.40)] mb-3">
              Prime 15 iniziative per priorità di revisione. Dataset completo: {groups.length} iniziative · nessuna riga raw · nessun dato identità.
            </p>
          )}

          <BpDocFooter fileName={fileName} />
        </div>

        {/* ═══ PAGE 5 — BUDGET-TO-HUMAN-IMPACT ═══ */}
        <div className="bp-page-break px-1 pt-6">
          <BpSectionTitle n="04" title="Budget-to-Human-Impact (BTI)" sub="Macroblocco 4 · peso 20% nel KORA Index v3 · nessun budget inventato" />

          <div className="grid grid-cols-3 gap-5 mb-5 bp-avoid-break">
            <div className="border-t-2 border-[rgba(6,3,43,0.85)] pt-3 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Budget totale rilevato</p>
              <p className="text-[26px] font-bold text-[#06032B] leading-none">{formatEur(bti.totalBudget)}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">da colonne budget nel dataset</p>
            </div>
            <div className="border-t-2 border-[rgba(6,3,43,0.14)] pt-3 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Deep Activation Spend</p>
              <p className="text-[26px] font-bold text-[rgba(6,3,43,0.78)] leading-none">{formatEur(bti.deepActivationSpend)}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">{bti.totalBudget > 0 ? `${Math.round((bti.deepActivationSpend / bti.totalBudget) * 100)}%` : '—'} del totale</p>
            </div>
            <div className="border-t-2 border-[rgba(6,3,43,0.08)] pt-3 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Activation Debt</p>
              <p className="text-[26px] font-bold text-[#06032B] leading-none">{formatEur(bti.activationDebt)}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">budget non convertito in IU</p>
            </div>
          </div>

          <BpExhibit n="4.1" title="Composizione budget per categoria BTI" />
          <div className="bp-avoid-break mb-5">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-4 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Categoria</th>
                  <th className="py-1.5 pr-4 text-right text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Importo</th>
                  <th className="py-1.5 pr-4 text-right text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Share</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Trattamento BTI</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { label: 'Deep Activation Spend', amount: bti.deepActivationSpend, treatment: 'Genera IU → KORA Index' },
                  { label: 'Economic Relief Spend', amount: bti.economicReliefSpend, treatment: '0 IU · tracciato in BTI engine' },
                  { label: 'Blocked Compliance Spend', amount: bti.blockedComplianceSpend, treatment: '0 IU · escluso per design' },
                  { label: 'Activation Debt', amount: bti.activationDebt, treatment: 'Budget non convertito in attivazione' },
                ] as { label: string; amount: number; treatment: string }[]).map((r) => (
                  <tr key={r.label} className="border-b border-[rgba(6,3,43,0.05)]">
                    <td className="py-2 pr-4 font-semibold text-[rgba(6,3,43,0.90)]">{r.label}</td>
                    <td className="py-2 pr-4 text-right font-mono font-bold text-[#06032B]">{formatEur(r.amount)}</td>
                    <td className="py-2 pr-4 text-right font-mono text-[rgba(6,3,43,0.62)]">
                      {bti.totalBudget > 0 ? `${Math.round((r.amount / bti.totalBudget) * 100)}%` : '—'}
                    </td>
                    <td className="py-2 text-[rgba(6,3,43,0.62)] text-[10px]">{r.treatment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <BpExhibit n="4.2" title="Budget Evidence Quality" />
          <div className="flex items-center gap-4 mb-2 bp-avoid-break">
            <div className="flex-1 h-3 bg-[rgba(6,3,43,0.05)] rounded-full">
              <div
                className={`h-3 rounded-full ${bti.budgetEvidenceQuality >= 0.6 ? 'bg-[#06032B]' : bti.budgetEvidenceQuality >= 0.35 ? 'bg-[#D99A2B]' : 'bg-[#9E3B2F]'}`}
                style={{ width: `${Math.round(bti.budgetEvidenceQuality * 100)}%` }}
              />
            </div>
            <span className="text-[13px] font-bold font-mono text-[#06032B] w-10 text-right">{Math.round(bti.budgetEvidenceQuality * 100)}%</span>
          </div>
          <p className="text-[10px] text-[rgba(6,3,43,0.52)] mb-4">
            {bti.totalBudget === 0
              ? 'Nessun importo budget rilevato nel dataset. Aggiungere budget_amount, budget_source, budget_evidence_type per abilitare il BTI Engine.'
              : bti.budgetEvidenceQuality < 0.4
                ? 'Qualità evidenza bassa (L0/L1 prevalente). BTI Score penalizzato. Sostituire con export provider (L3) o documentazione interna (L2+).'
                : 'Qualità evidenza accettabile. Verificare con Advisor KORA per full_weight nel BTI Engine.'}
          </p>

          <div className="border border-[rgba(6,3,43,0.08)] rounded px-4 py-3 bp-avoid-break">
            <p className="text-[11px] font-bold text-[rgba(6,3,43,0.90)] mb-1">Il budget non è un dato valido se non ha una fonte.</p>
            <p className="text-[11px] text-[rgba(6,3,43,0.62)] leading-relaxed">
              La qualità della fonte budget (L0–L4) determina il peso di ogni record nel BTI Engine. Budget stimato o dichiarato riceve un trust score inferiore — si riflette nel Confidence Score (esterno al KORA Index, peso = 0).
            </p>
          </div>

          <BpDocFooter fileName={fileName} />
        </div>

        {/* ═══ PAGE 6 — ACTIVATION & REACH ═══ */}
        <div className="bp-page-break px-1 pt-6">
          <BpSectionTitle n="05" title="Activation & Reach" sub="Output aggregato · nessun dato individuale · nessun nominativo" />

          <div className="grid grid-cols-4 gap-4 mb-5 bp-avoid-break">
            <div className="border-t-2 border-[rgba(6,3,43,0.85)] pt-3 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Lavoratori attivi</p>
              <p className="text-[28px] font-bold text-[#06032B] leading-none">{activation.activeWorkers}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">AR {formatPct(activation.activationReach)}</p>
            </div>
            <div className="border-t-2 border-[rgba(6,3,43,0.14)] pt-3 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Attivazione significativa</p>
              <p className="text-[28px] font-bold text-[rgba(6,3,43,0.78)] leading-none">{activation.meaningfullyActiveWorkers}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">MAR {formatPct(activation.meaningfulActivationReach)}</p>
            </div>
            <div className="border-t-2 border-[rgba(6,3,43,0.08)] pt-3 space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Mai attivati</p>
              <p className="text-[28px] font-bold text-[rgba(6,3,43,0.78)] leading-none">{activation.neverActivatedWorkers}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">potenziale non convertito</p>
            </div>
            <div className={`border-t-2 pt-3 space-y-0.5 ${activation.safeguardStatus === 'CLEAR' ? 'border-[#2F7D55]' : activation.safeguardStatus === 'FLAGGED' ? 'border-[#9E3B2F]' : 'border-[#D99A2B]'}`}>
              <p className="text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.40)] font-semibold">Safeguard</p>
              <p className={`text-[22px] font-bold leading-none mt-1 ${sg.text}`}>{activation.safeguardStatus}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">D-21 threshold</p>
            </div>
          </div>

          <BpExhibit n="5.1" title="Activation Rate vs soglie Safeguard (D-21)" />
          <div className="space-y-3 mb-5 bp-avoid-break border border-[rgba(6,3,43,0.05)] rounded px-4 py-4">
            {([
              { label: 'Activation Rate (AR)', val: activation.activationReach, threshold: 0.40, note: 'CLEAR ≥ 40%' },
              { label: 'Meaningful Activation Rate (MAR)', val: activation.meaningfulActivationReach, threshold: 0.30, note: 'CLEAR ≥ 30%' },
            ] as { label: string; val: number; threshold: number; note: string }[]).map((m) => (
              <div key={m.label} className="space-y-1">
                <div className="flex justify-between text-[10px] text-[rgba(6,3,43,0.52)]">
                  <span>{m.label}</span>
                  <span className="font-mono font-medium">{formatPct(m.val)} <span className="font-normal opacity-60">({m.note})</span></span>
                </div>
                <div className="relative h-2 rounded-full bg-[rgba(6,3,43,0.05)]">
                  <div
                    className={`h-2 rounded-full ${m.val >= m.threshold ? 'bg-[rgba(47,125,85,0.08)]0' : m.val >= m.threshold * 0.5 ? 'bg-[#D99A2B]' : 'bg-[#9E3B2F]'}`}
                    style={{ width: `${Math.min(100, Math.round(m.val * 100))}%` }}
                  />
                  <div className="absolute top-0 bottom-0 w-px bg-[rgba(6,3,43,0.35)]" style={{ left: `${m.threshold * 100}%` }} />
                </div>
              </div>
            ))}
            <p className="text-[9px] text-[rgba(6,3,43,0.40)] pt-1">
              Nessun nominativo. Nessun PIB individuale. Solo conteggi aggregati.
              {activation.warnings.some((w) => w.includes('stima') || w.includes('bounded')) ? ' Reach stimata: dati identità parziali, stima conservativa.' : ''}
            </p>
          </div>

          <div className="border border-[rgba(6,3,43,0.08)] rounded px-4 py-3 bp-avoid-break">
            <p className="text-[11px] font-bold text-[rgba(6,3,43,0.90)] mb-1">Confine privacy — output employer</p>
            <p className="text-[11px] text-[rgba(6,3,43,0.62)] leading-relaxed">
              Output employer: solo conteggi aggregati sopra soglia N ≥ 10. Nessun campo identità (nome, email, matricola) è incluso in questo Board Pack.
              I campi identità nei dati caricati sono stati usati esclusivamente per stimare il conteggio di lavoratori unici — i valori non sono mai restituiti.
            </p>
          </div>

          <BpDocFooter fileName={fileName} />
        </div>

        {/* ═══ PAGE 7 — RECOMMENDATIONS + METHODOLOGY ═══ */}
        <div className="bp-page-break px-1 pt-6">
          <BpSectionTitle n="06" title="Raccomandazioni & Confini Metodologici" sub={`${recs.length} raccomandazioni deterministiche · pre_empirical_calibration`} />

          <BpExhibit n="6.1" title="Raccomandazioni prioritarie — output deterministico dai risultati" />
          <div className="bp-avoid-break mb-6">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-3 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold w-16">Prior.</th>
                  <th className="py-1.5 pr-3 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Azione</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Razionale</th>
                </tr>
              </thead>
              <tbody>
                {recs.map((r, i) => (
                  <tr key={i} className={i < recs.length - 1 ? 'border-b border-[rgba(6,3,43,0.05)]' : ''}>
                    <td className="py-2 pr-3 align-top">
                      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                        r.priority === 'Alta'  ? 'border-[rgba(6,3,43,0.85)] bg-[#06032B] text-white' :
                        r.priority === 'Media' ? 'border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.78)]' :
                                                 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.40)]'
                      }`}>{r.priority}</span>
                    </td>
                    <td className="py-2 pr-3 align-top font-semibold text-[rgba(6,3,43,0.90)]">{r.title}</td>
                    <td className="py-2 align-top text-[rgba(6,3,43,0.62)]">{r.body}</td>
                  </tr>
                ))}
                {recs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-[10px] text-[rgba(6,3,43,0.40)]">
                      Nessuna raccomandazione critica rilevata. Procedere con revisione Advisor KORA.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <BpExhibit n="6.2" title="Confini metodologici — non derogabili" />
          <div className="bp-avoid-break mb-4">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#06032B]">
                  <th className="py-1.5 pr-4 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold w-48">Elemento</th>
                  <th className="py-1.5 text-left text-[9px] uppercase tracking-wider text-[rgba(6,3,43,0.52)] font-semibold">Nota</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['Calibrazione', `${METHOD_ID} · ${CALIB} · pesi v0.1 pre-empirici`],
                  ['Confidence Score', 'Esterno al KORA Index v3 · peso = 0 · indicatore affidabilità dati'],
                  ['Activation Safeguard', 'Gate interpretivo — non componente del KORA Index'],
                  ['Worker ranking', 'KORA non produce ranking. PIB è worker-private. Nessun dato individuale in questo Board Pack.'],
                  ['Output employer', 'Solo aggregati sopra N ≥ 10 · nessun PIB · nessun dato identità individuale'],
                  ['Causalità', 'Correlazione ≠ causalità — tutti i segnali KORA sono associativi, non predittivi'],
                  ['Assurance ESG', 'KORA non garantisce conformità normativa ESG/CSR'],
                  ['Certificazione', 'Board Pack Preview non certificato. Revisione Advisor KORA richiesta prima di uso formale.'],
                  ['Dati salvati', 'Nessun dato trasmesso a server o salvato. Elaborazione interamente client-side in questa sessione.'],
                ] as [string, string][]).map(([label, val]) => (
                  <tr key={label} className="border-b border-[rgba(6,3,43,0.05)]">
                    <td className="py-1.5 pr-4 font-semibold text-[rgba(6,3,43,0.62)] align-top">{label}</td>
                    <td className="py-1.5 text-[rgba(6,3,43,0.78)]">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-[rgba(6,3,43,0.08)] rounded px-4 py-3 bp-avoid-break">
            <p className="text-[11px] text-[rgba(6,3,43,0.62)] leading-relaxed">
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
              Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
              Questo Board Pack Preview è generato localmente dal dataset caricato in sessione. È pre-empirical e non certificato.
              Revisione Advisor KORA raccomandata prima di qualsiasi uso formale o distribuzione.
            </p>
            <p className="text-[9px] font-mono text-[rgba(6,3,43,0.40)] mt-2">
              {METHOD_ID} · {CALIB} · production_ready: false · foundation_light_dynamic_preview · {generatedAt}
            </p>
          </div>

          <BpDocFooter fileName={fileName} />
        </div>

      </div>
    </>
  );
}

// ── KoraExplainPanel ───────────────────────────────────────────────────────────

function KoraExplainPanel({ trace }: { trace: ExplainabilityTraceItem[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(6,3,43,0.05)]">
        <h3 className="text-sm font-semibold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Explainability Trace</h3>
        <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
          9 stage — solo valori aggregati. Nessun dato identità. Per revisione Advisor / Data Room.
        </p>
      </div>
      <div className="divide-y divide-[rgba(6,3,43,0.05)]">
        {trace.map((item) => (
          <div key={item.id} className="group">
            <button
              onClick={() => setOpen(open === item.id ? null : item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[rgba(6,3,43,0.03)]/80 transition-colors"
            >
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.warning ? 'bg-[#D99A2B]' : 'bg-[#2F7D55]'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[rgba(6,3,43,0.78)] truncate">{item.stage}</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.40)] font-mono truncate">{item.output}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                  item.confidence >= 0.7
                    ? 'bg-[rgba(47,125,85,0.08)] text-[rgba(47,125,85,0.90)] border-[rgba(47,125,85,0.22)]'
                    : item.confidence >= 0.4
                    ? 'bg-[rgba(217,154,43,0.08)] text-amber-600 border-[rgba(217,154,43,0.25)]'
                    : 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]'
                }`}>
                  {Math.round(item.confidence * 100)}%
                </span>
                <svg className={`w-3.5 h-3.5 text-[rgba(6,3,43,0.40)] transition-transform ${open === item.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            {open === item.id && (
              <div className="px-4 pb-4 space-y-2">
                <div className="p-3 rounded-lg bg-[rgba(6,3,43,0.03)] border border-[rgba(6,3,43,0.05)] space-y-2 text-xs text-[rgba(6,3,43,0.62)]">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] block mb-0.5">Input</span>
                    <span className="font-mono">{item.input}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] block mb-0.5">Output</span>
                    <span className="font-mono">{item.output}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] block mb-0.5">Regola applicata</span>
                    <span>{item.ruleApplied}</span>
                  </div>
                  {item.warning && (
                    <div className="flex items-start gap-2 p-2 rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-700">
                      <span className="shrink-0">⚠</span>
                      <span>{item.warning}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
