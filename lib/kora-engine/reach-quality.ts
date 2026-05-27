// lib/kora-engine/reach-quality.ts
// Reach Quality Engine v0.1 — estimates unique worker reach from aggregate participation data.
//
// Supports 4 methods in priority order:
//   1. identity_deduplication — Set<string> of normalized identity keys (worker_id/email/name)
//   2. aggregate_unique — explicit unique participant field in record (partecipanti_unici etc.)
//   3. bounded_estimate — conservative interval from participation counts + category/site diversity
//   4. none — data insufficient to estimate reach
//
// Privacy invariant: identity keys are used only for Set counting — never returned in any output.
// All outputs are aggregate counts. No individual key, name, or identifier is ever exposed.
//
// bounded_estimate conservative factor:
//   cf = 0.25 — single category (high overlap risk)
//   cf = 0.35 — multiple categories (moderate overlap risk)
//   cf = 0.45 — multiple categories AND multiple sites (lower overlap risk)
//   cap = 0.50 (safety ceiling)
// selectedReachForPreview = round(lb + (ub − lb) × cf)
// where lb = max single-record pax, ub = min(gross, wf) if wf known, else gross.

import type {
  RawUploadedRecord,
  NormalizedUEFRecord,
  EligibilityResult,
  ReachMethod,
  OvercountRisk,
  ReachQualityResult,
} from './types';
import { isRawUploadedRecord } from './pillar-mapping';

// ── Field key tables ──────────────────────────────────────────────────────────

const REACH_PAX_KEYS = [
  'participants', 'partecipanti', 'fruitori', 'users', 'active_users',
  'active workers', 'active_workers',
];

const REACH_UNIQUE_PAX_KEYS = [
  'unique_participants', 'partecipanti_unici', 'lavoratori_unici', 'unique_workers',
  'partecipanti unici',
];

const REACH_CATEGORY_KEYS = [
  'categoria', 'category', 'tipo iniziativa', 'tipo evento',
];

const REACH_SITE_KEYS = [
  'sede', 'site', 'location', 'stabilimento', 'ufficio', 'filiale',
];

const REACH_WID_KEYS = [
  'worker_id', 'wid', 'id_lavoratore', 'id dipendente',
  'badge', 'matricola', 'employee_id', 'employee id',
];

const REACH_EMAIL_KEYS = [
  'email', 'email_dipendente', 'indirizzo email', 'e-mail',
];

const REACH_NOME_KEYS = [
  'nome', 'first_name', 'nome lavoratore', 'nome_dipendente',
];

