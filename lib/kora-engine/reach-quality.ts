// lib/kora-engine/reach-quality.ts
// Reach Quality Engine v0.2 — estimates unique worker reach from aggregate participation data.
//
// Supports 5 methods in priority order:
//   1. identity_deduplication — union-find alias resolution across wid/email/nome+cognome signals
//   2. aggregate_unique — single record with explicit unique participant count (partecipanti_unici etc.)
//   3. aggregate_unique_bounded — multiple records with unique counts: conservative estimate using auFactor
//   4. bounded_estimate — conservative interval from participation counts + category/site diversity
//   5. none — data insufficient to estimate reach
//
// Privacy invariant: identity signals exist only inside the deduplication block — never returned.
// All outputs are aggregate counts. No individual key, name, or identifier is ever exposed.
//
// bounded_estimate conservative factor (cf):
//   cf = 0.25 — single category (high overlap risk)
//   cf = 0.35 — multiple categories (moderate overlap risk)
//   cf = 0.45 — multiple categories AND multiple sites (lower overlap risk)
//   cap = 0.50 (safety ceiling)
//
// aggregate_unique_bounded factor (auFactor):
//   au = 0.25 — same category (high overlap risk)
//   au = 0.35 — no category info (default)
//   au = 0.50 — distinct categories or sites (lower overlap risk)
// selectedReachForPreview = round(lb + (ub − lb) × factor)
// where lb = max single-record value, ub = min(sum, wf) if wf known, else sum.

