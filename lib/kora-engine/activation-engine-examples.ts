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
  expectedActivationReach:  { min: 0.62, max: 0.66 },
  expectedMeaningfulReach:  { min: 0.62, max: 0.66 },
  expectedActiveWorkers:    { min: 158, max: 162 },
  expectedMeaningfulWorkers: { min: 158, max: 162 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: 'AR=MAR=0.64. AR≥0.40 AND MAR≥0.30 → CLEAR. Nessuna condizione di prevention.',
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
  expectedActivationReach:  { min: 0.60, max: 0.68 },
  expectedMeaningfulReach:  { min: 0.14, max: 0.18 },
  expectedActiveWorkers:    { min: 155, max: 165 },
  expectedMeaningfulWorkers: { min: 38, max: 42 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['limited', 'sollievo economico'],
  doctrineNote: 'Limited buoni pasto → active reach ma non meaningful. MAR=0.16 < 0.30 → WARNING non CLEAR.',
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
  expectedActivationReach:  { min: 0.65, max: 0.72 },
  expectedMeaningfulReach:  { min: 0.65, max: 0.72 },
  expectedActiveWorkers:    { min: 165, max: 175 },
  expectedMeaningfulWorkers: { min: 165, max: 175 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['review_required'],
  doctrineNote: 'AR=MAR≈0.68 supera soglie CLEAR ma 8/10 review_required (80%>25%) → WARNING non CLEAR.',
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
  expectedActiveWorkers:    { min: 120, max: 130 },   // uncapped sum
  expectedMeaningfulWorkers: { min: 120, max: 130 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['workforce population non disponibile'],
  doctrineNote: 'Senza workforce baseline, AR=MAR=0 e safeguard non può essere CLEAR. Dato strutturalmente mancante.',
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
  expectedActivationReach:  { min: 0.40, max: 0.45 },
  expectedMeaningfulReach:  { min: 0.40, max: 0.45 },
  expectedActiveWorkers:    { min: 105, max: 110 },
  expectedMeaningfulWorkers: { min: 105, max: 110 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: 'departmentGaps ha 3 chiavi: ingegneria(60) > sales(35) > operations(12). Gap visibile per dipartimento.',
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
  expectedActivationReach:  { min: 0.46, max: 0.50 },
  expectedMeaningfulReach:  { min: 0.46, max: 0.50 },
  expectedActiveWorkers:    { min: 115, max: 122 },
  expectedMeaningfulWorkers: { min: 115, max: 122 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: 'siteGaps ha 3 chiavi. HQ(85) >> Plant(10). AR=MAR=0.48 ≥ 0.40 e ≥ 0.30 → CLEAR. Gap visibile ma safeguard soddisfatto.',
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
  expectedActivationReach:  { min: 0.40, max: 0.44 },
  expectedMeaningfulReach:  { min: 0.40, max: 0.44 },
  expectedActiveWorkers:    { min: 103, max: 107 },
  expectedMeaningfulWorkers: { min: 103, max: 107 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: 'Care Economy 3 programmi eligible totale 105 partecipanti. AR=MAR=0.42 → CLEAR.',
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
  expectedActivationReach:  { min: 0.66, max: 0.70 },
  expectedMeaningfulReach:  { min: 0.66, max: 0.70 },
  expectedActiveWorkers:    { min: 165, max: 172 },
  expectedMeaningfulWorkers: { min: 165, max: 172 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: 'GROWTH: academy(130) + digital skills(40) = 170 partecipanti eligible. AR=MAR=0.68 → CLEAR.',
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
  expectedActivationReach:  { min: 0.32, max: 0.36 },
  expectedMeaningfulReach:  { min: 0.32, max: 0.36 },
  expectedActiveWorkers:    { min: 82, max: 87 },
  expectedMeaningfulWorkers: { min: 82, max: 87 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: [],
  doctrineNote: 'IMPACT: 85 partecipanti eligible. AR=MAR=0.34. AR<0.40 → non CLEAR. AR≥0.20 → non FLAGGED. WARNING.',
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
  expectedActivationReach:  { min: 0.64, max: 0.68 },
  expectedMeaningfulReach:  { min: 0.64, max: 0.68 },
  expectedActiveWorkers:    { min: 163, max: 167 },
  expectedMeaningfulWorkers: { min: 163, max: 167 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: [],
  doctrineNote: 'LEGACY: knowledge transfer(70) + previdenza(95) = 165. AR=MAR=0.66 → CLEAR.',
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
  expectedActivationReach:  { min: 0.73, max: 0.77 },
  expectedMeaningfulReach:  { min: 0.42, max: 0.46 },
  expectedActiveWorkers:    { min: 183, max: 192 },
  expectedMeaningfulWorkers: { min: 105, max: 112 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: ['blocked', 'limited'],
  doctrineNote: 'eligible(50+35+25=110) + limited(80) = 190 active. MAR=110/250=0.44≥0.30. review 1/6=17%<25% → CLEAR.',
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
  expectedActivationReach:  { min: 0.98, max: 1.01 },
  expectedMeaningfulReach:  { min: 0.98, max: 1.01 },
  expectedActiveWorkers:    { min: 249, max: 251 },
  expectedMeaningfulWorkers: { min: 249, max: 251 },
  expectedSafeguard: 'CLEAR',
  expectedWarningsContain: ['doppio conteggio'],
  doctrineNote: 'rawSum=600 > 250×1.5=375 → warning doppio conteggio. Capped a 250. AR=MAR=1.0 → CLEAR ma warning attivo.',
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
  expectedActiveWorkers:    { min: 298, max: 302 },   // uncapped sum
  expectedMeaningfulWorkers: { min: 298, max: 302 },
  expectedSafeguard: 'WARNING',
  expectedWarningsContain: ['workforce population non disponibile'],
  doctrineNote: 'Senza workforce, activeWorkers = somma non cappata (300). AR=MAR=0. Safeguard non può essere CLEAR.',
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

// ── All scenarios ─────────────────────────────────────────────────────────────

export const ACTIVATION_SCENARIOS: ActivationScenario[] = [
  SCENARIO_01, SCENARIO_02, SCENARIO_03, SCENARIO_04, SCENARIO_05,
  SCENARIO_06, SCENARIO_07, SCENARIO_08, SCENARIO_09, SCENARIO_10,
  SCENARIO_11, SCENARIO_12, SCENARIO_13, SCENARIO_14, SCENARIO_15,
  SCENARIO_16, SCENARIO_17, SCENARIO_18, SCENARIO_19, SCENARIO_20,
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
