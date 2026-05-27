// lib/kora-engine/bti-engine-examples.ts
// 20 reference scenarios for the Budget-to-Human-Impact Engine v0.1.
// Covers all treatment combinations: full_weight, confidence_weighted, tracked_only,
// excluded_from_bti, not_applicable — and all eligibility buckets.
// Use with runBTIExamples() for automated verification.

import type { RawUploadedRecord, BTIResult } from './types';
import { computeBTIFromRecords } from './bti-engine';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface BTIScenario {
  id: string;
  title: string;
  inputRecords: RawUploadedRecord[];
  // null = skip this check
  expectedTotalBudget: { min: number; max: number } | null;
  expectedDeepActivation: { min: number; max: number };
  expectedEconomicRelief: { min: number; max: number };
  expectedBlockedCompliance: { min: number; max: number };
  expectedActivationDebt: { min: number; max: number };
  expectedEvidenceQuality: { min: number; max: number };  // 0–1
  expectedBtiScore: { min: number; max: number };          // 0–100
  expectedWarningsContain: string[];
  doctrineNote: string;
}

export interface BTIScenarioResult {
  id: string;
  title: string;
  passed: boolean;
  totalBudgetMatch: boolean;
  deepActivationMatch: boolean;
  economicReliefMatch: boolean;
  blockedComplianceMatch: boolean;
  activationDebtMatch: boolean;
  evidenceQualityMatch: boolean;
  btiScoreMatch: boolean;
  warningsMatch: boolean;
  actualResult: BTIResult;
  failureReason: string | null;
}

export interface BTIExampleSummary {
  total: number;
  passed: number;
  failed: number;
  failedIds: string[];
}

// ── Helper ────────────────────────────────────────────────────────────────────

function makeRaw(
  id: string,
  rowIndex: number,
  raw: Record<string, unknown>,
  detectedRecordType: RawUploadedRecord['detectedRecordType'] = 'welfare_program',
): RawUploadedRecord {
  return { recordId: id, batchId: 'bti_examples_v01', raw, rowIndex, detectedRecordType };
}

function inRange(value: number, band: { min: number; max: number }): boolean {
  return value >= band.min && value <= band.max;
}

// ── Scenario 1 — Strong documented activation spend ───────────────────────────
// 5 eligible L3/L4 services with invoices/contracts. High BTI, minimal debt.

const SCENARIO_01: BTIScenario = {
  id: 'sc01_strong_documented',
  title: 'Forte attivazione documentata — L3/L4 eligible',
  inputRecords: [
    makeRaw('s01-r01', 0, {
      'Nome Iniziativa': 'Nido Aziendale Premium',
      'Importo': '48000',
      'Fonte Budget': 'fattura fornitore Kindercare',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'childcare',
    }),
    makeRaw('s01-r02', 1, {
      'Nome Iniziativa': 'Mental Health Platform',
      'Importo': '24000',
      'Fonte Budget': 'contratto welfare provider',
      'Tipo Evidenza': 'contratto',
      'Categoria': 'benessere psicologico',
    }),
    makeRaw('s01-r03', 2, {
      'Nome Iniziativa': 'Upskilling Digitale 2025',
      'Importo': '36000',
      'Fonte Budget': 'purchase order formazione',
      'Tipo Evidenza': 'purchase_order',
      'Categoria': 'upskilling',
    }),
    makeRaw('s01-r04', 3, {
      'Nome Iniziativa': 'Giornata Volontariato Aziendale',
      'Importo': '8000',
      'Fonte Budget': 'welfare provider export',
      'Tipo Evidenza': 'welfare_provider_export',
      'Categoria': 'volontariato aziendale',
    }),
    makeRaw('s01-r05', 4, {
      'Nome Iniziativa': 'Knowledge Transfer Program',
      'Importo': '12000',
      'Fonte Budget': 'advisor reviewed',
      'Tipo Evidenza': 'l4',
      'Categoria': 'knowledge transfer',
    }),
  ],
  expectedTotalBudget: { min: 125000, max: 131000 },
  expectedDeepActivation: { min: 120000, max: 131000 },
  expectedEconomicRelief: { min: 0, max: 500 },
  expectedBlockedCompliance: { min: 0, max: 500 },
  expectedActivationDebt: { min: 0, max: 5000 },
  expectedEvidenceQuality: { min: 0.75, max: 0.95 },
  expectedBtiScore: { min: 88, max: 100 },
  expectedWarningsContain: [],
  doctrineNote: 'Fatture + contratti + purchase order = L3/L4. Eligible programs. full_weight BTI. Activation Debt ≈ 0.',
};

// ── Scenario 2 — Relief-heavy company ────────────────────────────────────────
// Meal vouchers, gift cards, fuel cards. High economic relief, 0 deep activation.

const SCENARIO_02: BTIScenario = {
  id: 'sc02_relief_heavy',
  title: 'Budget prevalentemente sollievo economico — buoni pasto e gift card',
  inputRecords: [
    makeRaw('s02-r01', 0, {
      'Nome Iniziativa': 'Buoni Pasto Mensili',
      'Importo': '60000',
      'Categoria': 'buoni pasto',
    }),
    makeRaw('s02-r02', 1, {
      'Nome Iniziativa': 'Gift Card Natale 2025',
      'Importo': '8000',
      'Categoria': 'gift card',
    }),
    makeRaw('s02-r03', 2, {
      'Nome Iniziativa': 'Voucher Benzina Dipendenti',
      'Importo': '12000',
      'Categoria': 'buoni benzina',
    }),
  ],
  expectedTotalBudget: { min: 78000, max: 82000 },
  expectedDeepActivation: { min: 0, max: 500 },
  expectedEconomicRelief: { min: 78000, max: 82000 },
  expectedBlockedCompliance: { min: 0, max: 500 },
  expectedActivationDebt: { min: 55000, max: 65000 },
  expectedEvidenceQuality: { min: 0.30, max: 0.55 },
  expectedBtiScore: { min: 20, max: 45 },
  expectedWarningsContain: ['sollievo economico'],
  doctrineNote: 'Cash-like = limited eligibility + tracked_only. 0 IU. economicReliefSpend. Activation Debt = usable − deep − relief×0.25.',
};

