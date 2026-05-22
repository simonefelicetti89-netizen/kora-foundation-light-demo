# KORA — Claude Code Operating Constitution

This file is the authoritative operating guide for every Claude Code session working on KORA.
Read this file completely before taking any action. The rules here are non-negotiable.

Canonical strategy documents are in `/docs`. This file does not duplicate them — it governs how Claude Code interacts with the project.

---

## 1. KORA Identity

KORA is a **Human Impact Intelligence Platform**.

Core positioning: **"The human layer."**

KORA transforms heterogeneous organizational data — welfare events, training completions, volunteering, collective initiatives, partner activity, HR records, ESG contributions — into structured, explainable, privacy-safe organizational activation intelligence.

KORA measures **organizations**, not individuals. The KORA Index is a company-level output. Individual intermediate data (PIB, IU, UEF) exists only to produce that aggregate — never to rate, rank, or surveil individual workers.

---

## 2. What KORA Is Not

These distinctions are constitutional. They must be preserved in every product, technical, and UX decision.

| KORA is... | KORA is NOT... |
|---|---|
| Human Impact Intelligence Platform | A generic HR dashboard |
| Organizational activation intelligence | A welfare or benefits platform |
| Privacy-first worker value layer | An employee wellbeing tracker |
| Verified impact measurement | An ESG report generator |
| Multi-sided ecosystem intelligence | A benefits marketplace |
| Explainable, methodology-versioned scoring | A black-box AI system |
| Pilot-grade diagnostic intelligence | An employee surveillance system |
| Governance-grade audit trail | A worker ranking or gamification platform |
| Companion indicator for KORA Contribution | A social network or performance tool |

If any screen, component, service, or route begins to look like welfare management, HR tracking, employee ranking, benefits booking, or a marketplace — it has drifted out of KORA's identity. Stop and correct.

---

## 3. Canonical Architecture — 14-Stage Algorithm

The following sequence is canonical, mandatory, and non-reorderable. No stage may be skipped, merged, or bypassed.

```
Raw Source Data
  → Stage 1:  Data Source Ingestion (HR system, welfare provider, LMS, ESG, manual)
  → Stage 2:  AI Upload Studio (file parsing, column header detection)
  → Stage 3:  Privacy Layer (pseudonymization, sensitivity tagging, worker consent check)
  → Stage 4:  Data Quality Engine (completeness, verification tier, source trust)
  → Stage 5:  UEF (Unified Event Frame — first structured record per action)
  → Stage 6:  NM (Normalized Magnitude — intensity scaling per event)
  → Stage 7:  BC (Base Contribution Matrix — pillar weight per event type)
  → Stage 8:  Correction Factors (CQ, EV, CF)
  → Stage 9:  Anti-Gaming Factor (AGF — mandatory, range 0.00–1.00, independent)
  → Stage 10: IU Engine (Impact Unit computation per event per pillar)
  → Stage 11: PIB (Personal Impact Balance — sum of pillar IU per worker — MANDATORY INTERMEDIATE)
  → Stage 12: Company Aggregation (worker PIB rollup to company level)
  → Stage 13: Activation Safeguard (CLEAR / WARNING / FLAGGED — mandatory, non-bypassable)
  → Stage 14: KORA Index Engine + Confidence Score (inseparable output pair)
```

Canonical IU formula (read from versioned config — never hardcoded):
```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
```

- AGF is mandatory and independent. AGF = 0 means the event is disqualified; IU = 0.
- DF (Durability Factor): optional, LEGACY pillar only, range [1.00–1.30]
- EXF (Externality Factor): optional, IMPACT pillar only, range [1.00–1.20]
- SF (Strategic Fit): optional, any pillar, default 1.00, range [0.80–1.10], requires documented evidence

---

## 4. Five KORA Pillars

These are the grammar of KORA. Every action, event, and UEF record is classified into exactly one pillar per instance.

| Pillar | Domain |
|---|---|
| **LIFE** | Health, wellbeing, prevention, psychological support, nutrition, physical activity, safety-related wellbeing |
| **GROWTH** | Learning, skills, professional development, certifications, digital upskilling, personal evolution |
| **CONNECTION** | Mentoring, peer support, collaboration, internal communities, cross-functional engagement, team cohesion |
| **IMPACT** | Volunteering, social projects, community support, environmental initiatives, territorial contribution |
| **LEGACY** | Knowledge transfer, senior-junior mentoring, organizational memory, durable practices, cultural continuity |

