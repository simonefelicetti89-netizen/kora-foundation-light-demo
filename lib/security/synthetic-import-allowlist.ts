// lib/security/synthetic-import-allowlist.ts
// CC-002 / B-INV — Constitutional Invariant I9: synthetic import allowlist.
//
// This is a TEMPORARY, READABLE inventory of every file under app/, services/,
// lib/, components/ that currently imports from `data/synthetic/**` at
// runtime. It is not a new architecture layer — just a flat, explicit list
// that (a) makes the current count visible and (b) lets
// tests/unit/cc002-i9-synthetic-import-guard.test.ts fail the moment a NEW,
// non-allowlisted runtime import of synthetic data appears anywhere in the
// scanned directories.
//
// CC-002 does NOT reduce this list. B-TRUTH (Master Plan §19/§28, day 17-19,
// "finestra esclusiva") migrates the demo path onto the live pipeline file by
// file and is expected to bring this count to 0, after which this allowlist
// (and its guard test) should be deleted entirely — not emptied and kept.
//
// CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 23 files / 35 import statements
// (counted by tests/unit/cc002-i9-synthetic-import-guard.test.ts itself —
// the numbers above are a snapshot for human readability, not the source of
// truth; the test always recomputes the live count and fails if the
// allowlist below and the live scan disagree).
//
// CC-052 — Retire Commons Synthetic Discovery Path (2026-08-31): removed
// services/commons/CommonsService.ts's synthetic class (getInitiatives,
// getFeaturedInitiatives, getByPillar/getByType already removed earlier
// this same day, getNetworkStats) and its sole import of
// data/synthetic/commons-initiatives.json (file deleted). Master Plan §13's
// "due percorsi di scoperta nello stesso servizio" defect is resolved: the
// file now contains only the live getPublishedInitiatives/
// getPublishedInitiativesAdmin path. The two remaining runtime callers
// (app/commons/page.tsx, app/my-kora/page.tsx's Commons widget) were
// migrated onto canonical live discovery (commons.post via RLS, tenant
// company_name/industry_code join, commons.booking_aggregate_for_promoter()
// for participant counts) — no schema change was required. First genuine
// I9 reduction since the BTI/orphan-chain retirements: 24->23 files
// (36->35 imports).
//
// CC-020A — Company Intelligence Capability Retirement, NARROWED (2026-08-31):
// removed services/company-intelligence/CompanyIntelligenceService.ts (0
// direct synthetic-data imports; not itself an allowlist entry) as an
// explicit, capability-level founder decision (obsolete-capability
// retirement, not a live migration — see lib/architecture/registry.ts
// svc.company-intelligence for the full record). A same-day first pass
// ALSO deleted services/company-onboarding/CompanyOnboardingService.ts,
// reasoning it was a pure second-order orphan of CompanyIntelligenceService.
// That was WRONG and has been reverted: CompanyOnboardingService is a
// Master-Plan-anchored competing implementation of svc.company-setup
// (§33 keeps company-setup permanently INVESTIGATE by name) — deleting it
// would have silently resolved a decision the Master Plan has not made.
// Restored, along with its sole seed file, data/synthetic/company-onboarding.json.
// tenantService, companyDataIntakeService, workerProvisioningService, and
// scoringSimulatorService — CompanyIntelligenceService's other 4 former
// dependencies — all retain other confirmed callers and were untouched
// throughout. Net I9 effect of this corrected slice: NONE — still 24
// files, 36 imports (CompanyIntelligenceService.ts was never itself an
// allowlist entry, so its retirement alone never moved this count).
//
// B-TRUTH Ingestion/UEF Classification (2026-08-31): a follow-on retirement
// attempt (feature/b-truth-retire-ingestion-uef) for
// services/ingestion-pipeline/IngestionPipelineService.ts and
// services/uef-review/UEFReviewService.ts was STOPPED after finding
// tests/unit/demo-guard-01-kora-index-evidence-fallback.test.ts — a
// pre-existing, deliberately authored, currently-passing regression guard
// that explicitly protects this chain as an isolated demo/preview data
// source (DynamicScoringPreviewService, ReportGeneratorService) while
// proving the live UEF path (analytics.uef_record) never falls back to it.
// Classification: DEMO_RUNTIME, not RETIRE. No files deleted, no imports
// changed — this pass corrected stale CANONICAL status/caller-count notes
// in lib/architecture/registry.ts and this file's reason text only. Count
// unchanged: still 24 files / 36 imports. Invariant recorded: LIVE MUST
// NEVER FALL BACK TO DEMO UEF DATA.
//
// B-TRUTH Retire Orphan Synthetic BTI Chain (2026-08-31): removed
// services/budget-to-human-impact/BudgetToHumanImpactService.ts (and its
// sole seed file, data/synthetic/budget-to-human-impact.json) — its 3
// remaining callers (DynamicScoringPreviewService, ReportGeneratorService,
// CompanyIntelligenceService) were each confirmed to have zero reachable
// callers from any app/ entry point, and the real BTI path
// (analytics.bti_result, read directly by the Gen 3 workspace API) was
// already live and verified. First genuine I9 reduction since Root Control
// Room Wave 2 (26->25); this pass: 25->24 files, 37->36 imports.
//
// CC-018 / B-TRUTH SEED GROUP #1 (2026-08-30): removed
// services/worker-pillar-adoption/WorkerPillarAdoptionService.ts — company
// pillar distribution now reads analytics.activation_result.pillar_distribution
// (live) instead of data/synthetic/company-aggregates.json. First seed-group
// migration under B-TRUTH; 25 groups remain (CC-019–023).
//
// B-TRUTH Root Control Room Wave 2 (2026-08-30): removed
// services/lifecycle/LifecycleService.ts (and data/synthetic/lifecycle-audit.json,
// its only consumer) — its sole runtime caller (Root Control Room Section J)
// was retired; Lifecycle/Audit now reads real audit.audit_log, tenant-scoped,
// on the Gen 3 workspace tab instead. Zero remaining runtime callers, live
// migration verified complete — deleted per Master Plan §32's own rule that a
// synthetic path may be removed once its live migration is complete and
// verified (not before).
//
// Each entry's `reason` records WHY the import exists today, for B-TRUTH
// triage — not a judgment that it should stay.

