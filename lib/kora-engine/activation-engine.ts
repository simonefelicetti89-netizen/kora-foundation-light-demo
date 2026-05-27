// lib/kora-engine/activation-engine.ts
// Activation Engine v0.1 — KORA Foundation Light Pilot.
//
// Estimates activation reach (AR), meaningful activation reach (MAR),
// concentration, distribution gaps, and Activation Safeguard status
// from uploaded/normalized records.
//
// Core input for the Activation Reach macroblock (25%) of the future KORA Index Engine.
// Sprint 11 does NOT compute the full KORA Index.
//
// Privacy principle: aggregate signals only. Individual worker data is never produced.
// Aggregation is over programs/initiatives, not over named individuals.
//
// Design constraints:
//   - Deterministic. No Math.random. No external calls. No AI.
//   - Never throws on malformed input.
//   - Never invents workforce population or participant counts.
//   - Conservative: missing data → warnings + 0, not optimistic estimates.
//   - Safeguard is NOT CLEAR when workforce is unknown or data is insufficient.

import type {
  RawUploadedRecord,
  NormalizedUEFRecord,
  EligibilityResult,
  PillarMappingResult,
  ActivationResult,
} from './types';
import { classifyEligibilityBatch } from './eligibility-gate';
import { isRawUploadedRecord } from './pillar-mapping';

// ── Version metadata ──────────────────────────────────────────────────────────

const ENGINE_SOURCE = 'ActivationEngine_v0.1';

// ── Safeguard thresholds — canonical D-21 (CLAUDE.md §14) ────────────────────
// These are gate thresholds, NOT KORA Index macroblock weights.
// Macroblock weight (25% for Activation Reach) lives in lib/methodology-config/v0.1.ts.

const SAFEGUARD_CLEAR_AR  = 0.40;  // AR must reach this for CLEAR
const SAFEGUARD_CLEAR_MAR = 0.30;  // MAR must reach this for CLEAR
const SAFEGUARD_WARN_AR   = 0.20;  // AR below this → FLAGGED
const SAFEGUARD_WARN_MAR  = 0.15;  // MAR below this → FLAGGED

// CLEAR-prevention thresholds
const PREVENT_CLEAR_REVIEW_RATIO = 0.25;  // >25% review_required records → no CLEAR
const PREVENT_CLEAR_TOP_CONC     = 0.60;  // top concentration >60% → no CLEAR
const PREVENT_CLEAR_LOW_BOTTOM50 = 0.15;  // bottom50 share <15% → no CLEAR

// ── Field extraction key tables ───────────────────────────────────────────────

const PARTICIPANT_KEYS: readonly string[] = [
  'participants', 'partecipanti', 'fruitori', 'users', 'active_users',
  'active workers', 'active_workers',
];

const WORKFORCE_KEYS: readonly string[] = [
  'workforce_population', 'workforce', 'forza_lavoro', 'headcount',
  'total_workers', 'dipendenti totali', 'organico', 'totale dipendenti',
  'totale lavoratori',
];

const ELIGIBLE_POP_KEYS: readonly string[] = [
  'eligible_population', 'popolazione_eleggibile', 'eligible workers',
  'platea eleggibile', 'popolazione target', 'eligible_workers',
];

const DEPT_KEYS: readonly string[] = [
  'department', 'dipartimento', 'reparto', 'area', 'funzione', 'divisione',
];

const SITE_KEYS: readonly string[] = [
  'site', 'sede', 'location', 'stabilimento', 'ufficio', 'plant', 'filiale',
];

const TOP_CONC_KEYS: readonly string[] = [
  'top_10_share', 'top_12_share', 'top_concentration', 'concentration_top_share',
];

const BOTTOM_50_KEYS: readonly string[] = [
  'bottom_50_share', 'bottom_fifty_share', 'bottom50',
];

