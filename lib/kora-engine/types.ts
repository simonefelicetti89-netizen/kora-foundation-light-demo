// Engine-layer types for upload, budget evidence, UEF pipeline, computed outputs, and premium modules.
// These types model the computed/real-data path — distinct from the seeded-demo types in lib/types/index.ts.
// Shared canonical types (PillarCode, CalibrationStatus, SafeguardStatus, etc.) are imported from there.

import type {
  PillarCode,
  CalibrationStatus,
  SafeguardStatus,
  EligibilityClass,
  IngestionSourceType,
} from '@/lib/types';

// ── Part 1 — Tenant / mode types ─────────────────────────────────────────────

// demo: running on synthetic seed — no real company data involved.
// real: pilot tenant with uploaded data — must never fall back to synthetic seed.
export type TenantType = 'demo' | 'real';

// synthetic_seed: values come from /data/synthetic/ seed files (demo only).
// uploaded_data: values come from a real company's guided upload.
// integration: future HRIS/LMS/welfare API integration (post-Gate 3).
export type DataMode = 'synthetic_seed' | 'uploaded_data' | 'integration';

// seeded_demo: KORA Index read from canonical seed output — not computed.
// computed: KORA Index computed from uploaded records via the engine.
// insufficient_data: data coverage too low to produce a reliable score — must surface Data Required.
export type ScoringMode = 'seeded_demo' | 'computed' | 'insufficient_data';

export interface TenantProfile {
  tenantId: string;
  companyName: string;
  type: TenantType;
  dataMode: DataMode;
  scoringMode: ScoringMode;
  workforceSize: number;
  sector: string;
  period: string;
  methodologyVersion: string;
  calibrationStatus: CalibrationStatus;
}

// ── Part 2 — Upload types ─────────────────────────────────────────────────────

export type UploadFileType = 'csv' | 'xlsx' | 'xls' | 'json';

export type UploadProcessingStatus =
  | 'pending'
  | 'processing'
  | 'complete'
  | 'failed'
  | 'review_required';

// guided_pilot: single-file guided upload for Foundation Light Pilot — primary mode.
// batch: multi-file batch upload — future SaaS mode.
export type UploadMode = 'guided_pilot' | 'batch';

export type DetectedRecordType =
  | 'welfare_program'
  | 'training'
  | 'budget'
  | 'hr_aggregate'
  | 'structural_policy'
  | 'unknown';

export type ValidationIssueSeverity = 'error' | 'warning' | 'info';

export type SensitiveRiskType =
  | 'health_data'
  | 'personal_identifiable'
  | 'financial_individual'
  | 'psychological'
  | 'other';

export type SensitiveSeverity = 'high' | 'medium' | 'low';

export type SensitiveRecommendedAction =
  | 'exclude'
  | 'aggregate_only'
  | 'pseudonymize'
  | 'review_required';

export interface UploadedFileBatch {
  batchId: string;
  tenantId: string;
  fileName: string;
  fileType: UploadFileType;
  uploadedAt: string;
  rowCount: number;
  columnCount: number;
  uploadMode: UploadMode;
  processingStatus: UploadProcessingStatus;
  sourceType: IngestionSourceType;
  warnings: string[];
}

export interface RawUploadedRecord {
  recordId: string;
  batchId: string;
  raw: Record<string, unknown>;
  rowIndex: number;
  sourceSheet?: string;
  detectedRecordType: DetectedRecordType;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;         // 0–1
  mappingReason: string;
  requiresReview: boolean;
}

export interface SensitiveColumnFlag {
  columnName: string;
  riskType: SensitiveRiskType;
  severity: SensitiveSeverity;
  reason: string;
  recommendedAction: SensitiveRecommendedAction;
  excludedByDefault: boolean;
}

export interface UploadValidationIssue {
  issueId: string;
  severity: ValidationIssueSeverity;
  field: string;
  message: string;
  recommendedAction: string;
}

// ── Part 3 — Budget Evidence model ───────────────────────────────────────────
//
// Principle: budget is not a valid economic claim without a source.
// If evidence is missing, the initiative can still be classified and activation signals
// analysed — but the economic component enters BTI only as declared or estimated
// with explicit confidence, or is excluded entirely.

// Five-tier evidence ladder: L0 (nothing) → L4 (third-party verified).
// L0 and L1 never receive full BTI weight.
export type BudgetEvidenceLevel =
  | 'L0_NO_EVIDENCE'
  | 'L1_SELF_DECLARED'
  | 'L2_INTERNAL_DOCUMENT'
  | 'L3_THIRD_PARTY_DOCUMENT'
  | 'L4_VERIFIED_EVIDENCE';

export type BudgetStatus =
  | 'documented'
  | 'declared'
  | 'estimated'
  | 'not_available'
  | 'not_applicable';