// ── Scenario 3 — Compliance-heavy company ────────────────────────────────────
// Mostly mandatory safety training (blocked). One small eligible upskilling.

const SCENARIO_03: BTIScenario = {
  id: 'sc03_compliance_heavy',
  title: 'Budget prevalentemente compliance obbligatoria — D.Lgs 81 e sicurezza',
  inputRecords: [
    makeRaw('s03-r01', 0, {
      'Nome Iniziativa': 'Formazione Sicurezza D.Lgs 81',
      'Importo': '15000',
      'Fonte Budget': 'fattura ente formazione sicurezza',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'sicurezza obbligatoria',
    }),
    makeRaw('s03-r02', 1, {
      'Nome Iniziativa': 'Sorveglianza Sanitaria 2025',
      'Importo': '8000',
      'Fonte Budget': 'fattura medico competente',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'sorveglianza sanitaria',
    }),
    makeRaw('s03-r03', 2, {
      'Nome Iniziativa': 'Corso Antincendio',
      'Importo': '3500',
      'Fonte Budget': 'fattura antincendio',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'antincendio obbligatorio',
    }),
    makeRaw('s03-r04', 3, {
      'Nome Iniziativa': 'DVR Assessment',
      'Importo': '2000',
      'Fonte Budget': 'fattura consulente sicurezza',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'dvr',
    }),
    makeRaw('s03-r05', 4, {
      'Nome Iniziativa': 'Upskilling Python Avanzato',
      'Importo': '5000',
      'Fonte Budget': 'purchase order formazione',
      'Tipo Evidenza': 'purchase_order',
      'Categoria': 'upskilling',
    }),
  ],
  expectedTotalBudget: { min: 32000, max: 35000 },
  expectedDeepActivation: { min: 4500, max: 5500 },
  expectedEconomicRelief: { min: 0, max: 200 },
  expectedBlockedCompliance: { min: 27000, max: 30000 },
  expectedActivationDebt: { min: 0, max: 1000 },
  expectedEvidenceQuality: { min: 0.80, max: 0.90 },
  expectedBtiScore: { min: 90, max: 100 },
  expectedWarningsContain: ['compliance obbligatoria'],
  doctrineNote: 'Blocked compliance separato da impatto per design. Tutti i record hanno evidenza L3 (fatture/purchase order) → alta evidence quality. BTI score alto perché il piccolo budget usable è fully activated.',
};

// ── Scenario 4 — Mixed real pilot ────────────────────────────────────────────
// Realistic mix: eligible + limited + blocked + policy record.

const SCENARIO_04: BTIScenario = {
  id: 'sc04_mixed_pilot',
  title: 'Scenario pilota reale — mix eligible / limited / blocked / policy',
  inputRecords: [
    makeRaw('s04-r01', 0, {
      'Nome Iniziativa': 'Nido Aziendale',
      'Importo': '48000',
      'Fonte Budget': 'fattura fornitore',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'asilo nido',
    }),
    makeRaw('s04-r02', 1, {
      'Nome Iniziativa': 'Buoni Pasto Mensili',
      'Importo': '36000',
      'Categoria': 'buoni pasto',
    }),
    makeRaw('s04-r03', 2, {
      'Nome Iniziativa': 'Formazione Sicurezza',
      'Importo': '12000',
      'Fonte Budget': 'fattura sicurezza',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'corso sicurezza obbligatorio',
    }),
    makeRaw('s04-r04', 3, {
      'Nome Iniziativa': 'Academy Upskilling AI',
      'Importo': '18000',
      'Fonte Budget': 'consuntivo interno',
      'Tipo Evidenza': 'internal_budget_report',
      'Categoria': 'upskilling',
    }),
    makeRaw('s04-r05', 4, {
      'Nome Iniziativa': 'Smart Working Policy Formale',
      'Categoria': 'smart working formale',
    }),
  ],
  expectedTotalBudget: { min: 112000, max: 116000 },
  expectedDeepActivation: { min: 55000, max: 70000 },
  expectedEconomicRelief: { min: 34000, max: 38000 },
  expectedBlockedCompliance: { min: 11000, max: 13500 },
  expectedActivationDebt: { min: 25000, max: 45000 },
  expectedEvidenceQuality: { min: 0.60, max: 0.80 },
  expectedBtiScore: { min: 55, max: 80 },
  expectedWarningsContain: ['policy strutturali'],
  doctrineNote: 'Scenario realistico: invoice L3 full_weight + buoni pasto relief + sicurezza blocked + consuntivo L2 confidence_weighted + policy not_applicable senza budget inventato.',
};

// ── Scenario 5 — Missing budget evidence (all L0) ────────────────────────────
// Eligible programs but all L0 — no recognized source → excluded_from_bti.

