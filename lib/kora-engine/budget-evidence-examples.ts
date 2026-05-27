// lib/kora-engine/budget-evidence-examples.ts
// 35 reference examples for the Budget Evidence Engine v0.1.
// Covers all status/level/treatment combinations across canonical Italian/English scenarios.
// Use with runBudgetEvidenceExamples() for automated verification.

import type {
  RawUploadedRecord,
  BudgetEvidence,
  BudgetStatus,
  BudgetEvidenceLevel,
  BudgetEvidenceType,
  BTITreatment,
} from './types';
import { assessBudgetEvidence } from './budget-evidence';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface BudgetEvidenceExample {
  id: string;
  title: string;
  inputRecord: RawUploadedRecord;
  expectedStatus: BudgetStatus;
  expectedLevel: BudgetEvidenceLevel;
  // null = skip type check (any type accepted)
  expectedEvidenceType: BudgetEvidenceType | null;
  expectedBtiTreatment: BTITreatment;
  expectedConfidenceBand: { min: number; max: number };
  // null = must be null; number = must equal (±1); 'any' = skip check
  expectedAmount: number | null | 'any';
  expectedNotesContains: string[];
  doctrineNote: string;
}

export interface BudgetEvidenceExampleResult {
  id: string;
  title: string;
  passed: boolean;
  statusMatch: boolean;
  levelMatch: boolean;
  typeMatch: boolean;
  treatmentMatch: boolean;
  confidenceInBand: boolean;
  amountMatch: boolean;
  notesMatch: boolean;
  expectedStatus: BudgetStatus;
  actualStatus: BudgetStatus;
  expectedLevel: BudgetEvidenceLevel;
  actualLevel: BudgetEvidenceLevel;
  expectedBtiTreatment: BTITreatment;
  actualBtiTreatment: BTITreatment;
  actualConfidence: number;
  expectedConfidenceBand: { min: number; max: number };
  actualAmount: number | null;
  failureReason: string | null;
  fullResult: BudgetEvidence;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function makeRaw(
  id: string,
  rowIndex: number,
  raw: Record<string, unknown>,
  detectedRecordType: RawUploadedRecord['detectedRecordType'] = 'welfare_program',
): RawUploadedRecord {
  return { recordId: id, batchId: 'be_examples_batch_v01', raw, rowIndex, detectedRecordType };
}

// ── Documented / L3–L4 examples (1–5) ────────────────────────────────────────

const EXAMPLE_01: BudgetEvidenceExample = {
  id: 'doc_01_invoice_childcare',
  title: 'Fattura fornitore asilo nido aziendale',
  inputRecord: makeRaw('be-doc-01', 0, {
    'Nome Iniziativa': 'Nido Aziendale TechCorp',
    'Importo': '48000',
    'Fonte Budget': 'fattura fornitore Kindercare',
    'Tipo Evidenza': 'invoice',
    'Categoria': 'childcare',
  }),
  expectedStatus: 'documented',
  expectedLevel: 'L3_THIRD_PARTY_DOCUMENT',
  expectedEvidenceType: 'invoice',
  expectedBtiTreatment: 'full_weight',
  expectedConfidenceBand: { min: 0.75, max: 0.92 },
  expectedAmount: 48000,
  expectedNotesContains: ['terza parte', 'alta affidabilità'],
  doctrineNote: 'Fattura fornitore = L3. Importo documentato. full_weight BTI. Massima affidabilità per evidenza di terza parte.',
};

const EXAMPLE_02: BudgetEvidenceExample = {
  id: 'doc_02_contract_mental_health',
  title: 'Contratto fornitore mental health platform',
  inputRecord: makeRaw('be-doc-02', 1, {
    'Nome Iniziativa': 'Mental Health Platform Aziendale',
    'Importo': '24000',
    'Fonte Budget': 'contratto welfare provider',
    'Tipo Evidenza': 'contratto',
    'Categoria': 'benessere psicologico',
  }),
  expectedStatus: 'documented',
  expectedLevel: 'L3_THIRD_PARTY_DOCUMENT',
  expectedEvidenceType: 'contract',
  expectedBtiTreatment: 'full_weight',
  expectedConfidenceBand: { min: 0.75, max: 0.92 },
  expectedAmount: 24000,
  expectedNotesContains: ['terza parte'],
  doctrineNote: 'Contratto welfare provider = L3. full_weight BTI. Mental health come infrastruttura organizzativa — mai dati individuali.',
};

const EXAMPLE_03: BudgetEvidenceExample = {
  id: 'doc_03_welfare_export_meal_vouchers',
  title: 'Welfare provider export buoni pasto',
  inputRecord: makeRaw('be-doc-03', 2, {
    'Nome Iniziativa': 'Buoni Pasto Mensili',
    'Importo': '85000',
    'Fonte Budget': 'welfare provider export',
    'Tipo Evidenza': 'welfare_provider_export',
    'Categoria': 'buoni pasto',
  }),
  expectedStatus: 'documented',
  expectedLevel: 'L3_THIRD_PARTY_DOCUMENT',
  expectedEvidenceType: 'welfare_provider_export',
  // Buoni pasto = limited (cash-like) → tracked_only even with L3 evidence.
  expectedBtiTreatment: 'tracked_only',
  expectedConfidenceBand: { min: 0.70, max: 0.92 },
  expectedAmount: 85000,
  expectedNotesContains: ['cash-like', 'economic_relief_spend'],
  doctrineNote: 'Buoni pasto = limited/cash-like. Anche con L3 evidence, BTI treatment = tracked_only. Non genera IU di attivazione.',
};

const EXAMPLE_04: BudgetEvidenceExample = {
  id: 'doc_04_lms_export_upskilling',
  title: 'LMS export academy upskilling AI',
  inputRecord: makeRaw('be-doc-04', 3, {
    'Nome Iniziativa': 'AI Skills Program — Upskilling',
    'Importo': '36000',
    'Fonte Budget': 'lms export piattaforma learning',
    'Tipo Evidenza': 'lms_export',
    'Categoria': 'digital skills',
  }, 'training'),
  expectedStatus: 'documented',
  expectedLevel: 'L3_THIRD_PARTY_DOCUMENT',
  expectedEvidenceType: 'lms_export',
  expectedBtiTreatment: 'full_weight',
  expectedConfidenceBand: { min: 0.75, max: 0.92 },
  expectedAmount: 36000,
  expectedNotesContains: ['terza parte'],
  doctrineNote: 'LMS export = L3. Upskilling volontario eligible. full_weight BTI.',
};

const EXAMPLE_05: BudgetEvidenceExample = {
  id: 'doc_05_advisor_reviewed',
  title: 'Evidenza verificata — advisor reviewed L4',
  inputRecord: makeRaw('be-doc-05', 4, {
    'Nome Iniziativa': 'Programma Volontariato Aziendale',
    'Importo': '18500',
    'Fonte Budget': 'advisor reviewed — evidenza verificata KORA advisor',
    'Tipo Evidenza': 'evidenza verificata',
    'Categoria': 'volontariato',
  }),
  expectedStatus: 'documented',
  expectedLevel: 'L4_VERIFIED_EVIDENCE',
  expectedEvidenceType: null,
  expectedBtiTreatment: 'full_weight',
  expectedConfidenceBand: { min: 0.88, max: 0.97 },
  expectedAmount: 18500,
  expectedNotesContains: ['verificata', 'massima affidabilità'],
  doctrineNote: 'Advisor reviewed = L4. Massima affidabilità. full_weight BTI. Confidence vicino a 0.95.',
};

// ── Internal / L2 examples (6–10) ─────────────────────────────────────────────

const EXAMPLE_06: BudgetEvidenceExample = {
  id: 'int_06_hr_budget_report',
  title: 'Report budget HR interno',
  inputRecord: makeRaw('be-int-06', 5, {
    'Nome Iniziativa': 'Programma Benessere Volontario',
    'Importo': '12000',
    'Fonte Budget': 'internal budget report HR',
    'Tipo Evidenza': 'internal_budget_report',
    'Categoria': 'wellbeing volontario',
  }),
  expectedStatus: 'documented',
  expectedLevel: 'L2_INTERNAL_DOCUMENT',
  expectedEvidenceType: 'internal_budget_report',
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.60, max: 0.75 },
  expectedAmount: 12000,
  expectedNotesContains: ['Documento interno', 'confidenza media'],
  doctrineNote: 'Internal budget report = L2. confidence_weighted BTI. Raccomandato: integrare con L3 per full_weight.',
};

