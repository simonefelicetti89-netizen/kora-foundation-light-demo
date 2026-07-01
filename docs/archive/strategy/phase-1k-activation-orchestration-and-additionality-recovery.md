# Phase 1K — Activation Orchestration & Additionality Recovery

**Document:** `docs/phase-1k-activation-orchestration-and-additionality-recovery.md`
**Type:** Product & Methodology Recovery Document
**Status:** v1.0 — Approved for Implementation Planning
**Date:** 2026-05-19
**Gate dependency:** No SQL, no Prisma, no Supabase. Pre-Gate 2. Implementation deferred to Phase 1L.

---

## 1. Executive Recovery

This is not a new feature.

This document recovers an already intended KORA capability that is present in the vision, present in the methodology architecture, and partially present in the existing demo — but under-represented to the point where an external reviewer would miss it entirely.

**The correction in one sentence:**

> KORA moves from measuring what happened to orchestrating what should happen next.

**What the current demo inadvertently communicates:**

A reviewer working through Foundation Light today sees a company that has already run programs. KORA measures what those programs produced in terms of organizational activation. The score goes up between S1 and S2 because the company "acted on KORA's recommendations." But the demo does not show *how* the company acted — what initiatives it created, proposed, joined, or funded, and how KORA validated, orchestrated, and approved those actions. The improvement from S1 to S2 feels like it happened off-screen.

**What KORA must also communicate:**

- KORA is not only a measurement dashboard. It is also an activation orchestration layer.
- Companies must be able to create, propose, join, and economically support initiatives — with KORA acting as the validation and orchestration engine.
- KORA identifies activation gaps, proposes relevant initiatives, validates initiative eligibility, routes proposals to advisors and partners, approves or rejects actions, monitors participation thresholds, and measures outcomes.
- Economic contribution to validated collective actions is part of the KORA vision — not as payment execution, but as governance-layer intent and activation-aligned investment.
- Mandatory legal and compliance activities must not be over-rewarded. KORA rewards additionality, verified activation, and distributed participation — not mere compliance.

**Recovery severity:** High. The gap does not require a rebuild. It requires a product narrative patch, a methodology clarification, and a focused demo enhancement targeting two surfaces: `/company/pillars` (or a new companion route) and `/admin`.

---

## 2. Existing Vision Being Recovered

This capability was already embedded in the broader KORA product vision across multiple canonical documents. It is not a new invention.

### 2.1 Where the vision already lives

**Company initiatives** — doc 24 §7.2 explicitly states "Create company, create program" as a Functional Core action in Admin. Program portfolio management is part of the spec. The demo shows programs but does not show their *creation* or *proposal*.

**Collective initiatives** — The KORA Contribution companion indicator already measures cross-company collective engagement. The demo shows collective initiative records (verified, with partners, cross-company). It does not show how those initiatives were proposed, approved, or funded.

**Territorial actions** — Doc 25 scenario design references territorial contribution, IMPACT pillar events, and community/school/association activity. These exist in the synthetic data as self-declared events. The orchestration layer that enables and validates them is absent.

**Cross-company events** — The S2 scenario explicitly includes "A cross-company collective initiative verified." That initiative exists. The path to its creation and KORA approval is invisible in the demo.

**Partner/advisor validated actions** — Partner and advisor roles exist. Their function — enabling verified activation through services and initiatives — is defined in doc 24 §D and §E. The demo shows partner and advisor workspaces as preview stubs. The connection between partner-enabled initiative and KORA validation is not visible.

**Financial contribution to validated collective initiatives** — Financial Governance already includes `budget_allocated`, `budget_used`, `committed`, pillar budget breakdown, and a `cost_per_IU_indicator`. The conceptual link between budget allocation and KORA-validated initiative activation is present but implicit.

**KORA Contribution** — The companion indicator already exists as a separate measurement layer for collective and ecosystem engagement. The measurement layer is visible. The creation and orchestration layer is not.

### 2.2 What the current demo already contains

The following existing routes and components represent partial coverage of this capability:

| Route / Component | What it shows | What is missing |
|---|---|---|
| `/company/contribution` | Collective initiative list, cross-company engagement, KORA Contribution indicator | How those initiatives were created, proposed, or approved |
| `/company/pillars` | Program portfolio table, pillar distribution, participation rates | Initiative creation, proposal, status, economic contribution intent |
| `/company/financial` | Budget allocation vs. activation, cost per IU | Link between budget intent and initiative approval/activation lifecycle |
| `/admin` | Operating Console with 10 modules | Activation Orchestration Engine module is absent |
| `/admin/ai-onboarding` | AI Onboarding pipeline A–G | Initiative proposal and orchestration pipeline is not present |
| `ExplainabilityService` | Next best actions for KORA Index improvement | Those actions are not connected to an initiative creation workflow |

### 2.3 What the demo does not yet show

