# Foundation Light — Technical Build Handoff
**Document:** `docs/26-foundation-light-technical-build-handoff.md`
**Type:** Technical Build Handoff — Demo App Construction Guide
**Audience:** Frontend Developers, Full-Stack Developers, UX Engineers, Build Lead
**Status:** v1.0 — Active Build Reference
**Authority:** This document translates docs 22A, 24 and 25 into a controlled demo build specification. It does not replace doc 12 (schema) or doc 22 (SQL). Gate 2 remains open.

---

## 1. Executive Summary

This document is the technical build handoff for KORA Foundation Light. It translates the approved product specification (doc 24), the synthetic dataset design (doc 25), and the build cutline (doc 22A) into a precise implementation guide for the development team.

**What can be built now:**
- Full multi-sided demo application UI (5 product sides: Admin, Company, My KORA, Partner, Advisor)
- Simulated intelligence loop: ingestion → AI mapping → UEF review → scoring → output → explainability
- Local synthetic data layer from doc 25 specifications
- Mock service layer simulating scoring, ingestion, privacy visibility, and reporting
- Role switcher for all 11 platform roles
- Scenario switcher for all 4 demo scoring scenarios
- Static mockup screens for future-vision features
- Report preview and export simulation

**What must remain simulated — not production:**
- Scoring computation (simulated from local config and seed data — not a live engine)
- AI mapping (rule-based BCM taxonomy simulation — not an LLM API)
- Ingestion (preloaded synthetic file simulation — not a real pipeline)
- Authentication (demo role switcher — not production auth)
- File storage (local files — not a production document store)

**What must remain mockup-only:**
- KORA Certified, KORA Link, KORA Impact Pledge, KORA Value Chain, Territorial Maps, Advisor Academy, Partner Marketplace
- All future-vision screens labeled "Future Vision / Not Active in Foundation Light"

**What is blocked by gate:**
- SQL DDL / production schema — blocked until **Gate 2** (CTO review)
- Prisma models / Supabase production provisioning — blocked until **Gate 2**
- Live company data ingestion / production worker accounts — blocked until **Gate 3** (legal/privacy)
- Live fiscal/tax classification outputs — blocked until **Gate 5** (tax/fiscal advisor)
- Payment flows / wallet / KORA Impact Pledge execution — blocked (Gates 3 + 5 + legal)

**Build decision:**

> Proceed with controlled demo app build using synthetic data and local/mock services. Do not generate SQL, production schema or production backend artifacts before Gate 2.

---

## 2. Build Philosophy

### 2.1 Core Principles

**Demo credibility over infrastructure completeness.**
Foundation Light is not a throwaway clickable mockup. It is a controlled demo application that must feel real — in intelligence quality, data density, narrative power, and product ambition — while remaining technically and legally non-production. The goal is a demo that earns a meeting with a CHRO, not a prototype that excuses its own limitations.

**Build the product experience, not the production platform.**
Every implementation decision is evaluated against one question: does this make the demo more credible and the product more understandable? If the answer is no, it does not belong in this build.

**Synthetic data first.**
All data is pre-specified in doc 25. No data is invented or improvised during build. Every screen has a designated data source. Local JSON/CSV seed files are the only data layer until Gate 2 closes.

**Local/mock services before production DB.**
Services simulate behavior. They read from local seed files and produce deterministic outputs. They are designed to be replaced by real services post-Gate 2 with minimal interface change. They are not stubs — they must implement the full behavioral logic visible in the demo.

**Visible privacy boundaries.**
Privacy is not a compliance footnote. It is a product feature. Every screen where an employer cannot see individual data must show the boundary explicitly. Every worker-private area must show a privacy message. Privacy suppression states must be data-driven, not hardcoded UI flags.

**Explainability everywhere.**
No score appears without an explanation. No component appears without a label. Every KORA Index display is accompanied by its Confidence Score, calibration status, methodology version, and component breakdown. These are architectural requirements (doc 21b Rule 33), not optional UX choices.

**Confidence always visible.**
The Confidence Score is inseparable from the KORA Index. They appear together on every surface that shows a score. There is no build path where the KORA Index appears without its Confidence Score.

**Worker adoption as commercial dependency.**
My KORA is not an afterthought. The worker value layer is a commercial prerequisite: without worker adoption, the KORA Index degrades over time. My KORA must be built to full demo quality alongside the company side.

**Role-based UX from day one.**
All screens are built with role awareness. Every component knows which role is active. Employer roles never render worker personal data, even if the data exists locally. Role boundaries are enforced in the UI layer and in mock services — not only toggled by the role switcher.

**No employer access to individual worker data.**
This is constitutional. The employer cannot drill into individual UEF records, IU records, PIB scores, booking history, partner contacts, Dynamic CV contents, or personal plans. The enforcement is architectural — grant absence in production (doc 22A Section 11.2), UI suppression in the demo.

**No marketplace/payment drift.**
Partner integration is a request-and-confirm flow. There is no checkout, no pricing, no voucher, no cancellation policy. If a component begins to look like a booking engine or marketplace, it has drifted out of scope.

**No methodology expansion.**
The KORA Index has 10 components. The formula is defined in doc 10 and doc 21. No new components, no new formula factors, no new scoring layers are introduced in this build. The scoring simulation reflects the approved provisional v0.1 methodology — nothing more.

**Demo as architecture projection, not architecture bypass.**
Foundation Light demo build must be a projection of the target KORA architecture, not a shortcut around it. Mock services, local seed files and role switchers must mirror the future production boundaries: UEF, IU, PIB, Company Aggregation, Activation Safeguard, KORA Index, Confidence, Explainability, Identity separation, privacy boundaries, partner/advisor validation and reporting. The demo app must not create architectural shortcuts that would contradict the future production architecture. The demo app may proceed before production schema, but it must remain aligned with the target architecture. The future production architecture will be reviewed in Gate 2 before SQL/schema/backend artifacts are generated.

### 2.2 KORA Is Not

Preserve these distinctions in every implementation decision:

| KORA is... | KORA is not... |
|---|---|
| Human Impact Intelligence Platform | Generic HR dashboard |
| Organizational activation intelligence | Employee surveillance system |
| Privacy-first worker value layer | Worker ranking or gamification |
| Verified impact measurement | Welfare platform |
| Multi-sided ecosystem intelligence | Benefits marketplace |
| Explainable, methodology-versioned scoring | Black-box AI |
| Governance-grade audit trail | ESG report generator |
| Pilot-grade diagnostic intelligence | Certified, empirically validated system |

---

## 3. Recommended Technical Stack

### 3.1 Stack Selection

| Layer | Recommended Choice | Why | What it enables | What it must not become yet |
|---|---|---|---|---|
| Framework | Next.js 14+ (App Router) | Server and client components, file-based routing, API routes for mock layer, excellent TypeScript support | Full multi-sided app in a single codebase; demo-ready routing | No production DB connections; no real ORM before Gate 2 |
| Language | TypeScript (strict mode) | Type safety prevents data shape mismatches between seed files and components; documents data contracts | Catch data binding errors at build time | Types are not Prisma models — do not use Prisma schema generators |
| Styling | Tailwind CSS | Rapid UI development; design token system; consistent spacing and color | Fast component iteration; KORA visual system as Tailwind config | No global CSS spaghetti; no Tailwind purge misconfigurations |
| Component library | shadcn/ui | Unstyled, composable, accessible; ships as local source not a dependency | Full control over component appearance; KORA brand integration | Do not import unmodified shadcn components into demo surfaces — theme everything |
| Charts | Recharts | Composable React chart library; works with local data arrays | Pillar distribution, participation, component breakdown charts | No chart library that requires an API connection to render |
| Local data | JSON seed files + optional CSV parser | Zero infrastructure for demo; version-controllable; matches doc 25 structure | Full data layer before Gate 2 | JSON files are not the schema — do not derive Prisma from them |
| Mock API | Next.js API routes or in-memory service layer | Simulates API behavior with real fetch semantics; easy to replace with real endpoints post-Gate 2 | Service layer abstraction from day one | No real DB queries behind mock routes; no live integrations |
| Mock scoring | Local config + computation functions | Scoring simulation reads from methodology-config and seed UEF data; not hardcoded magic numbers | Full scoring pipeline demo without production engine | No external computation service; no LLM scoring calls |
| Reports | Browser print / PDF-via-print CSS | Simple, dependency-free PDF preview; good enough for demo | Board-ready report export simulation | No third-party PDF SaaS; no server-side rendering of reports connected to real DB |
| State management | React Context + local state | Sufficient for demo role/scenario/persona switching | Demo state is clean and scoped | No Redux or Zustand complexity unless genuinely required for demo flow |

### 3.2 What Not to Add to the Stack

| Do not add | Reason |
|---|---|
| Prisma ORM | Blocked until Gate 2; do not create schema or models |
| Supabase client SDK (production) | Blocked until Gate 2; no production DB provisioning |
| NextAuth / Auth.js | Blocked until Gate 2; demo uses role switcher |
| SPID / CIE authentication | Blocked until Gate 3; no real identity verification |
| OpenAI / Anthropic SDK | No LLM API on HR/worker data — doc 19 Section 9.2; BCM taxonomy only |
| Stripe / payment SDK | All payment flows excluded |
| Third-party booking engine | Booking Light is request/confirm only — no external engine |
| Real-time websocket layer | Not needed for demo; adds complexity with no demo value |

---

## 4. Application Architecture — Demo Build

### 4.1 Folder Structure

```
/app
  /admin                    ← KORA Admin side (A-01 to A-14)
  /company                  ← Company workspace (C-01 to C-15)
  /my-kora                  ← Worker side (W-01 to W-14)
  /partner                  ← Partner workspace (P-01 to P-07)
  /advisor                  ← Advisor workspace (AD-01 to AD-05)
  /future-vision            ← Static mockup screens (FV-01 to FV-05)

/components
  /layout                   ← App shell, navigation, sidebar, role switcher
  /charts                   ← Pillar chart, participation chart, component breakdown
  /cards                    ← KORA Index card, Confidence card, warning card, next action card
  /tables                   ← UEF review table, audit table, report table, advisor queue
  /badges                   ← Status badges, calibration badge, sensitivity badge, safeguard badge
  /forms                    ← Upload panel, mapping form, review form, confidence form
  /privacy                  ← Suppression overlay, consent step, data control row, privacy matrix
  /reports                  ← Report template, section components, export button
  /kora-index               ← KORA Index hero, 10-component breakdown, explainability panel
  /my-kora                  ← PIB card, pillar chart, timeline item, CV item, booking card
  /partner                  ← Partner card, service card, collective event card, request table
  /advisor                  ← Review card, evidence panel, eligibility form, recommendation card
  /scoring                  ← Scoring run panel, formula trace, methodology version display

/data
  /synthetic                ← All 29 doc 25 JSON seed files
  /scenarios                ← Scenario config (S1, S2, S3, S4)
  /methodology              ← methodology-config.json (weights, thresholds, version)

/services
  /demo-data                ← DemoDataService: seed file loader
  /scenario                 ← ScenarioService: scenario switcher
  /role-permission          ← RolePermissionService: role-based access
  /privacy-visibility       ← PrivacyVisibilityService: suppression logic
  /ingestion-simulator      ← IngestionSimulatorService: upload/mapping simulation
  /mapping-confidence       ← MappingConfidenceService: BCM taxonomy classifier
  /uef-review               ← UEFReviewService: approve/reject/flag logic
  /scoring-simulator        ← ScoringSimulatorService: IU → PIB → aggregate → KORA Index
  /activation-safeguard     ← ActivationSafeguardService: CLEAR/WARNING/FLAGGED
  /explainability           ← ExplainabilityService: plain-language score reasons
  /kora-contribution        ← KoraContributionService: collective initiative data
  /report-generator         ← ReportGeneratorService: report data assembly
  /booking-request          ← BookingRequestService: status state machine
  /dynamic-cv               ← DynamicCVService: item selection, export, status labels
  /founder-validation       ← FounderValidationService: pipeline and KPI data

/lib
  /types                    ← Data shape definitions (not Prisma models)
  /constants                ← Pillar codes, event type codes, threshold constants
  /methodology-config       ← Loader for versioned weights and thresholds
  /formatters               ← Score formatters, percentage formatters, date formatters
  /permissions              ← Permission resolution helper per role
  /demo-state               ← Current role, persona, scenario state management
```

### 4.2 Architecture Principles

**Local data files are not final schema.**
The JSON seed files in `/data/synthetic/` define the shape of demo data. They are written to satisfy doc 25 requirements. They do not pre-empt the SQL schema in doc 22 (not yet created, blocked by Gate 2). Post-Gate 2, services are replaced with real API calls — the component interface should not need to change.

**Services simulate product behavior.**
Every service in `/services/` implements the full behavioral logic the demo requires. Mock services are not stubs. They read real seed data, apply real logic (within doc 21 provisional methodology), and return real-structured responses. The goal is that replacing a mock service with a production service requires only a transport change, not a logic rewrite.

**No final backend assumptions are created.**
The demo does not impose a specific backend framework, database topology, or API structure. Services are called through an abstraction layer. The production API contract is defined in doc 22 after Gate 2.

**Permission enforcement is layered.**
Role-based access is enforced at two levels: (1) the route level — employer roles cannot navigate to worker-only routes; (2) the component level — components check the active role before rendering individual data. The role switcher is a demo tool, not a production authentication system.

---

## 5. Build Phases

### Phase 0 — Foundation Setup
**Goal:** A navigable demo shell with roles and synthetic data access.

