# Code Readiness Audit & Canonical Document Map — v1.0
**Document:** `docs/23-code-readiness-audit-and-canonical-doc-map.md`
**Audit type:** Pre-code implementation readiness audit
**Auditor role:** CTO / Technical Architect / Implementation Reviewer
**Status:** Active reference — must be reviewed before any code is written

---

## 1. Executive Verdict

**GO FOR DEMO APP WITH SYNTHETIC DATA**

SQL generation, schema provisioning, and production database setup remain blocked until Gate 2 (CTO review) is closed.

**Reasons:**

- Gate 1 is CLOSED. All 21 architectural decisions (D-01–D-21) have recorded founder positions. The methodology, data model, and privacy architecture are sufficiently resolved to begin application scaffolding.
- The documentation set is internally consistent on the critical path: 14-stage algorithm, IU formula, PIB mandatory intermediary, Activation Safeguard, KORA Index v3 10-component structure, Confidence Score inseparability. No formula-level conflicts remain.
- KIP/CEF terminology is now clean throughout doc 12 and doc 22A. Worker-points, redemption, and gamification semantics have been fully removed. `gov.kip_records` is not created in Foundation Light.
- doc 22A (build cutline) provides a clear four-category boundary: Functional Core, Semi-Functional Preview, Static Mockup, and Explicitly Excluded. This is sufficient to guide a demo app build without scope drift.
- The synthetic dataset specification (200–300 workers, 5 pillars, 8–12 event types, 4 source types, intentional AR/MAR imbalance) is defined in doc 22A §9. A demo can be built and scored without any live company data.
- A Product Functional Specification (doc 24) is still missing. This is the primary gap before technical build handoff. The demo build can begin on UI scaffolding and scoring simulation in parallel with doc 24 being written.
- Gate 2 (CTO review of docs 10, 12, 13, 20, 21) is required before any SQL DDL, Supabase schema, or Prisma model is generated. This audit confirms that no structural blocker prevents Gate 2 from being initiated immediately.

---

## 2. Canonical Document Map