const SCENARIO_05: BTIScenario = {
  id: 'sc05_missing_evidence_l0',
  title: 'Budget senza evidenza — tutti L0, eligible ma excluded_from_bti',
  inputRecords: [
    makeRaw('s05-r01', 0, {
      'Nome Iniziativa': 'Programma Benessere Aziendale',
      'Importo': '20000',
      'Categoria': 'wellbeing volontario',
    }),
    makeRaw('s05-r02', 1, {
      'Nome Iniziativa': 'Supporto Psicologico Dipendenti',
      'Importo': '15000',
      'Categoria': 'supporto psicologico',
    }),
    makeRaw('s05-r03', 2, {
      'Nome Iniziativa': 'Formazione Professionale',
      'Importo': '8000',
      'Categoria': 'formazione volontaria',
    }),
  ],
  expectedTotalBudget: { min: 41000, max: 45000 },
  expectedDeepActivation: { min: 0, max: 500 },
  expectedEconomicRelief: { min: 0, max: 200 },
  expectedBlockedCompliance: { min: 0, max: 200 },
  expectedActivationDebt: { min: 40000, max: 46000 },
  expectedEvidenceQuality: { min: 0.30, max: 0.55 },
  expectedBtiScore: { min: 15, max: 40 },
  expectedWarningsContain: ['L0/L1'],
  doctrineNote: '"Il budget non è un dato valido se non ha una fonte." Eligible records L0 → excluded_from_bti. 0 deep activation. Activation Debt = usable budget. Evidence Debt accumulato.',
};

// ── Scenario 6 — Policy-heavy without budget ─────────────────────────────────
// Smart working, right to disconnect, no meeting friday — no invented EUR.

const SCENARIO_06: BTIScenario = {
  id: 'sc06_policy_heavy_no_budget',
  title: 'Policy strutturali senza budget — nessun EUR inventato',
  inputRecords: [
    makeRaw('s06-r01', 0, {
      'Nome Iniziativa': 'Smart Working Policy Aziendale',
      'Categoria': 'smart working policy',
    }, 'structural_policy'),
    makeRaw('s06-r02', 1, {
      'Nome Iniziativa': 'Diritto alla Disconnessione',
      'Categoria': 'diritto alla disconnessione',
    }, 'structural_policy'),
    makeRaw('s06-r03', 2, {
      'Nome Iniziativa': 'No Meeting Friday Policy',
      'Categoria': 'no meeting friday',
    }, 'structural_policy'),
    makeRaw('s06-r04', 3, {
      'Nome Iniziativa': 'Ferie Illimitate Policy',
      'Categoria': 'ferie illimitate',
    }, 'structural_policy'),
  ],
  expectedTotalBudget: { min: 0, max: 0 },
  expectedDeepActivation: { min: 0, max: 0 },
  expectedEconomicRelief: { min: 0, max: 0 },
  expectedBlockedCompliance: { min: 0, max: 0 },
  expectedActivationDebt: { min: 0, max: 0 },
  expectedEvidenceQuality: { min: 0, max: 0 },
  expectedBtiScore: { min: 0, max: 0 },
  expectedWarningsContain: ['Nessun importo'],
  doctrineNote: 'Policy records: not_applicable. Nessun EUR inventato. Contribuiscono come segnali di attivazione, non come budget BTI.',
};

// ── Scenario 7 — Care Economy budget ─────────────────────────────────────────
// Childcare + caregiver + eldercare + summer camp with invoices/contracts.

const SCENARIO_07: BTIScenario = {
  id: 'sc07_care_economy',
  title: 'Care Economy — asilo nido, caregiver, eldercare con fatture e contratti',
  inputRecords: [
    makeRaw('s07-r01', 0, {
      'Nome Iniziativa': 'Asilo Nido Aziendale Milano',
      'Importo': '48000',
      'Fonte Budget': 'fattura fornitore Kindercare',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'asilo nido',
    }),
    makeRaw('s07-r02', 1, {
      'Nome Iniziativa': 'Programma Caregiver Support',
      'Importo': '12000',
      'Fonte Budget': 'contratto welfare provider',
      'Tipo Evidenza': 'contratto',
      'Categoria': 'caregiver support',
    }),
    makeRaw('s07-r03', 2, {
      'Nome Iniziativa': 'Centri Estivi Aziendali',
      'Importo': '18000',
      'Fonte Budget': 'welfare provider export centri estivi',
      'Tipo Evidenza': 'welfare_provider_export',
      'Categoria': 'centri estivi',
    }),
    makeRaw('s07-r04', 3, {
      'Nome Iniziativa': 'Eldercare Support Program',
      'Importo': '6000',
      'Fonte Budget': 'contratto assistenza anziani',
      'Tipo Evidenza': 'contratto',
      'Categoria': 'cura anziani',
    }),
  ],
  expectedTotalBudget: { min: 82000, max: 86000 },
  expectedDeepActivation: { min: 80000, max: 86000 },
  expectedEconomicRelief: { min: 0, max: 300 },
  expectedBlockedCompliance: { min: 0, max: 300 },
  expectedActivationDebt: { min: 0, max: 3000 },
  expectedEvidenceQuality: { min: 0.75, max: 0.92 },
  expectedBtiScore: { min: 88, max: 100 },
  expectedWarningsContain: [],
  doctrineNote: 'Care Economy con evidenza L3 (fatture, contratti, welfare export). Eligible full_weight. Deep activation ≈ totalBudget. BTI Score alto.',
};

// ── Scenario 8 — Estimated budget scenario ───────────────────────────────────
// Participants × unit cost estimation — confidence_weighted, lower BTI.

