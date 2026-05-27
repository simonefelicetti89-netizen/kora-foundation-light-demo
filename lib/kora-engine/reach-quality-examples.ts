// lib/kora-engine/reach-quality-examples.ts
// 26 reference scenarios for computeReachQuality v0.2.
// Covers all 5 methods, cf progression (0.25→0.35→0.45), auFactor (0.25→0.35→0.50),
// workforce caps, union-find identity resolution, aggregate_unique_bounded, and edge cases.
// Use with runReachQualityExamples() for automated verification.

import type {
  RawUploadedRecord,
  EligibilityResult,
  ReachMethod,
  OvercountRisk,
} from './types';
import { computeReachQuality } from './reach-quality';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ReachQualityScenario {
  id: string;
  title: string;
  records: RawUploadedRecord[];
  eligibilityStatuses: Array<'eligible' | 'limited' | 'blocked' | 'review_required'>;
  workforcePopulation?: number;
  meaningfulOnly?: boolean;
  expectedMethod: ReachMethod;
  expectedSelectedReach: { min: number; max: number };
  expectedOvercountRisk?: OvercountRisk;
  doctrineNote: string;
}

export interface ReachQualityExampleResult {
  id: string;
  title: string;
  passed: boolean;
  methodMatch: boolean;
  reachMatch: boolean;
  overcountRiskMatch: boolean;
  actualMethod: ReachMethod;
  actualReach: number;
  actualRisk: OvercountRisk;
  failures: string[];
  failureReason: string | null;
}

