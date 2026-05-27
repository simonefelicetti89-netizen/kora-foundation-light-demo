// lib/kora-engine/activation-engine-examples.ts
// 20 reference scenarios for the Activation Engine v0.1.
// Covers all eligibility buckets, safeguard transitions, gap detection,
// concentration prevention, and edge cases (zero workforce, duplicates, sensitive data).
// Use with runActivationExamples() for automated verification.

import type { RawUploadedRecord, ActivationResult } from './types';
import { computeActivationFromRecords } from './activation-engine';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ActivationScenario {
  id: string;
  title: string;
  inputRecords: RawUploadedRecord[];
  workforcePopulation?: number;
  expectedActivationReach: { min: number; max: number };
  expectedMeaningfulReach: { min: number; max: number };
  expectedActiveWorkers: { min: number; max: number };
  expectedMeaningfulWorkers: { min: number; max: number };
  // Single safeguard value or an acceptable set (when multiple outcomes are valid)
  expectedSafeguard: 'CLEAR' | 'WARNING' | 'FLAGGED' | ('CLEAR' | 'WARNING' | 'FLAGGED')[];
  expectedWarningsContain: string[];
  doctrineNote: string;
}

export interface ActivationExampleResult {
  id: string;
  title: string;
  passed: boolean;
  activationReachMatch: boolean;
  meaningfulReachMatch: boolean;
  activeWorkersMatch: boolean;
  meaningfulWorkersMatch: boolean;
  safeguardMatch: boolean;
  warningsMatch: boolean;
  actualResult: ActivationResult;
  failures: string[];
  failureReason: string | null;
}