| Task | Output |
|---|---|
| Project scaffolding: Next.js + TypeScript + Tailwind + shadcn/ui | Runnable base app |
| Routing structure: all 5 sides + future vision | Navigation skeleton |
| App shell: sidebar, top bar, breadcrumbs | Consistent layout across all sides |
| Role switcher: 11 roles, persona switcher for My KORA (8 personas) | Role context available everywhere |
| Scenario switcher: S1/S2/S3/S4 | Scenario context available to scoring service |
| Synthetic seed loader: loads all 29 JSON files from `/data/synthetic/` | Data accessible to all services |
| Global design tokens: KORA color system, typography, pillar colors, spacing | Visual consistency from first screen |
| Mock API abstraction: all service calls go through one service layer | Future API replacement is a single-layer change |
| Permission helper: resolves allowed actions per role | Role boundary enforcement available globally |
| Methodology config loader: reads `/data/methodology/methodology-config.json` | All scoring logic reads versioned config, never hardcodes weights |
| Calibration status and methodology version as global constants | Every score surface picks these up automatically |

### Phase 1 — KORA Admin Core + Company Intelligence Loop
**Goal:** The full KORA intelligence loop can be demoed from ingestion to report.

| Task | Screens |
|---|---|
| KORA Admin Home and Company & Program Management | A-01, A-02 |
| Upload Studio — preloaded synthetic file simulation | A-03 |
| AI Mapping Review — BCM taxonomy mapping with confidence scores | A-04 |
| UEF Review — approve/reject/flag with batch actions | A-05 |
| Scoring Run — scenario-driven simulation, progress indicator | A-06 |
| Explainability Review — component-level plain language | A-07 |
| Methodology Config — version display, weight breakdown | A-08 |
| Audit Timeline | A-13 |
| Founder Validation Cockpit | A-14 |
| Executive Cockpit — all 6 widget groups populated | C-01 |
| KORA Index Detail — 10 components, explainability, safeguard | C-02 |
| KORA Contribution — aggregate collective data | C-03 |
| Activation & Participation — distribution, site imbalance, suppression demo | C-04 |
| Pillars & Initiatives — distribution chart, coverage, imbalance | C-05 |
| Data & Evidence — source quality, completeness, evidence breakdown | C-06 |
| Warnings & Next Actions — top 3 warnings + top 3 actions | C-07 |
| Financial Governance Light — budget, cost per IU | C-08 |
| Reports — all 8 report previews | C-12 |

### Phase 2 — My KORA Core
**Goal:** Worker value layer is credible, private, and not reduced to a PIB score.

| Task | Screens |
|---|---|
| My KORA Home — persona-driven dashboard with milestones and opportunities | W-01 |
| Personal Impact Balance — PIB Light, pillar chart, privacy message | W-02 |
| Impact Timeline — timeline items by pillar with status labels | W-08 |
| Dynamic Impact CV Light — item selection, status labels, export control | W-09 |
| My Data Control — full data inventory with source, usage, visibility | W-11 |
| Privacy & Sharing — what employer sees, what is private | W-12 |
| Company KORA Snapshot — aggregate company view for worker context | W-13 |
| My Info & Settings | W-14 |

### Phase 3 — Ecosystem Preview
**Goal:** Partner, advisor, and collective impact loop is visible without becoming marketplace.

| Task | Screens |
|---|---|
| Opportunities — matched suggestions per persona gap | W-03 |
| Collective Impact Events — 5 CI states, waitlist demo | W-04 |
| Partner Map — persona-filtered, online for remote workers | W-05 |
| My Bookings & Requests — all 8 status states | W-06 |
| My Personal Plan | W-07 |
| Milestones & Credentials | W-10 |
| Partner Home, Profile, Services & Opportunities | P-01, P-02, P-03 |
| Collective Initiative Builder | P-04 |
| Requests & Participants Light | P-05 |
| Evidence Upload | P-06 |
| Advisor Validation Status | P-07 |
| Advisor Home, Review Queue, Review Detail | AD-01, AD-02, AD-03 |
| Eligibility Confidence Assignment, Recommendations | AD-04, AD-05 |
| Fiscal Classification Map | C-09 |
| Partner Map (company view), Benchmark Preview | C-10, C-11 |
| Strategy Simulator (semi-functional) | C-13 |
| Partner Onboarding Light, Advisor Portal Light | A-10, A-11 |
| User & Role Management (read-only demo) | A-09 |

### Phase 4 — Future Vision Mockups
**Goal:** Vision is visible but clearly inactive.

| Task | Screens |
|---|---|
| KORA Certified — static, labeled "Future Vision" | FV-01 |
| KORA Link — static NFC/QR hardware mockup | FV-02 |
| KORA Impact Pledge — static pledge mechanism | FV-03 |
| KORA Value Chain — static value chain view | FV-04 |
| Territorial Maps — static territory intelligence | FV-05 |
| Advisor Academy | Additional static |
| Partner Marketplace | Additional static |

### Phase 5 — Polish and Demo Script Readiness
**Goal:** Demo is ready for external presentation without narration.

| Task | Output |
|---|---|
| Demo narrative mode: locked routes per demo path | 6 demo paths work end-to-end |
| Scenario toggle: S1 → S2 comparison on Executive Cockpit | Before/after story is demonstrable |
| Empty states: all 24+ defined in doc 24 | No broken screens during live demo |
| Partial states: pending evidence, pending advisor review | Data quality story is demonstrable |
| Report export polish: browser print CSS per report type | Board-ready report is exportable |
| Privacy copy polish: all privacy messages per doc 24 microcopy library | Privacy story reads consistently |
| QA against doc 24 screen inventory | All 59+ screens accounted for |
| QA against doc 25 acceptance criteria | All 20 acceptance criteria pass |

---

## 6. Screen Build Priority

| Screen ID | Side | Screen Name | Build Phase | Priority | Build Type | Data Source (doc 25) | Notes |
|---|---|---|---|---|---|---|---|
| — | Global | Role Switcher | 0 | P0 critical | Functional Demo | demo_state | Mandatory before any screen renders correctly |
| — | Global | Scenario Switcher | 0 | P0 critical | Functional Demo | demo_state | Drives S1/S2/S3/S4 across all company screens |
| A-01 | Admin | Admin Home | 1 | P1 high | Functional Demo | demo_companies, demo_source_batches | Entry point for full admin loop |
| A-02 | Admin | Company & Program Management | 1 | P1 high | Functional Demo | demo_companies, demo_programs | Program config, methodology version display |
| A-03 | Admin | Upload Studio | 1 | P0 critical | Functional Demo | demo_source_batches, demo_raw_welfare_export, demo_raw_lms_export | Primary ingestion demo surface |
| A-04 | Admin | AI Mapping Review | 1 | P0 critical | Functional Demo | demo_raw_welfare_export, demo_uef_records (draft) | BCM taxonomy mapping, confidence scores, override flow |
| A-05 | Admin | UEF Review | 1 | P0 critical | Functional Demo | demo_uef_records | Approve/reject/flag, batch approval, sensitive flags |
| A-06 | Admin | Scoring Run | 1 | P0 critical | Functional Demo | demo_company_aggregates, demo_kora_index_outputs | Scenario-driven simulation, methodology version pinned |
| A-07 | Admin | Explainability Review | 1 | P0 critical | Functional Demo | demo_explainability_records | Component-level explanation, no black box |
| A-08 | Admin | Methodology Configuration | 1 | P1 high | Functional Demo | methodology-config.json | Weight display, calibration status, version |
| A-09 | Admin | User & Role Management | 3 | P2 medium | Semi-Functional Preview | demo_state | Read-only demo — no production user provisioning |
| A-10 | Admin | Partner Onboarding Light | 3 | P2 medium | Semi-Functional Preview | demo_partner_catalog | Catalog view, eligibility confidence display |
| A-11 | Admin | Advisor Portal Light | 3 | P2 medium | Semi-Functional Preview | demo_advisor_reviews | Advisor queue view from admin perspective |
| A-12 | Admin | Fiscal Classification Map | 3 | P3 low | Semi-Functional Preview | demo_advisor_reviews (Rossi) | Italy-first, informational, labeled indicative |
| A-13 | Admin | Audit Timeline | 1 | P1 high | Functional Demo | demo_source_batches, demo_uef_records | Immutable log, structural demo |
| A-14 | Admin | Founder Validation Cockpit | 1 | P1 high | Functional Demo | demo_founder_validation_contacts | Pipeline, KPIs, objections log |
| C-01 | Company | Executive Cockpit | 1 | P0 critical | Functional Demo | demo_kora_index_outputs, demo_activation_safeguard_results, demo_company_aggregates, demo_confidence_records | All 6 widget groups, calibration status prominent |
| C-02 | Company | KORA Index Detail | 1 | P0 critical | Functional Demo | demo_kora_index_outputs, demo_explainability_records, demo_confidence_records | 10 components, Confidence, Safeguard, methodology version |
| C-03 | Company | KORA Contribution | 1 | P1 high | Functional Demo | demo_kora_contribution_outputs, demo_collective_initiatives | Aggregate only — no individual participants |
| C-04 | Company | Activation & Participation | 1 | P1 high | Functional Demo | demo_company_aggregates, demo_departments_sites | Group suppression demo (DQ-07), site imbalance |
| C-05 | Company | Pillars & Initiatives | 1 | P1 high | Functional Demo | demo_company_aggregates, demo_programs | Pillar imbalance chart; S1 → S2 comparison |
| C-06 | Company | Data & Evidence | 1 | P1 high | Functional Demo | demo_source_batches, demo_uef_records (aggregate) | Completeness %, source quality, evidence breakdown |
| C-07 | Company | Warnings & Next Actions | 1 | P0 critical | Functional Demo | demo_kora_index_outputs, demo_activation_safeguard_results | Top 3 warnings + top 3 next actions |
| C-08 | Company | Financial Governance Light | 1 | P1 high | Semi-Functional Preview | demo_programs | Budget, cost per IU — informational; no payments |
| C-09 | Company | Fiscal Classification | 3 | P2 medium | Semi-Functional Preview | demo_advisor_reviews | Informational; labeled indicative; Gate 5 active |
| C-10 | Company | Partner Map | 3 | P2 medium | Semi-Functional Preview | demo_partner_catalog | Aggregate engagement only — no worker contact data |
| C-11 | Company | Benchmark Preview | 3 | P3 low | Semi-Functional Preview | demo_kora_index_outputs (all 4 companies) | Comparison companies; no certified benchmarks |
| C-12 | Company | Reports | 1 | P0 critical | Functional Demo | demo_reports | All 8 report types; calibration label on every report |
| C-13 | Company | Strategy Simulator | 3 | P3 low | Semi-Functional Preview | demo_kora_index_outputs (S1+S2) | S1 → S2 toggle; not a live simulation engine |
| C-14 | Company | Program Management | 1 | P2 medium | Functional Demo | demo_programs | Program list, period, methodology version |
| C-15 | Company | Company Settings | 3 | P3 low | Semi-Functional Preview | demo_companies | Read-only demo settings |
| W-01 | My KORA | My KORA Home | 2 | P0 critical | Functional Demo | demo_pib_records, demo_opportunities, demo_milestones | Entry point for worker demo — all 8 personas |
| W-02 | My KORA | Personal Impact Balance | 2 | P0 critical | Functional Demo | demo_pib_records | PIB not a performance score — label mandatory |
| W-03 | My KORA | Opportunities | 3 | P1 high | Semi-Functional Preview | demo_opportunities, demo_partner_catalog | Persona-filtered; gap-based suggestions |
| W-04 | My KORA | Collective Impact Events | 3 | P1 high | Semi-Functional Preview | demo_collective_initiatives, demo_booking_requests | CI-001 waitlisted; all 8 status states present |
| W-05 | My KORA | Partner Map | 3 | P1 high | Semi-Functional Preview | demo_partner_catalog | Davide N. remote → online partners only |
| W-06 | My KORA | My Bookings & Requests | 3 | P1 high | Semi-Functional Preview | demo_booking_requests | All 8 statuses; no payments; request/confirm only |
| W-07 | My KORA | My Personal Plan | 3 | P2 medium | Semi-Functional Preview | demo_pib_records (goals) | Private to worker; not employer-visible |
| W-08 | My KORA | Impact Timeline | 2 | P0 critical | Functional Demo | demo_pib_records (timeline_items) | Pending evidence demo (Giulia R.); empty state (Emma L.) |
| W-09 | My KORA | Dynamic Impact CV | 2 | P0 critical | Functional Demo | demo_dynamic_cv_items, demo_milestones | Status labels mandatory; worker controls export |
| W-10 | My KORA | Milestones & Credentials | 3 | P2 medium | Semi-Functional Preview | demo_milestones | Not certified credentials; worker-controlled sharing |
| W-11 | My KORA | My Data Control | 2 | P1 high | Functional Demo | demo_pib_records (data_sources), demo_consent_records | Full data inventory per worker |
| W-12 | My KORA | Privacy & Sharing | 2 | P0 critical | Functional Demo | demo_pib_records (visibility_metadata) | First screen after My KORA Home in worker demo |
| W-13 | My KORA | Company KORA Snapshot | 2 | P1 high | Functional Demo | demo_kora_index_outputs (aggregate only) | Aggregate company view — no company confidential data |
| W-14 | My KORA | My Info & Settings | 2 | P3 low | Semi-Functional Preview | demo_state | Read-only demo; no production account management |
| P-01 | Partner | Partner Home | 3 | P1 high | Semi-Functional Preview | demo_advisor_reviews, demo_booking_requests | Entry point for partner demo |
| P-02 | Partner | Partner Profile | 3 | P2 medium | Semi-Functional Preview | demo_partner_catalog | Editable in semi-functional preview |
| P-03 | Partner | Services & Opportunities | 3 | P1 high | Semi-Functional Preview | demo_partner_catalog, demo_opportunities | No pricing, no checkout language |
| P-04 | Partner | Collective Initiative Builder | 3 | P1 high | Semi-Functional Preview | demo_collective_initiatives | Propose initiative — not a marketplace listing |
| P-05 | Partner | Requests & Participants | 3 | P1 high | Semi-Functional Preview | demo_booking_requests | No worker PIB visible; request context only with consent |
| P-06 | Partner | Evidence Upload | 3 | P1 high | Semi-Functional Preview | demo_advisor_reviews | Upload simulation; links to advisor review |
| P-07 | Partner | Advisor Validation Status | 3 | P2 medium | Semi-Functional Preview | demo_advisor_reviews | Validation status display; no admin functions |
| AD-01 | Advisor | Advisor Home | 3 | P1 high | Semi-Functional Preview | demo_advisor_reviews | 12 reviews total; queue overview |
| AD-02 | Advisor | Review Queue | 3 | P1 high | Semi-Functional Preview | demo_advisor_reviews | Filter by status; all 12 review records |
| AD-03 | Advisor | Review Detail | 3 | P1 high | Semi-Functional Preview | demo_advisor_reviews, demo_uef_records (evidence links) | Evidence inspection; REV-003 pending example |
| AD-04 | Advisor | Eligibility Confidence Assignment | 3 | P1 high | Semi-Functional Preview | demo_advisor_reviews | Confidence form with rationale field |
| AD-05 | Advisor | Advisor Recommendations | 3 | P2 medium | Semi-Functional Preview | demo_advisor_reviews | REV-012 completed example; recommendation text |
| FV-01 | Future Vision | KORA Certified | 4 | P4 future | Static Mockup | — | Label: "Future Vision / Not Active in Foundation Light" |
| FV-02 | Future Vision | KORA Link | 4 | P4 future | Static Mockup | — | Label: "Future Vision / Not Active in Foundation Light" |
| FV-03 | Future Vision | KORA Impact Pledge | 4 | P4 future | Static Mockup | — | Label: "Future Vision / Not Active in Foundation Light" |
| FV-04 | Future Vision | KORA Value Chain | 4 | P4 future | Static Mockup | — | Label: "Future Vision / Not Active in Foundation Light" |
| FV-05 | Future Vision | Territorial Maps | 4 | P4 future | Static Mockup | — | Label: "Future Vision / Not Active in Foundation Light" |

