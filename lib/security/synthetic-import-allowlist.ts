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
// CC-00 Bucket C cleanup (2026-09-05): app/demo/page.tsx and
// services/founder-validation/FounderValidationService.ts both removed
// from this allowlist entirely (8->6 files, 13->11 imports) — the only two
// I9 residuals independent of both the final-scoring cluster (Bucket A:
// ScoringSimulatorService, DemoDataService, ActivationSafeguardService) and
// the worker/My-KORA cluster (Bucket B: WorkerProvisioningService,
// WorkerAchievementService, AccountProvisioningService), per the CC-00
// Closure Decision Gate's own bucket analysis. app/demo/page.tsx's
// "Scenari dimostrativi" section (two named companies with a specific
// claimed KORA Index/Confidence Score/Safeguard result — one real-seed-backed,
// one entirely fabricated) is replaced with the same real, static,
// canonical schematic pattern app/page.tsx already established (real 0–100
// scale, real Safeguard states, real macroblock weights — no company name,
// no claimed result). FounderValidationService.ts's
// data/synthetic/founder-validation-leads.json (5 fictional companies,
// created once in the original B96-B commit, never subsequently
// maintained, zero persistence/mutation path) is retired to a real, honest
// empty LEADS array — the tool itself, and every derived view, is
// unchanged; no founder CRM schema was invented.
//
// CURRENT_SYNTHETIC_RUNTIME_IMPORTS = 2 files / 2 import statements
// (B-WORKER "One Product / No Demo Runtime" correction, 2026-09-06:
// WorkerAchievementService.ts removed from this allowlist — file deleted,
// zero real callers. See lib/architecture/registry.ts svc.worker-achievements.)
// (counted by tests/unit/cc002-i9-synthetic-import-guard.test.ts itself —
// the numbers above are a snapshot for human readability, not the source of
// truth; the test always recomputes the live count and fails if the
// allowlist below and the live scan disagree).
//
// CC-00 Final Scoring Canonicalization (2026-09-05): all 3 owner: 'B_TRUTH'
// entries (ActivationSafeguardService.ts, DemoDataService.ts,
// ScoringSimulatorService.ts) are removed from this allowlist entirely
// (6->3 files, 11->3 imports) — CC-022's B-TRUTH-scoped I9 gate (ratified by
// CC-00 I9 Governance Ratification, 2026-09-05, §32a) is now satisfied:
// BTRUTH_OWNED_SYNTHETIC_IMPORTS = []. ActivationSafeguardService.ts itself
// still exists (its real, canonical evaluate() is unchanged) — only its
// synthetic evaluateFromSeed() method, and the file's synthetic import, are
// removed. DemoDataService.ts and ScoringSimulatorService.ts are deleted
// entirely (zero real callers, confirmed by repo-wide grep before deletion).
// Only the 3 owner: 'B_WORKER' entries remain — transferred to B-WORKER's
// own closure requirement, not CC-022's, per the ratification above. They
// are NOT touched by this slice and are NOT a CC-022 blocker. See
// tests/unit/cc00-final-scoring-canonicalization.test.ts.
//
// CC-00 — Residual /demo/** controlled retirement (2026-09-26, later the
// same day): "No demo route survives merely because it still has a
// caller." app/demo/gtm/page.tsx, services/admin-preview/AdminPreviewService.ts,
// and components/demo/DemoGuideContent.tsx are ALL removed from this
// allowlist entirely (11->8 files, 16->13 imports):
//   - app/demo/gtm/page.tsx retired outright — its GTM Pipeline and Gate
//     Status sections duplicated real internal tools that already exist
//     (app/admin/founder-validation; Admin Home's own Methodology
//     Governance panel); its Pilot Package substantially duplicated the
//     real public /pilot page; its Scenario Presenter was pure sales
//     narrative with no product-truth role. Its one genuinely unique piece
//     — a presenter script for 15/30/60-minute demo walkthroughs — is
//     recorded as a deferred, low-stakes capability (documentation track,
//     not a coded page), per this slice's own explicit instruction not to
//     preserve /demo/gtm solely because it is useful to the founder.
//   - services/admin-preview/AdminPreviewService.ts: its last remaining
//     synthetic-backed method, getAIOnboardingPreview(), is retired (its
//     sole caller, app/demo/ai-onboarding/page.tsx, is retired) — along
//     with its sole synthetic import, data/synthetic/source-batches.json
//     (deleted — zero-consumer repo-wide, verified before deletion). The
//     file's only surviving method, getGateStatusPreview(), is real,
//     accurate, static project-governance config with a real non-demo
//     caller (Admin Home) — it was never synthetic-backed, so the file now
//     has zero data/synthetic/** imports.
//   - components/demo/DemoGuideContent.tsx was found to be fully orphaned
//     dead code, independent of any route decision in this slice — zero
//     importers anywhere (confirmed by repo-wide grep before deletion; it
//     was superseded by app/demo/guide/page.tsx's own inline JSX at some
//     earlier, undocumented point and never removed). Deleted along with
//     its 3 sub-components that had no other consumers either
//     (PipelineConnectorBanner.tsx, WorkspaceSwitcher.tsx,
//     StakeholderPaths.tsx — none of which imported synthetic data
//     themselves).
// See tests/unit/cc00-residual-demo-retirement.test.ts.
//
// CC-00 — Public Landing canonicalization (2026-09-26): app/page.tsx
// retired both of its synthetic imports (data/synthetic/kora-index-outputs.json,
// data/synthetic/company-aggregates.json) — it previously read a specific
// fictional company's ("Meridiana Group", scenario S1) KORA Index value,
// Confidence Score, Safeguard status, per-macroblock score, and per-pillar
// IU share and displayed them as if illustrating a real product result. The
// page now shows only real, static, canonical methodology facts (macroblock
// weights from lib/methodology-config/v0.1.ts, pillar definitions) — no
// per-company or per-tenant value at all, so no synthetic import is needed.
// File removed from this allowlist entirely (12->11 files). Neither fixture
// became zero-consumer overall — kora-index-outputs.json remains needed by
// 5 other real consumers (app/demo/page.tsx, app/demo/gtm/page.tsx,
// components/demo/DemoGuideContent.tsx, services/scoring/DemoScoringAdapter.ts,
// services/scoring-simulator/ScoringSimulatorService.ts), and
// company-aggregates.json remains needed by services/demo-data/DemoDataService.ts,
// services/worker-pillar-adoption/WorkerPillarAdoptionService.ts, and
// services/scoring-simulator/ScoringSimulatorService.ts — verified by direct
// repo-wide grep before this change, not assumed. Import count 18->16 (2
// fewer imports, both from this one removed file). See
// tests/unit/cc00-public-landing-canonicalization.test.ts.
//
// CC-00 — Company Portfolio capability salvage + canonicalization
// (2026-09-12): getCompanyPortfolioPreview() retired from
// services/admin-preview/AdminPreviewService.ts (real capability already
// existed, canonically, at app/admin/companies/page.tsx — "Company
// Console" — richer and DB-backed; see that method's own removal comment
// and lib/architecture/registry.ts's svc.admin-preview entry for the full
// rationale). This removed 2 of that file's 3 synthetic imports
// (data/synthetic/companies.json, data/synthetic/kora-index-outputs.json) —
// its third, data/synthetic/source-batches.json, remains needed by the
// non-retired getAIOnboardingPreview, so the FILE stays on the allowlist
// (12 files unchanged) while the IMPORT count drops (20->18 imports).
// Neither JSON fixture became fully zero-consumer overall — companies.json
// remains needed by services/demo-data/DemoDataService.ts, and
// kora-index-outputs.json remains needed by 6 other real consumers
// (app/page.tsx, app/demo/page.tsx, app/demo/gtm/page.tsx,
// components/demo/DemoGuideContent.tsx,
// services/scoring/DemoScoringAdapter.ts,
// services/scoring-simulator/ScoringSimulatorService.ts) — verified by
// direct repo-wide grep before this change, not assumed. See
// tests/unit/cc00-portfolio-canonicalization.test.ts for the regression
// guard proving both the retirement and the scope boundary.
//
// B-TRUTH ReportFactoryService Canonical Decision Pack Status Migration (2026-09-06): deleted services/report-factory/ReportFactoryService.ts and its sole seed file, data/synthetic/decision-pack-versions.json (confirmed, by direct repo-wide grep before deletion, zero remaining real consumers of the JSON — the only other hits were governance-comment prose, not imports). This is PR 4 of the founder-ratified ONE_PRODUCT_CANONICAL_MIGRATION plan (PR 1 = B-TRUTH KoraTest Canonical Foundation; PR 2 = B-TRUTH TenantService Canonical Migration; PR 3 = B-TRUTH CompanyDataIntakeService Canonical Migration). Independently re-verified before deletion: the service's sole real runtime caller, app/admin/pipeline/_components/PilotLifecycleClient.tsx, was traced field-by-field — of the legacy 9-field DecisionPackFactoryStatus return shape (company_id, tenant_id, latest_version_id, latest_status, can_generate, can_export_pdf, can_share, blocking_reasons, warnings, next_action), the caller read exactly ONE field, latest_status, compared to 'ready'. Per this migration's own "map only what the canonical model actually supports, do not fake 1:1 parity with legacy synthetic fields" rule, the blocking_reasons/warnings/next_action/can_generate apparatus (itself built from a private hasKoraIndex() call into the still-synthetic ScoringSimulatorService demo path) was DROPPED, not migrated — it never had a real consumer, so there was nothing canonical to migrate it onto; this also means hasKoraIndex()'s ScoringSimulatorService dependency is dropped along with it, not reimplemented against a canonical KORA Index existence check, and final scoring remains completely untouched by this migration — not because a canonical replacement was avoided, but because nothing downstream ever needed it. The replacement is a new shared pure view builder, lib/live/decision-pack-status-view.ts, reading directly from analytics.decision_pack_version (status, created_at columns), fetched once by app/admin/pipeline/page.tsx (already a Server Component) and passed down to PilotLifecycleClient.tsx as a new decisionPack prop — same "fetch once server-side, thread down as props" discipline as the prior two PRs. Version-selection rule (multiple analytics.decision_pack_version rows can exist per tenant): latest by created_at — the same precedent already used by lib/live/data-intake-status-view.ts and, before that, by the operator-flow route's own GET handler for this exact table; not invented for this migration. No tenant_kind branch was introduced — the view builder and its query shape are identical for KoraTest Srl (tenant_kind=TEST) and any tenant_kind=LIVE tenant. CanonicalTenantStatus (formerly exported from ReportFactoryService.ts) needed no relocation: repo-wide grep confirmed zero remaining real or type-only importers of it once the getDecisionPackFactoryStatus call site was removed — the type is deleted along with the file it was defined in, not moved. AccountProvisioningService, AdminPreviewService, final scoring, and B-WORKER are all explicitly untouched — one PR = one bounded migration. ReportFactoryService.ts was an I9 allowlist entry — thirteenth genuine I9 reduction via a real caller migration: 13->12 files (21->20 imports, 1 fewer import since this file's only synthetic import was the single decision-pack-versions.json read). See tests/unit/b-truth-reportfactory-canonical-decision-pack-status.test.ts for the regression guard proving both the deletion and the scope boundary.
//
// B-TRUTH CompanyDataIntakeService Canonical Migration (2026-09-05): deleted
// services/company-data-intake/CompanyDataIntakeService.ts and its 3 sole
// seed files, data/synthetic/company-budget-fiscal-plans.json,
// data/synthetic/company-raw-data-batches.json, and
// data/synthetic/company-raw-data-rows.json (confirmed, by direct repo-wide
// grep before deletion, zero remaining real consumers of any of the three —
// the only other hits were governance-comment prose, not imports). This is
// PR 3 of the founder-ratified ONE_PRODUCT_CANONICAL_MIGRATION plan (PR 1 =
// B-TRUTH KoraTest Canonical Foundation; PR 2 = B-TRUTH TenantService
// Canonical Migration). Independently re-verified before deletion (not
// trusted from any prior audit alone): both real runtime callers
// (app/admin/pipeline/_components/PilotLifecycleClient.tsx,
// services/report-factory/ReportFactoryService.ts) individually confirmed,
// zero type-only callers (its own CompanyBudgetFiscalPlan/CompanyRawDataBatch/
// CompanyRawDataRow/CompanyDataReadinessSummary/CompanyDataIntakeStatus type
// family lives in @/lib/types, imported FROM there, not exported by this
// file — that type family was deliberately NOT deleted, no opportunistic
// cleanup, confirmed to have zero other consumers besides this now-deleted
// service, but left in place matching the same discipline as every prior
// B-TRUTH retirement this session). Only the 3 fields either real caller
// actually consumed (batch_count, intake_status, review_required_rows — out
// of ~16 fields on the legacy getDataReadinessSummary() return shape) were
// migrated, via a new shared pure view builder,
// lib/live/data-intake-status-view.ts, fed by analytics.source_batch
// (batch existence + latest batch_status, "latest by created_at" matching
// the same batch-selection precedent already used elsewhere in lib/live and
// the canonical scoring route) and analytics.uef_record WHERE
// review_status='pending_review' (the same counting query
// app/api/admin/uef/review/route.ts's own GET handler already uses for its
// "pending" tally — reused, not reinvented). The legacy
// 'blocked_missing_required_fields' intake-status value is NOT reproduced —
// it was a post-hoc heuristic for malformed rows that, in the real
// pipeline, are already rejected at the canonical upload boundary
// (PII-scan/validation in accept/route.ts) before a source_batch row is
// ever created; neither real caller's behavior ever depended on this value
// firing. app/admin/pipeline/page.tsx (already a Server Component, per the
// prior TenantService migration) now also fetches this canonical Data
// Intake view once and passes it down to PilotLifecycleClient.tsx AND
// (transitively, via that same fetch) to ReportFactoryService — avoiding a
// duplicate query for the same data, same discipline as the CanonicalTenantStatus
// parameter added by the prior PR. ReportFactoryService.getDecisionPackFactoryStatus/
// computeBlockingReasons gained a third parameter, dataIntake:
// CanonicalDataIntakeStatus, replacing the internal companyDataIntakeService
// dependency entirely — its own still-synthetic hasKoraIndex/
// getLatestDecisionPackVersion checks and Decision Pack version source are
// UNCHANGED, unmigrated, explicitly out of scope (that is PR 4's job, not
// this one's). No tenant_kind branch was introduced anywhere — the view
// builder and its query shape are identical for KoraTest Srl
// (tenant_kind=TEST) and any tenant_kind=LIVE tenant. One real bug found and
// fixed in scripts/koratest-canonical-seed.ts (PR 1's own foundation
// script) while validating this migration against real KoraTest data: it
// never updated source_batch.batch_status to 'approved' after scoring
// completed (unlike the real app/api/admin/scoring/run-approved-batch/route.ts,
// which does), leaving KoraTest's batch permanently stuck below
// 'ready_for_ingestion' in the new canonical view — fixed by adding the
// same batch_status update that route performs, in its own clearly-labeled
// step. AdminPreviewService, AccountProvisioningService, and
// ReportFactoryService's Decision Pack version source are explicitly
// untouched — one PR = one bounded migration. CompanyDataIntakeService.ts
// was an I9 allowlist entry — twelfth genuine I9 reduction via a real
// caller migration: 14->13 files (24->21 imports, 3 fewer imports since
// this file alone accounted for 3 of the 24). See
// tests/unit/b-truth-company-data-intake-canonical-migration.test.ts for
// the regression guard proving both the deletion and the scope boundary.
//
// B-TRUTH TenantService Canonical Migration (2026-09-04): deleted
// services/tenant/TenantService.ts and its sole seed file,
// data/synthetic/tenants.json (confirmed, by direct repo-wide grep before
// deletion, zero remaining real consumers of the JSON — the 3 remaining
// text hits were all governance-comment prose, not imports). This is PR 2
// of the founder-ratified ONE_PRODUCT_CANONICAL_MIGRATION plan (PR 1 =
// B-TRUTH KoraTest Canonical Foundation, 2026-09-03/04). Independently
// re-verified before deletion (not trusted from any prior audit alone): all
// 3 real runtime callers (app/admin/pipeline/page.tsx,
// components/admin/WorkforceQuickAccessPanel.tsx,
// services/report-factory/ReportFactoryService.ts) individually confirmed,
// zero type-only callers (TenantService.ts exported no types of its own —
// its KoraTenant/KoraTenantStatus/TenantReadiness/ReadinessItemStatus type
// family lives in @/lib/types, imported FROM there, not exported by this
// file — that type family was deliberately NOT deleted, no opportunistic
// cleanup, since services/worker-space/WorkerSpaceCapabilityService.ts
// still legitimately imports it, unrelated to this migration, explicitly
// out of scope, B-WORKER territory). Each of the 3 callers migrated onto a
// canonical analytics.tenant read: app/admin/pipeline/page.tsx became a
// thin async Server Component reading the tenant by tenant_code
// (PILOT_LIFECYCLE_TENANT_CODE = 'KORATEST-01', an ordinary lookup — no
// special-case branching on this or any tenant_code anywhere), passing the
// result down to the new app/admin/pipeline/_components/
// PilotLifecycleClient.tsx (everything else on that page — worker
// provisioning, account provisioning, scoring, data intake — is UNCHANGED,
// still keyed by the pre-existing DEMO_COMPANY_ID = 'meridiana-group'
// constant, a separate, later migration slice); WorkforceQuickAccessPanel.tsx
// now receives its tenant list as a prop from its already-async parent
// (app/admin/companies/page.tsx), which queries analytics.tenant directly
// with no tenant_kind filter (no hidden test tenants — KoraTest Srl appears
// alongside any LIVE tenant, uniformly); ReportFactoryService.ts's
// getDecisionPackFactoryStatus/computeBlockingReasons now accept an
// already-fetched CanonicalTenantStatus ({ id, isActive } | null) parameter
// instead of calling tenantService.getTenant() themselves — avoiding a
// duplicate canonical read of the same data app/admin/pipeline already
// fetches, and avoiding making a previously-synchronous method async merely
// to satisfy an internal dependency; ReportFactoryService's own still-
// synthetic hasKoraIndex/getIntakeStatus/getLatestDecisionPackVersion checks
// (companyId-keyed) are UNCHANGED, unmigrated, explicitly out of scope. No
// tenant_kind product branch was introduced anywhere in this migration —
// the only tenant_kind-conditioned code in this entire pipeline remains the
// pre-existing app/api/admin/companies/provision/route.ts email-invite
// skip (operational safety only, unchanged, unrelated to this PR).
// WorkforceQuickAccessPanel's header copy was corrected in two places
// (a sentence and a badge that both claimed "dati sintetici" for the
// company roster) since that claim became factually false once the roster
// itself became canonical — the worker-count/My-KORA/Worker-Space
// sub-values shown per company remain honestly sourced from
// WorkerProvisioningService/WorkerSpaceCapabilityService, both still
// unmigrated, both explicitly out of scope (their own separate, later,
// B-WORKER-territory slice) — for a canonical tenant not yet present in
// their still-synthetic roster, these honestly read 0/not-enabled rather
// than fabricating a count. See
// tests/unit/b-truth-tenantservice-canonical-migration.test.ts for the
// regression guard proving both the deletion and the scope boundary.
// TenantService.ts was an I9 allowlist entry — eleventh genuine I9
// reduction via a real caller migration: 15->14 files (25->24 imports).
//
// B-TRUTH Eligibility Gate Retirement (2026-09-03): deleted
// services/eligibility-gate/EligibilityGateService.ts and its sole seed
// file, data/synthetic/action-taxonomy.json (confirmed, by direct repo-wide
// grep before deletion, exactly ONE real, value-level consumer of the JSON —
// the service itself; the other apparent hits — a UI step-label string in
// app/admin/kora-activation-layer/page.tsx, a code comment in
// lib/partner-activities/catalog.ts, and this task's own prior-retirement
// test's non-usage assertion — are non-functional). Independently
// re-verified reachability (not trusted from the prior B-TRUTH Zero-Caller
// Comparison audit alone): all 4 public methods (classifyAction,
// classifyActions, getActionTaxonomy, getEligibilitySummary) individually
// confirmed zero real callers, zero type-only callers. CORRECTION to this
// file's own prior `reason` text and the service's own header comment
// (recorded here, not silently dropped): both claimed real usage by "Admin
// BCM Mapping Review (AI Upload Studio)", "Pre-ingestion operator
// classification UI", and "Taxonomy exploration" — tracing the actual live
// routes found this stale; no such UI exists anywhere, and the real,
// scoring-authoritative eligibility engine, lib/kora-engine/eligibility-gate.ts
// (classifyEligibilityBatch), is used directly, with its own explicit
// "no duplication" comment, by all 3 real admin data-intake routes
// (upload-preview, preview, accept). A dedicated pre-existing test,
// tests/unit/eligibility-gate.test.ts's "B71 regression guard", independently
// corroborates that the live scoring pipeline routes through the canonical
// file, never through this one. Legacy rule nuances present only in the
// retired file (CCNL/contractual_mandatory override, Academy/Operations
// ambiguity detection, keyword-matching against action-taxonomy.json) were
// inventoried and classified: none qualify as MUST_MIGRATE_BEFORE_RETIREMENT
// — the service's own header already disclaimed scoring authority
// ("IT DOES NOT CONTROL SCORING"), and canonical was always the sole
// scoring-authoritative engine regardless of this file's existence, with
// zero live callers currently exercising any of this file's own rules. Its
// two re-exported data contracts, EligibilityClassificationInput and
// EligibilityClassificationResult, are defined in @/lib/types (not by this
// file) and are kept unchanged — no opportunistic cleanup; their prior real
// importers, IngestionPipelineService.ts and IngestionSimulatorService.ts,
// were both already independently retired by earlier PRs, leaving zero
// remaining type-only importers of this file specifically. This is a
// stale-claim correction and zero-caller cleanup, NOT a canonical
// methodology deletion — classifyEligibilityBatch and its full
// BLOCKED/LIMITED/ELIGIBLE keyword tables, INDIVIDUAL_SENSITIVE_SIGNALS
// privacy-priority check, and B15 UEF-reviewed passthrough logic are
// entirely unaffected. See
// tests/unit/b-truth-eligibility-gate-retirement.test.ts and
// lib/architecture/registry.ts svc.eligibility-gate for the full record.
// ReportFactoryService, ExplainabilityService, and the final scoring group
// are explicitly untouched — one PR = one bounded retirement. Tenth genuine
// I9 reduction via a real caller migration: 16->15 files (26->25 imports).
//
// B-TRUTH Ingestion Normalizer Retirement (2026-09-03): deleted
// services/ingestion-normalizer/IngestionNormalizerService.ts. This file was
// NEVER an allowlist entry — it had no direct data/synthetic/** import of
// its own (it consumed only the already-synthetic RawIngestionRow shape via
// its sole real caller, IngestionPipelineService.ts, itself retired
// immediately before this PR) — so this retirement does NOT change
// CURRENT_SYNTHETIC_RUNTIME_IMPORTS; still 16 files / 26 imports.
// Independently re-verified reachability: all 6 IIngestionNormalizerService
// methods individually confirmed zero real callers, zero type-only
// callers. No unique live data semantics: the real, canonical live
// ingestion/data-intake path (MappingConfidenceService,
// lib/data-intake/missing-field-analysis.ts, classifyEligibilityBatch,
// operating on the canonical RawUploadedRecord type family) is confirmed
// entirely independent, solving related problems via its own separate
// implementation. Its type family (RawIngestionRow, NormalizedIngestionRow)
// was confirmed to have zero other real consumers and was deliberately NOT
// deleted (no opportunistic cleanup — harmless data contracts in
// @/lib/types). EligibilityGateService is explicitly untouched by this
// PR — remains its own separately-authorized future slice. See
// tests/unit/b-truth-ingestion-normalizer-retirement.test.ts and
// lib/architecture/registry.ts svc.ingestion-normalizer for the full
// record.
//
// B-TRUTH Ingestion Pipeline Retirement (2026-09-03): deleted
// services/ingestion-pipeline/IngestionPipelineService.ts and its sole
// seed file, data/synthetic/ingestion-samples.json (confirmed, by direct
// repo-wide grep before deletion, ZERO other real consumers of the JSON —
// only this service imported it; the two prior mentions describing it as
// "demo data preserved" governed an earlier point when this exact
// retirement had not yet been authorized). Independently re-verified
// reachability: all 5 IIngestionPipelineService methods individually
// confirmed zero real callers (its last real-ish caller, UEFReviewService,
// was itself retired in the immediately preceding PR). No unique
// methodology: the service's private governance-flag derivation logic
// (deriveDestination/deriveReviewStatus/buildKoraReadyRecord) is a
// non-authoritative demo approximation of the same eligibility concept the
// canonical lib/kora-engine/eligibility-gate.ts's classifyEligibilityBatch
// already implements for real, live scoring — confirmed independent (zero
// references to this file), and RLS-16-proven to produce correct output
// for both DEMO-kind and LIVE-kind tenants without it. Direct consequences
// of this deletion (documented, not acted on): EligibilityGateService
// drops from 1 to 0 real callers (its sole caller was this file);
// IngestionNormalizerService drops from 1 to 0 real callers likewise.
// Neither was modified or retired by this PR — each remains its own
// separately-authorized future slice. demo-guard-01's substantive
// fallback-prohibition assertions (page never imports
// IngestionPipelineService, no ingestion-samples reference) are unchanged
// and unweakened — the ingestion-samples.json "demo data preserved"
// existence check was updated to reflect the new truth (its preservation
// was conditional on IngestionPipelineService still needing it, which is
// no longer the case). See
// tests/unit/b-truth-ingestion-pipeline-retirement.test.ts and
// lib/architecture/registry.ts svc.ingestion-pipeline for the full record.
// Ninth genuine I9 reduction via a real caller migration: 17->16 files
// (27->26 imports).
//
// B-TRUTH Explainability Synthetic Retirement (2026-09-02): removed
// services/explainability/ExplainabilityService.ts's synthetic-backed
// explanation branch (getExplanation, getTopWeakComponents,
// getTopStrongComponents, getNextBestActions, getLimitations, getWarnings —
// all confirmed, by direct repo-wide grep before removal, ZERO real runtime
// callers; the Warning type they fed also had zero external callers) and its
// sole synthetic import, data/synthetic/explainability-records.json (deleted
// — confirmed its only REAL, value-level consumer was this file; a second,
// nominal reference in services/demo-data/DemoDataService.ts — a bare string
// literal 'explainability-records' inside the final-scoring-group-protected
// SeedResourceType union — was confirmed non-functional: getResource() is an
// unconditional stub that returns [] for every resource type and has zero
// real callers of its own, never actually reading this or any of the other
// unwired resource-type strings; DemoDataService.ts itself is untouched).
// The live methodology glossary (getConceptExplanation, listConceptKeys,
// CONCEPT_GLOSSARY, ConceptExplanation — a static, hardcoded 21-concept
// object with no synthetic dependency) is unchanged; its real caller,
// components/kora-index/MethodologyGlossary.tsx, is unaffected.
// ExplainabilityComponentRef, ExplainabilityAction, and ExplainabilityRecord
// are kept as pure type declarations (smallest safe change) because
// components/kora-index/ExplainabilityPanel.tsx still has a type-only import
// of ExplainabilityRecord — even though that component was independently
// confirmed to be itself unreachable from any real entry point (a separate,
// out-of-scope fact, not acted on here). See
// tests/unit/b-truth-explainability-synthetic-retirement.test.ts and
// lib/architecture/registry.ts svc.explainability for the full record.
// ReportFactoryService, PreviewScoringAdapter, DynamicScoringPreviewService,
// the Ingestion/UEF legacy chain (IngestionPipelineService,
// EligibilityGateService, UEFReviewService), and the final scoring group are
// explicitly untouched — one PR = one bounded retirement. Eighth genuine I9
// reduction via a real caller migration: 18->17 files (28->27 imports).
//
// B-TRUTH FinancialGovernance Retirement (2026-09-02): deleted
// services/financial-governance/FinancialGovernanceService.ts and its sole
// seed file, data/synthetic/financial-governance.json (confirmed, by direct
// repo-wide grep before deletion, ZERO other consumers of the JSON — only
// this service imported it). Independently re-verified reachability (not
// trusted from the post-#132 audit alone): ZERO real runtime callers,
// ZERO type-only callers (its locally-defined PillarBudgetLine/BTIIndicators/
// FinancialGovernanceRecord/FinancialGovernanceResult/BudgetSummary types are
// entirely unimported elsewhere — a same-named but unrelated PillarBudgetLine
// already exists independently in lib/types/index.ts, confirmed NOT the same
// type, NOT imported from this file, used by an unrelated pre-existing
// aggregate type). No unique methodology: the service was a pure synthetic-
// JSON-to-interface mapper (own fields self-labeled
// informational_only/no_payment_execution/no_fund_custody), never computing
// anything — its BTI-shaped output (economic_relief_spend,
// deep_activation_spend, activation_debt_eur, bti_score, budget totals) is a
// near 1:1 conceptual match for the REAL, already-canonical BTI Engine output
// (analytics.bti_result, read directly by lib/decision-pack/pdf-data.ts:
// economicReliefSpend, deepActivationSpend, activationDebtEur, btiScore,
// totalPeopleWelfareBudget, costPerImpactUnit, budgetEvidenceQuality) — no
// capability lost, no methodology migrated because none was uniquely owned.
// Sole prior real-ish caller was the now-deleted ReportGeneratorService (see
// its own registry entry) — this service became fully orphaned as a direct
// consequence of that retirement, then independently reconfirmed here before
// acting on it. See tests/unit/b-truth-financial-governance-retirement.test.ts
// and lib/architecture/registry.ts svc.financial-governance for the full
// record. ReportFactoryService, ExplainabilityService, PreviewScoringAdapter,
// DynamicScoringPreviewService, the Ingestion/UEF legacy chain
// (IngestionPipelineService, EligibilityGateService, UEFReviewService), and
// the final scoring group are explicitly untouched — one PR = one service
// retirement. Sixth genuine I9 reduction via a real caller migration:
// 19->18 files (29->28 imports).
//
// B-TRUTH ReportGenerator Retirement (2026-09-02): deleted
// services/report-generator/ReportGeneratorService.ts entirely, following D-B
// ratification (CC-005, PR #131 — lib/decision-pack/* + lib/live/decision-pack.ts
// is the sole canonical Decision Pack authority). Re-verified independently
// before deletion: zero real runtime callers (static, dynamic, barrel, and
// type-only imports all checked, repo-wide) — confirming, not merely trusting,
// the PR #131 audit. ReportGeneratorService.ts was never itself an entry in
// this allowlist (it consumed synthetic data only transitively, via
// ScoringSimulatorService/IngestionPipelineService/ActivationSafeguardService/
// etc., each already separately allowlisted below) — this retirement does NOT
// change CURRENT_SYNTHETIC_RUNTIME_IMPORTS; still 19 files / 29 imports. See
// tests/unit/b-truth-report-generator-retirement.test.ts and
// lib/architecture/registry.ts svc.report-generator for the full record,
// including the 7-capability disposition and the deferred readiness
// requirement preserved in governance (not implemented). ReportFactoryService,
// the Ingestion/UEF legacy chain (IngestionPipelineService, EligibilityGateService,
// UEFReviewService, DynamicScoringPreviewService, PreviewScoringAdapter,
// ExplainabilityService, FinancialGovernanceService), and the final scoring
// group are explicitly untouched — one PR = one service retirement.
//
// B-TRUTH Ingestion/UEF PR2 — IngestionSimulatorService retirement
// (2026-09-02): RLS-16 (Ingestion/UEF PR1) proved canonical LIVE/DEMO-kind
// tenant Ingestion/UEF parity; this PR acts on that proof for the one
// bounded surface it authorizes. Deleted
// services/ingestion-simulator/IngestionSimulatorService.ts (and its
// now-empty directory) — confirmed, by direct repo-wide grep before
// deletion, ZERO real value/method-level callers anywhere
// (`ingestionSimulatorService.` matched nothing outside its own file), and
// exactly ONE real type-only dependency: services/mapping-confidence/
// MappingConfidenceService.ts imported SourceType from it, feeding a real
// live route (app/api/admin/data-intake/upload-preview/route.ts). SourceType
// moved to @/lib/types (deliberately NOT merged with the pre-existing,
// differently-valued IngestionSourceType there — 'lms' vs 'lms_training' —
// which would have silently changed MappingConfidenceService's real
// sourceBonus() switch-case behavior); EligibilityGateSummary's F-04 move
// (2026-09-02, prior PR) is unaffected — its own duplicate-interface bug
// (a second, accidentally-added copy in lib/types/index.ts alongside an
// already-existing one from 2026-05-23) was found and fixed in this same
// pass. data/synthetic/source-batches.json and
// data/synthetic/ingestion-samples.json are NOT deleted — both remain
// legitimately imported by other, non-retired files
// (services/admin-preview/AdminPreviewService.ts and
// services/ingestion-pipeline/IngestionPipelineService.ts respectively;
// the latter is also explicitly protected by
// tests/unit/demo-guard-01-kora-index-evidence-fallback.test.ts's own
// "demo data preserved" assertion). IngestionPipelineService.ts,
// EligibilityGateService.ts, UEFReviewService.ts, ReportGeneratorService.ts,
// DynamicScoringPreviewService.ts, CompanyDataIntakeService.ts,
// ScoringSimulatorService.ts, and the final scoring group are all
// UNTOUCHED by this PR — each requires its own separately-verified slice.
// Fifth genuine I9 reduction via a real caller migration: 20->19 files
// (31->29 imports).
//
// B-TRUTH Company Onboarding Canonicalization (2026-09-01): removed
// services/company-onboarding/CompanyOnboardingService.ts's sole synthetic
// import (data/synthetic/company-onboarding.json, deleted). Founder decision
// (this task's own prompt) supersedes the CC-020A/Master-Plan-§33 "competing
// implementation of svc.company-setup" framing: CompanySetup (pre-provisioning
// wizard) and CompanyOnboarding (post-provisioning readiness/status logic)
// are distinct responsibilities, not competing implementations — see
// lib/architecture/registry.ts svc.company-onboarding / svc.company-setup.
// The service's derived logic (isFoundationLightEligible, getPipelineReadiness,
// getNextBestAction, getPrivacyThresholdWarnings) is preserved, now reading
// analytics.tenant + personal.workforce_baseline (via the already-canonical
// lib/live/workforce-baseline-view.ts) through a new pure view builder,
// lib/live/company-onboarding-view.ts — see that file's header for the full
// KEEP/DERIVE/DROP field disposition. 7 simple accessor methods with no
// canonical equivalent and zero real callers (getCompanyProfile,
// getWorkforceBaseline [old shape], getHRKPIContext, getRawProgramDataSummary,
// getOnboardingCompanies, getCompanyOnboardingRecord,
// getCurrentCompanyOnboardingRecord) were retired. Fourth genuine I9
// reduction via a real caller migration (this service had zero real
// callers, canonicalized anyway per this task's own explicit instruction):
// 21->20 files (32->31 imports).
//
// B-TRUTH Contribution Protected Port (2026-09-01): removed
// services/kora-contribution/KoraContributionService.ts's two synthetic
// imports (data/synthetic/kora-contribution-outputs.json,
// data/synthetic/collective-initiatives.json, both files deleted). The
// synthetic methods they fed (getContribution, getContributionSummary,
// getContributionScore, getCollectiveInitiatives, getContributionInitiatives,
// getSummaryV2) are retired; getSummaryV2's sole real caller
// (app/company/contribution/page.tsx) is rewired onto a new async,
// DB-backed function, getContributionV2Live(), reading real
// commons.contribution_event + commons.post rows via
// lib/kora-contribution/contribution-pipeline-input.ts. The protected
// methodology authority (computeContributionV2 / computeProvisionalScore /
// computeFromPipelineResult) is unchanged — only its input source moved.
// See lib/architecture/registry.ts svc.kora-contribution and
// tests/unit/btruth-contribution-pipeline-input.test.ts. Third genuine I9
// reduction via a real caller migration: 22->21 files (34->32 imports).
//
// B-TRUTH First Canonical Seed Group (2026-08-31): WorkforceBaselineService.ts
// deleted entirely, along with its sole import of
// data/synthetic/workforce-baseline.json. Its only real caller,
// app/admin/companies/workforce-baseline/page.tsx, now reads live
// personal.workforce_baseline via a new GET on
// app/api/admin/workforce-baseline/route.ts (canonical write path,
// lib/live/workforce-baseline.ts's persistWorkforceBaseline, already
// existed and required no changes) and the live tenant registry via the
// already-existing GET /api/admin/tenants — the same page a DEMO-kind and
// a LIVE-kind tenant both traverse identically, no tenant_kind branch
// anywhere. Several synthetic-only fields (upload-process stats, editorial
// completeness score, warnings/limitations text, activation/equity
// readiness flags) had no live source and are not shown — no schema was
// added and no placeholder value was invented for any of them; see
// lib/live/workforce-baseline-view.ts for the full field disposition.
// Second genuine I9 reduction via a real caller migration (after CC-052's
// Commons): 23->22 files (35->34 imports).
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
//
// CC-00 I9 GOVERNANCE RATIFICATION (2026-09-05): each entry now also carries
// an `owner` field. This resolves a genuine sequencing contradiction found by
// the CC-00 Closure Decision Gate (2026-09-05): Master Plan Section 28's
// Execution Calendar names "I9 = 0" as a CC-022/B-TRUTH closure condition at
// day 20, but 3 of these 6 residuals (AccountProvisioningService,
// WorkerAchievementService, WorkerProvisioningService) cannot be reduced to
// zero without a Worker/My KORA product decision — a decision the Master
// Plan itself reserves to B-WORKER (CC-025), which the same Execution
// Calendar starts at day 23, three days AFTER CC-022. The founder-ratified
// resolution (see docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md
// §32a for the full record) does NOT change what "I9 = 0" originally meant
// as a global aspiration; it clarifies that CC-022's own closure gate checks
// only the B_TRUTH-owned subset. `owner: 'B_WORKER'` entries remain fully
// visible in this allowlist and in every count below — they are NOT hidden,
// NOT deleted, and NOT exempted from ever reaching zero; they are
// reassigned to B-WORKER's own closure requirement instead of CC-022's.
// This is not a general-purpose exemption mechanism: only these 3
// specifically-named, specifically-evidenced residuals carry
// owner: 'B_WORKER' — any other entry defaults to (and must justify)
// owner: 'B_TRUTH'. See tests/unit/cc00-i9-governance-ratification.test.ts
// for the regression guard proving no UNKNOWN owner, no wildcard, and no
// silent growth of the B_WORKER-owned set.

