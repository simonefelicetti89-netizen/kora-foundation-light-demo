// lib/upload/sensitive-column-detection.ts
// Heuristic detector for columns that may carry sensitive or privacy-risk data.
// Rules are ordered high → low severity. The first matching rule wins per column.
// Output is consumed by the upload review UI to warn users before any processing.

import type {
  SensitiveColumnFlag,
  SensitiveRiskType,
  SensitiveSeverity,
  SensitiveRecommendedAction,
} from '@/lib/kora-engine/types';

interface SensitiveRule {
  keywords: string[];
  riskType: SensitiveRiskType;
  severity: SensitiveSeverity;
  reason: string;
  recommendedAction: SensitiveRecommendedAction;
  excludedByDefault: boolean;
}

// Rules ordered high → low severity. First matching rule wins per column.
const SENSITIVE_RULES: SensitiveRule[] = [
  // High-risk personal identifiers — exclude: fiscal code, phone, direct contacts not needed in pilot
  {
    keywords: [
      'codice fiscale', 'fiscal code', 'tax id', 'cf dipendente',
      'telefono', 'cellulare', 'phone', 'numero di telefono', 'contatto telefonico',
    ],
    riskType: 'personal_identifiable',
    severity: 'high',
    reason: 'Identificatore personale ad alto rischio: non necessario in Foundation Light Pilot. Rimuovere dal file prima del caricamento.',
    recommendedAction: 'exclude',
    excludedByDefault: true,
  },
  // Identity fields — pseudonymize: permitted for deduplication and future My KORA PIB, never in employer outputs
  {
    keywords: [
      'nome dipendente', 'nome e cognome', 'nome lavoratore', 'cognome', 'full name', 'nominativo',
      'matricola', 'employee id', 'badge', 'worker id', 'username', 'user id',
      'indirizzo email', 'email dipendente', 'email lavoratore', 'e-mail', 'pec dipendente',
    ],
    riskType: 'personal_identifiable',
    severity: 'medium',
    reason: 'Campo identità lavoratore: ammesso per deduplicazione dei record e costruzione del PIB in My KORA. Deve essere pseudonimizzato prima di entrare nella pipeline KORA. Non appare mai in output employer.',
    recommendedAction: 'pseudonymize',
    excludedByDefault: false,
  },
  // Health data — high risk, exclude by default
  {
    keywords: [
      'diagnosi medica', 'condizione medica', 'stato di salute', 'patologia',
      'invalidità', 'disabilità', 'malattia', 'diagnosi', 'terapia', 'farmaci',
      'ricovero', 'data ospedale', 'certificato medico', 'assenza per malattia',
      'health condition', 'medical', 'diagnosis', 'disability', 'illness', 'hospitalization',
    ],
    riskType: 'health_data',
    severity: 'high',
    reason: 'Colonna che può contenere dati sanitari sensibili: trattamento rigorosamente regolamentato (GDPR art. 9).',
    recommendedAction: 'exclude',
    excludedByDefault: true,
  },
  // Psychological data — high risk, exclude by default
  {
    keywords: [
      'supporto psicologico individuale', 'terapia psicologica', 'sessione terapia',
      'burnout individuale', 'welfare psicologico individuale', 'mental health individual',
      'depressione', 'ansia', 'psicologo', 'psichiatra', 'psychological support individual',
    ],
    riskType: 'psychological',
    severity: 'high',
    reason: 'Colonna che può contenere dati psicologici individuali: da escludere completamente dalla pipeline.',
    recommendedAction: 'exclude',
    excludedByDefault: true,
  },
  // Individual financial — medium risk, aggregate only
  {
    keywords: [
      'stipendio', 'salario', 'retribuzione', 'busta paga', 'ral',
      'reddito individuale', 'benefit individuale', 'rimborso individuale', 'buono individuale',
      'salary', 'wage', 'pay', 'compensation', 'remuneration',
    ],
    riskType: 'financial_individual',
    severity: 'medium',
    reason: 'Colonna che può contenere dati finanziari individuali: utilizzare solo in forma aggregata.',
    recommendedAction: 'aggregate_only',
    excludedByDefault: false,
  },
  // Protected characteristics — medium risk, review required
  {
    keywords: [
      'nazionalità', 'paese di origine', 'data di nascita', 'età individuale',
      'genere', 'sesso', 'religione', 'etnia',
      'nationality', 'country of origin', 'date of birth', 'dob', 'gender', 'sex',
      'religion', 'ethnicity',
    ],
    riskType: 'other',
    severity: 'medium',
    reason: 'Colonna che può contenere caratteristiche personali protette: verificare utilizzo e aggregazione prima del caricamento.',
    recommendedAction: 'review_required',
    excludedByDefault: false,
  },
  // Address / location — low risk, pseudonymize
  {
    keywords: [
      'indirizzo di residenza', 'domicilio', 'residenza', 'indirizzo',
      'city of residence', 'zip', 'cap', 'comune di residenza', 'postal code',
    ],
    riskType: 'personal_identifiable',
    severity: 'low',
    reason: 'Colonna di localizzazione personale: rischio di re-identificazione se combinata con altri campi.',
    recommendedAction: 'pseudonymize',
    excludedByDefault: false,
  },
];

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Checks exact match or substring match; longer keywords matched first reduces false positives.
function matchesRule(normalized: string, rule: SensitiveRule): boolean {
  return rule.keywords.some((kw) => normalized === kw || normalized.includes(kw));
}

export function detectSensitiveColumns(headers: string[]): SensitiveColumnFlag[] {
  const flags: SensitiveColumnFlag[] = [];

  for (const header of headers) {
    const normalized = normalizeHeader(header);

    for (const rule of SENSITIVE_RULES) {
      if (matchesRule(normalized, rule)) {
        flags.push({
          columnName: header,
          riskType: rule.riskType,
          severity: rule.severity,
          reason: rule.reason,
          recommendedAction: rule.recommendedAction,
          excludedByDefault: rule.excludedByDefault,
        });
        break; // first matching rule wins
      }
    }
  }

  return flags;
}
