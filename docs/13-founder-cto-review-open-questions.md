# KORA — Founder/CTO Architectural Review
## Implementation-Critical Decisions Before Technical Build

*Document:* `docs/13-founder-cto-review-open-questions.md`
*Status:* Pending Founder and CTO Review — v0.1
*Source:* Derived from doc 12, Section 30 (21 open questions)
*Depends on:* docs 01–12, Architecture v3, doc 11 economic/fiscal separation
*Does not generate:* SQL, migrations, Prisma models, Supabase tables, or backend code

---

## 1. Document Purpose

This document transforms the 21 unresolved implementation questions from `docs/12-technical-data-model-database-schema.md` (Section 30) into a formal architectural decision review process.

**Doc 12** defines the canonical logical data model — what tables exist, what fields they hold, what constraints apply, and what access rules govern each table. Doc 12 does not prescribe the implementation architecture: which infrastructure provider, how services communicate, how access controls are technically enforced, how secrets are stored, or how development and production environments are managed.

**Doc 13** resolves those implementation architecture decisions.

**No technical implementation may begin until this document has been reviewed, decisions recorded, and required specialist validations obtained.**

The process is:
1. Founder reviews and approves or defers each decision
2. CTO reviews all decisions before SQL generation begins
3. Specialist reviews (legal/privacy, tax/fiscal) obtained where required
4. Only then: SQL schema generation, Supabase architecture, migrations, Prisma models, backend services

**Doc 12 remains the data model authority. Doc 13 is the implementation architecture authority. Neither document generates code.**

---

## 2. Why These Decisions Matter

Premature or incorrect implementation decisions create structural problems that are expensive or impossible to fix after data is in production. The specific risks for KORA are:

**Privacy violations from collapsed store architecture.** If the Identity Store and Analytics Store share a database, employer roles could be granted access through misconfigured joins. Once worker identities are exposed, the harm is irreversible. Architecture must make this physically impossible, not policy-dependent.

**Broken methodology traceability.** If scoring outputs are not correctly bound to `methodology_version_id` at the database level — not just the application level — historical audit trails become unreliable. An audit challenge years after a score was produced cannot be defended without immutable version references.

**Impossible migrations at scale.** Decisions about database separation, schema topology, and cross-schema join policy are very expensive to reverse once data exists. A wrong call at v0.1 may require a full data migration at v0.5, when the company has live clients.

**Scaling problems from wrong index strategy.** `analytics.uef_records` and `audit.audit_trail_records` will grow unbounded. Without the right index and partitioning strategy from the start, query performance degrades as data volume grows.

**Incorrect access control that cannot be corrected by policy.** If employer roles are granted even read access to UEF or PIB tables — even with RLS intended to filter rows — a misconfigured policy exposes individual worker data. The correct architecture is grant absence, not row filtering, for these tables.

**Inability to maintain immutable historical scoring.** If the audit trail role can perform UPDATE or DELETE, a future bug, data breach, or internal mistake can corrupt the record. INSERT-only must be enforced at the database level.

**Regulatory exposure from unresolved GDPR cascade.** KORA holds pseudonymized but potentially reconstructable worker data across multiple stores. The GDPR deletion procedure must be defined before the first worker record is created — not after.

**Overengineering before validation.** Getting too many things right before the first pilot creates operational overhead that slows time-to-first-client. Some decisions should be deliberately deferred until the product is validated.

---

## 3. Decision Categories

The 21 questions from doc 12 Section 30 are grouped into eight decision areas.

| Category | Description | Questions |
|---|---|---|
| **A — Privacy & Identity Architecture** | How the Identity Store is separated, how pseudonymization works, GDPR cascade | D-01, D-02, D-04, D-06 |
| **B — Database & Infrastructure Architecture** | Cross-schema joins, employer-facing views, indexing, blob storage | D-03, D-05, D-16, D-17 |
| **C — Access Control & Aggregation** | Safe aggregation enforcement, high-sensitivity suppression | D-07, D-08 |
| **D — Methodology Versioning & Immutability** | Seeding, Delphi transition, numerical v0.1 values | D-09, D-11, D-21 |
| **E — Blob Storage & Evidence Architecture** | Storage provider, retention policy, access logging | D-17 |
| **F — Reporting & Export Security** | Audit INSERT-only, export security, CTO review scope, legal review scope | D-14, D-15, D-18, D-19 |
| **G — Foundation Light Operational Scope** | Fiscal field minimums at pilot, FUO reference model at pilot | D-12, D-13 |
| **H — Development & Testing Strategy** | StressTest seed data, indexes, tax/fiscal advisor review | D-10, D-16, D-20 |

---

## 4. Founder/CTO Decision Review Matrix

Each row corresponds to one of the 21 open questions from doc 12 Section 30. Complexity: **Low** (few dependencies, reversible) / **Medium** (some dependencies, partially reversible) / **High** (many dependencies, hard to reverse). Priority: **P1** = must resolve before any SQL / **P2** = must resolve before deployment / **P3** = can defer to first client onboarding.

---

### Category A — Privacy & Identity Architecture