const EXAMPLE_07: BudgetEvidenceExample = {
  id: 'int_07_payroll_aggregate',
  title: 'Aggregato payroll formazione',
  inputRecord: makeRaw('be-int-07', 6, {
    'Nome Iniziativa': 'Reskilling Academy Digitale',
    'Importo': '52000',
    'Fonte Budget': 'payroll aggregate HR',
    'Tipo Evidenza': 'payroll_aggregate',
    'Categoria': 'reskilling',
  }, 'training'),
  expectedStatus: 'documented',
  expectedLevel: 'L2_INTERNAL_DOCUMENT',
  expectedEvidenceType: 'payroll_aggregate',
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.60, max: 0.75 },
  expectedAmount: 52000,
  expectedNotesContains: ['Documento interno'],
  doctrineNote: 'Payroll aggregate = L2. confidence_weighted. Dati salariali aggregati — mai dati individuali.',
};

const EXAMPLE_08: BudgetEvidenceExample = {
  id: 'int_08_cost_center_export',
  title: 'Export contabilità analitica centro di costo',
  inputRecord: makeRaw('be-int-08', 7, {
    'Nome Iniziativa': 'Mentoring Generazionale',
    'Importo': '8500',
    'Fonte Budget': 'contabilita analitica — centro di costo welfare',
    'Tipo Evidenza': 'accounting export',
    'Categoria': 'legacy program',
  }),
  expectedStatus: 'documented',
  expectedLevel: 'L2_INTERNAL_DOCUMENT',
  expectedEvidenceType: 'internal_budget_report',
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.60, max: 0.75 },
  expectedAmount: 8500,
  expectedNotesContains: ['Documento interno'],
  doctrineNote: 'Contabilità analitica / centro di costo = L2. confidence_weighted. Fonte interna ma non certificata esternamente.',
};