---

## 7. Component Inventory

### 7.1 Global Components

| Component | Purpose | Used in Screens | Data Props | Interaction | Privacy Constraints | Priority |
|---|---|---|---|---|---|---|
| AppShell | Navigation, sidebar, role/scenario switcher integration | All | activeRole, activeScenario, activePersona | Role switches refresh data context | Must not render worker routes to employer roles | P0 |
| RoleSwitcher | Toggle active role for demo | All | roles[], activeRole | Select from 11 roles | Changing role must re-render all components with new permission context | P0 |
| ScenarioSwitcher | Toggle S1/S2/S3/S4 for company side | Company, Admin | scenarios[], activeScenario | Select scenario | No scenario switch on worker side (persona-bound) | P0 |
| PersonaSwitcher | Toggle worker persona for My KORA demo | My KORA | personas[8], activePersona | Select persona | Must not carry over employer-side context | P0 |
| CalibrationStatusBadge | Displays `pre_empirical_calibration` | All score surfaces | calibrationStatus | Static display | Cannot be hidden or suppressed | P0 |
| MethodologyVersionBadge | Displays `methodology_version_id = v0.1` | All score surfaces | methodologyVersionId | Static display | Cannot be hidden or suppressed | P0 |
| ConfidenceBadge | Displays Confidence Score with level | All score surfaces | confidenceScore, level | Static display + expand to breakdown | Never displayed alone — always with KORA Index | P0 |
| ActivationSafeguardBadge | Displays CLEAR / WARNING / FLAGGED | C-01, C-02, A-06 | status, AR, MAR | Click to expand explanation | None | P0 |
| PrivacyThresholdBadge | Displays suppression reason when group < 10 | C-04, C-05 | groupSize, threshold | Static display | Must trigger whenever group < threshold | P0 |
| DemoDataLabel | "Demo data / Synthetic Foundation Light scenario" | Configurable | visible | Static display | Should not be suppressible in demo build | P1 |
| EmptyStateCard | Generic empty state with guidance copy | All | title, description, ctaLabel, ctaAction | Optional CTA | None | P1 |
| WarningCard | Surface a data quality or activation warning | C-07, C-01 | warningType, message, affectedComponent | Click for detail | None | P0 |
| NextActionCard | Suggest next improvement action | C-07, C-01 | actionType, title, description, priority | Click for detail | None | P0 |
| ReportCard | Report preview card with export | C-12 | reportType, period, status, confidenceScore, calibrationStatus | Preview + export | Never shows individual worker data | P1 |

### 7.2 KORA Index Components

| Component | Purpose | Used in Screens | Data Props | Interaction | Privacy Constraints | Priority |
|---|---|---|---|---|---|---|
| KoraIndexHeroCard | Primary KORA Index display | C-01, C-02 | koraIndex, confidenceScore, calibrationStatus, safeguardStatus, methodologyVersionId, period | Click to detail | Never employer-accessible with individual breakdown | P0 |
| TenComponentBreakdown | Bar/radar chart of all 10 components | C-02 | componentScores[10], weights[10], labels | Hover for component explanation | None | P0 |
| ActivationSafeguardPanel | Full safeguard detail (AR, MAR, status, thresholds) | C-02, A-06 | AR, MAR, status, thresholdClear, thresholdWarning, thresholdFlagged | Expand/collapse | None | P0 |
| PillarDistributionChart | Pillar share of total IU | C-01, C-05 | pillarShares[5] | Hover for percentage | Aggregate only | P0 |
| ParticipationDistributionChart | Worker activation distribution | C-04 | distribution, AR, MAR, concentrationWarning | Hover for data point | Group suppression must apply | P0 |
| ConfidenceBreakdown | Sub-factors of Confidence Score | C-02 | sourceDiversity, evidenceQuality, dataCompleteness, continuityFactor | Expand panel | None | P0 |
| ExplainabilityPanel | Plain-language score explanation per component | C-02, A-07 | componentExplanations[], dataQualityNotes[], limitations | Collapsible per component | Never individual-attributable | P0 |

### 7.3 Admin Components

| Component | Purpose | Used in Screens | Data Props | Interaction | Privacy Constraints | Priority |
|---|---|---|---|---|---|---|
| FileUploadPanel | Preloaded file selection for ingestion demo | A-03 | availableFiles[], selectedFile, batchStatus | Select → simulate upload | No real file upload to server in demo | P0 |
| ColumnMappingTable | Display AI mapping suggestions per column | A-04 | columns[], mappingSuggestions[], confidenceScores[] | Approve/override/reject per row | None | P0 |
| MappingConfidenceCell | Color-coded confidence with BCM match reason | A-04 | column, suggestedPillar, confidence, matchReason, flags | Click to see BCM keyword matched | None | P0 |
| UEFReviewTable | Table of UEF draft records with status controls | A-05 | uefRecords[], activeFilters | Approve/reject/flag, batch approve | Sensitive records must show privacy badge, not full detail | P0 |
| ReviewStatusChip | Colored status chip: approved/rejected/flagged/draft | A-05 | status | Static display | None | P0 |
| ScoringRunPanel | Trigger scenario scoring simulation | A-06 | activeScenario, progress, lastRunAt, runStatus | Start run simulation | No individual IU visible to employer role | P0 |
| FormulaTracePanel | IU computation trace per event (admin internal view) | A-07 | eventId, NM, BC, CQ, EV, CF, AGF, IUvalue | Expand per event | Never visible to employer role | P1 |
| AuditTimelineTable | Immutable event log | A-13 | auditEvents[] | Filter by type/date | None | P1 |

### 7.4 Company Components

| Component | Purpose | Used in Screens | Data Props | Interaction | Privacy Constraints | Priority |
|---|---|---|---|---|---|---|
| ExecutiveCockpitGrid | Grid layout of all 6 widget groups | C-01 | All aggregate outputs | Navigate to detail | Never shows individual records | P0 |
| InitiativePortfolioTable | Programs and initiatives with activation data | C-05 | programs[], activationByProgram[] | Filter by pillar | Aggregate only | P1 |
| KoraContributionCard | KORA Contribution Light value + initiatives | C-03 | contributionValue, initiativesCount, verifiedParticipants | Expand initiative list | No individual participants listed | P1 |
| FinancialGovernanceTable | Budget, cost per IU, pillar allocation | C-08 | budget, spendByPillar, costPerIU | None | No payment execution | P1 |
| FiscalClassificationTable | Fiscal categories with classification status | C-09 | fiscalItems[], classificationStatus | None | Labeled informational — no tax advice | P2 |
| BenchmarkPreviewCard | Company index vs comparison companies | C-11 | companies[], indexValues[] | None | No certified benchmark | P3 |
| StrategySimulatorPanel | S1 → S2 side-by-side comparison | C-13 | scenarios[2], delta | Toggle scenarios | None | P3 |

### 7.5 My KORA Components

| Component | Purpose | Used in Screens | Data Props | Interaction | Privacy Constraints | Priority |
|---|---|---|---|---|---|---|
| PIBLightCard | Worker personal impact balance card | W-01, W-02 | pibScore, trend, calibrationNote | Expand to pillar detail | Never employer-visible — enforce in all rendering paths | P0 |
| PersonalPillarChart | Worker's pillar distribution | W-02 | pillarScores[5] | Hover for detail | Worker-only | P0 |
| TimelineItem | Single experience item with status, pillar, verification | W-08 | event, pillar, date, verificationStatus, evidenceStatus, cvEligible | Include/exclude from CV | Worker-only | P0 |
| OpportunityCard | Suggested opportunity from partner catalog | W-03 | opportunity, partner, pillar, format, territory, cvEligible | Save, request, contact | Consent step required before partner contact | P1 |
| CollectiveEventCard | Collective initiative card with status | W-04 | initiative, status, participants (aggregate), waitlistPosition | Request, confirm, cancel | No individual participant list shown | P1 |
| BookingRequestStatusCard | Status tracker for a booking or request | W-06 | requestId, status, initiativeOrOpportunity, dates | Cancel, confirm, upload evidence | Worker-only | P1 |
| PartnerProfileCard | Partner display in worker map | W-05 | partner, services, territory, verificationStatus, advisorValidated | Contact → consent step | Consent required; no data shared without worker action | P1 |
| DynamicCVItem | Single CV item with inclusion control and status | W-09 | item, status, included, excludedByWorker, verificationStatus | Include/exclude toggle | Worker controls; employer never sees CV | P0 |
| DataControlRow | Single data source row in My Data Control | W-11 | source, dataType, usage, visibilityStatus | Read-only in demo | Worker-only | P1 |
| PrivacyVisibilityMatrix | What employer/partner/KORA sees from worker data | W-12 | visibilityRules[] | Read-only display | Cannot be suppressed — mandatory display | P0 |
| CompanyKoraSnapshotCard | Aggregate company KORA data for worker context | W-13 | koraIndex, safeguardStatus, topMessage | Read-only | No company confidential data — aggregate only | P1 |

### 7.6 Partner and Advisor Components

| Component | Purpose | Used in Screens | Data Props | Interaction | Priority |
|---|---|---|---|---|---|
| PartnerServiceCard | Service listing in partner profile | P-03 | service, pillar, format, eligibilityConfidence, cvEligible | Edit (partner admin) | P1 |
| RequestTable | Incoming worker requests (partner side) | P-05 | requests[], status | Accept/decline | No worker PIB or timeline shown | P1 |
| EvidenceUploadCard | Upload evidence for collective initiative or partner validation | P-06 | reviewId, entityType, evidenceFiles[] | Upload simulation | Evidence scoped to specific review | P1 |
| ReviewQueueTable | Advisor's assigned review queue | AD-02 | reviews[], filters | Click to detail | Scoped to advisor's assigned reviews only | P1 |
| EvidenceReviewPanel | Display evidence for advisor inspection | AD-03 | reviewId, evidenceFiles[], entityReviewed | Inspect + annotate | No access to other company data | P1 |
| EligibilityConfidenceForm | Advisor assigns confidence and rationale | AD-04 | reviewId, currentConfidence | Submit score + rationale | Must prevent confident claim without evidence | P1 |
| RecommendationCard | Completed advisor recommendation | AD-05 | recommendation, outcome, confidence | Read-only | None | P2 |

---

## 8. Synthetic Data Binding

Map from doc 25 dataset inventory to local mock data files in `/data/synthetic/`.

