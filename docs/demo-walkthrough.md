# KORA Foundation Light — Demo Walkthrough
**Document:** `docs/demo-walkthrough.md`
**Type:** Demo Interpretation Guide
**Audience:** Founder, internal reviewers, advisors, Next team, early stakeholders
**Status:** v1.0 — Phase 1C-light complete
**Date:** 2026-05-18

---

## 1. What This Demo Is

KORA Foundation Light is a synthetic-data demo application. It is a functional blueprint — not a production system.

**What it is:**
- A navigable Next.js application running entirely on local synthetic seed files
- A demonstration of the full KORA intelligence loop, from data ingestion through KORA Index output
- A proof of product logic, privacy architecture, and platform structure
- A reference implementation to reduce interpretation ambiguity before and during the Next collaboration

**What it is not:**
- Not connected to any live company data
- Not a production system or pilot deployment
- Not a certified or empirically validated methodology — all outputs carry `calibration_status: pre_empirical_calibration`
- Not a production authentication system — role switching is a demo-only mechanism
- Not backed by any SQL database, Prisma, or Supabase — all data comes from local JSON seed files
- Not a payments, wallet, marketplace, or booking engine
- Not an employee surveillance or performance management system

Every data point visible in the demo is synthetic. Every seed object carries `synthetic_demo_data: true`. Nothing shown represents a real company or a real worker.

**What the demo is designed to show:**
1. The KORA intelligence loop — raw data → ingestion → UEF → scoring → KORA Index → explainability
2. The company-facing activation intelligence layer (Executive Cockpit through Financial Governance)
3. The worker-owned personal value layer (My KORA)
4. The privacy boundary between employer and worker — architectural, not cosmetic
5. The role system across 11 demo roles

---

## 2. Recommended Review Path

The following path is designed for a first-time reviewer who wants to understand the full product in one sitting. It takes approximately 20–30 minutes with both scenarios.

**Before you start:** Use the **Role Switcher** and **Scenario Switcher** visible in the demo header.
- Set role to **COMPANY_ADMIN** for the company workspace.
- Switch to **WORKER_MY_KORA** for the My KORA section.
- Always compare **S1** (baseline) and **S2** (improved) on each screen.

---

### Step 1 — `/company` — Executive Cockpit

**What to look at:**
The main company intelligence dashboard. KORA Index value, Confidence Score, Activation Safeguard status, pillar distribution bars, and next best actions. Check both S1 and S2 to see the before/after story.

**Why it matters:**
This is the primary value screen for a CHRO, CPO, or CFO. It answers: "What is our organizational activation picture right now, how confident are we in that picture, and what should we do?"

**What it demonstrates:**
- KORA Index as a company-level output (not individual workers)
- Confidence Score always beside the Index
- Activation Safeguard (WARNING in S1 / CLEAR in S2) — the mandatory non-bypassable governance gate
- Plain-language next best actions derived from the scoring explanation

**Still demo/mock:** Navigation links to deeper screens are functional. Individual department breakdown is from synthetic data. Report download is preview-only.

---

### Step 2 — `/company/kora-index` — KORA Index Detail

**What to look at:**
The 10-component breakdown: AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS. Each component has a value, weight, and explanation. The `calibration_status: pre_empirical_calibration` label is visible and non-suppressible.

**Why it matters:**
KORA is not a black box. Every component of the index must be explainable. Reviewers and advisors must be able to trace why the score is what it is.

**What it demonstrates:**
- The fixed 10-component structure (no 11th component exists)
- Confidence Score (CS) as an integrated component, not an afterthought
- The explainability layer — weak components named, data quality noted, limitations stated
- Methodology version label (`KORA Methodology v0.1`) and calibration status label

**Still demo/mock:** Component weights are provisional v0.1. Delphi Study calibration is post-pilot. No certified or empirically validated weighting is claimed.

---

### Step 3 — `/company/activation` — Activation & Participation

**What to look at:**
Company-level activation rates: overall, by pillar, by department cohort. Continuity rate. Meaningful activation rate. Verification rate. All aggregate. No individual worker data.

**Why it matters:**
This is where the "you think your programs are working" vs "KORA shows the real picture" story becomes visible. In S1: the Operations department (40% of the workforce) is barely activated. 12% of workers generate 64% of Impact Units. The Activation Safeguard triggers WARNING.