const EXAMPLE_09: BudgetEvidenceExample = {
  id: 'int_09_internal_training_budget',
  title: 'Budget formazione interno — report HR',
  inputRecord: makeRaw('be-int-09', 8, {
    'Nome Iniziativa': 'Certificazione Competenze Digitali',
    'Importo': '1.234,56',
    'Fonte Budget': 'report hr — budget interno formazione',
    'Tipo Evidenza': 'budget hr',
    'Categoria': 'certificazione professionale',
  }, 'training'),
  expectedStatus: 'documented',
  expectedLevel: 'L2_INTERNAL_DOCUMENT',
  expectedEvidenceType: 'internal_budget_report',
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.60, max: 0.75 },
  expectedAmount: 1234.56,
  expectedNotesContains: ['Documento interno'],
  doctrineNote: 'Budget HR interno = L2. Importo in formato italiano "1.234,56" → 1234.56. confidence_weighted.',
};

const EXAMPLE_10: BudgetEvidenceExample = {
  id: 'int_10_esg_social_budget',
  title: 'Report budget ESG / iniziative sociali',
  inputRecord: makeRaw('be-int-10', 9, {
    'Nome Iniziativa': 'Volontariato Ambientale Aziendale',
    'Importo': '9800',
    'Fonte Budget': 'report interno ESG — rendiconto iniziative sociali',
    'Tipo Evidenza': 'report interno',
    'Categoria': 'environmental volunteering',
  }),
  expectedStatus: 'documented',
  expectedLevel: 'L2_INTERNAL_DOCUMENT',
  expectedEvidenceType: 'internal_budget_report',
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.60, max: 0.75 },
  expectedAmount: 9800,
  expectedNotesContains: ['Documento interno'],
  doctrineNote: 'Report interno ESG = L2. confidence_weighted. ESG reporting non sostituisce evidenza di terza parte per BTI full_weight.',
};

// ── Declared / L1 examples (11–15) ────────────────────────────────────────────

const EXAMPLE_11: BudgetEvidenceExample = {
  id: 'dec_11_hr_self_declared',
  title: 'HR self-declared estimate — benessere',
  inputRecord: makeRaw('be-dec-11', 10, {
    'Nome Iniziativa': 'Programma Caregiver Support',
    'Importo': '15000',
    'Fonte Budget': 'self declared — dichiarato HR',
    'Tipo Evidenza': 'self_declared',
    'Categoria': 'caregiver',
  }),
  expectedStatus: 'declared',
  expectedLevel: 'L1_SELF_DECLARED',
  expectedEvidenceType: 'self_declared',
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.35, max: 0.52 },
  expectedAmount: 15000,
  expectedNotesContains: ['autodichiarata', 'penalità'],
  doctrineNote: 'Self-declared = L1. confidence_weighted con heavy discount. Raccomandato: aggiungere fattura o contratto.',
};

const EXAMPLE_12: BudgetEvidenceExample = {
  id: 'dec_12_spreadsheet_aziendale',
  title: 'Spreadsheet aziendale budget welfare',
  inputRecord: makeRaw('be-dec-12', 11, {
    'Nome Iniziativa': 'Eldercare Aziendale',
    'Importo': '6200',
    'Fonte Budget': 'spreadsheet aziendale Excel HR',
    'Tipo Evidenza': 'spreadsheet aziendale',
    'Categoria': 'cura anziani',
  }),
  expectedStatus: 'declared',
  expectedLevel: 'L1_SELF_DECLARED',
  expectedEvidenceType: 'self_declared',
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.35, max: 0.52 },
  expectedAmount: 6200,
  expectedNotesContains: ['autodichiarata'],
  doctrineNote: 'Spreadsheet aziendale = L1 (self_declared). Fonte interna non verificabile esternamente.',
};

const EXAMPLE_13: BudgetEvidenceExample = {
  id: 'dec_13_manual_entry',
  title: 'Input manuale budget programma',
  inputRecord: makeRaw('be-dec-13', 12, {
    'Nome Iniziativa': 'Buddy Program Onboarding',
    'Importo': '3500',
    'Fonte Budget': 'input manuale — inserimento manuale budget',
    'Tipo Evidenza': 'manual entry',
    'Categoria': 'onboarding buddy',
  }),
  expectedStatus: 'declared',
  expectedLevel: 'L1_SELF_DECLARED',
  expectedEvidenceType: 'self_declared',
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.35, max: 0.52 },
  expectedAmount: 3500,
  expectedNotesContains: ['autodichiarata'],
  doctrineNote: 'Input manuale = L1. Nessuna traccia documentale. Confidence < 0.52.',
};

