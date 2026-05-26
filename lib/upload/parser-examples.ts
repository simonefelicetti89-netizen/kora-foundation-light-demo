// lib/upload/parser-examples.ts
// Reference examples documenting expected parser pipeline behavior for 5 representative scenarios.
// Use for integration tests, UI review guidance, and pilot onboarding documentation.
// These are static data objects — no runtime logic.

import type { ColumnMapping, SensitiveColumnFlag } from '@/lib/kora-engine/types';
import type { ParsedUploadResult } from './file-parser';

export interface ParserExample {
  id: string;
  title: string;
  description: string;
  fileType: 'csv' | 'xlsx';
  scenario: string;
  expectedFileType: ParsedUploadResult['fileType'];
  expectedDetectedRecordTypes: ParsedUploadResult['detectedRecordTypes'];
  expectedHasIssues: boolean;
  expectedHasWarnings: boolean;
  expectedColumnMappings: ColumnMapping[];
  expectedSensitiveFlags: SensitiveColumnFlag[];
  expectedPreviewRowCount?: number;    // rows in previewRows; defaults to PREVIEW_ROW_COUNT (20 after Sprint 5B)
  expectedParsingWarnings?: string[];  // substrings expected somewhere in parsingWarnings
  notes: string;
}

export const EXAMPLE_WELFARE_PROGRAMS_CSV: ParserExample = {
  id: 'welfare_programs_csv',
  title: 'CSV welfare — intestazioni italiane standard',
  description: 'File CSV separato da punto e virgola. Intestazioni in italiano. Nessuna colonna sensibile. Caso ideale.',
  fileType: 'csv',
  scenario: 'Export da piattaforma welfare con intestazioni standard italiane, separatore ";".',
  expectedFileType: 'csv',
  expectedDetectedRecordTypes: ['welfare_program'],
  expectedHasIssues: false,
  expectedHasWarnings: false,
  expectedColumnMappings: [
    {
      sourceColumn: 'nome iniziativa',
      targetField: 'initiative_name',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "nome iniziativa" (score: 0.95)',
      requiresReview: false,
    },
    {
      sourceColumn: 'descrizione',
      targetField: 'description',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "descrizione" (score: 0.95)',
      requiresReview: false,
    },
    {
      sourceColumn: 'categoria',
      targetField: 'category',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "categoria" (score: 0.95)',
      requiresReview: false,
    },
    {
      sourceColumn: 'fornitore',
      targetField: 'provider',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "fornitore" (score: 0.95)',
      requiresReview: false,
    },
    {
      sourceColumn: 'partecipanti',
      targetField: 'participants',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "partecipanti" (score: 0.95)',
      requiresReview: false,
    },
  ],
  expectedSensitiveFlags: [],
  notes: 'Caso ideale: nessuna revisione richiesta, tutte le colonne mappate con confidence ≥ 0.95.',
};

export const EXAMPLE_BUDGET_XLSX_ITALIAN_NUMBERS: ParserExample = {
  id: 'budget_xlsx_italian_numbers',
  title: 'Excel budget — numeri formato italiano (1.234,56 €)',
  description: 'File .xlsx con importi in formato europeo. Il parser deve convertire correttamente prima della pipeline UEF.',
  fileType: 'xlsx',
  scenario: 'Export contabilità con valori monetari in formato italiano "1.234,56 €".',
  expectedFileType: 'xlsx',
  expectedDetectedRecordTypes: ['budget'],
  expectedHasIssues: false,
  expectedHasWarnings: false,
  expectedColumnMappings: [
    {
      sourceColumn: 'nome iniziativa',
      targetField: 'initiative_name',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "nome iniziativa" (score: 0.95)',
      requiresReview: false,
    },
    {
      sourceColumn: 'importo budget (€)',
      targetField: 'budget_amount',
      confidence: 0.65,
      mappingReason: 'Corrispondenza con alias "importo" (score: 0.65)',
      requiresReview: true,
    },
    {
      sourceColumn: 'fonte budget',
      targetField: 'budget_source',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "fonte budget" (score: 0.95)',
      requiresReview: false,
    },
    {
      sourceColumn: 'tipo evidenza budget',
      targetField: 'budget_evidence_type',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "tipo evidenza budget" (score: 0.95)',
      requiresReview: false,
    },
  ],
  expectedSensitiveFlags: [],
  notes: 'Verifica che coerceNumericValue converta "1.234,56" → 1234.56. La colonna "importo budget (€)" richiede revisione per la presenza di caratteri speciali nel nome.',
};