- Company initiative creation — internal events and programs a company proposes or launches
- Initiative proposal — a company proposing an action to KORA for validation and pillar classification
- Economic contribution intent — a company's intent to allocate part of its budget to a KORA-validated collective action
- KORA orchestration and approval workflow — the flow from proposal → review → approval → activation → measurement
- Additionality classification — whether an activity is mandatory legal minimum, voluntary, or additional beyond requirement
- KORA Admin as the orchestration engine, not just a data review console

---

## 3. Company Initiative Capability

Companies must eventually be able to do the following in KORA. These are not new product additions — they are the operational consequence of KORA being an activation intelligence platform, not a passive scoring engine.

### A. Create Internal Events

Internal company-originated initiatives that workers can participate in, and that KORA validates and measures:

- Safety Day
- Sustainability Day
- Earth Day
- Health Prevention Day
- Learning Day / Digital Skills Day
- Inclusion Day / Culture Day
- Mentoring initiatives (cross-departmental, senior-junior)
- Internal volunteering campaigns
- Advanced safety culture workshops (beyond legal minimum)
- Digital and AI upskilling initiatives
- Wellbeing and prevention programs (LIFE pillar)
- Environmental awareness campaigns (IMPACT pillar)

These become UEF source records when verified with evidence. Their pillar classification, compliance/additionality status, verification requirements, and IU eligibility are determined by KORA's BCM taxonomy and orchestration logic.

### B. Propose External Events

External events and initiatives the company proposes, sponsors, or participates in, where KORA validates eligibility before the activity begins:

- Volunteering initiatives (with NGOs, associations, schools, community organizations)
- Territorial projects (community, environmental, urban, cultural)
- Cross-company initiatives (multi-employer, multi-territory)
- Partner-led initiatives (welfare provider events, specialist programs)
- Advisor-designed programs (structured professional development, wellbeing programs)
- KORA-proposed collective actions (KORA identifies a gap and recommends a specific type of initiative)

These require KORA approval before activation. Pillar fit, evidence requirements, verification thresholds, and privacy constraints are defined at proposal stage.

### C. Join Initiatives

Companies joining initiatives they did not originate:

- KORA-orchestrated collective initiatives (open to multiple companies)
- Partner and advisor validated action pools
- Cross-company event programs (joint volunteering, cross-sector skill sharing)
- Territorial activation programs (sponsored or co-sponsored by public bodies, foundations)
- Collective industry programs (sector-wide training, professional bodies)

Joining requires KORA eligibility check. Participation data from joined initiatives feeds KORA Contribution.

### D. Economically Contribute

A company allocating a portion of its initiative budget toward KORA-validated collective actions:

- Co-fund validated collective initiatives
- Sponsor territorial projects
- Contribute to cross-company action pools
- Support social, environmental, or community programs
- Allocate a portion of the company initiative budget to KORA-approved external actions

**What this is:**
- Governance, orchestration, and validation of economic intent
- KORA recording and tracking contribution commitment against validated actions
- Company financial governance view — alignment of budget allocation with KORA-validated activation

**What this is not:**
- A marketplace
- Wallet or fund custody
- Payment execution or settlement
- Donation tracking or fiscal advice
- A commerce layer

KORA does not hold funds. KORA does not execute payments. KORA records contribution intent, tracks eligibility, and measures whether the investment produced verified activation. Financial Governance remains informational — not transactional.

---

## 4. KORA as Director of Orchestra

KORA's role in the initiative lifecycle is not passive measurement after the fact. KORA is the orchestration layer between company intent, worker participation, partner evidence, advisor validation, and measurable impact.

> "KORA is the orchestration layer between company intent, worker participation, partner evidence, advisor validation and measurable impact."

### KORA's orchestration functions

| Function | Description |
|---|---|
| **Gap identification** | KORA identifies which pillars, departments, or cohorts are under-activated and generates targeted initiative recommendations from the explainability engine |
| **Initiative proposal intake** | Companies submit proposed initiatives (internal or external); KORA classifies and evaluates eligibility |
| **Pillar classification** | KORA classifies each proposed initiative against the BCM taxonomy — primary pillar, secondary pillar, event type |
| **Evidence requirement definition** | KORA specifies what evidence must be provided for the initiative to produce verified IU vs. self-declared IU |
| **Advisor routing** | Low-confidence proposals, complex methodology questions, or high-value initiatives are routed to the assigned advisor for review |
| **Partner readiness check** | For partner-enabled initiatives, KORA checks whether the partner is verified and whether their service catalog supports the initiative's pillar and evidence requirements |
| **Approval / rejection** | KORA approves, conditionally approves, or rejects initiative proposals based on eligibility criteria |
| **Participation threshold monitoring** | Once active, KORA monitors whether minimum participation thresholds are reached — low participation generates a WARNING before the initiative produces weak IU |
| **KORA Contribution eligibility** | KORA determines whether a completed initiative qualifies for KORA Contribution measurement, based on verification, cross-company scope, territory, and participation quality |
| **Anti-gaming enforcement** | AGF (Anti-Gaming Factor) is applied to initiative-level records as well as event-level records. Concentrated participation, repeated single-actor generation, or pattern inconsistencies trigger AGF suppression |
| **Aggregate activation measurement** | Post-initiative, KORA aggregates participation into company-level IU, updates pillar distribution, and recalculates KORA Index components |
| **Explainability propagation** | KORA traces how each approved initiative contributed to specific components (AR, MAR, CO, PC, PB, VR) and communicates this in the explainability panel |
| **Audit trail maintenance** | Every proposal, approval decision, status change, and participation record is logged in the governance timeline |

