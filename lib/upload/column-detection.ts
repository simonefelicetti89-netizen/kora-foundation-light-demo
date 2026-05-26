// lib/upload/column-detection.ts
// Heuristic column mapping: normalized source headers → canonical KORA UEF target fields.
// Supports Italian and English aliases. Confidence is determined by match specificity.
// Returns one mapping per matched column; unmatched columns are omitted.

import type { ColumnMapping } from '@/lib/kora-engine/types';

// Alias map: target field → ordered list of Italian/English keywords.
// More specific phrases should come before shorter/generic ones to maximize precision.
const FIELD_ALIASES: Record<string, string[]> = {
  initiative_name: [
    'nome iniziativa', 'nome programma', 'nome evento', 'nome attività',
    'titolo iniziativa', 'denominazione', 'initiative name', 'program name',
    'event name', 'activity name', 'nome', 'titolo', 'name', 'title', 'label',
  ],
  description: [
    'descrizione iniziativa', 'descrizione programma', 'descrizione evento',
    'descrizione', 'description', 'dettaglio', 'detail', 'desc',
  ],
  category: [
    'categoria iniziativa', 'tipo iniziativa', 'tipologia', 'classificazione',
    'categoria', 'category', 'tipo', 'type', 'kind',
  ],
  provider: [
    'fornitore', 'provider', 'erogatore', 'organizzatore', 'partner', 'vendor', 'supplier',
  ],
  period: [
    'periodo di riferimento', 'periodo', 'competenza', 'trimestre', 'semestre',
    'period', 'anno', 'year', 'quarter',
  ],
  date_start: [
    'data inizio', 'data di avvio', 'inizio', 'start date', 'date start', 'from', 'da',
  ],
  date_end: [
    'data fine', 'data di chiusura', 'fine', 'end date', 'date end', 'to', 'a',
  ],
  budget_amount: [
    'importo budget', 'budget speso', 'costo totale', 'valore economico',
    'spesa', 'importo', 'costo', 'budget amount', 'amount', 'cost', 'spend', 'value',
    '€', 'eur',
  ],
  budget_source: [
    'fonte budget', 'fonte finanziamento', 'budget source', 'funding source',
    'source of funds', 'finanziato da', 'funded by', 'fonte',
  ],
  budget_evidence_type: [
    'tipo evidenza budget', 'tipo evidenza economica', 'evidenza economica',
    'documento budget', 'budget evidence type', 'budget evidence', 'documento economico',
  ],
  participants: [
    'numero partecipanti', 'headcount partecipanti', 'partecipanti', 'fruitori',
    'beneficiari', 'coinvolti', 'utenti', 'participants', 'attendees',
    'users', 'beneficiaries',
  ],
  eligible_population: [
    'popolazione eleggibile', 'popolazione target', 'platea eleggibile', 'platea',
    'eligible population', 'target population', 'eligible',
  ],
  workforce_population: [
    'forza lavoro totale', 'totale dipendenti', 'headcount totale', 'organico',
    'workforce population', 'total workforce', 'workforce', 'dipendenti', 'employees',
  ],
  mandatory: [
    'obbligatorio per legge', 'formazione obbligatoria', 'obbligatorio',
    'obbligo', 'mandatory', 'required',
  ],
  evidence_type: [
    'tipo evidenza partecipazione', 'tipo di evidenza', 'tipo evidenza',
    'evidence type', 'attestato', 'certificate type', 'evidence',
  ],
  department: [
    'dipartimento', 'settore aziendale', 'reparto', 'funzione',
    'department', 'division', 'function', 'unit', 'area',
  ],
  site: [
    'stabilimento', 'location', 'sede', 'sito', 'ufficio', 'plant',
    'site', 'office', 'building',
  ],
  source_system: [
    'sistema sorgente', 'sistema di origine', 'sistema gestionale', 'fonte dati',
    'source system', 'data source', 'platform', 'system', 'tool',
  ],
  notes: [
    'informazioni aggiuntive', 'annotazioni', 'osservazioni', 'commenti',
    'additional info', 'comments', 'remarks', 'notes', 'note',
  ],
};

// Returns the best alias match with a confidence score, or null if no match.
// Confidence tiers: exact (0.95) → anchored (0.80) → contains (0.65) → token (0.50)
// Token tier requires token length ≥ 5 to prevent generic short words (e.g. "info", "type")
// from producing false-positive mappings at low confidence.
function scoreMatch(header: string, aliases: string[]): { confidence: number; alias: string } | null {
  for (const alias of aliases) {
    if (header === alias) return { confidence: 0.95, alias };
  }
  for (const alias of aliases) {
    if (header.startsWith(alias) || header.endsWith(alias)) return { confidence: 0.80, alias };
  }
  for (const alias of aliases) {
    if (header.includes(alias)) return { confidence: 0.65, alias };
  }
  for (const alias of aliases) {
    const tokens = alias.split(' ').filter((t) => t.length >= 5);
    if (tokens.length > 0 && tokens.some((t) => header.includes(t))) {
      return { confidence: 0.50, alias };
    }
  }
  return null;
}

// Each target field is mapped at most once (first-wins per field across headers).
// Headers that produce no match with confidence ≥ 0.50 are silently skipped.
export function detectColumnMappings(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const alreadyMapped = new Set<string>();

  for (const header of headers) {
    let bestField: string | null = null;
    let bestConfidence = 0;
    let bestAlias = '';

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (alreadyMapped.has(field)) continue;
      const match = scoreMatch(header, aliases);
      if (match && match.confidence > bestConfidence) {
        bestConfidence = match.confidence;
        bestField = field;
        bestAlias = match.alias;
      }
    }

    if (bestField !== null && bestConfidence >= 0.50) {
      alreadyMapped.add(bestField);
      mappings.push({
        sourceColumn: header,
        targetField: bestField,
        confidence: bestConfidence,
        mappingReason: `Corrispondenza con alias "${bestAlias}" (score: ${bestConfidence})`,
        requiresReview: bestConfidence < 0.70,
      });
    }
  }

  return mappings;
}