| # | Document | Title | Status | Authority | Use for Code? | Developer Instruction |
|---|---|---|---|---|---|---|
| **Canon** | `docs/kora-canonical-product-architecture-v1.md` | **KORA Canonical Product Architecture** | **Canonical — Read First** | **Tier 0 — Master Reference** | **Yes — read before every session** | **Primary master reference. Read before any code, product, or documentation work. Defines product identity, KORA Index rules, module catalogue A–P, capability scope matrix, language policy, boundary rules, claims policy, alignment plan. Supersedes all prior product descriptions where in conflict (exception: doc 10 governs on methodology component definitions, IU formula, algorithm sequencing).** |
| 06 | `docs/06-methodological-constitution.md` | Methodological Constitution | Canonical | Tier 1 — Methodology | Limited | Read for pillar definitions, IU formula rationale, verification philosophy. Do not use for implementation weights — use doc 21 §5 values. |
| 09 | `docs/09-source-materials-alignment-and-conflict-map.md` | Source Materials Alignment & Conflict Map | Canonical | Tier 2 — Decision Record | No | Audit record of how conflicts between source docs were resolved. Use if a concept's origin is disputed. Do not use as primary spec. |
| 10 | `docs/10-architecture-v3-layer-specification.md` | Architecture v3 Layer Specification | **Canonical — Primary** | Tier 1 — Architecture | **Yes** | Primary implementation reference. 14-stage algorithm, IU formula, 10-component KORA Index, Activation Safeguard, privacy rules, all defined here. Consult before any architectural decision. |
| 11 | `docs/11-economic-fiscal-architecture-integration.md` | Economic & Fiscal Architecture Integration | Canonical | Tier 1 — Fiscal | Limited | Read before any payment, wallet, FUO, fiscal guardrail, or Welfare Statement work. Blocked by Gate 5 for live fiscal outputs. |
| 12 | `docs/12-technical-data-model-database-schema.md` | Technical Data Model & Database Schema | Canonical | Tier 1 — Schema | **Yes — after Gate 2** | Primary schema reference. No SQL until Gate 2 CTO review. Read before any table design, FK, or schema placement decision. |
| 13 | `docs/13-founder-cto-review-open-questions.md` | Founder/CTO Architectural Review | Supporting | Tier 2 — Review Record | No | Background on 21 decisions. Superseded for decision resolution by doc 21. Gate 2 defines which decisions CTO must re-examine. |
| 18 | `docs/18-foundation-light-mvp-build-scope.md` | Foundation Light MVP Build Scope | Canonical | Tier 1 — Product Scope | **Yes** | Authoritative four-layer scope (Functional Core / Innovation / Light Ecosystem / Future Vision). Read before adding any module to the build. |
| 19 | `docs/19-ai-ingestion-engine-placement.md` | AI Ingestion Engine Placement | Canonical | Tier 1 — AI | **Yes** | AI Ingestion Assistant spec and governance. Foundation Light v0.1: rule-based BCM classifier only. No external LLM on HR/worker data. |
| 20 | `docs/20-foundation-light-technical-implementation-plan.md` | Foundation Light Technical Implementation Plan | Canonical | Tier 1 — Build Plan | **Yes** | Phase sequencing (Phase 0–14), module specs, acceptance criteria, synthetic data plan, developer handoff checklist. Use as build roadmap. Blocked for SQL (Gate 2). |
| 21 | `docs/21-founder-gate-resolution-log.md` | Founder Gate Resolution Log | **Canonical — Decision Record** | Tier 1 — Decisions | **Yes** | Authoritative record of D-01–D-21. All implementation decisions must align. Supersedes doc 13 on all resolved points. |
| 21b | `docs/21b-methodology-risk-acceptance-and-provisional-score-policy.md` | Methodology Risk Acceptance & Provisional Score Policy | Canonical | Tier 1 — Governance | **Yes** | Output positioning rules, calibration_status requirements, Confidence Score display rules, acceptable/prohibited use cases. Mandatory for any scoring output. |
| 22A | `docs/22A-foundation-light-demo-build-cutline.md` | Foundation Light Demo Build Cutline | **Canonical — Active Build Boundary** | Tier 1 — Build Control | **Yes** | Strict build boundary. Four categories define what is Functional Core, Semi-Functional, Mockup, or Excluded. 11 acceptance criteria. Code may not deviate from this boundary without a formal amendment. |
| App A | `docs/appendices/A-stress-test-algoritmico-summary.md` | Stress Test Summary | Canonical | Tier 2 — Numerical Validation | **Yes — dev fixtures only** | Stress Test scenarios must be loaded as dev-only fixtures. Scoring engine must reproduce Scenario B within tolerance before Phase 6. Do not use as primary methodology spec. |
| App B | `docs/appendices/B-whitepaper-v3-conceptual-extracts.md` | WhitePaper v3/v4 Conceptual Extracts | **Historical / Future-only** | Tier 4 — Historical Reference | **No** | Must not drive Foundation Light implementation. Concepts in Appendix B (CEF, KIP, Sector Friction Index, Territorial Access Index, advanced Contribution mechanics, KORA Link) are future scope. Any Appendix B concept encountered in code must be treated as a deferred scope marker and must not be activated unless explicitly included in docs 18, 20, or 22A. |

---

## 3. Code-Relevant Canonical Decisions

Every developer working on Foundation Light must obey the following decisions. These are not preferences — they are implementation requirements.

**Platform identity:**
- KORA measures organizations, not individuals. The KORA Index is a company-level output. Individual scores (PIB) are internal intermediaries — never surfaced to employers.
- KORA is not a welfare platform, not an HR tool, not a wellbeing tracker, not a reward or gamification system.

**Privacy architecture:**
- No employer role may access `analytics.uef_records`, `analytics.impact_units`, `analytics.pib_records`, or `analytics.worker_profiles`. Grant absence — not RLS alone — enforces this boundary. This cannot be softened.
- The Identity Store (Database A) is physically separate from the Main Platform (Database B). No cross-database join is permitted in application queries.
- Pseudonymization keys are held by KORA's internal privacy service, not by the company.
- Minimum safe group size for employer-visible segment analytics: 10 individuals.

