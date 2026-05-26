// lib/kora-engine/eligibility-examples.ts
// 25 reference examples for the Eligibility Gate Engine v0.1.
// Covers all 4 classification buckets across canonical Italian/English scenarios.
// Each example is a self-contained test fixture: input record + expected output.
// Use with runEligibilityExamples() for automated verification.

import type { RawUploadedRecord, EligibilityStatus, EligibilityResult } from './types';
import { classifyEligibility } from './eligibility-gate';

// ── Example interface ─────────────────────────────────────────────────────────

export interface EligibilityExample {
  id: string;
  title: string;
  description: string;
  inputRecord: RawUploadedRecord;
  expectedStatus: EligibilityStatus;
  expectedConfidenceBand: { min: number; max: number };
  expectedReasonContains: string[];
  doctrineNote: string;
}

export interface EligibilityExampleResult {
  id: string;
  title: string;
  passed: boolean;
  statusMatch: boolean;
  confidenceInBand: boolean;
  reasonMatch: boolean;
  expected: EligibilityStatus;
  actual: EligibilityStatus;
  actualReason: string;
  actualConfidence: number;
  expectedConfidenceBand: { min: number; max: number };
  fullResult: EligibilityResult;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function makeRaw(
  id: string,
  rowIndex: number,
  raw: Record<string, unknown>,
  detectedRecordType: RawUploadedRecord['detectedRecordType'] = 'welfare_program',
): RawUploadedRecord {
  return {
    recordId: id,
    batchId: 'example_batch_v01',
    raw,
    rowIndex,
    detectedRecordType,
  };
}

// ── BLOCKED examples (1–5) ────────────────────────────────────────────────────

const EXAMPLE_01: EligibilityExample = {
  id: 'blocked_01_dlgs81',
  title: 'Corso Sicurezza Obbligatorio D.Lgs 81',
  description: 'Formazione sicurezza sul lavoro obbligatoria per legge. Testo esplicito D.Lgs 81 nel nome.',
  inputRecord: makeRaw('ex-blocked-01', 0, {
    'Nome Iniziativa': 'Corso Sicurezza Obbligatorio D.Lgs 81',
    'Categoria': 'sicurezza obbligatoria',
    'Obbligatorio': 'si',
    'Fornitore': 'Provider HSE',
    'Tipo Evidenza': 'internal_budget_report',
  }, 'training'),
  expectedStatus: 'blocked',
  expectedConfidenceBand: { min: 0.88, max: 0.97 },
  expectedReasonContains: ['conformità', 'baseline'],
  doctrineNote: 'D.Lgs 81/08 è compliance legale obbligatoria. Non genera IU, non entra nel KORA Index, non entra nel PIB. Blocked by Design.',
};

const EXAMPLE_02: EligibilityExample = {
  id: 'blocked_02_dpi',
  title: 'DPI Plant Bergamo',
  description: 'Distribuzione Dispositivi di Protezione Individuale. Marcato obbligatorio, categoria sicurezza.',
  inputRecord: makeRaw('ex-blocked-02', 1, {
    'Nome Iniziativa': 'DPI Plant Bergamo',
    'Categoria': 'sicurezza',
    'Obbligatorio': 'si',
    'Sede': 'Plant Bergamo',
  }, 'welfare_program'),
  expectedStatus: 'blocked',
  expectedConfidenceBand: { min: 0.68, max: 0.82 },
  expectedReasonContains: ['conformità', 'baseline'],
  doctrineNote: 'DPI = Dispositivi di Protezione Individuale. Obbligatorio per legge (D.Lgs 81). Blocked via mandatory=true + categoria sicurezza. Confidence media perché il termine DPI da solo non è un keyword esplicito di compliance — la classificazione avviene per contesto.',
};

const EXAMPLE_03: EligibilityExample = {
  id: 'blocked_03_sorveglianza_sanitaria',
  title: 'Sorveglianza Sanitaria 2024',
  description: 'Visita medica obbligatoria da medico competente. Keyword esplicita nel nome.',
  inputRecord: makeRaw('ex-blocked-03', 2, {
    'Nome Iniziativa': 'Sorveglianza Sanitaria 2024',
    'Categoria': 'sicurezza e salute occupazionale',
    'Fornitore': 'Medico Competente Dott. Rossi',
    'Tipo Evidenza': 'internal_budget_report',
  }, 'training'),
  expectedStatus: 'blocked',
  expectedConfidenceBand: { min: 0.88, max: 0.97 },
  expectedReasonContains: ['conformità', 'baseline'],
  doctrineNote: '"Sorveglianza sanitaria" è un termine di compliance obbligatoria D.Lgs 81 art. 41. Match esplicito nel nome → confidence alta.',
};

const EXAMPLE_04: EligibilityExample = {
  id: 'blocked_04_gdpr_obbligatorio',
  title: 'Formazione Privacy GDPR Obbligatoria',
  description: 'Corso obbligatorio di conformità GDPR. Keyword GDPR+obbligatorio nel nome.',
  inputRecord: makeRaw('ex-blocked-04', 3, {
    'Nome Iniziativa': 'Formazione Privacy GDPR Obbligatoria',
    'Categoria': 'compliance',
    'Obbligatorio': 'si',
    'Tipo Evidenza': 'lms_export',
  }, 'training'),
  expectedStatus: 'blocked',
  expectedConfidenceBand: { min: 0.88, max: 0.97 },
  expectedReasonContains: ['conformità', 'baseline'],
  doctrineNote: 'Formazione GDPR obbligatoria = compliance legale. "Gdpr obbligatorio" è keyword esplicita. Non confondere con privacy awareness volontaria (che può essere eligible).',
};

const EXAMPLE_05: EligibilityExample = {
  id: 'blocked_05_patentino_carrellisti',
  title: 'Patentino Carrellisti Obbligatorio',
  description: 'Certificazione obbligatoria per operatori di carrelli elevatori. Keyword esplicita.',
  inputRecord: makeRaw('ex-blocked-05', 4, {
    'Nome Iniziativa': 'Patentino Carrellisti Obbligatorio',
    'Categoria': 'formazione obbligatoria',
    'Obbligatorio': 'si',
    'Sede': 'Plant Bergamo',
  }, 'training'),
  expectedStatus: 'blocked',
  expectedConfidenceBand: { min: 0.88, max: 0.97 },
  expectedReasonContains: ['conformità', 'baseline'],
  doctrineNote: '"Carrellisti obbligatorio" è keyword esplicita di compliance. Accoppiamento patentino+carrellisti+obbligatorio è non ambiguo.',
};

// ── LIMITED examples (6–10) ───────────────────────────────────────────────────

const EXAMPLE_06: EligibilityExample = {
  id: 'limited_06_buoni_pasto',
  title: 'Buoni Pasto Mensili',
  description: 'Erogazione mensile di buoni pasto. Benefit cash-like, no attivazione.',
  inputRecord: makeRaw('ex-limited-06', 5, {
    'Nome Iniziativa': 'Buoni Pasto Mensili',
    'Categoria': 'benefit',
    'Importo Budget (€)': '45000',
    'Fonte Budget': 'budget welfare',
    'Tipo Evidenza Budget': 'internal_budget_report',
  }, 'budget'),
  expectedStatus: 'limited',
  expectedConfidenceBand: { min: 0.85, max: 0.97 },
  expectedReasonContains: ['sollievo economico'],
  doctrineNote: 'Buoni pasto = economic relief. Non genera IU. Tracked in BTI come economic_relief_spend. KORA_DOCTRINE §2.7.',
};

const EXAMPLE_07: EligibilityExample = {
  id: 'limited_07_buoni_benzina',
  title: 'Buoni Benzina Dipendenti',
  description: 'Contributo carburante mensile. Cash-like, generica, no profondità di attivazione.',
  inputRecord: makeRaw('ex-limited-07', 6, {
    'Nome Iniziativa': 'Buoni Benzina Dipendenti',
    'Categoria': 'fringe benefit',
    'Partecipanti': '180',
    'Forza Lavoro Totale': '250',
  }, 'welfare_program'),
  expectedStatus: 'limited',
  expectedConfidenceBand: { min: 0.85, max: 0.97 },
  expectedReasonContains: ['sollievo economico'],
  doctrineNote: 'Buoni carburante = economic relief. Alta partecipazione ma zero profondità di attivazione. Monitora come spesa, non come impatto.',
};

const EXAMPLE_08: EligibilityExample = {
  id: 'limited_08_gift_card_natale',
  title: 'Gift Card Natale 2024',
  description: 'Distribuzione gift card natalizie a tutti i dipendenti. Benefit generalista.',
  inputRecord: makeRaw('ex-limited-08', 7, {
    'Nome Iniziativa': 'Gift Card Natale 2024',
    'Categoria': 'benefit natalizio',
    'Partecipanti': '250',
    'Forza Lavoro Totale': '250',
    'Importo (€)': '25000',
  }, 'welfare_program'),
  expectedStatus: 'limited',
  expectedConfidenceBand: { min: 0.85, max: 0.97 },
  expectedReasonContains: ['sollievo economico'],
  doctrineNote: 'Gift card = cash-equivalent. Anche se distribuita a tutti i dipendenti, non genera attivazione. Classificata come economic_relief_spend nel BTI Engine.',
};

const EXAMPLE_09: EligibilityExample = {
  id: 'limited_09_fringe_benefit',
  title: 'Pacchetto Fringe Benefit Generico',
  description: 'Pacchetto fringe benefit annuale generico non specificato. Benefit monetario.',
  inputRecord: makeRaw('ex-limited-09', 8, {
    'Nome Iniziativa': 'Pacchetto Fringe Benefit',
    'Categoria': 'welfare aziendale',
    'Descrizione': 'Insieme di benefit monetari flessibili a scelta del dipendente',
  }, 'welfare_program'),
  expectedStatus: 'limited',
  expectedConfidenceBand: { min: 0.85, max: 0.97 },
  expectedReasonContains: ['sollievo economico'],
  doctrineNote: 'Fringe benefit generico = limited. Nota: se il pacchetto include servizi specifici (es. asilo nido) quei singoli record devono essere caricati separatamente per ricevere classificazione eligible.',
};

const EXAMPLE_10: EligibilityExample = {
  id: 'limited_10_voucher_spesa',
  title: 'Voucher Spesa Supermercato',
  description: 'Distribuzione voucher supermercato. Generalista, cash-equivalent.',
  inputRecord: makeRaw('ex-limited-10', 9, {
    'Nome Iniziativa': 'Voucher Spesa Supermercato',
    'Categoria': 'benefit mensile',
    'Importo Budget (€)': '18000',
  }, 'welfare_program'),
  expectedStatus: 'limited',
  expectedConfidenceBand: { min: 0.85, max: 0.97 },
  expectedReasonContains: ['sollievo economico'],
  doctrineNote: 'Voucher spesa = economic relief generalista. Keyword esplicita nel nome → alta confidence.',
};

// ── ELIGIBLE examples (11–20) ─────────────────────────────────────────────────

const EXAMPLE_11: EligibilityExample = {
  id: 'eligible_11_asilo_nido',
  title: 'Asilo Nido Aziendale',
  description: 'Convenzione con asilo nido per dipendenti con figli. Servizio reale, non cash.',
  inputRecord: makeRaw('ex-eligible-11', 10, {
    'Nome Iniziativa': 'Asilo Nido Aziendale',
    'Categoria': 'care economy',
    'Obbligatorio': 'no',
    'Partecipanti': '14',
    'Forza Lavoro Totale': '250',
    'Tipo Evidenza': 'welfare_provider_export',
  }, 'welfare_program'),
  expectedStatus: 'eligible',
  expectedConfidenceBand: { min: 0.78, max: 0.95 },
  expectedReasonContains: ['volontario'],
  doctrineNote: 'Servizio di cura childcare = LIFE pillar. Volontario, aggiuntivo, verificabile tramite provider export. Genera IU attraverso l\'IU engine.',
};

const EXAMPLE_12: EligibilityExample = {
  id: 'eligible_12_caregiver_support',
  title: 'Caregiver Support Program',
  description: 'Supporto aggregato per dipendenti caregiver. Servizi di assistenza familiare.',
  inputRecord: makeRaw('ex-eligible-12', 11, {
    'Nome Iniziativa': 'Caregiver Support Program',
    'Categoria': 'supporto familiare',
    'Obbligatorio': 'no',
    'Partecipanti': '22',
    'Forza Lavoro Totale': '250',
    'Tipo Evidenza': 'welfare_provider_export',
  }, 'welfare_program'),
  expectedStatus: 'eligible',
  expectedConfidenceBand: { min: 0.78, max: 0.95 },
  expectedReasonContains: ['volontario'],
  doctrineNote: 'Caregiver = LIFE pillar (cura anziani/familiare). Volontario, aggregato (no dati individuali), verificabile.',
};

const EXAMPLE_13: EligibilityExample = {
  id: 'eligible_13_mental_health_aggregate',
  title: 'Supporto Psicologico Aziendale (aggregato)',
  description: 'Accesso aggregato a colloqui psicologici via piattaforma partner. Solo dati aggregati.',
  inputRecord: makeRaw('ex-eligible-13', 12, {
    'Nome Iniziativa': 'Supporto Psicologico Aziendale',
    'Categoria': 'benessere psicologico',
    'Obbligatorio': 'no',
    'Descrizione': 'Accesso aggregato a colloqui psicologici tramite piattaforma partner — dati aggregati',
    'Partecipanti': '47',
    'Tipo Evidenza': 'welfare_provider_export',
  }, 'welfare_program'),
  expectedStatus: 'eligible',
  expectedConfidenceBand: { min: 0.78, max: 0.95 },
  expectedReasonContains: ['volontario'],
  doctrineNote: 'Supporto psicologico come infrastruttura di servizio aggregata = LIFE pillar. Distinto da sessioni individuali (che richiedono review_required). Dati di partecipazione aggregati, no PII.',
};

const EXAMPLE_14: EligibilityExample = {
  id: 'eligible_14_upskilling_ai',
  title: 'Corso Upskilling AI Skills',
  description: 'Percorso di upskilling su intelligenza artificiale e strumenti digitali. Non obbligatorio.',
  inputRecord: makeRaw('ex-eligible-14', 13, {
    'Nome Iniziativa': 'Corso Upskilling AI Skills',
    'Categoria': 'formazione professionalizzante',
    'Obbligatorio': 'no',
    'Partecipanti': '83',
    'Tipo Evidenza': 'lms_export',
    'Fornitore': 'LMS interno',
  }, 'training'),
  expectedStatus: 'eligible',
  expectedConfidenceBand: { min: 0.78, max: 0.95 },
  expectedReasonContains: ['volontario'],
  doctrineNote: 'Upskilling AI = GROWTH pillar. Volontario, certificato via LMS export. Alta profondità di attivazione.',
};

const EXAMPLE_15: EligibilityExample = {
  id: 'eligible_15_mentoring',
  title: 'Mentoring Program Senior-Junior',
  description: 'Programma di mentoring interno tra dipendenti senior e junior.',
  inputRecord: makeRaw('ex-eligible-15', 14, {
    'Nome Iniziativa': 'Mentoring Program Senior-Junior',
    'Categoria': 'connection e sviluppo',
    'Obbligatorio': 'no',
    'Partecipanti': '36',
    'Forza Lavoro Totale': '250',
    'Tipo Evidenza': 'internal_budget_report',
  }, 'welfare_program'),
  expectedStatus: 'eligible',
  expectedConfidenceBand: { min: 0.78, max: 0.95 },
  expectedReasonContains: ['volontario'],
  doctrineNote: 'Mentoring = CONNECTION e LEGACY pillar. Volontario, misurabile via partecipazione. Genera IU per entrambi i pillar coinvolti nel matching.',
};

const EXAMPLE_16: EligibilityExample = {
  id: 'eligible_16_volontariato_territoriale',
  title: 'Volontariato Territoriale 2024',
  description: 'Iniziativa di volontariato aziendale nel territorio locale.',
  inputRecord: makeRaw('ex-eligible-16', 15, {
    'Nome Iniziativa': 'Volontariato Territoriale 2024',
    'Categoria': 'impatto sociale',
    'Obbligatorio': 'no',
    'Partecipanti': '28',
    'Tipo Evidenza': 'internal_budget_report',
    'Fornitore': 'Partner nonprofit locale',
  }, 'welfare_program'),
  expectedStatus: 'eligible',
  expectedConfidenceBand: { min: 0.78, max: 0.95 },
  expectedReasonContains: ['volontario'],
  doctrineNote: 'Volontariato = IMPACT pillar. Libero, aggiuntivo, con evidenza interna. Genera IU IMPACT.',
};

const EXAMPLE_17: EligibilityExample = {
  id: 'eligible_17_previdenza_integrativa',
  title: 'Fondo Pensione Integrativa',
  description: 'Fondo pensione complementare aziendale. Campo obbligatorio non dichiarato.',
  inputRecord: makeRaw('ex-eligible-17', 16, {
    'Nome Iniziativa': 'Fondo Pensione Integrativa',
    'Categoria': 'previdenza complementare',
    'Fornitore': 'Fondo Pensione Settoriale',
    'Tipo Evidenza': 'internal_budget_report',
  }, 'welfare_program'),
  expectedStatus: 'eligible',
  expectedConfidenceBand: { min: 0.55, max: 0.72 },
  expectedReasonContains: ['potenzialmente eleggibile'],
  doctrineNote: 'Previdenza integrativa = LEGACY pillar. Confidence ridotta perché il campo obbligatorio/volontario non è dichiarato nel file. Eligible condizionale — revisione consigliata per confermare che non sia pensione obbligatoria di categoria.',
};

const EXAMPLE_18: EligibilityExample = {
  id: 'eligible_18_smart_working_policy',
  title: 'Smart Working Policy Aziendale',
  description: 'Policy formale di lavoro agile approvata con accordo sindacale.',
  inputRecord: makeRaw('ex-eligible-18', 17, {
    'Nome Iniziativa': 'Smart Working Policy Aziendale',
    'Categoria': 'policy formale',
    'Obbligatorio': 'no',
    'Descrizione': 'Policy aziendale formale approvata — accordo sindacale Q1 2024',
    'Tipo Evidenza': 'internal_budget_report',
  }, 'structural_policy'),
  expectedStatus: 'eligible',
  expectedConfidenceBand: { min: 0.78, max: 0.95 },
  expectedReasonContains: ['volontario'],
  doctrineNote: 'Smart working come policy formale = LIFE pillar. Va oltre il minimo legale. Classificato eligible tramite sia keyword ELIGIBLE ("smart working policy") che FORMAL_POLICY_SIGNALS ("policy formale").',
};

const EXAMPLE_19: EligibilityExample = {
  id: 'eligible_19_no_meeting_friday',
  title: 'No Meeting Friday',
  description: 'Policy aziendale: nessuna riunione il venerdì per favorire concentrazione e wellbeing.',
  inputRecord: makeRaw('ex-eligible-19', 18, {
    'Nome Iniziativa': 'No Meeting Friday',
    'Categoria': 'work-life balance',
    'Obbligatorio': 'no',
    'Tipo Evidenza': 'internal_budget_report',
  }, 'structural_policy'),
  expectedStatus: 'eligible',
  expectedConfidenceBand: { min: 0.78, max: 0.95 },
  expectedReasonContains: ['volontario'],
  doctrineNote: 'No Meeting Friday = LIFE pillar. Policy aggiuntiva e volontaria. Il termine è presente come keyword esplicita nell\'engine. Non è un minimo legale.',
};

const EXAMPLE_20: EligibilityExample = {
  id: 'eligible_20_diritto_disconnessione',
  title: 'Diritto alla Disconnessione',
  description: 'Policy formale sul diritto alla disconnessione, oltre il minimo contrattuale.',
  inputRecord: makeRaw('ex-eligible-20', 19, {
    'Nome Iniziativa': 'Diritto alla Disconnessione',
    'Categoria': 'policy formale',
    'Descrizione': 'Policy aziendale formalizzata — accordo integrativo aziendale',
  }, 'structural_policy'),
  expectedStatus: 'eligible',
  expectedConfidenceBand: { min: 0.78, max: 0.95 },
  expectedReasonContains: ['volontario'],
  doctrineNote: 'Diritto alla disconnessione come policy formale oltre il minimo = LIFE pillar. Classificato eligible via keyword + FORMAL_POLICY_SIGNALS (accordo integrativo). Mandatory non dichiarato ma isFormalPolicy = true.',
};

// ── REVIEW_REQUIRED examples (21–25) ─────────────────────────────────────────

const EXAMPLE_21: EligibilityExample = {
  id: 'review_21_welfare_generico',
  title: 'Welfare Aziendale Generico',
  description: 'Voce di welfare generica senza dettaglio di categoria o tipo.',
  inputRecord: makeRaw('ex-review-21', 20, {
    'Nome Iniziativa': 'Welfare Aziendale',
    'Categoria': 'welfare',
  }, 'welfare_program'),
  expectedStatus: 'review_required',
  expectedConfidenceBand: { min: 0.28, max: 0.55 },
  expectedReasonContains: ['segnali insufficienti'],
  doctrineNote: '"Welfare" da solo è troppo generico per classificazione automatica. Può coprire benefit cash-like, servizi eligible, o compliance. Revisione umana necessaria.',
};

const EXAMPLE_22: EligibilityExample = {
  id: 'review_22_formazione_sicurezza_ambigua',
  title: 'Formazione Sicurezza (senza dettaglio obbligatorio/volontario)',
  description: 'Record con "sicurezza" nel nome ma senza indicazione obbligatorio/volontario.',
  inputRecord: makeRaw('ex-review-22', 21, {
    'Nome Iniziativa': 'Formazione Sicurezza',
    'Categoria': 'sicurezza',
    'Fornitore': 'Provider sicurezza',
  }, 'training'),
  expectedStatus: 'review_required',
  expectedConfidenceBand: { min: 0.28, max: 0.55 },
  expectedReasonContains: ['segnali insufficienti'],
  doctrineNote: '"Formazione sicurezza" senza "obbligatoria" e senza campo obbligatorio = ambiguo. Potrebbe essere D.Lgs 81 (blocked) o sicurezza volontaria aggiuntiva (eligible). Review_required per classificazione umana.',
};

const EXAMPLE_23: EligibilityExample = {
  id: 'review_23_rimborso_salute_ambiguo',
  title: 'Rimborso Salute',
  description: 'Voce "rimborso salute" senza chiarezza se è prevenzione aggiuntiva o rimborso generico.',
  inputRecord: makeRaw('ex-review-23', 22, {
    'Nome Iniziativa': 'Rimborso Salute',
    'Categoria': 'benefit sanitario',
    'Importo (€)': '8000',
  }, 'welfare_program'),
  expectedStatus: 'review_required',
  expectedConfidenceBand: { min: 0.28, max: 0.55 },
  expectedReasonContains: ['segnali insufficienti'],
  doctrineNote: '"Rimborso salute" è ambiguo: può essere check-up extra volontario (eligible, LIFE) o rimborso generico di spese sanitarie (limited). Senza dettaglio del servizio, review_required.',
};

const EXAMPLE_24: EligibilityExample = {
  id: 'review_24_supporto_psicologico_individuale',
  title: 'Supporto Psicologico con note individuali (privacy risk)',
  description: 'Record di supporto psicologico con campo Note che menziona sessioni individuali.',
  inputRecord: makeRaw('ex-review-24', 23, {
    'Nome Iniziativa': 'Supporto Psicologico',
    'Categoria': 'benessere',
    'Obbligatorio': 'no',
    'Note': 'Accesso a sessione individuale per dipendente con disagio lavorativo',
  }, 'welfare_program'),
  expectedStatus: 'review_required',
  expectedConfidenceBand: { min: 0.28, max: 0.55 },
  expectedReasonContains: ['individuali sensibili', 'privacy'],
  doctrineNote: 'Il campo Note contiene "sessione individuale" — segnale di dato individuale sensibile. La classificazione eligible del programma non può procedere finché il record non è anonimizzato/aggregato. Priority 1 (privacy) override eligible keyword.',
};

const EXAMPLE_25: EligibilityExample = {
  id: 'review_25_missing_category_description',
  title: 'Record senza categoria né descrizione',
  description: 'Record completamente vuoto — campi nome e categoria vuoti. Nessun segnale classificabile.',
  inputRecord: makeRaw('ex-review-25', 24, {
    'Nome Iniziativa': '',
    'Categoria': '',
  }, 'unknown'),
  expectedStatus: 'review_required',
  expectedConfidenceBand: { min: 0.15, max: 0.45 },
  expectedReasonContains: ['segnali insufficienti'],
  doctrineNote: 'Record senza contenuto = nessun segnale. Engine restituisce review_required a confidence bassa (0.28). Probabile errore di upload o riga vuota residua.',
};

// ── Export ────────────────────────────────────────────────────────────────────

export const ALL_EXAMPLES: EligibilityExample[] = [
  EXAMPLE_01, EXAMPLE_02, EXAMPLE_03, EXAMPLE_04, EXAMPLE_05,
  EXAMPLE_06, EXAMPLE_07, EXAMPLE_08, EXAMPLE_09, EXAMPLE_10,
  EXAMPLE_11, EXAMPLE_12, EXAMPLE_13, EXAMPLE_14, EXAMPLE_15,
  EXAMPLE_16, EXAMPLE_17, EXAMPLE_18, EXAMPLE_19, EXAMPLE_20,
  EXAMPLE_21, EXAMPLE_22, EXAMPLE_23, EXAMPLE_24, EXAMPLE_25,
];

// ── Self-check runner ─────────────────────────────────────────────────────────
//
// Runs all 25 examples through classifyEligibility and returns pass/fail per example.
// No test framework required — usable in browser, server, or future test runner.

export function runEligibilityExamples(): EligibilityExampleResult[] {
  return ALL_EXAMPLES.map((example) => {
    const result = classifyEligibility(example.inputRecord);

    const statusMatch = result.status === example.expectedStatus;
    const confidenceInBand =
      result.confidence >= example.expectedConfidenceBand.min &&
      result.confidence <= example.expectedConfidenceBand.max;
    const reasonMatch = example.expectedReasonContains.every((substring) =>
      result.reason.toLowerCase().includes(substring.toLowerCase()),
    );
    const passed = statusMatch && confidenceInBand && reasonMatch;

    return {
      id: example.id,
      title: example.title,
      passed,
      statusMatch,
      confidenceInBand,
      reasonMatch,
      expected: example.expectedStatus,
      actual: result.status,
      actualReason: result.reason,
      actualConfidence: result.confidence,
      expectedConfidenceBand: example.expectedConfidenceBand,
      fullResult: result,
    };
  });
}

// ── Summary helper ────────────────────────────────────────────────────────────

export interface EligibilityExampleSummary {
  total: number;
  passed: number;
  failed: number;
  failedIds: string[];
}

export function summarizeExampleResults(
  results: EligibilityExampleResult[],
): EligibilityExampleSummary {
  const failed = results.filter((r) => !r.passed);
  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: failed.length,
    failedIds: failed.map((r) => r.id),
  };
}
