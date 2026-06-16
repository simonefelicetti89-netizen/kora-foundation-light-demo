// lib/company-submissions/templates.ts
// Canonical submission template configuration.
// Single source of truth — used by TemplateLibrary UI and Status Center.
// No hardcoded arrays in components.

export interface SubmissionTemplate {
  id:                   string;
  title:                string;
  description:          string;
  fileName:             string;
  submissionType:       string;
  recommendedFor:       string;
  pillarHint:           string;
  allowedDataNote:      string;
  forbiddenFieldsNotice: string;
  whatKoraDoesNext:     string;
}

export const SUBMISSION_TEMPLATES: ReadonlyArray<SubmissionTemplate> = [
  {
    id:             'iniziative',
    title:          'Iniziative',
    description:    'Programmi welfare, wellbeing, community e attività people collettive',
    fileName:       'iniziative.csv',
    submissionType: 'initiatives',
    recommendedFor: 'Programmi welfare, formazione, volontariato, mentoring, iniziative people',
    pillarHint:     'LIFE · CONNECTION · IMPACT',
    allowedDataNote:
      'Includi: nome iniziativa, tipologia, date, numero partecipanti aggregato, provider, budget totale.',
    forbiddenFieldsNotice:
      'Non includere: nomi individuali, CF, email, salari, dati sanitari, PIB, IU, note cliniche o psicologiche.',
    whatKoraDoesNext:
      'KORA Admin classificherà ogni riga nel BCM taxonomy e la convertirà in UEF. ' +
      'Lo scoring inizierà dopo revisione e accettazione.',
  },
  {
    id:             'formazione',
    title:          'Formazione',
    description:    'Corsi, certificazioni e dati LMS export',
    fileName:       'formazione.csv',
    submissionType: 'lms',
    recommendedFor: 'Export LMS, corsi completati, certificazioni, upskilling, formazione obbligatoria',
    pillarHint:     'GROWTH',
    allowedDataNote:
      'Includi: titolo corso, tipologia, modalità, ore, partecipanti completati aggregati, provider, certificazione.',
    forbiddenFieldsNotice:
      'Non includere: nomi individuali, codici fiscali, valutazioni performance, esiti esami individuali, email.',
    whatKoraDoesNext:
      'KORA Admin verificherà la tipologia formativa e assegnerà il pillar GROWTH. ' +
      'I corsi compliance obbligatori ricevono trattamento separato rispetto alla formazione volontaria.',
  },
  {
    id:             'volontariato',
    title:          'Volontariato',
    description:    'Iniziative ESG, impatto territoriale e attività di solidarietà',
    fileName:       'volontariato.csv',
    submissionType: 'initiatives',
    recommendedFor: 'Giornate di volontariato, Earth Day, raccolta fondi, attività territoriali ESG',
    pillarHint:     'IMPACT · CONNECTION',
    allowedDataNote:
      'Includi: nome iniziativa, organizzazione partner, data, ore per partecipante, numero volontari, impatto stimato.',
    forbiddenFieldsNotice:
      'Non includere: elenco nominativo dei partecipanti, email, dati di donazioni individuali.',
    whatKoraDoesNext:
      'KORA Admin mapperà le attività ai pillar IMPACT e CONNECTION. ' +
      'L\'impatto esterno documentato abilita il fattore EXF nella formula IU.',
  },
  {
    id:             'mentoring',
    title:          'Mentoring',
    description:    'Programmi di mentoring formale e peer-support',
    fileName:       'mentoring.csv',
    submissionType: 'initiatives',
    recommendedFor: 'Mentoring formale, reverse mentoring, peer-support, programmi senior-junior',
    pillarHint:     'LEGACY · CONNECTION · GROWTH',
    allowedDataNote:
      'Includi: pseudonym_id mentor e mentee, tipologia, date, ore totali, pillar prevalente, obiettivo, outcome.',
    forbiddenFieldsNotice:
      'Non includere: nomi reali, email, dati psicologici, contenuto delle sessioni, valutazioni delle relazioni.',
    whatKoraDoesNext:
      'KORA Admin valorizzerà il trasferimento di conoscenza nel pillar LEGACY. ' +
      'I programmi strutturati ricevono il fattore Durability Factor (DF ≤ 1.30).',
  },
  {
    id:             'budget',
    title:          'Budget',
    description:    'Voci di spesa welfare e benefit per il Budget-to-Human-Impact engine',
    fileName:       'budget.csv',
    submissionType: 'budget',
    recommendedFor: 'Welfare contrattuale, formazione, EAP, team building, contributi sociali',
    pillarHint:     'Budget-to-Human-Impact™',
    allowedDataNote:
      'Includi: voce di costo, categoria, importo totale, anno, trimestre, centro di costo.',
    forbiddenFieldsNotice:
      'Non includere: salari individuali, RAL, premi individuali, dati retributivi disaggregati per persona.',
    whatKoraDoesNext:
      'KORA Admin aggiungerà i dati budget al BTI engine per calcolare il rapporto ' +
      'spesa people → attivazione organizzativa. Nessun dato individuale viene esposto.',
  },
  {
    id:             'evidenze',
    title:          'Evidenze',
    description:    'Attestati, report provider, liste aggregate e documenti a supporto',
    fileName:       'evidenze.csv',
    submissionType: 'evidence',
    recommendedFor: 'Certificati formazione, report trimestrali provider welfare, liste aggregate anonimizzate',
    pillarHint:     'Verifica · Confidence Score',
    allowedDataNote:
      'Includi: tipo evidenza, descrizione, data, provider/fonte, riferimento documento, partecipanti aggregati.',
    forbiddenFieldsNotice:
      'Non includere: nomi individuali, CF, diagnosi, note cliniche, dati di performance individuali.',
    whatKoraDoesNext:
      'KORA Admin userà le evidenze per aumentare il fattore EV (Evidence Verification) nella formula IU ' +
      'e migliorare il Confidence Score (CS) del KORA Index.',
  },
  // B164 — Template companion nominativo per iniziative con lista presenze.
  // File opzionale: caricarlo non è obbligatorio. Il CSV principale (iniziative,
  // formazione, volontariato) funziona esattamente come prima anche senza questo file.
  // Se fornito, KORA lo usa esclusivamente per attribuire il PIB individuale d'ufficio.
  // I nomi vengono pseudonimizzati prima di qualsiasi persistenza — non vengono mai
  // salvati in chiaro nel sistema.
  {
    id:             'attendees',
    title:          'Lista presenze nominativa',
    description:    'File companion opzionale con nomi dei partecipanti per attribuzione PIB individuale',
    fileName:       'attendees.csv',
    submissionType: 'attendees',
    recommendedFor: 'Iniziative formative o di sviluppo dove l\'azienda ha l\'attestato nominativo',
    pillarHint:     'GROWTH · LIFE · CONNECTION',
    allowedDataNote:
      'Includi: iniziativa_id (UUID dal sistema KORA), nome, cognome, matricola o email per il matching. ' +
      'Solo per iniziative dove hai la lista presenze aziendale verificata.',
    forbiddenFieldsNotice:
      'I dati nominativi dei partecipanti sono facoltativi e ammessi solo per iniziative formative o di sviluppo ' +
      'dove l\'azienda ha la lista presenze. Se forniti, KORA li usa esclusivamente per costruire il bilancio ' +
      'd\'impatto individuale del lavoratore (PIB), che resta privato del lavoratore e mai visibile al datore ' +
      'di lavoro a livello individuale. Non includere mai: dati sanitari, opinioni politiche o religiose, ' +
      'dati di donazioni individuali, dati biometrici, o qualsiasi categoria particolare ex art. 9 GDPR.',
    whatKoraDoesNext:
      'KORA pseudonimizza immediatamente i nomi prima di qualsiasi persistenza. ' +
      'I nomi grezzi non vengono mai salvati nel sistema. ' +
      'Le presenze verificate abilitano l\'attribuzione d\'ufficio delle Impact Units (company_sourced, L3). ' +
      'I worker non ancora attivi su KORA vengono conservati in stato pending per riconciliazione futura.',
  },
];