const EXAMPLE_14: BudgetEvidenceExample = {
  id: 'dec_14_stima_hr_caregiver',
  title: 'Stima HR programma caregiver',
  inputRecord: makeRaw('be-dec-14', 13, {
    'Nome Iniziativa': 'Programma Supporto Caregiver',
    'Importo': '11000',
    'Fonte Budget': 'stima hr — dichiarato responsabile welfare',
    'Tipo Evidenza': 'hr estimate',
    'Categoria': 'caregiver',
  }),
  expectedStatus: 'estimated',
  expectedLevel: 'L1_SELF_DECLARED',
  expectedEvidenceType: 'hr_estimate',
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.35, max: 0.52 },
  expectedAmount: 11000,
  expectedNotesContains: ['stimato'],
  doctrineNote: 'Stima HR = L1 (hr_estimate) + estimated (stima trigger). Fonte interna senza documento formale. confidence_weighted con cap stima.',
};

const EXAMPLE_15: BudgetEvidenceExample = {
  id: 'dec_15_declared_volunteering',
  title: 'Budget volontariato dichiarato',
  inputRecord: makeRaw('be-dec-15', 14, {
    'Nome Iniziativa': 'Giornata di Volontariato Aziendale',
    'Importo': '4800',
    'Fonte Budget': 'dichiarato — comunicazione interna HR',
    'Tipo Evidenza': 'dichiarato',
    'Categoria': 'volontariato aziendale',
  }),
  expectedStatus: 'declared',
  expectedLevel: 'L1_SELF_DECLARED',
  expectedEvidenceType: 'self_declared',
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.35, max: 0.52 },
  expectedAmount: 4800,
  expectedNotesContains: ['autodichiarata'],
  doctrineNote: 'Budget dichiarato senza documento formale = L1. confidence_weighted con discount.',
};

// ── Estimated examples (16–20) ────────────────────────────────────────────────

const EXAMPLE_16: BudgetEvidenceExample = {
  id: 'est_16_participants_x_unit_cost',
  title: 'Stima: partecipanti × costo unitario',
  inputRecord: makeRaw('be-est-16', 15, {
    'Nome Iniziativa': 'Team Cohesion Initiative',
    'Importo': '7500',
    'Fonte Budget': 'stima interna',
    'Note': 'partecipanti x costo unitario per sessione — 150 persone × 50€',
    'Categoria': 'team cohesion',
  }),
  expectedStatus: 'estimated',
  expectedLevel: 'L1_SELF_DECLARED',
  expectedEvidenceType: null,
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.30, max: 0.58 },
  expectedAmount: 7500,
  expectedNotesContains: ['stimato', 'stima'],
  doctrineNote: 'Stima partecipanti × costo unitario = estimated L1. Metodo di stima documentato nel campo Note. confidence_weighted con cap a 0.55.',
};

const EXAMPLE_17: BudgetEvidenceExample = {
  id: 'est_17_hours_x_cost',
  title: 'Stima: ore × costo orario',
  inputRecord: makeRaw('be-est-17', 16, {
    'Nome Iniziativa': 'Knowledge Transfer Program',
    'Importo': '19200',
    'Fonte Budget': 'stima hr — ore x costo orario dipendenti',
    'Note': 'ore dedicate al programma × costo orario medio',
    'Categoria': 'knowledge transfer',
  }),
  expectedStatus: 'estimated',
  expectedLevel: 'L1_SELF_DECLARED',
  expectedEvidenceType: null,
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.30, max: 0.58 },
  expectedAmount: 19200,
  expectedNotesContains: ['stimato'],
  doctrineNote: 'Stima ore × costo orario = estimated. Metodo indiretto accettabile per pilot.',
};

const EXAMPLE_18: BudgetEvidenceExample = {
  id: 'est_18_voucher_x_users',
  title: 'Stima: valore voucher × utenti',
  inputRecord: makeRaw('be-est-18', 17, {
    'Nome Iniziativa': 'Centri Estivi Dipendenti',
    'Importo': '22500',
    'Fonte Budget': 'stima — valore voucher x utenti: 500€ × 45 dipendenti',
    'Categoria': 'summer camp',
  }),
  expectedStatus: 'estimated',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: null,
  expectedBtiTreatment: 'excluded_from_bti',
  expectedConfidenceBand: { min: 0.05, max: 0.22 },
  expectedAmount: 22500,
  expectedNotesContains: ['Nessuna fonte'],
  doctrineNote: 'Stima con "voucher x utenti" senza keyword L1 riconosciuto → L0 per design conservativo. "Il budget non è un dato valido se non ha una fonte." Evidence Debt accumulato.',
};

const EXAMPLE_19: BudgetEvidenceExample = {
  id: 'est_19_estimated_provider_cost',
  title: 'Costo fornitore stimato',
  inputRecord: makeRaw('be-est-19', 18, {
    'Nome Iniziativa': 'Programma Inclusione e Diversita',
    'Importo': '8900',
    'Fonte Budget': 'estimated provider cost — stima interna budget provider',
    'Tipo Evidenza': 'stima interna',
    'Categoria': 'inclusion program',
  }),
  expectedStatus: 'estimated',
  expectedLevel: 'L1_SELF_DECLARED',
  expectedEvidenceType: null,
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.30, max: 0.58 },
  expectedAmount: 8900,
  expectedNotesContains: ['stimato'],
  doctrineNote: 'Costo provider stimato internamente = estimated L1. Upgrade a L3 con contratto o fattura fornitore.',
};