const RECURRENCE_KEYS: readonly string[] = [
  'recurrence', 'frequency', 'ricorrente', 'frequenza', 'periodico',
  'mensile', 'trimestrale', 'ongoing', 'ciclico',
];

const CONTINUITY_KEYS: readonly string[] = [
  'continuity', 'continuita', 'continuo', 'sustained', 'continuativo',
  'multi-period', 'pluriennale',
];

const DURATION_KEYS: readonly string[] = [
  'hours', 'ore', 'duration', 'durata', 'sessions', 'sessioni',
];

// Mirror of eligibility-gate individual-sensitive signals (no individual data in pipeline).
const INDIVIDUAL_SENSITIVE_SIGNALS: readonly string[] = [
  'nome dipendente', 'cognome dipendente',
  'codice fiscale', 'fiscal code',
  'email dipendente', 'email individuale',
  'sessione individuale', 'sessione terapia', 'terapia personale',
  'diagnosi individuale', 'referto medico', 'cartella clinica',
  'individuale burnout', 'individual mental health score',
  'worker ranking', 'classifica dipendenti',
  'matricola dipendente', 'badge number individuale',
];

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

function norm(v: unknown): string {
  if (v === null || v === undefined) return '';
  return removeAccents(String(v).toLowerCase().trim().replace(/\s+/g, ' '));
}

function containsAny(text: string, keys: readonly string[]): boolean {
  return keys.some((k) => text.includes(norm(k)));
}

// ── Numeric parsing ───────────────────────────────────────────────────────────

function parsePositiveInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
  const s = String(v).replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

// Parse a 0–1 share or a 0–100 percentage, normalised to 0–1.
function parseShare(v: unknown): number | null {
  const n = parsePositiveInt(v);
  if (n === null) return null;
  if (n <= 1) return n;
  if (n <= 100) return n / 100;
  return null;
}

// ── Per-record activation fields ──────────────────────────────────────────────

interface ActivationFields {
  participants: number | null;
  eligiblePopulation: number | null;
  workforceSignal: number | null;
  department: string | null;
  site: string | null;
  concentrationTopShare: number | null;
  bottomFiftyShare: number | null;
  recurrenceSignal: boolean;
  continuitySignal: boolean;
  durationHours: number | null;
  hasSensitiveSignal: boolean;
}

function findRawKey(raw: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const [k, v] of Object.entries(raw)) {
    const nk = norm(k);
    if (keys.some((candidate) => nk.includes(norm(candidate)))) return v;
  }
  return undefined;
}

function extractFromRaw(record: RawUploadedRecord): ActivationFields {
  const { raw } = record;
  const allValues = Object.values(raw).map(norm).join(' ');

  const deptRaw   = findRawKey(raw, DEPT_KEYS);
  const siteRaw   = findRawKey(raw, SITE_KEYS);
  const topConcRaw = findRawKey(raw, TOP_CONC_KEYS);
  const bot50Raw   = findRawKey(raw, BOTTOM_50_KEYS);
  const hoursRaw   = findRawKey(raw, DURATION_KEYS);

  return {
    participants:         parsePositiveInt(findRawKey(raw, PARTICIPANT_KEYS)),
    eligiblePopulation:   parsePositiveInt(findRawKey(raw, ELIGIBLE_POP_KEYS)),
    workforceSignal:      parsePositiveInt(findRawKey(raw, WORKFORCE_KEYS)),
    department:           deptRaw   !== undefined ? (norm(deptRaw)   || null) : null,
    site:                 siteRaw   !== undefined ? (norm(siteRaw)   || null) : null,
    concentrationTopShare: topConcRaw !== undefined ? parseShare(topConcRaw) : null,
    bottomFiftyShare:      bot50Raw   !== undefined ? parseShare(bot50Raw)   : null,
    recurrenceSignal:     containsAny(allValues, RECURRENCE_KEYS),
    continuitySignal:     containsAny(allValues, CONTINUITY_KEYS),
    durationHours:        hoursRaw !== undefined ? parsePositiveInt(hoursRaw) : null,
    hasSensitiveSignal:   containsAny(allValues, INDIVIDUAL_SENSITIVE_SIGNALS),
  };
}

