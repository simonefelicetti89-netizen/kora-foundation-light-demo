# Foundation Light Demo Build Cutline — v1.0
**Document:** `docs/22A-foundation-light-demo-build-cutline.md`
**Status:** Operational — Active Build Reference
**Gate dependency:** Gate 1 CLOSED. Gate 2 (CTO) required before SQL generation (doc 22).

---

## 1. Document Purpose

This document is a build cutline. It is not a methodology document. It is not a technical schema. It is not a product vision.

Its sole purpose is to define exactly what must be built, what must be partially built, what must appear as mockup only, and what must not be built at all — in order to demo KORA Foundation Light convincingly.

This document exists to stop scope creep before the first build begins.

**Governing principle:**

> Foundation Light must demonstrate the intelligence loop, not the full ecosystem.

Doc 22 (SQL schema specification) is reserved for after Gate 2 (CTO review). This document is named 22A to avoid collision with that reserved slot.

---

## 2. Demo Build Principle

KORA Foundation Light must show the full logic of the platform with limited functional depth:

**ingestion → UEF review → IU/PIB computation → company aggregation → Activation Safeguard → KORA Index → explainability → confidence → founder validation**

The demo must make KORA understandable, credible, and sellable.

It does not need to make KORA complete.

A buyer who sees Foundation Light should understand: what KORA measures, why it matters, how the score is produced, and why the methodology is trustworthy despite being pre-calibration. They do not need to see partner marketplaces, worker wallets, territorial maps, or certified evidence packages.

---

## 3. Build Categories

| Category | Label | Standard |
|---|---|---|
| A | Functional Core | Real app logic. Works with synthetic/demo data. |
| B | Semi-Functional Preview | Looks real. Partial data logic. Not production-complete. |
| C | Static / Mockup Future Vision | UI or narrative only. Clearly labeled as future. |
| D | Explicitly Excluded | Must not be built now under any circumstances. |

---

## 4. Functional Core — Must Build

These modules must work with real application logic and synthetic demo data.

### 4.1 Company Setup
- Company record with name, sector, territory, headcount
- Program record attached to company
- Reporting period definition
- Methodology version attached at company level
- Minimum required: one fully configured synthetic company

### 4.2 Synthetic Demo Dataset
- At least one baseline synthetic company
- 200–300 synthetic workers
- Minimum 5 departments, 2–3 sites
- Events distributed across all 5 pillars (LIFE, GROWTH, CONNECTION, IMPACT, LEGACY)
- Intentional participation imbalance — not all workers active across all pillars
- At least 4 source types (HR system, welfare provider, training platform, manual submission)
- At least 8–12 distinct event types
- Mix of verified, partially verified, and self-declared events
- One scenario with low AR/MAR to trigger Activation Safeguard WARNING or FLAGGED
- One scenario with balanced activation to show positive KORA Index

Worker records must be synthetic or pseudonymized. No real pilot employee data in demo build.

### 4.3 AI Ingestion Assistant
- Upload simulation or file-based flow (real upload not required at demo)
- Column header mapping suggestions driven by BCM taxonomy rule-based classifier
- Confidence score per mapping suggestion
- Human review flags for low-confidence or ambiguous mappings
- Approve / reject / remap flow
- No external LLM API calls on any worker or HR data
- AI logic is rule-based / taxonomy-based (BCM taxonomy) per doc 19 Section 9.2

### 4.4 UEF Review
- Event table showing mapped records from ingestion
- Per-event: pillar assignment, source type, evidence level, privacy sensitivity, mapping confidence, review status
- Approve / reject / flag controls
- Batch approval for high-confidence mappings
- Rejected events excluded from scoring
- Status must progress to `approved` before entering IU computation

### 4.5 Scoring Engine v0.1
- Implement provisional methodology per doc 21 Section 5 and doc 21b
- Every computation tagged with `methodology_version_id`
- Every output tagged with `calibration_status = 'pre_empirical_calibration'`
- Weights must be versioned config values — not hardcoded constants
- Equal weight vector (0.10 × 10) as provisional v0.1 baseline
- Compute in order: IU per event → PIB per worker → Company Aggregation → Activation Safeguard → 10-component KORA Index → Confidence Score
- Activation Safeguard thresholds from doc 21 Section 5.7: CLEAR / WARNING / FLAGGED
- KORA Index blocked or qualified if Safeguard status = FLAGGED

### 4.6 Executive Cockpit
- KORA Index value with calibration status label
- Confidence Score (always shown alongside KORA Index — inseparable)
- Activation Safeguard status badge
- 10-component breakdown with individual values and weights
- Pillar distribution chart
- Participation distribution across workforce
- Key warnings (low activation, low verification rate, missing pillars)
- Data quality / completeness indicators
- Next best actions panel

