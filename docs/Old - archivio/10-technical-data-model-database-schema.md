# KORA Technical Data Model & Database Schema Definition

*Version 0.1 — Foundation Light*
*Status: Design Document — Pending CTO and Legal Review*
*Aligned with: Methodological Constitution v0.1, Conceptual Data Model v0.1, Founder Technical Decisions v0.1*

All schema decisions in this document are consistent with the 10 approved Founder Technical Decisions in doc 08. No application code, migration files, or executable SQL is produced here. This document is the technical design from which those artifacts will be built.

---

## 1. Technical Schema Principles

The following principles govern every table, field, relationship and constraint in the KORA schema. They are derived directly from the KORA Methodological Constitution and the approved Founder Technical Decisions. Any implementation decision that conflicts with these principles must be escalated before proceeding.

**Privacy by architecture, not policy**
The Worker Identity Layer and the Anonymized Worker Profile are separated at the database level, not merely at the application level. No employer-facing role can, through any query, join, export, or API call, navigate from an anonymized analytical record to a named individual. This must be true of the data architecture, not only of the interface.

**Separation of identity and analytics**
The Identity Store holds identifiable data. The Analytics Store holds pseudonymized analytical data. The pseudonymization service is the only bridge. Application roles that operate against the Analytics Store must not have any permission to access the Identity Store's connection string, schema, or credentials.

**Methodology versioning from day one**
Every table that stores a calculated output — Impact Units, PIB, KORA Index, Confidence Scores, Reports — carries a `methodology_version_id` field. This field is non-nullable. No score may be stored without a version reference. This constraint is enforced at the schema level, not only by application logic.

**Auditability as a structural property**
The Audit Trail is append-only. The application database role that writes audit records has INSERT permission only — no UPDATE, no DELETE — on the audit trail table. Every significant state change in the platform produces an audit trail entry.

**Fiscal eligibility separate from impact**
No foreign key exists from any Eligibility Profile or Fiscal/Budget Perimeter entity into the Impact Unit formula fields. Eligibility data lives in the Governance Store. Impact data lives in the Analytics Store. Their co-existence in a UEF Record is through reference fields — not through a shared scoring calculation.

**Budget and financial data separate from impact scoring**
Financial Budgets and Financial Movements do not feed the KORA Index. They exist in the Governance Store as decision-support intelligence. No formula in the Analytics Store has a dependency on a budget amount.

**Evidence separate from claims**
Evidence Records hold pointers to blob storage, not the claim they support. An Impact Unit, an Eligibility Profile, or an Advisor Review may reference an Evidence Record. But the Evidence Record does not itself assert that a claim is valid — the confidence levels and verification logic do that.

**Asynchronous ingestion with required human review**
The ingestion pipeline is not synchronous. Ingestion Batches carry a status field covering: Submitted → Under Review → Approved → Processing → Complete / Error. Impact Units may only be generated from Ingestion Batches in Approved status.

**Pre-computed reports**
Reports are generated after each Ingestion Batch reaches Complete status and stored as Report records. They are never re-generated automatically when methodology changes. A stored Report is the auditable record of what was shown to the company at a specific point in time.

**Foundation Light first, full architecture compatible**
Tables are designed to support the full KORA architecture from day one — even where features are not yet implemented. A field labelled "Future" is present in the schema but not yet populated. This avoids the structural refactoring cost of adding it later.

---

## 2. Logical Database Separation

KORA Foundation Light uses logical database separation enforced at the connection-string and credential level. Five logical stores are defined below. In Foundation Light v0.1, these may be implemented as five separate databases on shared infrastructure. The boundary between them must be enforced by credentials and network policy — not only by application logic.

**This does not require five physical machines.** It requires five separate databases with separate credentials and separate access policies. The isolation is logical and credential-enforced, not necessarily physical.

---

### A. Identity Store

**Purpose:** Holds all identifiable worker data — the minimal set of personal information KORA touches before pseudonymization. This store is the controlled boundary zone for incoming identifiable data.

**Contains:**
- `worker_identity_records` — company employee ID to KORA pseudonym mapping
- `pseudonymization_key_references` — metadata about per-company pseudonymization keys (not the key material itself)
- Data subject rights request logs

**Access policy:**
- Application roles used by the ingestion pipeline may write new records (INSERT only).
- A dedicated KORA privacy administrator role has read access for data subject rights operations.
- No employer-facing role, analyst role, or reporting role has any access to this store.
- No join from Identity Store tables to Analytics Store tables is permitted at the query level.

**Credential isolation:**
The Identity Store uses a separate database credential from all other stores. This credential is not present in any environment variable or configuration accessible to the Analytics Store application layer.

---

### B. Analytics Store

**Purpose:** Holds all pseudonymized analytical data — the operational core of KORA's intelligence engine.

**Contains:**
- `anonymized_worker_profiles`
- `workforce_segments`
- `uef_records`
- `pillar_mappings`
- `impact_units`
- `pib_records`
- `company_impact_aggregates`
- `kora_indices`
- `kora_index_components`
- `kora_contributions`
- `kora_ecosystem_reach`
- `confidence_scores`

**Access policy:**
- Application roles may read and write analytical records.
- Employer-facing API endpoints query this store only through aggregation-layer views that enforce privacy thresholds.
- No employer role queries individual `pib_records` or individual `uef_records` directly.
- `worker_identity_records` is never joined, referenced by foreign key, or accessible from this store.

---

### C. Governance Store

**Purpose:** Holds company configuration, fiscal compliance data, partner data, financial governance data, and KORA operational data.

**Contains:**
- `companies`
- `company_programs`
- `data_sources`
- `raw_datasets`
- `ingestion_batches`
- `ingestion_batch_warnings`
- `ingestion_rejected_rows`
- `financial_budgets`
- `financial_movements`
- `fiscal_budget_perimeters`
- `partners`
- `partner_services`
- `eligibility_profiles`
- `eligibility_contributions`
- `policy_rules`
- `advisor_reviews`
- `reports`
- `report_sections`
- `methodology_versions`
- `methodology_parameters`
- `users`
- `roles`
- `permissions`
- `user_roles`

**Access policy:**
- Employer-facing roles access Governance Store tables scoped to their own company and within their role permissions.
- Financial data is visible only to Finance-role users.
- Eligibility data is visible only to Admin and HR-role users.
- No employer role accesses `worker_identity_records` (which does not exist in this store).

---

### D. Evidence Store Metadata

**Purpose:** Holds metadata and storage pointers for all evidence documents. The actual documents are in KORA-controlled blob storage — this store holds the catalogue of what exists and where.

**Contains:**
- `evidence_records`

**Access policy:**
- Evidence Record metadata is readable by roles with governance access.
- The blob storage access credential is separate from the database credential and never exposed to employer roles.
- High-sensitivity evidence records are subject to elevated access control at both the metadata and blob storage levels.
- Signed access URLs for blob retrieval are generated by the privacy-aware evidence service and expire after a defined TTL.

---

### E. Audit Store

**Purpose:** Holds the append-only audit trail — a permanent, write-once record of every significant action in the KORA platform.

**Contains:**
- `audit_trail_records`

**Access policy:**
- The application database role for the Audit Store has INSERT permission only. UPDATE and DELETE are not granted.
- KORA Admin role has read access for audit review purposes.
- No employer role has direct access to the raw audit trail table. Audit summaries in the Governance Store are derived from pre-computed aggregates, not from direct audit trail queries.
- The Audit Store credential is never shared with any other store's application role.

---

## 3. Entity-to-Table Mapping Overview

The following maps every conceptual entity from the Conceptual Data Model (doc 07) to its technical table name, store, Foundation Light build status, and key notes.

| Conceptual Entity | Proposed Table(s) | Store | Foundation Light Status | Notes |
|---|---|---|---|---|
| Organization / Company | `companies` | Governance | Core | Root entity for all company-scoped data |
| Company Program | `company_programs` | Governance | Core | Scope for all analytical outputs |
| Worker Identity Layer | `worker_identity_records` | Identity | Core — isolated | Accessible only to privacy administrator role |
| Pseudonymization Keys | `pseudonymization_key_references` | Identity | Core | Key material held externally; only metadata stored |
| Anonymized Worker Profile | `anonymized_worker_profiles` | Analytics | Core | No identifiable field; linked to identity only via pseudonym |
| Workforce Segment | `workforce_segments` | Analytics | Basic | Suppressed below safe threshold; threshold stored in company config |
| Data Source | `data_sources` | Governance | Core | Origin system descriptor; carries intrinsic verification level |
| Raw Dataset | `raw_datasets` | Governance | Core | Immutable record of received data; preserved for re-processing |
| Ingestion Batch | `ingestion_batches` | Governance | Core | Asynchronous workflow; status lifecycle enforced |
| Ingestion Warnings | `ingestion_batch_warnings` | Governance | Core | Per-batch warning flags surfaced to reviewer |
| Ingestion Rejected Rows | `ingestion_rejected_rows` | Governance | Core | Row-level rejection log with reason codes |
| KORA Action / Event | `uef_records` | Analytics | Core | UEF Record is the technical form of the KORA Action after processing |
| Pillar | `pillars` | Governance | Core | Fixed reference table; five rows; LIFE/GROWTH/CONNECTION/IMPACT/LEGACY |
| Pillar Mapping | `pillar_mappings` | Analytics | Core | Per-UEF-record classification; method and confidence stored |
| Impact Unit | `impact_units` | Analytics | Core | All formula components stored; methodology version required |
| PIB — Personal Impact Balance | `pib_records` | Analytics | Core — internal only | Never employer-visible at individual level |
| Company Impact Aggregate | `company_impact_aggregates` | Analytics | Core | Pillar-level aggregate; basis for KORA Index inputs |
| KORA Index | `kora_indices` | Analytics | Core | Pre-computed; stored after approved batch |
| KORA Index Components | `kora_index_components` | Analytics | Core | One row per component per index record |
| KORA Contribution | `kora_contributions` | Analytics | Basic — if IMPACT data present | Separate indicator; not a KORA Index component |
| KORA Ecosystem Reach | `kora_ecosystem_reach` | Analytics | Basic — if partner data present | Separate indicator; not a KORA Index component |
| Financial Budget / Fund | `financial_budgets` | Governance | Basic | INPUT layer; budget ≠ impact |
| Financial Movement | `financial_movements` | Governance | Basic — aggregate | GOVERNANCE layer; spend ≠ score |
| Fiscal / Budget Perimeter | `fiscal_budget_perimeters` | Governance | Basic — Italy seeded | Configurable by country; Italy taxonomy seeded at launch |
| Partner | `partners` | Governance | Basic | Partner ≠ impact; utilization drives IU |
| Partner Service | `partner_services` | Governance | Basic | Service ≠ impact; worker usage drives IU |
| Eligibility Profile | `eligibility_profiles` | Governance | Basic — display only | Current status per service per perimeter |
| Eligibility Contributions | `eligibility_contributions` | Governance | Basic | Versioned contribution log; source + confidence per entry |
| Policy Rule | `policy_rules` | Governance | Not applicable in Foundation Light | Schema present; enforcement deferred |
| Evidence Record | `evidence_records` | Evidence Metadata | Basic | Metadata only; binary in blob storage |
| Audit Trail Record | `audit_trail_records` | Audit | Basic — limited scope | Append-only; INSERT only permission |
| Methodology Version | `methodology_versions` | Governance | Core | Referenced by all scoring outputs |
| Methodology Parameters | `methodology_parameters` | Governance | Core | Versioned coefficient and weight store |
| Confidence Score | `confidence_scores` | Analytics | Core | Exists at event, source, pillar, index, and report levels |
| Report | `reports` | Governance | Core | Pre-computed; stored after approved batch |
| Report Sections | `report_sections` | Governance | Core | Structured content blocks within each report |
| Advisor Review | `advisor_reviews` | Governance | Not applicable in Foundation Light | Schema present; external reference model |
| User | `users` | Governance | Core | KORA and company users |
| Role | `roles` | Governance | Core | Named access tiers |
| Permission | `permissions` | Governance | Core | Atomic permission grants |
| User-Role Assignment | `user_roles` | Governance | Core | Many-to-many junction |