export interface SyntheticImportAllowlistEntry {
  file: string;
  reason: string;
}

export const SYNTHETIC_IMPORT_ALLOWLIST: SyntheticImportAllowlistEntry[] = [
  { file: 'app/page.tsx', reason: 'Public marketing landing page — displays canonical S1/Meridiana example numbers, outside /demo namespace.' },
  { file: 'app/demo/page.tsx', reason: 'Demo entry surface — reads pre-computed S1 KORA Index output.' },
  { file: 'app/demo/gtm/page.tsx', reason: 'Demo GTM surface — reads pre-computed KORA Index output for pitch numbers.' },
  { file: 'components/demo/DemoGuideContent.tsx', reason: 'Demo guide component — reads pre-computed KORA Index output.' },
  { file: 'services/account/AccountProvisioningService.ts', reason: 'Demo account registry — reads synthetic user accounts.' },
  { file: 'services/activation-safeguard/ActivationSafeguardService.ts', reason: 'Reads pre-computed synthetic Activation Safeguard results (demo scoring path).' },
  { file: 'services/admin-preview/AdminPreviewService.ts', reason: 'Admin demo preview shaping — companies, KORA Index outputs, source batches.' },
  { file: 'services/company-data-intake/CompanyDataIntakeService.ts', reason: 'Company raw-data batch/row intake demo seed (fiscal plans, batches, rows).' },
  { file: 'services/company-onboarding/CompanyOnboardingService.ts', reason: 'CC-020A (2026-08-31, narrowed): restored after an incorrect same-day deletion. Remains an explicitly unresolved competing implementation of svc.company-setup (Master Plan §33 keeps company-setup permanently INVESTIGATE) — retirement would have silently resolved a decision the Master Plan has not made. See lib/architecture/registry.ts svc.company-onboarding.' },
  { file: 'services/demo-data/DemoDataService.ts', reason: 'Central synthetic seed reader — companies, departments/sites, programs, aggregates. Master Plan §32: scheduled for removal at end of B-TRUTH.' },
  { file: 'services/eligibility-gate/EligibilityGateService.ts', reason: 'Taxonomy/preprocessing classifier reads synthetic action taxonomy.' },
  { file: 'services/explainability/ExplainabilityService.ts', reason: 'Reads synthetic explainability records for demo formula traces.' },
  { file: 'services/financial-governance/FinancialGovernanceService.ts', reason: 'Informational-only financial governance demo data.' },
  { file: 'services/founder-validation/FounderValidationService.ts', reason: 'Internal/admin-only founder validation leads seed.' },
  { file: 'services/ingestion-pipeline/IngestionPipelineService.ts', reason: 'B-TRUTH Ingestion/UEF Classification (2026-08-31): DEMO_RUNTIME, not RETIRE. Isolated demo ingestion pipeline feeding the demo UEF review path only (svc.uef-review); the live UEF path (analytics.uef_record, lib/kora-engine/run-kora-pipeline.ts) never falls back to this data. Deliberately kept per tests/unit/demo-guard-01-kora-index-evidence-fallback.test.ts. See lib/architecture/registry.ts svc.ingestion-pipeline / svc.uef-review.' },
  { file: 'services/ingestion-simulator/IngestionSimulatorService.ts', reason: 'Rule-based BCM classifier demo path — source batches + ingestion samples.' },
  { file: 'services/kora-contribution/KoraContributionService.ts', reason: 'KORA Contribution computation reads synthetic contribution outputs + collective initiatives.' },
  { file: 'services/report-factory/ReportFactoryService.ts', reason: 'Reads synthetic Decision Pack version seed alongside live orchestration.' },
  { file: 'services/scoring-simulator/ScoringSimulatorService.ts', reason: 'Demo scoring path — KORA Index outputs, company aggregates, confidence records. Master Plan §32: scheduled for removal at end of B-TRUTH.' },
  { file: 'services/tenant/TenantService.ts', reason: 'Reads synthetic tenant records for the demo tenant list.' },
  { file: 'services/worker-achievements/WorkerAchievementService.ts', reason: 'Worker-private demo achievements seed.' },
  { file: 'services/worker-provisioning/WorkerProvisioningService.ts', reason: 'Demo worker roster seed for provisioning flows.' },
  { file: 'services/workforce-baseline/WorkforceBaselineService.ts', reason: 'Baseline workforce metrics demo seed.' },
];