import type {
  RawUploadedRecord,
  NormalizedUEFRecord,
  EligibilityResult,
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

// ── Aggregate unique factor ───────────────────────────────────────────────────

const AU_SINGLE_CAT = 0.25;  // same category — high overlap risk
const AU_DEFAULT    = 0.35;  // no category info — default
const AU_DISTINCT   = 0.50;  // distinct categories or sites — lower overlap risk

function selectAuFactor(categories: Set<string>, sites: Set<string>): number {
  if (categories.size > 1 || sites.size > 1) return AU_DISTINCT;
  if (categories.size === 1)                  return AU_SINGLE_CAT;
  return AU_DEFAULT;
}

// ── Union-find helpers for cross-scheme identity resolution ───────────────────
// Privacy invariant: signal strings are scoped to computeReachQuality — never returned.

function ufFind(parent: Map<string, string>, x: string): string {
  let root = x;
  while (parent.get(root) !== root) root = parent.get(root)!;
  let cur = x;
  while (cur !== root) { const next = parent.get(cur)!; parent.set(cur, root); cur = next; }
  return root;
}

function ufUnion(parent: Map<string, string>, a: string, b: string): void {
  const ra = ufFind(parent, a);
  const rb = ufFind(parent, b);
  if (ra !== rb) parent.set(ra, rb);
}

function ufUniqueRoots(parent: Map<string, string>): number {
  const roots = new Set<string>();
  for (const key of parent.keys()) roots.add(ufFind(parent, key));
  return roots.size;
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

  // ── Step 2: identity_deduplication — union-find alias resolution ─────────
  // Each record contributes all identity signals it contains (wid, email, nome+cognome).
  // Signals within the same record are unioned (same physical person).
  // Cross-record: signals are unioned only when a record carries multiple signals already
  // present from other records, enabling alias bridges without exposing identity values.
  // Privacy: all signal strings are scoped to this block — never returned in any field.
  const ufParent = new Map<string, string>();
  const schemesSeen = new Set<'wid' | 'email' | 'ns'>();
  let missingIdentityCount = 0;

  for (const f of includedFields) {
    const signals: string[] = [];
    if (f.workerId)          { signals.push(`wid:${f.workerId}`);         schemesSeen.add('wid'); }
    if (f.email)             { signals.push(`email:${f.email}`);          schemesSeen.add('email'); }
    if (f.nome && f.cognome) { signals.push(`ns:${f.nome}|${f.cognome}`); schemesSeen.add('ns'); }

    if (signals.length === 0) { missingIdentityCount++; continue; }

    for (const s of signals) { if (!ufParent.has(s)) ufParent.set(s, s); }
    for (let i = 1; i < signals.length; i++) ufUnion(ufParent, signals[0], signals[i]);
  }

  if (ufParent.size > 0) {
    const uniqueCount = ufUniqueRoots(ufParent);
    const reach = wf !== null ? Math.min(uniqueCount, wf) : uniqueCount;

    const warnings: string[] = [];
    if (schemesSeen.size > 1)
      warnings.push('Schemi identità misti rilevati: risoluzione alias applicata su record con segnali multipli.');
    if (schemesSeen.size === 1 && schemesSeen.has('ns'))
      warnings.push('Solo nome+cognome disponibile. Rischio omonimia: verificare con ID univoci.');
    if (missingIdentityCount > 0)
      warnings.push(`${missingIdentityCount} record privi di segnale identità non inclusi nella deduplication.`);

    return {
      method: 'identity_deduplication',
      lowerBound: reach,
      upperBound: reach,
      selectedReachForPreview: reach,
      overcountRisk: 'low',
      conservativeFactor: 0,
      rationale:
        `${uniqueCount} lavoratori unici (risoluzione alias union-find). ` +
        `Schemi: ${[...schemesSeen].join('+')}. ` +
        'Segnali identità usati solo per conteggio — non inclusi in nessun output.' +
        (warnings.length > 0 ? ' ' + warnings.join(' ') : ''),
    };
  }

  // ── Step 3: aggregate_unique / aggregate_unique_bounded ──────────────────
  // Single unique-count source: treat as verified reach, no cross-record overlap possible.
  // Multiple unique-count sources: apply auFactor-based bounded estimate to correct for overlap.
  const recordsWithUnique = includedFields.filter((f) => f.uniquePax !== null && f.uniquePax > 0);

  if (recordsWithUnique.length === 1) {
    const uPax = recordsWithUnique[0].uniquePax!;
    const reach = wf !== null ? Math.min(uPax, wf) : uPax;
    return {
      method: 'aggregate_unique',
      lowerBound: reach,
      upperBound: reach,
      selectedReachForPreview: reach,
      overcountRisk: 'low',
      conservativeFactor: 0,
      rationale:
        `Partecipanti unici dichiarati: ${uPax}.` +
        (wf !== null && reach < uPax ? ` Cappato a forza lavoro: ${reach}.` : '') +
        ' Fonte singola — nessuna sovrapposizione cross-record.',
    };
  }

  if (recordsWithUnique.length > 1) {
    const auCats  = new Set<string>();
    const auSites = new Set<string>();
    for (const f of recordsWithUnique) {
      if (f.category) auCats.add(f.category);
      if (f.site)     auSites.add(f.site);
    }
    const auFactor  = selectAuFactor(auCats, auSites);
    const uniqueSum = recordsWithUnique.reduce((sum, f) => sum + f.uniquePax!, 0);
    const ubRaw     = wf !== null ? Math.min(uniqueSum, wf) : uniqueSum;
    const lbRaw     = Math.max(...recordsWithUnique.map((f) => f.uniquePax!));
    const lb        = Math.min(lbRaw, ubRaw);
    const selected  = Math.round(lb + (ubRaw - lb) * auFactor);
    return {
      method: 'aggregate_unique_bounded',
      lowerBound: lb,
      upperBound: ubRaw,
      selectedReachForPreview: selected,
      overcountRisk: 'medium',
      conservativeFactor: auFactor,
      rationale:
        `${recordsWithUnique.length} record con partecipanti unici dichiarati. ` +
        `Sum grezzo: ${uniqueSum}. auFactor=${auFactor} ` +
        `(${auCats.size} categori${auCats.size === 1 ? 'a' : 'e'}, ` +
        `${auSites.size} sit${auSites.size === 1 ? 'o' : 'i'}). ` +
        `lb=${lb}, ub=${ubRaw}, reach=${selected}. ` +
        'Conteggi unici multipli potrebbero includere lavoratori sovrapposti.',
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