---

## 4. Table Definitions — Foundation Light v0.1

The following sections define each table in detail. For each table:

- **Purpose** states why the table exists in the KORA data model.
- **Key fields** lists the essential columns with conceptual type and constraints.
- **Privacy sensitivity** classifies the table's overall data sensitivity.
- **Relationships** describes foreign keys and cross-store references conceptually.
- **Versioning** indicates whether the table's records are versioned.
- **Audit trigger** specifies what operations write to `audit_trail_records`.
- **Foundation Light notes** state what is active at v0.1.
- **Future expansion** flags what will be added in later tiers.

Field types are expressed conceptually. Exact SQL types are implementation decisions for the CTO to determine based on the selected database engine, ORM, and migration framework.

---

## 5. Identity Store Tables

### `worker_identity_records`

**Purpose:** Receives and holds the minimal identifiable data KORA touches during ingestion — the bridge between a company's employee identifier and KORA's internal pseudonym. This table must be pseudonymized-then-discarded as much as possible: identifiable fields should be deleted or nullified as soon as the pseudonym mapping is established and the worker's data subject rights requirements are handled.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | KORA internal identifier for this identity record |
| `company_id` | UUID | Yes | Reference to `companies` (Governance Store) — passed by value at creation, not as a live FK across stores |
| `company_worker_reference` | text | Yes | The company's employee identifier (e.g., employee number, email hash) — the identifiable element |
| `pseudonymized_worker_id` | UUID | Yes | The KORA pseudonym assigned to this worker; used in Analytics Store |
| `ingestion_batch_id` | UUID | Yes | Which ingestion batch introduced this identity record |
| `key_reference_id` | UUID | Yes | Reference to `pseudonymization_key_references` — which company key was used |
| `status` | enum | Yes | active / deleted / exported |
| `data_subject_request_status` | enum | Nullable | none / deletion_requested / deletion_complete / export_requested / export_complete |
| `created_at` | timestamp | Yes | When this record was created |
| `pseudonymized_at` | timestamp | Yes | When the pseudonym was generated and the identifiable data was processed |
| `deleted_at` | timestamp | Nullable | Set when a data subject deletion request is fulfilled |
| `notes` | text | Nullable | Internal notes for data subject rights processing — not exposed externally |

**Privacy sensitivity:** Highest. This is the only table in the entire KORA system that contains identifiable personal data.

**Relationships:** `company_id` is stored as a value copy from the Governance Store at creation time. There is no live foreign key constraint across stores — cross-store referential integrity is the application's responsibility, not the database engine's.

**Versioning:** Records are not versioned. Deletion requests result in nullification of `company_worker_reference` and status set to `deleted`. The audit log in the Audit Store records the deletion event.

**Audit trigger:** All writes (INSERT, status changes, deletion completions) produce an Audit Store record. Access events (who accessed this record, when) are also audited.

**Foundation Light notes:** Populated during ingestion. The pseudonymization service reads from this table to assign `pseudonymized_worker_id`. After assignment, `company_worker_reference` should be cryptographically hashed or deleted unless data subject rights requirements mandate retention.

**Future expansion:** In Governance tier, a full data subject rights workflow UI will manage requests, timelines, and evidence of fulfillment directly against this table.

---

### `pseudonymization_key_references`

**Purpose:** Stores metadata about the per-company pseudonymization keys used by KORA's internal privacy service. The actual cryptographic key material is never stored in the application database — it is held in a dedicated secrets management service. This table holds only references and operational metadata.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | KORA internal identifier |
| `company_id` | UUID | Yes | The company whose data this key protects |
| `key_reference` | text | Yes | External reference identifier in the secrets management service (e.g., a key ID in the key management store) — not the key material |
| `key_status` | enum | Yes | active / rotated / revoked |
| `algorithm` | text | Yes | Pseudonymization algorithm used (e.g., HMAC-SHA256); stored for future compatibility |
| `created_at` | timestamp | Yes | When this key reference was created |
| `rotated_at` | timestamp | Nullable | When this key was last rotated |
| `revoked_at` | timestamp | Nullable | Set if the key is revoked |
| `last_used_at` | timestamp | Nullable | Updated each time the key is used; supports usage auditing |
| `audit_reference` | UUID | Nullable | Reference to the Audit Store record covering this key's creation event |

**Privacy sensitivity:** Highest. Key references must be treated as sensitive infrastructure data.

**Critical constraint:** The `key_reference` field contains an opaque external identifier, not a key value. The secrets management service is the authoritative store for key material. This table is a directory, not a vault.

**Audit trigger:** All changes to `key_status`, `rotated_at`, and `last_used_at` produce Audit Store records. Key usage events (which pseudonymization operation used which key) are logged to the Audit Store by the privacy service.

**Foundation Light notes:** One row per company from the moment of company creation. The privacy service must validate that a company has an active key reference before any ingestion begins.

**Future expansion:** Key rotation workflows, split-key options for enterprise customers, and key escrow management are later-tier capabilities. The schema supports them through the `rotated_at` and `key_status` fields.

---

## 6. Core Company Tables

### `companies`

**Purpose:** The root entity of KORA. Every other entity in the Governance Store and the Analytics Store is scoped to a company. The company is the buyer, the governance subject, and the unit of commercial relationship.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `legal_name` | text | Yes | The company's legal registered name |
| `display_name` | text | Yes | Name used in the KORA platform interface |
| `country_primary` | ISO 3166-1 alpha-2 | Yes | Primary jurisdiction; governs default fiscal perimeter seeding |
| `operating_countries` | text array | Nullable | Additional countries where this company operates |
| `sector` | text | Nullable | Industry classification |
| `headcount_band` | enum | Yes | 1–50 / 51–200 / 201–500 / 501–2000 / 2001+ |
| `size_category` | enum | Yes | sme / mid_market / large / enterprise |
| `program_maturity` | enum | Yes | first_year / established / multi_year |
| `active_tier` | enum | Yes | foundation_light / foundation / governance / certified |
| `safe_aggregation_threshold` | integer | Yes | Default: 10; configurable with legal counsel approval |
| `reporting_period_type` | enum | Yes | calendar_year / fiscal_year / custom |
| `dpa_status` | enum | Yes | pending / signed / expired |
| `dpa_signed_at` | timestamp | Nullable | Date DPA was signed |
| `status` | enum | Yes | active / suspended / offboarded |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Privacy sensitivity:** Low at this entity level. The company is an organization, not an individual.

**Relationships:** Parent of `company_programs`, `data_sources`, `financial_budgets`, `users` (company-side), `workforce_segments`, `fiscal_budget_perimeters` (company-configured).

**Versioning:** Not versioned. Configuration changes are captured in the Audit Store.

**Audit trigger:** All field changes to `active_tier`, `safe_aggregation_threshold`, `dpa_status`, and `status` produce Audit Store records.

**Foundation Light notes:** `dpa_status` must be `signed` before any ingestion is permitted. This constraint must be enforced at the application layer.

**Future expansion:** Multi-country program scope, custom reporting calendars, enterprise-tier SLA fields.

---

### `company_programs`

**Purpose:** Defines the analytical scope of a KORA engagement — the specific period, worker population, budget categories, and measurement objectives for which KORA will produce intelligence.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_id` | UUID | Yes | FK → `companies` |
| `name` | text | Yes | Human-readable program name |
| `description` | text | Nullable | |
| `period_start` | date | Yes | Start of the reporting period |
| `period_end` | date | Yes | End of the reporting period |
| `target_worker_scope` | text | Nullable | Description of eligible worker population |
| `included_fiscal_perimeter_ids` | UUID array | Nullable | Which fiscal perimeters are active for this program |
| `target_pillars` | text array | Nullable | Optional pillar prioritization for this program |
| `reporting_objectives` | text array | Nullable | board_pack / esg_report / hr_internal / investor_comms |
| `status` | enum | Yes | draft / active / completed / archived |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions`; version in effect when program was configured |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Privacy sensitivity:** Low.

**Relationships:** Parent of `data_sources`, `ingestion_batches`, `anonymized_worker_profiles`, `financial_budgets`, `kora_indices`, `reports`.

**Audit trigger:** Status changes and methodology version changes produce Audit Store records.

**Foundation Light notes:** One program per company at Foundation Light is typical. The schema supports multiple programs per company from day one.

---

### `workforce_segments`

**Purpose:** Pre-defined, privacy-audited groupings of Anonymized Worker Profiles used to produce segment-level workforce intelligence. A segment only appears in employer-facing outputs if its member count meets the safe aggregation threshold.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | FK → `company_programs` |
| `segment_type` | enum | Yes | department / site / job_family / seniority_band / contract_type / country / cohort |
| `segment_label` | text | Yes | Human-readable label (e.g., "Engineering", "Milan Office") |
| `member_count` | integer | Yes | Current count of anonymized worker profiles in this segment |
| `is_displayable` | boolean | Yes | Computed: member_count ≥ company safe_aggregation_threshold |
| `privacy_sensitivity_override` | enum | Nullable | If this segment requires a higher threshold than the default |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Privacy sensitivity:** Medium. Segment labels must not be configured in a way that enables re-identification (e.g., "Simone's team" for a team of 3).

