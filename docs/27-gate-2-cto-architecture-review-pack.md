# Foundation Light — Gate 2 CTO Architecture Review Pack
**Document:** `docs/27-gate-2-cto-architecture-review-pack.md`
**Type:** Gate 2 CTO Architecture Review — Production Readiness Assessment
**Audience:** CTO, Founder, Technical Lead, Senior Backend Engineer
**Status:** v1.0 — Active Review Reference
**Authority:** Acts as the structural Gate 2 review referenced in D-18 (doc 21). Produced from docs 10, 12, 13, 18, 19, 20, 21, 21b, 22A, 23, 24, 25, 26 and Appendix A.

---

## 1. Executive Summary

### 1.1 Purpose of This Review

Gate 2 is a production architecture review. It is not a product review, not a demo evaluation, and not an investment diligence exercise.

The central question is:

> **"Can KORA Foundation Light move from controlled demo architecture into production schema and backend design without creating architectural debt, privacy violations, methodology inconsistencies, or structural rework?"**

This review examines the target architecture defined across docs 10, 12, 13, and 21, assesses whether the 21 founder decisions (D-01 through D-21) translate into a coherent, buildable production design, and produces a judgment on readiness to generate doc 22 (SQL Schema Specification).

Gate 2 is not about whether the demo is impressive. The demo is a means to a commercial end. Gate 2 is about whether the underlying architecture can be trusted as the foundation for production artifacts.

### 1.2 What Gate 2 Approves or Blocks

**Gate 2 blocks until closed:**
- SQL DDL and production schema generation
- Prisma models and ORM configuration
- Supabase production project provisioning
- Database migrations
- Production backend services
- Production authentication / RBAC implementation
- Production API contract definition

**Gate 2 does not block:**
- Demo UI scaffolding and local synthetic data
- Mock service layer and scoring simulation
- Role/scenario/persona switchers
- Ingestion simulation and report preview
- Architecture-aligned demo app build

### 1.3 Preliminary Recommendation

**CONDITIONAL GO**

The core KORA architecture is coherent, well-specified, and technically sound at the conceptual level. The 5-store physical model, grant-absence privacy enforcement, methodology versioning, and 14-stage canonical algorithm flow are well-designed and production-aligned.

However, four specific schema areas need resolution before SQL DDL generation is safe:

1. **Worker personal data schema for My KORA** — booking/request, Dynamic CV, milestones, consent, personal plan tables exist in the demo layer but are not fully mapped to production store assignments in doc 12.
2. **Collective initiative production schema** — the demo layer handles this via seed files; the production schema for cross-company participation tracking needs a defined ownership model.
3. **Score run lineage** — the production scoring run concept (which approved UEF records feed which score run, and how re-runs are handled) needs schema-level clarity before SQL.
4. **Founder Validation Cockpit schema boundary** — this is an internal admin CRM feature that must not enter the production analytics schema; its correct store assignment needs a decision.

None of these are blockers to demo build. All are required before doc 22 SQL generation begins.

---

## 2. Gate 2 Scope

### 2.1 What Gate 2 Reviews

| Review Area | Source Document | CTO Focus |
|---|---|---|
| Overall architecture coherence | Doc 10, doc 12 | Is the 5-store model internally consistent? |
| Store boundaries | Doc 12 Sections 3–5 | Are the four schemas of Database B cleanly separated? |
| Data model readiness | Doc 12 Sections 7–29 | Can each entity class proceed to SQL spec? |
| Privacy and security model | D-01, D-02, D-04, D-06, D-07, D-08 | Is grant absence correctly placed? Is identity physically isolated? |
| Role and permission design | Doc 24 Section 5, doc 26 Section 10 | Are employer restrictions architecturally enforced, not policy-dependent? |
| Service boundaries | Doc 26 Sections 9, 9A | Do mock services map cleanly to production services? |
| Methodology versioning | D-09, D-11, D-21 | Is the version/calibration_status model technically complete? |
| Evidence metadata design | Doc 12 Sections 21 | Is evidence metadata separated from raw file content? |
| Auditability | D-14, doc 12 Section 25 | Is the audit trail INSERT-only, append-only, immutable? |
| Demo-to-production migration path | Doc 26 Sections 9A, 16 | Can mock services be replaced without UI rework? |
| Index and partitioning strategy | D-16 | Are the required indexes specified before SQL? |
| Blob storage and retention | D-17 | Is the evidence storage model defined? |
| Production blockers | D-18 | What must be resolved before first SQL artifact? |

### 2.2 What Gate 2 Does NOT Approve

Gate 2 does not authorize and must not be interpreted as authorizing:
- Live company data ingestion
- Production worker accounts or real worker identities
- SPID/CIE authentication
- Production SSO / SAML integration
- Real HRIS, welfare provider, or LMS integrations
- Fiscal or tax classification outputs presented to real companies
- Payment flows, wallet, KIP execution
- Real partner marketplace or booking engine
- KORA Link hardware integration
- KORA Impact Pledge execution
- Certified methodology claims or empirical validation claims
- Regulatory-grade reports

These remain blocked by Gates 3, 5, or by permanent scope exclusion.

---

## 3. Target Architecture Summary

### 3.1 Store Architecture

KORA's target architecture separates data into five logically and physically distinct stores.

**Store 1 — Identity Store (Database A — separate Supabase project)**

Holds the minimal identifiable worker data received during ingestion, before pseudonymization. This is a controlled boundary zone. Contains: `identity.worker_identity_records`, `identity.pseudonymization_key_references`. The only code paths that connect to Database A are the KORA pseudonymization service and the KORA privacy administrator process. No employer role, no partner role, no advisor role, no application server process other than the pseudonymization service ever connects to this database.

**Store 2 — Analytics Store (schema: analytics, Database B)**

Holds all processed pseudonymized event data and all scoring outputs. Contains: `worker_profiles`, `workforce_segments`, `uef_records`, `pillar_mappings`, `impact_units`, `pib_records`, `company_impact_aggregates`, `activation_safeguard_results`, `kora_indices`, `confidence_scores`, `kora_contributions`, `kora_ecosystem_reach`, `kora_evolution_snapshots`. Employer roles access only pre-built aggregate views — never raw event records or individual PIB rows.

**Store 3 — Governance Store (schema: gov, Database B)**

Holds all company configuration, program management, financial data, fiscal eligibility data, policy rules, methodology versioning, partner data, advisor reviews, reports, and founder validation data. Contains: ~40 tables covering companies, programs, users, roles, ingestion batches, financial governance, fiscal perimeters, partners, partner services, advisor reviews, reports, methodology versions, and related config tables.

**Store 4 — Evidence Metadata Store (schema: evidence, Database B)**

Holds metadata records for all evidence documents, with pointers to files in KORA-controlled external blob storage. Contains: `evidence.evidence_records`. Raw file content is stored in Supabase Storage buckets — not in the operational database. Evidence records with health or sensitive content carry elevated access restrictions.

**Store 5 — Audit Store (schema: audit, Database B)**

Holds the append-only audit trail. INSERT-only at the database level. The application role for this schema has INSERT permission only — no UPDATE, no DELETE, not even for KORA Admin via the application. Contains: `audit.audit_trail_records`.

### 3.2 Canonical Algorithm Flow

```
RAW SOURCE DATA (HR exports, welfare providers, LMS, ESG records)
        ↓
AI INGESTION / DATA MAPPING
(BCM taxonomy classifier — rule-based, no external LLM)
        ↓
PRIVACY & DATA SENSITIVITY LAYER
(Pseudonymization at ingestion boundary — before any analytical write)
        ↓
DATA QUALITY ENGINE
(Duplicate detection, missing data, confidence scoring, anomaly flags)
        ↓
UEF — UNIVERSAL EVENT FORMAT
(Canonical normalized event record — common language across all sources)
        ↓
NORMALIZED MAGNITUDE (NM)
(Duration normalized by event type and category cap)
        ↓
BASE CONTRIBUTION VECTOR (BC)
(Distribution of contribution across five pillars per event)
        ↓
CORRECTION FACTORS (CQ · EV · CF · AGF · [DF] · [EXF] · [SF])
(Quality, verification, continuity, anti-gaming applied)
        ↓
ANTI-GAMING & ANOMALY DETECTION
(Structural governance — cap enforcement, deduplication, pattern detection)
        ↓
IMPACT UNIT ENGINE
(IU = NM × BC × CQ × EV × CF × AGF [× DF] [× EXF] [× SF])
        ↓
PIB INDIVIDUALE (mandatory, never skippable)
(Per-worker aggregation of IU across all pillars — internal only, never employer-visible)
        ↓
COMPANY AGGREGATION
(Statistical aggregation of PIBs: AR, MAR, distributions, Gini, pillar totals)
        ↓
ACTIVATION SAFEGUARD (mandatory architectural layer, cannot be bypassed)
(Applies CLEAR / WARNING / FLAGGED based on AR and MAR thresholds)
        ↓
KORA INDEX ENGINE
(10 components: AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS)
        ↓
CONFIDENCE LAYER + EXPLAINABILITY LAYER
(Always inseparable from KORA Index output — non-suppressible)
        ↓
REPORTS / COMPANY WORKSPACE / MY KORA / PARTNER / ADVISOR
```

**Critical architectural rules that apply to every layer:**
- Identity and analytics are physically separated — different Supabase projects, no SQL join path, no shared connection pool.
- Employer-facing outputs come from aggregate-safe views, not from individual records.
- PIB is mandatory intermediate layer — no KORA Index from direct aggregates, bypassing PIB.
- Activation Safeguard is mandatory — no KORA Index is issued without Safeguard evaluation.
- Every scoring output carries `methodology_version_id` (NOT NULL) and `calibration_status` (NOT NULL).
- Financial data is input/governance layer — it does not enter the IU formula or KORA Index.

---

## 4. Demo Architecture vs Production Architecture

| Demo Construct | Current Foundation Light Implementation | Production Equivalent | Gate | Risk If Misused | CTO Judgment |
|---|---|---|---|---|---|
| Local JSON seed files | 29 synthetic JSON files in `/data/synthetic/` — zero infrastructure, version-controlled, doc 25-specified | Production database tables across gov, analytics, evidence schemas | Gate 2 | If JSON field naming drifts from doc 12 schema, production migration becomes a renaming exercise under time pressure | ALIGNED — JSON files are structurally informed by doc 12 entities. Do not let JSON field names become de facto column names in doc 22. Doc 12 governs schema, not the JSON. |
| Role switcher | Demo context provider switching between 11 roles | Production auth / RBAC / SSO with JWT-based role claims and grant-level enforcement | Gate 2 / Gate 3 | If developers start thinking the role switcher IS the permission system, grant-absence is not built correctly | ALIGNED — role switcher correctly simulates the permission boundaries. Production must enforce those same boundaries architecturally, not just in UI context. |
| Scenario switcher | S1/S2/S3/S4 pre-computed scenario context | Production versioned score runs — each run linked to approved UEF batch, methodology version, and reporting period | Gate 2 | If demo scenario switching becomes the mental model for production scoring, the relationship between score runs, UEF batches, and methodology versions is not correctly designed | RISK — score run lineage (which UEF records feed which score run, re-run handling) needs production schema definition before SQL. |
| Mock services | 15 services in `/services/` reading from local JSON and returning structured responses | Production API services reading from production stores | Gate 2 | If components bypass service interfaces and import seed files directly, the service boundary abstraction fails — and the production replacement becomes a UI rewrite | ALIGNED — doc 26 Section 9 and 9A correctly define mock services as architectural contracts. The discipline must hold during build. |
| Scoring simulator | ScoringSimulatorService reading from pre-computed seed data and methodology-config.json | Production scoring engine executing 14-stage pipeline against approved UEF store | Gate 2 | If the simulator returns hardcoded outputs not grounded in provisional methodology values, the production engine produces different results and explainability breaks | ALIGNED — methodology-config.json correctly externalizes weights and thresholds. No magic numbers in components. |
| Ingestion simulator | IngestionSimulatorService selecting from preloaded synthetic files | Production ingestion pipeline with real file parsing, pseudonymization, data quality engine | Gate 2 / Gate 3 | If the simulation skips the privacy layer (pseudonymization, sensitivity masking), the production pipeline design inherits incorrect data flow assumptions | ALIGNED in concept — pseudonymization is correctly defined as the first pipeline step. Demo does not simulate it but does not contradict it. |
| Privacy visibility service | PrivacyVisibilityService enforcing group threshold and role suppression in UI | Production grant absence + RLS + aggregate view layer | Gate 2 / Gate 3 | If the service is understood as the enforcement mechanism rather than a UI reflection of it, production falls back to application-layer filtering — the architecturally weaker approach | RISK — must be explicit in production design that PrivacyVisibilityService mirrors production grant-absence and view-level suppression; it is not the enforcement layer itself. |
| Report preview | ReportGeneratorService assembling report data from seed files | Production report generation service reading from production stores with real calibration_status and methodology_version_id | Gate 2 / Gate 5 | If calibration_status and methodology_version_id are hardcoded in mock reports rather than read from configuration, production report generation omits them silently | ALIGNED — doc 26 mandates that mock reports include mandatory metadata. Same discipline required in production. |
| DynamicCVService | Worker-controlled CV demo with status labels and LIFE category-level restriction | Production worker personal data service with database-backed CV items, consent linkage, and privacy enforcement | Gate 3 | Dynamic CV tables are not explicitly mapped to a production schema in doc 12. If left unresolved, the worker personal data service has no authoritative schema to target | NEEDS RESOLUTION — Dynamic CV, milestones, personal plan, and consent records need production schema assignment before SQL. See Section 18. |
| BookingRequestService | State machine simulation (Available → Requested → Confirmed / Waitlisted → Completed → Verified) | Production participation request workflow with database-backed state transitions and consent enforcement | Gate 3 | If the booking state machine is designed only for demo (in-memory transitions), production state persistence and audit trail integration are designed from scratch later — inconsistently | NEEDS RESOLUTION — booking/participation request schema must be defined before SQL. The state machine is correct; the persistence model needs production design. |
| Partner/advisor light workflows | Semi-functional preview reading from seed files | Production partner and advisor services backed by gov.partners, gov.advisor_reviews, evidence.evidence_records | Gate 2 | Partner and advisor data models in doc 12 (gov.partners, gov.partner_services, gov.advisor_reviews) appear well-defined. Risk is scope creep into marketplace | ALIGNED — doc 12 defines partner and advisor tables. Enforce the Booking Light boundary: no checkout, no pricing, no slot inventory. |
| Future vision mockups | Static screens with "Future Vision / Not Active" label — no data binding | Not applicable — future tiers | Future gates | If future vision screens accumulate stub services or partial data binding during build, they drift from static toward active — violating the cutline | ALIGNED — doc 26 Section 19 prohibits any runtime logic or data binding behind future vision screens. Verify enforcement during build. |

