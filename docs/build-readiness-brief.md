# KORA Foundation Light — Build Readiness Brief
**Document:** `docs/build-readiness-brief.md`
**Type:** Pre-Code Readiness Statement
**Audience:** Claude Code, Build Lead, Frontend Developer, Full-Stack Developer
**Status:** v1.0 — Active Build Reference
**Gate dependency:** GO FOR DEMO APP WITH SYNTHETIC DATA. SQL blocked until Gate 2.

---

## 1. KORA Understanding Summary

The following bullets confirm what Claude Code understands about KORA before any code is written. These are not aspirational descriptions — they are implementation constraints.

- **KORA measures organizations, not individuals.** The KORA Index is a company-level output. Individual IU, PIB, and UEF records are internal intermediaries that are never surfaced to employer roles.

- **KORA is not a welfare platform, not an HR tool, not a wellbeing tracker, not a reward system, not a marketplace, not a booking engine, not a social network, and not an employee surveillance system.** Every product decision must preserve this identity.

- **KORA is a Human Impact Intelligence Platform.** Its core value proposition is transforming heterogeneous organizational data into structured, explainable, privacy-safe activation intelligence.

- **Foundation Light v0.1 is a controlled demo with synthetic data.** No real worker data, no real company data, no live integrations. Every seed file is labeled `synthetic_demo_data: true`.

- **My KORA is the worker value layer — not employer surveillance.** Workers see their own Personal Impact Balance and personal impact timeline. Employers see nothing from this layer. The distinction is architectural and non-negotiable.

- **Partner and advisor layers are intentionally light.** Partners are verified ecosystem actors, not marketplace vendors. Advisors validate evidence quality. Neither layer includes booking engines, pricing, or payment flows.

- **KORA Contribution is a companion indicator.** It measures collective and ecosystem engagement and is displayed separately from the KORA Index. It is never a KORA Index component.

- **Confidence Score and explainability are mandatory outputs.** Every KORA Index surface must show the Confidence Score and a plain-language explanation. These are not optional UX additions — they are architectural requirements (doc 21b).

- **Activation Safeguard is mandatory and non-bypassable.** It sits between Company Aggregation and the KORA Index Engine. Status: CLEAR / WARNING / FLAGGED. If FLAGGED, the KORA Index is blocked or qualified. The company cannot configure or disable it.

- **The 14-stage algorithm is canonical and non-reorderable.** No stage may be skipped. PIB (Stage 11) is a mandatory intermediate layer. Company Aggregation (Stage 12) cannot bypass PIB.

- **All methodology weights are read from versioned config.** `lib/methodology-config/v0.1.ts` is the single source of methodology truth. Nothing is hardcoded.

- **The AI Ingestion Assistant uses a rule-based BCM taxonomy classifier.** No external LLM API may be called on HR or worker data. This is a confirmed founder decision (doc 19 §9.2).

- **Employer roles have zero access to individual worker data.** This is enforced in the demo via `RolePermissionService` and `PrivacyVisibilityService` — not by hiding data in the UI but by never routing it to employer-facing components in the first place.

- **Safe aggregation threshold is 10.** Any employer-facing segment showing fewer than 10 workers is suppressed with a `PrivacyBoundaryNotice`.

- **Gate 2 is OPEN. doc 22 (SQL schema specification) does not yet exist.** All production schema, SQL DDL, Prisma models, Supabase provisioning, and production backend code remain blocked until Gate 2 (CTO review) is formally closed.

- **The demo must feel real.** Foundation Light is not a clickable mockup. It must demonstrate the full intelligence loop — from file upload through explainable KORA Index — with data density and narrative power sufficient to earn a meeting with a CHRO or CFO.

- **Worker adoption is a commercial dependency.** My KORA is not an afterthought. Without worker adoption, the KORA Index degrades over time. My KORA must be built to full demo quality alongside the company side.

- **No score may be presented as certified, empirically validated, or regulatory-grade.** Foundation Light v0.1 produces pilot-grade diagnostic intelligence. Every score carries `calibration_status = 'pre_empirical_calibration'`.

---

## 2. Demo Architecture Target

The demo architecture is a **projection of the future production architecture**, not a bypass of it.