**Relationships:** Referenced by `anonymized_worker_profiles` and used as a grouping dimension in reporting queries.

**Foundation Light notes:** Basic segment support in Foundation Light — department and perhaps site. Full segment taxonomy enabled in Foundation and Governance tiers.

**Audit trigger:** Changes to `privacy_sensitivity_override` and `is_displayable` produce Audit Store records.

---

## 7. Data Ingestion Tables

### `data_sources`

**Purpose:** Describes the origin system or file type from which a company provides data to KORA. The Data Source entity defines the provenance, verification level, and refresh frequency of each input stream — directly affecting Impact Confidence for events ingested from it.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | FK → `company_programs` |
| `source_type` | enum | Yes | hris / welfare_platform / lms / esg_spreadsheet / wellbeing_provider / partner_export / internal_file / manual_log |
| `source_name` | text | Yes | Specific system or provider name |
| `owner_team` | text | Nullable | Which team at the company manages this source |
| `intrinsic_verification_level` | enum | Yes | self_declared / internal_record / external_provider / kora_partner / kora_certified_partner / external_certification |
| `data_quality_baseline` | enum | Nullable | low / medium / high — assessed at ingestion |
| `sensitivity_level` | enum | Yes | low / medium / high — does this source typically carry high-sensitivity data? |
| `ingestion_method` | enum | Yes | flat_file_upload / scheduled_export |
| `refresh_frequency` | enum | Yes | one_time / annual / quarterly / monthly |
| `status` | enum | Yes | active / inactive |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Privacy sensitivity:** Low at entity level; high where `sensitivity_level` = high.

**Relationships:** Referenced by `raw_datasets` and used to assign `intrinsic_verification_level` to events processed from this source.

**Foundation Light notes:** All ingestion in Foundation Light is `flat_file_upload`, `one_time` or `annual`. API-based real-time sources are a future capability.

---

### `raw_datasets`

**Purpose:** The immutable record of the actual data received from a data source before any KORA transformation. Raw datasets are preserved for audit purposes and to enable re-processing if methodology versions change or errors are found.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `data_source_id` | UUID | Yes | FK → `data_sources` |
| `company_program_id` | UUID | Yes | FK → `company_programs` |
| `received_at` | timestamp | Yes | When the file was submitted |
| `format` | enum | Yes | csv / xlsx / json / xml / pdf_extract |
| `reporting_period_start` | date | Yes | The period the data covers |
| `reporting_period_end` | date | Yes | The period the data covers |
| `row_count_raw` | integer | Yes | Total rows in the received file |
| `file_checksum` | text | Yes | SHA-256 hash of the received file; used for integrity verification |
| `blob_reference` | text | Yes | Pointer to the raw file in KORA-controlled blob storage |
| `status` | enum | Yes | received / attached_to_batch / archived / failed |
| `notes` | text | Nullable | |
| `created_at` | timestamp | Yes | |

**Privacy sensitivity:** Varies. Raw datasets may contain identifiable employee data before processing. Access must be restricted to the ingestion pipeline and KORA admin roles only — never to employer roles.

**Relationships:** One or more `raw_datasets` are grouped into an `ingestion_batches` record.

**Versioning:** Immutable after creation. The file integrity is verified via `file_checksum` at any subsequent re-processing.

**Audit trigger:** Creation and status changes produce Audit Store records.

---

### `ingestion_batches`

**Purpose:** Tracks a specific import operation that processes one or more raw datasets for a company program and period. The Ingestion Batch is the central workflow entity for the asynchronous, manual-review ingestion pipeline approved in the Founder Technical Decisions.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | FK → `company_programs` |
| `raw_dataset_ids` | UUID array | Yes | Which raw datasets are included in this batch |
| `status` | enum | Yes | submitted / under_review / approved / processing / complete / error |
| `submitted_at` | timestamp | Yes | |
| `review_started_at` | timestamp | Nullable | Set when a KORA analyst opens the batch for review |
| `reviewer_user_id` | UUID | Nullable | FK → `users`; the KORA analyst performing review |
| `approved_at` | timestamp | Nullable | Set when the batch is approved for processing |
| `approved_by_user_id` | UUID | Nullable | FK → `users` |
| `processing_started_at` | timestamp | Nullable | |
| `completed_at` | timestamp | Nullable | |
| `rows_total` | integer | Nullable | Total rows submitted |
| `rows_accepted` | integer | Nullable | Rows that produced UEF Records |
| `rows_rejected` | integer | Nullable | Rows excluded with reason codes |
| `rows_flagged` | integer | Nullable | Rows accepted but flagged for review |
| `uef_records_generated` | integer | Nullable | Count of UEF Records produced |
| `column_mapping_confidence` | enum | Nullable | high / medium / low — how reliably did KORA map columns to UEF fields |
| `duplicate_records_detected` | integer | Nullable | |
| `data_quality_score` | decimal | Nullable | 0.0–1.0; computed for this batch |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions`; version in effect at ingestion |
| `notes` | text | Nullable | Reviewer notes |
| `error_message` | text | Nullable | Set if status = error |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Privacy sensitivity:** Medium. Contains row count and quality data about the company's workforce data submission. Does not contain identifiable employee records.

**Relationships:** Referenced by `uef_records`, `pib_records`, `kora_indices`, `reports`.

**Versioning:** Status lifecycle is the versioning mechanism. Every status transition is audited.

**Audit trigger:** Every status change (especially the transition to `approved`) produces an Audit Store record with the approver's user ID and timestamp.

**Foundation Light notes:** Manual review is mandatory before scoring. No batch may transition from `under_review` to `approved` without a `reviewer_user_id` and `approved_by_user_id`.

---

### `ingestion_batch_warnings`

**Purpose:** Per-batch warning flags generated during ingestion review — fields with high absence rates, potential duplicate patterns, mismatched date ranges, or other data quality signals that the reviewer should assess before approving.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `ingestion_batch_id` | UUID | Yes | FK → `ingestion_batches` |
| `warning_type` | enum | Yes | missing_field / high_null_rate / duplicate_pattern / date_anomaly / pillar_mapping_ambiguity / sensitivity_flag / volume_spike |
| `affected_field` | text | Nullable | Which UEF field or data column triggered this warning |
| `severity` | enum | Yes | informational / moderate / critical |
| `description` | text | Yes | Human-readable explanation of the warning |
| `reviewer_acknowledged` | boolean | Yes | Default: false; set to true when reviewer has noted the warning |
| `reviewer_notes` | text | Nullable | |
| `created_at` | timestamp | Yes | |

---

### `ingestion_rejected_rows`

**Purpose:** Row-level rejection log for each ingestion batch. Records which raw data rows were excluded and why.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `ingestion_batch_id` | UUID | Yes | FK → `ingestion_batches` |
| `raw_dataset_id` | UUID | Yes | FK → `raw_datasets` |
| `row_index` | integer | Yes | Row number in the source file |
| `rejection_reason` | enum | Yes | missing_required_field / duplicate / out_of_period / unparseable / invalid_value / privacy_violation / pillar_unmappable |
| `rejection_detail` | text | Nullable | Additional detail on the rejection reason |
| `created_at` | timestamp | Yes | |

**Privacy sensitivity:** Low. Row index and rejection reason only — no identifiable data.

---

## 8. UEF and Event Processing Tables

### `uef_records`

**Purpose:** The normalized, canonical representation of every KORA Action after ingestion and processing. Every event that enters KORA's analytics engine does so as a UEF Record. This is the most important single table in the Analytics Store.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | |
| `anonymized_worker_profile_id` | UUID | Nullable | FK → `anonymized_worker_profiles`; null for group/aggregate events |
| `workforce_segment_id` | UUID | Nullable | FK → `workforce_segments`; only if above threshold and privacy-safe |
| `ingestion_batch_id` | UUID | Yes | FK → `ingestion_batches` |
| `data_source_id` | UUID | Yes | FK → `data_sources` |
| `event_type` | text | Yes | KORA event taxonomy code |
| `event_date` | date | Yes | Date or start date of the event |
| `event_period_end` | date | Nullable | For multi-day events or programs |
| `duration_normalized` | decimal | Nullable | Hours or sessions, normalized to KORA's standard unit |
| `magnitude_raw` | decimal | Nullable | Original magnitude value before normalization |
| `continuity_flag` | enum | Yes | one_time / recurring / structured_program |
| `action_type` | enum | Yes | individual / group / company_wide |
| `primary_pillar_id` | UUID | Nullable | Set after pillar mapping; FK → `pillars` |
| `content_quality` | decimal | Nullable | 0.0–1.0; assigned at processing |
| `evidence_level` | enum | Nullable | none / minimal / moderate / strong / certified |
| `verification_level` | enum | Nullable | self_declared / internal / external / kora_partner / kora_certified / external_certification |
| `impact_confidence` | decimal | Nullable | 0.0–1.0; overall reliability of this event as impact evidence |
| `privacy_sensitivity` | enum | Yes | low / medium / high |
| `financial_budget_id` | UUID | Nullable | FK → `financial_budgets`; if spend data is linked |
| `fiscal_perimeter_id` | UUID | Nullable | FK → `fiscal_budget_perimeters` |
| `eligibility_status` | enum | Nullable | eligible / conditional / uncertain / excluded |
| `eligibility_confidence` | enum | Nullable | advisor_confirmed / kora_advisor_confirmed / partner_documented / partner_declared / kora_inferred / pending_review / outdated |
| `evidence_record_id` | UUID | Nullable | FK → `evidence_records` |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions`; non-nullable |
| `review_status` | enum | Yes | auto_processed / flagged / manually_reviewed |
| `review_notes` | text | Nullable | |
| `processing_status` | enum | Yes | pending / scored / error |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Privacy sensitivity:** High where `privacy_sensitivity` = high; medium otherwise. High-sensitivity records must not appear in any employer-facing query at individual level.

**Relationships:** Referenced by `pillar_mappings`, `impact_units`. References `anonymized_worker_profiles`, `ingestion_batches`, `data_sources`, `evidence_records`.

