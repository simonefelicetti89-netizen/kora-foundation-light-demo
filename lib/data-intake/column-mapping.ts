// lib/data-intake/column-mapping.ts
// B27: Column Mapping Assistant — rule-based, deterministic, no LLM.
//
// Maps non-standard column headers to canonical KORA intake field names.
// Two functions:
//   suggestColumnMapping(headers): produces suggestions for each header
//   applyColumnMapping(rows, mapping): renames/drops columns per mapping
//
// Confidence levels:
//   1.0  — exact synonym match
//   0.85 — synonym is contained in header or vice versa (prefix/suffix)
//   0.65 — keyword overlap (substring match)
//   0.0  — no match → null suggestion

// ── Types ─────────────────────────────────────────────────────────────────────

export type CanonicalIntakeField =
  | 'initiative_name'
  | 'description'
  | 'category'
  | 'type'
  | 'amount'
  | 'participants'
  | 'source'
  | 'evidence_level'
  | 'pillar'
  | 'reporting_period'
  | 'provider'
  | 'budget_class'
  | 'cost_center'
  | 'hours'
  | 'coverage'
  | 'uptake'
  | 'policy_evidence';

export const CANONICAL_FIELDS: CanonicalIntakeField[] = [
  'initiative_name', 'description', 'category', 'type',
  'amount', 'participants', 'source', 'evidence_level', 'pillar',
  'reporting_period', 'provider', 'budget_class', 'cost_center',
  'hours', 'coverage', 'uptake', 'policy_evidence',
];

export const CANONICAL_FIELD_LABELS: Record<CanonicalIntakeField, string> = {
  initiative_name:  'Nome iniziativa',
  description:      'Descrizione',
  category:         'Categoria',
  type:             'Tipo',
  amount:           'Importo (€)',
  participants:     'Partecipanti',
  source:           'Fonte / Evidenza',
  evidence_level:   'Livello evidenza',
  pillar:           'Pillar KORA',
  reporting_period: 'Periodo di rendicontazione',
  provider:         'Fornitore',
  budget_class:     'Classe budget',
  cost_center:      'Centro di costo',
  hours:            'Ore erogate',
  coverage:         'Copertura',
  uptake:           'Utilizzo / Adesione',
  policy_evidence:  'Policy documentata',
};

export type MappingSuggestion = {
  sourceHeader: string;
  normalizedHeader: string;
  suggestedField: CanonicalIntakeField | null;
  confidence: number;   // 0–1
  reason: string;
  alternatives: CanonicalIntakeField[];
};

// ── Synonym table ─────────────────────────────────────────────────────────────

