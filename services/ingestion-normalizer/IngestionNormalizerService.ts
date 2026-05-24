import type { RawIngestionRow, NormalizedIngestionRow, IngestionSourceType } from '@/lib/types';
import { CCNL_IMPROVEMENT_SIGNALS } from '@/lib/constants/kora';

const SOURCE_TYPE_PATTERNS: Array<{ type: IngestionSourceType; keywords: string[] }> = [
  {
    // Structural policy register — must be checked before hr_system to avoid misclassification
    type: 'company_policy_register',
    keywords: [
      'policy register', 'hr policy', 'accordo integrativo', 'regolamento aziendale',
      'people policy', 'work-life policy', 'smart working policy', 'policy strutturale',
      'registro policy', 'company policy', 'collective agreement', 'accordo sindacale people',
      'ferie illimitate', 'diritto alla disconnessione', 'no meeting zone',
    ],
  },
  {
    type: 'welfare_provider',
    keywords: ['welfare platform', 'welfare export', 'welfare provider', 'edenred', 'day welfare', 'zucchetti welfare', 'voucher', 'buono'],
  },
  {
    type: 'lms_training',
    keywords: ['lms', 'learning management', 'e-learning', 'completamento corso', 'formazione', 'academy', 'digital skills', 'sicurezza-completamenti'],
  },
  {
    type: 'esg_initiatives',
    keywords: ['esg manual', 'esg', 'csr', 'volontariato', 'sostenibilita', 'territoriale', 'impatto sociale'],
  },
  {
    type: 'hr_system',
    keywords: ['hr system', 'hr-benefit', 'hr-mentoring', 'welfare-rimborsi', 'welfare-caregiver', 'compliance-hse', 'compliance-abilitazioni', 'hr'],
  },
  {
    type: 'partner_events',
    keywords: ['partner', 'evento esterno', 'collaborazione esterna', 'kora network'],
  },
  {
    type: 'manual',
    keywords: ['manuale', 'inserimento manuale', 'manual entry'],
  },
];

// CCNL improvement override — must be checked BEFORE MANDATORY_INFERENCE_PATTERNS.
// If the text references a CCNL or collective agreement AND contains an improvement signal
// (beyond legal/contractual minimum), the item is a voluntary structural policy, NOT blocked.
const CCNL_IMPROVEMENT_PATTERNS: Array<{ keywords: string[]; status: string }> = [
  {
    keywords: ['ccnl', 'contratto collettivo', 'accordo sindacale', 'accordo integrativo'],
    status: 'voluntary', // CCNL improvement beyond minimum → voluntary, eligible
  },
];

const MANDATORY_INFERENCE_PATTERNS: Array<{ keywords: string[]; status: string }> = [
  {
    keywords: [
      'obbligatorio', 'obbligatoria', 'mandatory', 'd.lgs 81', 'dlgs 81', 'd.lgs. 81',
      'd.lgs 231', 'dlgs 231', 'gdpr obbligatori', 'sicurezza obbligatoria',
      'formazione obbligatoria', 'legal mandatory',
    ],
    status: 'legal_mandatory',
  },
  {
    keywords: ['patentino', 'abilitazione obbligatoria', 'certificazione ruolo', 'role mandatory', 'dm 12/09/2011'],
    status: 'role_mandatory',
  },
  {
    keywords: ['ccnl', 'contratto collettivo', 'accordo sindacale', 'contractual mandatory'],
    status: 'contractual_mandatory',
  },
  {
    keywords: ['volontario', 'voluntary', 'opzionale', 'optional', 'adesione volontaria'],
    status: 'voluntary',
  },
];

const MISSING_FIELD_QUESTIONS: Record<string, string> = {
  beneficiary_count:              'Quanti dipendenti hanno beneficiato di questa azione?',
  individual_claim_evidence:      "C'è evidenza individuale di utilizzo (ricevute, log di accesso)?",
  mandatory_vs_voluntary_status:  "L'azione era obbligatoria (normativa, contratto, ruolo) o volontaria?",
  mandatory_status:               "L'azione era obbligatoria per legge, contratto o ruolo — oppure volontaria?",
  curriculum_description:         'Qual è il contenuto del percorso formativo (competenze sviluppate, obiettivi)?',
  developer_vs_compliance_nature: "Il corso ha natura di sviluppo professionale o di adempimento compliance?",
  proof_of_enrollment:            'Esiste documentazione di iscrizione o partecipazione effettiva?',
  provider_accreditation_doc:     'Il provider è accreditato? Esiste documentazione di accreditamento?',
  certified_caregiver_status:     'Esiste certificazione dello stato di caregiver del dipendente?',
  provider_service_proof:         'Il provider ha emesso documentazione del servizio erogato?',
  aggregate_participation_count:  'Quanti dipendenti hanno partecipato (dato aggregato)?',
  partner_validation_doc:         'Il partner ha fornito validazione della partecipazione?',
  hours_logged:                   'Sono disponibili le ore registrate per questa attività?',
  beneficiary_department:         'A quale reparto/sito appartengono i beneficiari?',
  beneficiary_count_by_site:      'I beneficiari sono distribuiti per sito?',
  enrollment_proof:               "Esiste documentazione di iscrizione all'istituto educativo?",
  study_institution:              "Qual è l'istituto di formazione beneficiario della borsa?",
  taxonomy_mapping_required:      'Questa voce richiede mappatura manuale nella tassonomia KORA.',
  structured_program_evidence:    'Esiste documentazione strutturata del programma (curriculum, obiettivi, coppie)?',
  mentor_mentee_pair_count:       'Quante coppie mentore-mentee hanno partecipato?',
  participation_count_by_site:    'È disponibile il conteggio dei partecipanti per sito?',
  // Structural policy missing fields
  policy_coverage_pct:            'Quale percentuale della workforce è coperta da questa policy (dato aggregato)?',
  policy_formalization_level:     'La policy è formalizzata in un documento ufficiale, accordo sindacale o delibera del CDA?',
  policy_effective_date:          'Da quando è in vigore questa policy?',
  policy_beyond_legal_minimum:    'La policy va oltre i requisiti minimi di legge o di CCNL standard?',
  eligible_population:            'Quanti lavoratori sono nella popolazione eleggibile per questa policy?',
  covered_population:             'Quanti lavoratori sono coperti da questa policy (dato aggregato, non individuale)?',
  evidence_reference:             'Qual è il riferimento documentale di questa policy (numero delibera, codice accordo, nome documento)?',
};