| Mock File | Source (doc 25) | Row Count | Used by Screens | Key Fields | Scenario Support | Privacy Level | Notes |
|---|---|---|---|---|---|---|---|
| `companies.json` | demo_companies | 4 | A-01, A-02, C-01–C-15 | company_id, name, sector, territory, headcount, sites, KORA_status, program_period | All | Low | 4 companies: Meridiana (primary), Nexo, Fortis, Communitas |
| `workers.json` | demo_workers | 250 | A-05 (pseudonymized), W-01–W-14 | worker_pseudonym_id, demo_persona_name, department, site, job_family, cluster | All | High | ID format: WRK-MERD-001 to WRK-MERD-250; 8 named personas |
| `departments-sites.json` | demo_departments_sites | 8 | C-04, A-02 | dept_id, dept_name, site_id, site_name, worker_count, activation_profile | All | Low | Includes sub-team of 7 below privacy threshold (DQ-07) |
| `programs.json` | demo_programs | 11 | A-02, C-05, C-08, C-14 | program_id, company_id, name, period, methodology_version_id, budget, status | All | Low | 8 Meridiana + 3 comparison programs |
| `source-batches.json` | demo_source_batches | 10 | A-03, A-06, A-13, C-06 | batch_id, file_name, source_type, row_count, status, uploaded_at | S1 | Low | Maps to DS-01 through DS-10 from doc 25 Section 5 |
| `raw-welfare-export.sample.json` | demo_raw_welfare_export | 620 | A-03, A-04 | raw provider-specific headers, intentional quality issues | S1 | Medium | Primary AI mapping demo; non-standard headers; DQ-01/03/05/08 |
| `raw-lms-export.sample.json` | demo_raw_lms_export | 480 | A-03, A-04 | user_id, course_name, completion_date, hours, status | S1 | Low | High-confidence mapping example |
| `raw-hris-population.sample.json` | demo_raw_hris_population | 250 | A-03, A-04 | employee_id, dept_code, site, contract_type, hire_date | S1 | Medium | Worker seeding basis |
| `raw-esg-initiatives.sample.json` | demo_raw_esg_initiatives | 85 | A-03, A-04 | initiative_name, category (freeform), date, participants | S1 | Low | Low-confidence mapping demo; DQ-02/04 |
| `raw-partner-events.sample.json` | demo_raw_partner_events | 210 | A-03, A-04 | partner_id, event_type, date, participant_count, evidence_ref | S1 | Medium | DS-06 ingestion; DQ-06 missing evidence |
| `uef-records.json` | demo_uef_records | S1: 1,350 / S2: 1,750 | A-04, A-05, A-07, C-06 | uef_record_id, worker_pseudonym_id, pillar_primary, event_type, verification_level, review_status, flags, privacy_sensitivity | S1, S2 | High | All statuses: approved/rejected/flagged; all DQ examples present |
| `impact-units.json` | demo_impact_units | S1: ~1,100 / S2: ~1,500 | A-07 (admin internal), scoring service | iu_id, uef_record_id, pillar, iu_value, formula_trace | S1, S2 | High — never employer role | Formula trace for explainability; never surfaces to company role |
| `pib-records.json` | demo_pib_records | 250 | W-01, W-02, W-08, W-09, W-11, W-12, W-13 | pib_id, worker_pseudonym_id, period, pillar_scores[5], total_pib_light, trend, timeline_items[], data_sources[] | Per persona | High — worker only | 8 named personas have full detail; remainder have aggregate structure |
| `company-aggregates.json` | demo_company_aggregates | 4 (S1+S2+S3+S4) | C-01, C-04, C-05, C-07 | company_id, period, AR, MAR, NI, WB, PC, PB, EQ, VR, CO, participation_distribution | S1, S2, S3, S4 | Low (aggregate) | Department and site breakdown included |
| `kora-index-outputs.json` | demo_kora_index_outputs | 4 | C-01, C-02, C-12, W-13 | kora_index_id, company_id, period, kora_index_value, confidence_score, calibration_status, methodology_version_id, component_breakdown | S1, S2, S3, S4 | Low (aggregate) | `calibration_status` always `pre_empirical_calibration` |
| `kora-contribution-outputs.json` | demo_kora_contribution_outputs | 4 | C-03, W-13 | contribution_id, company_id, period, contribution_value, initiatives_count, verified_participants | S1, S2, S3, S4 | Low (aggregate) | S1: Low; S2: Moderate; S4: High |
| `activation-safeguard-results.json` | demo_activation_safeguard_results | 4 | C-01, C-02, A-06 | safeguard_id, company_id, period, AR, MAR, status, qualified_index | S1: WARNING / S2: CLEAR / S3: FLAGGED / S4: WARNING | Low | Drives Safeguard badge and KORA Index qualification |
| `explainability-records.json` | demo_explainability_records | 4 | C-02, A-07 | explanation_id, kora_index_id, summary_text, component_explanations[], data_quality_notes[], limitations | S1, S2, S3, S4 | Low | Plain-language text per scenario; pre-written from doc 25 expected narratives |
| `confidence-records.json` | demo_confidence_records | 4 | C-01, C-02 | confidence_id, kora_index_id, confidence_score, source_diversity, evidence_quality, data_completeness, continuity_factor | S1, S2, S3, S4 | Low | Always displayed alongside KORA Index |
| `partner-catalog.json` | demo_partner_catalog | 12 | C-10, W-03, W-05, P-01–P-07 | partner_id, name, category, pillars, territory, format, services, verification_status, advisor_validated, fiscal_compatibility | All | Low | Fiscal labels marked informational |
| `opportunities.json` | demo_opportunities | 30–40 | W-03 | opportunity_id, partner_id, title, pillar, format, territory, cv_eligible, description | Per persona | Low | Persona-filtered by pillar gap |
| `collective-initiatives.json` | demo_collective_initiatives | 5 | C-03, W-04, W-06 | initiative_id, name, pillar, territory, partner_id, companies, status, participants (aggregate), verification, advisor_status | S1, S2 | Low (aggregate) | CI-001 waitlisted; CI-002 advisor-validated |
| `booking-requests.json` | demo_booking_requests | 20–30 | W-06, P-05 | request_id, worker_pseudonym_id, initiative_or_opportunity_id, status, created_at, updated_at | Per persona | High — worker only | All 8 statuses present; no partner sees worker PIB |
| `dynamic-cv-items.json` | demo_dynamic_cv_items | 40–50 | W-09 | cv_item_id, worker_pseudonym_id, timeline_item_ref, status, included, excluded_by_worker, verification_status | Per persona | High — worker only | LIFE items: category level only; 1 excluded by Carla V. |
| `milestones.json` | demo_milestones | 15–20 | W-01, W-10 | milestone_id, worker_pseudonym_id, milestone_type, pillar, earned_at, shareable, cv_eligible | Per persona | High — worker only | Carla V.: 4 milestones; Marco T.: 0 |
| `consent-records.json` | demo_consent_records | 8–12 | W-11, W-05 | consent_id, worker_pseudonym_id, partner_id, purpose, consented_at, revoked_at | Per persona | High — worker only | Required before any partner contact data is shown |
| `advisor-reviews.json` | demo_advisor_reviews | 12 | AD-01–AD-05, P-07 | review_id, advisor_id, review_type, entity_reviewed, status, eligibility_confidence, outcome, notes | All | Medium (scoped) | REV-003 pending; REV-006 needs more info; REV-009 worker evidence |
| `reports.json` | demo_reports | 8 | C-12 | report_id, company_id, type, period, methodology_version_id, calibration_status, confidence_score, status, generated_at | All | Low | Every record has calibration_status and methodology_version_id |
| `founder-validation-contacts.json` | demo_founder_validation_contacts | 25 | A-14 | contact fields per doc 25 Section 16.1 | Internal | Low | 25 contacts; KPI summary; objection catalog |

**Data file rules:**
- Every file includes a `synthetic_demo_data: true` field at root level.
- Files are in `/data/synthetic/` — they are not the SQL schema.
- File structure does not imply final database table structure.
- Files may be refactored post-Gate 2 when doc 22 SQL schema is created.
- Files must not contain real personal data of any kind.

**Seed file visibility rule:**
- Local seed file availability does not equal role visibility. All local data access must pass through RolePermissionService and PrivacyVisibilityService before rendering. A component must never import high-sensitivity seed files directly if the active role is not permitted to see that data.
- Direct component-level imports from sensitive seed files are prohibited for employer-facing screens. Employer-facing screens must consume only aggregate-safe service outputs.
- Sensitive seed files that must not be directly imported by employer-facing components: `workers.json`, `uef-records.json`, `impact-units.json`, `pib-records.json`, `booking-requests.json`, `dynamic-cv-items.json`, `consent-records.json`, `milestones.json` (where worker-specific), and any future worker personal layer data.

---

## 9. Mock Service Layer

All services live in `/services/`. Every service reads from seed data and returns structured responses. Services must be replaceable by real API calls post-Gate 2 without requiring component changes.

**Mock service discipline rules:**
- Mock services are architectural contracts, not convenience helpers. Components must depend on mock service interfaces, not directly on raw seed file structures, except for clearly isolated demo-only internal views.
- Future production services must be able to replace mock services without requiring UI component rewrites.
- Any mock service that returns score, privacy, permission, or report data must include the same mandatory metadata required in production: `methodology_version_id`, `calibration_status`, confidence where applicable, role visibility result, and `synthetic_demo_data` label.

---

### DemoDataService
**Purpose:** Load and serve all 29 synthetic seed files.
**Inputs:** File name, optional filters (company_id, scenario, persona, role).
**Outputs:** Typed data objects from seed files.
**Screens using it:** All screens.
**Demo behavior:** Reads local JSON; applies role-based filtering before returning.
**Future production replacement:** API client reading from real database endpoints.
**Forbidden production assumptions:** Must not assume specific DB table structure; must not hardcode SQL query patterns.

---

### ScenarioService
**Purpose:** Manage active scenario state (S1/S2/S3/S4) and return scenario-specific data slices.
**Inputs:** scenarioId, company_id.
**Outputs:** All scenario-specific records (aggregates, KORA Index, Safeguard, explainability, contribution).
**Screens using it:** C-01 through C-15, A-06, A-07.
**Demo behavior:** Returns data from `kora-index-outputs.json`, `company-aggregates.json`, `activation-safeguard-results.json` filtered by scenario.
**Future production replacement:** API call to scoring engine for live run results.
**Forbidden production assumptions:** Must not trigger real computation; must not write to any DB.

---

### RolePermissionService
**Purpose:** Resolve what a given role can see, access, and modify.
**Inputs:** activeRole, screenId, dataType, requestedAction.
**Outputs:** Boolean (allowed/denied) + optional denial reason.
**Screens using it:** All screens — called before any data render.
**Demo behavior:** Resolves against a permission matrix (Section 10). Returns deny with reason for restricted items.
**Future production replacement:** JWT-based RBAC with database-backed role grants.
**Forbidden production assumptions:** Must not bypass grant-absence enforcement for employer roles on individual worker data.

---

### PrivacyVisibilityService
**Purpose:** Enforce privacy suppression rules, group threshold enforcement, sensitivity minimization.
**Inputs:** dataType, groupSize, activeRole, sensitivityLevel, workerOwnedData.
**Outputs:** Visibility decision (visible / suppressed / aggregate-only / consent-required / elevated-only) + display copy.
**Screens using it:** C-04, C-05, W-05, W-12, P-05, A-05.
**Demo behavior:** Returns suppression overlay data for groups < 10; returns privacy message for sensitive wellbeing items; returns "no access" for employer role on worker personal layer.
**Future production replacement:** Database-level view with RLS + grant absence enforcement.
**Forbidden production assumptions:** Must not simulate Privacy Officer access as standard Admin access.

---

### IngestionSimulatorService
**Purpose:** Simulate file-based ingestion flow — file selection, batch creation, row processing.
**Inputs:** selectedFile (from available synthetic files), batchConfig.
**Outputs:** Batch record, row count, processing status, trigger for MappingConfidenceService.
**Screens using it:** A-03.
**Demo behavior:** Selects a preloaded synthetic file; simulates progress bar; produces batch metadata; hands off to MappingConfidenceService.
**Future production replacement:** Real file parser and ingestion pipeline.
**Forbidden production assumptions:** No actual file writing; no S3 or blob storage; no real streaming.

---

### MappingConfidenceService
**Purpose:** Simulate BCM taxonomy-based column mapping with confidence scores.
**Inputs:** rawFile, columnHeaders[], BCMTaxonomy (local config).
**Outputs:** mappingSuggestions[] (per column: suggestedPillar, confidence, matchReason, flags).
**Screens using it:** A-04.
**Demo behavior:** Reads column headers from selected raw file; matches against BCM taxonomy keyword list in local config; returns confidence 0.0–1.0 per column; flags low-confidence (<0.5) and sensitive wellbeing fields.
**AI model:** Rule-based BCM taxonomy matching — no LLM API calls. Confirmed founder decision (doc 19 Section 9.2, Rule 31).
**Future production replacement:** Production BCM classifier service with expanded taxonomy.
**Forbidden production assumptions:** No OpenAI/Anthropic API calls; no ML model serving; no external classification API.

---

### UEFReviewService
**Purpose:** Manage UEF record review state — approve, reject, flag, batch approve.
**Inputs:** uefRecordId, action (approve/reject/flag), reviewerNote, rejectionReason.
**Outputs:** Updated UEF record status; list of approved records for scoring.
**Screens using it:** A-05.
**Demo behavior:** Updates record status in demo state; filters approved records for ScoringSimulatorService; enforces that rejected records are excluded.
**Future production replacement:** Real UEF review workflow with database writes.
**Forbidden production assumptions:** Must not allow employer roles to see individual UEF records; must enforce that sensitive records only show category label.

---

### ScoringSimulatorService
**Purpose:** Simulate the full scoring pipeline — IU per event → PIB per worker → Company Aggregation → Activation Safeguard → KORA Index → Confidence Score.
**Inputs:** activeScenario, approvedUEFRecords (from local seed), methodologyConfig.
**Outputs:** koraIndexOutput, confidenceRecord, activationSafeguardResult, companyAggregates, koraContributionOutput.
**Screens using it:** A-06, C-01, C-02.
**Demo behavior:** Reads pre-computed scenario outputs from seed data; simulates a progress sequence; presents results tagged with methodology_version_id and calibration_status = `pre_empirical_calibration`.
**Methodology config:** Reads from `/data/methodology/methodology-config.json`. Weights are equal (0.10 × 10) as v0.1 baseline. No weight is hardcoded in component or service logic.
**Future production replacement:** Real scoring engine reading from production UEF store.
**Forbidden assumptions:** No empirical calibration claims; no certified score language; no score without Confidence Score.

---

### ActivationSafeguardService
**Purpose:** Evaluate AR and MAR against provisional thresholds and return status.
**Inputs:** AR, MAR, methodologyConfig (thresholds).
**Outputs:** status (CLEAR/WARNING/FLAGGED), thresholdsUsed, explanation.
**Screens using it:** C-01, C-02, A-06.
**Demo behavior:** Applies thresholds from methodology config. CLEAR: AR≥0.40 AND MAR≥0.30. WARNING: 0.20≤AR<0.40 OR 0.15≤MAR<0.30. FLAGGED: AR<0.20 OR MAR<0.15.
**Future production replacement:** Same logic but reading from live company aggregate record.
**Forbidden assumptions:** Thresholds must always come from config — never hardcoded in component.

---

### ExplainabilityService
**Purpose:** Return plain-language explanations per KORA Index run.
**Inputs:** koraIndexId, activeScenario.
**Outputs:** explanationRecord (summary text, component_explanations[], data_quality_notes[], limitations).
**Screens using it:** C-02, A-07.
**Demo behavior:** Returns pre-authored explanation from `explainability-records.json` matching scenario.
**Future production replacement:** Explanation generation service templated per score output.
**Forbidden assumptions:** Explanations must include limitations and calibration note — never claim empirical validation.