| Layer | Demo Implementation | Production Replacement (post-Gate 2) |
|---|---|---|
| Data | Local JSON seed files in `/data/synthetic/` | PostgreSQL (Supabase) — 6-schema database per doc 12 |
| Auth | Role switcher (demo-only component) | Supabase Auth + RBAC per doc 24 permission matrix |
| Scoring | `ScoringSimulatorService` reading from seed + config | Live scoring engine with IU → PIB → Aggregation pipeline |
| Ingestion | `IngestionSimulatorService` with preloaded file simulation | Real ingestion pipeline with BCM classifier |
| Privacy | `PrivacyVisibilityService` with role-based suppression | PostgreSQL grant-absence + RLS per doc 12 Section 26 |
| API | Next.js API routes with mock implementations | Real backend services with production RBAC |
| File storage | Local files only | Blob storage (S3/Supabase Storage) for evidence records |
| Methodology | `lib/methodology-config/v0.1.ts` | `gov.kora_index_weight_versions` in production DB |

**What is never implemented (Foundation Light scope):**
- Production DB provisioning of any kind
- Real-time data pipelines
- Production authentication flows
- Payment, wallet, or fiscal execution
- Live fiscal/tax guardrails
- External LLM on HR/worker data
- Worker accounts with real identity

---

## 3. Demo Architecture vs Production Architecture

| Demo Construct | Purpose in Demo | Future Production Equivalent | Gate Dependency | Boundary |
|---|---|---|---|---|
| Local JSON seed files | Provide structured synthetic data for all screens | PostgreSQL tables per doc 12 schema | Gate 2 (SQL blocked) | JSON shapes are NOT the production schema. Do not derive Prisma from them. |
| Role switcher | Simulates 11 platform roles for demo presentation | Supabase Auth + role assignments + JWT claims | Gate 2 + Gate 3 | Switcher is UI-only. Role enforcement is in RolePermissionService. |
| Scenario switcher | Swaps between S1 (WARNING) and S2 (CLEAR) scoring states | Live scoring run selection against real DB | Gate 2 | Scenarios are precomputed seed states — not live computation. |
| Mock API routes | Simulate API behavior with real fetch semantics | Real backend services with DB queries | Gate 2 | No real DB behind mock routes. No live integrations. |
| Ingestion simulator | Simulates file upload → AI mapping → UEF draft flow | Real BCM classifier + privacy layer + UEF pipeline | Gate 2 + Gate 3 | BCM taxonomy only — no LLM API calls. |
| UEF review simulator | Simulates approve/reject/flag workflow on pre-mapped events | Real UEF review with `review_decision` + `eligible_for_scoring` | Gate 2 | Review decisions are simulated state — not persisted to DB. |
| Scoring simulator | Computes KORA Index from seed data + config weights | Live IU → PIB → Aggregation → Safeguard → Index pipeline | Gate 2 | Reads from methodology-config. No hardcoded weights. |
| PrivacyVisibilityService | Suppresses employer access to individual worker data | Grant-absence enforcement + RLS in PostgreSQL | Gate 2 | Suppression must be data-driven, not hardcoded UI flags. |
| Report preview | Assembles report from seed data; print-to-PDF | Server-rendered reports from live DB + templating service | Gate 2 | No third-party PDF SaaS. Browser print CSS only. |
| Dynamic CV mock | Worker-self-only view of career milestones and sharing settings | `personal.worker_cv_items` + `personal.worker_consent_records` | Gate 2 + Gate 3 | Employer roles must never access this. DynamicCVService is worker-self-only. |
| Booking Light mock | Request/confirm state machine for partner services | `personal.worker_participation_requests` + partner API | Gate 2 + Gate 3 | No pricing, no availability engine, no payment path. |
| Partner / advisor light mock | Lightweight workspace views for partner and advisor roles | Full partner portal and advisor portal post-Foundation | Gate 2 | No marketplace, no certification LMS, no booking engine. |

---

## 4. P0 Build Scope

Phase 0 creates the navigable scaffold foundation. It must be architecture-aligned from day one.

### P0 Must Include:

- **App shell** — Next.js App Router structure with all top-level routes
- **Navigation** — sidebar with role-aware menu items
- **Role switcher** — toggle between all 11 platform roles (demo-only, labeled)
- **Scenario switcher** — toggle between S1 (WARNING / pre-improvement) and S2 (CLEAR / improved)
- **Synthetic data loader** — `DemoDataService` reading from `/data/synthetic/` seed files
- **Mock service interfaces** — all 15 services defined with TypeScript interfaces, even if stubbed
- **Executive Cockpit skeleton** — placeholder with KORA Index card, Confidence, calibration_status label, Safeguard badge, 10-component breakdown shell
- **KORA Index Detail skeleton** — 10-component breakdown, explainability panel placeholder, methodology version display
- **AI Mapping Review skeleton** — upload panel, mapping suggestions table, confidence score column, approve/reject controls
- **UEF Review skeleton** — event table with pillar, source type, evidence level, review status, approve/reject/flag controls
- **Scoring Run skeleton** — run parameters panel, formula trace placeholder, output summary
- **My KORA Home skeleton** — worker-private, employer-suppressed; pillar summary, personal impact timeline placeholder
- **Privacy & Sharing skeleton** — consent record list, sharing toggles, privacy settings
- **Dynamic CV Light skeleton** — item list with status labels, sharing controls placeholder
- **Report cards skeleton** — report type list, export button placeholder

### P0 Must NOT Include:

```
✗ Production database of any kind
✗ Authentication system
✗ SQL DDL, Prisma schema, Supabase provisioning
✗ Worker production accounts
✗ Payments, wallet, or KIP execution
✗ Partner marketplace or full booking engine
✗ KORA Link operational logic
✗ Live fiscal/tax outputs
✗ External LLM API calls on HR/worker data
✗ Hardcoded methodology weights
✗ Real company or worker data
```

---

## 5. Proposed File Tree (Phase 0)

Document only — do not create yet. Creation instructions are in `docs/phase-0-scaffold-plan.md`.

```
kora-demo/
├── app/
│   ├── layout.tsx                              ← Root layout (AppShell wrapper)
│   ├── page.tsx                                ← Root redirect → role-based home
│   ├── admin/
│   │   ├── layout.tsx
│   │   └── page.tsx                            ← A-01: Admin Dashboard
│   ├── company/
│   │   ├── layout.tsx
│   │   ├── page.tsx                            ← C-01: Executive Cockpit
│   │   ├── kora-index/
│   │   │   └── page.tsx                        ← C-02: KORA Index Detail
│   │   ├── ingestion/
│   │   │   ├── page.tsx                        ← C-03: AI Upload Studio
│   │   │   └── mapping-review/
│   │   │       └── page.tsx                    ← C-04: AI Mapping Review
│   │   ├── uef-review/
│   │   │   └── page.tsx                        ← C-05: UEF Review
│   │   ├── scoring/
│   │   │   └── page.tsx                        ← C-06: Scoring Run
│   │   ├── reports/
│   │   │   └── page.tsx                        ← C-07: Reports
│   │   ├── activation/
│   │   │   └── page.tsx                        ← C-08: Activation & Participation
│   │   ├── data/
│   │   │   └── page.tsx                        ← C-09: Data & Evidence
│   │   └── financial/
│   │       └── page.tsx                        ← C-10: Financial Governance Light
│   ├── my-kora/
│   │   ├── layout.tsx
│   │   ├── page.tsx                            ← W-01: My KORA Home
│   │   ├── privacy/
│   │   │   └── page.tsx                        ← W-02: Privacy & Sharing
│   │   ├── dynamic-cv/
│   │   │   └── page.tsx                        ← W-03: Dynamic CV Light
│   │   ├── opportunities/
│   │   │   └── page.tsx                        ← W-04: Opportunities
│   │   ├── bookings/
│   │   │   └── page.tsx                        ← W-05: Booking Requests
│   │   └── collective/
│   │       └── page.tsx                        ← W-06: Collective Impact Events
│   ├── partner/
│   │   ├── layout.tsx
│   │   └── page.tsx                            ← P-01: Partner Dashboard
│   ├── advisor/
│   │   ├── layout.tsx
│   │   └── page.tsx                            ← AD-01: Advisor Dashboard
│   └── future-vision/
│       ├── layout.tsx
│       └── page.tsx                            ← FV-01: Future Vision Overview
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── demo/
│   │   ├── RoleSwitcher.tsx
│   │   ├── ScenarioSwitcher.tsx
│   │   └── PersonaSwitcher.tsx
│   ├── kora-index/
│   │   ├── KoraIndexHero.tsx
│   │   ├── ComponentBreakdown.tsx
│   │   ├── ExplainabilityPanel.tsx
│   │   └── MethodologyLabel.tsx
│   ├── privacy/
│   │   ├── PrivacyBoundaryNotice.tsx
│   │   └── AccessDeniedState.tsx
│   ├── badges/
│   │   ├── SafeguardBadge.tsx
│   │   └── CalibrationBadge.tsx
│   └── charts/
│       ├── PillarChart.tsx
│       └── ComponentBreakdownChart.tsx
│
├── services/
│   ├── demo-data/
│   │   └── DemoDataService.ts
│   ├── scenario/
│   │   └── ScenarioService.ts
│   ├── role-permission/
│   │   └── RolePermissionService.ts
│   ├── privacy-visibility/
│   │   └── PrivacyVisibilityService.ts
│   ├── ingestion-simulator/
│   │   └── IngestionSimulatorService.ts
│   ├── mapping-confidence/
│   │   └── MappingConfidenceService.ts
│   ├── uef-review/
│   │   └── UEFReviewService.ts
│   ├── scoring-simulator/
│   │   └── ScoringSimulatorService.ts
│   ├── activation-safeguard/
│   │   └── ActivationSafeguardService.ts
│   ├── explainability/
│   │   └── ExplainabilityService.ts
│   ├── kora-contribution/
│   │   └── KoraContributionService.ts
│   ├── report-generator/
│   │   └── ReportGeneratorService.ts
│   ├── booking-request/
│   │   └── BookingRequestService.ts
│   ├── dynamic-cv/
│   │   └── DynamicCVService.ts
│   └── founder-validation/
│       └── FounderValidationService.ts
│
├── lib/
│   ├── types/
│   │   └── index.ts
│   ├── constants/
│   │   └── kora.ts
│   ├── methodology-config/
│   │   └── v0.1.ts
│   ├── formatters/
│   │   └── index.ts
│   ├── permissions/
│   │   └── index.ts
│   └── demo-state/
│       └── index.ts
│
├── data/
│   ├── synthetic/
│   │   └── .gitkeep                            ← 29 seed files go here
│   ├── scenarios/
│   │   └── .gitkeep                            ← S1, S2, S3, S4 configs
│   └── methodology/
│       └── methodology-config.json             ← Weights, thresholds, version
│
├── public/                                     ← Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md                                   ← Demo-only disclosure
```