const EXAMPLE_20: BudgetEvidenceExample = {
  id: 'est_20_estimated_event_cost',
  title: 'Costo evento stimato',
  inputRecord: makeRaw('be-est-20', 19, {
    'Nome Iniziativa': 'Community Project Territoriale',
    'Importo': '3200',
    'Fonte Budget': 'stima costo evento — budget stimato organizzazione',
    'Categoria': 'community project',
  }),
  expectedStatus: 'estimated',
  expectedLevel: 'L1_SELF_DECLARED',
  expectedEvidenceType: null,
  expectedBtiTreatment: 'confidence_weighted',
  expectedConfidenceBand: { min: 0.30, max: 0.58 },
  expectedAmount: 3200,
  expectedNotesContains: ['stimato'],
  doctrineNote: 'Budget evento stimato = estimated. Accettabile per pilot, non per produzione senza documento.',
};

// ── Not available / L0 examples (21–23) ───────────────────────────────────────

const EXAMPLE_21: BudgetEvidenceExample = {
  id: 'na_21_childcare_no_budget',
  title: 'Programma childcare — nessun budget presente',
  inputRecord: makeRaw('be-na-21', 20, {
    'Nome Iniziativa': 'Nido Aziendale Milano',
    'Categoria': 'childcare',
    'Fornitore': 'Kindercare',
  }),
  expectedStatus: 'not_available',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: 'not_available',
  expectedBtiTreatment: 'excluded_from_bti',
  expectedConfidenceBand: { min: 0.05, max: 0.22 },
  expectedAmount: null,
  expectedNotesContains: ['Evidence Debt'],
  doctrineNote: 'Childcare senza importo e senza fonte = not_available L0. Escluso da BTI. Evidence Debt accumulato. Note: buildNotes segue il branch L0 (non il branch not_available).',
};

const EXAMPLE_22: BudgetEvidenceExample = {
  id: 'na_22_upskilling_blank_source',
  title: 'Programma upskilling — fonte vuota',
  inputRecord: makeRaw('be-na-22', 21, {
    'Nome Iniziativa': 'Reskilling Academy',
    'Importo': '',
    'Fonte Budget': '',
    'Categoria': 'reskilling',
  }, 'training'),
  expectedStatus: 'not_available',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: 'not_available',
  expectedBtiTreatment: 'excluded_from_bti',
  expectedConfidenceBand: { min: 0.05, max: 0.22 },
  expectedAmount: null,
  expectedNotesContains: ['Evidence Debt'],
  doctrineNote: 'Importo e fonte vuoti = not_available L0. Il campo vuoto è equivalente ad assenza di evidenza.',
};

const EXAMPLE_23: BudgetEvidenceExample = {
  id: 'na_23_generic_welfare_no_evidence',
  title: 'Record welfare generico — nessun importo né fonte',
  inputRecord: makeRaw('be-na-23', 22, {
    'Nome Iniziativa': 'Welfare Aziendale',
    'Categoria': 'welfare',
  }),
  expectedStatus: 'not_available',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: 'not_available',
  expectedBtiTreatment: 'excluded_from_bti',
  expectedConfidenceBand: { min: 0.05, max: 0.22 },
  expectedAmount: null,
  expectedNotesContains: ['Evidence Debt'],
  doctrineNote: 'Record generico senza dati economici = not_available L0. Escluso da BTI. Non può essere utilizzato senza evidenza.',
};

// ── Not applicable policy examples (24–27) ────────────────────────────────────

const EXAMPLE_24: BudgetEvidenceExample = {
  id: 'policy_24_smart_working',
  title: 'Smart working policy — non monetary',
  inputRecord: makeRaw('be-policy-24', 23, {
    'Nome Iniziativa': 'Smart Working Policy Formale',
    'Categoria': 'policy formale',
    'Descrizione': 'Smart working policy aziendale oltre il minimo contrattuale',
  }, 'structural_policy'),
  expectedStatus: 'not_applicable',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: 'not_applicable',
  expectedBtiTreatment: 'not_applicable',
  expectedConfidenceBand: { min: 0.72, max: 0.88 },
  expectedAmount: null,
  expectedNotesContains: ['Policy/non-monetary', 'activation signals'],
  doctrineNote: 'Smart working policy = not_applicable. Nessun importo inventato. Analizzabile per segnali di attivazione.',
};

const EXAMPLE_25: BudgetEvidenceExample = {
  id: 'policy_25_right_to_disconnect',
  title: 'Diritto alla disconnessione — non monetary',
  inputRecord: makeRaw('be-policy-25', 24, {
    'Nome Iniziativa': 'Diritto alla Disconnessione Policy Formale',
    'Categoria': 'policy formale',
    'Descrizione': 'Policy formale diritto alla disconnessione oltre minimo contrattuale',
  }, 'structural_policy'),
  expectedStatus: 'not_applicable',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: 'not_applicable',
  expectedBtiTreatment: 'not_applicable',
  expectedConfidenceBand: { min: 0.72, max: 0.88 },
  expectedAmount: null,
  expectedNotesContains: ['Policy/non-monetary'],
  doctrineNote: 'Diritto alla disconnessione = structural policy. BTI not_applicable. No budget invented.',
};

