// lib/upload/sample-templates.ts
// CSV/Excel column blueprints for guided pilot upload.
// Each template defines the expected headers and 2 illustrative sample rows.
// Used to generate downloadable starter files and to guide users during onboarding.

export interface SampleTemplate {
  id: string;
  name: string;
  description: string;
  detectedRecordType: string;
  headers: string[];
  sampleRows: Record<string, string>[];
}

export const PROGRAMS_INITIATIVES_TEMPLATE: SampleTemplate = {
  id: 'programs_initiatives',
  name: 'Programmi e Iniziative Welfare',
  description: 'Elenco delle iniziative welfare, formazione, volontariato e benefit aziendali per periodo.',
  detectedRecordType: 'welfare_program',
  headers: [
    'Nome Iniziativa', 'Descrizione', 'Categoria', 'Fornitore',
    'Data Inizio', 'Data Fine', 'Partecipanti', 'Popolazione Eleggibile',
    'Forza Lavoro Totale', 'Obbligatorio', 'Tipo Evidenza', 'Dipartimento', 'Sede', 'Note',
  ],
  sampleRows: [
    {
      'Nome Iniziativa': 'Supporto psicologico aziendale',
      'Descrizione': 'Accesso aggregato a colloqui psicologici tramite piattaforma partner',
      'Categoria': 'benessere psicologico',
      'Fornitore': 'Zeta Welfare',
      'Data Inizio': '2024-01-01',
      'Data Fine': '2024-12-31',
      'Partecipanti': '47',
      'Popolazione Eleggibile': '250',
      'Forza Lavoro Totale': '250',
      'Obbligatorio': 'no',
      'Tipo Evidenza': 'welfare_provider_export',
      'Dipartimento': 'Tutti',
      'Sede': 'Milano',
      'Note': '',
    },
    {
      'Nome Iniziativa': 'Corso upskilling digitale',
      'Descrizione': 'Percorso su strumenti digitali e AI basics — completamento con attestato',
      'Categoria': 'formazione professionale',
      'Fornitore': 'LMS interno',
      'Data Inizio': '2024-03-01',
      'Data Fine': '2024-05-31',
      'Partecipanti': '83',
      'Popolazione Eleggibile': '150',
      'Forza Lavoro Totale': '250',
      'Obbligatorio': 'no',
      'Tipo Evidenza': 'lms_export',
      'Dipartimento': 'Tech, Ops',
      'Sede': 'Tutti',
      'Note': 'Attestato di completamento disponibile su LMS',
    },
  ],
};

export const WORKFORCE_AGGREGATES_TEMPLATE: SampleTemplate = {
  id: 'workforce_aggregates',
  name: 'Aggregati Forza Lavoro',
  description: 'Dati aggregati sulla forza lavoro per periodo: headcount, turnover, assenteismo. Solo aggregati — nessun dato individuale.',
  detectedRecordType: 'hr_aggregate',
  headers: [
    'Periodo', 'Forza Lavoro Totale', 'Headcount Attivi', 'Turnover',
    'Assenteismo', 'Quota Smart Working', 'Dipartimento', 'Sede', 'Fonte Dati',
  ],
  sampleRows: [
    {
      'Periodo': '2024-Q1',
      'Forza Lavoro Totale': '250',
      'Headcount Attivi': '242',
      'Turnover': '0,04',
      'Assenteismo': '0,032',
      'Quota Smart Working': '0,61',
      'Dipartimento': 'Tutti',
      'Sede': 'Tutti',
      'Fonte Dati': 'HR gestionale',
    },
    {
      'Periodo': '2024-Q2',
      'Forza Lavoro Totale': '253',
      'Headcount Attivi': '248',
      'Turnover': '0,03',
      'Assenteismo': '0,028',
      'Quota Smart Working': '0,63',
      'Dipartimento': 'Tutti',
      'Sede': 'Tutti',
      'Fonte Dati': 'HR gestionale',
    },
  ],
};