function extractFromUEF(record: NormalizedUEFRecord): ActivationFields {
  const allValues = [record.eventName, record.description, record.category]
    .map(norm).join(' ');
  return {
    participants:         record.participants,
    eligiblePopulation:   record.eligiblePopulation,
    workforceSignal:      record.workforcePopulation > 0 ? record.workforcePopulation : null,
    department:           record.department ?? null,
    site:                 record.site ?? null,
    concentrationTopShare: null,
    bottomFiftyShare:     null,
    recurrenceSignal:     false,
    continuitySignal:     false,
    durationHours:        null,
    hasSensitiveSignal:   containsAny(allValues, INDIVIDUAL_SENSITIVE_SIGNALS),
  };
}

function extractFields(record: RawUploadedRecord | NormalizedUEFRecord): ActivationFields {
  try {
    return isRawUploadedRecord(record) ? extractFromRaw(record) : extractFromUEF(record);
  } catch {
    return {
      participants: null, eligiblePopulation: null, workforceSignal: null,
      department: null, site: null, concentrationTopShare: null, bottomFiftyShare: null,
      recurrenceSignal: false, continuitySignal: false, durationHours: null,
      hasSensitiveSignal: false,
    };
  }
}

function getRecordId(record: RawUploadedRecord | NormalizedUEFRecord): string {
  return isRawUploadedRecord(record) ? record.recordId : record.uefId;
}

// ── Safeguard computation — D-21 canonical rules ──────────────────────────────

function computeSafeguardStatus(
  ar: number,
  mar: number,
  workforceKnown: boolean,
  highConcentration: boolean,
  lowBottom50: boolean,
  reviewRequiredRatio: number,
): 'CLEAR' | 'WARNING' | 'FLAGGED' {
  // Cannot be CLEAR when workforce is unknown — insufficient data
  if (!workforceKnown) return 'WARNING';

  // FLAGGED: severe under-activation (D-21)
  if (ar < SAFEGUARD_WARN_AR || mar < SAFEGUARD_WARN_MAR) return 'FLAGGED';

  // Check CLEAR conditions: both thresholds met + no prevention
  const meetsClearThresholds = ar >= SAFEGUARD_CLEAR_AR && mar >= SAFEGUARD_CLEAR_MAR;
  const prevented =
    highConcentration ||
    lowBottom50 ||
    reviewRequiredRatio > PREVENT_CLEAR_REVIEW_RATIO;

  if (meetsClearThresholds && !prevented) return 'CLEAR';

  // WARNING: between thresholds, or CLEAR conditions not all met
  return 'WARNING';
}

// ── Zero/empty result ─────────────────────────────────────────────────────────

function zeroResult(warnings: string[]): ActivationResult {
  return {
    activationReach: 0,
    meaningfulActivationReach: 0,
    activeWorkers: 0,
    meaningfullyActiveWorkers: 0,
    neverActivatedWorkers: 0,
    concentrationTopShare: 0,
    bottomFiftyShare: 0,
    departmentGaps: {},
    siteGaps: {},
    safeguardStatus: 'WARNING',
    warnings,
  };
}

// ── Main engine ───────────────────────────────────────────────────────────────

