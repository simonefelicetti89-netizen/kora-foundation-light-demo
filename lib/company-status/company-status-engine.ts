// lib/company-status/company-status-engine.ts
// Pure, deterministic functions for Company Status Center.
// No React, no services, no side effects — all testable in isolation.

export type PipelineStage = 1 | 2 | 3 | 4 | 5;
export type ChecklistItemStatus = 'COMPLETE' | 'IN_PROGRESS' | 'NOT_STARTED';

export interface SubmissionSnapshot {
  submissionId:   string;
  status:         string;
  submissionType: string | null;
  period:         string;
  fileCount:      number;
  submittedAt:    string | null;
  createdAt:      string;
  adminComment:   string | null;
}

export interface WorkspaceReadinessSnapshot {
  hasWorkforceBaseline: boolean;
  hasEvidenceBatches:   boolean;
  batchCount:           number;
  hasScoring:           boolean;
  hasDecisionPack:      boolean;
  readinessLevel:       string;
}

export interface PipelineStatusResult {
  currentStage:    PipelineStage;
  completedStages: ReadonlyArray<PipelineStage>;
  isComplete:      boolean;
}

export interface ChecklistItem {
  id:     string;
  label:  string;
  status: ChecklistItemStatus;
  detail: string;
  href?:  string;
}

export interface NextActionResult {
  action:  string;
  detail:  string;
  href:    string;
  urgency: 'critical' | 'normal' | 'info';
}

// ── Pipeline stage metadata ───────────────────────────────────────────────────

export const PIPELINE_STAGES: Record<PipelineStage, { label: string; description: string }> = {
  1: { label: 'Dati ricevuti',              description: 'Prima submission inviata a KORA.' },
  2: { label: 'In revisione',               description: 'KORA Admin sta revisionando i dati inviati.' },
  3: { label: 'Classificazione completata', description: 'Le iniziative sono state classificate e validate.' },
  4: { label: 'Scoring completato',         description: 'Il KORA Index è stato calcolato per questo periodo.' },
  5: { label: 'Decision Pack disponibile',  description: 'Il Decision Pack è pronto per il board.' },
};

// ── Submission status helpers ─────────────────────────────────────────────────

function hasStatus(subs: ReadonlyArray<SubmissionSnapshot>, ...statuses: string[]): boolean {
  return subs.some((s) => statuses.includes(s.status));
}

// ── Pipeline status ───────────────────────────────────────────────────────────

export function derivePipelineStatus(
  readiness:   WorkspaceReadinessSnapshot,
  submissions: ReadonlyArray<SubmissionSnapshot>,
): PipelineStatusResult {
  if (readiness.hasDecisionPack) {
    return { currentStage: 5, completedStages: [1, 2, 3, 4, 5], isComplete: true };
  }
  if (readiness.hasScoring) {
    return { currentStage: 5, completedStages: [1, 2, 3, 4], isComplete: false };
  }
  if (
    readiness.hasEvidenceBatches ||
    hasStatus(submissions, 'submission_accepted', 'submission_archived')
  ) {
    return { currentStage: 4, completedStages: [1, 2, 3], isComplete: false };
  }
  if (hasStatus(submissions, 'submission_pending', 'submission_needs_clarification')) {
    return { currentStage: 2, completedStages: [1], isComplete: false };
  }
  if (hasStatus(submissions, 'submission_rejected')) {
    return { currentStage: 2, completedStages: [1], isComplete: false };
  }
  // Draft exists but not submitted
  if (submissions.length > 0) {
    return { currentStage: 1, completedStages: [], isComplete: false };
  }
  // Nothing at all
  return { currentStage: 1, completedStages: [], isComplete: false };
}

// ── Onboarding checklist ─────────────────────────────────────────────────────

