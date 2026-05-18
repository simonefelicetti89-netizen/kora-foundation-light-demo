# KORA Foundation Light MVP Build Scope — What We Build Now

*Status: v0.2 — Pending Founder Review*
*Date: 2026-05-17*
*Supersedes: v0.1 (conservative diagnostic-only scope)*
*Canonical references: docs 10, 12, 13, 14, 15, 16, 17, CLAUDE.md*
*Does not generate: SQL, migrations, Prisma models, Supabase tables, React components, API endpoints, or application code*
*Gate condition: No code generation until doc 13 gate conditions are met (Section 16 of this document)*

---

## 1. Purpose

### 1.1 What this document is

This is the transition document from strategy, methodology, and design into product build scope. It defines — with precision — what Foundation Light MVP includes, what is functional, what is semi-functional innovation, what is light ecosystem, what is mockup-only, what is explicitly deferred, and in what order the build must proceed.

### 1.2 Why the scope was revised

The v0.1 scope defined Foundation Light as a diagnostic reporting layer only. That scope was disciplined — but too conservative. A company that sees only a dashboard with a score and a PDF report will not perceive KORA as a platform. They will perceive it as an analytics tool.

KORA's commercial and strategic positioning requires that even the Foundation Light MVP communicates what KORA is becoming: an ecosystem intelligence infrastructure that connects companies, workers, partners, and advisors around a shared, verifiable language of human impact.

The revised scope adds four layers beyond the company intelligence core — an AI ingestion assistant, a worker PIB light module, a partner onboarding light module, and an advisor portal light module — while keeping the build disciplined, privacy-safe, and free of production-scale ecosystem complexity.

### 1.3 What Foundation Light MVP must accomplish

Foundation Light MVP must:
- Accept structured data uploads from a real company and process them through the full KORA methodology
- Classify actions into the five-pillar taxonomy with AI assistance and mandatory human approval
- Calculate a methodology-versioned KORA Index v0.1 with visible confidence and explainability
- Display a rich company intelligence layer: pillar balance, activation, financial governance, temporal signals, concentration risks
- Generate an exportable executive report
- Demonstrate a worker-facing PIB experience (with synthetic or pseudonymized demo data)
- Demonstrate ecosystem participation through partner onboarding and advisor review
- Show the full future platform vision through a clearly labeled vision area
- Support the founder in tracking pilot conversations and commercial validation

The product must communicate: KORA is already becoming a platform, even if the full ecosystem is not yet active.

### 1.4 What Foundation Light MVP is not

Foundation Light MVP is not:
- A fully automated AI-driven scoring machine without human oversight
- A real-time data processing system
- A full worker application for production-scale deployment
- A live partner marketplace with payments
- A governance workflow automation engine
- A certified external validation process
- A fiscal compliance enforcement system
- A payment intermediary of any kind

### 1.5 The four-layer architecture

Foundation Light v0.2 organizes its scope into four explicit layers:

| Layer | What it is | Status |
|---|---|---|
| **Functional Company Core** | Company intelligence, ingestion, scoring, reporting | Fully functional |
| **Semi-functional Innovation** | AI Ingestion Assistant, Explainability Layer, Temporal Intelligence | Functional (AI assists; humans approve) |
| **Light Ecosystem Layer** | Worker PIB Light, Partner Onboarding Light, Advisor Portal Light | Functional with defined scope limits |
| **Future Vision Area** | 14+ labeled mockup screens for future tiers | Static, clearly labeled, non-functional |

### 1.6 The danger of overbuilding still applies

Every layer beyond the minimum required must be evaluated against: does this make the pilot more credible, or does it add complexity without commercial return? The light ecosystem layer is justified because it changes how the product is perceived — from a reporting tool to a platform. If any element within it creates unresolvable complexity before the first pilot, it is deferred.

---

## 2. Foundation Light Product Definition

### 2.1 New positioning

Foundation Light MVP is a platformized Human Impact Intelligence product that:
- Ingests organizational data and transforms it into verified impact intelligence
- Structures that intelligence across the five KORA pillars with confidence and explainability
- Introduces a worker-facing visibility layer demonstrating human-centered design
- Introduces ecosystem participation through partner onboarding and advisor review
- Demonstrates the full future platform architecture through a dedicated vision area
- Creates a presentable, credible, and commercially compelling pilot-ready product

Foundation Light is not the full KORA ecosystem. But it must visibly feel like the beginning of one.

### 2.2 What Foundation Light includes at v0.2

**Functional Company Core:**
- Company Setup with program configuration and fiscal perimeter selection
- AI-assisted Data Upload and Ingestion Studio
- UEF Normalization and Pillar Classification with mandatory human approval
- Full 14-stage Impact Calculation Engine
- Activation Safeguard v0.1
- KORA Index v0.1 with confidence and pre-calibration labeling
- Executive Cockpit with pillar balance, activation, and financial governance
- Explainability Layer: "why this score" views, confidence-aware dashboards
- Temporal and Activation Intelligence: concentration risks, imbalance indicators, continuity signals
- Impact Report Generator (PDF + web)
- Founder Validation Cockpit (KORA-internal)
- Full audit trail from first operation

**Semi-functional Innovation Layer:**
- AI Ingestion Assistant: column recognition, source-type suggestion, pillar suggestion, sensitivity detection, data readiness scoring, onboarding guidance — AI assists, human approves
- Data Readiness Summary and AI Mapping Review screens

**Light Ecosystem Layer:**
- Worker PIB Light: five-pillar PIB display, verified actions timeline, privacy boundary visibility, employer visibility limit — demonstrated with synthetic or pseudonymized demo data
- Partner Onboarding Light: partner profile creation, service cataloging, pillar linkage, review status — no marketplace, no payments
- Advisor Portal Light: review assignment, evidence notes, checklists, approval/rejection — no certification workflow, no payments

**Future Vision Area:**
- 14 labeled future-state mockup screens showing the full KORA platform direction

### 2.3 What Foundation Light explicitly excludes (strict deferred list)

- Live payment flows: FUO orchestration, KIP, partner payout, worker top-up, wallets
- Payroll-ready Welfare Statement as regulatory filing
- Fiscal Guardrails enforcement
- Full production-scale worker application (Worker PIB Light is scope-limited)
- Full partner marketplace with search, booking, and rankings
- Full advisor certification platform
- AI autonomous scoring or recommendation without human approval
- KORA Link hardware integration
- Real-time event streaming or HRIS API integrations
- External API marketplace
- Mobile application
- Territorial intelligence aggregation
- Public certification badge and profile
- Production-scale cross-company benchmarks

---

## 3. Build Principles

### 3.1 Build credibility before completeness

Every screen that appears in a pilot must be defensible. Every number must be explainable. Every output must carry its methodology version. A partially complete screen that misleads a pilot company is more damaging than no screen at all.

### 3.2 Real methodology before any dashboard

The KORA Index must be computed by the real 14-stage algorithm, applied to real uploaded data, with real methodology version tracking. No dashboard is built until the scoring engine output is confirmed correct against the Stress Test scenarios.

### 3.3 Platform feel through depth of layers, not breadth of features

The platform feeling comes from showing that KORA operates across multiple actors — company, worker, partner, advisor — even if each actor's layer is deliberately limited in depth. A product with five deep, principled layers feels more like a platform than a product with thirty flat features.

### 3.4 Demo-ready but not vaporware

Every screen that is functional must run on real or synthetic data. The distinction between functional, semi-functional, and future vision must be internally clear — and visually clear to anyone viewing a demo.

### 3.5 Three explicit layer labels across the product

Every screen in the platform carries one of three explicit state labels, visible to KORA internal users and in demos:
- **Live** — fully functional, runs on real or synthetic data
- **Innovation Preview** — AI-assisted, functional but with human approval gate
- **Future Vision** — clearly labeled mockup, not active in Foundation Light v0.1

These labels prevent confusion and communicate strategic ambition honestly.

### 3.6 Privacy boundaries from day one

No employer-facing view may surface individual worker data. Aggregation thresholds (minimum 10 individuals per segment) must be enforced from the first pilot. The separate Identity Store, pseudonymization service, and grant-absence access model are Phase 1 requirements — before the first real data is ingested.

Worker PIB Light is shown to pilot companies using synthetic or pseudonymized demo data. Individual real worker PIB is never surfaced to the employer under any circumstance.