| ID | Open Question | Why It Matters | Risk If Wrong | Recommended Direction | Complexity | Priority | External Specialist? | Founder Status | CTO Status |
|---|---|---|---|---|---|---|---|---|---|
| **D-01** | Should the Identity Store be a separate Supabase project, a separate managed PostgreSQL instance, or a separate logical database in the same cluster? | This is the most consequential privacy architecture decision. It determines whether employer roles can ever accidentally reach identity data. | If Identity Store shares infrastructure with Analytics Store, a misconfigured DB role or connection pool can expose worker identities to employer-facing queries. Physical separation is the only architectural guarantee. | **Separate Supabase project** for Foundation Light. Strongest isolation with the least operational complexity at this scale. A separate project has independent connection strings, independent roles, and cannot be joined with the main project via SQL. | High | P1 | GDPR/privacy counsel should validate the physical separation model | Open | Open |
| **D-02** | Where does the pseudonymization service run? Where are per-company keys stored? Who has access? How is access logged? | The pseudonymization service is the only authorized bridge between identifiable worker data and the Analytics Store. Its implementation determines the privacy guarantee's real strength. | If keys are accessible to application code running in the same process, a code injection or misconfigured environment variable can expose all worker identities across all companies. | **Supabase Edge Function** as the pseudonymization service entry point, with keys stored in **Supabase Vault** (or equivalent secrets manager). The Edge Function is the only code path that can call Vault. Application code never holds keys directly. Access to Vault is logged and audited. | High | P1 | Privacy/security specialist to validate key custody model | Open | Open |
| **D-04** | Is Supabase's Row Level Security sufficient to enforce employer-role prohibitions on PIB and UEF tables? | The privacy guarantee for individual PIB and UEF records must be architectural, not policy-dependent. | If RLS is used but a policy is misconfigured, a company role could silently query individual worker records. RLS policies can have bugs. Grant absence cannot. | **Do not use RLS for PIB, UEF, IU, and worker_profiles tables.** Instead: the employer-facing database role has no GRANT on these tables. No SELECT, no row-level filter — no access at all. RLS is appropriate for multi-tenant filtering on aggregate tables where employer access is legitimate (e.g., `gov.reports`, `gov.company_programs`). | Medium | P1 | Security/architecture review by CTO | Open | Open |
| **D-06** | When a GDPR deletion request is received for a worker, which records are deleted, anonymized, or pseudonymized further? What is the deletion cascade? How is compliance documented? | GDPR requires verifiable deletion on request. KORA's architecture spans two databases and a blob storage system. An incomplete cascade creates regulatory exposure. | If the deletion procedure is not defined before the first worker record is created, a deletion request may require manual intervention across systems, creating audit gaps and potential regulatory liability. | Define deletion cascade before first ingestion: (1) Identity Store: delete `worker_identity_records` row and destroy the per-company pseudonymization key for that worker. (2) Analytics Store: the corresponding `analytics.uef_records`, `analytics.pib_records`, and `analytics.impact_units` rows become permanently non-reversible (key destroyed). (3) Audit trail: add a deletion event record. (4) Evidence Store: delete or anonymize evidence linked to the worker. Define in a written GDPR procedure document. | High | P1 | GDPR legal counsel — required before first data ingest | Open | Open |

---

### Category B — Database & Infrastructure Architecture

| ID | Open Question | Why It Matters | Risk If Wrong | Recommended Direction | Complexity | Priority | External Specialist? | Founder Status | CTO Status |
|---|---|---|---|---|---|---|---|---|---|
| **D-03** | Are cross-schema joins (gov → analytics) permitted at the database level, or must they be mediated by application-layer service calls? | Determines whether the scoring pipeline runs as SQL joins or as service-to-service API calls. Both are valid. The choice affects performance, complexity, and future schema evolution flexibility. | If cross-schema joins are permitted but poorly governed, a future schema change in `analytics` can break a `gov`-side query with no compile-time warning. | **Permit cross-schema joins within Database B** (gov, analytics, evidence, audit schemas) for the KORA internal scoring pipeline only. **Never** permit Database A (identity) to be joined with Database B through any SQL path. Application-layer separation is the rule for the identity boundary; schema-level joins are acceptable within Database B. | Medium | P1 | CTO architecture review | Open | Open |
| **D-05** | How are aggregate employer-visible views implemented — PostgreSQL views, materialized views, or application-layer query results? How is the safe aggregation threshold enforced? | Employer-facing outputs are the surface KORA is selling. Their performance, correctness, and privacy safety directly affect the product. | A live view on `analytics.company_impact_aggregates` without a safe-aggregation filter could return data for a below-threshold segment if a new segment is added without the filter. Materialized views may serve stale data if not refreshed on scoring cycle completion. | **PostgreSQL views** (not materialized) for employer-facing reads at Foundation Light scale. Views include a mandatory `WHERE is_active = TRUE` filter for segments. Views are the only query path for employer roles on analytics tables — no direct table access. Refresh strategy is not needed at Foundation Light volume. Revisit materialized views when query latency becomes a concern. | Medium | P2 | CTO architecture review | Open | Open |
| **D-16** | Which tables require indexes at launch? Does `analytics.pib_records` require partitioning for large workforces? | Missing indexes on high-volume tables cause slow queries at scale. Wrong partitioning strategy is expensive to change in production. | Without indexes on `analytics.uef_records(company_id, program_id, occurred_at)`, scoring pipeline queries will full-scan as data grows. Without a sequence index on `audit.audit_trail_records`, audit queries degrade. | **Required indexes at v0.1:** `analytics.uef_records(company_id, program_id, occurred_at)`, `analytics.impact_units(uef_record_id)`, `analytics.pib_records(company_id, program_id)`, `audit.audit_trail_records(company_id, occurred_at, immutable_sequence_number)`, `gov.ingestion_batches(company_id, status)`. **Partitioning:** defer for Foundation Light. Add when a single company's UEF record count exceeds 1M rows. | Medium | P2 | CTO architecture review | Open | Open |
| **D-17** | What blob storage provider is used for evidence files and report exports? What retention policy applies? How are access logs retained? | Evidence integrity and long-term retention are audit requirements. The wrong provider choice creates migration complexity when it needs to change. | Using a provider without native access logging creates an audit gap. Using a provider without retention policies creates a GDPR exposure for long-lived sensitive documents. | **Supabase Storage** for Foundation Light (integrated with Supabase auth, bucket-level access control, minimal operational overhead). Define retention policies per bucket: evidence files = 7 years (aligned with Italian fiscal record retention), report exports = 3 years, raw datasets = 1 year post-processing. All blob access events logged in `audit.audit_trail_records`. | Low | P2 | Legal counsel to validate retention periods | Open | Open |

