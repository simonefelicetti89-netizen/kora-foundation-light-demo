# KORA Architecture v3 — Layer Specification

*Title: KORA Architecture v3 — Layer Specification*
*Status: Canonical — Approved*
*Version: 1.0*
*Date: 2026-05-17*
*Supersedes: Architecture v2 (historical reference only)*
*Authority: This document formalizes the founder decisions recorded in doc 09 Section 12 and adopts KORA_Architecture_v3_Specs.md as the canonical technical architecture reference for the KORA platform.*

---

## 1. Status and Authority

This document is the official canonicalization of KORA Architecture v3 as the governing technical architecture reference for the KORA platform. It supersedes any prior architecture description in reference files and must be consulted before any database schema design, scoring engine implementation, or UI design work proceeds.

**Relationship to other canonical documents:**

| Document | Relationship |
|---|---|
| Doc 06 — Methodological Constitution v0.1 | Methodological authority. This document extends doc 06 with Architecture v3 specifics. Where this document and doc 06 conflict on formula notation or component counts, **this document governs** per founder Decision 2 (doc 09 Section 12). Doc 06's 7-component KORA Index weights are historical prototype weights, not the current architecture. |
| Doc 07 — Conceptual Data Model v0.1 | Entity authority. This document defines the algorithm layer architecture. Doc 07 defines the entity model. Both must be consulted together. |
| Doc 08 — Founder Technical Decisions v0.1 | Operational authority for the 10 infrastructure decisions (privacy architecture, ingestion pipeline, etc.). No conflict with this document. |
| Doc 09 — Source Materials Alignment Map | The founder decisions in Section 12 of doc 09 are formalized here. |
| KORA_Architecture_v3_Specs.md (reference) | The source reference from which this document is derived. The Mermaid diagrams, layer hierarchy, governance notes, and change log in that file are incorporated by reference and extended here. |
| KORA_StressTest_Algoritmico_v1.md.pdf (reference) | Numerical validation reference. Scenario results referenced in Section 30 of this document. |

**What this document does not cover:**
- Technical database schema (to be produced as doc 11, after this document)
- Application code or migrations
- UI component design or frontend specifications
- Commercial and pricing logic (doc 02 and doc 03)
- Fiscal and eligibility governance details (docs 04 and 05)

---

## 2. Foundational Principle

> **KORA is an Impact Intelligence Platform.**
> Not a welfare platform. Not a marketplace. Not an HR dashboard. Not an ESG tool.

> *"The KORA Index is not a marketplace score, not a budget score, not a partner network score, and not an environmental score. It is a people-impact maturity index built from verified individual actions and aggregated PIBs."*

**Actions are the unit.**

This principle is not a marketing claim. It is an architectural constraint. Every layer in the KORA system exists to serve one purpose: transforming verified human actions into structured, explainable, privacy-safe and governable impact intelligence.

The following violations of this principle must never occur in any implementation:

- Budget allocations driving the KORA Index
- Partner catalog counts or service availability raising the KORA Index
- Unverified survey responses generating Impact Units
- Environmental metrics (GHG, Scope 1/2/3) entering the PIB or KORA Index
- The KORA Index calculated directly from company aggregates, bypassing individual PIBs
- AI scoring replacing human governance at critical junctures

---

## 3. Core Algorithm Flow

The canonical KORA algorithm proceeds through 14 sequential stages. No stage may be skipped or reordered. Each stage has defined inputs, outputs, and governance constraints.

**The 14-stage Core Algorithm Flow:**

```
① DATA SOURCES
        ↓
② AI UPLOAD STUDIO / DATA MAPPING
        ↓
③ PRIVACY & DATA SENSITIVITY LAYER
        ↓
④ DATA QUALITY ENGINE
        ↓
⑤ UEF — UNIVERSAL EVENT FORMAT
        ↓
⑥ NORMALIZED MAGNITUDE (NM)
        ↓
⑦ BASE CONTRIBUTION VECTOR (BC)
        ↓
⑧ CORRECTION FACTORS (CQ · EV · CF · AGF · [DF] · [EXF] · [SF])
        ↓
⑨ ANTI-GAMING & ANOMALY DETECTION
        ↓
⑩ IMPACT UNIT ENGINE
        ↓
⑪ PIB INDIVIDUALE (mandatory — never skippable)
        ↓
⑫ AGGREGAZIONE AZIENDALE
        ↓
⑬ ACTIVATION SAFEGUARD (mandatory architectural layer)
        ↓
⑭ KORA INDEX ENGINE → KORA INDEX [0–100] + Confidence Score
```

**Critical sequencing rules:**

- Stages ①–⑤ normalize raw data into UEF Records. No scoring occurs before Stage ⑤.
- Stages ⑥–⑩ compute Impact Units per event per pillar. This is where the IU formula is applied.
- Stage ⑪ (PIB) is mandatory and must never be bypassed. The KORA Index cannot be calculated from company aggregates directly — it must pass through individual PIBs. This is Algorithm Governance Note AG-01.
- Stage ⑬ (Activation Safeguard) is mandatory. It cannot be disabled, made optional, or bypassed. See Section 16.
- Stage ⑭ produces the KORA Index and its Confidence Score together. They are inseparable outputs.

---

## 4. Data Sources Layer

**Stage ①**

**What this layer is:** The collection of all systems and files that provide raw event data to KORA. All data that enters KORA originates from one of the source categories defined here.

**Source categories:**

| Category | Description | Typical Evidence Level |
|---|---|---|
| **KCP (KORA Certified Partners)** | Partners who have been formally verified and certified by KORA — gyms, nutritionists, psychologists, training organizations, volunteering bodies, KORA Link sensors | Highest — certified provider confirmation |
| **External Partners (non-KCP)** | Welfare platforms, LMS, health service providers, associations, external platforms that have not completed KORA certification | Medium — depends on export format and verification capability |
| **Internal Company Data** | HR records, LMS exports, payroll data, CSR reports, team-building logs, knowledge transfer documentation | Varies widely — often low-to-medium verification |
| **Worker Actions** | Booking records, check-in events, KORA Link confirmations, badges, top-up transactions, co-payment records | Medium-to-high where KORA Link is present |
| **Financial Data** | Company fund allocations, budget records, partner payouts, top-up transactions, KORA fees — **INPUT layer only, never enters KORA Index** | Not applicable — financial data does not produce Impact Units |
| **ESG / Sustainability Data** | ESRS S1/S3/E1 data, GHG records, Scope 1/2/3 measurements, energy, mobility — **Reporting layer only, never enters PIB or KORA Index** | Not applicable — ESG metrics are separate reporting layer |

**Source tier and evidence level:** Every source carries an intrinsic evidence level (EV tier) that is carried into the UEF Record and applied in the Impact Unit formula. KCP sources carry higher EV than unverified self-declared sources. The source tier is a structural input to scoring — it cannot be manually elevated by the company.

**Foundation Light context:** At Foundation Light, the primary sources are existing company data exports — CSV files, HR system extracts, welfare platform exports, ESG spreadsheets. No real-time API integrations, no KORA Link hardware, no partner portal. This is a deliberate scope constraint that makes Foundation Light buildable in 90 days without compromising the architecture's long-term extensibility.

---

## 5. AI Upload Studio / Data Mapping

**Stage ②**

**What this layer is:** The ingestion intelligence layer — the system that receives raw data from all source categories, identifies event types, maps fields to UEF format, assigns initial confidence levels, and routes ambiguous records to human review.

**What this layer does:**

- Accepts data in multiple formats: CSV, structured API payloads (future), manual entry
- Detects event types from raw field data using a taxonomy-driven classifier
- Maps raw columns to UEF fields with a confidence score per mapping
- Assigns initial source tier classification
- Identifies records with insufficient data for UEF completion
- Routes low-confidence or ambiguous records to human review queue
- Records all mapping decisions in the audit trail with methodology version

**Critical governance constraint:** AI suggests event type classifications and column mappings. AI does not assign discretionary scores. The distinction is architectural. AI proposes; the human reviewer or the methodology's rule-based system confirms. No classification produced by AI becomes a final, scored record without passing through the quality and privacy checks that follow.

**Foundation Light implementation:** In Foundation Light, the Upload Studio is the mechanism by which a KORA analyst ingests a company's historical data. The flow is asynchronous with a mandatory manual review step before scoring (founder Decision 4 — doc 08). The ingestion batch status lifecycle is: Submitted → Under Review → Approved → Processing → Complete / Error.

---

## 6. Privacy & Data Sensitivity Layer

**Stage ③**