export type BudgetEvidenceType =
  | 'invoice'
  | 'contract'
  | 'purchase_order'
  | 'welfare_provider_export'
  | 'lms_export'
  | 'internal_budget_report'
  | 'payroll_aggregate'
  | 'hr_estimate'
  | 'self_declared'
  | 'not_available'
  | 'not_applicable';

export type BTITreatment =
  | 'full_weight'
  | 'confidence_weighted'
  | 'tracked_only'
  | 'excluded_from_bti'
  | 'not_applicable';

export interface BudgetEvidence {
  amount: number | null;
  currency: string;
  status: BudgetStatus;
  evidenceLevel: BudgetEvidenceLevel;
  evidenceType: BudgetEvidenceType;
  source: string;
  confidence: number;         // 0–1
  usedInBTI: boolean;
  btiTreatment: BTITreatment;
  estimationMethod?: string;
  notes?: string;
}

// ── Part 4 — UEF / normalized record types ────────────────────────────────────

// Pillar is an alias for PillarCode — engine layer uses this for clarity.
export type Pillar = PillarCode;

// Extends EligibilityClass ('eligible' | 'limited' | 'blocked') with 'review_required'
// for records that cannot yet be classified by the automated pipeline.
export type EligibilityStatus = EligibilityClass | 'review_required';

export type RecordType =
  | 'event'
  | 'program'
  | 'policy'
  | 'structural_policy'
  | 'budget_line';

export type UEFReviewStatus = 'pending' | 'approved' | 'flagged' | 'rejected';

export type ImpactTreatment =
  | 'generates_iu'
  | 'bti_only'
  | 'excluded'
  | 'pending_review';

export type BudgetTreatmentSuggestion =
  | 'include_in_bti'
  | 'exclude_from_bti'
  | 'partial_inclusion'
  | 'review_required';

export interface NormalizedUEFRecord {
  uefId: string;
  tenantId: string;
  sourceRecordId: string;
  eventName: string;
  description: string;
  category: string;
  provider?: string;
  periodStart: string;
  periodEnd: string;
  participants: number | null;
  eligiblePopulation: number | null;
  workforcePopulation: number;
  mandatory: boolean;
  evidenceType: BudgetEvidenceType;
  budgetEvidence: BudgetEvidence | null;
  department?: string;
  site?: string;
  recordType: RecordType;
  sourceSystem: IngestionSourceType;
  confidence: number;         // 0–1
  reviewStatus: UEFReviewStatus;
}

export interface EligibilityResult {
  recordId: string;
  status: EligibilityStatus;
  reason: string;
  doctrineReference: string;
  confidence: number;         // 0–1
  impactTreatment: ImpactTreatment;
  budgetTreatmentSuggestion: BudgetTreatmentSuggestion;
  reviewRequired: boolean;
}

export interface PillarMappingResult {
  recordId: string;
  primaryPillar: Pillar;
  secondaryPillars: Pillar[];
  confidence: number;         // 0–1
  rationale: string;
  mappingSignals: string[];
  reviewRequired: boolean;
}

export interface ImpactUnitResult {
  recordId: string;
  eligibleForIU: boolean;
  iuEstimate: number | null;
  confidence: number;         // 0–1
  rationale: string;
  capped: boolean;
  capReason?: string;
}

// ── Part 5 — Engine output types ─────────────────────────────────────────────

// Defined first because BTIResult.trace and KoraComputationResult.explainabilityTrace reference it.
export interface ExplainabilityTraceItem {
  id: string;
  stage: string;
  input: string;
  output: string;
  ruleApplied: string;
  confidence: number;         // 0–1
  warning?: string;
  source: string;
}

export interface BTIResult {
  totalBudget: number;
  documentedBudget: number;
  declaredBudget: number;
  estimatedBudget: number;
  nonValuedBudget: number;
  deepActivationSpend: number;
  economicReliefSpend: number;
  blockedComplianceSpend: number;
  activationDebt: number;
  budgetEvidenceQuality: number;  // 0–1
  btiScore: number;               // 0–100
  warnings: string[];
  trace: ExplainabilityTraceItem[];
}

export interface ActivationResult {
  activationReach: number;            // 0–1 (AR)
  meaningfulActivationReach: number;  // 0–1 (MAR)
  activeWorkers: number;
  meaningfullyActiveWorkers: number;
  neverActivatedWorkers: number;
  concentrationTopShare: number;      // share of total IU held by top decile
  bottomFiftyShare: number;           // share of total IU held by bottom 50%
  departmentGaps: Record<string, number>;
  siteGaps: Record<string, number>;
  safeguardStatus: SafeguardStatus;
  warnings: string[];
}

export interface KoraIndexMacroblocks {
  activationReach: number;      // 0–100
  activationQuality: number;    // 0–100
  distributionEquity: number;   // 0–100
  budgetToHumanImpact: number;  // 0–100
}