---

## 6. Mock Services Required

### DemoDataService
- **Purpose:** Central seed file loader and data access point. All other services depend on it.
- **Inputs:** `scenarioId: string`, `companyId: string`, `resource: SeedResourceType`
- **Outputs:** Typed data arrays from the appropriate seed file
- **Future production replacement:** Direct database queries via production service layer
- **Forbidden shortcuts:** Must not expose raw file contents — returns typed, role-filtered objects only

### ScenarioService
- **Purpose:** Manages demo scenario switching. Returns which scenario is active and loads its config.
- **Inputs:** `scenarioId: 'S1' | 'S2' | 'S3' | 'S4'`
- **Outputs:** `ScenarioConfig` — active company profile, scoring state, narrative context
- **Future production replacement:** Scoring run selection UI against live DB
- **Forbidden shortcuts:** Must not conflate scenario switching with live scoring re-computation

### RolePermissionService
- **Purpose:** Resolves what any given role may access. Single source of permission truth in the demo.
- **Inputs:** `role: KoraRole`, `resource: string`, `context?: { companyId?: string; workerId?: string }`
- **Outputs:** `{ allowed: boolean; reason?: string }`
- **Future production replacement:** Server-side RBAC + JWT claims + Supabase RLS
- **Forbidden shortcuts:** Must never return `allowed: true` for employer roles on individual worker resources

### PrivacyVisibilityService
- **Purpose:** Determines whether data should be suppressed based on role, data type, and group size.
- **Inputs:** `role: KoraRole`, `dataType: PrivacyDataType`, `groupSize?: number`
- **Outputs:** `{ suppressed: boolean; reason: PrivacySuppressReason; threshold?: number }`
- **Future production replacement:** Database-layer privacy enforcement (grant-absence + RLS)
- **Forbidden shortcuts:** Must use `safe_aggregation_threshold = 10`. Must not allow employer roles to see suppressed individual data

