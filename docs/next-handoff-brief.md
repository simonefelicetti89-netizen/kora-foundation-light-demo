# KORA Foundation Light — Next Handoff Brief
**Document:** `docs/next-handoff-brief.md`
**Type:** Handoff Brief — External Collaboration Reference
**Audience:** Next PM, UX/UI designers, frontend developers, full-stack developers
**Status:** v1.0 — Phase 1C-light complete
**Date:** 2026-05-18

---

## 1. Why This Demo Exists

This demo was created as a reference implementation — a functional blueprint — built to clarify KORA's product logic, role structure, privacy boundaries, intelligence loop, and demo behavior before the Next collaboration begins.

**This is not a request to replace or reproduce Next's implementation. It is a reference to reduce ambiguity and align interpretation.**

The demo was built because KORA is architecturally unusual. Without a working reference, important questions about what the employer sees, what the worker sees, how the KORA Index is structured, and how privacy is enforced are difficult to answer from documentation alone. The demo makes those answers tangible.

Next should use it as a product behavior reference — not as a design spec, not as a code base to extend, and not as a final UI system.

---

## 2. What KORA Is

KORA is a **Human Impact Intelligence Platform**. Its core positioning: **"The human layer."**

KORA transforms heterogeneous organizational data — welfare events, training completions, volunteering, collective initiatives, partner activity, HR records, ESG contributions — into structured, explainable, privacy-safe **organizational activation intelligence**.

KORA measures **organizations**, not individuals. The KORA Index is a company-level output. Individual intermediate data (PIB, IU, UEF) exists only to produce that aggregate — it is never surfaced to employer roles.

The commercial premise: companies invest in people programs and have no reliable way to measure what those investments actually produce in terms of organizational activation. KORA solves that problem. It tells companies where activation is strong, where it is weak, how balanced it is across pillars, how reliable the data behind it is, and what to do next.

---

## 3. What KORA Is Not

This section is as important as the previous one. KORA drifts easily into familiar-looking but wrong categories.

| KORA is... | KORA is NOT... |
|---|---|
| Human Impact Intelligence Platform | A generic HR dashboard |
| Organizational activation intelligence | A welfare or benefits platform |
| Privacy-first worker value layer | An employee wellbeing tracker |
| Verified impact measurement | An ESG report generator |
| Explainable, methodology-versioned scoring | A black-box AI system |
| Pilot-grade diagnostic intelligence | An employee surveillance system |
| Governance-grade audit trail | A worker ranking or gamification platform |
| Companion indicator for KORA Contribution | A social network or performance tool |

If any screen or component begins to feel like welfare management, HR tracking, employee ranking, benefits booking, a discount marketplace, or a social engagement feed — it has drifted out of KORA's identity. That drift is not a design opinion. It is a product integrity issue.

---

## 4. The Core Intelligence Loop

This is the pipeline that KORA runs on. Each stage is mandatory and non-reorderable.

```
Raw source data (HRIS, LMS, welfare provider, ESG, manual files)
  ↓
AI/rule-based ingestion mapping
  Parses uploaded files. AI assistant (BCM taxonomy classifier) suggests column
  mappings with confidence scores. Low-confidence mappings are flagged for
  human review.
  ↓
UEF draft (Unified Event Frame)
  First structured record per action. Each UEF captures: worker pseudonym,
  event type, pillar, source, date, evidence level.
  ↓
UEF review
  Human operator reviews flagged events. Approve / reject / flag.
  Only approved UEF records proceed to scoring.
  ↓
Impact Units (IU)
  IU = NM × BC × CQ × EV × CF × AGF
  Computed per event per pillar using versioned weights from methodology config.
  Anti-Gaming Factor (AGF) is mandatory. AGF = 0 disqualifies the event.
  ↓
PIB (Personal Impact Balance)
  Sum of pillar IU per worker. Mandatory intermediate layer.
  Worker-private. Never visible to employer roles.
  ↓
Company Aggregation
  Worker PIB rolls up to company level. Individual identity is dissolved
  at this stage. Aggregate-only from here forward.
  ↓
Activation Safeguard
  Mandatory governance gate. CLEAR / WARNING / FLAGGED.
  Cannot be configured or bypassed by the company.
  ↓
KORA Index + Confidence Score
  Inseparable output pair. The Index without the Confidence Score is incomplete.
  Confidence Score reflects data completeness, source quality, verification weight.
  ↓
Explainability
  Plain-language explanation of each component, data quality impact, limitations,
  next best actions. Mandatory — not optional.
  ↓
Reports / Company Workspace / My KORA
  Company-facing outputs are aggregate. Worker-facing outputs are personal and private.
```