export function deriveChecklist(
  readiness:    WorkspaceReadinessSnapshot,
  submissions:  ReadonlyArray<SubmissionSnapshot>,
  totalWorkers: number,
): ChecklistItem[] {
  const hasSubmitted = hasStatus(
    submissions,
    'submission_pending',
    'submission_accepted',
    'submission_needs_clarification',
    'submission_rejected',
    'submission_archived',
  );
  const hasDraft    = hasStatus(submissions, 'submission_draft');
  // Readiness signals imply that submission/review must have occurred even if submissions array is empty
  const impliedSubmitted = readiness.hasEvidenceBatches || readiness.hasScoring || readiness.hasDecisionPack;
  const hasAccepted = hasStatus(submissions, 'submission_accepted', 'submission_archived') ||
                      readiness.hasEvidenceBatches || readiness.hasScoring || readiness.hasDecisionPack;

  return [
    {
      id:     'workspace_active',
      label:  'Workspace attivato',
      status: 'COMPLETE',
      detail: 'Il tuo workspace KORA è attivo e accessibile.',
    },
    {
      id:     'workforce_registered',
      label:  'Workforce registrata',
      status: totalWorkers > 0 ? 'COMPLETE' : 'NOT_STARTED',
      detail: totalWorkers > 0
        ? `${totalWorkers} lavoratori nel roster.`
        : 'Il roster è gestito da KORA Admin. Contatta il tuo referente per avviarlo.',
      href: totalWorkers > 0 ? '/company/workspace#worker-space' : undefined,
    },
    {
      id:     'first_submission',
      label:  'Prima submission inviata',
      status: (hasSubmitted || impliedSubmitted) ? 'COMPLETE' : hasDraft ? 'IN_PROGRESS' : 'NOT_STARTED',
      detail: (hasSubmitted || impliedSubmitted)
        ? hasSubmitted
          ? `${submissions.filter((s) => s.status !== 'submission_draft').length} submission inviata/e a KORA Admin.`
          : 'Dati inviati a KORA Admin — pipeline attiva.'
        : hasDraft
        ? 'Bozza in preparazione. Completa e invia per avanzare.'
        : 'Nessuna submission ancora. Carica il primo dataset per avviare il processo.',
      href: '/company/workspace#data-submission',
    },
    {
      id:     'review_complete',
      label:  'Revisione completata',
      status: hasAccepted ? 'COMPLETE' : hasSubmitted ? 'IN_PROGRESS' : 'NOT_STARTED',
      detail: hasAccepted
        ? 'I dati sono stati revisionati e accettati da KORA Admin.'
        : hasSubmitted
        ? 'KORA Admin sta revisionando i dati inviati.'
        : 'La revisione inizia dopo la prima submission.',
    },
    {
      id:     'kora_index',
      label:  'KORA Index disponibile',
      status: readiness.hasScoring ? 'COMPLETE' : hasAccepted ? 'IN_PROGRESS' : 'NOT_STARTED',
      detail: readiness.hasScoring
        ? 'Il KORA Index è disponibile per questo periodo.'
        : hasAccepted
        ? 'Scoring in preparazione — dati accettati da KORA Admin.'
        : 'Disponibile dopo revisione e scoring.',
      href: readiness.hasScoring ? '/company/kora-index' : undefined,
    },
    {
      id:     'decision_pack',
      label:  'Decision Pack disponibile',
      status: readiness.hasDecisionPack
        ? 'COMPLETE'
        : readiness.hasScoring
        ? 'IN_PROGRESS'
        : 'NOT_STARTED',
      detail: readiness.hasDecisionPack
        ? 'Il Decision Pack è pronto. Aprilo per condividerlo con il board.'
        : readiness.hasScoring
        ? 'Il Decision Pack è in preparazione da parte del team KORA.'
        : 'Disponibile dopo il completamento dello scoring.',
      href: readiness.hasDecisionPack ? '/company/reports' : undefined,
    },
  ];
}

// ── Next action engine ────────────────────────────────────────────────────────

export function deriveNextAction(
  readiness:   WorkspaceReadinessSnapshot,
  submissions: ReadonlyArray<SubmissionSnapshot>,
): NextActionResult {
  // Priority 1 — needs clarification (blocks progress, must not be missed)
  const clarification = submissions.find((s) => s.status === 'submission_needs_clarification');
  if (clarification) {
    const comment = clarification.adminComment?.slice(0, 120) ?? null;
    return {
      action:  'Risposta richiesta — chiarimento in attesa',
      detail:  comment
        ? `KORA Admin ha scritto: "${comment}"`
        : 'KORA Admin ha richiesto chiarimenti sulla tua submission.',
      href:    '/company/workspace#data-submission',
      urgency: 'critical',
    };
  }

  // Priority 2 — Decision Pack ready
  if (readiness.hasDecisionPack) {
    return {
      action:  'Il tuo Decision Pack è pronto',
      detail:  'Apri il Board Pack e condividilo con HR, Finance e board.',
      href:    '/company/reports',
      urgency: 'info',
    };
  }

  // Priority 3 — scoring complete, Decision Pack in preparation
  if (readiness.hasScoring) {
    return {
      action:  'Scoring completato — Decision Pack in preparazione',
      detail:  'KORA Admin sta preparando il Decision Pack. Nessuna azione richiesta al momento.',
      href:    '/company/kora-index',
      urgency: 'info',
    };
  }

  // Priority 4 — classification complete, waiting for scoring
  if (readiness.hasEvidenceBatches) {
    return {
      action:  'Classificazione completata — attendi lo scoring',
      detail:  'I tuoi dati sono stati classificati. Lo scoring KORA inizierà a breve.',
      href:    '/company/workspace',
      urgency: 'info',
    };
  }

  // Priority 5 — submission pending review
  if (hasStatus(submissions, 'submission_pending')) {
    return {
      action:  'I tuoi dati sono in revisione',
      detail:  'KORA Admin sta revisionando la tua submission. Nessuna azione richiesta.',
      href:    '/company/status',
      urgency: 'info',
    };
  }

  // Priority 6 — only drafts, not submitted
  if (hasStatus(submissions, 'submission_draft')) {
    return {
      action:  'Completa e invia la submission in bozza',
      detail:  'Hai una o più submission in bozza. Aggiungi i file e invia a KORA Admin.',
      href:    '/company/workspace#data-submission',
      urgency: 'normal',
    };
  }

  // Priority 7 — rejected submission, no other state
  if (hasStatus(submissions, 'submission_rejected')) {
    return {
      action:  'Crea una nuova submission',
      detail:  'Una submission precedente è stata rifiutata. Crea una nuova submission con i dati corretti.',
      href:    '/company/workspace#data-submission',
      urgency: 'normal',
    };
  }

  // Priority 8 — no submissions at all
  if (submissions.length === 0) {
    return {
      action:  'Carica il primo dataset per avviare il processo KORA',
      detail:  'Vai alla submission e carica i dati delle tue iniziative welfare, formazione o volontariato.',
      href:    '/company/workspace#data-submission',
      urgency: 'normal',
    };
  }

  return {
    action:  'Il tuo workspace KORA è aggiornato',
    detail:  'Non ci sono azioni immediate richieste. Monitora il tuo Status Center.',
    href:    '/company',
    urgency: 'info',
  };
}

// Template config is now canonical in lib/company-submissions/templates.ts
// Re-exported here for backward compatibility with existing imports.
export type { SubmissionTemplate as TemplateEntry } from '@/lib/company-submissions/templates';
export { SUBMISSION_TEMPLATES } from '@/lib/company-submissions/templates';
