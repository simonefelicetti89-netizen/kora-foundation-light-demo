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
// CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 24 files / 36 import statements
// (counted by tests/unit/cc002-i9-synthetic-import-guard.test.ts itself —
// the numbers above are a snapshot for human readability, not the source of
// truth; the test always recomputes the live count and fails if the
// allowlist below and the live scan disagree).
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
  { file: 'services/commons/CommonsService.ts', reason: 'Commons demo-seeded initiatives (live DB path also exists, coexists).' },
  { file: 'services/company-data-intake/CompanyDataIntakeService.ts', reason: 'Company raw-data batch/row intake demo seed (fiscal plans, batches, rows).' },
  { file: 'services/company-onboarding/CompanyOnboardingService.ts', reason: 'Demo onboarding flow seed data.' },
  { file: 'services/demo-data/DemoDataService.ts', reason: 'Central synthetic seed reader — companies, departments/sites, programs, aggregates. Master Plan §32: scheduled for removal at end of B-TRUTH.' },
  { file: 'services/eligibility-gate/EligibilityGateService.ts', reason: 'Taxonomy/preprocessing classifier reads synthetic action taxonomy.' },
  { file: 'services/explainability/ExplainabilityService.ts', reason: 'Reads synthetic explainability records for demo formula traces.' },
  { file: 'services/financial-governance/FinancialGovernanceService.ts', reason: 'Informational-only financial governance demo data.' },
  { file: 'services/founder-validation/FounderValidationService.ts', reason: 'Internal/admin-only founder validation leads seed.' },
  { file: 'services/ingestion-pipeline/IngestionPipelineService.ts', reason: 'Demo ingestion pipeline reads synthetic ingestion samples.' },
  { file: 'services/ingestion-simulator/IngestionSimulatorService.ts', reason: 'Rule-based BCM classifier demo path — source batches + ingestion samples.' },
  { file: 'services/kora-contribution/KoraContributionService.ts', reason: 'KORA Contribution computation reads synthetic contribution outputs + collective initiatives.' },
  { file: 'services/report-factory/ReportFactoryService.ts', reason: 'Reads synthetic Decision Pack version seed alongside live orchestration.' },
  { file: 'services/scoring-simulator/ScoringSimulatorService.ts', reason: 'Demo scoring path — KORA Index outputs, company aggregates, confidence records. Master Plan §32: scheduled for removal at end of B-TRUTH.' },
  { file: 'services/tenant/TenantService.ts', reason: 'Reads synthetic tenant records for the demo tenant list.' },
  { file: 'services/worker-achievements/WorkerAchievementService.ts', reason: 'Worker-private demo achievements seed.' },
  { file: 'services/worker-provisioning/WorkerProvisioningService.ts', reason: 'Demo worker roster seed for provisioning flows.' },
  { file: 'services/workforce-baseline/WorkforceBaselineService.ts', reason: 'Baseline workforce metrics demo seed.' },
];
