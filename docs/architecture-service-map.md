# KORA — Architecture Service Map

**Version:** B89-B | **Date:** 2026-06-07 | **Status:** Foundation Light v0.1

This document is the handoff reference for Next engineers inheriting the KORA codebase.
It describes every service, its role, its consumers, and what to watch out for.

---

## Quick Reference — Critical Rules

1. **Scoring**: All app routes consume scoring via `lib/scoring-result/index.ts` (`useScoringResult()`). Never import `ScoringSimulatorService`, `DynamicScoringPreviewService`, or `run-kora-pipeline` directly in `app/` or `components/`.

2. **Permissions**: Two route maps exist — `getAccessibleRoutes()` (production middleware) and `getDemoNavigationRoutes()` (demo navigation). Do not confuse them. See `lib/permissions/index.ts`.

3. **Reporting**: Two services (`ReportFactoryService`, `ReportGeneratorService`) currently consumed simultaneously by the reports page. This is architectural debt. The factory should be the only entry point. See Task 9 note below.

4. **Evidence**: Evidence exists as fields on `UEFRecord` and `ImpactUnit` in Foundation Light v0.1. The `lib/types/domains/evidence.ts` scaffold defines first-class evidence entities for Pilot+.

5. **Privacy**: All employer-facing data passes through `RolePermissionService` + `PrivacyVisibilityService`. Never bypass these services.

---

## Service Inventory — 50 Services

### Scoring Domain

| Service | Path | Mode | Authoritative? | Consumers |
|---|---|---|---|---|
| `ScoringSimulatorService` | `services/scoring-simulator/` | DEMO | No — reads synthetic seed | `lib/scoring-result` (demo branch), `ReportFactoryService` |
| `DynamicScoringPreviewService` | `services/dynamic-scoring/` | PREVIEW | No — proxy estimates | `ReportGeneratorService` (one method only) |
| `run-kora-pipeline` (not a class) | `lib/kora-engine/run-kora-pipeline.ts` | LIVE | **YES** — full 14-stage engine | `lib/scoring-result` (live branch) |
| `IUComputationService` | `services/iu-computation/` | LIVE | Yes — Stage 10 IU | `run-kora-pipeline` |
| `PIBAggregationService` | `services/pib-aggregation/` | LIVE | Yes — Stage 11 PIB | `run-kora-pipeline` |

**Scoring adapters** (new in B89-B) — `services/scoring/`:
- `DemoScoringAdapter` — wraps ScoringSimulatorService, implements `IScoringService`
- `PreviewScoringAdapter` — wraps DynamicScoringPreviewService, implements `IScoringService`
- `LiveScoringAdapter` — wraps run-kora-pipeline, implements `IScoringService`

**Canonical contract:** `services/scoring/IScoringService.ts`

---

### Permission & Privacy Domain

| Service | Path | Lines | Role | Notes |
|---|---|---|---|---|
| `RolePermissionService` | `services/role-permission/` | 27L | Thin role resource wrapper | Calls `resolvePermission()` from `lib/permissions/index.ts` |
| `PrivacyVisibilityService` | `services/privacy-visibility/` | 30L | Employer suppression gate | Blocks pib, uef, impact_units, my_kora, worker_profiles for employer roles |
| `AccessControlService` | `services/access-control/` | 175L | Demo user registry | Contains `allowed_routes` per demo user — do not use for production middleware |
| `lib/permissions/index.ts` | `lib/permissions/` | 89L+ | Route auth | **Two functions**: `getAccessibleRoutes()` = production; `getDemoNavigationRoutes()` = demo |

**WARNING:** `AccessControlService.allowed_routes` does not match actual sidebar navigation. Use `getDemoNavigationRoutes()` for navigation decisions, not `allowed_routes`.

**WARNING:** `getAccessibleRoutes()` intentionally restricts `COMPANY_ADMIN` and `COMPANY_VIEWER` to `/company/workspace` only. This is correct for the production live auth path (B36.1 decision). Use `getDemoNavigationRoutes()` for demo sidebar navigation.

---

### Reporting Domain

| Service | Path | Lines | Role | Notes |
|---|---|---|---|---|
| `ReportGeneratorService` | `services/report-generator/` | 1088L | **Content generation** — Decision Pack body, metrics, insights | Should eventually be consumed only via ReportFactoryService |
| `ReportFactoryService` | `services/report-factory/` | 489L | **Orchestrator** — versioning, metadata, export actions, period comparison | Target: sole entry point for reports page |