---

### KoraContributionService
**Purpose:** Return KORA Contribution Light data — collective initiative data, verified participation (aggregate only).
**Inputs:** company_id, activeScenario.
**Outputs:** contributionOutput, collectiveInitiatives[] (aggregate participation).
**Screens using it:** C-03, W-13.
**Demo behavior:** Reads from `kora-contribution-outputs.json` and `collective-initiatives.json`. No individual participant names.
**Future production replacement:** Real aggregate query on collective participation.
**Forbidden assumptions:** Never returns individual participant identities; KORA Contribution is a companion indicator — not a KORA Index component.

---

### ReportGeneratorService
**Purpose:** Assemble report data for preview and export.
**Inputs:** reportType, company_id, activeScenario.
**Outputs:** reportRecord (all display fields, calibration_status, methodology_version_id, confidence_score, period, limitations).
**Screens using it:** C-12.
**Demo behavior:** Assembles data from seed files per report type; returns structured report object for template rendering.
**Future production replacement:** Real report generation pipeline.
**Forbidden assumptions:** Every report must display calibration_status and methodology_version_id — neither may be suppressed.

---

### BookingRequestService
**Purpose:** Manage booking/request state machine for worker-side interactions.
**Inputs:** workerId, initiativeOrOpportunityId, action (request/confirm/cancel/join-waitlist/upload-evidence).
**Outputs:** Updated request record with new status.
**Screens using it:** W-04, W-06, P-05.
**Demo behavior:** State transitions between: Available → Requested → Confirmed / Waitlisted / Cancelled → Completed → Verified / Pending Evidence.
**Future production replacement:** Real request workflow with notifications.
**Forbidden assumptions:** No payment; no checkout; no slot inventory engine; partner side sees only request context with consent.

---

### DynamicCVService
**Purpose:** Manage worker's Dynamic Impact CV — item selection, status labeling, export control.
**Inputs:** workerId, timelineItemId, action (include/exclude), exportRequest.
**Outputs:** Updated CV item list; export data with status labels.
**Screens using it:** W-09.
**Demo behavior:** Returns dynamic_cv_items for active persona; enforces LIFE/health-related items at category level only; every export includes status: verified/pending/self-declared per item.
**Future production replacement:** Real worker-controlled CV service.
**Forbidden assumptions:** No auto-share to employer; no employer notification on export; LIFE items must not include clinical detail.

---

### FounderValidationService
**Purpose:** Return founder validation pipeline data and KPI summary.
**Inputs:** none (founder role only).
**Outputs:** contacts[], kpiSummary, objectionCatalog.
**Screens using it:** A-14.
**Demo behavior:** Reads from `founder-validation-contacts.json`; computes KPI summary from contact status fields.
**Future production replacement:** CRM-backed validation pipeline.
**Forbidden assumptions:** No live CRM integration; no email/calendar automation.

---

## 9A. Demo-to-Production Alignment

Mock services are not random placeholders. Each is an architectural stand-in for a future production service. The table below maps every demo construct to its production equivalent and states the gate and non-negotiable boundary that governs it.

| Demo Construct | Purpose in Demo | Future Production Equivalent | Gate Dependency | Non-Negotiable Boundary |
|---|---|---|---|---|
| Local JSON seed files | Synthetic demo data layer | Production database stores and tables (per doc 22 SQL schema) | Gate 2 | Local files are not final schema; JSON structure does not determine DB table structure |
| Role switcher | Demo role simulation across 11 roles | Production auth / RBAC / SSO with JWT-based role claims | Gate 2 / Gate 3 | Not real authentication; no real user provisioning |
| Scenario switcher | Demo scoring scenario selection (S1/S2/S3/S4) | Production versioned score run results from scoring engine | Gate 2 | Not production scoring history; no empirical claims |
| DemoDataService | Local seed file loader with role-based filtering | Production API / data access layer | Gate 2 | All data must pass through RolePermissionService before rendering; employer restrictions enforced |
| IngestionSimulatorService | File ingestion demo with preloaded synthetic files | Production ingestion pipeline (real HR / welfare / partner data sources) | Gate 2 / Gate 3 | No live data before Gate 3; no real file writes |
| MappingConfidenceService | Rule-based BCM taxonomy simulation | Production BCM mapping service (rule-based classifier — confirmed founder decision) | Gate 2 / Gate 3 | No external LLM on worker / HR data — ever |
| UEFReviewService | Review workflow simulation (approve / reject / flag) | Production UEF review workflow with database writes | Gate 2 | Employer never sees individual UEF records — architectural enforcement, not policy |
| ScoringSimulatorService | Full scoring pipeline simulation (IU → PIB → aggregation → KORA Index → Confidence) | Production scoring engine reading from live UEF store | Gate 2 | No certified or empirically calibrated claims; calibration_status non-suppressible |
| PrivacyVisibilityService | UI suppression and group threshold enforcement | Production grant absence + RLS + privacy service layer | Gate 2 / Gate 3 | Employer individual access denied by design — never by configuration toggle |
| BookingRequestService | Booking Light state machine simulation | Production participation request workflow | Gate 3 | No payment, no marketplace, no slot inventory |
| DynamicCVService | Worker-controlled CV demo | Production worker personal data service (worker-owned, private by default) | Gate 3 | Employer never auto-receives CV; no employer notification on export |
| ReportGeneratorService | Report preview and export simulation | Production report generation service | Gate 2 / Gate 5 (fiscal reports) | calibration_status and Confidence Score mandatory in every report — never suppressible |

---

## 10. Role and Permission Implementation Rules

### 10.1 Demo Role Definitions

| Role | Demo Implementation | Permission Level | Key Constraints |
|---|---|---|---|
| KORA Admin | Full admin side; pseudonymized operational records | High — operational | Does NOT equal Privacy Officer; no identity-linked worker personal layer by default |
| KORA Analyst | Admin side; read-only access to pseudonymized UEF/IU/aggregate data | Medium — read-only | Pseudonymized only; never worker personal layer; no bookings/CV/partner contacts |
| KORA Privacy Officer | Not active in demo as live role; defined as boundary only | Elevated — exceptional | Identity-linked access only with legal justification; not interchangeable with Admin |
| Company Admin | Company workspace; all company aggregate screens | Company — full | Never individual worker data; enforced at route and component level |
| Company HR / People | Company workspace; activation, participation, pillar views | Company — standard | Aggregate only; group threshold enforced |
| Company ESG | Company workspace; ESG report, KORA Contribution, collective initiatives | Company — scoped | Aggregate only |
| Company Finance | Company workspace; aggregate KORA Index summary, Confidence Score, Financial Governance Light, budget vs activation aggregates, cost per IU dashboard-only indicator, fiscal classification informational layer, finance-relevant reports | Company — financial | Company Finance can view aggregate KORA Index summary and finance-linked aggregate indicators, but cannot access worker-level records or privacy-sensitive workforce drilldowns, individual UEF/IU/PIB, worker bookings, partner contacts, Dynamic CV, personal timeline, or sensitive wellbeing / health-related metadata |
| Company Viewer / Board | Company workspace; Executive Cockpit read-only, KORA Snapshot | Company — read-only | Most restricted company role |
| Worker | My KORA only | Worker — personal | Worker sees only their own data; never other workers |
| Partner Admin Light | Partner workspace (P-01 to P-07) | Partner — scoped | No worker PIB; no company confidential dashboard; scoped request context only |
| Advisor External Light | Advisor workspace (AD-01 to AD-05) | Advisor — scoped | Assigned reviews only; no cross-company access |

### 10.2 Absolute Employer Role Restrictions (Enforced in Demo)

| Data Type | Employer Access | Enforcement Level |
|---|---|---|
| Individual UEF records | Denied | Route guard + component |
| Individual IU records | Denied | Component only (internal admin view) |
| Individual PIB records | Denied | Route guard + component |
| Worker profiles (identity-linked) | Denied | Route guard |
| Worker bookings / request history | Denied | Component + service filter |
| Worker partner contacts | Denied | Component + service filter |
| Worker Dynamic Impact CV | Denied | Route guard + component |
| Worker personal plan | Denied | Route guard |
| Worker consent records | Denied | Route guard |
| Worker timeline items | Denied | Route guard |
| Group < 10 workers segment | Suppressed | PrivacyVisibilityService |

### 10.3 Permission Test Checklist

- [ ] Company Admin cannot navigate to `/my-kora` routes.
- [ ] Company Finance cannot see individual activation scores or department-level data below 10-worker threshold.
- [ ] KORA Admin standard role cannot see worker booking records or Dynamic CV contents.
- [ ] KORA Analyst sees only pseudonymized UEF records — no worker_pseudonym_id to real-name linkage.
- [ ] Worker role can only see their own persona data in My KORA.
- [ ] Partner sees only request context for workers who have consented — no PIB, no timeline.
- [ ] Advisor sees only assigned review records — no cross-company or cross-advisor access.
- [ ] Operations sub-team of 7 (DQ-07) does not render in any employer-facing aggregate view.
- [ ] Sensitive wellbeing records appear in UEF Review as category-level only — no session detail visible to any role.
- [ ] No role can access Future Vision screens as functional features.

---

## 11. Privacy Implementation Rules

### 11.1 Core Privacy Rules for Demo Build

| Rule | Requirement | UI Enforcement |
|---|---|---|
| Privacy threshold | Default: 10 workers. Below-threshold groups suppressed. | PrivacyVisibilityService returns suppression; PrivacyThresholdBadge renders |
| Synthetic data labeling | All data internally tagged `synthetic_demo_data: true`. Customer-facing: "Demo data" or "Synthetic Foundation Light scenario". | DemoDataLabel component; configurable visibility |
| Worker personal layer | Never accessible to employer roles. Enforced at route + component level. | Route guard on `/my-kora`; component-level role check on all personal data renders |
| Dynamic CV privacy | Private by default; no auto-share; no employer notification on export. | DynamicCVService enforces; no employer-side CV endpoint |
| Booking privacy | Worker booking history never visible to employer. | Route guard; BookingRequestService filters by activeRole |
| Partner contact consent | Consent step required before any data passes to partner. | ConsentStep component in partner contact flow |
| Sensitive wellbeing metadata | Minimized to category level. No session detail, no diagnosis, no therapist notes. | UEF Review: sensitivity badge replaces detail; DynamicCVService: LIFE items at category level only |
| Clinical records | Absolutely excluded. No clinical health records in dataset or UI. | No clinical data fields in seed files; evidence upload simulation rejects clinical document types |
| Collective initiative participation | Aggregate counts only. No individual participant names. | KoraContributionService never returns individual identities |
| Advisor scope | Sees only assigned review records. No cross-company or cross-review access. | AdvisorReviewService filters by advisor_id |

### 11.2 UI Privacy States

| State | Trigger | Display | Copy |
|---|---|---|---|
| Suppressed group | Group size < 10 workers | PrivacyThresholdBadge + empty chart | "This group is below the minimum privacy threshold (10 workers). Aggregate data is not shown to protect worker privacy." |
| No access — employer | Employer role requests worker personal layer | Access denied overlay | "This information is not available to your role. Individual worker data is protected by KORA's privacy architecture." |
| Aggregate only | Company role requests participation data | Aggregate chart only | "You are viewing aggregate workforce intelligence. Individual-level data is never visible." |
| Consent required | Worker initiates partner contact | Consent step modal | "Contacting this partner shares only your request context — not your personal data." |
| Sensitive metadata minimized | Sensitive wellbeing record in UEF Review | Sensitivity badge on row | "This record contains sensitive wellbeing data. Detail is minimized to category level." |
| Demo data label | Any synthetic data surface | Subtle label | "Demo data" or "Synthetic Foundation Light scenario" |
| Private — worker only | Employer attempts to access worker timeline | Route redirect or access denied | Redirect to company workspace |

---

## 12. Ingestion Simulation Build

### 12.1 Upload Studio (A-03)

**Behavior:**
- No real file upload to server — user selects from a list of preloaded synthetic source files.
- Available files: DS-01 (`hris_population_2025.csv`), DS-02 (`welfare_provider_q1q3.xlsx`), DS-03 (`lms_completions_2025.csv`), DS-04 (`esg_initiatives_manual.xlsx`).
- On selection: show file metadata (row count, source type, quality indicator, sensitivity flags).
- On confirm: trigger IngestionSimulatorService → progress simulation → hand off to AI Mapping Review.
- DS-02 (welfare provider) is the primary demo file: non-standard headers, low confidence mapping, sensitive wellbeing fields.

**Required UI states:**
- Idle: file selector with available synthetic files.
- Processing: progress bar with "Analyzing column structure…" message.
- Complete: batch metadata summary → CTA to AI Mapping Review.
- Error: intentional error state for edge case demo (missing date, unknown format).

### 12.2 AI Mapping Review (A-04)

**Behavior:**
- MappingConfidenceService returns mapping suggestions per column header.
- Table: source column | suggested KORA field | pillar | confidence score | match reason | flags | action.
- Confidence ≥ 0.75: green — pre-approved suggestion.
- Confidence 0.50–0.74: yellow — review recommended.
- Confidence < 0.50: red — human review required.
- Sensitive wellbeing fields: additional sensitivity badge regardless of confidence.
- Actions: Approve, Override (select alternative mapping), Reject.
- Batch approval available for high-confidence rows (≥ 0.75).
- Rejected rows are excluded from UEF draft.
- Overrides are recorded as reviewer decisions (for future training data — not production yet).

**Required demo cases (from doc 25 DQ examples):**
- High-confidence: LMS headers map cleanly to GROWTH event types.
- Low-confidence: Welfare provider "Sessione B.O." → EV-LIFE-02 at 0.38.
- Sensitive flag: Mindspace "supporto psicologico" → HIGH sensitivity badge.
- Unknown type: ESG freeform "budget transfer" → confidence = 0, rejection suggested.
- Missing date: 12 rows from DS-02 with no event_date — flagged.