**Nothing in this pipeline is negotiable in Foundation Light.** The stages, their order, and the mandatory outputs (PIB, Activation Safeguard, Confidence Score, calibration status, explainability) are fixed.

---

## 5. Non-Negotiable Privacy Rule

**The employer sees the organization, not the individual.**

This is not a UI hiding rule. It is an architecture rule. In the demo, it is enforced by the service layer (`RolePermissionService`, `PrivacyVisibilityService`). In production, it will be enforced by PostgreSQL grant-absence and row-level security — employer roles have no database-level read grants on individual worker data tables.

**Employer roles may see:**

- Aggregate KORA Index value
- Confidence Score (CS) — always beside the KORA Index
- Activation Safeguard status (CLEAR / WARNING / FLAGGED)
- Aggregate activation rates (overall, by department/cohort — groups ≥ 10 workers only)
- Pillar distribution (company level)
- Department cohort trends (groups ≥ 10 workers — smaller groups are suppressed)
- Financial governance indicators (Finance and Admin roles only)
- Aggregated reports with no individual identification
- KORA Contribution companion indicator (aggregate only)

**Employer roles must never see:**

- Individual UEF records
- Individual Impact Unit (IU) records
- Individual PIB (Personal Impact Balance)
- Any named or pseudonymized worker profile data
- My KORA content (timeline, CV, bookings, personal plan, opportunities)
- Dynamic Impact CV
- Booking requests or participation history
- Partner contacts
- Consent records
- Personal preferences or worker-controlled settings
- Worker timeline at event level
- Health data, psychological support details, diagnosis or therapy records
- Any group data with fewer than 10 workers (re-identification risk)

**The safe aggregation threshold is 10.** Any employer-facing segment showing data for fewer than 10 workers must be suppressed and replaced with a privacy boundary notice. This is non-configurable.

---

## 6. KORA Index Rules

These rules govern every surface that displays the KORA Index.

**Fixed structure — 10 components, no exceptions:**

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

**No 11th component may be added** without a formal methodology decision and documentation update.

**Every KORA Index display must always show:**
- KORA Index value
- Confidence Score — always beside the Index, never omitted
- Activation Safeguard status
- `methodology_version_id` (e.g., "KORA Methodology v0.1")
- `calibration_status = pre_empirical_calibration` — non-suppressible in Foundation Light
- All 10 components with values and weights
- Limitations / disclaimer statement

**KORA Contribution** is a companion indicator measuring collective and ecosystem engagement. It must be displayed in its own section, clearly labeled `is_kora_index_component: false`. It is never part of the KORA Index value. It must never be merged into the KORA Index computation, even as an additive display component.

---

## 7. AI Rules

The AI Ingestion Assistant in KORA is specifically bounded:

- **v0.1 implementation:** rule-based BCM (Base Contribution Matrix) taxonomy classifier
- **No external LLM API calls on HR or worker data** — this is a confirmed founder decision
- **What AI does:** suggests column header → pillar + event type mappings with a confidence score per mapping
- **What AI does not do:** auto-approve mappings, score workers, make event eligibility decisions
- **Human review is mandatory:** low-confidence mappings are flagged. Human operators (KORA Analyst, Company HR) approve, reject, or flag each record.
- **Only approved UEF records enter scoring.** Records not approved by a human reviewer never reach the IU computation stage.
- **AI does not score workers.** The scoring pipeline processes company aggregates — not individual worker AI assessments.

---

## 8. Current Demo Surfaces

### Company Workspace

| Screen | Route | Status | What It Demonstrates |
|---|---|---|---|
| Executive Cockpit | `/company` | Functional Core | KORA Index, Confidence Score, Activation Safeguard, pillar distribution, next actions |
| KORA Index Detail | `/company/kora-index` | Functional Core | 10-component breakdown, explainability, calibration_status, methodology version |
| AI Upload Studio | `/company/ingestion` | Functional Core | File ingestion simulation, column header detection, AI mapping suggestions |
| AI Mapping Review | `/company/ingestion/mapping-review` | Functional Core | Confidence scores per mapping, approve/reject/flag workflow |
| UEF Review | `/company/uef-review` | Functional Core | Approve/reject/flag UEF records before scoring |
| Scoring Run | `/company/scoring` | Functional Core | Scoring pipeline simulation, formula trace, output summary |
| Reports | `/company/reports` | Functional Core | 8 report type templates, role-filtered content, export preview |
| Activation & Participation | `/company/activation` | Functional Core | Aggregate activation rates, pillar distribution, department cohorts (≥10 workers) |
| KORA Contribution | `/company/contribution` | Semi-Functional Preview | Companion indicator, collective initiatives, cross-company engagement |
| Pillars & Initiatives | `/company/pillars` | Functional Core | Pillar distribution, program portfolio, collective initiatives table |
| Data & Evidence | `/company/data` | Functional Core | Source inventory, batch-level quality metadata, completeness, confidence |
| Financial Governance Light | `/company/financial` | Semi-Functional Preview | Budget allocation vs. utilization, pillar budget, cost per IU, KORA billing |