export function computeActivation(params: {
  records: Array<RawUploadedRecord | NormalizedUEFRecord>;
  eligibilityResults: EligibilityResult[];
  pillarMappings?: PillarMappingResult[];
  workforcePopulation?: number;
}): ActivationResult {
  const { records, eligibilityResults, workforcePopulation: wpParam } = params;
  const warnings: string[] = [];

  if (records.length === 0) {
    return zeroResult([
      'Nessun record disponibile. Attivazione non calcolabile.',
      `Fonte: ${ENGINE_SOURCE}`,
    ]);
  }

  // 1. Extract per-record activation fields
  const fields = records.map(extractFields);

  // 2. Determine workforcePopulation
  let workforcePopulation = 0;
  if (typeof wpParam === 'number' && wpParam > 0) {
    workforcePopulation = wpParam;
  } else {
    const wfSignals = fields
      .map((f) => f.workforceSignal)
      .filter((v): v is number => v !== null && v > 0);
    if (wfSignals.length > 0) {
      workforcePopulation = Math.max(...wfSignals);
      warnings.push(
        `Workforce population inferita da campo record (${workforcePopulation} lavoratori). ` +
        'Per calcoli precisi di reach, fornire baseline forza lavoro esplicita.',
      );
    } else {
      workforcePopulation = 0;
      warnings.push(
        'Workforce population non disponibile. activationReach e meaningfulActivationReach ' +
        'non calcolabili (saranno 0). Fornire baseline forza lavoro per calcoli precisi di reach.',
      );
    }
  }

  const wfKnown = workforcePopulation > 0;

  // 3. Process records — aggregate by eligibility bucket
  let nonBlockedParticipants = 0;  // eligible + limited (active reach proxy)
  let eligibleParticipants   = 0;  // eligible only (meaningful activation)
  let reviewRequiredCount    = 0;
  let missingParticipantCount = 0;
  let sensitiveExcludedCount  = 0;
  let blockedCount           = 0;
  let limitedCount           = 0;

  const deptMap = new Map<string, number>();
  const siteMap = new Map<string, number>();

  let concentrationTopShare: number | null = null;
  let bottomFiftyShare: number | null      = null;
  let recurrenceCount  = 0;
  let continuityCount  = 0;
  let totalDurationHours = 0;
  let rawParticipantSum  = 0;  // for duplicate-detection heuristic

  for (let i = 0; i < records.length; i++) {
    const f          = fields[i];
    const eligibility = eligibilityResults[i];

    // Harvest concentration data from any record (first non-null wins)
    if (concentrationTopShare === null && f.concentrationTopShare !== null) {
      concentrationTopShare = f.concentrationTopShare;
    }
    if (bottomFiftyShare === null && f.bottomFiftyShare !== null) {
      bottomFiftyShare = f.bottomFiftyShare;
    }

    // Quality signals
    if (f.recurrenceSignal) recurrenceCount++;
    if (f.continuitySignal) continuityCount++;
    if (f.durationHours !== null) totalDurationHours += f.durationHours;

    // Individual-sensitive: exclude immediately, log warning once per record
    if (f.hasSensitiveSignal) {
      sensitiveExcludedCount++;
      warnings.push(
        `Record ${getRecordId(records[i])}: segnali di dati individuali sensibili rilevati. ` +
        'Escluso dall\'analisi di attivazione per privacy.',
      );
      continue;
    }

    const status = eligibility?.status ?? 'review_required';

    // Blocked by design: no activation contribution
    if (status === 'blocked') {
      blockedCount++;
      continue;
    }

    // review_required: conservative — excluded from all activation counts
    if (status === 'review_required') {
      reviewRequiredCount++;
      continue;
    }

    const pax = f.participants;

    if (pax === null || pax <= 0) {
      missingParticipantCount++;
      continue;
    }

    rawParticipantSum += pax;

    if (status === 'limited') {
      // Limited counts toward active reach ONLY — not meaningful activation
      limitedCount++;
      nonBlockedParticipants += pax;
      if (f.department) deptMap.set(f.department, (deptMap.get(f.department) ?? 0) + pax);
      if (f.site)       siteMap.set(f.site,       (siteMap.get(f.site)       ?? 0) + pax);
    } else if (status === 'eligible') {
      // Eligible counts toward both active reach and meaningful activation
      nonBlockedParticipants += pax;
      eligibleParticipants   += pax;
      if (f.department) deptMap.set(f.department, (deptMap.get(f.department) ?? 0) + pax);
      if (f.site)       siteMap.set(f.site,       (siteMap.get(f.site)       ?? 0) + pax);
    }
  }

  // 4. Cap at workforcePopulation — warn on likely double-counting
  if (wfKnown && rawParticipantSum > workforcePopulation * 1.5) {
    warnings.push(
      `Potenziale doppio conteggio rilevato: somma partecipanti nei record (${rawParticipantSum}) ` +
      `supera significativamente la forza lavoro (${workforcePopulation}). ` +
      'I totali sono limitati al massimo della forza lavoro (v0.1 conservative cap). ' +
      'Verificare se gli stessi lavoratori sono contati in più programmi.',
    );
  }

  const activeWorkers = wfKnown
    ? Math.min(nonBlockedParticipants, workforcePopulation)
    : nonBlockedParticipants;

  // Meaningful ≤ active by construction (eligible ⊆ non-blocked, both capped at wf)
  const meaningfullyActiveWorkers = wfKnown
    ? Math.min(eligibleParticipants, workforcePopulation)
    : eligibleParticipants;

  // 5. Reach metrics
  const activationReach           = wfKnown ? activeWorkers           / workforcePopulation : 0;
  const meaningfulActivationReach = wfKnown ? meaningfullyActiveWorkers / workforcePopulation : 0;
  const neverActivatedWorkers     = wfKnown ? Math.max(0, workforcePopulation - activeWorkers) : 0;

  if (!wfKnown) {
    warnings.push(
      'activationReach = 0 — valore non reale, conseguenza di workforce baseline mancante.',
    );
  }

  // 6. Concentration data warnings
  if (concentrationTopShare !== null && concentrationTopShare > PREVENT_CLEAR_TOP_CONC) {
    warnings.push(
      `Alta concentrazione attivazione: top decile genera ${Math.round(concentrationTopShare * 100)}% ` +
      'dell\'attivazione. Distribuzione equity a rischio. Safeguard CLEAR non raggiungibile con alta concentrazione.',
    );
  }
  if (bottomFiftyShare !== null && bottomFiftyShare < PREVENT_CLEAR_LOW_BOTTOM50) {
    warnings.push(
      `Bottom 50% genera solo ${Math.round(bottomFiftyShare * 100)}% dell\'attivazione. ` +
      'Concentrazione elevata nella metà inferiore della forza lavoro.',
    );
  }
  if (concentrationTopShare === null) {
    warnings.push(
      'Dati di concentrazione dell\'attivazione non disponibili (top_concentration). ' +
      'concentrationTopShare = 0 riflette assenza dato, non valore reale. ' +
      'Fornire campo top_10_share o top_12_share nel dataset.',
    );
  }
  if (bottomFiftyShare === null) {
    warnings.push(
      'Dati distribuzione bottom 50% non disponibili. ' +
      'bottomFiftyShare = 0 riflette assenza dato, non valore reale.',
    );
  }

  // 7. Department/site gap data warnings
  if (deptMap.size === 0) {
    warnings.push(
      'Dati per dipartimento non disponibili. ' +
      'Analisi gap dipartimenti non calcolabile. Aggiungere colonna "dipartimento" ai record.',
    );
  }
  if (siteMap.size === 0) {
    warnings.push(
      'Dati per sede non disponibili. Analisi gap sedi non calcolabile.',
    );
  }

  // 8. Excluded-record warnings (batched summaries)
  if (reviewRequiredCount > 0) {
    const pct = Math.round((reviewRequiredCount / records.length) * 100);
    warnings.push(
      `${reviewRequiredCount} record (${pct}%) in stato review_required esclusi dall\'attivazione. ` +
      'Revisione umana necessaria per includere nel calcolo reach.',
    );
  }
  if (missingParticipantCount > 0) {
    warnings.push(
      `${missingParticipantCount} record con dato partecipanti assente o non valido. ` +
      'Non contribuiscono ai totali di attivazione.',
    );
  }
  if (blockedCount > 0) {
    warnings.push(
      `${blockedCount} record blocked (compliance obbligatoria) esclusi dall\'attivazione. ` +
      '0 IU · 0 contributo KORA Index per design.',
    );
  }
  if (limitedCount > 0) {
    warnings.push(
      `${limitedCount} record limited (sollievo economico) conteggiati per active reach ` +
      'ma esclusi da meaningful activation. Non generano IU per design.',
    );
  }
  if (sensitiveExcludedCount > 0) {
    warnings.push(
      `${sensitiveExcludedCount} record esclusi per segnali di dati individuali sensibili.`,
    );
  }

  // 9. Activation quality signals (informational — for future Activation Quality macroblock)
  if (recurrenceCount > 0) {
    warnings.push(
      `[SEGNALE QUALITÀ] ${recurrenceCount} record con segnali di ricorrenza / frequenza. ` +
      'Indicatore di continuità attivazione.',
    );
  }
  if (continuityCount > 0) {
    warnings.push(
      `[SEGNALE QUALITÀ] ${continuityCount} record con segnali di continuità pluriennale.`,
    );
  }
  if (totalDurationHours > 0) {
    warnings.push(
      `[SEGNALE QUALITÀ] Ore/durata cumulativa rilevata nei record: ${totalDurationHours} ore.`,
    );
  }

  // 10. Safeguard status — D-21 thresholds
  const reviewRequiredRatio = records.length > 0 ? reviewRequiredCount / records.length : 0;
  const highConcentration   = concentrationTopShare !== null && concentrationTopShare > PREVENT_CLEAR_TOP_CONC;
  const lowBottom50         = bottomFiftyShare !== null && bottomFiftyShare < PREVENT_CLEAR_LOW_BOTTOM50;

  const safeguardStatus = computeSafeguardStatus(
    activationReach,
    meaningfulActivationReach,
    wfKnown,
    highConcentration,
    lowBottom50,
    reviewRequiredRatio,
  );

  warnings.push(
    `Fonte: ${ENGINE_SOURCE} | KORA-METHOD-v0.1.0 | ` +
    'calibration_status=pre_empirical_calibration | production_ready=false',
  );

  return {
    activationReach:            round4(activationReach),
    meaningfulActivationReach:  round4(meaningfulActivationReach),
    activeWorkers,
    meaningfullyActiveWorkers,
    neverActivatedWorkers,
    concentrationTopShare:      concentrationTopShare ?? 0,
    bottomFiftyShare:           bottomFiftyShare ?? 0,
    departmentGaps:             Object.fromEntries(deptMap),
    siteGaps:                   Object.fromEntries(siteMap),
    safeguardStatus,
    warnings,
  };
}

// ── Convenience wrapper ────────────────────────────────────────────────────────

export function computeActivationFromRecords(
  records: Array<RawUploadedRecord | NormalizedUEFRecord>,
  workforcePopulation?: number,
): ActivationResult {
  if (records.length === 0) {
    return zeroResult([
      'Nessun record disponibile. Attivazione non calcolabile.',
      `Fonte: ${ENGINE_SOURCE}`,
    ]);
  }
  const eligibilityResults = classifyEligibilityBatch(records);
  return computeActivation({ records, eligibilityResults, workforcePopulation });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export { ENGINE_SOURCE as ACTIVATION_ENGINE_VERSION };
export {
  SAFEGUARD_CLEAR_AR   as ACTIVATION_SAFEGUARD_CLEAR_AR,
  SAFEGUARD_CLEAR_MAR  as ACTIVATION_SAFEGUARD_CLEAR_MAR,
  SAFEGUARD_WARN_AR    as ACTIVATION_SAFEGUARD_WARN_AR,
  SAFEGUARD_WARN_MAR   as ACTIVATION_SAFEGUARD_WARN_MAR,
};