export interface ReachQualityExampleSummary {
  total: number;
  passed: number;
  failed: number;
  failedIds: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRaw(
  id: string,
  raw: Record<string, unknown>,
): RawUploadedRecord {
  return {
    recordId: id,
    batchId: 'rq_examples_v01',
    raw,
    rowIndex: parseInt(id.split('-').pop() ?? '0', 10),
    detectedRecordType: 'welfare_program',
  };
}

function makeEligibility(
  id: string,
  status: 'eligible' | 'limited' | 'blocked' | 'review_required',
): EligibilityResult {
  return {
    recordId: id,
    status,
    reason: `rq_example_${status}`,
    doctrineReference: 'rq_examples',
    confidence: 0.9,
    impactTreatment: status === 'eligible' ? 'generates_iu' : 'excluded',
    budgetTreatmentSuggestion: 'include_in_bti',
    reviewRequired: status === 'review_required',
  };
}

function inRange(value: number, band: { min: number; max: number }): boolean {
  return value >= band.min && value <= band.max;
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

// rq01 — Single eligible, pax ≤ wf → lb=ub=pax, reach=pax.
const RQ01: ReachQualityScenario = {
  id: 'rq01_single_eligible',
  title: 'Single record, pax=50, wf=100 — reach=50',
  records: [makeRaw('rq01-r01', { 'Categoria': 'upskilling', 'Partecipanti': '50' })],
  eligibilityStatuses: ['eligible'],
  workforcePopulation: 100,
  expectedMethod: 'bounded_estimate',
  expectedSelectedReach: { min: 49, max: 51 },
  expectedOvercountRisk: 'low',
  doctrineNote: 'lb=ub=50. cf irrelevant (lb=ub). reach=50. overcountRisk=low (1 record).',
};

// rq02 — Single eligible, pax > wf → clamped to wf.
const RQ02: ReachQualityScenario = {
  id: 'rq02_single_overflow',
  title: 'Single record pax=150 > wf=100 — clamped to 100',
  records: [makeRaw('rq02-r01', { 'Categoria': 'upskilling', 'Partecipanti': '150' })],
  eligibilityStatuses: ['eligible'],
  workforcePopulation: 100,
  expectedMethod: 'bounded_estimate',
  expectedSelectedReach: { min: 99, max: 101 },
  expectedOvercountRisk: 'low',
  doctrineNote: 'lb=min(150,100)=100, ub=100. reach=100. Pax>wf capped by ub.',
};

// rq03 — Two eligible, SAME category → cf=0.25.
const RQ03: ReachQualityScenario = {
  id: 'rq03_same_category_cf025',
  title: 'Due record, stessa categoria upskilling — cf=0.25',
  records: [
    makeRaw('rq03-r01', { 'Categoria': 'upskilling', 'Partecipanti': '80' }),
    makeRaw('rq03-r02', { 'Categoria': 'upskilling', 'Partecipanti': '45' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  // no workforce
  expectedMethod: 'bounded_estimate',
  // lb=80, ub=125, cf=0.25, reach=round(80+45*0.25)=round(91.25)=91
  expectedSelectedReach: { min: 90, max: 92 },
  expectedOvercountRisk: 'high',
  doctrineNote: '1 categoria, no siti → cf=0.25. lb=80, ub=125, reach=round(80+11.25)=91. overcountRisk=high.',
};

// rq04 — Two eligible, DIFFERENT categories → cf=0.35.
const RQ04: ReachQualityScenario = {
  id: 'rq04_diff_categories_cf035',
  title: 'Due record, categorie diverse — cf=0.35',
  records: [
    makeRaw('rq04-r01', { 'Categoria': 'upskilling', 'Partecipanti': '70' }),
    makeRaw('rq04-r02', { 'Categoria': 'mentoring', 'Partecipanti': '30' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  workforcePopulation: 200,
  expectedMethod: 'bounded_estimate',
  // lb=70, ub=min(100,200)=100, cf=0.35, reach=round(70+30*0.35)=round(70+10.5)=round(80.5)=81
  expectedSelectedReach: { min: 80, max: 82 },
  expectedOvercountRisk: 'medium',
  doctrineNote: '2 categorie, no siti → cf=0.35. lb=70, ub=100, reach=round(80.5)=81. overcountRisk=medium.',
};

// rq05 — Three eligible, different categories, SAME site → cf=0.35 (multiple cats but only 1 site).
const RQ05: ReachQualityScenario = {
  id: 'rq05_diff_cats_same_site_cf035',
  title: 'Tre record, categorie diverse, stesso sito — cf=0.35',
  records: [
    makeRaw('rq05-r01', { 'Categoria': 'upskilling', 'Sede': 'hq_milano', 'Partecipanti': '60' }),
    makeRaw('rq05-r02', { 'Categoria': 'mentoring',  'Sede': 'hq_milano', 'Partecipanti': '40' }),
    makeRaw('rq05-r03', { 'Categoria': 'asilo nido', 'Sede': 'hq_milano', 'Partecipanti': '20' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible', 'eligible'],
  workforcePopulation: 200,
  expectedMethod: 'bounded_estimate',
  // 3 cats, 1 site → cf=0.35. lb=60, ub=min(120,200)=120, reach=round(60+60*0.35)=round(60+21)=81
  expectedSelectedReach: { min: 80, max: 82 },
  expectedOvercountRisk: 'medium',
  doctrineNote: '3 categorie ma solo 1 sito → cf=0.35 (non 0.45). lb=60, ub=120, reach=81.',
};

// rq06 — Three eligible, different categories AND different sites → cf=0.45.
const RQ06: ReachQualityScenario = {
  id: 'rq06_diff_cats_diff_sites_cf045',
  title: 'Tre record, categorie diverse E siti diversi — cf=0.45',
  records: [
    makeRaw('rq06-r01', { 'Categoria': 'upskilling', 'Sede': 'hq_milano',  'Partecipanti': '60' }),
    makeRaw('rq06-r02', { 'Categoria': 'mentoring',  'Sede': 'plant_bg',   'Partecipanti': '40' }),
    makeRaw('rq06-r03', { 'Categoria': 'asilo nido', 'Sede': 'remoto',     'Partecipanti': '20' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible', 'eligible'],
  workforcePopulation: 200,
  expectedMethod: 'bounded_estimate',
  // 3 cats + 3 siti → cf=0.45. lb=60, ub=min(120,200)=120, reach=round(60+60*0.45)=round(60+27)=87
  expectedSelectedReach: { min: 86, max: 88 },
  expectedOvercountRisk: 'medium',
  doctrineNote: '3 categorie + 3 siti → cf=0.45. lb=60, ub=120, reach=87.',
};

// rq07 — Records with worker_id fields → identity_deduplication (2 unique workers).
const RQ07: ReachQualityScenario = {
  id: 'rq07_identity_dedup_2unique',
  title: 'worker_id presenti — identity_deduplication, 2 lavoratori unici',
  records: [
    makeRaw('rq07-r01', { 'worker_id': 'w001', 'Categoria': 'upskilling', 'Partecipanti': '1' }),
    makeRaw('rq07-r02', { 'worker_id': 'w002', 'Categoria': 'mentoring',  'Partecipanti': '1' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  workforcePopulation: 50,
  expectedMethod: 'identity_deduplication',
  expectedSelectedReach: { min: 1, max: 3 },
  expectedOvercountRisk: 'low',
  doctrineNote: 'worker_id w001+w002 → union-find identity grouping resolves the distinct workers without exposing identity values. reach=2.',
};

// rq08 — Two records each with partecipanti_unici, distinct categories → aggregate_unique_bounded, auFactor=0.50.
const RQ08: ReachQualityScenario = {
  id: 'rq08_aggregate_unique_bounded',
  title: 'partecipanti_unici su record multipli — aggregate_unique_bounded, auFactor=0.50',
  records: [
    makeRaw('rq08-r01', { 'Categoria': 'upskilling', 'Partecipanti': '40', 'partecipanti_unici': '30' }),
    makeRaw('rq08-r02', { 'Categoria': 'mentoring',  'Partecipanti': '30', 'partecipanti_unici': '20' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  workforcePopulation: 100,
  expectedMethod: 'aggregate_unique_bounded',
  // lb=max(30,20)=30, ub=min(50,100)=50, auFactor=0.50 (distinct categories: upskilling+mentoring)
  // selected=round(30+(50-30)×0.50)=round(30+10)=40
  expectedSelectedReach: { min: 38, max: 42 },
  expectedOvercountRisk: 'medium',
  doctrineNote: 'unique_pax multipli: lb=max(30,20)=30, ub=min(50,100)=50. Categorie distinte → auFactor=0.50. reach=round(30+10)=40.',
};

// rq09 — All records blocked → none method, reach=0.
const RQ09: ReachQualityScenario = {
  id: 'rq09_all_blocked',
  title: 'Tutti i record blocked — method=none, reach=0',
  records: [
    makeRaw('rq09-r01', { 'Categoria': 'sicurezza obbligatoria', 'Partecipanti': '100' }),
    makeRaw('rq09-r02', { 'Categoria': 'antincendio obbligatorio', 'Partecipanti': '80' }),
  ],
  eligibilityStatuses: ['blocked', 'blocked'],
  workforcePopulation: 250,
  expectedMethod: 'none',
  expectedSelectedReach: { min: 0, max: 0 },
  expectedOvercountRisk: 'unknown',
  doctrineNote: 'Nessun record incluso (tutti blocked). method=none, reach=0.',
};

// rq10 — Large gross capped by wf (gross=350 > wf=100). cf=0.25 (same category).
const RQ10: ReachQualityScenario = {
  id: 'rq10_gross_capped_by_wf',
  title: 'Gross=350 cappato da wf=100 — reach=100',
  records: [
    makeRaw('rq10-r01', { 'Categoria': 'upskilling', 'Partecipanti': '200' }),
    makeRaw('rq10-r02', { 'Categoria': 'upskilling', 'Partecipanti': '100' }),
    makeRaw('rq10-r03', { 'Categoria': 'upskilling', 'Partecipanti': '50'  }),
  ],
  eligibilityStatuses: ['eligible', 'eligible', 'eligible'],
  workforcePopulation: 100,
  expectedMethod: 'bounded_estimate',
  // lb_raw=200, ub=min(350,100)=100, lb=min(200,100)=100, reach=round(100+0*cf)=100
  expectedSelectedReach: { min: 99, max: 101 },
  expectedOvercountRisk: 'high',
  doctrineNote: '1 categoria. lb=200 > ub=100 → clamp lb=100. reach=100. Forza lavoro cap attivo.',
};

// rq11 — meaningfulOnly=false: limited+eligible counted. cf=0.35 (3 categories).
const RQ11: ReachQualityScenario = {
  id: 'rq11_meaningful_false_mixed',
  title: 'meaningfulOnly=false — limited+eligible inclusi, cf=0.35',
  records: [
    makeRaw('rq11-r01', { 'Categoria': 'buoni pasto',       'Partecipanti': '60' }),
    makeRaw('rq11-r02', { 'Categoria': 'ticket restaurant', 'Partecipanti': '40' }),
    makeRaw('rq11-r03', { 'Categoria': 'upskilling',        'Partecipanti': '30' }),
  ],
  eligibilityStatuses: ['limited', 'limited', 'eligible'],
  workforcePopulation: 200,
  meaningfulOnly: false,
  expectedMethod: 'bounded_estimate',
  // 3 cats, no siti → cf=0.35. pax: 60,40,30. lb=60, ub=min(130,200)=130.
  // reach=round(60+70*0.35)=round(60+24.5)=round(84.5)=85
  expectedSelectedReach: { min: 84, max: 86 },
  expectedOvercountRisk: 'medium',
  doctrineNote: 'limited+eligible: 3 record. cf=0.35. lb=60, ub=130, reach=round(84.5)=85.',
};

// rq12 — meaningfulOnly=true: only eligible counted. Single record → lb=ub=30.
const RQ12: ReachQualityScenario = {
  id: 'rq12_meaningful_true_eligible_only',
  title: 'meaningfulOnly=true — solo eligible, limited esclusi',
  records: [
    makeRaw('rq12-r01', { 'Categoria': 'buoni pasto',       'Partecipanti': '60' }),
    makeRaw('rq12-r02', { 'Categoria': 'ticket restaurant', 'Partecipanti': '40' }),
    makeRaw('rq12-r03', { 'Categoria': 'upskilling',        'Partecipanti': '30' }),
  ],
  eligibilityStatuses: ['limited', 'limited', 'eligible'],
  workforcePopulation: 200,
  meaningfulOnly: true,
  expectedMethod: 'bounded_estimate',
  // only eligible (30), single record → lb=ub=30, reach=30
  expectedSelectedReach: { min: 29, max: 31 },
  expectedOvercountRisk: 'low',
  doctrineNote: 'meaningfulOnly=true: solo 1 eligible record (30). lb=ub=30, reach=30.',
};

// rq13 — Identity deduplication with overlap (same worker_id in two records → 1 unique).
const RQ13: ReachQualityScenario = {
  id: 'rq13_identity_dedup_overlap',
  title: 'worker_id ripetuto — dedup identifica 2 unici su 3 record',
  records: [
    makeRaw('rq13-r01', { 'worker_id': 'w001', 'Categoria': 'upskilling', 'Partecipanti': '1' }),
    makeRaw('rq13-r02', { 'worker_id': 'w001', 'Categoria': 'mentoring',  'Partecipanti': '1' }),
    makeRaw('rq13-r03', { 'worker_id': 'w002', 'Categoria': 'asilo nido', 'Partecipanti': '1' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible', 'eligible'],
  workforcePopulation: 50,
  expectedMethod: 'identity_deduplication',
  // Set: {wid:w001, wid:w002} → size=2
  expectedSelectedReach: { min: 1, max: 3 },
  expectedOvercountRisk: 'low',
  doctrineNote: 'w001 appare 2 volte → union-find identity grouping resolves the distinct workers without exposing identity values. reach=2.',
};

// rq14 — All records have null participants → none method.
const RQ14: ReachQualityScenario = {
  id: 'rq14_no_pax_data',
  title: 'Nessun dato partecipanti — method=none',
  records: [
    makeRaw('rq14-r01', { 'Categoria': 'upskilling' }),
    makeRaw('rq14-r02', { 'Categoria': 'mentoring'  }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  workforcePopulation: 250,
  expectedMethod: 'none',
  expectedSelectedReach: { min: 0, max: 0 },
  expectedOvercountRisk: 'unknown',
  doctrineNote: 'Nessun campo partecipanti valido. bounded_estimate non applicabile. method=none, reach=0.',
};

// rq15 — Single eligible, no wf → no cap applied.
const RQ15: ReachQualityScenario = {
  id: 'rq15_single_no_workforce',
  title: 'Single record, no workforce — reach=pax, nessun cap',
  records: [makeRaw('rq15-r01', { 'Categoria': 'upskilling', 'Partecipanti': '75' })],
  eligibilityStatuses: ['eligible'],
  // workforcePopulation: omitted
  expectedMethod: 'bounded_estimate',
  expectedSelectedReach: { min: 74, max: 76 },
  expectedOvercountRisk: 'low',
  doctrineNote: 'No workforce → ub=gross=75. lb=ub=75, reach=75. Nessun cap applicato.',
};

// rq16 — Four eligible, same category → cf=0.25. Tests single-category multi-record conservative behavior.
const RQ16: ReachQualityScenario = {
  id: 'rq16_single_cat_multi_record',
  title: 'Quattro record stessa categoria — cf=0.25 conservativo',
  records: [
    makeRaw('rq16-r01', { 'Categoria': 'wellbeing volontario', 'Partecipanti': '100' }),
    makeRaw('rq16-r02', { 'Categoria': 'wellbeing volontario', 'Partecipanti': '80'  }),
    makeRaw('rq16-r03', { 'Categoria': 'wellbeing volontario', 'Partecipanti': '60'  }),
    makeRaw('rq16-r04', { 'Categoria': 'wellbeing volontario', 'Partecipanti': '40'  }),
  ],
  eligibilityStatuses: ['eligible', 'eligible', 'eligible', 'eligible'],
  workforcePopulation: 300,
  expectedMethod: 'bounded_estimate',
  // 1 categoria, no siti → cf=0.25. lb=100, ub=min(280,300)=280, reach=round(100+180*0.25)=round(100+45)=145
  expectedSelectedReach: { min: 144, max: 146 },
  expectedOvercountRisk: 'high',
  doctrineNote: '1 categoria → cf=0.25. lb=100, ub=280, reach=round(100+45)=145. overcountRisk=high.',
};

// rq17 — Single category, multiple sites → cf=0.25 (site diversity alone does NOT increase cf).
const RQ17: ReachQualityScenario = {
  id: 'rq17_single_cat_multi_site',
  title: '1 categoria + 2 siti — cf=0.25 (siti senza multi-cat non aumentano cf)',
  records: [
    makeRaw('rq17-r01', { 'Categoria': 'upskilling', 'Sede': 'milano', 'Partecipanti': '60' }),
    makeRaw('rq17-r02', { 'Categoria': 'upskilling', 'Sede': 'roma',   'Partecipanti': '40' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  workforcePopulation: 200,
  expectedMethod: 'bounded_estimate',
  // 1 cat, 2 siti → cf=0.25 (multi-site senza multi-cat → default cf). lb=60, ub=100, reach=round(60+40*0.25)=round(60+10)=70
  expectedSelectedReach: { min: 69, max: 71 },
  expectedOvercountRisk: 'high',
  doctrineNote: 'cf=0.45 richiede multi-cat E multi-site. 1 categoria → cf=0.25. lb=60, ub=100, reach=70.',
};

// rq18 — Two different categories, no site field detected → cf=0.35 (not 0.45).
const RQ18: ReachQualityScenario = {
  id: 'rq18_diff_cats_no_sites_cf035',
  title: 'Due categorie diverse, nessun sito rilevato — cf=0.35',
  records: [
    makeRaw('rq18-r01', { 'Categoria': 'upskilling', 'Partecipanti': '60' }),
    makeRaw('rq18-r02', { 'Categoria': 'mentoring',  'Partecipanti': '40' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  workforcePopulation: 200,
  expectedMethod: 'bounded_estimate',
  // 2 cats, 0 siti → cf=0.35. lb=60, ub=min(100,200)=100, reach=round(60+40*0.35)=round(60+14)=74
  expectedSelectedReach: { min: 73, max: 75 },
  expectedOvercountRisk: 'medium',
  doctrineNote: '2 categorie, no siti → cf=0.35 (non 0.45). lb=60, ub=100, reach=74.',
};

// rq19 — wid + email on same record → union-find merges to 1 group, reach=1.
const RQ19: ReachQualityScenario = {
  id: 'rq19_alias_same_record_wid_email',
  title: 'worker_id + email nello stesso record — 1 gruppo, reach=1',
  records: [
    makeRaw('rq19-r01', { 'worker_id': 'w001', 'email': 'mario@co.it', 'Categoria': 'upskilling', 'Partecipanti': '1' }),
  ],
  eligibilityStatuses: ['eligible'],
  workforcePopulation: 50,
  expectedMethod: 'identity_deduplication',
  // wid:w001 + email:mario@co.it → ufUnion → 1 root → reach=1
  expectedSelectedReach: { min: 1, max: 1 },
  expectedOvercountRisk: 'low',
  doctrineNote: 'wid:w001 + email:mario@co.it stesso record → union-find unisce in 1 gruppo. reach=1.',
};

// rq20 — Two workers with different identity schemes on separate records → 2 groups.
const RQ20: ReachQualityScenario = {
  id: 'rq20_two_workers_mixed_schemes',
  title: 'Due lavoratori con schemi diversi su record separati — 2 gruppi',
  records: [
    makeRaw('rq20-r01', { 'worker_id': 'w001', 'Categoria': 'upskilling', 'Partecipanti': '1' }),
    makeRaw('rq20-r02', { 'email': 'bianchi@co.it', 'Categoria': 'mentoring', 'Partecipanti': '1' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  workforcePopulation: 50,
  expectedMethod: 'identity_deduplication',
  // wid:w001 on r01, email:bianchi on r02 — no record links them → 2 separate groups
  expectedSelectedReach: { min: 1, max: 3 },
  expectedOvercountRisk: 'low',
  doctrineNote: 'wid:w001 e email:bianchi su record separati → nessun link → 2 gruppi distinti. reach=2.',
};

// rq21 — Partial identity: 2 records with wid, 1 missing any signal → warn on missing, reach from 2.
const RQ21: ReachQualityScenario = {
  id: 'rq21_partial_identity_missing',
  title: 'Identità parziale — 2 wid + 1 record senza segnale',
  records: [
    makeRaw('rq21-r01', { 'worker_id': 'w001', 'Categoria': 'upskilling',  'Partecipanti': '1' }),
    makeRaw('rq21-r02', { 'worker_id': 'w002', 'Categoria': 'mentoring',   'Partecipanti': '1' }),
    makeRaw('rq21-r03', { 'Categoria': 'volontariato', 'Partecipanti': '30' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible', 'eligible'],
  workforcePopulation: 100,
  expectedMethod: 'identity_deduplication',
  // r01+r02 → 2 groups; r03 no signal → missingIdentityCount=1, warning in rationale
  expectedSelectedReach: { min: 1, max: 3 },
  expectedOvercountRisk: 'low',
  doctrineNote: 'r01/r02 con wid → 2 gruppi. r03 senza segnale → warning missingIdentityCount=1. reach=2.',
};

// rq22 — Same nome+cognome repeated in two records → 1 group (deduped).
const RQ22: ReachQualityScenario = {
  id: 'rq22_name_dedup_repeated',
  title: 'Nome+cognome ripetuto in due record — 1 lavoratore unico',
  records: [
    makeRaw('rq22-r01', { 'nome': 'Mario', 'cognome': 'Rossi', 'Categoria': 'upskilling', 'Partecipanti': '1' }),
    makeRaw('rq22-r02', { 'nome': 'Mario', 'cognome': 'Rossi', 'Categoria': 'mentoring',  'Partecipanti': '1' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  workforcePopulation: 50,
  expectedMethod: 'identity_deduplication',
  // ns:mario|rossi appears twice → same node → 1 root → reach=1
  expectedSelectedReach: { min: 1, max: 1 },
  expectedOvercountRisk: 'low',
  doctrineNote: 'ns:mario|rossi in entrambi i record → stesso nodo union-find → 1 gruppo. reach=1.',
};

// rq23 — Only nome+cognome as identity scheme → name-fallback warning in rationale, reach=2.
const RQ23: ReachQualityScenario = {
  id: 'rq23_name_only_fallback_warning',
  title: 'Solo nome+cognome come identità — warning fallback, reach=2',
  records: [
    makeRaw('rq23-r01', { 'nome': 'Mario', 'cognome': 'Rossi',   'Categoria': 'upskilling', 'Partecipanti': '1' }),
    makeRaw('rq23-r02', { 'nome': 'Luigi', 'cognome': 'Bianchi', 'Categoria': 'mentoring',  'Partecipanti': '1' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  workforcePopulation: 50,
  expectedMethod: 'identity_deduplication',
  // ns:mario|rossi + ns:luigi|bianchi → 2 distinct groups; schemesSeen={'ns'} → name-only warning
  expectedSelectedReach: { min: 1, max: 3 },
  expectedOvercountRisk: 'low',
  doctrineNote: '2 gruppi nome+cognome distinti. Solo schema "ns" rilevato → warning omonimia nel rationale.',
};

// rq24 — Multiple aggregate unique, SAME category → auFactor=0.25 (most conservative).
const RQ24: ReachQualityScenario = {
  id: 'rq24_aggregate_unique_same_cat',
  title: 'Unique multipli stessa categoria — auFactor=0.25 conservativo',
  records: [
    makeRaw('rq24-r01', { 'Categoria': 'upskilling', 'Partecipanti': '40', 'partecipanti_unici': '30' }),
    makeRaw('rq24-r02', { 'Categoria': 'upskilling', 'Partecipanti': '30', 'partecipanti_unici': '20' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  workforcePopulation: 100,
  expectedMethod: 'aggregate_unique_bounded',
  // lb=max(30,20)=30, ub=min(50,100)=50, auFactor=0.25 (single category)
  // selected=round(30+(50-30)×0.25)=round(30+5)=35
  expectedSelectedReach: { min: 34, max: 36 },
  expectedOvercountRisk: 'medium',
  doctrineNote: 'Stessa categoria (upskilling) → auFactor=0.25. lb=30, ub=50, reach=round(30+5)=35.',
};

// rq25 — Multiple aggregate unique, distinct categories + sites → auFactor=0.50 (less conservative).
const RQ25: ReachQualityScenario = {
  id: 'rq25_aggregate_unique_distinct',
  title: 'Unique multipli categorie/siti distinti — auFactor=0.50',
  records: [
    makeRaw('rq25-r01', { 'Categoria': 'upskilling', 'Sede': 'hq_milano', 'Partecipanti': '40', 'partecipanti_unici': '30' }),
    makeRaw('rq25-r02', { 'Categoria': 'mentoring',  'Sede': 'plant_bg',  'Partecipanti': '25', 'partecipanti_unici': '20' }),
  ],
  eligibilityStatuses: ['eligible', 'eligible'],
  workforcePopulation: 100,
  expectedMethod: 'aggregate_unique_bounded',
  // lb=max(30,20)=30, ub=min(50,100)=50, auFactor=0.50 (distinct categories)
  // selected=round(30+(50-30)×0.50)=round(30+10)=40
  expectedSelectedReach: { min: 39, max: 41 },
  expectedOvercountRisk: 'medium',
  doctrineNote: 'Categorie distinte (upskilling+mentoring) + siti distinti → auFactor=0.50. lb=30, ub=50, reach=40.',
};

// rq26 — Single record with partecipanti_unici → aggregate_unique, overcountRisk=low.
const RQ26: ReachQualityScenario = {
  id: 'rq26_single_aggregate_unique',
  title: 'Singolo record con partecipanti_unici — aggregate_unique, overcountRisk=low',
  records: [
    makeRaw('rq26-r01', { 'Categoria': 'benessere', 'Partecipanti': '60', 'partecipanti_unici': '45' }),
  ],
  eligibilityStatuses: ['eligible'],
  workforcePopulation: 100,
  expectedMethod: 'aggregate_unique',
  // single source: reach=min(45,100)=45
  expectedSelectedReach: { min: 44, max: 46 },
  expectedOvercountRisk: 'low',
  doctrineNote: 'Fonte singola: partecipanti_unici=45. Nessuna sovrapposizione cross-record. reach=45, overcountRisk=low.',
};

// ── All scenarios ─────────────────────────────────────────────────────────────

export const REACH_QUALITY_SCENARIOS: ReachQualityScenario[] = [
  RQ01, RQ02, RQ03, RQ04, RQ05, RQ06,
  RQ07, RQ08, RQ09, RQ10, RQ11, RQ12,
  RQ13, RQ14, RQ15, RQ16, RQ17, RQ18,
  RQ19, RQ20, RQ21, RQ22, RQ23, RQ24, RQ25, RQ26,
];

// ── Runner ────────────────────────────────────────────────────────────────────

export function runReachQualityExamples(): ReachQualityExampleResult[] {
  return REACH_QUALITY_SCENARIOS.map((scenario) => {
    const eligibilityResults: EligibilityResult[] = scenario.records.map((r, i) =>
      makeEligibility(r.recordId, scenario.eligibilityStatuses[i]),
    );

    const actual = computeReachQuality({
      records: scenario.records,
      eligibilityResults,
      workforcePopulation: scenario.workforcePopulation,
      meaningfulOnly: scenario.meaningfulOnly ?? false,
    });

    const failures: string[] = [];

    const methodMatch = actual.method === scenario.expectedMethod;
    if (!methodMatch)
      failures.push(
        `method: expected ${scenario.expectedMethod}, got ${actual.method}`,
      );

    const reachMatch = inRange(actual.selectedReachForPreview, scenario.expectedSelectedReach);
    if (!reachMatch)
      failures.push(
        `selectedReachForPreview: expected ${JSON.stringify(scenario.expectedSelectedReach)}, got ${actual.selectedReachForPreview}`,
      );

    const overcountRiskMatch =
      scenario.expectedOvercountRisk === undefined ||
      actual.overcountRisk === scenario.expectedOvercountRisk;
    if (!overcountRiskMatch)
      failures.push(
        `overcountRisk: expected ${scenario.expectedOvercountRisk}, got ${actual.overcountRisk}`,
      );

    return {
      id: scenario.id,
      title: scenario.title,
      passed: failures.length === 0,
      methodMatch,
      reachMatch,
      overcountRiskMatch,
      actualMethod: actual.method,
      actualReach: actual.selectedReachForPreview,
      actualRisk: actual.overcountRisk,
      failures,
      failureReason: failures.length > 0 ? failures.join(' | ') : null,
    };
  });
}

export function summarizeReachQualityExamples(
  results: ReachQualityExampleResult[],
): ReachQualityExampleSummary {
  const failed = results.filter((r) => !r.passed);
  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: failed.length,
    failedIds: failed.map((r) => r.id),
  };
}