**What this layer is:** The privacy enforcement boundary — the layer that pseudonymizes identifiable worker data, applies sensitivity masking, enforces role-based access rules, and ensures that no identifiable personal data passes into the analytical layers.

**This layer is separate from Data Quality (Stage ④).** Data quality is a technical property of the data. Privacy sensitivity is a property of what the data represents. A technically complete record may contain high-sensitivity personal content that requires masking even if the data quality is excellent. These are two independent dimensions.

**Core operations:**

| Operation | Description |
|---|---|
| **Pseudonymization** | Worker identifiers are mapped to KORA pseudonymized IDs at the moment of ingestion, before any analytical processing. This is not a post-processing step. (Architecture rule PR-01) |
| **Sensitive content masking** | Diagnoses, psychological treatment content, medical notes, and other high-sensitivity personal data are masked or excluded before the record enters the UEF. KORA measures verified participation — not sensitive personal content. (PR-04) |
| **Sensitivity classification** | Each event is classified by privacy sensitivity level: Low / Medium / High. This classification controls display thresholds, aggregation requirements, and access restrictions downstream. |
| **Role-based access enforcement** | The privacy layer marks which roles may access which data types. No employer-facing role may access identifiable worker data at any stage. |
| **Legal basis documentation** | The legal basis for processing each event type is recorded in the UEF Record. This supports GDPR audit trail requirements. (PR-05) |

**Key architectural boundary:** The Worker Identity Layer (identifiable data) is physically separated from the Anonymized Worker Profile layer (analytical data). These are separate databases, not separate tables in the same database (founder Decision 1 — doc 08). No employer role, no partner role, and no advisor role may access the Worker Identity Layer. Only KORA system processes and KORA privacy administrators may access it.

**Pseudonymization key architecture:** Per-company pseudonymization keys are held by KORA's internal privacy service. Each company's key is isolated — a compromise of one company's key does not expose other companies' workers. All key usage is logged to the audit trail. (Founder Decision 1, doc 09 Section 12.)

---

## 7. Data Quality Engine

**Stage ④**

**What this layer is:** The technical quality assessment layer — the system that detects duplicate records, identifies missing fields, calculates batch-level and event-level confidence scores, classifies records as accepted/rejected/flagged, and produces the data quality indicators that accompany every output.

**Core operations:**

| Operation | Description |
|---|---|
| **Duplicate detection** | Identifies repeated records that represent the same real event submitted multiple times — from the same source or cross-source |
| **Missing data assessment** | Identifies UEF fields that cannot be populated from the raw data. Records the missing field rate per batch. |
| **Confidence score calculation** | Assigns an event-level confidence score based on field completeness, source tier, evidence presence, and consistency checks |
| **Rejected row documentation** | Every rejected record receives a documented rejection reason code, stored in the audit trail (DG-05) |
| **Anomaly detection** | Identifies statistically improbable patterns — unusually high event volumes, duplicate session patterns, suspiciously uniform data — and flags them for Anti-Gaming review (Stage ⑨) |
| **Batch-level quality summary** | Produces a data quality report per ingestion batch: accepted/rejected/flagged counts, missing field rates, confidence distribution, source tier distribution |

**Separation from Anti-Gaming:** The Data Quality Engine detects technical quality issues — incomplete data, format errors, duplicates, statistical anomalies. Anti-Gaming (Stage ⑨) applies governance judgements to patterns that may indicate systematic gaming of the scoring model. These are structurally separate systems. A record can be technically complete and still trigger anti-gaming controls, or can have missing fields and still be genuine.

---

## 8. UEF — Universal Event Format

**Stage ⑤**

**What this layer is:** The canonical normalized representation of every event that enters the KORA analytical pipeline. Every action, regardless of source, is expressed as a UEF Record before any scoring occurs. The UEF is the common language that makes heterogeneous events from different sources analytically comparable.

**The UEF is not a database table.** It is the canonical event language — the structured schema that every processed event must conform to. The technical database schema will implement this, but the UEF definition precedes the schema.

**Core UEF fields:**

*Identity and attribution:*

| Field | Description |
|---|---|
| `event_id` | Unique KORA-generated identifier for this normalized event |
| `worker_id` | KORA pseudonymized identifier — never a real name or employee number |
| `company_id` | Company program scope |
| `program_id` | Company program reference |
| `segment_id` | Workforce segment reference — only if privacy-safe and above aggregation threshold |

*Event description:*

| Field | Description |
|---|---|
| `event_type` | KORA event taxonomy classification |
| `event_date` | Date or date range of the event |
| `duration_raw` | Raw duration in native units (hours, sessions, days) |
| `duration_normalized` | Normalized duration after NM rules applied |
| `continuity_flag` | One-time / recurring / part of structured program |
| `action_type` | Individual / group / company-wide |

*Source and provenance:*

| Field | Description |
|---|---|
| `source_type` | Source category (KCP / External / Internal / Worker / Financial / ESG) |
| `source_tier` | Evidence tier assigned to this source |
| `source_name` | Specific system or provider |
| `ingestion_batch_id` | Reference to the Ingestion Batch that created this record |
| `evidence_ref` | Link to Evidence Record if one exists |
| `ingestion_confidence` | Confidence assigned at ingestion time |

*Pillar classification:*

| Field | Description |
|---|---|
| `primary_pillar` | Primary KORA pillar: LIFE / GROWTH / CONNECTION / IMPACT / LEGACY |
| `secondary_pillars` | Array of secondary pillars where methodologically justified |
| `pillar_mapping_version` | Version of the pillar taxonomy used |
| `mapping_confidence` | Confidence in the pillar assignment |
| `mapping_method` | Taxonomy rule / AI suggestion confirmed / manually assigned |
| `human_review_flag` | Whether this mapping was manually confirmed or overridden |

*Quality and verification:*

| Field | Description |
|---|---|
| `content_quality_level` | CQ classification — Low / Standard / High / Certified |
| `evidence_level` | EV classification — Self-declared / Partially verified / Verified / Certified |
| `verification_level` | Overall verification status |
| `impact_confidence` | Reliability of this event as impact evidence |

*Privacy:*

| Field | Description |
|---|---|
| `privacy_sensitivity` | Low / Medium / High |
| `handling_protocol` | Applied sensitivity handling rules |
| `legal_basis` | GDPR legal basis for processing this event type |

*Fiscal and eligibility:*

| Field | Description |
|---|---|
| `financial_ref` | Link to Financial Movement record if spend data is provided |
| `fiscal_perimeter` | Fiscal/budget perimeter if classified |
| `eligibility_status` | Eligibility classification (Eligible / Limited / Blocked) — set by Eligibility Gate before scoring |
| `eligibility_confidence` | Eligibility confidence level (high / medium / low) |

> **Eligibility Gate implementation note (Phase 1N):** Every uploaded action, event, program, or dataset row is classified as **Eligible**, **Limited**, or **Blocked** by the `EligibilityGateService` before any Impact Units are computed. Classification is driven by `data/synthetic/action-taxonomy.json` (KORA Action Taxonomy v0.1) via keyword matching and mandatory-status rules. **Blocked items generate 0 IU and contribute 0 to the KORA Index — not low weight, zero.** Compliance is blocked, not low-weighted. Limited items (cash-like economic benefits) are routed to Economic Relief tracking only and do not generate IU. This gate corresponds to the `eligibility_status` field in the UEF Record and must execute before Stage ⑥ (NM) is applied. Canonical doctrine: "KORA non trasforma la compliance in impatto. La conformità legale è una baseline, non impatto."

*Methodology:*

| Field | Description |
|---|---|
| `methodology_version` | Version of the KORA methodology in effect at processing |
| `review_status` | Auto-processed / Flagged / Manually reviewed |
| `review_notes` | Notes from human reviewer if applicable |
| `anti_gaming_flags` | Anti-gaming flags triggered on this record |

---

## 9. Normalized Magnitude

**Stage ⑥**

**What this layer is:** The computation that translates raw event duration or size into a normalized analytical quantity that the scoring engine can use. KORA does not reward hours linearly. Duration is normalized and capped.

**The principle:** A 2-hour training session and a 40-hour training program are not 20 times different in impact. Diminishing returns apply. A prevention check-up takes 30 minutes but may generate higher human value than a 3-hour compliance training. NM translates the raw magnitude of an event into an analytically meaningful quantity.

**NM computation:**

```
NM = f(duration_raw, event_type, category_cap)
```

Where:
- `duration_raw` is the raw duration in native units
- `event_type` is the KORA event taxonomy classification, which determines the applicable normalization curve
- `category_cap` is the maximum NM value for this event type — applied to prevent gaming through inflating participation hours