export interface SyntheticImportAllowlistEntry {
  file: string;
  reason: string;
  /**
   * B_TRUTH: must reach zero for CC-022/B-TRUTH closure (this allowlist's
   * original, un-narrowed purpose).
   * B_WORKER: transferred to B-WORKER's own closure requirement (CC-00 I9
   * Governance Ratification, 2026-09-05) — still tracked, still required to
   * reach zero eventually, just not by CC-022.
   */
  owner: 'B_TRUTH' | 'B_WORKER';
}

// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
// WorkerAchievementService.ts is deleted (zero real callers once
// app/my-kora/page.tsx and app/my-kora/dynamic-cv/page.tsx — its only two
// callers — became pure canonical redirects; no achievement domain object
// was created to replace it, per explicit founder instruction). Removed
// from this allowlist entirely: 3 B_WORKER-owned entries -> 2.
// AccountProvisioningService.ts stays: its data/synthetic/user-accounts.json
// import is independent of the already-removed getCurrentDemoUser() (PR
// #168) — getWorkerAccountsForCompany/getCompanyAdmins/etc. still read it
// directly, confirmed by fresh inspection, out of this slice's scope.
// WorkerProvisioningService.ts stays: fresh-verified as the final B-WORKER
// I9 blocker (real callers across admin roster/provisioning UI, genuine
// schema gaps — department/site/my_kora_enabled/pib_private_enabled — not
// invented here; see tests/unit/bworker-preview-runtime-retirement.test.ts).
export const SYNTHETIC_IMPORT_ALLOWLIST: SyntheticImportAllowlistEntry[] = [
  { file: 'services/account/AccountProvisioningService.ts', reason: 'Demo account registry — reads synthetic user accounts.', owner: 'B_WORKER' },
  { file: 'services/worker-provisioning/WorkerProvisioningService.ts', reason: 'Demo worker roster seed for provisioning flows.', owner: 'B_WORKER' },
];

/** CC-022's own closure gate checks only this subset (CC-00 I9 Governance Ratification, 2026-09-05). */
export const BTRUTH_OWNED_SYNTHETIC_IMPORTS = SYNTHETIC_IMPORT_ALLOWLIST.filter((e) => e.owner === 'B_TRUTH');

/** Transferred to B-WORKER's own closure requirement — NOT a CC-022 blocker, still tracked. */
export const BWORKER_OWNED_SYNTHETIC_IMPORTS = SYNTHETIC_IMPORT_ALLOWLIST.filter((e) => e.owner === 'B_WORKER');