---

## 5. Store Boundary Review

### 5.1 Identity Store

**Boundary definition:** The Identity Store contains `identity.worker_identity_records` and `identity.pseudonymization_key_references`. These are the only two tables. Nothing else belongs here.

**What must never enter the Identity Store:**
- Analytical records (UEF, IU, PIB) — these are Analytics Store
- Company configuration — Governance Store
- Evidence documents — Evidence Store

**What must never leave the Identity Store:**
- Worker name, employee ID, national identifier, or any personal identifier must never be written to Database B
- The pseudonymization key for any worker must never be accessible to any code running in Database B's application process

**CTO judgment on boundary clarity:**
The boundary is architecturally well-defined in docs 10, 12 (Section 3.1), and D-01/D-02 (doc 21). The pseudonymization service as a dedicated Edge Function with Vault-based key storage is a correct implementation pattern. The critical implementation risk is the pseudonymization service being the only place that bridges Database A and Database B — any future feature that needs to access worker identity data must go through this service, not create a new connection path.

**Remaining Gate 3 dependencies:**
- GDPR legal counsel must validate the key-destruction-as-deletion approach (D-06) before first live data ingest
- Privacy/security specialist must validate the Vault-based key custody model (D-02) before first live data ingest
- GDPR counsel must validate the mid-period segment suppression approach (D-07)

**CTO decision:** Identity Store boundary is architecturally correct and production-ready in design. Conditional on Gate 3 specialist validation before live data.

---

### 5.2 Analytics Store

**Boundary definition:** The Analytics Store holds all pseudonymized event and scoring data. Key tables:
- `analytics.worker_profiles` — pseudonymized worker records (worker_pseudonym_id only, no identity link)
- `analytics.workforce_segments` — department/site groupings with `is_active` flag for safe aggregation enforcement
- `analytics.uef_records` — canonical normalized events
- `analytics.pillar_mappings` — event-to-pillar assignments
- `analytics.impact_units` — per-event IU values (formula trace, correction factors)
- `analytics.pib_records` — per-worker per-period PIB (internal only, never employer-visible)
- `analytics.company_impact_aggregates` — company-level statistical aggregations
- `analytics.activation_safeguard_results` — AR, MAR, status, penalty applied
- `analytics.kora_indices` — KORA Index outputs with all 10 component scores
- `analytics.confidence_scores` — Confidence Score records
- `analytics.kora_contributions` — KORA Contribution companion indicator
- `analytics.kora_ecosystem_reach` — availability indicator (dashboard-only)
- `analytics.kora_evolution_snapshots` — time-series delta records

**Can this store remain pseudonymized?**
Yes, by design. The pseudonymization service ensures that no real worker identifier enters the Analytics Store. The `worker_profiles.worker_pseudonym_id` is the only worker reference in this schema. No re-identification path exists without accessing Database A and the corresponding company pseudonymization key.

**Which tables require grant absence (not RLS) for employer roles?**
All of the following must have zero GRANT to employer-facing roles (`company_executive`, `company_hr_esg`, `company_finance`, `company_viewer`):
- `analytics.uef_records`
- `analytics.impact_units`
- `analytics.pib_records`
- `analytics.worker_profiles`

**Which outputs are safe for employer access?**
Via pre-built PostgreSQL views only, incorporating `WHERE is_active = TRUE` for workforce segments:
- `analytics.company_impact_aggregates` (aggregate view, group threshold enforced)
- `analytics.activation_safeguard_results` (aggregate values only — AR, MAR, status)
- `analytics.kora_indices` (company-level output — safe)
- `analytics.confidence_scores` (company-level output — safe)
- `analytics.kora_contributions` (aggregate only — no individual participants)
- `analytics.kora_ecosystem_reach` (aggregate only)
- `analytics.kora_evolution_snapshots` (aggregate trend data)

**CTO judgment on grant absence implementation:**
D-04 (doc 21) is explicit: grant absence is the correct mechanism, not RLS, for the four prohibited tables. This is architecturally sound. The risk is implementation drift where a developer adds a "helper query" that joins employer-facing views with individual records. The production codebase must enforce that employer-role database connections have no SELECT GRANT on the four prohibited tables — verifiable at the infrastructure level, not just the application level.

**High-sensitivity record protection:**
D-08 establishes a two-layer protection for `privacy_sensitivity = 'high'` records in `analytics.uef_records`: (1) grant absence for all employer roles, (2) RLS restricting high-sensitivity rows to `KORA_PRIVACY_ADMIN` only — even `KORA_ANALYST` cannot read individual high-sensitivity UEF records. This is architecturally correct and distinct from the grant-absence protection. Both must be implemented independently.

**CTO decision:** Analytics Store boundary and access model are well-defined. Production-ready in design pending CTO verification of grant-absence implementation at Gate 2 close.

---

### 5.3 Governance Store

**Boundary definition:** The Governance Store (`schema: gov`) holds company configuration, program management, financial governance, fiscal eligibility, methodology versioning, partner catalog, advisor reviews, reports, and the founder validation cockpit.

**Key methodology versioning tables:**
- `gov.methodology_versions` — master methodology version record with calibration_status
- `gov.kora_index_weight_versions` — component weight vectors per version
- `gov.bcm_versions` + `gov.bcm_entries` — BCM taxonomy per version
- `gov.nm_rules_versions` + `gov.nm_rules` — NM scaling rules per version
- `gov.correction_factor_rule_versions` — factor range definitions per version
- `gov.anti_gaming_rules_versions` — anti-gaming rule definitions per version

**Are methodology and score runs versioned?**
Yes. The `gov.methodology_versions` table carries `calibration_status` and `is_current`. Score outputs in the Analytics Store carry `methodology_version_id` (NOT NULL). The Delphi transition creates a new methodology version record without requiring migration of historical score records.

**Are provisional values distinguishable from certified values?**
Yes. `calibration_status = 'pre_empirical_calibration'` is set at seeding and must not be changed until the Delphi Study produces empirically validated values. This is a business rule enforced at the application layer — the schema supports it.

**Are future modules inactive?**
Key inactive tables that exist in schema but must not be activated:
- `gov.fuo_accounts` — FUO reference (optional at pilot, not populated)
- `gov.fiscal_guardrails_rules` + `gov.fiscal_guardrails_results` — fiscal guardrails engine (Gate 5)
- `gov.welfare_statements` — welfare statement output (Gate 5)
- Any future KIP, KORA Value Chain active, territorial tables — not present in Foundation Light schema per doc 12 Section 28

**Open question — Founder Validation Cockpit schema:**
The Founder Validation Cockpit (A-14 in demo) is an internal admin CRM feature. It exists in the demo as `demo_founder_validation_contacts.json`. It must not enter the production Analytics Store (it has nothing to do with impact measurement). If it enters production, it belongs in a separate admin/internal schema or as a lightweight table in `gov`. This decision needs a clear answer before SQL. See Section 18.

**CTO decision:** Governance Store boundary is well-defined. Methodology versioning model is production-ready. Fiscal guardrails correctly inactive. Founder Validation Cockpit placement needs a decision before SQL.

---

### 5.4 Evidence Metadata Store

**Boundary definition:** The Evidence Store (`schema: evidence`) holds metadata only. One primary table: `evidence.evidence_records`. Raw file content is stored in Supabase Storage (three buckets: `raw-datasets`, `evidence-files`, `report-exports`). The database stores document identifiers, storage pointers, document hashes (integrity verification), issuer information, validity periods, and privacy sensitivity flags — not binary content.

**Does evidence support auditability without excess sensitive data?**
Yes, if the boundary is correctly enforced. The evidence metadata model supports: (1) knowing what evidence exists and when it was uploaded, (2) verifying document integrity via hash comparison, (3) linking evidence to specific UEF records and advisor reviews, (4) access-logging for GDPR audit. It does not require raw file content in the database.

**Is worker-uploaded evidence privacy-protected?**
The evidence record must carry a `privacy_sensitivity` flag. Evidence records supporting health-related events (Mindspace, Nutriwell, health checks) must be classified `HIGH` and must apply the same access restriction as high-sensitivity UEF records. No employer role can access individual health evidence. Evidence is scoped to the entity it supports (specific UEF record, specific advisor review) — not broadly available.

**Are clinical/medical documents excluded?**
Clinical health records must not be stored in KORA. The evidence upload simulation in the demo correctly rejects clinical document types. Production must enforce this at the upload validation step. KORA evidence is participation confirmation, not medical documentation.

**Blob storage retention (D-17):**
Provisional: evidence files 7 years, report exports 3 years, raw datasets 1 year post-processing. These must be confirmed by legal counsel before first live evidence document is stored (Gate 3 dependency).

**CTO decision:** Evidence Metadata Store boundary is correct. Binary content in blob storage, metadata in database is the right pattern. Retention periods need Gate 3 legal confirmation.

---

### 5.5 Audit Store

**Boundary definition:** The Audit Store (`schema: audit`) holds one table: `audit.audit_trail_records`. INSERT-only at the database level. The application database role (`kora_audit_writer`) has GRANT INSERT only — no SELECT, no UPDATE, no DELETE. No application component writes directly to this table; all writes go through the Audit Writer service (a dedicated Edge Function).

**Is auditability sufficient?**
The design is sufficient if the following events are mandatory in the audit trail:
- Ingestion batch status changes (Submitted → Under Review → Approved → Processing → Complete / Error)
- Column mapping decisions (AI suggestion, analyst override, rejection)
- UEF record review outcomes (approved / rejected / flagged, reviewer, reason)
- Scoring run triggers and completions (with methodology version pinned)
- Methodology version changes (creation, is_current transition)
- Role and permission changes
- Report generation and export downloads
- Privacy Officer exceptional access events (with justification)
- GDPR deletion requests and cascade execution
- Anti-gaming flag triggers and resolutions
- Data correction or manual adjustment events (with before/after values)

**What must be immutable?**
Every record in `audit.audit_trail_records` is immutable once inserted. No UPDATE, no DELETE — enforced at the PostgreSQL role level, not the application level. This is what makes the audit trail usable for compliance defense.

**What requires privileged logging?**
Privacy Officer exceptional access events must be logged with: actor, accessed entity, stated justification, legal basis reference, timestamp. Standard KORA Admin events do not require this elevated logging.

**CTO decision:** Audit Store design is correct. INSERT-only role provisioning (D-14, doc 21) is approved and production-ready. The kora_audit_writer connection architecture (a dedicated Edge Function as the only write path) correctly mirrors the pseudonymization service pattern.

---

## 6. Data Model Readiness Review

Status codes: **APPROVE** (proceed to SQL spec as-is), **APPROVE WITH CONDITIONS** (proceed with noted constraints), **DEMO-ONLY** (not in production schema), **FUTURE-ONLY** (not in Foundation Light), **BLOCKED** (specific blocker listed).