---

### Category C — Access Control & Aggregation

| ID | Open Question | Why It Matters | Risk If Wrong | Recommended Direction | Complexity | Priority | External Specialist? | Founder Status | CTO Status |
|---|---|---|---|---|---|---|---|---|---|
| **D-07** | How is `workforce_segments.is_active = FALSE` enforced at the query level? What happens when a segment drops below threshold mid-period? | Safe aggregation is a privacy and legal requirement. Enforcement must be consistent across all query paths. | If suppression is applied only in application middleware and not in the database view, a direct database query by a privileged user could return below-threshold segments. Mid-period drops below threshold create a re-identification risk if the segment was visible in prior queries. | Enforce suppression at the view layer (PostgreSQL view includes `WHERE is_active = TRUE`), not at the application layer only. When a segment drops below threshold mid-period: (1) set `is_active = FALSE` immediately, (2) do not generate a new aggregate for that segment until it recovers, (3) if a segment was visible in a prior report, the prior report is not retroactively modified — the historical report remains as produced. Document this behavior in the employer-facing data notice. | Medium | P1 | GDPR legal counsel to validate mid-period suppression approach | Open | Open |
| **D-08** | How are UEF records with `privacy_sensitivity = 'high'` handled? Separate partition, separate access path, or application filtering? | Health data and psychological support event records carry the highest legal exposure. Their protection must be architectural. | Application-level filtering can be bypassed by a bug or a query error. If high-sensitivity records appear in an employer-visible context — even fleetingly — the exposure is irreversible. | **Separate access path:** high-sensitivity UEF records (`privacy_sensitivity = 'high'`) are readable only by `KORA_PRIVACY_ADMIN` role. No employer role, no `KORA_ANALYST` role, no partner role has SELECT on these rows. Implement via RLS policy on `analytics.uef_records` restricting `privacy_sensitivity = 'high'` rows to `KORA_PRIVACY_ADMIN` only — in addition to the general employer-role grant absence. The scoring pipeline aggregates these records normally; individual records are never surfaced. | Medium | P1 | GDPR/privacy counsel to validate the RLS approach for sensitive health data | Open | Open |

---

### Category D — Methodology Versioning & Immutability

| ID | Open Question | Why It Matters | Risk If Wrong | Recommended Direction | Complexity | Priority | External Specialist? | Founder Status | CTO Status |
|---|---|---|---|---|---|---|---|---|---|
| **D-09** | How are pre-calibration Foundation Light v0.1 values seeded into methodology tables? Migration seed script, bootstrap fixture, or controlled admin operation? | The methodology seed is the calibration baseline that all Foundation Light scoring depends on. How it is seeded determines whether it is auditable, repeatable, and environment-safe. | A raw SQL migration seed in production creates an immutable but silent record. A bootstrap fixture that runs in all environments risks polluting production with test data. An uncontrolled admin operation has no audit trail. | **Controlled admin seed operation** executed by KORA Admin role with a dedicated seed script that: (1) creates the `gov.methodology_versions` record with `is_current = TRUE`, (2) populates `gov.bcm_entries`, `gov.nm_rules`, `gov.correction_factor_rule_versions`, `gov.kora_index_weight_versions`, (3) generates an `audit.audit_trail_records` entry for the seeding event. The seed script is version-controlled and reviewed before execution. It is not a raw migration — it runs through the application layer to ensure audit trail coverage. | Medium | P1 | No external specialist required; CTO review of seed script before execution | Open | Open |
| **D-11** | When the Delphi Study produces calibrated weights and BCM values, what is the schema migration path? How are historical pre-calibration records distinguished from post-calibration records? | The Delphi calibration transition is a planned future event that the schema must support without a breaking migration. | If historical `kora_indices` records carry `calibration_status = 'pre_empirical_calibration'` but the field is not indexed or surfaced in dashboards, the transition will silently change how historical scores appear to users — creating confusion about whether past performance has changed. | The schema is already designed for this: `calibration_status` exists on all methodology tables and scoring components. The Delphi transition creates a new `gov.methodology_versions` record with updated BCM and weight values. All historical records retain their `methodology_version_id` reference to the pre-calibration version. Dashboard and report generation must always display `calibration_status` alongside any score. No migration of historical records is required — the version FK preserves the distinction. Validate this behavior in development before the Delphi Study completes. | Medium | P3 | Methodology team to define the exact Delphi transition procedure | Open | Open |
| **D-21** | What specific numerical values seed the BCM, NM normalization functions, AGF thresholds, Activation Safeguard values, and 10-component KORA Index weight vector for Foundation Light v0.1? | No scoring engine can be built without these values. They are required to write the methodology seed (D-09) and to validate the scoring engine against the Stress Test (D-10). | Starting with arbitrary placeholder values risks building a scoring engine that passes integration tests against unrealistic inputs, then fails when real-world data produces boundary cases the placeholders didn't cover. | **Founder and methodology team must define these values before the scoring engine is coded.** The Stress Test (Appendix A) provides scenario-level numerical targets that the v0.1 values must satisfy. The starting 10-component weight vector must sum to 1.00. A reasonable starting vector (subject to Delphi calibration) could use equal weights (0.10 each) as a neutral baseline, or the pre-calibration 7-component vector from doc 06 mapped to the 10-component structure. **This decision cannot be made by the engineering team alone.** | High | P1 | Methodology founder decision required; no external specialist | Open | Open |