**NM rules are versioned separately.** Each version of the NM rules table is numbered and traceable. A change to NM rules constitutes a methodology version increment.

**What NM does not measure:** NM does not measure quality, evidence, or continuity. Those are Correction Factors (Stage ⑧). NM measures only the normalized size of the action — a clean, dimensionless quantity between 0 and the applicable category cap.

---

## 10. Base Contribution Vector

**Stage ⑦**

**What this layer is:** The computation that distributes the event's potential contribution across the five KORA pillars. Every event that enters the scoring engine is mapped to one or more pillars by the Pillar Mapping step (in Stage ⑤), and the Base Contribution Vector expresses the weight of that contribution per pillar.

**BC is not a fixed score for each pillar.** BC is a distribution — a vector across LIFE, GROWTH, CONNECTION, IMPACT, LEGACY that defines where this event contributes and in what proportion.

**BC computation:**

```
BC_{e,p} = Base weight for event e on pillar p
```

Where:
- BC_{e,p} is defined by the Base Contribution Matrix (BCM) for each event type × pillar combination
- The sum of BC_{e,p} across all pillars for a single event need not equal 1.0 — events can have primary and secondary pillar contributions at different weights
- An event classified to GROWTH as primary and CONNECTION as secondary will have a high BC for GROWTH and a lower BC for CONNECTION

**BCM status:** BCM v1.0 is a theoretical prior — it has not been empirically calibrated. It is the product of methodological reasoning and expert judgment, not longitudinal data analysis. The BCM must be validated through a Delphi Study with 15–20 domain experts as the first phase of the validation roadmap. The current BCM is declared as "pre-empirical calibration" and must never be presented as a final or validated weighting.

**BCM versioning:** The BCM is versioned independently of other methodology components. A change to the BCM requires a new BCM version and a new methodology version. All Impact Units produced under a given BCM version must carry that version reference.

---

## 11. Correction Factors

**Stage ⑧**

**What this layer is:** The set of multiplicative factors applied to the base computation (NM × BC) to adjust for the quality, verification, continuity, and governance characteristics of each event. Correction Factors are what distinguish a verified, high-quality, recurring action from a self-declared, low-quality, one-off event.

**The canonical IU formula — Architecture v3 (Approved):**

```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
```

This is the approved canonical formula per founder Decision 5 (doc 09 Section 12). The old WhitePaper v3 formula notation (using ES, EF, RF, SQ, PA, EQT, CT, EC, GF) must not be used.

**Correction Factor definitions:**

| Factor | Name | Type | Value Range | Definition |
|---|---|---|---|---|
| **CQ** | Content Quality | Mandatory | 0.50–1.20 | Quality of the content or program associated with this event. Low for generic, unverified content; high for certified, structured programs. |
| **EV** | Evidence / Verification | Mandatory | 0.50–1.00 | Strength of verification evidence. Self-declared = low; KCP-confirmed = high. EV cannot exceed 1.00 — evidence can never inflate beyond the base value of the action. |
| **CF** | Continuity Factor | Mandatory | 1.00–1.20 | Recurrence and consistency pattern for this worker's engagement. CF rewards engagement that is sustained over time, not one-time participation. Note: CF means Continuity Factor in the current canonical model — this is different from the WhitePaper v3 use of CF as "Context Fit." |
| **AGF** | Anti-Gaming Factor | Mandatory | 0.00–1.00 | Structural anti-gaming adjustment. Applied at 1.00 for clean events; reduced for events that trigger gaming or anomaly flags. Can be set to 0.00 for events that are disqualified by anti-gaming controls. |
| **DF** | Durability Factor | Optional | 1.00–1.30 | Applied to LEGACY pillar events where the action produces value that persists beyond the moment of occurrence. Only applied when LEGACY classification and durability evidence are both present. |
| **EXF** | Externality Factor | Optional | 1.00–1.20 | Applied to IMPACT pillar events where verified external beneficiaries exist. Only applied when IMPACT classification and verified external contribution evidence are both present. |
| **SF** | Strategic Fit | Optional | 0.80–1.10 | Applied when a company has declared a specific strategic priority pillar and an event aligns with or opposes that priority. Default 1.00 (no adjustment). Approved as optional factor with evidence required (founder Decision 5, doc 09 Section 12). Must not be applied without documented strategic alignment evidence. |

**Application rules:**

- CQ, EV, CF, and AGF are applied to every event that reaches Stage ⑧. They are not optional.
- DF is applied only to events with a primary LEGACY classification and documented durability evidence.
- EXF is applied only to events with a primary IMPACT classification and verified external beneficiary evidence.
- SF is applied only when the company has a formally declared strategic priority and the event clearly aligns with or opposes that priority. Default is 1.00 (no adjustment). SF requires explicit documentation.
- No factor may be applied to raise an event's score without the corresponding evidence being present in the Evidence Record system.

---

## 12. Anti-Gaming & Anomaly Detection

**Stage ⑨**

**What this layer is:** The structural governance layer that prevents gaming of the scoring model. Anti-gaming in KORA is not primarily a detection problem — it is a structural design problem. The architecture is built so that gaming is structurally difficult, not just detectable.

**Core anti-gaming mechanisms:**

| Mechanism | Description |
|---|---|
| **Event-type caps** | Maximum NM values per event type prevent gaming through inflating reported duration. A company cannot increase a worker's score by claiming 200 hours of a capped event type. |
| **Diminishing returns** | The NM normalization curve is concave for most event types — the benefit of additional hours decreases as duration increases. Extended low-quality participation is not proportionally rewarded. |
| **Deduplication** | The Data Quality Engine (Stage ④) and the Anti-Gaming layer together detect records that represent the same real event submitted multiple times across sources. |
| **AGF flag triggers** | Specific patterns trigger AGF reduction: unusually high event volume from a single source in a short period, patterns inconsistent with historical baselines, high volume of events with no corresponding evidence records, concentration of all events in a single pillar. |
| **Concentration alerts** | Excessive concentration of IU in one worker, one source, one pillar, or one event type triggers an alert and a review flag. The system flags for human review rather than automatically blocking. |
| **Advisor review** | The Anti-Gaming layer routes flagged events to human review. The advisor can validate or reject the evidence. The advisor cannot increase scores beyond what the evidence supports. (AG-08) |

**Structural anti-gaming design:** Caps + low verification evidence + Activation Safeguard (Stage ⑬) together reduce the impact of gaming systematically. A company that inflates event counts with low-quality, unverified events will see: high raw event volume, low EV values, activated AGF reduction, and an Activation Safeguard penalty if the inflation concentrates impact among a small group. The KORA Index cannot be significantly inflated by gaming because the formula is sensitive to all four dimensions simultaneously.

---

## 13. Impact Unit Engine

**Stage ⑩**

**What this layer is:** The computation engine that applies the canonical IU formula to each UEF Record and produces Impact Units — the internal analytical currency of KORA.

**Formula (canonical):**

```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
```

**Impact Units are:**

- Internal analytical outputs — they are not shown as raw numbers to company leadership in most contexts
- The foundational quantity from which PIB, company aggregates, and the KORA Index are built
- Pillar-specific — each event can generate IU in one or more pillars
- Traceable — every IU is linked to its originating UEF Record, the worker pseudonymized ID, and the source
- Versioned — every IU record carries the methodology version under which it was calculated

**Impact Units are not:**

- Money, rewards, or gamification points
- Employee performance scores
- Visible to employers as individual per-worker values
- Comparable across methodology versions without the version label

**IU status categories:** Auto-calculated (standard processing) / Flagged for review (anti-gaming or quality triggers) / Manually adjusted (advisor intervention, documented in audit trail with before/after values).

---

## 14. PIB Individuale

**Stage ⑪ — Mandatory, never skippable**

**What this layer is:** The aggregation of all Impact Units generated by a single Anonymized Worker Profile across all pillars for a defined period. PIB (Personal Impact Balance) is the individual-level analytical foundation of KORA.

**PIB formula:**

```
PIB_worker = Σ_p IU_{worker,p}

Decomposed:
PIB_worker = [PIB_LIFE, PIB_GROWTH, PIB_CONNECTION, PIB_IMPACT, PIB_LEGACY]

PIB_total = PIB_LIFE + PIB_GROWTH + PIB_CONNECTION + PIB_IMPACT + PIB_LEGACY
```

**Why PIB is mandatory and never skippable (AG-01):**

KORA cannot calculate the KORA Index directly from company-level aggregates. The KORA Index is a function of the distribution of PIBs across the workforce — not just the total. Activation Rate, Worker Balance, Pillar Balance, Equity, and Continuity all require knowledge of individual-level PIB values. Bypassing PIB would make these components uncalculable. The 14-stage flow is not negotiable on this point.