Pillar codes used in code: `LIFE`, `GROWTH`, `CONNECTION`, `IMPACT`, `LEGACY`

---

## 5. KORA Index v3 — Exactly 10 Components

The KORA Index v3 has exactly these 10 components. Do not add, remove, merge, or rename any.

| Code | Name | Meaning |
|---|---|---|
| `AR` | Activation Rate | Share of workforce with at least one approved IU in the period |
| `MAR` | Meaningful Activation Rate | Share with IU above materiality threshold |
| `NI` | Normalized Intensity | Average IU magnitude per active worker |
| `WB` | Worker Balance | Distribution evenness of IU across active workers |
| `PC` | Pillar Coverage | Number of pillars with meaningful presence |
| `PB` | Pillar Balance | Evenness of IU distribution across covered pillars |
| `EQ` | Equity | Equità distributiva dell'attivazione tra segmenti della workforce (dipartimenti, fasce di seniority, tipi di contratto, siti) aggregati sopra soglia privacy. Alta Equity significa che l'attivazione non è sistematicamente concentrata in segmenti privilegiati o già ad alta partecipazione. |
| `VR` | Verification Rate | Share of IU backed by verified or partially verified evidence |
| `CO` | Continuity | Share of workers with cross-period sustained engagement |
| `CS` | Confidence Score | Data completeness, source quality, verification weight — always shown with KORA Index |

**EQ must never be redefined as Evidence Quality or Event Quality.** Evidence quality is handled by VR (Verification Rate), CS (Confidence Score), EV (correction factor in the IU formula), Evidence Debt, and Trust Ledger. For methodology component definitions, `docs/10-architecture-v3-layer-specification.md` governs — this file defers to doc 10 on all component definitions.

**KORA Contribution** is a companion indicator measuring collective and ecosystem engagement. It is NOT a KORA Index component. Display it separately — never merge it into the KORA Index computation.

**KORA Index v3 is canonical.** Previous equal weights (0.10 × 10) were provisional scaffolding and are no longer canonical.

KORA Index v3 macroblock weights — v0.1 pre-empirical calibration:
- Activation Reach — 25% (AR 12.5%, MAR 12.5%)
- Activation Quality — 30% (NI ~10%, VR ~10%, CO ~10%)
- Distribution & Equity — 25% (WB 6.25%, PC 6.25%, PB 6.25%, EQ 6.25%)
- Budget-to-Human-Impact — 20% (BudgetToHumanImpactEngine — not from component values)

**Confidence Score (CS) is external to KORA Index v3.** CS weight = 0. CS is displayed alongside the KORA Index as an external reliability indicator but does not influence the KORA Index value.

Weights are read from `lib/methodology-config/v0.1.ts` via `getMacroblockWeights()`. Never hardcoded in components or services.

---

## 6. Foundation Light Status

Foundation Light v0.1 is:
- A **controlled demo application** running on synthetic data
- **Pre-empirical-calibration** — provisional methodology v0.1
- **Pilot-grade diagnostic intelligence** — not certified, not regulatory-grade
- **Not empirically validated** — Delphi Study calibration is post-pilot
- **Not individual worker assessment** — KORA Index is a company-level output

Every surface that shows a KORA Index **must display all of the following**:

```
✓ KORA Index value
✓ Confidence Score (CS) — always beside the KORA Index, never omitted
✓ Activation Safeguard status (CLEAR / WARNING / FLAGGED)
✓ methodology_version_id (e.g. "KORA Methodology v0.1")
✓ calibration_status = "pre_empirical_calibration" — non-suppressible label
✓ 10-component breakdown (all 10 components with values and weights)
✓ Limitations / disclaimer statement
```

These are not optional UX choices. They are architectural requirements per doc 21b.

---

## 7. Canonical Documents

All canonical documents are in `/docs`. Read the relevant document before working in its domain.