**Algorithm sequence — mandatory and non-negotiable:**
The 14-stage algorithm must execute in order. No stage may be skipped or reordered.

> DATA SOURCES → AI MAPPING → PRIVACY LAYER → DATA QUALITY → UEF → NM → BC → CORRECTION FACTORS → ANTI-GAMING → IU ENGINE → PIB → COMPANY AGGREGATION → ACTIVATION SAFEGUARD → KORA INDEX

- UEF is the first structured record. No scoring occurs before Stage 5.
- PIB (Stage 11) is mandatory. The KORA Index cannot be computed directly from company aggregates. It must pass through individual PIBs.
- Activation Safeguard (Stage 13) is mandatory, non-bypassable, and non-configurable by the company.
- KORA Index and Confidence Score (Stage 14) are inseparable. A KORA Index without a Confidence Score is an incomplete output.

**IU formula — canonical:**

```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
```

- **AGF** (Anti-Gaming Factor): mandatory, independent, range [0.00–1.00]. Applied to every event. AGF is NOT computed as DF × EXF — this is a formula error.
- **DF** (Durability Factor): optional, range [1.00–1.30]. Applied only to LEGACY pillar events with durability evidence.
- **EXF** (Externality Factor): optional, range [1.00–1.20]. Applied only to IMPACT pillar events with verified external beneficiaries.
- **SF** (Strategic Fit): optional, default 1.00, range [0.80–1.10]. Requires documented strategic alignment evidence. Must not be applied without it.
- Old formula notation (ES, EF, RF, SQ, PA, EQT, CT, EC, GF) must not appear anywhere in code, comments, or database column names.

**KORA Index v3 — 10 components:**

| Code | Full Name | Notes |
|---|---|---|
| AR | Activation Rate | Breadth of workforce activation |
| MAR | Meaningful Activation Rate | Quality threshold above minimum |
| NI | Normalized Intensity | Depth per activated worker |
| WB | Worker Balance | NOT Wellbeing |
| PC | Pillar Coverage | Number of pillars with meaningful activation |
| PB | Pillar Balance | Distribution across pillars |
| EQ | Equity | NOT Evidence Quality |
| VR | Verification Rate | Evidence quality of actions |
| CO | Continuity | Temporal persistence |
| CS | Confidence Score | NOT Company Scale; IS also a standalone output |

- Provisional equal weights: 0.10 per component. These are implementation scaffolding, not final values.
- CO redistribution rule: when CO = INSUFFICIENT_DATA, its 0.10 weight is redistributed proportionally across the 9 remaining components (`w_k_adjusted = 0.1111`). Total weight vector remains 1.00.

> **Phase 1M-A terminology warning:** A temporary error introduced in Phase 1M-A redefined EQ as "Evidence Quality." This has been reversed in Phase 1M-1. EQ = Equity remains canonical per `docs/10-architecture-v3-layer-specification.md` §17 and the table above. Evidence quality is handled by VR, CS, EV (correction factor in the IU formula), Evidence Debt, and Trust Ledger. Do not remap EQ to Evidence Quality or Event Quality in any future session.

**Activation Safeguard thresholds (provisional v0.1):**

| Status | Condition |
|---|---|
| CLEAR | AR ≥ 0.40 AND MAR ≥ 0.30 |
| WARNING | 0.20 ≤ AR < 0.40 OR 0.15 ≤ MAR < 0.30 |
| FLAGGED | AR < 0.20 OR MAR < 0.15 |

**Methodology and output rules:**
- Every scoring output must carry: `methodology_version_id`, `calibration_status = 'pre_empirical_calibration'`, Confidence Score, data completeness indicator.
- `calibration_status` is NOT NULL. It may not be hidden or made optional.
- All weights and thresholds are versioned config (`gov.kora_index_weight_versions`). No hardcoded constants in scoring code.
- Foundation Light v0.1 outputs are pilot-grade diagnostic intelligence, not certified, not empirically calibrated, not regulatory-grade.