---

### Category E — Blob Storage & Evidence Architecture

| ID | Open Question | Why It Matters | Risk If Wrong | Recommended Direction | Complexity | Priority | External Specialist? | Founder Status | CTO Status |
|---|---|---|---|---|---|---|---|---|---|
| *(See D-17 in Category B)* | Blob storage provider, retention policy, and access log retention are addressed in D-17. | — | — | — | — | — | — | — | — |

*Category E has one question, addressed as D-17 in Category B (Blob Storage). No additional questions in this category.*

---

### Category F — Reporting & Export Security

| ID | Open Question | Why It Matters | Risk If Wrong | Recommended Direction | Complexity | Priority | External Specialist? | Founder Status | CTO Status |
|---|---|---|---|---|---|---|---|---|---|
| **D-14** | How is the INSERT-only database role for `audit.audit_trail_records` provisioned in Supabase? What is the role name, permission set, and how is it isolated? | Audit trail immutability is a security and compliance guarantee. It must be enforced at the database level, not the application level. | If the application's main role has UPDATE or DELETE on the audit schema, a bug or a deliberate internal actor can corrupt or erase audit records. In a regulatory context, missing or altered audit records are a serious compliance failure. | Create a dedicated Supabase database role (e.g., `kora_audit_writer`) with GRANT INSERT ON `audit.audit_trail_records` only — no SELECT, no UPDATE, no DELETE. The application's main connection pool uses the standard role for all other operations and calls a separate internal endpoint for audit writes that uses the `kora_audit_writer` role. This role is never exposed externally. | Low | P1 | CTO implementation review | Open | Open |
| **D-15** | How are export download links generated and time-limited? How is `download_count` updated without a race condition? | Report exports may contain compliance-sensitive company data. Unlimited or unexpiring download links create data governance risk. A race condition on `download_count` produces inaccurate audit records. | If download links do not expire, a link shared by accident (forwarded email, Slack message) provides indefinite access to sensitive reports. If `download_count` updates race, the audit log understates actual access frequency. | **Pre-signed blob storage URLs** with embedded expiry (e.g., 1-hour or 24-hour TTL depending on export type). The download event triggers a server-side callback that updates `download_count` and `last_downloaded_at` via a dedicated internal endpoint — not a client-side PATCH. The callback uses an optimistic lock (UPDATE with WHERE clause) to handle concurrent downloads without a race. Every download generates an `audit.audit_trail_records` entry server-side. | Medium | P2 | CTO implementation review | Open | Open |
| **D-18** | What must the CTO review before the first SQL generation? | The CTO review is the quality gate between architectural intent and implementation. It must be comprehensive enough to catch problems that would require disruptive migrations to fix. | A CTO review that focuses only on the data model and misses the access control architecture, the pseudonymization service design, or the audit role provisioning will produce an implementation that is technically conformant but architecturally broken at the most critical boundaries. | CTO review scope (minimum): (1) 5-store physical architecture and separation guarantees, (2) pseudonymization service design and key custody, (3) RLS vs. grant-absence strategy per table, (4) audit INSERT-only role provisioning, (5) cross-schema join policy within Database B, (6) blob storage integration and access logging, (7) safe aggregation view filter implementation, (8) GDPR deletion cascade procedure, (9) employer-facing view definitions, (10) index strategy for high-volume tables. | Low | P1 | This is the CTO review itself — no external specialist | Open | Open |
| **D-19** | What is the full scope of legal/privacy counsel review before any live data is ingested? | KORA processes pseudonymized worker data and holds identifiable worker data in the Identity Store. Several architectural decisions require legal validation before the first data processing event. | Proceeding without legal counsel validation of the pseudonymization architecture, DPA framework, and GDPR deletion procedure creates regulatory exposure that may require architectural changes after clients are onboarded. | Legal/privacy counsel must review: (1) pseudonymization architecture adequacy under GDPR Recital 26, (2) DPA template for companies, (3) data retention periods for each evidence category, (4) GDPR deletion cascade procedure (D-06), (5) safe aggregation threshold legal sufficiency for anonymization, (6) SVAM Variant A legal characterization, (7) worker consent model for PIB scoring and data retention, (8) cross-border data transfer implications. **No live ingestion before this review is complete.** | Low | P1 | GDPR/privacy legal counsel — required | Open | Open |

---

### Category G — Foundation Light Operational Scope

