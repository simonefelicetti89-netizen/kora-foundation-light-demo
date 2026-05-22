# KORA Foundation Light — Founder Gate Resolution Log

*Status: Gate 1 CLOSED — Founder positions recorded on D-01 through D-21*
*Date: 2026-05-17*
*Author: Simone Felicetti (Founder)*
*Canonical references: docs 10, 12, 13, 18, 19, 20, CLAUDE.md*
*Does not generate: SQL, migrations, Prisma models, Supabase tables, React components, API endpoints, or application code*

---

## 1. Document Purpose

This document formally records the founder's position on each of the 21 architectural and methodological decisions defined in `docs/13-founder-cto-review-open-questions.md` (D-01 through D-21).

**What this document is:**
A formal founder decision ledger. It closes Gate 1 by establishing a recorded founder position on every implementation-critical decision. Once this document is complete, Gate 1 is closed and the project may proceed to Gate 2 (CTO review).

**What this document is not:**
A technical implementation document. A schema design. SQL. A database migration. A final methodology calibration. This document records decisions — it does not build anything.

**Scope and authority:**
- Decisions recorded here are binding for Foundation Light v0.1 implementation unless explicitly marked provisional.
- Decisions marked *Approved (Provisional v0.1)* may be refined by specialist review (legal, CTO, methodology team) without requiring a full Gate 1 revision, provided the core direction is not reversed.
- Decisions marked *Requires Specialist Review* are directionally approved but must receive specialist validation before the relevant feature goes live.
- The CTO may modify implementation specifics where no architectural principle is at stake. Modifications that reverse a privacy, immutability, or methodology-version decision require founder re-approval.
- D-21 (methodology numerical values) is treated as a provisional seed for development and testing. Final calibrated values require the Delphi Study process — that process is defined here but not completed here.

---

## 2. Gate 1 Status

**Opening status:** OPEN — D-01 through D-21 unresolved.

**Closing status (recorded at end of this document):**

> **Gate 1 — CLOSED**
> Founder positions recorded for all 21 decisions. D-21 established with provisional seed values for development and testing. Specialist review requirements identified and open. Gate 2 (CTO review) and Gates 3–5 remain open.

---

## 3. Decision Registry — Master Table

| ID | Topic | Founder Position | Specialist Review Required? |
|---|---|---|---|
| D-01 | Identity Store physical separation | **Approved** | GDPR/privacy counsel (validate architecture) |
| D-02 | Pseudonymization service & key custody | **Approved** | Privacy/security specialist (validate key custody model) |
| D-03 | Cross-schema join policy | **Approved** | None |
| D-04 | Grant absence for PIB/UEF/IU/worker_profiles | **Approved** | None |
| D-05 | Employer-facing views implementation | **Approved** | None |
| D-06 | GDPR deletion cascade procedure | **Approved (Provisional v0.1)** | GDPR legal counsel (required before live data ingest) |
| D-07 | Safe aggregation enforcement | **Approved** | GDPR counsel (mid-period suppression rule) |
| D-08 | High-sensitivity record suppression | **Approved** | GDPR/privacy counsel (RLS approach for health data) |
| D-09 | Methodology version seeding procedure | **Approved** | None |
| D-10 | Stress Test dev-only fixtures | **Approved** | None |
| D-11 | Delphi Study transition plan | **Approved (Provisional v0.1)** | Methodology team (Delphi Study transition procedure) |
| D-12 | Fiscal field minimum scope at pilot | **Approved (Provisional v0.1)** | Tax/fiscal advisor (Italy perimeter accuracy before client use) |
| D-13 | FUO reference model at pilot | **Approved** | None |
| D-14 | Audit INSERT-only role provisioning | **Approved** | None |
| D-15 | Report export security & race condition | **Approved** | None |
| D-16 | Index and partitioning strategy | **Approved (Provisional v0.1)** | CTO (index strategy confirmation at Gate 2) |
| D-17 | Blob storage provider & retention | **Approved (Provisional v0.1)** | Legal counsel (retention periods confirmation) |
| D-18 | CTO review scope | **Approved** | This is Gate 2 itself |
| D-19 | Legal/privacy counsel review scope | **Approved** | This is Gate 3 itself |
| D-20 | Tax/fiscal advisor review scope | **Approved** | This is Gate 5 itself |
| D-21 | Methodology numerical v0.1 values | **Approved (Provisional v0.1)** | Methodology team (Delphi calibration — future) |

---

## 4. Decision Entries — D-01 through D-20

### Category A — Privacy & Identity Architecture

---

**D-01 — Identity Store Physical Separation**

*Issue:* Should the Identity Store be a separate Supabase project, a separate managed PostgreSQL instance, or a separate logical database in the same cluster?

*Architectural implication:* This determines whether employer roles can ever reach identity data through a misconfigured role, join, or connection pool. Physical separation is the only architectural guarantee.

**Founder position: Approved**

*Rationale:* The Identity Store must be a separate Supabase project with independent connection credentials, independent roles, and no SQL join path to Database B (Main Platform). This separation is a constitutional privacy requirement, not an operational preference. A schema-level separation within a single project is not acceptable — it provides insufficient isolation because a privileged database role can still cross schema boundaries. The two-Supabase-project model is the correct implementation for Foundation Light.