const EXAMPLE_26: BudgetEvidenceExample = {
  id: 'policy_26_no_meeting_friday',
  title: 'No Meeting Friday — non monetary',
  inputRecord: makeRaw('be-policy-26', 25, {
    'Nome Iniziativa': 'No Meeting Friday',
    'Categoria': 'policy benessere',
    'Descrizione': 'Politica no riunioni il venerdi per tutta la forza lavoro',
  }, 'structural_policy'),
  expectedStatus: 'not_applicable',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: 'not_applicable',
  expectedBtiTreatment: 'not_applicable',
  expectedConfidenceBand: { min: 0.72, max: 0.88 },
  expectedAmount: null,
  expectedNotesContains: ['Policy/non-monetary'],
  doctrineNote: 'No Meeting Friday = structural policy non-monetary. BTI not_applicable.',
};

const EXAMPLE_27: BudgetEvidenceExample = {
  id: 'policy_27_unlimited_leave',
  title: 'Ferie illimitate — non monetary',
  inputRecord: makeRaw('be-policy-27', 26, {
    'Nome Iniziativa': 'Ferie Illimitate Policy',
    'Categoria': 'policy hr',
    'Descrizione': 'Politica ferie illimitate per dipendenti permanenti',
  }, 'structural_policy'),
  expectedStatus: 'not_applicable',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: 'not_applicable',
  expectedBtiTreatment: 'not_applicable',
  expectedConfidenceBand: { min: 0.72, max: 0.88 },
  expectedAmount: null,
  expectedNotesContains: ['Policy/non-monetary'],
  doctrineNote: 'Ferie illimitate = structural policy. Nessun costo diretto inventato per il BTI.',
};

// ── Blocked / limited examples (28–32) ───────────────────────────────────────

const EXAMPLE_28: BudgetEvidenceExample = {
  id: 'blocked_28_mandatory_safety_training',
  title: 'Formazione sicurezza obbligatoria D.Lgs 81',
  inputRecord: makeRaw('be-blocked-28', 27, {
    'Nome Iniziativa': 'Corso Sicurezza Obbligatorio D.Lgs 81',
    'Importo': '8500',
    'Fonte Budget': 'fattura fornitore HSE',
    'Tipo Evidenza': 'invoice',
    'Obbligatorio': 'si',
    'Categoria': 'sicurezza obbligatoria',
  }, 'training'),
  expectedStatus: 'documented',
  expectedLevel: 'L3_THIRD_PARTY_DOCUMENT',
  expectedEvidenceType: 'invoice',
  // Compliance blocked → excluded even with good evidence.
  expectedBtiTreatment: 'excluded_from_bti',
  expectedConfidenceBand: { min: 0.70, max: 0.92 },
  expectedAmount: 8500,
  expectedNotesContains: ['compliance obbligatoria', 'Blocked by Design'],
  doctrineNote: 'Compliance obbligatoria D.Lgs 81 → escluso da BTI per design. L\'evidenza esiste ma non genera attivazione. Budget tracciato come blocked_compliance_spend.',
};

const EXAMPLE_29: BudgetEvidenceExample = {
  id: 'blocked_29_dpi_purchase',
  title: 'Acquisto DPI — compliance budget',
  inputRecord: makeRaw('be-blocked-29', 28, {
    'Nome Iniziativa': 'DPI Plant Bergamo',
    'Importo': '12300',
    'Fonte Budget': 'fattura fornitore DPI',
    'Tipo Evidenza': 'invoice',
    'Obbligatorio': 'si',
    'Categoria': 'sicurezza',
  }),
  expectedStatus: 'documented',
  expectedLevel: 'L3_THIRD_PARTY_DOCUMENT',
  expectedEvidenceType: 'invoice',
  expectedBtiTreatment: 'excluded_from_bti',
  expectedConfidenceBand: { min: 0.70, max: 0.92 },
  expectedAmount: 12300,
  expectedNotesContains: ['compliance obbligatoria', 'Blocked by Design'],
  doctrineNote: 'DPI obbligatori = compliance. Escluso da BTI. Budget classificato come blocked_compliance_spend.',
};

const EXAMPLE_30: BudgetEvidenceExample = {
  id: 'limited_30_gift_cards',
  title: 'Gift card natale — cash-like limited',
  inputRecord: makeRaw('be-limited-30', 29, {
    'Nome Iniziativa': 'Gift Card Natale Dipendenti',
    'Importo': '45000',
    'Fonte Budget': 'welfare provider export gift card',
    'Tipo Evidenza': 'welfare_provider_export',
    'Categoria': 'gift card',
  }),
  expectedStatus: 'documented',
  expectedLevel: 'L3_THIRD_PARTY_DOCUMENT',
  expectedEvidenceType: 'welfare_provider_export',
  expectedBtiTreatment: 'tracked_only',
  expectedConfidenceBand: { min: 0.70, max: 0.92 },
  expectedAmount: 45000,
  expectedNotesContains: ['cash-like', 'economic_relief_spend'],
  doctrineNote: 'Gift card = limited/cash-like. tracked_only BTI. Non genera IU anche con buona evidenza.',
};