### Worker Workspace

| Screen | Route | Status | What It Demonstrates |
|---|---|---|---|
| My KORA Home | `/my-kora` | Preview | PIB Light preview, personal timeline, company aggregate snapshot, opportunities |
| Privacy & Sharing | `/my-kora/privacy` | Preview | Privacy boundary visibility, consent toggle preview, can/cannot see layout |
| Dynamic Impact CV | `/my-kora/dynamic-cv` | Preview | Verified impact items, item-level verification, worker ownership, export preview |
| Opportunities | `/my-kora/opportunities` | Skeleton | Coming in next phase |
| Bookings | `/my-kora/bookings` | Skeleton | Coming in next phase |
| Collective Impact | `/my-kora/collective` | Skeleton | Coming in next phase |

### Other

| Workspace | Route | Status | What It Demonstrates |
|---|---|---|---|
| Admin Dashboard | `/admin` | Skeleton | KORA platform operator space |
| Partner Workspace Light | `/partner` | Skeleton | Verified ecosystem actor workspace |
| Advisor Workspace Light | `/advisor` | Skeleton | Evidence review and validation |
| Future Vision | `/future-vision` | Inactive mockup | Future platform (KORA Link, wallet, marketplace) — clearly inactive |

---

## 9. What Is Real in the Demo

The following are genuine, not placeholder:

- Real Next.js 16.2.6 App Router application with TypeScript strict mode
- Real routing structure across all 11 roles and all major workspaces
- Real role and scenario switching mechanism (demo-only, but functional)
- Real synthetic seed files with scenario-aware data (13 files in `/data/synthetic/`)
- Real service layer with 17 services enforcing role and privacy checks
- Real privacy guard behavior — employer roles hit `AccessDeniedState` on My KORA routes
- Real service boundary discipline — employer-facing components never import worker-private seed files directly
- Real Activation Safeguard logic (CLEAR / WARNING / FLAGGED based on AR and MAR thresholds)
- Real methodology config at `lib/methodology-config/v0.1.ts` — no hardcoded weights anywhere in the codebase
- Real static deployment on Vercel

---

## 10. What Is Not Real Yet

The following are intentionally absent in Foundation Light:

```
✗ Production database (no SQL, no Prisma, no Supabase)
✗ Production authentication (no NextAuth, no Supabase Auth)
✗ Production backend services with DB queries
✗ Live company data or real worker data
✗ Production worker accounts with real identity
✗ Real consent management (all consent toggles are preview-only)
✗ Real booking engine (booking state machine is preview/skeleton)
✗ Payment, wallet, or checkout of any kind
✗ Partner marketplace with product listings or pricing
✗ KORA Link (NFC/QR real-time verification)
✗ Live fiscal / tax outputs
✗ Certified or empirically validated methodology
✗ PDF export (browser print CSS only, no third-party PDF)
✗ External LLM API calls on HR or worker data
```

Gate 2 (CTO architecture review) is open. SQL schema, Prisma models, and production backend are blocked until it closes.

---

## 11. How Next Should Use This Demo

**Use it as:**

- **Product behavior reference:** what each role sees, what each section contains, how data flows from one screen to the next
- **Navigation reference:** the full routing structure, how roles map to accessible routes
- **Role / permission reference:** what 11 roles exist, what each can and cannot access, how the permission matrix works in practice
- **Demo narrative reference:** the S1 → S2 story, what Meridiana Group S.r.l. represents, what the before/after activation story demonstrates
- **Privacy boundary reference:** what the architectural employer/worker separation means in terms of routes, components, and service calls
- **Functional blueprint:** a working implementation of the intelligence loop, Activation Safeguard, KORA Contribution separation, and My KORA privacy guard

**Do not treat it as:**

- Final UI design or visual system — the demo uses functional Tailwind styling, not a finalized brand
- Final brand or typographic system — unresolved
- Production code — mock services, local seed files, no DB, no auth
- Final backend architecture — service interfaces are demo-layer shapes, not production API contracts
- Certified methodology implementation — all outputs are `pre_empirical_calibration`

The demo illustrates what the product must do and what it must not do. Next has creative and architectural latitude to redesign how it looks and how the production system is built — within the structural and privacy constraints this brief defines.