**Data isolation:**
- Financial and fiscal data never enters the KORA Index.
- ESG/CSRD data is a reporting layer only — it does not produce Impact Units.
- Budget size does not increase the KORA Index.

**KIP and future scope:**
- KIP = KORA Impact Pledge. It is a future territorial pledge mechanism. It is not worker points, not a wallet, not a reward system.
- `gov.kip_records` must not be created in Foundation Light.
- No earned/redeemed/expired/KIP engine/gamification logic may be implemented.

**AI Ingestion:**
- Foundation Light v0.1: rule-based BCM taxonomy classifier only.
- No external LLM API calls on worker or HR data.
- AI suggests; analysts approve. Human review gate is mandatory.

---

## 4. Conflict Scan

| Area | Potential Conflict | Status | Notes |
|---|---|---|---|
| KORA Index component names | WB described as "Wellbeing" in old doc 21 drafts | **RESOLVED** | Doc 21 §5.2 patched: WB = Worker Balance, EQ = Equity, CS = Confidence Score. Canonical names are now consistent across docs 10, 21, 12. |
| IU formula — AGF definition | Doc 21 originally defined AGF = DF × EXF | **RESOLVED** | Doc 21 §5.6 patched: AGF is Anti-Gaming Factor, independent, mandatory, range [0.00–1.00]. DF and EXF are separate factors. Formula error warning is explicit. |
| IU formula — DF scope | Doc 21 originally called DF "Duration Factor" with wrong scope | **RESOLVED** | Patched to Durability Factor, LEGACY pillar only. |
| IU formula — EXF scope | Doc 21 originally called EXF "Experience Factor" with wrong scope | **RESOLVED** | Patched to Externality Factor, IMPACT pillar only. |
| KIP terminology | Doc 12 §1.3a and §18.6 previously used "KORA Impact Points" semantics | **RESOLVED** | All KIP-as-points, worker_pseudonym_id-linked-to-KIP, kip_amount, earned/redeemed/expired, KIP engine references removed. §18.6 replaced with deferred-scope prohibition note. |
| `gov.kip_records` in schema topology | Table previously appeared in schema tree, entity map, content list | **RESOLVED** | Removed from §3.3, §4.1, §5.5, §18.6. Deferred features table in §30 updated: "Not created in Foundation Light." |
| `kora_index_weight_versions` schema placement | Previously in `analytics` schema in parts of doc 12 | **RESOLVED** | Moved to `gov` schema throughout. Consistent. |
| `correction_factor_rule_versions` missing from schema tree | Defined in §24.2 but absent from gov schema tree | **RESOLVED** | Added to gov schema tree. FK from `analytics.impact_units.correction_factor_version_id` added. |
| `methodology_version_id` missing from correction factor table | `gov.correction_factor_rule_versions` lacked this field | **RESOLVED** | Field added with NOT NULL FK → gov.methodology_versions. |
| Worker PIB Light scope | Described as "out of scope" in early doc 12 notes | **RESOLVED** | Patched: production individual accounts are out of scope; Worker PIB Light demo module using synthetic/pseudonymized data is in scope per docs 18 and 20. |
| doc 22A §6 — mockup SQL wording | "No active SQL tables" conflicted with doc 12 deferred structural tables | **RESOLVED** | Patched: future structural tables may exist if explicitly defined in doc 12 and kept inactive/unpopulated/status = 'not_calculated'. |
| Confidence Score dual role | CS is both a KORA Index component and a standalone output | **NO ISSUE** | Doc 10 §14 and §15.1 address this explicitly. CS contributes to the index as a component and also appears as a standalone reliability indicator on all outputs. No conflict — both roles are intentional. |
| Appendix B concepts bleeding into active scope | CEF, KIP, Sector Friction Index, advanced Contribution in Appendix B | **NO ISSUE — monitored** | Doc 12 §1.3a lists all Appendix B deferred concepts explicitly. Boundary is enforced. Developers must not implement these without doc 18/20 inclusion. |
| Financial data and KORA Index | Financial data enters KORA Index | **NO ISSUE** | Doc 10 §4 explicitly states financial data is INPUT layer only and never enters KORA Index. Confirmed in doc 11 §631. |
| Old WhitePaper naming (ES, EF, RF, SQ, PA) | Historical names appearing in reference material | **MINOR — historical** | Old names exist only in Appendix B (correctly labeled historical) and doc 09 conflict map. They do not appear in active implementation docs. Developers must not use them. |
| Equal weight vector permanence risk | Equal weights (0.10×10) could be treated as final values | **IMPORTANT** | Doc 21b §6 and CLAUDE.md Rule 34 explicitly state equal weights are scaffolding, not philosophy. Weights must be versioned config. Delphi Study will replace them. No code should treat 0.10 as a constant. |
| SQL generation gating | Doc 12 is approved but blocked until Gate 2 | **BLOCKER — intentional** | No SQL may be generated until CTO reviews docs 10, 12, 13, 20, 21. Gate 2 is open. This is a required constraint, not a deficiency. |
| Live data gating | Live HR/company data cannot be ingested before Gate 3 | **BLOCKER — intentional** | Gate 3 legal/privacy counsel review required. Synthetic-only development (Phases 1–2) may proceed. |