### IngestionSimulatorService
- **Purpose:** Simulates the file ingestion flow — upload, parsing, AI column mapping with confidence scores, data quality flags.
- **Inputs:** `sourceType: SourceType`, `batchId: string`, `scenarioId: string`
- **Outputs:** `IngestionResult` — mapped column suggestions, confidence scores per field, ambiguous field flags
- **Future production replacement:** Real BCM taxonomy classifier service (rule-based, no LLM)
- **Forbidden shortcuts:** Must not call any external LLM API. Must not return mapping suggestions without confidence scores.

### MappingConfidenceService
- **Purpose:** Simulates BCM taxonomy classification. Assigns pillar, event type, and confidence score to each mapped field.
- **Inputs:** `columnHeader: string`, `sampleValues: string[]`, `sourceType: SourceType`
- **Outputs:** `MappingResult` — `pillarCode`, `eventTypeCode`, `confidenceScore: 0–1`, `requiresHumanReview: boolean`
- **Future production replacement:** Production BCM classifier with BCM taxonomy rule engine
- **Forbidden shortcuts:** Must surface low-confidence mappings for human review. Never auto-approve confidence < 0.60.

### UEFReviewService
- **Purpose:** Simulates the UEF review workflow — approve, reject, flag individual events. Tracks review state.
- **Inputs:** `batchId: string`, `action: 'approve' | 'reject' | 'flag'`, `eventIds: string[]`, `reviewNote?: string`
- **Outputs:** `UEFReviewState` — updated record list with `review_decision` and `eligible_for_scoring` per event
- **Future production replacement:** Real UEF review with DB persistence of `review_decision` + `eligible_for_scoring`
- **Forbidden shortcuts:** Must not allow scoring to proceed on records where `eligible_for_scoring = false`

### ScoringSimulatorService
- **Purpose:** Computes KORA Index from approved UEF seed data using the methodology config. Simulates the full IU → PIB → Aggregation → Safeguard → Index pipeline.
- **Inputs:** `companyId: string`, `scenarioId: string`, `reportingPeriod: string`
- **Outputs:** `KoraIndexOutput` — index value, 10 components with values and weights, `calibration_status`, `methodology_version_id`, `confidence_score`, `safeguard_status`
- **Future production replacement:** Live scoring engine executing the 14-stage algorithm against production DB
- **Forbidden shortcuts:** Must read all weights from `lib/methodology-config/v0.1.ts`. Must not hardcode any score component. Must always return `calibration_status = 'pre_empirical_calibration'`.

### ActivationSafeguardService
- **Purpose:** Computes Activation Safeguard status from AR and MAR values. Applies D-21 thresholds.
- **Inputs:** `ar: number`, `mar: number`
- **Outputs:** `{ status: 'CLEAR' | 'WARNING' | 'FLAGGED'; arValue: number; marValue: number; threshold: SafeguardThreshold }`
- **Future production replacement:** Integrated into live scoring engine pipeline; `activation_safeguard_results` table
- **Forbidden shortcuts:** Must implement D-21 thresholds exactly. Must never allow company to configure or override status.

### ExplainabilityService
- **Purpose:** Generates plain-language explanations for a KORA Index output. Explains each component, data quality impact, and limitations.
- **Inputs:** `koraIndexOutput: KoraIndexOutput`, `companyId: string`, `scenarioId: string`
- **Outputs:** `ExplainabilityRecord` — summary text, per-component explanations, data quality notes, limitations statement, methodology version
- **Future production replacement:** `analytics.kora_index_explanations` table with templated explanation generation
- **Forbidden shortcuts:** Must not present the score as certified, empirically validated, or regulatory-grade. Must include limitations statement.

### KoraContributionService
- **Purpose:** Returns KORA Contribution data — collective initiative participation, ecosystem reach. Kept separate from KORA Index at all times.
- **Inputs:** `companyId: string`, `scenarioId: string`
- **Outputs:** `KoraContributionOutput` — collective initiative list, participation counts, ecosystem reach indicators (separate from KORA Index value)
- **Future production replacement:** `analytics.kora_contributions` + `analytics.kora_ecosystem_reach` tables
- **Forbidden shortcuts:** Output must never be added to KORA Index value. Must be clearly labeled as a companion indicator.

