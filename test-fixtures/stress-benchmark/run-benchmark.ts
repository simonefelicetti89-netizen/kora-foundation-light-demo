// test-fixtures/stress-benchmark/run-benchmark.ts
// B21 — Three-Company Stress Benchmark
// Runs runKoraPipeline on synthetic STRESS-A/B/C datasets.
// NO code changes. NO tuning. Audit only.
//
// Run: npx tsx --tsconfig tsconfig.json test-fixtures/stress-benchmark/run-benchmark.ts

import { runKoraPipeline } from '@/lib/kora-engine/run-kora-pipeline';
import type { RawUploadedRecord } from '@/lib/kora-engine/types';

// ── STRESS-A: Benefit Rich Retail (80 workers) ─────────────────────────────────
// Profile: heavy economic relief, light wellness, weak evidence, few deep initiatives

const STRESS_A_RECORDS: RawUploadedRecord[] = [
  // Economic relief / limited (11 records)
  { recordId: 'A01', batchId: 'STRESS-A', rowIndex: 0,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Buoni pasto mensili dicembre',   categoria: 'economic_relief',        tipo: 'monetary_benefit',  importo: 18000, partecipanti: 78, fonte: 'dichiarazione HR' } },
  { recordId: 'A02', batchId: 'STRESS-A', rowIndex: 1,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Buoni pasto mensili novembre',  categoria: 'economic_relief',        tipo: 'monetary_benefit',  importo: 17500, partecipanti: 76, fonte: 'dichiarazione HR' } },
  { recordId: 'A03', batchId: 'STRESS-A', rowIndex: 2,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Voucher spesa natalizi',          categoria: 'economic_relief',        tipo: 'monetary_benefit',  importo: 8000,  partecipanti: 75, fonte: 'dichiarazione HR' } },
  { recordId: 'A04', batchId: 'STRESS-A', rowIndex: 3,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Gift card dipendenti',            categoria: 'economic_relief',        tipo: 'monetary_benefit',  importo: 4000,  partecipanti: 72, fonte: 'dichiarazione HR' } },
  { recordId: 'A05', batchId: 'STRESS-A', rowIndex: 4,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Buoni benzina carburante',         categoria: 'economic_relief',        tipo: 'monetary_benefit',  importo: 3500,  partecipanti: 68, fonte: 'dichiarazione HR' } },
  { recordId: 'A06', batchId: 'STRESS-A', rowIndex: 5,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Welfare wallet generalista Q4',   categoria: 'economic_relief',        tipo: 'monetary_benefit',  importo: 12000, partecipanti: 70, fonte: 'dichiarazione HR' } },
  { recordId: 'A07', batchId: 'STRESS-A', rowIndex: 6,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Voucher tempo libero',             categoria: 'economic_relief',        tipo: 'monetary_benefit',  importo: 5000,  partecipanti: 65, fonte: 'dichiarazione HR' } },
  { recordId: 'A08', batchId: 'STRESS-A', rowIndex: 7,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Rimborso generico spese',          categoria: 'economic_relief rimborso generalista', tipo: 'monetary_benefit', importo: 2500, partecipanti: 60, fonte: 'dichiarazione HR' } },
  { recordId: 'A09', batchId: 'STRESS-A', rowIndex: 8,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Cashback welfare platform',        categoria: 'economic_relief cashback', tipo: 'monetary_benefit', importo: 3000, partecipanti: 55, fonte: 'dichiarazione HR' } },
  { recordId: 'A10', batchId: 'STRESS-A', rowIndex: 9,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Fringe benefit generalista',       categoria: 'fringe benefit generalista economic_relief', tipo: 'monetary_benefit', importo: 6000, partecipanti: 73, fonte: 'dichiarazione HR' } },
  { recordId: 'A11', batchId: 'STRESS-A', rowIndex: 10, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Voucher generico extra',            categoria: 'voucher generalista benefit', tipo: 'monetary_benefit', importo: 3000, partecipanti: 40, fonte: 'dichiarazione HR' } },
  // Wellbeing light (9 records) — eligible but low evidence
  { recordId: 'A12', batchId: 'STRESS-A', rowIndex: 11, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Convenzione palestra fitness',     categoria: 'palestra gym fitness attività fisica', tipo: 'consumed_service', importo: null, partecipanti: 28, fonte: 'dichiarazione HR' } },
  { recordId: 'A13', batchId: 'STRESS-A', rowIndex: 12, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: '10 ore palestra mensili',          categoria: 'palestra gym ore benessere fisico attività fisica', tipo: 'consumed_service', importo: null, partecipanti: 22, fonte: 'dichiarazione HR' } },
  { recordId: 'A14', batchId: 'STRESS-A', rowIndex: 13, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Challenge passi dipendenti',       categoria: 'wellness step challenge attività fisica benessere', tipo: 'consumed_service', importo: null, partecipanti: 40, fonte: 'dichiarazione HR' } },
  { recordId: 'A15', batchId: 'STRESS-A', rowIndex: 14, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'App mindfulness meditazione',      categoria: 'app mindfulness meditazione benessere psicologico', tipo: 'consumed_service', importo: null, partecipanti: 15, fonte: 'dichiarazione HR' } },
  { recordId: 'A16', batchId: 'STRESS-A', rowIndex: 15, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Webinar benessere online',          categoria: 'webinar benessere wellness salute', tipo: 'consumed_service', importo: null, partecipanti: 35, fonte: 'dichiarazione HR' } },
  { recordId: 'A17', batchId: 'STRESS-A', rowIndex: 16, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Wellness day evento',               categoria: 'wellness day evento benessere aziendale', tipo: 'consumed_service', importo: null, partecipanti: 38, fonte: 'dichiarazione HR' } },
  { recordId: 'A18', batchId: 'STRESS-A', rowIndex: 17, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Yoga lunch break sessioni',         categoria: 'yoga aziendale benessere fisico lunch sport', tipo: 'consumed_service', importo: null, partecipanti: 12, fonte: 'dichiarazione HR' } },
  { recordId: 'A19', batchId: 'STRESS-A', rowIndex: 18, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Wellness coach individuale',        categoria: 'benessere wellness programma attività fisica salute', tipo: 'consumed_service', importo: 2000, partecipanti: 8,  fonte: 'dichiarazione HR' } },
  { recordId: 'A20', batchId: 'STRESS-A', rowIndex: 19, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Fruit day frutta fresca',           categoria: 'benessere fisico salute nutrizione wellness', tipo: 'consumed_service', importo: null, partecipanti: 45, fonte: 'dichiarazione HR' } },
  // Policies without usage data (4 records)
  { recordId: 'A21', batchId: 'STRESS-A', rowIndex: 20, detectedRecordType: 'structural_policy', raw: { nome_iniziativa: 'Smart working dichiarato',       categoria: 'smart working lavoro agile flessibilità',          tipo: 'structural_policy', importo: null, partecipanti: null, fonte: 'dichiarazione HR' } },
  { recordId: 'A22', batchId: 'STRESS-A', rowIndex: 21, detectedRecordType: 'structural_policy', raw: { nome_iniziativa: 'No meeting day lunedì',           categoria: 'no meeting day focus time flessibilità',           tipo: 'structural_policy', importo: null, partecipanti: null, fonte: 'dichiarazione HR' } },
  { recordId: 'A23', batchId: 'STRESS-A', rowIndex: 22, detectedRecordType: 'structural_policy', raw: { nome_iniziativa: 'Ferie illimitate policy only',    categoria: 'ferie illimitate unlimited leave policy senza utilizzo', tipo: 'structural_policy', importo: null, partecipanti: null, fonte: 'dichiarazione HR' } },
  { recordId: 'A24', batchId: 'STRESS-A', rowIndex: 23, detectedRecordType: 'structural_policy', raw: { nome_iniziativa: 'Diritto alla disconnessione',     categoria: 'diritto disconnessione policy flessibilità',       tipo: 'structural_policy', importo: null, partecipanti: null, fonte: 'dichiarazione HR' } },
  // Deep initiatives — small scale, L1/L2
  { recordId: 'A25', batchId: 'STRESS-A', rowIndex: 24, detectedRecordType: 'training',         raw: { nome_iniziativa: 'Corso professionalizzante retail', categoria: 'formazione professionale corso upskilling sviluppo',  tipo: 'training', importo: 3500,  partecipanti: 8,  fonte: 'report interno HR' } },
  { recordId: 'A26', batchId: 'STRESS-A', rowIndex: 25, detectedRecordType: 'training',         raw: { nome_iniziativa: 'Mentoring pilota junior-senior',   categoria: 'mentoring aziendale sviluppo professionale',         tipo: 'training', importo: 1500,  partecipanti: 6,  fonte: 'dichiarazione HR' } },
  { recordId: 'A27', batchId: 'STRESS-A', rowIndex: 26, detectedRecordType: 'welfare_program',  raw: { nome_iniziativa: 'Supporto psicologico dichiarato',  categoria: 'supporto psicologico counseling benessere psicologico mental health', tipo: 'consumed_service', importo: 4000, partecipanti: 11, fonte: 'dichiarazione HR' } },
  { recordId: 'A28', batchId: 'STRESS-A', rowIndex: 27, detectedRecordType: 'training',         raw: { nome_iniziativa: 'Workshop D&I one-shot',             categoria: 'workshop diversity inclusion D&I inclusione',        tipo: 'training', importo: 2000,  partecipanti: 14, fonte: 'dichiarazione HR' } },
  { recordId: 'A29', batchId: 'STRESS-A', rowIndex: 28, detectedRecordType: 'training',         raw: { nome_iniziativa: 'Reskilling digitale base',          categoria: 'reskilling digitale formazione professionale upskilling', tipo: 'training', importo: 2000, partecipanti: 12, fonte: 'report interno HR' } },
  // Compliance blocked
  { recordId: 'A30', batchId: 'STRESS-A', rowIndex: 29, detectedRecordType: 'training',         raw: { nome_iniziativa: 'Corso sicurezza obbligatorio',     categoria: 'sicurezza obbligatoria antincendio compliance',      tipo: 'training', importo: 1000,  partecipanti: 80, fonte: 'report interno HSE' } },
  { recordId: 'A31', batchId: 'STRESS-A', rowIndex: 30, detectedRecordType: 'training',         raw: { nome_iniziativa: 'Corso privacy GDPR obbligatorio',  categoria: 'gdpr privacy obbligatoria compliance',               tipo: 'training', importo: 500,   partecipanti: 80, fonte: 'dichiarazione HR' } },
  // Insurance / pension (contextual)
  { recordId: 'A32', batchId: 'STRESS-A', rowIndex: 31, detectedRecordType: 'welfare_program',  raw: { nome_iniziativa: 'Assicurazione sanitaria',          categoria: 'assicurazione sanitaria polizza welfare',            tipo: 'long_term_benefit', importo: 15000, partecipanti: 72, fonte: 'dichiarazione HR' } },
  { recordId: 'A33', batchId: 'STRESS-A', rowIndex: 32, detectedRecordType: 'welfare_program',  raw: { nome_iniziativa: 'Previdenza integrativa',            categoria: 'previdenza integrativa fondo pensione pensione',     tipo: 'long_term_benefit', importo: 8000,  partecipanti: 55, fonte: 'dichiarazione HR' } },
  // Legacy / weak extras
  { recordId: 'A34', batchId: 'STRESS-A', rowIndex: 33, detectedRecordType: 'training',         raw: { nome_iniziativa: 'Knowledge transfer senior',        categoria: 'trasferimento competenze senior junior legacy',       tipo: 'training', importo: 2000,  partecipanti: 7,  fonte: 'dichiarazione HR' } },
  { recordId: 'A35', batchId: 'STRESS-A', rowIndex: 34, detectedRecordType: 'welfare_program',  raw: { nome_iniziativa: 'Volontariato aziendale',            categoria: 'volontariato aziendale territorio impatto sociale',   tipo: 'consumed_service', importo: 1000, partecipanti: 9, fonte: 'dichiarazione HR' } },
  // Caregiver/childcare below N<10
  { recordId: 'A36', batchId: 'STRESS-A', rowIndex: 35, detectedRecordType: 'welfare_program',  raw: { nome_iniziativa: 'Caregiver support dichiarato',     categoria: 'caregiver assistenza familiare supporto',            tipo: 'consumed_service', importo: 1500, partecipanti: 5, fonte: 'dichiarazione HR' } },
  { recordId: 'A37', batchId: 'STRESS-A', rowIndex: 36, detectedRecordType: 'welfare_program',  raw: { nome_iniziativa: 'Contributo nido aziendale',         categoria: 'nido aziendale childcare contributo asilo',          tipo: 'consumed_service', importo: 3000, partecipanti: 4, fonte: 'dichiarazione HR' } },
  // Survey / team building / convention (ambiguous)
  { recordId: 'A38', batchId: 'STRESS-A', rowIndex: 37, detectedRecordType: 'welfare_program',  raw: { nome_iniziativa: 'Survey engagement dipendenti',     categoria: 'survey engagement comunicazione interna',            tipo: 'consumed_service', importo: null, partecipanti: null, fonte: 'dichiarazione HR' } },
  { recordId: 'A39', batchId: 'STRESS-A', rowIndex: 38, detectedRecordType: 'welfare_program',  raw: { nome_iniziativa: 'Convention aziendale',              categoria: 'convention aziendale evento',                        tipo: 'consumed_service', importo: null, partecipanti: 80, fonte: 'dichiarazione HR' } },
];

// ── STRESS-B: Compliance Heavy Manufacturing (420 workers) ────────────────────
// Profile: heavy compliance, economic relief, few deep initiatives, large workforce

const STRESS_B_RECORDS: RawUploadedRecord[] = [
  // Compliance blocked (15 records)
  { recordId: 'B01', batchId: 'STRESS-B', rowIndex: 0,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Corso sicurezza 81/08',           categoria: 'sicurezza obbligatoria dlgs 81 compliance hse',     tipo: 'training', importo: 18000, partecipanti: 380, fonte: 'export fornitore welfare HSE' } },
  { recordId: 'B02', batchId: 'STRESS-B', rowIndex: 1,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Formazione DPI',                   categoria: 'dpi sicurezza obbligatoria dispositivi protezione',  tipo: 'training', importo: 6000,  partecipanti: 350, fonte: 'export fornitore welfare HSE' } },
  { recordId: 'B03', batchId: 'STRESS-B', rowIndex: 2,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'DVR aggiornamento',                categoria: 'dvr valutazione rischi sicurezza obbligatoria',     tipo: 'training', importo: 4000,  partecipanti: 420, fonte: 'report interno HSE' } },
  { recordId: 'B04', batchId: 'STRESS-B', rowIndex: 3,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Sorveglianza sanitaria',           categoria: 'sorveglianza sanitaria obbligatoria medico',        tipo: 'training', importo: 12000, partecipanti: 420, fonte: 'report interno HSE' } },
  { recordId: 'B05', batchId: 'STRESS-B', rowIndex: 4,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Visite mediche obbligatorie',      categoria: 'visite mediche obbligatorie sorveglianza',          tipo: 'training', importo: 8000,  partecipanti: 400, fonte: 'report interno HSE' } },
  { recordId: 'B06', batchId: 'STRESS-B', rowIndex: 5,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Patentino carrelli obbligatorio',  categoria: 'patentino obbligatorio carrelli elevatori',         tipo: 'training', importo: 5000,  partecipanti: 85,  fonte: 'export fornitore welfare HSE' } },
  { recordId: 'B07', batchId: 'STRESS-B', rowIndex: 6,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Antincendio obbligatorio',         categoria: 'antincendio obbligatorio certificato sicurezza',    tipo: 'training', importo: 4500,  partecipanti: 250, fonte: 'export fornitore welfare HSE' } },
  { recordId: 'B08', batchId: 'STRESS-B', rowIndex: 7,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Primo soccorso obbligatorio',      categoria: 'primo soccorso obbligatorio certificato',           tipo: 'training', importo: 3500,  partecipanti: 180, fonte: 'export fornitore welfare HSE' } },
  { recordId: 'B09', batchId: 'STRESS-B', rowIndex: 8,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Formazione modello 231',           categoria: 'modello 231 compliance legale obbligatoria',        tipo: 'training', importo: 6000,  partecipanti: 420, fonte: 'report interno HR' } },
  { recordId: 'B10', batchId: 'STRESS-B', rowIndex: 9,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Formazione privacy GDPR',          categoria: 'gdpr privacy obbligatoria compliance adempimento',  tipo: 'training', importo: 4000,  partecipanti: 420, fonte: 'report interno HR' } },
  { recordId: 'B11', batchId: 'STRESS-B', rowIndex: 10, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Aggiornamento procedure sicurezza', categoria: 'procedure sicurezza obbligatoria hse',             tipo: 'training', importo: 3000,  partecipanti: 300, fonte: 'report interno HSE' } },
  { recordId: 'B12', batchId: 'STRESS-B', rowIndex: 11, detectedRecordType: 'training',        raw: { nome_iniziativa: 'DUVRI interferenze',               categoria: 'duvri sicurezza interferenze obbligatoria',         tipo: 'training', importo: 2500,  partecipanti: 120, fonte: 'report interno HSE' } },
  { recordId: 'B13', batchId: 'STRESS-B', rowIndex: 12, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Audit HSE annuale',                categoria: 'audit hse sicurezza obbligatoria compliance',       tipo: 'training', importo: 5000,  partecipanti: 420, fonte: 'report interno HSE' } },
  { recordId: 'B14', batchId: 'STRESS-B', rowIndex: 13, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Formazione macchine obbligatoria', categoria: 'formazione macchine obbligatoria sicurezza',        tipo: 'training', importo: 4000,  partecipanti: 180, fonte: 'export fornitore welfare HSE' } },
  { recordId: 'B15', batchId: 'STRESS-B', rowIndex: 14, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Addestramento reparto',            categoria: 'addestramento obbligatorio reparto produzione',     tipo: 'training', importo: 3000,  partecipanti: 200, fonte: 'report interno HSE' } },
  // Economic relief (4 records)
  { recordId: 'B16', batchId: 'STRESS-B', rowIndex: 15, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Buoni pasto dipendenti',           categoria: 'economic_relief buoni pasto',                       tipo: 'monetary_benefit', importo: 38000, partecipanti: 380, fonte: 'dichiarazione HR' } },
  { recordId: 'B17', batchId: 'STRESS-B', rowIndex: 16, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Fringe benefit generalista',       categoria: 'fringe benefit economic relief',                    tipo: 'monetary_benefit', importo: 15000, partecipanti: 300, fonte: 'dichiarazione HR' } },
  { recordId: 'B18', batchId: 'STRESS-B', rowIndex: 17, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Rimborso trasporto',               categoria: 'rimborso trasporto welfare benefit',                tipo: 'monetary_benefit', importo: 22000, partecipanti: 320, fonte: 'dichiarazione HR' } },
  { recordId: 'B19', batchId: 'STRESS-B', rowIndex: 18, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Convenzione mensa',               categoria: 'mensa aziendale convenzione welfare',               tipo: 'consumed_service', importo: 18000, partecipanti: 350, fonte: 'dichiarazione HR' } },
  // Ambiguous / weak
  { recordId: 'B20', batchId: 'STRESS-B', rowIndex: 19, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Convention sicurezza HSE',         categoria: 'convention sicurezza evento team building',         tipo: 'consumed_service', importo: null, partecipanti: 120, fonte: 'dichiarazione HR' } },
  { recordId: 'B21', batchId: 'STRESS-B', rowIndex: 20, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Survey engagement',               categoria: 'survey engagement senza follow-up comunicazione',   tipo: 'consumed_service', importo: null, partecipanti: null, fonte: 'dichiarazione HR' } },
  { recordId: 'B22', batchId: 'STRESS-B', rowIndex: 21, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Comunicazione interna people',     categoria: 'comunicazione interna welfare people',              tipo: 'consumed_service', importo: null, partecipanti: null, fonte: 'dichiarazione HR' } },
  { recordId: 'B23', batchId: 'STRESS-B', rowIndex: 22, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Team building HSE reparto',        categoria: 'team building hse evento sicurezza',               tipo: 'consumed_service', importo: null, partecipanti: 80,  fonte: 'dichiarazione HR' } },
  { recordId: 'B24', batchId: 'STRESS-B', rowIndex: 23, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'People day evento',               categoria: 'people day evento aziendale generico',              tipo: 'consumed_service', importo: null, partecipanti: 200, fonte: 'dichiarazione HR' } },
  // Deep eligible (5 records)
  { recordId: 'B25', batchId: 'STRESS-B', rowIndex: 24, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Reskilling tecnico operatori CNC', categoria: 'reskilling tecnico professionale formazione upskilling', tipo: 'training', importo: 25000, partecipanti: 40, fonte: 'report interno HR', department_group: 'Produzione' } },
  { recordId: 'B26', batchId: 'STRESS-B', rowIndex: 25, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Mentoring capi turno',             categoria: 'mentoring aziendale leadership sviluppo professionale', tipo: 'training', importo: 8000, partecipanti: 25, fonte: 'report interno HR', department_group: 'Produzione' } },
  { recordId: 'B27', batchId: 'STRESS-B', rowIndex: 26, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Volontariato territoriale',         categoria: 'volontariato aziendale territorio impatto sociale comunità', tipo: 'consumed_service', importo: 12000, partecipanti: 30, fonte: 'report interno HR' } },
  { recordId: 'B28', batchId: 'STRESS-B', rowIndex: 27, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Caregiver support',                categoria: 'caregiver supporto assistenza familiare welfare',   tipo: 'consumed_service', importo: 6000, partecipanti: 15, fonte: 'report interno HR' } },
  { recordId: 'B29', batchId: 'STRESS-B', rowIndex: 28, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Corso leadership manager',         categoria: 'leadership program corso manageriale sviluppo',     tipo: 'training', importo: 15000, partecipanti: 18, fonte: 'report interno HR', department_group: 'Management' } },
  // Additional: insurance, pension, policies
  { recordId: 'B30', batchId: 'STRESS-B', rowIndex: 29, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Assicurazione sanitaria',          categoria: 'assicurazione sanitaria polizza welfare integrativa', tipo: 'long_term_benefit', importo: 45000, partecipanti: 350, fonte: 'dichiarazione HR' } },
  { recordId: 'B31', batchId: 'STRESS-B', rowIndex: 30, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Previdenza integrativa TFR',       categoria: 'previdenza integrativa fondo pensione pensione',    tipo: 'long_term_benefit', importo: 30000, partecipanti: 280, fonte: 'dichiarazione HR' } },
  { recordId: 'B32', batchId: 'STRESS-B', rowIndex: 31, detectedRecordType: 'structural_policy', raw: { nome_iniziativa: 'Smart working policy',          categoria: 'smart working lavoro agile flessibilità policy',    tipo: 'structural_policy', importo: null, partecipanti: null, fonte: 'dichiarazione HR' } },
  { recordId: 'B33', batchId: 'STRESS-B', rowIndex: 32, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Nido aziendale contributo',        categoria: 'nido aziendale childcare contributo asilo',         tipo: 'consumed_service', importo: 8000,  partecipanti: 12, fonte: 'dichiarazione HR' } },
  { recordId: 'B34', batchId: 'STRESS-B', rowIndex: 33, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Supporto psicologico dipendenti',  categoria: 'supporto psicologico benessere counseling mental health', tipo: 'consumed_service', importo: 5000, partecipanti: 22, fonte: 'dichiarazione HR' } },
  { recordId: 'B35', batchId: 'STRESS-B', rowIndex: 34, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Knowledge transfer tecnici',       categoria: 'trasferimento competenze senior tecnici legacy',    tipo: 'training', importo: 4000,  partecipanti: 25, fonte: 'report interno HR' } },
  { recordId: 'B36', batchId: 'STRESS-B', rowIndex: 35, detectedRecordType: 'training',        raw: { nome_iniziativa: 'D&I awareness sessione',           categoria: 'diversity inclusion awareness sessione workshop',   tipo: 'training', importo: null,  partecipanti: 40, fonte: 'dichiarazione HR' } },
  { recordId: 'B37', batchId: 'STRESS-B', rowIndex: 36, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Reskilling digitale basi',         categoria: 'reskilling digitale formazione professionale',      tipo: 'training', importo: 6000,  partecipanti: 28, fonte: 'report interno HR' } },
];

// ── STRESS-C: Deep Activation Services (180 workers) ─────────────────────────
// Profile: deep initiatives on all pillars, L2/L3 evidence, structured programs

const STRESS_C_RECORDS: RawUploadedRecord[] = [
  // GROWTH — strong training with LMS exports (6 records)
  { recordId: 'C01', batchId: 'STRESS-C', rowIndex: 0,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Formazione professionalizzante LMS Q4', categoria: 'formazione professionale corso upskilling sviluppo professionale reskilling', tipo: 'training', importo: 28000, partecipanti: 65, fonte: 'export lms piattaforma' } },
  { recordId: 'C02', batchId: 'STRESS-C', rowIndex: 1,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Reskilling digitale avanzato',       categoria: 'reskilling digitale professionale digital skills upskilling',          tipo: 'training', importo: 18000, partecipanti: 45, fonte: 'export lms piattaforma' } },
  { recordId: 'C03', batchId: 'STRESS-C', rowIndex: 2,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Academy manageriale leadership',     categoria: 'academy aziendale leadership development manageriale upskilling',       tipo: 'training', importo: 22000, partecipanti: 30, fonte: 'export fornitore formazione' } },
  { recordId: 'C04', batchId: 'STRESS-C', rowIndex: 3,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Corso certificazione professionale', categoria: 'certificazione professionale upskilling career path formazione',         tipo: 'training', importo: 12000, partecipanti: 18, fonte: 'export fornitore formazione' } },
  { recordId: 'C05', batchId: 'STRESS-C', rowIndex: 4,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Micro-learning continuous learning', categoria: 'micro learning continuous e-learning digitale formazione professionale',  tipo: 'training', importo: 4000,  partecipanti: 80, fonte: 'export lms piattaforma' } },
  { recordId: 'C06', batchId: 'STRESS-C', rowIndex: 5,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Reskilling data analytics',          categoria: 'reskilling data analytics formazione digitale upskilling',              tipo: 'training', importo: 10000, partecipanti: 22, fonte: 'export lms piattaforma' } },
  // CONNECTION — mentoring, coaching, communities (6 records)
  { recordId: 'C07', batchId: 'STRESS-C', rowIndex: 6,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'Mentoring senior-junior strutturato', categoria: 'mentoring aziendale senior junior sviluppo professionale strutturato',  tipo: 'training', importo: 10000, partecipanti: 50, fonte: 'report interno HR' } },
  { recordId: 'C08', batchId: 'STRESS-C', rowIndex: 7,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Coaching manageriale',              categoria: 'coaching manageriale sviluppo professionale leadership',                tipo: 'consumed_service', importo: 8000, partecipanti: 25, fonte: 'export fornitore welfare' } },
  { recordId: 'C09', batchId: 'STRESS-C', rowIndex: 8,  detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Onboarding buddy program',          categoria: 'onboarding buddy program mentoring aziendale',                          tipo: 'consumed_service', importo: 3000, partecipanti: 30, fonte: 'report interno HR' } },
  { recordId: 'C10', batchId: 'STRESS-C', rowIndex: 9,  detectedRecordType: 'training',        raw: { nome_iniziativa: 'D&I programma strutturato annuale', categoria: 'diversity inclusion programma strutturato annuale percorso D&I',         tipo: 'training', importo: 12000, partecipanti: 55, fonte: 'report interno HR' } },
  { recordId: 'C11', batchId: 'STRESS-C', rowIndex: 10, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Community interna competenze',      categoria: 'community aziendale competenze mentoring peer inter-funzionale',        tipo: 'consumed_service', importo: 2000, partecipanti: 65, fonte: 'report interno HR' } },
  { recordId: 'C12', batchId: 'STRESS-C', rowIndex: 11, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Peer learning circle',              categoria: 'peer learning apprendimento professionale upskilling coaching',         tipo: 'consumed_service', importo: 2000, partecipanti: 45, fonte: 'report interno HR' } },
  // LIFE — clinical-grade support with provider exports (7 records)
  { recordId: 'C13', batchId: 'STRESS-C', rowIndex: 12, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Supporto psicologico provider export', categoria: 'supporto psicologico counselling mental health benessere psicologico',  tipo: 'consumed_service', importo: 18000, partecipanti: 45, fonte: 'export fornitore welfare' } },
  { recordId: 'C14', batchId: 'STRESS-C', rowIndex: 13, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Caregiver support provider',        categoria: 'caregiver assistenza familiare eldercare supporto welfare',             tipo: 'consumed_service', importo: 12000, partecipanti: 20, fonte: 'export fornitore welfare' } },
  { recordId: 'C15', batchId: 'STRESS-C', rowIndex: 14, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Nido aziendale childcare provider', categoria: 'nido aziendale childcare contributo asilo bambini',                      tipo: 'consumed_service', importo: 15000, partecipanti: 16, fonte: 'export fornitore welfare' } },
  { recordId: 'C16', batchId: 'STRESS-C', rowIndex: 15, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Assicurazione sanitaria integrativa L2', categoria: 'assicurazione sanitaria polizza welfare copertura integrativa',      tipo: 'long_term_benefit', importo: 35000, partecipanti: 155, fonte: 'report interno HR' } },
  { recordId: 'C17', batchId: 'STRESS-C', rowIndex: 16, detectedRecordType: 'structural_policy', raw: { nome_iniziativa: 'Smart working con usage data',   categoria: 'smart working lavoro agile flessibilità policy uptake utilizzo',       tipo: 'structural_policy', importo: 2000, partecipanti: 130, fonte: 'report interno HR' } },
  { recordId: 'C18', batchId: 'STRESS-C', rowIndex: 17, detectedRecordType: 'structural_policy', raw: { nome_iniziativa: 'Diritto alla disconnessione uptake', categoria: 'diritto disconnessione policy uptake flessibilità misurabile',         tipo: 'structural_policy', importo: 1500, partecipanti: 125, fonte: 'report interno HR' } },
  { recordId: 'C19', batchId: 'STRESS-C', rowIndex: 18, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Health check prevenzione',          categoria: 'salute checkup prevenzione wellness health check fisioterapia',        tipo: 'consumed_service', importo: 4000, partecipanti: 50, fonte: 'export fornitore welfare' } },
  // IMPACT — volunteering, territory, ESG (5 records)
  { recordId: 'C20', batchId: 'STRESS-C', rowIndex: 19, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Volontariato aziendale ONG',        categoria: 'volontariato aziendale territorio comunità impatto sociale partner ONG', tipo: 'consumed_service', importo: 14000, partecipanti: 38, fonte: 'export fornitore welfare' } },
  { recordId: 'C21', batchId: 'STRESS-C', rowIndex: 20, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Partnership scuola-lavoro',         categoria: 'scuola lavoro partnership territorio impatto comunità',                 tipo: 'consumed_service', importo: 6000, partecipanti: 25, fonte: 'report interno HR' } },
  { recordId: 'C22', batchId: 'STRESS-C', rowIndex: 21, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Iniziativa territoriale NGO',       categoria: 'territorio impatto sociale comunità partner NGO volontariato',          tipo: 'consumed_service', importo: 8000, partecipanti: 28, fonte: 'export fornitore welfare' } },
  { recordId: 'C23', batchId: 'STRESS-C', rowIndex: 22, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Community impact project',          categoria: 'comunità impatto territoriale volontariato progetto sociale',           tipo: 'consumed_service', importo: 5000, partecipanti: 22, fonte: 'report interno HR' } },
  { recordId: 'C24', batchId: 'STRESS-C', rowIndex: 23, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'ESG ambassador program',            categoria: 'territorio impatto ESG ambassador volontariato aziendale',              tipo: 'consumed_service', importo: 4000, partecipanti: 18, fonte: 'report interno HR' } },
  // LEGACY (4 records)
  { recordId: 'C25', batchId: 'STRESS-C', rowIndex: 24, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Knowledge transfer senior expert',  categoria: 'trasferimento competenze senior junior legacy conoscenza organizzativa', tipo: 'training', importo: 8000, partecipanti: 35, fonte: 'report interno HR' } },
  { recordId: 'C26', batchId: 'STRESS-C', rowIndex: 25, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Previdenza integrativa fondo',       categoria: 'previdenza integrativa fondo pensione pensione futuro',                 tipo: 'long_term_benefit', importo: 22000, partecipanti: 120, fonte: 'report interno HR' } },
  { recordId: 'C27', batchId: 'STRESS-C', rowIndex: 26, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Piano successione competenze',       categoria: 'piano successione legacy competenze organizzative memoria aziendale',   tipo: 'training', importo: 5000, partecipanti: 20, fonte: 'report interno HR' } },
  { recordId: 'C28', batchId: 'STRESS-C', rowIndex: 27, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Academy interna senior expert',      categoria: 'academy interna senior legacy trasferimento competenze formazione',     tipo: 'training', importo: 6000, partecipanti: 18, fonte: 'report interno HR' } },
  // Economic relief — moderate, not dominant (3 records)
  { recordId: 'C29', batchId: 'STRESS-C', rowIndex: 28, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Buoni pasto mensili',               categoria: 'buoni pasto economic relief benefit',                                   tipo: 'monetary_benefit', importo: 18000, partecipanti: 155, fonte: 'dichiarazione HR' } },
  { recordId: 'C30', batchId: 'STRESS-C', rowIndex: 29, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Voucher welfare moderato',           categoria: 'voucher welfare fringe benefit generalista limitato',                   tipo: 'monetary_benefit', importo: 6000, partecipanti: 100, fonte: 'dichiarazione HR' } },
  { recordId: 'C31', batchId: 'STRESS-C', rowIndex: 30, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Fringe benefit non dominante',       categoria: 'fringe benefit welfare generalista economic relief',                    tipo: 'monetary_benefit', importo: 8000, partecipanti: 140, fonte: 'dichiarazione HR' } },
  // Compliance blocked (3 records)
  { recordId: 'C32', batchId: 'STRESS-C', rowIndex: 31, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Sicurezza obbligatoria 81',          categoria: 'sicurezza obbligatoria compliance hse dlgs 81',                         tipo: 'training', importo: 5000, partecipanti: 180, fonte: 'report interno HSE' } },
  { recordId: 'C33', batchId: 'STRESS-C', rowIndex: 32, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Privacy GDPR obbligatoria',          categoria: 'gdpr privacy obbligatoria compliance adempimento',                      tipo: 'training', importo: 3000, partecipanti: 180, fonte: 'report interno HR' } },
  { recordId: 'C34', batchId: 'STRESS-C', rowIndex: 33, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Sorveglianza sanitaria',             categoria: 'sorveglianza sanitaria obbligatoria medico competente',                 tipo: 'training', importo: 6000, partecipanti: 180, fonte: 'report interno HSE' } },
  // Additional deep (6 more records)
  { recordId: 'C35', batchId: 'STRESS-C', rowIndex: 34, detectedRecordType: 'training',        raw: { nome_iniziativa: 'Innovation bootcamp',               categoria: 'bootcamp formativo hackathon workshop professionale innovazione',        tipo: 'training', importo: 8000, partecipanti: 25, fonte: 'export fornitore formazione' } },
  { recordId: 'C36', batchId: 'STRESS-C', rowIndex: 35, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Wellbeing coach strutturato',       categoria: 'benessere wellness coach programma strutturato salute provider',        tipo: 'consumed_service', importo: 6000, partecipanti: 30, fonte: 'export fornitore welfare' } },
  { recordId: 'C37', batchId: 'STRESS-C', rowIndex: 36, detectedRecordType: 'structural_policy', raw: { nome_iniziativa: 'Permessi extra genitorialità',   categoria: 'permessi extra genitorialità parental leave policy uptake congedo',     tipo: 'structural_policy', importo: 1000, partecipanti: 38, fonte: 'report interno HR' } },
  { recordId: 'C38', batchId: 'STRESS-C', rowIndex: 37, detectedRecordType: 'structural_policy', raw: { nome_iniziativa: 'Flessibilità oraria con uptake', categoria: 'flessibilità oraria flexible working policy uptake misurata',           tipo: 'structural_policy', importo: 500, partecipanti: 110, fonte: 'report interno HR' } },
  { recordId: 'C39', batchId: 'STRESS-C', rowIndex: 38, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Parità di genere D&I',              categoria: 'parità genere inclusion programma D&I gender equity pari opportunità',  tipo: 'consumed_service', importo: 3000, partecipanti: 60, fonte: 'report interno HR' } },
  { recordId: 'C40', batchId: 'STRESS-C', rowIndex: 39, detectedRecordType: 'welfare_program', raw: { nome_iniziativa: 'Caregiver secondario programma',    categoria: 'caregiver supporto familiare assistenza welfare',                       tipo: 'consumed_service', importo: 4000, partecipanti: 14, fonte: 'report interno HR' } },
];

// ── Run pipeline for each company ─────────────────────────────────────────────

interface BenchmarkResult {
  company: string;
  tenantCode: string;
  workforce: number;
  recordCount: number;
  koraIndex: number;
  confidenceScore: number;
  safeguard: string;
  ar: number;
  mar: number;
  eligible: number;
  limited: number;
  blocked: number;
  reviewRequired: number;
  btiScore: number;
  deepActivation: number;
  economicRelief: number;
  complianceBlocked: number;
  activationDebt: number;
  pillarDistribution: Record<string, number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  macroblocks: any;
}

function runBenchmark(
  company: string,
  tenantCode: string,
  records: RawUploadedRecord[],
  workforce: number,
): BenchmarkResult {
  const result = runKoraPipeline({
    tenantId: tenantCode,
    batchId:  `BATCH_${tenantCode}`,
    records,
    workforcePopulation: workforce,
  });

  const r = result;
  return {
    company,
    tenantCode,
    workforce,
    recordCount: records.length,
    koraIndex:         Math.round(r.koraIndex.value * 10) / 10,
    confidenceScore:   Math.round(r.confidence.score * 10) / 10,
    safeguard:         r.activation.safeguardStatus,
    ar:                Math.round(r.activation.activationReach  * 1000) / 10,
    mar:               Math.round(r.activation.meaningfulActivationReach * 1000) / 10,
    eligible:          r.eligibilitySummary.eligibleCount,
    limited:           r.eligibilitySummary.limitedCount,
    blocked:           r.eligibilitySummary.blockedCount,
    reviewRequired:    r.eligibilitySummary.reviewRequiredCount,
    btiScore:          Math.round(r.bti.btiScore * 10) / 10,
    deepActivation:    r.bti.deepActivationSpend,
    economicRelief:    r.bti.economicReliefSpend,
    complianceBlocked: r.bti.blockedComplianceSpend,
    activationDebt:    r.bti.activationDebt,
    pillarDistribution: r.pillarDistribution as Record<string, number>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  macroblocks:       r.koraIndex.macroblocks as any,
  };
}

const resA = runBenchmark('Benefit Rich Retail S.p.A.',          'STRESS-A', STRESS_A_RECORDS, 80);
const resB = runBenchmark('Compliance Heavy Manufacturing S.p.A.','STRESS-B', STRESS_B_RECORDS, 420);
const resC = runBenchmark('Deep Activation Services S.p.A.',     'STRESS-C', STRESS_C_RECORDS, 180);

const results = [resA, resB, resC];

// ── Print benchmark table ─────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(100));
console.log('B21 — THREE-COMPANY STRESS BENCHMARK');
console.log('KORA Index v1.0 / pre_empirical_calibration');
console.log('═'.repeat(100));

for (const r of results) {
  console.log(`\n▶ ${r.company} (${r.tenantCode})`);
  console.log(`  Workforce: ${r.workforce} workers | Records: ${r.recordCount}`);
  console.log(`  ─────────────────────────────────────────────────────────────────`);
  console.log(`  KORA Index:      ${r.koraIndex}/100`);
  console.log(`  Confidence Score: ${r.confidenceScore}/100 (external, weight=0)`);
  console.log(`  Safeguard:       ${r.safeguard}`);
  console.log(`  AR:  ${r.ar}%  |  MAR: ${r.mar}%`);
  console.log(`  Eligibility: ${r.eligible} eligible | ${r.limited} limited | ${r.blocked} blocked | ${r.reviewRequired} review`);
  console.log(`  BTI Score:   ${r.btiScore}/100`);
  console.log(`    Deep Activation: €${r.deepActivation.toLocaleString('it-IT')}`);
  console.log(`    Economic Relief: €${r.economicRelief.toLocaleString('it-IT')}`);
  console.log(`    Compliance Blkd: €${r.complianceBlocked.toLocaleString('it-IT')}`);
  console.log(`    Activation Debt: €${r.activationDebt.toLocaleString('it-IT')}`);
  console.log(`  Pillar: LIFE=${r.pillarDistribution['LIFE'] ?? 0} GROWTH=${r.pillarDistribution['GROWTH'] ?? 0} CONNECTION=${r.pillarDistribution['CONNECTION'] ?? 0} IMPACT=${r.pillarDistribution['IMPACT'] ?? 0} LEGACY=${r.pillarDistribution['LEGACY'] ?? 0}`);
  const mb = r.macroblocks;
  console.log(`  Macroblocks: REACH=${Math.round(mb.activationReach)} | QUALITY=${Math.round(mb.activationQuality)} | EQUITY=${Math.round(mb.distributionEquity)} | BTI=${Math.round(mb.budgetToHumanImpact)}`);
}

// ── Ranking ───────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(100));
console.log('FINAL RANKING (KORA Index v1.0):');
const ranked = [...results].sort((a, b) => b.koraIndex - a.koraIndex);
ranked.forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.tenantCode}: ${r.koraIndex}/100 | Safeguard: ${r.safeguard} | AR: ${r.ar}% MAR: ${r.mar}%`);
});
console.log('');

// ── Vision conformance checks ─────────────────────────────────────────────────
console.log('═'.repeat(100));
console.log('VISION CONFORMANCE ASSERTIONS:');
const checks: Array<{ name: string; pass: boolean; detail: string }> = [];

checks.push({ name: 'C ranks first', pass: resC.koraIndex > resA.koraIndex && resC.koraIndex > resB.koraIndex, detail: `C=${resC.koraIndex} A=${resA.koraIndex} B=${resB.koraIndex}` });
checks.push({ name: 'A not near C (< C-15)', pass: resA.koraIndex < resC.koraIndex - 15, detail: `gap: ${(resC.koraIndex - resA.koraIndex).toFixed(1)} points` });
checks.push({ name: 'B not near C (gap C-B > 10)', pass: resC.koraIndex - resB.koraIndex > 10, detail: `gap C-B: ${(resC.koraIndex - resB.koraIndex).toFixed(1)} points` });
checks.push({ name: 'C Safeguard CLEAR', pass: resC.safeguard === 'CLEAR', detail: resC.safeguard });
checks.push({ name: 'A Safeguard not CLEAR', pass: resA.safeguard !== 'CLEAR', detail: resA.safeguard });
checks.push({ name: 'B has high blocked count', pass: resB.blocked >= 12, detail: `blocked=${resB.blocked}` });
checks.push({ name: 'C has higher eligible ratio than B', pass: resC.eligible / resC.recordCount > resB.eligible / resB.recordCount, detail: `C=${(resC.eligible/resC.recordCount*100).toFixed(0)}% B=${(resB.eligible/resB.recordCount*100).toFixed(0)}%` });
checks.push({ name: 'A limited/economic_relief heavy', pass: resA.limited >= 8, detail: `limited=${resA.limited}` });
checks.push({ name: 'Score ceiling: C < 90', pass: resC.koraIndex < 90, detail: `C=${resC.koraIndex}` });
checks.push({ name: 'Score ceiling: A < 75', pass: resA.koraIndex < 75, detail: `A=${resA.koraIndex}` });
checks.push({ name: 'Score ceiling: B < 70', pass: resB.koraIndex < 70, detail: `B=${resB.koraIndex}` });
checks.push({ name: 'C BTI better than A', pass: resC.btiScore >= resA.btiScore, detail: `C=${resC.btiScore} A=${resA.btiScore}` });
checks.push({ name: 'C BTI better than B', pass: resC.btiScore >= resB.btiScore, detail: `C=${resC.btiScore} B=${resB.btiScore}` });
checks.push({ name: 'C compliance blocked minimal', pass: resC.blocked <= 5, detail: `C blocked=${resC.blocked}` });
checks.push({ name: 'B compliance blocked spend > deep', pass: resB.complianceBlocked > resB.deepActivation, detail: `compliance=${resB.complianceBlocked} deep=${resB.deepActivation}` });

for (const c of checks) {
  console.log(`  ${c.pass ? '✓' : '✗'} ${c.name}: ${c.detail}`);
}

const passCount = checks.filter(c => c.pass).length;
console.log(`\n  ${passCount}/${checks.length} vision conformance checks passed`);

// ── Final verdict ─────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(100));
const allCritical = checks.filter((_, i) => i < 6).every(c => c.pass);
const noScoreInflation = checks.filter(c => c.name.includes('ceiling')).every(c => c.pass);
const verdict =
  passCount >= 13 && allCritical && noScoreInflation ? 'ALGORITHM ROBUST' :
  passCount >= 10 && allCritical                     ? 'CONDITIONAL ROBUST' :
  passCount >= 7                                     ? 'FRAGILE' :
                                                       'FAIL';
console.log(`VERDICT: ${verdict} (${passCount}/${checks.length})`);
console.log('═'.repeat(100) + '\n');