| Priority | Document | Use for Code |
|---|---|---|
| **Primary — Read First** | `docs/kora-canonical-product-architecture-v1.md` | Canonical product architecture, positioning, scope matrix, capability boundaries, Italian-first language policy, alignment plan. Read before any session. |
| **Primary** | `docs/10-architecture-v3-layer-specification.md` | 14-stage algorithm, IU formula, KORA Index v3, Activation Safeguard, privacy rules |
| **Primary** | `docs/12-technical-data-model-database-schema.md` | Schema reference — after Gate 2 only |
| **Primary** | `docs/21-founder-gate-resolution-log.md` | All 21 decisions (D-01–D-21) — authoritative decision record |
| **Primary** | `docs/21b-methodology-risk-acceptance-and-provisional-score-policy.md` | Output positioning, calibration_status rules, Confidence Score display rules |
| **Primary** | `docs/22A-foundation-light-demo-build-cutline.md` | Build boundary: Functional Core / Semi-Functional / Mockup / Excluded |
| **Primary** | `docs/24-foundation-light-product-functional-spec.md` | Full product spec: roles, screens, flows, permission matrix |
| **Primary** | `docs/25-demo-dataset-and-scenarios-spec.md` | Synthetic data blueprint: all companies, workers, events, scenarios |
| **Primary** | `docs/26-foundation-light-technical-build-handoff.md` | Tech stack, folder structure, mock services, screen build priority |
| Supporting | `docs/23-code-readiness-audit-and-canonical-doc-map.md` | Canonical document authority hierarchy, code-relevant decisions |
| Supporting | `docs/27-gate-2-cto-architecture-review-pack.md` | Gate 2 conditions, architecture review — CTO reference |
| Supporting | `docs/18-foundation-light-mvp-build-scope.md` | Four-layer MVP scope definition |
| Supporting | `docs/19-ai-ingestion-engine-placement.md` | AI Ingestion Engine spec and constraints |
| Supporting | `docs/20-foundation-light-technical-implementation-plan.md` | Phase 0–14 build sequence |
| Historical | `docs/appendices/B-whitepaper-v3-conceptual-extracts.md` | Historical only — do NOT use for implementation |

**`docs/22-foundation-light-sql-schema-specification.md` does not yet exist.**
Production SQL generation remains blocked until Gate 2 (CTO review) is passed.

---

## 8. Authority Hierarchy

When documents conflict, resolve in this order:

1. **doc 21** (D-01–D-21 founder decisions) — overrides all
2. **`docs/kora-canonical-product-architecture-v1.md`** — canonical product architecture, overrides all product, positioning, scope, and capability decisions
3. **doc 10** (Architecture v3) — overrides all schema decisions
4. **doc 12** (Technical Data Model) — authoritative for schema, after Gate 2
5. **doc 22A** (build cutline) — overrides all scope decisions
6. **doc 21b** (methodology governance) — overrides all output display decisions
7. **docs 24, 25, 26** — demo build details
8. **Appendix B, WhitePaper v3/v4 PDF** — historical only; do not use for implementation

Old formula names are superseded. Never use: ES, EF, RF, SQ, PA, EQT, CT, EC, GF.
Use canonical names: EV, NM, AGF, NI, AR, MAR, EQ, VR, CO, CS, Activation Safeguard.

---

## 9. Build Gates

### Gate 2 — CTO Review (OPEN — blocks all production artifacts)

Blocked until Gate 2 closes:
- SQL DDL and production schema
- Prisma models and ORM configuration
- Supabase production project provisioning
- Database migrations
- Production backend services and API contracts
- Production authentication and RBAC/RLS

Not blocked by Gate 2:
- Next.js / React / TypeScript demo scaffold
- Local synthetic JSON seed files (doc 25)
- Mock service layer
- Role / scenario / persona switchers
- Simulated ingestion, UEF review, scoring, reports
- Privacy boundary UI components
- Future Vision static mockup screens

### Gate 3 — Legal/Privacy (OPEN — blocks live data)

Blocked: live company data, real worker accounts, real HRIS/LMS integrations, production auth.

### Gate 5 — Tax/Fiscal Advisor (OPEN — blocks live fiscal outputs)

Blocked: live fiscal/tax classification, automated guardrail enforcement, tax-advice outputs.

---

## 10. Allowed Work Before Gate 2

```
✓ Next.js 14+ App Router scaffold
✓ TypeScript strict mode
✓ Tailwind CSS + shadcn/ui component system
✓ Full routing structure (/admin /company /my-kora /partner /advisor /future-vision)
✓ Layout, navigation, sidebar, header
✓ RoleSwitcher, ScenarioSwitcher, PersonaSwitcher (demo-only)
✓ /data/synthetic/ JSON seed files (29 files from doc 25)
✓ /data/scenarios/ scenario config files
✓ /lib/methodology-config/v0.1.ts (weights, thresholds — no hardcoding)
✓ /lib/types/ (TypeScript shapes — NOT Prisma models)
✓ /lib/constants/ (pillar codes, component codes, thresholds)
✓ All 15 mock service files (stubbed or partial)
✓ Executive Cockpit placeholder with all mandatory labels
✓ KORA Index Detail skeleton (all 10 components)
✓ AI Mapping Review, UEF Review, Scoring Run skeletons
✓ My KORA Home, Privacy & Sharing, Dynamic CV Light skeletons
✓ Report cards skeleton
✓ Future Vision static screens (labeled inactive)
✓ Privacy boundary components (suppression overlays, access-denied states)
```