const FIELD_SYNONYMS: Record<CanonicalIntakeField, string[]> = {
  initiative_name: [
    'initiative_name', 'nome_iniziativa', 'iniziativa', 'progetto', 'nome_progetto',
    'descrizione_attivita', 'descrizione_attivita', 'attivita', 'attivita',
    'intervento', 'programma', 'titolo', 'titolo_progetto', 'nome_attivita',
    'nome_attivita', 'name_initiative', 'project_name', 'event_name', 'nome_evento',
    'azione', 'misura', 'iniziativa_welfare', 'welfare_initiative', 'benefit_name',
  ],
  description: [
    'description', 'descrizione', 'note', 'dettaglio', 'commento', 'oggetto',
    'descrizione_breve', 'descrizione_iniziativa', 'abstract', 'sintesi',
    'testo', 'info', 'informazioni',
  ],
  category: [
    'category', 'categoria', 'area', 'area_hr', 'famiglia', 'macro_area',
    'tipo_welfare', 'classe', 'settore', 'ambito', 'tema', 'tematica',
    'macro_categoria', 'area_tematica', 'welfare_area', 'benefit_area',
  ],
  type: [
    'type', 'tipo', 'tipologia', 'natura', 'event_type', 'tipo_iniziativa',
    'tipo_evento', 'tipo_attivita', 'tipo_attivita', 'modalita', 'format',
    'kind', 'nature',
  ],
  amount: [
    'amount', 'importo', 'costo', 'budget', 'budget_amount', 'importo_consuntivo',
    'costo_consuntivo', 'spesa', 'spesa_hr', 'valore', 'valore_eur',
    'total', 'totale', 'costo_totale', 'investimento', 'importo_eur',
    'budget_hr', 'budget_welfare', 'budget_people', 'cost', 'total_cost',
    'importo_annuo', 'importo_previsto', 'costo_stimato',
  ],
  participants: [
    'participants', 'partecipanti', 'numero_partecipanti', 'n_partecipanti', 'pax',
    'persone_coinvolte', 'beneficiari', 'utenti', 'aderenti', 'fruitori',
    'active_workers', 'active_users', 'users', 'headcount_beneficiari',
    'destinatari', 'dipendenti_coinvolti', 'lavoratori_coinvolti',
    'partecipanti_stimati', 'partecipanti_effettivi', 'n_beneficiari',
  ],
  source: [
    'source', 'fonte', 'fornitore', 'provider', 'origine_dato',
    'documentazione', 'evidenza_fonte', 'budget_source', 'evidence_type',
    'fonte_dato', 'fonte_informazione', 'riferimento', 'provenienza',
  ],
  evidence_level: [
    'evidence_level', 'livello_evidenza', 'evidenza', 'evidence', 'proof',
    'documentazione_livello', 'quality_evidence', 'evidence_quality',
    'livello_documentazione', 'grado_evidenza', 'evidence_tier',
  ],
  pillar: [
    'pillar', 'pilastro', 'dimensione', 'area_kora', 'kora_pillar',
    'pillar_kora', 'dimensione_kora', 'ambito_kora',
  ],
  reporting_period: [
    'reporting_period', 'periodo', 'trimestre', 'quarter', 'anno',
    'data_periodo', 'year', 'period', 'competenza', 'esercizio',
    'anno_competenza', 'riferimento_temporale', 'periodo_rendicontazione',
  ],
  provider: [
    'provider', 'fornitore', 'partner', 'ente_erogatore', 'supplier',
    'vendor', 'ente_partner', 'organizzazione_esterna', 'welfare_provider',
    'lms_provider', 'erogatore',
  ],
  budget_class: [
    'budget_class', 'classe_budget', 'natura_budget', 'tipo_budget',
    'classificazione_budget', 'budget_category', 'spending_class',
    'tipologia_spesa', 'natura_spesa', 'classificazione_spesa',
  ],
  cost_center: [
    'cost_center', 'centro_costo', 'centro_di_costo', 'cdc', 'cc',
    'centro_di_responsabilita', 'profit_center', 'business_unit',
    'unita_organizzativa', 'reparto_costo', 'codice_cdc',
  ],
  hours: [
    'hours', 'ore', 'ore_erogate', 'ore_formazione', 'training_hours',
    'durata_ore', 'duration_hours', 'ore_totali', 'ore_pro_capite',
    'ore_previste', 'monte_ore', 'monte_ore_formativo',
  ],
  coverage: [
    'coverage', 'copertura', 'popolazione_coperta', 'eligible_population',
    'platea', 'platea_potenziale', 'eligible_workers', 'target_population',
    'bacino', 'numero_eleggibili', 'eligible_headcount', 'eligible',
  ],
  uptake: [
    'uptake', 'utilizzo', 'usage', 'tasso_utilizzo', 'adesione',
    'fruizione', 'adoption', 'take_up', 'tasso_adesione', 'tasso_fruizione',
    'partecipazione', 'tasso_partecipazione', 'redemption',
  ],
  policy_evidence: [
    'policy_evidence', 'policy', 'documento_policy', 'regolamento',
    'procedura', 'policy_document', 'normativa_interna', 'regolamento_aziendale',
    'internal_policy', 'policy_aziendale', 'documento_regolatorio',
  ],
};

// ── Normalisation ─────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents
    .replace(/[\s\-\/\\\.]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/, '');
}

// ── Matching ──────────────────────────────────────────────────────────────────

type MatchResult = {
  field: CanonicalIntakeField;
  confidence: number;
  reason: string;
};