| ID | Open Question | Why It Matters | Risk If Wrong | Recommended Direction | Complexity | Priority | External Specialist? | Founder Status | CTO Status |
|---|---|---|---|---|---|---|---|---|---|
| **D-12** | Which fiscal and eligibility fields are required for the Foundation Light initial pilot? Can the fiscal classification map report be produced with Italy-only perimeters and `kora_inferred` as the default confidence level? | Fiscal classification is a doc 11 feature that requires careful scoping. Over-building it at Foundation Light creates complexity without adding sellability. Under-building it means the fiscal classification map report is not deliverable. | If the fiscal classification map report requires partner-level eligibility documentation that does not exist at pilot, the report cannot be produced. If Italy perimeters are not seeded, the fiscal map is empty and useless. | **Minimum viable fiscal scope at pilot:** (1) Italy perimeters seeded in `gov.fiscal_perimeters` for the nine canonical categories, (2) `eligibility_confidence = 'kora_inferred'` is the default for all services — no partner documentation required at pilot, (3) the fiscal classification map report shows the distribution of services by fiscal category and confidence level, with a clear disclaimer that `kora_inferred` classifications require advisor review before tax-advantaged activation, (4) `gov.fuo_accounts` is not required at pilot — perimeter activation proceeds without FUO linkage for SVAM Variant A. | Low | P2 | Tax/fiscal advisor to validate Italy perimeter definitions before client use | Open | Open |
| **D-13** | For initial pilots, will `gov.fuo_accounts` be populated at all? What is the minimum viable data state for a company to use Foundation Light under SVAM Variant A? | Defines the pilot onboarding requirements. Too many required fields = slower onboarding. Missing required fields = incomplete financial governance view. | If `gov.fuo_accounts` is required to activate a fiscal perimeter, pilot onboarding becomes dependent on the company disclosing FUO account details — a sensitive ask that may slow or block pilots. | **FUO account is optional at pilot.** A company can activate a fiscal perimeter without populating `gov.fuo_accounts`. The field exists for future use. Minimum viable data state for Foundation Light pilot: (1) `gov.companies` record with signed DPA, (2) at least one `gov.company_programs` record, (3) ingested data (at least one approved `gov.ingestion_batches`), (4) Italy perimeters available for selection (KORA-seeded), (5) FUO account = not required. | Low | P2 | No external specialist required | Open | Open |

---

### Category H — Development & Testing Strategy

| ID | Open Question | Why It Matters | Risk If Wrong | Recommended Direction | Complexity | Priority | External Specialist? | Founder Status | CTO Status |
|---|---|---|---|---|---|---|---|---|---|
| **D-10** | Should the Stress Test (Appendix A) numerical scenarios be included as development-only seed data? How is dev seed data isolated from production? | The Stress Test provides the only validated numerical scenarios for the scoring engine. Using it as a dev fixture verifies that the scoring engine produces the expected outputs before any real data is processed. | If Stress Test seed data reaches production, synthetic scores appear in company dashboards. If the scoring engine is never validated against the Stress Test scenarios, it may produce results that are logically consistent but numerically wrong at boundary conditions. | **Yes — include Stress Test scenarios as development-only fixtures.** Environment isolation: (1) dev Supabase project receives the Stress Test seed, (2) staging project receives anonymized real-structure data only, (3) production receives no synthetic data. The scoring engine must produce Stress Test Scenario B outputs within defined tolerance before the first production ingestion is approved. Define the tolerance band and who approves the scoring validation. | Medium | P2 | No external specialist; methodology team to validate expected outputs | Open | Open |
| *(See D-16 in Category B)* | Index and partitioning strategy is addressed as D-16. | — | — | — | — | — | — | — | — |
| **D-20** | What is the full scope of tax/fiscal advisor review before any fiscal feature goes live? | Italy-seeded fiscal perimeters, fiscal category thresholds, and welfare statement design all require tax/fiscal validation before use in a live client context. | Presenting `kora_inferred` eligibility classifications without a tax advisor review disclaimer, or seeding incorrect fiscal thresholds, creates material compliance risk for the company using KORA. | Tax/fiscal advisor must review: (1) Italy fiscal perimeter definitions in `gov.fiscal_perimeters` (accuracy of Art. 51 TUIR framing and other categories), (2) annual caps and thresholds in `gov.fiscal_category_thresholds` (aligned with current Budget Law), (3) welfare statement characterization as informational-only (not a regulatory filing), (4) conditions for SVAM Variant A vs. B escalation, (5) Fiscal Guardrails Engine design before activation. This review is per doc 11 Section 17. **Required before any company activates a fiscal perimeter in a live context.** | Low | P2 | Tax/labor law advisor — required per doc 11 | Open | Open |

---

## 5. Recommended Initial Technical Direction (Non-Binding)

These recommendations are starting points for CTO review. They are not final decisions. The CTO may accept, modify, or reject any recommendation based on technical judgment, budget, and operational priorities.

---

### 5.1 Identity Store Architecture

**The question:** Separate Supabase project / separate managed PostgreSQL / separate logical database in same cluster?

**Recommendation: Separate Supabase project** for the Identity Store at Foundation Light.

**Reasoning:**
- A separate Supabase project has a distinct database URL, distinct connection credentials, and cannot be reached from the main project via SQL. The isolation is physical, not policy-dependent.
- Within a single Supabase project, even with schema separation, a sufficiently privileged role can potentially read across schemas. This creates a risk surface that requires ongoing policy vigilance.
- Operational overhead of two Supabase projects is low at Foundation Light scale. The Identity Store has very few tables and low write volume.
- Cross-project communication is explicit: the pseudonymization service calls the Identity Store project via its API endpoint. No SQL join is possible. The boundary is architectural.

**Tradeoffs:**
- Higher infrastructure cost (two Supabase projects).
- Operational complexity: two projects to monitor, back up, and update.
- Cross-project joins require explicit API calls — adds latency to the ingestion pipeline (pseudonymization step).

**Alternative if budget is constrained:** Separate managed PostgreSQL instance on the same cloud provider as the main Supabase project, with network-level isolation (private VPC, no public endpoint). This provides strong isolation with potentially lower cost but more operational overhead than two Supabase projects.

**Do not use:** A separate schema within the same Supabase project. Schema-level isolation is insufficient for the privacy guarantee KORA is selling.

---

### 5.2 Pseudonymization Service

**The question:** Where does the pseudonymization service run? Where are keys stored?

**Recommendation: Supabase Edge Function** as the pseudonymization service entry point, with **Supabase Vault** (or equivalent managed secrets service) for key storage.