**What it demonstrates:**
- Aggregate-only company view
- The difference between participation coverage and activation depth
- Safe aggregation threshold — groups below 10 workers are suppressed, not shown
- The Activation Safeguard in WARNING state as a governance signal, not just a badge

**Still demo/mock:** Department breakdown uses synthetic cohort data. No individual worker is identified.

---

### Step 4 — `/company/contribution` — KORA Contribution

**What to look at:**
The companion indicator panel. Contribution score, collective initiative list, cross-company initiatives, ecosystem partner count. Compare S1 (minimal contribution, planning-stage only) with S2 (active cross-company initiative, verified participations).

**Why it matters:**
KORA measures internal organizational activation (KORA Index) and external collective contribution (KORA Contribution) separately. A company can have a high KORA Index but weak external contribution, or strong community engagement with moderate internal activation. Both dimensions matter — but they must never be merged.

**What it demonstrates:**
- KORA Contribution as a companion indicator — clearly labeled `is_kora_index_component: false`
- Collective initiative data at aggregate level (no individual participant list)
- Cross-company initiative mechanics — multiple companies, partner ecosystem, territory context
- The employer privacy notice on every initiative card

**Still demo/mock:** Contribution scores are provisional. Verification status uses pre-defined synthetic states. No individual participant is ever shown.

---

### Step 5 — `/company/pillars` — Pillars & Initiatives

**What to look at:**
Pillar distribution chart across all 5 KORA pillars (LIFE, GROWTH, CONNECTION, IMPACT, LEGACY). Program portfolio table. Collective initiatives table with verification and status.

**Why it matters:**
The five pillars are the grammar of KORA. Every event, program, and initiative maps to exactly one pillar. A healthy KORA Index requires meaningful presence across multiple pillars — not over-concentration in one. The S1 state shows LIFE and GROWTH dominating; CONNECTION and LEGACY are weak.

**What it demonstrates:**
- Pillar architecture as the structural basis of activation intelligence
- Program portfolio governance (budget, participation rate, status, source type)
- The difference between pillar breadth (how many pillars are represented) and pillar balance (how evenly IU is distributed)
- Aggregate participation rates per scenario — no individual worker activity
- **Initiative Studio (Foundation Light Preview):** KORA is not only diagnostic — it is an activation orchestration layer. The Initiative Studio preview shows how companies can create, propose, join and co-fund initiatives that KORA validates and measures. Four example initiative proposals illustrate the additionality classification: mandatory legal minimum (low activation value), beyond-minimum internal initiative, strategic company initiative, and collective verified initiative.

**Additionality note:** Mandatory legal minimum activities receive low or zero activation value. KORA rewards additionality, verified activation and distributed participation — not mere compliance.

**Still demo/mock:** Participation rates are scenario estimates, clearly labeled. Budget figures are informational only. Initiative Studio is a preview — no initiative is submitted, approved, funded or activated from the demo screen.

---

### Step 6 — `/company/data` — Data & Evidence

**What to look at:**
Source inventory table: one row per data source (HRIS, LMS, welfare provider, ESG, partner events, manual upload). Completeness bars, mapping confidence, evidence attached percentage, pending review count, batch status.

**Why it matters:**
The Confidence Score is only as good as the data behind it. This screen shows where the data is strong (LMS training: high completeness, high mapping confidence) and where it is weak (manual upload: low completeness, partial verification). The reviewer should understand that data quality directly determines the Confidence Score.

**What it demonstrates:**
- Batch-level metadata only — no raw files, no individual UEF records
- Completeness, mapping confidence, and evidence attachment as the three quality dimensions
- The pipeline from ingested source → quality assessment → scoring eligibility
- Pending review count as a governance signal — records awaiting human validation

**Still demo/mock:** All batch data is synthetic. No actual files were ingested. The `ingestion_date` values are illustrative.

---

### Step 7 — `/company/financial` — Financial Governance Light

**What to look at:**
Budget allocated vs. budget used vs. committed vs. residual. Utilization rate bar. Pillar budget breakdown. Cost per IU indicator. KORA billing summary.

**Why it matters:**
A CFO or Finance Director needs to see activation intelligence next to budget utilization — not in a separate system. The question is not just "how much did we spend" but "what activation return did we get per euro of investment." Cost per IU is a directional indicator, not a certified financial metric.

**What it demonstrates:**
- Financial governance as a read-only intelligence layer, not a payment or settlement system
- Budget allocation by pillar — where the investment is concentrated vs. where activation is happening
- Cost per IU as a crude indicator of investment efficiency (informational only)
- Role gating: Finance and Admin roles only — Company HR and ESG cannot see this section