| Entity / Table Area | Production Need | Current Readiness | Issues | Gate 2 Decision |
|---|---|---|---|---|
| `gov.companies` | Core — company records | Well-defined in doc 12 | None | APPROVE |
| `gov.company_programs` | Core — program config, methodology version, period | Well-defined | None | APPROVE |
| `identity.worker_identity_records` | Core — employee ID intake before pseudonymization | Well-defined | GDPR deletion procedure must be written before first use (D-06, Gate 3) | APPROVE WITH CONDITIONS (Gate 3 for live data) |
| `identity.pseudonymization_key_references` | Core — key metadata only | Well-defined | Key custody in Vault validated by specialist before live data (D-02) | APPROVE WITH CONDITIONS (Gate 3) |
| `gov.users` + `gov.roles` + `gov.user_roles` | Core — role provisioning | Well-defined | Demo uses role switcher; production needs JWT/SSO (Gate 2/3) | APPROVE (schema) |
| `gov.data_sources` | Core — registered source systems | Well-defined | None | APPROVE |
| `gov.raw_datasets` | Core — raw file intake | Well-defined | None | APPROVE |
| `gov.ingestion_batches` + `gov.ingestion_batch_datasets` | Core — ingestion lifecycle | Well-defined with lifecycle states | None | APPROVE |
| `gov.ingestion_rejection_records` | Core — rejected row documentation | Well-defined | None | APPROVE |
| `analytics.worker_profiles` | Core — pseudonymized worker records | Well-defined | Grant absence required — no employer GRANT | APPROVE WITH CONDITIONS (grant-absence enforced) |
| `analytics.workforce_segments` | Basic — dept/site groupings | Well-defined | `is_active` suppression logic must be in view layer (D-07) | APPROVE WITH CONDITIONS |
| `analytics.uef_records` | Core — canonical event records | Well-defined, comprehensive field set | Grant absence for employer roles; RLS for high-sensitivity restriction | APPROVE WITH CONDITIONS (both access controls) |
| `analytics.pillar_mappings` | Core — event-to-pillar linkage | Well-defined | None | APPROVE |
| `analytics.impact_units` | Core — per-event IU computation | Well-defined with formula trace fields | Grant absence for employer roles | APPROVE WITH CONDITIONS |
| `analytics.pib_records` | Core — per-worker PIB aggregation | Well-defined | Grant absence for employer roles; never visible to employer individually | APPROVE WITH CONDITIONS |
| `analytics.company_impact_aggregates` | Core — company-level statistical aggregation | Well-defined | Employer access via aggregate views only — not raw table | APPROVE WITH CONDITIONS |
| `analytics.activation_safeguard_results` | Core — mandatory safeguard output | Well-defined | Must be required foreign key on `analytics.kora_indices` | APPROVE |
| `analytics.kora_indices` | Core — KORA Index output record | Well-defined | Must require valid `activation_safeguard_result_id` | APPROVE |
| `analytics.confidence_scores` | Core — inseparable from KORA Index | Well-defined | Must be co-created with kora_indices row — not optional | APPROVE |
| `analytics.kora_contributions` | Basic — KORA Contribution companion indicator | Well-defined | Must be kept separate from kora_indices — not a 10-component input | APPROVE |
| `analytics.kora_evolution_snapshots` | Basic — time-series delta | Well-defined | None | APPROVE |
| `analytics.kora_ecosystem_reach` | Basic — availability dashboard | Well-defined | Dashboard-only — must never enter KORA Index formula | APPROVE WITH CONDITIONS |
| `gov.methodology_versions` + component tables | Core — versioning backbone | Well-defined (7 methodology tables) | `calibration_status = 'pre_empirical_calibration'` must be NOT NULL and non-suppressible | APPROVE |
| `gov.kora_index_weight_versions` | Core — weight vectors | Well-defined | Equal weights (0.10×10) are scaffolding — must be readable, not hardcoded | APPROVE |
| `gov.financial_budgets` + `gov.financial_movements` | Basic — financial governance | Well-defined | No path from financial tables to KORA Index formula — enforce at schema level | APPROVE WITH CONDITIONS |
| `gov.financial_governance_snapshots` | Basic — financial dashboard data | Well-defined | Company Finance read access via views only | APPROVE WITH CONDITIONS |
| `gov.fiscal_perimeters` + `gov.fiscal_category_thresholds` | Basic (Italy-seeded) | Well-defined | Informational only; tax advisor must validate Italy perimeters before live client use (Gate 5) | APPROVE WITH CONDITIONS (Gate 5 for live fiscal use) |
| `gov.fiscal_guardrails_rules` + `gov.fiscal_guardrails_results` | Future — fiscal guardrails engine | Defined but inactive | Must remain inactive until Gate 5 | FUTURE-ONLY (inactive in Foundation Light) |
| `gov.partners` + `gov.partner_services` | Basic — partner catalog | Well-defined | Eligibility confidence = `kora_inferred` at pilot — informational only | APPROVE |
| `evidence.evidence_records` | Core — evidence metadata | Well-defined | Binary content in blob storage only; health evidence access-restricted | APPROVE WITH CONDITIONS |
| `gov.advisor_reviews` + `gov.advisor_review_evidence` | Basic — advisor review workflow | Well-defined | Scoped to assigned reviews; no cross-company access | APPROVE |
| `gov.reports` + `gov.report_exports` | Core — report records | Well-defined | Every report record must carry calibration_status and methodology_version_id | APPROVE WITH CONDITIONS |
| `audit.audit_trail_records` | Core — immutable audit trail | Well-defined | INSERT-only role enforced at PostgreSQL level (D-14); Audit Writer Edge Function only write path | APPROVE |
| `gov.fuo_accounts` | Optional at pilot — FUO reference | Well-defined | Not required at Foundation Light pilot (D-13) | APPROVE (schema exists, optional population) |
| `gov.welfare_statements` | Future — welfare statement outputs | Well-defined | Inactive until Gate 5 | FUTURE-ONLY (inactive in Foundation Light) |
| `gov.svam_configurations` | Basic — SVAM configuration reference | Well-defined | SVAM Variant A for pilot; not active as financial intermediary | APPROVE WITH CONDITIONS (Gate 5 for activation) |
| **Worker personal data layer (My KORA)** | Core for worker-facing product | **NOT MAPPED IN DOC 12** | Dynamic CV, Personal Plan, Milestones, Consent Records, Booking/Request records are in demo seed files but not mapped to production schema in doc 12. This is the most significant schema gap. | **BLOCKED — needs schema assignment before SQL** |
| **Score run lineage** | Core — production scoring | **PARTIALLY DEFINED** | The production concept of a "score run" (which approved UEF records, which methodology version, re-run handling, score run history) needs production schema clarity before SQL | **NEEDS RESOLUTION before SQL** |
| **Collective initiative production schema** | Basic — cross-company participation | **DEMO-ONLY in current state** | `collective-initiatives.json` seed file exists but production schema for cross-company initiative participation tracking is not defined in doc 12 | **NEEDS RESOLUTION before SQL** |
| **Founder Validation Cockpit** | Demo/admin internal | **DEMO-ONLY** | This is an internal CRM feature for Simone. It must not enter the production analytics schema. If it needs to persist post-demo, it belongs in a lightweight admin table in `gov` or a separate internal tool. | **DECISION NEEDED — DEMO-ONLY or thin gov table** |

---

## 7. Privacy and Security Architecture Review

| Privacy Boundary | Required Rule | Current Design | Risk | Gate 2 Decision |
|---|---|---|---|---|
| Identity-analytics separation | Physical database separation — no SQL join path | D-01: Separate Supabase projects. Pseudonymization service is the only bridge | Risk: if a future feature adds a direct DB connection from app server to Database A | PASS — design is correct. Implementation must be verified before any data ingest. |
| Employer cannot access UEF/IU/PIB | Grant absence — no GRANT of any kind on four tables | D-04: Approved. Grant absence, not RLS, for the four prohibited tables | Risk: developer adds a "convenience query" with employer role — would require a GRANT that is explicitly absent | PASS WITH CONDITIONS — must be verified at infrastructure provisioning |
| Employer cannot access worker profiles | Grant absence on `analytics.worker_profiles` | D-04: Included in grant absence scope | Same as above | PASS WITH CONDITIONS |
| Employer sees aggregate only above threshold | Mandatory `WHERE is_active = TRUE` in views; `workforce_segments.is_active` logic | D-07: Approved. View-layer enforcement — not application-layer only | Risk: mid-period segment drop below threshold handled by immediate `is_active = FALSE` | PASS — view-layer enforcement is architecturally correct |
| High-sensitivity UEF records restricted | KORA_PRIVACY_ADMIN only — RLS in addition to grant absence | D-08: Two-layer protection. Grant absence for employer; RLS for analyst restriction on `privacy_sensitivity = 'high'` rows | Risk: RLS policy misconfiguration allows KORA_ANALYST to read health records | PASS WITH CONDITIONS — two layers must be verified independently |
| Worker controls Dynamic CV | No auto-share; no employer notification on export; no employer visibility on CV contents | Defined in DynamicCVService (demo). Production schema not yet defined. | Risk: if Dynamic CV items are stored in Analytics Store under a worker_pseudonym_id, a query against that ID by KORA Admin could access CV data | NEEDS RESOLUTION — Dynamic CV production schema and access model need definition before SQL |
| Booking/request privacy | Worker booking history never visible to employer | BookingRequestService (demo). Production schema not yet defined. | If booking records are in Analytics Store, grant-absence scope needs explicit extension to booking tables | NEEDS RESOLUTION — booking schema must define store placement and access scope |
| Partner sees only scoped request context | Request context with consent flag — no PIB, no timeline, no Dynamic CV | Demo enforces via BookingRequestService returning scoped data. Production needs schema-level enforcement | Risk: partner-facing API query returns more than request context if not explicitly scoped | PASS IN CONCEPT — production service must be scoped by design, not just by API filter |
| Advisor sees only assigned reviews | Assigned review records only — no cross-advisor, no cross-company access | Demo enforces via AdvisorReviewService. `gov.advisor_reviews.advisor_id` is the scope key | Risk: advisor role gets broad SELECT on advisor_reviews and filters in application | PASS WITH CONDITIONS — RLS on `gov.advisor_reviews` by `advisor_id` is appropriate |
| KORA Admin ≠ KORA Privacy Officer | Two distinct roles with distinct permission sets | D-08: Separate roles defined. KORA Admin cannot see high-sensitivity UEF or booking/Dynamic CV contents | Risk: if KORA Admin is implemented as a superuser role, Privacy Officer distinction collapses | PASS IN CONCEPT — must be enforced at GRANT level: KORA Admin does not have KORA_PRIVACY_ADMIN role |
| Privacy Officer exceptional access logged | All exceptional access with justification in audit trail | D-14 audit trail pattern applies; exceptional access events need a dedicated event type in `audit.audit_trail_records` | Risk: exceptional access is not logged with justification — compliance defense becomes impossible | PASS WITH CONDITIONS — dedicated audit event type required for Privacy Officer access |
| Sensitive wellbeing — category level only | No session detail, no diagnosis, no therapist notes at any role level | UEF review: sensitivity badge replaces detail. DynamicCVService: LIFE items at category level | If UEF record stores full session notes, even the category-level display path has the data | PASS IN CONCEPT — `analytics.uef_records` schema must not include a field for clinical session content. Evidence documents in blob storage are the right place for any supporting documentation. |
| Clinical/medical records excluded | No clinical health records in any store | Demo rejects clinical document types. Production evidence upload must enforce same | Risk: partner uploads medical records as "evidence" — must be validated at upload boundary | PASS WITH CONDITIONS — evidence upload validation must enforce document type restrictions |
| Minimum privacy threshold | Default 10 workers. Below-threshold segments suppressed. | `workforce_segments.is_active` + view-layer `WHERE is_active = TRUE` | Risk: segment created with 8 workers — must not appear in any employer-facing aggregate output | PASS — enforced by view design. Must be tested before any employer-facing query goes live. |

---

## 8. Role and Permission Review