*Implementation:* Proceed. Identity Store is Database A; Main Platform is Database B. Both provisioned as separate Supabase projects in Phase 1.

*Specialist review:* GDPR/privacy counsel to validate the physical separation model as meeting GDPR Recital 26 pseudonymization adequacy requirements — required before first live data ingest.

---

**D-02 — Pseudonymization Service & Key Custody**

*Issue:* Where does the pseudonymization service run? Where are per-company keys stored? Who has access, and how is access logged?

*Architectural implication:* The pseudonymization service is the only authorized bridge between identifiable worker data and the analytics pipeline. Key custody determines whether the privacy guarantee holds.

**Founder position: Approved**

*Rationale:* The pseudonymization service runs as a Supabase Edge Function, with per-company keys stored in Supabase Vault (or equivalent managed secrets service). The Edge Function is the only code path that can access Vault. Application code never holds keys directly. Every Vault access and every pseudonymization operation generates an `audit.audit_trail_records` entry. Keys are held by KORA's internal privacy service — not by the company, not by the application server, not in environment variables of any other service.

*Implementation:* Proceed. Pseudonymization Edge Function is the first service built in Phase 1, before any ingestion pipeline component is implemented. Nothing that touches worker identifiers may be tested until the pseudonymization service works correctly.

*Specialist review:* Privacy/security specialist to validate the Vault-based key custody model meets GDPR key separation requirements — required before first live data ingest.

---

**D-04 — Grant Absence for PIB, UEF, IU, and Worker Profiles**

*Issue:* Is Supabase's Row Level Security sufficient to enforce employer-role prohibitions on PIB and UEF tables, or must grant absence be used?

*Architectural implication:* The privacy guarantee for individual records must be architectural, not policy-dependent. RLS policies can be misconfigured. Grant absence cannot.

**Founder position: Approved**

*Rationale:* Grant absence is the correct mechanism for employer-role prohibition on `analytics.uef_records`, `analytics.pib_records`, `analytics.impact_units`, and `analytics.worker_profiles`. The employer-facing database role (`company_executive`, `company_hr_esg`) has no GRANT of any kind on these tables. There is no row-level filter to misconfigure because there is no access at all. RLS is used only for multi-tenant filtering on tables where employer access is legitimately permitted.

*Implementation:* Proceed. Grant absence provisioned for employer roles before any ingestion pipeline tests are run. Privacy tests (Section 6.4, doc 20) verify this before any live data ingest.

*Specialist review:* None required for the grant-absence decision itself. CTO to verify correct implementation at Gate 2.

---

**D-06 — GDPR Deletion Cascade Procedure**

*Issue:* When a GDPR deletion request is received for a worker, which records are deleted, anonymized, or further pseudonymized? What is the cascade, and how is compliance documented?

*Architectural implication:* KORA holds worker data across two databases and blob storage. An incomplete deletion cascade creates regulatory exposure. The procedure must be defined before the first worker record is created.

**Founder position: Approved (Provisional v0.1)**

*Rationale:* The following deletion cascade is approved as the Foundation Light v0.1 procedure:
1. Identity Store: delete the `worker_identity_records` row and destroy the per-company pseudonymization key for that worker in Vault.
2. Analytics Store: the corresponding `analytics.uef_records`, `analytics.pib_records`, and `analytics.impact_units` rows become permanently non-reversible — the key is destroyed, so the pseudonym cannot be re-linked to an identity. Rows are retained in the database but are now effectively orphaned pseudonyms with no re-identification path.
3. Evidence Store: delete or further anonymize any evidence document linked to the worker's pseudonym where individual attribution remains.
4. Audit trail: INSERT a deletion event record noting the request, the date, and the records affected.
5. The written GDPR deletion procedure document is a Phase 0 deliverable, prepared before the first data ingest.

*Implementation:* Provisional. Procedure direction approved; legal counsel must validate the key-destruction approach as constituting GDPR-compliant deletion (particularly the treatment of orphaned analytics records as effectively anonymized). No live data ingest before legal validation received.

*Specialist review:* GDPR legal counsel — required before first live company data is ingested.

---

**D-07 — Safe Aggregation Enforcement**

*Issue:* How is `workforce_segments.is_active = FALSE` enforced? What happens when a segment drops below the safe threshold mid-period?

*Architectural implication:* Safe aggregation is a privacy and legal requirement. Enforcement must be consistent across all code paths and handle mid-period threshold drops.

**Founder position: Approved**

*Rationale:* Enforcement is at the PostgreSQL view layer, not the application layer only. Employer-facing views include a mandatory `WHERE is_active = TRUE` filter on workforce segments. When a segment drops below threshold mid-period: (1) `is_active` is set to FALSE immediately, (2) no new aggregate for that segment is generated until it recovers, (3) prior published reports are not retroactively modified — the historical report remains as produced. The minimum safe group-size threshold is 10 individuals (default, configurable by legal counsel per CLAUDE.md Section 9). This behavior is documented in the employer-facing data notice.

*Implementation:* Proceed. View definitions include suppression filter from Phase 1.

*Specialist review:* GDPR counsel to validate that the mid-period suppression approach and non-retroactive report modification policy meet anonymization adequacy requirements.

---

**D-08 — High-Sensitivity Record Suppression**

*Issue:* How are UEF records with `privacy_sensitivity = 'high'` handled — separate partition, separate access path, or application filtering?