---

## 5. Subsystem Readiness Matrix

| Subsystem | Readiness Status | Gate Dependency | Build Instruction |
|---|---|---|---|
| Company Setup | READY FOR DEMO APP WITH SYNTHETIC DATA | Gate 2 for SQL | Build company/program records against synthetic data. No live company onboarding. |
| Synthetic Demo Dataset | READY FOR DEMO APP WITH SYNTHETIC DATA | None | 200–300 workers, 5 pillars, 8–12 event types, 4 source types, intentional activation imbalance. All synthetic. Per doc 22A §9. |
| AI Ingestion Assistant | READY FOR DEMO APP WITH SYNTHETIC DATA | None | Rule-based BCM taxonomy classifier. Simulated upload flow acceptable for demo. No external LLM on HR data. Per doc 19 §9.2. |
| UEF Review | READY FOR DEMO APP WITH SYNTHETIC DATA | None | Event table, pillar assignment, evidence level, review status, approve/reject/flag flow. Must reach `approved` before IU computation. |
| IU Engine | READY FOR DEMO APP WITH SYNTHETIC DATA | Gate 2 for SQL | Implement canonical formula with versioned config weights. Validate against Appendix A Stress Test scenarios. No hardcoded constants. |
| PIB Engine | READY FOR DEMO APP WITH SYNTHETIC DATA | Gate 2 for SQL | Mandatory intermediate layer. Never bypassed. Employer roles have no access path. Grant absence. |
| Company Aggregation | READY FOR DEMO APP WITH SYNTHETIC DATA | Gate 2 for SQL | Aggregates from PIB distribution. Not from raw event totals. Per doc 10 AG-01. |
| Activation Safeguard | READY FOR DEMO APP WITH SYNTHETIC DATA | Gate 2 for SQL | CLEAR/WARNING/FLAGGED per D-21 thresholds. Non-bypassable. Must execute before KORA Index. |
| KORA Index v3 | READY FOR DEMO APP WITH SYNTHETIC DATA | Gate 2 for SQL | 10 components, equal weights provisional, CO redistribution rule, versioned config. Calibration status = pre_empirical_calibration. |
| Confidence Score | READY FOR DEMO APP WITH SYNTHETIC DATA | Gate 2 for SQL | Always displayed with KORA Index. Also component 10 (CS). Never omitted. |
| Explainability Layer | READY FOR DEMO APP WITH SYNTHETIC DATA | None | Plain-language reason for score, component breakdown, data quality notes, methodology version, pre-calibration disclosure. |
| Executive Cockpit | READY FOR DEMO APP WITH SYNTHETIC DATA | None | KORA Index, Confidence Score, Activation Safeguard badge, 10-component breakdown, pillar distribution, warnings, next actions. |
| Initiative Studio (Activation Orchestration Preview) | READY ONLY AS SEMI-FUNCTIONAL PREVIEW | None | Gap detection, initiative lifecycle states, Additionality Lens, Activation Intervention Simulator — all on synthetic data. No booking engine. No payment. No marketplace. Canonical reference: `docs/kora-canonical-product-architecture-v1.md` §7B and §13. |
| Worker PIB Light | READY ONLY AS SEMI-FUNCTIONAL PREVIEW | None | Synthetic/pseudonymized demo profiles only. No production accounts for real pilot employees. No employer access under any path. |
| Partner Onboarding Light | READY ONLY AS SEMI-FUNCTIONAL PREVIEW | None | Partner catalog, service types, pillar mapping, eligibility confidence. No marketplace logic, no payouts, no booking. |
| Advisor Portal Light | READY ONLY AS SEMI-FUNCTIONAL PREVIEW | None | Review records, status, evidence references, eligibility confidence. No advisor account system for demo. |
| Financial Governance Light | READY ONLY AS SEMI-FUNCTIONAL PREVIEW | Gate 5 for live fiscal | Budget declared, spend distribution, cost per IU as dashboard indicator only. No fund custody, no payment, no FUO movement. |
| Fiscal Classification Map | READY ONLY AS SEMI-FUNCTIONAL PREVIEW | BLOCKED UNTIL GATE 5 TAX/FISCAL REVIEW | Informational display only for demo. No live fiscal guardrails enforcement. No tax-advice outputs before Gate 5. |
| Founder Validation Cockpit | READY FOR DEMO APP WITH SYNTHETIC DATA | None | Stakeholder pipeline, contact status, intent signals, KPIs. Fully functional for demo with mock-populated data. |
| Reports / Exports | READY FOR DEMO APP WITH SYNTHETIC DATA | Gate 2 for SQL | Report template must be designed and founder-approved before PDF generation pipeline is built. Named deliverable per doc 20. |
| KORA Impact Pledge | DO NOT BUILD | Gates 2 + legal + tax + PSD2 | Future scope. `gov.kip_records` not created. No points, wallet, earned/redeemed, KIP engine. Define in future-tier document. |
| KORA Link | STATIC MOCKUP ONLY | Hardware + future release | NFC/QR hardware integration. May appear as labeled future mockup only. |
| Payments / FUO | DO NOT BUILD | Gate 5 + PSD2 + legal | No payment execution, no fund custody, no FUO transit through KORA. SVAM Variant A only at Foundation Light. |
| Partner Marketplace | STATIC MOCKUP ONLY | Future Ecosystem tier | Booking engine, marketplace logic, partner payouts — all deferred. |
| Advisor Academy | STATIC MOCKUP ONLY | Future | Certification LMS is future scope. |
| Certified Evidence Package | STATIC MOCKUP ONLY | Certified tier | Requires external methodology validation. No certified claims at Foundation Light. |

