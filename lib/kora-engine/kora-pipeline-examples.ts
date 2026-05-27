// lib/kora-engine/kora-pipeline-examples.ts
// KORA Pipeline Examples v0.1 — Foundation Light Pilot.
//
// 12 scenarios exercising the full runKoraPipeline path.
// Each scenario includes synthetic records, expected assertions, and a pass/fail summary.
//
// Assertions verify:
//   - Mandatory invariants (productionReady=false, calibrationStatus, externalToIndex=true)
//   - Scenario-specific outcomes (safeguardStatus, scoringMode, pillar distribution, etc.)
//
// Privacy: all records here are SYNTHETIC DEMO DATA — no real company or worker data.

import type { RawUploadedRecord, KoraComputationResult } from './types';
import { runKoraPipeline } from './run-kora-pipeline';

// ── Result type ───────────────────────────────────────────────────────────────

export interface PipelineAssertion {
  field: string;
  expected: string;
  actual: unknown;
  pass: boolean;
}

export interface KoraPipelineExampleResult {
  scenarioId: string;
  name: string;
  description: string;
  inputs: {
    tenantId: string;
    batchId: string;
    recordCount: number;
    workforcePopulation: number | undefined;
  };
  result: KoraComputationResult;
  assertions: PipelineAssertion[];
  allPass: boolean;
}

// ── Assertion helpers ─────────────────────────────────────────────────────────

function assertEq(field: string, expected: unknown, actual: unknown): PipelineAssertion {
  return { field, expected: String(expected), actual, pass: actual === expected };
}

function assertGt(field: string, threshold: number, actual: number): PipelineAssertion {
  return { field, expected: `> ${threshold}`, actual, pass: actual > threshold };
}

function assertGte(field: string, threshold: number, actual: number): PipelineAssertion {
  return { field, expected: `>= ${threshold}`, actual, pass: actual >= threshold };
}

function assertLt(field: string, threshold: number, actual: number): PipelineAssertion {
  return { field, expected: `< ${threshold}`, actual, pass: actual < threshold };
}

function assertRange(
  field: string, min: number, max: number, actual: number,
): PipelineAssertion {
  return { field, expected: `[${min}, ${max}]`, actual, pass: actual >= min && actual <= max };
}

// ── Mandatory invariants — always checked on every scenario ──────────────────

function invariants(result: KoraComputationResult): PipelineAssertion[] {
  return [
    assertEq('koraIndex.productionReady',         false,                           result.koraIndex.productionReady),
    assertEq('koraIndex.calibrationStatus',        'pre_empirical_calibration',     result.koraIndex.calibrationStatus),
    assertEq('confidence.externalToIndex',         true,                            result.confidence.externalToIndex),
    assertRange('koraIndex.value',                 0, 100,                          result.koraIndex.value),
    assertRange('confidence.score',                0, 100,                          result.confidence.score),
  ];
}

// ── Scenario 1: Strong Pilot ──────────────────────────────────────────────────