*Architectural implication:* Health data and psychological support records carry the highest legal exposure. Protection must be architectural, not application-level.

**Founder position: Approved**

*Rationale:* Two distinct mechanisms apply, protecting against two different role categories:
1. Employer roles (`company_executive`, `company_hr_esg`) have zero access to `analytics.uef_records` via grant absence (D-04) — applies to all UEF records regardless of sensitivity level.
2. Within `analytics.uef_records`, records where `privacy_sensitivity = 'high'` are readable only by `KORA_PRIVACY_ADMIN`, enforced via an RLS policy that explicitly restricts `KORA_ANALYST` access to high-sensitivity rows. These are not the same protection and must be implemented independently.

The scoring pipeline aggregates high-sensitivity records normally — individual records are never surfaced in any employer-visible output.

*Implementation:* Proceed. Both protections provisioned in Phase 1. Privacy tests validate both mechanisms independently.

*Specialist review:* GDPR/privacy counsel to validate that the RLS-based internal restriction approach provides adequate protection for Article 9 health data categories under GDPR.

---

### Category B — Database & Infrastructure Architecture

---

**D-03 — Cross-Schema Join Policy**

*Issue:* Are cross-schema joins (gov → analytics → evidence → audit) permitted within Database B, or must they be mediated by application-layer API calls?

*Architectural implication:* Determines whether the scoring pipeline runs as SQL joins or as service-to-service calls. The identity boundary between Database A and Database B must be absolute regardless of this decision.

**Founder position: Approved**

*Rationale:* Cross-schema joins are permitted within Database B (gov, analytics, evidence, audit schemas) for the KORA internal scoring pipeline. This is the correct approach for Foundation Light: it simplifies the pipeline, reduces latency, and is manageable at this scale. The identity boundary is enforced by physical database separation (D-01) — not by join policies within Database B. Cross-schema joins between Database A and Database B are physically impossible (different Supabase projects, no shared credentials).

*Implementation:* Proceed.

*Specialist review:* None. CTO to confirm join policy implementation at Gate 2.

---

**D-05 — Employer-Facing Views Implementation**

*Issue:* Are aggregate employer-visible views implemented as PostgreSQL views, materialized views, or application-layer query results?

*Architectural implication:* Employer-facing outputs are the product surface. Their performance, correctness, and privacy safety directly affect the product's value and trust.

**Founder position: Approved**

*Rationale:* PostgreSQL views (not materialized) for employer-facing reads at Foundation Light scale. Views include mandatory `WHERE is_active = TRUE` filter for workforce segments. Views are the only query path for employer roles on analytics tables — no direct table access. Materialized views are not needed at Foundation Light volume and would introduce refresh complexity. Revisit when query latency becomes a concern at scale.

*Implementation:* Proceed. Views defined in Phase 1 alongside role provisioning.

*Specialist review:* None.

---

**D-16 — Index and Partitioning Strategy**

*Issue:* Which tables require indexes at launch? Does any table require partitioning?

*Architectural implication:* Missing indexes on high-volume tables cause query degradation as data grows. Wrong partitioning is expensive to reverse in production.

**Founder position: Approved (Provisional v0.1)**

*Rationale:* Required indexes at v0.1 launch (confirmed from doc 13 Section 4 recommended direction):
- `analytics.uef_records(company_id, program_id, occurred_at)` — primary scoring pipeline query
- `analytics.impact_units(uef_record_id)` — IU lookup by UEF record
- `analytics.pib_records(company_id, program_id)` — PIB assembly query
- `audit.audit_trail_records(company_id, occurred_at, immutable_sequence_number)` — audit queries and gap detection
- `gov.ingestion_batches(company_id, status)` — batch status dashboard

Partitioning deferred: add when a single company's UEF record count exceeds 1 million rows. Not a Foundation Light concern.

*Implementation:* Provisional. CTO may add indexes at Gate 2 review.

*Specialist review:* CTO to review and confirm index strategy at Gate 2.

---

**D-17 — Blob Storage Provider & Retention**

*Issue:* What blob storage provider is used? What retention policy applies? How are access logs retained?

*Architectural implication:* Evidence integrity and long-term retention are audit requirements. Provider choice affects migration cost if it needs to change later.

**Founder position: Approved (Provisional v0.1)**

*Rationale:* Supabase Storage for Foundation Light (native integration with Supabase auth, bucket-level access control, minimal operational overhead). Three private buckets: `raw-datasets`, `evidence-files`, `report-exports`. Retention periods (provisional, pending legal counsel confirmation): evidence files = 7 years (aligned with Italian fiscal record retention requirements), report exports = 3 years, raw datasets = 1 year post-processing. All blob access events logged in `audit.audit_trail_records`. Retention is enforced via a scheduled cleanup function — Supabase Storage does not enforce retention natively.

*Implementation:* Provisional. Retention periods require legal counsel confirmation.

*Specialist review:* Legal counsel to confirm retention periods before first live evidence document is stored.

---

### Category C — Access Control & Aggregation

*(D-07 and D-08 addressed in Category A above, as they are privacy-critical.)*

---

### Category D — Methodology Versioning & Immutability

---

**D-09 — Methodology Version Seeding Procedure**

*Issue:* How are pre-calibration Foundation Light v0.1 values seeded into methodology tables?