### ReportGeneratorService
- **Purpose:** Assembles report data from seed files and scoring outputs for 8 report types.
- **Inputs:** `reportType: ReportType`, `companyId: string`, `scenarioId: string`, `role: KoraRole`
- **Outputs:** `ReportData` — structured sections appropriate to report type and role
- **Future production replacement:** Server-rendered report generation from live DB
- **Forbidden shortcuts:** Must apply role filtering — employer-facing reports must contain no individual worker data.

### BookingRequestService
- **Purpose:** Manages Booking Light state machine — request, confirm, complete, cancel. Request/confirm only.
- **Inputs:** `workerId: string`, `serviceId: string`, `action: BookingAction`
- **Outputs:** `BookingRequestState` — status transitions per request
- **Future production replacement:** `personal.worker_participation_requests` table + partner notification
- **Forbidden shortcuts:** Must not implement pricing, availability calendar, or payment path. Worker-self-only — no employer access.

### DynamicCVService
- **Purpose:** Returns worker's Dynamic CV items, milestone timeline, and sharing/consent settings. Worker-self-only.
- **Inputs:** `workerId: string` (must match authenticated worker persona)
- **Outputs:** `DynamicCVProfile` — `cvItems`, `milestones`, `sharingSettings`, `exportReadiness`
- **Future production replacement:** `personal.worker_cv_items` + `personal.worker_milestones` + `personal.worker_consent_records`
- **Forbidden shortcuts:** Must check that requesting role is `WORKER_MY_KORA`. Must throw if an employer role calls this service.

### FounderValidationService
- **Purpose:** Provides founder validation pipeline data — contacts, pipeline stages, KPIs, objections log. Admin/founder-only.
- **Inputs:** `role: KoraRole` (must be KORA Admin or Founder/Internal)
- **Outputs:** `ValidationPipeline` — contacts list, pipeline KPIs, objection catalog, revenue signals
- **Future production replacement:** CRM integration or internal validation DB
- **Forbidden shortcuts:** Must not expose validation contact data to company or worker roles.

---

## 7. Synthetic Seed Files Required

All files live in `/data/synthetic/`. They are local demo files only.

These files are NOT final production schema. They must not influence production database design without doc 22. JSON field names in seed files are demo-layer shapes, not database column names.

Every seed object must include these metadata fields:
```json
{
  "synthetic_demo_data": true,
  "scenario_id": "S1",
  "generated_for": "foundation_light_demo",
  "not_live_data": true
}
```

**Required files:**
1. `companies.json` — 4 synthetic companies (Meridiana Group primary; Nexo Digital, Fortis Industrial, Communitas Cooperativa as comparison)
2. `workers.json` — 250 synthetic worker records for Meridiana Group (pseudonymized — no real personal data)
3. `departments-sites.json` — 5 departments, 3 sites (HQ Milano, Plant Bergamo, Remote/Hybrid)
4. `programs.json` — 8 welfare/people programs with budget and pillar mapping
5. `source-batches.json` — ingestion batch metadata: 4 source types, quality scores, batch status
6. `raw-welfare-export.sample.json` — simulated welfare provider export (unmapped, before AI mapping)
7. `raw-lms-export.sample.json` — simulated LMS training completion export (unmapped)
8. `raw-hris-population.sample.json` — simulated HR system headcount and department export
9. `raw-esg-initiatives.sample.json` — simulated ESG initiative records (unmapped)
10. `raw-partner-events.sample.json` — simulated partner activity records (unmapped)
11. `uef-records.json` — approved UEF records after mapping and review (pre-IU computation)
12. `impact-units.json` — computed IU records per event per pillar (post-UEF, pre-PIB)
13. `pib-records.json` — Personal Impact Balance per worker per pillar (worker-private)
14. `company-aggregates.json` — company-level aggregation of worker PIB data
15. `kora-index-outputs.json` — KORA Index outputs for S1 and S2 scenarios (10 components, calibration_status)
16. `kora-contribution-outputs.json` — KORA Contribution outputs (separate from KORA Index)
17. `activation-safeguard-results.json` — Safeguard status results for all scenarios
18. `explainability-records.json` — Plain-language explanation records per scenario
19. `confidence-records.json` — Confidence Score computation detail records
20. `partner-catalog.json` — 12 synthetic partners with service types, pillar mapping, eligibility confidence
21. `opportunities.json` — Opportunity matching output per worker persona
22. `collective-initiatives.json` — 5 collective impact initiatives with participation data
23. `booking-requests.json` — Booking Light state machine records per worker persona (worker-private)
24. `dynamic-cv-items.json` — Dynamic CV items per worker persona (worker-private)
25. `milestones.json` — Worker milestone timeline items (worker-private)
26. `consent-records.json` — Worker consent and sharing preferences (worker-private)
27. `advisor-reviews.json` — Advisor review queue with evidence references and eligibility assignments
28. `reports.json` — 8 report type templates with populated section data
29. `founder-validation-contacts.json` — 25 validation contacts with pipeline stages, objections, revenue signals