export const EXAMPLE_HR_AGGREGATE_WITH_SENSITIVE_COLUMNS: ParserExample = {
  id: 'hr_aggregate_sensitive_columns',
  title: 'CSV HR aggregati — colonne sensibili da escludere',
  description: 'File CSV con dati HR aggregati che include colonne identificative (nome dipendente, email). Devono essere flaggate ed escluse prima di qualsiasi elaborazione.',
  fileType: 'csv',
  scenario: 'Export HR con colonne identificative — caso tipico di file non anonimizzato.',
  expectedFileType: 'csv',
  expectedDetectedRecordTypes: ['hr_aggregate'],
  expectedHasIssues: false,
  expectedHasWarnings: true,
  expectedColumnMappings: [
    {
      sourceColumn: 'periodo',
      targetField: 'period',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "periodo" (score: 0.95)',
      requiresReview: false,
    },
    {
      sourceColumn: 'forza lavoro totale',
      targetField: 'workforce_population',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "forza lavoro totale" (score: 0.95)',
      requiresReview: false,
    },
  ],
  expectedSensitiveFlags: [
    {
      columnName: 'nome dipendente',
      riskType: 'personal_identifiable',
      severity: 'high',
      reason: 'Colonna potenzialmente identificativa: può rivelare l\'identità individuale del lavoratore.',
      recommendedAction: 'exclude',
      excludedByDefault: true,
    },
    {
      columnName: 'email',
      riskType: 'personal_identifiable',
      severity: 'high',
      reason: 'Colonna potenzialmente identificativa: può rivelare l\'identità individuale del lavoratore.',
      recommendedAction: 'exclude',
      excludedByDefault: true,
    },
  ],
  notes: 'Caso critico per la validazione privacy. Le colonne sensibili devono essere flaggate prima di qualsiasi elaborazione dati. L\'UI deve mostrare un avviso bloccante per le colonne excludedByDefault.',
};

export const EXAMPLE_MULTI_SHEET_XLSX: ParserExample = {
  id: 'multi_sheet_xlsx',
  title: 'Excel multi-foglio — solo primo foglio analizzato',
  description: 'File .xlsx con più fogli (es. dati divisi per trimestre). Il parser analizza il primo foglio e segnala la presenza degli altri nel campo availableSheets.',
  fileType: 'xlsx',
  scenario: 'Export aziendale con dati divisi per trimestre su fogli separati: Q1, Q2, Q3, Q4.',
  expectedFileType: 'xlsx',
  expectedDetectedRecordTypes: ['welfare_program'],
  expectedHasIssues: false,
  expectedHasWarnings: true,
  expectedColumnMappings: [
    {
      sourceColumn: 'nome iniziativa',
      targetField: 'initiative_name',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "nome iniziativa" (score: 0.95)',
      requiresReview: false,
    },
    {
      sourceColumn: 'partecipanti',
      targetField: 'participants',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "partecipanti" (score: 0.95)',
      requiresReview: false,
    },
  ],
  expectedSensitiveFlags: [],
  notes: 'Il warning deve indicare tutti i fogli presenti (es. "Q1, Q2, Q3, Q4") e specificare quale è stato analizzato ("Q1"). Il campo availableSheets è popolato solo se sheets > 1.',
};

export const EXAMPLE_STRUCTURAL_POLICY_CSV: ParserExample = {
  id: 'structural_policy_csv',
  title: 'CSV policy strutturali — smart working, disconnessione',
  description: 'File CSV con policy aziendali strutturali: smart working, diritto alla disconnessione, ferie illimitate. Senza budget diretto: BTI = not_applicable.',
  fileType: 'csv',
  scenario: 'Documento HR con elenco policy strutturali senza budget diretto né partecipanti individuali.',
  expectedFileType: 'csv',
  expectedDetectedRecordTypes: ['structural_policy'],
  expectedHasIssues: false,
  expectedHasWarnings: false,
  expectedColumnMappings: [
    {
      sourceColumn: 'nome policy',
      targetField: 'initiative_name',
      confidence: 0.50,
      mappingReason: 'Corrispondenza con alias "nome" (score: 0.50)',
      requiresReview: true,
    },
    {
      sourceColumn: 'descrizione',
      targetField: 'description',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "descrizione" (score: 0.95)',
      requiresReview: false,
    },
    {
      sourceColumn: 'dipartimento',
      targetField: 'department',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "dipartimento" (score: 0.95)',
      requiresReview: false,
    },
  ],
  expectedSensitiveFlags: [],
  notes: 'Le policy strutturali non hanno budget diretto: budget_amount sarà null, btiTreatment = not_applicable. La colonna "nome policy" ha confidence 0.50 e richiede revisione manuale.',
};