const EXAMPLE_31: BudgetEvidenceExample = {
  id: 'limited_31_fuel_vouchers',
  title: 'Buoni benzina — cash-like limited',
  inputRecord: makeRaw('be-limited-31', 30, {
    'Nome Iniziativa': 'Buoni Benzina Dipendenti',
    'Importo': '28000',
    'Fonte Budget': 'welfare provider export buoni carburante',
    'Tipo Evidenza': 'welfare_provider_export',
    'Categoria': 'buoni benzina',
  }),
  expectedStatus: 'documented',
  expectedLevel: 'L3_THIRD_PARTY_DOCUMENT',
  expectedEvidenceType: 'welfare_provider_export',
  expectedBtiTreatment: 'tracked_only',
  expectedConfidenceBand: { min: 0.70, max: 0.92 },
  expectedAmount: 28000,
  expectedNotesContains: ['cash-like', 'economic_relief_spend'],
  doctrineNote: 'Buoni carburante = limited. tracked_only anche con L3. economic_relief_spend nel BTI.',
};

const EXAMPLE_32: BudgetEvidenceExample = {
  id: 'limited_32_meal_vouchers_no_evidence',
  title: 'Buoni pasto senza fonte budget',
  inputRecord: makeRaw('be-limited-32', 31, {
    'Nome Iniziativa': 'Buoni Pasto Mensili',
    'Importo': '72000',
    'Categoria': 'buoni pasto',
  }),
  expectedStatus: 'declared',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: 'not_available',
  // Still tracked_only because cash-like takes precedence over excluded.
  expectedBtiTreatment: 'tracked_only',
  expectedConfidenceBand: { min: 0.05, max: 0.22 },
  expectedAmount: 72000,
  expectedNotesContains: ['cash-like'],
  doctrineNote: 'Buoni pasto cash-like = tracked_only. Importo presente (72000) senza fonte → status=declared (L0 + amount). Note: not_available richiede amount=null.',
};

// ── Ambiguous examples (33–35) ────────────────────────────────────────────────

const EXAMPLE_33: BudgetEvidenceExample = {
  id: 'ambig_33_rimborso_salute_unclear',
  title: 'Rimborso salute — fonte non chiara',
  inputRecord: makeRaw('be-ambig-33', 32, {
    'Nome Iniziativa': 'Rimborso Sanitario Generico',
    'Importo': '16000',
    'Fonte Budget': 'comunicazione interna',
    'Categoria': 'benefit sanitario',
  }),
  expectedStatus: 'declared',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: null,
  expectedBtiTreatment: 'excluded_from_bti',
  expectedConfidenceBand: { min: 0.05, max: 0.22 },
  expectedAmount: 16000,
  expectedNotesContains: ['Nessuna fonte'],
  doctrineNote: '"Comunicazione interna" non è un keyword L1 riconosciuto → L0 per design conservativo. Rimborso sanitario ambiguo escluso da BTI. Evidence Debt accumulato.',
};

const EXAMPLE_34: BudgetEvidenceExample = {
  id: 'ambig_34_supporto_famiglia_no_source',
  title: 'Supporto famiglia — nessuna fonte',
  inputRecord: makeRaw('be-ambig-34', 33, {
    'Nome Iniziativa': 'Supporto Famiglia Generico',
    'Importo': '5000',
    'Categoria': 'welfare famiglia',
  }),
  expectedStatus: 'declared',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: 'not_available',
  expectedBtiTreatment: 'excluded_from_bti',
  expectedConfidenceBand: { min: 0.05, max: 0.22 },
  expectedAmount: 5000,
  expectedNotesContains: ['Nessuna fonte'],
  doctrineNote: 'Importo presente (5000) ma nessuna fonte = L0 declared. "Il budget non è un dato valido se non ha una fonte." Escluso da BTI. Note: not_available richiede amount=null.',
};

const EXAMPLE_35: BudgetEvidenceExample = {
  id: 'ambig_35_budget_welfare_no_breakdown',
  title: 'Budget welfare generale — nessun dettaglio',
  inputRecord: makeRaw('be-ambig-35', 34, {
    'Nome Iniziativa': 'Budget Welfare Generale',
    'Importo': '120000',
    'Fonte Budget': 'budget welfare generale — nessun breakdown per iniziativa',
    'Categoria': 'welfare',
  }),
  expectedStatus: 'declared',
  expectedLevel: 'L0_NO_EVIDENCE',
  expectedEvidenceType: 'not_available',
  expectedBtiTreatment: 'excluded_from_bti',
  expectedConfidenceBand: { min: 0.05, max: 0.22 },
  expectedAmount: 120000,
  expectedNotesContains: ['Nessuna fonte'],
  doctrineNote: 'Budget welfare aggregato senza breakdown = L0 declared. Importo presente ma fonte non riconosciuta come L1/L2/L3. Escluso da BTI. BTI richiede granularità per iniziativa.',
};

// ── All examples ──────────────────────────────────────────────────────────────

