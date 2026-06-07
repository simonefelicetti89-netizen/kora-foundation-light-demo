// lib/admin-lifecycle/lifecycle-rules.ts
// Pure, deterministic lifecycle status engine for Admin Pipeline Orchestrator.
// No React, no services, no side effects — fully testable in isolation.
// No AI, no random logic.

export type LifecycleStepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'READY' | 'BLOCKED' | 'DONE';

export interface LifecycleStep {
  id:          string;
  stepNumber:  number;       // 1–8
  title:       string;       // Italian display title
  ownerRole:   string;       // 'KORA_ADMIN' | 'COMPANY_ADMIN' | 'WORKER'
  ownerLabel:  string;       // Human-readable role name
  route:       string;       // Primary navigation target
  description: string;       // What happens in this step
  nextAction:  string;       // What to do to advance from this step
}

export interface LifecycleStatusInputs {
  tenantExists:       boolean; // Company record exists in tenant registry
  hasCompanyUser:     boolean; // At least one Company Admin account exists
  totalWorkers:       number;  // Roster size
  hasSubmission:      boolean; // Any submission (any status) has been created
  submissionPending:  boolean; // At least one submission in pending review
  hasReviewedData:    boolean; // Evidence batches classified (post-review stage)
  hasScoring:         boolean; // KORA Index has been computed
  hasDecisionPack:    boolean; // Decision Pack status === 'ready'
  workerSpaceEnabled: boolean; // At least one worker has My KORA enabled
}

// ── 8-step lifecycle definition ───────────────────────────────────────────────

export const LIFECYCLE_STEPS: ReadonlyArray<LifecycleStep> = [
  {
    id:          'create_company',
    stepNumber:  1,
    title:       'Crea Azienda',
    ownerRole:   'KORA_ADMIN',
    ownerLabel:  'KORA Admin',
    route:       '/admin/companies/new',
    description: 'KORA Admin crea il tenant aziendale con ragione sociale, settore, fascia dimensionale e piano KORA. Il tenant viene registrato nel sistema e il workspace aziendale viene inizializzato.',
    nextAction:  'Accedi a Crea Azienda Live e registra il nuovo cliente.',
  },
  {
    id:          'create_company_user',
    stepNumber:  2,
    title:       'Crea Utente Aziendale',
    ownerRole:   'KORA_ADMIN',
    ownerLabel:  'KORA Admin',
    route:       '/admin/company-users',
    description: 'KORA Admin crea l\'account Company Admin e le credenziali di accesso al workspace KORA. L\'utente riceve un invito con accesso al workspace aziendale.',
    nextAction:  'Crea il primo utente Company Admin e verifica le credenziali di accesso.',
  },
  {
    id:          'import_workforce',
    stepNumber:  3,
    title:       'Importa Workforce',
    ownerRole:   'KORA_ADMIN',
    ownerLabel:  'KORA Admin',
    route:       '/admin/companies',
    description: 'KORA Admin importa il roster dei lavoratori con pseudonyms e struttura organizzativa. Il roster definisce la popolazione aziendale coperta dal KORA Index. Nessun account My KORA viene creato in questa fase.',
    nextAction:  'Apri la Company Control Room → Workforce e carica il file CSV del roster.',
  },
  {
    id:          'company_submission',
    stepNumber:  4,
    title:       'Azienda Carica Submission',
    ownerRole:   'COMPANY_ADMIN',
    ownerLabel:  'Company Admin',
    route:       '/company/workspace#data-submission',
    description: 'L\'azienda carica i dati delle iniziative welfare, formazione e volontariato tramite il Submission Wizard. I file CSV vengono inviati a KORA Admin per revisione.',
    nextAction:  'L\'azienda deve accedere al workspace e caricare almeno una submission.',
  },
  {
    id:          'kora_review',
    stepNumber:  5,
    title:       'KORA Review',
    ownerRole:   'KORA_ADMIN',
    ownerLabel:  'KORA Admin',
    route:       '/admin/company-submissions',
    description: 'KORA Admin revisiona la submission: verifica la qualità dei dati, classifica le attività nel BCM taxonomy e determina l\'Eligibility Gate per ogni record (Idoneo, Limitato, Escluso).',
    nextAction:  'Apri la Submission Queue e revisiona i file inviati dall\'azienda.',
  },
  {
    id:          'scoring',
    stepNumber:  6,
    title:       'Scoring',
    ownerRole:   'KORA_ADMIN',
    ownerLabel:  'KORA Admin',
    route:       '/admin/uef-review',
    description: 'KORA Admin avvia il processo di scoring: UEF Review → IU computation → aggregazione company → KORA Index v3 (10 componenti) + Confidence Score + Activation Safeguard.',
    nextAction:  'Avvia l\'UEF Review, poi lo Scoring Run per calcolare il KORA Index.',
  },
  {
    id:          'decision_pack',
    stepNumber:  7,
    title:       'Decision Pack',
    ownerRole:   'KORA_ADMIN',
    ownerLabel:  'KORA Admin',
    route:       '/admin/companies',
    description: 'KORA Admin prepara il Decision Pack board-grade: KORA Index v3, Confidence Score, Activation Safeguard, 10 componenti, raccomandazioni strategiche. Il report viene reso disponibile all\'azienda.',
    nextAction:  'Genera il Decision Pack dalla Company Control Room e verifica con l\'advisor.',
  },
  {
    id:          'worker_space_preview',
    stepNumber:  8,
    title:       'Worker Space Preview',
    ownerRole:   'WORKER',
    ownerLabel:  'Lavoratore / KORA Admin preview',
    route:       '/my-kora',
    description: 'I lavoratori accedono a My KORA per vedere il proprio spazio personale, il Dynamic Impact CV e le opportunità. KORA Admin può fare l\'anteprima del Worker Space senza dati individuali PIB.',
    nextAction:  'Abilita My KORA per i lavoratori e verifica l\'anteprima Worker Space.',
  },
] as const;

