// lib/company-transparency/transparency-engine.ts
// Pure, deterministic functions for Company Submission Transparency.
// No React, no services, no side effects — all testable in isolation.

export type EligibilityKey = 'eligible' | 'limited' | 'blocked';

export interface EligibilityTaxonomyEntry {
  category:           EligibilityKey;
  label:              string;
  italianExplanation: string;
  examples:           ReadonlyArray<string>;
}

export interface EligibilityCategory {
  key:                EligibilityKey;
  label:              string;
  italianExplanation: string;
  examples:           ReadonlyArray<string>;
  count:              number;
  percentage:         number;
}

export interface ReviewBreakdown {
  pending:            number;
  needsClarification: number;
  accepted:           number;
  rejected:           number;
  total:              number;
}

export interface DataQualitySummary {
  filesUploaded:         number;
  recordsParsed:         number;
  recordsReviewed:       number;
  parseWarnings:         number;
  clarificationRequests: number;
  parseSuccessRate:      number; // percentage 0–100
  reviewRate:            number; // percentage 0–100
}

export interface SubmissionStatusEntry {
  status: string;
}

// ── Static eligibility taxonomy ───────────────────────────────────────────────

export const ELIGIBILITY_TAXONOMY: ReadonlyArray<EligibilityTaxonomyEntry> = [
  {
    category: 'eligible',
    label:    'Idoneo',
    italianExplanation:
      'Attività che generano Impact Units su almeno uno dei 5 pillar KORA. ' +
      'Sono volontarie, vanno oltre il minimo contrattuale e legale, ' +
      'e contribuiscono all\'attivazione umana dell\'organizzazione.',
    examples: [
      'Formazione volontaria, upskilling e certificazioni',
      'Mentoring formale e peer-support',
      'Volontariato e iniziative ESG',
      'Programmi benessere su base volontaria',
      'Attività di team building non obbligatorie',
    ],
  },
  {
    category: 'limited',
    label:    'Limitato',
    italianExplanation:
      'Attività con impatto parziale. Contengono una componente welfare o benefit, ' +
      'ma il valore di attivazione è ridotto dal fattore di correzione CF nel calcolo ' +
      'delle Impact Units. Generano alcune IU, ma con peso ridotto rispetto alle attività idonee.',
    examples: [
      'Buoni pasto e ticket restaurant',
      'Fringe benefit generici (auto aziendale, telefono)',
      'Polizze assicurative standard di categoria',
      'Formazione compliance con componente volontaria marginale',
    ],
  },
  {
    category: 'blocked',
    label:    'Escluso',
    italianExplanation:
      'Attività obbligatorie per legge, contrattualmente dovute, o prive di valore ' +
      'di attivazione reale. Il fattore AGF = 0: nessuna Impact Unit viene generata. ' +
      'Non è una valutazione negativa — sono attività fuori scope KORA per definizione.',
    examples: [
      'Formazione compliance obbligatoria (D.Lgs 81/08, GDPR mandatorio)',
      'Dispositivi di protezione individuale (DPI)',
      'Sorveglianza sanitaria obbligatoria',
      'Stipendi, RAL e dati retributivi',
      'Benefit contrattualmente dovuti (CCNL)',
    ],
  },
] as const;

// ── Pure derivation functions ─────────────────────────────────────────────────

export function deriveEligibilityCategories(
  eligibleCount: number,
  limitedCount:  number,
  blockedCount:  number,
): EligibilityCategory[] {
  const total = eligibleCount + limitedCount + blockedCount;
  return ELIGIBILITY_TAXONOMY.map((entry) => {
    const count =
      entry.category === 'eligible' ? eligibleCount
      : entry.category === 'limited' ? limitedCount
      : blockedCount;
    return {
      key:                entry.category,
      label:              entry.label,
      italianExplanation: entry.italianExplanation,
      examples:           entry.examples,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    };
  });
}

export function deriveReviewBreakdown(
  submissions: ReadonlyArray<SubmissionStatusEntry>,
): ReviewBreakdown {
  const result: ReviewBreakdown = {
    pending: 0, needsClarification: 0, accepted: 0, rejected: 0,
    total:   submissions.length,
  };
  for (const s of submissions) {
    switch (s.status) {
      case 'submission_pending':             result.pending++;            break;
      case 'submission_needs_clarification': result.needsClarification++; break;
      case 'submission_accepted':
      case 'submission_archived':            result.accepted++;           break;
      case 'submission_rejected':            result.rejected++;           break;
    }
  }
  return result;
}

export function deriveDataQualitySummary(
  filesUploaded:         number,
  recordsParsed:         number,
  recordsReviewed:       number,
  parseWarnings:         number,
  clarificationRequests: number,
): DataQualitySummary {
  const clean = Math.max(0, recordsParsed - parseWarnings);
  return {
    filesUploaded,
    recordsParsed,
    recordsReviewed,
    parseWarnings,
    clarificationRequests,
    parseSuccessRate: recordsParsed > 0 ? Math.round((clean / recordsParsed) * 1000) / 10 : 0,
    reviewRate:       recordsParsed > 0 ? Math.round((recordsReviewed / recordsParsed) * 1000) / 10 : 0,
  };
}

// ── Education block step definitions ─────────────────────────────────────────

export interface EducationStep {
  key:         string;
  label:       string;
  description: string;
}

export const KORA_EDUCATION_STEPS: ReadonlyArray<EducationStep> = [
  {
    key:         'submission',
    label:       'Invio dati',
    description: 'L\'azienda invia file CSV con le iniziative welfare, formazione e volontariato del periodo.',
  },
  {
    key:         'review',
    label:       'Revisione KORA',
    description: 'KORA Admin verifica la qualità e la completezza dei dati. Può richiedere chiarimenti.',
  },
  {
    key:         'eligibility',
    label:       'Eligibility Gate',
    description: 'Ogni record viene classificato: Idoneo (genera IU), Limitato (IU ridotta) o Escluso (AGF=0).',
  },
  {
    key:         'impact_units',
    label:       'Impact Units',
    description: 'Per ogni record idoneo o limitato vengono calcolate le Impact Units sui 5 pillar KORA.',
  },
  {
    key:         'kora_index',
    label:       'KORA Index',
    description: 'Le IU aggregate a livello aziendale alimentano il KORA Index v3 — 10 componenti, livello company.',
  },
] as const;