*Architectural implication:* The methodology seed is the calibration baseline for all Foundation Light scoring. How it is seeded determines whether it is auditable, repeatable, and environment-safe.

**Founder position: Approved**

*Rationale:* The methodology seed is executed as a controlled admin seed operation via the application layer (not a raw SQL migration). The seed script: (1) creates the `gov.methodology_versions` record with `calibration_status = 'pre_empirical_calibration'` and `is_current = TRUE`, (2) populates `gov.bcm_entries`, `gov.nm_rules`, `gov.correction_factor_rule_versions`, and `gov.kora_index_weight_versions` with the D-21 provisional values, (3) generates an `audit.audit_trail_records` entry for the seeding event, including the seed script version. The script is version-controlled and reviewed by CTO before execution. It does not run in production automatically — it is a manually triggered admin operation.

*Implementation:* Proceed. Seed script is a Phase 1 deliverable, executed after roles and schemas are provisioned.

*Specialist review:* None. CTO to review seed script before execution.

---

**D-11 — Delphi Study Transition Plan**

*Issue:* When the Delphi Study produces calibrated weights and BCM values, what is the schema migration path? How are historical pre-calibration records distinguished from post-calibration records?

*Architectural implication:* The Delphi calibration transition is a planned future event. The schema must support it without a breaking migration.

**Founder position: Approved (Provisional v0.1)**

*Rationale:* No schema migration is required for the Delphi transition. The schema already supports it: `calibration_status` exists on all methodology tables and scoring components. When Delphi calibration is complete, a new `gov.methodology_versions` record is created with updated BCM and weight values and `calibration_status = 'empirically_calibrated'`. All historical records retain their `methodology_version_id` reference to the pre-calibration version. Dashboard and report generation always displays `calibration_status` alongside any score — the distinction is always visible. The methodology team will define the exact Delphi transition procedure separately.

*Implementation:* Provisional. The transition mechanism is defined; the timing and the Delphi Study itself are future events. No implementation work is needed now beyond ensuring the schema fields exist.

*Specialist review:* Methodology team to define the Delphi Study protocol and the transition validation procedure.

---

### Category F — Reporting & Export Security

---

**D-14 — Audit INSERT-Only Role Provisioning**

*Issue:* How is the INSERT-only database role for `audit.audit_trail_records` provisioned, and how is it isolated?

*Architectural implication:* Audit trail immutability is a security and compliance guarantee. It must be enforced at the database level, not the application level.

**Founder position: Approved**

*Rationale:* A dedicated database role (`kora_audit_writer`) is provisioned with GRANT INSERT ON `audit.audit_trail_records` only — no SELECT, no UPDATE, no DELETE. Audit writes are routed through a dedicated Supabase Edge Function (the Audit Writer service) that operates exclusively under the `kora_audit_writer` role. Application components and services never hold `kora_audit_writer` credentials directly — they call the Audit Writer endpoint with a structured event payload. This pattern mirrors the pseudonymization service: a narrow, purpose-limited Edge Function as the only authorized path for a sensitive operation. No client-side code may write audit records.

*Implementation:* Proceed. Audit Writer service provisioned in Phase 1 alongside all other roles and schemas. The Audit INSERT-only role is provisioned before any other service begins writing data.

*Specialist review:* None. CTO to verify correct role provisioning at Gate 2.

---

**D-15 — Report Export Security & Race Condition**

*Issue:* How are export download links generated and time-limited? How is `download_count` updated without a race condition?

*Architectural implication:* Report exports may contain compliance-sensitive company data. Download count accuracy is an audit requirement.

**Founder position: Approved**

*Rationale:* Pre-signed blob storage URLs with embedded expiry (24-hour TTL for standard reports). The download event triggers a server-side callback that updates `download_count` and `last_downloaded_at` via a dedicated internal endpoint — not a client-side PATCH. The callback uses an optimistic lock (UPDATE with WHERE clause) to handle concurrent downloads without a race. Every download generates an `audit.audit_trail_records` entry server-side. No client-side audit writes.

*Implementation:* Proceed. Implemented in Phase 11 (Report Export).

*Specialist review:* None.

---

**D-18 — CTO Review Scope**

*Issue:* What must the CTO review before the first SQL generation?

*Founder position: Approved*

*Rationale:* The CTO review scope is approved as defined in doc 13 Section 4. Minimum review items: (1) 5-store physical architecture and separation guarantees, (2) pseudonymization service design and key custody, (3) RLS vs. grant-absence strategy per table, (4) audit INSERT-only role provisioning, (5) cross-schema join policy within Database B, (6) blob storage integration and access logging, (7) safe aggregation view filter implementation, (8) GDPR deletion cascade procedure, (9) employer-facing view definitions, (10) index strategy for high-volume tables.

*Implementation:* Gate 2. No SQL generated before CTO review is complete.

*Specialist review:* This decision defines Gate 2 itself.

---

**D-19 — Legal/Privacy Counsel Review Scope**

*Issue:* What is the full scope of legal/privacy counsel review before any live data is ingested?

*Founder position: Approved*

*Rationale:* The legal/privacy counsel review scope is approved as defined in doc 13 Section 4. Minimum review items: (1) pseudonymization architecture adequacy under GDPR Recital 26, (2) DPA template, (3) data retention periods per evidence category, (4) GDPR deletion cascade procedure (D-06), (5) safe aggregation threshold legal sufficiency, (6) SVAM Variant A legal characterization, (7) worker consent model for PIB scoring and data retention, (8) AI suggestion retention policy, (9) cross-border data transfer implications (Italy-first).

