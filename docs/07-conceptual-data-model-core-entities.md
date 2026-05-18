# KORA Conceptual Data Model & Core Entities

*Status: Approved — Foundational*
*Aligned with: Methodological Constitution v0.1*

---

## 1. Purpose of the Conceptual Data Model

The KORA Methodological Constitution defines how KORA thinks — its analytical principles, formulas, privacy boundaries and output definitions. The conceptual data model defines what KORA must know — the entities, relationships and information boundaries the platform must hold in order to produce the intelligence the methodology requires.

The technical database schema comes after the conceptual model. Building a schema without a conceptual model produces a database that reflects the convenience of implementation rather than the logic of the product. KORA's methodology is complex enough that implementing it without this intermediate layer would introduce structural errors that are very expensive to correct later.

**What the conceptual data model must preserve:**

- **Impact logic** — every entity must be assignable to a specific layer (INPUT / ACTIVITY / IMPACT / GOVERNANCE / ELIGIBILITY / EVIDENCE) without ambiguity
- **Privacy boundaries** — identifiable individual data must be architecturally isolated from employer-facing analytics; anonymized analytical data must be structurally separated from identifiable data
- **Fiscal eligibility separation** — eligibility is a governance dimension; it must not be modeled as a property of impact
- **Financial governance separation** — budget and spend must not be modeled as drivers of the KORA Index
- **Auditability** — every significant change to any entity must leave a traceable record
- **Methodology versioning** — every scoring and classification output must carry the version of the logic that produced it
- **Multi-tier product architecture** — entities must be categorized as Core, Basic, Advanced, Future or Not Applicable for each commercial tier, so that Foundation Light can be built without needing all entities active

**This document does not define tables, columns, foreign keys, or implementation stack.** It defines what the platform must understand — so that when the technical schema is built, every table and relationship has a clear conceptual mandate.

---

## 2. Entity Map Overview

KORA's conceptual data model consists of the following core entities, organized by the KORA layer they primarily belong to.

**INPUT layer entities** (what the company makes available)
- Organization / Company
- Company Program
- Financial Budget / Fund
- Fiscal / Budget Perimeter
- Partner
- Partner Service
- Data Source

**ACTIVITY layer entities** (what happened)
- Raw Dataset
- Ingestion Batch
- KORA Action / Event
- Universal Event Format Record

**IMPACT layer entities** (what the activity produced)
- Pillar
- Pillar Mapping
- Impact Unit
- PIB — Personal Impact Balance
- Company Impact Aggregate
- KORA Index
- KORA Contribution
- KORA Ecosystem Reach

**GOVERNANCE layer entities** (how to govern and decide)
- Financial Movement / Spend Record
- Policy Rule
- Advisor Review
- Report / Export
- User / Role / Permission

**ELIGIBILITY layer entities** (fiscal compliance and partner mapping)
- Eligibility Profile
- Eligibility Status
- Eligibility Confidence

**EVIDENCE layer entities** (what makes intelligence credible)
- Evidence Record
- Audit Trail Record
- Methodology Version
- Confidence Score

**Privacy bridge entities** (what separates identifiable from analytical)
- Worker Identity Layer
- Anonymized Worker Profile
- Workforce Segment

---

## 3. Organization / Company

**What it represents:** The primary customer account — the legal entity that has purchased or is piloting KORA. Everything in KORA belongs to, is configured by, or is produced for a Company.

**Why it exists:** KORA is a B2B product. Every dataset, program, score, report, budget and policy rule is owned by or associated with a specific company. The Company entity is the root anchor of all company-side data.

**KORA layer:** INPUT — the company is the context within which people programs exist.

**Tier:** Core at all tiers.

**Key attributes:**
- Legal name and display name
- Sector / industry classification
- Primary geography and operating geographies
- Headcount band (used for normalization and benchmark; not the same as worker count used for activation)
- Company size category (SME / mid-market / large / enterprise)
- Program maturity level (first-year / established / multi-year)
- Data maturity level (self-assessed or KORA-assessed at ingestion)
- Active commercial tier: Foundation Light / Foundation / Governance / Certified
- Primary reporting period (calendar year, fiscal year, custom)
- Configuration settings (safe aggregation threshold, preferred language, active features)
- Primary contact roles
- DPA and legal agreement status

**What it must never be confused with:**
The Company is the governance subject and the buyer — it is not the owner of identifiable individual worker impact data. The company is entitled to workforce intelligence. It is not entitled to individual employee records.

---

## 4. Company Program

**What it represents:** A defined scope of people-impact activity that KORA is asked to analyze or govern — for a specific period, covering a specific worker population, funded through defined budgets, and measured against defined pillars and objectives.

**Why it exists:** A single company may run multiple programs over time (annual cycles), across geographies (Italy vs Germany), or for specific workforce segments (corporate vs manufacturing plant). The Company Program entity makes these scopes distinct and trackable without conflating their data.

**KORA layer:** INPUT — a program is a defined resource context, not yet impact.

**Tier:** Core at all tiers.

**Key attributes:**
- Program name and description
- Parent company
- Reporting period (start date, end date)
- Scope description
- Target worker population (all employees, specific geography, specific segment)
- Included budget categories (welfare, training, ESG, etc.)
- Included fiscal/budget perimeters
- Active partner and service list
- Target pillar objectives (optional — does the company prioritize specific pillars?)
- Reporting objectives (board pack, ESG report, internal HR, investor communication)
- Status (draft / active / completed / archived)

**What it must never be confused with:**
The Company Program defines what the company is managing and measuring. It is not the same as a welfare catalog, a benefits platform, or an HR software instance. It is the analytical scope of a KORA engagement.

---

## 5. Worker Identity Layer vs Anonymized Worker Profile

This is the most privacy-critical design decision in the entire KORA data model. These two entities must be architecturally separated, not just logically distinguished.

---

### Worker Identity Layer

**What it represents:** The minimal set of identifiable worker data that KORA may need to hold in order to support data ingestion, deduplication, and the exercise of individual data rights (deletion, export, correction).

**Why it exists:** If KORA receives data files containing worker names, employee IDs, or email addresses, it must have a place to receive and isolate that information — and a process to pseudonymize or discard it as quickly as possible. The Worker Identity Layer is a controlled boundary zone, not an analytics store.

**KORA layer:** Not a scoring or analytics layer — a privacy compliance layer.

**Tier:** Core at all tiers (the privacy boundary must exist from the first version).

**Key attributes:**
- Company-assigned identifier (employee number or equivalent)
- Internal KORA pseudonymized ID (a one-way mapping from the company ID to an anonymous KORA identifier)
- Ingestion reference (which batch introduced this record)
- Status (active / deleted / exported)
- Data subject rights log (deletion requests, export requests, correction history)

**Access:** No employer-facing role may access the Worker Identity Layer. Only KORA system processes (deduplication, pseudonymization) and KORA privacy administrators may access this layer.

**What it must never be confused with:** The Worker Identity Layer is not an HR database, not a worker profile visible to the company, and not an analytics input. It is a necessary but minimal holding zone for identifiable data that must be pseudonymized before it enters any analytical layer.

---

### Anonymized Worker Profile

**What it represents:** The pseudonymized analytical record used by KORA to calculate activation, PIB, recurrence, distribution and equity signals. It contains no identifiable information — only the KORA pseudonymized ID and safe analytical attributes.

**Why it exists:** KORA needs to know, at the level of individual analytical records, whether a worker activated, how many Impact Units they accumulated, and whether they engaged consistently — in order to calculate workforce-level intelligence. The Anonymized Worker Profile is the privacy-safe entity that makes these calculations possible without exposing identities.