**PIB privacy rules:**

- PIB records are internal analytical records — they are never shown to the employer at the individual level
- The employer sees activation rates, participation bands, and distribution shapes derived from the aggregate of PIB records — not the PIB of any specific worker
- PIB records are pseudonymized — there is no path from a PIB record to a named employee without accessing the Worker Identity Layer, which no employer role can do
- PIB is not an employee performance score. A lower PIB does not indicate a worse employee — it reflects program access, time availability, and segment characteristics, not individual quality.

**Worker-facing PIB:** In the future Ecosystem tier, workers will be able to see their own PIB and its pillar breakdown through a worker-facing app. This is explicitly out of scope for Foundation Light. The PIB record exists in the architecture from day one; the worker-facing interface is a future phase.

---

## 15. Company Aggregation

**Stage ⑫**

**What this layer is:** The company-level aggregation of all PIB records for a company program and period. This layer produces the statistical inputs that the KORA Index Engine requires.

**Key outputs:**

| Output | Description |
|---|---|
| **Company Total IU** | Σ PIB across all Anonymized Worker Profiles in the program |
| **Average PIB** | Mean PIB across all workers (activated and inactive) |
| **Median PIB** | Median PIB — more robust than average to extreme concentration |
| **Gini coefficient** | Distributional inequality measure — high Gini indicates impact concentrated in few workers |
| **PIB distribution** | Distribution of workers across PIB bands (zero / low / medium / high) |
| **Pillar Totals** | Total IU by pillar for the full workforce |
| **Pillar distribution per worker** | Per-worker pillar balance, used to calculate workforce-level Pillar Balance |
| **Activation indicators** | Count of activated workers (PIB > threshold) vs total eligible workforce |
| **Verification distribution** | IU distribution by evidence level |

**Critical distinction: Company Total IU ≠ KORA Index**

High Company Total IU does not indicate a high-quality program if:
- IU is concentrated in one pillar (pillar imbalance)
- IU is generated by low-quality self-declared events (low verification rate)
- IU is concentrated in a small group of highly active workers (low activation breadth)
- The Activation Safeguard detects low distributed activation

The Company Aggregation layer produces statistics. The KORA Index Engine interprets those statistics. They are not the same.

---

## 16. Activation Safeguard

**Stage ⑬ — Mandatory architectural layer**

**What this layer is:** The structural mechanism that prevents high impact quality among a small active group from fully compensating low distributed activation across the workforce. The Activation Safeguard was added in Architecture v3 specifically because the StressTest identified Scenario B — low participation + high quality — as a model weakness in the 7-component doc 06 architecture.

**Why this layer is mandatory:** A KORA Index that rewards a company where 10% of workers have very high PIBs, while 90% have PIB = 0, is measuring the quality of a program for a minority — not the people-impact maturity of the organization. The Activation Safeguard ensures that breadth of genuine activation is a non-negotiable dimension of the KORA Index, not a dimension that can be compensated away by quality.

**Core components:**

| Component | Description |
|---|---|
| **Activation Rate (AR)** | Proportion of eligible workers who reached the minimum activation threshold in the period. AR = activated workers / total eligible workers. |
| **Meaningful Activation Rate (MAR)** | Proportion of eligible workers who reached a meaningful threshold — a higher bar than the minimum activation threshold. Workers above the MAR threshold have genuine, substantive engagement — not just a single touchpoint. |
| **Low Activation Penalty** | When AR or MAR falls below defined thresholds, a penalty is applied that reduces the maximum achievable KORA Index. The penalty is proportional to the severity of the activation gap. |
| **Ceiling Rule** | When low activation is detected, a ceiling is applied to the KORA Index — regardless of how high the quality metrics are among the active minority. High quality among few workers cannot fully compensate low reach across many. |

**Activation thresholds:** Activation threshold values (minimum AR, minimum MAR, penalty functions, ceiling levels) are empirically calibrated, not fixed. Current values in any pre-calibration version are provisional prior estimates. They must not be treated as final until calibration data from real pilots is available. (AG-04)

**Relationship to StressTest results:** The StressTest Scenario B showed that without the Activation Safeguard, a company with AR = 20% and very high PIBs among active workers could achieve a KORA Index close to the baseline. The Activation Safeguard corrects this. The StressTest company baseline (AR = 90%, MAR = 60%, KORA Index = 68.6) is the numerical reference for understanding where these thresholds need to be set.

---

## 17. KORA Index Engine — Architecture v3

**Stage ⑭**

**What this layer is:** The final computation engine that produces the KORA Index — the primary company-level intelligence output of the KORA platform. The KORA Index is a function of 10 components. This is the Architecture v3 structure, which supersedes the 7-component structure in doc 06 per founder Decision 2 (doc 09 Section 12).

**KORA Index v3 is canonical.** Previous equal-weight assumptions (0.10 × 10 components) were provisional scaffolding and are no longer canonical.

**The KORA Index v3 formula:**

```
KORA Index = f(AR, MAR, NI, WB, PC, PB, EQ, VR, CO)
           organized into 4 macroblocks:

  25% Activation Reach       — AR, MAR
  30% Activation Quality     — NI, VR, CO
  25% Distribution & Equity  — WB, PC, PB, EQ
  20% Budget-to-Human-Impact — BudgetToHumanImpactEngine
```

**Confidence Score (CS) is external.** CS is not a weighted component in KORA Index v3. It is an external reliability indicator displayed alongside the KORA Index — an inseparable output pair, but CS does not influence the KORA Index value. The two are always shown together; CS informs interpretation but does not enter computation.

**Activation Safeguard is an interpretation gate.** The Activation Safeguard (CLEAR / WARNING / FLAGGED) is applied after KORA Index computation. It is not a weighted component and does not modify the KORA Index value — it contextualizes it.

**The 10 components — definitions and v3 macroblock assignment:**

| Component | Symbol | Macroblock | Definition |
|---|---|---|---|
| **Activation Rate** | AR | Activation Reach (25%) | Proportion of eligible workers who reached the minimum activation threshold. Measures distributional breadth of engagement. |
| **Meaningful Activation Rate** | MAR | Activation Reach (25%) | Proportion of eligible workers who reached a meaningful (higher) activation threshold. Distinguishes genuine engagement from minimal touchpoints. |
| **Normalized Intensity** | NI | Activation Quality (30%) | Average depth of engagement among activated workers — the average quality-weighted PIB per activated worker, normalized. Measures how substantive the engagement is among those who participated. |
| **Worker Balance** | WB | Distribution & Equity (25%) | Distribution health across the workforce — measures whether impact is spread across diverse worker segments or concentrated among a few. |
| **Pillar Coverage** | PC | Distribution & Equity (25%) | The proportion of the five pillars that have at least a minimum level of verified activation. A company with no activation in one or more pillars has incomplete coverage. |
| **Pillar Balance** | PB | Distribution & Equity (25%) | The relative balance of IU distribution across the five pillars. Rewards companies that develop impact across all five dimensions rather than over-indexing on one. |
| **Equity** | EQ | Distribution & Equity (25%) | Measures whether activated workers are distributed equitably across workforce segments — departments, seniority bands, contract types. High equity means impact is not systematically concentrated in privileged or high-participation segments. EQ must never be redefined as Evidence Quality — evidence quality is handled by VR and CS. |
| **Verification Rate** | VR | Activation Quality (30%) | The proportion of total IU that is backed by strong evidence (verified or certified), versus self-declared. High VR indicates a program whose impact claims are defensible. |
| **Continuity** | CO | Activation Quality (30%) | The proportion of activated workers who show sustained, recurring engagement over the period — not just one-off participation. Measures program stickiness and long-term behavioral change. |
| **Confidence Score** | CS | **External** — weight = 0 | The overall methodological reliability of the KORA Index for this company program and period. Captures data completeness, source quality, verification coverage, and the quality of the evidence base. **CS is external to KORA Index v3 computation.** It is always displayed with the KORA Index but does not influence the KORA Index value. |

**KORA Index v3 macroblock weights — v0.1 pre-empirical calibration:**

| Macroblock | Weight | Components | Within-macroblock weight |
|---|---|---|---|
| Activation Reach | 25% | AR, MAR | 50% each |
| Activation Quality | 30% | NI, VR, CO | ~33% each |
| Distribution & Equity | 25% | WB, PC, PB, EQ | 25% each |
| Budget-to-Human-Impact | 20% | BudgetToHumanImpactEngine | (computed from spend classification, activation debt, and efficiency metrics — not from component values) |

