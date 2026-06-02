// lib/data-intake/file-role-detection.ts
// B28: Deterministic rule-based file role detection for multi-file batch intake.
// No LLM, no external calls, no side effects.
//
// Detects the most likely role for a file based on:
//   1. Canonical field names present in headers
//   2. Keywords in the file name
//   3. Proportion of role-specific signals found

export type IntakeFileRole =
  | 'initiatives'
  | 'budget'
  | 'participation'
  | 'evidence'
  | 'lms'
  | 'provider'
  | 'policy'
  | 'unknown';

export const INTAKE_ROLE_LABELS: Record<IntakeFileRole, string> = {
  initiatives:   'Iniziative / Programmi',
  budget:        'Budget / Finanziario',
  participation: 'Partecipazione / Usage',
  evidence:      'Evidenze / Documenti',
  lms:           'LMS / Formazione',
  provider:      'Provider / Fornitore',
  policy:        'Policy / Regolamenti',
  unknown:       'Non classificato',
};

// ── Header signals (normalized canonical field names and common synonyms) ─────

const HEADER_SIGNALS: Record<IntakeFileRole, string[]> = {
  initiatives: [
    'initiative_name', 'nome_iniziativa', 'iniziativa', 'progetto', 'titolo',
    'attivita', 'descrizione', 'categoria', 'type', 'tipo', 'tipo_iniziativa',
    'programma', 'intervento', 'azione', 'misura', 'nome_progetto',
  ],
  budget: [
    'amount', 'importo', 'costo', 'budget', 'spesa', 'valore', 'total',
    'cost_center', 'centro_costo', 'cdc', 'voce_contabile',
    'budget_amount', 'importo_consuntivo', 'costo_consuntivo',
    'budget_class', 'budget_hr', 'budget_welfare',
  ],
  participation: [
    'participants', 'partecipanti', 'beneficiari', 'utenti', 'aderenti',
    'uptake', 'utilizzo', 'usage', 'fruizione', 'adesione',
    'n_partecipanti', 'persone_coinvolte', 'tasso_utilizzo',
    'coverage', 'copertura', 'active_users', 'active_workers',
  ],
  evidence: [
    'evidence', 'evidenza', 'proof', 'documento', 'documentazione',
    'attachment', 'allegato', 'archivio', 'contratto', 'fattura',
    'invoice', 'file_evidenza',
  ],
  lms: [
    'corso', 'course', 'ore', 'hours', 'formazione', 'training',
    'completamento', 'completion', 'lms', 'elearning', 'e_learning',
    'ore_formazione', 'training_hours', 'completion_rate',
    'learning_path', 'modulo',
  ],
  provider: [
    'provider', 'fornitore', 'erogatore', 'partner', 'vendor',
    'welfare_provider', 'servizio', 'export_provider',
    'nome_provider', 'ente_erogatore',
  ],
  policy: [
    'policy', 'regolamento', 'procedura', 'policy_evidence',
    'policy_document', 'normativa', 'diritto', 'smart_working',
    'coverage', 'copertura', 'uptake', 'eligible_population',
  ],
  unknown: [],
};

// ── File name signals ─────────────────────────────────────────────────────────

const FILENAME_SIGNALS: Record<IntakeFileRole, string[]> = {
  initiatives: ['iniziative', 'initiative', 'welfare', 'programmi', 'attivita', 'programs'],
  budget:      ['budget', 'costi', 'spese', 'finanziario', 'finance', 'contabilita', 'cost'],
  participation: ['partecipanti', 'participation', 'utilizzo', 'usage', 'beneficiari', 'attendance'],
  evidence:    ['evidenze', 'evidence', 'documenti', 'allegati'],
  lms:         ['lms', 'formazione', 'training', 'corsi', 'course', 'learning'],
  provider:    ['provider', 'fornitore', 'welfare_provider', 'supplier'],
  policy:      ['policy', 'policies', 'regolamenti', 'regolamento', 'procedure'],
  unknown:     [],
};

// ── Normalisation ─────────────────────────────────────────────────────────────

function normStr(s: string): string {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// ── Main function ─────────────────────────────────────────────────────────────

export function detectFileRole(
  fileName: string,
  headers: string[],
): { role: IntakeFileRole; confidence: number; reasonCodes: string[] } {
  const normFileName = normStr(fileName.replace(/\.[^.]+$/, ''));
  const normHeaders  = headers.map(normStr);

  const scores: Partial<Record<IntakeFileRole, number>> = {};
  const reasons: string[] = [];

  const roles: IntakeFileRole[] = [
    'initiatives', 'budget', 'participation', 'evidence', 'lms', 'provider', 'policy',
  ];

  for (const role of roles) {
    let score = 0;

    // Header signals
    const headerMatches = normHeaders.filter(h => HEADER_SIGNALS[role].includes(h));
    score += headerMatches.length * 2;
    if (headerMatches.length > 0) reasons.push(`header:${role}:${headerMatches.slice(0, 3).join(',')}`);

    // Filename signals
    const fileMatches = FILENAME_SIGNALS[role].filter(sig => normFileName.includes(sig));
    score += fileMatches.length * 3;  // filename is a stronger signal
    if (fileMatches.length > 0) reasons.push(`filename:${role}:${fileMatches.join(',')}`);

    if (score > 0) scores[role] = score;
  }

  if (Object.keys(scores).length === 0) {
    return { role: 'unknown', confidence: 0, reasonCodes: ['no_signal'] };
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => (b as number) - (a as number));
  const [topRole, topScore] = sorted[0];
  const totalSignals = HEADER_SIGNALS[topRole as IntakeFileRole].length + FILENAME_SIGNALS[topRole as IntakeFileRole].length;
  const rawConf = Math.min(1, (topScore as number) / Math.max(totalSignals * 0.4, 4));

  // Reduce confidence if second-best is close
  const secondScore = sorted[1]?.[1] as number ?? 0;
  const finalConf = secondScore > (topScore as number) * 0.8
    ? Math.max(0.4, rawConf - 0.2)
    : rawConf;

  return {
    role: topRole as IntakeFileRole,
    confidence: Math.round(finalConf * 100) / 100,
    reasonCodes: reasons.slice(0, 6),
  };
}