**Still demo/mock:** Budget figures are informational only. KORA does not handle fund custody, payment execution, or financial settlement. No tax advice. No fiscal conclusion. Financial data does not feed the KORA Index computation.

---

### Step 8 — `/my-kora` — My KORA Home

**Switch role to WORKER_MY_KORA before entering this section.**

**What to look at:**
The non-suppressible worker-private banner ("This space belongs to the worker"). PIB Light preview card (Personal Impact Balance) with the explicit disclaimer that it is not a performance score and is not visible to the employer. Five pillar distribution bars. Personal timeline with category-level synthetic events. Company KORA snapshot showing only aggregate figures. Opportunities preview.

**Why it matters:**
This is the most important section for understanding KORA's commercial model. KORA sells to companies — but KORA is only commercially sustainable if workers trust it and use it. My KORA gives workers genuine personal value from their own participation data. Employers see nothing from this layer. The separation is architectural.

**What it demonstrates:**
- The worker value loop — participation → personal timeline → impact balance → personal CV
- PIB (Personal Impact Balance) as a worker-private intermediate — never employer-visible
- Scenario awareness — S2 shows a richer timeline and broader pillar engagement than S1
- Company KORA snapshot visible to the worker (aggregate only — the same aggregate their employer sees)
- Opportunities preview as the connection between company programs and worker discovery

**Still demo/mock:** This is a Foundation Light preview. No production accounts. No real consent. Personal data is synthetic. The persona shown ("Persona A — Operations / Plant Bergamo") is a synthetic construct.

---

### Step 9 — `/my-kora/privacy` — Privacy & Sharing

**What to look at:**
Two-column layout: what the company can see (aggregate KORA Index, activation rates, pillar distribution) and what the company cannot see (individual PIB, timeline, Dynamic CV, bookings, health data, small groups). Consent toggle panel — all toggles are disabled and labeled "preview only."

**Why it matters:**
Privacy is not buried in legal text in KORA — it is a product surface. Workers see exactly what their employer can and cannot access. This screen is the trust anchor of the worker value proposition.

**What it demonstrates:**
- Privacy as a visible, comprehensible product layer
- The precise boundary between company visibility and worker privacy
- Consent as a worker-controlled mechanism (not employer-defined)
- The safe aggregation threshold — groups below 10 are suppressed

**Still demo/mock:** No real consent action exists. All toggles are non-functional in Foundation Light. `delete_request: preview_only`. `export_request: preview_only`.

---

### Step 10 — `/my-kora/dynamic-cv` — Dynamic Impact CV

**What to look at:**
Six synthetic CV items with pillar badge, verification status (verified / partial / self-declared), source category, and shareability flag. Items with partial verification are marked not-yet-shareable. The disclaimer states item-level verification only. The export button is disabled and labeled "Preview only."

**Why it matters:**
Dynamic Impact CV is what makes worker adoption sustainable. Workers accumulate verified participation records — training completions, community contributions, mentoring sessions — that they can share with future employers or partners at their own discretion. The employer never sees this CV.

**What it demonstrates:**
- Item-level verification logic (verified vs. partial vs. self-declared)
- Worker ownership — "only you decide what to export or share"
- The connection between UEF verification and CV shareability
- No automatic certification — every claim is bounded by item-level verification status

**Still demo/mock:** No PDF export. No real external sharing. No third-party certification. Export function is preview-only.

---

### Step 11 — `/future-vision` — Future Vision

**What to look at:**
The Future Vision section is clearly labeled "Future Vision / Not Active in Foundation Light." No data, no interactive logic.

**Why it matters:**
Future Vision screens show where KORA is going — KORA Link (NFC/QR participation verification), worker wallet, partner marketplace, advanced ecosystem features. They must be visible for investor and stakeholder conversations, but must never be mistaken for active Foundation Light features.

**What it demonstrates:**
- Platform ambition beyond Foundation Light
- Clear temporal labeling — inactive, not available, not promised

**Still demo/mock:** Everything here is a static mockup. No operational logic of any kind.

---

## 3. Scenario Switcher

The scenario switcher in the demo header toggles between two precomputed states of the same company: Meridiana Group S.r.l.

### Scenario S1 — Baseline (WARNING state)