**Versioning:** `methodology_version_id` is the version reference. Historical records are immutable after processing; the methodology version that produced them is permanently attached.

**Audit trigger:** Status changes to `review_status` (especially manual review events) produce Audit Store records.

**Foundation Light notes:** `primary_pillar_id` is set by the pillar mapping process after the UEF Record is created. Processing from `pending` to `scored` requires the batch to be in `approved` status.

**Important index:** Compound index on `(company_program_id, primary_pillar_id, methodology_version_id)` for aggregate calculations. Index on `anonymized_worker_profile_id` for PIB aggregation. Index on `privacy_sensitivity` for access-filtered queries.

---

### `pillars`

**Purpose:** The five fixed KORA classification categories. A static reference table — five rows, never changed without a methodology version increment.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `code` | enum | Yes | LIFE / GROWTH / CONNECTION / IMPACT / LEGACY |
| `name` | text | Yes | Full pillar name |
| `definition` | text | Yes | Canonical definition from the Methodological Constitution |
| `privacy_sensitivity_note` | text | Nullable | Sensitivity considerations for this pillar (e.g., LIFE may carry high-sensitivity data) |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions`; which version defined this pillar |
| `created_at` | timestamp | Yes | |

**Foundation Light notes:** Seeded once at deployment with five rows aligned to Methodology v0.1. No employer can add or modify pillars.

---

### `pillar_mappings`

**Purpose:** The versioned classification record linking a UEF Record to its primary and optional secondary pillars. Stores the method and confidence of the assignment so that every pillar classification is explainable and auditable.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `uef_record_id` | UUID | Yes | FK → `uef_records` |
| `primary_pillar_id` | UUID | Yes | FK → `pillars` |
| `secondary_pillar_ids` | UUID array | Nullable | FK references to `pillars`; methodologically justified secondary assignments only |
| `mapping_confidence` | decimal | Yes | 0.0–1.0 |
| `mapping_method` | enum | Yes | taxonomy_rule / ai_suggested_confirmed / manually_assigned |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions` |
| `human_reviewed` | boolean | Yes | Default: false |
| `reviewer_user_id` | UUID | Nullable | FK → `users`; set if human_reviewed = true |
| `override_reason` | text | Nullable | Required if mapping_method = manually_assigned and a prior suggestion was overridden |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Audit trigger:** Any `manually_assigned` mapping event produces an Audit Store record with the reviewer, prior suggestion, new assignment, and reason.

---

## 9. Impact Engine Tables

### `impact_units`

**Purpose:** The core analytical output of the KORA scoring engine. Stores the complete calculation record for each Impact Unit — every formula component is stored individually so that the final value is fully reconstructible and auditable from the stored inputs.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `uef_record_id` | UUID | Yes | FK → `uef_records` |
| `pillar_id` | UUID | Yes | FK → `pillars`; which pillar this IU is credited to |
| `pillar_mapping_id` | UUID | Yes | FK → `pillar_mappings`; the specific mapping that produced this IU |
| `anonymized_worker_profile_id` | UUID | Nullable | FK → `anonymized_worker_profiles` |
| `company_program_id` | UUID | Yes | |
| `normalized_magnitude` | decimal | Yes | NM_e — normalized action size |
| `base_contribution` | decimal | Yes | BC_{e,p} — provisional base weight for this event type on this pillar |
| `content_quality` | decimal | Yes | CQ_e — quality multiplier |
| `evidence_verification_level` | decimal | Yes | EV_e — verification multiplier (0.40–1.00) |
| `continuity_factor` | decimal | Yes | CF_e — continuity multiplier |
| `anti_gaming_factor` | decimal | Yes | AGF_e — anti-gaming adjustment; 1.00 if no reduction applied |
| `durability_factor` | decimal | Yes | DF_e — LEGACY durability multiplier; 1.00 if not applicable |
| `externality_factor` | decimal | Yes | EXF_e — IMPACT externality multiplier; 1.00 if not applicable |
| `iu_value` | decimal | Yes | Final computed IU value |
| `impact_confidence` | decimal | Yes | Reliability of this IU as impact evidence |
| `anti_gaming_flags` | text array | Nullable | Which anti-gaming rules were triggered, if any |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions`; non-nullable |
| `status` | enum | Yes | auto_calculated / flagged_for_review / manually_adjusted |
| `adjustment_reason` | text | Nullable | Required if status = manually_adjusted |
| `created_at` | timestamp | Yes | |

**Privacy sensitivity:** Medium. Contains no identifiable data; pseudonymized worker ID only.

**Critical constraint:** `methodology_version_id` is non-nullable and enforced at the schema level.

**Audit trigger:** Any `manually_adjusted` event produces an Audit Store record with the adjustment reason and adjusting user.

**Foundation Light notes:** All formula components stored as individual fields enables: (1) complete recalculation audit, (2) formula-level explainability for each score, (3) future methodology comparison without re-running the engine.

**Important index:** Compound index on `(company_program_id, pillar_id, methodology_version_id)` for aggregate queries. Index on `anonymized_worker_profile_id` for PIB aggregation.

---

### `pib_records`

**Purpose:** The Personal Impact Balance — aggregated Impact Units per Anonymized Worker Profile per reference period, decomposed by pillar. An internal analytical layer that is never shown to employer-facing roles at individual level.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `anonymized_worker_profile_id` | UUID | Yes | FK → `anonymized_worker_profiles` |
| `company_program_id` | UUID | Yes | |
| `reference_period_start` | date | Yes | |
| `reference_period_end` | date | Yes | |
| `pib_life` | decimal | Yes | Total IU in LIFE pillar |
| `pib_growth` | decimal | Yes | Total IU in GROWTH pillar |
| `pib_connection` | decimal | Yes | Total IU in CONNECTION pillar |
| `pib_impact` | decimal | Yes | Total IU in IMPACT pillar |
| `pib_legacy` | decimal | Yes | Total IU in LEGACY pillar |
| `pib_total` | decimal | Yes | Sum of all five pillars |
| `activation_status` | enum | Yes | active / inactive — based on provisional activation threshold |
| `meaningful_activation` | boolean | Yes | Whether PIB meets the quality threshold for meaningful engagement |
| `continuity_flag` | boolean | Nullable | True if recurring engagement detected in this period |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions` |
| `ingestion_batch_id` | UUID | Yes | FK → `ingestion_batches`; which batch produced this PIB record |
| `computed_at` | timestamp | Yes | |

**Privacy sensitivity:** High. This is the individual-level impact record. Must never be exposed to employer roles.

**Access control:** No employer role may access this table directly or through a view. Only internal analytics processes and the KORA Admin role have access.

**Important index:** Index on `(company_program_id, reference_period_start, activation_status)` for workforce-level aggregate calculations.

---

### `company_impact_aggregates`

**Purpose:** The company-level aggregation of all Impact Units, decomposed by pillar, source type, and verification level. The analytical foundation from which KORA Index components are calculated.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | |
| `reference_period_start` | date | Yes | |
| `reference_period_end` | date | Yes | |
| `total_iu` | decimal | Yes | All IU in this period |
| `iu_life` | decimal | Yes | |
| `iu_growth` | decimal | Yes | |
| `iu_connection` | decimal | Yes | |
| `iu_impact` | decimal | Yes | |
| `iu_legacy` | decimal | Yes | |
| `iu_by_source_type` | JSONB | Nullable | IU decomposition by source type |
| `iu_by_verification_level` | JSONB | Nullable | IU decomposition by EV multiplier band |
| `iu_by_content_quality_band` | JSONB | Nullable | IU decomposition by CQ band |
| `iu_self_declared_share` | decimal | Nullable | Proportion of Total IU from self-declared sources |
| `iu_verified_share` | decimal | Nullable | Proportion from EV ≥ 0.70 sources |
| `total_eligible_workers` | integer | Yes | Denominator for activation rate |
| `active_workers` | integer | Yes | Workers meeting the activation threshold |
| `activation_rate` | decimal | Yes | active_workers / total_eligible_workers |
| `meaningful_activation_rate` | decimal | Nullable | Workers meeting the meaningful activation quality threshold |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions` |
| `ingestion_batch_id` | UUID | Yes | FK → `ingestion_batches` |
| `computed_at` | timestamp | Yes | |

---

## 10. Index and Indicator Tables

### `kora_indices`

**Purpose:** The primary company-level intelligence output — a calculated score from 0 to 100 representing the maturity and quality of the company's human impact program. Pre-computed after each approved Ingestion Batch. Never recalculated retroactively when methodology changes.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | |
| `reference_period_start` | date | Yes | |
| `reference_period_end` | date | Yes | |
| `kora_index_score` | decimal | Yes | Final score, 0.0–100.0 |
| `change_vs_prior_period` | decimal | Nullable | Delta vs prior period's kora_index_score |
| `confidence_score_id` | UUID | Yes | FK → `confidence_scores` |
| `explanation_summary` | text | Nullable | Plain-language breakdown of score drivers |
| `limitations_summary` | text | Nullable | Data gaps and caveats affecting this score |
| `data_quality_warnings` | text array | Nullable | |
| `status` | enum | Yes | provisional / final |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions`; non-nullable |
| `ingestion_batch_id` | UUID | Yes | FK → `ingestion_batches` |
| `computed_at` | timestamp | Yes | |

**Audit trigger:** Creation of every KORA Index record produces an Audit Store entry.

---

### `kora_index_components`

**Purpose:** One row per component per KORA Index record. Stores the individual scores, weights, and input data for each of the seven KORA Index components. Enables full explainability and component-level audit.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `kora_index_id` | UUID | Yes | FK → `kora_indices` |
| `component_code` | enum | Yes | activation_rate / normalized_intensity / pillar_balance / event_quality / verification_rate / continuity / pillar_coverage |
| `component_score` | decimal | Yes | Raw component score before weighting |
| `component_weight` | decimal | Yes | Weight applied in this methodology version |
| `weighted_contribution` | decimal | Yes | component_score × component_weight |
| `input_data_summary` | JSONB | Nullable | Key input values used in this component's calculation |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions` |

---

### `kora_contributions`