---

## 11. Forbidden Work Before Gate 2

```
✗ SQL DDL of any kind
✗ Prisma schema or prisma generate
✗ Supabase production project or client SDK (production mode)
✗ Database migrations (drizzle, knex, raw SQL)
✗ Production database connection strings in code
✗ Production backend services querying a real DB
✗ Production RBAC / RLS policies
✗ NextAuth / Auth.js / real authentication
✗ Worker production accounts or real identity records
✗ Real HRIS, LMS, or welfare provider API calls
✗ External LLM API calls on HR or worker data (BCM taxonomy only)
✗ Payments, wallet, checkout, vouchers, KIP execution
✗ Full booking engine (Booking Light = request/confirm state machine only)
✗ Partner marketplace with pricing or availability engine
✗ KORA Link operational logic (NFC/QR hardware)
✗ Live fiscal/tax outputs or automated guardrail enforcement
✗ Employer-visible individual worker data (any path, any workaround)
✗ gov.kip_records table (explicitly excluded — must never be created)
✗ New KORA Index components (10 fixed components, no additions)
✗ Hardcoded methodology weights in any file
```

---

## 12. Coding Principles

1. **Build the demo as a projection of the target KORA architecture**, not a random frontend mockup. Mock services, folders, and components must mirror future production boundaries.

2. **Components must consume service outputs, not raw sensitive seed files directly.** Data always passes through the appropriate service — never imported directly into components.

3. **Local seed file availability does not equal role visibility.** A seed file in `/data/synthetic/` being present does not mean every role can read its data. Role permission is always checked.

4. **All sensitive data access must pass through `RolePermissionService` and `PrivacyVisibilityService`.** These are gatekeepers, not optional helpers.

5. **Employer-facing screens must consume aggregate-safe outputs only.** No employer-facing component renders individual worker data. Ever.

6. **My KORA personal layer must never be visible to employer roles.** Worker-private areas must be actively suppressed for employer roles, not merely hidden.

7. **KORA Contribution must remain separate from KORA Index.** Display them side by side if needed — never merge.

8. **PIB is a mandatory intermediate layer and never employer-visible.** No employer-facing component references PIB directly.

9. **Every KORA Index display must include Confidence Score, `methodology_version_id`, and `calibration_status`.** These are non-suppressible. Any component omitting them is incomplete.

10. **Future Vision screens must be clearly inactive.** Label every future-vision screen: "Future Vision / Not Active in Foundation Light." No runtime logic or live data behind mockup screens.

11. **No marketplace, no payments, no wallet, no worker ranking, no social feed.**

12. **Scoring simulation reads from `lib/methodology-config/v0.1.ts`.** No methodology values are hardcoded.

13. **TypeScript types are data contracts, not database schema.** Do not derive Prisma models or SQL tables from `/lib/types/`.

14. **Default: write no comments.** Only add a comment when the WHY is non-obvious: a hidden privacy constraint, a formula invariant, a suppression boundary rule.

15. **Platform copy for the Italian market is Italian-first.** UI text, warnings, recommendations, next best actions, report text, privacy explanations, demo copy, onboarding, microcopy, and evidence descriptions must be in Italian. The following proprietary names remain in English: KORA Index, KORA Contribution, My KORA, Dynamic Impact CV, Activation Safeguard, Confidence Score, UEF, Impact Units, Activation Debt, Evidence Debt, Trust Ledger, Board Pack, KORA Activation Network, KORA Evolution, Public KORA Snapshot.

16. **Not all canonical capabilities are immediate build scope.** Canonical modules are documented in `docs/kora-canonical-product-architecture-v1.md §25 Capability Scope Matrix`. Before implementing any module, verify its demo/pilot/future status. Public KORA Snapshot, LinkedIn/social sharing, KORA Value Chain, and KORA Certified are future/mock only. HR KPI Correlation and People ROI are interpretation layers — no causal engine, no predictive analytics in Foundation Light.