// Lookup by submissionType (may match multiple)
export function getTemplatesBySubmissionType(type: string): SubmissionTemplate[] {
  return SUBMISSION_TEMPLATES.filter((t) => t.submissionType === type);
}

// Lookup by id
export function getTemplateById(id: string): SubmissionTemplate | undefined {
  return SUBMISSION_TEMPLATES.find((t) => t.id === id);
}

// Type-specific guidance for submission wizard
export interface SubmissionTypeGuidance {
  label:          string;
  allowedSummary: string;
  forbiddenSummary: string;
  whatKoraDoesNext: string;
  suggestedTemplateId?: string;
}

export const SUBMISSION_TYPE_GUIDANCE: Record<string, SubmissionTypeGuidance> = {
  initiatives: {
    label:          'Iniziative',
    allowedSummary:
      'Programmi welfare, formazione, volontariato, mentoring, iniziative people. ' +
      'Includi nome, tipologia, date, numero partecipanti aggregato, provider.',
    forbiddenSummary:
      'Non includere nomi individuali, CF, email, salari, dati sanitari, PIB, IU.',
    whatKoraDoesNext:
      'KORA Admin classificherà le iniziative nel BCM taxonomy, le convertirà in UEF e avvierà lo scoring.',
    suggestedTemplateId: 'iniziative',
  },
  budget: {
    label:          'Budget',
    allowedSummary:
      'Voci di spesa welfare e benefit aggregate: welfare contrattuale, formazione, EAP, team building.',
    forbiddenSummary:
      'Non inserire salari individuali, RAL, premi individuali o dati retributivi disaggregati.',
    whatKoraDoesNext:
      'I dati budget alimentano il Budget-to-Human-Impact engine. Nessun salario individuale viene esposto.',
    suggestedTemplateId: 'budget',
  },
  participation: {
    label:          'Partecipazione',
    allowedSummary:
      'Dati aggregati di partecipazione per iniziativa: numero partecipanti per dipartimento o sede.',
    forbiddenSummary:
      'Non includere elenchi nominativi, email, identificatori individuali.',
    whatKoraDoesNext:
      'KORA Admin utilizzerà i dati per calcolare Activation Rate (AR) e Meaningful Activation Rate (MAR).',
    suggestedTemplateId: 'iniziative',
  },
  evidence: {
    label:          'Evidenze',
    allowedSummary:
      'Attestati, report provider, documenti a supporto, liste aggregate anonimizzate.',
    forbiddenSummary:
      'Non includere diagnosi, note cliniche, dati di performance individuali, nomi completi.',
    whatKoraDoesNext:
      'Le evidenze aumentano il fattore EV nella formula IU e migliorano il Confidence Score del KORA Index.',
    suggestedTemplateId: 'evidenze',
  },
  lms: {
    label:          'Formazione (LMS)',
    allowedSummary:
      'Export LMS: corsi completati, certificazioni, ore di formazione aggregate per tipologia.',
    forbiddenSummary:
      'Non includere valutazioni individuali, esiti esami per persona, email, codici fiscali.',
    whatKoraDoesNext:
      'KORA Admin assegnerà il pillar GROWTH e calcolerà il contributo formativo al KORA Index.',
    suggestedTemplateId: 'formazione',
  },
  provider: {
    label:          'Provider',
    allowedSummary:
      'Report di provider welfare, piattaforme benefit, operatori certificati.',
    forbiddenSummary:
      'Non includere dati di utilizzo individuale, profili personali, cronologie di accesso nominative.',
    whatKoraDoesNext:
      'KORA Admin verificherà la qualità della fonte e aumenterà il Verification Rate (VR) del periodo.',
    suggestedTemplateId: 'evidenze',
  },
  policy: {
    label:          'Policy',
    allowedSummary:
      'Documenti di policy people: regolamenti welfare, accordi sindacali, policy formazione.',
    forbiddenSummary:
      'Non includere dati personali di lavoratori, valutazioni disciplinari, procedimenti individuali.',
    whatKoraDoesNext:
      'Le policy documentate supportano il fattore Strategic Fit (SF) e la verifica della qualità dei dati.',
    suggestedTemplateId: undefined,
  },
  mixed: {
    label:          'Dataset misto',
    allowedSummary:
      'Combinazione di tipologie: descrivi chiaramente nella nota le categorie di dati inclusi.',
    forbiddenSummary:
      'Non includere dati individuali sensibili di alcun tipo.',
    whatKoraDoesNext:
      'KORA Admin separerà le tipologie durante la classificazione e le mapperà ai pillar appropriati.',
    suggestedTemplateId: undefined,
  },
  other: {
    label:          'Altro',
    allowedSummary:
      'Qualsiasi dato people aggregato non classificabile nelle categorie standard.',
    forbiddenSummary:
      'Non includere dati individuali sensibili, sanitari, retributivi o disciplinari.',
    whatKoraDoesNext:
      'KORA Admin classificherà il contenuto e ti contatterà se sono necessarie informazioni aggiuntive.',
    suggestedTemplateId: undefined,
  },
};