### 12.3 UEF Review (A-05)

**Behavior:**
- Table of UEF draft records after mapping. All statuses visible: approved, rejected, flagged, under_review.
- Per row: event_type, pillar_primary, source_type, evidence_type, verification_level, privacy_sensitivity, confidence_mapping_score, review_status.
- Actions: Approve, Reject (requires reason), Flag (approve with note).
- Filters: by status, by pillar, by sensitivity, by confidence range, by source.
- Rejected records are excluded from scoring — shown in rejected count.
- Flagged records enter scoring but carry a note.
- Sensitive HIGH records: row shows category badge + sensitivity icon — no session detail visible even in expanded row.
- Collective initiative events: shown with `worker_pseudonym_id = null` and `eligible_for_kora_contribution = true`.

**Only approved + flagged records are passed to ScoringSimulatorService.**

---

## 13. Scoring Simulation Build

### 13.1 Scoring Run (A-06)

**Behavior:**
- KORA Admin triggers scoring run for active company + period.
- Scoring simulation reads from approved UEF records + methodology config.
- Progress sequence: "Computing Impact Units… PIB aggregation… Company rollup… Activation Safeguard evaluation… KORA Index calculation… Confidence Score…"
- Output: KORA Index value + all 10 components + Confidence Score + Safeguard status + KORA Contribution.
- All outputs tagged: `methodology_version_id = v0.1`, `calibration_status = pre_empirical_calibration`.
- Scenario S1 produces WARNING state (AR=0.38, MAR=0.22); Scenario S2 produces CLEAR (AR=0.52, MAR=0.38); Scenario S3 produces FLAGGED.

### 13.2 Methodology Configuration Requirements

**`/data/methodology/methodology-config.json` must contain:**

| Field | Value | Notes |
|---|---|---|
| methodology_version_id | v0.1 | Displayed on all scoring outputs |
| calibration_status | pre_empirical_calibration | NOT NULL, never suppressible |
| component_weights | { AR: 0.10, MAR: 0.10, NI: 0.10, WB: 0.10, PC: 0.10, PB: 0.10, EQ: 0.10, VR: 0.10, CO: 0.10, CS: 0.10 } | Equal weight vector — provisional v0.1 baseline |
| safeguard_thresholds_clear | AR ≥ 0.40 AND MAR ≥ 0.30 | From doc 21 Section 5.7 |
| safeguard_thresholds_warning | (AR ≥ 0.20 AND AR < 0.40) OR (MAR ≥ 0.15 AND MAR < 0.30) | From doc 21 Section 5.7 |
| safeguard_thresholds_flagged | AR < 0.20 OR MAR < 0.15 | From doc 21 Section 5.7 |
| nm_scaling_approach | hours_based (provisional) | Per doc 21 D-21 provisional decision |

**No component of the scoring simulation may read weights from a hardcoded constant in a component or service function. All scoring parameters come from this config file.**

### 13.3 Scenario Scoring Targets

| Scenario | AR | MAR | Safeguard | KORA Index Range | Confidence | Key Story |
|---|---|---|---|---|---|---|
| S1 — Baseline / WARNING | 0.38 | 0.22 | WARNING | 42–52 | 55–65% | Concentration, low CO, low CONNECTION/LEGACY |
| S2 — Improved / CLEAR | 0.52 | 0.38 | CLEAR | 60–68 | 72–82% | Plant activated, CO improved, VR improved |
| S3 — High Spend / FLAGGED | 0.14 | 0.09 | FLAGGED | 28–40 | 42–55% | Budget without activation |
| S4 — Strong Contribution / WARNING | 0.34 | 0.26 | WARNING | 42–52 | 60–70% | High KORA Contribution; low internal AR |

---

## 14. My KORA Build

### 14.1 Functional Core Screens

Every My KORA screen must enforce the worker-only context. The active persona from PersonaSwitcher determines all data. No employer role may access these routes.

**My KORA Home (W-01):** Persona-driven dashboard. PIB Light card summary (not a performance score — label mandatory). Top opportunities. Active collective events. Most recent milestone. Quick privacy summary. Empty state for Marco T. and Emma L.

**Personal Impact Balance (W-02):** PIB score + trend + pillar distribution chart. Calibration note always visible ("This is your personal impact balance — a pre-calibration diagnostic indicator, not an employer score."). Low-confidence label for Emma L.

**Impact Timeline (W-08):** Chronological list of experience items. Per item: pillar chip, date, event type, source, verification status, evidence status, CV eligibility. Pending evidence prompt for Giulia R. (REV-009). Empty state with guidance for Emma L. and Marco T.

**Dynamic Impact CV Light (W-09):** Two-column view: all timeline items (left) and included CV items (right). Include/exclude toggle per item. Status label mandatory on every item: verified / pending review / self-declared. LIFE/health-related items: "Participation — category level" — no clinical detail. Export button: "Your CV export is private. You control where it goes." Carla V. shows 1 excluded item with lock icon.

**My Data Control (W-11):** Full data source inventory. Per row: source, data type, usage, who can see it, visibility status. Includes consent records for partner contacts.

**Privacy & Sharing (W-12):** What employer sees (aggregate only — nothing personal). What partners see (only request context with consent). What KORA sees (pseudonymized operational records). Privacy matrix — mandatory display. Cannot be suppressed.

**Company KORA Snapshot (W-13):** Read-only aggregate company view. KORA Index range, Safeguard status, top-level participation message. No company confidential data. No individual activation data.

### 14.2 Persona Demo Requirements

| Persona | Key Demo Purpose | Critical States | Empty States |
|---|---|---|---|
| Sofia M. | Strong GROWTH profile, mixed CV status | 4 verified CV items, 1 self-declared, 1 excluded; GROWTH opportunities prominent | Weak IMPACT — opportunity suggested |
| Marco T. | Dormant majority, under-activation | 1 mandatory safety event only; empty personal plan; no CV items | My KORA Home nearly empty; activation prompts shown |
| Giulia R. | Community contributor, IMPACT+CONNECTION | 1 pending evidence (REV-009); CI-001 confirmed; CI-004 pending | Weak LEGACY — opportunity suggested |
| Alessandro B. | LIFE-dominant, health-related events at category level | Health check: "Participation — category level"; Nutriwell booking upcoming | No IMPACT, no LEGACY |
| Emma L. | New joiner, minimal data | 0 CV items; 0 bookings; 0 milestones; Privacy & Sharing shown with welcome message | Almost all sections empty with "start here" copy |
| Davide N. | Remote worker | Online-only partner map; CONNECTION gap visible | No in-person connection events |
| Roberto F. | Senior mentor, LEGACY+CONNECTION | 4 mentoring sessions with mentee feedback; Verified Mentor milestone | No IMPACT (plant-site constraint) |
| Carla V. | Legacy builder, richest profile | 8 CV items, 1 excluded by choice; 4 milestones; Legacy Builder milestone | Nothing empty — show completeness |

### 14.3 Critical My KORA UX Rules

- PIB is not a performance score. The phrase "performance score" must never appear anywhere in My KORA.
- Employer cannot see My KORA. Every My KORA screen shows a subtle privacy confirmation.
- Worker controls Dynamic CV export. The export triggers no employer notification.
- LIFE/health-related events: category level only in CV, timeline, and opportunity cards.
- No ranking, no leaderboard, no comparison between workers.
- No reward, no points, no cashback language.

---

## 15. Booking Light and Partner Contact Build

### 15.1 Status State Machine

```
Available
  → Requested (worker submits request)
    → Confirmed (partner/program confirms)
    → Waitlisted (capacity reached)
    → Cancelled (worker or system cancels)
  → Confirmed
    → Completed (event happened)
      → Verified (evidence validated by advisor or partner)
      → Pending Evidence (completion claimed; evidence upload needed)
```

### 15.2 What Is and Is Not in Booking Light

| Allowed | Not Allowed |
|---|---|
| Request participation | Payment checkout |
| Join waitlist | Pricing display |
| Confirm or cancel a request | Slot inventory management |
| Track request status | Calendar sync |
| Contact a partner (with consent step) | Provider scheduling system |
| Upload evidence of completion | Voucher issuance |
| Add verified experience to Impact Timeline | Legal booking contract |
| Include/exclude from Dynamic CV | Reward or points redemption |
| Add to personal plan | Cancellation policy management |

### 15.3 CI-001 Waitlist Demo (Required)

CI-001 Città Aperta must be in a waitlisted state for at least one persona. The waitlist demo shows: "This event is full. You've been added to the waitlist. Your position: 4." This demonstrates overbook handling without a slot inventory engine.

---

## 16. Partner Workspace Light Build

Partner workspace is built as semi-functional preview. Partners can demonstrate meaningful actions without revealing worker data or becoming a marketplace.

**What partner can do in demo:**
- View and edit their profile and service listing.
- Propose a new opportunity linked to a KORA pillar.
- Propose a new collective initiative (linked to one or more companies).
- View incoming worker request context (with consent flag visible) — no worker PIB or timeline.
- Confirm or decline a worker request.
- Upload evidence for a collective initiative or partner validation review.
- View advisor validation status (read-only).

**What partner cannot do:**
- View any worker PIB score.
- View any worker timeline or Dynamic CV.
- View any company confidential KORA Index data.
- Process payment or manage checkout.
- Manage a booking engine or slot inventory.

**Required demo moment (P-05 Requests & Participants):**
Show Giulia R.'s request to CI-001. Partner sees: request context, consent flag, requested date, request status. Partner does not see: Giulia's PIB, Giulia's full timeline, Giulia's name (unless she has consented to share).

---

## 17. Advisor Workspace Light Build

Advisor workspace is built as semi-functional preview. Advisors demonstrate the validation loop — from review queue through evidence inspection to confidence assignment.

**What advisor can do:**
- View their assigned review queue (12 records: 6 complete, 4 pending, 2 needs more info).
- Open a review detail and inspect linked evidence.
- Assign eligibility confidence (0.0–1.0) with rationale text.
- Flag "Needs More Info" with a specific information request.
- Submit a completed recommendation.

**Required demo moments:**
- REV-003 (CI-001 Città Aperta evidence pending): Show evidence upload status, advisor waiting for Q3 evidence batch.
- REV-006 (Nutriwell needs more info): Show "service scope partially unclear" — advisor has requested clarification.
- REV-012 (Learning Accelerator completed): Show completed recommendation with high confidence (0.90).

**What advisor cannot do:**
- Access unassigned review records.
- See worker PIB or full profile (REV-009 is worker evidence review — scoped to that single record).
- Access advisor certification academy (future vision).

---

## 18. Reports and Export Build

### 18.1 Required Reports

| Report | Priority | Build Type | Key Required Fields | Export Format |
|---|---|---|---|---|
| KORA Snapshot | P0 | Functional Demo | KORA Index, Confidence, Safeguard status, period, methodology_version_id, calibration_status, top 3 warnings | Browser print / PDF |
| Executive Report | P0 | Functional Demo | All above + component breakdown + top 3 actions + data completeness + limitations disclaimer | Browser print / PDF |
| HR / People Report | P1 | Functional Demo | Activation metrics, pillar distribution, participation by dept/site (aggregate), data completeness, Safeguard, calibration_status | Browser print / PDF |
| ESG / Sustainability Report | P1 | Functional Demo | KORA Contribution, IMPACT pillar, collective initiatives, advisor validation, calibration_status | Browser print / PDF |
| Financial Governance Report | P1 | Functional Demo | Budget overview, cost per IU (informational), pillar allocation, fiscal classification status, calibration_status | Browser print / PDF |
| KORA Contribution Report | P2 | Semi-Functional Preview | KORA Contribution Light, initiatives, participants (aggregate), advisor status, calibration_status | Preview only |
| Partner & Ecosystem Report | P3 | Semi-Functional Preview | Partner catalog, validation status, aggregate engagement | Preview only |
| Advisor Validation Report | P3 | Semi-Functional Preview | Review records, eligibility confidence, pending/completed | Preview only |

### 18.2 Mandatory Report Fields (Every Report)

- `methodology_version_id = v0.1` — displayed prominently.
- `calibration_status = pre_empirical_calibration` — non-suppressible, in every report header.
- Confidence Score — shown in report header alongside any KORA Index figure.
- Reporting period (start–end dates).
- Report generation date.
- Limitations / disclaimer: _"Foundation Light v0.1 — Pilot-grade diagnostic intelligence. Not empirically validated, certified, or regulatory-grade."_

**No report may omit calibration status. No report may claim certified, regulatory-grade, or empirically validated status.**

---

## 19. Future Vision Build

### 19.1 Static Mockup Rules

All future-vision screens are static. They contain no runtime logic, no active data, no functional CTAs.

| Screen | Label Required | Content |
|---|---|---|
| FV-01 KORA Certified | "Future Vision / Not Active in Foundation Light" | Certified badge concept, certified evidence package narrative, CSRD/ESRS integration concept |
| FV-02 KORA Link | "Future Vision / Not Active in Foundation Light" | NFC/QR hardware integration visual, real-time verification concept |
| FV-03 KORA Impact Pledge | "Future Vision / Not Active in Foundation Light" | Pledge mechanism concept — not KIP points, not wallet |
| FV-04 KORA Value Chain | "Future Vision / Not Active in Foundation Light" | Supply chain / partner ecosystem contribution concept |
| FV-05 Territorial Maps | "Future Vision / Not Active in Foundation Light" | Territory intelligence map concept |

**Technical rules for future vision screens:**
- No SQL-backed data behind these screens.
- No active state management.
- All CTAs are either disabled (grayed) or labeled "Preview only".
- No misleading claim that any feature is "coming soon" with a specific date.
- No mock data that looks like real activation on future features.

---

## 20. Demo Routes and First 3-Minute Scripts

### Route A — Company (CHRO / ESG Director / CFO)

**Persona:** Company Admin or Company HR role. Scenario: S1 → optional S2 toggle.