---

## 6. Gate Status

| Gate | Status | What It Blocks | What Can Proceed Before Closing |
|---|---|---|---|
| **Gate 1 — Founder Decisions (D-01–D-21)** | **CLOSED** (2026-05-17) | Nothing — Gate 1 is closed | All documentation work, UI design, demo app scaffolding, synthetic data build |
| **Gate 2 — CTO Review** | **OPEN** | SQL DDL generation, schema provisioning (doc 22), Supabase project setup, Prisma model generation, any persistent database schema | Demo app scaffolding, UI prototyping, scoring simulation with in-memory or local config, synthetic data preparation, product functional spec (doc 24) |
| **Gate 3 — Legal/Privacy Review** | **OPEN** | Live company data ingestion, live pilot with real HR data | All synthetic-only development (Phases 1–2 per doc 20), demo app with synthetic data, Gate 2 engagement |
| **Gate 4 — Methodology Parameters** | **Provisionally satisfied** (D-21 equal weights, Activation Safeguard thresholds, NM scaling recorded in doc 21 §5) | Phase 5 scoring engine without provisional values | Demo scoring simulation using D-21 provisional values. Final calibration deferred to post-pilot Delphi Study. |
| **Gate 5 — Tax/Fiscal Review** | **OPEN** | Live fiscal classification outputs presented to clients, live Welfare Statement generation | All non-fiscal modules, Financial Governance Light dashboard (informational only), Gates 2 and 3 engagement |