---

## 5. Activation Orchestration Engine

### 5.1 Definition

The Activation Orchestration Engine is a future KORA Admin module responsible for managing the full lifecycle of company and collective initiatives — from proposal through approval, activation, and post-event measurement.

It is distinct from the AI Onboarding Engine (which handles source data ingestion into the KORA pipeline) and from the KORA Index computation pipeline (which processes approved UEF records into scores). The Activation Orchestration Engine operates upstream of ingestion — it governs which initiatives are eligible to produce data at all.

### 5.2 Position in KORA Admin

The module sits alongside the existing KORA Admin modules:

| Module | Description |
|---|---|
| 00 — AI Onboarding Engine | Source data ingestion, mapping, UEF pipeline |
| 01 — Company Portfolio | Cross-company intelligence overview |
| 02 — Index Registry | Methodology version management, scoring history |
| 03 — Advisor & Partner Network | Partner catalog, advisor assignments, validation queue |
| 04 — Benchmarks | Peer benchmarking (methodology-governed) |
| 05 — GTM Pipeline | Founder validation and commercial pipeline |
| **NEW — Activation Orchestration Engine** | **Initiative lifecycle management** |

### 5.3 What the module manages

- Internal initiative drafts submitted by companies
- External initiative proposals (company-originated or KORA-suggested)
- Cross-company initiative proposals
- Economic contribution intents (budget allocation to validated initiatives)
- Advisor validation requests for complex initiatives
- Partner evidence requirements per initiative
- Risk flags (gaming pattern, over-concentration risk, verification gap)
- Pillar fit classification
- Activation forecast (estimated participation reach, IU contribution estimate)
- KORA Contribution eligibility assessment
- Approval status
- Post-event measurement status

### 5.4 Initiative statuses

| Status | Meaning |
|---|---|
| `draft` | Submitted by company; not yet reviewed by KORA |
| `proposed` | Formally submitted for KORA review |
| `under_kora_review` | KORA internal review in progress |
| `advisor_review_required` | Routed to assigned advisor for methodology review |
| `partner_validation_required` | Awaiting partner confirmation of service capability |
| `approved` | Cleared for activation; eligibility confirmed |
| `active` | Initiative in progress; participation being tracked |
| `completed` | Event concluded; evidence collection window open |
| `measured` | IU computation complete; KORA Index contribution processed |
| `rejected` | Initiative did not meet eligibility criteria |
| `archived` | Historical record; not contributing to current period |

### 5.5 Foundation Light status

In Foundation Light, the Activation Orchestration Engine is a preview module only. No functional form submission, no live approval workflow, no live initiative state machine. It must be clearly labeled as a Foundation Light Preview surface showing the module structure, status vocabulary, and typical initiative records — not an operational workflow.

---

## 6. Company-Side UX Implication

### 6.1 Where does this belong in the product?

**Option A — Initiative Studio inside `/company/pillars`**
Add a lightweight "Initiative Studio" preview section at the bottom of the existing Pillars & Initiatives page. Show a table of company initiative proposals with status badges. Add a "Propose Initiative" button (disabled, labeled "Coming in pilot phase"). Minimal UI change, preserves the existing page structure, and provides context that the program portfolio is not just historical but actionable.

**Option B — Separate `/company/initiatives` route**
Create a new dedicated route for initiative management. Allows full Initiative Studio layout without constraining the Pillars page. Adds a navigation item to the company workspace.

**Option C — Separate `/company/activation-studio` route**
A broader activation planning surface that combines initiative studio, gap analysis from explainability, and KORA-suggested actions in one place.

**Option D — Keep as Future Vision only**
Defer all company-side UI entirely to Future Vision. Document-only recovery.

### 6.2 Recommendation

**Recommended path: A (lightweight Initiative Studio preview inside `/company/pillars`) + a new Activation Orchestration Engine card/module in `/admin`.**

Rationale:

- Option A requires the minimum change. The Pillars page already shows programs and initiatives — adding an "Initiative Studio" preview section below the collective initiatives table is natural and requires no routing change or sidebar addition.
- The Admin module addition (a new card inside `/admin`) similarly requires minimal change — it slots into the existing 10-module grid.
- Option B or C require new routes and sidebar items, which introduce navigation complexity before the product clarity warrant it.
- Option D (Future Vision only) would perpetuate the gap that this Phase 1K is designed to correct. Not recommended.