| Role | Intended Access | High-Risk Data | Required Denials | Gate 2 Concern | Decision |
|---|---|---|---|---|---|
| KORA Admin | Full admin side — companies, programs, ingestion, scoring, explainability, audit timeline, founder validation | Pseudonymized UEF records, scoring outputs, audit trail | Must NOT access: individual PIB, Dynamic CV, booking records, worker personal plan, consent records, worker bookings | KORA Admin must not be implemented as a superuser. Distinct from Privacy Officer. | PASS WITH CONDITIONS — GRANT scope must be explicit and documented before SQL |
| KORA Analyst | Read-only access to pseudonymized UEF, IU, aggregate data — review functions | Pseudonymized UEF records | Must NOT access: high-sensitivity UEF rows, worker personal layer, booking records, Dynamic CV | RLS on `analytics.uef_records` restricts high-sensitivity rows. Analyst cannot access ANY high-sensitivity rows. | PASS WITH CONDITIONS — RLS must be implemented and verified independently of grant absence |
| KORA Privacy Officer | Exceptional, legally justified access to identity-linked data — audit functions only | Identity-linked records, high-sensitivity UEF | Must be purpose-limited, logged, and justified for every access event | Privacy Officer is NOT KORA Admin. Must have a distinct role definition. Access events go to audit trail with justification. | NEEDS DEFINITION — production role must be explicitly defined with narrow GRANT scope and mandatory audit logging |
| Company Admin | Full company workspace — all aggregate outputs, program management, report generation | Company aggregate outputs | Must NOT access: any My KORA routes, individual UEF/IU/PIB, worker timeline, bookings, Dynamic CV, personal plan | Route guard + component-level role check. Grant absence enforces at DB level. | PASS — consistent with D-04. Verify route guard implementation during build. |
| Company HR / People | Company workspace — activation, participation, pillar views, aggregate intelligence | Company aggregate outputs | Same as Company Admin. No individual worker data. | Primary consumer of aggregate intelligence outputs. Aggregate view must enforce group threshold. | PASS — consistent with D-07. View-layer suppression must be verified. |
| Company ESG | Company workspace — KORA Contribution, ESG report, collective initiatives aggregate | Company aggregate outputs, KORA Contribution aggregate | Same denials as Company Admin. KORA Contribution aggregate only — no individual participants. | No concern beyond standard employer restrictions. | PASS |
| Company Finance | Aggregate KORA Index summary, Confidence Score, Financial Governance Light, cost per IU, fiscal classification informational layer, finance-relevant reports | Financial governance outputs, aggregate KORA Index | Must NOT access: individual worker data, workforce drilldowns below privacy threshold, individual UEF/IU/PIB, bookings, partner contacts, Dynamic CV | Company Finance correctly has access to KORA Index at aggregate level — not denied entirely. Financial governance is a parallel layer. | PASS — doc 26 Section 10.1 updated to correctly reflect aggregate KORA Index access. Verify view definitions include Company Finance as authorized reader of aggregate views. |
| Company Viewer / Board | Executive Cockpit read-only — KORA Snapshot, top-level aggregate outputs | Aggregate outputs only | Same denials as Company Admin. Most restricted company role. | No concern. Narrowest read-only scope. | PASS |
| Worker | My KORA only — own PIB, own timeline, own bookings, own Dynamic CV, own personal plan | Own personal data (never other workers) | Must NOT access: any other worker's data, any company aggregate output beyond Company KORA Snapshot | Worker personal data schema needs production definition. Worker sees only their own pseudonymized ID's data. | NEEDS RESOLUTION — depends on worker personal data schema definition (Section 18) |
| Partner Admin Light | Partner workspace — profile, services, requests with consent, collective initiatives, evidence upload | Request context with consent flag | Must NOT access: worker PIB, company KORA Index, worker timeline or Dynamic CV, other partner data | Partner sees only request context for workers who have explicitly consented. Production service must enforce this at query level. | PASS IN CONCEPT — production API must scope partner queries by consent linkage |
| Advisor External Light | Advisor workspace — assigned review queue, evidence inspection, confidence assignment | Assigned review records only | Must NOT access: unassigned reviews, cross-company reviews, worker personal data beyond review-specific context | Advisor scope enforced by `advisor_id` on `gov.advisor_reviews`. RLS is appropriate here. | PASS — RLS on advisor_reviews by advisor_id is correct and sufficient |

---

## 9. Service Architecture Review

| Service | Responsibility | Inputs | Outputs | Store Touched | Privacy Constraints | Production Readiness | Demo Equivalent (doc 26) | Gate 2 Decision |
|---|---|---|---|---|---|---|---|---|
| **Ingestion Service** | Receive raw file uploads, validate format, create ingestion batch records, hand off to Mapping Service | Raw files (CSV, XLSX), company context | Ingestion batch record, batch status | gov | No real worker data before Gate 3; raw files in `raw-datasets` bucket | Architecture defined; depends on pseudonymization service running first | IngestionSimulatorService | APPROVE architecture — SQL schema may proceed |
| **Mapping / BCM Taxonomy Service** | Apply BCM taxonomy rules to column headers; return confidence scores and pillar suggestions; flag low-confidence and sensitive fields | Column headers, batch context, BCM taxonomy version | Mapping suggestions per column (confidence, pillar, match reason, flags) | gov (BCM taxonomy tables), analytics (UEF draft creation) | No external LLM — rule-based classifier only (Rule 31, doc 19 Section 9.2) | Architecture defined | MappingConfidenceService | APPROVE |
| **UEF Review Service** | Manage UEF review workflow — approve, reject, flag; enforce that rejected records are excluded from scoring | UEF draft records, reviewer decisions | Updated UEF records with review_status; approved record list for scoring | analytics (uef_records) | Employer must never access individual UEF records; high-sensitivity rows restricted to Privacy Officer | Architecture defined | UEFReviewService | APPROVE |
| **IU Engine** | Apply canonical IU formula to each approved UEF record; produce impact_units records with formula trace | Approved UEF records, methodology version config | `analytics.impact_units` records (IU value, formula trace, correction factors) | analytics, gov (methodology tables) | IU records require grant absence for employer roles | Architecture defined; formula is canonical (doc 10 Section 11) | ScoringSimulatorService (IU stage) | APPROVE |
| **PIB Service** | Aggregate IU records by worker_pseudonym_id and period to produce PIB records | `analytics.impact_units`, period definition | `analytics.pib_records` (pillar breakdown, total PIB) | analytics | PIB records require grant absence for employer roles; never employer-visible individually | Architecture defined | ScoringSimulatorService (PIB stage) | APPROVE |
| **Company Aggregation Service** | Aggregate PIB records to produce company-level statistical outputs (AR, MAR, distributions, Gini, pillar totals) | `analytics.pib_records`, workforce headcount, period | `analytics.company_impact_aggregates` | analytics | Aggregate output — employer-visible via views above group threshold | Architecture defined | ScoringSimulatorService (aggregation stage) | APPROVE |
| **Activation Safeguard Service** | Evaluate AR and MAR against provisional thresholds; produce status (CLEAR/WARNING/FLAGGED) | `analytics.company_impact_aggregates`, threshold config from methodology | `analytics.activation_safeguard_results` | analytics, gov (methodology tables) | Safeguard status is aggregate output — employer-visible | Architecture defined; thresholds from methodology config (D-21) | ActivationSafeguardService | APPROVE |
| **Scoring Engine (KORA Index)** | Apply 10-component KORA Index formula to company aggregates and safeguard result; produce `kora_indices` record | `analytics.company_impact_aggregates`, `analytics.activation_safeguard_results`, weight config | `analytics.kora_indices` (10 component scores, KORA Index value, methodology_version_id, calibration_status) | analytics, gov | Company-level output — employer-visible via views | Architecture defined | ScoringSimulatorService (KORA Index stage) | APPROVE |
| **Confidence Service** | Compute Confidence Score based on source diversity, evidence quality, data completeness, and continuity factor | Multiple inputs from analytics and gov | `analytics.confidence_scores` (score + sub-factors) | analytics | Company-level output — must always accompany kora_indices | Architecture defined | ScoringSimulatorService (confidence stage) | APPROVE |
| **Explainability Service** | Generate plain-language component explanations, data quality notes, limitations for each KORA Index output | `analytics.kora_indices`, component scores, data quality indicators | Explanation record (linked to `kora_indices`) | analytics, gov | Explanations are aggregate — no individual attribution | Architecture defined; explanation schema needs definition in doc 22 | ExplainabilityService | APPROVE WITH CONDITIONS — explanation record schema needs definition in SQL spec |
| **KORA Contribution Service** | Compute KORA Contribution companion indicator from collective initiative participation | Collective initiative participation records, aggregate IU from IMPACT pillar | `analytics.kora_contributions` | analytics, gov | Aggregate counts only — no individual participant names | Architecture defined; collective initiative schema needs production definition | KoraContributionService | APPROVE WITH CONDITIONS — collective initiative schema needs definition |
| **Privacy / Visibility Service** | Enforce group threshold suppression, sensitivity minimization, role-based access rules | Data type, group size, active role, sensitivity level | Visibility decision + display copy | analytics (views) | This is a UI reflection of DB-level controls — not the enforcement layer | Architecture defined; production enforcement is in DB views and grants, not this service | PrivacyVisibilityService | APPROVE — but must be explicit that this mirrors DB controls, not replaces them |
| **Role Permission Service** | Resolve allowed actions per role for given screen and data type | Active role, screen ID, data type, requested action | Boolean (allowed/denied) + denial reason | gov (roles) | Must enforce employer restrictions; KORA Admin ≠ Privacy Officer | Architecture defined | RolePermissionService | APPROVE — production must be backed by RBAC database, not in-memory permission matrix |
| **Partner Service** | Manage partner catalog, services, collective initiatives, partner-facing request views | gov (partners, partner_services, collective_initiatives) | Partner profile, services, request context (scoped) | gov | No worker PIB or timeline accessible to partner; request context scoped by consent | Architecture defined | DemoDataService + seed data for partner entities | APPROVE — depends on collective initiative schema definition |
| **Booking / Participation Request Service** | Manage participation request state transitions — Available → Requested → Confirmed/Waitlisted → Completed → Verified | Worker request, initiative/opportunity context, consent record | Request record with status and audit trail | UNDEFINED — production schema not yet assigned | Worker-only read access; partner sees only request context with consent flag; no employer access | **Architecture undefined** | BookingRequestService | BLOCKED — needs schema definition and store assignment before SQL |
| **Dynamic CV Service** | Manage worker-controlled CV — item selection, status labels, export with worker authorization | Worker context, timeline items, consent for sharing | Dynamic CV item records, export data | UNDEFINED — production schema not yet assigned | Worker-only; employer never auto-receives; no employer notification on export | **Architecture undefined** | DynamicCVService | BLOCKED — needs schema definition and store assignment before SQL |
| **Advisor Review Service** | Manage advisor review workflow, evidence inspection, confidence assignment, recommendations | gov (advisor_reviews, advisor_review_evidence) | Updated review records, eligibility confidence, recommendations | gov, evidence | Scoped to assigned reviews; no cross-advisor access | Architecture defined | AdvisorReviewService (from DemoDataService + seed data) | APPROVE |
| **Report Service** | Assemble report data, generate report record, manage export download links | All relevant analytics and gov outputs | `gov.reports`, `gov.report_exports`, blob storage pre-signed URL | gov, analytics (via views), blob storage | calibration_status and methodology_version_id mandatory in every report; no certified claims | Architecture defined | ReportGeneratorService | APPROVE WITH CONDITIONS — mandatory report metadata fields must be enforced at service level |
| **Audit Service** | Write immutable audit events to `audit.audit_trail_records` | Structured event payloads from all other services | `audit.audit_trail_records` INSERT | audit | INSERT-only role; no client-side writes; Edge Function only | Architecture defined; kora_audit_writer pattern approved (D-14) | Not demoed directly | APPROVE |
| **Founder Validation Service** | Return internal CRM data for admin validation cockpit | Internal contact records | Contact list, KPI summary, objection catalog | UNDEFINED | Admin-internal; no company or worker data exposure | Not in production scope | FounderValidationService | DECISION NEEDED — demo-only or thin gov table |

---

## 10. Methodology / Scoring Implementation Review