**Gate 2 can be initiated immediately.** No further documentation is required before the CTO begins their review of docs 10, 12, 13, 20, and 21.

---

## 7. Developer Do-Not-Build List

The following must not be built under any circumstances during Foundation Light:

**Payment and financial execution:**
- Payment flows of any kind
- Worker wallet or company wallet
- KIP points or KORA Impact Points
- KIP redemption logic
- Worker reward or gamification system
- KORA Impact Pledge execution
- Partner payouts
- FUO movement through KORA
- PSP integration

**Privacy violations:**
- Real worker accounts for actual pilot employees
- Employer access to individual UEF records
- Employer access to individual IU records
- Employer access to individual PIB records
- Employer access to `analytics.worker_profiles`
- Any individual-level scoring or ranking visible to employer roles

**Live data before Gate 3:**
- Live HR system data ingestion
- Live company data processing
- Real personal data in the demo or dev environment

**AI:**
- External LLM API calls on worker or HR data (v0.1 is rule-based only)

**Live fiscal execution before Gate 5:**
- Fiscal guardrails enforcement
- Tax-advice outputs
- Welfare Statement regulatory submission

**Infrastructure beyond demo scope:**
- Booking engine
- Advisor certification LMS
- KORA Link hardware integration
- Real-time NFC/QR verification
- Production API integrations with third-party HR systems
- Advisor certification academy

**Methodology claims:**
- Certified methodology claims
- Empirically calibrated score claims
- Scientifically validated output claims
- Regulatory-grade or actuarially validated labels

---

## 8. What Can Be Built Now

The following may be built before Gate 2 closes:

- Clickable UI prototype (all screens in doc 22A §4–§5)
- Demo app with local or in-memory synthetic data (no persistent schema required for UI work)
- Simulated ingestion flow (file upload, column mapping, mapping suggestion UI, review flow)
- UEF review interface (event table, pillar assignment, approve/reject/flag)
- Scoring simulation using versioned config and synthetic data (in-memory or local JSON)
- Executive Cockpit (KORA Index display, component breakdown, Activation Safeguard badge)
- Explainability panels (component explanations, data quality notes, calibration disclosure)
- Worker PIB Light demo view using synthetic profiles
- Initiative Studio preview (gap detection, additionality lens, activation intervention simulator — synthetic data only; no booking, no payment, no marketplace)
- Partner/Advisor light preview panels
- Founder Validation Cockpit
- Static Future Vision area (clearly labeled "Future Vision / Not Active in Foundation Light")
- Report template design (required deliverable before Phase 11 per doc 20)
- Product Functional Specification (doc 24)

This does not authorize:
- Production database provisioning
- SQL DDL generation (requires Gate 2)
- Live company data processing (requires Gate 3)
- Live fiscal outputs (requires Gate 5)

---

## 9. What Is Still Missing Before Code

| Missing Item | Priority | Blocker for |
|---|---|---|
| **Product Functional Specification** (`docs/24-foundation-light-product-functional-spec.md`) | Critical | Technical build handoff, developer-ready module specs, screen-level behavior definition |
| **Demo Dataset & Scenario Specification** | High | Synthetic data build, scoring engine validation, demo narrative completeness |
| **Technical Build Handoff Package** | High | First developer commit — depends on Gate 2 + doc 24 |
| **Gate 2 CTO Review** | Critical | SQL generation, schema provisioning, production infrastructure |

No additional strategic or methodology documents are needed before the demo app build begins. The documentation set is sufficient for application scaffolding and UI work.

---

## 10. Recommended Next Document

**`docs/24-foundation-light-product-functional-spec.md`**