### 3.7 AI assists, humans approve — always

The AI Ingestion Assistant is an acceleration and intelligence layer. It cannot approve records autonomously, cannot alter formulas, cannot bypass the methodology, cannot invent data, cannot produce final KORA truth independently. Every AI-suggested classification carries `review_status = 'pending'` until a human reviewer confirms or overrides it.

### 3.8 Ecosystem light, not ecosystem complete

Partner Onboarding Light and Advisor Portal Light are deliberately constrained. Partners catalog their services — they do not participate in a marketplace. Advisors review assigned materials — they do not run certification workflows. The ecosystem layer at Foundation Light is proof of architecture, not production functionality.

### 3.9 Versioned methodology and auditability from first operation

Every scoring output carries `methodology_version_id`. The audit trail is INSERT-only before the first data ingestion. These are not Phase 2 items.

### 3.10 Operational simplicity governs infrastructure sizing

Foundation Light is sized for tens of pilot companies. Batch ingestion is correct. On-demand scoring is correct. Manual report approval is correct. Simplicity at this scale is a feature, not a limitation.

---

## 4. MVP User Roles

Foundation Light v0.2 defines seven roles. All access is enforced at the database level, not only in application logic.

### 4.1 KORA Admin (Founder / Internal)

**Can do:** Full platform administration — create company profiles, manage all data, trigger scoring, generate reports, manage users, access Founder Validation Cockpit, onboard partners and advisors, manage methodology version records, access full audit trail.

**Cannot do:** Directly modify scoring outputs or audit records (all changes go through the pipeline or produce new versioned records).

### 4.2 KORA Analyst (Internal)

**Can do:** Review and approve ingestion batches, confirm or override AI classification suggestions, run scoring pipeline on approved batches, generate reports, onboard partner profiles, assign advisor reviews, view all company data in analysis mode.

**Cannot do:** Create or delete company accounts. Access the Founder Validation Cockpit. Modify methodology version definitions.

### 4.3 Company Executive Viewer

**Can do:** View Executive Cockpit, pillar breakdown, activation intelligence, explainability views, temporal intelligence, financial governance snapshot, and download reports. View their own company data only.

**Cannot do:** Upload data. See individual worker data. Access KORA-internal screens. See other companies' data.

### 4.4 Company HR/ESG Viewer

**Can do:** Everything Executive Viewer can do, plus upload data files through the Ingestion Studio, track ingestion batch status, view the AI Mapping Review output (read-only — KORA Analyst approves), view data confidence details.

**Cannot do:** Approve their own ingestion batch (KORA Analyst approves). Access KORA-internal screens. See individual worker data.

### 4.5 Worker (Demo / PIB Light)

**Who:** In Foundation Light v0.1, the Worker role is used to demonstrate the Worker PIB Light experience using synthetic or pseudonymized demo data. Real workers at pilot companies do not log in with individual accounts at this stage — that is a future Worker App feature.

**Can do:** View their own PIB Light Home (five-pillar view), Verified Actions Timeline, Privacy & Data Ownership explanation, Employer Visibility Boundary view. All shown with synthetic or pseudonymized data.

**Cannot do:** See other workers' data. See their company's KORA Index. Upload data. Access any company-facing intelligence screen.

**Database access:** No access to `gov.*`, `analytics.company_impact_aggregates`, `analytics.kora_indices`, `analytics.kora_index_components`. Access only to their own pseudonymized PIB record — and only via the PIB Light interface.

### 4.6 Partner (Onboarding Light)

**Who:** An authorized service provider participating in the KORA ecosystem at the onboarding level.

**Can do:** Create and manage their partner profile, catalog their service categories and pillar coverage, submit evidence documents for review, view their review status (under review / approved / revision requested), see which company programs have linked their services.

**Cannot do:** See company-level KORA scores. See worker data. Access pricing or payment information. Access the full partner analytics suite (future).

### 4.7 Advisor (Portal Light)

**Who:** A KORA-authorized external advisor assigned to specific reviews.

**Can do:** Access their assigned reviews (partner review, data quality review, methodology review, fiscal/privacy context review), add structured notes and checklist responses, approve or request revision on assigned materials, see the evidence documents attached to their assignment, generate a review summary for their assignment.

**Cannot do:** Access company KORA Index scores without explicit assignment. Modify company data. Access worker data. Access unassigned companies or partners. Issue certifications (Certified tier feature).

---

## 5. Functional Modules

These modules are fully or semi-functionally operational in Foundation Light v0.2. They run on real or synthetic data and are methodology-versioned and auditable.

---

### Module A — Company Setup

Unchanged from v0.1. Creates the company profile, program period, budget declaration, fiscal perimeter selection, DPA requirement gate, and user account assignment. DPA must be signed before any data ingestion proceeds.

---

### Module B — Data Upload / Ingestion Studio

Accept file uploads (CSV, XLSX, structured exports). Support multiple source types per ingestion batch. Column mapping interface. Source type classification. Confidence pre-assignment. Validation with row-level error reporting. Batch status tracking: submitted → AI-reviewed → under_analyst_review → approved / rejected.

**Update from v0.1:** The ingestion flow now feeds into Module B-AI (AI Ingestion Assistant) before reaching the human review stage. The flow is:

```
File Upload → AI Ingestion Assistant → AI Mapping Review → Human Analyst Approval → Approved UEF Records
```

KORA Analyst sees the AI's work and confirms, overrides, or rejects before any record advances to scoring.

---

### Module B-AI — AI Ingestion Assistant

**Purpose:** Accelerate data onboarding and reduce analyst manual effort through AI-powered recognition, classification, and quality assessment. AI assists — it does not decide.

**AI functions at Foundation Light v0.1:**

**Column recognition:** Given an uploaded file, the AI identifies which columns map to which KORA data fields (date, participant identifier, event type, duration, provider, category, etc.) — even when column names are non-standard or vary by data source.

**Source-type recognition:** Identifies the source type (welfare usage, training LMS, ESG initiative, volunteering, HR workforce segment) based on column structure and sample values — without requiring the user to manually label each file.

**Event-type suggestion:** For each row, suggests the most likely KORA event type from the defined taxonomy based on category labels, provider names, or activity descriptions in the uploaded data.

**Pillar suggestion:** Suggests which KORA pillar (LIFE, GROWTH, CONNECTION, IMPACT, LEGACY) each event record maps to, with a confidence level per suggestion. Multi-pillar events receive a primary and optional secondary pillar suggestion.

**Sensitivity detection:** Flags records that may contain health-adjacent, psychological, or personally sensitive information based on category keywords and provider names. Marks these for elevated privacy review before UEF creation.

**Duplicate detection:** Identifies potential duplicate records across multiple uploaded files or within the same file (same event, same date range, same cohort appearing in two source files).

**Missing-field detection:** Identifies required fields that are absent per row and provides structured guidance on what is missing and how it affects confidence.

**Confidence scoring:** Produces a record-level pre-classification confidence estimate and a batch-level Data Readiness Score (0–100) reflecting how complete, consistent, and verifiable the uploaded data is.

**Onboarding guidance:** Generates a structured onboarding note for the analyst and the company: "This dataset covers GROWTH events well. LIFE and IMPACT pillars have minimal data. Adding welfare usage records would significantly increase pillar coverage and confidence."

**AI limitations (hard rules — not configurable):**
- AI cannot approve any UEF record autonomously. All suggestions carry `review_status = 'pending'` until human-confirmed
- AI cannot alter the IU formula or any methodology parameter
- AI cannot bypass the 14-stage algorithm at any stage
- AI cannot invent data that is not present in the uploaded source
- AI cannot produce a KORA Index or a final impact score — it produces suggestions that feed the human-reviewed classification pipeline
- AI classifications must always show their confidence level and the basis for the suggestion

**Screens added by Module B-AI:**
- **AI Data Readiness Summary** — batch-level overview: Data Readiness Score, source type recognition results, missing field summary, duplicate alerts, sensitivity flags, recommended next actions before analyst review
- **AI Mapping Review** — row-level classification table with AI suggestions and confidence indicators. Analyst can bulk-confirm, individually override, or reject any suggestion
- **UEF Draft Preview** — shows the UEF records that would be created if the current AI mapping is confirmed. Analyst reviews this before approving the batch for scoring