17. **CSR Evidence Mapping is a people-evidence layer, not a compliance engine.** Every output touching CSR/ESG must include the standard disclaimer: "KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio."

18. **HR KPI and ESG metrics do not feed the KORA Index automatically.** They are adjacent interpretation layers. No correlation output may claim causality. Every HR KPI comparison must be aggregate-only and include "correlazione ≠ causalità" explicitly.

---

## 13. Privacy Rules — Constitutional

### Employer roles MAY see:
- Aggregated company-level KORA Index and 10-component breakdown
- Pillar distribution (company level)
- Activation rates (company level)
- Department/cohort trends — only if group size ≥ 10 (safe_aggregation_threshold)
- Financial governance indicators
- Report exports (aggregated only)

### Employer roles MUST NEVER see:
- Any named or identifiable individual PIB score
- Individual UEF records, IU records, or worker profile data
- My KORA content (timeline, CV, bookings, personal plan, consent records)
- Health data, psychological support details, diagnosis or therapist notes
- Small-group data with group size < 10 (re-identification risk)
- Any individual-level surveillance or punitive scoring context

### Demo enforcement:
- `RolePermissionService.canAccess(role, resource)` must be called before rendering any sensitive data
- `PrivacyVisibilityService.isSuppressed(role, dataType, groupSize)` before any segment rendering
- Suppression renders a `PrivacyBoundaryNotice` — never silently empty
- Employer roles must never directly import: `workers.json`, `pib-records.json`, `impact-units.json`, `dynamic-cv-items.json`, `booking-requests.json`, `consent-records.json`, `milestones.json`

### Identity separation (demo):
- Worker identifiers in company-facing data use `pseudonym_id`, never `worker_id` or real name
- My KORA and company workspace are fully separate routes with separate data access paths

---

## 14. Mock Service Discipline

Mock services implement behavioral logic. They are not stubs.

1. **Services read seed files — components do not.** Components call services, never import seed files directly.
2. **Services enforce role and privacy checks internally.**
3. **Services must be replaceable** — interface design must allow swapping mock → production with no component change.
4. **`ScoringSimulatorService` reads weights from `lib/methodology-config/v0.1.ts`.**
5. **`IngestionSimulatorService` simulates BCM taxonomy classifier — no LLM API calls.**
6. **`ActivationSafeguardService` implements D-21 thresholds:** CLEAR = AR ≥ 0.40 AND MAR ≥ 0.30; WARNING = 0.20 ≤ AR < 0.40 OR 0.15 ≤ MAR < 0.30; FLAGGED = AR < 0.20 OR MAR < 0.15.
7. **`BookingRequestService` is request/confirm only.** No pricing, no availability engine, no payment path.
8. **`DynamicCVService` is worker-self-only.** No employer role may call it or receive its output.
9. **`FounderValidationService` is internal/admin-only.**

---

## 15. Recommended App Structure