**Purpose:** Separate indicator for the company's verified social and external contribution. Not a KORA Index component — a parallel signal displayed alongside the Index.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | |
| `reference_period_start` | date | Yes | |
| `reference_period_end` | date | Yes | |
| `contribution_score` | decimal | Nullable | 0.0–100.0; null if insufficient IMPACT data |
| `component_scores` | JSONB | Nullable | Individual component scores |
| `confidence_score_id` | UUID | Nullable | FK → `confidence_scores` |
| `explanation_summary` | text | Nullable | |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions` |
| `ingestion_batch_id` | UUID | Yes | FK → `ingestion_batches` |
| `computed_at` | timestamp | Yes | |

---

### `kora_ecosystem_reach`

**Purpose:** Separate indicator for partner ecosystem quality and actual utilization. Not a KORA Index component.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | |
| `reference_period_start` | date | Yes | |
| `reference_period_end` | date | Yes | |
| `ecosystem_reach_score` | decimal | Nullable | 0.0–100.0; null if insufficient partner data |
| `component_scores` | JSONB | Nullable | |
| `confidence_score_id` | UUID | Nullable | FK → `confidence_scores` |
| `explanation_summary` | text | Nullable | |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions` |
| `ingestion_batch_id` | UUID | Yes | FK → `ingestion_batches` |
| `computed_at` | timestamp | Yes | |

---

### `confidence_scores`

**Purpose:** A reliability indicator for every KORA analytical output. Confidence Scores exist at multiple levels — event, source, pillar, index, and report — and tell users how much methodological trust to place in each output.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `score_level` | enum | Yes | event / source / pillar / kora_index / report |
| `referenced_entity_type` | text | Yes | Which table/entity this confidence score belongs to |
| `referenced_entity_id` | UUID | Yes | ID of the entity being assessed |
| `confidence_score` | decimal | Yes | 0.0–1.0 |
| `data_completeness` | decimal | Nullable | Proportion of required UEF fields populated |
| `source_reliability_mix` | decimal | Nullable | Proportion of IU from high-reliability sources |
| `verification_coverage` | decimal | Nullable | Proportion of IU from EV ≥ 0.70 sources |
| `manual_review_rate` | decimal | Nullable | Proportion of events requiring human review |
| `low_confidence_data_share` | decimal | Nullable | |
| `missing_fields_rate` | decimal | Nullable | |
| `below_threshold_suppression` | boolean | Nullable | Whether any segment data was suppressed |
| `eligibility_confidence_distribution` | JSONB | Nullable | Distribution of eligibility confidence levels, where relevant |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions` |
| `computed_at` | timestamp | Yes | |

---

## 11. Financial Governance Tables

### `financial_budgets`

**Purpose:** A defined pool of money allocated to fund people-program activities, categorized by fiscal/budget type. Financial Budgets are an INPUT-layer entity — they record what was available, not what was produced.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | FK → `company_programs` |
| `fiscal_perimeter_id` | UUID | Nullable | FK → `fiscal_budget_perimeters`; which fiscal framework governs this budget |
| `budget_category` | enum | Yes | welfare_aziendale / fringe_benefit / training_development / health_wellbeing / people_hr / esg_csr / non_tax_advantaged / custom |
| `custom_category_label` | text | Nullable | Required if budget_category = custom |
| `currency` | ISO 4217 | Yes | |
| `total_allocated_amount` | decimal | Yes | |
| `period_start` | date | Yes | |
| `period_end` | date | Yes | |
| `status` | enum | Yes | active / exhausted / closed |
| `notes` | text | Nullable | |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Critical constraint:** No field in `financial_budgets` may be used as an input to any Impact Unit calculation or KORA Index component formula.

---

### `financial_movements`

**Purpose:** Individual financial transactions or allocation events — invoices, reimbursements, partner payouts, initiative costs — that connect spending to budgets, perimeters, partners, and services. The building blocks of financial governance intelligence.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `financial_budget_id` | UUID | Yes | FK → `financial_budgets` |
| `fiscal_perimeter_id` | UUID | Nullable | FK → `fiscal_budget_perimeters` |
| `transaction_type` | enum | Yes | allocation / commitment / invoice / reimbursement / payout / internal_cost |
| `amount` | decimal | Yes | |
| `currency` | ISO 4217 | Yes | |
| `transaction_date` | date | Yes | |
| `partner_id` | UUID | Nullable | FK → `partners`; if this spend relates to a specific partner |
| `partner_service_id` | UUID | Nullable | FK → `partner_services` |
| `description` | text | Nullable | |
| `reporting_period_start` | date | Yes | |
| `reporting_period_end` | date | Yes | |
| `evidence_record_id` | UUID | Nullable | FK → `evidence_records`; invoice or approval document |
| `status` | enum | Yes | committed / confirmed / reconciled |
| `created_at` | timestamp | Yes | |

---

## 12. Fiscal & Policy Eligibility Tables

### `fiscal_budget_perimeters`

**Purpose:** The fiscal, regulatory, and policy framework that governs how a specific budget category can be used. Configurable by country and company. Italy is the only seeded taxonomy at Foundation Light launch, but the schema is designed for additional jurisdictions without structural change.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_id` | UUID | Nullable | If company-specific; null for global reference perimeters |
| `country_code` | ISO 3166-1 alpha-2 | Yes | Jurisdiction this perimeter applies to; 'IT' for Italy |
| `perimeter_type` | enum | Yes | welfare_aziendale / fringe_benefit / training_development / health_wellbeing / people_hr / esg_csr / non_tax_advantaged / custom |
| `perimeter_name` | text | Yes | Human-readable name |
| `regulatory_reference` | text | Nullable | Governing legislation (e.g., "TUIR Art. 51", "TUIR Art. 100") |
| `effective_from` | date | Yes | When this perimeter version became effective |
| `effective_to` | date | Nullable | When this version was superseded; null if current |
| `annual_threshold_per_employee` | decimal | Nullable | Maximum annual amount per employee where applicable |
| `threshold_currency` | ISO 4217 | Nullable | |
| `required_documentation_types` | text array | Nullable | Types of documentation required for eligible activations |
| `eligible_service_categories` | text array | Nullable | General categories of eligible services |
| `is_seeded_reference` | boolean | Yes | True for KORA-seeded Italian fiscal taxonomy; false for company-custom |
| `advisor_validation_reference` | UUID | Nullable | FK → `advisor_reviews`; if a legal advisor validated this perimeter configuration |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions`; taxonomy version in effect |
| `review_trigger_conditions` | text array | Nullable | Events that require re-review of this perimeter |
| `status` | enum | Yes | active / superseded / archived |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Foundation Light notes:** At launch, the Italian fiscal taxonomy is seeded as reference perimeters (`is_seeded_reference = true`). Companies activate specific perimeters for their program. Adding France or Germany means adding rows to this table with the relevant `country_code` — no schema change is required.

---

### `eligibility_profiles`

**Purpose:** The current fiscal/budget eligibility status of a specific Partner Service under a specific Fiscal/Budget Perimeter. This is the live view — the highest-confidence current classification for each service-perimeter combination.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `partner_service_id` | UUID | Yes | FK → `partner_services` |
| `fiscal_perimeter_id` | UUID | Yes | FK → `fiscal_budget_perimeters` |
| `current_eligibility_status` | enum | Yes | eligible / conditional / uncertain / excluded |
| `current_eligibility_confidence` | enum | Yes | advisor_confirmed / kora_advisor_confirmed / partner_documented / partner_declared / kora_inferred / pending_review / outdated_requires_review |
| `current_contribution_id` | UUID | Nullable | FK → `eligibility_contributions`; the contribution record that established the current status |
| `conditions` | text | Nullable | If status = conditional — what conditions must be met |
| `required_documentation` | text | Nullable | Documentation required for eligible activation |
| `outdated_at` | timestamp | Nullable | Set when a trigger event renders this classification potentially stale |
| `review_due_by` | date | Nullable | Set when a review is required by a specific deadline |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Critical constraint:** This table carries no foreign key into any Impact Unit or KORA Index table. Eligibility Profiles govern the fiscal compliance layer — they do not affect KORA Index scores.

---

### `eligibility_contributions`

**Purpose:** The versioned contribution log for every eligibility classification — who classified it, at what confidence, based on what evidence, and when. Every update to an Eligibility Profile creates a new row here rather than overwriting the prior state.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `eligibility_profile_id` | UUID | Yes | FK → `eligibility_profiles` |
| `contributed_by` | enum | Yes | kora / partner / advisor / company |
| `contributor_reference` | text | Nullable | Name or ID of the specific contributor |
| `eligibility_status` | enum | Yes | The status asserted by this contribution |
| `eligibility_confidence` | enum | Yes | The confidence level of this contribution |
| `conditions` | text | Nullable | |
| `evidence_record_id` | UUID | Nullable | FK → `evidence_records`; supporting documentation |
| `advisor_review_id` | UUID | Nullable | FK → `advisor_reviews`; if this contribution was made via a formal review |
| `fiscal_regulation_version` | text | Nullable | The regulatory version this classification is based on (e.g., "Italian Budget Law 2024") |
| `valid_from` | date | Yes | |
| `valid_to` | date | Nullable | When this contribution was superseded |
| `superseded_by_id` | UUID | Nullable | FK → `eligibility_contributions`; the contribution that replaced this one |
| `created_at` | timestamp | Yes | |

**Foundation Light notes:** In Foundation Light, all contributions are `contributed_by = kora` (KORA analysts manage the catalog). The `contributed_by` field is designed to support `partner` and `advisor` contributions in later tiers without schema change.

---

### `policy_rules`

**Purpose:** Company-specific constraints governing how a fiscal/budget perimeter, service, or budget can be used within the company's program. Schema present in Foundation Light; enforcement deferred to Governance tier.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | FK → `company_programs` |
| `fiscal_perimeter_id` | UUID | Nullable | FK → `fiscal_budget_perimeters`; if perimeter-specific |
| `rule_type` | enum | Yes | spending_cap / eligible_worker_category / approved_provider / minimum_tenure / documentation_requirement / co_payment / approval_workflow / reporting_obligation / exclusion_rule / territory_constraint |
| `rule_definition` | text | Yes | The specific constraint in plain language |
| `eligible_worker_scope` | text | Nullable | Which worker categories this rule applies to |
| `effective_from` | date | Yes | |
| `effective_to` | date | Nullable | |
| `author_user_id` | UUID | Yes | FK → `users`; who configured this rule |
| `advisor_validation_reference` | UUID | Nullable | FK → `advisor_reviews` |
| `status` | enum | Yes | active / suspended / expired |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions`; version in effect when rule was created |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Audit trigger:** All changes to `rule_definition`, `status`, `effective_to` produce Audit Store records.

---

## 13. Partner Tables

### `partners`