export const BUDGET_EVIDENCE_EXAMPLES: BudgetEvidenceExample[] = [
  EXAMPLE_01, EXAMPLE_02, EXAMPLE_03, EXAMPLE_04, EXAMPLE_05,
  EXAMPLE_06, EXAMPLE_07, EXAMPLE_08, EXAMPLE_09, EXAMPLE_10,
  EXAMPLE_11, EXAMPLE_12, EXAMPLE_13, EXAMPLE_14, EXAMPLE_15,
  EXAMPLE_16, EXAMPLE_17, EXAMPLE_18, EXAMPLE_19, EXAMPLE_20,
  EXAMPLE_21, EXAMPLE_22, EXAMPLE_23,
  EXAMPLE_24, EXAMPLE_25, EXAMPLE_26, EXAMPLE_27,
  EXAMPLE_28, EXAMPLE_29, EXAMPLE_30, EXAMPLE_31, EXAMPLE_32,
  EXAMPLE_33, EXAMPLE_34, EXAMPLE_35,
];

// ── Self-check runner ─────────────────────────────────────────────────────────

export function runBudgetEvidenceExamples(): BudgetEvidenceExampleResult[] {
  return BUDGET_EVIDENCE_EXAMPLES.map((example) => {
    const result = assessBudgetEvidence(example.inputRecord);

    const statusMatch = result.status === example.expectedStatus;
    const levelMatch = result.evidenceLevel === example.expectedLevel;
    const typeMatch =
      example.expectedEvidenceType === null ||
      result.evidenceType === example.expectedEvidenceType;
    const treatmentMatch = result.btiTreatment === example.expectedBtiTreatment;
    const confidenceInBand =
      result.confidence >= example.expectedConfidenceBand.min &&
      result.confidence <= example.expectedConfidenceBand.max;
    const amountMatch =
      example.expectedAmount === 'any' ? true
      : example.expectedAmount === null ? result.amount === null
      : result.amount !== null && Math.abs(result.amount - example.expectedAmount) <= 1;
    const notesMatch = example.expectedNotesContains.every((sub) =>
      (result.notes ?? '').toLowerCase().includes(sub.toLowerCase()),
    );

    const passed =
      statusMatch && levelMatch && typeMatch && treatmentMatch &&
      confidenceInBand && amountMatch && notesMatch;

    const failureReasons: string[] = [];
    if (!statusMatch)
      failureReasons.push(`status: expected "${example.expectedStatus}", got "${result.status}"`);
    if (!levelMatch)
      failureReasons.push(`level: expected "${example.expectedLevel}", got "${result.evidenceLevel}"`);
    if (!typeMatch)
      failureReasons.push(`type: expected "${String(example.expectedEvidenceType)}", got "${result.evidenceType}"`);
    if (!treatmentMatch)
      failureReasons.push(`treatment: expected "${example.expectedBtiTreatment}", got "${result.btiTreatment}"`);
    if (!confidenceInBand)
      failureReasons.push(
        `confidence: ${result.confidence.toFixed(3)} not in [${example.expectedConfidenceBand.min}, ${example.expectedConfidenceBand.max}]`,
      );
    if (!amountMatch)
      failureReasons.push(`amount: expected ${String(example.expectedAmount)}, got ${String(result.amount)}`);
    if (!notesMatch)
      failureReasons.push(`notes: missing [${example.expectedNotesContains.filter((s) => !(result.notes ?? '').toLowerCase().includes(s.toLowerCase())).join(', ')}]`);

    return {
      id: example.id,
      title: example.title,
      passed,
      statusMatch,
      levelMatch,
      typeMatch,
      treatmentMatch,
      confidenceInBand,
      amountMatch,
      notesMatch,
      expectedStatus: example.expectedStatus,
      actualStatus: result.status,
      expectedLevel: example.expectedLevel,
      actualLevel: result.evidenceLevel,
      expectedBtiTreatment: example.expectedBtiTreatment,
      actualBtiTreatment: result.btiTreatment,
      actualConfidence: result.confidence,
      expectedConfidenceBand: example.expectedConfidenceBand,
      actualAmount: result.amount,
      failureReason: failureReasons.length > 0 ? failureReasons.join(' | ') : null,
      fullResult: result,
    };
  });
}

// ── Summary helper ────────────────────────────────────────────────────────────

export interface BudgetEvidenceExampleSummary {
  total: number;
  passed: number;
  failed: number;
  failedIds: string[];
  byTreatment: Record<string, { total: number; passed: number }>;
}

export function summarizeBudgetEvidenceExamples(
  results: BudgetEvidenceExampleResult[],
): BudgetEvidenceExampleSummary {
  const failed = results.filter((r) => !r.passed);
  const byTreatment: Record<string, { total: number; passed: number }> = {};
  for (const r of results) {
    const key = r.expectedBtiTreatment;
    if (!byTreatment[key]) byTreatment[key] = { total: 0, passed: 0 };
    byTreatment[key].total += 1;
    if (r.passed) byTreatment[key].passed += 1;
  }
  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: failed.length,
    failedIds: failed.map((r) => r.id),
    byTreatment,
  };
}