| Step | Screen | Data | Story Beat | Objection Answered |
|---|---|---|---|---|
| 1 | Executive Cockpit (C-01) | S1: KORA Index 47, WARNING, Confidence 62% | "This is your company's real human activation picture." | "What does KORA actually measure?" |
| 2 | KORA Index Detail (C-02) | 10-component breakdown + explainability | "The score is explained. Nothing is a black box." | "Is this a black-box AI?" |
| 3 | Warnings (C-07) | Top 3 warnings: concentration, CO, CONNECTION | "64% of your impact comes from 12% of your workers." | "We're already running programs." |
| 4 | Activation & Participation (C-04) | Operations site 8% of IU despite 36% of workers | "Your Operations site is nearly invisible in the data." | "We have 250 workers — where are they?" |
| 5 | KORA Contribution (C-03) | S1: Low (0.15); CI-001, CI-002 active | "And this is what your company contributes beyond its perimeter." | "How does KORA differ from ESG reporting?" |
| 6 | Reports (C-12) | KORA Snapshot + Executive Report | "Here is a board-ready report — generated in 30 seconds." | "Can Finance see this?" |
| 7 | Scenario toggle → S2 | Executive Cockpit refreshed to S2: CLEAR, 64 | "After acting on KORA's recommendations, this is what changes." | "Is this actionable?" |

---

### Route B — Worker (My KORA)

**Persona:** Giulia R. (community contributor). No employer role in view.

| Step | Screen | Persona Data | Story Beat |
|---|---|---|---|
| 1 | My KORA Home (W-01) | Giulia: milestones, 2 CI events, opportunities | "This is your private space. Your employer cannot see any of this." |
| 2 | Privacy & Sharing (W-12) | Privacy visibility matrix | "What your employer sees: aggregate data only. Nothing here." |
| 3 | Personal Impact Balance (W-02) | Giulia: IMPACT+CONNECTION strong | "This is your personal impact balance. Not a performance score." |
| 4 | Impact Timeline (W-08) | CI-001 verified, REV-009 pending | "Your collective contribution is verified — and pending for one event." |
| 5 | Collective Impact Events (W-04) | CI-001 confirmed; CI-004 pending; CI-001 waitlisted for another persona | "This is a cross-company initiative. Your contribution is recorded and verified." |
| 6 | Dynamic Impact CV (W-09) | 5 items; 3 verified; 2 self-declared | "Only you decide what goes in your Dynamic Impact CV. And only you decide where it goes." |
| 7 | Company KORA Snapshot (W-13) | Aggregate company view | "Your company's picture — but your data is never part of this individual view." |

---

### Route C — KORA Admin (Full Intelligence Loop)

**Persona:** KORA Admin role. Scenario: S1.

| Step | Screen | Data | Story Beat |
|---|---|---|---|
| 1 | Company & Program Setup (A-02) | Meridiana Group config | "Company, program, period, methodology version — all configured." |
| 2 | Upload Studio (A-03) | DS-02: welfare provider 620 rows | "We start from your existing files. No new data requirements." |
| 3 | AI Mapping Review (A-04) | DQ-01, DQ-03, DQ-05 + sensitive flag | "AI suggests. You approve. Every sensitive field is flagged." |
| 4 | UEF Review (A-05) | Approved / rejected / flagged statuses | "Only approved events enter the scoring pipeline." |
| 5 | Scoring Run (A-06) | S1 output: WARNING, KORA Index 47 | "Scoring runs against approved UEF. Methodology version is pinned. Calibration status is pre-empirical." |
| 6 | Explainability Review (A-07) | Component-level explanation | "Every component is explainable. Every output has a reason." |
| 7 | Reports (C-12) | KORA Snapshot + Executive Report | "Board-ready report in 30 seconds." |
| 8 | Founder Validation Cockpit (A-14) | 25 contacts, 5 pilot interests | "This is the market signal. 5 pilot interests. 2 letters of intent." |

---

### Route D — Partner

**Persona:** Partner Admin Light (KnowledgeBridge). Scenario: S2.

| Step | Screen | Data | Story Beat |
|---|---|---|---|
| 1 | Partner Home (P-01) | 2 pending requests, REV-005 completed | "KORA validates partner quality. Here is my queue." |
| 2 | Services & Opportunities (P-03) | KnowledgeBridge: LEGACY + CONNECTION services | "Partners define services aligned to KORA pillars — not product catalog listings." |
| 3 | Collective Initiative Builder (P-04) | CI-003 Mentori in Comune | "Partners can co-create cross-company impact programs." |
| 4 | Requests & Participants (P-05) | Giulia R. confirmed request (consent visible) | "Worker requests arrive scoped. No individual PIB visible. Consent is explicit." |
| 5 | Evidence Upload (P-06) | REV-010: needs attendance list | "Partners upload evidence. Advisors validate. The chain is auditable." |

---

### Route E — Advisor

**Persona:** Advisor External Light (Dr. Anna Ferretti). 6 assigned reviews.

| Step | Screen | Data | Story Beat |
|---|---|---|---|
| 1 | Advisor Home (AD-01) | 6 assigned: 3 complete, 2 pending, 1 needs info | "Here is my validation queue." |
| 2 | Review Queue (AD-02) | REV-003 pending; REV-006 needs more info | "Evidence review is structured and auditable." |
| 3 | Review Detail — REV-003 (AD-03) | CI-001 Città Aperta — evidence batch pending | "I inspect the evidence before assigning confidence." |
| 4 | Eligibility Confidence Assignment (AD-04) | REV-001 completed: confidence 0.88 | "Confidence is assigned with rationale — not a black box." |
| 5 | Recommendations (AD-05) | REV-012 completed: Training Art.51 classified | "My recommendations improve KORA's intelligence and the company's scoring trajectory." |

---

### Route F — Investor / Founder Validation

**Persona:** KORA Admin / Founder role. A-14 primary screen.

| Step | Screen | Data | Story Beat |
|---|---|---|---|
| 1 | Founder Validation Cockpit (A-14) | 25 contacts, 12 demos, 5 pilot interests | "This is the market signal. 12 demos completed. 5 companies confirmed pilot interest." |
| 2 | KPI Summary | Pipeline €142K soft ARR | "Revenue signals: €142K in soft commitments from 3 companies." |
| 3 | Objection Catalog | "Is the score validated?" → calibration_status visible everywhere | "The most common objection is validation. KORA answers it architecturally — not rhetorically." |
| 4 | Executive Cockpit (C-01) — Company view | S1: WARNING → S2: CLEAR | "This is what KORA shows a CHRO. This is why they pay." |

---

## 21. Acceptance Criteria

The demo build is acceptable only if the following can be demonstrated without breaking, mocking, or manually faking responses. This extends and operationalizes doc 22A Section 12.

### Company Side

- [ ] Executive Cockpit populates with all 6 widget groups from S1 seed data.
- [ ] KORA Index displays Confidence Score and calibration_status on every render.
- [ ] All 10 KORA Index components are shown with individual values.
- [ ] Activation Safeguard displays CLEAR / WARNING / FLAGGED based on scenario.
- [ ] KORA Contribution is separate from KORA Index — not a component of it.
- [ ] Warnings and Next Actions surface S1-specific data (concentration, CO, CONNECTION).
- [ ] S1 → S2 scenario toggle updates Executive Cockpit without page reload.
- [ ] Group below 10 workers (DQ-07) triggers suppression with correct copy.
- [ ] Financial Governance shows budget and cost per IU with informational label.
- [ ] Reports generate correct preview for at least 3 report types (Executive, HR, ESG).

### KORA Admin Side

- [ ] Upload Studio presents preloaded synthetic files for selection.
- [ ] AI Mapping Review shows confidence scores, sensitivity flags, and override flow for DS-02.
- [ ] UEF Review table shows approved / rejected / flagged records with correct counts.
- [ ] Sensitive wellbeing UEF record shows sensitivity badge — not session detail.
- [ ] Scoring Run simulates progress and outputs S1 KORA Index with calibration label.
- [ ] Explainability Review shows component-level plain-language text.
- [ ] Founder Validation Cockpit shows 25 contacts and KPI summary.

### My KORA Side

- [ ] My KORA Home renders correctly for all 8 personas.
- [ ] Personal Impact Balance is labeled "personal impact balance" — never "performance score".
- [ ] Privacy & Sharing screen is accessible immediately from My KORA Home.
- [ ] Employer cannot navigate to My KORA — route guard enforced.
- [ ] Impact Timeline shows pending evidence state for Giulia R.
- [ ] Impact Timeline shows empty state with guidance for Emma L.
- [ ] Dynamic CV shows status labels (verified / pending / self-declared) on every item.
- [ ] Dynamic CV shows excluded item for Carla V. with lock icon.
- [ ] LIFE/health-related items (Alessandro B.) show "Participation — category level" only.
- [ ] Partner contact flow shows consent step before any data passes to partner.
- [ ] CI-001 shows waitlisted state for at least one persona.
- [ ] Company KORA Snapshot shows aggregate data only — no company confidential detail.

### Partner and Advisor Side

- [ ] Partner sees no worker PIB — requests show only scoped context with consent flag.
- [ ] Advisor sees only their 6 assigned reviews — no cross-advisor access.
- [ ] Evidence Upload simulation presents REV-003 pending state.
- [ ] Eligibility Confidence Assignment allows confidence input with rationale.
- [ ] REV-012 shows completed recommendation example.

### Privacy and Data Quality

- [ ] Synthetic/demo label is visible on at least the primary demo surfaces.
- [ ] Every KORA Index output includes methodology_version_id = v0.1 and calibration_status = pre_empirical_calibration.
- [ ] No report omits calibration status label.
- [ ] KORA Contribution is shown as a companion indicator — not as a KORA Index component.
- [ ] No employer role can access any My KORA route.

---

## 22. Technical Risks and Mitigations

| # | Risk | Severity | Mitigation | Build Rule | QA Check |
|---|---|---|---|---|---|
| 1 | Dev generates production schema before Gate 2 | Critical | Gate 2 is explicit in every document; CTO must not provision Supabase/Prisma before Gate 2 | No Prisma, no Supabase, no SQL DDL in codebase before Gate 2 | Verify: no `prisma/schema.prisma` file exists in repo |
| 2 | Demo app becomes shallow UI mockup with no data logic | High | Services must implement behavioral logic — not just return static UI states | All services read from seed data and apply logic; not all screens return hardcoded JSX | Verify: UEF Review actually filters records; Scoring shows scenario-correct outputs |
| 3 | Scores hardcoded in components | High | ScoringSimulatorService and methodology-config.json are the only sources of scoring values | Lint rule: no magic number constants in score-related components | Verify: Changing methodology-config in a controlled test environment updates dependent displays consistently. The default demo configuration remains v0.1 equal-weight scaffolding unless explicitly changed through founder-approved methodology configuration. Developers must not tune config values to improve demo appearance — scenario outputs must remain aligned with doc 25 expected ranges. |
| 4 | Employer view accidentally shows worker-level data | Critical | Route guards + component-level role checks + PrivacyVisibilityService | RolePermissionService called on every data-accessing render | Verify: switch to Company Admin — My KORA routes are inaccessible; no individual worker data in C-04 |
| 5 | My KORA reduced to PIB score only | High | My KORA has 14 screens; all must be built to minimum Phase 2 quality | Phase 2 includes all 7 My KORA functional core screens — none may be dropped | Verify: demo Route B covers 7 steps without narration |
| 6 | Partner side drifts to marketplace | High | No pricing, no checkout, no slot inventory, no calendar sync | BookingRequestService state machine has no payment state | Verify: no pricing language in any P-xx screen; no checkout flow |
| 7 | Booking Light becomes booking engine | High | State machine is the entire booking system — not a wrapper on a real engine | 8 status states implemented in BookingRequestService only | Verify: no external booking SDK in package.json |
| 8 | KORA Contribution mistaken for a KORA Index component | High | KORA Contribution is always displayed separately; never in the 10-component breakdown | TenComponentBreakdown must not include KORA Contribution | Verify: KORA Index Detail (C-02) has 10 bars — not 11 |
| 9 | Synthetic data mistaken for live pilot data | High | synthetic_demo_data flag + DemoDataLabel component on primary surfaces | All seed files carry `synthetic_demo_data: true`; label component is non-suppressible in demo build | Verify: "Demo data" label visible on Executive Cockpit |
| 10 | Future Vision screens appear active | High | Static render with "Future Vision / Not Active" label; no data binding | No data from seed files bound to FV-xx screens | Verify: FV-01 has no functional CTA and "Future Vision" label is prominent |
| 11 | Privacy Officer / Admin distinction ignored | High | KORA Admin role does not get Privacy Officer access in demo; two distinct role definitions | RolePermissionService has separate permission sets for KORA Admin and KORA Privacy Officer | Verify: switching to KORA Admin does not expose worker bookings or Dynamic CV |
| 12 | Scoring simulation looks empirically certified | High | Calibration status badge is mandatory on every score surface; limitations text in reports | CalibrationStatusBadge renders unconditionally alongside any score | Verify: calibration_status badge renders even when switching scenarios |
| 13 | Fiscal classification looks like tax advice | Medium | Fiscal classification table must carry informational label | "Indicative — not tax advice. Gate 5 active." label on all fiscal surfaces | Verify: C-09 and partner fiscal fields show informational label |
| 14 | Worker evidence upload accepts clinical data | Medium | Evidence upload simulation rejects clinical document types in demo; no clinical data in seed files | EvidenceUploadCard must not accept medical/clinical file types | Verify: no clinical document fields in dynamic-cv-items.json |
| 15 | Reports look regulatory-grade | Medium | Limitations disclaimer mandatory on every report; no certified language | ReportGeneratorService injects limitations text in every report object | Verify: print preview of any report shows limitations text |

---

## 23. Dev Do-Not-Build List

**Production database artifacts (blocked until Gate 2):**
- SQL DDL of any kind
- Prisma schema or models
- Supabase production project provisioning
- Database migrations
- Production database seed scripts with live data
- ORM query patterns that imply production schema