const REACH_COGNOME_KEYS = [
  'cognome', 'last_name', 'surname', 'cognome_dipendente',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function nk(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function findRawValue(raw: Record<string, unknown>, keys: string[]): unknown {
  for (const [k, v] of Object.entries(raw)) {
    const normalized = nk(k);
    if (keys.some((candidate) => normalized === candidate || normalized.includes(candidate))) {
      return v;
    }
  }
  return undefined;
}

function parsePositiveInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
  const s = String(v).replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

// ── Per-record fields ─────────────────────────────────────────────────────────

interface ReachRecordFields {
  pax: number | null;
  uniquePax: number | null;
  category: string | null;
  site: string | null;
  workerId: string | null;
  email: string | null;
  nome: string | null;
  cognome: string | null;
}

function extractFromRaw(record: RawUploadedRecord): ReachRecordFields {
  const { raw } = record;
  const paxRaw      = findRawValue(raw, REACH_PAX_KEYS);
  const uPaxRaw     = findRawValue(raw, REACH_UNIQUE_PAX_KEYS);
  const catRaw      = findRawValue(raw, REACH_CATEGORY_KEYS);
  const siteRaw     = findRawValue(raw, REACH_SITE_KEYS);
  const widRaw      = findRawValue(raw, REACH_WID_KEYS);
  const emailRaw    = findRawValue(raw, REACH_EMAIL_KEYS);
  const nomeRaw     = findRawValue(raw, REACH_NOME_KEYS);
  const cognomeRaw  = findRawValue(raw, REACH_COGNOME_KEYS);

  return {
    pax:      parsePositiveInt(paxRaw),
    uniquePax: parsePositiveInt(uPaxRaw),
    category: catRaw   !== undefined ? (nk(String(catRaw))   || null) : null,
    site:     siteRaw  !== undefined ? (nk(String(siteRaw))  || null) : null,
    workerId: widRaw   !== undefined ? (nk(String(widRaw))   || null) : null,
    email:    emailRaw !== undefined ? (nk(String(emailRaw)) || null) : null,
    nome:     nomeRaw  !== undefined ? (nk(String(nomeRaw))  || null) : null,
    cognome:  cognomeRaw !== undefined ? (nk(String(cognomeRaw)) || null) : null,
  };
}

function extractFromUEF(record: NormalizedUEFRecord): ReachRecordFields {
  return {
    pax:      record.participants,
    uniquePax: null,
    category: record.category ? nk(record.category) : null,
    site:     record.site     ? nk(record.site)     : null,
    workerId: null,
    email:    null,
    nome:     null,
    cognome:  null,
  };
}

function extractReachFields(record: RawUploadedRecord | NormalizedUEFRecord): ReachRecordFields {
  try {
    return isRawUploadedRecord(record) ? extractFromRaw(record) : extractFromUEF(record);
  } catch {
    return {
      pax: null, uniquePax: null, category: null, site: null,
      workerId: null, email: null, nome: null, cognome: null,
    };
  }
}

// ── Conservative factor ───────────────────────────────────────────────────────

const CF_DEFAULT    = 0.25;  // single category — high overlap risk
const CF_MULTI_CAT  = 0.35;  // multiple categories
const CF_MULTI_SITE = 0.45;  // multiple categories AND multiple sites
const CF_CAP        = 0.50;

function selectCF(categories: Set<string>, sites: Set<string>): number {
  if (categories.size > 1 && sites.size > 1) return Math.min(CF_MULTI_SITE, CF_CAP);
  if (categories.size > 1)                   return Math.min(CF_MULTI_CAT,  CF_CAP);
  return CF_DEFAULT;
}

// ── Main function ─────────────────────────────────────────────────────────────

export function computeReachQuality(params: {
  records: Array<RawUploadedRecord | NormalizedUEFRecord>;
  eligibilityResults: EligibilityResult[];
  workforcePopulation?: number;
  meaningfulOnly?: boolean;
}): ReachQualityResult {
  const { records, eligibilityResults, workforcePopulation, meaningfulOnly = false } = params;
  const wf =
    typeof workforcePopulation === 'number' && workforcePopulation > 0
      ? workforcePopulation
      : null;

  // ── Step 1: filter to included records ────────────────────────────────────
  const includedFields: ReachRecordFields[] = [];
  for (let i = 0; i < records.length; i++) {
    const status = eligibilityResults[i]?.status ?? 'review_required';
    if (status === 'blocked' || status === 'review_required') continue;
    if (meaningfulOnly && status !== 'eligible') continue;
    includedFields.push(extractReachFields(records[i]));
  }

  if (includedFields.length === 0) {
    return {
      method: 'none',
      lowerBound: 0,
      upperBound: 0,
      selectedReachForPreview: 0,
      overcountRisk: 'unknown',
      conservativeFactor: 0,
      rationale: 'Nessun record incluso per il calcolo reach.',
    };
  }

  // ── Step 2: identity_deduplication — highest priority ────────────────────
  // Privacy invariant: identitySet keys are never returned in any output field.
  const identitySet = new Set<string>();
  for (const f of includedFields) {
    if (f.workerId) identitySet.add(`wid:${f.workerId}`);
    if (f.email)    identitySet.add(`email:${f.email}`);
    if (f.nome && f.cognome) identitySet.add(`ns:${f.nome}|${f.cognome}`);
  }
  if (identitySet.size > 0) {
    const reach = wf !== null ? Math.min(identitySet.size, wf) : identitySet.size;
    return {
      method: 'identity_deduplication',
      lowerBound: reach,
      upperBound: reach,
      selectedReachForPreview: reach,
      overcountRisk: 'low',
      conservativeFactor: 0,
      rationale:
        `${identitySet.size} lavoratori unici identificati tramite chiave identità. ` +
        'Chiavi identità usate solo per conteggio — non incluse in nessun output.',
    };
  }

  // ── Step 3: aggregate_unique — explicit deduped count ────────────────────
  const hasUnique = includedFields.some((f) => f.uniquePax !== null && f.uniquePax > 0);
  if (hasUnique) {
    const uniqueSum = includedFields.reduce(
      (sum, f) => sum + (f.uniquePax !== null && f.uniquePax > 0 ? f.uniquePax : (f.pax ?? 0)),
      0,
    );
    const reach = wf !== null ? Math.min(uniqueSum, wf) : uniqueSum;
    return {
      method: 'aggregate_unique',
      lowerBound: reach,
      upperBound: reach,
      selectedReachForPreview: reach,
      overcountRisk: 'medium',
      conservativeFactor: 0,
      rationale:
        `Partecipanti unici dichiarati dal sistema sorgente: ${uniqueSum}. ` +
        (wf !== null && reach < uniqueSum ? `Cappato a forza lavoro: ${reach}. ` : '') +
        'Sovrapposizione cross-record non eliminata.',
    };
  }

  // ── Step 4: bounded_estimate ─────────────────────────────────────────────
  const withPax = includedFields.filter((f) => f.pax !== null && f.pax > 0);

  if (withPax.length === 0) {
    return {
      method: 'none',
      lowerBound: 0,
      upperBound: 0,
      selectedReachForPreview: 0,
      overcountRisk: 'unknown',
      conservativeFactor: 0,
      rationale: 'Nessun dato partecipanti valido. Reach non calcolabile.',
    };
  }

  const categories = new Set<string>();
  const sites = new Set<string>();
  for (const f of withPax) {
    if (f.category) categories.add(f.category);
    if (f.site)     sites.add(f.site);
  }

  const cf    = selectCF(categories, sites);
  const gross = withPax.reduce((sum, f) => sum + f.pax!, 0);
  const ubRaw = wf !== null ? Math.min(gross, wf) : gross;
  const lbRaw = Math.max(...withPax.map((f) => f.pax!));
  const lb    = Math.min(lbRaw, ubRaw);  // ensure lb ≤ ub (clamp if single pax > wf)
  const ub    = ubRaw;

  const selectedReach = Math.round(lb + (ub - lb) * cf);

  const overcountRisk: OvercountRisk =
    withPax.length === 1     ? 'low'
    : categories.size > 1   ? 'medium'
    : 'high';

  return {
    method: 'bounded_estimate',
    lowerBound: lb,
    upperBound: ub,
    selectedReachForPreview: selectedReach,
    overcountRisk,
    conservativeFactor: cf,
    rationale:
      `bounded_estimate: ${withPax.length} record con partecipanti, ` +
      `${categories.size} categori${categories.size === 1 ? 'a' : 'e'}, ` +
      `${sites.size} sit${sites.size === 1 ? 'o' : 'i'}, cf=${cf}. ` +
      `lb=${lb}, ub=${ub}, reach=${selectedReach}.`,
  };
}