---

### Module C — UEF Mapping Layer

Unchanged from v0.1 in logic. Updated in workflow: UEF records now arrive pre-classified by the AI Ingestion Assistant. The analyst's job is review and confirmation, not manual classification from scratch. Human confirmation remains mandatory for every record before it advances to scoring.

Classification method tracking: `ai_suggested` → `human_confirmed` or `human_override`. No record reaches the scoring engine with `review_status = 'pending'`.

---

### Module D — Impact Calculation Engine v0.1

Unchanged from v0.1. Executes all 14 algorithm stages in mandatory sequence. Produces IU records, PIB records (internal), company aggregates. Every output carries `methodology_version_id` NOT NULL.

---

### Module E — Activation Safeguard v0.1

Unchanged from v0.1. Mandatory Stage 13. AR and MAR calculation. Safeguard status: CLEAR / WARNING / FLAGGED. `kora_indices.activation_safeguard_result_id` is NOT NULL — no KORA Index without a corresponding safeguard result.

---

### Module F — KORA Index v0.1

Unchanged from v0.1. 10-component weighted index with pre-calibration labels on all outputs. CO component INSUFFICIENT_DATA on first analysis. All mandatory labels: methodology version, calibration status, confidence band, safeguard status, unavailable components.

---

### Module G — Executive Cockpit

Unchanged from v0.1 in core structure. Enriched by the Explainability Layer (Module G-EX) and Temporal Intelligence Layer (Module G-TI).

---

### Module G-EX — Explainability & Confidence Layer

**Purpose:** Make KORA's intelligence legible and defensible. Every score must be explainable to a non-technical executive in plain language. Explainability is not an optional feature — it is a methodological requirement and a trust-building mechanism.

**What it adds to the company-facing experience:**

**Score Explainability View ("Why this score"):** An expandable panel available from any score display in the platform. Shows: which components contributed most to the KORA Index, what the top 3 IU-generating events were in each pillar, which data sources have the highest and lowest confidence, what factors are pulling the score down (low EV due to declared-only events, low PC due to missing pillars, low AR triggering a safeguard modifier). Written in plain language alongside technical notation.

**Confidence-aware dashboard rendering:** All charts and score displays show confidence visually — not just as a label but through visual encoding. High confidence: full color saturation. Medium confidence: slightly desaturated. Low confidence: explicitly lighter treatment with a "limited data" indicator. This prevents the platform from presenting uncertain scores with false visual precision.

**Missing Dimension View:** A dedicated view showing what KORA does not know about this company's program — which pillars have zero or near-zero data, which evidence types are absent (no certified events, no training records, etc.), which cohorts are below the safe aggregation threshold and therefore suppressed. The view frames this constructively: "Here is what would improve your next analysis."

**Limitation acknowledgment:** Every KORA Index display includes an expandable limitations section. For Foundation Light v0.1 pre-calibration scores, limitations are explicit: "This score uses pre-Delphi-Study calibration weights. Weights will be updated after empirical calibration. Historical scores will retain their version label."

**Screens added by Module G-EX:**
- **C-EX-1: Score Explainability View** — "Why this score" panel, accessible from the Executive Cockpit and Pillar Breakdown
- **C-EX-2: Confidence & Missing Data View** — full confidence decomposition per source, per pillar, per component; missing dimension guidance

---

### Module G-TI — Temporal & Activation Intelligence Layer

**Purpose:** Make KORA feel like a living intelligence system that detects patterns and risks — not a static scorecard. Even on a first analysis, temporal and structural signals can be identified.

**What it adds:**

**Temporal evolution placeholders:** On first analysis, the system shows the evolution infrastructure — the timeline is empty but present, with a message: "Your KORA Index evolution will appear here after your second analysis period. Baseline established: [date]." This communicates future value without fabricating history.

**Concentration risk indicators:** Detects when more than 60% of total IUs (or budget, if provided) are concentrated in a single pillar, cohort, or program category. Displays as a visible structural alert: "GROWTH pillar concentration: 71% of total IUs from training programs. CONNECTION and IMPACT pillars have minimal representation."

**Pillar imbalance indicators:** Computes the PB (Pillar Balance) component and surfaces its interpretation visually — a radar or ring chart where the imbalance is immediately perceivable. Flags which pillars are underserved even if the overall KORA Index is adequate.

**Activation continuity indicators:** Where multiple periods of data exist (rare at Foundation Light but possible), shows whether activation is growing, stable, or declining. On first analysis: activation rate is shown alongside the industry-context note (no benchmark at v0.1, but the safeguard thresholds provide a reference frame).

**Organizational blind-spot detection:** Identifies structural patterns that suggest a program is investing in visible, easy-to-report activities while neglecting harder-to-evidence dimensions. Examples: high declared wellness benefits but no evidenced participation, high training budget but no LMS export provided, social initiatives declared but no volunteering data.

**Screens added by Module G-TI:**
- **C-TI-1: Temporal & Activation Intelligence View** — concentration risk cards, pillar imbalance radar, activation continuity timeline (baseline + future periods), blind-spot detection panel

---

### Module H — Impact Report Generator

Unchanged from v0.1 in structure. Report now includes Explainability section, concentration risk summary, and missing dimension guidance as standard sections. Pre-signed time-limited PDF download.

---

### Module I — Founder Validation Cockpit

Unchanged from v0.1. KORA-internal only. Tracks stakeholder pipeline, ICP Fit scores, Conviction Delta, 90-day phase progress, validation KPIs.

---

### Module W — Worker PIB Light

**Purpose:** Introduce a worker-facing layer that demonstrates human-centered intelligence from day one. The Worker PIB Light shows workers what KORA knows about their impact journey — their five-pillar Personal Impact Balance, their verified actions, and the privacy boundaries that protect their data.

**At Foundation Light v0.1:** The Worker PIB Light interface is demonstrated using synthetic or pseudonymized demo data. Real pilot company workers do not receive individual login accounts in v0.1 — that is a Worker App feature. The interface is built and functional as a demonstrable experience, using demo worker profiles that run through the real PIB calculation engine (Stage 11).

**What it includes:**

**Five-Pillar PIB Display:** The worker's Personal Impact Balance across the five KORA pillars, visualized using the brandmark-derived organic geometry. The display shows which pillars they have contributed to, what their relative balance looks like, and how their impact has been verified. No absolute numerical PIB score is shown — relative pillar visualization is the primary display.

**Verified Actions Timeline:** A chronological list of the worker's verified impact events — with date, program or activity type, pillar tag, and verification level (declared / evidenced / certified). The timeline shows the worker what KORA has recorded about their actions. It is a record of real things, not a feed.

**Privacy & Data Ownership View:** An explicit, plain-language explanation of: what data KORA holds about this worker, where it came from, how long it is retained, who can see it, and what the worker can request (deletion, export). This is not a legal disclaimer — it is a trust interface.

**Employer Visibility Boundary View:** Shows the worker exactly what their employer sees about them: nothing at the individual level. The employer sees pillar-level aggregates, activation rates, and segment-level distributions — never individual PIB, individual UEF, or individual action history. This boundary is shown visually — a clear dividing line between "what you see" and "what your employer sees."

**What Module W does not include:**
- Individual worker login with production-scale authentication for all employees
- Dynamic Impact CV (portable credential across employers) — future Ecosystem tier
- KORA Link interaction (physical/digital action confirmation) — future Ecosystem tier
- Benefits discovery or booking (marketplace — future Ecosystem tier)
- Social layer (peer comparison, leaderboards, community) — anti-pattern to be avoided entirely
- Top-up or wallet functions — future Ecosystem tier

**Privacy rules specific to Worker PIB Light:**
- Worker interface uses synthetic or pseudonymized demo data at Foundation Light v0.1
- No real individual worker data is surfaced through the Worker PIB Light interface in production pilots until the Worker App is formally launched
- Employer-facing views are completely isolated — no path from company-side to individual worker data
- Worker data is never used as input to the KORA Index via any employer-visible channel

---

### Module P — Partner Onboarding Light

**Purpose:** Introduce the partner ecosystem layer at a catalog level — allowing a small number of real or demo partners to be onboarded during pilot validation. This makes KORA feel like a platform with an ecosystem, without building a marketplace.

**What it includes:**