| Scoring Requirement | Implementation Need | Current Readiness | Risk | Gate 2 Decision |
|---|---|---|---|---|
| KORA Index v3 — 10 components only | kora_indices table stores 10 component scores; no additional components | Defined in doc 12; 10 components in kora_index_weight_versions | Risk: KORA Contribution or KORA Ecosystem Reach mistakenly added as component 11 | PASS — must be a database-level constraint: kora_index_weight_versions has exactly 10 rows per version |
| Equal weights as configurable scaffolding | Weights in gov.kora_index_weight_versions — not hardcoded in application | D-21 provisional values: 0.10 × 10. Config is in methodology-config.json for demo and will be in gov.kora_index_weight_versions in production | Risk: developer hardcodes 0.10 in a scoring function rather than reading from gov table | PASS WITH CONDITIONS — SQL schema must enforce that scoring functions read from gov tables; no magic numbers |
| methodology_version_id NOT NULL on all outputs | All tables: impact_units, pib_records, company_impact_aggregates, activation_safeguard_results, kora_indices, confidence_scores carry NOT NULL methodology_version_id | Defined as schema principle P-03 in doc 12 | Risk: a scoring output is created without linking to a methodology version | PASS — must be a SQL NOT NULL constraint, not application-level validation |
| calibration_status NOT NULL on all scoring outputs | Same tables carry calibration_status as NOT NULL field | Defined in doc 12; mandatory per doc 21b Rule 33 | Risk: calibration_status is nullable, allowing silent omission | PASS — must be a SQL NOT NULL constraint with CHECK (calibration_status IN ('pre_empirical_calibration', 'empirically_calibrated')) |
| score_run concept required | Each KORA Index computation must be traceable to: which UEF records were approved, which methodology version was active, when the run occurred | **PARTIALLY DEFINED** — ingestion_batches exist but the score run concept (linking a batch to a scoring execution to an output) needs a dedicated table or relationship | Risk: production scoring re-runs create multiple kora_indices records for the same period without clear lineage — audit trail becomes ambiguous | NEEDS RESOLUTION — a `gov.scoring_runs` or equivalent linking mechanism must be defined in SQL spec |
| Confidence Score always attached | confidence_scores table linked to kora_indices; no kora_indices record without a confidence_scores record | Defined in doc 12 | Risk: confidence_scores is a separate table — if the FK is not enforced, a KORA Index can exist without a Confidence Score | PASS WITH CONDITIONS — NOT NULL FK from kora_indices to confidence_scores required |
| Activation Safeguard cannot be bypassed | kora_indices.activation_safeguard_result_id NOT NULL | Defined in doc 12 | Risk: a code path creates a kora_indices record without first creating an activation_safeguard_results record | PASS WITH CONDITIONS — NOT NULL FK must be enforced at DB level |
| KORA Contribution separate from KORA Index | kora_contributions is a separate table — not a field in kora_indices; never in the weight vector | Defined in doc 10 Section 19, doc 12 | Risk: UI developer adds KORA Contribution to the TenComponentBreakdown component | PASS — architectural separation is correct. UI must enforce the display separation. |
| No score from fiscal/financial spend | No join path from financial_budgets, financial_movements to the IU formula | Defined as schema principle P-07 in doc 12 | Risk: a developer adds a "financial contribution factor" to the IU formula based on budget spend | PASS — the schema has no FK path from financial tables to impact_units calculation. This is a schema-level architectural guarantee. |
| Explainability attached to outputs | Explanation records linked to kora_indices; mandatory display | Not fully defined — explanation record schema needs production definition | Risk: explainability is implemented as application-layer text generation without a persistent record — not auditable | APPROVE WITH CONDITIONS — explanation record table needs definition in SQL spec |
| Provisional values not presented as certified | calibration_status = 'pre_empirical_calibration'; this must be visible and non-suppressible in all outputs and reports | Defined in doc 21b, enforced in demo layer and methodology-config.json | Risk: a report template renders KORA Index without calibration status — not caught until it reaches a client | PASS WITH CONDITIONS — report service must include calibration_status in every report output as a non-optional field |
| CO redistribution rule | When CO = INSUFFICIENT_DATA, weight redistributed proportionally across 9 remaining components | Defined in D-21 (doc 21 Section 5.2) | Risk: redistribution is hardcoded in application code rather than derived from the weight vector in gov tables | APPROVE WITH CONDITIONS — redistribution rule must be implemented as a deterministic function on the weight vector from gov, not as a hardcoded fallback |
| AGF is independent of DF and EXF | AGF is a separate mandatory factor. DF and EXF are separate optional factors. IU = NM × BC × CQ × EV × CF × AGF [× DF] [× EXF] [× SF] | Defined in D-21 (doc 21 Section 5.6) — explicit correction of the formula | Risk: developer misreads formula and implements AGF as DF × EXF | PASS — must be verified in scoring engine unit tests against Stress Test Scenario B before Phase 5 is marked complete |

---

## 11. AI Ingestion Architecture Review

| AI / Mapping Feature | Allowed in v0.1 | Blocked in v0.1 | Required Audit | Gate 2 Decision |
|---|---|---|---|---|
| Rule-based BCM taxonomy column mapping | YES — BCM keyword matching, confidence 0.0–1.0 per column, pillar suggestion | — | Mapping decision (AI suggestion / analyst override / rejection) logged per column | APPROVE |
| Confidence score per mapping suggestion | YES — 0.0–1.0 per column, with BCM match reason and flags | — | Confidence and match reason stored in UEF draft (mapping_confidence, human_review_flag) | APPROVE |
| Sensitivity flag on high-sensitivity fields | YES — wellbeing, health-related, psychological support fields flagged regardless of confidence | — | Sensitivity flag logged; category badge replaces detail in UEF Review | APPROVE |
| Human review gate before scoring | YES — mandatory (doc 19 Section 9.2, founder Decision 4 doc 08). No AI suggestion enters scoring without human approval | — | Review decision (approved / rejected / flagged) with reviewer and timestamp logged | APPROVE |
| Analyst override of AI suggestion | YES — override recorded as a training-data asset for future ML model in Foundation tier | — | Override logged with original AI suggestion and selected alternative | APPROVE |
| Batch approval for high-confidence mappings | YES — batch approval for ≥ 0.75 confidence columns | — | Batch approval action logged with reviewer, timestamp, and confidence threshold applied | APPROVE |
| External LLM API calls on HR/worker data | BLOCKED (Rule 31, CLAUDE.md; doc 19 Section 9.2) | YES — no OpenAI, Anthropic, or any external API call on company HR data | — | APPROVE — production service must enforce this at the network level, not just code convention |
| ML model training on override data | DEFERRED to Foundation tier | Blocked in Foundation Light | — | FUTURE-ONLY |
| Automated scoring without human review | BLOCKED — staging gate (Under Review) must be human-approved before processing | YES — no AI-only pipeline that bypasses human review | Every approved batch has an `approved_by` reference in ingestion_batches | APPROVE — `approved_by` NOT NULL required on ingestion_batches |
| AI-assigned discretionary scores | BLOCKED — AI proposes event type classifications only; it does not assign quality scores, verification levels, or IU values | YES — scoring is the engine's responsibility, not the mapping AI | — | APPROVE |
| BCM taxonomy versioning | YES — BCM taxonomy is versioned in gov.bcm_versions; mapping decisions carry bcm_version_id | — | BCM version used for mapping stored with UEF record | APPROVE |

---

## 12. Evidence and Advisor Validation Review

### 12.1 Evidence Architecture

**Evidence metadata vs raw evidence:**
The distinction is architecturally correct in doc 12. `evidence.evidence_records` stores metadata only — document hash, issuer, validity period, privacy sensitivity, storage pointer. Raw files are in Supabase Storage buckets. This is the right pattern: it enables integrity verification without storing binary content in the operational database, and allows the evidence metadata to be query-joined while the actual document stays in controlled blob storage.

**Partner evidence:**
Partners upload evidence through the Evidence Upload workflow (P-06). Evidence is linked to a specific advisor review record and an optional UEF record. The partner sees the upload confirmation; the advisor reviews the linked evidence. No other party has default access.

**Advisor review workflow:**
Advisor reviews (`gov.advisor_reviews`) are scoped by `advisor_id`. Advisors assign `eligibility_confidence` (0.0–1.0) with a rationale text. Completed reviews link to `gov.advisor_review_evidence`. The review record carries a status lifecycle: pending / in_review / needs_more_info / completed. This is a valid, production-ready design.

**Informational fiscal classification:**
Fiscal classification (`gov.fiscal_perimeters`, `gov.fiscal_category_thresholds`) is informational at pilot. The `eligibility_confidence` default is `kora_inferred` — no advisor documentation required at pilot. The fiscal classification map report carries a mandatory disclaimer. Tax/fiscal advisor must validate Italy perimeter definitions before any company activates a live fiscal perimeter (Gate 5). This design is correct.

**Partner validation vs marketplace ranking:**
`gov.partners` is a catalog with verification status, not a marketplace ranking system. Eligibility confidence is assigned by advisors — it is a signal of service quality, not a marketplace placement score. No pricing, no checkout, no slot inventory in the partner data model. This boundary is correctly maintained.

---

### 12.2 Required Clarifications

- Evidence records with `privacy_sensitivity = 'HIGH'` must apply the same access restriction as high-sensitivity UEF records. The schema must be explicit about which roles can access which evidence records.
- The link between evidence records and specific UEF records needs a clear FK design — evidence should be scoped to the specific event it supports, not broadly queryable.
- Collective initiative evidence (partner uploads for CI-001, CI-002) should link to the initiative record and the advisor review, not to individual worker UEF records, to prevent inadvertent individual attribution.

---

## 13. My KORA / Worker Layer Architecture Review

My KORA gives personal value to the worker, but the employer must never evaluate the worker on the basis of My KORA content. The individual worker's PIB, timeline, Dynamic CV, bookings, personal plan, and consent records must remain structurally inaccessible to employer roles.

| My KORA Feature | Production Store / Service Needed | Privacy Boundary | Employer Visibility | Gate 3 Dependency | Demo Status | Production Risk |
|---|---|---|---|---|---|---|
| PIB Light | `analytics.pib_records` — existing Analytics Store table | Worker accesses own record; grant absence for employer | No individual PIB visible to employer | Gate 3 for real worker accounts | Functional Core — pib_records.json | Low — schema defined |
| Impact Timeline | Worker's own subset of `analytics.uef_records` + `analytics.pillar_mappings` | Worker accesses own pseudonymized records via worker auth context; employer cannot query individual UEF | Employer cannot access individual timeline | Gate 3 for real worker auth | Functional Core | Low — uses existing Analytics schema |
| Opportunities | `gov.opportunities` or derived from `gov.partners` + `gov.partner_services` | Opportunities are partner catalog filtered by pillar gap — not individual worker data | Aggregate partner catalog visible to employer at company level; specific opportunity recommendations are worker-private | Gate 3 for real personalization | Semi-functional Preview | Low |
| Collective Impact Events | `gov.collective_initiatives` — needs production schema definition | Aggregate participation counts; no individual participant names to partner or employer | Company sees aggregate CI participation in KORA Contribution; individual enrollment is private | Gate 3 for real participation | Semi-functional Preview | MEDIUM — collective initiative schema not yet defined in doc 12 |
| Partner Map | `gov.partners` filtered by pillar, territory, format | Partner catalog is not personal data; worker-specific filtering is application logic | Employer sees aggregate partner engagement; specific worker-partner contacts are consent-gated | Gate 3 for real contact flow | Semi-functional Preview | Low |
| My Bookings & Requests | **UNDEFINED** — booking/request records not assigned to a production schema | Worker sees only own bookings; employer never sees booking history; partner sees scoped request context with consent | No employer access | Gate 3 for real bookings | Semi-functional Preview | HIGH — schema must be defined before SQL |
| My Personal Plan | **UNDEFINED** — personal plan items not in any doc 12 table | Worker-private — not employer-visible | No employer access | Gate 3 | Semi-functional Preview | HIGH — must be defined |
| Dynamic Impact CV | **UNDEFINED** — Dynamic CV items not in any doc 12 table | Worker-controlled; employer never auto-receives; worker controls export | No employer access; no employer notification on export | Gate 3 | Functional Core (demo seed) | HIGH — must be defined before SQL |
| Milestones | **UNDEFINED** — milestones not in any doc 12 table | Worker-visible; selectively shareable by worker | Not employer-visible by default | Gate 3 | Semi-functional Preview | HIGH — must be defined |
| My Data Control | Derived from multiple sources (consent_records, pib_records data_sources) | Worker sees full data inventory for their own data | Not employer-accessible | Gate 3 | Functional Core | MEDIUM — consent_records schema needed |
| Privacy & Sharing | UI display of privacy visibility matrix | No data exposure — display only | Not applicable | None (display only) | Functional Core | Low |
| Company KORA Snapshot | Read from `analytics.kora_indices` and `analytics.company_impact_aggregates` — aggregate views | Aggregate company view — no company-confidential detail; no individual worker data | This IS company data — shown to worker as context only; aggregate only | None (aggregate data) | Functional Core | Low |

**Critical My KORA gap:**
Five worker personal data entities are functionally necessary for My KORA but are not mapped to any production schema in doc 12: Dynamic CV items, Milestones, Personal Plan, Booking/Request records, and Consent records (for partner contact). Before SQL generation, these five entities need: (1) store assignment (likely a new worker personal data area within gov or analytics), (2) privacy boundary definition, (3) employer access restriction defined at schema level. See Section 18 for the specific decisions required.

---

## 14. Partner / Collective Initiative / KORA Contribution Review

**Partner catalog:** `gov.partners` + `gov.partner_services` are defined in doc 12. The catalog is not a marketplace — it is a validated list of service providers with eligibility confidence assigned by advisors. No pricing, no checkout, no slot inventory. The boundary is correctly maintained.

**Collective initiatives:** `collective-initiatives.json` exists as a demo seed file (29 datasets, doc 25 Section 19). A production schema for collective initiatives — cross-company, multi-period, multi-participant initiatives — is not defined in doc 12. The collective initiative is a legitimate Foundation Light feature (doc 18, doc 22A Section 4.3), not a future-vision item. This gap must be resolved before SQL.

