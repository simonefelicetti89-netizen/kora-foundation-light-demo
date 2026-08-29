# KORA Architecture Registry

**Generated file — do not hand-edit.** Source: `lib/architecture/registry.ts`.
Regenerate with: `npx tsx scripts/generate-architecture-doc.ts`.

---

## Governance

- **This document (Architecture Registry)** describes the **CODE** — real components that exist in the repository today, classified by `ArchitectureStatus`.
- **The Target Ontology Implementation section below** describes the **target DOMAIN MODEL** the Master Plan defines — objects that may or may not have code behind them yet. These are two different axes and must never be conflated: a domain object can be `TO_BUILD` while unrelated code implementing a different capability is `CANONICAL`.
- **`docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.0.md` is the architectural truth.** This registry — like the rest of the repository — is the **operational truth**: what actually exists, not what should exist. Where they disagree, the Master Plan's own Read-Before-Write protocol governs (report `STATE_MATCH = NO`, do not silently reconcile).
- Classifications here do not anticipate any decision reserved for a future CC block or D-letter (D-A Confidence, D-B Decision Pack, D-C One Truth, D-D worker surfaces). Where two components compete, both carry the same `decisionRef` and neither is elevated.

---

## Architecture Components

77 components across 25 domains.

| ID | Domain | Path | Status | Future Core | Decision Ref | Notes |
|---|---|---|---|---|---|---|
| `app-surface.admin` | Admin | `app/admin/` | COMPLETE | — | — | Not individually traced per-subdirectory. Includes diagnostic-only tooling (kora-link-lab, live-spine-diagnostics, provisioning-diagnostics) that a future pass may want to split out separately. |
| `app-surface.demo` | Demo | `app/demo/` | CONSOLIDATE | — | B-TRUTH / D-C | Master Plan §31 explicitly names this cluster: "11 pagine /demo con ruolo DEMO_VIEWER, synth-only [DECISION REQUIRED D-C]". |
| `app-surface.my-kora` | Worker | `app/my-kora/` | COMPLETE | Y | CC-024 / D-D | Neutral status. Master Plan §19 B-WORKER row states "/my-kora gira su AccessControlService" — CC-001R verified this claim does NOT match current code (app/my-kora/page.tsx does not import AccessControlService); flagged as an untagged (no [VERIFIED]) Master Plan claim, not corrected here. |
| `app-surface.worker` | Worker | `app/worker/` | COMPLETE | Y | CC-024 / D-D | Neutral status — CC-024's 12-dimension architecture matrix owns the consolidation decision, not a line-count comparison. |
| `app.company-reports-board-pack` | Reporting (dead route) | `app/company/reports/board-pack/page.tsx` | DEAD | — | Master Plan §32 Safe Deletion Plan | Verified: pure redirect() call, no logic. Master Plan §32: "13 L, solo redirect [VERIFIED]". Referenced by 2 files (app/company/status/page.tsx, lib/feature-discovery/index.ts) and 4 tests exercising the redirect itself — those link targets would need updating on deletion. |
| `db.commons-booking-schema` | Commons | `supabase/migrations/025_commons_booking_contribution.sql` | CANONICAL | Y | — | Master Plan §33 [VERIFIED]. SECURITY DEFINER function booking_aggregate_for_promoter() enforces the cross-tenant boundary. This is the concrete evidence behind the Master Plan's Program/Participation/Case ontology correction (§3.0). |
| `db.kora-link-schema` | KORA Link | `supabase/migrations/034_kora_link_schema.sql` | FUTURE_CORE | Y | — | Hardened through migrations 035/036/039/042. auth.uid()-based identity resolution confirmed inside SECURITY DEFINER RPC bodies (I4). |
| `db.worker-pib-schema` | PIB | `supabase/migrations/018_worker_pib.sql` | FUTURE_CORE | Y | — | I3 confirmed: zero application-role policies on this table (migration 027 refactor). Never employer-visible. |
| `lib.auth` | Auth | `lib/auth/access-matrix.ts` | CANONICAL | — | — | Imported directly by middleware.ts. |
| `lib.decision-pack` | Reporting | `lib/decision-pack/` | CONSOLIDATE | — | CC-005 / D-B | Confirmed single implementation of the live PDF layer itself (2 independent passes found no second PDF generator) — the "three Decision Pack" the Master Plan refers to (§32) are this + report-factory + report-generator, at the domain level. |
| `lib.ingestion-cluster` | Ingestion | `lib/data-intake/` | INVESTIGATE | — | — | BACKLOG — HUMAN TRIAGE. CC-002 traced part of this cluster: ingestion-normalizer→ingestion-pipeline is a real 2-stage chain; ingestion-simulator and company-data-intake are separate parallel entry points. The four lib/ sub-directories themselves were not individually caller-traced. Finding: MIXED. |
| `lib.kora-contribution` | Contribution | `lib/kora-contribution/contribution-methodology.ts` | INVESTIGATE | — | — | BACKLOG — HUMAN TRIAGE. Consumed by lib/partner-activities + lib/live/contribution-lineage.ts — a genuinely different downstream from services/kora-contribution/KoraContributionService.ts, which reads the demo seed directly. Neither imports the other: real fragmentation, no CC-ID assigned by the Master Plan for this specific pairing. |
| `lib.kora-engine` | Methodology | `lib/kora-engine/` | CANONICAL | — | — | Matches doc 10 methodology. run-kora-pipeline.ts orchestrates; consumed by LiveScoringAdapter. |
| `lib.kora-link` | KORA Link | `lib/kora-link/` | FUTURE_CORE | Y | — | Master Plan §33: "FUTURE CORE, gap DG-07 chiusi [VERIFIED]". Flag-gated off (KORA_LINK_ENABLED=false) but functionally complete; RLS-dense (migration 035 alone ~23 policies). |
| `lib.live` | Live data | `lib/live/` | CANONICAL | — | — | Includes contribution-lineage.ts, which carries its own in-code "NAMING DISAMBIGUATION (C-6)" note acknowledging a naming collision between its ContributionRole concept and KORA Contribution — self-flagged, unresolved debt, not fixed here. |
| `lib.methodology-config` | Methodology | `lib/methodology-config/v0.1.ts` | CANONICAL | — | — | Matches CLAUDE.md's "v0.1.ts" filename requirement. Consumed by report-factory, kora-engine, scoring. |
| `lib.permissions` | Privacy | `lib/permissions/index.ts` | CANONICAL | — | — | 10 callers. |
| `lib.privacy` | Privacy | `lib/privacy/group-threshold.ts` | CANONICAL | — | — | CC-002: DEFAULT_MIN_GROUP_SIZE now re-exports the canonical lib/constants/kora.ts value (I2). Added detectGroupTotalReconciliationRisk() (I5) — proves but does not fix a live differencing risk (see CC-002 report §14 remaining risks). |
| `lib.scoring-result` | Scoring | `lib/scoring-result/index.ts` | CANONICAL | — | — | In-code contract: app/components must never import ScoringSimulatorService/DynamicScoringPreviewService/run-kora-pipeline directly. CC-002 found 6 real violations of this contract (not fixed — CC-010/B-TRUTH scope). |
| `lib.types.domains.evidence` | Evidence | `lib/types/domains/evidence.ts` | FUTURE_CORE | Y | — | Own header: "No persistence in KORA Foundation Light: types only... Pilot+ engineer: implement EvidenceRepository." Verified by direct read (CC-002). |
| `lib.worker-identity` | Worker | `lib/worker-identity/` | CANONICAL | Y | — | Matches current branch HEAD (worker identity lifecycle protection, migration 048). |
| `svc.access-control` | Demo/Access | `services/access-control/AccessControlService.ts` | CONSOLIDATE | — | B-TRUTH | Zero callers repo-wide (verified). Master Plan §32 names it for removal at end of B-TRUTH alongside demo-data/scoring-simulator. |
| `svc.account` | Admin | `services/account/AccountProvisioningService.ts` | CANONICAL | — | — | 13 real callers. |
| `svc.activation-opportunity` | Worker | `services/activation-opportunity/ActivationOpportunityService.ts` | COMPLETE | — | — | 3 callers. Overlap with worker-opportunity not resolved. |
| `svc.activation-safeguard` | Methodology | `services/activation-safeguard/ActivationSafeguardService.ts` | CANONICAL | — | — | 6 callers. Matches CLAUDE.md thresholds exactly. |
| `svc.admin-preview` | Admin/Demo | `services/admin-preview/AdminPreviewService.ts` | FROZEN | — | — | 7 callers, demo-only. |
| `svc.advisor-evidence-review` | Advisor | `services/advisor-evidence-review/AdvisorEvidenceReviewService.ts` | COMPLETE | — | — | Demo-only caller (app/demo/advisor); no live /advisor workspace route exists despite CLAUDE.md documenting one. |
| `svc.booking-request` | Commons (legacy) | `services/booking-request/BookingRequestService.ts` | DEAD | — | Master Plan §32 Safe Deletion Plan | Verified: 24 lines, zero callers anywhere (no import, no dynamic/string reference, no test), no backing DB table. Master Plan §32 independently confirms: "24 L, ritorna []/null [VERIFIED]" — commons/BookingService resta. |
| `svc.bti-intelligence` | Financial | `services/bti-intelligence/BTIIntelligenceService.ts` | COMPLETE | — | — | 1 caller. Confirmed distinct responsibility from budget-to-human-impact (imports only its result type, not the service) — not a duplicate. |
| `svc.budget-to-human-impact` | Financial | `services/budget-to-human-impact/BudgetToHumanImpactService.ts` | CANONICAL | — | — | 5 callers. |
| `svc.care-economy` | Intelligence | `services/care-economy/CareEconomyIntelligenceService.ts` | COMPLETE | — | — | 3 callers. |
| `svc.commons` | Commons | `services/commons/CommonsService.ts` | CANONICAL | — | — | 7 callers. |
| `svc.commons.booking` | Commons | `services/commons/BookingService.ts` | CANONICAL | Y | — | Master Plan §33 Do-Not-Delete: "vivo e canonico" [VERIFIED]. 5 live API routes, SECURITY DEFINER cross-tenant boundary check (migration 025). |
| `svc.company-data-intake` | Ingestion | `services/company-data-intake/CompanyDataIntakeService.ts` | CANONICAL | — | — | 6 callers. |
| `svc.company-intelligence` | Admin | `services/company-intelligence/CompanyIntelligenceService.ts` | COMPLETE | — | — | 1 caller. |
| `svc.company-onboarding` | Company | `services/company-onboarding/CompanyOnboardingService.ts` | COMPLETE | — | — | 2 callers. Possible overlap with company-setup, not resolved. |
| `svc.company-setup` | Company | `services/company-setup/CompanySetupService.ts` | INVESTIGATE | — | — | Zero real callers (only route-string literals reference it). Master Plan §32/§33 state explicitly, twice: "company-setup e report-generator restano INVESTIGATE". |
| `svc.confidence-score` | Methodology | `services/confidence-score/ConfidenceScoreService.ts` | CONSOLIDATE | — | CC-004 / D-A | Zero production callers (only itself + 1 test). Neutral status — not declared a loser ahead of D-A. |
| `svc.demo-data` | Demo | `services/demo-data/DemoDataService.ts` | CONSOLIDATE | — | B-TRUTH | One test-only caller; most demo pages import data/synthetic/*.json directly instead. Master Plan §32 names it for removal at end of B-TRUTH. |
| `svc.dynamic-cv` | Worker | `services/dynamic-cv/DynamicCVService.ts` | FUTURE_CORE | Y | — | Master Plan §33 Do-Not-Delete list. 5 callers. |
| `svc.dynamic-scoring` | Scoring | `services/dynamic-scoring/DynamicScoringPreviewService.ts` | CANONICAL | — | — | 6 callers, narrow documented use (PreviewScoringAdapter, ReportGeneratorService). |
| `svc.eligibility-gate` | Ingestion | `services/eligibility-gate/EligibilityGateService.ts` | CANONICAL | — | — | 4 callers. |
| `svc.equity-access` | Intelligence | `services/equity-access/EquityAccessIntelligenceService.ts` | COMPLETE | — | — | 6 callers. |
| `svc.evidence-reliability` | Intelligence | `services/evidence-reliability/EvidenceReliabilityIntelligenceService.ts` | COMPLETE | — | — | 8 callers. |
| `svc.executive-intelligence` | Admin | `services/executive-intelligence/ExecutiveIntelligenceService.ts` | CANONICAL | — | — | 4 real callers (functional export computeExecutiveIntelligence — company/kora-index page, decision-pack pdf-data, ExecutiveIntelligencePanel, test). |
| `svc.explainability` | Methodology | `services/explainability/ExplainabilityService.ts` | CANONICAL | — | — | 3 callers. |
| `svc.financial-governance` | Financial | `services/financial-governance/FinancialGovernanceService.ts` | COMPLETE | — | — | 1 caller. |
| `svc.founder-validation` | Admin | `services/founder-validation/FounderValidationService.ts` | CANONICAL | — | — | 2 callers. CLAUDE.md-mandated internal/admin-only. |
| `svc.ingestion-normalizer` | Ingestion | `services/ingestion-normalizer/IngestionNormalizerService.ts` | CANONICAL | — | — | 2 callers. Confirmed real chain: consumed by ingestion-pipeline. |
| `svc.ingestion-pipeline` | Ingestion | `services/ingestion-pipeline/IngestionPipelineService.ts` | CANONICAL | — | — | 6 callers (UEFReviewService, IUComputationService, ReportGeneratorService, +). |
| `svc.ingestion-simulator` | Ingestion | `services/ingestion-simulator/IngestionSimulatorService.ts` | COMPLETE | — | — | 5 callers. CC-002 ingestion-cluster finding: MIXED — partial pipeline layering coexists with parallel entry points. |
| `svc.iu-computation` | Methodology | `services/iu-computation/IUComputationService.ts` | CANONICAL | — | — | 16 callers. This is the CC-002 I7 golden-case protected component. Overlap with worker-iu-computation not resolved. |
| `svc.kora-contribution` | Contribution | `services/kora-contribution/KoraContributionService.ts` | CANONICAL | Y | — | 14 callers. Master Plan §33 Do-Not-Delete. Confirmed genuinely disconnected from lib/kora-contribution/contribution-methodology.ts (neither imports the other) — real fragmentation, not layering. |
| `svc.life-diversity` | Intelligence | `services/life-diversity/LifeDiversityService.ts` | COMPLETE | — | — | 8 callers. |
| `svc.lifecycle` | Admin | `services/lifecycle/LifecycleService.ts` | FROZEN | — | — | 2 callers. Real audit.audit_log table is a separate, live mechanism. |
| `svc.mapping-confidence` | Ingestion | `services/mapping-confidence/MappingConfidenceService.ts` | CANONICAL | — | — | 2 callers. |
| `svc.my-kora-preview` | Worker | `services/my-kora-preview/MyKoraPreviewService.ts` | COMPLETE | — | CC-024 / D-D (at the app-surface level, not this service) | 14 callers. |
| `svc.pib-aggregation` | PIB | `services/pib-aggregation/PIBAggregationService.ts` | CANONICAL | Y | — | 3 callers. Master Plan §33: prerequisite for canonical CF. |
| `svc.privacy-visibility` | Privacy | `services/privacy-visibility/PrivacyVisibilityService.ts` | CONSOLIDATE | — | after B-INV | 1 caller. Master Plan §32: "dopo B-INV, I2 copre lo strato canonico" — scheduled for likely removal once I2 canonically covers this, per the Master Plan itself. |
| `svc.report-factory` | Reporting | `services/report-factory/ReportFactoryService.ts` | CONSOLIDATE | — | CC-005 / D-B | 3 real callers (app/admin/pipeline, app/admin/companies/[companyId]). Also imports demo seed (decision-pack-versions.json) directly. Neutral status — not declared winner ahead of D-B. |
| `svc.report-generator` | Reporting | `services/report-generator/ReportGeneratorService.ts` | INVESTIGATE | — | — | 3 real callers (services/scoring/IScoringService.ts, PreviewScoringAdapter.ts, +1 test) — NOT app/company/reports/page.tsx (that direct import was removed; the file's own header comment describing it is stale, confirmed by CC-002). Master Plan §32/§33 state explicitly, twice: "restano INVESTIGATE". |
| `svc.role-permission` | Privacy | `services/role-permission/RolePermissionService.ts` | CANONICAL | — | — | 2 callers — low relative to "mandatory gatekeeper" status, worth CC-002/I1 follow-up scrutiny. |
| `svc.scenario` | Demo | `services/scenario/ScenarioService.ts` | FROZEN | — | — | 4 callers, demo-only. |
| `svc.scoring-simulator` | Scoring | `services/scoring-simulator/ScoringSimulatorService.ts` | CONSOLIDATE | — | B-TRUTH | 21 callers (highest usage in this registry) yet Master Plan §32 explicitly schedules removal at end of B-TRUTH — high current usage does not make it the architectural target. |
| `svc.scoring.facade` | Scoring | `services/scoring/IScoringService.ts` | CANONICAL | — | — | Consumed only via lib/scoring-result/index.ts (useScoringResult). CC-002 found 6 real bypasses of this facade — see I5/M-02 notes, not fixed in CC-002/CC-003. |
| `svc.submission-feedback` | Demo | `services/submission-feedback/SubmissionFeedbackService.ts` | FROZEN | — | — | 3 callers. |
| `svc.tenant` | Core | `services/tenant/TenantService.ts` | CANONICAL | — | — | 24 callers — highest caller count of any service. |
| `svc.uef-review` | Methodology | `services/uef-review/UEFReviewService.ts` | CANONICAL | — | — | 3 callers. |
| `svc.worker-achievements` | Worker | `services/worker-achievements/WorkerAchievementService.ts` | CANONICAL | — | — | 3 callers. |
| `svc.worker-attribution` | Worker | `services/worker-attribution/WorkerAttributionService.ts` | CANONICAL | — | — | 6 callers. |
| `svc.worker-iu-computation` | Worker/Methodology | `services/worker-iu-computation/WorkerIUComputationService.ts` | CANONICAL | — | — | 7 real callers (functional exports — computeBaseWorkerPIBRows, etc.). Overlap with iu-computation not resolved. |
| `svc.worker-opportunity` | Worker | `services/worker-opportunity/WorkerOpportunityService.ts` | FUTURE_CORE | Y | — | Master Plan §33: "base tecnica di Exposure". 4 callers. |
| `svc.worker-pib` | PIB | `services/worker-pib/WorkerPIBService.ts` | FUTURE_CORE | Y | — | Master Plan §33: prerequisite for canonical CF. 13 callers. Isolation independently verified (SECURITY DEFINER-only access, migration 027). |
| `svc.worker-pillar-adoption` | Worker | `services/worker-pillar-adoption/WorkerPillarAdoptionService.ts` | CANONICAL | — | — | 2 callers. CC-002 fixed a local N≥10 threshold duplicate here (I2). |
| `svc.worker-provisioning` | Worker | `services/worker-provisioning/WorkerProvisioningService.ts` | CANONICAL | — | — | 16 callers. Matches current branch's own work (worker identity lifecycle sprint). |
| `svc.worker-space` | Worker | `services/worker-space/WorkerSpaceCapabilityService.ts` | CANONICAL | — | — | 8 callers. |
| `svc.workforce-baseline` | Company | `services/workforce-baseline/WorkforceBaselineService.ts` | COMPLETE | — | — | 1 caller. |

---

## Status Distribution

| Status | Count |
|---|---|
| CANONICAL | 36 |
| CONSOLIDATE | 8 |
| COMPLETE | 16 |
| FROZEN | 4 |
| FUTURE_CORE | 7 |
| LEGACY | 0 |
| DEAD | 2 |
| INVESTIGATE | 4 |

---

## DEAD Components

| ID | Path | Replacement | Deletable When | Decision Ref |
|---|---|---|---|---|
| `svc.booking-request` | `services/booking-request/BookingRequestService.ts` | `svc.commons.booking` | After B-REG registry is live and a repo-wide re-grep at CC-003+ time confirms still zero references. | Master Plan §32 Safe Deletion Plan |
| `app.company-reports-board-pack` | `app/company/reports/board-pack/page.tsx` | — | After B-REG, once the 2 referencing files are repointed directly at /api/company/decision-pack and the 4 redirect-behavior tests are updated or removed. | Master Plan §32 Safe Deletion Plan |

---

## FUTURE CORE

Capabilities explicitly preserved per Master Plan §33 (Do-Not-Delete / Future Core) — never reclassify these as DEAD or LEGACY for low current usage.

- `app-surface.my-kora` (COMPLETE) — `app/my-kora/` — Preview worker workspace, demo-state session (9 routes) — self-documented in-file as PREVIEW mode.
- `app-surface.worker` (COMPLETE) — `app/worker/` — Live worker workspace, real Supabase JWT session (12 routes).
- `db.commons-booking-schema` (CANONICAL) — `supabase/migrations/025_commons_booking_contribution.sql` — commons.booking table — dual tenant_id (worker_tenant_id, post_tenant_id) cross-tenant pattern.
- `db.kora-link-schema` (FUTURE_CORE) — `supabase/migrations/034_kora_link_schema.sql` — kora_link.* schema (links, link_assignments, link_batches, link_delivery_records, link_events, link_replacements, link_activation_acknowledgements, revocations, audit_log).
- `db.worker-pib-schema` (FUTURE_CORE) — `supabase/migrations/018_worker_pib.sql` — personal.worker_pib — isolated PIB storage, SECURITY DEFINER-only access.
- `lib.kora-link` (FUTURE_CORE) — `lib/kora-link/` — Identity/token-based worker activation channel (8 files).
- `lib.types.domains.evidence` (FUTURE_CORE) — `lib/types/domains/evidence.ts` — Type scaffold for a first-class Evidence entity — types only, no persistence, explicitly for Pilot+.
- `lib.worker-identity` (CANONICAL) — `lib/worker-identity/` — Core worker identity lifecycle helpers (2 files).
- `svc.commons.booking` (CANONICAL) — `services/commons/BookingService.ts` — Live cross-tenant booking (worker_tenant_id × post_tenant_id pattern).
- `svc.dynamic-cv` (FUTURE_CORE) — `services/dynamic-cv/DynamicCVService.ts` — Worker-self-only Dynamic Impact CV.
- `svc.kora-contribution` (CANONICAL) — `services/kora-contribution/KoraContributionService.ts` — KORA Contribution computation — companion indicator, kept separate from KORA Index.
- `svc.pib-aggregation` (CANONICAL) — `services/pib-aggregation/PIBAggregationService.ts` — Stage 11 of the 14-stage algorithm: PIB = ΣIU per worker.
- `svc.worker-opportunity` (FUTURE_CORE) — `services/worker-opportunity/WorkerOpportunityService.ts` — Rule-based opportunity suggestions, no LLM.
- `svc.worker-pib` (FUTURE_CORE) — `services/worker-pib/WorkerPIBService.ts` — Worker-self PIB read/aggregate.

---

## INVESTIGATE

Components where evidence is insufficient to assign a confident status. Per Master Plan discipline: `INVESTIGATE` is preferred over an aggressive classification when in doubt.

- `lib.ingestion-cluster` — `lib/data-intake/` — BACKLOG — HUMAN TRIAGE. CC-002 traced part of this cluster: ingestion-normalizer→ingestion-pipeline is a real 2-stage chain; ingestion-simulator and company-data-intake are separate parallel entry points. The four lib/ sub-directories themselves were not individually caller-traced. Finding: MIXED.
- `lib.kora-contribution` — `lib/kora-contribution/contribution-methodology.ts` — BACKLOG — HUMAN TRIAGE. Consumed by lib/partner-activities + lib/live/contribution-lineage.ts — a genuinely different downstream from services/kora-contribution/KoraContributionService.ts, which reads the demo seed directly. Neither imports the other: real fragmentation, no CC-ID assigned by the Master Plan for this specific pairing.
- `svc.company-setup` — `services/company-setup/CompanySetupService.ts` — Zero real callers (only route-string literals reference it). Master Plan §32/§33 state explicitly, twice: "company-setup e report-generator restano INVESTIGATE".
- `svc.report-generator` — `services/report-generator/ReportGeneratorService.ts` — 3 real callers (services/scoring/IScoringService.ts, PreviewScoringAdapter.ts, +1 test) — NOT app/company/reports/page.tsx (that direct import was removed; the file's own header comment describing it is stale, confirmed by CC-002). Master Plan §32/§33 state explicitly, twice: "restano INVESTIGATE".

---

## Target Ontology Implementation

23 target ontology objects (Master Plan §3). Status values: `EXISTS` / `PARTIAL` / `TO_BUILD` / `UNCERTAIN`.

| Object | Status | Current Representation | Paths | Implementation Block | Notes |
|---|---|---|---|---|---|
| Organization | EXISTS | analytics.tenant table + TenantService. | `supabase/migrations/001_live_v1_foundation.sql`, `services/tenant/TenantService.ts` | — | No gap. |
| ProgramDefinition | TO_BUILD | Flat programs.json (data/synthetic/programs.json), company_id-scoped, no owner-type split (company/partner/territory) — a data-shape analog only, not code implementing this object. | — | N1 | Zero code hits for the term "ProgramDefinition" anywhere in the repo (confirmed by exhaustive grep, CC-001R + CC-001 both independently). |
| ProgramParticipation | TO_BUILD | Not separated from ProgramDefinition. | — | N1 | Same gap as ProgramDefinition. |
| InvestmentCase | TO_BUILD | No representation found. | — | N2 | Zero code hits. |
| EvidencePlan | TO_BUILD | No representation found. | — | — | Zero code hits, distinct from the Evidence type scaffold (see Evidence entry below). |
| DecisionRule | TO_BUILD | No representation found — distinct from the runtime eligibility-gate.ts classifier. | — | — | Zero code hits. |
| Delivery / Opportunity | PARTIAL | Fragmented across 3 independent "opportunity" surfaces plus the Commons cross-tenant booking pattern. | `services/worker-opportunity/`, `app/worker/opportunities/`, `app/company/opportunities/`, `app/my-kora/opportunities/`, `supabase/migrations/025_commons_booking_contribution.sql` | — | Not unified under one Delivery object tied to a ProgramDefinition. |
| Observation | TO_BUILD | Closest analog is the UEF record (services/uef-review/) — not formally typed as an Observation with an eligible/exposed/aware/activated state chain, so not counted as implementing code for this object. | — | — | No append-only eligible/exposed/aware/activated event table found in any of the 48 migrations. |
| Measurement | PARTIAL | IU, KORA Index, Confidence, Contribution all exist as computed outputs, but not unified under one lineage_id / snapshot model. | `lib/kora-engine/` | B-LIN | No kora.calculation_lineage table found. |
| InvestmentReview | TO_BUILD | No representation found. | — | N7 | Zero code hits. |
| DecisionEvent | TO_BUILD | No append-only, trigger-enforced table or type found anywhere. | — | N8 | Confirms I13 "assente" — zero CREATE TRIGGER for any decision/event table across all 48 migrations. |
| SubsequentObservation | TO_BUILD | No representation — Master Plan itself notes this is expected pre-second-cycle (time-limited, not code-limited). | — | — | Master Plan: "si popola al secondo ciclo reale". |
| Worker | EXISTS | personal.worker_identity + lib/worker-identity/*. | `supabase/migrations/007_worker_provisioning.sql`, `supabase/migrations/048_worker_identity_lifecycle_protection.sql`, `lib/worker-identity/` | — | Mature, actively hardened — matches current branch HEAD. |
| PIB | EXISTS | personal.worker_pib, SECURITY DEFINER-only aggregation. | `supabase/migrations/018_worker_pib.sql`, `supabase/migrations/027_worker_individual_rls_refactor.sql`, `services/worker-pib/`, `services/pib-aggregation/` | — | Isolation independently confirmed — zero application-role policies (I3). |
| Partner | EXISTS | network.partner_identity / partner_profile. | `supabase/migrations/010_partner_profile.sql`, `supabase/migrations/012_partner_identity.sql` | — | No gap found. |
| Advisor | PARTIAL | Service exists, demo-only surface (app/demo/advisor) — no live /advisor workspace route despite CLAUDE.md documenting one. | `services/advisor-evidence-review/` | — | Gap is vs CLAUDE.md's own documented app structure, not vs the Master Plan. |
| Territory / Local Entity | PARTIAL | Untyped string field (territory) on collective-initiatives.json — real form, not a typed entity. | `data/synthetic/collective-initiatives.json` | — | Master Plan §1 [VERIFIED]: "territorio ... non ancora tipizzate". |
| Evidence | PARTIAL | Fields on UEF/ImpactUnit records; a types-only scaffold for a first-class entity exists but is not implemented. | `lib/types/domains/evidence.ts` | Gate 2 (per the scaffold's own header) | Verified by direct read (CC-002): "No persistence in KORA Foundation Light: types only." |
| Benchmark Cohort / Memory | TO_BUILD | Only as disclaimed narrative copy / demo mockup (app/demo/benchmarks) — a UI placeholder, not code implementing this object. | — | N9 | Matches Master Plan's own "Stage 0" expectation until ≥10 companies. |
| MethodologySnapshot | PARTIAL | methodology_version_id / calibration_status columns exist on ≥4 tables since migration 001/005, but not unified — 4 different naming schemes per the Master Plan. | `supabase/migrations/001_live_v1_foundation.sql`, `supabase/migrations/005_impact_unit_trace_layer.sql` | B-SNAP | Master Plan §11: "001:70 usa 'KORA Methodology v0.1', 005:45 usa 'KORA-METHOD-v1.0' — quattro nomi per una cosa sola." |
| Data Lineage | TO_BUILD | No canonical lineage reconstruction path found. | — | B-LIN | Confirms I12 "assente" — zero lineage_id hits repo-wide (2 independent exhaustive greps). |
| KORA Link | EXISTS | Full schema, RLS, RPC — flag-disabled (KORA_LINK_ENABLED=false) but functionally complete. | `lib/kora-link/`, `supabase/migrations/034_kora_link_schema.sql` | — | Master Plan §33 [VERIFIED]: "gap DG-07 chiusi". |
| KORA Contribution | EXISTS | Service + live API, correctly kept separate from KORA Index — but split across two non-communicating implementations (lib/ vs services/). | `services/kora-contribution/KoraContributionService.ts`, `lib/kora-contribution/contribution-methodology.ts` | — | CC-002 confirmed: genuine fragmentation, not a methodology/orchestration layering as previously hypothesized. |