**Purpose:** External providers, organizations, or service operators that deliver services potentially generating KORA Actions. A Partner entity represents input-layer resources — only verified worker usage generates Impact Units.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `name` | text | Yes | |
| `description` | text | Nullable | |
| `service_categories` | text array | Nullable | General categories of services offered |
| `primary_pillar_codes` | enum array | Nullable | LIFE / GROWTH / CONNECTION / IMPACT / LEGACY |
| `operating_countries` | ISO 3166-1 array | Yes | |
| `kora_certification_status` | enum | Yes | not_certified / kora_partner / kora_certified_partner |
| `verification_capability` | enum | Yes | none / internal_record / external_provider / kora_certified |
| `data_export_capability` | enum | Yes | none / manual_export / scheduled_export |
| `privacy_compliance_status` | enum | Yes | unverified / verified / certified |
| `overall_confidence_profile` | enum | Nullable | low / medium / high — derived from eligibility and data quality history |
| `status` | enum | Yes | active / inactive / suspended |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

---

### `partner_services`

**Purpose:** A specific offering provided by a Partner. Partner Services carry the detailed information KORA needs for pillar mapping, eligibility assessment, verification level assignment, and privacy handling.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `partner_id` | UUID | Yes | FK → `partners` |
| `name` | text | Yes | |
| `description` | text | Nullable | |
| `primary_pillar_codes` | enum array | Yes | |
| `action_type` | enum | Yes | one_time_event / recurring_enrollment / structured_program |
| `typical_duration_normalized` | decimal | Nullable | In KORA standard units |
| `verification_level_assigned` | enum | Yes | Verification level KORA assigns to confirmed usage |
| `privacy_sensitivity` | enum | Yes | low / medium / high |
| `operating_countries` | ISO 3166-1 array | Yes | |
| `last_eligibility_review_date` | date | Nullable | |
| `review_trigger_conditions` | text array | Nullable | |
| `status` | enum | Yes | active / inactive |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

---

## 14. Evidence Store Metadata Tables

### `evidence_records`

**Purpose:** The metadata catalogue for all evidence documents stored in KORA-controlled blob storage. This table holds what the document is, who issued it, what it supports, and where it lives — but not the document itself.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `evidence_type` | enum | Yes | attendance_certificate / completion_certificate / invoice / provider_confirmation / advisor_validation / compliance_document / signed_declaration / photo_record |
| `referenced_entity_type` | text | Yes | Which table type this evidence supports (uef_records / eligibility_profiles / financial_movements / advisor_reviews) |
| `referenced_entity_id` | UUID | Yes | The specific entity ID this evidence supports |
| `company_program_id` | UUID | Yes | Scoping reference for access control |
| `blob_reference` | text | Yes | Opaque identifier in KORA-controlled blob storage; used by the evidence service to generate signed access URLs |
| `blob_storage_bucket` | text | Yes | Which bucket in blob storage (may differ by sensitivity level) |
| `file_checksum` | text | Yes | SHA-256 hash of the stored document for integrity verification |
| `issuer_name` | text | Nullable | Name of the issuing organization or individual |
| `issued_at` | date | Nullable | |
| `valid_from` | date | Nullable | When the evidence becomes valid |
| `valid_to` | date | Nullable | When the evidence expires; null if no expiry |
| `verification_level_supported` | enum | Nullable | The verification level this evidence supports if confirmed |
| `privacy_sensitivity` | enum | Yes | low / medium / high — high documents stored in restricted bucket |
| `status` | enum | Yes | valid / expired / superseded / disputed |
| `uploaded_by_user_id` | UUID | Yes | FK → `users` |
| `uploaded_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Access control:** Blob storage access URLs are generated by the KORA evidence service, not retrieved directly from this table. No employer role may generate access URLs for high-sensitivity documents. The evidence service enforces role-based URL generation.

**Audit trigger:** All uploads, status changes, and access URL generation events produce Audit Store records.

---

## 15. Report Tables

### `reports`

**Purpose:** Pre-computed, stored output packages produced by KORA for a specific audience and purpose. Reports are generated after each Ingestion Batch reaches Complete status. Once stored, a Report is the permanent, auditable record of what KORA showed to the company at a specific point in time.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | FK → `company_programs` |
| `report_type` | enum | Yes | foundation_light_impact_report / data_quality_assessment / executive_summary / hr_report / esg_appendix / board_pack |
| `reference_period_start` | date | Yes | |
| `reference_period_end` | date | Yes | |
| `audience` | enum | Yes | internal_leadership / board / investor / esg_reviewer |
| `ingestion_batch_id` | UUID | Yes | FK → `ingestion_batches`; which batch produced this report |
| `kora_index_id` | UUID | Nullable | FK → `kora_indices` |
| `confidence_score_id` | UUID | Nullable | FK → `confidence_scores` |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions`; non-nullable |
| `data_limitations_summary` | text | Nullable | Data gaps affecting this report |
| `data_quality_warnings` | text array | Nullable | |
| `export_format` | enum | Yes | pdf / web / structured_data |
| `blob_reference` | text | Nullable | If the report is a generated PDF in blob storage |
| `status` | enum | Yes | generating / draft / final |
| `generated_at` | timestamp | Yes | |
| `finalized_at` | timestamp | Nullable | |

**Critical constraint:** Reports are never regenerated automatically when methodology changes. The `methodology_version_id` is set at report generation and must not be updated.

**Audit trigger:** Report generation and finalization events produce Audit Store records.

---

### `report_sections`

**Purpose:** Structured content blocks within each report — individual sections that carry specific intelligence outputs.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `report_id` | UUID | Yes | FK → `reports` |
| `section_type` | enum | Yes | kora_index_summary / pillar_balance / activation_analysis / data_quality / financial_governance / eligibility_distribution / recommendations |
| `section_order` | integer | Yes | Display order within the report |
| `content` | JSONB | Yes | Structured content of this section |
| `referenced_entity_ids` | UUID array | Nullable | Which analytical entities contributed to this section |
| `created_at` | timestamp | Yes | |

---

## 16. Advisor Review Tables

### `advisor_reviews`

**Purpose:** A formal record of a qualified human reviewing a KORA output, classification, or eligibility determination. In Foundation Light v0.1, advisors are external references — not KORA users. The schema supports future KORA advisor accounts without structural change.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_program_id` | UUID | Yes | FK → `company_programs` |
| `review_type` | enum | Yes | methodology / eligibility / partner_validation / certified_assessment / event_mapping / evidence_review |
| `reviewed_entity_type` | text | Yes | Which entity type was reviewed |
| `reviewed_entity_id` | UUID | Yes | ID of the specific entity reviewed |
| `reviewer_name` | text | Yes | Full name of the reviewing advisor — mandatory |
| `reviewer_title` | text | Yes | Professional title or role — mandatory |
| `reviewer_organization` | text | Yes | Organization or firm — mandatory |
| `reviewer_authorization_type` | enum | Yes | company_advisor / kora_authorized_advisor / external_certification_body |
| `reviewer_user_id` | UUID | Nullable | FK → `users`; null in Foundation Light (external reference); used in later tiers |
| `review_outcome` | enum | Yes | confirmed / modified / rejected / pending |
| `review_notes` | text | Nullable | |
| `evidence_record_id` | UUID | Nullable | FK → `evidence_records`; the advisor's written opinion or validation document |
| `reviewed_at` | date | Yes | Date review was performed |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions` |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

**Foundation Light notes:** `reviewer_user_id` is null for all Foundation Light reviews. The reviewer's identity is captured in `reviewer_name`, `reviewer_title`, and `reviewer_organization`. A written opinion is uploaded as an Evidence Record and linked via `evidence_record_id`. This approach provides stronger legal weight than a platform interaction at this stage.

**Audit trigger:** All `review_outcome` changes produce Audit Store records.

---

## 17. User, Role, and Permission Tables

### `users`

**Purpose:** All individuals with access to the KORA platform — KORA staff, company-side stakeholders.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `company_id` | UUID | Nullable | FK → `companies`; null for KORA internal users |
| `email` | text | Yes | Unique; used for authentication |
| `full_name` | text | Yes | |
| `user_type` | enum | Yes | kora_internal / company_user |
| `status` | enum | Yes | active / suspended / offboarded |
| `last_login_at` | timestamp | Nullable | |
| `created_at` | timestamp | Yes | |
| `updated_at` | timestamp | Yes | |

---

### `roles`

**Purpose:** Named access tiers with defined permission sets.

**Defined roles for Foundation Light v0.1:**

| Role Code | Who it is | Access summary |
|---|---|---|
| `kora_admin` | KORA platform administrators | Full system access across all stores |
| `kora_analyst` | KORA delivery and ingestion team | Governance Store, ingestion review, report generation |
| `kora_privacy_admin` | Dedicated privacy administrator | Identity Store access for data subject rights; no analytical role |
| `company_admin` | Company account owner | Company configuration, program setup, user management |
| `company_hr_viewer` | Company HR team | Aggregated workforce intelligence, reports; no identity access |
| `company_finance_viewer` | Company finance team | Financial governance layer; no impact or identity access |
| `company_esg_viewer` | Company ESG/sustainability team | KORA Index, KORA Contribution, ESG report exports |
| `company_exec_viewer` | Executive read-only | Dashboard and report viewing; no configuration |

**Key fields of `roles`:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `code` | text | Yes | Unique role code as listed above |
| `name` | text | Yes | Human-readable role name |
| `description` | text | Nullable | |
| `store_access` | text array | Yes | Which logical stores this role can access |
| `created_at` | timestamp | Yes | |

---

### `permissions`

**Purpose:** Atomic capability grants that can be assigned to roles. Permissions are the building blocks of the RBAC model.

**Example permissions for Foundation Light:**

| Permission Code | Description |
|---|---|
| `read_kora_index` | View KORA Index scores and components |
| `read_workforce_intelligence` | View aggregated workforce analytics |
| `read_financial_governance` | View budget and spend analytics |
| `read_reports` | Download and view reports |
| `manage_ingestion` | Submit and review ingestion batches |
| `approve_ingestion` | Approve ingestion batches for processing |
| `manage_company_config` | Configure company, program, and fiscal perimeters |
| `access_identity_store` | Identity Store access — privacy administrator only |
| `access_audit_trail` | Read audit trail records — KORA admin only |

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `code` | text | Yes | Unique permission code |
| `description` | text | Yes | |
| `store_scope` | enum | Yes | Which store this permission governs |

---

### `user_roles`