**Effective component weights in KORA Index v3:**
AR 12.5% · MAR 12.5% · NI ~10% · VR ~10% · CO ~10% · WB 6.25% · PC 6.25% · PB 6.25% · EQ 6.25% · BTI Engine 20% · CS 0% (external)

All weights labeled **"v0.1 pre-empirical calibration"** — subject to expert validation and empirical calibration through the Delphi Study. (AG-03, MV-01, MV-02)

**Migration note:** Previous equal weights (0.10 × 10 components, including CS as a weighted component) were provisional scaffolding used in the Foundation Light pre-build phase. They are retained only in `data/methodology/methodology-config.json` under `legacy_equal_weights_note` for backwards compatibility. They are not canonical for KORA Index v3 computation or documentation.

**What changed from doc 06 to Architecture v3:**

| Dimension | Doc 06 (7 components) | Architecture v3 (10 components) |
|---|---|---|
| Activation | AR (one component) | AR + MAR (two separate components — breadth and meaningfulness separated) |
| Workforce distribution | Not explicit | WB (Worker Balance — new dedicated component) |
| Confidence | Not a KORA Index component | CS included as a component — two identical-scoring companies with different confidence are methodologically different |
| Weights | Fixed prototype weights | Empirically to be calibrated |
| Activation governance | No structural safeguard | Activation Safeguard (Stage ⑬) mandatory before index engine |

---

## 18. KORA Index Output

**Output of Stage ⑭**

The KORA Index and its Confidence Score are inseparable outputs. Every KORA Index record must carry both values. A KORA Index without a Confidence Score is an incomplete output.

**KORA Index output record attributes:**

| Attribute | Description |
|---|---|
| `kora_index_value` | Calculated score, 0–100 |
| `confidence_score` | Reliability level of this score |
| `methodology_version` | Version of the KORA methodology under which this index was calculated |
| `component_scores` | Individual scores for each of the 10 components (AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS) |
| `component_weights` | Weights applied to each component (labeled "pre-empirical calibration" in current versions) |
| `company_program_id` | Company program reference |
| `reporting_period` | Period covered |
| `computation_timestamp` | When this KORA Index was calculated |
| `ingestion_batch_ref` | Which approved ingestion batch(es) this score is derived from |
| `activation_safeguard_status` | Whether the Activation Safeguard triggered any penalty or ceiling |
| `data_quality_warnings` | Any data quality flags that affect the interpretation of this score |
| `explanation_summary` | Plain-language breakdown of score drivers |
| `data_limitations` | What data gaps exist that affect this score |
| `status` | Provisional / Final / Certified |
| `change_vs_prior` | Delta against prior period (if available) |

**KORA Index display and interpretation rules:**

- The KORA Index is always displayed alongside its Confidence Score. A 72 with low confidence is a different statement from a 72 with high confidence.
- Score explanations must be available for every KORA Index output. Black-box outputs are not permitted. (AG-02)
- Historical KORA Index records are permanently locked to the methodology version that produced them. They are never recalculated retroactively when a new methodology version is published. (Founder Decision 5 — doc 08)
- The KORA Index is not an average PIB, not a total IU, not a function of budget, and not a function of partner count. These confusions must be prevented architecturally and through explainability design.

---

## 19. Complementary Layers

These layers are outputs of the KORA platform that are produced alongside the KORA Index but are architecturally separate from it. They do not enter the KORA Index formula. They provide additional dimensions of intelligence that complement the KORA Index.

| Layer | Type | What it measures | Enters KORA Index? |
|---|---|---|---|
| **KORA Evolution** | Analytics | Time-series tracking of the KORA Index and its components over successive reporting periods | No — it is a time-series reading of the Index |
| **KORA Contribution** | Complementary index | Social and territorial contribution generated by the organization — primarily linked to the IMPACT pillar but independent of the KORA Index | No — separate indicator. A company may have high internal KORA Index but low external contribution, or vice versa. |
| **KORA Value Chain** | Complementary indicator | Quality of verified relationships in the partner and advisor ecosystem — measures depth of relationships, not count of connections | No — separate indicator |
| **Ecosystem Reach** | Dashboard-only | Availability of services and partners — how broad and diverse is the program offering | No — availability is not impact. This is explicitly a dashboard-only KPI. |
| **Ecosystem Effectiveness** | Complementary indicator | Conversion of available ecosystem capacity into real Impact Units — the proportion of the available ecosystem that actually generates verified IU | No — indirect effect only through actions that generate IU |
| **Personal Top-Up Continuity** | Behavioral signal | Rate at which workers voluntarily continue using services after exhausting company-funded budgets — a signal of perceived value, not direct impact | No — behavioral signal only |
| **KORA Certification / Public Status** | Governance indicator | Achievement of KORA certification tiers (Access / Foundation / Governance / Certified) — depends on a multi-period track record, not a single KORA Index value | No — depends on KI trend, not a KI component |

**KORA Contribution** deserves specific note: it is a separate, independently calculated indicator. The IMPACT pillar generates IU that enters the PIB and KORA Index through the standard pipeline. KORA Contribution is an additional signal that captures the broader external impact at the organizational level — territory, community, verified beneficiaries, external partnerships. These two signals are complementary, not duplicative.

---

## 20. Outside KORA Index — Explicit Exclusions

The following elements must never enter the KORA Index. They are listed here explicitly because they represent the most common conceptual errors that would compromise the platform's methodological integrity.

| Element | Reason for exclusion |
|---|---|
| **Budget available or spent** | Measures economic input, not behavioral output. A large welfare budget with zero activation contributes nothing to human value. |
| **Number of partners available** | Measures supply-side availability. Partners available but unused generate zero PIB. |
| **Catalog size / marketplace breadth** | Offer breadth is not impact. The availability of 200 services does not generate one Impact Unit. |
| **KORA Ecosystem Reach** | Explicit dashboard-only KPI. Availability ≠ impact. Confirmed in Architecture v3 Change Log. |
| **GHG / Scope 1/2/3 / environmental metrics** | Corporate environmental metrics belong to the ESG Reporting Layer — they are organizational-level reporting metrics, not individual human actions that generate PIB. |
| **Raw event count (unweighted)** | Quantity without quality is manipulable and meaningless as impact evidence. |
| **Superficial engagement metrics** | Unverified surveys, internal newsletter opens, app downloads without activation. |
| **Theoretical service availability** | A service that is available but unused generates zero PIB. |
| **Partner network score** | Measures capacity, not actual impact generated through that capacity. |
| **Budget per worker** | Correlated with spending, not with actions and Impact Units. |
| **Utilization rate (as an input)** | Service utilization is a useful operational KPI, but it does not directly measure impact quality. The actions generated by utilization enter through the IU pipeline. |
| **Reporting readiness** | Preparedness for reporting is a governance indicator, not a people-impact measure. |
| **Advisor network size** | Governance capability — not behavioral output. |

---

## 21. Financial Governance Layer

**Layer classification: GOVERNANCE — not INPUT to KORA Index**

**What this layer is:** The decision support system for budget management, cost-per-impact analysis, partner efficiency, and financial intelligence. The Financial Governance Layer helps companies understand the return on their people-investment in financial terms.

**What it does not do:** The Financial Governance Layer does not influence the KORA Index. A company that spends more does not score higher. A company that operates efficiently with a smaller budget may score higher if its verified human impact is strong. The financial and impact dimensions are parallel, not causal.

**Core financial governance outputs:**

| Output | Description |
|---|---|
| **Budget activation ratio** | Budget allocated vs budget actually used through verified activations |
| **Cost per Impact Unit** | Total spend ÷ Total verified IU — efficiency of spend |
| **Pillar spend distribution** | Budget allocation across the five pillars |
| **Partner efficiency score** | IU generated per euro of spend per partner |
| **Budget vs impact alignment** | Is spending proportional to impact output? Which pillars are overfunded or underfunded relative to their IU contribution? |
| **Underfunded / overfunded signals** | Where should the next allocation go? |

**Relationship to KORA Index:** Financial governance indicators are displayed alongside the KORA Index as a separate analytical dimension. Leadership can see both: "Our KORA Index is 72 with high confidence" AND "Our cost per IU in GROWTH is 40% higher than in LIFE — we may be over-investing in low-efficiency training programs." These are complementary insights, not the same insight.

**Foundation Light scope:** Foundation Light delivers a financial governance summary — budget overview, high-level cost-per-impact estimates, pillar spend distribution — based on the financial data the company provides alongside its welfare and activity data. Full financial governance with granular cost attribution, partner payouts, and automated reconciliation is a Foundation and Governance tier feature.

---

## 22. Fiscal & Policy Eligibility Layer

**Layer classification: ELIGIBILITY — not INPUT to KORA Index**