**State:** These are local demo files only. Actual JSON generation is a separate step and must be requested explicitly after this plan is approved.

---

## 8. Screens to Build First

### P0 Screens (Phase 0 — scaffold only, data-powered skeletons):

| Screen | Route | Role Visibility |
|---|---|---|
| App Shell | `/` | All roles |
| Role Switcher | (overlay component) | All roles |
| Scenario Switcher | (overlay component) | Admin, Company |
| Executive Cockpit | `/company` | Company roles only |
| KORA Index Detail | `/company/kora-index` | Company roles only |
| AI Mapping Review | `/company/ingestion/mapping-review` | KORA Admin, Company HR |
| UEF Review | `/company/uef-review` | KORA Admin, Company HR |
| Scoring Run | `/company/scoring` | KORA Admin, Company Admin |
| Reports | `/company/reports` | Company roles (role-filtered) |
| My KORA Home | `/my-kora` | Worker only — employer suppressed |
| Privacy & Sharing | `/my-kora/privacy` | Worker only |
| Dynamic CV Light | `/my-kora/dynamic-cv` | Worker only |
| Future Vision | `/future-vision` | All roles (labeled inactive) |

### P1 Screens (Phase 1 — full implementation):

| Screen | Route | Role Visibility |
|---|---|---|
| Activation & Participation | `/company/activation` | Company roles |
| Data & Evidence | `/company/data` | KORA Admin, Company Admin, Company HR |
| Warnings & Next Actions | `/company/kora-index` (panel) | Company roles |
| Financial Governance Light | `/company/financial` | Company Admin, Company Finance |
| Partner Map | `/company/kora-index` (panel) | Company roles |
| Opportunities | `/my-kora/opportunities` | Worker only |
| Collective Impact Events | `/my-kora/collective` | Worker only |
| My Bookings & Requests | `/my-kora/bookings` | Worker only |
| Partner Workspace Light | `/partner` | Partner Admin Light |
| Advisor Workspace Light | `/advisor` | Advisor External Light |
| Founder Validation Cockpit | `/admin/founder-validation` | KORA Admin, Founder/Internal |
| Admin Dashboard | `/admin` | KORA Admin, Founder/Internal |

---

## 9. Forbidden Implementation Areas

The following must not be built at any point during Foundation Light:

**Production database and schema:**
- SQL DDL of any kind
- Prisma schema (`.prisma` files)
- Supabase production project provisioning
- Database migrations (drizzle, knex, raw SQL)
- Production database connection strings in application code

**Production authentication and identity:**
- NextAuth / Auth.js or any production auth library
- Real worker accounts with identity verification
- SPID / CIE authentication
- Production OAuth flows

**Financial execution:**
- Payments of any kind
- Worker wallet or KIP execution
- Checkout flows or vouchers
- Partner payouts
- FUO (Flexible Use Orchestration) movement

**Marketplace and booking:**
- Full booking engine with pricing, availability, or cancellation policy
- Partner marketplace with product listings or purchase flows
- External booking engine integration

**Prohibited AI and integrations:**
- External LLM API calls on HR or worker data
- Real HRIS or LMS integrations
- Real-time NFC/QR verification (KORA Link)

**Compliance and certification:**
- Live fiscal/tax classification outputs
- Automated fiscal guardrail enforcement
- Certified methodology claims
- ESRS/CSRD regulatory filing outputs