const SCENARIO_08: BTIScenario = {
  id: 'sc08_estimated_budget',
  title: 'Budget stimato — partecipanti × costo unitario',
  inputRecords: [
    makeRaw('s08-r01', 0, {
      'Nome Iniziativa': 'Team Cohesion Initiative',
      'Importo': '7500',
      'Fonte Budget': 'stima interna',
      'Note': 'partecipanti x costo unitario — 150 persone × 50€',
      'Categoria': 'team cohesion',
    }),
    makeRaw('s08-r02', 1, {
      'Nome Iniziativa': 'Knowledge Transfer Program',
      'Importo': '19200',
      'Fonte Budget': 'stima hr — ore x costo orario dipendenti',
      'Note': '500 ore × 38.4€/ora',
      'Categoria': 'knowledge transfer',
    }),
    makeRaw('s08-r03', 2, {
      'Nome Iniziativa': 'Programma Inclusione',
      'Importo': '8900',
      'Fonte Budget': 'stima interna budget provider',
      'Tipo Evidenza': 'stima interna',
      'Categoria': 'inclusion program',
    }),
  ],
  expectedTotalBudget: { min: 34000, max: 37000 },
  expectedDeepActivation: { min: 12000, max: 20000 },
  expectedEconomicRelief: { min: 0, max: 500 },
  expectedBlockedCompliance: { min: 0, max: 500 },
  expectedActivationDebt: { min: 18000, max: 26000 },
  expectedEvidenceQuality: { min: 0.25, max: 0.50 },
  expectedBtiScore: { min: 35, max: 65 },
  expectedWarningsContain: [],
  doctrineNote: 'Stima con metodo (ore×costo, partecipanti×costo) = L1 estimated. confidence_weighted riduce contributo deep activation. Activation Debt più elevato rispetto a L3/L4.',
};

// ── Scenario 9 — Review-required ambiguity ───────────────────────────────────
// Records with no eligible/limited/blocked keywords → review_required. Conservative.

const SCENARIO_09: BTIScenario = {
  id: 'sc09_review_required',
  title: 'Records ambigui — review_required, conservativi',
  inputRecords: [
    makeRaw('s09-r01', 0, {
      'Nome Iniziativa': 'Welfare Famiglia Generico',
      'Importo': '5000',
      'Categoria': 'welfare famiglia',
    }),
    makeRaw('s09-r02', 1, {
      'Nome Iniziativa': 'Rimborso Salute Ambiguo',
      'Importo': '16000',
      'Fonte Budget': 'comunicazione interna hr',
      'Categoria': 'benefit sanitario',
    }),
    makeRaw('s09-r03', 2, {
      'Nome Iniziativa': 'Benefit Generico 2025',
      'Importo': '8000',
      'Categoria': 'welfare aziendale',
    }),
  ],
  expectedTotalBudget: { min: 27000, max: 31000 },
  expectedDeepActivation: { min: 0, max: 500 },
  expectedEconomicRelief: { min: 0, max: 500 },
  expectedBlockedCompliance: { min: 0, max: 500 },
  expectedActivationDebt: { min: 26000, max: 31000 },
  expectedEvidenceQuality: { min: 0.30, max: 0.55 },
  expectedBtiScore: { min: 18, max: 42 },
  expectedWarningsContain: ['revisione'],
  doctrineNote: 'Records senza keyword eligible/limited/blocked → review_required. Inclusi conservativamente nel budget aggregato ma esclusi da deep activation spend.',
};

// ── Scenario 10 — Zero budget file ───────────────────────────────────────────
// All records without amounts → BTI non calcolabile.

const SCENARIO_10: BTIScenario = {
  id: 'sc10_zero_budget',
  title: 'File senza importi — BTI non calcolabile',
  inputRecords: [
    makeRaw('s10-r01', 0, {
      'Nome Iniziativa': 'Programma Benessere',
      'Categoria': 'benessere volontario',
    }),
    makeRaw('s10-r02', 1, {
      'Nome Iniziativa': 'Mentoring Aziendale',
      'Categoria': 'mentoring',
    }),
    makeRaw('s10-r03', 2, {
      'Nome Iniziativa': 'Upskilling Platform',
      'Categoria': 'upskilling',
    }),
  ],
  expectedTotalBudget: { min: 0, max: 0 },
  expectedDeepActivation: { min: 0, max: 0 },
  expectedEconomicRelief: { min: 0, max: 0 },
  expectedBlockedCompliance: { min: 0, max: 0 },
  expectedActivationDebt: { min: 0, max: 0 },
  expectedEvidenceQuality: { min: 0, max: 0 },
  expectedBtiScore: { min: 0, max: 0 },
  expectedWarningsContain: ['Nessun importo'],
  doctrineNote: 'Nessun importo estraibile. BTI Score = 0. insufficient_data. I record contribuiscono come segnali di attivazione e classificazione pillar, non come budget.',
};

// ── Scenario 11 — Single L4 verified record ──────────────────────────────────

const SCENARIO_11: BTIScenario = {
  id: 'sc11_single_l4',
  title: 'Record singolo L4 verificato — massima affidabilità',
  inputRecords: [
    makeRaw('s11-r01', 0, {
      'Nome Iniziativa': 'Mental Health Platform — KORA Reviewed',
      'Importo': '50000',
      'Fonte Budget': 'advisor reviewed con audit trail',
      'Tipo Evidenza': 'l4_verified',
      'Categoria': 'mental health program',
    }),
  ],
  expectedTotalBudget: { min: 49000, max: 51000 },
  expectedDeepActivation: { min: 49000, max: 51000 },
  expectedEconomicRelief: { min: 0, max: 100 },
  expectedBlockedCompliance: { min: 0, max: 100 },
  expectedActivationDebt: { min: 0, max: 2000 },
  expectedEvidenceQuality: { min: 0.75, max: 0.92 },
  expectedBtiScore: { min: 90, max: 100 },
  expectedWarningsContain: [],
  doctrineNote: 'L4 + advisor reviewed = full_weight. Massima affidabilità BTI. Activation Debt ≈ 0.',
};

// ── Scenario 12 — All L1 self-declared ───────────────────────────────────────
// All eligible but self-declared → confidence_weighted with L1 penalty.