function matchHeader(normalizedHeader: string): MatchResult[] {
  const results: MatchResult[] = [];

  for (const [field, synonyms] of Object.entries(FIELD_SYNONYMS) as [CanonicalIntakeField, string[]][]) {
    const normalizedSynonyms = synonyms.map(norm);

    // Level 1: exact match
    if (normalizedSynonyms.includes(normalizedHeader)) {
      results.push({ field, confidence: 1.0, reason: 'exact_synonym_match' });
      continue;
    }

    // Level 2: synonym is a prefix/substring of header or vice versa
    let level2Match = false;
    for (const syn of normalizedSynonyms) {
      if (syn.length >= 4 && (normalizedHeader.startsWith(syn) || syn.startsWith(normalizedHeader))) {
        results.push({ field, confidence: 0.85, reason: 'prefix_match' });
        level2Match = true;
        break;
      }
    }
    if (level2Match) continue;

    // Level 3: keyword overlap — header contains a meaningful synonym word or vice versa
    const headerWords = normalizedHeader.split('_').filter(w => w.length >= 4);
    for (const syn of normalizedSynonyms) {
      const synWords = syn.split('_').filter(w => w.length >= 4);
      for (const hw of headerWords) {
        for (const sw of synWords) {
          if (hw === sw || (hw.length >= 5 && sw.length >= 5 && (hw.includes(sw) || sw.includes(hw)))) {
            results.push({ field, confidence: 0.65, reason: 'keyword_overlap' });
            break;
          }
        }
        if (results.some(r => r.field === field)) break;
      }
      if (results.some(r => r.field === field)) break;
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function suggestColumnMapping(headers: string[]): MappingSuggestion[] {
  return headers.map(header => {
    const normalizedHeader = norm(header);
    const matches = matchHeader(normalizedHeader);

    const best = matches[0] ?? null;
    const alternatives = matches.slice(1, 4).map(m => m.field);

    return {
      sourceHeader: header,
      normalizedHeader,
      suggestedField: best?.field ?? null,
      confidence: best?.confidence ?? 0,
      reason: best?.reason ?? 'no_match',
      alternatives,
    };
  });
}

/**
 * Apply a confirmed mapping to rows.
 * mapping: { sourceHeader: canonicalField | 'ignore' | 'keep_original' }
 * - 'ignore': drop the column
 * - 'keep_original': keep as-is (use normalized header)
 * - CanonicalIntakeField: rename to that field
 *
 * Columns not in mapping are kept with their normalized header.
 */
export function applyColumnMapping(
  rows: Array<Record<string, string>>,
  mapping: Record<string, CanonicalIntakeField | 'ignore' | 'keep_original'>,
): Array<Record<string, string>> {
  return rows.map(row => {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const action = mapping[key];
      if (action === 'ignore') continue;               // drop column
      if (action === 'keep_original' || !action) {
        mapped[key] = value;                           // keep as-is
      } else {
        mapped[action] = value;                        // rename to canonical
      }
    }
    return mapped;
  });
}

/**
 * Validate that a mapping object contains only valid canonical fields or 'ignore'/'keep_original'.
 * Returns list of invalid entries.
 */
export function validateMapping(
  mapping: Record<string, string>,
): { valid: boolean; invalidEntries: string[] } {
  const validValues = new Set<string>([...CANONICAL_FIELDS, 'ignore', 'keep_original']);
  const invalidEntries: string[] = [];
  for (const [key, val] of Object.entries(mapping)) {
    if (!validValues.has(val)) {
      invalidEntries.push(`${key}: "${val}"`);
    }
  }
  return { valid: invalidEntries.length === 0, invalidEntries };
}

/**
 * Apply batch-level manual completion defaults to rows.
 * Only fills fields that are empty/missing — never overwrites existing values.
 * Returns modified rows + list of fields that were filled.
 */
export function applyManualCompletionDefaults(
  rows: Array<Record<string, string>>,
  defaults: Partial<Record<CanonicalIntakeField, string>>,
): { rows: Array<Record<string, string>>; appliedFields: CanonicalIntakeField[] } {
  const appliedFields = new Set<CanonicalIntakeField>();

  const result = rows.map(row => {
    const out = { ...row };
    for (const [field, value] of Object.entries(defaults) as [CanonicalIntakeField, string][]) {
      if (value && (!out[field] || out[field].trim() === '')) {
        out[field] = value;
        appliedFields.add(field);
      }
    }
    return out;
  });

  return { rows: result, appliedFields: [...appliedFields] };
}