// Privacy warning — shown before every upload
export const UPLOAD_PRIVACY_WARNING =
  'Non caricare dati sanitari, performance individuali, salari, consensi, PIB, IU ' +
  'o attività private dei lavoratori. I file vengono revisionati da KORA Admin prima di entrare nella pipeline.';

// Submission status display metadata
export interface StatusMeta {
  label:  string;
  step:   number;
  total:  number;
}

export const SUBMISSION_STATUS_META: Record<string, StatusMeta> = {
  submission_draft:               { label: 'Bozza',                step: 1, total: 4 },
  submission_pending:             { label: 'Inviato a KORA Admin',  step: 2, total: 4 },
  submission_needs_clarification: { label: 'Chiarimento richiesto', step: 2, total: 4 },
  submission_accepted:            { label: 'Accettato',             step: 3, total: 4 },
  submission_rejected:            { label: 'Rifiutato',             step: 2, total: 4 },
  submission_archived:            { label: 'Archiviato',            step: 4, total: 4 },
};

// Ordered timeline steps for the mini submission timeline component
export const SUBMISSION_TIMELINE_STEPS = [
  { key: 'draft',      label: 'Bozza',         statuses: ['submission_draft'] },
  { key: 'submitted',  label: 'Inviato',        statuses: ['submission_pending', 'submission_needs_clarification', 'submission_accepted', 'submission_rejected', 'submission_archived'] },
  { key: 'reviewed',   label: 'In revisione',   statuses: ['submission_needs_clarification', 'submission_accepted', 'submission_rejected', 'submission_archived'] },
  { key: 'outcome',    label: 'Esito',          statuses: ['submission_accepted', 'submission_rejected', 'submission_archived'] },
] as const;