**Worker request flow:** Participation requests from workers to collective initiatives or individual partner services are not defined in a production schema. These are the My KORA booking records discussed in Section 13. Same resolution required.

**Evidence upload for collective initiatives:** Partner uploads evidence per `gov.advisor_review_evidence`, which links to `gov.advisor_reviews`. The collective initiative review type must be one of the review categories. This is workable within the existing advisor review schema.

**KORA Contribution:** `analytics.kora_contributions` is defined in doc 12. It is a companion indicator — aggregate only, no individual participants, no KI component. The production schema is defined and correct. The gap is in the production schema for the underlying collective initiative records that feed the KORA Contribution computation. This is the same collective initiative gap.

**Confirmed non-marketplace boundaries:**
- No checkout flow in any partner or collective initiative interaction
- No pricing fields in `gov.partners` or `gov.partner_services`
- No slot inventory management in any schema
- Booking Light state machine is a request/confirm flow, not a booking engine
- KORA Contribution is a companion indicator — never a KORA Index component

---

## 15. Reporting and Explainability Review

**Report types and their requirements:**

| Report Type | Required Fields | Employer-safe? | Gate Dependency | Production Risk |
|---|---|---|---|---|
| KORA Snapshot | kora_index_value, confidence_score, calibration_status, methodology_version_id, activation_safeguard_status, period, limitations | Yes | None | Low — all fields in existing schema |
| Executive Report | All above + 10 component breakdown + explainability + top warnings + data completeness | Yes | None | MEDIUM — explainability record schema needs definition |
| HR / People Report | Activation metrics, pillar distribution, participation by dept/site (above threshold), data completeness, safeguard status, calibration_status | Yes | None | Low |
| ESG / Sustainability Report | KORA Contribution, IMPACT pillar, collective initiatives aggregate, advisor validation summary, calibration_status | Yes | None | MEDIUM — depends on collective initiative schema |
| Financial Governance Report | Budget overview, cost per IU (informational), pillar allocation, fiscal classification status (informational), calibration_status | Yes (Company Finance + above) | Gate 5 for live fiscal outputs | Low |
| KORA Contribution Report | KORA Contribution Light, initiatives, participants (aggregate), advisor status | Yes | None | MEDIUM — depends on collective initiative schema |
| Partner & Ecosystem Report | Partner catalog, validation status, aggregate engagement | Yes | None | Low |
| Advisor Validation Report | Review records, eligibility confidence, pending/completed | Advisor only | None | Low |

**Non-negotiable report rules (every report):**
1. `methodology_version_id = v0.1` — NOT NULL, displayed prominently
2. `calibration_status = pre_empirical_calibration` — NOT NULL, non-suppressible, in report header
3. Confidence Score — shown alongside any KORA Index figure; not optional
4. Reporting period (start–end dates)
5. Limitations disclaimer: _"Foundation Light v0.1 — Pilot-grade diagnostic intelligence. Not empirically validated, certified, or regulatory-grade."_

**No report may use the words: certified, validated, empirically proven, regulatory-grade, or actuarially calibrated in relation to the KORA Index.**

**Explainability record schema:**
The `gov.reports` schema does not currently include a dedicated explanation record table. The production explainability service needs a persistence target — either an `analytics.kora_index_explanations` table (preferred, linked to `analytics.kora_indices`) or explanation fields embedded in the kora_indices record. This must be defined in SQL spec.

---

## 16. Demo-to-Production Migration Review

| Demo Element | Production Replacement | Required Refactor | Risk | Gate 2 Recommendation |
|---|---|---|---|---|
| Seed files (29 JSON) | Production database tables (gov, analytics, evidence schemas) | Field naming must be validated against doc 12 column names — JSON field names may differ from SQL column names | If JSON shapes are treated as column definitions, doc 22 SQL spec is constrained by demo convenience rather than design authority | REFACTOR NAMES IF NEEDED — doc 12 governs. JSON shapes are demo convenience. |
| Mock services (15) | Production API services | Service interfaces in demo are correctly abstracted. Production replacement is a transport change (fetch real DB, not read local JSON) — not a logic rewrite if discipline held during build | If any component imports seed files directly (violating doc 26 Section 8 seed file visibility rule), that component must be refactored before production | PRESERVE IF DISCIPLINE HELD — verify no direct seed imports in employer-facing components before production build |
| Score simulation | Production scoring engine | Scoring simulation reads from pre-computed seed data. Production scoring engine executes the 14-stage pipeline. The service interface must remain the same (inputs/outputs) — the computation changes from pre-computed to live | If simulation returns inconsistent results vs production formula, developers won't detect discrepancies until integration testing | REFACTOR COMPUTATION — simulation logic is replaced; service interface is preserved |
| Role switcher | Production auth / RBAC | The demo role switcher simulates the permission boundaries. Production RBAC implements them in the database layer. Role boundaries must be identical — permission matrix validated in demo becomes the production specification | If role boundaries in demo were implemented loosely, production RBAC will need to be designed from scratch | PRESERVE PERMISSION MATRIX — demo permission matrix becomes production specification |
| Scenario switcher | Versioned score run results | The scenario switcher will not exist in production. Instead, each scoring run produces a persistent result set. Historical results are queryable by period and methodology version | No risk if scenario switcher is treated as demo instrumentation, not as a production concept | REPLACE — scenario switcher does not exist in production; replaced by versioned score run history |
| Report preview | Production report generation service | Demo assembles report data from seed files. Production assembles from real DB records. The report template structure should be preserved — only the data source changes | If calibration_status and methodology_version_id are hardcoded strings in report templates rather than read from data, production templates will fail when values change | PRESERVE TEMPLATE STRUCTURE — replace data source only |
| Worker personas | Real worker accounts | 8 synthetic personas are demo instrumentation. Production uses real authenticated workers accessing their own data through the worker auth path | No migration needed for personas — they are not persisted in any production path | REPLACE WITH REAL WORKERS at Gate 3 |
| Partner request mock | Production participation request workflow | Demo mock state machine is structurally correct. Production requires schema-backed state persistence and audit trail | Booking/request schema gap (Section 13) must be resolved before production build | BLOCKED until schema defined |
| Advisor review mock | Production advisor review service | `gov.advisor_reviews` schema is defined and production-ready. Production service replaces mock data loader | Low refactor risk — service interface is clean | PRESERVE INTERFACE |
| Dynamic CV mock | Production worker personal data service | Dynamic CV schema not defined in production. Significant design work needed. | If demo shape of Dynamic CV items is designed as final schema, production data model choices are constrained by demo convenience | DEFINE SCHEMA FIRST — demo shape informs but does not define production schema |
| Privacy suppression mock | Production grant absence + view layer | PrivacyVisibilityService reflects production controls in demo UI. Production enforcement is at DB level — not in a service | No risk if correctly understood: demo service mirrors DB controls, it does not replace them | CORRECTLY ALIGNED — verify DB controls are independent of service layer |

**What can be preserved:** service interfaces, report template structure, role permission matrix, mock service discipline patterns, methodology-config externalization, calibration status display patterns.

**What must be thrown away:** scenario switcher, worker personas, hardcoded seed data returns in services, demo state management.

**What must be refactored:** scoring computation logic (from pre-computed to live), data source in all services (from local JSON to real API), authentication (from role switcher to production RBAC).

**What must not influence production schema:** JSON seed file field naming, in-memory demo state structure, Scenario context provider architecture.

---

## 17. Architecture Risks

| # | Risk | Severity | Likelihood | Impact | Mitigation | Owner | Gate Affected |
|---|---|---|---|---|---|---|---|
| 1 | Demo mock services become de facto production architecture | CRITICAL | Medium | Mock service interfaces are treated as production API contracts without going through doc 22 SQL review. Production architecture inherits demo shortcuts. | Maintain discipline: services are contracts. Production service replaces transport layer only. Doc 22 SQL spec governs schema — JSON shapes are not the schema. | Build Lead + CTO | Gate 2 |
| 2 | JSON seed data shapes become accidental database schema | HIGH | Medium-High | Doc 22 SQL spec is produced by examining JSON seed files rather than doc 12. Column names, data types, and constraints differ from the approved logical model. | Doc 12 is the schema authority. JSON shapes are demo convenience. SQL spec author must start from doc 12, not from `/data/synthetic/`. | CTO + SQL Spec Author | Gate 2 |
| 3 | Employer access accidentally reaches individual worker analytical records | CRITICAL | Low | A code path is added that uses an employer role to query `analytics.uef_records` or `analytics.pib_records` — even with an intended WHERE filter. If grant absence is not enforced, the WHERE filter becomes the only protection. | Grant absence on four tables — no GRANT of any kind. Verified at infrastructure provisioning before any employer-facing query is built. | CTO + DevOps | Gate 2 (before SQL) |
| 4 | KORA Admin and Privacy Officer get conflated | HIGH | Medium | KORA Admin is implemented as a superuser role that has all permissions including Privacy Officer capabilities. The GDPR defense for exceptional access fails. | Two distinct roles with distinct GRANT sets. Privacy Officer access events have mandatory justification in audit trail. | CTO | Gate 2 |
| 5 | My KORA creates perception of individual scoring | HIGH | Medium | Workers or employers perceive My KORA PIB as a performance evaluation tool. "PIB score" language appears in UI. | PIB is not a performance score — architectural and UX rule. The phrase "performance score" is prohibited in My KORA. Calibration status and limitations are displayed. | UX Lead + Build Lead | Gate 2 (schema) / Gate 3 (live) |
| 6 | Dynamic CV becomes employer-visible | CRITICAL | Low-Medium | A feature request or edge case creates a path where employer can see a worker's Dynamic CV contents — even in aggregate. | Dynamic CV schema must be defined with worker-only access. No employer endpoint or query can return CV contents. No auto-share on export. | CTO | Gate 2 (schema) |
| 7 | Booking Light becomes marketplace / booking engine | HIGH | Medium | Feature creep adds pricing, checkout, slot inventory, or calendar sync to the booking flow under pressure to show "completeness" to a prospect. | Booking state machine is the scope boundary. No payment state in the state machine. State machine in service — no external booking SDK. | Build Lead | Gate 2 |
| 8 | KORA Contribution becomes confused with KORA Index | HIGH | High | Developer or UX designer adds KORA Contribution to the TenComponentBreakdown. Investors or CHROs read KORA Contribution as a KORA Index component. | KORA Contribution is displayed in a separate card (C-03), never in the 10-component breakdown (C-02). TenComponentBreakdown has exactly 10 bars — enforced in component. | UX Lead + Build Lead | Ongoing |
| 9 | AI mapping expands into unauthorized LLM processing | CRITICAL | Low | A developer adds an OpenAI or Anthropic API call to the mapping service to improve suggestion quality. No approval is obtained. GDPR data residency concern is created. | Rule 31 CLAUDE.md: no external LLM on HR/worker data. Network-level restriction on mapping service is the technical mitigation. | CTO | Ongoing |
| 10 | Fiscal classification becomes tax advice | HIGH | Medium | Fiscal classification map report is presented to a company as an authoritative tax determination. Legal liability follows. | Fiscal classification is informational and carries a mandatory disclaimer. Gate 5 active. Tax/fiscal advisor must validate before live fiscal output goes to any client. | Founder + Legal | Gate 5 |
| 11 | Evidence storage overcollects sensitive data | HIGH | Medium | Partner uploads clinical health documents as "evidence." Or evidence record stores full session notes for a psychological support event. | Evidence upload validation must reject clinical document types. Evidence metadata stores sensitivity level. `analytics.uef_records` must not have a clinical_content field. | CTO + Build Lead | Gate 3 |
| 12 | Worker accounts go live before Gate 3 | CRITICAL | Low | Pressure to show a "real worker" demo leads to creating a production worker identity before Gate 3 (legal/privacy review). | Gate 3 is explicit: no real worker accounts, no production worker identity, no real HRIS ingestion before legal/privacy counsel review is complete. Demo uses synthetic personas only. | Founder | Gate 3 |
| 13 | Methodology provisional values look certified | HIGH | High | A slide or report presents the KORA Index without the calibration_status label. A prospect interprets it as a validated score. | calibration_status = pre_empirical_calibration is NOT NULL, non-suppressible, visible on every output surface. Training required for any person who presents KORA externally. | Founder | Ongoing |
| 14 | Report outputs look regulatory-grade | HIGH | Medium | An executive report is exported and presented to a regulator or an investor as a certified compliance document. | Limitations disclaimer mandatory on every report export. Language review before any external report is shared. | Founder | Ongoing |
| 15 | Future Vision features become active too early | HIGH | Medium | A developer adds functional data binding to a Future Vision screen because "the data already exists in the seed files." | Future Vision screens are static. No data binding. CTAs are disabled. "Future Vision / Not Active" label is mandatory. | Build Lead | Ongoing |
| 16 | Architecture overengineering delays demo indefinitely | MEDIUM | Medium | CTO review produces an exhaustive list of architectural conditions that blocks demo build while the list is resolved. | Gate 2 conditions are specific and resolvable. Demo build can proceed in parallel with Gate 2 resolution on the four schema gaps. These are not demo blockers. | CTO + Founder | Gate 2 |
| 17 | Architecture underengineering causes rebuild after pilot | HIGH | Medium | The demo architecture is not production-aligned. After pilot validation, a complete rewrite is needed. | Demo services are architectural contracts. Mock services mirror production boundaries. The discipline defined in doc 26 is the mitigation. | Build Lead + CTO | Ongoing |