*Implementation:* Gate 3 engagement begins in Phase 0. Counsel review completes before Phase 14 (Pilot Hardening). Synthetic-only development (Phases 1–2) may proceed without Gate 3 completion.

*Specialist review:* This decision defines Gate 3 itself.

---

**D-20 — Tax/Fiscal Advisor Review Scope**

*Issue:* What is the full scope of tax/fiscal advisor review before any fiscal feature goes live?

*Founder position: Approved*

*Rationale:* The tax/fiscal advisor review scope is approved as defined in doc 13 Section 4 and doc 11 Section 17. Minimum review items: (1) Italy fiscal perimeter definitions in `gov.fiscal_perimeters` (Art. 51 TUIR framing accuracy), (2) annual caps and thresholds in `gov.fiscal_category_thresholds` (aligned with current Budget Law), (3) welfare statement characterization as informational-only, (4) SVAM Variant A vs. B escalation conditions, (5) Fiscal Guardrails Engine design before activation. No company may activate a live fiscal perimeter before this review is complete.

*Implementation:* Gate 5. May run in parallel with Phases 1–5. Required before live fiscal classification outputs are presented to any real company.

*Specialist review:* This decision defines Gate 5 itself.

---

### Category G — Foundation Light Operational Scope

---

**D-12 — Fiscal Field Minimum Scope at Pilot**

*Issue:* Which fiscal and eligibility fields are required for the Foundation Light initial pilot? Can the fiscal classification map report be produced with Italy-only perimeters and `kora_inferred` as the default confidence level?

*Architectural implication:* Fiscal classification is a parallel dimension to impact. Over-scoping it at Foundation Light creates complexity without adding demo value.

**Founder position: Approved (Provisional v0.1)**

*Rationale:* Minimum viable fiscal scope at pilot: (1) Italy perimeters seeded in `gov.fiscal_perimeters` for the nine canonical categories defined in doc 11 and doc 04, (2) `eligibility_confidence = 'kora_inferred'` is the default for all services — no partner documentation required at pilot, (3) the fiscal classification map report shows the distribution of services by fiscal category and confidence level, with a clear disclaimer that `kora_inferred` classifications require advisor review before tax-advantaged activation, (4) `gov.fuo_accounts` is not required at pilot — perimeter activation proceeds without FUO linkage under SVAM Variant A.

*Implementation:* Provisional. Italy perimeters seeded in Phase 1. Fiscal classification output carries informational disclaimer. Tax/fiscal advisor must validate Italy perimeter definitions before any client activates a live fiscal perimeter (Gate 5).

*Specialist review:* Tax/fiscal advisor (Italy perimeter accuracy) — Gate 5, before client use of fiscal features.

---

**D-13 — FUO Reference Model at Pilot**

*Issue:* For initial pilots, will `gov.fuo_accounts` be populated at all? What is the minimum viable data state for Foundation Light under SVAM Variant A?

*Founder position: Approved*

*Rationale:* FUO account is optional at pilot. A company can activate a fiscal perimeter without populating `gov.fuo_accounts`. The field exists for future use. Minimum viable data state for Foundation Light pilot: (1) `gov.companies` record with signed DPA, (2) at least one `gov.company_programs` record, (3) at least one approved `gov.ingestion_batches`, (4) Italy perimeters available for selection (KORA-seeded), (5) FUO account: not required.

*Implementation:* Proceed.

*Specialist review:* None.

---

### Category H — Development & Testing Strategy

---

**D-10 — Stress Test Dev-Only Fixtures**

*Issue:* Should Stress Test numerical scenarios (Appendix A) be included as development-only seed data? How is dev seed data isolated from production?

*Founder position: Approved*

*Rationale:* Stress Test scenarios are loaded as development-only fixtures before Phase 5 begins. Environment isolation: (1) development Supabase project receives the Stress Test seed, (2) staging project receives anonymized real-structure data only, (3) production receives no synthetic data. The scoring engine must reproduce Stress Test Scenario B within defined tolerance before Phase 6 (Company Dashboard) begins. No demo or pilot is presented on Stress Test fixture data — they are validation instruments only.

*Implementation:* Proceed. Fixtures isolated from synthetic demo data profiles (A–D) and from staging/production environments.

*Specialist review:* None. Methodology team to validate expected Scenario B outputs and define the tolerance band.

---

## 5. D-21 — Provisional Methodology Calibration Values

### 5.1 Status and purpose

**Founder position: Approved (Provisional v0.1)**

D-21 defines the numerical seed values required to execute the methodology seed (D-09), run the scoring engine (Phase 5), and validate against Stress Test Scenario B. These values are explicitly provisional — they are not scientifically calibrated final values.

**What "provisional" means here:**
- Sufficient for development, synthetic testing, Stress Test validation, demo, and pilot simulation
- Not: final Delphi-calibrated weights, statistically validated thresholds, or regulatory-certifiable values
- Every output produced under these values carries `calibration_status = 'pre_empirical_calibration'` — this label is mandatory and non-suppressible
- The Delphi Study (future) replaces these values with a new methodology version record; no migration of historical records is required