**Partner Profile Creation:** A structured profile for each onboarded partner: organization name, type (welfare provider, training provider, ESG partner, community organization, professional association), geography/territory, service categories (linked to KORA pillar taxonomy), pillar coverage declaration, fiscal category tags (informational, with `kora_inferred` confidence), contact details, legal/compliance notes.

**Service Catalog:** For each partner, a list of services they offer within the KORA framework. Each service record includes: service name, pillar assignment, verification level of typical evidence provided, whether the service is linked to any active company program in the KORA system.

**Company-Program Linkage:** Partners can be linked to company programs — when a company uploads welfare or training data referencing a specific partner, that partner's profile is referenced. This creates a basic relationship graph: company → program → partner → pillar.

**Evidence / Document Metadata:** Partners can submit reference documents (service descriptions, accreditation certificates, methodology notes) as evidence that enriches the confidence of events linked to their services. Documents are stored as metadata with blob storage references — they are reviewed by an Advisor.

**Partner Review Status:** Each partner profile has a review status: under_review / approved / revision_requested / approved_with_notes. KORA Analyst or an assigned Advisor conducts the review. Partners can see their own status.

**Basic Partner Directory (KORA-internal):** A searchable internal directory of all onboarded partners, filterable by pillar, service category, geography, and review status. Used by KORA Analysts when reviewing company program data.

**What Module P does not include:**
- Public partner pages visible to the general market
- Worker-facing partner discovery or booking
- Partner payments or settlement
- Partner ranking or scoring (visible to partners or companies)
- Partner analytics suite (activation rates, revenue — future feature)
- Partner-to-partner networking
- Marketplace search and recommendation engine

---

### Module A-ADV — Advisor Portal Light

**Purpose:** Give KORA-authorized external advisors controlled, structured participation in review processes — making the trust architecture visible and functional even at the earliest stage.

**What it includes:**

**Advisor Profile:** Name, credentials, role type (welfare specialist, ESG advisor, fiscal/labor law advisor, privacy/GDPR advisor, methodology reviewer), assigned geography/sector, KORA authorization level, active assignment list.

**Advisor Role Types:**
- **Methodology Reviewer** — reviews UEF classification decisions, BCM entries, and scoring outputs for methodological accuracy
- **Data Quality Reviewer** — reviews ingestion batch quality, source classification confidence, and missing-dimension analysis
- **Partner Reviewer** — reviews partner profile documentation and service catalog entries for completeness and accuracy
- **Fiscal/Privacy Advisor** — provides structured review of fiscal perimeter classifications and privacy architecture decisions for a specific company
- **Pilot Guide** — provides structured feedback and guidance on pilot engagement quality and report credibility

**Assigned Reviews:** Each advisor sees only the reviews assigned to them by a KORA Analyst or Admin. Reviews are typed: a Partner Review assignment gives access to the partner's profile and documents. A Data Quality Review gives access to the company's ingestion batch and UEF draft (in read-only mode). A Methodology Review gives access to the scoring run and methodology parameter view.

**Evidence Review Notes:** For each assigned review, the advisor can write structured notes attached to specific elements — a specific UEF record, a partner document, a report section. Notes are typed: observation / concern / recommendation / approval. Notes are visible to KORA Analysts and Admin, not to company users directly.

**Review Checklists:** Each review type has a KORA-defined checklist. Advisors work through the checklist items and mark each complete or flag for discussion. Checklists are typed by review type (Partner Review checklist, Data Quality checklist, Methodology checklist, etc.).

**Approval / Revision States:** Each review concludes in one of three states: Approved / Approved with Notes / Revision Requested. These states flow back into the relevant module: a Partner Review approval updates the partner profile status. A Data Quality approval is recorded in the ingestion batch audit trail.

**Audit Trail:** Every advisor action — assignment accepted, note added, checklist item completed, approval issued — is recorded in the immutable audit trail.

**What Module A-ADV does not include:**
- Advisor LMS or training program
- Advisor certification marketplace (issuance of KORA-certified advisor status at scale — future)
- Public advisor profiles visible to the general market
- Advisor payments or remuneration tracking
- Full governance workflow participation (full governance engine is a Governance tier feature)
- Advisor-to-company direct communications (all communication flows through KORA)

---

## 6. Future Vision Area

The Future Vision Area is a dedicated section of the platform — accessible from the main navigation under a clearly labeled "Platform Vision" or "KORA Roadmap" view. Every screen is labeled: **"Future Vision — Not active in Foundation Light v0.1"**.

This section is not hidden. It is a strategic product communication tool. When an investor or pilot company navigates KORA, the Future Vision Area shows where the platform is going without misrepresenting what it can do today.

### 6.1 Future Vision screens (all mockup-only, static, doc 17-compliant)

**V-01: Full Worker Dashboard**
The complete worker application experience — full PIB history, Dynamic Impact CV, program discovery, community features, KORA Link integration point. Labeled: "Coming with KORA Ecosystem."

**V-02: Dynamic Impact CV**
The portable, worker-controlled verified impact credential that travels across employers. A professional record of verified human impact, KORA-signed. Labeled: "Coming with KORA Ecosystem."

**V-03: KORA Link**
The physical or digital interface connecting workers to KORA actions in real-world spaces — gym, training center, community venue, office. NFC/QR confirmation of actions. Labeled: "Coming with KORA Link hardware."

**V-04: Full Partner Portal**
The complete partner experience — activation analytics, worker engagement data, reputation score, revenue tracking, service performance. Labeled: "Coming with KORA Foundation (Tier 2)."

**V-05: Full Advisor Platform**
The complete advisor platform — certification workflow, methodology audit suite, cross-company review, advisor credential management. Labeled: "Coming with KORA Governance and Certified tiers."

**V-06: Governance Workflow Engine**
Budget policy rules, pillar allocation minimums, concentration limits, real-time risk alerts, board reporting packages, decision audit trail. Labeled: "Coming with KORA Governance (Tier 3)."

**V-07: KORA Certified — Badge & Public Profile**
External methodology validation, certified badge, public KORA Impact Profile, benchmark positioning, methodology transparency report. Labeled: "Coming with KORA Certified (Tier 4)."

**V-08: Territory Intelligence Map**
Aggregate, anonymized impact intelligence at municipality, region, sector level. Community and territorial health indicators. Labeled: "Coming with KORA Ecosystem Intelligence."

**V-09: Ecosystem Intelligence Dashboard**
The full ecosystem aggregation layer — company networks, partner networks, worker flows, territorial patterns, impact benchmark across the KORA universe. Labeled: "Coming with KORA Ecosystem Intelligence."

**V-10: Payments / FUO / Wallet Flows**
Welfare fund orchestration, partner settlement, worker top-up, KIP mechanism, fiscal-optimized benefit distribution. Labeled: "Coming with KORA Ecosystem — pending regulatory review."

**V-11: AI Recommendation Engine**
Predictive rebalancing recommendations, strategic allocation simulation, program effectiveness prediction. Labeled: "Coming with KORA Foundation and Governance."

**V-12: Scenario Simulation**
"What if we invested 20% more in GROWTH?" — interactive scenario modeling on the KORA Index. Labeled: "Coming with KORA Governance."

**V-13: Cross-Company Benchmarks**
Anonymous peer comparison — sector-level KORA Index distribution, percentile positioning, benchmark evolution. Labeled: "Coming with KORA Foundation — requires network scale."

**V-14: KIP / Top-up Logic**
The KORA Impact Points system allowing welfare top-ups, fiscal optimization at the individual level, and ecosystem currency. Labeled: "Coming with KORA Ecosystem — pending legal and fiscal review."

---

## 7. Required MVP Screens

Screens are organized into six groups matching the product architecture.

---

### Group A — Functional Company Core

**KORA Internal:**

**I-A1: KORA Admin Home**
Overview of all companies, pipeline health, pending actions, Founder Validation KPI summary. Functional. Primary user: KORA Admin.

**I-A2: Company List**
Tabular view of all companies with KORA Index, activation, DPA status, pilot stage. Filterable and sortable. Functional. Primary users: KORA Admin, KORA Analyst.

**I-A3: Company Profile**
Company setup, DPA status gate, program period, declared budget, fiscal perimeter selections, user accounts, ingestion history, scoring history, report history. Functional. Primary user: KORA Admin.