**Purpose:** Many-to-many junction table assigning roles to users, scoped to a company where applicable.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `user_id` | UUID | Yes | FK → `users` |
| `role_id` | UUID | Yes | FK → `roles` |
| `company_id` | UUID | Nullable | FK → `companies`; scopes the role assignment to a specific company |
| `assigned_by_user_id` | UUID | Yes | FK → `users`; who made this assignment |
| `assigned_at` | timestamp | Yes | |
| `revoked_at` | timestamp | Nullable | |

**Access control rule:** No user with a `company_*` role code may have a `company_id` value that differs from the company they work for. Cross-company role assignments for company users are not permitted.

**Audit trigger:** All `user_roles` assignments and revocations produce Audit Store records.

---

## 18. Audit Trail Tables

### `audit_trail_records`

**Purpose:** The permanent, append-only log of every significant event in KORA — data changes, configuration changes, score calculations, human overrides, access events, and export operations. The primary mechanism of KORA's audit defensibility in Foundation Light v0.1.

**Immutability mechanism:** The application database role that writes to this table has INSERT permission only. UPDATE and DELETE permissions are not granted. This is enforced at the database permission level, not only in application code.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `event_type` | enum | Yes | data_created / data_changed / data_deleted / configuration_changed / override_applied / eligibility_updated / policy_rule_modified / score_calculated / ingestion_approved / ingestion_rejected / access_event / review_completed / export_generated / data_subject_rights_event / key_used |
| `affected_entity_type` | text | Yes | Table name of the entity affected |
| `affected_entity_id` | UUID | Yes | ID of the entity affected |
| `previous_value_summary` | text | Nullable | Human-readable summary of the prior state; not a full copy of the record |
| `new_value_summary` | text | Nullable | Human-readable summary of the new state |
| `changed_by_user_id` | UUID | Nullable | FK → `users`; null for system-generated events |
| `changed_by_system_process` | text | Nullable | Name of the system process if not user-initiated |
| `timestamp` | timestamp | Yes | UTC timestamp; indexed |
| `reason` | text | Nullable | Required for all human-initiated changes that override or modify automated outputs |
| `methodology_version_id` | UUID | Nullable | FK → `methodology_versions`; set for all scoring and classification events |
| `evidence_record_id` | UUID | Nullable | FK → `evidence_records`; if the change was supported by documentation |
| `company_id` | UUID | Nullable | Scoping reference; set for all company-scoped events |
| `store_name` | enum | Yes | identity / analytics / governance / evidence / audit — which store the event occurred in |

**Critical note on `previous_value_summary` and `new_value_summary`:** These fields store human-readable summaries, not full JSON copies of records. The full record state is in the operational tables. The audit trail records what changed and why — not a full data snapshot. For compliance contexts requiring full snapshots, a separate point-in-time export must be designed.

**Important index:** Index on `timestamp`, `affected_entity_type`, `affected_entity_id`, and `company_id` for audit queries.

**Foundation Light notes:** Application-level INSERT-only permission is the v0.1 immutability mechanism. This is documented transparently — not claimed as cryptographic or write-once immutability. The near-term upgrade path (Foundation tier) is periodic export to a read-only archive.

---

## 19. Methodology Version Tables

### `methodology_versions`

**Purpose:** A versioned snapshot of the complete KORA methodological logic — the source of truth that every scoring output references. Historical scores remain permanently interpretable because their version reference never changes.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `version_identifier` | text | Yes | e.g., "v0.1", "v0.2", "v1.0"; unique |
| `version_label` | text | Yes | Human-readable label (e.g., "v0.1 — Pre-Calibration") |
| `status` | enum | Yes | draft / active / superseded / archived |
| `effective_from` | date | Yes | |
| `effective_to` | date | Nullable | Set when superseded |
| `change_log` | text | Nullable | What changed from the prior version and why |
| `published_by_user_id` | UUID | Nullable | FK → `users`; KORA Admin who published this version |
| `external_validation_reference` | text | Nullable | If this version has been externally reviewed |
| `is_pre_calibration` | boolean | Yes | True for v0.1; all outputs must carry "Pre-Calibration" label when this is true |
| `published_at` | timestamp | Nullable | |
| `created_at` | timestamp | Yes | |

**Foundation Light notes:** Seeded with one row: v0.1, status = active, is_pre_calibration = true. All outputs from Foundation Light carry "Methodology v0.1 — Pre-Calibration" labelling derived from this field.

---

### `methodology_parameters`

**Purpose:** Stores all versioned coefficients, weights, and formula parameters associated with each methodology version. Allows the exact calculation inputs for any historical score to be retrieved.

**Key fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `methodology_version_id` | UUID | Yes | FK → `methodology_versions` |
| `parameter_group` | enum | Yes | iu_formula / kora_index_weights / activation_threshold / pillar_balance_target / ev_multiplier_scale / anti_gaming_rules / confidence_model / privacy_thresholds / benchmark_parameters |
| `parameter_key` | text | Yes | The specific parameter name (e.g., "weight_activation_rate", "ev_multiplier_no_evidence") |
| `parameter_value` | decimal | Nullable | Numeric value |
| `parameter_value_text` | text | Nullable | Text value for non-numeric parameters |
| `parameter_notes` | text | Nullable | Explanation of this parameter and its provisional status |
| `is_provisional` | boolean | Yes | True for all v0.1 parameters |
| `created_at` | timestamp | Yes | |

**Foundation Light notes:** Seeded at deployment with all v0.1 parameters from the Methodological Constitution. Every parameter has `is_provisional = true`. When methodology updates, new rows are added for the new version — existing rows are never modified.

---

## 20. Privacy and Access Control Rules

The following rules govern how the schema's access control architecture enforces KORA's privacy commitments. These are schema-level rules, not interface-level rules.

**Identity Store inaccessibility to all non-privacy roles**
No database credential used by the Analytics Store, Governance Store, Evidence Store, or Audit Store application layers contains any connection information for the Identity Store. The Identity Store is accessible only via the pseudonymization service and the KORA privacy administrator role. This must be enforced through infrastructure configuration before any data is loaded.

**Analytical worker records inaccessible to employer roles at individual level**
All employer-facing API endpoints that query the Analytics Store must route through aggregation-layer views or procedures. These views enforce the safe aggregation threshold: no query returns fewer than `company.safe_aggregation_threshold` (default: 10) workers' data in any disaggregated output. Direct table-level SELECT permissions on `pib_records` and `uef_records` (at individual resolution) are not granted to any company-user database role.

**Segment suppression enforcement**
The `workforce_segments.is_displayable` field is computed and maintained by the application. Any query that groups data by segment must filter on `is_displayable = true`. High-sensitivity segment types must apply a higher threshold multiplier where configured.

**High-sensitivity UEF record access restriction**
UEF records where `privacy_sensitivity = high` must not be returned by any query accessible to company-user roles. The aggregation views over `uef_records` filter out high-sensitivity individual records and include them only as aggregate counts (e.g., "N participants in wellbeing programs" without individual detail).

**Evidence record access filtered by sensitivity**
The evidence service enforces role-based access before generating signed blob storage URLs. High-sensitivity evidence documents may not be accessed by any employer role.

**Audit logging on all sensitive access**
The Audit Store receives a record for every access event to the Identity Store, every key usage event, every high-sensitivity data access event, and every export generation event. These records cannot be modified.

**PIB must never appear in employer-facing outputs individually**
`pib_records` are internal analytical records. No employer-facing report, dashboard, or API response contains a named, identifiable, or individually attributable PIB value. The `pib_records` table must not appear in any employer-facing view or stored procedure.

---

## 21. Data Lifecycle

The following sequence describes the complete data lifecycle from company creation through report generation. This is the reference flow for understanding how data moves through the five logical stores.

**A. Company Created**
- `companies` row created in Governance Store
- DPA status must be set to `signed` before ingestion is permitted
- `pseudonymization_key_references` row created in Identity Store with a new per-company key

**B. Company Program Configured**
- `company_programs` row created; methodology_version_id set to the currently active version
- Relevant `fiscal_budget_perimeters` activated for this program
- `financial_budgets` configured if financial governance is in scope
- `workforce_segments` defined

**C. Data Sources Defined**
- `data_sources` rows created; `intrinsic_verification_level` assigned
- Sensitivity level set to govern privacy handling during ingestion

**D. Raw Datasets Uploaded**
- `raw_datasets` rows created in Governance Store; file stored in blob storage; checksum recorded
- Access restricted to ingestion pipeline roles

**E. Ingestion Batch Created**
- `ingestion_batches` row created; status = `submitted`
- Raw datasets attached to batch; row counts recorded
- `ingestion_batch_warnings` generated by automated quality checks

**F. Batch Reviewed**
- KORA analyst reviews the batch (status → `under_review`)
- Warnings reviewed and acknowledged
- Identifiable data processed: `worker_identity_records` created in Identity Store; pseudonym tokens generated and stored as `anonymized_worker_profiles` in Analytics Store
- Batch approved by authorized analyst (status → `approved`); Audit Store record created

**G. UEF Records Generated**
- Ingestion pipeline processes approved batch (status → `processing`)
- One `uef_records` row per accepted event in Analytics Store
- Identifiable fields from raw data not carried into UEF Records
- `ingestion_rejected_rows` populated for excluded rows

**H. Pillar Mappings Assigned**
- `pillar_mappings` rows created for each UEF Record
- Automated taxonomy rules applied first; AI-suggested classifications proposed where applicable
- Ambiguous mappings flagged with `review_status = flagged`; KORA analyst reviews and confirms or overrides
- Override events produce Audit Store records

**I. Impact Units Calculated**
- `impact_units` rows created for each UEF Record + pillar assignment
- All formula components stored individually
- `methodology_version_id` set to active version; non-nullable

**J. PIB and Company Aggregates Computed**
- `pib_records` computed from Impact Units per anonymized worker profile
- `company_impact_aggregates` computed from PIB records
- Activation status, meaningful activation, and continuity flags set
- `confidence_scores` computed for events, sources, pillars

**K. KORA Index and Indicators Computed**
- `kora_indices` and `kora_index_components` computed from company_impact_aggregates
- `kora_contributions` computed if IMPACT pillar data is available
- `kora_ecosystem_reach` computed if partner utilization data is available
- Index-level `confidence_scores` computed
- Ingestion Batch status → `complete`; Audit Store record created

**L. Financial Governance Indicators Computed**
- Cost per IU, Budget Activation Ratio, Spend-to-Impact Efficiency derived from `financial_movements` and `company_impact_aggregates`
- Results stored in `report_sections` as financial governance content blocks