export const HR_KPI_AGGREGATES_TEMPLATE: SampleTemplate = {
  id: 'hr_kpi_aggregates',
  name: 'KPI HR Aggregati',
  description: 'Indicatori HR aggregate per periodo: engagement, retention, mobilità interna. Solo aggregati — N≥10 per segmento.',
  detectedRecordType: 'hr_aggregate',
  headers: [
    'Periodo', 'Score Engagement', 'Tasso Retention', 'Mobilità Interna',
    'Ore Formazione Media', 'Score Benessere Survey', 'Dipartimento', 'Fonte',
  ],
  sampleRows: [
    {
      'Periodo': '2024-H1',
      'Score Engagement': '68',
      'Tasso Retention': '0,96',
      'Mobilità Interna': '0,08',
      'Ore Formazione Media': '14,5',
      'Score Benessere Survey': '61',
      'Dipartimento': 'Tutti',
      'Fonte': 'Survey interna HR — anonima',
    },
    {
      'Periodo': '2024-H2',
      'Score Engagement': '71',
      'Tasso Retention': '0,97',
      'Mobilità Interna': '0,09',
      'Ore Formazione Media': '18,2',
      'Score Benessere Survey': '65',
      'Dipartimento': 'Tutti',
      'Fonte': 'Survey interna HR — anonima',
    },
  ],
};

export const BUDGET_RECORDS_TEMPLATE: SampleTemplate = {
  id: 'budget_records',
  name: 'Registrazioni Budget Welfare',
  description: 'Dati di spesa per iniziativa: importo, fonte di budget ed evidenza economica. L\'evidenza documentale determina il peso nella componente BTI.',
  detectedRecordType: 'budget',
  headers: [
    'Nome Iniziativa', 'Periodo', 'Importo Budget (€)', 'Fonte Budget',
    'Tipo Evidenza Budget', 'Numero Fattura / Contratto', 'Fornitore', 'Note',
  ],
  sampleRows: [
    {
      'Nome Iniziativa': 'Supporto psicologico aziendale',
      'Periodo': '2024',
      'Importo Budget (€)': '18.500',
      'Fonte Budget': 'budget welfare aziendale',
      'Tipo Evidenza Budget': 'invoice',
      'Numero Fattura / Contratto': 'FT-2024-0042',
      'Fornitore': 'Zeta Welfare',
      'Note': 'Fattura disponibile in archivio contabilità',
    },
    {
      'Nome Iniziativa': 'Corso upskilling digitale',
      'Periodo': '2024',
      'Importo Budget (€)': '12.000',
      'Fonte Budget': 'budget formazione',
      'Tipo Evidenza Budget': 'internal_budget_report',
      'Numero Fattura / Contratto': '',
      'Fornitore': 'Interno',
      'Note': 'Costo stimato da report budget interno — evidenza L2',
    },
  ],
};

export const CARE_ECONOMY_RECORDS_TEMPLATE: SampleTemplate = {
  id: 'care_economy',
  name: 'Iniziative Care Economy',
  description: 'Servizi di supporto alla cura familiare: asilo nido, assistenza anziani, congedo, supporto caregiver. Solo dati aggregati.',
  detectedRecordType: 'welfare_program',
  headers: [
    'Nome Iniziativa', 'Tipo Supporto Cura', 'Partecipanti', 'Popolazione Eleggibile',
    'Forza Lavoro Totale', 'Importo (€)', 'Tipo Evidenza', 'Periodo', 'Note',
  ],
  sampleRows: [
    {
      'Nome Iniziativa': 'Contributo nido aziendale',
      'Tipo Supporto Cura': 'childcare',
      'Partecipanti': '14',
      'Popolazione Eleggibile': '38',
      'Forza Lavoro Totale': '250',
      'Importo (€)': '21.000',
      'Tipo Evidenza': 'welfare_provider_export',
      'Periodo': '2024',
      'Note': 'Rimborso retta nido fino a 200 €/mese — solo aggregato',
    },
    {
      'Nome Iniziativa': 'Congedo solidarietà familiare',
      'Tipo Supporto Cura': 'caregiver',
      'Partecipanti': '6',
      'Popolazione Eleggibile': '250',
      'Forza Lavoro Totale': '250',
      'Importo (€)': '0',
      'Tipo Evidenza': 'internal_budget_report',
      'Periodo': '2024',
      'Note': 'Policy strutturale senza costo diretto — BTI: not_applicable',
    },
  ],
};

export const ALL_TEMPLATES: SampleTemplate[] = [
  PROGRAMS_INITIATIVES_TEMPLATE,
  WORKFORCE_AGGREGATES_TEMPLATE,
  HR_KPI_AGGREGATES_TEMPLATE,
  BUDGET_RECORDS_TEMPLATE,
  CARE_ECONOMY_RECORDS_TEMPLATE,
];