**For Foundation Light implementation (Phase 1L):**

The company should see (preview-only, no functional submission):

- Current active initiative proposals with status badges
- KORA-suggested next initiative based on gap analysis
- A "Propose Initiative" surface (disabled, labeled "Available in pilot phase")
- Expected pillar impact of KORA-suggested initiative
- Evidence requirements KORA would apply
- Privacy requirements (no individual worker identification)
- KORA Contribution relevance indicator for collective initiatives
- Economic contribution intent field (informational only, not a payment)

**Hard constraints for Foundation Light:**

- No real form submission
- No payment or wallet path
- No booking engine
- No production approval workflow
- No live partner or advisor routing
- Preview only — every interactive element is disabled and labeled

---

## 7. Economic Contribution Logic

### 7.1 The conceptual model

Economic contribution by a company to a KORA-validated collective initiative passes through a governance lifecycle, not a transactional flow. KORA records, validates, and measures — it does not hold, move, or settle funds.

| Layer | Meaning | KORA role |
|---|---|---|
| **Contribution intent** | Company declares intent to allocate budget to a specific validated initiative | KORA records and links to initiative record |
| **Approved contribution** | KORA validates that the initiative is eligible for economic co-funding | KORA flags eligibility status |
| **Committed budget** | Company formally commits a budget amount; appears in Financial Governance as `budget_committed` | KORA records in financial governance view (informational) |
| **Used budget** | Budget confirmed as deployed to the initiative | KORA updates Financial Governance utilization |
| **Partner/initiative evidence** | Partner provides evidence of initiative execution and participation | KORA links to UEF and IU computation |
| **Advisor validation** | Advisor confirms initiative quality and evidence completeness | Elevates VR (Verification Rate) contribution |
| **Aggregate participation** | KORA measures actual worker engagement with the initiative | Feeds KORA Index components (AR, MAR, CO) |
| **KORA Contribution effect** | If cross-company / territorial / verified, the initiative may qualify for KORA Contribution measurement | Companion indicator updated, not KORA Index |
| **Financial Governance interpretation** | Budget vs. activation efficiency — cost per IU directional indicator | Informational only, does not feed KORA Index |

### 7.2 Governing principles

These principles are non-negotiable and must be preserved in every communication, UX surface, and methodology document.

1. **Money alone is not impact.** Budget allocation does not produce IU without verified worker participation. Spending without activation must not receive activation credit.

2. **Economic contribution can support KORA Contribution only when the initiative is validated and activated.** A company that funds an initiative that nobody participates in receives no KORA Contribution credit.

3. **Economic contribution does not automatically increase the KORA Index.** The KORA Index measures activation quality — it responds to participation, verification, continuity, and pillar balance. A budget decision has no direct effect on the KORA Index computation.

4. **Financial Governance shows budget alignment, not payment execution.** KORA's financial governance layer is a read-only intelligence surface. It tells companies whether their investment is reaching workers. It does not authorize, execute, or audit payment flows.

5. **KORA does not handle fund custody or settlement in Foundation Light or any planned deployment.** This is constitutionally excluded. There is no payment path in KORA's product scope.

---

## 8. Additionality / Compliance Weighting

### 8.1 The methodology correction

The current methodology treats all approved events as equivalent in terms of their eligibility to generate IU — subject to quality factors (CQ, EV, CF, AGF). What it does not yet explicitly encode is the distinction between:

- An activity that a company is legally required to do (mandatory legal minimum)
- An activity that a company does by internal policy (mandatory company policy)
- An activity that workers are contractually obligated to attend (contractual required)
- An activity that is purely optional for the worker (voluntary optional)
- An activity that goes beyond any legal or policy requirement (additional beyond requirement)
- An activity that a company strategically invests in as an organizational development initiative (strategic company initiative)
- A collective and cross-company verified action (collective verified initiative)

Without this distinction, a company can inflate its KORA score by uploading mandatory legal minimum training records — e.g., obligatory safety courses, required compliance modules, compulsory onboarding sessions — which produce IU as if they were genuine discretionary activation.

> "KORA rewards additionality, verified activation and distributed participation — not mere compliance."

### 8.2 Compliance/additionality classification

Every relevant event and initiative should eventually carry one of the following classifications as part of its feature vector:

| Classification | Definition |
|---|---|
| `mandatory_legal_minimum` | Required by national or EU law; minimum legally-mandated frequency, duration, or content |
| `mandatory_company_policy` | Required by internal company policy, not by law; obligatory for the worker |
| `contractual_required` | Required as a condition of employment contract or collective bargaining agreement |
| `voluntary_optional` | Available to workers but not required; genuine discretionary participation |
| `additional_beyond_requirement` | Exceeds the legal or policy minimum in frequency, duration, quality, or engagement depth |
| `strategic_company_initiative` | Deliberately designed by the company to build organizational activation, not just satisfy a requirement |
| `collective_verified_initiative` | Cross-company, territorial, or partner-verified initiative with aggregate participation verification |