**M. Reports Generated and Stored**
- `reports` row created after batch reaches `complete`
- `report_sections` populated per report type
- `confidence_score_id` and `methodology_version_id` attached to report — non-nullable
- PDF generated if required; stored in blob storage; `blob_reference` set in `reports`
- Audit Store record created for report generation

**N. Audit Trail Updated Throughout**
- Every significant step above produces one or more `audit_trail_records` in the Audit Store
- The trail is append-only; no record is modified after creation

---

## 22. Technical Risks and Safeguards

**Re-identification risk**
*Risk:* A query that joins `anonymized_worker_profiles` with segment data, job family, tenure, and contract type across a small company could re-identify individuals even without accessing the Identity Store.
*Safeguard:* Safe aggregation threshold enforced in all employer-facing queries. Segment suppression enforced via `is_displayable`. High-sensitivity event types excluded from individual-level queries. The minimum threshold of 10 is a floor, not a ceiling — legal counsel may raise it per jurisdiction.

**Raw data bypassing the UEF pipeline**
*Risk:* An engineer bypasses the UEF processing pipeline and queries `raw_datasets` directly to produce analytical outputs, bypassing quality checks, anti-gaming logic, and privacy controls.
*Safeguard:* `raw_datasets` and `ingestion_batches` are accessible only to ingestion pipeline roles. No employer-facing role or report-generation process has permission to query these tables. All employer-facing analytical outputs originate from `uef_records` or higher-layer aggregates.

**Methodology version missing from scoring output**
*Risk:* An Impact Unit, KORA Index, or Report is stored without a `methodology_version_id`, making it unauditable and incomparable.
*Safeguard:* `methodology_version_id` is a non-nullable field on all scoring tables. Schema-level constraint prevents insertion without a version reference.

**Partner eligibility profile treated as impact**
*Risk:* A schema or query design accidentally joins eligibility status into an Impact Unit calculation, causing high-eligibility services to generate higher IU.
*Safeguard:* No foreign key or query path from `eligibility_profiles` or `eligibility_contributions` to `impact_units` or `kora_indices`. These tables are in separate store areas. Schema-level isolation enforces this.

**Financial budget treated as KORA Index input**
*Risk:* A developer adds a budget-weighted bonus to the KORA Index calculation, causing high-spending companies to score higher regardless of activation.
*Safeguard:* `financial_budgets` and `financial_movements` are Governance Store tables. No formula field in Analytics Store tables references them. The financial governance calculations (cost per IU, etc.) are separate computations — they do not affect `kora_indices`.

**Audit trail mutability**
*Risk:* A database administrator or application engineer deletes or modifies audit trail records to conceal a change.
*Safeguard:* The application database role for the Audit Store has INSERT permission only. UPDATE and DELETE are not granted. This is enforced at the database permission level. Documented as the v0.1 mechanism — not claimed as cryptographic immutability.

**Evidence links breaking**
*Risk:* An evidence document in blob storage is deleted, moved, or the bucket access policy changes — rendering the `blob_reference` in `evidence_records` unresolvable. Classifications and verifications backed by the document become unverifiable.
*Safeguard:* Blob storage is KORA-controlled, not company-managed or externally linked. KORA blob storage retention policy must specify minimum retention periods per evidence type. Blob deletion must require an explicit privileged operation that produces an Audit Store record and flags dependent `evidence_records` as `status = superseded`.

**Employer role accessing individual PIB**
*Risk:* An employer-facing API endpoint inadvertently returns individual PIB values by querying `pib_records` with insufficient aggregation.
*Safeguard:* No employer-facing role has SELECT permission on the `pib_records` table directly. Employer-facing queries for workforce intelligence use aggregation views only. These views are tested against the safe aggregation threshold as part of the deployment checklist.

**Incomplete ingestion creating false precision**
*Risk:* An ingestion batch is approved with high rejection rates or significant missing data, but the resulting KORA Index is presented without adequate confidence caveats, giving the company a false sense of analytical completeness.
*Safeguard:* `confidence_scores` are computed and non-nullable on every `kora_indices` record. `data_quality_warnings` and `limitations_summary` are attached to every Report. The KORA analyst reviewing the batch must acknowledge all critical `ingestion_batch_warnings` before approval is possible.

**AI classification treated as final truth**
*Risk:* A pillar mapping suggested by an AI classifier is stored as `mapping_method = manually_assigned` or `taxonomy_rule` to bypass review, even when the suggestion was uncertain.
*Safeguard:* `mapping_method = ai_suggested_confirmed` is a distinct enum value. Any AI-suggested mapping that has not been confirmed by a human reviewer must retain `review_status = flagged` until reviewed. The transition from `ai_suggested_pending` to `ai_suggested_confirmed` requires a `reviewer_user_id` to be set and produces an Audit Store record.

---

## 23. What This Schema Must Not Do

These are structural prohibitions — behaviors that would be schema errors, not feature choices. Any implementation that violates these rules must be escalated and corrected before deployment.

**No direct employer access to identity data**
No employer role may, through any database query, view, stored procedure, or API endpoint, access the Identity Store or any record in `worker_identity_records`. This is an architectural property, not an application setting.

**No named individual PIB visibility for employers**
`pib_records` must never appear in employer-facing outputs as named, identified, or individually attributable records. Any view, endpoint, or export that surfaces individual PIB values to an employer role is a schema and privacy violation.

**No budget-to-index shortcut**
No column in `financial_budgets` or `financial_movements` may be used as an input to any field in `impact_units`, `kora_index_components`, or `kora_indices`. Budget is input; impact is output. They are not the same calculation.

**No partner count-to-index shortcut**
The count of rows in `partners` or `partner_services` for a company must not contribute to any field in `kora_indices`. KORA Ecosystem Reach has its own separate indicator table. Partner availability is not impact.

**No fiscal eligibility-to-index shortcut**
No field from `eligibility_profiles` or `eligibility_contributions` may be used in the calculation of `impact_units.iu_value` or any component of `kora_indices`. Eligibility is a governance signal; it does not affect impact measurement.

**No unversioned scoring output**
The `methodology_version_id` field is non-nullable on `impact_units`, `pib_records`, `company_impact_aggregates`, `kora_indices`, `kora_contributions`, `kora_ecosystem_reach`, `confidence_scores`, and `reports`. Any attempt to insert a record without this field must be rejected at the schema level.

**No raw data used directly in employer-facing outputs**
Raw datasets and ingestion batch records must not be queried by employer-facing views or procedures. All employer-facing analytical outputs derive from `uef_records` or higher-layer aggregated tables.

**No AI classification treated as final without explicit human confirmation**
Pillar mappings produced by AI-assisted classification must carry `mapping_method = ai_suggested_pending` or `ai_suggested_confirmed` — never `taxonomy_rule` or `manually_assigned` unless a human has explicitly confirmed or set the mapping. The distinction must be enforced in the application logic and visible in the schema.

---

## 24. Open Questions Before Implementation

The following questions remain for CTO, legal counsel, or privacy advisor review before migration files are written and database infrastructure is provisioned. These do not reopen the 10 Founder Decisions — they are implementation-level clarifications required to execute those decisions correctly.

**Database engine selection**
Which relational database engine will be used for each logical store? PostgreSQL is the natural choice given KORA's data model (UUID primary keys, JSONB fields, array types), but the engine selection has implications for connection pooling, access control granularity, and the specific mechanisms for enforcing the Identity Store / Analytics Store separation.

**Secrets management service for pseudonymization keys**
Which secrets management service will hold the actual key material for per-company pseudonymization keys? Options include AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager, or others. The `pseudonymization_key_references.key_reference` field stores the external ID — the service choice determines the format of that ID and the integration pattern.

**Blob storage provider and bucket policy**
Which blob storage provider will be used for raw datasets, evidence records, and reports? The choice affects: access policy design, retention rule configuration, geographic data residency requirements (relevant for GDPR), and cost. High-sensitivity and standard-sensitivity documents should be in separate buckets with separate access policies.

**Safe aggregation threshold enforcement mechanism**
Should the safe aggregation threshold be enforced through database-level row-level security, through application-level aggregation views, or through a combination? The tradeoffs between database-level enforcement (more robust, harder to bypass) and application-level enforcement (more flexible, easier to configure) need to be decided before employer-facing views are built.

**Audit trail archive schedule for Foundation tier**
The Foundation Light v0.1 audit trail uses application-level append-only enforcement. The planned upgrade for Foundation tier is a periodic export to a read-only archive. What is the export frequency (daily, weekly, monthly)? What is the archive storage mechanism? When should this be built?

**Data retention schedule by entity type**
Legal counsel must define the retention period for each data category: `worker_identity_records`, `uef_records`, `pib_records`, `raw_datasets`, `evidence_records`, and `audit_trail_records`. GDPR requires data not to be retained beyond its purpose. Retention periods must be defined, documented in the DPA, and enforced through automated deletion or anonymization processes.

**DPIA scope and timing**
A Data Protection Impact Assessment (DPIA) is required under GDPR before processing sensitive data categories at scale — specifically health, psychological support, and social vulnerability event types classified as `privacy_sensitivity = high`. The DPIA must be completed before any company with high-sensitivity data is onboarded. When will this assessment be conducted, and by whom?

**Schema migration tooling**
Which migration tooling will be used? (Prisma Migrate, Flyway, Liquibase, raw SQL scripts?) This affects how the schema is versioned, how migrations are applied across environments, and how rollbacks are handled.

**Multi-store transaction handling**
Some operations touch multiple logical stores in a single logical transaction — for example, creating a `worker_identity_record` and the corresponding `anonymized_worker_profile` together. How will cross-store consistency be ensured, given that distributed transactions across separate databases are not atomic? A saga pattern, an outbox pattern, or a compensating transactions approach must be selected before the ingestion pipeline is built.

**Blob storage URL generation TTL**
Signed access URLs for blob storage have a TTL — after which the link expires and must be regenerated. What is the appropriate TTL for different evidence types? High-sensitivity documents should have shorter TTLs. The evidence service must enforce TTL policies before any evidence access is exposed to the front end.

---

*KORA Technical Data Model & Database Schema Definition — Version 0.1*
*Status: Design Document — Pending CTO and Legal Review*
*Aligned with: Methodological Constitution v0.1, Conceptual Data Model v0.1, Founder Technical Decisions v0.1 (Approved)*
*Next step: CTO and legal review of this document; resolution of the 10 open implementation questions in Section 24; then migration file authoring and database provisioning.*