**Privacy violations:**
- Employer access to individual UEF, IU, PIB, or worker profile records
- Any individual worker data surfaced in employer-facing components
- Employer access to My KORA content

---

## 10. Top 10 Risks If Built Incorrectly

1. **Demo becomes a generic SaaS dashboard.** If KORA's five-pillar architecture, explainability layer, Activation Safeguard, and privacy boundaries are not visible in the UI, the demo looks like another HR tool. Mitigation: every screen must reflect KORA's unique architecture — not a generic data visualization.

2. **Mock services become accidental production architecture.** If mock services are built with DB connection logic, ORM calls, or live API endpoints, they create technical debt that contradicts Gate 2. Mitigation: services must be explicitly mock — local file reads, no DB connections.

3. **JSON seed file shapes become accidental SQL schema.** If developers treat field names in `/data/synthetic/*.json` as database column names and derive Prisma from them, the schema will contradict doc 12. Mitigation: seed files are demo-layer shapes only. doc 12 is the schema authority.

4. **Employer-facing components import sensitive seed files directly.** If a `CompanyDashboard.tsx` imports `pib-records.json` directly, the privacy architecture collapses. Mitigation: all data access through services. Services enforce role checks. No direct seed file imports in employer-facing components.

5. **My KORA becomes weak or PIB-only.** If My KORA only shows a summary card without Dynamic CV, opportunities, bookings, and privacy controls, the worker value proposition is invisible. Mitigation: build My KORA to full P1 quality alongside the company side.

6. **Partner side becomes a marketplace.** If the partner workspace shows pricing, availability calendars, or purchase buttons, it drifts out of scope. Mitigation: partners are verified ecosystem actors — their workspace shows service types, collective initiatives, evidence upload, and advisor validation status only.

7. **Booking Light becomes a booking engine.** If booking request logic includes pricing, cancellation policies, or availability checking, it has overbuilt. Mitigation: Booking Light is a request/confirm state machine — status transitions only.

8. **KORA Contribution becomes confused with the KORA Index.** If a developer merges KORA Contribution into the KORA Index value or adds it as an 11th component, the methodology is corrupted. Mitigation: `KoraContributionService` output is always rendered in a separate UI section with an explicit "Companion Indicator" label.

9. **Synthetic data is mistaken for live data.** If the demo does not clearly label data as synthetic, a viewer may believe KORA has real company data — creating false impressions and legal risk. Mitigation: every data surface includes a `SYNTHETIC DEMO DATA` label in the UI and every seed object includes `synthetic_demo_data: true`.

10. **Future Vision features appear active.** If any Future Vision screen has working navigation, live data, or interactive elements that imply functionality, the demo misrepresents Foundation Light's scope. Mitigation: every Future Vision screen has a non-removable banner: "Future Vision / Not Active in Foundation Light." No data, no routes, no API calls behind these screens.

---

## 11. Questions / Blockers Before Coding

After reviewing all canonical documents (docs 10, 12, 21, 21b, 22A, 23, 24, 25, 26, 27), the following blocker status is confirmed:

**No blocking issue found for Phase 0 scaffold. Production backend remains blocked by Gate 2 / doc 22.**

Specific status:
- Gate 1: CLOSED — all 21 decisions (D-01–D-21) recorded in doc 21
- Gate 2: OPEN — CTO review required before executable SQL. doc 22 (SQL schema specification) exists as a specification-only document. Executable SQL DDL, Prisma, Supabase migrations, production schema provisioning and production backend remain blocked. Demo build may proceed independently.
- Gate 3: OPEN — legal/privacy counsel required before live data. Demo build uses synthetic data only.
- Gate 5: OPEN — tax/fiscal advisor required before live fiscal outputs. Not relevant to Phase 0.

**One structural note for the build team:**
The synthetic seed file shapes in `/data/synthetic/` must NOT be used to derive database schema. When Gate 2 closes and doc 22 is created, the SQL schema will be generated from doc 12 (Technical Data Model, Gate 2 patched version). Seed file field names may diverge from production column names. This is intentional and expected.

---

**Document version:** v1.0
**Date:** 2026-05-17
**Gate status at creation:** Gate 1 CLOSED · Gate 2 OPEN · Gate 3 OPEN · Gate 5 OPEN