### 8.3 Scoring principle per classification

| Classification | IU activation value | Notes |
|---|---|---|
| `mandatory_legal_minimum` | Low or zero | Complying with the law is baseline, not activation. May carry minimal evidence value for Confidence Score, but generates negligible IU. |
| `mandatory_company_policy` | Low | Internal mandates are governance, not activation. Low value unless the policy exceeds legal minimums and demonstrates engagement quality. |
| `contractual_required` | Low to moderate | Depends on additionality evidence. If the contractual activity is itself designed to create genuine activation, the quality factors (EV, CQ) can lift the IU. |
| `voluntary_optional` | Medium to high | Genuine discretionary participation is activation. Rewarded proportionally to pillar fit, evidence quality, and continuity. |
| `additional_beyond_requirement` | High | Going beyond is the definition of organizational activation. High IU if verified and distributed. |
| `strategic_company_initiative` | High | If aligned to identified gaps, broadly distributed, and evidence-backed. KORA reviews initiative design as part of orchestration approval. |
| `collective_verified_initiative` | High | Maximum KORA Contribution eligibility. High IU if multi-company, verified, and above participation threshold. |

### 8.4 Architectural placement

**Additionality does not create an 11th KORA Index component.** The KORA Index has exactly 10 components. That structure is fixed.

Additionality classification affects the upstream pipeline:
- **UEF classification** — the UEF record carries the compliance/additionality classification
- **Feature Vector** — additionality level enters the feature vector as an upstream quality modifier
- **IU Engine** — the classification modifies the effective weight of CQ (Contribution Quality factor) for that event class
- **Explainability** — the KORA Index explanation panel can state "low IU generation in GROWTH component due to high proportion of mandatory compliance training" without disclosing individual worker records
- **Anti-Gaming Factor (AGF)** — concentration in mandatory-only events without additionality is a gaming pattern signal; AGF can suppress this
- **Confidence Score (CS)** — a dataset dominated by mandatory-only events with low additionality flags a weak activation picture; this may lower CS

---

## 9. Training Course Examples

These examples illustrate how the compliance/additionality classification operates in practice. They are not hypothetical — they represent the most common event types found in Italian manufacturing and service company welfare/training programs.

### A. Mandatory Legal Safety Course (e.g., D.Lgs. 81/2008 minimum)

- **Classification:** `mandatory_legal_minimum`
- **Pillar:** LIFE (if health/safety context) or GROWTH (if general compliance training)
- **IU generation:** Low or zero
- **Rationale:** Every company must run this. It is a baseline, not an initiative. It contributes weak signal to the Confidence Score as evidence of training record availability, but it does not represent organizational activation beyond compliance.
- **KORA Note:** KORA does not reward companies for complying with Italian law. If a company runs safety training that is required by D.Lgs. 81/2008, that training does not lift the KORA Index.

### B. Additional Advanced Safety Culture Workshop

- **Classification:** `additional_beyond_requirement` or `strategic_company_initiative`
- **Pillar:** LIFE / CONNECTION
- **IU generation:** Medium to high
- **Conditions for high IU:** Participatory format (not passive); attendance verified; sessions offered voluntarily beyond mandatory hour requirements; evidence of worker-driven safety conversations or peer safety ambassador roles
- **KORA Note:** A company that runs safety workshops beyond the legal minimum — with verified participation, structured design, and distributed attendance — is doing something real. KORA rewards this.

### C. Voluntary Digital Skills Course

- **Classification:** `voluntary_optional` or `additional_beyond_requirement`
- **Pillar:** GROWTH
- **IU generation:** Medium to high
- **Conditions for high IU:** Completion verified; skill relevance to role confirmed; recurrence across periods (CO); optional enrollment (not mandatory for job retention)
- **KORA Note:** Digital upskilling that workers choose to do, complete, and return to represents genuine engagement with organizational growth. KORA rewards voluntary learning.

### D. Sustainability Day

- **Classification:** `strategic_company_initiative`
- **Pillar:** IMPACT / CONNECTION
- **IU generation:** Moderate to high
- **Conditions for high IU:** Broad participation (high AR, not just a department); evidence of voluntary attendance; structured activities (not a passive communication); aligned to organizational sustainability goals
- **KORA Note:** A Sustainability Day is a strategic initiative. If broadly activated, evidence-backed, and not mandated, it represents genuine organizational engagement with the IMPACT pillar.

### E. Cross-Company Volunteering Initiative