### 4.7 Explainability Layer
- Plain-language explanation of why the KORA Index is the value shown
- Per-component explanation
- Data quality impact on each component
- Methodology version displayed on every output
- Pre-calibration disclosure visible on every score surface
- No output may be presented without its calibration status label

### 4.8 Founder Validation Cockpit
- Company/contact records
- Contact status (not contacted / contacted / meeting set / demo done / pilot interest confirmed)
- Stakeholder type
- Perceived pain (free text or structured)
- Pilot interest (yes / no / exploring)
- Willingness to pay indicator
- Estimated pilot value
- Objections log
- Follow-up status
- Validation KPI summary: pipeline count, meetings, pilot commitments, revenue signals

---

## 5. Semi-Functional Preview — Build Lightly

These modules must look real and use partial data logic. They are not production-complete.

### 5.1 Worker PIB Light
- Demo mode only — synthetic or pseudonymized profiles
- No real pilot-worker production accounts
- No employer access to individual PIB under any path
- Shows what a worker might see of their own PIB in a future worker-facing product
- Read-only display against synthetic data

### 5.2 Partner Onboarding Light
- Partner catalog with name, service type, pillar mapping
- Eligibility confidence per service
- Onboarding status
- No marketplace logic, no booking system, no partner payouts

### 5.3 Advisor Portal Light
- Advisor review records with status and evidence references
- Eligibility confidence assigned by advisor
- No advisor account/login system for demo
- No certification academy or LMS

### 5.4 Financial Governance Light
- Budget declared by program
- Spend distribution by pillar or department
- Cost per IU shown as dashboard-only indicator
- No fund custody, no payment execution, no FUO movement through KORA

### 5.5 Fiscal Classification Map
- Informational display only
- Italy-first taxonomy for demo
- Eligibility confidence visible per service/event type
- Labeled as indicative — no tax advice, no live fiscal guardrails enforcement

---

## 6. Static / Mockup Future Vision

These may appear visually in the demo only if clearly labeled **"Future Vision / Not Active in Foundation Light."**

- KORA Certified (certified evidence package, certified badge, CSRD/ESRS appendix)
- KORA Link (hardware integration, NFC/QR real-time verification)
- KORA Impact Pledge (territorial pledge mechanism — not KORA Impact Points, not worker rewards)
- KORA Value Chain active calculation
- Advanced KORA Contribution mechanics
- Worker top-up and worker wallet
- Territorial activation maps
- Advisor certification academy
- Partner marketplace and booking engine
- Production API integrations
- Benchmarking marketplace
- Certified public profile
- Regulatory-grade submission packages

No functional code, active runtime logic, or activated SQL-backed feature may back these mockup areas. Future structural tables may exist only if already explicitly defined in doc 12 and must remain inactive, unpopulated, or status = 'not_calculated'.

---

## 7. Explicitly Excluded From Foundation Light Demo Build

The following must not be built now. These are hard exclusions.

**Payment and financial execution:**
- Payment flows of any kind
- Wallet (worker or company)
- KIP / KORA Impact Pledge execution
- Worker reward or points redemption logic
- Partner payouts
- FUO movement through KORA
- PSP integration

**Worker data and privacy violations:**
- Real worker accounts for actual pilot employees
- Employer access to individual UEF records
- Employer access to individual IU records
- Employer access to individual PIB records
- Employer access to worker_profiles
- Any individual-level scoring visible to employer roles

**Live data and external integrations:**
- Live HR system data ingestion
- External LLM processing of worker or HR data
- KORA Link hardware integration
- Real-time NFC/QR verification
- Production API integrations with third-party systems

**Regulatory and fiscal execution:**
- Fiscal guardrails enforcement
- Tax-advice outputs
- Certified methodology claims
- Empirically calibrated score claims

**Future ecosystem:**
- Booking engine
- Advisor certification LMS
- Partner marketplace
- Territorial maps (beyond static mockup)
- Worker dashboard (beyond PIB Light demo)

---

## 8. Required Demo Narrative Flow

The demo must follow this sequence. Steps may not be reordered without explicit decision.

1. **Company profile** — who they are, what programs they run, what period is being analyzed
2. **Dataset preview** — simulated data sources, volume, coverage gaps
3. **AI Ingestion** — mapping suggestions, confidence flags, human review step
4. **UEF Review** — approved events entering the pipeline
5. **Scoring pipeline** — IU computation, PIB aggregation, company rollup (explained, not black-box)
6. **Company intelligence** — participation rates, pillar distribution, department breakdown
7. **Activation Safeguard** — status, what it means, why it matters
8. **KORA Index v3** — component breakdown, value, calibration status
9. **Explainability and Confidence** — why this score, what limits it, what improves it
10. **Next actions** — what the company should do to improve their KORA Index
11. **Founder Validation Cockpit** — market validation pipeline, pilot interest signals