---

## 18. Open Questions Before SQL

### 18.1 Must Resolve Before SQL

These decisions block doc 22 SQL Schema Specification generation. Each is a schema-level gap that, if unresolved, produces a SQL spec that will require breaking changes when addressed post-hoc.

| # | Issue | Decision Needed | Source Doc Impacted | Severity | Owner | Recommended Resolution |
|---|---|---|---|---|---|---|
| OQ-01 | **Worker personal data schema** — Dynamic CV items, milestones, personal plan, booking/request records, consent records (for partner contact) are not assigned to a production store or table in doc 12. My KORA is a Foundation Light functional core feature. | Assign each entity to a store: (1) Analytics Store (as pseudonymized worker records) or (2) Governance Store (as worker-controlled config data) or (3) a new worker personal data schema within Database B. Define employer access restriction for each. | Doc 12 (Section 28), doc 24 (Section 5), doc 26 (Section 13) | CRITICAL | CTO | Create a worker personal data section in doc 12 covering: `worker_cv_items`, `worker_milestones`, `worker_personal_plan`, `worker_participation_requests`, `worker_consent_records`. Assign to Governance Store or a new `personal` schema in Database B. Employer access = zero GRANT on all. |
| OQ-02 | **Score run lineage** — the production concept of a scoring run (which approved UEF batch, which methodology version, which period, re-run handling, score run history) is not captured in a dedicated table in doc 12. Multiple kora_indices records for the same company/period without clear linkage creates audit ambiguity. | Define `gov.scoring_runs` or equivalent table linking: company_program_id, period, approved ingestion_batch_ids, methodology_version_id, triggered_by, created_at, kora_indices_id result. | Doc 12 (Section 28), doc 10 (Stage 14) | HIGH | CTO | Add `gov.scoring_runs` table to doc 12 before SQL spec. Define FK from `analytics.kora_indices.scoring_run_id`. |
| OQ-03 | **Collective initiative production schema** — `collective-initiatives.json` is a Foundation Light feature (doc 22A Section 4.3), not a future vision item. The production schema for cross-company collective initiatives, participation enrollment, and evidence linkage is not in doc 12. | Define `gov.collective_initiatives` table structure: company participants (array or join table), initiative lifecycle states, partner linkage, advisor review linkage, aggregate participation count. Define how individual worker participation records link (via booking/request records — OQ-01). | Doc 12, doc 10 Section 19, doc 22A | HIGH | CTO | Add `gov.collective_initiatives` and `gov.collective_initiative_participants` (aggregate-only) to doc 12. Individual worker enrollment links to worker participation requests from OQ-01. |
| OQ-04 | **Founder Validation Cockpit schema** — A-14 is an internal admin CRM for founder market validation. If it needs to persist post-demo, it must have a schema location that is not the analytics schema and not confused with product intelligence data. | Decision: (a) Demo-only — drop from production schema entirely, or (b) Thin admin table in `gov` schema — `gov.validation_contacts` as a simple admin CRM table outside the intelligence pipeline. | Doc 12, doc 26 (Section 20), doc 22A | MEDIUM | Founder | Recommendation: add a minimal `gov.validation_contacts` table to doc 12. This is founder tooling — not product intelligence. It has no FK dependencies on analytics tables. |
| OQ-05 | **Explainability record persistence** — the production explainability service must store explanation records persistently to support future audit requests and historical score defense. No dedicated explanation table is defined in doc 12. | Define `analytics.kora_index_explanations` table: kora_indices_id (FK), summary_text, component_explanations (JSONB), data_quality_notes, limitations, generated_at. | Doc 12, doc 10 Section 17, doc 21b | HIGH | CTO | Add `analytics.kora_index_explanations` to doc 12 with NOT NULL FK to `analytics.kora_indices`. |
| OQ-06 | **Identity-to-pseudonym mapping operational record** — `identity.pseudonymization_key_references` is defined in doc 12 as holding key metadata, but the operational mapping record (employee_id → worker_pseudonym_id) needs a clear definition: which table, which fields, what lifecycle. | Confirm the operational mapping table design: `identity.worker_identity_records` (company_id, employee_raw_id, worker_pseudonym_id, company_key_reference, created_at, deleted_at). Verify this is complete for the pseudonymization service to operate. | Doc 12 Section 7, D-01/D-02 (doc 21) | HIGH | CTO | Review `identity.worker_identity_records` definition in doc 12 Section 7. Confirm field completeness for pseudonymization service operation before SQL spec. |
| OQ-07 | **CTO index strategy confirmation (D-16)** — provisional indexes listed in D-16 (doc 21) need CTO confirmation that the set is complete and the partitioning deferral is correct for expected data volumes. | Confirm index set: `analytics.uef_records(company_id, program_id, occurred_at)`, `analytics.impact_units(uef_record_id)`, `analytics.pib_records(company_id, program_id)`, `audit.audit_trail_records(company_id, occurred_at, immutable_sequence_number)`, `gov.ingestion_batches(company_id, status)`. Confirm: are any indexes missing? | Doc 12, D-16 (doc 21) | MEDIUM | CTO | CTO signs off on index strategy as part of Gate 2 close. Any additions or changes noted in Gate 2 approval record. |
| OQ-08 | **Employer access scope for Company Finance role** — Company Finance was incorrectly defined as "no KORA Index detail" in earlier documents. Updated in doc 26 Section 10.1 to allow aggregate KORA Index summary. The production view definition for Company Finance role must be explicit about which aggregate views are accessible. | Confirm that Company Finance receives read access to: `kora_indices` (company-level aggregate view), `confidence_scores`, `activation_safeguard_results` (status only), `financial_governance_snapshots`, fiscal classification summary. And explicitly excluded from: `uef_records`, `impact_units`, `pib_records`, `worker_profiles`, `workforce_segments` individual data. | Doc 12 (access rules), doc 26 Section 10.1 | MEDIUM | CTO | Document Company Finance view scope explicitly in doc 22 SQL spec as part of the employer-facing view definitions. |

---

### 18.2 Can Resolve After Initial SQL Spec

These can wait — they do not block the core SQL spec.

- SSO provider details, SAML/OAuth integration specifics (Gate 3)
- SPID/CIE authentication implementation (Gate 3)
- Exact Supabase region for GDPR compliance (Gate 3, but region selection affects data residency)
- Advanced BCM taxonomy expansion beyond the 8–12 event types in doc 25 (post-pilot)
- KORA Link real-time event schema (future tier)
- Advanced benchmarking and certified profile (future tier)
- Production payment architecture for KIP, wallet, and partner payouts (post-Gate 3/5 + legal)
- Territorial maps and Sector Friction Index (future tier)
- Advisor certification academy schema (future tier)
- KORA Evolution advanced analytics (post-pilot)
- Materialized view strategy for high-traffic employer-facing queries (post-pilot scaling)
- Worker mobile app schema extensions (Ecosystem tier)

---

## 19. Gate 2 Decision Matrix

| Review Area | Status | Key Findings | Required Conditions | Owner | Blocks SQL? |
|---|---|---|---|---|---|
| **Overall Architecture** | PASS WITH CONDITIONS | 5-store model is coherent. Identity separation is architecturally sound. 14-stage flow is correctly modeled. Separation of impact from financial and fiscal data is architecturally clean. | Resolve OQ-01 through OQ-06 before SQL spec. | CTO | YES — OQ-01/02/03/05 are SQL blockers |
| **Store Boundaries** | PASS WITH CONDITIONS | Identity / Analytics / Governance / Evidence / Audit boundaries are well-defined. Cross-schema joins within Database B are approved (D-03). | Confirm identity store tables completeness (OQ-06). Define worker personal data schema (OQ-01). | CTO | YES — OQ-01/06 affect store assignment |
| **Data Model** | PASS WITH CONDITIONS | ~40 of ~50 target entities are well-defined in doc 12. Five worker personal data entities and two structural gaps (score run, collective initiative) require definition. | Resolve OQ-01, OQ-02, OQ-03, OQ-04, OQ-05. | CTO | YES |
| **Privacy Model** | PASS WITH CONDITIONS | Grant absence design is correct (D-04). High-sensitivity two-layer protection is correct (D-08). Aggregation suppression at view layer is correct (D-07). | Grant absence must be verified at infrastructure level before any employer-facing query. Legal counsel validation required before live data (Gate 3 dependency noted). | CTO + Legal | NO (privacy model design can be embedded in SQL spec; live data enforcement is Gate 3) |
| **Role Permissions** | PASS WITH CONDITIONS | Employer access restrictions are architecturally correct. Company Finance aggregate access has been correctly defined. Privacy Officer / KORA Admin distinction is defined. | Privacy Officer role needs explicit production role definition with narrow GRANT scope and mandatory audit logging (OQ-08 also contributes here). | CTO | YES — grant-absence scope needs Company Finance view definition |
| **Service Boundaries** | PASS WITH CONDITIONS | 15 mock services in demo map cleanly to 20 production services. Service interfaces are correctly abstracted. Two services (Booking/Request Service, Dynamic CV Service) are blocked pending schema definition. | Resolve OQ-01 (worker personal data schema). | CTO + Build Lead | PARTIAL — other services may proceed to SQL spec; booking and Dynamic CV blocked |
| **Scoring Implementation** | PASS WITH CONDITIONS | IU formula is canonical and non-negotiable. Methodology versioning is correct. Score run lineage gap is identified. Explainability record persistence is missing. | Resolve OQ-02 (score run), OQ-05 (explainability record). | CTO | YES |
| **AI Ingestion** | PASS | Rule-based BCM taxonomy classifier. No external LLM on HR/worker data. Human review gate mandatory. Analyst override logged. | None additional. Network-level restriction on LLM calls is implementation concern, not SQL concern. | Build Lead | NO |
| **Evidence Metadata** | PASS WITH CONDITIONS | Evidence metadata in DB, binary in blob storage is the correct pattern. High-sensitivity evidence access restriction must be explicit. Collective initiative evidence linkage needs resolution. | Resolve OQ-03 (collective initiative schema) — evidence links to CI records. | CTO | PARTIAL — depends on OQ-03 |
| **Auditability** | PASS | INSERT-only audit trail design is correct. kora_audit_writer Edge Function pattern is approved. Event taxonomy needs to include Privacy Officer exceptional access as a distinct event type. | Define Privacy Officer exceptional access event type in audit taxonomy before SQL. | CTO | YES (minor — event type taxonomy) |
| **My KORA Worker Layer** | FAIL — SCHEMA GAP | Five worker personal data entities are not in doc 12. This is the most significant schema gap. Cannot generate SQL for My KORA production schema without this resolution. | Resolve OQ-01. | CTO | YES |
| **Partner / Advisor Layer** | PASS WITH CONDITIONS | `gov.partners`, `gov.partner_services`, `gov.advisor_reviews` are well-defined. Collective initiative schema gap exists. | Resolve OQ-03 (collective initiative). | CTO | YES for collective initiative |
| **KORA Contribution** | PASS WITH CONDITIONS | `analytics.kora_contributions` is defined and correctly separate from KORA Index. Underlying collective initiative participation data schema is undefined. | Resolve OQ-03. | CTO | YES (dependency on OQ-03) |
| **Reporting** | PASS WITH CONDITIONS | All 8 report types have defined required fields. Explainability record persistence is missing. All mandatory metadata fields defined. | Resolve OQ-05 (explainability record). | CTO | YES (OQ-05) |
| **Demo-to-Production Migration** | PASS WITH CONDITIONS | Migration path is well-defined in doc 26 Section 9A and Section 16. Core risk is score simulation vs live computation. Worker personal data and booking schemas have no production equivalent yet. | Resolve OQ-01, OQ-02. | CTO | YES (dependency) |

---

## 20. Gate 2 Recommendation

### CONDITIONAL GO

**The KORA Foundation Light architecture is fundamentally coherent and production-aligned. The 5-store physical model, the canonical 14-stage algorithm flow, the grant-absence privacy enforcement model, the methodology versioning system, and the audit trail design are all architecturally sound and production-ready in concept.**