export interface IIngestionNormalizerService {
  normalizeRow(raw: RawIngestionRow): NormalizedIngestionRow;
  normalizeBatch(rows: RawIngestionRow[]): NormalizedIngestionRow[];
  detectMissingFields(row: RawIngestionRow): string[];
  inferSourceType(row: RawIngestionRow): IngestionSourceType;
  inferMandatoryStatus(row: RawIngestionRow): string | undefined;
  getMissingDataQuestions(missingFields: string[]): string[];
}

export class IngestionNormalizerService implements IIngestionNormalizerService {
  normalizeRow(raw: RawIngestionRow): NormalizedIngestionRow {
    const sourceType = (raw.source_type as IngestionSourceType | undefined) ?? this.inferSourceType(raw);
    const inferredSourceType = !raw.source_type;

    const rawMandatory = raw.mandatory_status ?? null;
    const inferredMandatoryStatus = !raw.mandatory_status;
    const resolvedMandatory = rawMandatory ?? this.inferMandatoryStatus(raw) ?? null;

    const missingFields = this.detectMissingFields(raw);

    // Completeness score: penalty per missing field, floor at 0.
    const penaltyPerField = 0.15;
    const data_completeness_score = Math.max(0, 1 - missingFields.length * penaltyPerField);

    return {
      id: raw.id,
      raw_name: raw.raw_name,
      normalized_name: this.normalizeDisplayName(raw.raw_name),
      raw_description: raw.raw_description ?? '',
      source_file: raw.source_file ?? 'sconosciuto',
      source_type: sourceType,
      inferred_source_type: inferredSourceType,
      amount: raw.amount ?? null,
      date_or_period: raw.date_or_period ?? 'sconosciuto',
      provider: raw.provider ?? null,
      site_or_cluster: raw.site_or_cluster ?? null,
      mandatory_status: resolvedMandatory,
      inferred_mandatory_status: inferredMandatoryStatus && resolvedMandatory !== null,
      evidence_type: raw.evidence_type ?? 'unknown',
      missing_fields: missingFields,
      data_completeness_score,
    };
  }

  normalizeBatch(rows: RawIngestionRow[]): NormalizedIngestionRow[] {
    return rows.map((r) => this.normalizeRow(r));
  }

  // Pre-computed missing_fields from demo data are used as-is.
  // For real CSV uploads, structural field gaps are detected from the row shape.
  detectMissingFields(row: RawIngestionRow): string[] {
    const preComputed: string[] = Array.isArray(row.missing_fields) ? [...row.missing_fields] : [];
    const structural: string[] = [];
    if (!row.date_or_period) structural.push('date_or_period');
    if (!row.evidence_type)  structural.push('evidence_type');
    return [...new Set([...preComputed, ...structural])];
  }

  inferSourceType(row: RawIngestionRow): IngestionSourceType {
    const text = [
      row.source_file ?? '',
      row.source_system ?? '',
      row.raw_name,
      row.raw_description ?? '',
    ].join(' ').toLowerCase();

    for (const { type, keywords } of SOURCE_TYPE_PATTERNS) {
      if (keywords.some((kw) => text.includes(kw))) return type;
    }
    return 'unknown';
  }

  inferMandatoryStatus(row: RawIngestionRow): string | undefined {
    const text = [row.raw_name, row.raw_description ?? ''].join(' ').toLowerCase();

    // Check CCNL improvement override first: if the text references a collective agreement
    // AND contains an improvement signal (beyond minimum), infer voluntary — not contractual_mandatory.
    for (const { keywords } of CCNL_IMPROVEMENT_PATTERNS) {
      if (keywords.some((kw) => text.includes(kw))) {
        const hasImprovementSignal = CCNL_IMPROVEMENT_SIGNALS.some((s) => text.includes(s));
        if (hasImprovementSignal) return 'voluntary';
        // CCNL present but no improvement signal → fall through to contractual_mandatory below
        break;
      }
    }

    for (const { keywords, status } of MANDATORY_INFERENCE_PATTERNS) {
      if (keywords.some((kw) => text.includes(kw))) return status;
    }
    return undefined;
  }

  getMissingDataQuestions(missingFields: string[]): string[] {
    return missingFields
      .filter((f) => f in MISSING_FIELD_QUESTIONS)
      .map((f) => MISSING_FIELD_QUESTIONS[f]);
  }

  private normalizeDisplayName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const ingestionNormalizerService = new IngestionNormalizerService();
