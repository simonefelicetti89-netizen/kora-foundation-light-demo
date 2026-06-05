// Engine-layer types for upload, budget evidence, UEF pipeline, computed outputs, and premium modules.
// These types model the computed/real-data path — distinct from the seeded-demo types in lib/types/index.ts.
// Shared canonical types (PillarCode, CalibrationStatus, SafeguardStatus, etc.) are imported from there.

import type {
  PillarCode,
  CalibrationStatus,
  SafeguardStatus,
  EligibilityClass,
  IngestionSourceType,
  ImpactUnitComputationResult,
  ImpactUnitComputationSummary,
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
  primaryPillar: Pillar | null;   // null for blocked records or when no signal found
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

// Extended component detail — produced by computeKoraIndex and used by persistence.
// Contains WB and EQ values (computed inside computeKoraIndex) alongside
// the NI/VR/CO signals passed in from the pipeline.
export interface ComponentDetail {
  ni: number; niStatus: ComponentStatus;
  vr: number; vrStatus: ComponentStatus;
  co: number; coStatus: ComponentStatus;
  wb: number; wbStatus: ComponentStatus;
  eq: number; eqStatus: ComponentStatus;
  pc: number; pcStatus: ComponentStatus;
  pb: number; pbStatus: ComponentStatus;
  // Effective macroblock weights after dynamic rebalancing (may differ when
  // some components are insufficient_data)
  qualityWeightsUsed: { ni: number; vr: number; co: number };
  equityWeightsUsed:  { wb: number; pc: number; pb: number; eq: number };
}

export interface KoraIndexResult {
  value: number;                  // 0–100
  macroblocks: KoraIndexMacroblocks;
  weights: Record<string, number>;
  methodologyVersion: string;
  calibrationStatus: CalibrationStatus;
  productionReady: false;
  confidenceExternal: number;    // 0–100 — shown alongside, never aggregated into value
  componentDetail?: ComponentDetail; // v1.0: per-component values for persistence
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

// B24: ReachSemanticsResult — board-safe AR/MAR separation (explanatory, not KORA Index input).
export interface ReachSemanticsResult {
  activationRate: number | null;
  meaningfulActivationRate: number | null;
  economicReliefReach: number | null;
  complianceBaselineReach: number | null;
  deepActivationReach: null;
  reliefGapPct: number | null;
  reliefGapWarning: boolean;
  explanatoryFlags: string[];
  caveat: string;
}

// ── ComponentSignals — v1.0 methodology component computation results ─────────
// Computed inside runKoraPipeline from approved records + activation result.
// NI, VR, CO require record-level evidence/participant data.
// WB and EQ are derived inside computeKoraIndex from the activation result.
//
// Status 'insufficient_data' means the computation was not possible
// (e.g., no eligible records, no participant data, no segment data).
// In that case value = 0 and the component is excluded from macroblock computation.
// NEVER use arbitrary placeholder values (0.5, 0.0) as stand-ins for missing data.

export type ComponentStatus = 'computed' | 'insufficient_data';

export interface ComponentSignals {
  // NI — Activation Evidence Intensity
  // = Σ(participants × evidenceWeight) / Σ(participants), eligible records only
  // evidenceWeight: L0=0.25, L1=0.50, L2=0.75, L3=1.00
  ni: number;
  niStatus: ComponentStatus;
  niSourceRecords: number;        // number of eligible records contributing to NI

  // VR — Verification Rate
  // = Σ(participants × [evidenceLevel ≥ L2]) / Σ(participants), eligible records only
  vr: number;
  vrStatus: ComponentStatus;
  vrSourceRecords: number;        // number of eligible records contributing to VR

  // CO — Program Continuity (v0.1 proxy: program recurrence share)
  // = recurringEligiblePrograms / totalEligiblePrograms
  // v0.1: measures structural/ongoing program presence, NOT cross-period worker retention
  co: number;
  coStatus: ComponentStatus;
  coRecurringPrograms: number;    // count of recurring-classified eligible programs
  coTotalPrograms: number;        // total eligible programs evaluated

  // WB and EQ are computed inside computeKoraIndex from activation result.
  // They are returned in KoraIndexResult.componentDetail for persistence.
}

// ── PIB Types — Stage 11 of the 14-stage algorithm ────────────────────────────
//
// PIB (Personal Impact Balance) is the mandatory intermediate layer before the
// KORA Index. AG-01 canonical rule (doc 10 §26): every KORA Index calculation
// must pass through individual PIBs.
//
// Foundation Light v0.1 constraint:
//   UEF records are program-level aggregates (not per-worker).
//   PIBSnapshot[] (individual PIBs) requires per-worker UEF records — not
//   available in the Foundation Light aggregate upload model.
//   CompanyPIBAggregation uses estimationBasis='aggregate_estimate' in v0.1.
//   Individual PIBs become available in Pilot+ when My KORA participation
//   confirmation or individual provider exports are active.

export type PIBEstimationBasis = 'individual_pib' | 'aggregate_estimate';

// Per-worker PIB snapshot — never employer-visible (AG-01 / D-04).
// Foundation Light v0.1: not computed (aggregate model). Future My KORA consumer.
export interface PIBSnapshot {
  workerPseudonymId: string;  // pseudonymized — never employer-visible
  period: string;
  totalPIB: number;
  lifePIB: number;
  growthPIB: number;
  connectionPIB: number;
  impactPIB: number;
  legacyPIB: number;
  impactUnitCount: number;
  initiativeCount: number;
}

// Company-level PIB aggregate — privacy-safe output for KORA Index Engine.
// Employer-facing. Never includes workerPseudonymId or individual PIBs.
export interface CompanyPIBAggregation {
  period: string;
  workforceCount: number;
  activatedWorkers: number;           // workers estimated to have PIB > 0
  meaningfulWorkers: number;          // workers estimated to have meaningful PIB (L2+ evidence)
  estimatedAR: number;                // 0–1 — upper-bound aggregate estimate
  estimatedMAR: number;               // 0–1 — upper-bound aggregate estimate
  totalIU: number;
  avgEstimatedPIB: number;            // totalIU / activatedWorkers (or 0 if none)
  pillarTotals: Record<Pillar, number>;
  pillarShares: Record<Pillar, number>;   // 0–1 shares summing to 1
  // WB Gini coefficient — null in aggregate model (requires individual PIB distribution).
  // Available in Pilot+ when individual PIBSnapshots are computed.
  wbEstimate: number | null;
  pibSnapshotsAvailable: boolean;
  estimationBasis: PIBEstimationBasis;
  estimationNote: string;
  calibrationStatus: 'pre_empirical_calibration';
  methodologyVersion: string;
  warnings: string[];
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
  componentSignals: ComponentSignals;  // v1.0: NI, VR, CO pre-computed signals
  explainabilityTrace: ExplainabilityTraceItem[];
  reachSemantics?: ReachSemanticsResult;  // B24: optional — present when records available
  // B62-B: Impact Units™ trace layer — Stage 10 of the 14-stage algorithm.
  // iuSummary: aggregate view safe for company-level display.
  // iuResults: per-record results with factor traces — server-side only, never returned to employer-facing API responses.
  iuSummary?: ImpactUnitComputationSummary;
  iuResults?: ImpactUnitComputationResult[];
  // B63-B: PIB Aggregation — Stage 11 of the 14-stage algorithm (AG-01 compliance).
  // Mandatory intermediate layer between IU and KORA Index.
  // estimationBasis='aggregate_estimate' in Foundation Light v0.1 (program-level UEF records).
  pibAggregation?: CompanyPIBAggregation;
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
  careActivationScorePreview: number | null; // 0–100, preview only — not production score; null at record level
  detectedCareTags: string[];                // care tag codes detected for this record
  reachSignals: string[];                    // text signals indicating population reach
  accessEquitySignals: string[];             // text signals indicating equitable access
  privacyBoundary: string;                   // non-suppressible privacy statement
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

// ── Part 8 — Event perimeter types (Sprint 12A) ───────────────────────────────
//
// These types encode the company-enabled perimeter doctrine:
// KORA measures how company-provided funds and initiatives are activated by workers.
// Worker-private activity outside the company-enabled perimeter is out of scope.

// Source of a company event entering the KORA pipeline.
// company_upload: primary source in Foundation Light Pilot — Excel/CSV from company.
// provider_export: supplemental welfare/LMS export from provider — optional in Foundation Light.
// partner_verification: direct service confirmation from partner — not available in Foundation Light Pilot.
// worker_confirmation: participation confirmed by worker via My KORA — out of scope in Foundation Light Pilot.
// kora_advisor_review: classification or correction by certified KORA advisor.
export type EventDataSource =
  | 'company_upload'
  | 'provider_export'
  | 'partner_verification'
  | 'worker_confirmation'
  | 'kora_advisor_review';

// Perimeter classification: whether an event is company-enabled or outside KORA scope.
// company_enabled: financed or enabled by the company — eligible for KORA Index contribution.
// provider_verified_company_enabled: delivered by external provider, enabled and financed by company.
// worker_confirmed_company_enabled: participation confirmed by worker on a company-enabled initiative.
// worker_private_out_of_scope: private worker activity not enabled by company — excluded from all computation.
// blocked_compliance: mandatory legal obligation (D.Lgs 81/08, GDPR, DVR, DPI) — excluded by design, not penalized.
export type EventPerimeter =
  | 'company_enabled'
  | 'provider_verified_company_enabled'
  | 'worker_confirmed_company_enabled'
  | 'worker_private_out_of_scope'
  | 'blocked_compliance';

// Whether an event contributes to KORA Index computation, BTI tracking only, or is excluded.
export type EventContributionScope =
  | 'contributes_to_index'      // Eligible events — generate IU, enter all four macroblocks
  | 'bti_tracked_only'          // Limited events (economic relief) — tracked in BTI engine, 0 IU
  | 'excluded_by_design'        // Blocked events — compliance obligations, 0 contribution
  | 'out_of_perimeter'          // Worker-private events — outside company-enabled scope
  | 'insufficient_evidence';    // Evidence too weak to determine contribution scope

// ── Part 9 — Reach Quality types (Sprint 12B) ─────────────────────────────────
//
// ReachQualityResult models how the Activation Engine estimates unique worker reach
// from aggregate participation data (no individual records in Foundation Light v0).
// Identity keys are used only for counting — never returned in any output.

// Method used to estimate unique worker reach.
// identity_deduplication: union-find alias resolution across wid/email/nome+cognome — count only, signals never returned.
// aggregate_unique: single record with explicit unique participant count (partecipanti_unici etc.) — treated as verified.
// aggregate_unique_bounded: multiple records with unique counts — conservative estimate using auFactor to correct overlap.
// bounded_estimate: conservative interval [lb, ub] from participation counts and category/site diversity.
// none: insufficient data — reach cannot be estimated.
export type ReachMethod =
  | 'identity_deduplication'
  | 'aggregate_unique'
  | 'aggregate_unique_bounded'
  | 'bounded_estimate'
  | 'none';

// Risk of overcounting unique workers in the reach estimate.
export type OvercountRisk = 'low' | 'medium' | 'high' | 'unknown';

export interface ReachQualityResult {
  method: ReachMethod;
  lowerBound: number;
  upperBound: number;
  // Conservative point estimate used for activation reach preview in Foundation Light v0.
  // For bounded_estimate: lb + (ub − lb) × conservativeFactor.
  // For identity_deduplication and aggregate_unique: equals both bounds.
  selectedReachForPreview: number;
  overcountRisk: OvercountRisk;
  conservativeFactor: number;  // 0 for non-bounded methods; 0.25–0.50 for bounded_estimate; 0.25–0.50 for aggregate_unique_bounded (auFactor)
  rationale: string;
}