**Reasoning:**
- The pseudonymization service is called during ingestion (translating raw worker identifiers to pseudonyms before UEF records are written). It runs server-side — never client-side.
- A Supabase Edge Function running close to the database reduces latency. It can access Vault secrets without exposing them to the application server.
- Vault stores per-company keys as named secrets. The Edge Function retrieves the key for the relevant company, performs the pseudonymization, and discards the key from memory after the operation.
- Application code (the ingestion pipeline) calls the Edge Function via an authenticated internal endpoint. It never receives or stores the key itself.

**Key custody rule (from doc 12 P-02):** Keys are held by KORA's internal privacy service — not by the company, not by the application server, not in environment variables of the main application process.

**Access logging:** Every Vault access is logged. Every pseudonymization call generates an `audit.audit_trail_records` entry with `event_type = 'pseudonymization_operation'`.

**Tradeoffs:**
- Edge Function cold starts can add 200–500ms to the first ingestion call after idle. Acceptable at Foundation Light volume.
- Vault has per-operation costs at higher volume. Not relevant at Foundation Light scale.

---

### 5.3 Row Level Security Strategy

**The question:** How is RLS used, and for which tables?

**Core principle from doc 12:** The privacy guarantee for PIB, UEF, IU, and worker_profiles is enforced via **grant absence** — employer roles have no GRANT on these tables. RLS is not the mechanism for these tables.

**Recommended RLS strategy:**

*Tables where RLS applies (multi-tenant, employer access is legitimate):*
- `gov.companies` — company roles see own row only (RLS on `id = auth.jwt()->'company_id'`)
- `gov.company_programs` — company roles see own programs only
- `gov.reports` — company roles see own reports only
- `gov.financial_governance_snapshots` — company roles see own snapshots only
- `gov.ingestion_batches` — company roles see own batches only
- PostgreSQL views over `analytics.company_impact_aggregates` — `WHERE company_id = auth.jwt()->'company_id'`

*Tables where grant absence applies (no employer access at all):*
- `analytics.uef_records` — no GRANT for any employer role
- `analytics.pib_records` — no GRANT for any employer role
- `analytics.impact_units` — no GRANT for any employer role
- `analytics.worker_profiles` — no GRANT for any employer role
- `identity.*` — no GRANT for any employer role (separate project)

*High-sensitivity records within employer-accessible tables:*
- `analytics.uef_records` where `privacy_sensitivity = 'high'` — RLS policy restricts to `KORA_PRIVACY_ADMIN` role only (in addition to general grant absence for employer roles)

**Safe aggregation filter:** Applied at the view layer. Employer-facing views always include `WHERE is_active = TRUE` on `workforce_segments`. Not implemented as RLS — implemented as a view definition that cannot be bypassed without creating a new view.

---

### 5.4 Storage Architecture

**The question:** Supabase Storage, S3-compatible external, or hybrid?

**Recommendation: Supabase Storage** for Foundation Light.

**Reasoning:**
- Integrated with Supabase auth and RLS — bucket-level access control via Supabase policies.
- No additional infrastructure to provision or monitor.
- Pre-signed URLs with expiry are natively supported.
- At Foundation Light scale (pilot companies, limited evidence volume), Supabase Storage is fully adequate.

**Bucket structure (recommended):**
- `evidence-files` — worker and company evidence documents (private, KORA_ADMIN only for direct access)
- `report-exports` — generated report exports (private, time-limited pre-signed URLs for company access)
- `raw-datasets` — ingested raw datasets (private, KORA_ADMIN and KORA_ANALYST only)

**Retention enforcement:** Supabase Storage does not natively enforce object retention policies. Retention is enforced via a scheduled cleanup function that deletes objects past their retention period based on metadata in `evidence.evidence_records.retention_policy`.

**Migration path:** When storage volume or compliance requirements exceed Supabase Storage's capabilities, migration to S3-compatible storage (AWS S3, Cloudflare R2) is straightforward — update `blob_storage_provider` in `evidence.evidence_records` and redirect the pre-signed URL generation logic. The schema is provider-agnostic.

---

### 5.5 Audit Architecture

**The question:** How is append-only enforced, and what is the future path to cryptographic immutability?

**Foundation Light v0.1 implementation:**
- Separate database role (`kora_audit_writer`) with INSERT-only permission on `audit.audit_trail_records`.
- Application code does not use this role directly for other operations — it is a dedicated write-only role for the audit pathway.
- `immutable_sequence_number` is a database-generated sequence. Gaps in the sequence (visible via a monitoring query) indicate a deletion attempt or system failure. A daily monitoring job checks for sequence gaps and alerts if any are found.
- No UPDATE, no DELETE — enforced at the database grant level.

**Future upgrade path (Governance tier):**
- Each audit record's hash is included in the next record's `previous_hash` field (chain-linking). A single altered record breaks the chain verification for all subsequent records.
- Chain verification can be run on-demand by an auditor role.
- This is a non-breaking schema addition — it can be added to `audit.audit_trail_records` as a nullable column that is populated from activation forward.

---

### 5.6 Methodology Immutability

**The question:** How are historical scores frozen and how is the version reference maintained?

**Implementation principle:** Historical scores are never recalculated. The `methodology_version_id` on every scoring output is the immutable anchor. Once a KORA Index is published (`publication_status = 'published'`), its `kora_index_value` and all component records are read-only in practice (no UPDATE ever issued by the application).

**Enforcement strategy:**
- Application-level: the scoring engine only INSERTs new scoring records. It never UPDATEs existing ones.
- Database-level (future enhancement): a trigger on `analytics.kora_indices` that raises an exception if `publication_status = 'published'` and an UPDATE is attempted on `kora_index_value`.
- Audit: every scoring run generates an audit record identifying the methodology version, input batch, and output values.