const SCENARIO_12: BTIScenario = {
  id: 'sc12_all_l1_declared',
  title: 'Tutto dichiarato senza documento — L1 confidence_weighted',
  inputRecords: [
    makeRaw('s12-r01', 0, {
      'Nome Iniziativa': 'Upskilling Python',
      'Importo': '12000',
      'Fonte Budget': 'dichiarato manager',
      'Tipo Evidenza': 'dichiarato',
      'Categoria': 'upskilling',
    }),
    makeRaw('s12-r02', 1, {
      'Nome Iniziativa': 'Team Cohesion',
      'Importo': '8000',
      'Fonte Budget': 'dichiarato hr',
      'Tipo Evidenza': 'dichiarato',
      'Categoria': 'team cohesion',
    }),
    makeRaw('s12-r03', 2, {
      'Nome Iniziativa': 'Volontariato Aziendale',
      'Importo': '5000',
      'Fonte Budget': 'autodichiarato coordinatore',
      'Tipo Evidenza': 'autodichiarato',
      'Categoria': 'volontariato aziendale',
    }),
  ],
  expectedTotalBudget: { min: 23000, max: 27000 },
  expectedDeepActivation: { min: 9000, max: 15000 },
  expectedEconomicRelief: { min: 0, max: 300 },
  expectedBlockedCompliance: { min: 0, max: 300 },
  expectedActivationDebt: { min: 11000, max: 18000 },
  expectedEvidenceQuality: { min: 0.30, max: 0.55 },
  expectedBtiScore: { min: 40, max: 70 },
  expectedWarningsContain: ['L0/L1'],
  doctrineNote: 'dichiarato/autodichiarato = L1. confidence_weighted riduce il contributo BTI. Evidence Debt elevato. Raccogliere documenti di supporto.',
};

// ── Scenario 13 — Mixed evidence levels L4+L3+L2+L1+L0 ──────────────────────

const SCENARIO_13: BTIScenario = {
  id: 'sc13_mixed_evidence',
  title: 'Mix completo L4+L3+L2+L1+L0 — tutti i livelli evidenza',
  inputRecords: [
    makeRaw('s13-r01', 0, {
      'Nome Iniziativa': 'Mental Health L4',
      'Importo': '20000',
      'Fonte Budget': 'advisor reviewed',
      'Tipo Evidenza': 'l4',
      'Categoria': 'mental health program',
    }),
    makeRaw('s13-r02', 1, {
      'Nome Iniziativa': 'Childcare Invoice L3',
      'Importo': '30000',
      'Fonte Budget': 'fattura fornitore',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'childcare',
    }),
    makeRaw('s13-r03', 2, {
      'Nome Iniziativa': 'Upskilling Internal L2',
      'Importo': '15000',
      'Fonte Budget': 'consuntivo interno budget hr',
      'Tipo Evidenza': 'internal_budget_report',
      'Categoria': 'upskilling',
    }),
    makeRaw('s13-r04', 3, {
      'Nome Iniziativa': 'Mentoring Declared L1',
      'Importo': '8000',
      'Fonte Budget': 'dichiarato responsabile',
      'Tipo Evidenza': 'dichiarato',
      'Categoria': 'mentoring',
    }),
    makeRaw('s13-r05', 4, {
      'Nome Iniziativa': 'Benefit Vago L0',
      'Importo': '5000',
      'Categoria': 'formazione volontaria',
    }),
  ],
  expectedTotalBudget: { min: 76000, max: 80000 },
  expectedDeepActivation: { min: 58000, max: 72000 },
  expectedEconomicRelief: { min: 0, max: 500 },
  expectedBlockedCompliance: { min: 0, max: 500 },
  expectedActivationDebt: { min: 8000, max: 22000 },
  expectedEvidenceQuality: { min: 0.65, max: 0.85 },
  expectedBtiScore: { min: 70, max: 92 },
  expectedWarningsContain: [],
  doctrineNote: 'L4/L3/L2: full_weight o confidence_weighted alta. L1: confidence_weighted ridotta. L0: excluded_from_bti. Evidence quality riflette la distribuzione ponderata.',
};

// ── Scenario 14 — High activation debt ───────────────────────────────────────
// Mostly L0 eligible excluded + few L1 confidence_weighted → high debt warning.

const SCENARIO_14: BTIScenario = {
  id: 'sc14_high_activation_debt',
  title: 'Activation Debt elevato — budget disponibile ma non convertito',
  inputRecords: [
    makeRaw('s14-r01', 0, {
      'Nome Iniziativa': 'Budget Upskilling Non Documentato',
      'Importo': '30000',
      'Categoria': 'formazione professionalizzante',
    }),
    makeRaw('s14-r02', 1, {
      'Nome Iniziativa': 'Programma Benessere Non Documentato',
      'Importo': '20000',
      'Categoria': 'wellbeing volontario',
    }),
    makeRaw('s14-r03', 2, {
      'Nome Iniziativa': 'Academy Interna L1',
      'Importo': '8000',
      'Fonte Budget': 'dichiarato',
      'Tipo Evidenza': 'dichiarato',
      'Categoria': 'academy aziendale',
    }),
    makeRaw('s14-r04', 3, {
      'Nome Iniziativa': 'Mentoring Aziendale L1',
      'Importo': '7000',
      'Fonte Budget': 'autodichiarato',
      'Tipo Evidenza': 'autodichiarato',
      'Categoria': 'mentoring',
    }),
  ],
  expectedTotalBudget: { min: 63000, max: 67000 },
  expectedDeepActivation: { min: 5000, max: 12000 },
  expectedEconomicRelief: { min: 0, max: 500 },
  expectedBlockedCompliance: { min: 0, max: 500 },
  expectedActivationDebt: { min: 50000, max: 62000 },
  expectedEvidenceQuality: { min: 0.15, max: 0.45 },
  expectedBtiScore: { min: 15, max: 40 },
  expectedWarningsContain: ['Activation Debt'],
  doctrineNote: 'Budget welfare disponibile (L0 escluso + L1 bassa conf) non converte in deep activation. Activation Debt ratio >60% → warning. Formula disclosure in trace.',
};