**ARCHITECTURAL DEBT:** `app/company/reports/page.tsx` imports and calls both services directly. Target architecture: reports page calls only `ReportFactoryService`, which calls `ReportGeneratorService` internally. Resolve before Pilot+.

---

### Ingestion Domain

| Service | Path | Role | Notes |
|---|---|---|---|
| `IngestionSimulatorService` | `services/ingestion-simulator/` | BCM taxonomy demo classifier | AI Upload Studio demo. No external LLM calls. |
| `IngestionPipelineService` | `services/ingestion-pipeline/` | Company guided upload pipeline | Consumes `IngestionNormalizerService` |
| `IngestionNormalizerService` | `services/ingestion-normalizer/` | Raw row normalization | **NOT orphaned** — consumed by `IngestionPipelineService` (line 8). Consider inlining into pipeline at Pilot+. |

---

### Evidence & Attribution Domain

| Service | Path | Role | Notes |
|---|---|---|---|
| `ConfidenceScoreService` | `services/confidence-score/` | Confidence Score (CS) computation | CS is external to KORA Index v3 — weight = 0, shown separately |
| `WorkerAttributionService` | `services/worker-attribution/` | Pillar attribution, exclusion reasoning, Dynamic CV wiring | Worker-facing, privacy enforced |
| `AdvisorEvidenceReviewService` | `services/advisor-evidence-review/` | Advisor submit/review loop | Consumed by `app/advisor/page.tsx` |
| `EvidenceReliabilityService` | `services/evidence-reliability/` | Evidence reliability metrics | See also `lib/types/domains/evidence.ts` for Pilot+ entity model |

---

### Worker Space Domain

| Service | Path | Privacy enforcement | Notes |
|---|---|---|---|
| `DynamicCVService` | `services/dynamic-cv/` | WORKER + KORA_ADMIN only | Never accessible to employer roles |
| `MyKoraPreviewService` | `services/my-kora-preview/` | WORKER + KORA_ADMIN | Preview card shown in company cockpit (aggregates only, no individual data) |
| `WorkerOpportunityService` | `services/worker-opportunity/` | WORKER + KORA_ADMIN | Calls MyKoraPreviewService for pillar breakdown |
| `WorkerPillarAdoptionService` | `services/worker-pillar-adoption/` | WORKER only | Pillar engagement data |
| `WorkerProvisioningService` | `services/worker-provisioning/` | KORA_ADMIN only | Worker account lifecycle |
| `WorkerSpaceService` | `services/worker-space/` | Employer: aggregate safe only | Company-facing aggregated worker engagement |
| `BookingRequestService` | `services/booking-request/` | WORKER only | Request/confirm only — no pricing, no payment |

---

### Company Intelligence Domain

| Service | Path | Notes |
|---|---|---|
| `ActivationOpportunityService` | `services/activation-opportunity/` | 20 deterministic rules R-01→R-20. Clean, testable. |
| `ExplainabilityService` | `services/explainability/` | Next-best-actions, concept explanations |
| `ActivationSafeguardService` | `services/activation-safeguard/` | CLEAR/WARNING/FLAGGED per D-21 thresholds |
| `KoraContributionService` | `services/kora-contribution/` | Companion indicator — NEVER merged into KORA Index |
| `BudgetToHumanImpactService` | `services/budget-to-human-impact/` | BTI macroblock — separate from component values |
| `FinancialGovernanceService` | `services/financial-governance/` | Budget governance layer |
| `CompanyIntelligenceService` | `services/company-intelligence/` | Company-level aggregated signals |
| `CompanyDataIntakeService` | `services/company-data-intake/` | Admin-side upload tracking |
| `CompanyOnboardingService` | `services/company-onboarding/` | Onboarding workflow |
| `CompanySetupService` | `services/company-setup/` | Company configuration |

---

### Platform Domain

| Service | Path | Notes |
|---|---|---|
| `TenantService` | `services/tenant/` | Tenant registry and lookup |
| `AccountService` | `services/account/` | User account management |
| `ScenarioService` | `services/scenario/` | S1/S2/S3/S4 scenario config |
| `DemoDataService` | `services/demo-data/` | Synthetic seed access layer |
| `FounderValidationService` | `services/founder-validation/` | Internal/admin-only |
| `LifecycleService` | `services/lifecycle/` | Audit trail and lifecycle events |
| `WorkforceBaselineService` | `services/workforce-baseline/` | Workforce baseline data |