**KORA layer:** IMPACT — used for analytical calculations; not employer-visible at individual level.

**Tier:** Core at all tiers.

**Key attributes:**
- KORA pseudonymized ID (no link to real identity visible in this record)
- Company identifier
- Company Program identifier
- Workforce Segment reference (department, job family, cohort — only if above safe threshold)
- Contract type category (permanent / fixed-term / contractor — optional, privacy-safe aggregation only)
- Enrollment date in the program (used for tenure-based policy rules; not a hire date)
- Activation status in current period
- PIB values by pillar (analytical — not employer-visible as an individual record)

**What it must never be confused with:**
The Anonymized Worker Profile is not visible to the employer. It is not a named employee record. It does not contain any directly identifiable attribute. A data breach of the Anonymized Worker Profile must not allow identification of specific individuals.

---

## 6. Workforce Segment

**What it represents:** A privacy-safe grouping of Anonymized Worker Profiles used to produce segment-level workforce intelligence — activation by department, participation by seniority band, pillar balance by location.

**Why it exists:** Workforce intelligence is more actionable when it reveals which parts of the organization are engaged and which are not. Segments provide that granularity without exposing individuals.

**KORA layer:** IMPACT — a supporting structure for company-level intelligence.

**Tier:** Basic in Foundation Light; richer in Foundation; full in Governance.

**Key attributes:**
- Segment type (department / site / job family / seniority band / contract type / country / cohort)
- Segment label (e.g., "Engineering", "Senior Management", "Milan Office")
- Member count in the current program period
- Active flag (only shown if member count ≥ safe aggregation threshold)
- Privacy sensitivity override (if this segment type carries higher sensitivity than default)

**Aggregation rules:**
- Segment analytics are suppressed and shown as "insufficient data" when member count falls below the safe aggregation threshold (default: 10 individuals)
- High-sensitivity segment types (e.g., a segment that could identify a vulnerable group) may require a higher threshold or may be excluded entirely from employer-visible outputs
- Segments may be merged when individual segments fall below threshold and combined still meet it — only if the merge is operationally meaningful

**What it must never be confused with:**
Workforce Segments are not individual employee records grouped for convenience. They are pre-defined, privacy-audited groupings. Any segment that could enable re-identification of an individual — due to small size, uniqueness of attributes, or sensitivity of data — must be suppressed or excluded.

---

## 7. Data Source

**What it represents:** The origin system or file from which a company provides data to KORA. A Data Source describes where data comes from, how reliable it is, and what kind of events it contains.

**Why it exists:** KORA receives data from many different systems. Understanding the provenance of each event is essential for assigning Impact Confidence correctly. A training completion from a certified LMS export carries different evidential weight than a self-declared activity log from an internal Excel file.

**KORA layer:** INPUT — a data source is a resource, not yet impact.

**Tier:** Core at all tiers.

**Key attributes:**
- Source type (HRIS / welfare platform / LMS / ESG spreadsheet / wellbeing provider / partner export / internal company file / manual initiative log / future: KORA Link / future: API integration)
- Source name (specific system or provider)
- Owner (which team or department manages this source at the company)
- Intrinsic verification level (what level of evidence does this source type typically provide?)
- Data quality baseline (historical completeness and reliability assessment)
- Sensitivity level (does this source typically contain high-sensitivity data?)
- Ingestion method (flat file upload / scheduled export / future: API)
- Refresh frequency (one-time / annual / quarterly / monthly / future: real-time)
- Active / inactive status
- Associated Company Program

**What it must never be confused with:**
A Data Source is the origin of raw data. It is not the same as a partner (who delivers services to workers) or an evidence record (which supports specific actions). Two companies may use the same HR system as a data source but with completely different data quality and completeness.

---

## 8. Raw Dataset and Ingestion Batch

### Raw Dataset

**What it represents:** The actual file or export received from a data source before KORA has transformed it. A raw dataset is heterogeneous, messy, and in the source's native format.

**Why it exists:** KORA must preserve a record of the raw data it received — before transformation — for audit purposes and to enable re-processing if methodology versions change or errors are found.

**KORA layer:** ACTIVITY — raw data represents that something was provided; it is not yet impact.

**Tier:** Core at all tiers.

**Key attributes:**
- Source reference
- Received date
- File format / export format
- Reporting period covered
- Row count in raw file
- Status (received / processing / processed / failed / archived)
- Hash or checksum (for integrity verification)
- Notes from ingestion

---

### Ingestion Batch

**What it represents:** A specific import operation that processes one or more raw datasets for a company program and period, producing UEF Records.

**Why it exists:** The ingestion process is not instantaneous and involves multiple quality checks, mapping operations, rejection decisions and confidence assessments. The Ingestion Batch records this process with full traceability.

**KORA layer:** ACTIVITY — it is the bridge between raw data and structured events.

**Tier:** Core at all tiers.