### 5.2 KORA Index 10-Component Weight Vector

> **AMENDMENT — KORA Index v3 (Phase 1N):** The flat equal-weight vector below was provisional scaffolding for Foundation Light pre-build. It is **no longer canonical**. KORA Index v3 replaces it with a theory-aligned macroblock weight structure (v0.1 pre-empirical calibration): REACH 25% · QUALITY 30% · EQUITY 25% · BTI 20%. CS is external (weight=0). Canonical weights are in `data/methodology/methodology-config.json` and read via `lib/methodology-config/v0.1.ts`. The original decision record below is retained for audit continuity only.

Components (from Architecture v3 and CLAUDE.md): AR, MAR, NI, WB, PC, PB, EQ, VR, CO, CS.

**Provisional v0.1 weight vector (original D-21 decision — superseded by KORA Index v3): equal weights — 0.10 per component.**

Rationale: Equal weighting is the methodologically neutral baseline for a pre-calibration system. It does not impose an empirically unjustified relative emphasis on any component before the Delphi Study produces evidence-based weights. The Delphi Study may significantly redistribute these weights — that redistribution is the purpose of the calibration process.

| Component | Description | Provisional Weight |
|---|---|---|
| AR | Activation Rate | 0.10 |
| MAR | Meaningful Activation Rate | 0.10 |
| NI | Normalized Intensity | 0.10 |
| WB | Worker Balance | 0.10 |
| PC | Pillar Coverage | 0.10 |
| PB | Pillar Balance | 0.10 |
| EQ | Equity | 0.10 |
| VR | Verification Rate | 0.10 |
| CO | Continuity | 0.10 |
| CS | Confidence Score | 0.10 |
| **Total** | | **1.00** |

CO redistribution rule (approved in doc 20 Module F): When CO = INSUFFICIENT_DATA (first analysis), the 0.10 weight is redistributed proportionally across the nine remaining components. Each adjusted weight: `w_k_adjusted = 0.10 + (0.10 × 0.10 / (1.00 − 0.10)) = 0.10 + 0.0111 = 0.1111`. The total weight vector continues to sum to 1.00.

### 5.3 Activation Safeguard Thresholds

The Activation Safeguard (Stage 13) evaluates AR (Activation Rate) and MAR (Meaningful Activation Rate) against defined thresholds and assigns a status: CLEAR, WARNING, or FLAGGED.

**Provisional v0.1 thresholds:**

| Status | AR condition | MAR condition |
|---|---|---|
| CLEAR | AR ≥ 0.40 | AND MAR ≥ 0.30 |
| WARNING | 0.20 ≤ AR < 0.40 | OR 0.15 ≤ MAR < 0.30 |
| FLAGGED | AR < 0.20 | OR MAR < 0.15 |

Validation required: these thresholds must produce the expected status for all four synthetic company profiles when Stress Test Scenario B is run:
- Profile A (68% activation) → CLEAR
- Profile B (45% activation) → WARNING (expected)
- Profile C (18% activation) → WARNING or FLAGGED
- Profile D (training-only, first analysis) → status computed on available data

If the provisional thresholds do not produce the expected status distribution, the thresholds are adjusted before Phase 5 is marked complete. Threshold adjustment does not require a Gate 1 revision — it is a calibration operation under the approved provisional framework.

### 5.4 BCM Weighting Approach

**Provisional v0.1 BCM weighting: equal weighting within each pillar family.**

No differential category weights are applied in the NM (Normalization Multiplier) calculation until the Delphi Study produces evidence-based BCM weights. All BCM entries within the same pillar carry equal NM contribution from the category factor.

NM scaling range: [0.00, 1.00], normalized by a reference maximum intensity per event category.

Provisional NM reference ranges (pre-calibration):
- Certified program completions (full engagement, verified outcome): NM reference 0.80–1.00
- Standard evidenced events (documented participation, single session or course): NM reference 0.50–0.75
- Declared events (participant self-report, no external evidence): NM reference 0.25–0.50
- Passive or incomplete participation: NM reference 0.10–0.30

The exact NM value per event category is defined in the `gov.nm_rules` seed table populated by the D-09 methodology seed script. The seed script carries version-control reference to this document as the authority for the provisional values.

### 5.5 Optional IU Factors (DF, EXF, SF)

**Provisional v0.1 default: all optional factors default to 1.00.**

- DF (Durability Factor): 1.00 by default. Applicable only to LEGACY pillar events where the action produces durable, long-term organizational value and supporting evidence of lasting impact exists. Must not be applied to non-LEGACY events. Range: [1.00–1.30] when applied.
- EXF (Externality Factor): 1.00 by default. Applicable only to IMPACT pillar events where verified external beneficiaries, territorial value, or community impact exists and is documented. Must not be applied to non-IMPACT events. Range: [1.00–1.20] when applied.
- SF (Strategic Fit): 1.00 by default; range [0.80–1.10]; may only be applied with explicit documented evidence per CLAUDE.md Rule 23

No optional factor may be applied by default or by system convention. Applying a non-1.00 value requires: explicit analyst annotation, documented rationale, and audit trail entry. This ensures the IU formula produces deterministic, explainable outputs for all Foundation Light v0.1 pilot data.

### 5.6 AGF (Anti-Gaming Factor)