function scenario01(): KoraPipelineExampleResult {
  const tenantId = 'demo_s01_strong_pilot';
  const batchId  = 'batch_s01';
  const records: RawUploadedRecord[] = [
    {
      recordId: 's01_r1', batchId, rowIndex: 0, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Corso di formazione digitale e upskilling avanzato',
        categoria: 'formazione professionale digitale',
        partecipanti: 50, forza_lavoro: 250,
        importo: 25000, fonte_budget: 'fattura FT2024-001 fornitore LMS',
        dipartimento: 'IT',
      },
    },
    {
      recordId: 's01_r2', batchId, rowIndex: 1, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Wellness aziendale e supporto psicologico dipendenti',
        categoria: 'benessere psicologico salute',
        partecipanti: 80,
        importo: 18000, fonte_budget: 'contratto welfare provider 2024',
      },
    },
    {
      recordId: 's01_r3', batchId, rowIndex: 2, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Programma di mentoring professionale tra colleghi',
        categoria: 'mentoring e sviluppo professionale peer',
        partecipanti: 30,
        importo: 8000, fonte_budget: 'report interno HR budget 2024',
      },
    },
    {
      recordId: 's01_r4', batchId, rowIndex: 3, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Volontariato aziendale e progetti sociali',
        categoria: 'volontariato sociale comunita territorio',
        partecipanti: 40,
        importo: 12000, fonte_budget: 'invoice VOL-2024-003 partner sociale',
      },
    },
    {
      recordId: 's01_r5', batchId, rowIndex: 4, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Knowledge transfer e mentoring intergenerazionale senior',
        categoria: 'trasmissione conoscenza legacy generazionale',
        partecipanti: 20,
        importo: 5000, fonte_budget: 'budget interno rendiconto HR',
      },
    },
    {
      recordId: 's01_r6', batchId, rowIndex: 5, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Academy aziendale corporate e leadership development',
        categoria: 'academy aziendale corporate academy upskilling leadership',
        partecipanti: 60,
        importo: 35000, fonte_budget: 'fattura FT2024-007 provider formazione',
        sede: 'Milano',
      },
    },
  ];

  const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: 250 });

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',                     'computed',  result.scoringMode),
    assertEq('eligibilitySummary.blockedCount', 0,           result.eligibilitySummary.blockedCount),
    assertGte('eligibilitySummary.eligibleCount', 4,         result.eligibilitySummary.eligibleCount),
    assertEq('activation.safeguardStatus',      'CLEAR',     result.activation.safeguardStatus),
    assertGt('koraIndex.value',                 30,          result.koraIndex.value),
    assertGt('bti.btiScore',                    50,          result.bti.btiScore),
    assertGt('bti.deepActivationSpend',         0,           result.bti.deepActivationSpend),
    assertGt('confidence.score',                50,          result.confidence.score),
  ];

  return {
    scenarioId: 'S01', name: 'Strong Pilot',
    description: '6 eligible records across 5 pillars, good L2/L3 budget evidence, workforce=250. Expected: CLEAR safeguard, positive KORA Index.',
    inputs: { tenantId, batchId, recordCount: records.length, workforcePopulation: 250 },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Scenario 2: Relief-heavy ──────────────────────────────────────────────────

function scenario02(): KoraPipelineExampleResult {
  const tenantId = 'demo_s02_relief_heavy';
  const batchId  = 'batch_s02';
  const records: RawUploadedRecord[] = [
    {
      recordId: 's02_r1', batchId, rowIndex: 0, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Buoni pasto welfare dipendenti',
        categoria: 'buoni pasto meal voucher benefit',
        partecipanti: 80, forza_lavoro: 150,
        importo: 60000, fonte_budget: 'self_declared dichiarato HR',
      },
    },
    {
      recordId: 's02_r2', batchId, rowIndex: 1, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Gift card welfare flexible benefit',
        categoria: 'gift card rimborso generico benefit monetario',
        partecipanti: 60,
        importo: 30000, fonte_budget: 'stima HR dichiarato',
      },
    },
    {
      recordId: 's02_r3', batchId, rowIndex: 2, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Voucher benzina e ticket carburante dipendenti',
        categoria: 'buoni benzina voucher carburante fringe benefit',
        partecipanti: 50,
        importo: 15000, fonte_budget: 'report HR interno',
      },
    },
    {
      recordId: 's02_r4', batchId, rowIndex: 3, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Corso di formazione professionalizzante volontaria',
        categoria: 'formazione professionalizzante volontaria addizionale upskilling',
        partecipanti: 30,
        importo: 8000, fonte_budget: 'contratto provider formazione',
      },
    },
    {
      recordId: 's02_r5', batchId, rowIndex: 4, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Programma benessere psicologico e wellbeing volontario aziendale',
        categoria: 'wellbeing volontario benessere psicologico salute',
        partecipanti: 20,
        importo: 5000, fonte_budget: 'budget interno rendiconto',
      },
    },
  ];

  const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: 150 });

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',                        'computed', result.scoringMode),
    assertGte('eligibilitySummary.limitedCount',   3,          result.eligibilitySummary.limitedCount),
    assertGte('eligibilitySummary.eligibleCount',  1,          result.eligibilitySummary.eligibleCount),
    assertGt('bti.economicReliefSpend',            0,          result.bti.economicReliefSpend),
    assertEq('activation.safeguardStatus',         'WARNING',  result.activation.safeguardStatus),
  ];

  return {
    scenarioId: 'S02', name: 'Relief-heavy',
    description: '3 limited records (buoni pasto, gift card, voucher), 2 eligible. MAR suppressed by high relief ratio. Expected: WARNING safeguard.',
    inputs: { tenantId, batchId, recordCount: records.length, workforcePopulation: 150 },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Scenario 3: Compliance-heavy ──────────────────────────────────────────────

function scenario03(): KoraPipelineExampleResult {
  const tenantId = 'demo_s03_compliance_heavy';
  const batchId  = 'batch_s03';
  const records: RawUploadedRecord[] = [
    {
      recordId: 's03_r1', batchId, rowIndex: 0, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Formazione obbligatoria D.Lgs 81/08 sicurezza sul lavoro',
        categoria: 'sicurezza obbligatoria dlgs 81 formazione',
        partecipanti: 100, forza_lavoro: 100,
        importo: 8000, fonte_budget: 'fattura sicurezza 2024',
      },
    },
    {
      recordId: 's03_r2', batchId, rowIndex: 1, detectedRecordType: 'training',
      raw: {
        nome_evento: 'DVR aggiornamento valutazione rischi obbligatoria',
        categoria: 'dvr sicurezza compliance',
        partecipanti: 100,
        importo: 3000, fonte_budget: 'contratto consulente sicurezza',
      },
    },
    {
      recordId: 's03_r3', batchId, rowIndex: 2, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Corso antincendio obbligatorio e primo soccorso',
        categoria: 'antincendio primo soccorso obbligatorio',
        partecipanti: 100,
        importo: 2500, fonte_budget: 'fattura ente certificatore',
      },
    },
    {
      recordId: 's03_r4', batchId, rowIndex: 3, detectedRecordType: 'training',
      raw: {
        nome_evento: 'GDPR formazione obbligatoria privacy aziendale',
        categoria: 'gdpr obbligatorio privacy compliance legale',
        partecipanti: 100,
        importo: 2000, fonte_budget: 'contratto DPO consulenza',
      },
    },
    {
      recordId: 's03_r5', batchId, rowIndex: 4, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Corso di formazione professionale aggiuntivo volontario',
        categoria: 'formazione professionale upskilling volontario',
        partecipanti: 8,
        importo: 1500, fonte_budget: 'budget HR dichiarato',
      },
    },
  ];

  const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: 100 });

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',                       'computed', result.scoringMode),
    assertGte('eligibilitySummary.blockedCount',  4,          result.eligibilitySummary.blockedCount),
    assertGte('bti.blockedComplianceSpend',       15000,      result.bti.blockedComplianceSpend),
    assertEq('activation.safeguardStatus',        'FLAGGED',  result.activation.safeguardStatus),
    assertLt('activation.activationReach',        0.20,       result.activation.activationReach),
  ];

  return {
    scenarioId: 'S03', name: 'Compliance-heavy',
    description: '4 blocked compliance records (D.Lgs 81/08, DVR, antincendio, GDPR) + 1 eligible with 8 participants. Expected: FLAGGED safeguard, low AR.',
    inputs: { tenantId, batchId, recordCount: records.length, workforcePopulation: 100 },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Scenario 4: Missing Budget ────────────────────────────────────────────────

function scenario04(): KoraPipelineExampleResult {
  const tenantId = 'demo_s04_missing_budget';
  const batchId  = 'batch_s04';
  const records: RawUploadedRecord[] = [
    {
      recordId: 's04_r1', batchId, rowIndex: 0, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Programma wellness e benessere aziendale',
        categoria: 'wellness benessere salute', partecipanti: 60, forza_lavoro: 150,
      },
    },
    {
      recordId: 's04_r2', batchId, rowIndex: 1, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Corso di formazione e upskilling digitale',
        categoria: 'formazione professionale digitale', partecipanti: 40,
      },
    },
    {
      recordId: 's04_r3', batchId, rowIndex: 2, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Programma mentoring aziendale',
        categoria: 'mentoring sviluppo professionale', partecipanti: 25,
      },
    },
    {
      recordId: 's04_r4', batchId, rowIndex: 3, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Attività volontariato aziendale dipendenti',
        categoria: 'volontariato aziendale sociale comunita',
        partecipanti: 20,
      },
    },
  ];

  const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: 150 });

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',         'computed', result.scoringMode),
    assertEq('bti.btiScore',        0,          result.bti.btiScore),
    assertLt('confidence.score',    70,         result.confidence.score),
    assertGte('eligibilitySummary.eligibleCount', 3, result.eligibilitySummary.eligibleCount),
  ];

  return {
    scenarioId: 'S04', name: 'Missing Budget',
    description: '3 eligible records with no budget amounts + 1 with L1 self-declared only. BTI score = 0 due to missing evidence. Confidence penalized.',
    inputs: { tenantId, batchId, recordCount: records.length, workforcePopulation: 150 },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Scenario 5: Missing Workforce ─────────────────────────────────────────────

function scenario05(): KoraPipelineExampleResult {
  const tenantId = 'demo_s05_missing_workforce';
  const batchId  = 'batch_s05';
  const records: RawUploadedRecord[] = [
    {
      recordId: 's05_r1', batchId, rowIndex: 0, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Corso di formazione digitale', categoria: 'formazione digitale upskilling',
        partecipanti: 45, importo: 12000, fonte_budget: 'fattura FT2024-010',
      },
    },
    {
      recordId: 's05_r2', batchId, rowIndex: 1, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Wellness e salute aziendale', categoria: 'wellness benessere salute',
        partecipanti: 60, importo: 8000, fonte_budget: 'contratto provider',
      },
    },
    {
      recordId: 's05_r3', batchId, rowIndex: 2, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Volontariato corporate social', categoria: 'volontariato sociale',
        partecipanti: 30, importo: 4000, fonte_budget: 'fattura partner sociale',
      },
    },
    {
      recordId: 's05_r4', batchId, rowIndex: 3, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Mentoring e coaching professionale', categoria: 'mentoring coaching',
        partecipanti: 20, importo: 3000, fonte_budget: 'report HR interno',
      },
    },
  ];

  // No workforcePopulation passed — AR = 0, safeguard = WARNING
  const result = runKoraPipeline({ tenantId, batchId, records });

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',                          'computed', result.scoringMode),
    assertEq('activation.activationReach',           0,          result.activation.activationReach),
    assertEq('activation.meaningfulActivationReach', 0,          result.activation.meaningfulActivationReach),
    assertEq('activation.safeguardStatus',           'WARNING',  result.activation.safeguardStatus),
    assertGte('eligibilitySummary.eligibleCount',    3,          result.eligibilitySummary.eligibleCount),
    assertGt('bti.btiScore',                         0,          result.bti.btiScore),
  ];

  return {
    scenarioId: 'S05', name: 'Missing Workforce',
    description: '4 eligible records with budget but no workforcePopulation provided. AR=0 (not real), safeguard=WARNING. BTI still computed.',
    inputs: { tenantId, batchId, recordCount: records.length, workforcePopulation: undefined },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Scenario 6: Care Economy Focus ───────────────────────────────────────────

function scenario06(): KoraPipelineExampleResult {
  const tenantId = 'demo_s06_care_economy';
  const batchId  = 'batch_s06';
  const records: RawUploadedRecord[] = [
    {
      recordId: 's06_r1', batchId, rowIndex: 0, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Asilo nido aziendale e childcare dipendenti con figli',
        categoria: 'childcare asilo nido servizi prima infanzia',
        partecipanti: 45, forza_lavoro: 180,
        importo: 40000, fonte_budget: 'contratto provider asilo nido 2024',
      },
    },
    {
      recordId: 's06_r2', batchId, rowIndex: 1, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Supporto caregiver e assistenza anziani familiari',
        categoria: 'supporto caregiver assistenza anziani eldercare',
        partecipanti: 30,
        importo: 15000, fonte_budget: 'invoice caregiving provider',
      },
    },
    {
      recordId: 's06_r3', batchId, rowIndex: 2, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Flessibilità lavorativa per genitori e caregivers familiari',
        categoria: 'flessibilita lavoro genitori family support genitorialita',
        partecipanti: 60,
        importo: 5000, fonte_budget: 'report interno HR family policy',
      },
    },
    {
      recordId: 's06_r4', batchId, rowIndex: 3, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Estate ragazzi e campus estivo per figli dipendenti',
        categoria: 'estate ragazzi campus estivo summer camp',
        partecipanti: 40,
        importo: 20000, fonte_budget: 'fattura campus estivo organizzatore',
      },
    },
  ];

  const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: 180 });

  // Care signals detected: check explainability trace stage 3
  const careStage = result.explainabilityTrace.find((t) => t.id === 'stage_03_care_economy');
  const careSignalCount = careStage
    ? parseInt(careStage.output.replace('careSignals=', '') || '0', 10)
    : 0;

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',                   'computed', result.scoringMode),
    assertGt('careSignalCount',               0,          careSignalCount),
    assertGte('pillarDistribution.LIFE',      3,          result.pillarDistribution.LIFE),
    assertGte('eligibilitySummary.eligibleCount', 3,      result.eligibilitySummary.eligibleCount),
    assertGt('bti.deepActivationSpend',       0,          result.bti.deepActivationSpend),
  ];

  return {
    scenarioId: 'S06', name: 'Care Economy Focus',
    description: '4 care economy records (childcare, eldercare, caregiver, summer camps). Care signals detected. LIFE pillar dominant.',
    inputs: { tenantId, batchId, recordCount: records.length, workforcePopulation: 180 },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Scenario 7: Policy-heavy ──────────────────────────────────────────────────

function scenario07(): KoraPipelineExampleResult {
  const tenantId = 'demo_s07_policy_heavy';
  const batchId  = 'batch_s07';
  const records: RawUploadedRecord[] = [
    {
      recordId: 's07_r1', batchId, rowIndex: 0, detectedRecordType: 'structural_policy',
      raw: {
        nome_evento: 'Smart working policy formale e lavoro agile aziendale',
        categoria: 'smart working policy flessibilita', partecipanti: 120, forza_lavoro: 120,
      },
    },
    {
      recordId: 's07_r2', batchId, rowIndex: 1, detectedRecordType: 'structural_policy',
      raw: {
        nome_evento: 'Diritto alla disconnessione policy aziendale',
        categoria: 'diritto alla disconnessione policy benessere',
        partecipanti: 120,
      },
    },
    {
      recordId: 's07_r3', batchId, rowIndex: 2, detectedRecordType: 'structural_policy',
      raw: {
        nome_evento: 'Ferie illimitate e unlimited leave policy',
        categoria: 'ferie illimitate unlimited leave policy HR',
        partecipanti: 120,
      },
    },
  ];

  const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: 120 });

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',       'computed', result.scoringMode),
    assertEq('bti.totalBudget',   0,          result.bti.totalBudget),
    assertEq('bti.btiScore',      0,          result.bti.btiScore),
    assertGte('eligibilitySummary.totalCount', 3, result.eligibilitySummary.totalCount),
  ];

  return {
    scenarioId: 'S07', name: 'Policy-heavy',
    description: '3 structural policy records (smart working, right to disconnect, unlimited leave). No budget amounts — BTI=0 by design. Activation signals present.',
    inputs: { tenantId, batchId, recordCount: records.length, workforcePopulation: 120 },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Scenario 8: High Review Required ─────────────────────────────────────────

function scenario08(): KoraPipelineExampleResult {
  const tenantId = 'demo_s08_high_review';
  const batchId  = 'batch_s08';
  const records: RawUploadedRecord[] = [
    {
      recordId: 's08_r1', batchId, rowIndex: 0, detectedRecordType: 'unknown',
      raw: {
        nome_evento: 'Attività aziendale generica 2024',
        categoria: 'evento interno', partecipanti: 20, forza_lavoro: 100,
      },
    },
    {
      recordId: 's08_r2', batchId, rowIndex: 1, detectedRecordType: 'unknown',
      raw: {
        nome_evento: 'Servizio interno non specificato',
        categoria: 'servizio aziendale', partecipanti: 15,
      },
    },
    {
      recordId: 's08_r3', batchId, rowIndex: 2, detectedRecordType: 'unknown',
      raw: {
        nome_evento: 'Iniziativa HR generica',
        categoria: 'iniziativa risorse umane', partecipanti: 10,
      },
    },
    {
      recordId: 's08_r4', batchId, rowIndex: 3, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Corso di upskilling e formazione volontaria',
        categoria: 'upskilling formazione volontaria addizionale', partecipanti: 25,
        importo: 5000, fonte_budget: 'fattura fornitore',
      },
    },
    {
      recordId: 's08_r5', batchId, rowIndex: 4, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Programma supporto psicologico dipendenti',
        categoria: 'supporto psicologico benessere psicologico', partecipanti: 30,
        importo: 3000, fonte_budget: 'contratto provider',
      },
    },
  ];

  const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: 100 });

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',                             'computed', result.scoringMode),
    assertGte('eligibilitySummary.reviewRequiredCount', 3,          result.eligibilitySummary.reviewRequiredCount),
    assertGte('eligibilitySummary.eligibleCount',       1,          result.eligibilitySummary.eligibleCount),
    // CLEAR blocked: review_required = 3/5 = 60% > 25% threshold. AR ≈ 0.36, not FLAGGED (AR ≥ 0.20). → WARNING.
    assertEq('activation.safeguardStatus', 'WARNING', result.activation.safeguardStatus),
  ];

  return {
    scenarioId: 'S08', name: 'High Review Required',
    description: '3 ambiguous records (review_required) + 2 eligible. >60% review ratio blocks CLEAR. Confidence penalized.',
    inputs: { tenantId, batchId, recordCount: records.length, workforcePopulation: 100 },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Scenario 9: Weak Activation, High Budget ──────────────────────────────────

function scenario09(): KoraPipelineExampleResult {
  const tenantId = 'demo_s09_weak_activation_high_budget';
  const batchId  = 'batch_s09';
  const records: RawUploadedRecord[] = [
    {
      recordId: 's09_r1', batchId, rowIndex: 0, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Coaching professionale executive e leadership development',
        categoria: 'coaching professionale business coaching executive',
        partecipanti: 8, forza_lavoro: 300,
        importo: 80000, fonte_budget: 'invoice EXE-2024-001 provider premium',
      },
    },
    {
      recordId: 's09_r2', batchId, rowIndex: 1, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Benessere psicologico premium e supporto psicologico management',
        categoria: 'supporto psicologico benessere psicologico premium',
        partecipanti: 10,
        importo: 60000, fonte_budget: 'fattura provider wellness premium',
      },
    },
  ];

  const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: 300 });

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',                    'computed', result.scoringMode),
    assertEq('activation.safeguardStatus',     'FLAGGED',  result.activation.safeguardStatus),
    assertLt('activation.activationReach',     0.20,       result.activation.activationReach),
    assertGt('bti.deepActivationSpend',        0,          result.bti.deepActivationSpend),
    assertGt('bti.btiScore',                   40,         result.bti.btiScore),
    assertLt('koraIndex.value',                50,         result.koraIndex.value),
  ];

  return {
    scenarioId: 'S09', name: 'Weak Activation, High Budget',
    description: '2 eligible records with large budget (€140K) but only 18 participants out of 300. FLAGGED safeguard. Low KORA Index despite high spend.',
    inputs: { tenantId, batchId, recordCount: records.length, workforcePopulation: 300 },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Scenario 10: Strong GROWTH ────────────────────────────────────────────────

function scenario10(): KoraPipelineExampleResult {
  const tenantId = 'demo_s10_strong_growth';
  const batchId  = 'batch_s10';
  const records: RawUploadedRecord[] = [
    {
      recordId: 's10_r1', batchId, rowIndex: 0, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Corso upskilling digitale e cloud computing', forza_lavoro: 200,
        categoria: 'upskilling digitale cloud formazione', partecipanti: 50,
        importo: 20000, fonte_budget: 'fattura provider LMS',
      },
    },
    {
      recordId: 's10_r2', batchId, rowIndex: 1, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Certificazione professionale PMP e project management',
        categoria: 'certificazione project management sviluppo professionale', partecipanti: 20,
        importo: 15000, fonte_budget: 'invoice certificazione PMI',
      },
    },
    {
      recordId: 's10_r3', batchId, rowIndex: 2, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Academy aziendale corporate e learning hub competenze',
        categoria: 'academy aziendale learning hub corporate academy', partecipanti: 80,
        importo: 25000, fonte_budget: 'contratto provider academy',
      },
    },
    {
      recordId: 's10_r4', batchId, rowIndex: 3, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Learning platform LMS e-learning autosviluppo',
        categoria: 'learning platform lms learning hub e-learning', partecipanti: 150,
        importo: 10000, fonte_budget: 'licenza piattaforma LMS contratto',
      },
    },
    {
      recordId: 's10_r5', batchId, rowIndex: 4, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Certificazione professionale lingua inglese non obbligatoria',
        categoria: 'certificazione professionale certificazioni non obbligatorie inglese', partecipanti: 60,
        importo: 12000, fonte_budget: 'fattura provider linguistico',
      },
    },
  ];

  const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: 200 });

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',                         'computed', result.scoringMode),
    assertGte('pillarDistribution.GROWTH',          4,          result.pillarDistribution.GROWTH),
    assertGte('eligibilitySummary.eligibleCount',   4,          result.eligibilitySummary.eligibleCount),
    assertGt('bti.deepActivationSpend',             0,          result.bti.deepActivationSpend),
    assertGt('koraIndex.macroblocks.activationQuality', 20,     result.koraIndex.macroblocks.activationQuality),
  ];

  return {
    scenarioId: 'S10', name: 'Strong GROWTH',
    description: '5 training/certification/LMS records. GROWTH pillar dominates. Strong activation quality macroblock.',
    inputs: { tenantId, batchId, recordCount: records.length, workforcePopulation: 200 },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Scenario 11: Sensitive Data ───────────────────────────────────────────────

function scenario11(): KoraPipelineExampleResult {
  const tenantId = 'demo_s11_sensitive_data';
  const batchId  = 'batch_s11';
  const records: RawUploadedRecord[] = [
    {
      recordId: 's11_r1', batchId, rowIndex: 0, detectedRecordType: 'training',
      raw: {
        nome_evento: 'Corso di formazione professionale',
        categoria: 'formazione professionale digitale',
        partecipanti: 40, forza_lavoro: 100,
        importo: 8000, fonte_budget: 'fattura provider',
      },
    },
    {
      recordId: 's11_r2', batchId, rowIndex: 1, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Programma wellness aziendale',
        categoria: 'wellness benessere salute',
        partecipanti: 30,
        importo: 5000, fonte_budget: 'contratto provider wellness',
      },
    },
    {
      // Record with individual-sensitive signals — excluded from reach computation
      recordId: 's11_r3', batchId, rowIndex: 2, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Sessione terapia individuale dipendente',
        categoria: 'terapia personale sessione individuale',
        codice_fiscale: 'XXXXXX00X00X000X',
        partecipanti: 1,
        importo: 1200,
      },
    },
    {
      // Record with individual mental health signal
      recordId: 's11_r4', batchId, rowIndex: 3, detectedRecordType: 'welfare_program',
      raw: {
        nome_evento: 'Supporto psicologico individuale',
        descrizione: 'sessione individuale burnout assessment individuale',
        partecipanti: 1, importo: 800,
      },
    },
  ];

  const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: 100 });

  const hasSensitiveWarning = result.activation.warnings.some(
    (w) => w.includes('sensibili'),
  );

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',                        'computed', result.scoringMode),
    assertEq('hasSensitiveWarning',                true,       hasSensitiveWarning),
    assertGte('eligibilitySummary.eligibleCount',  1,          result.eligibilitySummary.eligibleCount),
    assertGte('eligibilitySummary.totalCount',     4,          result.eligibilitySummary.totalCount),
  ];

  return {
    scenarioId: 'S11', name: 'Sensitive Data Records',
    description: '2 normal eligible records + 2 with individual-sensitive signals (codice fiscale, sessione individuale). Sensitive records excluded from reach. Privacy warning emitted.',
    inputs: { tenantId, batchId, recordCount: records.length, workforcePopulation: 100 },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Scenario 12: Empty Records ────────────────────────────────────────────────

function scenario12(): KoraPipelineExampleResult {
  const tenantId = 'demo_s12_empty';
  const batchId  = 'batch_s12';
  const records: RawUploadedRecord[] = [];

  const result = runKoraPipeline({ tenantId, batchId, records, workforcePopulation: 100 });

  const assertions: PipelineAssertion[] = [
    ...invariants(result),
    assertEq('scoringMode',                  'insufficient_data', result.scoringMode),
    assertEq('eligibilitySummary.totalCount', 0,                  result.eligibilitySummary.totalCount),
    assertEq('activation.activationReach',   0,                   result.activation.activationReach),
    assertEq('koraIndex.value',              0,                   result.koraIndex.value),
    assertEq('confidence.score',             0,                   result.confidence.score),
    assertEq('bti.btiScore',                 0,                   result.bti.btiScore),
    assertGt('result.warnings.length',       0,                   result.warnings.length),
  ];

  return {
    scenarioId: 'S12', name: 'Empty Records',
    description: 'No records provided. Pipeline returns insufficient_data immediately. All scores = 0.',
    inputs: { tenantId, batchId, recordCount: 0, workforcePopulation: 100 },
    result,
    assertions,
    allPass: assertions.every((a) => a.pass),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function runKoraPipelineExamples(): KoraPipelineExampleResult[] {
  return [
    scenario01(),
    scenario02(),
    scenario03(),
    scenario04(),
    scenario05(),
    scenario06(),
    scenario07(),
    scenario08(),
    scenario09(),
    scenario10(),
    scenario11(),
    scenario12(),
  ];
}