**I-A4: Methodology / Parameter View**
Active methodology version, BCM entries, NM rules, correction factors, KORA Index weight vector, Activation Safeguard thresholds, calibration status. Read-only. Functional. Primary users: KORA Admin, KORA Analyst.

**I-A5: Founder Validation Cockpit**
Internal stakeholder pipeline (doc 14/15 logic). Pipeline board, ICP Fit distribution, Conviction Delta trend, validation KPIs, 90-day phase progress, weekly review checklist. Manual entry at v0.1. Functional. Primary user: KORA Admin (Founder only).

**Company-facing:**

**C-A1: Executive Cockpit**
KORA Index (dominant, with confidence + methodology labels), Activation Safeguard status, pillar balance ring/radar, activation rate, top 3 insights, top 3 gaps, budget efficiency headline. Functional. Primary users: Executive Viewer, HR/ESG Viewer.

**C-A2: Pillar Breakdown**
Per-pillar: IUs, activation rate, confidence, verification breakdown, key programs, top gap. All five pillars always shown. Functional. Primary users: Executive Viewer, HR/ESG Viewer.

**C-A3: Activation & Workforce Intelligence**
Overall activation rate, MAR (if computable), activation by segment (above threshold only), Activation Safeguard result, below-threshold segment suppression messaging. Functional.

**C-A4: Financial / Fiscal Governance Snapshot**
Declared budget vs. IUs, cost per IU by pillar, fiscal eligibility distribution (kora_inferred, with disclaimer). Informational only — no enforcement. Functional.

**C-A5: Report Export View**
Report generation trigger, web preview, PDF download (pre-signed time-limited URL), report history list. Functional.

---

### Group B — AI Onboarding & Explainability

**KORA Internal (Ingestion pipeline):**

**I-B1: Data Upload Studio**
File upload interface, column mapping (enhanced with AI pre-mapping), source type selector, confidence pre-assignment, validation results display, batch submission. AI-assisted. Functional.

**I-B2: AI Data Readiness Summary**
Batch-level overview after AI processing: Data Readiness Score [0–100], source type recognition results, missing field map, duplicate alert count, sensitivity flag summary, recommended next actions before analyst review. AI-generated, analyst-reviewed. Innovation Preview.

**I-B3: AI Mapping Review**
Row-level classification table: AI suggestions (event type, pillar, confidence, basis), bulk-confirm action, individual override interface, rejection with annotation, batch approval trigger. AI-suggested, human-confirmed. Innovation Preview.

**I-B4: UEF Draft Preview**
Shows the exact UEF records that would be created if the current AI mapping is confirmed — before any record is written to the database. Analyst reviews and approves. Innovation Preview.

**Company-facing (Explainability + Temporal):**

**C-B1: Score Explainability View ("Why this score")**
Expandable from any score display. Top contributing components, top IU-generating events per pillar, data sources by confidence impact, factors pulling the score down, plain-language explanation alongside technical notation. Functional.

**C-B2: Confidence & Missing Data View**
Per-source confidence table, overall CS with component breakdown, calibration status plain-language explanation, per-pillar confidence, what would improve the next analysis. Functional.

**C-B3: Temporal & Activation Intelligence View**
Concentration risk cards, pillar imbalance radar, activation continuity timeline (baseline established; evolution in future periods), blind-spot detection panel, organizational risk indicators. Functional.

---

### Group C — Worker PIB Light

**Worker-facing (demonstrated with synthetic / pseudonymized demo data at v0.1):**

**W-C1: Worker PIB Light Home**
Five-pillar PIB display using brandmark-derived organic geometry. Relative pillar balance visualization. Pillar labels with verification level indicators. Clean, human-centered, calm. Semi-functional (real PIB engine; demo data at v0.1).

**W-C2: Verified Actions Timeline**
Chronological record of the worker's verified impact events. Date, program type, pillar tag, verification level (declared / evidenced / certified). No absolute scores — a record of real things done. Semi-functional (real engine; demo data at v0.1).

**W-C3: Privacy & Data Ownership View**
What data KORA holds about this worker. Where it came from. How long it is retained. Who can see it. What the worker can request. Written in plain language, not legal copy. Functional.

**W-C4: Employer Visibility Boundary View**
Shows the worker exactly what their employer sees: nothing at the individual level. Visual dividing line between "what you see" and "what your employer sees." Employer sees pillar aggregates and activation rates only. Functional.

---

### Group D — Partner Onboarding Light

**Partner-facing + KORA Internal:**

**P-D1: Partner Directory (KORA Internal)**
Searchable internal list of all onboarded partners. Filterable by pillar coverage, service type, geography, review status. Primary user: KORA Analyst. Functional.

**P-D2: Partner Profile**
Partner creation and management. Organization details, service categories, pillar coverage, geography, fiscal category tags, contact details, review status indicator. Accessible by Partner (their own profile) and KORA Analyst (all profiles). Functional.

**P-D3: Service Catalog**
Per-partner list of services with pillar assignment, evidence type, linked company programs. Editable by Partner; reviewed and approved by KORA Analyst. Functional.

**P-D4: Partner Review Status**
Status indicator for the partner's profile review (under_review / approved / revision_requested / approved_with_notes). Partner sees their own status. Review history log. Functional.

---

### Group E — Advisor Portal Light

**Advisor-facing:**

**A-E1: Advisor Dashboard**
Advisor's active assignments, review status summary, recent notes, upcoming deadlines. Clean, operational, institutional. Functional.

**A-E2: Assigned Reviews**
List of all reviews assigned to this advisor, typed by review type (Partner, Data Quality, Methodology, Fiscal/Privacy, Pilot Guide), with status (assigned / in_review / submitted). Functional.

**A-E3: Evidence Review**
For a specific assignment: shows the assigned materials (partner profile, ingestion batch summary, scoring run summary, report section) in read-only mode. Advisor writes structured notes with type tags. Functional.

**A-E4: Review Checklist & Notes**
Typed checklist (by review type), note field per checklist item, overall approval status (Approved / Approved with Notes / Revision Requested). Final submission triggers audit trail record and updates review status. Functional.

---

### Group F — Future Vision Area

All screens: static mockups, clearly labeled "Future Vision — Not active in Foundation Light v0.1," visually coherent with doc 17 design system.

V-01: Full Worker Dashboard
V-02: Dynamic Impact CV
V-03: KORA Link
V-04: Full Partner Portal
V-05: Full Advisor Platform
V-06: Governance Workflow Engine
V-07: KORA Certified — Badge & Public Profile
V-08: Territory Intelligence Map
V-09: Ecosystem Intelligence Dashboard
V-10: Payments / FUO / Wallet Flows
V-11: AI Recommendation Engine
V-12: Scenario Simulation
V-13: Cross-Company Benchmarks
V-14: KIP / Top-up Logic

---

## 8. MVP Data Requirements

### 8.1 Company data (unchanged from v0.1)

**Required (at least one activity dataset):**
- HR / Workforce Segment Data (headcount, segments — required as denominator for AR)
- Welfare / Benefit Usage Data (event, date, participation count or pseudonymized identifier)

**Optional but valuable:**
- Training / LMS Data
- ESG / Social Initiative Records
- Volunteering / Community Records
- Budget Allocation by Category
- Partner / Provider List
- Survey / Engagement Data (supplementary only — not a primary IU source)

**Minimum for first pilot:** Workforce headcount data + at least one activity dataset + approximate declared budget.

### 8.2 Partner data (new at v0.2)

**Required for Partner Onboarding Light:**
- Organization name and type
- Service categories with pillar mapping
- Geography / territory
- Primary contact

**Optional but recommended:**
- Fiscal category tags (kora_inferred by default)
- Service description documents
- Accreditation or evidence documents (for Advisor review)

**Format:** Structured form entry through Partner Profile creation screen (no bulk upload required at v0.1).

### 8.3 Advisor data (new at v0.2)

**Required for Advisor Portal Light:**
- Advisor name and role type
- Credentials or professional background (text field)
- Assigned reviews (set by KORA Admin/Analyst)

**Managed by:** KORA Admin. No self-registration at Foundation Light v0.1.

---

## 9. Demo Data Strategy

### 9.1 Synthetic company profiles (unchanged from v0.1, four profiles: A through D)