**Authentication and identity (blocked until Gate 2/3):**
- NextAuth / Auth.js production setup
- JWT-based role claims connected to real users
- SPID or CIE authentication
- SSO / SAML / OAuth integration with company identity providers
- Real worker accounts for actual employees

**Live data and external services (blocked until Gate 3):**
- Real HR system ingestion pipelines
- Real welfare provider API connections
- Production file storage (S3, Supabase Storage)
- External LLM API calls on worker or HR data (OpenAI, Anthropic, etc.)
- Real-time data synchronization with partner systems

**Payment and wallet (permanently excluded from Foundation Light):**
- Stripe or any payment SDK
- Wallet top-up or balance management
- Worker reward points or redemption
- Voucher issuance
- Cashback flows
- FUO movement
- KIP / KORA Impact Pledge execution

**Marketplace and booking engine:**
- Full marketplace with product catalog and checkout
- Slot inventory management for partners
- Partner calendar sync
- Provider scheduling system
- Pricing engine
- Booking confirmation emails (no live email in demo)

**Hardware and future integrations:**
- KORA Link NFC/QR operational hardware simulation with active data
- Real-time territorial activation feeds
- Production API integrations with third-party systems
- Certified evidence packages

**Prohibited data handling:**
- Employer-accessible paths to individual UEF, IU, PIB, or worker profile records
- Detailed clinical or medical record processing, display, or storage
- Auto-export or auto-share of Dynamic CV to employer
- Sensitive session detail in health-related event records
- Worker comparisons, rankings, or peer leaderboards

**Future scope (not Foundation Light):**
- Advisor certification academy (LMS)
- Advanced KORA Contribution active mechanics
- Sector Friction Index
- Territorial Access Index
- CEF (Contribution Event Format) active computation
- KORA Value Chain active calculation
- Certified public company profile
- Regulatory-grade submission packages
- Production benchmarking marketplace

---

## Architecture Non-Regression Rules

These rules apply throughout the demo build. No build decision may violate them.

- The demo must preserve the canonical sequence: **UEF → IU → PIB → Company Aggregation → Activation Safeguard → KORA Index → Confidence → Explainability.** No step may be skipped or reordered.
- KORA Contribution remains a companion indicator — not a KORA Index component. It must never appear in the 10-component breakdown.
- PIB remains a required intermediate layer — never employer-visible under any demo path.
- Employer-facing screens consume aggregate-safe outputs only. No individual worker record is surfaced to any employer role, even in demo mode.
- Worker personal layer remains private by default. Privacy is enforced architecturally — not by policy or configuration toggle.
- Standard KORA Admin does not equal KORA Privacy Officer. They are distinct roles with distinct permission sets.
- No external LLM is called on HR or worker data under any circumstances — including demo and testing contexts.
- No scoring may be derived directly from financial or fiscal data. Financial governance and KORA Index are separate intelligence layers.
- Fiscal classification remains informational in the demo. It is not part of the KORA Index and does not feed scoring.
- Future Vision screens may not become active runtime features under any build decision. Static is permanent for Foundation Light.
- Mock data structures may not become de facto production schema without Gate 2 CTO Architecture Review. Local JSON files do not determine database design.

---

## 24. QA Checklist

### Product Scope QA

- [ ] Demo covers all 5 product sides: Admin, Company, My KORA, Partner, Advisor.
- [ ] All P0 screens are functional with seed data — no screen is a placeholder.
- [ ] Future Vision screens are static and labeled correctly.
- [ ] No new KORA Index component has been introduced beyond the 10 in doc 10 / doc 21.
- [ ] KORA Contribution is a companion indicator — not a KORA Index component.
- [ ] No payment, wallet, marketplace, or booking engine feature is present.
- [ ] No KORA Link, KIP, CEF, or Appendix B concept has been activated.

### Privacy QA

- [ ] Employer role cannot access `/my-kora` routes.
- [ ] Group below 10 workers triggers PrivacyThresholdBadge and suppresses aggregate data.
- [ ] Worker personal layer (PIB, timeline, CV, bookings, plan, consent) is inaccessible to employer roles.
- [ ] Sensitive wellbeing records in UEF Review show category badge — no session detail visible.
- [ ] LIFE/health-related Dynamic CV items show "Participation — category level" only.
- [ ] Dynamic CV export triggers no employer notification — worker-controlled only.
- [ ] Partner contact flow includes explicit consent step before any data shares.
- [ ] Collective initiative participants are aggregate counts only — no individual names.
- [ ] Advisor sees only their assigned reviews — no cross-advisor or cross-company access.

### Role Permission QA

- [ ] Switching to Company Finance role shows aggregate KORA Index summary, Confidence Score, and finance-linked indicators (Financial Governance, cost per IU, fiscal classification informational layer).
- [ ] Switching to Company Finance role hides worker-level records, individual UEF/IU/PIB, worker bookings, partner contacts, Dynamic CV, personal timeline, and department activation data below the privacy threshold.
- [ ] Switching to KORA Analyst role hides worker personal layer but shows pseudonymized UEF records.
- [ ] KORA Admin standard role cannot view worker bookings, Dynamic CV, or personal plan.
- [ ] KORA Privacy Officer is defined as a distinct role — not interchangeable with KORA Admin.
- [ ] Partner sees only scoped request context — no PIB, no timeline, no full CV.

### Data Binding QA

- [ ] All 29 seed files load without errors.
- [ ] Every seed file contains `synthetic_demo_data: true` at root.
- [ ] Each of the 8 worker personas loads distinct data from `pib-records.json`.
- [ ] Scenario switch (S1/S2/S3/S4) updates `kora-index-outputs.json` data across all company screens.
- [ ] No screen falls back to hardcoded UI data when seed data is available.
- [ ] methodology-config.json is the sole source of weights, thresholds, and version identifiers.

### Scoring Display QA

- [ ] Does every KORA Index display include Confidence Score? **Must be yes.**
- [ ] Does every KORA Index display include `calibration_status = pre_empirical_calibration`? **Must be yes.**
- [ ] Does every KORA Index display include `methodology_version_id = v0.1`? **Must be yes.**
- [ ] Are all 10 KORA Index components shown with individual values? **Must be yes.**
- [ ] Is Activation Safeguard status visually distinct from KORA Index value? **Must be yes.**
- [ ] Does KORA Contribution display separately from KORA Index breakdown? **Must be yes.**
- [ ] Are weights in TenComponentBreakdown read from methodology-config.json? **Must be yes.**
- [ ] methodology-config.json has not been tuned to produce better-looking demo outcomes. Scenario outputs match doc 25 expected ranges.

### My KORA QA

- [ ] My KORA Home renders a distinct experience for each of the 8 personas.
- [ ] Personal Impact Balance never uses the phrase "performance score."
- [ ] Privacy & Sharing is the second screen visited in the worker demo route.
- [ ] Dynamic CV export button is visible and labeled with privacy copy.
- [ ] Dynamic CV items each show status: verified / pending / self-declared.
- [ ] Alessandro B.'s health check shows category level — no clinical detail.
- [ ] Carla V.'s excluded CV item shows a lock icon.
- [ ] Emma L.'s empty states show "start here" guidance — not error states.
- [ ] CI-001 waitlist state is demonstrable for at least one persona.

### Partner/Advisor QA

- [ ] P-05 (Partner Requests) does not show worker PIB for any request.
- [ ] P-05 shows consent flag on requests where worker has consented.
- [ ] AD-02 (Advisor Review Queue) shows only assigned reviews for active advisor persona.
- [ ] AD-04 (Eligibility Confidence) form accepts a 0.0–1.0 confidence value with rationale.
- [ ] Evidence upload simulation shows REV-003 pending state correctly.

### Report QA

- [ ] Every report preview includes calibration_status label.
- [ ] Every report preview includes methodology_version_id.
- [ ] Every report preview includes Confidence Score alongside any KORA Index figure.
- [ ] Every report preview includes the limitations disclaimer text.
- [ ] No report contains the phrase "certified", "validated", "empirically proven", or "regulatory-grade."
- [ ] KORA Snapshot is exportable as browser print / PDF.

### Future Vision QA

- [ ] All FV-xx screens carry "Future Vision / Not Active in Foundation Light" label.
- [ ] No FV-xx screen has a functional CTA that triggers any data operation.
- [ ] No FV-xx screen displays active seed data as if the feature were live.
- [ ] Future Vision section is navigable from sidebar but visually distinct from active areas.

### Demo Route QA

- [ ] Route A (Company) — 7 steps from Executive Cockpit to S1→S2 toggle complete without prompting.
- [ ] Route B (Worker) — 7 steps from My KORA Home to Company Snapshot complete for Giulia R.
- [ ] Route C (Admin) — 8 steps from Company Setup to Founder Validation complete.
- [ ] Route D (Partner) — 5 steps from Partner Home to Evidence Upload complete.
- [ ] Route E (Advisor) — 5 steps from Advisor Home to completed recommendation complete.
- [ ] Route F (Investor) — 4 steps through Founder Validation and Company view complete.

---

## 25. Final Build Decision

> **KORA Foundation Light is ready for controlled demo app build using local synthetic data and mock services.**
>
> The build may proceed with UI scaffolding, local JSON/CSV seed files, mock API service layer, scoring simulation, ingestion simulation, role switcher, scenario switcher, persona switcher, and report previews.
>
> **The build may not proceed with SQL DDL, production schema, Prisma models, Supabase production provisioning, live data ingestion, production worker accounts, payments, marketplace booking engine, KORA Link operational hardware, or live fiscal outputs before the relevant gates close.**
>
> Gate 2 (CTO review) must be initiated in parallel with the demo build. Gate 2 closes the path to doc 22 SQL Schema Specification, which is the first production code artifact in the KORA project.
>
> The demo build may start, but production architecture remains subject to Gate 2 CTO Architecture Review. The demo must be built so that mock services can later be replaced by production services without violating KORA's target architecture.

### Next Steps in Order

| Step | Action | Gate Required | Output |
|---|---|---|---|
| 1 | Scaffold demo app: Next.js + TypeScript + Tailwind + shadcn/ui + routing | None | Runnable app shell with 5 sides and role switcher |
| 2 | Generate local synthetic JSON/CSV seed files from doc 25 specifications | None (local files only) | 29 seed files in `/data/synthetic/` |
| 3 | Build methodology-config.json with v0.1 weights, thresholds, version | None | Scoring config ready before any score component renders |
| 4 | Implement mock services (ScoringSimulator, IngestionSimulator, PrivacyVisibility, DynamicCV, all 15 services) | None | Service layer fully operational against seed data |
| 5 | Build Phase 1 P0 screens: Executive Cockpit, KORA Index, AI Mapping, UEF Review, Scoring Run, Explainability, Reports | None | Full admin/company intelligence loop demoable |
| 6 | Build Phase 2 P0 My KORA screens: Home, PIB, Impact Timeline, Dynamic CV, Privacy & Sharing | None | Worker value layer credible with 8 personas |
| 7 | Build Phase 3 ecosystem preview: Partner, Advisor, Opportunities, Collective Events | None | Full 5-sided demo complete |
| 8 | Run QA checklist against all 10 categories | None | Zero critical failures before demo |
| 9 | Prepare Gate 2 CTO Review Pack in parallel with build | None (preparation only) | CTO review pack: docs 10, 12, 13, 20, 21 |
| 10 | After Gate 2 closes: create `docs/22-foundation-light-sql-schema-specification.md` | **Gate 2 required** | First production code artifact — SQL DDL for all stores |

---

## v1.0 Patch Notes

Applied 2026-05-17:

- **Architecture projection clarified:** Added build principle stating that Foundation Light demo build must project the target KORA architecture, not bypass it. Mock services and local seed files must mirror future production boundaries (Section 2.1).
- **Demo-to-Production Alignment table added:** Section 9A maps all 12 demo constructs (role switcher, seed files, all 15 mock services) to their future production equivalents, gate dependencies, and non-negotiable boundaries.
- **Company Finance visibility refined:** Section 10.1 updated to correctly authorize aggregate KORA Index summary, Confidence Score, Financial Governance Light, budget vs activation aggregates, cost per IU, fiscal classification informational layer, and finance-relevant reports for Company Finance. Absolute restrictions on worker-level records and privacy-sensitive drilldowns maintained.
- **Seed file visibility rule added:** Section 8 now explicitly prohibits direct component-level imports from sensitive seed files for employer-facing screens. All data access must pass through RolePermissionService and PrivacyVisibilityService. Sensitive seed files enumerated.
- **Methodology-config QA wording refined:** Risk #3 in Section 22 updated to prohibit tuning config values to improve demo appearance. Scenario outputs must remain aligned with doc 25 expected ranges.
- **Mock service discipline strengthened:** Section 9 now defines mock services as architectural contracts. Components must depend on service interfaces, not raw seed files. All services returning score, privacy, permission, or report data must include mandatory production metadata.
- **Architecture Non-Regression Rules added:** New section before QA Checklist defines 11 non-negotiable architectural rules for the demo build (canonical sequence, KORA Contribution as companion indicator, PIB privacy, employer restrictions, no LLM on HR/worker data, fiscal classification separation, Future Vision static lock, mock data does not become schema).
- **Final Build Decision clarified:** Section 25 now includes explicit statement that the demo must be built so that mock services can be replaced by production services without violating KORA's target architecture.

---

**Document version:** v1.0 (patch applied 2026-05-17)
**Date:** 2026-05-17
**Canonical inputs:** docs 10, 18, 19, 20, 21, 21b, 22A, 23, 24, 25, Appendix A
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN (blocks SQL and production schema) · Gate 3 OPEN (blocks live data) · Gate 4 Provisional · Gate 5 OPEN (blocks live fiscal)
**Next action:** Begin Phase 0 demo app scaffold. Generate local synthetic seed files from doc 25. Initiate Gate 2 CTO Review Pack preparation in parallel.