// ── Scenario 15 — Perfect all-L4 activation ──────────────────────────────────

const SCENARIO_15: BTIScenario = {
  id: 'sc15_perfect_l4',
  title: 'Attivazione perfetta — tutti L4 verified, eligible',
  inputRecords: [
    makeRaw('s15-r01', 0, {
      'Nome Iniziativa': 'Upskilling Platform L4',
      'Importo': '20000',
      'Fonte Budget': 'kora reviewed con audit trail',
      'Tipo Evidenza': 'l4',
      'Categoria': 'upskilling',
    }),
    makeRaw('s15-r02', 1, {
      'Nome Iniziativa': 'Childcare L4',
      'Importo': '25000',
      'Fonte Budget': 'evidenza verificata terza parte',
      'Tipo Evidenza': 'l4_verified',
      'Categoria': 'childcare',
    }),
    makeRaw('s15-r03', 2, {
      'Nome Iniziativa': 'Volontariato L4',
      'Importo': '15000',
      'Fonte Budget': 'certified advisor report',
      'Tipo Evidenza': 'l4',
      'Categoria': 'volontariato aziendale',
    }),
  ],
  expectedTotalBudget: { min: 58000, max: 62000 },
  expectedDeepActivation: { min: 58000, max: 62000 },
  expectedEconomicRelief: { min: 0, max: 200 },
  expectedBlockedCompliance: { min: 0, max: 200 },
  expectedActivationDebt: { min: 0, max: 2000 },
  expectedEvidenceQuality: { min: 0.75, max: 0.92 },
  expectedBtiScore: { min: 92, max: 100 },
  expectedWarningsContain: [],
  doctrineNote: 'Tutti L4 verified → full_weight. Activation Debt ≈ 0. BTI Score massimo. Scenario "eccellenza evidenza".',
};

// ── Scenario 16 — Mostly blocked (safety company) ────────────────────────────

const SCENARIO_16: BTIScenario = {
  id: 'sc16_mostly_blocked',
  title: 'Azienda safety-intensive — blockedCompliance dominante',
  inputRecords: [
    makeRaw('s16-r01', 0, {
      'Nome Iniziativa': 'D.Lgs 81 Corso Base',
      'Importo': '20000',
      'Fonte Budget': 'fattura ente formazione',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'd.lgs 81',
    }),
    makeRaw('s16-r02', 1, {
      'Nome Iniziativa': 'Patentino Muletti',
      'Importo': '8000',
      'Fonte Budget': 'fattura ente certificazione',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'patentino obbligatorio',
    }),
    makeRaw('s16-r03', 2, {
      'Nome Iniziativa': 'GDPR Obbligatorio',
      'Importo': '3000',
      'Fonte Budget': 'fattura consulente privacy',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'gdpr obbligatorio',
    }),
    makeRaw('s16-r04', 3, {
      'Nome Iniziativa': 'DPI Dispositivi Protezione',
      'Importo': '5000',
      'Fonte Budget': 'fattura fornitore dpi',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'dpi obbligatorio',
    }),
    makeRaw('s16-r05', 4, {
      'Nome Iniziativa': 'Upskilling Digital Skills',
      'Importo': '7000',
      'Fonte Budget': 'purchase order',
      'Tipo Evidenza': 'purchase_order',
      'Categoria': 'digital skills',
    }),
  ],
  expectedTotalBudget: { min: 41000, max: 45000 },
  expectedDeepActivation: { min: 6000, max: 8000 },
  expectedEconomicRelief: { min: 0, max: 200 },
  expectedBlockedCompliance: { min: 34000, max: 38000 },
  expectedActivationDebt: { min: 0, max: 2000 },
  expectedEvidenceQuality: { min: 0.80, max: 0.90 },
  expectedBtiScore: { min: 90, max: 100 },
  expectedWarningsContain: ['compliance obbligatoria'],
  doctrineNote: 'Alta quota compliance (>30%) → warning. Separato correttamente. Tutti i record hanno fatture L3 → alta evidence quality. Il piccolo budget usable è fully activated → deepActivationRatio alto.',
};

// ── Scenario 17 — Balanced deep/relief split ─────────────────────────────────
// Roughly equal deep activation and economic relief.

const SCENARIO_17: BTIScenario = {
  id: 'sc17_balanced_deep_relief',
  title: 'Bilanciamento attivazione/sollievo — split 50/50',
  inputRecords: [
    makeRaw('s17-r01', 0, {
      'Nome Iniziativa': 'Programma Upskilling',
      'Importo': '30000',
      'Fonte Budget': 'fattura formazione',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'upskilling',
    }),
    makeRaw('s17-r02', 1, {
      'Nome Iniziativa': 'Mentoring Platform',
      'Importo': '20000',
      'Fonte Budget': 'fattura piattaforma',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'mentoring',
    }),
    makeRaw('s17-r03', 2, {
      'Nome Iniziativa': 'Buoni Pasto',
      'Importo': '36000',
      'Categoria': 'buoni pasto',
    }),
    makeRaw('s17-r04', 3, {
      'Nome Iniziativa': 'Gift Card',
      'Importo': '14000',
      'Categoria': 'gift card',
    }),
  ],
  expectedTotalBudget: { min: 98000, max: 102000 },
  expectedDeepActivation: { min: 48000, max: 52000 },
  expectedEconomicRelief: { min: 48000, max: 52000 },
  expectedBlockedCompliance: { min: 0, max: 200 },
  expectedActivationDebt: { min: 35000, max: 45000 },
  expectedEvidenceQuality: { min: 0.62, max: 0.68 },
  expectedBtiScore: { min: 62, max: 68 },
  expectedWarningsContain: [],
  doctrineNote: 'Split ~50/50 deep/relief. Deep documented (L3) + relief declared (L0) → evidenceQuality=(50k×0.85+50k×0.45)/100k=0.65. Relief ≤50% usable → nessun warning relief. Activation Debt = usable − deep − relief×0.25.',
};