```
/app
  /admin                    ← KORA Admin workspace (A-01 to A-14)
  /company                  ← Company workspace (C-01 to C-15)
    /kora-index
    /ingestion
    /uef-review
    /scoring
    /reports
    /activation
    /data
    /financial
  /my-kora                  ← Worker workspace (W-01 to W-14)
    /privacy
    /dynamic-cv
    /opportunities
    /bookings
    /collective
  /partner                  ← Partner workspace (P-01 to P-07)
  /advisor                  ← Advisor workspace (AD-01 to AD-05)
  /future-vision            ← Static mockup screens (FV-01 to FV-05)

/components
  /layout                   ← AppShell, Sidebar, Header, Navigation
  /demo                     ← RoleSwitcher, ScenarioSwitcher, PersonaSwitcher
  /charts                   ← PillarChart, ParticipationChart, ComponentBreakdown
  /cards                    ← KoraIndexCard, ConfidenceCard, WarningCard, NextActionCard
  /tables                   ← UEFReviewTable, AuditTable, ReportTable, AdvisorQueue
  /badges                   ← StatusBadge, CalibrationBadge, SafeguardBadge
  /forms                    ← UploadPanel, MappingForm, ReviewForm
  /privacy                  ← PrivacyBoundaryNotice, AccessDeniedState, SuppressionOverlay
  /reports                  ← ReportTemplate, ReportSection, ExportButton
  /kora-index               ← KoraIndexHero, ComponentBreakdown, ExplainabilityPanel
  /my-kora                  ← PIBCard, PillarTimeline, CVItem, BookingCard
  /partner                  ← PartnerCard, ServiceCard, CollectiveEventCard
  /advisor                  ← ReviewCard, EvidencePanel, EligibilityForm
  /scoring                  ← ScoringRunPanel, FormulaTrace, MethodologyVersionDisplay

/data
  /synthetic                ← All 29 doc 25 JSON seed files
  /scenarios                ← S1, S2, S3, S4 scenario configs
  /methodology              ← methodology-config.json

/services
  /demo-data                ← DemoDataService
  /scenario                 ← ScenarioService
  /role-permission          ← RolePermissionService
  /privacy-visibility       ← PrivacyVisibilityService
  /ingestion-simulator      ← IngestionSimulatorService
  /mapping-confidence       ← MappingConfidenceService
  /uef-review               ← UEFReviewService
  /scoring-simulator        ← ScoringSimulatorService
  /activation-safeguard     ← ActivationSafeguardService
  /explainability           ← ExplainabilityService
  /kora-contribution        ← KoraContributionService
  /report-generator         ← ReportGeneratorService
  /booking-request          ← BookingRequestService
  /dynamic-cv               ← DynamicCVService
  /founder-validation       ← FounderValidationService

/lib
  /types                    ← Data shape definitions (NOT Prisma models)
  /constants                ← Pillar codes, component codes, thresholds
  /methodology-config       ← Versioned weight/threshold loader (v0.1.ts)
  /formatters               ← Score, percentage, date formatters
  /permissions              ← Permission resolution helper per role
  /demo-state               ← Current role, persona, scenario state
```

---

## 16. Definition of Done

A build step is complete only when ALL of the following are true:

```
✓ No forbidden production artifact created (no SQL, Prisma, Supabase, real auth)
✓ No employer-facing component accesses individual worker data
✓ No sensitive seed file imported directly by an employer-facing component
✓ All KORA Index outputs show Confidence Score, methodology_version_id, calibration_status
✓ All KORA Index outputs show all 10 components with values and weights
✓ All Future Vision screens labeled "Future Vision / Not Active in Foundation Light"
✓ Demo data labeled synthetic_demo_data: true where surfaced in UI
✓ Role visibility tested manually with all relevant roles
✓ Privacy threshold behavior tested (group size < 10 → suppressed)
✓ TypeScript compiles without errors (tsc --noEmit passes)
✓ No hardcoded methodology weights in component or service logic
✓ Scoring simulation reads from methodology-config, not inline values
✓ KORA Contribution rendered separately from KORA Index
✓ PIB not surfaced in any employer-facing view
✓ Activation Safeguard status shown on every KORA Index surface
```

---

## 17. Red Lines

Absolute. No exception, no workaround, no "just for demo" bypass.

1. **Never surface individual worker data to an employer role.** This is the central privacy guarantee.
2. **Never hardcode methodology weights.** Read from `lib/methodology-config/v0.1.ts`.
3. **Never generate SQL, Prisma models, or Supabase schema before Gate 2 closes.** doc 22 does not yet exist.
4. **Never call an external LLM API on company HR data or worker data.** BCM taxonomy classifier only (doc 19 §9.2).
5. **Never create `gov.kip_records`.** KIP is explicitly excluded from Foundation Light.
6. **Never add a new KORA Index component.** The 10-component structure is fixed. Any addition requires a formal methodology decision.
7. **Never display a KORA Index without Confidence Score and `calibration_status`.** These are inseparable outputs (doc 21b).
8. **Never confuse KORA Contribution with a KORA Index component.** It is a companion indicator — never merged into KORA Index computation.
9. **Never build payment, wallet, checkout, or voucher logic.** All financial execution is excluded (doc 22A §7).
10. **Never make Future Vision features appear active.** Every Future Vision screen must be clearly inactive with no backend logic.

---

---

## 18. Mandatory Session Rule

**Before any coding or product documentation work, read `docs/kora-canonical-product-architecture-v1.md` first.**

If a future prompt conflicts with that document, stop and ask for correction before execution. Do not proceed with a build, edit, or documentation task that contradicts the canonical architecture.

---

**Document version:** v2.1 — Phase 1M-B Aligned
**Date:** 2026-05-19
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN (blocks SQL) · Gate 3 OPEN · Gate 5 OPEN
**Canonical reference:** `docs/kora-canonical-product-architecture-v1.md` (v1.1) — read before every session