**What this layer is:** The governance layer that maps services, actions, and spending to the applicable fiscal and regulatory frameworks — specifically Italian welfare aziendale legislation, fringe benefit perimeters, training fiscal categories, and other applicable frameworks.

**The fundamental separation:** Fiscal eligibility and impact measurement are parallel, independent dimensions. A service can be:
- Fiscally eligible AND high impact (gym membership used regularly)
- Fiscally eligible AND low impact (a service that is rarely activated despite eligibility)
- NOT fiscally eligible AND high impact (a company-specific program outside standard perimeters but generating verified engagement)
- NOT fiscally eligible AND low impact (self-funded activity with no verification)

These four combinations must be representable without one dimension contaminating the other. Eligibility does not raise or lower the KORA Index. Impact does not determine fiscal eligibility.

**Nine fiscal categories (from Fiscal Categories & Guardrails reference document):**

| Category | Description |
|---|---|
| `welfare_51tuir` | Welfare aziendale under Italian TUIR Art. 51 |
| `fringe_benefit` | Fringe benefits with applicable thresholds |
| `formazione` | Training and professional development (legally deductible) |
| `hse` | Health, Safety, and Environment programs |
| `csr_esg` | CSR and ESG-related company activities |
| `hr_discretionary` | HR discretionary spend outside specific perimeters |
| `employee_paid` | Employee co-payments and personal spending |
| `co_funded` | Joint company-employee funded services |
| `non_monetary` | Non-monetary benefits and recognition programs |

**Three distinct concepts in the Eligibility Layer:**

This layer operates through three concepts that must never be merged. Each answers a different question.

---

**1. Eligibility Status** — *What is the fiscal/policy classification of this service or action?*

Eligibility Status is the classification assigned to a partner service or action with respect to a specific fiscal/budget perimeter. It describes the result of the classification decision.

| Status | Meaning |
|---|---|
| `Eligible` | The service qualifies under this perimeter under standard conditions |
| `Conditional` | The service qualifies under this perimeter only when specific conditions are met (e.g., minimum hours, documentation requirement, worker category) |
| `Uncertain` | The classification cannot be determined from available information — requires review |
| `Excluded` | The service does not qualify under this perimeter |

Eligibility Status is a property of a service-perimeter pair, not of an individual transaction. A single service may have different Eligibility Status values across different perimeters simultaneously.

---

**2. Eligibility Confidence** — *How reliable is the Eligibility Status classification?*

Eligibility Confidence describes who produced the classification and what evidence supports it. Two services can share the same Eligibility Status (e.g., both `Eligible`) but carry very different levels of trust depending on who classified them and how.

| Confidence Level | Meaning |
|---|---|
| `Advisor-Confirmed` | A qualified external advisor (labor law or tax specialist) has reviewed and confirmed this classification |
| `KORA Advisor-Confirmed` | A KORA-authorized advisor has reviewed and confirmed this classification within KORA's structured review workflow |
| `Partner-Documented` | The partner has provided formal documentation supporting this classification (e.g., regulatory opinion letter, product specification) |
| `Partner-Declared` | The partner has self-declared the classification without formal supporting documentation |
| `KORA-Inferred` | KORA has inferred the classification from taxonomy rules and available data — not yet validated by a human reviewer |
| `Pending Review` | A classification exists but is awaiting human or advisor review before it can be relied upon |
| `Outdated — Requires Review` | A prior classification exists but the applicable regulation, perimeter rules, or service conditions have changed — the classification must be reviewed before use |

Eligibility Confidence does not affect the KORA Index. It affects the reliability of financial governance decisions and the defensibility of fiscal claims made by the company.

---

**3. Fiscal Guardrails Result** — *What is the operational decision for this specific transaction or activation?*

The Fiscal Guardrails Result is the output of the Fiscal Guardrails Engine for a specific activation or financial movement — not a classification of the service in the abstract, but an operational decision about this particular transaction in this particular context.

The Guardrails Engine runs a 12-step fail-safe control sequence. The output is one of six result states:

| Result State | Meaning |
|---|---|
| `approved` | This transaction is cleared to proceed under the applicable perimeter |
| `approved_with_warning` | This transaction is cleared but one or more conditions were noted — documentation or review recommended |
| `blocked` | This transaction cannot proceed under the applicable perimeter as currently configured |
| `requires_advisor_validation` | This transaction cannot be resolved by the engine alone — a qualified advisor must review before it proceeds |
| `requires_payroll_review` | This transaction intersects with payroll or compensation implications that require HR or finance review |
| `outside_welfare_scope` | This transaction does not fall within any defined welfare or fiscal perimeter — it may proceed as a standard company expense but carries no fiscal advantage |

The Guardrails Engine applies the fail-safe principle: in the absence of clear confirmation, the engine defaults to the more conservative result. A `KORA-Inferred` Eligibility Confidence is not sufficient to produce an `approved` Guardrails Result for high-stakes budget categories.

**Relationship between the three concepts:**

```
Eligibility Status    → What the service is classified as (Eligible / Conditional / Uncertain / Excluded)
Eligibility Confidence → How reliable that classification is (Advisor-Confirmed → Outdated)
Guardrails Result     → What the engine decides for this specific transaction (approved → outside_welfare_scope)
```

A service with `Eligible` status and `KORA-Inferred` confidence may still produce a `requires_advisor_validation` Guardrails Result because the confidence level is insufficient for automatic approval. A service with `Conditional` status and `Advisor-Confirmed` confidence may produce `approved` if all conditions are met for this specific transaction.

---

**Foundation Light scope:** Foundation Light delivers Eligibility Status tagging and Eligibility Confidence display — showing the company which services fall into which fiscal categories and how reliable those classifications are. The full Guardrails Engine producing per-transaction operational results is a Governance tier feature. At Foundation Light, the Guardrails Engine output is a summary-level signal, not a transaction-by-transaction enforcement mechanism.

---

## 23. ESG / GHG / Sustainability Layer

**Layer classification: REPORTING — not INPUT to PIB or KORA Index**

**What this layer is:** The sustainability reporting layer that captures company-level environmental, social, and governance metrics — GHG Scope 1/2/3, ESRS S1/S3/E1 data, energy, mobility — and structures them for ESG reporting purposes.

**Critical architectural separation:**

The ESG Layer operates in two distinct modes that must never be conflated:

**Mode 1 — Individual actions with social externality (enters IU pipeline):**
When individual workers take verified actions that have social or environmental impact — volunteering, environmental initiatives, school orientation programs, community contribution — these actions are classified to the IMPACT pillar through the standard IU pipeline. They generate Impact Units. They contribute to PIB and, through the standard flow, to the KORA Index. This is the correct pathway.

**Mode 2 — Company-level environmental metrics (enters ESG Reporting Layer only):**
When the company reports aggregate environmental metrics — total emissions, energy consumption, scope reductions, supplier engagement scores — these are organizational-level data that describe the company's environmental footprint. They do not map to individual human actions. They do not generate Impact Units. They do not enter PIB or the KORA Index. They are captured in the ESG Reporting Layer for compliance reporting and investor communication.

**The confusion to avoid:** An ESG score that combines individual human actions (Mode 1) with corporate environmental metrics (Mode 2) into a single composite would produce an analytically meaningless result. KORA's KORA Contribution index measures the verified social contribution generated by individual actions (Mode 1). The ESG Reporting Layer captures Mode 2 metrics as a separate reporting dimension.

---

## 24. Advanced Layers

These are analytical and governance layers that are architecturally defined in Architecture v3 but are not part of Foundation Light scope. They are specified here to ensure the technical data model and database schema support them from day one, even if they are not actively used in Foundation Light.

| Layer | Status | Description |
|---|---|---|
| **Equity & Inclusion Layer** | Advanced / Future | Measures distributional equity of activation — bottom 20%, department gaps, shift worker gaps, accessibility. High Equity (EQ) in the KORA Index captures this dimension at a summary level; the full Equity Layer provides detailed disaggregated analysis. |
| **Next Best Action Engine** | Advanced / Future | Transforms measurement into governance recommendations — pillar gap recommendations, activation improvement suggestions, verification enhancement priorities, partner utilization optimization. Not a passive reporting layer. |
| **Outcome Correlation Layer** | Research / Future | Correlates KORA indicators with company business outcomes (turnover, retention, absenteeism, safety incident rates) over time. KORA does not declare causality before longitudinal validation. Correlation ≠ causality. (AG-07) |
| **Benchmark & Normalization Layer** | Advanced / Future | Makes the KORA Index comparable across companies by normalizing for sector, company size, geography, workforce mix, and program maturity. The KORA Index must become naïvely comparable before benchmark layers are introduced. |
| **Public / External Proof Layer** | Governance / Future | QR-verifiable KORA Index snapshots, certified badges, public methodology statements. Multiple levels: private / advisor-visible / executive / public. |
| **Human Review & Advisor Audit Log** | Advanced | Structured logging of all advisor interventions — which records were reviewed, validation or rejection decision, before/after status, reason code, timestamp. (DG-06) |
| **Methodology Versioning Layer** | Core (infrastructure) | Tracks all methodology versions, their components, their change logs, and which scoring outputs were produced under which version. Core from day one. |
| **Confidence Score Layer** | Core | Confidence Score is **external to KORA Index v3 computation** (weight = 0 in KORA Index). It is always displayed alongside the KORA Index as a reliability indicator — the two are inseparable outputs — but CS does not influence the KORA Index value. CS is also a standalone reliability signal for all other platform outputs. Core from day one. |