AGF is a mandatory, independent factor in the canonical IU formula — it is not a product of DF and EXF. DF, EXF, and AGF are three separate, independently applied factors:

`IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]`

AGF is always applied (not optional). Range: [0.00–1.00]. Default: 1.00 when no anti-gaming triggers are detected. AGF is reduced by the scoring engine when it detects repetition patterns, volume inflation, disqualification-threshold events, or anomaly patterns as defined in `gov.anti_gaming_rules_versions`. AGF = 0.00 sets `analytics.impact_units.is_disqualified = TRUE` and the resulting IU = 0.

DF and EXF are separate optional factors (shown in square brackets in the formula) with their own pillar-specific application conditions. AGF is neither a product of DF × EXF nor equivalent to them. Any implementation that computes AGF as DF × EXF is a formula error.

For Foundation Light v0.1: AGF = 1.00 unless explicitly set by anti-gaming rule evaluation. No analyst may manually set AGF — it is system-computed only.

### 5.7 Stress Test tolerance band

**Provisional tolerance band:** KORA Index output within ±5% of the Stress Test Scenario B expected value is acceptable for Phase 5 validation.

The exact expected output for Stress Test Scenario B is defined in Appendix A. If the scoring engine produces an output outside the ±5% band, the engine must be debugged stage by stage before Phase 6 (Company Dashboard) begins. The tolerance band does not change the acceptance criterion — it defines what counts as a passing test during internal development.

### 5.8 Calibration process roadmap

The Delphi Study is the planned path from provisional v0.1 values to empirically calibrated values. This roadmap is directional, not binding.

| Step | Action | Timing |
|---|---|---|
| 1 | Run Foundation Light v0.1 on 3–5 pilot companies with provisional values | During pilot phase |
| 2 | Collect analyst override patterns (especially BCM pillar suggestion overrides) and scoring feedback from pilot companies | During pilot phase |
| 3 | Convene methodology expert panel for Delphi Study round 1 | After 3+ completed pilot analyses |
| 4 | Define calibrated weight vector and BCM category weights from Delphi output | Delphi Study |
| 5 | Create new `gov.methodology_versions` record with calibrated values | After Delphi validation |
| 6 | Re-run historical pilot scores under new version to assess impact | Optional — for pilot company communication |
| 7 | Update `calibration_status` to `empirically_calibrated` on new version | After validation |

Historical Foundation Light v0.1 outputs retain their pre-calibration label permanently — they are not retroactively relabeled after Delphi calibration.

---

## 6. Open Specialist Reviews

Gate 1 closure does not close Gates 2–5. The following specialist reviews remain open. None block Phases 1–2 (synthetic-only development). All must complete before the specified live-data milestone.

### 6.1 Gate 2 — CTO Review (blocks Phase 1 / SQL generation)

Required before first SQL generation and Supabase provisioning.

CTO review scope (from D-18, approved above):
- 5-store physical architecture and separation guarantees (D-01)
- Pseudonymization service design and key custody model (D-02)
- RLS vs. grant-absence strategy per table (D-04, D-08)
- Audit INSERT-only role provisioning (D-14)
- Cross-schema join policy within Database B (D-03)
- Blob storage integration and access logging (D-17)
- Safe aggregation view filter implementation (D-07)
- GDPR deletion cascade procedure (D-06)
- Employer-facing view definitions (D-05)
- Index strategy for high-volume tables (D-16)

**Action required:** Founder identifies and engages CTO. CTO reviews docs 10, 12, 13, and 20 before Gate 2 is closed.

### 6.2 Gate 3 — Legal/Privacy Counsel Review (blocks live data ingestion)

Engagement begins Phase 0. Review completes before Phase 14 (Pilot Hardening). Synthetic-only Phases 1–2 may proceed.

Legal review scope (from D-19, approved above):
- Pseudonymization architecture adequacy (GDPR Recital 26) — D-01, D-02
- GDPR deletion cascade procedure — D-06
- Safe aggregation threshold legal sufficiency — D-07
- High-sensitivity RLS approach (Article 9 health data) — D-08
- DPA template — Phase 0 deliverable
- Data retention periods per evidence category — D-17
- AI suggestion retention policy — doc 20 Module B-AI
- SVAM Variant A legal characterization — doc 11
- Worker consent model for PIB scoring and data retention
- Cross-border data transfer implications (Italy-first deployment)

**Action required:** Founder identifies and engages GDPR/privacy legal counsel in Phase 0.

### 6.3 Gate 4 — Methodology Numerical Values (blocks Phase 5 / Scoring Engine)

D-21 provisional values (Section 5 above) are sufficient for Phase 1–4 development and Stress Test fixture loading. Gate 4 is provisionally addressed by Section 5 of this document.

The Delphi Study process (Section 5.8) must complete and produce final calibrated values before any live pilot company sees a KORA Index result under a `calibration_status = 'empirically_calibrated'` label.

**Action required:** Methodology team engages on Delphi Study protocol in parallel with Phases 1–4. Provisional values in Section 5 are sufficient to unblock Phase 5 development.

### 6.4 Gate 5 — Tax/Fiscal Advisor Review (blocks live fiscal classification outputs)

Scope from D-20, approved above. May run in parallel with Phases 1–5. Does not block demo or pilot scoring — only blocks presenting live fiscal classification results to a real company.