| Indicator | Value |
|---|---|
| KORA Index | 47 |
| Confidence Score | 60% |
| Activation Safeguard | **WARNING** |
| Activation Rate (AR) | 0.38 |
| Meaningful Activation Rate (MAR) | 0.22 |
| Dominant issue | Participation concentration — top 12% generating ~64% of IU. Operations under-activated. CONNECTION and LEGACY pillars weak. Low continuity. |

**S1 narrative:** "You run programs and you spend. KORA shows the real picture: most of the workforce is invisible. A small minority carries the weight. The data has gaps. The Activation Safeguard flags this — not as a failure, but as a starting point."

### Scenario S2 — Improved (CLEAR state)

| Indicator | Value |
|---|---|
| KORA Index | 64 |
| Confidence Score | 72% |
| Activation Safeguard | **CLEAR** |
| Activation Rate (AR) | 0.52 |
| Meaningful Activation Rate (MAR) | 0.38 |
| Improvement drivers | Broader participation across Operations. Improved continuity. A cross-company collective initiative verified. Better source coverage (more evidence attached). Higher mapping confidence. |

**S2 narrative:** "After acting on KORA's next best actions: more workers are activating, more pillars are covered, the data is better quality, and the Activation Safeguard clears. The KORA Contribution indicator shows a verified cross-company initiative that didn't exist in S1."

**Important:** The scenario switcher is a demo mechanism — it swaps between two precomputed seed states. It is not a live simulation engine. It does not recompute the KORA Index on the fly. It shows what the company looks like in two different organizational moments.

---

## 4. Company Executive Cockpit

The Executive Cockpit is the primary screen for any company-facing role. It is designed for a CHRO, CPO, CFO, or CEO who needs to understand the organization's activation picture in under three minutes.

The reviewer should come away understanding:

- **KORA Index** — a company-level composite score (0–100). Not an average of individuals. Not a KPI. A structured activation intelligence output based on 10 weighted components.
- **Confidence Score** — always displayed beside the KORA Index. Tells you how much to trust the score: how complete the data is, how high the verification rate is, how strong the source coverage is. A KORA Index without its Confidence Score is incomplete.
- **Activation Safeguard** — the mandatory governance gate. CLEAR: activation is broadly sufficient. WARNING: activation is uneven or below meaningful thresholds. FLAGGED: activation is critically low or concentrated. Companies cannot configure or disable this.
- **Pillar distribution** — where the organization's activation energy actually lives across LIFE, GROWTH, CONNECTION, IMPACT, LEGACY.
- **10-component breakdown** — the transparent derivation of the KORA Index. Each component named, valued, and explained.
- **Next best actions** — derived from explainability. Specific, actionable steps the company can take to improve the Index in the next period.

**Key message:** "KORA shows where the organization is activating, where it is unbalanced, how reliable the data is, and what to do next."

---

## 5. KORA Index Detail

The KORA Index has **exactly 10 components**. No more, no fewer.

| Code | Name |
|---|---|
| AR | Activation Rate |
| MAR | Meaningful Activation Rate |
| NI | Normalized Intensity |
| WB | Worker Balance |
| PC | Pillar Coverage |
| PB | Pillar Balance |
| EQ | Equity |
| VR | Verification Rate |
| CO | Continuity |
| CS | Confidence Score |

These are fixed. Methodology v0.1 applies equal weights (0.10 × 10 components). Weights will be re-calibrated after Delphi Study and empirical pilot.

**KORA Contribution is not part of the KORA Index.** It is a companion indicator displayed separately. It has never been, and must never be, an 11th component.

**Every KORA Index surface always shows:**
- The Index value
- The Confidence Score
- The Activation Safeguard status
- The methodology version (`KORA Methodology v0.1`)
- The calibration status (`pre_empirical_calibration`)
- All 10 components with values and weights
- A limitations statement

These are non-suppressible. They are architectural requirements, not optional UX choices.

---

## 6. Activation & Participation

The Activation section shows aggregate company-level activation intelligence. The reviewer should understand:

- **Activation Rate (AR):** share of the eligible workforce with at least one approved IU in the period
- **Meaningful Activation Rate (MAR):** share of the workforce with IU above the materiality threshold — i.e., genuinely engaged, not just a single event
- **Continuity (CO):** share of workers who were active in two or more consecutive periods — sustained engagement, not one-time participation
- **Verification Rate (VR):** share of IU backed by verified or partially verified evidence — data quality as an activation quality signal
- **Pillar distribution:** where activation energy is actually concentrated — which pillars are active and which are empty