This is the missing bridge between the architecture documentation and the first developer commit.

Doc 22A defines what categories of things to build. Doc 20 defines the phase sequence and module acceptance criteria. Neither document defines what each screen does, what data it shows, what user interactions it supports, or what edge cases it must handle.

Without a Product Functional Specification, developers will make their own decisions on:
- screen-level behavior and state transitions
- data fields and display logic
- error states and empty states
- demo narrative flow edge cases
- where mockup ends and live logic begins

Those decisions, made individually, will be inconsistent and expensive to fix. Doc 24 must be written before any developer writes the first line of application code. It does not require Gate 2 to be written.

---

## 11. New Intelligence Modules A–P — Catalogue Reference

The canonical architecture (`docs/kora-canonical-product-architecture-v1.md` §12) defines 16 intelligence modules (A–P). The full definitions, demo/pilot/future status, rules, and Italian-first descriptions are in that document.

**Summary of demo-status modules (active in Foundation Light):**

| Module | Name | Foundation Light Status |
|---|---|---|
| A | Activation Debt | ✅ Demo — analytics visualization on synthetic data |
| B | Evidence Debt | ✅ Demo — analytics visualization on synthetic data |
| C | Trust Ledger | 🔶 Architectural — visualization in future |
| E | No-Surveillance Proof | ✅ Demo — privacy boundary components |
| F | Additionality Lens | ✅ Demo — part of Initiative Studio |
| G | Silent Majority Detector | ✅ Demo — analytics layer, synthetic data |
| H | Access Equity & Inclusion Evidence Layer | 🔶 Demo — aggregate synthetic only, above privacy threshold |
| I | Activation Intervention Simulator | ✅ Demo — synthetic simulation |
| J | Board Pack | 🔶 Mockup demo |
| K | Benchmark & Normalization Layer | 🔶 Demo — synthetic benchmarks only |
| L | KORA Evolution | 🔶 Demo — longitudinal on synthetic data |
| M | KORA Value Chain | ❌ NOT IN FOUNDATION LIGHT |
| N | Partner Activation Quality | 🔶 Demo — internal signal only |
| O | Advisor Confidence Stamp | 🔶 Demo |
| P | Worker Consent & Data Portability | 🔶 Demo — privacy controls |

Capabilities marked ❌ must not be built. Capabilities marked 🔲 or ❌ in the Capability Scope Matrix (`docs/kora-canonical-product-architecture-v1.md` §25) must not be built in Foundation Light.

---

## 12. Final Decision

KORA is not ready for production code or SQL generation.

KORA is ready for a controlled Foundation Light demo app with synthetic data, provided:

1. Read `docs/kora-canonical-product-architecture-v1.md` before every session — it is the master reference.
2. No SQL, Prisma models, Supabase schema, or persistent database setup occurs before Gate 2 (CTO review of docs 10, 12, 13, 20, 21).
3. No live company data is ingested before Gate 3 (legal/privacy counsel engagement).
4. The build follows doc 22A (v1.1) strictly — no scope additions without a formal amendment to the cutline.
5. Every scoring output carries `calibration_status = 'pre_empirical_calibration'`, `methodology_version_id`, and Confidence Score.
6. The Activation Safeguard is implemented as non-bypassable from day one — not added later as a post-processing step.
7. Initiative Studio is built as a Semi-Functional Preview only — no booking engine, no payment, no marketplace, synthetic data only.

Gate 2 can be initiated immediately. No documentation gap prevents it.

---

**Document version:** v1.1
**Date:** 2026-05-20 (Phase 1M-B alignment: canonical architecture doc added to §2, Initiative Studio added to §5 and §8, module catalogue A–P summary added as §11)
**Gate 1:** CLOSED | **Gate 2:** OPEN (blocks SQL) | **Gate 3:** OPEN (blocks live data) | **Gate 4:** Provisionally satisfied | **Gate 5:** OPEN (blocks live fiscal)
**Canonical reference:** `docs/kora-canonical-product-architecture-v1.md` — read before every session