---

## 25. Stakeholder Dashboard Implications

Architecture v3 defines four distinct stakeholder dashboards. Each dashboard has a defined scope — what the stakeholder can see, what they cannot see, and which KPIs are relevant to their role. The dashboard design must enforce the privacy boundaries defined in Section 6 and doc 07 Section 34.

**Four dashboards:**

### Company Dashboard

**Can see:**

Foundational KPIs:
- KORA Index + Confidence Score
- KORA Evolution (time-series)
- KORA Contribution
- Avg / Median PIB (aggregate, anonymous)
- Activation Rate + Meaningful Activation Rate
- Worker Balance
- Pillar Coverage / Balance
- Verification Rate
- Event Quality
- Continuity
- Risk Alerts
- Next Best Actions (when available)

Operational KPIs:
- Workforce Activation Quality
- Pillar Gap Index
- Program Efficiency Index (dashboard-only — not KORA Index)
- Verification Health Score
- Impact Risk Alert Index

**Must not see:**
Named individual PIB values / individual health or psychological data / high-sensitivity event records / segment data below safe aggregation threshold (default: 10 individuals) / any data that could enable re-identification

### Worker Dashboard

*Future Ecosystem tier — not Foundation Light. Defined here for architectural completeness.*

Foundational KPIs:
- Personal PIB (individual's own — not others')
- Personal Pillar Profile
- Dynamic Impact CV
- Verified actions
- Available budget
- Personal top-up
- Suggested actions
- Privacy controls

Operational KPIs:
- Personal Pillar Balance
- Personal Growth Trajectory
- Verified Skill Progress
- Personal Continuity Score
- Impact Identity Badge Level

**Privacy constraint:** The worker's personal dashboard shows only their own data. Workers cannot see other workers' PIBs, company-level aggregate scores, or any other worker's data.

### Partner Dashboard

Operational KPIs:
- Events generated for company programs
- Bookings processed
- Workers served
- IU generated through partner services
- User continuity rates
- Service feedback
- Integration quality indicators

Specialized KPIs:
- Partner Verification Quality
- Partner Impact Contribution
- Partner Continuity Rate
- Service Fit Score
- Partner Reliability Index

**Critical rule:** Partners do not have a KORA Index of their own. Partners are not scored on the same scale as companies. The partner dashboard contains operational and service-quality KPIs — not a people-impact maturity index.

### Advisor Dashboard

Operational KPIs:
- Methodology quality indicators
- Eligibility validation coverage
- Governance quality
- Audit trail coverage
- Risk resolution metrics
- Ecosystem design quality
- Post-intervention improvement

Specialized KPIs:
- Advisor Validation Coverage
- Advisory Impact Improvement
- Methodology Compliance Score
- Risk Resolution Rate
- Ecosystem Design Quality

**Privacy constraint:** Advisors see only the data within their authorized review scope. They do not have access to company financial records outside their review mandate, and they do not access individual worker records.

---

## 26. Algorithm Governance Notes

These governance notes are the canonical set carried from Architecture v3. They are binding constraints on all implementation decisions.

**AG-01:** Every KORA Index calculation must pass through individual PIBs. It is not permitted to calculate the KORA Index directly from company-level aggregate data. PIB is the mandatory intermediate layer.

**AG-02:** The IU formula is public and versioned. No black-box scoring is permitted anywhere in the KORA pipeline. Every score must be explainable in terms of its component inputs.

**AG-03:** The weights of the KORA Index components are theoretical priors — declared as "to be empirically calibrated" in all versions until empirical calibration is complete. They must be published with this status label and never presented as validated.

**AG-04:** The Activation Safeguard thresholds must be empirically calibrated. Current threshold values (activation floors, penalty functions, ceiling rules) are provisional estimates. They must be labeled as pre-calibration values and updated as pilot data accumulates.

**AG-05:** Every KORA Index output must carry a Confidence Score. Two companies with the same KORA Index value but different Confidence Scores are methodologically different situations. High confidence + high index means strong program with good evidence. High confidence + low index means weak program that is measured reliably. Low confidence + any index means the score should be treated with caution.

**AG-06:** The anti-gaming system is structural, not primarily detection-based. Caps + low verification penalties + Activation Safeguard reduce the impact of gaming without requiring case-by-case detection. The system should be designed so that gaming is not worthwhile structurally, not just detectable.

**AG-07:** KORA does not declare causal relationships between KORA Index values and business outcomes (retention, absenteeism, safety) without longitudinal validation. Correlation studies may be shared with appropriate caveats. Causal claims require validated longitudinal data.

**AG-08:** Human Review can validate or reject evidence — it cannot arbitrarily increase scores. An advisor confirming a record upgrades the EV value appropriately. An advisor cannot directly set a worker's PIB, override an IU value, or inflate the KORA Index through an intervention without a corresponding evidence record.

---

## 27. Data Governance Notes

These notes govern how data is managed, traced, and governed throughout the KORA system.

**DG-01:** Every scoring output carries version references for: algorithm version / BCM version / NM rules version / Correction Factors version / KORA Index weights version. These are five potentially distinct versioned components, each of which can change independently.

**DG-02:** When the methodology version changes, historical scores remain associated with the version that produced them. Historical scores are never silently recalculated. If a comparison across versions is required, it must be explicit — labeled as a cross-version comparison, not a continuous trend.

**DG-03:** Every Impact Unit is traceable to: its originating UEF Record / the pseudonymized worker / the data source. This traceability must be maintained as an audit trail requirement, not lost through aggregation.

**DG-04:** The Data Quality Engine verifies the technical reliability of data — completeness, format correctness, internal consistency. This is separate from the Anti-Gaming layer, which detects methodological gaming patterns. A technically correct record can still trigger anti-gaming controls.

**DG-05:** Every rejected record must have a documented rejection_reason code stored in the audit trail. Batch-level rejection rates must be visible in the ingestion quality report.

**DG-06:** Every advisor intervention must record: advisor identifier / timestamp / reason code / affected record / before-state / after-state. Advisor interventions are changes to evidence status, not direct score manipulations.

---

## 28. Privacy Notes

These notes govern privacy by design across the full KORA architecture.

**PR-01:** Pseudonymization occurs at the moment of ingestion — before any analytical processing. It is not a post-processing step applied after analysis. Identifiable data never enters the analytical pipeline.

**PR-02:** Diagnoses, psychological treatment content, medical notes, and other sensitive personal data are masked or excluded before the record enters the UEF. The company receives aggregated participation signals, not personal health content.

**PR-03:** The company sees anonymized, aggregated workforce intelligence. It does not receive individually attributable data — not by PIB, not by segment below the safe aggregation threshold, not by event-level detail that could re-identify an individual.

**PR-04:** KORA measures verified participation in programs and activities. It does not measure the content of what was discussed in a therapy session, the nature of a medical condition, or the reason a worker attended a specific program.

**PR-05:** The legal basis for processing each event type is documented in the UEF Record. GDPR compliance requires that every category of personal data has a documented legal basis. This documentation is part of the UEF structure, not an afterthought.

**PR-06:** Sensitive demographic data used for equity analysis (gender, age, disability status) may only be included where legally and ethically permitted, with appropriate consent or legal basis. Equity analysis must be possible at the aggregated anonymized level even without disaggregated demographic attributes.

**Safe aggregation threshold:** The minimum group size for employer-visible segment analytics is 10 individuals (default, configurable by legal counsel). Segments below this threshold are suppressed. High-sensitivity segment types may require higher thresholds or exclusion.

---

## 29. Methodology Versioning Notes

**MV-01:** BCM v1.0 is a theoretical prior — the product of expert reasoning before empirical data collection. It is the starting point for the Delphi Study validation (Phase 1 of the validation roadmap).