**Key attributes:**
- Batch identifier
- Company Program
- Processing date and time
- Included raw datasets
- Total rows processed
- Accepted rows (rows that became UEF records)
- Rejected rows (rows excluded with reason codes)
- Warning flags (records that were accepted but flagged for review)
- Missing field summary (which UEF fields had significant absence rates)
- Duplicate records detected
- Column mapping confidence (how reliably did KORA's ingestion logic map raw columns to UEF fields?)
- Reviewer status (auto-accepted / pending human review / reviewed)
- Methodology version in effect at ingestion
- UEF records generated count
- Data quality score for this batch

**What the pair must never be confused with:**
Raw data is not intelligence. A Raw Dataset and its Ingestion Batch record what the company provided and how it was processed. The intelligence begins only with the UEF Records they produce. A high row count in a Raw Dataset does not indicate high impact.

---

## 9. KORA Action / Event

**What it represents:** The fundamental activity record — something that happened, that can be attributed to a worker or group, that can be mapped to one or more KORA pillars, and that has at least a minimum level of evidence. A KORA Action is the pre-UEF conceptual unit of human activity.

**Why it exists:** Before an event becomes a normalized UEF Record, it must be recognized as a KORA Action — something that qualifies for impact processing. Not everything in a company's data qualifies. The KORA Action concept defines the eligibility gateway.

**KORA layer:** ACTIVITY — it captures that something happened.

**Tier:** Core at all tiers.

**Examples by pillar:**

| Pillar | Example actions |
|---|---|
| LIFE | Health prevention check-up, wellbeing session attended, occupational health activity, psychological support path (privacy-safe metadata only), nutrition program engagement |
| GROWTH | Training course completed, certification achieved, digital upskilling program, professional development workshop |
| CONNECTION | Mentoring session conducted or received, peer learning circle, cross-functional project participation, internal community involvement |
| IMPACT | Volunteering activity completed, social project contributed to, environmental initiative, community orientation session |
| LEGACY | Knowledge transfer session conducted, structured mentoring relationship over multiple sessions, best practice documentation, skills handoff program |

**What is NOT a KORA Action by itself:**
- Budget allocated to a program
- A benefit or service made available but not used
- A generic ESG or CSR declaration without specific action evidence
- A survey sentiment response without an accompanying verified action
- The number of partners or services in a catalog
- A marketing claim, policy document or strategy paper

**What it must never be confused with:**
A KORA Action is different from a UEF Record. The KORA Action is the raw concept — something that happened. The UEF Record is the normalized, structured, quality-assessed form of that action after KORA has processed it.

---

## 10. Universal Event Format Record

**What it represents:** The normalized, canonical representation of a KORA Action after ingestion and processing. Every action that enters KORA's analytics engine does so as a UEF Record. The UEF is the common language that allows KORA to compare heterogeneous actions from different sources without pretending they are identical.

**Why it exists:** Raw data from different sources is incomparable. A wellness session from a wellbeing platform and a training completion from an LMS are described in completely different formats. The UEF Record normalizes both into a common structure that the scoring engine can process consistently.

**KORA layer:** ACTIVITY — it is the processed, structured form of an event; not yet impact.

**Tier:** Core at all tiers.

**Conceptual fields:**

*Identity and attribution:*
- Anonymized worker identifier or aggregate group reference (never a named individual)
- Company identifier
- Company Program identifier
- Workforce Segment reference (only if privacy-safe and above threshold)

*Event description:*
- Event type (from KORA's event taxonomy)
- Event date or period
- Duration or magnitude (hours, sessions, days — normalized)
- Continuity flag (one-time / recurring / part of structured program)
- Action type (individual / group / company-wide)

*Source and provenance:*
- Source type
- Source name
- Ingestion Batch reference
- Evidence reference (link to Evidence Record if one exists)
- Ingestion confidence

*Pillar classification:*
- Primary pillar
- Secondary pillars (where methodologically justified)
- Pillar mapping version
- Mapping confidence
- Human review flag (if mapping was manually confirmed or overridden)

*Quality and verification:*
- Content quality level
- Evidence level
- Verification level
- Impact Confidence

*Privacy:*
- Privacy sensitivity level (low / medium / high)
- Handling protocol applied

*Fiscal and eligibility:*
- Financial reference (link to Budget/Fund if spend data was provided)
- Fiscal/budget perimeter (if classified)
- Eligibility status
- Eligibility confidence

*Methodology:*
- Methodology version in effect at processing
- Review status (auto-processed / flagged / manually reviewed)
- Review notes

**What it must never be confused with:**
The UEF Record is not a database table yet — it is the canonical event language of KORA. It is also not the same as an Impact Unit. The UEF Record describes an event. The Impact Unit is the analytical output derived from that event.

---

## 11. Pillar and Pillar Mapping

### Pillar

**What it represents:** One of the five fixed KORA categories into which all actions are classified: LIFE, GROWTH, CONNECTION, IMPACT, LEGACY. Pillars are the grammar of KORA — they are the universal language for human impact.

**Why it exists:** Without a stable classification system, KORA cannot compare actions from different sources, different companies or different periods. The five pillars are fixed in the methodology. They are not configurable by individual companies.

**KORA layer:** IMPACT — pillars are the structure of the impact model.

**Tier:** Core at all tiers.

**Key attributes:**
- Pillar identifier (LIFE / GROWTH / CONNECTION / IMPACT / LEGACY)
- Full definition (as in the Methodological Constitution)
- Example action types associated with this pillar
- Typical secondary pillar relationships
- Privacy sensitivity notes (e.g., LIFE pillar may carry high-sensitivity data)

**What it must never be confused with:**
Pillars are not budget categories (welfare budget ≠ LIFE pillar), not fiscal perimeters, not service catalogs, and not organizational departments. They are analytical categories for human impact.

---

### Pillar Mapping

**What it represents:** The logic and record of how a specific UEF Record was assigned to one primary pillar and zero or more secondary pillars.

**Why it exists:** Pillar assignment is the first and most consequential analytical decision KORA makes for each event. It must be auditable, versioned, and explainable. A Pillar Mapping record preserves the full context of how the assignment was made.

**KORA layer:** IMPACT — part of the classification step.

**Tier:** Core at all tiers.

**Key attributes:**
- UEF Record reference
- Primary pillar assigned
- Secondary pillar(s) assigned (may be empty)
- Mapping confidence (how confident is KORA in this assignment?)
- Mapping method (taxonomy rule / AI suggestion confirmed / manually assigned)
- Methodology version in effect
- Human review flag and reviewer reference if applicable
- Override reason (if a human reviewer changed the automated assignment)

**What it must never be confused with:**
A Pillar Mapping is not the same as a fiscal/budget category. A training course may be funded through the training budget (fiscal dimension) and classified to the GROWTH pillar (impact dimension) — these are two separate mappings that must coexist without conflation.

---

## 12. Impact Unit

**What it represents:** The normalized analytical output generated by a single UEF Record for a specific pillar, after the full Impact Unit formula has been applied. Impact Units are the internal currency of KORA's scoring engine.

**Why it exists:** Different actions have different depth, quality, evidence and continuity. Impact Units express these differences numerically, allowing the scoring engine to aggregate heterogeneous actions on a common analytical scale in a way that is sensitive to quality, not just quantity.

**KORA layer:** IMPACT — the core analytical output of a single event.

**Tier:** Core at all tiers.

**Conceptual attributes:**

| Attribute | Description |
|---|---|
| Originating UEF Record | Which event generated this IU |
| Pillar | Which pillar this IU is credited to |
| Formula version | Which version of the IU formula was used |
| Normalized Magnitude (NM) | The normalized size/depth of the action |
| Base Contribution (BC) | Provisional base weight for this event type on this pillar |
| Content Quality (CQ) | The quality multiplier applied |
| Evidence / Verification Level (EV) | The verification multiplier applied |
| Continuity Factor (CF) | The continuity multiplier applied |
| Anti-Gaming Factor (AGF) | The anti-gaming adjustment applied |
| Durability Factor (DF) | Applied if this is a LEGACY action with long-lasting value |
| Externality Factor (EXF) | Applied if this is an IMPACT action with verified external value |
| Final IU value | The calculated output |
| Impact Confidence | Reliability of this IU as impact evidence |
| Anti-gaming flags triggered | Which controls were applied |
| Status | Auto-calculated / flagged for review / manually adjusted |

**What it must never be confused with:**
Impact Units are not money, rewards, employee performance scores, or gamification points. They are internal analytical outputs — they exist to enable aggregation and comparison. They are not shown as raw numbers to company leadership in most contexts. The KORA Index is built from them, but the Index is what the company sees.

---

## 13. PIB — Personal Impact Balance

**What it represents:** The analytical aggregation of all Impact Units accumulated by a single Anonymized Worker Profile across all pillars, for a defined period.

**Why it exists:** KORA needs to understand human impact at the individual analytical level in order to calculate workforce-level intelligence — specifically activation rates, continuity, distribution, equity signals and concentration risk. PIB is the individual-level foundation of these calculations.

**KORA layer:** IMPACT — an intermediate analytical layer between individual IU records and company-level intelligence.

**Tier:** Core at all tiers (internal); worker-facing PIB belongs to Future Ecosystem.

**Conceptual structure:**
```
PIB_worker = Σ_p IU_{worker,p}
```
Decomposable by pillar: PIB_LIFE, PIB_GROWTH, PIB_CONNECTION, PIB_IMPACT, PIB_LEGACY.

**Key attributes:**
- Anonymized Worker Profile reference
- Company Program reference
- Reference period
- IU by pillar (five values)
- Total PIB
- Activation status (active / inactive, based on threshold)
- Continuity flag (recurring engagement detected)
- Recurrence pattern reference
- Methodology version

**Privacy rules for PIB:**
- PIB records are internal analytical records — they are never shown to the employer at the individual level
- The employer sees activation rates, participation bands and distribution shapes derived from the aggregate of PIB records — not the PIB of any specific worker
- PIB records must be pseudonymized — there must be no direct path from a PIB record to a named employee without accessing the Worker Identity Layer, which no employer role can do

**What it must never be confused with:**
PIB is not an employee performance score. A worker with lower PIB is not a worse employee — they may simply have less access to programs, less time, or work in a segment with fewer available services. PIB is an analytical input to workforce intelligence, not an individual evaluation metric.

---

## 14. Company Impact Aggregate

**What it represents:** The company-level aggregation of all Impact Units across all Anonymized Worker Profiles, decomposable by pillar, period, source type, verification level and (where privacy-safe) workforce segment.

**Why it exists:** The scoring engine needs company-level aggregates to calculate the KORA Index components. Company Impact Aggregate is the analytical layer between individual IU records and the KORA Index.

**KORA layer:** IMPACT — the aggregated foundation of company-level intelligence.

**Tier:** Core at all tiers.

**Key attributes:**
- Company Program reference
- Reference period
- Total IU
- IU by pillar (five values)
- IU by source type
- IU by verification level
- IU by content quality band
- IU by segment (privacy-safe only, above threshold)
- Share of IU from self-declared sources
- Share of IU from verified/certified sources
- Methodology version

**What it must never be confused with:**
Company Impact Aggregate (specifically Company Total IU) is a useful volume metric, but it is not the KORA Index. High Company Total IU does not indicate a high-quality program if that IU is concentrated in one pillar, driven by low-quality self-declared events, or generated by a small group of workers.

---

## 15. KORA Index Entity

**What it represents:** The primary company-level intelligence output — a calculated score (0–100) measuring the maturity and quality of the company's human impact program, based on seven component scores.

**Why it exists:** Companies need a single, authoritative indicator of their people-impact program quality that they can track over time, explain to leadership, and use to make decisions. The KORA Index aggregates the complexity of the methodology into a credible, explainable summary.

**KORA layer:** IMPACT — the primary organizational intelligence output.

**Tier:** Core at all tiers.

**Key attributes:**
- Company Program reference
- Reporting period
- Methodology version
- Component scores (one per component):
  - Activation Rate score and input data
  - Normalized Intensity score and input data
  - Pillar Balance score and input data
  - Event Quality score and input data
  - Verification Rate score and input data
  - Continuity score and input data
  - Pillar Coverage score and input data
- Component weights applied (from methodology version)
- Final KORA Index score (0–100)
- Confidence Score (how reliable is this score?)
- Change vs prior period (delta)
- Data quality warnings attached
- Explanation summary (plain-language breakdown of score drivers)
- Limitations attached (what data gaps exist that affect this score)
- Status (provisional / final / certified)

**What it must never be confused with:**
The KORA Index is not Company Total IU, not an average of PIB, not a function of budget spent, not a function of partners available, and not a measure of fiscal eligibility. It is a methodologically calculated quality and maturity score for the program.

---

## 16. KORA Contribution Entity

**What it represents:** A separate indicator measuring the social, territorial and external contribution generated by the organization — primarily related to the IMPACT pillar but distinct from the KORA Index.

**Why it exists:** Internal program quality and external social contribution are not the same thing. A company may score well on the KORA Index (strong internal activation, good pillar balance) while generating minimal verified external contribution. Or it may have a small, highly engaged group of workers producing significant territorial impact. Both facts are important and must be visible independently.

**KORA layer:** IMPACT — a specialized impact indicator.

**Tier:** Basic in Foundation Light (if IMPACT data is available); full in Foundation and above.

**Key attributes:**
- Company Program reference
- Reference period
- Methodology version
- Component scores: worker coverage in IMPACT initiatives, impact intensity, externality verification, partner quality, territorial coverage, contribution continuity
- Component weights
- Final KORA Contribution score
- Confidence Score
- Comparison vs prior period
- Explanation summary

**What it must never be confused with:**
KORA Contribution is not a component of the KORA Index — it must never be merged with or used to inflate the Index. It is displayed alongside the Index as a separate signal.

---

## 17. KORA Ecosystem Reach Entity

**What it represents:** A separate indicator measuring the quality, coverage and actual utilization of the partner and service ecosystem available to the company's workforce.

**Why it exists:** Companies often ask "do we have enough partners?" KORA must answer this question more precisely: do you have the right partners, are they well-distributed across pillars and territories, and are workers actually using them? Ecosystem Reach separates catalog richness from activation.

**KORA layer:** INPUT (partner availability) + IMPACT (utilization) — a bridge indicator between the two.

**Tier:** Basic in Foundation Light (if partner data is available); full in Foundation and above.

**Key attributes:**
- Company Program reference
- Reference period
- Methodology version
- Component scores: partner utilization rate, certification ratio, territorial reach, service diversity, pillar coverage of partner network, concentration balance
- Component weights
- Final KORA Ecosystem Reach score
- Confidence Score
- Comparison vs prior period
- Explanation summary

**What it must never be confused with:**
KORA Ecosystem Reach is not the same as a partner catalog count. Partners available ≠ partners used. Ecosystem Reach is not a component of the KORA Index. It is a diagnostic indicator that helps companies understand whether their partner network is adequate to support their impact ambitions.

---

## 18. Financial Budget / Fund

**What it represents:** A defined pool of money that a company has allocated to fund people-program activities — categorized by its fiscal/budget type and associated with a Company Program.

**Why it exists:** Financial governance requires knowing how much money was available, to which categories it was allocated, and how it was used. The Financial Budget entity is the INPUT-layer anchor for all financial governance calculations.

**KORA layer:** INPUT — budget is a resource, not a result.

**Tier:** Basic in Foundation Light; full in Foundation and Governance.

**Key attributes:**
- Company Program reference
- Budget category (welfare / fringe benefit / training / health & wellbeing / people/HR / ESG/CSR / non-tax-advantaged / custom)
- Currency
- Total allocated amount
- Reporting period
- Fiscal/budget perimeter reference (which perimeter governs this budget)
- Status (active / exhausted / closed)
- Notes or constraints

**What it must never be confused with:**
A Financial Budget is not the same as a Fiscal/Budget Perimeter. The perimeter is the regulatory framework; the budget is the specific monetary allocation within that framework. The same perimeter can have multiple budget allocations across different programs or periods.

---

## 19. Financial Movement / Spend Record

**What it represents:** An individual financial transaction or allocation event — an invoice, reimbursement, partner payout, initiative cost, or budget commitment — that connects spending to specific budgets, perimeters, partners or initiatives.

**Why it exists:** Financial governance requires granular spend data to calculate cost per Impact Unit, partner efficiency, budget activation ratios and underfunding/overfunding signals. Spend Records are the individual building blocks of financial intelligence.

**KORA layer:** GOVERNANCE — spend records support financial decision-making.

**Tier:** Basic in Foundation Light (aggregate only); full in Foundation and Governance.

**Key attributes:**
- Financial Budget / Fund reference
- Fiscal/budget perimeter reference
- Transaction type (allocation / commitment / invoice / reimbursement / payout / internal cost)
- Amount and currency
- Date
- Partner reference (if applicable)
- Service reference (if applicable)
- Initiative or action reference (if applicable)
- Reporting period
- Evidence reference (invoice, approval record)
- Status (committed / confirmed / reconciled)

**What it must never be confused with:**
Spend Records are financial records. They connect to impact records only through the financial governance calculations (cost per Impact Unit, spend-to-impact efficiency). A Spend Record does not generate Impact Units — only verified worker actions do.

---

## 20. Fiscal / Budget Perimeter

**What it represents:** The fiscal, regulatory and policy framework that governs how a specific budget category can be used — what services are eligible, what documentation is required, what worker categories are covered, and what caps apply.

**Why it exists:** Italian and European fiscal law provides tax advantages for specific benefit categories under defined rules. Companies need to know which of their services are eligible under which rules, and KORA must map this fiscal reality without conflating it with impact measurement.

**KORA layer:** ELIGIBILITY — fiscal perimeters define the compliance context, not the impact value.

**Tier:** Basic in Foundation Light (tagging); full in Governance.

**Key attributes:**
- Perimeter type (welfare aziendale / fringe benefit / training / health & wellbeing / people-HR / ESG-CSR / non-tax-advantaged / custom)
- Country / jurisdiction where this perimeter applies
- Governing legislation or regulatory reference (e.g., Italian TUIR Art. 51)
- Active date range (fiscal rules change annually in Italy)
- Maximum annual threshold per employee (where applicable)
- Eligible service categories under this perimeter
- Required documentation types
- Company-specific configuration (activated perimeters for this company program)
- Advisor validation reference
- Version (perimeter rules are versioned because legislation changes)
- Review date and review trigger

**What it must never be confused with:**
A Fiscal/Budget Perimeter is not the same as a KORA pillar, a budget fund, or a service category. A single service (e.g., a gym subscription) may sit in the LIFE pillar, be funded through the welfare budget, and be eligible under the fringe benefit perimeter — three separate classifications that coexist without being merged.

---

## 21. Partner

**What it represents:** An external provider, organization or service operator that delivers services or activities to a company's workers — potentially generating KORA Actions that contribute Impact Units.

**Why it exists:** Many company people-programs involve external providers: welfare platforms, training companies, wellbeing providers, volunteering organizations, ESG program operators. KORA must understand the partner ecosystem to assess partner utilization, service eligibility, and data quality from partner sources.

**KORA layer:** INPUT — partners are resources in the ecosystem, not impact by themselves.

**Tier:** Basic in Foundation Light (visibility); Advanced in Foundation; Core in Governance and Certified.

**Key attributes:**
- Partner name and description
- Service categories offered
- Primary pillar contributions
- Operating territories
- KORA certification status (not certified / KORA partner / KORA Certified Partner)
- Verification capability (can this partner produce evidence-grade usage records?)
- Data export capability (what formats and frequency can this partner provide data?)
- Privacy compliance status
- KORA advisor validation reference
- Overall confidence profile (derived from service eligibility and data quality history)
- Active / inactive in company program

**What it must never be confused with:**
A Partner exists in the system and may offer excellent services. But the Partner entity itself generates no Impact Units. Only verified worker usage of partner services, processed through the UEF, generates IU. Partner count is not impact.

---

## 22. Partner Service

**What it represents:** A specific offering provided by a Partner — a course, a wellness program, a volunteering project, a health check, a mentoring platform — that workers can access and that may generate KORA Actions.

**Why it exists:** Companies select services from the partner catalog to include in their people programs. The service-level entity carries the detailed information KORA needs for pillar mapping, fiscal eligibility assessment, verification level assignment, and privacy handling.

**KORA layer:** INPUT — a service is a resource; only its use generates impact.

**Tier:** Basic in Foundation Light; Advanced in Foundation and Governance.

**Key attributes:**
- Partner reference
- Service name and description
- Primary impact pillar(s)
- Action type (one-time event / recurring enrollment / structured program)
- Duration or typical magnitude
- Fiscal/budget eligibility (per perimeter — see Eligibility Profile entity)
- Required documentation for eligible activations
- Verification level KORA assigns to confirmed usage of this service
- Privacy sensitivity classification (low / medium / high)
- Territory and country availability
- Last eligibility review date
- Review trigger conditions
- Active / inactive status

---

## 23. Eligibility Profile

**What it represents:** The structured, versioned fiscal/budget mapping for a specific Partner Service — recording whether and how the service qualifies under each relevant fiscal/budget perimeter, at what confidence level, and under what conditions.

**Why it exists:** KORA needs to know, for every service in the partner network, which fiscal/budget perimeters it is compatible with, who validated that compatibility, and whether the classification is current. The Eligibility Profile is the entity that holds this knowledge.

**KORA layer:** ELIGIBILITY — the compliance mapping layer.

**Tier:** Basic in Foundation Light (status display); Advanced in Foundation; Core in Governance and Certified.

**Key attributes:**
- Partner Service reference
- Fiscal/Budget Perimeter reference
- Eligibility Status (Eligible / Conditional / Uncertain / Excluded)
- Eligibility Confidence (Advisor-Confirmed / KORA Advisor-Confirmed / Partner-Documented / Partner-Declared / KORA-Inferred / Pending Review / Outdated — Requires Review)
- Eligibility conditions (if Conditional — what must be true?)
- Required documentation for this perimeter-service combination
- Validation source (which advisor or document confirmed this?)
- Validation date
- Applicable fiscal/regulatory version
- Review trigger (what events require re-review?)
- Version history (previous classifications preserved for audit)

**What it must never be confused with:**
An Eligibility Profile does not affect the KORA Index. High Eligibility Confidence does not increase a service's impact value. Low Eligibility Confidence does not reduce Impact Units generated by verified usage of the service. The fiscal compliance dimension and the impact measurement dimension are parallel and independent.

---

## 24. Policy Rule

**What it represents:** A company-specific constraint that governs how a fiscal/budget perimeter, service, or budget can be used within the company's program — configured by the company with its advisors and enforced by KORA's policy rules engine.

**Why it exists:** Companies have internal rules that go beyond the minimum requirements of the applicable fiscal framework — spending caps, approved provider lists, eligibility restrictions, approval workflows. KORA must be able to enforce these rules operationally and audit whether they were respected.

**KORA layer:** GOVERNANCE — policy rules are decision and compliance tools, not impact measures.

**Tier:** Basic in Foundation Light (informational); Advanced in Foundation; Core in Governance.

**Key attributes:**
- Company Program reference
- Fiscal/Budget Perimeter reference (if perimeter-specific)
- Rule type (spending cap / eligible worker category / approved provider / minimum tenure / documentation requirement / co-payment / approval workflow / reporting obligation / exclusion rule / territory constraint)
- Rule value or definition (the specific constraint)
- Eligible worker scope (which worker categories does this rule apply to?)
- Effective date and end date
- Methodology version in effect when rule was created
- Author (who configured this rule?)
- Advisor validation reference
- Audit trail (history of changes to this rule)
- Status (active / suspended / expired)

**What it must never be confused with:**
Policy Rules are configured by the company and its advisors — KORA does not invent them. KORA enforces, tracks and audits them. A Policy Rule is not a fiscal eligibility classification — it is a company's internal governance decision applied on top of the fiscal framework.

---

## 25. Evidence Record

**What it represents:** A piece of supporting documentation or verification that substantiates a KORA Action, an Eligibility classification, a Financial Movement, or an Advisor Review.

**Why it exists:** KORA's entire credibility rests on the chain of evidence behind every output. Evidence Records are the connective tissue between what KORA claims and what can be demonstrated. Without an evidence layer, KORA outputs are assertions — with it, they are defensible claims.

**KORA layer:** EVIDENCE — the documentation layer of KORA.

**Tier:** Basic in Foundation Light; Core in Governance and Certified.

**Key attributes:**
- Evidence type (attendance certificate / completion certificate / invoice / provider confirmation / advisor validation note / partner compliance document / signed declaration / future: KORA Link verification record)
- Referenced entity type (KORA Action / Eligibility Profile / Spend Record / Advisor Review)
- Referenced entity identifier
- Document reference or storage pointer
- Issuer (who provided or issued this evidence)
- Date of issuance
- Validity period (if evidence expires)
- Verification level this evidence supports (does this evidence justify moderate, strong or certified verification status?)
- Privacy sensitivity (does this document contain sensitive personal data?)
- Status (valid / expired / superseded / disputed)
- Audit trail

**What it must never be confused with:**
An Evidence Record is documentation, not an analytical output. It supports the calculation of Impact Confidence and Eligibility Confidence — it does not itself generate Impact Units. The presence of an Evidence Record increases verification level; the absence reduces it.

---

## 26. Audit Trail Record

**What it represents:** An immutable log entry recording a significant change, decision or access event within KORA — what changed, who changed it, when, what the previous and new values were, and why.

**Why it exists:** KORA produces intelligence that companies use to make significant decisions and that may be subject to external review, audit or regulatory scrutiny. Every important change in the system must leave a traceable, tamper-resistant record. The audit trail is what converts a system into a trustworthy one.

**KORA layer:** EVIDENCE — the traceability layer.

**Tier:** Core at all tiers (limited scope in Foundation Light; comprehensive in Governance and Certified).

**Key attributes:**
- Event type (data changed / configuration changed / override applied / eligibility updated / policy rule modified / score calculated / score recalculated / access event / review completed / export generated)
- Affected entity type and identifier
- Previous value
- New value
- Changed by (user or system process)
- Timestamp
- Reason or rationale (required for human-initiated changes)
- Methodology version in effect
- Evidence reference (if the change was supported by specific documentation)
- Immutability flag (audit trail records must not be modifiable after creation)

**What it must never be confused with:**
Audit trail records are not the same as data records. They record changes to data, not the data itself. They are write-once, never-update records. An audit trail that can be edited is no longer an audit trail.

---

## 27. Methodology Version

**What it represents:** A versioned snapshot of the complete KORA methodological logic — including all formulas, weights, taxonomy definitions, anti-gaming rules, confidence model parameters and privacy thresholds — that was in effect for a given set of outputs.

**Why it exists:** KORA's methodology will improve over time. When it does, historical scores must remain interpretable under the version that produced them. The Methodology Version entity makes this possible by permanently associating every analytical output with the specific logic that generated it.

**KORA layer:** EVIDENCE — the versioning layer.

**Tier:** Core at all tiers.

**Versioned components (each tracked per version):**

| Component | Why versioned |
|---|---|
| Impact Unit formula and coefficients | Core scoring logic; any change affects historical comparability |
| KORA Index composition and weights | Primary output; changes must be transparent |
| KORA Contribution formula | Separate indicator; independently versioned |
| KORA Ecosystem Reach formula | Separate indicator; independently versioned |
| Confidence Score model | Reliability assessment methodology |
| Pillar mapping taxonomy | Classification rules; changes affect IU distribution by pillar |
| Fiscal/budget taxonomy | Regulatory framework; changes reflect new legislation |
| Eligibility confidence model | Confidence level hierarchy and trigger rules |
| Anti-gaming rules and caps | Fraud/gaming prevention logic |
| Benchmark normalization parameters | When introduced, changes affect cross-company comparability |
| Privacy threshold definitions | Safe aggregation rules; changes affect what is displayable |
| Policy rule framework | Configurable structure; changes affect governance layer |

**Key attributes:**
- Version identifier (e.g., v0.1, v0.2, v1.0)
- Effective from date
- Effective to date (if superseded)
- Change log (what changed from prior version and why)
- Published by
- External validation reference (if this version has been externally reviewed)
- Status (draft / active / superseded / archived)

**What it must never be confused with:**
A Methodology Version is not a software release version. It is a versioned record of methodological logic. A platform software update does not automatically change the methodology version — only deliberate, documented changes to scoring rules, formulas or taxonomy trigger a version increment.

---

## 28. Confidence Score

**What it represents:** A summary indicator of the overall methodological reliability of a KORA output — a separate signal telling users how much trust to place in a score, independent of the score itself.

**Why it exists:** A KORA Index of 65 from high-quality, well-evidenced data is a very different statement from a KORA Index of 65 from sparse, self-declared, incomplete data. The Confidence Score makes this difference visible.

**KORA layer:** EVIDENCE — a reliability indicator for all analytical outputs.

**Tier:** Core at all tiers.

**Confidence Score exists at multiple levels:**

| Level | What it measures |
|---|---|
| Event-level confidence | Reliability of a single UEF Record as impact evidence |
| Source-level confidence | Reliability of a Data Source overall |
| Pillar-level confidence | Reliability of the evidence base for a specific pillar |
| KORA Index confidence | Overall methodological reliability of the KORA Index for this period |
| Eligibility confidence | Already defined as a separate entity — tracks fiscal eligibility reliability |
| Report confidence | Overall reliability of the evidence in an exported report |

**Key inputs to the KORA Index-level Confidence Score:**
- Data completeness (what proportion of required UEF fields are populated?)
- Source reliability mix (what proportion of IU comes from high-reliability sources?)
- Verification coverage (Verification Rate from Section 19 of the Constitution)
- Missing fields rate
- Low-confidence data share
- Manual review rate
- Privacy-safe aggregation quality (are all employer outputs above thresholds?)
- Eligibility confidence distribution (where fiscal perimeters are relevant)

**What it must never be confused with:**
Confidence Score is not the KORA Index. A high Confidence Score means the score is reliable, not that it is high. A company may have a low KORA Index with high confidence (meaning: they have a genuinely underdeveloped program, and we know it accurately) or a high KORA Index with low confidence (meaning: the score looks good, but the data quality is poor — treat with caution).

---

## 29. Report / Export

**What it represents:** A structured, evidence-grade output package produced by KORA for a specific audience and purpose — an executive summary, a board pack, an HR report, an ESG appendix, a Certified evidence package.

**Why it exists:** The ultimate commercial deliverable of KORA is not a dashboard — it is a document that a company can share with its board, its investors, its regulators, or its certification reviewer. Reports are the exportable, auditable, audience-specific form of KORA intelligence.

**KORA layer:** EVIDENCE — reports are the packaged, evidence-grade form of KORA outputs.

**Tier:** Core at all tiers (format scales with tier).

**Report types by tier:**

| Tier | Report types |
|---|---|
| Foundation Light | Data quality assessment, KORA Impact Report (executive summary), pillar analysis snapshot |
| Foundation | Quarterly people impact report, initiative ROI summary, workforce activation analysis |
| Governance | Board reporting package, budget vs impact reconciliation, audit trail export, risk and alert summary |
| Certified | Certified evidence package, methodology transparency report, public KORA Impact Profile (optional) |

**Key attributes:**
- Report type
- Company Program reference
- Reporting period
- Methodology version used
- Data sources included
- Data limitations and warnings
- Confidence Score
- Score explanation
- Audience (internal leadership / board / investor / ESG reviewer / certification authority)
- Export format (PDF / web / structured data)
- Export date
- Status (draft / final / certified)
- Audit trail reference

---

## 30. Advisor Review

**What it represents:** A formal human review record — the documentation of a qualified person reviewing a KORA output, methodology classification, eligibility determination, or evidence record and recording their assessment.

**Why it exists:** KORA's methodology requires human governance at critical junctures. The algorithm proposes; the governance layer controls. The Advisor Review entity is the structured record of that governance.

**KORA layer:** GOVERNANCE — human oversight recorded as a structured entity.

**Tier:** Advanced in Foundation; Core in Governance; required in Certified.

**Applicable contexts:**
- Methodology review (external advisor validates that the KORA methodology applied to this company is correct)
- Eligibility review (qualified labor law or tax advisor confirms that a fiscal/budget eligibility classification is correct)
- Partner validation (KORA-authorized advisor validates a partner's service catalog and eligibility profiles)
- Certified assessment (full annual review of the company's methodology application, data quality and evidence trail)
- Ambiguous event mapping (a human reviewer resolves a disputed pillar assignment)
- Evidence review (a reviewer confirms that submitted documentation supports the claimed action or eligibility status)

**Key attributes:**
- Reviewer identity (advisor name, authorization status in KORA network)
- Review scope (what entity or output was reviewed?)
- Review type (methodology / eligibility / partner / Certified / event mapping / evidence)
- Referenced entity
- Review outcome (confirmed / modified / rejected / pending)
- Notes and rationale
- Evidence references
- Date performed
- Methodology version in effect
- Audit trail entry reference

**What it must never be confused with:**
An Advisor Review is not a survey or feedback form. It is a structured governance record with legal and methodological significance. It is the entity that converts a Pending Review eligibility confidence into an Advisor-Confirmed classification, or a preliminary KORA Certified status into a certified one.

---

## 31. User / Role / Permission

**What it represents:** The access control layer of KORA — who can see what, do what, and approve what within the platform.

**Why it exists:** KORA holds sensitive data. Multiple stakeholders interact with different parts of the platform for different purposes. Role-based access control ensures that privacy boundaries are enforced, that employer roles cannot access individual sensitive data, and that governance actions (overrides, reviews, certifications) are performed only by authorized individuals.

**KORA layer:** GOVERNANCE — access control is a governance mechanism.

**Tier:** Core at all tiers.

**Defined roles and access summary:**

| Role | Access description |
|---|---|
| **KORA Admin** | Full system access for KORA platform administrators; can access all entities for maintenance and support |
| **Company Admin** | Company account management; can configure programs, data sources, fiscal perimeters, policy rules; cannot access Worker Identity Layer |
| **Company HR** | Can view and export KORA Index, pillar intelligence, workforce intelligence (aggregated only, above thresholds); cannot access individual PIB or sensitive records |
| **Company Finance** | Can access financial governance layer (budgets, spend records, cost per IU); cannot access individual impact records or Worker Identity Layer |
| **Company ESG / Sustainability** | Can access KORA Index, KORA Contribution, report exports for ESG purposes; cannot access individual records |
| **Company Viewer** | Read-only access to executive dashboard and reports; no configuration or export permissions |
| **Advisor** | Access to the layers relevant to their review scope (methodology, eligibility, Certified assessment); no access to company financial records outside their review scope; no access to individual worker records |
| **Partner Admin** | Can manage partner and service profiles; can view eligibility profiles for their own services; no access to company data |
| **Worker (future)** | Can view their own PIB and action history; no access to any other worker's data or company analytics |
| **Auditor (future)** | Read-only access to audit trail records and report exports for compliance review |

**Privacy enforcement at the role level:**
- No employer role (Company Admin, HR, Finance, ESG, Viewer) may access the Worker Identity Layer
- No employer role may access named or individually identifiable PIB records
- No employer role may access high-sensitivity event records at individual level
- Segment-level data is only visible when the segment meets the safe aggregation threshold
- All access events are recorded in the Audit Trail

---

## 32. Entity Relationships

The following describes the primary relationships between KORA entities, expressed conceptually rather than as database foreign keys.

**Company and Program:**
- One Company has one or more Company Programs (over time, across geographies, or by scope)
- All other entities are scoped to a Company Program

**Program and Resources (INPUT layer):**
- A Company Program references one or more Financial Budgets / Funds
- A Company Program references one or more Fiscal/Budget Perimeters
- A Company Program includes one or more Partners and Partner Services
- A Company Program is fed by one or more Data Sources

**Data flow (ACTIVITY layer):**
- A Data Source provides Raw Datasets
- A Raw Dataset is processed by an Ingestion Batch
- An Ingestion Batch creates UEF Records
- Each UEF Record references its originating Ingestion Batch and Data Source
- Each UEF Record may reference an Evidence Record

**Classification and scoring (IMPACT layer):**
- Each UEF Record is assigned a Pillar Mapping (primary + optional secondary pillars)
- Each UEF Record + Pillar Mapping generates one or more Impact Units
- Impact Units aggregate into an Anonymized Worker Profile's PIB
- PIB records aggregate into Company Impact Aggregates
- Company Impact Aggregates feed the KORA Index, KORA Contribution and KORA Ecosystem Reach calculations

**Financial governance (GOVERNANCE layer):**
- Financial Budgets are connected to Fiscal/Budget Perimeters
- Financial Movements / Spend Records are connected to Budgets, Partners and Services
- Financial governance indicators (Cost per IU, Budget Activation Ratio) are calculated from Spend Records and Company Impact Aggregates

**Fiscal and policy governance (ELIGIBILITY layer):**
- Each Partner Service has one or more Eligibility Profiles (one per applicable Fiscal/Budget Perimeter)
- Each Eligibility Profile carries Eligibility Status and Eligibility Confidence
- Policy Rules are configured per Company Program and Fiscal/Budget Perimeter
- When a UEF Record references a fiscal perimeter, the applicable Eligibility Profile and Policy Rules are associated with it

**Trust and auditability (EVIDENCE layer):**
- Evidence Records support UEF Records, Eligibility Profiles, Spend Records and Advisor Reviews
- Audit Trail Records capture all significant changes across all entities
- Every scoring output (Impact Unit, PIB, Company Aggregate, KORA Index, KORA Contribution, KORA Ecosystem Reach) references the Methodology Version in effect when it was calculated
- Confidence Scores are calculated for events, sources, pillars, the KORA Index, and reports
- Reports reference all entities they summarize and carry a methodology version, confidence score and data limitation record
- Advisor Reviews reference the entities they reviewed and update Eligibility Confidence or Certified status accordingly

**Privacy bridge:**
- The Worker Identity Layer maps company-assigned employee identifiers to KORA pseudonymized IDs
- Anonymized Worker Profiles use only KORA pseudonymized IDs — no direct link to identifiable data
- Workforce Segments group Anonymized Worker Profiles for segment-level analytics, with threshold enforcement
- No pathway exists from Anonymized Worker Profiles or Workforce Segments to the Worker Identity Layer for any employer-facing role

---

## 33. Tier Relevance Matrix

This matrix defines the availability of each entity across KORA's commercial tiers.

| Entity | Foundation Light | Foundation | Governance | Certified | Future Ecosystem |
|---|---|---|---|---|---|
| Organization / Company | Core | Core | Core | Core | Core |
| Company Program | Core | Core | Core | Core | Core |
| Worker Identity Layer | Core (isolated) | Core | Core | Core | Core |
| Anonymized Worker Profile | Core | Core | Core | Core | Core |
| Workforce Segment | Basic | Advanced | Advanced | Advanced | Advanced |
| Data Source | Core | Core | Core | Core | Core |
| Raw Dataset | Core | Core | Core | Core | Core |
| Ingestion Batch | Core | Core | Core | Core | Core |
| KORA Action / Event | Core | Core | Core | Core | Core |
| UEF Record | Core | Core | Core | Core | Core |
| Pillar | Core | Core | Core | Core | Core |
| Pillar Mapping | Core | Core | Core | Core | Core |
| Impact Unit | Core | Core | Core | Core | Core |
| PIB | Core (internal) | Core | Core | Core | Worker-facing (future) |
| Company Impact Aggregate | Core | Core | Core | Core | Core |
| KORA Index | Core | Core | Core | Core | Core |
| KORA Contribution | Basic | Advanced | Advanced | Core | Core |
| KORA Ecosystem Reach | Basic | Advanced | Advanced | Core | Core |
| Financial Budget / Fund | Basic | Advanced | Core | Core | Core |
| Financial Movement / Spend | Basic | Advanced | Core | Core | Core |
| Fiscal / Budget Perimeter | Basic (tagging) | Advanced | Core | Core | Core |
| Partner | Basic | Advanced | Advanced | Core | Core |
| Partner Service | Basic | Advanced | Advanced | Core | Core |
| Eligibility Profile | Basic (display) | Advanced | Core | Core | Core |
| Policy Rule | Not applicable | Basic | Core | Core | Core |
| Evidence Record | Basic | Advanced | Core | Core | Core |
| Audit Trail Record | Basic (limited) | Advanced | Core | Core | Core |
| Methodology Version | Core | Core | Core | Core | Core |
| Confidence Score | Core | Core | Core | Core | Core |
| Report / Export | Core | Advanced | Core | Core | Core |
| Advisor Review | Not applicable | Basic | Advanced | Core | Future |
| User / Role / Permission | Core | Core | Core | Core | Core |

---

## 34. Privacy Boundaries in the Data Model

The privacy architecture of KORA is not a feature — it is a structural property of the data model. These rules must be enforced at the data architecture level, not only at the interface level.

**Identifiable data must be isolated:**
The Worker Identity Layer is the only place identifiable worker data exists in KORA. It must be physically or logically isolated from all analytical layers. No employer-facing role may access it. Only KORA system processes (pseudonymization, deduplication) and KORA privacy administrators may access it.

**Analytical worker data must be pseudonymized:**
Anonymized Worker Profiles contain only KORA pseudonymized IDs. There is no reverse-lookup path from an Anonymized Worker Profile to a named employee available to any employer role.

**Employer-visible outputs must be aggregated:**
All data surfaced to employer roles (Company Admin, HR, Finance, ESG, Viewer) must represent aggregated, anonymized workforce intelligence. No individual-level record may be shown.

**High-sensitivity data must be restricted:**
Events classified as high-sensitivity must be subject to elevated aggregation thresholds. Psychological support session counts, health data, and other sensitive categories must be shown only as aggregate numbers — never as individual records, segment records below threshold, or trend lines that would identify specific individuals.

**Segment data below threshold must be suppressed:**
Any workforce segment with fewer than the safe aggregation threshold (default: 10 individuals) must not be shown. Segments may be merged where this enables display of aggregate data, only if the merge is methodologically defensible. The threshold and suppression rules must be configurable per jurisdiction based on legal counsel review.

**Audit logs must track access:**
All access to sensitive data layers must be recorded in the Audit Trail. A privacy audit must be able to determine who accessed which data, when, and why.

**No employer role can access named PIB or sensitive events:**
This rule must be enforced architecturally. An interface-level access control that blocks display is insufficient if the underlying data is accessible via an API, export or query. The privacy boundary must be enforced at the data model level.

---

## 35. What Must Not Be Modeled Incorrectly

The following are structural errors that would undermine KORA's methodology, privacy commitments or commercial positioning. They must be avoided in the technical schema design.

**Modeling budget as impact**
Budget and spend data belong to the INPUT and GOVERNANCE layers. They must never be inputs to the KORA Index calculation. A Budget entity connected directly to the KORA Index formula is a structural error.

**Modeling partner availability as impact**
Partner and Partner Service entities represent available resources, not impact outcomes. A high partner count must not increase the KORA Index. Partner utilization (verified worker usage generating IU) is the correct pathway to impact.

**Modeling fiscal eligibility as impact**
Eligibility Profiles and Eligibility Status are governance entities. They must never be inputs to the Impact Unit formula or the KORA Index. A service's fiscal eligibility does not increase its impact value.

**Exposing PIB as an employer-facing metric**
PIB records must not be surfaced to any employer role at individual level. If PIB appears in an employer-facing dashboard as a named, individually attributable score, the privacy model is broken.

**Mixing raw data with processed intelligence**
Raw Datasets and Ingestion Batches must be clearly separated from UEF Records and Impact Units. Raw data is input; processed data is output. Querying raw data to generate employer-facing outputs bypasses the quality, verification and anti-gaming logic of the UEF processing pipeline.

**Failing to version methodology**
Every Impact Unit, KORA Index, Confidence Score and Report must carry a Methodology Version reference. A score without a version reference cannot be audited, compared or certified.

**Failing to separate Impact Confidence and Eligibility Confidence**
These are two independent attributes with different meanings, different inputs and different outputs. Merging them into a single "confidence" field creates a model that cannot separately answer "is this action well-evidenced?" and "is this service fiscally classified correctly?"

**Creating one universal "score" that hides distinct dimensions**
The KORA Index, KORA Contribution and KORA Ecosystem Reach are separate indicators for a reason. Merging them into a single composite score produces a number that cannot be explained, cannot be actioned, and cannot be trusted.

**Treating AI classifications as final truth**
Any entity classification produced by an AI model (pillar mapping, eligibility pre-tagging, anomaly flag) must carry a "proposed" or "inferred" status until confirmed by a human reviewer or the methodology's rule-based system. AI outputs must be overridable, auditable and version-controlled.

**Hardcoding Italian fiscal categories instead of configurable perimeters**
The Fiscal/Budget Perimeter entity must be configurable by jurisdiction and company, not hardcoded. KORA may initially serve Italian companies, but the data model must support French welfare rules, German benefit frameworks, and custom internal policy budgets from day one — by design.

---

## 36. Open Questions and Founder Decisions Before Technical Schema

The following questions must be answered before the technical database schema is designed. Each has architectural implications that are difficult or expensive to change after implementation begins.

**Privacy architecture decision:**
How is the Worker Identity Layer physically separated from the Anonymized Worker Profile layer? Options include: separate database, separate schema, encryption at the pseudonymization layer with key management separate from analytical data. The specific approach must be decided with legal and technical architects.

**Pseudonymization key management:**
Who holds the pseudonymization key? If only KORA's privacy system holds it, no employer can reverse-map — but data subject rights (deletion, export) require KORA to be able to identify the relevant records. A clear key management and data subject rights process must be designed.

**Multi-geography support scope:**
Does Foundation Light support only Italy, or also other jurisdictions from day one? The Fiscal/Budget Perimeter entity must be configurable, but the taxonomy must be seeded for at least the initial target market. Decide: which fiscal perimeters must be seeded at launch?

**Ingestion pipeline design:**
Is the ingestion pipeline synchronous (company uploads, KORA processes immediately) or asynchronous (uploads go into a queue, processed in batches)? This affects how Ingestion Batch and Raw Dataset entities behave and how review workflows are structured.

**Methodology version activation:**
When a new Methodology Version is published, are existing company scores automatically recalculated, or do they remain under the prior version? Both approaches have pros and cons. The data model must support the chosen approach from day one.

**Evidence record storage:**
Where are actual evidence documents stored? Are they held within KORA's data store, or linked to external document management systems? The Evidence Record entity needs to know — a pointer to an external DMS behaves very differently from an internal blob store.

**Report generation architecture:**
Are reports generated on-demand (calculated fresh when requested) or pre-computed and stored (calculated on a schedule and stored as a Report entity)? The Report entity design depends on this choice.

**Advisor identity management:**
Are KORA-authorized advisors managed as KORA users (with accounts in the KORA system) or as external identity references? The Advisor Review entity needs to know whether to reference an internal User entity or an external identity.

**Audit trail immutability:**
How is the immutability of Audit Trail Records enforced technically? Options include: append-only tables, write-once storage, cryptographic hashing. The approach must be decided before schema design.

**Partner eligibility profile ownership:**
Who can update a Partner Service's Eligibility Profile — only KORA, only the partner, or both (with different confidence levels)? The workflow for Eligibility Profile updates must be defined before the entity relationships are finalized.

---

*KORA Conceptual Data Model & Core Entities — Version 0.1*
*Status: Approved — Foundational*
*Aligned with: Methodological Constitution v0.1, Foundational Product Brief, Product Architecture & Tiering, Business Model & Revenue Architecture, Fiscal & Policy Eligibility Layer, Eligibility Confidence.*
*Next step: Technical data model and database schema — to be produced after founder decisions in Section 36 are answered.*