- **Classification:** `collective_verified_initiative`
- **Pillar:** IMPACT / LEGACY / CONNECTION
- **IU generation:** High
- **KORA Contribution:** High eligibility if partner-verified, multi-company, and above participation threshold
- **Conditions for high IU:** Partner verification; aggregate participation above minimum threshold; territorial or community impact confirmed; cross-company scope confirmed
- **KORA Note:** This is exactly what KORA Contribution is designed to measure. Verified collective action beyond the company perimeter — with partner evidence and multi-company participation — is among the highest-value activation signals in the KORA methodology.

### F. Earth Day Internal Initiative

- **Classification:** `strategic_company_initiative` or `voluntary_optional`
- **Pillar:** IMPACT / CONNECTION
- **IU generation:** Low to moderate (depends on evidence and participation quality)
- **Conditions for stronger IU:** Evidence of structured activities (not just communication); participation distributed across departments; continuity in following periods; voluntary attendance
- **KORA Note:** Earth Day events vary widely in activation quality. A one-hour communication session with no participation evidence generates minimal IU. A structured, evidence-backed environmental action day with broad voluntary participation generates moderate to high IU. KORA distinguishes between them through the evidence quality and participation distribution signals.

---

## 10. Required Future Data Fields

The following fields are required at the UEF record level, feature vector level, and initiative record level to support additionality classification, compliance weighting, and activation orchestration. This is a specification-level list only. No schema. No SQL. No Prisma.

### UEF / Feature Vector fields

| Field | Type | Description |
|---|---|---|
| `compliance_status` | enum | See classification vocabulary in §8.2 |
| `legal_mandate_level` | enum: `national_law`, `eu_directive`, `collective_bargaining`, `none` | Legal basis for the activity, if any |
| `additionality_level` | enum: `none`, `low`, `medium`, `high` | Assessed additionality of the event relative to requirement |
| `voluntary_participation` | boolean | True if worker participation is voluntary (not job-conditional) |
| `required_by_law` | boolean | True if the event satisfies a legal minimum |
| `required_by_company` | boolean | True if the event is internally mandated |

### Initiative record fields

| Field | Type | Description |
|---|---|---|
| `initiative_origin` | enum: `internal_company`, `kora_suggested`, `partner_proposed`, `collective`, `external_join` | Who originated the initiative |
| `initiative_scope` | enum: `internal`, `cross_department`, `cross_company`, `territorial`, `ecosystem` | Geographic and organizational reach |
| `kora_orchestrated` | boolean | True if KORA initiated the proposal recommendation |
| `advisor_validated` | boolean | True if an assigned KORA advisor has reviewed and approved |
| `partner_verified` | boolean | True if the partner has provided evidence of service/initiative execution |
| `economic_contribution_attached` | boolean | True if the company has declared a budget contribution intent |
| `contribution_amount_band` | enum: `none`, `low` (< €5k), `medium` (€5k–20k), `high` (> €20k) | Band range only — no precise amounts stored |
| `evidence_requirement_level` | enum: `none`, `self_declared`, `partial`, `verified` | Required evidence level KORA applies to this initiative type |
| `activation_forecast` | integer | Estimated number of workers expected to participate |
| `approval_status` | enum | See §5.4 status vocabulary |
| `contribution_eligibility_status` | enum: `not_assessed`, `eligible`, `conditional`, `ineligible` | KORA Contribution eligibility assessment result |

---

## 11. Algorithmic Impact

### Where additionality classification and activation orchestration affect the methodology

| Stage | Effect |
|---|---|
| **UEF Classification (Stage 5)** | Each UEF record receives a compliance/additionality classification. Mandatory events are flagged. Additionality level is stored as a feature. |
| **Feature Vector** | The compliance/additionality field enters the feature vector upstream of IU computation. It modifies the effective CQ (Contribution Quality factor) for the event. |
| **IU Engine (Stage 10)** | Events classified as `mandatory_legal_minimum` receive low or zero CQ contribution. Events with `additional_beyond_requirement` or `collective_verified_initiative` receive full CQ weight. The IU formula itself does not change — the modification is in the input values, not the formula structure. |
| **Event quality weighting** | The existing correction factors (CQ, EV, CF) now explicitly incorporate additionality. CQ for a mandatory event is reduced. CQ for a voluntary, evidence-backed additional initiative is full or elevated. |
| **KORA Contribution (companion indicator)** | Initiatives with `collective_verified_initiative` classification and an approved KORA Contribution eligibility status feed the companion indicator. Mandatory events do not. |
| **Explainability (Stage 14)** | The explainability panel can explain poor GROWTH scores with "high proportion of mandatory compliance training with low additionality." It can explain strong IMPACT scores with "verified cross-company collective initiative with distributed participation." |
| **Anti-Gaming Factor (AGF)** | Concentration of mandatory-only events without additionality is a gaming pattern. The AGF engine can detect this and apply suppression, reducing the IU generation from event patterns that indicate compliance-washing rather than genuine activation. |
| **Confidence Score (CS)** | A dataset dominated by mandatory-only events generates a lower Confidence Score. The scoring engine flags low additionality as a signal of weak data quality in the activation context. |
| **Financial Governance interpretation** | The Financial Governance view can note that a high budget allocation to mandatory compliance training produces a lower activation return per euro than strategic optional initiatives. This is an explainability signal, not a financial metric. |