---

### Demo-Only Services

These services exist only for Foundation Light demo mode. They do not have Pilot+ equivalents.

| Service | Notes |
|---|---|
| `AdminPreviewService` | Admin live preview — demo scaffolding |
| `MappingConfidenceService` | BCM taxonomy mapping confidence — demo AI simulation |
| `BTIIntelligenceService` | BTI commentary and framing |
| `CareEconomyService` | Care Economy signals (premium module stub) |
| `EquityAccessService` | Equity Access signals (premium module stub) |
| `ExecutiveIntelligenceService` | Executive cockpit aggregations |
| `LifeDiversityService` | LIFE pillar diversity signals |

---

## Scoring Path Architecture

```
                       DEMO (synthetic seed)
                       ┌────────────────────────────────────────┐
                       │ ScoringSimulatorService                │
                       │ reads: data/synthetic/kora-index*.json │
                       │ mode: DEMO, isAuthoritative: false     │
                       └────────────────────────────────────────┘
                                        ↑
app/ routes/components                  │
     ↓                                  │
lib/scoring-result/index.ts ───── environment='demo' ──────────
  useScoringResult()                    │
     │                                  ↓
     └───── environment='live' ──→ fetchLiveScoringResult
                                        │
                                        ↓
                                   lib/live/scoring-mapper.ts
                                   (maps Supabase rows → KORA types)
                                        │
                                        ↓
                                   run-kora-pipeline (LIVE)
                                   full 14-stage engine
                                   isAuthoritative: true

     PREVIEW (proxy estimates) — NOT in useScoringResult:
     DynamicScoringPreviewService → ReportGeneratorService only
```

---

## Permission Model Architecture

```
PRODUCTION (live server auth):
  getAccessibleRoutes(role) → limited route set
    COMPANY_ADMIN/VIEWER → /company/workspace only (B36.1)
    KORA_ADMIN → full /admin + /company/* set
    WORKER → /my-kora/* only
    PARTNER → /partner
    ADVISOR → /advisor

DEMO (synthetic demo, no live auth):
  getDemoNavigationRoutes(role) → full demo navigation
    COMPANY_ADMIN/VIEWER → all /company/* routes (DEMO_SYNTHETIC data)
    KORA_ADMIN → /admin + /company/* + /future-vision
    WORKER → /my-kora/* only (never /company/*)
    PARTNER → /partner
    ADVISOR → /advisor

PRIVACY ENFORCEMENT (always, both modes):
  RolePermissionService.canAccess(role, resource)
  PrivacyVisibilityService.isSuppressed(role, dataType, groupSize)
  → employer roles never see pib, uef, individual worker data, My KORA content
```

---

## Missing Blocks for Pilot+

| Block | Priority | Description |
|---|---|---|
| `IScoringService` contract | DONE (B89-B) | `services/scoring/IScoringService.ts` |
| Route authorization accuracy | DONE (B89-B) | `getDemoNavigationRoutes()` added |
| Evidence entity lifecycle | DONE (B89-B) | `lib/types/domains/evidence.ts` |
| `EvidenceRepository` | Pilot+ | Persists `EvidenceRecord` and `VerificationRecord` — requires Gate 2 |
| `IReportService` interface | Pilot+ | Formal contract between factory and generator |
| End-to-end pipeline integration test | DONE (B89-B) | `tests/unit/b89b-pipeline-integration.test.ts` |
| Type domain split | Pilot+ | `lib/types/domains/` scaffold ready — see README |

---

## What NOT to do (Pilot+ handoff guide)

- **Never bypass `lib/scoring-result/index.ts`** — import scoring services directly in app routes at your peril.
- **Never use `getAccessibleRoutes()` for demo sidebar** — use `getDemoNavigationRoutes()`.
- **Never use `AccessControlService.allowed_routes`** for real middleware — it's a demo registry, not an auth policy.
- **Never import `workers.json`, `pib-records.json`, `impact-units.json` in employer-facing components** — these are worker-private seed files.
- **Never merge KORA Contribution into KORA Index** — they are separate outputs; `KoraContributionService` is never aggregated into the KORA Index v3 computation.
- **Never generate SQL DDL or Prisma models before Gate 2 closes.**