**Action required:** Founder identifies and engages tax/labor law advisor in Phase 0. Review completes before any company activates a live fiscal perimeter.

### 6.5 Methodology Team Review (Stress Test validation)

The Delphi Study is a future event. The methodology team must also validate:
- Stress Test Scenario B expected output values and define the tolerance band (±5% provisional per Section 5.7 — methodology team to confirm or adjust)
- The Delphi Study protocol and the calibration transition procedure (D-11)

---

## 7. Gate Outcome

### 7.1 Gate 1 — Founder Review of D-01 through D-21

**Status: CLOSED**

All 21 decisions have a recorded founder position:
- 14 decisions: **Approved** (implementation may proceed without further restriction)
- 7 decisions: **Approved (Provisional v0.1)** (implementation may proceed; specialist confirmation required before live use of the specific feature)
- 0 decisions: **Deferred**
- 0 decisions: unresolved

The 7 provisional decisions and their live-gate dependencies:

| Decision | Provisional Until |
|---|---|
| D-06 GDPR deletion cascade | Gate 3 (legal counsel validation) |
| D-11 Delphi transition plan | Methodology team (Delphi Study) |
| D-12 Fiscal scope at pilot | Gate 5 (tax/fiscal advisor) |
| D-16 Index strategy | Gate 2 (CTO confirmation) |
| D-17 Blob storage retention | Gate 3 (legal confirmation) |
| D-21 Methodology numerical values | Gate 4 / Delphi Study |
| D-21 (contained) CO redistribution | Confirmed in doc 20 — approved |

### 7.2 Gates 2–5

| Gate | Status | Next action |
|---|---|---|
| Gate 2 — CTO review | **OPEN** | Founder engages CTO. CTO reviews docs 10, 12, 13, 20 |
| Gate 3 — Legal/privacy counsel | **OPEN** | Founder engages GDPR counsel in Phase 0 |
| Gate 4 — Methodology values | **Provisionally addressed by Section 5** | Delphi Study for final calibration |
| Gate 5 — Tax/fiscal advisor | **OPEN** | Founder engages tax/labor law advisor in Phase 0 |

### 7.3 What Gate 1 closure unlocks

Gate 1 closure does **not** by itself permit any code or SQL generation. It unlocks the ability to pursue Gate 2, which unlocks Phase 1.

The unlock sequence:
- Gate 1 CLOSED + Gate 2 CLOSED → Phase 1 (SQL generation, Supabase provisioning) may begin
- Phases 1–2 (synthetic data) do not require Gate 3
- Gate 4 provisionally addressed (D-21 Section 5) → Phase 5 (Scoring Engine) may begin after Gate 2
- Gate 3 → Live data ingestion from real companies
- Gate 5 → Live fiscal classification results presented to companies

---

## 8. Next Step

### 8.1 Immediate founder actions (no further documentation needed)

1. Identify and engage CTO — Gate 2 prerequisite
2. Brief CTO on KORA architecture before formal review (docs 10, 12, 13, 20)
3. Identify and engage GDPR/privacy legal counsel — Gate 3 engagement
4. Identify and engage tax/labor law advisor — Gate 5 engagement
5. Begin Delphi Study protocol with methodology team — Gate 4 path
6. Launch 90-day validation plan Phase 1 (per doc 15 Section 7) — no gate required

### 8.2 Next document

When Gate 1 is closed (this document) and Gate 2 is passed (CTO review complete):

> **`docs/22-foundation-light-sql-schema-specification.md`**

This document generates the SQL DDL definitions for all stores (gov → analytics → evidence → audit → Identity Store), derived from the approved logical schema in doc 12 and incorporating all D-01 through D-21 decisions recorded here.

**Doc 22 remains blocked until:**
- Gate 1: CLOSED — ✓ (this document)
- Gate 2: CTO reviews docs 10, 12, 13, 20 and records positions — OPEN
- Doc 20 reviewed by founder and CTO — OPEN (in progress)

### 8.3 The no-code rule

No SQL, migrations, Prisma models, Supabase tables, React components, API endpoints, or application code may be generated until Gate 1 is closed (✓ this document) and Gate 2 is passed (CTO review complete).

---

## 9. Document Integrity

This document records positions only — it does not create or modify any schema, table, migration, service, or code artifact.

Every canonical architectural decision established in docs 01–20 remains in force. Nothing in this document overrides:
- The five-pillar structure (CLAUDE.md Section 3)
- The 14-stage algorithm (doc 10)
- The canonical IU formula (CLAUDE.md Rule 23)
- The 10-component KORA Index (CLAUDE.md Rule 20)
- The mandatory Activation Safeguard (CLAUDE.md Rule 21)
- The pseudonymization key custody model (CLAUDE.md Rule 22)
- The privacy boundaries (CLAUDE.md Section 9)
- The no-code rule (CLAUDE.md Section 10, Item 18)

---

*Document authored: 2026-05-17*
*Version: v1.0*
*Status: Gate 1 CLOSED — Founder positions recorded on all 21 decisions*
*Author: Simone Felicetti (Founder)*
*Gate authority: doc 13 Section 9*
*Does not generate: SQL, migrations, Prisma models, Supabase tables, React components, API endpoints, or application code*
*Next document: `docs/22-foundation-light-sql-schema-specification.md` — blocked until Gate 2 passed*