**Profile A — Strong company (balanced, high-confidence):** Italian mid-market manufacturing, 800 employees, active welfare + training + volunteering, 68% activation, mix of evidenced and certified events. Expected KORA Index: 65–72 range.

**Profile B — Developing company (GROWTH concentration, low LEGACY):** Italian services, 400 employees, training-heavy, minimal welfare and no social initiatives, 45% overall activation, mostly declared data. Expected KORA Index: 45–52 range.

**Profile C — Problematic company (low activation, poor data quality):** Italian retail, 1,200 employees, many programs declared, 18% actual activation. Activation Safeguard: WARNING.

**Profile D — First-time analysis (missing data):** Italian professional services, 250 employees, training records only, GROWTH pillar only. Demonstrates honest limitation acknowledgment.

### 9.2 Synthetic worker profiles (new at v0.2)

Three demo worker profiles per company profile, designed to show the range of the PIB Light experience:

**Worker W-1 (Active, balanced):** Contributions across three pillars (GROWTH: two training completions; LIFE: one welfare service evidenced; IMPACT: one volunteering event). Shows a meaningful PIB across multiple dimensions.

**Worker W-2 (Single-pillar, declared only):** GROWTH only, declared events. Shows a narrower PIB and the difference between declared and evidenced verification levels.

**Worker W-3 (Minimal participation):** One declared event only. Shows the PIB interface under minimal data conditions — honest, not inflated.

All worker profiles use synthetic pseudonymized identifiers. No real worker data is used in demos.

### 9.3 Synthetic partner profiles (new at v0.2)

Three demo partner profiles for the Partner Onboarding Light demonstration:

**Partner P-1 (Welfare provider, LIFE + CONNECTION):** Psychological support and team coaching services, Italy-wide, LIFE and CONNECTION pillar coverage, two service catalog entries, approved status.

**Partner P-2 (Training provider, GROWTH):** Upskilling and certification programs, GROWTH pillar, three service catalog entries, approved with notes (missing evidence document).

**Partner P-3 (ESG partner, IMPACT):** Community volunteering coordination, IMPACT pillar, one service catalog entry, under_review status.

### 9.4 Synthetic advisor profile (new at v0.2)

**Advisor ADV-1 (Methodology Reviewer):** Assigned to review the scoring run for Company Profile A. One active assignment. Demonstration of the full review workflow: checklist, notes, approval.

### 9.5 Requirements for all synthetic data

- All synthetic data runs through the real scoring engine — no mock or hardcoded outputs
- AI Ingestion Assistant suggestions are pre-computed or real-time for synthetic data
- Synthetic data must exercise edge cases: below-threshold segments (suppressed), high-sensitivity events, zero-IU pillars, missing budget data
- Synthetic data is isolated in the development environment — does not reach production (per doc 13 D-10)
- The Stress Test scenarios from Appendix A remain the scoring engine validation standard

---

## 10. MVP Algorithm Scope

Unchanged from v0.1. The full 14-stage algorithm is active. All factors and components with their Foundation Light v0.1 status are preserved as defined in doc 18 v0.1 Section 10. The AI Ingestion Assistant operates before Stage 1 (UEF normalization) — it is a pre-pipeline classification accelerator, not a scoring component.

Key rules preserved:
- IU formula: `IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]`
- DF, EXF, SF default to 1.00 unless evidence supports variation
- CO component INSUFFICIENT_DATA on first analysis
- All outputs labeled pre-calibration
- No financial data enters the scoring formula
- PIB is mandatory (Stage 11) and never surfaced to employers
- Activation Safeguard is mandatory (Stage 13)

---

## 11. MVP Privacy and Trust Scope

### 11.1 Core privacy rules (preserved from v0.1)

- No individual worker visibility for employers — grant absence enforced at database level
- Aggregation threshold: minimum 10 individuals per segment
- Pseudonymization before analytics — raw identifiers never enter the Analytics Store
- High-sensitivity event suppression (health, psychological support) — KORA Privacy Admin role only
- DPA signed before any data ingestion
- Methodology versioning on all scoring outputs (NOT NULL at database level)
- Audit trail from first operation (INSERT-only)
- Pre-signed time-limited report downloads

### 11.2 Privacy rules for new roles at v0.2

**Worker PIB Light:** Worker sees only their own pseudonymized PIB record via the PIB Light interface. In Foundation Light v0.1, this is demo/synthetic data. No real worker production access until Worker App is formally launched. Employer has zero access to any individual worker PIB — enforced by grant absence, not RLS.

**Partner Portal Light:** Partners see only their own profile, their own service catalog, and their own review status. Partners do not see company KORA scores, worker data, or other partners' data. Grant-based access enforced.

**Advisor Portal Light:** Advisors see only what is explicitly assigned to them by a KORA Admin or Analyst. Read-only access to assigned materials. No access to company KORA Index scores unless explicitly included in the assignment scope. Grant-based access enforced per assignment.

### 11.3 What the v0.2 privacy scope explicitly does not include

- Individual worker production authentication at scale (demo/synthetic only in v0.1)
- Worker self-service deletion or data export flows (future Ecosystem tier)
- Partner-to-company direct data sharing outside the KORA controlled interface
- Cross-border data transfer compliance beyond Italy (Italy-first deployment)

---

## 12. What Must NOT Be Built Now

### 12.1 Preserved from v0.1 (strict deferral — no exceptions)

**Live payment flows:** No FUO orchestration, KIP, partner payout, worker top-up, wallets. Requires PSD2 authorization, legal and tax advisor validation per doc 11 Section 17. None of those reviews are complete.

**Payroll-ready Welfare Statement.** Informational summary only. Not a regulatory filing, not payroll-integrated, not a tax submission artifact.

**Fiscal Guardrails enforcement.** Policy rules and guardrails are structural in the schema but inactive at Foundation Light.

**AI autonomous scoring.** AI classifies and suggests. Humans govern and approve. No exception.

**Full governance policy engine.** Budget policy rules, concentration enforcement, board audit trail at Governance tier depth — all deferred.

**KORA Link hardware integration.** No NFC, QR, or physical device integration.

**Real-time event streaming or HRIS API integrations.** Batch ingestion only.

**External API marketplace.** No public API, no third-party developer access.

**Mobile application.** Web platform only.

**Territorial intelligence aggregation.** Ecosystem tier.

**Public certification badge and profile.** Certified tier.

**Advisor certification marketplace.** Future platform.

**Advisor LMS.** Future platform.

### 12.2 Why the light ecosystem layers do not violate these limits

**Worker PIB Light** is not the full Worker App because: it uses demo/synthetic data in v0.1, individual workers do not receive production accounts, no Dynamic Impact CV, no KORA Link, no benefits marketplace, no social layer.

**Partner Onboarding Light** is not a marketplace because: no payments, no worker booking, no partner rankings, no public discovery, no partner analytics suite.

**Advisor Portal Light** is not the full governance workflow because: no certification issuance, no LMS, no public profiles, no payments, no autonomous workflow triggers.

---

## 13. MVP Success Criteria

Foundation Light MVP v0.2 is successful when:

**Technical validation:**
- One company dataset can be uploaded and processed by the AI Ingestion Assistant with accurate suggestions on a realistic dataset
- UEF records are generated, human-confirmed, and advance to scoring
- All 14 algorithm stages execute and produce methodology-versioned outputs
- Activation Safeguard runs and produces a result before every KORA Index
- KORA Index v0.1 is produced with all mandatory labels: version, calibration status, confidence, safeguard status
- Score Explainability View shows a legible plain-language explanation for any KORA Index
- Executive Cockpit renders correctly with temporal and concentration intelligence signals
- Worker PIB Light Home is demonstrable with synthetic data through the real PIB engine
- At least three partner profiles can be onboarded and linked to company programs
- At least one advisor review workflow runs end-to-end with notes and approval
- PDF report generates and downloads via pre-signed URL
- Audit trail records every operation from upload through report download
- Stress Test Scenario B reproduced within defined tolerance

**Operational validation:**
- Full end-to-end flow (data upload → AI review → analyst approval → scoring → dashboard → report) completable without developer intervention
- Demo run using synthetic Profile A data completable in under 30 minutes
- Worker PIB Light demonstrable in under 5 minutes in a pilot presentation

