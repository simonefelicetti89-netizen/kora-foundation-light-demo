// lib/kora-engine/reach-semantics.ts
// B24: Reach Semantics — board-safe AR/MAR separation.
// Pure function — no DB, no LLM, no side effects.
//
// Separates broad activation reach (AR: eligible + limited) from meaningful
// activation (MAR: eligible only) and estimates economic relief reach and
// compliance baseline reach from record eligibility splits.
//
// All values are ESTIMATES — bounded conservative aggregates, not identity-deduplicated.
// economicReliefReach and complianceBaselineReach use naive participant sums capped at
// workforcePopulation. These are EXPLANATORY metrics — they do NOT influence the KORA Index.
// deepActivationReach is future — returned as null in v0.1.

import type { RawUploadedRecord, NormalizedUEFRecord, EligibilityResult } from './types';
import { isRawUploadedRecord } from './pillar-mapping';

export interface ReachSemanticsResult {
  activationRate: number | null;            // AR 0–1: broad reach, eligible + limited
  meaningfulActivationRate: number | null;  // MAR 0–1: eligible only — primary signal
  economicReliefReach: number | null;       // 0–1 estimate from limited records (naive pax sum / wf)
  complianceBaselineReach: number | null;   // 0–1 estimate from blocked records (naive pax sum / wf)
  deepActivationReach: null;                // future metric — not derivable without identity signals
  reliefGapPct: number | null;             // (AR - MAR) in percentage points, 1-decimal
  reliefGapWarning: boolean;               // true when reliefGapPct > 20pp
  explanatoryFlags: string[];
  caveat: string;
}

const PAX_KEYS = [
  'participants', 'partecipanti', 'fruitori', 'users', 'active_users', 'active_workers',
] as const;

export const REACH_SEMANTICS_CAVEAT =
  'Reach Semantics v0.1 — stime aggregated conservative. ' +
  'AR (Activation Rate) include il reach complessivo: eligible + economic relief (limited). ' +
  'MAR (Meaningful Activation Rate) è il segnale primario: solo record eligible, esclude economic relief. ' +
  'economicReliefReach e complianceBaselineReach sono stime basate su somma partecipanti (non deduplicated per identità). ' +
  'deepActivationReach è una metrica futura (v0.1: null). ' +
  'Nessun indicatore Reach Semantics entra nel KORA Index.';

function extractPax(record: RawUploadedRecord | NormalizedUEFRecord): number | null {
  if (!isRawUploadedRecord(record)) return record.participants;
  const { raw } = record;
  for (const [k, v] of Object.entries(raw)) {
    const nk = k.toLowerCase().trim().replace(/\s+/g, ' ');
    if (PAX_KEYS.some((pk) => nk.includes(pk))) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.round(v);
      if (typeof v === 'string') {
        const n = parseFloat(v.replace(',', '.'));
        if (Number.isFinite(n) && n >= 0) return Math.round(n);
      }
    }
  }
  return null;
}

export function computeReachSemantics(params: {
  records: Array<RawUploadedRecord | NormalizedUEFRecord>;
  eligibilityResults: EligibilityResult[];
  workforcePopulation: number | null;
  activationRate: number | null;
  meaningfulActivationRate: number | null;
}): ReachSemanticsResult {
  const {
    records, eligibilityResults, workforcePopulation,
    activationRate, meaningfulActivationRate,
  } = params;

  const wf = (workforcePopulation !== null && workforcePopulation > 0) ? workforcePopulation : null;
  const flags: string[] = [];

  let limitedPaxSum = 0;
  let limitedCount = 0;
  let limitedMissingPax = 0;
  let blockedPaxSum = 0;
  let blockedCount = 0;
  let blockedMissingPax = 0;

  for (let i = 0; i < records.length; i++) {
    const status = eligibilityResults[i]?.status ?? 'review_required';
    const pax = extractPax(records[i]);

    if (status === 'limited') {
      limitedCount++;
      if (pax !== null && pax > 0) limitedPaxSum += pax;
      else limitedMissingPax++;
    } else if (status === 'blocked') {
      blockedCount++;
      if (pax !== null && pax > 0) blockedPaxSum += pax;
      else blockedMissingPax++;
    }
  }

  const economicReliefReach: number | null = (() => {
    if (limitedCount === 0 || limitedPaxSum === 0 || wf === null) return null;
    return Math.round((Math.min(limitedPaxSum, wf) / wf) * 10000) / 10000;
  })();

  const complianceBaselineReach: number | null = (() => {
    if (blockedCount === 0 || blockedPaxSum === 0 || wf === null) return null;
    return Math.round((Math.min(blockedPaxSum, wf) / wf) * 10000) / 10000;
  })();

  // reliefGapPct: AR - MAR in percentage points (1-decimal precision)
  const reliefGapPct: number | null =
    activationRate !== null && meaningfulActivationRate !== null
      ? Math.round((activationRate - meaningfulActivationRate) * 1000) / 10
      : null;

  const reliefGapWarning = reliefGapPct !== null && reliefGapPct > 20;

  if (reliefGapWarning && reliefGapPct !== null) {
    flags.push(
      `Gap AR→MAR: ${reliefGapPct}pp. ` +
      'L\'Activation Rate è significativamente influenzato da economic relief ' +
      '(benefit monetari, voucher, fringe benefit ad ampia copertura). ' +
      'MAR è il segnale di attivazione profonda rilevante per la strategia people.',
    );
  }
  if (limitedMissingPax > 0) {
    flags.push(
      `${limitedMissingPax} record limited (economic relief) privi di dati partecipanti — ` +
      'economicReliefReach potrebbe essere sottostimato.',
    );
  }
  if (blockedMissingPax > 0) {
    flags.push(
      `${blockedMissingPax} record blocked (compliance) privi di dati partecipanti — ` +
      'complianceBaselineReach potrebbe essere sottostimato.',
    );
  }
  if (wf === null) {
    flags.push(
      'Workforce baseline non disponibile — economicReliefReach e complianceBaselineReach non calcolabili. ' +
      'Fornire baseline forza lavoro per stime accurate.',
    );
  }

  return {
    activationRate,
    meaningfulActivationRate,
    economicReliefReach,
    complianceBaselineReach,
    deepActivationReach: null,
    reliefGapPct,
    reliefGapWarning,
    explanatoryFlags: flags,
    caveat: REACH_SEMANTICS_CAVEAT,
  };
}