Nothing here identifies an individual worker. Department-level breakdowns are shown only when a group exceeds 10 workers (the safe aggregation threshold). Smaller groups are suppressed. No ranking. No worker comparison.

---

## 7. KORA Contribution

KORA Contribution is a companion indicator measuring verified collective engagement beyond the company perimeter — participation in collective initiatives, cross-company programs, and ecosystem partnerships.

The reviewer should understand:

- Contribution score: 0–100, separate from the KORA Index
- Collective initiatives: verified events involving one or more partner organizations and/or multiple companies
- Cross-company initiatives: initiatives where workers from multiple companies participate together
- Ecosystem partners: verified external organizations (welfare providers, social enterprises, NGOs, training bodies) with whom the company has active engagement

**KORA Contribution complements the KORA Index. It is not a KORA Index component.**

There are no rewards. No ranking. No individual participant list. No marketplace. No booking engine. Participation counts are aggregate. Initiative records carry a mandatory employer privacy notice.

---

## 8. Pillars & Initiatives

The five KORA pillars are the structural grammar of every activation event in KORA. Every UEF record maps to exactly one pillar.

| Pillar | Domain |
|---|---|
| LIFE | Health, wellbeing, prevention, psychological support, physical activity, safety-related wellbeing |
| GROWTH | Learning, skills, professional development, certifications, digital upskilling |
| CONNECTION | Mentoring, peer support, collaboration, internal communities, team cohesion |
| IMPACT | Volunteering, social projects, community support, environmental initiatives |
| LEGACY | Knowledge transfer, senior-junior mentoring, organizational memory, durable practices |

The Pillars & Initiatives screen shows the program portfolio and collective initiative table as a governance and intelligence view — which programs are active, what their expected participation looks like, which pillars they cover. This is not a welfare marketplace. It is not a booking engine. It is an organizational intelligence view of what programs exist and how they are performing.

---

## 9. Data & Evidence

This page shows batch-level source metadata — one row per data source batch per scenario.

**This page shows batch-level metadata only. It does not expose individual UEF records.**

The reviewer should understand:
- **Completeness:** what share of expected rows were successfully mapped and validated
- **Mapping confidence:** how confident the AI mapping assistant was in assigning events to the BCM taxonomy (pillar + event type)
- **Evidence attached:** what share of events have supporting evidence documents attached
- **Pending review:** events flagged for human review before they can enter scoring

No raw file contents are shown. No worker pseudonym IDs. No individual event details. The Data & Evidence view is for data quality governance — understanding the reliability of the inputs to the KORA Index computation.

---

## 10. Financial Governance Light

Financial Governance Light shows budget allocation vs. budget utilization next to the activation intelligence it produces.

**Budget figures are informational only. KORA does not handle fund custody, payment execution, or financial settlement.**

This section is gated to Finance and Admin roles only. Company HR and ESG roles do not see it.

The reviewer should understand:
- Budget allocated per pillar vs. IU generated per pillar — investment is not the same as activation
- Utilization rate: S1 (61% utilized) vs. S2 (76% utilized) — improvement in fiscal discipline
- Cost per IU: directional indicator only — not a certified financial metric
- KORA billing: separate ledger from the company's welfare budget

Financial data does not feed the KORA Index computation. No tax advice. No fiscal output. No payments.

---

## 11. My KORA Worker Preview

My KORA is the worker value layer. It is worker-owned and employer-private.

**The employer sees the organization. The worker owns the personal layer.**

The reviewer switching to `WORKER_MY_KORA` role should understand:

- **PIB Light preview:** the worker's Personal Impact Balance — a private aggregate of their own activation events across the five pillars. Not a performance score. Not visible to the employer. Not used for hiring, firing, or appraisal.
- **Personal timeline:** category-level event history (e.g., "Digital skills training", "Community volunteering"). No health details. No clinical records. No therapy notes.
- **Company KORA snapshot:** aggregate company data visible to the worker — the same figures the employer sees, not more. This transparency reinforces trust.
- **Opportunities preview:** discovery of programs and initiatives relevant to the worker's context and pillars.
- **Dynamic Impact CV preview:** verified career and impact items the worker can optionally share.

This is a Foundation Light preview. It demonstrates the worker value proposition and the My KORA architecture — not the full production worker experience.

---

## 12. Privacy & Sharing

The privacy boundary between employer and worker is architectural — not a UI-layer toggle.