export const EXAMPLE_US_CURRENCY_CSV: ParserExample = {
  id: 'us_currency_csv',
  title: 'CSV budget — formato valuta USA ($1,234.56)',
  description: 'File CSV con importi in formato USA: prefisso dollaro, separatore migliaia virgola, decimale punto. Il parser converte correttamente mantenendo il comportamento italiano per i casi ambigui.',
  fileType: 'csv',
  scenario: 'Export da sistema ERP americano con colonna importo in formato "$1,234.56".',
  expectedFileType: 'csv',
  expectedDetectedRecordTypes: ['budget'],
  expectedHasIssues: false,
  expectedHasWarnings: false,
  expectedPreviewRowCount: 20,
  expectedColumnMappings: [
    {
      sourceColumn: 'nome iniziativa',
      targetField: 'initiative_name',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "nome iniziativa" (score: 0.95)',
      requiresReview: false,
    },
    {
      sourceColumn: 'importo budget',
      targetField: 'budget_amount',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "importo budget" (score: 0.95)',
      requiresReview: false,
    },
  ],
  expectedSensitiveFlags: [],
  notes: [
    'Conversioni attese: "$1,234.56" → 1234.56 (prefisso $ + comma-migliaia + punto-decimale).',
    '"$1,234" → 1234 (prefisso $ senza decimale).',
    '"1,234.56" senza $ → 1234.56 (comma-migliaia + punto-decimale rilevato automaticamente).',
    '"1,234" senza $ e senza punto → 1.234 (italiano-first: letto come decimale italiano).',
  ].join(' '),
};

export const EXAMPLE_AMBIGUOUS_ITALIAN_THOUSANDS: ParserExample = {
  id: 'ambiguous_italian_thousands',
  title: 'CSV con migliaia italiane ambigue (18.500)',
  description: 'File CSV con valori come "18.500" ambigui tra migliaia italiane (18.500 EUR = 18.000+500) e decimali inglesi con zero finale (18.5). Il parser aggiunge un parsingWarning.',
  fileType: 'csv',
  scenario: 'Export budget con importi "18.500", "12.000", "6.750" — formato italiano senza virgola decimale.',
  expectedFileType: 'csv',
  expectedDetectedRecordTypes: ['budget'],
  expectedHasIssues: false,
  expectedHasWarnings: true,
  expectedParsingWarnings: ['ambigui'],
  expectedColumnMappings: [
    {
      sourceColumn: 'importo budget',
      targetField: 'budget_amount',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "importo budget" (score: 0.95)',
      requiresReview: false,
    },
  ],
  expectedSensitiveFlags: [],
  notes: 'Il parser converte "18.500" → 18500 (separatore migliaia italiano) e aggiunge un parsingWarning contenente "ambigui". Nessun cambio di comportamento — solo trasparenza. Se "18.500" significa 18.5 in notazione inglese, il file deve essere convertito prima del caricamento.',
};

export const EXAMPLE_GENERIC_INFO_UNMAPPED: ParserExample = {
  id: 'generic_info_unmapped',
  title: 'CSV con colonna "info" — non mappata dopo Sprint 5B',
  description: 'Una colonna generica chiamata "info" non produce mapping automatico. Sprint 5B ha rimosso "info" dagli alias di notes e alzato la soglia minima dei token a 5 caratteri.',
  fileType: 'csv',
  scenario: 'File CSV welfare con colonna "info" aggiunta dall\'utente senza nome descrittivo.',
  expectedFileType: 'csv',
  expectedDetectedRecordTypes: ['welfare_program'],
  expectedHasIssues: false,
  expectedHasWarnings: false,
  expectedColumnMappings: [
    {
      sourceColumn: 'nome iniziativa',
      targetField: 'initiative_name',
      confidence: 0.95,
      mappingReason: 'Corrispondenza con alias "nome iniziativa" (score: 0.95)',
      requiresReview: false,
    },
  ],
  expectedSensitiveFlags: [],
  notes: 'La colonna "info" non produce mapping: rimossa dagli alias di notes, e la soglia token ≥5 esclude il token "info" (4 chars) da "additional info". Colonne che si mappano a notes: "note", "annotazioni", "osservazioni", "informazioni aggiuntive", "comments", "remarks".',
};

export const ALL_EXAMPLES: ParserExample[] = [
  EXAMPLE_WELFARE_PROGRAMS_CSV,
  EXAMPLE_BUDGET_XLSX_ITALIAN_NUMBERS,
  EXAMPLE_HR_AGGREGATE_WITH_SENSITIVE_COLUMNS,
  EXAMPLE_MULTI_SHEET_XLSX,
  EXAMPLE_STRUCTURAL_POLICY_CSV,
  EXAMPLE_US_CURRENCY_CSV,
  EXAMPLE_AMBIGUOUS_ITALIAN_THOUSANDS,
  EXAMPLE_GENERIC_INFO_UNMAPPED,
];