**Recalculation scenario:** If a bug is found in a scoring run, the correction procedure is: (1) mark the original KORA Index as `publication_status = 'superseded'`, (2) correct the underlying issue in the methodology or data, (3) re-run the scoring pipeline to produce a new KORA Index record with a new `id` and the same `methodology_version_id` (or a new version if the methodology itself changed). The original record is retained in the database with `superseded` status. The audit trail records the supersession event and its reason.

---

### 5.7 Foundation Light Operational Simplicity

**The question:** Why should Foundation Light remain operationally constrained in v0.1?

Foundation Light's commercial value is the insight it delivers from existing data, not the complexity of its infrastructure. The first pilot companies will evaluate KORA on:
- The quality of the KORA Index and its explanation
- The financial governance summary clarity
- The fiscal classification map usefulness
- The report's professional quality and methodology transparency

They will not evaluate KORA on:
- Whether the system can process real-time events
- Whether partner integrations are live
- Whether fiscal guardrails are enforced in real time
- Whether FUO accounts are managed through the platform

**What this means for v0.1 architecture:**
- The ingestion pipeline is batch-oriented. No real-time event streaming.
- The scoring pipeline runs on demand after ingestion batch approval. No automated triggers.
- Report generation is triggered by a KORA Analyst. No automated publishing.
- No live payment flows. No partner API integrations. No worker-facing features.
- Infrastructure is sized for tens of pilot companies, not thousands.

**Operational simplicity is a feature.** A system that is easy to operate, understand, and debug is more valuable at Foundation Light than a system that is technically impressive but operationally fragile. Build for correctness and explainability first. Build for scale when clients require it.

---

## 6. Explicit Non-Decisions

The following are intentionally NOT being decided in this document. Deferring these decisions reduces premature complexity and keeps the implementation focused on Foundation Light v0.1.

| Topic | Why Deferred |
|---|---|
| Final cloud provider | AWS, GCP, or Supabase Cloud — not relevant until scale or compliance requires a specific provider |
| Multi-region deployment | Not required for Italy-only Foundation Light pilots |
| Production-scale infrastructure sizing | Cannot be determined until pilot usage patterns are observed |
| Live payment execution | Requires PSD2, legal, and tax validation per doc 11 Section 17; not a Foundation Light feature |
| Worker app architecture | Ecosystem tier — not in 90-day scope |
| Partner portal architecture | Future feature — not in 90-day scope |
| AI automation scope beyond classification | Current AI role: suggest pillar classification. Expansion scope is not determined. |
| PSP integrations | Requires regulatory authorization; not a Foundation Light feature |
| Payroll integrations | Future — requires legal and tax review per doc 11 |
| Advanced benchmarking engine | Future — requires industry-wide data not available at Foundation Light |
| Multi-language support | Italy-first. Additional languages deferred. |
| Advanced caching strategy | Not required at Foundation Light volume |
| KORA Certified tier technical design | Future — after Governance tier is validated |
| Territorial intelligence architecture | Future Ecosystem tier |
| Real-time event streaming | Not required for batch-oriented Foundation Light ingestion model |

**The principle:** every decision deferred here is one fewer constraint on the initial implementation. Decisions are made when the information needed to make them well is available — not before.

---

## 7. Founder Review Checklist

| Topic | Reviewed? | Approved? | Deferred? | Requires Specialist? | Notes |
|---|---|---|---|---|---|
| D-01: Identity Store physical separation | — | — | — | GDPR counsel | |
| D-02: Pseudonymization service & key custody | — | — | — | Privacy/security specialist | |
| D-03: Cross-schema join policy | — | — | — | No | |
| D-04: RLS vs. grant-absence for PIB/UEF | — | — | — | No | |
| D-05: Employer-facing views implementation | — | — | — | No | |
| D-06: GDPR deletion cascade procedure | — | — | — | GDPR legal counsel | |
| D-07: Safe aggregation enforcement | — | — | — | GDPR counsel (mid-period rule) | |
| D-08: High-sensitivity event suppression | — | — | — | GDPR/privacy counsel | |
| D-09: Methodology version seeding procedure | — | — | — | No | |
| D-10: Stress Test dev-only fixtures | — | — | — | No | |
| D-11: Delphi Study transition plan | — | — | — | Methodology team | |
| D-12: Fiscal field minimum scope at pilot | — | — | — | Tax/fiscal advisor | |
| D-13: FUO reference model at pilot | — | — | — | No | |
| D-14: Audit INSERT-only role provisioning | — | — | — | No | |
| D-15: Report export security & race condition | — | — | — | No | |
| D-16: Index and partitioning strategy | — | — | — | No | |
| D-17: Blob storage provider & retention | — | — | — | Legal (retention periods) | |
| D-18: CTO review scope confirmation | — | — | — | This is the CTO review | |
| D-19: Legal/privacy counsel review scope | — | — | — | GDPR legal counsel | |
| D-20: Tax/fiscal advisor review scope | — | — | — | Tax/fiscal advisor | |
| D-21: Methodology numerical v0.1 values | — | — | — | Methodology founder decision | |
| **Recommended technical directions (Section 5)** | — | — | — | No | |
| **Non-decisions list (Section 6)** | — | — | — | No | |

---

## 8. CTO Review Preparation

A future CTO joining the project should review the following materials before the first SQL generation session. These are the minimum materials required to make implementation decisions that are consistent with KORA's architectural and methodological commitments.