**Company can see:**
- Aggregate KORA Index and Confidence Score
- Activation rates across the eligible workforce
- Pillar distribution (company level)
- Department/cohort activation (groups ≥ 10 workers only)
- Financial governance indicators (Finance role only)
- Aggregated reports with no individual identification

**Company cannot see:**
- Individual UEF records or IU records
- Individual PIB scores
- Worker personal timeline
- My KORA content of any kind
- Dynamic Impact CV
- Booking requests or participation history
- Partner contacts
- Consent records
- Personal plan or personal preferences
- Any data from groups smaller than 10 workers (re-identification risk)
- Health data, psychological support details, diagnosis or therapist notes

In the demo, this boundary is enforced by `RolePermissionService` and `PrivacyVisibilityService`. In production, it will be enforced by PostgreSQL grant-absence and row-level security — not by UI hiding alone.

---

## 13. Dynamic Impact CV

Dynamic Impact CV is the worker's portable, verified impact portfolio.

- Item-level verification: each CV item carries its own verification status (verified / partial / self-declared)
- Worker-controlled: the worker decides what to export and what to share with external parties
- Not automatically certified: KORA does not certify professional qualifications — it records and verifies participation events
- Export is preview-only in Foundation Light: no PDF export, no external sharing, no third-party certification

---

## 14. Future Vision

The Future Vision section is clearly labeled and inactive. No data, no logic, no active functionality behind it.

Future Vision areas include (for investor/stakeholder conversations only):

- **KORA Link:** NFC/QR real-time participation verification — not operational in Foundation Light
- **Worker wallet:** not implemented, not planned for Foundation Light
- **Partner marketplace:** not implemented — partners are ecosystem actors, not commerce vendors
- **Production worker accounts:** not implemented — Gate 3 (legal/privacy) is open
- **Payment and fiscal execution:** not implemented — Gate 5 (tax/fiscal) is open

Every Future Vision screen carries a non-suppressible label: "Future Vision / Not Active in Foundation Light."

---

## 15. What Not to Judge Yet

The following are not ready for final evaluation in Foundation Light:

- Final UI polish and brand system — the demo uses functional styling, not final design
- Final typographic and visual identity — unresolved until Next engagement
- Production backend architecture — Gate 2 (CTO review) is open; SQL/schema is blocked
- Real authentication flow — Gate 3 is open; no production auth exists
- Production database — no SQL, no Prisma, no Supabase
- Empirical calibration of methodology weights — Delphi Study is post-pilot
- Legal / fiscal / regulatory output — Gate 5 is open
- Production worker consent infrastructure — Gate 3 is open
- Full My KORA feature depth — the current implementation is a preview layer, not the full product

---

## 16. What to Judge Now

The following are ready for evaluation:

- **Product logic:** does the intelligence loop make sense? Does KORA's answer to "what does your workforce actually do with the programs you invest in?" feel compelling?
- **Section structure:** is the navigation and section grouping coherent for a company-facing user?
- **Intelligence loop:** can a reviewer follow the path from "data source" to "KORA Index" to "next best action" without confusion?
- **Privacy boundaries:** are the employer/worker boundaries clear and reassuring?
- **Clarity of KORA Index:** is the 10-component breakdown understandable without narration?
- **Confidence/Safeguard visibility:** are the Confidence Score and Activation Safeguard prominent enough?
- **Employer vs. worker separation:** does the role switch between COMPANY_ADMIN and WORKER_MY_KORA make the separation obvious?
- **Identity coherence:** does KORA feel like a Human Impact Intelligence Platform — or does any section drift toward HR tool, welfare marketplace, or surveillance system?

---

## 17. Demo Status

```
demo_type:            synthetic_data_foundation_light
data_source:          local JSON seed files (/data/synthetic/)
service_layer:        mock services (no live DB)
deployment:           static Vercel deployment
auth:                 demo role switcher (no production auth)
database:             none (SQL blocked — Gate 2 open)
live_company_data:    none
real_worker_data:     none
calibration_status:   pre_empirical_calibration
methodology_version:  KORA Methodology v0.1
gate_status:          Gate 1 CLOSED · Gate 2 OPEN · Gate 3 OPEN · Gate 5 OPEN
phase_status:         Phase 0–1C-light complete
```

---

**Document version:** v1.0
**Date:** 2026-05-18
**Phase status:** Phase 0 scaffold + Phase 1A Core Employer UI + Phase 1B Company secondary screens + Phase 1C-light My KORA preview — all closed.