export interface KoraIndexResult {
  value: number;                  // 0–100
  macroblocks: KoraIndexMacroblocks;
  weights: Record<string, number>;
  methodologyVersion: string;
  calibrationStatus: CalibrationStatus;
  productionReady: false;
  confidenceExternal: number;    // 0–100 — shown alongside, never aggregated into value
  warnings: string[];
}

export interface ConfidenceResult {
  score: number;                     // 0–100
  mappingConfidence: number;         // 0–1
  budgetEvidenceConfidence: number;  // 0–1
  dataCompleteness: number;          // 0–1
  verificationConfidence: number;    // 0–1
  reviewConfidence: number;          // 0–1
  externalToIndex: true;
  warnings: string[];
}

export interface EligibilitySummary {
  eligibleCount: number;
  limitedCount: number;
  blockedCount: number;
  reviewRequiredCount: number;
  totalCount: number;
}

export interface KoraComputationResult {
  tenantId: string;
  batchId: string;
  scoringMode: ScoringMode;
  eligibilitySummary: EligibilitySummary;
  pillarDistribution: Record<Pillar, number>;
  bti: BTIResult;
  activation: ActivationResult;
  koraIndex: KoraIndexResult;
  confidence: ConfidenceResult;
  explainabilityTrace: ExplainabilityTraceItem[];
  warnings: string[];
  createdAt: string;
}

// ── Part 6 — HR KPI types ─────────────────────────────────────────────────────
//
// Rules: aggregate only — no individual HR data.
// Every correlation output must include "correlazione ≠ causalità".
// HRKpiCorrelationPreview requires at least 2 periods; fewer returns 'insufficient_data'.

export interface HRKpiAggregateRecord {
  period: string;
  department?: string;
  site?: string;
  // All rates are 0–1 shares; scores are 0–100 unless noted.
  turnoverRate?: number;
  absenteeismRate?: number;
  engagementScore?: number;
  retentionRate?: number;
  internalMobilityRate?: number;
  trainingCompletionRate?: number;
  trainingHours?: number;
  safetyNearMissRate?: number;
  wellbeingSurveyScore?: number;
  source: string;
  confidence: number;           // 0–1
}

export type CorrelationDirection = 'positive' | 'negative' | 'neutral' | 'insufficient_data';
export type CorrelationStrength = 'strong' | 'moderate' | 'weak' | 'insufficient_data';
export type CorrelationEvidenceStatus = 'directional' | 'preliminary' | 'insufficient_data';

export interface HRKpiCorrelationPreview {
  kpiName: string;
  relatedKoraSignal: string;
  direction: CorrelationDirection;
  strength: CorrelationStrength;
  evidenceStatus: CorrelationEvidenceStatus;
  message: string;
  caution: string;              // must reference "correlazione ≠ causalità"
  periodsAvailable: number;
}

// ── Part 7 — Premium module signal types ──────────────────────────────────────
//
// Care Economy: near-term premium pilot module — aggregate signals only.
// Future Readiness: preview / pilot roadmap — no production engine.
// Mental Capital Infrastructure: infrastructure-only — never individual mental health measurement.
// No individual profiling in any of the three modules.

export interface CareEconomySignal {
  childcareSupport: boolean;
  caregiverSupport: boolean;
  eldercareSupport: boolean;
  familySupport: boolean;
  summerCampSupport: boolean;
  flexibleWorkForCare: boolean;
  accessEquity: number | null;               // 0–1, null if data unavailable
  actualUsage: number | null;                // 0–1, aggregate only, N≥10 enforced
  budgetEvidenceQuality: number;             // 0–1
  careActivationScorePreview: number | null; // 0–100, preview only — not production score
  warnings: string[];
}

export interface FutureReadinessSignal {
  skillTransformation: number | null;       // 0–1
  accessEquity: number | null;              // 0–1
  learningContinuity: number | null;        // 0–1
  transitionPathways: boolean;
  humanInvestmentBalance: number | null;    // 0–1
  verifiedBehaviorChange: boolean;
  previewScore: number | null;              // 0–100, preview only — not production score
  warnings: string[];
}

export interface MentalCapitalInfrastructureSignal {
  servicesAvailable: string[];
  aggregatedUtilization: number | null;     // 0–1, aggregate only, N≥10 enforced — never individual
  continuity: boolean;
  accessibility: number | null;             // 0–1
  providerQuality: 'verified' | 'declared' | 'unknown';
  reach: number | null;                     // share of workforce with access
  equity: number | null;                    // 0–1
  depthOfPathway: 'deep' | 'moderate' | 'surface' | 'none';
  privacyBoundary: string;                  // non-suppressible: must be shown alongside this signal
  warnings: string[];
}