**Commercial validation:**
- At least one pilot company signs an engagement agreement and uploads real data
- The pilot company's decision-maker reviews the executive cockpit and report and finds it credible
- The pilot presentation includes Worker PIB Light and Future Vision Area without confusion about what is active and what is not
- At least one strong or hard validation signal produced (per doc 15 signal strength framework)

**Perception validation:**
The product must feel: credible, intelligent, platformized, ecosystem-oriented, and human-centered.
The product must not feel: consulting report software, static ESG dashboard, generic HR analytics tool.

---

## 14. Pilot Readiness Checklist

**Data and templates:**
- [ ] Sample data template ready to send to pilot companies
- [ ] Data dictionary documented
- [ ] Synthetic demo data (Profiles A–D, Workers W1–W3, Partners P1–P3, Advisor ADV-1) in development environment
- [ ] Scoring engine validated against Stress Test Scenario B

**Legal and privacy:**
- [ ] DPA draft ready for pilot company signature
- [ ] GDPR deletion procedure defined (per D-06)
- [ ] Privacy notice prepared
- [ ] Legal/privacy counsel review completed (Gate 3) — required before live data ingestion

**Methodology:**
- [ ] Methodology v0.1 seed values defined (D-21) and seeded in development
- [ ] Methodology brief prepared (plain-language)
- [ ] AI classification suggestions validated against expected pillar assignments on synthetic data

**Partner and advisor onboarding:**
- [ ] At least two demo partner profiles onboarded and reviewed
- [ ] Advisor review workflow tested end-to-end with demo assignment
- [ ] Partner data template ready (service catalog structure)

**Commercial:**
- [ ] Pilot pricing and engagement structure defined
- [ ] Pilot proposal template ready
- [ ] Executive report reviewed against doc 17 visual standards
- [ ] Demo script covering all six product groups rehearsed
- [ ] Objection handling document prepared
- [ ] Future Vision Area demo narrative prepared

**Founder Validation:**
- [ ] Founder Validation Cockpit populated with first 10–15 target companies
- [ ] 90-day validation plan Phase 1 launched
- [ ] First outreach wave initiated through warm introductions

---

## 15. Build Phasing

### Phase 0 — Architecture Review
**Objective:** Complete all five gate conditions from doc 13 Section 9. No code written until gates are passed.
**Output:** All 21 doc 13 decisions recorded. Legal/privacy review complete. Methodology numerical values defined (D-21).
**Dependency:** None — this is the starting gate.
**Risk:** Gate completion delayed by unavailability of CTO or legal counsel. Mitigation: begin founder review of doc 13 decisions immediately; identify and engage legal counsel in parallel.

### Phase 1 — Infrastructure & Data Model
**Objective:** SQL DDL generation, Supabase architecture provisioning. Identity Store (separate project), main database (gov/analytics/evidence/audit schemas), partner and advisor tables, blob storage, audit INSERT-only role.
**Output:** Database operational in development and staging. Methodology seed executed. Worker PIB Light schema operational (internal only, no external access yet).
**Dependency:** Phase 0 gates passed. D-21 values defined.
**Risk:** Pseudonymization service complexity. Mitigation: build and test pseudonymization before any UEF record creation.

### Phase 2 — Synthetic Data
**Objective:** Build and load synthetic datasets for all four company profiles, three worker profiles, three partner profiles, one advisor profile.
**Output:** Full synthetic dataset available in development. Expected scoring outputs documented per profile.
**Dependency:** Phase 1 (data model defines the format).
**Risk:** Synthetic data too clean, not exercising edge cases. Mitigation: Profile C (low activation) and Profile D (missing data) are mandatory exercises of failure conditions.

### Phase 3 — Ingestion Studio (Base)
**Objective:** Build Module B (Data Upload) — file upload, column mapping, source type classification, validation, batch status.
**Output:** A KORA Analyst can upload a CSV, map columns, and submit a batch. AI is not yet integrated.
**Dependency:** Phase 1. Phase 2 (for testing).
**Risk:** Column mapping UX complexity. Mitigation: distribute data templates early so pilot company uploads match expected structure.

### Phase 4 — AI Ingestion Assistant
**Objective:** Build Module B-AI — column recognition, source-type recognition, event-type suggestion, pillar suggestion, sensitivity detection, duplicate detection, missing-field detection, Data Readiness Score, AI Mapping Review screen, UEF Draft Preview.
**Output:** AI processes an uploaded batch and produces a reviewable classification suggestion set. Analyst can confirm, override, or reject.
**Dependency:** Phase 3.
**Risk:** AI pillar suggestions are inaccurate on novel data formats. Mitigation: validate AI suggestions against synthetic data before exposing to pilot companies. Establish acceptable accuracy threshold.

### Phase 5 — UEF + Scoring Engine
**Objective:** Build Module C (UEF Mapping) and Module D (Impact Calculation Engine) through Module F (KORA Index).
**Output:** Engine accepts an approved ingestion batch and produces all methodology-versioned scoring outputs through Stage 14. Stress Test Scenario B validated.
**Dependency:** Phase 1 (data model), Phase 2 (validation fixtures). D-21 values must be seeded.
**Risk:** Scoring engine does not reproduce Stress Test Scenario B within tolerance. Mitigation: validate before Phase 6 begins. No dashboard until engine output is confirmed correct.

### Phase 6 — Company Dashboard
**Objective:** Build Group A company-facing screens (C-A1 through C-A5) and KORA internal screens (I-A1 through I-A5).
**Output:** Executive Cockpit, Pillar Breakdown, Activation Intelligence, Financial Governance, Report Export view — all functional on Phase 5 scoring outputs.
**Dependency:** Phase 5 (scoring engine confirmed correct).
**Risk:** Dashboard designed for assumed data shapes that turn out to be wrong. Mitigation: never design a dashboard screen before the underlying data is confirmed by the scoring engine.

### Phase 7 — Explainability & Confidence Layer
**Objective:** Build Module G-EX and Module G-TI. Score Explainability View, Confidence & Missing Data View, Temporal & Activation Intelligence View.
**Output:** Company users can navigate from any score to a plain-language explanation. Concentration risks, pillar imbalance, and blind-spot detection are visible.
**Dependency:** Phase 6 (dashboard infrastructure).
**Risk:** Explainability text is too technical and not actually legible. Mitigation: test with a non-technical pilot company contact before launch.

### Phase 8 — Worker PIB Light
**Objective:** Build Group C worker-facing screens (W-C1 through W-C4) using synthetic worker profiles from Phase 2.
**Output:** Worker PIB Light experience is demonstrable in a pilot presentation. Five-pillar PIB display, verified actions timeline, privacy boundary view.
**Dependency:** Phase 5 (PIB calculated by real scoring engine, Stage 11). Phase 2 (synthetic worker profiles).
**Risk:** Worker experience visually inconsistent with company experience. Mitigation: apply doc 17 design principles consistently across all actor interfaces.

### Phase 9 — Partner Onboarding Light
**Objective:** Build Group D partner-facing and KORA-internal screens (P-D1 through P-D4). Partner profile, service catalog, company-program linkage, review status.
**Output:** Three synthetic partner profiles onboarded. Partner directory functional. Service catalog linked to company programs.
**Dependency:** Phase 1 (data model for partner tables). Independent of Phases 3–8.
**Risk:** Over-engineering partner onboarding. Mitigation: strictly follow Module P scope — no marketplace, no payments, no partner analytics.

### Phase 10 — Advisor Portal Light
**Objective:** Build Group E advisor-facing screens (A-E1 through A-E4). Advisor dashboard, assigned reviews, evidence review, review checklist.
**Output:** One end-to-end advisor review workflow demonstrated with synthetic ADV-1 assignment.
**Dependency:** Phase 1 (data model for advisor tables), Phase 9 (partner profile exists to be reviewed). Can run in parallel with Phases 8–9.
**Risk:** Advisor workflow complexity. Mitigation: strictly follow Module A-ADV scope — no certification issuance, no LMS.

### Phase 11 — Report Export
**Objective:** Build Module H (Impact Report Generator). PDF generation including Explainability section, concentration risk summary, missing dimension guidance.
**Output:** KORA Analyst triggers report generation; company user downloads PDF via pre-signed URL. Report passes doc 17 visual review.
**Dependency:** Phase 6 (dashboard data confirmed), Phase 7 (Explainability Layer outputs included in report), blob storage operational (Phase 1).
**Risk:** Report visual quality below doc 17 standards. Mitigation: review report template against doc 17 before PDF generation is built.