export interface ActivationExampleSummary {
  total: number;
  passed: number;
  failed: number;
  failedIds: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRaw(
  id: string,
  rowIndex: number,
  raw: Record<string, unknown>,
  detectedRecordType: RawUploadedRecord['detectedRecordType'] = 'welfare_program',
): RawUploadedRecord {
  return { recordId: id, batchId: 'activation_examples_v01', raw, rowIndex, detectedRecordType };
}

function inRange(value: number, band: { min: number; max: number }): boolean {
  return value >= band.min && value <= band.max;
}

// ── Scenario 1 — Strong activation (CLEAR) ───────────────────────────────────
// 3 eligible programs with 160 total participants. AR=MAR=0.64. Safeguard CLEAR.

const SCENARIO_01: ActivationScenario = {
  id: 'sc01_strong_activation',
  title: 'Attivazione forte — 3 programmi eligible, 160 partecipanti',
  inputRecords: [
    makeRaw('s01-r01', 0, {
      'Nome Iniziativa': 'Upskilling Digital Academy',
      'Categoria': 'upskilling',
      'Partecipanti': '80',
    }),
    makeRaw('s01-r02', 1, {
      'Nome Iniziativa': 'Mental Health Platform',
      'Categoria': 'supporto psicologico',
      'Partecipanti': '50',
    }),
    makeRaw('s01-r03', 2, {
      'Nome Iniziativa': 'Volontariato Aziendale',
      'Categoria': 'volontariato aziendale',
      'Partecipanti': '30',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.41, max: 0.45 },
  expectedMeaningfulReach:  { min: 0.41, max: 0.45 },
  expectedActiveWorkers:    { min: 106, max: 110 },
  expectedMeaningfulWorkers: { min: 106, max: 110 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: 'bounded_estimate: 3 categorie, no siti → cf=0.35. lb=80, ub=160, reach=108. AR=MAR=0.432 ≥ 0.40 AND ≥ 0.30 → CLEAR.',
};

// ── Scenario 2 — Weak activation (FLAGGED) ───────────────────────────────────
// 1 eligible program, only 40 participants. AR=MAR=0.16 < 0.20 → FLAGGED.

const SCENARIO_02: ActivationScenario = {
  id: 'sc02_weak_activation',
  title: 'Attivazione debole — AR sotto soglia FLAGGED',
  inputRecords: [
    makeRaw('s02-r01', 0, {
      'Nome Iniziativa': 'Programma Benessere',
      'Categoria': 'wellbeing volontario',
      'Partecipanti': '40',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.14, max: 0.18 },
  expectedMeaningfulReach:  { min: 0.14, max: 0.18 },
  expectedActiveWorkers:    { min: 38, max: 42 },
  expectedMeaningfulWorkers: { min: 38, max: 42 },
  expectedSafeguard: 'FLAGGED',
  expectedWarningsContain: [],
  doctrineNote: 'AR=MAR=0.16 < 0.20 → FLAGGED. Attivazione gravemente insufficiente.',
};

// ── Scenario 3 — Relief-heavy company (WARNING) ───────────────────────────────
// Large meal voucher + limited benefits, only 40 eligible workers.
// Active reach high, meaningful reach low → WARNING.

const SCENARIO_03: ActivationScenario = {
  id: 'sc03_relief_heavy',
  title: 'Budget prevalentemente sollievo economico — MAR basso, reach alto',
  inputRecords: [
    makeRaw('s03-r01', 0, {
      'Nome Iniziativa': 'Buoni Pasto Mensili',
      'Categoria': 'buoni pasto',
      'Partecipanti': '120',
    }),
    makeRaw('s03-r02', 1, {
      'Nome Iniziativa': 'Upskilling Data Literacy',
      'Categoria': 'upskilling',
      'Partecipanti': '40',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.51, max: 0.55 },
  expectedMeaningfulReach:  { min: 0.14, max: 0.18 },
  expectedActiveWorkers:    { min: 132, max: 136 },
  expectedMeaningfulWorkers: { min: 38, max: 42 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['limited', 'sollievo economico'],
  doctrineNote: 'bounded_estimate active (2 cats, cf=0.35): lb=120, ub=160, reach=134. Meaningful: 1 eligible (40). MAR=0.16 < 0.30 → WARNING.',
};

// ── Scenario 4 — Compliance-heavy (FLAGGED) ──────────────────────────────────
// Mandatory safety dominates; only 25 eligible participants.

const SCENARIO_04: ActivationScenario = {
  id: 'sc04_compliance_heavy',
  title: 'Compliance obbligatoria dominante — blocked by design',
  inputRecords: [
    makeRaw('s04-r01', 0, {
      'Nome Iniziativa': 'Formazione D.Lgs 81',
      'Categoria': 'sicurezza obbligatoria',
      'Partecipanti': '100',
    }),
    makeRaw('s04-r02', 1, {
      'Nome Iniziativa': 'Sorveglianza Sanitaria',
      'Categoria': 'sorveglianza sanitaria',
      'Partecipanti': '80',
    }),
    makeRaw('s04-r03', 2, {
      'Nome Iniziativa': 'Corso Antincendio',
      'Categoria': 'antincendio obbligatorio',
      'Partecipanti': '50',
    }),
    makeRaw('s04-r04', 3, {
      'Nome Iniziativa': 'Upskilling Professionale',
      'Categoria': 'upskilling',
      'Partecipanti': '25',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.08, max: 0.12 },
  expectedMeaningfulReach:  { min: 0.08, max: 0.12 },
  expectedActiveWorkers:    { min: 23, max: 27 },
  expectedMeaningfulWorkers: { min: 23, max: 27 },
  expectedSafeguard: 'FLAGGED',
  expectedWarningsContain: ['blocked'],
  doctrineNote: 'Blocked compliance escluso. Solo 25 partecipanti eligible. AR=0.10 < 0.20 → FLAGGED.',
};

// ── Scenario 5 — Review-required prevents CLEAR ──────────────────────────────
// AR and MAR both above CLEAR thresholds, but >25% records are review_required → WARNING.

const SCENARIO_05: ActivationScenario = {
  id: 'sc05_review_required_prevents_clear',
  title: 'Review-required blocca safeguard CLEAR',
  inputRecords: [
    makeRaw('s05-r01', 0, { 'Categoria': 'upskilling', 'Partecipanti': '90' }),
    makeRaw('s05-r02', 1, { 'Categoria': 'mentoring', 'Partecipanti': '80' }),
    makeRaw('s05-r03', 2, { 'Categoria': 'welfare aziendale generico' }),
    makeRaw('s05-r04', 3, { 'Categoria': 'benefit salute generico' }),
    makeRaw('s05-r05', 4, { 'Categoria': 'programma benessere generico' }),
    makeRaw('s05-r06', 5, { 'Categoria': 'rimborso vario' }),
    makeRaw('s05-r07', 6, { 'Categoria': 'welfare famiglia' }),
    makeRaw('s05-r08', 7, { 'Categoria': 'benefit generico 2025' }),
    makeRaw('s05-r09', 8, { 'Categoria': 'supporto generico non specificato' }),
    makeRaw('s05-r10', 9, { 'Categoria': 'iniziativa hr varia' }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.44, max: 0.50 },
  expectedMeaningfulReach:  { min: 0.44, max: 0.50 },
  expectedActiveWorkers:    { min: 116, max: 120 },
  expectedMeaningfulWorkers: { min: 116, max: 120 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['review_required'],
  doctrineNote: 'bounded_estimate: 2 eligible (90+80), 2 cats, cf=0.35. lb=90, ub=170, reach=118. AR=MAR=0.472 supera soglie CLEAR ma 8/10 review_required (80%>25%) → WARNING.',
};

// ── Scenario 6 — Workforce unknown (insufficient_data) ───────────────────────
// Participants present but no workforce baseline → AR=MAR=0, no CLEAR possible.

const SCENARIO_06: ActivationScenario = {
  id: 'sc06_workforce_unknown',
  title: 'Workforce sconosciuta — AR non calcolabile',
  inputRecords: [
    makeRaw('s06-r01', 0, {
      'Nome Iniziativa': 'Academy Upskilling',
      'Categoria': 'upskilling',
      'Partecipanti': '80',
    }),
    makeRaw('s06-r02', 1, {
      'Nome Iniziativa': 'Mentoring Aziendale',
      'Categoria': 'mentoring',
      'Partecipanti': '45',
    }),
  ],
  // workforcePopulation: intentionally omitted
  expectedActivationReach:  { min: 0, max: 0 },
  expectedMeaningfulReach:  { min: 0, max: 0 },
  expectedActiveWorkers:    { min: 94, max: 98 },   // bounded_estimate uncapped: cf=0.35, lb=80, ub=125, reach=96
  expectedMeaningfulWorkers: { min: 94, max: 98 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['workforce population non disponibile'],
  doctrineNote: 'bounded_estimate no-wf: 2 cats, cf=0.35. lb=80, ub=125, reach=96. AR=MAR=0 (workforce mancante). Safeguard non può essere CLEAR.',
};

// ── Scenario 7 — Department gaps ─────────────────────────────────────────────
// 3 eligible records by department — gaps visible in departmentGaps map.

const SCENARIO_07: ActivationScenario = {
  id: 'sc07_department_gaps',
  title: 'Gap dipartimenti — Engineering alta, Operations bassa',
  inputRecords: [
    makeRaw('s07-r01', 0, {
      'Nome Iniziativa': 'Digital Academy',
      'Categoria': 'upskilling',
      'Partecipanti': '60',
      'Dipartimento': 'ingegneria',
    }),
    makeRaw('s07-r02', 1, {
      'Nome Iniziativa': 'Safety Wellbeing',
      'Categoria': 'wellbeing volontario',
      'Partecipanti': '12',
      'Dipartimento': 'operations',
    }),
    makeRaw('s07-r03', 2, {
      'Nome Iniziativa': 'Sales Coaching',
      'Categoria': 'coaching professionale',
      'Partecipanti': '35',
      'Dipartimento': 'sales',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.28, max: 0.32 },
  expectedMeaningfulReach:  { min: 0.28, max: 0.32 },
  expectedActiveWorkers:    { min: 74, max: 78 },
  expectedMeaningfulWorkers: { min: 74, max: 78 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: [],
  doctrineNote: 'bounded_estimate: 3 cats, no siti (dipartimento ≠ sede) → cf=0.35. lb=60, ub=107, reach=76. AR=MAR=0.304 < 0.40 → WARNING. departmentGaps ha 3 chiavi: ingegneria(60) > sales(35) > operations(12).',
};

// ── Scenario 8 — Site gaps ───────────────────────────────────────────────────
// 3 eligible records by site — HQ high, Plant low, Remote medium.

const SCENARIO_08: ActivationScenario = {
  id: 'sc08_site_gaps',
  title: 'Gap sedi — HQ alta, Plant bassa, Remoto media',
  inputRecords: [
    makeRaw('s08-r01', 0, {
      'Nome Iniziativa': 'Wellbeing HQ',
      'Categoria': 'wellbeing volontario',
      'Partecipanti': '85',
      'Sede': 'hq_milano',
    }),
    makeRaw('s08-r02', 1, {
      'Nome Iniziativa': 'Upskilling Plant',
      'Categoria': 'upskilling',
      'Partecipanti': '10',
      'Sede': 'plant_bergamo',
    }),
    makeRaw('s08-r03', 2, {
      'Nome Iniziativa': 'Mentoring Remoto',
      'Categoria': 'mentoring',
      'Partecipanti': '25',
      'Sede': 'remoto',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.38, max: 0.43 },
  expectedMeaningfulReach:  { min: 0.38, max: 0.43 },
  expectedActiveWorkers:    { min: 99, max: 103 },
  expectedMeaningfulWorkers: { min: 99, max: 103 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: 'bounded_estimate: 3 cats + 3 siti → cf=0.45. lb=85, ub=120, reach=101. AR=MAR=0.404 ≥ 0.40 → CLEAR. siteGaps: HQ(85) >> Plant(10).',
};

// ── Scenario 9 — High concentration prevents CLEAR ───────────────────────────
// top_12_share=68%, bottom_50_share=9%. Despite AR/MAR above thresholds → WARNING.

const SCENARIO_09: ActivationScenario = {
  id: 'sc09_high_concentration',
  title: 'Alta concentrazione — top 12% genera 68% IU, bottom 50% genera 9%',
  inputRecords: [
    makeRaw('s09-r01', 0, {
      'Nome Iniziativa': 'Academy Aziendale',
      'Categoria': 'upskilling',
      'Partecipanti': '120',
      'top_12_share': '68',
      'bottom_50_share': '9',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.46, max: 0.50 },
  expectedMeaningfulReach:  { min: 0.46, max: 0.50 },
  expectedActiveWorkers:    { min: 118, max: 122 },
  expectedMeaningfulWorkers: { min: 118, max: 122 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['concentrazione'],
  doctrineNote: 'AR=MAR=0.48 → normalmente CLEAR, ma concentrationTopShare=0.68>0.60 E bottomFiftyShare=0.09<0.15 → WARNING.',
};

// ── Scenario 10 — Policy signal (smart working 190 workers) ──────────────────
// Structural policy classified as eligible — aggregate coverage counts.

const SCENARIO_10: ActivationScenario = {
  id: 'sc10_policy_signal',
  title: 'Policy strutturale — Smart Working applicabile a 190 lavoratori',
  inputRecords: [
    makeRaw('s10-r01', 0, {
      'Nome Policy': 'Smart Working Aziendale',
      'Categoria': 'smart working policy formale',
      'Partecipanti': '190',
    }, 'structural_policy'),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.74, max: 0.78 },
  expectedMeaningfulReach:  { min: 0.74, max: 0.78 },
  expectedActiveWorkers:    { min: 188, max: 192 },
  expectedMeaningfulWorkers: { min: 188, max: 192 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: 'Policy eligible (smart working) con 190 coperti. AR=MAR=0.76 → CLEAR. Partecipanti aggregati, non nominativi.',
};

// ── Scenario 11 — No participants (FLAGGED) ───────────────────────────────────
// Eligible records exist but no participant count in any record.

const SCENARIO_11: ActivationScenario = {
  id: 'sc11_no_participants',
  title: 'Nessun dato partecipanti — attivazione non calcolabile',
  inputRecords: [
    makeRaw('s11-r01', 0, { 'Categoria': 'upskilling' }),
    makeRaw('s11-r02', 1, { 'Categoria': 'mentoring' }),
    makeRaw('s11-r03', 2, { 'Categoria': 'asilo nido' }),
    makeRaw('s11-r04', 3, { 'Categoria': 'volontariato aziendale' }),
    makeRaw('s11-r05', 4, { 'Categoria': 'knowledge transfer' }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0, max: 0 },
  expectedMeaningfulReach:  { min: 0, max: 0 },
  expectedActiveWorkers:    { min: 0, max: 0 },
  expectedMeaningfulWorkers: { min: 0, max: 0 },
  expectedSafeguard: 'FLAGGED',
  expectedWarningsContain: ['partecipanti assente'],
  doctrineNote: 'Senza dati partecipanti, activeWorkers=0 → AR=MAR=0 → FLAGGED. Raccogliere dati partecipazione.',
};

// ── Scenario 12 — Sensitive individual signal excluded ───────────────────────
// One record contains 'nome dipendente' → excluded from activation with warning.

const SCENARIO_12: ActivationScenario = {
  id: 'sc12_sensitive_excluded',
  title: 'Record con dati individuali sensibili — escluso dalla pipeline',
  inputRecords: [
    makeRaw('s12-r01', 0, {
      'Nome Iniziativa': 'Sessione Terapia Individuale',
      'nome dipendente': 'Mario Rossi',
      'Categoria': 'supporto psicologico',
      'Partecipanti': '1',
    }),
    makeRaw('s12-r02', 1, {
      'Nome Iniziativa': 'Mental Health Platform',
      'Categoria': 'mental health service',
      'Partecipanti': '30',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.10, max: 0.14 },
  expectedMeaningfulReach:  { min: 0.10, max: 0.14 },
  expectedActiveWorkers:    { min: 28, max: 32 },
  expectedMeaningfulWorkers: { min: 28, max: 32 },
  expectedSafeguard: 'FLAGGED',
  expectedWarningsContain: ['sensibili'],
  doctrineNote: 'Record con nome dipendente escluso per privacy. Solo s12-r02 conta: AR=MAR=0.12 < 0.20 → FLAGGED.',
};

// ── Scenario 13 — Care Economy activation ────────────────────────────────────
// Childcare + caregiver + eldercare with documented aggregate participants.

const SCENARIO_13: ActivationScenario = {
  id: 'sc13_care_economy',
  title: 'Care Economy — nido, caregiver, eldercare — attivazione CLEAR',
  inputRecords: [
    makeRaw('s13-r01', 0, {
      'Nome Iniziativa': 'Asilo Nido Aziendale',
      'Categoria': 'asilo nido',
      'Partecipanti': '60',
    }),
    makeRaw('s13-r02', 1, {
      'Nome Iniziativa': 'Programma Caregiver',
      'Categoria': 'caregiver',
      'Partecipanti': '25',
    }),
    makeRaw('s13-r03', 2, {
      'Nome Iniziativa': 'Eldercare Support',
      'Categoria': 'cura anziani',
      'Partecipanti': '20',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.28, max: 0.32 },
  expectedMeaningfulReach:  { min: 0.28, max: 0.32 },
  expectedActiveWorkers:    { min: 74, max: 78 },
  expectedMeaningfulWorkers: { min: 74, max: 78 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: [],
  doctrineNote: 'bounded_estimate: 3 cats (nido/caregiver/eldercare), no siti → cf=0.35. lb=60, ub=105, reach=76. AR=MAR=0.304 < 0.40 → WARNING.',
};

// ── Scenario 14 — Growth pillar activation ────────────────────────────────────
// Corporate academy + digital skills. High eligible participation.

const SCENARIO_14: ActivationScenario = {
  id: 'sc14_growth_activation',
  title: 'Pillar GROWTH — academy e competenze digitali',
  inputRecords: [
    makeRaw('s14-r01', 0, {
      'Nome Iniziativa': 'Corporate Academy',
      'Categoria': 'academy aziendale',
      'Partecipanti': '130',
    }),
    makeRaw('s14-r02', 1, {
      'Nome Iniziativa': 'Digital Skills 2025',
      'Categoria': 'digital skills',
      'Partecipanti': '40',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.55, max: 0.59 },
  expectedMeaningfulReach:  { min: 0.55, max: 0.59 },
  expectedActiveWorkers:    { min: 142, max: 146 },
  expectedMeaningfulWorkers: { min: 142, max: 146 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: 'bounded_estimate: 2 cats (academy/digital skills), cf=0.35. lb=130, ub=170, reach=144. AR=MAR=0.576 → CLEAR.',
};

// ── Scenario 15 — Impact pillar activation (WARNING) ─────────────────────────
// Volunteering programs with moderate participation. AR below 0.40.

const SCENARIO_15: ActivationScenario = {
  id: 'sc15_impact_activation',
  title: 'Pillar IMPACT — volontariato aziendale e territoriale',
  inputRecords: [
    makeRaw('s15-r01', 0, {
      'Nome Iniziativa': 'Volontariato Aziendale Q1',
      'Categoria': 'volontariato aziendale',
      'Partecipanti': '60',
    }),
    makeRaw('s15-r02', 1, {
      'Nome Iniziativa': 'Progetto Territoriale',
      'Categoria': 'iniziativa territoriale',
      'Partecipanti': '25',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.26, max: 0.30 },
  expectedMeaningfulReach:  { min: 0.26, max: 0.30 },
  expectedActiveWorkers:    { min: 67, max: 71 },
  expectedMeaningfulWorkers: { min: 67, max: 71 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: [],
  doctrineNote: 'bounded_estimate: 2 cats (volontariato/territoriale), cf=0.35. lb=60, ub=85, reach=69. AR=MAR=0.276. 0.20≤AR<0.40 → WARNING.',
};

// ── Scenario 16 — Legacy pillar activation ────────────────────────────────────
// Knowledge transfer + pension education = high legacy pillar reach.

const SCENARIO_16: ActivationScenario = {
  id: 'sc16_legacy_activation',
  title: 'Pillar LEGACY — knowledge transfer e previdenza complementare',
  inputRecords: [
    makeRaw('s16-r01', 0, {
      'Nome Iniziativa': 'Knowledge Transfer Program',
      'Categoria': 'knowledge transfer',
      'Partecipanti': '70',
    }),
    makeRaw('s16-r02', 1, {
      'Nome Iniziativa': 'Educazione Previdenziale',
      'Categoria': 'previdenza complementare',
      'Partecipanti': '95',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.45, max: 0.50 },
  expectedMeaningfulReach:  { min: 0.45, max: 0.50 },
  expectedActiveWorkers:    { min: 118, max: 122 },
  expectedMeaningfulWorkers: { min: 118, max: 122 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: 'bounded_estimate: 2 cats (knowledge transfer/previdenza), cf=0.35. lb=95, ub=165, reach=120. AR=MAR=0.48 → CLEAR.',
};

// ── Scenario 17 — Mixed realistic pilot ──────────────────────────────────────
// Eligible + limited + blocked + one review_required record.

const SCENARIO_17: ActivationScenario = {
  id: 'sc17_mixed_pilot',
  title: 'Scenario pilota reale — mix eligible / limited / blocked / review',
  inputRecords: [
    makeRaw('s17-r01', 0, {
      'Nome Iniziativa': 'Nido Aziendale',
      'Categoria': 'asilo nido',
      'Partecipanti': '50',
    }),
    makeRaw('s17-r02', 1, {
      'Nome Iniziativa': 'Buoni Pasto',
      'Categoria': 'buoni pasto',
      'Partecipanti': '80',
    }),
    makeRaw('s17-r03', 2, {
      'Nome Iniziativa': 'Upskilling AI',
      'Categoria': 'upskilling',
      'Partecipanti': '35',
    }),
    makeRaw('s17-r04', 3, {
      'Nome Iniziativa': 'Formazione Sicurezza D.Lgs 81',
      'Categoria': 'sicurezza obbligatoria',
      'Partecipanti': '100',
    }),
    makeRaw('s17-r05', 4, {
      'Nome Iniziativa': 'Welfare Famiglia Generico',
      'Categoria': 'welfare famiglia',
    }),
    makeRaw('s17-r06', 5, {
      'Nome Iniziativa': 'Mentoring Aziendale',
      'Categoria': 'mentoring',
      'Partecipanti': '25',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.45, max: 0.50 },
  expectedMeaningfulReach:  { min: 0.26, max: 0.30 },
  expectedActiveWorkers:    { min: 117, max: 121 },
  expectedMeaningfulWorkers: { min: 69, max: 73 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['blocked', 'limited'],
  doctrineNote: 'bounded_estimate active (4 cats, cf=0.35): lb=80, ub=190, reach=119. Meaningful (3 eligible, cf=0.35): lb=50, ub=110, reach=71. MAR=0.284 < 0.30 → WARNING.',
};

// ── Scenario 18 — Duplicate participant risk ──────────────────────────────────
// Three records each claiming 200 participants → sum=600 >> workforce=250.
// Conservative cap at workforce + duplicate warning.

const SCENARIO_18: ActivationScenario = {
  id: 'sc18_duplicate_risk',
  title: 'Rischio doppio conteggio — stessa popolazione in 3 record',
  inputRecords: [
    makeRaw('s18-r01', 0, {
      'Nome Iniziativa': 'Piattaforma Welfare A',
      'Categoria': 'wellbeing volontario',
      'Partecipanti': '200',
    }),
    makeRaw('s18-r02', 1, {
      'Nome Iniziativa': 'Piattaforma Welfare B',
      'Categoria': 'upskilling',
      'Partecipanti': '200',
    }),
    makeRaw('s18-r03', 2, {
      'Nome Iniziativa': 'Piattaforma Welfare C',
      'Categoria': 'mentoring',
      'Partecipanti': '200',
    }),
  ],
  workforcePopulation: 250,
  expectedActivationReach:  { min: 0.84, max: 0.90 },
  expectedMeaningfulReach:  { min: 0.84, max: 0.90 },
  expectedActiveWorkers:    { min: 216, max: 220 },
  expectedMeaningfulWorkers: { min: 216, max: 220 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: ['doppio conteggio'],
  doctrineNote: 'bounded_estimate: 3 cats, cf=0.35. lb=200, ub=min(600,250)=250, reach=218. AR=MAR=0.872 → CLEAR. rawSum(600)>wf×1.5(375) → doppio conteggio warning.',
};

// ── Scenario 19 — Eligible population, no workforce ──────────────────────────
// No workforcePopulation provided or inferable. AR=MAR=0, activeWorkers uncapped.

const SCENARIO_19: ActivationScenario = {
  id: 'sc19_eligible_no_workforce',
  title: 'Partecipanti presenti, workforce sconosciuta — reach non calcolabile',
  inputRecords: [
    makeRaw('s19-r01', 0, { 'Categoria': 'upskilling', 'Partecipanti': '100' }),
    makeRaw('s19-r02', 1, { 'Categoria': 'mentoring', 'Partecipanti': '100' }),
    makeRaw('s19-r03', 2, { 'Categoria': 'volontariato aziendale', 'Partecipanti': '100' }),
  ],
  // workforcePopulation: intentionally omitted
  expectedActivationReach:  { min: 0, max: 0 },
  expectedMeaningfulReach:  { min: 0, max: 0 },
  expectedActiveWorkers:    { min: 168, max: 172 },   // bounded_estimate uncapped: cf=0.35, lb=100, ub=300, reach=170
  expectedMeaningfulWorkers: { min: 168, max: 172 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['workforce population non disponibile'],
  doctrineNote: 'bounded_estimate no-wf: 3 cats, cf=0.35. lb=100, ub=300, reach=170. AR=MAR=0 (workforce mancante). Safeguard non può essere CLEAR.',
};

// ── Scenario 20 — Zero workforce (safe division handling) ────────────────────
// workforcePopulation=0 explicitly provided. Division by zero handled safely.

const SCENARIO_20: ActivationScenario = {
  id: 'sc20_zero_workforce',
  title: 'Workforce = 0 — gestione sicura divisione per zero',
  inputRecords: [
    makeRaw('s20-r01', 0, {
      'Nome Iniziativa': 'Programma Upskilling',
      'Categoria': 'upskilling',
      'Partecipanti': '50',
    }),
  ],
  workforcePopulation: 0,  // explicitly 0
  expectedActivationReach:  { min: 0, max: 0 },
  expectedMeaningfulReach:  { min: 0, max: 0 },
  expectedActiveWorkers:    { min: 48, max: 52 },   // uncapped (wf=0 treated as unknown)
  expectedMeaningfulWorkers: { min: 48, max: 52 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['workforce population non disponibile'],
  doctrineNote: 'workforce=0 trattato come assenza dato (non >0). Nessuna divisione per zero. AR=MAR=0. Safeguard=WARNING.',
};

// ── Sprint 12B scenarios — Reach Quality integration ─────────────────────────

// ── Scenario 21 — Single category cf=0.25 ─────────────────────────────────────
// Two eligible records, same category → bounded_estimate uses cf=0.25 (high overlap assumed).

const SCENARIO_21: ActivationScenario = {
  id: 'sc21_single_category_cf025',
  title: 'Single-category — cf=0.25 conservativo alta sovrapposizione',
  inputRecords: [
    makeRaw('s21-r01', 0, {
      'Nome Iniziativa': 'Academy Upskilling A',
      'Categoria': 'upskilling',
      'Partecipanti': '100',
    }),
    makeRaw('s21-r02', 1, {
      'Nome Iniziativa': 'Academy Upskilling B',
      'Categoria': 'upskilling',
      'Partecipanti': '60',
    }),
  ],
  workforcePopulation: 250,
  // cf=0.25. lb=100, ub=min(160,250)=160, reach=round(100+60*0.25)=round(115)=115
  expectedActivationReach:  { min: 0.44, max: 0.48 },
  expectedMeaningfulReach:  { min: 0.44, max: 0.48 },
  expectedActiveWorkers:    { min: 113, max: 117 },
  expectedMeaningfulWorkers: { min: 113, max: 117 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: '1 categoria, no siti → cf=0.25. lb=100, ub=160, reach=115. AR=MAR=0.46 ≥ 0.40 → CLEAR.',
};

// ── Scenario 22 — Multiple categories + sites cf=0.45 ─────────────────────────
// Three eligible records with 3 different categories AND 3 different sites → cf=0.45.

const SCENARIO_22: ActivationScenario = {
  id: 'sc22_multi_cat_site_cf045',
  title: 'Multi-categoria + multi-sede — cf=0.45 sovrapposizione ridotta',
  inputRecords: [
    makeRaw('s22-r01', 0, {
      'Nome Iniziativa': 'Wellbeing Milano',
      'Categoria': 'wellbeing volontario',
      'Partecipanti': '80',
      'Sede': 'sede_milano',
    }),
    makeRaw('s22-r02', 1, {
      'Nome Iniziativa': 'Upskilling Roma',
      'Categoria': 'upskilling',
      'Partecipanti': '30',
      'Sede': 'sede_roma',
    }),
    makeRaw('s22-r03', 2, {
      'Nome Iniziativa': 'Mentoring Torino',
      'Categoria': 'mentoring',
      'Partecipanti': '40',
      'Sede': 'sede_torino',
    }),
  ],
  workforcePopulation: 250,
  // cf=0.45. lb=80, ub=min(150,250)=150, reach=round(80+70*0.45)=round(80+31.5)=round(111.5)=112
  expectedActivationReach:  { min: 0.43, max: 0.47 },
  expectedMeaningfulReach:  { min: 0.43, max: 0.47 },
  expectedActiveWorkers:    { min: 110, max: 114 },
  expectedMeaningfulWorkers: { min: 110, max: 114 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: '3 cats + 3 siti → cf=0.45. lb=80, ub=150, reach=112. AR=MAR=0.448 ≥ 0.40 → CLEAR.',
};

// ── Scenario 23 — Meaningful ≤ active invariant ────────────────────────────────
// Two limited + one eligible. bounded_estimate active reach (higher) vs meaningful (lower).
// Tests that meaningfullyActiveWorkers ≤ activeWorkers is always enforced.

const SCENARIO_23: ActivationScenario = {
  id: 'sc23_meaningful_le_active',
  title: 'Invariant meaningful ≤ active — limited+eligible vs eligible-only reach',
  inputRecords: [
    makeRaw('s23-r01', 0, {
      'Nome Iniziativa': 'Buoni Pasto',
      'Categoria': 'buoni pasto',
      'Partecipanti': '90',
    }),
    makeRaw('s23-r02', 1, {
      'Nome Iniziativa': 'Ticket Restaurant',
      'Categoria': 'ticket restaurant',
      'Partecipanti': '70',
    }),
    makeRaw('s23-r03', 2, {
      'Nome Iniziativa': 'Upskilling',
      'Categoria': 'upskilling',
      'Partecipanti': '40',
    }),
  ],
  workforcePopulation: 250,
  // Active (limited+eligible, 3 cats, cf=0.35): lb=90, ub=200, reach=round(90+110*0.35)=round(128.5)=129
  // Meaningful (1 eligible, single record): lb=ub=40, reach=40
  // meaningfullyActiveWorkers = min(40, 129) = 40
  expectedActivationReach:  { min: 0.49, max: 0.53 },
  expectedMeaningfulReach:  { min: 0.14, max: 0.18 },
  expectedActiveWorkers:    { min: 127, max: 131 },
  expectedMeaningfulWorkers: { min: 38, max: 42 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['limited'],
  doctrineNote: 'Active cf=0.35: lb=90, ub=200, reach=129. Meaningful (1 eligible): reach=40. min(40,129)=40 → invariant enforced. MAR=0.16 → WARNING.',
};

// ── Scenario 24 — Conservative cf=0.25 with gross=wf ─────────────────────────
// Three eligible, same category, gross=250=wf. bounded_estimate still < gross.
// Shows single-category conservatism even when sum equals workforce.

const SCENARIO_24: ActivationScenario = {
  id: 'sc24_single_cat_gross_equals_wf',
  title: 'Gross=wf, 1 categoria — cf=0.25 produce stima conservativa',
  inputRecords: [
    makeRaw('s24-r01', 0, {
      'Nome Iniziativa': 'Wellbeing A',
      'Categoria': 'wellbeing volontario',
      'Partecipanti': '100',
    }),
    makeRaw('s24-r02', 1, {
      'Nome Iniziativa': 'Wellbeing B',
      'Categoria': 'wellbeing volontario',
      'Partecipanti': '80',
    }),
    makeRaw('s24-r03', 2, {
      'Nome Iniziativa': 'Wellbeing C',
      'Categoria': 'wellbeing volontario',
      'Partecipanti': '70',
    }),
  ],
  workforcePopulation: 250,
  // cf=0.25. lb=100, ub=min(250,250)=250, reach=round(100+150*0.25)=round(137.5)=138
  expectedActivationReach:  { min: 0.53, max: 0.57 },
  expectedMeaningfulReach:  { min: 0.53, max: 0.57 },
  expectedActiveWorkers:    { min: 136, max: 140 },
  expectedMeaningfulWorkers: { min: 136, max: 140 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: '1 categoria, cf=0.25. gross=250=wf. lb=100, ub=250, reach=138. AR=MAR=0.552 → CLEAR. Stima conservativa vs somma naïve (250).',
};

// ── All scenarios ─────────────────────────────────────────────────────────────

export const ACTIVATION_SCENARIOS: ActivationScenario[] = [
  SCENARIO_01, SCENARIO_02, SCENARIO_03, SCENARIO_04, SCENARIO_05,
  SCENARIO_06, SCENARIO_07, SCENARIO_08, SCENARIO_09, SCENARIO_10,
  SCENARIO_11, SCENARIO_12, SCENARIO_13, SCENARIO_14, SCENARIO_15,
  SCENARIO_16, SCENARIO_17, SCENARIO_18, SCENARIO_19, SCENARIO_20,
  SCENARIO_21, SCENARIO_22, SCENARIO_23, SCENARIO_24,
];

// ── Runner ────────────────────────────────────────────────────────────────────

export function runActivationExamples(): ActivationExampleResult[] {
  return ACTIVATION_SCENARIOS.map((scenario) => {
    const actual = computeActivationFromRecords(
      scenario.inputRecords,
      scenario.workforcePopulation,
    );
    const failures: string[] = [];

    const activationReachMatch = inRange(actual.activationReach, scenario.expectedActivationReach);
    if (!activationReachMatch)
      failures.push(
        `activationReach: expected ${JSON.stringify(scenario.expectedActivationReach)}, got ${actual.activationReach}`,
      );

    const meaningfulReachMatch = inRange(actual.meaningfulActivationReach, scenario.expectedMeaningfulReach);
    if (!meaningfulReachMatch)
      failures.push(
        `meaningfulActivationReach: expected ${JSON.stringify(scenario.expectedMeaningfulReach)}, got ${actual.meaningfulActivationReach}`,
      );

    const activeWorkersMatch = inRange(actual.activeWorkers, scenario.expectedActiveWorkers);
    if (!activeWorkersMatch)
      failures.push(
        `activeWorkers: expected ${JSON.stringify(scenario.expectedActiveWorkers)}, got ${actual.activeWorkers}`,
      );

    const meaningfulWorkersMatch = inRange(actual.meaningfullyActiveWorkers, scenario.expectedMeaningfulWorkers);
    if (!meaningfulWorkersMatch)
      failures.push(
        `meaningfullyActiveWorkers: expected ${JSON.stringify(scenario.expectedMeaningfulWorkers)}, got ${actual.meaningfullyActiveWorkers}`,
      );

    const acceptableSafeguards = Array.isArray(scenario.expectedSafeguard)
      ? scenario.expectedSafeguard
      : [scenario.expectedSafeguard];
    const safeguardMatch = acceptableSafeguards.includes(actual.safeguardStatus);
    if (!safeguardMatch)
      failures.push(
        `safeguardStatus: expected ${JSON.stringify(scenario.expectedSafeguard)}, got ${actual.safeguardStatus}`,
      );

    const warningsText = actual.warnings.join(' ').toLowerCase();
    const missingWarnings = scenario.expectedWarningsContain.filter(
      (w) => !warningsText.includes(w.toLowerCase()),
    );
    const warningsMatch = missingWarnings.length === 0;
    if (!warningsMatch)
      failures.push(`warnings missing: [${missingWarnings.join(', ')}]`);

    return {
      id: scenario.id,
      title: scenario.title,
      passed: failures.length === 0,
      activationReachMatch,
      meaningfulReachMatch,
      activeWorkersMatch,
      meaningfulWorkersMatch,
      safeguardMatch,
      warningsMatch,
      actualResult: actual,
      failures,
      failureReason: failures.length > 0 ? failures.join(' | ') : null,
    };
  });
}

export function summarizeActivationExamples(
  results: ActivationExampleResult[],
): ActivationExampleSummary {
  const failed = results.filter((r) => !r.passed);
  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: failed.length,
    failedIds: failed.map((r) => r.id),
  };
}