// ── Scenario 18 — L2 internal documents only ─────────────────────────────────

const SCENARIO_18: BTIScenario = {
  id: 'sc18_l2_internal',
  title: 'Documenti interni L2 — consuntivi e report hr',
  inputRecords: [
    makeRaw('s18-r01', 0, {
      'Nome Iniziativa': 'Academy Upskilling',
      'Importo': '40000',
      'Fonte Budget': 'consuntivo interno budget formazione',
      'Tipo Evidenza': 'internal_budget_report',
      'Categoria': 'academy aziendale',
    }),
    makeRaw('s18-r02', 1, {
      'Nome Iniziativa': 'Programma Mentoring',
      'Importo': '15000',
      'Fonte Budget': 'report hr budget mentoring',
      'Tipo Evidenza': 'hr report',
      'Categoria': 'mentoring',
    }),
    makeRaw('s18-r03', 2, {
      'Nome Iniziativa': 'Wellbeing Internal',
      'Importo': '20000',
      'Fonte Budget': 'budget interno wellness q3',
      'Tipo Evidenza': 'budget interno',
      'Categoria': 'wellbeing volontario',
    }),
  ],
  expectedTotalBudget: { min: 73000, max: 77000 },
  expectedDeepActivation: { min: 45000, max: 60000 },
  expectedEconomicRelief: { min: 0, max: 300 },
  expectedBlockedCompliance: { min: 0, max: 300 },
  expectedActivationDebt: { min: 18000, max: 32000 },
  expectedEvidenceQuality: { min: 0.80, max: 0.90 },
  expectedBtiScore: { min: 78, max: 84 },
  expectedWarningsContain: [],
  doctrineNote: 'L2 internal = budgetStatus documented → evidenceQuality=0.85. treatment=confidence_weighted (conf=0.72) riduce deepActivation. complianceClarity=deep/usable=0.72 → btiScore ~81.',
};

// ── Scenario 19 — Care Economy estimated budget ──────────────────────────────
// Childcare + caregiver with estimation methods (no invoices).

const SCENARIO_19: BTIScenario = {
  id: 'sc19_care_estimated',
  title: 'Care Economy stimata — senza fatture, metodo stima dichiarato',
  inputRecords: [
    makeRaw('s19-r01', 0, {
      'Nome Iniziativa': 'Contributo Nido Aziendale',
      'Importo': '24000',
      'Fonte Budget': 'stima interna — contributo €200/mese × 10 famiglie × 12 mesi',
      'Tipo Evidenza': 'stima interna',
      'Categoria': 'asilo nido',
    }),
    makeRaw('s19-r02', 1, {
      'Nome Iniziativa': 'Supporto Caregiver',
      'Importo': '9600',
      'Fonte Budget': 'stima hr — voucher caregiver × dipendenti',
      'Tipo Evidenza': 'stima hr',
      'Categoria': 'caregiver',
    }),
    makeRaw('s19-r03', 2, {
      'Nome Iniziativa': 'Centri Estivi',
      'Importo': '18000',
      'Fonte Budget': 'stima interna',
      'Tipo Evidenza': 'stima interna',
      'Categoria': 'centri estivi',
    }),
  ],
  expectedTotalBudget: { min: 50000, max: 54000 },
  expectedDeepActivation: { min: 15000, max: 28000 },
  expectedEconomicRelief: { min: 0, max: 500 },
  expectedBlockedCompliance: { min: 0, max: 500 },
  expectedActivationDebt: { min: 25000, max: 38000 },
  expectedEvidenceQuality: { min: 0.25, max: 0.50 },
  expectedBtiScore: { min: 30, max: 60 },
  expectedWarningsContain: [],
  doctrineNote: 'Care Economy con stima interna (L1). confidence_weighted riduce contributo. Segnali care rilevati anche con evidenza debole. Raccogliere contratti/fatture per L3.',
};

// ── Scenario 20 — Multi-pillar eligible ──────────────────────────────────────
// One eligible record for each of the 5 pillars, mixed L3/L2.