### Phase 12 — Founder Validation Cockpit
**Objective:** Build Module I (internal stakeholder intelligence cockpit per doc 14/15).
**Output:** Founder can manually track companies, pipeline stages, ICP fit, conviction delta, validation KPIs.
**Dependency:** Phase 1 (data model for stakeholder records). Independent of Phases 3–11.
**Risk:** Drifting toward CRM complexity. Mitigation: strictly follow doc 14 scope — no outreach automation, no email sending.

### Phase 13 — Future Vision Area
**Objective:** Build Group F — 14 static, doc 17-compliant future vision screens. Clearly labeled. Non-functional.
**Output:** Investor and pilot demos include a coherent vision layer. All screens carry "Future Vision — Not active in Foundation Light v0.1" label.
**Dependency:** None — can run in parallel with any phase. Requires doc 17 visual direction.
**Risk:** Vision screens look lower quality than functional screens, undermining demo. Mitigation: vision screens must meet the same doc 17 visual standards as functional screens — the difference is depth, not quality.

### Phase 14 — Pilot Hardening
**Objective:** End-to-end testing with all synthetic profiles, security review, DPA finalization, template preparation, objection handling documentation, demo rehearsal.
**Output:** System ready for first real company data ingestion. Pilot readiness checklist fully complete.
**Dependency:** Phases 1–13 complete.
**Risk:** Discovery of data model or scoring engine issues requiring significant changes during hardening. Mitigation: run a full synthetic pilot dry-run simulating the exact onboarding experience a real company will have.

---

## 16. Decision Gates Before Coding

Unchanged from v0.1. All five gate conditions from doc 13 Section 9 apply.

**Gate 1 — Founder review of all 21 doc 13 decisions**
**Gate 2 — CTO review of docs 10, 12, and 13**
**Gate 3 — Legal/privacy specialist review** (required before any live data ingestion)
**Gate 4 — Methodology numerical values (D-21)** (required before Phase 5 — Scoring Engine)
**Gate 5 — Tax/fiscal advisor review** (required before any fiscal classification in live client context; may run in parallel with Phases 1–5)

The addition of Worker PIB Light, Partner Onboarding Light, and Advisor Portal Light does not create new gate conditions — their schemas are part of the data model already defined in doc 12. The existing gates govern implementation.

---

## 17. Final Scope Summary

### 17.1 Functional MVP Core — runs on real data, fully operational

- Company Setup (Module A)
- Data Upload / Ingestion Studio (Module B)
- UEF Mapping Layer with human-confirmed classification (Module C)
- Impact Calculation Engine v0.1 — all 14 stages (Module D)
- Activation Safeguard v0.1 (Module E)
- KORA Index v0.1 with all mandatory labels (Module F)
- Executive Cockpit — 5 company-facing screens (Module G)
- Impact Report Generator — PDF + web (Module H)
- Founder Validation Cockpit — internal (Module I)
- Full audit trail INSERT-only from first operation
- Methodology versioning on all scoring outputs

### 17.2 Semi-functional Innovation Layer — AI assists, human approves

- AI Ingestion Assistant (Module B-AI): column recognition, source-type recognition, event-type suggestion, pillar suggestion, sensitivity detection, duplicate detection, missing-field detection, Data Readiness Score, onboarding guidance
- AI Data Readiness Summary (Screen I-B2)
- AI Mapping Review (Screen I-B3)
- UEF Draft Preview (Screen I-B4)
- Explainability & Confidence Layer (Module G-EX): Score Explainability View, Confidence & Missing Data View
- Temporal & Activation Intelligence Layer (Module G-TI): concentration risks, pillar imbalance, activation continuity, blind-spot detection

### 17.3 Light Ecosystem Layer — functional within defined scope limits

- Worker PIB Light (Module W): five-pillar PIB display, verified actions timeline, privacy view, employer visibility boundary — demonstrated with synthetic/pseudonymized demo data
- Partner Onboarding Light (Module P): partner profiles, service catalog, company-program linkage, review status, basic directory
- Advisor Portal Light (Module A-ADV): advisor dashboard, assigned reviews, evidence review, review checklists, approval/rejection states, audit trail

### 17.4 Future Vision Mockup Layer — static, clearly labeled, non-functional

All 14 Future Vision Area screens (V-01 through V-14) covering: Full Worker Dashboard, Dynamic Impact CV, KORA Link, Full Partner Portal, Full Advisor Platform, Governance Workflow Engine, KORA Certified, Territory Intelligence Map, Ecosystem Intelligence, Payments/FUO/Wallets, AI Recommendation Engine, Scenario Simulation, Cross-Company Benchmarks, KIP/Top-up Logic.

### 17.5 Deferred Layer — not built, not mocked, not referenced in demos

Live payment flows (FUO, KIP, PSP, PSD2), payroll-ready Welfare Statement, Fiscal Guardrails enforcement, full production-scale Worker App, full partner marketplace with payments and rankings, full advisor certification platform, KORA Link hardware, mobile app, real-time event streaming, HRIS API integrations, external API marketplace, territorial intelligence aggregation, public certification infrastructure, production-scale AI recommendation engine, production-scale cross-company benchmarks.

### 17.6 Why this revised scope makes KORA feel like a true platform

**Actor depth:** Even at Foundation Light, KORA serves five distinct actor types — Company (Executive and HR/ESG), Worker, Partner, Advisor, and KORA Internal. A product that serves five actors does not feel like an analytics tool. It feels like an infrastructure platform.

**Visible future architecture:** The Future Vision Area is not hidden or an afterthought. It is a dedicated navigation destination that tells an investor or pilot company: this team knows where this platform is going, and the architecture supports it.

**Human-centered design from day one:** The Worker PIB Light screen in a pilot presentation changes the entire perception of the product. Instead of "company data → company dashboard," KORA becomes "human actions → company intelligence → worker visibility." That is a platform, not a tool.

**AI as visible innovation:** The AI Ingestion Assistant's Data Readiness Score and AI Mapping Review screens communicate that KORA is not a static data-entry form. It is an intelligent system that understands data, detects problems, and guides onboarding — with human judgment always in the loop.

**Explainability as differentiation:** The Score Explainability View and the Confidence & Missing Data View are the most powerful trust-building elements in the product. They signal: KORA is not a black box. That is a platform claim, not a tool claim.

---

## 18. Next Step

### 18.1 Immediate founder actions (no further documentation needed first)

**Step 1 — Approve doc 18 v0.2 scope:** Confirm the four-layer architecture (Functional Core / Semi-functional Innovation / Light Ecosystem / Future Vision) and the boundary conditions for each layer.

**Step 2 — Review doc 13:** Go through all 21 decisions and record position (Approved / Deferred / Needs Specialist). Gate 1 prerequisite before any code.

**Step 3 — Identify CTO:** Gate 2 prerequisite. CTO must review docs 10, 12, and 13 before Phase 1 begins.

**Step 4 — Engage legal/privacy counsel:** Gate 3 prerequisite. Required before any live data ingestion.

**Step 5 — Define methodology numerical values (D-21):** Gate 4 prerequisite. Required before Phase 5 (Scoring Engine). Founder and methodology team define BCM seed values, NM parameters, Activation Safeguard thresholds, and KORA Index weight vector.

**Step 6 — Launch 90-day validation plan Phase 1 (doc 15):** No gate required. Can begin immediately.

### 18.2 Next document

**`docs/19-foundation-light-technical-implementation-plan.md`**

This document will define: detailed technical implementation plan per phase, Supabase architecture setup sequence, implementation order within each phase, testing strategy per phase, developer handoff artifacts.

**Important:** Doc 19 may be structured now, but SQL generation, migrations, Prisma models, and Supabase table creation remain blocked until the five gate conditions in doc 13 Section 9 are met and doc 18 is founder-approved.

---

*Document authored: 2026-05-17*
*Version: v0.2 — revised scope (platformized MVP)*
*Supersedes: v0.1 (conservative diagnostic-only scope)*
*Status: Pending Founder Review*
*Canonical references: docs 10, 12, 13, 14, 15, 16, 17, CLAUDE.md*
*Gate authority: doc 13 Section 9 (five gate conditions)*
*Must be approved before: any Phase 1 activity begins*