**The KORA Index structure does not change:**

- 10 components remain: AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS
- No 11th component is created
- Additionality classification modifies upstream qualification and IU weighting
- It does not add a new scoring dimension — it corrects how existing dimensions respond to different event types

---

## 12. Demo Impact

### Current state

The existing demo (Foundation Light v0.1 after Phase 1J) shows:

- A company with programs running and IU being measured (correct)
- A KORA Index that changed from S1 to S2 because of better activation (correct)
- KORA Contribution as a companion indicator of collective engagement (correct)

What it does not show:

- How the company created, proposed, or joined the initiatives that drove the S2 improvement
- That KORA validated and approved those initiatives
- That mandatory legal training courses produce lower activation value than additional voluntary programs
- That the improvement between S1 and S2 involved KORA-orchestrated initiative decisions, not just better execution of existing programs

### Options

| Option | Description | Effort |
|---|---|---|
| **A — Document only** | This Phase 1K document only. No code changes. Narrative remains as is. | Zero |
| **B — Initiative Studio preview in `/company/pillars`** | Add a lightweight Initiative Studio preview section below the existing collective initiatives table. Show proposed/approved initiatives with status badges. Add a disabled "Propose Initiative" CTA labeled "Available in pilot phase." | Low |
| **C — Activation Orchestration Engine module in `/admin`** | Add a new card/module in the Admin Operating Console for the Activation Orchestration Engine. Show the module definition, status vocabulary, and a synthetic preview of initiative proposals. | Low to medium |
| **D — Both B and C** | Initiative Studio preview in company workspace + Activation Orchestration Engine card in admin workspace. | Medium |
| **E — Defer implementation** | Document now. Implement in Phase 1L after stakeholder review of this recovery document. | Zero |

### Recommendation

**Document now (Phase 1K). Implement in Phase 1L.**

Phase 1L should execute Option D: lightweight Initiative Studio preview inside `/company/pillars` and Activation Orchestration Engine module/card inside `/admin`.

- No forms. No payment. No booking. No workflow engine. No production approval logic.
- Preview-only surfaces showing the structure, statuses, and initiative vocabulary.
- Synthetic initiative records in the existing seed data or as inline mock data within the service.
- Additionality classification vocabulary exposed in the explainability panel of the KORA Index Detail page.

---

## 13. Risks If Not Corrected

If this recovery is not implemented — either in documentation, in the demo narrative, or in Phase 1L — the following risks materialize:

| Risk | Consequence |
|---|---|
| **KORA looks passive** | A company seeing the demo understands KORA as a measurement tool that tells them what score they got. They do not see that KORA tells them what to do and helps them do it. The intelligence loop feels incomplete. |
| **Companies cannot see how to create change** | The "next best actions" from the Explainability engine point to gaps but offer no path forward. Without orchestration, the actions remain advice that goes nowhere. |
| **KORA Contribution feels like a CSR add-on** | Without the initiative creation and proposal layer, collective initiatives appear as something that happened externally. KORA Contribution looks like a secondary badge rather than a measured output of KORA-orchestrated collective action. |
| **Legal mandatory courses can game the algorithm** | A company that uploads all mandatory compliance training records without additionality classification will produce artificially elevated GROWTH and LIFE IU. The algorithm rewards compliance as if it were activation. |
| **KORA looks like welfare or HR reporting** | A passive measurement tool that reads whatever programs the company already ran — without any orchestration, validation, or initiative creation capability — reads as a welfare reporting dashboard or HR data aggregator. |
| **KORA Admin misses its orchestration role** | Without the Activation Orchestration Engine, the Admin workspace reads as a data review console and backoffice tool. It does not communicate that KORA is the authoritative approval and validation layer for activation initiatives. |
| **Financial contribution is misunderstood** | Without explicit framing that economic contribution goes through KORA governance (not a payment system), enterprise buyers who see the Financial Governance page may interpret the budget tracking as welfare fund management or a marketplace settlement layer. |
| **Enterprise buyers do not see "what to do next"** | A CHRO or CPO reviewing the demo will understand their current activation picture — but they will not understand how KORA helps them act on it. KORA needs to communicate that it is an activation engine, not only a diagnostic engine. |

---

## 14. Required Future Patches

The following patches are required to implement this recovery. They are not all Phase 1L — some are low-effort and should be queued immediately.