const SCENARIO_20: BTIScenario = {
  id: 'sc20_multi_pillar',
  title: 'Multi-pilastro — un record per ogni pillar KORA',
  inputRecords: [
    makeRaw('s20-r01', 0, {
      'Nome Iniziativa': 'Check-Up Extra Prevenzione',
      'Importo': '14000',
      'Fonte Budget': 'fattura clinica partner',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'prevenzione extra',
    }),
    makeRaw('s20-r02', 1, {
      'Nome Iniziativa': 'Certificazione Cloud AWS',
      'Importo': '22000',
      'Fonte Budget': 'purchase order',
      'Tipo Evidenza': 'purchase_order',
      'Categoria': 'certificazione professionale',
    }),
    makeRaw('s20-r03', 2, {
      'Nome Iniziativa': 'Programma Inclusione Diversità',
      'Importo': '10000',
      'Fonte Budget': 'consuntivo interno',
      'Tipo Evidenza': 'internal_budget_report',
      'Categoria': 'inclusion program',
    }),
    makeRaw('s20-r04', 3, {
      'Nome Iniziativa': 'Volontariato Territoriale',
      'Importo': '6000',
      'Fonte Budget': 'welfare provider export',
      'Tipo Evidenza': 'welfare_provider_export',
      'Categoria': 'volontariato aziendale',
    }),
    makeRaw('s20-r05', 4, {
      'Nome Iniziativa': 'Knowledge Transfer Senior-Junior',
      'Importo': '8000',
      'Fonte Budget': 'fattura partner knowledge',
      'Tipo Evidenza': 'invoice',
      'Categoria': 'knowledge transfer',
    }),
  ],
  expectedTotalBudget: { min: 58000, max: 62000 },
  expectedDeepActivation: { min: 45000, max: 62000 },
  expectedEconomicRelief: { min: 0, max: 500 },
  expectedBlockedCompliance: { min: 0, max: 500 },
  expectedActivationDebt: { min: 0, max: 18000 },
  expectedEvidenceQuality: { min: 0.60, max: 0.88 },
  expectedBtiScore: { min: 90, max: 97 },
  expectedWarningsContain: [],
  doctrineNote: 'Copertura tutti e 5 i pillar (LIFE/GROWTH/CONNECTION/IMPACT/LEGACY). Mix L3/L2. 4×L3 full_weight + 1×L2 confidence_weighted (0.72). deepActivation=57200, deepRatio=0.953 → btiScore ~94.',
};

// ── All scenarios ─────────────────────────────────────────────────────────────

export const BTI_SCENARIOS: BTIScenario[] = [
  SCENARIO_01, SCENARIO_02, SCENARIO_03, SCENARIO_04, SCENARIO_05,
  SCENARIO_06, SCENARIO_07, SCENARIO_08, SCENARIO_09, SCENARIO_10,
  SCENARIO_11, SCENARIO_12, SCENARIO_13, SCENARIO_14, SCENARIO_15,
  SCENARIO_16, SCENARIO_17, SCENARIO_18, SCENARIO_19, SCENARIO_20,
];

// ── Runner ────────────────────────────────────────────────────────────────────

export function runBTIExamples(): BTIScenarioResult[] {
  return BTI_SCENARIOS.map((scenario) => {
    const actual = computeBTIFromRecords(scenario.inputRecords);
    const failures: string[] = [];

    const totalBudgetMatch = scenario.expectedTotalBudget === null
      ? true
      : inRange(actual.totalBudget, scenario.expectedTotalBudget);
    if (!totalBudgetMatch)
      failures.push(
        `totalBudget: expected ${JSON.stringify(scenario.expectedTotalBudget)}, got ${actual.totalBudget}`,
      );

    const deepActivationMatch = inRange(actual.deepActivationSpend, scenario.expectedDeepActivation);
    if (!deepActivationMatch)
      failures.push(
        `deepActivationSpend: expected ${JSON.stringify(scenario.expectedDeepActivation)}, got ${actual.deepActivationSpend}`,
      );

    const economicReliefMatch = inRange(actual.economicReliefSpend, scenario.expectedEconomicRelief);
    if (!economicReliefMatch)
      failures.push(
        `economicReliefSpend: expected ${JSON.stringify(scenario.expectedEconomicRelief)}, got ${actual.economicReliefSpend}`,
      );

    const blockedComplianceMatch = inRange(actual.blockedComplianceSpend, scenario.expectedBlockedCompliance);
    if (!blockedComplianceMatch)
      failures.push(
        `blockedComplianceSpend: expected ${JSON.stringify(scenario.expectedBlockedCompliance)}, got ${actual.blockedComplianceSpend}`,
      );

    const activationDebtMatch = inRange(actual.activationDebt, scenario.expectedActivationDebt);
    if (!activationDebtMatch)
      failures.push(
        `activationDebt: expected ${JSON.stringify(scenario.expectedActivationDebt)}, got ${actual.activationDebt}`,
      );

    const evidenceQualityMatch = inRange(actual.budgetEvidenceQuality, scenario.expectedEvidenceQuality);
    if (!evidenceQualityMatch)
      failures.push(
        `budgetEvidenceQuality: expected ${JSON.stringify(scenario.expectedEvidenceQuality)}, got ${actual.budgetEvidenceQuality}`,
      );

    const btiScoreMatch = inRange(actual.btiScore, scenario.expectedBtiScore);
    if (!btiScoreMatch)
      failures.push(
        `btiScore: expected ${JSON.stringify(scenario.expectedBtiScore)}, got ${actual.btiScore}`,
      );

    const warningsText = actual.warnings.join(' ').toLowerCase();
    const warningsMatch = scenario.expectedWarningsContain.every((w) =>
      warningsText.includes(w.toLowerCase()),
    );
    if (!warningsMatch) {
      const missing = scenario.expectedWarningsContain.filter(
        (w) => !warningsText.includes(w.toLowerCase()),
      );
      failures.push(`warnings missing: [${missing.join(', ')}]`);
    }

    return {
      id: scenario.id,
      title: scenario.title,
      passed: failures.length === 0,
      totalBudgetMatch,
      deepActivationMatch,
      economicReliefMatch,
      blockedComplianceMatch,
      activationDebtMatch,
      evidenceQualityMatch,
      btiScoreMatch,
      warningsMatch,
      actualResult: actual,
      failureReason: failures.length > 0 ? failures.join(' | ') : null,
    };
  });
}

export function summarizeBTIExamples(results: BTIScenarioResult[]): BTIExampleSummary {
  const failed = results.filter((r) => !r.passed);
  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: failed.length,
    failedIds: failed.map((r) => r.id),
  };
}
