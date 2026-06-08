// lib/worker-achievements/types.ts
// B99-B — Achievement model for the worker recognition layer.
// Bridges: Participation → Verification → Recognition → Dynamic CV.
//
// Privacy invariants:
// - Achievements are worker-owned and worker-private.
// - Employer roles may never access individual achievement records.
// - Only aggregate counts (≥10 threshold) are ever surfaced company-side.

export type AchievementStatus =
  | 'participated'          // worker participated — verification not yet started
  | 'pending_verification'  // verification in progress with external source
  | 'verified'              // confirmed by external source — CV eligible
  | 'recognized';           // formally recognized — highest status, CV eligible

export type AchievementVerificationLevel =
  | 'external'       // confirmed by LMS, welfare provider, partner, advisor
  | 'partial'        // partial confirmation — process not complete
  | 'self_declared'; // uploaded by worker — no external confirmation yet

export type AchievementPillar = 'LIFE' | 'GROWTH' | 'CONNECTION' | 'IMPACT' | 'LEGACY';

export interface AchievementPreview {
  id:                 string;
  title:              string;
  description:        string;
  pillar:             AchievementPillar;
  status:             AchievementStatus;
  verificationLevel:  AchievementVerificationLevel;
  cvEligible:         boolean;
  organization:       string;
  completionDate:     string;  // ISO date string YYYY-MM-DD
  synthetic_demo_data: true;
}

export interface AchievementStats {
  total:      number;
  verified:   number;  // status 'verified' | 'recognized'
  shareable:  number;  // cvEligible && (status === 'verified' || 'recognized')
  pending:    number;  // status 'pending_verification'
  recognized: number;  // status 'recognized'
  synthetic_demo_data: true;
}

// Display labels — used in UI without exposing raw status codes
export const STATUS_LABELS: Record<AchievementStatus, string> = {
  participated:         'Partecipato',
  pending_verification: 'In verifica',
  verified:             'Verificato',
  recognized:           'Riconosciuto',
};

export const STATUS_DESCRIPTION: Record<AchievementStatus, string> = {
  participated:
    'Hai partecipato. La verifica non è ancora avviata.',
  pending_verification:
    'La verifica è in corso con la fonte esterna. Ti verrà notificato al completamento.',
  verified:
    'Verificato da fonte esterna — questo elemento è pronto per il tuo Dynamic CV.',
  recognized:
    'Formalmente riconosciuto — il livello più alto. Pienamente condivisibile nel tuo Dynamic CV.',
};

export const VERIFICATION_LEVEL_LABELS: Record<AchievementVerificationLevel, string> = {
  external:      'Verifica esterna',
  partial:       'Verifica parziale',
  self_declared: 'Autodichiarato',
};

export const PILLAR_ACHIEVEMENT_LABELS: Record<AchievementPillar, string> = {
  LIFE:       'Benessere',
  GROWTH:     'Crescita',
  CONNECTION: 'Connessione',
  IMPACT:     'Impatto',
  LEGACY:     'Legacy',
};
