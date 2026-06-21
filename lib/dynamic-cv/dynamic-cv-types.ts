// lib/dynamic-cv/dynamic-cv-types.ts
// Type contracts for the Dynamic Impact CV eligibility and shareability model.
//
// PIB = private personal interpretation of impact journey (never shareable to employer).
// Dynamic Impact CV = selective, worker-controlled, portable impact profile.
// Dynamic CV must NOT be a dump of all Impact Units.
//
// Non-suppressible invariants:
//   shareableByWorker is always false by default — requires explicit worker action.
//   Employer roles have zero access to any DynamicCVItem (privacy invariant).

export type DynamicCVClass =
  | 'cv_eligible'        // may appear in private Dynamic Impact CV
  | 'badge_eligible'     // may generate a badge or credential (subset of cv_eligible)
  | 'shareable_by_worker'// worker may choose to share externally (requires explicit action)
  | 'private_only'       // private CV/PIB only — not suggested for external sharing
  | 'sensitive_excluded' // must not appear in Dynamic CV or badges (health, caregiver, etc.)
  | 'not_cv_relevant';   // compliance baseline, economic relief — excluded by design

export interface DynamicCVClassification {
  cvClass:          DynamicCVClass;
  cvEligible:       boolean;
  badgeEligible:    boolean;
  shareableByWorker: boolean; // always false by default; requires explicit worker action
  privateOnly:      boolean;
  sensitiveExcluded: boolean;
  requiresReview:   boolean;
  reason:           string;   // Italian-first canonical explanation
}

export type CredentialLevel =
  | 'self_declared'
  | 'company_verified'
  | 'kora_verified'
  | 'partner_verified';

export type EvidenceLevel = 'low' | 'medium' | 'high';

export type VerificationStatus = 'not_verified' | 'verified' | 'revoked' | 'expired';

export type SharingStatus =
  | 'private'
  | 'worker_selected'
  | 'public_link_created'
  | 'exported'
  | 'revoked';

export interface WorkerCVControls {
  canAddToCV:         boolean;
  canHideFromCV:      boolean;
  canRequestBadge:    boolean;
  canCreatePublicLink: boolean; // always false until feature is live
  canRevokePublicLink: boolean; // always false until feature is live
  canExportPDF:       boolean;  // always false until feature is live
  canShareToLinkedIn: boolean;  // always false until feature is live
}

export interface EnrichedDynamicCVItem {
  id:               string;
  initiativeName:   string;
  pillar:           string;
  category:         string;
  date?:            string;
  reportingPeriod?: string;
  iuValue?:         number;
  contributionLevel?: 'high' | 'medium' | 'low';
  cvClassification: DynamicCVClassification;
  credentialLevel:  CredentialLevel;
  evidenceLevel:    EvidenceLevel;
  verificationStatus: VerificationStatus;
  sharingStatus:    SharingStatus;
  workerControls:   WorkerCVControls;
  isSyntheticDemo?: boolean;
}