---

## 12. Areas Next Should Evaluate

When reviewing the demo, Next should form opinions on the following questions:

**Company workspace:**
- Does a company user (COMPANY_ADMIN or COMPANY_HR) understand KORA's value in three minutes?
- Does the Executive Cockpit communicate the intelligence value proposition clearly?
- Is the KORA Index 10-component breakdown legible without narration?
- Is the Confidence Score visible and understandable?
- Is the Activation Safeguard prominent enough — or is it too subtle?
- Does the explainability layer feel trustworthy?
- Does any section feel like generic HR software, a welfare catalog, or a benefits platform?

**Worker workspace:**
- Is My KORA clearly worker-owned — not employer-controlled?
- Is the privacy boundary (what the employer sees vs. does not see) comprehensible and reassuring to a worker?
- Does the PIB Light preview feel like personal value — not surveillance?
- Is the Dynamic Impact CV concept understandable from the preview?

**Structure and navigation:**
- Which screens should be merged, simplified, or restructured?
- Which features belong in Future Vision vs. Foundation Light?
- What is missing in the current structure that a real buyer would need to see?

**Visual and UX direction:**
- Does the product feel like a serious intelligence platform — or does it read as a prototype?
- What needs to change to make it credible for a CHRO or CFO meeting?

---

## 13. Red Lines

The following constraints are non-negotiable in any implementation of KORA, including the Next production version:

| Rule | Why |
|---|---|
| Employer roles never see individual worker data | Core commercial trust guarantee — violation destroys worker adoption |
| No worker ranking or comparison | KORA is not a performance system — ranking creates legal and commercial liability |
| PIB is never visible to employer roles | PIB is a worker-private intermediate — exposure collapses the privacy architecture |
| KORA Index always includes Confidence Score | Inseparable outputs per doc 21b — Index without confidence is incomplete |
| Activation Safeguard cannot be bypassed | Mandatory governance gate — company cannot configure or disable it |
| KORA Contribution is a companion indicator, not a KORA Index component | Architectural rule — merging them corrupts the methodology |
| No payment, wallet, or marketplace in Foundation Light | Explicitly blocked — Gate 5 is open, no fiscal/payment execution |
| No certified or regulatory-grade claims | All Foundation Light outputs are `pre_empirical_calibration` |
| No external LLM on HR / worker data | Confirmed founder decision per doc 19 §9.2 |
| No live fiscal / tax output | Gate 5 is open — tax/fiscal advisor review required |
| No real booking engine | Booking Light is request/confirm only — no pricing, availability, or payment path |
| Future Vision clearly inactive | No active routes, data, or logic behind Future Vision screens |

---

## 14. Recommended Review Path for Next

Next should review the demo in this order, using the role and scenario switcher:

1. Set role: **COMPANY_ADMIN** — Set scenario: **S1** → `/company`
2. → `/company/kora-index` (spend time on 10-component breakdown and explainability)
3. → `/company/activation` (Activation Safeguard in WARNING state, S1 picture)
4. → `/company/contribution` (note the companion indicator framing)
5. → `/company/data` (batch-level only — note what is not shown)
6. Switch scenario to **S2** → repeat steps 1–5 to see the improvement narrative
7. Switch role: **WORKER_MY_KORA** → `/my-kora`
8. → `/my-kora/privacy` (read the can/cannot-see layout carefully)
9. → `/my-kora/dynamic-cv`
10. → `/future-vision` (note the inactive labeling)

Both S1 and S2 must be reviewed. S1 alone understates the product's ability to show improvement. S2 alone understates the baseline problem the product solves.

---

## 15. Suggested Message When Sharing the Demo

The following is a suggested short message in Italian for Simone to send to the Next team when sharing the demo link.

---

*Ciao,*

*Vi condivido il link alla demo di riferimento di KORA Foundation Light.*

*Non è un sistema in produzione e non è pensata per sostituire la vostra implementazione. È un blueprint funzionale — costruita per allinearci su struttura, flussi, ruoli, confini di privacy e significato del prodotto prima di iniziare il lavoro insieme.*

*Vi chiedo di guardarla come riferimento operativo: cosa vede ogni ruolo, come funziona il loop di intelligenza, dove sta il confine tra datore di lavoro e lavoratore, e cosa il prodotto deve comunicare in tre minuti.*

*Ci sentiamo dopo averla esplorata.*

*Grazie*

---

**Document version:** v1.0
**Date:** 2026-05-18
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN · Gate 3 OPEN · Gate 5 OPEN
**Phase status:** Phase 0–1C-light complete. Demo handoff package ready.