| # | Target | Patch | Phase |
|---|---|---|---|
| P-01 | `/company/pillars` | Add Initiative Studio preview section (lightweight table with initiative proposals + disabled "Propose Initiative" CTA) | Phase 1L |
| P-02 | `/admin` | Add Activation Orchestration Engine card/module to the Operating Console grid | Phase 1L |
| P-03 | `/company/kora-index` — explainability panel | Add additionality context to component explanations ("weak GROWTH component driven partly by mandatory compliance training — additional voluntary programs would increase this score") | Phase 1L |
| P-04 | `docs/demo-walkthrough.md` | Update Step 5 (Pillars & Initiatives) to mention KORA orchestration and initiative proposal capability; update Step 7 (Admin) to mention Activation Orchestration Engine | Phase 1L |
| P-05 | `docs/next-handoff-brief.md` | Add section explaining KORA as orchestration layer, not passive scorer; add additionality principle | Phase 1L |
| P-06 | `docs/25-demo-dataset-and-scenarios-spec.md` (future update) | Update initiative and program records with `compliance_status`, `additionality_level`, `initiative_origin` fields in synthetic seed plan | Phase 1L seed update |
| P-07 | `ExplainabilityService` | Extend next best action generation to include initiative proposal suggestions (e.g., "Low IMPACT pillar coverage — propose a cross-company volunteering initiative") | Phase 1L |
| P-08 | `ScoringSimulatorService` | Add compliance/additionality classification to the feature vector documentation and scoring trace output (S2 scenario should show additionality uplift in explanation) | Phase 1M or later |
| P-09 | CLAUDE.md | Add additionality classification vocabulary and orchestration layer to the KORA Identity section | Phase 1L |
| P-10 | Future: methodology documentation | Update `docs/10-architecture-v3-layer-specification.md` and `docs/06-methodological-constitution.md` with compliance/additionality classification at Stage 5 and Stage 8 | Post-Gate 2 |

---

## 15. Final Recommendation

### Is the current project still valid?

**Yes.** Foundation Light v0.1 remains a coherent and well-structured demo application. The intelligence loop, privacy architecture, KORA Index machinery, and My KORA worker layer are correctly implemented. The structural foundations are sound.

### Is this a major correction?

**High importance, but recoverable.** This is not a methodology error and it is not an architecture flaw. It is a product narrative gap and a methodology under-specification. The algorithm produces correct outputs for what it currently classifies. The correction is:
1. Explicitly classify compliance vs. additionality upstream of the IU engine
2. Make the orchestration layer visible in the product — not just implied in the documentation

Neither requires a rebuild. Neither requires changes to the KORA Index components.

### Can it be fixed without rebuild?

**Yes.** The implementation path is:
- Two lightweight preview surfaces (Initiative Studio in company workspace + Activation Orchestration Engine card in admin workspace)
- Additionality vocabulary added to the explainability panel
- Document updates to demo walkthrough and handoff brief
- Methodology field specification (no schema changes yet — pre-Gate 2)

### Severity classification

| Dimension | Assessment |
|---|---|
| Product narrative gap | High — external viewers miss the orchestration capability |
| Methodology correctness | Medium — IU outputs are not wrong for current input data; the gap is in classification upstream |
| Demo credibility impact | Medium-High — the S1→S2 improvement story lacks an orchestration mechanism |
| Implementation effort | Low — no new architecture required; no new routes required; no production backend |
| Urgency | High — should be addressed before enterprise pilot engagement |

### What should the next prompt be?

> **Phase 1L — Initiative Studio + Activation Orchestration Preview**
>
> Implement two lightweight Foundation Light preview surfaces:
> 1. An Initiative Studio preview section inside `/company/pillars`, showing KORA-orchestrated initiative proposals, status badges, and additionality context
> 2. An Activation Orchestration Engine card/module inside `/admin`, showing the module definition, initiative lifecycle, and status vocabulary
>
> Also: update ExplainabilityService next-best-action generation to include initiative proposal suggestions, and update the explainability panel on `/company/kora-index` to reference additionality context in component explanations.
>
> No forms. No payments. No booking. No production workflow. Preview-only.

---

## Appendix: Canonical Sentences

These sentences should be used verbatim in any product communication, demo narrative, or methodology documentation that addresses these capabilities:

> "KORA moves from measuring what happened to orchestrating what should happen next."

> "KORA is the orchestration layer between company intent, worker participation, partner evidence, advisor validation and measurable impact."

> "KORA rewards additionality, verified activation and distributed participation — not mere compliance."

> "Money alone is not impact. Budget allocation does not produce activation without verified worker participation."

> "The employer sees the organization. The worker owns the personal layer. KORA orchestrates the activation between them."

---

**Document version:** v1.0
**Date:** 2026-05-19
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN · Gate 3 OPEN · Gate 5 OPEN
**Phase status:** Phase 1J closed. Phase 1K document complete. Phase 1L: Initiative Studio + Activation Orchestration Preview pending.
**Next prompt:** Phase 1L — Initiative Studio + Activation Orchestration Preview