---

## 9. Data Requirements

| Dimension | Minimum Requirement |
|---|---|
| Companies | 1 baseline (demo company A); optionally 3–4 comparison profiles |
| Workers | 200–300 synthetic workers |
| Departments | 5 minimum |
| Sites | 2–3 minimum |
| Pillars covered | All 5 (LIFE, GROWTH, CONNECTION, IMPACT, LEGACY) |
| Event types | 8–12 distinct types |
| Source types | 4 (e.g. HR system, welfare provider, training platform, manual upload) |
| Verification mix | Verified / partially verified / self-declared |
| Participation | Intentional imbalance — not all workers active in all pillars |
| Activation Safeguard scenario | One low-activation subgroup to trigger WARNING or FLAGGED status |
| Improvement scenario | One balanced scenario showing CLEAR status and stronger KORA Index |

All worker records must be synthetic or pseudonymized. No real personal data in the demo dataset.

---

## 10. Methodology Display Rules

Every score shown in the demo must display:

- `methodology_version_id` — identifies which version produced this output
- `calibration_status = pre_empirical_calibration` — visible, non-suppressible
- `Confidence Score` — always shown alongside KORA Index, never omitted
- Data completeness indicator — what percentage of expected data was available
- Limitations / disclaimer — what the score does and does not claim
- Component breakdown — how each of the 10 components contributed

**No score may be presented as scientifically validated, empirically calibrated, actuarially certified, or regulatory-grade.**

KORA Foundation Light produces pilot-grade diagnostic intelligence. That is its accurate and commercially sufficient positioning.

---

## 11. Code Safety Rules

These rules apply to every developer working on Foundation Light.

1. No hardcoded methodology weights. All weights read from versioned config (`gov.kora_index_weight_versions`).
2. No direct employer role queries to `analytics.uef_records`, `analytics.impact_units`, `analytics.pib_records`, or `analytics.worker_profiles`. Grant absence enforces this — RLS alone is insufficient.
3. Synthetic demo data must not be loadable into a production environment. Separate seed scripts, separate flags.
4. No future-feature table (KIP, KORA Link, KORA Value Chain active, CEF) may be created or activated unless explicitly required by doc 18 or doc 20.
5. `gov.kip_records` is not created in the Foundation Light schema. KIP (KORA Impact Pledge) is future scope. Do not create it for doc 22.
6. Appendix B concepts (CEF, Sector Friction Index, Territorial Access Index, advanced Contribution mechanics) are future-only unless explicitly listed in doc 18/doc 20.
7. `calibration_status` is NOT NULL on all scoring outputs. It may not be hidden, toggled off, or made optional in any UI or API response.

---

## 12. Minimum Acceptance Criteria

The demo is acceptable only if it can show all of the following without breaking, mocking, or skipping:

| # | Criterion |
|---|---|
| 1 | Data ingestion / mapping concept (AI Ingestion Assistant) |
| 2 | UEF normalization concept (event → approved UEF record) |
| 3 | Scoring from event to IU (at least one walkable example) |
| 4 | PIB as internal intermediate layer (not employer-visible) |
| 5 | Company-level aggregation from worker-level data |
| 6 | Activation Safeguard affecting score interpretation |
| 7 | KORA Index v3 — all 10 components visible with values |
| 8 | Confidence Score displayed alongside KORA Index |
| 9 | Explainability (plain-language reason for the score) |
| 10 | Privacy boundary (employer cannot see individual records — explained) |
| 11 | Founder Validation Cockpit with at least mock-populated pipeline |

If any of these eleven criteria cannot be demonstrated, the demo is not ready for external use.

---

## 13. Non-Goals

This document does not solve and does not attempt to solve:

- SQL generation (blocked until Gate 2 — see doc 22 when Gate 2 is passed)
- Live data privacy review (Gate 3 — legal counsel)
- Legal / tax validation (Gate 3 and Gate 5)
- Empirical calibration (Delphi Study — post-pilot)
- Production infrastructure design
- Investor-grade financial projections
- Partner ecosystem activation
- Certified methodology claims

---

## 14. Final Build Decision

> Proceed only with Foundation Light Demo Build after this cutline is accepted.
> Do not expand scope.
> Do not add modules.
> Do not implement future concepts.
> The goal is demo credibility, not platform completeness.

Any scope addition after this cutline is accepted requires an explicit founder decision and a written amendment to this document.

---

**Document version:** v1.0
**Date:** 2026-05-17
**Gate status at creation:** Gate 1 CLOSED / Gate 2 OPEN (blocks SQL) / Gates 3, 5 OPEN
**Next document:** `docs/22-foundation-light-sql-schema-specification.md` — blocked until Gate 2 (CTO review) is passed