**MV-02:** All current parameters are pre-empirical calibration. This status must be declared in every document, report, and external communication that references KORA methodology parameters. No parameters may be presented as validated until the validation roadmap phase that validates them is complete.

**MV-03 — Validation roadmap:**

| Phase | Activity | Status |
|---|---|---|
| Phase 1 | Simulated stress test (completed — StressTest document) | Complete |
| Phase 2 | Real pilot with first company dataset | Foundation Light |
| Phase 3 | BCM Delphi Study (15–20 domain experts validate BCM weights) | Post-Foundation Light |
| Phase 4 | Statistical weight calibration from pilot data | Post-Delphi |
| Phase 5 | Sector-specific benchmarking | Advanced |
| Phase 6 | Academic / peer validation | Advanced |
| Phase 7 | Independent methodology audit | Certified tier |
| Phase 8 | Algorithm v1.0 declaration | Post-calibration |
| Phase 9 | Longitudinal outcome correlation study | Research |
| Phase 10 | KORA Certified — external methodology validation | Certified tier |

**MV-04:** Every methodology release has a public change log and a version number. Version numbers follow the format: v[major].[minor]. A change to weights or core formulas increments the major version. A change to parameters within existing formulas (e.g., new NM cap values) increments the minor version.

**Versioned components (separately numbered):**

- IU formula and coefficients
- BCM (Base Contribution Matrix)
- NM rules and caps
- KORA Index component definitions and weights
- KORA Contribution formula
- KORA Ecosystem Reach formula
- Confidence Score model parameters
- Pillar mapping taxonomy
- Fiscal/budget taxonomy
- Eligibility confidence model
- Anti-gaming rules and caps
- Privacy threshold definitions

---

## 30. Relationship to StressTest

*Reference: KORA_StressTest_Algoritmico_v1.md.pdf — Primary numerical validation reference (founder Decision 6, doc 09 Section 12)*

The StressTest is the primary numerical reference for understanding how the KORA algorithm behaves under real-world conditions. It is the closest available analogue to empirical validation before real pilot data is available.

**Key reference values from the StressTest:**

| Indicator | Value |
|---|---|
| Company Total IU | 641.80 |
| Average PIB | 12.836 |
| KORA Index (baseline) | 68.6 / 100 |
| Activation Rate (AR) | 90% |
| Meaningful Activation Rate (MAR) | 60% |

**Six stress scenarios tested:**

All six stress scenarios produce KORA Index values at or below the baseline (68.6). This is the expected behavior — a stress test that produces higher scores under worse conditions would indicate a flawed model.

**Scenario B (low participation, high quality):** This scenario confirmed the Activation Safeguard as a necessary architectural addition. Without Stage ⑬, a company with AR = 20% and very high PIBs among active workers could achieve a near-baseline KORA Index. The Activation Safeguard corrects this by ensuring that low distributed activation cannot be fully compensated by high quality among a few.

**Factor value ranges validated through StressTest:**

| Factor | Validated range |
|---|---|
| CQ (Content Quality) | 0.50 – 1.20 |
| EV (Evidence/Verification) | 0.50 – 1.00 |
| CF (Continuity Factor) | 1.00 – 1.20 |
| AGF (Anti-Gaming Factor) | 0.00 / 0.30 / 0.50 / 0.80 / 1.00 |
| DF (Durability Factor, optional) | 1.00 – 1.30 |
| EXF (Externality Factor, optional) | 1.00 – 1.20 |
| SF (Strategic Fit, optional) | 0.80 – 1.10 (default 1.00) |

**Alignment with Architecture v3:** The StressTest uses current canonical factor naming throughout (NM, EV, CQ, CF, AGF, DF, EXF). It does not use old WhitePaper v3 naming (ES, EF, RF, SQ, PA). It is fully coherent with Architecture v3 and doc 06. The only addition not explicitly in the doc 06 formula that appears in StressTest examples is SF, which is now approved as an optional seventh factor (founder Decision 5, doc 09 Section 12).

**StressTest Appendix A:** An official summary of the StressTest (docs/appendices/A-stress-test-algoritmico-summary.md) is planned as the next document after this one. The full StressTest is the authoritative reference; the appendix will provide a condensed canonical summary for use in technical documents.

---

## 31. Relationship to Technical Data Model

**The technical data model (to be produced as doc 11) may not be finalized without consulting this document.**

This architectural specification defines what the technical schema must support. The technical data model translates these architectural requirements into concrete database tables, columns, foreign keys, indices, and access control rules.

**What this document provides to the technical data model:**

| Architectural element | Technical data model implication |
|---|---|
| 14-stage processing flow | Processing state fields on UEF Records, Ingestion Batches, and Impact Units |
| Canonical IU formula with 7 factors | Columns for NM, BC per pillar, CQ, EV, CF, AGF, DF, EXF, SF on Impact Unit records |
| 10-component KORA Index | 10 component score columns + weights + final score on KORA Index records |
| Activation Safeguard | AR, MAR, penalty status, ceiling status on KORA Index records |
| Privacy architecture | Separate database for Worker Identity Layer; pseudonymization key references; sensitivity flags on all event records |
| Methodology versioning | methodology_version foreign key on every scoring output |
| Confidence Score as external indicator + standalone | confidence_score on KORA Index records (always displayed; not a weighted input to the KORA Index value) and on individual event records |
| Audit trail | append-only audit trail table with event type, entity reference, before/after values, actor, timestamp |
| Factor value ranges | Validation constraints on correction factor columns |
| Source tier classification | source_tier field on UEF Records, referenced in EV calculation |
| BCM versioning | bcm_version reference on all Pillar Mapping and Base Contribution records |

**The technical data model must not introduce:**
- Budget fields as inputs to KORA Index calculation
- Direct connections between Fiscal/Eligibility entities and KORA Index entities
- Employer-accessible views that include individual PIB records
- Any mechanism that allows the 14-stage processing flow to be bypassed
- Scoring outputs without methodology_version references

**Five logical database stores (from doc 07 and founder decisions):**

| Store | Content | Access |
|---|---|---|
| Identity Store | Worker Identity Layer — identifiable worker data | KORA system processes + privacy admins only |
| Analytics Store | Anonymized Worker Profiles, UEF Records, Impact Units, PIBs, KORA Index | Role-based; no individual records to employer roles |
| Governance Store | Financial records, Policy Rules, Advisor Reviews, Reports | Role-based by function |
| Evidence Store | Evidence Records, document references, blob storage pointers | Controlled access with privacy flags |
| Audit Store | Audit Trail Records — append-only | Read-only for authorized review; write-only for system processes |

---

## 32. CLAUDE.md Update Required

The following updates to CLAUDE.md are required after this document is created.

**Documentation index (Section 7) — add entry:**

```
| 10 | docs/10-architecture-v3-layer-specification.md | KORA Architecture v3 — Layer Specification — Canonical Technical Architecture Reference |
```

**Document 10 in technical data model note — update renumbering:**
The existing `docs/10-technical-data-model-database-schema.md` (currently a draft) is to be renumbered to `docs/11-technical-data-model-database-schema.md` once doc 10 is established.

**Working Rules (Section 8) — add rule:**
```
26. No database schema may be designed or finalized without first consulting docs/10-architecture-v3-layer-specification.md. The 14-stage algorithm flow, the canonical IU formula, the 10-component KORA Index structure, and the Activation Safeguard are architectural requirements that must be reflected in every schema decision.
```

**Current Next Step (Section 10) — update:**
```
1. docs/appendices/A-stress-test-algoritmico-summary.md (immediate next — condensed canonical StressTest summary)
2. docs/appendices/B-whitepaper-v3-conceptual-extracts.md (approved historical extracts with current naming)
3. Formally incorporate Economic/Fiscal reference material into docs 03 and 04 (SVAM, FUO, nine fiscal categories, Guardrails Engine, Welfare Statement)
4. Finalize Technical Data Model as docs/11-technical-data-model-database-schema.md (renumbered from 10)
```

---

*KORA Architecture v3 — Layer Specification*
*Version: 1.0*
*Status: Canonical — Approved*
*Date: 2026-05-17*
*Aligned with: Methodological Constitution v0.1 (doc 06), Conceptual Data Model v0.1 (doc 07), Founder Technical Decisions v0.1 (doc 08), Source Materials Alignment Map with Founder Decisions (doc 09), KORA_Architecture_v3_Specs.md (reference), KORA_StressTest_Algoritmico_v1.md.pdf (numerical validation reference).*
*Supersedes: Any prior architecture description in reference files that conflicts with this document.*
*Next step: docs/appendices/A-stress-test-algoritmico-summary.md*