Gate 2 can close — and doc 22 SQL Schema Specification can begin — **conditional on resolving the following eight items in order:**

| Condition | Resolution Target | Estimated Effort | Blocks SQL? |
|---|---|---|---|
| **C-01:** Define worker personal data schema (OQ-01) — Dynamic CV, milestones, personal plan, booking/requests, consent records | Add to doc 12 before SQL spec | Medium (schema design meeting + doc 12 amendment) | YES |
| **C-02:** Define `gov.scoring_runs` or equivalent score run lineage table (OQ-02) | Add to doc 12 before SQL spec | Low (one table + FK relationships) | YES |
| **C-03:** Define `gov.collective_initiatives` production schema (OQ-03) | Add to doc 12 before SQL spec | Low-Medium (2 tables + participation model) | YES |
| **C-04:** Define `analytics.kora_index_explanations` explainability record table (OQ-05) | Add to doc 12 before SQL spec | Low (one table) | YES |
| **C-05:** Confirm identity store table completeness (OQ-06) | CTO review of doc 12 Section 7 | Low (review and sign-off) | YES |
| **C-06:** CTO sign-off on index strategy (OQ-07, D-16) | CTO review of D-16 provisional indexes | Low | YES (before SQL DDL) |
| **C-07:** Decide Founder Validation Cockpit schema placement (OQ-04) | Founder decision: demo-only or thin gov table | Low (decision) | NO (but cleaner resolved before SQL) |
| **C-08:** Define Company Finance view scope explicitly (OQ-08) | Document in doc 22 SQL spec as part of employer view definitions | Low (documentation) | Partially |

**What can proceed to SQL without resolving these conditions:**
- Identity Store tables (subject to C-05)
- Core gov tables: companies, company_programs, users, roles, data_sources, ingestion_batches, partners, partner_services, advisor_reviews, reports, report_exports, methodology version tables, financial governance tables, fiscal perimeter tables
- Analytics Store tables: worker_profiles, workforce_segments, uef_records, pillar_mappings, impact_units, pib_records, company_impact_aggregates, activation_safeguard_results, kora_indices, confidence_scores, kora_contributions, kora_ecosystem_reach, kora_evolution_snapshots
- Evidence Store: evidence_records
- Audit Store: audit_trail_records

**What must wait for the eight conditions to be resolved:**
- Worker personal data tables (C-01)
- Score run table (C-02)
- Collective initiative tables (C-03)
- Explainability record table (C-04)
- Full identity store confirmation (C-05)

---

## 21. What Gate 2 Approves

A successful Gate 2 closure authorizes the following:

- **Create `docs/22-foundation-light-sql-schema-specification.md`** — the first code-adjacent artifact in the KORA project, containing SQL DDL for all approved entities across all five stores
- **Generate SQL DDL** for Identity Store (subject to C-05), Analytics Store core tables, Governance Store, Evidence Store, and Audit Store
- **Define production API contracts** — service endpoint definitions, input/output schemas, auth context requirements
- **Define RBAC/grant-absence model** — role definitions, GRANT statements, RLS policies where applicable
- **Implement production-ready methodology seed** — `gov.methodology_versions` with D-21 provisional values
- **Implement production evidence metadata schema** — `evidence.evidence_records` with privacy sensitivity flags
- **Implement audit event taxonomy** — structured event types for `audit.audit_trail_records`
- **Start backend skeleton after SQL spec** — Supabase provisioning, schema creation, role provisioning, Edge Function scaffolding for pseudonymization service and audit writer service
- **Define production service contracts** for approved services — Ingestion, UEF Review, Scoring Engine, Activation Safeguard, Confidence, Report, Audit, Advisor Review

---

## 22. What Gate 2 Does Not Approve

Gate 2 does not authorize and must not be interpreted as authorizing any of the following:

**Live data and real worker accounts:**
- Live company data ingestion
- Production worker accounts or real worker identities
- Real HRIS, welfare provider, or LMS API integrations
- SPID/CIE authentication implementation
- Production SSO / SAML integration

**Financial and fiscal execution:**
- Payment flows, wallet, or fund orchestration
- KIP / KORA Impact Pledge execution
- Worker reward points or redemption
- Fiscal/tax classification outputs to real companies (Gate 5)
- Live Fiscal Guardrails Engine activation

**External ecosystem:**
- Real partner marketplace with checkout or pricing
- Full booking engine with slot inventory or calendar sync
- KORA Link hardware integration
- Advisor certification academy
- Production benchmarking marketplace

**Methodology claims:**
- Certified methodology claims
- Empirical validation claims
- Regulatory-grade compliance reports
- Any claim that `calibration_status = 'pre_empirical_calibration'` scores are scientifically validated

---

## 23. Required Changes Before Doc 22 SQL Specification

The following specific changes and decisions are required in doc 12 before a SQL spec author can begin work on doc 22.

| # | Issue | Decision Needed | Doc 12 Impact | Severity | Owner | Recommended Resolution |
|---|---|---|---|---|---|---|
| 1 | Worker personal data section missing in doc 12 | Define production tables for Dynamic CV items, milestones, personal plan, participation/booking requests, and partner consent records | Add Section 28A (or extend Section 28) with worker personal data schema | CRITICAL | CTO | New subsections defining each entity with store placement, fields, access rules, and employer restrictions |
| 2 | Score run lineage table missing | Define `gov.scoring_runs` table — linking ingestion batch, methodology version, period, triggering user, and output kora_indices | Add `gov.scoring_runs` to Section 8 (Core Company and Program Tables) | HIGH | CTO | One table with FKs to ingestion_batches, methodology_versions, kora_indices |
| 3 | Collective initiative production schema missing | Define `gov.collective_initiatives` and participation model | Add to Section 20 (Partner and Service Tables) | HIGH | CTO | Two tables: initiatives + participant linkage (aggregate counts, not individual worker records directly) |
| 4 | Explainability record table missing | Define `analytics.kora_index_explanations` table | Add to Section 15 (KORA Index and Component Tables) | HIGH | CTO | One table with NOT NULL FK to kora_indices and JSONB explanation fields |
| 5 | Identity store table completeness confirmation | CTO verifies `identity.worker_identity_records` and `identity.pseudonymization_key_references` field definitions are complete for pseudonymization service operation | Review Section 7 (Identity Store Tables) | HIGH | CTO | Review and sign-off — minor additions to field list if needed |
| 6 | Founder Validation Cockpit placement | Founder decides: demo-only or thin `gov.validation_contacts` table | Add to Section 8 if table decision, or add to Section 28 (Foundation Light Schema Scope) exclusion list | MEDIUM | Founder | Recommendation: thin `gov.validation_contacts` table — founder CRM that is admin-only with no FK dependencies on impact analytics |
| 7 | Index strategy confirmed | CTO confirms D-16 provisional index set | Review Section 28 (Foundation Light Schema Scope) index notes | MEDIUM | CTO | CTO sign-off at Gate 2 close; any additions noted |
| 8 | Company Finance view scope defined | Document which aggregate views are accessible to Company Finance role | Add to Section 26 (Privacy and Access Control Rules) | MEDIUM | CTO | List of views: kora_indices aggregate, confidence_scores, activation_safeguard_results (status), financial_governance_snapshots, fiscal classification summary |

---

## 24. Final CTO Judgment

### 24.1 Score Assessment

| Dimension | Score (0–10) | Commentary |
|---|---|---|
| **Architectural Maturity** | **7 / 10** | The 5-store model, grant-absence design, 14-stage canonical flow, and methodology versioning are architecturally mature for an early-stage platform. The My KORA worker personal data schema gap and the missing score run lineage table bring it down from 8+. These are solvable and should be solved before SQL. |
| **Technical Readiness** | **6 / 10** | Doc 12 is comprehensive and rigorous for ~40 of ~50 target entities. Eight open questions identified in Section 18 are honest gaps that need resolution. The documentation apparatus (docs 10, 12, 13, 21, 22A, 24, 25, 26) is unusually complete for a pre-SQL-spec project. |
| **Privacy Readiness** | **8 / 10** | The grant-absence model for employer roles is correctly designed. The two-layer protection for high-sensitivity records is correct. The physical identity separation is correct. The scoring engine privacy chain (pseudonymization at ingestion, aggregate views for employer) is architecturally sound. Deducted 2 points for Gate 3 dependencies that remain open (GDPR deletion procedure validation, key custody specialist review). |
| **Production Schema Readiness** | **5 / 10** | The core scoring pipeline schema (UEF → IU → PIB → aggregation → safeguard → KORA Index → confidence) is production-ready. The worker personal data layer (My KORA) is not. The score run lineage is not. The collective initiative schema is not. Explainability persistence is not. These are medium-effort design gaps, not architectural problems — but they must be resolved before SQL. |
| **Demo Readiness** | **9 / 10** | The demo architecture defined in docs 25, 26 is exceptionally well-specified. 29 seed files, 15 mock services, 59+ screens with precise priority and data source mapping. The demo-to-production alignment table (doc 26 Section 9A) correctly maps every mock construct to its production equivalent. The discipline of treating mock services as architectural contracts is established. Demo can begin immediately on current architecture. |
| **Overengineering Risk** | **2 / 10** | Scope is well-controlled. Doc 22A cutline is explicit. The do-not-build list in doc 26 is comprehensive. Foundation Light is genuinely constrained to what is needed for a credible demo and pilot. The risk is low — the founding documents consistently hold the line on scope. |
| **Underengineering Risk** | **4 / 10** | The four schema gaps (worker personal data, score run lineage, collective initiatives, explainability persistence) represent genuine underengineering that would require breaking changes if addressed post-SQL. Addressing them before doc 22 is the correct mitigation — and it is feasible in a focused design session. |
| **Execution Probability** | **7 / 10** | The path from here to production schema is clear: resolve the eight conditions in Section 18, update doc 12, then generate doc 22 SQL spec. Gate 3 (legal/privacy counsel) and Gate 5 (tax/fiscal advisor) must be initiated in parallel. The architecture is coherent; the remaining work is defined; the team (once a CTO is identified and engaged) has the documentation it needs to act. |

---

### 24.2 Final Statement

> **KORA Foundation Light is architecturally ready to proceed toward doc 22 SQL Schema Specification, conditional on resolving eight specific schema design gaps identified in Section 18 of this review.**
>
> The core architecture — 5-store physical model, pseudonymized analytics, grant-absence employer restriction, canonical 14-stage scoring flow, mandatory Activation Safeguard, methodology versioning, audit trail — is production-grade in design and coherent across the full document set. These foundations should not be reopened.
>
> The gaps are tractable: five worker personal data entities need production schema assignment, one score run lineage table needs definition, one collective initiative schema needs definition, one explainability record table needs definition. These are hours of focused design work, not weeks of architectural re-thinking.
>
> The demo build may proceed immediately and in parallel with Gate 2 resolution. The demo architecture is correctly aligned with the production target. Mock services are architectural contracts, not throwaway stubs. The demo team has what it needs.
>
> Gate 3 (legal/privacy counsel) and Gate 5 (tax/fiscal advisor) must be initiated in parallel with the demo build and Gate 2 close. Neither is a SQL blocker, but both have long lead times. Starting them now is a founder action, not a technical dependency.
>
> One judgment call: **KORA's architecture documentation is unusually complete for a pre-SQL-spec project.** This is a strategic advantage. The SQL spec author inherits a well-specified logical model with clear principles, canonical decisions, and a full entity inventory. The risk is that this thoroughness creates a false sense of readiness — do not generate SQL before the eight conditions in Section 23 are resolved. The conditions are listed because they matter, not to delay.
>
> **Verdict: CONDITIONAL GO. Resolve the eight schema gaps in doc 12. Then generate doc 22.**

---

## v1.0 Notes

- This document is produced by reading docs 10, 12, 13, 18, 19, 20, 21, 21b, 22A, 23, 24, 25, 26 and Appendix A.
- Appendix B (historical WhitePaper extracts) was consulted for context only and did not influence any architectural recommendation.
- This document does not generate SQL, Prisma models, migrations, or application code.
- Gate 2 closes when the eight conditions in Section 23 are formally resolved by the CTO and founder, and doc 12 is updated accordingly.
- Subsequent gate actions: Gate 3 (legal/privacy counsel) and Gate 5 (tax/fiscal advisor) should begin in parallel with demo build. Neither is a SQL blocker.

---

**Document version:** v1.0
**Date:** 2026-05-17
**Canonical inputs:** docs 10, 12, 13, 18, 19, 20, 21, 21b, 22A, 23, 24, 25, 26, Appendix A
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN — CONDITIONAL GO (8 conditions defined) · Gate 3 OPEN · Gate 4 Provisional · Gate 5 OPEN
**Next action:** CTO and founder resolve eight conditions in Section 23. Update doc 12. Generate doc 22 SQL Schema Specification after conditions are met. Demo build proceeds in parallel.