**Foundational architecture:**
- `docs/10-architecture-v3-layer-specification.md` — canonical 14-stage algorithm flow, IU formula, 10-component KORA Index, Activation Safeguard. This is the most important technical document.
- `docs/07-conceptual-data-model-core-entities.md` — entity definitions and relationships
- `docs/12-technical-data-model-database-schema.md` — the full logical schema (all 31 sections)

**Methodology:**
- `docs/06-methodological-constitution.md` — scoring principles and formula definitions
- `docs/appendices/A-stress-test-algoritmico-summary.md` — the only numerically validated scoring scenarios; use for engine validation

**Privacy:**
- `docs/12-technical-data-model-database-schema.md`, Sections 3 and 26 — store architecture and role access matrix
- The pseudonymization service design (Decision D-02)
- The GDPR deletion cascade procedure (Decision D-06)

**Economic/fiscal:**
- `docs/11-economic-fiscal-architecture-integration.md` — complete economic/fiscal architecture including the FUO absolute constraint, SVAM variants, nine fiscal categories, and professional review requirements

**Eligibility:**
- `docs/04-fiscal-policy-eligibility-layer.md` and `docs/05-eligibility-confidence.md` — eligibility is a parallel dimension to impact; must never influence KORA Index scoring

**Scope constraints:**
- `docs/12-technical-data-model-database-schema.md`, Section 28 — what is active vs. structural/future
- `docs/12-technical-data-model-database-schema.md`, Section 29 — 20 implementation warnings

**This document:**
- All 21 decisions and their recommended directions
- Explicit non-decisions list (Section 6)
- Founder review checklist status at time of CTO onboarding

**Key things a CTO must accept before starting:**
1. Identity Store must be physically separate from the main database.
2. Employer roles have zero access to PIB, UEF, IU, and worker_profiles — enforced by grant absence, not RLS.
3. Every scoring output must carry `methodology_version_id` NOT NULL — this is a database-level constraint, not an application-level rule.
4. `audit.audit_trail_records` is INSERT-only at the database level — enforced by a dedicated database role with no UPDATE or DELETE permission.
5. The Activation Safeguard is mandatory — `kora_indices.activation_safeguard_result_id` is NOT NULL. There is no bypass.
6. Financial data, fiscal eligibility, and partner catalog counts do not enter the KORA Index formula. Period.

---

## 9. Next Step After Doc 13

Implementation may proceed **only after** the following gate conditions are met, in order:

**Gate 1 — Founder Review of Doc 13**
Founder reviews each of the 21 decisions, records their position (Approved / Deferred / Needs Specialist), and approves the recommended technical directions in Section 5 or documents alternative decisions.

**Gate 2 — CTO Review of Docs 10, 12, and 13**
CTO reviews the architectural, data model, and implementation decision documents. Confirms the technical directions. Records any modifications to the recommended directions. Signs off on the CTO review scope items (D-18).

**Gate 3 — Legal/Privacy Specialist Review**
GDPR/privacy counsel reviews: pseudonymization architecture adequacy, DPA template, GDPR deletion cascade procedure, safe aggregation threshold legal sufficiency, SVAM Variant A characterization, worker consent model. Outputs: written legal opinion or validated procedure document for each reviewed item.

**Gate 4 — Methodology Numerical Values Decision (D-21)**
Founder and methodology team define the numerical v0.1 seed values for BCM, NM normalization functions, AGF thresholds, Activation Safeguard parameters, and KORA Index weight vector. These values must satisfy the Stress Test Scenario B targets from Appendix A.

**Gate 5 — Tax/Fiscal Advisor Review (before first live fiscal classification)**
Tax/fiscal advisor reviews Italy perimeter definitions, fiscal category thresholds, welfare statement characterization, SVAM Variant A legal position per doc 11 Section 17. Note: this gate may be reached in parallel with SQL generation — fiscal classification is not required for the first scoring pilot, only for fiscal map reports.

**After all applicable gates are passed:**

The project may proceed to:
- SQL DDL generation (one store at a time, starting with Governance Store)
- Supabase project architecture and provisioning
- Migration file generation
- Prisma schema generation
- Backend service implementation (pseudonymization service first, then ingestion pipeline, then scoring engine)

**Recommended implementation sequence:**
1. Governance Store (gov schema) — lowest privacy risk, primarily reference and configuration data
2. Analytics Store (analytics schema) — scoring outputs; employer-facing views defined here
3. Evidence Store (evidence schema) — metadata and storage pointers
4. Audit Store (audit schema) — INSERT-only role provisioned before any other service writes
5. Identity Store (Database A, separate project) — last, because it requires the pseudonymization service to be operational first

---

## 10. Document Status

**Document:** `docs/13-founder-cto-review-open-questions.md`
**Version:** v0.1
**Status:** Pending Founder and CTO Review — v0.1

This document formalizes the 21 open questions from doc 12 Section 30 into a structured architectural decision process. It provides recommended directions (Section 5) and explicit non-decisions (Section 6) as a starting point for the founder and CTO review.

**This document does not generate SQL, Supabase schemas, migrations, Prisma models, or backend code.**

No technical implementation may begin until:
- Doc 12 (`docs/12-technical-data-model-database-schema.md`) is reviewed and approved
- Doc 13 (`docs/13-founder-cto-review-open-questions.md`) decisions are reviewed and recorded
- Required specialist reviews (legal/privacy, tax/fiscal) are obtained as specified

---

*All 21 decisions mapped. Recommended directions provided. Specialist requirements identified.*
*Status: Pending Founder and CTO Review — v0.1*
*No implementation may begin until this document is reviewed and gate conditions in Section 9 are met.*