// ── Status derivation — pure, deterministic ───────────────────────────────────

export function deriveStepStatus(
  stepId: string,
  inputs: LifecycleStatusInputs,
): LifecycleStepStatus {
  switch (stepId) {
    case 'create_company':
      return inputs.tenantExists ? 'DONE' : 'NOT_STARTED';

    case 'create_company_user':
      if (!inputs.tenantExists)   return 'BLOCKED';
      return inputs.hasCompanyUser ? 'DONE' : 'READY';

    case 'import_workforce':
      if (!inputs.tenantExists)    return 'BLOCKED';
      if (inputs.totalWorkers >= 30) return 'DONE';
      if (inputs.totalWorkers > 0)   return 'IN_PROGRESS';
      return 'READY';

    case 'company_submission':
      if (inputs.totalWorkers === 0) return 'BLOCKED';
      if (inputs.hasReviewedData || inputs.hasScoring || inputs.hasDecisionPack) return 'DONE';
      if (inputs.hasSubmission)      return 'IN_PROGRESS';
      return 'NOT_STARTED';

    case 'kora_review':
      if (!inputs.hasSubmission) return 'BLOCKED';
      if (inputs.hasReviewedData || inputs.hasScoring || inputs.hasDecisionPack) return 'DONE';
      if (inputs.submissionPending)  return 'IN_PROGRESS';
      return 'READY';

    case 'scoring':
      if (!inputs.hasReviewedData) return 'BLOCKED';
      if (inputs.hasScoring || inputs.hasDecisionPack) return 'DONE';
      return 'READY';

    case 'decision_pack':
      if (!inputs.hasScoring)     return 'BLOCKED';
      if (inputs.hasDecisionPack) return 'DONE';
      return 'IN_PROGRESS';

    case 'worker_space_preview':
      if (!inputs.hasDecisionPack) return 'NOT_STARTED';
      return inputs.workerSpaceEnabled ? 'DONE' : 'READY';

    default:
      return 'NOT_STARTED';
  }
}

export function deriveAllStepStatuses(
  inputs: LifecycleStatusInputs,
): Record<string, LifecycleStepStatus> {
  const result: Record<string, LifecycleStepStatus> = {};
  for (const step of LIFECYCLE_STEPS) {
    result[step.id] = deriveStepStatus(step.id, inputs);
  }
  return result;
}

// ── Status display metadata ───────────────────────────────────────────────────

export const STATUS_META: Record<LifecycleStepStatus, {
  label:       string;
  dotColor:    string;
  textColor:   string;
  bgColor:     string;
  borderColor: string;
}> = {
  NOT_STARTED: {
    label:       'Non iniziato',
    dotColor:    'rgba(6,3,43,0.25)',
    textColor:   'rgba(6,3,43,0.40)',
    bgColor:     'rgba(6,3,43,0.03)',
    borderColor: 'rgba(6,3,43,0.08)',
  },
  IN_PROGRESS: {
    label:       'In corso',
    dotColor:    '#D99A2B',
    textColor:   '#8A5A00',
    bgColor:     'rgba(217,154,43,0.08)',
    borderColor: 'rgba(217,154,43,0.28)',
  },
  READY: {
    label:       'Pronto',
    dotColor:    '#4A7FE0',
    textColor:   '#1E4DA0',
    bgColor:     'rgba(74,127,224,0.08)',
    borderColor: 'rgba(74,127,224,0.30)',
  },
  BLOCKED: {
    label:       'Bloccato',
    dotColor:    '#9E3B2F',
    textColor:   '#9E3B2F',
    bgColor:     'rgba(158,59,47,0.06)',
    borderColor: 'rgba(158,59,47,0.20)',
  },
  DONE: {
    label:       'Completato',
    dotColor:    '#2F7D55',
    textColor:   '#2F7D55',
    bgColor:     'rgba(47,125,85,0.08)',
    borderColor: 'rgba(47,125,85,0.28)',
  },
};

// ── Role owner display metadata ───────────────────────────────────────────────

export const OWNER_META: Record<string, { label: string; chip: string }> = {
  KORA_ADMIN:    { label: 'KORA Admin',                  chip: 'bg-[rgba(6,3,43,0.07)] text-[rgba(6,3,43,0.65)] border-[rgba(6,3,43,0.14)]' },
  COMPANY_ADMIN: { label: 'Company Admin',               chip: 'bg-[rgba(199,111,61,0.10)] text-[#7A4019] border-[rgba(199,111,61,0.28)]' },
  WORKER:        { label: 'Lavoratore / Admin preview',  chip: 'bg-[rgba(47,125,85,0.09)] text-[#2F7D55] border-[rgba(47,125,85,0.28)]' },
};
